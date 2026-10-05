# NOTES — session A5 (garde-fous)

Branche `worker-a5`. Mise à jour : 5 octobre 2026.

## Fait aujourd'hui

- **Sauvegarde.** `.github/workflows/omega-sauvegarde.yml` : chaque nuit à
  02:17 UTC, contrôle des deux secrets (échec explicite s'ils manquent),
  comptages de référence, `pg_dump` custom zstd des schémas `public`,
  `private`, `tests`, `auth`, `storage`, `supabase_migrations`, chiffrement
  gpg AES-256 avec `SAUVEGARDE_PHRASE`, restauration d'essai **depuis
  l'artefact chiffré** dans un `postgres:17` de service (rôles Supabase et
  extensions posés d'abord), verdict `reussie` seulement si `pg_restore`
  strict passe et si les comptages table par table sont identiques, preuve
  insérée dans `private.sauvegardes` (y compris `echouee`), rejoue
  `private.verifier_sauvegardes()`, artefact gardé 30 jours, tâche rouge si
  le verdict n'est pas `reussie`. Procédure, RPO (24 h, alerte à 26 h), RTO
  (2 h) et restauration réelle dans `omega/docs/SAUVEGARDE.md`.
- **Tests.** 50 fichiers pgTAP dans `omega/tests/socle/` + `00_installation.sql`
  (pgTAP, schéma `tests`, aides : jeu de deux clients fictifs, endosser un
  utilisateur `authenticated` par `request.jwt.claims`, insertion minimale par
  introspection). Chaque fichier est exécutable tel quel par `execute_sql` ;
  `runtests()` annule toutes les données d'essai. **50/50 verts sur la maquette
  locale** (`omega/tests/socle/local/`, cluster Postgres 16 jetable). Pas
  encore lancés sur la recette (voir « Bloqué »).
- **Banc.** `omega/banc/` : 100 factures fournisseurs fictives générées par
  `generer-factures.mjs` (pdf-lib, déterministe, graine 2026) : 40 natives
  (4 gabarits, remises, acomptes, port, éco-participation, périodes,
  franchise, autoliquidation), 3 avoirs, 15 numérisées (bonne/moyenne/faible),
  8 multi-pages, 5 lots multi-factures, 8 Factur-X (XML CII joint, BASIC et
  EN 16931), 6 UBL 2.1, 8 tickets de caisse, 6 manuscrites, 1 illisible.
  Chaque pièce a son JSON attendu ; `verifier-banc.mjs` recalcule tous les
  totaux et toutes les clés (SIREN/SIRET Luhn, TVA, IBAN). Aucune raison
  sociale réelle, identifiants dans des plages fictives. 6,8 Mo.
- **Sécurité.** `omega/docs/SECURITE.md` : analyse et corrections par
  priorité. Point majeur : **ne pas révoquer USAGE sur `private` pour
  `authenticated`**, les politiques RLS en dépendent (résolution de
  `private.mes_clients()`) ; proposer à la place la reprise des EXECUTE dans
  `private` (grants explicites + default privileges), un rôle `sauvegarde`
  dédié, `search_path` des SECURITY DEFINER, vues `security_invoker`, index
  `client_id`.

## Réponse au coordinateur (message de 17:40 UTC, retour de TOUT_1 et TOUT_2)

Corrections poussées sur `worker-a5` (commit indiqué dans le journal git,
TOUT*.sql régénérés) :

- **`tests.jeu()`** : le rôle du compte est pris dans l'ordre : `collaborateur`
  s'il est admis (enum ou contrainte CHECK), sinon la première valeur admise,
  sinon `collaborateur`. Ton patch de la recette est donc reporté.
- **`tests.inserer_minimal()`** lit désormais les contraintes CHECK
  mono-colonne (`tests.valeur_selon_check`) : `= ANY (ARRAY[...])` → première
  valeur ; `octet_length(col) = n` → n octets nuls ; une ou plusieurs regex
  `~ '...'` → premier candidat qui les satisfait toutes parmi `essai_a5`,
  `essai`, `filed_essai`, `essai.a5`, 64 zéros, 64 « a », … ; sinon la valeur
  par type (bytea : 32 octets par défaut). Cela couvre
  `journal_opposable_hash_check`, `envois_evenements_type_check`,
  `suivis_evenements_type_check`, `effacements_empreinte_export_check`, les
  regex de `filed_historique` et les bornes de longueur.
- **Test 05** : une table locataire sans politique est admise si
  `authenticated` n'a pas SELECT dessus ; le diagnostic liste ces tables.
  **Test 43** : même exemption.
- **Test 08** : rien à changer, c'était un vrai trou ; merci pour les lots
  19d/e/f. Consigné dans SECURITE.md §1.4 avec `lorani_echeances_permis` et
  `tamila_registre` sans RLS (analyse et requête pour trancher).
- Maquette locale durcie avec les contraintes réelles que tu m'as données
  (rôles, hash 32 octets, types d'événements, regex FILED, empreinte
  d'export, table interne sans politique) : 50/50 verts, `TOUT.sql` → 44 `ok`.
- Point à surveiller sur la recette : si les tests 11/12 passent mais que le
  test 32 échoue (« empreinte fournie remplacée »), c'est que l'insertion
  directe dans `journal_opposable` ne recalcule pas l'empreinte : la base
  compte sur la porte d'écriture. Dans ce cas, dis-moi le nom de la porte
  (fonction qui écrit au journal) et je ferai passer les tests 11, 12, 30,
  32–34 par elle.

Tu peux relancer TOUT_1 et TOUT_2, puis TOUT_3 et TOUT_4.

## Réponse au coordinateur (message de 16:34 UTC) — commit `2057897`

1. **TOUT.sql est prêt** : `omega/tests/socle/TOUT.sql` (63 Ko) enchaîne
   `00_installation.sql` puis les 44 tests hors DELETE et se termine par un
   seul `select * from runtests('tests'::name, '^test_')` : une ligne `ok` /
   `not ok` par test, détails en `#`. Si c'est trop gros pour un appel :
   `TOUT_1.sql` … `TOUT_4.sql` (8 + 12 + 12 + 12 tests, 13 à 19 Ko chacun),
   dans l'ordre, chacun avec son `runtests()`. Validé sur la maquette locale :
   `1..44`, 44 `ok`. Le `create extension if not exists pgtap` du début est
   sans effet puisque pgTAP est déjà posé.
   Les premiers échecs attendus sur la recette : `tests.jeu()` si
   `public.clients` n'a pas `id`/`nom` ou si `comptes` a d'autres colonnes
   obligatoires sans défaut (le message dit laquelle), et les tests 36–38 qui
   affichent les colonnes réelles dans leur diagnostic. Colle-moi la sortie
   TAP ici, je corrige dans l'heure qui suit la lecture.
2. Test 34 gardé.
3. Alignement : noté, tu t'en charges après A4 (socle_lot18 et lot19 ajoutés
   à la liste « à pousser » ci-dessous).
4. Advisors : j'attends `NOTES-COORDINATEUR.md` sur main ; SECURITE.md reste un
   attendu jusque-là.
5. Banc : les trois compléments sont posés (pièces 101 à 103, total 103,
   `verifier-banc.mjs` vert) : facture en USD d'un fournisseur étranger
   (pas de SIREN, ABA + SWIFT, autoliquidation, `total_ttc_eur`), facture
   d'acompte pure (30 % d'un devis, `acompte_sur`), note de frais d'un
   salarié (lignes TTC, six justificatifs en page 2, numérisée).

## Reçu du coordinateur à 16:09 UTC

GitHub est rétabli (la branche était déjà poussée : trois commits, dernier
`1f2585f`). Règle pour le SQL que je confie : jamais de DROP ni de DELETE,
l'outil bloque dessus. État de mes fichiers au regard de cette règle :

- `00_installation.sql` et les tests : uniquement `create or replace`,
  `create ... if not exists`, `grant`. Aucun DROP.
- **Six tests contiennent le mot DELETE** à l'intérieur d'une chaîne passée à
  `throws_ok()` : 17, 19, 21, 23, 25, 27 (« DELETE sur une table en ajout
  seul échoue »). C'est l'objet même du test, l'instruction doit lever une
  erreur et runtests() annule tout. Je ne contourne pas le filtre : si l'outil
  les bloque, les passer par une autre voie ou les laisser de côté ; les tests
  UPDATE (16, 18, 20, 22, 24, 26) et les tests de droits (28, 29) couvrent
  déjà le reste de la règle.
- Le test 34 fait `alter table public.journal_opposable disable trigger user`
  puis un UPDATE d'une empreinte, pour vérifier que `verifier_journal_client()`
  détecte l'altération ; le tout est annulé par runtests(). À signaler si
  l'outil s'en inquiète.
- `local/maquette.sql` et `local/lancer.sh` contiennent `drop` : ils ne
  servent qu'au cluster local jetable, jamais à la recette.

## Bloqué

1. **Outil Supabase** : chaque appel (`execute_sql`, `list_extensions`,
   `get_advisors`) est refusé pour cette session (« permission request
   aborted »). Conséquences : pgTAP non installé sur la recette, tests non
   lancés sur la recette, advisors de production non lus, corps des fonctions
   non lus, statements des migrations non lus.
2. **Message au coordinateur** (`send_message @parent`) : refusé par le
   classificateur de la session. Ce fichier est donc le seul canal. Les
   requêtes que j'aurais envoyées sont à la section « Demandes au
   coordinateur ».
3. **Advisors** : §3 de SECURITE.md est un attendu, pas un relevé.

## Demain

- Dès que pgTAP est posé sur la recette : lancer `00_installation.sql` puis
  les 50 fichiers, lire les diagnostics des tests 36–38 et de `tests.jeu()`,
  adapter les listes de colonnes candidates, retourner au vert.
- Avec la sortie réelle des advisors : remplacer le §3 de SECURITE.md par le
  relevé, priorisé, avec la migration `socle_lot18_hygiene_droits` prête.
- Avec le retour de la première exécution du workflow : ajuster la liste des
  extensions du Postgres d'essai et la liste des schémas dumpés.
- Banc : ajouter une facture en devise étrangère (USD, mention « équivalent
  EUR »), une facture d'acompte pure et une note de frais, si A1 en veut.
- Sauvegarde des buckets Storage (hors `pg_dump`) : à décider (§5 de
  SAUVEGARDE.md).

## Alignement des migrations (comparaison des deux `list_migrations`)

Communes aux deux projets : 73 migrations (socle lot 1 → 16, lorani, filed,
tavaro, tiroma, tamila m0/m10/m10b). Leur **ordre** diffère légèrement entre
les deux projets (par exemple `filed_lot1b_battement_par_moteur` passe avant
`tavaro_lot0b_referentiels` en prod, après en recette) : sans incidence si
elles sont indépendantes, à garder en tête si une migration en référence une
autre.

**Recette seulement — à pousser en production** (ordre de version) :

| Version | Nom | Ce qu'elle change |
|---|---|---|
| 20260929024032 | `tamila_m10_delais_correctifs` | correctifs des délais Tamila (contenu à lire : `statements` non accessibles à A5) |
| 20260929033851 | `tamila_m10b_porte_etroite` | porte étroite Tamila (idem) |
| 20260929034413 | `tiroma_releve` | relevé Tiroma (idem) |

**Recette seulement — à garder en recette** :

| Version | Nom |
|---|---|
| 20260928214838 | `daliro_m0a_referentiel` |
| 20260928222752 | `daliro_m0b_marches` |
| 20260929023244 | `daliro_m0c_planning` |
| 20260928221251 | `varelo_referentiel` |
| 20260928223335 | `varelo_referentiel_index` |
| 20260929033045 | `varelo_referentiel_perf` |

**Posées par le coordinateur** : 20261004220932 `socle_lot17_portes_ouvrier`,
puis `socle_lot18` et `socle_lot19` (posées le 5/10 d'après son message de
16:34 ; à pousser en prod avec les trois Tamila/Tiroma quand A4 aura fini).

**Recette** : 20260927153015 `base_existante` = l'écrasement des 61 migrations
historiques de la production (v1_2 → securite_fermer_appel_direct), qui
n'existent pas une à une en recette. Normal.

Pour remplir la colonne « ce qu'elle change » :

```sql
-- recette
select version, name, array_length(statements, 1) nb, left(array_to_string(statements, E'\n'), 2000)
from supabase_migrations.schema_migrations
where name in ('tamila_m10_delais_correctifs','tamila_m10b_porte_etroite','tiroma_releve','socle_lot17_portes_ouvrier')
order by version;
```

## Demandes au coordinateur (lecture seule, sauf le point 0)

0. Recette : `create extension if not exists pgtap with schema extensions;
   create schema if not exists tests;` puis lancer `omega/tests/socle/00_installation.sql`
   et les fichiers 01 → 50 (ou `select * from runtests('tests'::name, '^test_')`
   après les avoir tous chargés). Me coller la sortie TAP ici.
1. Production, contraintes de `private.sauvegardes` : `select conname,
   pg_get_constraintdef(oid) from pg_constraint where
   conrelid='private.sauvegardes'::regclass;` — pour confirmer les libellés
   `reussie`/`echouee` que le workflow écrit.
2. Production : la sortie complète de `get_advisors security` et
   `get_advisors performance`.
3. Production, fonctions de `private` exécutables par `authenticated` (requête
   §1.1 de SECURITE.md) et liste des fonctions publiques exécutables par
   `anon` (§2.3).
4. Production, signatures réelles : `private.lit_objet`, la porte de création
   d'envoi, la porte d'approbation, et les colonnes de `public.envois`,
   `public.oppositions`, `public.approbations` (ou équivalent) — pour figer
   les tests 36–38.
5. Confirmer que `postgres` lit `auth.*` et `storage.*` (sinon je retire ces
   schémas du dump).

## Ce que Teo doit poser

Dans GitHub, dépôt `pegase-site`, *Settings → Secrets and variables → Actions* :

- `SUPABASE_DB_URL` : URL **Session pooler** de `omega-core-eu` (port 5432,
  utilisateur `postgres.noepmkkplxshjbmqqxft`), ou mieux celle du rôle
  `sauvegarde` du §1.3 de SECURITE.md une fois créé.
- `SAUVEGARDE_PHRASE` : phrase longue générée, gardée aussi dans le
  gestionnaire de mots de passe de l'entreprise.

Puis *Actions → Sauvegarde de la base → Run workflow* une première fois, et
m'envoyer le résumé.

## Décisions prises seule (à contester si besoin)

- Chiffrement `gpg` symétrique plutôt que `age` : `age -p` exige un terminal
  pour la phrase ; `gpg --passphrase-fd` est scriptable. Même sécurité
  (AES-256, dérivation itérée).
- Le dump inclut `auth` et `storage` : sans `auth.users`, une restauration
  rend des comptes orphelins. Si les droits ne le permettent pas, on retire.
- Le verdict `reussie` exige l'égalité **exacte** des comptages : une table
  qui bouge pendant le dump (journal) peut créer un écart d'une ligne et un
  verdict `echouee` une nuit sur dix. Si cela arrive, passer à une tolérance
  sur les seules tables en ajout seul, pas sur les autres.
- Le banc commet 6,8 Mo de PDF dans le dépôt : A1 en a besoin tel quel.
