# Session B1 — VARELO, le référentiel du groupe (sociétés, pôles, rapprochement)

Branche `worker-b1`. Dernière mise à jour : 06/10/2026, 02 h 30 (écran relu
en base réelle avec les trois comptes du banc : prêt à fusionner ; b1_02 et
les tests en cours de pose et de rejeu par le coordinateur). Le coordinateur
lit ce fichier.

## Les deux jauges

| Jauge | Où on en est | Ce qui manque pour 100 % |
|---|---|---|
| **Mécanique** (le socle fait ce qu'il dit, prouvé par pgTAP sur la recette) | **25 %** | b1_01 est posée ; b1_02 (GRANT) à poser ; les 14 fonctions de test (6 lots) écrites et poussées, **aucune encore verte** : premier jeu mort sur une aide absente (corrigé), second jeu demandé. Ensuite : les trous que le rouge révélera, une migration par trou |
| **Livrable client** (un gérant du banc fait le parcours complet dans /espace/varelo, en base réelle) | **80 %** | l'écran est écrit, tsc ✓ eslint ✓ build ✓ recette cinq largeurs ✓ (exemple), **relecture en base réelle ✓** avec gerant / referent / daf du banc (lecture, et une écriture par `grp_proposer_nom`) ; l'onglet est dans la barre (deux lignes dans les fichiers d'A3, à reporter sur main) ; **reste** : la fusion sur main et la vérification sur omegaai.fr, puis rejouer sur le banc un dépôt d'export et un passage depuis l'écran dès que b1_02 est posée (les portes étaient service_role) |

### Ce que Teo doit fournir ou décider lui-même

1. **Le périmètre de la promesse.** `/secteurs/groupes` promet quatre listes du
   matin (« le groupe sur une page », « les contrats à dénoncer », « les
   réserves à émettre », « les reportings dus »). Le socle VARELO photographié
   (`SOCLE-EXTRAITS-VARELO.sql`) ne porte que **le référentiel** : sociétés,
   pôles, codes locaux, objets du groupe, rapprochement, lots à valider,
   export, journal, battement. Contrats, réserves et reportings ne sont dans
   aucune table `grp_*`. B1 livre le référentiel ; les trois autres listes
   sont à décider (autre moteur VARELO à écrire ? autre module ?).
2. Un **compte `collaborateur`** du banc rattaché à UNE société (périmètre
   partiel, `comptes.perimetre_total = false`) pour prouver le périmètre à
   l'écran — les comptes fournis (gerant, referent, daf, daf2) voient tout.
3. Rien d'autre côté clés ou comptes tiers : le module tourne entièrement
   dans Postgres (crons `varelo-referentiel*`), sans fonction Edge ni IA.
4. **Décider qui dépose les exports** : b1_01 + b1_02 ouvrent `grp_installer`
   et `grp_deposer_codes` au gérant et à l'administrateur (la DSI, comme le
   site le promet). Si Teo veut qu'un collaborateur d'une société dépose
   l'export de SA société, c'est une règle de plus (voit_entite) à écrire.

## 1. Le scénario réel de bout en bout

Un vrai client : **Groupe Sogexal (banc)**, `cccccccc-0000-4000-8000-00000000000c`.
Les personnes : le **gérant** (la DSI, qui décide de centraliser), le
**référent données** (équipe `referent_donnees`, c'est lui qui valide les
rattachements), la **DAF** et **DAF2** (équipe `direction_financiere`, deux
approbations pour un fournisseur aux coordonnées bancaires différentes), un
**collaborateur** d'une société (il propose, il n'approuve jamais).

| # | Ce que fait le client | Ce que fait Omega | Ce qu'il voit |
|---|---|---|---|
| 1 | Le gérant **installe Varelo** pour le groupe : `grp_installer(client)` | pose `grp_installations` (seuils 0,97 / 0,80, lots de 50), les 6 équipes (présidence, DF, DJ, DO, DSI, référent données), 7 règles de validation (1 approbation du référent ; 2 de la DF pour `rattacher_iban_different`), le battement quotidien `varelo_referentiel`, une ligne de journal `varelo.installation`. Rejoué : rien en double. | « Varelo est installé » ; les règles dans /espace/validations |
| 2 | Le gérant **crée les pôles** « Distribution », « Logistique » (INSERT `grp_poles`, politique gérant/admin) | garde la clé `^[a-z][a-z0-9_]{1,39}$`, trace | la liste des pôles ; un collaborateur ne peut pas en créer (42501) |
| 3 | Le gérant **inscrit les sociétés** : `grp_ajouter_societe(client, nom, siren, territoire 'GP'/'MQ'/'FR', pôle, logiciel, nomenclature)` | crée l'entité `societe` sous l'entité principale, le fuseau du territoire, la ligne `grp_societes` (`a_brancher`) ; refuse un territoire illisible (22023), un SIREN à clé fausse, une entité qui n'est pas une société | `grp_societes_vue` : société, pôle, territoire, fuseau, logiciel, nomenclature, statut de branchement |
| 4 | Un collaborateur de la société A ouvre l'écran | RLS : `voit_entite` | il ne voit QUE sa société ; le gérant voit tout |
| 5 | La DSI **branche la première source en lecture seule** : l'export fournisseurs de la société A, déposé par `grp_deposer_codes(client, entite, 'fournisseur', lignes, source)` | normalise (nom, SIREN/SIRET/TVA, IBAN → empreinte, adresse, CP, téléphone, domaine), relève les anomalies (SIREN à clé fausse, CP illisible), rejette les lignes sans code ou sans nom et les doublons du lot, dépose le travail `varelo.referentiel.rapprocher`, journalise `varelo.referentiel.lecture` | `{lus, nouveaux, modifies, inchanges, anomalies, rejetes[]}` ; rejoué à l'identique : 0 nouveau, 0 modifié |
| 6 | Même dépôt pour la société B : le même transporteur sous un autre code et un autre libellé, même SIREN ; un troisième proche de nom sans identifiant ; un fournisseur qui porte le SIREN d'une société du groupe | idem | — |
| 7 | **Omega rapproche** (cron chaque minute → `grp_rapprocher`) ; dans le test, le gérant lance `grp_rapprocher(client)` | crée les objets du groupe (`F-00001`…), place d'office le code B sur l'objet du code A (preuve sûre `siren`, état `propose`), propose les paires probables (similarité, seuils), forme les **lots** → `demandes_validation` module `varelo` (`rattacher_codes` pour le référent, `rapprocher_codes`…), marque l'intragroupe, bat le battement, journalise `varelo.referentiel.calcul` | la file de validation : « Référentiel : rattacher N codes fournisseurs, un identifiant commun le prouve. » ; `grp_etat_referentiel` : codes, rattachés, stables, propositions ouvertes |
| 8 | Le référent ouvre le lot dans /espace/varelo | lit `grp_ref_propositions` (paire, preuve, raisons, score) | code A ↔ code B, « SIREN 123 456 789 » |
| 9 | Le référent **écarte une paire** du lot : `grp_ecarter_proposition(prop, motif)` | proposition `ecartee`, le code libéré repart `nouveau` sur son propre objet, journal `varelo.referentiel.ecart` ; un collaborateur hors équipe est refusé (`exiger_decideur`) ; une proposition humaine ne s'écarte pas (elle se refuse par sa demande) | la paire sort du lot |
| 10 | Le référent **approuve le lot** (INSERT `approbations`, comme A3) | la demande passe `approuvee`, le socle dépose `varelo.decision`, `grp_executer_decisions` confirme les codes (`confirme`, `demande_id`, `rattache_le`), la demande passe `executee`, journal `varelo.referentiel.execution`. Personne ne confirme un code à la main : trigger « Un rattachement confirmé exige une demande approuvée » | l'objet `F-00001` « Transports Caraïbes » avec ses deux codes locaux |
| 11 | Un collaborateur **propose une correction** : `grp_proposer_rattachement(code, objet, raison)` / `grp_proposer_fusion` / `grp_proposer_nom` / `grp_proposer_detachement` / `grp_proposer_scission` | proposition `humaine` + demande (1 approbation du référent) ; refuse deux SIREN qui se contredisent, un code hors périmètre, une seconde proposition sur le même code | « en attente du référent » |
| 12 | **Séparation saisie / approbation** : le collaborateur tente d'approuver sa propre demande | refusé (lot 19c : « Celui qui a saisi la pièce ne l'approuve pas ») ; le référent approuve → appliquée | — |
| 13 | **Coordonnées bancaires différentes** : même SIREN, autre IBAN | type `rattacher_iban_different`, règle DF, **2 approbations** : daf seul ne suffit pas, daf2 exécute | la pastille « IBAN différent » |
| 14 | **Intragroupe** : le code dont le SIREN est celui d'une société du groupe | `grp_ref_objets.intragroupe = true`, `intragroupe_entite_id` | pastille « intragroupe · Sogexal Logistique » |
| 15 | Le gérant **exporte** le référentiel : `grp_exporter_referentiel(client, 'fournisseur')` | CSV `code_groupe;nom_groupe;societe;code_local;nom_local;etat`, cellules protégées contre l'injection tableur, journal `varelo.referentiel.export` ; le collaborateur est refusé (42501) | le fichier |
| 16 | **Isolement** : un membre d'une autre organisation | ne lit aucune ligne `grp_*` du banc et ne peut ni installer, ni déposer des codes, ni rapprocher pour le banc | rien |
| 17 | **Journal opposable** : chaque étape a sa ligne (installation, lecture, calcul, écart, exécution, export), écrite par `private.journaliser` seulement | personne ne l'écrit ni ne la modifie directement | le fil dans l'écran (gérant/admin) |

## 2. Les tests pgTAP (omega/tests/varelo/)

Schéma `tests` et aides d'A5 (`tests.endosser`, `tests.redevenir_admin`,
`tests.compter`) ; client du banc ; comptes gerant / referent / daf / daf2 ;
tout par les portes publiques, jamais d'écriture directe sauf là où le socle
le veut (INSERT `grp_poles`, INSERT `approbations`). Lots :

| Fichier | Étapes du scénario | État |
|---|---|---|
| `b1_00_aides.sql` | le groupe vierge et ses personnes, `b1_preparer(palier)`, les deux exports, `b1_code`, `b1_decider` | écrit (2e version, 99ecb89) |
| `b1_01_installation.sql` | 1, 2, 3, 4 (dont périmètre partiel par `comptes_entites`) — 4 tests | écrit, à rejouer |
| `b1_02_depot_codes.sql` | 5, 6 — 2 tests | écrit, à rejouer |
| `b1_03_rapprochement.sql` | 7, 8, 14 + périmètre partiel sur codes/objets/propositions — 1 test | écrit, à rejouer |
| `b1_04_decisions.sql` | 9, 10, 12, 13 + lot refusé — 3 tests | écrit, à rejouer |
| `b1_05_corrections.sql` | 11 (nom, rattachement, fusion, refus) — 1 test | écrit, à rejouer |
| `b1_06_garde_fous.sql` | 15, 16, 17 + battement — 3 tests | écrit, à rejouer |

Premier jeu (05/10, 22 h 44) : 14 tests morts sur `tests.role_admis` absente de
la recette → aides réécrites sans elle, sur le groupe vierge. Second jeu demandé
avec la pose de b1_02.

## 3. Trous du socle (relevés à la lecture, confirmés ou infirmés par le coordinateur le 05/10)

| # | Trou | État | Migration |
|---|---|---|---|
| T1 | Les quatre enveloppes `grp_installer`, `grp_deposer_codes`, `grp_rapprocher`, `grp_appliquer_decisions` ne contrôlaient ni rôle ni appartenance. **À moitié vrai** : elles étaient réservées à `service_role` (authenticated sans EXECUTE), donc pas de fuite ; mais le scénario veut que le gérant installe et que la DSI dépose depuis l'écran. | b1_01 **posée** (varelo_b1_01) : contrôle de rôle quand `auth.uid()` est posé. | `b1_01_portes_roles.sql` ✓ posée ; `b1_02_portes_authenticated.sql` à poser : GRANT à authenticated des quatre public et des quatre private appelées (à ajouter à la liste figée d'A5) |
| T2 | `grp_ajouter_societe` sous la RLS de l'appelant. **Infirmé** : `entites` a une politique INSERT gérant/admin (et `not principale`) avec son GRANT ; la porte marche pour le gérant, et refuse les autres (42501) — c'est ce qu'on veut. | clos | — |
| T3 | Pas de porte de lecture du lot. **Sans objet** : l'écran lit `grp_ref_propositions` × `grp_referentiel_codes` sous RLS ; `comptes_entites` porte le périmètre partiel (un collaborateur rattaché à une société ne voit que ses codes et leurs objets), testé en b1_01 et b1_03. | clos | — |
| T4 | Aucune table `grp_*` dans Realtime. **Posé par le coordinateur** (lot 19n) : `grp_ref_propositions`, `grp_ref_codes`, `grp_ref_objets`, `grp_societes` publiées ; l'écran les écoute (`tempsReel.ts`) avec `demandes_validation`. | clos | — |
| T5 | `private.grp_proposer` ne pose pas `payload.saisi_par` : la séparation saisie/approbation (lot 19c) ne peut tenir que si `demandes_validation.demandeur_id` est posé par le socle. **À prouver** par b1_04 (test « séparation ») et b1_05. | en attente du rejeu | si rouge : `b1_03_saisi_par.sql` (create or replace de `private.grp_proposer` avec `'saisi_par', v_uid` dans la charge) |
| T6 | Les aides d'A5 sur la recette n'ont pas `tests.role_admis` (présente sur worker-a5, absente en base). Pas un trou du socle : mes aides n'en dépendent plus. | clos | — |

## 4. Réponses du coordinateur (05/10, 22 h 30), recopiées

- **Portes** : authenticated exécute `grp_ajouter_societe`, `grp_demander_rapprochement`, `grp_ecarter_proposition`, `grp_etat_referentiel`, `grp_exporter_referentiel`, `grp_proposer_*` ; pas `grp_appliquer_decisions`, `grp_deposer_codes`, `grp_installer`, `grp_rapprocher` (service_role) → b1_02.
- **Banc** : installé le 29/09 (seuils 0,970 / 0,800, lots de 50, IBAN partagé ≤ 3) ; 3 sociétés (Novasud Antilles GP, Sodimat Guadeloupe GP, Métalco Martinique MQ), 0 pôle, 892 codes (articles 125, fournisseurs 134, clients 633), 686 objets, 226 propositions à valider, 7 demandes en attente (rapprocher_codes 2, rattacher_codes 4, rattacher_iban_different 1), 1 exécutée, 1 refusée ; chargé par les jeux fictifs du socle puis rapproché par le cron. Conseil suivi : les tests jouent sur un **groupe vierge** (`tests.jeu()`), le banc sert à la relecture écran.
- **Socle commun** : `entites(id, client_id, parent_id, nom, type, siren, principale, cree_le, fuseau, territoire)` ; `voit_entite` = périmètre total ou ligne `comptes_entites(client_id, user_id, entite_id)` ; `a_un_role` = compte du uid chez le client avec le rôle ; `exiger_decideur` = rôle autorisé + périmètre + équipe + objet ; `equipes(id, client_id, cle, nom)`, `equipes_membres(id, client_id, equipe_id, user_id)`.
- **Comptes du banc** : gerant …c1 (gerant), referent …c2, daf …c3, daf2 …c4 (valideurs, périmètre total) ; referent ∈ `referent_donnees`, daf et daf2 ∈ `direction_financiere`.
- **Journal** : `journal_opposable(id, client_id, entite_id, survenu_le, acteur_type, acteur_id, acteur_libelle, action, objet_type, objet_id, donnees, hash_precedent, hash)`, SELECT gérants et admins seulement, écriture par `private.journaliser` seule. `private.battre` upsert `battements` et acquitte l'alerte `battement:<module>`.
- **Session de relecture** : `POST /auth/v1/token?grant_type=password` sur la recette avec la clé publique `sb_publishable_a12GN1jHf0IJR4xcKvPTXw_NlPb51zl` ; comptes gerant/referent/daf@banc-varelo.test. Le site construit avec `NEXT_PUBLIC_SUPABASE_URL` / `_PUBLISHABLE_KEY` de la recette (le défaut de `lib/supabase/config.ts` est la production).

## 5. Écran /espace/varelo (8f92b47)

`app/espace/varelo/page.tsx` + `components/espace/varelo/` : `types.ts`
(décalque du socle), `exemples.ts` (le groupe Bertin : trois sociétés, deux
pôles, dix codes fournisseurs sous sept objets, quatre paires à valider dont
une IBAN différent, une probable à 86 % et une correction humaine),
`portes.ts` (lectures sous RLS + les portes `grp_*`, INSERT `grp_poles`
seul), `csv.ts` (lecture d'un export, synonymes d'en-têtes Sage/EBP/Cegid),
`EcranVarelo.tsx` (compteurs par nature, objets ↔ objet ouvert, dépôt,
passage, export CSV, installation), `ObjetDetail.tsx` (codes par société,
nom / fusion / rattachement / détachement / scission → `grp_proposer_*`),
`Lots.tsx` (paires par demande avec la preuve, « écarter cette paire » →
`grp_ecarter_proposition`, renvoi vers /espace/validations, dernières
décisions), `Societes.tsx` (pôles, sociétés, inscription avec territoire
obligatoire), `Depot.tsx` (export → `grp_deposer_codes`, compte rendu et
rejets), `varelo.css` (compléments, rien de `.esp-*` redéfini).

Vérifié : `npx tsc --noEmit` ✓, `npx eslint components/espace/varelo
app/espace/varelo` ✓ (0/0), `npm run build` ✓, recette
`node omega/recette-b1/recette-varelo.mjs` ✓ aux cinq largeurs (390 / 768 /
1024 / 1440 / 1700 : chargement, débordement, éléments larges, mots anglais,
titre, compteurs, 7 objets / 4 paires / 3 sociétés) + cinq enchaînements
(écarter la paire 4471 → le code repart seul, un objet de plus ; proposer un
nom → demande ouverte, seconde proposition refusée ; inscrire une société →
SIREN à cinq chiffres refusé avant l'envoi, Guadeloupe → fuseau ; déposer un
export → cinq lignes, colonnes reconnues par synonymes, trois rejets avec
motifs, une anomalie ; passage → deux objets ouverts ; nature clients,
recherche, export CSV) : « tout passe ». Captures `omega/recette-b1/`.

**Relecture en base réelle — faite le 06/10 (01 h 50 – 02 h 20 UTC)** :
`node omega/recette-b1/relecture-reelle-varelo.mjs <session.json> [origine]
[--ecrire]` (décalque d'A3 ; session obtenue par `POST /auth/v1/token` sur la
recette ; site construit avec les `NEXT_PUBLIC_*` de la recette ; dans ce
conteneur le navigateur d'essai doit ignorer le certificat du mandataire et
être le Chromium complet, voir l'en-tête du script). Captures
`omega/recette-b1/reel-varelo-*-1440.jpg`. Résultat :

- **gérant** : identité affichée, interrupteur sur « Base réelle », aucun avis
  rouge, aucun refus de la base en console. Fournisseurs : 134 codes, 87
  objets, 58 paires à valider, taux 100 % ; 226 paires dans 7 lots en tout ;
  les 3 sociétés du banc (Métalco Martinique MQ, Novasud Antilles GP, Sodimat
  Guadeloupe GP) avec SIREN, territoire, fuseau et nombre de codes ; les
  boutons Déposer / Lancer / Exporter ; `F-00003` ouvert d'office avec ses
  deux codes (FRN-00021 seul, 40100010 proposé « même SIREN »). **Une
  écriture** : « Proposer un nom » → `grp_proposer_nom` accepté, la demande
  « Renommer un objet » apparaît aussitôt dans les lots (relecture après la
  porte). Cette demande (nom « … (relecture B1) ») est **à refuser dans la
  file de validation** par le référent du banc.
- **référent** (valideur, équipe Référent données) : même lecture, 59 paires /
  8 lots après l'écriture ; « Écarter cette paire » proposé sur 225 paires
  (toutes sauf le lot IBAN différent de la DF et la correction humaine).
- **DAF** (valideur, Direction financière) : même lecture ; « Écarter » proposé
  sur 1 paire seulement (le lot IBAN différent). Le rôle et l'équipe sont lus
  de `comptes` / `equipes_membres`, la base restant juge.
- **Non rejoué en réel** : écarter une paire (irréversible sur les données du
  banc ; prouvé par pgTAP b1_04), déposer un export et lancer un passage
  (portes service_role jusqu'à b1_02), approuver un lot (écran d'A3).
- **Relevé pour le coordinateur** : la CSP du site (`next.config.ts`,
  `connect-src`) n'autorise pas `wss://<projet>.supabase.co` → le navigateur
  refuse le canal Realtime (« Refused to connect to wss://… ») : les écrans
  d'A3 et le mien ne se relisent pas d'eux-mêmes en production non plus, ce
  n'est pas le conteneur. Une entrée `wss://` à ajouter à `connect-src`.

**Hors périmètre, demandé au coordinateur** : l'onglet dans
`components/espace/ecrans.ts` (A3) et `varelo` dans `MODULES` de
`components/espace/format.ts`.
