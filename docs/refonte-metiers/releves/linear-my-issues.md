# Relevé — Linear, My issues (Assigned + Activity)

URLs : https://linear.app/omegaaii/my-issues/assigned et …/my-issues/activity. Relevé le 29/10/2026 au `getComputedStyle` / `getBoundingClientRect`, fenêtre 1440×900 (px CSS), thème clair. Rien modifié (aucune case cochée, aucun ticket ouvert).

Notation : `fs/fw/lh`, `c` couleur, `bg` fond, `bd` bordure, `r` rayon, `p` padding. Couleurs lch() converties en hex.

## Police

Inter Variable (100–900). Graisses : 450 (identifiants, compteurs, dates), 500 (titres de ticket, en-têtes de groupe, onglets). Seul letter-spacing de la page : **identifiant OME-n −0.26px** (−0.02em). Interligne `normal` (15,5px à 13px, 14,5px à 12px).

## Structure (1440×900)

```
html bg #efeff0
└─ main (CARTE)  244,8  1188×856  bg #f9f9fa · bd 0.5px #e2e2e2 · r 12px · ombre #000/.02 0 3px 6px -2px, #000/.04 0 1px 1px
   ├─ header 1187×87.5 (identique à la liste Initiatives)
   │  ├─ ligne 1 (44, bd-bottom 0.5px #e2e2e2) : « My issues » h2 13/500 #2f2f31 @263,23 · « New issue » 98×28 @1325,16
   │  └─ ligne 2 (43.5) : 4 onglets, gap 8px, h 28, y 60
   │       Assigned 75 @253 · Created 67 @335 · Subscribed 86 @410 · Activity 65 @504
   │       + 2 boutons ronds 28×28 à droite @1328 / 1362 (filtre, display) + 1 @1396
   └─ liste  245,96  1187×767.5  bg #f9f9fa, grid (lignes en subgrid), gap entre groupes 8px
      ├─ GROUPE « Cycle 1 »  y 96 : en-tête 36px + 4 lignes de 44px, p-bottom 2px
      └─ GROUPE « Completed » y 312 : en-tête 36px + 1 ligne 44px
```

### Grille de colonnes

- Assigned : `[indent] 8px [checkbox] 18px [priority] 16px [identifier] 55px [status] 16px [title] 940px [createdAt] 60px [end-padding] 18px`
- Activity : `… [title] 890px [lastTouchedAt] 110px [end-padding] 18px` (colonne date plus large : « Updated on Oct 29 »).
- Gap de colonnes ≈ 8px (case 264 → priorité 287 → identifiant 311 → statut 375 → titre 398).

### En-tête de groupe (36px)

```
div 1171×36 @253 (inset 8px dans la carte) · bg #efeff0 (lch 94.44 0.5 282, posé deux fois : couleur + linear-gradient uni)
    r 8px · p 0 8px 0 0 · flex center gap 8px
├─ bouton replier 20×20 r 9999px p 2px @261 : chevron 16×16 #c9c9c9
├─ icône de groupe 16×16 @287 : cycle = anneau #969799 + arc #5e6ad2 + #59595b ; Completed = 14×14 #59595b
├─ libellé : « Cycle 1 » (lien a, p 0 2px, r 8px) / « Completed » / « Today » — 13/500 #2e2e30
├─ compteur « 4 » 13/450 #59595b (bouton 8×24)
├─ (cycle) dates « Oct 28 → Nov 10 » 13/450 #969799, 8px après le compteur
└─ bouton « + » 24×24 à droite @1392 : bd 0.5px transparent, r 9999px, p 0 2px, icône 14 #2e2e30
```

### Ligne de ticket (44px)

```
a 1187×44, display grid subgrid, p 0 ; fond de survol en ::before (inset 0 8px, r 8px)
├─ case 14×14 @264 (bd 1px #7c7c7c, r 3px, p 2px) — **opacity 0 au repos, 1 au survol**
├─ priorité 16×16 @287 : « No priority » 3 barres #5c5c5e ; « High » 3 barres pleines #5c5c5e
├─ identifiant « OME-10 » @311 : 13/450, ls −0.26px, #5c5c5e (54px)
├─ statut 14×14 @375 (+ texte caché 1×1 pour lecteurs d'écran)
│     Todo : cercle contour #a6a6a6 · In Progress : #f0bf00 · Done : disque #5e6ad2 + coche #f9f9fa · Triage : #ff7336
├─ titre @398 : 13/500 #1b1b1b, ellipsis
└─ à droite (alignés sur la fin) :
    pilule cycle 43×24 @1271 : bg #f9f9fa · bd 0.5px #d3d3d3 · r 48px · p 0 8px · icône 14 (cycle #9c9d9f/#5e6ad2) + « 1 » 12/450 #5c5c5e
    avatar assigné 18×18 r 50% @1322 (ou icône « non assigné » 18×18)
    date « Oct 28 » 12/450 #5c5c5e @1367 (Activity : « Updated on Oct 29 » 108px @1298)
```

## Tableau des mesures

| Élément | Nb | x,y | L×H | Typo | Couleur | Fond / bordure / rayon / padding |
|---|---|---|---|---|---|---|
| h2 « My issues » | 1 | 263,23 | 63×15.5 | 13/500 | #2f2f31 | — |
| « New issue » | 1 | 1325,16 | 98×28 | 12/500 | #5c5c5e | bd 0.5px transparent · r 9999px · p 0 10px 0 8px · icône 14 |
| Onglet actif | 1 | 253,60 | 75×28 | 12/500 | #1b1b1b | bg #ececed · bd 0.5px transparent · r 9999px · p 0 10px |
| Onglet inactif | 3 | — | 65–86×28 | 12/500 | #5c5c5e | bg #ffffff · idem (+ ombre ::after anneau 0.5px #000/.09) |
| En-tête de groupe | 2 | 253,96 / 312 | 1171×36 | 13/500 | #2e2e30 | bg #efeff0 · r 8px · p 0 8px 0 0 · gap 8 |
| Compteur de groupe | 2 | 363,106 | 8×15.5 | 13/450 | #59595b | — |
| Dates du cycle | 1 | 379,106 | 103×15.5 | 13/450 | #969799 | — |
| Bouton « + » de groupe | 2 | 1392 | 24×24 | — | #2e2e30 | r 9999px · p 0 2px |
| Ligne | 5 | 245,134+44n | 1187×44 | — | — | ::before survol #efeff0 r 8px inset 0 8px |
| Case à cocher | 5 | 264,y+15 | 14×14 | — | — | bd 1px #7c7c7c · r 3px · opacity 0 (1 au survol) |
| Identifiant | 5 | 311 | 46–54×15.5 | 13/450 · ls −0.26px | #5c5c5e | — |
| Titre | 5 | 398 | auto×15.5 | 13/500 | #1b1b1b | ellipsis |
| Pilule cycle | 5 | 1271 | 43×24 | 12/450 | #5c5c5e | bg #f9f9fa · bd 0.5px #d3d3d3 · r 48px · p 0 8px |
| Avatar | 5 | 1322 | 18×18 | — | — | r 50% |
| Date | 5 | 1367 | 38×14.5 | 12/450 | #5c5c5e | — |

## Onglet Activity

Même en-tête et même gabarit de lignes ; groupes **par jour** : « Today » (9) y 96, « Yesterday » (8) y 532 (le reste défile). Icône de groupe 16×16 #59595b. Colonne de droite « Updated on Oct 29 » 12/450 #5c5c5e (108px) ; la pilule cycle est à 1221, l'avatar à 1272. Les tickets en Triage (OME-15 à 19) n'ont pas de pilule cycle et ont l'icône « non assigné » (18×18). Statuts vus : Done, Todo, Triage (#ff7336), In Progress (#f0bf00).

## États

- **Survol d'une ligne** : `::before` du `<a>` → bg **#efeff0** (absolute, inset 0 8px, r 8px) ; la case à cocher passe de opacity 0 à **1**. Texte inchangé.
- Onglet : actif bg #ececed / #1b1b1b ; survol inactif bg #f0f0f1, texte #2f2f31 (mêmes composants que la liste Initiatives).

## À 390×844 (rechargé)

- Carte plein écran ; bouton Menu 32×32 @8,6, « My issues » @52,14, « New issue » devient icône ronde 32×32 @350,6.
- Onglets h 32 : « Assigned » et « Created » visibles, puis un bouton **« 2 more ▾ »** 75×32 (r 9999px, p 0 10px, chevron 8×9) qui regroupe Subscribed/Activity ; 3 boutons ronds 32×32 @274 / 312 / 350.
- Grille : `[indent] 2px [checkbox] 0px [priority] 16px [status] 16px [title] 301px [end-padding] 15px` — **identifiant, pilule cycle et date disparaissent** ; il reste priorité @18, statut @43, titre @66 et l'avatar 18×18 @351.
- En-tête de groupe : chevron @18, icône @42, « Cycle 1 » @64, compteur ; bouton « + » 28×28 @346 ; les dates du cycle ne s'affichent plus.
- Lignes toujours 44px.

---

# Complément du 01/11/2026 (My issues › Assigned rempli, sombre + clair)

## Ce qui a été créé (tous dans l'équipe OME, assignés à Wizyy quand indiqué)

Tickets OME-20 à OME-48 et OME-60 à OME-66 (40 tickets environ) : titres de chantier en français, statuts Backlog / Todo / In Progress / Done / Canceled, priorités Urgent / High / Medium / Low / sans, étiquettes créées pour l'occasion (Peinture, Carrelage, Administratif, Sécurité, Réserve, Facture, Client, Urgent chantier) + étiquettes existantes, projets, cycles 1 et 2. Échéances ajoutées (raccourci **⇧ D** sur la page du ticket, champ « Try: 24h, 7 days, Feb 9 ») : OME-23 (saisie « Oct 28 » → interprétée **Oct 2027**), OME-26 (« Oct 30 »), OME-28 (Nov 3), OME-31 (Nov 15). Liste détaillée des titres : voir le Triage et Projects ; rien n'a été modifié sur les tickets de Teo (OME-1 à OME-19).

État relevé : 17 lignes visibles réparties en **groupes** « Urgent issues 3 », « Cycle 1 11 Oct 28 → Nov 10 », « Cycle 2 3 Nov 11 → Nov 24 » (+ suite en défilant).

## Ligne (1440, mesurée)

`a` 1187×**44** (display grid, r 8px, gap 0 8px) — grid-template-columns : `[indent] 8px [checkbox] 18px [priority] 16px [identifier] 55px [status] 16px [title] 940px [createdAt] 60px [end-padding] 18px`.

```
a @245,222 1187×44
├ case « Select issue » 14×22 (input 12×12 opacity 0)
├ priorité : icône 16×16 (Urgent = carré orange)
├ identifiant « OME-23 » span 13px/450 c tertiaire (55px)
├ statut : icône 14×14 (cercle Todo, demi-cercle jaune In Progress…)
├ titre @398 945×36 : span 13px/500 c primaire, puis à droite une rangée de puces (gap 4px) :
│   étiquette : div 24px r 48px p 0 8px bd 0.5px (sombre lch(16.32 1.48 272), clair lch(84.44 0 282)) bg = fond de carte → pastille 9×9 ronde (couleur de l'étiquette) dans 14×14 + nom 12px/450
│   projet « Open project » : même puce, icône du projet 14×14 + nom
│   cycle : puce avec icône cycle 14×14 + « 1 »
│   échéance : puce avec icône calendrier 14×14 + « Nov 3 » / « Oct 2027 »
│   assigné : avatar 18×18 à droite (@1322)
└ date de création @1374 : span 12px/450 c tertiaire « Nov 1 » (title « Created Nov 1, 8:38:09 PM »)
```

## En-tête de groupe

div 1171×36, **bg lch(9.232 0.85 272)** (clair lch(94.44 0.5 282)), r 8px, p 0 8px 0 0, m 0 8px, gap 8px : chevron de repli · icône (cycle) · libellé 13px/500 c lch(90.826 1.425 272) (clair lch(18.888 1.25 282)) · compteur 13px c lch(63.304 1.425 272) (clair lch(37.776 1.25 282)) · plage de dates « Oct 28 → Nov 10 » c lch(39.452 1.425 272) (clair lch(62.33 1.25 282)) · « + » à droite.

## Barre du haut

Titre « My issues » + « New issue » ; onglets **Assigned** (actif) · Created · Subscribed · Activity (pilules 28px comme ailleurs) ; à droite filtre, affichage, « Open details » (28×28 ronds).

## Couleurs d'étiquettes relevées

rgb(235, 87, 87) rouge, rgb(247, 200, 193) rose, rgb(38, 181, 206) bleu-vert, rgb(76, 183, 130) vert, lch(48 59.31 288.43) violet, lch(67.969 19.321 31.72) beige (clair).

## Paliers

390×844 : grille `[indent] 2px [checkbox] 0px [priority] 16px [status] 16px [title] 303px [end-padding] 13px` — l'identifiant, les puces et la date disparaissent ; restent priorité, statut, titre tronqué, avatar ; onglets réduits à « Assigned · Created · 2 more ▾ » ; « New issue » devient « + ».

## Captures (`captures/linear-my-issues/`)

`1440-sombre.png`, `1440-clair.png`, `390-sombre.png`, `390-clair.png`.
