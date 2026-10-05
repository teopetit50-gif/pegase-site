-- b1_02_portes_authenticated — VARELO : ouvrir aux personnes connectées les quatre portes que b1_01 garde par le rôle
-- Session B1, 05/10/2026. Pose : coordinateur, recette ygwbgpowzlbdaajlsqkn, puis production. Après b1_01.
--
-- CE QUE ÇA CORRIGE (réponse Q1 du coordinateur, 05/10) :
--   public.grp_installer, grp_deposer_codes, grp_rapprocher et grp_appliquer_decisions n'étaient exécutables
--   que par service_role. La promesse du site (« chaque source se branche avec l'accord de la DSI ») et le
--   scénario (NOTES-B1.md, étapes 1, 5, 7, 10) veulent que LE GÉRANT installe Varelo et dépose les exports
--   depuis /espace/varelo, et qu'un valideur lance un passage ou applique les décisions sans attendre le cron.
--   b1_01 ayant posé le contrôle de rôle et d'appartenance dans ces quatre enveloppes, on peut les ouvrir à
--   authenticated. Les enveloppes sont SECURITY INVOKER : la personne a aussi besoin d'EXECUTE sur les quatre
--   fonctions private SECURITY DEFINER qu'elles appellent (même logique que grp_proposer / grp_ecarter_proposition
--   dans la liste figée d'A5, omega/a5_01_liste_figee.txt : à y ajouter — demande au coordinateur).
--   anon ne reçoit rien ; service_role garde tout.

grant execute on function public.grp_installer(uuid, text) to authenticated;
grant execute on function public.grp_deposer_codes(uuid, uuid, text, jsonb, text) to authenticated;
grant execute on function public.grp_rapprocher(uuid, boolean) to authenticated;
grant execute on function public.grp_appliquer_decisions(uuid) to authenticated;

grant execute on function private.grp_installer(uuid, text) to authenticated;
grant execute on function private.grp_deposer_codes(uuid, uuid, text, jsonb, text) to authenticated;
grant execute on function private.grp_rapprocher(uuid, boolean) to authenticated;
grant execute on function private.grp_executer_decisions(uuid) to authenticated;
