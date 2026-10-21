# Jeu d'essai T-CASHD — série 1 (C0 → C13)

Export **fictif** d'un facturier, tel qu'un client le déposerait. Client banc : `banc-test-cashd`,
négoce de matériaux BTP en Guadeloupe (fictif). Aucune personne, aucune adresse, aucun numéro réels :
les courriels sont en `.invalid` (RFC 2606, ne peut pas être délivré).

- Jour de référence **J = 2026-10-21** (mardi). Les retards sont comptés depuis ce jour.
- Gabarit commun : 1 000,00 HT · TVA 8,5 % = 85,00 · **1 085,00 TTC** (octroi de mer inclus dans le prix).
- Une erreur volontaire par cas, un compte par cas (sauf C12, qui en veut deux factures sur le même).
- `export_J.csv` + `reglements_J.csv` = l'export du matin J (une passe).
- Lendemain J+1 : `export_J.csv` et `reglements_J.csv` rejoués **à l'identique** (C10 toujours présente, C7 encore en double),
  puis `lettrage_J1.csv` (C5 lettré).
- Le format est neutre (colonnes d'un facturier). Il sera porté sur la porte d'import dès que le
  coordinateur en donne le format exact.
