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

**Posée par le coordinateur** : 20261004220932 `socle_lot17_portes_ouvrier`
(recette ; à pousser en prod quand validée).

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
