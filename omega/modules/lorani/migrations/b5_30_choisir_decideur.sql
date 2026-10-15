-- LORANI, lot B5-30 — choisir qui décide des constats d'un contrôle (15/10/2026).
--
-- Pourquoi : la page des architectes montre, dans le menu du produit, « Choisir qui décide » (Produit.tsx:304 ;
-- chiffrage, ligne 16 : C). Jusqu'ici tout membre qui écrit sur le projet pouvait accepter ou écarter un constat :
-- l'agence veut nommer, pour chaque contrôle, la personne qui tranche (le chef de projet, l'associé qui signe le dépôt).
--
-- Ce qui est posé :
--   · lorani_controles.decideur uuid : la personne qui décide des constats de ce contrôle (nul = tout membre qui
--     écrit sur le projet, comme avant).
--   · public.lorani_choisir_decideur(controle, personne) : réservé au gérant, à l'admin ou au chef de projet ; la
--     personne doit être un compte du client (pas « lecteur ») qui voit le projet, membre du projet ou gérant/admin ;
--     nul remet la décision à tous ; refusé sur un contrôle clos ; journal lorani.decideur_choisi.
--   · trigger BEFORE UPDATE OF statut sur lorani_constats (lorani_constats_decideur, distinct de
--     lorani_constats_garder) : quand le contrôle a un décideur, seuls lui, un gérant ou un admin changent le statut
--     d'un constat (42501). Le contrôle lui-même (lorani.controle_en_cours) et le système (sans auth.uid()) passent.
-- Idempotent ; rien n'est retiré.

ALTER TABLE public.lorani_controles ADD COLUMN IF NOT EXISTS decideur uuid;

-- Le décideur se pose par la porte : un membre ne le change pas par un UPDATE direct.
CREATE OR REPLACE FUNCTION private.lorani_controles_garder_decideur()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.decideur is distinct from old.decideur and (select auth.uid()) is not null
     and current_setting('lorani.decideur_en_cours', true) is distinct from 'oui' then
    raise exception 'Le décideur se choisit par « Choisir qui décide ».' using errcode = '42501';
  end if;
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_controles_garder_decideur() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.lorani_choisir_decideur(p_controle uuid, p_personne uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.lorani_controles;
  v_moi uuid := (select auth.uid());
  v_role text;
begin
  select * into c from public.lorani_controles where id = p_controle for update;
  if not found or not private.lorani_ecrit_projet(c.client_id, c.entite_id, c.projet_id) then
    raise exception 'Contrôle introuvable ou hors de vos droits.' using errcode = 'P0002';
  end if;
  select role into v_role from public.comptes where user_id = v_moi and client_id = c.client_id;
  if v_moi is not null and coalesce(v_role, '') not in ('gerant', 'admin')
     and not exists (select 1 from public.lorani_membres_projet mp where mp.client_id = c.client_id and mp.projet_id = c.projet_id
                     and mp.user_id = v_moi and mp.role_projet = 'chef_projet') then
    raise exception 'Seuls le gérant, un admin ou le chef de projet choisissent qui décide.' using errcode = '42501';
  end if;
  if c.statut = 'clos' then
    raise exception 'Un contrôle clos ne change plus de décideur.' using errcode = '55000';
  end if;
  if p_personne is not null and not exists (
       select 1 from public.comptes m
       where m.user_id = p_personne and m.client_id = c.client_id and m.role <> 'lecteur'
         and (m.role in ('gerant', 'admin')
              or exists (select 1 from public.lorani_membres_projet mp where mp.client_id = c.client_id and mp.projet_id = c.projet_id and mp.user_id = m.user_id))
         and private.lorani_voit_projet_pour(m.user_id, c.client_id, c.entite_id, c.projet_id)) then
    raise exception 'Cette personne n''est pas membre du projet (ou ne peut que lire).' using errcode = '22023';
  end if;
  if c.decideur is not distinct from p_personne then
    return jsonb_build_object('controle', c.id, 'decideur', p_personne, 'deja', true);
  end if;
  perform set_config('lorani.decideur_en_cours', 'oui', true);
  update public.lorani_controles set decideur = p_personne where id = c.id;
  perform set_config('lorani.decideur_en_cours', '', true);
  perform private.journaliser_module(c.client_id, 'lorani', 'lorani.decideur_choisi', 'lorani_projet', c.projet_id::text,
    jsonb_build_object('controle', c.id, 'intitule', c.intitule, 'indice', c.indice, 'avant', c.decideur, 'apres', p_personne), c.entite_id);
  return jsonb_build_object('controle', c.id, 'decideur', p_personne);
end $function$;
REVOKE EXECUTE ON FUNCTION public.lorani_choisir_decideur(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lorani_choisir_decideur(uuid, uuid) TO authenticated;

-- Quand le contrôle a un décideur, lui seul (ou un gérant, un admin) tranche un constat.
CREATE OR REPLACE FUNCTION private.lorani_constats_decideur()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_moi uuid := (select auth.uid());
  v_decideur uuid;
begin
  if new.statut is not distinct from old.statut or v_moi is null
     or current_setting('lorani.controle_en_cours', true) = 'oui' then
    return new;
  end if;
  select decideur into v_decideur from public.lorani_controles where id = new.controle_id;
  if v_decideur is null or v_decideur = v_moi
     or exists (select 1 from public.comptes m where m.user_id = v_moi and m.client_id = new.client_id and m.role in ('gerant', 'admin')) then
    return new;
  end if;
  raise exception 'Les constats de ce contrôle sont décidés par la personne choisie (« Choisir qui décide »).' using errcode = '42501';
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_constats_decideur() FROM PUBLIC;

DO $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_controles'::regclass and tgname = 'lorani_controles_garder_decideur') then
    create trigger lorani_controles_garder_decideur before update of decideur on public.lorani_controles
      for each row execute function private.lorani_controles_garder_decideur();
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_constats'::regclass and tgname = 'lorani_constats_decideur') then
    create trigger lorani_constats_decideur before update of statut on public.lorani_constats
      for each row execute function private.lorani_constats_decideur();
  end if;
end $$;
