-- recupere 20261005195100 socle_lot19l_authenticated_sans_ecriture_hors_policy
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête a0923536-77a5-4a1b-a7cb-0337d0e67798 (mcp__Supabase__execute_sql, 2026-10-05T19:47:36.785Z, résultat : réussi)
revoke insert, update, delete on public.audit_journal, public.catalogue_site, public.clients, public.moteurs_reconnus, public.profils_metier from authenticated;
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261005195100', 'socle_lot19l_authenticated_sans_ecriture_hors_policy', array['revoke insert, update, delete on public.audit_journal, public.catalogue_site, public.clients, public.moteurs_reconnus, public.profils_metier from authenticated']);
select table_name, string_agg(privilege_type, ',' order by privilege_type) as privs from information_schema.role_table_grants where grantee='authenticated' and table_schema='public' and table_name in ('clients','comptes','entites','regles_validation','approbations','demandes_validation') group by 1 order by 1;
