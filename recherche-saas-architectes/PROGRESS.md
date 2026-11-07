# PROGRESS : Étude de marché SaaS pour architectes (US)

Dernière mise à jour : 2026-11-07, fin de session. Toutes les phases sont terminées.

## État des phases

| Phase | Statut | Livrable |
|---|---|---|
| 0 Organisation | terminé | structure, briefs (`_travail/BRIEF_*.md`), scripts |
| 1 Contexte marché US | terminé | `01_marche_us_et_workflow.md` (448 lignes) |
| 2 Découverte SaaS | terminé | `02_base_saas.csv` : 300 outils, 9 catégories, 26 doublons fusionnés ; `base_saas.xlsx` (10 feuilles, filtres) |
| 3 Fiches détaillées | terminé | `03_fiches_saas/` : 33 fiches |
| 4 Voix des architectes | terminé | 396 items dans `_travail/04_voix_*.jsonl` ; `04_problemes_architectes.md` : 30 problèmes notés |
| 5 Matrice | terminé | `05_matrice_problemes_solutions.md` |
| 6 Synthèse et opportunités | terminé | `06_opportunites.md`, `00_synthese_executive.md` |
| 7 Contrôle qualité | terminé | `07_limites.md` (26 chiffres revérifiés), `sources.md` (1 297 URL) |

## Contraintes d'environnement rencontrées (2026-11-07)

- Quota WebSearch : 200 requêtes par tour, partagé entre tous les sous-agents ; seize agents
  lancés en parallèle l'ont épuisé dès le premier tour. Les agents ont continué par lecture directe
  d'URL connues.
- reddit.com bloqué en lecture ; g2.com, capterra.com, trustradius.com, softwareadvice.com, getapp.com,
  autodesk.com, bls.gov en 403. Voir `07_limites.md`.
- À la demande du commanditaire (message relayé en cours de session), tous les sous-agents ont été
  arrêtés après la phase 2 et le début de la phase 4 ; les phases 3, 5, 6, 7 et la consolidation ont
  été faites sans sous-agent.

## Pour reprendre ou prolonger

1. Relancer les notes G2 et Capterra manquantes (environ 200 outils) quand les sites sont lisibles.
2. Dépouiller r/Architects (enquête annuelle, fils « software stack », « Monograph vs BQE »).
3. Lire le AIA Firm Survey Report 2026 (publié le 2 novembre 2026) pour la répartition 10-49 / 50+,
   les modes de facturation et le chapitre technologie.
4. Trancher les points ouverts listés dans `07_limites.md` (Twinmotion et Unreal Subscription 2026,
   prix D5, « 79 % » Zweig, ARCAT, Allplan).
