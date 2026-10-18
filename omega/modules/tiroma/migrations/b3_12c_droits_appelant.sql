-- b3_12c — private.tiroma_appelant n'est appelée que par private.tiroma_appels_lire (security definer) : elle n'a pas
-- à être exécutable par authenticated (test socle 44, 06/10). Droits ramenés à service_role. Idempotent.
revoke all on function private.tiroma_appelant(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function private.tiroma_appelant(uuid, uuid, uuid) to service_role;

select has_function_privilege('authenticated', 'private.tiroma_appelant(uuid, uuid, uuid)', 'execute') as authenticated_peut;
