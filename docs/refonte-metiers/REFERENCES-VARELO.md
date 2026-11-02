# VARELO — sous-pages, références, preuves (02/11/2026)

Règles : `docs/refonte-metiers/REGLES.md`. Consigne : `docs/refonte-metiers/cloud/COMMUN.md` et `cloud/VARELO.md`.
Inventaire (contrat de la refonte) : `docs/refonte-metiers/varelo.md`. Préfixe CSS : `var-`.

## Méthode de preuve

- `npx next dev -p 3100`, puis `outils/var-preuve.sh <route> <captures de référence> <nom> [dx]` : Playwright
  (chromium headless), fenêtre 1440×900 et 390×844, `deviceScaleFactor: 1`, `colorScheme` sombre et clair,
  données d'exemple (`espace.source = exemple`). Images dans `docs/refonte-metiers/comparaisons/varelo/` :
  `<nom>-1440-<thème>-cote.png` (référence à gauche), `-diff.png` (différence ×4), `-fusion.png` (moitié-moitié),
  `-nous.png` (notre capture entière), `<nom>-390-<thème>-cote.png`.
- On compare **carte contre carte** : la carte `main` du SaaS (244,8 ; 1188×856) et notre `.var-carte`
  (304,56 ; 1128×836), posée dans la coquille d'espace2 dont la barre du haut (48) et les barres latérales (304)
  tiennent la place de la barre latérale du SaaS. La carte est 60 px plus étroite : une colonne centrée tombe
  30 px plus à gauche, d'où `--dx -30` pour ces pages.
- Socle repris de Daliro (même référence Linear, mêmes relevés) sous le préfixe `var-` : jetons sombre et clair
  relevés, carte, en-tête, menu « … » (`components/espace2/varelo/var.css`, `VarCadre.tsx`) ; icônes du sprite de
  Linear générées par `outils/var-icones.mjs` (`VarIcone.tsx`).
- Logique : l'écran d'avant devient un crochet (`useReferentielVarelo`, `EcranVarelo.tsx`), servi aux sous-pages
  par `components/espace2/varelo/donnees.tsx` ; l'écran d'avant reste sous `?ancien=1`.

## Écarts communs à toutes les sous-pages (expliqués)

- Hors carte : la coquille d'espace2 (barre du haut, rail, volet de navigation) remplace la barre latérale du
  SaaS ; à 390, la barre du haut d'espace2 (82 px, avec « Données d'exemple ») précède la carte. Ce n'est pas la
  page copiée.
- Le contenu (textes, nombre de lignes) est celui du métier : les écarts de la différence suivent les mots.
- Les fenêtres des gestes (formulaires de l'écran d'avant) s'ouvrent dans la fenêtre modale de l'espace : Linear et
  Plain n'ont pas ces formulaires (gestes du métier).

## Sous-pages

| Sous-page | Route | Référence | Relevé | Comparaisons | État |
|---|---|---|---|---|---|
| Ce matin | `/espace2/varelo` | Linear, accueil d'une équipe | `linear-home.md` | `ce-matin-*` | fait |
| Contrats | `/espace2/varelo/contrats` (`?contrat=<id>`) | Plain, Accounts : liste et fiche | `plain-tenants.md`, `plain-tenant.md` | `contrats-liste-*`, `contrats-fiche-*`, `contrats-fiche-volet-*` | fait |

### Ce matin → Linear, accueil d'une équipe (`linear-home.md`)

Contenu : blocs 4 (4.1-4.7), 22, 3 (phrase et renvoi vers Sources et structure). Superposition 1440 (dx −30) :
sombre écart moyen 7,4/255, clair 7,2/255 ; en-tête (fil, « … », copier le lien), onglets, tuile et titre,
description, sections, rangées de 40, colonne droite (« Membres », « Aller à ») tombent sur la référence. 390 :
liens « Aller à » repliés sous la description avec l'avatar en tête, comme Linear.

Écarts restants, expliqués :
- « Team resources » devient sept sections, une par sous-bloc du point (le contenu du métier) ; chaque section
  garde un seul rond (« Ouvrir », icône « ajouter une section ») : le « + » de Linear crée un document, geste qui
  n'existe pas ici.
- Icône de rangée : la gravité de la ligne (critique, à regarder, pour information) prend l'icône de priorité de
  Linear (urgent, haute, basse) au lieu de l'icône de document ; la gravité est une information du métier.
- Pas d'étoile (« Add to favorites ») dans le fil : pas de favoris dans l'espace.
- « Members » montre la personne connectée (initiales) : pas d'équipe nommée dans Varelo.

### Contrats → Plain, Accounts (`plain-tenants.md`, `plain-tenant.md`, `plain-commun.md`)

Contenu : bloc 14 (liste, filtres, compteurs), 14.a et 14.b (fenêtres d'avant), gestes G24 à G28, lien du tiers vers le
référentiel. Repère `grp_contrats` → `?contrat=<id>` (aiguillage mis à jour). Socle Plain : `var-plain.css`,
`PlainCadre.tsx` (menu, popover, touches F et V), `PlainIcone.tsx` (tracés relevés).

Preuves (carte Plain à x 353, la nôtre à 304 ; on compare les 1079 premiers pixels de la liste, puis la colonne de 719 et
le volet de 360 de la fiche) :
- liste 1440 : sombre 6,7/255, clair 5,6/255. En-tête, recherche, « Trié par », en-têtes de colonnes de 32, lignes de
  59,5 (pastille calée de 2,5 px comme chez Plain), vignettes, cercles, pastilles, booléens tombent juste ;
- fiche 1440 : colonne 12,2 et 10,9/255 (le contenu d'onglet diffère : étapes contre fils), volet 7,7 et 6,6/255 ;
  « ← Contrats », vignette et titre (écart vignette-titre 4 px : mesuré sur les positions, le relevé écrit 12), méta,
  contrôle segmenté, filet, pile de blocs à filets de 1 px ;
- 390 : en-tête sur deux lignes, recherche réduite, tableau qui défile, « Nom » tronquée ; la fiche ouvre le volet en
  feuille plein écran avec le rappel du titre, comme Plain.

Écarts restants, expliqués :
- Pas d'étoile (favori) ni de badge « Syncing » : l'espace n'a pas de favoris, la lecture n'est pas une synchro.
- Colonnes : celles du métier (jours restants, catégorie, reconduction, société, montant, échéance, dénoncé,
  décision) dans les briques des colonnes de Plain (cercle d'« Open threads », pastille de Tier, texte à icône de
  Source, texte gris, nombre aligné à droite, booléen, pastille de Modules). Le cercle prend la couleur de l'état du
  délai (rouge, jaune, bleu) : information du métier.
- Dates et nombres en français (« 20/11/2026 », « 36 000,00 € » dans le volet) : traduction.
- Les quatre compteurs d'avant sont dans le menu « Filtres » (Plain n'a pas de bandeau de chiffres sur cette page).
- Onglets de la fiche : « Étapes » (brique Tasks : faire valider, dénoncer), « Contrats du tiers » (brique Customers),
  « Notes » (carte vide de Plain quand il n'y en a pas) : Threads, Themes et Issues n'ont pas d'équivalent.
- Whyte (titre de page, licence payante) → Inter 400 même taille ; geistMono → Source Code Pro (chargée par l'espace).
- « Faire valider » et « Archiver » passent par une confirmation (consigne commune).
