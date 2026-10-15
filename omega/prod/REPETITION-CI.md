# Répétition gratuite de la mise en production (GitHub Actions)

A5, 6 octobre 2026. C'est la voie C de `omega/prod/repetition.md`, retenue comme
répétition principale parce qu'elle ne coûte rien. La voie B (copie payante de la
production) ne sert qu'en dernier recours.

## Ce qu'elle fait

Le workflow `.github/workflows/omega-repetition-ci.yml` (« Répétition du SQL
(Postgres jetable) ») tourne dans GitHub Actions. Il ne reçoit **aucun secret** et
ne contacte ni la production ni la recette. Dans l'ordre :

1. Il démarre une base `supabase/postgres` vierge, puis coupe pg_cron et pg_net
   avant toute pose. Chaque tâche cron y naît inactive, et rien ne peut appeler une
   fonction Edge.
2. Il remet cette base **« comme la production »** avec le relevé de son schéma
   (`omega/prod/base/`, voir plus bas).
3. Il pose toute la séquence `omega/prod/migrations/`, un fichier par
   transaction. Au premier fichier en échec, il s'arrête en le nommant.
4. Il vérifie qu'aucune tâche cron n'est active et qu'aucun appel n'est parti.
5. Il joue les garde-fous de `garde_fous.sql`. Un seul contrôle rouge le fait
   échouer.
6. Il joue tous les tests pgTAP, un fichier par appel. Un seul résultat rouge le
   fait échouer. Ceux qui supposent le banc de la recette sont « sans objet ».
7. Il calcule l'empreinte du catalogue et la compare à celle de la recette au gel.
   Elles doivent être identiques.

Le résumé de l'exécution donne le tableau des tests et les écarts d'empreinte.
Toutes les sorties sont gardées 14 jours (artefact `repetition-sql-<n>`).

## Ce que Teo fait, à chaque gel

### 1. Relever le schéma de la production (lecture seule, 2 minutes)

Les 61 migrations historiques de la production ne sont pas dans le dépôt. Le
relevé les remplace par le schéma lui-même, **sans aucune donnée** :

```bash
export PROD_DB_URL='postgresql://postgres.<ref>:<mot de passe>@<pooler>:5432/postgres'   # jamais commitée
bash omega/prod/base/relever-base.sh
```

Le script ne fait que lire : `pg_dump --schema-only` de `public` et `private`, la
liste des extensions, les tâches cron (nom, planning, commande ; la clé de service
reste dans le Vault). Il s'arrête si une donnée ou un secret apparaît dans ce
qu'il écrit. Il produit `01_extensions.sql`, `02_schema.sql`, `03_crons.sql` et
`RELEVE.md` dans `omega/prod/base/`. Il faut les relire, puis les commiter.

Une session autorisée à lire la production peut le lancer à la place de Teo. Les
sessions de travail (A5 comprise) ne lisent jamais la production.

### 2. Lancer la répétition

- **Automatiquement** : pousser le tag du gel (`git tag prod-AAAA-MM-JJ && git push
  origin prod-AAAA-MM-JJ`). Le workflow part tout seul sur ce tag.
- **À la main** : sur GitHub, onglet **Actions**, puis dans la liste de gauche
  **« Répétition du SQL (Postgres jetable) »**. Cliquer le bouton **« Run
  workflow »** à droite, choisir la branche ou le tag, puis **« Run workflow »**.

  Le bouton n'apparaît que lorsque le fichier du workflow est sur la branche par
  défaut (`main`). Tant qu'il n'est que sur `worker-a5`, seul le tag le déclenche.

Vert : la séquence passe sur une base identique à la production, les garde-fous et
les tests sont verts, et le catalogue obtenu est celui de la recette. Rouge : le
message d'erreur nomme le fichier, le contrôle ou la catégorie en cause.

## Ce qu'elle ne couvre pas

Ce qu'elle laisse de côté reste à la voie B, ou au contrôle par paliers sur la
production :

- **Les données.** La séquence est rejouée sur des tables vides. Une migration qui
  échouerait sur des lignes réelles (contrainte ajoutée, colonne `not null`,
  dédoublonnage) passe ici et peut casser en production. Pas de mesure de durée ni
  de verrous sur le volume réel.
- **Auth, Storage, Realtime, fonctions Edge, secrets, Vault.** Les politiques
  Storage et les réglages Auth ne sont pas relevés, et aucune fonction n'est
  déployée ni appelée.
- **Les crons en marche.** Ils sont posés et comparés, mais jamais exécutés.
- **L'historique `schema_migrations` de la production.** `db push` n'est pas
  rejoué : chaque fichier est posé par `psql`. L'ordre et le contenu sont les
  mêmes ; ce sont les repères de version de la CLI qui ne sont pas éprouvés.
- **L'image.** `supabase/postgres:15.8.1.060` est à aligner sur la version de la
  production, que donne `RELEVE.md`. Le relevé peut citer une extension absente de
  l'image : la pose échoue alors à `01_extensions.sql`, et il faut le dire.

## Pas encore éprouvé

Le workflow n'a pas encore tourné.
- **Essayé en local**, sur Postgres 16 :
  - `relever-base.sh` sur une base locale (pas la production) ;
  - la pose du schéma relevé dans une base vierge ;
  - les garde-fous.
- **Pas essayé** : l'image `supabase/postgres` elle-même, et un vrai relevé de la
  production.
