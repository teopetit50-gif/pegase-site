# Session B5 — LORANI, le calendrier du permis (vague 2)

Branche `worker-b5`. Session B5 : session_018iNiXjY8eWmMjaGrXSGgma (Opus 5.5, reprise de session_013VSXzohLtDQS5bbWfRb4xR le 06/10 à 1 h 30 Z). Coordinateur : session_01BCGFdpRKBvXKjouC75sYBg (Opus 5.5, depuis le 06/10 à 1 h 10 ; auparavant session_01B4JNQXyT69GytdvE9SjAnE).
Dernière mise à jour : 05/10/2026, 23 h.

## Jauges

| Jauge | Valeur | Ce qui la fait monter |
|---|---|---|
| **Mécanique** (le socle fait ce que la page promet, prouvé par des tests joués sur la recette) | 90 % (**111/111** à 9ba2900, b5_01 à b5_04 posées sur la recette) | b5_01 à b5_03 posés sur la recette ; test pgTAP joué par le coordinateur : **110/111** (20 étapes : projet, équipe, RLS, lecture simulée par les portes du lecteur, confirmation, échéances dans `delais`, rappel J-10 par `controler_delais` → alerte → envoi `a_valider` au chef de projet, décision tacite, affichage, recours, purge, mesures, journal) ; les deux rouges corrigés (b5_04 + lecture du point) : **111/111 le 06/10 à 0 h 01 Z** ; manque : le lecteur réel ne connaît pas les types Lorani (spécification écrite, à A1) |
| **Livrable client** (un gérant d'agence ouvre /espace/lorani et suit un vrai permis) | 85 % (**en ligne** sur https://omegaai.fr/espace/lorani depuis le 06/10, 0 h 52) | écran recetté aux cinq largeurs (41 contrôles), **relu en base réelle** avec `gerant@banc-varelo.test` : projet et PCMI créés par l'écran, calendrier calculé par le socle, **un vrai récépissé déposé et lu par le lecteur** (mais rendu « courrier non reconnu », voir § 3) ; fusion sur `main` en cours chez le coordinateur ; reste la vérification sur omegaai.fr et le rejeu du dépôt réel quand le lecteur connaît les types |

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

