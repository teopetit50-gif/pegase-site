# La météo de Daliro — ce qu'il faut à Teo (B6, 06/10/2026)

Daliro surveille les passages extérieurs des chantiers : pluie, rafales, gel sur 7 jours. Il le dit au conducteur
de travaux et au point du matin. Le code est posé sur la recette (b6_21). Il ne demande rien tant que l'adresse
d'un service météo n'est pas réglée. Ce guide dit quel service choisir et comment ouvrir le compte.

## Ce que Daliro attend d'un service météo

Pour chaque chantier (position arrondie à 1 km), une fois par jour et par jour de prévision :

- le cumul de pluie (mm) ;
- les rafales maximales (km/h) ;
- les températures minimale et maximale (°C).

La base lit une réponse JSON, sans programme intermédiaire. C'est ce point qui tranche entre les trois voies.

## Les trois voies

### 1. L'API de Météo-France (portail-api.meteofrance.fr) — gratuite, réutilisable commercialement, MAIS pas lisible telle quelle

- Les données AROME et ARPEGE sont sous Licence Ouverte 2.0 : on peut les réutiliser commercialement, en citant
  Météo-France.
- Le compte et la clé sont gratuits. Plafond : environ 50 à 100 appels par minute selon l'API.
- **Limite** : ces API rendent des grilles de modèle (GRIB 2, GeoTIFF ou PNG, par WMS ou WCS), pas une prévision
  par point en JSON.
  - Il faut un programme intermédiaire (une fonction Edge) qui découpe la grille sur le point du chantier, variable
    par variable et heure par heure, puis fait les totaux du jour.
  - Il faut compter une centaine d'appels par chantier et par mise à jour. Le plafond par minute ne tient donc que
    quelques dizaines de chantiers.
  - C'est un chantier technique à part entière, à confier et à tester avant d'être promis.

### 2. Open-Meteo hébergé chez Omega — gratuit, mêmes données Météo-France, lecteur déjà écrit

- Open-Meteo est un logiciel libre (AGPL v3). Il télécharge lui-même les modèles de Météo-France (AROME, ARPEGE) et
  rend exactement le JSON que Daliro lit déjà.
- Il faut un petit serveur (Docker) et le stockage des modèles pour la France. Il faut aussi respecter l'AGPL :
  publier nos éventuelles modifications du logiciel.
- Les conditions d'Open-Meteo demandent de les contacter pour un usage commercial, même hébergé chez soi. Un courriel
  à faire avant la mise en service.

### 3. L'abonnement Open-Meteo — payant, immédiat

- C'est la même réponse JSON (modèle « meteofrance_seamless »), servie par Open-Meteo, qui autorise alors l'usage
  commercial.
- Rien à développer : on change l'adresse et on pose la clé.
- **À éviter** : l'API gratuite d'Open-Meteo (api.open-meteo.com) est réservée à l'usage non commercial. Le
  coordinateur l'a écartée pour cette raison.

**Recommandation de B6** : la voie 3 pour démarrer tout de suite, puis la voie 2 si le coût compte. La voie 1 est la
plus « souveraine », mais elle demande un développement à part entière : je ne la promets pas avant de l'avoir faite.

## Ouvrir le compte et la clé

### Météo-France (voie 1)

1. Aller sur https://portail-api.meteofrance.fr et créer un compte (adresse de l'entreprise).
2. Dans le catalogue, s'abonner aux API « AROME » et « ARPEGE » (bouton « Souscrire »). C'est gratuit.
3. Dans « Mes API », générer un jeton d'accès de type « API Key ». Il s'envoie dans l'en-tête HTTP `apikey`.
4. Transmettre la clé au coordinateur par un canal privé, jamais dans un message ni dans le dépôt. Il la range dans
   le Vault Supabase sous le nom `daliro_meteo_cle`.

### Open-Meteo, abonnement (voie 3)

1. Aller sur https://open-meteo.com/en/pricing et choisir le plan de base (Standard). Le paiement passe par Stripe.
2. Récupérer la clé d'API dans l'espace client.
3. Transmettre la clé au coordinateur par un canal privé. Il la range dans le Vault sous `daliro_meteo_cle` et pose
   l'adresse `https://customer-api.open-meteo.com/v1/forecast` dans `private.reglages` (`daliro_meteo_url`).

### Open-Meteo hébergé (voie 2)

Aucun compte : un serveur et une décision d'hébergement, à voir avec le coordinateur.

## Ce que Daliro fait ensuite, sans rien de plus

- Il interroge le service deux fois par jour (3 h 07 et 12 h 07 UTC), seulement pour les chantiers ouverts,
  localisés, qui ont un passage extérieur dans les 7 jours.
- Il compare la prévision aux seuils du passage, sinon aux seuils par défaut : 5 mm de pluie, 60 km/h de rafales,
  gel.
- Il alerte le conducteur de travaux et inscrit la ligne au point du matin.

## Décision du 06/10/2026, 18 h 25 Z : MET Norway

Teo veut une source gratuite. Le coordinateur a choisi **MET Norway, Locationforecast 2.0**
(api.met.no). Le service est gratuit y compris en usage commercial, sans compte ni clé.
Les données sont sous licence CC BY 4.0. Daliro (b6_21b) respecte ses conditions :

- l'attribution « Données météo : MET Norway » sur l'écran ;
- un User-Agent qui identifie Omega et un contact ;
- des coordonnées arrondies ;
- `If-Modified-Since` et l'en-tête `Expires`.

MET Norway ne donne pas les rafales en France. Le risque de vent se lit donc sur le vent
moyen, à partir de 40 km/h (deux tiers du seuil de rafales de 60 km/h), et l'écran le dit.

Pour l'activer, le coordinateur pose `omega/modules/daliro/reglages/meteo_met_norway.sql`.
Rien à faire pour Teo. Les voies 1 à 3 ci-dessus restent possibles plus tard, par exemple
pour avoir les rafales.
