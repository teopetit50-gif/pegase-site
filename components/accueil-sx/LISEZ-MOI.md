# L'accueil « sx » — décalque 1:1 d'une référence (25/11/2026)

Demande de Teo : « refaire celle-là en 1:1, sans faute, vérifier avant/après
chaque petit détail ; l'arc de la première section en bleu, c'est le seul
changement ».
Référence : `https://synnax-ai-native-software-landing-template-v1.21st.app/`
(un gabarit de page d'accueil « logiciel IA » publié sur 21st.dev).

## Comment la page est faite

| pièce | rôle |
|---|---|
| `gen/Sx*.tsx` | 15 blocs **générés** depuis le HTML rendu de la référence, classes intactes. Ne pas les éditer à la main : `outils/sx/convertir.py`. |
| `sx.css` | ses règles maison, recopiées et scopées sous `.sx` (`:where(.sx)`, spécificité inchangée), sa couche `ui-sdk` (sous le preflight), et — à la fin — les **écarts et raccords**. |
| `RubanFibre.tsx` | l'arc du héros (shader WebGL porté) ; palette `BLEU`, le seul écart de dessin voulu. Les bandeaux « résumé de l'IA » gardent la palette d'origine. |
| `SxRegles.tsx` | les hachures des marges, mesurées dans le navigateur. |
| `SxBarres.tsx` | la jauge à barres de la fiche (nombre de barres = largeur mesurée). |
| `SxMotSymbole.tsx` | le mot géant du pied, dessiné lettre par lettre (« OMEGA »). |
| `SxComportements.tsx` | tout ce qui bouge : barre resserrée, apparitions, FAQ, onglets, compteurs, tarifs, graphiques mesurés. |

Le contenu vit dans **`outils/sx/textes.py`** (753 textes alignés sur ceux de
la référence). Pour changer une phrase :

```bash
python3 -I outils/sx/textes.py                # réécrit outils/sx/textes-fr.json
python3 -I outils/sx/convertir.py <releve>/index.html components/accueil-sx/gen \
        --vivant <releve>/vivant-1440.json --textes outils/sx/textes-fr.json
```

Le relevé (HTML rendu + instantané du DOM vivant) se refait avec
`outils/relever.sh` et `node outils/sx/instantane.mjs <url> 1440 <sortie.json>`.

## Comment elle a été vérifiée

`node outils/sx/compare.mjs <largeur>` marche la référence et notre page
élément par élément (≈ 3 750 éléments, ~120 propriétés calculées, les
pseudo-éléments, les positions).

- **Port littéral** (texte d'origine) : **0 écart** à 390, 768, 1024, 1440 et
  1700 px. Seul résidu, aléatoire : une animation d'entrée que la référence n'a
  pas toujours fini de jouer au moment de la mesure.
- **Contenu Omega** (`--sans-rect`) : mêmes styles ; hauteur de page
  **identique** à 1440 et 1700 px (15 040 et 15 042 px), à moins de 1 % près
  à 1024, 768 et 390 — le français ne coupe pas ses lignes aux mêmes endroits.

## Écarts assumés (ne pas « corriger »)

1. **L'arc du héros est bleu** — demandé.
2. **Le contenu est celui d'Omega**, pas celui du gabarit, et rien n'y est
   inventé : pas de client, pas de témoignage (la section « Customers »
   montre des *situations*), pas de logo de société (le bandeau défilant
   fait passer nos modules), pas de certification (les quatre insignes sont
   des engagements de `/vos-donnees`), prix de `components/tarifs/TroisPrix.tsx`.
   Les écrans dessinés sont des exemples à données fictives.
3. **Les boutons d'appel sont de vrais liens** (`next/link`) là où la
   référence a des `<button>` sans action — d'où `text-center` ajouté et les
   règles « 4. LA BARRE » de `sx.css`.
4. **Tarifs** : la référence bascule mensuel / annuel ; Omega n'a pas d'annuel.
   La bascule oppose « chaque mois » à « installation » (payée une fois).
5. **Aucun fichier de la référence n'est servi** : avatars à initiales,
   vignettes d'outils du client, chevrons, burger et halo sont redessinés
   par `outils/sx/dessiner.mjs` dans `public/accueil-sx/`.
6. **Pied** : cinq lettres au lieu de six ; l'écart entre lettres est élargi
   pour garder la hauteur du mot. La « marque » qui suit le pointeur (le X
   de la référence) n'a pas d'équivalent dans OMEGA.
7. **Google Sans** (SIL OFL) pour cette page seule : `app/_polices/google-sans-accueil.ts`.
8. L'en-tête du site ne se monte pas sur « / » (`components/Header.tsx`).

## Ce qui n'est pas porté

Les micro-interactions des écrans d'exemple de la référence : survol et
info-bulles des graphiques, animation d'entrée de leurs barres, boutons des
démonstrations (« valider », « voir le détail »), filtre des agents,
sélecteur de métier du bloc « modules métier », effet de brouillage des
liens du pied. La page est fidèle au repos et sur ses interactions
principales ; ces gestes-là restent à faire si Teo y tient.

## Hors de ce dossier

- `app/globals.css` : `@layer sx-ui-sdk;` en première ligne, trois points
  d'arrêt nommés (`ipad`, `desktop-sm`, `laptop`), et `a/button.rounded-full`
  qui épargne `.sx`.
- `app/echelle-mobile.css` : `.text-[17px]` et voisins épargnent `.sx`.
