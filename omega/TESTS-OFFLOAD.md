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
| | | | | | | |

## Écarts

(aucun encore — format : `TOFFLOAD-01 · cas · reproduction exacte · réponse brute · écran`)

## Questions au coordinateur

- La porte de dépôt d'un relevé d'historique pour `banc-test-offload`, et celles des contrats
  et interventions.
- Comment poser un compte « en litige CASHD » pour O1, et déclencher la détection à la demande.
- Un compte « gérant » du client banc pour l'écran et les gestes.

## REPRISE

(à remplir à chaque arrêt : fait / en cours / prochain pas / questions / SHA)
