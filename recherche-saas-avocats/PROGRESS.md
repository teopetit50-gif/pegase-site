# PROGRESS — Étude de marché SaaS avocats US (pour Tamila / Omega AI)

Dernière mise à jour : 2026-11-07 (Phase 1 terminée, Phase 2 en cours)

## État des phases
- [x] Phase 0 : organisation (dossier créé, PROGRESS.md créé)
- [x] Phase 1 : contexte du marché US → `01_marche_us_et_workflow.md` (rédigé le 2026-11-07, 5 300 mots)
- [ ] Phase 2 : découverte exhaustive (objectif 120+ outils) → `02_base_saas.csv`
- [ ] Phase 3 : 35 fiches détaillées → `03_fiches_saas/`
- [ ] Phase 4 : voix des avocats (300+ avis/posts) → `04_problemes_avocats.md`
- [ ] Phase 5 : matrice problèmes x solutions → `05_matrice_problemes_solutions.md`
- [ ] Phase 6 : synthèse et opportunités → `06_opportunites.md`
- [ ] Phase 7 : Tamila face au marché US → `07_tamila_face_au_marche_us.md`
- [ ] Phase 8 : contrôle qualité → `08_limites.md`, `sources.md`
- [ ] Synthèse exécutive → `00_synthese_executive.md`
- [ ] Bonus : `base_saas.xlsx`

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
