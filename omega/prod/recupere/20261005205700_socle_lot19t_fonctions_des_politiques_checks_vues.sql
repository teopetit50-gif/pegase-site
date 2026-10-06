-- recupere 20261005205700 socle_lot19t_fonctions_des_politiques_checks_vues
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Note : Généré (table temporaire).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête 5d5690fa-66b6-4202-9544-7093b76bfa6d (mcp__Supabase__execute_sql, 2026-10-05T20:37:58.294Z, résultat : réussi)
create temp table if not exists lot19t (stmt text);
do $$
declare r record;
begin
  for r in
    select distinct g.oid, g.proname, pg_get_function_identity_arguments(g.oid) as args
    from pg_proc g join pg_namespace gn on gn.oid = g.pronamespace
    where gn.nspname = 'private' and g.prokind = 'f' and not has_function_privilege('authenticated', g.oid, 'EXECUTE')
      and (
        exists (select 1 from pg_policies pol where pol.schemaname = 'public' and (coalesce(pol.qual,'') || ' ' || coalesce(pol.with_check,'')) ~ ('private\.' || g.proname || '\s*\('))
        or exists (select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace tn on tn.oid = t.relnamespace where tn.nspname = 'public' and c.contype = 'c' and pg_get_constraintdef(c.oid) ~ ('private\.' || g.proname || '\s*\('))
        or exists (select 1 from pg_attrdef d join pg_class t on t.oid = d.adrelid join pg_namespace tn on tn.oid = t.relnamespace where tn.nspname = 'public' and pg_get_expr(d.adbin, d.adrelid) ~ ('private\.' || g.proname || '\s*\('))
        or exists (select 1 from pg_class v join pg_namespace vn on vn.oid = v.relnamespace where vn.nspname = 'public' and v.relkind = 'v' and has_table_privilege('authenticated', v.oid, 'SELECT') and pg_get_viewdef(v.oid) ~ ('private\.' || g.proname || '\s*\('))
      )
  loop
    execute format('grant execute on function private.%I(%s) to authenticated', r.proname, r.args);
    insert into lot19t values (format('grant execute on function private.%I(%s) to authenticated', r.proname, r.args));
  end loop;
end $$;
insert into supabase_migrations.schema_migrations (version, name, statements)
select '20261005205700', 'socle_lot19t_fonctions_des_politiques_checks_vues', coalesce(array_agg(stmt order by stmt), array['aucun']) from lot19t;
select (select count(*) from lot19t) as grants_poses, (select string_agg(stmt, ' ; ') from lot19t) as liste,
 (select string_agg(pol.tablename||':'||pol.policyname, ', ') from pg_policies pol where pol.schemaname='public' and (coalesce(pol.qual,'')||coalesce(pol.with_check,'')) like '%tiroma_trace_ecriture%') as ou_trace;
