# Session B4 — TAMILA, le module des cabinets d'avocats

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
