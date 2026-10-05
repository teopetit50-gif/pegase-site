-- LORANI, lot B5-04 — les pièces réclamées gardent l'ordre de la lettre.
--
-- Ce que ça corrige : private.lorani_valeurs_de_piece range les valeurs répétées (champ « pieces » d'une demande de
-- pièces) par page puis par la boîte de la citation, mais lisait `boite ->> 'y1'` et `'x0'` ; or le lecteur (contrat de
-- l'ouvrier, § 2) écrit les boîtes en fractions {x, y, l, h}, y depuis le haut. Les clés étaient donc nulles et l'ordre
-- retombait sur l'identifiant (aléatoire) : le test B5 rendait tantôt [PC5, PC8], tantôt [PC8, PC5] (relevé par le
-- coordinateur le 05/10, 110/111). Désormais : y croissant (haut de page d'abord) puis x, en gardant y1/x0 en repli
-- pour des lectures anciennes, puis la date d'insertion. Corps du socle photographié le 05/10/2026, seul l'ordre change.
-- Migration idempotente (create or replace).

CREATE OR REPLACE FUNCTION private.lorani_valeurs_de_piece(p_piece uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with lues as (
    select pv.id, pv.champ, pv.valeur #>> '{}' as valeur, (pv.verifiee or pv.source = 'humain') as verifiee,
           pv.texte, pv.page, pv.boite, pv.source = 'humain' as humain, pv.cree_le
    from public.pieces_valeurs pv
    where pv.piece_id = p_piece and pv.chiffre is null
  ), simples as (
    select distinct on (l.champ) l.champ,
           jsonb_build_object('valeur', l.valeur, 'verifiee', l.verifiee, 'texte', l.texte, 'page', l.page) as v
    from lues l
    where l.champ <> 'pieces'
    order by l.champ, l.humain desc, l.verifiee desc, l.cree_le desc, l.id
  ), repetes as (
    select l.champ,
           jsonb_agg(jsonb_build_object('valeur', l.valeur, 'verifiee', l.verifiee, 'texte', l.texte, 'page', l.page)
                     order by l.page nulls last,
                              coalesce((l.boite ->> 'y')::numeric, -((l.boite ->> 'y1')::numeric)) nulls last,
                              coalesce((l.boite ->> 'x')::numeric, (l.boite ->> 'x0')::numeric) nulls last,
                              l.cree_le, l.id) as v
    from lues l
    where l.champ = 'pieces'
      and (l.humain or not exists (select 1 from lues h where h.champ = 'pieces' and h.humain))
    group by l.champ
  )
  select coalesce(jsonb_object_agg(x.champ, x.v), '{}'::jsonb)
  from (select * from simples union all select * from repetes) x
$function$;
