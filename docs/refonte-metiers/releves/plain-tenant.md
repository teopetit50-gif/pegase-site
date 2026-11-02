# Relevé — Plain, page d'un tenant (aujourd'hui « account »)

Complété le 01/11/2026 sur une fiche **remplie** : « Agence Immobilière Créole »
https://app.plain.com/workspace/w_01M625JFBKTE3BWN4ECASYHK2B/threads/tenants/te_01M6CTZVR1QD9DA3BBWC61MPTR/ (`?tab=customers|tasks|themes|issues`).
La première partie (01/11) décrit la fiche pleine ; la suite (29/10, fiche vide « Peintures Giraud SARL ») reste valable pour la
coque, l'en-tête, le contrôle segmenté et le volet, et est gardée telle quelle. Jetons clair/sombre : `plain-commun.md`.

## 01/11 — ce qui a été créé pour cette fiche

Compte `omega-fx-09` (tier Entreprise, champs Ville / MRR / Renouvellement / Contrat actif / Modules remplis) ; 12 clients rattachés
(dont « Emily Johnson », client de démonstration de Plain, rattaché par erreur de tri — sans conséquence) ; 4 fils ouverts ; 6 tâches
(« Envoyer le mandat de gestion signé », « Relancer la facture de syndic d'octobre », … « Clôturer le litige du lot 14 ») + 2 tâches générales.

## 01/11 — la fiche pleine (1440×900, clair)

```
CARTE 353,8 1079×884
├─ COLONNE 353,8 719×884
│  ├─ header 719×109 : « ← Accounts » (a 97×32) ; vignette 24 + nom (input, tronqué « Agence Immobilière Cre ») ;
│  │   méta « 12min ago by (W) You » 12/400/16 #636370 (« You » 12/550) ; à droite Favori · ⋯ · « Hide sidebar » 32×32
│  ├─ barre d'onglets 719×72 : segmenté 382×36 (Threads 72 · Customers 90 · Tasks 55 · Themes 70 · Issues 59)
│  │   + selon l'onglet : « Filters F » 100×34 + « Display V » 106×34 (Threads) · « Add customer + » 121×34 (Customers)
│  └─ contenu
│      Threads  : liste de fils, une ligne = 67 px (composant de la liste Threads, voir plain-threads.md) ; la ligne fait 897 px
│                 de large et déborde de la colonne de 719 (barre de défilement horizontale en bas de la colonne) ;
│                 liste p-bottom 66px ; filet haut 1px #e7e7ef
│      Customers: recherche 687×40 « Search customers » (p 12px 16px) puis ul ; ligne li 719×64 → a p 16px 32px gap 10 :
│                 avatar 24×24 r 6px (::before couleur générée, ex. #149d85, initiale 9,6/550 #bbffed)
│                 + nom 14/550/20 #1f1f28 + courriel 14/400/20 #636370 (gap ~6, même ligne) + bouton × 32×32 à droite (#636370)
│      Tasks    : ul ; ligne li 719×81 · bg #fff · bd-top 1px #e7e7ef
│                 case 18×18 @x 377 (r 6px ; à faire = carré arrondi #448bff, faite = carré plein coché #00ab5f)
│                 ligne 1 @x 407 : « TASK-43 » 12/475/16 #636370 + titre 14/550/20 #1f1f28
│                 ligne 2 (y +34) : pastille compte (vignette 18 + nom 12/400/20, r 6px, contour) 
│                 à droite : avatar assigné 18 dans un bouton 32×32 (pastille d'état 4,5 px)
│                 Ordre observé : à faire puis faites ; les tâches IN_PROGRESS / CANCELLED n'apparaissent pas dans cet onglet.
│      Themes   : vide — « No themes for this account » 14/550 · « No current themes related to this account. New themes
│                 are generated daily. » 14/400 #636370 (384 de large) · bouton « View all themes » 12/550
│      Issues   : vide — « No issues » · « No issues are currently linked to threads from this account. »
├─ poignée de redimensionnement 1067,8 10×884 (cursor ew-resize) entre colonne et volet
└─ VOLET DETAILS 1072,8 360×884 · bg #fff
    « Details » 14/550/20 ; pile 360×486 bg #e0e0e9 gap 1px :
    bloc 1 (p 0 16px 16px) — Reference ID « omega-fx-09 » geistMono 12/400/16 · Tier (pastille « Entreprise ») · Slack channels « Add Slack channel + »
    bloc 2 (p 16px) — « Domains » 12/550 · Primary domain « example.com » · Alternate domains · Auto-link customers « ● Off »
    bloc 3 (p 16px) — « Account fields » + bouton réglage 24×24 · Ville · MRR (€) · Renouvellement « Dec 31, 2025, 8:00 PM AST » ·
                      Contrat actif (interrupteur 28×18 r 18px bg #5c67f4 + « Yes ») · Modules « FILED »
    ligne : libellé 131×28 (p 6px 16px 6px 0, 12/550/16 #1f1f28, icône info 14 #adadb7) + valeur 203×28–32 (p 8px 6px ou 4px 6px, r 8px, 12/400/20)
```

Sombre : volet #1a191b, pile (filets) #323035, piste du segmenté #232225, onglet choisi #2b292d, textes #eeeef0 / #b5b2bc,
interrupteur #5c67f4 inchangé.

À 390 : la fiche ouvre le **volet Details en plein écran** par-dessus (sans le titre « Details ») ; le segmenté passe sur
2 lignes (262×76 : Threads 76 · Customers 90 · Tasks 76 / Themes 125 · Issues 125).

Captures 01/11 (`captures/plain-tenant/`) : `1440-clair.png` (onglet Threads) · `1440-sombre.png` · `1440-clair-onglet-customers.png` ·
`1440-clair-onglet-tasks.png` · `390-clair.png` · `390-sombre.png`.

## 29/10 — relevé d'origine (fiche vide, toujours valable pour la coque)

URL : https://app.plain.com/workspace/w_01M625JFBKTE3BWN4ECASYHK2B/threads/tenants/te_01M626AQX8A2GETM0CTVT596T1/?tab=tasks. Relevé le 29/10/2026 au `getComputedStyle`, fenêtre 1440×900 (px CSS).

Notation : `fs/fw/lh` taille/graisse/interligne, `c` couleur, `bg` fond, `bd` bordure, `r` rayon, `p` padding. Couleurs Plain directement en hex.

## Police

- `font-family` calculée : `Inter, -apple-system, sans-serif` (variable `--_1q7zg2ub`).
- `@font-face` de l'app : **Inter** (`/fonts/inter-variable.woff2`, 100–900, SIL OFL, libre), **geistMono** (`/fonts/geistmono-variable.woff2`, 100–900, Geist Mono de Vercel, SIL OFL, libre), **Whyte** (`/fonts/whyte-regular.woff2`, 400) — Whyte est une police **commerciale de Dinamo, sous licence payante** ; sur cette page elle ne sert qu'au titre de la carte « Next steps » de la barre latérale. Rien à acheter pour recopier la zone principale.
- Graisse « medium » de Plain = **550** (pas 500). Texte courant 14px/20px.
- geistMono 12px/16px pour les identifiants (Reference ID « C-GIRAUD »).

## Jetons (`:root`)

| Variable | Valeur |
|---|---|
| `--color-text-neutral-1` | #1f1f28 (texte principal) |
| `--color-text-neutral-2` | #636370 (texte secondaire) |
| `--color-icon-neutral-1 / -2` | #8e8e9c / #adadb7 |
| `--color-background-neutral-1 / -2` | #ffffff / #f9f9fc (fond de l'app derrière la carte) |
| `--color-fill-neutral-1 / -2 / -3` | #f0f0f5 / #e7e7ef / #e0e0e9 |
| `--color-border-neutral-1 / -2 / -3` | #e7e7ef / #e0e0e9 / #cdcddb |
| `--color-solid-blue-1 / -2` | #5c67f4 / #525cdb (accent, anneau de focus) |
| `--color-text-blue-2` | #4a52d1 |
| Ombre de carte (`--_1q7zg2u79`) | `0 0 0 1px #20272c14, 0 1px 1px 0 #20272c14` |
| Anneau de focus (`--_1q7zg2u6x`) | `0 0 0 2px #525cdb` |
| Ombre de popover (`--_1q7zg2u7c`) | `#20272c14 0 1px 2px, … 0 16px 32px, #20272c29 0 32px 64px` |

## Structure (1440×900)

```
fond de l'app #f9f9fc
├─ barre latérale Plain  0,0  345×900 (rail d'icônes 56 + panneau 289) — non relevée
└─ zone  345,0  1095×900  p 8px
   └─ CARTE  353,8  1079×884  bg #ffffff · r 12px · ombre 0 0 0 1px #20272c14, 0 1px 1px #20272c14 · overflow hidden
      ├─ COLONNE PRINCIPALE  353,8  719×884  flex-col · p 24px 24px 0 · overflow auto
      │  ├─ header  353,32  719×109  flex gap 24px · p 0 24px 24px
      │  │   ├─ bloc titre flex-col gap 4px
      │  │   │   ├─ LIEN RETOUR « ← Tenants » a 88×32 @369,32 : 12px / 550 / lh 32px · #1f1f28 · r 4px · p 0 8px · flèche 18×18 #1f1f28
      │  │   │   │     (décalé de −8px pour aligner le texte sur la colonne)
      │  │   │   └─ grid gap 12px : vignette 24×24 r 6px (icône 14 #8e8e9c)
      │  │   │       + TITRE = champ input « Tenant name » 197×32 : 16px / 550 / 20px · bd 1px transparent · r 6px · p 5px 8px
      │  │   │       + ligne méta « 18h ago by (W) You » 12px/400/16px #636370 (« You » 550, avatar 14×14 rond bg #bbffed)
      │  │   └─ ACTIONS à droite @948,32 : 3 boutons 32×32 r 6px p 7px (gap 2px) :
      │  │       Favori (icône #adadb7), More (#636370), Hide sidebar (#636370) — icônes 18×18 en trait
      │  └─ section  353,141  719×751
      │      ├─ barre d'onglets (sticky) 719×73 · bg #fff · p 24px 24px 12px · flex gap 16px · filet bas 1px #e0e0e9
      │      │   ├─ CONTRÔLE SEGMENTÉ radiogroup 382×36 @377,165 : r 8px · p 2px · gap 8px · piste = ::before bg #f0f0f5
      │      │   │    5 boutons radio 32px de haut, r 6px, p 0 8px :
      │      │   │    Threads 72 · Customers 89 · Tasks 55 · Themes 70 · Issues 59
      │      │   │    libellé 14px / 550 / 20px (doublé en grille pour figer la largeur)
      │      │   └─ à droite selon l'onglet : « Filters F » 100×34 + « Display V » 106×34 (Threads) ou « Add customer » 121×34 (Customers)
      │      └─ contenu de l'onglet (vide ici) : carte d'état vide 450×114 centrée, bg #fff · bd 1px #e7e7ef · r 10px · p 32px · gap 16px
      │           titre « No tasks » 14px/550/20px #1f1f28 · texte 14px/400/20px #636370 (gap 8px)
      └─ VOLET « DETAILS »  1072,8  360×884  sticky · flex-col gap 16px · p 16px · bg #fff · overflow auto (aucune bordure gauche)
          ├─ « Details » h2 14px / 550 / 20px #1f1f28
          └─ pile de blocs 360×318 · bg #e0e0e9 · gap 1px (le gap dessine des filets de 1px entre blocs pleine largeur)
              ├─ bloc 1 (p 0 16px 16px) : 4 lignes 28px, gap 4px
              │    libellé 131px (p 6px 16px 6px 0, 12px/550/16px #1f1f28, icône info 14 #adadb7)
              │    + valeur 203×32 r 8px p 8px 6px : Reference ID « C-GIRAUD » geistMono 12px ; Tier « Add tier », Slack channels « Add Slack channel » 12px/400 #636370
              ├─ bloc 2 « Domains » (p 16px, titre 12px/550, gap 12px) : Primary domain, Alternate domains (inputs 12px), Auto-link customers « Off »
              └─ bloc 3 (p 16px) : « No tenant fields to show » 10px/400/12px #636370 + bouton réglage 24×24 r 6px p 5px
```

Note : il n'y a **pas d'onglets verticaux** sur cette page dans ce compte : Threads / Customers / Tasks / Themes / Issues forment un **contrôle segmenté horizontal** au-dessus du contenu. La seule navigation verticale est la barre latérale de Plain.

## Tableau des mesures (motifs regroupés)

| Élément | Nb | x,y | L×H | Typo | Couleur | Fond / bordure / rayon / padding |
|---|---|---|---|---|---|---|
| Carte | 1 | 353,8 | 1079×884 | Inter 14/400/20 | #1f1f28 | bg #fff · r 12px · ombre 1px #20272c14 + 0 1px 1px |
| Lien retour « Tenants » | 1 | 369,32 | 88×32 | 12px/550/32px | #1f1f28 | r 4px · p 0 8px |
| Titre (input) | 1 | 405,68 | 197×32 | 16px/550/20px | #1f1f28 | bd 1px transparent · r 6px · p 5px 8px |
| Méta « 18h ago by You » | 1 | 413,98 | 197×19 | 12px/400/16px | #636370 | — |
| Bouton icône d'en-tête | 3 | 948,32 | 32×32 | — | #adadb7 / #636370 | r 6px · p 7px · icône 18×18 |
| Barre d'onglets | 1 | 353,141 | 719×73 | — | — | bg #fff · bd-bottom 1px #e0e0e9 · p 24px 24px 12px |
| Piste du segmenté | 1 | 377,165 | 382×36 | — | — | ::before bg #f0f0f5 · r 8px · p 2px · gap 8px |
| Onglet actif | 1 | 556,167 | 55×32 | 14px/550/20px | #1f1f28 | bg #e7e7ef · r 6px · p 0 8px |
| Onglet inactif | 4 | 379,167 | 59–89×32 | 14px/550/20px | #636370 | transparent · r 6px · p 0 8px |
| Bouton « Filters F » / « Display V » | 2 | 834,166 | 100–106×34 | 14px/400 (texte 12–14) | #1f1f28 | r 6px · p 8px 12px 8px 8px |
| Touche raccourci (F, V) | 2 | 904,174 | 18×18 | 11px/550/16px | #636370 | bg #fff · bd 1px #e7e7ef · r 4px · p 0 2px |
| Bouton « Add customer » | 1 | 927,166 | 121×34 | 14px/400 | #1f1f28 | bg #fff · r 6px · p 8px 8px 8px 12px · ombres internes (voir ci-dessous) |
| Champ « Search customers » | 1 | 369,226 | 687×40 | 14px/400/20px | #1f1f28 | bg #fff · bd 1px transparent · r 6px · p 9px 12px 9px 38px · loupe 18 #8e8e9c |
| Carte d'état vide | 1 | 488,270 | 450×114 | 14px | #1f1f28 / #636370 | bg #fff · bd 1px #e7e7ef · r 10px · p 32px |
| Volet Details | 1 | 1072,8 | 360×884 | — | — | bg #fff · p 16px · gap 16px |
| Titre « Details » | 1 | 1088,24 | 46×20 | 14px/550/20px | #1f1f28 | — |
| Pile de blocs | 1 | 1072,60 | 360×318 | — | — | bg #e0e0e9 · gap 1px |
| Libellé de propriété | 4+ | 1088,66 | 23–131×16 | 12px/550/16px | #1f1f28 | colonne 131px |
| Valeur vide (« Add tier ») | 3 | 1219,98 | 45–328×16 | 12px/400/16px | #636370 | case r 8px · p 8px 6px |
| Identifiant | 1 | 1219,66 | 191×16 | geistMono 12px/400/16px | #1f1f28 | — |

Bouton secondaire Plain (« Add customer » dans l'état vide, 145×40) : bg #fff, r 6px, p 10px 12px 10px 16px, `box-shadow: rgba(22,26,38,.08) 0 0 0 1px inset, rgba(255,255,255,.2) 0 0 3px 1px inset, rgba(0,0,0,.12) 0 -1px 2px 0 inset` (bord dessiné en ombre interne, léger creux en bas).

## États

- **Onglet actif** : bg #e7e7ef, texte #1f1f28.
- **Onglet survolé** (mesuré) : pas de fond ; le texte passe de #636370 à **#1f1f28** (règle `:hover:not(:disabled) { opacity:1; color: #1f1f28; font-weight: 550 }`).
- **Lien retour survolé** : `background: #f0f0f5; color: #1f1f28` et `transform: scale(0.985)` (transition 75ms ease-in-out).
- **Focus clavier** (boutons, liens) : `box-shadow: 0 0 0 2px #525cdb`, r 4px, et `scale(0.985)`.

## À 390×844 (rechargé)

- Barre latérale **hors écran** (fixed, x −345) ; un bouton flottant 64×64 en bas à droite (pastille ronde 32×32 bg #5c67f4) apparaît.
- La carte perd sa marge de 8px et son rayon : contenu plein écran, p 16px 16px 0.
- En-tête : titre 197px, actions 32×32 à droite (274/308/342).
- **Contrôle segmenté sur 2 lignes** (350×76) : Threads, Customers, Tasks, Themes puis Issues en dessous ; barre d'onglets 113px de haut.
- Carte vide 310×134 (marges 16px + 24px).
- **Le volet Details devient une feuille plein écran** (fixed, z-index 1000, 390×844) posée au-dessus du contenu, avec en tête le rappel du titre et « Hide sidebar » ; pile de blocs 390 de large.

## Capture (décrite)

1. Fond gris bleuté très clair, grande carte blanche arrondie 12px ; en haut à gauche « ← Tenants », puis l'icône et « Peintures Giraud SARL » en 16px gras, « 18h ago by You » en gris.
2. Sous le titre, contrôle segmenté gris clair « Threads · Customers · Tasks · Themes · Issues » avec « Tasks » en pastille plus foncée ; au centre une petite carte bordée « No tasks ».
3. À droite, volet « Details » de 360px : lignes libellé/valeur (Reference ID en monospace « C-GIRAUD », Tier, Slack channels), bloc « Domains », filets gris de 1px entre blocs.
