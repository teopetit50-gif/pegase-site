-- 20261006145904 b3_12c_droits_appelant_rattrape
-- Source : dépôt, lot posé sur la recette sans ligne schema_migrations (rattrapé le 25/10) : 453e33283f omega/modules/tiroma/migrations/b3_12c_droits_appelant.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : rattrapé : b3_12c_droits_appelant.sql @ 453e33283f (posé sur la recette sans ligne schema_migrations).
-- ═══ omega/modules/tiroma/migrations/b3_12c_droits_appelant.sql @ 453e33283f
-- b3_12c — private.tiroma_appelant n'est appelée que par private.tiroma_appels_lire (security definer) : elle n'a pas
-- à être exécutable par authenticated (test socle 44, 06/10). Droits ramenés à service_role. Idempotent.
revoke all on function private.tiroma_appelant(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function private.tiroma_appelant(uuid, uuid, uuid) to service_role;

select has_function_privilege('authenticated', 'private.tiroma_appelant(uuid, uuid, uuid)', 'execute') as authenticated_peut;
