# Tavaro v2 — chaque véhicule suivi du départ au retour, et jusqu'à la sortie de flotte

Brief produit, version 2 du 11/11/2026. Il n'y avait pas de « PROMPT PRODUIT » v1 pour Tavaro :
la v1, c'est ce que la page `/secteurs/location-automobile` et l'espace `/espace2/tavaro` vendent
aujourd'hui (le point du matin, la facturation des retours sur le barème, la remise en location
et l'entretien, l'assistance, la sortie de flotte). Les passages marqués ◆ sont ceux que la v2
ajoute ou change.

L'idée est celle des briefs Tamila et Lorani : reprendre les briques des trois plus gros SaaS
américains de la location de véhicules, les fondre en un seul produit français qui suit chaque
véhicule et chaque location de bout en bout, et le faire mieux parce qu'il connaît le loueur
français (état des lieux contradictoire, franchise et barème de remise en état, assurance et
recours, PV et amendes, revente) et parce qu'il prouve chaque point. Tavaro existe : la v2
l'étend, elle ne repart pas de zéro.

## 0. Ce que la v2 change par rapport à ce qui est vendu aujourd'hui ◆

| Aujourd'hui (page et espace en ligne) | v2 | Pourquoi |
|---|---|---|
| Tavaro commence au RETOUR : il compare les photos de restitution à l'état des lieux de départ | Tavaro commence au DÉPART : l'état des lieux de départ est pris dans Tavaro (photos guidées, relevé compteur et carburant, signature), et c'est lui qui fait foi au retour (Module 1) | Les scanners d'inspection US (UVeye chez Hertz, ProovStation chez Sixt) gagnent sur la qualité de la prise de vue, pas sur la comparaison. Sans départ propre, le retour ne prouve rien. |
| Le dommage est chiffré sur le barème et facturé au client | Le dommage est chiffré, facturé, et SUIVI jusqu'au règlement ou au recours : franchise, assurance du client, assurance du loueur, contestation, encaissement (Module 2) | RentWorks et TSD tiennent la réclamation (claims) comme un dossier à part entière. Un dommage facturé et jamais encaissé n'est pas un dommage facturé. |
| L'entretien et la remise en location sont une liste du matin | Le véhicule a un DOSSIER du premier jour à la revente : kilométrage, entretiens, dommages, immobilisations, amendes, valeur de sortie (Module 3) | C'est la brique fleet des trois SaaS : la décision de sortir un véhicule se prend sur son dossier, pas sur son âge. |
| Les PV et amendes ne sont pas traités | Les amendes et les péages sont rattachés à la location et au conducteur, dans le délai de désignation (Module 4) | Une amende non désignée dans les 45 jours est payée par le loueur. C'est une perte nette et un sujet que les SaaS US traitent (toll and violation management). |
| Point du matin par agence | Point du matin par agence et page réseau ; chaque ligne porte sa preuve (Module 5) | Déjà en ligne, étendu. |

## 1. Vision en une phrase

Un SaaS français qui suit chaque véhicule d'un loueur du départ au retour et jusqu'à la sortie
de flotte : l'état des lieux de départ qui fait foi, le retour comparé photo par photo et chiffré
sur le barème du loueur, la réclamation suivie jusqu'au règlement ou au recours, les amendes
désignées dans le délai, l'entretien et la remise en location décidés sur le dossier du
véhicule, en lisant le logiciel de location et la télématique sans jamais y écrire, et en
remettant chaque matin à chaque agence la liste de ce qu'elle a à faire.

## 2. Les trois briques US reprises, et ce qu'on en fait de mieux ◆

| SaaS US | Ce qu'on lui reprend | Où ça va chez Tavaro | Ce que Tavaro fait de mieux |
|---|---|---|---|
| **UVeye** (chez Hertz) et **ProovStation** (chez Sixt) | L'inspection photo systématique au départ et au retour, la comparaison automatique des deux, la relecture par une personne avant toute facturation (Hertz : 97 % des véhicules rendus sans frais ; la contestation publique des frais pour des rayures mineures, 2025-2026) | Module 1 (départ), Module 2 (retour et réclamation) | Pas de portique à installer : les photos guidées depuis le téléphone de l'agent, sur un parcours imposé (les mêmes angles au départ et au retour), avec le relevé compteur et carburant ; la validation humaine avant facture, en règle et pas en option ; le barème de remise en état du loueur, pas une estimation de carrosserie américaine ; l'état des lieux contradictoire signé, opposable en cas de litige. |
| **RentWorks** (Bluebird) et **TSD RENTAL** | Le dossier de location de la réservation au contrat, à la facture et à la réclamation : réservation, contrat, état de la flotte, encaissements, inspections, réclamations, rapports (utilisation projetée, statut de flotte, exceptions de paiement) ; la comptabilité par export | Module 2 (réclamation), Module 3 (dossier du véhicule), Module 5 (page réseau) | Tavaro ne remplace pas le logiciel de location : il le lit et tient ce que celui-ci ne tient pas, la preuve et la décision. Le droit français du dépôt de garantie et de la franchise, le recours contre l'assurance du client, la contestation et ses délais. |
| **Samsara** et **Geotab** (télématique de flotte) | Le véhicule connecté : kilométrage réel, carburant, alertes d'entretien, localisation, immobilisation ; l'entretien préventif planifié sur l'usage, pas sur le calendrier | Module 3 (dossier du véhicule, entretien, sortie), Module 4 (amendes : qui conduisait, où, quand) | Tavaro lit la télématique déjà en place chez le loueur ; il n'impose pas un boîtier. La décision de sortie de flotte sur le dossier complet (dommages, immobilisations, valeur) ; l'entretien rattaché aux créneaux où le véhicule n'est pas loué. |

Écartés comme modèles produit : Rent Centric et HQ Rental (logiciels de location de taille
moyenne, même rôle que RentWorks et TSD) ; Ravin AI (recentré sur l'assurance et la
distribution) ; Chex.AI et Inspektlabs (inspection seule, pas de dossier de location).

Ce qui rend l'ensemble meilleur que la somme des trois : un seul fil du départ à la sortie de
flotte, là où les trois couvrent chacun un morceau (la photo, le contrat, le boîtier) ; la
preuve par point avec remboursement (section 8) ; la validation humaine avant chaque facture au
client, qui est aussi la réponse à la contestation publique des frais automatiques.

## 3. Problème adressé

Au retour, l'agent a trois minutes, un client pressé et un parking mal éclairé. Un dommage non
relevé au retour se facture rarement ; un dommage relevé sans photo de départ se conteste ; un
dommage facturé sans suivi n'est pas encaissé. La franchise est appliquée à l'estime, le
carburant au jugé, le retard oublié. Les amendes arrivent trois semaines après et sont payées par
le loueur quand personne n'a désigné le conducteur. L'entretien se fait quand ça casse, et le
véhicule immobilisé ne rapporte rien (galeres-metier-par-secteur.md §11 : 10 à 20 % du parc des
loueurs de matériel est quelque part sans qu'on sache où ni depuis quand ; la maintenance
préventive sacrifiée à l'urgence).

Les outils en place ne le font pas : le logiciel de location tient le contrat et la facture ; la
télématique tient le véhicule ; l'état des lieux est un papier ou une application de photos sans
comparaison ; personne ne tient la preuve, la réclamation et la décision ensemble.

## 4. Cible utilisateur

- **Primaire** : loueurs indépendants et réseaux régionaux de 30 à 500 véhicules, une à dix
  agences, un responsable de parc ; la décision revient au gérant ou au directeur du réseau.
- **Secondaire** : loueurs de 10 à 30 véhicules, par le plan Découverte.
- **Tertiaire (plus tard)** : franchisés de grandes enseignes et loueurs d'utilitaires, par
  forfait réseau.

Personas : le gérant (décide), le chef d'agence (utilise chaque matin), l'agent de comptoir
(fait les états des lieux), le responsable de parc (entretien et sortie), le comptable (encaisse
et recouvre).

## 5. Positionnement

« La couche de preuve et de décision qui manque au logiciel de location. » Tavaro s'ajoute au
logiciel de location et à la télématique en place. Il se distingue des applications d'état des
lieux (qui prennent des photos sans les comparer ni les chiffrer), des scanners d'inspection
(portique à installer, estimation américaine, facturation automatique contestée) et des
logiciels de location (qui tiennent le contrat mais pas la preuve). Il n'est ni un logiciel de
réservation, ni un boîtier, ni un outil de comptabilité.

## 6. Principes produit

1. **Le départ fait foi.** Pas de retour chiffré sans état des lieux de départ pris dans Tavaro,
   sur le parcours de photos imposé.
2. **Une personne valide chaque facture au client.** Tavaro prépare, l'agence décide.
3. **Le barème du loueur, pas une estimation.** Chaque dommage est chiffré sur la grille que le
   loueur a saisie, et la ligne de la grille est citée.
4. **Preuve par point.** La photo de départ, la photo de retour, le relevé compteur, la ligne du
   barème, le contrat : chaque euro facturé porte ses pièces.
5. **Lecture seule** du logiciel de location et de la télématique.
6. **Le délai avant la décision.** Une amende, une contestation, un recours ont un délai ;
   Tavaro le compte et le remonte avant qu'il expire.

## 7. Les cinq modules ◆

**Module 1 — L'état des lieux de départ** ◆ (brique UVeye / ProovStation, sans portique). Le
parcours de photos imposé (les mêmes angles pour tous les véhicules), le relevé compteur et
carburant, les dommages existants marqués, la signature du client, le document envoyé au client.
Hors ligne sur le parking, synchronisé ensuite.

**Module 2 — Le retour, le chiffrage et la réclamation** (déjà en ligne, étendu). La comparaison
photo par photo avec le départ ; chaque écart chiffré sur le barème ; carburant et retard
chiffrés ; la facture préparée et validée par l'agence ; puis la réclamation suivie : franchise,
dépôt de garantie, assurance du client, assurance du loueur, contestation et délais,
encaissement ou recours.

**Module 3 — Le dossier du véhicule, de l'entrée à la sortie** ◆ (brique Samsara / Geotab +
RentWorks). Kilométrage réel, entretiens faits et à faire sur l'usage, dommages et réparations,
immobilisations et leur coût, amendes, valeur et décision de sortie ; l'entretien planifié dans
les créneaux non loués ; la liste de remise en location du matin.

**Module 4 — Amendes, péages et désignation** ◆. Chaque avis rattaché à la location et au
conducteur par la date, l'heure et la télématique ; le délai de désignation compté ; le dossier
de désignation préparé ; la refacturation au client avec les pièces.

**Module 5 — Le point du matin et la page réseau** (déjà en ligne). Par agence : retours à
chiffrer, factures à valider, bloqués, remises en location, entretiens, amendes à désigner ;
par réseau : la même page agence par agence, et ce qui dépasse un délai.

## 8. Moteur transversal : lecture, comparaison, preuve ◆

- **Lecture** : contrats, clients, véhicules et encaissements du logiciel de location (export
  ou connecteur selon l'éditeur) ; kilométrage, carburant, alertes et positions de la
  télématique ; avis d'amende et relevés de péage.
- **Comparaison** : photo de départ ↔ photo de retour sur le même angle ; écart ↔ ligne du
  barème ; amende ↔ location et conducteur ; entretien ↔ usage réel.
- **Preuve par point** : chaque ligne facturée ou décidée porte ses pièces. Un écart sans photo
  de départ n'est pas chiffré.
- **Règle de remboursement** : la même que Tamila et Lorani (point valide, N et seuil à fixer
  après les pilotes, à écrire dans les CGV).

## 9. Intégrations

Logiciels de location en place chez les loueurs français (export ou connecteur selon
l'éditeur) ; télématique déjà installée (Samsara, Geotab, boîtiers constructeurs) ; courriel
et textos pour l'envoi des états des lieux et des factures ; la comptabilité par export. Aucune
écriture dans aucun de ces outils.

## 10. Modèle économique

Abonnement par parc selon le nombre de véhicules (Découverte 10 à 30, Agence 30 à 120, Réseau
120 à 500, Réseau national au-delà), prix à fixer après les pilotes (`prix: null` sur le site
tant que Teo n'a pas tranché). Installation comprise ; les textos au coût du fournisseur.

## 11. MVP ◆

Module 1 (le départ) + Module 2 jusqu'à la facture validée (déjà en ligne) + Module 5 (déjà en
ligne). La réclamation suivie, le dossier du véhicule et les amendes viennent après les premiers
loueurs pilotes.

## 12. Non-objectifs

Pas de réservation, pas de contrat, pas de facturation à la place du logiciel de location. Pas de
portique ni de boîtier. Pas de facture envoyée au client sans validation d'une personne. Pas
d'estimation de carrosserie en dehors du barème saisi par le loueur. Pas de chiffre de
recouvrement promis.

## 13. Indicateurs de succès

Mesurés sur les loueurs pilotes, jamais affichés avant : retours chiffrés le jour même ; écarts
facturés avec photo de départ et de retour ; réclamations encaissées ou closes dans le délai ;
amendes désignées dans le délai ; jours d'immobilisation par véhicule.

## 14. Risques et parades

| Risque | Parade |
|---|---|
| Un état des lieux de départ bâclé rend le retour contestable | Parcours de photos imposé, impossible à sauter ; la facture ne se prépare pas sans départ complet |
| Facturation automatique contestée (le reproche fait aux scanners US) | Validation humaine obligatoire avant chaque facture, et la contestation est un état du dossier, pas une exception |
| Logiciel de location sans export | Commencer par les éditeurs qui exportent ; dire au loueur, avant l'installation, ce qui sera lu |
| Télématique absente | Le Module 3 tourne sur les relevés compteur des états des lieux ; la télématique l'affine |
| Chiffres d'éditeurs US repris par réflexe | Aucun chiffre sur la page sans source publique datée (doctrine §5) |

## 15. Ce que le prompt doit produire, dans cet ordre

1. Le PRD du MVP seul (section 11), à partir des écrans de `/espace2/tavaro` déjà construits.
2. L'architecture du MVP : prise de photos hors ligne, comparaison sur le même angle, barème,
   journal des validations.
3. Le plan pilotes : dix loueurs de 30 à 500 véhicules, protocole de mesure des points confirmés.
4. Ensuite seulement : la page `/secteurs/location-automobile` mise à jour (modules et
   promesses), avec la recette aux cinq largeurs et la mise en ligne habituelle.
