# VARELO — sous-pages, références, preuves (02/11/2026)

Règles : `docs/refonte-metiers/REGLES.md`. Consigne : `docs/refonte-metiers/cloud/COMMUN.md` et `cloud/VARELO.md`.
Inventaire (contrat de la refonte) : `docs/refonte-metiers/varelo.md`. Préfixe CSS : `var-`.

## Méthode de preuve

- `npx next dev -p 3100`, puis `outils/var-preuve.sh <route> <captures de référence> <nom> [dx]` : Playwright
  (chromium headless), fenêtre 1440×900 et 390×844, `deviceScaleFactor: 1`, `colorScheme` sombre et clair,
  données d'exemple (`espace.source = exemple`). Images dans `docs/refonte-metiers/comparaisons/varelo/` :
  `<nom>-1440-<thème>-cote.png` (référence à gauche), `-diff.png` (différence ×4), `-fusion.png` (moitié-moitié),
  `-nous.png` (notre capture entière), `<nom>-390-<thème>-cote.png`.
- On compare **carte contre carte** : la carte `main` du SaaS (244,8 ; 1188×856) et notre `.var-carte`
  (304,56 ; 1128×836), posée dans la coquille d'espace2 dont la barre du haut (48) et les barres latérales (304)
  tiennent la place de la barre latérale du SaaS. La carte est 60 px plus étroite : une colonne centrée tombe
  30 px plus à gauche, d'où `--dx -30` pour ces pages.
- Socle repris de Daliro (même référence Linear, mêmes relevés) sous le préfixe `var-` : jetons sombre et clair
  relevés, carte, en-tête, menu « … » (`components/espace2/varelo/var.css`, `VarCadre.tsx`) ; icônes du sprite de
  Linear générées par `outils/var-icones.mjs` (`VarIcone.tsx`).
- Logique : l'écran d'avant devient un crochet (`useReferentielVarelo`, `EcranVarelo.tsx`), servi aux sous-pages
  par `components/espace2/varelo/donnees.tsx` ; l'écran d'avant reste sous `?ancien=1`.

## Écarts communs à toutes les sous-pages (expliqués)

- Hors carte : la coquille d'espace2 (barre du haut, rail, volet de navigation) remplace la barre latérale du
  SaaS ; à 390, la barre du haut d'espace2 (82 px, avec « Données d'exemple ») précède la carte. Ce n'est pas la
  page copiée.
- Le contenu (textes, nombre de lignes) est celui du métier : les écarts de la différence suivent les mots.
- Les fenêtres des gestes (formulaires de l'écran d'avant) s'ouvrent dans la fenêtre modale de l'espace : Linear et
  Plain n'ont pas ces formulaires (gestes du métier).

## Sous-pages

| Sous-page | Route | Référence | Relevé | Comparaisons | État |
|---|---|---|---|---|---|
| Ce matin | `/espace2/varelo` | Linear, accueil d'une équipe | `linear-home.md` | `ce-matin-*` | fait |
| Contrats | `/espace2/varelo/contrats` (`?contrat=<id>`) | Plain, Accounts : liste et fiche | `plain-tenants.md`, `plain-tenant.md` | `contrats-liste-*`, `contrats-fiche-*`, `contrats-fiche-volet-*` | fait |
| Opérations | `/espace2/varelo/operations` (`?reception=`, `?echeance=`) | Linear, Board | `linear-board.md` | `operations-*` | fait |
| Groupe | `/espace2/varelo/groupe` (`?societe=`, `?depot=`) | Linear, liste des Initiatives | `linear-initiatives-liste.md` | `groupe-*` | fait |
| Sources et structure | `/espace2/varelo/sources` (`?societe=`, `?regles=1`) | Linear, Settings › Integrations (catalogue et page d'une intégration) | `linear-integrations.md` | `sources-*` | fait |
| Finance | `/espace2/varelo/finance` (`?objet=`, `?depot=`) | Plain, Insights (Reporting et rapports) | `plain-insights.md` | `finance-*` | fait |
| Référentiel | `/espace2/varelo/referentiel` (`?objet=&nature=`, `?vue=lots`, `?vue=decisions`) | Attio, liste People et fiche d'un contact | `attio-people.md` (après import) | `referentiel-*`, `referentiel-fiche-*` | fait |

### Ce matin → Linear, accueil d'une équipe (`linear-home.md`)

Contenu : blocs 4 (4.1-4.7), 22, 3 (phrase et renvoi vers Sources et structure). Superposition 1440 (dx −30) :
sombre écart moyen 7,4/255, clair 7,2/255 ; en-tête (fil, « … », copier le lien), onglets, tuile et titre,
description, sections, rangées de 40, colonne droite (« Membres », « Aller à ») tombent sur la référence. 390 :
liens « Aller à » repliés sous la description avec l'avatar en tête, comme Linear.

Écarts restants, expliqués :
- « Team resources » devient sept sections, une par sous-bloc du point (le contenu du métier) ; chaque section
  garde un seul rond (« Ouvrir », icône « ajouter une section ») : le « + » de Linear crée un document, geste qui
  n'existe pas ici.
- Icône de rangée : la gravité de la ligne (critique, à regarder, pour information) prend l'icône de priorité de
  Linear (urgent, haute, basse) au lieu de l'icône de document ; la gravité est une information du métier.
- « Members » montre la personne connectée (initiales) : pas d'équipe nommée dans Varelo.

### Contrats → Plain, Accounts (`plain-tenants.md`, `plain-tenant.md`, `plain-commun.md`)

Contenu : bloc 14 (liste, filtres, compteurs), 14.a et 14.b (fenêtres d'avant), gestes G24 à G28, lien du tiers vers le
référentiel. Repère `grp_contrats` → `?contrat=<id>` (aiguillage mis à jour). Socle Plain : `var-plain.css`,
`PlainCadre.tsx` (menu, popover, touches F et V), `PlainIcone.tsx` (tracés relevés).

Preuves (carte Plain à x 353, la nôtre à 304 ; on compare les 1079 premiers pixels de la liste, puis la colonne de 719 et
le volet de 360 de la fiche) :
- liste 1440 : sombre 6,7/255, clair 5,6/255. En-tête, recherche, « Trié par », en-têtes de colonnes de 32, lignes de
  59,5 (pastille calée de 2,5 px comme chez Plain), vignettes, cercles, pastilles, booléens tombent juste ;
- fiche 1440 : colonne 12,2 et 10,9/255 (le contenu d'onglet diffère : étapes contre fils), volet 7,7 et 6,6/255 ;
  « ← Contrats », vignette et titre (écart vignette-titre 4 px : mesuré sur les positions, le relevé écrit 12), méta,
  contrôle segmenté, filet, pile de blocs à filets de 1 px ;
- 390 : en-tête sur deux lignes, recherche réduite, tableau qui défile, « Nom » tronquée ; la fiche ouvre le volet en
  feuille plein écran avec le rappel du titre, comme Plain.

Écarts restants, expliqués :
- Colonnes : celles du métier (jours restants, catégorie, reconduction, société, montant, échéance, dénoncé,
  décision) dans les briques des colonnes de Plain (cercle d'« Open threads », pastille de Tier, texte à icône de
  Source, texte gris, nombre aligné à droite, booléen, pastille de Modules). Le cercle prend la couleur de l'état du
  délai (rouge, jaune, bleu) : information du métier.
- Dates et nombres en français (« 20/11/2026 », « 36 000,00 € » dans le volet) : traduction.
- Les quatre compteurs d'avant sont dans le menu « Filtres » (Plain n'a pas de bandeau de chiffres sur cette page).
- Onglets de la fiche : « Étapes » (brique Tasks : faire valider, dénoncer), « Contrats du tiers » (brique Customers),
  « Notes » (carte vide de Plain quand il n'y en a pas) : Threads, Themes et Issues n'ont pas d'équivalent.
- Whyte (titre de page, licence payante) → Inter 400 même taille ; geistMono → Source Code Pro (chargée par l'espace).
- « Faire valider » et « Archiver » passent par une confirmation (consigne commune).

### Opérations → Linear, Board (`linear-board.md`)

Contenu : blocs 7 (reportings dus) et 8 (réserves à émettre) en cartes, rangées par état ; fenêtres 7.a, 7.b, 8.a-8.d
d'avant ; gestes G16 à G23. Repères `grp_receptions` → `?reception=<id>`, `grp_reportings_echeances` → `?echeance=<id>`
(la carte visée défile au centre, ses gestes ouverts).

Mesures prises sur la capture de référence (pixels) : zone de colonne 340 au pas de 348, colonne à 17 du bord, en-tête
de 50, cartes de 322 à rayon 8, ligne 1 de 15, titre à 5, puces de 24 à 10, pied de 22,5 à 8 : 132,5 px pour un titre
de deux lignes et une rangée de puces. Fond des colonnes : transparent en sombre, lch(94.44 0.5 282) en clair.

Preuves 1440 : sombre 12,8/255, clair 13,7/255 (dx 0 : le tableau part du bord gauche). Colonnes, en-têtes, icônes
d'état, « … » et « + », bords des cartes, identifiant, titre, puces et pied tombent sur la référence ; l'écart suit le
contenu (nombre de puces : la société d'un groupe est plus longue qu'un projet de Linear, la rangée passe à la ligne).
390 : colonnes de 290, cartes de 264, défilement horizontal, comme Linear.

Écarts restants, expliqués :
- Colonnes : les états du métier (En retard, À venir, Cette semaine, Aujourd'hui ou demain, Faits, Classés) dans les
  icônes d'état de Linear (Triage, Backlog, Todo, In Progress, Done, Canceled), dans le même ordre.
- Identifiant de carte : « Réserve · mode de transport » ou « Reporting · périodicité » (pas de numéro de ticket).
- Pied : la date de réception ou la période (pas de « Created … »).
- Puces du métier : avarie, manquant, photos, préjudice, décision, canal (pastille 9×9 comme une étiquette).
- La colonne « Faits » montre les 20 plus récents, puis « … et N de plus » (les reportings faits s'accumulent).

### Groupe → Linear, liste des Initiatives (`linear-initiatives-liste.md`)

Contenu : bloc 5 (« Le groupe sur une page » : totaux, une ligne par société, « Sans balance générale »), fenêtres 5.a
(objectifs, G14) et 5.b (balance générale, G13) d'avant. Repères `grp_societes` (porte un `entite_id`) →
`?societe=<entite_id>` et `grp_balances_depots` → `?depot=<id>` : la ligne de la société est surlignée.

Grille vérifiée sur les abscisses du relevé (pas de padding sur la ligne, écart 6 ; le complément du 01/11 prime sur
l'écart 12 du premier relevé). Preuves 1440 : sombre 4,8/255, clair 5,0/255 ; en-tête de colonnes de 32, lignes de 57,
case de 28 de l'icône, nom et résumé, pilule d'état, ronds d'urgence et de responsable, date, compteur, santé et
pastilles à point tombent sur la référence (colonnes décalées de 60 à gauche : la colonne du titre prend la largeur
de carte en moins). 390 : plus d'en-tête, titre et santé seulement, comme Linear.

Écarts restants, expliqués :
- Colonnes du métier dans les briques de Linear : État (statut : Alerte = trésorerie sous le plancher, En retard,
  À jour, Sans cible, À déposer), Urgence (priorité), Pôle (responsable : initiale du pôle), Balance (date cible),
  Sur N-1 (compteur de projets : écart en %), Âge (santé : balance de moins de 35 jours), Trésorerie (pastille à point
  des projets actifs). Les libellés d'état sont courts pour tenir dans les 100 px de Linear ; leur sens complet est
  dans l'info-bulle.
- Première ligne « Tout le groupe » : les totaux de l'écran d'avant, dans la même brique (Linear n'a pas de total).

### Sources et structure → Linear, Settings › Integrations (`linear-integrations.md`)

Contenu : blocs 17 (sociétés et pôles, 17.a, 17.b), 18 (règles, 18.a), 19 (branchements, 19.a), 20 (dépôt d'un export,
une seule entrée), 3 (installation) ; gestes G1, G4, G11, G12, G35, G36, G37.

Preuves 1440 (dx −30, colonne de 640 centrée) : clair 9,6/255 ; sombre 48,8/255, presque tout dans le carrousel (voir
écarts). Titre 24/500 à 64, sous-titre, champ de recherche de 44, carrousel de 640×384, onglets de 27 à 17 dessous,
sur-titres en capitales, grille de 3 × 202,66 et cartes de 156 tombent sur la référence. Page d'une société et page des
règles (`sources-societe-*-nous.png`, `sources-regles-*-nous.png`) : la page d'une intégration du relevé (retour
« ‹ » collant en dégradé, logo 48 bordé, h2 18/500, carte d'info à méta en capitales et bouton violet « Enable »,
blocs « Connections » et « Reviews & commits » en listes à filets inset de 16, interrupteurs 30×20) ; Linear n'a pas de
capture à taille réelle de cette page. 390 : plus de carrousel, chaque section devient une liste de 68 à chevrons.

Écarts restants, expliqués :
- Carrousel : la vitrine de Linear est une image de produit ; Varelo n'a pas d'image à montrer, la vitrine garde sa
  boîte, sa pastille, son pied (logo 56, nom, phrase) et ses onglets, sur un fond uni. C'est l'écart dominant en sombre.
  Ses entrées sont les gestes de structure (déposer un export, inscrire une société, créer un pôle, règles, installer).
- Les logos des cartes sont les initiales de la société (pas de logo d'éditeur).
- Pas de barre latérale des réglages de Linear : la navigation de l'espace la remplace.
- « Débrancher » demande une confirmation ; « Installer Varelo » aussi (consigne commune).

### Finance → Plain, Insights (`plain-insights.md`)

Contenu : blocs 13 (encours, 13.a-13.e), 15 (réciproques, 15.a, export G34), 6 (caisses, 6.a) ; gestes G15, G29 à
G34. Repères `grp_ref_objets` (E2 : client au-dessus du plafond) → `?objet=<id>`, `grp_encours_depots` → `?depot=<id>`.

Preuves 1440 (carte Plain à 353) : sombre 9,1/255, clair 8,7/255. Barre de titre de 86 (titre 24/400 et quatre boutons
bordés de 30), filet, titres de section collants avec chevron, grille de trois cartes à 42 d'écart (texte calé sur le
titre de section), titre de carte 12/550 et info, valeur 24/400 et suffixe, graphiques de 155 (grillage vertical, barres
de 15 à rayon 2 teintées selon la valeur, moyenne pointillée et son étiquette, axe à droite), répartitions (barre de 8)
et rapports en grille (lignes de 42) tombent sur la référence. 390 : titre seul, boutons sur deux lignes à droite, une
colonne de cartes, comme Plain.

Écarts restants, expliqués :
- Boutons de la barre : Filtre (société), Déposer (balance âgée, ventes de caisse), Nature (clients ou fournisseurs),
  Export (CSV des réciproques), dans les briques Filter, Group by, Timeframe et Granularity.
- Le rapport (tableau) est posé sous ses répartitions dans la même page : chez Plain il est une page voisine
  (Accounts, Tiers…) ; ici chaque section a le sien, avec les gestes en bout de ligne (Plafond, Proposer, Justifier).
- Graphiques dessinés en SVG, une barre par société, objet ou magasin (pas de série par jour : les données sont des
  soldes, pas des flux quotidiens).
- Badges : « > plafond », « N jours » / « à jour », état des réciproques, en rouge ou vert comme les badges
  d'évolution de Plain.

### Référentiel → Attio, liste People et fiche d'un contact (`attio-people.md`, complément « Après import »)

Relevé Attio refait sur données remplies (40 contacts, 15 entreprises fictifs), rafraîchi avant la page comme le demande
la consigne. Contenu : blocs 9 (nature, en haut), 10 (compteurs), 11 (liste), 12, 12.a, 12.b (fiche, corrections),
16, 16.a, 16.b (lots à côté de la liste, dernières décisions, écarter), 21 (passage) ; gestes G2, G3, G5 à G10.

Preuves (Attio n'a pas de carte : sa page part du bord, barre latérale repliée ; on compare les 1128×836 premiers
pixels de la page à notre carte) : liste 1440 sombre 13,8/255, clair 13,7/255 ; fiche 1440 sombre 8,7/255, clair
9,2/255. En-tête de 49, barre de vue (boutons de 28, bouton bleu), barre « Sorted by / Filter », grille (en-têtes de
40, lignes de 36, colonnes de 250, 215, 288, 310, 250, filets, case 16 à rayon 6, pastille avatar + nom à 66), pied
« count » collé en bas ; fiche : panneau gauche de 432 (nom 18/600, actions de 28, détails en lignes de 34), onglets
à compteurs, cartes « Points clés » de 86, listes à filets. La liste a moins de lignes que celle de la référence (sept
objets d'exemple contre 77 contacts) : c'est l'essentiel de l'écart. 390 : Attio n'a pas de mise en page mobile, la
grille et la fiche défilent à l'horizontale, comme ici.

Écarts restants, expliqués :
- Colonnes du métier : Objet du groupe (Person), Rattachement (la pastille carrée de « Connection strength » : à valider
  orange, intragroupe bleu, rattaché ou nom choisi vert, seul gris), Codes locaux (code du groupe en chasse fixe),
  Sociétés, Mis à jour. Pas de « Add column » ni de « Add calculation » : le pied porte les quatre compteurs d'avant.
- Les lots et les dernières décisions sont deux vues du sélecteur de vue (Attio range ainsi ses listes), dans la même
  grille ; « Écarter » et « Décider dans la file » en bout de ligne.
- Icônes : Attio n'a pas de tracés au relevé ; celles de Linear (sprite relevé) sont reprises, à la même taille (16).
- Onglets de la fiche : Vue d'ensemble, Codes, Propositions, puis Encours et Contrats qui mènent aux sous-pages.
- « Lancer un passage » (le bouton bleu « New Person ») passe par une confirmation, comme la fenêtre d'avant.

## Contrôles

`npx tsc --noEmit`, `npx eslint` sur tous les fichiers touchés, `node outils/verifier-aiguillage.mjs
/tmp/releve-prod/omega/prod/migrations` (« Chaque repère a sa page. ») et `npm run build` verts à chaque sous-page.
Ancien écran : `/espace2/varelo?ancien=1` (et `/espace/varelo`, renvoyé vers l'espace 2) rend `EcranVarelo`, qui
utilise les mêmes crochets. Les sept `objet_type` des repères (`?objet=` sur la racine) mènent chacun à sa sous-page,
vérifié au navigateur.

## Boutons de la référence et leur utilité (02/11/2026, soir)

Décision de Teo, relayée par la session coordinatrice et vérifiée dans son fil (« oui vasi je donne mon accord »,
20 h 21 UTC) : chaque bouton de la référence est dessiné au 1:1 et fait une chose utile au métier. D'abord un geste
qui existe (portes inchangées, aucune migration), sinon une utilité côté navigateur. Ce qui envoie ou ne se défait pas
demande une confirmation. Sens commun aux six métiers : `espace2:favoris:varelo` (étoile → « Épinglés » en tête de Ce
matin), `espace2:suivis:varelo` (cloche → suivi en tête de file). Outils partagés : `components/espace2/varelo/local.ts`.

| Sous-page | Bouton de la référence | Ce qu'il fait | Par quoi |
|---|---|---|---|
| Ce matin | Étoile du fil | Montre ou masque la section « Épinglés » en tête de la page | localStorage `espace2:varelo:epingles-en-tete` |
| Ce matin | « Épinglés » (rangées de « Team resources ») | Les objets et vues épinglés ailleurs, avec un rond pour les retirer | `espace2:favoris:varelo` |
| Ce matin | « + » d'une section | Ouvre la fenêtre de création du sujet : balance générale, livraison, reporting, contrat, balance âgée ; la file de validation pour les décisions | adresse `?nouveau=…` lue par Groupe, Opérations, Contrats, Finance |
| Ce matin | « + » de « Members » | Ouvre la page de l'équipe (inviter) | lien `/espace2/equipe` |
| Contrats | Étoile (liste) | Épingle la vue Contrats dans Ce matin | `espace2:favoris:varelo` |
| Contrats | Étoile (fiche) | Épingle le contrat dans Ce matin | `espace2:favoris:varelo` |
| Contrats | « Show all » du popover Display | Remontre toutes les colonnes | état de la page |
| Contrats | Rond du pied du popover Display | Rétablit colonnes et tri par défaut | état de la page |
| Contrats | « × » d'une rangée « Customers » (contrats du tiers) | Archive ce contrat (G28), avec confirmation | `grp_archiver_contrat` |
| Opérations | Étoile du fil | Épingle la vue Opérations dans Ce matin | `espace2:favoris:varelo` |
| Opérations | Cloche | Ne montre que les cartes suivies (et leur nombre) | `espace2:suivis:varelo` |
| Opérations | Menu d'une carte : « Suivre la carte » | La carte passe en tête de sa colonne, puce « Suivi » | `espace2:suivis:varelo` |
| Opérations | Icône des vues (après les onglets) | Copie le lien de la vue (onglet, société) ; l'adresse `?vue=…&societe=…` la rouvre | presse-papier, adresse |
| Opérations | « Open details » | Ouvre le volet de droite : un clic sur une carte y montre ses champs et ses gestes | état de la page |
| Opérations | « + » d'une colonne, « New issue » | Enregistrer une livraison (G19) ou ajouter un reporting (G16) | fenêtres d'avant |
| Groupe | Cases à cocher | Sélection multiple, barre d'actions : Objectifs… (une société, G14), Exporter en CSV, Épingler dans Ce matin, Effacer | portes d'avant, CSV, `espace2:favoris:varelo` |
| Groupe | Troisième rond (panneau) | Volet des totaux des sociétés affichées ou choisies (ventes, résultat, trésorerie, sous plancher, écart à l'objectif, balance la plus ancienne) | calcul sur les lignes affichées |
| Sources et structure | Interrupteurs des exports attendus | Ouvrent « Brancher » pour choisir les jeux lus ; la demande part à la DSI (G36) | `grp_demander_source` |
| Finance | « Ask Agent » de chaque carte | Copie le résumé chiffré de la carte pour l'assistant | presse-papier |
| Finance | Recherche et téléchargement d'un rapport | Filtrent le rapport et téléchargent ses lignes affichées en CSV (encours, réciproques, caisses) | CSV dans le navigateur |
| Finance | Pied « Customers helped » | Compteur à volets des codes locaux rangés sous un nom du groupe | calcul sur le référentiel |
| Référentiel | « Share » | Copie le lien de la vue ou de la fiche | presse-papier |
| Référentiel | Icônes de l'en-tête (commentaires, aide) | Notes de l'équipe, formation | liens `/espace2/notes`, `/espace2/formation` |
| Référentiel | « … » de l'en-tête | File de validation, Sources et structure, ancien écran | liens |
| Référentiel | « Ask Attio » | Copie pour l'assistant le résumé de la vue ou de la fiche | presse-papier |
| Référentiel | « View settings » | Colonnes affichées (rattachement, codes, sociétés, mise à jour) | état de la page |
| Référentiel | « + » de la colonne Person | Dépôt d'un export (Sources et structure) | lien |
| Référentiel | Cases à cocher | Sélection multiple : Fusionner dans le premier objet (G6 pour chacun, confirmé), Exporter en CSV, Épingler, Effacer | `grp_proposer_fusion`, CSV, `espace2:favoris:varelo` |
| Référentiel | Crayon et étoile de la fiche | Proposer un nom (G5) ; épingler l'objet dans Ce matin | porte d'avant, `espace2:favoris:varelo` |
| Référentiel | « View all values » | Ouvre l'onglet Codes | état de la page |
| Référentiel | « + » d'une section de la fiche | Proposer une correction (nom du groupe, G5) | porte d'avant |

Restent sans équivalent, parce qu'ils ne sont pas des boutons de la page copiée : la barre latérale du SaaS (remplacée
par la navigation de l'espace), le badge « Syncing » de Plain (un état de chargement), les poignées de redimensionnement
des colonnes de Plain, la barre « Agent » et l'aide « ? » flottante de Linear (hors de la carte).

Superpositions refaites après ces ajouts (1440, sombre / clair) : Ce matin 7,4 / 7,2 ; Contrats liste 6,7 / 5,6, fiche
12,2 / 10,9 ; Opérations 12,9 / 13,8 ; Groupe 4,8 / 5,1 ; Sources 48,8 / 9,6 ; Finance 8,6 / 8,3 ; Référentiel liste
14,0 / 13,9, fiche 8,8 / 9,3. Gestes essayés au navigateur (Playwright) : épingler (seul et en groupe) puis retrouver
dans Ce matin, suivre une carte, volet de détails, `?nouveau=1`, fusion groupée confirmée, export CSV d'un rapport,
copie pour l'assistant.
