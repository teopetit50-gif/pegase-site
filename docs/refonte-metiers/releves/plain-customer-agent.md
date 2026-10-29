# Relevé — Plain, Customer Agent (sous-menu, Knowledge sources, Overview)

URLs : https://app.plain.com/workspace/w_01M625JFBKTE3BWN4ECASYHK2B/ai/knowledge-sources/ et …/ai/ (Overview). Relevé le 29/10/2026 au `getComputedStyle` / `getBoundingClientRect`, fenêtre 1440×900 (px CSS), thème clair. Rien saisi, rien ajouté, aucun « Get started » / « Add » cliqué.

Notation : `fs/fw/lh`, `c` couleur, `bg` fond, `bd` bordure, `r` rayon, `p` padding.

## Police

- Corps : **Inter** variable (OFL). Graisses : 400 (texte), **550** (titres de carte, entrée active, boutons), **475** (pastilles 10–12px).
- **h1 « Knowledge » / « Customer Agent » : `Whyte` 24px / 400 / 32px #1f1f28** ; « Next steps » dans la carte du bas de sous-menu : `Whyte` 20px / 400 / 28px. Whyte = commerciale (Dinamo), substitut à prévoir.
- Jetons : texte #1f1f28 / #636370 ; icônes #8e8e9c / #adadb7 ; fonds #f0f0f5 (survol) / #e7e7ef (actif) / #f9f9fc (page) ; bordures #e7e7ef / #e0e0e9 ; vert Plain #1bd379.

## Structure générale (1440×900)

```
body bg #f9f9fc
├─ BARRE LATÉRALE  0,0  345×900  (flex column, r 12px, pas de fond propre → #f9f9fc)
│  ├─ en-tête 345×56, p 12px 4px 12px 12px : sélecteur d'espace « omega » 109×32 (r 6px) · 3 boutons 32×32 r 6px p 7px (Search, Create task, Create thread), gap 4px
│  └─ corps 345×844 = RAIL 56px + SOUS-MENU 289px
│     ├─ RAIL (nav) 0,56  56×844, p 0 12px 12px : 8 icônes 32×32 empilées gap 8px (icône 18 dans une case 24)
│     │     actif (Customer Agent) : bg #e7e7ef, icône #1f1f28 ; inactifs : icône #8e8e9c
│     │     bas : anneau « 3/3 steps » (pastille #1bd379 r 999px), Notifications, Get help, avatar 24 — chacun 32×32
│     └─ SOUS-MENU  56,56  289×844, flex column space-between, p 0 4px
│        ├─ titre « Customer Agent » 14/550/20 #1f1f28 @68,62 (ligne 32px, p-left 8px)
│        ├─ groupe sans titre (y 96) : Overview · Activity · Playground
│        ├─ (gap 24px entre groupes)
│        ├─ groupe « Knowledge » : intitulé 12/400/16 #636370 @68,219 (ligne 281×16, p 0 8px), puis à +4px :
│        │     Knowledge gaps · Knowledge sources
│        └─ bas (p 12px, gap 8) : carte « Next steps » 265×208 + « Your trial ends in 6 days. » / « Upgrade now »
└─ main (CARTE)  353,8  1079×884  bg #fff · r 12px · ombre 0 0 0 1px #262626/.08, 0 1px 1px #262626/.08
   └─ colonne 920px max, centrée (433→1353), p 32px 32px 98px → contenu 856px @465
```

### Entrée de sous-menu

```
li 281×33 (flex column) → div 283×32  flex row space-between · p 4px 8px · r 8px  (déborde de 1px à gauche/droite : x 58)
   └─ a 267×24 : icône 18×18 dans case 24×24 @x66 · libellé @x98 (8px après la case) 14/400/20
```

| État | Fond | Texte | Icône | Graisse |
|---|---|---|---|---|
| Repos | — | #636370 | #8e8e9c | 400 |
| Survol | **#f0f0f5** | #1f1f28 | #1f1f28 | 400 |
| Actif (Knowledge sources / Overview) | **#e7e7ef** | #1f1f28 | #1f1f28 | **550** |

Pas d'entrées : Overview y 96, Activity 129, Playground 162 (33px) ; Knowledge gaps 239, Knowledge sources 272.

### Carte « Next steps » (bas du sous-menu)

68,648 265×208 · bg #fff · bd 1px #e7e7ef · r 10px · ombre 0 1px 1px #1a3333/.04 · p 16px.
Bouton Dismiss 24×24 (r 6px, p 5px, icône 14 #636370) en haut à droite @302,655. Titre Whyte 20/400/28. Liste p 4px 0 8px : 3 boutons 239×34 (r 6px, p 8px : icône 18 #8e8e9c + libellé 12/550/16 #1f1f28 + chevron 18 #8e8e9c à droite) ; ligne faite : icône #adadb7, libellé 12/400/16 #636370, coche #00ab5f. Barre de progression 231×4 r 9999px bg #e7e7ef, remplissage #1bd379 (58px = 1/4).
Sous la carte : « Your trial ends in 6 days. » 12/400/16 #636370 et « Upgrade now » 12/550/16 #636370, flex space-between.

## Page Knowledge sources

```
header  465,40  856×76
├─ h1 « Knowledge » Whyte 24/400/32 #1f1f28
└─ p 14/400/20 #636370 (2 lignes, 856×40) @465,76
sections empilées, espacement 24px (148 → 486 → 645 → 836 → 1107) :
1. CARTE « Health »  465,148  856×314  bg #fff · bd 1px #e7e7ef · r 10px · p 24px · ombre 0 1px 1px #1a3333/.04
   ├─ ligne titre 806×26 flex space-between gap 12 : icône 24 #636370 + « Health » 16/550/24 #1f1f28
   │     à droite 2 pastilles 26px (gap 8) : « Docs » (lien, icône 14) et « Not set up »
   │     pastille : bg #f0f0f5 · r 4px · p 6px 8px 6px 6px · gap 4 · 12/475/12 #1f1f28 · icône 14 #636370
   └─ ÉTAT VIDE (24px plus bas) centré : carte 450×214 bg #fff bd 1px #e7e7ef r 10px, p 32px, flex column center gap 16
         icône 48 dans une case 64×64 bg #636373/.12 r 6px
         titre « No knowledge sources yet » 14/550/20 #1f1f28 ; texte 14/400/20 #636370 (384px, 2 lignes, centré), gap 8
2. CARTE TITRÉE « Help centers »  465,486  856×135  bg #fff · bd 1px #e0e0e9 · r 8px · p 16px (verticale)
   ├─ en-tête 854×65 : p 0 16px 16px, bd-bottom 1px #e7e7ef
   │     h3 16/550/24 #1f1f28 @482 ; p 14/400/20 #636370 (4px dessous)
   └─ RANGÉE LIEN « Create a help center » : a 854×52, flex space-between, p 16px, gap 8, r 0
         icône 18 #8e8e9c + libellé 14/550/20 #1f1f28 (gap 12) … chevron droit 18×18 #8e8e9c @1286
3. CARTE « Failed ingestions » 856×167 (même gabarit) : rangée vide « No URLs have failed to index. » 14/400/20 #636370, bloc 822×52 (p 16 0)
4. CARTE « Sitemaps » 856×247 : sous l'en-tête, formulaire flex gap 8 à 16px du filet :
      input 634×40 bg #fff bd 1px #e0e0e9 r 6px p 9px 12px, placeholder « e.g. www.acme.com/sitemap.xml » #636370
      bouton carré « Add label » 38×38 (r 6px, p 10px, icône 18 #1f1f28) placé à l'intérieur/à droite du champ
      bouton « Add sitemap » 134×40 : bg #fff r 6px p 10px 16px 10px 12px, icône + 18 #adadb7 + 14/550/20 #1f1f28,
      ombre `inset 0 0 0 1px #1a1a26/.08, inset 0 0 3px 1px #fff/.2, inset 0 -1px 2px #000/.12`
   puis rangée d'état vide « You can add a Sitemap to provide… » 14/400/20 #636370
5. CARTE « Individual URLs » 856×247 : idem, input 660×40 (« e.g. www.acme.com/pricing »), bouton « Add URL » 108×40
```

## Page Overview (/ai/)

```
header 856×56 : h1 « Customer Agent » Whyte 24/400/32 · p 14/400/20 #636370 terminé par le lien
   « Learn more » 14/550/20 #636370 + icône flèche 18 (inline)
form = CARTE 2 COLONNES  465,128  856×552  bg #fff · bd 1px #e7e7ef · r 10px · flex row
├─ gauche 427×550 : flex column center, gap 16, p 56px 24px 32px
│    icône 48×48 #636370 · titre « Meet the Customer Agent » 16/550/24 #1f1f28
│    texte 14/400/20 #636370 (bloc 379×362, space-between)
│    pied 379×40 space-between : 2 flèches de carrousel 14×20 (#1f1f28 active / #636370) ·
│    bouton principal « Get started » 107×40 bg #1f1f28 texte #fff 14/550/20 r 6px p 10px 16px, ombre en relief
│    (`0 1px 2px #21262e/.24, 0 2px 6px 2px #262626/.08, 0 2px 8px #262626/.08, 0 1px 1px #1a3333/.04, inset 0 -1px 1px 1px #000/.12, inset 0 1px 2px #fff/.12`)
└─ droite 427×550 : bg #f9f9fc, p 21px 16px, flex column center gap 12 — ILLUSTRATION ANIMÉE (cartes de conversation qui défilent)
     cartes : bg #fff · bd 1px #e7e7ef · r 6px · p 16px · gap 12 ; avatar 40×40 r 8px
     nom 14/550/20 #1f1f28 · heure 12/400/16 #636370 · message 14/400/20 #1f1f28
     carte « agent » (omega Support) : sans bordure, ombre `0 1px 2px #21262e/.24, 0 2px 6px 2px #262626/.08, 0 2px 8px #262626/.08`,
       pastille « AI agent » 10/475/10 bg #f0f0f5 r 4px p 3px 6px ; légende « This is how your agent will appear » 12/400/16 #636370
     cartes squelettes : barres 8px bg #e7e7ef r 2px ; carte du bas opacity .5
```

## Tableau des mesures

| Élément | x,y | L×H | Typo | Couleur | Fond / bordure / rayon / padding |
|---|---|---|---|---|---|
| Carte main | 353,8 | 1079×884 | — | — | bg #fff · r 12px · ombre 2 couches #262626/.08 |
| h1 | 465,40 | auto×32 | Whyte 24/400/32 | #1f1f28 | — |
| Sous-titre | 465,76 | 856×40 | Inter 14/400/20 | #636370 | — |
| Titre sous-menu | 68,62 | 110×20 | 14/550/20 | #1f1f28 | — |
| Intitulé de groupe | 68,219 | 64×16 | 12/400/16 | #636370 | p 0 8px |
| Entrée sous-menu | 58,y | 283×32 | 14/400/20 | #636370 | p 4px 8px · r 8px |
| Entrée active | 58,272 | 283×32 | 14/550/20 | #1f1f28 | bg #e7e7ef · r 8px |
| Icône d'entrée | 69,y+7 | 18×18 | — | #8e8e9c | — |
| Carte Health | 465,148 | 856×314 | — | — | bg #fff · bd 1px #e7e7ef · r 10px · p 24px · ombre 0 1px 1px #1a3333/.04 |
| Pastille Docs / Not set up | 1140,173 | 61 / 86×26 | 12/475/12 | #1f1f28 | bg #f0f0f5 · r 4px · p 6px 8px 6px 6px |
| Carte état vide | 668,223 | 450×214 | 14/550 + 14/400 | #1f1f28 / #636370 | bg #fff · bd 1px #e7e7ef · r 10px · p 32px |
| Case icône état vide | 861,256 | 64×64 | — | #636370 | bg #636373/.12 · r 6px |
| Carte titrée | 465 | 856×135–247 | — | — | bg #fff · bd 1px #e0e0e9 · r 8px · p 16px 0 |
| En-tête de carte | 466 | 854×65 | h3 16/550/24 · p 14/400/20 | #1f1f28 / #636370 | p 0 16px 16px · bd-bottom 1px #e7e7ef |
| Rangée « Create a help center » | 466,568 | 854×52 | 14/550/20 | #1f1f28 | p 16px · flex space-between · chevron 18 #8e8e9c |
| Champ texte | 482 | 634×40 | 14/400/20 | #1f1f28 (placeholder #636370) | bg #fff · bd 1px #e0e0e9 · r 6px · p 9px 12px |
| Bouton secondaire « Add … » | 1169 | 134×40 | 14/550/20 | #1f1f28 | bg #fff · r 6px · p 10px 16px 10px 12px · ombre intérieure (voir plus haut) |
| Carte Overview | 465,128 | 856×552 | — | — | bg #fff · bd 1px #e7e7ef · r 10px |
| Bouton principal « Get started » | 761,607 | 107×40 | 14/550/20 | #fff | bg #1f1f28 · r 6px · p 10px 16px |

## États

- **Entrée de sous-menu au survol** : bg #f0f0f5, texte + icône → #1f1f28 (mesuré en survolant « Activity »).
- **Rangée « Create a help center » au survol** : bg → **#f0f0f5** (`background: var(--…)` = #f0f0f5), transition 75ms ease-in-out ; il existe aussi une règle `a:hover { transform: scale(.985) }` mais elle ne s'appliquait pas ici (transform resté `none`). La rangée a r 0 → le fond de survol touche les bords de la carte.
- Rail : élément actif bg #e7e7ef r 6px.
- Bouton secondaire au survol (même composant que la page Get started) : bg → #f9f9fc.

## À 390×844 (rechargé)

- **La barre latérale entière (rail + sous-menu) passe hors écran** (x −287) : le sous-menu n'est plus visible ; main plein écran 390 de large, sans rayon ni ombre, la page défile (1554px).
- Colonne p 24px → 342px @24.
- Knowledge sources : sous-titre sur 4 lignes (342×80) ; carte Health 342×354, ligne titre conservée sur une ligne (« Health » à gauche, pastilles à droite @186) ; état vide 260×254 (p 0 16px autour) avec texte 194px sur 4 lignes.
- Cartes titrées 342 de large ; en-tête p 0 16px 16px → texte 308px ; rangée « Create a help center » **340×44** (plus basse : p 12px 24px).
- Formulaires : l'input se réduit à 120px (Sitemaps) / 146px (URLs), le bouton « Add » garde sa largeur (134 / 108) — rien ne passe à la ligne.
- Overview : **la carte reste en 2 colonnes** (185px + 170px) : texte écrasé (137px utiles, titre sur 2 lignes), illustration compressée et débordante. Pas de version mobile dédiée — à ne pas recopier telle quelle.
