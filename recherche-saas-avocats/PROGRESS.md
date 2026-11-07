# PROGRESS — Étude de marché SaaS avocats US (pour Tamila / Omega AI)

Dernière mise à jour : 2026-11-07, toutes les phases terminées

## État des phases
- [x] Phase 0 : organisation (dossier créé, PROGRESS.md créé)
- [x] Phase 1 : contexte du marché US → `01_marche_us_et_workflow.md` (rédigé le 2026-11-07, 5 300 mots)
- [x] Phase 2 : découverte exhaustive → `02_base_saas.csv` (141 outils, 2026-11-07)
- [x] Phase 3 : 40 fiches détaillées → `03_fiches_saas/` (2026-11-07)
- [x] Phase 4 : voix des avocats → `04_problemes_avocats.md` (2026-11-07 ; corpus : 255 avis Capterra 1-3 étoiles lus, 50 fils Reddit, 22 rapports)
- [x] Phase 5 : matrice → `05_matrice_problemes_solutions.md` (2026-11-07)
- [x] Phase 6 : opportunités → `06_opportunites.md` (2026-11-07)
- [x] Phase 7 : Tamila → `07_tamila_face_au_marche_us.md` (2026-11-07)
- [x] Phase 8 : contrôle qualité (25 chiffres revérifiés, 21 confirmés) → `08_limites.md`, `sources.md` (519 URL) (2026-11-07)
- [x] Synthèse exécutive → `00_synthese_executive.md` (2026-11-07)
- [x] Bonus : `base_saas.xlsx` (filtres, une feuille par famille, feuille « Concurrents Tamila »)

## Méthode de travail
- DÉCISION DE TEO (relayée le 2026-11-07) : AUCUN sous-agent ni workflow. Tout le travail se fait dans la session principale, recherche web (WebSearch) et lecture de pages (curl via proxy) comprises. Les 9 sous-agents lancés en Phase 0 ont été arrêtés avant d'avoir écrit quoi que ce soit.
- Sites qui refusent la lecture automatique (403) : americanbar.org, clio.com, bls.gov, sec.gov, g2.com, trustradius.com, reddit.com (API), capterra.com (404 sur les URL testées), legaltechnologyhub.com (429). Lisibles : lawnext.com, artificiallawyer.com, lawyerist.com, law.com, abovethelaw.com, getapp.com, thomsonreuters.com, la plupart des sites éditeurs (mycase, smokeball, practicepanther, casefleet, clearbrief, everlaw).
- Les faits bloqués sont lus via les résumés de recherche (WebSearch) qui citent la page, et via les reprises de presse.
- Recherches en anglais, livrables en français.
- Fichiers de travail intermédiaires (sorties brutes des sous-agents) dans `_travail/`.
- Chaque chiffre étiqueté [vérifié] / [estimé] / [déclaratif], avec URL et date de consultation.

## Journal
- 2026-11-07 : création du dossier et du plan.
- 2026-11-07 : arrêt des sous-agents sur instruction de Teo ; reprise en solo.
- 2026-11-07 : Phase 1 terminée (01_marche_us_et_workflow.md). Phase 2 démarrée : collecte en JSONL dans _travail/phase2_*.jsonl, consolidation en CSV par script.

- 2026-11-07 : Phase 2 (141 outils) et Phase 4 (04_problemes_avocats.md) terminées. Extraits bruts dans _travail/. Reste : fiches (3), matrice (5), opportunités (6), Tamila (7), QC (8), synthèse (0), xlsx.
- 2026-11-07 : phases 3, 5, 6, 7, 8 terminées ; synthèse et xlsx produits. Étude complète. Pistes d'approfondissement si une session reprend : (a) lire les rapports ABA Profile 2025 et ILTA 2025 si un accès est fourni ; (b) obtenir des devis réels (Harvey, CoCounsel, Smokeball, Supio) ; (c) compléter les chiffres de traction de Tamila dans 07.
