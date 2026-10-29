# Relevé — Plain, Tasks (liste + détail TASK-1)

URLs : https://app.plain.com/workspace/w_01M625JFBKTE3BWN4ECASYHK2B/tasks/ et …/tasks/TASK-1/ (panneau de droite). Relevé le 29/10/2026 au `getComputedStyle`, fenêtre 1440×900 (px CSS). Rien modifié (aucune case cochée, aucun champ édité).

Notation : `fs/fw/lh`, `c` couleur, `bg` fond, `bd` bordure, `r` rayon, `p` padding.

## Police

- Corps : **Inter** variable (OFL). Graisse « medium » = 550 ; identifiants TASK-n en **475**.
- **Titre de page « Tasks » (h1) et titre de tâche dans le détail : `Whyte` 24px / 400 / 32px** — police commerciale (Dinamo, licence payante). Pour la recopie sans licence, il faut un substitut (aucune police libre identique ; à décider côté design).
- Jetons de couleur : identiques à la page tenant (voir plain-tenant.md) : texte #1f1f28 / #636370, icônes #8e8e9c / #adadb7, fills #f0f0f5 / #e7e7ef / #e0e0e9, bordures #e7e7ef / #e0e0e9, accent #525cdb / #5c67f4.

## Structure — liste (1440×900)

```
zone 345,0 1095×900 p 8px → CARTE 353,8 1079×884 bg #fff · r 12px · ombre 0 0 0 1px #20272c14, 0 1px 1px #20272c14
└─ colonne  flex-col · p 24px 24px 120px
   ├─ header 1079×56 (p 0 24px 24px) : h1 « Tasks » Whyte 24px/400/32px #1f1f28 @377,32
   └─ section
       ├─ barre d'onglets (sticky) 353,88  1079×49 · bg #fff · p 0 24px 12px · flex gap 16px · filet bas 1px #e0e0e9
       │   ├─ CONTRÔLE SEGMENTÉ 299×36 (r 8px, p 2px, gap 8px, piste #f0f0f5)
       │   │   My tasks 111×32 (actif, bg #e7e7ef) · Todo 84×32 · Done 85×32
       │   │   chaque onglet : icône 18×18 + libellé 14px/550/20px + compteur 12px/400/16px #636370 (gap 4px), p 0 8px, r 6px
       │   │   icônes : My tasks / Todo #448bff (case), Done #00ab5f (case cochée)
       │   └─ à droite : tri « Last updated » 131×34 · r 6px · p 8px · icône 18 #8e8e9c + 12px/550/16px #1f1f28
       └─ liste
           ├─ « Add new task  T » : bouton pleine largeur 1079×48 · grid [18px 1001px] gap 12px · p 12px 24px
           │     14px/550/20px #636370 ; touche « T » kbd 18×18 bg #fff bd 1px #e7e7ef r 4px 11px/550
           └─ ul → 4 li de 49px (filet haut 1px #e7e7ef, bg #fff)
                └─ ligne grid 1079×48 · grid-template-columns 18px 949px 40px · gap 8px 12px · p 0 24px
                    ├─ case statut 18×18 (r 6px ; icône carré arrondi bord #4a52d1 pour « To do »)
                    ├─ lien titre 925×20 : « TASK-4 » 12px / 475 / 16px #636370 puis titre 14px / 550 / 20px #1f1f28 (≈6px d'écart), ellipsis
                    └─ bouton « Assign to » 32×32 r 6px p 7px → avatar 18×18 **r 4px** (carré arrondi, bg #bbffed)
```

Contenu : TASK-4 Commander les menuiseries avant le 15/11 (Groupe scolaire Jean-Moulin) · TASK-3 Relancer la situation n° 4 impayée… · TASK-2 Noter la livraison du carrelage (Maison Rolland) · TASK-1 Confirmer le passage de l'électricien jeudi (Résidence Les Tilleuls).

## Structure — détail ouvert (TASK-1)

La carte passe en **2 colonnes** : liste 719px + **panneau 360px** (même gabarit que le volet « Details » du tenant).

```
liste 353,8 719×884 (tri, onglets → remplacés par un bouton menu « My tasks 4 » 121×34 + « Last updated »)
  ligne sélectionnée : li bg #fff + filet haut #f7f9ff ; ligne bg **#f7f9ff** (--color-background-blue-2), p 8px 24px
PANNEAU 1072,8 360×884  sticky · flex-col gap 16px · p 16px · bg #fff · aucune bordure gauche
├─ en-tête 328×32 : « TASK-1 » 12px/550/16px #636370 · à droite More + Close 32×32 (r 6px, p 7px, icône 18 #636370)
├─ rangée d'actions (flex gap 8px, retour à la ligne) :
│   ├─ case « To do » : label 58×18 ; case 18×18 bg #fff · bd 1.5px #4a52d1 · r 4px ; texte 12px/400/16px #1f1f28
│   ├─ bouton « (W) Assigned to me » 134×34 · r 6px · p 8px 12px 8px 8px · avatar 18 r 4px · 12px/400
│   └─ bouton « Handle with Agent » 152×34 · icône 18 #00ab5f · 12px/550/16px
├─ TITRE : textarea 328×98 · **Whyte 24px / 400 / 32px** #1f1f28 (placeholder « Task title »)
├─ « Created 17min ago » 14px/400/20px #636370 (gap 4px sous le titre)
├─ DESCRIPTION : textarea 328×64 · Inter 14px/400/20px #1f1f28 · p-top 4px (placeholder « Add optional description ») · p-bottom bloc 24px
└─ PROPRIÉTÉS : dl grid · gap 4px 16px · colonne libellé ≈90px, valeur 222px
    dt « Tenant », « Threads », « Knowledge gap » 12px / 550 / lh 32px #636370
    dd = boutons 230×34 r 6px p 8px 12px 8px 8px (icône 18 #8e8e9c + 12px/400 #636370) ; « No linked knowledge gap » texte simple
```

## Tableau des mesures (motifs regroupés)

| Élément | Nb | x,y | L×H | Typo | Couleur | Fond / bordure / rayon / padding |
|---|---|---|---|---|---|---|
| Titre de page h1 | 1 | 377,32 | 64×32 | **Whyte 24/400/32** | #1f1f28 | — |
| Barre d'onglets | 1 | 353,88 | 1079×49 | — | — | bg #fff · bd-bottom 1px #e0e0e9 · p 0 24px 12px |
| Onglet actif | 1 | 369,90 | 111×32 | 14/550/20 | #1f1f28 | bg #e7e7ef · r 6px · p 0 8px · gap 8px |
| Onglet inactif | 2 | 488,90 | 84–85×32 | 14/550/20 | #636370 | r 6px |
| Compteur d'onglet | 3 | 464,99 | 8×16 | 12/400/16 | #636370 | — |
| Bouton de tri | 1 | 1277,89 | 131×34 | 12/550/16 | #1f1f28 | r 6px · p 8px |
| Ligne « Add new task » | 1 | 353,137 | 1079×48 | 14/550/20 | #636370 | p 12px 24px |
| kbd « T » | 1 | 506,154 | 18×18 | 11/550 | #636370 | bg #fff · bd 1px #e7e7ef · r 4px · p 0 2px |
| li de tâche | 4 | 353,185+49n | 1079×49 | — | — | bg #fff · bd-top 1px #e7e7ef |
| Ligne de tâche (grid) | 4 | 353,186 | 1079×48 | — | — | cols 18/1fr/40 · gap 8px 12px · p 0 24px |
| ID TASK-n | 4 | 407,206 | 40–43×15 | 12/475/16 | #636370 | — |
| Titre de tâche | 4 | 407,202 | 925×20 | 14/550/20 | #1f1f28 | ellipsis |
| Avatar assigné | 4 | 1383,203 | 18×18 | — | — | r 4px |
| Panneau détail | 1 | 1072,8 | 360×884 | — | — | bg #fff · p 16px · gap 16px |
| Titre de tâche (détail) | 1 | 1088,160 | 328×98 | **Whyte 24/400/32** | #1f1f28 | textarea sans bordure |
| Description (détail) | 1 | 1088,294 | 328×64 | 14/400/20 | #1f1f28 | p-top 4px |
| dt | 3 | 1088,431 | 40–90×34 | 12/550/32 | #636370 | — |
| Bouton valeur | 2 | 1186,431 | 230×34 | 12/400/16 | #636370 | r 6px · p 8px 12px 8px 8px |

## États

- **Survol d'une ligne** (mesuré) : `.row:hover { background: #f0f0f5 }` sur la ligne grid (le li reste blanc).
- **Ligne sélectionnée** (tâche ouverte) : ligne bg **#f7f9ff**, filet haut du li #f7f9ff, padding vertical 8px.
- **Onglet actif** : bg #e7e7ef ; survol d'un inactif : texte → #1f1f28 sans fond.
- **Focus clavier** sur une ligne : `li:has(:focus-visible) { box-shadow: 0 0 0 2px #525cdb; z-index:1 }`.
- Piège relevé : juste après le chargement, la barre d'onglets a brièvement `border-bottom: 3px solid #1f1f28` (animation d'entrée) ; la valeur stable est **1px #e0e0e9**.

## À 390×844 (rechargé)

- Barre latérale hors écran ; carte plein écran, colonne p 16px 16px 120px.
- **Le contrôle segmenté My tasks / Todo / Done disparaît** : remplacé par un bouton menu « My tasks 4 » 121×34 (+ tri « Last updated » 131×34 à droite).
- Lignes : grid `18px 260px 40px`, p 8px 24px, titre tronqué à 236px.
- **Détail TASK-1** : le panneau devient une feuille plein écran (fixed, z-index 1000, 390×844, p 16px), en-tête « Tasks » h2 + More / Close / Hide sidebar 32×32 ; le bouton « Handle with Agent » n'apparaît plus dans la rangée d'actions ; titre textarea 358×98 ; dl à colonnes ≈90 + 252px.

## Capture (décrite)

1. Carte blanche : « Tasks » en Whyte 24px, contrôle segmenté « My tasks 4 · Todo 4 · Done 0 » (le premier en pastille grise), tri « Last updated » à droite, filet gris dessous.
2. Ligne « + Add new task  T » grisée, puis 4 lignes de 48px séparées par des filets #e7e7ef : case bleue, « TASK-4 » gris petit, titre gras 14px, avatar carré vert à droite.
3. Détail : panneau blanc de 360px à droite, « TASK-1 » en gris, case « To do », boutons « Assigned to me » et « Handle with Agent », gros titre Whyte 24px sur 3 lignes, description, puis Tenant / Threads / Knowledge gap.
