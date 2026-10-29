# Relevé — Linear, Settings › Integrations (catalogue + page d'une intégration)

URL : https://linear.app/omegaaii/settings/integrations puis clic sur la carte GitHub → https://linear.app/omegaaii/settings/integrations/github (retour par le bouton précédent du navigateur). Relevé le 29/10/2026 au `getComputedStyle`, fenêtre 1440×900 (px CSS), thème clair. Rien activé (« Enable » non cliqué).

Notation : `fs/fw/lh` taille/graisse/interligne, `ls` interlettrage, `tt` text-transform, `c` couleur, `bg` fond, `bd` bordure, `r` rayon, `p` padding.

## Police

Inter Variable seule. Graisses : 400 (champ de recherche, paragraphe « Overview »), 450 (descriptions), 500 (titre de page, noms de carte, sur-titres de section, boutons), 600 (noms dans le carrousel « Essentials »).

## Couleurs (lch → hex)

| Rôle | lch | hex |
|---|---|---|
| Texte primaire (titre, nom d'intégration) | lch(9.794 0 282) / lch(10 0 282) | #1b1b1b |
| Texte secondaire (descriptions de carte, « View more ») | lch(40 1 282) | #5e5e60 |
| Sous-titre de page, sur-titres de section, texte indicatif de recherche | lch(39.176 1.25 282) | #5c5c5e |
| Barre latérale réglages (libellés, icônes) | lch(37.776 1.25 282) | #59595b |
| Élément de barre latérale actif (fond / texte) | lch(89.54 0.5 282) / lch(9.444 0 282) | #e1e1e2 / #1a1a1a |
| Fond de la carte principale | lch(97.94 0.5 282) | #f9f9fa |
| Carte d'intégration (repos / survol) | lch(100 0 282) / lch(96.5 0 282) | #ffffff / #f5f5f5 |
| Anneau de carte (ombre 0.5px), séparateurs de lignes | lch(0 0 0 / 0.088) | noir à 8,8 % |
| Bordure du champ de recherche | lch(84.44 0 282) | #d3d3d3 |
| Bordure du carrousel | lch(89.84 0 282) | #e2e2e2 |
| Pavé « Show all » | lch(94.5 0 282) | #efefef |
| Chevron de liste (390) | lch(66 1 282) | #a0a0a2 |
| Bouton primaire « Enable » (fond / texte) | lch(53 52.26 286.91) / lch(100 5 286.91) | #6d78d5 / blanc |
| Lien dans le texte (« Diffs ») | lch(45 70 286.91) | #4363dc |
| Interrupteur off / on | lch(82.484 0.054 281.8) / lch(53 52.26 286.91) | #cdcdcd / #6d78d5 |
| Ombre standard | `lch(0 0 0/.02) 0 3px 6px -2px, lch(0 0 0/.04) 0 1px 1px 0` | — |

## Structure — catalogue (1440×900)

```
NAV réglages 0,0  244×900 (hors carte)
├─ « Back to app » a 112×28 @16,16 : r 9999 · p 0 12px 0 6px · icône 14 + 13px/500 #59595b
├─ recherche input[search] 220×28 @12,57 : bg #fff · bd 0.5px #e2e2e2 · r 8px · p 6px 25px 6px 32px · ombre standard (loupe 16 @22,63)
└─ liste défilante p 26px 12px 4px (dégradé haut 40px #efeff0 → transparent)
    ├─ titres de groupe h2 (Personal, Issues, Projects, Features, Integrations, Administration, Your teams) : 13px/500 #59595b, p-gauche 10px, gap 8px
    └─ lien 220×28 r 8px p-gauche 10px : icône 16 + span 194×28 (p 0 9px 0 6px) 13px/500 #59595b ; pas de 29px
        actif « All integrations » : bg #e1e1e2, texte #1a1a1a

MAIN 244,8  1188×856 — bg #f9f9fa · bd 0.5px #e2e2e2 · r 12px · ombre standard ; zone défilante 1187×855 (contenu 7915px de haut)
└─ COLONNE 640px max, centrée (x 518), flex col
    ├─ EN-TÊTE 640×58, p 0 16px, marge basse 32px, gap 4px
    │    « Integrations » 24px / 500 / 32px · ls −0.16px · #1b1b1b
    │    « Enhance your Linear experience… » 13px / 450 / 22px · #5c5c5e
    ├─ RECHERCHE (section, marge basse 48px) 640×44 @518,175 : bd 1px #d3d3d3 · r 8px · pas de fond
    │    input 638×42 p 12px 12px 12px 40px · 15px/400 #1b1b1b · placeholder « Search integrations » #5c5c5e ; loupe 16×16 @535,189 fill #5c5c5e
    ├─ CARROUSEL « ESSENTIALS » (section, marge basse 48px)
    │    ├─ tabpanel 640×384 (aspect-ratio 640/384) @518,267 : bd 0.5px #e2e2e2 · r 6px · overflow hidden ; tout le panneau est un lien
    │    │    ├─ image plein cadre object-fit cover (1500×960)
    │    │    ├─ copie de l'image en bas (120px, absolue, object-position 0 100 %, filter blur(20px)) → bandeau flou
    │    │    ├─ pastille « ESSENTIALS » @535,283 : 11px / 500 / 16.5px tt uppercase #1b1b1b · bg #fff · r 8px · p 2.5px 5px 2px · ombre standard
    │    │    └─ pied absolu bottom 0, 639×88, p 16px, flex gap 12px :
    │    │         logo 56×56 r 6px (ombre `0 6px 18px /.02, 0 3px 9px /.04, 0 1px 1px /.04`)
    │    │         nom « Slack » 15px / 600 / 23px + description 15px / 450 / 23px (#1b1b1b) ; flèche 16×16 à droite
    │    └─ onglets sous le panneau (y 668, gap 8px, défilent horizontalement) : bouton 27px de haut r 6px p 2px 16px gap 8px,
    │         logo 16×16 + nom 15px / 600 / 23px #1b1b1b ; actif opacité 1, inactifs **opacité 0.6** ;
    │         flèches « Scroll left / right » 28×28 rondes @1102 et 1130
    └─ SECTIONS DE CATÉGORIE (12 : Essentials, Agents, AI clients, Engineering, Linear crafted, Bug Reporting,
        Automations, Customer Experience, Collaboration, Media & Design, Analytics, Security & Compliance)
        section 640×545, marge basse 48px (pas de 593px entre sections)
        ├─ h3 624×13, p-gauche 16px : 11px / 500 / normal · tt uppercase · #5c5c5e
        └─ UL grille 3 colonnes `202.664px 202.664px 202.672px`, gap 16px, marge haute 16px
            └─ CARTE li 202.7×**156** (hauteur fixe)
                 div bg #fff · r 8px · p 16px · ombre `lch(0 0 0/.088) 0 0 0 0.5px` + ombre standard (pas de border) · transition all
                 lien a absolu couvrant toute la carte (r 8px)
                 contenu flex col gap 12px :
                   ├─ ligne 170.7×36, flex gap 8px : logo 36×36 r 6px + nom 13px / 500 / normal #1b1b1b (centré verticalement, y +10)
                   └─ description 12px / 450 / normal #5e5e60, **line-clamp 4**, overflow hidden
            9e case (sections à 9 éléments) = carte « View all » : même boîte (flex col gap 8px) contenant
                 une mosaïque de logos 36×36 r 6px (4 par ligne, pas ≈ 44px) et un pavé « Show all » 83×36 bg #efefef r 8px,
                 texte 12px/500 #5e5e60
```

Aucun badge (« Installed », « Beta »…) sur les cartes de ce compte. Aucun filtre en dehors du champ de recherche.

## Page d'une intégration (GitHub)

```
MAIN identique ; bandeau haut 1187×80 en dégradé `linear-gradient(#f9f9fa 40px, transparent 80px)` (en-tête collant)
├─ retour « ‹ Integrations » a 111×28 @253,19 : r 9999 · p 0 8px · bd 0.5px transparent · icône 14 + 13px/500 #5c5c5e (gap 6px)
└─ COLONNE 640 à x 518
    ├─ EN-TÊTE @y 85 : logo 48×48 r 8px **bd 1px lch(88.49) #dedede** ; à x 582 :
    │    h2 « GitHub » 18px / 500 #1b1b1b ; p description 15px / 450 / 23px #5c5c5e (2 lignes, 576 de large)
    ├─ CARTE INFO section 640×425 @y 189 : bg #fff · bd 0.5px #e8e8e8 · r 10px (contenu à 16px du bord)
    │    ├─ méta : « BUILT BY » / « DOCS » 11px / 500 / 16.5px uppercase #5e5e60 ; valeurs « Linear », « Docs » 13px / 500 / 19.5px #303032 + icône 12 (gap 4) ; colonnes à x 535 et 620
    │    ├─ bouton « Enable » 91×32 à droite : bg #6d78d5 · texte blanc 13px/500 · r 9999 · p 0 12px · ombre standard · icône 16
    │    ├─ galerie de captures (y 256) : figures 299.5×191.7 r 6px, gap 8px, défilement horizontal ; flèches latérales 20×192 (chevron 6×22 #d8d8d8)
    │    ├─ h2 « Overview » 15px / 500 / 18.75px #1b1b1b
    │    ├─ p 15px / **400** / 25.5px #5e5e60 (lien « Diffs » #4363dc)
    │    └─ « Read more » 15px/400 #a0a0a2
    ├─ SECTION « Connections » : h3 15px / 500 / 23px #1b1b1b (x 534) + bouton « Connect organization » 140×24 bg #fff r 9999 p 0 8px 12px/500 #2f2f31 à droite
    │    carte liste 640×60 : bg #fff · r 10px · ombre anneau 0.5px /.088 + standard ; ligne p 16px flex gap 12px, « No organizations connected » 13px/450 #5e5e60
    └─ SECTION « Reviews & commits » : h3 15px/500/23px + sous-titre 13px / 450 / 22px #5c5c5e (gap ≈ 2px), carte 16px plus bas
         carte liste : lignes p 16px, flex gap 12px ; 1re ligne r 10 10 0 0, dernière r 0 0 10 10
         séparateur = `li::after` absolu, left 16px right 16px bottom 0, **bd-bas 0.5px lch(0 0 0/.088)**
         titre d'option 13px / 500 #1b1b1b ; aide 12px / 450 #5e5e60 ; à droite pilule « Available on Basic » 137×32 r 9999 p 0 12px 13px/500 #303032
         interrupteur : input 30×20 appearance none, r 72px, off #cdcdcd / on #6d78d5, pastille `::after` 14×14 blanche ;
         (opacité 0.5 tant que l'intégration n'est pas activée)
```

## Tableau des mesures (motifs regroupés)

| Élément | Nb | x,y | L×H | Typo | Couleur | Fond / bordure / rayon / padding |
|---|---|---|---|---|---|---|
| Colonne de contenu | 1 | 518 | 640 | — | — | max-width 640, centrée |
| Titre de page | 1 | 534,73 | 608×32 | 24px/500/32px ls −0.16px | #1b1b1b | p 0 16px |
| Sous-titre | 1 | 534,109 | 608×22 | 13px/450/22px | #5c5c5e | — |
| Champ de recherche | 1 | 518,175 | 640×44 | 15px/400 | #1b1b1b, ph #5c5c5e | bd 1px #d3d3d3 · r 8px · p 12px 12px 12px 40px |
| Carrousel | 1 | 518,267 | 640×384 | 15px/600 + 15px/450 | #1b1b1b | bd 0.5px #e2e2e2 · r 6px |
| Pastille « ESSENTIALS » | 1 | 535,283 | 77×21 | 11px/500 uppercase | #1b1b1b | bg #fff · r 8px · p 2.5px 5px 2px · ombre |
| Onglet du carrousel | 8 | y 668 | 83–208×27 | 15px/600/23px | #1b1b1b (op .6 inactif) | r 6px · p 2px 16px · gap 8px |
| Sur-titre de section | 12 | 534 | 624×13 | 11px/500 uppercase | #5c5c5e | p-gauche 16px |
| Grille | 12 | 518 | 640 | — | — | 3 col. × 202.7px · gap 16px |
| Carte | ~100 | — | 202.7×156 | — | — | bg #fff · r 8px · p 16px · anneau 0.5px /.088 + ombre |
| Logo de carte | — | +16,+16 | 36×36 | — | — | r 6px |
| Nom de carte | — | +60,+26 | auto×15.5 | 13px/500 | #1b1b1b | — |
| Description de carte | — | +16,+64 | 170.7×≤58 | 12px/450 | #5e5e60 | line-clamp 4 |
| « Show all » | 11 | — | 83×36 | 12px/500 | #5e5e60 | bg #efefef · r 8px |
| Lien barre latérale | ~30 | 12 | 220×28 | 13px/500 | #59595b | r 8px · actif bg #e1e1e2 |
| Logo page détail | 1 | 518,85 | 48×48 | — | — | bd 1px #dedede · r 8px |
| Bouton « Enable » | 1 | 1051,207 | 91×32 | 13px/500 | blanc | bg #6d78d5 · r 9999 · p 0 12px |
| Carte liste de réglages | 3+ | 518 | 640×(60/ligne mini) | 13/12px | #1b1b1b / #5e5e60 | bg #fff · r 10px · anneau + ombre · séparateur 0.5px inset 16px |
| Interrupteur | n | — | 30×20 | — | — | r 72px · off #cdcdcd · on #6d78d5 · pastille 14×14 |

## États

- **Carte (survol)** : fond #fff → lch(96.5 0 282) #f5f5f5 ; ombre et taille inchangées (pas d'élévation, pas de transform). `transition: all`.
- **Onglet du carrousel** : sélectionné `aria-selected=true` opacité 1 ; les autres opacité 0.6 (même couleur).
- **Barre latérale** : actif bg #e1e1e2, texte #1a1a1a, libellé 500.
- **Interrupteur** : off #cdcdcd, on accent #6d78d5 ; désactivé = opacité 0.5.

## À 390×844 (rechargé)

- Plus de barre latérale ni de carte flottante : `main` plein écran, `header` 390×43.5 (p 0 15px, filet bas 0.5px #e2e2e2) avec bouton Menu 32×32 et lien « ‹ Settings » 15px/600/23px.
- Colonne 346px à x 22 (marges 22px) ; titre 24px/500 à x 38 ; sous-titre 13px / 450 / **18px** sur 2 lignes.
- Recherche 346×44 identique.
- **Le carrousel disparaît** : remplacé par une section « Essentials » en liste.
- **La grille de cartes devient une liste** : section blanche r 10px, lignes 346×**68** (p 16px 10.67px), logo 36×36 r 6px + nom 13px/500 #1b1b1b à x 77, **description masquée**, chevron 16×16 #a0a0a2 à droite ; séparateurs `::after` 0.5px lch(0 0 0/.088) inset 16px. Les 3 premiers éléments sont affichés puis une ligne bouton « View 5 more » 60px de haut, 13px/450 #5e5e60 centré. Sections espacées de 48px, sur-titre à 29px au-dessus de la liste.

## Capture (décrite)

1. À gauche, la barre de réglages grise avec « Back to app », un champ de recherche blanc et les groupes de liens ; « All integrations » surligné.
2. Au centre d'une grande carte gris très clair, une colonne étroite de 640px : « Integrations » en 24px, une phrase grise, un long champ de recherche bordé.
3. Un grand visuel 640×384 aux coins à peine arrondis, pastille blanche « ESSENTIALS » en haut à gauche, et en bas, sur un bandeau flouté, le logo Slack, son nom en gras et sa phrase ; sous le visuel, une rangée de noms d'intégrations avec petits logos, l'actif plein, les autres atténués.
4. Puis des sections en petites capitales grises (ESSENTIALS, AGENTS…) suivies de grilles de 3 cartes blanches de 156px : logo carré arrondi, nom en 13px, description grise sur 4 lignes max ; la dernière carte de chaque section est une mosaïque de logos avec un pavé « Show all ».
