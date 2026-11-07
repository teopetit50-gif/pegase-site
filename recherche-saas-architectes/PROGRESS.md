# PROGRESS — Étude de marché SaaS pour architectes (US)

Dernière mise à jour : 2026-11-07 (début de session)

## État des phases

| Phase | Statut | Notes |
|---|---|---|
| 0 Organisation | en cours | dossier créé, structure des livrables posée |
| 1 Contexte marché US | à faire | AIA Firm Survey, NCARB, BLS, Census |
| 2 Découverte SaaS (100+) | à faire | 8 sous-agents par catégorie, fragments dans `_travail/` |
| 3 Fiches détaillées (30) | à faire | |
| 4 Voix des architectes (300+) | à faire | |
| 5 Matrice problèmes x solutions | à faire | |
| 6 Synthèse et opportunités | à faire | |
| 7 Contrôle qualité et limites | à faire | |
| Bonus xlsx | à faire | |

## Structure des livrables

- `00_synthese_executive.md`
- `01_marche_us_et_workflow.md`
- `02_base_saas.csv`
- `03_fiches_saas/*.md`
- `04_problemes_architectes.md`
- `05_matrice_problemes_solutions.md`
- `06_opportunites.md`
- `07_limites.md`
- `sources.md`
- `base_saas.xlsx` (bonus)
- `_travail/` : fragments intermédiaires des sous-agents (CSV par catégorie, avis bruts)

## Pour reprendre

Lire ce fichier, puis les fragments dans `_travail/` non encore consolidés.

## Contraintes d'environnement découvertes (2026-11-07)

- Quota WebSearch : 200 requêtes par tour, partagé entre tous les sous-agents. Seize agents lancés
  en parallèle l'ont épuisé. Conséquence : lancer moins d'agents à la fois, leur fixer un budget
  explicite de requêtes, et relancer les sources bloquées sur les tours suivants.
- reddit.com et old.reddit.com sont bloqués pour WebFetch (refus de domaine) ; curl renvoie 403 / 429.
  Les citations Reddit ne peuvent venir que des extraits de recherche (mot pour mot) ; à documenter
  dans 07_limites.md.
- Agent Reddit (Phase 4) : 0 item au premier passage, plan de relance dans _travail/04_voix_reddit_notes.md.
