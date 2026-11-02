# Plain — ce qui est commun à toutes les pages (relevé du 01/11/2026)

Relevé au `getComputedStyle` dans le navigateur intégré, workspace `w_01M625JFBKTE3BWN4ECASYHK2B`.
À lire avec chaque `plain-*.md`.

## Thème

Plain **suit le thème du système** : la classe `dark` est posée sur `<html>` quand `prefers-color-scheme: dark`.
Les deux thèmes ont été relevés par l'émulation `colorScheme` du navigateur, sans toucher au réglage du compte.

## Polices

- **Inter** variable (`/fonts/inter-variable.woff2`), graisse « medium » = **550**, texte courant 14/20.
- **Whyte** 400 (`/fonts/whyte-regular.woff2`, Dinamo, licence payante) : titres de page h1 20/28 (« Accounts », « Tasks »…).
  Substitut libre à choisir par la session métier.
- **geistMono** (OFL) : identifiants (références de fil, External ID).

## Jetons de couleur `--color-*` (198 variables) — clair · sombre

```
background-neutral-1 #fff #1a191b        background-neutral-2 #f9f9fc #121113
text-neutral-1 #1f1f28 #eeeef0           text-neutral-2 #636370 #b5b2bc
icon-neutral-1 #8e8e9c #98979f           icon-neutral-2 #adadb7 #72707b
fill-neutral-1 #f0f0f5 #232225           fill-neutral-2 #e7e7ef #2b292d          fill-neutral-3 #e0e0e9 #323035
border-neutral-1 #e7e7ef #2b292d         border-neutral-2 #e0e0e9 #323035        border-neutral-3 #cdcddb #49474e
solid-neutral-1 #1f1f28 #eeeef0          solid-neutral-2 #0b0b0e #f8f8fc         text-neutral-on-solid #fff #121113
solid-blue-1 #5c67f4 #5c67f4             solid-blue-2 #525cdb #5159e5
text-blue-1 #232964 #d7e0ff              text-blue-2 #4a52d1 #9dafff             text-blue-on-solid #fdfdff #fff
icon-blue-1 #448bff #5696ff              icon-blue-2 #7daeff #4761e4
fill-blue-1 #eef2ff #1c214e              fill-blue-2 #e1e8ff #24296b             fill-blue-3 #d3ddff #2c327e
border-blue-1 #e1e8ff #24296b            border-blue-2 #d3ddff #2c327e           border-blue-3 #adbcff #4049a3
background-blue-1 #fdfdff #131628        background-blue-2 #f7f9ff #0e111f
solid-green-1 #1bd379 #1bd379            solid-green-2 #00c770 #00c770
text-green-1 #074022 #b2f2c0             text-green-2 #008046 #3ad878            text-green-on-solid #074022 #0c130e
icon-green-1 #00ab5f #18b562             icon-green-2 #66c589 #008848
fill-green-1 #e2f9e8 #152d1c             fill-green-2 #cff4d9 #143c22            fill-green-3 #b7eec8 #19492b
border-green-1 #cff4d9 #143c22           border-green-2 #b7eec8 #19492b          border-green-3 #6ed795 #286940
background-green-1 #f9fffb #121b14       background-green-2 #f3fcf5 #0c130e
solid-red-1 #e33d3d #e33d3d              solid-red-2 #d5292f #d42c30
text-red-1 #651818 #ffd2cc               text-red-2 #d1282d #ff8f86              text-red-on-solid #fffcfc #fff
icon-red-1 #f14e4b #f3625c               icon-red-2 #ff847d #b94641
fill-red-1 #ffebe9 #3c1210               fill-red-2 #ffdbd7 #520e0e              fill-red-3 #ffcdc7 #621515
border-red-1 #ffdbd7 #520e0e             border-red-2 #ffcdc7 #621515            border-red-3 #f6a9a1 #8d332f
background-red-1 #fffcfc #201312         background-red-2 #fff7f7 #18100f
solid-yellow-1 #ffcb14 #fdc700           solid-yellow-2 #f4c224 #f2bd00
text-yellow-1 #453a1e #fde8b3            text-yellow-2 #987100 #d9b06a           text-yellow-on-solid #453a1e #14120c
icon-yellow-1 #e79d00 #d28f19            icon-yellow-2 #efb062 #b17000
fill-yellow-1 #fff4c1 #2c2207            fill-yellow-2 #ffea9c #3b2a00           fill-yellow-3 #ffe079 #483400
border-yellow-1 #ffea9c #3b2a00          border-yellow-2 #ffe079 #483400         border-yellow-3 #e6c368 #685317
background-yellow-1 #fefdfb #1c180f      background-yellow-2 #fffae9 #14120c
solid-purple-1 #ab4aba #ab4aba           solid-purple-2 #a144af #b658c4
text-purple-1 #53195d #f4d4f4            text-purple-2 #953ea3 #e796f3           text-purple-on-solid #fefcff #fff
icon-purple-1 #ca54dd #d066df            icon-purple-2 #d48cdf #a84fb6
fill-purple-1 #fbebfb #351a35            fill-purple-2 #f7def8 #451d47           fill-purple-3 #f2d1f3 #512454
border-purple-1 #f7def8 #451d47          border-purple-2 #f2d1f3 #512454         border-purple-3 #deade3 #734079
background-purple-1 #fefcff #201320      background-purple-2 #fdf7fd #181118
```

Échelles brutes (clair · sombre) — `neutral-1..14` : #fff #f9f9fc #f0f0f5 #e7e7ef #e0e0e9 #d8d8e3 #cdcddb #babaca #8c8c9b #828291 #adadb7 #8e8e9c #636370 #1f1f28 · #121113 #1a191b #232225 #2b292d #323035 #3c393f #49474e #625f69 #6f6d78 #7c7a85 #72707b #98979f #b5b2bc #eeeef0.
`blue-1..14` : #fdfdff #f7f9ff #eef2ff #e1e8ff #d3ddff #c2cfff #adbcff #90a0f8 #5c67f4 #525cdb #7daeff #448bff #4a52d1 #232964 · #0e111f #131628 #1c214e #24296b #2c327e #353d8e #4049a3 #4b56c0 #5c67f4 #5159e5 #4761e4 #5696ff #9dafff #d7e0ff.
(green/red/yellow/purple suivent le même schéma ; valeurs utiles reprises ci-dessus.) `black-alpha-1..12` et `white-alpha-1..12` : 0d 1a 26 33 4d 66 80 99 b3 cc e6 f2 (identiques dans les deux thèmes).

## Coque de l'application (1440×900)

```
html/body bg background-neutral-2 (#f9f9fc · #121113)
├─ BARRE LATÉRALE 0,0 345×900
│   ├─ tête 345×56 : sélecteur d'espace « omega ⌄ » (bouton 109×32 @12,12 : logo 24×24, nom 14/550, chevron 18)
│   │                + 3 boutons 32×32 @237/273/309 (Rechercher, Tâches, Nouveau fil)
│   ├─ rail d'icônes 56×844 (ul 32 de large @x 12)
│   └─ panneau 289×844 :
│       titre de section « Support » 14/550/20 #1f1f28 (marge 0 4px 8px 8px, ligne 32)
│       liens 281×32 @x 60 : p 4px · r 6px · 14/400/20 · gap → vignette 24×24 (icône 18) + libellé + compteur 12/400/16 à droite
│         repos : texte #636370 · actif : bg fill-neutral-2 (#e7e7ef) texte #1f1f28
│       ordre : My threads 27 · Tasks 20 · All threads 27 · Not assigned 0 · Views
│       « Browse ⌄ » bouton 281×24 (p 0 8px, m 8px 0 4px, 12/400/16, gap 4px)
│       Accounts · Labels · Tiers · Channels
│       en bas : carte « Next steps », bandeau « Free trial ends in 3 days » (propres au compte d'essai, à ne pas recopier)
└─ ZONE 345,0 1095×900 · p 8px → CARTE <main> 353,8 1079×884 · r 12px
     clair : bg #fff · ombre 0 0 0 1px #20272c14, 0 1px 1px #20272c14
     sombre : bg #1a191b · ombre rgba(32,39,44,.08) 0 1px 0, rgba(32,39,44,.08) 0 2px 5px, rgba(255,255,255,.02) 1px 1px 2px inset, rgba(255,255,255,.1) 0 0 1px inset
```

Paliers de la coque : **1024** → panneau latéral réduit (liens 206 de large), carte à x 278 ; **≤ 768** → barre latérale hors écran
(x −285), la carte prend toute la largeur sans rayon, la page défile en entier (plus de défilement interne),
bouton rond bleu flottant en bas à droite pour ouvrir le menu.

## Briques partagées

| Brique | Valeurs |
|---|---|
| Bouton fantôme (Filters, Display) | h 34 · p 8px 12px 8px 8px · r 6px · 12/550/16 · icône 18 #8e8e9c · gap 4 |
| Bouton secondaire (Create …, Load more) | bg #fff (sombre #1a191b) · r 6px · ombres internes `#161a2614 0 0 0 1px inset, #ffffff33 0 0 3px 1px inset, #0000001f 0 −1px 2px inset` (sombre : voir ombre de carte + `rgba(22,26,38,.08) 0 0 0 1px inset, rgba(255,255,255,.12) 0 0 1px 1px inset, rgba(0,0,0,.12) 0 −1px 1px inset`) |
| Bouton icône | 32×32 · p 7px · r 6px · icône 18 (favori #adadb7) |
| kbd | 18×18 · 11/550/16 · #636370 · bg #fff · bd 1px #e7e7ef · r 4px · p 0 2px (sombre : #b5b2bc sur #2b292d, bd #49474e) |
| Champ de recherche | 320×40 · bg #fff · bd 1px transparent · r 6px · p 9px 12px 9px 38px · 14/400/20 · loupe 18 #8e8e9c à 12 px |
| Menu déroulant (`role=menu`) | bg #fff · r 10px · p 4px 0 · ombre `rgba(32,39,44,.24) 0 1px 2px, rgba(32,39,44,.08) 0 2px 6px 2px, rgba(32,39,44,.08) 0 2px 8px` · item h 28, p 6px, r 6px, m 0 4px, 12/400/20, gap 8, icône 14 #636370 · survol bg #f0f0f5 · séparateur 1px #e7e7ef, marges 4px |
| Popover (`role=dialog`, Display) | 280 de large · bg #fff · r 6px · ombre `0 0 0 1px #20272c14, 0 1px 1px #20272c14` · p 16px 8px · titre 12/550/16 · lignes 28 r 6px |
| Anneau de focus | `0 0 0 2px #525cdb` |
| Pastille (tier, valeur de liste) | h 24 · r 6px · 12/400/20 · p 0 8px 0 4px · ::before inset 1px bg #fff r 5px · ::after bd 1px #e7e7ef r 6px (sombre : #232225 / bd #323035) |
| Booléen | point 9×9 rond (Yes #00c770 · No #cdcddb, sombre #49474e) + « Yes/No » 12/400/16 #636370, gap ~4 |
| Valeur vide | « – » 12/400/16 #babaca (sombre #625f69) |

## Captures

Le panneau du navigateur intégré rend 1440×900 en **800×500** (réduction ×0,556) ; 390×844 est rendu en 780×1688 (×2) ou 390×844.
Les captures sont des JPEG du navigateur convertis en PNG : elles servent à la composition, jamais à mesurer.
