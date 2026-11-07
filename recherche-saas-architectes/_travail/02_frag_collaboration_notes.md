# Notes : Collaboration, revue de plans, coordination BIM et gestion documentaire

Date de vérification : 2026-11-07. Fichier de données : `02_frag_collaboration.jsonl` (26 outils).

## Nombre d'outils documentés

26 outils : Bluebeam Revu (avec Bluebeam Cloud et Studio), Revizto, Autodesk Docs (ACC, rebaptisé Forma Data Management), Autodesk BIM Collaborate / BIM Collaborate Pro, Autodesk Navisworks, Newforma Konekt (et Project Center), Speckle, Trimble Connect, Solibri, BIMcollab, Dalux, Procore (usage architectes), Egnyte (Project Hub AEC), Panzura CloudFS, Nasuni, Microsoft 365 (SharePoint, OneDrive, Teams), Google Workspace, Dropbox, Box, Miro, Figma FigJam, Slack, Loom, Docusign eSignature, Layer (layer.team), Cintoo Cloud.

## Outils écartés et pourquoi

- Catenda Hub (ex-Bimsync) : prix vérifiés sur catenda.com/pricing (par projet, en euros : environ 400 €/mois pour un projet de 10 M€, 1 100 €/mois pour 50 M€, hébergement par défaut en Norvège et Allemagne) mais aucune présence ni bureau US trouvés. Hors périmètre.
- Kahua : plateforme de gestion de programmes pour maîtres d'ouvrage (Alpharetta, Géorgie, fondée 2009, 2 500+ clients déclarés). Les architectes n'y sont pas visés (kahua.com/about). À laisser à l'agent chantier/maîtrise d'ouvrage si besoin.
- Asite : CDE londonien, un bureau US à New York (asite.com/global-offices), clientèle surtout UK, Moyen-Orient et Asie. Usage par les cabinets US non documenté. Écarté.
- Oracle Aconex : site oracle.com inaccessible (HTTP 403). Outil de maîtrise d'ouvrage et d'entreprises générales sur très grands projets, peu de signaux d'usage par les cabinets US. Non documenté.
- Resilio Connect : synchronisation de fichiers d'entreprise, aucune preuve d'usage par des cabinets d'architecture dans les résultats ; G2 4,7/5 sur 53 avis, prix « à partir de 7 500 $/an » selon Software Advice (extraits). Trop périphérique.
- Autodesk Tandem et Autodesk Drive : site autodesk.com inaccessible (HTTP 403), aucune donnée prix ou avis exploitable. Tandem apparaît dans le bundle Forma « Model Management » (construction.autodesk.com/pricing).
- BIM Track : fusionné dans Newforma Konekt (BIM One acquis en 2021), n'existe plus comme produit autonome.
- Morpholio, Rayon : outils d'esquisse et de conception, hors catégorie.
- Unifi, Notion, Smartsheet : laissés aux agents connaissances et gestion de cabinet, comme demandé.
- PlanGrid (Autodesk Build), Part3 : laissés à l'agent chantier.
- Aurigo, Thinkproject : plateformes maîtres d'ouvrage (Aurigo) ou européennes (Thinkproject), non documentées faute de budget de recherche.
- CADstudio : non identifié.

## Sites inaccessibles ou limites de collecte

- g2.com et capterra.com : HTTP 403 sur toutes les pages produit. Les notes G2 du JSONL proviennent d'extraits de résultats de recherche de ces pages (Bluebeam 4,5/461 au cliché de juillet 2026, Revizto 4,6/207, ACC 4,4/5 271, Navisworks 4,5/199, Newforma Konekt 4,3/30, BIMcollab 4,5/17, Solibri Office 4,5/1, Egnyte 4,5/1 119 via le listing AWS Marketplace, Procore 4,6/3 396 via rfp.wiki). Pour les outils génériques (Miro, Slack, Figma, Loom, Docusign, Box, Dropbox, Microsoft 365, Google Workspace, Trimble Connect, Dalux, Speckle) : « non trouvé ».
- trustradius.com, cdw.com, forums.autodesk.com, forums.augi.com, oracle.com : HTTP 403.
- autodesk.com et autodesk.ca : HTTP 403. Conséquence : prix US d'Autodesk Docs, BIM Collaborate Pro et Navisworks non vérifiés. Indices retenus : UK 1 050 £/an pour BIM Collaborate Pro (autodesk.co.uk), renouvellement 1 003,99 $ chez CDW, 925 à 1 080 $/an selon rfp.wiki, « about $925/year » sur r/Revit (janvier 2025).
- reddit.com (dont old.reddit.com) : bloqué par l'outil de fetch. Les fils r/Revit et r/Architects cités sont résumés d'après des extraits de recherche, avec l'URL canonique.
- microsoft.com : HTTP 503 à trois reprises (prix Microsoft 365 non vérifiés).
- workspace.google.com et box.com : pages chargées mais prix rendus en JavaScript (champs vides).
- newforma.com/about-us et /newsroom, egnyte.com/company et /about-us, revizto.com/en/about-us, cintoo.com/company, panzura.com/about, bimcollab.com/en/pricing : HTTP 404 (informations prises sur d'autres pages des mêmes sites).
- community.bluebeam.com : contenu du fil Revu 21 non rendu (titre seul), citations prises via extrait de recherche et via costbench.com.
- Budget de recherche web épuisé après 29 requêtes (limite partagée entre agents), ce qui a empêché les recherches Reddit ciblées (« file sharing with consultants », « Newforma alternatives ») au-delà des premiers résultats et les vérifications d'entreprise (siège, année) pour plusieurs éditeurs. Les mentions « connaissance générale, non revérifié ce jour » signalent ces cas.

## Les 8 outils les plus importants de la catégorie

1. Bluebeam Revu : standard de fait de la revue de plans PDF aux États-Unis (4 M+ utilisateurs déclarés, 350 000+ entreprises), prix publics clairs (260 à 590 $/utilisateur/an), palier Max IA lancé en 2026. Le passage à l'abonnement reste le point de friction numéro un.
2. Autodesk BIM Collaborate Pro : seule voie officielle pour le coworking cloud Revit, donc incontournable pour les cabinets multi-bureaux ou travaillant avec des consultants Revit ; environ 1 000 $/utilisateur/an, performances de synchronisation critiquées.
3. Autodesk Docs / ACC (Forma Data Management) : CDE le plus répandu côté Autodesk, 5 271 avis G2 (4,4), souvent imposé par l'entrepreneur ; licence requise même pour recevoir un RFI.
4. Newforma Konekt : référence historique du classement d'emails et de l'administration de chantier chez les cabinets moyens et grands ; coût et vieillissement du produit alimentent la recherche d'alternatives (TonicDM, Cogram, ACC).
5. Egnyte : remplaçant de serveur de fichiers le plus visible sur le segment AEC (23 000+ clients déclarés, add-ons AEC à 6 $/utilisateur/mois, Project Hub lancé mi-2025, intégrations ACC, Procore, Newforma, Bluebeam).
6. Revizto : outil de coordination BIM et d'issues le mieux noté sur G2 (4,6/207), tarification opaque et jugée élevée par les petites structures.
7. Microsoft 365 (SharePoint, OneDrive, Teams) : stack de fait de la quasi-totalité des cabinets, mais inadapté au worksharing Revit, ce qui pousse vers ACC ou un NAS cloud.
8. Speckle : croissance et visibilité (série A 12,5 M$ en juin 2025, soutien de Suffolk Technologies), open source, mais changement de modèle tarifaire en février 2026 mal reçu par les petits utilisateurs.

## Signaux de douleur utilisateur les plus fréquents

- Abonnement forcé et hausses de prix Bluebeam (fin des licences perpétuelles, +10 %/an pour les anciens clients maintenance, +10 % au 2024-06-01) : https://www.costbench.com/software/construction-management/bluebeam-revu/ ; https://community.bluebeam.com/discussion/363/give-revu-21-to-revu-20-owners-with-maintence-for-the-same-price-as-they-have-been-paying ; https://www.drawboard.com/blog/bluebeam-pricing
- Fonctions Bluebeam verrouillées par palier (Sketch to Scale, Dynamic Fill absents de Basics) : https://www.costbench.com/software/construction-management/bluebeam-revu/
- Lenteur de synchronisation Revit Cloud Worksharing sur gros modèles et sensibilité à la latence : https://forums.autodesk.com/t5/revit-architecture-forum/bim-360-model-open-amp-sync-slow-even-without-linked-models/m-p/13003443 ; https://www.trustradius.com/reviews/autodesk-bim-360-2021-10-13-03-49-27
- Coût par siège Autodesk (BIM Collaborate Pro environ 925 à 1 080 $/an) et licence nécessaire pour qu'un consultant reçoive un RFI ou un submittal : https://www.reddit.com/r/Revit/comments/1i3j7ql/switching_from_onedrive_to_acc/ ; https://cogram.com/blog/evaluating-newforma-alternatives
- Consultants sans abonnement ACC qui ne peuvent pas ouvrir les liens de partage, retour aux transferts de fichiers : https://forums.autodesk.com/t5/bim-360-support-forum/share-cloud-model-with-consultant-not-using-bim-360-design/m-p/9330084
- OneDrive et SharePoint inadaptés au worksharing Revit : https://www.reddit.com/r/Revit/comments/1i3j7ql/switching_from_onedrive_to_acc/
- Newforma : coût de renouvellement supérieur aux outils de production, modèle tout-ou-rien, produit vieillissant, paiement pour des modules inutilisés : https://forum.4specs.com/t/need-to-replace-newforma-what-software-are-you-using/3416 ; https://www.mailmanager.com/blog/newforma-to-konekt-a-pricing-wake-up-call ; https://communityhub.aia.org/discussion/users-of-cmap-mail
- Manque de classement d'emails dans BIM 360 / ACC comparé à Newforma : https://archinect.com/forum/thread/150174390/project-management-solutions-newforma-alternatives
- Revizto : coût élevé et licences qui limitent le nombre de projets des petites structures : https://www.g2.com/products/revizto/reviews
- Speckle : passage de 9 $ à 99 $/mois avec le modèle à l'usage de février 2026, ROI contesté pour un usage « viewer » : https://speckle.community/t/psa-new-business-model/21591
- Procore perçu comme fait pour les entrepreneurs, pas pour les cabinets ; tarification ACV et hausses au renouvellement : https://forum.4specs.com/t/need-to-replace-newforma-what-software-are-you-using/3416 ; https://www.rfp.wiki/vendors/autodesk-construction-cloud/procore
- NAS cloud : Panzura jugé cher et peu granulaire, Nasuni sans licence sous 30 To : https://www.peerspot.com/products/panzura-cloudfs-reviews ; https://peerspot.com/products/comparisons/nasuni_vs_panzura-cloudfs
