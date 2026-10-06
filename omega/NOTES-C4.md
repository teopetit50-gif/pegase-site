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

## Palier 2 — la détection (lot c4_02)

**Ce qui est posé** (`omega/modules/offload/migrations/c4_02_detection.sql`) :

- `public.offload_signaux` : l'état du jour, un par compte (RLS du compte, lecture seule) — niveau, `depuis_le`,
  score, priorité en euros, valeur annuelle attendue, nombre d'achats, premier et dernier achat, rythme (écart
  médian en jours), panier moyen, date attendue du prochain achat, jours de silence, retard (× rythme), chiffre des
  douze derniers mois et des douze d'avant, date de clôture, `avant_cloture`, et **`raisons`** : un tableau de
  `{code, points, phrase}`.
- `private.offload_detecter(client, jour)`, set par set (une requête pour tous les comptes), puis cinq constats :
  - `retard` — dès 1,5 fois le rythme (et 14 jours) : « Il achetait en moyenne tous les 30 jours ; rien depuis
    60 jours, depuis le 22/08/2026 (2,0 fois son rythme). » — (retard − 1) × 30 points, 50 au plus ;
  - `silence` — le client s'est tu : au-delà de 3 fois son rythme et du délai fixé ; pour moins de trois achats,
    au-delà du délai seul (« Un seul achat connu, le 04/04/2026 : rien depuis 200 jours, au-delà de votre délai de
    90 jours. ») — 60 points (50 sans rythme connu) ;
  - `baisse` — chiffre des douze derniers mois ≤ 60 % des douze d'avant, avec les deux montants et le pourcentage ;
  - `ralenti` / `panier` — écarts récents 1,5 fois plus longs, panier récent ≤ 60 % de l'ancien (6 achats au moins) ;
  - `saison` — « Il achète chaque année en septembre (2023, 2024, 2025) ; rien en septembre 2026 à ce jour. »
    (mois écoulé, ou mois en cours passé le 20 ; au moins deux des trois années ; seulement pour un client qui
    achète quelques fois par an — pour un client mensuel, le retard dit déjà tout) ;
  - `avant_cloture` — un compte éteint, en retard ou en saison manquée, dont l'achat était attendu avant la
    clôture, dans les N jours qui la précèdent : « La clôture du mois tombe le 31/10/2026 : il reste 10 jours pour
    qu'une commande compte dans le mois. »
- **Score = somme des points des raisons, plafonnée à 100** (vérifié par un test sur tous les comptes) ; **priorité =
  valeur annuelle attendue × score / 100** ; la liste se trie par priorité. Niveaux : `eteint`, `decroche`,
  `saison`, `ralentit`, `ok`, et à part `sans_achat` (rien ne le date), `sous_seuil` (sous le montant minimal).
- Journal `offload.signal` à l'entrée dans un niveau à risque (une fois : recalculer le même jour n'ajoute rien).
- Cron `offload-detection` (4 h 41 UTC, avant 7 h à Paris) sur toutes les organisations installées ; une
  organisation en échec lève une alerte du module et n'arrête pas les autres. Détection recalculée **à la fin de
  chaque import** (`offload_traiter_travaux` redéfini). Porte `offload_recalculer(client)` (gérant, admin,
  valideur, collaborateur).

**Tests** : `omega/tests/offload/c4_02_detection.sql` — `test_c4_02_detection` (jour fixé au 21/10/2026 : régulier,
décroche, s'est tu, baisse, saison, achat unique, sans achat, sous le seuil ; phrases exactes, score = somme,
priorité, journal, retour à « ok » après une commande, hors fenêtre de clôture), `test_c4_02_reglages_et_droits`,
`test_c4_02_apres_import`. Banc local : 8 tests, 104 assertions vertes (paliers 1 et 2), migrations posées deux fois.

**Ordre de pose (recette)**, après le lot c4_01 :
1. `omega/modules/offload/migrations/c4_02_detection.sql`
2. `omega/tests/offload/c4_02_detection.sql` (`runtests('tests', '^test_c4_02_')`)

**À inscrire dans `a5_01_liste_figee.txt`** : `offload_recalculer(p_client uuid)`.

## Palier 3 — la reprise (lot c4_03)

**Ce qui est posé** (`omega/modules/offload/migrations/c4_03_reprise.sql`) :

- `public.offload_reprises` : une reprise par compte et par cycle (un seul cycle ouvert par compte, index unique) —
  statut `a_valider` → `envoyee` → `relance_a_valider` → `relancee`, ou `appel` (pas de courriel, ou message retenu
  par un verrou du socle) ; fin `repondue` (issue `reponse` ou `arret`) ou `close` (`commande`, `sans_reponse`,
  `refusee`, `appel_passe`, `reprise_en_main`, `abandon`). Le signal du jour (niveau, score, raisons) y est figé.
- `public.offload_taches` : `appel` (commercial du compte, échéance avant la clôture et sous 3 jours, détail = les
  raisons en phrases + la dernière commande + téléphone + contact) et `repondre` (quand le client répond).
- **Le message**, sans IA, depuis l'historique seul : « Je reprends votre dossier : votre dernière commande chez X
  date du 1er septembre 2025 (réf. M1-1, « Entretien annuel », 650 € HT), il y a 13 mois. » Puis une question
  ouverte, la signature réglée, et « répondez simplement « stop » ». Aucun prix, délai ni remise (test). La relance
  cite le premier message et annonce qu'elle est la dernière.
- **Validation** : chaque message passe par `private.preparer_envoi` → le socle crée la demande `envoi.email` (rien
  ne part sans une personne), applique ses verrous (consentement, oppositions, heures, plafonds) et le mode des
  réglages d'envoi. **Garde-fou essai** : OFFLOAD en mode essai ne prépare rien si les envois du module sont réglés
  en réel (alerte du module, test).
- **Suivi** : abonnements `envoi.{envoye,refuse,bloque,annule,expire,echec,non_remis}.offload` → `offload.envoi`,
  `reception.nouvelle` → `offload.reception`. Réponse rattachée à l'envoi d'origine, sinon à l'adresse du compte.
  À la réponse : pause du destinataire au socle (`private.opposer`, 30 j : la relance en attente est bloquée),
  tâche « répondre ». Sur « stop », « désinscrire », « ne plus nous contacter »… (lu avant la citation) :
  désinscription au socle, compte `arrete`, aucune reprise possible.
- **Cycle** (`private.offload_cycle`, enchaîné à la détection de la nuit par `offload_detecter_tout`) : clôture sur
  commande, relance après `delai_relance_jours` (7 ; 3 au moins), sortie du cycle après la relance, ouverture des
  nouvelles reprises (clôture proche d'abord, puis priorité), au plus `plafond_reprises_jour` (20), quarantaine
  `quarantaine_jours` (90). Bilan au journal (`offload.cycle`).
- **Point du matin** « Clients qui décrochent » (gérant, valideur, collaborateur) : réponses à traiter, comptes à
  joindre avant la clôture, comptes entrés à risque, appels du jour, messages en attente de validation ; cron
  `offload-matin` (toutes les 30 min, dès 5 h à Paris).
- Portes : `offload_ouvrir_reprise(compte)`, `offload_noter_tache(tache, statut, compte_rendu)` ;
  `offload_regler` étendu (`signature`, `delai_relance_jours`, `quarantaine_jours`, `plafond_reprises_jour`).

**Tests** : `omega/tests/offload/c4_03_reprise.sql` — `test_c4_03_message`, `test_c4_03_cycle`,
`test_c4_03_reponse`, `test_c4_03_issues`, `test_c4_03_taches_et_droits`, `test_c4_03_point_matin`. Le départ réel
(validation approuvée, ouvrier d'A2) est hors module : le test rejoue l'événement `envoi.envoye.offload` sur le
suivi. Banc local : 14 tests verts sur les trois paliers.

**Ordre de pose (recette)**, après c4_01 et c4_02 :
1. `omega/modules/offload/migrations/c4_03_reprise.sql`
2. `omega/tests/offload/c4_03_reprise.sql` (il emploie `tests.c4_compte_achats` de `c4_02_detection.sql` ;
   `runtests('tests', '^test_c4_03_')`)

**À inscrire dans `a5_01_liste_figee.txt`** : `offload_ouvrir_reprise(p_compte uuid)`,
`offload_noter_tache(p_tache uuid, p_statut text, p_compte_rendu text)`.

**Questions au coordinateur** :
- Q3. **Consentement B2B.** Une reprise est un message non transactionnel : le socle exige un consentement
  (`CONSENTEMENT_ABSENT`) sinon il bloque. La prospection par courriel d'un professionnel, sur un objet lié à son
  activité, est permise sans accord préalable si l'opposition est offerte (le message dit « stop »). Voulez-vous
  (a) que le gérant enregistre un consentement par compte (`noter_consentement`, source `contrat`), (b) une règle
  socle « destinataire professionnel + courriel + lien de désinscription », ou (c) autre chose ? En attendant, un
  compte sans accord voit sa reprise passer par l'appel du commercial, rien n'est envoyé.
- Q4. `reglages_envois` du module `offload` pour le banc (mode `essai`, `essai_adresse`) : le test le pose lui-même
  dans sa transaction ; pour un essai réel sur la recette, il faut la ligne (comme `recette-b6/banc_j2_reel.sql`).

## Lignes de capacité (`lib/produits/capacites/reprise.ts`) — tenue et preuve

Rien n'est basculé `atteste: true` par moi : c'est le coordinateur, sur preuve posée en recette.

| Ligne | État | Preuve |
|---|---|---|
| Le système croise votre historique de facturation et le référentiel clients de votre CRM. | **palier 1 livré (à poser)** | jeux `clients` + `ventes`, `test_c4_01_import` (comptes du référentiel, ventes rattachées, client absent créé) |
| Un tableur sans colonne de date est exploité à partir des dates de facture. | **partiel** : le fichier clients sans date prend ses dates dans les factures (palier 1) ; « un compte que rien ne date est présenté à part » viendra avec l'écran (palier 4) | `test_c4_01_import` |
| Chaque compte est classé par la date de son dernier contact, au-delà d'un seuil que vous fixez. | **palier 2 livré (à poser)** — dernier contact = dernier achat pour l'instant ; les reprises du palier 3 s'y ajouteront | `offload_signaux.dernier_achat`, `jours_silence`, réglage `delai_silence_jours` ; `test_c4_02_detection` |
| La fréquence d'achat habituelle d'un compte est mesurée, puis son décrochage détecté. | **palier 2 livré (à poser)** | `rythme_jours`, raisons `retard` / `silence` / `ralenti` ; `test_c4_02_detection` |
| Les comptes sont priorisés par valeur attendue, pas par ordre alphabétique. | **palier 2 livré (à poser)** | `priorite` = valeur annuelle × score ; assertion « le premier de la liste est celui qui pèse le plus » |
| Chaque message reprend la dernière prestation du compte et le temps écoulé depuis. | **palier 3 livré (à poser)** | `private.offload_message` ; `test_c4_03_message` |
| Un compte sans réponse reçoit un second message, puis il sort du cycle. | **palier 3 livré (à poser)** | cycle : relance puis `sans_reponse` ; `test_c4_03_cycle` |
| Un compte reçoit deux messages en tout, espacés d'au moins trois jours. | **palier 3 livré (à poser)** | `delai_relance_jours` ≥ 3 (contrainte) ; « deux messages en tout, jamais un troisième » ; quarantaine |
| Une réponse, même négative, arrête la séquence et vous rend la conversation. | **palier 3 livré (à poser)** | `offload_lire_reponse` : pause socle, tâche « répondre » ; `test_c4_03_reponse` |
| Aucun prix ni aucun délai n'est avancé dans un message sans que vous l'ayez écrit. | **palier 3 livré (à poser)** | message tiré de l'historique seul ; assertion « aucun prix, aucune remise, aucun délai » |
| Une demande d'arrêt vaut retrait immédiat et définitif du cycle. | **palier 3 livré (à poser)** | désinscription socle + compte `arrete` ; `test_c4_03_reponse` |
| Chaque message parti reste au journal, daté et consultable. | **palier 3 livré (à poser)** | `offload.message_envoye` au journal opposable + l'envoi du socle |
| Les vagues s'enchaînent au rythme convenu, et chaque exécution laisse son bilan. | **palier 3 livré (à poser)** | cycle quotidien, `plafond_reprises_jour`, bilan `offload.cycle` au journal |
| Les comptes réactivés sont suivis jusqu'à leur première commande. | **palier 3 livré (à poser)** | issue `commande` ; `test_c4_03_issues` |
| Les messages partent par courriel, depuis la boîte de votre entreprise. | **partiel** : OFFLOAD prépare des courriels ; l'expéditeur (boîte de l'entreprise) est celui du socle (A2 : Gmail / Microsoft 365 pas encore branchés) | — |
| Le système s'arrête de lui-même au premier doute, et vous le signale. | **partiel** : import douteux non appliqué, essai contre réel, verrous du socle ; d'autres doutes au palier 5 | `test_c4_01_garde_fou`, `test_c4_03_issues` |
| Les autres lignes | à venir (paliers 4 et 5) | — |

## Journal

- 06/10 — prise de poste. Lecture : AUDIT-PROMESSES § 1, `app/page.tsx` (accroche OFFLOAD), `lib/produits/reprise.ts`,
  `lib/produits/capacites/reprise.ts` (46 lignes), SOCLE-EXTRAITS-COMMUN (relevés, jeux, instantanés, travaux,
  journal), NOTES-A1 (lecteur-exports), migrations Tiroma et Daliro pour les conventions.
- 06/10 — palier 1 écrit, vérifié sur le banc local (pose ×2, 62 assertions vertes), poussé sur `worker-c4` (7c8c520), envoyé au coordinateur.
- 06/10 — palier 2 (détection) écrit et vérifié sur le banc local, poussé (ce6cd3c), envoyé au coordinateur.
- 06/10 — palier 3 (reprise) écrit et vérifié sur le banc local (14 tests verts sur les trois paliers).
