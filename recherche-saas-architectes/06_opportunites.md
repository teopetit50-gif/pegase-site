# 06. Tendances de fond et opportunités pour un nouvel entrant

Date : 2026-11-07. Ce document s'appuie sur `01` (marché), `02` (300 outils), `04` (30 problèmes
notés) et `05` (matrice). Les chiffres y sont repris avec leur étiquette ; les URL sont dans les
documents cités et dans `sources.md`.

## 1. Top 10 des problèmes les plus douloureux et les moins bien résolus

Critère : score total de `04` pondéré par la case « insatisfaction » (les problèmes bien couverts par
un acteur dominant, comme la performance de Revit, sont écartés même s'ils sont fréquents).

| Rang | Problème | Score /20 | Insatisfaction | Pourquoi il reste ouvert |
|---|---|---|---|---|
| 1 | Temps, facturation, rentabilité (P1) | 19 | 4 | Outils installés partout, détestés partout ; migrations de plusieurs mois ; apps mobiles à 1 étoile |
| 2 | Suivi de chantier dans l'outil de l'entrepreneur (P2) | 17 | 5 | L'architecte n'est pas le client de Procore ; Part3 jeune et cher ; Excel partout |
| 3 | Gestion de projet interne, décisions perdues (P5) | 17 | 5 | Aucun outil ne garde l'historique des décisions par livrable ; généralistes rejetés |
| 4 | Coordination des consultants et échange de modèles (P4) | 17 | 4 | ACC cher et fermé aux non-abonnés ; Speckle change de modèle ; OneDrive inadapté |
| 5 | Spécifications (P7) | 16 | 5 | Monopole Deltek sur MasterSpec, produit jugé « hot mess » ; rien pour les petits |
| 6 | Permis et conformité (P8) | 16 | 4 | Recherche de code couverte (UpCodes), dépôt et cycles de commentaires non couverts |
| 7 | Petits cabinets exclus par le prix (P12) | 16 | 5 | Suites A&E sur devis, CA à 9 000 $/an, cloud Revit à 1 000 $/siège |
| 8 | Savoir interne enfoui (P15) | 15 | 5 | « 40 years of files » ; aucun outil ne connaît la version en vigueur |
| 9 | Honoraires, dérive de périmètre, impayés (P6) | 16 | 4 | Contrats et propositions outillés, suivi de la dérive absent |
| 10 | Documents de construction, automatisation (P10) | 16 | 4 | Promesses IA sans date ; SWAPP réservé aux grands ; Revit LT bridé |

## 2. Tendances de fond

### 2.1 IA générative : beaucoup d'usage, peu de valeur démontrée, une attente qui se retourne

- 48 % des cabinets « s'engagent » avec l'IA, 7 % forment, 15 % budgètent ; 76 % des utilisateurs ne
  voient pas de gain de productivité (ABI août 2026) [vérifié]. 6 % utilisent régulièrement (AIA,
  mars 2025) [vérifié]. 70 % utilisent, 38 % mesurent un impact (Deltek 2026) [déclaratif].
- L'usage réel est générique (ChatGPT, Copilot) et textuel ; les outils métier sont jugés bons pour
  l'idéation (rendu) et incapables en documentation (« AI isn't currently capable of doing a decent
  job in REVIT », 2026-11).
- Effet pervers documenté : les clients attendent des livrables « au rythme de l'IA » et des images
  concept gratuites ; des entrepreneurs envoient des calendriers de submittals générés par IA
  « désorganisés et inexacts ».
- Conséquence pour un entrant : vendre « de l'IA » ne suffit plus ; vendre un résultat vérifiable
  (log tenu, spec cohérente, feuille de temps remplie) avec l'IA en coulisse est la seule promesse
  crédible. La responsabilité (« do you stamp it? ») impose une IA assistante, pas auteure.

### 2.2 Automatisation des documents de construction

- Acteurs : SWAPP (18,5 M$, prix par projet, références Stantec, Page, VLK) [déclaratif], ArchiLabs,
  BIMLOGiQ, Augmenta (MEP, 10 M$ 2025), EvolveLAB Glyph (600 $/an), pyRevit et Dynamo (gratuits),
  agents Forma annoncés par Autodesk le 15 septembre 2026 sans date (notes CAD/BIM).
- Signal : les grands cabinets achètent par projet ; les petits attendent que ce soit dans Revit.
  Autodesk a tout intérêt à l'intégrer, ce qui limite la fenêtre des indépendants « plugin Revit ».

### 2.3 Vérification automatique de conformité

- Côté villes : Archistar AI PreCheck (Austin, Los Angeles, Yonkers, Cape Coral), Symbium (Californie),
  API Code Connect de l'ICC ; côté déposants : UpCodes AI Plan Review (accès anticipé), CodeComply
  (3 000 $/siège/an déclaré), PermitFlow (54 M$ série B, décembre 2025) [vérifié].
- Aucune évaluation indépendante de la fiabilité de ces IA n'a été trouvée ; un cabinet a interdit
  UpCodes après deux écarts. Le marché se structure en B2G (la ville paie) et B2B gros volume ;
  l'architecte individuel reste à l'écart.

### 2.4 Consolidation et verrouillage

- Nemetschek (Archicad, Vectorworks, Bluebeam, dRofus, Morpholio) ; Chaos (Enscape, V-Ray, Corona,
  Veras, CGarchitect) ; Deltek (Vantagepoint, Ajera, Specpoint avec MasterSpec et SpecLink,
  ArchiSnapper) ; Autodesk (Revit, ACC, Forma, BuildingConnected, ProEst, UNIFI devenu Content
  Catalog) ; Trimble (SketchUp, Sefaira, e-Builder) ; ECI (CMap) ; Hilti (Fieldwire) ; CoStar
  (Matterport) ; Bending Spoons (Harvest) ; Access Group (Fonn) ; Studio Designer (Mydoma).
- Chaque consolidation s'est accompagnée d'un changement de licence subi par les utilisateurs
  (licences nommées Chaos, abonnement Bluebeam, retrait de SpecBuilder, hausse Harvest) : les avis
  1 étoile de 2025-2026 sont majoritairement des avis de rachat.

### 2.5 Politique d'abonnement d'Autodesk et contagion

- Revit 3 005 $/an, hausse de coût de possession « 70 %+ » (2015-2019), audits de licences, fin du
  perpétuel (2016) ; en 2026 Autodesk dit que Revit reste le cœur et que Forma arrivera graduellement.
- Tous les autres éditeurs ont suivi (SketchUp, Vectorworks, SoftPlan, Chief Architect, Bluebeam,
  Chaos, Lumion, Twinmotion au-dessus de 1 M$). Le seul grand outil perpétuel restant est Rhino
  (995 $). Les cabinets n'ont plus de levier ; ils compensent par Archicad, Vectorworks, Revit LT ou
  des outils gratuits.

### 2.6 Un marché qui se contracte et qui vieillit

- ABI sous 50 depuis fin 2022, contrats en baisse sur 25 mois [secondaire], 10 % des cabinets
  prévoient de croître en 2026 [déclaratif], rotation 13 %, 36 à 38 % d'abandon de la licence, moins de
  3 % de hausse de salaire par an [vérifié]. Les cabinets achètent pour protéger la marge.
- 74 à 75 % des cabinets ont moins de dix personnes et captent 7,4 % des honoraires : le marché en
  nombre et le marché en valeur ne sont pas le même marché.

### 2.7 La CA et la coordination migrent vers les plateformes de l'entrepreneur et du maître d'ouvrage

- Procore (1,32 Md$ de CA 2025, 4 167 avis G2), Autodesk Build, e-Builder, Kahua, Aconex ; l'architecte
  y est invité gratuitement et y perd la propriété de son dossier. C'est la tendance structurelle
  derrière P2 et P4, et la raison pour laquelle la CA est devenue « le » point d'entrée d'un outil
  pour architectes (Part3, Cogram, SubmittalLink, ArchiTrac maison).

## 3. Les cinq opportunités les plus prometteuses pour un nouvel entrant

Pour chacune : problème, cible, concurrents, pourquoi maintenant, risques, prix acceptable estimé
(déduit des prix que la cible paie déjà, étiqueté [estimé]).

### Opportunité 1. Le dossier de chantier de l'architecte, à prix fixe par cabinet

- **Problème** : P2 (17/20), P20, P12. Le cabinet suit RFIs, submittals, visites, punch lists et
  décisions dans l'outil de l'entrepreneur, puis dans Excel pour garder la trace ; les petits ne
  peuvent rien acheter ; les apps mobiles régressent.
- **Cible** : cabinets de 3 à 30 personnes, commercial léger, institutionnel et résidentiel haut de
  gamme, qui font 2 à 20 projets en chantier par an. Décideur : l'associé en charge de la CA.
- **Concurrents** : Part3 (150 à 200 $/utilisateur/mois ou dès 9 000 $/an, G2 4,9 sur 15 avis en
  partie sollicités, Capterra 4,1), Newforma Konekt (sur devis, « too big »), Cogram et SubmittalLink
  (IA, forfait, sans avis), ArchiSnapper (visites seulement, sur devis chez Deltek), Fieldwire (RFIs à
  89 $/utilisateur/mois), Bluebeam (tampon, pas de log), Excel.
- **Pourquoi maintenant** : les plateformes GC sont partout (« 75 % du temps ») et génèrent des flux
  (emails, PDF) qu'une IA peut classer ; AIA Trust signale une gravité des sinistres en hausse de 62 % ;
  Procore et ACC ont des API ; les cabinets expriment le besoin mot pour mot sur l'AIA Community Hub
  (mai 2025) ; Part3 a validé la demande sans couvrir le bas du marché.
- **Risques** : Procore ou Autodesk peuvent offrir un « espace architecte » ; Part3 peut baisser ses
  prix ; le petit cabinet n'a pas de budget CA (« exorbitant » pour 1 à 3 punch lists) ; la valeur
  dépend de l'ingestion d'emails (Outlook, Gmail) qui est un chantier technique et de sécurité.
- **Prix acceptable [estimé]** : 60 à 150 $ par mois par cabinet, utilisateurs illimités, soit sous
  le prix d'un siège Bluebeam Complete (440 $/an) par personne et dix fois moins que Part3 ; un palier
  « par projet » (30 à 50 $ par projet en chantier) pour les solos, sur le modèle RForm (39,95 $/mois
  par projet au Canada).

### Opportunité 2. Gestion de projet « phase et décisions » pour les cabinets de 5 à 50 personnes

- **Problème** : P5 (17/20), P14, P11, P15. Qui travaille sur quoi, ce qui a changé, ce qui a été
  décidé et sur quelle version ; charge planifiée dans Excel ; généralistes rejetés ; Monograph jugé
  insuffisant « in real life management of a project ».
- **Cible** : cabinets de 5 à 50 personnes, tous types de projets ; décideur : associé opérations ou
  directeur de projet ; utilisateurs : chefs de projet.
- **Concurrents** : Monograph (45 à 490 $/mois), BQE CORE, Deltek Ajera, CMap, Mosaic (sur devis) ;
  Asana, ClickUp, Monday, Notion, Smartsheet, Microsoft Planner ; Google Sheets ; outils maison codés
  avec une IA (cité deux fois dans le fil Archinect 2026).
- **Pourquoi maintenant** : le fil Archinect « is there a project management tool that actually works
  for architecture firms » (2026, 30 réponses) documente l'échec de toutes les options ; Deltek fait de
  la formation financière des chefs de projet son initiative numéro un ; l'IA rend possible l'extraction
  des décisions depuis emails et comptes rendus ; Harvest et Monograph montent leurs prix.
- **Risques** : Monograph a 29 M$ et la base installée ; « nanny software » : les cabinets refusent
  le contrôle ; la donnée n'est tenue que si la saisie est quasi nulle ; concurrence frontale avec le
  temps et la facturation (il faut s'intégrer à Monograph, BQE, QuickBooks plutôt que les remplacer).
- **Prix acceptable [estimé]** : 15 à 30 $ par utilisateur et par mois (entre Asana Advanced et
  Monograph par siège), ou 150 à 400 $ par mois par cabinet.

### Opportunité 3. Spécifications pour les petits cabinets et le résidentiel

- **Problème** : P7 (16/20). Specpoint concentre MasterSpec et les critiques ; les petits cabinets
  recyclent des Word de projets passés ; en résidentiel, 450 pages font fuir les entrepreneurs ;
  conflits plans/specs fréquents.
- **Cible** : cabinets de 1 à 20 personnes, résidentiel et petit commercial ; décideur : l'associé ou
  le chef de projet qui écrit lui-même les specs.
- **Concurrents** : Deltek Specpoint (sur devis, MasterSpec Small Project inclus), ARCAT SpecWizard
  (gratuit, fabricants), Conspectus, Word, spécifieurs indépendants, sheet specs ; aucune startup IA
  identifiée au 2026-11-07 (recherche non aboutie, voir 07).
- **Pourquoi maintenant** : Deltek a retiré SpecBuilder Cloud fin 2025 et imposé des migrations à
  prix multiplié (« 5x »), ce qui libère des clients mécontents ; l'IA sait rédiger et vérifier la
  cohérence plans/specs (avec faux positifs) ; les keynotes Revit et les schedules sont exportables.
- **Risques** : MasterSpec est sous licence exclusive Deltek, il faut un corpus propre ou des
  sections ouvertes (SpecsIntact, fabricants) ; responsabilité professionnelle sur le texte ; marché
  en nombre (petits) mais à faible budget ; les grands cabinets ont des spécifieurs attachés à Word.
- **Prix acceptable [estimé]** : 30 à 60 $ par mois par cabinet, ou 100 à 300 $ par projet ; référence :
  UpCodes 39 à 68 $/mois est accepté pour un outil de référence réglementaire.

### Opportunité 4. Le dépôt de permis et le suivi des cycles de commentaires

- **Problème** : P8 (16/20). Portails e-permis qui exigent une PDF par feuille nommée, cycles de
  12 à 16 semaines, règles qui changent, résubmissions à isoler, remarques à redistribuer aux
  consultants, expéditeurs payés.
- **Cible** : cabinets de 1 à 20 personnes à fort volume de permis (résidentiel, rénovation, retail),
  décideur : l'associé ; marchés denses : Californie, New York, Texas, Floride.
- **Concurrents** : Bluebeam (découpage PDF, 260 $/an minimum), UpCodes (recherche de code), PermitFlow
  (sur devis, « overkill » pour quelques permis par an), Pulley, Blitz, expéditeurs humains, Excel.
  Côté villes : Accela, Clariti, ePermitHub, Avolve, Archistar (non adressables par un entrant).
- **Pourquoi maintenant** : généralisation des portails e-permis (chaque ville la sienne) ;
  PermitFlow a prouvé le budget côté entrepreneurs (54 M$ levés) sans servir l'architecte ; les
  remarques des services sont des PDF structurés qu'une IA peut redistribuer et suivre.
- **Risques** : fragmentation extrême des juridictions (il faut partir d'une ou deux métropoles) ;
  PermitFlow peut descendre en gamme ; une partie de la douleur (délais des villes) ne se résout pas
  par logiciel ; responsabilité en cas d'erreur de dépôt.
- **Prix acceptable [estimé]** : 40 à 80 $ par mois par cabinet, ou 50 à 150 $ par dépôt (contre 500 à
  2 000 $ pour un expéditeur humain selon les offres consultées, chiffre non vérifié).

### Opportunité 5. Temps, facturation par phase et rentabilité pour les cabinets de 1 à 9 personnes

- **Problème** : P1 (19/20), P13, P17, P12. Le plus gros besoin du marché, servi par des suites
  faites pour les 20+ (BQE, Deltek) ou par des généralistes qui ignorent les phases et les forfaits
  (Harvest, Toggl, QuickBooks) ; apps mobiles à 1 étoile ; Harvest multiplie ses prix par sept.
- **Cible** : solos et cabinets de 2 à 9 personnes (75 % des cabinets, 14 895 structures) ; décideur :
  le propriétaire.
- **Concurrents** : Monograph (45 $/mois en entrée, le seul A&E accessible, mais avis sur la
  migration et les factures), BQE CORE (sur devis), Harvest (11 $/siège + usage), Toggl, Clockify,
  FreshBooks, QuickBooks Time, Bonsai, HoneyBook (résidentiel), Excel.
- **Pourquoi maintenant** : Harvest (racheté par Bending Spoons) a cassé son prix d'entrée en 2026
  (« de 99 $ à plus de 700 $/mois pour 10 personnes ») ; QuickBooks Online monte à 85 à 340 $/mois ;
  Monograph monte en gamme vers les 20 à 100 personnes ; l'IA sait remplir une feuille de temps depuis
  l'agenda, les fichiers Revit ouverts et les emails (Monograph le fait déjà, preuve de faisabilité).
- **Risques** : marché à très faible panier (le solo paie 12 $/mois à Harvest et s'indigne à 113 $) ;
  Monograph peut descendre en gamme ; le coût d'acquisition d'un marché de 15 000 petites structures
  est élevé ; l'intégration QuickBooks est obligatoire et fragile ; churn élevé en période de
  contraction.
- **Prix acceptable [estimé]** : 20 à 40 $ par mois pour un solo, 60 à 120 $ par mois pour 2 à 9
  personnes, utilisateurs illimités ; c'est le plafond que Monograph (45 $) et Harvest (avant 2026)
  ont fixé dans l'esprit des acheteurs.

### Opportunités écartées, et pourquoi

- Rendu temps réel ou rendu IA : marché saturé, gratuits de qualité, Chaos et Epic en embuscade.
- BIM cloud-native « Revit killer » : 100 M$+ déjà levés par Snaptrude, Motif, Arcol, Rayon sans
  adoption US démontrée ; les consultants restent sous Revit ; Autodesk contrôle le format.
- Faisabilité et test fits : dense, et les acheteurs sont des promoteurs.
- Suite tout-en-un pour les 50+ : cycles de vente longs, migrations de plusieurs mois, Deltek et
  Unanet verrouillent par le coût de sortie.
- Gestion de contenu Revit : Autodesk a rendu la brique gratuite (Content Catalog) en 2023.

## 4. Ce qui rend ce marché difficile (lecture honnête)

1. **Budgets minuscules et en contraction.** 75 % des cabinets captent 7,4 % des honoraires ; le
   budget IT médian est de 3,5 % du revenu net, les logiciels 36,7 % de ce budget ; 45 % des
   dirigeants attendent un revenu 2026 en baisse. Un solo s'indigne d'un passage de 12 à 113 $/mois.
2. **Dépendance à Revit et aux formats Autodesk.** Le standard de fait de la documentation et de la
   coordination ; tout outil « plugin Revit » dépend de l'API et de la roadmap d'Autodesk, qui a
   intégré Content Catalog gratuitement et annonce des agents Forma ; un outil « hors Revit » perd
   les consultants.
3. **L'architecte n'est pas toujours l'acheteur.** La CA se fait dans l'outil du GC ou du maître
   d'ouvrage ; les permis dans le portail de la ville ; les specs dans le format imposé par
   MasterSpec ; les faisabilités chez le promoteur.
4. **Conservatisme et méfiance.** « you don't need more nanny softwares » ; outils en « beta
   permanente » ; migrations traumatisantes (BQE, Monograph, Deltek) ; chaque rachat a dégradé les
   conditions ; les architectes achètent après avoir été trahis.
5. **Cycles de vente longs et décision diffuse au-dessus de 20 personnes** (direction, IT, BIM
   manager, comptabilité), rapides mais à panier nul en dessous.
6. **Responsabilité professionnelle.** Tout ce qui touche aux codes, aux specs et aux documents
   tamponnés engage la licence ; deux écarts suffisent à faire bannir un outil (UpCodes) ; l'IA
   « assistante » doit laisser l'humain signer.
7. **Fragmentation géographique** (codes, permis, portails par ville) et sectorielle (résidentiel
   contre institutionnel) : un produit « national » doit choisir une entrée.
8. **Saisonnalité et sensibilité au cycle immobilier** : l'ABI est sous 50 depuis fin 2022 ; les
   abonnements sont les premières dépenses coupées (« I can't afford the subscription right now »).
9. **Un marché de niche pour les investisseurs** : 20 000 cabinets, peu de « logos » prestigieux
   solvables ; Monograph a mis 29 M$ pour 2 000 cabinets déclarés ; Part3 vise 100+ cabinets après
   cinq ans.
