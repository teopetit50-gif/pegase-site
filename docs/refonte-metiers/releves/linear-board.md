# Relevé — Linear, Board (équipe Omega, « All issues » en vue Board)

URL : https://linear.app/omegaaii/team/OME/all, puis Display options → **Board** (la vue a été remise en **List** après le relevé, état trouvé en arrivant). Relevé le 01/11/2026 au `getComputedStyle` / `getBoundingClientRect`, fenêtre 1440×900, **sombre et clair**. Barre latérale / carte `main` : `linear-home.md` ; menu Display options : `linear-projects.md` (même composant : List | Board | Timeline… ici List | Board) ; icônes : `linear-commun/`.

## Contenu au moment du relevé

64 tickets de l'équipe OME (19 de Teo + ~45 créés par moi, voir `linear-my-issues.md` et `linear-triage.md`) répartis en colonnes : **Triage 16 · Backlog 4 · Todo 20 · In Progress 10 · Done 8+**, puis une colonne repliée « Hidden rows » (Duplicate, Canceled) tout à droite (x 2341, 350px).

## Structure (1440×900, sombre)

```
main @244,8 1188×856
├ en-tête ligne 1 (44) : icône équipe + « Omega › Issues » + étoile · à droite cloche (notifications) + « New issue »
├ en-tête ligne 2 (44) : onglets Active · Backlog · All issues (actif) · icône « vues » · à droite Filter · Display options (pastille bleue = option modifiée) · Open details
└ tableau défilant horizontalement @245,96 (largeur de contenu 2096)
   colonnes de 324px, pas de 348px (écart 24px), première à x 261 :
   Triage @261 · Backlog @609 · Todo @957 · In Progress @1305 · Done @1653 · (Hidden @2341)
   ├ en-tête de colonne 324×50 (flex, gap 12px) : icône de statut 14×14 · nom 13px/500 c lch(90.451 1.2 272) (m-left 2px) · compteur 13px tertiaire · à droite « … » et « + » 28×28
   └ cartes empilées (écart 8px) :
      a 322×(hauteur variable) — bg lch(9.232 0.85 272) · r 8px · ombre `lch(100 0 0 / 0.083) 0 0 0 0.5px, lch(0 0 0 / 0.3) 0 0.5px 1px 1px` · p 8px (contenu 306 de large) · transition color 0.15s
      ├ ligne 1 : « OME-23 » 12px/450 tertiaire · avatar 18×18 à droite
      ├ ligne 2 : icône de statut 14×14 + titre 13px/500 c primaire (retour à la ligne, 2 lignes max)
      ├ puces (flex-wrap, gap 4px, rangées de 24px espacées de 4px) : priorité (24×24, icône 14×14) · échéance (calendrier + « Oct 2027 ») · cycle (« 1 ») · projet (« Open project », icône + nom) · étiquettes (pastille 9×9 + nom)
      │   puce : h 24 · r 48px · p 0 8px · bd 0.5px lch(16.32 1.48 272) (clair lch(86.5 0 282)) · texte 12px/450 tertiaire
      └ pied : « Created Nov 1 » 12px/450 tertiaire (span 80×15, info-bulle « Nov 1, 8:38 PM »)
```

## Styles (sombre ⇄ clair)

| Élément | Sombre | Clair |
|---|---|---|
| Carte | bg lch(9.232 0.85 272) · ombre `lch(100 0 0/.083) 0 0 0 .5px, lch(0 0 0/.3) 0 .5px 1px 1px` | bg lch(100 0 282) · ombre `lch(0 0 0/.088) 0 0 0 .5px, lch(0 0 0/.02) 0 3px 6px −2px, lch(0 0 0/.04) 0 1px 1px 0` |
| Titre de carte | 13px/500 lch(100 0 272) | lch(10 0 282) |
| Identifiant, puces, « Created » | 12px/450 lch(61.803 1.2 272) | lch(40 1 282) |
| Bord des puces | 0.5px lch(16.32 1.48 272) | 0.5px lch(86.5 0 282) |
| Nom de colonne | 13px/500 lch(90.451 1.2 272) | lch(9.794 0 282) |
| Fond de colonne | transparent (fond de carte `main`) | lch(94.44 0.5 282) sur les zones de dépôt (`/ 0.4` pour la colonne repliée) |
| Bouton « Add new issue » en bas de colonne | — | bg lch(100 0 282 / 0.5), bd 0.5px lch(91.9 0 282) |

## États et gestes

- Survol d'une carte : le « + » et « … » de la colonne restent visibles ; la carte garde sa couleur (pas de changement de fond mesuré) ; glisser-déposer entre colonnes change le statut (non testé pour ne rien modifier).
- « + » en tête de colonne : crée un ticket dans ce statut.
- La colonne Triage reprend les icônes orange du statut Triage.

## Paliers

- 390×844 : barre latérale en tiroir ; colonnes de 274px (carte 264px à x 17), défilement horizontal, une colonne et demie visibles ; titres de carte sur 2 lignes tronqués ; onglets Active · Backlog · All issues conservés ; « New issue » devient une cloche + « + ».

## Captures (`captures/linear-board/`)

`1440-sombre.png`, `1440-clair.png`, `390-sombre.png`, `390-clair.png`.
