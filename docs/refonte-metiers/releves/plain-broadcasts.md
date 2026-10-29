# Relevé — Plain, Broadcasts (liste + brouillon)

URLs : https://app.plain.com/workspace/w_01M625JFBKTE3BWN4ECASYHK2B/broadcasts/ puis clic sur « Avenant n° 3 — Résidence Les Tilleuls » → …/broadcasts/bc_01M644VHVSQ35C3PMB3DNZXFRK/. Relevé le 29/10/2026 au `getComputedStyle`, fenêtre 1440×900 (px CSS). Rien enregistré ni envoyé (Save / Save and continue non cliqués).

Notation : `fs/fw/lh`, `c` couleur, `bg` fond, `bd` bordure, `r` rayon, `p` padding.

## Police

- Inter (OFL) pour tout le texte courant ; medium = 550.
- **Whyte** (commerciale, Dinamo) : h1 « Broadcasts » **20px / 400 / 28px** (plus petit que « Tasks » 24/32) ; dans le brouillon : champ titre 14px / **475** / 20px et pastille « Draft » 12px/475/12px.
- Jetons : voir plain-tenant.md (texte #1f1f28 / #636370, fills #f0f0f5 / #e7e7ef / #e0e0e9, bordures #e7e7ef / #e0e0e9).

## A. Liste — structure (1440×900)

```
CARTE 353,8 1079×884 bg #fff · r 12px · ombre 0 0 0 1px #20272c14, 0 1px 1px #20272c14 · p 24px 24px 0
├─ header 1079×58 · p 0 24px 24px · flex gap 24px
│   ├─ h1 « Broadcasts » Whyte 20/400/28 #1f1f28 @377,38
│   └─ bouton PRIMAIRE « + New broadcast » 127×34 @1281,32
│        bg #1f1f28 · c #fff · r 6px · p 8px 12px 8px 8px · icône 18 + 12px/550/16px
│        ombre : #20272c3d 0 1px 2px, #20272c14 0 2px 6px 2px, #20272c14 0 2px 8px, #20272c0a 0 1px 1px,
│                inset #0000001f 0 -1px 1px 1px, inset #ffffff1f 0 1px 2px
├─ ONGLETS D'ÉTAT : contrôle segmenté 437×36 @377,90 (r 8px, p 2px, gap 8px, piste #f0f0f5)
│     Draft 3 (83, actif bg #e7e7ef) · Scheduled 0 (121) · In progress 0 (125) · Sent 0 (80)
│     onglet : 32px, p 0 8px, r 6px, gap 8px ; icône 18×18 #8e8e9c ; libellé 14/550/20 ; compteur 12/400/16 #636370 (gap 4px)
│     (pas de filet sous les onglets ici, 16px d'air avant le tableau)
└─ TABLEAU  353,142  1079×…  (table HTML, pas de bordure extérieure)
    colonnes : Name 528 · Created by 95 · Send from 172 · Audience 122 · Last edited 98 · Actions 64
    ├─ thead : th 32px de haut, bg #fff, sticky, p 8px 16px (1re : 8px 16px 8px 24px ; dernière : 8px 24px 8px 16px)
    │    libellé 12px / 550 / 16px #636370 ; filet bas = box-shadow inset 0 −1px 0 #e7e7ef
    └─ tbody : 3 lignes de 57px (tr bd-bottom 1px #e7e7ef, sauf la dernière)
         ├─ Name : td p 16px 16px 16px 24px, bg #fff, **sticky** → titre 14px/550/20px #1f1f28, ellipsis
         ├─ Created by : avatar 18×18 r 4px + « You » 14px/400 #636370 (grid gap 8px)
         ├─ Send from : logo 18×18 r 4px + « omega » 14px/400 #1f1f28
         ├─ Audience : « All customers » 14px/400 #636370
         ├─ Last edited : « 17min ago » 14px/400 #636370
         └─ Actions : bouton « More » 24×24 r 6px p 5px, icône 14 #636370
         chaque cellule est recouverte d'un lien absolu plein cadre (ligne entièrement cliquable)
```

Lignes : « Avenant n° 1 — Maison Rolland », « Situation n° 4 — Local commercial Part-Dieu », « Avenant n° 3 — Résidence Les Tilleuls ».

## B. Brouillon — structure (1440×900)

```
CARTE 353,8 1079×884 · p 24px 24px 0
├─ header 1079×57 · p 0 24px 24px · filet bas 1px #e0e0e9
│   ├─ gauche (flex gap 12px) : bouton retour 32×32 (r 6px, p 7px, icône 18 #636370)
│   │     + pastille « Draft » 46×24 bg #f0f0f5 r 4px p 6px 8px (Whyte 12/475/12)
│   │     + champ titre input 701×32 : Whyte 14/475/20 · bd 1px transparent · r 6px · p 5px 8px · valeur « Avenant n° 3 — Résidence Les Tilleuls »
│   └─ droite (gap 12px) : « Saved 18min ago » 12/400/16 #636370 · bouton « Save » 52×32 bg **#8c8c9b** (désactivé tant que rien ne change) c #fff r 6px p 8px 12px · More 32×32
└─ corps flex  353,89  1079×803
    ├─ ÉDITEUR 598×803 · p 48px 64px 16px → colonne 470px
    │   ├─ « Notification title » 14/550/20 + aide « Slack users will see this… » 12/400/16 #636370
    │   │   + input 470×32 bg #fff · bd 1px #e0e0e9 · r 6px · p 5px 8px · 14/400 (placeholder « e.g. Scheduled maintenance… »)
    │   └─ « Broadcast content » 14/550 (gap 20px) → aperçu message : logo 40×40 r 8px + (gap 12px)
    │       « omega » 14/550 · « Broadcast sender » 12/400 #636370 · corps p 14/400/20 #1f1f28
    └─ ASIDE  951,89  481×803 · filet gauche 1px #e0e0e9 · flex-col
        ├─ bloc « Send from » p 16px · filet bas 1px #e0e0e9 : titre 12/550/16 ; sélecteur 448×42 bg #fff bd 1px #e7e7ef r 6px p 10px 12px (logo 18 r 4px + 14/400 + chevron 18 #8e8e9c)
        ├─ bloc « Deliver to · 0 channels » p 16px 16px 0 · filet bas : bouton « Filter » 59×26 r 6px p 5px 8px 5px 6px (12/550)
        │    puce de filtre 235×30 bg #fff · bd 1px #e7e7ef · **r 10px** : segments « Audience | is | All customers | × » séparés par bd-left 1px #e7e7ef, p 0 8px, 12px
        │    texte « Nothing this filter matched… » 12/400 #636370
        ├─ bloc « Options » p 16px : 4 cases à cocher 18×18 r 4px (cochée bg #1f1f28, vide bg #fff bd 1px #e0e0e9) + libellés 12px, gap 12px
        └─ pied 480×65 · p 16px · filet haut 1px #e0e0e9 : bouton primaire « Save and continue » 130×32 (même style que New broadcast) aligné à droite
```

## Tableau des mesures (motifs regroupés)

| Élément | Nb | x,y | L×H | Typo | Couleur | Fond / bordure / rayon / padding |
|---|---|---|---|---|---|---|
| h1 « Broadcasts » | 1 | 377,38 | 106×28 | Whyte 20/400/28 | #1f1f28 | — |
| Bouton primaire | 2 | 1281,32 | 127×34 / 130×32 | 12/550/16 | #ffffff | bg #1f1f28 · r 6px · ombres (voir arbre) |
| Piste onglets | 1 | 377,90 | 437×36 | — | — | #f0f0f5 · r 8px · p 2px |
| Onglet actif « Draft 3 » | 1 | 379,92 | 83×32 | 14/550/20 | #1f1f28 | bg #e7e7ef · r 6px · p 0 8px |
| Onglet inactif | 3 | 470,92 | 80–125×32 | 14/550/20 | #636370 | r 6px |
| Compteur | 4 | 446,101 | 7–8×16 | 12/400/16 | #636370 | — |
| th | 6 | 353,142 | 64–528×32 | 12/550/16 | #636370 | bg #fff · inset 0 −1px 0 #e7e7ef · p 8px 16px |
| tr | 3 | 353,174+57n | 1079×57 | — | — | bd-bottom 1px #e7e7ef |
| Nom (cellule 1) | 3 | 377,194 | 488×20 | 14/550/20 | #1f1f28 | td p 16px 16px 16px 24px · sticky |
| Cellules texte | 9 | 923,196 | 25–90×17 | 14/400/20 | #636370 | td p 16px |
| Avatar / logo | 6 | 897,195 | 18×18 | — | — | r 4px |
| Bouton More de ligne | 3 | 1384,190 | 24×24 | — | #636370 | r 6px · p 5px |
| Champ titre du brouillon | 1 | 479,32 | 701×32 | Whyte 14/475/20 | #1f1f28 | bd 1px transparent · r 6px · p 5px 8px |
| Pastille « Draft » | 1 | 421,36 | 46×24 | Whyte 12/475/12 | #1f1f28 | bg #f0f0f5 · r 4px · p 6px 8px |
| Bouton Save (désactivé) | 1 | 1312,32 | 52×32 | 12/550/16 | #fff | bg #8c8c9b · r 6px · p 8px 12px |
| Input « Notification title » | 1 | 417,181 | 470×32 | 14/400/20 | #1f1f28 | bg #fff · bd 1px #e0e0e9 · r 6px · p 5px 8px |
| Aside | 1 | 951,89 | 481×803 | — | — | bd-left 1px #e0e0e9 ; blocs séparés par bd-bottom 1px #e0e0e9 |
| Sélecteur « Send from » | 1 | 968,129 | 448×42 | 14/400/20 | #1f1f28 | bg #fff · bd 1px #e7e7ef · r 6px · p 10px 12px |
| Puce de filtre | 1 | 968,236 | 235×30 | 12/400/16 | #1f1f28 | bg #fff · bd 1px #e7e7ef · r 10px · segments bd-left #e7e7ef |
| Case à cocher | 4 | 968,733 | 18×18 | — | — | r 4px · cochée bg #1f1f28 · vide bd 1px #e0e0e9 |

## États

- **Survol d'une ligne** (mesuré) : `tbody tr:hover td { background-color: #f0f0f5 }` — toutes les cellules de la ligne passent à **#f0f0f5** (y compris la cellule Name collante, blanche au repos). Variante focus clavier : même couleur.
- **Onglet actif** : bg #e7e7ef ; inactif survolé : texte #636370 → #1f1f28, pas de fond.
- **Bouton Save** : #8c8c9b tant que le brouillon n'a pas changé (désactivé) ; le primaire actif est #1f1f28.

## À 390×844 (rechargé)

- **Liste** : barre latérale hors écran ; header p 0 16px 24px, « New broadcast » reste à droite (127×34).
- Onglets d'état sur **2 lignes** : Draft / Scheduled / In progress, puis **Sent étiré sur toute la largeur** (354px).
- **Tableau inchangé en largeur (890px)** dans un conteneur `overflow-x: auto` : défilement horizontal, **colonne Name collante à gauche** (th/td `position: sticky; left: 0`, réduite à 338px).
- **Brouillon** : non adapté par Plain — le header passe sur 2 lignes (titre 256px ; « Saved… / Save / More » en dessous), mais l'aside garde **320px** et l'éditeur est **écrasé à 69px** de large (texte en colonne, page de 4101px de haut). À ne pas recopier tel quel : prévoir l'aside sous l'éditeur.

## Capture (décrite)

1. Carte blanche : « Broadcasts » en Whyte 20px à gauche, bouton noir « + New broadcast » à droite ; dessous, contrôle segmenté « Draft 3 · Scheduled 0 · In progress 0 · Sent 0 ».
2. Tableau sans cadre : en-têtes gris 12px (Name, Created by, Send from, Audience, Last edited), 3 lignes de 57px séparées par un filet très clair, noms en gras, « You », logo + « omega », « All customers », « 17min ago », « … » à droite.
3. Brouillon : en-tête avec flèche retour, pastille grise « Draft », titre éditable, « Saved 18min ago » et bouton « Save » gris ; à gauche le formulaire (titre de notification, aperçu du message), à droite un panneau de 480px à filets (Send from, Deliver to, Options) avec « Save and continue » noir en pied.
