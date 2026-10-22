-- 20261006000201 socle_lot19aa_cron_lecteur_exports
-- Source : requête retrouvée dans le fil de la session coordinateur : omega/prod/recupere/20261006000201_socle_lot19aa_cron_lecteur_exports.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : retiré : ligne de schema_migrations (db push écrit la sienne) : insert into supabase_migrations.schema_migrations(version,name,statements) values ('202610 ; URL de la recette réécrite en production (1 fois).
-- recupere 20261006000201 socle_lot19aa_cron_lecteur_exports
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête b1ed4338-59d7-46fc-825d-ce50b6a81201 (mcp__Supabase__execute_sql, 2026-10-06T00:04:08.111Z, résultat : réussi)
select cron.schedule('omega-lecteur-exports', '* * * * *', $$
  select net.http_post(
    url := 'https://noepmkkplxshjbmqqxft.supabase.co/functions/v1/lecteur-exports',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000)
  from vault.decrypted_secrets s where s.name = 'cle_service'
$$) where not exists (select 1 from cron.job where jobname='omega-lecteur-exports');
select jobname, schedule from cron.job where jobname='omega-lecteur-exports';
