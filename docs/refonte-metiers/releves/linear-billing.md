# Relevé — Linear, Settings › Billing

URL : https://linear.app/omegaaii/settings/billing — relevé le 29/10/2026 au `getComputedStyle` / `getBoundingClientRect`, fenêtre 1440×900 (px CSS), thème clair. Aucun bouton cliqué (ni « Upgrade now », ni « Switch plan », ni « View all plans »).

Notation : `fs/fw/lh`, `c` couleur, `bg` fond, `bd` bordure, `r` rayon, `p` padding. Couleurs lch() converties en hex.

## Police

Inter Variable (100–900). Particularités des pages Settings : **titre de page 24px / 500 / 32px, letter-spacing −0.16px** ; titre de carte « Free plan » **15px / 500 / 24px, ls −0.009px** ; titre de section h3 « Recent invoices » 15px / 500 / 23px. Texte d'aide 13px / 450 / **22px** ; textes secondaires 12px / 450 / normal.

## Structure (1440×900)

```
html bg #efeff0 · barre latérale Settings à gauche (0–244, non relevée ici)
└─ main (CARTE)  244,8  1188×856  bg #f9f9fa · bd 0.5px #e2e2e2 · r 12px · ombre #000/.02 0 3px 6px -2px, #000/.04 0 1px 1px
   ├─ bande haute vide 1187×64 (pas d'en-tête de carte sur les pages Settings)
   └─ zone 285,73  1107×727 (p 0 40px), flex column align center
       └─ COLONNE  518,73  640×563 (largeur fixe 640, centrée)
           ├─ EN-TÊTE 640×60, p 0 16px, flex column gap 4px
           │   ├─ « Billing » 24/500/32 ls −0.16px #1b1b1b @534,73
           │   └─ ligne 608×24 : « For questions about billing, contact us » 13/450/22 #5c5c5e
           │        lien « contact us » #1b1b1b, p 1px 4px, r 8px, sans soulignement
           │        bouton « All plans ↗ » 84×24 à droite @1064,109 (12/500 #2f2f31, r 9999px, p 0 6px 0 8px, icône 14)
           ├─ (32px)
           ├─ fieldset « plan » 640×324, flex column gap 12px  @y165
           │   ├─ CARTE PLAN ACTUEL   640×74.5  @165
           │   ├─ CARTE MISE À NIVEAU 640×152.5 @251
           │   └─ CARTE USAGE         640×65    @424
           ├─ (gap 48px entre fieldsets ; le 2e a p-top 12px)
           └─ fieldset « Recent invoices » 640×111 @525, gap 16px
               ├─ h3 « Recent invoices » 15/500/23 #1b1b1b @534,537 (bloc p 0 16px)
               └─ CARTE 640×60 @576 : « No invoices yet » 13/450 #5e5e60 @534,598
```

### Les cartes (section)

Toutes : `bg #ffffff · r 10px · p 0` (le padding est dans les enfants, 16px).
- Ombre standard : `0 0 0 0.5px #000/.09, 0 3px 6px -2px #000/.02, 0 1px 1px #000/.04`.
- **Exception carte « Free plan » : pas d'anneau 0.5px** (seulement les 2 ombres douces).

**1. Plan actuel** (640×74.5)
```
flex space-between, p 16px
├─ gauche flex column gap 4 : « Free plan » 15/500/24 ls −0.009px #1b1b1b
│                             « Free for all users · 1 user » 12/450 #5e5e60
└─ bouton « Switch plan » 84×24 @1050,190 : 12/500 #303032, bd 0.5px transparent, r 9999px, p 0 8px (sans fond)
```

**2. Mise à niveau** (640×152.5) — `ul`
```
li (rangée haute) 640×69 · flex space-between · gap 12 · p 16px · r 10px 10px 0 0
├─ « Upgrade to Basic plan » 13/500 #1b1b1b (label) @534,267
│   dessous (+4) : « $12 » + « per user/mo » 12/450 #5e5e60, gap 4
└─ boutons 32px de haut, gap 8, @912 / 1030 :
    « View all plans » 110×32 : 13/500 #303032, bd 0.5px transparent, r 9999px, p 0 12px (fond transparent)
    « Upgrade now »    108×32 : 13/500 #fffeff, **bg #6d78d5**, r 9999px, p 0 12px, ombre `0 3px 6px -2px #000/.02, 0 1px 1px #000/.04`
GRILLE DE FONCTIONNALITÉS 640×83.5 : flex row **wrap**, p 8px ; 9 items de **205.9px** (3 par ligne), pas 22.5px
    item : flex gap 4, p 4px 8px → coche 12×12 **#6d78d5** + texte 12/450 #5e5e60 (ellipsis)
    colonnes x 534 / 740 / 946 ; lignes y 332 / 355 / 377
    « 5 teams · Unlimited file upload size · Unlimited issues · Admin roles · Guided reviews · Loops ·
      Third-party app management · Restrict new user invitations · Restrict agent invocation… »
```

**3. Usage** (640×65) — c'est un lien `<a>` qui enveloppe un `li`
```
li p 16px, flex space-between
├─ flex column gap 3 : « Usage » 13/500 #1b1b1b (580px) / « $0.00 remaining » 12/450 #5e5e60
└─ chevron droit 16×16 #5e5e60 @1126,448
```

**4. Recent invoices** : carte 640×60, texte « No invoices yet » 13/450 #5e5e60 à p 16px (centré verticalement, y+22).

## Tableau des mesures

| Élément | x,y | L×H | Typo | Couleur | Fond / bordure / rayon / padding / ombre |
|---|---|---|---|---|---|
| Titre « Billing » | 534,73 | 608×32 | 24/500/32 · ls −0.16px | #1b1b1b | — |
| Texte d'aide | 534,110 | 239×22 | 13/450/22 | #5c5c5e | — |
| Lien « contact us » | 700,112 | 73×17.5 | 13/450/22 | #1b1b1b | p 1px 4px · r 8px |
| Bouton « All plans » | 1064,109 | 84×24 | 12/500 | #2f2f31 | bd 0.5px transparent · r 9999px · p 0 6px 0 8px |
| Carte | 518 | 640×var | — | — | bg #fff · r 10px · ombre anneau 0.5px #000/.09 + douces |
| Titre plan | 534,181 | 66×24 | 15/500/24 · ls −0.009px | #1b1b1b | — |
| Sous-texte plan | 534,209 | 139×14.5 | 12/450 | #5e5e60 | — |
| « Switch plan » | 1050,190 | 84×24 | 12/500 | #303032 | r 9999px · p 0 8px |
| « Upgrade to Basic plan » | 534,267 | 137×15.5 | 13/500 | #1b1b1b | — |
| « View all plans » | 912,270 | 110×32 | 13/500 | #303032 | r 9999px · p 0 12px |
| « Upgrade now » | 1030,270 | 108×32 | 13/500 | #fffeff | bg #6d78d5 · r 9999px · p 0 12px |
| Item de fonctionnalité | 526+206n | 206×22.5 | 12/450 | #5e5e60 | p 4px 8px · gap 4 · coche 12 #6d78d5 |
| Titre « Usage » | 534,440 | 580×15.5 | 13/500 | #1b1b1b | — |
| Chevron | 1126,448 | 16×16 | — | #5e5e60 | — |
| h3 « Recent invoices » | 534,537 | 608×23 | 15/500/23 | #1b1b1b | — |
| « No invoices yet » | 534,598 | 608×15.5 | 13/450 | #5e5e60 | — |

## États

- **Survol de la carte Usage** : le `li` prend **bg lch(96.5 0 282) = #f5f5f5** (r 10px, transition `all`). Le reste ne bouge pas.
- Les boutons sans fond (« Switch plan », « View all plans », « All plans ») suivent le composant bouton de Linear : au survol fond #f0f0f1 et texte #1b1b1b (même règle que les autres pages, non re-mesuré ici).

## À 390×844 (rechargé)

- Barre latérale masquée ; en-tête 390×44 (p 0 15px, gap 8) : bouton Menu 32×32 @15,6 + lien « ‹ Settings » 15px @55,10.
- Colonne 346px @22 (marges 22px) ; l'en-tête garde p 0 16px.
- Texte d'aide sur 2 lignes (228×36) ; « All plans » 84×**28** à droite @274,100.
- Gap entre fieldsets 48 → **24px**.
- Cartes 346 de large, padding intérieur ≈ 11px (texte @33).
- Mise à niveau 346×197 : les deux boutons passent **sous** le titre, hauteur **36px**, poussés aux deux bords (« View all plans » @21, « Upgrade now » @249) ; la grille garde **3 colonnes** de 109px (textes tronqués à 77px).
- « Switch plan » 84×28 ; chevron Usage @341.
