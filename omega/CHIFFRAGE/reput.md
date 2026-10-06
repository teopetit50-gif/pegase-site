# Chiffrage REPUT — ce que promet le site, ce qui est construit (C3, 06/10/2026)

Lu sur `origin/main` c0494b4 (vitrine de 15 h 55), en lecture seule : `lib/produits/accueil.ts` (A),
`lib/produits/capacites/accueil.ts` (K), `app/offres/demandes-clients/page.tsx`, `app/offres/page.tsx`,
`app/page.tsx`. Aucun fichier du site public n'a été modifié.
États : **A** prouvé en vrai · **B** construit et testé sur la recette · **C** partiel · **D** pas construit ·
**T** dépend d'un tiers, d'un compte ou d'un achat de Teo. Jours = jours de travail d'un worker, « →B » depuis
l'état actuel, « →A » de B à prouvé en vrai.

## Synthèse

1. **Par état (96 promesses, la 97e est un constat)** : A 0 · B 48 · C 33 (dont 1 C/D) · D 11 · T 4. Rien n'est prouvé en vrai : aucune demande d'un vrai client n'a encore reçu de réponse (Edge déployée, 0 demande réelle, boîte du banc suspendue).
2. **Jours → B** : ≈ 44 j, dont 10 j pour le seul bloc rendez-vous / agenda (cinq promesses « créneau réservé », « s'écrit dans votre agenda »), 8 j pour les canaux d'A2 (chat, réseaux, appels transcrits), 5 j par logiciel métier à lire (contrat, interventions).
3. **Jours B → A** : ≈ 15 j au total ; ≈ 4 j pour le seul circuit mail + formulaire (le cœur), puis ½ à 1 j par fonction à faire tourner chez un vrai client.
4. **Tiers / achats** : WhatsApp Business (compte Meta vérifié, numéro, modèles ; messages ≈ 0,03-0,08 €/conversation), téléphonie d'astreinte (Twilio/OVH ≈ 1-5 €/mois + appels), Google/Microsoft OAuth pour l'agenda (vérification Google, gratuite mais plusieurs semaines), IA hébergée en UE (Bedrock eu-west : compte AWS, sinon la promesse « hébergé dans l'UE » est fausse pour le texte des messages), DNS du client pour envoyer sous son adresse, IA ≈ 0,01-0,02 €/réponse.
5. **Pour UN premier client réel** (mail + formulaire, réponses validées, accusé, avis Google) : clé IA posée (de préférence Bedrock UE), redirection de la boîte du client vers recu.omegaai.fr, domaine d'envoi (SPF/DKIM), 1 h d'entretien + saisie de sa base, puis une semaine de rodage — ≈ 4 j de travail + les accès du client. Tout le reste de la page (agenda, astreinte, WhatsApp) doit être retiré ou marqué « à venir » avant de le lui montrer.
6. **Avis honnête** : le cœur est solide et défendable (base versionnée, rien d'inventé côté chiffres, tout validé par défaut, accords par sujet, délais, escalade, litige, avis sans tri, journal) ; la page vend en revanche un **preneur de rendez-vous** et un **standard d'astreinte** qui n'existent pas, promet « réponse à 21 h » alors que, par défaut, la réponse attend votre validation, et dit « aucun logiciel de plus à ouvrir » alors qu'on valide dans l'espace Omega. Ce sont ces quatre phrases qu'il faut corriger avant toute vente.

## Contradictions internes de la page (à trancher par Teo, pas des jours de code)

- A:94 « elle ne dit rien que vous n'ayez validé » ⟂ A:177 « Vos équipes relisent l'échange le lendemain » (relecture après coup) ⟂ A:430 « tout vous est soumis avant envoi ». Ce qui est construit : validation **avant** envoi, sauf sujets autorisés d'avance.
- A:426 « La réservation s'écrit directement dans votre agenda, en temps réel » ⟂ K:122 « transmises au service qui tient le planning. C'est lui qui tranche ». Ce qui est construit : K:122 (transmission), pas A:426.
- A:85 / app/page.tsx:697 « réponse à 21 h » : vrai seulement sur un sujet autorisé d'avance ; sinon le client reçoit à 21 h un **accusé** (lui-même soumis à accord) et la réponse au moment de la validation.

## Tableau

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours (→B / →A) | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| 1 | « Une demande reçue à 21 h obtient sa réponse à 21 h » | A:85, app/page.tsx:697 | C | c3_02 prépare dans la minute (cron reput-synchro, Edge reput-reponse) ; c3_03 envoi seul si accord | Vrai seulement sur sujet autorisé ; reformuler ou assumer l'accord | 0 / 1 | IA ≈ 0,01-0,02 €/réponse |
| 2 | « …votre client reçoit sa réponse, et elle ne dit rien que vous n'ayez validé. » | A:94 | B | c3_02/c3_03 : dv par réponse, envoi adossé, garde politiques_reput_garde (62+47 tests) | Preuve en vrai | 0 / 1 | — |
| 3 | « < 1 min — C'est ce que votre client attend, le dimanche comme le 15 août. » | A:138 | C | Préparation < 1 min (cron 1 min) ; envoi < 1 min seulement si accord | idem #1 | 0 / 1 | — |
| 4 | « 0 — Réponse inventée : quand il ne sait pas, il transfère à vos équipes. » | A:143-145 | C | rediger.ts:126-188 : sources ⊂ base, chiffre non sourcé → hors base → transfert ; c3_02 hors base toujours relu | Un fait non chiffré inventé n'est attrapé que par le modèle + la relecture ; « 0 » ne se garantit pas, il se mesure | 1 (contrôle de citation) / 2 (relevé sur 100 cas réels) | — |
| 5 | « REPUT lit le message dès qu'il arrive, puis répond dans la minute à partir de la base… » | A:177 | C | idem #1 | idem #1 | 0 / 1 | — |
| 6 | « Vos équipes relisent l'échange le lendemain. » | A:177 | C | Relecture **avant** envoi construite ; « lendemain » contredit A:94 | Choix de texte (Teo) | 0 / 0 | — |
| 7 | « Chaque demande est d'abord qualifiée, puis elle suit le circuit que vous avez défini pour son type. » | A:185 | B | c3_02 sujet, c3_07 reput_type_file / reput_router_sujet (equipe) | Preuve en vrai | 0 / ½ | — |
| 8 | « Quand elle est urgente, le téléphone de l'astreinte sonne. » | A:185 | D | Urgence détectée → alerte module + transfert (c3_02) ; aucun appel | Tour de garde + appel sortant (Twilio/OVH) + accusé d'appel | 3 / 1 | T : compte téléphonie ≈ 1-5 €/mois + ≈ 0,05 €/appel |
| 9 | « La demande d'avis part dans les trois jours qui suivent le règlement, puis … relancée deux fois au maximum. La même personne n'est plus sollicitée avant six mois. » | A:193, A:434 | B | c3_05 (J+3, 2 relances, 183 j), c3_06 abonnement cashd.facture_reglee (31+27 tests) | Client sans CASHD : programmation à la main (reput_programmer_avis) ; preuve en vrai | 0 / 1 | Lien de la fiche Google du client |
| 10 | « L'installation demande une heure d'entretien, puis le branchement de vos canaux, et une semaine de rodage… » | A:215 | C | Mail/formulaire : redirection vers recu.omegaai.fr (A2) ; WhatsApp/agenda non | Procédure d'installation écrite + canaux #18 | ½ / 1 | Accès DNS / boîte du client |
| 11 | « Nous construisons ensemble la base de votre entreprise : tarifs, horaires, durées d'intervention, règles internes. Rien d'autre ne sera dit à un client. » | A:222 | B | c3_01 fiches versionnées, sources obligatoires, écran BaseConnaissances (66 tests) | Preuve en vrai | 0 / 1 | — |
| 12 | « Nous connectons WhatsApp Business, votre messagerie et votre agenda, si bien que vos clients continuent d'écrire au même numéro qu'hier. » | A:228 | C | Messagerie : B (A2). WhatsApp : réception A2 seulement si compte Meta, envoi soumis au consentement (verrou). Agenda : D | WhatsApp de bout en bout (fenêtre 24 h, modèles) 4 j ; agenda cf. #30 | 4 (+10 agenda) / 2 | T : Meta Business vérifié, numéro, modèles ≈ 0,03-0,08 €/conversation |
| 13 | « Vos équipes reçoivent copie de chaque réponse la première semaine, et nous corrigeons sur des cas réels. » | A:234 | C | Mieux qu'une copie : tout est validé avant envoi par défaut ; reput_corriger (v+1) ; c3_08 fiche proposée | Copie mail optionnelle si Teo tient au mot | ½ / ½ | — |
| 14 | « REPUT prend ensuite son rythme sur les postes que vous ouvrez. » | A:234 | B | c3_03 accords par sujet (un an, révocables), écran SujetsAutorises | Preuve en vrai | 0 / ½ | — |
| 15 | « Vous n'avez aucun logiciel de plus à ouvrir » | A:263 | C | Faux aujourd'hui : on valide dans l'espace Omega (« À valider ») | Valider depuis le mail/WhatsApp de notification (lien signé un clic) | 3 / 1 | — |
| 16 | « REPUT se place derrière les canaux que vous utilisez déjà, puis répond à partir de votre base. » | A:265 | C | Mail/formulaire oui ; WhatsApp T | cf. #12 | (compté #12) | T Meta |
| 17 | Tuiles « WhatsApp Business », « Fiche Google Business », « Google Agenda », « Gmail / Outlook » | A:272-275 | C | Gmail/Outlook : redirection B ; Fiche Google : lien d'avis B ; WhatsApp T ; Agenda D | cf. #12, #30 | (compté) | T Meta, OAuth Google/Microsoft |
| 18 | « Créneau réservé, rappel la veille » | A:317, A:393 | D | Rien ne réserve ni ne rappelle | cf. #30-#35 | (compté #30) | T OAuth agenda |
| 19 | « Demande qualifiée, transmise au commercial » | A:326 | B | c3_07 routage par sujet vers équipe | Preuve en vrai | 0 / ½ | — |
| 20 | « Répondu depuis la base construite avec vous » | A:335 | B | c3_02 + rediger.ts | Preuve en vrai | 0 / ½ | — |
| 21 | « Transféré : la réponse n'est pas dans sa base » | A:344 | B | c3_02 hors base → reput.transferer | Preuve en vrai | 0 / ½ | — |
| 22 | « Répondu à 6 h 31 » | A:369 | C | idem #1 (accord) | — | 0 / ½ | — |
| 23 | « Rendez-vous posé samedi 9 h 30 » | A:377 | D | — | cf. #30 | (compté) | T |
| 24 | « Transféré : l'astreinte est appelée » | A:385 | C | Transfert B ; appel D | cf. #8 | (compté #8) | T téléphonie |
| 25 | « La mention figure dans la première réponse, dans les termes que vous choisissez à l'installation. » | A:418 | B | c3_01 reglages.mention_automatisee, assemblée c3_02:171 | Preuve en vrai | 0 / ½ | — |
| 26 | « REPUT ne peut répondre qu'à partir de la base … il ne formule pas d'hypothèse : il transfère … avec la fiche de son escalade. » | A:422, K:21, K:56, K:88 | B | rediger.ts consigne règles 1-2 + contrôles ; dv reput.transferer avec raison | Voir #4 pour la limite | 0 / 1 | — |
| 27 | « La réservation s'écrit directement dans votre agenda, en temps réel. Le second créneau n'apparaît plus comme disponible, et le client se voit proposer les suivants. » | A:426 | D | — | cf. #30 | (compté) | T OAuth agenda |
| 28 | « C'est vous qui fixez la frontière. Les premières semaines, tout vous est soumis avant envoi. Ensuite, vous décidez poste par poste… Chaque échange … reste archivé et consultable. » | A:430 | B | c3_03 accords, journal_opposable, écran EcranReput | Preuve en vrai | 0 / ½ | — |
| 29 | « Les messages sont écrits d'avance et identiques pour tout le monde : aucun tri des mécontents. » | A:434 | B | c3_05 texte_avis unique par entité ; aucune condition sur la satisfaction (le litige n'exclut que les réponses automatisées, pas l'avis) | Preuve en vrai | 0 / ½ | — |
| 30 | « Oui, l'atelier reçoit samedi de 8 h à 13 h… Je peux vous réserver samedi 9 h 30 ? » / « C'est réservé… Vous recevrez un rappel vendredi soir. » / « Rendez-vous créé dans l'agenda du service · client confirmé » | A:529-539 | D | Horaires depuis la base : B ; proposition de créneau, réservation, rappel : rien | Connecteur agenda (Google + Microsoft), lecture des disponibilités, pose du rendez-vous adossée à validation, durées par type, ressources indisponibles, rappel J-1, replanifier/annuler — bloc complet | 10 / 3 | T : app OAuth Google (vérification, scope sensible) + Microsoft Entra |
| 31 | Circuit « Devis — chiffré » | A:455 | C | Chiffré seulement si les prix sont en base, sinon transféré | Rien si on accepte « chiffré depuis votre grille » | 0 / ½ | — |
| 32 | Circuits « Urgence — transféré », « Réclamation — transféré », « Renseignement — répondu » | A:454-458 | B | Sujets protégés c3_01, transfert c3_02 | Preuve en vrai | 0 / ½ | — |
| 33 | « Hébergées dans l'Union européenne » / « rien n'y est jamais revendu » | A:500-502 | T | Base Supabase : région à confirmer (hors C3) ; le texte des messages part à l'IA : API Anthropic directe = hors UE | Poser Bedrock en région UE (le client _partage le gère) | ½ / ½ | T : compte AWS Bedrock eu-west |
| 34 | « Les réponses emploient le vocabulaire de votre métier, et le suivi se fait au téléphone. » | A:508 | C | Vocabulaire : depuis la base ; suivi téléphonique = Teo | Engagement humain de Teo | 0 / 0 | T : temps de Teo |
| 35 | « Réponse à toute heure », « Prise de rendez-vous » | app/offres/page.tsx:397 | C/D | Réponse : cf. #1 ; rendez-vous : cf. #30 | — | (compté) | — |
| 36 | « Les demandes reçues par mail et WhatsApp obtiennent une réponse à toute heure, tirée de ce que votre entreprise sait vraiment, jamais inventée. » | demandes-clients/page.tsx:72 | C | Mail B ; WhatsApp T ; « toute heure » cf. #1 | cf. #12 | (compté) | T Meta |
| 37 | « Les messages arrivent par votre messagerie et par le formulaire de votre site. » | K:27 | B | A2 receptions (mail, formulaire) + abonnement reception.nouvelle → reput.preparer | Preuve en vrai | 0 / 1 | DNS / redirection client |
| 38 | « Le formulaire de votre site entre dans le même circuit que les autres canaux. » | K:28 | B | idem | Snippet de formulaire installé chez le client | 0 / ½ | — |
| 39 | « La messagerie instantanée du site est tenue aux mêmes règles que le reste. » | K:29 | D | Canal absent d'A2 | Widget de chat + canal A2 (réponse dans la fenêtre ouverte) | 3 / 1 | — |
| 40 | « Les messages reçus sur les réseaux sociaux rejoignent la même file. » | K:30 | T | Canal absent | Meta Graph (Messenger/Instagram) côté A2 | 3 / 1 | T : app Meta en revue (semaines) |
| 41 | « Un appel non décroché est transcrit, puis traité comme une demande écrite. » | K:31 | T | Canal absent | Renvoi d'appel + messagerie vocale + transcription → réception A2 | 2 / 1 | T : opérateur (≈ 1-5 €/mois) + transcription ≈ 0,01 €/min |
| 42 | « Un accusé de réception part dans la minute, sous votre signature. » | K:32 | B | c3_05 reput.accuser, signature des réglages ; part seul seulement sous accord « accusés » | Preuve en vrai | 0 / ½ | — |
| 43 | « Les pièces jointes sont conservées et rattachées à la demande. » | K:33 | C | A2 compte les pièces (receptions.pieces), le modèle sait qu'il y en a ; conservation/affichage dans l'écran REPUT non vérifiés par C3 | Afficher et lier les pièces dans la fiche de la demande | 1 / ½ | Stockage Supabase |
| 44 | « Vos horaires d'ouverture sont cités dans les réponses, tels que vous les avez écrits. » | K:34 | B | Fiches horaires, contrôle des chiffres (8 h 30 → 8, 30) | Preuve en vrai | 0 / ½ | — |
| 45 | « Le client est reconnu à partir de son numéro ou de son adresse avant toute réponse. » | K:41 | B | c3_06 de_empreinte, reput_historique (27 tests) | Preuve en vrai | 0 / ½ | — |
| 46 | « Son contrat, son historique et ses interventions passées sont lus en même temps. » | K:42 | C | Historique des échanges B ; contrat et interventions : aucun logiciel métier lu | Connecteur par logiciel métier (lecture seule) | 5 par logiciel / 1 | T : API/export du logiciel du client |
| 47 | « Chaque demande est classée par type avant d'entrer dans un circuit. » | K:43 | B | Sujet obligatoire, inconnu → autre (rediger.ts:131-135) | Preuve en vrai | 0 / ½ | — |
| 48 | « Chaque demande est aiguillée selon sa catégorie, d'après les règles posées à l'installation. » | K:44, K:179 | B | c3_07 reput_router_sujet + regles_validation (20 tests) | Preuve en vrai | 0 / ½ | — |
| 49 | « Une demande qui relève de deux services est orientée vers le premier concerné. » | K:45 | C | Un seul sujet par demande, donc un seul service — pas de détection du second | Sujet secondaire + mention au second service | 1 / ½ | — |
| 50 | « L'urgence est détectée sur le fond du message, pas sur la présence d'un mot. » | K:46 | B | Consigne et schéma (rediger.ts:44) ; testé avec doublures seulement | Jeu d'évaluation sur messages réels | 0 / 1 | — |
| 51 | « Une même demande reçue sur deux canaux est reconnue comme un seul dossier. » | K:47 | C | c3_07 cles_contact + regroupement : vrai quand mail et téléphone du contact sont connus ensemble | Rapprochement d'un inconnu par signature/nom | 1 / ½ | — |
| 52 | « La langue du client est identifiée dès le premier message. » | K:48 | B | langue ISO rendue et contrôlée (rediger.ts:136-140) | Preuve en vrai | 0 / ½ | — |
| 53 | « La réponse est tirée de la base de connaissances construite avec vos équipes. » | K:55 | B | c3_01 + c3_02 | Preuve en vrai | 0 / ½ | — |
| 54 | « La base est versionnée : chaque règle porte sa date et son auteur. » | K:57 | B | c3_01 reput_connaissances versionnées, auteur, validité | Preuve en vrai | 0 / ½ | — |
| 55 | « Une modification de tarif ou d'horaire s'applique à la réponse suivante. » | K:58 | B | Base relue à chaque préparation (reput_commencer) | Preuve en vrai | 0 / ½ | — |
| 56 | « Le ton, la signature et les formules se règlent entité par entité. » | K:59 | C | Par organisation cliente (reput_reglages) ; pas par site/service | Réglages par entité (cf. #85) | (compté #85) | — |
| 57 | « Les réponses se font en plusieurs langues, avec le même périmètre de contenu. » | K:60 | B | reglages.langues ; langue non couverte → transfert (c3_07:314) | Preuve en vrai | 0 / ½ | — |
| 58 | « La mention d'une réponse automatisée figure dans les termes que vous choisissez. » | K:61 | B | cf. #25 | — | 0 / ½ | — |
| 59 | « Chaque échange reste archivé, transféré ou non, et reste consultable. » | K:62 | B | journal_opposable, reput_historique, écran | Preuve en vrai | 0 / ½ | — |
| 60 | « Les demandes de rendez-vous sont qualifiées, puis transmises au service concerné. » | K:69 | B | Sujet rendez_vous (c3_01:194) + routage c3_07 | Preuve en vrai | 0 / ½ | — |
| 61 | « Chaque demande est enregistrée avec son canal, son type et l'heure de son arrivée. » | K:70 | B | reput_demandes (canal, sujet, recu_le) | — | 0 / ½ | — |
| 62 | « Un rappel part avant la date, sur le canal par lequel le client a écrit. » | K:71 | D | — | Dans le bloc #30 | (compté) | — |
| 63 | « Le client replanifie ou annule par le même canal, sans appeler personne. » | K:72 | D | — | Dans le bloc #30 | (compté) | — |
| 64 | « La durée proposée dépend du type d'intervention demandé. » | K:73 | D | La base peut citer une durée ; rien ne la pose dans un agenda | Dans le bloc #30 | (compté) | — |
| 65 | « Les ressources et les personnes indisponibles sont exclues des créneaux proposés. » | K:74 | D | — | Dans le bloc #30 | (compté) | — |
| 66 | « Un rendez-vous demandé hors périmètre est transmis à la personne qui peut le poser. » | K:75 | B | Transfert + routage | — | 0 / ½ | — |
| 67 | « Chaque type de demande porte un délai de traitement que vous fixez. » | K:82, K:185 | B | c3_06 delai_heures, reput_fixer_delai, écran | — | 0 / ½ | — |
| 68 | « Le délai dépassé fait remonter la demande au responsable du service. » | K:83 | B | c3_06 reput_escalader | Preuve en vrai (le délai doit expirer chez un client) | 0 / 1 | — |
| 69 | « Une urgence déclenche l'appel de l'astreinte, selon le tour de garde en cours. » | K:84 | D | cf. #8 | Tour de garde + appel | (compté #8) | T téléphonie |
| 70 | « Une réclamation est identifiée comme telle et sort du traitement courant. » | K:85, K:133 | B | Sujet protégé, jamais autorisable, alerte | — | 0 / ½ | — |
| 71 | « Un client en litige ouvert ne reçoit aucune réponse automatisée. » | K:86, K:125 | B | c3_06 private.reput_en_litige → cashd_contact_en_litige (C2 8b8fbb4) | Ne connaît que les litiges tenus dans CASHD | 0 / 1 | — |
| 72 | « La demande de parler à une personne est honorée sans discussion. » | K:87, K:157 | B | Sujet protégé « humain » | « le client sait à qui il parle désormais » : nom du repreneur non annoncé (C) | 1 / ½ | — |
| 73 | « Le volume de demandes se lit par canal, par service et par heure de la journée. » | K:95 | B | Vues reput_indicateurs, reput_volumes_heure | — | 0 / ½ | — |
| 74 | « Le délai de première réponse est mesuré, demande par demande. » | K:96 | B | reput_indicateurs | — | 0 / ½ | — |
| 75 | « La part des demandes traitées sans intervention humaine est suivie dans le temps. » | K:97 | B | reput_indicateurs (envoyées seules / mois) | — | 0 / ½ | — |
| 76 | « Les sujets qui reviennent sont remontés, et ils nourrissent la base de connaissances. » | K:98 | B | c3_06 sujets récurrents au point du matin ; c3_08 fiche proposée (11 tests) | — | 0 / ½ | — |
| 77 | « Les avis obtenus après intervention sont comptés par service et par site. » | K:99 | C | reput_avis_indicateurs par organisation ; pas de « site » ; les avis obtenus sur Google ne sont pas relus (seulement demandés/cliqués) | Lecture des avis Google (API Business Profile) + entité site | 3 / 1 | T : accès API Google Business Profile (demande d'accès) |
| 78 | « Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe. » | K:100 | C | À la demande : export.ts (CSV) ; à date fixe : non (reporté par le coordinateur) | Envoi programmé | 1 / ½ | — |
| 79 | « …la réponse part dans la même langue… Si la langue n'est pas couverte, l'échange est transféré. » | K:114 | B | c3_07:314 | — | 0 / ½ | — |
| 80 | « Les deux messages sont reconnus comme un seul dossier. Le client reçoit une réponse, pas deux, sur le canal qu'il a utilisé en dernier. » | K:118 | C | Regroupement B (c3_07) ; WhatsApp T | cf. #12, #51 | (compté) | T Meta |
| 81 | « Les deux demandes sont enregistrées… transmises au service qui tient le planning. C'est lui qui tranche, et le second client reçoit une proposition de remplacement. » | K:122 | C | Enregistrement + transmission B ; proposition de remplacement : la personne l'écrit | — (contredit A:426) | 0 / ½ | — |
| 82 | « Le système ne l'invente pas. Il dit que le point sera vérifié, puis transfère… » | K:130 | B | Contrôle chiffre_non_source (rediger.ts:156-171), Deno 12/12 | — | 0 / ½ | — |
| 83 | « Le client reçoit un accusé, et le responsable du service est prévenu. » (réclamation) / « …la demande remonte immédiatement. » (menace de partir) | K:134, K:138 | B | Réclamation = sujet protégé, alerte lever_alerte_module ; consigne règle 5 | — | 0 / ½ | — |
| 84 | « La pièce est conservée et rattachée au dossier. Le système demande la précision qui manque… » (photo seule) | K:142 | C | Le modèle ne voit pas l'image ; il transfère ou demande — non garanti | Règle : corps vide + pièce → message de précision type | 1 / ½ | — |
| 85 | « Le fil est repris là où il s'était arrêté, avec son historique. » | K:146 | B | c3_07 dossier_id, reput_precedents, en_reponse_a | — | 0 / ½ | — |
| 86 | « …routée vers le service compétent … et le client en est informé. » | K:150 | C | Routage B ; information du client non écrite | Phrase de transfert dans l'accusé | ½ / ½ | — |
| 87 | « La demande est traitée comme celle d'un prospect, sur le périmètre public de votre base. Aucune donnée de compte n'est communiquée. » | K:154 | B | La base ne contient que des fiches publiques ; aucune donnée de compte n'est donnée au modèle | — | 0 / ½ | — |
| 88 | « Chaque société, site ou service a sa base de connaissances, ses horaires et sa signature. Une direction lit le consolidé, un responsable de site ne voit que le sien. » | K:173 | C | Par organisation cliente ; équipes = services pour la validation ; pas de base ni de vue par site | Entité « site » : base, réglages, périmètre de lecture, consolidé | 4 / 1 | — |
| 89 | « …une demande ne reste jamais sans destinataire. » | K:179 | B | Sujet sans équipe → tous les décideurs | — | 0 / ½ | — |
| 90 | « Le dépassement fait remonter le dossier, et le manquement se mesure… » | K:185 | B | c3_06 escalade + indicateurs | — | 0 / ½ | — |
| 91 | « Chaque message reçu, chaque réponse envoyée et chaque transfert s'inscrivent dans un journal qui ne se modifie pas. » | K:191 | B | private.journaliser_module → journal_opposable (socle) | — | 0 / ½ | — |
| 92 | « Le système se place derrière vos canaux actuels et écrit dans vos agendas. » | K:197 | C | Canaux mail B ; agendas D | cf. #30 | (compté) | T OAuth |
| 93 | « Volume par canal, délai de première réponse, demandes transférées et sujets récurrents se lisent par site et en consolidé, avec un export daté. » | K:203 | C | En consolidé B ; par site non (#88) ; export daté à la demande | cf. #78, #88 | (compté) | — |
| 94 | « Une entreprise française … relève du droit français. » | A:496 | T | Hors code (statut de Teo) | — | 0 / 0 | T |
| 95 | « Lit le message dès son arrivée et répond dans la minute. » | app/page.tsx:699 | C | cf. #1 | — | (compté) | — |
| 96 | Schéma « Qualification » / entrées « WhatsApp », « Mail » | A:447-450 | C | Mail B ; WhatsApp T | cf. #12 | (compté) | T Meta |
| 97 | « Personne ne répond en dehors des heures d'ouverture » (constat, pas promesse de REPUT) | A:306 | — | Hors décompte | — | — | — |

## Détail des jours → B (≈ 44 j)

Agenda / rendez-vous 10 · WhatsApp de bout en bout 4 · chat du site 3 · réseaux sociaux 3 · appels transcrits 2 ·
astreinte 3 · valider sans ouvrir l'espace 3 · entité « site » 4 · lecture des avis Google 3 · un logiciel métier 5 ·
pièces jointes + photo seule 2 · deux services, deux canaux, client informé, nom du repreneur 3½ · export programmé 1 ·
copie première semaine ½ · contrôle de citation 1 · IA en UE ½.

Les canaux (chat, réseaux, appels, WhatsApp en réception) relèvent d'A2 ; les jours sont comptés ici parce que la page REPUT les promet.
