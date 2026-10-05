# NOTES — worker A4 (FILED : comptabilité, archivage, pilotage)

Branche `worker-a4`. Périmètre : `omega/migrations/*_filed_lot4_*` à `*_filed_lot6_*`,
`omega/tests/filed/`. Recette seulement (omega-recette) ; la production est au coordinateur.

## Organisation (05/10/2026)

- Le coordinateur a repris la main sur la base : chaque appel à l'outil Supabase bloquait la
  session sur une autorisation. Les migrations et les tests sont écrits ici, commités, puis
  envoyés au coordinateur par message, qui les applique sur la recette et renvoie les erreurs.
- Les corps de fonctions et le DDL du socle ont été demandés au coordinateur (message du
  05/10, 20 points) ; en attendant, les lots qui n'en dépendent pas sont écrits.

## Fait

- `omega/tests/0000_pgtap.sql` : installation de pgTAP (recette seulement).
- `20261005154821_filed_lot4a_comptabilite_tables.sql` : exercices, plan comptable, centres de
  coût, imputations, imputations apprises, charges récurrentes et charges attendues (brouillon,
  à reconcilier avec `private.tables_locataires`).
- `20261005160000_filed_lot4d_controles_identite.sql` : analyse d'un numéro de TVA de l'Union
  (format pour les 27 États + Irlande du Nord, clé calculée pour FR, BE, DE, IT, LU, NL, PT, DK,
  FI, SE, PL, AT, SI, HU), SIREN porté par la TVA française, table des vérifications demandées
  aux registres, contrôles `identite.*` (brouillon : motif officiel et branchement dans
  `filed_controler_facture` à confirmer).

## Bloqué

- Attente des corps de fonctions du socle (voir message au coordinateur).

## Demain

- Lots 4b (portes comptables), 4c (charges récurrentes), 5 (archivage probant, piste d'audit),
  6 (pilotage, indicateurs, export CSV), tests pgTAP.

## Lignes de factures.ts rendues vraies

(à compléter au fur et à mesure)

## Demandes au coordinateur

(à compléter)
