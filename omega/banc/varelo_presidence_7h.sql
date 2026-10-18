-- VARELO — le point du matin à 7 h pour la présidence des 3 groupes publics (B1, 18/10/2026, niveau 2, lot 2)
-- À poser sur la RECETTE seulement, après omega/banc/varelo_groupes_publics.sql et b1_20.
-- Pour chaque groupe (Groupe EDH, Ankama, Normaxis) :
--   · son gérant rejoint l'équipe « presidence » : il recevra la section « Le groupe ce matin » (b1_20) au titre de
--     la présidence, en plus de ce qu'il reçoit comme gérant ;
--   · le point du matin du groupe est réglé à 7 h, heure de Paris (territoire metropole), du lundi au vendredi, jours
--     fériés exceptés, contenu complet, canal email (les adresses en .test ne reçoivent rien : la preuve se lit
--     dans points_du_jour, pas dans une boîte).
-- Idempotent (not exists) ; rien n'est supprimé ; un réglage déjà présent n'est pas touché.

do $banc$
declare
  g record;
  v_equipe uuid;
begin
  for g in select * from (values
      ('cccccccc-0000-4000-8000-000000000101'::uuid, 'cccccccc-0000-4000-8000-0000000001c1'::uuid),
      ('cccccccc-0000-4000-8000-000000000102'::uuid, 'cccccccc-0000-4000-8000-0000000002c1'::uuid),
      ('cccccccc-0000-4000-8000-000000000103'::uuid, 'cccccccc-0000-4000-8000-0000000003c1'::uuid)) as t(client_id, gerant)
  loop
    select e.id into v_equipe from public.equipes e where e.client_id = g.client_id and e.cle = 'presidence';
    if v_equipe is null then
      raise exception 'Groupe % : pas d''équipe presidence (Varelo installé ?)', g.client_id;
    end if;
    insert into public.equipes_membres (client_id, equipe_id, user_id)
    select g.client_id, v_equipe, g.gerant
    where not exists (select 1 from public.equipes_membres m where m.equipe_id = v_equipe and m.user_id = g.gerant);
    insert into public.points_reglages (client_id, user_id, actif, heure, territoire, jours, sauf_feries, canal, contenu, si_vide)
    select g.client_id, null, true, time '07:00', 'metropole', array[1, 2, 3, 4, 5]::smallint[], true, 'email', 'complet', 'court'
    where not exists (select 1 from public.points_reglages r where r.client_id = g.client_id and r.user_id is null);
  end loop;
end $banc$;

-- Contrôle immédiat (lecture seule) : pour chaque gérant, le point attendu demain lundi 19/10 et son heure prévue.
-- Attendu : 3 lignes, prevu_le = 2026-10-19 05:00:00+00 (7 h à Paris).
select c.nom as groupe, m.user_id, m.jour, m.prevu_le
from public.clients c
cross join lateral private.points_manquants(c.id, timestamptz '2026-10-19 05:01:00+00') m
where c.id in ('cccccccc-0000-4000-8000-000000000101', 'cccccccc-0000-4000-8000-000000000102', 'cccccccc-0000-4000-8000-000000000103')
order by c.nom;

-- Relevé de demain après 05 h 05 Z (lecture seule) : le point de chaque gérant, ses sections, la page du groupe.
-- select c.nom, p.statut, p.prevu_le, p.assemble_le, p.nb_sections, p.nb_items
-- from public.points_du_jour p join public.clients c on c.id = p.client_id
-- where p.client_id in ('cccccccc-0000-4000-8000-000000000101', 'cccccccc-0000-4000-8000-000000000102', 'cccccccc-0000-4000-8000-000000000103')
--   and p.jour = date '2026-10-19' order by c.nom;
-- select c.nom, s.titre, s.role, (select e.cle from public.equipes e where e.id = s.equipe_id) as equipe, s.nb_items as lignes
-- from public.points_sections s join public.clients c on c.id = s.client_id
-- where s.client_id in ('cccccccc-0000-4000-8000-000000000101', 'cccccccc-0000-4000-8000-000000000102', 'cccccccc-0000-4000-8000-000000000103')
--   and s.jour = date '2026-10-19' and s.module = 'varelo' order by c.nom, s.titre;
