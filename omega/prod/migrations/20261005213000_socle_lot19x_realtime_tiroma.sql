-- 20261005213000 socle_lot19x_realtime_tiroma
-- Source : requête retrouvée dans le fil de la session coordinateur : omega/prod/recupere/20261005213000_socle_lot19x_realtime_tiroma.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : retiré : ligne de schema_migrations (db push écrit la sienne) : insert into supabase_migrations.schema_migrations (version, name, statements) values ('202.
-- recupere 20261005213000 socle_lot19x_realtime_tiroma
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête 34b7269b-bfb3-46ab-add5-f5d997e3e94d (mcp__Supabase__execute_sql, 2026-10-05T20:48:40.811Z, résultat : réussi)
alter publication supabase_realtime add table public.tiroma_cabinets, public.tiroma_releves, public.tiroma_evenements_agenda, public.tiroma_rendez_vous, public.tiroma_plans;
select count(*) as tables_realtime from pg_publication_tables where pubname='supabase_realtime';
