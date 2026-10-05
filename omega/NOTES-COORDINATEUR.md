# Notes du coordinateur — vagues 1 et 2

Tenu par le coordinateur (session chef). Les ouvriers A1 à A5 lisent ce
fichier ; Teo lit la session du coordinateur, pas celles des ouvriers.

## Recette `omega-recette` (ygwbgpowzlbdaajlsqkn) — état au 5 octobre 2026, 21 h

### Migrations posées aujourd'hui (par `execute_sql`, inscrites dans `schema_migrations`)

| Lot | Contenu |
|---|---|
| socle_lot17_portes_ouvrier | `prendre_travaux`, `battre_ouvrier` (public, service_role) |
| socle_lot18a/b/c/d | table `receptions`, portes `resoudre_boite` (canaux expediteurs + `formulaire` via `clients.config.boite_formulaire`), `deposer_reception`, `noter_remise` à 6 arguments (idempotente sur `envois_evenements.cle`) |
| socle_lot19a | `regles_validation` et `demandes_validation` : `exige_commentaire`, `exige_piece`, `exige_motif` (recopiés par `preparer_demande`) ; `approbations.piece_id` ; `public.annuaire(p_client)` |
| socle_lot19b | portes du lecteur `piece_a_lire`, `consommation_ia_jour`, `lire_parametre` ; réglage `plafond_ia_jour_client` = 5 dans `private.reglages` ; crons `omega-lecteur` et `omega-expediteur` ; extension `pgtap` ; politique Storage SELECT sur `omega-clients` pour les membres |
| socle_lot19c | `preparer_approbation` refuse le déposant (`payload.saisi_par`) et le délégant déposant : « Celui qui a saisi la pièce ne l'approuve pas » (42501) |
| socle_lot19d | droits par défaut retirés : `revoke all` de anon/authenticated sur `abonnements_modules`, `demandes_audit`, `receptions` et les 20 tables FILED des lots 4-6 ; `grant select` à authenticated là où une politique existe |
| socle_lot19e | `revoke truncate, references, trigger on all tables in schema public from anon, authenticated` + default privileges (TRUNCATE ignore la RLS) |
| socle_lot19f | `revoke insert, update` d'anon sur `audit_journal`, `catalogue_site`, `clients`, `lorani_echeances_permis`, `moteurs_reconnus`, `profils_metier`, `tamila_registre` |
| socle_lot19g | `private.canaux_envoi` : sms et whatsapp bornés pour le non-transactionnel à 08:00–20:00, lundi–samedi (confirmé par Teo le 5/10 à 22 h 10) |
| socle_lot19h | publication Realtime `supabase_realtime` : `demandes_validation`, `approbations`, `filed_documents`, `filed_factures`, `delegations`, `filed_controles`, `filed_historique`, `points_du_jour` (demandé par A3) |
| socle_lot19i | `private.fournisseurs_envoi` : Brevo `branche = true` sur la recette |
| a5_01_private_execute | EXECUTE sur `private` retiré à PUBLIC/anon/authenticated puis rendu à la liste requise (migration d'A5 + compléments c/d/e du coordinateur : fonctions des triggers SECURITY INVOKER de private, des vues de public lisibles, des CHECK/defaults). Résultat : authenticated 187/741, anon 0. Liste figée : `omega/a5_01_liste_figee.txt` |
| socle_lot19k | relevé par A3 en relecture réelle : des politiques RLS INSERT/UPDATE existaient sans GRANT pour authenticated (approbations, delegations, demandes_validation et 40 autres tables). Pour chaque politique de public visant authenticated, le GRANT correspondant est donné (75 grants, générés depuis pg_policies) ; les politiques restent juges |
| socle_lot19l | `revoke insert, update, delete` d'authenticated sur `clients`, `audit_journal`, `catalogue_site`, `moteurs_reconnus`, `profils_metier` (RLS actif, aucune politique d'écriture : grants sans objet) |
| socle_lot19m | politique `storage.objects` INSERT pour authenticated sur `omega-clients`, chemin `<client>/filed_document/…`, client ∈ `private.mes_clients()` (la SELECT existait depuis 19b, pas l'INSERT : le dépôt depuis l'espace était impossible) |
| socle_lot19n / 19o / 19p | Realtime vague 2 (grp_ref_*, grp_societes, lorani_permis*, delais) ; politique Storage INSERT membres sous `<client>/<objet_type>/…` ; vue `tamila_registre` : anon sans rien, authenticated SELECT seul (elle avait anon SELECT+DELETE) |
| banc_lot19q | entité principale du banc : territoire 'FR' (était NULL : Tiroma refusait d'installer) |
| socle_lot19r / 19s / 19t / 19u | compléments d'a5_01 trouvés en jouant B3 : 89 fonctions de trigger de private exécutables par authenticated (19r, précaution) ; fermeture transitive rejouée (19s, 0) ; fonctions des politiques/CHECK/defaults/vues (19t, 0) ; **fonctions dans la clause WHEN des triggers** (19u : `private.tiroma_trace_ecriture()` dans 23 triggers `tiroma_*_tracer`, « permission denied » sur un INSERT du gérant) |
| tiroma_b3_01 | B3 : portes tiroma_installer_cabinet / brancher / changer_mode exécutables par un gérant/titulaire avec contrôle de droits (worker-b3 da2fc7a). Tests B3 01–04 : 96/98 puis **98/98** après correction de B3 (tests.b3_compte en SECURITY DEFINER, attentes UPDATE/DELETE sous RLS = 0 ligne), rejoué sur Novasud le 5/10 à 22 h 40 Z |
| filed_lot7 (a4_10, 316697e) | identité du fournisseur : colonnes de verdict, filed_confirmer_fournisseur, filed_attester_identite, « indisponible » vaut 2 h. Test a4_05 vert. **Mais** le branchement de filed_completer_fournisseur_lu en tête de filed_controler_facture n'a pas pris (patch par repère) : F-2026-0413 dit toujours « Aucun SIREN » ; a4_11 (179fd13, corps complet) posé depuis le dépôt le 5/10 à 22 h 30 Z et vérifié par recontrôle de F-2026-0413 : identite.siren « SIREN lu … non vérifié », fournisseur_lu.non_verifie |
| tavaro_b2_01 / b2_02 (d8698d8) | séparation saisie/approbation (payload.saisi_par) ; relances des impayés (colonnes, portes, cron tavaro-relances 09:15 UTC). TOUT_B2 : 5 fichiers verts sur 11 (158 ok), 6 renvoyés (attente saisie_protegee, cast smallint, emails en doublon dans le jeu, alertes sans colonne module) |
| varelo_b1_01 (3c6561f) | rôles exigés sur grp_installer / deposer_codes / rapprocher / appliquer_decisions. Tests B1 : 14/14 morts sur tests.role_admis manquante (aide de B1 non définie), renvoyé |
| identite_b7_01 (e4fd65f) | B7 : cache identites_registre, déclencheur sur filed_verifications_tiers → travail identite.verifier, portes identite_a_verifier / noter_identite / identite_relancer. Tests 7/8 verts (test 08 et scénario : cast jsonb manquant, renvoyé). V2 158277d reposée le 5/10 à 22 h 50 Z : toujours 7/8, test 08 et scénario butent sur deux contraintes d'A4 — `filed_fournisseurs_identite_source` n'admet que sirene/vies/humain (B7 y mettait la source d'ouvrier) et `filed_documents_piece_key` UNIQUE (piece_id). Forme du verdict d'A4 envoyée à B7 ({resultat, identifiant, registre, preuve}), v3 attendue. Fonction Edge `identite` v1 déployée en coquille, cron omega-identite chaque minute (lot 19v). Secret SIRENE_API_KEY à poser par Teo (repli recherche-entreprises sinon) |
| daliro_b6_01..04 (b672b32) | B6 : avenants, confirmations J-2 (cron daliro-confirmations-j2 15:00), factures de chantier, installation/tableau. Garde-fous 38/39 (après lot 19w : EXECUTE sur private.btp_est_serveur, appelée par une vue) ; parcours : alias masqué par une variable, renvoyé |
| tiroma_b3_02..06 (f7194d6) | B3 lot 2 : regard et créneaux, plans sans rendez-vous, avant rendez-vous, charge des fauteuils, point du matin ; tests 00_aides_b3 + 02_fauteuils_horaires. `^test_b3_` : 4/4 fichiers verts (24+21+18+35) le 6/10 à 00 h 55 Z. Écran /espace/tiroma à fusionner sur son « prêt » |
| lorani_b5_01 / b5_02 (50ccebd) | B5 : porte lorani_deposer_piece, liens des alertes vers /espace/lorani. Test b5_01_parcours_permis rouge : deposer_travail appelé avec un integer pour p_priorite (smallint), renvoyé |
| tamila (tests seuls, a05d25c) | B4 : 12 fichiers pgTAP joués dans l'ordre des noms : 6/11 verts (01, 02, 03, 06, 07, 08). Rouges renvoyés : 04 et 10 (« Vous n'écrivez pas dans ce dossier » : qui est endossé ?), 05 (pieces_une_fois : même sha pour deux pièces), 09 (**trou du socle** : clé d'idempotence de tamila_demander_cloture à la seconde, b4_0x attendu), 11 (40/41, test 38 journal vide) |
| socle_lot19x | publication Realtime des tables tiroma_* demandées par B3 pour son écran /espace/tiroma |
| socle_lot19w | règle générale rejouée après les lots B6/B7 : fonctions de private référencées par une vue lisible, une politique, un trigger, un CHECK ou une fonction INVOKER exécutable → EXECUTE à authenticated |
| socle_lot19j | effet de bord d'a5_01 : le service_role n'avait EXECUTE sur `private` que par PUBLIC → « permission denied for function piece_a_lire » chez le lecteur à 18 h 55 Z. `grant execute on all functions in schema private to service_role` + default privileges (19 h 05 Z). À intégrer dans a5_01 (demandé à A5) |
| filed_lot4a … filed_lot4g, filed_lot5a, filed_lot6a | les neuf migrations d'A4 (`omega/migrations/a4_01` à `a4_09`) : exercices, plan comptable, centres, imputations apprises, charges récurrentes, identité TVA/SIREN, archivage probant, pilotage, circuit de validation, branchements, acquittement d'alerte. `filed_factures_statut_check` retiré, `filed_factures_statut_v2` en place |

Tests sur la recette : a4_01 à a4_04 verts (A4 a aligné ses jeux de données,
1500b1a et 17bb7f2). pgTAP d'A5 (TOUT_1..4 régénérés, joués après a5_01) :
restent rouges 11/12/30/32 (comptage du journal sans filtre, et le
collaborateur ne lit pas le journal : politique « gerants et admins lisent le
journal »), 18/24 (FK envoi_id/suivi_id sans parent), 34 (regex), 36 (canal
'email'), 37 (envois.id uuid), 43 (regex des politiques), 44 (les « en trop »
sont les compléments c/d/e). Tout renvoyé à A5 le 5/10 à 21 h. Smoke test du
gérant du banc après a5_01 : vert.

### Compte de recette et premier envoi

- Compte `gerant@banc-varelo.test` / `Recette-Omega-2026` (auth.users +
  auth.identities), gérant du client banc `cccccccc-0000-4000-8000-00000000000c`
  « Groupe Sogexal (banc) », `config.boite_formulaire = site:omegaai.fr` ;
  comptes referent/daf/daf2 valideurs. Donné à A3 pour sa relecture.
  **Piège** : un utilisateur inséré à la main dans `auth.users` doit avoir ''
  (pas NULL) dans `confirmation_token`, `recovery_token`,
  `email_change_token_new`, `email_change`, `email_change_token_current`,
  `phone_change`, `phone_change_token`, `reauthentication_token`, sinon GoTrue
  rend 500 « Database error querying schema » à la connexion (relevé par A3,
  corrigé à 19 h 05 Z ; les quatre emails sont confirmés).
- `public.reglages_envois` n'a **aucune porte** : Omega les pose à la main
  (ligne organisation `module null` + une ligne par module). Posé pour le banc :
  mode `essai`, `essai_adresse` = adresse de Teo, plages 24 h/7 sur `reput`
  pour l'essai.
- Chaîne vérifiée le 5/10 à 20 h 56 Paris : `private.creer_envoi` → verrous
  (`HORS_HEURES` à 20 h 55 → différé au 06/10 08 h 00 ; `DOUBLON` sur le même
  message : bon) → statut `pret`, fournisseur `brevo` → travail `envois.brevo`
  pris par l'expéditeur en 15 s → **Brevo 401 « unrecognised IP address »**
  (restriction d'IP activée côté Brevo ; les Edge Functions n'ont pas d'IP
  fixe). Teo a désactivé la restriction à 21 h 02 ; `private.tache_envois(now())`
  a reconfié le travail sans attendre la reprise, et l'envoi
  `0a607529-4303-474d-bb43-b6a7c30298a0` est **parti à 19 h 05 Z** (statut
  `envoye`, essais 3, référence Brevo `<202610051905.67751143774@smtp-relay.mailin.fr>`).
  Les deux premiers (sans expéditeur déclaré chez Brevo) ne sont pas arrivés ;
  Teo a déclaré l'expéditeur `essais@omegaai.fr` (domaine omegaai.fr déjà
  authentifié) et le troisième essai, envoi `08ae112f-…`, parti à 19 h 17 Z
  (référence `<202610051917.97558286656@smtp-relay.mailin.fr>`), **a été reçu
  par Teo à 21 h 19** : premier email réel d'Omega, chaîne complète validée.
  Envoi différé `6be6e6cd-…` partira demain 8 h.
- **Accusé de remise vérifié à 19 h 38 Z** : webhook Brevo posé par Teo en
  *Transactionnel* (un premier, créé en *Marketing*, ne voyait pas nos mails ;
  à supprimer), URL `/functions/v1/webhooks-brevo`, Bearer = nouveau
  `BREVO_WEBHOOK_JETON` (régénéré le 5/10, posé dans Supabase et Brevo). Envoi
  `c3e142bb-…` parti à 19 h 38 : 00, rappel Brevo `delivered` à 19 h 38 : 03,
  ligne `envois_evenements` type `remis` écrite par `noter_remise`. Boucle
  complète validée : envoi → Brevo → boîte de Teo → accusé de remise dans Omega.
  Brevo renvoie aussi `opened` : le suivi d'ouverture est encore actif, à couper.

### Fonctions Edge déployées

| Fonction | Session | verify_jwt | Secrets attendus |
|---|---|---|---|
| `lecteur` (v4.1, commit 7425991, version 13 ; rpc() exportée de _partage) | A1 | true | `ANTHROPIC_API_KEY` (posée le 5/10, fournisseur anthropic, modèle claude-sonnet-5-5) ou `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` + `AWS_REGION` + `BEDROCK_MODEL_ID` (Bedrock) ; `MISTRAL_API_KEY` (OCR, facultatif) |
| `expediteur` (v2) | A2 | true | `BREVO_API_KEY` |
| `webhooks-brevo` (v1) | A2 | false | `BREVO_WEBHOOK_JETON` |
| `identite` (v1, B7 e4fd65f, _partage A1 7425991) | B7 | true | `SIRENE_API_KEY` (facultatif : repli), `IDENTITE_CACHE_JOURS` (30) |
| `reception` (v1) | A2 | false | `BREVO_WEBHOOK_JETON`, `BREVO_API_KEY`, `META_VERIFY_TOKEN`, `META_APP_SECRET`, `META_ACCESS_TOKEN`, `FORMULAIRE_SECRET`, `FORMULAIRE_BOITE` |

**Déploiement du lecteur depuis la v4 : une coquille de deux fichiers.** Le
dépôt étant public, `index.ts` fait
`import "https://raw.githubusercontent.com/teopetit50-gif/pegase-site/<sha>/omega/functions/lecteur/index.ts"`
et `deno.json` mappe `@partage/` sur `…/<sha>/omega/functions/_partage/` plus
les alias npm du `deno.json` du lecteur. Pour livrer une version : changer le
SHA, redéployer (`import_map_path = deno.json`, verify_jwt true). Plus de
recopie de 125 Ko, et la version en ligne est figée au commit. (L'ancienne
méthode, `lecteur/outils/preparer_deploiement.ts`, reste valable.)

**Première lecture réelle le 5/10 à 20 h 03 Z** : facture PDF native déposée
par le gérant du banc comme le ferait un client (upload Storage sous
`<client>/filed_document/<document>/<nom>` puis `filed_deposer_piece`), document
R2026-000003, pièce `35cfdcfc-…` : `lue`, facture, natif, 13 valeurs toutes
justes avec leurs boîtes (numéro, dates, fournisseur SIREN/TVA/IBAN, acheteur,
HT/TVA/TTC, lignes, ventilation TVA), 1 appel IA, 3 815 + 811 tokens,
0,0145 €. Deux faux départs instructifs : la politique Storage INSERT pour les
membres manquait (lot 19m, sinon l'écran de dépôt d'A3 échoue), et une clé
Anthropic copiée tronquée donne « invalid x-api-key » (la console ne montre la
clé entière qu'à la création).

Les crons appellent les fonctions avec `Authorization: Bearer <cle_service>`
lue dans Vault (`vault.decrypted_secrets`, nom `cle_service`). Posé par Teo le
5/10 à 18 h 37 Z : les deux crons tournent chaque minute (lecteur 200,
`IA_NON_BRANCHEE` sans Bedrock ; expéditeur 200). Secrets Edge posés par Teo à
18 h 45 Z (webhooks-brevo et reception répondent 401 sans signature : bon).

### Ce que Teo doit encore poser (recette)

1. Brevo : restriction d'IP désactivée, expéditeur `essais@omegaai.fr` déclaré,
   webhook transactionnel posé (fait le 5/10). Reste : couper le suivi
   d'ouverture/clic ; supprimer le webhook « omega » Marketing.
2. Edge Secrets manquants : `META_APP_SECRET`, `META_ACCESS_TOKEN` (WhatsApp).
   `ANTHROPIC_API_KEY` est posée (décision de Teo le 5/10 : API Anthropic en
   direct pour la recette — données hors UE, repasser par Bedrock pour la prod).
3. GitHub → Settings → Secrets : `SUPABASE_DB_URL`, `SAUVEGARDE_PHRASE`
   (workflow de sauvegarde d'A5).
4. Brevo : domaine inbound vers `/functions/v1/reception/brevo` (le webhook
   transactionnel est posé).

### Pose depuis le dépôt (depuis le 5/10, 22 h 45) — la méthode à employer

Plus de recopie de SQL dans l'outil. Deux fonctions sur la recette :
`private.depot_demander(p_chemin, p_sha)` demande le fichier brut à
raw.githubusercontent.com (pg_net, rend un id) ; au prochain appel,
`private.depot_executer(p_id)` exécute le contenu tel quel (les lignes
`begin;`/`rollback;`/`commit;` d'un fichier de test sont retirées, l'appel
étant déjà une transaction). Séquence : (1) un appel qui fait les
`net.http_get` et rend les ids ; (2) un appel par fichier
`select private.depot_executer(<id>)`, dans l'ordre ; (3) pour des tests
pgTAP, `select * from runtests('tests', '^test_xx_')` à part (la sortie d'un
runtests lancé depuis EXECUTE est perdue). Inscrire la pose dans
`schema_migrations` avec « posé depuis le dépôt : <branche> <sha> <chemin> ».
Le mot DELETE n'est plus un problème (l'outil ne voit pas le contenu). Les
fonctions Edge se déploient de même en coquille sur un SHA (voir lecteur).

### Règles de pose

- L'outil Supabase bloque sur `DROP TABLE`, `DROP POLICY`, `DELETE` (il attend
  une confirmation qui n'arrive jamais). `alter table … drop constraint` passe.
  Les migrations confiées au coordinateur n'en contiennent donc pas.
- `apply_migration` expire ; on passe par `execute_sql` et on inscrit la ligne
  dans `supabase_migrations.schema_migrations` à la main.
- Toute nouvelle table de `public` : `revoke all … from anon, authenticated`
  puis, pour chaque politique visant authenticated, le GRANT de la même
  commande (SELECT/INSERT/UPDATE/DELETE). Une politique sans GRANT ne sert à
  rien (vu le 5/10 sur delegations). Les default privileges retirent
  TRUNCATE/REFERENCES/TRIGGER d'office. Diagnostic : comparer `pg_policies`
  (cmd, roles) à `has_table_privilege('authenticated', …)`.
- Faits du socle que les tests doivent respecter : l'entité principale est
  créée à l'insertion du client ; `filed_documents.reference` est générée ;
  `journal_opposable` ne s'écrit que par `private.journaliser(...)` ; les
  verrous d'envoi (opposition, plages) sont rendus par
  `private.verrous_envoi(...)`, pas par un déclencheur.

### Scories à effacer un jour dans l'éditeur SQL

- Schéma `scories` (tables d'essai `zz_essai_lot18`, `zz_essai_lot18b`).
- Réception d'essai `public.receptions` id 1 (client du banc).

## Site

- 43c4f68 : écran client d'A3 (validations, FILED, point du jour) fusionné.
- 372df1c : suite A3 (annulation d'une demande, « Mes délégations », désigner
  une commande, apparier une ligne, dépôt depuis l'espace) ; servi par
  omegaai.fr 40 s après le push.
- 3aa753d : rendu PDF dans l'espace (`PagePdf.tsx`, pdfjs-dist ; worker servi
  sous `/_next/static/media`).
- b99131d : les trois écrans se relisent d'eux-mêmes (Supabase Realtime,
  `tempsReel.ts`) ; Vercel READY. Reste sur worker-a3 : 4735bf2 (notes), à
  fusionner avec le prochain lot.

## Branches des ouvriers

| Session | Branche | État |
|---|---|---|
| A1 lecteur | worker-a1 | v4 en ligne (fournisseur anthropic), première lecture réelle réussie ; 47 tests |
| A2 expéditeur / réception | worker-a2 | fini, déployé, 60 tests ; chaîne d'envoi vérifiée jusqu'à Brevo (401 IP, côté Teo) |
| A3 écran client | worker-a3 | quatre lots en ligne (43c4f68, 372df1c, 3aa753d, b99131d) ; compte de recette fourni pour la relecture |
| A4 FILED compta | worker-a4 | neuf lots posés, tests verts ; fini, attend la prod |
| A5 garde-fous | worker-a5 | `a5_01` posé avec compléments ; 10 tests à corriger (renvoyés) ; liste figée dans `omega/a5_01_liste_figee.txt` |


## Vague 2 — lancée le 5 octobre 2026 à 22 h 20 (décision de Teo)

Cahier commun : scénario réel de bout en bout écrit avant de coder, tests pgTAP
par les portes publiques, une migration `create or replace` par trou du socle,
écran client `/espace/<module>` sur le modèle d'A3, notes avec deux jauges
(« mécanique » et « livrable client »). **Les ouvriers n'appellent jamais
Supabase** (interdit par leur consigne système) : le coordinateur pose, joue et
relaie. Chaque ouvrier a sa photographie du socle dans
`omega/SOCLE-EXTRAITS-<MODULE>.sql` (6 fichiers, 5/10 à 22 h 30) et le socle
commun dans `omega/SOCLE-EXTRAITS-COMMUN.sql` (540 Ko, 22 h 45 : tables,
portes publiques avec droits, fonctions privées, crons, données de référence).
Règle d'or des fichiers à poser : jamais le mot DELETE en clair, même dans une
chaîne (`'del' || 'ete'`), l'outil bloque dessus — règle sans objet depuis la
« pose depuis le dépôt » (le texte ne passe plus par l'outil).

**Trou commun n° 1 (relevé par B3, F7, 6/10) : aucune fonction Edge ne traite
le travail `releve.lire`.** `recevoir_releve` dépose des instantanés `recu` et
un travail `releve.lire`, mais rien ne le prend. Les portes service_role
existent (`commencer_releve`, `deposer_lignes`, `terminer_lecture` →
`avancer_releves` → `<module>.appliquer_releve`) ; il manque l'ouvrier
« lecteur d'exports » (CSV/XLSX des logiciels métier). À confier à A1 (auteur
du lecteur) ou à une session B8.

| Session | Module | Branche | Extrait | Promesse du site |
|---|---|---|---|---|
| B1 `session_01CrMrfRwPXbEdP2cxzcaCNh` | Varelo (groupes, référentiel) | worker-b1 | SOCLE-EXTRAITS-VARELO.sql (grp_) | app/secteurs/groupes |
| B2 `session_01FifCHkLgBbAZrwtHTGDvzP` | Tavaro (location automobile) | worker-b2 | SOCLE-EXTRAITS-TAVARO.sql (loc_) | app/secteurs/location-automobile |
| B3 `session_01XVDbxXV3nk5ANUdd5hfZHf` | Tiroma (cabinets dentaires) | worker-b3 | SOCLE-EXTRAITS-TIROMA.sql | app/secteurs/dentaire — lot 1 posé, 98/98 verts (6/10 00 h 40) ; écran /espace/tiroma à fusionner quand B3 dit « prêt » |
| B4 `session_01HRJ7AmG9hKtDenMRTt1eW6` | Tamila (avocats) | worker-b4 | SOCLE-EXTRAITS-TAMILA.sql | app/secteurs/avocats |
| B5 `session_013VSXzohLtDQS5bbWfRb4xR` | Lorani (architectes, permis) | worker-b5 | SOCLE-EXTRAITS-LORANI.sql | app/secteurs/architectes |
| B6 `session_01DcUXF2LPTVH2CpVdget9fu` | Daliro (BTP) | worker-b6 | SOCLE-EXTRAITS-DALIRO.sql (btp_) | app/secteurs/btp |
| B7 `session_011T7gKKsmg6y6ndZbzggDk5` | Identité des tiers (Sirene, VIES, SIREN↔TVA, IBAN) | worker-b7 | SOCLE-EXTRAITS-FILED.sql + lecteur d'A1 | sert tous les modules |

Sessions de la vague 1 (A1 `session_01XQrgbohqqVEJwGK724wJ7h`, A2
`session_01E3CW3mskiafCa1zPdxjrFo`, A3 `session_01DdgwRadkJFx5u9buwh5crS`,
A4 `session_01ScVNMRrPwNeNjD9LBufDVP`, A5 `session_01HFL5DbN61Rux6iSMf2djPG`) :
A3 et A5 finissent ; A1, A2, A4 au repos.

### Jauges au 5 octobre, 22 h 20 (mécanique / livrable client)

| Chantier | Mécanique | Livrable |
|---|---|---|
| Moteurs communs (lecteur, envois, réception, espace, droits) | 80 % | 35 % |
| FILED | 85 % (recette) | 30 % (rien en prod) |
| REPUT | 50 % | 15 % |
| Varelo, Tavaro, Tiroma, Tamila, Lorani, Daliro | 40 % (socle + crons) | 10 % |
| Mise en production | 0 % | 0 % |

« Livrable » compte : vraies pièces et vrais cas, écran client, branchements aux
logiciels tiers, épreuve par des utilisateurs, prod avec sauvegardes testées,
surveillance, support, cadre juridique. Global : ~45 % de mécanique, 15–20 % de
produit livrable.
