# NOTES — worker A4 (FILED : comptabilité, archivage, pilotage)

Branche `worker-a4`. Périmètre : `omega/migrations/*_filed_lot4_*` à `*_filed_lot6_*`,
`omega/tests/filed/`. Recette seulement (omega-recette) ; la production est au coordinateur.

## Organisation (05/10/2026)

- Le coordinateur a repris la main sur la base : chaque appel à l'outil Supabase bloquait la
  session sur une autorisation. Les migrations et les tests sont écrits ici, commités, puis
  envoyés au coordinateur par message, qui les applique sur la recette et renvoie les erreurs.
- Les corps de fonctions et le DDL du socle ont été demandés au coordinateur (message du
  05/10, 20 points) ; en attendant, les lots qui n'en dépendent pas sont écrits.

## Fait (écrit et commité sur worker-a4, pas encore appliqué sur la recette)

- `omega/tests/0000_pgtap.sql` : installation de pgTAP (recette seulement).
- `…_filed_lot4a_comptabilite_tables.sql` : exercices, plan comptable, centres de coût,
  imputations, imputations apprises, charges récurrentes et charges attendues ; inscription
  dans `private.tables_locataires` / `tables_objets`.
- `…_filed_lot4b_comptabilite_portes.sql` : statut de facture étendu (validee, refusee,
  comptabilisee) ; `filed_factures_exercices` et l'orientation vers l'exercice suivant après
  clôture, avec sa mention ; portes `filed_ouvrir_exercice`, `filed_cloturer_exercice`,
  `filed_poser_compte`, `filed_retirer_compte`, `filed_poser_centre`, `filed_retirer_centre`,
  `filed_imputer_facture` ; apprentissage (`private.filed_apprendre_imputation`,
  `filed_imputation_apprise`) ; proposition soumise à la file (`private.filed_proposer_imputation`,
  demande `filed.imputer`) ; décision (`private.filed_decider_imputation`) ; contrôles
  `exercice.cloture` / `exercice.absent`.
- `…_filed_lot4c_charges_recurrentes.sql` : portes `filed_declarer_charge_recurrente`,
  `filed_arreter_charge_recurrente` ; génération des écritures attendues treize mois devant ;
  reconnaissance de la facture qui sert une écriture (contrôle `recurrence.reconnue`, imputation
  proposée) ; facture attendue absente → alerte `attention` (`private.lever_alerte`).
- `…_filed_lot4d_controles_identite.sql` : analyse d'un numéro de TVA de l'Union (format pour
  les 27 États + Irlande du Nord, clé calculée pour FR, BE, DE, IT, LU, NL, PT, DK, FI, SE, PL,
  AT, SI, HU), SIREN porté par la TVA française, `filed_verifications_tiers` (VIES / Sirene,
  écrites par l'ouvrier), contrôles `identite.tva_intracom`, `identite.siren`,
  `identite.coherence`, `identite.registre`.
- `…_filed_lot5a_archivage_probant.sql` : `filed_archives` (ajout seul, trigger d'immuabilité),
  `private.filed_archiver` (empreinte SHA-256 liant fichier, valeurs lues, numéro de réception,
  version ; inscrite au journal opposable), `filed_verifier_archive`, `filed_piste_audit`.
- `…_filed_lot6a_pilotage.sql` : `filed_reglements`, `filed_litiges` et leurs portes ;
  `filed_engage_mois`, `filed_echeancier`, `filed_delai_traitement`, `filed_pieces_en_cours` ;
  huit indicateurs `filed.*` et `private.filed_mesurer` ; `filed_exporter_tableau` (CSV, journal
  avec empreinte) ; exports programmés (`filed_programmer_export`, `private.filed_produire_exports`).
- Tests : `omega/tests/filed/lot4a_structure.sql`, `lot4c_periodes.sql`, `lot4d_identite.sql`,
  `lot5a_archive_structure.sql`, `lot6a_pilotage_structure.sql`.

## Bloqué

- Lot 4e (branchements dans `filed_controler_facture`, `filed_rapprocher_ligne`,
  `filed_traiter`, `filed_executer_decision`) et lot 4f (circuit de validation) : attente du
  coordinateur (corps de `filed_executer_decision`, `filed_deposer_demande`, mécanique
  d'approbation du socle, DDL de `demandes_validation` / `approbations` / `delegations`,
  repères exacts dans les corps à modifier, colonnes des tables d'exemple pour les tests).
- Aucune migration n'est encore appliquée sur la recette : le coordinateur applique.

## Demain

- Lot 4e, lot 4f, tests de bout en bout (organisation d'exemple, facture, imputation, clôture,
  charge manquante, archive, export), application sur la recette, corrections.

## Lignes de factures.ts rendues vraies

(à compléter au fur et à mesure)

## Demandes au coordinateur

(à compléter)
