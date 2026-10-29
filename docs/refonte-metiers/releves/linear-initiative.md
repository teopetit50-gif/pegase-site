# Relevé — Linear, page d'une initiative (Overview · Projects · Activity + volet de détails)

URL : https://linear.app/omegaaii/initiative/residence-les-tilleuls-c37131c236b4/overview (puis `/projects`, `/activity`). Relevé le 29/10/2026 au `getComputedStyle`, fenêtre 1440×900 (px CSS), thème clair. Rien modifié ; le volet « Initiative details » a été ouvert puis refermé avec le même bouton.

Notation : `fs/fw/lh` taille/graisse/interligne, `ls` interlettrage, `c` couleur, `bg` fond, `bd` bordure, `r` rayon, `p` padding. Coordonnées x,y = coin haut-gauche dans la fenêtre.

> Piège de mesure : le titre, le résumé et la description sont des éditeurs riches (ProseMirror) qui ne s'affichent qu'après le premier rendu visible. Avant, la page est 78px plus courte (à 390) et le titre est absent. Mesures ci-dessous prises **après** rendu complet.

## Police

Inter Variable seule (`"Inter Variable", "SF Pro Display", -apple-system, system-ui, …`). Graisses : 400 (rare), 450 (texte courant, dates, colonnes), 500 (fil d'Ariane, onglets, pilules, titres de section, noms de projet), 600 (titre de l'initiative, auteur dans le fil d'activité seulement 500).

## Couleurs (lch → hex)

| Rôle | lch | hex |
|---|---|---|
| Texte primaire (titre, nom de projet, onglet actif) | lch(9.794 0 282) | #1b1b1b |
| Texte secondaire (fil d'Ariane, pilules, corps) | lch(19.588 1.25 282) | #2f2f31 |
| Texte tertiaire (titres de section, en-têtes de colonne, dates, icônes) | lch(39.176 1.25 282) | #5c5c5e |
| Texte quaternaire / icônes vides (« Add document… », santé vide) | lch(64.64 1.25 282) | #9c9d9f |
| Fond de carte principale | lch(97.94 0.5 282) | #f9f9fa |
| Bordure carte principale, filet bas d'en-tête | lch(89.84 0 282) | #e2e2e2 |
| Bordure carte « Latest update », ligne du « Today » de timeline | lch(84.44 0 282) | #d3d3d3 |
| Filet de groupe (In Progress / Planned) | lch(88.49 0 282) | #dedede |
| Onglet actif (fond) | lch(93.483 0.5 282) | #ececed |
| Onglet inactif (fond) / boutons ronds « pleins » | lch(99.997 0.5 282) | #ffffff |
| Onglet survolé | lch(94.854 0.5 282) | #f0f0f1 |
| Pilule de propriété survolée | lch(92.44 0.5 282) | #e9e9ea |
| Survol de ligne de tableau (`::before`) | lch(94.44 0.5 282) | #efeff0 |
| Cartes blanches (volet détails, composer) | lch(100 0 282), bd lch(91.9 0 282) | #ffffff, #e8e8e8 |
| Santé « On track » (vert) | lch(60 64.37 141.95) | #27a644 |
| Statut « Active » / icône de progression (jaune) | lch(80 90 85) | #f0bf00 |
| Accent (ligne et pastille « aujourd'hui ») | lch(53 52.26 286.91) | #6d78d5 |
| Icône initiative (bleu) | rgb(38,181,206) ; fond de la tuile lch(67.5 38.933 217.444 / .125) | #26b5ce à 12,5 % |
| Ombre standard des cartes | `lch(0 0 0/.02) 0 3px 6px -2px, lch(0 0 0/.04) 0 1px 1px 0` | — |

## Structure — onglet Overview (1440×900)

```
MAIN 244,8  1188×856 — bg #f9f9fa · bd 0.5px #e2e2e2 · r 12px · ombre standard · flex col
├─ HEADER 1187×87.5 (flex col, gap 12px)
│  ├─ barre 1 : 1187×44, p 0 8px, filet bas 0.5px #e2e2e2
│  │   ├─ « Initiatives » a 68×24 r 8px p 0 5px 0 4px → 13px/500 #2f2f31 @263,23
│  │   ├─ « › » 13px/500 #5c5c5e
│  │   ├─ a 168×28 r 6px p 2px 4px (m −2px −4px) → h2 : icône 16×16 (#26b5ce) + « Résidence Les Tilleuls » 13px/500 #2f2f31
│  │   ├─ étoile (Add to favorites) + « … » (Initiative actions) : boutons ronds 28×28 @511 et 543
│  │   └─ à droite : Copy page URL 24×24 @1336 · Notifications 28×28 @1364 · Add project « + » 28×28 @1396 (gap 4px)
│  └─ barre 2 (onglets) : y 60, h 28
│      ├─ Overview a 75.5×28 · Activity 64.6×28 · Projects 67.8×28 (gap 4px, @253 / 332 / 401)
│      │   r 9999px · p 0 10px · bd 0.5px transparent · libellé 12px/500
│      ├─ « Add new view » (icône calques) 28×28 @472, icône #9c9d9f
│      └─ à droite @1396,60 : « Open Initiative details » 28×28 bg #fff (sur Projects : + Add filter @1328 et Display options @1362)
└─ ZONE DÉFILANTE 244.5,96  1187×767.5 — p 0 48px ; contenu centré
    Colonne de texte : x 436 → largeur 805 (centrée dans 1091)
    ├─ TUILE ICÔNE 436,160  36×36 r 6px bg #26b5ce à 12,5 % p 0 8px → icône 24×24
    ├─ TITRE p 436,208  805×32 : 24px / 600 / 32px · ls −0.16px · #1b1b1b (marge haute 12px)
    ├─ RÉSUMÉ p 436,244  805×23 : 15px / 450 / 23px · ls −0.1px · #2f2f31 (bloc p 4px 0)
    ├─ PROPERTIES (y 287) : h3 « Properties » 65.5×28 13px/500 #5c5c5e p 6px 0, puis pilules à x 517
    │    Active 75×28 · No priority 102×28 · Owner 79×28 · Mar 31st, 2027 128×28 · « … » 28×28   (gap 4px)
    │    pilule : r 9999px · p 3px 6px · pas de fond ni bordure au repos · icône 16×16 (avatar 18) · libellé 13px/500 #2f2f31, gap icône-texte 8px
    ├─ RESOURCES (y 327) : h3 identique + pilule « Add document or link… » 177×28, texte et icône #9c9d9f
    ├─ CARTE « LATEST UPDATE » 420,371  837×194 — bg #f9f9fa · bd 0.5px #d3d3d3 · r 10px · p 8px 16px 16px
    │    (la carte déborde de 16px de chaque côté de la colonne : 420 = 436 − 16)
    │    ├─ h3 « Latest update » 13px/500 #5c5c5e p 6px 0 ; à droite bouton « Update » 84×28 r 9999 p 0 10px 0 8px, icône 14 + 13px/500 #5c5c5e
    │    └─ bloc 804×141 flex col p 4px 0 0
    │        ├─ ligne méta (y 420) : santé « On track » (icône 16 + 13px/450 #27a644, gap 8px) · avatar 18×18 rond · « Wizyy » 13px/450 #5c5c5e · « just now » 13px/450 #5c5c5e (title = date complète) ; « … » rond 32×32 à droite
    │        ├─ texte p 803×48 : 15px / 450 / 24px · ls −0.1px · #2f2f31 (marge haute ≈ 20px)
    │        └─ actions (y 520) : commentaires 37×28 bg #fff r 30px p 5px 10px (icône bulle 16) + réaction 28×28 rond
    ├─ DESCRIPTION 420,577  837×147.5 — r 12px p 10px 16px 0 (pas de bordure)
    │    h3 « Description » 13px/500 #5c5c5e ; éditeur p 15px / 450 / 24px · ls −0.1px · #2f2f31 (zone éditable p 16px 14px, m 0 −14px)
    └─ PROJECTS (y ≈ 817 ; section 963 de large à x 356.5, p-bas 40px)
        ├─ h3 « Projects » 901×34 · 18px / 500 · #2f2f31 · p 6px 0 ; à droite Display options + « + » 28×28 bg #fff (gap 6px)
        └─ TABLEAU (grille) 327,856  1001 de large (m-gauche −28px), 1 ligne d'en-tête + groupes
            grid-template-columns : [indent] 0 [checkbox] 18px [title] 589px [health] 50px [priority] 68px
                                    [lead] 48px [targetDate] 100px [status] 68px [end-padding] 12px ; column-gap 6px
            (les lignes sont en subgrid sur toutes les colonnes)
            ├─ en-tête 1001×32 : boutons de tri 24px de haut r 9999 p 0 6px gap 2px
            │    « Name » / « Health » / « Priority » / « Target date » / « Status » : 12px/450 #5c5c5e + flèche 12×12 ;
            │    « Lead » simple span (pas de tri) p-droite 12px ; tri actif = Priority (flèche ↓ visible)
            ├─ GROUPE 1001×32 r 8px : chevron « Collapse group » 20×20 rond (icône 16, fill #d3d3d3) @x 327
            │    · h3 « In Progress » 11px / 450 / normal #5c5c5e · filet horizontal 0.5px #dedede qui remplit le reste
            │    · bouton « + » (Create new project) 28×28 sur un pavé 32×28 bg #f9f9fa à droite
            └─ LIGNE PROJET a 1001×36 r 8px (fond via `::before` inset 0 r 8px)
                 case à cocher 14×14 bd 1px #7c7c7c r 3px (invisible sauf survol) · icône projet 22×22 (svg 16) ·
                 nom 13px / 500 #1b1b1b · Health : bouton rond 28 icône vide #9c9d9f ·
                 Priority : pilule 28×28 « … » · Lead : avatar vide 16 · Target date : pilule (icône calendrier 16 + « Jan 15th, 2027 » 12px/450 #2f2f31) ·
                 Status : pilule 56×28 → anneau hexagonal de progression 16×16 (trait 1.5px couleur du statut) + « 0% » 12px / 450 #2f2f31
```

Repère de lecture à gauche (table des matières) : 3 traits horizontaux à x 249 : actif 8×2 #2f2f31, autres 8×1 #9c9d9f, pas de 12px.

## Volet de détails (bouton « Open Initiative details »)

- Ouverture : la zone centrale passe de 1187 à **787px**, le volet `aside` fait **400×767.5** à x 1031.5 (p-gauche 4px), sans bordure ni fond propres. La colonne de texte rétrécit à 691px (x 292.5) ; le tableau passe à 729px (colonne title 317px, les autres inchangées).
- Bouton : `aria-label` devient « Close Initiative details », `aria-expanded=true`, fond lch(94.854 0.157 282) #f0f0f0 (survol #f3f3f3).
- Contenu : 2 cartes empilées, gap 8px, x 1036, largeur 388 :
  - carte : bg #fff · bd 0.5px #e8e8e8 · r 10px · p 12px · ombre standard
  - en-tête repliable « Properties » 13px/500 lch(40 1 282) #5e5e60 + chevron 16, ligne 28px r 8px p 0 8px gap 3px
  - 5 lignes de 36px : libellé à x 1048 (12px/450 #5e5e60 : Status, Priority, Owner, Target date, Labels) ; valeur en pilule à x 1138 (28px r 9999 p 3px 6px, 12px/450 lch(10 0 282) #1b1b1b ; vide = #5e5e60 « Add owner », « Add label »)
  - carte « Activity » 388×99 : en-tête + lien « See all » 12px/450 #5e5e60 à droite ; événements : icône 16 + texte 12px / 450 / 16.8px #5e5e60, auteur 12px/500 lch(20 1 282) #303032, « · » puis date « Oct 29 ».

## Onglet Projects (timeline)

- En-tête : comme Overview, onglet « Projects » actif (#ececed, texte #1b1b1b), + boutons Add filter / Display options 28×28 bg #fff.
- Corps : **timeline** horizontale.
  - Liste à gauche 320px (x 245) bg #f9f9fa, séparateur vertical 0.5px #d3d3d3 à x 565 ; lignes **72px** ; chaque ligne : poignée 6×10 (#9c9d9f), icône 28×28 r 8 p 6, nom 13px/500 #2f2f31 tronqué, puis santé / statut / priorité / lead en boutons ronds 28×28 (gap 6).
  - Règle du haut : mois 11px/500 #5c5c5e (« Jan 2026 » avec année), graduations 1×2 r 2 #d3d3d3 ; jours (1, 15, 29…) 11px/500 #9c9d9f sur graduations 1×3 tous les 17.5px.
  - Aujourd'hui : trait vertical 1px accent lch(53 52.26 286.91) + pastille « Oct 29 » 11px/500 blanc, bg accent, r 8px, p 1px 4px.
  - Barre projet : `div` absolu 24px de haut, bg lch(100 0.5 282) #fff, bd 0.5px #d3d3d3, **r 6px**, ombre standard ; libellé du projet 13px/500 #2f2f31 **au-dessus** de la barre (16px de haut, 4px d'écart).
  - Boutons flottants en haut à droite : « Today » 52×24 et « Year ▾ » 57×24 (bg #fff r 9999 p 0 8px 12px/500), sur un dégradé de fond vers la gauche.
  - Barre de défilement horizontale en bas : 676×9 r 12px bg #9d9da0.

## Onglet Activity

- Colonne : x 432, largeur 813.
- **Composer** 813×172 : bg #fff · bd 0.5px #e8e8e8 · r 10px.
  - Sélecteur segmenté en haut à gauche (444,153) 130×25 : bg #fff bd 0.5px #e8e8e8 r 9999 ombre standard ; segment actif « Comment » 72×24 bg lch(95.543 0 282) #f2f2f2 r 9999 p 0 8px, ombre `#e8e8e8 0 0 0 0.5px` + standard, 12px / 500 / 18px #303032 ; inactif « Update » #5e5e60.
  - Zone de saisie p 4px 16px, min-height 70px, 15px / 450 / 24px ls −0.1px (aucun texte indicatif affiché).
  - Pied 52px p 12px 14px 12px 12px : trombone 28×28 rond + bouton « Comment » 73×24 bg #fff r 9999 p 0 8px 12px/500.
- Carte d'update 813×165 à y 336 (24px sous le composer) : mêmes styles que « Latest update » (bg #f9f9fa, bd 0.5px #d3d3d3, r 10px, p 12px 16px 16px) ; date affichée « Oct 29 ».
- Événements dessous : icône 16 à x 448 + « Wizyy created the initiative · Oct 29 » 12px / 450 / 16.8px #5c5c5e (auteur 500), p 4px.

## Tableau des mesures (motifs regroupés)

| Élément | Nb | x,y | L×H | Typo | Couleur | Fond / bordure / rayon / padding |
|---|---|---|---|---|---|---|
| Carte principale (main) | 1 | 244,8 | 1188×856 | — | — | bg #f9f9fa · bd 0.5px #e2e2e2 · r 12px · ombre standard |
| Barre fil d'Ariane | 1 | 245,9 | 1187×44 | 13px/500 | #2f2f31 (› #5c5c5e) | filet bas 0.5px #e2e2e2 · p 0 8px |
| Bouton rond d'en-tête | 6–9 | — | 28×28 (Copy URL 24×24) | 12px/500 | icône 14 fill #5c5c5e | bd 0.5px transparent · r 9999 · p 0 2px |
| Onglet (Overview/Activity/Projects) | 3 | 253,60 | 75/65/68×28 | 12px/500 | actif #1b1b1b, inactif #5c5c5e | r 9999 · p 0 10px · bg actif #ececed / inactif #fff |
| Tuile icône initiative | 1 | 436,160 | 36×36 | — | #26b5ce | r 6px · bg bleu 12,5 % |
| Titre initiative | 1 | 436,208 | 805×32 | 24px/600/32px ls −0.16px | #1b1b1b | — |
| Résumé | 1 | 436,244 | 805×23 | 15px/450/23px ls −0.1px | #2f2f31 | — |
| Libellé de rangée (Properties, Resources…) | 4 | 436 | 65.5×28 | 13px/500 | #5c5c5e | p 6px 0 |
| Pilule de propriété | 5 | 517,287 | 75–128×28 | 13px/500 | #2f2f31 | r 9999 · p 3px 6px · gap 8px |
| Carte Latest update | 1 | 420,371 | 837×194 | — | — | bg #f9f9fa · bd 0.5px #d3d3d3 · r 10px · p 8px 16px 16px |
| Santé « On track » | 1 | 437,420 | 76.5×16 | 13px/450 | #27a644 | gap 8px |
| Texte d'update / description | 2 | 436 | 805×48 | 15px/450/24px ls −0.1px | #2f2f31 | — |
| Bouton commentaires | 1 | 437,520 | 37×28 | 12px/450 | #5c5c5e | bg #fff · r 30px · p 5px 10px |
| Titre « Projects » | 1 | 357,817 | 901×34 | 18px/500 | #2f2f31 | p 6px 0 |
| En-tête de colonne | 6 | y 861 | 24 haut | 12px/450 | #5c5c5e | r 9999 · p 0 6px · gap 2px |
| Ligne de groupe | 2 | 327 | 1001×32 | 11px/450 | #5c5c5e | filet 0.5px #dedede |
| Ligne projet | 3 | 327 | 1001×36 | 13px/500 | #1b1b1b | r 8px · survol `::before` #efeff0 |
| Pilule « 0% » (status) | 3 | 1242 | 56×28 | 12px/450 | #2f2f31 | r 9999 · p 3px 6px |
| Carte volet détails | 2 | 1036,96 | 388×225 / 99 | 12–13px | #5e5e60 / #1b1b1b | bg #fff · bd 0.5px #e8e8e8 · r 10px · p 12px · ombre |

## États

- **Onglet** : actif bg #ececed + texte #1b1b1b ; survol bg lch(94.854 0.5 282) #f0f0f1 + texte #2f2f31 ; repos bg #fff + texte #5c5c5e.
- **Pilule de propriété** (survol) : bg lch(92.44 0.5 282) #e9e9ea, texte → #1b1b1b.
- **Ligne de projet** (survol) : règle `@media (any-hover:hover) and (any-pointer:fine) { .row[data-apply-background=true]:hover { --bg: var(--row-highlighted-bg) } }` → `::before` lch(94.44 0.5 282) #efeff0 ; la case à cocher 14×14 apparaît.
- **Bouton rond** (survol) : bg lch(95.883 0.157 282) #f3f3f3 ; enfoncé/ouvert : #f0f0f0.
- Tri actif : en-tête « Priority » avec flèche ↓.

## À 390×844 (rechargé)

- **Plus de carte flottante** : `main` 390×844 plein écran, sans bordure ni rayon ; bouton « Menu » 32×32 à gauche du fil d'Ariane. Fil tronqué (« Ini… », « Résidence Le… »).
- Boutons ronds 32×32 (Copy URL 28×28), onglets 32px de haut (largeurs identiques).
- Zone défilante p 0 40px → colonne 310px à x 40. Titre 24px/600 inchangé (1 ligne), résumé sur 2 lignes (46px).
- Pilules de propriétés sur **2 lignes** (la date passe dessous).
- Carte « Latest update » 334px (x 28), p 8px 12px 12px ; l'en-tête devient un bouton repliable « Latest update ▾ » (p 6px 8px, gap 4px) ; « Update » devient icône seule 32×32 ; le bloc interne prend p 12px 8px ; texte 292px de large (5 lignes).
- Tableau Projects : colonnes réduites à `[indent] 2px [title] 210px [health] 50px [status] 28px [end-padding] 12px` (Priority, Lead, Target date masquées ; Status = anneau seul sans « 0% »), m-gauche −6px, lignes 326×36.
- **Onglet Projects** : la timeline disparaît, remplacée par une **liste** pleine largeur : lignes 390×48, grille `[indent] 8px [title] 272px [health] 50px [status] 28px [end-padding] 8px`, gap 6px.
- **Onglet Activity** : composer et carte d'update 358px de large (marges 16px).

## Capture (décrite)

1. Grande carte gris très clair aux coins arrondis ; en haut le fil « Initiatives › (icône) Résidence Les Tilleuls », puis trois onglets-pilules, Overview grisé.
2. Au centre, colonne étroite : tuile d'icône bleu pâle, titre 24px gras, résumé gris, rangées « Properties » (pastille jaune Active, No priority, Owner, date) et « Resources ».
3. Carte bordée « Latest update » : vert « On track », avatar, auteur, date, paragraphe en 15px, deux petits boutons ronds.
4. « Description » sans cadre, puis « Projects » en 18px et un tableau large sans bordures : en-têtes gris 12px, groupes « In Progress » / « Planned » en 11px suivis d'un filet, lignes de 36px avec icône, nom, pastilles et « 0% ».
