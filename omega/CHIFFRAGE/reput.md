# REPUT — les promesses de la page, et ce qui reste (audit du 26/10/2026)

Audit en lecture seule du 26/10/2026, fait sur : la page REPUT (anciennement FRONTD) lue sur `origin/main`
(de17d8c9) ; les lots c3_01 → c3_45 (`origin/worker-c3`, af472f50) et `omega/NOTES-C3.md` de cette branche ; la fin
de `omega/NOTES-COORDINATEUR.md` (`origin/main`) ; et ce qui est **posé** sur la recette `omega-recette` (lecture de
`supabase_migrations.schema_migrations`, des fonctions, des fonctions Edge et des compteurs de demandes, par le
connecteur). Le relevé du 06/10 (c0494b4) est repris ligne à ligne : sa colonne d'état reste visible (« 06/10 »), à
côté de l'état du jour (« 26/10 »).

## En tête

### Décompte

| État | 06/10 (chiffres transmis) | 06/10 (recompté ligne à ligne) | 26/10 |
|---|---|---|---|
| A prouvé en vrai | 0 | 0 | 11 |
| B construit et testé sur la recette | 48 | 48 | 56 |
| C partiel | 32 | 32 | 34 |
| D pas construit | 11 | 12 | 0 |
| T attend un tiers, un compte ou une décision de Teo | 4 | 4 | 4 |
| **Total compté** | 95 | 96 | 105 |

Le décompte « recompté » prend, pour une case double du 06/10 (« C/D »), l'état le plus bas ; la ligne 97 (constat)
ne compte pas. Les neuf phrases ajoutées le 26/10 (n° 98 à 106) n'ont pas d'état au 06/10 : elles ne comptent que
dans la dernière colonne.

**Jours restants au 26/10** (jours de travail d'une personne, une ligne qui en répète une autre vaut 0) :
**→B ≈ 31,5 j**, **→A ≈ 47,5 j**. Au 06/10 : →B ≈ 44 j, →A ≈ 15 j.

### Les 5 manques les plus importants pour vendre REPUT

1. **La phrase de tête n'est plus tenue : « Une demande reçue à 21 h obtient sa réponse à 21 h ».** Le 22/10, Teo
   a décidé que « la vraie réponse attend l'ouverture » : la nuit, seul l'accusé part (c3_42a, c3_42), la réponse de
   fond reste derrière le verrou HORS_HEURES du socle, même sur un sujet autorisé d'avance. Six phrases du site en
   dépendent (n° 1, 3, 5, 22, 95, 100, 103). **0,5 j pour laisser partir la nuit une réponse couverte par un accord,
   puis la décision de Teo.**
2. **WhatsApp Business n'existe qu'en envoi.** Un vrai message WhatsApp est parti le 18/10 (A2, numéro de test
   Meta) ; aucune demande WhatsApp n'a jamais été reçue par REPUT sur la recette. **Tiers : compte Meta vérifié,
   numéro du client, modèles approuvés.**
3. **L'agenda.** Le planning existe dans la base (créneaux, rendez-vous, rappel la veille : c3_21, test rejoué vert
   le 26/10), mais rien n'écrit dans l'agenda Google ou Microsoft du client, et REPUT ne propose pas lui-même un
   créneau dans sa réponse : c'est une personne qui pose le rendez-vous. **≈ 7 j + vérification Google (tiers).**
4. **Une seule preuve réelle, au banc, et rien en production.** Le 22/10, un vrai courriel a reçu une réponse
   tirée de la base, validée puis envoyée ; mais le formulaire n'a pas été joué en vrai, l'astreinte n'a sonné que sur
   un compte Twilio de test, aucun accord n'était actif, et aucun client réel n'est branché. **≈ 5 j de preuves
   (formulaire, astreinte réelle, envoi seul, avis) + pose en production.**
5. **« Hébergées dans l'Union européenne ».** Le texte des messages part à l'IA hors UE, et la transcription des
   appels se fait chez Twilio (hors UE) faute de fournisseur UE choisi. **≈ 1,5 j + compte AWS Bedrock en région UE
   et choix du fournisseur de transcription (tiers).**

### Hypothèses (aucune question posée à Teo)

- **Règle d'or du 24/10 : on ne modifie jamais une phrase du site.** Là où le relevé du 06/10 disait « choix de
  texte » ou « reformuler », ce relevé chiffre ce qu'il faut **construire**. Quand une décision de Teo contredit une
  phrase (réponse de nuit, n° 1), la phrase reste la cible et la décision est signalée en tête.
- **A** n'est donné que sur la preuve réelle du 22/10 (NOTES-COORDINATEUR, « Preuve REPUT niveau 2 — 22/10, 00 h 50
  → 00 h 58 Z ») : courriels de Teo reçus en réceptions 1436 (00:41:19 Z) et 1437 (00:44:08 Z) ; demande 763a0b50
  couverte par deux fiches de la base, préparée en 106 s ; demande bd3c193c hors base, transférée avec sa raison, en
  59 s ; les deux regroupées en une réponse « à valider » ; rien parti avant la validation du gérant (00:54:30 Z) ;
  envoi b65bc08a remis par Brevo à 00:55:02 Z (mode essai) ; journal complet dans l'ordre. Ce qui n'y a pas été vu
  (formulaire, accusé envoyé, mention à l'œil) reste B.
- **B** n'est donné que sur un test vert cité : `^test_c3_` 44/44 fichiers verts le 26/10 (NOTES-C3, après c3_45),
  ou un des 6 tests REPUT rejoués le 26/10 sur la recette par `extensions.runtests` (chaque test annulé, rien laissé
  en base) : c3_03_accords (47), c3_05_accuse_avis (31), c3_06_cashd_escalade (27), c3_14_pieces (20),
  c3_21_rendez_vous (30), c3_22_astreinte (24) — tous verts. « Astreinte de bout en bout en Twilio de test » et
  « délai < 60 s tenu (0 à 5 s) » sont au niveau 1 (recette), d'après le coordinateur (22-23/10).
- Constat du 26/10 sur la recette : demandes REPUT par courriel (38), formulaire (4), appel (10), aucune par
  WhatsApp ; aucun rendez-vous posé (`reput_rdv` vide). Les appels viennent du banc (Twilio de test, appels simulés).
- Les phrases des articles (`lib/content.ts`, n° 104 à 106) sont des promesses du site : elles sont relevées.

Légende : **A** prouvé en vrai · **B** construit et testé sur la recette · **C** partiel · **D** pas construit ·
**T** tiers, compte, achat ou décision de Teo. Jours : « →B » de l'état du jour à B, « →A » de B à prouvé en vrai.
Fichiers de la page : `lib/produits/accueil.ts` (A), `lib/produits/capacites/accueil.ts` (K),
`app/offres/demandes-clients/page.tsx`, `app/offres/page.tsx`, `app/page.tsx` (accueil), `lib/content.ts` (content).

## Les promesses

| # | Promesse (texte exact) | Où | 06/10 | 26/10 | Preuve (relue le 26/10) | Ce qui manque | j →B / →A |
|---|---|---|---|---|---|---|---|
| 1 | « Une demande reçue à 21 h obtient sa réponse à 21 h » | A:85, accueil:706 | C | C | Préparation dans la minute, réveil de l'ouvrier au dépôt (c3_34) ; envoi seul sur sujet autorisé (c3_03, c3_13) ; la nuit, seul l'accusé saute HORS_HEURES (c3_42a, c3_42, décision de Teo du 22/10) | Laisser une réponse couverte par un accord sauter HORS_HEURES, comme l'accusé (réglage par organisation, test) ; décision de Teo | 0,5 / 1 |
| 2 | « …votre client reçoit sa réponse, et elle ne dit rien que vous n'ayez validé. » | A:94 | B | A | Preuve du 22/10 : rien parti avant la validation (00:54:30 Z), envoi b65bc08a à 00:55:02 Z | — | 0 / 0 |
| 3 | « < 1 min » — « C'est ce que votre client attend, le dimanche comme le 15 août. » | A:138-140 | C | C | Préparation en 106 s et 59 s le 22/10 (réel), puis < 60 s (0 à 5 s) au niveau 1 après c3_34 | = n° 1 ; une mesure réelle sous 60 s | 0 / 0,5 |
| 4 | « 0 » — « Réponse inventée : quand il ne sait pas, il transfère à vos équipes. » | A:143-145 | C | C | Chiffre non sourcé → transfert (rediger.ts) ; hors base transféré en vrai le 22/10 (bd3c193c) | Un fait non chiffré inventé n'est attrapé que par le modèle et la relecture : contrôle de citation des faits, puis relevé sur 100 cas réels | 1 / 2 |
| 5 | « REPUT lit le message dès qu'il arrive, puis répond dans la minute à partir de la base… » | A:177 | C | C | Lu à la seconde le 22/10 (réception 1436) ; = n° 1 pour la réponse | = n° 1 | 0 / 0 |
| 6 | « Vos équipes relisent l'échange le lendemain. » | A:177 | C | B | Point du matin : liens vers chaque demande (c3_10), file à jour (c3_31), envoyées seules comptées (c3_29) ; tests c3_10, c3_29, c3_31 | Preuve en vrai | 0 / 0,5 |
| 7 | « Chaque demande est d'abord qualifiée, puis elle suit le circuit que vous avez défini pour son type. » | A:185 | B | A | 22/10 : 763a0b50 qualifiée couverte, bd3c193c hors base et transférée | — | 0 / 0 |
| 8 | « Quand elle est urgente, le téléphone de l'astreinte sonne. » | A:185 | D | B | Tour de garde, appel par rangs, prise par touche 1, épuisement (c3_22, c3_37 → c3_41 ; test c3_22 rejoué 26/10, 24/24) ; Edge `reput-astreinte` v3, cron 660 | Compte Twilio réel et un vrai appel d'astreinte | 0 / 1 |
| 9 | « La demande d'avis part dans les trois jours qui suivent le règlement, puis … relancée deux fois au maximum. La même personne n'est plus sollicitée avant six mois. » | A:193, A:434 | B | B | c3_05, c3_06 (tests rejoués 26/10, 31/31 et 27/27) | Un vrai avis demandé après un vrai règlement | 0 / 1 |
| 10 | « L'installation demande une heure d'entretien, puis le branchement de vos canaux, et une semaine de rodage… » | A:215 | C | C | Courriel branché en vrai le 22/10 (inbound recu.omegaai.fr) ; kit de preuve (PREUVE-VRAIE.md) | Procédure d'installation écrite et rejouable (boîte, formulaire, base, réglages) ; WhatsApp : = n° 12 | 0,5 / 1 |
| 11 | « Nous construisons ensemble la base de votre entreprise : tarifs, horaires, durées d'intervention, règles internes. Rien d'autre ne sera dit à un client. » | A:222 | B | B | c3_01 (fiches versionnées, sources obligatoires) ; trois fiches du banc citées en vrai le 22/10 | Une base construite avec un vrai client | 0 / 1 |
| 12 | « Nous connectons WhatsApp Business, votre messagerie et votre agenda, si bien que vos clients continuent d'écrire au même numéro qu'hier. » | A:228 | C | C | Messagerie : Gmail connecté en vrai le 18/10 (A2) ; WhatsApp : envoi réel le 18/10 (A2), aucune réception ; agenda : planning dans la base (c3_21), aucun connecteur | Connecteur agenda Google + Microsoft (= n° 27) ; réception WhatsApp au numéro du client (Meta) | 0 / 2 |
| 13 | « Vos équipes reçoivent copie de chaque réponse la première semaine, et nous corrigeons sur des cas réels. » | A:234 | C | C | Courriel « réponses à valider » aux décideurs (c3_11), sans contenu ; correction de la base (reput_corriger, c3_08) | Copie de chaque réponse envoyée aux décideurs pendant les sept premiers jours (réglage, test) | 0,5 / 0,5 |
| 14 | « REPUT prend ensuite son rythme sur les postes que vous ouvrez. » | A:234 | B | B | Accords par sujet (c3_03, test rejoué 26/10, 47/47), envoi automatique (c3_13) | Un accord actif chez un vrai client | 0 / 0,5 |
| 15 | « Vous n'avez aucun logiciel de plus à ouvrir » | A:263 | C | C | Le point du matin et le courriel aux décideurs mènent à la demande (c3_10, c3_11) ; la décision se prend dans l'espace Omega, connecté | Décider depuis la notification : lien signé et connexion d'un clic, ou réponse « OUI » au courriel | 2 / 1 |
| 16 | « REPUT se place derrière les canaux que vous utilisez déjà, puis répond à partir de votre base. » | A:265 | C | C | = n° 12 | = n° 12 | 0 / 0 |
| 17 | Tuiles « WhatsApp Business », « Fiche Google Business », « Google Agenda », « Gmail / Outlook » | A:272-275 | C | C | Gmail : B ; Outlook : non branché ; fiche Google : lien d'avis (B) ; WhatsApp : envoi seul ; Google Agenda : aucun connecteur | Microsoft 365 (A2) ; = n° 12, 27 | 1 / 0,5 |
| 18 | « Créneau réservé, rappel la veille » | A:317, A:393 | D | C | Créneaux libres, pose, rappel préparé au canal de la demande (c3_21, test rejoué 26/10, 30/30) | REPUT ne propose pas les créneaux libres dans sa réponse, et ne pose pas le rendez-vous sur le « oui » du client (après validation) | 2 / 1 |
| 19 | « Demande qualifiée, transmise au commercial » | A:326 | B | B | Routage par sujet vers une équipe (c3_07) | Preuve en vrai | 0 / 0,5 |
| 20 | « Répondu depuis la base construite avec vous » | A:335 | B | A | 22/10 : demande 763a0b50, fiches « Horaires d'ouverture » et « Diagnostic à domicile » (89 € TTC, samedi 9-12) | — | 0 / 0 |
| 21 | « Transféré : la réponse n'est pas dans sa base » | A:344 | B | A | 22/10 : demande bd3c193c, `reput.transferer`, raison écrite | — | 0 / 0 |
| 22 | « Répondu à 6 h 31 » | A:369 | C | C | = n° 1 (6 h 31 tombe avant l'ouverture) | = n° 1 | 0 / 0 |
| 23 | « Rendez-vous posé samedi 9 h 30 » | A:377 | D | C | = n° 18 | = n° 18 | 0 / 0 |
| 24 | « Transféré : l'astreinte est appelée » | A:385 | C | B | = n° 8 | = n° 8 | 0 / 0 |
| 25 | « La mention figure dans la première réponse, dans les termes que vous choisissez à l'installation. » | A:418 | B | B | reglages.mention_automatisee (c3_01) | Lire la mention dans un vrai courriel reçu (le 22/10, la boîte d'essai n'a pas été relue) | 0 / 0,5 |
| 26 | « REPUT ne peut répondre qu'à partir de la base … il ne formule pas d'hypothèse : il transfère … avec la fiche de son escalade. » | A:422, K:21, K:56, K:88 | B | A | 22/10 : bd3c193c hors base → transférée avec sa raison | Limite : = n° 4 | 0 / 0 |
| 27 | « La réservation s'écrit directement dans votre agenda, en temps réel. Le second créneau n'apparaît plus comme disponible, et le client se voit proposer les suivants. » | A:426 | D | C | Planning dans la base : un créneau pris n'est plus proposé, pris entre-temps → les trois suivants (c3_21, test rejoué 26/10) | Connecteur agenda Google + Microsoft : lecture des disponibilités, écriture du rendez-vous adossée à la validation | 5 / 2 |
| 28 | « C'est vous qui fixez la frontière. Les premières semaines, tout vous est soumis avant envoi. Ensuite, vous décidez poste par poste… Chaque échange … reste archivé et consultable. » | A:430 | B | A | 22/10 : soumis avant envoi, validé, journal complet (demande_recue → reponse_envoyee) | — | 0 / 0 |
| 29 | « Les messages sont écrits d'avance et identiques pour tout le monde : aucun tri des mécontents. » | A:434 | B | B | Texte d'avis unique par entité (c3_05, test rejoué 26/10) | Preuve en vrai | 0 / 0,5 |
| 30 | « Oui, l'atelier reçoit samedi de 8 h à 13 h… Je peux vous réserver samedi 9 h 30 ? » / « C'est réservé… Vous recevrez un rappel vendredi soir. » / « Rendez-vous créé dans l'agenda du service · client confirmé » | A:529-539 | D | C | Horaires depuis la base (A, 22/10) ; créneaux, rappel (c3_21) | = n° 18 et n° 27 | 0 / 0 |
| 31 | Circuit « Devis » — « chiffré » | A:456 | C | B | Prix de la grille cités depuis la base, chiffre non sourcé bloqué (rediger.ts) ; un tarif cité en vrai le 22/10 (89 € TTC) | Un vrai devis chiffré | 0 / 0,5 |
| 32 | Circuits « Urgence » — « transféré », « Réclamation » — « transféré », « Renseignement » — « répondu » | A:457-459 | B | B | Sujets protégés (c3_01), transfert (c3_02) ; « Renseignement — répondu » vu en vrai le 22/10 | Urgence et réclamation en vrai | 0 / 0,5 |
| 33 | « Hébergées dans l'Union européenne » / « rien n'y est jamais revendu » | A:500-502 | T | T | Base à Francfort ; le texte des messages part à l'IA hors UE | IA en région UE (Bedrock eu-west, client `_partage`) ; transcription UE (n° 41) | 0,5 / 0,5 |
| 34 | « Les réponses emploient le vocabulaire de votre métier, et le suivi se fait au téléphone. » | A:508 | C | T | Vocabulaire depuis la base | Le suivi au téléphone est un service humain d'Omega | 0 / 0 |
| 35 | /offres : « REPUT » — « Réponse à toute heure », « Prise de rendez-vous » | offres:397 | C/D | C | = n° 1 et n° 18 | = n° 1, 18 | 0 / 0 |
| 36 | « Les demandes reçues par mail et WhatsApp obtiennent une réponse à toute heure, tirée de ce que votre entreprise sait vraiment, jamais inventée. Un système Omega. » | demandes-clients:72 | C | C | Mail : A (22/10) ; WhatsApp : = n° 12 ; « toute heure » : = n° 1 | = n° 1, 12 | 0 / 0 |
| 37 | « Les messages arrivent par votre messagerie et par le formulaire de votre site. » | K:27 | B | B | Messagerie : réelle le 22/10 ; formulaire signé : 4 demandes au banc (21-22/10), pas joué en vrai (secret du formulaire absent) | Un vrai formulaire envoyé depuis un site | 0 / 0,5 |
| 38 | « Le formulaire de votre site entre dans le même circuit que les autres canaux. » | K:28 | B | B | = n° 37 | Formulaire installé chez un client | 0 / 0,5 |
| 39 | « La messagerie instantanée du site est tenue aux mêmes règles que le reste. » | K:29 | D | C | Messagerie du site d'A2 (Edge `widget`, lot 19ap, test vert) posée ; aucune réception de ce canal sur la recette | Faire entrer ce canal dans REPUT (canal de demande, réponse dans la fenêtre ouverte), test | 1,5 / 1 |
| 40 | « Les messages reçus sur les réseaux sociaux rejoignent la même file. » | K:30 | T | T | Rien de construit | Messenger et Instagram (Meta Graph) comme canaux d'A2, après revue de l'appli par Meta | 3 / 1 |
| 41 | « Un appel non décroché est transcrit, puis traité comme une demande écrite. » | K:31 | T | B | Ouvrier `reput-appels` v6 (Twilio, signé), canal « appel » (c3_23a, c3_23), transcription commutable (c3_24), réponse SMS ou WhatsApp (c3_33, c3_36), fixe → « à rappeler » (c3_43) ; tests verts ; 10 appels au banc (19 → 26/10) | Numéro Twilio réel ; fournisseur de transcription UE (non choisi) | 0 / 1 |
| 42 | « Un accusé de réception part dans la minute, sous votre signature. » | K:32 | B | B | reput_accuser, accusé de nuit (c3_42), accusés clos avec la demande (c3_35) ; le 22/10, l'accusé a été préparé mais pas envoyé | Un accusé réellement envoyé | 0 / 0,5 |
| 43 | « Les pièces jointes sont conservées et rattachées à la demande. » | K:33 | C | B | reput_pieces, reput_ouvrir_piece, écran (c3_14, test rejoué 26/10, 20/20) | Preuve en vrai | 0 / 0,5 |
| 44 | « Vos horaires d'ouverture sont cités dans les réponses, tels que vous les avez écrits. » | K:34 | B | A | 22/10 : fiche « Horaires d'ouverture » citée (samedi 9-12) | — | 0 / 0 |
| 45 | « Le client est reconnu à partir de son numéro ou de son adresse avant toute réponse. » | K:41 | B | B | c3_06, c3_15 | Preuve en vrai | 0 / 0,5 |
| 46 | « Son contrat, son historique et ses interventions passées sont lus en même temps. » | K:42 | C | C | Historique des échanges : B | Contrat et interventions : un connecteur par logiciel métier, en lecture (API ou export du client) | 5 / 1 |
| 47 | « Chaque demande est classée par type avant d'entrer dans un circuit. » | K:43 | B | B | Sujet obligatoire (rediger.ts) | Preuve en vrai | 0 / 0,5 |
| 48 | « Chaque demande est aiguillée selon sa catégorie, d'après les règles posées à l'installation. » | K:44, K:179 | B | B | reput_router_sujet (c3_07), services (c3_12) | Preuve en vrai | 0 / 0,5 |
| 49 | « Une demande qui relève de deux services est orientée vers le premier concerné. » | K:45 | C | B | Sujet secondaire, second service prévenu (c3_16 ; pgTAP 19/19) | Preuve en vrai | 0 / 0,5 |
| 50 | « L'urgence est détectée sur le fond du message, pas sur la présence d'un mot. » | K:46 | B | B | Consigne et schéma ; urgence retenue de l'envoi automatique (c3_13) | Jeu d'évaluation sur des messages réels | 0 / 1 |
| 51 | « Une même demande reçue sur deux canaux est reconnue comme un seul dossier. » | K:47 | C | B | Rapprochement par contact connu (c3_07), par signature, ou proposé sur le même nom en 48 h (c3_15) ; tests | Preuve en vrai sur deux canaux | 0 / 0,5 |
| 52 | « La langue du client est identifiée dès le premier message. » | K:48 | B | B | Langue ISO rendue et contrôlée | Preuve en vrai | 0 / 0,5 |
| 53 | « La réponse est tirée de la base de connaissances construite avec vos équipes. » | K:55 | B | A | 22/10 : réponse sourcée sur deux fiches | — | 0 / 0 |
| 54 | « La base est versionnée : chaque règle porte sa date et son auteur. » | K:57 | B | B | c3_01 | — | 0 / 0,5 |
| 55 | « Une modification de tarif ou d'horaire s'applique à la réponse suivante. » | K:58 | B | B | Base relue à chaque préparation | — | 0 / 0,5 |
| 56 | « Le ton, la signature et les formules se règlent entité par entité. » | K:59 | C | B | Réglages par site, qui suivent l'organisation tant qu'on ne les règle pas (c3_17) ; test | Écran « Par site » branché sur main | 0 / 0,5 |
| 57 | « Les réponses se font en plusieurs langues, avec le même périmètre de contenu. » | K:60 | B | B | reglages.langues ; langue non couverte → transfert | — | 0 / 0,5 |
| 58 | « La mention d'une réponse automatisée figure dans les termes que vous choisissez. » | K:61 | B | B | = n° 25 | = n° 25 | 0 / 0 |
| 59 | « Chaque échange reste archivé, transféré ou non, et reste consultable. » | K:62 | B | A | 22/10 : journal complet des deux demandes, transférée ou non | — | 0 / 0 |
| 60 | « Les demandes de rendez-vous sont qualifiées, puis transmises au service concerné. » | K:69 | B | B | Sujet rendez_vous, routage | — | 0 / 0,5 |
| 61 | « Chaque demande est enregistrée avec son canal, son type et l'heure de son arrivée. » | K:70 | B | A | 22/10 : réceptions 1436 et 1437, canal, sujet, heure | — | 0 / 0 |
| 62 | « Un rappel part avant la date, sur le canal par lequel le client a écrit. » | K:71 | D | B | Tâche `reput-rdv-rappels`, rappel au canal de la demande (c3_21, test rejoué 26/10) | Un vrai rappel | 0 / 0,5 |
| 63 | « Le client replanifie ou annule par le même canal, sans appeler personne. » | K:72 | D | C | Replanifier, annuler : portes pour la personne qui traite (c3_21) | Reconnaître dans le message du client une demande de replanification ou d'annulation et proposer les créneaux suivants, validé par une personne | 1,5 / 0,5 |
| 64 | « La durée proposée dépend du type d'intervention demandé. » | K:73 | D | B | Types de rendez-vous avec leur durée (c3_21) | — | 0 / 0,5 |
| 65 | « Les ressources et les personnes indisponibles sont exclues des créneaux proposés. » | K:74 | D | C | Fermetures et rendez-vous confirmés du même planning exclus (c3_21) | Absences de personnes et ressources (véhicule, poste) par planning | 1 / 0,5 |
| 66 | « Un rendez-vous demandé hors périmètre est transmis à la personne qui peut le poser. » | K:75 | B | B | Transfert + routage | — | 0 / 0,5 |
| 67 | « Chaque type de demande porte un délai de traitement que vous fixez. » | K:82, K:185 | B | B | c3_06 | — | 0 / 0,5 |
| 68 | « Le délai dépassé fait remonter la demande au responsable du service. » | K:83 | B | B | c3_06 (test rejoué 26/10) | Un délai expiré chez un client | 0 / 1 |
| 69 | « Une urgence déclenche l'appel de l'astreinte, selon le tour de garde en cours. » | K:84 | D | B | = n° 8 ; règle « jamais hors horaires » par défaut pour un artisan seul (décision de Teo du 19/10) | = n° 8 | 0 / 0 |
| 70 | « Une réclamation est identifiée comme telle et sort du traitement courant. » | K:85, K:133 | B | B | Sujet protégé, jamais autorisable | — | 0 / 0,5 |
| 71 | « Un client en litige ouvert ne reçoit aucune réponse automatisée. » | K:86, K:125 | B | B | private.reput_en_litige → litiges CASHD (c3_06) | Ne voit que les litiges tenus dans CASHD | 0 / 1 |
| 72 | « La demande de parler à une personne est honorée sans discussion. » | K:87, K:157 | B | B | Sujet protégé « humain » ; le service est nommé (c3_09, c3_25) | — | 0 / 0,5 |
| 73 | « Le volume de demandes se lit par canal, par service et par heure de la journée. » | K:95 | B | B | Vues reput_indicateurs, reput_volumes_heure, reput_indicateurs_services (c3_12) | Brancher la vue par service à l'écran | 0 / 0,5 |
| 74 | « Le délai de première réponse est mesuré, demande par demande. » | K:96 | B | B | reput_indicateurs | — | 0 / 0,5 |
| 75 | « La part des demandes traitées sans intervention humaine est suivie dans le temps. » | K:97 | B | B | reput_indicateurs ; envoyées seules comptées sur l'envoi réel (c3_29) | — | 0 / 0,5 |
| 76 | « Les sujets qui reviennent sont remontés, et ils nourrissent la base de connaissances. » | K:98 | B | B | Point du matin, fiche proposée (c3_06, c3_08) | — | 0 / 0,5 |
| 77 | « Les avis obtenus après intervention sont comptés par service et par site. » | K:99 | C | C | Avis demandés et cliqués comptés par organisation (reput_avis_indicateurs) | Lire les avis réellement publiés (API Google Business Profile, accès à demander) et les compter par site | 3 / 1 |
| 78 | « Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe. » | K:100 | C | B | À la demande (CSV) ; à date fixe, hebdomadaire ou mensuel, par site (c3_19, c3_30, c3_32) ; tests | — | 0 / 0,5 |
| 79 | « …la réponse part dans la même langue… Si la langue n'est pas couverte, l'échange est transféré. » | K:114 | B | B | c3_07 | — | 0 / 0,5 |
| 80 | « Les deux messages sont reconnus comme un seul dossier. Le client reçoit une réponse, pas deux, sur le canal qu'il a utilisé en dernier. » | K:118 | C | C | Regroupement vu en vrai le 22/10 (deux courriels, une réponse) ; WhatsApp absent | La même demande arrivée par WhatsApp (= n° 12) | 0 / 0 |
| 81 | « Les deux demandes sont enregistrées avec leur heure d'arrivée, puis transmises au service qui tient le planning. C'est lui qui tranche, et le second client reçoit une proposition de remplacement. » | K:122 | C | B | Créneau pris entre-temps → les trois suivants proposés (reput_poser_rdv, c3_21, test rejoué 26/10) | — | 0 / 0,5 |
| 82 | « Le système ne l'invente pas. Il dit que le point sera vérifié, puis transfère… » | K:130 | B | B | Contrôle chiffre_non_source | — | 0 / 0,5 |
| 83 | « Le client reçoit un accusé, et le responsable du service est prévenu. » / « …la demande remonte immédiatement. » | K:134, K:138 | B | B | Réclamation protégée, alerte | — | 0 / 0,5 |
| 84 | « La pièce est conservée et rattachée au dossier. Le système demande la précision qui manque… » (photo seule) | K:142 | C | B | Précision déposée sans modèle quand il n'y a qu'une pièce (c3_20, c3_26) ; tests | — | 0 / 0,5 |
| 85 | « Le fil est repris là où il s'était arrêté, avec son historique. » | K:146 | B | B | c3_07, même question reconnue (c3_28) | — | 0 / 0,5 |
| 86 | « …routée vers le service compétent … et le client en est informé. » | K:150 | C | B | Service nommé dans le transfert (c3_09) et dans l'accusé (c3_18) ; tests | — | 0 / 0,5 |
| 87 | « La demande est traitée comme celle d'un prospect, sur le périmètre public de votre base. Aucune donnée de compte n'est communiquée. » | K:154 | B | B | Seules des fiches publiques vont au modèle | — | 0 / 0,5 |
| 88 | « Chaque société, site ou service a sa base de connaissances, ses horaires et sa signature. Une direction lit le consolidé, un responsable de site ne voit que le sien. » | K:173 | C | C | Réglages (signature, ton) par site (c3_17) ; indicateurs par site et service (c3_12) | Base de connaissances et horaires par site, et lecture limitée au site | 2 / 1 |
| 89 | « …une demande ne reste jamais sans destinataire. » | K:179 | B | B | Sujet sans équipe → tous les décideurs ; demande rendue « à traiter » après un refus sans reprise (c3_45) | — | 0 / 0,5 |
| 90 | « Le dépassement fait remonter le dossier, et le manquement se mesure… » | K:185 | B | B | c3_06 | — | 0 / 0,5 |
| 91 | « Chaque message reçu, chaque réponse envoyée et chaque transfert s'inscrivent dans un journal qui ne se modifie pas. » | K:191 | B | A | 22/10 : journal complet, de demande_recue à reponse_envoyee | — | 0 / 0 |
| 92 | « Le système se place derrière vos canaux actuels et écrit dans vos agendas. » | K:197 | C | C | = n° 12, 27 | = n° 27 | 0 / 0 |
| 93 | « Volume par canal, délai de première réponse, demandes transférées et sujets récurrents se lisent par site et en consolidé, avec un export daté. » | K:203 | C | B | Par site et service (c3_12), export daté (c3_19) ; tests | — | 0 / 0,5 |
| 94 | « Une entreprise française … relève du droit français. » | A:496 | T | T | Statut d'Omega | — | 0 / 0 |
| 95 | « Il lit le message dès qu'il arrive et répond dans la minute. » (texte réécrit le 1b4f378a ; le 06/10 : « Lit le message dès son arrivée et répond dans la minute. ») | accueil:708 | C | C | = n° 1, 3 | = n° 1 | 0 / 0 |
| 96 | Schéma « Qualification » ; entrées « WhatsApp », « Mail » | A:447-450 | C | C | Mail : A ; WhatsApp : = n° 12 | = n° 12 | 0 / 0 |
| 97 | « Personne ne répond en dehors des heures d'ouverture » (constat, pas promesse de REPUT) | A:306 | — | — | Hors décompte | — | — |
| 98 | « Vous ne changez ni vos numéros, ni vos habitudes » (titre d'étape, absent du relevé du 06/10) | A (étapes) | — | C | = n° 12 | = n° 12 | 0 / 0 |
| 99 | « Une urgence ne finit pas dans la file d'attente » (titre d'étape, absent du relevé du 06/10) | A (étapes) | — | B | Alerte critique, astreinte (c3_22), envoi interne urgent qui saute HORS_HEURES (c3_41a, c3_41) ; tests | = n° 8 | 0 / 0 |
| 100 | « La réponse part avant la réouverture » (titre d'étape, absent du relevé du 06/10) | A (étapes) | — | C | = n° 1 : la nuit, seul l'accusé part | = n° 1 | 0 / 0 |
| 101 | « L'avis se demande quand le client est content » (titre d'étape, absent du relevé du 06/10) | A (étapes) | — | B | = n° 9 | = n° 9 | 0 / 0 |
| 102 | « Les demandes reçues par e-mail et par WhatsApp (horaires, tarifs, disponibilités, prise de rendez-vous) obtiennent une réponse à toute heure, tirée de la base de connaissances validée par vos équipes et jamais inventée. Chaque client satisfait se voit ensuite demander un avis au moment où il est le plus enclin à le laisser. » | content:126 | — | C | = n° 1, 9, 12, 18 | = n° 1, 12, 18 | 0 / 0 |
| 103 | « Une demande reçue à 21 h reçoit sa réponse à 21 h, sur son canal. » | content:127 | — | C | = n° 1 | = n° 1 | 0 / 0 |
| 104 | Article garages : « Le système REPUT les reçoit dans une seule file, pose les bonnes questions (marque, modèle, immatriculation, symptôme, disponibilités pour déposer le véhicule), et transmet à l'atelier un dossier prêt à traiter. Il ne donne jamais un prix ni un délai : dès que c'est sérieux, c'est l'humain qui reprend. » | content:256 | — | C | Une seule file, transfert au service (c3_07, c3_09) ; la précision demandée n'existe que quand le message est vide (c3_20) | Questions de qualification par métier, posées tant que le dossier est incomplet (liste réglée à l'installation, test) ; « jamais un prix ni un délai » : sujets devis et délai rendus non autorisables pour ce métier (réglage existant à vérifier) | 1,5 / 0,5 |
| 105 | Article BTP : « Le système REPUT accueille les demandes de devis qui arrivent par mail et WhatsApp (nature des travaux, commune du chantier, délai, photos), et escalade immédiatement tout ce qui ressemble à une urgence. » | content:295 | — | C | Urgence : B (n° 8) ; mail : A ; WhatsApp : = n° 12 | Questions de qualification : = n° 104 | 0 / 0 |
| 106 | Article immobilier : « Le système REPUT rassemble les demandes entrantes (mail, WhatsApp), dans une seule file. Il répond immédiatement aux questions simples et pose les questions de qualification qui évitent les visites pour rien … Il ne s'engage jamais sur un prix, une disponibilité ou un rendez-vous … Plus rien n'attend vingt-quatre heures, et chaque conversation reste journalisée. » | content:326 | — | C | Journal : A (22/10) ; réponse : = n° 1 ; transfert avec résumé (c3_02) | = n° 1, 12, 104 | 0 / 0 |

## Écarts entre la page du 06/10 et la page du 26/10

- `lib/produits/accueil.ts`, `lib/produits/capacites/accueil.ts` et `app/offres/demandes-clients/page.tsx` n'ont pas
  changé depuis c0494b4 : toutes les phrases du relevé du 06/10 y sont toujours, mot pour mot (vérifié par script le
  26/10). Les lignes A:454-458 du 06/10 sont en fait A:456-459.
- `app/page.tsx` (1b4f378a) : la carte REPUT de l'accueil a été réécrite et a changé de lignes (n° 1 : accueil:706 ;
  n° 95 : accueil:708).
- Ajouts du 26/10 : quatre titres d'étapes de la page (n° 98 à 101) et quatre phrases de `lib/content.ts` (n° 102 à
  106), que le relevé du 06/10 ne citait pas.

## Totaux (26/10)

- **→B ≈ 31,5 j.** Le plus gros : agenda Google et Microsoft (5), connecteur d'un logiciel métier (5 par logiciel),
  réseaux sociaux (3), avis Google relus (3), décider depuis la notification (2), proposer le créneau dans la réponse
  (2), base et horaires par site (2), questions de qualification par métier (1,5), replanifier par le même canal
  (1,5), messagerie du site (1,5).
- **→A ≈ 47,5 j**, ligne à ligne ; la pose en production de REPUT suit le runbook commun d'A5 (non comptée ici).
- **Tiers et décisions de Teo** : réponse de nuit sous accord (décision du 22/10 à revoir) ; Meta (WhatsApp en
  réception, Messenger et Instagram) ; Twilio réel ; transcription UE ; IA en région UE (Bedrock) ; vérification
  Google (agenda, Business Profile) ; Microsoft Entra ; service humain du suivi téléphonique.
