-- recupere 20261005195000 socle_lot19k_grants_selon_policies
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Note : Génère ses GRANT depuis pg_policies au moment de la pose (table temporaire).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête 8cd79293-8f20-4303-913d-18b17946513e (mcp__Supabase__execute_sql, 2026-10-05T19:47:19.345Z, résultat : réussi)
create temp table if not exists lot19k_grants (stmt text);
do $$
declare r record;
begin
  for r in
    with pol as (
      select p.tablename, c.cmd
      from pg_policies p
      cross join lateral (select unnest(case when p.cmd = 'ALL' then array['SELECT','INSERT','UPDATE','DELETE'] else array[p.cmd] end) as cmd) c
      where p.schemaname = 'public' and (p.roles @> array['authenticated'::name] or p.roles @> array['public'::name])
    )
    select distinct tablename, cmd from pol
    where not has_table_privilege('authenticated', 'public.'||quote_ident(tablename), cmd)
    order by tablename, cmd
  loop
    execute format('grant %s on public.%I to authenticated', r.cmd, r.tablename);
    insert into lot19k_grants values (format('grant %s on public.%I to authenticated', r.cmd, r.tablename));
  end loop;
end $$;
insert into supabase_migrations.schema_migrations (version, name, statements)
select '20261005195000', 'socle_lot19k_grants_selon_policies', array_agg(stmt order by stmt) from lot19k_grants;
select 'grants_poses' as k, count(*)::text as v from lot19k_grants
union all
select 'rls_'||c.relname, c.relrowsecurity::text from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('audit_journal','catalogue_site','clients','moteurs_reconnus','profils_metier')
union all
select 'verif_delegations', string_agg(privilege_type, ',' order by privilege_type) from information_schema.role_table_grants where grantee='authenticated' and table_schema='public' and table_name='delegations';
