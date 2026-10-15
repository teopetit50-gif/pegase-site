-- b1_11b — VARELO, réserves à émettre : un droit de trop (06/10/2026, B1)
--
-- CE QUE ÇA CORRIGE : le test 44 du socle (« authenticated n'exécute aucune fonction de private hors des
-- requises ») est rouge après b1_11 : private.grp_exiger_decideur_reception était ouverte à authenticated.
-- Elle n'est appelée que par private.grp_noter_protestation et private.grp_classer_reception, toutes deux
-- SECURITY DEFINER : elles l'exécutent avec les droits de leur propriétaire, authenticated n'en a pas besoin.
-- auth.uid() reste celui de la personne (le jeton de la requête), le contrôle du décideur ne change pas.
--
-- À poser après b1_11. Idempotent ; aucune suppression.

revoke execute on function private.grp_exiger_decideur_reception(uuid, uuid) from public, anon, authenticated;
grant execute on function private.grp_exiger_decideur_reception(uuid, uuid) to service_role;

-- Contrôle : authenticated ne l'exécute plus.
select has_function_privilege('authenticated', 'private.grp_exiger_decideur_reception(uuid, uuid)', 'execute') as authenticated_execute;
