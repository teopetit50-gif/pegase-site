# FILED — les promesses de la page, et ce qui reste (audit du 26/10/2026)

Audit en lecture seule du 26/10/2026, fait sur : la page lue sur `origin/main` (de17d8c9) ; les lots a4_01 → a4_92
(`origin/worker-a4`, 82ac55bd → 6c0413cc) et `omega/NOTES-A4.md` de cette branche ; le lecteur (`origin/worker-a1`,
`omega/NOTES-A1.md`, Edge `lecteur` v71) ; la fin de `omega/NOTES-COORDINATEUR.md` (`origin/main`) ; et ce qui est
**posé** sur la recette `omega-recette` (lecture de `supabase_migrations.schema_migrations`, des fonctions et des
fonctions Edge, par le connecteur). Le relevé du 06/10 (c0494b4) est repris ligne à ligne : sa colonne d'état reste
visible (« 06/10 »), à côté de l'état du jour (« 26/10 »).

## En tête

### Décompte

| État | 06/10 (chiffres transmis) | 06/10 (recompté ligne à ligne) | 26/10 |
|---|---|---|---|
| A prouvé en vrai | 6 | 7 | 11 |
| B construit et testé sur la recette | 67 | 73 | 81 |
| C partiel | 29 | 34 | 26 |
| D pas construit | 10 | 12 | 3 |
| T attend un tiers, un compte ou une décision de Teo | 2 | 2 | 7 |
| **Total compté** | 114 | 128 | 128 |

Le décompte « recompté » prend, pour une case double du 06/10 (« A / B », « B / T », « C / D »…), l'état le plus bas
(T seulement quand la case ne porte que T) ; « faux » y vaut C ; les lignes « — » (constats, illustrations, décisions) ne comptent pas. La synthèse
écrite du 06/10 donnait encore un autre compte (A 4, B 64, C 22, D 12, T 15) : les trois séries ne coïncident pas, d'où
le recomptage.

**Jours restants au 26/10** (jours de travail d'une personne, une ligne qui en répète une autre vaut 0) :
**→B ≈ 37,5 j**, **→A ≈ 63 j** (dont 18 j communs : production 3, pilote 10, écarts du pilote 5).
Le 06/10 comptait 34 j (D) + 25 j (C) + 18 j (B → A communs) ≈ 73 j, sans additionner les →A ligne à ligne ;
compté de la même façon, il reste au 26/10 37,5 j + 18 j ≈ **55,5 j**.

### Les 5 manques les plus importants pour vendre FILED

1. **Rien n'est en production, aucun client réel n'a fait passer ses pièces.** Les preuves réelles restent une
   facture Orange (FAC-2026-10-0471, de bout en bout, 06/10) et 13 pièces NOBAT lues justes (19 → 23/10). Le
   runbook de mise en production est prêt (worker-a5 00d52f38) mais rien n'est écrit en production. **Pose 3 j +
   pilote de 200 à 500 pièces réelles avec un expert-comptable 10 j.**
2. **« Vous connectez une messagerie. C'est la seule chose à faire. »** — la phrase de tête. Gmail se connecte en vrai
   depuis le 18/10, mais en régime Test de Google (comptes de test seulement) ; Outlook / Microsoft 365 n'est pas
   branché. **Tiers : vérification Google (audit CASA, ~500 à 4 500 $ par an) ; 1 j pour Microsoft.**
3. **Les écrans du client manquent pour presque tout ce qui a été construit depuis le 06/10.** Notes de frais et
   trajets, relevés bancaires, contrats, courriers, catégories d'achat, compteur et palier, vue cabinet, dossier de
   sortie, réponses aux fournisseurs, refusées à classer : tout est en base et testé, rien n'est à l'écran de
   `/espace2/filed`. **≈ 6 j (A3 / espace 2).**
4. **« Quel qu'en soit le format » n'est pas encore tenu.** Le montant écrit dans le corps du mail n'est pas lu,
   la photo n'a pas de règle qui accorde la FAQ (« lue quand même ») et le cas tordu (« part en anomalie »), les
   manuscrits n'ont aucune preuve. **≈ 3 j (A1 + A4).**
5. **« Transmission directe à la comptabilité » et « il n'écrit à personne ».** L'ouvrier `compta` (Pennylane,
   QuickBooks, Cegid) est écrit et testé, mais pas déployé sur la recette, et les comptes éditeurs n'existent pas ;
   les réponses aux fournisseurs (a4_38) partent par Omega, alors que la page promet qu'aucun message ne part en votre
   nom : il faut les déposer en brouillon dans la messagerie du client. **≈ 2 j + partenariats éditeurs (tiers).**

### Hypothèses (aucune question posée à Teo)

- **Règle d'or du 24/10 : on ne modifie jamais une phrase du site.** Là où le relevé du 06/10 proposait de
  « reformuler » ou de « trancher le texte », ce relevé chiffre ce qu'il faut **construire** pour que la phrase
  devienne vraie. Quand deux phrases du site se contredisent, la colonne « ce qui manque » propose le comportement qui
  les rend vraies toutes les deux.
- **A** n'est donné que sur une preuve réelle datée et citée (vraie pièce ou vrai envoi). Les pièces NOBAT (client
  consentant, vraies pièces lues sur la recette) comptent comme vraie donnée pour la **lecture**, pas pour le circuit.
- **B** n'est donné que sur un test vert cité : `^test_a4_` 150/150 le 26/10 (NOTES-A4, après a4_92), ou un des 10
  tests FILED rejoués le 26/10 sur la recette par `extensions.runtests` (chaque test annulé, rien laissé en base) :
  a4_20_03, a4_30_01, a4_31_02, a4_33_04, a4_38_01, a4_47_02, a4_49_01, a4_50_01, a4_52_01, a4_55_01 — tous verts.
  Un écran manquant ne fait pas descendre une ligne sous B ; il est compté dans « ce qui manque ».
- Prix : aucune grille d'abonnement n'est décidée (les prix se fixent à l'audit). Les lignes de prix restent T.
- Les statuts de cycle de vie vers la plateforme agréée (207/208) attendent toujours une décision de Teo : rien n'est
  émis. La voie 1 (Omega opérateur de dématérialisation) n'est pas vendue tant que la page dit « FILED ne vend pas
  cette mise en conformité ».

Légende : **A** prouvé en vrai · **B** construit et testé sur la recette · **C** partiel · **D** pas construit ·
**T** tiers, compte, achat ou décision de Teo. Jours : « →B » de l'état du jour à B, « →A » de B à prouvé en vrai,
hors pilote commun (ligne 0.2). Fichiers de la page : `lib/produits/factures.ts` (`fac`),
`lib/produits/capacites/factures.ts` (`cap`), `app/offres/factures-fournisseurs/page.tsx` (`page`),
`components/produits/factures/Bento.tsx` (`bento`), `Francais.tsx` (`fr`), `Maquettes.tsx`, `app/page.tsx`
(`accueil`), `app/offres/page.tsx` (`offres`), `lib/content.ts` (`content`).

## 0. Commun à toutes les lignes (hors décompte)

| # | Objet | 06/10 | 26/10 | Preuve (relue le 26/10) | Ce qui manque | j →B / →A |
|---|---|---|---|---|---|---|
| 0.1 | Tout FILED sur la recette | B | B | 153 lignes FILED, REPUT et lecteur dans `schema_migrations`, jusqu'à `a4_92_filed_lot84_refusees_visibles` ; 150 fonctions `tests.test_a4_*` ; 150/150 le 26/10 (NOTES-A4) | Pose en production, dans l'ordre des 6 paliers du runbook (A5), puis tests verts en production | 0 / 3 |
| 0.2 | Vraies pièces | B | B | FAC-2026-10-0471 (ORANGE SA) déposée, lue, contrôlée, VIES, fournisseur confirmé, validée par une seconde personne, exécutée, archivée (journal ligne 76967), 06/10 ; 13 pièces NOBAT (065 → 077) lues justes ou « à vérifier » à raison, 19 → 23/10 | Pilote sur 200 à 500 pièces réelles d'un client, FEC relu par un expert-comptable | 0 / 10 |
| 0.3 | Écarts du pilote | — | — | — | Ce que le pilote révèle | 0 / 5 |

## 1. Héros, bandeau, principe (`lib/produits/factures.ts`)

| # | Promesse (texte exact) | Où | 06/10 | 26/10 | Preuve (relue le 26/10) | Ce qui manque | j →B / →A |
|---|---|---|---|---|---|---|---|
| 1 | « Vos équipes ne ressaisiront plus une seule facture. » | fac:49-50 | C | C | Lecture et intégration (socle F2, lecteur v71) ; correction champ par champ et relecture avec consigne (a4_87, a1_01, a1_02) | Une anomalie se corrige encore à la main. Mesurer au pilote la part des pièces passées sans aucune saisie, et relire automatiquement (consigne) celles qui ont échoué avant de les montrer | 1 / 1 |
| 2 | « Vous connectez une messagerie. C'est la seule chose à faire. » | fac:51 | C | T | Gmail connecté en vrai par OAuth le 18/10 (messagerie 259b8938, réception 668 relevée par l'ouvrier, NOTES-COORDINATEUR) ; plusieurs boîtes FILED par organisation (a4_51) | Sortie du régime Test de Google (vérification de l'appli + audit CASA, ~500 à 4 500 $ par an) ; Microsoft 365 (branche fermée) ; l'installation de FILED (exercice, plan, circuit) se fait encore à part : la lancer d'office à la connexion | 2 / 1 |
| 3 | « FILED lit chaque pièce qui arrive, recoupe ses montants et la classe jusqu'au dossier de votre comptabilité. » | fac:52 | B | B | FAC-2026-10-0471 lue, recoupée, validée (06/10) ; export comptable (a4_25) et envoi à date fixe (a4_33, test a4_33_04 rejoué 26/10) | Un vrai dossier transmis à une vraie comptabilité | 0 / 0,5 |
| 4 | Bandeau : « PDF » | fac:69 | A | A | F-2026-0413 et FAC-2026-10-0471 (06/10) ; pièces NOBAT (19 → 23/10) | — | 0 / 0 |
| 5 | « Scan » | fac:70 | B | B | Lecteur v71 | Un vrai scan lu juste | 0 / 0,5 |
| 6 | « Photo prise sur le parking » | fac:71 | C | C | Le lecteur lit les images | Accorder fac:71 et fac:268 (« lue quand même ») avec cap:124 (« part en anomalie plutôt que d'être devinée ») : une photo est lue, puis toujours arrêtée pour vérification humaine avant classement (contrôle « photo à vérifier »), test à écrire | 0,5 / 0,5 |
| 7 | « Pièce jointe » | fac:72 | B | B | a4_20 (test a4_20_03 rejoué vert le 26/10) | Une vraie pièce jointe reçue sur l'adresse dédiée | 0 / 0,5 |
| 8 | « Montant écrit dans le corps du mail » | fac:73 | C | C | Un message sans pièce lisible lève une alerte « à lire » (a4_20) et FILED prépare la demande de pièce (a4_38, test a4_38_01 rejoué 26/10) | Le corps du message n'est pas lu comme une pièce : passer le texte du message au lecteur, en faire une pièce « montant dans le message », toujours arrêtée pour validation (accorde aussi cap:120) | 2 / 0,5 |
| 9 | « Facture-X » | fac:74 | B | B | a4_16 (le XML fait foi) ; 36 exemples de la norme lus par la voie `xml` le 18/10 (pas de vraies factures) | Un vrai Factur-X d'un fournisseur | 0 / 0,5 |
| 10 | « Ticket de caisse froissé » | fac:75 | C | B | a4_55 : ticket sans fournisseur identifié rangé chez « Tickets de caisse », sans faux doublon (test a4_55_01 rejoué 26/10) | Un vrai ticket froissé lu juste | 0 / 0,5 |
| 11 | « Avoir » | fac:76 | B | B | Écritures inversées (a4_17), rapprochement d'avoir | Un vrai avoir | 0 / 0,5 |
| 12 | « Relevé » | fac:77 | C | B | a4_34 : relevé CAMT.053 ou CSV importé, débits rapprochés des factures (tests a4_34_01, a4_34_02) | Le relevé en PDF n'est pas lu en opérations (export CAMT ou CSV nécessaire) ; écran d'import | 0 / 1 |
| 13 | « Note de frais » | fac:78 | D | B | a4_35, a4_36, a4_37 (note de frais, devise, envois) ; a4_53 (trajets au barème) ; tests a4_35_01, a4_35_02, a4_53_01, a4_53_02 | Écran du salarié et du valideur ; dépôt depuis le téléphone | 0 / 1,5 |
| 14 | « Facture écrite à la main » | fac:79 | C | C | Lecteur v71 (aucune preuve sur des manuscrits) | Évaluation du lecteur sur 20 manuscrits réels, et seuil de confiance qui arrête une lecture incertaine | 1 / 0,5 |
| 15 | « Plusieurs pièces dans un même fichier » | fac:80 | B | B | a4_21 (test a4_21_01_filles) | Une vraie pièce multi-factures | 0 / 0,5 |
| 16 | « Vous connectez une messagerie une fois, puis tout ce qui y arrive en ressort classé au bon fournisseur. » | fac:100 | C | T | = n° 2 ; le fournisseur nouveau est confirmé une fois (a4_10, a4_73), ce que dit désormais cap:152 | = n° 2 | 0 / 0 |
| 17 | « FILED recoupe donc le HT, la TVA et le TTC de chaque facture, et ne la classe que si les trois montants tombent juste. » | fac:114 | A | A | Contrôle des totaux vu en vrai sur F-2026-0413 et FAC-2026-10-0471 (06/10) | — | 0 / 0 |
| 18 | « Chaque pièce lue s'ajoute au total engagé du mois, fournisseur par fournisseur, et ce qui attend encore votre validation reste visible à part. » | fac:121 | B | B | a4_06, a4_88 (plus de double compte) | Preuve au pilote | 0 / 0,5 |
| 19 | « Vous n'avez donc aucun tableur à tenir à côté. » | fac:121 | B | B | a4_06 | — | 0 / 0 |

## 2. Paliers et prix (`lib/produits/factures.ts`, `page.tsx`)

| # | Promesse (texte exact) | Où | 06/10 | 26/10 | Preuve (relue le 26/10) | Ce qui manque | j →B / →A |
|---|---|---|---|---|---|---|---|
| 20 | Prix des paliers (« à définir ») | fac:135, 149, 165 | T | T | — | Décision de Teo (prix fixés à l'audit) | 0 / 0 |
| 21 | « Vous payez les pièces, pas les utilisateurs. » / « Le prix suit le nombre de pièces qui passent, pas le nombre de personnes qui regardent. Vous changez de palier d'un mois sur l'autre. » | page:424-426 | D | C | Compteur de pièces par mois et par organisation, palier suivant au 1er du mois, « au-delà » compté (a4_50, a4_65 ; test a4_50_01 rejoué 26/10) | Aucun prix ni facture : relier le compteur à une facturation (prestataire de paiement) une fois les prix décidés | 3 / 0,5 |
| 22 | « 20 / 100 / 500 factures par mois » | fac:140, 155, 171 | D | B | Quotas par palier, alertes au gérant à 80 % et 100 %, la lecture continue (a4_50, a4_65 ; tests a4_50_01, a4_65_01) | Écran du compteur | 0 / 0,5 |
| 23 | « Une boîte mail connectée » / « Deux boîtes mail connectées » / « Boîtes mail illimitées » | fac:141, 156, 172 | C | B | Plusieurs boîtes FILED par organisation, limite du palier à la déclaration (a4_51, test a4_51_01) | La création des boîtes reste chez A2 ; écran | 0,5 / 0,5 |
| 24 | « Classement par fournisseur » | fac:142 | B | A | FAC-2026-10-0471 classée chez ORANGE SA, fournisseur confirmé par une personne (06/10) | — | 0 / 0 |
| 25 | « Export mensuel pour la comptabilité » | fac:143 | C | B | Envoi comptable à date fixe, FEC ou format de l'éditeur (a4_33 ; test a4_33_04 rejoué 26/10) | Un vrai envoi mensuel | 0 / 0,5 |
| 26 | « Historique de trois mois » / « Historique de douze mois » / « Historique complet » | fac:144, 159, 175 | D | B | Fenêtre d'affichage par palier, réglable, sans rien effacer (a4_54, test a4_54_01) ; complet pour tous par décision de Teo du 17/10 | — | 0 / 0 |
| 27 | « Recoupement HT / TVA / TTC » | fac:157 | A | A | = n° 17 | — | 0 / 0 |
| 28 | « Transmission directe à la comptabilité » | fac:158 | C / T | C | Fichiers d'import (a4_25) ; envoi par API Pennylane, QuickBooks, Cegid (a4_28, tests a4_28_01 → 06) | L'Edge `compta` n'est pas déployée sur la recette (absente de la liste des fonctions le 26/10) ; comptes éditeurs ; chaque format validé sur un vrai dossier | 0,5 / 3 |
| 29 | « Assistance par mail » / « Assistance prioritaire » / « Interlocuteur dédié » | fac:160, 177, 192 | T | T | — | Organisation du support (service humain) | 0 / 0 |
| 30 | « File de validation partagée » | fac:173 | B | A | FAC-2026-10-0471 confirmée par daf@ puis validée par daf2@ dans la file (06/10) | — | 0 / 0 |
| 31 | « Catégories d'achat sur mesure » | fac:174 | C | B | Liste propre à l'organisation, rangement, choix humain qui tient (a4_47 ; test a4_47_02 rejoué 26/10) | Le lecteur doit proposer dans cette liste (`filed_categories_lecteur`) ; écran | 0,5 / 0,5 |
| 32 | « Journal de tout ce qui a été lu » | fac:176, 239 | B | A | FAC-2026-10-0471 inscrite au journal avec son empreinte (ligne 76967, 06/10) | — | 0 / 0 |
| 33 | Cabinet : « Un espace par dossier client » | fac:188 | D | C | Un dossier = une organisation ; vue d'ensemble et dossiers épinglés (a4_52, test a4_52_01 rejoué 26/10) | Inviter un cabinet dans un dossier en un geste, et la bascule d'un dossier à l'autre à l'écran (socle, A3) | 3 / 1 |
| 34 | « Vue d'ensemble sur tous les dossiers » | fac:189 | D | B | `filed_vue_ensemble` (a4_52, test rejoué 26/10) | Écran | 0 / 0,5 |
| 35 | « Marque du cabinet » | fac:190 | D | D | Rien trouvé dans les lots a4 ni dans les notes | Logo, adresse d'envoi et domaine du cabinet sur l'espace et les envois | 3 / 0,5 |
| 36 | « Reversement sur les abonnements » | fac:191 | D | D | — | Commissionnement du cabinet sur les abonnements de ses dossiers (dépend du n° 21) | 2 / 0,5 |

## 3. Garde-fous, conformité, FAQ, clôture (`lib/produits/factures.ts`)

| # | Promesse (texte exact) | Où | 06/10 | 26/10 | Preuve (relue le 26/10) | Ce qui manque | j →B / →A |
|---|---|---|---|---|---|---|---|
| 37 | « FILED lit vos comptes sans y toucher. » | fac:217-218 | C | C | Les écritures restent dans l'espace FILED ; rien ne part sans validation | L'envoi par API crée un compte fournisseur chez Pennylane et un Vendor chez QuickBooks (a4_28) : soumettre cette création à validation, et n'écrire chez l'éditeur que les écritures validées | 1 / 0,5 |
| 38 | « Il n'écrit à personne. » / « FILED n'envoie aucun message en votre nom, ni à vos clients, ni à vos fournisseurs, ni à votre banque. » | fac:223-225 | B, sous réserve | C | Aucun envoi automatique | Depuis a4_38, une réponse au fournisseur validée part par Omega, en votre nom. Pour tenir aussi « rédige ce qui repart » (n° 125) : déposer la réponse en **brouillon dans votre messagerie** (Gmail compose, déjà accordé) et la laisser envoyer par vous. Statuts vers la plateforme agréée : rien n'est émis (207/208, décision de Teo) | 1 / 0,5 |
| 39 | « Ses accès s'arrêtent à la lecture, donc il ne peut pas payer à votre place. » | fac:225, 229, 279 | B | B | Aucun moyen de paiement ; le paiement est seulement noté (a4_15) | « Accès en lecture » : = n° 37 | 0 / 0 |
| 40 | « Zéro message envoyé en votre nom » | fac:228 | B | C | = n° 38 | = n° 38 | 0 / 0 |
| 41 | « Aucune pièce n'est effacée. » / « Un doublon est mis de côté au lieu d'être effacé » | fac:233-236 | B | B | Doublon consultable (socle) ; registre figé (a4_31) ; l'effacement garde ce que la loi garde (a4_40, test a4_40_91) | — | 0 / 0,5 |
| 42 | « un montant douteux attend votre validation avant d'être classé » | fac:235 | B | B | Contrôles bloquants (a4_11) ; vu sur NOBAT (19 → 23/10) mais au niveau des contrôles seulement | — | 0 / 0 |
| 43 | « Vos fichiers d'origine restent tels que vous les avez reçus, donc vous pouvez tout récupérer quand vous voulez. » / « Chaque pièce gardée dans son format d'origine » | fac:235, 238 | C | B | Dossier de sortie : fichiers, index, FEC, empreintes, toutes les données FILED (a4_33, a4_49 ; tests a4_33_01 → 03, a4_49_01 rejoué 26/10) ; Edge `sortie` déployée | Écran « tout récupérer » | 0 / 0,5 |
| 44 | « Depuis le 1ᵉʳ septembre 2026, toute entreprise établie en France doit pouvoir recevoir des factures électroniques. » | fac:250 | A (fait) | A | Fait réglementaire vérifié sur impots.gouv.fr (NOTES-A4) | — | 0 / 0 |
| 45 | « FILED ne vend pas cette mise en conformité : le raccordement relève de votre outil de facturation. » | fac:250, 291 ; accueil:613 | — | — | Constat, hors décompte. a4_16 et a4_18 (voie 1) existent mais rien n'est émis | La voie 1 ne se vend pas tant que cette phrase est en ligne (hypothèse) | — |
| 46 | FAQ « Que faut-il installer ? » « Rien. Vous connectez une messagerie, et c'est tout. Aucun logiciel de facturation à connecter, aucun fichier client à importer, aucune extension à installer sur vos postes. » | fac:263-264 | C | C | Vrai côté client pour les postes | L'installation de FILED (exercice, plan, circuit, comptes système) se fait à part : la lancer d'office à la connexion de la messagerie, réglages par défaut | 1 / 0 |
| 47 | FAQ « Et si mon fournisseur envoie une photo prise de travers ? » « Elle est lue quand même. PDF, scan, photo, pièce jointe, ou montant écrit directement dans le corps du mail : le format ne vous concerne plus. » | fac:267-268 | C | C | = n° 6 et n° 8 | = n° 6 et n° 8 | 0 / 0 |
| 48 | FAQ « Non. Elle reçoit un dossier classé dans le format qu'elle utilise déjà, à la date convenue pendant l'installation. Elle gagne du temps sans rien changer à ses méthodes. » | fac:274-275 | C | B | Formats Pennylane, Sage, Cegid, QuickBooks (a4_25), FEC (a4_17), envoi à date fixe (a4_33, test a4_33_04 rejoué 26/10) | EBP, ACD, Tiime… : par le FEC générique | 0 / 1 |
| 49 | FAQ « Jamais. Il lit, recoupe, classe et transmet à votre comptabilité. » | fac:279 | B, sous réserve | C | = n° 38 | = n° 38 | 0 / 0 |
| 50 | FAQ « HT, TVA et TTC sont recoupés entre eux ; si les trois ne tombent pas juste, la pièce est mise de côté et vous est signalée. Rien n'entre en silence dans votre comptabilité. » | fac:283 | A | A | = n° 17 | — | 0 / 0 |
| 51 | FAQ « Sur des serveurs situés dans l'Union européenne. » | fac:287 | B / T | T | Base à Francfort | La lecture passe par un service d'IA hors UE ; poser le lecteur sur une région UE (Bedrock eu-central, déjà prévu dans `_partage`) | 0,5 / 0,5 |
| 52 | FAQ « Vos fichiers d'origine sont conservés tels quels, vous pouvez les récupérer ou tout effacer à tout moment. » | fac:287 | C | C | Récupérer : = n° 43 (B). Effacer : tout sauf ce que la loi oblige à garder, scellé dix ans et exportable (a4_40, a4_41, a4_42 ; décision de Teo du 17/10) | « Tout effacer » bute sur la conservation de dix ans (C. com. L123-22) : rien à construire, l'écran d'effacement dit ce qui reste (a4_42) ; écran | 0,5 / 0 |
| 53 | FAQ « Puis-je arrêter à tout moment ? » « Oui, sans préavis. Vous repartez avec vos pièces. » | fac:294-295 | C | C | Dossier de sortie complet (a4_33, a4_49) | Résiliation dans le produit, en un geste (socle, A5) | 1 / 0,5 |
| 54 | Clôture « une messagerie connectée suffit à remettre l'ensemble en ordre » | fac:312 | C | T | = n° 2 | = n° 2 | 0 / 0 |

## 4. Le périmètre — catalogue (`lib/produits/capacites/factures.ts`)

| # | Promesse (texte exact) | Où | 06/10 | 26/10 | Preuve (relue le 26/10) | Ce qui manque | j →B / →A |
|---|---|---|---|---|---|---|---|
| 55 | « Une facture fournisseur traverse six étapes avant d'entrer en comptabilité. » | cap:20 | B | B | Les six familles ci-dessous | — | 0 / 0 |
| 56 | « Le périmètre se règle à l'installation … et les contrôles restent actifs quel que soit le réglage. » | cap:22 | B | B | `filed_reglages` (a4_02, a4_08) | — | 0 / 0 |
| 57 | « Une adresse dédiée reçoit les pièces, et l'expéditeur est repris sur la ligne d'achat. » | cap:28 | B | B | a4_20 (test a4_20_03 rejoué 26/10) | Une vraie pièce reçue sur l'adresse dédiée d'un client | 0 / 0,5 |
| 58 | « Les factures en PDF sont lues de la même façon, qu'elles soient natives ou scannées. » | cap:29 | A / B | B | Natif : A (FAC-2026-10-0471, 06/10) ; scanné : lecteur seulement | Un vrai scan (= n° 5) | 0 / 0 |
| 59 | « Un message sans pièce jointe lisible part en anomalie » | cap:30 | B | B | a4_20 (test a4_20_03 rejoué 26/10 : « Sans pièce jointe : rien de rangé, mais une alerte à lire ») | — | 0 / 0,5 |
| 60 | « Un fichier qui contient plusieurs factures est découpé pièce par pièce. » | cap:31 | B | B | a4_21 (test a4_21_01) ; la page le dit attesté depuis c203f20b | = n° 15 | 0 / 0 |
| 61 | « Les factures manuscrites et les tickets de caisse sont lus et rattachés. » | cap:32 | C | C | Tickets : B (n° 10) ; manuscrits : C (n° 14) | = n° 14 | 0 / 0 |
| 62 | « Les formats structurés Factur-X, UBL et CII sont reçus et lus tels quels. » | cap:33 | B | B | a4_16 (le XML fait foi) ; exemples de la norme lus le 18/10 | UBL et CII seuls par la plateforme agréée : voie 1 | 0 / 1 |
| 63 | « Un dépôt par lot arrive depuis un dossier partagé ou un transfert de fichiers. » | cap:34 | D | B | Edge `depot` (dossier WebDAV) : PUT d'un PDF → 201 → `filed_documents` R2026-000007, boîte fermée → 401 (NOTES-COORDINATEUR, « dépôt par lot prouvé de bout en bout ») | Dossier partagé Drive / SharePoint ; SFTP | 0 / 1 |
| 64 | « Un historique de plusieurs exercices se reprend en une fois à l'installation. » | cap:35 | B | B | a4_24 (FEC) + a4_32 (pièces) | Écran d'installation qui envoie les FEC | 1 / 0,5 |
| 65 | « L'en-tête : fournisseur, numéro de pièce, date d'émission et date d'échéance. » | cap:42 | A | A | F-2026-0413, FAC-2026-10-0471 (06/10) ; NOBAT (19 → 23/10) | — | 0 / 0 |
| 66 | « Les lignes de détail : désignation, quantité, prix unitaire et remise. » | cap:43 | B | B | Champ `lignes` du lecteur, `filed_factures_lignes`, rapprochement (a4_08) | Prouver en vrai | 0 / 0,5 |
| 67 | « La TVA multi-taux, l'autoliquidation, l'exonération et la TVA sur les débits. » | cap:44 | B | B | a4_11, a4_22, a4_27 ; NOBAT : exonération et TVA 8,5 % lues (19 → 23/10) | Autoliquidation et TVA sur les débits sur de vraies pièces | 0 / 0,5 |
| 68 | « La devise, le taux de change et la contre-valeur en euros au jour d'émission. » | cap:45 | B / T | B | a4_22, a4_27 ; Edge `taux-bce` déployée | — | 0 / 0,5 |
| 69 | « Les références de commande, de bon de livraison et de contrat citées sur la pièce. » | cap:46 | B | B | `refs` lues, rattachement de la commande (a4_23) | Prouver en vrai | 0 / 0,5 |
| 70 | « La catégorie d'achat et un résumé de la pièce, produits à la lecture. » | cap:47 | B | B | Lecteur ; liste de l'organisation (a4_47) | — | 0 / 0 |
| 71 | « Les mentions d'escompte, de pénalité de retard et d'indemnité forfaitaire. » | cap:48 | B | B | a4_27 ; mentions contrôlées sur les exemples de la norme (18/10) | — | 0 / 0,5 |
| 72 | « Le total hors taxes, la TVA et le total toutes taxes sont recoupés au pied de la facture. » | cap:55 | A | A | = n° 17 | — | 0 / 0 |
| 73 | « Les doublons sont détectés, y compris quand le fichier a été renommé ou rescanné. » | cap:56 | B | B | Empreinte du fichier, fournisseur + numéro (a4_43, a4_72 ; test a4_20_03 rejoué 26/10) | Un vrai rescan | 0 / 0,5 |
| 74 | « Un changement de coordonnées bancaires chez un fournisseur connu déclenche une alerte. » | cap:57 | B | B | a4_30 (test a4_30_01 rejoué 26/10, 8/8) | — | 0 / 0,5 |
| 75 | « Le numéro de TVA intracommunautaire et le SIREN sont vérifiés avant classement. » | cap:58 | B / T | B | TVA : VIES sur FAC-2026-10-0471 (06/10, vrai) ; SIREN : registre (Edge `identite`), source dite (a4_81, a4_82) ; Royaume-Uni sans HMRC (a4_39) | SIREN vérifié au registre sur une vraie pièce | 0 / 0,5 |
| 76 | « La commande, la réception et la facture sont rapprochées avant toute validation. » | cap:59 | B | B | a4_08, a4_23 | Bloquant seulement si l'organisation exige commande ou réception : le régler à l'installation | 0 / 0,5 |
| 77 | « Un écart de prix ou de quantité par rapport à la commande est signalé, pas absorbé. » | cap:60 | B | B | a4_08 | — | 0 / 0,5 |
| 78 | « Une pièce aux champs manquants ou au total nul est mise en attente, jamais classée. » | cap:61 | B | B | a4_11 | — | 0 / 0 |
| 79 | « Une pièce reçue après la clôture est orientée vers l'exercice suivant, avec sa mention. » | cap:62 | B | B | a4_02 | — | 0 / 0,5 |
| 80 | « L'approbation suit le montant, le centre de coût et la société concernée. » | cap:69 | B | B | a4_07 | — | 0 / 0,5 |
| 81 | « Au-delà d'un seuil que vous fixez, deux approbations distinctes sont exigées. » | cap:70 | B | B | a4_07 ; seconde personne au-delà du seuil de l'organisation (a4_76) | — | 0 / 0,5 |
| 82 | « Une délégation d'approbation se pose pour une absence, avec sa date de fin. » | cap:71 | B | B | Socle + a4_31 | — | 0 / 0,5 |
| 83 | « L'approbateur qui n'a pas répondu est relancé, puis la pièce remonte d'un niveau. » | cap:72 | B | B | a4_07, a4_31 | — | 0 / 0,5 |
| 84 | « Le commentaire, la pièce jointe et le motif de refus restent attachés à la facture. » | cap:73 | B | B | `filed_factures_annexes` ; refusées visibles avec leur motif (a4_92) | — | 0 / 0,5 |
| 85 | « Celui qui saisit et celui qui approuve ne peuvent pas être la même personne. » | cap:74 | B | B | `filed_saisisseurs` (a4_13) ; le correcteur d'une facture refusée n'approuve pas (a4_91, tests a4_91_01 → 03). Réserve : un gérant seul décide sous le seuil de l'organisation (a4_76, décision de Teo du 21/10) | — | 0 / 0 |
| 86 | « L'imputation analytique s'apprend sur vos écritures passées, fournisseur par fournisseur. » | cap:81 | B | B | a4_02 + a4_24 | Le centre de coût ne s'apprend pas des FEC (ils n'en portent pas) | 0 / 0,5 |
| 87 | « Chaque pièce est affectée au plan comptable et au centre de coût qui la portent. » | cap:82 | B | B | a4_01, a4_02 | — | 0 / 0,5 |
| 88 | « Chaque pièce lue est écrite dans votre espace, avec son fournisseur et sa catégorie. » | cap:83 | A / B | A | FAC-2026-10-0471 écrite avec son fournisseur (06/10) ; NOBAT (19 → 23/10) | — | 0 / 0 |
| 89 | « Les pièces classées s'ajoutent à une table que rien ne modifie après coup. » | cap:84 | B | B | Registre figé (a4_31), écritures non réécrites (a4_17) | — | 0 / 0 |
| 90 | « Les charges récurrentes produisent leurs écritures d'abonnement sans ressaisie. » | cap:85 | B | B | a4_03, a4_09 | — | 0 / 0,5 |
| 91 | « L'archivage est à valeur probante, et la piste d'audit reste reconstituable. » | cap:86 | B | B | a4_05, historique chaîné (a4_46), sceau mensuel (a4_64) | Piste d'audit fiable écrite et validée par l'expert-comptable du pilote | 0 / 1 |
| 92 | « Le journal des pièces reçues est numéroté en continu et ne se modifie pas. » | cap:87 | B | B | a4_31 (test a4_31_02 rejoué 26/10, 5/5) | — | 0 / 0 |
| 93 | « L'engagé du mois se lit par fournisseur, par société et par centre de coût. » | cap:94 | B | B | a4_06 | — | 0 / 0,5 |
| 94 | « L'échéancier fournisseur donne la prévision de décaissement à trente et soixante jours. » | cap:95 | B | B | a4_06, a4_15 | — | 0 / 0,5 |
| 95 | « Le délai moyen de traitement se mesure de la réception au classement. » | cap:96 | B | B | a4_06 | — | 0 / 0 |
| 96 | « Les pièces bloquées, en litige ou en attente d'approbation sont comptées en continu. » | cap:97 | B | B | a4_06, a4_88 (chaque facture une seule fois), a4_92 (refusées comptées) | — | 0 / 0 |
| 97 | « Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe. » | cap:98 | B | B | a4_06 ; écran des exports (ExportsFiled.tsx, worker-a4 seulement) | — | 0 / 0,5 |

## 5. Les cas tordus (`lib/produits/capacites/factures.ts`)

| # | Promesse (texte exact) | Où | 06/10 | 26/10 | Preuve (relue le 26/10) | Ce qui manque | j →B / →A |
|---|---|---|---|---|---|---|---|
| 98 | « La pièce est traitée comme les autres, et l'adresse d'envoi est reprise telle quelle sur la ligne d'achat. C'est le contenu de la facture qui décide du fournisseur, pas l'expéditeur. » | cap:112 | B | B | a4_20, a4_10 | — | 0 / 0 |
| 99 | « La pièce part en anomalie pour champ manquant. » (sans numéro) | cap:116 | B | B | a4_11 | — | 0 / 0 |
| 100 | « Le message part en anomalie avec sa mention, et personne ne le classe au jugé. » (montant dans le corps) | cap:120 | B | B | a4_20 (test a4_20_03 rejoué 26/10) ; demande de pièce préparée (a4_38) | — | 0 / 0 |
| 101 | « La pièce part en anomalie plutôt que d'être devinée. » (photo) | cap:124 | C | C | = n° 6 | = n° 6 | 0 / 0 |
| 102 | « Le classement s'arrête dès que l'écart entre le hors taxes, la TVA et le total dépasse cinq centimes. » | cap:128 | B | B | `tolerance_totaux` 0,05 (a4_02, a4_11) | — | 0 / 0 |
| 103 | « Les montants sont lus tels qu'ils figurent sur la pièce, sans conversion. La contre-valeur en euros reste à la charge de votre comptabilité. » | cap:132 | faux | C | Les montants lus sont gardés tels quels ; FILED calcule pourtant la contre-valeur (a4_22, a4_27) | Accorder avec cap:45 : la contre-valeur reste une **proposition** que la comptabilité valide ou corrige avant l'écriture en euros (réglage « contre-valeur à valider », test) | 0,5 / 0,5 |
| 104 | « Le contrôle porte sur la cohérence entre le hors taxes, la TVA et le total, quel que soit le taux. Un taux exotique passe s'il tombe juste, et s'arrête sinon. » | cap:136 | C | B | a4_71 : un taux inhabituel cohérent passe, signalé (test a4_71_01_taux_inhabituel_coherent) | — | 0 / 0,5 |
| 105 | « Le doublon est reconnu même après un renommage ou un nouveau scan. La seconde copie est écartée et reste consultable. » | cap:140 | B | B | = n° 73 | — | 0 / 0 |
| 106 | « Chaque facture devient une pièce à part, avec sa propre lecture et ses propres contrôles. Le fichier d'origine reste attaché à chacune, pour qu'on sache d'où elle vient. » (texte du 21/10, c203f20b, remplace « Le découpage automatique n'existe pas encore… ») | cap:144 | faux | B | a4_21 (test a4_21_01_filles) | = n° 15 | 0 / 0 |
| 107 | « La pièce est mise en attente. » (total à zéro) | cap:148 | B | B | a4_11 | — | 0 / 0 |
| 108 | « La pièce est lue, puis mise en attente avec le nom lu sur la facture : une personne confirme ce fournisseur une fois, et ses factures suivantes passent seules. Le système n'écrit rien dans votre plan comptable. » (texte du 21/10, c203f20b) | cap:152 | C | C | Confirmation une fois (a4_10, a4_12, a4_73) ; vu en vrai sur ORANGE SA (06/10) | « N'écrit rien dans votre plan comptable » : la reprise FEC pose des comptes dans FILED (a4_24) et l'envoi API crée un compte fournisseur chez l'éditeur (a4_28) : = n° 37 | 0 / 0 |
| 109 | « Elle est classée avec ses deux dates, celle de la facture et celle de sa réception. L'écart se voit, et c'est à votre comptabilité de décider de l'exercice. » | cap:156 | C | C | Les deux dates sont gardées ; l'orientation vers l'exercice suivant est automatique après clôture (a4_02) | Accorder avec cap:62 : exercice **proposé** (suivant si clôturé), que la comptabilité confirme ou change (porte « réorienter », historique « reorientee » existant), test | 0,5 / 0,5 |

## 6. À l'échelle d'un groupe (`lib/produits/capacites/factures.ts`)

| # | Promesse (texte exact) | Où | 06/10 | 26/10 | Preuve (relue le 26/10) | Ce qui manque | j →B / →A |
|---|---|---|---|---|---|---|---|
| 110 | « Chaque société, site ou filiale a son espace, ses fournisseurs et son plan comptable. Une direction financière lit le consolidé, un comptable de site ne voit que le sien. » | cap:171 | B | B | Périmètres par société (socle), plan par société (a4_01) ; NOBAT rangées sous une entité Guadeloupe (23/10) | Fournisseurs par organisation, pas par société (réserve mineure) | 0 / 0,5 |
| 111 | « Saisie, approbation, comptabilisation et administration sont quatre rôles distincts. » | cap:177 | C | B | a4_48 : comptabilisation réservée aux personnes désignées, séparée de l'approbation (test a4_48_01) | Écran de désignation | 0 / 0,5 |
| 112 | « Une délégation se pose pour une absence et s'éteint à la date prévue. » | cap:177 | B | B | = n° 82 | — | 0 / 0 |
| 113 | « Le montant décide du circuit : validation simple, double validation, accord de la direction. Le seuil est un réglage, et son historique reste lisible. » | cap:183 | B | B | a4_07 ; changements tracés ; seuil de seconde personne (a4_76) | Lecture de l'historique d'un circuit à l'écran | 0,5 / 0 |
| 114 | « Chaque lecture, chaque décision et chaque export s'inscrivent dans un journal qui ne se modifie pas, y compris par nous. C'est ce qu'un commissaire aux comptes demande. » | cap:189 | C | B | Historique chaîné (a4_46, test a4_46_01) ; sceau mensuel envoyé au client, donc noté hors de notre base (a4_64, test a4_64_01 ; accord du sceau activé par le gérant du banc) | Horodatage tiers qualifié, en option (~0,05 à 0,20 € par jeton) | 0 / 0,5 |
| 115 | « Le système lit et écrit dans vos outils de comptabilité et de gestion. Là où un connecteur manque, l'échange passe par dépôt de fichiers ou par interface de programmation. » | cap:195 | C / T | C | Fichiers (a4_25), API (a4_28), dépôt (Edge `depot`) | = n° 28 ; « outils de gestion » (ERP) : rien | 2 / 1 |
| 116 | « Engagé, délai de traitement, pièces bloquées et prévision de décaissement se lisent par société et en consolidé, avec un export daté. » | cap:201 | B | B | a4_06 | — | 0 / 0,5 |

## 7. Bento, maquettes, page (`components/produits/factures`)

| # | Promesse (texte exact) | Où | 06/10 | 26/10 | Preuve (relue le 26/10) | Ce qui manque | j →B / →A |
|---|---|---|---|---|---|---|---|
| 117 | « Reçue », « Lue », « Recoupée », « Classée », « Transmise » ; « 5 étapes · 0 perdue » | bento:141-145, 162 | B | B | Socle F1-F2, a4_11, a4_25, a4_33 | « Transmise » : = n° 28 | 0 / 0 |
| 118 | « 3 canaux d'arrivée » ; « 0 pièce ressaisie » | bento:297-298 | C | C | Trois canaux existent : adresse dédiée (a4_20), messagerie connectée (Gmail, 18/10), dépôt (Edge `depot`) | « 0 pièce ressaisie » : = n° 1 | 0 / 0 |
| 119 | « Pièce déjà reçue » → « Écartée » ; « Montants qui ne tombent pas juste » → « Mise de côté » ; « Fournisseur inconnu » → « Validation » ; « Doublon de numéro » → « Écartée » ; « Devise inattendue » → « Validation » ; « 12 contrôles » | bento:308-320 | B | B | Socle, a4_10, a4_11, a4_27, a4_72 | — | 0 / 0 |
| 120 | « Une seule file, courte, avec uniquement ce qui a besoin de vous. Le reste est déjà rangé. » | bento:436 | B | B | Écran `/espace2/filed` (main), statuts | — | 0 / 0 |
| 121 | Maquettes (« Dossier prêt », « Août transmis à la comptabilité, 214 pièces », « Pièces traitées » « 1 284 », fournisseurs d'exemple) | bento:346-349 ; Maquettes:148-153, 282-304 | — | — | Illustrations, hors décompte | Garder des noms fictifs | — |
| 122 | Faits « Conception » « France » ; « Hébergement » « Union européenne » ; « Droit applicable » « Français » ; « Facturation » « Euros, TVA française » | fr:29-32 | B / T | T | Base à Francfort | Lecture IA hors UE (= n° 51) ; facturation (= n° 21) ; CGV (Teo) | 0 / 0 |
| 123 | Méta : « Chaque facture fournisseur est lue quel qu'en soit le format, ses montants recoupés, la pièce classée et transmise à votre comptabilité. » | page:97 | C | C | = n° 3 | « Quel qu'en soit le format » : = n° 6, 8 ; « transmise » : = n° 28 | 0 / 0 |

## 8. Accueil, /offres, contenus (`app/page.tsx`, `app/offres/page.tsx`, `lib/content.ts`)

| # | Promesse (texte exact) | Où | 06/10 | 26/10 | Preuve (relue le 26/10) | Ce qui manque | j →B / →A |
|---|---|---|---|---|---|---|---|
| 124 | « Vos équipes ne recopient plus aucun document. » (texte réécrit le 1b4f378a ; le 06/10 : « …ne ressaisiront plus un seul document. ») | accueil:711 | C | C | Factures, contrats (a4_56), courriers (a4_57), documents de chantier (a4_61), relevés d'heures (a4_63), bons de livraison (familles du lecteur) | = n° 1, et le lecteur doit extraire les champs `contrat.*` et `courrier.*` (A1) | 1 / 0 |
| 125 | « Il lit chaque document, le range et prépare la réponse. » (texte réécrit ; le 06/10 : « Lit chaque document, le classe, rédige ce qui repart. ») | accueil:713 | D | B | Réponses au fournisseur préparées (pièce manquante, contestation, confirmation), validées par une personne (a4_38 ; test a4_38_01 rejoué 26/10, 10/10) ; courriers à traiter (a4_57, test a4_57_01) | Une réponse réelle ; voir n° 38 pour le mode d'envoi | 0 / 0,5 |
| 126 | « Chaque document reçu est lu, quels qu'en soient le type et le format — facture, bon de livraison, contrat, courrier —, ses informations extraites puis contrôlées, la pièce classée au bon dossier et la réponse qu'elle appelle rédigée. » | content:145 | C / D | C | Factures et avoirs : B ; contrats suivis, échéance de résiliation (a4_56, test a4_56_01) ; courriers : fiche, factures citées retrouvées (a4_57) ; bons de livraison → réceptions | Le lecteur (A1) doit extraire `contrat.*` et `courrier.*` ; la réponse rédigée n'existe que pour les factures | 3 / 1 |
| 127 | « Tout document reçu, lu et contrôlé, classé au bon dossier, la réponse rédigée. » | content:146 | C / D | C | = n° 126 | = n° 126 | 0 / 0 |
| 128 | « Le système FILED lit les factures fournisseurs reçues par mail et les range au journal d'achats, prêtes pour le cabinet » | content:295 | B | B | a4_17, a4_20, a4_25 | — | 0 / 0,5 |
| 129 | /offres : « FILED » — « Lecture et classement » | offres:401-404 | B | B | — | — | 0 / 0 |
| 130 | Accueil FAQ « Les modèles d'IA ne reçoivent que le strict nécessaire à chaque tâche, jamais un fichier entier. » ; section hébergement « On ne leur envoie que le strict nécessaire : un montant, une date, un nom. » | accueil:609, 1451 | faux | D | Le lecteur envoie la pièce entière au modèle | Lire la pièce sans l'envoyer entière : reconnaissance du texte en région UE avant le modèle, puis envoi des seules zones utiles. Hypothèse lourde, à confirmer par A1 | 5 / 1 |
| 131 | Accueil FAQ « Nous ne vendons pas de mise en conformité, mais l'audit vérifie votre fichier client… » | accueil:613 | — | — | Constat, hors décompte ; = n° 45 | — | — |

## Écarts entre la page du 06/10 et la page du 26/10

- `lib/produits/capacites/factures.ts` (c203f20b, 21/10) : cap:31 passe « attesté » ; cap:144 (n° 106) et cap:152
  (n° 108) ont un nouveau texte, repris ci-dessus.
- `app/page.tsx` (1b4f378a) : la carte FILED de l'accueil a un nouveau texte (n° 124, 125) et a changé de lignes ;
  la FAQ sur l'IA et la conformité aussi (n° 130, 131).
- Toutes les autres phrases du relevé du 06/10 sont toujours en ligne, mot pour mot (vérifié par script sur les
  fichiers de `origin/main` le 26/10). Aucune nouvelle promesse FILED n'a été trouvée ; seule la FAQ n° 48 est
  désormais citée en entier.

## Totaux (26/10)

- **→B ≈ 37,5 j.** Les plus gros : marque et reversement du cabinet (5), lecture sans envoyer la pièce entière (5),
  facturation (3), cabinet multi-dossiers (3), contrats et courriers lus (3), corps du mail (2), messagerie Microsoft et
  installation d'office (2).
- **→A ≈ 63 j**, dont 18 j communs (production, pilote, écarts) ; les écrans manquants (≈ 6 j) y sont comptés.
- **Tiers et décisions de Teo** : vérification Google (CASA) ; partenariats Pennylane, QuickBooks (Intuit), Cegid ;
  IA en région UE (Bedrock) ; prix ; CGV ; statuts vers la plateforme agréée (207/208) ; organisation du support.
