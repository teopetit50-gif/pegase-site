# TAVARO — inventaire de l'écran avant refonte

Relevé du 29/10/2026 sur la copie `refonte-metiers` (main 45c3aa89), en lecture seule. Ce fichier sert de contrat :
la refonte en sous-pages ne doit faire disparaître aucun bloc, geste ou entrée listé ici.

Convention : un chemin sans dossier (`EcranTavaro.tsx:735`) est dans `components/espace/tavaro/`. Les autres
chemins partent de la racine du dépôt. « direction » = gérant ou admin ; « direction large » = gérant, admin ou valideur ;
« agence » = direction large ou collaborateur ; « ≠ lecteur » = tout rôle connu sauf lecteur.

Page : `app/espace2/tavaro/page.tsx:12-18` habille (`components/espace2/Habille.tsx:19`) l'écran
`EcranTavaro.tsx:65` ; `app/espace/tavaro/page.tsx:20` rend le même écran sans habit. Le `h1` reste dans l'écran
(masqué en espace 2, le titre visible est dans la barre du haut).

---

## 1. Entrées

### 1.1 Liens écrits en base par les moteurs (point du matin)

Trois sources : les migrations du dépôt (`omega/modules/tavaro/migrations`, qui s'arrêtent à b2_11b et b3t_04), les
migrations de production assemblées hors du dépôt (`~/Desktop/PEGASE/releve-prod/omega/prod/migrations`, lues ici en
lecture seule : b2_12 à b2_20 et b3t_05 n'existent que là), et la photographie du socle (`omega/SOCLE-EXTRAITS-TAVARO.sql`).
Toutes les sections vont au rôle indiqué de l'agence (entité) ; dix lignes au plus par section.

| # | Fichier SQL:ligne | lien écrit | objet_type | Ce que désigne l'objet | Section / gabarit de la ligne (rôle) | Où l'utilisateur devrait atterrir |
|---|---|---|---|---|---|---|
| E1 | `omega/modules/tavaro/migrations/b3t_04_point_du_matin.sql:48` | `/espace/tavaro` | `loc_vehicules` | le véhicule au parking | « Véhicules inactifs », ordre 30 ; « immat (catégorie), N % de risque de rester trois jours : action » ; attention si risque fort (valideur) | sa ligne dans Véhicules inactifs (B39, `AnalysesParc.tsx:269`, ancre `#tavaro-inactifs`) ; aucune fiche véhicule n'existe |
| E2 | `b3t_04_point_du_matin.sql:58` | `/espace/tavaro` | `loc_reservations` | la réservation à risque de non-présentation | « Réservations à risque », ordre 31 ; « client, départ le JJ/MM à HHhMM : action (raisons) » (valideur) | sa ligne dans Réservations à risque (B40, `AnalysesParc.tsx:297`) ; les réservations n'existent nulle part ailleurs à l'écran |
| E3 | `b3t_04_point_du_matin.sql:67` | `/espace/tavaro` | `loc_contrats` | le contrat à risque | « Contrats à risque », ordre 32 ; « numéro, client : action (raisons) » (valideur) | sa ligne dans Contrats à risque (B41, `AnalysesParc.tsx:326`) avec « Noter le contrôle » ; à défaut le dossier du contrat (B11) |
| E4 | `b3t_04_point_du_matin.sql:77` | `/espace/tavaro` | `loc_reservations` | la réservation à qui proposer la catégorie supérieure | « Montée en gamme », ordre 33 ; « client, départ le … : proposer la catégorie X au lieu de Y (raisons) » ; info (valideur) | sa ligne dans Montée en gamme (B42, `AnalysesParc.tsx:355`) |
| E5 | `~/Desktop/PEGASE/releve-prod/omega/prod/migrations/20261015123904_b2_18_point_du_matin.sql:57` | `/espace2/tavaro` | `loc_remises` | la remise en location ouverte | « Remises en location », ordre 21 ; « immat : prête avant JJ/MM à HHhMM / en retard / pas de départ prévu (départ réf), confiée à X / aucune personne nommée » ; attention si alerte ou < 2 h (valideur) | sa remise dans Remises en location (B20, `ParcVue.tsx:192`) |
| E6 | `~/Desktop/PEGASE/releve-prod/omega/prod/migrations/20261015123904_b2_18_point_du_matin.sql:68` | `/espace2/tavaro` | `loc_immobilisations` | l'immobilisation dont le retour est dépassé | « Entretien et immobilisations », ordre 22 ; « immat devait revenir le JJ/MM (motif, prestataire) » ; attention (valideur) | sa ligne dans Immobilisations (B21, `ParcVue.tsx:261`), geste « Le véhicule est revenu » |
| E7 | `~/Desktop/PEGASE/releve-prod/omega/prod/migrations/20261015123904_b2_18_point_du_matin.sql:74-75` | `/espace2/tavaro` | `loc_rappels_vehicules` | le rappel constructeur à faire sur un véhicule | idem 22 ; « immat : rappel du constructeur réf à faire (libellé) » ; attention si immobilisant (valideur) | sa ligne dans Rappels du constructeur (B25, `OperationsVue.tsx:459`, onglet « Départ et rappels ») |
| E8 | `~/Desktop/PEGASE/releve-prod/omega/prod/migrations/20261015123904_b2_18_point_du_matin.sql:82-83` | `/espace2/tavaro` | `loc_vehicules` | le véhicule dont le contrôle technique expire sous 30 jours | idem 22 ; « immat : contrôle technique expiré / à faire avant le JJ/MM » (valideur) | sa ligne dans Vignette Crit'Air et contrôle technique (B26, `OperationsVue.tsx:488`) — même objet_type que E1 pour une autre carte |
| E9 | `~/Desktop/PEGASE/releve-prod/omega/prod/migrations/20261015123904_b2_18_point_du_matin.sql:90-91` | `/espace2/tavaro` | `loc_entretiens` | l'entretien dû sous 15 jours | idem 22 ; « immat : libellé, échéance le JJ/MM, planifié / à planifier » (valideur) | sa ligne dans Entretien (B22, `ParcVue.tsx:286`), geste « Trouver un créneau » |
| E10 | `~/Desktop/PEGASE/releve-prod/omega/prod/migrations/20261015123904_b2_18_point_du_matin.sql:100` | `/espace2/tavaro` | `loc_avis_contravention` | l'avis à rapprocher ou à désigner | « Avis de contravention », ordre 23 ; « immat, avis n° N : désigner le conducteur / rattacher au contrat avant le JJ/MM » ; attention sous 7 j (valideur) | sa ligne dans Avis de contravention, vue « À traiter » (B36, `AvisVue.tsx:178`) |
| E11 | `~/Desktop/PEGASE/releve-prod/omega/prod/migrations/20261015123904_b2_18_point_du_matin.sql:109` | `/espace2/tavaro` | `loc_contestations` | la contestation ouverte ou au dossier prêt | « Contestations bancaires », ordre 24 ; « Contestation réf (montant €) : préparer / envoyer le dossier avant le JJ/MM » ; attention sous 3 j (valideur) | sa ligne dans Contestations bancaires, vue « En cours » (B37, `ContestationsVue.tsx:148`) |
| E12 | `~/Desktop/PEGASE/releve-prod/omega/prod/migrations/20261015123904_b2_18_point_du_matin.sql:119` | `/espace2/tavaro` | `loc_passages_peage` | le passage en flux libre à payer | « Péages à payer », ordre 25 ; « immat, opérateur (montant €) : à payer avant … / 72 heures dépassées » ; attention sous 24 h (valideur) | sa ligne dans Péages (B28, `OperationsVue.tsx:570`, onglet « Péages »), geste « Payer » |
| E13 | `omega/SOCLE-EXTRAITS-TAVARO.sql:4537` (`loc_section_facturation`, déposée par `loc_deposer_points` :2608) | `/tavaro/facturation` | — | — | « Facturation des retours », ordre 20 ; gabarit `tavaro.propositions_a_decider` (n, montant) (valideur) | la file À valider (`/espace2/validations`) ou le filtre « À valider » (B02) |
| E14 | `SOCLE-EXTRAITS-TAVARO.sql:4545` | `/tavaro/facturation` | — | — | idem ; `tavaro.preuves_manquantes` (n) | le filtre « Bloqués » (preuve manquante) (B02/B08) |
| E15 | `SOCLE-EXTRAITS-TAVARO.sql:4554` | `/tavaro/factures` | — | — | idem ; `tavaro.factures_a_envoyer` (n) | aucune vue dédiée : « à envoyer vous-même » n'apparaît que dans chaque facture (B14, `DossierContrat.tsx:342`) |
| E16 | `SOCLE-EXTRAITS-TAVARO.sql:4562` | `/tavaro/factures` | — | — | idem ; `tavaro.factures_en_litige` (n, montant) | le filtre « Bloqués » + pastille Litige (B02/B08) |
| E17 | `SOCLE-EXTRAITS-TAVARO.sql:4570` | `/tavaro/factures` | — | — | idem ; `tavaro.factures_emises_hier` (n, montant) | aucune vue « factures d'hier » ; factures dans chaque dossier (B14) |
| E18 | `SOCLE-EXTRAITS-TAVARO.sql:4603` (`loc_section_reseau`, déposée :2626) | `/tavaro/facturation` | — | — | « Facturation des retours, réseau », ordre 20 ; `tavaro.agence_reseau` par agence (gérant) | la liste filtrée par agence (B07) puis « À valider » |
| E19 | `SOCLE-EXTRAITS-TAVARO.sql:2632` (`loc_deposer_points`, déposée :2634) | `/tavaro/avoirs` | — | — | « Avoirs à décider », ordre 25 ; `tavaro.avoirs_a_decider` (n, montant) (gérant) | la file À valider (décision) ; la carte Avoirs du dossier (B15) |

PROD = `~/Desktop/PEGASE/releve-prod/omega/prod/migrations/20261015123904_b2_18_point_du_matin.sql` (source citée en tête :
`omega/modules/tavaro/migrations/b2_18_point_du_matin.sql @ b20fdfd`, absent de ce dépôt ; cron `tavaro-parking` :144).
E13–E19 viennent du socle (cron `tavaro-matin`, `SOCLE-EXTRAITS-TAVARO.sql:4946`). Les routes `/tavaro/*` n'existent pas
(`app/` n'a pas de dossier `tavaro`).

### 1.2 Objets déposés dans « À valider » (demandes_validation, module tavaro)

Sans `lien` ; `components/espace2/DetailDemande.tsx:375` les aiguille par `aiguiller()`.

| # | Fichier SQL:ligne | type_action | objet_type | Objet | Où l'utilisateur devrait atterrir |
|---|---|---|---|---|---|
| E20 | `b2_01_separation_saisie_approbation.sql:51` ; socle `SOCLE-EXTRAITS-TAVARO.sql:2565` (`loc_deposer_demande`) | `facture.envoyer` / `facture.envoyer_hors_bareme` | `loc_propositions` | la proposition chiffrée (retour, frais d'avis, péages refacturés) | dossier du contrat, carte Chiffrage (B13, « Devant l'agence ») |
| E21 | `b2_01_separation_saisie_approbation.sql:141` ; socle :2515 (`loc_demander_avoir`) | `avoir.emettre` | `loc_avoirs` | l'avoir demandé | dossier, carte Avoirs (B15) |
| E22 | `b2_02_relances_factures.sql:119` (`preparer_envoi`) | `envoi.email` (si l'envoi n'est pas direct) | `loc_factures` | la relance d'une facture | dossier, carte Factures (B14) |
| E23 | `b2_08_facture_pdf_photos.sql:163` | `envoi.email` | `loc_propositions` | le courriel de la facture avec PDF et photos | dossier, carte Factures (B14) |
| E24 | `b2_09_contestations.sql:534` | `envoi.email` | `loc_contestations` | le dossier envoyé à la banque | ligne de la contestation (B37) |
| E25 | `b2_10_remise_entretien.sql:817` | `envoi.email` | `loc_entretiens` | le courriel à l'atelier | ligne de l'entretien (B22) |
| E26 | `~/Desktop/PEGASE/releve-prod/omega/prod/migrations/20261011135955_b2_12_a_b2_16_tavaro.sql:1339` | `envoi.email` | `loc_sinistres` | le courrier de recours à l'assureur | ligne du sinistre (B29, onglet « Sinistres ») |

Les ~30 `lever_alerte_module` des migrations tavaro (ex. `b2_03:313`, `b2_10:911`, `b3t_04:90`) ne portent ni lien ni
objet routable (signature `omega/SOCLE-EXTRAITS-COMMUN.sql:6276`). `loc_agence` (`SOCLE-EXTRAITS-TAVARO.sql:3568`) est
l'objet d'une pièce déposée, pas un repère de navigation.

### 1.3 Paramètres d'adresse lus par l'écran

| Paramètre | Lu où | Effet |
|---|---|---|
| aucun (`?objet=`, `?contrat=`, ancre…) | — (aucun `useSearchParams` ni `location.hash` dans `components/espace/tavaro`, `app/espace/tavaro`, `app/espace2/tavaro`) | l'écran ouvre toujours le premier contrat de la liste (`EcranTavaro.tsx:166`) |
| `?ancien=1` / `?ancien=0` | `proxy.ts:57-66` (pas l'écran) | `/espace/tavaro` est redirigé en 307 vers `/espace2/tavaro`, sauf `?ancien=1` ou témoin `espace_ancien` |
| `?objet=<loc_…>:<id>` pour `loc_contrats`, `loc_reservations`, `loc_vehicules`, `loc_avis_contravention`, `loc_contestations`, `loc_entretiens`, `loc_immobilisations`, `loc_passages_peage`, `loc_rappels_vehicules`, `loc_remises` | écrit par `components/espace2/aiguillage.ts:92-102`, **non lu** par l'écran | arrive sur la page entière, sans sélection |
| ancres existantes non utilisées | `#esp-dossier` (`EcranTavaro.tsx:818`, défilement mobile), `#tavaro-inactifs`, `#tavaro-reservations-risque`, `#tavaro-contrats-risque`, `#tavaro-montee-en-gamme`, `#tavaro-plan-de-flotte` (`AnalysesParc.tsx:269,297,326,355,384`) | personne ne les vise aujourd'hui |

### 1.4 Autres écrans du dépôt qui mènent ici

| # | Fichier:ligne | Ce qui mène ici |
|---|---|---|
| E27 | `components/espace/ecrans.ts:10` | onglet de l'ancien espace `/espace/tavaro` « Location » |
| E28 | `components/espace2/modules.ts:98` (+ `:125`, secteur `location` → `tavaro`) | entrée de navigation du module métier « Location — Contrats, retours et barèmes », sans sous-onglet (`modules.ts:21`) |
| E29 | `components/espace/point/PointDuMatin.tsx:243-247` | « Ouvrir » d'une ligne du point (ancien design) : suit `lien` brut, donc `/espace/tavaro` (E1–E4), `/espace2/tavaro` (E5–E12) ou `/tavaro/*` (E13–E19, 404) |
| E30 | `components/espace2/Point.tsx:50, 250-261, 335-350` | « Ouvrir » du nouveau point : `aiguiller()` → `/espace2/tavaro?objet=…` (E1–E12) ou, sans objet, `/espace2/tavaro` (E13–E19, repli par module) |
| E31 | `components/espace2/DetailDemande.tsx:375` | page de l'objet d'une demande tavaro (E20–E26) : `?objet=` pour `loc_contestations` et `loc_entretiens`, racine `/espace2/tavaro` pour `loc_propositions`, `loc_avoirs`, `loc_factures`, `loc_sinistres` (aucune règle) |
| E32 | `components/espace2/Coquille.tsx:70-80` | réécrit tout `a[href^="/espace"]` de l'écran vers `/espace2` |

Sortie de l'écran : `DossierContrat.tsx:269` « Ouvrir la file « À valider » » → `/espace2/validations`.

---

## 2. Blocs

Source des données : « monde » = `chargerMonde()` (`portes.ts:83-163`), chargé une fois pour tout l'écran en base réelle,
`MONDE_EXEMPLE` (`EcranTavaro.tsx:48-60`) en exemple. Rôle : celui du compte en réel (`portes.ts:51`), « valideur » en
exemple (`EcranTavaro.tsx:76`).

### 2.1 Haut de page

| N° | Titre affiché | Composant fichier:ligne | Données | Source | Condition d'affichage |
|---|---|---|---|---|---|
| B01 | « Location : retours et factures » + sous-titre + ruban « Données d'exemple / Base réelle » | `EcranTavaro.tsx:728-739` ; `components/espace/ui.tsx:57` | texte fixe, source | `useSource()` (`components/espace/source.tsx`) | toujours |
| B02 | 4 compteurs-filtres « Retours à chiffrer », « À valider », « Bloqués », « Le reste » | `EcranTavaro.tsx:741-748` ; `etats.ts:28-33` | nombre de contrats par famille | monde → `famille()` (`etats.ts:15`) sur `loc_contrats`, `loc_propositions`, `loc_factures` | toujours ; teinte si > 0 ; bouton bascule le filtre |
| B03 | « À encaisser » | `EcranTavaro.tsx:749-753` | somme du reste dû des factures émises, envoyées ou en litige | monde → `resteDu()` (`etats.ts:156`) sur `loc_factures` − `loc_avoirs` émis | toujours |
| B04 | « La base réelle n'a pas répondu. » | `EcranTavaro.tsx:756-760` | message d'erreur | `chargerMonde` en échec | réel, erreur |
| B05 | « Aucun compte rattaché à cette session… » | `EcranTavaro.tsx:761-765` | — | `monCompte()` null | réel, sans compte |

### 2.2 Liste (colonne gauche)

| N° | Titre affiché | Composant | Données | Source | Condition |
|---|---|---|---|---|---|
| B06 | carte « Tous les contrats » (ou nom de la famille filtrée) + « N contrats » | `EcranTavaro.tsx:768-772` | compte visible | monde | toujours |
| B07 | filtres « Toutes les agences » + une puce par agence | `EcranTavaro.tsx:773-780` | agences | `loc_agences` + `entites` (`portes.ts:87,92`) | plus d'une agence |
| B08 | liste « Contrats de location » : numéro, pastille statut (proposition ou contrat), Litige, Réglé, Impayé, montant, locataire — immat · modèle, départ, rendu/retour prévu, agence | `EcranTavaro.tsx:781-815` | dossiers | `loc_contrats` (300 max, `portes.ts:86`), `loc_locataires`, `loc_vehicules`, `loc_propositions`, `loc_factures` | toujours ; chargement « Lecture du parking… » ; vide « Aucun contrat » |

### 2.3 Dossier du contrat (colonne droite)

| N° | Titre affiché | Composant | Données | Source | Condition |
|---|---|---|---|---|---|
| B09 | « Choisissez un contrat » / « Lecture du dossier… » | `EcranTavaro.tsx:819-825` | — | — | aucun contrat choisi |
| B10 | bandeau « C'est fait. … » | `DossierContrat.tsx:191` | message du dernier geste | état local | après un geste |
| B11 | en-tête du contrat : numéro, statut, proposition, Hors barème, Litige, agence, source ; locataire, courriel, véhicule, départ, retour prévu (+ amendement), rendu le, compteur, forfait km, carburant, tarif/jour, franchise, dépôt ; « Complété à la main : … » ; « À vérifier sur le contrat » ; 3 boutons | `DossierContrat.tsx:194-239` | contrat complet | `loc_contrats`, `loc_locataires`, `loc_vehicules`, `loc_categories`, `loc_contrats_amendements` (`portes.ts:106-108`) | contrat choisi |
| B12 | « États des lieux » : colonnes Départ / Retour (km, carburant, photos, dommages par zone, observations, signataire, empreinte, refus, caution) + boutons | `EtatsDesLieux.tsx:230-246` (résumé `:38-66`) | états des lieux | `loc_etats_des_lieux` (`portes.ts:119`) | contrat choisi |
| B13 | « Le chiffrage du retour » : version, auteur ; avertissements ; « Rien à facturer » ; « Devant l'agence » (accords requis, rôles, échéance, séparation saisie/approbation, lien À valider) ; totaux frais/dommages/TVA/TTC ; lignes (poste, quantité, HT, TVA, TTC, preuves, plafonné à la franchise) ; retard, km, carburant, plafond, état des lieux, barème | `DossierContrat.tsx:245-314` | proposition vivante | `loc_propositions`, `loc_proposition_lignes`, `demandes_validation` (`portes.ts:109,121,123`) | contrat choisi |
| B14 | « Factures » : référence, statut, frais/dommages, échéance dépassée, relances, avoir devant la direction, montant ; émise le, échéance, reste dû, destinataire, courriel (parti / préparé / à envoyer vous-même, PDF et photos joints), réglée, contestation, TVA ; « Voir les N lignes » ; 5 boutons | `DossierContrat.tsx:317-370` | factures | `loc_factures`, `loc_facture_lignes`, `loc_avoirs` | au moins une facture |
| B15 | « Avoirs » : référence, statut, total/partiel, montant ; motif, demandé par, décision ; Forme électronique | `DossierContrat.tsx:373-395` | avoirs | `loc_avoirs` (`portes.ts:111`) | au moins un avoir |
| B16 | « Fil du dossier — journal opposable » | `DossierContrat.tsx:398-422` (libellés `:55-79`) | actions `tavaro.*` | `journal_opposable` (`portes.ts:125`) | toujours ; vide pour qui n'est pas direction en réel |

### 2.4 Vues sous la grille (dans l'ordre de la page)

| N° | Titre affiché | Composant | Données | Source | Condition |
|---|---|---|---|---|---|
| B17 | « Parc : remise en location et entretien » + pastille « N à remettre en location · N en risque » | `ParcVue.tsx:150-167` | remises en cours | monde.parc (`chargerParc`, `portes.ts:177`) | toujours (carte montée côté navigateur, relue chaque minute `:88-93`) |
| B18 | chiffres du parc : Remise en location (médiane 30 j), Prêtes à temps, Immobilisés, Entretiens | `ParcVue.tsx:169-174` | — | `loc_remises`, `loc_immobilisations`, `loc_entretiens` | idem |
| B19 | « Remises de <agence>, confiées d'office à » (un choix par agence) | `ParcVue.tsx:175-188` | responsable par agence | `loc_responsables_agence`, `comptes` (`portes.ts:186-187`) | idem ; modifiable par la direction |
| B20 | « Remises en location » : immat, modèle, délai, rendu le, contrat, agence, prochain départ, étapes Inspection/Nettoyage/Énergie, « Confiée à », anomalies | `ParcVue.tsx:192-258` | remises à faire / en cours | `loc_remises`, `loc_anomalies_retour`, `loc_vehicules` | idem ; vide « Aucune remise en cours » |
| B21 | « Immobilisations » : immat, motif, retour prévu / dépassé, coût, prestataire, notes | `ParcVue.tsx:261-283` | immobilisations ouvertes hors préparation | `loc_immobilisations` | idem |
| B22 | « Entretien » : immat, à planifier/planifié, libellé, échéance date/km, durée, dépôt/reprise, atelier prévenu | `ParcVue.tsx:286-318` | entretiens | `loc_entretiens` | idem |
| B23 | « Opérations » + pastille « N péages hors délai » + 6 onglets avec compteur (Départ et rappels, Transferts, Péages, Sinistres, Assistance, Caution) | `OperationsVue.tsx:420-439` (onglets `:36-40`, compteurs `:414-417`) | — | `chargerOperations()` (`portes.ts:286`), propre à la carte | toujours |
| B24 | « Contrôle avant de donner les clés » : choix d'un contrat ouvert, points Ne part pas / À vérifier / À dire au client | `OperationsVue.tsx:442-458` | points de départ | rpc `loc_controle_depart` (`portes.ts:307`) ; exemple `controleDepart()` (`operations.ts:84`) | onglet Départ |
| B25 | « Rappels du constructeur » : immat, immobilisant / à planifier, référence, libellé | `OperationsVue.tsx:459-487` | rappels à faire | `loc_rappels`, `loc_rappels_vehicules` | onglet Départ |
| B26 | « Vignette Crit'Air et contrôle technique » par véhicule | `OperationsVue.tsx:488-511` | conformité | `loc_vehicules_conformite` | onglet Départ |
| B27 | « Transferts » : tournées, véhicules à déplacer avant le pic, validé / proposé | `OperationsVue.tsx:512-569` | transferts 60 j | `loc_transferts` | onglet Transferts |
| B28 | « Péages » : À payer, Hors délai (72 h), À refacturer ; contrats à refacturer ; passages (statut, contrat, montant) | `OperationsVue.tsx:570-648` | passages | `loc_passages_peage` | onglet Péages |
| B29 | « Sinistres » : référence, étape, recours (montant, courrier dépliable), nature, véhicule, contrat, responsabilité, assureur | `OperationsVue.tsx:649-687` | sinistres | `loc_sinistres` | onglet Sinistres |
| B30 | « Incidents » (+ avis « Le fournisseur de voix n'est pas encore choisi ») | `OperationsVue.tsx:688-709` | appels d'assistance | `loc_incidents` | onglet Assistance |
| B31 | « Votre grille d'assistance » | `OperationsVue.tsx:710-727` | type d'incident → action, prestataire, délai | `loc_grille_assistance` | onglet Assistance |
| B32 | « Caution » (+ avis « Le prestataire de paiement n'est pas encore choisi ») : contrat, statut, montant, garantie, capture | `OperationsVue.tsx:728-764` | préautorisations | `loc_cautions` | onglet Caution |
| B33 | « Questions — réponses tirées de vos chiffres, jamais d'écriture » : saisie, liste (statut, question, réponse, chiffres, cause, décision proposée) | `QuestionsVue.tsx:83-127` | 20 dernières questions | `loc_questions` (`portes.ts:354`) ; relue toutes les 5 s si une attend (`:48-53`) | toujours (saisie grisée pour lecteur) |
| B34 | « Audit des retours et indicateur du mois » : Ce mois-ci (€ pour 100 retours), Avant Tavaro, Avoirs du mois | `AuditVue.tsx:126-140` | indicateur | rpc `loc_indicateur_mois` (`portes.ts:338`) ; exemple calculé sur les dossiers (`:63-75`) | direction large seulement (`:76` rend null sinon) |
| B35 | audit choisi : sélecteur d'audits, statut, Retours / Facturé à l'époque / Sur le barème / Écart, lignes par contrat | `AuditVue.tsx:141-189` | audits, lignes | `loc_audits`, `loc_audit_lignes` (`portes.ts:333`) | idem |
| B36 | « Avis de contravention » + « N à traiter · N urgents » ; filtres À traiter / Traités ; avis : immat, statut, échéance (45 j), montant, nature, lieu, n° avis, contrat retrouvé, désignation, refacturation, classement | `AvisVue.tsx:178-250` | avis | `loc_avis_contravention` (`portes.ts:95`) | toujours |
| B37 | « Contestations bancaires » + « N en cours · N urgentes » ; filtres En cours / Closes ; référence banque, statut, délai, montant, motif, facture, contrat, points forts du dossier, dossier composé, envoi, issue | `ContestationsVue.tsx:148-244` | contestations | `loc_contestations` (`portes.ts:96`) | toujours |
| B38 | « Certaines analyses n'ont pas pu être lues : … » | `AnalysesParc.tsx:265` | erreurs par lecture | `chargerAnalyses` (`analyses.ts:152`) | réel, une lecture refusée |
| B39 | « Véhicules inactifs — N à risque ce matin » : probabilité 72 h, immat, action, modèle, catégorie, agence, jours au parking, raison | `AnalysesParc.tsx:269-295` | — | rpc `loc_vehicules_inactifs` (`analyses.ts:163`) | toute l'analyse : rien en réel sans compte (`:261`) |
| B40 | « Réservations à risque » : client, départ, catégorie, agence, action, raisons | `AnalysesParc.tsx:297-322` | — | rpc `loc_reservations_a_risque` 72 h (`analyses.ts:164`) | idem |
| B41 | « Contrats à risque » : numéro, client, véhicule, score, retour prévu, raisons, action, contrôle noté | `AnalysesParc.tsx:326-353` | — | rpc `loc_contrats_a_risque` (`analyses.ts:165`) | idem |
| B42 | « Montée en gamme » : client, réservation, catégorie → offre, libres, raisons | `AnalysesParc.tsx:355-380` | — | rpc `loc_montee_en_gamme` 48 h (`analyses.ts:166`) | idem |
| B43 | « Plan de flotte <année> » : À acheter / renouveler / vendre / déplacer ; Revente, Cotes à noter, Entretien de la flotte ; tableau agence × catégorie | `AnalysesParc.tsx:384-426` | plan | rpc `loc_plan_de_flotte` 12 mois, cible 0,8 (`analyses.ts:167`) | direction en réel ; toujours en exemple (`:383`) |
| B44 | « Les véhicules un par un » (à vendre / à renouveler, cote, entretien, jours loués) | `AnalysesParc.tsx:427-455` | véhicules du plan | idem (b3t_05) | idem, s'il y a des véhicules |
| B45 | « Flotte : garder, vendre ou renouveler » + pastilles à sortir / à restituer / mises en vente à valider ; tableau Véhicule, Avis, Marge 12 mois, Loué, Immobilisé, Km, Cote réelle, Quand/comment, Fiche | `FlotteVue.tsx:114-166` | fiches économiques | rpc `loc_fiches_flotte` (`portes.ts:168`) | direction large (`EcranTavaro.tsx:866`, `FlotteVue.tsx:81`) |
| B46 | « Mises en vente » | `FlotteVue.tsx:168-212` | sorties | `loc_sorties_flotte` (`portes.ts:169`) | idem, s'il y en a |
| B47 | « Facture électronique : prêt pour le 1er septembre 2027 ? » : SIREN, TVA, adresse, clients pro sans SIREN, factures prêtes sur 90 jours | `FactureElectronique.tsx:138-155` | préparation | rpc `loc_preparation_2027` (`portes.ts:229`) ; exemple via `cii.ts` (`EcranTavaro.tsx:114-132`) | direction large (`EcranTavaro.tsx:872`) |
| B48 | « Barème de remise en état » : en vigueur depuis / retiré ; sélecteur ; tableau Code, Libellé, Famille, Unité, Prix, TVA, Catégorie | `BaremeVue.tsx:88-133` | barèmes | `loc_baremes`, `loc_bareme_lignes`, `loc_categories` (`portes.ts:88-90`) | toujours |
| B49 | « Loueur d'exemple « Autoloc Bertin »… rien n'est écrit nulle part » | `EcranTavaro.tsx:881` | — | — | exemple |

### 2.5 Fenêtres (Dialog)

| N° | Titre affiché | Composant | Ouverte depuis | Contenu |
|---|---|---|---|---|
| F01 | « Chiffrer le retour du contrat N » | `FormulaireRetour.tsx:155-222` | B11 | rendu le, compteur, carburant / charge, photos jauge et compteur, état de départ signé, case non signé, dommages (avec zones du départ), autres postes |
| F02 | « Compléter les conditions du contrat N » | `DossierContrat.tsx:431-465` | B11 | forfait km, illimité, politique carburant, seuil, tarif, dépôt, franchise, franchise réduite, rachat |
| F03 | « Amender le contrat N » | `DossierContrat.tsx:468-487` | B11 | prolongation / restitution décalée / retard offert, date, motif |
| F04 | « Passer <réf> en litige » | `DossierContrat.tsx:490-507` | B14 | contestation du client |
| F05 | « Marquer <réf> réglée » | `DossierContrat.tsx:510-528` | B14 | mode, date |
| F06 | « Demander un avoir sur <réf> » | `DossierContrat.tsx:531-550` | B14 | montant, motif |
| F07 | « Relancer <réf> » | `DossierContrat.tsx:553-573` | B14 | reste dû, relances déjà parties |
| F08 | « État des lieux de départ/retour — N » (constat → signature → refus) | `EtatsDesLieux.tsx:248-377` | B12 | compteur, carburant, tour du véhicule guidé, 4 vues obligatoires + utiles, netteté, dommages, caution (départ), observations ; signature au doigt ; motif de refus |
| F09 | « <réf> — forme électronique » | `FactureElectronique.tsx:79-120` | B14, B15 | flux, prête / points à corriger, SIREN du client, XML |
| F10 | « Anomalie au retour de <immat> » | `ParcVue.tsx:324-357` | B20 | type, description, personne nommée |
| F11 | « Immobiliser un véhicule » | `ParcVue.tsx:359-400` | B17 | véhicule, motif, retour prévu, prestataire, note |
| F12 | « <immat> est revenu » | `ParcVue.tsx:402-424` | B21 | coût |
| F13 | « Prévoir un entretien » | `ParcVue.tsx:426-470` | B17 | véhicule, nature, libellé, échéance date/km, durée |
| F14 | « <entretien> — <immat> » (créneaux) | `ParcVue.tsx:472-515` | B22 | 3 creux du planning, atelier, courriel de l'atelier |
| F15 | « <entretien> fait » | `ParcVue.tsx:517-542` | B22 | km, coût |
| F16 | formulaire générique des Opérations (15 usages, voir gestes G23–G42) | `OperationsVue.tsx:765-814` (définitions `:158-404`) | B24–B32 | champs décrits par chaque geste |
| F17 | « Ouvrir un audit » | `AuditVue.tsx:191-215` | B34 | libellé |
| F18 | « Ajouter un retour à l'audit » | `AuditVue.tsx:217-256` | B35 | contrat, facturé à l'époque, rendu le, km, carburant départ/retour, dommages |
| F19 | « Enregistrer un avis de contravention » | `AvisVue.tsx:251-287` | B36 | n° avis, immat, jour, heure, nature, lieu, montant, date d'envoi, reçu le |
| F20 | « Rattacher l'avis N » | `AvisVue.tsx:289-311` | B36 | contrat |
| F21 | « Désigner le conducteur — avis N » | `AvisVue.tsx:313-362` | B36 | une personne / la société locataire, identité, mode, référence |
| F22 | « Classer l'avis N sans désigner » | `AvisVue.tsx:364-381` | B36 | motif (≥ 10 car.) |
| F23 | « Ouvrir une contestation bancaire » | `ContestationsVue.tsx:245-290` | B37 | facture, référence banque, montant, motif, reçue le, à répondre avant, adresse, note |
| F24 | « Envoyer le dossier <réf> » | `ContestationsVue.tsx:292-313` | B37 | adresse du service des contestations |
| F25 | « Contestation <réf> gagnée/perdue/abandonnée » | `ContestationsVue.tsx:315-339` | B37 | note |
| F26 | « Contrôle des pièces — N » | `AnalysesParc.tsx:115-180` | B41 | pièce d'identité, permis, permis < 3 ans |
| F27 | « Cote de revente — <immat> » | `AnalysesParc.tsx:55-113` | B44 | montant, source (Argus, reprise, estimation, autre) |
| F28 | « <immat> — <modèle> » (fiche économique + proposition de vente) | `FlotteVue.tsx:216-320` | B45 | revenu, atelier, loyers, perte de valeur, cote, km, quand, comment ; saisie financement/cote/valeur comptable/loyer ; motif, canal, prix visé |
| F29 | « Refuser la mise en vente de <immat> » | `FlotteVue.tsx:322-342` | B46 | motif |
| F30 | « Vente conclue — <immat> » | `FlotteVue.tsx:344-370` | B46 | prix, date, acheteur |
| F31 | « Publier un barème » | `BaremeVue.tsx:135-156` | B48 | libellé, date d'effet, lignes en texte |
| F32 | « Retirer le barème « … » » | `BaremeVue.tsx:158-175` | B48 | motif |

---

## 3. Gestes

Après chaque geste : en réel, la porte puis relecture (`relire()` du monde, `EcranTavaro.tsx:99`, ou relecture propre à la
carte) ; en exemple, modification en mémoire (pause 250–500 ms). Le message « C'est fait » s'affiche dans la carte. La
base reste juge du rôle ; l'écran grise avant.

### 3.1 Gestes qui écrivent ou envoient

| G | Libellé (bouton final) | Bloc | Fonction → rpc / table | Fenêtre | Rôle requis | Après |
|---|---|---|---|---|---|---|
| G01 | « Compléter les conditions » → « Enregistrer » | B11 `DossierContrat.tsx:234,462` | `completerContrat` (`portes.ts:207`) → `loc_completer_contrat` | F02 | ≠ lecteur, contrat non annulé | saisie gardée avec le nom ; avertissement « écart » levé |
| G02 | « Prolonger ou offrir le retard » → « Enregistrer » | B11 `:235,484` | `amenderContrat` (`portes.ts:208`) → `loc_amender_contrat` | F03 | direction large | retour prévu déplacé |
| G03 | « Chiffrer / Rechiffrer le retour » → « Chiffrer le retour » | B11 `:236` ; `FormulaireRetour.tsx:217` | `deposerPhoto` (`portes.ts:276`, Storage `omega-clients`) puis `chiffrerRetour` (`portes.ts:210`) → `loc_chiffrer_retour` | F01 | ≠ lecteur ; pas de proposition à valider/validée/facturée | proposition calculée ; si facture due, demande déposée dans À valider |
| G04 | « Litige » → « Mettre en litige » | B14 `:359,504` | `marquerLitige` → `loc_marquer_litige` (`portes.ts:211`) | F04 | ≠ lecteur ; facture émise ou envoyée | facture en litige, famille Bloqués, point du matin |
| G05 | « Réglée » → « Confirmer le règlement » | B14 `:360,525` | `marquerReglee` → `loc_marquer_reglee` (`:212`) | F05 | ≠ lecteur ; émise/envoyée/litige | facture réglée |
| G06 | « Demander un avoir » → « Demander l'avoir » | B14 `:361,547` | `demanderAvoir` → `loc_demander_avoir` (`:213`) | F06 | ≠ lecteur ; reste dû > 0, pas d'avoir en attente | demande `avoir.emettre` (direction, 48 h) |
| G07 | « Relancer » → « Envoyer la relance » | B14 `:362,570` | `relancerFacture` → `loc_relancer_facture` (`:214`) | F07 | ≠ lecteur ; émise/envoyée, reste dû | courriel en attente dans À valider |
| G08 | « Enregistrer le SIREN » | F09 `FactureElectronique.tsx:105` | `completerLocataire` → `loc_completer_locataire` (`:228`) | F09 | ≠ lecteur, locataire non anonymisé | les prochaines factures portent le SIREN |
| G09 | « Faire / Reprendre l'état de départ » puis « Faire / Reprendre l'état de retour » → « Enregistrer et faire signer » | B12 `EtatsDesLieux.tsx:234-235,363` | `deposerPhoto` + `etablirEtat` → `loc_etablir_etat` (`:222`) | F08 | agence ; départ requis avant retour | brouillon, passe à la signature |
| G10 | « Signer l'état des lieux » | F08 `:367` | `deposerPhoto` (signature PNG) + `signerEtat` → `loc_signer_etat` (`:223`) | F08 | agence | état signé, empreinte, figé |
| G11 | « Le client ne signe pas » → « Clore sans signature » | F08 `:366,372` | `constaterRefus` → `loc_constater_refus` (`:224`) | F08 | agence | état non contradictoire ; dommages à la direction |
| G12 | « Lever la caution » | B12 `:236` | `leverCaution` → `loc_lever_caution` (`:225`) | **aucune** | agence ; aucune facture due | caution levée |
| G13 | choix « Remises de <agence>, confiées d'office à » | B19 `ParcVue.tsx:180-181` | `poserResponsableRemise` → `loc_poser_responsable_remise` (`:259`) | **aucune** (au changement) | direction | remises sans responsable confiées |
| G14 | étapes « Inspection », « Nettoyage », « Carburant/Recharge » (bascule) | B20 `:220-221` | `etapeRemise` → `loc_etape_remise` (`:242`) | **aucune** | agence | remise prête quand les trois sont faites |
| G15 | choix « Confiée à » | B20 `:230-231` | `assignerRemise` → `loc_assigner_remise` (`:243`) | **aucune** | agence | — |
| G16 | « Signaler une anomalie » → « Signaler » | B20 `:236,351-353` | `signalerAnomalie` → `loc_signaler_anomalie` (`:244`) | F10 | agence | la personne nommée est prévenue |
| G17 | « Traitée » (anomalie) | B20 `:247-249` | `traiterAnomalie` → `loc_traiter_anomalie` (`:245`) | **aucune** | la personne nommée ou direction large | anomalie close |
| G18 | « Immobiliser un véhicule » → « Immobiliser » | B17 `:158,390-396` | `immobiliser` → `loc_immobiliser` (`:246`) | F11 | agence | liste des contrats à réaffecter dans le message |
| G19 | « Le véhicule est revenu » → « Confirmer le retour » | B21 `:278,418-420` | `leverImmobilisation` → `loc_lever_immobilisation` (`:247`) | F12 | agence | véhicule louable |
| G20 | « Prévoir un entretien » → « Prévoir » | B17 `:161,460-466` | `prevoirEntretien` → `loc_prevoir_entretien` (`:248`) | F13 | agence | entretien à planifier |
| G21 | « Trouver un créneau / Déplacer » → « Planifier » | B22 `:309,506-511` | `creneauxEntretien` (lecture `loc_creneaux_entretien`, `:249`) puis `planifierEntretien` → `loc_planifier_entretien` (`:250`) | F14 | agence | planifié ; courriel à l'atelier après validation des envois |
| G22 | « Fait » (entretien) → « Enregistrer » | B22 `:312,536-538` | `entretienFait` → `loc_entretien_fait` (`:252`) | F15 | agence | entretien fait |
| G23 | « Enregistrer un rappel » → « Enregistrer le rappel » | B25 `OperationsVue.tsx:461` (déf. `:177`) | `enregistrerRappel` → `loc_enregistrer_rappel` (`:309`) | F16 | direction large | véhicules concernés, réservations à réaffecter |
| G24 | « Fait » (rappel) | B25 `:475-480` | `rappelFait` → `loc_rappel_fait` (`:310`) | **aucune** | ≠ lecteur | véhicule revient en location si immobilisant |
| G25 | « Saisir » (conformité) → « Enregistrer » | B26 `:503` (déf. `:158`) | `poserConformite` → `loc_poser_conformite` (`:308`) | F16 | ≠ lecteur | Crit'Air et CT notés |
| G26 | « Proposer les transferts » | B27 `:516-521` | `proposerTransferts` → `loc_proposer_transferts` (`:311`) | **aucune** | direction large | tournées proposées |
| G27 | « Arrivé » → « Noter l'arrivée » | B27 `:541-545` | `transfertFait` → `loc_transfert_fait` (`:313`) | F16 | ≠ lecteur | position du véhicule mise à jour |
| G28 | « Valider la tournée » / « Refuser » | B27 `:556-562` | `deciderTransferts` → `loc_decider_transferts` (`:312`) | **aucune** | direction large | tournée validée ou refusée |
| G29 | « Saisir un passage » → « Enregistrer le passage » | B28 `:578` (déf. `:215`) | `enregistrerPassages(saisie)` → `loc_enregistrer_passages` (`:314`) | F16 | ≠ lecteur | rapproché du contrat |
| G30 | « Importer l'export » → « Importer » | B28 `:579` (déf. `:238`) | `enregistrerPassages(import)` → idem | F16 | ≠ lecteur | nouveaux / déjà / rapprochés |
| G31 | « Refacturer au locataire » | B28 `:587-592` | `refacturerPeages` → `loc_refacturer_peages` (`:317`) | **aucune** | ≠ lecteur | proposition de facture, validation |
| G32 | « Payer » → « C'est payé » | B28 `:613-618` | `payerPassage` → `loc_payer_passage` (`:315`) | F16 | ≠ lecteur | passage payé |
| G33 | « Rattacher » → « Rattacher » | B28 `:622-627` | `rattacherPassage` → `loc_rattacher_passage` (`:316`) | F16 | ≠ lecteur | — |
| G34 | « À la charge du loueur » → « Garder à la charge » | B28 `:632-637` | `passageALaCharge` → `loc_passage_a_la_charge` (`:318`) | F16 | ≠ lecteur | — |
| G35 | « Déclarer un sinistre » → « Ouvrir le dossier » | B29 `:652` (déf. `:256`) | `ouvrirSinistre` → `loc_ouvrir_sinistre` (`:319`) | F16 | ≠ lecteur | dossier ouvert |
| G36 | « Faire avancer » → « Enregistrer » | B29 `:673` (déf. `:287`) | `avancerSinistre` → `loc_avancer_sinistre` (`:320`) | F16 | ≠ lecteur ; régler/clore : direction large | étape suivante |
| G37 | « Préparer / Refaire le recours » → « Préparer le recours » (case « L'envoyer à… ») | B29 `:675` (déf. `:312`) | `preparerRecours` → `loc_preparer_recours` (`:321`) | F16 | direction large ; responsabilité tiers ou partagée | courrier ; envoi à l'assureur si coché |
| G38 | « Clore » (incident) → « Clore » | B30 `:705` (déf. `:333`) | `cloreIncident` → `loc_clore_incident` (`:323`) | F16 | ≠ lecteur | peut ouvrir un sinistre |
| G39 | « Ajouter un type » / « Modifier » → « Enregistrer » | B31 `:712,720` (déf. `:345`) | `poserGrilleAssistance` → `loc_poser_grille_assistance` (`:322`) | F16 | direction | ligne de grille |
| G40 | « Demander une préautorisation » → « Demander » | B32 `:732` (déf. `:370`) | `demanderPreautorisation` → `loc_demander_preautorisation` (`:324`) | F16 | ≠ lecteur | demande au prestataire (non branché) |
| G41 | « Capturer » → « Demander la capture » | B32 `:748` (déf. `:386`) | `capturerCaution` → `loc_capturer_caution` (`:325`) | F16 | direction large | capture demandée |
| G42 | « Libérer » / « Libérer le reste » | B32 `:749-754` | `libererCaution` → `loc_liberer_caution` (`:326`) | **aucune** | ≠ lecteur | libération demandée |
| G43 | « Poser la question » | B33 `QuestionsVue.tsx:94` | `poserQuestion` → `loc_poser_question` (`portes.ts:359`) | aucune | ≠ lecteur | l'ouvrier `tavaro-questions` répond (relecture 5 s) |
| G44 | « Ouvrir un audit » → « Ouvrir » | B34 `AuditVue.tsx:131,206-212` | `ouvrirAudit` → `loc_ouvrir_audit` (`:343`) | F17 | direction large (carte entière) | audit ouvert |
| G45 | « Ajouter un retour » → « Chiffrer et ajouter » | B35 `:177,253` | `auditerRetour` → `loc_auditer_retour` (`:344`) | F18 | direction large ; < 100 lignes | simulation, aucune facture |
| G46 | « Clore l'audit » | B35 `:179-185` | `cloreAudit` → `loc_resultat_audit(p_clore)` (`:346`) | **aucune** | direction | devient l'« avant » de l'indicateur |
| G47 | « Enregistrer un avis » → « Enregistrer » | B36 `AvisVue.tsx:190,284` | `enregistrerAvis` → `loc_enregistrer_avis` (`:217`) | F19 | agence | rapprochement par plaque et heure, échéance 45 j |
| G48 | « Rattacher à un contrat / Changer de contrat » → « Rattacher » | B36 `:240,308` | `rattacherAvis` → `loc_rattacher_avis` (`:218`) | F20 | agence | à désigner |
| G49 | « Désigner le conducteur » → « Consigner la désignation » | B36 `:239,359` | `designerConducteur` → `loc_designer_conducteur` (`:219`) | F21 | direction large | désigné (dans / hors délai) |
| G50 | « Classer » → « Classer » | B36 `:241,378` | `classerAvis` → `loc_classer_avis` (`:221`) | F22 | direction | classé |
| G51 | « Refacturer les frais de dossier » | B36 `:234` | `refacturerAvis` → `loc_refacturer_avis` (`:230`) | **aucune** | agence ; avis désigné rattaché | proposition de facture, validation |
| G52 | « Ouvrir une contestation » → « Ouvrir et composer le dossier » | B37 `ContestationsVue.tsx:160,287` | `ouvrirContestation` → `loc_ouvrir_contestation` (`:231`) | F23 | agence | dossier composé par l'ouvrier |
| G53 | « Envoyer le dossier à la banque » → « Envoyer à la banque » | B37 `:215,307-309` | `envoyerDossier` → `loc_envoyer_dossier` (`:233`) | F24 | agence ; dossier prêt | courriel après validation des envois |
| G54 | « Refaire le dossier » | B37 `:220-223` | `produireDossier` → `loc_produire_dossier` (`:232`) | **aucune** | agence ; pas « ouverte » | dossier recomposé |
| G55 | « Gagnée » / « Perdue » / « Abandonner » → « Consigner » | B37 `:226,227,230,333-335` | `issueContestation` → `loc_issue_contestation` (`:234`) | F25 | direction large | contestation close |
| G56 | « Noter / Revoir le contrôle » → « Noter le contrôle » | B41 `AnalysesParc.tsx:346,176` | `noterControle` → `loc_noter_controle_conducteur` (`analyses.ts:172`) | F26 | ≠ lecteur | score recalculé |
| G57 | « Noter / Mettre à jour la cote » → « Noter la cote » | B44 `:444,108` | `noterCote` → `loc_noter_cote_revente` (`analyses.ts:177`) | F27 | direction (tous en exemple) | plan relu |
| G58 | « Fiche » → « Enregistrer et recalculer » | B45 `FlotteVue.tsx:161,268-276` | `poserEconomie` → `loc_poser_economie` (`portes.ts:253`) | F28 | direction large (carte) | fiche recalculée |
| G59 | « Proposer la mise en vente » → « Proposer à la direction » | F28 `:313,305-310` | `proposerSortie` → `loc_proposer_sortie` (`:254`) | F28 | direction large | à valider par une autre personne |
| G60 | « Valider la mise en vente » | B46 `:192-196` | `deciderSortie(true)` → `loc_decider_sortie` (`:255`) | **aucune** | direction, pas le proposant | validée, journal |
| G61 | « Refuser » → « Refuser » | B46 `:197-198,336-338` | `deciderSortie(false)` → idem | F29 | direction, pas le proposant | refusée |
| G62 | « Vente conclue » → « Enregistrer la vente » | B46 `:201,364-366` | `conclureSortie` → `loc_conclure_sortie` (`:256`) | F30 | (non grisé) | véhicule sort de la flotte |
| G63 | « Retirer » (mise en vente) | B46 `:205-206` | `annulerSortie` → `loc_annuler_sortie` (`:258`) | **aucune** | proposant ou direction | retirée |
| G64 | « Publier un barème » → « Publier » | B48 `BaremeVue.tsx:102,153` | `publierBareme` → `loc_publier_bareme` (`:215`) | F31 | direction | barème publié pour les départs à partir de la date |
| G65 | « Retirer » (barème) → « Retirer » | B48 `:101,172` | `retirerBareme` → `loc_retirer_bareme` (`:216`) | F32 | direction | retiré, motif au journal |

### 3.2 Gestes de lecture, téléchargement ou navigation (sans écriture)

| G | Libellé | Bloc | Fonction → rpc / table |
|---|---|---|---|
| L1 | clic sur un contrat | B08 `EcranTavaro.tsx:794-795` | sélection ; défile vers `#esp-dossier` sous 1024 px |
| L2 | compteurs-filtres, filtres d'agence | B02 `:743`, B07 `:776-777` | filtre local |
| L3 | « Voir les N lignes » | B14 `DossierContrat.tsx:348` | local |
| L4 | « Forme électronique » (facture / avoir) | B14 `:363`, B15 `:390` | `loc_facture_electronique` / `loc_avoir_electronique` (`portes.ts:226-227`) ; exemple `cii.ts` |
| L5 | « Télécharger le XML » | F09 `FactureElectronique.tsx:117` | fichier local |
| L6 | « Ouvrir la file « À valider » » | B13 `DossierContrat.tsx:269` | lien `/espace2/validations` |
| L7 | choix du contrat à contrôler | B24 `OperationsVue.tsx:444` | `loc_controle_depart` (`portes.ts:307`) |
| L8 | « Télécharger le dossier » | B37 `ContestationsVue.tsx:218,235` | `lienDossier` (`portes.ts:236`, URL signée 10 min) |
| L9 | onglets Opérations, À traiter/Traités, En cours/Closes, audits, barèmes | `OperationsVue.tsx:429`, `AvisVue.tsx:187-188`, `ContestationsVue.tsx:157-158`, `AuditVue.tsx:146`, `BaremeVue.tsx:97` | local |
| L10 | « Fiche » (ouverture) | B45 `FlotteVue.tsx:161` | local |

Portes exportées mais **sans bouton** : `poserReglages` (`portes.ts:263`, seule écriture directe, table `loc_reglages`) et
`anonymiserLocataire` (`portes.ts:260`, `loc_anonymiser_locataire`).

---

## 4. Liste et filtres

| Sujet | Où | Détail |
|---|---|---|
| Familles | `etats.ts:7, 15-33` | ordre de calcul : litige → bloquée ; facture émise/envoyée échue de plus de 7 jours → bloquée ; proposition `preuve_manquante` → bloquée ; `a_valider` ou `calculee` → à valider ; contrat annulé → reste ; sans proposition et rendu (ou retour prévu passé) → à chiffrer ; proposition refusée/expirée → à chiffrer ; sinon reste |
| Filtre famille | `EcranTavaro.tsx:71, 147, 743` | un seul à la fois, re-clic pour retirer ; change le titre de B06 |
| Filtre agence | `EcranTavaro.tsx:72, 147, 773-780` | n'apparaît qu'avec plus d'une agence ; **ne s'applique qu'à la liste**, pas aux vues B17–B48 |
| Tri | `EcranTavaro.tsx:145-153` | rang de famille (à chiffrer, à valider, bloqués, reste), puis date de retour réelle ou prévue, la plus récente d'abord |
| Recherche | — | **aucune** (pas de champ de recherche) |
| Sélection par défaut | `EcranTavaro.tsx:166` | premier contrat visible |
| Limites de lecture | `portes.ts:86, 95-96, 125, 181-185` | 300 contrats, 500 avis, 300 contestations, 500 lignes de journal, parc 500/300 ; remises et immobilisations closes depuis plus de 30 jours non relues |
| Statuts du contrat | `etats.ts:35-39` | ouvert « En location », clos « Rendu », annulé ; « Rendu » aussi si ouvert avec retour chiffré (`DossierContrat.tsx:198`) |
| Statuts de la proposition | `etats.ts:41-51` | calculée, preuve manquante, rien à facturer, à valider, validée, facturée, refusée, expirée, remplacée |
| Statuts de la facture | `etats.ts:53-59` | émise, envoyée, réglée, en litige, annulée par avoir |
| Statuts de l'avoir | `etats.ts:61-67` | devant la direction, émis, refusé, expiré, annulé |
| Pastilles calculées de la liste | `EcranTavaro.tsx:798-801` | Litige, Réglé, Impayé (bloqué hors litige et hors preuve) |
| Autres états (hors etats.ts) | `AvisVue.tsx:37` ; `ContestationsVue.tsx:35` ; `ParcVue.tsx:38-48` ; `OperationsVue.tsx:52` ; `operations.ts:69,76` ; `QuestionsVue.tsx:29` ; `FlotteVue.tsx:32,42` | avis, contestations, immobilisations/anomalies/entretiens, passages, sinistres, cautions, questions, avis de flotte, sorties |
| Tris des vues | `AvisVue.tsx:84-85` (échéance) ; `portes.ts:96` (date limite de réponse) ; `ParcVue.tsx:101-102` (heure limite) ; `ParcVue.tsx:110-111` (entretiens) ; `b3t_04:11` (plus urgente d'abord) | — |

---

## 5. Exemple vs réel

| Élément | Mécanisme | Fichier:ligne |
|---|---|---|
| Choix de la source | `useSource()` ; localStorage `espace.source` ; « réelle » seulement si une session est ouverte ; rendu serveur toujours « exemple » | `components/espace/source.tsx:29-80` |
| Monde de l'écran | exemple : `MONDE_EXEMPLE` (dossiers, agences, barèmes, avis, contestations, parc, flotte de `exemples.ts`) ; réel : `chargerMonde()` + `monCompte()` | `EcranTavaro.tsx:48-60, 75, 79-97` ; `exemples.ts:21-490` |
| Rôle | exemple : « valideur » (chef d'agence de Lyon) ; réel : rôle du compte (`comptes.role`) | `EcranTavaro.tsx:76-77` ; `portes.ts:51-61` |
| Gestes | `reelOuLocal` : porte puis relecture, ou modification en mémoire après 350 ms | `EcranTavaro.tsx:179-187` |
| Chiffrage en exemple | recalculé localement (`calcul.ts` `chiffrerLocal`, `edl.ts` `appliquerEtats`), demande simulée (2 accords dès 1 500 €) | `EcranTavaro.tsx:229-251` |
| Préparation 2027 | réel : `loc_preparation_2027` ; exemple : contrôles `cii.ts` sur les factures d'exemple | `EcranTavaro.tsx:107-133` |
| Contestations en exemple | dossier « composé » 1,2 s après, empreinte aléatoire ; téléchargement indisponible | `EcranTavaro.tsx:494-498, 557` |
| Opérations | état propre : `OPERATIONS_EXEMPLE` ou `chargerOperations()` (vide si migration absente) | `OperationsVue.tsx:71-93` ; `operations.ts:62,112` |
| Questions | `EXEMPLES` en dur (aucune IA) ou `chargerQuestions()` | `QuestionsVue.tsx:20, 42-53` |
| Audit | exemple : aucun audit au départ, indicateur calculé sur les dossiers ; réel : `chargerAudits()` (direction large) | `AuditVue.tsx:39-75` |
| Analyses | `ANALYSES_EXEMPLE` ou `chargerAnalyses()` ; rien en réel sans compte ; plan visible par tous en exemple | `AnalysesParc.tsx:184-261, 383` ; `analyses-exemple.ts:18` |
| Temps réel | 12 tables `loc_*` écoutées en réel, relecture du monde (pas des cartes Opérations, Questions, Audit, Analyses) | `EcranTavaro.tsx:135` |
| Tolérance | avis, contestations, parc, flotte, états des lieux, opérations, audit, questions : liste vide sans erreur si la migration manque | `portes.ts:71-78, 119, 158-161, 171, 175-197, 301, 340, 357` |
| Repli d'erreur | monde vide | `EcranTavaro.tsx:89` |
| Mention | « Loueur d'exemple « Autoloc Bertin »… » | `EcranTavaro.tsx:881` |

---

## 6. Objets métier

| Objet | Table (identifiant) | Blocs rattachés |
|---|---|---|
| Contrat | `loc_contrats` (`id`, `numero`) | B02, B06–B08, B11, B13–B16, B20, B24, B27–B29, B32, B35, B36, B41 ; E3 |
| Amendement | `loc_contrats_amendements` | B11, F03 |
| Locataire | `loc_locataires` (`id`, SIREN) | B08, B11, F09, F21, B37 |
| Véhicule | `loc_vehicules` (`id`, immatriculation) | B08, B11, B17–B22, B24–B32, B39, B43–B46 ; E1, E8 |
| Catégorie | `loc_categories` | B11, B48, B39–B43 |
| Agence | `loc_agences` + `entites` | B07, B08, B19, partout en libellé |
| Réservation | `loc_reservations` (lue seulement via rpc) | B40, B42 ; E2, E4 |
| Proposition (retour chiffré) | `loc_propositions`, `loc_proposition_lignes` | B02, B08, B13 ; E13, E14, E20, E23 |
| Demande de validation | `demandes_validation` | B13, B14, B15 ; E20–E26 |
| Facture | `loc_factures`, `loc_facture_lignes` | B03, B14, B37 ; E15–E17, E22 |
| Avoir | `loc_avoirs` | B03, B14, B15 ; E19, E21 |
| État des lieux | `loc_etats_des_lieux` | B12, F01, F08, B37 (points forts) |
| Barème | `loc_baremes`, `loc_bareme_lignes` | B48, F01, F08, B13, B35 |
| Réglages | `loc_reglages` (tolérance retard, netteté, contestation, remise) | lus par B13, F08, B20, F23 ; **aucun bloc d'édition** |
| Journal | `journal_opposable` (`tavaro.*`) | B16 |
| Remise en location | `loc_remises` | B18, B20 ; E5 |
| Anomalie de retour | `loc_anomalies_retour` | B20, F10 |
| Responsable des remises | `loc_responsables_agence` | B19 |
| Immobilisation | `loc_immobilisations` | B18, B21 ; E6 |
| Entretien | `loc_entretiens` | B18, B22 ; E9, E25 |
| Conformité (Crit'Air, CT) | `loc_vehicules_conformite` | B26 ; E8 |
| Rappel constructeur | `loc_rappels`, `loc_rappels_vehicules` | B25 ; E7 |
| Transfert | `loc_transferts` | B27 |
| Passage de péage | `loc_passages_peage` | B28 ; E12 |
| Sinistre | `loc_sinistres` | B29 ; E26 |
| Incident d'assistance | `loc_incidents`, `loc_grille_assistance` | B30, B31 |
| Caution (préautorisation) | `loc_cautions` | B32 (la caution de l'état des lieux est un champ de `loc_etats_des_lieux`, B12) |
| Question | `loc_questions` | B33 |
| Audit | `loc_audits`, `loc_audit_lignes`, rpc `loc_indicateur_mois` | B34, B35 |
| Avis de contravention | `loc_avis_contravention` | B36 ; E10 |
| Contestation bancaire | `loc_contestations` + Storage | B37 ; E11, E24 |
| Analyses du matin | rpc `loc_vehicules_inactifs`, `loc_reservations_a_risque`, `loc_contrats_a_risque`, `loc_montee_en_gamme` | B38–B42 |
| Plan de flotte, cote de revente | rpc `loc_plan_de_flotte`, `loc_noter_cote_revente` | B43, B44 |
| Fiche économique, mise en vente | rpc `loc_fiches_flotte`, `loc_sorties_flotte` | B45, B46 |
| Préparation 2027 | rpc `loc_preparation_2027` | B47 |
| Photos, signatures, dossiers | Storage `omega-clients` (`<client>/loc_contrat/<contrat>/…`) | F01, F08, B37 |

---

## 7. Promesses du site

Sources : `omega/CHIFFRAGE/tavaro.md` (n° de ligne du tableau = « # »), `components/secteurs/location/textes.ts:162-181`
(modules 01–20), `lib/en-preparation.ts:110-130`.

| Promesse (CHIFFRAGE #) | Module du site | Blocs qui la prouvent |
|---|---|---|
| #1, #6, #8, #20, #21 : chiffré sur le barème, franchise, l'agence valide avant envoi | 01 (`textes.ts:162`) | B13, F01, B14, B48, L6 |
| #2, #5, #15, #40 : rapprochement avec l'état des lieux de départ | 01 | B12, F01 (dommages du départ), F08 |
| #7, #17 : facture avec photos datées | 01 | B14 (« PDF et photos datées joints ») |
| #9, #11 : lit les contrats de l'export, rien ne se branche | — | B08, B11 (« Source : export du logiciel ») |
| #10, #13 : page du matin par agence | 07–10 | hors écran (point du matin, sections E1–E19) ; les blocs visés : B20–B22, B25, B26, B28, B36, B37, B39–B42 |
| #12, #28 : personne nommée | 02 | B16, B20 (Confiée à, anomalies) |
| #14, #48 : photo au téléphone, guidée, floue refusée, signée | 12 (`:173`) | F08, B12 |
| #16 : carburant, kilométrage, retard | 01 | F01, B13 |
| #18, #53 : dossier devant la banque en un clic | 17 (`:178`) | B37, F23–F25, B12 |
| #19, #57 : audit de vingt retours, indicateur unique | — | B34, B35, F18 |
| #22, #27, #41 : tâche dès le retour, responsable alerté | 02 (`:163`) | B17, B18, B20 |
| #23, #42 : entretien dans les creux, atelier prévenu | 03 (`:164`) | B22, F13, F14 |
| #24, #52 : véhicule chez le carrossier garde sa date | 16 (`:177`) | B21, F11 |
| #25, #51 : rappels, contrôle technique, Crit'Air | 15 (`:176`) | B24, B25, B26 |
| #29–#34, #43 : assistance téléphonique | 04 (`:165`) | B30, B31 (avis « fournisseur pas encore choisi ») |
| #35–#39, #44 : fiche économique, vendre, direction valide | 05 (`:166`) | B45, B46, F28–F30 |
| #45 : Questions en français | 06 (`:167`) | B33 |
| #46 : réservations à risque, montée en gamme, contrats à risque, véhicules inactifs | 07–10 (`:168-171`) | B40, B42, B41, B39 |
| #47 : transferts en une tournée | 11 (`:172`) | B27 |
| #49 : péages 72 h refacturés | 13 (`:174`) | B28 |
| #50 : avis rapproché, désignation 45 j, frais refacturés | 14 (`:175`) | B36, F19–F22 |
| #54 : sinistres et recours | 18 (`:179`) | B29 |
| #55 : relevés constructeur | 19 (`:180`) | **aucun bloc** |
| #56 : plan de flotte | 20 (`:181`) | B43, B44 |
| #59 : chaque action qui engage de l'argent est validée | — | B13 (Devant l'agence), G06, G07, G51, G31, G41, G60 |
| #26 : tâche sur la messagerie d'équipe | — | **aucun bloc** |
| hors promesse du site | — | B32 (caution), B47 (2027), F09 (forme électronique) |

`lib/en-preparation.ts:114-130` liste encore 15 libellés TAVARO « en préparation » ; 14 ont désormais un bloc
(Assistance B30, Sortie de flotte B45, Questions B33, Réservations à risque B40, Montée en gamme B42, Contrats à risque
B41, Véhicules inactifs B39, Transferts B27, Péages B28, Rappels B25, Garage et carrosserie B21, Contestations bancaires
B37, Sinistres et recours B29, Plan de flotte B43) ; seul « Relevés constructeur » n'en a pas. La pastille n'est rendue
nulle part : `SiEnPreparation` (`components/ui/en-preparation.tsx`) n'est importé par aucune page.

---

## 8. Regroupements naturels et observations

### 8.1 Taille des composants (lignes)

| Fichier | Lignes | Dont |
|---|---|---|
| `EcranTavaro.tsx` | 884 | logique des gestes ≈ 545 (`:170-721`), rendu ≈ 155 (`:726-883`) |
| `OperationsVue.tsx` | 817 | 6 sujets sur une carte |
| `DossierContrat.tsx` | 576 | 6 cartes + 6 fenêtres (149 lignes) |
| `ParcVue.tsx` | 545 | 5 sous-blocs + 6 fenêtres |
| `AnalysesParc.tsx` | 463 | 6 cartes + 2 fenêtres |
| `AvisVue.tsx` | 384 | |
| `EtatsDesLieux.tsx` | 380 | fenêtre 130 lignes |
| `FlotteVue.tsx` | 373 | |
| `ContestationsVue.tsx` | 342 | |
| `AuditVue.tsx` | 259 | |
| `FormulaireRetour.tsx` | 224 | |
| `BaremeVue.tsx` | 178 | |
| `FactureElectronique.tsx` | 157 | bouton + carte 2027 |
| `QuestionsVue.tsx` | 129 | |

Taille de chaque bloc : B01 12 · B02 8 · B03 5 · B04–B07 5–8 · B08 35 · B11 46 · B12 17 (+29 résumé) · B13 70 · B14 54 ·
B15 23 · B16 25 · B17 18 · B18 6 · B19 14 · B20 67 · B21 23 · B22 33 · B23 20 · B24 17 · B25 29 · B26 24 · B27 58 · B28 79 ·
B29 39 · B30 22 · B31 18 · B32 37 · B33 45 · B34 15 · B35 49 · B36 73 · B37 97 · B39 27 · B40 26 · B41 28 · B42 26 · B43 43 ·
B44 29 · B45 53 · B46 45 · B47 18 · B48 46.

### 8.2 Regroupements par sujet

| Sujet | Blocs | Fréquence |
|---|---|---|
| Retours et facturation (le cœur, module 01) | B02, B03, B06–B16, F01–F09 | quotidien (comptoir, chef d'agence) |
| Remise en location et atelier | B17–B22, F10–F15 | quotidien (remises), ponctuel (immobilisation, entretien) |
| Départ du véhicule | B24 (contrôle), B12 (état de départ), B41 (pièces), B26 (Crit'Air/CT) | quotidien au comptoir |
| Analyses du matin | B38–B42 | quotidien (point du matin) |
| Amendes, péages, contestations (délais légaux) | B36, B28, B37 | quotidien à hebdomadaire, échéances 45 j / 72 h / banque |
| Incidents | B29, B30, B32 | ponctuel |
| Réseau et flotte (direction) | B27, B43–B46, B34–B35, B47 | hebdomadaire à mensuel |
| Réglages | B48 (barème), B19 (responsables), B31 (grille), B26 (référentiel), `loc_reglages` (pas d'écran) | rare |
| Questions | B33 | ponctuel, transverse |

### 8.3 Constats

1. **Aucune entrée n'atterrit sur son objet.** L'écran ne lit aucun paramètre d'adresse (§ 1.3). Les 12 liens à objet du
   point du matin (E1–E12) et le `?objet=` que pose déjà l'aiguillage (`components/espace2/aiguillage.ts:92-102`) ouvrent
   la page entière sur le premier contrat. Les cibles sont dispersées : B20–B22 (Parc, 3ᵉ carte), B25, B26 (onglet par
   défaut « Départ et rappels » de la carte Opérations) et B28 (onglet « Péages », à ouvrir), B36, B37, puis B39–B42 tout en bas.
   Les réservations (E2, E4) n'existent à l'écran que dans B40/B42 ; `loc_vehicules` vise deux cartes différentes (E1 → B39,
   E8 → B26).
2. **Repères sans destination précise** : les 7 lignes historiques du socle (E13–E19) pointent vers `/tavaro/facturation`,
   `/tavaro/factures`, `/tavaro/avoirs`, routes inexistantes : 404 dans l'ancien point (`PointDuMatin.tsx:246`), racine
   `/espace2/tavaro` dans le nouveau (repli par module). Elles n'ont pas d'objet ; `outils/verifier-aiguillage.mjs` ne
   contrôle que les liens `/espace/<x>`. Côté demandes, `loc_propositions`, `loc_avoirs`, `loc_factures` et `loc_sinistres`
   (E20–E23, E26) n'ont pas de règle et retombent sur la racine.
3. **Doublons** :
   - cote de revente saisie à deux endroits, avec deux portes et deux vocabulaires de source : fiche Flotte (F28,
     `loc_poser_economie`, `FlotteVue.tsx:41`) et plan de flotte (F27, `loc_noter_cote_revente`, `AnalysesParc.tsx:53`) ;
   - « vendre / renouveler » : Flotte b2_11 (B45) et Plan de flotte b3t_05 (B44) ;
   - la caution : « Lever la caution » dans l'état des lieux (B12, G12) et le volet Caution (B32, G40–G42) ;
   - le contrôle au départ : Opérations (B24) et contrôle des pièces des contrats à risque (B41, F26) ;
   - les déplacements de véhicules : Transferts (B27), « déplacer » du plan (B43), action des véhicules inactifs (B39) ;
   - les immobilisations : Parc (B21), rappels immobilisants (B25), sinistres (B29) ;
   - les refacturations (frais d'avis G51, péages G31) créent des propositions qui réapparaissent dans le dossier (B13).
4. **Blocs mal rangés** : le barème (réglage, B48) clôt la page quotidienne ; la préparation 2027 (direction) est entre la
   Flotte et le barème ; les Questions (B33) sont entre les Opérations et l'Audit ; les analyses du matin (B39–B42) arrivent
   après l'Audit, les Avis et les Contestations ; la carte Opérations empile 6 sujets sans rapport (817 lignes).
5. **Filtres partiels** : le filtre d'agence et les familles ne s'appliquent qu'à la liste ; les vues B17–B48 montrent toutes
   les agences. Pas de recherche. Les gabarits « factures à envoyer » et « émises hier » (E15, E17) n'ont pas de filtre.
6. **Visibilité par rôle à préserver** : Flotte et 2027 (direction large, `EcranTavaro.tsx:866,872`), Audit (direction
   large, `AuditVue.tsx:76`), Plan de flotte (direction en réel, `AnalysesParc.tsx:383`), journal (direction en réel), analyses
   absentes sans compte (`AnalysesParc.tsx:261`).
7. **15 gestes écrivent sans fenêtre de confirmation** (bascules et choix compris) : G12, G13, G14, G15, G17, G24, G26, G28, G31, G42, G46, G51, G54, G60,
   G63.
8. **Chargements séparés** : le monde (dossiers) est partagé par la liste, le Parc, les Opérations, l'Audit, les Avis et les
   Contestations (recherche du contrat par id) ; Opérations, Questions, Audit et Analyses chargent leurs propres données et
   ne suivent pas le temps réel (`EcranTavaro.tsx:135`).
9. **Sans écran** : `loc_reglages` (`poserReglages`, `portes.ts:263`) et l'anonymisation (`portes.ts:260`) ; promesses #55
   relevés constructeur et #26 messagerie d'équipe.
10. **Moteurs hors dépôt** : les migrations derrière B19 (b2_17), B23–B35 et B44 (b2_12 à b2_20, b3t_05) et le point du
    matin b2_18 (E5–E12) ne sont pas dans `omega/modules/tavaro/migrations` (qui s'arrête à b2_11b et b3t_04) : elles ne
    sont lisibles que dans `~/Desktop/PEGASE/releve-prod/omega/prod/migrations`. Toute vérification des repères doit lire
    ce dossier (`node outils/verifier-aiguillage.mjs <dossier>`).
11. **Pastille « en préparation » périmée** : 14 des 15 libellés TAVARO de `lib/en-preparation.ts:114-130` ont un bloc, et la
    pastille n'est rendue nulle part (§ 7).

---

**Totaux** : 49 blocs (B01–B49) + 32 fenêtres (F01–F32) = 81 éléments visibles · 65 gestes qui écrivent ou envoient
(G01–G65) + 10 gestes de lecture/navigation (L1–L10) · 32 entrées (19 liens écrits par les moteurs E1–E19, dont 12 avec
objet ; 7 objets de demandes E20–E26 ; 6 écrans ou mécanismes qui mènent ici E27–E32) ; 0 paramètre d'adresse lu par l'écran.
