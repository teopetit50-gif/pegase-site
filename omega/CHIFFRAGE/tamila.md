# Chiffrage Tamila — /secteurs/avocats (session B4, 06/10/2026, demande de Teo)

Lu sur main **c0494b4** (vitrine de 15 h 55), sans rien y modifier. Toutes les phrases visibles de la page :
`components/secteurs/avocats/textes.ts` (presque tout le texte), `app/secteurs/avocats/page.tsx` (description),
`components/secteurs/avocats/ApercuDossier.tsx` et `Illustrations.tsx` (illustrations étiquetées « exemple », qui
promettent quand même une fonction).

États : **A** prouvé en vrai (un vrai cabinet, de vraies pièces) · **B** construit et testé sur la recette avec des
données fictives (test cité) · **C** partiel · **D** pas construit · **T** dépend d'un tiers, d'un compte ou d'un
achat de Teo. Jours : ouvrier comme moi, « → B » puis « B → A », honnêtes. Les lignes marquées *(A1)* portent sur
la lecture IA des pièces : jours du lecteur donnés par A1 (omega/CHIFFRAGE/lecteur.md, worker-a1 e0932e3), auxquels
j'ajoute la part écran et porte (B4). Coûts d'A1 : avis RPVA ≈ 0,015 € ; page scannée 0,02-0,03 € ; lecture longue
1 à 5 € par dossier courant (plafond 15 €) ; nouveau type 0,5 à 3 € par dossier. Aucune qualité n'est encore mesurée
sur de vrais documents Tamila.

## Synthèse

1. **63 promesses**, classées sur leur état principal : A **0** · B **10** · C **26** · D **18** · T **9**. Rien n'est prouvé en vrai : aucun cabinet réel, aucune vraie pièce lue de bout en bout, aucune qualité mesurée sur de vrais documents.
2. **Pour tout amener en B : ≈ 74 jours**, dont ≈ 41,5 de lecture IA (jours du lecteur d'A1 + écrans B4), ≈ 24 de gestion et d'écran, ≈ 8,5 d'infrastructure (hébergeur français, lecture en UE).
3. **Pour tout amener ensuite en A : ≈ 54 jours de plus**, avec un cabinet pilote et ses vraies pièces.
4. **Tiers et achats** :
   - hébergeur français pour la base et les fichiers (aujourd'hui Supabase, région à confirmer) ;
   - un compte AWS avec Bedrock en UE (eu-central-1), pour une lecture en Europe sans conservation : le lecteur sait déjà y passer (A1) ;
   - **hébergeur HDS** pour les pièces médicales du dommage corporel, à faire trancher par un juriste ;
   - Scaleway Key Manager activé (décision de Teo en attente) ;
   - en option, une clé Mistral OCR ;
   - contrat et DPA (art. 28 RGPD) rédigés par un avocat.
5. **Pour un premier cabinet réel : ≈ 8,5 jours d'ouvrier**, plus les tiers ci-dessus. Il faut :
   - activer le coffre et faire tourner la pré-lecture (chronologie, contradictions, bordereau) sur un vrai dossier, avec un essai fictif à grande échelle d'abord (lignes 3-5, ≈ 2,5 j) ;
   - écrire l'ouvrier d'export du dossier, absent aujourd'hui (3 j) ;
   - effacer le dossier de faits à la clôture (1 j) ;
   - compléter le point du matin (forfaits, sans diligence : 1,5 j) ;
   - basculer la lecture sur Bedrock UE (0,5 j) ;
   - rendre vraie la mention d'hébergement en France, ou reformuler la page.
   Honoraires, délais et pilotage sont en B et peuvent servir.
6. **Avis** : la gestion de cabinet (délais, honoraires, point du matin, pilotage, secret) est presque livrable. La « pré-lecture » qui fait le titre de la page n'est livrable que sur sa base (chronologie, contradictions, bordereau), et elle n'a encore jamais tourné sur une vraie pièce. Plus de la moitié de sa liste reste à construire. Trois mentions de souveraineté sont aujourd'hui fausses : hébergeur français, lecture en Europe, contrat.

## 1. Le haut de page (HERO) et la description

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours → B / B → A | Coût externe |
|---|---|---|---|---|---|---|---|
| 1 | « Tamila suit désormais vos délais d'appel » | textes.ts:37 | B | tests b4 05/06/10, rejoué en base réelle sur le banc (§ 8 de NOTES-B4 : délai art. 908 + 915-4 posé, confirmé) | un vrai cabinet | 0 / 2 | — |
| 2 | « Tamila la rapproche de vos faits dès son arrivée et vous signale ce qu'elle change » | textes.ts:41 | D | — | analyse incrémentale à l'arrivée d'une pièce (diff contre le dossier de faits), alerte *(A1)* | 3 / 1,5 | coût IA par pièce |
| 3 | « une chronologie dont chaque fait renvoie à sa pièce » | textes.ts:41 | C | lecteur `tamila.chronologie` (A1), porte b4_15 + test 24, écran 7ec04ec (recette exemple 181/181) | jamais tourné sur une vraie pièce (pas de dossier au coffre sur la recette) | 1 / 1,5 | Scaleway KM, IA |
| 4 | « des contradictions relevées entre pièces » | textes.ts:41 | C | type `tamila.contradictions` (A1), même chaîne | idem | (compté en 3) | IA |
| 5 | « un bordereau rapproché de vos conclusions » | textes.ts:41 | C | type `tamila.bordereau` (numérotation) | le rapprochement avec les conclusions (pièces invoquées ↔ bordereau) *(A1)* | 1,5 / 0,5 | IA |
| 6 | « Tamila lit toutes les pièces d'un dossier et rend la chronologie, les contradictions et le bordereau contrôlé, chaque fait renvoyé à sa page » | page.tsx:79 | C | idem 3-5 | plafond 200 pièces / 3 000 pages, pas éprouvé sur un vrai dossier | (compté en 3-5) | IA |
| 7 | Illustration : conclusions annotées en marge, « un passage conforme au bail, un passage contredit par un constat » | ApercuDossier.tsx:130 | D | — | lecture des conclusions du cabinet face au dossier de faits, rendu en marge *(A1 + B4)* | 3 / 1,5 | IA |
| 8 | Illustration : « Notification : pièce adverse n° 23 reçue aujourd'hui à 10 h 25 » | Illustrations.tsx:63 | C | avis par courriel b4_10 (test 19, recette 181/181) | notification à l'arrivée d'une pièce adverse (pas seulement d'un avis RPVA) | 1 / 1 | — |

## 2. Les pièces lues et les fonctionnalités

| # | Promesse | Où | État | Preuve | Ce qui manque | Jours → B / B → A | Coût externe |
|---|---|---|---|---|---|---|---|
| 9 | « Chaque pièce est lue, même manuscrite » | textes.ts:47-48 | B | lecture visuelle par le modèle, y compris une pièce chiffrée déchiffrée en mémoire (A1) ; Mistral OCR en option (T, clé non posée) | qualité sur le manuscrit non mesurée *(A1)* | 0 / 1 | OCR (Mistral) |
| 10 | Familles lues : Conclusions, Bordereaux, Pièces adverses, Expertises, Pré-rapports, Constats, Courriels, Avis RPVA, Scans | textes.ts:50 | B | avis RPVA : CHAMPS-LECTURE + passerelle b4_08 (test 17) ; courriels : b4_10 | lecture éprouvée de chaque famille sur de vraies pièces *(A1)* | 0 / 1 | OCR |
| 11 | « Tamila reconstitue les faits à partir de chaque pièce, même scannée, et renvoie chacun d'eux à la page qui le fonde » | textes.ts:57 | C | = 3 | = 3 + 9 | (compté) | — |
| 12 | Carte « Pièces adverses du jour » | textes.ts:59 | D | — | = 2 | (compté en 2) | — |
| 13 | Carte « Chronologie sourcée » | textes.ts:60 | C | = 3 | = 3 | (compté) | — |
| 14 | Carte « Bordereau contrôlé : chaque prétention est rapprochée des pièces invoquées et de leur numérotation » | textes.ts:61 | C | = 5 | rapprochement prétention ↔ pièces *(A1)* | (compté en 5) | — |
| 15 | Carte « Contradictions relevées : … présente côte à côte et vous laisse trancher » | textes.ts:62 | C | = 4 ; écran : citations A et B | la vue côte à côte et la décision de l'avocat gardée | 1 / 1 | — |
| 16 | « L'éditeur est français, et vos pièces sont chiffrées sur votre poste avant d'être conservées dans l'UE » | textes.ts:63 | B/T | chiffrement navigateur AES-GCM par dossier (tests 02, 13 ; base réelle § 8) | région UE du stockage à confirmer (Supabase) | 0 / 1 | — |

## 3. Le point du matin et le cabinet

| # | Promesse | Où | État | Preuve | Ce qui manque | Jours → B / B → A | Coût externe |
|---|---|---|---|---|---|---|---|
| 17 | « Chaque matin à 7 h, avant votre première audience, un courriel réunit les délais de procédure de la semaine, les pièces que le cabinet attend encore, les forfaits dépassés et les dossiers sans diligence, chacun avec l'action à engager » | textes.ts:70 | C | b4_14 + test 23 vert sur la recette (délais, audiences, avis, expertise) ; envoi par le socle | les lignes « forfaits dépassés » et « sans diligence » dans la section ; l'heure de 7 h et le courriel vérifiés de bout en bout | 1 / 1 | expéditeur (déjà au socle) |
| 18 | Carte « Forfaits dépassés : le temps passé est rapporté à la convention d'honoraires » | textes.ts:73-74 | B | b4_06 + b4_12, tests 15 et 21, carte Honoraires (jauge), recette | un vrai cabinet | 0 / 1 | — |
| 19 | Carte « Sans diligence : aucun acte depuis trente jours » | textes.ts:85-86 | C | pilotage « Sans diligence » (0c0714d), seuil codé à **45** jours | aligner sur 30 jours ou rendre réglable | 0,5 / 1 | — |
| 20 | Carte « Délais de procédure : lus dans les avis RPVA et classés du plus proche au plus lointain » | textes.ts:97-98 | C | classement B ; lecture de l'avis : passerelle b4_08 + lecteur (A1), saisie et avis par courriel B | lecture d'un vrai avis chiffré au coffre jamais faite | 1 / 2 | Scaleway KM |
| 21 | Carte « Ce que le cabinet attend : des pièces du client, des pré-rapports de l'expert et des pièces citées par le confrère » | textes.ts:109-110 | C | expert : b4_16 + test 25, pilotage ; client : convention, pièce d'identité | demandes de pièces au client (liste, relance) ; pièces citées par le confrère (lecture de ses conclusions, *A1*) | 2,5 / 1,5 | IA |

## 4. Les outils du cabinet (CONNEXIONS)

| # | Promesse | Où | État | Preuve | Ce qui manque | Jours → B / B → A | Coût externe |
|---|---|---|---|---|---|---|---|
| 22 | « Vos outils restent en place » : Messagerie | textes.ts:125-127 | C | transfert des avis vers recu.omegaai.fr (b4_10) | lecture d'une boîte (connecteur Gmail ou Microsoft, A2) | 3 / 2 | — |
| 23 | Agenda | textes.ts:127 | D | — | audiences vers l'agenda du cabinet (ICS ou connecteur) | 2 / 1 | — |
| 24 | Dossiers partagés | textes.ts:127 | D | — | import depuis un dossier partagé (Drive, SharePoint) | 3 / 2 | — |
| 25 | Logiciel métier | textes.ts:127 | T | — | import depuis Secib, Jarvis, etc. : aucun accès aujourd'hui | 5 / 3 | partenariat éditeur |
| 26 | Pièces scannées | textes.ts:127 | C | = 9 | = 9 | (compté) | OCR |
| 27 | Exports | textes.ts:127 | C | export demandé et tracé (porte socle) ; factures et lectures en Word et PDF (B) | **l'ouvrier `tamila.exporter` n'existe pas** : l'archive du dossier n'est jamais produite | 3 / 1 | — |

## 5. Le secret professionnel (SECRET)

| # | Promesse | Où | État | Preuve | Ce qui manque | Jours → B / B → A | Coût externe |
|---|---|---|---|---|---|---|---|
| 28 | « Tamila les chiffre sur votre poste » | textes.ts:136 | B | = 16 | — | 0 / 1 | — |
| 29 | « les conserve dans l'Union européenne » | textes.ts:136 | T | — | région du projet Supabase à confirmer, ou migration | 0 / 0 | hébergeur |
| 30 | « et les lit en Europe, sans rien en conserver » | textes.ts:136 | T | **faux aujourd'hui** : API Anthropic directe, ni hébergement UE garanti ni « zero data retention » signé (A1) | le lecteur sait déjà passer par Bedrock UE (eu-central-1) : retirer la clé Anthropic, poser les identifiants AWS, vérifier (A1) | 0,5 / 0,5 | compte AWS Bedrock UE |
| 31 | « Chacun de nos engagements figure dans le contrat que vous signez » | textes.ts:136 | D/T | — | le contrat et ses clauses | 0 / 0 | avocat rédacteur |
| 32 | Badge « Français, hébergé dans l'UE » | textes.ts:137 | T | = 29 | = 29 | (compté) | — |
| 33 | « Le contrat précise les dossiers que Tamila lit, le lieu où les pièces sont conservées et la date de leur effacement » | textes.ts:138 | D/T | — | = 31 | (compté) | avocat |
| 34 | Fait « Éditeur : France » | textes.ts:140 | T | — | société éditrice française (Teo) | 0 / 0 | — |
| 35 | Fait « Droit applicable : Français » | textes.ts:141 | T | — | = 31 | 0 / 0 | — |
| 36 | Fait « Hébergement : France, hébergeur français » | textes.ts:142 | T | — | **faux aujourd'hui** (Supabase) : migration de la base et des fichiers chez un hébergeur français, ou reformuler | 8 / 3 | hébergeur FR (Scaleway, OVHcloud…) |
| 37 | Fait « Lecture des pièces : en Europe, sans conservation » | textes.ts:143 | T | = 30 | = 30 | (compté) | — |
| 38 | Fait « Statut : sous-traitant, art. 28 RGPD » | textes.ts:144 | D/T | — | DPA art. 28 | 0 / 0 | avocat |
| 39 | « Tamila ne lit que les dossiers que vous lui ouvrez, un par un, et ne parcourt jamais votre messagerie de lui-même » | textes.ts:147 | B | analyses à la demande par dossier (b4_15, test 24) ; avis par transfert seulement | — | 0 / 1 | — |
| 40 | « Vos pièces ne servent à entraîner aucun modèle … Cette exclusion est une clause du contrat » | textes.ts:148 | C/T | conditions API du fournisseur | la clause ; vérifier les conditions du fournisseur retenu | 0 / 0 | avocat |
| 41 | « Lorsque vous clôturez un dossier, ses pièces et son dossier de faits sont effacés. Vous conservez l'export que vous avez téléchargé » | textes.ts:149 | C | b4_11 + test 20, tamila-purge v2 déployé (fichiers, archives, clés) | `analyses` (le dossier de faits) n'est pas dans la liste d'effacement du dossier ; l'export (= 27) | 1 / 1 | — |
| 42 | « Les pièces sont chiffrées pendant leur transfert et pendant leur conservation. Elles sont conservées en France. Leur lecture se fait dans l'Union européenne, et aucune copie n'y est gardée » | textes.ts:150 | T | chiffrement : B | = 36 et 30 | (compté) | — |
| 43 | « Le journal indique qui a consulté quel dossier, et à quelle date. Vous pouvez l'exporter à tout moment » | textes.ts:151 | C | b4_02 (test 12), carte Journal des accès, base réelle § 8 | bouton d'export du journal (CSV) | 0,5 / 0,5 | — |
| 44 | « Tamila dispose d'un accès en lecture seule : il n'envoie aucun message, ne communique aucune pièce et ne modifie rien dans votre logiciel » | textes.ts:152 | B | aucun connecteur en écriture | — | 0 / 0 | — |

## 6. Les formules (FORMULES)

| # | Promesse | Où | État | Preuve | Ce qui manque | Jours → B / B → A | Coût externe |
|---|---|---|---|---|---|---|---|
| 45 | « Le tarif est fixé à l'issue d'un audit mené sur l'un de vos dossiers, une fois que vous avez jugé le dossier de faits sur pièces » | textes.ts:160 | C | — | une pré-lecture qui tourne sur un vrai dossier (= 3-5) | (compté) | — |
| 46 | Pré-lecture, Contentieux : « Dossier de faits daté et sourcé » | textes.ts:171 | C | = 3 | = 3 | (compté) | — |
| 47 | « Contradictions entre pièces » | textes.ts:171 | C | = 4 | = 4 | (compté) | — |
| 48 | « Bordereau contrôlé (art. 768) » | textes.ts:171 | C | = 5 | = 5 | (compté) | — |
| 49 | « Dispositif contre motifs (art. 954) » | textes.ts:171 | D | — | nouveau type *(A1)* + écran | 2 / 1,5 | IA |
| 50 | « Prétentions nouvelles et concentration en appel » | textes.ts:171 | D | — | nouveau type (art. 564, 910-4 CPC) *(A1)* + écran | 2,5 / 1,5 | IA |
| 51 | « Pièces citées jamais communiquées, sommation prête » | textes.ts:171 | D | — | nouveau type + modèle de sommation *(A1 + B4)* | 2,5 / 1 | IA |
| 52 | « Dires à l'expert préparés sur le pré-rapport » | textes.ts:171-172 | D | dates de l'expertise en B (b4_16) | rédaction des dires à partir du pré-rapport *(A1)* | 2,5 / 1,5 | IA |
| 53 | « Trous de la chronologie et faits contredits » | textes.ts:171 | C | contradictions = 4 | les trous (périodes sans pièce) *(A1)* | 1 / 0,5 | — |
| 54 | « Index des personnes et faits classés par moyen » | textes.ts:171 | D | — | nouveau type *(A1)* + écran | 2 / 1,5 | IA |
| 55 | « Questions posées au dossier » | textes.ts:171-172 | D | — | questions-réponses sourcées sur le dossier *(A1)* + écran | 4 / 1,5 | IA |
| 56 | « Premier jet de l'exposé des faits » | textes.ts:171-172 | D | — | nouveau type, export Word *(A1)* | 1,5 / 1 | IA |
| 57 | « Dossier de plaidoirie et renvois cliquables » | textes.ts:171 | D | citations à l'écran (pièce, page, lignes), non cliquables vers la page | visionneuse de la pièce déchiffrée, ouverte à la page citée ; dossier de plaidoirie exporté | 3,5 / 1 | — |
| 58 | « Pièces adverses du jour » ; « Pièces scannées et manuscrites » | textes.ts:171 | D / C | = 2, = 9 | = 2, = 9 | (compté) | — |
| 59 | « Export Word et PDF » | textes.ts:171-172 | B | export des lectures (7ec04ec), factures (99d0467) ; recette | export d'un vrai résultat | 0 / 0,5 | — |
| 60 | Dommage corporel : « Chronologie des soins », « Interruptions de soins repérées », « Nomenclature Dintilhac pré-remplie », « Écarts entre rapports d'expertise », « Source de chaque poste de préjudice », « Questions posées au dossier médical », « Pièces médicales scannées » | textes.ts:172 | D (chronologie : C) | — | cinq types propres au corporel *(A1)*, écran Dintilhac ; **hébergement HDS** pour les pièces médicales | 9 / 5 | **hébergeur HDS**, OCR |
| 61 | « Effacement à la clôture » (formule corporel) | textes.ts:172 | C | = 41 | = 41 | (compté) | — |
| 62 | Cabinet : « Point du matin à 7 h », « Délais d'appel lus dans l'avis RPVA », « Pièces attendues du client et de l'expert » | textes.ts:183-184 | C | = 17, 20, 21 | = 17, 20, 21 | (compté) | — |
| 63 | Cabinet : « Forfaits dépassés » / « Conventions et forfaits », « Marge par dossier », « Contentieux (Dossiers) en série comparés », « Dossiers sans diligence », « Charge par avocat », « Temps passé proposé à la saisie », « Lecture seule de vos outils » | textes.ts:183-184 | B (séries : C) | b4_06, b4_12 (tests 15, 21), pilotage 0c0714d, recette 162-188 | « comparés » : les séries sont regroupées, pas comparées (issues, durées, montants) | 2 / 3 | — |

Également hors chiffrage : « Pour toutes les matières où l'on plaide sur pièces » (textes.ts:191-199) n'est que
le champ matière (B). En revanche, les délais calculés ne couvrent que la procédure d'appel (CPC).
« … sans rien installer » (textes.ts:206-207) est vrai : c'est une application web (B).

## Totaux (somme des lignes, arrondis)

- **→ B : ≈ 74 j.** Lecture IA : 41,5 j (lignes 2, 3-5, 7, 9, 10, 21, 49-57, 60 ; part lecteur d'A1 + écrans B4). Gestion et écran : 24 j. Infrastructure : 8,5 j (lignes 29, 30, 36).
- **B → A : ≈ 54 j** : 24,5 de lecture IA, 26 de gestion, 3,5 d'infrastructure, avec un cabinet pilote (ses vraies pièces, ses retours).
- Comptage : somme des colonnes « Jours » ; « (compté) » renvoie à une autre ligne et n'est pas recompté. L'état retenu est la lettre principale (« C/T » compte en C, « D / C » en D).
- Part lecteur : chiffres d'A1 (06/10, 20 h 30 Z), repris tels quels ; part écran et porte : B4.
