# Relevé — Linear, Home d'équipe (Overview)

URL : https://linear.app/omegaaii/team/OME/overview — relevé le 29/10/2026 au `getComputedStyle` / `getBoundingClientRect` (pixels CSS, fenêtre 1440×900, DPR 2), thème clair du compte.

Notation : `fs` taille, `fw` graisse, `lh` interligne, `ls` interlettrage, `c` couleur texte, `bg` fond, `bd` bordure, `r` rayon, `p` padding (haut droite bas gauche), `gap`. Couleurs Linear en `lch()` (valeur exacte) suivies de l'équivalent hex calculé par canvas.

## Police

- `font-family` calculée : `"Inter Variable", "SF Pro Display", -apple-system, system-ui, "Segoe UI", Roboto, …, "Linear Thai", sans-serif`.
- `document.fonts` chargées : une seule, **Inter Variable 100–900 normal** (fichier variable, graisses non standard utilisées : 450, 510/500, 600).
- Licence : Inter est sous **SIL Open Font License** (libre, réutilisable ; version variable disponible sur rsms.me/inter ou Google Fonts « Inter »). Pas de police propriétaire sur cette page.

## Jetons utiles (variables `:root`)

| Variable | Valeur | Hex |
|---|---|---|
| `--color-text-primary` | lch(9.794% 0 282) | #1b1b1b |
| `--color-text-secondary` | lch(19.588% 1.25 282) | #2f2f31 |
| `--color-text-tertiary` | lch(39.176% 1.25 282) | #5c5c5e |
| `--color-text-quaternary` | lch(64.64% 1.25 282) | #9c9d9f |
| `--color-bg-primary` (fond de la carte de contenu) | lch(97.94% 0.5 282) | #f9f9fa |
| `--color-bg-secondary` | lch(92.44% 0.5 282) | #e9e9ea |
| `--color-bg-tertiary` | lch(90.94% 0.5 282) | #e5e5e6 |
| `--color-bg-quaternary` (fond de l'app / html, derrière la carte) | lch(94.44% 0.5 282) | #efeff0 |
| `--color-border-primary` | lch(95.24% 0 282) | #f1f1f1 |
| `--color-border-secondary` | lch(88.49% 0 282) | #dedede |
| `--color-border-tertiary` | lch(84.44% 0 282) | #d3d3d3 |
| bordure de la carte et filet d'en-tête | lch(89.84 0 282) | #e2e2e2 |
| `--radius-rounded` | 9999px | — |
| `--control-border-radius` | 8px | — |
| `--font-size-micro / microPlus / mini / small / regular / large / title3 / title2 / title1` | 11 / 11 / 12 / 13 / 15 / 18 / 20 / 24 / 36 px | — |
| `--font-weight-light / normal / medium / semibold / bold` | 300 / 450 / 500 / 600 / 700 | — |

## Structure (1440×900)

```
html  bg #efeff0 (lch 94.44)
├─ barre latérale Linear  0,0  244×900  (hors relevé, sert de largeur)
└─ zone principale  244,0  1196×900
   └─ CARTE  245,9  1187×855   bg #f9f9fa · bd 0.5px #e2e2e2 · r 12px
      │       ombre : lch(0 0 0/.02) 0 3px 6px -2px, lch(0 0 0/.04) 0 1px 1px 0
      │       (marges : 9px en haut, 8px à droite, ~36px en bas pour la barre Agent)
      ├─ header  245,9  1187×88  flex-col
      │  ├─ ligne titre  1187×44  p 0 8px · filet bas 0.5px #e2e2e2
      │  │   ├─ icône équipe 16×16 (fill #ac8d00) + « Omega » 13px/450   @263,18
      │  │   ├─ bouton étoile 28×28 rond, bouton « … » 28×28 rond   @337 / @369
      │  │   └─ bouton « Copier l'URL » 28×28 à droite   @1396,16
      │  └─ ligne onglets  1187×44  p 0 8px → rangée 28px de haut, gap 8px   @253,60
      │      Overview 75×28 (actif) · Documents 86×28 · Members 75×28
      └─ corps : grid  245,96  1187×(contenu)
           grid-template-columns : 61.5px 700px 220px 61.5px · column-gap 48px
           ├─ colonne principale  354,96  700×…  p-right 12px
           │   flex-col gap 24px p-top 24px
           │   ├─ ligne titre  688×36 gap 12px : pastille icône 36×36 r6 + « Omega » (p, 24px/600)
           │   ├─ description  688×66  p 16px 0 4px → paragraphe 15px/450/23px
           │   └─ section « Team resources »  712×108 (déborde de 12px à gauche, p 6px 0, r 8px)
           │       ├─ « Team resources » 18px/500 + 2 boutons ronds 28×28 à droite (bg #fff)
           │       └─ aide « Add documents and links… » 15px/450/23px, gris quaternaire
           └─ colonne droite (sticky)  1102,96  220×…  p-top 32px → bloc p 8px 8px 24px 0
               section flex-col gap 24px
               ├─ « Members » (13px/500 tertiaire) + rangée avatars : a 50×26 r9999 (avatar 18×18) + bouton « + » 28×28
               └─ « Go to » + liste flex-col gap 8px de 7 liens pilule 28px de haut
                   (Connect channel, Team settings, Triage, Issues, Cycles, Projects, Views)
└─ barre « Agent »  244,868  1196×28 (bas d'écran, hors carte)
```

## Tableau des mesures (motifs regroupés)

| Élément | Nb | x,y | L×H | Typo | Couleur | Fond / bordure / rayon / padding |
|---|---|---|---|---|---|---|
| Carte de contenu | 1 | 245,9 | 1187×855 | — | #1b1b1b | bg #f9f9fa · bd 0.5px #e2e2e2 · r 12px · ombre double (voir arbre) |
| Ligne titre du header | 1 | 245,9 | 1187×44 | — | — | filet bas 0.5px #e2e2e2 · p 0 8px |
| Fil d'Ariane « Omega » (h2>span) | 1 | 285,23 | 44×16 | Inter 13px / 450–500 / normal | #1b1b1b (span) | icône 16×16 à 22px de gauche du texte |
| Bouton icône rond (étoile, …, copier URL) | 3 | 337,16 | 28×28 | 12px/500 | #2f2f31 | bd 0.5px transparent · r 9999px · p 0 2px · icône 14×14 fill #5c5c5e |
| Onglet actif « Overview » | 1 | 253,60 | 75×28 | 12px / 500 / normal | #1b1b1b | bg lch(93.483 0.5 282) #ececed · bd 0.5px transparent · r 9999px · p 0 10px |
| Onglet inactif « Documents », « Members » | 2 | 336,60 | 75–86×28 | 12px / 500 | #5c5c5e | bg #ffffff (lch 99.997) · bd 0.5px transparent · r 9999px · p 0 10px |
| Pastille icône d'équipe | 1 | 354,120 | 36×36 | — | — | bg lch(60.135 63.97 86.502 / .125) ≈ #af8f00 à 13 % · r 6px · icône 24×24 fill #ac8d00 |
| Titre d'équipe « Omega » (p) | 1 | 402,122 | 80×32 | Inter 24px / 600 / 32px · ls −0.16px | #1b1b1b | — |
| Description (p) | 1 | 354,176 | 688×46 | Inter 15px / 450 / 23px | #2f2f31 | 2 lignes |
| Titre de section « Team resources » | 1 | 354,259 | 136×22 | Inter 18px / 500 / normal | #1b1b1b | — |
| Boutons de section (+, archive) | 2 | 992,256 | 28×28 | 12px/500 | #2f2f31 | bg #ffffff · bd 0.5px transparent · r 9999px · gap 4px |
| Texte d'aide de section | 1 | 354,295 | 404×18 | Inter 15px / 450 / 23px | #9c9d9f | — |
| Libellé de colonne droite « Members », « Go to » | 2 | 1102,136 | 212×16 | Inter 13px / 500 / normal | #5c5c5e | — |
| Puce membre (a) | 1 | 1098,165 | 50×26 | — | — | r 9999px · p 4px 8px 4px 4px · gap 8px · avatar img 18×18 r 50% |
| Lien « Go to » (pilule) | 7 | 1095,279 | 90–157×28 | span 13px / 500 / normal | #2f2f31 | r 9999px · p 5px 8px 5px 6px · gap 4px · icône 16×16 fill #5c5c5e |

## États

- **Onglet survolé** (Documents, mesuré en survolant) : bg passe de #ffffff à lch(94.854 0.5 282) ≈ #f0f0f1, texte de #5c5c5e à #2f2f31. La transition est courte (`--speed-highlightFadeIn`).
- **Onglet actif** : bg #ececed, texte #1b1b1b (aucune bordure visible, bordure 0.5px transparente).
- **Lien « Go to » survolé** : règle `:hover { background-color: var(--sx-629164) }` = **#f0f0f1** ; même couleur au `:focus-visible`, plus anneau `outline-width: var(--focus-ring-width)`.

## À 390×844 (rechargé)

- La barre latérale disparaît ; un bouton **Menu** 32×32 rond apparaît en tête (8,6).
- La carte n'existe plus : la zone principale occupe 0,0 390×844, bg #f9f9fa, **sans bordure, sans rayon, sans ombre**.
- Boutons d'en-tête et onglets passent de **28 à 32px** de haut (onglets 75/86/75×32, mêmes paddings).
- Corps : la grille garde gap 32px ; la colonne principale fait 326px (marges 32px) ; la **colonne droite « Members / Go to » disparaît** et ses liens se replient **sous la description** en rangée flex-wrap (pilules 26px de haut, gap 4px, p 4px 8px 4px 6px).
- La description passe à 3 lignes (326×69) ; « Team resources » : boutons 32px, texte d'aide sur 2 lignes.

## Capture (décrite)

1. Fond gris très clair, carte blanc cassé aux coins arrondis 12px ; en haut à gauche l'icône d'équipe jaune et « Omega », étoile et « … ».
2. Trois onglets pilules (Overview grisé = actif), puis au centre un grand titre « Omega » avec pastille jaune et la description en gris foncé sur deux lignes.
3. Section « Team resources » vide avec texte d'aide gris ; à droite, colonne « Members » (un avatar) et « Go to » avec sept liens à icône.
