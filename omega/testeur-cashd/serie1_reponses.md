# Série 1 — réponses brutes (recette ygwbgpowzlbdaajlsqkn, client dddddddd-0000-4000-8000-0000000000c2)

## Import J — `serie1_import.sql`, 21/10/2026 19:15 UTC
```
clients    : creees 14, lignes 14, ecartees [], modifiees 0, inchangees 0
factures   : creees 14, lignes 16, ecartees [
               {ligne 2, "numéro déjà porté par la pièce du compte A-C00 : ligne écartée, la pièce existante est gardée"},
               {ligne 4, "échéance antérieure à l'émission"} ]
reglements : creees 4, lignes 5, lettrees 3, inchangees 1, ecartees []
```

## Rejeu identique (R1) — même fichier, 19:16 UTC
```
clients    : creees 0, lignes 14, modifiees 14, inchangees 0      <- données identiques, pourtant « modifiées »
factures   : creees 0, lignes 16, inchangees 14, mêmes 2 écartées
reglements : creees 0, lignes 5, inchangees 5
```

## Lecture `public.cashd_factures_etat` après R1 (extraits)
| numéro | nature | montant_ttc | reste_du | reste_relancable | statut | retard | règle |
|---|---|---|---|---|---|---|---|
| FB-2026-0100 (C0) | facture | 1085 | 1085 | 1085 | ouverte | 8 | 0 |
| FB-2026-0102 (C2) | facture | **1185** (HT 1000, lignes 1000 à 8,5 %) | 1185 | **1185** | ouverte | 8 | 0 |
| FB-2026-0104 (C4) | facture | 1085 | 1085 | 1085 | ouverte | 8 | 0 |
| FB-2026-0105 (C5) | facture | 1085 | 1085 | 1085 | ouverte | 8 | 0 (500 € non lettré) |
| FB-2026-0106 (C6) | facture | 1085 | 1085 | 1085 | ouverte | 8 | avoirs_imputes 0 |
| AV-2026-0006 (C6) | **avoir** | **200** (exporté −200) | **200** | **200** | **ouverte** | 0 | 0 |
| FB-2026-0107 (C7) | facture | 1085 | 785 | 785 | ouverte | 8 | 300 |
| FB-2026-0108 (C8) | facture | 1085 | 1085 | 1085 | ouverte | 8 | 0 |
| FB-2026-0109 (C9) | facture | 1085 | 1085 | 1085 | ouverte | 0 (non échue) | 0 |
| FB-2026-0110 (C10) | facture | 1085 | 0 | 0 | soldee « réglée (lettrage) » | 0 | 1085 |
| FB-2026-0111 (C11) | facture | 1085 | 3 | 3 | ouverte | 8 | 1082 |
| FB-2026-0112 / 0113 (C12) | facture | 1085 / 542,5 | idem | idem | ouverte | 8 | 0 |
| FB-2026-0114 (C13) | facture | 1085 | 1085 | 1085 | ouverte | 35 | 0 |

## Passage du matin J (2026-10-21)
- Réponse du coordinateur : `private.cashd_preparer_relances(client,'2026-10-21',null)` → `{preparees 7, bloquees 1, coupees 0, mode_envoi null}` (bloquée = A-C04).
- Les relances de J portent `cree_le` 19:17:29, avant mon propre appel : le passage a été joué par le coordinateur.
  Mon `public.cashd_preparer_maintenant(client)` juste après → `{preparees 0, coupees 0, bloquees 0}` (rien en double).
- `public.cashd_relances_du_jour(client, '2026-10-21')` → 8 relances, toutes palier `rappel`, `demande_statut en_attente`,
  `envoi_id null`, motif « l'envoi par courriel n'est pas encore réglé pour CASHD : la relance est écrite et validable » :
  A-C00 1085 · A-C04 **sans_adresse** (« le compte n'a pas d'adresse de facturation : relancez-le vous-même ou complétez sa fiche »)
  · A-C06 **885** (« Facture FB-2026-0106 … 1 085,00 € TTC … : 885,00 € restant dus ») · A-C07 785 · A-C08 1085 · A-C11 3
  · A-C12 **un message, 2 pièces** (FB-0112 1085 + FB-0113 542,50, chacune son palier `rappel`) · A-C13 1085 (35 j, `rappel`).
- **Absentes** : A-C02 (FB-0102, 1185, aucun motif nulle part), A-C05 (500 € à imputer), A-C10 (soldée), A-C09 (non échue).
- `cashd_fiche_compte` A-C02 : compte `actif`, pièce `ouverte`, `reste_relancable` 1185, `statut_motif` null — rien n'explique l'absence.
- `cashd_fiche_compte` A-C05 : règlement `a_imputer` 500, `facture_citee` null ; compte `actif`, aucun motif de suspension visible.

## Gestes (en gérant eeeeeeee-…-0000000001c2)
- `cashd_litige('8d43c4ff-…'(FB-0108), true, 'Le client conteste la quantité de gravier livrée (essai T-CASHD)')`
  → `{statut litige, relances_coupees 1}` ; relance A-C08 → `coupee`, demande `annulee`, motif « facture FB-2026-0108 en litige : … ».
- `cashd_regler_entite('f2e7e4fc-…', 10)` → `seuil_relance 10` ; préparation suivante → `coupees 1` ; relance A-C11 → `coupee`,
  demande `annulee`, motif **« avant l'envoi : facture FB-2026-0111 réglée ou sortie de l'export »**.
- `cashd_lettrer('48c35a5f-…'(VIR-C05-0001), 'c9b232eb-…'(FB-0105), 500)` → `{reste_du 585, a_imputer 0}` ;
  préparation suivante → `preparees 1` ; relance A-C05 `rappel` 585,00 € en attente de validation.
- Import d'un devis (`nature devis`, DV-2026-0009) par `cashd_importer` jeu `factures` → écarté, motif « un devis dans l'export des factures ».

## Passages J+1 et J+6 (joués par le coordinateur)
- `private.cashd_preparer_relances(client,'2026-10-22',null)` → `{preparees 0, bloquees 0, coupees 0, mode_envoi null}` ;
  `cashd_relances_du_jour(client,'2026-10-22')` → vide.
- `private.cashd_preparer_relances(client,'2026-10-27',null)` → `{preparees 1}` ; `cashd_relances_du_jour(client,'2026-10-27')` →
  une seule : A-C13, palier `relance`, `en_attente`, 1085, sujet « banc-test-cashd — relance : 1 085,00 € restent dus »,
  corps « Malgré notre précédent rappel, la somme suivante reste impayée sur votre compte A-C13 : • Facture FB-2026-0114 du
  17/08/2026, 1 085,00 € TTC, échue le 16/09/2026 (41 jours de retard) … Total restant dû : 1 085,00 €. Nous vous remercions
  de procéder au règlement au plus tard le 04/11/2026. Nous vous rappelons que tout retard de paiement rend exigibles une
  indemnité forfaitaire pour frais de recouvrement de 40,00 € par facture et des pénalités de retard (Code de commerce,
  art. L441-10). Si vous contestez tout ou partie de ces montants, merci de nous l'écrire … »
- Relances du 21/10 relues ensuite : A-C13 `coupee`, `annulee`, « remplacée par la relance du 27/10/2026 », `envoye_le` null ;
  les autres inchangées (rappels `en_attente`, A-C08/A-C11 coupées, A-C04 sans adresse).
