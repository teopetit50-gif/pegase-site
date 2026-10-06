-- recupere 20261005205800 socle_lot19u_fonctions_des_clauses_when_des_triggers
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Note : Généré (table temporaire).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête facac43b-0492-425c-a104-47947158e079 (mcp__Supabase__execute_sql, 2026-10-05T20:38:31.824Z, résultat : réussi)
create temp table if not exists lot19u (stmt text);
do $$
declare r record;
begin
  for r in
    select distinct g.oid, g.proname, pg_get_function_identity_arguments(g.oid) as args
    from pg_proc g join pg_namespace gn on gn.oid = g.pronamespace
    where gn.nspname = 'private' and g.prokind = 'f' and not has_function_privilege('authenticated', g.oid, 'EXECUTE')
      and exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace cn on cn.oid = c.relnamespace
                  where cn.nspname = 'public' and not t.tgisinternal and pg_get_triggerdef(t.oid) ~ ('private\.' || g.proname || '\s*\('))
  loop
    execute format('grant execute on function private.%I(%s) to authenticated', r.proname, r.args);
    insert into lot19u values (format('grant execute on function private.%I(%s) to authenticated', r.proname, r.args));
  end loop;
end $$;
insert into supabase_migrations.schema_migrations (version, name, statements)
select '20261005205800', 'socle_lot19u_fonctions_des_clauses_when_des_triggers', coalesce(array_agg(stmt order by stmt), array['aucun']) from lot19u;
select (select count(*) from lot19u) as grants_poses, (select string_agg(stmt, ' ; ') from lot19u) as liste,
 (select string_agg(c.relname||':'||t.tgname, ', ') from pg_trigger t join pg_class c on c.oid=t.tgrelid where not t.tgisinternal and pg_get_triggerdef(t.oid) like '%tiroma_trace_ecriture%') as ou_trace;
