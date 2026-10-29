# Refonte des pages métiers — découpages proposés (29/10/2026)

Étape 0 faite : l'aiguillage (`components/espace2/aiguillage.ts`) et son contrôle
(`node outils/verifier-aiguillage.mjs ~/Desktop/PEGASE/releve-prod/omega/prod/migrations`).
Les inventaires (`daliro.md`, `lorani.md`, `tamila.md`, `tavaro.md`, `tiroma.md`, `varelo.md`)
sont le contrat : chaque bloc et chaque geste qu'ils listent garde une place ci-dessous.

**À valider par Teo avant la construction.** Les numéros (B…, G…, E…) renvoient aux inventaires.

## Règles communes à toutes les pages métiers

1. **Même grammaire que CASHD, FILED, REPUT, OFFLOAD (28/10)** : une vue d'ensemble sur la page
   Projects de Linear (filtres gardés dans l'adresse), des boîtes sur l'Inbox (liste à gauche, élément
   à droite, flèches et Échap), des tableaux par état sur le Board, une fiche sur la page d'un ticket
   (Issue), les réglages sur Settings. Gabarit `components/espace2/lin/`.
2. **Les portes ne bougent pas** : les nouvelles pages appellent les fonctions de `components/espace/<métier>/portes.ts`
   telles quelles. Aucune migration.
3. **Les repères** : la racine accepte `?objet=<objet_type>:<id>` (`lireObjet`) et les anciens paramètres
   (Lorani `?permis=`, `?projet=`), puis ouvre l'objet ou renvoie vers sa sous-page. Quand une sous-page
   existe, la règle de l'objet change dans `aiguillage.ts`, jamais le lien du moteur. Le contrôle passe à
   chaque fin de lot.
4. **Les réglages sortent de l'écran quotidien** : une sous-page « Réglages » par métier.
5. **Un geste irréversible ou qui envoie demande une confirmation** (les inventaires en listent 15 à 20
   par métier qui écrivent au premier clic) : on garde le geste, on ajoute la fenêtre.
6. **Exemple et réel** : chaque sous-page garde la bascule de l'écran actuel.
7. **L'ancien écran reste** sous `?ancien=1` tant que Teo n'a pas validé le nouveau.

## DALIRO — Chantiers (pilote)

Le dossier d'un chantier empile 17 cartes, dont 5 valent pour toute l'entreprise (§ 8.2, 8.4-9).

| Sous-page | Gabarit Linear | Contenu (inventaire) |
|---|---|---|
| Vue d'ensemble | Projects | compteurs (B01-B03, rendus exclusifs), liste des chantiers + recherche + familles par statut (B08), accord J-2 de la semaine (B04), point du mois (B06) |
| Chantier `/chantiers/[id]` | Issue, onglets | **Terrain** : en-tête, contrôles, questions, planning, dépendances, météo, appro (B11, B12, B15-B19) · **Argent** : marché, lots et déboursé, avenants, situations, factures, heures et rentabilité (B13, B14, B20, B22, B23, B25) · **Fil** : messages du chantier (B21) · **Réception** : réserves, retenue, décompte (B24) |
| À ranger | Inbox | messages du terrain non rattachés (B05) |
| Avenants et situations | Board par état | avenants à signer, situations à envoyer ou valider, tous chantiers (B20, B22) ; signature (F22-F23, P01 inchangée) |
| Équipes | liste | disponibilités 30 jours (B27), coût horaire (G48) |
| Réglages | Settings | annuaire et bibliothèque de prix (B26), accord J-2 (B04 réglage), contrôles d'organisation |

Repères : `btp_chantiers` → `/chantiers/[id]` ; `btp_avenant(s)`, `btp_situation(s)` → Avenants et situations ;
`btp_passages` → chantier, onglet Terrain.

## LORANI — Permis et projets

Environ 27 sections sous un permis ; 22 liens `?projet=` atterrissent sur le premier permis du projet (§ 8.3 O1-O2).

| Sous-page | Gabarit Linear | Contenu |
|---|---|---|
| Vue d'ensemble | Projects | permis et leurs délais d'instruction, compteurs (B2, B4, B5) ; dates lues sans permis enfin comptées (O8) |
| Permis `/permis/[id]` | Issue | instruction jusqu'à la purge (B7-B17, F7-F13) |
| Projet `/projets/[id]` | Issue, onglets | **Projet** (B18-B22) · **Urbanisme et pièces** (B23, B24) · **Contrôle** (B25) · **Consultation** (B26) · **Chantier** : argent, documents, visites, comptes rendus (B28-B30) · **Réception, GPA, DOE** (B31, B32) · **Assurances** (B33) |
| Courrier à ranger | Inbox | les 4 alertes sans endroit aujourd'hui (E4, E10, E11, E18) |
| Honoraires et temps | liste | B27, F22-F23, saisie des temps (G42) |
| Réglages | Settings | régime (F12), contrôles (F17, F18), éléments de mission (F22), marché et délais (F24, F35), activités (F41) |

Repères : `?permis=` → `/permis/[id]`, `?projet=` → `/projets/[id]` (les courriels déjà partis gardent ces adresses).

## TAMILA — Dossiers du cabinet

Contrainte forte : les clés et les textes déchiffrés vivent dans `EcranTamila` (§ 8.5-3). Ils montent dans
un `layout.tsx` de `/espace2/tamila` qui partage le trousseau entre les sous-pages, sinon chaque page
redéchiffre (PBKDF2) ou rouvre le coffre (journalisé). Ouvrir un dossier écrit dans le journal : une liste
ne charge pas les dossiers (§ 8.5-4).

| Sous-page | Gabarit Linear | Contenu |
|---|---|---|
| Vue d'ensemble | Projects | compteurs et liste (B9-B11), échéances réunies : délais, audiences, expertises, relances (B20-B22, B24) |
| Arrivées | Inbox | avis RPVA à rattacher, avis entrants (B7, B8, B35) |
| Dossier `/dossiers/[id]` | Issue, onglets | **Procédure** (B20, B21, B24, B25, B35, B39) · **Pièces** (B22, B26-B29, lectures après pièces) · **Honoraires** (B30-B32) · **Conformité** : conflits **en premier**, vigilance, murailles, exports, clôture (B33, B34, B36-B38, B18) |
| Honoraires du cabinet | liste | B12 (aujourd'hui une fenêtre) |
| Pilotage | Projects | B13 (aujourd'hui une fenêtre) |
| Conformité du cabinet | liste | conflits sans décision (E7), propositions de temps (E4), journal des accès |
| Réglages | Settings | coffre (B14), installation (B3), clé d'index, en-tête des factures |

Repères : aucune ligne du point ne nomme un dossier (voulu, `b4_14:15-18`) : les liens visent une sous-page
filtrée (E1-E3, E6, E10 → vue d'ensemble ; E4, E8, E9 → honoraires ; E5, E15 → arrivées ; E7 → conformité ;
E11-E14 → échéances).

## TAVARO — Location

| Sous-page | Gabarit Linear | Contenu |
|---|---|---|
| Vue d'ensemble | Projects | analyses du matin (B38-B42), compteurs, filtre d'agence appliqué à toute la page (§ 8.3-5) |
| Retours à facturer | Inbox | contrats (liste), retour chiffré, propositions à décider (B02, B03, B06-B11) |
| Contrat `/contrats/[id]` | Issue | dossier du contrat : état des lieux, factures, avoirs, caution (B12-B16, B32) |
| Parc et atelier | Board par état | remises, immobilisations, entretiens, rappels, contrôle au départ, Crit'Air et CT (B17-B22, B24-B26) |
| Amendes, péages, contestations | Inbox | délais légaux 45 j / 72 h (B28, B36, B37) |
| Incidents | liste | sinistres, cautions (B29, B30) |
| Réseau et flotte | Projects | transferts, plan de flotte, flotte, 2027, audit (B27, B34, B35, B43-B47) — direction |
| Réglages | Settings | barème (B48), responsables (B19), grille (B31), référentiel (B26), `loc_reglages` (sans écran aujourd'hui) |

Doublons à trancher au passage (§ 8.3-3) : cote de revente (deux portes), vendre / renouveler, caution.
Repères : `loc_contrats` → contrat ; `loc_vehicules`, `loc_remises`, `loc_immobilisations`, `loc_entretiens`,
`loc_rappels_vehicules` → Parc ; `loc_avis_contravention`, `loc_passages_peage`, `loc_contestations` → Amendes ;
`loc_reservations` → vue d'ensemble ; `/tavaro/factures` du lot 2a → Retours à facturer.

## TIROMA — Cabinet dentaire

Contrainte : la promesse du site « Votre cabinet tient sur une seule page » (`EnDirect.tsx:17`). Le site
montre lui-même quatre onglets (Point du matin, Créneaux, Fauteuils, Plans, `textes.ts:129-134`). Proposition :
la vue d'ensemble reste **la** page du jour, complète ; les sous-pages reprennent les onglets du site.

| Sous-page | Gabarit Linear | Contenu |
|---|---|---|
| Aujourd'hui | Projects | compteurs (B2-B4), créneaux à sauver (8), plans sans rendez-vous (9), vérifications avant rendez-vous (16), réponses des patients (24) |
| Créneaux et appels | Inbox | créneaux (8), liste d'attente (25), contrôles dus (23), absences patients (10), appels (12, 29) |
| Fauteuils | Board / semaine | charge, demi-journées vides (17-21, les deux notions enfin séparées), équipe absente (11) |
| Plans et devis | Board par état | plans, devis à relancer, signés sans rendez-vous (9, 15, 22) |
| Pilotage | Projects | synthèse, réinscription, pilotage, objectifs (13, 14, 18) |
| Réglages | Settings | le cabinet (28), règles communes (26), branchement et export (27, 7), moyens de contact (24) |

## VARELO — Référentiel du groupe

Ne pas déplacer `components/espace/varelo/csv.ts` : CASHD l'importe.

| Sous-page | Gabarit Linear | Contenu |
|---|---|---|
| Ce matin | Projects | Ce matin (4.1-4.7, 22), chiffres du groupe (5, 6) |
| Référentiel | Inbox | nature **en haut** (9), compteurs, liste et fiche d'un objet (10-12), lots à côté de la liste (16), export (G3) |
| Finance | liste | encours (13), réciproques (15), caisses (6) |
| Contrats | liste | contrats et échéances juridiques (14) |
| Opérations | Board par état | réserves (8), reportings (7) |
| Groupe | Projects | page présidence (5, 5.a, 5.b) |
| Sources et structure | Settings | sociétés (17), branchements (19), dépôt d'un export (20, une seule entrée), règles (18), installation (3) |

## Faits relevés pendant l'étape 0

- `omega/modules` sur main est en retard sur la production : les migrations réelles sont assemblées sur
  `releve-prod` (`omega/prod/migrations`). Les « portes absentes du dépôt » signalées par les inventaires
  (Tiroma b3_23, Varelo b1_15-b1_17, Daliro b6_26-b6_36, Tamila b4_17-b4_18, Tavaro b2_12-b2_20) y sont.
- `npm run build` échoue sur ce Mac sur `EcranVarelo.tsx` (fichiers `Reserves.tsx` / `reserves.ts`, même nom
  à la casse près, disque insensible à la casse) : antérieur, sans lien avec la refonte, à régler avant de
  pousser depuis ce poste.
- Le point du matin de Tavaro (lot 2a) écrit `/tavaro/factures` sans `/espace` : 404 jusqu'ici, ramené à la
  page Tavaro par l'aiguillage.
