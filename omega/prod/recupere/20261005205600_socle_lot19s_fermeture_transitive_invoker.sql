-- recupere 20261005205600 socle_lot19s_fermeture_transitive_invoker
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Note : Généré (table temporaire).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête d12f04e4-74c3-41f6-9c71-a5c85d0dab97 (mcp__Supabase__execute_sql, 2026-10-05T20:37:31.864Z, résultat : réussi)
create temp table if not exists lot19s (stmt text);
do $$
declare r record; n integer := 1; tours integer := 0;
begin
  while n > 0 and tours < 10 loop
    n := 0; tours := tours + 1;
    for r in
      select distinct g.oid, gn.nspname, g.proname, pg_get_function_identity_arguments(g.oid) as args
      from pg_proc f join pg_namespace fn on fn.oid = f.pronamespace
      join pg_proc g on g.prokind = 'f' join pg_namespace gn on gn.oid = g.pronamespace
      where fn.nspname in ('public','private') and gn.nspname = 'private'
        and not f.prosecdef and has_function_privilege('authenticated', f.oid, 'EXECUTE')
        and f.prosrc ~ ('private\.' || g.proname || '\s*\(')
        and not has_function_privilege('authenticated', g.oid, 'EXECUTE')
    loop
      execute format('grant execute on function %I.%I(%s) to authenticated', r.nspname, r.proname, r.args);
      insert into lot19s values (format('grant execute on function %I.%I(%s) to authenticated', r.nspname, r.proname, r.args));
      n := n + 1;
    end loop;
  end loop;
end $$;
insert into supabase_migrations.schema_migrations (version, name, statements)
select '20261005205600', 'socle_lot19s_fermeture_transitive_invoker', coalesce(array_agg(stmt order by stmt), array['aucun']) from lot19s;
select (select count(*) from lot19s) as grants_poses, (select string_agg(stmt, ' ; ') from lot19s) as liste;
