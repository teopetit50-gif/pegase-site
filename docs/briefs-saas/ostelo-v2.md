# Ostelo v2 — le séjour suivi de la demande au dernier euro encaissé

Brief produit, version 2 du 11/11/2026. Ostelo (NOM DE TRAVAIL) n'a pas de logiciel en ligne :
la page `/secteurs/hotellerie` en est la vitrine depuis le 04/11 (« L'argent qui se perd entre
vos logiciels, Ostelo le récupère » : commissions facturées à tort, cartes virtuelles jamais
débitées, extras absents de la note, demandes à toute heure, chambres annulées reproposées,
surclassement avant l'arrivée, avis, anciens clients, séminaires). La v1, c'est cette page. Les
passages marqués ◆ sont ceux que la v2 ajoute ou change. Teo a demandé les briefs pour les
logiciels en ligne, BTP excepté ; celui-ci est écrit en plus, sur le même modèle, pour que le
jour où Ostelo se construit, il se construise comme les autres.

L'idée est celle des briefs Tamila et Lorani : reprendre les briques des trois plus gros SaaS
américains de l'hôtel indépendant, les fondre en un seul produit français qui suit chaque séjour
de bout en bout, et le faire mieux parce qu'il connaît l'hôtel français (taxe de séjour,
facturation des séminaires, le rôle des OTA dans un établissement de 20 à 120 chambres,
l'hébergement en Europe) et parce qu'il prouve chaque point.

## 0. Ce que la v2 change par rapport à ce qui est vendu aujourd'hui ◆

| Aujourd'hui (page en ligne) | v2 | Pourquoi |
|---|---|---|
| Six fonctions juxtaposées (demandes, chambres annulées, propositions avant l'arrivée, extras, avis, anciens clients et séminaires) | Les mêmes, rangées sur UN FIL : la demande, la réservation, l'avant-séjour, le séjour, le départ, l'après (commission, carte virtuelle, avis, retour) — et un point du matin pour la réception | Les trois SaaS US vendent chacun une étape ; la page vend une liste. Un séjour se suit dans l'ordre. |
| « Commissions facturées à tort » comme première promesse | La commission vérifiée devient l'étape « après le départ » : chaque réservation OTA rapprochée de la facture de commission et du relevé de carte virtuelle (Module 6) | C'est la vraie douleur, et aucun des trois gros SaaS ne la tient ; elle reste, mais à sa place dans le fil. |
| Le surclassement proposé avant l'arrivée | L'avant-séjour complet : message de bienvenue, surclassement et extras proposés au bon moment, enregistrement préparé (Module 3, brique Canary) | Canary gagne sur la proposition avant l'arrivée ; on en fait l'étape 3, pas une fonction isolée. |
| Aucune lecture du canal de distribution | Ostelo lit le gestionnaire de canaux et le logiciel de réservation (PMS) en lecture seule ; il ne les remplace pas (Module 2, brique SiteMinder) | Un hôtel de 20 à 120 chambres a déjà un PMS et un channel manager ; on les lit, on ne les refait pas. |
| Aucun prix, aucune traction, aucun client réel | Inchangé | Doctrine. |

## 1. Vision en une phrase

Un SaaS français qui suit chaque séjour d'un hôtel indépendant de la demande au dernier euro
encaissé : la demande traitée à toute heure dans la langue du client, la réservation lue d'où
qu'elle vienne, l'avant-séjour préparé, le séjour et ses extras tenus sur la note, le départ
sans oubli, puis l'après — la commission de l'OTA vérifiée, la carte virtuelle débitée, l'avis
suivi, l'ancien client revu — en lisant le logiciel de réservation, le gestionnaire de canaux, le
restaurant et le spa sans jamais y écrire, et en remettant chaque matin à la réception ce que la
nuit a laissé.

## 2. Les trois briques US reprises, et ce qu'on en fait de mieux ◆

| SaaS US | Ce qu'on lui reprend | Où ça va chez Ostelo | Ce que Ostelo fait de mieux |
|---|---|---|---|
| **Canary Technologies** (messagerie, enregistrement, upsell, paiements) | Les messages au client avant, pendant et après le séjour ; l'enregistrement numérique ; les propositions de surclassement et d'extras au bon moment ; le paiement sécurisé | Module 1 (la demande), Module 3 (l'avant-séjour), Module 4 (le séjour) | La langue du client et la règle de l'hôtel validée une fois (quoi proposer, à qui, quand) ; aucun message envoyé sans règle validée ; l'extra proposé rattaché à la note dès qu'il est accepté. Aucun chiffre de « x4 » repris. |
| **SiteMinder** (gestionnaire de canaux, distribution) | La lecture de toutes les réservations, directes et OTA, avec leur canal, leur tarif, leurs conditions et leur mode de paiement ; les disponibilités à jour sur tous les canaux | Module 2 (la réservation), Module 6 (l'après : commission et carte virtuelle) | Ostelo ne distribue pas : il lit ce que le gestionnaire de canaux et le PMS savent, et c'est de là qu'il rapproche la commission facturée du tarif réellement payé et la carte virtuelle de l'encaissement. |
| **Duetto** (gestion du revenu) | La décision de prix et de disponibilité par jour, par canal et par segment, à partir de la demande et de l'historique | Module 5 (le point du matin : chambres annulées reproposées, dates à tenir, séminaires) | Pas de tarification automatique au MVP : Ostelo propose, l'hôtelier décide ; la chambre annulée est reproposée à la liste d'attente avant d'être rouverte aux canaux. |

Écartés comme modèles produit : Cloudbeds et Mews (logiciels de réservation : Ostelo s'y branche,
il ne les remplace pas) ; les chatbots de réservation seuls (une étape, pas un fil).

Ce qui rend l'ensemble meilleur que la somme des trois : un seul fil de la demande à l'euro
encaissé ; la vérification des commissions et des cartes virtuelles, qu'aucun des trois ne
tient ; la preuve par point (section 8) ; la lecture seule et l'hébergement en Europe.

## 3. Problème adressé

La réception ferme à 22 h, les demandes arrivent toute la nuit, dans trois langues ; la chambre
annulée à 23 h reste vide ; l'extra du restaurant n'est pas sur la note au départ ; la
commission de l'OTA est payée sur le tarif affiché et pas sur le tarif réellement réglé après
annulation partielle ; la carte virtuelle d'une réservation prépayée n'a jamais été débitée ; la
facture du séminaire part trois semaines après l'événement. Chaque outil tient son morceau
(PMS, gestionnaire de canaux, caisse du restaurant, logiciel du spa) et personne ne lit les
quatre ensemble.

## 4. Cible utilisateur

- **Primaire** : hôtels indépendants de 20 à 120 chambres, avec restaurant ou spa, un directeur
  ou un propriétaire exploitant, une réception de 2 à 6 personnes.
- **Secondaire** : boutique-hôtels de moins de 20 chambres, par le plan Découverte.
- **Tertiaire (plus tard)** : groupes de 3 à 15 hôtels, par la page direction.

Personas : le directeur (décide), la réception (utilise chaque matin), le responsable
hébergement (chambres et extras), le comptable (commissions, cartes virtuelles, séminaires).

## 5. Positionnement

« La couche qui lit vos logiciels et suit chaque séjour jusqu'au dernier euro. » Ostelo
s'ajoute au PMS, au gestionnaire de canaux, à la caisse et au spa. Il se distingue des
chatbots (une étape), des gestionnaires de canaux (la distribution, pas la vérification) et des
outils de revenu (le prix, pas le séjour). Il n'est ni un PMS, ni un moteur de réservation, ni
un gestionnaire de canaux, ni un outil de tarification automatique.

## 6. Principes produit

1. **Lecture seule** du PMS, du gestionnaire de canaux, de la caisse et du spa.
2. **Une règle validée avant tout message** : quoi proposer, à qui, quand, dans quelle langue.
3. **Chaque euro a sa pièce** : la commission vérifiée cite la réservation, le tarif payé et la
   facture ; l'extra cite le ticket ; la carte virtuelle cite le relevé.
4. **La réception décide** : Ostelo prépare la réponse, la proposition, la note ; une personne
   valide ce qui engage l'hôtel.
5. **Données en Europe**, aucun entraînement sur les données des clients, journal des accès.

## 7. Les six modules ◆

**Module 1 — La demande, à toute heure.** La réponse préparée dans la langue du client, à partir
des disponibilités lues ; la réservation proposée ; ce qui sort de la règle passe à la réception
le matin.

**Module 2 — La réservation, d'où qu'elle vienne** (brique SiteMinder). Chaque réservation lue
avec son canal, son tarif, ses conditions, son mode de paiement et sa carte virtuelle ; la
chambre annulée reproposée à la liste d'attente avant d'être rouverte.

**Module 3 — L'avant-séjour** (brique Canary). Le message de bienvenue, le surclassement et les
extras proposés au bon moment selon la règle de l'hôtel ; l'enregistrement préparé ; les
demandes particulières rattachées au séjour.

**Module 4 — Le séjour et le départ.** Les extras du restaurant et du spa rapprochés de la note
au fil du séjour ; au départ, la note complète, la taxe de séjour, rien d'oublié.

**Module 5 — Le point du matin de la réception** (brique Duetto, sans tarification automatique).
Les demandes de la nuit traitées et celles à reprendre ; les chambres annulées reprises ou à
rouvrir ; les arrivées avec leurs propositions ; les départs avec les extras à vérifier ; les
séminaires à facturer ; les dates à tenir.

**Module 6 — L'après : commission, carte virtuelle, avis, retour** ◆. Chaque réservation OTA
rapprochée de la facture de commission (tarif réellement payé, annulations, no-show) ; chaque
carte virtuelle rapprochée de l'encaissement ; l'avis suivi et la réponse préparée ; l'ancien
client revu au bon moment, selon la règle.

## 8. Moteur transversal : lecture, rapprochement, preuve ◆

Lecture du PMS, du gestionnaire de canaux, de la caisse et du spa (export ou connecteur selon
l'éditeur) ; rapprochement réservation ↔ commission ↔ encaissement, séjour ↔ extras ↔ note,
demande ↔ disponibilité ↔ règle ; preuve par point et règle de remboursement communes aux
autres briefs (point valide, N et seuil à fixer après les pilotes).

## 9. Intégrations

PMS et gestionnaires de canaux des hôtels indépendants français (export ou connecteur selon
l'éditeur), caisse du restaurant, logiciel du spa, messagerie et textos, relevés des cartes
virtuelles. Aucune écriture dans aucun de ces outils.

## 10. Modèle économique

Abonnement par hôtel selon le nombre de chambres (Découverte moins de 20, Hôtel 20 à 60,
Établissement 60 à 120, Groupe), prix à fixer après les pilotes (`prix: null` sur le site tant
que Teo n'a pas tranché).

## 11. MVP ◆

Module 5 (le point du matin) + Module 6 (commission et carte virtuelle vérifiées) + Module 4
(extras rapprochés de la note). La demande à toute heure et l'avant-séjour viennent après les
premiers hôtels pilotes, une fois les règles de message validées.

## 12. Non-objectifs

Pas de PMS, pas de moteur de réservation, pas de distribution, pas de tarification automatique,
pas de message envoyé sans règle validée, pas de chiffre de revenu promis.

## 13. Indicateurs de succès

Mesurés sur les hôtels pilotes : commissions contestées et recouvrées ; cartes virtuelles
débitées dans le délai ; extras présents sur la note au départ ; chambres annulées reprises ;
demandes de la nuit traitées avant 8 h.

## 14. Risques et parades

| Risque | Parade |
|---|---|
| Un PMS sans export | Commencer par les éditeurs qui exportent ; dire à l'hôtel ce qui sera lu |
| Un message envoyé hors règle | Aucun envoi automatique au MVP ; règle validée par l'hôtel avant |
| La vérification des commissions contestée par l'OTA | Chaque écart cite la réservation, le tarif payé et la facture ; l'hôtel décide de contester |
| Le nom Ostelo | Nom de travail ; à trancher avant la première vente |

## 15. Ce que le prompt doit produire, dans cet ordre

1. Le PRD du MVP seul (section 11).
2. L'architecture : lecture du PMS et du gestionnaire de canaux, rapprochement commission ↔
   encaissement, journal.
3. Le plan pilotes : cinq hôtels de 20 à 120 chambres.
4. Ensuite seulement : la page `/secteurs/hotellerie` mise à jour, recette aux cinq largeurs,
   mise en ligne habituelle.
