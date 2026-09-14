# Le menu de navigation du header (11/09/2026)

Remplacement du burger-à-toutes-les-largeurs par un **bandeau de cinq
rubriques** à partir de `lg`, bâti sur le `navigation-menu` de ReUI/shadcn.
Sous `lg`, rien n'a bougé : c'est toujours le burger et son panneau plein
écran de juillet.

## Pourquoi

Les quatre pages produit rapatriées le 11/09 (voir `RAPATRIEMENT.md`)
n'étaient atteignables que par `/offres` : tout le catalogue tenait derrière
une seule entrée d'un menu qui, lui-même, ne s'ouvrait qu'au burger. Deux
clics et un défilement pour arriver sur un produit, à 1700 px comme à 390.

## Les fichiers

| fichier | rôle |
|---|---|
| `lib/menu.ts` | **la source unique.** Cinq rubriques, leurs entrées, leurs textes, et les arbitrages datés hérités de l'ancienne liste `NAV` |
| `components/ui/navigation-menu.tsx` | la reprise ReUI, réencrée — cinq adaptations documentées en tête |
| `components/MenuPrincipal.tsx` | le bandeau lui-même : les cinq rubriques, la case vedette de « Nos offres » |
| `components/menu-principal.css` | les variables des deux mondes + l'animation d'ouverture |
| `components/Header.tsx` | insère le bandeau, cache le burger à `lg`, et aplatit les mêmes rubriques dans le panneau |
| `outils/recette-menu.mjs` | la recette aux cinq largeurs |

Les deux surfaces (bandeau et panneau) lisent `lib/menu.ts`. Ajouter une
entrée là suffit : elle apparaît aux deux endroits.

## Les cinq rubriques

1. **Nos offres** — case vedette `/offres`, puis les 4 produits et Sur mesure
2. **Votre site** — `/modeles`, `/tarifs/site`
3. **Intégrations** — lien direct
4. **Tarifs** — lien direct
5. **Ressources** — `/vos-donnees`, `/reserver-un-audit`, `/blog`

## Les écarts assumés, à ne pas « corriger »

- **`/vos-donnees` descend d'un cran.** Elle était une entrée de premier
  niveau depuis le 07/08, à la demande de Teo (« bah nan elle est pas dans la
  liste ») ; elle est maintenant la PREMIÈRE entrée de « Ressources ».
  C'est le seul recul du chantier, consenti pour tenir cinq intitulés dans la
  barre au lieu de sept. La remettre au premier plan = la sortir en rubrique
  simple (`{ label, href }`) dans `lib/menu.ts`.
- **Le panneau du téléphone se replie, il ne s'aplatit pas.** Première
  version : les onze destinations à la suite sous trois intitulés de groupe.
  Teo, en la voyant — « sur la version mobile c'est pas des trucs
  déroulants […] du coup c'est gênant, trop chargé ». Le panneau était passé
  de sept rangées à quatorze et débordait de l'écran. Il rend maintenant les
  CINQ rubriques, dépliables au doigt, une seule à la fois : cinq rangées au
  repos, aucun défilement, même « Nos offres » déplié.
- **Le dépli n'est pas animé.** Une hauteur ou une opacité qui part de zéro
  laisse le contenu invisible dès que le navigateur cesse de produire des
  images. Seul le chevron pivote — un chevron figé ne cache rien.
- **Le panneau déroulant porte une ombre**, alors que la charte du site n'en
  met nulle part. Sans elle, un panneau flottant sur le hero sombre se lit
  comme un bloc collé à la page.
- **Aucune animation d'opacité, aucune animation de sortie.** Ce n'est pas un
  oubli : la raison est mesurée et écrite en tête de `menu-principal.css`.
  Y remettre un fondu ferait réapparaître un menu invisible dès que le
  navigateur cesse de produire des images.

## Recette du 11/09

`node outils/recette-menu.mjs http://localhost:3010` — accueil (monde sombre)
et `/offres/relances-impayes` (monde clair), à 390, 768, 1024, 1440, 1700.
`node outils/recette-panneau.mjs http://localhost:3010` pour le panneau
tactile. Captures : `node outils/capture-menu.mjs`.

- 390 et 768 : bandeau `display: none`, burger visible. Jamais les deux.
- 1024 et au-delà : bandeau visible (504 × 36), burger caché.
- Les trois panneaux s'ouvrent avec le bon nombre de liens (6 / 2 / 3), fond
  blanc opaque, et **aucun ne sort de la fenêtre** — le plus à droite finit à
  957 px sur une fenêtre de 1024.
- Échap referme, la souris qui quitte la barre referme.
- Zéro débord horizontal aux cinq largeurs. Les treize destinations du menu
  répondent 200.
- Panneau tactile (390 et 768) : **cinq rangées, défilement 0**, pied ancré
  au bas de l'écran, chaque rubrique déplie toutes ses entrées et replie la
  précédente, aucun élément à opacité < 1.
