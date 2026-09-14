# La section « équipe » de l'accueil — 12/09/2026

Demande de Teo : « il faut qu'on crée une partie pour décrire l'équipe
derrière Omega », le composant `team-showcase` de 21st.dev à l'appui, « et
mets un drapeau bien français à côté ». Puis : « dans la page d'accueil ».

## Où c'est

| fichier | rôle |
|---|---|
| `lib/equipe.ts` | **le contenu** — les fiches et les textes de la section |
| `components/ui/team-showcase.tsx` | la mosaïque, ses sept écarts avec l'original |
| `components/ui/team-showcase.css` | la feuille co-localisée (dont la règle tactile) |
| `components/ui/drapeau.tsx` | le drapeau, aux teintes officielles |
| `app/page.tsx` | section « 4 bis », entre « ce que ça change » et le déroulé |
| `outils/recette-equipe.mjs` | la recette : cinq largeurs, survol, tactile |

Rien n'a été ajouté à `globals.css` ni au `package.json` : `react-icons`,
qu'exigeait la fiche 21st.dev, n'est pas installé et ne l'est toujours pas.

## Où c'était, où c'est

Posée le 12/09 après les garanties, la section a ÉCHANGÉ sa place le 13/09
avec « À l'échelle d'un groupe » (demande de Teo). ⚠ Effet de bord à
surveiller : cette dernière suit maintenant « Un investissement maîtrisé »,
qui emploie le même composant `CartesLueur` — deux rangées de cartes à
lueur d'affilée. Si ça se voit, le moins cher est de la descendre d'un cran
encore, après la phrase qui se peint : la citation sépare alors les deux.

## Ce qui reste à faire, et qui ne dépend que de toi

1. **Le portrait de Teo.** Ceux d'Henri et de Vincent sont en place depuis
   le 13/09 (déposés par Teo, liseré saumon rogné, originaux conservés dans
   `captures/originaux-equipe/`). `teo.jpg` est en place depuis le 14/09
   à 12:00 (recadré 845 × 900) : plus aucun monogramme dans la mosaïque.
2. **Confirmer ton rôle.** « Co-fondateur » est posé par cohérence avec
   « CEO & Fondateur » et « CTO & Co-fondateur », pas parce que tu l'as dit.
3. **La quatrième fiche**, quand tu l'auras (« on verra pour le dernier
   après ») : une entrée de plus dans `MEMBRES`, la mosaïque s'arrange
   toute seule — la quatrième vignette revient en tête de la première
   colonne, comme dans l'original.
4. **Les liens**, si tu en veux : chaque fiche accepte un `lien`
   (`{ label, href }`) qui apparaît au survol du nom. Aucun n'est posé —
   une URL ne se devine pas.

Facultatif : chaque fiche accepte aussi une `bio` de deux lignes. La
mosaïque ne l'affiche pas (le composant que tu as choisi ne montre que le
nom et le rôle) ; c'est `components/apropos/Equipe.tsx`, la grille de
fiches écrite le 30/07, qui s'en sert — elle n'a aujourd'hui aucune page
qui l'appelle.

## Deux choses à ne pas défaire

**Le drapeau dit ce qu'il peut dire.** Conception française, assistance en
français, droit français, euros. Il ne dit PAS « hébergé en France » : nos
données vivent à Francfort, en Allemagne. La même réserve tient sur les
quatre pages produit.

**Les noms ne s'inventent pas.** La version du 30/07 de `lib/equipe.ts`
portait déjà cet avertissement : une équipe fictive illustrée de portraits
d'inconnus, ce ne sont pas des avis de démonstration, ce sont des personnes
réelles dont on utiliserait le visage. Les trois fiches viennent de toi.

## La recette

```bash
node outils/recette-equipe.mjs http://localhost:3010/
```

Passée le 12/09 à 390, 768, 1024, 1440 et 1700 : aucune erreur de console,
aucun défilement latéral, la mosaïque tient dans la colonne partout, le
drapeau est bien en `#000091` / `#E1000F`, le survol relie les deux moitiés
dans les deux sens, et la branche tactile rend la couleur pleine.

Trois pièges du harnais y sont désamorcés, et ils valent pour toute recette
de cette page :

- **une capture blanche n'est pas une page cassée.** Le bloc porte
  `data-reveal` ; en headless le rendu est logiciel (58 ms par image) et
  l'apparition n'arrive que 3 s après le saut. La sonde attend l'opacité,
  elle ne la suppose pas ;
- **`Emulation.setEmulatedMedia` ne sait pas émuler `hover`** — ses
  `features` ne couvrent que les préférences. C'est
  `Emulation.setTouchEmulationEnabled` qui fait basculer `(hover: none)` ;
- le défilement latéral se teste en le **tentant**, pas en lisant
  `scrollWidth`.

**En ligne sur omegaai.fr depuis le 14/09/2026.** La section a été reportée
dans `PEGASE/pegase-site` (section « 3 bis » de l'accueil, mêmes fichiers)
et poussée sur `main` — sur ce dépôt-là, pousser suffit à déployer. Les
mêmes fichiers vivent ici, sur le banc, qui reste l'endroit où on essaie.
