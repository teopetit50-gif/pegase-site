-- LORANI, lot B5-28 — ce qui a changé d'un indice à l'autre, y compris ce qui n'était pas signalé (11/10/2026).
--
-- Pourquoi : la page des architectes promet « Lorani compare le nouvel indice au précédent, y compris les changements
-- non signalés, puis ne remonte que les écarts nouveaux » (Questions.tsx:98) et montre « L'indice D déplace la trémie de
-- 60 cm sans avis » (Dossier.tsx:454). La revérification (b5_16) ne relevait que les constats : une cote qui change sans
-- créer d'incohérence passait sans un mot (chiffrage, ligne 49).
--
-- Ce qui est posé :
--   · lorani_controles.changements jsonb : la liste des valeurs lues qui ont changé depuis le contrôle précédent, sur
--     la même pièce (même référence, « PC4 », sinon même rôle) : [{reference, grandeur, objet, libelle, avant, apres,
--     unite, page_avant, page_apres, texte_avant, texte_apres, piece_avant, piece_apres, boite_apres, releve}] ;
--     « releve » = un constat du nouveau contrôle (ouvert, accepté ou écarté) porte sur la même grandeur et le même objet ; sinon le
--     changement n'a été relevé par aucun contrôle : c'est le changement « non signalé ».
--   · private.lorani_changements_indice(controle) → jsonb : le calcul (mesures mesure.<grandeur>.<objet>, écart au-delà
--     de la tolérance de la grandeur) ; les valeurs apparues ou disparues sont listées aussi (avant ou après nul).
--   · trigger AFTER UPDATE OF lance_le sur lorani_controles : à chaque passage d'un contrôle qui a un précédent, la
--     liste est recalculée ; s'il y a des changements non relevés, alerte « info » au chef de projet.
-- Les constats et leurs comptes ne changent pas (b5_07 reste juste). Idempotent ; rien n'est retiré.

ALTER TABLE public.lorani_controles ADD COLUMN IF NOT EXISTS changements jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION private.lorani_changements_indice(p_controle uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with c as (select * from public.lorani_controles where id = p_controle),
  m as (
    -- les mesures des deux contrôles, rattachées à leur pièce par sa référence (ou son rôle)
    select cp.controle_id, coalesce(nullif(btrim(cp.reference), ''), cp.role) as reference, pv.piece_id,
           split_part(pv.champ, '.', 2) as grandeur, split_part(pv.champ, '.', 3) as objet,
           (pv.valeur #>> '{}')::numeric as valeur, pv.page, pv.texte, pv.boite
    from public.lorani_controle_pieces cp
    join public.pieces_valeurs pv on pv.piece_id = cp.piece_id and pv.chiffre is null
    where cp.controle_id in (select id from c union select precedent_id from c)
      and pv.champ ~ '^mesure\.[a-z0-9_]+\.[a-z0-9_]+$' and (pv.valeur #>> '{}') ~ '^-?[0-9]+(\.[0-9]+)?$'
      and private.lorani_grandeur(split_part(pv.champ, '.', 2)) is not null
  ),
  n as (select distinct on (reference, grandeur, objet) * from m where controle_id = (select id from c) order by reference, grandeur, objet, page),
  a as (select distinct on (reference, grandeur, objet) * from m where controle_id = (select precedent_id from c) order by reference, grandeur, objet, page),
  d as (
    select coalesce(n.reference, a.reference) as reference, coalesce(n.grandeur, a.grandeur) as grandeur, coalesce(n.objet, a.objet) as objet,
           a.valeur as avant, n.valeur as apres, a.page as page_avant, n.page as page_apres, a.texte as texte_avant, n.texte as texte_apres,
           a.piece_id as piece_avant, n.piece_id as piece_apres, n.boite as boite_apres
    from n full join a on a.reference = n.reference and a.grandeur = n.grandeur and a.objet = n.objet
    -- une pièce absente de l'un des deux contrôles n'est pas un changement : seule une valeur d'une pièce présente des deux côtés compte
    where (n.reference is null and exists (select 1 from n x where x.reference = a.reference))
       or (a.reference is null and exists (select 1 from a x where x.reference = n.reference))
       or (n.valeur is not null and a.valeur is not null
           and abs(n.valeur - a.valeur) > coalesce((private.lorani_grandeur(n.grandeur) ->> 'tolerance')::numeric, 0))
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'reference', d.reference, 'grandeur', d.grandeur, 'objet', d.objet,
           'libelle', (private.lorani_grandeur(d.grandeur) ->> 'libelle') || private.lorani_objet_de(d.objet),
           'unite', private.lorani_grandeur(d.grandeur) ->> 'unite',
           'avant', d.avant, 'apres', d.apres, 'page_avant', d.page_avant, 'page_apres', d.page_apres,
           'texte_avant', d.texte_avant, 'texte_apres', d.texte_apres, 'piece_avant', d.piece_avant, 'piece_apres', d.piece_apres, 'boite_apres', d.boite_apres,
           'releve', exists (select 1 from public.lorani_constats k where k.controle_id = p_controle and k.statut <> 'corrige'
                             and k.grandeur = d.grandeur and coalesce(k.objet, '') = coalesce(d.objet, '')))
         order by d.reference, d.grandeur, d.objet), '[]'::jsonb)
  from d
  where (select precedent_id from c) is not null
$function$;
REVOKE EXECUTE ON FUNCTION private.lorani_changements_indice(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION private.lorani_controle_changements()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v jsonb;
  v_non integer;
  pr public.lorani_projets;
  p public.lorani_controles;
begin
  if new.precedent_id is null or new.lance_le is null then
    return null;
  end if;
  v := private.lorani_changements_indice(new.id);
  update public.lorani_controles set changements = v where id = new.id;
  select count(*) into v_non from jsonb_array_elements(v) x where not (x ->> 'releve')::boolean;
  if v_non > 0 then
    select * into pr from public.lorani_projets where id = new.projet_id;
    select * into p from public.lorani_controles where id = new.precedent_id;
    perform private.lever_alerte_module(new.client_id, 'lorani', 'info',
      left(format('« %s », %s indice %s : %s valeur%s changée%s depuis l''indice %s sans être relevée%s par le contrôle — %s.',
                  left(pr.nom, 40), new.intitule, new.indice, v_non, case when v_non > 1 then 's' else '' end, case when v_non > 1 then 's' else '' end,
                  p.indice, case when v_non > 1 then 's' else '' end,
                  (select string_agg(format('%s %s', x ->> 'reference', x ->> 'libelle'), ', ') from (select x from jsonb_array_elements(v) x where not (x ->> 'releve')::boolean limit 3) y)), 200),
      jsonb_build_object('projet', new.projet_id, 'controle', new.id, 'changements', v, 'lien', private.lorani_lien_projet(new.projet_id)),
      format('controle:%s:changements', new.id), true, private.lorani_chef_de_projet(new.client_id, new.projet_id));
  end if;
  return null;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_controle_changements() FROM PUBLIC;

DO $$
begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.lorani_controles'::regclass and tgname = 'lorani_controles_changements') then
    create trigger lorani_controles_changements after update of lance_le on public.lorani_controles
      for each row execute function private.lorani_controle_changements();
  end if;
end $$;
