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
- **Validation** : `npx tsc --noEmit` ✓, `npx eslint components/espace
  app/espace` ✓ (0 erreur, 0 avertissement), `npm run build` ✓, recette
  aux cinq largeurs (390 / 768 / 1024 / 1440 / 1700) ✓ —
  `node omega/recette-a3/recette-espace.mjs` : chargement, débordement
  horizontal, éléments plus larges que l'écran, mots anglais, plus trois
  enchaînements (règle qui exige un commentaire, citation surlignée dans
  la pièce, veille du point). Captures légères dans `omega/recette-a3/`.

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
  commune est dans `components/espace/CoquilleEspace.tsx`, posée par
  chacune des trois pages — à déplacer dans un `app/espace/layout.tsx` le
  jour où il existe (hors de mon périmètre).
- **`outils/chrome.mjs` ne trouve pas Chromium sous Linux** (chemins macOS
  seulement) : `omega/recette-a3/chrome-linux.mjs` est un décalque qui lit
  `PLAYWRIGHT_BROWSERS_PATH`. Hors périmètre, non modifié.
- **GitHub** : le push de `worker-a3` est passé du premier coup le 05/10
  (sept commits) ; rien à retenter.
- `package-lock.json` bouge à l'installation (`npm ci` refuse : lock
  désynchronisé de `package.json`, `@emnapi/*` manquants) : **non commité**,
  ce n'est pas mon travail.

## Demandes au coordinateur (portes et socle manquants)

1. **`regles_validation` : les exigences de décision.** L'écran doit rendre
   commentaire / pièce jointe / motif de refus obligatoires « quand la règle
   l'exige », mais la table n'a aucune colonne pour le dire. Aujourd'hui
   l'écran lit `demandes_validation.payload.exigences = { commentaire,
   piece_jointe, motif_refus }` quand le module l'a posé, sinon déduit
   (motif de refus toujours ; commentaire si montant ≥ 10 000 € ou plusieurs
   approbations). Proposition : trois booléens sur `regles_validation`,
   recopiés sur la demande à sa création comme `approbations_requises`.
2. **`approbations` : la pièce jointe.** Pas de colonne ; le chemin Storage
   est cité dans `commentaire`. Proposition : `piece_id uuid` (→ `pieces`)
   ou `piece_chemin text`, et une porte `joindre_piece_approbation`.
3. **Un annuaire lisible sous RLS** (`user_id` → nom affiché, rôle) pour
   nommer demandeurs, décideurs, délégants et délégataires : aujourd'hui
   `comptes` ne porte que `user_id` et `role`, l'écran affiche l'identifiant
   court. Une vue `annuaire(user_id, nom, role, client_id)` suffirait.
4. **`lire_point` : la forme du jsonb.** L'écran lit `lignes[]` ou
   `sections[].lignes[]` (chaque ligne avec les colonnes de
   `points_du_jour_lignes`) ; à défaut il relit `points_du_jour_lignes`
   directement. Me confirmer la forme réelle, et celle d'`apercu_point`.
5. **`filed_motifs_refus` : les 40 codes réels.** L'exemple en porte six
   plausibles (`COORDONNEES_BANCAIRES_NON_RECONNUES`, `TVA_INCOHERENTE`,
   `ECART_AVEC_LA_COMMANDE`…) ; la base réelle est lue telle quelle.
6. **`proxy.ts` : ajouter `/espace/:path*` au matcher** pour que la session
   soit rafraîchie côté serveur sur ces pages (le client navigateur
   rafraîchit déjà le jeton pour ses propres appels). Hors périmètre.
7. **Storage `omega-clients`** : confirmer que la policy SELECT laisse une
   personne signer les chemins `<client_id>/filed_document/<doc>/…` de ses
   clients (l'action serveur signe avec SA session, pas la service_role).
8. **`outils/chrome.mjs`** : ajouter la découverte Linux
   (`PLAYWRIGHT_BROWSERS_PATH`, `chrome-linux/headless_shell`) et supprimer
   `omega/recette-a3/chrome-linux.mjs`.

## Demain

- Rendu des pages PDF dans la visionneuse (pdf.js, ou pages rendues en
  image par le lecteur et rangées dans `pieces_pages`) : aujourd'hui le PDF
  réel s'ouvre dans un onglet, les boîtes sont posées sur le texte de la
  page.
- Révoquer une délégation depuis l'écran (UPDATE `revoquee_le` autorisé au
  délégant) et lister « mes délégations » ; annuler sa propre demande en
  attente (UPDATE autorisé au demandeur).
- `filed_rattacher_commande` et `filed_apparier_ligne` (porte connue, écran
  non fait) ; dépôt d'un document depuis l'espace (`filed_deposer_piece`).
- Relecture en conditions réelles dès qu'un client a des lignes : premier
  appel de chaque porte, messages d'erreur de la base en clair.
- Temps réel (Supabase Realtime) sur `demandes_validation` et
  `filed_documents` pour que la file bouge sans recharger.
