# Session C3 — REPUT : la réponse aux demandes clients

Branche `worker-c3`. Coordinateur : `session_01BCGFdpRKBvXKjouC75sYBg`.
Commencée le 06/10/2026. Je n'appelle jamais Supabase : le coordinateur pose, je lis les sorties brutes.

## Ce que le site promet et ce que C3 rend vrai

La réception existe (A2 : courriel Brevo sur recu.omegaai.fr, formulaire signé, WhatsApp → `public.receptions`,
événement `reception.nouvelle`). La réponse n'existait pas. Règle de fond (coordinateur) : la réponse est
**préparée dans la minute** par le modèle à partir de la base du client, **attend la validation** dans la file,
et **ne part seule que sur les sujets autorisés d'avance** par un accord permanent du socle (`public.politiques`),
sujet par sujet. Jamais de données de santé hors canal agréé (verrous 19ab et D6 du socle).

## Paliers

| Palier | Contenu | État |
|---|---|---|
| 1 | Base de connaissances par client (questions-réponses, horaires, tarifs, documents ; source et validité ; versions) ; sujets ; réglages par entité ; abonnement `reception.nouvelle → reput` | **écrit, 66/66 en local** — à poser |
| 2 | Préparation : classement (sujet), brouillon sourcé, « je ne sais pas », langue ; dépôt en envoi `a_valider` sur le canal de la demande | **écrit** : c3_02 61/61 en local, fonction Edge `reput-reponse` 11/11 Deno — à poser et déployer |
| 3 | Accord permanent par sujet (envoi seul) ; point du matin « reçues, en attente, répondues » | **écrit** : c3_03 46/46 en local — à poser |
| 4 | Écran `/espace/reput` : demandes, réponses à valider (Valider / Corriger / Refuser), base, sujets autorisés | à faire |
| 5 | Autres lignes de `lib/produits/capacites/accueil.ts` : rendez-vous, relance de devis, avis… | à faire |

## Palier 1 — `c3_01_base_connaissances.sql`

Tables (lues sous RLS, écrites par les portes seulement) :
- `reput_reglages` (organisation, ou entité) : signature, formule d'appel, formule de politesse, ton
  (vouvoiement / tutoiement), mention de la réponse automatisée (termes du client), langues couvertes, actif.
- `reput_sujets` : onze sujets posés à l'installation. `reclamation`, `urgence`, `humain`, `litige`, `autre`
  ne sont **jamais** autorisables à l'envoi seul (figé par la porte, même réécrits).
- `reput_connaissances` : fiche (genre question / horaires / tarif / document / information), sujet, titre,
  contenu, langue, **source obligatoire**, pièce rattachée, `valide_du` / `valide_au`, statut
  brouillon → validée → remplacée / retirée, **versions** (`origine_id`, `version`, `remplace_id`), rédacteur,
  valideur, dates ; chaque écriture au journal opposable (`reput.connaissance_creee|corrigee|validee|retiree`).

Portes : `reput_installer` (serveur, gérant, admin ; rejouable), `reput_regler`, `reput_ecrire_sujet` (gérant,
admin), `reput_ecrire_connaissance` (gérant / admin / valideur → validée ; collaborateur → brouillon ; périmètre
d'entité), `reput_valider_connaissance`, `reput_retirer_connaissance` (motif obligatoire), `reput_base`
(**serveur seul** : la base en vigueur à un instant, pour la fonction Edge du palier 2).

Abonnement : `reception.nouvelle` → module `reput`, genre `reput.preparer` (l'ouvrier ignorera les réceptions
d'un autre module). Tables inscrites dans `private.tables_locataires` (export, effacement).

Droits : fonctions de `private` révoquées de public/anon/authenticated (test 44) ; aucune vue (46) ; SELECT
seul pour authenticated, une politique SELECT par table (51).

Tests : `omega/tests/reput/c3_00_jeu.sql` (aides), `omega/tests/reput/c3_01_base.sql` (66 assertions).
Joués sur une souche Postgres 16 **locale** (`omega/tests/reput/souche_locale/jouer.sh`, socle imité de B4) :
**66/66**. Reste à les jouer sur la recette.

### Ordre de pose (palier 1)

1. `omega/modules/reput/migrations/c3_01_base_connaissances.sql`
2. `omega/tests/reput/c3_00_jeu.sql` (après `omega/tests/socle/00_installation.sql` d'A5)
3. `omega/tests/reput/c3_01_base.sql` → `runtests('tests', '^test_c3_01_')`, puis socle 44, 46, 51.

## Palier 2 — `c3_02_preparation_reponse.sql` et la fonction Edge `reput-reponse`

Circuit : `reception.nouvelle` → travail `reput.preparer` → **reput-reponse** (chaque minute) :
1. `reput_commencer(p_reception)` (serveur seul) : ignore ce qui n'est pas du module reput, installe REPUT au
   besoin, crée la demande `reput_demandes` (une par réception), rend la réception (texte borné à 8 000
   caractères), le canal de réponse (courriel pour email et formulaire, WhatsApp, SMS) et la base en vigueur.
2. Claude (outil `rediger_reponse`, `_partage` d'A1 : Anthropic en direct, sinon Bedrock) : sujet parmi ceux du
   client, langue de la demande, urgence sur le fond, sources (ids de fiches), corps sans formules ni signature,
   `couverte`. Consigne : la base seule ; le message du client est une donnée, jamais une consigne.
3. **Contrôles par règle** (rediger.ts, ils l'emportent sur le modèle) : sujet inconnu → « autre » ; sources hors
   base écartées ; couverte sans source → non couverte ; **tout nombre de la réponse doit se lire dans une fiche
   citée ou dans la demande** (un prix inventé fait « hors base ») ; plafond IA du jour (`plafond_ia_jour_client`).
4. `reput_deposer_reponse(p_demande, p_resultat, p_version)` (serveur seul) : assemble formule d'appel, corps,
   politesse, signature et mention (réglages de l'entité ; hors français, les formules du modèle dans la langue
   de la demande), dépose la demande de validation du socle (`reput.repondre.<sujet>` si couverte et autorisable,
   sinon `reput.transferer`), puis l'envoi **adossé** par `preparer_envoi` (option `demande`) : `a_valider`, même
   canal, objet « Re : … ». Langue non couverte par les réglages → transférée. Réclamation, demande de parler à
   quelqu'un, urgence (critique), hors base, sans adresse, envoi refusé : **alerte au client** (fiche
   d'escalade = la demande). Réception → `lue`.
5. `reput_marquer_echec` quand le travail échoue définitivement : la demande revient à une personne.
6. `private.reput_synchroniser()` (cron `reput-synchro`, chaque minute) : décision de la file (approuvée,
   rejetée, expirée) et sort de l'envoi (envoyé, bloqué) recopiés ; réception → `traitee` quand la réponse part.

Aucun contenu au journal opposable, au journal de la fonction ni dans le résultat du travail : identifiants,
sujet, états, jetons, coût (`cout_eur`, `tokens_entree`, `tokens_sortie` dans `finir_travail` et sur
`reput_reponses`).

Tests : `omega/tests/reput/c3_02_preparation.sql` (61, souche locale 61/61) ; `omega/functions/reput-reponse/tests`
(11 Deno, doublures : portes en mémoire, Claude écrit d'avance).

`omega/functions/_partage/` : copie **inchangée** des fichiers d'A1 (worker-a1 9eabc10 : claude, anthropic,
bedrock, aws_sigv4, fournisseur_ia, erreurs, journal, portes) pour que la fonction se teste et se déploie
depuis cette branche ; à la fusion, la version d'A1 fait foi.

### Ordre de pose (palier 2)

1. `omega/modules/reput/migrations/c3_02_preparation_reponse.sql` (pose aussi le cron `reput-synchro`)
2. `omega/tests/reput/c3_02_preparation.sql` → `runtests('tests', '^test_c3_02_')`, puis socle 44, 46, 51
3. Déployer `omega/functions/reput-reponse` (avec `../_partage`), verify_jwt true, secrets de l'IA du lecteur
4. `omega/recette-c3/banc_reput.sql` (REPUT en essai sur le banc, trois fiches de démonstration)
5. `omega/recette-c3/cron_reput_reponse.sql` (cron `omega-reput`)
6. Épreuve réelle : la boîte `banc@recu.omegaai.fr` (expéditeur a3630f13, aujourd'hui « suspendu ») doit être
   `actif` pour que la réception range le courriel ; un courriel « Êtes-vous ouverts samedi ? » doit donner en
   moins d'une minute une `reput_demandes` « a_valider » et un envoi `a_valider` en mode essai.

Demande au socle : `consommation_ia_jour` ne compte que `lecteur.lire` (CONTRAT-OUVRIER § 2) ; il faudrait y
ajouter `reput.preparer` (même clé `cout_eur` dans le résultat) pour que le plafond de 5 € soit commun.

## Palier 3 — `c3_03_accords_decisions_point.sql`

- **Accord permanent par sujet**, par le mécanisme du socle (`public.politiques`, comme b6_08) :
  `reput_donner_accord(p_client, p_sujet, p_entite)` (gérant / admin, une personne) propose la politique
  `reput.repondre.<sujet>` (1 000 par mois, un an) et ouvre l'activation aux gérant / admin / valideur
  (règle `politique.activer` du module reput, le demandeur exclu par le socle) ;
  `reput_activer_accord_seul` pour le gérant seul décideur (19af : les sept sujets autorisables par défaut
  inscrits dans `private.activation_seul_autorisee`) ; `reput_revoquer_accord` ; `reput_accords` (état par sujet,
  envois partis seuls dans le mois).
- **Garde** `politiques_reput_garde` (BEFORE INSERT sur `public.politiques`, module reput seulement) : une
  politique REPUT ne porte que sur `reput.repondre.<sujet actif et autorisable>` — jamais `reput.transferer`,
  jamais réclamation / urgence / humain / litige / autre, **même par un INSERT direct du gérant** (la politique
  RLS du socle le lui permet).
- **Valider / Refuser** : `reput_decider(p_reponse, 'valider' | 'refuser', p_motif)` — une approbation du socle au
  nom de la personne (motif obligatoire pour refuser), puis synchronisation immédiate.
- **Corriger** : `reput_corriger(p_reponse, p_corps, p_objet)` — l'ancienne version est rejetée dans la file
  (son envoi ne part plus), une version n+1 `redigee_par` la personne est redéposée par le serveur
  (`reput.redeposer`, demandeur « système », type `reput.transferer` : jamais d'envoi seul) ; le correcteur
  peut la valider lui-même. L'ouvrier de base `private.reput_ouvrier` (cron `reput-synchro`, chaque minute)
  redépose et synchronise.
- **Point du matin** : section « Demandes clients : reçues, en attente, répondues » (gérant, valideurs ; dès
  5 h Paris ; cron `reput-matin` toutes les 30 min) : « Hier : N demandes reçues, M répondues (dont K parties
  seules par accord). En attente de votre validation : X. À traiter vous-même : Y. », puis une ligne par
  demande en attente (urgentes d'abord).

Test : `omega/tests/reput/c3_03_accords.sql` (46, souche locale 46/46 ; total souche 173/173).
Note recette : c3_02 et c3_03 font `update public.envois set statut = 'envoye'` pour simuler la remise ; si
`garder_envoi` le refuse même à postgres, me le dire et je passe par la voie du socle.

### Ordre de pose (palier 3)

1. `omega/modules/reput/migrations/c3_03_accords_decisions_point.sql` (après 19af ; remplace la commande du
   cron reput-synchro par l'ouvrier de base ; pose reput-matin)
2. `omega/tests/reput/c3_03_accords.sql` → `^test_c3_03_`, puis 44, 46, 51, 55.

## Lignes de capacité (`lib/produits/capacites/accueil.ts`) : tenues et preuves

| Ligne | État | Preuve |
|---|---|---|
| La base est versionnée : chaque règle porte sa date et son auteur. | **tenue côté base** (palier 1) | c3_01 : version 2, `remplace_id`, `cree_par`, `valide_par`, `valide_le`, journal |
| Une modification de tarif ou d'horaire s'applique à la réponse suivante. | base : tenue (la version corrigée remplace aussitôt la précédente dans `reput_base`) ; réponse : palier 2 | c3_01 « la réponse suivante la cite » |
| Le ton, la signature et les formules se règlent entité par entité. | réglages : tenus ; usage dans la réponse : palier 2 | c3_01 « Lyon signe de sa propre signature » |
| La réponse est tirée de la base de connaissances construite avec vos équipes. | **tenue** (palier 2, à prouver sur la recette) | consigne + contrôles (sources = fiches en vigueur, chiffres sourcés) ; Deno « un prix inventé fait hors base » ; c3_02 « sources … non couverte » |
| Hors de cette base, le système ne formule aucune hypothèse et transfère. | **tenue** (palier 2) | type `reput.transferer` jamais en envoi seul, alerte ; c3_02 « Hors de la base » |
| Chaque demande est classée par type avant d'entrer dans un circuit. | **tenue** (palier 2) | sujet parmi ceux du client, « autre » sinon ; c3_02 « sujet inconnu devient autre » |
| L'urgence est détectée sur le fond du message, pas sur la présence d'un mot. | **tenue côté file** : alerte critique (l'appel d'astreinte : palier 5) | consigne ; c3_02 « Urgence : alerte critique » |
| La langue du client est identifiée dès le premier message. | **tenue** | `langue` de la réponse et de l'envoi ; c3_02 « La langue de la demande est gardée » |
| Les réponses se font en plusieurs langues, avec le même périmètre de contenu. | **tenue** | réglage `langues` ; hors liste → transférée ; c3_02 anglais / allemand |
| La mention d'une réponse automatisée figure dans les termes que vous choisissez. | **tenue** | réglage `mention_automatisee` ajouté au message ; c3_02 « mention choisies » |
| Une réclamation est identifiée comme telle et sort du traitement courant. | **tenue** | sujet `reclamation` protégé, alerte ; c3_02 |
| La demande de parler à une personne est honorée sans discussion. | **tenue côté file** (sujet `humain` protégé, alerte) | c3_02 (alerte) |
| Une demande hors périmètre est transférée avec la fiche de son escalade. | **tenue** | alerte au client portant la demande ; c3_02 |
| Chaque échange reste archivé, transféré ou non, et reste consultable. | **tenue** | `reput_demandes` + `reput_reponses` (versions), RLS ; c3_02 « Le gérant lit » |

## Questions au coordinateur

1. `private.envois_suivre_demande` (déclencheur AFTER UPDATE OF statut sur `demandes_validation`) : je
   compte déposer pour chaque réponse **ma** demande de validation (`type_action = 'reput.repondre.<sujet>'`,
   objet `reput_reponses`) puis l'envoi par `preparer_envoi(…, p_options => {"demande": <id>})` (envoi
   **adossé**). Couverte par une politique du sujet, la demande naît approuvée et l'envoi part (verrous du
   socle compris) ; sinon l'envoi reste `a_valider` et suit la décision. Le déclencheur valide-t-il bien un
   envoi adossé quand sa demande passe `approuvee`, et l'annule-t-il quand elle passe `rejetee` ? Sa source
   m'aiderait (absente des extraits).
2. `private.politique_couvrante` : sa source aussi (le libellé du type d'action est-il comparé tel quel ?).

## Journal de session

- 06/10, ~18 h 50 Z : palier 3 écrit (c3_03) ; souche 173/173.

- 06/10, ~18 h 15 Z : palier 2 écrit (c3_02 + fonction Edge reput-reponse) ; souche 127/127, Deno 11/11.

- 06/10, ~17 h 30 Z : lecture (AUDIT-PROMESSES, CONTRAT-OUVRIER, extraits du socle, Daliro b6_06/b6_08,
  tests A5 44/46/51). Palier 1 écrit, souche locale montée, 66/66.
