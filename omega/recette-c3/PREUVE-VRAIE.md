# Preuve EN VRAI — REPUT, circuit mail + formulaire (banc, recette)

But : faire passer de **B** (testé recette) à **A** (prouvé en vrai) les promesses du cœur du chiffrage
(`omega/CHIFFRAGE/reput.md` #2, #11, #20, #21, #25, #26, #37, #42, #44, #53, #59, #82). Un vrai courriel et un
vrai formulaire, le vrai modèle, la vraie file de validation, un vrai envoi. Tout reste sur le **banc**
(`cccccccc-…-0c`) en **mode essai** : la réponse part à l'adresse d'essai du banc, jamais chez un tiers.
C3 n'appelle pas Supabase : le coordinateur joue les étapes 0, 2, 3, 5 ; Teo joue 1 et 4.

| Étape | Qui | Geste | Attendu |
|---|---|---|---|
| 0 | Coordinateur | Rouvrir la boîte `banc@recu.omegaai.fr` (suspendue par A2) ; passer `preuve_vraie.sql` bloc 0 | REPUT actif, mode `essai`, 3 fiches validées, crons `reput-synchro` et `omega-reput` actifs, dernier `omega-reput` en `succeeded` |
| 1 | Teo | Depuis sa vraie boîte, deux courriels à `banc@recu.omegaai.fr`, à 2 min d'écart : **(a)** « Bonjour, combien coûte le diagnostic à domicile ? Vous êtes ouverts le samedi matin ? » **(b)** « Vous installez aussi les chaudières à granulés ? » Noter l'heure. | (a) couverte par la base ; (b) hors base → transfert |
| 2 | Coordinateur | `FORMULAIRE_SECRET=… [SUPABASE_SERVICE_ROLE_KEY=…] deno run --allow-env --allow-net omega/functions/reput-reponse/outils/preuve_formulaire_reput.ts` | Dépôt 201 ; avec la clé : contrôles 1 à 4 OK (préparée < 60 s, couverte, ≥ 1 fiche, `a_valider`). Si la réception n'est pas rattachée au banc (boîte `site:omegaai.fr` d'un autre client), le dire : c'est le rattachement d'A2, pas REPUT |
| 3 | Coordinateur | 2 min après : `preuve_vraie.sql` blocs 1 à 3, en remplaçant l'heure de début | Pour chaque réception : `secondes_preparation` < 60 ; (a) et formulaire : `couverte` vrai, fiches citées « Diagnostic à domicile » + « Horaires d'ouverture », 89 € dans le corps ; (b) : `couverte` faux, `type_action` `reput.transferer…`, raison écrite ; aucune réponse `envoye` ; coût par réponse lisible ; travaux `reput.preparer` finis sans erreur |
| 4 | Teo | Espace → REPUT → « À valider » : **valider** (a) ; **corriger** la réponse du formulaire (une phrase) puis valider la v2 ; **laisser** (b) | (a) part ; formulaire : v2 redéposée puis partie ; (b) reste en attente |
| 5 | Coordinateur | `preuve_vraie.sql` blocs 2 et 4 | Envois (a) et formulaire `envoye`, (b) non ; journal : réception, préparation, décision, envoi, dans l'ordre ; le courriel arrive à l'adresse d'essai du banc avec signature et mention de réponse automatisée |

## Ce qui est prouvé quand tout est vert

Réception réelle → réponse préparée par le vrai modèle en moins d'une minute, tirée de la base, fiches citées,
chiffre exact ; hors base → transfert sans hypothèse ; rien ne part sans validation ; correction → nouvelle
version ; envoi réel avec signature et mention ; journal complet ; coût mesuré.

## Ce qui n'est PAS prouvé par cette étape (reste B)

- **La réponse au vrai expéditeur** : en mode essai elle part à l'adresse d'essai. Pour la prouver, Teo décide
  de passer le module `reput` du banc en mode réel avec sa propre adresse comme seul expéditeur (geste du socle
  `reglages_envois`, à poser par le coordinateur).
- **L'accusé de réception** et **l'envoi seul sur sujet autorisé** : demandent un accord (écran « Sujets
  autorisés », Teo seul décideur → « Activer moi-même ») ; à rejouer l'étape 1 (a) après l'accord sur
  « Tarifs » : la réponse doit partir seule dans la minute.
- **L'IA hébergée dans l'UE** : la recette appelle l'API Anthropic en direct (`ANTHROPIC_API_KEY`).
