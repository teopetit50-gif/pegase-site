-- 20261006145514 a4_16b_filed_lot9_droits_meme_valeur_rattrape
-- Source : dépôt, lot posé sur la recette sans ligne schema_migrations (rattrapé le 25/10) : 00eeeeb12f omega/migrations/a4_16b_filed_lot9_droits_meme_valeur.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : rattrapé : a4_16b_filed_lot9_droits_meme_valeur.sql @ 00eeeeb12f (posé sur la recette sans ligne schema_migrations).
-- ═══ omega/migrations/a4_16b_filed_lot9_droits_meme_valeur.sql @ 00eeeeb12f
-- FILED, lot 9 (correctif a4_16b) — droits de private.filed_meme_valeur (test socle 44, 06/10).
-- Seul le déclencheur SECURITY DEFINER pieces_valeurs_xml_fait_foi l'appelle : aucun membre n'a à l'exécuter.
-- a4_16 l'accordait à authenticated ; retiré ici, et dans la source d'a4_16. Rejouable ; rien n'est supprimé.
revoke all on function private.filed_meme_valeur(jsonb, jsonb) from public, anon, authenticated;
grant execute on function private.filed_meme_valeur(jsonb, jsonb) to service_role;
