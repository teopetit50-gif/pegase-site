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
