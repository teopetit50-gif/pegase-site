-- LORANI, lot B5-09 — les alertes, rappels et échéances nomment le permis, plus seulement son dossier.
--
-- Ce que ça corrige : private.lorani_titre_permis rendait « <TYPE> « <nom du projet> » ». Dans un dossier qui porte
-- plusieurs permis, rien ne les distinguait : sur la recette (06/10, relevé par le coordinateur), l'échéance
-- d'affichage de la DP « Clôture Garnier » s'intitulait « DP « Extension Garnier (banc) » », comme le PC voisin.
-- Désormais l'intitulé du permis quand il en a un (c'est ce que l'écran affiche), sinon le nom du projet comme avant.
-- Les sept appelants du socle (alertes de transition et de rappel, envoi du rappel b5_03, ligne du point, libellés
-- des échéances) en profitent sans être recopiés. Test : étape 10 alignée (« PC « Résidence Lemoine — six
-- logements » »). Migration idempotente (create or replace), rien n'est retiré.

CREATE OR REPLACE FUNCTION private.lorani_titre_permis(p lorani_permis, p_projet lorani_projets)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select format('%s « %s »', upper(p.type_autorisation), left(coalesce(nullif(btrim(p.intitule), ''), p_projet.nom), 60))
$function$;
