# Refonte des pages métiers dans le cloud : consigne commune (02/11/2026)

Teo a demandé le 02/11 que toute la refonte des pages métiers tourne dans le cloud (son Mac de 8 Go s'arrête).
Chaque session cloud traite UN métier ; sa fiche est dans ce dossier (`DALIRO.md`, `LORANI.md`, `TAMILA.md`,
`TAVARO.md`, `TIROMA.md`, `VARELO.md`). Lis ce fichier, puis la fiche de ton métier, puis `../REGLES.md`.

## 1. Mise en place (tu démarres sur `main` : n'y travaille JAMAIS, n'y pousse JAMAIS)

```
git fetch origin refonte-metiers/aiguillage claude/refs-linear-49bf64 claude/refs-plain-attio-cal-a3a72b releve-prod
git checkout -b <ta branche> <point de départ donné par ta fiche>
git worktree add --detach /tmp/refs-linear origin/claude/refs-linear-49bf64
git worktree add --detach /tmp/refs-plain origin/claude/refs-plain-attio-cal-a3a72b
git worktree add --detach /tmp/releve-prod origin/releve-prod
npm ci
```

- Relevés (lecture seule) : `/tmp/refs-linear/docs/refonte-metiers/releves/linear-*.md` et
  `/tmp/refs-plain/docs/refonte-metiers/releves/{plain,calcom,attio}-*.md`.
- Captures de référence : `…/releves/captures/<page>/1440-reel-*.png` (taille réelle, sombre et clair) et `390-*.png`.
- Icônes exactes de Linear et sa feuille de styles : `/tmp/refs-linear/docs/refonte-metiers/releves/captures/linear-commun/`.
- Le relevé Attio est refait sur des données remplies (40 contacts, 15 entreprises fictifs) : avant une page Attio,
  `git -C /tmp/refs-plain fetch origin && git -C /tmp/refs-plain checkout --detach origin/claude/refs-plain-attio-cal-a3a72b`.

## 2. Les règles de Teo (`docs/refonte-metiers/REGLES.md`), qui priment sur tout

1. Chaque sous-page est la copie d'UNE page réelle (Linear, Plain, Attio, Cal.com) ; seul le contenu change.
   Aucun dessin inventé, aucune carte de l'ancien écran « habillée » ou montée telle quelle.
2. Les pages de référence ont été remplies avant d'être relevées (c'est fait).
3. Copie 1:1 « point par point, lettre par lettre », jamais à 80 % : arbre, mesures, polices, tailles, couleurs (sombre
   et clair), bordures, rayons, icônes, états, textes d'interface (traduits en français, même structure), comportement.
   Aucun chiffre CSS estimé : tout vient du relevé. On prend le temps qu'il faut.

## 3. Construire chaque sous-page

1. Lis le relevé de la référence en entier et regarde ses captures.
2. Écris la page. Le contenu vient des données du métier (`components/espace/<métier>/*`, portes
   `components/espace/<métier>/portes.ts`). Préfixe CSS propre au métier ; ne modifie pas `components/espace2/lin/`
   (d'autres sessions s'en servent).
3. Rien de l'inventaire `docs/refonte-metiers/<métier>.md` ne disparaît (blocs, fenêtres, gestes, entrées). Un geste sans
   place dans la référence va là où elle range ce genre d'action (menu « … », volet, ⌘K, Settings). Portes
   inchangées, aucune migration. Liens en base valides via `components/espace2/aiguillage.ts` :
   `node outils/verifier-aiguillage.mjs /tmp/releve-prod/omega/prod/migrations` reste vert. Ancien écran sous
   `?ancien=1`. Bascule Exemple / Réel gardée. Un geste irréversible ou qui envoie demande une confirmation.
4. **Preuve 1:1** dans le conteneur : `npx next dev`, Playwright (chromium headless ; `npx playwright install chromium`
   si besoin), données d'exemple avec un contenu de même longueur que la référence, fenêtre 1440×900
   `deviceScaleFactor: 1` et 390, `colorScheme` sombre et clair. Compare à la capture de référence côte à côte ET en
   superposition (différence PIL), images dans `docs/refonte-metiers/comparaisons/<métier>/`. Corrige chaque écart
   ou écris-le avec sa raison (seule raison admise : un geste du métier qui n'existe pas dans la référence).
   Recommence jusqu'à zéro écart non expliqué.
5. Tiens `docs/refonte-metiers/REFERENCES-<MÉTIER>.md` : sous-page → référence → relevé → comparaisons → écarts.
6. `npx tsc --noEmit`, eslint sur tes fichiers, aiguillage, `npm run build` verts. Commits chemin par chemin
   (jamais `git add -A`), en français, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
   `git push -u origin <ta branche>` après CHAQUE sous-page finie. Jamais de push sur `main`, pas de déploiement :
   Teo valide, puis tout est fusionné.

Textes : français, vouvoiement, jamais « moteur » (dire « système »), aucun superlatif, mots du métier.

## 4. Fini quand

Toutes les sous-pages de ta fiche sont identiques à leur référence (superpositions à l'appui), contrôles verts,
branche poussée. Compte rendu de 10 lignes : sous-page → référence → état de la superposition, écarts restants.
