# Notes du fragment « Résidentiel, design-build et architecture d'intérieur (annexe) »

Date de travail : 2026-11-07. Fichier de données : `02_frag_residentiel_interieur.jsonl` (36 outils, JSON valide).

## 1. Décompte

- 36 outils documentés : 14 « Résidentiel », 11 « Mobile et croquis » (dont les outils de relevé LiDAR), 11 « Architecture d'intérieur (annexe) ».
- Tous les prix sont datés du relevé et proviennent des pages éditeur quand elles étaient lisibles. Quand la page éditeur était rendue en JavaScript ou en 403, j'ai pris un agrégateur daté (PricingSaaS, toolradar, costbench, projul, superdupr) et je l'ai dit dans le champ.
- Les faits de « connaissance générale » (siège, année) que je n'ai pas pu vérifier sont marqués « à vérifier » dans le champ, jamais présentés comme vérifiés.

## 2. Le marché résidentiel US en chiffres (AIA Firm Survey Report 2024) [vérifié]

Source principale : https://www.aia.org/aia-architect/article/latest-insights-2024-firm-survey-report (consulté 2026-11-07) et l'infographie officielle https://aia.org/sites/default/files/2024-11/AIA_2024_firm_survey_report_Infographic.pdf (PDF lu avec pdftotext le 2026-11-07).

- Plus de 19 000 cabinets d'architecture aux États-Unis.
- 28 % sont des praticiens seuls ; 32 % ont 2 à 4 salariés ; 15 % ont 5 à 9 salariés : « about 75% » des cabinets ont moins de 10 personnes.
- Les petits cabinets (< 10) représentent 11,5 % des effectifs et 7,40 % des honoraires (FAQ AIA Small Firm Exchange, basée sur le Firm Survey 2024 : https://communityhub.aia.org/blogs/kathleen-simpson/2024/06/12/faq-what-is-a-small-firm, consulté 2026-11-07 ; décompte cité : 14 895 petits cabinets, dont 5 505 solos).
- Entre 2015 et 2023, la part des honoraires captée par les petits cabinets a été divisée par deux, celle des cabinets moyens a reculé de 40 %, celle des grands a progressé de 40 %.
- Le résidentiel pèse environ 20 % des revenus de conception 2023 (80 % non résidentiel), dont seulement 8 % pour la maison individuelle, alors que la maison individuelle (construction et rénovation) représente plus de 40 % des dépenses de construction de bâtiments : c'est l'écart structurel qui explique que les petits cabinets résidentiels vivent avec une stack « constructeur » (Chief Architect, SoftPlan, Buildertrend, Houzz Pro) plutôt qu'une stack « agence ».
- Infographie : les cabinets déclarent 22 % de leur valeur de contrats de construction en résidentiel ; honoraires bruts 2023 de 104,1 Md$ ; un tiers des cabinets utilisent l'IA au quotidien (27 % des petits, 42 % des moyens, 61 % des grands) ; rentabilité moyenne 13,2 % ; 143 000 $ d'honoraires nets par salarié.
- Repère historique : le résidentiel était passé de 18 % (2018) à 28 % (2021) des honoraires pendant la pandémie, et 52 % des petits cabinets utilisaient le BIM sur projets facturables en 2021 contre 37 % en 2019 (Archinect, 2022-11-09, sur le Firm Survey 2022 : https://archinect.com/news/article/150329757/almost-half-of-architecture-billings-include-work-to-existing-buildings-says-aia-survey).
- Attention : la page https://www.aia.org/resource-center/aia-firm-survey-report-2024 consultée le 2026-11-07 affiche une date « November 2, 2026 » et « data from 900 firms », ce qui suggère qu'une édition 2026 vient de sortir ; non vérifié au-delà de cette page.

## 3. Chief Architect, SoftPlan et Higharc : qui traite quoi

- **Chief Architect** est traité par l'agent CAD/BIM. Pour le présent fragment, retenir son poids : l'éditeur (Coeur d'Alene, Idaho, logiciel né en 1992) se présente comme « the market-leading home design software for residential design » [déclaratif, https://www.chiefarchitect.com/company/]. Premier coûte 229 $/mois ou 1 995 $/an (relevé 2026-11-07, https://www.chiefarchitect.com/products/). Twindo (ex-Canvas) livre ses conversions Scan-to-CAD directement en format Chief Architect, ce qui est un bon indicateur de sa part chez les designers résidentiels. La gamme grand public Home Designer (79 $/mois ou 495 $/an) est documentée dans le JSONL comme porte d'entrée vers Premier.
- **SoftPlan** n'ayant pas été confirmé ailleurs, il est documenté ici : passage à l'abonnement pur (169 $/mois par poste, 79 $/mois pour les anciens licenciés depuis le 2025-04-01, licences perpétuelles supprimées), « AI Enhanced Render ».
- **Higharc** est traité par l'agent IA ; non repris.
- **Lumion / Twinmotion / Enscape / SketchUp + V-Ray** sont traités par l'agent visualisation ; non repris.
- **Polycam, Matterport, Morpholio Trace, Shapr3D** : la consigne demandait de vérifier s'ils étaient traités ailleurs. Aucun fragment des autres agents n'était présent dans `_travail/` au moment de l'écriture, je les ai donc documentés ici. Contrôle fait en fin de session (grep sur les fragments arrivés entre-temps) : **Polycam, Matterport, Morpholio et Twindo/Canvas figurent aussi dans `02_frag_visualisation.jsonl`**, Matterport aussi dans `02_frag_chantier.jsonl`, **Arcol et Higharc dans `02_frag_ia_design.jsonl`**. Shapr3D, SoftPlan, Cedreo, Houzz Pro, magicplan et Concepts ne sont documentés qu'ici. Le coordinateur doit dédoublonner Polycam, Matterport, Morpholio Trace, Twindo et Arcol (mes lignes apportent les prix App Store et les plaintes utilisateurs, à fusionner plutôt qu'à jeter).

## 4. Outils écartés et pourquoi

- **CoConstruct** : fusionné dans Buildertrend (rachat du 2021-02-24, plus vendu, fin d'ajout de projets le 2027-03-31). Traité dans la ligne Buildertrend.
- **Ivy** : racheté par Houzz en février 2018 et absorbé dans Houzz Pro (lancé avril 2020). Traité dans la ligne Houzz Pro.
- **Chief Architect Interiors** : relève de l'agent CAD/BIM.
- **Enscape, SketchUp + V-Ray, Lumion, Twinmotion** : agent visualisation.
- **Higharc** : agent IA.
- **Cubicasa** : site cubi.casa en 403, fiches App Store et Google Play introuvables aux identifiants testés, aucune page agrégateur accessible ; aucun prix ni avis vérifiable, donc non inscrit pour ne rien inventer.
- **Angi / HomeAdvisor, Thumbtack, Sweeten, Zillow, Houzz (marketplace)** : places de marché de prospects, pas des SaaS d'architecte ; pages pro en 403, 404 ou vides, prix de lead non publiés. Seul élément chiffré retenu : la publicité Houzz « à partir de 499 $/mois » (page tarifs Houzz Pro, 2026-11-07), consigné dans la ligne Houzz Pro.
- **Punch! Software** : site en 403, produit grand public historique, aucune donnée vérifiable.
- **SampleBoard, Gather (gather.design)** : domaines non résolus depuis la session (hors liste réseau autorisée), impossibles à documenter.
- **Canva, Apple Freeform, Dwell, Rilla, Spacely, DesignSpec, Specifi, Reflex, Mozaik** : soit génériques (Canva, Freeform), soit sans rapport clair avec la pratique d'architecte, soit introuvables sans recherche web supplémentaire. Non documentés.
- **Chief Architect 3D Viewer, SoftPlan reView** : visionneuses gratuites rattachées à leur logiciel parent.

## 5. Sites et sources inaccessibles

- **G2** : 403 sur toutes les pages produit. Notes G2 reprises uniquement via les extraits de recherche (Buildertrend 4.3, Houzz Pro 4.1, magicplan 4.3) ; sinon « non trouvé ».
- **Capterra, Software Advice, GetApp, TrustRadius, SaaSworthy, Krowdbase** : 403 au fetch. Notes Capterra reprises via extraits de recherche (Houzz Pro 4.3 / 1 088, DesignFiles 4.6 / 534, Mydoma 4.2 / 80, SoftPlan 4.5 / 15, magicplan 4.5 / 12, Buildertrend 2 487 avis sans valeur de note).
- **buildertrend.com** (about, pricing), **buildxact.com**, **constructiononline.com**, **cubi.casa**, **cyncly.com**, **foyr.com**, **fohlio.com/pricing**, **punchsoftware.com**, **sweeten.com** : 403.
- **contractorforeman.com/pricing**, **magicplan.app/pricing**, **matterport.com/pricing** : contenu rendu en JavaScript, montants illisibles (repris via toolradar ou App Store).
- **cedreo.com/pricing** : montants non visibles dans le HTML (repris via PricingSaaS, instantané du 2026-11-02).
- **Reddit** : impossible à exploiter sans recherche web (budget de recherche partagé épuisé en cours de session, voir § 8).

## 6. Les 7 outils les plus importants de la catégorie

1. **Buildertrend** : référence du design-build résidentiel US, utilisateurs illimités, a absorbé CoConstruct ; mais prix désormais non publiés et hausses répétées dénoncées par les utilisateurs, ce qui ouvre un espace aux challengers.
2. **Houzz Pro** : seul outil qui couple apport de prospects (marketplace Houzz, 65 M d'utilisateurs revendiqués) et gestion d'affaires (Ivy intégré), avec un plan gratuit ; 1 088 avis Capterra à 4.3.
3. **JobTread** : challenger en forte visibilité, grille publique simple (199 $/mois + 20 $/siège), support noté 9.9/10 sur G2, la plainte principale est le coût par siège quand l'équipe grossit.
4. **SoftPlan** : avec Chief Architect, l'un des deux logiciels de conception « maison » des designers résidentiels ; bascule complète en abonnement en 2025.
5. **Cedreo** : outil de vente 3D pour constructeurs et rénovateurs, plans publics (79 à 159 $/mois), présence US à Atlanta, mais érosion du gratuit en juin 2026.
6. **magicplan** : standard du relevé mobile (41 000 notes App Store à 4.7), nouvelle tarification au projet avec utilisateurs illimités.
7. **Studio Designer** : système comptable et achats de référence des studios d'intérieur (20 000 designers revendiqués), vient de racheter Mydoma Studio, ajoute une couche IA payante (20 à 50 $/mois) ; note Capterra faible (3.0) à surveiller.

Mentions : Polycam (44 000 notes App Store, mais friction sur les paliers), Twindo (ex-Canvas, modèle au pied carré qui livre directement en Chief Architect / SketchUp / Revit), DesignFiles (534 avis Capterra à 4.6, prix lisibles).

## 7. Signaux de douleur utilisateur repérés

- **Prix opaques et hausses** : Buildertrend a retiré sa grille publique en 2026 et passe au devis par volume de construction ; témoignages de +65 % (ContractorTalk, 2022) et de factures qui « frôlent 1 000 $/mois » (Reddit, 2025) ; anciens CoConstruct : « +500 % » et support « équipe squelette » (Reddit, 2024). Sources : https://projul.com/blog/buildertrend-pricing-analysis-2026/ , https://projul.com/blog/coconstruct-pricing-analysis-2026 , https://costbench.com/software/construction-management/buildertrend/ (« it's a red flag when you can't access pricing from the website », Reddit cité).
- **Verrouillage des données** : « forcé de continuer à payer une plateforme que je n'utilise plus » pour garder l'accès aux données (Capterra, cité par projul 2026).
- **Outils trop lourds pour un petit cabinet** : Buildertrend « pas intuitif, ne se relie pas bien » (Capterra) ; Houzz Pro « beaucoup à apprendre, parfois écrasant » et « outil de dessin faible » (G2, https://www.g2.com/products/houzz-pro/reviews) ; JobTread « lourd pour qui veut juste un planning » (https://superdupr.com/blog/jobtread-review).
- **Paliers mobiles frustrants** : Polycam, plans et mesures réservés au Business, « le Pro ne sert pas à grand-chose », fichiers perdus après essai facturé 400 $, tarif promo non honoré (App Store US, 2025 : https://apps.apple.com/us/app/polycam-lidar-3d-scanner/id1532482376) ; magicplan « encore un peu dépouillé », courbe d'apprentissage (App Store US, 2022 : https://apps.apple.com/us/app/magicplan/id427424432).
- **Coût par siège** : JobTread, DesignFiles (+30 $/siège), Programa (+31 $/siège), Houzz Pro (+50 $/siège) : la facture d'un cabinet de 5 à 9 personnes double vite ; argument marketing central de Buildertrend (utilisateurs illimités) et de magicplan (nouvelle grille).
- **Onboarding payant obligatoire** : Mydoma 450 $ sans essai ; Buildertrend 400 à 1 500 $ selon sources tierces.
- **Fin des gratuits** : Cedreo supprime les rendus du plan Free (juin 2026, https://pricingsaas.com/companies/cedreo) ; SoftPlan supprime les licences perpétuelles (https://ww2.softplan.com/?page_id=837).
- **Fiabilité comptable** : intégration QuickBooks Online de Buildertrend jugée peu fiable (costbench, 2026) ; Mydoma, facilité d'utilisation 3.9/5 (Capterra).
- **Perte de données sur apps créatives** : Procreate sans compte ni sauvegarde cloud (App Store, 07/2025) ; Concepts plante en désactivant la grille (App Store, 02/2025).

## 8. Limites de ce fragment

- Le budget de recherche web partagé entre agents (200 requêtes par tour) a été épuisé après mes 17 premières requêtes ; le reste du travail s'est fait par lecture directe des pages (WebFetch), avec une limite de contrôle de domaine qui a bloqué une salve entière avant de se rétablir.
- Conséquences : pas de dépouillement Reddit (« residential architect software stack »), pas de notes G2 pour une vingtaine d'outils, prix manquants pour Buildxact, UDA, Contractor Foreman (hors « à partir de 49 $ »), Foyr Neo, Fohlio, 2020 Design Live, Materio, Cubicasa.
- Les colonnes points_forts / points_faibles sont « non trouvé » quand aucun avis utilisateur n'a pu être lu ; je n'ai pas comblé avec du marketing.
- À compléter dans une passe ultérieure avec un budget de recherche : Reddit r/Architects et r/InteriorDesign, notes G2 manquantes, pages Capterra (accessibles en curl simple mais le contournement d'anti-bot n'est pas autorisé depuis cette session).
