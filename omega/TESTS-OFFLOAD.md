# T-OFFLOAD — tests en boîte noire du moteur OFFLOAD (clients inactifs, affaires en plan)

Brief posé par la session bureau de Teo, 21/10/2026. Contrat : `omega/CONTRAT-TESTEUR.md`.
Branche : `testeur-offload`. Client banc : `banc-test-offload` (créé par le coordinateur).

## Ce que tu lis

- Promesses : `lib/produits/capacites/reprise.ts` (catalogue, cas limites, échelle) et
  `lib/produits/reprise.ts` (la page) : détection du silence anormal, reprise à valider, un
  seul canal, un message par trimestre, compte en litige exclu, affaires en plan, échéances,
  valeur en jeu, rien ne part en essai.
- Écran : `app/espace2/offload` sur la recette (tableau, fiche compte, pilotage).
- Banc de l'ouvrier, pour savoir comment l'historique entre : `omega/recette-c4/banc_offload.sql`
  et, sur `worker-c4`, `omega/banc/offload_*.sql` (fichiers de banc seulement).

OFFLOAD part d'un **historique d'achats** (relevés : qui a acheté quoi, quand), de contrats et
d'interventions. Ton jeu d'essai est un fichier de données ; les comptes et contacts sont des
entreprises et des personnes **fictives**.

## Le jeu d'essai de départ

Le client banc est une **société de maintenance et d'équipements en Guadeloupe** (climatisation,
par exemple) : des comptes qui achètent à un rythme régulier, des contrats à reconduction, des
interventions terminées. Douze comptes sur le même gabarit ; seul le cas change.

| Cas | Le compte | Ce que le site promet (à vérifier dans `reprise.ts`) |
|---|---|---|
| O0 | rythme mensuel, silencieux depuis 3 mois — le témoin | signal levé, reprise **à valider**, rien d'envoyé |
| O1 | même silence, mais compte en litige chez CASHD (posé par le coordinateur) | **exclu** de la vague, dit pourquoi |
| O2 | rythme annuel, silencieux depuis 3 mois | **aucun** signal : silence normal |
| O3 | silence anormal, compte sans courriel | reprise par **appel**, pas de message |
| O4 | commande arrivée, non retirée depuis 10 jours (délai réglé 7) | affaire en plan, relance 1 préparée |
| O5 | contact importé sans accord | aucun message préparé pour lui |
| O6 | compte déjà relancé il y a 40 jours | pas de second message ce trimestre |
| O7 | commande passée **pendant** une reprise en attente | reprise close « commande », message en attente annulé |
| O8 | sortie d'un geste (exclure / suivre) sans motif | refusée ; avec motif : acceptée et journalisée |
| O9 | compte joignable par courriel et par SMS | **un seul** canal par vague |
| O10 | contrat à reconduction tacite, échéance dans 60 jours | échéance signalée à temps, pas après |
| O11 | valeur en jeu : le compte commande 1 000 € après l'ouverture de la reprise | valeur **figée** à l'ouverture, pas recalculée |
| O12 | effacement d'une personne (porte d'effacement, demandée au coordinateur) | plus rien ne la mentionne ; journal présent, sans ses données |

Après la série : rejoue le relevé **à l'identique**. Attendu : un signal par compte et par
jour au plus, aucune seconde reprise.

Deuxième série : la vague de la semaine (un seul jour d'envoi réglé), le pilotage (valeur en
jeu par segment sur 12 mois, lisible à l'écran), la restitution des données d'une organisation
(tout revient, dans un format lisible).

## Niveau 2 (plus tard)

L'import des comptes d'Omega (personnes morales) est en cours chez l'ouvrier, sur l'accord
écrit de Teo. Quand le coordinateur te le dit, tu lis **ses** résultats par l'écran : les
signaux ont-ils du sens pour une vraie liste ? Tu n'importes rien toi-même. Les connecteurs
CRM / ERP / tableur : « pas testable sans tiers ».

## Résultats

| Cas | Promesse (fichier:ligne) | Le compte | Attendu | Ce qu'OFFLOAD a fait | Verdict | Niveau |
|---|---|---|---|---|---|---|
| O0 | lib/produits/reprise.ts:166, lib/produits/reprise.ts:451, lib/produits/capacites/reprise.ts:44 | mensuel, muet depuis 20/07 | signal levé, reprise à valider, rien d'envoyé | pas encore joué (portes attendues) | — | — |
| O1 | lib/produits/reprise.ts:195, lib/produits/capacites/reprise.ts:156 | O0 + litige CASHD | exclu de la vague, motif dit | pas encore joué (portes attendues) | — | — |
| O2 | lib/produits/capacites/reprise.ts:44, lib/produits/reprise.ts:320 | annuel, muet depuis 20/07 | aucun signal (silence normal) | pas encore joué (portes attendues) | — | — |
| O3 | aucune promesse « appel » trouvée sur le site (brief seulement) | O0 sans courriel | reprise par appel, aucun message | pas encore joué (portes attendues) | — | — |
| O4 | lib/produits/capacites/reprise.ts:86-87, lib/produits/capacites/reprise.ts:152 | actif, CMD-O4-01 arrivée 11/10, délai 7 j | affaire en plan, relance 1 préparée | pas encore joué (portes attendues) | — | — |
| O5 | aucune promesse « accord » trouvée sur le site (brief seulement) | O0, contact sans accord | aucun message préparé | pas encore joué (portes attendues) | — | — |
| O6 | lib/produits/reprise.ts:193, lib/produits/reprise.ts:381 | O0, relancé le 11/09 | pas de second message ce trimestre | pas encore joué (portes attendues) | — | — |
| O7 | lib/produits/capacites/reprise.ts:114 ; « close commande » : brief | O0 + commande pendant la reprise | reprise close « commande », message annulé | pas encore joué (portes attendues) | — | — |
| O8 | lib/produits/capacites/reprise.ts:101, lib/produits/capacites/reprise.ts:176 ; motif : brief | actif | sans motif refusé ; avec motif accepté et journalisé | pas encore joué (portes attendues) | — | — |
| O9 | lib/produits/reprise.ts:381 | O0, courriel + SMS | un seul canal par vague | pas encore joué (portes attendues) | — | — |
| O10 | lib/produits/capacites/reprise.ts:75, lib/produits/capacites/reprise.ts:73 | actif, CT-O10 tacite au 20/12 | échéance signalée à temps (avant J-7) | pas encore joué (portes attendues) | — | — |
| O11 | lib/produits/capacites/reprise.ts:113 ; « figée » : brief | O0 + 1 000 € après ouverture | valeur figée à l'ouverture | pas encore joué (portes attendues) | — | — |
| O12 | lib/produits/reprise.ts:441 ; porte : brief | personne de O12 | plus rien ne la mentionne ; journal sans ses données | pas encore joué (portes attendues) | — | — |
| R | lib/produits/reprise.ts:196, lib/produits/reprise.ts:397 | rejeu à l'identique | 1 signal/compte/jour, aucune seconde reprise | pas encore joué (portes attendues) | — | — |

## Écarts

(aucun encore — format : `TOFFLOAD-01 · cas · reproduction exacte · réponse brute · écran`)

## Questions au coordinateur

- La porte de dépôt d'un relevé d'historique pour `banc-test-offload`, et celles des contrats
  et interventions.
- Comment poser un compte « en litige CASHD » pour O1, et déclencher la détection à la demande.
- Un compte « gérant » du client banc pour l'écran et les gestes.
- (21/10) L'identifiant (uuid) de `banc-test-offload`, et la confirmation qu'OFFLOAD y est installé en `essai`.
- (21/10) Les portes de lecture : signaux / reprises d'un compte, affaires en plan, échéances, journal des envois préparés.
- (21/10) La porte d'effacement d'une personne (O12) et la porte de geste exclure / suivre avec motif (O8).
- (21/10) Le format attendu du relevé : mon jeu est en CSV (`omega/testeur-offload/releve.csv`,
  compte, date, référence, libellé, montant HT). Faut-il le passer par le dépôt de fichier
  (`GUIDE-DEPOT.md`) ou par une RPC ?
- (21/10) Constat de lecture, pour info : O3 (appel), O5 (accord), O8 (motif), O11 (valeur figée)
  et O12 (effacement) ne correspondent à aucune promesse écrite sur la page ni au catalogue ; je
  les teste contre le brief. Par ailleurs toutes les lignes « Échéances » et « Affaires en plan »
  du catalogue portent le commentaire « moteur CYCLE pas construit » (`capacites/reprise.ts:20-25`) :
  O4 et O10 risquent d'être « pas couvert ».

## REPRISE

**21/10, arrêt 1.**
- Fait : contrat, brief, promesses (page + catalogue) et banc de l'ouvrier lus ; jeu d'essai série 1 prêt
  (`omega/testeur-offload/` : `comptes.csv`, `releve.csv`, `jeu-serie1.md`) ; attendus notés dans le tableau.
- En cours : rien joué — aucune porte de dépôt connue (le banc de l'ouvrier ne montre que `offload_installer`).
- Prochain pas : dès réponse, dépôt → détection → lecture → événements O7/O11/O8/O12 → rejeu.
- Questions : section ci-dessus (identifiant du banc, portes de dépôt/lecture/geste/effacement, litige O1, compte gérant).
- SHA : voir le commit « T-OFFLOAD : jeu d'essai série 1 ».
