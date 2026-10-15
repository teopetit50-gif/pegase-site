-- recupere 20261005190500 socle_lot19j_service_role_private
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête 4c67c770-8c9b-4afd-8c00-cefa638a4ae6 (mcp__Supabase__execute_sql, 2026-10-05T19:02:19.129Z, résultat : réussi)
grant usage on schema private to service_role;
grant execute on all functions in schema private to service_role;
alter default privileges in schema private grant execute on functions to service_role;
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261005190500', 'socle_lot19j_service_role_private', array['grant usage on schema private to service_role', 'grant execute on all functions in schema private to service_role', 'alter default privileges in schema private grant execute on functions to service_role']);
update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now()) where email like '%@banc-varelo.test';
select count(*) filter (where has_function_privilege('service_role', p.oid, 'EXECUTE')) as svc, count(*) as total
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private';
