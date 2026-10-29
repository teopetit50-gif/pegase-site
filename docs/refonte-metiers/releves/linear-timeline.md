# Relevé — Linear, Projects en affichage Timeline

URL : https://linear.app/omegaaii/projects/all — affichage Timeline, zoom « Year » (déjà réglé). Relevé le 29/10/2026 au `getComputedStyle` / `getBoundingClientRect`, fenêtre 1440×900 (pixels CSS), thème clair. Aucune option d'affichage modifiée.

Notation : `fs/fw/lh` taille/graisse/interligne, `c` couleur, `bg` fond, `bd` bordure, `r` rayon, `p` padding. Couleurs en `lch()` exact puis hex calculé.

## Police

Inter Variable (seule police chargée, 100–900), pile `"Inter Variable", "SF Pro Display", -apple-system, …`. Licence SIL OFL (libre). Graisses utilisées ici : 450, 500.

## Structure (1440×900)

```
html bg #efeff0
└─ CARTE  245,9  1187×855  bg #f9f9fa · bd 0.5px #e2e2e2 · r 12px (identique à la Home)
   ├─ header  1187×88
   │  ├─ ligne 1 (44) : « Projects » h2 13px/500 @263,23 · bouton « New project » 108×28 à droite @1315,16
   │  └─ ligne 2 (44) : onglet vue « All projects » 85×28 (actif) + bouton « + » 28×28 ;
   │                    à droite 3 boutons ronds 28×28 bg #fff : Filtre, Display options, Panneau (gap 6px) @1328,60
   └─ zone frise  245,96  1187×768  bg #f9f9fa (overflow auto, défile horizontalement)
      ├─ EN-TÊTE DE FRISE  245,96  1187×32 (2 lignes de 16px)
      │   ├─ ligne mois  y 96, h 16 : libellés 11px/500, MAJUSCULES (text-transform), c #5c5c5e
      │   │     « JAN 2026 » = mois + année (année en span séparé, gap 2px)
      │   ├─ ligne jours y 112, h 16 : 1, 15, 29, 12… (un repère tous les 14 jours) 11px/500, c #9c9d9f
      │   ├─ pastille « OCT 29 » (aujourd'hui) @815,113  48×15  bg #6d78d5 · c #fffeff · r 8px · p 1px 4px · 11px/500
      │   └─ commandes flottantes à droite  1272,96  159×34  p 5px 10px 5px 36px, gap 4px
      │         fond en dégradé vers la gauche (#f9f9fa → transparent) pour masquer les mois
      │         « Today » 52×24 et « Year ▾ » 57×24 : bg #fff, bd 0.5px transparent, r 9999px, p 0 8px, 12px/500, c #2f2f31
      ├─ COLONNE GAUCHE (collée, au-dessus de la frise)  245,96  320×768  bg #f9f9fa
      ├─ LIGNES  depuis y 128 : 9 projets × 72px (pas de séparateur horizontal)
      │   chaque ligne = cellule gauche absolue 237,y 320×72 (p-left 8px, bg #f9f9fa)
      │                 + calque frise absolu 245,y 1187×72
      └─ barre de défilement horizontale  245,849  1187×15
```

### Échelle de la frise (zoom Year)

- Un mois ≈ **77,5 px** (Dec@8, Jan@86, Feb@163, Mar@233, Apr@311, May@386, Jun@463 …) soit ≈ **2,5 px par jour** ; un repère de jour tous les **35 px** (14 jours).
- Lignes verticales de mois : 1px, `border-right: 1px dashed lch(95.24 0 282)` (#f1f1f1), pleine hauteur (768px), une par début de mois.
- **Ligne « Today »** : x 839, 1px × 768, `background: linear-gradient(0deg, color(xyz-d50 .7447 .7634 .7152) [≈#e0e2f2] 0%, lch(53 52.26 286.91) [#6d78d5] 100%)`, **opacity .6** (violet en haut, pâlit vers le bas). Sa pastille de date est dans la ligne des jours.

### Cellule gauche (nom, santé, statut, priorité, lead)

```
cellule 320×72 → bloc 312×72 (p-right 10px) → flex gap 6px, centré verticalement
├─ nom : flex gap 4px, 166×32 (p 2px 0)
│   ├─ bouton icône projet 28×28 r 8px p 6px (icône 16×16 colorée)
│   └─ nom 13px / 500 / normal, c #2f2f31, tronqué (ellipsis)
└─ 4 boutons ronds 28×28, gap 6px, à partir de x 417
    ├─ Santé (updates) : bd 0.5px transparent, r 9999px, icône 14×14
    │     « no updates » = cercle pointillé #9c9d9f ; « Off track » = #da3540 (+ fond 25 %)
    ├─ Statut : r 9999px p 3px 6px, icône 16×16 (anneau) :
    │     orange #e78f41 (en cours), jaune #f0bf00 (planifié), gris #a5a6a8 (backlog)
    ├─ Priorité : icône 16×16 barres #5c5c5e (Urgent = carré #ff7336)
    └─ Lead : avatar img 16×16 r 50% ou icône « No lead » #5c5c5e
```
Couleurs des icônes de projet relevées : #26b5ce, #5e6ad2, #f0bf00, #4cb782, #e78f41, #a2a6ac, #c79b94, #eb5757.

### Barres de projet

| Propriété | Valeur |
|---|---|
| Hauteur | **24px** |
| Position verticale | ligne de 72 : libellé à y+5 (16px), barre à y+24 |
| Fond | lch(100 0.5 282) = #ffffff |
| Bordure | 0.5px solid lch(84.44 0 282) = #d3d3d3 |
| Rayon | 6px (barre sans date de début : `0 6px 6px 0`, bord gauche ouvert) |
| Ombre | `lch(0 0 0/.02) 0 3px 6px -2px, lch(0 0 0/.04) 0 1px 1px 0` |
| Libellé | **au-dessus** de la barre, aligné sur son bord gauche : 13px / 500 / normal, c #2f2f31 |
| Jalon | barre de 8px de large (projet « exemple ») + texte « Rappel 0% +1 » 12px/450 c #9c9d9f à côté du nom |
| Poignées | zones invisibles 44×23 à chaque extrémité (redimensionnement) |
| Exemples | Résidence Les Tilleuls 530px ; Groupe scolaire Jean-Moulin 568px ; Local commercial 358px ; Maison Rolland 255px |

## Tableau des mesures (motifs regroupés)

| Élément | Nb | x,y | L×H | Typo | Couleur | Fond / bordure / rayon / padding |
|---|---|---|---|---|---|---|
| Titre « Projects » (h2) | 1 | 263,23 | 51×16 | 13px/500 | #2f2f31 | — |
| Bouton « New project » | 1 | 1315,16 | 108×28 | span 12px/500 | #2f2f31 | r 9999px · p 0 10px 0 8px · icône + texte |
| Onglet de vue actif | 1 | 253,60 | 85×28 | 12px/500 | #1b1b1b | bg #ececed · r 9999px · p 0 10px |
| Boutons ronds outils (filtre, display, panneau) | 3 | 1328,60 | 28×28 | — | #2f2f31 | bg #ffffff · bd 0.5px transparent · r 9999px |
| Mois (span) | 23 | — | 20–52×13 | 11px/500, uppercase | #5c5c5e | flex gap 2px |
| Jour (span) | 42 | — | 5–14×13 | 11px/500 | #9c9d9f | — |
| Pastille aujourd'hui | 1 | 815,113 | 48×15 | 11px/500 | #fffeff | bg #6d78d5 · r 8px · p 1px 4px |
| Today / Year | 2 | 1308,101 | 52–57×24 | 12px/500 | #2f2f31 | bg #fff · bd 0.5px transparent · r 9999px · p 0 8px |
| Cellule gauche | 9 | 237,128+72n | 320×72 | — | — | bg #f9f9fa · p-left 8px · flex |
| Nom de projet | 9 | 290,228 | ≤115×16 | 13px/500 | #2f2f31 | ellipsis |
| Boutons santé/statut/priorité/lead | 4/ligne | 417,222 | 28×28 | — | — | r 9999px |
| Barre de projet | 5 visibles | — | var.×24 | — | — | voir tableau barres |
| Libellé de barre | 9 | barre.x, ligne.y+5 | var.×16 | 13px/500 | #2f2f31 | — |

## États

- **Survol d'une ligne dans la frise** : aucun fond de ligne (vérifié avec `:hover` : seuls les conteneurs sont survolés, aucun style ne change).
- **Survol du nom (colonne gauche)** : le nom passe de #2f2f31 à **#1b1b1b** et un bouton « Open project » 24×24 (rond, icône 16 #2f2f31) apparaît à droite du nom, qui se tronque à 91px.
- **Survol d'une barre** : bg → lch(94.854 0.5 282) **#f0f0f1**, bordure → **lch(0 0 0 / .15)** (noir 15 %), ombre inchangée.
- Onglet actif : bg #ececed / texte #1b1b1b.

## À 390×844 (rechargé)

- **La frise disparaît** : Linear bascule l'affichage en **liste** (pas de timeline sur mobile).
- Barre latérale masquée, bouton Menu 32×32 ; « New project » devient un bouton icône rond 32×32 ; tous les boutons passent à 32px.
- Lignes de liste : `a` 390×48, `display: grid` (subgrid, 6 colonnes), r 8px, gap 6px :
  icône 28×28 @14 · nom 13px/500 #1b1b1b · pilule jalon « Rappel » (r 48px, 12px/450 #5c5c5e, h 27) · santé 32×32 @292 · statut 28×28 @348.
- Priorité et lead ne sont plus affichés.

## Capture (décrite)

1. En-tête de carte « Projects » + « New project » ; sous lui l'onglet « All projects » et trois boutons ronds à droite.
2. Frise annuelle : mois en petites capitales grises, repères de jours tous les 14 jours, pastille violette « OCT 29 » et fine ligne verticale violette qui descend sur toute la hauteur.
3. À gauche, 9 lignes de projets (icône colorée, nom, 4 petites icônes santé/statut/priorité/lead) ; à droite, barres blanches fines (24px) à bord gris et coins de 6px, nom posé au-dessus de chaque barre.
