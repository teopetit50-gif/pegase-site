-- recupere 20261005205500 socle_lot19r_triggers_executables_par_authenticated
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Note : Généré depuis le catalogue au moment de la pose (table temporaire).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête 63e761aa-fff3-48f8-abf8-0e5208e8eda1 (mcp__Supabase__execute_sql, 2026-10-05T20:37:11.180Z, résultat : réussi)
create temp table if not exists lot19r (stmt text);
do $$
declare r record;
begin
  for r in
    select distinct p.oid, n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace cn on cn.oid = c.relnamespace
    join pg_proc p on p.oid = t.tgfoid join pg_namespace n on n.oid = p.pronamespace
    where cn.nspname = 'public' and not t.tgisinternal and n.nspname in ('private','public')
      and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
  loop
    execute format('grant execute on function %I.%I(%s) to authenticated', r.nspname, r.proname, r.args);
    insert into lot19r values (format('grant execute on function %I.%I(%s) to authenticated', r.nspname, r.proname, r.args));
  end loop;
end $$;
insert into supabase_migrations.schema_migrations (version, name, statements)
select '20261005205500', 'socle_lot19r_triggers_executables_par_authenticated', coalesce(array_agg(stmt order by stmt), array['aucun']) from lot19r;
select (select count(*) from lot19r) as grants_poses, (select string_agg(stmt, ' ; ') from lot19r) as liste;
