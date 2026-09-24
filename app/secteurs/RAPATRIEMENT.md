# Rapatrier un SaaS sectoriel dans omegaai.fr

Méthode écrite le 24/09/2026 après **Daliro (BTP)**, le premier des quatre.
À lire avant de commencer Tamila, Lorani ou Tavaro.

Teo : « quand on clique sur CASHD c'est une page qui tourne dans omegaai.fr, on
peut recliquer en haut pour revenir à l'accueil. Je veux le même système pour
les pages par secteur. Omega c'est blanc : les SaaS qui sont en noir, change les
couleurs et mets tout en blanc. »

Le précédent est CASHD (11/09) : lire d'abord l'en-tête de
`app/offres/relances-impayes/page.tsx` (les six règles), celui de
`relances.css`, puis `app/secteurs/btp/page.tsx` et `btp.css`, qui les
appliquent aux secteurs.

## Les quatre

| Secteur | SaaS | Source (nom d'origine) | Classe | Fichiers |
|---|---|---|---|---|
| `btp` | Daliro | `OMEGA/chantieros-site` | `.p-btp` | ✅ fait le 24/09 |
| `avocats` | Tamila | `OMEGA/cabinetos-site` | `.p-avocats` | ✅ fait le 24/09 (source **sombre**, § Source sombre) |
| `architectes` | Lorani | `OMEGA/dossieros-site` | `.p-architectes` | |
| `location-automobile` | Tavaro | `OMEGA/rentalos-site` | `.p-location` | |

Chaque secteur possède, et rien d'autre :

```
app/secteurs/<slug>/page.tsx        la page, métadonnées comprises
app/secteurs/<slug>/<slug>.css      le bloc .p-<…>, relevé et écarts en tête
components/secteurs/<slug>/*        les composants copiés
public/secteurs-<slug>/*            ses images (JAMAIS public/secteurs/…)
lib/secteurs.ts                     une seule clé : integre: true sur sa ligne
```

Ne pas toucher : `lib/menu.ts`, `next.config.ts`, `app/secteurs/page.tsx`,
`app/secteurs/[metier]/`, `components/logos.tsx`, `globals.css`. Ne pas
commiter : l'orchestrateur s'en charge.

## La page est pleine : aucun filet qui l'encadre (24/09, soir)

Teo, sur Daliro en ligne : « la page n'est pas pleine, regarde, il y a les
barres sur les côtés ». Règle, pour les quatre :

- **Aucun filet vertical qui encadre toute la page** : pas de `border-x`
  sur un conteneur global, pas de rails latéraux, même si la source en pose
  (Daliro en avait deux paires ; ils sont retirés).
- **Le contenu reste centré**, section par section : chaque section dans
  son propre conteneur (fonction `Section` de `app/secteurs/btp/page.tsx`
  et de `app/secteurs/avocats/page.tsx`).
- **Un séparateur entre sections prend toute la largeur de la fenêtre** :
  il se pose HORS du conteneur (bandes hachurées de Daliro,
  `components/secteurs/btp/Bande.tsx`, sans leurs croix d'angle qui
  n'avaient de sens qu'au croisement des rails ; filet de Tamila,
  `.avocats-filet`, posé au bord haut de la section « Chaque pièce est
  lue »). Un séparateur dessiné DANS une section qui porte
  `overflow-hidden` (le `::before` de `.companies` chez Tamila) doit en
  sortir : le `overflow` le rognerait à la largeur du conteneur.

## Les étapes, dans l'ordre suivi pour Daliro

1. **Figer la source.** Une autre session travaille souvent encore le site.
   Copier `src/` et `public/` dans son bloc-notes, noter l'heure, et ne plus
   rien lire ailleurs. **Ne rien modifier dans `OMEGA/<nom>-site`.** L'heure de
   la copie va dans l'en-tête de chaque fichier (« COPIÉ le … à … »).
2. **Regarder la référence déployée** : `defile.mjs <url> 1440 900` et une
   planche des captures. Repérer les surfaces sombres (bandes, cartes,
   maquettes), le pied, l'entête.
3. **Recenser ce qui ne vient pas** : `nav.tsx`, `footer.tsx`, menus, bascule
   de thème, amorce `localStorage`. Chez Daliro, les sections
   `src/components/sections/*.tsx` sont GÉNÉRÉES par `outils/assembler.py` :
   on copie le résultat, pas l'outil.
4. **Passe mécanique** avec `outils/rapatrier-secteur.py` (voir plus bas) :
   couleurs du `@theme` → hexadécimal, `dark:` retirés, `animate-*` renommés,
   chemins d'images, apostrophes des fichiers générés.
5. **Passe à la main**, fichier par fichier, avec un en-tête qui liste ce qui
   a changé : imports (`@/lib/cn`, `@/components/Lien`, chemins relatifs),
   liens (§ Règles maison), `sticky top-…`, dépendances absentes, surfaces
   sombres en dur, « J-2 », logos.
6. **Écrire `<slug>.css`** sur le modèle de `btp.css` : jetons, polices du
   site, peau 100vw, règle de base des filets (dans `@layer base`),
   conteneur renommé, keyframes préfixées.
7. **Écrire `page.tsx`** : `PageShell`, `data-monde="clair"`, le cadre de la
   source moins entête et pied, métadonnées copiées de CASHD avec
   `images: ["/opengraph-image"]`.
8. **Brancher** : `integre: true` dans `lib/secteurs.ts`. Le build doit
   afficher `○ /secteurs/<slug>` hors de la liste `[metier]`.
9. **Vert** : `npx tsc --noEmit`, `npx eslint <tes fichiers>`,
   `npm run build`. Puis `npx next start -p 3471` (jamais `next dev`, un seul
   serveur sur ce Mac) et l'arrêter à la fin.
10. **Recette** aux cinq largeurs (§ Recette).

## L'outil de la passe mécanique

```bash
python3 outils/rapatrier-secteur.py --source ~/Desktop/OMEGA/<nom>-site \
  --prefixe <slug> --dest components/secteurs/<slug> \
  src/components/hero.tsx=Heros.tsx src/components/sections/cta.tsx=Appel.tsx …
```

Il lit la table des jetons dans le `globals.css` de la source (`@theme` +
`:root`, formats `#hex`, `var(--x)` et `hsl(var(--x))`), l'imprime, puis
convertit. **Si la source est sombre** (Tamila), la table lue est celle du
noir : écrire un JSON des valeurs CLAIRES (`{"background": "#ffffff", …}`)
et le passer par `--jetons`. L'outil signale aussi les `bg-black`,
`bg-neutral-800/900`, `text-white` restés en dur : ceux-là se regardent un
par un.

## Table de conversion (Daliro, thème clair de la source)

| Utilitaire source | Ici |
|---|---|
| `bg-background`, `bg-card`, `bg-popover` | `bg-[#ffffff]` |
| `text-foreground`, `text-card-foreground`, `text-secondary-foreground`, `text-accent-foreground` | `text-[#171717]` |
| `bg-primary` / `text-primary-foreground` | `bg-[#171717]` / `text-[#ffffff]` |
| `bg-muted`, `bg-secondary`, `bg-accent` | `bg-[#f5f5f5]` |
| `text-muted-foreground` | `text-[#737373]` |
| `border-border`, `divide-border`, `ring-border`, `border-input`, `stroke-border` | `…-[#e6e6e6]` |
| `ring-ring`, `border-ring` | `…-[#171717]` |
| `…-foreground/15` (tout suffixe d'opacité) | `…-[#171717]/15` (le suffixe se garde) |
| `from-/via-/to-background`, `from-muted/40` | `from-[#ffffff]`, `from-[#f5f5f5]/40` |
| `*-destructive` | `*-[#ef4444]` |
| `animate-orbit`, `animate-counter-orbit` | `btp-orbite`, `btp-contre-orbite` (btp.css) |
| `animate-scroll-left-slow` / `-right-slow` | `btp-defile-gauche-lent` / `-droite-lent` |
| `data-[state=…]:animate-accordion-up/down` | `btp-accordeon` (btp.css) |
| `container` (utilitaire redéfini) | `btp-conteneur` (btp.css) |
| `border`, `border-x`, `divide-y` **sans couleur** | rien à écrire : règle de base de btp.css |
| `dark:…` (51 chez Daliro) | retirés |
| `/glyphes/…`, `/icones/…` | `/secteurs-btp/glyphes/…`, `/secteurs-btp/icones/…` |

~550 conversions en tout ; le détail par fichier est dans leurs en-têtes.

## Les pièges tombés

- **`bg-muted` ne se tait pas.** Le site définit `--color-muted: #9b9ba3`.
  Un `bg-muted` non converti ne « peint rien » comme `bg-card` : il peint un
  gris moyen. Idem `text-muted`. Toujours convertir, jamais laisser.
- **Les filets sans couleur.** La source pose `* { border-color: var(--border) }`
  en couche de base ; ici Tailwind v4 les laisse en `currentColor`, soit du
  #171717 plein sur toute la grille. La règle est reprise **dans
  `@layer base`** : écrite hors couche, elle battrait tous les
  `border-[#171717]/15` et `border-blue-500` du balisage. Vérifié au style
  calculé : bordure sans couleur #e6e6e6, bordure colorée intacte.
- **U+2011 n'existe pas dans General Sans** (table cmap vérifiée). Le « J-2 »
  insécable passe par `whitespace-nowrap` (`insecable.tsx` pour les textes
  de `textes.ts`, un `<span>` à la main dans les fichiers générés).
- **Les `sticky` passent sous l'entête d'Omega**, collant lui aussi : 64 px
  sur téléphone, 72 dès `sm`. `top-0` → `top-16 sm:top-[72px]`, `top-16`
  (barre de la source) → `top-[72px]`.
- **`@radix-ui/react-tooltip` et `tw-animate-css` ne sont pas installés.**
  Rien installé : l'infobulle est refaite dans `Formules.tsx` (délai,
  bulle, flèche, recalage dans la fenêtre), son entrée est une keyframe de
  btp.css. Les classes `animate-in fade-in-0 zoom-in-95…` sont mortes ici.
- **eslint refuse les apostrophes** du texte JSX généré
  (`react/no-unescaped-entities`) : `&apos;` (l'outil le fait), et
  `@next/next/no-img-element` se désactive en tête des fichiers qui
  affichent de petits SVG décoratifs, avec la raison écrite.
- **Supprimer un fichier de `public/` pendant que `next start` tourne** donne
  un 500 sur ce fichier jusqu'au build suivant : ce n'est pas la page.
- **Une sonde sur `*.vercel.app` peut pendre** (5 min sans réponse à 1700).
  Tuer SA sonde et SON navigateur par leur PID, jamais tous les
  `chrome-headless-shell` : d'autres sessions mesurent en même temps.

## Les logos officiels (fournis par Teo le 24/09)

`public/logos/<code>-mark.png` (le signe, 512 × 512) et
`public/logos/<code>-lockup.png` (signe + mot, 1200 × 326) pour `daliro`,
`tamila`, `lorani`, `tavaro`. Ce sont des **masques alpha** (RVB noir
uniforme) : un `<img>` les rend noirs quoi qu'on fasse. Les rendre comme
`SystemLogo` de `components/logos.tsx` : un `<span>` en `bg-current` avec
`mask-image` **et** `-webkit-mask-image` (voir `SigneDaliro` dans
`components/secteurs/btp/marque.tsx`). Ne pas les copier dans
`public/secteurs-…`.

Partout où la source affiche l'ancien pictogramme ou le SaaS comme
application (maquettes comprises), mettre le signe. Chez Daliro : la
vignette d'application d'une notification, l'avatar « Daliro » d'une carte
vocale, l'avatar « Daliro » du fil d'activité du héros. Le lockup n'avait
pas d'emplacement : seuls l'entête et le pied de la source l'affichaient.

## Règles maison appliquées

- Tous les boutons d'action → `/reserver-un-audit`, en `<Lien>` ou `<Link>`
  (un `<a>` interne recharge tout le site). Chez Daliro : `https://omegaai.fr/reserver`,
  `mailto:` de démo, `/sign-up`, `/pricing`. « Conçu par Omega » → `/`.
- Aucun prix : les formules de Daliro disaient déjà « Prix fixé à l'audit ».
- Aucun faux client ni témoignage : la source l'avait déjà fait (métiers sans
  nom, faits de conception). Les données des maquettes restent des exemples.
- Polices du site uniquement (aucune `next/font`) ; `var(--font-tiempos)` des
  mots-marques → `var(--font-jakarta)`.

## Monde blanc

Daliro était clair : sa seule bande noire était son pied, qui ne vient pas.
Restait une vignette d'application `bg-black` (36 px) dans une maquette :
passée en blanc fileté. Pour une source sombre, relire d'abord
`memory/basculer-un-composant-sombre-en-clair.md` : `overlay` → `multiply`,
ombres ÷ 1,5, un filet là où le contraste découpait, et le **sens** d'un état
s'inverse, pas sa valeur.

⚠ Hors de notre périmètre : le pied de page d'Omega (`components/Footer.tsx`,
partagé par tout le site, CASHD compris) est noir. Il ferme donc cette page
blanche par une bande noire. Le signaler, ne pas le toucher.

## Source sombre (Tamila, 24/09, après-midi)

Tamila décalque vetra-app : fond noir, halos bleus, écran produit et
illustrations sombres. Tout est passé au clair, sans îlot noir. Ce qui a
servi, dans l'ordre :

1. **Jetons clairs par `--jetons`** (la table lue dans la source est celle
   du noir). Les valeurs de Daliro, pour que les secteurs se ressemblent :
   ```json
   {"background":"#ffffff","foreground":"#171717","card":"#ffffff","card-foreground":"#171717",
    "popover":"#ffffff","popover-foreground":"#171717","primary":"#171717","primary-foreground":"#ffffff",
    "secondary":"#f5f5f5","secondary-foreground":"#171717","muted":"#f5f5f5","muted-foreground":"#737373",
    "accent":"#f5f5f5","accent-foreground":"#171717","destructive":"#ef4444","destructive-foreground":"#ffffff",
    "border":"#e6e6e6","input":"#e6e6e6","ring":"#171717"}
   ```
   Conséquence voulue : le bouton `primary` (blanc sur le noir) devient le
   bouton encre sur le blanc.
2. **Les lueurs** (`bg-blue-600 blur-[8rem]`, dégradés sky → blue, halo
   conique) : même place, même flou, même animation, **teinte claire de la
   même famille** (600 → 300, 500 → 300/400, 400 → 200). Saturées sur le
   blanc, elles tachent.
3. **Les maquettes** (écran produit, illustrations SVG) passent en thème
   clair en entier, par une table écrite en tête de chaque fichier
   (`ApercuDossier.tsx`, `Illustrations.tsx`) : « blanc à N % » → « noir à
   N % », `zinc-100/200/300/400/600` → `900/800/700/600/400`, accents
   « 300 » (clairs sur le noir) → « 600 », voiles colorés un peu réduits.
   Le sens d'un état s'inverse (l'élément actif fonçait → il fonce).
4. **Une ombre invisible dans la source se RETIRE**, elle ne se divise pas :
   `shadow-xl shadow-black/10` sur un disque posé sur le noir ne se voyait
   pas ; sur le blanc, même à 7 %, six disques empilés faisaient six
   croissants gris (ondes.tsx). Le ÷ 1,5 vaut pour une ombre qui se voyait.
5. **Contexte d'empilement.** Les lueurs et orbites de la source sont en
   `z-index` négatif ; la source les tenait au-dessus du fond par un
   `<main class="relative z-40">`. Ici la peau porte le fond blanc : sans
   `isolation: isolate` sur `.p-avocats`, TOUTES les lueurs passent sous le
   blanc, sans une erreur.
6. **Deux fois le même SVG = dégradés morts** (memory du même nom) : l'icône
   d'application était posée deux fois (mobile masqué, bureau) avec les
   mêmes `id` ; sur le site déployé elle s'affichait sans fond. `useId()`.
7. **L'italique serif des titres** (Instrument Serif) → la police de titre
   du site en italique (`.avocats-accent`) : oblique calculée, qui est le
   dessin de la General Sans Italic.

Pièges de plus, tous signalés désormais par l'outil :
- une classe dans un gabarit `` `…${x}…` `` n'est pas convertie
  (`animate-ripple`, `bg-foreground/25` des ondes) ;
- `before:animate-rotate` devient `before:avocats-rotate`, classe morte :
  l'animation du pseudo-élément s'écrit dans le CSS ;
- l'outil réécrivait `/logos/…` en `/secteurs-avocats/logos/…` : corrigé,
  `logos/` est exclu.

Et hors outil :
- **Deux sessions dans la même copie.** À 14 h 23, la session des textes de
  Tamila a reporté ses réécritures à la fois dans la source et dans
  `components/secteurs/avocats/textes.ts` et `Matieres.tsx`. Avant de
  conclure à un écart de hauteur, relire les dates (`ls -T`) et diffuser la
  copie figée contre le fichier.
- **Le bloc-notes est partagé entre agents** : un dossier `recette-1440`
  peut contenir les captures d'un autre secteur. Préfixer ses dossiers
  (`tamila-recette-1440`).
- **Le flou en SwiftShader fait des bandes.** Un `blur(6rem)` très étendu
  sur le blanc sort en arcs gris sur les captures de `defile.mjs` (rendu
  logiciel). Pour juger une lueur, capturer avec le GPU : copier
  `chrome.mjs` en remplaçant `--use-angle=swiftshader` par
  `--use-angle=metal --enable-gpu-rasterization --ignore-gpu-blocklist` —
  la même zone sort lisse.
- **Tableau en quatre colonnes égales** : General Sans est plus large que
  Satoshi, « Licenciement » débordait sur la colonne voisine à 390 et 768
  (la source débordait déjà à 768). Colonnes proportionnelles aux textes
  mesurés sous `lg` seulement.

## Écarts assumés (Daliro)

| Écart | Pourquoi |
|---|---|
| Polices : General Sans partout au lieu de Geist + Newsreader (serif des titres) | règle 5 ; le h2 « Ce que ça change, métier par métier. » passe sur 2 lignes à 390 (+28 px) |
| Entête et pied de la source retirés | ceux d'Omega servent |
| Sommaire des questions collant à `top-16 / 72 / 120 px` | sous l'entête d'Omega ; à `md`, les 48 px d'air de la source comptés sous l'entête |
| En-tête collant des formules à `top-[72px]` | idem |
| Infobulles sans portail | peuvent passer sous l'en-tête collant des formules quand le « ? » le touche |
| « Voir la démo » → /reserver-un-audit (était un `mailto:`) | consigne ; la démo se fait pendant l'audit |
| Vignette d'application noire → blanche, logo officiel à 3 endroits | monde blanc ; logos de Teo |

## Recette

```bash
S=~/.claude/skills/methode-site/scripts
for w in 390 768 1024 1440 1700; do
  node $S/paliers.mjs "https://<source>.vercel.app/" $w
  node $S/paliers.mjs "http://localhost:3471/secteurs/<slug>" $w
done
node $S/defile.mjs "http://localhost:3471/secteurs/<slug>" 390 844 recette-390   # et 768 1024 1440 1700
```

Plus une sonde maison (`sonde.mjs`) qui compare la largeur du conteneur, le
cadre intérieur et la **hauteur de chaque section** entre la source et la
page : c'est elle qui trouve un écart, pas les captures.

Concordance Daliro (source → nous), rechargé à chaque largeur :

| Largeur | h1 | h2 | corps | conteneur / cadre | hauteurs de section |
|---|---|---|---|---|---|
| 390 | 36/40 −0.9 = | 36/40 = | 16/24 = | 390 / 380 = | toutes =, sauf métiers 727 → 755 (police) |
| 768 | 48/48 −1.2 = | 36/40 = | 18/28 = | 768 / 754 = | toutes = |
| 1024 | 60/60 −1.5 = | 36/40 = | 18/28 = | 1024 / 1006 = | toutes = |
| 1440 | 60/60 −1.5 = | 36/40 = | 18/28 = | 1280 / 1262 = | toutes = |
| 1700 | 60/60 −1.5 = | 36/40 = | 18/28 = | 1400 (x = 150) = | = 1440 |

Débordement horizontal : 0 aux cinq largeurs (la source déborde de 1 px à
390 et de 5 px à 768). Seule différence de hauteur totale : l'entête et le
pied (ceux de la source contre ceux d'Omega).

Concordance Tamila (source redéployée à 14 h 23 → nous), rechargé à chaque
largeur ; sections : héros · pièces · fonctionnalités · point du matin ·
outils · secret · formules · matières · appel :

| Largeur | h1 | h2 | chapô | conteneur | hauteurs de section |
|---|---|---|---|---|---|
| 390 | 36/45 700 = | 24/33 = | 16/24 = | 390, gouttière 16 = | toutes ±1, sauf point du matin 1132 → 1152 et secret 2281 → 2303 (police : une ligne de plus) |
| 768 | 36/45 = | 36/49,5 = | 16/24 = | 768, gouttière 48 = | toutes ±2 |
| 1024 | 72/90 = | 48/66 = | 18/28 = | 1024 = | toutes ±3, sauf secret 1327 → 1349 (police) |
| 1440 | 72/90 = | 48/66 = | 18/28 = | 1280 (x = 80) = | toutes ±3 |
| 1700 | 72/90 = | 48/66 = | 18/28 = | 1280 (x = 210) = | = 1440 |

Débordement horizontal : 0 aux cinq largeurs (la source : 3 px à 1024).
