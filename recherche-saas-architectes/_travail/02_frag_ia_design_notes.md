# Notes du fragment 02 : Design nouvelle génération et IA

Date de vérification : 2026-11-07. Fichier de données : `02_frag_ia_design.jsonl` (39 lignes).

## Nombre d'outils

39 lignes JSONL : 38 outils documentés plus une ligne « usage détourné » (Midjourney et Stable Diffusion). Répartition par sous-catégorie :

- BIM cloud-native : Snaptrude, Arcol, Motif, Rayon (CAO 2D), Skema (esquisse vers BIM par réemploi).
- Génératif et faisabilité : Hypar, TestFit, Finch, Giraffe, Deepblocks, qbiq, Laiout, Spacio, Archistar, Parafin, Aino, Algoma, Higharc (constructeurs).
- Automatisation des documents de construction et copilotes Revit : SWAPP, ArchiLabs, BIMLOGiQ, Augmenta (MEP).
- Rendu génératif : Veras, Vizcom, LookX, PromeAI, ArchiVinci, Gendo, Maket (plans résidentiels), Midjourney et Stable Diffusion.
- Performance, énergie et carbone : cove.tool, Pollination, ClimateStudio, Sefaira, Enscape Impact, EC3 et tallyCAT, TallyLCA, One Click LCA, Forma Carbon Insights.

## Conditions de collecte (à lire avant d'exploiter les données)

- Le budget WebSearch partagé entre agents a été épuisé après 32 requêtes (sur les 40 prévues). Les portefeuilles VC, l'annuaire YC et les pages de closure (Modumate, Delve) ont donc été lus en WebFetch direct, sans recherche préalable.
- Les pages G2 renvoient HTTP 403 : `note_g2` et `nb_avis_g2` valent « non trouvé » pour toutes les lignes. Les pages G2 dont l'existence est confirmée (sans chiffre lisible) : ArchiLabs, ArchiVinci, LookX AI Cloud, Sefaira.
- Le contrôle de sécurité de domaine WebFetch a saturé en cours de session (« rate-limited »), ce qui a bloqué une vingtaine de pages (liste ci-dessous). Les prix de ces outils sont donc marqués « non vérifié » ou « non publié » avec la source tierce utilisée.
- Les champs `points_forts` et `points_faibles` ne sont renseignés que lorsqu'une source utilisateur (forum, fil communautaire) ou un constat de relevé existe. Sinon la valeur est « non trouvé (avis utilisateurs indépendants non accessibles le 2026-11-07) », conformément à la règle « ne rien inventer ».
- Plusieurs années de création et sièges sont « non trouvé dans les sources consultées » faute de page About lisible ; ils sont probablement connus mais n'ont pas pu être sourcés avec une URL dans cette passe (Snaptrude, TestFit, Higharc, Giraffe, Vizcom, Pollination, ClimateStudio, One Click LCA notamment).

## Outils écartés et pourquoi

| Outil | Décision | Raison |
|---|---|---|
| Autodesk Forma (ex-Spacemaker) | mentionné, non refait | Traité par l'agent CAD/BIM. Spacemaker (Oslo, série A 25 M$ 2019, TechCrunch) a été fusionné dans Forma. Forma Carbon Insights est documenté ici car il remplace Autodesk Insight. |
| Autodesk Project Bernini | écarté | Projet de recherche générative 3D ; page `research.autodesk.com/projects/bernini/` et `adsknews` en 404 le 2026-11-07. Pas de produit commercialisé. |
| Modumate | écarté (disparu probable) | `www.modumate.com` ne résout plus en DNS (EAI_AGAIN) le 2026-11-07. Aucune page de fermeture datée trouvée. |
| Sidewalk Labs Delve | écarté (absorbé) | `sidewalklabs.com/products/delve` redirige en 308 vers `google.com/earth/about/design/`, elle-même redirigée vers l'inscription Google Earth (Maps Platform). La page ne mentionne plus Delve. |
| Kaedim | écarté | Plateforme 3D pour jeux, design produit et e-commerce ; l'architecture n'est pas un cas d'usage déclaré (site éditeur). |
| Blocks / Blockstudio | écarté | Aucun outil d'architecture identifié sous ce nom ; les résultats concernent Blocks.diy (no-code IA, Tel Aviv, seed 10 M$ 2025) et un Blocks berlinois (cloud). |
| Morphe | non identifié | Aucun outil « Morphe » trouvé. Hypothèse : Morphis (générateur d'EvolveLAB, racheté par Chaos en 2025), cité dans la ligne Veras. |
| Kreo | écarté | Estimation ; propriété intellectuelle et équipe rachetées par Skema en 2023 (site Skema). |
| Avail | écarté | Gestion de bibliothèque de contenu, pas de la conception. |
| Urbanist, Planbuild, ArchiBuild, outils « Flux-based » | non vérifiés | Noms trop ambigus pour une recherche fiable dans le budget restant. |
| Drawer AI, Muro AI | écartés | Repérés au portefeuille Brick & Mortar : takeoff électrique (Austin) et préconstruction (San Francisco), hors catégorie design. |
| Genia (Suffolk Technologies) | non documenté | Dessins structurels génératifs selon le portefeuille Suffolk ; `genia.ai` redirige vers une société sans rapport (Genia Americas). URL réelle non trouvée. |
| THRUX (Suffolk Technologies) | non documenté | Environnement MEP cloud générant des documents contractuels ; site en HTTP 503. |
| Structured AI (YC F2025) | non documenté | QA/QC IA de jeux de dessins et modèles Revit ; `structured.ai` est une autre société (marketing partenaires). URL réelle non trouvée. |

Candidats repérés au passage, à documenter dans une passe ultérieure : ARKI (base IA de projets passés, Suffolk), Speckle (infrastructure données 3D, Foundamental et Suffolk), Mattoboard (moodboards 3D, Foundamental), Emulate Cities (Zacua), Zenerate, SketchPro, mnml.ai, MyArchitectAI, Rendair, Nullrender, Drafted (YC P26, modèles résidentiels), Spacial (permis résidentiels, seed 10 M$ 2025), Architect AI (seed septembre 2025), UpCodes (codes, plutôt agent conformité), Resolve et Helonic (revue de modèles, plutôt agent coordination).

## Sites inaccessibles le 2026-11-07

- HTTP 403 : `g2.com` (toutes pages produits), `promeai.pro/pricing`, `autodesk.com/products/forma-carbon-insights/overview` (données prises sur le blog Autodesk et l'article support).
- HTTP 404 : `hypar.io/pricing` (contenu JavaScript, titre seul), `laiout.co/pricing`, `bimlogiq.com/pricing`, `testfit.io/integrations`, `archistar.ai/usa`, `finch3d.com/about`, `motif.io/company`, `research.autodesk.com/projects/bernini/`, `adsknews.autodesk.com/en/news/project-bernini/`, `buildingventures.com/portfolio`.
- HTTP 503 : `thrux.com`.
- DNS : `modumate.com`.
- Page vide (rendu JavaScript) : `cove.inc`, `cove.inc/pricing`.
- Contrôle de domaine saturé (non lus, une seule nouvelle tentative autorisée puis arrêt) : `vizcom.com/pricing`, `parafin.ai`, `aino.world/pricing`, `pollination.solutions/pricing`, `solemma.com/climatestudio`, `sketchup.trimble.com/en/products/sefaira/buy`, `toolsforhumans.ai`, `capterra.ca`, `arcol.io/about`, `spacio.ai` (accueil), `deepblocks.com/about`, `gendo.ai/resources/press`, `rayon.design` (accueil), `augmenta.ai/about`, `evolvelab.io` (accueil), `archilabs.ai/architecture-engineering`, `laiout.co/about`.
- Lus avec succès (pour mémoire) : snaptrude.com (pricing, about), arcol.io/pricing, motif.io, testfit.io/pricing, finch3d.com/pricing, evolvelab.io/veras, chaos.com (veras, enscape/impact), maket.ai/pricing, archilabs.ai/pricing, swapp.ai (accueil, pricing), giraffe.build (pricing, about), deepblocks.com/pricing, qbiq.ai, laiout.co, bimlogiq.com, lookx.ai/pricing, archivinci.com/pricing, spacio.ai/pricing, gendo.ai/pricing, skema.ai (pricing, about), rayon.design/pricing, archistar.ai/pricing, buildingtransparency.org (tools, newsroom), oneclicklca.com (pricing), augmenta.ai, kaedim3d.com, architectmagazine.com, foundamental.com/portfolio, zacuaventures.com/portfolio, brickmortar.vc/portfolio, suffolktech.com/portfolio, ycombinator.com (industrie construction), datadrivenaec.com/tools/hypar, algoma.co.

## Les 8 outils les plus importants de la catégorie

1. **Snaptrude** : le BIM cloud-native le mieux financé parmi les indépendants (21 M$ Foundamental et Accel), grille publique claire (Pro 50 $/mois annuel, Max 100 $/siège/mois), export Revit et Rhino, agent IA à crédits ; c'est la référence du segment « Revit alternatives » côté startup.
2. **Motif** : 46 M$ (CapitalG, Redpoint) et des fondateurs ex-Autodesk ; plateforme « agent-native » avec import Revit, Rhino, IFC. Tarif sur devis ; à surveiller, car c'est le concurrent frontal de Forma et de Snaptrude sur les grands cabinets.
3. **TestFit** : outil de faisabilité le plus installé aux États-Unis (Dallas, 22 M$), tarifs publics détaillés (75 $/mois à 20 000 $/an), intégration Revit et SketchUp sur tous les plans, connexion MCP vers un assistant IA.
4. **Veras (Chaos)** : rendu génératif intégré dans Revit, SketchUp, Rhino, Archicad, Vectorworks et Forma, désormais distribué par Chaos (Enscape, V-Ray) ; prix d'entrée bas (29 $/mois annuel ou 202,80 $/an en Starter). Le levier de diffusion Chaos en fait l'outil de rendu IA le plus exposé aux cabinets US.
5. **SWAPP** : seul acteur crédible sur l'automatisation complète des documents de construction dans Revit et Archicad, avec références US (Stantec, Page, VLK) et 18,5 M$ levés ; prix non publié, crédits d'usage.
6. **qbiq** : 26 M$ (Insight Partners, JLL Spark), bureaux New York et Miami, test fits de bureaux livrés en 24 h avec export Revit ; menace directe pour les cabinets qui vivent des test fits.
7. **Forma Carbon Insights (Autodesk)** : inclus sans surcoût avec Revit et l'AEC Collection, il remplace Insight et Green Building Studio (retirés le 1er juillet 2025) et devient de fait l'outil carbone par défaut de la majorité des cabinets US.
8. **EC3 et tallyCAT (Building Transparency)** : gratuit, open access, intégré à Revit, base d'EPD de référence aux États-Unis, EC3 2.0 en bêta à Greenbuild 2026 ; TallyLCA, racheté par C.Scale en avril 2026, reste l'ACV Revit la plus utilisée (compatibilité Revit 2026 financée par Perkins&Will).

Mentions : Higharc (78,7 M$, Suffolk Technologies, Home Depot) est le plus gros acteur financièrement mais vise les constructeurs, pas les architectes. Vizcom (52 M$) est orienté design produit.

## Signaux de douleur utilisateur repérés

- Sefaira n'est plus inclus dans SketchUp Studio et coûte environ 2 000 $/an en licence séparée ; impossible d'acheter la version Revit seule chez certains revendeurs. Source : https://forums.sketchup.com/t/sefaira-sketchup/167570 et https://forums.sketchup.com/t/how-do-i-buy-sefaira-for-revit/135612
- Confusion persistante entre Ladybug Tools (gratuit, open source) et Pollination (payant) ; les prix Pollination diffèrent selon le revendeur (200 $/mois chez un blog, 2 200 $ chez IES). Source : https://discourse.ladybug.tools/t/confused-about-ladybug-vs-pollination/22531 et https://www.iesve.com/software/pollination
- Retrait d'Autodesk Insight Energy Analysis et de Green Building Studio au 1er juillet 2025 : des utilisateurs regrettent le rapport de pistes d'économies d'énergie, sans équivalent évident dans Forma Carbon Insights. Source : https://forums.autodesk.com/t5/autodesk-insight-total-carbon/exciting-update-on-autodesk-insight-energy-analysis-and-green/m-p/13722807 et https://autodesk.com/support/technical/article/caas/tsarticles/ts/5gIBXSFqOZgJz8ShDkDg2I.html
- ClimateStudio ne fonctionne pas correctement avec la version d'essai de Rhino, ce qui complique l'évaluation avant achat. Source : https://discourse.mcneel.com/t/about-climatestudio/100241
- Les utilisateurs LEEDuser pensent que tallyCAT (gratuit) remplacera Tally (payant), signe d'une offre carbone illisible entre EC3, tallyCAT, TallyLCA et One Click LCA. Source : https://leeduser.buildinggreen.com/node/52925
- Opacité tarifaire généralisée sur les outils IA de conception : Motif, SWAPP, qbiq, Laiout, Augmenta, Higharc, Parafin, One Click LCA, ClimateStudio sont tous « sur devis » ; Veras publie deux grilles différentes (EvolveLAB et Chaos) le même jour. Sources : https://www.evolvelab.io/veras et https://www.chaos.com/veras
- Les grands cabinets utilisent surtout ChatGPT et Copilot, pas les outils métier : environ 70 % des participants à AIA Aspire 2024 disent utiliser l'IA, « presque tous » via ces deux outils. Source : https://www.architectmagazine.com/technology/ai-is-shaping-architectures-new-reality-faster-than-we-expected_o
- Les outils de rendu généralistes (PromeAI, LookX, ArchiVinci) sont jugés bons pour l'idéation mais inadaptés au BIM et à la documentation technique ; le coût par rendu varie selon modèle et résolution. Source : https://www.krowdbase.com/software/promeai et https://rendair.ai/blog/tools-top-5-promeai-alternatives-for-architects-designers
- Les outils de faisabilité ciblent les promoteurs et non les architectes (Higharc, Algoma, Deepblocks AIM, qbiq « sans attendre un architecte »), ce qui déplace une partie des honoraires d'esquisse hors des cabinets. Sources : https://www.qbiq.ai/ et https://algoma.co/
