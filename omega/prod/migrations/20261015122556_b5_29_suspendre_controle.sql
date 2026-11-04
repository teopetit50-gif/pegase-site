-- 20261015122556 b5_29_suspendre_controle
-- Source : dépôt : 84824d6 omega/modules/lorani/migrations/b5_29_suspendre_controle.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : b5_29_suspendre_controle.sql @ 84824d6 ; b5_18 cité comme test : ignoré.
-- ═══ omega/modules/lorani/migrations/b5_29_suspendre_controle.sql @ 84824d6
-- LORANI, lot B5-29 — suspendre un contrôle du dossier, puis le reprendre (15/10/2026).
--
-- Pourquoi : la page des architectes montre, dans le menu du produit, « Suspendre un contrôle » (Produit.tsx:364 ;
-- chiffrage, ligne 18 : D). Un contrôle « en lecture » se lance seul quand sa dernière pièce est lue (b5_16) : une
-- agence qui attend l'indice suivant d'une planche, ou un avis du BET, doit pouvoir l'arrêter sans le supprimer.
--
-- Ce qui est posé :
--   · lorani_controles.suspendu_le, suspendu_motif : un contrôle suspendu porte sa date et son motif (le statut ne
--     change pas : la contrainte de statut reste celle de b5_16).
--   · public.lorani_suspendre_controle(controle, motif) : motif obligatoire (3 à 300 caractères) ; refusé sur un
--     contrôle clos ; journal lorani.controle_suspendu.
--   · public.lorani_reprendre_controle(controle) : lève la suspension ; si le contrôle attendait ses pièces et
--     qu'elles sont toutes lues, il se lance tout de suite ; journal lorani.controle_repris.
--   · public.lorani_lancer_controle (corps de b5_16) refuse un contrôle suspendu ;
--     private.lorani_piece_controle_lue (corps de b5_16) ne lance plus un contrôle suspendu.
-- Idempotent ; rien n'est retiré.

ALTER TABLE public.lorani_controles ADD COLUMN IF NOT EXISTS suspendu_le timestamptz;
ALTER TABLE public.lorani_controles ADD COLUMN IF NOT EXISTS suspendu_motif text;
DO $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lorani_controles_suspension_check') then
    alter table public.lorani_controles add constraint lorani_controles_suspension_check
      CHECK ((suspendu_le IS NULL) = (suspendu_motif IS NULL) AND (suspendu_motif IS NULL OR char_length(suspendu_motif) BETWEEN 3 AND 300));
  end if;
end $$;

CREATE OR REPLACE FUNCTION public.lorani_suspendre_controle(p_controle uuid, p_motif text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.lorani_controles;
  v_motif text := btrim(regexp_replace(coalesce(p_motif, ''), '\s+', ' ', 'g'));
begin
  select * into c from public.lorani_controles where id = p_controle for update;
  if not found or not private.lorani_ecrit_projet(c.client_id, c.entite_id, c.projet_id) then
    raise exception 'Contrôle introuvable ou hors de vos droits.' using errcode = 'P0002';
  end if;
  if c.statut = 'clos' then
    raise exception 'Un contrôle clos ne se suspend pas.' using errcode = '55000';
  end if;
  if char_length(v_motif) not between 3 and 300 then
    raise exception 'Dites en une phrase pourquoi le contrôle est suspendu.' using errcode = '22023';
  end if;
  update public.lorani_controles set suspendu_le = now(), suspendu_motif = v_motif where id = c.id;
  perform private.journaliser_module(c.client_id, 'lorani', 'lorani.controle_suspendu', 'lorani_projet', c.projet_id::text,
    jsonb_build_object('controle', c.id, 'intitule', c.intitule, 'indice', c.indice, 'motif', v_motif), c.entite_id);
  return jsonb_build_object('controle', c.id, 'suspendu', true);
end $function$;
REVOKE EXECUTE ON FUNCTION public.lorani_suspendre_controle(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lorani_suspendre_controle(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.lorani_reprendre_controle(p_controle uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.lorani_controles;
  v_lance jsonb;
begin
  select * into c from public.lorani_controles where id = p_controle for update;
  if not found or not private.lorani_ecrit_projet(c.client_id, c.entite_id, c.projet_id) then
    raise exception 'Contrôle introuvable ou hors de vos droits.' using errcode = 'P0002';
  end if;
  if c.suspendu_le is null then
    return jsonb_build_object('controle', c.id, 'suspendu', false, 'deja', true);
  end if;
  update public.lorani_controles set suspendu_le = null, suspendu_motif = null where id = c.id;
  perform private.journaliser_module(c.client_id, 'lorani', 'lorani.controle_repris', 'lorani_projet', c.projet_id::text,
    jsonb_build_object('controle', c.id, 'intitule', c.intitule, 'indice', c.indice, 'suspendu_le', c.suspendu_le, 'motif', c.suspendu_motif), c.entite_id);
  -- le contrôle attendait ses pièces : si elles sont toutes lues pendant la suspension, il se lance maintenant
  if c.statut = 'en_lecture'
     and exists (select 1 from public.lorani_controle_pieces cp where cp.controle_id = c.id)
     and not exists (select 1 from public.lorani_controle_pieces cp2 join public.pieces p on p.id = cp2.piece_id
                     where cp2.controle_id = c.id and p.statut in ('recue', 'en_lecture', 'a_rattacher', 'en_attente_expediteur')) then
    v_lance := private.lorani_controler(c.id);
  end if;
  return jsonb_build_object('controle', c.id, 'suspendu', false, 'lance', v_lance);
end $function$;
REVOKE EXECUTE ON FUNCTION public.lorani_reprendre_controle(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lorani_reprendre_controle(uuid) TO authenticated;

-- La porte de l'écran (corps de b5_16) : un contrôle suspendu ne se lance pas.
CREATE OR REPLACE FUNCTION public.lorani_lancer_controle(p_controle uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.lorani_controles;
begin
  select * into c from public.lorani_controles where id = p_controle;
  if not found or not private.lorani_ecrit_projet(c.client_id, c.entite_id, c.projet_id) then
    raise exception 'Contrôle introuvable ou hors de vos droits.' using errcode = 'P0002';
  end if;
  if c.suspendu_le is not null then
    raise exception 'Ce contrôle est suspendu (%) : reprenez-le avant de le lancer.', c.suspendu_motif using errcode = '55000';
  end if;
  return private.lorani_controler(p_controle);
end $function$;
REVOKE EXECUTE ON FUNCTION public.lorani_lancer_controle(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lorani_lancer_controle(uuid) TO authenticated;

-- Une pièce d'un contrôle vient d'être lue (corps de b5_16) : un contrôle suspendu attend.
CREATE OR REPLACE FUNCTION private.lorani_piece_controle_lue(p_piece uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c record;
  v_lances jsonb := '[]'::jsonb;
begin
  for c in
    select distinct k.id from public.lorani_controle_pieces cp join public.lorani_controles k on k.id = cp.controle_id
    where cp.piece_id = p_piece and k.statut = 'en_lecture' and k.suspendu_le is null
      and not exists (select 1 from public.lorani_controle_pieces cp2 join public.pieces p on p.id = cp2.piece_id
                      where cp2.controle_id = k.id and p.statut in ('recue', 'en_lecture', 'a_rattacher', 'en_attente_expediteur'))
  loop
    v_lances := v_lances || private.lorani_controler(c.id);
  end loop;
  return jsonb_build_object('piece', p_piece, 'controles', v_lances);
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_piece_controle_lue(uuid) FROM PUBLIC;
