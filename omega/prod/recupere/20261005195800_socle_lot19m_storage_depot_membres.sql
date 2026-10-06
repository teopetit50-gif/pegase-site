-- recupere 20261005195800 socle_lot19m_storage_depot_membres
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête f496b8a1-7925-40dc-82b9-f60ab4a3b76e (mcp__Supabase__execute_sql, 2026-10-05T19:56:55.377Z, résultat : réussi)
create policy "les membres déposent les pièces de leurs organisations" on storage.objects for insert to authenticated
with check (bucket_id = 'omega-clients' and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/filed_document/' and (substring(name from 1 for 36))::uuid in (select private.mes_clients()));
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261005195800', 'socle_lot19m_storage_depot_membres', array['create policy "les membres déposent les pièces de leurs organisations" on storage.objects for insert to authenticated with check (bucket_id = ''omega-clients'' and name ~ ''^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/filed_document/'' and (substring(name from 1 for 36))::uuid in (select private.mes_clients()))']);
select count(*) as n from pg_policies where schemaname='storage' and tablename='objects' and cmd='INSERT';
