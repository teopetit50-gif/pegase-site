-- recupere 20261005182000 socle_lot19h_realtime_espace
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Note : Deux requêtes : 49490ae3 (quatre tables, ligne de migration) puis c087a3fc (18:07 Z, quatre tables de plus, ligne de migration mise à jour).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête 49490ae3-e9e9-4194-8e6e-00f62c62a8ee (mcp__Supabase__execute_sql, 2026-10-05T17:57:50.193Z, résultat : réussi)
do $$
declare t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['demandes_validation', 'approbations', 'filed_documents', 'filed_factures'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261005182000', 'socle_lot19h_realtime_espace', array['alter publication supabase_realtime add table public.demandes_validation, public.approbations, public.filed_documents, public.filed_factures (si absentes)'])
on conflict do nothing;
select tablename from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' order by 1;

-- ═══ requête c087a3fc-7af9-410c-9cd2-6f1e08e7e492 (mcp__Supabase__execute_sql, 2026-10-05T18:07:24.787Z, résultat : réussi)
do $$
declare t text;
begin
  foreach t in array array['delegations', 'filed_controles', 'filed_historique', 'points_du_jour'] loop
    if to_regclass('public.' || t) is not null and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
update supabase_migrations.schema_migrations set statements = array['alter publication supabase_realtime add table demandes_validation, approbations, filed_documents, filed_factures, delegations, filed_controles, filed_historique, points_du_jour (si absentes)'] where version = '20261005182000';
select tablename from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' order by 1;
