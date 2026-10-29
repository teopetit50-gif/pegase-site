# VARELO — inventaire de l'écran avant redécoupage

Relevé du 29/10/2026, en lecture seule, dans la copie `refonte-metiers` (commit `45c3aa89`, puis `479f9d88`
« l'aiguillage des repères », commité pendant le relevé).
Écran inventorié : `/espace2/varelo` (`app/espace2/varelo/page.tsx:12-18`), qui rend tel quel
`components/espace/varelo/EcranVarelo.tsx` dans `<Habille>` (`components/espace2/Habille.tsx`). L'ancienne route
`/espace/varelo` (`app/espace/varelo/page.tsx:20-22`) rend le même composant.

Ce document sert de contrat pour la refonte : aucun bloc, geste, entrée ou promesse listé ici ne doit disparaître.
Chemins relatifs à la racine du dépôt. Dans ce document, `V/` veut dire `components/espace/varelo/` et
`M/` veut dire `omega/modules/varelo/migrations/`.

---

## 1. Entrées

### 1.1 Liens écrits en base vers l'écran

Tous les liens sont `'/espace/varelo'` **sans ancre ni paramètre**. Ils viennent des lignes du point du matin (le cron
`varelo-matin`, toutes les 30 min, `M/b1_07_point_du_matin.sql:198`) et de la porte `public.grp_ce_matin` (bloc 4).
La dernière version des sections et de leurs destinataires est dans `M/b1_11_reserves.sql:526-562`. Les fonctions
de lignes viennent de b1_07, b1_08, b1_09 et b1_11.

| # | SQL:ligne | `objet_type` | Ce que désigne `objet_id` | Gabarit de la ligne (section du point) | Destinataires (b1_11:536-545) | Où l'utilisateur doit atterrir pour traiter |
|---|---|---|---|---|---|---|
| E1 | `M/b1_07_point_du_matin.sql:62` | `grp_contrats` | `grp_contrats.id` (ligne de `grp_contrats_echeancier`) | « Avant le JJ/MM : dénoncer « intitulé » (tiers, société) — N € par an ; N contrats chez ce tiers dans le groupe », critique à 7 j sinon attention (section « Contrats à dénoncer », ordre 10) | gérant, DF, DJ | Bloc 14, ligne du contrat (`V/Contrats.tsx:239-289`). Actions sur place : « Faire valider » (G26), « Dénoncé… » (G27) |
| E2 | `M/b1_07_point_du_matin.sql:76` | `grp_ref_objets` | `grp_ref_objets.id` : un client du groupe au-dessus de son plafond | « Nom : N € d'encours pour le groupe, plafond N € (dont N € échus, N sociétés) », attention (section « Encours du groupe », ordre 20) | gérant, DF | Bloc 13 **en nature « client »**, ligne de l'objet (`V/Encours.tsx:298-335`), puis bloc 12 pour cet objet. Actions : « Plafond » (G30), « Proposer » (G29) |
| E3 | `M/b1_07_point_du_matin.sql:88` | `grp_encours_depots` | `depot_id` d'une balance âgée de plus de 7 jours | « La balance clients/fournisseurs de Société date du JJ/MM (N jours) : à redéposer », info (« Encours du groupe ») | gérant, DF | Bloc 13.a (`V/Encours.tsx:265-279`), dans la nature du dépôt. Action : « Déposer une balance âgée » (G32) |
| E4 | `M/b1_07_point_du_matin.sql:105` | — (pas d'objet) | — | « A → B : écart de N € à expliquer » / « A dit que B lui doit N € ; B ne reconnaît rien » / « arrêtés à des dates différentes », attention ou info (« Réciproques intragroupe », ordre 30) | gérant, DF | Bloc 15, paire créancier → débiteur (`V/Reciproques.tsx:154-173`). Action : « Justifier » (G33) |
| E5 | `M/b1_08_groupe_page.sql:400` | `grp_societes` | `entite_id` de la société (pas un id de `grp_societes`) : trésorerie sous le plancher | « Société : trésorerie de N €, sous son plancher de N € (balance au JJ/MM) », attention (« Le groupe ce matin », ordre 5) | gérant, DF, présidence | Bloc 5, ligne de la société (`V/GroupePage.tsx:174-193`). Action : « Objectifs » (G14) |
| E6 | `M/b1_08_groupe_page.sql:406` | `grp_societes` | `entite_id` : ventes à plus de 10 % sous l'objectif à date | « Société : ventes de N € au JJ/MM, N € sous l'objectif à date », attention (« Le groupe ce matin ») | gérant, DF, présidence | Bloc 5, même ligne. Action : « Objectifs » (G14) |
| E7 | `M/b1_08_groupe_page.sql:412` | `grp_balances_depots` | `depot_id` d'une balance générale de plus de 35 jours | « La balance générale de Société date du JJ/MM (N jours) : à redéposer », info (« Le groupe ce matin ») | gérant, DF, présidence | Bloc 5, colonne « Balance » (`V/GroupePage.tsx:186-189`). Action : « Déposer une balance générale » (G13) |
| E8 | `M/b1_09_reportings.sql:486` | `grp_reportings_echeances` | id d'une échéance (`grp_reportings_dus.id`) | « En retard depuis le JJ/MM : intitulé pour destinataire (société, période…) » critique / « Aujourd'hui : … » attention / « Avant le JJ/MM : … » info (« Reportings dus », ordre 8, et section personnelle « Mes reportings dus », ordre 7, `M/b1_11_reserves.sql:552-562`) | gérant, DF, DO, et le responsable nommé | Bloc 7, ligne de l'échéance (`V/Reportings.tsx:175-201`). Action : « Envoyé… » (G17) |
| E9 | `M/b1_11_reserves.sql:476` | `grp_receptions` | `grp_receptions.id` (ligne de `grp_reserves`) | « Avant le JJ/MM : protestation à transporteur (société, livraison du JJ/MM, expéditeur) » / « Délai passé depuis le JJ/MM : … tardive », critique si aujourd'hui, demain ou passé (« Réserves à émettre », ordre 6) | gérant, DJ, DO (pas la DF) | Bloc 8, ligne de la livraison (`V/Reserves.tsx:216-253`). Actions : « Lettre » (G22), « Faire valider » (G21), « Suite… » (G23), « Photos » (G20) |

Repères voisins, sans lien vers l'écran. Ce ne sont pas des entrées, mais ils pointent vers des objets de Varelo :
- **Demandes de validation** : `M/b1_03_proposer_nom_unique.sql:151-152` crée des `demandes_validation` avec
  `module 'varelo'`, `objet_type 'grp_referentiel'` et `objet_id` égal à la proposition. Elles se décident dans
  `/espace2/validations`. `grp_referentiel` n'a pas de règle dans l'aiguillage : il retombe sur `/espace2/varelo`
  par le module.
- **Alertes** levées par les moteurs avec `lever_alerte_module`. Leur payload porte un id, pas de lien :
  - encours : `objet_id`, `M/b1_04_encours_groupe.sql:269` ;
  - contrats : `contrat_id`, `M/b1_05_contrats_groupe.sql:207` ;
  - trésorerie : `entite_id`, `M/b1_08_groupe_page.sql:189` ;
  - reportings : `echeance_id`, `M/b1_09_reportings.sql:221` ;
  - réserves : `reception_id`, `M/b1_11_reserves.sql:172` ;
  - deux alertes « point du matin non déposé » : `M/b1_07…:179` et `M/b1_11…:567`.
- **Liens d'exemple** : `V/matin.ts:35, 41, 44, 54, 58, 60, 61, 73, 82` écrivent `lien: "/espace2/varelo"`, et
  `V/matin.ts:96` écrit `"/espace2/validations"`. Ces lignes n'ont pas d'`objet_type`.

### 1.2 Paramètres d'adresse lus par l'écran

**Aucun.** Il n'y a ni `useSearchParams` ni lecture de `location.hash` ou `location.search` dans `V/`,
`app/espace/varelo/` ou `app/espace2/varelo/` (recherche vide). L'objet ouvert, la nature et les filtres sont un état
local. La nature vaut « fournisseur » par défaut (`V/EcranVarelo.tsx:109`) et l'objet ouvert est le premier de la
liste (`V/EcranVarelo.tsx:181`).

Ancres internes que l'écran pose et que « Ce matin » vise :
- `#vrl-groupe` : `V/GroupePage.tsx:133` ;
- `#vrl-caisses` : `V/Caisses.tsx:111` ;
- `#vrl-reportings` : `V/Reportings.tsx:132` ;
- `#vrl-reserves` : `V/Reserves.tsx:175` ;
- `#vrl-objet` : `V/EcranVarelo.tsx:544` ;
- `#vrl-encours` : `V/Encours.tsx:228`, présente seulement en nature client ou fournisseur ;
- `#vrl-contrats` : `V/Contrats.tsx:192` ;
- `#vrl-reciproques` : `V/Reciproques.tsx:115` ;
- `#vrl-regles` : `V/ReglesGroupe.tsx:57` ;
- `#vrl-exports` : `V/Branchements.tsx:128`.

### 1.3 Autres fichiers qui mènent ici ou dépendent de l'écran

| Fichier:ligne | Rôle |
|---|---|
| `app/espace2/varelo/page.tsx:2, 15` | Route du nouvel espace : `<Habille><EcranVarelo/></Habille>`, titre « Référentiel du groupe » |
| `app/espace/varelo/page.tsx:2, 21` | Ancienne route : même composant, sans habillage |
| `components/espace/ecrans.ts:9` | Onglet de l'ancien espace `{ cle: "varelo", href: "/espace/varelo", libelle: "Référentiel du groupe", court: "VARELO" }` |
| `components/espace2/modules.ts:97` | Module `varelo` de la barre : « Référentiel du groupe », « Sociétés, lots et objets du groupe ». **Aucune sous-page déclarée** (pas de 6e argument, contrairement à cashd et reput aux lignes 85-96) |
| `components/espace2/modules.ts:128-129` | Le module métier des secteurs `groupe` **et** `immo` est `varelo` |
| `components/espace2/compteurs.ts:13-14, 28-32, 42-43` | Compteur « Ce matin » de la barre. Base réelle : `chargerContexte()` (de `V/portes.ts`), puis rpc `grp_ce_matin`, puis compte des lignes `attention` et `critique`. Exemple : `compterCeMatinExemple()` (`V/matin.ts:101-104`). Utilisé par `components/espace2/Coquille.tsx:40, 397` |
| `lib/varelo/assistant.ts:17-40` | Assistant : rpc `grp_assistant_client`, puis fonction Edge `varelo-assistant` (`:26`). Il n'écrit rien. Appelé par `app/api/assistant/route.ts:3, 48-50`, avant l'assistant général. Il n'est pas affiché sur l'écran Varelo |
| `components/espace2/Point.tsx:43, 50, 250, 335` | Point du matin de l'espace 2 : le lien d'une ligne passe par `aiguiller()` (commit `479f9d88`) |
| `components/espace2/aiguillage.ts:53, 60, 90-96` (commit `479f9d88`) | Règles `grp_*` vers `/espace2/varelo?objet=<objet_type>:<id>` pour les 7 `objet_type` de E1-E9. Contrat annoncé (`:18-20`) : la page racine lit `?objet=`. **L'écran actuel ne le lit pas** (§ 1.2) |
| `components/espace2/DetailDemande.tsx:375` (commit `479f9d88`) | Une demande hors FILED renvoie vers la page de son objet par `aiguiller()`. Pour Varelo, `grp_referentiel` mène à `/espace2/varelo` |
| `outils/verifier-aiguillage.mjs` (commit `479f9d88`) | Vérifie que chaque `objet_type` écrit dans `omega/modules` a sa règle |
| `components/espace/point/PointDuMatin.tsx:243-246` | Ancien point du matin : lien « Ouvrir » vers `l.lien` tel quel (`/espace/varelo`) |
| `components/espace/cashd/depot.ts:13` | **Dépendance de code** : CASHD importe `lireTableau` et `Lecture` depuis `V/csv.ts` |
| `components/espace2/vivant.tsx:82` | Couleur du module `varelo: "#64748b"` |
| `lib/en-preparation.ts:103-108` | `varelo: []` : aucune promesse Varelo n'est marquée « En préparation » |
| `components/espace2/Habille.tsx:19-26` | Habillage `.resa .esp` de l'écran repris. Le h1 est masqué ; le titre visible est dans la barre |

Liens **sortants** de l'écran :
- vers `/espace2/validations` à trois endroits : `V/CeMatin.tsx:23`, `V/Lots.tsx:131` et `V/EcranVarelo.tsx:621`.
  C'est `/espace2` même quand l'écran est servi sous `/espace/varelo` ;
- vers les objets du référentiel, en interne : `onOuvrir` de l'encours (`V/EcranVarelo.tsx:564-568`) et des contrats
  (`V/EcranVarelo.tsx:582-587`, qui change aussi la nature).

---

## 2. Blocs

Ordre de rendu réel : de haut en bas, `V/EcranVarelo.tsx:427-623`. « réel » veut dire source « Base réelle » ;
« exemple » veut dire « Données d'exemple ». `donnees` est le référentiel chargé ; `contexte` est la personne
(rôle, équipes).

| N° | Titre affiché | Composant fichier:ligne | Emplacement | Données affichées | Source (fonction → rpc / table) | Condition d'affichage |
|---|---|---|---|---|---|---|
| 1 | « Référentiel du groupe » + sous-titre « Chaque client, fournisseur ou article reçoit un seul nom… » | `V/EcranVarelo.tsx:429-448` | Tête de page | Titre, phrase, boutons G1, G2, G3 ; ruban « Données d'exemple » / « Base réelle » (`components/espace/ui.tsx:57-64`) | — | Toujours. Boutons : G1 et G3 si `peutGerer` (gérant, admin) ; G2 si `peutValider` (gérant, admin, valideur) |
| 2 | « C'est fait. … » / « La base réelle n'a pas répondu. … » | `V/EcranVarelo.tsx:450-451` | Sous la tête | Message du dernier geste (`fait`) ou de l'erreur de lecture | État local (`onFait` de toutes les cartes) | Après un geste ou une erreur |
| 3 | « Varelo n'est pas installé pour votre organisation. » | `V/EcranVarelo.tsx:453-466` | Sous la tête | Ce que pose l'installation (six directions, sept règles, battement) ; bouton G4 | `reel.installation` ← `grp_installations` (`V/portes.ts:73`) | Réel, référentiel lu et sans installation. Bouton si `peutGerer` ; sinon « Seul le gérant ou l'administrateur l'installe. » |
| 4 | « Ce matin » + compteur « N points à regarder… » / « rien à signaler » / « le point n'a pas pu être lu » | `V/CeMatin.tsx:57-83` | Première carte | 7 sous-blocs (4.1-4.7), 5 lignes au plus chacun, puis « … et N de plus », pastille de gravité | Réel : rpc `grp_ce_matin(p_client)` (`V/CeMatin.tsx:38`) → `private.grp_lignes_*` (b1_07 à b1_11). Exemple : `matinExemple()` (`V/matin.ts:26-98`), **calculé une seule fois à l'ouverture** (`V/CeMatin.tsx:33`) | `donnees && contexte` (`V/EcranVarelo.tsx:468`). En réel, chargé seulement si Varelo est installé (`actif`, `V/CeMatin.tsx:48`) ; sinon la carte ne s'affiche pas (`:54`) |
| 4.1 | « Décisions à valider » (lien vers `/espace2/validations`) | `V/CeMatin.tsx:23` | Dans 4 | Exemple : 3 décisions au plus, « À valider : Dénoncer… » et « À valider : Protester… » avec leur calcul (`V/matin.ts:84-96`) | Réel : clé `decisions` de `grp_ce_matin`, que **les migrations du dépôt ne rendent pas** (b1_11:482-495). Remplacée par `[]` (`V/CeMatin.tsx:44`) | Idem 4. Vide : « Aucune décision n'attend votre validation. » |
| 4.2 | « Le groupe ce matin » (ancre `#vrl-groupe`) | `V/CeMatin.tsx:24` | Dans 4 | Lignes E5, E6, E7 | `private.grp_lignes_groupe` (`M/b1_08:375-416`) | Idem 4 |
| 4.3 | « Réserves à émettre » (`#vrl-reserves`) | `V/CeMatin.tsx:25` | Dans 4 | Lignes E9 | `private.grp_lignes_reserves` (`M/b1_11:457-480`) | Idem 4 |
| 4.4 | « Reportings dus » (`#vrl-reportings`) | `V/CeMatin.tsx:26` | Dans 4 | Lignes E8 | `private.grp_lignes_reportings` (`M/b1_09:462-490`) | Idem 4 |
| 4.5 | « Contrats à dénoncer » (`#vrl-contrats`) | `V/CeMatin.tsx:27` | Dans 4 | Lignes E1 | `private.grp_lignes_matin(…,'contrats')` (`M/b1_07:50-65`) | Idem 4 |
| 4.6 | « Encours du groupe » (`#vrl-encours`) | `V/CeMatin.tsx:28` | Dans 4 | Lignes E2, E3 | `grp_lignes_matin(…,'encours')` (`M/b1_07:66-90`) | Idem 4. **L'ancre n'existe pas en nature article ou site** |
| 4.7 | « Réciproques intragroupe » (`#vrl-reciproques`) | `V/CeMatin.tsx:29` | Dans 4 | Lignes E4 | `grp_lignes_matin(…,'reciproques')` (`M/b1_07:91-107`) | Idem 4 |
| 5 | « Le groupe sur une page » + phrase « Chiffres sociaux… » | `V/GroupePage.tsx:133-207` | Après 4 | Totaux : ventes du groupe, résultat cumulé, trésorerie (+ « N sous plancher »). Tableau par société : ventes à date, écart sur N-1 en % et en €, écart sur l'objectif (objectif à date), résultat, trésorerie (plancher, « Sous le plancher »), balance « au JJ/MM » (« ancienne de N jours » au-delà de 35 j). Ensuite « Sans balance générale : … » | Réel : `chargerPage()` → vue `grp_groupe_page` (`V/groupe.ts:155-164`). Exemple : `BASES_EXEMPLE` et `ligneDePage` (`V/groupe.ts:99-146`) | `donnees && contexte`. Bouton G13 si gérant ou admin ; colonne « Objectifs » (G14) si gérant, admin ou valideur de l'équipe `direction_financiere` |
| 5.a | « Objectifs — Société » | `V/GroupePage.tsx:210-263` | Fenêtre | Objectif de ventes de l'exercice, plancher de trésorerie, motif | — | Ouverte par « Objectifs » |
| 5.b | « Déposer une balance générale » | `V/GroupePage.tsx:265-394` | Fenêtre | Société, arrêtée au, début d'exercice, source, fichier ou texte collé, colonnes reconnues. Puis compte rendu : comptes retenus, rejetés, ventes, résultat, trésorerie, équilibre, tableau des rejets (50 au plus) | `lireTableau` + `SYNONYMES_BALANCE_GENERALE` (`V/groupe.ts:59-67`) | Ouverte par G13 |
| 6 | « Ventes des caisses » + phrase « Le Z de chaque magasin… » | `V/Caisses.tsx:111-157` | Après 5 | Hier pour tout le groupe, même jour la semaine dernière (± %), magasins muets hier. Tableau : magasin (tickets hier), société, hier, semaine dernière, mois en cours, état (« Rien remonté hier (dernier Z le …) », « −N % sur une semaine », « à jour » / « ±N % ») | Réel : vue `grp_ventes_magasins` (`V/Caisses.tsx:56`). Exemple : `EXEMPLE()` (`:45-49`) | `donnees && contexte`. Bouton « Déposer des ventes » (G15) si rôle ≠ lecteur |
| 6.a | « Déposer des ventes de caisse » | `V/Caisses.tsx:160-224` | Fenêtre | Société, lignes du Z collées (pas de fichier), colonnes reconnues. Puis « N lignes retenues, N rejetées : … » | `lireTableau` + `SYNONYMES` (`V/Caisses.tsx:29-36`) | Ouverte par G15 |
| 7 | « Reportings dus » + phrase | `V/Reportings.tsx:132-215` | Après 6 | En retard, dans les 7 jours, obligations suivies (+ envois tardifs). Filtres « À faire / Envoyés ou dispensés / Tous ». Tableau : échéance (dans N j / depuis N j), reporting (destinataire, périodicité, délai, canal, « vous en êtes responsable »), société, période, état (+ fait le, note), actions | Réel : `chargerDus()` → vue `grp_reportings_dus` (`V/reportings.ts:146-151`). Exemple : `OBLIGATIONS_EXEMPLE` + `FAITS_EXEMPLE` + `echeances()` (`V/reportings.ts:106-138`) | `donnees && contexte`. « Ajouter un reporting » si ≠ lecteur ; « Envoyé… » si responsable, gérant, admin ou valideur ; « Ne plus suivre » si gérant ou admin |
| 7.a | « Ajouter un reporting » | `V/Reportings.tsx:218-312` | Fenêtre | Société, à qui, quoi, périodicité, jours après la fin de période, suivi à partir du, canal, case « J'en suis responsable » | — | Ouverte par G16 |
| 7.b | « Noter l'envoi — intitulé » | `V/Reportings.tsx:314-369` | Fenêtre | Envoyé ou dispensé, date, note (obligatoire si dispense), avertissement en cas de retard | — | Ouverte par G17 |
| 8 | « Réserves à émettre » + phrase | `V/Reserves.tsx:175-268` | Après 7 | À protester, dernier jour ou demain, préjudice estimé en jeu. Filtres « À protester / Protestées ou classées ». Tableau : protester avant le (dans N j / passé), livraison (transporteur, reçue le, mode, n° de document, expéditeur), société, constat (avarie, manquant, colis, texte, €, N photos), état (+ protestation le, moyen, ou motif), actions et pastille de décision | Réel : `chargerReserves()` → vue `grp_reserves` (`V/reserves.ts:172-176`). Décisions : `useDecisions` → `grp_decisions` (`V/decisions.ts:60-69`). Exemple : `RESERVES_EXEMPLE` (`V/reserves.ts:143-148`) | `donnees && contexte`. « Enregistrer une livraison » et « Faire valider » si ≠ lecteur ; « Suite… » si gérant, admin ou valideur DO ou DJ ; « Lettre » si statut `a_examiner` ; « Photos » toujours |
| 8.a | « Enregistrer une livraison » | `V/Reserves.tsx:271-399` | Fenêtre | Société, reçue le, transporteur, mode (4 règles), n° de lettre de voiture, expéditeur pris dans le référentiel (fournisseurs actifs hors intragroupe) ou son nom, colis annoncés et reçus, avarie, manquant, constat, réserves portées sur le bon, préjudice, photos (20 au plus, 15 Mo) | Règles `REGLES` (`V/reserves.ts:57-62`) | Ouverte par G19 |
| 8.b | « Lettre de protestation — transporteur » | `V/Reserves.tsx:401-429` | Fenêtre | Texte de la lettre en lecture seule ; bouton « Copier le texte » | Réel : rpc `grp_lettre_reserve`. Exemple : `lettreExemple()` (`V/reserves.ts:151-165`) | Ouverte par G22 |
| 8.c | « La suite — transporteur, livraison du … » | `V/Reserves.tsx:431-494` | Fenêtre | Protestation partie (date, moyen) ou classement sans suite (motif obligatoire) ; avertissements L133-3 et hors délai | — | Ouverte par « Suite… » |
| 8.d | « Photos du constat — transporteur, livraison du … » | `V/Reserves.tsx:496-568` | Fenêtre | Vignettes (adresses signées 10 min), nom, taille, date ; « Ajouter des photos » | Storage `omega-clients` → `createSignedUrl` (`V/reserves.ts:202-206`) | Ouverte par « Photos ». Ajout si ≠ lecteur et moins de 20 photos |
| 9 | Boutons « Fournisseurs / Clients / Articles / Sites » | `V/EcranVarelo.tsx:474-480` | Après 8 | Nature choisie (`aria-pressed`) | `NATURES` (`V/types.ts:11`) | Toujours |
| 10 | Compteurs « Codes locaux », « Objets du groupe », « Paires à valider », « Taux de rattachement » | `V/EcranVarelo.tsx:482-503` | Sous 9 | Codes (+ « N à traiter au prochain passage »), objets, paires à valider (+ « N lots dans la file »), taux en % (teinte ambre ou verte) | `etat[nature]` ← rpc `grp_etat_referentiel` (`V/portes.ts:80`), sinon calculés (`V/EcranVarelo.tsx:185-197`). Lots ← `demandes_validation` en attente (`:198`) | Toujours |
| 11 | « Fournisseurs du groupe » (selon la nature) + « N objets » | `V/EcranVarelo.tsx:506-542` | Grille, colonne gauche | Champ de recherche ; liste : code groupe, pastilles « N à valider », « Intragroupe », « Nom choisi », N codes, nom du groupe, sociétés | `chargerReferentiel()` → `grp_ref_objets`, `grp_referentiel_codes`, `grp_ref_propositions` (`V/portes.ts:70-94`) | Toujours. « Lecture du référentiel… » en chargement ; vide : « Aucun objet » |
| 12 | Objet ouvert : « F-00001 » + nom | `V/ObjetDetail.tsx:91-171` (dans `V/EcranVarelo.tsx:544-552`) | Grille, colonne droite (`#vrl-objet`) | Pastilles : nature, « Intragroupe · société », « N propositions en attente ». Fiche : nom du groupe (choisi par une personne ou libellé le plus complet), codes locaux, sociétés. Boutons G5, G6, G7. Phrases « Une correction ne s'applique qu'après la décision du référent données… » et, pour un lecteur, « …vous lisez seulement » | Mêmes données que 11 | Objet choisi. Sinon « Lecture… » ou « Choisissez un objet ». Gestes si rôle ≠ lecteur (`V/ObjetDetail.tsx:43`) |
| 12.a | « Les codes de chaque société » | `V/ObjetDetail.tsx:111-159` | Dans 12 | Tableau : société, code local, libellé local (+ anomalies SIREN…), état, « Comment » (méthode, score %, date), actions G8 et G9 | `grp_referentiel_codes` | Codes présents ; sinon « Aucun code : cet objet a été vidé par une correction. » |
| 12.b | « Proposer un nom pour le groupe » / « Fusionner dans un autre objet » / « Rattacher ce code à un autre objet » / « Détacher ce code » / « Scinder : des codes sous un nouvel objet » | `V/ObjetDetail.tsx:173-223` | Fenêtre | Nom, objet d'arrivée, cases des codes à scinder, raison | — | Ouverte par G5 à G9 |
| 13 | « Encours du groupe — clients » ou « — fournisseurs » | `V/Encours.tsx:228-358` | Sous la grille | Totaux : encours du groupe, dont échu, échu à plus de 90 j, au-dessus du plafond (clients seulement), intragroupe à part. Puis 13.a et 13.b. « N lignes de balance… sous un code pas encore rangé » | Réel : `chargerEncours()` → `grp_encours_courant`, `grp_encours_par_code`, `grp_encours_groupe`, `grp_encours_plafonds` (`V/encours.ts:224-247`). Temps réel sur `grp_ref_codes` et `grp_ref_objets` (`V/Encours.tsx:95`). Exemple : `exempleEncours` + `calculerGroupe` (`V/encours.ts:171-222`) | `donnees && contexte` **et nature client ou fournisseur** (`V/EcranVarelo.tsx:555`). G32 si gérant ou admin |
| 13.a | « La balance de chaque société » | `V/Encours.tsx:265-279` | Dans 13 | Société, arrêtée au, lignes, total, source ; pastille « ancienne de N jours » (plus de 7 j) ou « à jour ». Puis « Sans balance clients/fournisseurs : … » | `grp_encours_courant` | Au moins une balance ; sinon le vide « Aucune balance âgée déposée » remplace tout le bloc 13 |
| 13.b | « Par client du groupe » / « Par fournisseur du groupe » | `V/Encours.tsx:281-345` | Dans 13 | Tableau : objet (lien `onOuvrir` vers 12), sociétés, encours, échu, > 90 j, plafond (clients), état (« Au-dessus du plafond », « Intragroupe », « Provisoire », « N sociétés »), action (clients). 12 lignes, puis « Montrer les N » | `grp_encours_groupe` ; décisions `relever_plafond` (`useDecisions`) | Colonne action si nature client et rôle ≠ lecteur. « Plafond » si gérant, admin ou valideur DF |
| 13.c | « Plafond d'encours — nom » | `V/Encours.tsx:362-424` | Fenêtre | Encours actuel, plafond total, plafond de l'échu, motif ; boutons « Retirer le plafond » et « Enregistrer » | — | Ouverte par « Plafond » |
| 13.d | « Proposer un plafond — nom » | même composant, `proposer` (`V/Encours.tsx:355, 396-397`) | Fenêtre | Plafond total et motif ; bouton « Envoyer à la direction financière » | — | Ouverte par « Proposer » |
| 13.e | « Déposer une balance âgée » | `V/Encours.tsx:427-572` | Fenêtre | Société, clients ou fournisseurs, arrêtée au, source, fichier ou texte, colonnes reconnues. Puis compte rendu : lues, retenues, rejetées, encours, échu, codes inscrits au référentiel (+ inconnus sans nom), tableau des rejets | `SYNONYMES_BALANCE` (`V/encours.ts:115-130`) | Ouverte par G32 |
| 14 | « Contrats du groupe à dénoncer » + phrase | `V/Contrats.tsx:192-314` | Après 13 | À dénoncer sous 30 jours, sous 90 jours, montant annuel en jeu sur 90 jours, reconduits faute de dénonciation. Filtres « À surveiller / Dénoncés / Tous ». Tableau : dénoncer avant le (dans N j), contrat (tiers : lien `onOuvrir` vers 12 avec changement de nature, catégorie, préavis, « N contrats chez ce tiers, N sociétés »), société, échéance (tacite ou expresse, reconduit), montant annuel, état, actions et pastille de décision | Réel : `chargerContrats()` → vue `grp_contrats_echeancier` (`V/contrats.ts:186-191`). Décisions `denoncer_contrat`. Exemple : `contratsExemple` + `echeancier` (`V/contrats.ts:119-184`) | `donnees && contexte`. Ajouter et Corriger si ≠ lecteur ; Faire valider si ≠ lecteur, actif, tacite et date non passée ; Dénoncé… si gérant, admin ou valideur DJ ou DF ; Archiver si gérant ou admin |
| 14.a | « Ajouter un contrat » / « Corriger un contrat » | `V/Contrats.tsx:318-474` | Fenêtre | Intitulé, société, catégorie, tiers du référentiel ou nom, échéance, début, reconduction, durée, préavis et unité, montant annuel, référence, notes ; « Il manque … » | `CATEGORIES` (`V/contrats.ts:23-33`) | Ouverte par G24 et G25 |
| 14.b | « Noter la dénonciation — intitulé » | `V/Contrats.tsx:477-523` | Fenêtre | Rappel tiers, société, date limite ; « Partie le » ; motif ; avertissement hors délai | — | Ouverte par G27 |
| 15 | « Comptes réciproques intragroupe » + phrase | `V/Reciproques.tsx:115-183` | Après 14 | Paires de sociétés, concordantes ou justifiées, à traiter avant la clôture (N paires, €). Tableau : créancier → débiteur, créance (au …), dette reconnue, écart, état (+ cause et motif si justifié), action | Réel : `chargerReciproques()` → vue `grp_reciproques` (`V/reciproques.ts:98-103`). Exemple : `RECIPROQUES_EXEMPLE` | `donnees && contexte`. G34 si gérant, admin ou valideur ; « Justifier » si gérant, admin ou valideur DF |
| 15.a | « Justifier un écart intragroupe » | `V/Reciproques.tsx:186-232` | Fenêtre | Rappel créance, dette et écart ; cause (6 catégories) ; explication obligatoire | `CATEGORIES_ECART` (`V/reciproques.ts:40-47`) | Ouverte par G33 |
| 16 | « Lots à valider » + « N paires dans N lots » | `V/Lots.tsx:108-203` | Grille du bas, gauche (`V/EcranVarelo.tsx:594-597`) | Par lot : type d'action, résumé, équipe, N approbations, âge, statut, lien « Décider dans la file ». Par paire : gauche → droite, pastille de preuve (sûre, probable N %, personne), raisons (SIREN, TVA, IBAN, GTIN, nom et CP, similarité…), G10 ou « se décide par sa demande » | `grp_ref_propositions` (`a_valider`) + `demandes_validation` (module varelo, `V/portes.ts:78-79`) | `donnees`. G10 si preuve ≠ humaine et (gérant, admin, membre de l'équipe du lot, ou lot sans équipe) (`V/Lots.tsx:59-63`). Vide : « Rien à valider » |
| 16.a | « Dernières décisions » | `V/Lots.tsx:161-179` | Dans 16 | Les 6 dernières propositions traitées : gauche → droite, « appliquée / écartée / refusée / périmée », motif, date, raisons | `grp_ref_propositions` (statut ≠ `a_valider`) | Au moins une décision |
| 16.b | « Écarter cette paire » | `V/Lots.tsx:181-201` | Fenêtre | Rappel de la paire et des raisons ; motif | — | Ouverte par G10 |
| 17 | « Sociétés et pôles » + « N sociétés · N pôles » | `V/Societes.tsx:127-228` | Grille du bas, droite | Par pôle (puis « Sans pôle ») : nom (« entité principale »), SIREN, territoire et fuseau, logiciel, nomenclature, N codes déposés ; pastille de branchement (« À brancher », « En observation », « Active », « Suspendue »). Note « Chaque source se branche en lecture seule, avec l'accord de la DSI… » | `grp_poles`, `grp_societes_vue`, `grp_referentiel_codes` (`V/portes.ts:74-76`) | `donnees`. Boutons G11, G12 et « Déposer un export » (ouvre 20) si `peutGerer` |
| 17.a | « Créer un pôle » | `V/Societes.tsx:173-226` (mode `pole`) | Fenêtre | Nom du pôle, clé calculée | — | Ouverte par G12 |
| 17.b | « Inscrire une société au groupe » | `V/Societes.tsx:173-226` (mode `societe`) | Fenêtre | Nom, SIREN (9 chiffres), territoire (12 territoires et leur fuseau, `V/Societes.tsx:23-36`), pôle, logiciel, nomenclature | — | Ouverte par G11 |
| 18 | « Règles du groupe » + phrase | `V/ReglesGroupe.tsx:57-75` | Après la grille du bas | Préavis d'un contrat, dénonciation proposée N jours avant, plafond d'encours d'un client, réserve au transporteur | Réel : table `grp_reglages` (`V/ReglesGroupe.tsx:31`). Exemple : `EXEMPLE` (`:24`) | `donnees && contexte`. « Modifier les règles » si gérant ou admin |
| 18.a | « Règles du groupe » (fenêtre) | `V/ReglesGroupe.tsx:78-144` | Fenêtre | Préavis par défaut et unité, jours de proposition de la dénonciation, plafond par défaut, réserve au plus tard | — | Ouverte par G35 |
| 19 | « Exports automatiques » + phrase | `V/Branchements.tsx:128-178` | Dernière carte | Par société : logiciel branché, jeux (« dernier export le … » / « rien reçu »), ou « aucun logiciel branché… » ; pastille « branché », « Branchement / Débranchement en attente de la DSI », « débranché » ou « non branché » | Réel : `branchements` (module varelo), `branchements_jeux`, `grp_sources_demandes` en attente (`V/Branchements.tsx:70-74`). Exemple : un Sage 100 sur la 1re société (`:58-62`) | `donnees && contexte`. Brancher et Débrancher si gérant ou admin |
| 19.a | « Brancher le logiciel — société » | `V/Branchements.tsx:181-230` | Fenêtre | Logiciel (11, dont 5 caisses), exports attendus (6 jeux, filtrés par `jeuxDe`) | `LOGICIELS`, `JEUX` (`V/Branchements.tsx:26-49`) | Ouverte par G36 |
| 20 | « Déposer l'export d'une société » | `V/Depot.tsx:72-152` | Fenêtre | Société, nature, source, fichier ou texte, colonnes reconnues, ignorées ou manquantes, plafond de 20 000 lignes. Puis compte rendu : lues, nouveaux, modifiés, inchangés, anomalies, rejetées, tableau des rejets | `lireExport` + `GABARIT` (`V/csv.ts:126-131`) | `donnees`. Ouverte par G1 (tête) ou « Déposer un export » (17) |
| 21 | « Lancer un passage de rapprochement » | `V/EcranVarelo.tsx:604-618` | Fenêtre | Ce que fait le calcul ; « N codes … attendent ce passage » pour la nature choisie | `compteurs.a_traiter` | Ouverte par G2 |
| 22 | « Les lots se décident dans la file de validation… » | `V/EcranVarelo.tsx:620-622` | Pied de page | Phrase et lien vers `/espace2/validations` | — | Toujours |

---

## 3. Gestes (tout ce qui écrit, envoie ou télécharge)

« ≠ lecteur » veut dire tout rôle sauf `lecteur`. « Relit » veut dire que la carte recharge sa source après la porte.
En exemple, chaque geste modifie la mémoire locale avec un délai simulé de 300 à 600 ms et n'écrit jamais en base.

| N° | Libellé | Bloc | Fonction → rpc / table | Fenêtre de confirmation | Rôle requis (écran) | Après |
|---|---|---|---|---|---|---|
| G1 | « Déposer un export » → « Déposer » | 1 et 17 → 20 | `deposer` (`V/EcranVarelo.tsx:281-340`) → `deposerCodes` → rpc `grp_deposer_codes` (`V/portes.ts:115-116`) | Oui : formulaire 20, bouton « Déposer » (`V/Depot.tsx:147`) | gérant, admin (`V/EcranVarelo.tsx:438`, `V/Societes.tsx:162-167`) | Compte rendu dans la fenêtre ; avis « Export déposé : … Le rapprochement est en file. » ; relit le référentiel. Exemple : contrôle du SIREN (`:303-317`) et passage de la société à « En observation » |
| G2 | « Lancer un passage » → « Lancer maintenant » | 1 → 21 | `lancer` (`V/EcranVarelo.tsx:343-375`) → rpc `grp_rapprocher(p_complet=false)`, puis `grp_appliquer_decisions` (`V/portes.ts:119-120`) | Oui : fenêtre 21 | gérant, admin, valideur | Avis « Passage terminé : N codes examinés, N objets créés, N placés d'office, N lots à valider » ; relit |
| G3 | « Exporter (CSV) » (référentiel) | 1 | `telecharger` (`V/EcranVarelo.tsx:378-406`) → rpc `grp_exporter_referentiel(p_nature)` (`V/portes.ts:130`) | Non | gérant, admin | Télécharge `referentiel-<nature>-<date>.csv` pour la nature du bloc 9 ; avis « …est exporté (N lignes) » |
| G4 | « Installer Varelo » | 3 | `installerIci` (`V/EcranVarelo.tsx:409-421`) → rpc `grp_installer` (`V/portes.ts:104`) | Non | gérant, admin | Avis « Varelo est installé : N règles… » ; relit (pas de branche exemple : le bouton n'existe qu'en réel) |
| G5 | « Proposer un nom » → « Proposer » | 12 → 12.b | `actions.proposer("renommer")` → rpc `grp_proposer_nom` (`V/portes.ts:124`) | Oui : 12.b (nom, raison) | ≠ lecteur | Avis « C'est proposé » dans 12 ; demande de validation créée ; relit |
| G6 | « Fusionner dans… » → « Proposer » | 12 → 12.b | → rpc `grp_proposer_fusion` (`V/portes.ts:126`) | Oui : 12.b (objet d'arrivée, raison) | ≠ lecteur ; désactivé sans autre objet ou si un code est « proposé » | Idem G5 |
| G7 | « Scinder » → « Proposer » | 12 → 12.b | → rpc `grp_proposer_scission` (`V/portes.ts:128`) | Oui : 12.b (cases, raison) | ≠ lecteur ; au moins 2 codes | Idem G5 |
| G8 | « Rattacher ailleurs » (par code) → « Proposer » | 12.a → 12.b | → rpc `grp_proposer_rattachement` (`V/portes.ts:125`) | Oui : 12.b | ≠ lecteur ; code pas « proposé » | Idem G5 |
| G9 | « Détacher » (par code) → « Proposer » | 12.a → 12.b | → rpc `grp_proposer_detachement` (`V/portes.ts:127`) | Oui : 12.b | ≠ lecteur ; au moins 2 codes | Idem G5 |
| G10 | « Écarter cette paire » → « Écarter » | 16 → 16.b | `actions.ecarter` (`V/EcranVarelo.tsx:249-277`) → rpc `grp_ecarter_proposition` (`V/portes.ts:122`) | Oui : 16.b (motif) | gérant, admin, membre de l'équipe du lot ; preuve ≠ humaine | « Le code repart seul sur son propre objet… » ; relit. Exemple : un objet est créé et le lot vidé est annulé |
| G11 | « Inscrire la société » | 17 → 17.b | `ajouterSociete` → rpc `grp_ajouter_societe` (`V/portes.ts:112-113`) | Oui : 17.b | gérant, admin | « « Nom » est inscrite au groupe (territoire, fuseau) : il reste à déposer son premier export. » ; relit |
| G12 | « Créer le pôle » | 17 → 17.a | `creerPole` → **INSERT direct** `grp_poles` (`V/portes.ts:106-110`) | Oui : 17.a | gérant, admin | « Le pôle « … » est créé. » ; relit |
| G13 | « Déposer » (balance générale) | 5 → 5.b | `deposer` (`V/GroupePage.tsx:80-117`) → `deposerBalance` → rpc `grp_deposer_balance` (`V/groupe.ts:173-174`) | Oui : 5.b | gérant, admin | Compte rendu ; avis « Balance générale déposée : N comptes, ventes…, trésorerie… » ; relit la page |
| G14 | « Enregistrer » (objectifs) | 5 → 5.a | `regler` (`V/GroupePage.tsx:119-130`) → rpc `grp_regler_objectif` (`V/groupe.ts:176-177`) | Oui : 5.a | gérant, admin, valideur DF | « Objectifs de Société… » ; relit |
| G15 | « Déposer » (ventes de caisse) | 6 → 6.a | `deposer` (`V/Caisses.tsx:79-108`) → rpc `grp_deposer_ventes` (`:81`) | Oui : 6.a | ≠ lecteur | « Ventes déposées : N lignes retenues… » ; relit |
| G16 | « Enregistrer le reporting » | 7 → 7.a | `enregistrer` (`V/Reportings.tsx:92-103`) → rpc `grp_enregistrer_reporting(p_reporting=null)` (`V/reportings.ts:160-161`) | Oui : 7.a | ≠ lecteur | « Le reporting … est suivi : ses échéances sont créées… » ; relit |
| G17 | « Envoyé… » → « Noter » | 7 → 7.b | `marquer` (`V/Reportings.tsx:104-115`) → rpc `grp_marquer_reporting` (`V/reportings.ts:162-163`) | Oui : 7.b | responsable de l'échéance, gérant, admin, valideur ; statut `a_faire` | « … est noté envoyé le … (après son échéance) » ou « dispensé » ; relit |
| G18 | « Ne plus suivre » | 7 | `arreter` (`V/Reportings.tsx:116-129`) → rpc `grp_arreter_reporting(p_motif=null)` (`V/reportings.ts:164`) | **Non (immédiat)** | gérant, admin | « Le reporting … n'est plus suivi. » ; relit |
| G19 | « Enregistrer la livraison » | 8 → 8.a | `enregistrer` (`V/Reserves.tsx:102-115`) → rpc `grp_enregistrer_reception` (`V/reserves.ts:182-183`), puis pour chaque photo : Storage `omega-clients` upload + rpc `grp_joindre_photo` (`V/reserves.ts:193-201`) | Oui : 8.a | ≠ lecteur | « Livraison enregistrée : la protestation … doit partir avant le … La lettre est prête. » (+ photos jointes, + erreur photo) ; relit |
| G20 | « Ajouter des photos » (choix de fichiers) | 8 → 8.d | `ajouterPhotos` (`V/Reserves.tsx:117-142`) → Storage upload + rpc `grp_joindre_photo` | **Non : l'envoi part dès le choix des fichiers** (`V/Reserves.tsx:558`) | ≠ lecteur ; moins de 20 photos | « N photos jointes. » dans 8.d ; relit |
| G21 | « Faire valider » (protestation) | 8 | `faireValider` (`V/Reserves.tsx:87-95`) → `useDecisions.proposer("protester_reception")` → rpc `grp_proposer_decision` (`V/decisions.ts:71-75`) | **Non (immédiat)** | ≠ lecteur ; statut `a_examiner` ; aucune décision existante | « La protestation à … est proposée à la direction des opérations, avec son calcul et N photos » (ou « attend déjà ») ; pastille « En validation (direction des opérations) » |
| G22 | « Lettre » → « Copier le texte » | 8 → 8.b | `ouvrirLettre` (`V/Reserves.tsx:146-153`) → rpc `grp_lettre_reserve` (`V/reserves.ts:184`, lecture), puis `navigator.clipboard` | Fenêtre 8.b (lecture) | aucun contrôle à l'écran ; statut `a_examiner` | « Le texte est copié. » Rien n'est envoyé au transporteur |
| G23 | « Suite… » → « Noter » | 8 → 8.c | `decider` (`V/Reserves.tsx:154-172`) → rpc `grp_noter_protestation` ou `grp_classer_reception` (`V/reserves.ts:185-187`) | Oui : 8.c | gérant, admin, valideur DO ou DJ | « La protestation … est notée, partie le … (hors délai) » + avertissement L133-3, ou « classée sans suite » ; relit |
| G24 | « Ajouter un contrat » → « Enregistrer le contrat » | 14 → 14.a | `enregistrer` (`V/Contrats.tsx:118-159`) → rpc `grp_enregistrer_contrat(p_contrat=null)` (`V/contrats.ts:200-201`) | Oui : 14.a | ≠ lecteur | « Le contrat … est enregistré : sa date limite de dénonciation est suivie. » ; relit |
| G25 | « Corriger » → « Enregistrer la correction » | 14 → 14.a | même porte, avec `p_contrat=id` | Oui : 14.a | ≠ lecteur ; contrat non archivé | « Le contrat … est corrigé. » ; relit |
| G26 | « Faire valider » (dénonciation) | 14 | `faireValider` (`V/Contrats.tsx:104-112`) → rpc `grp_proposer_decision("denoncer_contrat")` | **Non (immédiat)** | ≠ lecteur ; actif, tacite, `jours_restants ≥ 0`, aucune décision | « La dénonciation … est proposée à la direction juridique, avec son calcul : … » ; pastille de décision |
| G27 | « Dénoncé… » → « Noter la dénonciation » | 14 → 14.b | `denoncer` (`V/Contrats.tsx:163-175`) → rpc `grp_denoncer_contrat` (`V/contrats.ts:203-204`) | Oui : 14.b | gérant, admin, valideur DJ ou DF ; reconduction ≠ aucune | « La dénonciation … est notée au … (hors délai / dans le délai). L'alerte est close. » ; relit |
| G28 | « Archiver » | 14 | `archiver` (`V/Contrats.tsx:176-189`) → rpc `grp_archiver_contrat(p_motif=null)` (`V/contrats.ts:206`) | **Non (immédiat)** | gérant, admin | « Le contrat … est archivé : il n'est plus suivi. » ; relit |
| G29 | « Proposer » (plafond) → « Envoyer à la direction financière » | 13.b → 13.d | `proposerIci` (`V/Encours.tsx:131-139`) → rpc `grp_proposer_decision("relever_plafond", {plafond, motif})` | Oui : 13.d | ≠ lecteur ; nature client ; hors intragroupe ; aucune décision en attente | « Le plafond de N € pour … est proposé à la direction financière… » ; pastille « En validation (direction financière) » |
| G30 | « Plafond » → « Enregistrer » | 13.b → 13.c | `reglerIci` (`V/Encours.tsx:144-162`) → rpc `grp_regler_plafond` (`V/encours.ts:259-260`) | Oui : 13.c | gérant, admin, valideur DF | « Plafond de … : N € … L'encours du groupe le dépasse : une alerte est levée. » ou « …est en dessous. » ; relit |
| G31 | « Retirer le plafond » | 13.c | même porte, avec `p_plafond=null` | Dans 13.c, sans seconde confirmation | idem G30 ; plafond existant | « Le plafond de … est retiré. » |
| G32 | « Déposer une balance âgée » → « Déposer » | 13 → 13.e | `deposerIci` (`V/Encours.tsx:166-225`) → rpc `grp_deposer_encours` (`V/encours.ts:256-257`) ; en exemple, inscrit les codes inconnus au référentiel par `deposer` (G1) | Oui : 13.e | gérant, admin | Compte rendu ; « Balance âgée déposée : N lignes retenues pour N €, N rejetées, N codes inscrits au référentiel. » ; relit l'encours **et** le référentiel |
| G33 | « Justifier » → « Justifier l'écart » | 15 → 15.a | `justifier` (`V/Reciproques.tsx:80-91`) → rpc `grp_justifier_ecart` (`V/reciproques.ts:112-113`) | Oui : 15.a | gérant, admin, valideur DF ; état `ecart` ou `dates_differentes` | « L'écart de N € entre … est justifié… » ; relit |
| G34 | « Exporter (CSV) » (réciproques) | 15 | `telecharger` (`V/Reciproques.tsx:94-112`) → rpc `grp_exporter_reciproques` (`V/reciproques.ts:115`) ; exemple `csvExemple` | Non | gérant, admin, valideur ; liste non vide | Télécharge `reciproques-intragroupe-<date>.csv` ; avis |
| G35 | « Modifier les règles » → « Enregistrer les règles » | 18 → 18.a | `regler` (`V/ReglesGroupe.tsx:44-54`) → rpc `grp_regler_groupe` (`:46`) | Oui : 18.a | gérant, admin | « Les règles du groupe sont posées… » ; relit |
| G36 | « Brancher » → « Demander à la DSI » | 19 → 19.a | `demander("brancher")` (`V/Branchements.tsx:99-116`) → rpc `grp_demander_source` (`:103`) | Oui : 19.a | gérant, admin ; société non branchée et sans demande en cours | « Le branchement de … est demandé à la DSI… » ; pastille « Branchement en attente de la DSI » ; relit |
| G37 | « Débrancher » | 19 | `debrancher` (`V/Branchements.tsx:118-125`) → rpc `grp_demander_source("debrancher")` | **Non (immédiat)** | gérant, admin ; société branchée | « Le débranchement de … est demandé à la DSI… » ; pastille d'attente |

Gestes **sans écriture** à garder (navigation et confort, non comptés dans le total) :
- clic sur un objet de la liste (11), qui fait défiler vers `#vrl-objet` sous 1024 px (`V/EcranVarelo.tsx:526`) ;
- lien de l'objet dans l'encours (`V/Encours.tsx:301`) et du tiers d'un contrat (`V/Contrats.tsx:251`), qui ouvrent 12 ;
- « Décider dans la file » (`V/Lots.tsx:131`) ;
- les 7 titres de « Ce matin » (`V/CeMatin.tsx:67`) ;
- le lien du pied de page (`V/EcranVarelo.tsx:621`) ;
- « Montrer les N » (`V/Encours.tsx:344`) ;
- les filtres des blocs 7, 8, 9 et 14 ;
- « Photos » (lecture, `V/Reserves.tsx:237`) ;
- « Choisir un fichier » des quatre dépôts (lecture locale).

---

## 4. Liste et filtres

| Sujet | Valeurs / règle | Fichier:ligne |
|---|---|---|
| Natures | `fournisseur`, `client`, `article`, `site`, dans cet ordre ; « fournisseur » par défaut. Code groupe préfixé F-, C-, A- ou S- sur 5 chiffres | `V/types.ts:10-11, 199-204` ; `V/EcranVarelo.tsx:109` ; `V/exemples.ts:54` |
| Effets de la nature | Liste 11, compteurs 10, export G3, phrase de la fenêtre 21, présence et contenu du bloc 13 (client ou fournisseur seulement). Le lien d'un contrat change la nature | `V/EcranVarelo.tsx:166, 185-197, 383, 555, 583, 612` |
| Filtre de la liste | `o.nature === nature && o.statut === "actif"`. Le réel ne charge que les objets actifs, 5 000 au plus | `V/EcranVarelo.tsx:166` ; `V/portes.ts:77` |
| Recherche | Insensible à la casse, sur code groupe, nom du groupe, et pour chaque code rattaché : code local, nom local, société | `V/EcranVarelo.tsx:165-172, 512` |
| Tri de la liste | Objets avec des propositions `a_valider` d'abord, puis par `numero` croissant | `V/EcranVarelo.tsx:173-178` |
| Objet ouvert | Choix de la personne s'il est encore dans la liste, sinon le premier | `V/EcranVarelo.tsx:181-182` |
| Pastilles d'objet | « N à valider », « Intragroupe », « Nom choisi » (`nom_origine = humain`) | `V/EcranVarelo.tsx:529-531` |
| États d'un code | `a_traiter` « À traiter », `nouveau` « Seul », `propose` « Proposé », `confirme` « Confirmé » | `V/types.ts:13, 206-211` |
| Méthodes | nouveau, siren, tva, iban, gtin, ref_fournisseur, nom_cp, similarite, humain, rejet | `V/types.ts:14, 213-224` |
| États d'un objet | `actif` (montré) ; fusionné (`fusionne_dans`, non montré) | `V/types.ts` (Objet) ; `V/EcranVarelo.tsx:166` |
| Propositions | statuts `a_valider`, `ecartee`, `executee`, `rejetee`, `perimee` ; preuves `sure`, `probable`, `humaine` ; genres placer, deplacer, fusionner, detacher, scinder, renommer | `V/Lots.tsx:25, 143-145` ; `V/EcranVarelo.tsx:93-100` |
| Demandes (lots) | `en_attente`, `approuvee`, `executee`, `rejetee`, `annulee`, `expiree`, `echec_execution` ; 7 types d'action | `V/Lots.tsx:23-24` ; `V/types.ts:226-234` |
| Tri des lots | Par date de création de la demande, croissante ; « Dernières décisions » : les 6 plus récentes | `V/Lots.tsx:48-56` |
| Branchement d'une société | `a_brancher`, `observation`, `active`, `suspendue` | `V/types.ts:32, 236-241` |
| Filtres des cartes | Reportings : `a_faire`, `faits`, `tous` (`V/Reportings.tsx:46, 157`). Réserves : `a_examiner`, `traitees` (`V/Reserves.tsx:54, 198`). Contrats : `a_surveiller`, `denonces`, `tous` (`V/Contrats.tsx:57, 219`) | — |
| Tris des cartes | Groupe : société (`V/GroupePage.tsx:65`). Caisses : société puis magasin (`V/Caisses.tsx:72`). Reportings : échéance croissante, décroissante pour « faits » (`V/Reportings.tsx:74`). Réserves : échéance (`V/Reserves.tsx:79`). Encours : dépassés, puis hors intragroupe, puis total décroissant ; 12 par page (`V/Encours.tsx:69, 103-108`). Contrats : rang du délai (urgent, dépassé, bientôt, large, sans objet), puis date limite (`V/Contrats.tsx:84-88`). Réciproques : rang de l'état, puis écart absolu (`V/Reciproques.tsx:66-69`). Ce matin : 5 lignes par sous-bloc (`V/CeMatin.tsx:71-74`) | — |
| États des cartes | Reportings `LIBELLE_ETAT_DU` (7 états, `V/reportings.ts:60-68`). Réserves `LIBELLE_ETAT_RESERVE` (7, `V/reserves.ts:64-72`) et statuts `a_examiner`, `protestee`, `sans_suite`. Contrats `LIBELLE_DELAI` (5, `V/contrats.ts:89-95`) et statuts `actif`, `denonce`, `archive`. Réciproques `LIBELLE_ETAT_RECIPROQUE` (6, `V/reciproques.ts:49-56`). Décisions `etiquetteDecision` (7 statuts, `V/decisions.ts:38-53`) | — |

---

## 5. Exemple ou réel

| Point | Fait | Fichier:ligne |
|---|---|---|
| Interrupteur | `useSource()` : le choix est gardé dans `localStorage` (clé `espace.source`). Le serveur rend toujours « exemple » ; le navigateur relit la valeur mémorisée. L'interrupteur est dans la coquille ; l'écran n'affiche que le ruban | `components/espace/source.tsx:27-60` ; `components/espace2/Coquille.tsx:350` ; `components/espace/ui.tsx:57-64` |
| Choix des données | `donnees = source === "exemple" ? local : reel` ; `contexte = CONTEXTE_EXEMPLE` ou `contexteReel` | `V/EcranVarelo.tsx:143-144` |
| Personne d'exemple | Rôle `gerant`, périmètre total, équipes `referent_donnees` et `dsi`. Tous les boutons gérant sont visibles en exemple | `V/exemples.ts:167-178` |
| Jeu d'exemple | Atelier Bertin : 3 sociétés, 2 pôles, 12 objets, 17 codes, 5 demandes, 5 propositions. Identifiants `00000000-0000-4000-8000-…` | `V/exemples.ts:22-164` |
| Exemple des cartes | Chaque carte garde son propre état d'exemple en mémoire : `BASES_EXEMPLE`, Caisses `EXEMPLE`, `OBLIGATIONS_EXEMPLE`/`FAITS_EXEMPLE`, `RESERVES_EXEMPLE`, `LIGNES_BRUTES_EXEMPLE`/`ARRETES_EXEMPLE`/`PLAFONDS_EXEMPLE`, `contratsExemple`, `RECIPROQUES_EXEMPLE`, Règles `EXEMPLE`, branchement Sage du siège. Tout repart à zéro au rechargement | `V/GroupePage.tsx:46` ; `V/Caisses.tsx:52` ; `V/Reportings.tsx:50-51` ; `V/Reserves.tsx:58` ; `V/Encours.tsx:74-76` ; `V/Contrats.tsx:61` ; `V/Reciproques.tsx:47` ; `V/ReglesGroupe.tsx:28` ; `V/Branchements.tsx:58-62` |
| Calculs simulés | Dépôt : contrôle SIREN de Luhn et rejets. Passage : un objet par code `a_traiter`. Export CSV fabriqué dans le navigateur avec protection contre l'injection tableur. Propositions : refus des doublons. Écarter : nouvel objet et lot annulé | `V/EcranVarelo.tsx:213-243, 256-273, 288-337, 353-366, 385-391` |
| Ce matin en exemple | `matinExemple()` puise dans les générateurs d'exemple, pas dans l'état des cartes, et **n'est calculé qu'une fois** : les gestes faits en exemple ne le changent pas | `V/CeMatin.tsx:33` ; `V/matin.ts:26-98` |
| Décisions en exemple | Liste locale en mémoire. La décision reste `en_attente` (pas de validation simulée) | `V/decisions.ts:78-118` |
| Base réelle | `chargerContexte()` lit `comptes`, `equipes`, `equipes_membres` et `entites`, puis `chargerReferentiel()` (8 lectures en parallèle). Chaque carte lit sa source quand `source === "reelle" && contexte`. Ce matin attend en plus l'installation | `V/portes.ts:29-94` ; `V/EcranVarelo.tsx:114-132` |
| Erreur de lecture | Le référentiel est vidé et l'avis rouge s'affiche. Sans `contexte`, seuls 16 et 17 restent (les autres cartes exigent `contexte`) | `V/EcranVarelo.tsx:123-126, 468-600` |
| Temps réel | Référentiel : `grp_ref_codes`, `grp_ref_objets`, `grp_ref_propositions`, `grp_societes`, `demandes_validation`. Encours : `grp_ref_codes`, `grp_ref_objets`. Les autres cartes ne se relisent qu'après leurs propres gestes | `V/EcranVarelo.tsx:141` ; `V/Encours.tsx:95` |
| Compteur de la barre | Exemple : `compterCeMatinExemple()`. Réel : rpc `grp_ce_matin` | `components/espace2/compteurs.ts:21, 42` |

---

## 6. Objets métier

| Objet (table / vue) | Identifiant | Blocs qui s'y rattachent | Lecture / écriture |
|---|---|---|---|
| `grp_installations` | `client_id` | 3, 4 (condition `actif`) | `V/portes.ts:73` ; G4 |
| `grp_poles` | `id` (+ `cle`) | 17, 17.a, 17.b | `V/portes.ts:74` ; G12 (INSERT direct) |
| Sociétés : `grp_societes` / `grp_societes_vue` / `entites` | `entite_id` (`objet_type` `grp_societes` dans E5 et E6) | 17, 17.b, 5, 6, 7.a, 8.a, 13.a, 14.a, 19, 20, 5.b, 6.a, 13.e | `V/portes.ts:75` ; G11 |
| Codes locaux : `grp_ref_codes` / vue `grp_referentiel_codes` | `code_id` | 10, 11, 12, 12.a, 16, 17 (compte), 13 (non rangés), 20 | `V/portes.ts:76` ; G1, G8, G9 |
| Objets du groupe `grp_ref_objets` | `id`, `code_groupe` (F-00001), `numero` (`objet_type` `grp_ref_objets` dans E2) | 10, 11, 12, 13.b, 14 (tiers), 8.a (expéditeur), 16 | `V/portes.ts:77` ; G5 à G7 |
| Propositions `grp_ref_propositions` | `id`, `cle_paire` | 10, 11 (pastille), 12 (en attente), 16, 16.a | `V/portes.ts:78` ; G10, G5 à G9 |
| `demandes_validation` (module varelo, `objet_type` `grp_referentiel`) | `id` | 10 (lots dans la file), 16 | `V/portes.ts:79` ; écrites par les portes (`M/b1_03:151`) |
| `grp_etat_referentiel` (rpc) | `client_id` + nature | 10 | `V/portes.ts:80` |
| Encours : `grp_encours_depots`, `grp_encours_lignes`, `grp_encours_plafonds` ; vues `grp_encours_courant`, `grp_encours_par_code`, `grp_encours_groupe` | dépôt `depot_id` (E3) ; plafond par `objet_id` | 13, 13.a-13.e, 4.6, 15 (balances âgées) | `V/encours.ts:224-260` ; G29 à G32 ; `M/b1_04:40-173` |
| Contrats : `grp_contrats` / vue `grp_contrats_echeancier` | `id` (E1) | 14, 14.a, 14.b, 4.5, 4.1 | `V/contrats.ts:186-206` ; G24 à G28 ; `M/b1_05:37, 141` |
| Réciproques : `grp_reciproques_justifs` / vue `grp_reciproques` | paire `creancier_id`–`debiteur_id` (E4, sans id) | 15, 15.a, 4.7 | `V/reciproques.ts:98-115` ; G33, G34 ; `M/b1_06:42, 87` |
| Page du groupe : `grp_balances_depots`, `grp_balances_lignes`, `grp_objectifs` / vue `grp_groupe_page` | dépôt `depot_id` (E7) ; société `entite_id` (E5, E6) ; objectif `entite_id` + `exercice_debut` | 5, 5.a, 5.b, 4.2 | `V/groupe.ts:155-177` ; G13, G14 ; `M/b1_08:41-126` |
| Reportings : `grp_reportings`, `grp_reportings_echeances` / vue `grp_reportings_dus` | obligation `reporting_id` ; échéance `id` (E8) | 7, 7.a, 7.b, 4.4 | `V/reportings.ts:146-164` ; G16 à G18 ; `M/b1_09:34-182` |
| Réceptions : `grp_receptions` / vue `grp_reserves` (+ `photos`, bucket `omega-clients/<client>/grp_receptions/<id>/…`) | `id` (E9) | 8, 8.a-8.d, 4.3 | `V/reserves.ts:172-207` ; G19 à G23 ; `M/b1_11:56, 123` ; `M/b1_12:29` |
| Décisions `grp_decisions` (genres `denoncer_contrat`, `protester_reception`, `relever_plafond`) | `id` ; clé `genre:objet_id` | 4.1, 8 (pastille, G21), 13.b (G29), 14 (G26) | `V/decisions.ts:60-75` |
| Règles `grp_reglages` | `client_id` | 18, 18.a | `V/ReglesGroupe.tsx:31, 46` |
| Branchements : `branchements` (module varelo), `branchements_jeux`, `grp_sources_demandes` | `id` du branchement ; jeu `code` | 19, 19.a ; 17 (statut de branchement) | `V/Branchements.tsx:70-74, 103` |
| Ventes de caisse : vue `grp_ventes_magasins` | `entite_id` + `magasin` | 6, 6.a | `V/Caisses.tsx:56, 81` |
| Personne : `comptes`, `equipes`, `equipes_membres` | `user_id` | Tous les droits | `V/portes.ts:29-56` |
| `alertes` (socle) | `cle_regroupement` `varelo:*` | Aucun bloc ne les affiche | `M/b1_04:269`, `M/b1_05:207`, `M/b1_08:189`, `M/b1_09:221`, `M/b1_11:172` |

Les SQL de `grp_decisions`, `grp_proposer_decision`, `grp_reglages`, `grp_regler_groupe`, `grp_sources_demandes`,
`grp_demander_source`, `grp_ventes_magasins`, `grp_deposer_ventes` et `grp_assistant_client` **ne sont pas dans
`M/`**. Le dossier s'arrête à `b1_14_signatures.sql`, alors que les composants citent b1_15, b1_16 et b1_17
(`V/decisions.ts:2`, `V/ReglesGroupe.tsx:4`, `V/Branchements.tsx:11`, `V/Caisses.tsx:4`). Dans le dépôt, les fichiers
`b1_15` à `b1_17` sont des **tests** (`omega/tests/varelo/b1_15_photos.sql`, etc.), pas ces migrations. La clé
`decisions` de `grp_ce_matin` n'est rendue par aucune migration du dépôt.

---

## 7. Promesses : quel bloc prouve quoi

Sources :
- `omega/CHIFFRAGE/varelo.md:46-88` (39 lignes, numérotées #) ;
- textes actuels `components/secteurs/groupes/textes.ts` (T:ligne) et `lib/secteurs.ts:153-158` (L) ;
- `omega/NOTES-B1.md` (scénario `:64-92`) ;
- `lib/en-preparation.ts:103-108` (`varelo: []` : aucune pastille « En préparation », donc **toutes les promesses
  sont réputées livrées**).

| # chiffrage | Promesse (texte du site) | T / L | Blocs qui la prouvent | Remarque |
|---|---|---|---|---|
| 1, 18, 28 | « Une seule IA pour tout le groupe » ; « L'IA raisonne donc sur les mêmes données… » | T:59, 61, 191-193, 249 | Aucun bloc de l'écran. Assistant `lib/varelo/assistant.ts` (bulle de l'espace) | Ne pas confondre avec l'écran. Garder l'entrée assistant |
| 2, 8 | « Varelo branche la même IA sur les logiciels et les tableurs… en lecture seule » | T:61, 103 | 19, 19.a ; dépôts 20, 5.b, 6.a, 13.e | — |
| 3, 12 | « Chaque matin, elle dit à chaque direction ce qu'elle doit décider » ; « Chaque matin à 7 h, chaque direction reçoit : » | T:61, 118 | 4 (4.1-4.7) ; compteur de la barre | Le point par direction est remis par le socle (Point du matin), pas par cet écran |
| 4, 32, 39 | Image « trois décisions à valider, chacune avec son calcul… » ; image « une décision proposée à la direction juridique… en attente » ; catalogue « au plus trois décisions » | T:72, 267 ; L:157 | 4.1 ; G21 (8), G26 (14), G29 (13.d) et leurs pastilles « En validation (direction …) » (`V/decisions.ts:41`) | « Au plus trois » : `slice(0,3)` en exemple seulement (`V/matin.ts:95`). La facture rapprochée de son bon de livraison n'est pas dans Varelo |
| 5, 27 | Image « le référentiel du groupe… sous un seul nom » ; « Chaque client, fournisseur ou article reçoit un seul nom… » | T:78, 249 | 9, 10, 11, 12, 12.a, 16, 21, G3 | Le sous-titre du bloc 1 reprend la phrase |
| 9 | « Une règle s'écrit une fois pour le groupe… délai de réserve, préavis de contrat, seuil d'encours » | T:104 | 18, 18.a | Le chiffrage disait C ; le bloc existe depuis (b1_16 cité) |
| 10, 13, 19 | « la présidence lit le groupe sur une page… avec le calcul et la pièce » ; « Le groupe sur une page » ; image « ventes, trésorerie et écarts de chaque société » | T:105, 127, 132, 197-199 | 5, 5.a, 5.b, 4.2 ; calcul : titres des pastilles de décision ; pièce : 8.d | — |
| 11 | Image « les sociétés d'un pôle, les clients du groupe, une règle de calcul, les pièces, le point du matin… et ses commentaires » | T:112 | 17, 11 (clients), 13, 18, 8.d, 4 | « Commentaires » : aucun bloc |
| 14, 20 | « Les contrats à dénoncer » ; « …chacun avec sa date limite » ; « La fiche d'un contrat… » | T:137-148, 203-205 | 14, 14.a, 14.b, 4.5 | La « fiche » est la fenêtre 14.a : pas de page de contrat |
| 15, 16, 21 | « Les réserves à émettre » ; « une livraison reçue avec avarie : le transport, les colis et les photos » ; « trois jours pour l'adresser » | T:152-163, 209-211 | 8, 8.a-8.d, 4.3 | — |
| 17 | « Les reportings dus » ; « …rangés par échéance » | T:167-172 | 7, 7.a, 7.b, 4.4 | — |
| 22, 29 | « Le même client porte trois noms… personne ne voit son encours » ; image « …rangé sous un seul nom avec son encours total » | T:215-217, 255 | 12 + 13 (13.b relie à 12) | — |
| 23, 25 | « La DSI garde la main » ; « Chaque source se branche avec l'accord de la DSI et se débranche de la même façon » | T:229, 237 | 19, 19.a, G36, G37 ; note du bloc 17 | — |
| 24, 26 | « Varelo lit vos logiciels de gestion, vos caisses et vos tableurs » ; image « …logiciel de gestion, caisses, tableurs et documents » | T:237, 243 | 6, 6.a ; 19 (5 logiciels de caisse) ; 8.d (documents) | Le chiffrage disait « Caisses : rien » ; le bloc 6 existe depuis (b1_17 cité) |
| 30, 31 | « Rien ne part sans l'accord de la direction concernée… Chaque proposition arrive avec son calcul et sa pièce, et le journal garde qui a validé quoi » | T:261 | 16, 16.a, 16.b, 12.b, 22 ; G21, G26, G29 | Pas de fil de journal à l'écran, hors « Dernières décisions » (6 lignes) |
| 33-35 | Données en UE, chaque lecture au journal, aucun entraînement ; image « réglages d'hébergement et journal » | T:273-279 | Aucun bloc de cet écran | — |
| 36, 37 | « Nous commençons par un pôle, une société et une direction » ; « chaque société suivante se branche… d'un territoire à l'autre » | T:289-290 | 17, 17.a, 17.b (territoire obligatoire et fuseau), 3 (installation, 6 directions) | — |
| 6, 7, 38 | Statistiques, liens audit et données | T:62, 92, 238, 294-295 | Hors écran | — |
| NOTES-B1 § 1 | Scénario : installer, pôles, sociétés, dépôt, passage, lot, écarter, approuver (dans la file), corriger, IBAN différent à deux approbations, intragroupe, export, journal (« le fil dans l'écran (gérant/admin) ») | `omega/NOTES-B1.md:72-92` | 3, 17, 20, 21, 16, 12, 11 (« Intragroupe »), 1 (G3) | **Aucun fil du journal dans l'écran** (étape 17, `:92`) |

---

## 8. Regroupements naturels et observations

### 8.1 Par sujet et par direction

| Sujet | Blocs | Direction (rôle d'action) | Fréquence |
|---|---|---|---|
| Le matin | 4 (4.1-4.7), 22 | toutes | quotidien |
| Présidence et chiffres | 5, 5.a, 5.b, 6, 6.a | présidence (lecture) ; gérant ou DF (objectifs) ; ≠ lecteur (caisses) | 5 et 6 en lecture : quotidien ; objectifs : réglage annuel ; dépôts : mensuel (BG) ou quotidien (Z) |
| Opérations | 8 et ses fenêtres, 7 et ses fenêtres | DO, DJ ; responsables nommés | quotidien (délai de 3 jours) ; ajout de reporting ponctuel |
| Juridique | 14, 14.a, 14.b | DJ, DF | lecture hebdomadaire, alerte à 30 j ; saisie ponctuelle |
| Finance | 13 et ses fenêtres, 15, 15.a | DF | encours : quotidien ; plafond : ponctuel ; réciproques : à la clôture |
| Référentiel (cœur) | 9, 10, 11, 12, 12.a, 12.b, 16, 16.a, 16.b, 21, G3 | référent données, valideurs | lots : quotidien (référent) ; corrections et passage : ponctuel |
| Sources et structure | 17, 17.a, 17.b, 20, 19, 19.a, 18, 18.a, 3 | gérant ou admin (DSI) | réglage ; dépôt d'export : ponctuel |

### 8.2 Taille de chaque bloc (lignes de code)

| Bloc | Lignes | Fichier entier |
|---|---|---|
| 1 en-tête | 20 (`EcranVarelo:429-448`) | `EcranVarelo.tsx` : 625, dont environ 320 de logique (`:102-425`) |
| 2 avis | 2 | — |
| 3 installation | 14 | — |
| 4 Ce matin | 27 de rendu (`CeMatin:57-83`) | `CeMatin.tsx` 84 + `matin.ts` 104 |
| 5 / 5.a / 5.b | 75 / 54 / 130 | `GroupePage.tsx` 394 + `groupe.ts` 177 |
| 6 / 6.a | 47 / 65 | `Caisses.tsx` 224 |
| 7 / 7.a / 7.b | 84 / 95 / 56 | `Reportings.tsx` 369 + `reportings.ts` 164 |
| 8 / 8.a / 8.b / 8.c / 8.d | 94 / 129 / 29 / 64 / 73 | `Reserves.tsx` 568 + `reserves.ts` 207 |
| 9 nature | 7 | — |
| 10 compteurs | 22 | — |
| 11 liste | 37 | — |
| 12 / 12.a / 12.b | 81 (dont 12.a 49) / 51 | `ObjetDetail.tsx` 226 |
| 13 / 13.c-d / 13.e | 131 / 63 / 146 | `Encours.tsx` 572 + `encours.ts` 287 |
| 14 / 14.a / 14.b | 123 / 157 / 47 | `Contrats.tsx` 523 + `contrats.ts` 206 |
| 15 / 15.a | 69 / 47 | `Reciproques.tsx` 232 + `reciproques.ts` 127 |
| 16 (dont 16.a 19, 16.b 21) | 96 | `Lots.tsx` 204 |
| 17 (dont fenêtre 54) | 102 | `Societes.tsx` 229 |
| 18 / 18.a | 19 / 67 | `ReglesGroupe.tsx` 144 |
| 19 / 19.a | 51 / 50 | `Branchements.tsx` 230 |
| 20 | 81 | `Depot.tsx` 153 + `csv.ts` 131 |
| 21 | 15 | — |
| 22 | 3 | — |
| Partagés | — | `portes.ts` 130, `types.ts` 241, `exemples.ts` 178, `decisions.ts` 119, `varelo.css` 257 ; dossier : 7 145 lignes |

### 8.3 Doublons

- **« Déposer un export »** existe deux fois, dans la tête (`V/EcranVarelo.tsx:438`) et dans « Sociétés et pôles »
  (`V/Societes.tsx:167`). Les deux ouvrent la même fenêtre 20.
- **Quatre fenêtres d'import quasi identiques** : fichier ou texte collé, colonnes reconnues, ignorées ou
  manquantes, plafond de 20 000 lignes, compte rendu et tableau des rejets. Ce sont 20 (export de codes), 5.b
  (balance générale), 13.e (balance âgée) et 6.a (ventes, sans fichier). Elles partagent `lireTableau` (`V/csv.ts:94`).
- **Deux exports CSV** au même dessin : G3 (référentiel) et G34 (réciproques).
- **Mécanique « Faire valider »** instanciée trois fois : `useDecisions` est appelé dans 8, 13 et 14
  (`V/Reserves.tsx:86`, `V/Encours.tsx:129`, `V/Contrats.tsx:103`). Cela fait trois lectures séparées de
  `grp_decisions`.
- **Liste des sociétés** à trois endroits :
  - 17 (structure et statut de branchement) ;
  - 19 (branchement par société) ;
  - notes « Sans balance … » de 5 et 13.a (`V/GroupePage.tsx:198-200`, `V/Encours.tsx:275-279`).
  Le statut de branchement de 17 (`statut_branchement`) et celui de 19 (`branchements`) viennent de deux sources
  différentes.
- **Lien vers la file de validation** à trois endroits : 4.1, 16 et 22.
- **Chaque carte lit sa propre source** à l'ouverture : au moins 15 lectures Supabase pour une page en réel.

### 8.4 Blocs mal rangés ou couplés (faits)

- **Le sélecteur de nature (9) est placé après cinq cartes qui n'en dépendent pas** (4 à 8). Il commande des éléments
  placés au-dessus de lui (G3, texte de 21) et au-dessous (10, 11, 12, 13). Le commentaire d'en-tête dit
  « en haut, quatre compteurs » (`V/EcranVarelo.tsx:22-23`), mais le rendu les place après 4 à 8 (`:468-503`).
- **Le bloc 13 dépend de la nature** : il est absent en article ou site et montre les fournisseurs par défaut. Les
  lignes E2 parlent pourtant de clients : l'ancre `#vrl-encours` de 4.6 ouvre donc l'encours fournisseurs, ou rien.
  Les blocs 14 et 15 ne dépendent pas de la nature.
- **Les lots (16) sont séparés de la liste et du détail (11-12)** par trois cartes (13, 14, 15), alors que leurs
  pastilles « N à valider » et « N propositions en attente » renvoient l'un à l'autre.
- **Couplages entre blocs** à préserver au découpage :
  - 13.b ouvre 12 (`onOuvrir`, `V/EcranVarelo.tsx:564-568`) ;
  - 14 ouvre 12 et change la nature (`:582-587`) ;
  - 13.e inscrit des codes au référentiel (`inscrireExemple`, `relireReferentiel`, `:570-571`) ;
  - G1 (dépôt) vit dans l'écran parent et sert 17 et 13.e ;
  - `onFait` de toutes les cartes alimente l'avis 2.
- **« Ce matin » n'a pas d'ancre** pour 6 (caisses), 16 (lots), 17, 18 et 19, bien que 6, 18 et 19 aient un `id`.
  Aucune ligne de caisse n'est au point du matin.
- **Les gestes immédiats, sans fenêtre** : G18 « Ne plus suivre », G28 « Archiver », G37 « Débrancher », G21 et G26
  « Faire valider », G20 (envoi des photos au choix du fichier), G3 et G34 (exports), G4 « Installer ».

### 8.5 Faits utiles pour l'aiguillage

- Les 9 liens en base visent la page entière. L'écran ne lit **aucun** paramètre, donc l'utilisateur atterrit en
  haut, sur « Ce matin », et doit faire défiler jusqu'à la carte.
- L'aiguillage (commit `479f9d88`) envoie déjà `?objet=<type>:<id>` pour 7 `objet_type`. Il faudra qu'une page sache
  ouvrir :
  - un contrat (14) ;
  - un objet du groupe en nature client, dans l'encours, et son détail (13, 12) ;
  - un dépôt de balance âgée (13.a, nature du dépôt) ;
  - une société (5) ;
  - un dépôt de balance générale (5) ;
  - une échéance de reporting (7) ;
  - une réception (8).
- E4 (réciproques) n'a pas d'objet : il retombe sur la racine. Les demandes `grp_referentiel` retombent aussi sur la
  racine (pas de règle).
- `objet_type 'grp_societes'` porte un `entite_id` (`M/b1_08:400, 406`), pas un identifiant de la table
  `grp_societes`.
- L'ancienne route `/espace/varelo` et l'onglet `components/espace/ecrans.ts:9` existent encore et rendent le même
  composant.
- `components/espace/cashd/depot.ts:13` importe `V/csv.ts` : déplacer ou renommer ce fichier casse CASHD.

---

**Totaux : 54 blocs (22 blocs principaux, 7 sous-blocs de « Ce matin », 25 fenêtres et sous-sections), 37 gestes
qui écrivent, envoient ou téléchargent (plus les gestes de navigation listés au § 3), 9 entrées écrites en base
(7 `objet_type` distincts, 1 sans objet), 0 paramètre d'adresse lu, 15 fichiers du dépôt qui mènent ici ou en
dépendent (§ 1.3).**
