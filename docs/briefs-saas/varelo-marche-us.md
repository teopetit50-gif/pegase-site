# Varelo face au marché américain — ce que les SaaS US vendent aux groupes, et ce que vaut notre produit

Recherche du 11/11/2026, demandée par Teo : « fais la même chose que pour les avocats et les
architectes, mais pour notre SaaS groupe ; dis-nous si ce qu'on propose est complètement
obsolète comparé à ce qu'eux proposent ». Elle complète `varelo-v2.md` (brief produit du même
jour), qui nommait Glean, Palantir et OneStream / Workiva sans les avoir regardés de près.

Méthode : recherche web du 11/11/2026, une trentaine de requêtes, en privilégiant les pages des
éditeurs (docs, notes de version, communiqués, dépôts SEC) et en marquant comme telles les
estimations de tiers (sites de comparaison, places de marché d'achat). Aucun chiffre ci-dessous
n'est repris sans sa source ; les prix non publiés par l'éditeur sont donnés comme des
fourchettes rapportées, jamais comme des faits. Les sources sont en section 9.

## 0. Le verdict, en dix lignes

1. **Il n'existe pas, aux États-Unis, de « SaaS de groupe » au sens de Varelo.** Le marché est
   découpé en six familles (assistant d'entreprise, plateforme d'agents et de contexte,
   consolidation et clôture, FP&A, suivi de portefeuille, référentiel maître) qui vendent
   chacune une étape du fil « source → référentiel → règle → décision → page présidence ».
   Personne ne vend le fil entier, et personne ne le vend à un groupe de 3 à 30 sociétés.
2. **Le concept de Varelo n'est pas obsolète.** Il est même dans le sens du marché : en 2026,
   tous les grands acteurs ont bâti la même chose que notre « référentiel » sous un autre nom
   (ontologie chez Palantir et Microsoft Fabric IQ, « couche sémantique » chez OpenAI Frontier,
   vues sémantiques chez Snowflake, Business Semantics chez Databricks), et tous mettent en
   avant la preuve (retour à la cellule source, journal des actions, lignage).
3. **Ce qui est obsolète, c'est la façon dont Varelo se présente et trois choix du brief.**
   « Une seule IA pour tout le groupe » est devenu en 2026 la promesse standard de Glean, de
   Microsoft 365 Copilot, de ChatGPT Enterprise, de Gemini Enterprise et de Mistral, à 20 à
   75 $ par siège et par mois : Varelo ne gagnera pas sur ce titre. Le branchement « par export
   selon l'éditeur » est en retard d'une génération (connecteurs par centaines, MCP partout). Et
   « jamais d'action » est dépassé : les US vendent désormais, outil par outil, le réglage
   « lecture seule / sans approbation / avec approbation ».
4. **Ce que Varelo a et qu'aucun acteur US ne vend** : la décision du matin avec sa règle, son
   calcul et sa pièce ; le catalogue des règles avec auteur et périmètre ; la lecture seule
   comme garantie contractuelle ; la page présidence rapprochée des comptes de chaque société ;
   le remboursement si le point n'est pas valide ; l'hébergement en Europe sans entraînement.
5. **Recommandation** : garder le produit, changer le titre, ajouter les connecteurs et le
   réglage d'autonomie par action, ajouter l'« enquête » sur un écart (le pourquoi), et ne pas
   se mesurer à Palantir ni à Glean, qui ne descendent pas à notre cible. Détail en section 7.

## 1. La carte du marché US : six familles, pas un produit

| Famille | Acteurs regardés | Ce qu'ils vendent | Prix constatés | Cible réelle |
|---|---|---|---|---|
| **A. Assistant d'entreprise à droits hérités** | Glean, Microsoft 365 Copilot + Work IQ, ChatGPT Enterprise (« company knowledge »), Gemini Enterprise, Claude Enterprise, Mistral Vibe (ex-Le Chat) | Un assistant branché sur toutes les applications, qui respecte les droits de chacun à la lecture, et des agents | Glean : non publié, 45 à 75 $/utilisateur/mois rapportés, minimum 50 à 60 k$/an rapporté ; ChatGPT Enterprise : non publié, ~60 $/siège rapporté, 150 sièges minimum rapportés ; Gemini Enterprise : 21 $ (Business), 30 $ (Standard), 50 $ (Plus) par siège/mois en annuel ; Copilot ~30 $ ; Mistral Enterprise : sur devis | Entreprises de plusieurs centaines de postes, une seule entité juridique ou un annuaire unique |
| **B. Plateforme d'agents et couche de contexte** | OpenAI Frontier, Palantir Foundry / AIP, Microsoft Fabric IQ, Snowflake (vues sémantiques, CoWork), Databricks (Unity Catalog Business Semantics, Agent Bricks), Domo | Une représentation de l'entreprise (ontologie, couche sémantique) sur laquelle des agents lisent, proposent et agissent, avec droits et journal | Palantir : non publié, déploiements commerciaux « de l'ordre de la centaine de milliers de dollars par an » rapportés ; Frontier : accès limité, pas de grille ; Domo : crédits à la consommation, contrats médians ~50 k$/an rapportés | Grands comptes ; Palantir compte 686 clients commerciaux US au T3 2026 (10-Q), ce n'est pas un marché de PME |
| **C. Consolidation et clôture** | OneStream (SensibleAI Agents, GA 19/05/2026), Workiva (agents et « Workiva Knowledge », 2026), Sage Intacct (agent Close, R1 2026), NetSuite OneWorld, Campfire et Rillet (ERP natifs IA), FloQast, BlackLine, Numeric ; pour les petits groupes : Fathom, Syft | Les comptes consolidés, les éliminations intra-groupe, le rapprochement et la clôture ; chez Workiva, le rapport au conseil relié à la donnée avec lignage | Fathom : 450 $/mois pour 25 sociétés puis 17 $/société (page tarifs de l'éditeur) ; FloQast : 30 à 80 k$/an rapportés ; OneStream, Workiva, BlackLine : sur devis, grands comptes | De la PME sur QuickBooks / Xero (Fathom, Syft) au groupe coté (OneStream, Workiva, BlackLine) |
| **D. FP&A** | Datarails, Vena, Cube, Planful, Anaplan, Pigment (français) | Budget, prévision, analyse d'écarts, agents « analyste », « consolidation » | Médianes Vendr rapportées : Datarails ~33 k$/an, Vena ~34 k$, Cube ~22 k$, Pigment ~74 k$ | Directions financières de 50 à 5 000 salariés |
| **E. Suivi de portefeuille (holdings, fonds)** | Chronograph, Allvue, Cobalt (FactSet), iLEVEL (S&P), Standard Metrics | La collecte des chiffres de chaque société du portefeuille (relances automatiques, pas de modèle rigide), leur normalisation, le reporting aux investisseurs, un assistant sur les documents | Chronograph : 50 à 150 k$/an rapportés | Fonds de private equity et holdings financières, pas l'opérationnel d'un groupe |
| **F. Référentiel maître (MDM) et contrats (CLM)** | Informatica, Reltio, Tamr ; Ironclad, Evisort, LinkSquares, ContractSafe | Le rapprochement des clients / fournisseurs / articles entre systèmes, avec revue humaine des doublons ; l'extraction des dates de renouvellement et les alertes de préavis | Reltio ~15,6 k$/mois (place de marché AWS, rapporté) ; Informatica 65 à 70 k£/unité/an (G-Cloud, rapporté) ; ContractSafe à partir de 450 $/mois (publié) ; LinkSquares médiane ~31 k$/an rapportée | Grands comptes pour le MDM ; toutes tailles pour le CLM |

Deux conclusions de la carte :

- **Le groupe de 3 à 30 PME n'est le cœur de cible de personne.** Les familles A et B sont
  taillées pour une entreprise à annuaire unique et des centaines de postes ; la famille E
  regarde ses sociétés comme des lignes d'un portefeuille financier ; seules Fathom et Syft
  (famille C, bas de gamme) visent les petits groupes, et uniquement pour les comptes. Un
  guide de 2026 sur les holdings de franchises conseille d'ailleurs d'assembler soi-même
  Sage Intacct, Metabase et des intégrations maison sous 50 k$/an ; une analyse de marché
  décrit un trou « own multiple, operate none » sans outil dédié.
- **Le fil complet n'est vendu par personne.** OneStream vend la consolidation mais pas la
  décision du matin ; Glean vend l'assistant mais pas le référentiel ni les règles ; Palantir
  vend l'ontologie et les actions mais au prix et au délai d'un grand compte ; Chronograph
  collecte mais ne lit pas les logiciels des filiales.

## 2. Famille A — l'assistant « une seule IA pour tout le groupe » est devenu une commodité

C'est le point qui touche directement le titre actuel de `/secteurs/groupes`.

- **Glean** annonce 275 connecteurs, des droits vérifiés à chaque requête dans le système
  source, et depuis 2026 des « independent agents » dotés de leur propre identité (bêta
  publique en juillet, **disponibilité générale le 01/10/2026** d'après les notes de version).
  Le 13/08/2026, Glean a ajouté un écran de permissions qui dit, outil par outil, si l'agent
  est **en lecture seule, agit sans approbation, ou agit avec approbation**. Le prix n'est pas
  publié ; les tiers rapportent 45 à 75 $ par utilisateur et par mois et un minimum annuel de
  50 à 60 k$.
- **Microsoft** a sorti Work IQ en disponibilité générale le 16/06/2026 (API REST, A2A, MCP),
  comme couche de contexte Microsoft 365 à droits hérités, facturée à la consommation
  indépendamment de la licence Copilot.
- **ChatGPT Enterprise** (« company knowledge ») ne montre à chacun que ce qu'il peut déjà voir
  dans l'application source, connecteur par connecteur ; prix non publié, ~60 $ par siège
  rapportés, 150 sièges minimum rapportés.
- **Gemini Enterprise** publie ses prix : 21 $ (Business, connecteurs limités), 30 $ (Standard),
  50 $ (Plus) par utilisateur et par mois en annuel, plus un paiement à l'usage depuis le
  01/08/2026.
- **Claude Enterprise** : droits hérités de l'utilisateur, approbation par outil pour les
  actions d'écriture ; **pas de résidence des données en Union européenne** en 2026 selon
  plusieurs sources (le seul chemin UE passe par Bedrock ou Vertex).
- **Mistral** (français) a renommé Le Chat en Vibe le 28/05/2026 ; l'offre Enterprise se
  déploie sur site, en cloud privé ou sur Mistral Cloud avec résidence des données, avec
  recherche d'entreprise, connecteurs, constructeur d'agents sans code, SSO et journaux ;
  prix sur devis.

**Ce que ça veut dire pour Varelo.** Dire « une seule IA pour tout le groupe » en 2026, c'est
dire la même chose que six éditeurs qui ont des centaines de connecteurs et vendent au siège.
Sur ce terrain, Varelo est en retard et le restera. Mais aucun de ces six ne construit le
référentiel du groupe (le même client sous trois codes), aucun n'a de catalogue de règles, et
aucun ne rapproche une page présidence des comptes des sociétés. Leur modèle suppose un
annuaire unique et des droits déjà posés dans les sources ; le groupe de PME français, avec ses
logiciels achetés hors DSI et ses tableurs, n'a ni l'un ni l'autre. C'est exactement l'argument
du brief (Module 1 : « la DSI pose les droits dans Varelo quand la source n'en a pas »), et il
tient.

## 3. Famille B — l'ontologie est devenue le standard, et Varelo en a une sans le dire

- **Palantir Foundry** : l'ontologie modélise objets, propriétés, liens et **actions** ; les
  agents créent des **propositions** qu'un opérateur accepte ou refuse ; chaque action crée un
  objet de journal lié aux objets modifiés ; les droits sont posés au niveau de l'ontologie.
  Pas de prix publié ; les tiers parlent d'un déploiement commercial « de l'ordre de la
  centaine de milliers de dollars par an » et de pilotes AIP à 200 à 500 k$. Le programme
  « Foundry for Builders » (2021) vise les start-up liées à des anciens de Palantir, pas les
  ETI. Au T3 2026, Palantir compte 686 clients commerciaux US et son revenu commercial US a
  dépassé le gouvernement (8-K du T3 2026) : c'est une machine à grands comptes.
- **OpenAI Frontier** (annoncé le 05/02/2026) se décrit comme « une couche sémantique de
  l'entreprise à laquelle tous les AI coworkers se réfèrent », avec des permissions explicites
  par agent, des connecteurs vers entrepôts, CRM, ticketing, et des ingénieurs déployés chez le
  client (alliances avec BCG, McKinsey, Accenture, Capgemini). Fin 2026, l'accès reste limité
  et aucun prix n'est publié.
- **Microsoft Fabric IQ** : ontologie « entités, relations, règles et objectifs » ; Fabric IQ
  en disponibilité générale à Build 2026, l'Ontology encore en préversion ; en septembre 2026,
  serveur MCP en disponibilité générale, ontologie comme source de contexte des agents, et
  **règles métier en langage naturel** ; « Investigate » (préversion) enquête automatiquement
  quand l'agent d'opérations détecte une anomalie.
- **Snowflake** : vues sémantiques (objet de métriques gouverné), requêtes SQL standard dessus
  en disponibilité générale le 02/03/2026, exposition par MCP ; **Databricks** : Business
  Semantics dans Unity Catalog en disponibilité générale en avril 2026, les métriques devenant
  des objets de catalogue utilisés par les agents.
- **Domo** : 1 000+ connecteurs, Agent Catalyst (mars 2026) avec approbations et files de
  tâches ; facturation aux crédits ; vendu en septembre 2026 à Progress Software d'après une
  source unique.

**Ce que ça veut dire pour Varelo.** Notre « référentiel » (objets du groupe et leurs codes dans
chaque système, rapprochements validés par une personne) et notre « catalogue des règles »
(auteur, périmètre, calcul, journal) sont une ontologie et une couche de règles. C'est ce que le
marché a adopté en 2026 ; le concept n'est pas obsolète, il est devenu la norme. Deux écarts :
(a) les US laissent l'IA **proposer l'ontologie** (Fabric IQ génère l'ontologie depuis les
modèles et documents ; Snowflake propose les métriques à partir des journaux de requêtes) et
les règles s'écrivent en langage naturel : Varelo doit proposer les rapprochements et les règles,
pas seulement les enregistrer ; (b) les US ont tous un **mode « enquête »** (Fabric IQ
Investigate, ThoughtSpot Spotter qui décompose les causes d'un écart) : Varelo donne le calcul
et la pièce, pas le pourquoi.

## 4. Famille C — la consolidation : la preuve par point est au niveau, le rapprochement est à faire

- **OneStream** (Splash 2026, 19/05/2026) : quatre agents SensibleAI en disponibilité générale
  et une « Finance Agentic Layer » qui laisse Copilot, ChatGPT, Claude et Gemini lire OneStream
  en respectant les droits et l'audit ; l'agent « Finance Analyst » produit des rapports
  narratifs **avec retour à la cellule source** (drillback).
- **Workiva** (juillet et septembre 2026) : agents de roll-forward, de rédaction, de tie-out
  (signale les écarts et explique chaque variance), tagging XBRL, et « financial statement
  orchestration » avec **piste d'audit et lignage de compte** de la balance aux états ;
  Agent Studio sans code avec règles de revue humaine et journal des actions. Workiva n'est pas
  un moteur de consolidation : il se branche sur un CPM ou un ERP amont.
- **Sage Intacct** : agent Close (R1 2026) qui coordonne la clôture entre entités et génère les
  écritures d'élimination dans des tolérances configurées, plusieurs fonctions encore en
  programme « early adopter ». **NetSuite** : consolidation OneWorld, assistant Ask Oracle,
  suivi de clôture IA ; agents encore en feuille de route.
- **Campfire** (Series B de 65 M$ en octobre 2025, Accel et Ribbit) et **Rillet** : ERP natifs
  IA avec consolidation multi-entités, visant les start-up et les éditeurs, pas les groupes
  physiques.
- **FloQast / BlackLine / Numeric** : rapprochement intra-groupe automatique, de la PME
  (Numeric, NetSuite) au groupe coté (BlackLine).
- **Fathom** : consolidation jusqu'à 300 sociétés en monodevise et 50 en multidevise sur
  QuickBooks, Xero, MYOB ; **450 $/mois pour 25 sociétés puis 17 $ par société** ; c'est le seul
  acteur qui facture « par société du groupe » comme le prévoit notre modèle économique.

**Ce que ça veut dire pour Varelo.** La « preuve par point » (chaque chiffre de la page présidence
rapproché d'un chiffre de société, chaque décision avec sa pièce) est exactement ce que
OneStream et Workiva mettent en avant ; Varelo est au niveau, et la règle de remboursement n'a
pas d'équivalent. En revanche le brief dit que Varelo « ne produit pas les comptes consolidés ;
il les rapproche » : c'est le bon choix, à condition de lire Sage, Cegid, EBP, Pennylane et les
autres ERP de PME françaises par connecteur, et de signaler les intra-groupe comme le fait
l'agent Close de Sage. La décision 11 de `LA-SUITE.md` (rapprocher la page présidence dès le
MVP) se tranche par oui : c'est la seule chose qui distingue la page présidence d'un tableau de
bord Fathom.

## 5. Familles D, E, F — le point du matin, la holding et le référentiel

- **Le point du matin existe aux US sous trois formes** : le « digest » de métriques (Tableau
  Pulse envoie chaque jour, chaque semaine ou chaque mois, par Slack et par courriel, les
  métriques suivies avec un résumé généré ; ThoughtSpot Spotter pousse les changements et
  **explique le pourquoi** avec attribution chiffrée) ; les agents d'opérations qui enquêtent
  (Fabric IQ) ; et une vague d'« AI chief of staff » à 30 à 50 $/mois qui résument boîte mail,
  agenda et Slack pour un dirigeant. Aucun des trois ne remet **une décision à prendre, avec la
  règle qui l'a déclenchée et la pièce**. Le point du matin de Varelo est en avance sur le fond
  (il dit quoi décider), en retard sur la forme (pas de « pourquoi », pas de livraison dans
  Teams / Slack / courriel documentée).
- **La holding** : Chronograph collecte les chiffres des sociétés du portefeuille « sans
  installation locale ni modèle rigide », relance automatiquement avant l'échéance, et son
  assistant ChronoAI répond sur les documents (rapports trimestriels, LPA). Allvue ajoute
  l'extraction de documents (Document IQ, janvier 2026) ; Cobalt a l'ingestion de documents
  FactSet (février 2026). Ces outils regardent la société comme une ligne financière : pas de
  référentiel opérationnel, pas de règle métier, pas de lecture des logiciels de la filiale.
  **La « page présidence » de Varelo a ici son vrai cousin américain**, et le modèle de
  collecte par relance automatique est à reprendre pour les sociétés qu'on ne peut pas
  brancher.
- **Le référentiel** : Reltio laisse inspecter chaque rapprochement, fusionner, défusionner,
  marquer « ne correspond pas » ; Tamr fait du matching par apprentissage avec revue humaine,
  reproché d'être opaque pour les stewards. Ce sont des outils à 15 k$/mois (Reltio, rapporté)
  ou 65 k£/an (Informatica, rapporté) : hors de portée de notre cible. Le Module 2 de Varelo
  (rapprochement proposé, validé ou refusé par une personne, daté, réversible) est le même
  principe à l'échelle d'un groupe de PME, et l'explicabilité qu'on reproche à Tamr est
  justement ce que Varelo promet.
- **Les contrats à dénoncer** : c'est une fonction de base de tout CLM américain (alertes de
  préavis et de renouvellement sur le socle de ContractSafe à 450 $/mois). Varelo ne doit pas
  la vendre comme une nouveauté, mais comme une règle du catalogue appliquée à toutes les
  sociétés.

## 6. Varelo module par module face au marché US

| Module Varelo (brief v2) | Ce que font les US en 2026 | Verdict |
|---|---|---|
| **1. Sources et droits** (lecture seule, droits hérités ou posés par la DSI) | Droits hérités à chaque requête (Glean, ChatGPT Enterprise, Claude), 275 à 1 000+ connecteurs, MCP comme standard d'accès (Microsoft, Snowflake, Databricks, Domo, Glean) | **En retard sur les connecteurs**, à niveau sur les droits. « Export ou connecteur selon l'éditeur » ne se vend plus. Le fossé local (ERP de PME françaises, tableurs, dossiers sans annuaire) reste le nôtre. |
| **2. Référentiel et son travail** (objets, codes par système, rapprochements validés) | Ontologie (Palantir, Fabric IQ), couche sémantique (Frontier), MDM avec revue humaine (Reltio, Tamr) ; l'IA propose l'ontologie et les métriques | **Au niveau conceptuel.** À ajouter : la proposition automatique des rapprochements et des objets, et le mot « ontologie » dans l'argumentaire DSI. |
| **3. Catalogue des règles** (auteur, périmètre, calcul, journal) | Règles métier en langage naturel (Fabric IQ, 09/2026), métriques gouvernées en catalogue (Snowflake, Databricks), action types avec validation de rôle (Palantir) | **Pas d'équivalent exact** avec auteur et périmètre par société. Avance. À ajouter : écriture de la règle en langage courant, traduite et affichée en calcul. |
| **4. Assistant et agents bornés** (répond avec la pièce, prépare, n'agit qu'après validation) | Agents à identité propre (Glean, GA 01/10/2026), réglage par outil lecture seule / sans approbation / avec approbation (Glean 13/08/2026, Claude), propositions d'agent (Palantir), AI coworkers (Frontier) | **Le principe est à niveau, le réglage est à faire.** Les US ne vendent plus « jamais d'action » : ils vendent un curseur par action. Varelo doit garder la lecture seule sur les systèmes sources et offrir des actions hors systèmes (lettre de dénonciation, réserve au transporteur, relance) avec approbation. |
| **5. Point du matin et page présidence** (décisions avec calcul et pièce ; groupe sur une page rapproché des comptes, intra-groupe signalés) | Digests (Tableau Pulse), enquête sur un écart (Spotter, Fabric IQ Investigate), drillback (OneStream), lignage (Workiva), éliminations automatiques (Sage), collecte par relance (Chronograph) | **En avance sur la décision**, personne ne remet « quoi décider » avec la règle et la pièce. **En retard sur le pourquoi** (aucune enquête) et sur la livraison (Teams, Slack, courriel). Rapprochement avec les comptes : à faire dès le MVP. |
| **Transversal** : preuve par point et remboursement, hébergement UE, aucun entraînement | Audit trail partout, mais aucun remboursement ; résidence UE absente chez Claude Enterprise, limitée chez OpenAI, présente chez Mistral | **Avance.** C'est ce qui ne se copie pas en un trimestre. |

## 7. Ce qu'il faut changer, et ce qu'il ne faut pas toucher

**À ne pas toucher** : le fil en cinq étapes, la lecture seule sur les systèmes sources, le
référentiel validé par une personne, le catalogue des règles, la décision avec la pièce, la page
présidence rapprochée des comptes, le remboursement, l'hébergement en Europe, le prix par groupe
selon le nombre de sociétés (c'est le modèle Fathom, le seul qui colle à la cible).

**À changer, par ordre d'importance** :

1. **Le titre.** « Une seule IA pour tout le groupe » est la promesse de Glean, Copilot, ChatGPT
   Enterprise, Gemini Enterprise et Mistral à 20 à 75 $ le siège. Le titre doit porter ce que
   personne ne vend : le groupe lu sous un seul référentiel, des règles écrites une fois, et
   chaque matin quoi décider, avec la preuve. La meta-description du 11/11 le dit déjà ; le
   héros de la page ne le dit pas encore.
2. **Les connecteurs.** Remplacer « export ou connecteur selon l'éditeur » par une liste de
   connecteurs nommés vers les ERP et logiciels de gestion des PME françaises, les tableurs
   partagés et les dossiers, plus un serveur MCP en lecture seule pour que l'assistant du groupe
   (Copilot, ChatGPT, Mistral, peu importe) lise Varelo sans le remplacer. C'est ce que OneStream
   a fait avec sa « Finance Agentic Layer » : on ne se bat pas contre l'assistant que le groupe a
   déjà, on devient sa source.
3. **Le curseur d'autonomie.** Un écran, par règle et par action, qui dit « lecture seule /
   propose / agit avec approbation / agit seul », comme Glean le 13/08/2026. Lecture seule reste
   obligatoire sur les systèmes sources ; les actions hors systèmes (courrier, relance, réserve)
   deviennent possibles avec approbation. Sans cela, le point du matin reste une liste de tâches
   et les US ont déjà la liste de tâches qui s'exécute.
4. **Le pourquoi.** Ajouter au Module 5 une « enquête » sur un écart : quand un chiffre de la
   page présidence sort d'une règle, Varelo décompose l'écart par société, par client, par
   période, avec les pièces. C'est Spotter et Fabric IQ Investigate ; c'est la partie de leur
   offre que la présidence remarque d'abord.
5. **La proposition par l'IA.** Le référentiel et les règles ne doivent pas être saisis à la
   main : Varelo propose les rapprochements (déjà prévu), mais aussi les objets manquants, les
   doublons, et traduit une règle écrite en français courant en calcul affiché. C'est ce que
   Fabric IQ et Snowflake ont livré en 2026.
6. **La livraison.** Le point du matin doit arriver là où la direction lit : courriel, Teams,
   et l'espace Varelo. Tableau Pulse en fait un réglage par utilisateur (canal, fréquence,
   métriques suivies).
7. **La collecte par relance.** Pour une société qu'on ne peut pas brancher (pas d'export, pas
   de droits), reprendre le modèle Chronograph : un formulaire de collecte, une échéance, une
   relance automatique, et la pièce jointe. Ça règle le risque n° 1 de la section 14 du brief.
8. **Le vocabulaire DSI.** Dire « ontologie du groupe » et « couche sémantique » dans
   l'argumentaire technique, parce que c'est ce que la DSI lit chez Microsoft, Palantir et
   OpenAI ; garder « référentiel » et « règles » sur la page, pour les directions.

**Ce qu'il ne faut pas faire** : se comparer à Palantir ou à Glean sur la page (ils ne vendent
pas à notre cible, et le brief a raison de le dire en section 14) ; promettre des agents
autonomes ; afficher un chiffre de gain repris d'un éditeur US (OneStream « 86 % de réduction du
cycle », ChatFin « 60 à 80 % », Databricks « 70 % de précision en plus » sont des chiffres
d'éditeurs sans vérification indépendante).

## 8. Les concurrents français qui copient déjà les US

Teo veut « reproduire en France » : trois acteurs français le font déjà, chacun sur une famille.
**Mistral** (famille A : Vibe Enterprise, sur site ou cloud privé, connecteurs, agents, résidence
des données). **Pigment** (famille D : agents Analyst, Modeler, Consolidation, Custom ; médiane
rapportée 74 k$/an, donc grands comptes). **Dust** (famille A/B : agents sur les outils de
l'entreprise ; peu de matière publique trouvée sur son offre groupe). Aucun des trois ne fait le
référentiel de groupe, le catalogue des règles ni la décision du matin ; aucun ne vise le groupe
de 3 à 30 PME. Le créneau de Varelo est libre en France comme aux US, et le danger immédiat
n'est pas Palantir, c'est qu'un groupe se contente de Mistral ou de Copilot plus Fathom.

## 9. Décisions à trancher

| # | Décision | Recommandation |
|---|---|---|
| 12 | Changer le titre du héros de `/secteurs/groupes` (« Une seule IA pour tout le groupe ») | Oui, dès que le PRD du MVP est figé, avec la recette aux cinq largeurs ; proposer trois titres avant |
| 13 | Ajouter un serveur MCP en lecture seule pour les assistants déjà en place dans le groupe | Oui, dans l'architecture du MVP (section 15.2 du brief) |
| 14 | Autoriser des actions hors systèmes sources avec approbation (courrier, relance, réserve) | Oui, après le premier pôle pilote, avec le curseur par règle |
| 15 | Ajouter l'enquête sur un écart au Module 5 | Oui, dans la v2 du brief ; hors MVP |
| 16 | Collecte par formulaire et relance pour les sociétés non branchables | Oui, dans le MVP : c'est la parade au risque n° 1 |
| 11 (rappel) | Rapprocher la page présidence des comptes dès le MVP | Oui, confirmé : sans ça, Fathom fait la même page à 450 $/mois |

## 10. Sources (consultées le 11/11/2026)

Famille A
- Glean, « Introducing independent agents » : https://www.glean.com/blog/introducing-independent-agents
- Glean, « Agent Identity » : https://www.glean.com/blog/introducing-agent-identity
- Glean, notes de version du 13/08/2026 (écran de permissions) : https://docs.glean.com/release-notes/releases/2026-08-13-august-release
- Glean, notes de version du 01/10/2026 (Agent Identity GA) : https://docs.glean.com/release-notes/releases/2026-10-01-october-release
- Prix Glean rapportés (tiers) : https://workativ.com/ai-agent/blog/glean-pricing ; https://fritz.ai/glean-review/
- Microsoft, « Announcing the new Work IQ APIs » (02/06/2026) : https://www.microsoft.com/en-us/microsoft-365/blog/2026/06/02/announcing-the-new-work-iq-apis/
- ChatGPT Enterprise, prix rapportés (tiers) : https://www.qanswer.ai/blog/chatgpt-enterprise-pricing ; company knowledge : https://www.usecarly.com/blog/chatgpt-company-knowledge/
- Gemini Enterprise, prix (tiers, relevés août à octobre 2026) : https://cobry.ai/articles/gemini-enterprise-pricing ; https://josegalan.dev/en/news/gemini-enterprise
- Claude Enterprise, connecteurs et résidence (tiers) : https://composio.dev/content/claude-enterprise-security ; https://sonomos.ai/blog/claude-eu-data-residency-2026/
- Mistral Vibe Enterprise (tiers) : https://colombani.ai/en/blog/mistral-for-business/ ; https://www.teamazing.com/blog/mistral-le-chat-enterprise-review/

Famille B
- OpenAI, « Introducing OpenAI Frontier » : https://openai.com/index/introducing-openai-frontier/ ; page produit : https://openai.com/business/frontier/
- Frontier, disponibilité et prix (tiers) : https://www.eesel.ai/blog/openai-frontier-pricing
- Palantir, docs Ontology : https://www.palantir.com/docs/foundry/ontology/overview ; action types : https://www.palantir.com/docs/foundry/action-types/overview ; action log : https://www.palantir.com/docs/foundry/action-types/action-log
- Palantir, 8-K T3 2026 : https://www.sec.gov/Archives/edgar/data/0001321655/000132165526000045/a2026q3ex991pressrelease.htm
- Palantir, « Foundry for Builders » (2021) : https://www.palantir.com/newsroom/press-releases/palantir-introduces-foundry-for-builders/
- Palantir, prix rapportés (tiers, consultants) : https://www.bdemerson.com/article/palantir-cost ; https://omidsaffari.com/blog/palantir-ai-review
- Microsoft Fabric IQ : https://blog.fabric.microsoft.com/en-us/blog/introducing-fabric-iq-the-semantic-foundation-for-enterprise-ai ; résumé septembre 2026 : https://community.fabric.microsoft.com/blog/fbc_fabricupdatesblogs/fabric-september-2026-feature-summary/5325825 ; Build 2026 : https://azure.microsoft.com/en-us/blog/microsoft-build-2026-building-agentic-apps-with-microsoft-fabric-and-microsoft-databases/
- Snowflake et Databricks, couches sémantiques (tiers) : https://upsolve.ai/blog/snowflake-semantic-layer ; https://atlan.com/know/best-semantic-layer-tools/ ; https://siliconangle.com/2026/06/07/snowflake-databricks-model-makers-battle-agentic-client-ai-back-end/
- Domo, Agent Catalyst et prix (tiers) : https://www.domo.com/learn/article/ai-agent-platforms ; https://casrai.org/guides/domo-pricing

Famille C
- OneStream, Splash 2026 : https://www.onestream.com/blog/what-we-announced-at-splash-2026-a-new-foundation-for-finance/ ; SensibleAI Agents : https://www.onestream.com/resources/sensible-ai-agents-overview/ ; Nucleus Research : https://nucleusresearch.com/research/single/highlights-from-onestream-splash-2026/
- Workiva, Amplify 2026 : https://www.workiva.com/blog/agents-oversight-and-governance-whats-new-financial-reporting-amplify-2026 ; lancement des agents (juillet 2026) : https://itbrief.asia/story/workiva-launches-ai-agents-for-reporting-compliance
- Sage Intacct, page produit : https://www.sage.com/en-us/sage-business-cloud/intacct/ ; agents R1 2026 (tiers) : https://chatfin.ai/blog/sage-finance-automation-ai-smart-close-management-reconciliation-platform-2026-ai/
- Campfire, levée (tiers) : https://accountio.co.uk/startups/campfire-sparks-funding-surge-in-ai-accounting-sector/ ; comparatif ERP natifs IA : https://www.erpresearch.com/en-us/ai-native-erp
- FloQast, BlackLine, Numeric (tiers) : https://chatfin.ai/blog/blackline-vs-floqast-vs-alternatives-finance-reconciliation-software-comparison-2026/ ; https://www.numeric.io/blog/blackline-reconciliation
- Fathom, tarifs (éditeur) : https://www.fathomhq.com/pricing ; consolidations : https://www.fathomhq.com/consolidations/ ; limites : https://support.fathomhq.com/en/articles/2322359-create-a-multi-currency-consolidation
- Syft (tiers) : https://www.g2.com/compare/fathom-vs-syft-analytics-syft

Famille D
- FP&A, agents et médianes Vendr (tiers) : https://www.fpastack.com/best-ai-fpa-software/ ; https://www.getaleph.com/answers/top-fpa-software-2026 ; Pigment : https://www.pigment.com/blog/best-fpa-software

Famille E
- Chronograph, portefeuille GP : https://www.chronograph.pe/general-partners/ ; ChronoAI : https://www.chronograph.pe/chronograph-launches-ai-capabilities-for-private-equity-investors/
- Comparatifs PE (tiers) : https://fundcount.com/top-7-private-equity-portfolio-monitoring-software/ ; https://www.lumonic.com/for-ai/best-private-equity-portfolio-monitoring-software-2026
- Holdings de franchises (tiers) : https://fddiq.com/learn/franchise-holdco-playbook/holdco-tech-stack-shared-services ; trou de marché « own multiple, operate none » : https://ideasberg.com/ideas/holdco-portfolio-management-saas-3-k_vf

Famille F
- MDM (tiers) : https://www.cluedin.com/resources/articles/best-mdm-platforms-entity-resolution ; https://www.energent.ai/use-cases/en/compare/ai-driven-master-data
- CLM (tiers, dont concurrents) : https://www.contractsafe.com/blog/ai-clm-buyers-guide ; https://www.mindsprint.com/resources/blogs/ai-contract-management-software

Point du matin
- Tableau Pulse, digests (éditeur) : https://help.tableau.com/current/online/en-us/pulse_intro.htm ; https://www.tableau.com/2024-1-features
- ThoughtSpot Spotter et BI agentique (tiers) : https://www.knowi.com/blog/best-agentic-bi-tools/ ; https://querio.ai/articles/natural-language-query-business-intelligence-thoughtspot-vs-power-bi-vs-tableau-2026
- « AI chief of staff » (tiers) : https://readywhen.ai/blog/best-ai-chief-of-staff-tools-2026 ; https://get-alfred.ai/blog/best-ai-chief-of-staff-tools

Contexte
- Gartner, prévision d'abandon de 40 % des projets d'agents d'ici fin 2027 (relayé) : https://www.forbes.com/sites/robertszczerba/2026/07/07/why-40-of-agentic-ai-projects-may-be-canceled-by-2027/
