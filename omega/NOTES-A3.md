# Session A3 — l'écran client (validations, FILED, point du matin)

Branche `worker-a3`. Dernière mise à jour : 05/10/2026.

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
- **Validation** : `npx tsc --noEmit` ✓, `npx eslint components/espace
  app/espace` ✓ (0 erreur, 0 avertissement), `npm run build` ✓, recette
  aux cinq largeurs (390 / 768 / 1024 / 1440 / 1700) ✓ —
  `node omega/recette-a3/recette-espace.mjs` (sur `outils/chrome.mjs`) :
  chargement, débordement
  horizontal, éléments plus larges que l'écran, mots anglais, plus trois
  enchaînements (règle qui exige un commentaire, citation surlignée dans
  la pièce, veille du point, annulation, délégations, appariements,
  commande, dépôt). Captures légères dans `omega/recette-a3/`.

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
- `package-lock.json` bouge à l'installation (`npm ci` refuse : lock
  désynchronisé de `package.json`, `@emnapi/*` manquants) : **non commité**,
  ce n'est pas mon travail.

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

Reste à confirmer côté coordinateur : la clé exacte du jsonb rendu par
`filed_deposer_piece` (point 2).

## Demain

- Rendu des pages PDF dans la visionneuse (pdf.js, ou pages rendues en
  image par le lecteur et rangées dans `pieces_pages`) : aujourd'hui le PDF
  réel s'ouvre dans un onglet, les boîtes sont posées sur le texte de la
  page.
- Relecture en conditions réelles dès qu'un client a des lignes : premier
  appel de chaque porte, messages d'erreur de la base en clair.
- Temps réel (Supabase Realtime) sur `demandes_validation` et
  `filed_documents` pour que la file bouge sans recharger.
