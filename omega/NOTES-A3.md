# Session A3 — l'écran client (validations, FILED, point du matin)

Branche `worker-a3`. Dernière mise à jour : 06/10/2026, 03 h 50 Paris (reprise par la session Opus 5.5 `session_01Npbh1aR6LoEX7PZDchMSca`, à la suite de `session_01DdgwRadkJFx5u9buwh5crS`).

## Fait

Trois écrans pour une personne connectée, sur la charte du site (monde
`.resa`, boutons `.r-btn`, champs `.rv-champ`, Dialog de `components/ui`),
construits sur des **données d'exemple clairement marquées** (ruban
« Données d'exemple », entreprise fictive Atelier Bertin) avec un
**interrupteur** dans la barre qui bascule sur la **base réelle** (Supabase,
RLS, portes RPC). Sans session, l'interrupteur est gris et l'exemple reste.

- **/espace/validations** — `components/espace/validations/`
  - la file triée par priorité (retard → aujourd'hui → semaine → plus tard →
    sans échéance ; puis échéance, montant, âge), groupée par échéance ;
    filtres « à décider par moi / en attente / décidées / toutes » et par
    module ; quatre compteurs ;
  - le détail : règle (X approbations sur Y, rôles), ce que porte la demande
    (payload), décisions déjà prises (avec « au nom de »), jauge ;
  - **séparation saisie / approbation** affichée (bandeau ambre, boutons
    gris) quand le demandeur est la personne connectée ; rôle et délégation
    recalculés à l'écran (`regles.ts`), la base restant juge ;
  - **Approuver / Refuser** = INSERT dans `public.approbations`
    (`user_id = auth.uid()`, `au_nom_de` + `delegation_id` quand on décide
    sous délégation) ; **commentaire, pièce jointe et motif de refus
    obligatoires quand la règle l'exige** (bouton gris tant qu'il manque) ;
    la pièce jointe part dans `omega-clients/<client>/demande_validation/
    <demande>/…` et son chemin est cité dans le commentaire ;
  - **Modifier** = RPC `modifier_demande(p_demande, p_resume, p_montant,
    p_payload)` ; **Déléguer** = INSERT dans `public.delegations`.
- **/espace/filed** — `components/espace/filed/`
  - en haut : bloquées, en litige, en attente, traitées (filtres) ;
  - la liste numérotée `R2026-000001`, état, nature, fournisseur, TTC,
    compteurs bloquants / à vérifier ;
  - le dossier : valeurs lues **cliquables → la citation se surligne dans
    la pièce** (page + boîte en fractions, `pieces_valeurs`), contrôles
    (échoués / levés / passés) avec **preuve et motif officiel DGFiP**
    (`filed_motifs_refus`), lignes, TVA, rapprochement, IBAN connus, fil
    (`filed_historique`) ;
  - sept portes, jamais d'UPDATE : `filed_corriger_facture`,
    `filed_confirmer_valeurs`, `filed_lever_anomalie`,
    `filed_classer_document`, `filed_rattacher_fournisseur`,
    `filed_proposer_iban`, `filed_bloquer_fournisseur` ; motif obligatoire
    (≥ 3 caractères, comme la contrainte de `filed_levees`) ;
  - la pièce : en exemple, facsimilé **dessiné à partir des valeurs lues**
    (ce qui est surligné est ce qui est écrit) ; en base réelle, **URL
    signée côté serveur** (`app/espace/filed/actions.ts`, 10 min, session
    de la personne) — image affichée telle quelle, PDF : texte de la page
    (`pieces_pages.texte`) + lien d'ouverture.
- **/espace/point** — `components/espace/point/` : le point du jour par
  `lire_point(p_point)`, sections dans l'ordre, gravité par ligne, rang 0 =
  « rien à signaler », sections incomplètes et motifs du point ; flèches
  pour les jours passés ; sans point du jour, `apercu_point` à la demande.
- **Suites du lot 19** (05/10, après les réponses du coordinateur) :
  - validations : **annuler sa propre demande** en attente (UPDATE
    `statut = 'annulee'`, policy du demandeur) et une carte **« Mes
    délégations »** (données et reçues, en cours) avec **révocation**
    (UPDATE `revoquee_le`, policy du délégant) ;
  - FILED : **désigner une commande** (`filed_rattacher_commande`, liste de
    `filed_commandes` filtrée par fournisseur, lignes montrées avant de
    confirmer), **apparier une ligne** (`filed_apparier_ligne`, par ligne
    du tableau ; la colonne « Commande » montre la ligne appariée et
    l'écart de prix unitaire ou « conforme », d'après `filed_appariements`),
    **déposer un document** depuis l'espace (fichier dans `omega-clients`
    puis `filed_deposer_piece` ; le document reçoit son numéro et part en
    lecture).
- **Rendu des pages PDF** (05/10, soir) : `components/espace/filed/PagePdf.tsx`
  dessine chaque page d'un PDF réel (URL signée) dans un canvas par pdf.js
  (`pdfjs-dist`, build **legacy** : la moderne lève
  `getOrInsertComputed is not a function` sur le Chromium de recette) ;
  le worker est servi par le bundler (`new URL(…, import.meta.url)` →
  `/_next/static/media/pdf.worker.min.….mjs`, vérifié en dev et en build) ;
  nombre de pages et rapport de page lus dans le fichier quand `pieces`
  ne les a pas ; les boîtes des valeurs restent en pourcentages par-dessus.
  Vérifié avec une route temporaire (supprimée) et un PDF de deux pages
  imprimé par Chromium : les deux pages se dessinent, la boîte « Total
  TTC » tombe sur le texte — capture `omega/recette-a3/filed-pdf-essai-900.jpg`.
  La recette automatique ne couvre pas ce rendu : il faut une session et une
  pièce réelle.
- **Temps réel** (05/10, soir) : `components/espace/tempsReel.ts` — un canal
  Realtime (`postgres_changes`) par écran, ouvert seulement en base réelle,
  qui relit l'écran avec un délai de regroupement (800 ms) : validations
  sur `demandes_validation`, `approbations`, `delegations` ; FILED sur
  `filed_documents`, `filed_factures`, `filed_controles`, `filed_historique`
  (le dossier ouvert est relu avec la liste) ; point sur `points_du_jour`.
  Sans table publiée, rien n'arrive et l'écran marche comme avant.
- **Validation** : `npx tsc --noEmit` ✓, `npx eslint components/espace
  app/espace` ✓ (0 erreur, 0 avertissement), `npm run build` ✓, recette
  aux cinq largeurs (390 / 768 / 1024 / 1440 / 1700) ✓ —
  `node omega/recette-a3/recette-espace.mjs` (sur `outils/chrome.mjs`) :
  chargement, débordement
  horizontal, éléments plus larges que l'écran, mots anglais, plus trois
  enchaînements (règle qui exige un commentaire, citation surlignée dans
  la pièce, veille du point, annulation, délégations, appariements,
  commande, dépôt). Captures légères dans `omega/recette-a3/`.

## Lot du 06/10 — la fiche fournisseur de FILED (a4_10, b7_02)

- **Fiche « Fournisseur »** dans le dossier (`DossierVue.tsx → FicheFournisseur`),
  entre les valeurs lues et les contrôles : nom et statut (À confirmer /
  Actif / Bloqué / Refusé), SIREN et TVA, **identité** lue sur
  `filed_fournisseurs.identite_verifiee_le / identite_source /
  identite_verdict` (contrat de B7, NOTES-B7 § 9 b) : « Vérifiée le
  JJ/MM/AAAA HH:MM par VIES / Sirene », « Attestée par une personne … »,
  « Registre indisponible … », « Invalide : <motif> », « Non vérifiée ».
- **Confirmer ce fournisseur** → `filed_confirmer_fournisseur(p_fournisseur,
  p_motif)` (motif facultatif). Le bouton est **gris, avec la raison**, pour
  la personne qui a déposé la pièce d'origine (`fournisseur.document_origine`
  → `filed_documents.depose_par`, lu par `chargerDossier`) : même règle que
  la porte (42501). Il est aussi posé sur le contrôle `fournisseur.a_confirmer`.
- **Revérifier auprès de VIES / Sirene** → `identite_demander(client,
  'vies', tva | 'sirene', siren, fournisseur, p_force = true)` ; VIES quand
  le fournisseur a une TVA, Sirene sinon (comme le balayage de B7). Posé
  aussi sur le contrôle `identite.registre`. L'écran dit « la réponse arrive
  en une à deux minutes » et se relit seul (Realtime sur
  `filed_fournisseurs` ajouté à l'écoute ; sans publication, au prochain
  changement d'une table publiée).
- **Attester l'identité** → `filed_attester_identite(p_fournisseur, p_motif)`
  (motif ≥ 3 caractères), proposé quand l'identité n'est pas « valide ».
- Après une action, le dossier ouvert **reste ouvert** même s'il change de
  rang (une facture débloquée passait derrière les bloquées et l'écran
  sautait sur une autre) — vrai aussi pour « Lever avec un motif ».
- Exemple : dossier `R2026-000016` (Imprimerie Vidal, fictive), déposé par
  Sofia, fournisseur à confirmer, identité confirmée par VIES.
- **Relecture réelle** (06/10, 01 h 35–01 h 45 Z, compte gérant, Next local
  sur la recette, `omega/recette-a3/relecture-fournisseur.mjs`) : dossier
  `R2026-000004` → fiche « ORANGE SA · À confirmer », « Vérifiée … par
  VIES », **« Confirmer » gris** (le gérant a déposé la pièce : la règle est
  dite avant le clic), aucun refus en console. **« Revérifier » rejoué deux
  fois** : `identite_demander` accepté, l'ouvrier `identite` a répondu en
  moins de quatre minutes, la fiche est passée de « 01:39 » à « 01:43 »
  (capture `reel-fournisseur-reverifie-1440.jpg`).
- Note de conteneur : le Chromium de recette refusait la recette
  (`ERR_CERT_AUTHORITY_INVALID`) — le magasin NSS de root était vide ; la CA
  du mandataire y est ajoutée (`certutil -A … -t "C,,"`, pas de
  contournement TLS). À refaire dans un conteneur neuf.
- Validation : tsc ✓, eslint ✓, build ✓, recette aux cinq largeurs ✓
  (103 contrôles, dont l'enchaînement « confirmer le fournisseur »).

### Reste

- **Confirmer en réel** : il faut une **autre personne** que le gérant
  (gérant, admin ou valideur, pas `referent` s'il n'a pas ce rôle) avec son
  mot de passe, pour confirmer ORANGE SA sur le banc. Demandé au coordinateur.
- **Annuler ma demande** : toujours aucune demande saisie par le gérant sur
  le banc (10 en attente au 06/10 01 h 45 Z, toutes `demandeur_type =
  systeme`). Le code est en place depuis le lot 19 ; à rejouer dès qu'une
  demande du gérant existe.
- Publication Realtime de `filed_fournisseurs` (avec la demande 9).
- À voir par A4 / le coordinateur, pas par l'écran : `fournisseur.a_confirmer`
  porte « Lever avec un motif » comme tout contrôle ; si le déposant peut le
  lever, il contourne la séparation de `filed_confirmer_fournisseur`.

## Bloqué / contourné

- **Outil Supabase (MCP)** : la permission d'exécuter du SQL a été refusée
  dans cette session ; `list_tables` a répondu (schéma lu, colonnes et
  contraintes vérifiées : `approbations.decision ∈ {approuve, rejete}`,
  `filed_controles.resultat ∈ {ok, anomalie, levee}`, etc.) et le
  coordinateur a transmis les signatures des portes. **Aucune porte n'a été
  appelée pour de vrai** : les tables sont vides et il n'y a pas de session
  client ; le mode « base réelle » est écrit d'après les signatures et
  affiche le message de la base s'il diffère.
- **`app/espace/` n'existait pas** (ni réglages, ni compte) : la coquille
  commune (`components/espace/CoquilleEspace.tsx`) était posée par chaque
  page ; depuis le lot 19 (périmètre étendu par le coordinateur) elle vit
  dans `app/espace/layout.tsx`, et `proxy.ts` porte `/espace/:path*`.
- **`outils/chrome.mjs` ne trouvait pas Chromium sous Linux** : réglé le
  05/10 (périmètre étendu) — lecture de `PLAYWRIGHT_BROWSERS_PATH`,
  `chrome-linux/headless_shell`, `--no-sandbox` en root, et une méthode
  `capturer`. Le décalque `omega/recette-a3/chrome-linux.mjs` est supprimé.
- **GitHub** : le push de `worker-a3` est passé du premier coup le 05/10
  (sept commits) ; rien à retenter.
- `package-lock.json` était désynchronisé de `package.json` (`npm ci`
  refusait, `@emnapi/*` manquants) ; il est commité avec l'ajout de
  `pdfjs-dist` (lot « rendu PDF »), donc à jour désormais.

## Demandes au coordinateur — réponses du lot 19 (05/10) et ce qui en est fait

1. **Exigences de décision** — posé : `regles_validation` et
   `demandes_validation` portent `exige_commentaire`, `exige_piece`,
   `exige_motif` ; `preparer_demande` recopie, le plus strict avec
   `payload.exigences` l'emporte. **Fait** : l'écran lit les trois colonnes
   de la demande, repli sur `payload.exigences` pour les demandes
   antérieures (`regles.ts → exigences()`).
2. **Pièce jointe d'une approbation** — posé : `approbations.piece_id`.
   **Fait** : pour une demande FILED, le fichier est déposé par
   `filed_deposer_piece` (bucket `omega-clients`, chemin
   `<client>/filed_document/<doc>/<nom>`, SHA-256 calculé dans le
   navigateur) et l'identifiant de pièce rendu est posé sur l'INSERT ;
   pour les autres modules, le chemin reste cité dans le commentaire
   jusqu'au dépôt générique (lot 20). La clé du jsonb rendu est supposée
   `piece_id` (ou `piece`) : à confirmer.
3. **Annuaire** — posé : `public.annuaire(p_client)`. **Fait** : noms des
   demandeurs, décideurs, délégants et délégataires ; liste « à qui
   déléguer ». Repli sur l'identifiant court si la porte ne répond pas.
4. **`lire_point` / `apercu_point`** — forme confirmée
   (`sections[].lignes[]`). **Fait** : lecture de cette seule forme, en-tête
   du point fusionné (heure, fuseau, motifs, canal) ; le repli direct sur
   `points_du_jour_lignes` est retiré.
5. **Motifs officiels** — les 40 codes transmis. **Fait** : l'exemple les
   porte à l'identique, les contrôles d'exemple citent `COORD_BANC_ERR`,
   `CALCUL_ERR`, `PU_ERR`.
6. et 8. **`proxy.ts`, `app/espace/layout.tsx`, `outils/chrome.mjs`** —
   périmètre étendu. **Fait**, voir ci-dessus.
7. **Storage** — policy SELECT posée pour `authenticated` sur
   `omega-clients` (premier segment = un client de `mes_clients()`). Rien à
   changer : l'action serveur signe déjà avec la session de la personne.

10. **GRANT des écritures directes** — posé (lot 19k, 19:50 UTC) : voie (a),
   75 GRANT en face des policies. Délégation et révocation vérifiées.
   `comptes` DELETE, `entites` INSERT + DELETE, `regles_validation`
   INSERT + UPDATE + DELETE : voulus par le socle (policies `ALL`), pas
   touchés. Approuver / refuser rejoués avec `referent`. **Reste** : une
   demande saisie par le gérant pour rejouer l'annulation (promise au
   prochain point).
11. **Vu sur la première vraie facture** (05/10, 20:05) — pour A1 / le
   coordinateur, pas pour l'écran : le contrôle `identite.siren` dit
   « Aucun SIREN sur la pièce ni sur le fournisseur » alors que
   `pieces_valeurs` porte `fournisseur.siren = "SIREN 842 115 763"` (et
   `fournisseur.tva`) — le contrôle ne lit pas la valeur lue, ou la valeur
   n'est pas remontée sur `filed_factures.fournisseur_lu`. Et le contrôle
   bloquant `fournisseur.a_confirmer` demande qu'« une personne confirme »
   le fournisseur nouveau : **il n'y a pas de porte pour ça** —
   `filed_bloquer_fournisseur(false)` débloque un bloqué, ce n'est pas
   confirmer un `a_confirmer`. Proposition : `filed_confirmer_fournisseur
   (p_fournisseur, p_motif)` (statut `actif`, `confirme_le`/`confirme_par`),
   que j'ajoute à l'écran dès qu'elle existe.
12. **Contrat des champs de lecture** : `omega/CHAMPS-LECTURE.md` n'est pas
   sur `main` ; la visionneuse lit aujourd'hui les deux jeux de noms. Un
   seul jeu, écrit, éviterait les repli.
9. **Realtime** — posé en partie (socle_lot19h, 05/10 18:25) :
   `demandes_validation`, `approbations`, `filed_documents`, `filed_factures`
   sont dans la publication `supabase_realtime`. Les écrans écoutent déjà
   ces quatre tables : la file et la liste FILED se relisent d'elles-mêmes.
   **Restent à publier** : `delegations` (carte « Mes délégations »),
   `filed_controles` et `filed_historique` (contrôles rejoués, fil du
   dossier — la liste couvre déjà le changement d'état de la facture),
   `points_du_jour` (point remis pendant qu'on regarde). Sans eux, ces
   détails se relisent au prochain changement d'une table publiée ou à la
   main, sans erreur.

## Prêt à fusionner

Lot « rendu PDF + temps réel » (05/10, soir) : tsc ✓, eslint ✓, build ✓,
recette aux cinq largeurs ✓ (104 contrôles). Il ajoute la dépendance
`pdfjs-dist` à `package.json` ; `package-lock.json` est commité avec elle
(il était désynchronisé de `package.json` — `@emnapi/*` manquants — et
`npm ci` refusait ; il est maintenant à jour). Le temps réel est actif sur
les quatre tables publiées (demande 9 pour les autres).

## Vérifié en ligne (05/10, 18:45 UTC)

Après la fusion du lot « rendu PDF » (main 3aa753d, Vercel READY) :
`omegaai.fr/espace/validations`, `/espace/filed` et `/espace/point`
répondent 200 et servent « À valider » avec « Mes délégations »,
« Documents reçus » avec « Déposer un document », « Point du matin », le
ruban « Données d'exemple » et le titre « Espace client Omega » (relevé par
curl sur le HTML servi). Le lot « temps réel » (commits 34227cc et bc512b3)
attend sa fusion.

## Relecture en conditions réelles — faite le 05/10 (19:10–19:30 UTC)

Compte de recette du coordinateur (`gerant@banc-varelo.test`, client banc
« Groupe Sogexal (banc) »), après deux corrections de `auth.users` de son
côté (jetons NULL → '', puis `created_at`/identités). Serveur de dev pointé
sur la recette, cookie de session posé par
`omega/recette-a3/relecture-reelle.mjs`. Résultat, captures
`omega/recette-a3/reel-*-1440.jpg` :

- **Les trois écrans se chargent avec la session** : identité affichée,
  interrupteur sur « Base réelle », aucun avis rouge, aucun « permission
  denied for function » en console. Validations : 9 demandes VARELO en
  attente (règle 1 approbation, demandeur « Système »), noms de l'annuaire
  dans « À qui déléguer » (Daf, Daf2, Referent). FILED : 1 document
  `R2026-000001` en lecture, nature à classer. Point : aucun point assemblé
  pour le banc (attendu).
- **Les écritures** : d'abord refusées (« permission denied for table
  delegations » — `authenticated` n'avait que SELECT sur `approbations`,
  `delegations`, `demandes_validation`, effet d'a5_01), puis **ouvertes par
  le lot 19k** du coordinateur (75 GRANT en face des policies). Rejoué à
  19:55 UTC : **poser une délégation** (Vous → Daf, tous modules, un mois)
  et **la révoquer** passent, la carte « Mes délégations » suit. Deux
  leçons prises à chaud : `delegations.fin` est NOT NULL — le terme devient
  obligatoire dans le formulaire (un mois par défaut) ; et le trigger
  refuse « Cette demande revient à l'équipe « Référent données » » : les
  neuf demandes du banc sont **réservées à une équipe** dont le gérant
  n'est pas membre. L'écran lit désormais `equipes` et `equipes_membres`
  et le dit AVANT le clic (règle « · équipe : Référent données », avis
  ambre, boutons gris ; « À décider par moi » vide à juste titre), une
  délégation d'un membre rouvrant la décision — même ordre que le trigger.
  **Approuver et refuser rejoués à 20:09 UTC avec `referent`** (membre de
  « Référent données », mot de passe posé par le coordinateur) : une
  demande VARELO approuvée (passée `executee` par le trigger, l'action du
  module a tourné), une refusée avec motif (`rejetee`) ; les deux lignes
  d'`approbations` portent le commentaire. Le message « C'est fait » est
  désormais dit au-dessus de la file, parce que la demande décidée quitte
  la vue quand la file se relit. **Annuler sa demande** reste à rejouer :
  le coordinateur fournit une demande saisie par le gérant au prochain
  point.
- **FILED, première vraie facture** (`R2026-000003`, F-2026-0413 de
  Papeterie Delorme, lue par l'ouvrier lecteur à 20:05) : le dossier se
  lit, le PDF réel se dessine avec ses onze boîtes, 18 contrôles (4
  échoués dont « fournisseur à confirmer » bloquant), le fil. Trois
  retouches à chaud : les **noms de champ du lecteur réel** (`numero`,
  `date`, `echeance`, `montant_*`, `fournisseur.iban`, `fournisseur.siren`)
  diffèrent du gabarit (`facture.numero`, `totaux.*`, `paiement.iban`) —
  la visionneuse lit les deux par notion, et une valeur absente de la
  facture retombe sur le texte cité (le SIREN lu sur la pièce s'affiche) ;
  le **motif officiel n'est plus dit sur un contrôle passé** (c'est celui
  qui vaudrait s'il échouait) ; les familles du lecteur réel (`identite`,
  `date`, `exercice`, `montant`, `lecture`) ont leur libellé.
- `apercu_point(p_client, p_user, p_jour)` répond 200 avec
  `{jour, du_le, fuseau, motifs: [], prevu_le, sections: []}` pour le banc
  (aucun gabarit de point posé) : l'écran dit « Pas de point ce jour-là »
  sans erreur. `lire_point` reste à voir sur un point assemblé.
- La pièce du document banc n'a pas de fichier dans le bucket (« Object
  not found », dit désormais en français) : donnée du banc, pas un défaut
  d'écran.
- Realtime : la poignée de main WebSocket échoue depuis le conteneur de
  recette (mandataire sortant sans WebSocket) — non vérifiable ici, à
  vérifier depuis un navigateur ordinaire.
- Deux retouches faites à chaud : les listes longues d'un payload (les 36
  identifiants d'un lot VARELO) se résument à leur compte et leurs trois
  premiers éléments ; une panne réseau à `getUser` n'est plus dite
  « Aucune session ouverte ».

## Reprise du 06/10 (01 h 50 Paris)

La pause de la veille est tombée après le dernier push : rien d'inachevé,
`worker-a3` (03ba1c9) est entièrement dans `main`, omegaai.fr le sert.
**Prochaine étape** : rejouer « Annuler ma demande » dès qu'une demande
saisie par le gérant existe sur le banc (aucune au 06/10 01 h 50) ; brancher
`filed_confirmer_fournisseur` quand la porte existera (demande 11) — **fait
le 06/10, voir « Lot du 06/10 »**. Je ne
touche pas à `components/espace/ecrans.ts` (B3/B5 y ajoutent leurs onglets).

## Demain

- Relecture en conditions réelles dès qu'un client a des lignes : premier
  appel de chaque porte, messages d'erreur de la base en clair.
