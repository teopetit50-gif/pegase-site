# Chiffrage TAVARO — /secteurs/location-automobile (ouvrier B2, 06/10/2026, 20 h 30 Z)

Demandé par Teo le 06/10 à 19 h 50 Z : « estime ce qui reste à construire pour avoir vraiment un truc livrable, et vérifie
toutes les petites promesses ». Lu sur main c0494b4, la vitrine de 15 h 55 ; aucun fichier du site n'a été modifié.
Les lignes renvoient à `components/secteurs/location/textes.ts` (abrégé `textes.ts`) et à
`app/secteurs/location-automobile/page.tsx`. Les lignes 07 à 10 et 20 sont chiffrées par B3 dans son propre fichier ; je les
reprends ici par renvoi.

**États** : **A** prouvé en vrai (banc, courriel réellement remis) · **B** construit et testé sur la recette (pgTAP vert, écran
recetté) · **C** partiel · **D** pas construit · **T** dépend d'un tiers, d'un compte ou d'un achat de Teo.
**Jours** : jours de travail d'un ouvrier, écran et tests compris ; « →B » depuis l'état actuel, « →A » ensuite, de B jusqu'à
la preuve en vrai.

## Synthèse

1. **Par état, sur 47 promesses comptées** : A 5 · B 18 · C 15 · D 7 · D/T 2. Ne sont pas comptés à part : les
   « hors produit », les renvois à B3 et les doublons. Six modules entiers ne sont pas construits : 04 Assistance,
   06 Questions, 11 Transferts, 13 Péages, 18 Sinistres, 19 Relevés constructeur.
2. **Jours →B** : environ **87 j** pour tout ce qui reste à construire chez moi, hors B3.
   - Le cœur de la facturation des retours n'en demande que **≈ 8,5** (photos du départ jointes, connecteur, outil
     d'audit, indicateur, personne nommée), plus **8 j** si l'on construit vraiment la comparaison d'images au lieu
     de reprendre la phrase.
   - Le reste va aux modules entiers : Assistance ≈ 15 j, Questions ≈ 10 j, Sinistres ≈ 10 j, Péages ≈ 8 j,
     Transferts ≈ 7 j, Relevés constructeur ≈ 6 j.
3. **Jours →A** : environ **37 j**, dont ≈ 12 pour prouver en vrai ce qui est déjà en B : courriel avec PDF, état des
   lieux sur un vrai téléphone, contestation envoyée, atelier prévenu, remises, flotte. Le reste prouve les modules
   à construire.
4. **Tiers et achats** :
   - un abonnement de voix pour l'Assistance (numéro, agent vocal, environ 0,10 à 0,20 € la minute) et une grille de
     dépanneurs sous contrat ;
   - un agrégateur de données constructeur pour les relevés (environ 3 à 8 € par véhicule et par mois) ;
   - un compte flotte chez les sociétés d'autoroute en flux libre, ou un badge de télépéage de flotte, pour les péages ;
   - un modèle de langage pour les Questions (quelques dizaines d'euros par mois) ;
   - une API de cote (Argus ou Autovista) si la cote ne se saisit plus à la main ;
   - **le connecteur vers l'export du logiciel de réservation du premier loueur**, à cadrer sur son fichier : 2 à 4 jours.
5. **Pour UN premier loueur réel** (module 01, facturation des retours, celui que vend l'audit) :
   - le connecteur de son export (2 à 4 j) ;
   - son barème réel et les mentions de l'émetteur (avec Teo, 0,5 j) ;
   - le réglage d'envoi de production et la politique Storage pour les photos (coordinateur, 0,5 j) ;
   - les photos du départ jointes au courriel (0,5 j) ;
   - un essai sur un vrai téléphone en agence : prise de vue, signature, courriel avec PDF (1 à 2 j) ;
   - l'indicateur unique de fin de mois (1 j).

   Soit **≈ 8 à 10 jours**, plus une journée sur place.
6. **Avis honnête** : le module 01 tient, avec ce qui l'entoure de près : état des lieux signé, amendes, contestations,
   remise en location, entretien, sortie de flotte. Sa mécanique est prouvée jusqu'au courriel remis, et le reste est
   testé. En revanche, **la page promet plus que le produit** sur trois points :
   - « Tavaro **compare les photos** » : aujourd'hui, l'agent note les dommages zone par zone, photo à l'appui, et Tavaro
     compare ces zones au départ ; aucune vision ne compare les images ;
   - **l'Assistance** au téléphone n'est pas construite ;
   - **les Questions** en français ne sont pas construites.

   Deux phrases se contredisent avec « rien ne s'y branche » : le rappel qui « retire des réservations » et le dossier
   « résumé dans votre logiciel ». Tavaro ne peut que prévenir ; il n'écrit pas dans le logiciel du loueur.

## Le détail

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours →B / →A | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| 1 | « Tavaro · chaque restitution facturée sur votre barème » | page.tsx:92 | A | banc_01 (06/10, 00 h 26 Z) : retour chiffré sur le barème publié, FA-2026-000001/2 émises et envoyées, courriel remis | — | 0 / 0 | — |
| 2 | « Tavaro rapproche les photos de restitution de l'état des lieux de départ, chiffre le carburant, le retard et les dommages selon votre barème de remise en état, puis prépare la facture que l'agence valide. » | page.tsx:94 | C | chiffrage et validation : A (banc) ; rapprochement par zones avec le départ signé : B (b2_05, test 14) | « rapproche les photos » : la comparaison se fait sur les dommages notés, pas sur les images (voir 5) | voir 5 | — |
| 3 | « Produit français », « Conçu et développé en France » | textes.ts:48-49 | hors produit | — | à confirmer par Teo (fait de l'entreprise) | — | — |
| 4 | « Un dommage non relevé au retour se facture rarement. » | textes.ts:52-54 | hors produit | constat de métier | — | — | — |
| 5 | « Au retour du véhicule, Tavaro compare les photos de restitution à l'état des lieux de départ » | textes.ts:56 | C | b2_05 : les zones déjà notées au départ ne sont pas facturées ; écran « ne sera pas facturé » avant le clic | **une vraie comparaison d'images** (vision : dommage visible au retour et absent de la photo du départ, même angle) ; sinon, réécrire en « compare les dommages relevés » | 8 / 3 | modèle de vision : ≈ 0,01 à 0,03 € par photo |
| 6 | « puis chiffre le carburant, le retard et les dommages selon votre barème de remise en état » | textes.ts:56 | A | banc_01 : 418,20 € (frais 238,20, dommages 180) | — | 0 / 0 | — |
| 7 | « Chaque facture part avec les photos datées du départ et du retour, après validation de l'agence. » | textes.ts:56 | C | validation : A ; PDF et photos du **retour** joints : B (b2_08, test 17 ; tavaro-pdf déployé) | joindre aussi les photos **du départ** (l'état des lieux signé) ; courriel avec pièces à prouver sur le banc | 0,5 / 0,5 | — |
| 8 | « Tavaro chiffre chaque restitution sur votre barème et prépare la facture avec ses preuves, que l'agence valide avant envoi. » | textes.ts:57 | B | b2_08, test 17 (PDF et photos datées) ; validation : A | prouver le courriel avec pièces jointes sur le banc | 0 / 0,5 | — |
| 9 | « Tavaro lit ce que vos agences produisent déjà : les photos de retour, les contrats, le planning et la messagerie d'équipe. » | textes.ts:84 | C | photos (écran, bucket), contrats et réservations (relevé de l'export, A sur le banc) | **la messagerie d'équipe** n'est pas lue | 4 / 1 | T : connecteur WhatsApp Business, Slack ou Teams selon le loueur |
| 10 | « Avant l'ouverture du comptoir, chaque agence reçoit une page qui décrit l'état de son parking et les décisions qui l'attendent. » | textes.ts:84 | C | le socle dépose chaque matin la section « Facturation des retours » (valideur) et « réseau » (gérant) | ajouter à la page du matin les remises, l'entretien, les avis et les contestations par agence | 2 / 1 | — |
| 11 | « Votre logiciel de réservation reste en place, et rien ne s'y branche. » | textes.ts:86 | A | les contrats arrivent par l'export (relevé), prouvé sur le banc | le connecteur de l'export **du** logiciel du premier loueur | 3 / 1 | — |
| 12 | « Chaque retour, facture, remise en état ou incident est attribué à une personne nommée. » | textes.ts:87 | C | retour : qui a chiffré ; facture : qui a validé (A) ; anomalie : personne nommée obligatoire (b2_10) | remise : la personne est facultative (à rendre obligatoire ou automatique par agence) ; **incident** : pas construit (04, 18) | 1 / 0,5 | — |
| 13 | « Le point du matin fonctionne de la même façon pour une agence ou pour quarante, sans migration d'outil. » | textes.ts:88 | C | sections par entité et par rôle du socle | voir 10 | (inclus en 10) | — |
| 14 | « À chaque restitution, l'agent photographie le véhicule avec son téléphone. » | textes.ts:99 | B | écran : dépôt de photo dans omega-clients, mesure de netteté (b2_07) | essai sur un vrai téléphone en agence ; politique Storage INSERT en production | 0 / 1 | — |
| 15 | « Tavaro compare ces photos à l'état des lieux de départ » | textes.ts:99 | C | = 5 | = 5 | (en 5) | (en 5) |
| 16 | « relève le carburant, le kilométrage, le retard et les dommages nouveaux » | textes.ts:99 | C | retard calculé (A) ; carburant et km **saisis** par l'agent ; dommages nouveaux par zone | lecture automatique du compteur et de la jauge sur la photo (vision), ou relevés constructeur (19) | 3 / 1 | modèle de vision (voir 5) |
| 17 | « puis prépare la facture avec les preuves jointes » | textes.ts:99 | B | b2_08, test 17 | = 8 | 0 / (en 8) | — |
| 18 | « Comme le client signe l'état des lieux au départ et au retour, le dossier tient aussi devant sa banque s'il conteste. » | textes.ts:99 | B | b2_05 (signature, empreinte SHA-256), b2_09 (dossier de contestation, test 18), PDF du dossier | une contestation réelle envoyée et reçue | 0 / 1 | — |
| 19 | « L'audit commence par vingt retours, pour mesurer ce qui a été facturé et ce qui ne l'a pas été. » | textes.ts:101 | D | — | un outil d'audit : reprendre vingt retours passés (export et photos), les rechiffrer sur le barème, et comparer à ce qui a été facturé. Faisable à la main, mais pas outillé | 3 / 1 | — |
| 20 | « Chaque poste de frais est chiffré selon votre barème et la franchise du contrat. » | textes.ts:102 | A | barème : banc ; plafond de franchise : test 04 (B) | — | 0 / 0 | — |
| 21 | « L'agence valide ou refuse chaque facture, et Tavaro n'en envoie aucune sans cette validation. » | textes.ts:103 | A | banc_01 : demande approuvée par une autre personne (séparation prouvée, test 05) | — | 0 / 0 | — |
| 22 | « Dès qu'un véhicule rentre, Tavaro crée la tâche d'inspection, de nettoyage et de recharge avec l'heure du prochain départ. » | textes.ts:114 | B | b2_10, test 19 (déclencheurs sur le retour, prochain départ) | rejouer b2_10 en 928b937 ; une remise réelle sur le banc | 0 / 1 | — |
| 23 | « L'entretien est placé dans les creux du planning, hors des réservations, si bien que l'atelier n'immobilise pas un véhicule attendu. » | textes.ts:114 | B | b2_10 : créneaux hors contrats, réservations et immobilisations ; planification refusée sur une réservation | proposé, pas placé d'office : l'agence choisit le créneau (conforme au « vous validez ») | 0 / 0,5 | — |
| 24 | « Un véhicule parti chez le carrossier garde sa date de retour » | textes.ts:114 | B | b2_10 (date de retour obligatoire, alerte au dépassement), test 19 | — | 0 / 0,5 | — |
| 25 | « et un rappel du constructeur le retire des réservations. » | textes.ts:114 | C | b2_10 : immobilisation « rappel » ; les réservations à réaffecter sont listées et alertées | Tavaro ne peut pas retirer une réservation du logiciel du loueur (« rien ne s'y branche ») ; à réécrire en « signale les réservations à réaffecter » | 0 (texte) / — | — |
| 26 | « Le retour crée la tâche sur la messagerie de l'équipe, avec l'heure limite. » | textes.ts:116 | C | la tâche et l'heure limite (B) ; l'alerte part dans Omega (centre d'alertes) | l'envoi sur la messagerie d'équipe | 2 / 1 | T : comme en 9 |
| 27 | « Le responsable est alerté dès que la remise en location risque de manquer le prochain départ. » | textes.ts:117 | B | b2_10 : cron tavaro-parc (risque, retard), alerte au responsable | prouver en vrai | 0 / 0,5 | — |
| 28 | « Chaque anomalie de retour remonte à une personne nommée. » | textes.ts:118 | B | b2_10 : personne obligatoire, prévenue ; test 19 | — | 0 / 0,5 | — |
| 29 | « Quand un client appelle un dimanche soir pour une panne, un accident ou une clé perdue, l'assistant de Tavaro répond, ouvre le dossier et envoie la dépanneuse selon votre grille. » | textes.ts:129 | D | — | un agent vocal, le dossier d'incident, la grille de dépannage et l'envoi au dépanneur | 12 / 4 | T : numéro et agent vocal (≈ 0,10 à 0,20 €/min) ; dépanneurs sous contrat |
| 30 | « Il prévient l'agence, puis transfère l'appel à une personne dès que la situation sort de la grille, avec l'historique de l'échange. » | textes.ts:129 | D | — | transfert d'appel avec le résumé de l'échange | 3 / 1 | T (même fournisseur) |
| 31 | « Le dossier d'accident est ensuite suivi jusqu'au règlement. » | textes.ts:129 | D | — | = 18 Sinistres | (en 47) | — |
| 32 | « Le pilote couvre un seul type d'incident courant, puis s'élargit. » | textes.ts:131 | hors produit | méthode | — | — | — |
| 33 | « Le dossier est ouvert et résumé dans votre logiciel, avec l'heure et le contrat. » | textes.ts:132 | D | — | contredit « rien ne s'y branche » : le dossier peut s'ouvrir dans Omega, pas dans le logiciel du loueur ; à réécrire | (en 29) | — |
| 34 | « Les cas difficiles passent à une personne, qui reçoit tout le contexte. » | textes.ts:133 | D | — | = 30 | (en 30) | — |
| 35 | « Tavaro tient une fiche économique par véhicule, avec son revenu, son entretien, ses jours d'immobilisation et sa valeur de revente. » | textes.ts:144 | B | b2_11, test 20 (vert, lot h1930) | le revenu est estimé sur le tarif journalier du contrat (et non encaissé) ; la cote se saisit à la main | 0 / 1 | T facultatif : API de cote (Argus ou Autovista) |
| 36 | « Il désigne ceux qui coûtent plus qu'ils ne rapportent, puis propose le moment et le canal de revente. » | textes.ts:144 | B | b2_11 : avis, raisons, moment, canal | — | 0 / 0,5 | — |
| 37 | « Chaque véhicule est comparé à son prix de revente réel plutôt qu'à sa valeur comptable. » | textes.ts:146 | B | b2_11 : perte de valeur lue sur la cote réelle (source et date obligatoires) ; écart avec la valeur comptable affiché | — | 0 / 0,5 | (voir 35) |
| 38 | « La décision de vendre, de garder ou de renouveler se prend véhicule par véhicule, chiffres à l'appui. » | textes.ts:147 | B | b2_11 + écran Flotte | « renouveler » n'est qu'un avis : le remplacement n'est pas proposé (lié au plan de flotte, B3) | 0 / 0 | — |
| 39 | « La direction valide chaque mise en vente, et le journal en garde la trace. » | textes.ts:148 | B | b2_11 : validation par la direction, jamais par la personne qui propose ; journal ; b2_11b (le véhicule vendu ne revient pas par import) | — | 0 / 0,5 | — |
| 40 | 01 « Chaque restitution est comparée à l'état des lieux de départ, puis chiffrée selon votre barème. L'agence valide la facture avant envoi. » | textes.ts:162 | A/C | chiffrage et validation : A ; comparaison : voir 5 | voir 5 | (en 5) | — |
| 41 | 02 « La tâche d'inspection, de nettoyage et de recharge est créée dès le retour, et le responsable est alerté si le prochain départ est menacé. » | textes.ts:163 | B | = 22 et 27 | — | 0 / (en 22) | — |
| 42 | 03 « Tavaro place les révisions dans les creux du planning, hors des réservations, et prévient l'atelier à l'avance. » | textes.ts:164 | B | b2_10 : créneaux ; atelier prévenu par courriel (preparer_envoi, validation) | un courriel d'atelier réel | 0 / 0,5 | — |
| 43 | 04 « L'assistant répond à l'appel, ouvre le dossier, envoie la dépanneuse selon votre grille et prévient l'agence. » | textes.ts:165 | D/T | — | = 29 et 30 | (en 29) | T (en 29) |
| 44 | 05 « Tavaro rapproche le revenu, l'entretien, l'immobilisation et la valeur de revente de chaque véhicule pour désigner ceux qui coûtent plus qu'ils ne rapportent. » | textes.ts:166 | B | = 35 et 36 | — | 0 / (en 35) | — |
| 45 | 06 « Posez une question en français : Tavaro répond chiffres à l'appui, avec la cause de l'écart et la décision proposée. » | textes.ts:167 | D | — | des questions en langage naturel, traduites en lectures bornées des tables de l'agence (jamais d'écriture), avec la réponse, la cause et la décision proposée | 10 / 2 | T : modèle de langage (≈ 20 à 80 €/mois) |
| 46 | 07 Réservations à risque · 08 Montée en gamme · 09 Contrats à risque · 10 Véhicules inactifs | textes.ts:168-171 | voir B3 | branche worker-b3, b3t_01 et b3t_02 | chiffré par B3 dans son fichier | — | — |
| 47 | 11 « Tavaro organise les transferts entre agences avant le pic de demande, en une seule tournée, selon les réservations de chaque site. » | textes.ts:172 | D | — | prévision de la demande par agence et par catégorie (réservations), proposition de transferts, tournée unique (convoyeur), validation | 7 / 2 | — |
| 48 | 12 « L'agent est guidé angle par angle, la photo floue est refusée, puis le client signe l'état des lieux au départ comme au retour. » | textes.ts:173 | B | b2_05 (quatre vues obligatoires, signature, refus constaté), b2_07 (photo floue refusée, test 16), recette avec de vraies photos | « guidé angle par angle » : la liste des vues est montrée, mais il n'y a pas d'assistant de prise de vue pas à pas ; essai sur téléphone | 1 / 1 | — |
| 49 | 13 « Chaque passage sous un portique sans barrière est rattaché au contrat, payé dans les 72 heures, puis refacturé au client. » | textes.ts:174 | D/T | — | récupérer les passages (compte flotte ou export de l'opérateur), les rapprocher du contrat (plaque et heure, comme les avis b2_03), suivre le paiement sous 72 h, refacturer par une ligne du barème | 8 / 2 | T : compte flotte en flux libre (A79, A13/A14…) ou badge de télépéage de flotte |
| 50 | 14 « Chaque avis de contravention est rapproché du contrat, et le locataire est désigné dans les 45 jours. Les frais de dossier lui sont refacturés. » | textes.ts:175 | B | b2_03 (rapprochement, échéance, alertes), b2_04 (identité gardée un an), b2_07 (frais refacturés), tests 12, 13, 16 | la désignation elle-même se fait sur le site de l'ANTAI : Tavaro tient le délai et prépare les données ; le fichier de désignation par lot reste à produire | 1,5 / 1 | — |
| 51 | 15 « Un véhicule rappelé par le constructeur, ou dont le contrôle technique arrive à échéance, sort des réservations. Sa vignette Crit'Air est rappelée au comptoir. » | textes.ts:176 | C | rappel et contrôle technique : immobilisation, alerte, réservations à réaffecter (b2_10) | « sort des réservations » (voir 25) ; **Crit'Air au comptoir** pas construit (classe sur le véhicule, rappel au départ dans les zones à faibles émissions) ; les rappels se saisissent à la main | 1 / 0,5 | T facultatif : relevés constructeur (19) pour les rappels par numéro de série |
| 52 | 16 « Chaque véhicule chez le carrossier garde une date de retour. Si cette date manque ou tombe après le pic, Tavaro propose des transferts. » | textes.ts:177 | C | date de retour obligatoire et alerte au dépassement (B) | « propose des transferts » attend 11 | (en 47) | — |
| 53 | 17 « Quand un client conteste auprès de sa banque le débit des dommages, le dossier part en un clic : état des lieux signé, photos datées, barème appliqué et contrat. » | textes.ts:178 | B | b2_09, b2_09b, test 18 (30/30) ; PDF du dossier (tavaro-pdf v2) | envoyer un dossier réel | 0 / 1 | — |
| 54 | 18 « Chaque accident est suivi du constat au règlement, et le recours contre l'assureur du client est préparé pour les jours d'immobilisation. » | textes.ts:179 | D | — | dossier de sinistre (constat, photos, expert, assureur, échéances) et recours chiffré (jours d'immobilisation × tarif, lus sur loc_immobilisations), courrier de recours | 10 / 2 | — |
| 55 | 19 « Le carburant, le kilométrage et la charge de la batterie sont lus auprès du constructeur au moment du retour, puis confirment ce que montrent les photos. » | textes.ts:180 | D/T | — | contrat d'interface écrit côté module (carnet, point 4) ; branchement chez un agrégateur, puis pré-remplissage du retour | 6 / 2 | T : agrégateur (High Mobility, Mobilisights, Smartcar…), ≈ 3 à 8 € par véhicule et par mois, consentement du propriétaire |
| 56 | 20 Plan de flotte | textes.ts:181 | voir B3 | marqué « à venir » sur la page | chiffré par B3 | — | — |
| 57 | « Vingt retours suffisent à mesurer ce qui n'a pas été facturé » ; « Le premier module s'installe là où l'écart est le plus grand, pour quatre semaines, et un seul indicateur est lu à la fin du mois. » | textes.ts:187-189 | C | méthode ; l'écran montre « à encaisser » | l'outil d'audit (voir 19) ; l'indicateur unique de fin de mois (€ facturés pour 100 retours, avant et après) | 1 / 0,5 | — |
| 58 | « Il prend en charge ce qui se passe entre deux contrats : […] le garage et les rappels, les péages et les amendes, la panne du dimanche et la sortie de flotte. » | textes.ts:204 | C | garage, rappels (C), amendes (B), sortie de flotte (B) | péages (13), panne (04) | (en 49, 29) | — |
| 59 | « Chaque action qui engage de l'argent passe par la validation de vos équipes. » | textes.ts:204 | B | factures, avoirs, relances (A sur le banc) ; frais d'avis, courriel à l'atelier, mise en vente (B) | — | 0 / 0 | — |
| 60 | « Les incidents et la sortie de flotte sont chiffrés, puis vous les validez. » | textes.ts:208 | C | sortie de flotte (B) | incidents (04, 18) | (en 29, 54) | — |

**Lecture du compte** : les lignes « hors produit » (3, 4, 32), les renvois à B3 (46, 56) et les doublons (15, 17, 31, 34,
40, 41, 43, 44) ne sont pas comptés à part dans la synthèse. Les jours entre parenthèses sont comptés une seule fois.

## Ce que je demande à Teo (T)

- Choisir et ouvrir les comptes des tiers, si l'Assistance, les Péages et les Relevés constructeur restent sur la page :
  - un fournisseur de voix ;
  - des dépanneurs sous contrat ;
  - un compte flotte de péage en flux libre ;
  - un agrégateur de données constructeur.
- Ou bien faire passer ces trois modules en « à venir » tant que le compte n'existe pas.
- Pour le premier loueur :
  - le nom de son logiciel de réservation et un export d'exemple, pour écrire le connecteur ;
  - son barème réel, et les mentions de l'émetteur (SIREN, TVA, adresse) ;
  - son accord pour une journée d'essai en agence, avec un vrai téléphone.
- Trois phrases à reprendre, pour qu'elles ne promettent pas plus que le produit :
  - « compare les photos » (ligne 5) ;
  - « le retire des réservations » (lignes 25 et 51) ;
  - « résumé dans votre logiciel » (ligne 33).

  Je n'y ai pas touché : main est la vitrine, et la règle est de n'y rien modifier.
