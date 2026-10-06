# Factures électroniques publiques du banc

Vrais exemples, pour les tests du lecteur (`tests/factures_publiques_test.ts`). Aucune donnée réelle de client :
ce sont les factures fictives des jeux d'exemples officiels.

| Fichier | Norme / profil | Source | Licence |
|---|---|---|---|
| `zugferd_2p3_MINIMUM_Rechnung.xml` | Factur-X 1.07 / ZUGFeRD 2.3, MINIMUM | jeu d'exemples FeRD 2.3 (18/09/2024), copié de pretix/python-drafthorse `tests/samples` (commit cca3b5e) | droit d'usage FeRD inscrit en tête du fichier : gratuit, irrévocable, développement et usage de logiciels compris |
| `zugferd_2p3_BASIC_Einfach.xml` | Factur-X 1.07 / ZUGFeRD 2.3, BASIC | idem | idem |
| `zugferd_2p3_EN16931_Einfach.xml` | Factur-X 1.07 / ZUGFeRD 2.3, EN16931 | idem | idem |
| `zugferd_2p3_EN16931_Gutschrift.xml` | Factur-X 1.07 / ZUGFeRD 2.3, EN16931 (autofacturation 389) | idem | idem |
| `EN16931_Einfach.pdf` | PDF/A-3 Factur-X, EN16931, XML joint `factur-x.xml` | ZUGFeRD/mustangproject `library/src/test/resources` (commit f9af7e8) | dépôt sous Apache-2.0 ; exemple d'origine FeRD |
| `XRECHNUNG_Einfach.ubl.xml` | UBL 2.1 (XRechnung) | ZUGFeRD/mustangproject, idem | Apache-2.0 |
| `ubl-creditnote.xml` | UBL 2.1 CreditNote | ZUGFeRD/mustangproject, idem | Apache-2.0 |

Copiés le 06/10/2026, sans modification.
