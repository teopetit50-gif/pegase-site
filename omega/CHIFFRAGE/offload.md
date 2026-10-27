# OFFLOAD — audit des promesses du site, ligne par ligne (26/10/2026)

Audit refait le 26/10/2026, entre 18 h 40 et 19 h 10 Z, en lecture seule : aucun code produit touché, aucun fichier du
site modifié. Il remplace le chiffrage du 06/10 (C4, `5cbbc113`, lisible dans l'historique git) ; la colonne « 06/10 »
en garde l'état et sa numérotation.

Sources lues :
- textes du site sur `origin/main` `de17d8c9` : `lib/produits/reprise.ts` (R), `lib/produits/capacites/reprise.ts` (K)
  et `app/offres/nouvelles-affaires/page.tsx` (P), inchangés depuis le 27/09 (renommage RELOAD → OFFLOAD), donc les
  numéros de ligne du 06/10 tiennent ; `app/page.tsx` (réécrit le 21/10), `app/offres/page.tsx` et `lib/content.ts`,
  qui portent les lignes N1 à N9, absentes du relevé du 06/10 ;
- construction : `origin/worker-c4` `e8490963` (migrations et tests c4_01 → c4_38) et `omega/NOTES-C4.md` de cette
  branche ; fin de `omega/NOTES-COORDINATEUR.md` ; rapport du testeur des modules du 26/10 (TMOD-06, TMOD-07) ;
- recette `omega-recette` (`ygwbgpowzlbdaajlsqkn`), en lecture : `supabase_migrations.schema_migrations`,
  fonctions `tests.test_c4_*`, crons, et les tables `envois`, `messageries`, `expediteurs`, `offload_comptes`.

## Mise à jour du 27/10/2026 (C4, branche `offload-lacunes`)

Quatre lacunes construites, posées sur la recette par `apply_migration` (lignes `c4_41` à `c4_44` dans
`schema_migrations`) et prouvées par leur test, rouge avant la pose et vert après. La suite `^test_c4_`, rejouée par
morceaux le 27/10 entre 06 h 05 et 06 h 30 Z, donne 66 fonctions vertes sur 67 (581 assertions), aucune rouge.
`test_c4_09_arretes` dépasse toujours la minute de l'outil.
- **Point du matin et validations par courriel** (ligne 39, reste **C**) : chaque message à valider arrive dans le
  courriel du matin, avec son destinataire, son objet, le début de son texte et le lien qui ouvre sa demande
  (c4_41 ✔ : envoi parti au gérant en mode essai). La décision, elle, se prend dans l'espace, connecté : un lien qui
  déciderait sans connexion ouvrirait la porte à quiconque lit la boîte. « Vous ne changez pas d'outil » reste donc
  vrai à moitié.
- **Sortie de l'organisation** (ligne 58, **B**) : `offload_sortie` arrête OFFLOAD, annule ce qui attendait, restitue
  tout en JSON et en CSV avec l'empreinte de l'export ; l'effacement par la porte du socle ne laisse aucune ligne
  OFFLOAD (c4_42 ✔, sur une organisation créée pour le test).
- **Vocabulaire par secteur** (ligne 55, **B**) : six secteurs plus le texte général, réglés ou déduits de
  l'organisation (c4_43 ✔).
- **Prospects qui n'ont pas abouti** (ligne N9, **B**) : reprise des contacts sans achat, à partir du dernier échange,
  à la cadence de la vague, toujours relue, jamais sans accord enregistré (c4_44 ✔).
- **« Un message par trimestre »** (17, 40, N5, N7, **B**) : c4_40 ✔ du 27/10 a éteint la relance écrite par défaut.
  Par conséquence, le catalogue K10 et K12 (« un second message », « deux messages en tout ») passe en **C**.

## En tête

### Décompte

| | A | B | C | D | T | Total | Hors décompte |
|---|---|---|---|---|---|---|---|
| 06/10 (recompté ligne à ligne dans le fichier du 06/10) | 0 | 85 | 23 | 10 | 3 | 121 | 4 (3, 27, 44, 54) |
| 26/10 | 0 | 109 | 16 | 1 | 3 | 129 | 5 (+ 52) |
| **27/10** | **0** | **114** | **11** | **1** | **3** | **129** | 5 (+ 52) |

**Écart avec les chiffres transmis.** La consigne citait « B 79, C 17, T 3 » pour le 06/10. Ces chiffres ne se
retrouvent ni dans le fichier du 06/10 ni dans `SYNTHESE.md`, qui donne 0 / 41 / 4 / 0 pour le seul catalogue de
45 lignes. Je suis donc reparti du fichier, ligne à ligne.

**Lignes ajoutées et retirées.** Neuf lignes ont été ajoutées (N1 à N9 : accueil, /offres, articles). La ligne 52
sort du décompte : « mardi 9 h » n'est écrit que dans un commentaire de code (R:35) et dans une tuile qui n'est pas
rendue (R:256). Le mardi de la FAQ reste compté, à la ligne 51.

**Ce qui bouge.** Dix-neuf lignes passent de C ou D à B, toutes sur un test rejoué vert le 26/10 : 19, 21, 23, 25,
34, 35, 41, 46, 48, 49, 51, 63, 64, 65, 66, 69, K6, K11, K38. Deux passent de D à C : 22 et 58. Restent :
- **en D**, une seule ligne : 79, « y réécrit l'état de chaque compte » dans le CRM ;
- **en A**, aucune ligne.

### Les 5 manques les plus importants pour vendre OFFLOAD

1. **Aucun message n'est jamais parti en vrai.** Les envois OFFLOAD de la recette sont tous restés sur place :
   7 « à valider » et 2 « annulés » en essai, et 9 en mode réel « bloqués » le 21/10 (TOFFLOAD-01, corrigé par
   c4_23). Aucun `envoye_le` n'est renseigné. Côté clients, il n'y a que le banc (20 comptes) et un client de charge
   (9 898 comptes fictifs). Il faut un client pilote et ses vrais exports : ~5 j de travail, plus 2 à 3 semaines
   d'observation.
2. **« Par courriel, depuis votre adresse » (18, 38, K15).** La branche Gmail est construite et testée : dépôt en
   brouillon ou envoi selon les portées (c4_22 ✔), et une boîte Gmail de test est branchée au socle sur le banc.
   Mais Microsoft 365 n'existe pas, la vérification d'application de Google et de Microsoft n'est pas faite (T), et
   rien n'est parti depuis une vraie boîte. Il faut 2 j côté A2, plus la vérification (plusieurs semaines).
3. **« OFFLOAD lit les deux, donc vous ne déployez rien » / « y réécrit l'état de chaque compte » (7, 8, 29, 79).**
   Tout passe par un **export déposé** : aucun CRM, ERP, DMS ni Sheets n'est lu en direct, et rien n'est réécrit dans
   un CRM, ce qui contredit aussi la ligne 61. Il faut soit 5 j par connecteur (plus l'accès du client, T), soit
   reformuler la page (0 j).
4. **« Un message par trimestre au plus » est de nouveau contredit (17, 40, N5, N7).** Le 17/10, Teo a tranché pour
   « un message par trimestre » (c4_16, relance écrite éteinte). Le 21/10, le bureau a rallumé la relance écrite par
   défaut (c4_29, sur délégation de Teo) : un cycle par trimestre compte donc **deux** messages, comme le dit le
   catalogue (K12). La phrase est fausse à quatre endroits du site, dont le bloc /offres. Il faut 0 j : éteindre la
   relance par défaut ou écrire « une séquence par trimestre ».
5. **« Vous dictez les règles en français … une phrase suffit » (22).** Les règles sont lues sans modèle de langue,
   par familles : interdits, montants, tutoiement, longueur, formule, signature, exclusions, litige, remplacements et
   ton (c4_10 ✔, c4_21 ✔). Une phrase hors de ces familles est dite « non comprise » et n'est pas appliquée. Il faut
   ~3 j pour une rédaction sous règles par un modèle de langue, avec contrôle du message produit, ou bien reformuler.

### Reste à construire (→ B) au 26/10

Environ **9,5 j** hors connecteurs :
- Microsoft 365 : 2 j ;
- règles en phrase libre : 3 j ;
- point du matin et validations par courriel : 1 j ;
- vocabulaire par secteur : 1,5 j ;
- sortie de l'organisation : 0,5 j ;
- relance des prospects sans achat : 1,5 j.

S'y ajoutent **5 j par connecteur direct** (CRM, ERP, DMS, Sheets), plus l'accès du client (T). Le 06/10, ce reste
était de 23 j. Le passage en A est inchangé : ~5 j et 2 à 3 semaines de calendrier.

### Hypothèses prises seul (Teo non consulté, comme demandé)

- **Recette rejouée.** Les tests marqués ✔ ont été rejoués par moi le 26/10, entre 18 h 56 et 19 h 03 Z
  (`runtests`, chaque test annulé en fin de transaction : rien n'est resté écrit). Le résultat :
  - verts : c4_01 à c4_05, c4_07, c4_08, c4_09_pilotage, c4_10 (cinq tests), c4_11 à c4_19, c4_21 à c4_29 et c4_31 à
    c4_38 ;
  - **aucun rouge** ;
  - non rejoué : `test_c4_09_arretes`, qui dépasse la minute de l'outil à cause du client de charge (C4 l'a noté le
    25/10).
- **Lots posés sans inscription.** c4_14, c4_15, c4_28 et c4_30 sont posés sans figurer sous leur nom dans
  `schema_migrations`. Leurs tests existent sur la recette (c4_30 n'en a pas en propre) et passent : je les tiens pour
  posés.
- **Le défaut prime.** Une ligne est jugée sur le **défaut** du produit. Un réglage qui la rend vraie
  (`relance_ecrite`, `vague_jour`) est noté dans la preuve, mais un défaut contraire laisse la ligne en C.
- **La lettre prime.** Les phrases dont la lettre dépasse ce qui est construit restent en C, même si C4 les tient pour
  prouvées : 22 (« une phrase suffit ») et N9 (« la base dormante d'une agence » : un contact sans achat est présenté à
  part, il n'est pas relancé).
- **`atteste: true` à tort.** `lib/produits/capacites/reprise.ts:62` (K15, la boîte de l'entreprise) porte encore
  `atteste: true` alors que la ligne est C. Les lignes 58 (K11) et 105 (K38) sont désormais justes.

Légende : **A** prouvé en vrai · **B** construit et testé sur la recette, test vert cité · **C** partiel · **D** pas
construit · **T** attend un tiers · — hors décompte. Tests : `cNN_x` = `test_c4_NN_x`. ✔ = rejoué vert le 26/10 ;
non marqué = vert d'après les notes C4 du 25/10 et du 26/10 (suite `^test_c4_` 60/61, 534 assertions). « j → B » :
jours pour passer en B.

## Page, héros, bandeau, fonctionnalités

| # | Promesse (texte exact) | Où | 06/10 | 26/10 | Preuve (26/10) | Ce qui manque | j → B |
|---|---|---|---|---|---|---|---|
| 1 | « Votre fichier client relu chaque matin : les comptes qui n'ont plus commandé, les entretiens redevenus dus et les affaires restées en plan. » | P:57 | B | B | c4_02 ✔, c4_07 ✔, c4_08 ✔ ; cron `offload-detection` (04 h 41 UTC, actif) | « relu » = le dernier export déposé | 0 |
| 2 | « La relance est rédigée, vos équipes la valident. » | P:57 | B | B | c4_03_message ✔ ; règles appliquées (c4_10 ✔, c4_21 ✔) ; validation (c4_18 ✔) | — | 0 |
| 3 | « Votre base clients n'est jamais relue. » (titre) | R:98 | — | — | constat | — | — |
| 4 | « Un compte qui commandait deux fois par an cesse de commander, et le service s'en aperçoit à la clôture » | R:105 | B | B | c4_02 ✔ | — | 0 |
| 5 | « La pièce commandée pour lui dort encore au magasin. » | R:105 | B | B | c4_08 ✔ | — | 0 |
| 6 | « OFFLOAD relit votre base clients chaque matin et vous dit à qui écrire. » | R:105 | B | B | cron nuit + point du matin (c4_03_point_matin ✔) | relit le dernier export | 0 |
| 7 | « Votre historique de ventes vit dans un CRM, un ERP ou un tableur, et vos clients écrivent à votre messagerie. OFFLOAD lit les deux, donc vous ne déployez rien. » | R:129 | C | C | ventes : export déposé (c4_01 ✔) ; messagerie : relève des réponses Gmail par le socle (c4_22 ✔, boîte de test du banc) | lecture directe du CRM ou de l'ERP (connecteur) ; Outlook ; ou bien reformuler : « OFFLOAD lit leurs exports et les réponses » | 5 / connecteur (T) ou 0 |
| 8 | Bandeau d'outils « Gmail, Outlook, Sheets, Excel, CSV » | R:132 | C | C | CSV, Excel : B ; Gmail : branche du socle (c4_22 ✔) | Outlook / Microsoft 365 (A2) ; Sheets en direct | 2 (A2) |
| 9 | « OFFLOAD y cherche le compte qui n'a plus commandé, l'entretien redevenu dû et l'affaire restée en plan. » | R:157 | B | B | c4_02 ✔, c4_07 ✔, c4_08 ✔ | — | 0 |
| 10 | « À 7 h 30, votre liste de relances est prête. » | R:164 | B | B | détection à 04 h 41 UTC ; fuseau de l'organisation (c4_31 ✔) | — | 0 |
| 11 | « OFFLOAD lit votre CRM et votre historique de facturation pendant la nuit, puis il ne garde que les comptes dont le silence dépasse votre délai. » | R:166 | B | B | `delai_silence_jours` (c4_02 ✔) | « lit votre CRM » = son export | 0 |
| 12 | Épingles « Entretien sauté deux fois », « Pièce arrivée, jamais posée », « 4 200 € puis plus rien » | R:172-174 | B | B | c4_07 ✔, c4_08 ✔, c4_02 ✔ | — | 0 |
| 13 | « Vous fixez le délai de silence et le montant qui mérite un message, puis tout ce qui sort de ces bornes est écarté avant de vous parvenir. » | R:183 | B | B | `offload_regler` (c4_02 ✔), bornes dites en français (c4_28 ✔) | — | 0 |
| 14 | « Sans commande depuis douze mois » | R:189 | B | B | délai réglable (c4_02 ✔) | — | 0 |
| 15 | « Au moins 300 € d'achats cumulés » | R:190 | B | B | `montant_min` (c4_02 ✔) | — | 0 |
| 16 | « Entretien annuel redevenu dû » / « Pièce arrivée, jamais reprise » | R:191-192 | B | B | c4_07 ✔ ; c4_08 ✔ | — | 0 |
| 17 | « Un message par trimestre au plus » | R:193 | C | **B** | par défaut, une reprise envoie un seul message ; quarantaine de 90 jours au moins depuis la clôture (c4_40 ✔, c4_16 ✔) ; deux messages seulement si le client choisit la relance écrite (c4_29 ✔) | — | 0 |
| 18 | « Par courriel, depuis votre adresse » | R:194 | C | C | Gmail : dépôt dans la boîte du client, brouillon ou envoi selon les portées (c4_22 ✔) ; rien n'est parti en vrai | Microsoft 365 (A2) ; vérification d'application Google et Microsoft (T) | 2 (A2) + T |
| 19 | « Jamais un compte en litige » | R:195 | D | **B** | `offload_impaye` lit CASHD : litige, recouvrement ou facture échue → écarté (c4_11 ✔) ; reprises d'avant closes (c4_32 ✔) ; refus même à la main (c4_23 ✔) | — | 0 |
| 20 | « Jamais deux fois le même compte » | R:196 | B | B | une reprise ouverte par compte, quarantaine (c4_05 ✔, c4_29 ✔) | — | 0 |
| 21 | « Vos règles de ton, vos interdits et vos tournures sont écrits avant la première vague. Le système n'en sort pas, et il s'arrête au premier doute. » | R:208 | C | **B** | règles écrites et appliquées, message retenu s'il enfreint (c4_10_regles_appliquees ✔, c4_21 ✔) ; coupe-circuit (c4_10_coupe_circuit ✔) | — | 0 |
| 22 | « Vous dictez les règles en français. » / « Vous n'avez aucune case à cocher : une phrase suffit, et le système l'applique ensuite à chaque relance. » | R:215-217 | D | C | lecture sans modèle, par familles (c4_10_lecture_des_regles ✔, c4_21 ✔) ; une phrase hors familles est dite « non comprise » | appliquer une phrase libre : rédaction sous règles par un modèle de langue + contrôle du message produit, ou bien reformuler (« une phrase suffit pour … ») | 3 |
| 23 | Échange « Ne relance jamais un compte en litige. » → « Compris — ces fiches sont écartées. » / « Ne propose aucune remise aux anciens clients. » → « Aucune remise dans les relances. » | R:221-224 | D | **B** | famille « litige » applicable (c4_11 ✔), mot ou sujet interdit (c4_10_lecture_des_regles ✔) ; la réponse du système est une phrase (pas forcément celle de la page) | — | 0 |
| 24 | « Chaque client reçoit son propre message. » / « Le système y reprend la date, la référence et le montant de sa dernière ligne de facturation » | R:235-237 | B | B | c4_03_message ✔ | — | 0 |
| 25 | Exemple « l'entretien annuel qui va avec est à refaire. Je vous garde un créneau ? » | R:238-241 | C | **B** | le message de reprise ajoute l'échéance et propose de convenir d'un créneau, sans le fixer (c4_15 ✔) | — | 0 |
| 26 | « La courbe ci-dessous se lit sur n'importe quel historique de ventes. » | R:247 | B | B | courbe 24 mois dans la fiche (c4_04 ✔) | — | 0 |
| 27 | Tuiles « 7 h 30 », « Mardi 9 h », « 1 seul », « Arrêt » | R:255-258 | — | — | non rendues | — | — |

## Métiers

| # | Promesse (texte exact) | Où | 06/10 | 26/10 | Preuve (26/10) | Ce qui manque | j → B |
|---|---|---|---|---|---|---|---|
| 28 | Après-vente : « OFFLOAD suit les entretiens qui arrivent à échéance, puis il repère les comptes silencieux et les commandes que personne n'a reprises. » | R:308 | B | B | c4_07 ✔, c4_02 ✔, c4_08 ✔ | — | 0 |
| 29 | « Votre planning d'atelier et votre stock de pièces restent dans votre DMS, parce qu'OFFLOAD ne s'y substitue pas : il le lit, puis il écrit ailleurs. » | R:310 | C | C | lit l'export du DMS (équipements, interventions, affaires : c4_07 ✔, c4_08 ✔) | aucune lecture directe d'un DMS ; en-têtes à caler sur un vrai export | 5 / DMS (T) ou 0 (texte) |
| 30 | Négoce : « OFFLOAD mesure la fréquence de commande habituelle de chaque compte dans votre ERP, puis il signale ceux qui décrochent avant que le trimestre le montre. » | R:320 | B | B | c4_02 ✔ | — | 0 |
| 31 | « Vos conditions tarifaires, vos encours et l'attribution de vos comptes restent dans votre ERP, parce qu'OFFLOAD y lit sans jamais y écrire. » | R:322 | B | B | aucune écriture vers l'extérieur | — | 0 |
| 32 | Climatisation : « OFFLOAD tient la liste de vos installations et la date à laquelle l'entretien de chacune redevient dû, puis il écrit au client la semaine d'avant. » | R:332 | B | B | c4_07_echeances ✔ | — | 0 |
| 33 | « L'entretien annuel saute une année, puis il saute la suivante, et le contrat s'éteint » | R:330 | B | B | c4_07_contrats_et_parc ✔ ; contrats à reconduction (c4_34 ✔) | — | 0 |
| 34 | Bâtiment : « OFFLOAD reprend vos chantiers réceptionnés, puis il propose un mot aux clients dont le dernier passage remonte à plus longtemps que le délai que vous fixez. » | R:343 | C | **B** | modèle d'export « chantiers » (date de réception), passage du compte (c4_14 ✔) | — | 0 |
| 35 | Conseil : « OFFLOAD repère les missions closes depuis assez longtemps pour qu'une prise de contact se justifie, sans insistance. » | R:355 | C | **B** | modèle d'export « missions » (date de clôture) (c4_14 ✔) | — | 0 |
| 36 | « Vous gardez… le prix », « Vous fixez vos prix… », « Vous choisissez… à quel prix » | R:333, 345, 356 | B | B | aucun prix dans un message (c4_03_message ✔) | — | 0 |

## Questions

| # | Promesse (texte exact) | Où | 06/10 | 26/10 | Preuve (26/10) | Ce qui manque | j → B |
|---|---|---|---|---|---|---|---|
| 37 | « OFFLOAD lit votre base clients tous les matins, et il en sort trois listes » | R:377 | B | B | écran : liste, échéances, affaires (c4_04 ✔) | — | 0 |
| 38 | « Pour chacun, il rédige un message ancré sur son dernier passage, et ce message part de votre adresse. » | R:377 | C | C | message ancré : B (c4_03_message ✔) ; « part de votre adresse » : voir 18 | voir 18 | (18) |
| 39 | « Vous ne changez pas d'outil, puisque tout vous arrive dans votre messagerie. » | R:377 | C | C | le point du matin part par courriel, avec chaque message à valider (nature, destinataire, objet, début du texte, lien vers la demande) : c4_41 ✔ | la décision se prend dans l'espace, connecté (choix de sécurité) : construire une décision par réponse au courriel, signée et vérifiée, ou écrire « tout vous arrive dans votre messagerie, et vous décidez d'un clic » | 1,5 (réponse signée) ou 0 (texte) |
| 40 | « un message par compte et par trimestre » | R:381 | C | **B** | voir 17 (c4_40 ✔) | — | 0 |
| 41 | « un seul canal à la fois, jamais les deux » | R:381 | C | **B** | la tâche d'appel n'est posée que si le message ne part pas (c4_12_canal_unique ✔) | — | 0 |
| 42 | « Dès qu'une réponse arrive, même négative, la séquence s'arrête et la conversation revient à votre commercial. » | R:381 | B | B | c4_03_reponse ✔ ; une absence ne compte plus comme une réponse (c4_10_reponses_automatiques ✔) | — | 0 |
| 43 | « Un compte qui ne répond jamais sort du cycle au lieu d'y tourner en boucle » | R:381 | B | B | c4_03_cycle ✔ | — | 0 |
| 44 | « Nous faisons ce calcul avec vos chiffres pendant le diagnostic » | R:385 | — | — | engagement commercial | — | — |
| 45 | « Un export CSV de votre CRM ou de votre ERP suffit pour commencer, et un tableur fait aussi l'affaire. Ce qu'il faut sur chaque ligne, c'est un identifiant de compte, une date et un montant » | R:389 | B | B | modèles « ventes » et « clients » (c4_01 ✔) | en-têtes à caler sur de vrais exports (→ A) | 0 |
| 46 | « Vous posez les règles en français, comme le ton, les sujets interdits, les remises ou la longueur, et elles s'appliquent à chaque message » | R:393 | D | **B** | ton (c4_21 ✔), sujets interdits, montants et remises, longueur (c4_10_lecture_des_regles ✔, c4_10_regles_appliquees ✔) | — | 0 |
| 47 | « jamais un prix ni un délai inventé, jamais de tutoiement » | R:393 | B | B | c4_03_message ✔ ; règle « tutoiement » (c4_10 ✔) | — | 0 |
| 48 | « Vos équipes relisent la première vague nom par nom, puis vous décidez ce qui part seul et ce qui attend votre accord. » | R:393 | C | **B** | rien ne part seul sans l'accord donné par une personne (`offload_donner_accord_auto`) ; sujets autorisés par type (reprise, échéance, affaire) ; message retenu sinon (c4_18 ✔) | — | 0 |
| 49 | « Le système s'arrête de lui-même. » / « au premier doute la coupure est automatique » | R:397 | C | **B** | c4_10_coupe_circuit ✔ (non remis > 20 %, double message, volume) | — | 0 |
| 50 | « Un compte ne reçoit jamais deux relances, un nom que vous avez retiré ne revient dans aucune vague, chaque envoi est horodaté dans un journal » | R:397 | B | B | c4_03_cycle ✔, c4_05 ✔, journal | — | 0 |
| 51 | « Nous préférons un mardi sans vague à un mardi où le même client reçoit deux messages. » | R:397 | D | **B** | `vague_jour` réglable, de 1 à 7 : les reprises ne s'ouvrent que ce jour-là (c4_12_vague_de_la_semaine ✔) | à régler à 2 (mardi) à l'installation ; vide par défaut, la vague passe chaque jour | 0 |
| 52 | Cadence « vague hebdomadaire (mardi 9 h) » | R:35, 256 | D | — | R:35 est un commentaire de code, R:256 une tuile non rendue ; aucune page ne l'affiche | (si la tuile revient : « 9 h » est faux, le socle n'envoie pas à heure fixe) | — |

## Français, appel final

| # | Promesse (texte exact) | Où | 06/10 | 26/10 | Preuve (26/10) | Ce qui manque | j → B |
|---|---|---|---|---|---|---|---|
| 53 | « Omega.AI en est l'éditeur et en assure la maintenance. Le contrat précise où vont vos données et ce que nous en faisons. » | R:418 | T | T | — | contrat et annexe (Teo) | — |
| 54 | « une personne de l'équipe vous répond » | R:424 | — | — | organisationnel | — | — |
| 55 | « Les relances sont rédigées en français, dans le vocabulaire de votre secteur, et vos équipes les relisent avant qu'elles partent. » | R:430 | C | **B** | six secteurs (négoce, après-vente, maintenance, bâtiment, conseil, immobilier) et le texte général, réglés par le gérant ou déduits de l'organisation (c4_43 ✔) ; relecture (c4_18 ✔) | renseigner le secteur à l'installation (sinon, texte général) | 0 |
| 56 | « Vos données sont hébergées dans l'Union européenne et ne sont jamais revendues. » | R:441 | T | T | — | vérifier les régions Supabase et Vercel ; engagement au contrat (Teo) | — |
| 57 | « La liste des prestataires est annexée au contrat » | R:441 | T | T | — | annexe (Supabase, Vercel, expéditeur, Google) | — |
| 58 | « si vous arrêtez, tout vous est restitué puis effacé » | R:441 | D | **B** | `offload_sortie` : arrêt, rien en suspens, restitution JSON et CSV avec empreinte ; puis effacement de l'organisation par la porte du socle, confirmé par son nom : aucune ligne OFFLOAD ne reste (c4_42 ✔) ; effacement d'une personne (c4_19 ✔, c4_26 ✔) | l'effacement final est exécuté par l'équipe Omega (pas d'écran en libre-service) | 0 |
| 59 | « OFFLOAD relit votre base chaque matin, repère les comptes restés silencieux et rédige pour chacun un message ancré sur son dernier passage. Vous validez ce qui part, et vos équipes gardent la main sur chaque échange. » | R:451 | B | B | c4_02 ✔, c4_03 ✔, c4_05_reprise_en_main ✔ | — | 0 |

## Périmètre : mention, cas tordus, échelle groupe

| # | Promesse (texte exact) | Où | 06/10 | 26/10 | Preuve (26/10) | Ce qui manque | j → B |
|---|---|---|---|---|---|---|---|
| 60 | « Trois relances, un seul système… Voici ce qu'il lit, ce qu'il écarte et ce qu'il vous laisse décider. » | K:33 | B | B | c4_01 à c4_08 ✔ | — | 0 |
| 61 | « Le système lit votre CRM, votre historique de facturation et vos fiches d'intervention, et rien d'autre. Il n'écrit dans aucun de ces outils, ne crée aucun rendez-vous et n'engage aucun prix à votre place. » | K:35 | B | B | lecture par export ; aucune écriture vers l'extérieur | contredit par 79 (texte) | 0 |
| 62 | « Le dernier contact connu est lu avant toute sollicitation. Si un échange récent figure dans vos outils, le compte sort de la vague en cours. » | K:132 | B | B | modèle d'export « contacts » (c4_13_contacts_importes ✔) + quarantaine (c4_05 ✔) | — | 0 |
| 63 | « Le message revient en échec et le compte passe en vérification. Il ne repart dans aucune vague tant que son état n'est pas tranché. » | K:136 | C | **B** | `verification = 'echec'`, écarté des vagues, levée par `offload_lever_verification` (c4_10 ✔) | — | 0 |
| 64 | « Le système s'arrête de lui-même au premier doute, et vous le signale. » | K:105 | C | **B** | c4_10_coupe_circuit ✔ (alerte critique, reprise par un gérant) | — | 0 |
| 65 | « La réponse d'absence est reconnue et le compte est signalé comme à réattribuer. Le système ne devine pas le successeur. » | K:140 | D | **B** | absence ≠ départ ; départ → « à réattribuer » + tâche (c4_10_reponses_automatiques ✔) | — | 0 |
| 66 | « Les trois fiches sont rapprochées sous une entité mère. Le plafond de sollicitation s'applique au groupe, pas à chaque ligne. » | K:144 | C | **B** | `offload_groupes`, rattachement proposé par domaine (c4_10_groupes ✔) ; plafond au groupe (c4_07_import_et_groupe ✔) | — | 0 |
| 67 | « L'échéance est close dès que la date figure dans vos fiches. Tant qu'aucune trace n'existe, le compte reste en attente et n'est pas relancé une seconde fois. » | K:148 | B | B | c4_07_echeances ✔ | — | 0 |
| 68 | « Le compte reçoit une relance de retrait, puis une seule autre après le délai que vous fixez. Ensuite il passe en décision manuelle, avec le montant immobilisé en regard. » | K:152 | B | B | c4_08 ✔, c4_33 ✔ (même sans message), c4_35 ✔ | — | 0 |
| 69 | « Il sort de la vague de relance commerciale, parce qu'une relance d'impayé et une relance commerciale ne se croisent jamais. Le recouvrement relève de CASHD, pas d'ici. » | K:156 | D | **B** | c4_11 ✔, c4_32 ✔ | — | 0 |
| 70 | « Chaque entité garde ses échéances, parce qu'elles portent sur des équipements distincts. Le plafond de sollicitation, lui, s'applique au groupe. » | K:160 | B | B | c4_07_import_et_groupe ✔ | — | 0 |
| 71 | « Les dates sont reconstituées à partir de l'historique de facturation. Si rien ne permet de dater un compte, il est présenté à part. » | K:164 | B | B | c4_01 ✔, c4_02 ✔ (`sans_achat`) | — | 0 |
| 72 | « Le rapprochement est proposé avec les éléments qui le fondent. La fusion n'a lieu qu'après votre accord. » | K:168 | B | B | c4_05_doublons ✔ | — | 0 |
| 73 | « Le retrait est immédiat et vaut sur tous les canaux. Seule une personne de votre équipe peut le remettre dans le circuit. » | K:172 | B | B | c4_03_reponse ✔ ; remise et levée d'opposition en un geste (c4_13_remise_dans_le_circuit ✔) | — | 0 |
| 74 | « Le compte sort du cycle sur-le-champ, y compris si un message était préparé. L'historique de la vague reste attaché à la fiche. » | K:176 | B | B | c4_05_reprise_en_main ✔ | — | 0 |
| 75 | « Une direction commerciale lit le consolidé, un responsable d'agence ne voit que le sien. » | K:192 | B | B | RLS par entité ; c4_09_pilotage ✔ | — | 0 |
| 76 | « Chaque compte porte son commercial. Les comptes stratégiques restent suivis en direct et sortent du cycle automatique, sans exception à demander. » | K:198 | B | B | c4_05 ✔ | — | 0 |
| 77 | « Le plafond par compte, la durée de quarantaine et les secteurs exclus sont des réglages, pas des habitudes. Chaque changement reste daté et attribué. » | K:204 | B | B | `offload_regler`, journal `offload.reglages` (c4_02_reglages_et_droits ✔, c4_28 ✔) | — | 0 |
| 78 | « Chaque message parti, chaque compte écarté et chaque retrait s'inscrivent dans un journal qui ne se modifie pas. » | K:210 | B | B | journal opposable du socle | même limite que CASHD E4 (un administrateur de la base peut le modifier) | 0 |
| 79 | « Le système lit votre CRM ou votre ERP, et y réécrit l'état de chaque compte. Là où un connecteur manque, l'échange passe par export et dépôt de fichiers. » | K:216 | D | D | dépôt de fichiers : B (c4_01 ✔) ; réécriture dans un CRM : rien, et la décision du 17/10 est de ne pas la faire sans connecteur | retirer « et y réécrit l'état de chaque compte » (contredit aussi 61), ou construire un connecteur en écriture par CRM | 0 (texte) / 10 par CRM (T) |
| 80 | « Comptes réactivés, chiffre remis en jeu, échéances honorées et commandes reprises se lisent par entité et en consolidé, avec un export daté. » | K:222 | B | B | c4_09_pilotage ✔ ; arrêtés (c4_09_arretes, vert d'après C4, non rejoué : trop long) ; valeur par segment (c4_36 ✔) | — | 0 |

## Catalogue des capacités (45 lignes, K:42-118)

| # | Ligne (texte exact) | Où | 06/10 | 26/10 | Preuve (26/10) | Ce qui manque | j → B |
|---|---|---|---|---|---|---|---|
| K1 | Le système croise votre historique de facturation et le référentiel clients de votre CRM. | K:42 | B | B | c4_01 ✔ | — | 0 |
| K2 | Chaque compte est classé par la date de son dernier contact, au-delà d'un seuil que vous fixez. | K:43 | B | B | c4_02 ✔, c4_05 ✔ | — | 0 |
| K3 | La fréquence d'achat habituelle d'un compte est mesurée, puis son décrochage détecté. | K:44 | B | B | c4_02 ✔ | — | 0 |
| K4 | Les comptes sont priorisés par valeur attendue, pas par ordre alphabétique. | K:45 | B | B | c4_02 ✔, c4_04 ✔ | — | 0 |
| K5 | Les doublons de fiches sont rapprochés quand deux lignes désignent le même client. | K:46 | B | B | c4_05_doublons ✔ | — | 0 |
| K6 | Les entités d'un même groupe client sont regroupées sous une raison sociale mère. | K:47 | C | **B** | c4_10_groupes ✔ | — | 0 |
| K7 | Un tableur sans colonne de date est exploité à partir des dates de facture. | K:48 | B | B | c4_01 ✔ | — | 0 |
| K8 | Les contrats et les équipements installés sont suivis jusqu'à leur échéance. | K:49 | B | B | c4_07 ✔, c4_34 ✔ | — | 0 |
| K9 | Chaque message reprend la dernière prestation du compte et le temps écoulé depuis. | K:56 | B | B | c4_03_message ✔ | — | 0 |
| K10 | Un compte sans réponse reçoit un second message, puis il sort du cycle. | K:57 | B | **C** | depuis c4_40 (décision du 27/10), la relance écrite est éteinte par défaut : un seul message, puis la sortie du cycle (c4_40 ✔) ; le second message seulement si le client le choisit (c4_29 ✔) | reformuler : « … reçoit au plus un rappel, si vous le choisissez » | 0 (texte) |
| K11 | Les règles de ton et de contenu s'écrivent en français, sans case à cocher. | K:58 | C | **B** | c4_10_lecture_des_regles ✔, c4_21 ✔ | — | 0 |
| K12 | Un compte reçoit deux messages en tout, espacés d'au moins trois jours. | K:59 | B | **C** | voir K10 : un message par défaut (c4_40 ✔) | reformuler (contredit 17, 40, N5, N7, qui font foi) | 0 (texte) |
| K13 | Une réponse, même négative, arrête la séquence et vous rend la conversation. | K:60 | B | B | c4_03_reponse ✔ | — | 0 |
| K14 | Les comptes déjà contactés par un commercial sont écartés de la vague en cours. | K:61 | B | B | c4_05_exclusions ✔, c4_13 ✔ | — | 0 |
| K15 | Les messages partent par courriel, depuis la boîte de votre entreprise. | K:62 | C | C | voir 18 (`atteste: true` à tort) | voir 18 | (18) |
| K16 | Les vagues s'enchaînent au rythme convenu, et chaque exécution laisse son bilan. | K:63 | B | B | c4_03_cycle ✔ (bilan), c4_12_vague_de_la_semaine ✔ | — | 0 |
| K17 | Les entretiens, révisions et contrôles périodiques sont suivis jusqu'à leur échéance. | K:71 | B | B | c4_07_echeances ✔ | — | 0 |
| K18 | Chaque échéance est datée à partir de la dernière intervention enregistrée. | K:72 | B | B | c4_07_echeances ✔ | — | 0 |
| K19 | Le client est prévenu la semaine qui précède, pas le jour où l'échéance tombe. | K:73 | B | B | c4_07_echeances ✔ | — | 0 |
| K20 | Une échéance déjà honorée ailleurs sort du cycle dès que la date est connue. | K:74 | B | B | c4_07_echeances ✔ | — | 0 |
| K21 | Les contrats d'entretien qui s'éteignent faute de reconduction sont signalés. | K:75 | B | B | c4_07_contrats_et_parc ✔, c4_34 ✔ | — | 0 |
| K22 | Les équipements installés sont rattachés au compte qui les exploite. | K:76 | B | B | c4_07_import_et_groupe ✔ | — | 0 |
| K23 | Un parc réparti sur plusieurs sites se lit site par site et en consolidé. | K:77 | B | B | c4_07_contrats_et_parc ✔ | — | 0 |
| K24 | Les échéances réglementaires sont distinguées des échéances commerciales. | K:78 | B | B | c4_07_echeances ✔ | — | 0 |
| K25 | Les commandes arrivées qu'aucun client n'est venu reprendre sont listées. | K:86 | B | B | c4_08 ✔ | — | 0 |
| K26 | Les interventions terminées et non retirées sont relancées après le délai que vous fixez. | K:87 | B | B | c4_08 ✔, c4_35 ✔ | — | 0 |
| K27 | Le stock immobilisé par une commande non reprise est chiffré. | K:88 | B | B | c4_08 ✔, c4_33 ✔ (montant repris de la pièce) | — | 0 |
| K28 | Une pièce commandée pour un compte inactif est rattachée à sa fiche. | K:89 | B | B | c4_08_inactif_et_reponse ✔ | — | 0 |
| K29 | Les affaires closes sans suite sont distinguées de celles qui attendent encore. | K:90 | B | B | c4_08 ✔ | — | 0 |
| K30 | Un compte relancé deux fois sans réponse passe en décision manuelle. | K:91 | B | B | c4_08 ✔, c4_33 ✔ | — | 0 |
| K31 | La relance de retrait ne porte aucune mention de paiement, qui relève de CASHD. | K:92 | B | B | c4_08 ✔ | — | 0 |
| K32 | Le magasin voit en une liste ce qui dort et depuis combien de temps. | K:93 | B | B | c4_08 ✔ | — | 0 |
| K33 | Un compte suivi en direct par un commercial est exclu du cycle automatique. | K:100 | B | B | c4_05_reprise_en_main ✔ | — | 0 |
| K34 | Le commercial en charge reprend la main sur un compte d'un seul geste. | K:101 | B | B | c4_05_reprise_en_main ✔ | — | 0 |
| K35 | Aucun prix ni aucun délai n'est avancé dans un message sans que vous l'ayez écrit. | K:102 | B | B | c4_03_message ✔ | — | 0 |
| K36 | Une demande d'arrêt vaut retrait immédiat et définitif du cycle. | K:103 | B | B | c4_03_reponse ✔ | — | 0 |
| K37 | Les listes d'exclusion se tiennent par compte, par secteur et par commercial. | K:104 | B | B | c4_05_exclusions ✔ | — | 0 |
| K38 | Le système s'arrête de lui-même au premier doute, et vous le signale. | K:105 | C | **B** | c4_10_coupe_circuit ✔ | — | 0 |
| K39 | Chaque message parti reste au journal, daté et consultable. | K:106 | B | B | c4_03_cycle ✔ | — | 0 |
| K40 | Le chiffre d'affaires remis en jeu se lit vague par vague. | K:113 | B | B | c4_09_pilotage ✔ | — | 0 |
| K41 | Les comptes réactivés sont suivis jusqu'à leur première commande. | K:114 | B | B | c4_03_issues ✔, c4_25 ✔ | — | 0 |
| K42 | Le taux de réponse se compare par segment, par canal et par message. | K:115 | B | B | c4_09_pilotage ✔, c4_36 ✔ | — | 0 |
| K43 | Les échéances honorées et les commandes reprises alimentent un tableau de suivi. | K:116 | B | B | c4_09_pilotage ✔ | — | 0 |
| K44 | Les résultats se lisent par entité, par site et en consolidé. | K:117 | B | B | c4_09_pilotage ✔ | — | 0 |
| K45 | Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe. | K:118 | B | B | boutons « Exporter vers un tableur » ; restitution CSV (c4_36 ✔, c4_38 ✔) ; arrêté mensuel (c4_09_arretes, vert d'après C4) | — | 0 |

## Accueil, /offres, articles (lignes ajoutées le 26/10)

| # | Promesse (texte exact) | Où | 06/10 | 26/10 | Preuve (26/10) | Ce qui manque | j → B |
|---|---|---|---|---|---|---|---|
| N1 | Un client qui ne revient plus, vous le voyez avant la clôture. | `app/page.tsx:701` | — | B | c4_02 ✔ (rythme, ralenti, retard) | — | 0 |
| N2 | Chaque nuit, il repère les clients qui ne donnent plus de nouvelles. | `app/page.tsx:703` | — | B | cron `offload-detection` 04 h 41 UTC (actif), c4_02 ✔ | — | 0 |
| N3 | OFFLOAD — Clients inactifs | `app/offres/page.tsx:390` | — | B | c4_02 ✔ | — | 0 |
| N4 | OFFLOAD — Classement par valeur | `app/offres/page.tsx:390` | — | B | c4_02 ✔, c4_04 ✔ | — | 0 |
| N5 | OFFLOAD — Un message par trimestre | `app/offres/page.tsx:390` | — | **B** | voir 17 (c4_40 ✔) | — | 0 |
| N6 | Les clients inactifs sont identifiés dans votre historique de ventes, classés par valeur et par récence, puis recontactés un par un avec un message ancré dans ce qu'ils ont réellement acheté. Les entretiens qui redeviennent dus et les commandes que personne n'est venu reprendre entrent dans la même liste. | `lib/content.ts:119` | — | B | c4_02 ✔, c4_03_message ✔, c4_07 ✔, c4_08 ✔ | — | 0 |
| N7 | Les clients inactifs classés par valeur, un message par compte et par trimestre. | `lib/content.ts:120` | — | **B** | voir 17 (c4_40 ✔) | — | 0 |
| N8 | Le système OFFLOAD lit le fichier et repère les clients dont le dernier passage approche de l'année. Chacun reçoit un message personnel (le véhicule, la prestation réalisée, une proposition de faire un point avant le prochain contrôle), jamais une campagne de masse, jamais deux fois, et celui qui répond STOP ne sera plus jamais contacté. | `lib/content.ts:252` (article garage) | — | C | message ancré sur la dernière prestation (c4_03_message ✔) et l'échéance de l'équipement (c4_15 ✔) ; STOP = retrait définitif (c4_03_reponse ✔) | « jamais deux fois » : par défaut, un rappel suit le premier message (c4_29) ; « le véhicule » = équipement du parc, à condition que l'export du garage le porte | 0 (voir 17) |
| N9 | Chaque agence possède un fichier de contacts qui n'ont pas abouti, et qui n'ont jamais été recontactés. Le système OFFLOAD reprend cette base à cadence maîtrisée : un message personnel, adapté à l'historique du contact, jamais une campagne de masse. Celui qui répond sort du circuit automatique et revient à l'agent ; celui qui demande à ne plus être contacté ne l'est plus jamais. | `lib/content.ts:330` (article agence) | — | **B** | contacts sans achat repris à partir du dernier échange (date, nature, jamais la note), jour de la vague et plafond quotidien, une fois par échange, toujours relus (c4_44 ✔) ; réponse → retour à l'agent, « stop » → retrait définitif (c4_03_reponse ✔) | un courriel exige l'accord enregistré du contact ; sans accord, une tâche d'appel | 0 |

## Ce qui reste à construire (→ B), regroupé

| Chantier | Ce qui manque, en une phrase | Lignes | j |
|---|---|---|---|
| Boîte Microsoft 365 | Brancher Microsoft 365 comme Gmail (dépôt, envoi, relève) ; vérification d'application Google et Microsoft (T). | 8, 18, 38, K15 | 2 (A2) |
| Règles en phrase libre | Appliquer une phrase hors des familles comprises : rédaction sous règles par un modèle de langue et contrôle du message produit. | 22 | 3 |
| Décider depuis la messagerie | Le point et les validations arrivent par courriel (c4_41) ; décider par réponse signée, ou reformuler. | 39 | 1,5 ou 0 |
| Catalogue K10, K12 | Reformuler « un second message », « deux messages en tout » (un message par défaut depuis c4_40). | K10, K12 | 0 |
| **Sous-total** | | | **6,5** |
| Connecteurs directs | Lire un CRM, un ERP, un DMS ou Sheets en direct, sinon reformuler « lit » en « lit leurs exports ». | 7, 29 | 5 par connecteur (T) |
| Réécriture dans le CRM | Retirer la phrase (recommandé) ou écrire dans chaque CRM. | 79 | 0 ou 10 par CRM (T) |

## Mise en vrai (B → A), commune (inchangée)

| Étape | Jours | Tiers |
|---|---|---|
| Expéditeur réel à l'adresse du client : premier envoi Gmail réel, réponse rattachée | 2 | **T** : vérification Google, SPF / DKIM du domaine du client |
| Réception des réponses depuis la boîte du client | 1 | **T** (A2) |
| Calage des modèles d'export sur les vrais fichiers du pilote (ventes, clients, parc, affaires, contacts) | 2 | **T** : client pilote |
| Observation de la première vague réelle, nom par nom | 2 à 3 semaines de calendrier | pilote |
| Annexe des prestataires, régions d'hébergement | — | **T** : Teo |
| **Total** | **5** | |

## Corrections de texte proposées (0 j chacune, aucune faite ici)

- 17, 40, N5 et N7 : « un message par trimestre » → « une séquence par trimestre » ; à défaut, éteindre la relance
  écrite par défaut.
- 79 : retirer « et y réécrit l'état de chaque compte ».
- 39 : « dans votre messagerie » → « dans votre espace ».
- 7 : « OFFLOAD lit les deux » → « OFFLOAD lit leurs exports et les réponses ».
- `lib/produits/capacites/reprise.ts:62` (K15) : passer `atteste` à `false` tant que rien n'est parti d'une vraie
  boîte.
