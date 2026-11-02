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
