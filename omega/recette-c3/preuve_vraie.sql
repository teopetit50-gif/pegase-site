-- Preuve EN VRAI du circuit mail + formulaire de REPUT, client du banc (cccccccc-…-0c). Lecture seule.
-- À passer par le coordinateur AVANT (bloc 0) puis APRÈS (blocs 1 à 4) le vrai courriel et le formulaire
-- (procédure : PREUVE-VRAIE.md). Aucune écriture : on regarde ce que la chaîne réelle a fait.

-- 0. Prérequis : REPUT actif, mode d'envoi, fiches en vigueur, crons, dernière exécution de l'Edge.
select 'reglages' as quoi, to_jsonb(r) - 'client_id' as detail from public.reput_reglages r
 where r.client_id = 'cccccccc-0000-4000-8000-00000000000c'
union all
select 'envois', to_jsonb(e) - 'client_id' from public.reglages_envois e
 where e.client_id = 'cccccccc-0000-4000-8000-00000000000c' and e.module is not distinct from 'reput'
union all
select 'fiches_en_vigueur', jsonb_build_object('n', count(*)) from public.reput_connaissances k
 where k.client_id = 'cccccccc-0000-4000-8000-00000000000c' and k.statut = 'validee'
union all
select 'cron', jsonb_build_object('job', j.jobname, 'actif', j.active, 'horaire', j.schedule) from cron.job j
 where j.jobname in ('reput-synchro', 'omega-reput', 'reput-matin')
union all
select 'cron_derniere', jsonb_build_object('job', j.jobname, 'statut', d.status, 'fin', d.end_time, 'message', left(d.return_message, 200))
  from cron.job j
  join lateral (select * from cron.job_run_details d where d.jobid = j.jobid order by d.start_time desc limit 1) d on true
 where j.jobname in ('reput-synchro', 'omega-reput');

-- 1. Les réceptions du banc depuis le début de la preuve (remplacer l'heure), et ce que REPUT en a fait.
--    Attendu par ligne : preparee_le - recu_le < 60 s ; statut a_valider (ou envoyee après validation).
select r.id as reception, r.canal, r.boite, r.recu_le,
       d.statut, d.sujet, d.langue, d.couverte, d.urgence,
       extract(epoch from d.preparee_le - r.recu_le)::int as secondes_preparation,
       extract(epoch from d.accuse_le - r.recu_le)::int as secondes_accuse,
       extract(epoch from d.envoyee_le - r.recu_le)::int as secondes_envoi,
       d.motif
  from public.receptions r
  left join public.reput_demandes d on d.reception_id = r.id
 where r.client_id = 'cccccccc-0000-4000-8000-00000000000c'
   and r.recu_le >= timestamptz '2026-10-11 00:00+00'   -- ← heure de début de la preuve
 order by r.recu_le;

-- 2. Les réponses préparées : sources dans la base, modèle, jetons, coût, file de validation, envoi.
select d.reception_id, p.version, p.sujet, p.couverte, cardinality(p.sources) as n_sources,
       (select array_agg(k.titre) from public.reput_connaissances k where k.id = any (p.sources)) as fiches_citees,
       p.raison, p.type_action, p.statut, p.modele, p.jetons_entree, p.jetons_sortie, p.cout_eur,
       (select jsonb_build_object('statut', v.statut, 'type', v.type_action) from public.demandes_validation v where v.id = p.demande_validation_id) as validation,
       (select to_jsonb(e) - 'client_id' - 'corps' - 'contenu' from public.envois e where e.id = p.envoi_id) as envoi,
       left(p.corps, 600) as corps_debut
  from public.reput_reponses p
  join public.reput_demandes d on d.id = p.demande_id
 where p.client_id = 'cccccccc-0000-4000-8000-00000000000c'
   and p.cree_le >= timestamptz '2026-10-11 00:00+00'   -- ← même heure
 order by p.cree_le;

-- 3. Les travaux de l'ouvrier (Edge) sur ces demandes : réussis, durée, contrôles ; jamais de contenu.
select t.genre, t.etat, t.essais, t.cree_le, t.fini_le, left(t.resultat::text, 400) as resultat, left(t.erreur, 200) as erreur
  from public.travaux t
 where t.client_id = 'cccccccc-0000-4000-8000-00000000000c' and t.genre like 'reput.%'
   and t.cree_le >= timestamptz '2026-10-11 00:00+00'   -- ← même heure
 order by t.cree_le;

-- 4. Le journal opposable de ces échanges.
select j.survenu_le, j.action, j.acteur_type, j.objet_type, j.objet_id, left(j.donnees::text, 300) as donnees
  from public.journal_opposable j
 where j.client_id = 'cccccccc-0000-4000-8000-00000000000c' and j.action like 'reput.%'
   and j.survenu_le >= timestamptz '2026-10-11 00:00+00'   -- ← même heure
 order by j.survenu_le;
