-- recupere 20261005202500 socle_lot19n_realtime_vague2
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Note : La même requête pose aussi 19o (20261005202600).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête adc510cc-873b-4f08-abda-f049650acf87 (mcp__Supabase__execute_sql, 2026-10-05T20:25:04.359Z, résultat : réussi)
alter publication supabase_realtime add table public.grp_ref_propositions, public.grp_ref_codes, public.grp_ref_objets, public.grp_societes, public.lorani_permis, public.lorani_permis_dates_lues, public.lorani_permis_echeances, public.lorani_permis_recours, public.delais;
insert into supabase_migrations.schema_migrations (version, name, statements) values ('20261005202500', 'socle_lot19n_realtime_vague2', array['alter publication supabase_realtime add table public.grp_ref_propositions, public.grp_ref_codes, public.grp_ref_objets, public.grp_societes, public.lorani_permis, public.lorani_permis_dates_lues, public.lorani_permis_echeances, public.lorani_permis_recours, public.delais']);
create policy "les membres déposent les pièces de leurs objets" on storage.objects for insert to authenticated
with check (bucket_id = 'omega-clients' and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[a-z][a-z_]{1,39}/' and (substring(name from 1 for 36))::uuid in (select private.mes_clients()));
insert into supabase_migrations.schema_migrations (version, name, statements) values ('20261005202600', 'socle_lot19o_storage_depot_tout_objet', array['create policy "les membres déposent les pièces de leurs objets" on storage.objects for insert to authenticated with check (bucket_id = ''omega-clients'' and name ~ ''^<uuid>/[a-z][a-z_]{1,39}/'' and (substring(name from 1 for 36))::uuid in (select private.mes_clients()))']);
select (select count(*) from pg_publication_tables where pubname='supabase_realtime') as tables_realtime, (select count(*) from pg_policies where schemaname='storage' and tablename='objects') as policies_storage;
