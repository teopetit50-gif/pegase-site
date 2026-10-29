# Relevé — Linear, réglages « Issue labels » et « Issue templates »

URLs : https://linear.app/omegaaii/settings/issue-labels et https://linear.app/omegaaii/settings/issue-templates — relevé le 29/10/2026 au `getComputedStyle`, fenêtre 1440×900 (px CSS), thème clair. Rien créé ni modifié (aucun clic sur New label / New group / +).

Notation : `fs/fw/lh` taille/graisse/interligne, `ls` interlettrage, `c` couleur, `bg` fond, `bd` bordure, `r` rayon, `p` padding.

## Police

Inter Variable seule (SIL OFL). Titres de page 24px/500 (et non 600 comme le titre d'issue).

## Cadre commun aux réglages

- Barre latérale des réglages (« Back to app », Personal, Issues, Projects, Features…) : **244px**, non relevée.
- `main` 244,8 → carte 245,9 **1187×855** : bg #f9f9fa (lch 97.94 0.5 282) · bd 0.5px #e2e2e2 · r 12px · ombre `lch(0 0 0/.02) 0 3px 6px -2px, lch(0 0 0/.04) 0 1px 1px 0`.
- Bande vide de **64px** en haut de la carte (245,9 1187×64), le titre commence à y 73.

---

## A. Issue labels (page « tableau pleine largeur »)

### Structure

```
carte 1187 de large, colonne utile x 301 → 1376 (marges 56px)
├─ bande vide 64px
├─ ligne titre  245,73  1187×45  p 0 56px 12px · flex gap 12px · filet bas 0.5px #e2e2e2
│   ├─ « Issue labels » span 24px / 500 / 32px · ls −0.16px · #1b1b1b
│   └─ boutons (gap 8px) : « New group » 93×32 (secondaire) · « New label » 86×32 (primaire)
├─ barre filtre  301,117  1075×44
│   ├─ champ « Filter by name… » input search 300×28 @295,125 : bg #f9f9fa · bd 0.5px transparent · r 999px · p 6px 25px 6px 32px · 13px/500 · loupe 16×16 à x 305
│   └─ à droite : Filtre + Display 28×28 bg #fff r 9999 (gap 6px)
└─ TABLEAU (grid)  245,161  1187×…  bg #f9f9fa
    grid-template-columns :
      [indent] 60px [title] 293.195px [description] 439.805px [usedIn] 75px [usage] 75px
      [lastAppliedAt] 102px [createdAt] 82px [menu] 28px [end-padding] 32px
    lignes en `subgrid`
    ├─ en-tête collant (sticky) 1187×32 bg #f9f9fa :
    │    boutons de tri Name / Description / Used in / Issues / Last applied / Created
    │    24px de haut, r 9999px, p 0 6px, gap 2px ; libellé 12px / 450 #5c5c5e ; flèche de tri 12×12 sur la colonne triée
    └─ 7 lignes de 44px (Bug, Électricité, Feature, Gros œuvre, Improvement, Menuiserie, Plomberie)
         ├─ colonne indent (60) : case à cocher 14×14 @266 (bd 1px lch(52.04 0 282) #7c7c7c, r 3px, p 2px) — visible au survol
         ├─ title : pastille de couleur 9×9 r 50% @307 + bouton éditable 29px de haut (r 7px, p 6px 10px 6px 6px) → nom 13px/500 #2f2f31
         ├─ description : même bouton éditable → texte 13px/500 #2f2f31 ; vide = « Add label description… » #9c9d9f à **opacity 0** (n'apparaît qu'au survol)
         ├─ Used in / Issues / Last applied : vides
         ├─ Created : « Oct 28 » 12px/450 #5c5c5e
         └─ menu : bouton « … » 32×32 r 9999 (icône 16×16), visible au survol
```

Couleurs des pastilles : Bug #eb5757 · Électricité #26b5ce · Feature #bb87fc · Gros œuvre lch(48 59.31 288.43) #5e6ad2 · Improvement #4ea7fc · Menuiserie #95a2b3 · Plomberie #eb5757 (même rouge que Bug, relevé tel quel).

### Mesures

| Élément | Nb | x,y | L×H | Typo | Couleur | Fond / bordure / rayon / padding |
|---|---|---|---|---|---|---|
| Titre de page | 1 | 301,73 | 876×32 | 24px/500/32px · ls −0.16px | #1b1b1b | — |
| Ligne titre | 1 | 245,73 | 1187×45 | — | — | filet bas 0.5px #e2e2e2 · p 0 56px 12px |
| Bouton secondaire « New group » | 1 | 1188,73 | 93×32 | 13px/500 | #2f2f31 | bg #ffffff · bd 0.5px transparent · r 9999px · p 0 12px |
| Bouton primaire « New label » | 1 | 1289,73 | 86×32 | 13px/500 | lch(100 5 286.91) #fffeff | bg lch(53 52.26 286.91) **#6d78d5** · bd 0.5px transparent · r 9999px · p 0 12px · ombre légère |
| Champ filtre | 1 | 295,125 | 300×28 | 13px/500 | #1b1b1b | bg #f9f9fa · r 999px · p 6px 25px 6px 32px |
| Bouton de tri d'en-tête | 6 | 298,165 | 60–96×24 | 12px/500 (span 450) | #5c5c5e | r 9999px · p 0 6px · gap 2px |
| Ligne | 7 | 245,193+44n | 1187×44 | — | — | fond via `::before` |
| Pastille couleur | 7 | 307,210 | 9×9 | — | voir liste | r 50% |
| Nom / description (bouton éditable) | 14 | 327,200 | 150–271×29 | 13px/500/normal | #2f2f31 | bd 0.5px transparent · r 7px · p 6px 10px 6px 6px |
| Date de création | 7 | 1290,207 | 38×15 | 12px/450 | #5c5c5e | — |

### États

- **Survol de ligne** : `::before` en `position:absolute; left 8px; right 8px; top 0; bottom 0`, **bg lch(94.44 0.5 282) #efeff0, r 8px**. Au survol apparaissent : la case à cocher (colonne indent), le placeholder de description, le bouton « … ».
- Bouton éditable (nom, description) : bordure 0.5px transparente qui se colore au survol/focus (non mesurée en valeur).

### À 390×844 (rechargé)

- Barre latérale masquée → `header` collant 390×44 (bg #f9f9fa, p 0 15px, gap 8px) : bouton Menu 32×32 + lien « Settings » (span 60×23).
- Bande vide réduite à **16px** ; marges latérales 22px (au lieu de 56).
- Titre « Issue labels » 147×32 sur la même ligne que les boutons, qui passent à **36px** de haut.
- Champ filtre 258×28 ; boutons outils 32×32.
- **Tableau réduit à 2 colonnes** : `[indent] 76px [title] 254px [menu] 28px [end-padding] 32px` — description, Used in, Issues, Last applied, Created **masquées**. « … » 36×36.

---

## B. Issue templates (page « colonne centrée + carte liste »)

### Structure

```
carte 1187, colonne centrée 640px (x 518 → 1158)
├─ bande vide 64px
├─ en-tête  518,73  640×80  flex-col gap 4px p 0 16px
│   ├─ « Issue templates » 24px / 500 / 32px · ls −0.16px · #1b1b1b
│   └─ texte d'aide 13px / 450 / 22px · #5c5c5e (2 lignes), lien « Docs » 13px/450 #1b1b1b · r 8px · p 1px 4px
└─ SECTION-CARTE  518,185  640×188  (32px sous l'en-tête)
    bg lch(100 0 282) #ffffff · r 10px · pas de border CSS, contour en ombre :
    box-shadow: lch(0 0 0/.088) 0 0 0 0.5px, lch(0 0 0/.02) 0 3px 6px -2px, lch(0 0 0/.04) 0 1px 1px 0
    ├─ header 640×60 · p 16px · gap 16px · filet bas 0.5px lch(0 0 0/.088)
    │   « 2 issue templates » 13px/500 lch(10 0 282) #1b1b1b · bouton « + » 24×24 rond à droite (icône 14 fill #5e5e60)
    └─ ul → 2 li de 640×64 · p 16px · flex gap 12px (dernier li : r 0 0 10px 10px)
        ├─ lien plein bloc (a absolu 640×64)
        ├─ figure 32×32 · bg lch(78.247 3.577 260.65 / .125) ≈ #bfbfc7 à 13 % · r 6px · icône 16×16 fill #5e5e60
        ├─ texte flex-col gap 2px : nom 13px/500 #1b1b1b · « Created by Wizyy 15 minutes ago » 12px/450 lch(40 1 282) #5e5e60
        └─ bouton « … » 24×24 rond à droite
```

Contenu : « Avenant à chiffrer », « Confirmation J-2 d'un passage… ».

### Mesures

| Élément | Nb | x,y | L×H | Typo | Couleur | Fond / bordure / rayon / padding |
|---|---|---|---|---|---|---|
| Titre de page | 1 | 534,73 | 608×32 | 24px/500/32px · ls −0.16px | #1b1b1b | — |
| Texte d'aide | 1 | 534,109 | 608×44 | 13px/450/22px | #5c5c5e | — |
| Carte-section | 1 | 518,185 | 640×188 | — | — | bg #fff · r 10px · ombre-contour 0.5px noir 8,8 % + ombre légère |
| En-tête de carte | 1 | 518,185 | 640×60 | 13px/500 | #1b1b1b | p 16px · filet bas 0.5px noir 8,8 % |
| Ligne de modèle (li) | 2 | 518,245 | 640×64 | — | — | p 16px · gap 12px |
| Vignette (figure) | 2 | 534,261 | 32×32 | — | — | bg #bfbfc7/0.13 · r 6px |
| Nom du modèle | 2 | 578,261 | 110–193×16 | 13px/500 | #1b1b1b | — |
| Méta « Created by… » | 2 | 578,278 | 528×15 | 12px/450 | #5e5e60 | — |
| Boutons « + » / « … » | 3 | 1118,202 | 24×24 | 12px/500 | #303032 | bd 0.5px transparent · r 9999px |

### États

- **Survol d'une ligne** : `li:hover { background-color: var(--sx-1gxylln) }` = **#eeeeef** (fond plein du li, coins arrondis seulement sur le dernier).

### À 390×844 (rechargé)

- Même en-tête mobile « Settings » ; colonne 346px (marges 22px).
- Texte d'aide sur 3 lignes (314×72).
- Carte 346×178 : header 50px de haut, **p 10.67px**, gap 8px, bouton « + » 28×28 ; li p **16px 10.67px**, gap **8px** ; boutons « … » 28×28.

## Capture (décrite)

1. Labels : grand titre « Issue labels » à gauche, bouton blanc « New group » et bouton violet « New label » à droite ; champ de recherche arrondi en dessous.
2. Tableau sans bordures : en-têtes gris 12px (Name, Description, Used in, Issues, Last applied, Created), 7 lignes de 44px avec pastille colorée + nom, description grise, date « Oct 28/29 » ; la ligne survolée prend un fond gris arrondi avec case à cocher et « … ».
3. Templates : titre + texte d'aide centrés sur 640px, puis une carte blanche aux coins 10px contenant « 2 issue templates » et deux lignes (vignette grise 32px, nom, « Created by Wizyy… »).
