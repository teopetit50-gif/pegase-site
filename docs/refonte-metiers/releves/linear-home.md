# Relevé — Linear, Home d'équipe (Overview)

URL : https://linear.app/omegaaii/team/OME/overview — relevé le 29/10/2026 au `getComputedStyle` / `getBoundingClientRect` (pixels CSS, fenêtre 1440×900, DPR 2), thème clair du compte.

**Complété le 01/11/2026** (session références Linear) sur une page remplie : thème sombre ajouté (émulation `prefers-color-scheme`, Linear suit le thème du système), ressources d'équipe remplies, états de survol, menu « … », paliers 1024 / 768 / 390, tiroir de navigation, barre latérale (commune à toutes les pages Linear). Les sections ci-dessous « Complément du 01/11 » priment sur le reste en cas d'écart.

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


---

# Complément du 01/11/2026

## Ce qui a été créé pour remplir la page (à effacer plus tard si besoin)

- Ressources d'équipe : documents « Charte de chantier 2026 », « Procédure de réception des travaux », « Annuaire des sous-traitants » (onglet Documents de l'équipe OME) et lien « Planning général des chantiers 2026 » → https://example.com/planning-chantiers-2026.
- Le reste de l'espace (tickets, étiquettes…) est listé dans les relevés des pages concernées ; la page Overview n'affiche pas les tickets.
- Rien d'autre n'existe sur cette page dans Linear : pas de bloc d'activité, pas de tableau. Un seul membre (Wizyy) — on n'invite personne, la rangée « Members » garde un avatar.

## Arbre mesuré (1440×900, sombre, ressources remplies)

```
main @244,8 1188×856  (bg lch(5.52 0.4 272) · bd 0.5px lch(13.08 1.48 272) · r 12px · ombre lch(0 0 0/.3) 0 .5px 1px 1px · m 8px 8px 8px 0)
└ div @245,9 1187×855
  ├ header @245,9 1187×87.5
  │ ├ ligne 1 @245,9 1187×44 → div @253,9 1171×43.5 (p 0 8px)
  │ │   ├ fil : icône équipe 16×16 @263,22 + h2 « Omega » @285,23 44×15.5 (13px/450)
  │ │   ├ button[switch] "Add to favorites" @337,16 28×28 (icône 14×14)
  │ │   ├ button "Team actions" @369,16 28×28
  │ │   └ button "Copy team URL" @1396,16 28×28 (à droite)
  │ └ ligne 2 @245,53 1187×43.5 → rangée @253,60 h 28 : a Overview 75.5×28 · a Documents 86.4×28 · a Loops 56.2×28 · a Members 75.2×28 (écart 8px)
  └ corps @245,96 1187×415 → colonne @354,96 700×415 (contenu 688) + colonne droite @1102,96 220
      ├ titre @354,120 688×36 : button "Choose team icon" 36×36 (r 6px, icône 24×24) · textbox "Team name" @402,122 80×32 (p 24px/600/32px ls −0.16px)
      ├ description @354,176 688×46 : textbox "Team description" (p 15px/450/23px, 2 lignes)
      └ section @342,250 712×256
          ├ en-tête @354,256 698×28 : span « Team resources » 135.5×22 (18px/500) · button "Add resources" @992,256 28×28 · button "Add section" @1024,256 28×28
          └ liste @342,300 712×176 : 4 × div[button] 712×42 (p-bas 2px) → a 712×40 (r 8px · p 0 12px · gap 6px)
               ├ document : icône use#Page 16×16 @354 + span 13px/500/16px (« Charte de chantier 2026 » 151.5 px)
               └ lien : icône lien 16×16 + span titre + flèche ↗ 14×14 (12×12 de boîte) à 4px du texte
      colonne droite @1102,128 220×383 → section @1102,136 212×351
          ├ « Members » span 212×15.5 (13px/500 tertiaire) · rangée @1102,164 h 28 : a 50×26 (avatar 18×18 + chevron 14×14) · div[button] "Add members" 28×28 (op 0, visible au survol)
          └ « Go to » span @1102,216 · liste @1102,243 gap 8px : 7 pilules h 28 (a/div @1095, p 5px 8px 5px 6px, m-left −7px, r 9999px)
               icône 16×16 dans span 18×18 · libellé 13px/500 · chevron › 14×14 (12×12) à droite
```

## Styles calculés (sombre) — ce qui n'était pas dans le relevé clair

| Élément | Typo | Couleur | Fond / bordure / rayon / padding / hauteur |
|---|---|---|---|
| Fond de l'app (derrière la carte) | — | — | lch(2.595 0.4 272) |
| Carte `main` | Inter Variable 16/24 | lch(100 0 272) | bg lch(5.52 0.4 272) · bd 0.5px lch(13.08 1.48 272) · r 12px · ombre `lch(0 0 0 / 0.3) 0 0.5px 1px 1px` |
| Filet bas de la ligne 1 | — | — | 0.5px lch(13.08 1.48 272) |
| Onglet actif (a) | 12px / 500 | lch(100 0 272) | bg lch(16.706 0.979 272) · bd 0.5px transparent · r 9999px · p 0 10px · h 28 · transition border/background-color/color/opacity 0.15s |
| Onglet inactif (a) | 12px / 500 | lch(61.803 1.2 272) | bg lch(10.149 0.593 272) · idem |
| Boutons ronds d'en-tête | 12px / 500 | lch(90.451 1.2 272) | transparent · bd 0.5px transparent · r 9999px · p 0 2px · 28×28 ; icône fill lch(61.803 1.2 272) |
| Boutons de section « + » et « ajouter une section » | 12px / 500 | lch(90.451 1.2 272) | bg lch(10.149 0.689 272) · r 9999px · 28×28 |
| Titre d'équipe (p) | 24px / 600 / 32px · ls −0.16px | lch(100 0 272) | — |
| Description (p) | 15px / 450 / 23px | lch(90.451 1.2 272) | — |
| « Team resources » | 18px / 500 | lch(100 0 272) | — |
| Ligne de ressource (a) | — | lch(100 0 272) | r 8px · p 0 12px · gap 6px · h 40 · transition color 0.15s ; survol bg lch(9.345 0.85 272) |
| Titre de ressource (span) | 13px / 500 / 16px | lch(90.451 1.2 272) | — |
| Icône de ressource | 16×16 | fill lch(61.803 1.2 272) | — |
| « Members », « Go to » | 13px / 500 | lch(61.803 1.2 272) | — |
| Pilule « Go to » (a) | span 13px / 500 | lch(90.451 1.2 272) | r 9999px · p 5px 8px 5px 6px · m 0 0 0 −7px · gap 4px · h 28 · transition color 0.15s |
| Pastille icône d'équipe | — | — | bg lch(60.135 63.97 86.502 / 0.175) (clair : / 0.125) · r 6px · 36×36 |

Correspondances clair → sombre (même rôle) : texte primaire lch(9.794 0 282) → lch(100 0 272) ; secondaire lch(19.588 1.25 282) → lch(90.451 1.2 272) ; tertiaire lch(39.176 1.25 282) → lch(61.803 1.2 272) ; carte lch(97.94 0.5 282) → lch(5.52 0.4 272) ; bordure carte lch(89.84 0 282) → lch(13.08 1.48 272) ; onglet actif lch(93.483 0.5 282) → lch(16.706 0.979 272) ; onglet inactif lch(99.997 0.5 282) → lch(10.149 0.593 272) ; survol de ligne lch(94.44 0.5 282) → lch(9.345 0.85 272) ; ombre carte `lch(0 0 0/.02) 0 3px 6px -2px, lch(0 0 0/.04) 0 1px 1px 0` → `lch(0 0 0/.3) 0 .5px 1px 1px`.

## Ligne de ressource : survol (mesuré, souris dessus)

- Clair : bg du `a` = lch(94.44 0.5 282), texte lch(9.794 0 282) ; pas de transition sur le fond (bascule immédiate), transition `color` seulement.
- Sombre : bg lch(9.345 0.85 272).
- Aucun bouton n'apparaît au survol sur la ligne (pas de « … » de ligne).

## Menu « … » (Team actions), sombre

```
div[dialog]"Menu" @369,48 175×77 — bg lch(12.72 0.85 272) · bd 0.5px lch(25.68 1.93 272) · r 12px
   ombre lch(0 0 0/.125) 0 3px 8px 0, lch(0 0 0/.125) 0 2px 5px 0, lch(0 0 0/.125) 0 1px 1px 0 · 13px/400/19.5px · c lch(91.178 1.425 272)
 └ div[listbox] → ul : espace 6px · a[option] 174×32 · li[option] 174×32 · espace 6px
     option : p 0 18px 0 14px · h 32 · fond de surbrillance div @376 162×32 (inset 6px) · icône 16×16 fill lch(64.714 1.425 272) · libellé span 13px/450
     items : « Team settings » (roue dentée), « Open archive » (boîte d'archive)
     champ de filtre caché (input « Filter… » 36px, p 10px 0 9px) : on tape pour filtrer
```
Pas d'animation CSS (`animation: none`) relevée à l'ouverture ; apparition immédiate. Le menu s'ouvre sous le bouton, aligné à gauche, 4px plus bas (bouton bas 44 → menu 48).

## Barre latérale (commune à toutes les pages Linear)

Largeur 244px (nav @0,0 244×900), fond = fond de l'app (clair lch(94.44 0.5 282), sombre lch(2.595 0.4 272)).

```
nav 244×900
├ tête 244×52 : button "omega Workspace Menu" @12,16 94×28 (r 10px, p 0 9px 0 5px, gap 6px)
│   avatar d'espace « OM » 20×20 r 8px bg lch(55 60 190) 11px blanc · « omega » 13px/550/23px ls −0.1px · chevron 8×8
│   à droite : button "Search" 28×28 · button "Create new issue" 28×28 (bg = couleur de carte : clair lch(97.94 0.5 282), sombre lch(10.149 0.689 272))
├ Inbox / My issues / Reviews / Agent : a 220×28 (r 8px, m 1px 0) → span p 0 9px 0 8px, icône 14×14, libellé 13px/500
├ « Workspace ▾ » (button 215×28, span 12px/500) : Initiatives, Projects, Views, Loops, More
├ « Favorites »
├ « Your teams ▾ » + bouton "Join a team" 24×24 (op 0 au repos) :
│   li Omega (button 218×28, p 0 0 0 9px, gap 2px, icône équipe) → sous-liens a 201×28 m-left 19px (span p 0 9px 0 6px, gap 6px) :
│   Home (actif), Triage (compteur 11px/450 « 16 »), Issues, Cycles → Current / Upcoming (a 181×28 m-left 39px, filet vertical), Projects, Views
├ « Try ▾ » : Import issues, Invite people, Connect GitHub (bouton « Dismiss » 10×10 à droite)
└ pied 220×34 : bouton « ? » rond
```

| Élément | Typo | Couleur clair | Couleur sombre | Fond |
|---|---|---|---|---|
| Lien de navigation | 13px / 500 | lch(37.776 1.25 282) | lch(60.621 1.2 272) | transparent |
| Lien actif (Home) | 13px / 500 | lch(9.444 0 282) | lch(100 0 272) | clair lch(89.54 0.5 282) · sombre lch(13.845 1.3 272) · r 8px |
| Titre de groupe (Workspace…) | 12px / 500 | lch(37.776 1.25 282) | lch(60.621 1.2 272) | — |
| Nom d'espace « omega » | 13px / 550 / 23px · ls −0.1px | lch(18.888 1.25 282) | lch(90.155 1.2 272) | — |
| Compteur (Triage 16) | 11px / 450 | lch(37.776 1.25 282) | idem lien | r 4px |

## Comportement aux largeurs (rechargé à chaque largeur, sombre)

| Largeur | Barre latérale | Carte `main` | Colonne droite (Members / Go to) |
|---|---|---|---|
| 1440×900 | visible 244px | @244,8 1188×856, r 12px, m 8px 8px 8px 0 | visible, 220px à x 1102 |
| 1024×768 | visible 244px | @244,8 772×724, r 12px | **disparaît** ; les liens « Go to » passent en rangée sous la description (flex-wrap), section unique 724px |
| 768×1024 | **masquée** (tiroir 330px à x −346) ; bouton "Menu" en tête de page | @0,0 768×988, r 0, m 0, sans bordure | rangée sous la description ; barre « Agent » 36px en bas |
| 390×844 | tiroir | @0,0 390×844, r 0 | rangée sur 3 lignes ; colonne 326px (marges 32px) ; barre Agent masquée |

Tiroir (390 et 768) : clic sur "Menu" → nav 330×844 posée à x 0 dans un div `position:absolute` z-index 96, bg = fond de carte (sombre lch(5.52 0.4 272)), r 0 12px 12px 0 ; voile `position:fixed` bg lch(0 0 0 / 0.4) z-index 95 ; clic sur le voile → le tiroir repart vers la gauche en glissant (capture `390-clair-tiroir` prise pendant l'ouverture, la fermeture est animée). Échap ne le ferme pas (constaté).

## Icônes (noms du sprite Linear)

Le sprite complet (346 symboles, SVG exacts) est dans `linear-commun/sprite-icones.svg` (tiré du bundle public `static.linear.app`, identique au DOM). Sur cette page :
- `use#Joystick` (icône d'équipe, fill #ac8d00) 16×16 et 24×24 ; `use#Page` (document) 16×16 ; `use#Project` ; `use#CustomView` (Views).
- En ligne (tracé dans le composant, fill = texte tertiaire) : menu latéral (rectangle + barre, d `M4.25 2C2.45508…`), étoile (d `M10.5193 4.98997…`), « … » (d `M3 6.5a1.5 1.5 0 1 1 0 3…`), lien (d `M9.30558 10.206…`), « + » (d `M8.75 4C8.75 3.58579…`), ajouter une section (d `M8 6.75C8.41421…`), flèche ↗ (d `M11.75 10a.75.75 0 1 1-1.5 0V6.81l-4.72…`), chevron › 14×14 (d `M5.46967 11.4697…`), Slack quatre couleurs (Connect channel), roue dentée (d `M8.00021 5.25C9.51887…`), Triage (d `M6.85714 7.375V6.03197…`), Issues (d `M13.25 5.25C14.2165…`), Cycles (d `M8 1C8.41421 1 8.75 1.33579…`), archive (d `M9.25 8C9.66421 8 10 8.33579…`).
  Les SVG complets de ces tracés en ligne sont dans `linear-commun/icones-en-ligne.md` (extraits du bundle par leur début de tracé).

## Textes exacts

Onglets : « Overview », « Documents », « Loops », « Members ». Section : « Team resources » ; vide : « Add documents and links. Organize by creating sections. ». Colonne droite : « Members », « Go to », « Connect channel », « Team settings », « Triage », « Issues », « Cycles », « Projects », « Views ». Menu « … » : « Team settings », « Open archive ». Menu « + » des ressources : « New document », « Existing documents ▸ », « New link… » (champ « Add resource ») ; boîte de lien : champs « https://… » et titre.

## Captures (`captures/linear-home/`)

**Captures 1440 à taille réelle (`1440-reel-*.png`, 1440×900, échelle 1)** : utiliser celles-ci pour la superposition pixel à pixel, sur toutes les pages. Méthode : le volet du navigateur intégré rend 1440×900 en 800×500. On pose donc sur `<html>` un `transform: translate(-1,8·x0, -1,8·y0) scale(1.8)` (origine 0 0, `overflow: hidden`), ce qui ne touche pas la mise en page (les media queries voient toujours 1440). On prend ensuite quatre tuiles de 800×500 à l'échelle 1, aux origines (0,0), (640,0), (0,400), (640,400), soit 800×500 px CSS chacune. On les recolle avec PIL sur une toile 1440×900 ; les zones de recouvrement concordent à l'anti-crénelage près (écart maximal de 20/255 en gris sur quelques pixels de texte, contrôlé sur trois pages) ; aucune ligne n'est décalée. Le transform est retiré après chaque prise.

Les anciennes captures `1440-*.png` (sans « reel ») restent à l'échelle 0,556 : bonnes pour la composition, pas pour la superposition. 1024 → 800×600 (0,78), 768 → 800×1066 (1,04), 390 → 390×844 (échelle 1).

- `1440-clair.png`, `1440-clair-survol.png` (ligne « Procédure… » survolée)
- `1440-sombre-survol.png` (ligne survolée), `1440-sombre-menu.png` (menu « … » ouvert)
- `1440-reel-sombre.png`, `1440-reel-clair.png` (taille réelle)
- `1024-sombre.png`, `768-sombre.png`
- `390-sombre.png`, `390-sombre-tiroir.png`, `390-clair.png`, `390-clair-tiroir.png`
