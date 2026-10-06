# Session B1 — VARELO, le référentiel du groupe (sociétés, pôles, rapprochement)

Branche `worker-b1`. Dernière mise à jour : 06/10/2026, 03 h UTC — **terminé** :
les 14 tests sont verts sur la recette, les trois migrations sont posées,
/espace/varelo est sur main (b287d04) et **en ligne sur omegaai.fr**. Le
coordinateur lit ce fichier.

## Les deux jauges

| Jauge | Où on en est | Ce qui manque pour 100 % |
|---|---|---|
| **Mécanique** (le socle fait ce qu'il dit, prouvé par pgTAP sur la recette) | **100 %** | **14 tests sur 14 verts** le 06/10 à 02 h 24 UTC (253 assertions) : les 17 étapes du scénario jouées par les portes publiques sur un groupe vierge, avec RLS, rôles, périmètre partiel, séparation saisie/approbation, deux approbations, journal, isolement. Trois migrations posées (varelo_b1_01, _02, _03). Pour la production : les trois migrations à reposer par le coordinateur |
| **Livrable client** (un gérant du banc fait le parcours complet dans /espace/varelo, en base réelle) | **100 %** | écran écrit, tsc ✓ eslint ✓ build ✓ recette cinq largeurs ✓, relecture en base réelle ✓ (gerant / referent / daf du banc), fusionné sur main (b287d04) avec l'onglet, **en ligne et vérifié le 06/10 à 02 h 55 UTC** : https://omegaai.fr/espace/varelo répond 200 et sert « Référentiel du groupe », le ruban « Données d'exemple », « Lots à valider », « Sociétés et pôles » et l'onglet de la barre (relevé par curl sur le HTML servi). Rappel : la production n'a pas de client Varelo ; la base réelle se relit sur la recette. Ce qui reste est à Teo (§ ci-dessous) |

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
la recette → aides réécrites sans elle, sur le groupe vierge. Deuxième jeu
(06/10, 01 h 50) : 1 vert, 13 morts : `tests.jeu()` de la recette ne rend pas
`gerant_a` → le gérant est créé par `b1_banc`. **Troisième jeu (06/10,
02 h 05) : 12 verts sur 14** — b1_01 ×4 (10, 8, 6, 15 assertions), b1_02 ×2
(29, 6), b1_03 (62, passage `{demandes 2, objets_crees 6, codes_examines 9,
places_d_office 3}`), b1_04 ×3 (24, 9, 9 ; exécution `{demandes 1,
appliquees 1}`), b1_06_export (9), b1_06_isolement (21). Rouges : b1_05 (35/36,
le second nom proposé non refusé → T7, migration b1_03) et b1_06_journal (cast
`cmp_ok(bigint, …, integer)`, corrigé). **Quatrième jeu (06/10, 02 h 24) :
b1_05 36/36, b1_06_journal 9/9 — 14 sur 14 verts.**

## 3. Trous du socle (relevés à la lecture, confirmés ou infirmés par le coordinateur le 05/10)

| # | Trou | État | Migration |
|---|---|---|---|
| T1 | Les quatre enveloppes `grp_installer`, `grp_deposer_codes`, `grp_rapprocher`, `grp_appliquer_decisions` ne contrôlaient ni rôle ni appartenance. **À moitié vrai** : elles étaient réservées à `service_role` (authenticated sans EXECUTE), donc pas de fuite ; mais le scénario veut que le gérant installe et que la DSI dépose depuis l'écran. | b1_01 **posée** (varelo_b1_01) : contrôle de rôle quand `auth.uid()` est posé. | `b1_01_portes_roles.sql` ✓ posée ; `b1_02_portes_authenticated.sql` à poser : GRANT à authenticated des quatre public et des quatre private appelées (à ajouter à la liste figée d'A5) |
| T2 | `grp_ajouter_societe` sous la RLS de l'appelant. **Infirmé** : `entites` a une politique INSERT gérant/admin (et `not principale`) avec son GRANT ; la porte marche pour le gérant, et refuse les autres (42501) — c'est ce qu'on veut. | clos | — |
| T3 | Pas de porte de lecture du lot. **Sans objet** : l'écran lit `grp_ref_propositions` × `grp_referentiel_codes` sous RLS ; `comptes_entites` porte le périmètre partiel (un collaborateur rattaché à une société ne voit que ses codes et leurs objets), testé en b1_01 et b1_03. | clos | — |
| T4 | Aucune table `grp_*` dans Realtime. **Posé par le coordinateur** (lot 19n) : `grp_ref_propositions`, `grp_ref_codes`, `grp_ref_objets`, `grp_societes` publiées ; l'écran les écoute (`tempsReel.ts`) avec `demandes_validation`. | clos | — |
| T5 | `private.grp_proposer` ne pose pas `payload.saisi_par` : la séparation saisie/approbation (lot 19c) ne peut tenir que si `demandes_validation.demandeur_id` est posé par le socle. **À prouver** par b1_04 (test « séparation ») et b1_05. | en attente du rejeu | si rouge : `b1_03_saisi_par.sql` (create or replace de `private.grp_proposer` avec `'saisi_par', v_uid` dans la charge) |
| T5 bis | **Infirmé par le rejeu** : b1_04_refus_et_separation et b1_05 sont verts sur « celui qui a saisi la correction ne l'approuve pas » → le socle pose bien le demandeur (demandeur_id) et `preparer_approbation` le refuse. Pas de migration. | clos | — |
| T6 | Les aides d'A5 sur la recette n'ont pas `tests.role_admis` ni `gerant_a` (présentes sur worker-a5, absentes en base). Pas un trou du socle : mes aides créent leur gérant. | clos | — |
| T7 | `private.grp_proposer` acceptait **deux noms proposés en même temps pour le même objet** (le test d'unicité ne regardait que les codes et les fusions) : deux demandes renommer_objet ouvertes, la dernière exécutée écrasait l'autre. Révélé par b1_05 le 06/10. | **posée** (varelo_b1_03), b1_05 36/36 | `b1_03_proposer_nom_unique.sql` : la condition ajoutée au test d'unicité, même message 23514 |

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
  porte). Cette demande (nom « … (relecture B1) ») sert de demande saisie par
  le gérant pour le test « Annuler ma demande » d'A3, qui l'annule lui-même
  (coordinateur, 06/10).
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

**En ligne** : omegaai.fr/espace/varelo vérifié le 06/10 à 02 h 55 UTC (200,
phrases de l'écran et onglet présents dans le HTML servi).
**Fusion faite** : main b287d04 (06/10, 02 h 17 UTC) porte /espace/varelo,
l'onglet « Référentiel du groupe » (court VARELO), `MODULES.varelo` et la CSP
`wss://` ; la barre de l'espace a été refaite à huit onglets par le
coordinateur, recette cinq largeurs verte sur son build. omegaai.fr ne servira
/espace/varelo qu'après la remise à zéro du quota Vercel (plan gratuit, 100
déploiements par jour, consommés par les prévisualisations des branches
worker-*, coupées depuis). **À vérifier en ligne dès que le déploiement passe** :
« Référentiel du groupe » et le ruban « Données d'exemple » sur
omegaai.fr/espace/varelo.

## 6. Accessibilité (06/10, demande du coordinateur après la mesure axe-core d'A3)

Session Opus 5.5 (`session_018XzgEK2qPbPzZBtrX7BdWB`), reprise de
`session_01CrMrfRwPXbEdP2cxzcaCNh`. La liste des objets d'`EcranVarelo.tsx`
était un `role="listbox"` dont les boutons portaient `role="option"` dans des
`<li>` (écart critique) : c'est maintenant une liste de boutons, l'objet ouvert
porte `aria-current="true"` (même style que `.esp-item[aria-selected]`, déjà
prévu dans `espace.css`). Aucun autre listbox/option dans le module.
Vérifié : tsc ✓, eslint ✓, build ✓, `recette-varelo.mjs` aux cinq largeurs ✓,
`omega/recette-b1/accessibilite-varelo.mjs` (axe-core WCAG 2.1 A/AA à 390 et
1440) : 0 écart, un seul objet courant, il suit le choix.

**Suite (06/10, remarque de B6, axe `scrollable-region-focusable` à 390 px)** :
les deux cadres `.esp-tableau-cadre` qui défilent — codes locaux de l'objet
(`ObjetDetail.tsx`) et lignes rejetées d'un dépôt (`Depot.tsx`) — portent
`tabIndex={0}`, `role="region"` et un `aria-label` (modèle
`daliro/ChantierVue.tsx`). `accessibilite-varelo.mjs` contrôle les deux cadres
et repasse axe sur le dialogue du dépôt avec son tableau des rejets, à 390 et
1440 : 0 écart. tsc ✓ eslint ✓ build ✓, recette cinq largeurs ✓.

## Vague 3 — les trois manques pour qu'un groupe paie Varelo et l'ouvre chaque matin (06/10/2026)

Demande du coordinateur (14 h 31 Z). Constat de départ : Varelo range les
codes (le référentiel) mais ne porte **aucun montant ni aucune échéance** ;
or `/secteurs/groupes` promet « le groupe sur une page », « un seuil
d'encours », « les contrats à dénoncer ». Un référentiel seul se paie une
fois (projet de nettoyage) ; ce qui se paie tous les mois, c'est ce que le
groupe en tire chaque matin.

| # | Manque | Pourquoi un client paie, chaque jour | Concurrents et réglementation |
|---|---|---|---|
| **1** | **L'encours du groupe par tiers, avec un plafond groupe** : chaque société dépose sa balance âgée ; Varelo additionne ce qu'un même client doit à toutes les sociétés (grâce au référentiel), montre l'échu et l'ancienneté, alerte quand un plafond groupe est dépassé. | Le risque client d'un groupe est consolidé ou n'est pas : un client à 60 k€ dans une filiale et 50 k€ dans une autre est à 110 k€ pour le groupe, et personne ne le voit. C'est la première chose que l'assurance-crédit et la DAF demandent. Alerte quotidienne, pas un projet. | Les outils de credit management le vendent au niveau groupe : Agicap (DSO et balance âgée « au niveau du groupe, d'une filiale ou d'un client ») ; Atradius Credit Power (analyse du poste clients « par entreprise, groupe d'entreprises ») ; HighRadius Credit Cloud (limites de crédit). Aucun ne s'appuie sur un référentiel qui relie les codes locaux. Réglementation : délais de paiement plafonnés (60 jours date de facture ou 45 jours fin de mois, art. L441-10 C. com.), amende jusqu'à 2 M€ pour une personne morale (art. L441-16) — l'échu par tranche est ce qui le montre. |
| **2** | **Les contrats du groupe à dénoncer** : registre des contrats de chaque société rattachés au fournisseur du groupe, échéance, préavis, reconduction tacite, date limite de dénonciation ; la liste du matin « à dénoncer avant le … ». | Promis sur la page (« les contrats à dénoncer »), absent du socle. Un même fournisseur sous cinq contrats dans cinq sociétés = une négociation groupe manquée et des reconductions subies. | Contrats à durée déterminée : la reconduction tacite produit un nouveau contrat (art. 1215 C. civ.) — d'où la date limite de préavis à tenir. Outils CLM (gestion de contrats) du marché : aucun n'est branché au référentiel tiers d'un groupe. |
| **3** | **Les comptes réciproques intragroupe à la clôture** : les dettes et créances entre sociétés du groupe (le référentiel les marque déjà « intragroupe ») rapprochées des deux côtés, avec les écarts à expliquer avant la consolidation. | La clôture : chaque écart intragroupe se règle aujourd'hui par Excel et courriel. Le manque n° 1 apporte déjà les soldes par code ; le n° 3 les met face à face. | Règlement ANC 2020-01 : les créances et dettes réciproques sont éliminées en consolidation (intégration globale et proportionnelle) ; les éditeurs de consolidation vendent un module de rapprochement intragroupe à part (Lefebvre-Dalloz, Fiducial, Sigma Conso), qui réduit la clôture de moitié selon eux. |

Sources : [Agicap — poste client](https://agicap.com/fr/produits/poste-client/) ;
[Atradius Credit Power](https://atradius-fr-ts1.opc.oracleoutsourcing.com/rapports/atradius-france---credit-power---fiche-produit-ecran-%282%29.pdf) ;
[HighRadius Credit Cloud](https://highradius.com/fr/software/order-to-cash-ar/credit-cloud/) ;
[délais de paiement, L441-10 et L441-16](https://www.swim.legal/blog/delai-paiement-facture-entreprises-regles-lme-sanctions)
et [DREETS Nouvelle-Aquitaine](https://nouvelle-aquitaine.dreets.gouv.fr/sites/nouvelle-aquitaine.dreets.gouv.fr/IMG/pdf/brochure-delais-paiments.pdf) ;
[art. 1215 C. civ., tacite reconduction](https://www.weblex.fr/fiches-conseils/renouvellement-tacite-reconduction) ;
[règlement ANC 2020-01](https://www.anc.gouv.fr/files/anc/files/1_Normes_fran%C3%A7aises/recueil/REGLT-2020_01-VERSION-RECUEIL2026.pdf)
et [Lefebvre-Dalloz, réconciliation intercos](https://formation.lefebvre-dalloz.fr/actualite/reconciliation-intercos-cycle-essentiel-de-la-cloture-des-comptes) ;
[Paperjam / Sigma Conso](https://paperjam.lu/article/accelerer-rapprochement-interc).
Écarté de la liste : la fraude au changement de RIB (la France est le pays
européen le plus ciblé, [Clubic / baromètre Allianz](https://clubic.com//dossier-610123-l-arnaque-au-faux-fournisseur-une-fraude-qui-cible-les-pme-et-detourne-les-virements.html)) :
Varelo a déjà sa règle « IBAN différent → deux approbations de la DF », et
la vérification des tiers est le terrain de B7 ; « les réserves à émettre »
(art. L133-3 C. com., trois jours pour protester auprès du transporteur)
demandent des bons de réception qu'aucun module ne lit encore.

### N° 1 codé — l'encours du groupe par tiers (b1_04)

- **Migration** `omega/modules/varelo/migrations/b1_04_encours_groupe.sql` :
  tables `grp_encours_depots` (une balance âgée d'une société, d'une nature,
  à une date d'arrêté ; le courant = le dernier arrêté, rien ne s'efface),
  `grp_encours_lignes` (non échu, 1–30, 31–60, 61–90, > 90, échu sans
  ancienneté ; total et échu calculés), `grp_encours_plafonds` (clients
  seulement, total et échu, retiré = `actif false`) ; vues security_invoker
  `grp_encours_courant`, `grp_encours_par_code`, `grp_encours_groupe` ;
  portes `grp_deposer_encours` (gérant, admin) et `grp_regler_plafond`
  (gérant, admin, valideur de la DF) ; `private.grp_montant` (montants à la
  française), `private.grp_controler_encours` (une alerte « attention »
  `varelo:encours.<objet>` par client au-dessus de son plafond, fermée
  d'elle-même) ; journal `varelo.encours.depot | plafond | depassement`.
  Un code inconnu d'une balance (avec un nom) est inscrit au référentiel par
  `private.grp_deposer_codes` ; un code connu n'est jamais réécrit.
  Sans drop ni delete ; rejouable (deux poses de suite essayées).
- **À inscrire dans la liste figée d'A5** (exécutables par authenticated) :
  `private.grp_deposer_encours(uuid, uuid, text, date, jsonb, text)`,
  `private.grp_regler_plafond(uuid, numeric, numeric, text)`.
  `grp_montant` et `grp_controler_encours` : service_role seulement.
- **Tests** `omega/tests/varelo/b1_07_encours.sql` (motif `^test_b1_07_`) :
  `test_b1_07_depot` (23), `test_b1_07_plafond` (19), `test_b1_07_perimetre`
  (16). Joués ici sur une **maquette locale** du socle (PostgreSQL 16,
  `grp_rapprocher` simulé : même SIREN ⇒ code proposé sur l'objet ; aides
  d'A5 et pgTAP décalqués) : **58/58**. Ce qui peut différer sur la recette :
  le vrai passage (placement d'office par SIREN pour des clients, marquage
  intragroupe), l'index d'unicité des alertes, le compte des travaux.
- **Écran** `components/espace/varelo/Encours.tsx` + `encours.ts` (et
  `lireTableau` dans `csv.ts`) : pour les clients et les fournisseurs, la
  carte « Encours du groupe » — totaux hors intragroupe, la balance de
  chaque société et son ancienneté (> 7 jours : « ancienne »), le tableau
  par objet du groupe (encours, échu, > 90 j, plafond, « Au-dessus du
  plafond » / « Provisoire » / « Intragroupe »), le dialogue du plafond, le
  dépôt d'une balance âgée (en-têtes Sage/EBP/Cegid reconnus : « Non échu »,
  « 1-30 », « > 90 », « Solde »…). tsc ✓ eslint ✓ build ✓ ;
  `recette-varelo.mjs` cinq largeurs ✓ (+ 14 vérifications « encours ») ;
  `accessibilite-varelo.mjs` : carte et dialogue du plafond, 0 écart à 390
  et 1440.
- Ni coquille de l'espace ni fichier partagé touchés.

### Retour de la recette sur b1_04 (coordinateur, 06/10, 15 h 08 Z)

Posé (dépôt 4633, test 4634) : `^test_b1_` + socle 46/51 : **19/19 verts**, dont
test_b1_07_depot, _perimetre, _plafond, test_46 (vues security_invoker) et
test_51 (politiques et droits). La liste figée d'A5 se calcule en base : rien
à y ajouter (test 44 vert).

### N° 2 codé — les contrats du groupe à dénoncer (b1_05)

- **Migration** `omega/modules/varelo/migrations/b1_05_contrats_groupe.sql` :
  table `grp_contrats` (société, tiers du référentiel ou libellé, intitulé,
  catégorie, échéance, reconduction tacite/expresse/aucune, durée d'une
  reconduction, préavis en jours ou en mois, montant annuel ; statut actif →
  denonce | archive, rien ne s'efface) ; vue security_invoker
  `grp_contrats_echeancier` (échéance courante : un contrat tacite échu sans
  dénonciation avance d'une période — art. 1215 C. civ. ; date limite =
  échéance − préavis ; jours restants ; état depasse/urgent ≤ 30 j/bientot
  ≤ 90 j/large/sans_objet ; contrats actifs du même tiers dans le groupe) ;
  portes `grp_enregistrer_contrat` (créer ou corriger ; gérant, admin,
  valideur, collaborateur, dans son périmètre), `grp_denoncer_contrat`
  (gérant, admin, valideur DJ ou DF ; date ≤ aujourd'hui ; hors délai dit),
  `grp_archiver_contrat` (gérant, admin) ; `grp_controler_contrats` (une
  alerte par contrat tacite dont la date limite est à ≤ 30 j, « critique »
  à ≤ 7 j, clé `varelo:contrats.<id>`, fermée au dénoncé/archivé/délai
  passé) et cron **`varelo-contrats`** (`17 5 * * *`,
  `private.grp_controler_contrats_tous()`) ; journal
  `varelo.contrat.enregistre | denonce | archive`. Les deux fonctions de dates
  (`grp_contrat_echeance`, `grp_contrat_limite`) sont exécutables par
  authenticated : la vue les appelle.
- **Défaut trouvé et corrigé avant envoi** : la contrainte « un tiers » laissait
  passer un tiers nul (un CHECK à NULL passe) → `coalesce(…, 0) >= 1`.
- **Tests** `omega/tests/varelo/b1_08_contrats.sql` (motif `^test_b1_08_`) :
  `_echeances` (12), `_denonciation` (18), `_perimetre` (10) — dates relatives
  à current_date. Maquette locale : **40/40** (et b1_07 toujours 58/58).
- **Écran** `Contrats.tsx` + `contrats.ts` : carte « Contrats du groupe à
  dénoncer » (sous 30 j, sous 90 j, montant en jeu, reconduits ; filtres À
  surveiller / Dénoncés / Tous ; tableau par date limite ; pastille « N
  contrats chez ce tiers, M sociétés » ; dialogues Ajouter/Corriger et Noter
  la dénonciation ; Archiver). Recette `recette-varelo.mjs` : 104 contrôles,
  cinq largeurs ✓ ; axe 0 écart à 390 et 1440 (carte et dialogue d'ajout).
- **Corrigé au passage** : l'en-tête masqué « Action » (`.vrl-masque`) était
  en position absolue et sortait du cadre qui défile : débordement de la page
  à 390 et 768 en vue clients (carte Encours, déjà sur 786017e) et sous la
  carte Contrats. Passé en bloc en ligne de 1 px.

### Retour de la recette sur b1_05 (coordinateur, 06/10, 15 h 34 Z)

b1_05 posé, `^test_b1_` **20/20 verts** ; carte Contrats fusionnée dans main
(1f6427c) et poussée.

### N° 3 codé — les comptes réciproques intragroupe (b1_06)

- **Migration** `omega/modules/varelo/migrations/b1_06_reciproques.sql` (après
  b1_04) : vue security_invoker `grp_reciproques` — pour chaque paire
  (créancier, débiteur) de sociétés du groupe, la créance vue du créancier (sa
  balance clients, codes dont l'objet est intragroupe = le débiteur) face à la
  dette vue du débiteur (sa balance fournisseurs), les deux arrêtés, l'écart, et
  l'état concorde (< 1 €, même arrêté) / ecart / justifie / dates_differentes /
  manque_creancier / manque_debiteur ; table `grp_reciproques_justifs` (cause
  en_transit, change, litige, decalage_periode, erreur_saisie, autre + motif),
  valable pour l'écart ET les deux arrêtés du moment — un nouveau dépôt qui
  change l'écart la rend caduque ; portes `grp_justifier_ecart` (gérant, admin,
  valideur DF ; seulement un état ecart ou dates_differentes) et
  `grp_exporter_reciproques` (gérant, admin, valideur ; CSV protégé par
  `private.grp_csv`, montants à la française) ; journal
  `varelo.reciproques.justification | export`.
- **Défaut de b1_04 trouvé et corrigé ici** : deux dépôts d'une même transaction
  avaient le même `now()` et le même arrêté → le « dépôt courant » tiré au
  hasard. `alter table grp_encours_depots alter column depose_le set default
  clock_timestamp()` en tête de b1_06.
- **Tests** `omega/tests/varelo/b1_09_reciproques.sql` (motif `^test_b1_09_`) :
  `_paires` (15), `_export_isolement` (10). Maquette locale : 25/25 (b1_07 et
  b1_08 toujours verts, 122 assertions en tout). La maquette pose maintenant
  `intragroupe_entite_id` comme `private.grp_marquer_intragroupe`.
- **Écran** `Reciproques.tsx` + `reciproques.ts` : carte « Comptes réciproques
  intragroupe » (paires, concordantes ou justifiées, à traiter avant la clôture
  avec le montant ; tableau créancier → débiteur, créance et arrêté, dette
  reconnue et arrêté, écart, état ; dialogue Justifier ; Exporter (CSV)).
  `recette-varelo.mjs` : 114 contrôles, cinq largeurs ✓ ; axe 0 écart à 390 et
  1440 (carte et dialogue de justification).
- Limite dite : au périmètre partiel, on ne voit que le côté de ses sociétés
  (l'autre apparaît « manquant ») ; le tableau de clôture se lit au périmètre
  total.

### Retour de la recette sur b1_06 (coordinateur, 06/10, 15 h 47 Z)

b1_06 + test b1_09 posés : `^test_b1_09_` **2/2 verts**. Écran Réciproques
fusionné après le vert du test 51. Suite décidée par le coordinateur : le point
du matin et l'onglet reprennent les trois listes ; prod au gel avec A5.

### Le point du matin Varelo (b1_07)

- **Migration** `omega/modules/varelo/migrations/b1_07_point_du_matin.sql` :
  `private.grp_lignes_matin(client, 'contrats'|'encours'|'reciproques')`
  (SECURITY INVOKER, lit les vues de b1_04–b1_06 : contrats tacites à dénoncer
  ≤ 30 j — critique ≤ 7 j ; clients au-dessus du plafond, balances de plus de
  7 jours ; réciproques en écart, non reconnues ou à arrêtés différents) ;
  `public.grp_ce_matin(client)` (les trois listes au périmètre de la personne,
  pour l'écran) ; `private.grp_deposer_points(maintenant)` (dès 5 h, heure de
  l'entité principale : « Contrats à dénoncer », « Encours du groupe »,
  « Réciproques intragroupe » au rôle gérant et à l'équipe direction_financiere,
  « Contrats à dénoncer » à direction_juridique, par `private.deposer_section` ;
  section vide retirée ; battement `varelo_matin` ; erreur → alerte) ;
  `private.grp_euros` (montants à la française) ; cron **`varelo-matin`**
  (`*/30 * * * *`). Aucune donnée de santé.
- **Tests** `omega/tests/varelo/b1_10_point_du_matin.sql` (motif
  `^test_b1_10_`, après b1_08 et b1_09 dont il reprend les aides) : `_ce_matin`
  (10), `_depot` (11). Maquette locale : 21/21, 143 assertions en tout de b1_07
  à b1_10.
- **Écran** `CeMatin.tsx` : le bloc « Ce matin » en tête de /espace/varelo,
  mêmes phrases que le point du matin, trois blocs avec renvoi à leur carte
  (`#vrl-contrats`, `#vrl-encours`, `#vrl-reciproques`). Recette 120 contrôles,
  cinq largeurs ✓, axe 0 écart.
- **Pour l'onglet de la barre** (fichier partagé de la coquille, chez C1) : un
  compteur sur l'onglet VARELO se lit par `rpc('grp_ce_matin', {p_client})` —
  nombre de lignes de gravité attention ou critique dans les trois listes.
  Je n'ai pas touché la coquille.

### Carnet de l'audit des promesses (coordinateur, 06/10, 15 h 58 Z)

Ordre décidé (omega/AUDIT-PROMESSES.md § 2 Varelo) : 1. « le groupe sur une
page » ; 2. les reportings dus ; 3. un modèle `modeles_jeux` Varelo pour le
lecteur d'exports d'A1 ; 4. les réserves à émettre, avec A1. « Une seule IA » :
reformulé par C5.

### 1. Le groupe sur une page (b1_08)

- **Source** : la balance générale de chaque société (tous les logiciels la
  sortent). Plan comptable (ANC 2014-03) : ventes = − Σ 70, résultat = − Σ
  classes 6 et 7, trésorerie = Σ 51 et 53 (519 compris). Chiffres sociaux, non
  consolidés (dit à l'écran).
- **Migration** `omega/modules/varelo/migrations/b1_08_groupe_page.sql` :
  `grp_balances_depots` / `grp_balances_lignes` (une balance à un arrêté, avec
  le début de l'exercice ; la courante = la dernière ; déséquilibre dit, pas
  refusé ; `depose_le` = clock_timestamp), `grp_objectifs` (objectif de ventes
  de l'exercice, plancher de trésorerie) ; vue `grp_groupe_page` (ventes,
  résultat, trésorerie ; N-1 à la même date si déposée ; objectif au prorata
  des jours ; sous plancher ; ancienneté) ; portes `grp_deposer_balance`
  (gérant, admin) et `grp_regler_objectif` (gérant, admin, valideur DF) ;
  alerte `varelo:tresorerie.<entité>` levée/fermée d'elle-même ; journal
  `varelo.balance.depot | objectif.regle | tresorerie.plancher`. Le point du
  matin gagne « Le groupe ce matin » (trésorerie sous plancher, ventes à plus
  de 10 % sous l'objectif à date, balance de plus de 35 jours ; au gérant, à la
  DF, à la présidence) : `grp_ce_matin` et `grp_deposer_points` remplacés
  (create or replace), le reste de b1_07 inchangé.
- **Tests** `omega/tests/varelo/b1_11_groupe_page.sql` (motif `^test_b1_11_`) :
  `_page` (16), `_droits` (12). Maquette : 28/28 ; 171 assertions de b1_07 à
  b1_11.
- **Écran** `GroupePage.tsx` + `groupe.ts` : carte « Le groupe sur une page »
  sous « Ce matin » (totaux, tableau par société : ventes à date, sur l'an
  dernier, sur l'objectif, résultat, trésorerie et plancher, ancienneté ;
  dialogues Objectifs et Déposer une balance générale — en-têtes Sage « N°
  compte », « Solde débit/crédit » reconnus). « Ce matin » passe à quatre blocs.
  Recette 133 contrôles, cinq largeurs ✓ ; axe 0 écart.

### 2. Les reportings dus (b1_09)

- **Promesse** : « Les reportings attendus par chaque marque, rangés par
  échéance ». Une obligation = une société doit, à un destinataire (marque,
  banque, réseau ; objet du référentiel s'il y est), tel reporting, à telle
  périodicité (hebdomadaire, mensuelle, trimestrielle, annuelle — périodes
  calendaires), tant de jours après la fin de la période, par tel canal, sous
  la responsabilité de quelqu'un.
- **Migration** `omega/modules/varelo/migrations/b1_09_reportings.sql` :
  `grp_reportings` (actif → arrêté, rien ne s'efface), `grp_reportings_echeances`
  (une par période, créée d'avance jusqu'à 45 jours par
  `private.grp_generer_echeances` ; à faire → envoyé | dispensé motivé ; un
  délai corrigé recale les échéances à faire), vue `grp_reportings_dus` (état
  en_retard / aujourdhui / semaine / a_venir / envoye / envoye_en_retard /
  dispense) ; portes `grp_enregistrer_reporting` (toute personne de la société
  sauf lecteur), `grp_marquer_reporting` (le responsable, ou gérant/admin/
  valideur de la société), `grp_arreter_reporting` (gérant, admin) ; alerte par
  échéance en retard adressée au responsable (`varelo:reporting.<échéance>`),
  fermée à l'envoi ; journal `varelo.reporting.*` ; cron **`varelo-reportings`**
  (`23 4 * * *`). Point du matin : « Reportings dus » au gérant, à la DF et à la
  direction des opérations, « Mes reportings dus » au responsable nommé
  (`grp_ce_matin`, `grp_deposer_points` remplacés).
- **Tests** `omega/tests/varelo/b1_12_reportings.sql` (motif `^test_b1_12_`) :
  `_echeances` (24), `_droits` (11) ; le nombre d'échéances attendu se calcule
  dans le test. Maquette : 35/35 ; 206 assertions de b1_07 à b1_12.
- **Écran** `Reportings.tsx` + `reportings.ts` : carte « Reportings dus » (en
  retard, 7 jours, obligations ; filtres À faire / Envoyés ou dispensés / Tous ;
  dialogues Ajouter un reporting et Noter l'envoi ; Ne plus suivre). « Ce
  matin » passe à cinq blocs. Recette 144 contrôles, cinq largeurs ✓ ; axe 0
  écart.
- Limite : le responsable se désigne « moi » à l'écran (la liste des comptes
  n'est pas lisible par un membre) ; la porte accepte tout compte de
  l'organisation.

### 3. Les exports lus d'eux-mêmes (b1_10)

- **La chaîne du socle** (lue dans SOCLE-EXTRAITS-COMMUN et NOTES-A1) : un
  export arrive (`recevoir_releve`, courriel ou passerelle) → le lecteur
  d'exports d'A1 le lit d'après les jeux du branchement (`branchements_jeux`,
  copiés de `modeles_jeux` par `brancher`) et dépose ses lignes
  (`instantanes_lignes`, valeurs en texte par clé de colonne) → le socle publie
  `releve.pret.<module>` → l'abonné applique, puis `acquitter_instantane`.
- **Migration** `omega/modules/varelo/migrations/b1_10_releves.sql` : 30
  `modeles_jeux` (module varelo × sage100, ebp, cegid, quadra, pennylane,
  tableur × fournisseurs, clients, balance_agee_clients,
  balance_agee_fournisseurs, balance_generale ; montants en `texte`, lus par
  `grp_montant` ; IBAN `sensible` ; reconnaissance par nom de fichier puis par
  en-têtes signature) ; abonnement `releve.pret.varelo → varelo.appliquer_releve`
  ; `private.grp_appliquer_jeu` (verse un jeu dans grp_deposer_codes /
  grp_deposer_encours / grp_deposer_balance ; arrêté = jour de réception, heure
  de la société) ; `private.grp_appliquer_releve` (instantanés « a_appliquer »,
  tiers d'abord ; jeu inconnu ou société non inscrite → « douteux » motivé ;
  journal `varelo.releve.applique`) ; `private.grp_traiter_travaux` et cron
  **`varelo-releves`** (chaque minute, comme tiroma-releves).
- **À faire par A1 / le coordinateur** : les en-têtes des modèles sont des
  hypothèses (exports usuels) ; à confirmer par l'essai à blanc d'A1 (`deno task
  essai`) sur un vrai fichier de chaque logiciel. Les deux balances âgées ont la
  même signature d'en-têtes : sous un nom de fichier neutre, elles partent « à
  classer » (le nom les départage : `balance_agee_clients_…`, `bac_…`).
- **Tests** `omega/tests/varelo/b1_13_releves.sql` (motif `^test_b1_13_`) :
  `_modeles` (13 : les 30 modèles passent les contrôles du socle, abonnement,
  `public.brancher` déclare les cinq jeux, un collaborateur ne branche pas),
  `_application` (6). Maquette : 19/19 ; 225 assertions de b1_07 à b1_13. La
  chaîne complète se joue par l'essai réel (un `recevoir_releve` sur un
  branchement Varelo de la recette).
- **Écran** `Branchements.tsx` : carte « Exports automatiques » (chaque
  société, son logiciel branché, ses jeux et leur dernier export ; « Brancher »
  par la porte du socle `public.brancher`, voie `exports`, cinq jeux cochés).
  Recette 149 contrôles, cinq largeurs ✓ ; axe 0 écart.

### 4. Les réserves à émettre — scénario (écrit avant le code) et besoin pour A1

**Promesse** : « Une livraison reçue avec avarie : le transport, les colis et
les photos du constat » ; « Le compte à rebours de la réserve : trois jours pour
l'adresser au transporteur ».

**Le droit** (sources) :
- transport routier national : la réception éteint toute action contre le
  voiturier pour avarie ou perte partielle si, dans les **trois jours, non
  compris les jours fériés**, qui suivent la réception, le destinataire n'a pas
  notifié par acte extrajudiciaire ou **lettre recommandée** sa **protestation
  motivée** (C. com., art. L133-3 ; [Légifrance](https://www.legifrance.gouv.fr/codes/id/LEGIARTI000020899366/2009-07-25/),
  [CMS](https://cms.law/en/fra/publication/avarie-ou-perte-partielle)) ;
- routier international (CMR, art. 30) : réserves écrites dans les **7 jours,
  dimanches et jours fériés non compris**, pour les dommages non apparents
  ([Swim Legal](https://www.swim.legal/blog/responsabilite-transport-international-cmr-indemnisation)) ;
- maritime (règles de La Haye-Visby) : **3 jours** après la livraison pour les
  dommages non apparents ([Swim Legal](https://www.swim.legal/blog/contentieux-transport-responsabilites-reserves-recours)) —
  le cas courant des groupes des Antilles, qui importent par conteneur ;
- aérien (convention de Montréal, art. 31) : **14 jours** pour une avarie.
Les délais se calculent par le moteur du socle (`regles_delais`,
`public.echeance_de`) : jours ouvrables, fériés **du territoire de la société**
(Guadeloupe, Martinique… ont leurs fériés propres).

**Le scénario** : 1. le magasin reçoit une livraison avec avarie ou manquant ;
il la saisit dans /espace/varelo (ou, plus tard, la pièce — bon de livraison,
lettre de voiture, photos — est lue par A1) : société, date de réception, mode
de transport, transporteur, n° de lettre de voiture ou de connaissement,
fournisseur (référentiel), colis attendus/reçus, avarie/manquant, description,
réserves écrites ou non sur le bon. 2. Varelo calcule la date limite de la
protestation et la montre en compte à rebours ; alerte (critique à J-1) et
point du matin « Réserves à émettre » au gérant et à la direction des
opérations. 3. Varelo prépare la **lettre de protestation motivée** (date,
document de transport, constat, montant estimé) à envoyer en recommandé.
4. On note l'envoi (date, moyen : LRAR, acte, LRE) ; hors délai dit. 5. Une
livraison sans suite se classe, motivée. Journal à chaque étape.

**Ce qu'il faudra à A1** (lecture des pièces, après ce lot) : un type de pièce
`bon_livraison` du module varelo, champs `transporteur`, `document_transport`
(n° de lettre de voiture, CMR ou connaissement), `date_livraison`,
`colis_annonces`, `colis_recus`, `reserves_ecrites` (texte porté sur le bon,
« sous réserve de déballage » ne vaut pas réserve), `expediteur`
(nom, SIREN si présent), `mode` (routier, maritime, aérien) ; à l'arrivée de la
lecture (`piece_lue.varelo`), Varelo pré-remplit la réception par
`grp_enregistrer_reception` (la porte de ce lot). Je n'écris rien chez A1.

### 4 codé — b1_11, tests b1_14, carte « Réserves à émettre »

- Migration `omega/modules/varelo/migrations/b1_11_reserves.sql` : les
  quatre règles dans `regles_delais` (`varelo.reserves.routier` 3 jours
  ouvrables, L133-3 ; `.cmr` 7 ouvrables, CMR art. 30 ; `.maritime` 3
  calendaires, La Haye-Visby ; `.aerien` 14, Montréal art. 31), la table
  `grp_receptions` (échéance par `public.echeance_de`, fériés du
  territoire de la société), la vue `grp_reserves` (état dépassé /
  aujourd'hui / demain / à venir / protestée / hors délai / sans suite),
  le contrôle horaire `varelo-reserves` (alerte attention, critique à
  J-1), les portes `grp_enregistrer_reception`, `grp_lettre_reserve`,
  `grp_noter_protestation` (avertit si courriel ou portail en routier),
  `grp_classer_reception` (motif obligatoire, gérant / DO / DJ), la ligne
  « Réserves à émettre » du point du matin (gérant, DO, DJ ; pas DF).
  Remplace `grp_ce_matin` et `grp_deposer_points` : repasser aussi
  `^test_b1_10_`, `^test_b1_11_`, `^test_b1_12_`.
- Tests `omega/tests/varelo/b1_14_reserves.sql` : 33 assertions, vertes
  sur la maquette locale (258 au total, 07 à 14).
- Écran : `Reserves.tsx` / `reserves.ts` (après « Reportings dus ») ;
  bloc « Réserves à émettre » dans « Ce matin » (six blocs) ; recette
  164 ✓ aux cinq largeurs, axe 0 écart sur les trois dialogues.
- Pour A1 : le type de pièce `bon_livraison` (transporteur,
  document_transport, date_livraison, colis_annonces, colis_recus,
  reserves_ecrites, expediteur, mode) et, à la lecture, l'appel de
  `private.grp_enregistrer_reception` — rien n'est branché tant que A1
  n'a pas posé le type.

### 4 bis. Les photos du constat (b1_12, tests b1_15) — ce qui restait sur la page

La page groupes (`components/secteurs/groupes/textes.ts`, survol-reserves)
promet « le transport, les colis et les photos du constat » ; b1_11 n'avait
pas les photos. b1_12 : colonne `grp_receptions.photos` (20 au plus), vue
`grp_reserves` qui la rend (en dernière colonne), porte
`grp_joindre_photo(reception, chemin, nom)` — le fichier est d'abord déposé
dans `omega-clients/<client>/grp_receptions/<livraison>/…` (politique Storage
INSERT 19o du socle), la porte vérifie le chemin, l'objet dans
`storage.objects` et son type (image), l'inscrit et journalise
`varelo.reception.photo_jointe` ; la lettre dit « N photographies du constat
sont jointes à la présente ». Écran : champ photos à l'enregistrement,
bouton « Photos (n) » par livraison, dialogue avec vignettes (adresses
signées 10 min) et ajout. Tests b1_15 : 11 assertions (maquette : 269 ok au
total, storage.objects simulé). Recette 171 ✓, axe 0 écart sur le dialogue.
Avec cela, la ligne « Les réserves à émettre » de `lib/en-preparation.ts`
peut tomber (fichier partagé : retrait par le coordinateur à la pose).

### Une pièce, une livraison (b1_13, tests b1_16) — demande d'A1, 17 h 10 Z

Le lecteur v27 d'A1 (6f57d5e) lit le bon de livraison déposé sur
`grp_societes/<entité>` et appelle `private.grp_enregistrer_reception` avec
`piece_id`. b1_13 : index unique `grp_receptions_piece_key (client_id,
piece_id)` ; la porte refuse une pièce d'une autre organisation (22023), et
une pièce déjà enregistrée rend la livraison existante (`deja` = true), sans
écrire ni journaliser ; une course de deux lectures bute sur l'index et rend
la même livraison. Tests b1_16 : 9 assertions (maquette : 278 ok au total).
