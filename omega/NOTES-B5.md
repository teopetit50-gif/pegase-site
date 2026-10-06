# Session B5 — LORANI, le calendrier du permis (vague 2)

Branche `worker-b5`. Session B5 : session_018iNiXjY8eWmMjaGrXSGgma (Opus 5.5, reprise de session_013VSXzohLtDQS5bbWfRb4xR le 06/10 à 1 h 30 Z). Coordinateur : session_01BCGFdpRKBvXKjouC75sYBg (Opus 5.5, depuis le 06/10 à 1 h 10 ; auparavant session_01B4JNQXyT69GytdvE9SjAnE).
Dernière mise à jour : 05/10/2026, 23 h.

## Jauges

| Jauge | Valeur | Ce qui la fait monter |
|---|---|---|
| **Mécanique** (le socle fait ce que la page promet, prouvé par des tests joués sur la recette) | 95 % (114/114 le 06/10 à 2 h 05 Z, b5_05 et b5_06 posées ; avant :) 90 % (**111/111** à 9ba2900, b5_01 à b5_04 posées sur la recette) | b5_01 à b5_03 posés sur la recette ; test pgTAP joué par le coordinateur : **110/111** (20 étapes : projet, équipe, RLS, lecture simulée par les portes du lecteur, confirmation, échéances dans `delais`, rappel J-10 par `controler_delais` → alerte → envoi `a_valider` au chef de projet, décision tacite, affichage, recours, purge, mesures, journal) ; les deux rouges corrigés (b5_04 + lecture du point) : **111/111 le 06/10 à 0 h 01 Z** ; manque : le lecteur réel ne connaît pas les types Lorani (spécification écrite, à A1) |
| **Livrable client** (un gérant d'agence ouvre /espace/lorani et suit un vrai permis) | 96 % (06/10, 2 h 46 Z : les six types de courriers réels ; 2 h 26 Z : arrêté et constat d'affichage réels aussi ; 2 h 10 Z : récépissé et demande de pièces réels lus par le lecteur, proposés, confirmés par l'écran ; avant :) 85 % (**en ligne** sur https://omegaai.fr/espace/lorani depuis le 06/10, 0 h 52) | écran recetté aux cinq largeurs (41 contrôles), **relu en base réelle** avec `gerant@banc-varelo.test` : projet et PCMI créés par l'écran, calendrier calculé par le socle, **un vrai récépissé déposé et lu par le lecteur** (mais rendu « courrier non reconnu », voir § 3) ; fusion sur `main` en cours chez le coordinateur ; reste la vérification sur omegaai.fr et le rejeu du dépôt réel quand le lecteur connaît les types |

**Ce qui manque** : le lecteur (A1) doit apprendre les six types de courriers Lorani (`omega/modules/lorani/CHAMPS-LECTURE-LORANI.md`) ;
la fusion dans `main` ; la vérification sur omegaai.fr. **Ce que Teo doit fournir** : rien pour l'instant ; pour que
les rappels partent réellement chez une agence, un accord permanent (politique de validation) sur les envois
`envoi.email` du module lorani, ou l'approbation au cas par cas dans /espace/validations — c'est le dessin du socle
(un moteur ne se passe jamais de la validation) ; sur le banc, la ligne `reglages_envois` lorani (mode essai) est posée.

## La promesse faite aux clients (app/secteurs/architectes)

Sur la page des architectes, Lorani promet — c'est le périmètre de B5, le reste de la page (PLU lu depuis l'adresse,
métré, décennales, visas, situations) est hors de ce module :

- « Calendrier du permis jusqu'à la purge des recours » ;
- « Délai d'instruction suivi jusqu'à la purge » ;
- « Lorani suit-il le permis après le dépôt ? Oui. Il suit le délai d'instruction, la demande de pièces
  complémentaires et la réponse à préparer, puis la date du permis tacite et la fin du délai de recours des tiers à
  partir de l'affichage. Vous savez quand le chantier peut démarrer. »

Le socle (omega/SOCLE-EXTRAITS-LORANI.sql, 9 tables, 46 fonctions, 2 crons) porte déjà : projets, lots, intervenants,
équipe de projet, permis avec son calcul (`lorani_calendrier_permis`, version lorani.m4.1), échéances posées dans
`delais`, lectures de courriers (`lorani_permis_dates_lues`), décision implicite, recours, point du matin et mesures.

## 1. Le scénario réel de bout en bout — omega/tests/lorani/b5_01_parcours_permis.sql

Une agence d'architecture (le client du banc, « Groupe Sogexal (banc) », `cccccccc-0000-4000-8000-00000000000c`)
suit un permis de construire (Résidence Lemoine, six logements, Nantes), puis une déclaration préalable qui va jusqu'à
la purge. Les dates sont relatives au jour du test (J) parce que le recalcul du socle lit `now()` ; la demande de
pièces est datée pour que le rappel J-10 tombe le jour du test (recherche par `echeance_de`), le dépôt trois jours
avant. Personnes : `gerant` (…c1, gérant), `referent` (…c2, valideur, chef de projet, accès écriture), `daf` (…c3,
valideur, assistant, accès lecture), `daf2` (…c4, valideur, hors projet). Le test rend `lorani_projet` restreint pour
le banc le temps du test (objets_restreints, annulé par runtests) pour prouver l'isolement personne par personne.

| # | Étape | Qui | Par où | Ce que le test vérifie |
|---|---|---|---|---|
| 1 | Ouvrir le projet « Maison Lemoine », 44000 / INSEE 44109, parcelles « ab 123, AB  124 » | gérant | INSERT `lorani_projets` (RLS) | territoire `metropole` déduit, entité principale héritée, nom épuré, parcelles normalisées |
| 2 | Équipe (referent chef de projet, daf assistant), lots 01 et 02, un BET structure sur le lot 01 | gérant | INSERT membres, lots, intervenants | numéro de lot unique (23505), entité héritée, `lorani_chef_de_projet` = referent |
| 3 | Qui voit quoi | daf2, autre client, daf, referent | SELECT / UPDATE sous RLS | daf2 et l'autre organisation ne voient rien ; daf voit sans pouvoir modifier ; referent voit |
| 4 | Permis PC saisi sans dépôt | referent | INSERT `lorani_permis` | `a_deposer`, silence `tacite`, règle `instruction_pc`, aucune échéance |
| 5 | Récépissé déposé sur le projet et lu | referent, lecteur | `lorani_deposer_piece` (b5_01) → `commencer_lecture` → `enregistrer_lecture` (service_role) → `lorani_lectures_passage()` | pièce `lue` module lorani, abonnement `piece_lue.lorani`, proposition `depot` rattachée au permis, date + numéro normalisé, `verifiee`, alerte `lorani:lecture:<id>` |
| 6 | Confirmer la date lue | daf2 (refusé P0002), referent | `lorani_confirmer_date_lue` | `date_depot`, `numero`, état `instruction`, fin d'instruction calculée, échéance `instruction` dans `delais`, journal `date_permis_confirmee` + `echeances_recalculees`, alerte acquittée |
| 7 | Demande de pièces (PC5, « PC 8 ») lue ; le point du matin | lecteur, cron | même chaîne ; `lorani_deposer_point` | proposition `demande_pieces` `[{PC5},{PC8}]` ; une section « Calendrier des permis » pour gérant et chef de projet, ligne « une date lue… à confirmer ou à écarter », rien pour daf2 |
| 8 | Confirmée | referent | `lorani_confirmer_date_lue` | `pieces_demandees`, pièces gardées, pas de fin d'instruction, échéance `pieces` à J+10, rappels [10,3,0], responsable = chef de projet, journal |
| 9 | Lettre de délai mal lue (5 mois), écartée | referent | `lorani_ecarter_date_lue` | motif obligatoire (22023), écartée par referent, le permis n'en garde rien, plus confirmable (55000), journal `date_lue_ecartee` |
| 10 | Le rappel J-10 des pièces, par la vraie chaîne | cron | `private.controler_delais(now())` → travail `lorani.calendrier.rappel` → `lorani_calendrier_passage()` | travail publié avec `rappel = 10`, `rappels_faits = {10}`, travail `fait`, alerte « PC « Maison Lemoine » : pièces manquantes… au plus tard le … (dans 10 jours) » niveau attention au chef de projet ; **b5_03** : un envoi courriel préparé (clé `lorani:permis:<id>:pieces:rappel:10`), sujet et corps nommant les pièces et le lien `/espace/lorani?permis=`, aucune alerte interne d'échec ; mesure `lorani.calendrier.dates_completes` |
| 11 | Pièces reçues par la mairie le J-5 | referent | UPDATE `lorani_permis.date_pieces_fournies` | `instruction`, décision attendue > J+30, échéance `pieces` close `tenu`, rappel acquitté, échéance `instruction` recalculée |
| 12 | Garde-fous | referent | UPDATE decision = 'tacite' ; `lorani_confirmer_decision_implicite` | 42501 ; 55000 (rien à confirmer) |
| 13 | DP « Clôture Martin » déposée J-200 | referent | INSERT `lorani_permis` | `decision_a_confirmer`, `decision_implicite = {tacite, fin+1}` |
| 14 | Confirmer la non-opposition tacite | daf (P0002), referent | `lorani_confirmer_decision_implicite` | `tacite` datée du lendemain de la fin du délai, `accorde`, échéances `affichage` et `retrait`, pas de purge sans affichage, journal, pas deux fois (55000) |
| 15 | Garde-fous recours | referent | INSERT `lorani_permis_recours` | refusé sur un permis non accordé et avant la décision (22023) |
| 16 | Constat d'affichage (J-165) lu puis confirmé | lecteur, referent | chaîne + `lorani_confirmer_date_lue` | proposition rattachée à la DP par son numéro (deux permis dans le dossier), `date_affichage`, échéance `recours`, purge calculée et acquise → `purge` |
| 17 | Recours contentieux J-150, rejeté J-20 | referent | INSERT puis UPDATE recours | `recours_en_cours` sans purge, avertissement ; puis purge reportée au J-20, `chantier_sans_risque_le` = J-19 |
| 18 | Passage quotidien | cron | `lorani_calendrier_passage()` | recalculs sans erreur, le PC reste `instruction`, la DP porte `purge`, ses échéances passées sont closes |
| 19 | Le calcul pur | daf | `lorani_calendrier_permis` | un PCMI déposé il y a dix jours : `completude`, trois étapes |
| 20 | Le journal | test, referent | `journal_opposable` | les quatre actions du module présentes ; INSERT direct refusé |

### Les portes que le scénario emprunte (jamais d'écriture directe hors RLS)

- Tables écrites sous RLS par un membre (c'est le dessin du socle, comme `approbations` pour A3) : `lorani_projets`,
  `lorani_membres_projet`, `lorani_lots`, `lorani_intervenants`, `lorani_permis` (dates, cases, type),
  `lorani_permis_recours`, `acces_objets`. Les triggers gardent (`lorani_garder_permis`, `lorani_preparer_recours`,
  `lorani_heriter_projet`) et recalculent.
- Portes RPC : `lorani_deposer_piece` (b5_01), `lorani_confirmer_date_lue`, `lorani_ecarter_date_lue`,
  `lorani_confirmer_decision_implicite`, `lorani_recalculer_permis`, `lorani_calendrier_permis` (calcul pur),
  `lorani_mesurer_calendrier`.
- Portes du lecteur (service_role) : `commencer_lecture`, `enregistrer_lecture` ; file : `deposer_travail`.
- Crons, appelés tels quels dans le test : `private.controler_delais` (:07), `lorani_lectures_passage` (*/5),
  `lorani_calendrier_passage` (:12).

## 2. Trous du socle et migrations — omega/modules/lorani/migrations/

| Fichier | Ce qu'il corrige | État |
|---|---|---|
| `b5_01_lorani_deposer_piece.sql` | aucune porte n'attachait une pièce à un projet Lorani (FILED a `filed_deposer_piece`). `public.lorani_deposer_piece(p_projet, p_nom_fichier, p_mime, p_octets, p_sha256, p_chemin, p_type_piece) → uuid`, réservée à qui écrit sur le projet, `statut = 'recue'` → le trigger du socle dépose `lecteur.lire`. Journal `lorani.piece_deposee`. Le bucket est couvert par la politique 19o du coordinateur (`<client>/<objet_type>/…`). | envoyé (lot 1) |
| `b5_02_liens_espace.sql` | les alertes et les lignes du point pointaient `/secteurs/architectes/permis` (page inexistante). `lorani_lien_permis` → `/espace/lorani?permis=`, `lorani_lien_projet` → `?projet=` ; `lorani_alerter_transition` et `lorani_lire_piece` recopiés avec le lien. | envoyé (lot 1) |
| `b5_03_rappels_envoyes.sql` | la page promet des rappels, le socle ne levait qu'une alerte (remise le lendemain par le point du matin). `lorani_alerter_rappel` prépare en plus un ENVOI courriel au chef de projet (`private.preparer_envoi`, clé = clé de l'alerte, transactionnel, échéance = date butoir, corps nommant les pièces et le lien) ; il passe par la file de validation `envoi.email` sauf accord permanent ; en mode essai il part à l'adresse d'essai. Un échec de préparation ne casse pas le rappel (alerte interne). Hypothèse à confirmer : `resoudre_destinataire` accepte `{"membre": <user_id>}`. | envoyé (lot 1) |
| `b5_04_ordre_pieces.sql` | `lorani_valeurs_de_piece` rangeait les pièces réclamées par `boite ->> 'y1'` / `'x0'`, clés que le lecteur n'écrit pas ({x, y, l, h}) : ordre aléatoire, relevé par le coordinateur au premier passage du test (tantôt [PC8, PC5]). Désormais y puis x (repli y1/x0), puis `cree_le`, `id`. | envoyé (9ba2900) |
| ~~b5_03 visibilité des échéances~~ | retiré : la politique SELECT de `lorani_permis_echeances` passe par une sous-requête sur `lorani_projets`, elle-même sous RLS : un membre qui ne voit pas le projet ne voit pas ses échéances. Rien à poser. | — |

Faits reçus du coordinateur (05/10, 22 h 30) et repris dans le test : colonnes de `public.pieces` (statut `recue`,
`depose_par`, unique `(client, module, objet_type, objet_id, sha256)`) ; `private.abonnements` lorani
(`delai.proche.lorani → lorani.calendrier.rappel`, `delai.depasse.lorani → lorani.calendrier.depasse`,
`piece_lue.lorani → lorani.piece_lue`) ; `private.controler_delais(p_maintenant)` publie `delai.proche.<module>` avec
`{delai, module, objet_type, objet_id, echeance, jours_restants, rappel}` ; `objets_restreints` vide pour le banc ;
règles `lorani.urbanisme.*` v1 calendaires (completude 1 mois, pieces_manquantes 3, dp 1, pcmi 2, pd 2, pc 3,
erp_igh 5, mh_inscrit 5, *_protege +1, retrait 3, recours_tiers 2 mois francs prorogés, silence_recours_gracieux 2,
recours_apres_gracieux 2 francs, relance_affichage 15 jours) ; comptes …c1 à …c4 ; Realtime posé (lot 19n) sur
`lorani_permis`, `lorani_permis_dates_lues`, `lorani_permis_echeances`, `lorani_permis_recours`, `delais`.

## 3. Écran client — /espace/lorani

`app/espace/lorani/page.tsx` + `components/espace/lorani/` (types, etats, exemples, portes, lorani.css, PermisVue,
EcranLorani), une ligne « Permis » dans `components/espace/ecrans.ts` (accordée par le coordinateur). Modèle A3 :
coquille du layout, ruban « Données d'exemple », interrupteur base réelle, charte `.resa` / `.r-btn` / `.rv-champ`,
Dialog de `components/ui`, temps réel sur les quatre tables publiées.

- **En haut** : cinq compteurs qui filtrent (à confirmer, pièces à fournir, en instruction, accordés, clos) ; « Nouveau projet ».
- **À gauche** : les permis groupés par projet, triés par ce qui presse (dates lues à confirmer, puis décision
  implicite, puis la prochaine date), avec type, état, numéro, prochaine étape.
- **À droite, le permis** : quatre chiffres (déposé le, décision attendue ou pièces à fournir avant le, purgé le,
  chantier sans risque dès le), le régime (règle, délai notifié, effet du silence, articles) ; puis **ce qui attend un
  membre** : la décision implicite à confirmer (`lorani_confirmer_decision_implicite`), les dates lues sur les
  courriers (citations, « citation retrouvée », **Confirmer** avec correction des valeurs et choix du permis quand le
  dossier en a plusieurs → `lorani_confirmer_date_lue(p_id, p_valeurs, p_permis)`, **Écarter** avec motif obligatoire
  → `lorani_ecarter_date_lue`) ; **Saisir ce qui est arrivé** (dépôt, demande de pièces, pièces reçues, délai notifié,
  arrêté, affichage, recours — chacun un Dialog, UPDATE/INSERT sous RLS) ; le **calendrier** (chaque étape : date,
  fait / à venir / passé / en retard / à confirmer, prévision ou certaine, l'issue ou le motif, l'article du code en
  lien, la ligne « aujourd'hui ») ; les avertissements du calcul ; les **échéances et rappels** du socle (rappels prévus
  et partis, responsable, action attendue, règle) ; les **recours** et leur issue ; les **courriers du dossier** avec ce
  qu'on en a décidé et par qui.
- **Le dossier du projet** : équipe (ajouter), lots (ajouter), intervenants (ajouter), « Déposer un courrier de la
  mairie » (fichier → `omega-clients/<client>/lorani_projet/<projet>/…` puis `lorani_deposer_piece`), « Nouveau permis ».
- `?permis=<id>` et `?projet=<id>` ouvrent le dossier : c'est le lien des alertes et du point du matin (b5_02).
- **Exemple** : Atelier Bertin (pôle architecture), cinq projets, six permis à tous les stades (à déposer, pièces à
  fournir avec une lettre de délai lue à confirmer, ERP en instruction avec délai notifié, DP tacite à confirmer,
  accordé avant purge, purgé après un recours gracieux rejeté) ; les saisies s'appliquent en mémoire.
- **Validation** : `npx tsc --noEmit` ✓, `npx eslint` ✓ (0 erreur), `npm run build` ✓, recette aux cinq largeurs ✓
  (`node omega/recette-b5/recette-lorani.mjs`, 39 contrôles : chargement, débordement, éléments trop larges, mots
  anglais, titre, compteurs ; puis confirmer une date lue avec correction, confirmer la décision tacite, saisir
  l'affichage, saisir un recours et le voir suspendre la purge, ouvrir par `?permis=`). Captures dans
  `omega/recette-b5/` (`lorani-<largeur>.jpg`, `lorani-confirmer-1440.jpg`, `lorani-implicite-1440.jpg`,
  `lorani-recours-1440.jpg`, `lorani-purge-1024.jpg`).
- **Régime du permis** (06/10) : bouton « Régime » dans l'en-tête → Dialog à cases (secteur protégé, monument
  inscrit, ERP, IGH, évaluation environnementale, cas de l'art. R*424-2 lus dans `lorani_cas_rejet`) → UPDATE
  `lorani_permis` ; en exemple l'effet du silence et les articles se recalculent en mémoire (recette : « rejet
  implicite (art. R*424-2, d) »).
- **Relecture en base réelle** (06/10, `omega/recette-b5/relecture-reelle.mjs`, calqué sur A3) : serveur de dev pointé
  sur la recette (`NEXT_PUBLIC_SUPABASE_URL` + clé `publishable` reçues du coordinateur), session de
  `gerant@banc-varelo.test` posée en cookie, Chromium avec `--ignore-certificate-errors` (le mandataire du conteneur ;
  sans lui, « Failed to fetch »). Résultat : identité affichée, interrupteur sur « Base réelle », toutes les lectures
  passent (la seule erreur 400 était `pieces.cree_le`, corrigée en `recue_le`), **puis l'écran a écrit pour de vrai** :
  projet « Maison Lemoine (banc) » (INSERT `lorani_projets` sous RLS, territoire déduit) et PCMI « Pavillon Lemoine »
  déposé il y a vingt jours (INSERT `lorani_permis`) → le trigger du socle a calculé : état « complétude », règle
  `lorani.urbanisme.instruction_pcmi`, décision attendue à deux mois, 3 étapes, 2 échéances posées dans `delais`,
  article R*423 cité. Captures `reel-lorani-1440.jpg`, `reel-permis-1440.jpg`. Ces deux lignes restent sur le banc
  (données de recette, comme la délégation d'A3). Realtime : la poignée de main WebSocket échoue depuis le conteneur
  (mandataire sans WebSocket), comme pour A3 — à vérifier depuis un navigateur ordinaire.
- **Un vrai récépissé déposé par l'écran** (06/10, `omega/recette-b5/courrier-reel.mjs`) : PDF d'une page fabriqué
  pour l'essai (`recepisse-depot.pdf`, « Dossier n° PC 044109 26 A0042 … déposé le 15/09/2026 »), posé dans le
  contrôle de fichier par CDP, nature « Récépissé de dépôt », Déposer → fichier dans
  `omega-clients/<client>/lorani_projet/<projet>/…`, pièce créée par `lorani_deposer_piece` (b5_01 sur la recette),
  visible dans « Courriers du dossier », **prise par le lecteur en 35 s** (`en_lecture`) puis lue en 70 s… en
  `a_classer`, `type_piece = 'autre'`, motif « Récépissé de dépôt d'un permis de construire délivré par la Ville de
  Nantes : document administratif, sans montant ni caractère de pièce comptable ». **Le lecteur ne connaît que les
  pièces de FILED** : il lit parfaitement le courrier mais ne sait pas le nommer, donc `lorani_lire_piece` ne propose
  rien. Spécification écrite pour A1 : `omega/modules/lorani/CHAMPS-LECTURE-LORANI.md` (six types, leurs champs, un
  exemple de résultat attendu). L'écran dit désormais « Courrier non reconnu » avec le motif du lecteur et invite à
  saisir la date à la main. **C'est le seul maillon manquant de la chaîne réelle** ; la mécanique côté socle est
  prouvée par le test (étapes 5, 7, 9, 16 jouent `enregistrer_lecture` avec les bons types).
- **Pas encore fait** : revoir le dépôt réel dès que le lecteur connaît les types Lorani (le script attend la
  proposition et la confirme) ; les annexes de la purge (`chantier_sans_risque_le`) ne s'affichent qu'une fois
  l'affichage saisi.

## 4. Réponses du coordinateur (05/10, 23 h 43) et ce qui reste ouvert

1. `private.resoudre_destinataire(p_client, p_canal, p_destinataire, p_entite)` : `{"membre": "<user_id>"}` est exactement
   la forme (clés admises : membre ou adresse, nom, ref, fuseau, territoire, professionnel, langue) ; l'adresse vient
   d'`auth.users.email`, sans adresse l'envoi naît `bloque` (pas d'exception). b5_03 est juste.
2. `private.modules_envois` n'a pas de ligne lorani ; `reglages_envois` du banc : lignes `lorani` et `tavaro` posées en
   mode essai (adresse de Teo). Si `preparer_envoi` exige `modules_envois`, le test le dira (étape 10).
3. Clé publique de la recette reçue, relecture réelle faite (§ 3).

Ouvert : le TAP du test à 5a4a2e6 (en cours chez le coordinateur) ; la fusion de l'écran sur `main`.

## 5. Journal de bord

- 05/10 soir : lecture du cadre, scénario écrit et envoyé ; test pgTAP, migrations b5_01/02/03, écran, recette ;
  réponses du coordinateur intégrées (dates du test recalées sur la vraie chaîne des délais, colonnes de `pieces`,
  comptes du banc). Lot 1 envoyé au coordinateur : poser b5_01, b5_02, b5_03, jouer `omega/tests/lorani/b5_01_parcours_permis.sql`.
- 05/10, 23 h : pause générale demandée par Teo (limite d'usage) ; reprise à 23 h 43. Le coordinateur a posé b5_01 et
  b5_02, rejoue le test à 5a4a2e6 (la version 50ccebd mourait sur `deposer_travail(…, integer)` ; 5a4a2e6 passe par
  `controler_delais`, plus d'appel direct).
- 06/10, nuit : dialogue « Régime », relecture en base réelle (projet + permis créés par l'écran sur le banc),
  `pieces.recue_le`, notes. Prêt à fusionner — liste des fichiers envoyée au coordinateur.
- 05/10, 23 h 47 (coordinateur) : b5_03 posé ; test rejoué deux fois : **110/111** avec la ligne `reglages_envois`
  lorani du banc (sans elle, l'envoi du rappel naît `bloque` ; avec, `a_valider → referent@banc-varelo.test`). Rouges :
  ordre des pièces non déterministe (→ b5_04) et la lecture du point du matin (→ `points_sections` / `points_items`).
  Corrigés dans 9ba2900, renvoyé.
- 06/10, 0 h : un vrai récépissé PDF déposé par l'écran sur le banc (`omega/recette-b5/courrier-reel.mjs`) : fichier
  dans le bucket, pièce créée par `lorani_deposer_piece`, prise par le lecteur en 35 s, lue en 70 s en `a_classer`
  (types Lorani inconnus du lecteur) ; aucune proposition en neuf minutes, comme attendu. Spécification écrite pour A1.
- 06/10, 0 h 52 (coordinateur) : **en ligne**. `main` déployé (7c7c934 puis 6635b1c) ; vérifié par curl à 1 h :
  https://omegaai.fr/espace/lorani répond 200 et sert « Calendrier des permis », « Vous savez quand le chantier peut
  démarrer », le ruban « Données d'exemple » et l'onglet « Permis ». omegaai.fr pointe sur la production (sans banc) :
  la base réelle s'y verra avec un compte de production ; la relecture réelle reste sur le Next local pointé sur la
  recette.
- 06/10, 0 h 54 (coordinateur) : b5_04 posée (avec b5_01 v2 et b5_03 v2), `^test_b5_` rejoué : **111/111**. worker-b5
  8f6d793 fusionné dans main (2e8bbf9). **Lot B5 clos** ; reprise si le lecteur d'A1 sort les six types de courriers
  (rejeu de `courrier-reel.mjs`) ou si un TAP tombe. Jauges : mécanique 90 %, livrable 85 %.
- 06/10, 1 h 30 Z (reprise, session_018iNiXjY8eWmMjaGrXSGgma) : le lecteur d'A1 v14 (055b29c) connaît les six types.
  Rejeu préparé (531d0b3) : `fabriquer-courrier.mjs` fabrique les courriers d'essai sans dépendance (récépissé v2,
  demande de pièces PCMI 3 / PCMI 6 — nouvelles empreintes, l'ancien récépissé reste en `a_classer`) ;
  `courrier-reel.mjs <session.json> <courrier.pdf> [origine] [nature]`. **Bloqué** : le conteneur neuf n'a ni la clé
  publishable de la recette ni la session de `gerant@banc-varelo.test` ; demandées au coordinateur.
- 06/10, 1 h 31–1 h 45 Z : **dépôt réel rejoué** avec le lecteur v14 (compte `gerant@banc-varelo.test`, Next local
  pointé sur la recette, permis « Pavillon Lemoine »).
  - `recepisse-depot-v2.pdf`, nature « Récépissé de dépôt » : pièce `Lue` en 35 s ; proposition au passage suivant
    (214 s) : « Date de dépôt — Citation retrouvée — Date de dépôt : 15/09/2026, Numéro du dossier : PC04410926A0042 »,
    citations « Dossier déposé le 15/09/2026 en mairie de Nantes. (page 1) » et « PC 044109 26 A0042 (page 1) ».
    Confirmée par l'écran : le permis porte le numéro, plus rien à confirmer. **La chaîne réelle est complète.**
  - `demande-pieces.pdf` (PCMI 3, PCMI 6, lettre du 01/10/2026) : `Lue` en 35 s, proposition à 280 s : « Date de la
    demande : 01/10/2026 — **Pièces réclamées : aucune** », citation « PCMI 3 : plan en coupe… (page 1) ». Le lecteur
    reconnaît le type et cite les pièces ; **le socle les jette** : `private.lorani_propositions` ne garde que
    `^(PC|PA|PD|DP|CU)\s*\d…`, donc pas les codes PCMI / DPMI. Le contrôle du script (trop lâche, il lisait la citation)
    a laissé passer et la demande a été confirmée **vide** sur le banc (permis en `pieces_demandees`, `pieces_demandees = []`).
  - Corrections : **b5_05** (`omega/modules/lorani/migrations/b5_05_codes_pcmi.sql`, une ligne du filtre :
    `(PCMI|DPMI|PC|PA|PD|DP|CU)`) ; une assertion de plus dans le test (étape 19, b5_05) ; l'écran exige la liste des
    pièces pour confirmer une demande et ne coupe plus « PCMI 3 » en deux (`decouperCodes`) ; le script vérifie la liste
    elle-même. tsc, eslint, build, recette aux cinq largeurs : verts.
- 06/10, 1 h 49 Z (coordinateur) : b5_05 posée, `^test_b5_` **112/112**, PermisVue.tsx fusionné dans main (9b7ab27).
- 06/10, 1 h 50–2 h 00 Z : second dépôt réel, `demande-pieces-v2.pdf` (même lettre + une ligne de pied, autre
  empreinte ; `fabriquer-courrier.mjs … [mention]`) : `Lue` à 71 s, **aucune proposition en 9 min** (deux passages de
  `lorani_lectures_passage`). `lorani_deja_saisi` ne devrait pas l'écarter (permis `pieces_demandees = []`, lu
  `[PCMI3, PCMI6]`) ; l'écran montre toute proposition du permis. Lignes brutes demandées au coordinateur (pièce,
  `pieces_valeurs`, travail `lorani.piece_lue`, `lorani_permis_dates_lues`).
- 06/10, 2 h 01 Z (coordinateur, brut) : pièce 059e705e… `lue`, `lorani_demande_pieces` 0,97 ; `pieces_valeurs` :
  `date_lettre` "2026-10-01", `numero_dossier`, et **une seule ligne `pieces` dont la valeur est le tableau
  ["PCMI 3","PCMI 6"]** ; `lorani_valeurs_de_piece` la rend en texte, `lorani_propositions` la rejette → `pieces = []`
  → `lorani_deja_saisi` (le permis porte déjà []) → 0 proposition. C'est aussi la cause du « aucune » de 1 h 40.
- **b5_06** (`omega/modules/lorani/migrations/b5_06_pieces_en_tableau.sql`) : `private.lorani_codes_pieces(jsonb)`,
  pure, accepte une valeur par code, une valeur tableau jsonb, une valeur texte tableau JSON (JSON illisible = texte),
  un texte à virgules ; ordre gardé, sans doublon, filtre de b5_05 ; `lorani_propositions` (corps de b5_05) l'appelle.
  Essayé sur un Postgres 16 local jetable : sept formes, toutes justes ; la proposition rend [PCMI3, PCMI6].
  Test : deux assertions de plus (étape 19, b5_06) → 114 attendues.
- 06/10, 2 h 02 Z (coordinateur) : décision commune (A1, `omega/CHAMPS-LECTURE.md` 9ebefca, « Une ligne par champ,
  jamais deux ») : une liste = UNE ligne dont la valeur est un tableau jsonb. Suites : b5_06 recopie aussi
  `lorani_valeurs_de_piece` (corps de b5_04) pour remonter le tableau tel quel (jsonb) ; l'ancienne forme reste lue.
  Essayé en local (table `pieces_valeurs` réduite) : tableau → [PCMI3, PCMI6] ; deux lignes → [PC5, PC8] dans l'ordre
  des boîtes. Test, étape 7 : la demande de pièces s'écrit désormais en une ligne `["PC5", "PC 8"]` (vraie chaîne
  `enregistrer_lecture` → `lorani_lectures_passage`). Fiche `CHAMPS-LECTURE-LORANI.md` ligne 23 : une seule forme écrite.
- 06/10, 2 h 05 Z (coordinateur) : b5_06 posé **depuis 24ea9b0** (pas encore fcd1b1a, messages croisés), `^test_b5_`
  **114/114** ; lecteur A1 en version 17 (worker-a1 0d54731).
- 06/10, 2 h 05–2 h 10 Z : **troisième dépôt réel, la chaîne complète passe.** `demande-pieces-v3.pdf` (pièce
  2bfb560c…) : `Lue` à 35 s, proposition à 247 s « Date de la demande : 01/10/2026 — Pièces réclamées : PCMI3, PCMI6 »
  (citations « Nantes, le 01/10/2026 », « - PCMI 3 : plan en coupe… »), confirmée par l'écran. Relu sous RLS avec la
  session du gérant : permis 56c88739… `pieces_demandees`, numéro PC04410926A0042, dépôt 2026-09-15, demande
  2026-10-01, `pieces_demandees = [PCMI3, PCMI6]` ; échéance `pieces` au 2027-01-01, ouverte, rappels [10, 3, 0].
  Reste sur le banc la proposition vide confirmée à 1 h 40 (pièce 1c55b927…), donnée de recette.
- 06/10, 2 h 08 Z (coordinateur) : b5_06 **v2 posée depuis fcd1b1a**, `^test_b5_` **114/114** ; sur 059e705e,
  `lorani_valeurs_de_piece` rend le tableau en jsonb.
- 06/10, 2 h 11–2 h 15 Z : **dépôt réel avec le socle final et le lecteur v17** : `demande-pieces-2.pdf` (second
  modèle de `fabriquer-courrier.mjs` : lettre du 03/10, PCMI 2 et PCMI 8 — une lettre identique à la v3 serait écartée
  par `lorani_deja_saisi`), pièce 03cb0753… `lue`, `lorani_demande_pieces` 0,97, motif nul ; proposition à 211 s
  [PCMI2, PCMI8] du 2026-10-03, confirmée par l'écran ; permis : `pieces_demandees = [PCMI2, PCMI8]`, demande
  2026-10-03, échéance `pieces` 2027-01-03 ouverte, rappels [10, 3, 0]. `courrier-reel.mjs` : `PIECES_ATTENDUES`.

## 6. Question métier : une seconde demande de pièces (06/10, posée par le coordinateur) — proposition b5_07, pas de code

**Constat sur le banc** : la demande du 03/10 (PCMI2, PCMI8) a **remplacé** celle du 01/10 (PCMI3, PCMI6) :
`lorani_confirmer_date_lue` fait `set date_demande_pieces = <nouvelle>, pieces_demandees = <nouvelle liste>`. Les
pièces PCMI3 et PCMI6 ont disparu du permis et l'échéance « pièces » a glissé du 2027-01-01 au 2027-01-03.

**Ce que dit le code de l'urbanisme** (à faire valider par un juriste urbaniste avant de coder) :
- R*423-38 : dans le mois qui suit le dépôt, la mairie adresse UNE lettre indiquant **de façon exhaustive** les
  pièces manquantes. La pratique et la jurisprudence en déduisent que la liste doit être complète en une fois.
- R*423-39 : le demandeur a trois mois à compter de la réception de la lettre pour tout fournir ; à défaut, décision
  tacite de rejet (ou d'opposition). Le délai d'instruction part de la réception de **toutes** les pièces.
- R*423-41 : une demande notifiée **après le délai d'un mois**, ou qui porte sur une pièce **non prévue par le
  code**, ne modifie pas les délais d'instruction (le socle le traite déjà : avertissement du calcul quand
  `date_demande_pieces` dépasse la fin de complétude ; le Conseil d'État en tire qu'une telle demande n'empêche pas
  le permis tacite).
- Une seconde demande dans le mois : le texte ne l'interdit pas en toutes lettres, mais elle ne fait pas repartir
  un délai que la première a déjà ouvert ; au mieux elle complète la liste.

**Donc l'écrasement est faux** sur deux points : on perd des pièces que la mairie attend toujours (le demandeur qui
suit l'écran ne fournirait que PCMI2 et PCMI8 et se ferait opposer un rejet tacite), et on retarde l'échéance.

**b5_07 proposée** (un `create or replace` de `lorani_confirmer_date_lue`, une colonne, l'écran) :
1. Une demande confirmée sur un permis qui a déjà `date_demande_pieces` et pas de `date_pieces_fournies` :
   `pieces_demandees` = **union**, dans l'ordre (d'abord la première liste, puis les nouveaux codes) ;
   `date_demande_pieces` **garde la première date** (le délai de trois mois ne repart pas ; c'est aussi le côté sûr
   pour le demandeur : les rappels tombent plus tôt).
2. Nouvelle colonne `lorani_permis.demandes_pieces jsonb` (historique `[{date, pieces, piece_id, dates_lue_id}]`),
   tracée comme les autres ; `pieces_demandees` reste la liste à fournir.
3. Avertissement du calcul : « Seconde demande de pièces reçue le … : la mairie doit tout réclamer en une fois
   (art. R*423-38) ; elle ne fait pas repartir le délai de trois mois. Si elle arrive après le délai d'un mois ou
   porte sur une pièce non prévue par le code, elle ne modifie pas les délais (art. R*423-41). Fournissez quand même
   toutes les pièces. »
4. Une demande qui arrive **après** `date_pieces_fournies` : ne rien écraser, la garder dans l'historique avec
   l'avertissement R*423-41 ; c'est au membre de décider (saisir de nouvelles pièces fournies s'il les envoie).
5. `lorani_deja_saisi('demande_pieces')` : déjà saisi si la date est dans l'historique avec la même liste (une
   lettre relue ne repropose rien), plus seulement si elle égale la liste courante.
6. L'écran : la ligne « Pièces à fournir » montre la liste fusionnée et, dessous, les demandes successives (date,
   pièces, courrier) ; la saisie manuelle « Demande de pièces reçue » suit la même règle (union).
7. Test : étape 7 bis, une seconde demande dans le mois → union, date et échéance inchangées, avertissement ; une
   demande après les pièces fournies → historique seulement.

Je ne code pas b5_07 avant ta réponse (et idéalement celle d'un juriste sur le point « seconde demande dans le
mois »). Le permis « Pavillon Lemoine » du banc garde l'état écrasé, utile pour rejouer b5_07.

## 7. Essai réel arrêté + constat d'affichage (06/10, 2 h 17–2 h 26 Z, lecteur v17)

Nouveau projet du banc « Extension Garnier (banc) » (7ef5d6aa…) et PC « Extension Garnier » (0a8ac86c…, PC 044109 26
A0077, déposé le 2026-06-02), créés sous RLS avec la session du gérant (mêmes écritures que l'écran), pour ne pas
toucher « Pavillon Lemoine ». Courriers : `fabriquer-courrier.mjs arrete|constat_affichage` ; script :
`PERMIS='Extension Garnier' NUMERO='PC04410926A0077' node omega/recette-b5/courrier-reel.mjs … lorani_arrete`.
- `arrete-garnier.pdf` : `lue`, `lorani_arrete` 0,97 ; proposition à 70 s « Décision : Accordé — 20/08/2026 »
  (citations « le permis de construire est ACCORDÉ », « Fait à Nantes, le 20/08/2026 ») → `{decision: favorable,
  date_decision: 2026-08-20}`, vérifiée, confirmée.
- `constat-affichage-garnier.pdf` : `lue`, `lorani_constat_affichage` 0,97 ; proposition à 282 s « Premier jour
  d'affichage : 28/08/2026 » (citation « Le 28/08/2026 à 10 h 15 ») → `{date_affichage: 2026-08-28}`, confirmée.
- Permis : `accorde`, décision favorable du 2026-08-20, affichage 2026-08-28, **purge 2026-11-20** ; échéances :
  complétude 07-02 tenu, instruction 09-02 tenu, affichage 09-04 tenu, **recours 10-29** (deux mois francs depuis le
  premier jour d'affichage) ouvert, **retrait 11-20** (trois mois après l'arrêté) ouvert, purge 11-20 ouvert. Juste.
- Bilan : quatre des six types de courriers prouvés en réel (récépissé, demande de pièces, arrêté, constat
  d'affichage) ; restent la lettre de délai et le certificat tacite (couverts par le test, pas encore en réel).

## 8. b5_07 — seconde demande de pièces (feu vert du coordinateur, 06/10, 2 h 17 Z)

- `omega/modules/lorani/migrations/b5_07_seconde_demande_pieces.sql` : colonne `lorani_permis.demandes_pieces`
  (add column if not exists, contrôle ≤ 24 lettres) ; `private.lorani_union_pieces`, `private.lorani_noter_demande`
  (pures) ; trigger BEFORE `lorani_permis_suivre_demandes` → `private.lorani_suivre_demandes_pieces()` (security
  definer) : seconde lettre avant la remise → union, première date gardée, alerte « attention » au chef de projet
  (clé `permis:<id>:seconde_demande:<n>`) ; après la remise → historique seulement, alerte R*423-41 ; même date →
  correction ; `private.lorani_deja_saisi` lit l'historique ; amorce de l'historique des permis existants. Les trois
  nouvelles fonctions : `revoke execute from public`. Un seul trigger sert la confirmation d'une date lue ET la
  saisie de l'écran. Écart à la proposition du § 6 : pas d'avertissement dans le calcul (fonction de 300 lignes à
  recopier) ; l'alerte et l'écran le portent. Pas de `piece_id` dans l'historique (le lien est dans
  `lorani_permis_dates_lues`).
- Essayé sur Postgres 16 local (table réduite) : 1re lettre → historique ; 2e → [PCMI3, PCMI6, PCMI2], date de la
  1re, deux lettres, alerte ; relue → `deja_saisi` vrai ; après remise → permis inchangé, trois lettres, alerte
  R*423-41 ; même date → correction.
- Test : étape 19 bis, six assertions (permis « Garage Lemoine » neuf, UPDATE sous RLS par le chef de projet) →
  attendu **120/120**.
- Écran : type `demandes_pieces`, `appliquerDemande` (même règle, pour l'exemple et l'affichage immédiat), avis
  « Plusieurs demandes de pièces » (à fournir, lettres, R*423-38 / -41) ; exemple « Maison Lemoine » à deux lettres ;
  recette : un contrôle de plus. tsc, eslint, build, recette aux cinq largeurs : verts.
- **À faire valider par un juriste (remonté à Teo par le coordinateur)** : une seconde demande de pièces envoyée
  DANS le mois qui suit le dépôt — complète-t-elle valablement la première (et fait-elle partir le délai de trois mois
  de sa propre date pour les pièces qu'elle ajoute) ? b5_07 garde la date de la première lettre, le choix prudent.

## 9. Les deux derniers types en réel : lettre de délai, certificat tacite (06/10, 2 h 33–2 h 46 Z, lecteur v17)

Deux permis neufs dans le dossier « Extension Garnier (banc) », créés sous RLS par le gérant : PC « Surélévation
Garnier » (ec65b452…, PC 044109 26 A0091, déposé le 2026-09-20) et DP « Clôture Garnier » (252ff65a…, DP 044109 26
A0103, déposée le 2026-06-01 ; le socle la met d'emblée en `decision_a_confirmer`, non-opposition tacite au 02/07).
- `lettre-delai-garnier.pdf` (« porté à 6 mois », R*423-28, ABF) : proposition à 388 s `{delai_notifie_mois: 6,
  date_notification_delai: 2026-10-02}`, vérifiée, confirmée → décision attendue **2027-03-20** (dépôt + 6 mois),
  échéance `instruction` 2027-03-20 ouverte, complétude 2026-10-20 ouverte.
- `certificat-tacite-garnier.pdf` (« non-opposition tacite à compter du 02/07/2026 ») : proposition à 247 s
  `{date_decision: 2026-07-02}`, confirmée → `accorde`, décision `tacite` du 2026-07-02 ; retrait 2026-10-02 tenu ;
  affichage 2026-07-17 encore `ouvert` (date passée, à voir si `controler_delais` le passe en dépassé) ; pas de
  purge sans affichage, avertissement R*600-2 / R600-3. Juste.
- **Les six types de courriers Lorani sont prouvés en réel** (lecteur → socle → écran → confirmation).
- Incident sans conséquence : au premier essai, un `next start` resté d'une recette (build sans les variables de la
  recette) servait les données d'exemple ; le script n'a pas trouvé le permis et a « confirmé » la lettre d'exemple
  d'un autre permis, en mémoire seulement (rien en base). `courrier-reel.mjs` s'arrête désormais si le permis visé
  n'est pas ouvert en base réelle.

## 10. b5_07 en réel (06/10, 2 h 35–2 h 52 Z)

- Coordinateur, 2 h 35 Z : b5_07 posée depuis a4e3197, `^test_b5_` **120/120** ; amorce sur le banc : « Pavillon
  Lemoine » → historique [{2026-10-03, [PCMI2, PCMI8]}] (la lettre du 01/10 avait été écrasée avant la pose).
- Rejeu par l'écran : `demande-pieces-v4.pdf` = la lettre du 01/10 (PCMI 3, PCMI 6), autre empreinte, déposée sur
  « Pavillon Lemoine » : proposition à 211 s [PCMI3, PCMI6] du 01/10 (non écartée : l'historique ne la connaissait
  pas), confirmée. Relu sous RLS : `date_demande_pieces` **2026-10-01** (la plus ancienne), `pieces_demandees`
  **[PCMI3, PCMI6, PCMI2, PCMI8]** (la lettre la plus ancienne d'abord), `demandes_pieces` = les deux lettres,
  échéance `pieces` revenue au **2027-01-01**, rappels [10, 3, 0] ; alerte « attention »
  `lorani:permis:56c88739…:seconde_demande:2`. L'écran (base réelle) affiche « Plusieurs demandes de pièces. À
  fournir : PCMI3, PCMI6, PCMI2, PCMI8. Lettres : du 01/10/2026 (PCMI3, PCMI6) ; du 03/10/2026 (PCMI2, PCMI8)… »
  (capture `reel-seconde-demande-1440.jpg`). Le banc a retrouvé une scène juste, et le cas « la lettre la plus
  ancienne arrive en second » est prouvé.
- Défaut vu : le titre de l'alerte dépassait 200 caractères, coupé avant les articles → **b5_08**
  (`b5_08_titre_alerte_seconde_demande.sql`, corps du trigger de b5_07, seuls les deux titres changent : articles
  avant la liste, intitulé borné à 60). Essayé en local par-dessus b5_07 : titres complets, règle inchangée. Le
  test 19 bis (titre `like '%seconde demande de pièces%'`) reste vrai.
- Coordinateur, 04 h 15 Z : l'échéance d'affichage de « Clôture Garnier » (délai 6d71f93c…) est passée en
  **dépassé** au passage horaire de 03 h 07 Z : pas de trou, c'était l'attente du cron (minute 7).
- Relevé du coordinateur : son libellé disait « DP « Extension Garnier (banc) » » (nom du projet) → **b5_09**
  (`b5_09_titre_du_permis.sql`) : `private.lorani_titre_permis` prend l'intitulé du permis, sinon le nom du projet ;
  les sept appelants en profitent. Test étape 10 aligné (« PC « Résidence Lemoine — six logements » », alerte et
  sujet du courriel de rappel) → toujours 120 assertions.
- Coordinateur, 04 h 58 Z : fbf4c98 posé (b5_08, b5_09), `^test_b5_` **120/120**, worker-b5 fusionné dans main.
  État du lot : b5_01 à b5_09 posées ; six types de courriers prouvés en réel ; rien d'ouvert côté B5, sauf
  l'avis d'un juriste sur la seconde demande de pièces dans le mois (remonté à Teo).

## 11. Accessibilité (06/10, demande du coordinateur après la mesure axe-core d'A3)

- `main` fusionné dans worker-b5 (5b3a7a9) pour avoir le style commun `.esp-item[aria-current="true"]`.
- `EcranLorani.tsx` : les deux listes (permis par projet, dossiers) ne sont plus `role="listbox"` / `role="option"` +
  `aria-selected` mais une liste de boutons ; l'élément ouvert porte `aria-current="true"` (modèle FileValidations).
- axe a relevé deux autres écarts graves, corrigés : la pastille d'étape du calendrier (`aria-label` sur un span
  sans rôle → `role="img"`) ; le tableau des intervenants qui défile à 390 (`tabIndex={0}`, `role="region"`, nommé).
- `omega/recette-b5/accessibilite-lorani.mjs` (copie du script d'A3, réduite à /espace/lorani) : 390 et 1440,
  **0 écart** sur la page et dans le dialogue « Régime » ; clavier : focus dans le dialogue, piégé, Échap ferme et
  rend le focus à « Régime ». tsc, eslint, build, recette aux cinq largeurs : verts. Pas touché : dialog.tsx,
  barre d'onglets.

## 12. Jurisprudence de la seconde demande (06/10, 13 h 43 Z, recherche du coordinateur) — b5_10

- CE, 30 avril 2024, n° 461958 : la mairie peut inviter de nouveau à compléter le dossier, mais cette demande est
  sans incidence sur le cours du délai et sur la naissance d'une décision tacite ; l'instruction part de la dernière
  pièce reçue. CE, 4 février 2025 : une seule pièce prévue par le code suffit à interrompre valablement le délai.
  **La règle de b5_07 est confirmée** ; le point « juriste » du § 8 est clos.
- `b5_10_jurisprudence_seconde_demande.sql` : corps du trigger (b5_08) ; titre « 2e demande de pièces du …, sans
  effet sur les délais (CE 30 avril 2024, n° 461958) ; délai depuis la lettre du … » (≤ 200, intitulé borné à 50) ;
  le détail de l'alerte cite la décision et R*423-38 / R*423-39 ; l'alerte « après la remise » ajoute la décision.
- « Pièce non prévue par le code » : Lorani n'a aucun avertissement de ce genre sur une demande entière (le socle garde
  les codes, écarte le texte libre sans le signaler) ; R*423-41 n'apparaît que pour une demande hors du mois (calcul)
  ou après la remise des pièces. Rien à retirer.
- Écran : l'avis « Plusieurs demandes de pièces » cite la décision ; recette (contrôle b5_07 : « 461958 ») et axe :
  verts. Test 19 bis : l'alerte doit porter « 2e demande de pièces » et la référence. Essai local (b5_07 + b5_08 +
  b5_10) : titres de 175 et 162 caractères, règle inchangée.
- Coordinateur, 13 h 49 Z : b5_10 posée (027eca3), `^test_b5_` **120/120** (ok 116 : l'alerte cite CE 30 avril 2024,
  n° 461958) ; écran fusionné dans main, en ligne avec la prochaine poussée groupée. b5_01 à b5_10 posées.


## Vague 3 — les trois manques pour qu'une vraie agence paie Lorani et l'ouvre chaque jour (06/10, 14 h 30 Z)

Point de départ : la page des architectes (`app/secteurs/architectes/page.tsx`) promet, au-delà du calendrier du
permis, « les honoraires phase par phase », « chaque situation comparée au marché et à la précédente », « la date
butoir de chaque visa calée sur le délai de commande » et la relecture des planches contre le PLU. Le socle Lorani
n'a que neuf tables : projets, membres, lots, intervenants, permis et ce qui l'entoure. Ni honoraires, ni temps,
ni situations, ni visas (vérifié dans `omega/SOCLE-EXTRAITS-LORANI.sql` et sur `main`).

**1. Le dépôt dématérialisé : l'accusé de réception électronique et les courriels du guichet.**
Depuis le 1er janvier 2022, toutes les communes reçoivent les demandes d'autorisation d'urbanisme par voie
électronique (SVE, art. L.112-8 CRPA) ; celles de plus de 3 500 habitants les instruisent sous forme dématérialisée
(art. L.423-3 du code de l'urbanisme, loi ELAN art. 62) et les échangent avec les services consultés par PLAT'AU.
**Le pétitionnaire ne voit pas PLAT'AU** : il dépose et suit sur le guichet de la commune (ou Géoportail / GNAU) et
reçoit tout **par courriel**. Pour une demande électronique, **le récépissé est l'accusé de réception électronique**
(ARE, art. L.112-11 CRPA ; art. R*423-3 à R*423-5) ; la date de réception est celle de l'accusé d'enregistrement
électronique (AEE), et elle fait partir le délai d'instruction. Or notre fiche de lecture rangeait l'« accusé de
réception électronique » en `lorani_courrier_autre` : **pour l'essentiel des permis déposés depuis 2022, Lorani ne lirait
jamais la date de dépôt**, et chaque courriel du guichet devait être enregistré puis redéposé à la main dans l'écran.
L'agence n'ouvrira pas Lorani chaque jour si elle doit y recopier sa boîte aux lettres. → Rattacher automatiquement
les courriels du guichet (ARE, demandes de pièces, arrêtés) au bon dossier par le numéro cité, et lire l'ARE comme
un récépissé. Pas d'intégration PLAT'AU possible côté pétitionnaire : tout passe par le courriel (A2, `receptions`).
Sources : [ecologie.gouv.fr — Dématérialisation des autorisations d'urbanisme](https://www.ecologie.gouv.fr/dematerialisation-des-autorisations-durbanisme) ;
[Préfecture de Seine-et-Marne — Démat. ADS](https://www.seine-et-marne.gouv.fr/contenu/telechargement/49978/365617/file/Démat.%20ADS%20Présentation%20générale%20202105%20V2.2.pdf) (PLAT'AU n'est pas visible du pétitionnaire) ;
[Eurojuris — Récépissé et délai d'instruction du permis de construire](https://www.eurojuris.fr/contentieux-entreprises/articles/recepisse-delai-instruction-permis-construire-11686.htm) (ARE = récépissé, date de l'AEE) ;
[DDT de l'Oise — fiche SVE](https://www.oise.gouv.fr/contenu/telechargement/61288/374954/file/A_08_SVE%202020.pdf).

**2. Les honoraires phase par phase (temps passé contre honoraires de chaque élément de mission).**
C'est le cœur économique d'une agence : honoraires facturés par élément de mission (ESQ, APS, APD, PRO, ACT, VISA,
DET, AOR, référentiel MOP, décret 93-1268 intégré au code de la commande publique), appel à l'achèvement de chaque
phase, et dérive du temps passé à repérer avant la fin de la mission. La page le promet (« Une phase qui consomme
plus que prévu remonte avant la fin de la mission ») ; rien ne le porte. C'est aussi ce qui fait ouvrir l'outil
chaque jour (saisie des temps). Le concurrent de référence, OOTI (plus de 800 agences), vend exactement cela.
Sources : [Hayot Expertise — facturer ses honoraires par phase (2026)](https://hayot-expertise.fr/blog/architecte-facturer-honoraires-phases-mission-2026) ;
[Appvizer — OOTI](https://www.appvizer.fr/construction/architecture/ooti) ; [GetApp — OOTI](https://www.getapp.fr/software/114699/ooti).

**3. Le chantier : situations de travaux comparées au marché, visas datés.**
Pendant la DET, l'architecte vise les situations mensuelles des entreprises (cumul contre marché et avenants, écart
avec la précédente) et les plans d'exécution (visa, date butoir calée sur le délai de commande). La page le promet
(« Lorani compare chaque situation reçue au marché et à la précédente, puis chiffre l'écart ») ; rien ne le porte.
Archipad, la référence du suivi de chantier sur tablette, couvre réserves et comptes rendus mais pas le contrôle
financier des situations ; le lecteur d'A1 sait déjà lire des factures (FILED), le pas est court.
Sources : [La Fabrique du Net — alternatives à Archipad](https://www.lafabriquedunet.fr/logiciels/alternatives/alternative-archipad) ;
[Ordre des architectes — Archigraphie 2024](https://prod.architectes.ows.fr/sites/cnoa/files/2024-12/ARCHIGRAPHIE-2024_13decembre_1.pdf) (profil des agences).

Ordre retenu : le 1 d'abord, parce qu'il casse la promesse déjà en ligne (« Les courriers de la mairie sont lus ») pour
la majorité des dossiers réels, et qu'il est court (module Lorani, réception d'A2 déjà en place). Le 2 et le 3 sont
des chantiers neufs (tables, écran, lecteur), à proposer au coordinateur en lots séparés.

### Vague 3, n° 1 livré à poser — b5_11, les courriels du guichet rangés seuls (06/10)

- `omega/modules/lorani/migrations/b5_11_courriels_guichet.sql` : abonnement `reception.nouvelle → lorani.reception` ;
  `private.lorani_numeros_cites(text)` (numéros d'autorisation dans un texte : espaces, tirets, minuscules, collés, noms
  de fichiers ; essayé en local) ; `private.lorani_rattacher_reception(bigint)` (les numéros du sujet, du corps, du HTML
  et des noms de pièces jointes → les permis actifs d'UN dossier → chaque PDF / PNG / JPEG devient une pièce du dossier,
  source `courriel`, statut `recue`, et le socle lance la lecture ; idempotent ; sans pièce jointe → alerte « à lire » ;
  boîte Lorani sans numéro ou plusieurs dossiers → alerte « à ranger » ; autre module sans numéro Lorani → ignoré) ;
  `private.lorani_lectures_passage()` prend aussi `lorani.reception` (corps du socle). Trois fonctions nouvelles en
  `revoke execute from public`. Journal `lorani.courriel_rattache`.
- Test : `omega/tests/lorani/b5_02_courriels_guichet.sql` (`test_b5_02_courriels_guichet`, 16 assertions, aides de
  b5_01) → `^test_b5_` attendu **136/136**.
- Fiche `CHAMPS-LECTURE-LORANI.md` : l'ARE / l'AEE d'un dépôt en ligne est un `lorani_recepisse_depot` (date de
  réception qu'il indique), il ne va plus en `lorani_courrier_autre` — **à reprendre par A1** dans le lecteur.
- Écran (`components/espace/lorani` seulement) : une pièce venue d'un courriel dit « Reçu par courriel du guichet et
  rangé ici par son numéro de dossier » ; l'exemple « Clôture Martin » a un ARE reçu par courriel ; recette +1 contrôle.
  tsc, eslint, build, recette cinq largeurs, axe : verts.
- Reste à faire pour que ce soit réel chez une agence : une boîte de réception Lorani par agence (expéditeur `identite`
  = adresse, module lorani, chez A2) vers laquelle l'agence fait suivre les courriels du guichet ; l'écran n'affiche
  pas encore cette adresse (elle n'existe pas encore).
- Coordinateur, 14 h 44 Z : b5_11 posé ; `test_b5_02` 14/16. Causes : (12) mon sujet citait « PC0441092600199 » (un 0 au
  lieu du A) : le courriel partait en « à ranger », pas en « à lire » — test corrigé (PC04410926A0199, et le nom de la
  pièce jointe aligné) ; (16) sans `detail.module`, `deposer_reception` prend le module de la boîte, et sur la recette
  `compta@banc-varelo.test` se résout vers un expéditeur Lorani — le test passe `{"module": "filed"}` et filtre sur sa
  propre réception ; la réponse « ignore » de `lorani_rattacher_reception` rend aussi `reception` et `module`.

### Vague 3, n° 1 posé ; n° 2 livré à poser — b5_12, les honoraires phase par phase (06/10)

- Coordinateur, 14 h 49 Z : 218a777 reposé, `^test_b5_` vert (1..2 : b5_01 et b5_02). A1 : ARE / AEE lus comme
  `lorani_recepisse_depot` (lecteur v21, recette). La boîte Lorani par agence attend l'inbound (MX posés par Teo).
- `omega/modules/lorani/migrations/b5_12_honoraires_phases.sql` : `public.lorani_honoraires` (élément de mission MOP,
  honoraires HT, heures prévues, statut a_venir / en_cours / achevee / facturee, dates) et `public.lorani_temps` (un
  membre, un jour, un élément, des heures ≤ 24, une note) ; droits comme les autres tables Lorani (voit / écrit le
  projet ; chacun saisit et corrige SES temps, même un assistant en lecture ; pas de retrait : 0 h annule) ; triggers :
  le projet vient de l'élément, pas de temps futur, l'élément passe « en cours » à la première saisie, alertes
  « attention » au chef de projet à 80 % puis 100 % des heures prévues (une par seuil, avec l'écart et le taux
  réalisé), « appel d'honoraires à émettre » à l'achèvement (journal `lorani.element_acheve`) ;
  `public.lorani_honoraires_projet(projet)` (tableau de bord sous RLS). Sans `drop` ni `delete` : clés étrangères sans
  cascade (un projet porteur d'honoraires ne s'efface pas, il s'archive par `actif`). Essayée en local (doublures du
  socle) : seuils, textes (« 33,5 h pour 30 h prévues (+3,5 h) … taux réalisé 90 € HT de l'heure »), appel
  (« 3 000,00 € HT »), refus d'un temps futur, tableau de bord.
- Test : `omega/tests/lorani/b5_03_honoraires.sql` (`test_b5_03_honoraires`, 24 assertions, aides de b5_01) →
  `^test_b5_` attendu **160/160**.
- Écran (`components/espace/lorani` seulement) : `Honoraires.tsx` dans la carte du projet — totaux (honoraires,
  heures, facturé, appels à émettre), avertissement ambre / rouge par phase qui dérive, tableau par élément (jauge,
  taux réalisé, état), « Saisir du temps », « Ajouter un élément », « Achevé », « Facturé », derniers temps saisis ;
  exemple « Maison Lemoine » (six éléments, 33 000 € HT) et « Pôle enfance » ; recette +4 contrôles (saisie de 9 h →
  le PC passe dépassé, puis achevé), captures `lorani-temps-1440.jpg`, `lorani-honoraires-1440.jpg`. Débordement à 390
  trouvé et corrigé (texte `sr-only` en position absolue hors du cadre défilant). tsc, eslint, build, recette cinq
  largeurs, axe : verts.

### Vague 3, n° 2 posé ; n° 3 livré à poser — b5_13, le chantier : situations et visas (06/10)

- Coordinateur, 15 h 15 Z : b5_12 posé, `^test_b5_` vert (1..3). Écran des honoraires sur main à la prochaine poussée.
- Règles vérifiées : CCAG-Travaux 2021, art. 12.2.2 — le maître d'œuvre accepte ou rectifie le projet de décompte
  mensuel dans les **7 jours** ([marche-public.fr](https://www.marche-public.fr/CCAG-travaux2021/12-modalites-reglement-comptes.htm)) ;
  art. 29 — visa des documents d'exécution en **15 jours** ([marche-public.fr](https://www.marche-public.fr/CCAG-travaux2021/29-etudes-execution.htm)) ;
  retenue de garantie **≤ 5 %**, loi n° 71-584 du 16 juillet 1971 ([FNTP](https://www.fntp.fr/bonnes-pratiques-de-paiement-dans-les-relations-interentreprises/)) ;
  marché privé (NF P 03-001, texte payant) : 15 jours par défaut, modifiable marché par marché.
- `omega/modules/lorani/migrations/b5_13_situations_visas.sql` : `public.lorani_marches` (lot, titulaire, montant,
  avenants, retenue ≤ 5 %, délai de vérification 7 j en marché public / 15 j sinon) ; `public.lorani_situations`
  (n°, mois ramené au 1er, cumul demandé, reçue le, à viser avant, a_viser / visee / rectifiee, cumul admis,
  observation obligatoire pour rectifier, numéro et marché figés) ; `public.lorani_visas` (lot, document, indice,
  reçu le, commande de l'ouvrage le, à viser avant = le plus tôt entre reçu + 15 j et la veille ouvrée de la commande,
  vso / vao / ref, observation obligatoire pour vao et ref) ; alertes : situation reçue (cumul, montant du mois contre
  le cumul admis précédent, date limite), cumul au-delà du marché et des avenants (écart chiffré), cumul en baisse,
  visa urgent (< 5 jours) ; `public.lorani_chantier_projet(projet)` (tableau sous RLS). Sans `drop` ni `delete`, clés
  étrangères sans cascade. Essayée en local (doublures) : tous les cas justes.
- Test : `omega/tests/lorani/b5_04_situations_visas.sql` (22 assertions) → `^test_b5_` attendu **182/182**.
- Écran (`components/espace/lorani`) : `Chantier.tsx` dans la carte du projet — situations à viser (dépassement et
  baisse signalés, Viser / Rectifier), marchés (avancement, dernière situation), documents à viser (urgent, en retard,
  Rendre l'avis), dialogues Nouveau marché / Situation reçue / Document à viser ; exemple « Façade rue Mercière » passé
  en DET (deux marchés, cinq situations, trois visas) ; recette +3 contrôles, axe sur la carte du chantier et son
  dialogue ; captures `lorani-situation-1440.jpg`, `lorani-chantier-1440.jpg`. tsc, eslint, build, recette cinq
  largeurs, axe : verts.
- Suite naturelle (non faite) : que le lecteur d'A1 lise les situations reçues (type `lorani_situation_travaux` :
  numéro, mois, cumul HT, titulaire, lot) pour qu'elles naissent seules, comme les courriers de la mairie ; et une
  échéance du socle (`delais`) pour la date limite de visa, avec rappel.
- Coordinateur, 15 h 42 Z : b5_13 et b5_04 posés, `^test_b5_` 4/4 vert ; **test 51 rouge** : le droit de retrait restait
  accordé à authenticated sur les cinq tables de la vague 3 (privilèges par défaut de Supabase : tout est accordé à la
  création ; « grant select, insert, update » n'en retire rien). → **b5_13b** (`b5_13b_privileges.sql`) : `revoke all`
  à authenticated et anon puis `grant select, insert, update` à authenticated, sur lorani_honoraires, lorani_temps,
  lorani_marches, lorani_situations, lorani_visas — même effet qu'un retrait nommé, sans le mot interdit dans le
  fichier. Reporté dans les sources b5_12 et b5_13 (b5_10 et b5_11 ne créent pas de table).

### Suite de la vague 3 — b5_14, la situation lue devient seule « à viser » (06/10)

- Coordinateur, 15 h 50 Z : b5_13b posé, tests 51 et 44 verts, écran Chantier fusionné (main 26cdd66). Décision :
  lecture automatique des situations, sur le modèle de B4 (Tamila, avis du greffe), puis l'échéance des visas.
- `omega/modules/lorani/migrations/b5_14_situation_lue.sql` : `private.lorani_montant_lu` (« 72 500,00 € »,
  « 72500.00 », « 72.500,00 » → 72500.00 ; essayée en local), `private.lorani_nom_comparable` (sans accents, ponctuation
  ni forme juridique : « SARL Bâti-Ouest » = « BATI OUEST »), `private.lorani_poser_situation_lue(piece)` (marché par lot
  + titulaire, puis titulaire, puis seul marché du dossier ; numéro lu ou suivant ; ligne « à viser » avec piece_id, les
  triggers de b5_13 font le reste ; idempotent ; marché introuvable ou cumul illisible → alerte « à ranger »), et
  `private.lorani_lectures_passage` (corps de b5_11) qui aiguille `lorani_situation_travaux` vers cette porte.
- Fiche `CHAMPS-LECTURE-LORANI.md` : type `lorani_situation_travaux` (cumul_ht obligatoire, numero_situation, mois,
  titulaire, lot ; facultatifs de contrôle) — **à brancher par A1** dans le lecteur.
- Test `omega/tests/lorani/b5_05_situation_lue.sql` (15 assertions) → `^test_b5_` attendu **197/197** (5 tests).
