-- recupere 20261005212500 socle_lot19w_droits_apres_lots_b6_b7
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Note : Généré (table temporaire).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête 1c01bc8a-945d-4f90-92f4-caceb9c8f7c3 (mcp__Supabase__execute_sql, 2026-10-05T20:47:09.458Z, résultat : réussi)
create temp table if not exists lot19w (stmt text);
do $$
declare r record;
begin
  for r in
    select distinct g.oid, g.proname, pg_get_function_identity_arguments(g.oid) as args
    from pg_proc g join pg_namespace gn on gn.oid = g.pronamespace
    where gn.nspname = 'private' and g.prokind = 'f' and not has_function_privilege('authenticated', g.oid, 'EXECUTE')
      and (
        exists (select 1 from pg_class v join pg_namespace vn on vn.oid = v.relnamespace where vn.nspname = 'public' and v.relkind = 'v' and has_table_privilege('authenticated', v.oid, 'SELECT') and pg_get_viewdef(v.oid) ~ ('private\.' || g.proname || '\s*\('))
        or exists (select 1 from pg_policies pol where pol.schemaname = 'public' and (coalesce(pol.qual,'') || ' ' || coalesce(pol.with_check,'')) ~ ('private\.' || g.proname || '\s*\('))
        or exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace cn on cn.oid = c.relnamespace where cn.nspname = 'public' and not t.tgisinternal and pg_get_triggerdef(t.oid) ~ ('private\.' || g.proname || '\s*\('))
        or exists (select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace tn on tn.oid = t.relnamespace where tn.nspname = 'public' and c.contype = 'c' and pg_get_constraintdef(c.oid) ~ ('private\.' || g.proname || '\s*\('))
        or exists (select 1 from pg_proc f join pg_namespace fn on fn.oid = f.pronamespace where fn.nspname in ('public','private') and not f.prosecdef and has_function_privilege('authenticated', f.oid, 'EXECUTE') and f.prosrc ~ ('private\.' || g.proname || '\s*\('))
      )
  loop
    execute format('grant execute on function private.%I(%s) to authenticated', r.proname, r.args);
    insert into lot19w values (format('grant execute on function private.%I(%s) to authenticated', r.proname, r.args));
  end loop;
end $$;
insert into supabase_migrations.schema_migrations (version, name, statements)
select '20261005212500', 'socle_lot19w_droits_apres_lots_b6_b7', coalesce(array_agg(stmt order by stmt), array['aucun']) from lot19w;
select (select string_agg(stmt, ' ; ') from lot19w) as grants;
select * from runtests('tests'::name, '^test_b6_02_');
