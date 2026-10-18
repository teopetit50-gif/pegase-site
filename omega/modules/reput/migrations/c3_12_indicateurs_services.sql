-- c3_12 — REPUT : les indicateurs par service (session C3, 18/10/2026)
--
-- CE QUE ÇA TIENT : « Le volume de demandes se lit par canal, par service et par heure de la journée. » (catalogue,
-- Pilotage). Par canal et par heure : c3_05 (reput_indicateurs, reput_volumes_heure). Par service : il manquait.
-- Un service est l'équipe du socle vers laquelle un sujet est routé (c3_07, reput_sujets.equipe_id) ; un sujet non
-- routé compte pour « Tous les décideurs ». Par jour, site (entité) et service : reçues, répondues, en attente,
-- hors base, remontées au responsable (délai dépassé, c3_06) et délai médian de réponse.
-- Vue security_invoker : la RLS de reput_demandes, reput_sujets et equipes s'applique à qui la lit.
--
-- Règles de pose : create or replace ; ni DROP ni DELETE. Droits : revoke à authenticated/anon, puis select.

create or replace view public.reput_indicateurs_services with (security_invoker = true) as
select d.client_id, d.entite_id,
       (d.recu_le at time zone 'Europe/Paris')::date as jour,
       s.equipe_id,
       coalesce(e.nom, 'Tous les décideurs') as service,
       count(*)::int as recues,
       count(*) filter (where d.statut = 'envoyee')::int as repondues,
       count(*) filter (where d.statut in ('a_valider', 'a_traiter', 'bloquee', 'a_preparer'))::int as en_attente,
       count(*) filter (where d.couverte is false)::int as hors_base,
       count(*) filter (where d.escaladee_le is not null)::int as remontees,
       round((percentile_cont(0.5) within group (order by extract(epoch from (d.envoyee_le - d.recu_le)) / 60.0)
              filter (where d.envoyee_le is not null))::numeric, 1) as delai_median_minutes
from public.reput_demandes d
left join public.reput_sujets s on s.client_id = d.client_id and s.code = coalesce(d.sujet, 'autre')
left join public.equipes e on e.id = s.equipe_id and e.client_id = d.client_id
group by 1, 2, 3, 4, 5;

revoke all on public.reput_indicateurs_services from authenticated, anon;
grant select on public.reput_indicateurs_services to authenticated, service_role;
