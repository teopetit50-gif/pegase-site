# Prospection Guadeloupe (971) : fichier `guadeloupe.csv`

Collecte du 06/10/2026. Séparateur « ; », UTF-8 avec BOM (s'ouvre directement dans Excel).
Une ligne par établissement actif.

## Résumé

- **11 901 établissements**, dont **1 052 avec téléphone**, 348 avec courriel et 202 avec site web.

| Module | Lignes | Téléphone | Courriel |
|---|---|---|---|
| Tiroma (dentistes) | 315 | 54 | 4 |
| Tamila (avocats, quelques notaires) | 454 | 230 | 239 |
| Lorani (architectes) | 499 | 201 | 3 |
| Daliro (BTP) | 1 172 | 11 | 3 |
| Tavaro (loueurs de voitures) | 1 719 | 56 | 30 |
| Varelo (holdings) | 670 | 8 | 3 |
| PME de services et de distribution, dont experts-comptables | 2 358 | 267 | 32 |
| Autres PME, tous secteurs, 3 salariés et plus | 4 714 | 225 | 34 |

- **Module « Autres PME (3+ salariés) »** : toutes les autres entreprises du 971 qui déclarent au moins 3 salariés, quel que soit leur métier. Les administrations, les organismes publics et les associations y sont exclus. Le code NAF figure dans la colonne « remarque ».
- `martinique.csv` contient en plus 52 cibles de Martinique (972). Elles viennent toutes de la liste ChatGPT et sont à vérifier.
- **Trous principaux :**
  - BTP et holdings : très peu de ces entreprises ont un site web.
  - Loueurs de voitures : seuls les 132 qui ont des salariés ont été cherchés ; les loueurs sans salariés n'ont pas été traités.
  - Les autres secteurs n'ont été traités qu'en partie, à cause de la limite de 200 recherches web par tour. Une nouvelle vague complète les trous.
- **Numéros de portable :**
  - Les portables ne sont repris que s'ils sont publiés comme numéro professionnel, par un Ordre (avocats, architectes, experts-comptables) ou par l'entreprise sur son site.
  - La colonne « remarque » le signale à chaque fois.
- **Lignes marquées « Liste fournie par Teo (recherche ChatGPT) » :**
  - ChatGPT a pris une partie de ses numéros sur PagesJaunes ou Pappers.
  - Vérifiez ces numéros avant de les utiliser à grande échelle.

## Comment le fichier a été fait

| Source | Ce qu'on y a pris |
|---|---|
| API publique SIRENE, recherche-entreprises.api.gouv.fr | Tous les établissements actifs du 971, par code NAF. Raison sociale, enseigne, SIRET, adresse, dirigeants publics (RNE), tranche d'effectif. Les entreprises en « diffusion partielle » à l'INSEE sont exclues. |
| Annuaire Santé, extraction RPPS en open data (data.gouv.fr, 24/09/2026) | Chirurgiens-dentistes du 971 : nom du praticien, téléphone et courriel du cabinet quand ils sont publiés. Saint-Martin et Saint-Barthélemy sont exclus. |
| FINESS, open data (data.gouv.fr, 04/05/2026) | Standard des cliniques et des laboratoires. |
| Tableau officiel de l'Ordre des architectes (annuaire.architectes.org), consulté le 06/10/2026 | Les 217 architectes inscrits en Guadeloupe : adresse et téléphone professionnel. |
| Annuaire officiel de l'Ordre des experts-comptables (annuaire.experts-comptables.org), consulté le 06/10/2026 | 242 cabinets d'expertise comptable : adresse et téléphone. |
| Sites officiels des entreprises ou de leur réseau (pages agences Hertz, Europcar, Avis, Synergibio…), office du tourisme | Téléphone, courriel et site web, avec l'URL exacte de la page lue. |
| Liste fournie par Teo (recherche ChatGPT du 06/10/2026) | Une centaine de cibles prioritaires en Guadeloupe et en Martinique. |
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
