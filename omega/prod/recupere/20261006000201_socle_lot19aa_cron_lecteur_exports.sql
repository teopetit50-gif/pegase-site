-- recupere 20261006000201 socle_lot19aa_cron_lecteur_exports
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête b1ed4338-59d7-46fc-825d-ce50b6a81201 (mcp__Supabase__execute_sql, 2026-10-06T00:04:08.111Z, résultat : réussi)
select cron.schedule('omega-lecteur-exports', '* * * * *', $$
  select net.http_post(
    url := 'https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/lecteur-exports',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000)
  from vault.decrypted_secrets s where s.name = 'cle_service'
$$) where not exists (select 1 from cron.job where jobname='omega-lecteur-exports');
insert into supabase_migrations.schema_migrations(version,name,statements) values ('20261006000201','socle_lot19aa_cron_lecteur_exports', array['fonction Edge lecteur-exports (coquille worker-a1 35721d4) + cron omega-lecteur-exports chaque minute']) on conflict do nothing;
select jobname, schedule from cron.job where jobname='omega-lecteur-exports';
