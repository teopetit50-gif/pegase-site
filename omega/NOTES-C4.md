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

## Lignes de capacité (`lib/produits/capacites/reprise.ts`, 45 lignes) — tenue et preuve

Recette du 06/10, 17 h 10 Z (coordinateur) : `^test_(b3_|c4_|b4_24_|b6_16_)` → 834 ok, 0 not ok ; migrations
c4_01 à c4_06 posées ; `banc_offload.sql` joué (essai, branché, jeux « clients, ventes ») ; écran fusionné dans main.
Le fichier compte 45 lignes (8+8+8+8+7+6), et non 46 comme l’audit l’indiquait. Bilan : **18 prouvées sur la recette**, 1 prouvée en local (assertion à rejouer), 4 partielles, 22 non
construites. Rien n'est basculé `atteste: true` par moi ; c'est au coordinateur. Les lignes prouvées se voient à
l'écran /espace/offload (liste par priorité avec la raison, fiche, reprise, tâches, doublons, reprise en main, contact).

| # | Ligne | État | Preuve |
|---|---|---|---|
| 1 | Le système croise votre historique de facturation et le référentiel clients de votre CRM. | **prouvée (recette)** | test_c4_01_import |
| 2 | Chaque compte est classé par la date de son dernier contact, au-delà d'un seuil que vous fixez. | **prouvée (recette)** | test_c4_02_detection (seuil `delai_silence_jours`, dernier achat) ; test_c4_05_exclusions (`dernier_contact`) |
| 3 | La fréquence d'achat habituelle d'un compte est mesurée, puis son décrochage détecté. | **prouvée (recette)** | test_c4_02_detection |
| 4 | Les comptes sont priorisés par valeur attendue, pas par ordre alphabétique. | **prouvée (recette)** | test_c4_02_detection (« le premier de la liste est celui qui pèse le plus ») ; test_c4_04_lectures |
| 5 | Les doublons de fiches sont rapprochés quand deux lignes désignent le même client. | **prouvée (recette)** | test_c4_05_doublons |
| 6 | Les entités d'un même groupe client sont regroupées sous une raison sociale mère. | partielle | `groupe` lu dans les exports, plafond au groupe (test_c4_05_exclusions) ; pas de vue consolidée par raison sociale mère |
| 7 | Un tableur sans colonne de date est exploité à partir des dates de facture. | **prouvée (recette)** | test_c4_01_import ; test_c4_02_detection (`sans_achat` présenté à part) |
| 8 | Les contrats et les équipements installés sont suivis jusqu'à leur échéance. | **c4_07, à poser** | test_c4_07_echeances, test_c4_07_contrats_et_parc |
| 9 | Chaque message reprend la dernière prestation du compte et le temps écoulé depuis. | **prouvée (recette)** | test_c4_03_message |
| 10 | Un compte sans réponse reçoit un second message, puis il sort du cycle. | **prouvée (recette)** | test_c4_03_cycle |
| 11 | Les règles de ton et de contenu s'écrivent en français, sans case à cocher. | partielle | seule la signature se règle ; pas de règles de ton appliquées au message |
| 12 | Un compte reçoit deux messages en tout, espacés d'au moins trois jours. | **prouvée (recette)** | test_c4_03_cycle (« deux messages en tout, jamais un troisième » ; contrainte `delai_relance_jours` ≥ 3) |
| 13 | Une réponse, même négative, arrête la séquence et vous rend la conversation. | **prouvée (recette)** | test_c4_03_reponse |
| 14 | Les comptes déjà contactés par un commercial sont écartés de la vague en cours. | **prouvée (recette)** | test_c4_05_exclusions |
| 15 | Les messages partent par courriel, depuis la boîte de votre entreprise. | partielle | OFFLOAD prépare des courriels validés ; la boîte de l'entreprise dépend de l'expéditeur du socle (A2 : Gmail / Microsoft 365 pas branchés) ; rien n'est parti en réel |
| 16 | Les vagues s'enchaînent au rythme convenu, et chaque exécution laisse son bilan. | **prouvée (recette)** | test_c4_03_cycle (bilan `offload.cycle`) ; test_c4_05_exclusions (bilan des écartés) |
| 17 | Les entretiens, révisions et contrôles périodiques sont suivis jusqu'à leur échéance. | **c4_07, à poser** | test_c4_07_echeances |
| 18 | Chaque échéance est datée à partir de la dernière intervention enregistrée. | **c4_07, à poser** | test_c4_07_echeances, test_c4_07_import_et_groupe |
| 19 | Le client est prévenu la semaine qui précède, pas le jour où l'échéance tombe. | **c4_07, à poser** | test_c4_07_echeances (J-5 → message ; J → rien) |
| 20 | Une échéance déjà honorée ailleurs sort du cycle dès que la date est connue. | **c4_07, à poser** | test_c4_07_echeances |
| 21 | Les contrats d'entretien qui s'éteignent faute de reconduction sont signalés. | **c4_07, à poser** | test_c4_07_contrats_et_parc |
| 22 | Les équipements installés sont rattachés au compte qui les exploite. | **c4_07, à poser** | test_c4_07_import_et_groupe |
| 23 | Un parc réparti sur plusieurs sites se lit site par site et en consolidé. | **c4_07, à poser** | test_c4_07_contrats_et_parc (offload_parc) |
| 24 | Les échéances réglementaires sont distinguées des échéances commerciales. | **c4_07, à poser** | test_c4_07_echeances |
| 25 | Les commandes arrivées qu'aucun client n'est venu reprendre sont listées. | non construite | — |
| 26 | Les interventions terminées et non retirées sont relancées après le délai que vous fixez. | non construite | — |
| 27 | Le stock immobilisé par une commande non reprise est chiffré. | non construite | — |
| 28 | Une pièce commandée pour un compte inactif est rattachée à sa fiche. | non construite | — |
| 29 | Les affaires closes sans suite sont distinguées de celles qui attendent encore. | non construite | — |
| 30 | Un compte relancé deux fois sans réponse passe en décision manuelle. | non construite | — |
| 31 | La relance de retrait ne porte aucune mention de paiement, qui relève de CASHD. | non construite | — |
| 32 | Le magasin voit en une liste ce qui dort et depuis combien de temps. | non construite | — |
| 33 | Un compte suivi en direct par un commercial est exclu du cycle automatique. | **prouvée (recette)** | test_c4_05_reprise_en_main ; test_c4_03_cycle |
| 34 | Le commercial en charge reprend la main sur un compte d'un seul geste. | **prouvée (recette)** | test_c4_05_reprise_en_main |
| 35 | Aucun prix ni aucun délai n'est avancé dans un message sans que vous l'ayez écrit. | **prouvée (recette)** | test_c4_03_message |
| 36 | Une demande d'arrêt vaut retrait immédiat et définitif du cycle. | **prouvée (recette)** | test_c4_03_reponse |
| 37 | Les listes d'exclusion se tiennent par compte, par secteur et par commercial. | **prouvée (recette)** | test_c4_05_exclusions |
| 38 | Le système s'arrête de lui-même au premier doute, et vous le signale. | partielle | import douteux non appliqué et journalisé (test_c4_01_garde_fou) ; essai contre réel (test_c4_03_issues) ; verrous du socle. Pas un arrêt général du module |
| 39 | Chaque message parti reste au journal, daté et consultable. | **prouvée (local)** | test_c4_03_cycle — assertion ajoutée le 06/10 (17 h 30), verte en local, **à rejouer** sur la recette |
| 40 | Le chiffre d'affaires remis en jeu se lit vague par vague. | non construite | — |
| 41 | Les comptes réactivés sont suivis jusqu'à leur première commande. | **prouvée (recette)** | test_c4_03_issues |
| 42 | Le taux de réponse se compare par segment, par canal et par message. | non construite | — |
| 43 | Les échéances honorées et les commandes reprises alimentent un tableau de suivi. | non construite | — |
| 44 | Les résultats se lisent par entité, par site et en consolidé. | non construite | — |
| 45 | Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe. | non construite | — |

Non construites : les huit lignes « Échéances et renouvellements » et les huit « Affaires restées en plan » (moteur
CYCLE), le suivi des contrats et équipements, et quatre lignes de « Pilotage » (chiffre remis en jeu par vague,
taux de réponse par segment, tableau des échéances et commandes reprises, résultats par entité, export tableur).

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
