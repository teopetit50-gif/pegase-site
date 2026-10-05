# Sécurité du socle — état, priorités, corrections proposées

Session A5 (garde-fous), 5 octobre 2026. Rien de ce document n'a été exécuté
en production. Les corrections sont proposées au coordinateur, à poser d'abord
sur la recette, vérifiées par les tests `omega/tests/socle/`, puis en production.

## 0. Ce qui manque encore

Les advisors Supabase (`get_advisors security` et `performance`) de la
production n'ont pas pu être lus par A5 : l'outil Supabase est bloqué pour
cette session et le canal vers le coordinateur aussi. La section 3 liste ce
qu'il faut en attendre et comment chaque point se corrige ; elle sera complétée
avec le résultat réel dès qu'il sera transmis (coller la sortie dans
`omega/NOTES-A5.md`, A5 trie).

## 1. Priorité haute

### 1.1 Ne PAS révoquer `USAGE` sur `private` pour `authenticated`

Proposition initiale : `revoke usage on schema private from authenticated;`.
**À ne pas exécuter.** Les politiques RLS du socle s'écrivent
`client_id in (select private.mes_clients())`. Une politique s'évalue avec les
droits du rôle qui interroge, donc `authenticated`. Pour résoudre le nom
`private.mes_clients`, Postgres exige `USAGE` sur le schéma `private` (c'est la
règle générale des schémas : sans USAGE, aucun objet du schéma n'est
accessible, même si l'objet lui-même est accordé, et `SECURITY DEFINER` ne
change rien à la résolution du nom). Révoquer USAGE ferait échouer **toute**
lecture de **toutes** les tables locataires avec « permission denied for schema
private » : panne complète côté client. Le test 07 fige ce point.

Ce que l'on veut vraiment, c'est que `authenticated` ne puisse rien faire dans
`private` **sauf** appeler les fonctions que les politiques utilisent. C'est le
cas pour les tables (aucun droit, vérifié). Pour les fonctions, Postgres accorde
EXECUTE à PUBLIC par défaut à la création : il faut le reprendre.

**Correction proposée** (recette d'abord) :

```sql
-- 1) État des lieux : fonctions de private exécutables par authenticated et leur usage connu
select p.proname, pg_get_function_identity_arguments(p.oid) args, p.prosecdef,
       exists (select 1 from pg_policies pol where coalesce(pol.qual,'')||coalesce(pol.with_check,'') ~ ('private\.'||p.proname||'\(')) as par_politique,
       exists (select 1 from pg_proc q join pg_namespace m on m.oid=q.pronamespace where m.nspname='public' and q.prosrc ~ ('private\.'||p.proname||'\(')) as par_fonction_publique
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='private' and p.prokind='f' and p.prorettype <> 'trigger'::regtype
  and has_function_privilege('authenticated', p.oid, 'execute') order by 1;

-- 2) Reprendre, puis ne rendre que l'indispensable
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.mes_clients() to authenticated;
grant execute on function private.lit_objet(uuid, text, uuid) to authenticated;   -- adapter la signature réelle
-- + chaque fonction de la colonne par_politique = true ci-dessus

-- 3) Et pour l'avenir
alter default privileges in schema private revoke execute on functions from public;
```

Vérification : tests 07, 09–15, 39–41, 44. Une fonction oubliée se voit tout de
suite : les lectures des tables concernées échouent sur la recette.

Remarque : les fonctions `SECURITY DEFINER` appelées par une fonction publique
exposée en RPC n'ont pas besoin d'être exécutables par `authenticated` si la
fonction publique est elle-même `SECURITY DEFINER` (elle appelle avec les droits
de son propriétaire). Si elle est `SECURITY INVOKER`, il faut le grant.

### 1.2 `search_path` des fonctions `SECURITY DEFINER` exposées

Une fonction `SECURITY DEFINER` sans `set search_path` peut être détournée par
un objet homonyme dans un schéma que l'appelant contrôle. Test 45. Correction :
`alter function <f> set search_path = public, pg_temp;` (ajouter `extensions`
ou `private` si la fonction les utilise). C'est aussi le premier avis
« function_search_path_mutable » que rendent les advisors.

### 1.3 Un rôle dédié pour la sauvegarde

`SUPABASE_DB_URL` donné à GitHub est aujourd'hui l'URL du rôle `postgres`.
Proposition : un rôle `sauvegarde` qui ne peut que lire et écrire sa preuve.

```sql
create role sauvegarde login password '<long>' bypassrls;      -- bypassrls : lire toutes les lignes pour le dump
grant usage on schema public, private, auth, storage, supabase_migrations to sauvegarde;
grant select on all tables in schema public, private, supabase_migrations to sauvegarde;
grant select on all sequences in schema public, private to sauvegarde;
grant insert on private.sauvegardes to sauvegarde;
grant usage, select on sequence private.sauvegardes_id_seq to sauvegarde;    -- nom réel à vérifier
grant execute on function private.verifier_sauvegardes() to sauvegarde;
alter default privileges for role postgres in schema public, private grant select on tables to sauvegarde;
```

Le mot de passe de ce rôle va dans le secret GitHub ; celui de `postgres` n'en
sort jamais. Les schémas `auth` et `storage` appartiennent aux rôles Supabase :
si le `grant select` y échoue, retirer ces schémas du `pg_dump` du workflow.

## 2. Priorité moyenne

### 2.1 Vues en `security_invoker`

Une vue lisible par `authenticated` sans `security_invoker = on` lit avec les
droits de son propriétaire (`postgres`), donc **sans RLS**. Test 46.
Correction : `alter view <v> set (security_invoker = on);` pour chaque vue
listée par le test, après avoir vérifié qu'elle n'a pas été créée exprès pour
agréger au-delà d'un client (dans ce cas, la remplacer par une fonction
`SECURITY DEFINER` avec filtre explicite).

### 2.2 Ajout seul : déclencheur **et** droits

Les six tables en ajout seul doivent être protégées par un déclencheur BEFORE
UPDATE OR DELETE (tests 16–27, même pour le propriétaire) **et** par l'absence
de droits/politiques UPDATE/DELETE pour `authenticated` (tests 28–29). Les
deux : le déclencheur protège contre une migration maladroite, les droits
contre un client. `TRUNCATE` n'est pas arrêté par un déclencheur de ligne : il
doit rester refusé par les droits.

### 2.3 Fonctions publiques exécutables par `anon`

Lister ce que `anon` peut appeler et le réduire aux portes du site
(réservation d'audit, formulaire de contact, prix) :

```sql
select p.proname, pg_get_function_identity_arguments(p.oid), p.prosecdef
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and has_function_privilege('anon', p.oid, 'execute') order by 1;
```

Tout ce qui touche au socle (journal, envois, droits, effacement, Tamila) doit
en sortir : `revoke execute on function <f> from anon;` et, comme en 1.1,
`alter default privileges in schema public revoke execute on functions from
public;` puis grants explicites.

### 2.4 Index sur `client_id`

Chaque politique filtre sur `client_id` ; une table locataire sans index dont
`client_id` est la première colonne se lit en parcours complet dès qu'elle
grossit (c'est l'avis « rls_policy_without_index »/« unindexed_foreign_keys »
des advisors performance). Liste à produire sur la production :

```sql
select tl.nom from private.tables_locataires tl
where not exists (
  select 1 from pg_index i join pg_class c on c.oid = i.indrelid join pg_attribute a on a.attrelid = c.oid and a.attnum = i.indkey[0]
  where c.oid = to_regclass('public.'||quote_ident(regexp_replace(tl.nom,'^public\.','')))
    and a.attname = 'client_id')
order by 1;
```

Correction : `create index concurrently on public.<t> (client_id);` (ou un
index composé `(client_id, <colonne de tri usuelle>)`). À faire hors
migration transactionnelle pour `concurrently`.

### 2.5 Politiques : `(select ...)` plutôt que l'appel nu

`client_id in (select private.mes_clients())` est la bonne forme : le
sous-select est évalué une fois par requête (InitPlan). La forme
`private.mes_clients() @> ...` ou `exists (select 1 from comptes where user_id =
auth.uid())` répétée par ligne coûte un appel par ligne (avis « auth_rls_initplan »).
Garder la forme avec `(select ...)` partout, y compris pour `auth.uid()` :
`(select auth.uid())`.

## 3. Attendu des advisors Supabase (à confirmer avec la sortie réelle)

| Avis probable | Gravité | Correction |
|---|---|---|
| `function_search_path_mutable` | moyenne | §1.2 |
| `security_definer_view` | haute | §2.1 |
| `rls_disabled_in_public` sur une table hors socle (site vitrine) | haute | activer la RLS et poser une politique, ou déplacer la table dans `private` |
| `rls_policy_always_true` | haute | test 06 ; réécrire la politique |
| `auth_leaked_password_protection` désactivée | basse | Dashboard → Authentication → Passwords : activer la protection HaveIBeenPwned |
| `auth_otp_long_expiry` (> 1 h) | basse | Authentication → Email : OTP ≤ 3600 s |
| `extension_in_public` | basse | déplacer l'extension dans `extensions` |
| `auth_rls_initplan` | perf | §2.5 |
| `multiple_permissive_policies` | perf | fusionner les politiques permissives d'une même commande et d'un même rôle |
| `unindexed_foreign_keys`, `unused_index` | perf | §2.4 ; supprimer les index jamais lus après un mois d'observation |

## 4. Ce qui est bien et qu'il faut garder

- `private` sans aucun droit de table pour `anon`/`authenticated` : vérifié
  (information fournie par le coordinateur, test 07).
- Isolement par `client_id in (select private.mes_clients())` : la bonne forme.
- Journal opposable chaîné SHA-256 en ajout seul : à condition que l'empreinte
  soit calculée par la base, jamais acceptée du client (test 32).
- Sauvegarde : table de preuve + contrôle quotidien + alerte critique ; le
  workflow `omega-sauvegarde.yml` la nourrit.

## 5. Ordre de passage conseillé

1. Recette : §1.1 (reprise des EXECUTE dans `private`) → tests 07, 09–15,
   39–41, 44 verts.
2. Recette : §1.2 et §2.1 → tests 45–46 verts.
3. Production : les mêmes, en une migration `socle_lot18_hygiene_droits`.
4. §1.3 rôle `sauvegarde`, secret GitHub, première exécution du workflow.
5. §2.3 et §2.4 au fil de l'eau, avec les advisors réels.
