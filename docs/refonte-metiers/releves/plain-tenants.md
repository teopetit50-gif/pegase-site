# Relevé — Plain, Tenants (liste)

URL : https://app.plain.com/workspace/w_01M625JFBKTE3BWN4ECASYHK2B/tenants/ — relevé le 29/10/2026 au `getComputedStyle`, fenêtre 1440×900 (px CSS). Aucun tri ni filtre modifié.

Notation : `fs/fw/lh`, `c` couleur, `bg` fond, `bd` bordure, `r` rayon, `p` padding.

## Police

- Inter (OFL), medium 550 ; h1 « Tenants » en **Whyte 20px / 400 / 28px** (police commerciale Dinamo, licence payante — prévoir un substitut).
- Jetons : voir plain-tenant.md. Tiret de valeur vide : **#babaca**. Icône « Remove sort » : #828291.

## Structure (1440×900)

```
fond #f9f9fc → zone 345,0 p 8px → CARTE 353,8 1079×884 bg #fff · r 12px · ombre 0 0 0 1px #20272c14, 0 1px 1px #20272c14 · p 24px 24px 0
├─ header 1079×58 · p 0 24px 24px · flex gap 24px
│   ├─ titre : icône 18×18 #8e8e9c + h1 « Tenants » Whyte 20/400/28 (gap 8px) @377,38
│   └─ actions (gap 8px) @1052,32 :
│       Favori 32×32 (r 6px, p 7px, icône #adadb7)
│       « Filters » 76×34 et « Display  V » 106×34 : bouton fantôme r 6px p 8px 12px 8px 8px, icône 18 + 12/550/16, kbd « V » 18×18
│       « + Create tenant » 118×34 : bouton secondaire bg #fff r 6px, contour en ombres internes
│         (#161a2614 0 0 0 1px inset, #ffffff33 0 0 3px 1px inset, #0000001f 0 −1px 2px inset)
└─ zone défilante 1079×802
    ├─ barre outils 373,102 1039×40 · flex gap 16px
    │   ├─ recherche input 320×40 · bg #fff · bd 1px transparent · r 6px · p 9px 12px 9px 38px · 14/400/20 (loupe 18 #8e8e9c)
    │   └─ à droite « Sorted by **Open threads** » 12/400/16 #636370 (valeur 12/550 #1f1f28) + bouton × 24×24 (#828291)
    └─ TABLEAU 353,154 1079×… (table HTML, 12px sous la barre outils)
        colonnes : Name 468 · Open threads 255 (alignée à droite) · Tier 127 · Source 157 · [champs] 72
        ├─ th 32px · bg #fff · sticky · p 8px 16px (1re : 8px 16px 8px **32px** ; dernière : 8px 32px 8px 16px)
        │   libellé 12/550/16 #636370 ; tout l'en-tête est un bouton « Options for … » (menu de colonne) ; icône 14 #8e8e9c
        │   filet bas = inset 0 −1px 0 #e7e7ef ; dernière colonne : bouton « Show more fields » 24×24
        └─ 6 lignes de 57px (tr bd-bottom 1px #e7e7ef)
            ├─ Name : td p 16px 16px 16px 32px · bg #fff · **sticky** → vignette 18×18 r 4px (icône 12 #8e8e9c) + nom 14/550/20 #1f1f28 (gap 8px)
            ├─ Open threads : « 0 » 14/400 + icône 14 #adadb7, inline-flex gap 6px, aligné à droite
            ├─ Tier : « – » 12/400/16 **#babaca**
            ├─ Source : icône 14 #adadb7 + « API » 12/400/16 #1f1f28
            └─ colonne vide 72
            liens absolus plein cadre sur chaque cellule (ligne entièrement cliquable)
```

Lignes : SCI Lefèvre Patrimoine · Plomberie Bastide · Peintures Giraud SARL · Menuiserie Fabre · Hôtel des Brotteaux · Électricité Morel.

## Tableau des mesures (motifs regroupés)

| Élément | Nb | x,y | L×H | Typo | Couleur | Fond / bordure / rayon / padding |
|---|---|---|---|---|---|---|
| h1 « Tenants » | 1 | 403,38 | 74×28 | Whyte 20/400/28 | #1f1f28 | icône 18 #8e8e9c à gauche |
| Boutons fantômes Filters / Display | 2 | 1092,32 | 76–106×34 | 12/550/16 | #1f1f28 | r 6px · p 8px 12px 8px 8px |
| kbd « V » | 1 | 1252,40 | 18×18 | 11/550/16 | #636370 | bg #fff · bd 1px #e7e7ef · r 4px · p 0 2px |
| Bouton « Create tenant » | 1 | 1290,32 | 118×34 | 12/550/16 | #1f1f28 | bg #fff · r 6px · ombres internes |
| Recherche | 1 | 373,102 | 320×40 | 14/400/20 | #1f1f28 | bg #fff · r 6px · p 9px 12px 9px 38px |
| « Sorted by » | 1 | 1246,114 | 136×16 | 12/400/16 (+550) | #636370 / #1f1f28 | — |
| th | 5 | 353,154 | 72–468×32 | 12/550/16 | #636370 | bg #fff · inset 0 −1px 0 #e7e7ef |
| tr | 6 | 353,186+57n | 1079×57 | — | — | bd-bottom 1px #e7e7ef |
| Cellule Name | 6 | 353,186 | 468×57 | — | — | p 16px 16px 16px 32px · bg #fff · sticky |
| Nom de tenant | 6 | 411,202 | 109–154×20 | 14/550/20 | #1f1f28 | — |
| Vignette tenant | 6 | 385,203 | 18×18 | — | — | r 4px |
| Valeur numérique | 6 | 1032,206 | 28×16 | 14/400 | #1f1f28 | icône 14 #adadb7 · gap 6px · à droite |
| Valeur vide « – » | 6 | 1092,210 | 6×15 | 12/400/16 | #babaca | — |
| Source « API » | 6 | 1239,206 | 19×16 | 12/400/16 | #1f1f28 | icône 14 #adadb7 |

## États

- **Survol d'une ligne** : composant de tableau identique à Broadcasts : `tr:has(a):hover td { background-color: #f0f0f5 }` (règle de base `tbody tr:hover td { #f9f9fc }` écrasée par la plus spécifique ; mesuré à #f0f0f5 sur Broadcasts).
- **En-tête de colonne** : bouton plein cadre « Options for … » (ouvre le menu tri/masquer ; non ouvert).
- **Focus clavier** : même #f0f0f5 sur la ligne ; anneau `0 0 0 2px #525cdb` sur les boutons.

## À 390×844 (rechargé)

- Barre latérale hors écran ; carte plein écran p 16px 16px 0.
- Header sur 2 lignes : titre, puis Favori / Filters / Display (82px, le kbd disparaît) / Create tenant (gap 8px).
- Recherche réduite à **144×40**, « Sorted by Open threads » conservé à droite.
- **Tableau 524px de large** dans un conteneur à défilement horizontal (528/390) ; **Name collante à gauche** (126px) ; Open threads 154, Tier 77, Source 95, champs 72.

## Capture (décrite)

1. Carte blanche : icône + « Tenants » en Whyte 20px à gauche, à droite étoile, « Filters », « Display V » et bouton blanc « + Create tenant ».
2. Champ de recherche arrondi 320px, et « Sorted by Open threads × » en petit à droite.
3. Tableau sans cadre : en-têtes gris 12px (Name, Open threads, Tier, Source), 6 lignes de 57px séparées par un filet très clair — petite vignette grise + nom en gras, « 0 » aligné à droite avec icône, tiret gris pâle, « API ».
