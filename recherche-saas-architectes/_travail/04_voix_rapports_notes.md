# Phase 4, lot « voix des rapports » : notes de synthèse

Date de consultation de toutes les sources : 2026-11-07. Fichier de données :
`04_voix_rapports.jsonl` (60 items, une ligne JSON par item, validé avec la commande du brief).

## 1. Méthode et limites de collecte

- Le budget WebSearch de la session était épuisé dès ma première requête (limite partagée entre
  agents). Toute la collecte a donc été faite par lecture directe (WebFetch) de pages dont je
  connaissais l'adresse, puis en suivant les liens trouvés dans ces pages (index AIA, sitemap
  Monograph, liens sortants des billets Monograph vers AIA, PSMJ, Zweig, Architizer, etc.).
  Conséquence : certaines sources listées dans le prompt n'ont pas pu être localisées (voir § 6).
- Les PDF NCARB (éditions 2024, 2025, 2026) et le PDF AIA Home Design Trends Survey T2 2026 ont été
  téléchargés et convertis en texte avec `pdftotext`, les citations sont copiées du texte extrait.
- Type de source : conformément à la consigne, tous les items portent `type_source = "Rapport"`.
  Pour être honnête sur la nature réelle de chaque source, voici la répartition :
  - rapports ou communiqués primaires d'organismes professionnels (AIA/ABI, NCARB, AIA Trust/CNA,
    ACEC, Zweig Group, PSMJ) : 37 items ;
  - enquêtes ou données d'éditeurs de logiciels, étiquetées [déclaratif] (Deltek Clarity,
    Monograph, Unanet via PSMJ, Basebuilders) : 17 items ;
  - articles de presse spécialisée relayant un rapport ou des témoignages (ARCHITECT Magazine,
    AIA Architect, Archinect) : 6 items.
- Étiquetage des chiffres dans le champ `probleme` : 37 mentions [vérifié], 31 [déclaratif],
  1 [estimé] (plusieurs items portent plusieurs étiquettes).
- Toutes les citations sont en anglais, copiées mot pour mot, 40 mots maximum (la plus longue fait
  33 mots). Une citation (Basebuilders) contient un tiret cadratin présent dans le texte original.

## 2. Répartition des 60 items

Par étape du workflow (un item peut porter plusieurs étapes) :

| Étape | Libellé | Items |
|---|---|---|
| 0 | Transversal (marché, IA, structure du secteur) | 14 |
| 1 | Prospection, propositions, honoraires | 10 |
| 2 | Faisabilité, site | 1 |
| 3 | Esquisse | 1 |
| 5 | Documents de construction | 1 |
| 6 | Conformité et permis | 1 |
| 8 | Estimation des coûts | 1 |
| 9 | Visualisation, présentation | 1 |
| 11 | Suivi de chantier | 1 |
| 12 | Clôture et archivage | 1 |
| 13 | Temps, facturation, rentabilité | 20 |
| 14 | Planification des ressources et de la charge | 10 |
| 15 | Gestion de projet interne | 5 |
| 16 | Gestion documentaire, fichiers, cybersécurité | 5 |
| 17 | CRM, marketing | 1 |
| 18 | Connaissances, standards internes | 4 |
| 19 | Recrutement, formation, RH, licence | 21 |

Lecture : les rapports sectoriels parlent presque exclusivement de la gestion du cabinet (étapes
13 à 19) et du marché (étape 0 et 1). Les étapes de production (3 à 12) n'y apparaissent qu'en
creux (risque de sinistre, vérification des sorties IA, coûts qui font caler les projets). Les
douleurs de production doivent venir des autres lots de la phase 4 (avis G2/Capterra, Reddit).

Par segment : tous (47), petit cabinet et moyen (4), solo et petit cabinet (3), petit cabinet (1),
moyen (1), résidentiel (2), commercial (1), inconnu (1). Les rapports agrègent rarement par taille ;
quand ils le font (ABI), l'écart petits/grands cabinets est systématiquement très fort (budget IA,
suivi de l'utilisation, carnet de commandes).

Par domaine source : zweiggroup.com 9, aia.org 8 (+ aifirmtoolkit.aia.org 1, hdts.aia.org 1),
monograph.com 8, ncarb.org 7, go.psmj.com 6, deltek.com 5 (+ info.deltek.com 2),
architectmagazine.com 4, stambaughness.com 2, architizer.com 2, basebuilders.com 1,
theaiatrust.com 1, archinect.com 1, engineeringmanagementinstitute.org 1, acec.org 1.

## 3. Thèmes de douleur récurrents (notes provisoires 1 à 5)

Barème : Fréquence (combien de sources), Intensité (temps / argent / risque juridique / stress),
Insatisfaction (5 = très mal résolu aujourd'hui), Disposition à payer (signaux concrets).

### T1. Temps non saisi, non facturé, non encaissé (fuite de revenu)
- Items : 9 (Monograph x4, Zweig cash flow, Basebuilders, Architizer x2, Stambaugh Ness).
- Étapes : 13. Segments : tous, accent petit et moyen.
- Intensité : argent (une heure non saisie par semaine = 8 544 $/personne/an selon le calcul
  Monograph ; 4 cents perdus par dollar facturable ; délai de recouvrement médian 72 jours).
- Contournements : feuilles de temps de mémoire le lundi, revue de WIP tardive, relances manuelles.
- Fréquence 5 / Intensité 4 / Insatisfaction 4 / Disposition à payer 4 (budgets existants :
  Monograph, BQE, Deltek vendent exactement cela ; plaintes sur l'encaissement malgré des outils).

### T2. Pas de suivi de l'utilisation ni de la rentabilité projet dans les petits cabinets
- Items : 7 (ABI mai 2025, Deltek x2, Monograph 2021, Monograph 2026, PSMJ 2019, Stambaugh Ness).
- Étapes : 13, 14, 15. Segments : solo et petit surtout (15 % des cabinets < 250 k$ suivent
  l'utilisation contre 91 % des > 5 M$).
- Intensité : argent et stress (utilisation Deltek sous 60 %, marge 16,7 % en baisse).
- Contournements : on fait sans, ou objectifs individuels contre-productifs.
- Fréquence 5 / Intensité 4 / Insatisfaction 5 / Disposition à payer 3 (les petits cabinets n'ont
  pas de budget, mais 56 % des cabinets Monograph 2021 prévoyaient d'investir en gestion de projet).

### T3. Chefs de projet sans visibilité financière, projets en retard
- Items : 5 (Deltek landing, Deltek recap, Monograph 2021, PSMJ roadmap, Monograph AI PM).
- Étapes : 15, 14, 13. Segments : tous.
- Intensité : argent, stress (40 % des projets en retard ; la plupart des cabinets 2021 ne savent
  pas s'ils sont dans le budget).
- Contournements : Excel en silos (planning, temps, honoraires), formation des PM aux métriques.
- Fréquence 4 / Intensité 4 / Insatisfaction 4 / Disposition à payer 4 (53 % citent l'amélioration
  des processus comme initiative n° 1, Deltek).

### T4. Planification de la charge et gestion des ressources
- Items : 6 (PSMJ roadmap, Deltek x2, Monograph burnout, ABI backlog, AIA Architect burnout).
- Étapes : 14. Segments : tous.
- Intensité : stress et argent (deuxième défi de gestion de projet derrière la prévision ;
  carnet de 3,8 mois pour les petits cabinets).
- Contournements : feuilles de calcul disparates, décisions au jugé.
- Fréquence 4 / Intensité 3 / Insatisfaction 4 / Disposition à payer 3.

### T5. Épuisement professionnel, heures supplémentaires non payées
- Items : 5 (Monograph 2021, AIA Architect 2022, EMI 2026, Stambaugh Ness, PSMJ).
- Étapes : 19, 14. Segments : tous, résidentiel cité (calendriers clients agressifs).
- Intensité : stress fort (96,9 % en 2021 ; 71 % en 2026 selon EMI ; semaines de 55 à 70 h).
- Contournements : absorption par le personnel, programmes de bien-être individuels.
- Fréquence 4 / Intensité 5 / Insatisfaction 4 / Disposition à payer 2 (pas de budget direct,
  signal indirect via rotation coûteuse : 150 à 200 % du salaire).

### T6. Recrutement, rétention, rotation
- Items : 9 (Deltek x3, Zweig x3, PSMJ x2, Monograph 2021).
- Étapes : 19. Segments : tous.
- Intensité : argent et temps (54 jours pour pourvoir un poste, 128 pour les postes critiques ;
  rotation 13 à 13,8 %, au-delà de 40 % dans les cabinets déficitaires ; 4 cabinets sur 5 ont fait
  de mauvais recrutements).
- Contournements : HRIS/ATS (71 %), benchmarks salariaux, rémunération au cas par cas (42 % sans
  grille).
- Fréquence 5 / Intensité 4 / Insatisfaction 3 / Disposition à payer 3 (budgets RH en hausse de
  40 % par employé entre 2020 et 2025 selon Zweig).

### T7. Pipeline de licence long et fuyant (AXP, ARE)
- Items : 7 (NCARB 2024, 2025, 2026).
- Étapes : 19. Segments : tous, petit et moyen (supervision AXP).
- Intensité : temps (12,3 à 13,3 ans), inégalités fortes (40 % vs 23 % licenciés à 10 ans),
  36 à 38 % d'abandon, 1 sur 5 décroche pendant l'AXP.
- Contournements : suivi laissé au candidat.
- Fréquence 4 / Intensité 3 / Insatisfaction 3 / Disposition à payer 2 (sujet d'organisme plus que
  de cabinet ; signal faible pour un SaaS, sauf fonction de suivi AXP dans un outil RH).

### T8. IA : adoption large, bénéfice rare, formation absente
- Items : 9 (ABI août 2026 x3, Deltek PR, Zweig IT, Zweig AI, AI Firm Toolkit, EMI, ACEC).
- Étapes : 0, 19, 18, 5/6. Segments : tous ; écart énorme par taille (1 % des < 1 M$ ont un
  budget IA dédié, 30 % des > 5 M$).
- Intensité : argent (investissements sans retour : 62 % ne savent pas où appliquer la technologie,
  38 % seulement voient un impact), risque juridique (vérification obligatoire des sorties).
- Contournements : outils gratuits grand public, usage individuel sans politique de données.
- Fréquence 5 / Intensité 3 / Insatisfaction 4 / Disposition à payer 4 (79 % prévoient d'investir,
  deux tiers prévoient d'augmenter le budget IA en 2027).

### T9. Savoir interne enfoui dans des fichiers, versions multiples
- Items : 4 (AI Firm Toolkit, Zweig knowledge, PSMJ documentation, Architizer scan).
- Étapes : 18, 16. Segments : tous, témoignage détaillé en cabinet moyen.
- Intensité : temps et argent (« millions » selon PSMJ, non chiffré).
- Contournements : réorganisation manuelle d'arborescence, mémoire des anciens.
- Fréquence 3 / Intensité 3 / Insatisfaction 5 (zone blanche : aucun outil courant ne résout la
  version en vigueur d'une procédure) / Disposition à payer 3.

### T10. Honoraires sous pression, guerre des prix, travail gratuit
- Items : 6 (PSMJ price war, Zweig fees, AIA Architect billing, ABI sept. 2026, Zweig BD,
  Stambaugh forfait).
- Étapes : 1, 13, 17. Segments : tous.
- Intensité : argent (remises de 10 % sur le prix final ; 80 % en guerre des prix ; taux de succès
  45 % ; 59 % de l'effort commercial porté par les chefs de projet ; volume de propositions +32 %).
- Contournements : tarification au marché, forfaits sans suivi de réalisation.
- Fréquence 4 / Intensité 4 / Insatisfaction 4 / Disposition à payer 3 (outils de proposition et
  CRM existants ; signal de douleur plus que de budget).

### T11. Marché en contraction, projets retardés ou annulés
- Items : 7 (ABI x2, ARCHITECT x3, Consensus Forecast, HDTS).
- Étapes : 0, 1, 2, 8. Segments : tous, résidentiel, commercial.
- Intensité : argent (revenu net -2,9 % en 2026 ; contrats signés en baisse depuis plus de deux
  ans ; carnet à 5 mois en résidentiel).
- Contournements : repli vers la rénovation, concurrence accrue.
- Fréquence 5 / Intensité 4 / Insatisfaction n/a (pas un problème d'outil) / Disposition à payer 1.
  À utiliser comme contexte : les cabinets cherchent à protéger la marge, pas à grandir.

### T12. Risque professionnel et cybersécurité
- Items : 3 (AIA Trust/CNA, Deltek cyber, ACEC).
- Étapes : 11, 16, 5, 6. Segments : tous.
- Intensité : risque juridique et argent (gravité des sinistres +62 % ; 93 % ont subi une tentative
  d'attaque, 1 sur 5 une attaque réussie).
- Contournements : assurance, revue humaine.
- Fréquence 3 / Intensité 4 / Insatisfaction 3 / Disposition à payer 3 (assurance et SOC 2 déjà
  payés).

### T13. Dirigeants de petits cabinets comme amortisseurs financiers
- Items : 3 (ARCHITECT small firms, AIA Compensation, ABI backlog petits cabinets).
- Étapes : 0, 13, 19. Segments : solo et petit (74 % des entreprises).
- Intensité : argent et stress (baisse de la paie des dirigeants 2023-2025 ; rémunération < 3 %/an).
- Contournements : sacrifice personnel.
- Fréquence 3 / Intensité 4 / Insatisfaction 4 / Disposition à payer 2 (prix très sensible dans ce
  segment, mais 74 % du marché en nombre).

## 4. Chiffres clés réutilisables

Format : chiffre, source, URL, date de publication, étiquette.

Top 3 difficultés des cabinets
1. 80 % des cabinets A&E citent la disponibilité de bons candidats comme difficulté majeure
   (Deltek Clarity 47e, https://info.deltek.com/Clarity-AE, 2026) [déclaratif, enquête d'éditeur].
2. Obstacles IA : savoir où appliquer la technologie 62 %, intégrer les systèmes 56 %, données et
   cybersécurité 52 % (Deltek Clarity 47e, https://www.deltek.com/en/company/news/latest-deltek-clarity-industry-studies-highlight-ai-challenges/, 2026-05) [déclaratif].
3. Gestion de projet : la gestion des ressources est le 2e défi derrière la prévision (enquête
   Unanet ~400 cabinets citée par PSMJ, https://go.psmj.com/blog/a-roadmap-for-assessing-and-improving-your-firm, 2023-05) [déclaratif].
4. Raison n° 1 de la baisse attendue en 2027 : projets qui s'achèvent sans relève, 70 % (ABI sept.
   2026, https://www.aia.org/resource-center/abi-september-2026-architecture-firm-billings-slump-deepens, 2026-10) [vérifié].

Part des cabinets utilisant l'IA
5. 48 % des cabinets d'architecture s'engagent avec l'IA, 18 % en priorité stratégique, 7 % avec
   programme de formation formel (ABI août 2026, https://www.aia.org/resource-center/abi-august-2026-architecture-firm-billings-continue-decline, 2026-09) [vérifié].
6. 70 % des cabinets A&E utilisent l'IA (53 % un an plus tôt), 38 % voient un impact mesurable
   (Deltek Clarity 47e, URL ci-dessus, 2026-05) [déclaratif].
7. 6 % ont pleinement intégré l'IA, 54 % explorent, 79 % prévoient d'investir (Zweig 2026 IT
   Report, https://zweiggroup.com/blogs/the-zweig-letter/2026-aec-technology-ai-investment-benchmarks, 2026-10) [vérifié].

Dépenses technologiques
8. Budget IT médian 3,5 % du revenu net ; logiciels 36,7 % du budget IT, formation 0,8 % ; 8 % ont
   une feuille de route technologique (Zweig 2026 IT Report, URL ci-dessus, 2026-10) [vérifié].
9. Budget IA dédié : 15 % des cabinets ; 1 % des cabinets < 1 M$ contre 30 % des > 5 M$ ; 38 %
   n'investissent pas (ABI août 2026, URL ci-dessus, 2026-09) [vérifié].

Taux d'utilisation
10. Cible moyenne 77,5 % (fourchette 58 à 95 %) ; 72 % des cabinets suivent l'utilisation, 15 % des
    cabinets < 250 k$ (ABI mai 2025, https://www.aia.org/resource-center/abi-may-2025-despite-persistent-softness-fewer-firms-report-declining-billings, 2025-06) [vérifié].
11. Utilisation moyenne juste sous 60 %, marge opérationnelle 16,7 % (Deltek Clarity 47e, URL
    ci-dessus, 2026-05) [déclaratif].
12. Utilisation moyenne 81 %, top quartile 92 à 94 %, bas quartile 67 à 70 % (données Monograph,
    856 cabinets, https://monograph.com/blog/tracking-billable-hours-architects, 2026-10) [déclaratif]. Note : écart de définition avec Deltek (Monograph ne compte que les heures saisies).

DSO et encaissement
13. Délai médian de recouvrement 72 jours (67 l'année précédente), rotation WIP 18 jours (Zweig
    2026 Financial Performance Report, https://zweiggroup.com/blogs/the-zweig-letter/aec-firms-billing-faster-collecting-slower, 2026-06) [vérifié].
14. Délai moyen d'encaissement 34 jours, 22 pour les meilleurs (Monograph 2026,
    https://monograph.com/blog/salary-and-business-benchmarks-for-architects-engineers, 2026-10) [déclaratif, autre définition : temps entre facture et paiement].

Rotation du personnel
15. Rotation 13,8 % (Deltek Clarity 47e, https://info.deltek.com/Clarity-AE, 2026) [déclaratif] ;
    « au plus haut depuis dix ans » (Deltek recap, https://www.deltek.com/en/resources/articles/insights-to-action-webinar-recap/, 2026-11) [déclaratif].
16. Rotation médiane ~13 %, > 40 % dans les cabinets déficitaires (Zweig 2025 Recruitment &
    Retention, https://zweiggroup.com/blogs/the-zweig-letter/zooming-in, 2025-11) [vérifié].
17. Rotation volontaire 11,3 % après des pics à 17-18 % (PSMJ, https://go.psmj.com/blog/25-aec-industry-insights-from-2025, 2025-12) [vérifié].
18. Coût de remplacement 150 à 200 % du salaire annuel (PSMJ, https://go.psmj.com/blog/how-evolving-total-compensation-strategies-drive-talent-success-in-the-aec-industry, 2026-03) [déclaratif, estimation générale].

Part des petits cabinets
19. 74 % des entreprises d'architecture sont des solos ou cabinets de moins de trois architectes
    (AIA Small Firm Compensation & Benefits Report cité par ARCHITECT, https://www.architectmagazine.com/practice/small-firms-are-carrying-architecture-and-feeling-the-squeeze/, 2026-02) [vérifié, source secondaire].
20. 90 % des cabinets A&E ont entre 1 et 50 employés (Monograph 2026, URL ci-dessus, 2026-10)
    [déclaratif]. La part exacte « moins de 10 personnes » du AIA Firm Survey Report 2024/2026
    n'a pas pu être lue (rapport payant, 289 $, résumé derrière formulaire) : non trouvé.

Pipeline (bonus)
21. 116 000 architectes US en 2024 (-4 %), 123 398 en 2025 (+6 %) ; 12,3 ans pour obtenir la
    licence ; 36 à 38 % d'abandon (NCARB by the Numbers 2025 et 2026,
    https://www.ncarb.org/publications/2025-ncarb-the-numbers-pdf et https://www.ncarb.org/publications/2026-ncarb-the-numbers-pdf) [vérifié].

## 5. Ce que les rapports ne disent pas (zones blanches pour l'étude)

- Aucun rapport lu ne quantifie les douleurs de production (coordination BIM, RFIs, submittals,
  permis, spécifications) ; le rapport AIA « Architect's Journey to Specification » existe mais
  son contenu est derrière un formulaire.
- Les enquêtes d'éditeurs (Deltek, Monograph, BQE) ne publient en clair que ce qui sert leur
  produit : utilisation, encaissement, IA. Les chiffres BQE (« 3 000+ cabinets ») n'ont pas pu
  être lus du tout.
- Aucune source ne chiffre l'usage d'Excel dans les cabinets d'architecture US de façon sourcée
  (le 78 % de Monograph n'a pas de référence).

## 6. Sites et pages inaccessibles ou non trouvées

- WebSearch : budget épuisé pour toute la session, aucune recherche possible.
- Reddit (old.reddit.com, r/Architects annual survey) : domaine bloqué par l'outil de lecture.
- AIA Firm Survey Report 2024 et 2026 : page de présentation seulement, rapport payant (289 $),
  résumé gratuit derrière formulaire ; aucun chiffre lisible (part des cabinets < 10 personnes,
  adoption IA par taille : non trouvé).
- AIA Compensation & Benefits Report 2025 : seul le communiqué a pu être lu.
- Deltek Clarity 46e édition (2025) et 45e (2024) : pas de communiqué ni de page trouvée ; le
  rapport 47e est derrière formulaire (seuls le communiqué, la page de synthèse et un recap de
  webinaire ont été lus). Scorecard Clarity : sans chiffres.
- BQE « State of A&E » : n'existe pas sous ce nom ; les rapports « 2025 Architecture Benchmarking »
  et le webinaire « Workforce Strategy » sont derrière formulaire, aucun chiffre lisible.
- Zweig Group : les rapports Principals, Operating Expenses, Financial Performance, Fee + Billing
  ne sont accessibles que via des communiqués ou des billets The Zweig Letter (utilisés) ; page
  https://zweiggroup.com/blogs/news/the-one-number-to-track-in-your-aec-firm en 404 ;
  collection « research » en 404.
- PSMJ : https://www.psmj.com/blog en 404 (les billets sont sur go.psmj.com) ; rapport Financial
  Performance Benchmark 2025 payant (897 $), seules les métriques listées sont visibles.
- Archinect Salary Poll : https://archinect.com/salary-poll et /salaries en 404 ; non trouvé.
- NBS Digital Construction Report 2024/2025 : pages devinées en 404, sitemap (3,6 Mo) parcouru
  partiellement sans trouver l'URL du rapport ; non trouvé.
- Dodge Data & Analytics : la page ressources ne liste aucun SmartMarket Report sur les cabinets de
  conception ; « Digital Maturity SmartMarket Report » annoncé mais non publié.
- McKinsey « Reinventing construction » : 404 puis 503 sur les deux chemins ; non lu.
- Autodesk State of Design & Make : 403 sur autodesk.com ; chiffres 2024 lus via Architosh
  (76 % font confiance à l'IA, près de la moitié citent l'accès aux talents comme frein), édition
  2025 non lue.
- Harvard JCHS « Improving America's Housing 2025 » : 503 et limitation du contrôle de sécurité ;
  non lu.
- AEC Magazine et Architosh : recherches internes sans résultat sur des enquêtes récentes IA/BIM
  (résultats de 2009-2017 seulement).
- AIA Small Firm Exchange : https://www.aia.org/community/small-firm-exchange en 404.
- AIA « Journey to Specification » : page de présentation sans chiffre, rapport derrière formulaire.
- engineeringmanagementinstitute.org : l'URL « ...2024 » affiche l'édition 2026 du rapport ;
  l'édition 2024 (32 % de burnout fréquent cité par Monograph) n'a pas été lue directement.
- Limitation temporaire du contrôle de sécurité (rate limit) rencontrée sur theaiatrust.com,
  info.deltek.com, mckinsey.com, jchs.harvard.edu, architectmagazine.com ; une seconde tentative a
  réussi pour AIA Trust, Deltek et ARCHITECT.
