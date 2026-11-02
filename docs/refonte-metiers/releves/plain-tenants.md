# Relevé — Plain, Tenants (aujourd'hui « Accounts », liste)

URL : https://app.plain.com/workspace/w_01M625JFBKTE3BWN4ECASYHK2B/tenants/ — refait le 01/11/2026 sur une page **remplie**
(le relevé du 29/10 portait sur 6 lignes vides). Plain a renommé « Tenants » en **« Accounts »** : titre, bouton
« Create account », lien de barre latérale. Jetons, coque et briques : `plain-commun.md`.

## Ce qui a été créé (01/11, par l'API GraphQL de Plain depuis la session de Teo — rien envoyé à personne)

- 35 comptes : « Cabinet Ravel Notaires » (externalId `ravel-notaires`, créé par le formulaire) + 34 comptes externalId
  `omega-fx-01` à `omega-fx-34` (Cabinet Morin Avocats, Atelier Lambert Architectes, Garage Duval Auto, Clinique Dentaire du
  Parc, … Domaine de Grand-Anse). Les 6 comptes de Teo (SCI Lefèvre, Plomberie Bastide…) n'ont pas été modifiés, sauf
  leur rattachement à un tier.
- 4 tiers : Entreprise #7048E8, Business #1971C2, Essentiel #2F9E44, Pilote #F08C00 (externalId `omega-tier-0..3`), un compte sur cinq sans tier.
- 5 champs de compte (source `api`) : Ville (texte), MRR (€) (nombre), Renouvellement (date), Contrat actif (booléen), Modules (liste FILED/CASHD/REPUT/OFFLOAD), remplis sur 6 comptes sur 7.
- Affichage : « Show all » dans Display pour montrer les colonnes de champs (préférence d'affichage, pas un réglage du compte).
- 45 clients `prénom.nom@example.com`, 51 fils, 36 tâches (voir `plain-threads.md`, `plain-tasks.md`).

## Arbre (1440×900, clair)

```
CARTE <main> 353,8 1079×884 (voir commun) · p 24px 24px 0
├─ header 353,32 1079×58 · flex gap 24px · p 0 24px 24px
│   ├─ titre @377,38 : icône 18 #8e8e9c + h1 « Accounts » Whyte 20/400/28 #1f1f28 (gap 8)
│   └─ actions @1041,32 (gap 8) : Favori 32×32 · « Filters » 76×34 · « Display V » 106×34 · « + Create account » 128×34
└─ section 353,90 1079×802 (défilement vertical ET horizontal, overflow-x auto)
    ├─ barre d'outils 373,102 1039×40 · flex space-between
    │   ├─ recherche 320×40 (placeholder « Search »)
    │   └─ « Sorted by Open threads » @1221,114 190×16 : icône de tri 18 #8e8e9c + « Sorted by » 12/400/16 #636370
    │      + valeur 12/550 #1f1f28 + bouton × 24×24 (icône 14 #828291) « Remove sort », gap 6
    ├─ TABLEAU 353,154 1336×2091 (12 px sous la barre ; plus large que la carte → défile à l'horizontale)
    │   colonnes (largeur auto) : Name 283 · Open threads 154 · Tier 120 · Source 95 · Ville 119 · MRR (€) 101 ·
    │   Renouvellement 164 · Contrat actif 126 · Modules 104 · [⋯] 72
    │   ├─ th h 32 · bg #fff · sticky top · 12/550/16 #636370 · p 8px 16px (1re : 8px 16px 8px 32px ; dernière : 8px 32px 8px 16px)
    │   │    filet bas = ombre inset 0 −1px 0 #e7e7ef · icône 14 #8e8e9c avant le libellé (gap 8) · flèche de tri 14 après
    │   │    le th entier est un bouton « Options for <colonne> » (menu) ; la 1re colonne Name est aussi sticky à gauche
    │   │    poignées de redimensionnement : span 4 px à droite de chaque cellule (dégradé rgba(0,0,0,.05)→0, opacité 0)
    │   ├─ 25 lignes puis « Load more » · tr bd-bottom 1px #e7e7ef · hauteur = contenu : 59,5 (pastille 24) ;
    │   │    une ligne dont « Modules » porte 3 valeurs empile 3 pastilles (gap 4) → 116 px
    │   │   td p 16px (1re : 16px 16px 16px 32px ; dernière 16px 32px 16px 16px) · vertical-align top
    │   │   chaque cellule porte un <a> absolu plein cadre → toute la ligne ouvre la fiche du compte
    │   └─ pied 353,1676 1079×58 · p 16px · bouton secondaire « Load more » 77×26 centré (p 5px 8px, 12/550/16)
```

## Cellules

| Colonne | Contenu exact | Styles |
|---|---|---|
| Name | vignette 18×18 r 4px (fond gris, icône bâtiment 12 #8e8e9c) + nom | nom 14/550/20 #1f1f28 · gap 8 · td bg #fff sticky |
| Open threads | icône cercle 14 **#448bff** (sombre #5696ff) + nombre | 12/550/16 #1f1f28 · aligné à droite · gap 6 |
| Tier | pastille : losange empilé 14 couleur du tier + nom | voir « Pastille » (commun) ; sans tier : « – » #babaca |
| Source | icône `<>` 14 #adadb7 + « API » | 12/400/16 #1f1f28 · gap 6 |
| Ville / MRR | « Pointe-à-Pitre », « 1290 » (nombre brut, sans séparateur ni €) | 12/400/16 **#636370** |
| Renouvellement | « Dec 31, 2025, 8:00 PM » (format en-US, heure locale) | 12/400/16 #636370 |
| Contrat actif | point 9 px + « Yes »/« No » | voir « Booléen » (commun) |
| Modules | pastilles empilées verticalement « FILED », « REPUT »… | pastille sans icône, p 0 8px |
| vide | « – » | 12/400/16 #babaca (sombre #625f69) |

Ordre par défaut : **Open threads décroissant** (flèche ↓ dans l'en-tête, « Sorted by Open threads » dans la barre).

## Icônes (SVG exacts, `viewBox 0 0 24 24`, `fill=currentColor`)

- Titre / vignette (bâtiment, 18 et 12) : `<path d="M21 11.5a.5.5 0 0 0-.5-.5H17v10h3.5a.5.5 0 0 0 .5-.5zm-6-8a.5.5 0 0 0-.5-.5h-11a.5.5 0 0 0-.5.5v17a.5.5 0 0 0 .5.5H15zM17 9h3.5a2.5 2.5 0 0 1 2.5 2.5v9a2.5 2.5 0 0 1-2.5 2.5h-17A2.5 2.5 0 0 1 1 20.5v-17A2.5 2.5 0 0 1 3.5 1h11A2.5 2.5 0 0 1 17 3.5z"/><path d="M11.5 13a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0M12 5a1 1 0 1 1 0 2H6a1 1 0 0 1 0-2zM13 18.554V21H5v-2.446c0-.34.192-.65.495-.802a7.84 7.84 0 0 1 7.01 0 .9.9 0 0 1 .495.802"/>`
- Favori (étoile, 18) : `<path d="m8.85 16.825 3.15-1.9 3.15 1.925-.825-3.6 2.775-2.4-3.65-.325-1.45-3.4-1.45 3.375-3.65.325 2.775 2.425zm3.15.45-4.15 2.5a.9.9 0 0 1-.575.15.97.97 0 0 1-.525-.2 1.2 1.2 0 0 1-.35-.438.87.87 0 0 1-.05-.587l1.1-4.725L3.775 10.8A.96.96 0 0 1 3.5 9.725q.1-.274.3-.45.2-.175.55-.225l4.85-.425 1.875-4.45q.125-.3.388-.45t.537-.15.537.15.388.45l1.875 4.45 4.85.425q.35.05.55.225t.3.45.038.563a.96.96 0 0 1-.313.512l-3.675 3.175 1.1 4.725a.87.87 0 0 1-.05.587q-.125.262-.35.438a.97.97 0 0 1-.525.2.9.9 0 0 1-.575-.15z"/>`
- Filters (curseurs, 18) : `<path d="M4 19a.97.97 0 0 1-.712-.288A.97.97 0 0 1 3 18q0-.424.288-.712A.97.97 0 0 1 4 17h4q.424 0 .713.288Q9 17.575 9 18q0 .424-.287.712A.97.97 0 0 1 8 19zM4 7a.97.97 0 0 1-.712-.287A.97.97 0 0 1 3 6q0-.424.288-.713A.97.97 0 0 1 4 5h8q.424 0 .713.287Q13 5.576 13 6q0 .424-.287.713A.97.97 0 0 1 12 7zm8 14a.97.97 0 0 1-.713-.288A.97.97 0 0 1 11 20v-4q0-.424.287-.713A.97.97 0 0 1 12 15q.424 0 .713.287.287.288.287.713v1h7q.424 0 .712.288.288.287.288.712 0 .424-.288.712A.97.97 0 0 1 20 19h-7v1q0 .424-.287.712A.97.97 0 0 1 12 21m-4-6a.97.97 0 0 1-.713-.287A.97.97 0 0 1 7 14v-1H4a.97.97 0 0 1-.712-.287A.97.97 0 0 1 3 12q0-.424.288-.713A.97.97 0 0 1 4 11h3v-1q0-.424.287-.713A.97.97 0 0 1 8 9q.424 0 .713.287Q9 9.576 9 10v4q0 .424-.287.713A.97.97 0 0 1 8 15m4-2a.97.97 0 0 1-.713-.287A.97.97 0 0 1 11 12q0-.424.287-.713A.97.97 0 0 1 12 11h8q.424 0 .712.287.288.288.288.713 0 .424-.288.713A.97.97 0 0 1 20 13zm4-4a.97.97 0 0 1-.713-.287A.97.97 0 0 1 15 8V4q0-.424.287-.712A.97.97 0 0 1 16 3q.424 0 .712.288Q17 3.575 17 4v1h3q.424 0 .712.287Q21 5.576 21 6q0 .424-.288.713A.97.97 0 0 1 20 7h-3v1q0 .424-.288.713A.97.97 0 0 1 16 9"/>`
- Display (écran, 18) : `<path d="M2 21a.97.97 0 0 1-.712-.288A.97.97 0 0 1 1 20q0-.424.288-.712A.97.97 0 0 1 2 19h20q.424 0 .712.288.288.287.288.712 0 .424-.288.712A.97.97 0 0 1 22 21zm2-3q-.824 0-1.412-.587A1.93 1.93 0 0 1 2 16V5q0-.824.587-1.412A1.93 1.93 0 0 1 4 3h16q.824 0 1.413.587Q22 4.176 22 5v11q0 .824-.587 1.413A1.93 1.93 0 0 1 20 18zm0-2h16V5H4z"/>`
- Plus (18, #adadb7) : `<path d="M12 19a.97.97 0 0 1-.713-.288A.97.97 0 0 1 11 18v-5H6a.97.97 0 0 1-.713-.287A.97.97 0 0 1 5 12q0-.424.287-.713A.97.97 0 0 1 6 11h5V6q0-.424.287-.713A.97.97 0 0 1 12 5q.424 0 .713.287Q13 5.576 13 6v5h5q.424 0 .712.287.288.288.288.713 0 .424-.288.713A.97.97 0 0 1 18 13h-5v5q0 .424-.287.712A.97.97 0 0 1 12 19"/>`
- Loupe (18) : `<path d="m18.9 20.3-5.6-5.6q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.887T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5a6.1 6.1 0 0 1-1.3 3.8l5.625 5.625a.92.92 0 0 1 .275.675q0 .4-.3.7a.95.95 0 0 1-.7.275.95.95 0 0 1-.7-.275M9.5 14q1.875 0 3.188-1.312Q14 11.375 14 9.5t-1.312-3.187T9.5 5 6.313 6.313 5 9.5t1.313 3.188T9.5 14"/>`
- Tri (barre d'outils, 18) : `<path fill-rule="evenodd" clip-rule="evenodd" d="M18.8 10a1 1 0 0 1 1 1v5.286l.393-.393a1 1 0 0 1 1.414 1.414L19.514 19.4a1.01 1.01 0 0 1-1.428 0l-2.093-2.093a1 1 0 0 1 1.414-1.414l.393.393V11a1 1 0 0 1 1-1M2 19a1 1 0 0 0 1 1h4.2a1 1 0 1 0 0-2H3a1 1 0 0 0-1 1m0-4.2a1 1 0 0 0 1 1h7a1 1 0 1 0 0-2H3a1 1 0 0 0-1 1m0-4.2a1 1 0 0 0 1 1h9.8a1 1 0 1 0 0-2H3a1 1 0 0 0-1 1m0-4.2a1 1 0 0 0 1 1h14a1 1 0 1 0 0-2H3a1 1 0 0 0-1 1"/>`
- × (14, #828291) : `<path d="m12 13.4-4.9 4.9a.95.95 0 0 1-.7.275.95.95 0 0 1-.7-.275.95.95 0 0 1-.275-.7q0-.425.275-.7l4.9-4.9-4.9-4.9a.95.95 0 0 1-.275-.7q0-.425.275-.7a.95.95 0 0 1 .7-.275q.425 0 .7.275l4.9 4.9 4.9-4.9a.95.95 0 0 1 .7-.275q.425 0 .7.275a.95.95 0 0 1 .275.7.95.95 0 0 1-.275.7L13.4 12l4.9 4.9a.95.95 0 0 1 .275.7.95.95 0 0 1-.275.7.95.95 0 0 1-.7.275.95.95 0 0 1-.7-.275z"/>`
- Cercle « fil ouvert » (14 ; en-tête #8e8e9c, cellule #448bff) : `<path fill-rule="evenodd" clip-rule="evenodd" d="M12 18.3a6.3 6.3 0 1 0 0-12.6 6.3 6.3 0 0 0 0 12.6m0 2.7a9 9 0 1 0 0-18 9 9 0 0 0 0 18"/>`
- Flèche de tri ↓ (14) : `<path d="M17.28 13.513a.95.95 0 0 0-.725-.288 1.03 1.03 0 0 0-.725.313l-2.825 2.825V5.213a.97.97 0 0 0-.288-.713.97.97 0 0 0-.712-.287.97.97 0 0 0-.713.287.97.97 0 0 0-.287.713v11.15l-2.85-2.85q-.3-.3-.713-.3-.412 0-.712.3t-.3.712.3.713l4.575 4.575q.15.15.325.212.175.063.375.063t.375-.063a.9.9 0 0 0 .325-.212l4.6-4.6a.93.93 0 0 0 .275-.688q0-.412-.3-.712"/>` ; ↑ « Sort ascending » : `<path d="M6.73 10.488q.3.3.725.287.425-.012.725-.312l2.825-2.825v11.15q0 .424.287.712.288.288.713.288.424 0 .712-.288a.97.97 0 0 0 .288-.712V7.638l2.85 2.85q.3.3.712.3.413 0 .713-.3t.3-.713-.3-.712l-4.575-4.575a.9.9 0 0 0-.325-.213 1.1 1.1 0 0 0-.375-.062q-.2 0-.375.062a.9.9 0 0 0-.325.213l-4.6 4.6a.93.93 0 0 0-.275.687q0 .413.3.713"/>`
- Tier (losanges empilés, 14, couleur du tier) : `<path fill-rule="evenodd" clip-rule="evenodd" opacity="0.3" d="M13.515 21.577c-.837.564-2.193.564-3.03 0l-.132-.097-6.725-4.959C3.209 16.24 3 15.87 3 15.502c0-.37.21-.74.628-1.022l6.725-4.959.132-.097c.837-.564 2.193-.564 3.03 0l.132.097 6.725 4.959c.419.282.628.651.628 1.021s-.21.74-.628 1.021l-6.725 4.96z"/><path fill-rule="evenodd" clip-rule="evenodd" d="M13.515 14.577c-.837.564-2.193.564-3.03 0l-.132-.097-6.725-4.959C3.209 9.24 3 8.87 3 8.501c0-.37.21-.74.628-1.022l6.725-4.959.132-.097c.837-.564 2.193-.564 3.03 0l.132.097 6.725 4.959c.419.282.628.651.628 1.021s-.21.74-.628 1.021l-6.725 4.96z"/>`
- Source (en-tête, 14) : `<path d="M9 15.5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5zm2 3A2.5 2.5 0 0 1 8.5 21h-3A2.5 2.5 0 0 1 3 18.5v-3A2.5 2.5 0 0 1 5.5 13h3a2.5 2.5 0 0 1 2.5 2.5zM9 5.5a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v3a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5zm2 3A2.5 2.5 0 0 1 8.5 11h-3A2.5 2.5 0 0 1 3 8.5v-3A2.5 2.5 0 0 1 5.5 3h3A2.5 2.5 0 0 1 11 5.5zM19 17a2 2 0 1 0-2 2v2a4 4 0 1 1 0-8 4 4 0 0 1 0 8v-2a2 2 0 0 0 2-2M16 10V8h-2a1 1 0 1 1 0-2h2V4a1 1 0 1 1 2 0v2h2a1 1 0 1 1 0 2h-2v2a1 1 0 1 1-2 0"/>` ; cellule « API » (code `<>`) : `<path d="M16.7 17.3a.93.93 0 0 1-.687.275.97.97 0 0 1-.713-.3q-.3-.3-.3-.712 0-.413.3-.713l3.875-3.875-3.9-3.9a.9.9 0 0 1-.263-.687.98.98 0 0 1 .288-.688.95.95 0 0 1 .7-.275q.425 0 .7.275l4.6 4.6q.3.3.3.7t-.3.7zm-9.4 0-4.6-4.6a.96.96 0 0 1-.3-.7q0-.4.3-.7l4.6-4.6a1 1 0 0 1 .7-.287.95.95 0 0 1 .725.287q.3.3.3.713 0 .412-.3.712l-3.9 3.9 3.9 3.9q.274.275.262.688a.98.98 0 0 1-.287.687.95.95 0 0 1-.7.275.95.95 0 0 1-.7-.275"/>`
- ⋯ « Show more fields » (14, #636370) : `<path d="M6 14q-.824 0-1.412-.588A1.93 1.93 0 0 1 4 12q0-.825.588-1.412A1.93 1.93 0 0 1 6 10q.824 0 1.412.588Q8 11.175 8 12t-.588 1.412A1.93 1.93 0 0 1 6 14m6 0q-.825 0-1.412-.588A1.93 1.93 0 0 1 10 12q0-.825.588-1.412A1.93 1.93 0 0 1 12 10q.825 0 1.412.588Q14 11.175 14 12t-.588 1.412A1.93 1.93 0 0 1 12 14m6 0q-.824 0-1.413-.588A1.93 1.93 0 0 1 16 12q0-.825.587-1.412A1.93 1.93 0 0 1 18 10q.824 0 1.413.588Q20 11.175 20 12t-.587 1.412A1.93 1.93 0 0 1 18 14"/>`
- « Hide in table » (œil barré, 14) : chemin commençant par `m16.1 13.3-1.45-1.45q.225-1.175-.675-2.2t-2.325-.8L10.2 7.4…` (pris dans le menu de colonne ; relire `outerHTML` si besoin du chemin entier).

## États

- **Survol d'une ligne** : toutes les cellules passent à **#f0f0f5** (sombre : fill-neutral-1 #232225), sans transition (`transition: all 0s`).
- **Ligne active / focus clavier** : même fond #f0f0f5 (visible sur la 1re ligne après navigation au clavier).
- **Menu de colonne** (clic sur un th) : `role=menu` 157×101 sous l'en-tête, aligné à droite de la colonne :
  « Sort ascending » ↑ · « Sort descending » ↓ (coche à droite quand actif) · séparateur · « Hide in table » (œil barré).
- **Display** (touche **V**) : popover 280×365 aligné à droite du bouton, 8 px dessous :
  « Shown as table columns » (Open threads, Tier, Source : icône 14 + libellé 12/400/16 + bouton œil 24×24 r 6px p 5px) ;
  « Account fields » + lien « Show all » 10/550/12 **#4a52d1** ; champs masqués = bouton œil barré sur fond #f0f0f5 ;
  pied « Globally hidden fields aren't available here » 10/400/12 #636370 + bouton réglage 24×24.
- **Filters** (touche **F**) : menu de filtres (voir plain-threads.md, même composant).
- **Chargement** : badge « Syncing » en haut à droite pendant la synchro.
- Le tri retiré par × revient à l'ordre par défaut.

## Sombre (mêmes mesures)

Carte #1a191b, th bg #1a191b filet #2b292d, tr bd #2b292d, texte #eeeef0, secondaire #b5b2bc, icônes #98979f / #72707b,
cercle fil #5696ff, pastille ::before #232225 et bord #323035, booléen No #49474e, tiret #625f69, kbd #b5b2bc sur #2b292d.

## Paliers (rechargé à chaque largeur)

| Largeur | Coque | Header | Recherche | Tableau |
|---|---|---|---|---|
| 1440 | barre 345 + carte 1079 (r 12) | 1 ligne, p 0 24px 24px | 320×40 | 1336 de large, défile dans la carte |
| 1024 | panneau réduit, carte 738 à x 278 | 1 ligne ; Display garde « V » | 320 | 1306, défile |
| 768 | barre hors écran ; carte = page (0,0,768) | 1 ligne, p 0 16px 24px ; Display perd le kbd (82) | 320 | 1255, la page défile |
| 390 | idem + bouton menu flottant bleu en bas à droite | 2 lignes : titre (+ « Syncing ») puis Favori / Filters / Display / Create account | **143×40** | 1181 ; Name réduite à **126**, noms tronqués « Agen… » |

## Textes de l'interface

« Accounts » · « Filters » · « Display » · « V » · « Create account » · « Search » · « Sorted by » · « Remove sort » ·
« Name » · « Open threads » · « Tier » · « Source » · « Options for <colonne> » · « Show more fields » · « Load more » ·
« Sort ascending » · « Sort descending » · « Hide in table » · « Shown as table columns » · « Account fields » ·
« Show all » · « Globally hidden fields aren't available here » · « Syncing » · « API » · « Yes » / « No » · « – ».

## Captures (`captures/plain-tenants/`)

`1440-clair.png` (colonnes de champs visibles, 1re ligne au survol) · `1440-sombre.png` · `390-clair.png` · `390-sombre.png` ·
`1440-clair-menu-colonne.png` (menu « Open threads », survol de « Sort descending ») · `1440-clair-menu-display.png`.
Formats : voir commun (1440 rendu en 800×500).
