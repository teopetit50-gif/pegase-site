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
     par message.

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
