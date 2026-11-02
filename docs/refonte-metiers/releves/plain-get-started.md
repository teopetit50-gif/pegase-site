# Relevé — Plain, Get started (onboarding)

URL : https://app.plain.com/workspace/w_01M625JFBKTE3BWN4ECASYHK2B/onboarding/ — relevé le 29/10/2026 au `getComputedStyle` / `getBoundingClientRect`, fenêtre 1440×900 (px CSS), thème clair. Seuls des accordéons ont été ouverts (aucune case cochée, aucun « Connect », aucun envoi).

Notation : `fs/fw/lh`, `c` couleur, `bg` fond, `bd` bordure, `r` rayon, `p` padding.

## Police

- Corps : **Inter** variable (OFL, 100–900). Titres d'étape repliés en **550**, boutons en 550, pastille « Recommended » en **475**.
- **Titre de page h1 « Get started with Plain » : `Whyte` 24px / 400 / 32px**, et **titre de l'étape ouverte h3 : `Whyte` 32px / 400 / 40px vert #008046**. Whyte = police commerciale (Dinamo) : il faudra un substitut pour la recopie.

## Structure (1440×900)

```
body bg #f9f9fc
└─ main (CARTE)  64,8  1368×884  bg #ffffff · r 12px · ombre 0 0 0 1px #262626/.08, 0 1px 1px #262626/.08
   └─ colonne centrée  288,8  920×841  p 32px 32px 98px  (max 920px, centrée dans la carte)
      ├─ header  320,40  856×56  flex space-between, align flex-end
      │   ├─ bloc gauche 480×56 : h1 « Get started with Plain » (Whyte 24/400/32 #1f1f28) @320,40
      │   │                       p « A few steps to get your team set up… » 14/400/20 #636370 @320,76 (4px sous le h1)
      │   └─ « 1 of 4 complete » 12/400/16 #636370, aligné à droite sur la ligne de base du sous-titre @1089,80
      └─ LISTE ACCORDÉON  320,128  858×623 (selon l'étape ouverte)  bd 1px #e7e7ef · r 10px (overflow hidden)
          └─ ul → 4 li, chacun bd-bottom 1px #e7e7ef (sauf le dernier)
              li fermé : 856×73 (72 + filet) ; li ouvert : 856×(72 + contenu), fond #f3fbe9 + illustration
```

### En-tête d'étape (bouton, identique ouvert/fermé)

```
button 856×72  flex row, align center, gap 16px, p 24px, bg transparent
├─ case 18×18 @x345 (centre d'un input invisible 32×32, opacity 0)
│    à faire : bg #ffffff · bd 1.5px #4a52d1 · r 4px
│    faite   : bg #d8d8e3 · bd 1.5px transparent · r 4px, coche blanche 13×14
│    (carré intérieur 8×8 bg #adbcff r 1px opacity 0 = état intermédiaire caché)
├─ titre @x379 : 16px / 550 / 24px #1f1f28 ; étape faite : #636370 (+ « Completed: » en texte masqué pour lecteurs d'écran)
└─ chevron 18×18 #adadb7 @x1135 (dans un span 18×18) — ouvert : parent `transform: rotate(180deg)` (matrix(-1,0,0,-1)),
     transition `transform .15s ease-in-out`
```

### Étape ouverte — « Connect your channels » (état par défaut)

```
li > div  321,129  856×402  bg #f3fbe9 + illustration en fond
│   illustration : url(/images/callout-surface/logo-pattern.png), size 750px auto,
│   position calc(100% + 80px) 50%, no-repeat (logos en filigrane à droite, sous la carte)
├─ bouton d'en-tête 856×72 (voir ci-dessus)
└─ contenu  856×330, p 0 24px 24px
    └─ grid  345,201  808×306  grid-template-columns 388px 388px · gap 32px · align-items center
        ├─ texte (colonne 1) : flex column gap 12px, p 0 34px → 320px utiles @379
        │    h3 Whyte 32/400/40 #008046 (2 lignes, 320×80) @379,266
        │    p 14/400/20 #074022 (3 lignes, 320×60) @379,358
        └─ CARTE LISTE (colonne 2)  765,201  388×306  bg #fff · bd 1px #e7e7ef · r 10px · ombre 0 1px 1px #1a3333/.04
             5 rangées 386×59 (dernière 58, Discord 69) : flex center, p 16px, bd-bottom 1px #e7e7ef
             ├─ logo 24×24 @782 (svg/img, couleur icône #8e8e9c)
             ├─ libellé @818 14/400/20 #1f1f28 (+ pastille « Recommended » pour Slack)
             │     sous-ligne Discord « Available on the Frontier plan. » 12/400/16 #636370
             └─ bouton « Connect » 65×26 @1071 (à droite, r 6px, p 5px 8px, texte 12/550/16)
                  principal (Slack) : bg #1f1f28, texte #fff, ombre en relief (voir tableau)
                  secondaire (Email, Chat, MS Teams) : bg #fff, texte #1f1f28, ombre intérieure (voir tableau)
                  Discord : pas de bouton
```

### Autres étapes ouvertes (mesurées en les ouvrant ; une seule étape ouverte à la fois)

| Étape | Hauteur li | Contenu | Illustration de fond |
|---|---|---|---|
| Connect your channels | 403 | grid 2 colonnes : texte + carte de 5 canaux | logo-pattern.png · 750px auto · calc(100% + 80px) 50% |
| Invite your team | 327 | **une seule colonne** (p 0 34px, 740px utiles, justify center, gap 12) : h3 (1 ligne, 740×40) · p #074022 · libellé « Email » 14/550/20 · textarea 740×58 (bg #fff, bd 1px #e0e0e9, r 4px, p 8px 12px, placeholder #636370, resize none) · bouton « Send invites » 95×32 désactivé bg #8c8c9b texte #fff r 6px p 8px 12px, 28px sous le champ | SVG en data-URI (motif vert #1AD379, opacity .05) · size clamp(200px, 60%, 600px) auto · position calc(100% − clamp(−132px, −22%, −44px)) calc(100% − clamp(−12px, −2%, −4px)) |
| Connect the Sidekick Agent to your tools | 334 | grid 388/388 : texte (h3 2 lignes, p 2 lignes, bouton secondaire « See all integrations » 134×32 à +28px) + carte liste 388×237 de 4 rangées 59px (logo img 32×32 dans une case 24×24 : GitHub, Linear, Notion, Datadog + « Connect ») | sidekick.svg · clamp(330px, 50%, 900px) auto · calc(100% − clamp(−108px, −12%, −39.6px)) calc(100% − clamp(−90px, −10%, −33px)) |
| Set up your workflows (faite) | 312 | grid 388/388 : texte + 2 boutons (« Browse all templates » secondaire 143×32, « Create a blank workflow » tertiaire sans fond 164×32, écart 8px) + carte liste 388×208 de 3 liens 386×69 (p 16px, gap 8, flex space-between : titre 14/400/20 #1f1f28, description 12/400/16 #636370, 328px de large ; chevron droit 18×18 #8e8e9c) | même SVG data-URI que « Invite » |

Le fond vert #f3fbe9 n'apparaît que sur l'étape ouverte ; les étapes repliées sont blanches.

## Tableau des mesures

| Élément | Nb | x,y | L×H | Typo | Couleur | Fond / bordure / rayon / padding / ombre |
|---|---|---|---|---|---|---|
| Carte principale | 1 | 64,8 | 1368×884 | — | — | bg #fff · r 12px · ombre `0 0 0 1px #262626/.08, 0 1px 1px #262626/.08` |
| h1 | 1 | 320,40 | 246×32 | Whyte 24/400/32 | #1f1f28 | — |
| Sous-titre | 1 | 320,76 | 480×20 | Inter 14/400/20 | #636370 | — |
| « 1 of 4 complete » | 1 | 1089,80 | 87×16 | 12/400/16 | #636370 | — |
| Conteneur accordéon | 1 | 320,128 | 858×623 | — | — | bd 1px #e7e7ef · r 10px |
| En-tête d'étape | 4 | 321,129+73n | 856×72 | — | — | p 24px · gap 16px |
| Titre d'étape | 4 | 379,y+24 | auto×24 | 16/550/24 | #1f1f28 (faite #636370) | — |
| Case à faire | 3 | 345,y+27 | 18×18 | — | — | bg #fff · bd 1.5px #4a52d1 · r 4px |
| Case faite | 1 | 345 | 18×18 | — | coche #fff | bg #d8d8e3 · r 4px |
| Chevron | 4 | 1135 | 18×18 | — | #adadb7 | rotation 180° si ouvert, .15s ease-in-out |
| Fond étape ouverte | 1 | 321 | 856×var | — | — | bg #f3fbe9 + illustration |
| h3 étape ouverte | 1 | 379 | 320×80 (2 l.) | Whyte 32/400/40 | #008046 | — |
| Paragraphe étape ouverte | 1 | 379 | 320×60 | 14/400/20 | #074022 | — |
| Carte liste | 1 | 765 | 388×306 | — | — | bg #fff · bd 1px #e7e7ef · r 10px · ombre `0 1px 1px #1a3333/.04` |
| Rangée canal | 5 | 766 | 386×59 | 14/400/20 | #1f1f28 | p 16px · bd-bottom 1px #e7e7ef |
| Logo de canal | 5 | 782 | 24×24 | — | #8e8e9c | — |
| Pastille « Recommended » | 1 | 866,223 | 84×16 | 10/475/10 | #074022 | bg #e2f9e8 · r 4px · p 3px 6px · gap 2px (icône + texte) |
| Bouton principal « Connect » | 1 | 1071,218 | 65×26 | 12/550/16 | #ffffff | bg #1f1f28 · r 6px · p 5px 8px · ombre `0 1px 2px #21262e/.24, 0 2px 6px 2px #262626/.08, 0 2px 8px #262626/.08, 0 1px 1px #1a3333/.04, inset 0 -1px 1px 1px #000/.12, inset 0 1px 2px #fff/.12` |
| Bouton secondaire « Connect » | 3 | 1071 | 65×26 | 12/550/16 | #1f1f28 | bg #fff · r 6px · p 5px 8px · ombre `inset 0 0 0 1px #1a1a26/.08, inset 0 0 3px 1px #fff/.2, inset 0 -1px 2px #000/.12` |
| Bouton secondaire taille M (See all integrations, Browse all templates) | — | 379 | 134–143×32 | 12/550/16 | #1f1f28 | idem, p 8px 12px |
| Note Discord | 1 | 818,415 | 318×16 | 12/400/16 | #636370 | — |

## États

- **Survol d'un en-tête d'étape** : bg du bouton → **#f0f0f5** (sur toute la largeur 856×72), rien d'autre ne change.
- **Survol d'un lien de la carte liste** (étape « workflows ») : bg → **#f0f0f5**.
- **Survol bouton secondaire** : bg #fff → **#f9f9fc**, ombre inchangée (anneau #161a26 de .08 à .082).
- **Ouverture d'une étape** : une seule ouverte à la fois (ouvrir B referme A) ; le chevron tourne de 180° en .15s ; la hauteur s'anime (transition `all`) ; le fond vert + illustration apparaissent.
- Étape faite : case grise pleine, titre gris #636370 (pas de barré).

## À 390×844 (rechargé)

- Barre latérale repliée hors écran (panneau 346px en x −345) ; la carte devient **plein écran sans rayon ni ombre** (main 0,0 390×1023, la page défile).
- Colonne : p 24px → contenu 342px @24.
- Header en **colonne** : h1 @24,24 ; sous-titre sur 2 lignes (342×40) @24,60 ; « 1 of 4 complete » passe **dessous**, aligné à gauche @24,116 (header 342×108).
- Accordéon : bordure **haut et bas seulement**, **r 0** (plus de bords latéraux).
- Étape ouverte : la grille passe à **1 colonne** `294px`, rangées 196px / 266px, gap 32px : texte (h3 2 lignes 226px utiles, p 4 lignes) puis la carte liste dessous (294×266).
- Rangées de la carte liste : **p 12px 24px**, 292×51 (Discord 61).
- Illustration inchangée (750px auto, calc(100% + 80px) 50%).
- Titre d'étape long (« Connect the Sidekick Agent… ») passe sur 2 lignes (226×48), en-tête 96px.
- Bouton rond flottant 64×64 en bas à droite (326,780) — aide/chat de Plain, hors page.
