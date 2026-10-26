# NOTES-C4 — OFFLOAD, « nouvelles affaires / reprise »

Branche `worker-c4`. Périmètre : `omega/modules/offload/migrations/c4_NN_*.sql`, `omega/tests/offload/`,
`components/espace/offload/`, `app/espace/offload/`, et ce fichier. Coordinateur : session
`session_01BCGFdpRKBvXKjouC75sYBg`. Je n'appelle jamais Supabase : le coordinateur pose, je reçois les sorties brutes.

## REPRISE (26/10, fin de matinée — session « offload-c4 » du bureau)

- Fait :
  - test c4_08 vert sur la recette (25/25 ; 77bb0f21, puis da761bb4 du coordinateur).
  - c4_37, la reprise après refus (679f0db3), posé sur la recette : `^test_c4_37_` 20/20, cron `offload-reprises`.
  - Suite `^test_c4_` jouée par morceaux le 25/10 : 58 fonctions sur 59 vertes, 521 assertions, aucune rouge.
    `test_c4_09_arretes` dépasse la minute de l'outil : `offload_detecter_tout` rapproche les 9 898 comptes du
    client de charge créé le 21/10 (633470bc-…). Ce n'est pas une régression : le jouer hors de l'outil ou
    écarter ce client.
  - Écran (c4_36), fait le 26/10 : dans le pilotage, la section « Valeur en jeu par segment » (la valeur en
    deuxième colonne pour rester lisible sur téléphone, total, export CSV) et la section « Restitution » (fichiers
    CSV de la base, un par famille, téléchargés avec BOM). Ajoutés aux deux gabarits : `/espace2/offload/pilotage`
    (sections) et `/espace/offload` (onglets). Fichiers : `Segments.tsx` (nouveau), `Pilotage.tsx`, `portes.ts`,
    `tableur.ts`, `types.ts`. main fusionné dans worker-c4 (748b25ad) pour partir de l'écran actuel.
    Contrôles : tsc sans erreur hors Varelo (la casse de Mac, connue), eslint propre. Recette locale en données
    d'exemple sur `next dev --webpack` aux largeurs 375, 768, 1440 et 1700 : pas de défilement horizontal,
    aucune erreur. Les imports Varelo et Lorani ont été réécrits dans une copie jetable, jamais commitée.
- Décisions prises seul (Teo absent), au plus prudent :
  - La base réelle n'a pas été ouverte en local : pas de connexion au compte du banc depuis ce poste. Les deux
    portes (`offload_valeur_par_segment`, `offload_restitution_tableur`) sont prouvées par le test c4_36 sur la
    recette. Pour la valeur par segment et la restitution, l'écran lit le client donné par `offload_tableau`.
    Si la base refuse (valideur, collaborateur), il affiche son message : réservé au gérant et à l'administrateur.
  - Les fichiers de la restitution sont proposés un par un, avec un bouton « Télécharger » chacun, et pas en
    rafale : un navigateur bloque souvent les téléchargements multiples.
- Reste / à surveiller :
  - Les CSV de `offload_restitution_tableur` ne neutralisent pas une cellule de texte qui commence par
    `= + - @` (injection de formule dans un tableur), alors que l'export du navigateur (`tableur.ts`) le fait.
    Correctif proposé en c4_38 : préfixer d'une apostrophe les seules valeurs de type texte. Pas écrit ici, parce que
    ce passage ne portait que sur l'écran.
  - T-OFFLOAD : rejouer c4_37 (reprise après refus) et l'écran du pilotage.
  - Import des personnes morales : toujours en attente de Teo.

### Reprise du 17/10

17/10 : Teo tranche, « un message par trimestre » prévaut. c4_16 posé et vert (recette : test_c4_* 421 ok). Aucun prochain pas sans Teo ou tiers. La réécriture dans le CRM attend un
connecteur : ne pas la faire. Rien d'autre en cours.

### Pause du 15/10, 16 h 14 Z

État au 15/10 : c4_01 à c4_15 posés et verts sur la recette. Aucun travail en cours, rien à poser. Prochain pas : seulement
sur feu vert de Teo. En attente de sa décision : « un message par trimestre » contre la ligne 12 (deux messages en tout).
Hors OFFLOAD : restitution et effacement (socle), messagerie du client (A2), connecteurs CRM ou ERP (tiers).

### Pause du 11/10, 15 h 40 Z

État au 11/10 : c4_01 à c4_10 posés sur la recette et verts ; écrans fusionnés dans main. 44 lignes sur 45
prouvées ; la ligne 15 attend la messagerie du client (A2). Rien à poser. Aucun travail en cours. Prochain pas :
reprise le 15/10 : les phrases du site restent, le produit se met à leur hauteur, par petits lots. c4_11 (impayés,
CASHD), c4_12 (canal unique, vague de la semaine) et c4_13 (contacts importés, remise en un geste) faits, à poser.
c4_14 (chantiers, missions) et c4_15 (message ancré sur l'échéance) faits. Recette du 15/10, 12 h 32 Z : c4_01 à c4_15 tous verts. Restent du chiffrage : la restitution et l'effacement à la sortie (n° 58, côté socle : les migrations n'ont pas le droit au
DELETE), et les connecteurs directs (CRM, ERP), qui sont des tiers. « Un message par trimestre » attend Teo
(contredit la ligne 12).

### Pause précédente (06/10, 21 h Z)

**Fait** (branche `worker-c4`, tout poussé) :
- c4_01 à c4_09 sont posés sur la recette et verts. Dernière recette : `^test_c4_09_` 21 ok, 0 not ok.
- c4_07 (échéances) `5f2cc7e`, c4_08 (affaires en plan) `e4365bf`, c4_09 (pilotage) `ed946d2a`, avec les corrections du test
  `910c2672` et `8b71a98a`.
- 41 lignes sur 45 sont prouvées sur la recette ; 4 sont partielles (6, 11, 15, 38).
- Accessibilité : `role="img"` sur les barres de la courbe, `d41125a3` (axe : 0 violation).
- Chiffrage des promesses de la page : `omega/CHIFFRAGE/offload.md`, `5cbbc113`.

**Attend le coordinateur** : fusionner dans main tout ce qui suit `efd478e` sur `worker-c4` :
- l'écran Pilotage (`Pilotage.tsx`, `tableur.ts`, `EcranOffload.tsx`, `portes.ts`, `types.ts`) ;
- `role="img"` dans `Courbe.tsx` ;
- les notes et le chiffrage.

**Attend Teo** :
- choisir, pour les cinq phrases de la page qui contredisent le produit (vague du mardi, un message par trimestre, un
  seul canal, compte en litige, réécriture dans le CRM), entre construire (3,5 j) ou corriger le texte ;
- repasser en `atteste: false` les lignes 11, 15 et 38 du catalogue ;
- les tiers du passage en vrai : messagerie du client (A2), client pilote, annexe des prestataires, régions
  d'hébergement.

**Prochaine étape** : c4_10 posé et vert le 11/10 (lignes 6, 11, 38 prouvées, réponses automatiques, comptes à
vérifier) ; 44 lignes sur 45 prouvées. Reste la ligne 15 (envoi depuis la boîte de l'entreprise), qui attend le
branchement de la messagerie du client (A2), et les choix de Teo listés plus haut (phrases contredites, `atteste`).

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

**Correction après refus de pose (coordinateur, 06/10 16 h 14)** : `modeles_jeux_coherent` refusait le modèle
« ventes » — sa clé portait `reference`, colonne facultative ; une clé de dédoublonnage ne porte que des colonnes
obligatoires et non sensibles (`private.declaration_coherente`). Clé ramenée à `compte_ref, date` ; plusieurs
pièces le même jour restent départagées par le n° de pièce dans `offload_appliquer_releve` (addition pièce par
pièce, inchangée). Le modèle « clients » (clé `compte_ref`, obligatoire) était conforme. La règle est désormais
reproduite dans le socle factice local : l'ancienne version y est refusée avec la même erreur, la nouvelle passe.

**Questions au coordinateur** (réponses du 06/10 en dessous) :
- Q1. Le dépôt d'un fichier depuis l'espace : `offload_deposer_export` attend un fichier déjà posé dans
  `omega-clients` sous `<client>/branchement/<id>/`. Les règles Storage laissent-elles un `authenticated`
  (gérant, collaborateur) y écrire ? Sinon, quelle voie préférez-vous (route serveur, ou une porte de dépôt du
  socle) ? En attendant, la saisie à la main et le dépôt par le coordinateur couvrent le palier.
- Q2. Le module `offload` doit-il être déclaré quelque part (`moteurs_reconnus`, `modules_envois`) avant le palier 3
  (envois) ? Je le demanderai avec le lot des reprises.
- **Réponses** : Q1 oui (lots socle 19m et 19o : les membres déposent sous `omega-clients/<client>/…`, le chemin
  `branchement/<id>/` passe). Q2 oui : déclaré dans c4_03 (`private.modules_envois` offload, canaux courriel et
  appel ; `public.moteurs_reconnus` OFFLOAD par sa seule colonne `code`, en `where not exists` ; si la table exige
  d'autres colonnes, la pose continue et le signale par un NOTICE).

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
- **Réponse Q3 (décision du coordinateur, option a automatisée), appliquée dans c4_03** —
  `private.offload_assurer_consentement(compte)`, appelée avant chaque message :
  > Pour un compte professionnel (raison sociale d'une personne morale : forme juridique dans le nom, ou groupe
  > connu), le consentement est noté par `private.noter_consentement`, source « interet_legitime_b2b », preuve
  > « client existant, message en rapport avec son activité (CNIL, prospection B2B) ». Pour un particulier qui a
  > déjà acheté : source « soft_opt_in », preuve « client existant, produits analogues (CPCE L34-5) ». Seulement
  > si le compte n'est pas désinscrit et que son adresse ne s'est jamais opposée (désinscription ou adresse
  > invalide, même levée). Chaque message porte la désinscription (« stop »). Aucun consentement n'est inventé
  > pour un contact sans historique d'achat (il passe par l'appel).
  Le destinataire est marqué `professionnel` selon la même règle. ⚠ Le `noter_consentement` de l'extrait du
  05/10 n'accepte que les sources `formulaire, ecrit, oral, contrat, message, import` : les deux sources décidées
  doivent être acceptées par le socle, sinon la préparation du message échoue (travail repris, reprise non ouverte).
  Test : `test_c4_03_consentement` (SARL → B2B avec preuve ; sans achat → rien ; désinscription levée → rien).
  **Lot c4_06 (06/10, 16 h 55)** : la recette refuse ces deux sources (`consentements_source_check`) et le
  coordinateur n'élargit pas le socle. `offload_assurer_consentement` est redéfinie : source **« contrat »**
  (relation commerciale existante) dans les deux cas ; la preuve dit la base légale exacte — « intérêt légitime
  B2B, client existant, message en rapport avec son activité (CNIL) » ou « soft opt-in, client existant, produits
  analogues (CPCE L34-5) ». Conditions inchangées. La contrainte de source est reproduite dans le socle factice :
  sans c4_06, `test_c4_06_consentement_source` tombe sur `consentements_source_check` ; avec, il passe. Le test
  c4_03 est aligné (assertions de source et de preuve) : **à reposer** avec c4_06.
- Q4. `reglages_envois` du module `offload` pour le banc (mode `essai`, `essai_adresse`) : le test le pose lui-même
  dans sa transaction ; pour un essai réel sur la recette, il faut la ligne (comme `recette-b6/banc_j2_reel.sql`).
  **Réponse : oui** → `omega/recette-c4/banc_offload.sql` (ligne reglages_envois offload en ESSAI avec l'adresse
  d'essai du banc, puis `offload_installer` sur le banc, puis contrôle). Pas un test : rien n'est annulé.

## Palier 4 — l'écran (lot c4_04)

**SQL** (`omega/modules/offload/migrations/c4_04_ecran.sql`) : deux lectures SECURITY INVOKER (RLS du lecteur) —
`public.offload_tableau(p_client)` (réglages, compteurs, comptes à risque d'abord par priorité, 500 au plus, avec
signal et dernière reprise ; messages en attente de validation avec sujet et corps ; tâches à faire) et
`public.offload_fiche(p_compte)` (compte, signal, courbe sur 24 mois, 60 dernières pièces, reprises avec l'état de
leurs envois, tâches ; null hors périmètre). Test `omega/tests/offload/c4_04_ecran.sql` (`test_c4_04_lectures` :
ordre de la liste, phrases servies, compteurs, message lisible, courbe 24 mois, autre organisation → rien).

**Écran** `/espace/offload` (`app/espace/offload/page.tsx`, `components/espace/offload/`) :
- quatre compteurs qui filtrent : avant la clôture, clients à risque, messages à valider, appels à passer ;
- la liste des comptes à risque par priorité, chacun avec sa première raison en clair, son score, sa reprise ;
- les messages de reprise à valider (sujet, destinataire, corps dépliable ; lien vers « À valider », où se prend la
  décision du socle) ;
- la fiche : raisons avec leurs points (le score en est la somme), rythme, dernier achat, achat attendu, panier,
  douze mois, priorité ; la **courbe** du chiffre HT par mois sur 24 mois (une série, une teinte, moyenne d'il y a
  un an en pointillé, info-bulle au survol et au clavier, tableau équivalent) ; la reprise (préparer → validation) ;
  les tâches (noter le résultat d'un appel, abandonner en disant pourquoi) ; les pièces (et en ajouter une à la main).
- Deux sources comme les autres écrans (exemple en mémoire / base réelle), temps réel sur les tables OFFLOAD.
- tsc, eslint, build verts ; recette aux 5 largeurs (390, 768, 1024, 1440, 1700) par `outils/recette-mobile.mjs`
  sur un `next start` local : aucun débordement, aucune erreur console (hors script Vercel absent en local) ;
  captures 390 et 1440 relues.
- **La coquille n'est pas touchée** : l'entrée de navigation (`components/espace/ecrans.ts`, `{ cle: "offload",
  href: "/espace/offload", libelle: "Clients qui décrochent", court: "OFFLOAD" }`) est à ajouter par C1.

**Ordre de pose (recette)** : `c4_04_ecran.sql`, puis `omega/tests/offload/c4_04_ecran.sql`
(`runtests('tests', '^test_c4_04_')`).

## Palier 5, lot c4_05 — garde-fous commerciaux et doublons

**Ce qui est posé** (`omega/modules/offload/migrations/c4_05_garde_fous.sql`) :
- `offload_changer_statut(compte, 'exclu' | 'suivi', motif)` : **reprendre la main d'un seul geste** — la reprise en
  cours est close (`reprise_en_main`), ses messages en attente annulés au socle (`private.annuler_envoi`),
  l'historique reste attaché ; motif obligatoire ; un compte retiré à sa demande ne revient dans le circuit que par
  le gérant ou l'admin (la désinscription du socle se lève à part).
- `public.offload_exclusions` (compte, secteur, commercial, groupe ; levée, jamais effacée), portes `offload_exclure`,
  `offload_lever_exclusion`.
- `public.offload_contacts` + `offload_comptes.dernier_contact`, porte `offload_noter_contact` : un contact d'un
  commercial dans la quarantaine écarte le compte de la vague.
- Plafond **au groupe** : une reprise à la fois par groupe (colonne `groupe` lue dans les exports), quarantaine
  comprise.
- `private.offload_ecarte(compte)` : la phrase qui dit pourquoi un compte est écarté (fusionné, suivi en direct,
  retiré, liste d'exclusion, contacté le…, groupe déjà sollicité). `offload_cycle` redéfini : chaque candidat y
  passe au moment où il vient (le plafond du jour compte les ouvertures réelles), bilan `ecartes`.
- **Doublons** : `public.offload_rapprochements`, proposés chaque nuit (`offload_detecter_tout` redéfini) — même
  courriel, même téléphone (9 derniers chiffres), même raison sociale sans forme juridique ni accents — avec leurs
  raisons en phrases ; `offload_trancher_rapprochement` (gérant, admin, valideur) : accepté, les pièces passent à
  la fiche gardée, l'autre est marquée `fusionne_dans` et ne sort plus ; une demande d'arrêt sur l'une vaut pour
  l'autre ; refusé, plus proposé. `offload_rapprocher(client)` à la demande. `offload_tableau` redéfini : sans les
  fiches fusionnées, avec les doublons proposés et les exclusions.
- Écran : « Reprendre la main » / « Remettre dans le cycle » (motif), « Noter un contact », carte « Doublons
  proposés » (fusionner, ou « ce sont deux clients »).

**Tests** : `omega/tests/offload/c4_05_garde_fous.sql` — `test_c4_05_reprise_en_main`, `test_c4_05_exclusions`,
`test_c4_05_doublons`. Banc local : 18 tests, 207 assertions vertes (lots 1 à 5), migrations posées deux fois ;
tsc, eslint, build verts ; recette 5 largeurs sans débordement.

**Ordre de pose** : `c4_05_garde_fous.sql`, puis `omega/tests/offload/c4_05_garde_fous.sql`
(`runtests('tests', '^test_c4_05_')`).

**À inscrire dans `a5_01`** : `offload_changer_statut(p_compte uuid, p_statut text, p_motif text)`,
`offload_exclure(p_client uuid, p_type text, p_valeur text, p_motif text)`, `offload_lever_exclusion(p_exclusion uuid)`,
`offload_noter_contact(p_compte uuid, p_le date, p_canal text, p_par text, p_note text)`,
`offload_rapprocher(p_client uuid)`, `offload_trancher_rapprochement(p_rapprochement uuid, p_accepter boolean)`.

## Lot c4_07 — échéances et renouvellements (moteur CYCLE, première moitié)

**Ce qui est posé** (`omega/modules/offload/migrations/c4_07_echeances.sql`) :
- tables `offload_equipements` (site, type d'entretien, périodicité, nature réglementaire / commerciale, dernière
  intervention), `offload_interventions` (dont « faite ailleurs »), `offload_contrats` (fin, reconduction tacite /
  expresse / aucune), `offload_echeances` (entretien d'un équipement ou fin d'un contrat) ; RLS lecture seule ;
- trois modèles d'export offload/tableur (`equipements` clé compte_ref + ref ; `interventions` clé equipement_ref +
  date ; `contrats` clé numero — toutes obligatoires, conformes à `declaration_coherente`) ; les branchements déjà
  posés reçoivent ces jeux par `private.declarer_jeu` (le banc en a un) ; l'import les applique (comptes cités créés,
  intervention rattachée par n° de série, « semestriel » → 6 mois, « Réglementaire » → réglementaire) ;
- `private.offload_echeances_cycle` : échéance = dernière intervention enregistrée + périodicité ; une intervention
  plus récente honore les échéances d'avant (`honoree_ailleurs` si faite ailleurs) ; message **de J-7 à J-1, jamais le
  jour même**, un seul, par `preparer_envoi` (validation, essai) avec le consentement d'un client existant ; sans
  courriel ou message retenu : tâche d'appel ; tombée sans trace : `depassee`, sans seconde relance ; contrats sans
  reconduction tacite à 60 jours ou passés : signalés, tâche « proposer le renouvellement », journal
  `offload.contrat_s_eteint` ; plafond au groupe (un message d'échéance par groupe et par semaine) ;
- redéfinitions par copie de la dernière version : `offload_appliquer_releve`, `offload_traiter_travaux` (après un
  import : détection puis échéances), `offload_suivre_envoi` (un message d'échéance → `prevenue`),
  `offload_point_lignes` (échéances de la semaine, réglementaires d'abord ; contrats qui s'éteignent),
  `offload_detecter_tout` (la nuit enchaîne les échéances) ;
- portes `offload_saisir_equipement`, `offload_noter_intervention` (dont `p_ailleurs`), `offload_saisir_contrat` ;
  lectures `offload_parc(client)` (consolidé + site par site), `offload_echeances_tableau(client)`,
  `offload_parc_compte(compte)` ;
- écran : carte « Échéances et contrats » (réglementaire marqué), fiche « Parc installé et contrats » avec « Noter une
  intervention » (dont « faite ailleurs ») ; la légende et les mois de la courbe passent en HTML (lisibles à toutes
  les largeurs).

**Tests** : `omega/tests/offload/c4_07_echeances.sql` — `test_c4_07_echeances`, `test_c4_07_contrats_et_parc`,
`test_c4_07_import_et_groupe` (30 assertions). Banc local : 23 tests, 252 assertions vertes, migrations posées deux
fois ; tsc, eslint, build verts ; recette 5 largeurs sans débordement.

**Ordre de pose** : `c4_07_echeances.sql`, puis `omega/tests/offload/c4_07_echeances.sql`
(`runtests('tests', '^test_c4_07_')`).

**À inscrire dans `a5_01`** : `offload_saisir_equipement(p_compte uuid, p_ref text, p_designation text, p_champs jsonb)`,
`offload_noter_intervention(p_equipement uuid, p_le date, p_nature text, p_ailleurs boolean, p_reference text)`,
`offload_saisir_contrat(p_compte uuid, p_numero text, p_fin date, p_champs jsonb)`.

**Limite** : une réponse du client à un message d'échéance n'est pas encore rattachée à l'échéance (le socle la
reçoit ; la réponse arrête les reprises, pas les échéances qui n'ont qu'un message).

## Lot c4_08 — affaires restées en plan (06/10, après c4_07 posé et vert)

`omega/modules/offload/migrations/c4_08_affaires.sql` :

- `public.offload_affaires` (RLS, lecture dans le périmètre, aucune écriture directe) : une commande arrivée ou une
  intervention terminée, non retirée ; référence, libellé, date de disponibilité, **valeur HT immobilisée** ; statut
  `en_attente` → `relancee_1` → `relancee_2` → `decision`, ou `repondue`, `retiree`, `close_sans_suite` ;
  `offload_reglages.delai_retrait_jours` (7) et `delai_relance_retrait_jours` (7), réglables par `offload_regler` ;
- modèle d'export « affaires » (clé `compte_ref` + `reference`, toutes deux obligatoires ; `disponible_le` date
  obligatoire ; type, libellé, valeur, `retire_le` facultatifs) et `declarer_jeu` sur les branchements déjà posés ;
  une affaire absente du dernier export est dite « plus vue », **jamais close d'office** ; une date de retrait dans
  l'export la clôt ;
- `private.offload_affaires_cycle` : après le délai, un message de retrait par `preparer_envoi` (validation, verrous,
  mode du socle) ; **une seule** autre après le délai de relance ; sans réponse, `decision` avec « (480 € immobilisés
  depuis le …) » ; jamais deux étapes dans un même passage. Un rappel de retrait n'est pas une sollicitation : un
  compte inactif ou déjà contacté est prévenu ; arrêt demandé ou fiche fusionnée : écarté ; compte suivi en direct
  ou sur liste d'exclusion : **tâche d'appel**, jamais de message automatique ; sans courriel : tâche d'appel ;
- `private.offload_message_retrait` : **aucune mention de paiement, de prix ni de montant** (CASHD) ; intervention
  dite « terminée », commande « arrivée », sans accord de genre ;
- réponse du client (lien à l'envoi ou adresse) : `repondue`, tâche « répondre », relance en validation annulée ;
  « stop » : désinscription au socle, compte `arrete` ; relance refusée en validation → `decision` ; message non
  parti → tâche d'appel ;
- portes `offload_saisir_affaire`, `offload_retirer_affaire`, `offload_decider_affaire` (relancer, garder,
  retour_stock, sans_suite ; motif obligatoire, au journal) ; lectures `offload_affaires_liste(client)` (la plus
  ancienne en tête, jours, valeur, total, à décider, closes sans suite à part) et `offload_affaires_compte(compte)` ;
- redéfinitions par copie de la dernière version : `offload_appliquer_releve` (jeu « affaires »),
  `offload_traiter_travaux` (après un import : détection, échéances, affaires), `offload_suivre_envoi`,
  `offload_lire_reponse`, `offload_point_lignes` (décisions à prendre, stock immobilisé), `offload_detecter_tout`,
  `offload_regler` ;
- écran : carte « Affaires restées en plan » (totaux, liste, décision et retrait), fiche « En attente de retrait »
  (saisie, retrait).

**Tests** : `omega/tests/offload/c4_08_affaires.sql` — `test_c4_08_cycle`, `test_c4_08_inactif_et_reponse`,
`test_c4_08_import` (42 assertions). Banc local : 26 tests, 294 assertions vertes, migrations posées deux fois ;
tsc, eslint, build verts ; recette 5 largeurs sans débordement.

**Ordre de pose** : `c4_08_affaires.sql`, puis `omega/tests/offload/c4_08_affaires.sql`
(`runtests('tests', '^test_c4_08_')`).

**À inscrire dans `a5_01`** : `offload_saisir_affaire(p_compte uuid, p_reference text, p_disponible_le date, p_champs jsonb)`,
`offload_retirer_affaire(p_affaire uuid, p_retire_le date)`, `offload_decider_affaire(p_affaire uuid, p_decision text, p_motif text)`.

## Lot c4_09 — pilotage (06/10, après c4_08 posé et vert)

`omega/modules/offload/migrations/c4_09_pilotage.sql` :

- `offload_reprises.valeur_en_jeu` et `segment` : instantané à l'ouverture (déclencheur
  `offload_reprises_instantane` : valeur annuelle attendue du signal, secteur du compte) ; reprises existantes
  complétées au mieux ; `offload_affaires.repondu_le` (la réponse à un rappel de retrait est datée) ;
- `private.offload_pilotage_calcul(client, depuis)` (12 mois par défaut) :
  - **vagues** (une vague = le passage d'un jour) : comptes, chiffre en jeu, messages, appels, réponses, taux,
    commandes reprises, chiffre repris (achats du compte dans les 90 jours qui suivent l'ouverture) ;
  - **taux** de réponse par segment (secteur), niveau du signal, canal (courriel, appel), message (premier message,
    relance, rappel de retrait) ;
  - **suivi** mois par mois : échéances honorées (dont après un message), commandes reprises et chiffre, affaires
    retirées après relance et valeur libérée ;
  - **entités** : par société (une entité `societe`, ou le parent d'un `site` / `etablissement`), par site, consolidé ;
- `public.offload_pilotage(client, depuis)` → `private.offload_pilotage` (gérant, admin, valideur : la vue consolidée
  couvre toutes les entités ; 42501 sinon) ;
- à date fixe : `public.offload_arretes` (RLS : la direction lit) posé par la nuit (`offload_detecter_tout` →
  `private.offload_arreter`) une fois par mois, au jour `offload_reglages.arrete_jour` (1 à 28, 1 par défaut) ou au
  premier passage qui suit ; `public.offload_arretes_liste(client)` ;
- redéfinitions par copie : `offload_reponse_affaire`, `offload_detecter_tout`, `offload_regler` ;
- écran : carte « Pilotage » à onglets (Vagues, Taux de réponse, Suivi, Entités et sites, Arrêtés) ; chaque onglet
  « Exporter vers un tableur » (CSV au point-virgule, BOM UTF-8, cellules protégées contre l'injection de formule,
  `components/espace/offload/tableur.ts`) ; chaque arrêté « Télécharger en tableur » (les quatre tableaux à la suite).

**Tests** : `omega/tests/offload/c4_09_pilotage.sql` — `test_c4_09_pilotage`, `test_c4_09_arretes` (18 assertions).
Banc local : 28 tests, 312 assertions vertes, migrations posées deux fois ; tsc, eslint, build verts ; recette
5 largeurs sans débordement.

**Ordre de pose** : `c4_09_pilotage.sql`, puis `omega/tests/offload/c4_09_pilotage.sql`
(`runtests('tests', '^test_c4_09_')`). Le test crée une entité `site` sur le banc (annulée par runtests).

**À inscrire dans `a5_01`** : `offload_pilotage(p_client uuid, p_depuis date)`.

**Limites** : le taux par message ne compte pas les messages d'échéance (pas de réponse rattachée à une échéance ;
l'échéance honorée après message est comptée au suivi). Le chiffre repris compte tous les achats des 90 jours,
sans prétendre qu'ils sont dus au seul message.

## Lot c4_36 — valeur en jeu par segment, restitution en tableur (25/10)

`public.offload_valeur_par_segment(p_client)` (gérant/admin) : par secteur (« Sans segment » à défaut), comptes suivis,
à risque, valeur annuelle en jeu, reprises en cours ; comptes effacés, retirés, fusionnés exclus.
`public.offload_restitution_tableur(p_client)` (gérant/admin) : la restitution c4_17 en CSV, un fichier par famille
(« ; », guillemets doublés, en-tête), au journal. Test `c4_36_segments_et_tableur.sql` : tombe sans le lot, 4 verts
avec. Local : 59 tests, 513 ok.

## Lot c4_35 — les relances d'affaire se valident, la suite attend leur départ (TOFFLOAD-11, 25/10)

offload_tableau.a_valider liste aussi les relances de retrait à valider (« affaire », rang), le compteur a_valider les
compte ; le cycle des affaires compte à part les relances qui attendent une validation (« a_valider ») : relances_1/2
ne comptent que ce qui est parti ; la seconde relance attend le départ de la première (envoyé, brouillon déposé, ou
relance par une personne), la décision attend celui de la seconde. Le test c4_08 fait partir les relances (c4_remettre)
avant d'attendre la suite. Test `c4_35_relances_affaire_visibles.sql` : 3 rouges sur 4 avant, 4 verts après. Local : 58 tests, 509 ok.

## Lot c4_34 — les échéances des contrats à reconduction (C:73, C:75 ; 25/10)

`offload_echeances_tableau` montre l'échéance de tout contrat actif à 60 jours, avec une phrase (tacite : « se reconduit
tacitement le … : rien à faire, sauf si le client veut l'arrêter » ; expresse/aucune : le signal « s'éteint ») ; jour au
fuseau de l'organisation. Test `c4_34_contrats_a_reconduction.sql` (deux comptes : un contrat plus tardif du même compte
couvre l'autre, c4_07) : 1 rouge sur 3 avant, 3 verts après. Local : 57 tests, 505 ok.

## Lot c4_33 — affaires en plan : relance et chiffrage tenus même sans message (23/10)

Promesses C:86-88 et C:152 (O4 du testeur : listée, mais ni relance ni tâche, valeur inconnue). Le cycle des affaires
ne s'arrête plus quand OFFLOAD ne peut préparer aucun message (essai sans réglage, suspendu) : chaque étape passe par
une tâche d'appel, avec la raison ; seconde relance puis décision manuelle « montant immobilisé en regard » aux mêmes
délais ; aucun envoi hors essai. `private.offload_chiffrer_affaires` : une affaire sans valeur prend le montant HT de la
pièce du même compte et de même référence ; la saisie accepte « montant » / « montant_ht ». Test
`c4_33_affaires_relance_et_chiffrage.sql` : tombe sans le lot, 6 verts avec. Local : 56 tests, 502 ok.

## Lot c4_32 — les reprises d'avant les règles suivent les règles (TOFFLOAD-09, 10 ; 22/10)

O1 (litige CASHD) et O12 (effacé avant c4_26) gardaient une reprise « appel » et une tâche ; O12, O13 restaient listés.
`private.offload_clore_interdites(p_client)` clôt « abandon » toute reprise ouverte d'un compte suivi par CASHD, effacé
ou retiré, et abandonne les tâches d'un compte effacé ; elle joue à chaque détection et en tête du cycle ; la pose la
joue une fois pour toutes les organisations. offload_tableau ne liste plus un compte effacé. Test
`c4_32_reprises_d_avant.sql` : 5 rouges sur 6 avant, 6 verts après. Local : 55 tests, 496 ok.

## Lot c4_31 — le fuseau de l'organisation (22/10)

OFFLOAD lit le fuseau de l'entité principale de l'organisation (public.entites.fuseau, défaut Europe/Paris), comme le
socle : `private.offload_fuseau(p_client)`, `private.offload_fuseau_compte(p_compte)`. 22 fonctions redéfinies (jour de
détection, cycle, vague, arrêté ; « pas dans le futur » d'un achat, d'un contact, d'une intervention ; clôture sur
commande ; quarantaine d'un contact ; échéance des tâches ; pilotage ; fiche ; phrases datées). Reste à Paris :
offload_deposer_points (point du matin commun). Test `c4_31_fuseau_organisation.sql` : deux fuseaux lointains
(Kiritimati, Pago Pago), indépendant de l'heure ; 8 assertions ; tombe sans le lot. Local : 54 tests, 490 ok.

## Lot c4_30 — la date d'un achat se juge à l'heure de Paris (21/10, 23 h 20 Z)

Recette, test c4_29 à 23 h Z : la reprise est datée à Paris (22/10), l'achat du test à current_date UTC (21/10) → pas
« depuis l'ouverture ». Et offload_saisir_achat refusait comme future une date du jour à Paris entre 22 h et minuit UTC
(défaut réel). Corrigé : la borne « pas dans le futur » se juge à la date de Paris ; les tests c4_25, c4_27, c4_29
datent la commande à Paris. Avant (session UTC, 23 h 17 Z) : test c4_29 tombe (« La date d'un achat est connue et
passée ») ; après : c4_24 à c4_30 verts en UTC. Restent les tests anciens (c4_03 à c4_09) qui comparent current_date UTC
aux dates de Paris : faux rouges entre 22 h et minuit UTC, connus, à lancer hors de cette heure.

## Lot c4_29 — un cycle par compte et par trimestre, un rappel, la reprise forcée (21/10)

Décision du bureau (délégation de Teo) : au plus un cycle par compte et par trimestre ; un seul rappel (deux messages) ;
commande ou réponse clôt le cycle sans rouvrir le droit ; le gérant force avec un motif, jamais sur un litige CASHD.
Écarts corrigés : relance écrite allumée par défaut (et rallumée là où personne ne l'a éteinte au journal) ; la reprise
manuelle suit les règles de la vague (offload_ecarte : trimestre, contact noté, exclusions, à vérifier, litige) ;
`public.offload_forcer_reprise(p_compte, p_motif)` (gérant/admin, motif, journal « offload.reprise_forcee ») passe le
trimestre et les écarts, jamais le litige, un compte retiré, OFFLOAD suspendu ou hors essai. Tests c4_16 et c4_18 rendus
indépendants du défaut. Test `c4_29_un_cycle_par_trimestre.sql` (10 assertions ; tombe sans le lot). Local : 53 tests, 481 ok.
Quarantaine : 90 jours glissants depuis la clôture du cycle (pas le trimestre civil).

## Lot c4_28 — un réglage hors bornes se dit en français (TOFFLOAD-08, 21/10)

offload_regler renvoyait le texte brut d'une contrainte (vague_jour 9). `private.offload_phrase_reglage` donne la phrase
de chaque borne ; offload_regler la renvoie en 23514 ; une valeur non numérique ou trop grande répond 22023 en
français. Test `c4_28_reglages_en_francais.sql` : 5 rouges sur 6 avant, 6 verts après. Banc local : 52 tests, 471 ok.

## Lot c4_27 — une retenue ne survit pas à sa reprise (TOFFLOAD-07, 21/10)

O14 : reprise close « commande », message annulé, mais la demande « offload.message_retenu » restait en attente et
comptée. `offload_clore` annule les demandes de retenue en attente de la reprise ; `offload_accord_etat` ne compte que
celles dont le message attend encore une validation ; la pose annule l'existant (retenue en attente sans message à
valider). Test `c4_27_retenues_closes.sql` : 2 rouges sur 4 avant, 4 verts après. Banc local : 51 tests, 465 ok.

## Lot c4_26 — l'effacement d'une personne, jusqu'au bout (TOFFLOAD-04, 21/10)

Après effacement (O12) : la restitution montrait nom/courriel/contact recopiés au journal à la saisie ; reprise ouverte,
tâche à faire ; ressaisie acceptée en silence. Le journal opposable est chaîné et ne se réécrit pas (preuve) ; les achats
restent (pièces comptables du client, sans nom). Corrigé : saisir_compte journalise le NOM des champs, pas leurs valeurs ;
la restitution masque les lignes de journal d'un compte effacé ; effacer clôt les reprises (« abandon », message annulé)
et abandonne les tâches, y compris en rejouant l'effacement sur un compte déjà effacé ; ressaisie et nouvel achat
refusés (55000). Le test c4_19 accepte le refus de ressaisie. Test `c4_26_effacement_complet.sql` : 5 rouges sur 7
avant, 7 verts après. Banc local : 50 tests, 461 ok.

## Lot c4_25 — une commande pendant la reprise la clôt (TOFFLOAD-06, 21/10)

La clôture « commande » ne vivait que dans l'étape 1 du cycle, après ses sorties anticipées (suspendu, essai sans
réglage) : la détection seule, ou un client sans réglage d'envoi, ne la jouait jamais (O7, O11 : reprise « appel »,
tâche « à faire »). `private.offload_clore_commandes(p_client, p_compte)` joue à la saisie d'un achat, à la fin de
chaque détection et en tête du cycle (étape 00). `offload_clore` annule aussi le message pas encore parti.
Test `c4_25_commande_pendant_reprise.sql` : 4 rouges sur 5 sans le lot, 5 verts avec. Banc local : 49 tests, 454 ok.

## Lot c4_24 — saisie idempotente (TOFFLOAD-05, 21/10)

Rejouer offload_saisir_achat doublait l'achat (banc-test-offload : 170 doublons, CA 12 mois doublé) ; idem
offload_noter_contact. Les deux portes rendent désormais l'existant : achat actif même compte, date, montant, nature,
référence (absente comprise) ; contact même compte, date, canal, auteur, note. Réparer l'existant :
`public.offload_dedoublonner_achats(p_client)` (gérant/admin) ANNULE les achats saisis identiques au-delà du premier
(jamais d'effacement), au journal. Test `c4_24_saisie_idempotente.sql` (8 assertions ; sans le lot le test tombe).
Banc local : 48 tests, 449 ok.

## Lot c4_23 — correctifs du testeur T-OFFLOAD (21/10)

TOFFLOAD-01 : OFFLOAD en essai sans réglage d'envoi du module → le socle faisait naître les envois en « reel »
(bloqués CONFIG_ABSENTE). `offload_essai_contre_reel` est désormais vrai dès que le réglage effectif n'est pas « essai »
(absent compris) : aucune porte ne prépare rien ; `offload_envoyer` le revérifie en dernier ; les phrases disent « ne
sont pas réglés en essai ». TOFFLOAD-02 : `offload_ouvrir` refuse un compte que CASHD suit (`offload_impaye`), même à la
main. Test `c4_23_correctifs_testeur.sql` : 6 rouges sans le lot, 6 verts avec. Souche locale : un envoi sans réglage
naît désormais en « reel », comme le vrai socle. Banc local : 47 tests, 441 ok.
O6 (contact noté il y a moins de 90 jours, reprise ouverte à la main) : voulu depuis c4_05 — la quarantaine du contact
écarte du CYCLE automatique ; la porte manuelle est la décision d'une personne. Fermable sur décision.

## Point 7 du bureau — script d'import des comptes d'Omega, personnes morales seulement (19/10)

`omega/modules/offload/outils/offload_omega_personnes_morales.py` : AUCUNE donnée dans le fichier. Il lit
omega/prospection/guadeloupe.csv (branche prospection-guadeloupe), garde personne_physique = « non » seulement (écarte
« oui » = entrepreneurs individuels, et les lignes sans valeur), dédoublonne par SIRET, ne reprend ni dirigeant ni
adresse ni site, retire les courriels de forme prénom.nom (garde contact@, devis@…), et écrit un SQL rejouable :
OFFLOAD installé en essai, réglage offload remis en essai s'il était réel, comptes en « exclu » avec motif, aucun achat,
contrôle final. Testé sur un fichier FICTIF (6 lignes : 3 gardées, 1 EI, 1 forme inconnue, 1 doublon, 1 courriel retiré ;
joué deux fois dans une transaction annulée : 3 comptes, 0 achat, 0 reprise, 0 envoi, essai). Ma garde a refusé que je
le lance sur la vraie liste (données personnelles) : je ne l'ai pas contournée ; c'est le coordinateur qui l'exécute.

## Lot c4_22 — la branche Gmail (19/10)

Décision du bureau (délégation de Teo) : Gmail sur la recette, boîte de test, mode essai. Le branchement est au socle
(19al, A2 : boîte connectée = expéditeur préféré, dépôt en brouillon « brouillon_depose », relève des réponses).
`c4_22_gmail.sql` : abonnement « envoi.brouillon_depose.offload » ; offload_suivre_envoi traite un brouillon déposé
comme un message parti (reprise, échéance, affaire) et le journalise (« offload.brouillon_depose ») ;
`public.offload_messagerie(p_client)` (gérant/admin) : mode, boîtes connectées, dépôt en brouillon ou en envoi selon
les portées accordées. Les réponses relevées arrivent par reception.nouvelle, déjà lues (lien à l'envoi ou adresse).
Test : `omega/tests/offload/c4_22_gmail.sql` (5 assertions). Banc local : 46 tests, 435 ok.

## Lot c4_21 — réécriture par règles et formules écrites (19/10)

Point 1 de Teo, tranché par le bureau (pas de modèle de langue). `c4_21_reecriture.sql` redéfinit
`offload_interpreter_regle` et `offload_regles_appliquer` : « Remplace « X » par « Y » » / « Dis « Y » plutôt que
« X » » (famille interdit + parametres.remplacement : le mot est réécrit, pluriel compris, au lieu de retenir) ; « un ton
sobre / formel / chaleureux » (famille signature + parametres.ton et formule : la formule de politesse écrite remplace
« Bien cordialement, »). Puis le contrôle : le message réécrit repasse au crible et reste retenu s'il enfreint encore une
règle. Pas de nouvelle famille (la contrainte reste, aucun DROP). Le résultat porte « reecritures ».
Test : `omega/tests/offload/c4_21_reecriture.sql` (8 assertions). Banc local : 45 tests, 430 ok. Limite connue : un
remplacement mot à mot ne corrige pas l'accord (« dernière achat ») ; au client d'écrire une règle qui s'accorde.

## Lot c4_20 — l'écran de l'envoi automatique, de la restitution et de l'effacement (19/10)

`components/espace/offload/EnvoiAuto.tsx` : carte « Envoi automatique et données » (état du réglage et de l'accord,
sujets cochés, donner ou révoquer l'accord, éteindre ou rallumer, messages retenus en attente, téléchargement JSON de la
restitution) ; `Effacement` dans la fiche (« Données de la personne », origine de la demande obligatoire). Portes :
offload_envoi_auto, offload_regler, offload_donner_accord_auto, offload_revoquer_accord_auto, offload_restitution,
offload_effacer_compte. Vérifié : tsc, eslint, build, recette aux cinq largeurs (aucun débordement ; axe : seul « region »
sur .v2-evitement, déjà là avant).

## Lot c4_19 — effacement des données d'une personne (19/10)

Liste de Teo (point 9). L'effacement de l'organisation relève du socle : toutes les tables offload_* sont en
client_id … on delete cascade (vérifié par le test sur le catalogue). Ici, la demande d'une personne :
`public.offload_effacer_compte(p_compte, p_motif)` (gérant/admin, origine obligatoire). Le nom, l'interlocuteur, le
courriel, le téléphone, la ville et le groupe sont rendus anonymes ; les notes de contact et le détail des tâches sont
vidés ; le compte passe à « arrete » ; ses envois à valider ou prêts sont annulés. L'historique d'achats est gardé.
Le déclencheur `offload_comptes_garder_efface` empêche qu'un import ou une saisie réécrive le compte. L'action est au
journal, sans les données effacées. Pas de DELETE. Test : `omega/tests/offload/c4_19_effacement.sql` (10 assertions). Banc local : 44 tests, 422 ok.

## Lot c4_18 — envoi automatique par défaut, « modèle 2 » (18/10)

Teo (relayé à 21 h 20 Z, confirmé dans la session : « offload a le droit de répondre automatiquement ») : les messages
d'OFFLOAD partent sans validation par défaut, sauf doute ou sujet non autorisé ; réglable par organisation. Un message
par trimestre et la quarantaine de 90 jours restent.

`omega/modules/offload/migrations/c4_18_envoi_automatique.sql` :
- `offload_reglages.envoi_auto` (vrai par défaut) et `sujets_auto` (reprise, echeance, affaire), via `offload_regler` ;
- le message part par `private.offload_envoyer` : seul quand l'accord permanent du socle (politique offload / envoi.email)
  est actif ; sinon « À valider » comme avant ;
- `private.offload_retenue` : envoi automatique éteint, sujet non autorisé, compte à vérifier, adresse générique,
  moins de trois achats (reprise) → demande « offload.message_retenu » à laquelle l'envoi s'adosse ; une personne décide ;
- `public.offload_donner_accord_auto` (gérant/admin, une personne), `offload_revoquer_accord_auto`, `offload_envoi_auto` ;
  éteindre `envoi_auto` révoque l'accord.
Redéfinitions : `offload_preparer_message`, `offload_echeances_cycle`, `offload_relancer_affaire`, `offload_regler`.
Test : `omega/tests/offload/c4_18_envoi_automatique.sql` (19 assertions). Banc local : 43 tests, 412 ok.
Attention : entre 22 h et minuit Z, les tests c4 qui comparent current_date (UTC) aux dates de Paris tombent ; lancer
la suite hors de cette heure, ou la session en Europe/Paris.

## Lot c4_17 — restitution des données OFFLOAD d'une organisation (18/10)

`omega/modules/offload/migrations/c4_17_restitution.sql` : `public.offload_restitution(p_client uuid)` rend en un seul
JSON toutes les lignes OFFLOAD de l'organisation (seize tables, sans `client_id`) et les lignes `offload.%` du journal
opposable, avec un résumé des comptes par table. Gérant ou admin seulement ; la restitution est elle-même au journal
(`offload.restitution`) et ne modifie rien. L'effacement reste au socle. Aucun mode d'envoi touché.

Test : `omega/tests/offload/c4_17_restitution.sql` (données fictives). Banc local : 42 tests, 393 ok.
À ajouter à a5_01 : `offload_restitution(p_client uuid)`.

## Lot c4_16 — un message par compte et par trimestre (décision de Teo, 17/10)

`omega/modules/offload/migrations/c4_16_un_message.sql` :
- une reprise envoie un seul message écrit, par un seul canal (c4_12), et la quarantaine de 90 jours est gardée ;
- `offload_reglages.relance_ecrite` est éteint par défaut (`offload_regler` le rallume). Éteint, un message sans réponse
  après le délai de relance clôt la reprise (« sans_reponse »).

Redéfinitions : `offload_cycle`, `offload_regler`. Tests : `omega/tests/offload/c4_16_un_message.sql` (5 assertions).
`test_c4_03_cycle` allume la relance avant d'éprouver la séquence à deux messages. Banc local : 41 tests, 387 ok.

Ligne 12 du catalogue (« deux messages en tout ») : elle n'est plus le comportement par défaut. Son libellé est à revoir
par le coordinateur ou Teo ; c'est un fichier public, je n'y touche pas. `atteste` réel : 11 et 38 prouvées, 15 fausse
tant que la messagerie (A2) n'est pas branchée.

## Lot c4_15 — le message de reprise s'ancre aussi sur l'échéance qui revient (15/10)

`omega/modules/offload/migrations/c4_15_message_et_echeance.sql` répond au chiffrage n° 25, la carte « Chaque client
reçoit son propre message ». Le premier message d'une reprise reprend déjà la dernière ligne de facturation. Il ajoute
désormais l'échéance du compte, quand il en a une :
- échéance dans les deux mois, hors semaine qui vient : « L'entretien de votre Four à sole (Fournil) est à refaire
  d'ici le … : souhaitez-vous que nous convenions d'un créneau ? » ;
- échéance tombée sans intervention : même phrase, au passé.

Aucun créneau n'est fixé à la place du client. Une échéance de la semaine a déjà son propre message (c4_07) : elle
n'est pas répétée. Redéfinition par copie : `offload_message`.

**Tests** : `omega/tests/offload/c4_15_message_et_echeance.sql` (3 assertions). Banc local : 40 tests, 382 ok.

## Lot c4_14 — chantiers réceptionnés et missions closes (15/10)

`omega/modules/offload/migrations/c4_14_chantiers_et_missions.sql` : deux modèles d'export, avec `declarer_jeu` sur les
branchements existants :
- « chantiers » : code client, référence, date de réception, libellé, montant HT ;
- « missions » : code client, référence, date de clôture, libellé, honoraires.

Chaque ligne devient un passage du compte dans `offload_achats` (nature « commande », libellé « Chantier « … »
réceptionné » ou « Mission « … » close »). La détection (silence au-delà du délai fixé) et le message (« je retrouve
votre … ») s'appuient dessus. Le montant n'est pas compté deux fois : 0 € si une pièce de même référence existe déjà.
Chiffrage n° 34 (bâtiment) et 35 (conseil).

**Tests** : `omega/tests/offload/c4_14_chantiers_et_missions.sql` (5 assertions). Banc local : 39 tests, 379 ok.

## Lot c4_13 — le dernier contact lu dans vos outils, la remise dans le circuit en un geste (15/10)

`omega/modules/offload/migrations/c4_13_contacts_et_remise.sql` :
- **Contacts importés** (chiffrage n° 62). Un modèle d'export « contacts » (code client, date, canal, par, note) est
  posé, et `declarer_jeu` l'ajoute aux branchements existants. `offload_appliquer_releve` l'écrit dans
  `offload_contacts` (colonnes `source`, `jeu_id`, `cle`, sans doublon au réimport) ; `dernier_contact` suit. Le compte
  contacté récemment sort de la vague en cours, par la quarantaine de c4_05.
- **Remise dans le circuit** (n° 73). Remettre en « suivi » un compte retiré à sa demande lève aussi, dans le même geste,
  l'opposition du socle sur son adresse (`private.lever_opposition`). Le geste reste réservé au gérant ou à l'admin,
  avec un motif (`offload_changer_statut`).

**Tests** : `omega/tests/offload/c4_13_contacts_et_remise.sql` (`test_c4_13_contacts_importes`,
`test_c4_13_remise_dans_le_circuit`). Banc local : 38 tests, 374 ok. À vérifier sur la recette :
`private.lever_opposition` accepte bien l'appel d'un gérant à travers la porte OFFLOAD (son corps n'est pas dans les
extraits).

## Lot c4_12 — un seul canal à la fois, et la vague de la semaine (15/10)

`omega/modules/offload/migrations/c4_12_canal_et_vague.sql` :
- **Un seul canal à la fois** (chiffrage n° 41) : une reprise passe par un message ou par un appel, jamais les deux.
  La tâche d'appel n'est posée que si le message ne part pas : pas de courriel, message retenu par une règle ou
  bloqué par le socle. Elle l'est aussi plus tard, quand un message ne part finalement pas (bloqué, annulé, expiré,
  en échec, non remis ; `offload_suivre_envoi`).
- **La vague de la semaine** (n° 51, 52) : `offload_reglages.vague_jour`, de 1 (lundi) à 7 (dimanche), réglable par
  `offload_regler`. Vide, la vague passe chaque jour, comme avant. Les nouvelles reprises ne s'ouvrent que ce jour-là :
  préparées la nuit, prêtes à valider au matin. Le socle n'a pas d'envoi à heure fixe : le message part à la
  validation, dans les plages horaires du socle. Les relances, les échéances et les retraits gardent leur calendrier.
- Redéfinitions par copie : `offload_ouvrir`, `offload_suivre_envoi`, `offload_cycle`, `offload_regler`.

**Tests** : `omega/tests/offload/c4_12_canal_et_vague.sql` (`test_c4_12_canal_unique`,
`test_c4_12_vague_de_la_semaine`). Assertions mises à jour, dont l'ancienne règle « message et appel » :
- `test_c4_03_cycle` : l'appel est vérifié sur le compte sans courriel, et aucun appel n'accompagne un message ;
- `test_c4_04_lectures` : aucune tâche servie quand le message part.

Banc local : 36 tests, 368 ok.

**Ordre de pose** : `c4_12_canal_et_vague.sql`, puis les tests c4_03 et c4_04 (fichiers modifiés), puis c4_12.

**Pour Teo** : « un message par trimestre au plus » (n° 17, 40) contredit la ligne 12 du catalogue, elle aussi sur la
page (« deux messages en tout »). Le code ne peut pas tenir les deux : la quarantaine de 90 jours donne une séquence par
trimestre, pas un message. Il faut choisir laquelle des deux phrases vaut.

## Lot c4_11 — impayés : un compte en litige ou en retard sort de la vague commerciale (15/10)

`omega/modules/offload/migrations/c4_11_impayes.sql` : `private.offload_impaye(compte)` lit CASHD (même organisation,
même code client), dynamiquement : OFFLOAD se pose sans CASHD. Trois cas écartent le compte :
- compte CASHD en litige ou en recouvrement ;
- facture en litige ;
- facture échue non réglée (`cashd_factures_etat.retard_jours > 0`).

Redéfinitions par copie :
- `offload_ecarte` donne la raison « Impayé : … ne se croisent jamais. » avant toute reprise ou échéance ;
- `offload_interpreter_regle` rend la règle « litige » applicable (les règles déjà écrites sont mises à jour).

Le rappel de retrait d'une affaire n'est pas commercial et part quand même. Promesses tenues : « Jamais un compte en
litige », cas tordu « le compte a une facture en retard » (chiffrage n° 19, 23, 69).

**Tests** : `omega/tests/offload/c4_11_impayes.sql` (`test_c4_11_impayes`, 6 assertions ; insère un compte et des
factures CASHD sur le banc, annulés par runtests). Une assertion de `test_c4_10_lecture_des_regles` accepte désormais la
règle « litige » appliquée. Banc local : 34 tests, 361 ok.

**Ordre de pose** : `c4_11_impayes.sql`, puis les tests c4_10 (fichier modifié) et c4_11.

## Lot c4_10 — règles en français, coupe-circuit, réponses automatiques, raison sociale mère (11/10)

`omega/modules/offload/migrations/c4_10_regles_et_garde_fous.sql` :

- **Règles (ligne 11)** : `public.offload_regles` (RLS, lecture dans l'organisation). Le client écrit une phrase
  (`offload_ecrire_regle`) ; `private.offload_interpreter_regle` la lit sans modèle de langue et répond en une phrase.
  Familles comprises :
  - mot ou sujet interdit, montant interdit, tutoiement, longueur maximale ;
  - formule d'appel, signature ;
  - exclusion d'un secteur, d'un commercial ou d'un groupe (elle crée l'exclusion ; retirer la règle la lève) ;
  - litige : comprise, mais dit « pas encore applicable » (CASHD).

  Hors de ces familles : « non comprise », dite comme telle. Chaque message (reprise, échéance, retrait) passe par
  `private.offload_regles_appliquer` : les formes sont appliquées, un message qui enfreint une règle est **retenu**
  (motif écrit, tâche d'appel, journal `offload.message_retenu`).
- **Coupe-circuit (ligne 38)** : `private.offload_surveiller` arrête OFFLOAD dans trois cas :
  - plus de `seuil_non_remis_pct` (20 %) de messages non remis sur 7 jours, sur 5 au moins (statut `echec` ou
    `envois.remise` rebond, plainte, refus) ;
  - deux messages du même genre à la même adresse en 24 h ;
  - un volume du jour au-delà de trois fois le plafond.

  Une fois arrêté : messages en attente annulés (`annuler_envoi`), alerte critique, rien n'est préparé (cycles,
  échéances, affaires, ouverture à la main). Seuls un gérant ou un admin relancent (`offload_reprendre`, motif
  obligatoire) ; on suspend aussi à la main (`offload_suspendre`). La surveillance passe chaque nuit et à chaque
  message non remis.
- **Réponses automatiques** : `private.offload_reponse_auto` sépare l'absence (la séquence continue, journal
  `offload.reponse_auto`) du départ. Un départ met le compte « à réattribuer », clôt la reprise en `abandon` et crée
  la tâche « Trouver le nouvel interlocuteur » ; le système ne devine pas le successeur. Une citation dans une vraie
  réponse n'est pas prise pour une réponse automatique.
- **Message non remis** : le compte passe « à vérifier » (`offload_comptes.verification`). Il ne repart dans aucune
  vague (`offload_ecarte`) ; ses affaires passent par l'appel. La vérification se lève par `offload_lever_verification`.
- **Raison sociale mère (ligne 6)** : `public.offload_groupes` donne, par groupe, les comptes, le chiffre sur 12 mois,
  la valeur, le pire signal, les reprises, les échéances et les affaires. Les comptes qui partagent un domaine de
  courriel professionnel sont proposés au rattachement ; porte `offload_rattacher_groupe`.
- Redéfinitions par copie : `offload_ecarte`, `offload_cycle`, `offload_preparer_message`, `offload_ouvrir`,
  `offload_echeances_cycle`, `offload_relancer_affaire`, `offload_affaires_cycle`, `offload_suivre_envoi`,
  `offload_lire_reponse`, `offload_detecter_tout`, `offload_regler`.
- Écran :
  - carte « Garde-fous et règles des messages » : bandeau d'arrêt, relancer / suspendre, règles avec la réponse du
    système ;
  - carte « Groupes clients » ;
  - dans la fiche, le bandeau « À vérifier / À réattribuer » avec « Lever la vérification », et le groupe du compte.

**Tests** : `omega/tests/offload/c4_10_regles_et_garde_fous.sql`, cinq tests :
- `test_c4_10_lecture_des_regles`, `test_c4_10_regles_appliquees` ;
- `test_c4_10_coupe_circuit` : les rebonds passent par `private.noter_remise` sous l'ouvrier, jamais par une écriture
  directe dans `envois` ;
- `test_c4_10_reponses_automatiques`, `test_c4_10_groupes`.

Banc local : 33 tests, 355 assertions vertes, migrations posées deux fois.

**À inscrire dans `a5_01`** : `offload_ecrire_regle(p_client uuid, p_texte text)`, `offload_retirer_regle(p_regle uuid)`,
`offload_suspendre(p_client uuid, p_motif text)`, `offload_reprendre(p_client uuid, p_motif text)`,
`offload_lever_verification(p_compte uuid, p_motif text)`, `offload_rattacher_groupe(p_comptes uuid[], p_groupe text)`.

## Lignes de capacité (`lib/produits/capacites/reprise.ts`, 45 lignes) — tenue et preuve

Recette du 06/10, 17 h 10 Z (coordinateur) : `^test_(b3_|c4_|b4_24_|b6_16_)` → 834 ok, 0 not ok ; migrations
c4_01 à c4_06 posées ; `banc_offload.sql` joué (essai, branché, jeux « clients, ventes ») ; écran fusionné dans main.
Le fichier compte 45 lignes (8+8+8+8+7+6), et non 46 comme l’audit l’indiquait. Bilan au 06/10 après c4_08 (recette 19 h 05 Z) : **36 prouvées sur la recette**, 5 construites par c4_09 à poser
(40, 42 à 45), 4 partielles (6, 11, 15, 38). Rien n'est basculé `atteste: true` par moi ; c'est au coordinateur. Les lignes prouvées se voient à
l'écran /espace/offload (liste par priorité avec la raison, fiche, reprise, tâches, doublons, reprise en main, contact).

| # | Ligne | État | Preuve |
|---|---|---|---|
| 1 | Le système croise votre historique de facturation et le référentiel clients de votre CRM. | **prouvée (recette)** | test_c4_01_import |
| 2 | Chaque compte est classé par la date de son dernier contact, au-delà d'un seuil que vous fixez. | **prouvée (recette)** | test_c4_02_detection (seuil `delai_silence_jours`, dernier achat) ; test_c4_05_exclusions (`dernier_contact`) |
| 3 | La fréquence d'achat habituelle d'un compte est mesurée, puis son décrochage détecté. | **prouvée (recette)** | test_c4_02_detection |
| 4 | Les comptes sont priorisés par valeur attendue, pas par ordre alphabétique. | **prouvée (recette)** | test_c4_02_detection (« le premier de la liste est celui qui pèse le plus ») ; test_c4_04_lectures |
| 5 | Les doublons de fiches sont rapprochés quand deux lignes désignent le même client. | **prouvée (recette)** | test_c4_05_doublons |
| 6 | Les entités d'un même groupe client sont regroupées sous une raison sociale mère. | **prouvée (recette)** | test_c4_10_groupes (consolidé par groupe, rattachement proposé par domaine de courriel) ; carte « Groupes clients » |
| 7 | Un tableur sans colonne de date est exploité à partir des dates de facture. | **prouvée (recette)** | test_c4_01_import ; test_c4_02_detection (`sans_achat` présenté à part) |
| 8 | Les contrats et les équipements installés sont suivis jusqu'à leur échéance. | **prouvée (recette)** | test_c4_07_echeances, test_c4_07_contrats_et_parc |
| 9 | Chaque message reprend la dernière prestation du compte et le temps écoulé depuis. | **prouvée (recette)** | test_c4_03_message |
| 10 | Un compte sans réponse reçoit un second message, puis il sort du cycle. | **prouvée (recette)** | test_c4_03_cycle |
| 11 | Les règles de ton et de contenu s'écrivent en français, sans case à cocher. | **prouvée (recette)** | test_c4_10_lecture_des_regles, test_c4_10_regles_appliquees (lecture déterministe, sans modèle de langue ; la rédaction libre reste au chiffrage) |
| 12 | Un compte reçoit deux messages en tout, espacés d'au moins trois jours. | **prouvée (recette)** | test_c4_03_cycle (« deux messages en tout, jamais un troisième » ; contrainte `delai_relance_jours` ≥ 3) |
| 13 | Une réponse, même négative, arrête la séquence et vous rend la conversation. | **prouvée (recette)** | test_c4_03_reponse |
| 14 | Les comptes déjà contactés par un commercial sont écartés de la vague en cours. | **prouvée (recette)** | test_c4_05_exclusions |
| 15 | Les messages partent par courriel, depuis la boîte de votre entreprise. | partielle | OFFLOAD prépare des courriels validés ; la boîte de l'entreprise dépend de l'expéditeur du socle (A2 : Gmail / Microsoft 365 pas branchés) ; rien n'est parti en réel |
| 16 | Les vagues s'enchaînent au rythme convenu, et chaque exécution laisse son bilan. | **prouvée (recette)** | test_c4_03_cycle (bilan `offload.cycle`) ; test_c4_05_exclusions (bilan des écartés) |
| 17 | Les entretiens, révisions et contrôles périodiques sont suivis jusqu'à leur échéance. | **prouvée (recette)** | test_c4_07_echeances |
| 18 | Chaque échéance est datée à partir de la dernière intervention enregistrée. | **prouvée (recette)** | test_c4_07_echeances, test_c4_07_import_et_groupe |
| 19 | Le client est prévenu la semaine qui précède, pas le jour où l'échéance tombe. | **prouvée (recette)** | test_c4_07_echeances (J-5 → message ; J → rien) |
| 20 | Une échéance déjà honorée ailleurs sort du cycle dès que la date est connue. | **prouvée (recette)** | test_c4_07_echeances |
| 21 | Les contrats d'entretien qui s'éteignent faute de reconduction sont signalés. | **prouvée (recette)** | test_c4_07_contrats_et_parc |
| 22 | Les équipements installés sont rattachés au compte qui les exploite. | **prouvée (recette)** | test_c4_07_import_et_groupe |
| 23 | Un parc réparti sur plusieurs sites se lit site par site et en consolidé. | **prouvée (recette)** | test_c4_07_contrats_et_parc (offload_parc) |
| 24 | Les échéances réglementaires sont distinguées des échéances commerciales. | **prouvée (recette)** | test_c4_07_echeances |
| 25 | Les commandes arrivées qu'aucun client n'est venu reprendre sont listées. | **prouvée (recette)** | test_c4_08_cycle (liste, jours, compte) ; test_c4_08_import |
| 26 | Les interventions terminées et non retirées sont relancées après le délai que vous fixez. | **prouvée (recette)** | test_c4_08_inactif_et_reponse (intervention relancée) ; test_c4_08_cycle (délai `delai_retrait_jours`, rien avant) |
| 27 | Le stock immobilisé par une commande non reprise est chiffré. | **prouvée (recette)** | test_c4_08_cycle (total HT de la liste, point du matin) |
| 28 | Une pièce commandée pour un compte inactif est rattachée à sa fiche. | **prouvée (recette)** | test_c4_08_inactif_et_reponse (`offload_affaires_compte`, compte éteint prévenu quand même) |
| 29 | Les affaires closes sans suite sont distinguées de celles qui attendent encore. | **prouvée (recette)** | test_c4_08_cycle (`close_sans_suite` compté à part) ; test_c4_08_import (« plus vue », jamais close d'office) |
| 30 | Un compte relancé deux fois sans réponse passe en décision manuelle. | **prouvée (recette)** | test_c4_08_cycle (deux relances, puis décision avec le montant ; jamais de troisième) |
| 31 | La relance de retrait ne porte aucune mention de paiement, qui relève de CASHD. | **prouvée (recette)** | test_c4_08_cycle (aucun paiement, prix, montant, €, facture, règlement) |
| 32 | Le magasin voit en une liste ce qui dort et depuis combien de temps. | **prouvée (recette)** | test_c4_08_cycle (la plus ancienne en tête, jours d'attente) |
| 33 | Un compte suivi en direct par un commercial est exclu du cycle automatique. | **prouvée (recette)** | test_c4_05_reprise_en_main ; test_c4_03_cycle |
| 34 | Le commercial en charge reprend la main sur un compte d'un seul geste. | **prouvée (recette)** | test_c4_05_reprise_en_main |
| 35 | Aucun prix ni aucun délai n'est avancé dans un message sans que vous l'ayez écrit. | **prouvée (recette)** | test_c4_03_message |
| 36 | Une demande d'arrêt vaut retrait immédiat et définitif du cycle. | **prouvée (recette)** | test_c4_03_reponse |
| 37 | Les listes d'exclusion se tiennent par compte, par secteur et par commercial. | **prouvée (recette)** | test_c4_05_exclusions |
| 38 | Le système s'arrête de lui-même au premier doute, et vous le signale. | **prouvée (recette)** | test_c4_10_coupe_circuit (non remis au-delà du seuil, double message, volume ; annulation des messages en attente, alerte critique, relance par un gérant) |
| 39 | Chaque message parti reste au journal, daté et consultable. | **prouvée (recette)** | test_c4_03_cycle (recette 17 h 25 Z, 1120 ok) |
| 40 | Le chiffre d'affaires remis en jeu se lit vague par vague. | **prouvée (recette)** | test_c4_09_pilotage (vague du jour : comptes, en jeu, réponses, commandes, chiffre repris) |
| 41 | Les comptes réactivés sont suivis jusqu'à leur première commande. | **prouvée (recette)** | test_c4_03_issues |
| 42 | Le taux de réponse se compare par segment, par canal et par message. | **prouvée (recette)** | test_c4_09_pilotage (segment, canal, message, niveau) |
| 43 | Les échéances honorées et les commandes reprises alimentent un tableau de suivi. | **prouvée (recette)** | test_c4_09_pilotage (suivi du mois) |
| 44 | Les résultats se lisent par entité, par site et en consolidé. | **prouvée (recette)** | test_c4_09_pilotage (site, entité, consolidé) |
| 45 | Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe. | **prouvée (recette)** | à la demande : bouton « Exporter vers un tableur » de chaque onglet (CSV) ; à date fixe : test_c4_09_arretes (arrêté mensuel) |

Toutes les lignes sont construites. Les cinq de « Pilotage » (40, 42 à 45) sont prouvées sur la recette (c4_09, 21 ok).
Partielles : 6, 11, 15, 38.

## Journal

- 06/10 — prise de poste. Lecture : AUDIT-PROMESSES § 1, `app/page.tsx` (accroche OFFLOAD), `lib/produits/reprise.ts`,
  `lib/produits/capacites/reprise.ts` (46 lignes), SOCLE-EXTRAITS-COMMUN (relevés, jeux, instantanés, travaux,
  journal), NOTES-A1 (lecteur-exports), migrations Tiroma et Daliro pour les conventions.
- 06/10 — palier 1 écrit, vérifié sur le banc local (pose ×2, 62 assertions vertes), poussé sur `worker-c4` (7c8c520), envoyé au coordinateur.
- 06/10 — palier 2 (détection) écrit et vérifié sur le banc local, poussé (ce6cd3c), envoyé au coordinateur.
- 06/10 — palier 3 (reprise) poussé (376387e), envoyé au coordinateur.
- 06/10 — palier 4 (écran) poussé (963b991), envoyé au coordinateur.
- 06/10 — palier 5, lot c4_05 (garde-fous, doublons) poussé (621e1af).
- 06/10 — c4_01 refusé à la pose (clé facultative) : corrigé ; Q2, Q3, Q4 appliqués (f99562d).
- 06/10 — coordinateur : c4_01 à c4_05 et leurs tests POSÉS sur la recette (f99562d) ; test 44 sans aucune fonction C4.
- 06/10 — c4_06 (source « contrat ») poussé (1421d9f).
- 06/10, 17 h 10 Z — recette verte (834 ok, 0 not ok), banc posé, écran fusionné dans main (23a5bd9). Assertion « message parti au journal » ajoutée (222 vertes en local).
- 06/10, 17 h 25 Z — recette : ligne 39 prouvée (1120 ok, 0 not ok) ; 19 lignes prouvées. Ordre du coordinateur : échéances, puis affaires en plan, puis pilotage.
- 06/10 — lot c4_07 (échéances et renouvellements) : 23 tests, 252 assertions vertes en local ; écran recetté.
- 06/10 — recette : 8 tests verts sur 19. Cause principale, dans MES tests : `throws_ok(sql, code, 'phrase')` — à trois
  arguments, pgTAP lit le 3e comme le message d'erreur attendu. Tous les appels passent à
  `throws_ok(sql, code, null, 'description')` ; le pgTAP factice local imite désormais ce comportement (il
  reproduisait les 20 rouges avant correction). Consentement : corrigé par c4_06. `test_c4_03_issues` n°4 : sur le
  banc, la ligne d'organisation garde le mode effectif en essai ; le test lit le mode effectif et vérifie la règle
  dans les deux cas. Local : 20 tests, 221 assertions vertes.
- 06/10 — c4_07 posé et vert sur la recette (lignes 8, 17 à 24 prouvées). Lot c4_08 (affaires restées en plan) : 26 tests,
  294 assertions vertes en local ; écran recetté.
- 06/10, 19 h 05 Z — recette : c4_08 posé et vert (860 ok), lignes 25 à 32 prouvées. Lot c4_09 (pilotage) : 28 tests,
  312 assertions vertes en local ; écran recetté.
- 06/10, 20 h 45 Z — c4_09 vert sur la recette (21 ok) ; pause demandée par Teo à 21 h Z, section REPRISE écrite.
- 11/10 — reprise sur ordre de Teo. Lot c4_10 (lignes 6, 11, 38, réponses automatiques, comptes à vérifier) : 33 tests, 355 assertions vertes en local.
- 11/10, 14 h 10 Z — recette : c4_10 entièrement vert ; lignes 6, 11 et 38 prouvées (44 sur 45).
- 15/10 — reprise. Lot c4_11 (impayés lus dans CASHD) : 34 tests, 361 ok en local.
- 15/10 — lot c4_12 (canal unique, vague de la semaine) : 36 tests, 368 ok en local.
- 15/10 — lot c4_13 (contacts importés, remise dans le circuit en un geste) : 38 tests, 374 ok en local.
- 15/10 — lot c4_14 (chantiers réceptionnés, missions closes) : 39 tests, 379 ok en local.
- 15/10 — lot c4_15 (message de reprise ancré sur l'échéance qui revient) : 40 tests, 382 ok en local.
- 15/10, 12 h 32 Z — recette : c4_01 à c4_15 verts (c4_09 compris après 1dcd066d). Question « un message par trimestre » transmise à Teo.
- 17/10 — lot c4_16 (un message par trimestre, relance écrite éteinte par défaut) : 41 tests, 387 ok en local.
- 18/10, 21 h 30 Z — reprise (coordinateur) : lot c4_17 (restitution des données) : 42 tests, 393 ok en local.
- 18/10, 21 h 35 Z — c4_17 : la date du journal opposable s'appelle survenu_le (recette : 42703) ; corrigé, local 393 ok.
- 18/10, 22 h Z — lot c4_18 (envoi automatique par défaut, modèle 2) : 43 tests, 412 ok en local (session en Europe/Paris).
- 19/10 — lot c4_19 (effacement des données d'une personne) : 44 tests, 422 ok en local.
- 19/10, 14 h 50 Z — reprise ; écran c4_20 (envoi automatique, données, effacement) : build vert, cinq largeurs.
- 19/10, 14 h 40 Z — recette c4_18 : 42501 au révoquer (le socle exige une personne gérante) ; le test éteint désormais en gérant. Local 422 ok.
- 19/10, 14 h 36 Z — recette : c4_18 et c4_19 verts. La liste de Teo est couverte ; restent ses décisions.
- 19/10, 16 h 30 Z — reprise (bureau) : lot c4_21 (réécriture par règles écrites) : 45 tests, 430 ok en local.
- 19/10 — lot c4_22 (branche Gmail, brouillons déposés) : 46 tests, 435 ok en local.
- 19/10 — point 7 : script d'import des personnes morales écrit, testé sur un fichier fictif ; non lancé sur la vraie liste (garde).
- 21/10 — lot c4_23 (correctifs T-OFFLOAD : essai sans réglage, litige à l'ouverture manuelle) : rouge avant, vert après ; 441 ok.
- 21/10 — lot c4_24 (TOFFLOAD-05, saisie idempotente, réparation des doublons) : 449 ok.
- 21/10 — lot c4_25 (TOFFLOAD-06, clôture sur commande partout, message annulé) : 454 ok.
- 21/10 — lot c4_26 (TOFFLOAD-04, effacement jusqu'au bout) : 461 ok.
- 21/10 — lot c4_27 (TOFFLOAD-07, retenue annulée avec sa reprise) : 465 ok.
- 21/10 — lot c4_28 (TOFFLOAD-08, réglages hors bornes en français) : 471 ok.
- 21/10, 23 h 15 Z — lot c4_29 (décision « un cycle par trimestre », TOFFLOAD-03) : 481 ok.
- 21/10, 23 h 20 Z — recette c4_29 : 8/10, le cycle n'avait pas ouvert la reprise de TR3 (plafond de la vague du banc, probable) ; le test l'ouvre à la main.
- 21/10, 23 h 20 Z — lot c4_30 (date d'achat à Paris) ; tests 25, 27, 29 datés à Paris.
- 22/10, 19 h 15 Z — lot c4_31 (fuseau de l'organisation) : 490 ok.
- 22/10 — lot c4_32 (TOFFLOAD-09, 10 : reprises d'avant les règles, comptes effacés hors liste) : 496 ok.
- 23/10, 00 h 30 Z — lot c4_33 (affaires en plan : relance par une personne sans message, chiffrage) : 502 ok.
- 25/10, 01 h 20 Z — lot c4_34 (contrats à reconduction au tableau des échéances) : 505 ok.
- 25/10, 01 h 20 Z — lot c4_35 (TOFFLOAD-11) : 509 ok.
- 25/10, 01 h 25 Z — lot c4_36 (valeur par segment, restitution en tableur) : 513 ok.
- 26/10, 01 h 05 Z — test c4_08 : délai minimal du banc réglé à zéro dans le test (DELAI_MINIMAL de la recette, remises à la même seconde). Le conteneur a été recyclé : banc local et souche perdus, test non rejoué en local.
