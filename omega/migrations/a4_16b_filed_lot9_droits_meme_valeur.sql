-- FILED, lot 9 (correctif a4_16b) — droits de private.filed_meme_valeur (test socle 44, 06/10).
-- Seul le déclencheur SECURITY DEFINER pieces_valeurs_xml_fait_foi l'appelle : aucun membre n'a à l'exécuter.
-- a4_16 l'accordait à authenticated ; retiré ici, et dans la source d'a4_16. Rejouable ; rien n'est supprimé.
revoke all on function private.filed_meme_valeur(jsonb, jsonb) from public, anon, authenticated;
grant execute on function private.filed_meme_valeur(jsonb, jsonb) to service_role;
