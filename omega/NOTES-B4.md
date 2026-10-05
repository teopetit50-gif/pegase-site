# Session B4 — TAMILA, le module des cabinets d'avocats

Branche `worker-b4`. Coordinateur : session_01B4JNQXyT69GytdvE9SjAnE.
Dernière mise à jour : 05/10/2026, soir (scénario écrit, rien codé).

## Les deux jauges

| Jauge | Valeur | Ce qui la fait monter |
|---|---|---|
| **Mécanique** (le socle fait ce qu'il dit, prouvé par pgTAP sur la recette) | **0 %** | les lots de tests joués par le coordinateur, verts |
| **Livrable client** (un cabinet peut s'en servir depuis /espace/tamila) | **0 %** | l'écran en ligne, les portes appelées pour de vrai avec le compte de recette |

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

## Journal

- 05/10 soir — lecture de CLAUDE.md, AGENTS.md, CONTRAT-OUVRIER, NOTES-COORDINATEUR,
  NOTES-A3, SOCLE-EXTRAITS-TAMILA (13 tables, 110 fonctions, 3 crons), la page
  /secteurs/avocats. Scénario écrit, envoyé au coordinateur.
