# NOTES-C4 — OFFLOAD, « nouvelles affaires / reprise »

Branche `worker-c4`. Périmètre : `omega/modules/offload/migrations/c4_NN_*.sql`, `omega/tests/offload/`,
`components/espace/offload/`, `app/espace/offload/`, et ce fichier. Coordinateur : session
`session_01BCGFdpRKBvXKjouC75sYBg`. Je n'appelle jamais Supabase : le coordinateur pose, je reçois les sorties brutes.

## Méthode de vérification avant chaque envoi

Un Postgres 16 local (dans le conteneur de la session, jamais Supabase) porte un **socle factice** : les tables et
portes du socle dont OFFLOAD dépend, réduites à leur forme (`clients`, `entites`, `comptes`, `branchements`,
`branchements_jeux`, `modeles_jeux`, `releves`, `instantanes`, `instantanes_lignes`, `travaux`,
`private.abonnements`, `journal_opposable`, `recevoir_releve`, `commencer_releve`, `deposer_lignes`,
`terminer_lecture`, `avancer_releves`, `acquitter_instantane`, `brancher`, `prendre_travaux`…) et un pgTAP réduit
(`ok`, `is`, `throws_ok`). Chaque migration y est posée **deux fois** (preuve qu'elle se rejoue), puis chaque
`tests.test_c4_*` tourne dans une transaction annulée. Ce banc local ne remplace pas la recette : il attrape les
erreurs de compilation, de logique et de rejeu avant que le coordinateur ne pose.

## Palier 1 — l'historique d'achats (lot c4_01)

**Ce qui est posé** (`omega/modules/offload/migrations/c4_01_donnees.sql`) :

- `public.offload_reglages` : OFFLOAD installé chez une organisation, **mode `essai` à l'installation** (rien ne
  part), délai de silence (90 j), montant minimal, jour de clôture (null = fin de mois), alerte avant clôture
  (10 j), branchement d'exports.
- `public.offload_comptes` : le compte client d'une entité (code du logiciel, raison sociale, contact, courriel,
  téléphone, commercial, groupe, ville, secteur), statut `suivi | exclu | arrete`.
- `public.offload_achats` : une **pièce** (facture, commande, avoir négatif), datée, hors taxes, importée
  (`jeu_id` + `cle`) ou saisie (`saisi_par`). Annulée, jamais effacée.
- Deux modèles `modeles_jeux` **offload / tableur v1** pour le lecteur d'exports d'A1 :
  - `ventes` — code client (oblig.), date (oblig.), montant HT (oblig.), n° de pièce, nom du client, libellé,
    type de pièce, courriel, téléphone, commercial, groupe ; clé `compte_ref, date, reference` ; **non complet**
    (un export des douze derniers mois ajoute, il n'efface rien) ; `seuil_anomalies = 1` (c'est le module qui
    juge, voir le garde-fou) ; motif `^(ventes?|factures?|commandes?|historique|chiffre)`.
  - `clients` — code client, raison sociale (oblig.), contact, courriel, téléphone, commercial, groupe, ville,
    secteur ; clé `compte_ref` ; non complet ; motif `^(clients?|tiers|fichier[_ -]?clients?)`.
  - Les en-têtes sont des **hypothèses** (colonne `source` le dit) : à confirmer sur un vrai export.
- La chaîne : `releve.pret.offload` → travail `offload.appliquer_releve` (abonnement posé) → cron
  `offload-releves` (chaque minute) → `private.offload_traiter_travaux` → `private.offload_appliquer_releve` :
  1. le fichier clients d'abord (les ventes trouvent leurs comptes avec leur vrai nom) ;
  2. **garde-fou** : si moins de la moitié des lignes de ventes ont un code client, une date (1990 → demain) et un
     montant lisibles, l'instantané est rendu `douteux` (`acquitter_instantane`), rien n'est appliqué,
     `offload.import_douteux` au journal ;
  3. les comptes cités par les ventes et absents du référentiel sont créés (nom lu dans les ventes) ;
  4. les lignes sont **additionnées par pièce** (client, date relue, n° de pièce) : un export ligne à ligne fait
     une pièce par facture ; un export rejoué, trié autrement ou corrigé met à jour la même pièce sans la doubler
     (défaut trouvé par le test local et corrigé avant envoi) ;
  5. dates et montants relus à la française : `14/03/2025`, `14.03.25`, ISO, `AAAAMMJJ` ; `1 234,50 €`,
     `1.234,50`, `1,234.50`, `(120,00)`, `120,00-` ; un « Avoir » est rangé en négatif ;
  6. `offload.import_applique` au journal avec le bilan (lignes, écartées, comptes et pièces nouveaux / modifiés).
- Portes publiques (SECURITY INVOKER → fonction privée SECURITY DEFINER qui vérifie les droits) :
  `offload_installer(client, entite)` (Omega ou le gérant), `offload_regler(client, reglages)` (gérant, admin),
  `offload_deposer_export(client, fichier)` (gérant, admin, valideur, collaborateur — enveloppe
  `recevoir_releve`), `offload_saisir_compte`, `offload_saisir_achat`, `offload_annuler_achat` (mêmes rôles ;
  jamais un lecteur).
- RLS sur les trois tables (organisation + entité vue), `revoke all` d'anon et authenticated puis `select` seul ;
  `revoke execute from public` sur chaque fonction privée.

**Tests** : `omega/tests/offload/c4_00_jeu.sql` (aides : banc, compte d'essai, installer, déposer un export par les
vraies portes du relevé comme le lecteur d'A1), `c4_01_donnees.sql` — 5 tests, 62 assertions :
`test_c4_01_installation`, `test_c4_01_lecture`, `test_c4_01_import`, `test_c4_01_garde_fou`,
`test_c4_01_saisie`. Verts sur le banc local ; **à jouer sur la recette**.

**Ordre de pose (recette)** :
1. `omega/modules/offload/migrations/c4_01_donnees.sql`
2. `omega/tests/offload/c4_00_jeu.sql`
3. `omega/tests/offload/c4_01_donnees.sql` (se termine par `runtests('tests', '^test_c4_01_')`)

**À inscrire dans `omega/a5_01_liste_figee.txt`** (règle b, appelées par une porte publique SECURITY INVOKER) :
`offload_installer(p_client uuid, p_entite uuid)`, `offload_regler(p_client uuid, p_reglages jsonb)`,
`offload_deposer_export(p_client uuid, p_fichier jsonb)`,
`offload_saisir_compte(p_client uuid, p_entite uuid, p_ref text, p_nom text, p_champs jsonb)`,
`offload_saisir_achat(p_compte uuid, p_date date, p_montant numeric, p_reference text, p_libelle text, p_nature text)`,
`offload_annuler_achat(p_achat uuid, p_motif text)`.

**Questions au coordinateur** :
- Q1. Le dépôt d'un fichier depuis l'espace : `offload_deposer_export` attend un fichier déjà posé dans
  `omega-clients` sous `<client>/branchement/<id>/`. Les règles Storage laissent-elles un `authenticated`
  (gérant, collaborateur) y écrire ? Sinon, quelle voie préférez-vous (route serveur, ou une porte de dépôt du
  socle) ? En attendant, la saisie à la main et le dépôt par le coordinateur couvrent le palier.
- Q2. Le module `offload` doit-il être déclaré quelque part (`moteurs_reconnus`, `modules_envois`) avant le palier 3
  (envois) ? Je le demanderai avec le lot des reprises.

## Lignes de capacité (`lib/produits/capacites/reprise.ts`) — tenue et preuve

Rien n'est basculé `atteste: true` par moi : c'est le coordinateur, sur preuve posée en recette.

| Ligne | État | Preuve |
|---|---|---|
| Le système croise votre historique de facturation et le référentiel clients de votre CRM. | **palier 1 livré (à poser)** | jeux `clients` + `ventes`, `test_c4_01_import` (comptes du référentiel, ventes rattachées, client absent créé) |
| Un tableur sans colonne de date est exploité à partir des dates de facture. | **partiel** : le fichier clients sans date prend ses dates dans les factures (palier 1) ; « un compte que rien ne date est présenté à part » viendra avec l'écran (palier 4) | `test_c4_01_import` |
| Les autres lignes | à venir (paliers 2 à 5) | — |

## Journal

- 06/10 — prise de poste. Lecture : AUDIT-PROMESSES § 1, `app/page.tsx` (accroche OFFLOAD), `lib/produits/reprise.ts`,
  `lib/produits/capacites/reprise.ts` (46 lignes), SOCLE-EXTRAITS-COMMUN (relevés, jeux, instantanés, travaux,
  journal), NOTES-A1 (lecteur-exports), migrations Tiroma et Daliro pour les conventions.
- 06/10 — palier 1 écrit, vérifié sur le banc local (pose ×2, 62 assertions vertes), poussé sur `worker-c4`.
