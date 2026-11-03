# Formation : trois directions de visuel (à choisir par Teo)

Branche `claude/formation-visuel`, jamais mise en ligne. Les maquettes tournent sur les vraies données de la Formation (pages.ts, videos.ts) et dans le système d'Espace 2 (jetons `--v2-*`, thème sombre et clair). Les captures sont dans ce dossier : `<direction>-<thème>-<largeur>.png`.

## A · « Documentation » (la page actuelle)
`A-documentation-*.png`. La page actuelle, construite le 29/10 sur le Start Guide de Linear : une colonne de texte, une vidéo pleine largeur par geste, le sommaire à droite.
- Pour : la lecture est sobre et continue, et elle est déjà en ligne.
- Contre : avec 12 gestes par module, la page devient très longue et les vidéos se suivent sans vue d'ensemble.

## B · « Académie »
`B-academie-accueil-*.png`, `B-academie-lecon-*.png`.
- L'accueil de la Formation présente les parcours en cartes (Bien démarrer, Vos systèmes, Votre métier), avec le nombre de vidéos et la durée de chacun.
- Chaque module devient une leçon : la liste numérotée des gestes à gauche, la vidéo et son texte à droite, puis « Geste précédent » et « Geste suivant ».
- Pour : on voit d'un coup tout le contenu, et on enchaîne les gestes. La structure est proche de ce qu'on attend d'une académie.
- Contre : on voit un seul geste à la fois. La lecture d'un trait est moins naturelle.

## C · « Pas à pas »
`C-pas-a-pas-*.png`. La page d'un module en lignes : une vignette vidéo avec sa durée à gauche, le titre et le texte du geste à droite. Un clic ouvre la vidéo sur place.
- Pour : la page se parcourt très vite, toutes les vidéos se voient sans être chargées, et elle reste légère.
- Contre : il n'y a pas d'accueil. Il s'ajouterait sans difficulté, en reprenant celui de B.

## Recommandation
**B** pour l'accueil et la navigation entre parcours, **C** pour la page d'un module. Ces deux pièces se combinent : l'accueil de B sert d'entrée, et chaque module se lit pas à pas comme dans C. B tient mieux la promesse d'« un truc complet » quand le catalogue dépassera la centaine de vidéos.
