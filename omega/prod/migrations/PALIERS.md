# Paliers de pose P1 à P6 (assemblé, non posé)

A5, 22/10/2026. Source : `omega/prod/sortie/page-1.json` (export du coordinateur, branche export-prod, commit 968d3020),
assemblé par `node omega/prod/assembler.mjs --cloture`. Ordre et numéros de version : ceux de la recette. Contrôles
du § 4.2 de MISE-EN-PRODUCTION.md après chaque palier. Exclusions (§ 1.4 et données de recette) : voir MANIFESTE.md.

| Palier | Contenu | Fichiers | Première version | Dernière version |
|---|---|---|---|---|
| P1 | étape A : bases des modules (avant le 4/10) | 9 | `20260928214838_daliro_m0a_referentiel.sql` | `20260929034413_tiroma_releve.sql` |
| P2 | étape B jusqu'à socle_lot19h (20261005182000) | 23 | `20261004220932_socle_lot17_portes_ouvrier.sql` | `20261005182000_socle_lot19h_realtime_espace.sql` |
| P3 | jusqu'à socle_lot19z (20261005215301) | 33 | `20261005185500_a5_01_private_execute.sql` | `20261005215301_socle_lot19z_private_anon_zero.sql` |
| P4 | jusqu'à tiroma_b3_06_v2 (20261006003701) | 27 | `20261005234001_identite_b7_01_v3.sql` | `20261006003701_tiroma_b3_06_v2.sql` |
| P5 | fin de l'étape B (aujourd'hui jusqu'au 21/10 ; le dossier disait daliro_b6_11_vues_invoker, 20261006142703, au 6/10) | 303 | `20261006010711_socle_lot19ab_sante_envois.sql` | `20261021231945_19ay_vert_c4_30_date_de_paris.sql` |
| P6 | étape C : clôture (a5_01 en dernier, environnement = production) | 2 | `20261021231946_a5_01_cloture.sql` | `20261021231947_environnement_production.sql` |

Total : 397 fichiers.
