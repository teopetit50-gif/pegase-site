# Tests du socle — pgTAP

Cinquante tests qui vérifient les garde-fous du socle Omega : isolement par
client, journal opposable en ajout seul et chaîné, verrous d'envoi, droits par
objet, preuves d'effacement, sauvegardes. Session A5.

## Où et comment les lancer

**Sur la recette uniquement** (`omega-recette`, `ygwbgpowzlbdaajlsqkn`). Jamais
en production : les tests posent des données d'exemple (deux clients fictifs,
deux comptes, quelques lignes), même si `runtests()` les annule.

1. `00_installation.sql` une fois : installe pgTAP dans `extensions`, crée le
   schéma `tests` et ses aides. Il ne touche à rien d'autre.
2. Chaque fichier `NN_*.sql` est autonome : il (re)crée sa fonction
   `tests.test_NN_*()` puis l'exécute via `runtests()`. Le résultat est du TAP
   (`ok` / `not ok`, détails en `#`). Exécutable tel quel par `execute_sql`.
3. Tout d'un coup, une fois les cinquante fonctions créées :
   ```sql
   select * from runtests('tests'::name, '^test_');
   ```

`runtests()` exécute chaque test dans une sous-transaction qu'il annule : les
clients fictifs, les comptes, les lignes de journal et d'envoi disparaissent à
la fin du test, y compris en cas d'échec. Aucune donnée d'essai ne reste.

## Fichiers groupés pour le coordinateur

- `TOUT.sql` : `00_installation.sql` suivi des 44 tests sans DELETE (17, 19,
  21, 23, 25, 27 laissés de côté : leur `throws_ok` contient le mot DELETE que
  l'outil d'exécution bloque), terminé par un seul `runtests()` qui rend une
  ligne `ok` / `not ok` par test. 63 Ko, un seul appel.
- `TOUT_1.sql` à `TOUT_4.sql` : le même contenu en quatre parts (8 + 12 + 12 +
  12 tests), chacune terminée par son `runtests()`, à lancer dans l'ordre si
  un seul appel est trop gros.
- Ils sont générés depuis les fichiers numérotés ; pour les refaire après une
  modification d'un test, relancer le script de la section « Régénérer ».
- Validés sur la maquette locale : `TOUT.sql` rend `1..44`, 44 `ok`.

## Ce que chaque test vérifie

| N° | Règle |
|---|---|
| 01 | pgTAP, schéma `tests`, fonctions et tables du socle présents |
| 02–03 | Toute table publique à `client_id` est dans `private.tables_locataires`, et réciproquement ; ordre d'effacement renseigné |
| 04–06 | RLS activée et au moins une politique sur chaque table locataire ; aucune politique « true » pour anon/authenticated |
| 07 | Aucun droit de table pour anon/authenticated dans `private` (mais USAGE conservé : requis par les politiques) |
| 08 | anon n'écrit sur aucune table locataire |
| 09–10 | `private.mes_clients()` : vide sans JWT, exactement le client du compte avec |
| 11–15 | Deux clients fictifs, rôle `authenticated` simulé par `request.jwt.claims` : A ne lit jamais une ligne de B (journal, `acces_objets`, **toutes** les tables locataires), ne peut pas écrire chez B |
| 16–27 | UPDATE puis DELETE échouent, même pour le propriétaire, sur `journal_opposable`, `envois_evenements`, `effacements`, `filed_historique`, `suivis_evenements`, `echeances_pro_journal` ; un déclencheur BEFORE existe |
| 28–29 | Ni droit ni politique UPDATE/DELETE/TRUNCATE pour anon/authenticated sur ces six tables |
| 30–34 | Chaîne SHA-256 : `hash_precedent` = empreinte précédente, empreintes de 32 octets uniques, empreinte fournie à l'insertion remplacée par le calcul, `verifier_journal_client()` valide une chaîne intacte et détecte une altération |
| 35 | `private.canaux_envoi` porte des plages horaires (heures légales) pour le non-transactionnel |
| 36 | Un envoi vers une personne en opposition est refusé |
| 37 | Un envoi de prospection un dimanche à 23 h est différé, pas parti |
| 38 | Une approbation au nom d'un autre, sans délégation, est refusée |
| 39–41 | Objet restreint : illisible sans `acces_objets`, lisible avec, jamais par un autre client ; objet non restreint lisible par tout membre |
| 42–43 | `client_id` uuid NOT NULL partout ; chaque politique repose sur `mes_clients()` ou `lit_objet()` |
| 44 | Dans `private`, authenticated n'exécute que les fonctions qu'une politique ou une fonction publique utilise ; anon aucune |
| 45–46 | SECURITY DEFINER exposés avec `search_path` fixé ; vues lisibles en `security_invoker` |
| 47 | Clés Tamila : table protégée, colonne de clé illisible par un client |
| 48 | Alertes internes Omega (client_id null) invisibles aux clients |
| 49 | `private.verifier_sauvegardes()` lève l'alerte sans preuve, l'acquitte avec une preuve `reussie` récente, refuse un verdict hors liste |
| 50 | Export et effacement outillés, preuves d'effacement immuables |

## Mécanique réelle du socle prise en compte (retours de la recette du 5 octobre)

- Le journal ne se nourrit pas par INSERT : `private.journaliser(uuid, text,
  text, text, jsonb, uuid)` calcule `hash` et `hash_precedent` sous verrou.
  `tests.journaliser()` passe par elle (tests 11, 12, 30, 32, 33, 34) ; le
  test 32 vérifie en plus qu'aucun rôle applicatif n'a INSERT sur la table.
- Les verrous d'envoi ne sont pas des déclencheurs : `private.opposer(...)`
  pose l'opposition, `private.verrous_envoi(envois, boolean, timestamptz)`
  rend les verrous que lit la tâche d'envoi. Tests 36 et 37, avec témoin.
- `comptes.role` ∈ gerant | valideur | collaborateur | admin ; les valeurs
  d'exemple respectent les contraintes CHECK mono-colonne (`tests.valeur_selon_check`).
- Une table interne peut n'avoir aucune politique si `authenticated` n'a pas
  SELECT dessus (tests 05, 43) ; un `client_id` nullable est admis si toute
  politique de lecture le conditionne (test 42) ; une table du cahier absente
  de l'environnement rend le test sans objet, en diag (tests 16–29).
- `echeances_pro_journal` n'existe pas sur la recette : les tests 26 et 27 le
  disent et passent.
- Test 44 : règle exacte des fonctions de `private` requises par
  `authenticated`, la même que la migration `omega/migrations/a5_01_private_execute.sql`.

## Tests qui s'adaptent au schéma (à relire au premier passage sur la recette)

Le dépôt des migrations n'étant pas accessible à A5, les tests 36, 37 et 38
cherchent eux-mêmes les colonnes utiles (`destinataire_adresse`/`adresse`/…,
`transactionnel`/`nature`, `approuve_par`/`par`/…) et le disent dans leur
diagnostic. S'ils échouent avec « colonne introuvable », ajouter le vrai nom à
la liste de candidates dans le fichier. Si la règle est portée par une fonction
(porte) plutôt que par un déclencheur sur la table, brancher l'appel à la place
de l'insertion. Même logique pour `tests.jeu()` dans `00_installation.sql`, qui
suppose `public.clients(id, nom)` et `public.comptes(user_id, client_id, role,
perimetre_total)` et remplit le reste par introspection.

## Maquette locale

`local/` contient une maquette du socle (les règles décrites, pas le schéma
exact) et un lanceur pour un cluster Postgres jetable :

```bash
# pgtap.sql : sql/pgtap.sql.in de https://github.com/theory/pgtap (v1.3.3), avec
#   sed -e 's,MODULE_PATHNAME,$libdir/pgtap,g' -e 's,__OS__,linux,g' -e 's,__VERSION__,1.3,g'
bash omega/tests/socle/local/lancer.sh   # charge pgTAP, la maquette, puis la migration a5_01, puis les 50 tests
```

### Régénérer TOUT.sql

```bash
cd omega/tests/socle && python3 - <<'PY'
import re, glob
exclus = {'17','19','21','23','25','27'}
fichiers = sorted(f for f in glob.glob('[0-9][0-9]_*.sql') if f[:2] not in exclus and f[:2] != '00')
corps = lambda f: re.sub(r"\nselect \* from runtests\('tests'::name, '\^test_\d\d_'\);\n", "\n", open(f).read())
zero = open('00_installation.sql').read()
open('TOUT.sql', 'w').write("-- TOUT.sql — installation + 44 tests (sans 17, 19, 21, 23, 25, 27).\n\n" + zero + "\n\n" + "\n\n".join(map(corps, fichiers)) + "\n\nselect * from runtests('tests'::name, '^test_');\n")
for i, p in enumerate([fichiers[:8], fichiers[8:20], fichiers[20:32], fichiers[32:]], 1):
    nums = '|'.join(f[:2] for f in p)
    open(f'TOUT_{i}.sql', 'w').write(f"-- TOUT_{i}.sql — partie {i}/4.\n\n" + (zero + "\n\n" if i == 1 else "") + "\n\n".join(map(corps, p)) + f"\n\nselect * from runtests('tests'::name, '^test_({nums})_');\n")
PY
```

État au 5 octobre 2026 : **50 tests sur 50 verts sur la maquette**. Sur la
recette, ils n'ont pas encore tourné (voir `omega/NOTES-A5.md`).
