# Relevé — Attio, liste People et fiche d'un contact

Relevé le 01/11/2026 au `getComputedStyle` (couleurs converties en hex, `a0.63` = alpha 0,63). Espace « Omega » (`/omega`).
Liste : https://app.attio.com/omega/people (vue « Recently Contacted People ») — fiche : https://app.attio.com/omega/person/a69c4e8b-19a6-4ff1-ae18-bbdb21a11c14/overview.
Attio **suit le thème du système** ; les deux thèmes relevés par émulation.

## Ce qui a été créé — et une précaution

- La liste People de Teo contient déjà **35 contacts réels** synchronisés depuis sa boîte (noms, adresses, force de relation, dates
  d'échange) : elle est « pleine » au sens de la règle 2, mais avec de vraies personnes. **Avant chaque capture de la liste, les noms ont été
  remplacés dans la page affichée seulement** (DOM, rien d'enregistré) par des noms fictifs, et les photos masquées ; aucune donnée réelle
  n'est dans les captures. Une prévisualisation de courriel au survol montrait un vrai sujet : capture jetée.
- Créés : 2 contacts fictifs **Aurélie Chevalier** (798a5417…) et **Bastien Marchand** (a69c4e8b…, `bastien.marchand@example.com`,
  description « Gérant, suit le chantier de la résidence. », poste « Gérant » ; Attio lui a rattaché tout seul l'entreprise « Example Domain »
  d'après le domaine). Le remplissage en série n'a pas abouti : les écritures d'Attio passent par une référence interne de `fetch` non
  interceptable et le formulaire au clavier se désynchronise ; la fiche relevée a donc peu d'activité (2 événements, 0 courriel/note/tâche).
- Rien d'autre modifié ; aucune vue de Teo changée.

## Polices et couleurs

**Inter** variable (100–900) ; **JetBrains Mono** 400/500/600 (identifiants). Texte d'interface 14/500/20, **interlettre −0,07 px** ;
petits libellés 12/500/16. Clair · sombre : fond #ffffff · #101112 ; texte #101112 · #f1f2f3 ; libellé secondaire #000 a0.63 · #fff a0.60 ;
texte vide/discret #000 a0.50 · #fff a0.45 ; filets de grille **#eeeff1 · #1b1c1f** ; lien/courriel #266df0 · #4e8cfc ; accent bouton #266df0.

## Coque (1440×900)

```
BARRE LATÉRALE 0..275 : sélecteur d'espace « (O) Omega ⌄ » + bouton replier ; « Search ⌘ K » (bouton 214×28, bg #fff, r 8px,
  ombre `inset 0 0 0 1px transparent, 0 0 2px #1c284030, 0 1px 3px #0000000a`) + boîte de réception
  liens 258×28 @x 8 · p 0 4px 0 8px · r 9px · gap 6 · icône 16 + 14/500/20 #101112 ; actif bg #000 a0.04 (sombre #fff a0.05)
  Home · Tasks (compteur « 2 ») · Notes · Emails · Calls · Reports · Sequences · Workflows ; titre « Records » 12/500/16 #000 a0.63 :
  Companies · People ; « Lists » : Recruiting ; « Chats » ; carte « Getting started 2/6 » ; « Invite members » ; « 7 days left on trial! Keep Pro »
EN-TÊTE <header> 275,0 1165×49 · p 0 12px · filet bas 1px #eeeff1 : icône objet + « People » (fil d'Ariane) … avatar, Share (texte #000 a0.55),
  icônes, « Ask Attio » (bouton blanc r 8px p 4px 8px 4px 6px, même ombre)
```

## Liste People — arbre

```
barre de vue @y 59 (h 28) : « ▦ Recently Contacted People ⌄ » 236×28 · « ⚙ View settings ⌄ » 145×28 (boutons blancs r 8px p 4px 6px, ombre ci-dessus,
  texte 14/500/20 #101112) … à droite « Import / Export ⌄ » 155×28 · « + New Person » 116×28 (**bg #266df0**, texte #fff,
  ombre `inset 0 0 0 1px #0000000f, 0 2px 4px -2px #266df01f…`)
barre de tri/filtre @y 108 (h 28) : « ⇅ Sorted by **Last interaction** » 210×28 (bg #fff, `inset 0 0 0 1px #e6e7ea`, « Sorted by » #000 a0.63)
  · « Filter » 71×28 (bg #000 a0.02, texte #000 a0.50)
GRILLE (positions absolues, pas de <table>) @x 275, en-têtes @y 146 h **40**, lignes h **36**
  colonnes : case 16×16 (bg #fff, bd 1px #000 a0.09, **r 6px**) + Person **250** (bouton + pour ajouter) · Connection strength **215** ·
  Last email interaction **288** · Last calendar interaction **310** · « + Add column » 250
  en-tête : icône 16 + libellé 14/500/20 #101112, p 0 12px, filets haut/bas #eeeff1 ; boutons « épingler » et « éclair » à droite de certaines colonnes
  cellule : bg #fff · bordure droite et basse 1px #eeeff1 · contenu p 8px 12px 0
    Person : lien-pastille a 164×24 · p 2px 6px 2px 4px · r 10px · gap 6 : avatar 16 (photo ou silhouette) + nom 14/500/20 #101112 (ellipsis)
    Connection strength : pastille 16 (sprite : `rect x4 y4 w8 h8 rx3`, couleur par niveau **Very strong #00D17E · Strong #266DF0 · Weak #F97514 ·
      Very weak #FF5454**) + libellé 14/500/20, gap ~4
    dates relatives « 1 day ago », « about 1 month ago », « over 1 year ago » 14/500/20 #101112 ; vide « No contact » #000 a0.50
  pied : « 37 count » 14/500 + « + Add calculation » #000 a0.50 sous chaque colonne
chargement : barres grises arrondies dans les colonnes de relation (plusieurs secondes)
survol d'une ligne : pas de changement de fond mesuré ; survol d'une date de courriel = carte d'aperçu du courriel (sujet, participants, pièces jointes)
```

**Companies** utilise exactement la même grille (vue « All Companies ») : Company 250 · Connection strength 215 · Categories, Domains,
LinkedIn, Twitter, Twitter follower count, Foundation date, Primary location / Country 180 · Description 288. Fiche entreprise non relevée
à part (même gabarit de fiche qu'une personne, avec les attributs entreprise).

## Fiche d'un contact — arbre (1440×900)

```
en-tête : fil d'Ariane « People / BastienMarchand » 14/500
PANNEAU GAUCHE 275..625 (350) :
  avatar + nom **18/600/24** #101112 + crayon + étoile
  rangée d'actions : « ✉ Compose email » 146×28 (bouton blanc r 8px) + 5 boutons icône 28×28 (copier, note, fusionner, tâche, séquence)
  « Record Details ⌄ » 12/500/16 #000 a0.63 ; lignes 318×32 (gap 6) : icône 16 + libellé 12/500/16 #000 a0.63 (colonne ~95) + valeur 14/500/20
    Name · Email addresses (lien #266df0) · Description (ellipsis) · Company (pastille entreprise) · Job title ; « View all values » 12/500 #000 a0.55
  filet ; « Lists ⌄ » + « Add to list » ; « This record has not been added to any lists » 14/500 #000 a0.50
PANNEAU DROIT 637..1440 :
  onglets @y 57 h 28 : **Overview** (actif : bg #fbfbfb, `inset 0 0 0 1px #eeeff1`, r 8px, p 4px 8px) · Activity · Emails 0 · Calls 0 ·
    Company 1 · Notes 0 · « +2 more ⌄ » (inactifs texte #000 a0.63)
  « Highlights » 14/500 #000 a0.63 ; grille 3×2 de cartes 253×86 (gap 8) : titre 12/500/16 #000 a0.63 + icône à droite, p 10px 12px 0 ;
    valeur 14/500/20 (vide « No Connection », « No interaction », « No phone numbers », « No Primary location » #000 a0.50 ; entreprise ; courriel bleu)
  « Activity » + « View all » 12/500 : lignes « (T) Teo Karczewski changed 3 attributes … 3 minutes ago » (heure 12/500 #000 a0.50)
  sections repliables « Emails 0 », « Notes 0 », « Tasks 0 » avec « + » à droite
```

Sombre (mesuré) : fond #101112, libellés #fff a0.60, valeurs #f1f2f3, courriel #4e8cfc, onglet actif bg #17181a `inset 0 0 0 1px #1b1c1f`,
vide #fff a0.45. Liste : cellules #101112, filets #1b1c1f, « No contact » #fff a0.45, « New Person » #266df0, boutons de vue #101112
avec `inset 0 0 0 1px #212224`, lien actif de la barre latérale #fff a0.05, titre de section #fff a0.60.

## 390×844

Attio n'a **pas de mise en page mobile** : la barre latérale sort de l'écran (x −266), l'en-tête garde ses éléments tronqués,
la grille garde ses colonnes de 250/215… et défile à l'horizontale ; la fiche garde ses deux panneaux (gauche 320 visible, droit coupé).

## Captures (`captures/attio-people/`)

`1440-clair.png` · `1440-sombre.png` · `390-clair.png` (liste, noms remplacés à l'affichage) · `1440-clair-fiche.png` · `1440-sombre-fiche.png` ·
`390-clair-fiche.png`. Résolution : voir la limite notée dans `calcom-bookings.md` (1440 rendu en 800 px).

## Non relevé

Menus « View settings », « Import / Export », filtre actif, sélection de lignes, fiche entreprise, onglets Activity/Emails/Notes de la fiche
(vides) : faute de pouvoir remplir Attio en série sans toucher aux données réelles de Teo.
