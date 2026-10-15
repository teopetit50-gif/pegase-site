-- b2_05b — Le droit d'exécuter private.loc_chiffrer_retour_agence retiré à authenticated (session B2, 06/10/2026).
--
-- POURQUOI : avant b2_05, public.loc_chiffrer_retour était une enveloppe SQL en SECURITY INVOKER ; la personne connectée
-- devait donc pouvoir exécuter private.loc_chiffrer_retour_agence. b2_05 l'a remplacée par une porte SECURITY DEFINER
-- (elle applique les états des lieux puis appelle loc_chiffrer_retour_agence sous le propriétaire) : plus personne
-- n'appelle cette fonction privée sous le rôle de l'utilisateur. Le test socle 44 (A5) l'a vu : « have:
-- loc_chiffrer_retour_agence ; want: NULL ». Le contrôle d'identité (auth.uid(), rôle, périmètre) reste dans la fonction :
-- auth.uid() lit le jeton de la requête, pas le rôle courant.
-- Reporté dans la source b2_05 (même révocation en fin de fichier).

revoke all on function private.loc_chiffrer_retour_agence(uuid, jsonb) from public, anon, authenticated;
grant execute on function private.loc_chiffrer_retour_agence(uuid, jsonb) to service_role;
