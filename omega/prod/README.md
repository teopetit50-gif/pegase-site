# omega/prod — étape 1 du dossier `omega/MISE-EN-PRODUCTION.md` : l'export

Rien ici ne touche une base. Deux outils, en deux temps.

1. **`exporter.sql`** est joué par le coordinateur sur la **recette**, en lecture
   seule. Il se fait en deux passes.
   - **Page 0** (`avec_texte = false`, bornes larges) : une ligne par version à
     considérer. Chaque ligne donne la version, le nom, la décision (`emporter`, ou
     `exclure: …` selon le § 1.4), la source (`depot` ou `sql`), la provenance des
     poses « depuis le dépôt » et la taille.
   - **Pages suivantes** (`avec_texte = true`) : le texte SQL des lignes `sql` à
     emporter. Les bornes de versions découpent l'export pour rester sous 64 Ko
     par message. Un texte plus long que `taille_tranche` (40 000 caractères :
     `tiroma_releve`, `varelo_referentiel`, les bases Daliro…) sort en tranches
     (`partie` sur `parties`). Il faut alors une version par page et une tranche
     par page (`partie_de = partie_a`). L'assembleur recolle les tranches, et
     refuse un texte dont il manque une tranche. Essayé sur 116 492 caractères :
     texte recollé identique.

   La sortie brute (tableau JSON) va dans `omega/prod/sortie/page-<n>.json`.
2. **`assembler.mjs`** est lancé par A5 sur `worker-a5` :
   `node omega/prod/assembler.mjs --cloture omega/prod/sortie/page-*.json`. Il
   écrit un fichier par version dans `omega/prod/migrations/<version>_<nom>.sql`,
   plus `MANIFESTE.md`.
   - **Ligne `depot`** : le fichier est lu par `git show <sha>:<chemin>`, au SHA de
     la provenance (plusieurs fichiers possibles, dans l'ordre).
   - **Ligne `sql`** : le texte vient de `statements`.
   - **Transformations**, notées en tête de chaque fichier :
     - URL de la recette réécrite en production (les crons de 19b, 19v et 19aa) ;
     - `create extension pgtap` retiré.
   - **Refus**, sans `--forcer` : donnée ou compte du banc, clé publique de la
     recette, outillage de pose ou de test.
   - **`--cloture`** : ajoute a5_01 en dernier (étape C).

Essayé en local le 6/10 sur une `schema_migrations` factice reprenant tous les cas
(exclusions, provenance simple et double, URL, pgtap, uuid du banc refusé).

## Lots « à reconstruire » : la note de pose, sans le SQL

La page 0 du 6/10 l'a montré : pour les lots du socle 17, 18a–d, 19a–19j, 19l–19q,
19s–19v, 19x, 19y et 19aa (sauf 19k, 19r, 19w, 19z et quelques autres),
`statements` ne garde que la note du coordinateur, de 34 à 300 octets. Le SQL
lui-même n'existe dans aucun fichier. `assembler.mjs` les marque « À RECONSTRUIRE »
(code de sortie 3) et n'invente rien.

Méthode proposée, dans l'ordre de préférence :

1. **Retrouver le SQL exact là où il a été tapé.** Chaque lot a été posé par
   `execute_sql` depuis une session coordinateur : la Fable
   `session_01B4JNQXyT69GytdvE9SjAnE` jusqu'au 6/10 à 03 h 30, puis
   `session_01BCGFdpRKBvXKjouC75sYBg`. Le paramètre `query` de chaque appel est dans
   le fil de la session (`list_events` / `get_event`, en lecture). Pour chaque
   version « à reconstruire », il faut retrouver l'appel qui l'a posée (même
   horodatage, et l'`insert into supabase_migrations.schema_migrations` du même
   lot). Le SQL tel quel va dans `omega/prod/recupere/<version>_<nom>.sql`, et
   l'assembleur le prend comme source « sql ». C'est la seule méthode qui
   reproduit l'histoire à l'identique.
2. **À défaut, reconstruire l'état, pas l'histoire.** Les lots qui ne changent que
   des réglages transverses se régénèrent depuis le catalogue de la recette, en
   formes idempotentes. Une migration d'« état cible » se pose en fin de séquence,
   juste avant la clôture a5_01 :
   - **droits** (19d, e, f, j, l, s, t, u) : GRANT/REVOKE tirés d'`aclexplode` sur
     `public` (tables, vues, fonctions), puis a5_01 pour `private` ;
   - **Realtime** (19h, n, x, y) : `pg_publication_tables` de
     `supabase_realtime`, en `alter publication … add table` gardé par un `DO` ;
   - **Storage** (part de 19b, 19m, 19o) : `pg_policies` de `storage.objects`, en
     `create policy` gardé ;
   - **crons** (19b, 19v, 19aa) : `cron.job`, URL réécrite ;
   - **données de référence** (19b `plafond_ia_jour_client`, 19g plages
     SMS/WhatsApp) : les lignes de `private.reglages` et `private.canaux_envoi`.

   Les lots qui créent des **objets** (17 : `prendre_travaux`, `battre_ouvrier` ;
   18a–d : `receptions`, `resoudre_boite`, `deposer_reception`, `noter_remise` ;
   19a : colonnes `exige_*`, `approbations.piece_id`, `annuaire` ; 19b : portes du
   lecteur ; 19c : `preparer_approbation` ; 19p : vue `tamila_registre`) sont
   régénérés à la version du lot 17. Le contenu est pris à leur état final
   (`pg_get_functiondef`, colonnes et contraintes du catalogue), avec
   `set check_function_bodies = off`. Les lots par repère qui passent après
   (19ab, 19af) savent déjà ne rien faire sur un corps déjà corrigé ; 19ab devra
   recevoir la même garde que 19af.
3. **Preuve, quelle que soit la méthode : l'empreinte du catalogue.** Une requête
   en lecture seule rend, pour chaque objet de `public`, `private`, des politiques
   de `storage`, de la publication, de `cron.job` et des droits, son type, son
   nom et le md5 de sa définition. Elle se joue sur la recette, puis sur la
   répétition une fois toute la séquence posée. Les deux listes doivent être
   identiques, hors données. C'est la seule vérification qui dit que la
   production sera la recette.

## Preuve : `empreinte.sql`

Requête en lecture seule, jouée à l'identique sur la recette, sur la répétition,
puis sur la production.
- **Mode `resume`** (par défaut) : une ligne par catégorie (fonction, table,
  contrainte, index, déclencheur, vue, politique, publication, cron, droit,
  droit par défaut, enum, extension), avec le nombre d'objets et le md5 de
  l'ensemble.
- **Mode `detail`** (une catégorie, un préfixe de nom) : localise un écart.

Les oid, les propriétaires et la référence de projet ne comptent pas. Sont
exclus : les schémas `tests` et `scories`, et l'outillage propre à la recette.
Essayé sur la maquette : un cron dont l'URL passe de la recette à la production
garde la même empreinte.

## Recherche des neuf bases de modules dans le dépôt (6/10)

`daliro_m0a/b/c`, `varelo_referentiel`, `_index` et `_perf`, `tamila_m10`,
`tamila_m10b` et `tiroma_releve` n'ont **aucun fichier** dans le dépôt : ni sur une
branche, ni dans l'historique (`git log --all`). Elles ne sont citées que dans les
notes et les extraits. Leur texte vient donc de la recette (pages 1 à 17 de
`exporter.sql`).

## Méthode (a) faite : `recupere/` (6/10, lecture autorisée par le coordinateur)

Le fil de la session coordinateur Fable (`session_01B4JNQXyT69GytdvE9SjAnE`) a été
lu en lecture seule, avec `list_events` uniquement, du 4/10 21:30 Z au 6/10
01:11 Z. On y trouve 441 appels : 437 `execute_sql` et 4 `apply_migration`, dont
69 en erreur.

**Les 40 lots cherchés sont tous retrouvés**, chacun par un appel réussi :
- socle 17, 18a–d, 19a–19h, 19j–19p, 19r–19z, 19aa ;
- FILED 4a–4g, 5a, 6a et `filed_lot4f_decider_sans_separation` ;
- a5_01 v1 avec les compléments du coordinateur.

Trois cas particuliers :
- **19h** tient en deux requêtes, réunies dans l'ordre (49490ae3, puis c087a3fc à
  18:07 Z) ;
- **19o** a été posé par la même requête que 19n (adc510cc) ;
- les **essais en erreur** sont notés en tête de chaque fichier (18a, 19p, 19z).

Chaque fichier `recupere/<version>_<nom>.sql` porte en tête l'`event_uuid`, l'outil
et l'heure, puis la requête **brute**, telle que posée.

`assembler.mjs` prend `recupere/` en priorité sur la note de pose. Il découpe la
requête en instructions (chaînes, dollar-quotes et commentaires respectés ;
recollage vérifié identique sur les 41 fichiers) et retire, en le notant :
- la ligne de `schema_migrations` ;
- les appels et grants `depot_*` (19y, 19z) ;
- la ligne `boite_formulaire` du client du banc (18d) ;
- la confirmation des comptes `@banc-varelo.test` (19j).

Il réécrit ensuite l'URL de la recette et retire pgtap. Aucun résidu ne reste hors
des commentaires.

Vérifié aussi : `tiroma_b3_01`, posé en SQL direct (b7edd7cb), est identique au
fichier `da2fc7a` que retient la note, à la ligne de migration près.

**Pas de méthode (b) nécessaire** pour les lots du 4 au 6/10. Restent à exporter
de la recette :
- les neuf bases de modules (pages 1 à 17), qui n'existent que là ;
- les lignes SQL posées après 01:15 Z le 6/10 (session coordinateur Opus, vague 3).
