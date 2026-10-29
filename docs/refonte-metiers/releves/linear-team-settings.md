# Relevé — Linear, Settings › Team (Omega / OME)

URL : https://linear.app/omegaaii/settings/teams/OME — relevé le 29/10/2026 au `getComputedStyle` / `getBoundingClientRect`, fenêtre 1440×900 (px CSS), thème clair. Aucune rangée ouverte, aucun bouton (Leave / Retire / Delete) touché.

Notation : `fs/fw/lh`, `c` couleur, `bg` fond, `bd` bordure, `r` rayon, `p` padding. Couleurs lch() converties en hex.

## Police

Inter Variable (100–900). Même échelle que Billing : titre 24/500/32 **ls −0.16px** ; h3 de section 15/500/23 ; titre de rangée 13/500/normal ; description et valeur 12/450/normal ; texte d'aide 13/450/22.

## Structure (1440×900)

```
html bg #efeff0 · barre latérale Settings 0–244 (non relevée)
└─ main (CARTE)  244,8  1188×856  bg #f9f9fa · bd 0.5px #e2e2e2 · r 12px · ombre #000/.02 0 3px 6px -2px, #000/.04 0 1px 1px
   ├─ BARRE HAUTE COLLANTE (sticky top 0, z 10) 1187×80, fond `linear-gradient(#f9f9fa 40px, transparent 80px)`
   │   └─ LIEN RETOUR « ‹ Teams » 78×28 @253,19 : a flex center, p 0 8px, r 9999px, bd 0.5px transparent,
   │        chevron gauche 14×14 + « Teams » 13/500 #5c5c5e (gap 6px)
   ├─ (bande vide 64px)
   └─ COLONNE 640px centrée @518 (zone 285→1392, p 0 40px)
       ├─ EN-TÊTE 640×60 p 0 16px gap 4
       │   ├─ « Omega » 24/500/32 ls −0.16px #1b1b1b @534,73
       │   └─ ligne 608×24 : « Accessible to all workspace members » 13/450/22 #5c5c5e
       │        + bouton « Team overview ↗ » 122×24 à droite @1026,109 (12/500 #2f2f31, r 9999px, p 0 6px 0 8px, icône 14)
       ├─ (32px)
       └─ fieldsets empilés, gap 48px (chaque fieldset sauf le 1er a p-top 12px et un h3)
           1. (sans titre)          carte 640×195 @165 : General · Members · Slack notifications
           2. « Issues, projects, and documents » h3 @408 → carte 640×259 @447 (4 rangées)
           3. « Workflow » h3 @754 → carte 640×324 @793 (5 rangées)
           4. « AI & agents » h3 @1165 → carte 640×325 @1204 (5 rangées)
           5. « Team hierarchy » h3 @1577 + aide 13/450/22 avec lien « Docs » → carte 640×64 @1640
           6. « Danger zone » h3 @1752 → carte 640×195 @1791 (Leave / Retire / Delete)
           h3 : 15/500/23 #1b1b1b, bloc p 0 16px, 16px au-dessus de la carte
```

### Carte et rangée

```
section  640×(65·n)  bg #ffffff · r 10px · p 0
         ombre : 0 0 0 0.5px #000/.09, 0 3px 6px -2px #000/.02, 0 1px 1px #000/.04
└─ a (lien plein) > li 640×65  flex row, align center, justify space-between, gap 12px, p 16px
   │  1re rangée r 10px 10px 0 0 ; dernière r 0 0 10px 10px (pour le fond de survol)
   │  SÉPARATEUR : li::after, position absolute, bottom 0, left 16px, right 16px, height 0.5px,
   │               border 0.5px solid lch(0 0 0 / .088) (≈ #000 à 8,8 %) — absent sur la dernière rangée
   ├─ figure 32×32 @534 : bg #efefef, r 6px, grid centré → icône 16×16 (svg <use>), fill #5e5e60
   ├─ texte flex column gap 3px @578 (flex 1) :
   │     titre 13/500/normal #1b1b1b (h 15.5) ; description 12/450/normal #5e5e60 (h 14.5), ellipsis
   ├─ valeur à droite 12/450 #5e5e60 (« 1 member », « Off », « None », « 7 statuses », « Enabled », « Every 2 weeks »)
   └─ chevron droit 16×16 #5e5e60 @1126 (dans un div flex gap 4)
```

Variantes :
- **Rangée verrouillée** (Project labels, Project statuses, Parent team) : 64px, pas de chevron ; à droite un lien-bouton « Available on Business » 160×32 (13/500 #303032, r 9999px, p 0 12px, bd 0.5px transparent, **opacity .6**).
- **Danger zone** : pas de figure ; à droite un bouton 32px « Leave team… » 108 / « Retire… » 73 / « Delete… » 77 (13/500 #303032, r 9999px, p 0 12px, opacity .6 au repos).

## Tableau des mesures

| Élément | Nb | x,y | L×H | Typo | Couleur | Fond / bordure / rayon / padding |
|---|---|---|---|---|---|---|
| Lien retour « Teams » | 1 | 253,19 | 78×28 | 13/500 | #5c5c5e | bd 0.5px transparent · r 9999px · p 0 8px · chevron 14 |
| Titre « Omega » | 1 | 534,73 | 78×32 | 24/500/32 · ls −0.16px | #1b1b1b | — |
| Sous-titre | 1 | 534,110 | 232×22 | 13/450/22 | #5c5c5e | — |
| « Team overview » | 1 | 1026,109 | 122×24 | 12/500 | #2f2f31 | r 9999px · p 0 6px 0 8px |
| h3 de section | 5 | 534 | 608×23 | 15/500/23 | #1b1b1b | — |
| Carte | 6 | 518 | 640×(65n) | — | — | bg #fff · r 10px · ombre ci-dessus |
| Rangée | 22 | 518 | 640×65 | — | — | p 16px · gap 12 · séparateur ::after 0.5px #000/.088 inset 16px |
| Case icône (figure) | 17 | 534,y+16 | 32×32 | — | icône #5e5e60 | bg #efefef · r 6px |
| Titre de rangée | 21 | 578,y+16 | flex×15.5 | 13/500 | #1b1b1b | — |
| Description | 21 | 578,y+34 | flex×14.5 | 12/450 | #5e5e60 | ellipsis |
| Valeur | — | aligné à droite, fin à 1114 | auto×14.5 | 12/450 | #5e5e60 | — |
| Chevron | 17 | 1126,y+24 | 16×16 | — | #5e5e60 | — |
| « Available on Business » | 3 | 982 | 160×32 | 13/500 | #303032 | r 9999px · p 0 12px · opacity .6 |
| Boutons Danger zone | 3 | 1040–1075 | 73–108×32 | 13/500 | #303032 | r 9999px · p 0 12px · opacity .6 |
| Lien « Docs » dans le texte | 1 | 1081,1604 | 54×17.5 | 13/450/22 | #1b1b1b | p 1px 4px · r 8px |

## États

- **Survol d'une rangée** : `li` bg → **#f5f5f5** (lch 96.5 0 282) ; coins arrondis seulement sur la 1re et la dernière rangée. Pas d'autre changement.
- **Survol du lien retour** : bg → **#f0f0f1**, texte et chevron #5c5c5e → **#1b1b1b**.
- La barre haute reste collée en haut au défilement ; son dégradé masque le contenu qui passe dessous.

## À 390×844 (rechargé)

- Barre latérale masquée ; en-tête 390×44 (p 0 15px) : bouton Menu 32×32 @15,6 + « Settings » 15/600 @75,10.
- Le lien retour « ‹ Teams » passe **sous** l'en-tête @37,62.
- Colonne 346px @22 ; titre « Omega » @38,96 ; sous-titre sur 2 lignes (190×36) ; « Team overview » 122×**28** à droite @236,136.
- Rangées : p **16px 10.67px** ; figure @33 ; texte @73 ; la description **passe à la ligne** au lieu d'être tronquée (rangée General 80px de haut) ; valeur à droite (« 1 member » @278), chevron conservé.
- « Available on Business » 160×**36**.
