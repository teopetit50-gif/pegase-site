# Relevé — Linear, Projects (liste « All projects » + Timeline)

URL : https://linear.app/omegaaii/projects/all — relevé le 01/11/2026 au `getComputedStyle` / `getBoundingClientRect`, fenêtre 1440×900 (px CSS), **thèmes sombre et clair** (émulation `prefers-color-scheme`, Linear suit le système). La vue Timeline a son relevé détaillé dans `linear-timeline.md` (29/10, clair) ; le complément Timeline du 01/11 est en bas de ce fichier. La barre latérale et le cadre (carte `main`) sont dans `linear-home.md`. Icônes du sprite : `linear-commun/sprite-icones.svg`.

Notation : `fs/fw/lh` taille/graisse/interligne, `c` couleur, `bg` fond, `bd` bordure, `r` rayon, `p` padding, `m` marge.

## Ce qui a été créé pour remplir la page

Projets (équipe Omega, responsable Wizyy quand indiqué) :
- « Villa Bellevue — extension » — In Progress, High, lead Wizyy, 15/09/2026 → 26/02/2027, mise à jour **On track** (« Terrassement terminé… »).
- « Immeuble Les Alizés — 12 logements » — Planned, Urgent, lead Wizyy, 01/12/2026 → 30/09/2027, mise à jour **At risk** (« Retard de 3 semaines… »).
- « Rénovation école Bois-Joli » — Completed, Medium, cible 28/08/2026.
- « Hangar agricole Morne-Rouge » — Canceled, Low, sans date.
Tickets rattachés aux projets (créés par moi, OME-20 à OME-48 et OME-60 à OME-66 environ) : voir `linear-my-issues.md`. Les 9 projets existants (exemple, Bâtiment Caraïbes, Pharmacie du Lamentin, Transports Alizés, Cabinet Lorani, Résidence Les Tilleuls, Maison Rolland, Local commercial Part-Dieu, Groupe scolaire Jean-Moulin) n'ont pas été modifiés ; ils ont seulement reçu des tickets (colonne Issues et % remplis).

État relevé : 13 lignes ; santé : Off track (exemple), On track, At risk, « No updates » ; priorités Urgent / High / Medium / Low / No priority ; statuts Backlog, Planned, In Progress, Completed, Canceled ; dates cibles passées (en rouge) et futures ; jalon « Rappel » sur « exemple ».

## Arbre mesuré (1440×900, sombre)

```
main @244,8 1188×856 (carte, voir linear-home.md)
├ header @245,9 1187×87.5
│ ├ ligne 1 1187×44 (p 0 8px, filet bas 0.5px) : h2 « Projects » @263,23 50.7×15.5 · à droite button "New project" @1315,16 108.2×28 (icône + 14×14 · libellé 69.2×14.5)
│ └ ligne 2 1187×43.5 : onglet de vue « All projects » (a 85.3×28 @253,60) · button "Add new view" 28×28 @342,60
│     à droite @1328,60 : "Add filter" 28×28 · "Display options" 28×28 · "Open sidebar" 28×28 (écart 6px)
└ corps @245,96 1187×767.5 (défile)
  ├ en-tête de colonnes @245,96 1187×32 (display grid, subgrid des lignes)
  │   « Name » button 59.4×24 @283,100 · « Health » 63.1×24 @849,101 · « Priority » 67.3×24 @985 · « Lead » span @1059 · « Target date » 90.8×24 @1113 · « Issues » span @1243 · « Status » 62.1×24 @1298
  │   (boutons de tri : p 0 6px, gap 2px, icône flèche 12×12 visible sur la colonne triée)
  └ lignes : 13 × a 1187×48 (display grid, r 8px)
       grid-template-columns : [indent] 8px [checkbox] 18px [title] 560px [health] 130px [priority] 68px [lead] 48px [targetDate] 124px [issues] 49px [status] 120px [end-padding] 8px ; column-gap 6px
       ├ case à cocher « Select project » 14×22 @261 (input 12×12, opacity 0 au repos, visible au survol)
       ├ titre @283 560×28 : button "Choose icon" 28×28 (r 8px, p 6px, m-right 6px, icône projet 16×16) · nom span 13px/500 · jalon éventuel (losange 16×16 + « Rappel » 12px/450 tertiaire)
       ├ santé @849 : button 24px (r 9999px, p 0 8px) → icône 16×16 + libellé 12px/500 (« No updates » / « On track · now »…)
       ├ priorité @985 : button 28×28 → icône 16×16
       ├ responsable @1059 : button 28×28 → avatar 16×16 (ou icône « No lead »)
       ├ date cible @1113 : div[button] h28 → icône calendrier 16×16 + date span 12px/450 (m-left 8px)
       ├ tickets @1272 : button 19.8×28 → nombre 12px/450
       └ statut @1298 : button h28 → icône hexagone 16×16 + « 42% » 12px/450 · courbe 32×16 à droite (@1365)
```

## Styles calculés

| Élément | Typo | Sombre | Clair | Boîte |
|---|---|---|---|---|
| Titre de page h2 « Projects » | 13px / 500 | c lch(90.451 1.2 272) | c lch(19.588 1.25 282) | — |
| Bouton « New project » | 12px / 500 (libellé) | c lch(61.803 1.2 272) | c lch(39.176 1.25 282) | r 9999px · p 0 10px 0 8px · h 28 · bd 0.5px transparent · transition border, background-color, color, opacity 0.15s |
| Onglet de vue actif « All projects » (a) | 12px / 500 | c lch(100 0 272) · bg lch(16.706 0.979 272) | c lch(9.794 0 282) · bg lch(93.483 0.5 282) | r 9999px · p 0 10px · h 28 |
| Boutons ronds filtre / affichage / volet | — | bg lch(10.149 0.689 272) · icône lch(61.803 1.2 272) | bg lch(99.997 0.5 282) | 28×28 · r 9999px · p 0 2px |
| En-tête de colonne (button de tri) | 12px / 450 (span) | c lch(61.803 1.2 272) | c lch(39.176 1.25 282) | r 9999px · p 0 6px · gap 2px · h 24 |
| En-têtes non triables (Lead, Issues) | 12px / 450 | idem | idem | p 0 12px 0 0 |
| Ligne (a) | — | — | — | grid · r 8px · h 48 · transition color 0.15s |
| Ligne survolée (`::before`) | — | bg lch(9.345 0.85 272) | bg lch(94.44 0.5 282) | case à cocher visible au survol |
| Nom du projet | 13px / 500 | c lch(100 0 272) | c lch(9.794 0 282) | h 15.5 |
| Libellé de jalon « Rappel » | 12px / 450 | c lch(61.803 1.2 272) | c lch(39.176 1.25 282) | — |
| Bouton santé | 12px / 500 | libellé lch(61.803 1.2 272) (« No updates ») | lch(39.176 1.25 282) | r 9999px · p 0 8px · h 24 · bd 0.5px transparent |
| Santé Off track | 12px / 500 | c lch(65.2 73 29) ; « · 4d » lch(65.2 73 29 / 0.7) | c lch(50 73 29) ; / 0.7 | — |
| Santé On track | 12px / 500 | c lch(67.2 64.37 141.95) ; « · now » / 0.7 | c lch(60 64.37 141.95) | — |
| Santé At risk | 12px / 500 | c lch(87.2 90 85) ; / 0.7 | c lch(72 90 85) | — |
| Date, %, nombres | 12px / 450 | c lch(90.451 1.2 272) (nombre de tickets : blanc rgb(255,255,255)) | c lch(19.588 1.25 282) (nombre : noir) | m-left 8px pour le texte après icône |
| Cellule date cible (div[button]) | 12px / 18px | — | — | r 8px · h 28 |
| Boutons d'icône des cellules | — | — | — | r 9999px · p 3px 6px · h 28 |
| Bouton icône de projet | — | — | — | r 8px · p 6px · m 0 6px 0 0 · 28×28 · transition background-color, border 0.15s |
| Filets autour des cases (case à cocher) | — | 1px lch(48.72 1.48 272) | 1px lch(52.04 0 282) | — |

## Icônes

- Icônes de projet (sprite, couleur choisie par projet) : `use#Project` (#26b5ce, #f2994a…), `use#PalmTree` lch(48 59.31 288.43), `use#Pills` lch(80 90 85), `use#Bus` #4cb782, `use#Briefcase` #f2994a, `use#Home` #bec2c8, `use#Education` #eb5757, `use#Factory` lch(80 90 85).
- Priorité (16×16, viewBox 0 0 16 16, fill = texte tertiaire) :
  - High : `<rect x="1.5" y="8" width="3" height="6" rx="1"/><rect x="6.5" y="5" width="3" height="9" rx="1"/><rect x="11.5" y="2" width="3" height="12" rx="1"/>`
  - Medium : idem, 3e barre `fill-opacity="0.4"` ; Low : 2e et 3e barres `fill-opacity="0.4"`
  - No priority : `<rect x="1.5" y="7.25" width="3" height="1.5" rx="0.5" opacity="0.9"/>` ×3 (x 1.5 / 6.5 / 11.5)
  - Urgent (fill lch(66 80 48)) : `<path d="M3 1C1.91067 1 1 1.91067 1 3V13C1 14.0893 1.91067 15 3 15H13C14.0893 15 15 14.0893 15 13V3C15 1.91067 14.0893 1 13 1H3ZM7 4L9 4L8.75391 8.99836H7.25L7 4ZM9 11C9 11.5523 8.55228 12 8 12C7.44772 12 7 11.5523 7 11C7 10.4477 7.44772 10 8 10C8.55228 10 9 10.4477 9 11Z"/>`
- Santé (16×16) : `<circle r="8" cx="8" cy="8" fill="<couleur> / 0.25"/>` + tracé blanc-couleur : On track (courbe montante) `M12.6807 5.7029C12.9925 5.97566 13.0241 6.44948 12.7513 6.76121L9.71942 10.2263C9.56569 10.402 9.33892 10.4961 9.10596 10.4808C8.873 10.4656 8.66044 10.3427 8.53094 10.1485L6.76432 7.49855L4.37742 10.2263C4.10466 10.5381 3.63083 10.5696 3.31911 10.2969C3.00739 10.0241 2.97581 9.55028 3.24857 9.23856L6.28056 5.77356C6.43429 5.59788 6.66106 5.50379 6.89401 5.51905C7.12696 5.53432 7.33952 5.65718 7.46902 5.85142L9.23562 8.50133L11.6224 5.77347C11.8952 5.46174 12.369 5.43015 12.6807 5.7029Z` ; Off track (courbe descendante) `M12.6807 10.297C12.9925 10.0242 13.0241 9.5504 12.7513 9.23866L9.71942 5.77356C9.56569 5.59786 9.33892 5.50377 9.10596 5.51903C8.873 5.53429 8.66044 5.65716 8.53094 5.8514L6.76432 8.50133L4.37742 5.77354C4.10466 5.46182 3.63083 5.43024 3.31911 5.703C3.00739 5.97577 2.97581 6.44959 3.24857 6.76132L6.28056 10.2263C6.43429 10.402 6.66106 10.4961 6.89401 10.4808C7.12696 10.4656 7.33952 10.3427 7.46902 10.1485L9.23562 7.49855L11.6224 10.2264C11.8952 10.5381 12.369 10.5697 12.6807 10.297Z` ; At risk (coche montante) `M9.62562 3.8314C9.85957 3.7977 10.0957 3.87627 10.2628 4.04341L12.5728 6.35341C12.8657 6.6463 12.8657 7.12117 12.5728 7.41407C12.28 7.70696 11.8051 7.70696 11.5122 7.41407L9.91096 5.81284L6.92594 11.2854C6.81276 11.4929 6.60838 11.6349 6.37442 11.6686C6.14047 11.7023 5.90433 11.6237 5.73719 11.4566L3.42719 9.14657C3.1343 8.85367 3.1343 8.3788 3.42719 8.08591C3.72008 7.79301 4.19496 7.79301 4.48785 8.08591L6.08908 9.68714L9.0741 4.2146C9.18728 4.00709 9.39166 3.86509 9.62562 3.8314Z` ; « No updates » : `<circle r="7.5" cx="8" cy="8" fill="none" stroke-width="1" stroke-dasharray="2.36 2.36" stroke-linecap="round" stroke="lch(36.975% 1.2 272)"/>`.
- Statut de projet = hexagone (viewBox -1 -1 16 16) : contour `M2.95778 3.02069L5.70777 1.36023C6.50244 0.88041 7.49756 0.88041 8.29223 1.36024L11.0422 3.02074C11.7918 3.47336 12.25 4.2852 12.25 5.16086V8.84803C12.25 9.7251 11.7904 10.5381 11.0388 10.9902L8.29114 12.6433C7.49693 13.1211 6.50355 13.1203 5.71011 12.6412L2.95775 10.9792C2.20815 10.5266 1.75 9.7148 1.75 8.83911V5.16082C1.75 4.28516 2.20816 3.47332 2.95778 3.02069Z` (stroke 1.5, bevel) + camembert `<circle r="4" cx="7" cy="7" stroke-width="8" stroke-dasharray="calc(25.12 × %) 25.12" transform="rotate(-90) translate(-14, 0)"/>` masqué par un petit hexagone (trou) ; couleurs : Backlog / Planned #D7D8DB (pointillés pour Backlog), In Progress lch(80 90 85), Completed lch(48 59.31 288.43) avec coche noire dans le masque (`M10.7803 5.28033…`), Canceled #8A8F98 avec croix (`M3.73657 3.73657…`).
- Jalon : losange `M7.3406 2.32C7.68741 1.89333 8.31259 1.89333 8.6594 2.32L12.7903 7.402C13.0699 7.74597 13.0699 8.25403 12.7903 8.598L8.6594 13.68C8.31259 14.1067 7.68741 14.1067 7.3406 13.68L3.2097 8.598C2.9301 8.25403 2.9301 7.74597 3.2097 7.402L7.3406 2.32Z` stroke lch(80 90 85) 2px, opacity 0.4.
- Date cible : calendrier `M11 1C13.2091 1 15 2.79086 15 5V11C15 13.2091 13.2091 15 11 15H5C2.79086 15 1 13.2091 1 11V5C1 2.79086 2.79086 1 5 1H11ZM13.5 6H2.5V11C2.5 12.3807 3.61929 13.5 5 13.5H11C12.3807 13.5 13.5 12.3807 13.5 11V6Z` ; date dépassée : variante rouge fill lch(58 73 29) ; « ajouter une date » : calendrier + (`M15 5C15 2.79086…`, opacity 0 hors survol).
- Courbe de progression 32×16 : `<path d="M0,16L32,12" stroke-width="1.25" stroke="lch(48% 59.31 288.43)"/>` (réalisé) + chemin prévu `stroke="lch(61.803% 1.2 272)88"`.
- En-tête : « + » (`M8.75 4C8.75 3.58579…`), filtre (`M14.25 3a.75.75 0 0 1 0 1.5H1.75…`), affichage (`M7 2.5C8.11933…`), volet (`M4.25 2C2.45508…` + rect x 10 largeur 1.5, transition x/width 250ms), flèche de tri 12×12 (`M11.5361 10.2745…` + `M8.75 12.25…`).

## Menu « Display options » (clair)

Popover sous le bouton : bascule **List | Board | Timeline** (3 boutons pleine largeur, actif en fond gris), « Grouping : No grouping ▾ », « Ordering : Manual ▾ », « Show closed projects : All ▾ », « List options », « Display properties » en puces : ID, Milestones, Summary, Priority, Status, Health, Teams, Initiatives, Lead, Members, Dependencies, Start date, Target date, Issues, Created, Updated, Completed, Labels.
Puces : 12px/500 · r 9999px · p 0 8px · m 0 4px 4px 0 · h 24 · actives bg lch(94.857 0 282) c lch(10 0 282), inactives bg lch(100 0 282) c lch(40 1 282). Capture : `1440-clair-display-options.png`.

## États et comportement

- Survol d'une ligne : fond `::before` (voir tableau), case à cocher qui apparaît dans la gouttière gauche (x 261).
- Clic sur le libellé de santé « No updates » → ouvre la page du projet (onglet Overview) ; « Write first project update » ouvre le composeur dans l'onglet Activity (bascule santé On track / At risk / Off track + « Post update »).
- Clic sur l'en-tête de colonne → tri (flèche 12×12).
- Raccourcis vus : dans le formulaire « New project », les menus de statut et de priorité se choisissent au chiffre (statut 1 Backlog · 2 Planned · 3 In Progress · 4 Completed · 5 Canceled ; priorité 0 No priority · 1 Urgent · 2 High · 3 Medium · 4 Low) ; date de début Ctrl ⌥ S ; champ date « Try: May 2027, Q4, 05/20/2027 ».

## Paliers

| Largeur | Lignes |
|---|---|
| 1440 | 9 colonnes (voir grille) |
| 390×844 | barre latérale en tiroir ; ligne 390×48, grille `[indent] 8px [title] 272px [health] 50px [status] 28px [end-padding] 8px` : seuls nom, icône de santé et icône de statut restent ; en-tête de colonnes masqué ; bouton « New project » réduit à « + » |

## Complément Timeline (01/11, page remplie)

- Colonne gauche 320px fixe (bg = fond de carte : clair lch(97.94 0.5 282), sombre lch(5.52 0.4 272)) avec filet droit 0.5px (clair lch(84.44 0 282)) ; chaque ligne y montre icône, nom tronqué, santé, statut, priorité, responsable.
- Règle des mois/semaines : 32px de haut (2 × 16), mois en capitales, jour courant en pastille « NOV 1 » ; trait vertical du jour à x 840.
- Barres : h 24, r 6px (r 0 6px 6px 0 quand la barre sort à gauche), bd 0.5px ; clair bg lch(100 0.5 282) bd lch(84.44 0 282) ombre `lch(0 0 0/.02) 0 3px 6px -2px, lch(0 0 0/.04) 0 1px 1px 0` ; sombre bg lch(11.82 2.2 272) bd lch(27.12 1.48 272) ombre `lch(0 0 0/.3) 0 .5px 1px 1px`. Nom du projet au-dessus de la barre (13px/500, c secondaire), pas dedans.
- Boutons « Today » 52×24 et « Zoom » (« Year ▾ ») 57×24 en haut à droite ; ascenseur horizontal en bas (@661,852 677×9).
- Projets sans date : pas de barre ; ceux qui finissent avant la fenêtre : flèche « ← Oct 2… » à droite à 390.
- La vue a été remise en **List** après le relevé (état trouvé en arrivant).

## Captures (`captures/linear-projects/`)

1440 = 800×500 (échelle 0,556, voir linear-home.md) ; 390 = 390×844.
- `1440-sombre-liste-survol.png`, `1440-clair-liste-survol.png` (ligne Villa Bellevue survolée)
- `1440-clair-display-options.png` (menu ouvert)
- `1440-clair-timeline.png`, `1440-sombre-timeline.png`
- `390-sombre-liste.png`, `390-clair-liste.png`, `390-sombre-timeline.png`

## Paliers 1024 et 768 (complément du 01/11/2026)

Mesures au style calculé, thème sombre. Captures `1024-sombre*.png` (rendue 800×600, échelle 0,78) et `768-sombre*.png` (rendue 800×1066, échelle 1,04).

- **1024×768** : barre latérale visible (244), main @244,8 772×724 r 12. Ligne 771×48, grille `[indent] 8 [title] 364 [health] 50 [priority] 68 [lead] 48 [targetDate] 100 [issues] 49 [status] 28 [end-padding] 8`. La case à cocher disparaît. La santé passe en icône seule (50). Le % et la courbe de statut disparaissent (icône seule, 28).
- **768×1024** : barre latérale en tiroir (bouton ◧), main 0,0 768×988 r 0. Même grille, [title] 361. « New project » devient « + ». Barre Agent de 36 px en bas.
- Captures : `1024-sombre-liste.png`, `768-sombre-liste.png`.
