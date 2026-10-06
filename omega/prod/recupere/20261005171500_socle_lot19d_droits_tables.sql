-- recupere 20261005171500 socle_lot19d_droits_tables
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête 437a14b7-17b6-4fd7-a1a0-bbf8d1ee5d88 (mcp__Supabase__execute_sql, 2026-10-05T17:15:08.481Z, résultat : réussi)
-- socle_lot19d : les droits de table par défaut de Supabase retirés aux rôles clients sur les tables posées sans révocation (relevé par le test 08 d'A5).
revoke all privileges on table public.abonnements_modules, public.demandes_audit, public.receptions,
  public.filed_archives, public.filed_centres_cout, public.filed_charges_attendues, public.filed_charges_recurrentes, public.filed_circuits,
  public.filed_exercices, public.filed_exports, public.filed_exports_programmes, public.filed_factures_annexes, public.filed_factures_exercices,
  public.filed_imputations, public.filed_imputations_apprises, public.filed_litiges, public.filed_plan_comptable, public.filed_reglements,
  public.filed_validations, public.filed_verifications_tiers
from anon, authenticated;
grant select on table public.abonnements_modules, public.receptions,
  public.filed_archives, public.filed_centres_cout, public.filed_charges_attendues, public.filed_charges_recurrentes, public.filed_circuits,
  public.filed_exercices, public.filed_exports, public.filed_exports_programmes, public.filed_factures_annexes, public.filed_factures_exercices,
  public.filed_imputations, public.filed_imputations_apprises, public.filed_litiges, public.filed_plan_comptable, public.filed_reglements,
  public.filed_validations, public.filed_verifications_tiers
to authenticated;
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261005171500', 'socle_lot19d_droits_tables', array['-- revoke all ... from anon, authenticated ; grant select ... to authenticated (voir omega/NOTES-COORDINATEUR.md)'])
on conflict do nothing;
select table_name, grantee, string_agg(privilege_type, ',' order by privilege_type) as droits
from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated') and table_name in ('abonnements_modules', 'demandes_audit', 'receptions', 'filed_archives')
group by 1, 2 order by 1, 2;
