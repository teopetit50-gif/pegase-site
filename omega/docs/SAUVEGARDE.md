# Sauvegarde de la base Omega

Session A5 (garde-fous), 5 octobre 2026. Ce document décrit la sauvegarde
nocturne de la production `omega-core-eu` (Supabase, Postgres 17), la preuve
qu'elle laisse, les objectifs de reprise et la procédure de restauration réelle.

## 1. Ce qui est en place

| Élément | Où | Rôle |
|---|---|---|
| Tâche GitHub « Sauvegarde de la base » | `.github/workflows/omega-sauvegarde.yml` | Dump, chiffrement, restauration d'essai, preuve, artefact |
| Table de preuve | `private.sauvegardes` | Une ligne par tentative : `faite_le`, `octets`, `sha256`, `restauration` (`reussie` / `echouee`), `detail` (jsonb), `execution` (lien) |
| Contrôle quotidien | `private.verifier_sauvegardes()` à 08:07 UTC | Alerte critique `sauvegarde:manquante` si aucune ligne `reussie` de moins de 26 h ; acquittée dès qu'une l'est |
| Artefacts | Onglet Actions de GitHub, 30 jours | `omega-<horodatage>.dump.gpg`, son `.sha256`, les comptages de référence et les journaux de restauration |

### Déroulé d'une nuit (02:17 UTC)

1. **Contrôle des secrets.** Si `SUPABASE_DB_URL` ou `SAUVEGARDE_PHRASE` manque,
   la tâche s'arrête en erreur avec le nom du secret manquant. Rien n'est tenté.
2. **Comptages de référence.** Nombre exact de lignes de chaque table `public`
   et `private`, écrit dans `comptages-source.tsv`.
3. **`pg_dump`** au format custom (zstd), schémas `public`, `private`, `tests`,
   `auth`, `storage`, `supabase_migrations`, sans propriétaires ni droits.
   Le dump en clair ne quitte jamais le runner et est effacé en fin de tâche.
4. **Chiffrement** symétrique `gpg` (AES-256, S2K SHA-512 itéré) avec la phrase.
   Empreinte SHA-256 de l'artefact chiffré.
5. **Restauration d'essai** depuis l'artefact chiffré (donc déchiffrement compris)
   dans un `postgres:17` de service du runner, préparé avec les rôles Supabase
   et les extensions courantes. Verdict `reussie` seulement si `pg_restore`
   strict passe sans erreur **et** si les comptages table par table sont
   identiques à la source. La chaîne du journal opposable est rejouée si
   `public.verifier_journal_client` est présente (information, pas critère).
6. **Preuve** insérée dans `private.sauvegardes` par connexion directe, y compris
   quand la restauration a échoué (`restauration = 'echouee'`) : la table garde
   la trace des tentatives. `private.verifier_sauvegardes()` est rejouée dans
   la foulée pour acquitter l'alerte sans attendre 08:07 UTC.
7. **Artefact** gardé 30 jours. La tâche est rouge si le verdict n'est pas `reussie`.

## 2. Ce que Teo doit poser (une fois)

Dans le dépôt GitHub, *Settings → Secrets and variables → Actions* :

- `SUPABASE_DB_URL` : l'URL **Session pooler** de la production
  (*Project Settings → Database → Connection string → Session pooler*, port 5432,
  utilisateur `postgres.noepmkkplxshjbmqqxft`). Pas la connexion directe
  `db.<ref>.supabase.co` : elle est IPv6 et les runners GitHub n'ont pas d'IPv6.
  Pas le Transaction pooler (6543) : `pg_dump` ne le supporte pas.
- `SAUVEGARDE_PHRASE` : une phrase longue (≥ 6 mots), générée, **conservée aussi
  hors de GitHub** (gestionnaire de mots de passe de l'entreprise). Sans elle,
  les artefacts sont définitivement illisibles. La tourner implique de garder
  l'ancienne phrase tant qu'un artefact chiffré avec elle existe (30 jours).

Puis lancer la tâche une première fois à la main (*Actions → Sauvegarde de la
base → Run workflow*) et lire le résumé : verdict, taille, empreinte, écarts.

## 3. Objectifs de reprise

| Objectif | Valeur | Pourquoi |
|---|---|---|
| **RPO** (perte de données maximale) | **24 h** en régime normal, **26 h** avant que l'alerte critique ne parte | Une sauvegarde par nuit à 02:17 UTC ; contrôle à 08:07 UTC sur 26 h |
| **RTO** (durée de remise en service) | **≤ 2 h** pour une base de la taille actuelle (quelques centaines de tables, quelques dizaines de Mo) | Déchiffrement et `pg_restore` prennent quelques minutes ; l'essentiel du temps est la création du projet cible, les clés et la bascule des applications |
| Profondeur | 30 points de restauration (un par nuit) | Rétention des artefacts GitHub |
| Preuve | Chaque nuit, une restauration complète réellement exécutée | Pas de sauvegarde « supposée bonne » |

Le journal opposable est en ajout seul : entre deux sauvegardes, les lignes
écrites ne sont perdues qu'en cas de perte totale de Supabase (qui garde ses
propres sauvegardes quotidiennes et, selon l'offre, le PITR). La tâche GitHub
est la copie **hors de Supabase**, chiffrée avec une clé que Supabase n'a pas.

Pour abaisser le RPO : passer le `cron` à deux exécutions par jour (par exemple
`17 2,14 * * *`) ; `verifier_sauvegardes` reste valide. Pour un RPO de l'ordre
de la minute, il faut le PITR Supabase ; la tâche GitHub n'y prétend pas.

## 4. Restauration réelle (procédure)

À suivre quand la production est perdue ou corrompue. Compter deux personnes :
une qui exécute, une qui relit.

1. **Geler.** Mettre les applications en lecture seule ou les arrêter ; noter
   l'heure. Ne rien écrire dans la base compromise.
2. **Choisir l'artefact.** Dans *Actions → Sauvegarde de la base*, prendre la
   dernière exécution verte (ou la dernière ligne `reussie` de
   `private.sauvegardes` si la base répond encore : `execution` pointe vers
   l'exécution). Télécharger l'artefact, vérifier l'empreinte :
   ```bash
   sha256sum -c omega-<horodatage>.dump.gpg.sha256
   ```
   Elle doit être celle de `private.sauvegardes.sha256` et du résumé de l'exécution.
3. **Déchiffrer** (la phrase est demandée au clavier) :
   ```bash
   gpg --decrypt --output omega.dump omega-<horodatage>.dump.gpg
   ```
4. **Préparer la cible.** Un nouveau projet Supabase (même région `eu-central-1`)
   ou la base d'origine remise à zéro. Sur la cible, poser les extensions que
   le socle utilise (`pgcrypto`, `uuid-ossp`, `citext`, `unaccent`, `pg_trgm`,
   `btree_gist`, `pgtap` en recette) ; les rôles Supabase existent déjà.
5. **Restaurer** avec le client Postgres 17, en deux temps pour lire les erreurs :
   ```bash
   pg_restore --dbname="$CIBLE_URL" --no-owner --no-privileges --no-comments \
              --jobs=4 --exit-on-error omega.dump
   ```
   Si une erreur apparaît, la lire avant de passer en mode tolérant (sans
   `--exit-on-error`) ; les erreurs attendues concernent uniquement des objets
   propres à Supabase déjà présents sur la cible (`auth`, `storage`).
6. **Remettre les droits.** Le dump ne porte ni propriétaires ni `GRANT`. Rejouer
   la dernière migration de droits du socle (ou, à défaut, la séquence des
   migrations `socle_lot*` depuis `supabase_migrations.schema_migrations`,
   restaurée elle aussi) pour redonner à `anon`, `authenticated` et
   `service_role` exactement ce qu'ils avaient, et rien de plus. Vérifier
   ensuite avec les tests `omega/tests/socle/` (RLS, ajout seul, droits par objet).
7. **Vérifier.** Comptages table par table contre `comptages-source.tsv` de
   l'artefact ; `select * from public.verifier_journal_client(<client>)` pour
   chaque client ; connexion d'un compte de test ; un envoi à blanc.
8. **Basculer.** Nouvelles clés API dans Vercel (`pegase-site2`) et les
   ouvriers, DNS si besoin, lever le gel. Écrire une ligne dans le journal
   opposable interne et une alerte `info` « restauration effectuée depuis
   l'artefact X » pour la traçabilité.
9. **Relancer la sauvegarde** à la main pour prouver la nouvelle base.

Compter : 10 min pour les étapes 1 à 3, 20 à 40 min pour 4 et 5, 30 min pour
6 et 7, 15 min pour 8. D'où le RTO de 2 h.

## 5. Ce qui n'est pas couvert, et quoi faire

- **Les fichiers des buckets Storage** : `pg_dump` sauvegarde leurs métadonnées
  (`storage.objects`), pas leur contenu. Les pièces de Tamila chiffrées par
  dossier (`tamila_cles`) vivent en base, donc couvertes ; les fichiers
  déposés dans Storage ne le sont pas. Proposition : une seconde tâche qui
  copie les buckets vers un stockage objet européen chiffré (rclone + age), ou
  l'extension de celle-ci avec `supabase storage` CLI. À décider par le coordinateur.
- **Les secrets** (clés API, `vault`) : volontairement exclus du dump.
- **Les rôles et mots de passe Postgres** : non dumpés ; ils se recréent côté
  Supabase.
- **La phrase de chiffrement** : si elle est perdue, les 30 artefacts sont perdus.
  Elle doit exister à deux endroits (GitHub et le gestionnaire de l'entreprise).

## 6. Exercice de restauration

La restauration d'essai de chaque nuit est automatique mais se fait dans un
Postgres nu. Une fois par trimestre, rejouer la procédure du §4 vers un projet
Supabase jetable, chronométrer, et noter le résultat dans `private.sauvegardes`
(`detail.exercice = true`) ou dans `omega/NOTES-A5.md`. Le premier exercice est
à planifier dès que les deux secrets sont posés et qu'une nuit est passée.

## 7. Points ouverts pour le coordinateur

- Confirmer la contrainte sur `private.sauvegardes.restauration` : la tâche
  écrit `reussie` ou `echouee`. Si la contrainte attend d'autres libellés
  (`echec`, `partielle`…), adapter la ligne `verdict=` du workflow.
- Confirmer que `postgres` (utilisateur du Session pooler) peut lire `auth.*`
  et `storage.*` sur la production ; sinon retirer ces schémas du `pg_dump`
  et le dire ici.
- Donner à A5 le retour de la première exécution (résumé GitHub) pour ajuster
  la liste des extensions à poser dans le Postgres d'essai.
