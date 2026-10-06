# Chiffrage Lorani — /secteurs/architectes (B5, 06/10/2026)

Demande de Teo (06/10, 19 h 50 Z) : « estime ce qui reste à construire pour avoir vraiment un truc livrable, et
vérifie toutes les petites promesses ». Relu sur **main c0494b4**, fichier par fichier (`app/secteurs/architectes/page.tsx`,
`components/secteurs/architectes/*.tsx`, `textes.ts`). Les chemins ci-dessous sont relatifs à
`components/secteurs/architectes/` sauf `app/page.tsx` (= `app/secteurs/architectes/page.tsx`). Aucun fichier du site
n'a été touché.

## Synthèse

1. **Promesses : 69 lignes** (66 numérotées, plus 21b et 2 lignes commerciales).
   - A : 1 (zone du PLU et servitudes, relevé réel du 06/10 à 20 h 15 Z)
   - B : 23
   - C : 29
   - D : 13
   - T : 3
2. **Pour tout mettre en B : ≈ 95 jours de travail**, dont ≈ 38 relèvent du lecteur ou d'un ouvrier « dwg ». Le seul métré sur le dessin en pèse 12,5 ; A1 et B5 conseillent de le reformuler plutôt que de le construire.
3. **Pour passer de B à A : ≈ 69 jours en somme brute.** C'est plutôt ≈ 45 jours, parce qu'un même vrai dossier d'agence fait passer plusieurs lignes à la fois. Il faut y ajouter le calendrier d'un vrai permis : 2 à 5 mois jusqu'à la purge.
4. **Tiers et achats de Teo** :
   - modèle de lecture : 0,02 à 0,05 € par planche, 0,1 à 0,3 € par CCTP ou DPGF, 0,3 à 1,5 € par PLUi (chiffres A1) ;
   - région UE à confirmer : Supabase de prod, Vercel, et surtout le fournisseur du modèle de lecture ;
   - 5 DWG et 5 jeux de planches réels d'agence ;
   - un conteneur pour la lecture DWG ;
   - clé Mistral OCR, si on la retient ;
   - compte API INSEE (index BT) ;
   - références DTU (AFNOR/CSTB, payant) et Avis Techniques (CSTB) ;
   - accès partenaires des plateformes ;
   - **Géorisques est injoignable depuis nos hébergeurs** : il est remplacé par les données ouvertes (b5_24, ligne 21b).
5. **Pour servir UNE première agence réelle** en formule Agence :
   - 5 vraies planches lues, puis un dossier client fiable (#1, #4 : 4,5 j, A1) ;
   - les risques par les données ouvertes (#21b : construits, à poser, 0,5 j) ;
   - le rappel J-10, « 8 jours le matin » et « constat → question » (#39, #46, #45 : 3 j) ;
   - la région UE (#6 : 1 j) et le règlement du PLU (#20 : 0,5 j) ;
   - l'audit sur un permis déjà instruit.

   Cela fait **≈ 9,5 jours**, ou 15,5 jours avec « Questions posées au dossier », que la formule Agence promet aussi (#53).
6. **Avis honnête** : le moteur (croisement, règles, permis, chantier) est construit et testé, et la recherche des servitudes depuis l'adresse marche en vrai. Ce qui manque, c'est l'œil, c'est-à-dire la lecture d'une vraie planche. Moins de travail que prévu (≈ 4 j selon A1), mais encore jamais essayée. Deux pans entiers de la page manquent aussi : Analyse des offres, et le fond du Visa. Une première agence peut être servie en ≈ 3 semaines ; la page entière tenue en vrai, c'est ≈ 140 jours-ouvrier.

**À signaler** : à 18 h 28 Z, `omegaai.fr/secteurs/architectes` affiche encore des pastilles « En préparation », y compris sur
des lignes déjà retirées de `lib/en-preparation.ts` (Accessibilité, Cerfa, RE2020, décennales, fonds BET, DOE). Sur main c0494b4,
`components/ui/en-preparation.tsx` ne rend plus rien. **La page servie n'est donc pas c0494b4.**

## Légende

- **État**
  - **A** : prouvé en vrai.
  - **B** : construit et testé sur la recette avec des données fictives (test pgTAP posé vert, nom du test donné).
  - **C** : partiel.
  - **D** : pas construit.
  - **T** : dépend d'un tiers, d'un compte ou d'un achat de Teo.
- **Jours** : `x / y`, où x = de l'état actuel à B et y = de B à A. Une journée = une session ouvrier pleine, posée et recettée.
- **Les tests B5** sont posés et verts sur la recette (rapport du coordinateur, 19 h 05 Z), sauf **b5_14 et la migration b5_23 (4acf771), pas encore posés**. Le lecteur y est « joué » par `tests.b5_lire`, sans lecture réelle.
- **Passer de B à A** demande partout la même chose : un vrai dossier d'agence, lu par le vrai lecteur, dont le résultat est comparé à ce que l'agence ou l'instruction avait relevé.

## Tableau

### Haut de page, garanties, compteurs

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| 1 | « Lorani croise chaque planche avec le cahier des clauses techniques (CCTP), la décomposition des prix (DPGF) et les pièces du permis » | textes.ts:27 ; app/page.tsx:81-83 | C | Moteur : b5_07 (31 assertions : planches entre elles, CCTP contre DPGF, PLU) | Confirmé par A1 (18 h 31 Z) : aucune vraie planche n'a été lue, ni en recette ni en prod. `lorani_planche` suit le contrat mais n'est testé que sur des doubles. PDF natif : page et boîte exactes. PDF de DAO (cotes tracées, pas du texte) : lecture visuelle, boîte estimée. A0/A1 lourds : découpés en morceaux, mais une page dense perd en lisibilité. Le moteur ne croise que des **grandeurs nommées** (hauteurs, reculs, surfaces, places…), pas tout le contenu d'une planche | 1,5 / 2 | 0,02 à 0,05 € par planche ; 0,1 à 0,3 € pour un CCTP ou une DPGF de 30 pages (A1) |
| 2 | « En quelques heures, vous recevez la liste des incohérences » | textes.ts:27 | C | Le passage des lectures tourne toutes les 5 min (cron `lorani_lectures_passage`). Le contrôle se lance seul quand la dernière pièce est lue (b5_07 §9) | Aucun chronométrage sur un dossier réel de 42 planches : le délai dépend du lecteur | 1 / 1 | coût de lecture d'un dossier entier |
| 3 | « Sans BIM » ; « Non. Un jeu de plans en PDF suffit » | textes.ts:28 ; Questions.tsx:38 | B | Le contrat de lecture ne demande que des PDF (CHAMPS-LECTURE-LORANI.md) | — | 0 / 1 | — |
| 4 | « Vos PDF, même scannés » | textes.ts:28 ; Questions.tsx:33 | C | — | Scan : lecture visuelle, boîte estimée (A1). Avec Mistral OCR il n'y a pas de boîte. Prévoir un rendu de la page en tuiles si les cotes sont trop petites | 0,5 / 0,5 | clé Mistral OCR, non posée (T), si on la retient |
| 5 | « Lecture seule » ; « 0 Fichier modifié » ; « Lorani ne modifie aucun fichier » ; « Il lit vos fichiers et n'en écrit aucun » | textes.ts:28,39 ; Produit.tsx:511 ; Questions.tsx:103 | B | Par construction : pièces en lecture, rapport à part (`rapport.ts`). b5_07 §6 : un membre décide, il ne modifie rien | — | 0 / 0,5 | — |
| 6 | « Données hébergées dans l'UE » ; « hébergés dans l'Union européenne et chiffrés pendant leur transfert comme pendant leur conservation. Ils ne servent à entraîner aucun modèle » | textes.ts:28 ; Formules.tsx:511 ; Questions.tsx:108 | T | — | Région du projet Supabase de prod, région des fonctions Vercel, et surtout **où le lecteur envoie les pages** (fournisseur du modèle : région de traitement, clause de non-entraînement). Rien n'est vérifié de mon côté | 0,5 / 0,5 | contrat / région du fournisseur du modèle |
| 7 | « vous pouvez les retirer à tout moment, rapports compris » | Questions.tsx:108 | D | — | Retrait d'un dossier à la demande du client : pièces, valeurs lues, constats et rapports. Il faut une fonction de purge validée par le coordinateur (règle : pas de suppression en clair dans un SQL à poser) | 1,5 / 0,5 | — |
| 8 | « 8 Pièces du permis contrôlées » ; « Permis : PC1 à PC8 et PLU » ; « Pièces PC1 à PC8 et surfaces » | textes.ts:37 ; Formules.tsx:121 ; Fonctionnement.tsx:171 | C | Présence et ordre des pièces : b5_01 (121 assertions), codes PCMI (b5_05). Surfaces et cotes croisées : b5_07, b5_12 | Le **contenu** de PC1 (situation), PC6 (insertion), PC7/PC8 (photos) n'est pas contrôlé : il n'y a pas de cote à lire, il faut un contrôle visuel (échelle, nord, angle de prise de vue) | 3 / 2 | modèle de lecture |
| 9 | « 4 Phases, du permis à la réception » ; « Quatre contrôles suivent la mission, du permis à la réception » | textes.ts:38 ; Fonctionnement.tsx:97 | C | Permis : b5_01, b5_07. Situations : b5_04, b5_05. Visas (dates) : b5_04, b5_06. Réception : b5_10, b5_12 | La phase « Analyse des offres » n'existe pas (#24) ; le Visa ne contrôle pas le fond des fiches (#35) | voir #24, #35 | — |
| 10 | « FR — PLU, PMR, ERP et RE2020 » ; « Accessibilité, ERP et RE2020 » | textes.ts:40 ; Formules.tsx:139 ; Produit.tsx:448 | B | b5_12 §2 : Bbio, Cep, porte 0,83 m, rampe, distance au dégagement, nombre de dégagements (CO 38). b5_07 §3 : PLU, article UB 10 | Seules les règles écrites sont couvertes (une vingtaine), pas tout le code. Les entrées (attestation RE2020, notice) doivent être lues par A1 | 0 / 3 | — |

### Produit (section 01)

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| 11 | « Une cote modifiée à un endroit est retrouvée partout où elle apparaît » | Produit.tsx:418 | B | b5_07 §2 (faîtage 9,85 m sur PC2 contre 10,2 m sur PC5, tolérance 5 cm) ; b5_13 (objets communs entre pièces sœurs) | Uniquement pour les grandeurs du contrat (une vingtaine) | 0 / 2 | — |
| 12 | « Les règles opposables sont citées … règlement du plan local d'urbanisme (PLU), accessibilité, sécurité incendie des établissements recevant du public (ERP) ou RE2020 » | Produit.tsx:446-448 | B | b5_07 §3 (article cité), b5_12 §2 (arrêté du 20 avril 2017, art. 10 ; CO 38) | — | 0 / 1 | — |
| 13 | « Chaque point cite la planche, l'extrait et les deux valeurs lues, puis explique l'écart et propose une correction » ; « Une preuve par point » ; « Chaque point arrive avec sa preuve : la planche, l'extrait, l'article et la correction proposée » | Produit.tsx:478 ; Dossier.tsx:49,584 ; app/page.tsx:83 | B | b5_07 §2 : valeur, pièce, page, boîte, texte, correction chiffrée. `rapport.ts` : PDF annoté avec cadre sur la boîte (recette `rapport-controle.mjs`) | La boîte doit venir du vrai lecteur (#1) | 0 / 1 | — |
| 14 | « Ajouter un projet » ; « Déposer un dossier » ; « Réglages du projet » | Produit.tsx:243 et suiv. | B | b5_01 (dépôt `lorani_deposer_piece`, projet) ; écran /espace/lorani (recette à 5 largeurs) | — | 0 / 0,5 | — |
| 15 | « Régler les contrôles » | Produit.tsx (menu) | C | Les tolérances existent, mais elles sont fixées dans le code (b5_16) | Tolérances et règles activables par projet, dans l'écran | 1 / 0,5 | — |
| 16 | « Choisir qui décide » | Produit.tsx:304 | C | b5_07 §6 : le chef de projet décide (corrigé, accepté, écarté avec motif) | Désigner un autre décideur par projet | 0,5 / 0,5 | — |
| 17 | « Inviter l'équipe » | Produit.tsx:324 | C | Membres de projet (`lorani_membres_projet`, RLS) | Invitation depuis l'écran Lorani (à vérifier si le socle l'offre déjà) | 1 / 0,5 | — |
| 18 | « Suspendre un contrôle » | Produit.tsx:364 | D | — | Statut « suspendu » ; le passage des lectures doit l'ignorer | 0,5 / 0,5 | — |

### Permis et PLU

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| 19 | « Délai d'instruction suivi jusqu'à la purge » ; « Calendrier du permis jusqu'à la purge des recours » ; FAQ « Il suit le délai d'instruction, la demande de pièces complémentaires … la date du permis tacite et la fin du délai de recours des tiers » | Fonctionnement.tsx:229 ; Formules.tsx:175 ; Questions.tsx:63 | B | b5_01 (121 assertions), b5_02 (courriels du guichet), dépôt réel du banc sur la recette (`courrier-reel.mjs`) | Un vrai permis suivi : c'est du calendrier, 2 à 5 mois | 0 / 2 | — |
| 20 | « Règles du PLU citées par article » | Fonctionnement.tsx:211 | B | b5_07 §3 (article UB 10) | La lecture du règlement existe chez A1 (B) : vérifier qu'elle ne rend que la zone du terrain | 0 / 0,5 | 0,3 à 1,5 € pour un PLUi entier (A1) |
| 21 | « PLU, servitudes et risques lus depuis l'adresse » ; FAQ « … les servitudes … et le périmètre des Monuments historiques » | Formules.tsx:157 ; Questions.tsx:58 | **A** (zone et servitudes) | **Relevé réel du coordinateur, 20 h 15 Z** : `lorani_chercher_plu` sur un projet du banc, 3 rue des Hauts-Pavés à Nantes. Résultat : géocodage 200 ; zone UMa du PLUi de Nantes Métropole ; servitude AC1, abords de la salle Saint-Joseph de Bel-Air ; `secteur_protege` = vrai. b5_23 et b5_14 posés, verts | — | 0 / 0 | — (API IGN gratuites) |
| 21b | « … les risques connus (inondation, argile, sismicité) » | Questions.tsx:58 ; Formules.tsx:157 | C → B à la pose | L'API Géorisques n'aboutit jamais depuis nos hébergeurs (relevé du 06/10 à 20 h 15 Z ; BRGM rejette aussi). **Construit le 06/10 (b5_24)** : les risques viennent de trois sources ouvertes chargées en tables, joignables (essai de B5) : GASPAR/DDRM (31 733 communes, argiles = code 127), zonage sismique 2011 (35 346 communes) et radon 2018 (32 771). b5_14 v2 : 13/13 en local sur les doubles du socle. À Nantes : sismicité 3, radon 3, argiles recensées, 9 risques | Poser b5_24, les 15 lots de données (`omega/modules/lorani/donnees/`) et b5_14 v2. GASPAR change chaque semaine : relancer `generer.mjs` (manuel) ; une tâche mensuelle automatique coûterait 1 j de plus. Les argiles sont données à la commune, pas à l'adresse (la carte BRGM fait 623 Mo et son service rejette nos IP) | 0 / 0,5 | — (licence Etalab) |
| 22 | « … lit la zone du PLU **et son règlement** » (sans téléversement) | Questions.tsx:58 | C | b5_17 trouve le document d'urbanisme | Télécharger le règlement depuis le Géoportail et le passer au lecteur, qui sait le lire (A1). Extraire les articles de la zone pour le contrôle | 1,5 / 0,5 | 0,3 à 1,5 € par PLUi (A1) |
| 23 | « … puis en déduit les pièces que le permis exigera » | Questions.tsx:58 | D | `secteur_protege` posé par b5_23 | Table des pièces exigées (R431-5 à R431-34 : secteur protégé, ERP, lotissement, PPR…) branchée sur la liste des pièces du projet | 2 / 1 | — |

### Analyse des offres

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| 24 | « Analyse des offres » ; « Chaque offre est alignée sur la DPGF. Lorani compare les offres reçues ligne par ligne, si bien que les postes non chiffrés ressortent avant l'attribution » ; « Analyse des offres sur DPGF » ; carte métier « Sur quatre offres reçues dans quatre formats, un poste n'est chiffré par aucune entreprise » ; « Le poste 3.4 n'est chiffré que par une entreprise sur trois » | app/page.tsx:105-109 ; Fonctionnement.tsx:119,478 ; Formules.tsx:277 ; Metiers.tsx:108 ; Dossier.tsx:324 | D | — (aucune table d'offre, aucun type de lecture « offre ») | A1 : pas de type « offre » aujourd'hui. La lecture d'Excel et de CSV existe (le tableur est mis en texte). `lorani_dpgf` lit les quantités, pas les prix. Un type `lorani_offre` coûte 1 j → B et +1 j → A, plus 0,5 j au-delà de 500 lignes. Côté B5 : alignement sur la DPGF, tableau comparatif, onglet de l'écran | 5,5 / 3 | 0 à 0,05 € par PDF ; 0,1 à 0,3 € par gros Excel (A1) |
| 25 | « Postes non chiffrés et réserves » | Fonctionnement.tsx:499 | D | — | Fait partie de #24 (réserves et variantes des offres) | 1 / 0,5 | — |
| 26 | « Écarts à l'estimation par ligne » | Fonctionnement.tsx:518 | D | — | Estimation de l'architecte (DPGF chiffrée) comparée offre par offre | 1 / 0,5 | — |
| 27 | « Rapport d'analyse prêt à signer » | Fonctionnement.tsx:536 | D | — | Rapport PDF et Excel (on peut reprendre le moteur de `rapport.ts`) | 1,5 / 0,5 | — |
| 28 | « Métré des plans contre les quantités » ; « Métré des plans contre la DPGF » ; FAQ « Il mesure les surfaces et les longueurs sur les plans, puis les compare aux quantités de la DPGF » ; « Le plan donne 412 m² de cloisons, la DPGF en prévoit 360 » | Fonctionnement.tsx:554,1363 ; Formules.tsx:367 ; Questions.tsx:73 | C | b5_07 §10 : quantité mesurée contre DPGF, seuil 5 %, majeur | **La phrase promet une mesure sur le dessin.** Le lecteur lit les cotes écrites, il ne mesure pas. A1 : une mesure facturable n'est faisable que par la géométrie vectorielle du PDF ou du DWG (tracés, échelle du cartouche, pièces, linéaires). Il faut 10 à 15 j pour une première version, sans garantie sur des plans réels. **A1 et B5 conseillent de ne pas le promettre** tant que ce n'est pas fait : reformuler en « métré déposé ou cotes écrites contre la DPGF », ce qui est en B (b5_07 §10) | 12,5 / 5 | — |
| 29 | « Décennales contrôlées contre le lot » ; FAQ « Lorani lit chaque attestation décennale et vérifie que les activités couvertes correspondent au lot attribué, ainsi que les dates et le plafond … le registre en garde la date » | Fonctionnement.tsx:572 ; Formules.tsx:385 ; Questions.tsx:78 | B | b5_09 (18 assertions : activité, plafond contre marché, période d'ouverture du chantier, échéance au registre, rappels) | Lecture de vraies attestations (SMABTP, MAAF, AXA…) : 0,5 j côté A1 | 0 / 1 | ≈ 0,015 € par attestation (A1) |

### Situations de travaux

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| 30 | « Chaque situation est contrôlée. Lorani compare la situation reçue au marché, à la précédente et au compte rendu de chantier, puis chiffre l'écart » ; « Situations et décomptes » ; « Les situations sont suivies » | Fonctionnement.tsx:780 ; Formules.tsx:313 ; FileDesPoints.tsx:62 | C | b5_04 (marché, précédente, cumul qui recule ou dépasse), b5_05 (situation lue) | La comparaison **au compte rendu de chantier** n'est pas faite | 1,5 / 1 | — |
| 31 | « Marché, avenants et révision BT » | Fonctionnement.tsx:802 | C | Marché et avenants : b5_04 | Révision par les index BT (formule du CCAP, index INSEE BT01…) | 2 / 1 | compte API INSEE (gratuit) |
| 32 | « Avancement déclaré contre constaté » ; carte « Une situation facture 62 % d'avancement alors que le chantier en est à 55 % » | Fonctionnement.tsx:823 ; Metiers.tsx:154 | D | L'avancement déclaré est calculé (b5_13) | Un avancement constaté saisi au compte rendu par lot, puis comparé à la situation | 1,5 / 0,5 | — |
| 33 | « Retenue, avance et pénalités recalculées » ; « La retenue de garantie n'est pas déduite du cumul » | Fonctionnement.tsx:842 ; Dossier.tsx:350 | C | Retenue plafonnée à 5 % : b5_04 §1 | Avance (remboursement), pénalités de retard, contrôle de la déduction de la retenue | 1,5 / 0,5 | — |
| 34 | « Ordres de service : montant et délai » ; FAQ « calcule l'incidence de chaque ordre de service sur le montant et le délai » | Fonctionnement.tsx:861 ; Formules.tsx:403 ; Questions.tsx:83 | B | b5_10 §2-4 (montant, jours, fin contractuelle, arrêt, R2194-8) | — | 0 / 0,5 | — |

### Visa des documents

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| 35 | « Chaque fiche technique est confrontée au CCTP. Lorani vérifie le classement au feu, l'Avis Technique et les PV d'essai de chaque document d'exécution » ; « Classement au feu et Avis Technique » ; « Le PV fourni classe la porte EI 30 ; le CCTP demande EI 60 » ; carte métier EI 30 / EI 60 | Fonctionnement.tsx:1081,1104,1433 ; Dossier.tsx:402 ; Metiers.tsx:200 | D | — | Lecture des fiches techniques et des PV (A1) ; exigences du CCTP par article ; comparaison ; validité de l'Avis Technique | 6 / 3 | base des Avis Techniques CSTB (pas d'API ouverte connue) |
| 36 | « Notes de calcul et PV d'essais » | Fonctionnement.tsx:1145 | D | — | Fait partie de #35 (présence et cohérence, pas de recalcul de structure) | 1 / 1 | — |
| 37 | « Bordereau VSO · VAO · refus » ; « Visa des fiches techniques » ; « prépare le bordereau de visa avec les observations en regard » | Fonctionnement.tsx:1125 ; Formules.tsx:295 | C | Statuts du visa (sans observation, avec observations, refus motivé) : b5_04 §4 | Bordereau imprimable, avec les observations en regard | 1 / 0,5 | — |
| 38 | « Date butoir calée sur la commande » ; « Visas calés sur les délais de commande » ; « La date butoir de chaque visa est calée sur le délai de commande de l'ouvrage » | Fonctionnement.tsx:1165 ; Formules.tsx:331 ; FileDesPoints.tsx:70 | B | b5_04 §4 (veille ouvrée de la commande), b5_06 (échéance au registre, rappels, retard) | — | 0 / 0,5 | — |
| 39 | « la fiche des menuiseries à dix semaines est signalée à J-10 » ; « doit être visée avant le 12 pour tenir la commande » (J-10) | Questions.tsx:68 ; Fonctionnement.tsx:1335 | C | Rappels J-3, J-1, J (b5_06) | Ajouter un rappel J-10 | 0,25 / 0,25 | — |
| 40 | « Registre daté des visas » | Formules.tsx:688 | B | b5_06 + journal opposable | — | 0 / 0,5 | — |

### Fonctionnalités, questions et indices

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| 41 | « Toutes les planches sont relues … aucune n'est lue seule » ; « Aucune planche n'est lue seule » ; « Toutes les pièces du dossier sont lues et croisées » ; « Indice C reçu ce matin : 42 planches, toutes relues avant l'envoi au client » | FileDesPoints.tsx:49-50,135 ; Fonctionnement.tsx:148 ; textes.ts:33 | C | b5_07, b5_13 | Comme #1 : une planche réelle de 42 n'est pas encore lue de bout en bout | voir #1 | — |
| 42 | « Chaque type de pièce a sa lecture … Lorani applique à chacun sa propre lecture » | FileDesPoints.tsx:55-57 | C | Contrat : planche, CCTP, DPGF, règlement, métré, attestation, Cerfa, RE2020, plan BET, notice, situation | Pas de lecture « offre » (#24) ni « fiche technique » (#35) | voir #24, #35 | — |
| 43 | « Une alerte dès la réception … Chaque situation, indice ou offre est lu dès sa réception, et l'écart est signalé le jour même » | FileDesPoints.tsx:68-70 | C | Passage toutes les 5 min ; alertes des situations (b5_04 §3) et du contrôle (b5_07 §5) | Les offres (#24) | voir #24 | — |
| 44 | « Une question suivie jusqu'à la réponse » ; « Questions suivies jusqu'à la réponse » | FileDesPoints.tsx:75 ; Formules.tsx:349 | B | b5_11 (relances du socle, réponse, soldée au compte rendu suivant) | — | 0 / 0,5 | — |
| 45 | « Chaque point part en question à l'entreprise ou au BET, avec l'extrait joint » ; « Transformer en question au BET » ; « Une question en un clic » | FileDesPoints.tsx:77 ; Dossier.tsx:532 ; Formules.tsx:439 | C | Les questions existent (b5_11) | Un bouton « en faire une question » sur le constat, avec l'extrait (page et boîte) joint | 1 / 0,5 | — |
| 46 | « la question qui attend depuis huit jours remonte le matin » ; « celle qui attend une réponse depuis plus de huit jours remonte le matin » ; « La question sur la trémie du R+1 attend une réponse depuis neuf jours » | FileDesPoints.tsx:77 ; Questions.tsx:68 ; Fonctionnement.tsx:1349 | C | Rappels J-2 et J (b5_11) | Seuil de 8 jours et remontée au point du matin du socle | 0,5 / 0,5 | — |
| 47 | « Un point écarté ne revient pas à l'indice suivant » | Questions.tsx:43 | B | b5_07 §7 (poste écarté reconduit écarté) | — | 0 / 0,5 | — |
| 48 | « Indices suivis. Quand un indice change, seuls les écarts nouveaux remontent » ; « Revérification à chaque indice » | Dossier.tsx:631-633 ; Formules.tsx:421 | B | b5_07 §7 (indice B : ouverts, corrigés, reconduits) | — | 0 / 1 | — |
| 49 | « Lorani compare le nouvel indice au précédent, **y compris les changements non signalés** » ; « L'indice D déplace la trémie de 60 cm sans avis » | Questions.tsx:98 ; Dossier.tsx:454 | C | Les constats sont comparés d'un indice à l'autre | Comparer toutes les valeurs lues d'un indice à l'autre, même sans constat, et lister les changements non déclarés au cartouche | 1,5 / 1 | — |
| 50 | « Historique des indices sans limite » | Formules.tsx:706 | B | Chaque contrôle est gardé et relié au précédent (b5_07 §7), sans purge | Aucun code. Le coût de stockage grandit avec les dossiers | 0 / 0,5 | stockage Supabase |
| 51 | « Les points sont classés en bloquant, à vérifier ou mineur, et ce qui met le permis ou le marché en défaut passe en tête » | Dossier.tsx:606-608 | B | Gravité bloquant, majeur, mineur, triée (b5_16, Controle.tsx) | Le libellé de l'écran dit « majeur » là où la page dit « à vérifier » : à aligner dans l'écran | 0,1 / 0 | — |
| 52 | « Vos règles internes. Les listes de contrôle et la charte graphique de l'agence s'ajoutent » ; « Checklists de l'agence » ; « Vos propres checklists s'y ajoutent » ; « Contrôles définis avec vous » ; « Règles de votre charte intégrées » | Dossier.tsx:653-655 ; Formules.tsx:457,759,813 ; Questions.tsx:53 | C | Point d'extension `private.lorani_constats_supplementaires` (b5_16b) | Éditeur de listes de contrôle par agence (5 j). La charte graphique (cartouche, calques, polices) demande une lecture visuelle (4 j) | 9 / 3 | modèle de lecture |
| 53 | « Questions posées au dossier » (poser une question en langue naturelle sur tout le dossier) | Formules.tsx:229 | D | — | Recherche dans le texte et les valeurs lues, réponse citée (pièce et page) | 4 / 2 | modèle (€ par question) |
| 54 | « La porte P12 figure au tableau des menuiseries, mais pas au plan du R+1 » ; « Nomenclatures » lues | Dossier.tsx:298 ; Fonctionnement.tsx:1377 | D | — | Lecture des nomenclatures (tableaux) et des repères posés sur les plans, puis comparaison des deux listes | 3 / 2 | modèle de lecture |
| 55 | « L'article cite une version du DTU qui n'est plus en vigueur » ; « les DTU et le CCAG-Travaux » | Dossier.tsx:428 ; Questions.tsx:53 | C | CCAG-Travaux cité (b5_04 : art. 12.2.2, art. 29) | Liste des NF DTU en vigueur, avec leur date, et contrôle des références du CCTP | 2 / 1 | accès AFNOR/CSTB aux références DTU (payant) |
| 56 | « la sécurité incendie des ERP **et de l'habitation** » | Questions.tsx:53 | C | ERP : b5_12 §2 | Règles habitation (arrêté du 31 janvier 1986 : familles, dégagements) | 2 / 1 | — |

### Dossier, réception, chantier, honoraires

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| 57 | « Plans croisés, rapport PDF annoté » ; « Le rapport, en PDF annoté et en Excel » | Formules.tsx:103 ; Questions.tsx:103 | B | `rapport.ts` (PDF annoté avec cadres sur les pages citées, .xlsx à deux feuilles), recette `rapport-controle.mjs` | La pastille reste dans `lib/en-preparation.ts` : elle peut tomber une fois la lecture réelle (#1) faite | 0 / 1 | — |
| 58 | « Export Excel par lot » | Formules.tsx:475 | C | Excel par contrôle (`rapport.ts`) | Feuille ou fichier par lot | 1 / 0,5 | — |
| 59 | « Surfaces recalculées contre le Cerfa » ; « RE2020 : attestation comparée aux plans » ; « Fonds de plan BET croisés » | Formules.tsx:193,211,580 | B | b5_12 §2 (Cerfa contre PC4, Bbio et Cep, couloir BET contre PC4) | Lecture réelle du Cerfa, de l'attestation RE2020 et du plan BET (A1) | 0 / 2 | — |
| 60 | « Complétude du DOE à la réception » | Formules.tsx:598 | B | b5_12 §4 (liste type, « sans objet » motivé, alerte « DOE incomplet ») | — | 0 / 0,5 | — |
| 61 | « Comptes rendus de chantier rédigés » ; FAQ « Il rédige le compte rendu de chantier à partir de vos notes et photos de visite » | Formules.tsx:616 ; Questions.tsx:83 | C | b5_11 (compte rendu tiré des notes, figé à la diffusion) | **Photos de visite** jointes au compte rendu et dans son PDF ; la rédaction se limite aux notes nettoyées, pas à une mise en forme rédigée par un modèle | 2 / 1 | modèle (rédaction) |
| 62 | « Réserves suivies jusqu'à la fin de la GPA » ; « suit chaque réserve jusqu'à sa levée et la fin de la garantie de parfait achèvement » | Formules.tsx:634 ; Questions.tsx:83 | B | b5_10 §5-7 | — | 0 / 0,5 | — |
| 63 | « Honoraires par phase contre temps passé » ; FAQ « le temps passé est rapporté aux honoraires de chaque élément de mission … Une phase qui consomme plus que prévu remonte » | Formules.tsx:652 ; Questions.tsx:88 | B | b5_03 (24 assertions : alertes à 80 % et en dépassement, tableau de bord) | La pastille peut tomber (le code est là depuis b5_12) | 0 / 1 | — |
| 64 | « Dossier de défense décennale » ; « Vous gardez un dossier daté, exportable en une fois : chaque point signalé, chaque visa rendu et chaque refus » ; « Chaque contrôle est daté et conservé » | Formules.tsx:670 ; Questions.tsx:93,48 | C | Journal opposable, contrôles datés, rapport par contrôle | Export unique (archive : rapports, visas, refus, journal) | 2,5 / 1 | — |
| 65 | « Bureaux d'études invités » | Formules.tsx:562 | C | Intervenants BET (`lorani_intervenants`) | Compte BET invité sur un projet, avec droits restreints (répondre, déposer ses fonds de plan) | 2 / 1 | — |

### Formats, logiciels, offre commerciale

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| 66 | « Les plans de vos logiciels, lus en PDF ou en DWG » (AutoCAD, Revit, Archicad, SketchUp, Allplan, Vectorworks, BricsCAD, Rhino) ; FAQ « … en PDF, même scannés, ou en DWG ; CCTP, DPGF et offres des entreprises en Excel ou en PDF » | Metiers.tsx:428 ; Questions.tsx:33 | D | Étude DWG faite (ETUDE-DWG.md, essai LibreDWG sur 3 formats) ; DPGF lue (contrat) | DWG, chiffré avec A1 : ½ j de dépôt + 3 à 4 j de lecture serveur + 1 à 2 j de recalage PDF↔DWG + 1 à 2 j d'infrastructure, soit 6 à 9 j. LibreDWG ne tient pas dans une fonction Edge sur de gros fichiers : il faut un petit conteneur à part. A1 préfère un ouvrier « dwg » dédié, qui rende les mesures au format `mesure.<grandeur>.<objet>`. Excel des offres : voir #24 | 7,5 / 2 | **5 vrais DWG d'agence** (Teo) ; hébergement d'un conteneur (T) ; GPL côté serveur seulement |
| — | « Utilisateurs sans supplément » ; « Accès sans limite d'équipe » ; « Sur audit » ; « Jugez Lorani sur un permis déjà instruit » ; « L'audit se fait sur un permis déjà instruit » | Formules.tsx:493,795,78 ; textes.ts:44 ; Questions.tsx:113 | T | Engagement commercial, aucun code | Teo fixe le prix et mène l'audit, qui n'est crédible qu'avec #1 en A | 0 / 0 | temps de Teo |
| — | « Import depuis vos plateformes de projet » | Formules.tsx:777 | T | — | Connecteurs (Kroqi, Autodesk Docs, Trimble Connect…) : ≈ 3 j par plateforme | 6 / 3 | accès partenaire et API des plateformes |

Les exemples des maquettes sont des illustrations, mais chacun se rattache à une ligne :

**Géorisques injoignable : ce qui est construit (b5_24, ligne 21b)**

| Donnée | Source ouverte, joignable | Lignes chargées | Mise à jour |
|---|---|---|---|
| Risques par commune ; argiles par le code 127 « tassements différentiels » | GASPAR/DDRM, https://files.georisques.fr/GASPAR/gaspar.zip | 31 733 communes, 49 libellés | chaque semaine à la source ; on relance `generer.mjs` |
| Sismicité | « Zonage sismique de la France » (data.gouv.fr), décret 2010-1255 | 35 346 communes | aucune (zonage inchangé depuis 2011) |
| Radon | ASN, « Connaître le potentiel radon de ma commune » (data.gouv.fr), arrêté du 27 juin 2018 | 32 771 communes, arrondissements compris | aucune |

Ce qui n'est pas couvert :
- **L'API Géorisques et geoservices.brgm.fr rejettent les IP de cloud.**
- **Les argiles sont donc données à la commune**, pas à l'adresse : la carte d'aléa BRGM est un fichier de 623 Mo, et son service est filtré.
- **Une commune nouvelle**, créée après 2011 (sismicité) ou après 2018 (radon), est signalée comme absente des référentiels plutôt que devinée.

| Exemple | Où | Ligne |
|---|---|---|
| Cote de recul 4,80 m contre 5,20 m | Dossier.tsx:490 | #11 (B) |
| RDC contre façade sud | — | cote altimétrique, #11 (B) |
| PC4 annonce deux places PMR, le plan de masse en montre une | — | grandeur `stationnement_nb`, B si lu |
| Écart de 31 % sur le poste 4 | — | #26 (D) |
| Cartes « Agence de 6 / 12 / 3 personnes, Groupement » | — | #1, #24, #32, #35 |

**Hors B5** : la carte « Se combine avec — CASHD : Les honoraires de chaque phase suivis et relancés à l'échéance » relève de CASHD.

## Totaux (recomptés depuis le tableau)

**Par état** (69 lignes) :

| État | Lignes |
|---|---|
| A | 1 |
| B | 23 |
| C | 29 |
| D | 13 |
| T | 3 |

**Jours par section** :

| Section | Lignes | Vers B | De B vers A |
|---|---|---|---|
| Haut de page, garanties, compteurs | 10 | 8 | 11 |
| Produit | 8 | 3 | 6,5 |
| Permis et PLU | 6 | 3,5 | 4,5 |
| Analyse des offres (avec métré et décennales) | 6 | 21,5 | 10,5 |
| Situations de travaux | 5 | 6,5 | 3,5 |
| Visa des documents | 6 | 8,25 | 5,75 |
| Fonctionnalités, questions et indices | 16 | 23,1 | 13,5 |
| Dossier, réception, chantier, honoraires | 9 | 7,5 | 8,5 |
| Formats, logiciels, offre commerciale (DWG, imports) | 3 | 13,5 | 5 |
| **Total** | **69** | **≈ 95** | **≈ 69** (≈ 45 avec les recouvrements) |

Les lignes « voir #… » ne sont pas comptées deux fois. Sans le métré sur le dessin, s'il est reformulé : ≈ 82 / 64.

**Estimations du lecteur** : les lignes #1, #4, #20, #22, #24, #28, #29 et #66 portent les chiffres **confirmés par A1**
(messages de 18 h 29 à 18 h 31 Z ; détail dans omega/CHIFFRAGE/lecteur.md, worker-a1 e0932e3). Ce sont des jours de lecteur seul, hors attente des fichiers.
Pour #8, #35, #52 et #54 (contrôle visuel des PC, fiches techniques, charte, nomenclatures), A1 n'a rien chiffré : ce sont les chiffres de B5.

**Recherche PLU sans écran ouvert** (remarque du coordinateur, 20 h 15 Z) : `private.lorani_lectures_passage` fait déjà avancer les
recherches en cours (b5_17 l. 438 ; b5_23 l. 342 : `statut in ('geocodage', 'zonage') or complements_statut = 'en_cours'`).
Si une recherche reste en « geocodage » plus de 5 minutes sur la recette, c'est que la tâche cron du passage n'y tourne pas.
