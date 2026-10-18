# Session B4 — TAMILA, le module des cabinets d'avocats

## REPRISE — pause demandée par Teo (06/10/2026, 21 h Z)

**État.** Branche worker-b4 propre, poussée. Fusionnée dans main par le coordinateur jusqu'à d181670 ; après :
1e64795 et 988cec8 (chiffrage, `omega/CHIFFRAGE/tamila.md`), plus la présente note.

**Posé et vert sur la recette** : b4_01 à b4_16 et leurs tests jusqu'au 25 (b4_15 en v2, fad9015). Les ouvriers
tamila-coffre v2 et tamila-purge v2 (fab4e01) sont déployés, avec le cron. Point du matin (b4_14), expertises (b4_16),
lectures longues (b4_15 + socle 19an d'A1, lecteur v28, lecteur_analyses = 'oui').

**Écrans** dans main, en `/espace2/tamila` : avis à rattacher, conflits automatiques, honoraires du cabinet, temps
proposé et forfait, pilotage, lectures longues (citation non retrouvée mise à part), expertise. Recette 188/188 sur
l'exemple, axe 0 écart grave.

**Attend le coordinateur** : fusionner 1e64795 et 988cec8 (chiffrage) et cette note. Rien d'autre à poser.

**Attend Teo** :
- l'activation du coffre Scaleway du banc (vrai appel Key Manager), pour la première lecture longue réelle ;
- le compte AWS Bedrock UE, pour une lecture « en Europe, sans conservation » ;
- l'hébergeur français et l'hébergeur HDS (pièces médicales) ;
- le contrat et le DPA.
Voir `omega/CHIFFRAGE/tamila.md`.

**Prochaine étape exacte** (si Teo accepte le coffre) :
1. Créer un compte de test par l'inscription normale de la recette (mot de passe dans le scratchpad, jamais transmis).
2. Le coordinateur l'ajoute au banc comme gérant.
3. Lancer `RECETTE_MANDATAIRE=1 TAMILA_ACTIVER_COFFRE=1 node omega/recette-b4/analyse-reelle.mjs <session.json>` : coffre,
   dossier neuf, 4 pièces chiffrées, pré-lecture et chronologie.
4. Donner l'id du dossier au coordinateur, puis recetter l'écran « Lectures du dossier » sur le premier résultat fini.

**Ensuite, par ordre du chiffrage** :
1. l'ouvrier `tamila.exporter` (l'archive du dossier n'est jamais produite) ;
2. l'effacement des analyses à la clôture ;
3. le point du matin complété (forfaits dépassés, sans diligence) ;
4. le seuil « sans diligence » à 30 jours, comme la page ;
5. l'export du journal des accès.

**Outils** : souche PostgreSQL locale (`omega/tests/tamila/souche_locale/jouer.sh`, `chmod 711 /tmp/claude-0`
d'abord ; 04/06/10/11 échouent en local seulement, faute des règles de procédure). Recette navigateur :
`omega/recette-b4/recette-tamila.mjs` sur `npx next start -p 3010`.

Branche `worker-b4`. Coordinateur : session_01B4JNQXyT69GytdvE9SjAnE (arrêtée le 06/10 à 03 h 10
Paris) ; relais : session_01BCGFdpRKBvXKjouC75sYBg. **B4 est clos et fusionné.**
Dernière mise à jour : 06/10/2026, matin (lot B4-2 : corrections du retour de recette, b4_01 et b4_04, pièces chiffrées à l'écran).

## Les deux jauges

| Jauge | Valeur | Ce qui la fait monter |
|---|---|---|
| **Mécanique** (le socle fait ce qu'il dit, prouvé par pgTAP sur la recette) | **90 %** — **13 fichiers verts sur 13** sur la recette (06/10, 02 h 25 Paris, ≈ 340 contrôles), plus la chaîne complète rejouée en réel depuis l'écran (§ 8) ; manquent l'effacement à l'échéance et l'archive (ouvriers absents), la lecture des pièces chiffrées (coffre) | 00 à 13 verts sur la recette après b4_01 à b4_04 |
| **Livrable client** (un cabinet peut s'en servir depuis /espace/tamila) | **90 %** — **en ligne sur omegaai.fr/espace/tamila**, prouvé en réel sur la recette ; manquent le coffre (lecture des pièces chiffrées), les ouvriers d'export et d'effacement, et l'installation chez un vrai cabinet en production — écran complet, et **rejoué en base réelle avec les comptes du banc** (§ 8) : installation, dossier chiffré, partie, appel, délai calculé par le socle, pièce chiffrée déposée, membre, confirmation par l'avocat ; pas encore en ligne | fusion sur main et vérification sur omegaai.fr ; le coffre (lecture des pièces chiffrées) ; audiences, murailles, export et clôture rejoués en réel |

## Ce qui manque, ce que Teo doit fournir

- **Le coffre à clés.** `tamila_cles.fournisseur ∈ {local, scaleway}` ; rien dans le
  socle ne fabrique ni ne déballe une enveloppe. Pour la vague 2, l'écran chiffre
  dans le navigateur (WebCrypto, AES-256-GCM) avec une clé de dossier enveloppée
  par une **phrase du cabinet** (fournisseur `local`). Pour aller plus loin il
  faut un KMS Scaleway (clé maître du cabinet, déballage côté serveur) et un
  ouvrier `tamila-coffre` : à décider par Teo.
- **Le lecteur ne lit pas les pièces chiffrées** (`CHIFFREMENT_NON_PRIS_EN_CHARGE`).
  Tant qu'il n'a pas la clé de dossier (donc tant qu'il n'y a pas de coffre),
  chronologie, contradictions et bordereau de la page vitrine restent hors de
  portée. Les avis RPVA se saisissent à la main (`tamila_avis_lu`, confiance
  `saisie`).
- **Honoraires, temps passé, forfaits, marge, charge par avocat** (formule
  Cabinet de la vitrine) : aucune table dans le socle Tamila. Hors vague 2, à
  trancher par Teo.
- Les réponses du coordinateur aux questions de faits ci-dessous.

## 1. Le scénario réel, de bout en bout

Un cabinet fictif pour les tests, « Delorme & Associés » (Paris) : deux
associés (`gerant` Me Delorme, `admin` Me Haddad), un avocat collaborateur
(`valideur` Me Rousseau), une assistante juridique (`collaborateur`), un
stagiaire (`lecteur`). Sur le banc de recette, le gérant du banc joue Me
Delorme. Le dossier : un appel en matière de construction devant la cour
d'appel de Paris, le client du cabinet demeurant en Guadeloupe (c'est ce qui
fait jouer l'augmentation d'un mois de l'art. 915-4).

1. **Installation** — le gérant appelle `tamila_installer(client)` : une ligne
   `tamila_reglages`, trois règles de validation (`cloturer_dossier` → associés,
   `lever_muraille` → gérant, `confirmer_delai` → avocats), deux battements.
   Un collaborateur qui l'appelle est refusé (42501).
2. **Ouverture d'un dossier chiffré** — le navigateur tire l'identifiant du
   dossier et une clé AES-256-GCM, chiffre référence, intitulé et n° RG
   (format `01 ‖ nonce 12 ‖ chiffré ‖ étiquette 16`, c'est ce que vérifie
   `tamila_chiffre_valide`), enveloppe la clé, puis `tamila_creer_dossier(…)`.
   Le gérant est responsable et membre ; une ligne `tamila_cles` active.
   Le même geste par le stagiaire est refusé ; par l'assistante, le dossier
   naît en `attente` avec une demande `ouvrir_dossier`.
3. **Parties** — `tamila_ajouter_partie` : le client (résidence
   `guadeloupe`), l'adversaire (`metropole`), le confrère adverse. Les noms
   sont des bytea chiffrés : le clair ne touche jamais la base.
4. **Membres** — Me Rousseau entre en `intervenant`, le stagiaire en
   `lecteur` borné dans le temps ; le stagiaire en `intervenant` est refusé.
5. **Déclaration d'appel** — `tamila_declarer_appel(dossier, 2026-09-15,
   'appelant', 'a_orienter', 'metropole')` : régime `cpc` (après le
   01/09/2024), les délais de l'événement `declaration_appel` se posent seuls
   en `a_confirmer`, chacun avec sa demande `confirmer_delai` et son délai B5.
6. **Le calcul** — `tamila_calculer_delai(règle, départ, 'metropole',
   'guadeloupe')` : trois mois + un mois (`outre_mer_devant_metropole`,
   art. 915-4), prorogation au premier jour ouvrable (art. 642), détail en
   toutes lettres qui cite l'article ; Tamila et B5 concordent.
7. **Confirmation par un avocat** — Me Rousseau approuve par
   `tamila_decider(demande, 'approuve')` : délai `confirme`, ligne
   `tamila.delai.confirme` au journal. La même décision par l'assistante
   échoue (« confirmé par un avocat qui a accès au dossier »).
8. **Audience** — `tamila_ajouter_audience(dossier, date, 'mise_en_etat',
   'Cour d'appel de Paris', 'Pôle 4 – ch. 5', avocat)`, puis un renvoi par
   `tamila_changer_audience(…, 'renvoyee', nouvelle date)` : l'ancienne
   pointe sur la nouvelle.
9. **Avis RPVA saisi** — une pièce chiffrée (`chiffrement = 'dossier:v1'`)
   déposée dans le dossier ; `tamila_avis_lu(client, dossier, pièce,
   'rpva_ordonnance_mee', {date_avis, date_limite})` : l'appel passe en
   `mise_en_etat`, une date fixée par le juge est posée (`date_fixee`,
   source `ordonnance`). Un `rpva_avis_audience` ajoute l'audience.
10. **Consultation tracée** — `tamila_consulter(dossier)` écrit la lecture ;
    avant, `tamila_parties` est vide pour la personne (politique « après une
    lecture tracée ») ; après, elle les voit trente minutes.
11. **Acte déposé** — `tamila_declarer_acte(délai, date, pièce)` : délai
    `clos`, motif `accuse_rpva`, délai B5 `tenu`, journal `tamila.delai.clos`.
    Un acte déposé après l'échéance lève l'alerte critique.
12. **Muraille** — Me Haddad est écarté par le gérant
    (`tamila_poser_muraille`, motif chiffré) : il ne voit plus le dossier
    (RLS : zéro ligne), ne peut plus y être ajouté ; un gérant ne se met
    pas lui-même derrière. Levée : `tamila_demander_levee_muraille` par le
    gérant → demande `lever_muraille` → `tamila_decider` → `leve_le`.
13. **Export** — `tamila_demander_export(dossier)` exige une lecture tracée ;
    il dépose le travail `tamila.exporter` ; le serveur (service_role)
    appelle `tamila_export_pret(export, chemin, octets, empreinte)` ; puis
    `tamila_telecharger_export` rend le chemin et trace la lecture
    `export.telechargement`. L'export du cabinet entier est réservé au gérant.
14. **Clôture** — `tamila_demander_cloture` par le responsable → demande
    `cloturer_dossier` → approbation d'un associé → `clos`,
    `effacement_prevu_le` = J + 7 à 3 h ; `tamila_annuler_cloture` rouvre
    tant que l'échéance n'est pas passée ; l'effacement avant l'échéance est
    refusé (55000) ; la clé ne se supprime pas (déclencheur).
15. **Rondes** — `private.tamila_controler_delais(now + 48 h)` lève l'alerte
    « à confirmer depuis 48 heures » ; `private.tamila_tache_horaire` dépose
    l'effacement dû et purge les archives échues.
16. **Garde-fous** — aucune écriture directe (`insert` dans
    `tamila_dossiers`, `update` de `tamila_delais` par `authenticated` :
    refusés) ; un mot sentinelle chiffré dans la référence, l'intitulé, les
    parties et le motif de muraille **n'apparaît nulle part** : ni dans
    `journal_opposable`, ni dans l'audit, ni dans les alertes, ni dans les
    demandes, ni dans les travaux, ni dans les libellés des délais.

## 2. Questions de faits au coordinateur (lot B4-0)

1. Les lignes de `tamila_regles_procedure` (code, regime, evenement,
   procedures, partie, acte, augmentable, interruptible, article) et celles
   de `regles_delais` dont le code commence par `tamila.` (code, version,
   quantite, unite, libelle).
2. `public.territoires` : codes et fuseaux ; `public.proroger` et
   `public.echeance_de` existent bien (signatures).
3. La définition de `public.pieces` (colonnes, CHECK sur `chiffrement`,
   `statut`, `type_piece`) et la signature du trigger `pieces_demander_lecture`.
   Existe-t-il une porte générique de dépôt d'une pièce sur un objet
   (`objet_type = 'tamila_dossier'`) ? Sinon je propose `tamila_deposer_piece`.
4. La vue `public.tamila_registre` : `security_invoker` est-il posé ? Qui a
   SELECT dessus ? (sans lui, elle contourne la RLS de `tamila_dossiers`).
5. Le banc : `tamila_reglages` existe-t-il pour `cccccccc-…000c` ? Les
   `user_id` et rôles de gerant / referent / daf / daf2, et des mots de passe
   pour referent et daf (pour rejouer la confirmation par un avocat).
6. `private.preparer_effacement` : signature, pour jouer l'effacement
   complet (sinon je m'arrête à « échéance non atteinte »).
7. `private.reglages` : la valeur de `tamila_lieu_conservation`.
8. Politique Storage INSERT pour `<client>/tamila_dossier/<dossier>/…`
   (le lot 19m ne couvre que `filed_document`).
9. Puis-je ajouter la ligne `tamila` dans `components/espace/ecrans.ts`
   (navigation de l'espace, hors de mon périmètre) ?

## 3. Trous du socle repérés (migrations à venir, `create or replace` seulement)

- `b4_01_tamila_deposer_piece` : dépôt d'une pièce chiffrée dans un dossier
  (si aucune porte générique n'existe, question 3).
- `b4_02_tamila_journal_acces` : « le journal indique qui a consulté quel
  dossier, et à quelle date ; vous pouvez l'exporter » (vitrine) — une porte
  de lecture des `lectures` d'un dossier pour les associés et le responsable.
- `b4_03_tamila_tableau` : le tableau du cabinet pour l'écran (délais à
  confirmer, délais de la semaine, audiences à venir, dossiers sans
  diligence, murailles en place), une seule porte.
- `b4_04_tamila_registre_invoker` si la question 4 le confirme.

## 4. Fait (05/10, soir)

- **Tests pgTAP** `omega/tests/tamila/` : `00_jeu_tamila.sql` (le cabinet
  « Delorme & Associés », cinq comptes, un chiffré d'exemple au format du socle,
  la scène complète), puis `01` à `12`, un par étape du scénario. Tout passe par
  les portes publiques sous `tests.endosser` (rôle `authenticated`, RLS) ; les
  gestes du serveur sous `tests.endosser_serveur()` (`service_role`) ; les
  rondes par `private.tamila_*` en postgres. Un mot sentinelle chiffré dans la
  référence, l'intitulé, deux parties et un motif de muraille, puis cherché en
  clair dans vingt tables (test 11). Les règles de procédure sont découvertes à
  l'exécution (`tests.tamila_regles`) : le test 04 vérifie l'échéance avec
  `regles_delais` + `ajouter_mois` + `proroger`, pas une date en dur.
- **Migrations** `omega/modules/tamila/migrations/` :
  `b4_02_tamila_journal_acces.sql` (la promesse « chaque accès est journalisé,
  exportable » : `tamila_journal_acces(p_dossier, p_depuis)` pour le
  responsable et les associés, lecture elle-même tracée) et
  `b4_03_tamila_cle_dossier.sql` (`tamila_cle_dossier(p_dossier)` rend
  l'enveloppe de la clé à un membre qui voit le dossier : sans elle, un avocat
  collaborateur ne peut rien déchiffrer, `tamila_cles` n'étant lue que par les
  associés). Testées par `12_journal_et_cle.sql`.
- **Écran** `/espace/tamila` — `components/espace/tamila/` : `types.ts`
  (formes = colonnes), `chiffrement.ts` (WebCrypto : AES-256-GCM, format
  `01 ‖ nonce ‖ chiffré ‖ étiquette`, enveloppe de 77 octets sous la phrase du
  cabinet par PBKDF2, trousseau d'onglet, bytea en hexadécimal), `regles.ts`
  (libellés français, ce que la personne peut faire avant le clic), `exemples.ts`
  (six dossiers du cabinet fictif), `portes.ts` (lectures sous RLS, les 30
  portes RPC), `EcranTamila.tsx` (cinq compteurs-filtres, liste l'urgence en
  tête, phrase du cabinet, nouveau dossier chiffré dans le navigateur,
  installation par le gérant), `DossierTamila.tsx` (huit cartes : identité et
  décisions en attente, parties, appel et délais avec le calcul en toutes
  lettres et les cinq gestes de l'avocat, audiences, avis RPVA saisis, membres
  et murailles, exports, journal des accès ; dix-huit dialogues).
  `npx tsc --noEmit` ✓, `npx eslint components/espace/tamila app/espace/tamila`
  ✓ (0 erreur, 0 avertissement), `npm run build` ✓ (`ƒ /espace/tamila`),
  `node omega/recette-b4/recette-tamila.mjs` ✓ aux cinq largeurs (40 contrôles
  + 19 d'enchaînements : calcul 908 + 915-4 relu avant de signer, confirmation,
  acte déposé, muraille, nouveau dossier). Captures dans `omega/recette-b4/`.
- **Pas encore fait** : aucune porte appelée pour de vrai (pas de pose, pas de
  session) ; la navigation de l'espace (`ecrans.ts`, question 9) ; le dépôt
  d'une pièce chiffrée depuis l'écran (question 3) ; les captures en base
  réelle avec le compte du banc.

## 5. Retour de recette sur a05d25c (coordinateur, 05/10 soir) et ce qui en est fait

- 6 fichiers verts sur 11 : 01 (10/10), 02 (31/31), 03 (29/29), 06 (24/24), 07 (28/28), 08 (25/25).
- **04 et 10** « Vous n'écrivez pas dans ce dossier » : l'assistante (collaborateur) posait une
  date sans être membre du dossier — un collaborateur n'écrit qu'en étant membre. Corrigé dans
  `tests.tamila_scene` : elle entre en intervenante.
- **05** `pieces_une_fois` (UNIQUE client, module, objet, sha256) : `tests.tamila_piece` réutilisait
  le même sha. Corrigé : un sha par nom de pièce.
- **09** `demandes_validation_idempotence` : **trou du socle** — la clé de
  `tamila_demander_cloture` est à la seconde ; deux demandes dans la même seconde (demande, décision
  du gérant, annulation, nouvelle demande) se confondent. Migration `b4_04_tamila_demander_cloture.sql`
  (clé au microseconde, `create or replace`).
- **11** test 38 : le journal n'a de ligne qu'après un geste journalisé ; le test annule un délai
  avant de compter. Corrigé.
- Faits reçus : 26 règles de procédure (cpc et cpc2017 : 902, 906_1, 906_2.*, 908, 909, 910.*,
  911.signification), `public.pieces` complète (chiffrement CHECK 'dossier:v1', UNIQUE sur le sha),
  `tamila_registre` déjà en security_invoker (lot 19p : pas de b4_05), politique Storage INSERT des
  membres sous `<client>/<objet_type>/…` (lot 19o), banc sans `tamila_reglages`, comptes referent /
  daf / daf2 valideurs, mot de passe Recette-Omega-2026, `private.preparer_effacement(uuid, text, text)`.
- **b4_01_tamila_deposer_piece.sql** posé : la porte de dépôt calquée sur filed_deposer_piece,
  chiffrement obligatoire, idempotente sur le sha du chiffré, journalisée ; test 13. L'écran dépose :
  le fichier est chiffré dans le navigateur avec la clé du dossier (`chiffrerOctets`), son empreinte
  est celle du chiffré, il part au bucket sous `<client>/tamila_dossier/<dossier>/<nom>.chiffre`, puis
  la porte. Carte « Pièces » (statut, chiffrée, nature, motif du lecteur).
- `components/espace/ecrans.ts` : la ligne `tamila` (et son type), autorisée (réponse 9).

## 6. Lot B4-2 au coordinateur (06/10, matin) — SHA 367fc44 + captures

À poser : `b4_01_tamila_deposer_piece.sql`, `b4_04_tamila_demander_cloture.sql` (b4_02 et b4_03 déjà
posés). À rejouer : `00_jeu_tamila.sql` (modifié), puis 04, 05, 09, 10, 11 (corrigés), 12 et 13
(nouveaux) ; les six verts n'ont pas changé de fond (00 ajoute l'assistante en intervenante : 03 et 07
restent valables). **Écran prêt à fusionner** : `app/espace/tamila/page.tsx`,
`components/espace/tamila/{types,chiffrement,regles,exemples,portes}.ts`,
`components/espace/tamila/{EcranTamila,DossierTamila}.tsx`, `components/espace/tamila/tamila.css`,
`components/espace/ecrans.ts` (ligne tamila + son type), `omega/recette-b4/*`.

## 8. Relecture en base réelle — faite le 06/10 (recette, comptes du banc)

`node omega/recette-b4/relecture-reelle.mjs <session-gerant.json> <session-referent.json>` (dev
pointé sur la recette, `RECETTE_MANDATAIRE=1` pour que Chromium passe le mandataire TLS du
conteneur ; `TAMILA_REF=BANC-10060001` pour rejouer sur le dossier existant). Résultat : **tout
passe**, captures `omega/recette-b4/reel-*-1440.jpg`.

- Gérant : « Installer Tamila » a posé les réglages et les règles du banc ; phrase du cabinet
  mémorisée ; dossier `BANC-10060001` ouvert (clé tirée et enveloppée dans le navigateur, référence,
  intitulé et RG chiffrés), relu déchiffré ; partie « SCI du Moulin », client appelant demeurant en
  Guadeloupe (nom chiffré, relu déchiffré) ; appel déclaré au 15/09/2026 → le socle a posé le délai
  de l'art. 908 : **15/01/2027, « 3 mois … augmentés d'un mois (partie demeurant outre-mer devant une
  juridiction de métropole, art. 915-4) »**, à confirmer ; pièce chiffrée dans le navigateur, envoyée
  au bucket sous `<client>/tamila_dossier/<dossier>/<nom>.<sha12>.chiffre`, déposée par
  `tamila_deposer_piece` (b4_01 posée par le coordinateur) ; Me Referent ajouté en intervenant.
- Referent (valideur) : voit le dossier (chiffré sans la phrase), tape la phrase → la clé lui vient
  par `tamila_cle_dossier` (b4_03) et la référence se déchiffre ; **confirme le délai** → « Approuvé :
  la décision est exécutée », délai « Confirmé », compteur à 0.
- Deux leçons prises à chaud : le bucket n'accorde que l'ajout (pas la réécriture) aux membres → le
  chemin d'une pièce porte le début de son empreinte, jamais d'`upsert` ; l'annuaire ne donne ni nom
  ni courriel au gérant du banc → repli « Vous » / rôle, jamais un identifiant brut.
- Trois dossiers d'essai restent sur le banc (`BANC-10052357`, `BANC-10052359`, `BANC-10060001`) :
  données du banc, à clôturer un jour par le gérant.
- Suite rejouée en réel (`TAMILA_SUITE=1`, mêmes comptes, 06/10) : audience de mise en état posée
  (12/11/2026) ; avis d'audience saisi → le socle l'applique et pose l'audience du 04/02/2027 ;
  muraille sur Daf (motif chiffré) → « En place », levée demandée → décision du gérant → « Levée » ;
  export demandé → « En préparation » (le travail `tamila.exporter` attend son ouvrier, qui n'existe
  pas encore) ; clôture demandée → approuvée par le gérant → « Clos », effacement daté → annulation
  → « Ouvert » ; le journal des accès (b4_02) liste les consultations. Captures
  `reel-audiences`, `reel-muraille`, `reel-cloture`, `reel-journal`. **Tout le scénario est donc
  prouvé en réel, sauf l'effacement à l'échéance et l'archive (ouvriers absents).**

## 9. Fusion

- 06/10, 02 h 17 Paris — `/espace/tamila` (ef08aaf) est **fusionné sur main (b287d04)** par le
  coordinateur, avec l'onglet « Dossiers du cabinet » ; recette cinq largeurs verte sur son build.
  omegaai.fr ne servait le commit qu'après la remise à zéro du quota Vercel.
- 06/10, 02 h 55 Paris — **en ligne** : https://omegaai.fr/espace/tamila répond 200 et sert
  « Dossiers du cabinet » et « Chaque dossier est chiffré avec sa propre clé » (relevé par curl sur
  le HTML servi, déploiement de main 6635b1c). omegaai.fr pointe sur la production (pas de banc) :
  l'écran y montre l'exemple ; la base réelle se relit sur un Next local pointé sur la recette.
- Lot B4-3 (2d2839d puis d2d2338) : les deux derniers contrôles rouges (04 test 60, 13 test 20)
  corrigés, puis 06 (le jour de Paris écrit dans le SQL des throws_ok). **Résultat du coordinateur,
  06/10 à 02 h 25 Paris : 13 fichiers verts sur 13.** Plus rien à poser.

## 10. Le coffre Scaleway (lot B4-5, 06/10) — décision du coordinateur : Scaleway Key Manager

Une clé maître par cabinet chez Scaleway ; chaque clé de dossier (AES-256-GCM, inchangée) est enveloppée
par elle, avec l'identifiant du dossier en données associées. Le mode local (phrase du cabinet) reste celui
d'un cabinet qui n'a pas basculé.

**À poser** (recette) : `omega/modules/tamila/migrations/b4_05_tamila_coffre.sql`, puis jouer
`omega/tests/tamila/14_coffre.sql` (`^test_b4_14_`), et rejouer 02 et 09 (la garde de `tamila_cles` est
reprise en `create or replace`, avec une seule exception : le ré-enveloppement). Pas de drop, pas de
suppression ; toute fonction private nouvelle : `revoke execute … from public`, puis grant au seul rôle utile.
Deux tables neuves **sans clé étrangère vers clients** (`tamila_coffres`, `tamila_coffre_journal`) : la
cascade s'écrit avec un mot interdit dans un fichier à poser ; si le coordinateur la veut, à ajouter par lui.

- Tables : `tamila_coffres` (local | bascule | scaleway, région, identifiant de la clé maître),
  `tamila_coffre_journal` (chaque remise d'enveloppe : qui, quand, dossier, pièce, pour qui, issue ; lu par
  les associés, personne n'y écrit en direct).
- Portes : `tamila_coffre_etat`, `_demander_activation` (gérant), `_activer` (serveur), `_pour_nouvelle_cle`,
  `_pour_membre`, `_pour_lecteur` (serveur), `_conclure` (serveur), `_a_reenvelopper` (associé ou responsable
  qui voit le dossier), `_reenveloppe` (serveur). Déclencheur `tamila_cles_conforme` : un cabinet passé au
  coffre n'ouvre plus de dossier qu'avec une clé émise par le coffre pour ce dossier et cette personne.
- Ré-enveloppement local → scaleway : la personne qui a la phrase déballe la clé dans son navigateur et
  l'envoie au coffre ; le coffre vérifie qu'elle ouvre le témoin (référence chiffrée, étiquette GCM),
  l'enveloppe chez Scaleway, le serveur pose l'enveloppe. **Aucune pièce n'est déchiffrée ni re-chiffrée
  en base.** Les pièces restées « recue » (closes `chiffree_sans_coffre` par le lecteur) repartent à la
  lecture. Le coffre passe « scaleway » quand plus aucun dossier n'est local.
- Ouvrier `omega/functions/tamila-coffre/` (Deno, verify_jwt true) : `index.ts` (entrée), `http.ts` (qui
  appelle : la clé de service = le lecteur ; un autre jeton = une personne ; CORS omegaai.fr), `coffre.ts`
  (activer, nouvelle_cle, cle_dossier, cle_piece, reenvelopper), `keymanager.ts` (Scaleway v1alpha1,
  X-Auth-Token), `portes.ts`, `aesgcm.ts`, `lecteur.ts` (**pour A1** : `clePourPiece` +
  `lirePieceChiffree`, avec le mode d'emploi en tête de fichier). Le coffre ne décide d'aucun droit : chaque
  geste commence par une porte. La clé de dossier ne vit qu'en mémoire, effacée après la réponse, jamais
  journalisée (test dédié).
- **Secrets à poser par Teo** (fonction tamila-coffre) : `SCALEWAY_SECRET_KEY`, `SCALEWAY_PROJECT_ID`,
  `SCALEWAY_REGION` (facultatif, `fr-par` par défaut) ; facultatif `TAMILA_COFFRE_ORIGINES`. Supabase fournit
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`. Sans les secrets Scaleway, le coffre
  répond 503 `KM_ABSENT` et ne pose rien. La clé IAM : une application limitée au Key Manager du projet.
- **À revérifier sur le premier vrai compte** : la forme exacte des réponses Scaleway (`keys[]`, `id`,
  `ciphertext`, `plaintext`) ; le client est écrit d'après la documentation v1alpha1, testé contre un faux.
- Tests : pgTAP `14_coffre.sql` (64 contrôles) ; Deno `omega/functions/tamila-coffre/tests` (18 tests, faux
  Key Manager à vrai AES-GCM avec données associées, faux fetch Scaleway) : `deno task verifier`.
- **Souche locale terminée** (`omega/tests/tamila/souche_locale/jouer.sh`) : PostgreSQL 16 local, socle
  imité, socle Tamila extrait, b4_01 à b4_05, aides d'A5, pgTAP imité. Le 06/10 : 01, 02, 03, 05, 07, 08,
  09, 12, 13, 14 verts (288 contrôles) ; 04, 06, 10, 11 attendent les 26 règles de procédure dans la souche.
- 06/10 après-midi : b4_05 posé par le coordinateur, 1 à 13 verts (388 ok). Le test 14 était mort sur un 42501
  (`tests.tamila_cle_maitre()` appelée sous service_role) : corrigé en a90cd97, rejoué par le coordinateur :
  **14/14 fichiers verts sur la recette, le coffre 64/64** (06/10, 14 h 10 Z).
- **Écran (lot B4-6, eaed84b)** : bouton « Coffre à clés » pour les associés (état, dossiers sous la phrase et au
  coffre) ; « Passer au coffre Scaleway » (gérant) ; « Ré-envelopper N dossiers » (la phrase déballe chaque clé
  ici, le coffre la vérifie et l'enveloppe ; échecs listés, un dossier perso ou muré se fait par son
  responsable) ; au coffre, la clé d'un dossier vient de `tamila-coffre` à son ouverture, les références de la
  liste se lisent à la demande (une ouverture de clé journalisée par dossier) ; un nouveau dossier prend sa clé
  au coffre. Sans b4_05 (la production aujourd'hui), `tamila_coffre_etat` manque : pas de bouton, mode phrase.
  Recette cinq largeurs 67/67 (dont 9 contrôles du coffre à 390), axe-core 0 écart sur le dialogue du coffre.
  **Pas rejoué en base réelle** : il faut la fonction déployée et les secrets Scaleway.
- **Reste** : le branchement dans le lecteur (A1), la passerelle avis lu → `tamila_avis_lu` (le lecteur, ayant
  la clé, peut comparer le n° RG), la relecture en base réelle quand le coffre sera branché.

## Vague 3 — les trois manques pour qu'un vrai cabinet paie Tamila (06/10, demande du coordinateur)

Ce que Tamila fait déjà mieux que le marché : chiffrement par dossier (le serveur ne lit rien), délais de
procédure d'appel calculés et confirmés par un avocat, murailles, journal des accès opposable. Ce qui manque
pour qu'il serve CHAQUE JOUR et qu'on le paie, par ordre d'importance :

1. **Honoraires : convention, temps passé, provisions, facture et compte détaillé.** C'est la raison n° 1
   d'acheter un logiciel de cabinet : Jarvis Legal (LexisNexis) et Secib / Septeo vendent d'abord le suivi du
   temps facturable et la facturation, 45 à 85 € HT par utilisateur et par mois
   ([La Fabrique du Net, Jarvis Legal](https://www.lafabriquedunet.fr/logiciel/jarvis-legal),
   [Secib Suite](https://www.lafabriquedunet.fr/logiciel/secib-suite),
   [LexisNexis, Jarvis facturation](https://www.lexisnexis.com/fr-fr/ppc/jarvis-legal-facturation)). Et c'est
   une obligation : la convention d'honoraires écrite est obligatoire en toute matière sauf urgence (loi
   n° 71-1130 du 31/12/1971, art. 10, rédaction de la loi n° 2015-990 du 6/08/2015 ; décret n° 2017-1226 du
   2/08/2017 qui l'inscrit dans le décret de déontologie)
   ([Juritravail](https://www.juritravail.com/avocat/pratique/convention-d-honoraires-d-un-avocat-contrat-conditions/Id/10),
   [Eurojuris, loi Macron](https://www.eurojuris.fr/gestion/articles/loi-macron-quels-impacts-pour-avocats-35825.htm)).
   Le RIN fixe les critères (art. 11.2 : temps consacré, difficulté, résultat…), les modes de règlement
   (art. 11.6) et le **compte détaillé définitif** avant tout règlement définitif, frais, émoluments et
   honoraires distincts, provisions déduites (art. 11.7)
   ([Cabinet ACI, les honoraires d'avocats](https://www.cabinetaci.com/les-honoraires-davocats/),
   [CNB, guide d'évaluation de la prestation](https://www.cnb.avocat.fr/sites/default/files/documents/cnb_guide-pratique_evaluation-prestation-avocat_3e-ed.pdf)).
   Sans cela, le cabinet garde un second logiciel, et Tamila reste un « plus ».
2. **Le contrôle des conflits d'intérêts à l'ouverture d'un dossier** (RIN art. 4 : l'avocat vérifie,
   avant d'accepter, qu'il ne défend pas des intérêts opposés à ceux d'un client actuel ou ancien), et la
   vigilance LCB-FT pour les dossiers où l'avocat y est assujetti (CMF art. L.561-3 ; transactions
   financières ou immobilières)
   ([Swim Legal, déontologie](https://www.swim.legal/blog/deontologie-avocat-regles-obligations-entreprise),
   [CNB, guide LCB-FT, 3e éd.](https://www.cnb.avocat.fr/sites/default/files/documents/cnb_guide_lutte-contre-blanchiment_3eme_edition.pdf)).
   Difficulté propre à Tamila : les noms des parties sont chiffrés ; il faudra un index aveugle (HMAC du nom
   normalisé sous une clé du cabinet) pour chercher sans lire.
3. **L'arrivée automatique des avis RPVA** au lieu de la saisie à la main : e-barreau v2 se dit ouvert et
   interopérable avec les logiciels de gestion de cabinet
   ([CNB, atelier e-barreau v2](https://www.cnb.avocat.fr/sites/default/files/grand_atelier_des_avocats_-_atelier_e-barreau_v2.pdf)).
   Les gabarits de lecture existent déjà (CHAMPS-LECTURE-TAMILA, lecteur d'A1), le coffre aussi (§ 10) ; il
   manque la porte d'entrée (relevé de la boîte, ou transfert des notifications par courriel vers le socle)
   et la passerelle avis lu → `tamila_avis_lu`.

**N° 1 commencé le 06/10** (lot B4-7) : `b4_06_tamila_honoraires.sql`, test `15_honoraires.sql`, carte
« Honoraires » du dossier. Voir § 11.

## 11. Les honoraires (vague 3, n° 1 ; lot B4-7, 06/10)

- **Base** (32479a4) : `b4_06_tamila_honoraires.sql`, test `15_honoraires.sql` (51 contrôles, souche locale ;
  série complète 339/339). Convention (temps passé, forfait, mixte ; honoraire de résultat ; TVA ; urgence),
  temps passé (description chiffrée), provisions (RIN 11.6), facture et compte détaillé définitif (RIN 11.7)
  numérotés H-AAAA-NNNNNN sans trou, annulation qui garde le numéro, drapeau « ouvert depuis 15 jours sans
  convention ». Effacement : seuls les temps partent avec le dossier ; factures, provisions, conventions restent
  (pièces comptables, C. com. L.123-22).
- **Écran** : carte « Honoraires » du dossier (`components/espace/tamila/HonorairesTamila.tsx`, insérée dans
  DossierTamila après les pièces) : trois chiffres (à facturer HT et durée, provisions disponibles, reste dû),
  la convention et sa signature (pièce du dossier), le temps de chacun (description déchiffrée avec la clé du
  dossier), provisions et factures ; dialogues : saisir du temps, convention, signature, provision, reçue,
  facturer (aperçu HT / TVA / TTC / provisions / reste avant d'émettre), payée, annuler. Sans b4_06 sur la
  base, la carte ne s'affiche pas (la production aujourd'hui). Recette : 79 contrôles aux cinq largeurs, dont
  13 sur les honoraires (saisie 1 h 30 → 687,50 € HT, facture H-2026-000042, dossier sans convention signalé,
  « Facturer » gris sans convention, carte qui tient à 390) ; axe-core 0 écart sur le dialogue. La recette a
  trouvé un vrai défaut avant la poussée (minutes par défaut affichées 30, lues 0) : corrigé.
- **Pas fait** : l'édition imprimable de la facture (PDF : nom du client chiffré, donc à composer dans le
  navigateur), le tableau des honoraires du cabinet (tous dossiers), le minuteur, l'export comptable.
  **Pas rejoué en base réelle** : b4_06 à poser d'abord.

## 12. Conflits d'intérêts et vigilance LCB-FT (vague 3, n° 2 ; lot B4-8, 06/10)

- **Base** (875e83f) : `b4_07_tamila_conflits.sql`, test `16_conflits.sql` (47 contrôles ; série locale 386/386).
  Index aveugle : clé d'index du cabinet (enveloppée sous la phrase, ou sous la clé maître Scaleway par
  tamila-coffre), empreintes HMAC-SHA-256 des noms normalisés et des SIREN, jamais lisibles en direct ; contrôle
  client ↔ adverse = conflit, même côté = signalé, anciens clients (dossiers effacés) compris, dossiers hors de
  vue comptés sans être nommés, partie retirée ignorée ; décision de l'avocat (conflit levé ou refus ; « pas de
  conflit » interdit quand un conflit est trouvé), motif en code ; vigilance LCB-FT (activité assujettie,
  identification du client et du bénéficiaire effectif, risque, revue annuelle) ; résumé `tamila_conformite`.
  Empreintes et contrôles conservés après l'effacement du dossier (registre des conflits) : **à confirmer par
  Teo** (sinon une ligne de `private.tables_objets`). **Décision de Teo (06/10) : on les garde** ; la carte le dit en
  une ligne (« les noms ne sont jamais conservés en clair ; une empreinte reste pour détecter un conflit avec un
  ancien client »).
- **Ouvrier** (2868bcb) : tamila-coffre `nouvelle_cle_index` (gérant) et `cle_index` (personne du cabinet), données
  associées « index:<client> ». 20 tests Deno.
- **Écran** : `components/espace/tamila/index.ts` (normalisation : accents, formes sociales, civilités, mots vides,
  mots triés — « SCI du Moulin » = « Moulin (SCI du) » ; SIREN / SIRET ; HMAC) et la carte « Conflits d'intérêts
  et vigilance » (`ConformiteTamila.tsx`, après les honoraires) : création de la clé d'index par le gérant,
  indexation et contrôle des parties du dossier en un geste, résultats nommés (référence en clair du dossier si
  on la connaît), décision, vigilance. Exemple : 2026-0430 « Garnier c/ SCI du Moulin » montre un conflit avec
  2026-0412 (la SCI y est cliente). Recette cinq largeurs 90/90 (11 sur les conflits et la vigilance), axe-core
  0 écart sur le dialogue de vigilance. **Pas rejoué en base réelle.**
- **Limites** : un nom mal orthographié n'est pas trouvé (égalité stricte après normalisation, pas de
  ressemblance : un index aveugle ne permet pas la recherche floue sans affaiblir l'aveuglement) ; la clé d'index
  d'un cabinet local ne se ré-enveloppe pas encore au passage au coffre (à faire, comme les clés de dossier).

## 13. Les avis RPVA lus (vague 3, n° 3 : la part faisable sans compte Scaleway ; lot B4-9, 06/10)

- La porte d'entrée (relevé e-barreau ou transfert des notifications) reste à concevoir avec Teo : aucune API
  publique e-barreau connue pour un logiciel tiers ; le socle a un canal courriel (`deposer_reception`) mais une
  pièce arrivée par courriel est en clair et sans dossier : à rattacher puis chiffrer, ce qui suppose l'écran.
- **Fait** : la passerelle « avis lu → délais » pour les pièces déposées dans un dossier, dès que le lecteur lit les
  pièces chiffrées (coffre + A1). `b4_08_tamila_avis_lecteur.sql` (deux portes serveur : `tamila_dossier_pour_lecteur`,
  `tamila_avis_du_lecteur`), test `17_avis_lecteur.sql` (15 contrôles : serveur seul, pièce lue, confiance,
  **aucune valeur hors des sept clés** (un nom est refusé), avis idempotent, audience posée à l'heure de Paris, RG
  différent → à vérifier + alerte critique) ; côté lecteur, `tamila-coffre/lecteur.ts` (`avisDepuisLecture`,
  `rgConcorde`, `dossierPourLecteur`, `poserAvisLu`, 5 tests Deno de plus, 25 au total) ; CHAMPS-LECTURE-TAMILA
  mis à jour. **À A1** : le branchement dans `lire_piece.ts` (mode d'emploi en tête de la section de `lecteur.ts`).

## 14. La facture imprimable et l'en-tête du cabinet (suite du n° 1 ; lot B4-10, 06/10)

- **Base** (71b54f3) : `b4_09_tamila_facture_entete.sql` (colonne `tamila_reglages.facture_entete`, ajoutée si
  absente ; porte `tamila_poser_entete_facture`, gérant seul, clés connues, SIREN, TVA FR, IBAN, délai de paiement
  0-60 jours) ; test `18_facture_entete.sql` (11 contrôles, verts sur la souche).
- **Écran** : `facture.ts` (la facture en HTML autonome : mentions CGI 242 nonies A et C. com. L.441-9, détail
  du temps avec répartition au centime près du total facturé, forfait, déboursés hors TVA, provisions déduites,
  reste à payer ou trop-perçu, échéance, pénalités L.441-10 et indemnité de 40 € D.441-5, compte définitif RIN
  11.7 ; tout échappé) et `FactureImprimable.tsx` (aperçu dans un cadre isolé sans script, impression ou PDF par
  le navigateur ; adresse du client tapée, jamais enregistrée ; le gérant modifie l'en-tête sur place). Lien
  « Imprimer » sur chaque facture de la carte Honoraires. Recette 99/99 (9 sur la facture imprimée), axe-core
  0 écart. **Rien ne part au serveur** : nom du client et détail du temps restent dans le navigateur.

## 15. La porte d'entrée automatique des avis : le canal courriel du socle (lot B4-11, 06/10)

Décision du coordinateur : pas d'API e-barreau ouverte, on n'en invente pas. Le cabinet fait suivre ses
notifications RPVA vers son adresse de réception (ligne `expediteurs`, module tamila, à créer par le
coordinateur, du type `cabinet-x@recu.omegaai.fr`) ; `deposer_reception` publie `reception.nouvelle`.

- **Base** (e39e4ef) : `b4_10_tamila_avis_entrants.sql` — table `tamila_avis_entrants` (une ligne par réception,
  sans un mot en clair : type supposé en code, nombre de pièces, statut `a_rattacher|rattache|ecarte|expire`,
  dossier, pièces chiffrées, échéance à 7 jours) ; abonnement `reception.nouvelle → tamila` ; portes
  `tamila_rattacher_avis` (les pièces doivent être des pièces chiffrées du dossier), `tamila_ecarter_avis`
  (avocats) ; purge : la réception passe `traitee`, sujet, corps et expéditeur vidés, et un travail
  `tamila.purger_reception` est déposé ; passage `tamila-receptions` toutes les 5 min (pg_cron) : au-delà de 7
  jours, `expire` + purge + alerte critique. Portes serveur `tamila_reception_a_purger` /
  `tamila_reception_purgee` (service_role seul). Sans drop, sans effacement SQL, revoke from public partout.
  Test `19_avis_entrants.sql` : 28 contrôles, verts sur la souche (série locale 440/440).
- **Ouvrier** (b4b664e) : `omega/functions/tamila-purge/` — prend les travaux `tamila.purger_reception`,
  efface au bucket les fichiers de `<client>/receptions/` (chemins hors de ce préfixe ignorés), puis
  `tamila_reception_purgee`. 4 tests Deno. Aucun secret propre (clé service du socle). À déployer, et à
  appeler toutes les 5 minutes comme les autres ouvriers.
- **Écran** : `AvisEntrantsTamila.tsx`, au-dessus des compteurs (gérant, admin, valideur, collaborateur ; pas
  le stagiaire). Le n° RG cité par le courriel est comparé dans le navigateur aux n° RG déchiffrés : dossier
  proposé. L'avocat choisit ; chaque pièce jointe est téléchargée, chiffrée avec la clé du dossier (trousseau,
  coffre ou phrase), déposée (`tamila_deposer_piece`, type d'avis choisi ou laissé au lecteur), puis
  rattachée. Mention à l'écran : « L'avis transite en clair chez le prestataire de courriel et dans sa
  réception le temps du rattachement, sept jours au plus ; dès qu'il est rattaché (ou écarté), cette copie
  est effacée. » Recette 109/109 (10 sur la file), axe-core 0 écart grave (carte et dialogue).
- **Limites, honnêtement** : (1) la politique RLS du socle sur `receptions` laisse tout membre du cabinet lire
  la réception le temps qu'elle est en clair (stagiaire et membres murés compris) — à resserrer côté socle
  si besoin ; (2) l'écran suppose que la politique SELECT du bucket laisse un membre télécharger
  `<client>/receptions/…` — à vérifier en recette ; sinon il faut une URL signée par une fonction ;
  (3) un courriel sans pièce jointe ne se rattache pas : il s'écarte et l'avis se saisit à la main.

## 16. L'effacement réel des fichiers à la clôture (carnet du coordinateur, n° 1 ; lot B4-12, 06/10)

Constat : la ronde horaire déposait `tamila.effacer_dossier`, `tamila.purger_export` et `tamila.detruire_cle`, mais
aucun ouvrier ne les prenait ; et `tamila_effacer_dossier` posait sa preuve sans vérifier que les pièces chiffrées
avaient quitté le bucket.

- **Base** : `b4_11_tamila_effacement_fichiers.sql` — `tamila_dossier_a_effacer` (mêmes refus que
  `tamila_effacer_dossier` : clôture approuvée, échéance atteinte ; prépare le manifeste ; rend les fichiers du
  manifeste et tout objet resté sous `<client>/tamila_dossier/<dossier>/`, buckets des locataires seulement) ;
  `tamila_effacer_dossier_verifie` (55000 tant qu'un fichier du dossier est au stockage, sinon
  `tamila_effacer_dossier` et sa preuve) ; `tamila_fichiers_restants`. service_role seul, revoke from public.
  Test `20_effacement_fichiers.sql` : 20 contrôles, verts sur la souche (la souche imite `preparer_effacement`).
- **Ouvrier** : `tamila-purge` prend désormais quatre genres (réception, dossier, archive, clé). Dossier : liste →
  effacement au bucket (rien hors de `<client>/`) → constat ; s'il reste un fichier, le travail est repris au
  passage suivant, le dossier reste intact. Archive : fichier effacé puis `tamila_export_purge`. Clé :
  `tamila_cle_detruite` (enveloppe mise à zéro). 8 tests Deno.
- **Reste** : l'ancienne porte `tamila_effacer_dossier` reste appelable par le serveur sans la vérification (je ne
  la réécris pas) ; l'ouvrier, lui, ne passe que par la porte vérifiée.

## 17. Le temps proposé à la saisie, le forfait consommé (carnet du coordinateur, n° 2 ; lot B4-13, 06/10)

- **Base** : `b4_12_tamila_temps_propose.sql` — `tamila_temps.origine` (« audience:<id> », « acte:<id> »,
  « avis:<id> » ; un même événement une fois par personne tant que le temps n'est pas annulé) ;
  `tamila_temps_ecartes` (ce que chacun a ignoré, lu par son auteur seul, effacé avec le dossier) ;
  `tamila_conventions.minutes_prevues`. Portes `tamila_saisir_temps_propose` (l'événement doit être du dossier ;
  passe par `tamila_saisir_temps`, mêmes règles), `tamila_ecarter_proposition`, `tamila_prevoir_forfait` (qui
  gère le dossier, convention au forfait ou mixte). Test `21_temps_propose.sql` : 20 contrôles verts (souche).
- **Écran** : `temps.ts` (propositions des soixante derniers jours : audience tenue ou passée — plaidoiries 2 h,
  mise en état 30 min… ; acte déposé — conclusions 4 h, signification 30 min ; avis reçu — 15 min, conclusions
  adverses 1 h de lecture ; l'accusé de dépôt n'est pas reproposé ; filtre par personne) et carte Honoraires :
  « Proposé à la saisie » (Saisir ouvre le formulaire pré-rempli, Ignorer ne le propose plus) ; « Forfait
  consommé » (jauge, temps passé de tous contre temps prévu, taux horaire effectif, alerte à 80 % et au
  dépassement). Exemple : 2026-0377 au forfait, 17 h sur 20 h. Recette 124/124, axe 0 écart grave.
- Les durées proposées sont des usages, corrigeables ; rien ne se saisit sans le geste de l'avocat.

## 18. Avant le carnet : conflits automatiques, honoraires du cabinet, lecture des réceptions (06/10)

- **Contrôle des conflits automatique** (5503ad6, écran seul) : dès qu'un client ou un adversaire entre au
  dossier, la carte « Conflits d'intérêts » l'indexe et le contrôle sans geste (si la clé d'index s'ouvre) ; un
  conflit s'annonce en alerte avec « Décider » ; les parties jamais indexées sont signalées. Recette : 6 contrôles.
- **Tableau des honoraires du cabinet** (198cf78, écran seul, lecture RLS) : bouton « Honoraires du cabinet » dans
  l'en-tête (avocats) ; une ligne par dossier visible, calculée comme la carte du dossier (`resumer`) ; totaux (à
  facturer, reste dû, facturé et encaissé dans l'année) ; « À traiter » (sans convention, facture impayée à
  30 jours, forfait à 80 %, clos avec du temps non facturé) ; export CSV composé dans le navigateur. Recette :
  17 contrôles (1440 et 390), axe 0 écart grave.
- **`private.tamila_peut_lire_reception(client, user)`** (b4_13, test 22, 10 contrôles) : avocat du cabinet
  (gerant, admin, valideur) sous aucune muraille active. Pour le lot socle d'A5 (receptions et `receptions/`).
  Conséquence à prévoir : quand A5 l'appellera, l'assistante verra la file des avis à rattacher (RLS de
  `tamila_avis_entrants`) sans leur contenu ; à aligner alors (file réservée aux avocats).

## 19. Le point du matin (carnet du coordinateur, n° 3 ; lot B4-14, 06/10)

- **Base** : `b4_14_tamila_point_matin.sql` — `tamila_deposer_points` (cron `tamila-matin` toutes les 30 min, dès
  5 h heure de Paris) dépose par `deposer_section` :
  · à chaque avocat ou collaborateur, « Tamila : vos délais et audiences » sur SES dossiers (responsable ou membre,
    hors muraille) : délais à confirmer (avocats ; critique au-delà de 48 h), échéances dépassées sans acte et
    échéances des sept jours (critique à J-2), audiences d'aujourd'hui et de demain, audiences des trois derniers
    jours sans temps saisi (b4_12), avis reçus par courriel à rattacher (qui lit la réception, b4_13) ;
  · au gérant, « Tamila : le cabinet » : délais dépassés sans acte, conflits sans décision, dossiers sans
    convention après quinze jours, factures impayées à trente jours (montant), effacements des sept jours.
  Aucun nom, aucune référence, aucune juridiction, aucun objet désigné (le socle n'accepterait pour un objet
  chiffré qu'un gabarit) : des comptes, des dates, des actes et des natures d'audience, lien `/espace/tamila`.
  Section vide retirée ; erreur d'un cabinet → alerte, les autres continuent. Le serveur seul.
- **Test** `23_point_matin.sql` : 18 contrôles (souche : `deposer_section` / `retirer_section` imités). Série
  locale 530 ok (les 25 échecs connus de 04/06/10/11, faute des règles de procédure en local).

## 20. Demander une lecture longue (carnet n° 4, part Tamila ; lot B4-15, 06/10)

- **Base** : `b4_15_tamila_demander_analyse.sql` (APRÈS le socle `19an_analyses.sql` d'A1) —
  `tamila_demander_analyse(dossier, type, pièces?)` : un avocat qui écrit dans le dossier ; prelecture |
  chronologie | contradictions | bordereau ; clé du dossier au coffre Scaleway sinon 55000 ; pièces chiffrées du
  dossier déjà lues (ou choisies, du dossier) ; 200 au plus, 60 en pré-lecture ; une analyse du même type en cours
  est rendue telle quelle ; appelle `private.demander_analyse` (qui dépose `lecteur.analyser`). Politique
  RESTRICTIVE sur `analyses` : module tamila ⇒ `tamila_voit_dossier_pour` (murailles), quel que soit le gardien de
  `voit_objet`. Test `24_demander_analyse.sql` : 15 contrôles (souche : table et `demander_analyse` copiées de 19an,
  `voit_objet` imité au plus large pour prouver la restriction).
- **Écran** : à faire quand le lecteur rendra ses premiers résultats (déchiffrement, constats, citations).

## 21. Le pilotage du cabinet (carnet n° 5 ; lot B4-16, 06/10)

- **Écran seul** (lecture sous RLS, calcul dans le navigateur) : bouton « Pilotage » dans l'en-tête (avocats),
  `PilotageCabinet.tsx` + `pilotage.ts` (fonctions pures). Cinq vues :
  · **Marge** : (facturé HT + à facturer HT) − temps passé × coût de revient horaire (réglé dans la vue, gardé
    dans ce navigateur, 90 € par défaut), taux horaire réalisé ; les dossiers en perte d'abord ;
  · **Charge** : par personne, temps saisi sur 30 jours, dossiers dont elle est responsable, délais et audiences
    des 30 jours ;
  · **Séries** : dossiers vivants où figure la même partie (intitulé « A c/ B » déchiffré, nom normalisé comme
    l'index des conflits), ou trois dans la même matière devant la même juridiction ;
  · **Sans diligence** : rien depuis 45 jours (temps, acte, audience, avis, pièce) ;
  · **Pièces attendues** : exemplaire signé de la convention, accusé de dépôt d'un acte déclaré, pièce d'identité
    d'un dossier assujetti LCB-FT, dossier sans aucune pièce après sept jours.
- Recette 162/162 (15 sur le pilotage, 1440 et 390), axe 0 écart grave. Aucune base à poser.
- Limite : la marge ne connaît pas les déboursés engagés non refacturés ; le coût de revient est une estimation
  que le cabinet règle.

## 22. L'écran des lectures longues (carnet n° 4, part écran ; lot B4-17, 06/10)

- Carte « Lectures du dossier » (`AnalysesTamila.tsx`, `analyses.ts`) dans le dossier ouvert : un avocat qui écrit
  dans le dossier demande une pré-lecture, une chronologie, les contradictions ou le bordereau
  (`tamila_demander_analyse`) ; désactivé si la clé du dossier n'est pas au coffre (le lecteur ne peut pas lire).
  La liste des analyses (statut, comptes par gravité, pièces non lues) ; « Lire » déchiffre `resultat_chiffre` avec
  la clé du dossier, dans le navigateur, et montre résumé, constats (données propres au type : date à sa
  précision, acteur, nature ; numéro de pièce…) et citations (pièce, page, lignes, extrait), chacune « Vérifiée »
  ou « Non vérifiée ». Export Word (.doc HTML) et impression ou PDF, composés dans le navigateur.
- Recette 181/181 (19 sur les lectures, 1440 et 390), axe 0 écart grave. Exemple : une chronologie prête sur
  2026-0412 (en mémoire, non chiffrée). **Pas encore vu sur un vrai résultat du lecteur** : à recetter dès la
  première analyse rendue en base.

## 23. L'expertise et les pièces attendues de l'expert (lot B4-18, 06/10, demande du coordinateur)

- **Base** : `b4_16_tamila_expertises.sql` — `tamila_expertises` (des dates et des statuts, aucun nom ; RLS qui voit le
  dossier ; effacée avec le dossier) ; `tamila_poser_expertise` (qui écrit dans le dossier ; champs connus, dates
  AAAA-MM-JJ, cohérence : ordonnance d'abord, pré-rapport avant la fin des dires, dires avant le rapport) ;
  `tamila_noter_expertise` (consignation versée, pré-rapport reçu, dires adressés, rapport reçu — qui clôt —, abandon ;
  jamais dans le futur). Le point du matin (b4_14) gagne ses lignes : consignation (art. 271) et dires (art. 276) à
  J-7, critiques à J-2 ; pré-rapport et rapport en retard (`tamila_point_lignes_personne` remplacée, bloc 6 ajouté).
  Test `25_expertises.sql` : 16 contrôles ; série locale 562 ok (25 échecs connus 04/06/10/11).
- **Écran** : carte « Expertise » dans le dossier (`ExpertiseTamila.tsx`) ; le pilotage « Pièces attendues » liste
  le justificatif de consignation, le pré-rapport, nos dires et le rapport définitif. Exemple : 2026-0398, pré-rapport
  en retard, dires dans douze jours. Recette 188/188, axe 0 écart grave.

## 7. Prochaine étape

1. (fait : en ligne, vérifié le 06/10.)
2. (fait : 13/13 verts).
3. Souche locale (`omega/tests/tamila/souche_locale/`, en cours) : finir 03_pgtap et jouer.sh pour
   jouer les tests ici avant chaque lot.

## 5 bis. Lot B4-1 au coordinateur (05/10, 23 h)

1. Poser `omega/tests/tamila/00_jeu_tamila.sql` (après le `00_installation.sql`
   d'A5), puis jouer `01` à `11` dans l'ordre et me renvoyer la sortie brute de
   chaque `runtests`.
2. Poser `b4_02_tamila_journal_acces.sql` et `b4_03_tamila_cle_dossier.sql`,
   puis jouer `12_journal_et_cle.sql`.
3. Les réponses aux questions de faits (§2) : surtout 1 à 3 et 5.

## Journal

- 05/10 soir — lecture de CLAUDE.md, AGENTS.md, CONTRAT-OUVRIER, NOTES-COORDINATEUR,
  NOTES-A3, SOCLE-EXTRAITS-TAMILA (13 tables, 110 fonctions, 3 crons), la page
  /secteurs/avocats. Scénario écrit, envoyé au coordinateur.
- 05/10, 22 h–23 h — tests 00 à 12, migrations b4_02 et b4_03, écran
  /espace/tamila et sa recette. Lot B4-1 envoyé.
- 05/10, 23 h — pause demandée par le coordinateur (limite d'usage) ; reprise le 06/10.
- 06/10, matin — retour de recette traité (00, 11, b4_04), b4_01 + test 13, carte Pièces et dépôt
  chiffré à l'écran, onglet dans ecrans.ts, souche locale commencée. Lot B4-2 envoyé (367fc44).
- 06/10 — relecture en base réelle, tout passe (§ 8).
- 06/10, 03 h 30 Paris — reprise par session_01ACKfUXKSgnD521nunHBY1w (Opus 5.5) après l'arrêt de
  session_01HRJ7AmG9hKtDenMRTt1eW6 (crédit Fable). Écrit `omega/modules/tamila/CHAMPS-LECTURE-TAMILA.md` pour A1 :
  les dix avis RPVA (`type_piece` = code `rpva_*` de `tamila_avis_lu`), leurs champs, `tamila_piece_autre`, et le
  rappel qu'aucune pièce Tamila n'est lisible avant le coffre. Passerelle pièce lue → avis : à venir avec le coffre.
