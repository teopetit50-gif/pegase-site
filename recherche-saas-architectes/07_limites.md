# 07. Limites, incertitudes et contrôle qualité

Date : 2026-11-07.

## 1. Conditions de collecte

- L'étude a été menée en une session, depuis un environnement cloud avec un quota de recherche web
  partagé (200 requêtes par tour) et un outil de lecture de pages soumis à des refus de domaines. Dix
  agents de collecte ont travaillé en parallèle pour la découverte des outils et la voix des
  architectes, puis le reste (consolidation, fiches, matrice, opportunités, synthèse, contrôle) a été
  fait par l'orchestrateur seul, à la demande du commanditaire, pour limiter la consommation.
- Toutes les sources ont été consultées le 2026-11-07. Les prix sont ceux affichés ce jour ; les
  éditeurs changent leurs grilles plusieurs fois par an (Bluebeam juin 2024, Lumion 2026, Harvest 2026,
  Twinmotion avril 2024, Cedreo juin 2026, AIA Contract Documents janvier et février 2026).

## 2. Sources inaccessibles

| Source | Statut le 2026-11-07 | Conséquence |
|---|---|---|
| g2.com, capterra.com (toutes extensions), trustradius.com, softwareadvice.com, getapp.com | HTTP 403 en lecture directe | Notes G2 et nombre d'avis repris des extraits de recherche pour une cinquantaine d'outils ; « non trouvé » pour environ 200 outils ; les avis 1 à 3 étoiles ont été lus sur Trustpilot, Slashdot, SourceForge, FinancesOnline, SoftwareSuggest, App Store (flux RSS officiel) et dans les forums |
| reddit.com, old.reddit.com | bloqués par l'outil de lecture ; JSON et RSS en 403 ou 429 | 12 items Reddit seulement, tous tirés d'extraits de recherche ; aucun miroir lu pour ne pas contourner le blocage ; l'enquête annuelle de r/Architects et les fils « what software does your firm use » n'ont pas été dépouillés |
| autodesk.com (toutes pages), forums.autodesk.com (partiellement) | HTTP 403 | Prix de Revit, AutoCAD, AEC Collection, BIM Collaborate Pro, Docs, Forma Build relayés par des tiers (renderahouse, CDW, rfp.wiki, pricingsaas) et étiquetés [secondaire] ; fonctions IA Revit et ACC non vérifiées |
| bls.gov | page « Access Denied » pour les accès automatisés | Emploi et salaire médian des architectes (OEWS mai 2024 et 2025) repris de sites tiers [secondaire] |
| data.census.gov | non consulté | Établissements NAICS 541310 repris d'un agrégateur [secondaire] |
| aia.org (pages ABI, article Firm Survey, infographie) | lues par les agents de collecte via l'outil de lecture, mais HTTP 403 en revérification par script | Chiffres ABI août 2026 (IA), septembre 2026 (carnet), mai 2025 (utilisation) non revérifiés en phase 7 ; infographie 2024 confirmée par extrait de recherche |
| AIA Firm Survey Report 2024 et 2026 (rapport complet) | payant (289 $), résumé derrière formulaire | Répartition 10-49 et 50+, modes de facturation détaillés, chapitre technologie non lus ; l'édition 2026 (2 novembre 2026, 900 cabinets) n'a pas pu être exploitée |
| Deltek Clarity 47e édition (rapport) | derrière formulaire | Seuls le communiqué, la page de synthèse et un recap de webinaire ont été lus |
| BQE « State of A&E » | n'existe pas sous ce nom ; benchmarks derrière formulaire | Aucun chiffre BQE indépendant |
| NBS Digital Construction Report 2023-2025, Dodge SmartMarket, McKinsey, Harvard JCHS, Archinect Salary Poll, AIA Small Firm Exchange (page) | 404, 503 ou introuvables | Pas de part de marché BIM récente ; les estimations de part de marché CAD/BIM datent de 2014 à 2019 |
| CGarchitect (sondage moteurs de rendu) | dernière édition 2021, site racheté par Chaos | Parts d'usage des moteurs de rendu datées et hébergées par un éditeur de la catégorie |
| Sites éditeurs en 403, 404 ou rendu JavaScript | twinmotion.com, unrealengine.com, d5render.com, buildertrend.com, arcat.com, bimobject.com, sage.com, gusto.com, canva.com, pipedrive.com, microsoft.com (503), aiacontracts.com/pricing (404), bqe.com/about (404), newforma.com/about (404), mosaicapp.com/about (404), symbium.com/pricing, hypar.io/pricing, vizcom.com/pricing, pollination, solemma, holobuilder, constructiononline, projectmates, architrac, cubi.casa, speckel.com, e-specs.com (domaine en vente), interspecinc.com (DNS) | Prix ou données de société « non trouvé » ou [secondaire] pour ces outils |
| forum.lumion.com, wiki.freecad.org, community.graphisoft.com (certains fils), forums.augi.com, eng-tips.com | Cloudflare Access, anti-bot ou 403 | Citations reprises d'extraits de recherche quand elles y figuraient mot pour mot |

## 3. Ce qui n'a pas pu être vérifié ou fait

- **Part de marché des outils CAD/BIM aux États-Unis** : aucune source 2024-2026 ; les chiffres
  cités (Archinect 2014, architect-us 2019, NBS UK 2015, Statista 2018 masqué) sont anciens ou
  étrangers. Le nombre d'avis G2 sert de proxy d'ordre de grandeur, pas de part de marché.
- **Qui décide de l'achat logiciel par fonction** : aucune enquête trouvée ; description qualitative
  seulement (voir 01, section 3.3).
- **Modes de facturation 2023 par méthode** : la ventilation « 32 % forfait, 32 % professional fee »
  vient d'un résumé Archinect dont l'article précis n'a pas été isolé (page de tag citée).
- **Chiffre « 79 % des cabinets prévoient des investissements IA » (Zweig 2026 IT Report)** : les
  autres chiffres de la page (3,5 %, 36,7 %, 0,8 %, 6 %) ont été revérifiés, mais « 79 % » n'a pas
  été retrouvé littéralement en phase 7 ; à relire sur la page.
- **Nombre de cabinets « plus de 19 000 »** : non retrouvé littéralement en revérification ;
  remplacé par une fourchette 19 000 à 20 000 [estimé] cohérente avec les décomptes de petits
  cabinets de l'AIA Small Firm Exchange.
- **Prix Unlimited AIA Contract Documents (2 199 $/an)** : absent de la page abonnement relue en
  phase 7 (page de paliers par sièges sans montant) ; source conservée : FAQ revendeurs 2026 (PDF)
  et page « learn ».
- **Notes G2 des outils de second rang** : « non trouvé » pour environ deux tiers des 300 lignes.
- **Avis utilisateurs pour les startups IA** (Snaptrude, Motif, SWAPP, TestFit, Symbium, Mosaic,
  qbiq, etc.) : aucun avis indépendant accessible ; fiches fondées sur les sites éditeurs et la presse,
  sections « aime / déteste » marquées « non trouvé ».
- **Startups IA de spécifications** et discussions Reddit sur les specs, l'estimation et les permis :
  recherche non aboutie faute de quota (lot conformité).
- **Outils cités mais non documentés faute de source** : ARCAT, Architizer, Canva, Justworks,
  Autodesk University, Cubicasa, Yulio, Workshop XR, Fuzor, Rendair, Allplan (présence US non
  vérifiée), Qonic, Catenda, Asite, Aconex, Genia, THRUX, Structured AI, ARKI, Mattoboard, Zenerate,
  SketchPro, Drafted, Spacial.
- **Twinmotion et l'Unreal Subscription 2026** : contradiction non tranchée entre un extrait de la
  page officielle (sortie du bundle au 27 mai 2026) et un blog tiers (toujours inclus).
- **D5 Render** : prix officiels non lus (site en 403), société et siège non identifiés.
- **Étapes amont du workflow** (2 faisabilité, 3 esquisse, 4 avant-projet, 8 estimation, 10 appel
  d'offres, 12 clôture) : moins de 5 items chacune dans la voix des architectes ; leurs scores dans
  `04` sont moins robustes que ceux des étapes de gestion et de chantier.
- **Segment « inconnu »** pour 208 des 396 items : les sites d'avis et forums ne donnent pas toujours
  la taille du cabinet ; la ventilation par segment repose sur 188 items.

## 4. Biais à garder en tête

- Les avis 1 à 3 étoiles ont été recherchés en priorité, conformément à la mission : le corpus
  surpondère les mécontents. Les notes moyennes (Monograph 4,5, Procore 4,6, Bluebeam 4,5) rappellent
  que la majorité des utilisateurs sont satisfaits ou résignés.
- Les témoignages publiés par les éditeurs (Monograph « customers », Deltek « customer stories »,
  BQE case studies) et les enquêtes d'éditeurs (Deltek Clarity, Monograph benchmarks, Zweig pour
  partie) sont marqués [déclaratif] ; ils n'ont jamais servi seuls à noter un problème.
- Les blogs de concurrents (Cogram sur Newforma, Monograph sur BQE et Harvest, mailmanager sur
  Newforma, projul sur Buildertrend, myarchitectai et renderahouse sur les prix) sont cités avec la
  mention « concurrent » ; leurs chiffres de prix sont [déclaratif tiers].
- Les forums Archinect et AIA Community Hub surreprésentent les cabinets US de petite et moyenne
  taille et les praticiens expérimentés ; les grands cabinets s'y expriment peu.
- Les scores de `04` sont une appréciation argumentée, pas une mesure ; un autre analyste pourrait
  déplacer un problème de deux à trois points.

## 5. Contrôle qualité : revérification de 25 affirmations chiffrées (2026-11-07, par lecture directe des pages)

| N° | Affirmation | Source | Résultat |
|---|---|---|---|
| 1 | AIA 2024 : 104,1 Md$, rentabilité 13,2 %, 143 000 $/salarié, 52 % neuf / 45 % rénovation | infographie AIA 2024 (PDF) | page en 403 pour le script ; confirmé par extrait de recherche (texte de l'infographie) ; la correspondance 61/42/27 % IA par taille n'est pas lisible dans l'extrait, conservée telle que lue par l'agent de collecte |
| 2 | 28 % solos, 32 % 2-4, 15 % 5-9, 75 % < 10 | AIA Architect | 403 pour le script ; confirmé par extrait de recherche |
| 3 | « plus de 19 000 cabinets » | AIA Architect | non retrouvé ; remplacé par 19 000 à 20 000 [estimé] |
| 4 | 11,5 % des effectifs, 7,4 % des honoraires, 14 895 petits cabinets | FAQ AIA SFx | confirmé (HTTP 200) |
| 5 | 116 000 architectes (-4 %), 12,9 ans | NCARB 2025 (PDF) | confirmé |
| 6 | 123 398 architectes | NCARB 2026 (PDF) | confirmé |
| 7 | ABI août 2026 : 48 %, 7 %, 15 %, 22 % | aia.org | 403 pour le script ; lu par l'agent de collecte avec citations exactes ; non revérifié |
| 8 | ABI septembre 2026 : 70 %, 3,8 mois, 6,2 mois | aia.org | idem |
| 9 | ABI mai 2025 : 72 % suivent l'utilisation, cible 77,5 % | aia.org | idem |
| 10 | DSO 72 jours (67 avant), WIP 18 jours | Zweig | confirmé (« increased from 67 days to 72 days ») |
| 11 | IT 3,5 % du revenu net, logiciels 36,7 %, formation 0,8 %, 6 % IA intégrée, 79 % investissent | Zweig IT 2026 | 3,5 / 36,7 / 0,8 / 6 % confirmés ; « 79 % » non retrouvé littéralement |
| 12 | 54 jours, 128 jours pour pourvoir un poste | Zweig Workforce 2026 | confirmé sur l'URL corrigée (…-recruiting-retention) ; l'URL initiale renvoie 404 |
| 13 | Deltek Clarity : 70 % IA, 38 % impact, utilisation < 60 %, marge 16,7 % | deltek.com | confirmé |
| 14 | Archicad 2 414 / 2 840 / 5 700 $ | graphisoft.com | confirmé |
| 15 | Bluebeam 260 / 330 / 440 / 590 $ | bluebeam.com | confirmé |
| 16 | Enscape 574,80 / 670,80 / 730,80 $ | chaos.com | confirmé |
| 17 | Monograph 45 à 490 $/mois | monograph.com | confirmé |
| 18 | UpCodes 39 / 59 / 68 $ | up.codes | confirmé |
| 19 | Part3 150 / 200 $, 9 000 $/an | part3.io | confirmé |
| 20 | SketchUp 129 / 399 / 859 $ | sketchup.trimble.com | confirmé (dans le code de la page) |
| 21 | Rhino 995 $, upgrade 595 $ | rhino3d.com | confirmé |
| 22 | Lettre ouverte : « 70%+ » de hausse | aecmag.com | confirmé |
| 23 | Twinmotion 445 $, seuil 1 M$ | aecmag.com | confirmé |
| 24 | Lumion Pro 1 149 $/an | lumion.com | confirmé |
| 25 | AIA Contract Documents Unlimited 2 199 $/an | aiacontracts.com | non retrouvé sur la page abonnement relue ; source conservée : FAQ revendeurs 2026 |
| 26 | PSMJ : 80 % en guerre des prix | go.psmj.com | confirmé |

Bilan : 19 confirmées par lecture directe, 2 confirmées par extrait, 3 non revérifiables (403),
2 non retrouvées et corrigées ou annotées. Chaque ligne du CSV porte au moins une URL et une date
(contrôle automatique dans `_travail/consolider_phase2.py` : 0 ligne sans source, 0 sans date).
