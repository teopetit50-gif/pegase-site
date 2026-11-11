# Varelo v2 — le groupe lu, relié et décidé sur une page, de la source à la décision

Brief produit, version 2 du 11/11/2026. Il n'y avait pas de « PROMPT PRODUIT » v1 pour Varelo :
la v1, c'est ce que la page `/secteurs/groupes` et l'espace `/espace2/varelo` vendent
aujourd'hui (une seule IA pour tout le groupe, un seul référentiel, la lecture seule, le point du
matin par direction, la DSI qui garde la main). Les passages marqués ◆ sont ceux que la v2
ajoute ou change.

L'idée est celle des briefs Tamila et Lorani : reprendre les briques des trois plus gros SaaS
américains de l'IA d'entreprise et du pilotage de groupe, les fondre en un seul produit français
qui suit le groupe de la source à la décision, et le faire mieux parce qu'il connaît le groupe
français de PME et d'ETI (plusieurs sociétés, plusieurs territoires, des logiciels achetés hors
DSI, une consolidation faite dans un tableur) et parce qu'il prouve chaque point. Varelo
existe : la v2 l'étend, elle ne repart pas de zéro.

## 0. Ce que la v2 change par rapport à ce qui est vendu aujourd'hui ◆

| Aujourd'hui (page et espace en ligne) | v2 | Pourquoi |
|---|---|---|
| « Une seule IA pour tout le groupe » : l'assistant lit tout, chaque direction reçoit ses décisions | La même promesse, découpée en un fil qui se vérifie étape par étape : la SOURCE branchée (ce qui est lu, par qui, depuis quand), le RÉFÉRENTIEL (ce qui a été rapproché, ce qui reste en doute), la RÈGLE (écrite une fois, appliquée partout, avec son auteur), la DÉCISION (avec son calcul et sa pièce), la PAGE (présidence et directions) | Glean, Palantir et OneStream gagnent chacun sur une étape : la lecture avec les droits, l'ontologie et les actions, la consolidation. Vendre « une IA » sans montrer les étapes, c'est vendre de l'emphase. |
| Le référentiel est un résultat | Le référentiel est un TRAVAIL visible : les rapprochements proposés, acceptés, refusés, par qui, avec les doublons et les écarts entre sociétés (Module 2) | C'est l'ontologie de Palantir, à l'échelle d'un groupe de PME : des objets (société, client, fournisseur, article, contrat, salarié), des liens et des actions tracées. |
| Les règles sont citées (délai de réserve, préavis, pièce à réclamer, seuil d'encours) | Les règles ont un CATALOGUE : chaque règle a un auteur, une date, un périmètre (quelles sociétés), un calcul et un journal d'application (Module 3) | Une règle qui s'applique sans qu'on sache où ni depuis quand ne se gouverne pas. |
| Le point du matin par direction | Le point du matin par direction ET la consolidation du groupe sur une page, avec les éliminations intra-groupe signalées et le rapprochement avec les comptes de chaque société (Module 5) | La brique OneStream / Workiva : la page présidence ne vaut que si ses chiffres se rapprochent des comptes. |
| « Sur des données d'exemple » partout | Toujours vrai tant que les chiffres ne viennent pas d'un groupe pilote (section 13) | Doctrine : aucun résultat client, aucun chiffre non sourcé. |

## 1. Vision en une phrase

Un SaaS français qui branche en lecture seule les logiciels, les tableurs et les dossiers de
toutes les sociétés d'un groupe, les range sous un seul référentiel dont chaque rapprochement est
visible, applique des règles écrites une fois pour le groupe, remet chaque matin à chaque
direction ses décisions avec leur calcul et leur pièce, et montre le groupe à la présidence sur
une page qui se rapproche des comptes de chaque société, sous le contrôle de la DSI.

## 2. Les trois briques US reprises, et ce qu'on en fait de mieux ◆

| SaaS US | Ce qu'on lui reprend | Où ça va chez Varelo | Ce que Varelo fait de mieux |
|---|---|---|---|
| **Glean** (Work AI) | Un seul assistant sur toutes les applications du groupe (275 connecteurs annoncés) ; les droits hérités des systèmes sources et synchronisés en continu, chacun ne voit que ce qu'il a le droit de voir ; des agents bornés par l'administrateur, avec approbation humaine avant une action ; une gouvernance des échanges avec l'IA | Module 1 (sources et droits), Module 4 (l'assistant et les agents), gouvernance DSI | Le groupe de PME français : des logiciels achetés hors DSI, des tableurs, des dossiers partagés, souvent sans annuaire unique ; Varelo construit les droits avec la DSI quand les sources n'en ont pas, et reste en lecture seule. Hébergement en Europe, aucun entraînement sur les données du groupe. |
| **Palantir Foundry / AIP** (l'ontologie) | La représentation du groupe en objets, propriétés, liens et actions ; les droits posés au niveau de l'ontologie ; les actions tracées qui modifient les objets ; l'assistant qui explore l'ontologie et révèle les données de mauvaise qualité (enregistrements périmés, doublons) | Module 2 (le référentiel), Module 3 (les règles), Module 4 (l'assistant) | À l'échelle et au prix d'un groupe de 3 à 30 sociétés, pas d'un ministère : un référentiel qui se construit en quelques semaines depuis les codes existants, des rapprochements proposés et validés par une personne, et aucune écriture dans les systèmes sources. |
| **OneStream** et **Workiva** (consolidation et reporting de groupe) | La consolidation multi-sociétés et multi-devises, les éliminations intra-groupe, le rapprochement des chiffres consolidés avec les comptes de chaque entité, le reporting au conseil relié à la donnée | Module 5 (la page présidence et la consolidation) | La présidence d'une ETI française n'a pas besoin d'un outil de clôture : elle a besoin de lire le groupe chaque matin, avec les intra-groupe signalés et le lien vers la pièce. Varelo ne produit pas les comptes consolidés ; il les rapproche. |

Écartés comme modèles produit : Sage Intacct et NetSuite (ERP multi-entités : Varelo les lit, il
ne les remplace pas) ; Writer et Microsoft Copilot (assistants généralistes sans référentiel de
groupe) ; Addepar et Masttro (holdings patrimoniales, hors cible).

Ce qui rend l'ensemble meilleur que la somme des trois : un seul fil de la source à la décision,
là où les trois couvrent chacun une étape ; la preuve par point avec remboursement (section 8) ;
la lecture seule comme architecture ; le prix et le délai d'un groupe de PME.

## 3. Problème adressé

Dans la plupart des groupes, l'IA est entrée par les équipes : la finance utilise un assistant,
la logistique un autre, chaque société a sa nomenclature, des logiciels achetés hors DSI, et
rien n'est centralisé (matière du call avec la DSI d'un groupe antillais, 25/08/2026, reprise
dans `components/secteurs/groupes/textes.ts`). La présidence lit le groupe dans un tableur
consolidé à la main, en retard d'un mois, dont personne ne peut remonter un chiffre à sa pièce.
Une règle (un préavis de contrat, un délai de réserve, un seuil d'encours) existe dans une
société et pas dans l'autre.

Les outils en place ne le font pas : les ERP tiennent chaque société ; les outils de
consolidation produisent les comptes une fois par an ; les assistants généralistes répondent sans
référentiel ni droits de groupe ; les plateformes américaines de données d'entreprise visent les
grands comptes.

## 4. Cible utilisateur

- **Primaire** : groupes de 3 à 30 sociétés, 100 à 2 000 salariés, plusieurs territoires, une
  DSI de une à dix personnes ; la décision revient à la présidence ou à la direction générale,
  avec la DSI.
- **Secondaire** : groupes de 2 à 3 sociétés, par le plan Pôle (un pôle, puis le groupe).
- **Tertiaire (plus tard)** : groupes de plus de 30 sociétés, par forfait.

Personas : le président (lit la page), le directeur de pôle ou de société (reçoit ses
décisions), le DAF (consolide), la DSI (branche, borne, gouverne), le contrôleur de gestion
(rapproche).

## 5. Positionnement

« La couche qui lit tout le groupe avec un seul référentiel et qui dit chaque matin quoi
décider. » Varelo s'ajoute aux ERP, aux tableurs et aux outils de consolidation en place. Il se
distingue des assistants généralistes (pas de référentiel, pas de droits de groupe), des
plateformes de données américaines (prix et délai d'un grand compte) et des outils de
consolidation (une fois par an, sans la pièce). Il n'est ni un ERP, ni un outil de clôture, ni
un entrepôt de données à construire.

## 6. Principes produit

1. **Lecture seule.** Varelo lit les logiciels, les tableurs et les dossiers de chaque société ;
   il n'y écrit jamais. Chaque source se branche avec l'accord de la DSI et se débranche de la
   même façon.
2. **Un référentiel visible.** Chaque rapprochement (deux codes, un même client) est proposé,
   validé ou refusé par une personne, et daté.
3. **Une règle, un auteur, un périmètre.** Aucune règle ne s'applique sans qu'on sache qui l'a
   écrite, pour quelles sociétés, depuis quand.
4. **Preuve par point.** Chaque décision du matin porte son calcul et sa pièce ; chaque chiffre
   de la page présidence se rapproche d'un chiffre de société.
5. **Les droits viennent des sources, ou de la DSI.** Chacun voit ce que son système lui laisse
   voir ; quand la source n'a pas de droits, la DSI les pose dans Varelo.
6. **Données en Europe, aucun entraînement** sur les données du groupe, journal des accès.

## 7. Les cinq modules ◆

**Module 1 — Les sources et les droits** (brique Glean). Chaque logiciel, tableur et dossier
branché en lecture seule, avec son périmètre, sa fréquence de lecture, ses droits hérités ou
posés par la DSI ; la liste de ce qui est lu et de ce qui ne l'est pas, société par société.

**Module 2 — Le référentiel, et son travail** ◆ (brique Palantir). Les objets du groupe
(sociétés, clients, fournisseurs, articles, contrats, salariés, sites) et leurs codes dans chaque
système ; les rapprochements proposés, validés, refusés ; les doublons et les écarts signalés ;
l'historique.

**Module 3 — Le catalogue des règles** ◆. Chaque règle du groupe (préavis de contrat, délai de
réserve, pièce à réclamer, seuil d'encours, écart de prix entre sociétés) avec son auteur, sa
date, son périmètre, son calcul et son journal d'application.

**Module 4 — L'assistant et les agents bornés** (brique Glean + Palantir). La même IA pour tout
le groupe, qui répond avec la pièce et dans les droits de chacun ; des agents qui préparent (un
rapprochement, une relance, un dossier) et n'agissent qu'après validation d'une personne.

**Module 5 — Le point du matin et la page présidence** (déjà en ligne, étendu, brique
OneStream / Workiva). Par direction : ses décisions du jour avec calcul et pièce ; pour la
présidence : le groupe sur une page, les intra-groupe signalés, chaque chiffre rapproché des
comptes de sa société, et ce qui dépasse une règle.

## 8. Moteur transversal : lecture, rapprochement, preuve ◆

- **Lecture** : ERP et logiciels de gestion (export ou connecteur selon l'éditeur), caisses,
  tableurs, dossiers partagés, messagerie quand la DSI l'autorise.
- **Rapprochement** : un objet ↔ ses codes dans chaque système ; un chiffre consolidé ↔ les
  chiffres de société ; une décision ↔ sa règle, son calcul, sa pièce.
- **Preuve par point** : une décision sans pièce n'est pas affichée ; un chiffre sans
  rapprochement est marqué « non rapproché ».
- **Règle de remboursement** : la même que Tamila et Lorani (point valide, N et seuil à fixer
  après les pilotes, à écrire dans les CGV).

## 9. Intégrations

ERP et logiciels de gestion des PME françaises (export ou connecteur selon l'éditeur), tableurs
(fichiers partagés), dossiers (serveur de fichiers, suite bureautique), annuaire du groupe quand
il existe. Aucune écriture dans aucun de ces outils.

## 10. Modèle économique

Abonnement par groupe selon le nombre de sociétés (Pôle 2 à 3, Groupe 4 à 12, Groupe étendu 13
à 30, forfait au-delà), prix à fixer après les pilotes (`prix: null` sur le site tant que Teo n'a
pas tranché). Branchement des sources compris jusqu'à un nombre fixé par plan.

## 11. MVP ◆

Module 1 (sources et droits) + Module 2 (référentiel, rapprochements validés par une personne) +
Module 5 (point du matin par direction, déjà en ligne, et la page présidence rapprochée). Le
catalogue des règles et les agents viennent après le premier pôle pilote.

## 12. Non-objectifs

Pas d'écriture dans les systèmes sources. Pas de production de comptes consolidés ni de liasse.
Pas d'assistant qui répond aux clients du groupe. Pas de tri de candidatures ni de décision RH.
Pas de prix, de marge ni de « vie chère » affichés (règles maison de la page). Pas de chiffre de
gain promis.

## 13. Indicateurs de succès

Mesurés sur le pôle pilote, jamais affichés avant : sources branchées sur sources prévues ;
objets rapprochés sur objets détectés ; décisions du matin traitées le jour même ; chiffres de la
page présidence rapprochés des comptes ; délai entre la clôture d'une société et sa lecture sur
la page.

## 14. Risques et parades

| Risque | Parade |
|---|---|
| Des sources sans export ni droits | Commencer par un pôle et ses trois ou quatre logiciels ; dire à la DSI, avant, ce qui sera lu ; la DSI pose les droits dans Varelo quand la source n'en a pas |
| Un référentiel faux qui propage une erreur | Aucun rapprochement appliqué sans validation d'une personne ; chaque rapprochement est réversible et daté |
| La page présidence contredite par le DAF | Chaque chiffre porte son rapprochement avec les comptes de société ; « non rapproché » s'affiche plutôt qu'un chiffre rond |
| Comparaison avec Palantir ou Glean sur le prix | Varelo ne vise pas le grand compte : un pôle en quelques semaines, au prix d'un groupe de PME |
| Chiffres d'éditeurs US repris par réflexe | Aucun chiffre sur la page sans source publique datée (doctrine §5) |

## 15. Ce que le prompt doit produire, dans cet ordre

1. Le PRD du MVP seul (section 11), à partir des écrans de `/espace2/varelo` déjà construits.
2. L'architecture du MVP : connecteurs en lecture seule, référentiel et journal des
   rapprochements, droits hérités ou posés, hébergement en Europe.
3. Le plan pilote : un pôle de 3 à 4 sociétés dans un groupe de 10 à 30, protocole de mesure
   des points confirmés.
4. Ensuite seulement : la page `/secteurs/groupes` mise à jour (énoncés et situations types),
   avec la recette aux cinq largeurs et la mise en ligne habituelle.
