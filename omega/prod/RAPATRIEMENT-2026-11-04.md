# Rapatriement du dossier de production sur `main` (04/11/2026)

## Le constat

Le 03/11, la vérification « promesses → écrans » a trouvé des objets de base qui tournent en production sans que
leur migration soit sur `main` :
- les tables et portes FILED des lots a4_38, a4_47 et a4_52 ;
- la vue REPUT `reput_indicateurs_services` (c3_12) ;
- cinq portes Tiroma.

Le coordinateur a fait le compte le 04/11, en lecture seule sur la base de production `omega-core-eu` :
- **3 240 objets** dans les schémas `public` et `private` ;
- **974 d'entre eux** ne figuraient dans aucun fichier SQL de `main` : 815 fonctions, 145 tables et 14 vues.

## La cause

La mise en production du 26/10 a été préparée sur la branche `worker-a5`, avec `exporter.sql`, `assembler.mjs` et
`RUNBOOK-20261026.md`. Le dossier `omega/prod/` de cette branche contient les **472 migrations** assemblées et posées
en production, plus les relevés, les coquilles des fonctions Edge et les réglages de production. Il n'avait jamais été
ramené sur `main`, qui n'en avait que l'outillage (51 fichiers).

## Ce qui a été fait

- Les **548 fichiers** de `omega/prod/` présents sur `worker-a5` et absents de `main` ont été copiés tels quels,
  octet pour octet. Aucun fichier existant de `main` n'a été remplacé.
- Trois fichiers sont communs aux deux branches et diffèrent : `assembler.mjs`, `empreinte.sql` et `garde_fous.sql`.
  Ceux de `main` sont gardés, car ils sont plus récents (29/10 contre 26/10).
- Contrôle : les 974 objets manquants figurent tous dans les fichiers rapatriés. Il n'en reste aucun.
- Recherche de secrets (jetons JWT, clés de service, clés Brevo ou Resend, mots de passe en clair) : aucun. Seuls
  apparaissent des noms de variables et le garde-fou de `base/relever-base.sh`.
- `tsconfig.json` exclut maintenant `omega/prod/coquilles`. Ce sont des coquilles Deno qui importent leur code par
  URL, déjà exclues pour la même raison que `omega/functions`.

**Rien n'a été joué sur une base.** C'est un rapatriement de fichiers seulement.

## La source de vérité

- La table `supabase_migrations.schema_migrations` de la production compte **614 versions**, du 01/08 au 26/10/2026
  (dernière : `20261026194850`).
- `omega/prod/migrations/` en garde 472, c'est-à-dire les versions emportées par l'assembleur. Les exclusions et les
  lots « à reconstruire » sont expliqués dans `README.md` et `ARBITRAGE-2026-10-26.md`.
- Pour une nouvelle migration, on part de ce dossier et de l'état de la production, et non plus des seuls
  `omega/migrations` et `omega/modules/*/migrations`.
