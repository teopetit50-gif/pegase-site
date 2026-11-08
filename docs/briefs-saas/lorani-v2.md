# Lorani v2 — le dossier vérifié de l'architecte, du permis à la réception

Brief produit, version 2 du 08/11/2026. Remplace le « PROMPT PRODUIT — Le carnet de bord vérifié
de l'architecte » (v1). Les passages marqués ◆ sont ceux que la v2 change ; la raison de chaque
changement est en section 0, puis reprise dans `LA-SUITE.md`.

L'idée de départ est conservée : reprendre les briques des trois plus gros SaaS américains de
la maîtrise d'œuvre et les refondre en un seul produit français, meilleur parce qu'il connaît le
droit de l'urbanisme, les marchés et le chantier français, et parce qu'il prouve chaque point.
Le produit existe déjà sous le nom Lorani (page `/secteurs/architectes`, espace
`/espace2/lorani`) : la v2 l'étend, elle ne repart pas de zéro.

## 0. Ce que la v2 change par rapport à la v1 ◆

| v1 | v2 | Pourquoi |
|---|---|---|
| Module 2 « suivi des commentaires de permis » : classement des commentaires du service instructeur, correction, renvoi, relance | Module 2 = « Dépôt, délais et recours » : complétude, demande de pièces complémentaires (unique), délais d'instruction, décision, affichage, purge des recours | Le cycle de commentaires vient de PermitFlow et GreenLite : c'est la procédure américaine. En France, l'instruction tient en une demande de pièces dans le premier mois puis une décision. La douleur réelle est le calendrier et la complétude. |
| MVP = Module 2 (commentaires) + Module 4 partiel | MVP = Module 3 (planches ↔ CCTP ↔ DPGF, déjà en ligne) + Module 4 partiel (visa des fiches techniques et plans d'exécution contre le CCTP) | Le croisement de pièces est le moteur déjà vendu et le plus dur à copier ; le visa réutilise exactement ce moteur. La v1 mettait le cœur du produit hors MVP. |
| Plateforme de dépôt nommée tout au long du brief | « Le guichet numérique de la commune (GNAU), raccordé à Plat'AU » ; le nom de la v1 est à vérifier avant toute mention | Je ne reconnais pas la plateforme nommée dans la v1 comme le guichet national. On ne cite pas une plateforme qu'on n'a pas ouverte. |
| DWG/DXF en priorité 1 | PDF natif seul au MVP ; DWG après ; IFC hors périmètre | Lire du DWG coûte cher et n'apporte rien tant que le croisement n'est pas prouvé sur PDF. La v1 le disait elle-même dans ses risques. |
| « Base PLU par commune » comme simple risque de coût | Module 1 limité aux articles quantitatifs du PLU (hauteur, emprise, retraits, stationnement, pleine terre) sur six villes, depuis le Géoportail de l'urbanisme ; les articles qualitatifs restent hors périmètre | Un règlement de PLU est de la prose. Les seules règles qu'on peut vérifier contre un plan sans interprétation sont les règles chiffrées. |
| Inspirations réparties sur cinq SaaS | Briques reprises : Part3 (chantier), PermitFlow et GreenLite (permis, une seule brique), UpCodes et CodeComply (conformité et croisement plan ↔ texte) | Trois briques nettes, une par phase, pour tenir l'idée « trois gros SaaS fondus en un ». |
| Section 14 : cinq livrables d'un coup | Section 15 : livrables séquencés, PRD du seul MVP d'abord | Cinq livrables générés d'un coup donnent cinq documents moyens. |

## 1. Vision en une phrase

Un SaaS français qui suit le dossier de l'architecte du dépôt de permis à la réception, en
vérifiant automatiquement la cohérence entre toutes les pièces (planches, CCTP, DPGF, offres,
fiches techniques, plans d'exécution, situations, PV) et en tenant un journal des décisions
opposable, avec le référentiel réglementaire français comme colonne vertébrale.

## 2. Les trois briques US reprises, et ce qu'on en fait de mieux ◆

| SaaS US | Ce qu'on lui reprend | Où ça va chez Lorani | Ce que Lorani fait de mieux |
|---|---|---|---|
| **Part3** | L'administration de chantier côté architecte : fiches techniques (submittals) classées par section de spec, questions d'entreprise (RFI) rattachées au contexte, comptes rendus de visite générés depuis notes et photos, détection des pièces manquantes | Module 4 (visa, RFI, visites, décisions), Module 5 (réception) | Le visa français (VSO, VAO, refusé), la confrontation de chaque fiche au CCTP (DTU, Avis Technique, classement au feu, PV d'essai), les situations rapprochées du marché (DPGF), la décennale et la réception comme point de départ des garanties. |
| **PermitFlow + GreenLite** | La préparation du dossier de dépôt, la revue des pièces avant dépôt, le suivi du dossier chez l'autorité | Module 1 (avant dépôt), Module 2 (dépôt, délais, recours) | La procédure française, qui n'a pas de boucle de commentaires : pièces du CERFA par type de projet, demande de pièces unique dans le mois, délais d'instruction et majorations, décision tacite, affichage et constat, délai de recours des tiers et de retrait. |
| **UpCodes + CodeComply** | La recherche de la règle applicable et la vérification automatique d'un plan contre un texte | Moteur transversal, Module 1 (PLU quantitatif), Module 3 (planche ↔ CCTP ↔ DPGF) | Le référentiel français : PLU depuis le Géoportail de l'urbanisme, RE2020, DTU, accessibilité, ERP. Et le croisement entre pièces du projet lui-même, que ni l'un ni l'autre ne font. |

Références gardées comme repères, pas comme modèles : InspectMind (rapports de visite par la voix,
remboursement si précision insuffisante : c'est le standard à battre, cité dans la v1 à environ
80 %), Procore et Autodesk Construction Cloud (côté entreprise, hors cible).

Ce qui rend l'ensemble meilleur que la somme des trois : un seul fil du permis à la réception, la
preuve par point avec remboursement (section 8), le journal des décisions opposable en cas de
sinistre, et le référentiel français que les trois ignorent.

## 3. Problème adressé

L'architecte produit et reçoit des dizaines de pièces hétérogènes (PDF, DWG, Excel, scans) à chaque
phase. Les incohérences entre ces pièces (une planche qui ne correspond pas au CCTP, une fiche
technique qui ne répond pas à la spec, une situation qui ne correspond pas au marché, un dossier de
permis incomplet) se découvrent au pire moment : à l'instruction, à l'attribution, à la réception.
Elles coûtent du temps, de l'argent, et engagent la responsabilité de l'architecte, décennale
comprise.

OOTI, Kalm et Teamber gèrent l'économie de l'agence, pas la cohérence des pièces ; mign.io vérifie
le permis contre la règle, pas le dossier contre lui-même sur toutes les phases ; les SaaS US
couvrent chacun une brique, avec le référentiel américain.

## 4. Cible utilisateur

- **Primaire** : agences de 3 à 30 personnes, résidentiel et commercial, plusieurs opérations en
  parallèle, pas de direction technique dédiée.
- **Secondaire** : agences de 1 à 3, par le plan Découverte.
- **Tertiaire (plus tard)** : agences de 30 à 100 et groupements de maîtrise d'œuvre, par forfait
  d'opération.

Personas : l'associé (décide), le chef de projet (utilise chaque jour), le responsable qualité
interne (garant), le juriste ou l'assureur (bénéficiaire de la traçabilité).

## 5. Positionnement

« La couche de vérification et de traçabilité qui manque aux outils de gestion d'agence. » Lorani
s'ajoute à OOTI ou Kalm ou vit seule. Elle se distingue de mign.io par la couverture multi-phases
et le croisement entre pièces, des SaaS US par le référentiel français et l'hébergement en Europe.
Elle n'est ni un outil de dessin, ni un BIM, ni un rendu, ni un ERP, ni un outil de facturation.

## 6. Principes produit

1. **L'architecte décide, Lorani propose.** Aucun fichier modifié, rien de signé. Chaque point vient
   avec la pièce, la page, la valeur lue, la référence et la correction proposée.
2. **Preuve par point.** Aucun point sans citation exacte. Un point non prouvé n'est pas affiché.
3. **Référentiel français d'abord.** PLU, RE2020, DTU, Avis Techniques, accessibilité, ERP, VSO/VAO,
   décennale.
4. **Traçabilité opposable.** Chaque visa, chaque décision, chaque réponse est horodatée et
   rattachée à sa pièce.
5. **Invisible par défaut.** On vend du temps gagné et du risque évité, pas de l'IA.
6. **Prix d'entrée accessible.** Un premier dossier contrôlé à prix fixe.

## 7. Les cinq modules

### Module 1 — Avant dépôt : complétude, cohérence des planches, PLU quantitatif ◆
L'architecte dépose les pièces du permis. Lorani vérifie la complétude contre la liste des pièces du
CERFA selon le type de projet (PC ou DP, maison individuelle ou autre, ERP, secteur protégé), la
cohérence entre planches (surfaces de plancher et emprise d'une pièce à l'autre, cotes et niveaux,
orientations, implantation entre plan de masse et plan de situation), la présence et la cohérence
de l'attestation RE2020, puis les règles chiffrées du PLU de la commune (hauteur, emprise au sol,
retraits par rapport aux limites et à la voie, stationnement, pleine terre), sur six villes au
départ (Paris, Lyon, Marseille, Bordeaux, Lille, Nantes), depuis le Géoportail de l'urbanisme.
Les articles qualitatifs du PLU (aspect, insertion) ne sont pas vérifiés et c'est écrit.

Sortie : rapport de pré-vérification (points prouvés) + liste de dépôt propre à la commune.

### Module 2 — Dépôt, délais et recours ◆
Remplace le « suivi des commentaires » de la v1. Lorani tient le calendrier du permis à la journée :
dépôt sur le guichet numérique de la commune (GNAU, raccordé à Plat'AU) et récépissé ; délai
d'instruction selon le projet (déclaration préalable, maison individuelle, autres) et ses
majorations ; demande de pièces complémentaires, unique et dans le premier mois, chaque pièce
demandée étant rattachée à la planche corrigée et la correction vérifiée contre la demande avant
renvoi, avec le délai de réponse ; décision expresse ou tacite ; affichage sur le terrain et
constat ; délai de recours des tiers à compter de l'affichage continu, délai de retrait ; journal
horodaté de tous les échanges. Chaque échéance est rappelée avant d'arriver.

Sortie : tableau de bord du permis (où il en est, ce qu'on attend, de qui, pour quand) + preuve de
traitement par pièce demandée. Dans l'espace actuel, c'est la sous-page « Permis » qui porte ce
module.

### Module 3 — DCE et offres
Déjà en ligne pour le croisement planches ↔ CCTP ↔ DPGF : Lorani relève chaque incohérence entre
une planche et le cahier des clauses, entre le cahier des clauses et la décomposition des prix
(poste décrit non chiffré, poste chiffré non décrit, quantités divergentes), avec la page et la
valeur lue. À réception des offres : chaque offre est rapprochée de la DPGF et du CCTP (postes non
chiffrés, écarts de quantités, variantes non demandées, exigences du CCTP non couvertes, ambiguïtés
qui deviendront des litiges), lot par lot.

Sortie : rapport d'analyse des offres (points prouvés) + tableau comparatif des postes par lot.

### Module 4 — Chantier : visa, RFI, visites, situations, décisions
Le cœur du produit après le DCE. Chaque fiche technique soumise par une entreprise est confrontée
au CCTP (produit, classement au feu, Avis Technique ou DTU visé, PV d'essai, performances) et au
plan concerné ; Lorani prépare le bordereau de visa (VSO, VAO avec les observations sourcées,
refusé avec le motif). Les plans d'exécution sont confrontés aux plans du projet. Les questions des
entreprises (RFI) sont rattachées aux pièces concernées et aux réponses déjà données. Les comptes
rendus de visite sont générés depuis les notes et photos, les réserves suivies jusqu'à leur levée.
Chaque situation de travaux est rapprochée du marché (DPGF, avancement constaté, avenants). Tout
est inscrit dans un journal des décisions : qui a décidé quoi, quand, sur quelle base, avec quel
impact.

Sortie : carnet de chantier opposable (visas, RFI, visites, situations, décisions, preuves),
exportable en cas de litige.

### Module 5 — Réception et clôture
Compilation du DOE à partir des pièces visées, rattachement des PV de réception et des réserves
(levées, restantes, dates), production de la piste d'audit complète, rappel des points de départ
des garanties (parfait achèvement, biennale, décennale) à la date de réception, export d'un dossier
de clôture utilisable en cas de contentieux ou de sinistre.

Sortie : dossier de clôture horodaté, exportable.

## 8. Moteur transversal : lecture, croisement, référentiels ◆

- **Lecture** : PDF natifs d'abord (exports Revit, Archicad, AutoCAD), PDF scannés avec OCR et score
  de confiance par page, Excel (CCTP, DPGF, situations), images (photos, PV). DWG/DXF après le MVP ;
  IFC hors périmètre.
- **Extraction** : dimensions, surfaces, quantités, références de produits, classements au feu,
  articles de PLU et de DTU, pièces et pages.
- **Croisement** : planche ↔ planche, planche ↔ CCTP, CCTP ↔ DPGF, offre ↔ DPGF, fiche technique ↔
  CCTP, plan d'exécution ↔ plan projet, situation ↔ marché, pièce demandée ↔ pièce corrigée,
  planche ↔ règle chiffrée du PLU.
- **Référentiels** : Géoportail de l'urbanisme (PLU à date, par commune), RE2020, DTU et Avis
  Techniques (références, pas le texte intégral payant), accessibilité, ERP, pièces du CERFA.
- **Précision, définition commune aux deux produits** : un point est « valide » quand l'architecte,
  en le relisant, confirme que la valeur lue est bien dans la pièce à la page indiquée et que
  l'écart signalé existe. Objectif : au moins 90 % de points confirmés, mesuré sur les points relus,
  publié chaque trimestre. Remboursement d'un contrôle à l'unité si moins de N points valides (N à
  fixer, 3 par défaut) ou si moins de 80 % des points sont confirmés. À écrire dans les CGV.
- **Hébergement** : Union européenne, France de préférence ; chiffrement en transit et au repos ;
  cloisonnement par opération ; journal des accès ; aucun entraînement sur les pièces.

## 9. Intégrations

1. MVP : import de fichiers (PDF, Excel, images), export PDF et Excel des rapports, export du
   carnet de chantier.
2. Ensuite : OOTI, Kalm, Teamber (données d'opération en lecture, export des vérifications) ; DWG.
3. Plus tard : Autodesk Construction Cloud et Procore en lecture (pièces de chantier côté
   entreprise) ; Pennylane ou QuickBooks pour le contexte de facturation.

## 10. Modèle économique

- **Découverte** : un permis déjà instruit ou un DCE déjà attribué, contrôlé, à prix fixe (150 à
  300 €), sans abonnement. C'est la porte d'entrée déjà annoncée sur le site.
- **Agence** : abonnement mensuel par taille (1 à 5, 6 à 20, 21 à 50 personnes), avec un quota de
  contrôles (permis, offres, visas).
- **Opération** : forfait par opération pour les grosses opérations et les groupements, les cinq
  modules compris.
- **Contrôles à l'unité** : prix par vérification lourde (analyse d'offres, croisement complet),
  remboursée si moins de N points valides.

## 11. MVP ◆

Périmètre : **Module 3 (planches ↔ CCTP ↔ DPGF, déjà en ligne) + Module 4 partiel (visa des fiches
techniques et plans d'exécution contre le CCTP et les plans, bordereau VSO/VAO/refusé, journal des
décisions)**. Le Module 2 (délais et recours) suit immédiatement : il demande peu de lecture
automatique et beaucoup de calendrier, et la sous-page « Permis » de l'espace existe déjà.

Pourquoi ce périmètre et pas celui de la v1 : les deux modules réutilisent le même moteur de
croisement, le seul qui différencie Lorani ; la douleur du visa est quotidienne et la preuve se
produit en quelques heures sur un dossier passé.

Hors MVP : Module 1 (PLU), Module 5, DWG, intégrations OOTI/Kalm, analyse des offres au-delà de
la DPGF.

Critère de succès : 10 agences pilotes, 50 dossiers contrôlés, au moins 90 % de points confirmés,
une étude de cas chiffrée publiée.

## 12. Non-objectifs

- Ne produit ni plans, ni BIM, ni rendu.
- Ne remplace ni Revit, Archicad, ni OOTI, Kalm.
- Ne facture pas, ne gère ni paie ni comptabilité.
- Ne signe rien, n'engage pas la responsabilité de l'architecte.
- Ne vend pas « de l'IA ».
- Ne vise pas les 50 et plus en premier.
- N'attaque ni le rendu temps réel, ni le BIM cloud, ni la faisabilité.
- Ne vérifie pas les règles qualitatives du PLU ◆.

## 13. Indicateurs de succès

Précision (points confirmés, publiée) ; adoption (agences actives, dossiers contrôlés, rétention à
six mois) ; impact (temps gagné par dossier, incohérences trouvées avant dépôt, attribution ou
réception, refus et réserves évités) ; preuve (trois études de cas la première année) ; économie
(coût d'acquisition, valeur vie client, conversion Découverte vers Agence).

## 14. Risques et parades ◆

| Risque | Parade |
|---|---|
| Précision insuffisante sur PDF scannés | PDF natifs d'abord ; score OCR affiché ; précision publiée ; remboursement |
| Un acteur français ajoute la fonction | Avance sur le croisement multi-phases, le référentiel et le journal opposable ; études de cas vite publiées |
| Règlement de PLU en prose, non vérifiable | Articles quantitatifs seulement, six villes, élargissement progressif ; le reste est annoncé hors périmètre |
| Procédure de permis mal modélisée | Module 2 calé sur la procédure française (demande unique, délais, affichage, recours), pas sur un cycle de commentaires |
| Cycle de vente long sur les 10 à 50 | Découverte à prix fixe sur un dossier déjà instruit, puis expansion |
| Faux négatif engageant l'agence | Clause claire : Lorani assiste, l'architecte décide ; RC pro ; journal exportable |
| Plateforme de dépôt mal nommée | Vérifier le guichet réel (GNAU de la commune, Plat'AU) avant toute mention dans le produit ou le site |
| Confusion de nom | Le produit s'appelle Lorani ; Omega.AI reste l'éditeur |

## 15. Ce que le prompt doit produire, dans cet ordre ◆

1. **PRD du MVP seul** (Module 3 et Module 4 partiel) : user stories par persona, critères
   d'acceptation, définition du point valide, format du rapport et du bordereau de visa, écrans à
   partir de l'espace existant (`/espace2/lorani` : Vue d'ensemble, Projet, Permis, Courrier).
2. **Architecture technique du MVP** : pipeline de lecture PDF et Excel, extraction, croisement,
   journal des décisions scellé, hébergement UE, RGPD.
3. **Plan de recrutement des 10 agences pilotes** : ciblage (3 à 30, résidentiel et commercial,
   plusieurs chantiers en cours), message, questions d'entretien, protocole de mesure des points
   confirmés.
4. Après les trois premiers dossiers pilotes seulement : Module 2 détaillé, wireframes des Modules
   1 et 5, plan de lancement complet, grille tarifaire définitive.
