-- recupere 20261005171800 socle_lot19e_droits_larges
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête 37c02bdb-b6ca-4605-85e4-a3ec73991690 (mcp__Supabase__execute_sql, 2026-10-05T17:16:30.824Z, résultat : réussi)
-- socle_lot19e : TRUNCATE (hors RLS), REFERENCES et TRIGGER ne sont jamais aux rôles clients.
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke truncate, references, trigger on tables from anon, authenticated;
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261005171800', 'socle_lot19e_droits_larges', array['revoke truncate, references, trigger on all tables in schema public from anon, authenticated; alter default privileges in schema public revoke truncate, references, trigger on tables from anon, authenticated;'])
on conflict do nothing;
-- Ce qu'anon peut encore écrire, et si une politique le prévoit.
select g.table_name, string_agg(distinct g.privilege_type, ',') as droits_anon,
       (select string_agg(p.policyname || ' (' || p.cmd || ')', '; ') from pg_policies p where p.schemaname = 'public' and p.tablename = g.table_name and ('anon' = any(p.roles) or p.roles = '{public}'::name[]) and p.cmd in ('INSERT', 'UPDATE', 'ALL')) as politiques_anon,
       (select relrowsecurity from pg_class where oid = ('public.' || quote_ident(g.table_name))::regclass) as rls
from information_schema.role_table_grants g
where g.table_schema = 'public' and g.grantee = 'anon' and g.privilege_type in ('INSERT', 'UPDATE')
group by 1 order by 1;
