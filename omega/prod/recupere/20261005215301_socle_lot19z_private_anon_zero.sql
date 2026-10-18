-- recupere 20261005215301 socle_lot19z_private_anon_zero
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Note : Contient des GRANT sur private.depot_executer / depot_demander (outillage de recette). Essai précédent : ad413202 (20:57, erreur).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête 8d2ce7e3-b702-4e87-a9e5-5f19487208f6 (mcp__Supabase__execute_sql, 2026-10-05T20:57:27.103Z, résultat : réussi)
do $$ declare r record; v_mot text; n_auth int := 0; n_tot int := 0; begin
  for r in select p.oid::regprocedure as f, p.prokind from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.prokind in ('f','p','w') loop
    v_mot := case when r.prokind='p' then 'procedure' else 'function' end;
    n_tot := n_tot + 1;
    if has_function_privilege('authenticated', r.f, 'EXECUTE') then
      execute format('grant execute on %s %s to authenticated', v_mot, r.f); n_auth := n_auth + 1;
    end if;
    execute format('revoke execute on %s %s from public, anon', v_mot, r.f);
  end loop;
  raise notice 'private : % fonctions, % gardées pour authenticated', n_tot, n_auth;
end $$;
alter default privileges for role postgres in schema private revoke execute on functions from public;
alter default privileges for role postgres in schema private grant execute on functions to service_role;
grant execute on function private.depot_executer(bigint) to service_role;
grant execute on function private.depot_demander(text,text) to service_role;
insert into supabase_migrations.schema_migrations(version,name,statements) values ('20261005215301','socle_lot19z_private_anon_zero', array['EXECUTE explicite pour authenticated sur ce qu''il avait, puis revoke from public, anon sur toutes les fonctions de private ; default privileges de postgres dans private : public sans EXECUTE, service_role avec (test 44 d''A5 : 30 fonctions exécutables par anon après les lots de la vague 2)']) on conflict do nothing;
select current_user as moi, r.rolname, count(*) filter (where has_function_privilege(r.rolname, p.oid, 'EXECUTE')) as executables, count(*) as total
from pg_roles r cross join pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='private' and p.prokind in ('f','w') and r.rolname in ('anon','authenticated','service_role') group by 1,2 order by 2;
