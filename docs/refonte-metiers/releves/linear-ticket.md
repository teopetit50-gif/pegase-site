# Relevé — Linear, page d'un ticket (OME-19, plein écran)

URL : https://linear.app/omegaaii/issue/OME-19 (redirige vers `/issue/OME-19/facture-fournisseur-recue-sans-chantier-point-p-1-48260-euro-ht`). Relevé le 01/11/2026 au `getComputedStyle` / `getBoundingClientRect`, fenêtre 1440×900, **sombre et clair** (émulation `prefers-color-scheme`). Propriétés remplies relevées en plus sur OME-31 (ticket créé par moi, mêmes composants). La version « ticket ouvert à droite de la liste Triage » est dans `linear-triage.md` ; la barre latérale et la carte `main` dans `linear-home.md` ; sprite d'icônes `linear-commun/sprite-icones.svg`.

## Ce qui a été créé

- Sur OME-19 (ticket de Teo, **propriétés non modifiées**) : 5 sous-tickets (OME-55 à OME-59 environ, statut Triage) — « Identifier le chantier d'origine avec Point P », « Rapprocher la facture du bon de commande BC-2026-114 », « Demander l'avoir pour les 3 sacs de ciment manquants », « Imputer la dépense au lot Gros œuvre », « Valider le paiement à 30 jours fin de mois » ; 3 commentaires de Wizyy (« J'ai appelé Point P… », « Montant vérifié : 1 482,60 € HT, TVA 8,5 %… », « On l'impute au lot Gros œuvre… »).
- OME-31 « Lever les réserves du PV de réception — logement 12 » (à moi) : In Progress, Medium, Wizyy, Cycle 1, étiquettes Client + Réserve, projet Résidence Les Tilleuls.

## Arbre (1440×900, sombre)

```
main @244,8 1188×856
├ en-tête 1187×44 (filet bas 0.5px)
│  ├ fil : a « Initiatives » 68×24 (r 8px, p 0 5px 0 4px) · « › » (13px/500 tertiaire, m −2px 8px 0) · a 459×20 (r 6px, p 2px 4px) → h2 « OME-19 » (span inline-flex, m-right 5.6px) + titre 13px/500
│  │   (le premier maillon reprend la dernière page visitée : « Initiatives », « Omega › Issues »…)
│  ├ étoile + « … » 28×28
│  └ à droite (ticket en Triage) : button « Accept » 80×28 (icône + libellé 12px/500, r 9999px, p 0 10px 0 8px) · « Decline » 82×28 · « Mark as duplicate » 28×28 · « Snooze » 28×28
├ barre d'outils 1187×44 à droite @1261,60 : Copy issue URL · Copy issue ID · Copy branch name (28×28 ronds, bg lch(10.149 0.689 272)) · bouton double « Copy as prompt | Choose coding tool » (r 9999px 0 0 9999px / 0 9999px 9999px 0)
└ corps défilant 1187×811
   ├ colonne principale @292 667.5 de large (contenu @306, 653.5)
   │  ├ titre : textbox "Issue title" 654×64 → p 24px / 600 / 32px, ls −0.16px (2 lignes)
   │  ├ description : textbox "Issue description" 682×74 (p 10px 14px 16px, m 0 −14px) → 15px / 450 / 24px, ls −0.1px
   │  ├ réactions + pièce jointe : 2 boutons 28×28
   │  ├ « Sub-issues » @300,316 659.5×216
   │  │   ├ en-tête 32px : button repli 101×24 (r 9999px, p 0 12px 0 6px) « ▾ Sub-issues » 12px/500 tertiaire + jauge 16×16 + « 0/5 » 12px/450 · à droite filtre 28×28 + « + » 28×28
   │  │   └ 5 lignes a 660×36 (display grid, r 8px) : icône de statut 14×14 · titre 13px/500 primaire (tronqué « … » à 390) · avatar « non assigné » 16×16 à droite (@890)
   │  ├ filet 0.5px
   │  ├ « Activity » h3 15px / 600 / 23px + « Unsubscribe » 98×32 (12px/500, r 9999px, p 0 12px) + « Change subscribers » 32×32 (avatars)
   │  ├ événement : avatar 14×14 · « Wizyy » 12px/500 · « created the issue » 12px/450/16.8px · « · » 600 · « 3d ago » 12px/450 — tout en tertiaire
   │  ├ 3 cartes commentaire 669.5×145.5 (bg lch(9.232 0.85 272), bd 0.5px lch(16.793 1.93 272), r 8px, ombre lch(0 0 0/.3) 0 .5px 1px 1px)
   │  │   ├ tête : avatar 20×20 · « Wizyy » 13px/500 primaire · « 33min ago » 13px/450 lch(63.304 1.425 272) (lien) · à droite « Add reaction » + « Comment options » 28×28 au survol
   │  │   ├ corps p 15px / 450 / 24px, ls −0.1px, c lch(90.826 1.425 272)
   │  │   └ pied (fil de réponses) : « Leave a reply… » 15px/450/24px c lch(39.452 1.425 272) · trombone 24×24 · envoyer 24×24 (r 12px, bg lch(13.861 1.139 272)) ; filet haut entre corps et pied
   │  └ form « Leave a comment… » 669.5×83 (pied r 0 0 8px 8px, p 11px 16px)
   └ colonne propriétés @1008 375.7 de large (sticky)
      ├ « Properties » h3 13px/500 tertiaire (p 0 8px) puis boutons-pilules 28px : statut, priorité, assigné, cycle
      │   pilule : r 9999px · p 0 10px 0 6px · gap 6px · h 28 · 13px/500 · c secondaire ; vide = libellé tertiaire (« Set priority », « Assign », « Add to cycle »)
      ├ « Labels » : puces 23px (p 0 8px, pastille ronde 9×9 de la couleur de l'étiquette + nom 13px/500) puis « + » ; vide = « Add label »
      └ « Project » : pilule avec icône du projet ; vide = « Add to project »
```

## Styles (sombre ⇄ clair)

| Élément | Typo | Sombre | Clair |
|---|---|---|---|
| Titre du ticket | 24px / 600 / 32px · ls −0.16px | lch(100 0 272) | lch(9.794 0 282) |
| Description | 15px / 450 / 24px · ls −0.1px | lch(90.451 1.2 272) | lch(19.588 1.25 282) |
| Titre de sous-ticket | 13px / 500 | lch(100 0 272) | lch(9.794 0 282) |
| « Sub-issues », « 0/5 », libellés vides | 12–13px / 450–500 | lch(61.803 1.2 272) | lch(39.176 1.25 282) |
| Texte de commentaire | 15px / 450 / 24px | lch(90.826 1.425 272) | lch(20 1 282) |
| Auteur | 13px / 500 | lch(100 0 272) | lch(10 0 282) |
| Date du commentaire | 13px / 450 | lch(63.304 1.425 272) | lch(40 1 282) |
| « Leave a reply… » | 15px / 450 | lch(39.452 1.425 272) | lch(66 1 282) |
| Carte commentaire | — | bg lch(9.232 0.85 272) · bd 0.5px lch(16.793 1.93 272) · ombre lch(0 0 0/.3) 0 .5px 1px 1px | bg lch(100 0 282) · bd 0.5px lch(91.9 0 282) · ombre lch(0 0 0/.02) 0 3px 6px −2px, lch(0 0 0/.04) 0 1px 1px 0 |
| Boutons d'outils ronds | — | bg lch(10.149 0.689 272) | bg lch(99.997 0.5 282) |
| Pilules de propriété (valeur) | 13px / 500 | lch(90.451 1.2 272) | lch(19.588 1.25 282) |
| Pastille d'étiquette « Client » | 9×9 r 50% | rgb(76, 183, 130) | idem |
| Fond « kbd » des raccourcis | — | — | color(srgb 0 0 0 / 0.045) |

## États

- Survol d'une ligne de sous-ticket : fond `::before` comme les listes (sombre lch(9.345 0.85 272), clair lch(94.44 0.5 282)).
- Survol d'un commentaire : boutons « Add reaction » et « … » apparaissent en haut à droite de la carte.
- Info-bulles avec raccourci (fond sombre, touches en « kbd ») : « Attach images, files, or videos ⌘ ⇧ U », « Open Initiative details ⌘ I »…
- Sous-ticket en cours de création : une ligne d'édition apparaît sous la liste (« Issue title », « Add description… », pilules OME · Priority · Assignee · Labels, « Cancel » / « Create »).
- Commentaire envoyé par **⌘ Entrée**.

## Paliers

- 1440 : deux colonnes (contenu 667.5 + propriétés 375.7).
- 390×844 : une colonne ; les propriétés passent **sous le titre** en rangée de pilules (Triage · priorité · assigné · Project · étiquette · cycle, icônes seules pour les vides) ; boutons Accept / Decline / Duplicate / Snooze réduits à des icônes 28×28 dans l'en-tête ; fil d'Ariane tronqué « ⌂ › OME-19 F… » ; titres de sous-tickets tronqués.

## Captures (`captures/linear-ticket/`)

`1440-sombre-OME-19.png`, `1440-clair-OME-19.png`, `1440-clair-OME-31-proprietes.png` (volet de propriétés rempli), `390-sombre-OME-19.png`, `390-clair-OME-19.png`.
