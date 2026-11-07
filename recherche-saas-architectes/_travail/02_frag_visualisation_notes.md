# Notes : catégorie « Visualisation, rendu, présentation client »

Date du relevé : 2026-11-07. Fichier de données : `02_frag_visualisation.jsonl` (25 lignes).

## Nombre d'outils documentés

25 objets JSONL : Enscape, Lumion, Twinmotion, D5 Render, V-Ray, Corona, Vantage, Unreal Engine (usage archviz), Blender, 3ds Max (avec Arnold), KeyShot, Cinema 4D + Redshift, OctaneRender, Shapespark, Arkio, Resolve, Polycam, Twindo (ex-Canvas), Matterport, Kuula, Adobe Creative Cloud, Affinity/Canva, upscalers IA (Krea, Magnific), Morpholio Board, rendu intégré aux BIM (Archicad AI Visualizer, Vectorworks Redshift).

Regroupements : Enscape Impact et Envision sont décrits dans la fiche Enscape (inclus dans le plan Collection, vérifié sur chaos.com). Lumion LiveSync est décrit dans la fiche Lumion. Arnold est décrit dans la fiche 3ds Max. « SketchUp + V-Ray » est couvert par la fiche V-Ray (hôtes listés).

## Outils écartés et pourquoi

- Veras (EvolveLab/Chaos) : traité par l'agent IA, comme demandé. Noté seulement comme composant inclus dans tous les plans Enscape, V-Ray et Corona (chaos.com, AEC Magazine 2026-06-01).
- Evolve LAB Glyph : hors périmètre. C'est un plugin Revit d'automatisation de la documentation (cotation, étiquetage, création de vues et feuilles), sans fonction de rendu. Prix relevés pour mémoire : licence nommée 50 $/mois facturé 600 $/an, flottante 1 062 $/an (evolvelab.io/glyph, 2026-11-07). À remettre à l'agent « Documents de construction ».
- Miro : laissé à l'agent collaboration. Figma : non traité (pas de source consultée, usage pour planches marginal).
- Rendair : non identifié. Aucune page officielle localisable sans moteur de recherche (budget épuisé), aucune trace dans la presse AEC consultée. Non documenté.
- Lumion LiveSync, Enscape Impact, Chaos Vantage autonome : pas des produits achetables séparément, intégrés aux fiches mères.
- Autodesk Revit rendering cloud : non documenté, autodesk.com renvoie HTTP 403 et aucune source alternative accessible.
- Yulio : site entièrement dynamique, pages /, /pricing, /plans vides au fetch. Aucune donnée vérifiable, non documenté.
- Autodesk Workshop XR (ex-The Wild / IrisVR Prospect) : autodesk.com en 403, tag AEC Magazine inexistant (404). Non documenté faute de source.
- Kalloc Fuzor : kalloctech.com en 403 (pricing et accueil). Non documenté.
- 3ds Max Interactive : cité dans le sondage 2021 (7,4 %, en recul), intégré à la fiche 3ds Max.

## Sites inaccessibles le 2026-11-07

- Sites d'avis : g2.com, capterra.com, trustradius.com, saasworthy.com, alternativeto.net, sourceforge (page Enscape sans aucun avis), trustpilot.com (pages Lumion en 404), Reddit (domaine bloqué). Conséquence : `note_g2` et `nb_avis_g2` valent « non trouvé » pour les 25 outils, et les points forts/faibles reposent sur les forums officiels (forums.chaos.com, forum.d5render.com), la presse AEC et le sondage CGarchitect.
- Éditeurs : twinmotion.com, unrealengine.com, d5render.com (toutes pages, 403), autodesk.com (403), canva.com (403), magnific.com (403), kalloctech.com (403), chaos.com/vantage/pricing (404), lumion.com/pricing (vide, mais /buy accessible), forum.lumion.com (Cloudflare Access), matterport.com/pricing (404) et /plans, /store (sans contenu tarifaire), kuula.co/page/pricing (montants non rendus), maxon.net (montants non rendus sans région).
- Wikipedia : plusieurs appels limités par le contrôle de domaine (rate limit) ; Chaos, Enscape, Twinmotion, Lumion obtenus ; D5 Render et Lumion_(software) en 404.
- Budget de recherche web épuisé (limite partagée entre agents) après les 6 premières requêtes : toute la suite repose sur des fetchs d'URL directes. Une relance avec budget permettrait de combler : notes G2/Capterra, prix D5 officiels, prix 3ds Max et Cinema 4D, Matterport, Kuula, Yulio, Workshop XR, Fuzor, Magnific, Canva.

## Sondage de part de marché (CGarchitect)

- Dernière édition trouvée : « 2021 Architectural Visualization Rendering Engine Survey », 2 526 réponses, collecte du 24 août au 16 décembre 2021, marge d'erreur ±2 % (cgconnect.chaos.com, ex-cgarchitect.com). CGarchitect a été racheté par Chaos en mai 2022 et renommé CGconnect ; aucune édition 2022 à 2026 du sondage moteurs n'apparaît sur le site (seul un sondage salaires 2026 est en cours). Les chiffres sont donc datés et le sondage est désormais hébergé par un éditeur de la catégorie (biais potentiel à signaler).
- Usage en production 2021 (et variation vs 2020), source CG Channel 2022-02 [vérifié] : V-Ray 60,6 % (-4,3), Corona 37,2 % (+2,2), Lumion 24,9 % (-0,2), Unreal Engine 22,5 % (+2,9), Twinmotion 19,2 % (+5,1), Enscape 12,4 % (+2,2), 3ds Max Interactive 7,4 % (-1,0), Cycles 6,9 % (+1,0), Cinema 4D 5,5 %, D5 Render 5,0 % (+3,5), Eevee 4,9 % (+0,4), Chaos Vantage 4,0 %.
- Sondage 2020 (CG Channel 2020-09) : 19,6 % des architectes utilisaient Unreal, 43,3 % des répondants l'expérimentaient.
- Les répondants sont mondiaux, majoritairement des spécialistes de visualisation ; la part US n'est pas lisible dans le texte (graphiques en images).

## Les 7 outils les plus importants de la catégorie

1. Enscape (Chaos) : standard de fait du rendu temps réel intégré à Revit/SketchUp/Archicad dans les cabinets US ; plans Solo/Premium/Collection à 574,80 / 670,80 / 730,80 $/an relevés le 2026-11-07 ; progression continue depuis 2016 au sondage CGarchitect.
2. Twinmotion (Epic) : gratuit sous 1 M$ de CA et fourni avec Archicad et Revit, donc omniprésent chez les solos et petits cabinets ; 445 $/siège/an au-delà depuis 2024 ; désormais une instance d'Unreal Engine (Lumen, Nanite).
3. Lumion (Act-3D) : deuxième moteur temps réel en production (24,9 % en 2021) ; recentrage 2026 sur Pro à 1 149 $/an (Standard, View, Studio supprimés), Windows uniquement.
4. D5 Render : moteur à la croissance la plus rapide (5,0 %, +3,5 pts en 2021), freemium agressif (Pro 360 $/an, D5 Lite gratuit dans SketchUp, Rhino, Revit), rythme de versions soutenu ; mais plaintes récurrentes de mémoire vidéo et instabilité.
5. Chaos V-Ray : moteur de production numéro un (60,6 % en 2021) pour les images de concours ; plan Collection à 1 210,80 $/an intégrant Vantage, Anima, cloud ; griefs de licence et renouvellement sur le forum Chaos.
6. Unreal Engine : 22,5 % en production (2021), socle de Twinmotion et des expériences interactives haut de gamme ; 1 850 $/siège/an pour les cabinets à 1 M$+.
7. Chaos Corona : 37,2 % en production (2021), surtout via 3ds Max et Cinema 4D chez les studios de visualisation ; moins présent dans les flux SketchUp/Revit des cabinets US.

Mention : Polycam et Twindo (ex-Canvas) comme entrée LiDAR « existant vers maquette » de plus en plus citée pour la rénovation résidentielle ; Arkio comme outil de conception collaborative à bas prix (Pro 420 $/an).

## Signaux de douleur utilisateur les plus fréquents

- Renouvellements automatiques, essais convertis en abonnement annuel payant, remboursements refusés et tickets sans réponse chez Chaos (Enscape et V-Ray). Fils : « Forgot to cancel my trial » (33 réponses), « Enscape Subscription Renewed and Charged, Refund Request Denied », « Trial auto-converted to paid annual plan, 'Request a refund' disabled », « Duplicate subscription charges ». URL : https://forums.chaos.com/c/enscape/chaos-enscape-issues/58 et https://forums.chaos.com/c/licensing/licensing-general/14 (septembre-novembre 2026).
- Licence cloud et serveur de licences flottantes Chaos jugés fragiles : « Cloud licensing, still sucks », « All licenses in use? License server says license is available », « what steps are you taking to ensure that a broken internet connection doesn't stop rendering? ». URL : https://forums.chaos.com/c/licensing/licensing-general/14 (mars-octobre 2026).
- Mémoire vidéo et stabilité chez D5 : « Out of video memory » (8 réponses), « VRAM Limitation », « D5 Freezes every time », « Computer restarts after rendering simple scene rtx 3060 12gb », « Scatter is broken on large irregular areas », « City Generator stuck ». URL : https://forum.d5render.com/c/get-help/36 (octobre-novembre 2026). Interruption de service et excuses le 10 janvier 2026 : https://forum.d5render.com/c/news/8.
- Performance des synchronisations BIM chez Enscape : « Archicad 29 teamwork file + Enscape extremely slow », « SketchUp 2025 PBR material synchronisation with Enscape has degraded processing speed », problèmes de connexion au compte unifié Chaos. URL : https://forums.chaos.com/c/enscape/chaos-enscape-issues/58 (2025-2026).
- Fin des offres gratuites ou d'entrée de gamme : Twinmotion payant (445 $/siège/an) pour les cabinets à 1 M$+ depuis avril 2024 (https://aecmag.com/news/new-licensing-for-unreal-engine-and-twinmotion/) ; Lumion Standard, View et Studio supprimés en 2026 au profit de Pro à 1 149 $/an (https://support.lumion.com/knowledge-base/api/v2/help_center/en-us/articles/19776401528732.json).
- Courbe d'apprentissage et matériel pour Twinmotion/Unreal : « firms frequently mention the longer ramp-up time » (agrégat d'avis G2/Capterra repris par https://aitoolsbakery.com/blog/twinmotion-review/, août 2026, source secondaire).
- Absence de version Mac (Lumion Pro « not officially supported on Mac computers », cité par https://www.renderahouse.com/blog/lumion-pricing ; fils Enscape macOS/Rhino sur le forum Chaos).

## Points de vigilance sur les données

- Prix Chaos : les pages affichent les mensualités sans point décimal (« $4790/month ») ; les totaux annuels confirment 47,90 $, 55,90 $, etc. Relevés et recoupés le 2026-11-07.
- Twinmotion 2026 : un extrait de la page officielle (inaccessible au fetch) indique qu'au 27 mai 2026 l'Unreal Subscription n'inclut plus Twinmotion ni RealityScan ; un blog tiers daté 2026-09-07 affirme l'inverse. À trancher avec la page Epic dès qu'elle est accessible.
- D5 : prix issus de sources secondaires concordantes (renderahouse 2026-09-07, fiches Capterra/G2 citées en recherche), page officielle en 403 ; un blog concurrent cite 228 $/an (non retenu).
- Les mentions [non vérifié en ligne le 2026-11-07] signalent des faits d'entreprise courants (siège, propriétaire) qu'aucune page accessible n'a confirmés pendant le relevé.
