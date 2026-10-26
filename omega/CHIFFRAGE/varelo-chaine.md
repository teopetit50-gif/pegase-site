# Varelo — la page omegaai.fr/secteurs/groupes, phrase par phrase (B1, 18/10/2026, 17 h 40 Z)

Page lue en lecture seule (HTML servi le 18/10 à 17 h 20 Z, textes de `components/secteurs/groupes/textes.ts`
sur main). Objectif fixé par Teo (17 h 00 Z) : prouver sur la recette toute la chaîne promise. Le niveau 2 est
la page du matin de la présidence à 7 h sur les 3 groupes publics.

**N1** prouvé sur la recette avec des données publiques réelles (3 groupes, 19 balances, preuve du 18/10) ·
**B** prouvé sur la recette par les tests (`^test_b1_`), sur des données d'essai ou le banc fictif Sogexal ·
**M** manque (ce qui reste à faire est dit) · **—** constat ou argument, rien à prouver.

| # | Phrase de la page | État | Preuve, ou ce qui manque |
|---|---|---|---|
| 1 | « Une seule IA pour tout le groupe. » | M | `varelo-assistant` est déployée sur la recette (b1_19), mais aucun appel de bout en bout n'a été fait. Plus de crédit API depuis 17 h Z. |
| 2 | « Varelo branche la même IA sur les logiciels et les tableurs de chaque société, en lecture seule. » | B / M | Lecture des exports : 36 modèles, relevés, tests b1_13 et b1_20. Aucun export d'un vrai logiciel n'a encore été lu. L'IA : voir ligne 1. |
| 3 | « Chaque matin, elle dit à chaque direction ce qu'elle doit décider. » | B / M | Sections déposées par direction, tests b1_10, b1_18 et b1_23. Remise à 7 h jamais observée (lignes 11 et 12). |
| 4 | Visuel « Le point du matin d'une direction financière, sur des données d'exemple. » | B | Écran `/espace2/varelo`, recette aux cinq largeurs (193 ✓). |
| 5 | « 78 % des salariés… 9 % seulement… » | M | 78 % vient de Microsoft et LinkedIn (Work Trend Index 2024). La source du 9 % n'est toujours pas citée (chiffrage, ligne 7). |
| 6 | « Chaque outil lit alors les fichiers qu'on lui confie… » | — | Constat. |
| 7 | « La même IA lit les logiciels et les tableurs de toutes les sociétés… et range leurs données sous un seul référentiel. » | B / M | Référentiel du banc : tests b1_01 à b1_06. Les comptes publiés n'ont ni tiers ni codes, donc pas de référentiel sur les 3 groupes. L'IA : ligne 1. |
| 8 | « Une règle s'écrit une fois pour le groupe et s'applique dans chaque filiale (réserve, préavis, seuil d'encours). » | B | b1_16, tests b1_19. |
| 9 | « Chaque matin, la présidence lit le groupe sur une page… » | N1 / M | Les chiffres sont prouvés (N1, 18/10). La section de la présidence ne disait que « à redéposer » sur des comptes publiés : corrigé par **b1_20** (total, une ligne par société, écart, résultat, « non publiée ») : posé, test b1_23 et 44 verts sur la recette le 18/10. Remise à 7 h : ligne 11. |
| 10 | « …et chaque direction reçoit ses décisions avec le calcul et la pièce qui les justifient. » | B | b1_15, tests b1_18. |
| 11 | « Chaque matin à 7 h, chaque direction reçoit : » | N1 partiel / M | **Assemblage à 7 h observé sur des données réelles.** Relevé du coordinateur du 23/10 : pour les 3 groupes publics, le point est prévu à 05:00 Z (7 h à Paris) et assemblé à 05:00:00,78 Z. Il contient « Le groupe ce matin » : 4 lignes pour EDH et Normaxis, 5 pour Ankama. **Remise non observée** : le statut finit en « perime », car aucun envoi n'est réglé pour ces clients et les adresses sont en .test. **Défaut relevé** : le gérant, aussi membre de `presidence`, reçoit deux fois la même section (2 sections, 8 ou 10 items). La section de `direction_financiere` est déposée, mais personne n'est dans cette équipe. |
| 12 | « Le groupe sur une page » (ventes, trésorerie et écarts de chaque société) | N1 partiel | Ventes, résultat et écart N-1 réels. La trésorerie n'est pas publiée par le jeu ouvert : l'écran dit « non publiée » (en attente de fusion sur main). |
| 13 | « Les contrats à dénoncer » | B | b1_05, tests b1_08 ; décision proposée d'office (b1_15). Aucun contrat n'est publié pour les 3 groupes. |
| 14 | « Les réserves à émettre » (colis, photos, trois jours) | B | b1_11 et b1_12, tests b1_14 et b1_15 ; délai légal de 3 jours (C. com. L133-3). |
| 15 | « Les reportings dus » | B | b1_09, tests b1_12. |
| 16 | Situation DSI : « Chaque filiale a pris son propre assistant d'IA… » | B / M | La DSI valide chaque source (b1_16). « Une seule IA » : ligne 1. |
| 17 | « Chaque société envoie son reporting à sa façon, et le chiffre du groupe arrive en retard. » | B | Ligne 15. |
| 18 | « Le contrat se renouvelle seul si personne ne le dénonce… » | B | Ligne 13. |
| 19 | « Sans réserve envoyée au transporteur sous trois jours, l'avarie devient une perte. » | B | Ligne 14. |
| 20 | « Le même client porte trois noms dans trois sociétés, et personne ne voit son encours. » | B | Référentiel et encours du groupe, tests b1_07. |
| 21 | « Varelo lit vos logiciels de gestion, vos caisses et vos tableurs sans jamais rien y écrire. Chaque source se branche avec l'accord de la DSI et se débranche de la même façon. » | B / M | Branchement et débranchement (b1_16), caisses (b1_17). Rien n'écrit vers une source. Les caisses sont fictives et un vrai logiciel n'a jamais été branché. |
| 22 | « Un seul référentiel » | B | Ligne 7. |
| 23 | « Rien ne part sans l'accord de la direction concernée… le journal garde qui a validé quoi. » | B | `demandes_validation` et approbations (b1_15) ; journal opposable. |
| 24 | « Les données restent dans l'Union européenne ou sur vos propres serveurs, chiffrées, et chaque lecture est inscrite au journal. Aucune d'elles ne sert à entraîner un modèle. » | M | Lectures de contexte journalisées (b1_18), mais pas chaque écran. « Vos propres serveurs » : rien. Fournisseur de production (Bedrock Francfort) : pas encore branché. |
| 25 | « Nous commençons par un pôle, une société et une direction… un trimestre complet… » | M | Pôles (B). Un trimestre réel suppose un vrai client. |
| 26 | « Chaque société suivante se branche ensuite sur le même socle… d'un territoire à l'autre. » | B | Sociétés et territoires (GP, MQ, FR), tests b1_01 à b1_06. Les 3 groupes publics sont en FR. |
| 27 | « Le groupe garde ainsi une seule IA à gouverner… » | M | Ligne 1. |
| 28 | « Se combine avec FILED, CASHD » | — | Autres modules, hors B1. |

**Ordre des lots vers le niveau 2** (sans IA tant que le crédit n'est pas rechargé) :

1. Fait : b1_20 et test b1_23, la section de la présidence parle de chiffres.
2. Fait : chaque gérant rejoint l'équipe `presidence`, et le point est réglé à 7 h (heure de Paris).
3. Fait le 23/10 : assemblage à 7 h observé, remise et dédoublonnage restent à faire (ligne 11).
