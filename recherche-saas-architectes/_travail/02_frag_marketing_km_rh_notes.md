# Notes du fragment "Marketing, CRM, portfolio, gestion des connaissances, bibliothèques BIM, RH et formation"

Date : 2026-11-07. Fichier de données : `02_frag_marketing_km_rh.jsonl` (52 outils, JSON valide).

## Nombre d'outils trouvés

52 outils documentés, répartis ainsi :

| Sous-catégorie | Outils |
|---|---|
| CRM et propositions | 11 (Unanet CRM by Cosential, Deltek Vantagepoint CRM, HubSpot, Pipedrive, Salesforce, Zoho CRM, Less Annoying CRM, Capsule CRM, Monograph Pipeline, BQE CORE Pursuit, Proposify) |
| Marketing et portfolio | 5 (OpenAsset Source + Shred, Mailchimp, Squarespace, Houzz Pro, Google Business Profile) |
| Bibliothèques BIM et contenu | 12 (BIMobject, BIMsmith, AVAIL, Autodesk Content Catalog ex-UNIFI, Kinship, Ideate Software, CTC Software, pyRevit, Dynamo, DiRoots, Material Bank, Designer Pages) |
| Gestion des connaissances et standards | 6 (Notion, Confluence, Guru, Trainual, Loom, assistants IA généralistes) |
| RH, recrutement, formation | 18 (Gusto, Rippling, BambooHR, Lattice, 15Five, Archinect Jobs, AIA Career Center, LinkedIn Recruiter, Workable, Greenhouse, Black Spectacles, Amber Book, Hyperfine, AIAU, Graphisoft Learn, Vectorworks University, Zweig Group, NCARB) |

Le total dépasse la cible de 35 à 45 parce que la catégorie couvre cinq sous-domaines distincts ; chaque ligne reste courte et sourcée.

## Contraintes de collecte à connaître avant consolidation

- Le budget de recherche web partagé (200 requêtes par tour, toutes sessions confondues) s'est épuisé après une vingtaine de requêtes de ce fragment. Le reste de la collecte s'est fait par lecture directe des pages éditeurs (prix, about), de Trustpilot, d'Archinect et du forum AIA. Les requêtes Reddit prévues ("CRM for architecture firm", "Revit family management", "how do you manage standards", "firm wiki", "best ARE prep", "architect recruiting") n'ont pu être lancées qu'en partie (quatre sur six) et reddit.com est inaccessible depuis cet environnement. À compléter en phase 4.
- G2 et Capterra renvoient HTTP 403 à toute lecture directe. Les notes G2 présentes dans le JSONL (OpenAsset, Unanet CRM, Deltek Vantagepoint, BIMobject, Rippling, Material Bank) viennent des extraits de recherche obtenus avant l'épuisement du budget, avec l'URL G2 en source. Pour les autres outils, `note_g2` vaut "non trouvé" avec la raison. Black Spectacles est noté via Trustpilot (4,4 sur 215 avis) et Houzz Pro via Capterra (4,3 sur 1 088 avis), signalés comme tels.
- Les `points_forts` et `points_faibles` ne sont renseignés que lorsqu'un avis utilisateur a été réellement lu ou résumé par une source datée ; sinon "non trouvé". Les témoignages publiés par les éditeurs sont marqués "déclaratif" et jamais présentés comme des avis.

## Outils écartés et pourquoi

- Canva, Pipedrive (page prix), Justworks, ADP RUN, TriNet, Paychex, Indeed, LinkedIn Learning, Constant Contact : pages prix HTTP 403/404, aucune donnée vérifiable ; Pipedrive est quand même conservé parce que le forum AIA le cite. Justworks, ADP, TriNet, Paychex sont de la paie généraliste sans signal propre aux architectes : à traiter, si besoin, en une ligne "paie et PEO" dans la synthèse.
- Architizer, ArchDaily, Archinect profils de cabinets, Behance, Instagram, Pinterest : canaux de visibilité plutôt que SaaS ; Architizer (403) et ArchDaily (404) inaccessibles. Archinect est couvert par son job board (Archinect Jobs).
- Swatchbox et 3D Warehouse : pages rendues en JavaScript, aucun contenu lisible ; 3D Warehouse relève plutôt de la visualisation SketchUp.
- ARCAT : site HTTP 403 sur toutes les pages essayées, impossible à documenter malgré son importance (objets BIM et spécifications gratuits aux États-Unis). À reprendre.
- Naviate (Symetri) : le site redirige vers le groupe sans contenu produit ; présence US non démontrée dans cette session.
- Autodesk University, ArchSmarter, BIM Pure, Pluralsight, Udemy : HTTP 403 pour les trois premiers, les deux derniers sont des catalogues généralistes sans angle architecte vérifiable.
- Tettra, Slab, Airtable, Google Drive, Obsidian, SharePoint : outils génériques déjà couverts par la catégorie collaboration ou sans usage spécifique documenté.
- ISO 19650 templates : documents, pas un logiciel.
- Chaos Cosmos, Enscape asset library : bibliothèques de rendu, du ressort de la catégorie visualisation.
- UNIFI Pro en tant que produit séparé : fusionné dans la ligne Autodesk Content Catalog. Précision importante : le mélange "Avail / Unifi fusionné ?" de la liste de départ est une confusion. AVAIL (Lexington, KY) reste indépendant ; c'est Autodesk qui a racheté UNIFI en mars 2023 et l'a rebaptisé Content Catalog, inclus sans surcoût dans Autodesk Docs (AEC Magazine, 2024-09-18 : https://aecmag.com/data-management/autodesk-content-catalog/).

## Sites inaccessibles (HTTP 403, 404, 503 ou rendu JavaScript)

g2.com, capterra.com (403) ; gusto.com/product/pricing et gusto.com/about (403) ; canva.com/pricing (403) ; pipedrive.com/pricing (403) ; justworks.com (403/404) ; houzz.com et pro.houzz.com pages prix (404) ; atlassian.com/software/confluence/pricing (90 caractères de texte, JS) ; architizer.com (403) ; archdaily.com/submit (404) ; arcat.com (403) ; bimobject.com (403) et investor.bimobject.com (503) ; openai.com/chatgpt/pricing (403) et chatgpt.com/pricing (montants masqués) ; microsoft.com Copilot (503) ; amberbook.com/pricing et /enroll (404) ; blackspectacles.com/b2b-pricing (limite de vérification de domaine) ; ideatesoftware.com/about et /contact (404) ; ctcsoftware.com/pricing (404) ; unanet.com/products/crm, /crm, /ae/crm (404) ; linkedin.com/learning (403) ; indeed.com/hire/pricing (403) ; swatchbox.com et 3dwarehouse.sketchup.com (JS) ; reddit.com et old.reddit.com (bloqués) ; forums.augi.com (403) ; careercenter.aia.org/rates/rate-chart (PDF non décodable, chiffres repris du résumé de recherche) ; aia.org/resource-center/firm-survey-report (404, URL supposée).

## Les 8 outils les plus importants de la catégorie

1. **Deltek Vantagepoint CRM** : CRM intégré à l'ERP dominant des cabinets A/E de taille moyenne et grande, 677 avis G2 (4,1), reporting critiqué mais position de marché très forte.
2. **Unanet CRM by Cosential** : l'autre CRM "natif AEC" (SF 330, propositions), 263 avis G2 (4,0), courbe d'apprentissage lourde ; concurrent direct de Deltek chez les 50+.
3. **OpenAsset** : DAM de référence pour les photos de projets et les propositions des cabinets 10+, 4,7 sur 204 avis G2, 1 100+ cabinets déclarés, Marlin Equity au capital ; Shred (propositions IA) lancé en 2025.
4. **HubSpot (gratuit)** : le CRM que les petits cabinets testent en premier d'après le forum AIA ; retenu pour la gratuité, abandonné pour la complexité. Signal clair d'un besoin de CRM "léger" pour architectes.
5. **Autodesk Content Catalog (ex-UNIFI)** : en rendant la gestion de contenu Revit gratuite pour tout abonné Docs, Autodesk a reconfiguré le marché de la gestion de familles (AVAIL, Kinship) ; produit encore incomplet par rapport à UNIFI Pro.
6. **Kinship** : gestion de familles et santé des modèles Revit, 10 $ par siège, 300+ clients et 25 000+ utilisateurs déclarés, aucun avis indépendant trouvé : à creuser en phase 4.
7. **Black Spectacles** : préparation à l'ARE la plus installée (partenariat AIA, licences cabinets), 4,4 sur 215 avis Trustpilot, plaintes récurrentes sur le prix (150 à 330 $ par mois) et le renouvellement automatique.
8. **Material Bank** : échantillons gratuits livrés le lendemain, 190 000+ professionnels déclarés ; a remplacé la matériauthèque physique dans beaucoup de cabinets, quasiment pas d'avis formels (2 sur G2).

Mentions : Gusto et Rippling (paie des cabinets, Rippling 4,8 sur 13 175 avis G2 mais plaintes sur contrats et hausses de prix) ; Notion (wiki de standards BIM en remplacement des manuels PDF) ; Monograph Pipeline (CRM intégré à la gestion de cabinet, sans SF 330 ni go/no-go).

## Signaux de douleur utilisateur repérés

- **Les CRM généralistes sont trop lourds pour un petit cabinet** : HubSpot "quite complicated with too many features for my needs", "to much info and features" ; Pipedrive "pricing too high" ; cabinets qui finissent sur Excel, Google Tables, Monday.com ou Less Annoying CRM. Source : https://communityhub.aia.org/discussion/crm-for-architectural-firms (juin-juillet 2024).
- **Rejet du principe même du CRM par une partie des architectes** : "a firm not keeping up with clients without one is doing something wrong" ; un cabinet moyen garde Newforma faute de remplaçant pour sa partie CRM. Source : https://archinect.com/forum/thread/150062800/anyone-using-crm-at-a-small-firm (2018-2022).
- **Les CRM AEC sont puissants mais difficiles** : Unanet CRM jugé "hard to use", navigation lourde, reporting faible ; Deltek Vantagepoint, reporting médiocre (49 avis) et fonctionnalités manquantes (48 avis). Sources : https://www.g2.com/products/unanet-crm-by-cosential/reviews ; https://www.g2.com/compare/deltek-vantagepoint-vs-unanet-crm-by-cosential.
- **Le tagging des photos reste manuel et chronophage** même avec un DAM dédié (OpenAsset : "tagging metadata very time-consuming", problèmes de filtres). Source : https://www.g2.com/products/openasset/reviews.
- **Les standards de dessin vivent dans des PDF ou intranets fermés** : un cabinet garde un "style book" PDF sur l'intranet, restreint à l'accès au bureau, ce que les équipes n'aiment pas ; templates, détails types et standards restent des objets séparés. Source : fil r/Architects "Internal office manual for construction drawings" (2025, via résumé de recherche ; reddit.com inaccessible).
- **Gestion de contenu Revit : prix opaques et marché bousculé** : question de prix par siège sans réponse sur AUGI dès 2018 ; Autodesk rend Content Catalog gratuit mais sans contenu fabricants, API ni analytics. Sources : https://forums.augi.com/archive/index.php/t-172763.html ; https://aecmag.com/data-management/autodesk-content-catalog/.
- **Leads Houzz jugés rares et de mauvaise qualité, prix opaques, outil pensé pour les remodelers** plutôt que pour les architectes. Sources : https://www.softwareadvice.com/construction/houzz-pro-profile/ ; https://illustrarch.com/articles/design-softwares/110257-houzz-pro-review.html.
- **Coût de la préparation à l'ARE** : "OVER $200 a month for ONE exam", renouvellement automatique sans avertissement, vidéos pas assez techniques, sur fond de 1 578 $ de frais d'examen NCARB pour six divisions. Sources : https://www.trustpilot.com/review/blackspectacles.com ; https://www.ncarb.org/fees.
- **Paie et RH : contrats et hausses de prix** : Rippling, contrats difficiles à résilier, renouvellement automatique, hausses non annoncées, biais possible des avis (cartes cadeaux) ; Gusto, plan d'entrée passé de 40 $ à 49 $ en 2025. Sources : https://ripplingpricing.pages.dev/reviews ; https://www.noon.ai/blog/articles/317-gusto-pricing-2026.
- **Job boards saturés** : Archinect indique que l'option payante "Wider & Prolonged" est requise pour apparaître en première page. Source : https://archinect.com/add_job/package.

## À faire en phase suivante

- Relancer les requêtes Reddit et G2 non abouties (notes G2 manquantes pour 40 outils, pros et contras pour une trentaine).
- Documenter ARCAT, Architizer, Canva, Justworks dès que les sites répondent.
- Confirmer les sièges sociaux marqués "non vérifié" (HubSpot, Salesforce, Gusto, BambooHR, Ideate, Monograph, Material Bank, etc.).
- Retrouver l'enquête AIA sur l'usage de l'IA dans les cabinets pour la ligne "assistants IA généralistes".
