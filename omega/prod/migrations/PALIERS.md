# Paliers de pose P1 à P6 (assemblé, non posé)

Export refait le 25/10/2026 à 18 h 10 Z sur la recette (`omega/prod/sortie/page-1.json`), assemblé par
`node omega/prod/assembler.mjs --cloture` le 26/10. Ordre et numéros de version : ceux de la recette ; les lots
rattrapés (posés sur la recette sans ligne `schema_migrations`) prennent l'heure UTC de leur dernier commit.
Pose : `omega/prod/poser-palier.sh Pn` (RUNBOOK-20261026.md § 4). Bornes reprises dans ce script.
Répétition verte (450 fichiers, relevé de la production compris) : tag `repetition-20261026a`.

| Palier | Contenu | Fichiers | Première version | Dernière version |
|---|---|---|---|---|
| P1 | étape A : bases des modules d'avant le 4/10 (tamila_m10b exclu : déjà en production) | 8 | `20260928214838_daliro_m0a_referentiel.sql` | `20260929034413_tiroma_releve.sql` |
| P2 | étape B jusqu'à socle_lot19h (20261005182000) | 23 | `20261004220932_socle_lot17_portes_ouvrier.sql` | `20261005182000_socle_lot19h_realtime_espace.sql` |
| P3 | jusqu'à socle_lot19z (20261005215301) | 33 | `20261005185500_a5_01_private_execute.sql` | `20261005215301_socle_lot19z_private_anon_zero.sql` |
| P4 | jusqu'à tiroma_b3_06_v2 (20261006003701) | 27 | `20261005234001_identite_b7_01_v3.sql` | `20261006003701_tiroma_b3_06_v2.sql` |
| P5 | fin de l'étape B : du 6/10 au 25/10 (lots du 22-23/10 et du 25/10, et les 21 lots rattrapés) | 353 (dont 21 rattrapés) | `20261006010711_socle_lot19ab_sante_envois.sql` | `20261025151751_c2_41_reprise_apres_refus.sql` |
| P6 | étape C : clôture (a5_01 en dernier, environnement = production) | 2 | `20261025180656_a5_01_cloture.sql` | `20261025180657_environnement_production.sql` |

Total : 446 fichiers.
