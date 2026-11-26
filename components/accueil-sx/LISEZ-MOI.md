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
| `SxMenuMobile.tsx` | le panneau du bouton « menu », sous 1280 px (absent de la référence). |
| `SxComportements.tsx` | tout ce qui bouge : barre resserrée, apparitions, FAQ, onglets, compteurs, tarifs, graphiques mesurés, menu mobile. |

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
9. **Un menu mobile existe** (`SxMenuMobile.tsx`) : le bouton « menu » de la
   référence est inerte, ce qui laisserait un visiteur au téléphone sans
   navigation. Le bouton est le sien, au pixel ; le panneau est le nôtre.

10. **Les boutons d'appel sont le bouton originui, variante « link »**
    (Teo, 25/11, capture de « Parler à l'équipe › / Commencer » à l'appui :
    « remplace tous les boutons similaires par le code que je t'ai donné »).
    Les seize liens au dessin de bouton (barre, héros, sections, tarifs,
    FAQ, appel final, pied) sont rendus par `convertir.py` en
    `<Button asChild variant="link">` (components/ui/button.tsx) avec un
    `ChevronRight` lucide de 16 px à 60 % ; le menu mobile suit. Avant :
    tous blancs (fond blanc, liseré, rayon 10), et avant encore gris et
    sombres comme la référence. Les boutons des écrans d'exemple gardent
    leur dessin.
11. **Le prix est sous la phrase du héros** (Teo, 25/11 : « dans la phrase,
    juste en dessous, en plus petit, mais qu'il se voie ») : « À partir de
    **34,90 € HT** par personne et par mois. », ligne ajoutée par
    `convertir.py` (clé `__prix_hero__` de `textes.py`), absente de la
    référence. La pastille garde « Nouveau · Des agents sur mesure ».
12. **Au téléphone, quatre défauts de la référence sont corrigés** (Teo,
    25/11 : « la version mobile est moche et buggée ») : montants de la fiche
    qui se recouvraient, en-tête de fiche sous ses icônes, infobulle et
    étiquettes du graphique de trésorerie empilées. Plus deux défauts venus
    de notre texte : « Partager » (le CSS masquait `aria-label=Share`) et la
    rangée « Intégrations / Parler à l'équipe » trop large. Tout est dans
    `sx.css`, « 7. LE TÉLÉPHONE », sous 600 px (900 pour « Partager »).
    Pour revérifier : `node outils/sx/defauts.mjs <url> 390` sur la
    référence puis sur nous.

13. **« Les meilleures IA. Une seule gestion. »** (Teo, 25/11 : Omega est un
    ERP, il ne « se branche » plus ; « mets les gros noms de l'IA, on
    travaille avec eux », confirmé pour Anthropic, OpenAI, Google et
    Mistral). Le bloc des intégrations garde sa géométrie ; ses dix
    vignettes sont des mots-symboles typographiques (`ia-*.svg`, dessinés
    par `outils/sx/dessiner.mjs`), jamais les logos des marques. Le
    premier bouton mène à `/offres` (« Voir les agents »).
14. **La section des documents en sobre** (Teo, 25/11 : « trop enfantin ») :
    une seule encre, plus de rangées « Couleur » ni « Angles », carte du
    téléphone sans bulle, devis droit. `sx.css`, « 8. ». Les pastilles
    portaient d'abord les signes de nos logiciels métier ; depuis le point
    16, elles portent l'initiale de la société, à l'encre de la page.
15. **Les tarifs sont juste au-dessus de « Prêt dès le jour J »** (Teo,
    25/11 : « tu ne les échanges pas, tu les mets au-dessus ») : déplacés
    dans `app/page.tsx`, entre la plateforme et la fiche.
16. **Aucun exemple métier** (Teo, 25/11, après le point 14 : « arrête de
    parler ou montrer comme exemple les trucs BTP etc, les SaaS métier ;
    focus sur l'ERP, les agents qu'on vend »). La fiche client suit le
    projet d'une société quelconque (Maison Laurent SAS, client Roux
    Conseil) ; la section qui présentait les modules métier (Daliro,
    Tamila…) présente les documents à l'en-tête de chaque société du
    groupe, pastilles à initiales ; les « Situations » nomment les modules
    Ventes, Banque et Stock et l'agent des factures fournisseurs ; la barre
    et le pied mènent aux agents et à la gestion, plus à /secteurs.
    Textes : `outils/sx/textes.py` ; menu : `SxMenuMobile.tsx` ; pastilles :
    `sx.css`, « 8. ».
17. **Au téléphone, les écrans d'exemple ont leur version courte** (Teo,
    25/11 : « trop gros, trop zoomés », puis « une version plus petite pour
    mobile mais plus lisible »). Sous 768 px : titre sans outils, deux
    colonnes par tableau, agenda en pastilles, trésorerie sans légende,
    fiche client réduite au résumé, à l'à-venir et au facturé. `sx.css`,
    « 9. ». Une miniature par `zoom` avait été essayée puis retirée :
    lisible à peine.

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
