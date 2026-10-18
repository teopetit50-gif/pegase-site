# Lorani — ce que la page des architectes promet, et ce qui est prouvé (B5, 18/10/2026)

Demande de Teo (18/10, 17 h Z, par le coordinateur) : prouver sur la recette ce que promet
`omegaai.fr/secteurs/architectes` (planches, CCTP, DPGF, permis), au niveau 2 dès que possible. La page se lit seulement ;
aucun fichier du site n'est touché.

**Relu le 18/10** : la page servie (HTML de `omegaai.fr/secteurs/architectes`, 200) et le code de main c32f871. Aucun
fichier de la page n'a changé depuis le chiffrage du 06/10 (c0494b4). Les 66 lignes de `lorani.md` couvrent donc
toujours la page. Six phrases ne sont pas dans le HTML servi parce qu'elles sont dans les réponses de la FAQ, que la
page n'affiche qu'à l'ouverture (`Questions.tsx`) : #7, #21b, #22, #23, #47, #56.

**En bref, sur 67 lignes** : 6 au niveau 2, en tout ou en partie (#14, #21, #21b, #24 et #42 pour la DPGF, #31 dès le
premier relevé) ; 47 au niveau 1 ; 14 au niveau 0. Le niveau 2 des promesses centrales (planches, CCTP, DPGF croisés)
attend la lecture du CCTP de Luzarches et de Touët, donc le retour du crédit IA.

## Niveaux

- **2** : prouvé en vrai, avec une vraie pièce ou un vrai service (lecteur, API publique, Storage), sur la recette.
  « 2 (fabriquée) » : la vraie chaîne, mais sur une pièce fabriquée pour l'essai.
- **1** : posé sur la recette et vert (test pgTAP joué par le coordinateur, ou recette de l'écran à cinq largeurs), sur
  des données d'essai ou des doubles de lecture.
- **0** : rien, ou l'exemple de l'écran seulement.
- **IA** : « oui » si l'étape suivante demande une lecture par le modèle. Le crédit IA de la recette est épuisé depuis le
  18/10, 17 h Z. Coût observé : environ 0,04 € par page.

## Le tableau

| # | Promesse (résumé) | Niveau | Preuve | Pour le niveau 2 | IA |
|---|---|---|---|---|---|
| 1 | Chaque planche croisée avec le CCTP, la DPGF et le PLU | 1 | b5_07 (31 assertions), b5_16, b5_21 | Un vrai jeu de planches, un CCTP et une DPGF lus, puis le contrôle passé dessus. Prêt sur le banc : Touët (plans, CCTP, DPGF lot 1, 57 p.) ; le CCTP de Luzarches est à relire | oui |
| 2 | La liste des incohérences en quelques heures | 1 | cron `lorani_lectures_passage` (5 min) ; le contrôle se lance à la dernière lecture (b5_07 §9) | Chronométrer un vrai dossier, du dépôt au contrôle passé | oui |
| 3 | Sans BIM, des PDF suffisent | 1 | contrat de lecture en PDF | Vient avec #1 | oui |
| 4 | Vos PDF, même scannés | 0 | — | Un vrai plan scanné lu (boîte estimée) | oui |
| 5 | Lecture seule, aucun fichier modifié | 1 | par construction ; b5_07 §6 | Vient avec #1 : montrer que la pièce déposée garde son sha256 | non |
| 6 | Données hébergées dans l'UE | 0 | — | Région du projet Supabase, des fonctions Vercel, du fournisseur du modèle : à relever et écrire | non |
| 7 | Retirer ses dossiers, rapports compris (FAQ) | 0 | — | Une purge validée par le coordinateur (règle : pas de suppression en clair) | non |
| 8 | Pièces PC1 à PC8 et PLU contrôlées | 1 | b5_01 (121 assertions), b5_05, b5_07, b5_12 | Un vrai dossier de permis lu ; le contenu de PC1, PC6, PC7, PC8 n'est pas contrôlé | oui |
| 9 | Quatre phases, du permis à la réception | 1 | b5_01, b5_04, b5_06, b5_10, b5_12, b5_16 (offres) | Le visa ne contrôle pas le fond des fiches (#35) | oui |
| 10 | PLU, PMR, ERP et RE2020 | 1 | b5_12 §2, b5_07 §3, b5_21 | Une vraie attestation RE2020 et une vraie notice lues | oui |
| 11 | Une cote modifiée retrouvée partout | 1 | b5_07 §2, b5_13 | Vient avec #1 | oui |
| 12 | Règles opposables citées | 1 | b5_07 §3, b5_12 §2 | Vient avec #1 et #20 | oui |
| 13 | Chaque point cite planche, extrait, valeurs, correction | 1 | b5_07 §2 ; `rapport.ts`, recette `rapport-controle.mjs` | La boîte d'un vrai lecteur sur une vraie planche (#1) | oui |
| 14 | Ajouter un projet, déposer un dossier | **2** | b5_01 ; `dce_lorani.mjs` le 18/10 : projet BANC-DCE-VRD créé et deux vraies pièces déposées par le gérant du banc, sous la RLS | — | non |
| 15 | Régler les contrôles | 1 | b5_31, b5_20 verts | Un réglage qui change le résultat d'un vrai contrôle | oui |
| 16 | Choisir qui décide | 1 | b5_30, b5_19 verts | Vient avec #1 | non |
| 17 | Inviter l'équipe | 0 | membres de projet (RLS) | Invitation depuis l'écran Lorani | non |
| 18 | Suspendre un contrôle | 1 | b5_29, b5_18 verts | Vient avec #1 | non |
| 19 | Délai d'instruction suivi jusqu'à la purge | 1 ; 2 (fabriquée) pour la lecture des courriers | b5_01, b5_02 ; le 06/10, un courrier de mairie fabriqué, déposé par l'écran et lu par le vrai lecteur (`courrier-reel.mjs`) | Un vrai permis, suivi 2 à 5 mois | oui (courriers) |
| 20 | Règles du PLU citées par article | 1 | b5_07 §3 | Le règlement réel d'une zone lu (lien vers #22) | oui |
| 21 | PLU et servitudes lus depuis l'adresse | **2** | relevé réel du 06/10 (Nantes : zone UMa, AC1, secteur protégé) | — | non |
| 21b | Risques connus (FAQ) | **2** | données ouvertes (b5_24) ; relevé réel du 11/10 (sismicité 3, radon 3, 9 risques) | Les argiles à l'adresse plutôt qu'à la commune | non |
| 22 | La zone et son règlement, sans téléversement (FAQ) | 0 | b5_17 trouve le document | Télécharger le règlement depuis le Géoportail et le faire lire | oui |
| 23 | Les pièces que le permis exigera (FAQ) | 1 | `pieces-exigees.ts`, recette de l'écran | Un vrai projet du banc : comparer la liste au bordereau du Cerfa rempli à la main | non |
| 24 | Analyse des offres | 1 ; **2** pour la lecture d'une DPGF | b5_26, b5_16 ; le 18/10, la DPGF réelle de Luzarches lue (4 p., 39 postes et leurs unités, 0,16 €) | Une vraie offre d'entreprise lue (`lorani_offre`) et comparée à cette DPGF | oui |
| 25 | Postes non chiffrés et réserves | 1 | b5_26, b5_16 | Vient avec #24 | oui |
| 26 | Écarts à l'estimation par ligne | 1 | b5_26, b5_16 | Vient avec #24 | oui |
| 27 | Rapport d'analyse prêt à signer | 1 | `rapport-offres.mjs` | Vient avec #24 | oui |
| 28 | Métré des plans contre la DPGF | 1 (quantités cotées) | b5_07 §10 | Promesse d'une mesure sur le dessin : reformuler, ou DWG (#66) | oui |
| 29 | Décennales contrôlées contre le lot | 1 | b5_09 | Une vraie attestation lue | oui |
| 30 | Situation contre marché, précédente et compte rendu | 1 | b5_04, b5_05, b5_32/b5_21, b5_33/b5_22 | Une vraie situation d'entreprise lue | oui |
| 31 | Marché, avenants et révision BT | 1 ; **2** dès le premier relevé du cron | b5_34, b5_23 (459 ok), cron `lorani-index` | Lire le premier vrai relevé BDM (série BT01, mois 2026-08 = 139,4) | non |
| 32 | Avancement déclaré contre constaté | 1 | b5_32, b5_21 | Saisie sur un vrai compte rendu | non |
| 33 | Retenue, avance et pénalités recalculées | 1 | b5_33, b5_22 | Une vraie situation lue avec ses déductions | oui |
| 34 | Ordres de service : montant et délai | 1 | b5_10 §2-4 | Un vrai OS | non |
| 35 | Fiches techniques confrontées au CCTP | 0 | — | Lecture des fiches et des PV, comparaison | oui |
| 36 | Notes de calcul et PV d'essais | 0 | — | Avec #35 | oui |
| 37 | Bordereau VSO, VAO, refus | 1 (statuts) | b5_04 §4 | Le bordereau imprimable | non |
| 38 | Date butoir calée sur la commande | 1 | b5_04 §4, b5_06 | — (calcul) | non |
| 39 | Signalé à J-10 | 1 | b5_25, b5_15 | Un vrai rappel reçu (mode essai : adresse de Teo) | non |
| 40 | Registre daté des visas | 1 | b5_06 | — | non |
| 41 | Aucune planche lue seule | 1 | b5_07, b5_13 | Vient avec #1 | oui |
| 42 | Chaque type de pièce a sa lecture (FAQ) | 1 ; **2** pour la DPGF | contrat ; DPGF de Luzarches lue le 18/10 | CCTP et planche réels lus | oui |
| 43 | Une alerte dès la réception | 1 | b5_04 §3, b5_07 §5 | Vient avec #1 | oui |
| 44 | Une question suivie jusqu'à la réponse | 1 | b5_11 | Une vraie relance envoyée en mode essai | non |
| 45 | Chaque point part en question avec l'extrait | 1 | écran, b5_20 | Vient avec #1 | oui |
| 46 | La question de plus de 8 jours remonte le matin | 1 | b5_25, b5_15 | Lire un vrai point du matin du banc | non |
| 47 | Un point écarté ne revient pas (FAQ) | 1 | b5_07 §7 | Vient avec #1 | oui |
| 48 | Indices suivis, seuls les écarts nouveaux | 1 | b5_07 §7 | Deux indices réels d'une même planche | oui |
| 49 | Changements non signalés d'un indice à l'autre | 1 | b5_28, b5_17 | Avec #48 | oui |
| 50 | Historique des indices sans limite | 1 | b5_07 §7 | — | non |
| 51 | Bloquant, à vérifier, mineur | 1 | b5_16 | L'écran dit « majeur » au lieu de « à vérifier » : à aligner (sans IA) | non |
| 52 | Vos règles internes | 0 | point d'extension b5_16b | Éditeur de listes de contrôle | non |
| 53 | Questions posées au dossier | 0 | — | Recherche dans les valeurs lues, réponse citée | non pour la recherche |
| 54 | Nomenclatures contre plans | 0 | — | Lecture des tableaux de menuiseries | oui |
| 55 | DTU qui n'est plus en vigueur | 0 (CCAG oui) | b5_04 | Liste datée des NF DTU (données payantes) | non |
| 56 | Sécurité incendie de l'habitation (FAQ) | 0 (ERP oui) | b5_12 §2 | Règles de l'arrêté du 31 janvier 1986 | non |
| 57 | Rapport PDF annoté et Excel | 1 | `rapport.ts`, `rapport-controle.mjs` | Le rapport d'un vrai contrôle (#1) | oui |
| 58 | Export Excel par lot | 1 | dossier daté, offres | — | non |
| 59 | Surfaces contre le Cerfa, RE2020, BET | 1 | b5_12 §2 | Vrais Cerfa, attestation et plan BET lus | oui |
| 60 | Complétude du DOE | 1 | b5_12 §4 | Un vrai DOE | non |
| 61 | Comptes rendus de chantier rédigés | 1 (notes) | b5_11 | Photos ; rédaction par un modèle | oui |
| 62 | Réserves suivies jusqu'à la fin de la GPA | 1 | b5_10 §5-7 | — | non |
| 63 | Honoraires par phase contre temps passé | 1 | b5_03 | — | non |
| 64 | Dossier de défense décennale | 1 | écran, `dossier-date.mjs` | Les dates du journal opposable ; l'export d'un vrai projet du banc | non |
| 65 | Bureaux d'études invités | 0 | intervenants | Compte BET aux droits restreints | non |
| 66 | Plans lus en PDF ou en DWG | 0 (DWG) | étude DWG | Lecture DWG (6 à 9 j) | oui |

## Ce qu'on peut prouver maintenant, sans crédit IA (lots suivants, dans l'ordre)

1. **#31 révision BT, niveau 2** : lire le premier relevé réel du cron `lorani-index` (BT01) et une situation révisée
   sur un marché du banc. Requête de lecture au coordinateur.
2. **Le banc « DCE réel » de Luzarches, sans IA** : la DPGF réelle est lue. Il reste à vérifier sous la RLS ce que
   l'écran en montre (postes, lot, unités), et à préparer l'analyse des offres sur cette DPGF : l'estimation est saisie
   à la main, l'offre sera lue au retour du crédit.
3. **#51** : aligner l'écran sur la page (« à vérifier » au lieu de « majeur »). C'est un écran Lorani, pas la page.
4. **#23 sur un vrai projet** : comparer la liste « pièces exigées » des projets du banc au bordereau Cerfa.
5. **#6 UE** : relever et écrire les régions (Supabase, Vercel, modèle). Lecture seule, à confier au coordinateur.
6. **#37** : le bordereau de visa imprimable (PDF), sans IA.

## Au retour du crédit (≈ 0,04 € la page)

- Le CCTP de Luzarches (75 p., ≈ 3 €) fait passer le contrôle CCTP/DPGF sur un vrai DCE (#1, #42).
- Touët (57 p., ≈ 2,3 €) : plans, CCTP et DPGF du même lot. C'est le seul DCE réel avec des planches : #1, #11, #13, #41,
  #57.
- Une vraie offre d'entreprise sur la DPGF de Luzarches : #24 à #27.
