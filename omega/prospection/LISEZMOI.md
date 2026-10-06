# Prospection Guadeloupe (971) : fichier `guadeloupe.csv`

Collecte du 06/10/2026. Séparateur « ; », UTF-8 avec BOM (s'ouvre directement dans Excel).
Une ligne par établissement actif.

## Résumé

- **7 026 établissements** en tout.
- Tiroma (dentistes) : 312 lignes, dont 45 avec téléphone et 4 avec courriel (RPPS).
- Tamila (avocats) : 452 lignes, dont 190 avec téléphone et 226 avec courriel (répertoire du Barreau).
- Lorani (architectes, maîtres d'œuvre) : 399 lignes, dont 1 avec téléphone et courriel.
- Daliro (BTP avec salariés) : 1 166 lignes, dont 1 avec téléphone et courriel.
- Tavaro (loueurs de voitures) : 1 716 lignes, dont 411 entrepreneurs individuels.
- Varelo (holdings, sièges sociaux) : 668 lignes.
- FILED/CASHD/OFFLOAD/REPUT (PME de services et de distribution) : 2 313 lignes, dont 46 avec téléphone, 7 avec courriel et 21 avec site web.
- Limite principale : SIRENE ne donne ni téléphone ni courriel. Le passage par le site officiel de chaque entreprise a commencé sur les 1 200 plus grosses, mais il a été coupé par la limite de 200 recherches web par tour. Il reste environ 4 100 entreprises à traiter, par vagues.
- Les numéros de portable (06 et 07) ne sont pas repris des annuaires (Ordre, RPPS). Un portable n'est gardé que si l'entreprise le publie elle-même sur son site comme numéro de contact ; la colonne « remarque » le signale.

## Comment le fichier a été fait

| Source | Ce qu'on y a pris |
|---|---|
| API publique SIRENE, recherche-entreprises.api.gouv.fr | Tous les établissements actifs du 971, par code NAF. Raison sociale, enseigne, SIRET, adresse, dirigeants publics (RNE), tranche d'effectif. Les entreprises en « diffusion partielle » à l'INSEE sont exclues. |
| Annuaire Santé, extraction RPPS en open data (data.gouv.fr, 24/09/2026) | Chirurgiens-dentistes du 971 : nom du praticien, téléphone et courriel du cabinet quand ils sont publiés. Saint-Martin et Saint-Barthélemy sont exclus. |
| FINESS, open data (data.gouv.fr, 04/05/2026) | Standard des cliniques et des laboratoires. |
| Barreau de la Guadeloupe, répertoire officiel 2022 (PDF de l'Ordre) et tableau en ligne consulté le 06/10/2026 | Coordonnées professionnelles des avocats encore inscrits en 2026. Les avocats de Saint-Martin et Saint-Barthélemy sont exclus. |

Codes NAF retenus :

- Tiroma : 86.23Z.
- Tamila : 69.10Z, sans les notaires, commissaires de justice et mandataires.
- Lorani : 71.11Z, plus 71.12B quand il y a des salariés.
- Daliro : 41.20, 42.xx, 43.xx, avec au moins un salarié.
- Tavaro : 77.11A.
- Varelo : 70.10Z, plus 64.20Z quand il y a des salariés.
- PME : 66.22Z, 45.11Z, 45.20A, 45.31Z, 46.xx, 49.41A/B, 52.10B, 52.29A/B, 55.10Z, 86.10Z, 86.90B, 69.20Z. Les codes 45.xx, 46.xx, 49.xx et 52.xx sont pris seulement quand il y a des salariés.

Rien n'a été collecté sur PagesJaunes, Societe.com, Kompass, LinkedIn ou Google Maps. Aucun courriel n'a été deviné.

## Règles de démarchage

- **Courriel** : on peut écrire à un professionnel sans son accord préalable, si le message parle de son métier (règle de la CNIL). Chaque message doit :
  - dire clairement qui écrit (Omega, omegaai.fr) ;
  - contenir un lien de désinscription qui marche.
- **Registre des oppositions** : tenez une liste de ceux qui ont dit non, et ne les recontactez jamais.
- **Premier contact** : dites d'où vient le contact (source publique) et pourquoi vous écrivez. Dites aussi que la personne peut s'opposer, accéder à ses données ou les faire effacer. C'est l'information prévue par l'article 14 du RGPD.
- **Téléphone** : appeler un professionnel est autorisé, car Bloctel ne protège que les particuliers. Mais un « non » est définitif.
- **Entrepreneurs individuels** (colonne `personne_physique` = oui) : le RGPD s'applique pleinement. Soyez particulièrement sobres avec eux.
- **Conservation** : effacez une ligne au plus tard 3 ans après le dernier contact sans réponse.
