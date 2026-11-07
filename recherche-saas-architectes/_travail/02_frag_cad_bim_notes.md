# Notes, catégorie « CAD / BIM / modélisation » (relevé du 2026-11-07)

Fichier de données : `02_frag_cad_bim.jsonl` (27 lignes, validées avec `python3 -I` et le module json).

## 1. Nombre d'outils trouvés

27 outils documentés : Revit, Revit LT, AutoCAD (avec Architecture toolset) et AutoCAD LT, AEC Collection,
Forma, FormIt (en fin de vie), Dynamo, Archicad, Vectorworks Architect, SketchUp (Go, Pro, Studio, LayOut),
Rhino 9 + Grasshopper, Chief Architect Premier, Home Designer, SoftPlan, BricsCAD BIM, Bentley OpenBuildings
Designer et MicroStation, Shapr3D, Morpholio Trace, Concepts, Cedreo, dRofus, Bonsai, FreeCAD (atelier BIM),
Plannerly, Rayon, Arkio, Snaptrude.

Regroupements par rapport à la liste de départ : AutoCAD LT et AutoCAD Architecture sont dans la fiche AutoCAD
(le toolset Architecture est inclus dans l'abonnement AutoCAD depuis la version 2019, pas dans LT) ; Trimble
SketchUp Studio est dans la fiche SketchUp ; MicroStation et OpenBuildings sont dans une seule fiche Bentley.

## 2. Outils écartés et pourquoi

- Twinmotion : hors catégorie (visualisation), comme demandé.
- Allplan (Nemetschek) : le site allplan.com répond 403 ; la page marque de Nemetschek
  (https://www.nemetschek.com/en/brands/allplan) ne mentionne ni bureau US ni prix. Aucune présence commerciale
  US vérifiée, donc non retenu. À reprendre si une source US est trouvée.
- Qonic (Gand, Belgique) : plateforme BIM cloud avec plugin Revit, mais prix uniquement en euros et aucune
  présence US vérifiée (https://www.qonic.com/pricing). Écarté, à surveiller.
- Archicad Solo : le plan n'existe plus sur la grille 2026 de Graphisoft (plans Studio, Collaborate, Max).
  Traité dans la fiche Archicad.
- Chief Architect Interiors : plus listé comme produit séparé sur chiefarchitect.com/products/ ; seule la
  note G2 historique (3.7, 10 avis) est reportée dans la fiche Premier.
- FormIt : gardé en fiche mais en fin de vie. FormIt Pro n'est plus vendu depuis fin avril 2024, FormIt Web
  est hors ligne depuis le 2024-08-31, l'app iPad a été retirée, FormIt pour Windows reste maintenu jusqu'en
  2027. Le moteur vit dans le mode 3D Sketch de Forma
  (https://formit.autodesk.com/blog/post/an-update-on-the-future-of-formit).

## 3. Sites inaccessibles ou limites rencontrées

- autodesk.com (toutes les pages produit, dont la FAQ abonnement Revit) : 403 en WebFetch et en curl avec
  en-tête navigateur. Les prix Autodesk viennent donc d'un extrait de recherche de la FAQ officielle
  (Revit : 380 $/mois, 3 005 $/an, 9 020 $/3 ans) et du site tiers renderahouse.com (qui déclare avoir relu
  autodesk.com US en septembre-octobre 2026). À recouper manuellement depuis un navigateur.
- g2.com : 403 en accès direct. Les notes et nombres d'avis des sept outils majeurs viennent des extraits de
  recherche G2 (pages reviews, pricing, comparaisons) du 2026-11-07. Pour les outils de second rang, G2 est
  « non trouvé » ; les notes App Store US sont indiquées en complément pour Shapr3D, Morpholio Trace et Concepts.
- capterra.com, trustradius.com, softwareadvice.com, getapp.com : 403.
- community.graphisoft.com (fils citant les enquêtes NBS) : 403.
- reddit.com et old.reddit.com : inaccessibles depuis l'outil.
- wiki.freecad.org : bloqué par l'anti-bot Anubis.
- thenbs.com : les pages du Digital Construction Report 2023, 2024 et 2025 renvoient 404 ; la page
  « knowledge » ne liste aucun rapport récent.
- statista.com (part des logiciels BIM dans la construction US, 2018) : pourcentage masqué sur la page gratuite.
- aia.org : la page de l'AIA Firm Survey Report 2026 (publiée le 2026-11-02) annonce un chapitre « practice
  and technology » et la montée de l'IA, sans chiffre public ; rapport payant (gratuit pour les membres).
- Pages de prix affichées en JavaScript sans montant dans le texte : vectorworks.net/architect/buy,
  cedreo.com/pricing (prix repris de renderahouse.com, relevé 2026-10-27).
- Budget de recherche web (200 requêtes par tour, partagé entre agents) épuisé après la première vingtaine
  de requêtes ; le reste du travail a été fait par accès direct aux URL.
- Plusieurs domaines ont été temporairement limités par le contrôle de sécurité de l'outil (concepts.app,
  plannerly.com, arkio.is, softplan.com, virtuosity.bentley.com, graphisoft.com, vectorworks.net) ; une
  seconde tentative a abouti sauf pour virtuosity.bentley.com (remplacé par bentley.com) et les pages IA de
  Graphisoft (404).

## 4. Prix publics 2026 des sept outils prioritaires (USD, hors taxes)

| Outil | Mensuel | Annuel | 3 ans | Source, date |
|---|---|---|---|---|
| Revit | 380 $ | 3 005 $ | 9 020 $ | FAQ Autodesk via extrait de recherche ; renderahouse.com, 2026-09-05 |
| AutoCAD | 260 $ | 2 095 $ | 6 285 $ | renderahouse.com (relu sur autodesk.com, oct. 2026) |
| AutoCAD LT | 70 $ | 540 $ | 1 620 $ | idem |
| Revit LT | 70 $ | 560 $ | non relevé | renderahouse.com |
| AEC Collection | non relevé | 3 675 $ | non relevé | renderahouse.com |
| Archicad Studio | 345 $ | 2 414 $ (201 $/mois) | 7 242 $ | graphisoft.com/en-us/pricing, 2026-11-07 [vérifié] |
| Archicad Collaborate | 406 $ | 2 840 $ (237 $/mois) | 8 520 $ | idem |
| Archicad Max | 800 $ | 5 700 $ (475 $/mois) | 17 100 $ | idem |
| Vectorworks Architect | 170 $ | 1 530 $ (127,50 $/mois) | non proposé | renderahouse.com 2026-09-07, recoupé G2 ; perpétuel plus vendu |
| SketchUp Go / Pro / Studio | non publié | 129 $ / 399 $ / 859 $ | non proposé | sketchup.trimble.com, 2026-11-07 [vérifié] |
| Rhino 9 | achat unique | 995 $ perpétuel ; upgrade 595 $ (promo 395 $ jusqu'au 2027-03-01) | sans maintenance | rhino3d.com, 2026-11-07 [vérifié] |
| Chief Architect Premier | 229 $ | 1 995 $ | non proposé | chiefarchitect.com, 2026-11-07 [vérifié] |

Notes G2 relevées le 2026-11-07 : AutoCAD 4.4 (2 011 avis), SketchUp 4.5 (1 328), Revit 4.6 (1 255),
Archicad 4.6 (293 à 298), AutoCAD LT 4.3 (285), Vectorworks Architect 4.4 (262), Rhinoceros 4.4 (192),
Chief Architect Premier 4.6 (18), Chief Architect Interiors 3.7 (10).

## 5. Estimations de part de marché (toutes à prendre avec précaution)

- Archinect, 2014-07-18, 928 offres d'emploi des 50 plus grands cabinets US : Revit requis dans plus de 70 %
  des offres, AutoCAD dans plus de 50 %, SketchUp troisième compétence, Grasshopper 3 %. [vérifié, mais
  ancien et biaisé vers les grands cabinets]
  https://archinect.com/news/article/104482643/do-your-homework-the-most-required-skills-to-work-at-the-top-50-architecture-firms
- architect-us.com, novembre 2019, 42 cabinets sondés (méthode non décrite) : AutoCAD 73,1 %, Rhino 69,2 %,
  Photoshop 65,4 %, Revit 63,5 %, SketchUp 21,2 %, V-Ray 19,2 %, Bluebeam 15,4 %. [estimé, petit échantillon]
  https://www.architect-us.com/blog/?p=20684
- Statista, enquête juillet 2018, construction US : « Revit was the most popular BIM software implemented in
  the U.S. construction sector », pourcentage masqué. [vérifié partiellement]
  https://www.statista.com/statistics/1020721/share-bim-software-used-us-construction-sector/
- NBS National BIM Report 2015 (Royaume-Uni, pas US), cité par gfxspeak le 2015-05-12 : Vectorworks 29 %,
  Revit 25 %, Archicad 8 % des répondants. [vérifié, hors US] https://gfxspeak.com/archives/report-vectorworks-software/
- Enquête NBS non datée citée sur community.graphisoft.com (page en 403, chiffres vus seulement dans un
  extrait de recherche) : Revit 27 %, AutoCAD 22 %, AutoCAD LT 20 %, Archicad 10 %, Vectorworks 8 %.
  [non vérifié]
- Vectorworks « Report 2025 » (Nemetschek, 2025-02-19, plus de 500 professionnels AEC, pays non précisés) :
  68 % ont adopté le BIM, 38 % des non-adoptants prévoient de le faire sous cinq ans, 50 % voient l'IA
  déjà présente dans leurs workflows. [déclaratif éditeur]
  https://blog.nemetschek.com/en/topics-and-insights/vectorworks-report-2025
- Anecdote Archinect 2014 : « something like 5% of firms who use BIM in the States use ArchiCAD ». [non vérifié]
  https://archinect.com/mobile/forum/thread/95867670/new-user-searching-for-bim-software
- Proxy par volume d'avis G2 (2026-11-07) : AutoCAD 2 011, SketchUp 1 328, Revit 1 255, Archicad 298,
  AutoCAD LT 285, Vectorworks 262, Rhino 192, Chief Architect 18. [estimé : ordre de grandeur de base
  installée, pas une part de marché]
- AIA Firm Survey Report 2026 : chiffres non publics (voir section 3). Reddit : polls inaccessibles.

## 6. Les 8 outils les plus importants de la catégorie

1. Autodesk Revit : standard de fait du BIM aux États-Unis (plus de 70 % des offres d'emploi des grands
   cabinets en 2014, premier BIM du secteur construction US en 2018), 1 255 avis G2, mais prix en hausse
   (380 $/mois) et stratégie de bascule progressive vers Forma annoncée par Autodesk en juin 2026.
2. Autodesk AutoCAD (et LT) : le format DWG reste le langage commun des consultants ; 2 011 avis G2, le
   plus grand volume de la catégorie ; prix le premier reproche.
3. SketchUp (Trimble) : outil d'esquisse 3D le plus répandu chez les petits cabinets et en résidentiel,
   1 328 avis G2, prix bas (399 $/an Pro) et LayOut pour les planches.
4. Graphisoft Archicad : premier concurrent BIM de Revit chez les petits et moyens cabinets, Mac et Windows,
   4.6 sur G2, mais base US étroite qui complique le recrutement.
5. Vectorworks Architect : alternative BIM la moins chère (1 530 $/an), siège aux États-Unis (Maryland),
   rendu IA intégré dans la version 2027, intégration Morpholio Trace ; stabilité critiquée.
6. Rhino 9 + Grasshopper : incontournable en géométrie complexe et computational design, seul grand outil
   encore en licence perpétuelle (995 $), Rhino.Inside.Revit relie les deux mondes, RhinoAI ouvre le modèle
   aux assistants IA.
7. Chief Architect Premier : leader de la CAO résidentielle américaine (constructeurs, designers, petits
   cabinets), 1 995 $/an, très peu d'avis G2 mais forte présence dans les discussions Archinect.
8. Autodesk Forma : moteur de la stratégie Autodesk (client connecté Revit en tech preview, agents IA
   annoncés en septembre 2026), inclus dans l'AEC Collection ; à suivre avec Snaptrude et Rayon comme
   challengers cloud et IA financés (14 M$ et 10 M EUR).

## 7. Signaux de douleur utilisateur les plus fréquents

- Coût des abonnements Autodesk : « significant barrier » avec 65 mentions dans les avis G2 d'AutoCAD
  (https://www.g2.com/products/autocad/reviews) ; « Revit costs about $3k per year », environ 4 000 $/an par
  personne avec le matériel (Archinect, 2024, https://archinect.com/forum/thread/150440845/software-selection) ;
  jeune diplômé qui « couldn't afford a Revit license » (Archinect, 2018,
  https://archinect.com/forum/thread/150090786/alternative-to-revit).
- Revit mal adapté aux petits projets : « Revit doesn't downscale very smoothly » (Archinect, 2021,
  https://archinect.com/forum/thread/150261100/vectorworks) ; « overkill » pour les petites rénovations car
  tout le bâtiment doit être modélisé (Archinect, 2020,
  https://archinect.com/forum/thread/150208453/architect-of-30-years-transitioning-to-cad-or-bim).
- Courbe d'apprentissage : Revit « literally months to a year » (Archinect, 2020) ; Chief Architect « the
  salespeople say it's easy, but the users say it's not » (Archinect, 2024) ; Archicad « the costs are heavy »
  en temps de production de documents (Archinect, 2024).
- Performance et stabilité : lenteur de Revit et de SketchUp sur les gros modèles (G2, 2026) ; Vectorworks
  « stability issues » (G2) et gros fichiers qui ralentissent (Archinect, 2021).
- Fin des licences perpétuelles et paiement de fonctions inutiles : SoftPlan « Perpetual licenses are no
  longer offered » (https://ww2.softplan.com/?page_id=837) ; Vectorworks ne vend plus de perpétuel
  (renderahouse, 2026) ; un solo ne veut pas « paying for features they won't use, which clutter the
  interface » (Archinect, 2024) ; à l'inverse la licence perpétuelle de Rhino est citée comme forte valeur (G2).
- Outils mobiles : pas de synchronisation Windows-iPadOS dans Concepts et plantages (App Store, 2025,
  https://apps.apple.com/us/app/concepts-sketch-note-draw/id560586497) ; prix de Shapr3D « absolutely
  ridiculous » sans palier intermédiaire (App Store, 2021,
  https://apps.apple.com/us/app/shapr3d-cad-modeling/id1091675654) ; Morpholio Trace « still a bit clunky »
  (App Store, 2024).
- Promesses IA sans date : Autodesk annonce de nombreux agents Forma et des workflows IA Revit « sans date »
  (https://adsknews.autodesk.com/en/news/autodesk-forma-ai-aec-connected-workflows-2026/) ; les pages IA de
  Graphisoft renvoient 404 ; seuls Vectorworks 2027 (rendu IA, assistant), Rhino 9 (RhinoAI), Snaptrude
  (agent IA à crédits), Rayon (panneau IA, vectorisation) et Shapr3D (rendus génératifs) décrivent des
  fonctions IA réellement disponibles sur leurs pages.

## 8. Points à recouper en priorité (accès refusé pendant cette passe)

1. Prix Autodesk (Revit, AutoCAD, LT, AEC Collection, Forma standalone) directement sur autodesk.com.
2. Nombre d'avis G2 exact des sept outils majeurs (les extraits de recherche donnent des valeurs qui varient
   de quelques unités selon la page G2 consultée).
3. Notes G2 ou Capterra des outils de second rang (BricsCAD, Shapr3D, SoftPlan, Cedreo, Snaptrude, Forma).
4. NBS Digital Construction Report 2024 ou 2025 et AIA Firm Survey 2026 (chapitre technologie) pour des parts
   de marché datées.
5. Statut exact du rapprochement Vectorworks / Morpholio (le vendeur App Store de Trace est « Vectorworks, Inc. »).
