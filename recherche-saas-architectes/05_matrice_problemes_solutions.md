# 05. Matrice problèmes x catégories de solutions

Date : 2026-11-07. Lignes : les 30 problèmes de `04_problemes_architectes.md` (numéros P1 à P30,
score sur 20 entre parenthèses). Colonnes : les neuf catégories de `02_base_saas.csv`, la gestion de
cabinet étant scindée en deux (suites dédiées A&E d'un côté, outils généralistes de l'autre) parce
que leurs réponses diffèrent.

Codes : **B** bien résolu (outils adoptés, plaintes marginales) ; **P** partiellement résolu (outils
existants mais contournements fréquents, segment non couvert ou prix prohibitif) ; **M** mal résolu
(outils existants et majoritairement critiqués) ; **N** non résolu (aucun outil courant ne s'y
attaque) ; **.** catégorie non concernée.

## 1. Matrice

| Problème | CAD / BIM | IA et design nouvelle génération | Visualisation | Collaboration et documents | Conformité, specs, estimation, AO | Suites A&E (Deltek, BQE, Monograph, Unanet) | Généralistes (QuickBooks, Harvest, Asana, Notion) | Suivi de chantier | Marketing, CRM, KM, RH | Résidentiel et intérieur |
|---|---|---|---|---|---|---|---|---|---|---|
| P1 Temps, facturation, rentabilité (19) | . | . | . | . | . | M | P | . | . | P |
| P2 CA dans l'outil de l'entrepreneur (17) | . | . | . | P | . | P | N | M | . | P |
| P3 Coût et licences des éditeurs dominants (17) | M | P | M | M | P | M | B | P | . | M |
| P4 Coordination des consultants, échange de modèles (17) | P | P | . | M | . | . | N | . | . | . |
| P5 Gestion de projet interne (17) | . | . | . | P | . | M | M | . | P | P |
| P6 Honoraires, dérive de périmètre, impayés (16) | . | . | . | . | . | P | P | . | P | P |
| P7 Spécifications (16) | P | N | . | . | M | . | P | . | . | N |
| P8 Permis et conformité (16) | P | P | . | P | P | . | . | . | . | . |
| P9 IA sans bénéfice ni formation (16) | P | M | P | . | P | P | P | P | P | . |
| P10 Documents de construction (16) | M | P | . | . | . | . | . | . | . | P |
| P11 Fragmentation de la stack (16) | . | . | . | P | . | M | M | . | . | P |
| P12 Petits cabinets exclus par le prix (16) | M | P | B | P | P | N | B | M | P | B |
| P13 Facturation par phase et forfaits (15) | . | . | . | . | . | P | M | . | . | P |
| P14 Planification de la charge (15) | . | . | . | . | . | P | P | . | . | . |
| P15 Savoir interne enfoui (15) | N | P | . | P | . | . | P | . | P | . |
| P16 Recrutement, rétention, licence (15) | . | . | . | . | . | . | . | . | P | . |
| P17 Apps mobiles des suites A&E (15) | . | . | . | . | . | M | B | . | . | . |
| P18 Performance et stabilité BIM/CAD (14) | M | P | P | . | . | . | . | . | . | M |
| P19 CRM et marketing petits cabinets (14) | . | . | . | . | . | P | P | . | M | P |
| P20 Annotation et revue sur le chantier (14) | . | . | . | M | . | . | . | M | . | . |
| P21 Rupture esquisse vers BIM (14) | M | P | . | . | . | . | . | . | . | P |
| P22 Rendu temps réel, licences (13) | . | . | P | . | . | . | . | . | . | . |
| P23 Estimation en conception (13) | . | P | . | . | M | . | . | . | . | P |
| P24 Cybersécurité et sinistres (13) | . | . | . | P | . | . | P | . | . | . |
| P25 Contenu Revit (12) | P | . | . | . | . | . | . | . | P | . |
| P26 Support des grands éditeurs (12) | M | . | M | M | . | M | . | . | . | . |
| P27 Dirigeant amortisseur financier (11) | . | . | . | . | . | . | . | . | . | . |
| P28 Relevé de l'existant (11) | . | . | P | . | . | . | . | . | . | P |
| P29 Clôture et archivage (11) | . | . | . | P | . | . | . | P | . | . |
| P30 Licence et formation (11) | . | . | . | . | . | . | . | . | P | . |

## 2. Justifications par ligne

**P1.** Suites A&E : M. BQE CORE (G2 4,3 sur 449, Capterra 4,5 sur 783) concentre les plaintes de
bugs et lenteurs ; Deltek Vantagepoint (4,1 sur 645) et Ajera (4,1 sur 202) sont jugés complexes et
datés ; Monograph (4,5 sur 236 Capterra) a les retours les plus positifs mais des avis 1 étoile sur
la migration et la fiabilité des factures (04, P1). Généralistes : P. Harvest et Toggl font le temps,
QuickBooks la compta, mais aucun ne fait la rentabilité par projet ni la facturation par phase sans
Excel. Résidentiel : P. Houzz Pro et Studio Designer couvrent la facturation des designers, pas celle
des architectes (G702, phases).

**P2.** Suivi de chantier : M. Procore, Autodesk Build, Fieldwire sont faits pour l'entrepreneur ;
Part3 est le seul outil pensé pour l'architecte, jeune (2020), 150 à 200 $/utilisateur/mois ; Newforma
Konekt « too big, too clunky, too expensive » ; Submittal Exchange noté 3,2/10 sur TrustRadius.
Collaboration : P. Bluebeam sert à tamponner, pas à tenir le log. Suites A&E : P. ArchiSnapper
(Deltek) fait les rapports de visite, pas les RFIs. Généralistes : N. Excel et email sont le
contournement, pas une solution.

**P3.** B pour les généralistes (QuickBooks, Harvest ont augmenté, mais l'offre est large et
substituable). M partout ailleurs : Revit, Bluebeam, Enscape, V-Ray, SketchUp, Chief Architect,
Vectorworks, SoftPlan ont tous supprimé le perpétuel ou monté les prix (04, P3). P en IA et design
nouvelle génération et en conformité : prix souvent « sur devis », opacité plutôt que hausse.

**P4.** Collaboration : M. BIM Collaborate Pro fonctionne mais coûte environ 1 000 $/an par utilisateur
et exclut les consultants non abonnés ; Speckle change de modèle en 2026 ; Egnyte et NAS cloud
résolvent le fichier, pas le modèle. CAD/BIM : P, l'IFC et les liens Revit existent mais les retours
disent « remodeler ». IA et design : P, Motif, Snaptrude, Speckle promettent l'interopérabilité
cloud sans preuve d'adoption. Généralistes : N, OneDrive et Dropbox sont inadaptés au worksharing.

**P5.** Suites A&E : M. Monograph est cité parmi les outils qui « ne répondent pas aux besoins » ;
Deltek « never fully realized the PM or tracking potential ». Généralistes : M. Asana, Monday, Teams,
Notion, ClickUp exigent « trop de personnalisation forcée ». Collaboration : P (Newforma fait le
classement d'emails, pas le suivi des décisions). KM : P (Notion, Confluence servent de wiki).
Résidentiel : P (Buildertrend, JobTread pour le design-build).

**P6.** Aucune catégorie ne suit la dérive de périmètre en temps réel. Suites A&E et généralistes :
P (budget vs réalisé après coup). Marketing et CRM : P (Proposify, PandaDoc, AIA Contract Documents
pour la proposition et le contrat).

**P7.** Conformité et specs : M. Deltek Specpoint détient MasterSpec et concentre les critiques
(« hot mess », export vers Word) ; SpecLink absorbé ; ARCAT et Conspectus marginaux ; aucune offre
pour les petits cabinets. CAD/BIM : P (keynotes Revit). Généralistes : P (Word est l'outil réel).
IA et résidentiel : N (pas de produit identifié ; « AI spec startups » non trouvées).

**P8.** Conformité : P. UpCodes résout la recherche (39 à 68 $/mois) mais deux écarts avec le code
officiel ont suffi à le faire interdire dans un cabinet ; Symbium, Archistar, PermitFlow, Pulley
ciblent les villes ou les gros déposants. Collaboration : P (Bluebeam découpe les PDF, à 260 $/an
minimum). CAD/BIM et IA : P (Solibri, Model Checker, CodeComply vérifient le modèle, pas le dépôt).

**P9.** IA et design : M. Les outils IA métier (rendu génératif, copilotes Revit) sont jugés bons
pour l'idéation, incapables en documentation ; prix opaques ; 76 % des cabinets utilisateurs sans
gain. P ailleurs : chaque catégorie annonce des fonctions IA (Monograph Ask, Bluebeam Max, Procore,
Part3 submittals) sans retour utilisateur suffisant.

**P10.** CAD/BIM : M. Revit, Archicad, LayOut concentrent les plaintes de productivité ; Revit LT
bride les plug-ins. IA : P (SWAPP, ArchiLabs, Glyph automatisent une partie ; adoption limitée aux
grands cabinets). Résidentiel : P (Chief Architect, SoftPlan produisent vite mais « détails
difficiles »).

**P11.** Suites A&E : M (tout-en-un rejetés pour leur lourdeur, intégrations QuickBooks fragiles).
Généralistes : M (chacun « fait une chose bien »). Collaboration et résidentiel : P.

**P12.** Visualisation, généralistes, résidentiel : B (Twinmotion gratuit, D5 Community, SketchUp
399 $/an, HubSpot Free, Houzz Pro gratuit, magicplan au projet). Suites A&E : N (Deltek et BQE sur
devis, Monograph dès 45 $/mois est l'exception). Chantier : M (Part3 9 000 $/an, Fieldwire 89 $ pour
les RFIs). CAD/BIM : M (Revit 3 005 $/an ; Revit LT 560 $ bridé).

**P13.** Généralistes : M (QuickBooks sans job costing, Harvest sans phases). Suites A&E : P (BQE
fait G702/G703 ; Monograph gère les phases ; mais voir P1). Résidentiel : P.

**P14.** Suites A&E : P (Mosaic, Monograph, CMap, Deltek proposent la planification ; données non
tenues à jour). Généralistes : P (Float, Runn, Resource Guru, tableurs).

**P15.** CAD/BIM : N (aucun outil courant ne dit quel détail Revit est à jour). IA : P (ARKI,
assistants IA d'entreprise annoncés). Collaboration : P (SharePoint, Egnyte stockent). Généralistes
et KM : P (Notion, Confluence, Guru hébergent un wiki si quelqu'un l'entretient).

**P16.** KM et RH : P. Gusto, Rippling, BambooHR gèrent la paie ; Archinect Jobs et LinkedIn
recrutent ; rien ne suit l'AXP ni la charge individuelle en lien avec le planning.

**P17.** Suites A&E : M (apps mobiles Deltek, BQE, Unanet notées 1 étoile). Généralistes : B (Harvest,
Toggl, QuickBooks mobiles corrects).

**P18.** CAD/BIM : M (Revit plantages et lenteur, Vectorworks bugs). IA et visualisation : P
(Snaptrude et Rayon vantent le navigateur ; Enscape plante Revit). Résidentiel : M (Chief Architect
lent sur Mac).

**P19.** Marketing et CRM : M pour les petits (HubSpot, Pipedrive trop lourds ; Unanet, Deltek CRM
pour les 50+). Suites A&E : P (Monograph Pipeline, BQE Pursuit, sans SF 330 ni go/no-go).
Généralistes : P (Less Annoying CRM, Monday, Google Sheets). Résidentiel : P (Houzz Pro, leads rares).

**P20.** Collaboration et chantier : M (Bluebeam Cloud, BIM 360, Autodesk Build, Procore, Revizto
mobiles critiqués ; ArchiSnapper limité en markup).

**P21.** CAD/BIM : M (SketchUp vers Revit = remodelage ; Revit « overkill » en esquisse). IA : P
(Snaptrude, Arcol, Skema, Veras visent ce passage). Résidentiel : P (Chief Architect fait les deux
en résidentiel).

**P22.** Visualisation : P (marché concurrentiel et bon techniquement, mais licences nommées Chaos,
fin des gratuits, Mac absent chez D5 et Lumion).

**P23.** Conformité et estimation : M (RSMeans, Kreo, STACK, Togal visent les entrepreneurs ;
rien d'intégré au BIM pour l'esquisse). IA : P (TestFit, Forma donnent des ordres de grandeur
promoteurs). Résidentiel : P (Buildxact, Houzz Pro estimates côté builder).

**P24.** Collaboration : P (Egnyte, Box, Microsoft 365 avec gouvernance). Généralistes : P.

**P25.** CAD/BIM : P (Content Catalog gratuit mais amputé). KM : P (AVAIL, Kinship, Ideate, CTC
payants, peu d'avis indépendants).

**P26.** M chez Autodesk, Bluebeam, Chaos, Deltek, BQE (04, P26).

**P27.** Aucune catégorie : problème de marché.

**P28.** Visualisation et résidentiel : P (Polycam, Matterport, Twindo, magicplan fonctionnent,
paliers tarifaires frustrants).

**P29.** Collaboration et chantier : P (Egnyte, ACC archivent ; sortie difficile ; pas de structure
de clôture par projet).

**P30.** RH et formation : P (Black Spectacles, Amber Book, AIAU, Autodesk et Graphisoft Learn ;
cher, payé par le candidat).

## 3. Zones blanches (problèmes forts, peu ou pas de solutions)

1. **Le dossier de chantier de l'architecte** (P2, P20) : un log indépendant des RFIs, submittals,
   visites et décisions, à prix fixe par cabinet, connecté à Procore et ACC. Part3 l'attaque par le
   haut (150 à 200 $/siège/mois), Cogram et SubmittalLink par l'IA et le forfait, sans avis. Le petit
   cabinet, qui fait 1 à 3 punch lists par an, n'a rien.
2. **Le suivi des décisions et de la coordination dans la gestion de projet** (P5, P4) : qui a
   décidé quoi, quand, sur quelle version ; aucun outil cité dans le fil Archinect de 2026 (30
   réponses) ne le fait ; les cabinets codent le leur.
3. **Le savoir interne et la version en vigueur** (P15, P25) : détails types, standards,
   procédures ; Autodesk a gratuité le contenu mais pas la connaissance ; les wikis vivent si
   quelqu'un les tient.
4. **Les spécifications des petits cabinets et du résidentiel** (P7) : entre MasterSpec Small Project
   dans Word et rien ; aucune startup IA identifiée dans cet espace au 2026-11-07.
5. **La facturation par phase pour les cabinets de 1 à 9 personnes** (P1, P13, P12) : Monograph à
   45 $/mois est le seul outil A&E accessible ; QuickBooks + Harvest ne le font pas ; BQE et Deltek
   sont hors de portée.
6. **Le dépôt de permis** (P8) : découpage, nommage, suivi des cycles de commentaires, reprise des
   remarques ; UpCodes s'arrête à la recherche, PermitFlow aux gros déposants, les villes achètent
   Archistar ; l'architecte reste seul avec Bluebeam et un tableur.
7. **La dérive de périmètre en temps réel** (P6) : alerte quand les heures d'une phase dépassent le
   forfait, journal des demandes clients ; absent de tous les outils cités.

## 4. Marchés saturés

- **Rendu temps réel** (P22) : Enscape, Twinmotion, D5, Lumion, V-Ray, Corona, Unreal, Blender ;
  gratuits de qualité ; Chaos consolide (Enscape, V-Ray, Corona, Veras, CGarchitect). Entrer y
  demande une rupture technique ou un prix nul.
- **Gestion de projet généraliste** : Asana, ClickUp, Monday, Notion, Trello, Basecamp, Smartsheet,
  Airtable, Wrike, Teamwork ; tous rejetés par les architectes pour les mêmes raisons ; un
  « Asana pour architectes » de plus n'a pas d'avenir sans le suivi des décisions et des phases.
- **Suites de gestion A&E pour les 50+** : Deltek Vantagepoint, Unanet AE, BQE CORE, CMap ; cycles
  de vente longs, migrations de plusieurs mois, « facturé à l'effectif » ; marché verrouillé par le
  coût de sortie.
- **Faisabilité et test fits** : TestFit, Deepblocks, Giraffe, qbiq, Laiout, Spacio, Forma, Archistar,
  Parafin, Aino, Algoma ; concurrence dense, clients promoteurs plutôt qu'architectes.
- **Rendu génératif d'images** : Veras, Vizcom, LookX, PromeAI, ArchiVinci, Gendo, Maket, Midjourney ;
  prix bas, différenciation faible, jugés « bons pour l'idéation » seulement.
- **BIM cloud-native** : Snaptrude, Arcol, Motif, Rayon, Skema ; 100 M$+ levés au total, adoption US
  non démontrée, dépendance aux consultants sous Revit.

## 5. Segments délaissés

- **Les cabinets de 1 à 9 personnes (75 % des cabinets, 7,4 % des honoraires)** : exclus des suites
  A&E (sur devis), de la CA dédiée (Part3), de la coordination cloud (BIM Collaborate Pro) ; servis
  par des généralistes qui ne connaissent pas les phases, les forfaits ni les submittals. Leur budget
  accepté se lit dans les prix qu'ils paient : 45 à 100 $/mois pour la gestion, 260 à 400 $/an par
  outil de production, zéro pour la CA.
- **Les cabinets de 10 à 49 personnes** : trop grands pour Harvest + QuickBooks, trop petits pour
  Deltek ; Monograph, BQE CORE et CMap se disputent ce segment avec des avis contrastés ; c'est là que
  se concentrent les témoignages « nous avons tout essayé ».
- **Les cabinets hors Autodesk (Archicad, Vectorworks, SketchUp, Chief Architect)** : moins
  d'intégrations, « pas assez d'utilisateurs aux États-Unis », consultants sous Revit ; tout outil
  « plugin Revit uniquement » les ignore.
- **Le résidentiel** (20 % des revenus, surtout petits cabinets) : stack « constructeur » (Chief
  Architect, SoftPlan, Buildertrend, Houzz Pro) pensée pour le builder ou le designer, pas pour
  l'architecte responsable du permis et de la CA.
- **Les utilisateurs Mac** : Revit, D5, Lumion absents ; Enscape Mac en retard et plus cher.
- **Les spécifieurs et chargés de permis** : fonctions sans outil moderne, à l'écart des roadmaps.
