# L'atelier des écrans de Varelo

Les 13 images de `/secteurs/groupes` (`public/secteurs-groupes/ecrans/*.webp`)
sont des écrans de Varelo peints en HTML sur des **données d'exemple**, puis
photographiés. Varelo n'a pas encore d'application : ces écrans en sont la
maquette. Aucun groupe, aucune société ni personne réelle n'y figure.

Chacun remplace une image de la référence (payload-marketing-v1.21st.app),
au **même rapport largeur/hauteur** et, pour les calques, aux mêmes
emplacements, relevés au quadrillage de 100 px CSS le 25/09/2026 :

| écran (ici)               | image de la référence              | taille       |
|---------------------------|------------------------------------|--------------|
| heros-point-du-matin      | 3.0-homepage-live-preview-hero.png | 3200 × 1914  |
| heros-referentiel         | config.webp                        | 3200 × 1972  |
| collage                   | 3.0-collage-3.webp                 | 2880 × 1940  |
| survol-groupe             | hh-cms-new-1.png                   | 1800 × 1440  |
| survol-contrats (+ fiche) | hh-ecom-2 (+ hh-ecom-1)            | 1800 × 1586  |
| survol-reserves (+ delai) | hh-etb-02 (+ hh-etb-01)            | 1800 × 1500 / 1518 |
| survol-reportings         | hh-dam-new-1.png                   | 1800 × 1440  |
| systemes-lecture-seule    | folder-structure-mockup-1.webp     | 2292 × 1442  |
| systemes-referentiel      | visual-editing.webp                | 2400 × 1274  |
| systemes-validation       | vectordatabase-v2.webp             | 3200 × 1644  |
| systemes-europe           | Define-schema.webp                 | 2400 × 1600  |

## Refaire un écran

```bash
node outils/ecrans-varelo/rendre.mjs                  # tous
node outils/ecrans-varelo/rendre.mjs collage survol-groupe
GARDER=1 node outils/ecrans-varelo/rendre.mjs collage # garde le PNG dans .rendus/
```

- `ecrans.html` : un plan de travail `[data-ecran]` par image, à sa taille
  CSS (la moitié de l'image) ; `data-transparent` pour un fond transparent.
  Ouvrir le fichier dans un navigateur montre tous les plans à la suite.
- `atelier.css` : le système d'interface commun (charte de l'espace client :
  clair, filets fins, arrondis 6/5 px, la couleur ne porte que le sens).
- `ecrans.css` : les règles propres à chaque écran.
- `rendre.mjs` : isole chaque plan (`?seul=nom`), photographie à la densité 2
  avec le Chromium de Playwright en CDP (`chrome.mjs`, celui de la skill
  methode-site), écrit le WebP (qualité 86).

**Après avoir refait une image**, reporter ses dimensions dans
`components/secteurs/groupes/textes.ts` si elles changent. En local,
`next dev` garde les anciennes variantes en cache :
`rm -rf .next/dev/cache/images`, puis relancer le serveur. Un remplacement de
fichier pendant qu'une variante se calcule peut **bloquer** cette variante
jusqu'au redémarrage (vu le 25/09 : la grande image du héros ne chargeait
plus au téléphone). En ligne, un nouveau déploiement suffit.

## Les photos

`photos/` : les photos Unsplash incrustées dans les écrans (licence Unsplash,
ni « premium » ni « plus »), avec `CREDITS.txt`. Les quatre photos de pièces
et de sociétés du collage viennent de `public/secteurs-groupes/`. Les crédits
publics sont recopiés dans `public/secteurs-groupes/CREDITS.txt`.

## Polices

`GeneralSans-Variable.woff2` (copie de `app/_polices/`) et
`GeistMono-latin.woff2` (Google Fonts, OFL) : les polices du site, pour que
les écrans parlent comme la page.

## Détourer un produit sur fond blanc (27/09/2026)

Teo, sur les vignettes des reportings : des photos « comme sur des sites comme
Mr Bricolage, mais avec le fond blanc ». Les photos produit des enseignes
appartiennent à l'enseigne ou au fabricant et portent leurs marques (sur un
écran « reportings dus aux marques », une perceuse DeWalt ferait croire à une
relation) : on prend une photo libre (Unsplash, `w=2000`), on détoure le
produit, on le pose sur un carré blanc pur. Même rendu qu'une fiche de
catalogue, sans rien emprunter.

```bash
# une fois : compiler l'outil (détourage « copier le sujet » de macOS 14+)
printf '' > /tmp/vide.modulemap
cat > /tmp/surcouche.yaml <<'YAML'
{"version": 0, "case-sensitive": "false", "roots": [{"type": "directory",
 "name": "/Library/Developer/CommandLineTools/usr/include/swift",
 "contents": [{"type": "file", "name": "module.modulemap",
 "external-contents": "/tmp/vide.modulemap"}]}]}
YAML
swiftc -O -vfsoverlay /tmp/surcouche.yaml -Xcc -ivfsoverlay -Xcc /tmp/surcouche.yaml \
  detourer.swift -o .detourer

# puis, pour chaque photo
./.detourer source.jpg /tmp/sujet.png
python3 poser.py /tmp/sujet.png photos/<rayon>-<objet>.jpg
```

- La surcouche masque un module `SwiftBridging` déclaré deux fois par les
  Command Line Tools actuelles (« redefinition of module 'SwiftBridging' ») :
  sans elle, `swiftc` ne compile rien qui importe Foundation. Aucun fichier
  système n'est touché.
- `https://unsplash.com/photos/<id>/download?force=true` redirige vers le
  fichier plein format : c'est ainsi qu'on retrouve une photo déjà en place.
- Choisir un produit entier (pas coupé par le bord), seul, et sans marque
  lisible ; Vision prend parfois deux objets pour un seul sujet (un deuxième
  arrosoir derrière le premier) : changer de photo.
