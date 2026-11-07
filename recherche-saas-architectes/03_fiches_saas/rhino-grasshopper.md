# Rhino 9 + Grasshopper (Rhinoceros 3D)

**Éditeur / propriétaire :** Robert McNeel & Associates (société privée) | **Catégorie :** CAD, BIM et modélisation (modélisation NURBS et computational design) | **Date de vérification :** 2026-11-07

## 1. Problème résolu (en une phrase, du point de vue de l'architecte)
Modéliser des géométries libres et paramétriques impossibles dans un outil BIM classique, puis les transférer vers Revit via Rhino.Inside.Revit.

## 2. Étapes du workflow couvertes
Principale : 3, 4, 9. Secondaire : 5 (dessins 2D liés, Layout Groups, plugins VisualARQ), 2 (analyses via Ladybug, ClimateStudio).

## 3. Segment cible
Éditeur : tous les designers. Avis : cabinets de design et de façades, moyens et grands cabinets, écoles ; « Rhino 69,2 % » des 42 cabinets sondés (architect-us.com, 2019, petit échantillon) [estimé] ; aussi utilisé par des solos pour toute la documentation avec V-Ray (r/Architects, 2024-10, résumé).

## 4. Fonctionnalités clés
- NURBS, maillages, SubD ; Grasshopper 1 inclus, Grasshopper 2 en développement.
- Dessins 2D liés au modèle, Clipping Drawings, Layout Groups ; nouveau pipeline Direct3D (Rhino 9 Windows).
- Rhino.Inside.Revit (plus de 300 composants Grasshopper pour Revit, gratuit) ; écosystème de plugins (VisualARQ pour le BIM, Enscape, V-Ray, Ladybug).

## 5. Fonctionnalités IA
RhinoAI : connexion d'un assistant IA (Claude, Codex ou modèle local) au document Rhino et Grasshopper ouvert, avec contrôle des outils autorisés (https://www.rhino3d.com/9/, 2026-11-07) [vérifié éditeur]. Fonction réellement disponible, pas d'avis utilisateur trouvé.

## 6. Prix public et modèle de tarification
| Offre | Prix | Unité | Date du relevé | Source |
|---|---|---|---|---|
| Rhino 9 commercial | 995 $ | licence perpétuelle, achat unique | 2026-11-07 | https://www.rhino3d.com/sales/north-america/United_States/ [vérifié] |
| Mise à jour depuis une version antérieure | 595 $ ; promotion 395 $ jusqu'au 2027-03-01 | perpétuel | 2026-11-07 | idem [vérifié] |
| Éducation | 195 $ ; mise à jour 95 $ | perpétuel | 2026-11-07 | idem [vérifié] |
Seul grand outil de la catégorie encore vendu en perpétuel sans maintenance. Signal contraire : « They want us (perpetual licenses owners) moving to subscription mode », hausse d'environ 75 % du prix des upgrades (discourse.mcneel.com, 2022-07, https://discourse.mcneel.com/t/rhino-subscription/144757).

## 7. Intégrations clés et dépendances
Revit (Rhino.Inside.Revit), Archicad (Live Connection), Vectorworks, DWG, DXF, IFC via plugins, Enscape, V-Ray, Twinmotion, Hypar, Speckle. Dépendance : le BIM dans Rhino passe par VisualARQ, « only works on Windows, and which disappointed me with its bugs and its slowness » (McNeel, 2020).

## 8. Société
Robert McNeel & Associates, fondée en 1978, Seattle (Washington), détenue par ses employés [vérifié Wikipedia]. G2 : 4,4 sur 192 avis [secondaire].

## 9. Ce que les utilisateurs aiment (3 points sourcés)
1. La licence perpétuelle, jugée « très bon rapport valeur-prix » (G2, 2026) [secondaire], citée en contraste avec Autodesk et Trimble.
2. Précision et flexibilité : NURBS, compatibilité plugins et formats (G2, 2026) [secondaire] ; Rhino + V-Ray suffit à un solo « for sketches and documentation » (r/Architects, 2024, résumé).
3. Le pont vers Revit : Rhino.Inside.Revit gratuit (https://www.rhino3d.com/inside/revit/1.0/).

## 10. Ce que les utilisateurs détestent (3 points sourcés)
1. Prix des upgrades : « Egregious and abhorrent pricing structure » (Trustpilot, 2025-10, https://www.trustpilot.com/review/rhino3d.com) ; hausse des upgrades perçue comme pression vers l'abonnement (McNeel, 2022).
2. Stabilité Mac : « Everything is fine except when I capture to file the render. Rhino freezes » (Mac Studio M1, discourse.mcneel.com, 2022-10).
3. Courbe d'apprentissage et BIM limité : « requires patience to master », manque de fonctions paramétriques natives (G2, 2026) [secondaire] ; VisualARQ bogué (McNeel, 2020).

## 11. Pourquoi les clients partent ou n'adoptent pas l'outil
- Non-adoption : ce n'est pas un outil de documentation BIM ; les cabinets le gardent en complément de Revit.
- Abandon partiel quand les projets ne justifient plus la géométrie complexe ; aucun signal de churn massif.

## 12. Concurrents directs
SketchUp (esquisse), Blender (gratuit), Archicad et Revit (BIM avec Grasshopper Live Connection ou Dynamo), Shapr3D, Hypar (génératif cloud).

## 13. Promesse marketing vs réalité utilisateur
McNeel promet un outil « sans abonnement » et désormais ouvert à l'IA. Les utilisateurs confirment la valeur du perpétuel et la puissance géométrique, mais signalent des hausses d'upgrade et un BIM qui reste une rustine (VisualARQ).

## Sources
- https://www.rhino3d.com/ ; https://www.rhino3d.com/9/ ; https://www.rhino3d.com/sales/north-america/United_States/ ; https://www.rhino3d.com/inside/revit/1.0/ (2026-11-07)
- https://www.g2.com/products/rhinoceros/reviews (via extrait, 2026-11-07)
- https://discourse.mcneel.com/t/rhino-subscription/144757 ; https://discourse.mcneel.com/t/super-frustrated-rhino-7-freezes-when-i-capture-to-file-on-mac-studio-m1/148913 ; https://discourse.mcneel.com/t/bye-bye-sketchup-since-forced-subscription-licence/105191 (2026-11-07)
- https://www.trustpilot.com/review/rhino3d.com (2026-11-07)
- https://www.architect-us.com/blog/?p=20684 (2026-11-07)
- Wikipedia Rhinoceros 3D (2026-11-07)
