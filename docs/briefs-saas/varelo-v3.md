# Varelo v3 — le plan du groupe et ses agents

Brief produit, version 3 du 11/11/2026. Il remplace `varelo-v2.md`. Teo (11/11) : « je ne veux
pas que tu te bases sur ce qu'on propose ; dis-moi ce qu'eux font aux US et qu'on reproduise la
même chose ; explique-le plus facilement ». La recherche de marché est dans
`varelo-marche-us.md` ; ce brief en tire une seule conclusion et la rend concrète.

## 1. L'idée en une phrase

On reproduit en France, pour les groupes de 100 à 2 000 salariés, ce que Palantir vend aux
grandes entreprises américaines : **un plan complet du groupe, alimenté par les logiciels déjà en
place, sur lequel des agents proposent des actions qu'une personne valide**, livré en trois jours
sur les vraies données du client, et facturé par cas d'usage.

## 2. Ce que fait Palantir, expliqué simplement

Palantir vend un logiciel qui s'appelle Foundry. Derrière les mots compliqués (« ontologie »,
« AIP »), il fait quatre choses.

**1. Il dessine le plan de l'entreprise.** Imaginez un grand tableau où chaque chose importante a
sa fiche : chaque société, chaque client, chaque fournisseur, chaque contrat, chaque site, chaque
salarié, chaque commande. Sur chaque fiche, les faits (le nom, l'adresse, le montant, la date).
Entre les fiches, des liens : ce client appartient à cette société, ce contrat lie ce fournisseur
à ces trois sociétés, cette commande vient de ce client. Palantir appelle ça l'ontologie. Nous,
on dira **le plan du groupe**.

**2. Il remplit le plan tout seul, depuis les logiciels existants.** Personne ne ressaisit rien.
Le logiciel de gestion de la société A, celui de la société B, les tableurs, les dossiers
partagés : tout est lu, et chaque information va sur la bonne fiche. Quand le même client
s'appelle « DUPONT SA » chez A et « Dupont » chez B, le plan le voit et propose de les réunir
sous une seule fiche ; une personne confirme.

**3. Il définit ce qu'on a le droit de faire sur le plan.** Sur une fiche de contrat, on peut
« dénoncer le contrat ». Sur une fiche de livraison, « émettre une réserve ». Sur une fiche de
client, « relancer ». Chaque action dit qui a le droit de la faire, ce qu'elle change, et elle
est inscrite dans un journal avec la date et la personne. Palantir appelle ça les « action
types » ; nous, **les actions**.

**4. Il met des agents sur le plan.** Un agent est une IA qui lit le plan en continu et
**propose** une action : « ce contrat se renouvelle dans quarante jours, voici la lettre de
dénonciation préparée ». La personne responsable accepte, corrige ou refuse. L'agent n'agit
jamais seul tant qu'on ne l'a pas réglé ainsi. Dans les documents de Palantir, c'est le
« proposal pattern » : l'agent crée une proposition, l'opérateur décide.

Et surtout, **la façon dont Palantir vend** compte autant que le produit :

- **Le bootcamp.** Un à cinq jours chez le client, sur ses vraies données, pour sortir un cas
  d'usage qui marche vraiment à la fin. On ne vend pas une démo, on vend le résultat du bootcamp.
- **L'ingénieur chez le client.** Pendant le pilote, une personne de Palantir est sur place et
  construit le plan avec l'équipe informatique du client. OpenAI vient de copier ce modèle pour
  Frontier, avec BCG, McKinsey, Accenture et Capgemini.
- **Le prix par cas d'usage, pas par siège.** Un premier cas payant, puis le suivant, puis le
  suivant. C'est ce qui fait que chaque client de Palantir dépense en moyenne 65 % de plus
  l'année suivante (rétention nette de 165 % au T3 2026).

## 3. Pourquoi c'est l'idée à copier, et pas une autre

| Fait | Source |
|---|---|
| Le revenu commercial US de Palantir a fait +148 % sur un an au T3 2026 et dépasse pour la première fois son revenu gouvernemental | 8-K du T3 2026, SEC |
| OpenAI a lancé Frontier le 05/02/2026, décrit comme « une couche sémantique de l'entreprise », avec des ingénieurs déployés chez le client | openai.com, « Introducing OpenAI Frontier » |
| Microsoft a lancé Fabric IQ, avec une « ontologie » des entités, relations et règles de l'entreprise, en disponibilité générale à Build 2026 | blog Microsoft Fabric |
| Palantir ne vend pas sous la centaine de milliers de dollars par an ; Frontier est réservé à quelques très grands comptes | estimations de tiers, voir `varelo-marche-us.md` §3 |

Trois des plus gros acteurs du logiciel ont bâti la même chose en 2026. Aucun ne le vend à un
groupe de 200 à 2 000 salariés, ni aux États-Unis, ni en France. Les autres idées américaines
sont moins bonnes pour nous : copier Glean, c'est affronter Microsoft, OpenAI, Google et Mistral
à 20 à 75 $ le siège ; copier OneStream ou Campfire, c'est refaire un moteur comptable face à
Sage, Cegid et Pennylane ; copier Chronograph ne marche que pour les holdings financières.

## 4. Ce qu'on reproduit, pièce par pièce

| Chez Palantir | Chez Varelo | Ce qu'on garde en plus, parce qu'on est en France |
|---|---|---|
| L'ontologie : objets, propriétés, liens | **Le plan du groupe** : une fiche par société, client, fournisseur, contrat, site, salarié, article ; les liens entre fiches ; les codes de chaque logiciel rattachés à la fiche | Le plan se construit en quelques semaines depuis les codes existants, avec la DSI, pas en six mois avec vingt consultants |
| Les connexions de données | **Les sources** : logiciels de gestion, caisses, tableurs, dossiers, lus en lecture seule, chacun avec ce qui est lu, par qui, depuis quand | La lecture seule est une garantie écrite au contrat, pas une option |
| Les action types et le journal d'actions | **Les actions** : chaque action possible sur une fiche, avec qui peut la faire, ce qu'elle change, et son journal | Aucune action n'écrit dans les logiciels sources ; les actions sortent par courrier, courriel ou document |
| Les agents et le « proposal pattern » | **Les agents** : ils lisent le plan, proposent, et une personne décide ; par action, un réglage « propose seulement / agit après validation » | Le réglage « agit seul » n'existe pas la première année |
| Les droits au niveau de l'ontologie | **Les droits sur le plan** : chacun voit les fiches et les actions de son périmètre ; la DSI pose les droits quand la source n'en a pas | Hébergement en Europe, aucun entraînement sur les données du groupe, journal des lectures |
| Le bootcamp et l'ingénieur déployé | **Les trois jours** : un ingénieur d'Omega chez le client, un cas d'usage qui marche le troisième soir | Sur un pôle de 3 à 4 sociétés, jamais sur tout le groupe d'un coup |
| Le prix par cas d'usage | **Le prix par cas d'usage** : le premier cas, puis chaque cas suivant ; le plan et les sources sont compris | Prix à fixer après les premiers pilotes (`prix: null` sur le site) |

## 5. Les premiers cas d'usage à vendre

Un cas d'usage, c'est une question que le groupe se pose et que le plan sait traiter de bout en
bout : les fiches concernées, l'agent qui veille, l'action proposée, la personne qui décide. Les
quatre premiers, déjà dessinés dans les écrans de la page :

1. **Le groupe sur une page.** Les fiches de société réunies : ventes, trésorerie, écarts, chaque
   chiffre rattaché au chiffre de la société d'où il vient. Pour la présidence.
2. **Les contrats à dénoncer.** Les fiches de contrat à reconduction tacite, l'agent qui compte
   le préavis, la lettre préparée, la direction juridique qui décide.
3. **Les réserves à émettre.** Les fiches de livraison avec avarie, le délai de trois jours, la
   réserve préparée pour le transporteur, les opérations qui décident.
4. **Les reportings dus.** Les fiches de ce que chaque société doit à ses marques, ses banques,
   ses réseaux, avec l'échéance et la pièce.

Chaque cas suivant se vend de la même façon : une question, les fiches, l'agent, l'action, la
personne. Un groupe choisit ses cas dans son ordre.

## 6. Les trois jours, tels qu'on les vend

- **Avant** : un appel avec la DSI, la liste des trois ou quatre logiciels du pôle pilote, ce qui
  sera lu et ce qui ne le sera pas, signé.
- **Jour 1** : les sources branchées en lecture seule ; le plan se remplit ; les doublons entre
  sociétés apparaissent.
- **Jour 2** : la direction concernée valide les rapprochements proposés ; le cas d'usage choisi
  est construit avec elle (ses fiches, son agent, son action).
- **Jour 3** : le cas d'usage tourne sur les vraies données ; la direction reçoit ses premières
  propositions ; on compte ce qui est juste et ce qui ne l'est pas, devant elle.
- **Après** : le pilote se juge sur un trimestre complet. Le cas suivant se vend quand le
  premier a prouvé.

## 7. Le prix

Le modèle, pas encore le chiffre : un prix par cas d'usage et par an, qui comprend le plan, les
sources du pôle et l'agent du cas ; chaque cas suivant au même prix ou moins ; les trois jours
facturés à part la première fois. Aucun prix par siège : la présidence, les directions et la DSI
sont toutes dedans. Teo fixe les chiffres après les deux premiers pilotes.

## 8. Ce qu'on ne fait pas

- Aucune écriture dans les logiciels des sociétés. Jamais.
- Aucun agent qui agit sans validation la première année.
- Pas de production de comptes consolidés ni de liasse : on rattache, on ne produit pas.
- Pas d'IA qui répond aux clients du groupe, pas de tri de candidatures, pas de prix ni de marges
  ni de « vie chère » affichés (règles maison de la page).
- Pas de comparaison nommée avec Palantir sur le site : on décrit le modèle, on ne cite pas la
  marque.

## 9. Ce que ça change pour ce qui existe

- **La page `/secteurs/groupes`** est réécrite de bout en bout pour ce produit (même dessin, tous
  les textes neufs) : le plan, les sources, les actions, les agents, les quatre cas d'usage, les
  trois jours. C'est fait dans le même commit que ce brief.
- **L'espace `/espace2/varelo`** garde ses écrans (vue d'ensemble, finance, référentiel) : le
  « référentiel » devient le plan, le « point du matin » devient la liste des propositions des
  agents. À renommer dans les écrans après le premier pilote.
- **Les décisions 11 à 16** de `LA-SUITE.md` restent ouvertes et se tranchent après les premiers
  trois jours.

## 10. Risques et parades

| Risque | Parade |
|---|---|
| Le mot « ontologie » fait peur, le mot « plan » paraît simpliste | « Le plan du groupe » sur la page, « ontologie » dans l'argumentaire DSI, les deux pour la même chose |
| Un pôle sans export ni droits | Les trois jours commencent par la liste signée de ce qui est lu ; une société non branchable remplit un formulaire avec échéance et relance (modèle Chronograph) |
| Un rapprochement faux qui se propage | Aucun rapprochement appliqué sans validation ; chacun est daté et réversible |
| Le client compare au prix de Microsoft Copilot | On ne vend pas un assistant : on vend un cas d'usage qui marche le troisième soir, et Copilot peut lire le plan (serveur MCP en lecture seule) |
| Les trois jours ne sortent pas un cas qui marche | Le pôle et le cas sont choisis avant, sur la liste des quatre premiers ; on ne promet pas un cas inédit en trois jours |

## 11. La suite, dans l'ordre

1. Teo valide ce brief, ou dit ce qui ne va pas.
2. Le PRD du MVP : le plan, les sources, les actions, les agents en mode « propose », le cas
   d'usage 1 et le cas d'usage 2, à partir des écrans de `/espace2/varelo`.
3. Le déroulé des trois jours écrit heure par heure, avec la liste des logiciels de PME
   françaises qu'on sait lire au jour 1.
4. Deux groupes pilotes, un pôle chacun ; le prix après.
