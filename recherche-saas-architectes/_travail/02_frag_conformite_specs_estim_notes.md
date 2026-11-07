# Notes : Conformité, permis, spécifications, estimation, appel d'offres (étapes 2, 6, 7, 8, 10)

Date du relevé : 2026-11-07. Fichier de données : `02_frag_conformite_specs_estim.jsonl` (46 objets).

## Nombre d'outils documentés

46 lignes JSONL, réparties ainsi :

- Conformité et permis : 16 (UpCodes, ICC Digital Codes Premium, MADCAD, Symbium, Archistar AI PreCheck, PermitFlow, Pulley, GreenLite, Blitz AI, CodeComply.ai, Autodesk Model Checker, Solibri, Accela, Clariti/Camino, ePermitHub, Avolve)
- Zonage et faisabilité : 5 (Zoneomics, Gridics, Deepblocks, Regrid, LightBox Vision ex-LandVision)
- Spécifications : 6 (Deltek Specpoint, ARCAT, Conspectus Cloud, SpecsIntact, Sweets, Material Bank)
- Estimation : 10 (RSMeans Data Online, ProEst, DESTINI Estimator, Kreo, Togal.AI, STACK, PlanSwift, RIB CostX, Autodesk Takeoff, Join)
- Appel d'offres : 9 (BuildingConnected, ConstructConnect, PlanHub, Dodge Construction Network, Procore Bid Management, Pantera Tools, Bid Express/BidX, Euna Procurement ex-Bonfire, DemandStar)

Plusieurs marques de la liste de départ sont fusionnées dans une ligne existante parce qu'elles n'existent plus comme produits distincts : SpecLink (BSD), Avitru et SpecBuilder Cloud dans Deltek Specpoint (SpecBuilder Cloud retiré fin 2025, source education.deltek.com) ; iSqFt, BidClerk et SmartBid dans ConstructConnect (bidclerk.com redirige vers "BidClerk is Now ConstructConnect Project Intelligence", isqft.com redirige vers projects.constructconnect.com) ; Verifi3D (Xinaps) dans Solibri (verifi3d.xinaps.com redirige vers solibri.com/checkpoint, produit "legacy, plus disponible pour les nouveaux clients") ; Camino dans Clariti ("Camino is now a Clariti brand") ; The Blue Book dans Dodge Construction Network (listé comme produit Dodge sur construction.com) ; Bonfire et DemandStar sous Euna Solutions.

## Limite majeure de cette session

Le budget de recherche web partagé (200 requêtes par tour pour tous les agents) a été épuisé après ma troisième salve. J'ai continué uniquement par récupération directe de pages dont je connaissais l'URL (sites éditeurs, boutiques, Trustpilot, SourceForge, presse). Conséquences :

- Les discussions Reddit demandées ("how do you write specs small firm", "cost estimating as an architect", "permit expediter software", "UpCodes worth it") n'ont pas pu être recherchées. À reprendre dans une session suivante.
- La recherche "AI specifications architects startup 2025" n'a pas pu être faite. Seuls signaux IA relevés en spécifications : "Dela AI Orchestrator" dans la navigation Deltek (sans détail), et Copilot d'UpCodes qui annonce pouvoir alimenter des "early spec drafts".
- Zonda, Zonar, Buildee, Cerberus, Specifi, Hemming, Cost Catalyst, Cumulus n'ont pas pu être identifiés comme produits de la catégorie (pas de recherche possible). Non documentés.

## Outils écartés et pourquoi

- Reonomy (Altus Group) : prospection immobilière commerciale (propriétaires, dettes), pas d'usage architecte identifié ; prix par siège non publié. Hors périmètre.
- NBS Chorus : le site thenbs.com ne mentionne ni MasterFormat ni contenu US (classification Uniclass, entité Hubexo North UK Ltd) ; thenbs.com/us renvoie 404. Pas de présence commerciale US établie.
- e-SPECS (InterSpec) : e-specs.com est un domaine parqué "may be for sale" ; interspecinc.com ne résout pas (hôte hors réseau autorisé ou disparu). Statut : probablement disparu, à confirmer.
- Speckel : site speckel.com en erreur 503. Non documenté.
- Swatchbox : page d'accueil réduite à un titre ("material samples from the world's leading brands"), aucune information exploitable. Non documenté (voisin de Material Bank).
- GreenBuildingAdvisor : média, pas un logiciel. Hors périmètre.
- Doxel (suivi d'avancement par capteurs), DigiBuild (achats de matériaux), Clearstory (ordres de modification pour entrepreneurs) : outils d'entreprises de construction, hors périmètre architecte.
- Sage Estimating : outil d'entrepreneurs ; sage.com renvoie 403. Non documenté.
- Buildxact : outil résidentiel pour constructeurs ; buildxact.com/us/pricing et /pricing renvoient 403. Non documenté.
- Houzz Pro et Bluebeam (métrés, revue de plans) : laissés aux catégories gestion de cabinet et documents de construction (mentionnés seulement).
- BIMsmith : laissé à la catégorie bibliothèques. TestFit et Giraffe : traités par l'agent IA. Deepblocks est documenté ici avec un signalement de doublon possible.
- AccessibilityChecker / "ADA tools" : aucun produit nommé identifiable sans recherche ; UpCodes et CodeComply.ai couvrent l'ADA dans leurs contrôles.

## Sites inaccessibles au relevé (2026-11-07)

- 403 : g2.com (toutes les pages), capterra.com et capterra.ca, getapp.com, trustradius.com, softwareadvice.com, arcat.com (y compris /arcatect), madcad.com, sage.com, buildxact.com, houzz.com/pro/pricing, thebluebook.com, autodesk.com/products/proest et /forma-takeoff, up.codes/pricing (rendu vide, mais cms-v2.up.codes/pricing a répondu), planetizen.com, downtobid.com (429 puis 403).
- 503 : speckel.com, specsintact.ksc.nasa.gov.
- 404 : symbium.com/pricing (redirection http puis limitation), withpulley.com/pricing, kreo.net/about, materialbank.com/about-us et /press, stackct.com/about, infotechinc.com/bidx/pricing, network.demandstar.com/pricing, constructconnect.com/smartbid, thenbs.com/us.
- Contrôle de sécurité de domaine limité (pas de seconde chance) : deltek.com (page produit Specpoint), eng-tips.com (deux fils utilisateurs), symbium.com/pricing, casemine.com, businesswire.com, refreshmiami.com a répondu à la 2e tentative, techcrunch.com idem.
- DNS non résolu : interspecinc.com.

Conséquence : les notes G2 ne sont disponibles que via des résumés de recherche (BuildingConnected Pro 4,4 sur 34 avis ; ConstructConnect 4,4 sur 402 avis via rfp.wiki ; Solibri Office 4,5 sur 1 avis ; UpCodes 0 avis G2 et 5,0 sur 3 avis Capterra de 2017). Les points forts et faibles proviennent de Trustpilot, SourceForge, forums et presse quand les agrégateurs étaient bloqués ; quand rien n'était accessible, la fiche le dit explicitement.

## Les 7 outils les plus importants de la catégorie

1. UpCodes : référence de la recherche de codes pour architectes US (6 700 codes, 80+ juridictions maintenues, 800 000 utilisateurs mensuels déclarés, clients SOM, AECOM, Stantec, BIG), prix public clair (39 à 68 $/mois/utilisateur), Copilot IA depuis 2023, AI Plan Review en accès anticipé ; a gagné sur le fond contre l'ICC (usage loyal, fin 2020) mais la plainte pour publicité trompeuse a été partiellement rétablie par le 2e circuit en juillet 2022.
2. Deltek Specpoint : monopole de fait sur AIA MasterSpec (mises à jour exclusives depuis 2024) après absorption de SpecLink et retrait de SpecBuilder Cloud fin 2025 ; prix sur devis, hausse forte rapportée par un utilisateur.
3. RSMeans Data Online (Gordian) : base de coûts de référence pour l'estimation d'esquisse, grille publique de 408 à 5 973 $/an.
4. ConstructConnect (avec iSqFt, BidClerk, SmartBid, PlanSwift) : consolidateur des leads et de l'appel d'offres, 402 avis G2 à 4,4 mais Trustpilot à 1,7/5 pour annulation et support.
5. BuildingConnected (Autodesk) : réseau d'appel d'offres dominant chez les GC, pertinent pour l'architecte en phase bidding ; IA de recommandation et d'extraction.
6. PermitFlow : le plus financé des permis (série B 54 M$ menée par Accel en décembre 2025, environ 91 M$ au total), agents IA, cible explicitement les architectes.
7. Archistar AI PreCheck : la revue de plans IA la plus déployée côté villes US (Austin, Los Angeles ville et comté, Malibu, Yonkers, Cape Coral), avec API Code Connect de l'ICC ; ce sont les villes qui l'achètent, mais l'architecte y soumet ses dossiers.

Mention : Symbium (Plancheck, permis instantanés en Californie), CodeComply.ai (3 000 $/siège/an, Patrick Murphy), Kreo (métré IA avec grille publique 1 200 à 2 100 $/utilisateur/an) et Zoneomics (zonage à 92 et 279 $/mois) sont les challengers à suivre.

## Signaux de douleur utilisateur les plus fréquents

- Résiliation et facturation : ConstructConnect, "trying to cancel my subscription has been far more difficult than it should be" (Trustpilot, mai 2026) et remboursement de 2 200 $ non obtenu (octobre 2026) : https://www.trustpilot.com/review/constructconnect.com ; STACK, "getting them to stop charging me has been a completely different story" (septembre 2026) : https://www.trustpilot.com/review/stackct.com
- Passage du perpétuel à l'abonnement : PlanSwift, licence "à vie" de 2019 devenue abonnement, prix plus que doublé à 750 $ en 2026 (Trustpilot, août 2026) : https://www.trustpilot.com/review/planswift.com
- Hausse de prix lors de migrations forcées : Deltek Specpoint, devis "plus de 5x ce que nous payons pour MasterSpec" (eng-tips, fil 501858) : https://www.eng-tips.com/viewthread.cfm?qid=501858 ; retrait de SpecBuilder Cloud fin 2025 : https://education.deltek.com/web/rsl/specificationsolutions/specpoint/portal/specpoint%20customer%20assistance%20program/the-future-of-specbuilder-cloud-faq.html
- Prix opaques et devis obligatoires : PermitFlow, Pulley, GreenLite, Archistar, Blitz, Clariti, Accela, Dodge, Join, DESTINI, Procore ; PermitFlow jugé "overkill" pour quelques permis par an : https://fieldservicesoftware.io/software/permitflow/
- Leads de mauvaise qualité : PlanHub, "scrapping projects off of public school websites is not a product" (Trustpilot, février 2026) : https://www.trustpilot.com/review/planhub.com ; ConstructConnect, valeur des leads contestée : https://www.rfp.wiki/vendors/constructconnect
- Niveau gratuit verrouillé : STACK, compte gratuit bloqué pour usage jugé excessif (Trustpilot, septembre 2026).
- IA de métré qui s'arrête à mi-chemin : Kreo, "it can automeasure but then you are left figuring out formulas for how much drywall you need" (Trustpilot, février 2023) : https://www.trustpilot.com/review/kreo.net
- Fiabilité non auditée des IA de code : UpCodes Copilot sans audit public d'exactitude (datadrivenaec.com) : https://datadrivenaec.com/tools/upcodes ; Archistar sans évaluation indépendante (bdcnetwork.com, 2024) : https://bdcnetwork.com/austin-texas-adopts-ai-driven-building-permit-software
- Outils municipaux opaques pour le demandeur : Accela, Clariti, ePermitHub, Avolve ne décrivent pas le parcours de dépôt de l'architecte sur leurs sites.

## Contexte : litige ICC contre UpCodes

- Fin 2020 : un tribunal fédéral juge que l'usage des codes par UpCodes relève du fair use (usage éducatif ou transformatif). Source : https://www.bdcnetwork.com/codes-and-standards/news/55163898/court-ruling-gives-upcodes-upper-hand-in-fight-over-building-codes-database (article du 8 janvier 2021).
- 29 juillet 2022 : la cour d'appel du 2e circuit (International Code Council, Inc. v. UpCodes Inc., 43 F.4th 46) réforme en grande partie le rejet par le SDNY de la plainte de l'ICC pour publicité trompeuse (Lanham Act et GBL New York) : l'ICC a suffisamment allégué la fausseté de certaines affirmations d'UpCodes, les énoncés de type "complete understanding" restent de la puffery non actionnable. Sources : https://www.leagle.com/decision/infco20220729061 ; https://www.studicata.com/summaries/united-states-court-of-appeals-second-circuit/international-code-council-inc-v-upcodes-inc-2022-1yy6uw/ ; https://www.casemine.com/commentary/us/clarifying-false-advertising-claims-and-puffery:-icc-v.-upcodes-precedents/view
- Suite après renvoi (règlement ou jugement) : non trouvée.
