# Charte de l'accueil : grammaire, état du site, plan

25/11/2026. Ce document relève la grammaire visuelle de l'accueil (`components/accueil-sx/`), fait l'état des autres pages publiques et propose un plan pour les rapprocher sans recopier l'accueil. Sources : le code de cet arbre de travail et des sondes du site en ligne (styles calculés à 1440 et 390 px, WebGL coupé). Les références sont au format `fichier:ligne`.

---

## 1. La grammaire de l'accueil

### 1.1 Couleurs

| Rôle | Valeur | Où |
|---|---|---|
| Fond de page | `#f5f5f2` (blanc cassé chaud) | `sx.css:1354`, `app/page.tsx:58` |
| Encre | `#121212` ; `#202322` dans les sections ; `#000` pour le h1 et les liens de la barre | `sx.css:1354`, `:497`, `SxHero.tsx:50` |
| Filet | `#dcdcda`, 1 px | `sx.css:497` (`--platform-line`), `SxRegles.tsx:30` |
| Gris des sous-titres | `#84877f` (et `#777c76` pour les mentions) | `sx.css:501-502`, `:989` |
| Pastille | fond `#eeeee7`, liseré `#dddcd4` | `sx.css:499` |
| Scène | fond `#eeeee8`, liseré `#e6e6e0` | `sx.css:986` |
| Trame à points | `#edeee8` + `radial-gradient(#c5c9bd66 .6px, #0000 .6px) 0 0/12px 12px` | `sx.css:521` |
| Bouton primaire | `#292929` + reflet | `SxNav.tsx:49` |
| Focus | `#df512b` | `sx.css:497` |
| Pied | `#0a0a0a` (haut `#2a2a2a`), encre blanche | `SxPied.tsx:12` |

### 1.2 Typographie

Une seule famille : **Google Sans variable**, chargée par `app/_polices/google-sans-accueil.ts` et posée sur la racine `.sx` (`app/page.tsx:57`). Les cinq familles de la référence pointent toutes vers elle (`sx.css:1408-1418`, `:1450`).

| Élément | < 768 | 768–1279 | ≥ 1280 | Où |
|---|---|---|---|---|
| h1 du héros | 42 / 1,1, −0,42 px, 400 | 62 / 1,1, −0,62 px | 62, sur 550 px de large | `SxHero.tsx:50` |
| h2 de section | 30 (≤ 760) | `clamp(28px,3.2vw,40px)` : 28 à 768, 32,8 à 1024 | 40 | `sx.css:500`, `:587` |
| … son dessin | interligne 1,16, −0,045em, graisse **450** | | | `sx.css:500` |
| Chapô de section | 16 / 1,5, −0,01em, `#84877f`, 520 px max | | | `sx.css:502` |
| h3 de carte | 22, 450, −0,03em | | | `sx.css:988` |
| Texte de carte | 15 / 1,45, `#84877f` | | | `sx.css:989` |
| Pastille | 12 / 1,2 | | | `sx.css:499` |

### 1.3 Grille et cadre

- **Points d'arrêt nommés**, déclarés au thème et donc disponibles partout : `ipad` 768, `desktop-sm` 1280, `laptop` 1440 (`app/globals.css:15-19`).
- **Cadre** : chaque section est `relative mx-auto w-full max-w-[1920px] px-[32px] ipad:px-[52px] desktop-sm:px-[72px]` (`SxSecurite.tsx:10`). La barre utilise 32 / 48 / 74,5 (`SxNav.tsx:12`).
- **Marges hachurées** (`SxRegles.tsx:70-102`) : deux colonnes de 32 / 52 / 72 px, bordées d'un filet `#dcdcda` côté contenu et striées de traits horizontaux de 1 px, tous les 7 px environ. Le pas est recalculé pour tomber juste sur chaque repère.
- **`data-gutter-guide="top|bottom"`** : posé sur chaque filet horizontal qui doit se prolonger dans la marge (`SxNav.tsx:12`, `SxSecurite.tsx:12`, `:21`, `SxHero.tsx:21`).
- **Retrait du contenu à partir de 1280** : `max(0px, min(100vw,1920px) × .06333 − 72px)` (`sx.css:591`). Mesuré : le h2 commence à x = 91 à 1440 et à x = 52 à 390.
- **Bande à cellules** : un quadrillage de 4, 6 ou 12 colonnes, sur des rangées de 46 ou 56 px (`SxHero.tsx:22`, `SxBande.tsx:10`).

### 1.4 L'en-tête de section type

```tsx
<header className="platform-intro platform-intro-split sec-intro" data-gutter-guide="bottom">
  <div>
    <span className="platform-eyebrow">Vos données</span>
    <h2>Elles restent les vôtres.<br /><span>Validation et traçabilité comprises.</span></h2>
  </div>
  <p className="platform-lede">Un espace dédié… laisse une trace.</p>
</header>
```

| Règle | Valeur | Où |
|---|---|---|
| `.platform-intro` | filet bas ; marges `0 clamp(24px,4vw,64px) 36px` ; `0 20px 18px` sous 760 | `sx.css:498`, `:587` |
| `.sec-intro` et ses voisines | 72 px au-dessus (48 sous 760) | `sx.css:818`, `:1058`, `:1092` |
| `.platform-eyebrow` | `inline-flex`, `5px 10px`, rayon 5, 24 px dessous | `sx.css:499` |
| h2 en deux tons | phrase 1 à l'encre, `<br/>`, phrase 2 dans un `<span>` `#84877f` | `sx.css:500-501` |
| `.platform-intro-split` | `minmax(0,1fr) minmax(280px,360px)`, `align-items:end`, écart `20px 40px` ; une seule colonne sous 1400 | `sx.css:503-505` |
| Variantes | `.ft-intro` (`:967`), `.pr-intro` (`:1266`), `.faq-intro` collante (`:1313-1314`), `.cta-band` centrée (`:1337-1341`) | |

L'en-tête est **aligné à gauche**, avec le chapô à droite, calé en bas. Seul le bandeau d'appel final est centré.

### 1.5 Scènes et cartes

- **Grilles de cartes jointives**, sans espace entre elles et séparées par des filets (`border-left`, `border-bottom`) : 2 colonnes en `.ft-grid`, 3 en `.sec-grid`, 4 en `.pr-grid`, 5 en `.ts-grid` (`sx.css:983-985`, `:1060-1061`, `:1286-1288`). Chaque carte a un retrait de `12px 12px 24–28px`.
- **Scène** `.ft-stage` (`sx.css:986`) : `#eeeee8`, liseré `#e6e6e0`, rayon 12, 340 px de haut au minimum, marges `40px 32px`. Sous 760 : 300 px et `32px 16px` (`:1057`).
- **Sous la scène** (`sx.css:987-992`) : un h3 de 22, un texte gris de 15, un lien `.ft-link` de 14 souligné avec une flèche.
- **Écran d'exemple** `.platform-app` (`sx.css:522`) : blanc, rayon 10, liseré `#d9ddd3`, ombre `0 3px 5px #2c342006, 0 20px 44px -26px #28362040`.
- **Puces** `.sec-chips li` (`sx.css:1088`) : blanches, rayon 8, 12,5 px, anneau `0 0 0 1px #0000000d`.

### 1.6 Boutons

| | Primaire (sombre) | Secondaire (blanc depuis le 25/11) |
|---|---|---|
| Taille | 46 px de haut, rayon 12, marges 24 | 46 px, rayon 10, 20–24 à gauche, 12–14 à droite, chevron de 22 px |
| Texte | 16, gras, −0,03em, blanc, ombre `0 1px 1px #00000026` | 16 (14 dans la barre), gras, `#121212` |
| Fond et bord | `linear-gradient(180deg,#fff3 4%,#fff0 44%), #292929` ; bord haut `#ffffff26` | blanc (`convertir.py:92-93`) ; bord 1 px `rgba(0,0,0,.1)` |
| Ombre | `inset 0 1px 1px #ffffff4d`, puis 4 couches de 3 à 40 px | aucune |
| Où | `SxNav.tsx:49` | `SxNav.tsx:43` |

Comportement commun : opacité 0,9 au survol, `scale(.97)` au clic, 200 ms `ease-out`, contour de focus 2 px `#121212`. Dans la barre resserrée, les boutons passent à 36 px, rayon 8 ou 10 (`sx.css:1374-1377`, `:1533-1536`). Le troisième niveau est le lien souligné `.ft-link`.

### 1.7 Pastilles et badges

La pastille neutre `.platform-eyebrow` porte tout. Il existe aussi un badge sombre `.pr-tag` (`#202322`, rayon 999, 11,5 px, `sx.css:1292`) et un badge vert `#16a34a` (`:1273`). L'icône de FAQ est un carré de 32 px, rayon 9, en `#eeeee8`, qui passe en `#292929` une fois ouvert (`:1323-1327`). La pastille « Nouveau » en dégradé (`.ft-eyebrow`, `:970-972`) ne sert qu'au héros.

### 1.8 Rythme vertical

Les sections sont jointives (`py-0`) : **c'est le filet qui les sépare, pas une bande de vide**. L'espace vient de l'intérieur :

- 72 px au-dessus de la pastille (85 pour la première section, `SxPlateforme.tsx:11`) ;
- 24 px de la pastille au h2, 36 px sous l'en-tête, puis un filet et la grille ;
- 96 et 104 px autour du bandeau d'appel (64 et 72 sous 760, `sx.css:1337`, `:1343`).

### 1.9 Mouvement

- La barre se resserre de 64 à 52 px dès 32 px de défilement (`SxComportements.tsx:23-27`, `sx.css:1366-1377`), selon `cubic-bezier(.22,1,.36,1)` en 0,45 s.
- La FAQ n'ouvre qu'une réponse à la fois, en animant `grid-template-rows` avec la même courbe (`sx.css:1328`).
- Il y a des compteurs, une bande qui défile en 30 s et les lettres du pied, qui montent de 112 px.
- **Aucune apparition au défilement des sections** : les keyframes `hero-reveal` et `section-rise` existent (`sx.css:1344-1345`), mais aucun balisage ne les emploie.

### 1.10 Le caractère, et la décoration

**Le caractère** tient en six choses :

- le fond `#f5f5f2` et les filets `#dcdcda` ;
- le cadre à marges hachurées ;
- l'en-tête de section en deux tons, avec le chapô à droite ;
- les grilles de cartes à filets, avec une scène arrondie ;
- la paire de boutons sombre et blanc ;
- le calme du mouvement.

**La décoration**, propre à une section :

- l'arc WebGL (`RubanFibre.tsx`) et le mot géant du pied (`SxMotSymbole.tsx`) ;
- le halo et les rayures de `SxAppel` et `SxIntegrations` ;
- les écrans d'exemple (`platform-*`, `sb-*`, `wl-*`, `SxBarres`), l'orbite d'icônes et la bande floutée ;
- la barre de défilement sombre (`sx.css:1355-1358`).

---

## 2. L'état des autres pages

### 2.1 L'en-tête et le pied communs

Toutes les pages sauf « / » passent par `app/layout.tsx:71` (`Header`) et `components/PageShell.tsx` (fond noir `bg-panel`, `Arrivee`, `Footer`).

| | Accueil (`SxNav`, `SxPied`) | Reste du site (`Header.tsx`, `Footer.tsx`) |
|---|---|---|
| Barre | 64 px, puis 52 ; 1920 px max ; marges 32 / 48 / 74,5 | 64 px sur téléphone, 72 à partir de 640 ; 1440 px max ; marges 12 / 40 (`Header.tsx:362`) |
| Fond | `#f5f5f2`, avec un filet bas | couleur prélevée sous la barre, sans filet |
| Marque | logo 17 + « Omega » 20 / 600 | logo 26 + « Omega.AI » 19 / 600 |
| Navigation | 4 liens de 17 px à partir de 1280 | 5 rubriques avec panneaux à partir de `lg` (`lib/menu.ts:147`) |
| Boutons | « Parler à l'équipe » (blanc) + « Commencer » (sombre), 46 px | un seul « Commencer », en contour, 36 px, rayon 6 (`Header.tsx:428`) |
| Pied | sombre, 4 colonnes de liens, mot géant, 585 px | blanc, une ligne de 13 px (`Footer.tsx:39`) |

En quittant « / », on change de barre, de police, de fond et de pied à la fois. **C'est l'écart le plus visible du site.**

### 2.2 Page par page (mesures à 1440)

Toutes les pages sont en **General Sans**, sauf /gestion, et passent par `Header` et `Footer`, sauf mention contraire.

| Page | Fichiers | Fond | h1 · h2 | Boutons | Écart principal |
|---|---|---|---|---|---|
| /offres, /offres/sur-mesure | `nos-offres.css` (`.ofd`), `sur-mesure.css` (`.smd`) | `#fff`, `#f2f2f2` | 64/400 blanc sur photo · 40–48/400, centrés | 37–40 px, rayon 6–8 | héros photo de rayon 24 ; titres centrés ; étiquettes en capitales `#525252` ; 80 px de vide ; aucun filet ; WebGL |
| /secteurs (carrefour) | `app/secteurs/page.tsx`, `secteurs.css` (`.sct`) | `#fff`, `#f2f2f2` | 64/400 · 48/400, centrés | `sct-cta` 40 px, rayon 6 | cartes grises pleines, étiquettes à chasse fixe |
| /vos-donnees | `components/donnees`, `globals.css:5654-6422` | `#fff` | 64/400 · 47,7/400 | `vd-cta` 44 px, rayon 8 | sans `PageShell`, avec son propre pied (`page.tsx:606`) ; héros plein écran |
| /integrations | `components/integrations`, monde `.offres` | `#f5f5f5`, `#fff` | 48/500 · 48/500, centrés | `o-btn` 39 px, rayon 6, `#27272a` | encre zinc ; étiquettes en capitales ; 100–120 px de vide |
| /tarifs | `components/tarifs`, `globals.css:4064-4680` | `#f5f5f5` | 48/500 en deux tons · 32–56/500, centrés | 48 px, rayon 6, `#050505` | **la plus proche** : deux tons et pastille « Tarifs › », mais centrée, avec des cartes blanches espacées |
| /contact, /reserver, /installation, /mentions-legales | monde `.resa` (`r-*`), `PageLegale.tsx` | `#f5f5f5`, `#fff` | 56/500 · 24–40/500, à gauche | `r-btn` 46–48 px, rayon 8 | étiquettes `ap-kicker` en capitales, graisse 500 |
| /reserver-un-audit | `reserver.css` (`.rdv`), `FormulaireFormat.tsx` | `#fff` + bande noire | 40/400, à gauche | 32 px, rayon 6, noir | destination de 9 boutons de l'accueil, mais avec un bouton de 32 px contre 46 |
| /gestion | `components/gestion/Trame.tsx` | `#fff` | **Geist** 36/500 · 24/500 | 36 px, rayon 10, brun `#403630` | la plus proche dans l'esprit (colonne bordée, filets, hachures), mais en `stone-200`, sur 1248 px |
| 4 pages produit (relances, nouvelles-affaires, demandes-clients, factures-fournisseurs) | `components/produits/*` et une feuille par page | `#fff` ou `#f5f5f5` | 60–66/400–600 · 36–48/400–700 | 36–46 px, rayon 6–8, noirs ; « COMMENCER » en capitales | quatre décalques de gabarits SaaS ; 96–128 px de vide ; étiquettes à chasse fixe ; WebGL sur factures |
| /blog, /blog/[slug] | `components/blog`, `globals.css:3233` | `#fff` | 48/700 · 34–38/700 | 44 px, rayon 10 | graisse 700 : la plus éloignée en typographie |
| /modeles, /tarifs/site | `.modeles`, `.offres` + `.tf` | `#fff`, `#121215` | 60–64 · 48, centrés | 52 px, rayon 12 | offre « site web », à part du discours ERP |

**Hors effort** :

- /audit/[slug] : page privée ;
- /commencer et /formation : redirigées (`next.config.ts:173`) ;
- /essai-blocs et /omega : pages internes ;
- /offres/[system] : plus aucune adresse active n'y mène (`next.config.ts:214-215`).

### 2.3 Les pièces partagées, là où l'effort rapporte

Le site n'a pas de composants de vitrine communs. Il a des **mondes CSS**, chacun décalqué d'une référence différente. Voici ce que plusieurs pages partagent :

| Pièce | Pages concernées |
|---|---|
| `Header.tsx` + `MenuPrincipal.tsx` | toutes sauf « / », y compris les `/secteurs/*` sur omegaai.fr |
| `Footer.tsx` (par `PageShell`) | toutes sauf « / » et /vos-donnees |
| Monde `.resa` (`globals.css:2739` et suivantes) | /tarifs, /contact, /reserver, /installation, /mentions-legales |
| Monde `.offres` + `.o-btn` (`globals.css:773` et suivantes) | /integrations, /blog, /tarifs/site |
| Famille des grands titres fins (64/400 et 48/400 centrés, étiquettes en capitales) | /offres, /offres/sur-mesure, /secteurs, /vos-donnees, /modeles : cinq feuilles pour un même dessin |
| FAQ | 14 composants différents (`tarifs/FaqTarifs`, `reservation/FaqAudit`, `gestion/Questions`, `produits/*/Questions`…) |
| Appel final | 12 composants (`tarifs/AppelFinal`, `gestion/Appel`, `produits/*/Cloture`…) |
| `PageMotion` (apparitions GSAP) | 18 pages |

### 2.4 Les pages `/secteurs/*` et les sites dédiés

Les huit pages métier sont les accueils des sites dédiés, chacun sur son propre domaine (`next.config.ts:90-129`). Chacune a son dessin, et parfois sa propre police (Bitter pour Tiroma). **On n'y touche pas.**

Ce qu'elles partagent avec la vitrine :

- `app/layout.tsx`, qui choisit entre `Header` et `EnTete` selon `MARQUE_SITE` ;
- `PageShell`, qui choisit entre `Footer` et `Pied` ;
- `Arrivee`, `LenisRoot`, `globals.css`, `echelle-mobile.css` et General Sans ;
- `app/secteurs/layout.tsx`, qui charge `arrondis.css` (tout ramené à 6 px, sous `.sct`, `.p-btp`…) ;
- `SeCombine.tsx`.

Proposition :

- **Sur omegaai.fr**, ces pages reçoivent la nouvelle barre et le nouveau pied, et le visiteur reste chez Omega.
- **Sur leurs domaines**, `EnTete` et `Pied` restent tels quels.
- Le kit n'est jamais importé par `globals.css` ni par une page métier.
- Le carrefour `/secteurs`, propre à Omega, peut prendre le kit s'il quitte la classe `.sct` visée par `arrondis.css:38-56`.

---

## 3. Ce qu'il faut reprendre, et ce qu'il ne faut pas reprendre

**À reprendre partout** : ces dix traits suffisent à faire un seul site.

1. **Les couleurs** : fond `#f5f5f2`, encre `#121212` / `#202322`, filets `#dcdcda`, à la place de `#fff`, `#f5f5f5`, `#f2f2f2` et du zinc.
2. **La typographie** : Google Sans et des h2 en 450 à −0,045em, de 30 à 40 px. La graisse 700 et les capitales espacées disparaissent.
3. **L'en-tête de section** : pastille, h2 en deux tons, chapô gris à droite, aligné à gauche, 72 px au-dessus, un filet dessous.
4. **Le cadre** : 1920 px au plus, marges de 32 / 52 / 72 px avec leurs filets verticaux et leur hachure.
5. **Des sections jointives** séparées par des filets qui se prolongent dans la marge, au lieu de 96 à 128 px de vide.
6. **Les cartes à filets** : une scène `#eeeee8` de rayon 12, un h3 de 22 en 450, un texte gris de 15, un lien souligné.
7. **La paire de boutons** : le primaire sombre de 46 px, rayon 12, et le secondaire blanc, rayon 10, avec un chevron.
8. **Les deux blocs de fin de page** : la FAQ en deux colonnes, avec l'intro collante, et le bandeau d'appel centré.
9. **La barre** : 64 px, le filet bas, les deux mêmes boutons, le resserrement.
10. **Le calme** : pas d'apparition au défilement, et un survol qui ne joue que sur l'opacité.

**À garder pour l'accueil seul** :

- l'arc WebGL et le mot géant OMEGA ;
- le halo et les rayures du bandeau d'appel ;
- les écrans d'exemple, l'orbite d'icônes et la bande floutée des modules ;
- la pastille « Nouveau » en dégradé ;
- les boutons verts `#45563c` des écrans ;
- la barre de défilement sombre.

Une autre page peut mettre **son propre** écran ou sa photo dans une scène, mais ne recopie pas ceux de l'accueil.

---

## 4. Le plan

### 4.1 Le kit partagé : `components/charte/`

L'accueil et `sx.css` ne bougent pas : ils restent générés par `convertir.py` et vérifiés par `compare.mjs`.

Le kit **recopie** les valeurs relevées plus haut au lieu d'importer `sx.css`, qui fait 200 Ko. Il est scopé sous une classe racine `.charte` : rien sur `:root`, rien dans `globals.css`. Ni l'espace client ni les sites dédiés ne le voient.

**`components/charte/charte.css`**, importé par `Cadre.tsx` :

```css
.charte {
  --ch-fond: #f5f5f2;  --ch-encre: #121212;  --ch-encre-section: #202322;
  --ch-filet: #dcdcda; --ch-gris: #84877f;   --ch-gris-fort: #777c76;
  --ch-pastille: #eeeee7; --ch-pastille-bord: #dddcd4;
  --ch-scene: #eeeee8;    --ch-scene-bord: #e6e6e0;
  --ch-trame: radial-gradient(#c5c9bd66 .6px, #0000 .6px) 0 0 / 12px 12px;
  --ch-sombre: #292929;
  --ch-gouttiere: 32px;   /* 52px ≥ 768, 72px ≥ 1280 */
  --ch-retrait: 0px;      /* ≥ 1280 : max(0px, calc(min(100vw,1920px) * .06333 - 72px)) */
  --ch-ease: cubic-bezier(.22,1,.36,1);
  /* les alias de app/polices.css:42-50 sont résolus sur :root : les redéclarer ici */
  --font-omega: var(--font-google-sans); --font-inter: var(--font-omega); /* … les 9 alias */
  font-family: var(--font-google-sans), Arial, sans-serif;
  background: var(--ch-fond); color: var(--ch-encre);
}
```

Ses classes (`.ch-intro`, `.ch-pastille`, `.ch-grille`, `.ch-scene`, `.ch-btn`, `.ch-faq`, `.ch-appel`…) reprennent `sx.css:497-505`, `:983-992`, `:1312-1343` et les boutons de `SxNav.tsx`, y compris les valeurs sous 760 px.

**Les composants** :

| Composant | API proposée | Source |
|---|---|---|
| `Cadre` | `<Cadre gouttieres={true}>` : pose `.charte`, la police et les marges hachurées | `app/page.tsx:57` |
| `Gouttieres` | `<Gouttieres couleur?="#dcdcda" />` : `SxRegles` rendu générique | `SxRegles.tsx` |
| `Section` | `<Section id? filet?: "bas" \| "aucun">` : le conteneur de 1920 px, marges 32 / 52 / 72 | `SxSecurite.tsx:10` |
| `EnTeteSection` | `{ pastille, titre, suite?, chapo?, disposition?: "cote" \| "pile" \| "centre", niveau?: 1 \| 2, actions? }` | `sx.css:497-505` |
| `Bouton` | `{ href, variante: "primaire" \| "secondaire" \| "lien", icone?: "chevron" \| "calendrier" \| "fleche", taille?: "normal" \| "compact" }`, rendu en `next/link` | `SxNav.tsx:43-49` |
| `Pastille` | `{ ton?: "neutre" \| "sombre" \| "vert" }` | `sx.css:499`, `:1292` |
| `GrilleCartes`, `Carte`, `Scene` | `<GrilleCartes colonnes={2\|3\|4}><Carte titre texte lien?><Scene trame?>…</Scene></Carte></GrilleCartes>` | `sx.css:983-992` |
| `Faq` | `{ pastille, titre, suite?, questions: {q, r}[] }`, composant client | `sx.css:1312-1336` |
| `Appel` | `{ pastille, titre, suite, chapo, actions }`, sans halo | `sx.css:1337-1343` |

**Vérification** : une sonde (`outils/charte-sonde.mjs`) compare les styles calculés de `.ch-*` à ceux de `.platform-*` sur l'accueil, à 390, 768 et 1440 px.

### 4.2 Les changements page par page

Les pages sont classées par visibilité (liens depuis l'accueil, présence dans la barre), puis par effort : S pour une demi-journée, M pour une journée, L pour plusieurs.

| # | Page | Ce qui change | Fichiers | Effort |
|---|---|---|---|---|
| 1 | **Barre** (toutes les pages) | 64 px, puis 52 ; 1920 px max ; filet bas ; marque 17 + « Omega » ; liens de 17 px ; paire de boutons du kit ; menus déroulants gardés | `Header.tsx`, `MenuPrincipal.tsx`, `menu-principal.css` | M |
| 2 | **Pied** (toutes les pages) | les 4 colonnes de liens de `SxPied`, sans le mot géant | `Footer.tsx` | S–M |
| 3 | /reserver-un-audit (9 liens) | `Cadre` ; h1 en 42 / 62 ; `Bouton` de 46 px ; `Appel` à la place de la bande noire | `reserver-un-audit/page.tsx`, `reserver.css`, `FormulaireFormat.tsx` | M |
| 4 | /contact (6 liens) | `Cadre`, `EnTeteSection`, `Bouton` | `app/contact/page.tsx` | S |
| 5 | /tarifs | `EnTeteSection` en disposition « côte », qui garde ses deux tons ; grille de prix à filets ; `Faq` ; `Appel` | `app/tarifs/page.tsx`, `components/tarifs/*` | M |
| 6 | /offres, /offres/sur-mesure | photo gardée dans le cadre, rayon 12 ; `EnTeteSection` ; sections jointives ; `Bouton` ; `Faq` ; `Appel` ; plus de `data-reveal` | `app/offres/*`, `components/offres/*`, `components/surmesure/*` | L |
| 7 | /secteurs (carrefour) | `Cadre` ; `GrilleCartes` à 3 colonnes ; abandon de `.sct` | `app/secteurs/page.tsx`, `secteurs.css` | M |
| 8 | /integrations | monde `o-*` remplacé par le kit | `app/integrations/page.tsx`, `components/integrations/*` | M |
| 9 | Les 4 pages produit | passe légère : fond, en-têtes, boutons, `Faq`, `Appel` ; les scènes restent | `app/offres/<produit>/*`, `components/produits/*` | M chacune |
| 10 | /vos-donnees | en-têtes et boutons du kit ; le pied commun à la place de `vd-pied` | `app/vos-donnees/page.tsx`, `components/donnees/*` | M |
| 11 | /gestion | Google Sans à la place de Geist ; `#dcdcda` à la place de `stone-200` ; `Gouttieres` ; `Bouton` | `app/gestion/page.tsx`, `components/gestion/*` | M |
| 12 | /blog, articles | `Cadre`, titres en 450, `Bouton` | `app/blog/*`, `components/blog/*` | S–M |
| 13 | /mentions-legales, /reserver, /installation | `Cadre` et typographie | `PageLegale.tsx`, pages concernées | S |
| 14 | /modeles, /tarifs/site | passe légère, ou rien si l'offre « site web » sort du catalogue | `app/modeles`, `app/tarifs/site` | S |

Les chantiers 1 et 2 passent avant les pages : deux fichiers suffisent à changer l'impression de tout le site.

---

## 5. Risques

1. **La police.**
   - Les alias de `app/polices.css:42-50` sont résolus sur `:root` : il faut les redéclarer dans `.charte`.
   - Chaque page change de chasse, donc ses lignes se coupent ailleurs. Les décalques réglés au pixel sont à recontrôler aux trois largeurs.
   - Si la vitrine garde General Sans, l'interlettrage de −0,045em est à revoir : il a été réglé pour Google Sans.
2. **Les règles globales.**
   - `echelle-mobile.css` règle le mobile par monde (§ 1 à 5). Une page qui quitte ces classes perd ce réglage : le kit doit porter ses propres valeurs sous 760 px.
   - § 6 de ce même fichier et `globals.css:217-224` (`a.rounded-full`) n'épargnent que `.sx` : il faut leur ajouter `.charte`.
   - `globals.css:8431` ramène à 6 px tout `rounded-full` qui porte un `px-*` : le kit écrit ses rayons dans ses propres classes.
   - `body` et `PageShell` sont noirs : toute zone non peinte apparaît noire sous un fond `#f5f5f2`.
3. **Les sites dédiés.**
   - `outils/vercel-ignore.sh:50` ne classe en « vitrine » que `components/(offres|accueil|modeles|formation|blog|tarifs)/` et quelques dossiers `app/`.
   - `components/accueil-sx/`, `app/page.tsx`, `app/gestion/`, `components/produits/` et le futur `components/charte/` comptent donc comme partagés : chaque envoi qui les touche reconstruit les six sites. Le plafond de 100 déploiements par jour a été atteint le 11/11.
   - Il faut ajouter `charte` et `accueil-sx` à cette expression.
4. **L'en-tête.**
   - `Header.tsx` prélève la couleur sous la barre et calcule ses seuils sur 64 / 72 px (`:276`). Passer à 64 puis 52 décale aussi les `scroll-mt-24` des pages.
   - `MenuPrincipal` bascule à 1024 px, la barre de l'accueil à 1280 : il faut en choisir un.
5. **Le WebGL.**
   - Pages concernées : l'accueil, /offres (`cobe`), /sur-mesure (`halftone-flow`), /factures-fournisseurs et /secteurs/groupes.
   - Sur le Mac de 8 Go, la recette se fait avec `--disable-webgl`, un navigateur à la fois.
   - Le kit n'ajoute aucun WebGL.
6. **La dérive.**
   - Le kit recopie des valeurs : la sonde du § 4.1 doit signaler une régénération de l'accueil qui les changerait.
   - Détail sans effet : `sx.css` répète les règles du pied `sgf`, aux lignes 1385 et 1423.

---

## 6. Décisions à soumettre à Teo

1. **La police.** Google Sans sur toute la vitrine Omega, sans toucher à l'espace client ni aux sites dédiés ? *Recommandation : oui, posée par `Cadre`, page par page. Sans elle, le site ne paraîtra jamais d'une seule main.*
2. **La barre.** L'en-tête du site prend les mesures, le filet et les deux boutons de la barre de l'accueil, et garde ses menus déroulants ? *Recommandation : oui. Mettre `SxNav` partout ferait perdre les sous-menus et l'entrée « Ressources ».*
3. **Le pied.** Le pied sombre de l'accueil, à quatre colonnes de liens et sans le mot géant, sur toutes les pages ? *Recommandation : oui.*
4. **Les arrondis.** L'accueil a des rayons de 5, 8, 10 et 12 px, alors que la règle du 25/09 ramenait les boutons et les pastilles à 6 px (`globals.css:8431`, `arrondis.css`). *Recommandation : suivre l'accueil sur la vitrine et garder les 6 px sur les sites dédiés.*
5. **Le mouvement.** Retirer les apparitions GSAP des pages refaites ? *Recommandation : oui, en gardant le resserrement de la barre et la FAQ.*
