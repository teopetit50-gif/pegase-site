# Relevé — Linear, Triage (liste + élément ouvert)

URL : https://linear.app/omegaaii/team/OME/triage puis clic sur la 1re ligne → https://linear.app/omegaaii/issue/OME-19/… (s'ouvre à droite, la liste reste à gauche). Relevé le 29/10/2026 au `getComputedStyle`, fenêtre 1440×900 (px CSS), thème clair. Aucune action Accept/Decline cliquée.

Notation : `fs/fw/lh` taille/graisse/interligne, `ls` interlettrage, `c` couleur, `bg` fond, `bd` bordure, `r` rayon, `p` padding.

## Police

Inter Variable seule (SIL OFL, libre). Graisses : 450 (texte), 500 (titres de ligne, boutons), 600 (titre d'issue, « Activity »).

## Couleurs (lch → hex)

| Rôle | lch | hex |
|---|---|---|
| Texte primaire | lch(9.794 0 282) | #1b1b1b |
| Texte secondaire | lch(19.588 1.25 282) | #2f2f31 |
| Texte tertiaire | lch(39.176 1.25 282) | #5c5c5e |
| Fond carte / liste | lch(97.94 0.5 282) | #f9f9fa |
| Survol de ligne (`::before`) | lch(94.44 0.5 282) | #efeff0 |
| Ligne sélectionnée (`::before`) | lch(92.94 0.5 282) | #ebebec |
| Filets (séparateur liste/détail, bas d'en-tête) | lch(89.84 0 282) | #e2e2e2 |
| Boutons « pilule » de propriétés | lch(99.997 0.5 282) | #ffffff |
| Boîte de commentaire | lch(100 0 282), bd lch(91.9 0 282) | #ffffff, #e8e8e8 |

## Structure (1440×900)

```
CARTE 245,9 1187×855 (bg #f9f9fa, bd 0.5px #e2e2e2, r 12px) — display flex, overflow hidden
├─ LISTE  245,9  400×855  flex-col · filet droit 0.5px #e2e2e2
│  ├─ en-tête 400×44 (filet bas 0.5px #e2e2e2, p 0 8px)
│  │   « Triage » h2 13px/500 #2f2f31 @263,23 · étoile 28×28 · à droite Filtre + Display 28×28 (gap 4px) @576,16
│  └─ défilement 400×811 bg #f9f9fa, p 8px 0
│      └─ 5 lignes : conteneur a 400×59 → div 384×59 (marges 8px) r 8px p 0 14px
│           └─ flex-col gap 6px, p 10px 0
│               ├─ ligne 1 (16px, flex gap 6px) : titre 13px/500 #1b1b1b tronqué (296px) · « OME-19 » 13px/450 ls −0.26px #5c5c5e aligné à droite
│               └─ ligne 2 (15px, flex gap 10px) : avatar 16×16 rond + « Wizyy » 12px/450 #5c5c5e · « 18min ago » 12px/450 #5c5c5e à droite
└─ DÉTAIL  645,9  787×855  flex-col
   ├─ en-tête 787×44 (filet bas 0.5px #e2e2e2, p 0 8px, flex gap 4px)
   │   ├─ fil : lien a 459×20 r 6px p 2px 4px → h2 13px/500 #2f2f31 « OME-19 Facture… » (identifiant en span inline-flex)
   │   ├─ étoile + « … » (28×28)
   │   └─ BARRE TRIAGE à droite @1294,16 : 4 boutons ronds 28×28, gap 6px :
   │       Accept issue from triage · Decline triage issue · Mark as duplicate · Snooze
   │       (bd 0.5px transparent, r 9999px, p 0 2px, icônes 14×14 fill #5c5c5e, pas de libellé texte)
   ├─ barre flottante 787×44 (p 8px 12px 8px 0) : à droite 3 boutons ronds bg #fff 28×28 (Copy URL…) + bouton double 57×28
   │   « Copy as prompt | Choose coding tool » (r 9999 0 0 9999 / 0 9999 9999 0)
   └─ corps défilant 787×811, p-right 14px → colonne 759px, p-top 21.75px, p-left 14px
       ├─ TITRE  659,112  759×32 : p contenteditable 24px / 600 / 32px, ls −0.16px, #1b1b1b (bloc p 6px 0)
       ├─ PROPRIÉTÉS 659,168 : rangée de pilules 24px, gap 6px, p 10px 0
       │    Triage 69 · Priority 74 · Assignee 86 · Project 73 · Labels 70 · cycle 32 (icône seule)
       │    bg #fff · bd 0.5px transparent · r 9999px · p 0 8px 0 6px · 12px/500 lh 12px ;
       │    libellé span 12px/450 (#2f2f31 si valeur, #5c5c5e si vide) ; icône 14×14
       ├─ DESCRIPTION textbox 787×74 (p 10px 14px 16px) → 15px / 450 / 24px, ls −0.1px, #2f2f31
       ├─ réactions + pièce jointe : 2 boutons ronds 28×28 @653,298
       ├─ « Add sub-issues » : bouton 126×24 r 9999 p 0 12px 0 6px, 12px/500, texte #5c5c5e (barre sticky 32px)
       ├─ « Activity » h3 15px / 600 / 23px #1b1b1b + « Unsubscribe » 98×32 (12px/500 #5c5c5e) + avatars 32×32
       ├─ événement : avatar 14×14, « Wizyy » 12px/500, « created the issue » 12px/450, lh 16.8px, #5c5c5e, « · » 600
       └─ BOÎTE COMMENTAIRE 651,496  775×83 : bg #fff · bd 0.5px #e8e8e8 · r 8px · p 12px 16px ·
            ombre lch(0 0 0/.02) 0 3px 6px -2px, lch(0 0 0/.04) 0 1px 1px 0 ;
            boutons 24×24 en bas à droite (trombone ; envoyer r 12px bg #fff)
```

## Panneau vide (avant ouverture)

À droite, centré (x 964, largeur 149) : illustration SVG 132×84, « 5 issues to triage » 13px/500 #2f2f31, bouton « Create triage issue » 143×24 bg #fff r 9999px p 0 8px 0 6px 12px/500, gap 12px entre texte et bouton, gap 18px avec l'illustration.

## Tableau des mesures (motifs regroupés)

| Élément | Nb | x,y | L×H | Typo | Couleur | Fond / bordure / rayon / padding |
|---|---|---|---|---|---|---|
| Colonne liste | 1 | 245,9 | 400×855 | — | — | bd-right 0.5px #e2e2e2 |
| En-tête (liste ou détail) | 2 | 245,9 | 400/787×44 | — | — | bd-bottom 0.5px #e2e2e2 · p 0 8px |
| Titre « Triage » (h2) | 1 | 263,23 | 39×16 | 13px/500 | #2f2f31 | — |
| Boutons ronds d'en-tête | 9 | — | 28×28 | 12px/500 | #2f2f31 | bd 0.5px transparent · r 9999px · p 0 2px · icône 14 fill #5c5c5e |
| Ligne de triage | 5 | 253,61+59n | 384×59 | — | #1b1b1b | r 8px · p 0 14px · fond via `::before` |
| Titre de ligne | 5 | 267,71 | 296×16 | 13px/500/normal | #1b1b1b | ellipsis |
| Identifiant OME-n | 5 | 568,71 | 54×16 | 13px/450 · ls −0.26px | #5c5c5e | — |
| Auteur + date | 10 | 289,93 | 35–58×15 | 12px/450 | #5c5c5e | avatar 16×16 r 50% |
| Titre d'issue | 1 | 659,112 | 759×32 | 24px/600/32px · ls −0.16px | #1b1b1b | — |
| Pilule de propriété | 6 | 659,168 | 32–86×24 | 12px/500 (span 450) | #5c5c5e / #2f2f31 | bg #fff · bd 0.5px transparent · r 9999 · p 0 8px 0 6px |
| Description | 1 | 659,227 | 753×42 | 15px/450/24px · ls −0.1px | #2f2f31 | — |
| « Activity » (h3) | 1 | 659,415 | 56×23 | 15px/600/23px | #1b1b1b | — |
| Boîte de commentaire | 1 | 651,496 | 775×83 | — | — | bg #fff · bd 0.5px #e8e8e8 · r 8px · p 12px 16px · ombre |

## États

- **Survol d'une ligne** : `.row:hover:not([data-selected=true] *) { --sx-tfzjps: var(--sx-1gxylln) }` → le `::before` (inset 0, r 8px) prend **lch(94.44 0.5 282) #efeff0**. Aucun changement de texte.
- **Ligne sélectionnée (ouverte à droite)** : `::before` **lch(92.94 0.5 282) #ebebec**, persistant hors survol.
- Les boutons ronds : fond transparent au repos, `:hover` → #f0f0f1 (même règle que sur toutes les pages Linear).

## À 390×844 (rechargé)

- **Liste seule** : 390 de large, lignes 374×59 (marges 8px), même typo ; pas de panneau de détail ni d'état vide à droite. Barre latérale remplacée par un bouton Menu 32×32. Boutons d'en-tête 32×32.
- **Issue ouverte** (URL directe) : plein écran ; l'en-tête devient `header` 390×44 p 0 12px 0 8px avec fil tronqué (74px) et **les 4 boutons Accept / Decline / Duplicate / Snooze 32×32 à droite** (gap 6px) ; pilules de propriétés à 28px de haut, qui passent sur **2 lignes** (Labels et cycle en dessous) ; « Unsubscribe » 98×36 ; boîte de commentaire 378×87 (marges 6px). La colonne de corps fait 362px (p-left 14px).

## Capture (décrite)

1. Carte blanc cassé coupée en deux : à gauche la liste « Triage » de 5 éléments (titre gras tronqué + OME-xx à droite, auteur et « 18min ago » en dessous), le premier surligné gris.
2. À droite, en-tête avec le fil « OME-19 Facture fournisseur… » et quatre petites icônes d'action (valider, refuser, doublon, reporter) à l'extrême droite.
3. Grand titre 24px en gras, rangée de pilules blanches (Triage, Priority, Assignee, Project, Labels), description en 15px, section « Activity » et boîte de commentaire blanche arrondie.
