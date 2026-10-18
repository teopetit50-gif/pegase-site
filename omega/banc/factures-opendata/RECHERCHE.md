# Factures PDF en open data — relevé du 18/10/2026 (A4)

Recherche par l'API de data.gouv.fr (`/api/1/datasets/?q=…`, 50 à 100 premiers jeux par requête) des ressources
PDF qui seraient des factures publiées par des collectivités.

| Requête | Jeux | Ressources PDF | Ce qu'elles sont |
|---|---:|---:|---|
| factures, facture fournisseur, factures payées, factures acquittées, factures commune | 0 | 0 | — |
| facture | 1 | 0 | un jeu sur les offres de facturation électronique |
| factur | 15 | 0 | — |
| mandatement, dépenses mandatées, pièces justificatives, justificatifs | 0 | 0 | — |
| mandats / mandat | 3 / 34 | 0 / 5 | mandats d'élus, délibérations |
| depenses | 192 | 34 | synthèses de dépenses, rapports d'aide sociale |
| paiements, fournisseurs, frais, elus, chorus | 3 à 152 | 0 à 5 | listes d'élus, simulateurs, rapports |

Constat : data.gouv.fr ne porte pas de factures de collectivités en PDF. Les collectivités y publient leurs budgets,
dépenses et marchés en tableaux (CSV), pas les pièces elles-mêmes. Aucune pièce n'a donc été déposée sur le banc.

Le script `omega/banc/factures_opendata.mjs` (recherche, dépôt, plafonds, heure limite) et le relevé
`omega/banc/factures_opendata.sql` sont prêts pour une source qui en porte. Pistes publiques et légales, à décider :
- les factures d'exemple Factur-X publiées avec la norme (FNFE-MPE) : de vrais PDF/A-3 avec leur XML, mais des
  exemples, pas des factures payées ;
- une collectivité qui publie ses pièces sur son propre site (à trouver et vérifier une par une : licence ouverte).

## Décision et source retenue (18/10, coordinateur)

Les EXEMPLES DE LA NORME Factur-X / ZUGFeRD 2 — **ce ne sont pas de vraies factures** : 7 exemples Factur-X de la FNFE-MPE
(`ZUGFeRDv2/correct/FNFE-factur-x-examples`) et 29 exemples ZUGFeRD 2.0 de FeRD réalisés par intarsys
(`ZUGFeRDv2/correct/intarsys/…`), pris dans le corpus ZUGFeRD (github.com/ZUGFeRD/corpus, licence Apache-2.0, commit
82e886fb2136). La page de la FNFE ne les donne qu'après un formulaire de courriel : non rempli. Chaque fichier, son
adresse et son SHA-256 sont dans `SOURCE.tsv` ; les PDF ne sont pas dans git. Sur le banc, leur expéditeur est
« exemple-norme:… ». Aucune collectivité retenue : aucune trouvée qui publie ses pièces sous licence ouverte.
