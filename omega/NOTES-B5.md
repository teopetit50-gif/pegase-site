# Session B5 — LORANI, le calendrier du permis (vague 2)

Branche `worker-b5`. Coordinateur : session_01B4JNQXyT69GytdvE9SjAnE.
Dernière mise à jour : 05/10/2026, soir.

## Jauges

| Jauge | Valeur | Ce qui la fait monter |
|---|---|---|
| **Mécanique** (le socle fait ce que la page promet, prouvé par des tests joués sur la recette) | 0 % | scénario écrit, tests pgTAP à jouer par le coordinateur |
| **Livrable client** (un gérant d'agence ouvre /espace/lorani et suit un vrai permis) | 0 % | écran à écrire, relecture réelle avec le compte du banc |

**Ce qui manque** : tout, c'est le début. **Ce que Teo doit fournir** : rien pour l'instant.

## La promesse faite aux clients (app/secteurs/architectes)

Sur la page des architectes, Lorani promet — c'est le périmètre de B5, le
reste de la page (PLU lu depuis l'adresse, métré, décennales, visas, situations)
est hors de ce module :

- « Calendrier du permis jusqu'à la purge des recours » ;
- « Délai d'instruction suivi jusqu'à la purge » ;
- « Lorani suit-il le permis après le dépôt ? Oui. Il suit le délai
  d'instruction, la demande de pièces complémentaires et la réponse à
  préparer, puis la date du permis tacite et la fin du délai de recours des
  tiers à partir de l'affichage. Vous savez quand le chantier peut démarrer. »

Le socle (omega/SOCLE-EXTRAITS-LORANI.sql, 9 tables, 46 fonctions, 2 crons)
porte déjà : projets, lots, intervenants, équipe de projet, permis avec son
calcul (`lorani_calendrier_permis`, version lorani.m4.1), échéances posées
dans `delais`, lectures de courriers (`lorani_permis_dates_lues`), décision
implicite, recours, point du matin et mesures.

## 1. Le scénario réel de bout en bout

Une agence d'architecture (le client du banc, « Groupe Sogexal (banc) »,
`cccccccc-0000-4000-8000-00000000000c`) suit un permis de construire pour une
maison, puis une déclaration préalable qui va jusqu'à la purge. Les dates
sont relatives au jour du test (J), parce que le recalcul du socle lit
`now()`. Personnes : `gerant` (gérant), `referent` (valideur, chef de
projet), `daf` (collaborateur, assistant du projet), `daf2` (collaborateur
hors projet).

| # | Étape | Qui | Par où | Ce que le socle doit faire (et que le test vérifie) |
|---|---|---|---|---|
| 1 | Ouvrir le projet « Maison Lemoine », Nantes, 44000 / INSEE 44109, parcelle « AB 123 », nature maison_individuelle, phase pc | gérant | INSERT `lorani_projets` (RLS) | territoire `metropole` déduit du lieu (`lorani_territoire_du_lieu`), entité principale héritée, journal `tracer` |
| 2 | Composer l'équipe : referent chef de projet, daf assistant ; deux lots (01 Gros œuvre, 02 Charpente) ; un BET structure sur le lot 01 | gérant | INSERT `lorani_membres_projet`, `lorani_lots`, `lorani_intervenants` | entité héritée du projet ; numéro de lot unique ; `lorani_chef_de_projet` = referent |
| 3 | Le collaborateur hors projet n'y voit rien ; le chef de projet, si | daf2 / referent | SELECT sous RLS | `lorani_voit_projet` ; un membre d'un autre client ne voit rien non plus |
| 4 | Saisir le permis PC « Maison Lemoine », sans date de dépôt | referent | INSERT `lorani_permis` | état `a_deposer`, aucune échéance, régime `instruction_pc`, silence `tacite` |
| 5 | Le récépissé de dépôt arrive (daté J-100, n° PC 044109 26 A0042) : la pièce est déposée sur le projet, lue par le lecteur | referent, lecteur | dépôt de pièce → `enregistrer_lecture` (service_role) → `lorani_lectures_passage` | une proposition `depot` dans `lorani_permis_dates_lues`, citation retrouvée, `verifiee = true`, alerte info « date de dépôt lue, à confirmer » |
| 6 | Confirmer la date lue | referent | `lorani_confirmer_date_lue(id)` | `date_depot`, `numero` posés ; recalcul : état `instruction` (le mois de complétude est passé), échéances `completude` (tenue… non : passée) et `instruction` posées dans `delais`, journal `lorani.date_permis_confirmee` + `lorani.echeances_recalculees` |
| 7 | La mairie réclame des pièces (lettre du J-80 : PC5, PC8) : pièce lue | lecteur | même chaîne | proposition `demande_pieces` avec `pieces [{code PC5},{code PC8}]` |
| 8 | Confirmer la demande de pièces | referent | `lorani_confirmer_date_lue` | état `pieces_demandees` ; échéance `pieces` = J-80 + 3 mois ≈ J+11, rappels [10, 3, 0] ; `date_decision_attendue` nulle tant que les pièces manquent |
| 9 | Une lettre de délai mal lue (« 5 mois ») est écartée avec motif | referent | `lorani_ecarter_date_lue(id, motif)` | statut `ecartee`, motif gardé, journal `lorani.date_lue_ecartee`, alerte acquittée |
| 10 | Le rappel J-10 des pièces part (le délai le publie, le passage du calendrier l'alerte) | cron | travail `lorani.calendrier.rappel` → `lorani_calendrier_passage` | alerte `attention` « pièces manquantes à faire recevoir… au plus tard le … », clé `permis:<id>:pieces:rappel:10`, responsable = chef de projet |
| 11 | Les pièces sont reçues par la mairie le J-5 | referent | UPDATE `lorani_permis.date_pieces_fournies` (RLS, trigger) | état `instruction`, échéance `pieces` close `tenu`, instruction = J-5 + 2 mois (PC maison individuelle), rappel [7] |
| 12 | Garde-fou : saisir `decision = 'tacite'` à la main est refusé | referent | UPDATE `lorani_permis` | 42501 « Une décision implicite se confirme par lorani_confirmer_decision_implicite » |
| 13 | Deuxième dossier : DP « Clôture Martin » déposée le J-200 (saisie directe), aucun courrier depuis | referent | INSERT `lorani_permis` type dp, date_depot | délai DP 1 mois → `decision_a_confirmer`, `decision_implicite = {tacite, J-169}` |
| 14 | Confirmer la non-opposition tacite | referent | `lorani_confirmer_decision_implicite(permis)` | decision `tacite`, date = J-169, état `accorde`, journal `lorani.decision_implicite_confirmee`, échéances `affichage` (relance J-154) et `retrait` (3 mois) |
| 15 | Garde-fou : un recours contre un permis non accordé est refusé (sur le PC encore en instruction) | referent | INSERT `lorani_permis_recours` | 22023 « Un recours se saisit contre un permis accordé » |
| 16 | Le constat d'affichage (premier passage, J-165) est lu puis confirmé | lecteur, referent | chaîne de lecture + `lorani_confirmer_date_lue` | `date_affichage = J-165`, échéance `recours` (2 mois) ; `date_purge` = max(retrait J-169+3 mois, recours J-165+2 mois) |
| 17 | Un voisin forme un recours gracieux le J-160, rejeté le J-140 | referent | INSERT puis UPDATE `lorani_permis_recours` | pendant : état `recours_en_cours`, avertissement « pas de purge » ; après : borne contentieux (rejet + 2 mois) prise dans la purge |
| 18 | Le passage quotidien recalcule : la DP est purgée | cron | `lorani_calendrier_passage` | état `purge`, `chantier_sans_risque_le = date_purge + 1`, alerte info « purgé », échéances closes ; le PC reste `instruction` |
| 19 | Le point du matin et la mesure | cron | `lorani_deposer_point`, `lorani_enregistrer_mesures` | une section « Calendrier des permis » pour gerant et referent (pas pour daf2) ; mesure `lorani.calendrier.dates_completes` |
| 20 | Le journal opposable raconte tout, chaîné, et nul ne l'a écrit à la main | test | SELECT `journal_opposable` | actions `lorani.date_permis_confirmee`, `lorani.echeances_recalculees`, `lorani.date_lue_ecartee`, `lorani.decision_implicite_confirmee` présentes pour le client ; INSERT direct refusé |

Ce que l'écran /espace/lorani montre de ce scénario : les projets et leurs
permis, le calendrier (étapes avec certitude et article), les dates lues à
confirmer ou à écarter, la décision implicite à confirmer, les recours, les
échéances et les rappels partis, les lots, les intervenants et l'équipe.

### Les portes que le scénario emprunte (jamais d'écriture directe hors RLS)

- Tables écrites sous RLS par un membre (c'est le dessin du socle, comme
  `approbations` pour A3) : `lorani_projets`, `lorani_membres_projet`,
  `lorani_lots`, `lorani_intervenants`, `lorani_permis` (dates, cases,
  type), `lorani_permis_recours`. Les triggers gardent (`lorani_garder_permis`,
  `lorani_preparer_recours`, `lorani_heriter_projet`) et recalculent.
- Portes RPC : `lorani_confirmer_date_lue`, `lorani_ecarter_date_lue`,
  `lorani_confirmer_decision_implicite`, `lorani_recalculer_permis`,
  `lorani_calendrier_permis` (calcul pur, pour l'écran), `lorani_mesurer_calendrier`.
- Portes du lecteur (service_role) : dépôt de la pièce, `enregistrer_lecture`.
- Crons : `lorani_lectures_passage` (*/5), `lorani_calendrier_passage` (:12).

## 2. Trous du socle repérés à la lecture (à confirmer par le coordinateur)

1. **Dépôt d'une pièce sur un projet Lorani** : FILED a `filed_deposer_piece` ;
   je ne vois pas de porte générique pour `objet_type = 'lorani_projet'`.
   Sans elle, ni l'écran ni le lecteur ne peuvent attacher un récépissé au
   projet. → migration `b5_01_lorani_deposer_piece.sql` si elle manque.
2. **Lien des alertes** : `lorani_alerter_*` et `lorani_lien_permis` pointent
   `/secteurs/architectes/permis`, une page qui n'existe pas ; l'écran client
   sera `/espace/lorani?permis=<id>`. → migration `b5_02_liens_espace.sql`
   (`create or replace` de `lorani_lien_permis` et des trois alerteurs).
3. **`lorani_permis_dates_lues` sans politique d'écriture** : voulu (les
   portes écrivent) — rien à faire, à vérifier dans les tests.
4. **`lorani_permis_echeances` : politique SELECT sans `perimetre_couvre`**
   (lit `mes_clients()` + existence du projet, pas `lorani_voit_projet`) : un
   membre qui ne voit pas le projet voit ses échéances. → à confirmer, puis
   `b5_03_echeances_visibilite.sql`.
5. **Pas de porte de saisie d'un permis** : l'écran écrit `lorani_permis` sous
   RLS, comme le socle le veut. Rien à poser, mais le dire.

## 3. Questions de faits posées au coordinateur (05/10)

Voir le message envoyé ; réponses à recopier ici.

## 4. Écran client /espace/lorani

À écrire (modèle A3 : components/espace/lorani/, app/espace/lorani/,
données d'exemple marquées, interrupteur base réelle, portes RPC).

## 5. Journal de bord

- 05/10 soir : lecture du cadre (CLAUDE.md, AGENTS.md, contrat, notes du
  coordinateur et d'A3, socle Lorani, page des architectes, tests A4/A5,
  écran A3). Scénario écrit et envoyé.
