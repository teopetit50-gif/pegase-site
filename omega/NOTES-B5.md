# Session B5 — LORANI, le calendrier du permis (vague 2)

Branche `worker-b5`. Coordinateur : session_01B4JNQXyT69GytdvE9SjAnE.
Dernière mise à jour : 05/10/2026, 23 h.

## Jauges

| Jauge | Valeur | Ce qui la fait monter |
|---|---|---|
| **Mécanique** (le socle fait ce que la page promet, prouvé par des tests joués sur la recette) | 35 % | le test pgTAP du parcours (20 étapes, ~95 contrôles) est écrit et les trois migrations aussi ; rien n'est encore joué sur la recette — le lot 1 est chez le coordinateur |
| **Livrable client** (un gérant d'agence ouvre /espace/lorani et suit un vrai permis) | 55 % | l'écran est écrit, recetté aux cinq largeurs sur l'exemple, build vert ; reste la relecture en base réelle avec le compte du banc (clé publique de la recette à fournir), la fusion dans main et la vérification sur omegaai.fr |

**Ce qui manque** : la pose des migrations b5_01 à b5_03 et le premier passage du test (lot 1 envoyé), la clé `publishable`
de la recette pour la relecture réelle, la fusion dans `main`. **Ce que Teo doit fournir** : rien pour l'instant ; pour que
les rappels partent réellement, un accord permanent (politique de validation) sur les envois `envoi.email` du module
lorani chez chaque agence, ou l'approbation au cas par cas dans /espace/validations — c'est le dessin du socle.

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
- **Pas encore fait** : la relecture en base réelle avec `gerant@banc-varelo.test` (il faut la clé `publishable` de la
  recette `ygwbgpowzlbdaajlsqkn` pour pointer le serveur de dev dessus, comme A3) ; les cases du régime (secteur
  protégé, MH, ERP, IGH, évaluation environnementale, cas de rejet) se lisent mais ne se cochent pas encore à l'écran.

## 4. Questions ouvertes au coordinateur

1. `private.resoudre_destinataire` : accepte-t-elle `{"membre": <user_id>}` (b5_03) ? Sinon, quelle forme ?
2. `private.modules_envois` : une ligne `lorani` est-elle nécessaire (canaux `["email"]`) ? `reglages_envois` du banc
   porte-t-il une ligne `lorani` (mode essai) ?
3. La clé `publishable` de la recette, pour la relecture réelle de l'écran.

## 5. Journal de bord

- 05/10 soir : lecture du cadre, scénario écrit et envoyé ; test pgTAP, migrations b5_01/02/03, écran, recette ;
  réponses du coordinateur intégrées (dates du test recalées sur la vraie chaîne des délais, colonnes de `pieces`,
  comptes du banc). Lot 1 envoyé au coordinateur : poser b5_01, b5_02, b5_03, jouer `omega/tests/lorani/b5_01_parcours_permis.sql`.
