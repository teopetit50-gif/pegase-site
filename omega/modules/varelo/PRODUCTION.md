# Varelo — passer en production (B1, 15/10/2026)

Pour A5 et le coordinateur, au gel. Complète `omega/MISE-EN-PRODUCTION.md` (§ 1.3, où seuls b1_01 à b1_03
figurent). Règle du § 1.1 : rejouer **la séquence de la recette, version pour version**. L'ordre ci-dessous est
celui des poses du coordinateur (NOTES-COORDINATEUR, 06/10 et 11/10) ; les numéros de version sont ceux de
`schema_migrations` sur la recette.

## 1. Les migrations, dans l'ordre

| # | Fichier | Posé le | Ce qu'il pose | Crons |
|---|---|---|---|---|
| 1 | `b1_04_encours_groupe.sql` | 06/10 | encours du groupe, plafonds | — |
| 2 | `b1_05_contrats_groupe.sql` | 06/10 | contrats à dénoncer | `varelo-contrats` `17 5 * * *` |
| 3 | `b1_06_reciproques.sql` | 06/10 | réciproques intragroupe | — |
| 4 | `b1_07_point_du_matin.sql` | 06/10 | point du matin Varelo | `varelo-matin` `*/30 * * * *` |
| 5 | `b1_08_groupe_page.sql` | 06/10 | le groupe sur une page | — |
| 6 | `b1_09_reportings.sql` | 06/10 | reportings dus | `varelo-reportings` `23 4 * * *` |
| 7 | `b1_10_releves.sql` | 06/10 | 30 modèles d'export, abonnement `releve.pret.varelo` | `varelo-releves` `* * * * *` |
| 8 | `b1_11_reserves.sql` | 06/10 | réserves à émettre, 4 règles de délais | `varelo-reserves` `7 * * * *` |
| 9 | `b1_11b_reserves_droits.sql` | 06/10 | droit fermé (test 44) | — |
| 10 | `b1_12_photos.sql` | 06/10 | photos du constat | — |
| 11 | `b1_13_piece_unique.sql` | 06/10 | une pièce, une livraison | — |
| 12 | `b1_14_signatures.sql` | 06/10 | signatures d'export sans recouvrement | — |
| 13 | `b1_15_decisions.sql` | 11/10 | décisions à valider, abonnement `demande.decidee.varelo` | `varelo-decisions` `41 * * * *` |
| 14 | `b1_16_regles_groupe.sql` | 11/10 | règles du groupe, équipe `dsi`, sources validées | — |
| 15 | `b1_17_caisses.sql` | 11/10 | ventes des caisses, 6 modèles `ventes_caisse` | — |
| 16 | `b1_18_contexte.sql` | 11/10 | contexte du groupe pour l'assistant | — |

Chacune est idempotente (`create … if not exists`, `create or replace`, `on conflict do nothing`) et ne supprime
rien. Deux fichiers du dépôt diffèrent du texte posé sur la recette : `b1_10` (signatures de b1_14 déjà
intégrées) et `b1_11` (droit de b1_11b déjà intégré). Rejoués dans l'ordre, b1_11b et b1_14 ne réécrivent alors
rien : l'état final est le même. Pour la règle « version pour version », prendre de préférence le texte exporté
de la recette (§ 1.5).

## 2. Ce que le socle doit avoir avant

- les lots 19 du socle posés en production (portes, `demandes_validation`, `regles_validation`, `travaux`,
  `points_sections`, `modeles_jeux`, `branchements`, `regles_delais`, `echeance_de`) ;
- la politique Storage INSERT sous `<client>/<objet_type>/…` (lot 19o) : photos du constat ;
- `pg_cron` ; le cron `omega-points-assemblage` du socle (le point du matin est remis par lui).

## 3. Contrôles après la pose (lecture seule)

```sql
-- six crons Varelo
select jobname, schedule from cron.job where jobname like 'varelo-%' order by jobname;
-- 36 modèles d'export Varelo (30 de gestion, 6 de caisse)
select code, count(*) from public.modeles_jeux where module = 'varelo' and version = 1 group by code order by code;
-- deux abonnements
select evenement, genre from private.abonnements where module = 'varelo' order by evenement;
-- aucune fonction privée Varelo ouverte à authenticated hors des requises : le test 44 du socle
```

Tests à passer sur la répétition : `^test_b1_` (b1_00_aides puis b1_01 à b1_21), puis 44, 46, 51 et 55.
Dernier relevé sur la recette : tout vert le 11/10 (h1513bbc).

## 4. Ce qu'il ne faut pas emporter

Le banc « Groupe Sogexal » et ses comptes `@banc-varelo.test`, les ventes, contrats, livraisons et décisions
écrits par les recettes : ce sont des données, jamais des migrations.

## 5. Retour arrière

Rien n'est détruit par ces lots. Pour suspendre Varelo sans rien effacer, il suffit de désactiver ses six crons
(`cron.alter_job(jobid, active => false)`). Les écrans lisent des vues vides tant qu'aucun groupe n'est installé.
