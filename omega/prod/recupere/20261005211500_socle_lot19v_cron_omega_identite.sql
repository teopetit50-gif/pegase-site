-- recupere 20261005211500 socle_lot19v_cron_omega_identite
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Note : Le cron est dérivé de celui d'omega-lecteur (replace sur sa commande).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête b6a80259-62d7-44fb-8a70-675685765f5d (mcp__Supabase__execute_sql, 2026-10-05T20:46:04.708Z, résultat : réussi)
select cron.schedule('omega-identite', '* * * * *', replace(j.command, '/functions/v1/lecteur', '/functions/v1/identite')) as jobid
from cron.job j where j.jobname = 'omega-lecteur' and not exists (select 1 from cron.job where jobname = 'omega-identite');
insert into supabase_migrations.schema_migrations (version, name, statements) values ('20261005211500', 'socle_lot19v_cron_omega_identite', array['cron omega-identite chaque minute, même commande que omega-lecteur vers /functions/v1/identite']) on conflict do nothing;
select jobname, schedule, left(command, 120) as cmd from cron.job where jobname in ('omega-identite','omega-lecteur');
