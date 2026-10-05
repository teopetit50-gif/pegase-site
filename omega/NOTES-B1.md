# Session B1 — VARELO, le référentiel du groupe (sociétés, pôles, rapprochement)

Branche `worker-b1`. Dernière mise à jour : 05/10/2026, soir (lecture du socle,
scénario écrit, rien de posé ni de joué encore). Le coordinateur lit ce fichier.

## Les deux jauges

| Jauge | Où on en est | Ce qui manque pour 100 % |
|---|---|---|
| **Mécanique** (le socle fait ce qu'il dit, prouvé par pgTAP sur la recette) | **0 %** | les 6 lots de tests ci-dessous joués verts sur la recette ; les trous relevés (§ Trous) bouchés par migration et prouvés |
| **Livrable client** (un gérant du banc fait le parcours complet dans /espace/varelo, en base réelle) | **0 %** | l'écran écrit, tsc/eslint/build verts, recette aux cinq largeurs, relecture réelle avec gerant/referent/daf du banc, et la fusion sur main (déploiement omegaai.fr) |

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
| `b1_01_installation.sql` | 1, 2, 3, 4 | à écrire |
| `b1_02_depot_codes.sql` | 5, 6 | à écrire |
| `b1_03_rapprochement.sql` | 7, 8, 14 | à écrire |
| `b1_04_decisions.sql` | 9, 10, 12, 13 | à écrire |
| `b1_05_corrections.sql` | 11 | à écrire |
| `b1_06_garde_fous.sql` | 15, 16, 17 | à écrire |

## 3. Trous du socle relevés à la lecture (à confirmer sur la recette)

| # | Trou | Migration |
|---|---|---|
| T1 | `public.grp_installer`, `grp_deposer_codes`, `grp_rapprocher`, `grp_appliquer_decisions` passent à des fonctions `SECURITY DEFINER` **sans contrôle de rôle** quand `auth.uid()` est posé (seule `grp_demander_rapprochement` et `grp_exporter_referentiel` vérifient). Si `authenticated` a EXECUTE dessus (défaut PUBLIC sur `public`), un membre d'une autre organisation installe, dépose des codes ou lance un passage **chez le banc**. | `b1_01_portes_roles.sql` : gérant/admin pour installer et déposer ; gérant/admin/valideur pour rapprocher et appliquer ; membre du client exigé partout |
| T2 | `grp_ajouter_societe` n'est pas `SECURITY DEFINER` : elle écrit `entites` et `grp_societes` sous la RLS de l'appelant. Si la politique INSERT d'`entites` n'ouvre pas au gérant, la porte échoue pour tout le monde. À vérifier en réel. | selon la réponse |
| T3 | Aucune porte de **lecture du lot** pour l'écran (paires d'une demande avec les deux codes, leurs sociétés, la preuve) : l'écran peut joindre `grp_ref_propositions` × `grp_ref_codes` × `entites` sous RLS, mais `grp_ref_codes` n'est lisible que dans le périmètre de la personne : le référent au périmètre total voit tout, c'est ce qu'on veut. Pas de migration si la vue suffit. | — |
| T4 | Aucune table `grp_*` n'est dans la publication Realtime (`socle_lot19h` n'en cite aucune) : l'écran se relira à la main. À demander si on veut le direct comme A3. | demande au coordinateur |

## 4. Questions de faits au coordinateur (envoyées le 05/10 au soir)

Voir le message. Réponses à recopier ici.

## 5. Écran /espace/varelo

À écrire après le premier lot de tests vert. Dicté par le scénario :
sociétés et pôles (étapes 1-4), dépôt d'un export et passage (5-7), le
référentiel du groupe par objet avec ses codes par société (10, 14),
corrections proposées (11), lots à valider avec « écarter cette paire » (8-9)
et renvoi vers /espace/validations pour approuver, export CSV (15), journal
(17). Données d'exemple marquées (le monde Atelier Bertin d'A3 devient un
petit groupe fictif), interrupteur base réelle, portes RPC, jamais d'UPDATE
là où une porte existe.
