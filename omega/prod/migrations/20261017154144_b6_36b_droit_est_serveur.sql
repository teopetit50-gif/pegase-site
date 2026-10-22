-- 20261017154144 b6_36b_droit_est_serveur
-- Source : dépôt : a5b9fb1 omega/modules/daliro/migrations/b6_36b_droit_est_serveur.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : b6_36b_droit_est_serveur.sql @ a5b9fb1.
-- ═══ omega/modules/daliro/migrations/b6_36b_droit_est_serveur.sql @ a5b9fb1
-- b6_36b — DALIRO : correctif de b6_36 (session B6, 17/10/2026)
--
-- RÉGRESSION : b6_36 redéfinissait private.btp_est_serveur() (même corps que le socle) et en retirait l'execute à
-- authenticated. Or les vues et portes du chantier l'appellent sous le rôle de la personne (b6_01, b6_03, b6_04,
-- btp_debourse_lots…) : 42501 « permission denied for function btp_est_serveur » dans test_b6_01 à b6_10.
--
-- CE QUI EST POSÉ : le droit d'origine (b6_03), rétabli. La fonction ne dit que « suis-je le serveur ? » ; une
-- personne y lit toujours faux. b6_36 ne la touche plus (redéfinition et revoke retirés du fichier).
--
-- Règles de pose : rien n'est retiré ni effacé. Rejouable.

grant execute on function private.btp_est_serveur() to authenticated, service_role;
