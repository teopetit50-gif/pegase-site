# Brief commun pour tous les sous-agents de l'étude « SaaS avocats US »

## Contexte en 5 lignes
Nous réalisons une étude de marché des logiciels (SaaS) utilisés par les avocats aux États-Unis, pour le compte d'Omega AI, éditeur français du logiciel Tamila. Tamila lit toutes les pièces d'un dossier contentieux (y compris scannées et manuscrites), reconstitue les faits avec renvoi à la pièce et à la page, construit une chronologie sourcée, détecte les contradictions entre pièces, contrôle le bordereau de pièces, aide aux conclusions, lit les délais de procédure, envoie un « point du matin » quotidien, et pilote la rentabilité du cabinet (forfaits dépassés, marge par dossier). Nous voulons savoir ce qui existe aux US pour cela, ce que les avocats US disent vraiment de ces outils, et si Tamila pourrait un jour attaquer ce marché.

## Règles strictes (non négociables)
1. N'invente JAMAIS un chiffre, un prix, une citation, un nom de client ou une source. Si tu ne trouves pas : écris « non trouvé ».
2. Chaque affirmation factuelle a une URL source et une date de consultation (format AAAA-MM-JJ). Aujourd'hui : 2026-11-07.
3. Étiquette chaque chiffre : [vérifié] (source primaire : rapport, page officielle, document SEC, communiqué), [estimé] (déduction, explique le calcul), [déclaratif] (chiffre annoncé par l'éditeur lui-même sans vérification indépendante).
4. Distingue toujours ce que l'éditeur PROMET (marketing) et ce que les utilisateurs DISENT (avis, Reddit, forums).
5. Le marché bouge vite : vérifie que l'information est actuelle (2025-2026), signale les rachats récents et les changements de nom.
6. Si un site est inaccessible, note-le explicitement et passe à une source alternative (cache, article de presse, G2, Capterra).
7. Recherches en ANGLAIS (marché US), rédaction en FRANÇAIS. Style clair, direct, sans jargon inutile, sans tirets cadratins (utilise des virgules, des parenthèses ou des deux-points).
8. Ne t'arrête jamais à la première page de résultats. Diversifie les requêtes avec les termes métier US.
9. Les prix : donne le prix public exact avec l'unité (par utilisateur et par mois, par dossier, par Go, etc.) et la date du relevé. Si « sur devis », écris « sur devis (date) ».

## Étapes du workflow (codes à utiliser dans le champ etapes_workflow)
A. Traitement des dossiers
1 = Acquisition de clients, intake, qualification
2 = Conflict check, lettre de mission
3 = Ouverture et gestion du dossier (matter management)
4 = Recherche juridique
5 = Analyse des faits et des pièces, chronologies, résumés de pièces et de dossiers médicaux, détection des incohérences
6 = Rédaction et revue de documents, automatisation documentaire
7 = Discovery et e-discovery, exhibits, Bates, privilege logs
8 = Contentieux : calendrier, docketing, ECF/PACER, dépositions, préparation du procès
9 = Communication client, portail, e-signature
10 = Gestion documentaire, versions, collaboration
11 = Clôture, archivage, conservation
B. Gestion du cabinet
12 = Saisie du temps
13 = Facturation, paiements, recouvrement, e-billing LEDES
14 = Trust accounting, IOLTA
15 = Comptabilité, rentabilité par dossier et par avocat, dépassements de forfaits
16 = CRM, relances, marketing, avis clients
17 = Gestion des connaissances, modèles internes
18 = Sécurité, confidentialité, conformité déontologique
19 = Recrutement, formation, CLE
C. Directions juridiques
20 = CLM, demandes internes, e-billing et legal spend management

## Format de sortie pour la découverte d'outils (Phase 2) : JSONL
Un objet JSON par ligne, un outil par objet, dans le fichier indiqué dans ta mission. Clés obligatoires (toutes en chaînes de caractères, « non trouvé » si inconnu) :
nom, url, categorie, etapes_workflow (codes séparés par des virgules, ex. "5,7,8"), segment_cible (solo / petit cabinet 2-10 / moyen 11-50 / grand 50+ / Am Law 200 / in-house), domaines_de_pratique, probleme_resolu (une phrase du point de vue de l'avocat), fonctionnalites_cles, fonctionnalites_ia, modele_prix (par utilisateur / par dossier / par page / par Go / à l'usage / forfait cabinet / sur devis), prix_public (avec unité et date), mode_de_vente (essai gratuit / démo / pilote / self-service / vente directe), integrations, securite_conformite (SOC 2, chiffrement, politique d'entraînement des modèles, hébergement), annee_creation, siege, proprietaire_ou_levees (propriétaire, acquisitions, montants levés avec date), note_g2, nb_avis_g2, points_forts (ce que les utilisateurs aiment, sourcé), points_faibles (ce que les utilisateurs reprochent, sourcé), concurrent_direct_tamila ("oui" ou "non" : oui si l'outil fait de l'analyse de faits, chronologie, détection de contradictions, contrôle de pièces, délais procéduraux ou rentabilité par dossier), date_verification, sources (URLs séparées par " | ").
Pas de retour à la ligne à l'intérieur d'une valeur. Échappe correctement les guillemets.
