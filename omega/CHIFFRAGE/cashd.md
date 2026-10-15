# CASHD — chiffrage de ce qui reste à construire, promesse par promesse

C2, 06/10/2026, 18 h 31 Z (heure du conteneur). Demande de Teo, relayée par le coordinateur : « estime ce qui reste à construire pour avoir vraiment un truc livrable, et vérifie toutes les petites promesses ». Lu sur main c0494b4 (vitrine), **aucun fichier du site public modifié**.

## Synthèse

1. **Par état** (117 promesses) : A 0 · B 71 · C 38 · D 1 · T 7. Rien n'est prouvé EN VRAI : aucun client réel, aucun envoi réel (le banc est en essai et ses envois sont gardés).
2. **Jours → B** : 38 j, dont 18,5 j dans CASHD et 19,5 j chez d'autres (A1 connecteur du facturier, A2 boîte d'envoi / WhatsApp / AR24, serveur, socle). 22 lacunes, détaillées plus bas, chacune comptée une seule fois même quand plusieurs promesses en dépendent.
3. **Jours B → A** : 13 j de travail (6 j de pilote chez un premier client + 7 j pour provoquer les cas rares avec lui), et **au moins 30 à 45 jours de calendrier** : la mise en demeure n'arrive qu'à J+30, on ne la prouve pas plus vite.
4. **Tiers / achats de Teo** : AR24 (LRE, prix par envoi sur devis) ; prestataire de paiement de chaque client (Stripe ~1,5 % + 0,25 €) ; vérification d'application Google et Microsoft pour l'envoi depuis la boîte du client (gratuit, plusieurs semaines) ; WhatsApp Business (Meta, ~0,05–0,10 € par conversation) ; région d'hébergement, CGV, DPA à confirmer. Taux BCE : gratuits.
5. **Pour UN premier client réel** : (a) son facturier chaque jour — connecteur G1 (3 j) ou, à défaut, un dépôt quotidien fait par lui et la page reformulée ; (b) un envoi réel de courriel — au minimum par l'expéditeur du socle avec un domaine authentifié, idéalement depuis sa boîte (G4, 4,5 j chez A2 + vérification Google/Microsoft) ; (c) ses textes : formule, signature, interdits (0,5 j) ou de vrais gabarits rédigés avec lui (G2, 3 j) ; (d) l'écran dans /espace2 (C1, en cours) ; (e) contrat et CGV (Teo). Soit **6,5 j au minimum** (pilote + réglage des textes, dépôt manuel assumé) et **~16,5 j pour tenir la page telle qu'elle est écrite** sur ces points, plus un mois de calendrier.
6. **Avis honnête** : le cœur promis (relire, écrire, faire valider, couper au règlement, escalader jusqu'à la mise en demeure, lettrer, compter) est construit et testé (B) ; il n'a jamais tourné sur une vraie créance. La page en dit plus que le produit sur trois points : le facturier « relu chaque matin » suppose un connecteur qui n'existe pas, les textes ne sont ni rédigés avec le client ni variés, et les quatre captures montrées sont celles d'une maquette. À corriger soit en construisant (G1, G2, G3, G14 : ~10,5 j), soit en reformulant la page (une demi-journée de texte, à faire par le propriétaire de la vitrine).

Légende — **A** prouvé EN VRAI · **B** construit et testé sur la recette · **C** partiel · **D** pas construit · **T** tiers, compte ou achat de Teo. Tests : t1 = `test_c2_01_donnees`, t2 = `test_c2_02_export`, t3 = `test_c2_03_moteur`, t4 = `test_c2_04_capacites` (les quatre verts sur la recette le 06/10 : t2 et t3 à 17 h 25 Z, t1 et t4 à 19 h 05 Z, heures du coordinateur). « Jours » : actuel → B est porté par la lacune (colonne « Ce qui manque ») et compté une fois dans le tableau des lacunes ; B → A est propre à la ligne (cas rare à provoquer chez le client pilote), le pilote lui-même étant compté à part.

## Promesses


### Page /offres/relances-impayes

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours → B / B → A | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| P1 | Vos factures attendent d'être payées | `lib/produits/relances.ts:78` | B | constat, pas une capacité | — | 0 / 0 | — |
| P2 | Des devis attendent une réponse et des factures ont dépassé leur échéance. Chaque matin, une relance est déjà rédigée pour chaque compte, et vos équipes décident si elle part. | `lib/produits/relances.ts:85-86` | C | cron cashd-matin, cashd_preparer_relances, file de validation (t3) ; « chaque matin » suppose un facturier frais | G1 | 3 / 0,2 | selon la source (OAuth Google / Microsoft : vérification d'application) |
| P3 | Vous ne changez aucun de vos outils — Google Sheets, Excel, Gmail, Outlook, WhatsApp | `lib/produits/relances.ts:110-111` | C | Excel et CSV : import et dépôt d'export (t1, t2) ; Google Sheets : par export seulement ; Gmail / Outlook : non branchés ; WhatsApp : absent | G1, G4, G13 | 3+4,5+4 / 0,5 | selon la source (OAuth Google / Microsoft : vérification d'application); vérification d'application Google (portée gmail.send) et Microsoft (éditeur vérifié) : gratuit, plusieurs semaines; WhatsApp Business : compte Meta vérifié + coût par conversation (~0,05–0,10 € en France) |
| P4 | À 7 h, vos relances sont déjà écrites. | `lib/produits/relances.ts:137` | B | heure_relances, passage toutes les 10 min (t3) | — | 0 / 0 | — |
| P5 | CASHD relit votre facturier chaque matin, avant d'écrire quoi que ce soit. | `lib/produits/relances.ts:144` | C | relit le dernier relevé intégré avant d'écrire (t2, t3) | G1 | 3 / 0 | selon la source (OAuth Google / Microsoft : vérification d'application) |
| P6 | Chaque devis porte ses jours sans réponse | `lib/produits/relances.ts:153` | B | jours_ecoules (t1) ; écran | — | 0 / 0 | — |
| P7 | Chaque facture porte son retard et son montant | `lib/produits/relances.ts:154` | B | cashd_factures_etat (t1) | — | 0 / 0 | — |
| P8 | Un règlement encaissé la veille sort de la liste | `lib/produits/relances.ts:155` | C | vrai si le règlement est dans l'export ou saisi (t2, t3) | G1 | 3 / 0 | selon la source (OAuth Google / Microsoft : vérification d'application) |
| P9 | Le message est déjà rédigé quand vous ouvrez votre espace, et il ne reste qu'à le relire. | `lib/produits/relances.ts:161` | B | relances a_valider avec texte (t3) ; écran | — | 0 / 0 | — |
| P10 | Le ton suit le montant et l'ancienneté du retard | `lib/produits/relances.ts:169` | C | le ton suit le palier (donc l'ancienneté) ; le montant ne change que la validation (seuil direction) | G3 | 2 / 0 | — |
| P11 | L'historique de paiement du client pèse aussi | `lib/produits/relances.ts:170` | B | cashd_payeur_en_retard retire « simple oubli » (t3) — effet mince | G3 | 2 / 0 | — |
| P12 | Un client ne reçoit jamais deux fois le même texte | `lib/produits/relances.ts:171` | C | textes différents par palier ; deux rappels à des mois d'écart sont identiques | G3 | 2 / 0 | — |
| P13 | Tout ce qui doit partir passe par une file de validation, qui reste la seule porte de sortie du système. | `lib/produits/relances.ts:178` | B | preparer_envoi adossé à demandes_validation (t3) ; gardes du socle | — | 0 / 0,2 | — |
| P14 | Aucun message ne part sans votre accord | `lib/produits/relances.ts:186` | B | t3 | — | 0 / 0 | — |
| P15 | La mise en demeure exige une validation explicite | `lib/produits/relances.ts:187` | B | commentaire exigé, jamais de politique couvrante (t3) | — | 0 / 0 | — |
| P16 | Une suspension coupe même ce qui est déjà prêt | `lib/produits/relances.ts:188` | B | cashd_couper sur pause (t3) | — | 0 / 0 | — |
| P17 | J 0 · Facture émise · le suivi s'ouvre automatiquement | `lib/produits/relances.ts:210` | C | à l'intégration de l'export (t2) | G1 | 3 / 0 | selon la source (OAuth Google / Microsoft : vérification d'application) |
| P18 | J+7 · Rappel courtois · le ton se cale sur l'historique de paiement | `lib/produits/relances.ts:211` | B | t3 (P11) | — | 0 / 0 | — |
| P19 | J+21 · Relance ferme · elle récapitule les sommes dues et fixe une échéance | `lib/produits/relances.ts:213-215` | B | texte « Total restant dû … au plus tard le » (t3) | — | 0 / 0 | — |
| P20 | J+30 · Mise en demeure préparée · elle attend votre signature et ne part jamais seule | `lib/produits/relances.ts:218-220` | B | t3 | — | 0 / 0,2 | — |
| P21 | Les devis suivent une cadence plus resserrée, J+3 puis J+7 | `lib/produits/relances.ts:223` | C | scénario devis par défaut 3 / 10, réglable (t3) — la page dit « J+7 », le moteur relance 7 jours APRÈS le rappel (J+10) ; le catalogue (ligne 10) dit bien « sept jours après ce rappel » | écart de texte : régler le défaut à 3/7 (0 j, une valeur) ou corriger la page | 0 / 0 | — |
| P22 | Chaque ligne porte le client, le montant dû et les jours de retard, et elle se met à jour à chaque relecture. | `lib/produits/relances.ts:261` | B | t1, t2 | — | 0 / 0 | — |
| P23 | Le facturier est relu avant chaque envoi, donc un règlement encaissé la veille coupe la séquence avant qu'elle reparte. Un client qui a payé n'est jamais relancé. | `lib/produits/relances.ts:267` | C | coupure au règlement intégré (t3) ; « jamais » dépend de la fraîcheur de l'export | G1 | 3 / 0 | selon la source (OAuth Google / Microsoft : vérification d'application) |
| P24 | Chaque message est écrit à partir du montant, de l'ancienneté du retard et du palier atteint. | `lib/produits/relances.ts:273` | B | montant et retard dans le texte, palier → ton (t3) | — | 0 / 0 | — |
| P25 | Le système date et archive chaque message, si bien que le jour où un client affirme n'avoir rien reçu, la preuve est disponible. | `lib/produits/relances.ts:278` | B | envois + journal_opposable + dossier (t4) ; preuve de REMISE réelle seulement après un vrai envoi | — | 0 / 0,2 | — |
| P26 | Votre espace tient en quatre écrans — Débiteurs, Relances, Envois, Trésorerie ; les captures ci-dessous sont celles de l'espace, montrées telles quelles. | `lib/produits/relances.ts:295-325` | C | l'écran réel /espace/cashd tient en une page (encours, relances, fiche, pilotage) ; les captures viennent de l'ancienne maquette | G14 | 2,5 / 0 | — |
| P27 | Aucun outil à remplacer · Rien ne part sans vous · Vos données restent chez vous | `lib/produits/relances.ts:328` | C | 1 : voir P3 ; 2 : B ; 3 : données dans la base Omega, pas « chez vous » au sens strict | G22 (formulation) | 0 / 0 | aucun si la région est déjà UE |
| P28 | Conçu et développé en France ; rien n'est sous-traité ailleurs. | `lib/produits/relances.ts:373-375` | T | déclaration d'entreprise | G22 | 0 / 0 | aucun si la région est déjà UE |
| P29 | Vos données sont hébergées dans l'Union européenne. Espace chiffré et distinct. Le système n'en extrait que le nécessaire, jamais votre facturier entier. | `lib/produits/relances.ts:378-380` | T | RLS par organisation (t1) ; CASHD n'envoie AUCUNE donnée à un modèle (textes déterministes) ; région d'hébergement à confirmer | G22 | 0 / 0 | aucun si la région est déjà UE |
| P30 | L'assistance se fait en français, par les personnes qui ont installé le système chez vous. | `lib/produits/relances.ts:383-385` | T | organisation d'Omega | G22 | 0 / 0 | aucun si la région est déjà UE |
| P31 | Facturation en euros, droit français | `lib/produits/relances.ts:388-390` | T | CGV / contrat | G22 | 0 / 0 | aucun si la région est déjà UE |
| P32 | Et si un client paie entre deux relances ? … Un règlement enregistré interrompt la séquence sur-le-champ. | `lib/produits/relances.ts:412-413` | B | t3 (coupure à l'intégration) | — | 0 / 0 | — |
| P33 | Les gabarits sont rédigés avec vous à l'installation, puis adaptés par le système à chaque situation. Le ton reste le vôtre. | `lib/produits/relances.ts:416-417` | C | formule, signature, interdits réglables ; corps des textes fixes | G2 | 3 / 0 | — |
| P34 | Le ton reste le vôtre, le vouvoiement est constant, et vous lisez chaque message avant qu'il parte. | `lib/produits/relances.ts:421` | B | textes au vouvoiement ; validation (t3) | — | 0 / 0 | — |
| P35 | Une liste blanche est établie à l'installation et modifiable à tout moment … et seul vous pouvez les y remettre. | `lib/produits/relances.ts:430-431` | B | cashd_statut_compte hors_perimetre, retour par décision motivée (t3) | — | 0 / 0 | — |
| P36 | Le système lit le tableur ou l'outil où vit déjà votre facturation, avec vos colonnes et vos habitudes. Aucun compte à ouvrir ni aucune donnée à migrer. | `lib/produits/relances.ts:434-435` | C | modèle cashd/tableur à synonymes d'en-têtes (t2) ; « l'outil » : pas de connecteur logiciel | G1 | 3 / 0 | selon la source (OAuth Google / Microsoft : vérification d'application) |
| P37 | Le système ne remplace personne. Il prépare les relances, puis cette personne les relit et décide de ce qui part. | `lib/produits/relances.ts:438-439` | B | t3 ; écran | — | 0 / 0 | — |
| P38 | Pour rédiger un message, le système transmet à un modèle le strict nécessaire … jamais votre facturier entier. | `lib/produits/relances.ts:448-449` | B | plus strict que promis : aucun modèle n'est appelé, rien ne sort | à reformuler si G5 n'est pas fait | 0 / 0 | — |
| P39 | Un message peut-il partir sans moi ? Non. … vous approuvez, vous corrigez ou vous suspendez. | `lib/produits/relances.ts:452-453` | B | file de validation ; corriger = cashd_regler_relances / texte modifiable avant envoi (t3) | — | 0 / 0 | — |
| P40 | Le tarif dépend de votre encours et du nombre de comptes à suivre … nous chiffrons votre cas sur vos volumes réels. | `lib/produits/relances.ts:456-457` | T | commercial | grille de prix de Teo | 0 / 0 | — |
| P41 | Vous connectez le tableur que vous tenez déjà, puis vos équipes relisent chaque relance avant qu'elle parte : le système ne demande rien d'autre. | `lib/produits/relances.ts:473-475` | C | dépôt d'export (t2) ; « connecter » suppose un lien permanent | G1 | 3 / 0 | selon la source (OAuth Google / Microsoft : vérification d'application) |

### Catalogue (lib/produits/capacites/relances.ts, 50 lignes)

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours → B / B → A | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| C1 | Le système relit votre facturier chaque matin, avant d'écrire la moindre relance. | `lib/produits/capacites/relances.ts:33` | C | relit le dernier relevé (t2, t3) | G1 | 3 / 0 | selon la source (OAuth Google / Microsoft : vérification d'application) |
| C2 | Chaque devis porte le nombre de jours écoulés depuis son envoi. | `lib/produits/capacites/relances.ts:34` | B | t1 ; écran | — | 0 / 0 | — |
| C3 | Chaque facture porte son montant dû, son retard et le compte concerné. | `lib/produits/capacites/relances.ts:35` | B | t1 | — | 0 / 0 | — |
| C4 | Un règlement encaissé la veille sort de la liste du jour. | `lib/produits/capacites/relances.ts:36` | C | t2 (dépend de l'export) | G1 | 3 / 0 | selon la source (OAuth Google / Microsoft : vérification d'application) |
| C5 | La balance âgée range l'encours par tranche d'ancienneté, compte par compte. | `lib/produits/capacites/relances.ts:37` | B | cashd_balance_agee (t1, t4) ; écran | — | 0 / 0 | — |
| C6 | Chaque ligne indique l'état de la relance et le palier suivant. | `lib/produits/capacites/relances.ts:38` | B | cashd_suivi (t3) ; écran | — | 0 / 0 | — |
| C7 | Un échéancier négocié remplace l'échéance d'origine, et le suivi épouse ses termes. | `lib/produits/capacites/relances.ts:39` | B | cashd_poser_echeancier (t4) | — | 0 / 0,5 | — |
| C8 | Les devis sans réponse sont suivis au même titre que les factures échues. | `lib/produits/capacites/relances.ts:40` | B | t3 | — | 0 / 0 | — |
| C9 | Une facture échue suit trois paliers : deux relances, puis la mise en demeure. | `lib/produits/capacites/relances.ts:47` | B | t3 | — | 0 / 0 | — |
| C10 | Un devis sans réponse est relancé au troisième jour, puis sept jours après ce rappel. | `lib/produits/capacites/relances.ts:48` | B | t3 | — | 0 / 0 | — |
| C11 | La fermeté du message suit le palier atteint, du rappel à la mise en demeure. | `lib/produits/capacites/relances.ts:49` | B | t3 (trois textes) | — | 0 / 0 | — |
| C12 | Chaque message reprend le secteur du compte, sa référence, son montant et son retard. | `lib/produits/capacites/relances.ts:50` | B | t3 | — | 0 / 0 | — |
| C13 | Les relances partent par courriel, depuis la boîte de votre entreprise. | `lib/produits/capacites/relances.ts:51` | C | courriel par l'expéditeur du socle ; pas depuis la boîte de l'entreprise | G4 | 4,5 / 0 | vérification d'application Google (portée gmail.send) et Microsoft (éditeur vérifié) : gratuit, plusieurs semaines |
| C14 | Au-delà d'un montant que vous fixez, la relance remonte à la direction avant l'envoi. | `lib/produits/capacites/relances.ts:52` | B | seuil_direction → regles_validation (t3) | — | 0 / 0 | — |
| C15 | Chaque facture suit sa propre séquence, avec son palier et son échéance. | `lib/produits/capacites/relances.ts:53` | B | cashd_relances_pieces (t3) | — | 0 / 0 | — |
| C16 | Les envois respectent les jours ouvrés, les jours fériés locaux et vos fenêtres horaires. | `lib/produits/capacites/relances.ts:54` | B | calendrier du socle (t4 « un samedi ») ; fenêtres : reglages_envois | — | 0 / 0 | — |
| C17 | Les comptes export reçoivent leur relance dans leur langue de facturation. | `lib/produits/capacites/relances.ts:55` | C | français et anglais (t3) | G6 | 1 / 0 | traduction relue ~150–300 € par langue |
| C18 | Une contestation écrite bascule la facture en litige et la sort du cycle. | `lib/produits/capacites/relances.ts:62` | C | bascule par geste humain (t3) ; la réponse reçue est signalée, pas lue | G5 | 2,5 / 0 | appel de modèle de langue : quelques centimes par réponse lue |
| C19 | Le commercial en charge du compte est notifié dès l'ouverture du litige. | `lib/produits/capacites/relances.ts:63` | B | cashd_alerter_commercial (t4) | — | 0 / 0 | — |
| C20 | Une facture contestée sur une seule ligne laisse le reste en relance. | `lib/produits/capacites/relances.ts:64` | B | cashd_litige_partiel (t4) | — | 0 / 0,5 | — |
| C21 | La reprise des relances demande une décision, jamais un simple délai écoulé. | `lib/produits/capacites/relances.ts:65` | B | motif obligatoire (t3) | — | 0 / 0 | — |
| C22 | Le contact de facturation reçoit les relances, le contact commercial reçoit les alertes. | `lib/produits/capacites/relances.ts:66` | B | t4 | — | 0 / 0 | — |
| C23 | Un compte se met en pause ou sort du périmètre à tout moment. | `lib/produits/capacites/relances.ts:67` | B | t3 ; écran | — | 0 / 0 | — |
| C24 | La mise en demeure est préparée, puis elle attend une validation explicite. | `lib/produits/capacites/relances.ts:68` | B | t3 | — | 0 / 0 | — |
| C25 | Le dossier de litige réunit les pièces, les envois et les accusés de réception. | `lib/produits/capacites/relances.ts:69` | B | cashd_dossier (t4) — accusés réels : après G16 | — | 0 / 0,5 | — |
| C26 | Le courrier recommandé électronique est préparé quand la créance l'exige. | `lib/produits/capacites/relances.ts:70` | T | préparé en canal lre au-delà de seuil_lre (t4) ; ne part pas sans AR24 | G16 | 2 / 0 | contrat AR24 (prix par envoi sur devis, de l'ordre de quelques euros) |
| C27 | Un règlement enregistré interrompt la séquence avant le prochain envoi. | `lib/produits/capacites/relances.ts:77` | B | t3 ; écran | — | 0 / 0 | — |
| C28 | Les règlements partiels sont imputés, et le solde dû continue d'être suivi. | `lib/produits/capacites/relances.ts:78` | B | t1 | — | 0 / 0 | — |
| C29 | Le lettrage rapproche chaque encaissement de la facture qu'il solde. | `lib/produits/capacites/relances.ts:79` | B | t1, t2 | — | 0 / 0 | — |
| C30 | Les écritures bancaires sont rapprochées de l'encours, jour après jour. | `lib/produits/capacites/relances.ts:80` | C | par export du relevé (t2) ; « jour après jour » suppose un dépôt quotidien | G1 | 3 / 0 | selon la source (OAuth Google / Microsoft : vérification d'application) |
| C31 | Un virement sans référence est proposé au rapprochement avec les factures probables. | `lib/produits/capacites/relances.ts:81` | B | cashd_propositions (t1) | — | 0 / 0,5 | — |
| C32 | Les avoirs et les acomptes sont déduits avant tout calcul du solde dû. | `lib/produits/capacites/relances.ts:82` | B | t1, t3 | — | 0 / 0 | — |
| C33 | Les pénalités de retard et l'indemnité forfaitaire de recouvrement sont calculées. | `lib/produits/capacites/relances.ts:83` | B | cashd_penalites (t3) | — | 0 / 0 | — |
| C34 | Un lien de paiement accompagne la relance et s'éteint dès le règlement. | `lib/produits/capacites/relances.ts:84` | T | contrat d'interface (t4) ; aucun prestataire branché | G15 | 2,5 / 0 | compte du prestataire de chaque client (Stripe : ~1,5 % + 0,25 € par carte UE ; SEPA ~0,35 €) |
| C35 | Les factures en devise étrangère sont suivies dans leur devise et en euros. | `lib/produits/capacites/relances.ts:85` | B | cashd_taux_change (t4) ; taux saisis à la main | G17 | 0,5 / 0,5 | aucun (taux publics) |
| C36 | Un plafond d'encours se fixe par compte, à partir de son historique. | `lib/produits/capacites/relances.ts:92` | B | cashd_proposer_plafond (t4) | — | 0 / 0,5 | — |
| C37 | Le dépassement du plafond déclenche une alerte avant toute nouvelle commande. | `lib/produits/capacites/relances.ts:93` | B | cashd_alerter_plafonds (t4) | — | 0 / 0 | — |
| C38 | Une commande au-delà du plafond est bloquée jusqu'à la décision d'un responsable. | `lib/produits/capacites/relances.ts:94` | C | porte cashd_verifier_commande (t4) ; aucun logiciel de commandes ne l'appelle | G19 | 1,5 / 0,5 | selon le logiciel de commandes |
| C39 | Vos règles de communication et vos interdits sont repris dans chaque message. | `lib/produits/capacites/relances.ts:95` | B | t3 | — | 0 / 0 | — |
| C40 | Un compte qui se dégrade est signalé avant que le retard s'installe. | `lib/produits/capacites/relances.ts:96` | B | t4 (assertion stricte) | — | 0 / 0 | — |
| C41 | Un compte se met en pause, et il n'y revient que sur votre décision. | `lib/produits/capacites/relances.ts:97` | B | t3 | — | 0 / 0 | — |
| C42 | Le dossier destiné à l'assurance-crédit est constitué avec les pièces exigées. | `lib/produits/capacites/relances.ts:98` | C | dossier (t4) sans les PDF | G20 | 1 / 0 | — |
| C43 | Le dossier de recouvrement judiciaire est remis complet à qui vous désignez. | `lib/produits/capacites/relances.ts:99` | B | cashd_remettre_dossier (t4) | — | 0 / 0,5 | — |
| C44 | Le délai moyen de règlement se mesure compte par compte. | `lib/produits/capacites/relances.ts:106` | B | t4 | — | 0 / 0 | — |
| C45 | La prévision d'encaissement est établie à trente et à soixante jours. | `lib/produits/capacites/relances.ts:107` | B | t4 | — | 0 / 0 | — |
| C46 | Chaque relance partie est datée et consignée, avec son objet et son destinataire. | `lib/produits/capacites/relances.ts:108` | B | envois + journal ; écran | — | 0 / 0 | — |
| C47 | Le taux de réponse aux relances se suit palier par palier. | `lib/produits/capacites/relances.ts:109` | B | vue cashd_reponses ; écran — aucune réponse réelle encore | — | 0 / 0 | — |
| C48 | Les créances en litige, en pause et en recouvrement sont comptées en continu. | `lib/produits/capacites/relances.ts:110` | B | t4 | — | 0 / 0 | — |
| C49 | Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe. | `lib/produits/capacites/relances.ts:111` | B | boutons Tableur ; arrêté mensuel (t4) | — | 0 / 0 | — |
| C50 | Les seuils et les cadences se modifient, et chaque changement reste daté. | `lib/produits/capacites/relances.ts:112` | B | cashd_historique_reglages (t4) | — | 0 / 0 | — |

### Les douze cas tordus

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours → B / B → A | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| L1 | Le client a payé hier soir, et la relance était prête. | `lib/produits/capacites/relances.ts:125` | C | coupure au règlement intégré (t3) | G1 | 3 / 0 | selon la source (OAuth Google / Microsoft : vérification d'application) |
| L2 | Le client conteste une seule ligne de la facture. | `lib/produits/capacites/relances.ts:129` | B | t4 | — | 0 / 0,5 | — |
| L3 | Le client demande à régler en plusieurs fois. | `lib/produits/capacites/relances.ts:133` | B | t4 (échéance manquée → relance de l'échéance) | — | 0 / 0,5 | — |
| L4 | Votre interlocuteur a quitté l'entreprise du client. Le rejet du message ou la réponse d'absence définitive signale l'adresse. | `lib/produits/capacites/relances.ts:137` | C | rebond → attente_contact (cashd_suivre_envoi) ; l'assertion (t4) a une branche de repli quand aucun envoi n'est réglé, ce qui est le cas tant que les envois sont gardés ; l'absence définitive n'est pas lue | G5 | 2,5 / 0,5 | appel de modèle de langue : quelques centimes par réponse lue |
| L5 | Deux filiales du même groupe client doivent être relancées séparément. | `lib/produits/capacites/relances.ts:141` | B | un compte par entité, tableau par entité et consolidé (t1) | — | 0 / 0 | — |
| L6 | Un virement arrive sans aucune référence … Tant que l'imputation n'est pas tranchée, la séquence du compte est suspendue. | `lib/produits/capacites/relances.ts:145` | B | t1, t3 | — | 0 / 0 | — |
| L7 | Le montant restant dû est de quelques euros. Un seuil de relance se fixe par entité … | `lib/produits/capacites/relances.ts:149` | C | seuil_relance par organisation (t1) | G9 | 0,5 / 0 | — |
| L8 | Le client est aussi l'un de vos fournisseurs. Le compte est signalé comme réciproque et sort du cycle automatique. | `lib/produits/capacites/relances.ts:153` | B | cashd_comptes.reciproque exclu de la préparation | — | 0 / 0 | — |
| L9 | Le dossier est passé entre les mains d'un avocat … toute relance commerciale cesse, y compris celle qui était déjà rédigée. | `lib/produits/capacites/relances.ts:157` | B | cashd_remettre_dossier (t4) | — | 0 / 0 | — |
| L10 | Le client demande expressément l'arrêt des relances … le journal garde la trace des deux décisions. | `lib/produits/capacites/relances.ts:161` | B | hors_perimetre + journal (t3) | — | 0 / 0 | — |
| L11 | Le devis a été accepté de vive voix … Vous consignez l'accord oral, ce qui arrête la relance et ouvre le suivi de la facturation à venir. | `lib/produits/capacites/relances.ts:165` | C | statut « accepte » arrête la relance ; rien n'ouvre le suivi de la facture à venir | G8 | 0,5 / 0 | — |
| L12 | La facture attend un bon de commande chez le client … la relance vise le service qui doit émettre ce bon. | `lib/produits/capacites/relances.ts:169` | D | colonne commande_ref lue, rien d'autre | G7 | 1 / 0 | — |

### À l'échelle d'un groupe

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours → B / B → A | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| E1 | Chaque société, filiale ou site a son encours … un chargé de recouvrement ne voit que son portefeuille. | `lib/produits/capacites/relances.ts:185` | C | périmètre par entité (RLS, t1) ; pas par chargé | G10 | 1,5 / 0 | — |
| E2 | Suivi, validation des relances, gestion des litiges et administration sont quatre rôles distincts. Une délégation se pose pour une absence et s'éteint à la date prévue. | `lib/produits/capacites/relances.ts:191` | B | rôles et délégations du socle ; CASHD exige gestion / validation (t1, t3) | — | 0 / 0 | — |
| E3 | Le montant et le palier décident de qui valide : le chargé de compte, le responsable crédit, la direction financière. | `lib/produits/capacites/relances.ts:197` | C | un seul seuil direction (t3) | G11 | 1 / 0 | — |
| E4 | … un journal qui ne se modifie pas, y compris par nous. | `lib/produits/capacites/relances.ts:203` | C | journal_opposable du socle | G18 | 1 / 0 | horodatage qualifié éventuel |
| E5 | Le système lit votre facturation et vos encaissements là où ils vivent déjà, tableur compris. Là où un connecteur manque, l'échange passe par dépôt de fichiers ou par interface de programmation. | `lib/produits/capacites/relances.ts:209` | C | dépôt de fichiers (t2) ; API non offerte | G1, G12 | 3+2 / 0 | selon la source (OAuth Google / Microsoft : vérification d'application) |
| E6 | Encours, balance âgée, délai moyen de règlement et prévision d'encaissement se lisent par société et en consolidé, avec un export daté. | `lib/produits/capacites/relances.ts:215` | B | cashd_tableau(p_client, p_entite), arrêtés (t4) | — | 0 / 0 | — |

### Accueil, /offres, articles (lib/content.ts)

| # | Promesse (texte exact) | Où | État | Preuve | Ce qui manque | Jours → B / B → A | Coût externe / tiers |
|---|---|---|---|---|---|---|---|
| M1 | À 7 h, vos relances sont déjà écrites. — Relit le facturier chaque matin. Vous décidez ce qui part. | `app/page.tsx:687-689` | C | voir P4, P5 | G1 | 3 / 0 | selon la source (OAuth Google / Microsoft : vérification d'application) |
| M2 | Les relances partent au bon moment et s'arrêtent au règlement. | `app/page.tsx:288` | C | voir P23 | G1 | 3 / 0 | selon la source (OAuth Google / Microsoft : vérification d'application) |
| M3 | Relances, demandes entrantes, réactivation, factures fournisseurs : automatisés … sur vos outils actuels. | `app/page.tsx:192` | C | voir P3 | G1, G4 | 3+4,5 / 0 | selon la source (OAuth Google / Microsoft : vérification d'application); vérification d'application Google (portée gmail.send) et Microsoft (éditeur vérifié) : gratuit, plusieurs semaines |
| M4 | CASHD — Relance des devis · Relance des factures échues · Gradation par montant · Validation avant envoi | `app/offres/page.tsx:381-384` | C | devis, factures, validation : B ; « gradation par montant » : le montant change le valideur, pas le texte | G3 | 2 / 0 | — |
| M5 | relance graduée, rédigée au cas par cas selon le montant en jeu, l'ancienneté du retard et l'historique du compte. — Relance à J+3, J+7, J+21, aucun envoi sans votre validation. | `lib/content.ts:112-113` | C | voir P10–P12, P21 | G3 | 2 / 0 | — |
| M6 | CASHD relance aux bonnes dates avec des messages que le dirigeant valide, en proposant le règlement au comptoir, par virement ou en plusieurs fois. Chaque matin, le point du jour … | `lib/content.ts:260` | C | dates, validation, point du matin : B ; moyens de règlement non proposés dans le texte | G21 | 0,5 / 0 | — |
| M7 | … un message de suivi part, formulation cordiale, jamais le mot « relance », en proposant de passer voir le chantier ou de caler une date … vocabulaire du métier … le dirigeant valide le ton une fois pour toutes. | `lib/content.ts:287` | C | devis : deux messages cordiaux sans « relance » (t3) ; pas de vocabulaire métier ni de proposition de visite ; ton réglé par formule et interdits seulement | G2, G3 | 3+2 / 0 | — |
| M8 | rappel à l'échéance, relances progressives, proposition d'échelonnement pour les gros montants, et mise en demeure uniquement sur validation expresse du dirigeant. | `lib/content.ts:291` | C | premier rappel à J+7 et non à l'échéance ; pas de proposition d'échelonnement ; le reste B | G21 | 0,5 / 0 | — |

## Lacunes (chacune comptée une fois)

| Lacune | Ce qu'il faut construire | Jours → B | Qui | Coût externe | Promesses concernées |
|---|---|---|---|---|---|
| G1 | Arrivée automatique et quotidienne du facturier (connecteur du lecteur d'A1 : tableur en ligne, dossier partagé ou logiciel) ; aujourd'hui CASHD relit le DERNIER export déposé | 3 | A1 | selon la source (OAuth Google / Microsoft : vérification d'application) | P2, P3, P5, P8, P17, P23, P36, P41, C1, C4, C30, L1, E5, M1, M2, M3 |
| G2 | Gabarits de relance propres à chaque organisation, rédigés avec elle et modifiables à l'écran (aujourd'hui : textes fixes par palier, seules formule, signature et interdits se règlent) | 3 | C2 | — | P33, M7 |
| G3 | Variation des textes : jamais deux fois le même message au même client, ton qui suit aussi le MONTANT, vocabulaire du métier (chantier, intervention, acompte, situation) | 2 | C2 | — | P10, P11, P12, M4, M5, M7 |
| G4 | Envoi depuis la boîte de l'entreprise (Gmail / Microsoft 365 en OAuth) : branchement d'A2, CASHD n'a qu'à choisir l'expéditeur | 4,5 | A2 (+0,5 C2) | vérification d'application Google (portée gmail.send) et Microsoft (éditeur vérifié) : gratuit, plusieurs semaines | P3, C13, M3 |
| G5 | Lecture automatique des réponses reçues : contestation, absence définitive, promesse de paiement → proposition de bascule (litige, attente de contact), toujours validée par une personne | 2,5 | C2 | appel de modèle de langue : quelques centimes par réponse lue | C18, L4 |
| G6 | Langues de facturation au-delà du français et de l'anglais (par langue : textes des 6 paliers, relus par un natif) | 1 | C2 | traduction relue ~150–300 € par langue | C17 |
| G7 | Bon de commande attendu : motif de blocage consigné, relance adressée au service émetteur du bon (destinataire propre), décompte qui continue | 1 | C2 | — | L12 |
| G8 | Accord oral sur un devis : geste « accord consigné » qui arrête la cadence ET ouvre le suivi de la facture à venir (rappel si rien n'est facturé) | 0,5 | C2 | — | L11 |
| G9 | Seuil de relance des petits soldes réglé PAR ENTITÉ (il est aujourd'hui par organisation), et geste « abandonner / réclamer » le solde | 0,5 | C2 | — | L7 |
| G10 | Portefeuille par chargé de recouvrement (lecture limitée à ses comptes, en plus du périmètre par entité) | 1,5 | C2 | — | E1 |
| G11 | Paliers de validation par montant à trois niveaux (chargé, responsable crédit, direction) posés par CASHD dans regles_validation (aujourd'hui : un seul seuil « direction ») | 1 | C2 | — | E3 |
| G12 | Interface de programmation documentée pour un client (clés, documentation des portes cashd_*, quotas) — aujourd'hui les portes existent mais ne sont pas offertes à un tiers | 2 | socle | — | E5 |
| G13 | Canal WhatsApp pour les relances (modèles approuvés par Meta, opt-in du destinataire) | 4 | A2 (+1 C2) | WhatsApp Business : compte Meta vérifié + coût par conversation (~0,05–0,10 € en France) | P3 |
| G14 | Écrans montrés sur la page : les quatre captures (Débiteurs, Relances, Envois, Trésorerie) viennent de l'ancienne maquette du site CASHD, pas de l'écran réel ; il faut soit découper l'écran réel en quatre vues (dont un journal des envois avec canal et statut), soit refaire les captures et le texte | 2,5 | C2 (+C1 pour /espace2) | — | P26 |
| G15 | Lien de paiement : ouvrier qui crée le lien chez le prestataire de l'organisation et reçoit son webhook (contrat d'interface CASHD déjà posé) | 2,5 | serveur | compte du prestataire de chaque client (Stripe : ~1,5 % + 0,25 € par carte UE ; SEPA ~0,35 €) | C34 |
| G16 | Lettre recommandée électronique : branchement AR24 par A2 (CASHD prépare déjà la LRE au-delà du seuil) | 2 | A2 | contrat AR24 (prix par envoi sur devis, de l'ordre de quelques euros) | C26 |
| G17 | Chargement quotidien des taux BCE (aujourd'hui saisis à la main) | 0,5 | serveur | aucun (taux publics) | C35 |
| G18 | Journal « qui ne se modifie pas, y compris par nous » : chaînage par empreintes + export horodaté, ou reformuler (aujourd'hui protégé contre l'écriture, mais un administrateur de la base pourrait le modifier) | 1 | socle | horodatage qualifié éventuel | E4 |
| G19 | Raccord du logiciel de commandes à cashd_verifier_commande (blocage effectif d'une commande au-delà du plafond) | 1,5 | C2 + connecteur | selon le logiciel de commandes | C38 |
| G20 | Pièces de l'assurance-crédit : les PDF des factures et bons de livraison restent dans le facturier ; il faut les rattacher (dépôt ou lecture par FILED) | 1 | C2 | — | C42 |
| G21 | Proposition d'échelonnement et des moyens de règlement (comptoir, virement, plusieurs fois) dans le texte des relances | 0,5 | C2 | — | M6, M8 |
| G22 | Hébergement dans l'UE, espace chiffré distinct, assistance en français, facturation en euros sous droit français : à confirmer côté Teo (région du projet Supabase, contrat, CGV, DPA) — rien à construire dans CASHD | 0 | Teo | aucun si la région est déjà UE | P27, P28, P29, P30, P31 |
| **Total** | | **38** | CASHD 18,5 · autres 19,5 | | |

## Passage à A : le pilote chez un premier client (compté une fois)

| Étape | Jours |
|---|---|
| Installer CASHD chez un premier client réel, mode essai puis réel | 0,5 |
| Lire SON export réel (format, colonnes, dates, montants) et corriger le lecteur | 1,5 |
| Régler avec lui formule, signature, interdits, seuils, cadences ; relire les six textes | 0,5 |
| Basculer reglages_envois en réel, premier envoi validé, suivi des remises et rebonds | 1 |
| Accompagner un cycle complet (J+7 → J+30) et corriger ce qu'il révèle | 2,5 |
| Cas rares à provoquer avec lui (litige partiel, échéancier, devise, plafond, dossier…) : somme de la colonne B → A | 7 |
| **Total** | **13** j de travail, sur **30 à 45 jours** de calendrier |

## Écarts de texte à trancher (sans rien construire)

- **Cadence des devis** : la page dit « J+3 puis J+7 » (`lib/produits/relances.ts:223`), le catalogue « au troisième jour, puis sept jours après ce rappel » (ligne 48) — le moteur suit le catalogue (J+3, J+10). Une des deux phrases est fausse.
- **Premier rappel** : l'article BTP dit « rappel à l'échéance » (`lib/content.ts:291`), la page et le moteur J+7.
- **« Transmet à un modèle »** (`lib/produits/relances.ts:449`) : aucun modèle n'est appelé ; la promesse de minimisation est tenue a fortiori, mais la phrase décrit un mécanisme qui n'existe pas.
- **Les quatre captures** de la section Écrans sont présentées « telles quelles » alors qu'elles viennent de la maquette du site CASHD.
- **« Vos données restent chez vous »** (`lib/produits/relances.ts:328`) : elles sont dans la base d'Omega, isolées par organisation.
