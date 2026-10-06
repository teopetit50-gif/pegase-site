# Chiffrage OFFLOAD — /offres/nouvelles-affaires (C4, 06/10/2026)

Demandé par Teo le 06/10 à 19 h 50 Z : estimer ce qui reste à construire pour un produit vraiment livrable, et vérifier
toutes les promesses, même petites. **Aucun fichier du site public n'a été modifié** : ceci est une lecture de main
`c0494b4` (vitrine de 15 h 55).

## Synthèse

1. **Rien n'est en état A.** Aucun message OFFLOAD n'est parti en réel : tout tourne en essai, sur le banc de la recette.
   Le passage en A tient à trois prérequis communs, tous tiers (T) : expéditeur réel Gmail/Microsoft 365 branché au
   socle (A2), réception des réponses par la messagerie, un client pilote avec ses vrais exports. Environ **5 j** de
   notre côté, plus 2 à 3 semaines d'observation calendaire.
2. **Le catalogue de 45 lignes est construit** : 36 lignes en B (recette verte), 5 en B dès la pose de c4_09 (pilotage,
   poussé `ed946d2a`), **4 partielles** (6, 11, 15, 38). Trois lignes sont marquées `atteste: true` alors qu'elles sont
   partielles : 11 (règles de ton), 15 (boîte de l'entreprise), 38 (arrêt au premier doute). À repasser en `false`.
3. **Le plus gros trou est la rédaction sous règles en français** : les messages sont des gabarits, aucune phrase du
   client n'est interprétée. Une demi-douzaine de phrases de la page en dépendent (carte « Vous dictez les règles »,
   citation, FAQ, « vocabulaire de votre secteur »). Il faut **6 j**, plus le coût d'un modèle de langue (quelques
   centimes pour cent messages).
4. **Cinq phrases contredisent le produit tel qu'il est** :
   - « vague du mardi 9 h » : le cycle est quotidien ;
   - « un message par trimestre au plus » : une séquence fait deux messages ;
   - « un seul canal à la fois, jamais les deux » : chaque reprise crée aussi une tâche d'appel ;
   - « jamais un compte en litige » : aucun lien avec CASHD ;
   - « réécrit l'état de chaque compte dans votre CRM » : la mention du même bloc dit le contraire.

   Il faut soit **3,5 j** de construction, soit corriger le texte. Le choix revient à Teo.
5. **Reste à construire pour un B complet : environ 23 j.** Le détail :
   - règles en français : 6 j ;
   - cadence hebdomadaire, plafond et canal unique : 2 j ;
   - lien CASHD (litiges) : 1,5 j ;
   - absences, échecs et compte « en vérification » : 1,5 j ;
   - entité mère : 2 j ;
   - coupe-circuit au premier doute : 2 j ;
   - modèles chantiers et missions : 2,5 j ;
   - envoi sans validation par règle : 1 j ;
   - restitution et effacement : 1,5 j ;
   - petits écarts : 3 j.

   Les connecteurs directs CRM, ERP et Sheets, que la page laisse entendre (« lit », « vous ne déployez rien »), ne sont
   pas comptés : **5 j par connecteur, plus l'accès du client (T)**. Aujourd'hui, tout passe par le dépôt d'un export.
6. **Total pour être livrable en vrai : 28 j de travail environ.** Ce total recouvre 23 j de construction et 5 j de mise
   en vrai. S'y ajoutent les tiers : expéditeur et réception par la messagerie (A2), client pilote, annexe des
   prestataires au contrat, et la vérification de la région d'hébergement (Supabase et Vercel) pour « hébergées dans
   l'UE ». Sans les règles en français (6 j) ni la cadence et le lien CASHD (3,5 j), environ **13,5 j de construction et 5 j
   de mise en vrai** suffisent pour un produit honnête, à condition de corriger les phrases concernées (liste en fin de
   fichier).

États : **A** prouvé en vrai ; **B** construit et testé sur la recette (test nommé) ; **C** partiel ; **D** pas construit ;
**T** tiers, compte ou achat de Teo. Jours : « →B » de l'état actuel à B ; « →A » de B à A. Le « →A » de chaque ligne
suppose les trois prérequis communs de la synthèse (point 1, comptés une fois, environ 5 j).

Fichiers lus (main `c0494b4`) : `lib/produits/reprise.ts` (R), `lib/produits/capacites/reprise.ts` (K),
`app/offres/nouvelles-affaires/page.tsx` (P). Les composants `components/produits/reprise/*` ne portent aucun texte
propre (hors « Clients éteints » et « Clients actifs », les légendes du graphique d'exemple).

## Page, héros, bandeau, fonctionnalités

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | →B | →A | Coût externe / tiers |
|---|---|---|---|---|---|---|---|---|
| 1 | « Votre fichier client relu chaque matin : les comptes qui n'ont plus commandé, les entretiens redevenus dus et les affaires restées en plan. » | P:57 (description) | B | test_c4_02_detection, test_c4_07_echeances, test_c4_08_cycle ; cron `offload-detection` 04 h 41 UTC | — | 0 | 0,25 | pilote |
| 2 | « La relance est rédigée, vos équipes la valident. » | P:57 | B | test_c4_03_message (gabarit), demandes_validation | « rédigée » = gabarit, pas une rédaction sous règles (voir 20) | 0 | 0,25 | — |
| 3 | « Votre base clients n'est jamais relue. » (titre) | R:98 | — | constat sur le lecteur, pas une promesse | — | — | — | — |
| 4 | « Un compte qui commandait deux fois par an cesse de commander, et le service s'en aperçoit à la clôture » | R:105 | B | rythme et alerte avant clôture : test_c4_02_detection | — | 0 | 0,25 | — |
| 5 | « La pièce commandée pour lui dort encore au magasin. » | R:105 | B | test_c4_08_inactif_et_reponse (affaire d'un compte inactif rattachée à sa fiche) | — | 0 | 0,25 | — |
| 6 | « OFFLOAD relit votre base clients chaque matin et vous dit à qui écrire. » | R:105 | B | cron nuit + point du matin (test_c4_03_point_matin) | « relit » = relit le dernier export déposé, pas la base en direct | 0 | 0,25 | — |
| 7 | « Votre historique de ventes vit dans un CRM, un ERP ou un tableur, et vos clients écrivent à votre messagerie. OFFLOAD lit les deux, donc vous ne déployez rien. » | R:129 | C | lecture : dépôt d'export (test_c4_01_import) ; réponses : `receptions` du socle (test_c4_03_reponse) | lecture directe des outils ; branchement de la messagerie du client (A2) | 0 (texte) / 5 par connecteur | 1 | **T** : OAuth Gmail / M365 du client |
| 8 | Bandeau d'outils « Gmail, Outlook, Sheets, Excel, CSV » | R:132 | C | CSV et Excel exportés : B (lecteur d'exports) | Gmail / Outlook : expéditeur et réception A2 ; Sheets : pas de lecture directe, seulement l'export | 0 (Sheets via export) | 1 | **T** : comptes Google / Microsoft |
| 9 | « OFFLOAD y cherche le compte qui n'a plus commandé, l'entretien redevenu dû et l'affaire restée en plan. » | R:157 | B | c4_02, c4_07, c4_08 | — | 0 | 0,25 | — |
| 10 | « À 7 h 30, votre liste de relances est prête. » | R:164 | B | détection à 04 h 41 UTC (6 h 41, heure de Paris l'été) ; écran /espace/offload | — | 0 | 0 | — |
| 11 | « OFFLOAD lit votre CRM et votre historique de facturation pendant la nuit, puis il ne garde que les comptes dont le silence dépasse votre délai. » | R:166 | B | `delai_silence_jours` (test_c4_02_detection) | lecture de l'export déposé, pas du CRM en direct | 0 | 0,25 | — |
| 12 | Épingles « Entretien sauté deux fois », « Pièce arrivée, jamais posée », « 4 200 € puis plus rien » | R:172-174 | B | échéance dépassée (c4_07), affaire (c4_08), silence et baisse (c4_02) | — | 0 | 0 | — |
| 13 | « Vous fixez le délai de silence et le montant qui mérite un message, puis tout ce qui sort de ces bornes est écarté avant de vous parvenir. » | R:183 | B | `offload_regler` (delai_silence_jours, montant_min) ; test_c4_02_reglages_et_droits | — | 0 | 0 | — |
| 14 | « Sans commande depuis douze mois » | R:189 | B | délai réglable (90 j par défaut) | — | 0 | 0 | — |
| 15 | « Au moins 300 € d'achats cumulés » | R:190 | B | `montant_min` (test_c4_02_reglages_et_droits) | — | 0 | 0 | — |
| 16 | « Entretien annuel redevenu dû » / « Pièce arrivée, jamais reprise » | R:191-192 | B | test_c4_07_echeances ; test_c4_08_cycle | — | 0 | 0,25 | — |
| 17 | « Un message par trimestre au plus » | R:193 | **C — contredit** | quarantaine de 90 j entre deux reprises (test_c4_05_exclusions) | une reprise envoie **deux** messages (premier et relance, capacité 12). Soit le texte devient « une séquence par trimestre », soit la relance est retirée | 0,5 | 0 | décision Teo |
| 18 | « Par courriel, depuis votre adresse » | R:194 | C | courriel préparé et validé (essai) | expéditeur réel à l'adresse du client (A2) | 0 | 2 | **T** : OAuth Gmail / M365, SPF / DKIM du domaine |
| 19 | « Jamais un compte en litige » | R:195 | **D** | — | lire CASHD (facture en retard, litige) et écarter le compte ; même travail que 69 | 1,5 | 0,25 | — |
| 20 | « Jamais deux fois le même compte » | R:196 | B | une seule reprise ouverte par compte (index unique), quarantaine | — | 0 | 0 | — |
| 21 | « Vos règles de ton, vos interdits et vos tournures sont écrits avant la première vague. Le système n'en sort pas, et il s'arrête au premier doute. » | R:208 | C | gabarits sans tutoiement, prix ou délai (test_c4_03_message) ; arrêt partiel (38) | règles écrites par le client et appliquées (voir 22) ; coupe-circuit (voir 64) | (dans 23 et 64) | 0,5 | — |
| 22 | « Vous dictez les règles en français. » / « Vous n'avez aucune case à cocher : une phrase suffit, et le système l'applique ensuite à chaque relance. » | R:215-217 | **D** | seule la signature se règle | saisie des règles en français, rédaction par un modèle de langue sous ces règles, contrôle automatique du message produit (interdits, prix, délais, tutoiement), journal des règles | 6 | 1 | modèle de langue : quelques centimes / 100 messages ; prestataire à annexer au contrat |
| 23 | Échange « Ne relance jamais un compte en litige. » → « Compris — ces fiches sont écartées. » / « Ne propose aucune remise aux anciens clients. » → « Aucune remise dans les relances. » | R:221-224 | **D** | — | 22 + 19 | (dans 19 et 22) | — | — |
| 24 | « Chaque client reçoit son propre message. » / « Le système y reprend la date, la référence et le montant de sa dernière ligne de facturation » | R:235-237 | B | test_c4_03_message | — | 0 | 0,25 | — |
| 25 | Exemple « l'entretien annuel qui va avec est à refaire. Je vous garde un créneau ? » | R:238-241 | C | le message d'échéance existe (test_c4_07_echeances) | le message de reprise ne combine pas dernière facture et échéance ; il ne propose pas de créneau (aucun agenda) | 1 | 0 | — |
| 26 | « La courbe ci-dessous se lit sur n'importe quel historique de ventes. » | R:247 | B | courbe sur 24 mois dans la fiche (c4_04) ; graphique de la page marqué « Exemple » | — | 0 | 0 | — |
| 27 | Tuiles « 7 h 30 », « Mardi 9 h », « 1 seul », « Arrêt » | R:255-258 | — | **non rendues** sur la page depuis le 14/09 | si on les remet, « Mardi 9 h » est faux (voir 52) | — | — | — |

## Métiers

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | →B | →A | Coût externe / tiers |
|---|---|---|---|---|---|---|---|---|
| 28 | Après-vente : « OFFLOAD suit les entretiens qui arrivent à échéance, puis il repère les comptes silencieux et les commandes que personne n'a reprises. » | R:308 | B | c4_07, c4_02, c4_08 | — | 0 | 0,25 | — |
| 29 | « Votre planning d'atelier et votre stock de pièces restent dans votre DMS, parce qu'OFFLOAD ne s'y substitue pas : il le lit, puis il écrit ailleurs. » | R:310 | C | lit l'export du DMS (jeux equipements, interventions, affaires) | aucune lecture directe d'un DMS ; modèles d'en-têtes à confirmer sur un vrai export | 0 | 1 | export réel d'un DMS |
| 30 | Négoce : « OFFLOAD mesure la fréquence de commande habituelle de chaque compte dans votre ERP, puis il signale ceux qui décrochent avant que le trimestre le montre. » | R:320 | B | test_c4_02_detection (rythme, ralenti, retard) | — | 0 | 0,25 | — |
| 31 | « Vos conditions tarifaires, vos encours et l'attribution de vos comptes restent dans votre ERP, parce qu'OFFLOAD y lit sans jamais y écrire. » | R:322 | B | aucune écriture vers l'extérieur ; lecture par export | — | 0 | 0 | — |
| 32 | Climatisation : « OFFLOAD tient la liste de vos installations et la date à laquelle l'entretien de chacune redevient dû, puis il écrit au client la semaine d'avant. » | R:332 | B | test_c4_07_echeances (J-5 → message ; J → rien) | — | 0 | 0,25 | — |
| 33 | « L'entretien annuel saute une année, puis il saute la suivante, et le contrat s'éteint » | R:330 | B | contrats qui s'éteignent (test_c4_07_contrats_et_parc) | — | 0 | 0 | — |
| 34 | Bâtiment : « OFFLOAD reprend vos chantiers réceptionnés, puis il propose un mot aux clients dont le dernier passage remonte à plus longtemps que le délai que vous fixez. » | R:343 | C | le dernier passage est lu dans les factures | pas de notion de chantier ni de date de réception : modèle d'export « chantiers », phrase de message propre | 1,5 | 0,25 | export réel d'un logiciel de bâtiment |
| 35 | Conseil : « OFFLOAD repère les missions closes depuis assez longtemps pour qu'une prise de contact se justifie, sans insistance. » | R:355 | C | dernière facture | pas de notion de mission close : modèle d'export « missions » | 1 | 0,25 | — |
| 36 | « Vous gardez… le prix », « Vous fixez vos prix… », « Vous choisissez… à quel prix » | R:333, 345, 356 | B | aucun prix proposé dans un message (test_c4_03_message, capacité 35) | — | 0 | 0 | — |

## Questions

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | →B | →A | Coût externe / tiers |
|---|---|---|---|---|---|---|---|---|
| 37 | « OFFLOAD lit votre base clients tous les matins, et il en sort trois listes » | R:377 | B | écran : liste, échéances, affaires | — | 0 | 0,25 | — |
| 38 | « Pour chacun, il rédige un message ancré sur son dernier passage, et ce message part de votre adresse. » | R:377 | C | message ancré : B ; « part de votre adresse » : voir 18 | expéditeur réel | 0 | (dans 18) | **T** |
| 39 | « Vous ne changez pas d'outil, puisque tout vous arrive dans votre messagerie. » | R:377 | C | les validations se font dans l'écran Omega « À valider » ; le point du matin est dans l'espace | soit le texte devient « dans votre espace », soit le point du matin et les validations partent aussi par courriel (socle) | 1 | 0 | — |
| 40 | « un message par compte et par trimestre » | R:381 | **C — contredit** | voir 17 | voir 17 | (dans 17) | — | décision Teo |
| 41 | « un seul canal à la fois, jamais les deux » | R:381 | **C — contredit** | chaque reprise crée un courriel **et** une tâche d'appel (`offload_ouvrir`) | appel seulement sans courriel, si le message est retenu, ou avant la clôture sur un choix réglé | 0,5 | 0 | — |
| 42 | « Dès qu'une réponse arrive, même négative, la séquence s'arrête et la conversation revient à votre commercial. » | R:381 | B | test_c4_03_reponse | réponse d'absence comptée comme une réponse (voir 69) | 0 | 0,5 | **T** : réception de la messagerie |
| 43 | « Un compte qui ne répond jamais sort du cycle au lieu d'y tourner en boucle » | R:381 | B | test_c4_03_cycle | — | 0 | 0 | — |
| 44 | « Nous faisons ce calcul avec vos chiffres pendant le diagnostic » | R:385 | — | engagement commercial, hors produit | — | — | — | — |
| 45 | « Un export CSV de votre CRM ou de votre ERP suffit pour commencer, et un tableur fait aussi l'affaire. Ce qu'il faut sur chaque ligne, c'est un identifiant de compte, une date et un montant » | R:389 | B | modèles « ventes » et « clients » (test_c4_01_import) | en-têtes à confirmer sur de vrais exports | 0 | 1 | export réel |
| 46 | « Vous posez les règles en français, comme le ton, les sujets interdits, les remises ou la longueur, et elles s'appliquent à chaque message » | R:393 | **D** | — | voir 22 | (dans 22) | — | — |
| 47 | « jamais un prix ni un délai inventé, jamais de tutoiement » | R:393 | B | gabarits (test_c4_03_message) | à garder vrai quand un modèle de langue rédigera (contrôle prévu dans 22) | 0 | 0 | — |
| 48 | « Vos équipes relisent la première vague nom par nom, puis vous décidez ce qui part seul et ce qui attend votre accord. » | R:393 | C | tout passe en validation (socle) | « ce qui part seul » : réglage par type de message (reprise, échéance, retrait) en mode réel sans validation, à vérifier côté socle | 1 | 0,5 | — |
| 49 | « Le système s'arrête de lui-même. » / « au premier doute la coupure est automatique » | R:397 | C | import douteux non appliqué (test_c4_01_garde_fou), essai contre réel (test_c4_03_issues) | voir 64 | (dans 64) | — | — |
| 50 | « Un compte ne reçoit jamais deux relances, un nom que vous avez retiré ne revient dans aucune vague, chaque envoi est horodaté dans un journal » | R:397 | B | test_c4_03_cycle, test_c4_05_exclusions, journal (capacité 39) | — | 0 | 0 | — |
| 51 | « Nous préférons un mardi sans vague à un mardi où le même client reçoit deux messages. » | R:397 | **D** (le mardi) | — | voir 52 | (dans 52) | — | — |
| 52 | Cadence « vague hebdomadaire (mardi 9 h) » (en-tête de R, tuile non rendue, FAQ) | R:35, 256, 397 | **D** | le cycle prépare chaque nuit, avec un plafond par jour | jour et heure de vague réglables ; préparation la veille, validation, départ groupé | 1,5 | 0 | — |

## Français, appel final

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | →B | →A | Coût externe / tiers |
|---|---|---|---|---|---|---|---|---|
| 53 | « Omega.AI en est l'éditeur et en assure la maintenance. Le contrat précise où vont vos données et ce que nous en faisons. » | R:418 | T | — | contrat et annexe | — | — | **T** : juridique |
| 54 | « une personne de l'équipe vous répond » | R:424 | — | organisationnel | — | — | — | — |
| 55 | « Les relances sont rédigées en français, dans le vocabulaire de votre secteur, et vos équipes les relisent avant qu'elles partent. » | R:430 | C | français et relecture : B (validation) | « vocabulaire de votre secteur » : les gabarits sont génériques (voir 22) | (dans 22) | 0 | — |
| 56 | « Vos données sont hébergées dans l'Union européenne et ne sont jamais revendues. » | R:441 | T | — | vérifier les régions Supabase et Vercel (fonctions) ; engagement contractuel | 0 | 0,25 | **T** : vérification et contrat |
| 57 | « La liste des prestataires est annexée au contrat » | R:441 | T | — | annexe (Supabase, Vercel, futur modèle de langue, expéditeur) | — | — | **T** |
| 58 | « si vous arrêtez, tout vous est restitué puis effacé » | R:441 | **D** | — | export complet des tables OFFLOAD du client et procédure d'effacement (côté socle : les migrations n'ont pas le droit au DELETE) | 1,5 | 0,25 | — |
| 59 | « OFFLOAD relit votre base chaque matin, repère les comptes restés silencieux et rédige pour chacun un message ancré sur son dernier passage. Vous validez ce qui part, et vos équipes gardent la main sur chaque échange. » | R:451 | B | c4_02, c4_03, validation, reprise en main (test_c4_05_reprise_en_main) | — | 0 | 0,25 | — |

## Périmètre : mention, cas tordus, échelle groupe

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | →B | →A | Coût externe / tiers |
|---|---|---|---|---|---|---|---|---|
| 60 | « Trois relances, un seul système… Voici ce qu'il lit, ce qu'il écarte et ce qu'il vous laisse décider. » | K:33 | B | c4_01 à c4_08 | — | 0 | 0 | — |
| 61 | « Le système lit votre CRM, votre historique de facturation et vos fiches d'intervention, et rien d'autre. Il n'écrit dans aucun de ces outils, ne crée aucun rendez-vous et n'engage aucun prix à votre place. » | K:35 | B | lecture par export ; aucune écriture vers l'extérieur | **contredit par 74** (« y réécrit l'état de chaque compte ») | 0 | 0 | — |
| 62 | « Le dernier contact connu est lu avant toute sollicitation. Si un échange récent figure dans vos outils, le compte sort de la vague en cours. » | K:132 | B | `offload_contacts` + quarantaine (test_c4_05_exclusions) | « dans vos outils » : contact saisi ou noté, pas lu dans le CRM (aucun jeu « contacts » importé) | 0,5 (jeu d'import « contacts ») | 0 | — |
| 63 | « Le message revient en échec et le compte passe en vérification. Il ne repart dans aucune vague tant que son état n'est pas tranché. » | K:136 | C | échec → la reprise passe à l'appel (test_c4_03_issues) | statut de compte « à vérifier » qui bloque les vagues, levé par une personne | 0,5 | 0 | — |
| 64 | « Le système s'arrête de lui-même au premier doute, et vous le signale. » (capacité 38) | K:105 | C | import douteux, essai contre réel, verrous du socle | coupe-circuit du module : taux d'échec, de rebond ou d'anomalie au-delà d'un seuil → suspension des envois OFFLOAD + alerte ; reprise par une personne | 2 | 0,5 | — |
| 65 | « La réponse d'absence est reconnue et le compte est signalé comme à réattribuer. Le système ne devine pas le successeur. » | K:140 | **D** | — | reconnaître les réponses automatiques (absence, départ) ; aujourd'hui elles **arrêtent la séquence comme une vraie réponse** ; signal « à réattribuer » | 1 | 0,5 | — |
| 66 | « Les trois fiches sont rapprochées sous une entité mère. Le plafond de sollicitation s'applique au groupe, pas à chaque ligne. » | K:144 | C | plafond au groupe : B (test_c4_05_exclusions, test_c4_07_import_et_groupe) ; doublons : B | vue consolidée par raison sociale mère (capacité 6) | 2 | 0 | — |
| 67 | « L'échéance est close dès que la date figure dans vos fiches. Tant qu'aucune trace n'existe, le compte reste en attente et n'est pas relancé une seconde fois. » | K:148 | B | test_c4_07_echeances | — | 0 | 0,25 | — |
| 68 | « Le compte reçoit une relance de retrait, puis une seule autre après le délai que vous fixez. Ensuite il passe en décision manuelle, avec le montant immobilisé en regard. » | K:152 | B | test_c4_08_cycle | — | 0 | 0,25 | — |
| 69 | « Il sort de la vague de relance commerciale, parce qu'une relance d'impayé et une relance commerciale ne se croisent jamais. Le recouvrement relève de CASHD, pas d'ici. » | K:156 | **D** | — | lien CASHD (voir 19) | (dans 19) | — | — |
| 70 | « Chaque entité garde ses échéances, parce qu'elles portent sur des équipements distincts. Le plafond de sollicitation, lui, s'applique au groupe. » | K:160 | B | test_c4_07_import_et_groupe | — | 0 | 0 | — |
| 71 | « Les dates sont reconstituées à partir de l'historique de facturation. Si rien ne permet de dater un compte, il est présenté à part. » | K:164 | B | test_c4_01_import, test_c4_02_detection (`sans_achat`) | — | 0 | 0 | — |
| 72 | « Le rapprochement est proposé avec les éléments qui le fondent. La fusion n'a lieu qu'après votre accord. » | K:168 | B | test_c4_05_doublons | — | 0 | 0 | — |
| 73 | « Le retrait est immédiat et vaut sur tous les canaux. Seule une personne de votre équipe peut le remettre dans le circuit. » | K:172 | B | opposition du socle (test_c4_03_reponse) ; remise en circuit réservée au gérant ou à l'admin (`offload_changer_statut`) | lever l'opposition du socle en même temps (aujourd'hui, deux gestes) | 0,5 | 0 | — |
| 74 | « Le compte sort du cycle sur-le-champ, y compris si un message était préparé. L'historique de la vague reste attaché à la fiche. » | K:176 | B | test_c4_05_reprise_en_main | — | 0 | 0 | — |
| 75 | « Une direction commerciale lit le consolidé, un responsable d'agence ne voit que le sien. » | K:192 | B | RLS par entité (`voit_entite`) ; pilotage consolidé réservé à la direction (test_c4_09_pilotage) | — | 0 | 0 | — |
| 76 | « Chaque compte porte son commercial. Les comptes stratégiques restent suivis en direct et sortent du cycle automatique, sans exception à demander. » | K:198 | B | test_c4_05_reprise_en_main, exclusions par commercial | — | 0 | 0 | — |
| 77 | « Le plafond par compte, la durée de quarantaine et les secteurs exclus sont des réglages, pas des habitudes. Chaque changement reste daté et attribué. » | K:204 | B | `offload_regler`, exclusions par secteur, journal `offload.reglages` | — | 0 | 0 | — |
| 78 | « Chaque message parti, chaque compte écarté et chaque retrait s'inscrivent dans un journal qui ne se modifie pas. » | K:210 | B | journal opposable du socle (capacité 39) | — | 0 | 0 | — |
| 79 | « Le système lit votre CRM ou votre ERP, et y réécrit l'état de chaque compte. Là où un connecteur manque, l'échange passe par export et dépôt de fichiers. » | K:216 | **D — contredit** | dépôt de fichiers : B | réécriture dans le CRM : aucun connecteur, et contraire à 61. **Recommandation : retirer « et y réécrit l'état de chaque compte »** | 0 (texte) / 10 + par CRM | — | **T** : accès API du CRM |
| 80 | « Comptes réactivés, chiffre remis en jeu, échéances honorées et commandes reprises se lisent par entité et en consolidé, avec un export daté. » | K:222 | B (après pose c4_09) | test_c4_09_pilotage, test_c4_09_arretes | pose de c4_09 sur la recette | 0 | 0,25 | — |

## Catalogue des capacités (45 lignes, K:42-118)

| # | Ligne (texte exact) | Où | État | Preuve | Ce qui manque | →B | →A | Tiers |
|---|---|---|---|---|---|---|---|---|
| K1 | Le système croise votre historique de facturation et le référentiel clients de votre CRM. | K:42 | B | test_c4_01_import | — | 0 | 0,25 | export réel |
| K2 | Chaque compte est classé par la date de son dernier contact, au-delà d'un seuil que vous fixez. | K:43 | B | test_c4_02_detection, test_c4_05_exclusions | — | 0 | 0 | — |
| K3 | La fréquence d'achat habituelle d'un compte est mesurée, puis son décrochage détecté. | K:44 | B | test_c4_02_detection | — | 0 | 0 | — |
| K4 | Les comptes sont priorisés par valeur attendue, pas par ordre alphabétique. | K:45 | B | test_c4_02_detection, test_c4_04_lectures | — | 0 | 0 | — |
| K5 | Les doublons de fiches sont rapprochés quand deux lignes désignent le même client. | K:46 | B | test_c4_05_doublons | — | 0 | 0 | — |
| K6 | Les entités d'un même groupe client sont regroupées sous une raison sociale mère. | K:47 | C | `groupe` lu, plafond au groupe | vue consolidée par raison sociale mère (voir 66) | (dans 66) | 0 | — |
| K7 | Un tableur sans colonne de date est exploité à partir des dates de facture. | K:48 | B | test_c4_01_import | — | 0 | 0 | — |
| K8 | Les contrats et les équipements installés sont suivis jusqu'à leur échéance. | K:49 | B | test_c4_07_echeances, test_c4_07_contrats_et_parc | — | 0 | 0,25 | — |
| K9 | Chaque message reprend la dernière prestation du compte et le temps écoulé depuis. | K:56 | B | test_c4_03_message | — | 0 | 0 | — |
| K10 | Un compte sans réponse reçoit un second message, puis il sort du cycle. | K:57 | B | test_c4_03_cycle | — | 0 | 0 | — |
| K11 | Les règles de ton et de contenu s'écrivent en français, sans case à cocher. | K:58 | C (**`atteste: true` à tort**) | signature seule | voir 22 | (dans 22) | 1 | modèle de langue |
| K12 | Un compte reçoit deux messages en tout, espacés d'au moins trois jours. | K:59 | B | test_c4_03_cycle | contredit 17 et 40 côté page | 0 | 0 | — |
| K13 | Une réponse, même négative, arrête la séquence et vous rend la conversation. | K:60 | B | test_c4_03_reponse | — | 0 | 0,5 | **T** : réception |
| K14 | Les comptes déjà contactés par un commercial sont écartés de la vague en cours. | K:61 | B | test_c4_05_exclusions | — | 0 | 0 | — |
| K15 | Les messages partent par courriel, depuis la boîte de votre entreprise. | K:62 | C (**`atteste: true` à tort**) | courriel préparé (essai) | voir 18 | 0 | 2 | **T** |
| K16 | Les vagues s'enchaînent au rythme convenu, et chaque exécution laisse son bilan. | K:63 | B | test_c4_03_cycle, bilan `offload.cycle` | rythme hebdomadaire réglable (voir 52) | (dans 52) | 0 | — |
| K17 | Les entretiens, révisions et contrôles périodiques sont suivis jusqu'à leur échéance. | K:71 | B | test_c4_07_echeances | — | 0 | 0,25 | — |
| K18 | Chaque échéance est datée à partir de la dernière intervention enregistrée. | K:72 | B | test_c4_07_echeances | — | 0 | 0 | — |
| K19 | Le client est prévenu la semaine qui précède, pas le jour où l'échéance tombe. | K:73 | B | test_c4_07_echeances | — | 0 | 0 | — |
| K20 | Une échéance déjà honorée ailleurs sort du cycle dès que la date est connue. | K:74 | B | test_c4_07_echeances | — | 0 | 0 | — |
| K21 | Les contrats d'entretien qui s'éteignent faute de reconduction sont signalés. | K:75 | B | test_c4_07_contrats_et_parc | — | 0 | 0 | — |
| K22 | Les équipements installés sont rattachés au compte qui les exploite. | K:76 | B | test_c4_07_import_et_groupe | — | 0 | 0 | — |
| K23 | Un parc réparti sur plusieurs sites se lit site par site et en consolidé. | K:77 | B | test_c4_07_contrats_et_parc (`offload_parc`) | — | 0 | 0 | — |
| K24 | Les échéances réglementaires sont distinguées des échéances commerciales. | K:78 | B | test_c4_07_echeances | — | 0 | 0 | — |
| K25 | Les commandes arrivées qu'aucun client n'est venu reprendre sont listées. | K:86 | B | test_c4_08_cycle, test_c4_08_import | — | 0 | 0,25 | — |
| K26 | Les interventions terminées et non retirées sont relancées après le délai que vous fixez. | K:87 | B | test_c4_08_inactif_et_reponse | — | 0 | 0 | — |
| K27 | Le stock immobilisé par une commande non reprise est chiffré. | K:88 | B | test_c4_08_cycle | — | 0 | 0 | — |
| K28 | Une pièce commandée pour un compte inactif est rattachée à sa fiche. | K:89 | B | test_c4_08_inactif_et_reponse | — | 0 | 0 | — |
| K29 | Les affaires closes sans suite sont distinguées de celles qui attendent encore. | K:90 | B | test_c4_08_cycle, test_c4_08_import | — | 0 | 0 | — |
| K30 | Un compte relancé deux fois sans réponse passe en décision manuelle. | K:91 | B | test_c4_08_cycle | — | 0 | 0 | — |
| K31 | La relance de retrait ne porte aucune mention de paiement, qui relève de CASHD. | K:92 | B | test_c4_08_cycle | — | 0 | 0 | — |
| K32 | Le magasin voit en une liste ce qui dort et depuis combien de temps. | K:93 | B | test_c4_08_cycle ; écran « Affaires restées en plan » | — | 0 | 0 | — |
| K33 | Un compte suivi en direct par un commercial est exclu du cycle automatique. | K:100 | B | test_c4_05_reprise_en_main | — | 0 | 0 | — |
| K34 | Le commercial en charge reprend la main sur un compte d'un seul geste. | K:101 | B | test_c4_05_reprise_en_main | — | 0 | 0 | — |
| K35 | Aucun prix ni aucun délai n'est avancé dans un message sans que vous l'ayez écrit. | K:102 | B | test_c4_03_message | — | 0 | 0 | — |
| K36 | Une demande d'arrêt vaut retrait immédiat et définitif du cycle. | K:103 | B | test_c4_03_reponse | — | 0 | 0,5 | **T** : réception |
| K37 | Les listes d'exclusion se tiennent par compte, par secteur et par commercial. | K:104 | B | test_c4_05_exclusions | — | 0 | 0 | — |
| K38 | Le système s'arrête de lui-même au premier doute, et vous le signale. | K:105 | C (**`atteste: true` à tort**) | voir 64 | voir 64 | (dans 64) | — | — |
| K39 | Chaque message parti reste au journal, daté et consultable. | K:106 | B | test_c4_03_cycle | — | 0 | 0 | — |
| K40 | Le chiffre d'affaires remis en jeu se lit vague par vague. | K:113 | B (après pose c4_09) | test_c4_09_pilotage | pose | 0 | 0,25 | — |
| K41 | Les comptes réactivés sont suivis jusqu'à leur première commande. | K:114 | B | test_c4_03_issues | — | 0 | 0 | — |
| K42 | Le taux de réponse se compare par segment, par canal et par message. | K:115 | B (après pose c4_09) | test_c4_09_pilotage | les messages d'échéance n'ont pas de réponse rattachée | 0 | 0 | — |
| K43 | Les échéances honorées et les commandes reprises alimentent un tableau de suivi. | K:116 | B (après pose c4_09) | test_c4_09_pilotage | — | 0 | 0 | — |
| K44 | Les résultats se lisent par entité, par site et en consolidé. | K:117 | B (après pose c4_09) | test_c4_09_pilotage | — | 0 | 0 | — |
| K45 | Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe. | K:118 | B (après pose c4_09) | test_c4_09_arretes ; boutons « Exporter vers un tableur » | — | 0 | 0 | — |

## Ce qu'il reste à construire (→B), regroupé

| Chantier | Lignes | Jours |
|---|---|---|
| Règles en français et rédaction sous règles (modèle de langue + contrôle du message produit) | 21, 22, 23, 46, 55, K11 | 6 |
| Cadence de vague réglable (jour, heure), plafond « une séquence par trimestre », canal unique | 17, 40, 41, 51, 52, K16 | 2 |
| Lien CASHD : facture en retard ou litige → hors vague | 19, 23, 69 | 1,5 |
| Réponses automatiques (absence, départ) et compte « à vérifier » après un échec | 63, 65 | 1,5 |
| Vue par raison sociale mère | 66, K6 | 2 |
| Coupe-circuit au premier doute | 21, 49, 64, K38 | 2 |
| Modèles « chantiers » et « missions » | 34, 35 | 2,5 |
| Envoi sans validation par type de message (« ce qui part seul ») | 48 | 1 |
| Restitution et effacement à la sortie | 58 | 1,5 |
| Petits écarts (message échéance et dernière facture, jeu « contacts », levée d'opposition en un geste, validations par courriel) | 25, 39, 62, 73 | 3 |
| **Total** | | **23** |

Corrections de texte proposées à Teo à la place de la construction (0 j chacune, aucune faite ici) :
- 17 / 40 « un message par trimestre » → « une séquence par trimestre » ;
- 51 / 52 « mardi » → « au rythme convenu » ;
- 79 retirer « et y réécrit l'état de chaque compte » ;
- 39 « dans votre messagerie » → « dans votre espace » ;
- 7 « OFFLOAD lit les deux » → « OFFLOAD lit leurs exports et les réponses ».

## Mise en vrai (B→A), commune

| Étape | Jours | Tiers |
|---|---|---|
| Expéditeur réel à l'adresse du client (passage essai → réel, en-têtes, réponse rattachée) | 2 | **T** : OAuth Gmail / M365 du client, SPF / DKIM (A2) |
| Réception des réponses dans `receptions` depuis la messagerie du client | 1 | **T** (A2) |
| Calage des modèles d'export sur les vrais fichiers du pilote (ventes, clients, parc, affaires) | 2 | **T** : client pilote et ses exports |
| Observation de la première vague réelle, nom par nom | calendaire : 2 à 3 semaines | pilote |
| Annexe des prestataires, vérification des régions d'hébergement | — | **T** : juridique |
| **Total** | **5** | |
