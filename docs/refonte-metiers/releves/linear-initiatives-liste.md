# Relevé — Linear, liste des Initiatives

URL : https://linear.app/omegaaii/initiatives — onglet « All initiatives » actif (déjà sélectionné, rien changé). Relevé le 29/10/2026 au `getComputedStyle` / `getBoundingClientRect`, fenêtre 1440×900 (pixels CSS), thème clair. 3 initiatives dans l'espace.

Notation : `fs/fw/lh` taille/graisse/interligne, `c` couleur, `bg` fond, `bd` bordure, `r` rayon, `p` padding. Couleurs : Linear les écrit en `lch()`, converties en hex par canvas.

## Police

Inter Variable (seule police chargée, axe 100–900). Graisses vues ici : **450** (texte courant, en-têtes de colonnes, résumés), **500** (titres, noms, boutons). Aucun letter-spacing. Interligne `normal` partout (≈ 15,5px pour 13px, 14,5px pour 12px).

## Structure (1440×900)

```
html bg #efeff0
└─ main (CARTE)  244,8  1188×856  bg #f9f9fa · bd 0.5px #e2e2e2 · r 12px
   │             ombre : #000/.02 0 3px 6px -2px, #000/.04 0 1px 1px 0
   ├─ header  245,9  1187×87.5  (flex column)
   │  ├─ ligne 1 : 1187×44, p 0 8px, bd-bottom 0.5px #e2e2e2 ; flex space-between, gap 6px
   │  │   ├─ « Initiatives » h2 13px/500 #2f2f31 @263,23 (conteneur p 0 4px 0 10px)
   │  │   └─ bouton « New initiative » 116×28 @1307,16 (icône 14 + span 12px/500 #5c5c5e)
   │  └─ ligne 2 : 1187×43.5, p 0 8px, gap 6px
   │      ├─ onglets (p 0 2px 0 10px, pas de gap : chaque onglet dans une case r 5px, pas 6px)
   │      │   « Active » 57×28 @253,60 · « Planned » 67×28 @316,60 · « All initiatives » 93×28 @389,60 (actif)
   │      └─ 3 boutons ronds 28×28 @1328 / 1362 / 1396, y 60 (filtre, display, panneau), gap 6px
   └─ zone liste  245,96  1187×767.5  (bg #f9f9fa, grid)
      ├─ EN-TÊTE DE COLONNES  1187×32 @y96, bg #f9f9fa (collant)
      └─ LIGNES : grid subgrid, chaque ligne = <a> 1187×57, r 8px, pas d'espace entre lignes
            y 128 / 185 / 242 ; bas de liste p-bottom 8px
```

### Grille des colonnes (grid-template-columns du conteneur, état final)

`[indent] 8px [checkbox] 20px [title] 572px [status] 100px [priority] 56px [owner] 50px [targetDate] 100px [projects] 59px [initiativeHealth] 52px [projectsHealth] 98px [end-padding] 12px`, `column-gap 12px`, lignes en `subgrid`.
La colonne titre est la variable (494px pendant le chargement, 572px une fois les dates calculées) ; targetDate se cale sur la date la plus longue (« Mar 31st, 2027 »).
Abscisses finales : case 264 · icône 285 · nom 319 · Status 857 · Priority 963 · Owner 1031 · Target 1081 · Projects 1193 · Health 1252 · Active Projects 1316.

### Anatomie d'une ligne (57px)

```
a  245,128  1187×57  display grid (subgrid), p 0 10px, r 8px, gap colonnes 12px
├─ case à cocher 14×14 (bd 1px #7c7c7c, r 3px, p 2px ; input opacity 0) — centrée y+22
├─ titre (col. title) : bloc 33px de haut à y+12
│   ├─ bouton icône 28×28 r 8px p 6px (icône initiative 16×16) @y+15
│   └─ colonne flex : nom 13px/500 #2f2f31 (h 15.5)
│                     résumé 13px/450 #5c5c5e (h 15.5), à +18px sous le nom, nowrap + ellipsis, largeur = colonne
├─ Status : bouton pilule 72×28 r 9999px p 3px 6px : icône 16 (#f0bf00, anneau « Active ») + « Active » 12px/450 #1b1b1b, gap 8
├─ Priority : bouton 28×28 r 9999px p 3px 6px, icône « No priority » 3 barres #5c5c5e
├─ Owner : bouton 30×28 r 9999px, icône « Unassigned » 18×18 #5c5c5e
├─ Target : div[button] r 8px > pilule r 9999px p 3px 6px : icône calendrier 16 #5c5c5e + date 12px/450 #1b1b1b
├─ Projects : bouton 39×24 r 9999px p 2px 4px bd 0.5px transparent : icône 16 #5e6ad2 + « 0 » 12px/450 #5c5c5e
│      (variante « 0 / 3 » : « 0 / » 12px/450 #5c5c5e + « 3 » 12px/500 #2f2f31, bouton 57×24)
├─ Health : bouton 28×28 r 9999px p 0 2px : icône 14×14
│      « pas d'update » = cercle contour #9c9d9f ; « On track » = disque #28a744/.25 + coche #26a644
└─ Active Projects : pastille 32×22 r 12px p 2px 6px 2px 2px : point 8×8 r 50% bg #5c5c5e + « 2 » 12px/500 #2f2f31
```

## Tableau des mesures (motifs regroupés)

| Élément | Nb | x,y | L×H | Typo | Couleur | Fond / bordure / rayon / padding |
|---|---|---|---|---|---|---|
| Carte main | 1 | 244,8 | 1188×856 | — | — | bg #f9f9fa · bd 0.5px #e2e2e2 · r 12px · ombre ci-dessus |
| Titre « Initiatives » h2 | 1 | 263,23 | 59×15.5 | 13px/500/normal | #2f2f31 | — |
| Bouton « New initiative » | 1 | 1307,16 | 116×28 | 12px/500 | #5c5c5e | bd 0.5px transparent · r 9999px · p 0 10px 0 8px · icône 14 |
| Onglet inactif (Active, Planned) | 2 | 253,60 | 57/67×28 | 12px/500 | #5c5c5e | bg #ffffff · bd 0.5px transparent · r 9999px · p 0 10px · ::after ombre `#000/.09 0 0 0 0.5px, #000/.02 0 3px 6px -2px, #000/.04 0 1px 1px` |
| Onglet actif (All initiatives) | 1 | 389,60 | 93×28 | 12px/500 | #1b1b1b | bg #ececed · mêmes bd/r/p |
| Boutons ronds outils | 3 | 1328,60 | 28×28 | — | #2f2f31 | bg #ffffff · bd 0.5px transparent · r 9999px · p 0 2px · icône 14 |
| En-tête de colonne triable (Name, Status, Priority, Target, Health) | 5 | 285,100 | 59–67×24 | span 12px/450 | #5c5c5e | bouton r 9999px p 0 6px gap 2px + flèche 12×12 #2f2f31 |
| En-tête non triable (Owner, Projects, Active Projects) | 3 | 1031,105 | — | 12px/450 | #5c5c5e | span p-right 12px |
| Ligne | 3 | 245,128+57n | 1187×57 | — | — | r 8px · p 0 10px |
| Nom d'initiative | 3 | 319,140 | auto×15.5 | 13px/500/normal | #2f2f31 | — |
| Résumé | 3 | 319,158 | 538×15.5 | 13px/450/normal | #5c5c5e | nowrap, overflow hidden, ellipsis |
| Bouton icône initiative | 3 | 285,143 | 28×28 | — | — | r 8px · p 6px · icône 16 |
| Statut « Active » | 3 | 863,143 | 72×28 | 12px/450 | #1b1b1b | r 9999px · p 3px 6px · icône #f0bf00 |
| Priorité / Owner | 3+3 | 969 / 1028,143 | 28 / 30×28 | — | icônes #5c5c5e | r 9999px · p 3px 6px |
| Date cible | 3 | 1084,143 | ≤103×28 | 12px/450 | #1b1b1b | r 9999px · p 3px 6px · icône #5c5c5e |
| Compteur projets | 3 | 1193,145 | 39 ou 57×24 | 12px/450 (+500 pour le total) | #5c5c5e / #2f2f31 | bd 0.5px transparent · r 9999px · p 2px 4px · icône #5e6ad2 |
| Santé | 3 | 1258,143 | 28×28 | — | #9c9d9f / #26a644 | r 9999px · p 0 2px · icône 14 |
| Pastille Active Projects | 1 | 1313,260 | 32×22 | 12px/500 | #2f2f31 | bd 0.5px transparent · r 12px · p 2px 6px 2px 2px · point 8×8 #5c5c5e |

## États

- **Survol d'une ligne** : le `<a>` reste transparent ; c'est son `::before` (position absolute, `inset 0 8px`, 1171×57, r 8px, z-index −1) qui prend **bg #efeff0** — transition `all`, `transition-duration: var(--speed-highlightFadeIn)` au survol. Le texte ne change pas.
- **Survol d'un onglet** : bg → `lch(94.854 0.5 282)` **#f0f0f1**, texte → **#2f2f31**, ombre `::after` → `0 0 0 0.5px #000/.15, 0 3px 6px -2px #000/.02, 0 1px 1px #000/.04` (`--btn-overlay-shadow-hover`).
- **Survol de « New initiative »** : fond reste transparent, texte → **#1b1b1b**.
- Onglet actif : bg #ececed, texte #1b1b1b.

## À 390×844 (rechargé)

- La carte devient plein écran : main 0,0 390×844, plus de bordure/rayon/ombre visibles, plus de barre latérale.
- Ligne 1 : bouton Menu rond 32×32 @8,6, puis « Initiatives » @52,14 ; « New initiative » devient un bouton icône rond 32×32 @350,6.
- Ligne 2 : onglets inchangés en largeur mais **hauteur 32px** (@8,50 / 71 / 145) ; les 3 boutons outils passent à **32×32** (@274 / 312 / 350).
- **L'en-tête de colonnes disparaît.** Grille : `[indent] 8px [title] 320px [initiativeHealth] 32px [end-padding] 12px`, gap 6px.
- Ligne 390×57 : icône 28×28 @14 · nom/résumé @48 (résumé 286px, ellipsis) · bouton santé 32×32 @340. Statut, priorité, owner, date, projets et Active Projects ne sont plus affichés.
