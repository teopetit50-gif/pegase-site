-- TREPUT-05 : où passe le temps entre la réception et la réponse préparée. LECTURE SEULE, recette.
-- Pour les réceptions de la preuve niveau 2 (1436, 1437) ou les dernières : arrivée → travail créé → travail pris
-- (bail) → fini ; et, à partir de c3_34 (ouvrier redéployé), le détail commencer / modèle / dépôt écrit par l'ouvrier.
-- attente_cron_s = fini − créé − (commencer + modèle + dépôt). Avant c3_34, durees_ms est vide : seul le total se lit,
-- et les lancements du cron omega-reput (cron.job_run_details) donnent l'heure de prise.
with r as (
  select x.id, x.recu_le, x.cree_le as deposee_le from public.receptions x
  where x.id in (1436, 1437) or x.id in (select id from public.receptions where canal in ('email', 'formulaire', 'appel', 'sms', 'whatsapp') order by id desc limit 5)
)
select r.id as reception, d.id as demande, r.recu_le, t.id as travail, t.cree_le as travail_cree,
       extract(epoch from t.cree_le - r.deposee_le)::numeric(8,1) as depot_vers_travail_s,
       t.fini_le, extract(epoch from t.fini_le - t.cree_le)::numeric(8,1) as travail_total_s,
       extract(epoch from d.preparee_le - r.recu_le)::numeric(8,1) as recu_vers_preparee_s,
       t.resultat -> 'durees_ms' as durees_ms,
       (extract(epoch from t.fini_le - t.cree_le) * 1000
        - coalesce((t.resultat #>> '{durees_ms,commencer}')::numeric + (t.resultat #>> '{durees_ms,modele}')::numeric
                   + (t.resultat #>> '{durees_ms,depot}')::numeric, 0))::numeric / 1000 as attente_cron_s,
       t.essais, t.pris_par
from r
left join public.travaux t on t.genre = 'reput.preparer' and (t.charge ->> 'reception')::bigint = r.id
left join public.reput_demandes d on d.reception_id = r.id
order by r.id, t.id;

-- Les lancements du cron autour de la preuve (heure de prise possible) :
select j.jobname, d.start_time, d.end_time, d.status
from cron.job_run_details d join cron.job j on j.jobid = d.jobid
where j.jobname in ('omega-reput', 'reput-synchro') and d.start_time between '2026-10-22 00:41:00+00' and '2026-10-22 00:46:30+00'
order by d.start_time;
