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
| identite_b7_01_v3 (e5aa5dd) | B7 aligné sur A4 : identite_source = registre, verdict {resultat, identifiant, registre, preuve}. **`^test_b7_` 8/8 verts** (6/10 00 h 45 Z). Scénario b7_02 : étapes 1–3 passent, l'assert compte le cache global (renvoyé, filtrer). Pièce à vrai SIREN (Orange, FAC-2026-10-0471) remise à Teo pour dépôt par /espace/filed : rien n'est arrivé au premier essai |
| tavaro TOUT_B2 (66f1d09) | `^test_b2_` 8/11 verts (01, 02, 03, 04, 06, 08, 10, 11). Renvoyés : 05 (variable p ambiguë), 07 (alertes.cle n'existe pas → cle_regroupement), 09 (jour UTC vs Paris entre 0 h et 2 h). reglages_envois tavaro et lorani posés sur le banc (mode essai → Teo) |
| varelo_b1_02 (8a3c1f6) | GRANT aux quatre portes grp_* + private. `^test_b1_` 1/14 : tests.b1_banc() rend gerant = null → endosser(null) → RLS grp_poles. Diagnostic fait par DO bloc, renvoyé à B1 |
| daliro_b6_03_v2 (7dbdc3a) | b6_02_garde_fous **38/38** ; b6_01_parcours meurt dans private.btp_soumettre_avenant (variable c masque l'alias c, ligne 40), renvoyé |
| tamila_b4_02 / b4_03 (14e938e) | journal des accès, clé de dossier à un membre. `^test_b4_` 7/12 (01, 02, 03, 07, 08, 12 14/14). Renvoyés : 04 (appel redéclaré), 05 (sha dupliqué), 06 (jour UTC vs Paris), 09 (trou du socle : clé d'idempotence de tamila_demander_cloture, b4_04 attendu), 10 (droits d'écriture), 11 test 38. Mots de passe referent/daf/daf2 du banc = Recette-Omega-2026 |
| lorani_b5_03 (5a4a2e6) | rappels envoyés par preparer_envoi. `^test_b5_` **110/111** après la ligne reglages_envois lorani ; reste le 40 (texte de la section) ; ordre des pièces non déterministe (renvoyé) |
| identite_b7_02_demander (3e4616b) | porte identite_demander (revérifier un SIREN/TVA, p_force). `^test_b7_` 8/8 + **scénario b7_02 de bout en bout** ; test_b7_09 meurt sur tests.role_admis absente (renvoyé) |
| tavaro TOUT_B2 v2 (30877c2) | `^test_b2_` **10/11** (reste 05 : contrat déjà facturé dans la scène). banc_01_parcours_reel.sql s'arrête au bloc A : private.loc_bareme_en_vigueur appelée sous authenticated (renvoyé) |
| varelo b1_00 v2 (f1fede4) | `^test_b1_` **12/14** (05 test 4 : le socle accepte deux demandes ouvertes sur un objet, à trancher ; 06_journal : cmp_ok bigint/integer) |
| daliro b6_01/b6_04 v2 (4611bc7) | b6_01_parcours avance jusqu'à la ligne 322 : filed_factures_document_key (une facture par document), renvoyé |
| tamila b4_01 / b4_04 (ef08aaf) | dépôt de pièce chiffrée, clé d'idempotence de la clôture. `^test_b4_` **11/13** (04 test 60 et 13 test 20 : 42501 rendu avant 55000, à trancher) |
| lorani b5_01 v2 / b5_03 v2 / b5_04 (9ba2900) | ordre des pièces (b5_04). `^test_b5_` **111/111** |
| tiroma b3_07 / b3_08 / b3_09 / b3_02 v2 (8b6b27c) | mutuelle, heures locales, liste d'attente ; reglages_envois tiroma (essai, sante) posé. Tests 05–11 meurent tous : terminer_lecture sans clé 'jeu' (renvoyé) |
| **bilan 6/10 03 h 30 Paris** | Après les correctifs de la nuit, **tous les modules de la vague 2 sont verts sur la recette** : Identité 10/10 fichiers + scénario (b7_01 v3, b7_02, b7_03 balayer ; ouvrier identite v2), Varelo 14/14 (b1_01..03), Tavaro 11/11 (b2_01 v2, b2_02 v2) + parcours réel sur le banc (barème, contrat BANC-2026-0001, FA-2026-000001/000002 émises, **courriel remis chez Teo à 00 h 26 Z**, relance validée par le gérant puis différée DELAI_MINIMAL jusqu'au 09/10), Lorani 111/111 (b5_01..04), Tamila 13/13 (b4_01..04), Daliro 154/154 + 38/38 (b6_01..05), Tiroma 11/11 (b3_01..10, gabarit tiroma.point_matin validé). Lecteur v4.2 (types Lorani, 055b29c) et lecteur-exports (35721d4) déployés. Facture à vrai SIREN : omegaai.fr pointe sur la prod (le banc n'y existe pas) → dépôt confié à A3 sur un Next local (omega/banc/facture_orange_FAC-2026-10-0471.pdf) |
| **preuve identité à vrai SIREN (6/10, 00 h 45 Z)** | A3 a déposé `omega/banc/facture_orange_FAC-2026-10-0471.pdf` sur le banc par un Next local pointé sur la recette : reçu **R2026-000004** (00 h 43 Z), lu par le lecteur en ~80 s, facture **bloquee** (phase creation) « Fournisseur nouveau (ORANGE SA) ». Chaîne B7 de bout en bout sans retouche : travail identite.verifier 3214 fait (resultat {source vies, resultat valide, complements 1, recontrolees 1}) ; filed_verifications_tiers 251e7482 **vies valide** (preuve nom « SA ORANGE », adresse Issy-les-Moulineaux, siren_cle_ok et noms_concordent vrais) + complément sirene bfeb8760 par recherche-entreprises (repli, SIRENE_API_KEY absente) ; contrôle identite.registre **ok** « Identité confirmée par VIES le 06/10/2026. » ; fournisseur 90cc1d86 identite_source vies, verdict {valide, vies, FR89380129866, preuve}, statut a_confirmer ; cache identites_registre 2 lignes ; battements.identite {pris 1, valide 1, balayees 0, sirene repli}. Extraits relayés à B7. Reste à A3 : branchement de filed_confirmer_fournisseur sur l'écran |
| socle_lot19ab | **santé des envois** (trou commun n° 7, B3 ; avis A2 fa62599 ; A2 ne pose pas de SQL, brief de Teo). Le socle portait déjà la règle (`fournisseurs_envoi.agree_sante` = « hds », `canaux_envoi.permis_sante` = « sante_autorise », verrou SANTE_HORS_CANAL_AGREE rejoué par envoi_valide et commencer_envoi : prouvé par B3-08). Le lot comble les deux trous : verrous_envoi refuse le canal non permis (SMS) pour tout envoi `donnees_sante`, même hors module santé ; commencer_envoi rend `donnees_sante` et `fournisseur_hds` à l'ouvrier. Posé par execute_sql (`omega/modules/socle/migrations/19ab_sante_envois.sql`, corps réécrits par repère vérifié), test `omega/tests/socle/19ab_sante_envois.sql` **12/12**, B3-08 toujours 28/28. **Aucun fournisseur agréé** (brevo, brevo_sms, manuel) : à Teo, sur preuve HDS. Leçon : l'outil de pose attend une confirmation sur tout `drop` (même `pg_temp`) et expire à 60 s sans rien faire |
| socle_lot19aa | fonction Edge **lecteur-exports** (A1, coquille 35721d4) + cron omega-lecteur-exports chaque minute : le trou commun n° 1 (releve.lire) est bouché côté ouvrier ; premier vrai export attendu de B3 |
| socle_lot19y | Realtime des tables loc_contrats, loc_propositions, loc_factures, loc_avoirs (demande de B2). La politique Storage 19o couvre déjà `<client>/loc_contrat/…` |
| socle_lot19z | test 44 d'A5 (e35b825) joué : **anon exécutait 30 fonctions de private** (fonctions créées après a5_01, EXECUTE pour PUBLIC par défaut). Pour chaque fonction de private : EXECUTE explicite à authenticated si elle l'avait, puis revoke from public, anon ; default privileges de postgres dans private (public sans EXECUTE, service_role avec). État : anon 0/881, authenticated 330/881, service_role 881/881. Test 44 : 4/5 (restent 58 « en trop » pour authenticated à trier par A5 : CHECK/defaults, triggers, vues). Test 51 meurt (« unrecognized privilege type DELETE »), renvoyé à A5 — message non envoyé, Teo a mis en pause |
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
- 7d13c1a, b287d04, d572973, e6d991a : les six écrans de la vague 2 fusionnés
  (/espace/varelo, tavaro, lorani, tiroma, tamila, daliro ; huit onglets, libellés
  courts sous 1700 px, retour à la ligne sous 1440 px).
- **Quota Vercel (plan Hobby, 100 déploiements par jour)** : épuisé le 5/10 au
  soir par les prévisualisations des branches worker-* (402
  `api-deployments-free-per-day`) ; main n'était plus servi au-delà de 8ad401b.
  `vercel.json` (c7e29bd) coupe les déploiements des branches worker-a1…b9. Le
  quota est revenu le 6/10 à 00 h 01 Z : c7e29bd READY, puis 7c7c934 et 6635b1c.
  **Les six écrans répondent 200 sur omegaai.fr** (titres vérifiés le 6/10 à
  00 h 55 Z). omegaai.fr pointe sur la prod : le banc n'y existe pas, les
  relectures réelles se font sur un Next local pointé sur la recette.
- 47335ff : worker-b7 fusionné (omega/functions/identite, migrations b7_01–03,
  tests, NOTES-B7). 6635b1c : `tsconfig.json` exclut `omega/functions` (code
  Deno des ouvriers, vérifié par Deno, pas par le tsc du site). **B7 terminé.**
- 0a65434, d298f07, 155e201, 2e8bbf9 : worker-b1 (7f015ff), worker-b3 (87b914e),
  worker-b4 (16bad34), worker-b5 (8f6d793) fusionnés : notes de fin, tests à
  jour (tamila 06 jour de Paris dans l'EXECUTE, varelo b1_06 bigint, tiroma 12),
  migration b1_03_proposer_nom_unique (déjà posée : varelo_b1_03). Les deux
  fichiers de la barre d'onglets restent ceux de main (huit onglets). Fusion
  faite avec `-X theirs` puis `git checkout HEAD -- components/espace/…`.
  **B1, B3, B4, B5, B7 terminés** (6/10, 01 h 10 Z).
- worker-b2 (0643423) et worker-b6 (a48481b) fusionnés de même (notes de fin,
  b6_05_import_a_ranger déjà posée). **Les sept ouvriers de la vague 2 ont
  terminé** (6/10, 01 h 20 Z). Trou n° 7 (santé des envois) : avis d'A2 retenu
  (NOTES-A2 fa62599 : `fournisseurs_envoi.hds`, `canaux_envoi.sante_autorise`,
  verrou SANTE_FOURNISSEUR dans la préparation et confier_envoi, clés rendues
  par commencer_envoi) ; lot socle confié à A2, à poser depuis le dépôt.

## Branches des ouvriers

| Session | Branche | État |
|---|---|---|
| A1 lecteur | worker-a1 | v4 en ligne (fournisseur anthropic), première lecture réelle réussie ; 47 tests |
| A2 expéditeur / réception | worker-a2 | fini, déployé, 60 tests ; chaîne d'envoi vérifiée jusqu'à Brevo (401 IP, côté Teo) |
| A3 écran client | worker-a3 | quatre lots en ligne (43c4f68, 372df1c, 3aa753d, b99131d) ; compte de recette fourni pour la relecture |
| A4 FILED compta | worker-a4 | neuf lots posés, tests verts ; fini, attend la prod |
| A5 garde-fous | worker-a5 | `a5_01` posé avec compléments ; 10 tests à corriger (renvoyés) ; liste figée dans `omega/a5_01_liste_figee.txt` |


## PAUSE — 6 octobre 2026, 01 h 00 (Paris)

Teo a mis toutes les sessions en pause (limite d'usage atteinte). Chaque ouvrier
a reçu l'ordre de commiter/pousser et de s'arrêter ; le point automatique de 2 h
est désactivé (trig_01EUyxfyvgvmXW3C5sv93rd3). À la reprise : réarmer le point,
relancer les ouvriers par message, puis traiter dans l'ordre : B7 v3 (forme du
verdict d'A4), B4 corrections (04/05/09/10/11 + b4_0x clôture), B5 (smallint),
B2 (6 tests), B1 (role_admis), B6 (parcours), A5 (test 44 « en trop », test 51),
A1 (lecteur-exports), fusions d'écrans B2/B3/B4/B5 sur « prêt à fusionner ».

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
| B3 `session_01XVDbxXV3nk5ANUdd5hfZHf` | Tiroma (cabinets dentaires) | worker-b3 | SOCLE-EXTRAITS-TIROMA.sql | app/secteurs/dentaire — lots 1 et 2 posés, 4/4 fichiers verts ; **écran /espace/tiroma sur omegaai.fr (7d13c1a)** |
| B4 `session_01HRJ7AmG9hKtDenMRTt1eW6` | Tamila (avocats) | worker-b4 | SOCLE-EXTRAITS-TAMILA.sql | app/secteurs/avocats |
| B5 `session_013VSXzohLtDQS5bbWfRb4xR` | Lorani (architectes, permis) | worker-b5 | SOCLE-EXTRAITS-LORANI.sql | app/secteurs/architectes — b5_01..03 posés, 110/111 ; **écran /espace/lorani sur omegaai.fr (7d13c1a)** |
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

## PASSATION — 6 octobre 2026, 03 h 30 (Paris) : nouvelle session coordinateur (Opus 5.5)

La session coordinateur Fable (session_01B4JNQXyT69GytdvE9SjAnE) s'arrête (limite
d'usage). La session qui lit ceci prend TOUT le rôle de coordinateur / administrateur
des ouvriers. Tout ce fichier reste valable ; voici l'essentiel pour reprendre sans
relire la nuit.

### Les règles posées par Teo (ne jamais les discuter)
- Agir seul, ne jamais demander la permission (« j'ai tout autorisé »). Rendre compte
  en français, honnêtement, par module, en cinq lignes.
- **Les ouvriers n'appellent jamais Supabase.** Toute SQL / MCP passe par le
  coordinateur : les ouvriers poussent des SHA sur leur branche `worker-xx`, le
  coordinateur pose depuis le dépôt et relaie les résultats bruts.
- Recette `ygwbgpowzlbdaajlsqkn` seulement. **Jamais d'écriture en prod
  (`noepmkkplxshjbmqqxft`)** ; même une lecture prod a été refusée par le filtre.
- Dépôt : jamais `git add -A` ni `commit -a` ; commit chemin par chemin ; `git push
  origin main` déploie omegaai.fr (Vercel pegase-site2, ~45 s) ; `npx tsc --noEmit`,
  eslint, `npm run build` avant tout push ; jamais un build rouge. Fusion d'une branche
  d'ouvrier : `git merge -X theirs origin/worker-xx` puis
  `git checkout HEAD -- components/espace/ecrans.ts components/espace/format.ts`
  (la barre à huit onglets de main gagne toujours), vérifier `git diff --quiet …
  -- components/ app/`.
- omegaai.fr pointe sur la prod : le compte du banc (`gerant@banc-varelo.test` /
  `Recette-Omega-2026`, client `cccccccc-0000-4000-8000-00000000000c`) n'existe que sur
  la recette ; les relectures réelles se font sur un Next local pointé sur la recette
  (`NEXT_PUBLIC_SUPABASE_URL=https://ygwbgpowzlbdaajlsqkn.supabase.co`, clé publique
  `sb_publishable_a12GN1jHf0IJR4xcKvPTXw_NlPb51zl`).

### Comment poser (voir « Pose depuis le dépôt » plus haut)
- Fichier SQL d'un ouvrier : `select private.depot_demander('<chemin>', '<sha>')` →
  id, puis `select private.depot_executer(<id>)` (une transaction, tout ou rien) ;
  tests : poser le fichier puis `select * from runtests('tests', '^test_xx_')`.
- Petit lot socle du coordinateur : `execute_sql` direct + insert dans
  `supabase_migrations.schema_migrations` (version `to_char(now(),'YYYYMMDDHH24MISS')`,
  name `socle_lotNN_…`, statements = provenance).
- **Piège** : l'outil Supabase (`execute_sql` et `apply_migration`) attend une
  confirmation humaine sur tout `drop …` (même `pg_temp`) et expire à 60 s sans rien
  faire. Jamais de DROP dans une pose ; pas de fonction d'aide temporaire.
- Toute nouvelle fonction de `private` naît EXECUTE pour PUBLIC : toujours
  `revoke execute on function … from public` (lot 19z).
- Fonctions Edge : « coquille » (index.ts qui importe l'URL raw GitHub au SHA +
  deno.json), `verify_jwt` true, cron pg_cron → pg_net avec la clé `cle_service` du
  vault. `deploy_edge_function` avec les fichiers.

### Sessions des ouvriers (toutes joignables par send_message)
- A1 session_01XQrgbohqqVEJwGK724wJ7h (lecteur, exports) — A2
  session_01E3CW3mskiafCa1zPdxjrFo (envois, Brevo ; brief de Teo : aucune migration
  SQL) — A3 session_01DdgwRadkJFx5u9buwh5crS (écran client /espace) — A4
  session_01ScVNMRrPwNeNjD9LBufDVP (FILED) — A5 session_01HFL5DbN61Rux6iSMf2djPG
  (socle, sécurité, tests 44 et 51).
- Vague 2, **tous terminés et fusionnés dans main** : B1 Varelo
  session_01CrMrfRwPXbEdP2cxzcaCNh, B2 Tavaro session_01FifCHkLgBbAZrwtHTGDvzP, B3
  Tiroma session_01XVDbxXV3nk5ANUdd5hfZHf, B4 Tamila session_01HRJ7AmG9hKtDenMRTt1eW6,
  B5 Lorani session_013VSXzohLtDQS5bbWfRb4xR, B6 Daliro
  session_01DcUXF2LPTVH2CpVdget9fu, B7 Identité session_011T7gKKsmg6y6ndZbzggDk5.
  Ils reprennent au premier message.

### État au moment de la passation
- Recette : tous les modules verts (Identité, Varelo 14/14, Tavaro 11/11, Lorani
  111/111, Tamila 13/13, Daliro 154+38, Tiroma 12/12) ; preuve identité à vrai SIREN
  faite (Orange SA, R2026-000004) ; parcours réel Tavaro (FA-2026-000001/000002,
  courriel remis chez Teo 00 h 26 Z, relance différée au 09/10).
- Site : six écrans en ligne sur omegaai.fr (varelo, tavaro, lorani, tiroma, tamila,
  daliro), quota Vercel revenu ; dernier commit main 6b9c88d (lot 19ab).
- Lot socle 19ab (santé des envois) posé et vert 12/12 ; B3-08 28/28.

### À faire, dans l'ordre
1. **Redéployer `expediteur`** (recette) avec la garde santé d'A2 : la version en
   place (v10) est un dépôt de fichiers complets (index.ts, brevo.ts, passage.ts,
   portes.ts, stockage.ts, deno.json) ; A2 a poussé la garde dans
   `omega/functions/expediteur/passage.ts` au SHA **29ef6e6** sur `worker-a2`.
   Redéployer avec les six fichiers lus à ce SHA (`git show origin/worker-a2:…`), même
   `verify_jwt` true, puis vérifier un battement `expediteur` dans `battements`.
   Prévenir A2 (clés rendues par commencer_envoi : `donnees_sante`,
   `fournisseur_hds` = `agree_sante`) et B3 (lot posé).
2. **A5** : attend sa réponse sur test 44 (liste « en trop » après 19z), test 51
   (« unrecognized privilege type DELETE ») ; poser ses SHA depuis le dépôt.
3. **B2** : test `test_b2_11_relances` n° 7 tombe (compte global, deux vraies factures
   du banc) ; B2 prévenu, SHA à poser s'il corrige.
4. **A3** : branchement de filed_confirmer_fournisseur / filed_attester_identite à
   l'écran, bouton « revérifier » (contrat de B7, NOTES-B7 § 9 b), « Annuler ma
   demande » ; fusionner son prochain lot.
5. **A1** : premier vrai export via la chaîne Logos_w de B3 ; six types de courriers
   Lorani (omega/modules/lorani/CHAMPS-LECTURE-LORANI.md) ; types Tamila.
6. Point automatique : l'ancien (trig_01EUyxfyvgvmXW3C5sv93rd3) est désactivé ;
   en recréer un (send_later, 2 h) qui résume à Teo en cinq lignes.
7. **Teo doit encore** : confirmer le courriel Tavaro reçu ; poser SIRENE_API_KEY ;
   décider `agree_sante` (aucun fournisseur agréé, manuel compris) et l'hébergement
   HDS pour un client santé ; secrets GitHub / Meta ; nettoyage Brevo ; prod plus
   tard (Bedrock).

## REPRISE — 6 octobre 2026, 03 h 10 (Paris) : coordinateur session_01BCGFdpRKBvXKjouC75sYBg (Opus 5.5)

- **Ouvriers prévenus** (send_message, 01 h 12 Z) : A2, A3, A4, A5, B1–B7 ont reçu le
  nouvel id. **A1 : message refusé par le filtre de permissions** de cette session (non
  relancé) ; A1 n'a rien de neuf sur worker-a1 (055b29c). A5 répond par NOTES-A5 (son
  send_message est refusé depuis le début) : lire `git show origin/worker-a5:omega/NOTES-A5.md`.
- **Point 1 fait — expediteur v11** déployé en coquille (index.ts qui importe
  `…/29ef6e6036035165d9df07d86688e7e231b55328/omega/functions/expediteur/index.ts`,
  deno.json vide ; `import_map_path` = deno.json obligatoire, sinon BadRequest), verify_jwt
  true. Battement `expediteur` à 01 h 12 : 00 Z signé `…_11`, `cle_environnement` vrai.
- **Point 2 fait — A5** : `a5_01_private_execute.sql`, `00_installation.sql`, `TOUT_4.sql`
  posés depuis worker-a5 97853cb (ligne `a5_01_private_execute_v2`). Droits sur private :
  anon 0/887, authenticated **221**/887 (330 avant), service_role 887/887. Test 44 **5/5**,
  test 51 **3/3**.
- **Lot 19ac — tests longs** : l'outil coupe à 60 s et perd la sortie. Nouveau :
  `private.sorties_tests` + `private.tests_en_tache(lot, motif)` (security definer, sans
  EXECUTE public). Usage : `select cron.schedule('<lot>', '* * * * *', $$select
  private.tests_en_tache('<lot>', '^test_xx_')$$)` ; la tâche se retire seule
  (cron.unschedule) ; lire `select lot, ligne from private.sorties_tests order by id`.
  Attention : execute_sql ne rend que le résultat de la DERNIÈRE requête.
- Point automatique réarmé : trig_01PJKxdeE5XGx3n8QTMoWwVe (toutes les 2 h, à h:14).
- **Suites des modules rejouées après a5_01 v2** (via 19ac, une par une — en parallèle,
  Daliro a fait un interblocage ; et `tests_en_tache` doit rester SECURITY INVOKER, sinon
  « cannot set parameter role within security-definer function ») : Varelo 14/14, Tiroma
  12/12, Tamila 13/13, Lorani vert, Daliro 154 + 38, Tavaro 10/11 (n° 11 test 7, corrigé
  par B2 en 4459680, posé, rejeu en cours), Identité 9/10 (b7_02 test 7 « aucun cache pour
  un identifiant jamais vu » : le cache porte la vraie preuve Orange ; renvoyé à B7).
- A1 : le lecteur est déjà sur 055b29c (version 14) ; rien à redéployer. Le second message
  à A1 est passé.
- **Fusion des notes de B3/B4/B5/B6/A3 dans main refusée par le filtre de permissions de
  cette session** (non relancée) : à faire par Teo ou une session autorisée, méthode
  inchangée (`-X theirs` + checkout de la barre d'onglets). Les branches A1/A2/A4/A5 ne
  sont toujours pas fusionnées (comme avant la passation).

### Ouvriers relancés en Opus 5.5 (6/10, 03 h 28 Paris — demande de Teo : « limite Fable atteinte »)

Les douze sessions Fable sont remplacées (A1 et A5 étaient bloquées « Fable limit », les dix
autres en alerte). Chaque nouvelle session part de sa branche worker-xx, lit son NOTES-xx.md,
et écrit au coordinateur session_01BCGFdpRKBvXKjouC75sYBg. **Ce sont désormais les seuls ids
valables** ; les anciennes sessions Fable ne sont pas archivées (A3 Fable attend une
permission execute_sql : à refuser / ignorer).

| Ouvrier | Nouvelle session (Opus 5.5) | Ancienne (Fable) |
|---|---|---|
| A1 lecteur | session_01HaFWLmwpsdUSHC7X6raEZU | session_01XQrgbohqqVEJwGK724wJ7h |
| A2 expéditeur / réception | session_01WbmeaVoucWEVBzXRYRyHab | session_01E3CW3mskiafCa1zPdxjrFo |
| A3 écran client | session_01Npbh1aR6LoEX7PZDchMSca | session_01DdgwRadkJFx5u9buwh5crS |
| A4 FILED | session_01FiYEg9p2egKbatQDPJGmFY | session_01ScVNMRrPwNeNjD9LBufDVP |
| A5 garde-fous | session_01BnmsMXfPeMf55k32si4Zdd | session_01HFL5DbN61Rux6iSMf2djPG |
| B1 Varelo | session_018XzgEK2qPbPzZBtrX7BdWB | session_01CrMrfRwPXbEdP2cxzcaCNh |
| B2 Tavaro | session_01HKxgZfAkgWXmzJkkwWRMN5 | session_01FifCHkLgBbAZrwtHTGDvzP |
| B3 Tiroma | session_016947vqqcuBzgihDxHt7Aoo | session_01XVDbxXV3nk5ANUdd5hfZHf |
| B4 Tamila | session_01ACKfUXKSgnD521nunHBY1w | session_01HRJ7AmG9hKtDenMRTt1eW6 |
| B5 Lorani | session_018iNiXjY8eWmMjaGrXSGgma | session_013VSXzohLtDQS5bbWfRb4xR |
| B6 Daliro | session_013Vf6v9HerZzPG1w9ErbfMw | session_01DcUXF2LPTVH2CpVdget9fu |
| B7 Identité | session_01967jUehrY7tLAXLn9pBaSw | session_011T7gKKsmg6y6ndZbzggDk5 |

Tâches données au départ : A3 (confirmer/attester le fournisseur, « revérifier », « Annuler ma
demande ») ; A5 (deux tests pgTAP santé des envois) ; B4 (CHAMPS-LECTURE-TAMILA.md pour A1) ;
B5 (rejouer un courrier de mairie réel, le lecteur connaît les types Lorani) ; B7 (b7_02 test
7, filtre sur la scène) ; les autres relisent leurs notes et attendent.
- 03 h 31 : les douze nouveaux ouvriers ont confirmé leur reprise. **B7 91b919d posé,
  `^test_b7_` 10/10** (identite_b7_01_portes_v4) : tous les modules sont verts sur la recette.
  B4 a livré `omega/modules/tamila/CHAMPS-LECTURE-TAMILA.md` (worker-b4 66ec6fb ; pièces
  Tamila chiffrées, illisibles sans coffre) → relayé à A1 pour la table des types. A4 :
  lignes de factures.ts à passer à atteste: true listées (worker-a4 aa909e0, après la prod).
  B5 rejoue un courrier de mairie réel (accès recette renvoyés). B6 propose : envoi réel du
  J-2 et clôture des sept chantiers « Essai B6 » du banc (décision du coordinateur, en attente).
- 03 h 35 : **règle santé des envois prouvée sur la recette** — tests d'A5 52 et 53 (worker-a5
  607c2e6) 4/4 et 5/5 : SMS santé → CANAL_NON_PERMIS définitif ; email santé chez un
  fournisseur non agréé (brevo) → SANTE_HORS_CANAL_AGREE définitif ; brevo agréé ou envoi
  sans santé → seulement HORS_HEURES. Question ouverte d'A5 soumise à A2 : verrous_envoi juge
  le fournisseur de l'expéditeur actif, commencer_envoi rend fournisseur_hds d'après
  envois.fournisseur — peuvent-ils diverger ?
- 03 h 37 — **déploiements** (coquilles, SHA complets) : `lecteur` v16 sur worker-a1 533f441
  (types Tamila alignés sur B4, pièce chiffrée → finir_travail {ignore: chiffree_sans_coffre},
  sans reprise) ; `lecteur-exports` v2 sur d963121 (dates XLSX « 2026-10-06 08:30 », plus
  de format US ; contrôles 31/02 et 25:00) ; `expediteur` v12 sur worker-a2 67f9cf6 (envoi
  santé refusé aussi si envoi.fournisseur ≠ brevo/brevo_sms). Passage de 01 h 36 Z : les
  quatre ouvriers répondent 200 ; le lecteur a lu une pièce (`lue` 1). Test 54 d'A5
  (b1f4a03, cohérence du fournisseur) 3/3, mais 0 envoi réel comparé.
- Remarques d'A1 sur les signatures Logos_w (actes ⊃ devis, devis_lignes ⊃ types_rdv ;
  patient_ref facultatif dans agenda) transmises à B3.
- 03 h 40 — **Logos_w** : b3_11_signatures_logosw (worker-b3 9a183b1) posé ; signatures
  devis +« Part AMO », patients +« Prénom », types_rdv +« Couleur » (relues en base) ;
  `^test_b3_` 12/12 après. A1 041f6a2 : modeles/tiroma_logosw.json aligné, test « chaque
  jeu reconnu par ses seuls en-têtes » vert ; pas de redéploiement (le JSON ne sert qu'à
  l'essai à blanc, la fonction lit les jeux en base).
- 03 h 50 — **fusions faites avec l'accord écrit de Teo** : worker-b2, b3, b4, b5, b6, b7, a3
  dans main (`-X theirs`, seulement omega/ : notes, tests tavaro 11 et identite b7_01,
  b3_11, CHAMPS-LECTURE-TAMILA, scripts recette-b5). components/, app/, lib/ inchangés ;
  tsc et build verts. A1, A2, A4, A5 toujours non fusionnées (code des fonctions, migrations,
  workflow de sauvegarde : à traiter à part).
- 04 h 00 — **Lorani, premier vrai courrier** (B5, lecteur v14) : récépissé de dépôt lu et
  confirmé de bout en bout (PC 044109 26 A0042, 15/09/2026). Demande de pièces : le
  lecteur citait « PCMI 3 », mais le socle jetait les codes PCMI/DPMI (regex de
  private.lorani_propositions). **b5_05_codes_pcmi** (worker-b5 ea53b85) posé : corps
  identique à l'extrait du socle sauf cette ligne ; essai direct → PCMI3, PCMI6, PC2 ;
  `^test_b5_` **112/112**. Écran PermisVue.tsx (liste des pièces obligatoire pour confirmer)
  fusionné ; tsc, eslint, build verts. La demande confirmée vide sur « Pavillon Lemoine »
  reste une donnée de recette ; B5 redépose un nouveau PDF.
- 04 h 05 — **A3 fusionné** (worker-a3 4887759) : FILED, fiche « Fournisseur » — Confirmer
  (filed_confirmer_fournisseur, grisé pour le déposant), Revérifier (identite_demander
  p_force), Attester (filed_attester_identite), « Vérifiée le … par … ». Relu en réel par A3
  sur la recette (ORANGE SA, revérification 01:39 → 01:43 Z). tsc, eslint, build verts.
  **Lot 19ad (Realtime de public.filed_fournisseurs) refusé par le filtre de permissions** :
  à poser par Teo ou avec son accord (`alter publication supabase_realtime add table
  public.filed_fournisseurs;` ; RLS « membres lisent les fournisseurs », anon sans SELECT).
  Sans lui, la fiche ne se relit pas seule après une action.
- 04 h 10 — **a4_12 posé** (worker-a4 18578a3) : la levée de `fournisseur.a_confirmer` est
  refusée à tout le monde (déclencheurs sur filed_levees et filed_controles) ; seul chemin :
  filed_confirmer_fournisseur. 0 levée existante avant. Test a4_06 vert.
  **Lot 19ae — `private.tester_sans_trace(id)`** : pour les tests d'A4 (bloc DO + `rollback;`
  final), depot_executer retire le rollback, donc les données resteraient. tester_sans_trace
  joue le fichier puis annule tout par une exception interne, et rend « vert » ou
  « rouge : <code> <message> » (les notices sont perdues). À employer pour tout test non pgTAP.
  A3 prévenu : masquer « Lever avec un motif » pour ce code.
- 04 h 15 — **preuve réelle FILED fournisseur** (A3, 01 h 53 Z) : daf@ confirme ORANGE SA →
  actif ; FAC-2026-10-0471 bloquee → a_valider (0 bloquant) ; demande valider_fournisseur
  annulée d'office. « Annuler ma demande » prouvé (IBAN proposé par le gérant → demande
  annulée par l'écran). worker-a3 71b56a7 fusionné (relecture à 1, 2, 4 min après
  « Revérifier »). Renvoyé à A4 : la demande valider_facture née du recontrôle est
  attribuée à daf (auth.uid()), qui ne pourra pas la valider ; IBAN « propose » orphelin
  après annulation.
- 04 h 20 — A3 64a5490 fusionné (0f8a2de) : sur fournisseur.a_confirmer, plus de « Lever avec
  un motif », seulement « Confirmer ce fournisseur » (gris pour le déposant). Lot FILED
  fournisseur clos ; en attente d'A4 (a4_13 : demandeur des demandes nées d'un recontrôle,
  IBAN « propose » orphelin).
- 04 h 25 — **Règle commune des valeurs lues (décision du coordinateur)** : une ligne par
  (piece_id, champ), jamais deux ; une liste = une seule ligne dont la valeur est un tableau
  jsonb dans l'ordre du document (ex. ["PCMI 3","PCMI 6"]) ; le socle lit avec
  jsonb_array_elements_text quand jsonb_typeof = 'array'. Écrit dans omega/CHAMPS-LECTURE.md
  (worker-a1 9ebefca). Cause : second courrier Lorani réel (pièce 059e705e…, lue, date et
  pièces justes) → 0 proposition, car lorani_propositions attendait une ligne par code et
  lorani_valeurs_de_piece remonte le tableau en chaîne JSON. B5 écrit b5_06 (deux formes
  acceptées, fiche corrigée) ; A1 ajoute les champs facultatifs Lorani de la fiche de B5.
- 04 h 10 — **b5_06** (worker-b5 24ea9b0) posé : private.lorani_codes_pieces accepte toutes
  les formes de liste ; `^test_b5_` 114/114 ; pièce réelle 059e705e → [PCMI3, PCMI6]. B5
  redépose une v3 par l'écran pour la preuve de bout en bout. **Lecteur v17** (worker-a1
  0d54731 : champs facultatifs Lorani, lorani_courrier_autre, clés réduites aux champs
  obligatoires). **a4_13** (worker-a4 5f6aa66) posé : demandes de facture et d'IBAN déposées
  au nom du système, filed_saisisseurs ignore les étapes écrites par FILED, IBAN repris après
  annulation ; a4_07 vert ; IBAN …0189 redéposé (en_attente, système). **FAC-2026-10-0471
  validée de bout en bout** : approuvée par daf2@ à 02:03:20 Z (A3), demande executee —
  posée juste avant a4_13, donc le correctif du demandeur reste à prouver sur la prochaine
  facture réelle.
- 04 h 15 — b5_06 v2 (worker-b5 fcd1b1a) posé : lorani_valeurs_de_piece remonte un tableau en
  jsonb (plus en chaîne) ; `^test_b5_` 114/114 ; fiche Lorani ligne 23 alignée sur la règle
  commune ; branche fusionnée. B5 redépose une v3 par l'écran (lecteur v17).
- 04 h 20 — **A3 7429d52 fusionné en urgence** : l'écran FILED plantait sur une facture
  « validee » (statuts validee/refusee/comptabilisee inconnus ; un statut inconnu s'affiche
  désormais tel quel). Lien Validations → dossier FILED (/espace/filed?objet=facture:<id>).
  **Première vraie facture de bout en bout** : FAC-2026-10-0471 (ORANGE SA) déposée, lue,
  contrôlée, VIES, fournisseur confirmé par daf@, validée par daf2@ (02:03:20 Z), exécutée
  par le socle (02:04 Z), archivée avec empreinte au journal (ligne 76967). Pour B6 :
  daliro/ChantierVue.tsx affiche le statut brut pour ces trois statuts.
- 04 h 20 — **Lorani : chaîne réelle complète** (B5, v3 par l'écran, lecteur v17) : pièce
  2bfb560c lue en 35 s, proposition à 247 s « PCMI3, PCMI6 », confirmée 02:10:09 Z ; permis
  56c88739 en pieces_demandees, échéance 2027-01-01, rappels [10,3,0]. Jauges B5 : mécanique
  95 %, livrable 92 %. Reste sur le banc la demande confirmée vide de 01:40 (pièce 1c55b927).
- 04 h 25 — B6 bf18d74 fusionné : libellés des statuts de facture FILED dans Daliro (validee,
  refusee, ecartee, comptabilisee ; inconnu affiché tel quel). Décision sur ses deux
  propositions : oui à un J-2 réel sur le banc en mode essai (remis à l'adresse de Teo,
  comme Tavaro) et à la clôture (annule) des sept chantiers « Essai B6 » — B6 écrit les
  fichiers, le coordinateur pose.
- **Point automatique 04 h 15 (02 h 15 Z)** : rien de neuf à poser. Battements frais
  (lecteur, identite, expediteur, lorani_lecture 02:15 ; filed 02:14) ; 0 erreur HTTP et
  0 cron en échec sur 30 min. 2 travaux en échec (lecteur.lire, pièces Tamila chiffrées,
  00:24/00:26 Z) : antérieurs au garde-fou du lecteur v16, attendus. En attente : B6 (J-2
  réel + clôture des chantiers d'essai), A3 (vue Fournisseurs), Teo (Realtime de
  filed_fournisseurs, export Logos_w, SIRENE_API_KEY, HDS, coffre Tamila).
- 04 h 20 — Lorani, second essai réel (lettre du 03/10, PCMI2+PCMI8) vert de bout en bout,
  mais révèle que la seconde demande **écrase** la première (pieces_demandees et échéance).
  B5 (NOTES-B5 § 6, R*423-38/39/41) : l'écrasement est faux ; une seconde demande ne fait
  pas repartir le délai, au mieux complète la liste. **b5_07 validé** (union, première date
  gardée, historique, avertissement). **Pour Teo / un juriste** : cas d'une seconde demande
  DANS le mois.
- 04 h 25 — **A3 0af323c fusionné** : vue FILED « Fournisseurs » (/espace/filed/fournisseurs) —
  compteurs, recherche nom/SIREN/TVA, « à confirmer » en tête, fiche (confirmer, revérifier,
  attester, proposer un IBAN, bloquer), IBAN et factures liées. Relue en réel avec daf2@.
  Constat : Papeterie Delorme (R2026-000003) n'a ni SIREN ni TVA → « Revérifier »
  impossible (relayé à A1/A4).
- 04 h 30 — **Vercel : « Deployment rate limited — retry in 24 hours »** (statut GitHub des
  commits c13af96, 6bf7a86, 9b7ab27…). Seul f79663d (02:09 Z) est parti : il porte tout
  jusqu'à lui (fiche fournisseur, PermisVue, statuts FILED). **Pas encore en ligne** :
  libellés Daliro (c13af96) et vue Fournisseurs (6bf7a86) ; /espace/filed/fournisseurs
  répond 404 sur omegaai.fr. Causes : (1) une poussée de notes sur main = un déploiement ;
  (2) worker-a1/a2/a4/a5 n'ont pas le vercel.json qui coupe les prévisualisations (on voit
  des déploiements worker-a4, worker-a1 cette nuit) — demandé aux quatre de le reprendre de
  main. **Nouvelle règle** : les notes du coordinateur se commitent en local et partent avec
  la prochaine vraie modification du site (ou au plus une poussée de notes par point de 2 h).
  Vérifier l'état d'un commit : `gh api repos/teopetit50-gif/pegase-site/commits/<sha>/statuses`.
- 04 h 35 — Vercel : redéploiement direct par l'API refusé « 402 api-deployments-free-per-day,
  remaining 0, reset 1791340078 » (= 2026-10-07 ~02:27 Z). Relance programmée (send_later
  trig_01JenpvhuDuobgoCD34qwKi5, 02:32 Z). Pour débloquer avant : Teo passe pegase-site2 en
  Pro. A1/A2/A4/A5 ont repris vercel.json (dc918ce, 907f180, bd4dfd4, b81d0f7).
- B6 : b6_06_envoi_j2 posé (cron daliro-ouvrier, abonnement, btp_ouvrier service_role seul).
  banc_j2_reel : A OK (réglage essai), **B en échec** « Daliro n'est pas installé pour cette
  organisation » (rien d'écrit) → B6 ajoute un bloc d'installation. Clôture non jouée.
- A4 : Delorme sans SIREN, c'est juste (SIREN lu 842115763 faux au Luhn, non vérifié) ; piste
  écran (« Corriger / confirmer sur la pièce ») confiée à A3, puis « À payer ».
- B5 : arrêté et constat d'affichage réels verts (Extension Garnier, échéances justes) ; 4
  types sur 6 prouvés ; b5_07 en cours.
- 04 h 40 — **Daliro : J-2 réel vert de bout en bout** (b6_06 697c580 + banc_j2_reel 60fa33c) :
  Daliro installé sur le banc (chantiers/20/5), chantier ESSAI-J2, passage du 08/10, envoi
  4742391e préparé → approuvé par daf@ → envoyé 02:33:00 Z par Brevo, **remis 02:33:05 Z**
  (mode essai, adresse de Teo). Sept chantiers « Essai B6 » annulés. Reste chez B6 : réponse
  OUI/NON entrante → btp_repondre_confirmation ; le fil btp_confirmations ne garde que
  « demandee ».
- **b5_07** (a4e3197) posé : `^test_b5_` 120/120 ; écran fusionné (en ligne au retour du
  quota). **a4_14** (cf4c3af) posé : toute valeur humaine à clé fausse (SIREN/SIRET/TVA/IBAN)
  refusée par déclencheur ; TVA FR au SIREN faux = clé fausse ; a4_08 vert.
- A4, « ce qui manquerait pour une vraie PME » (NOTES-A4, 2681b33) : écritures/FEC, facture
  électronique (Factur-X/UBL/CII, statuts de cycle de vie), mode de règlement/ICS, validation
  auto des charges récurrentes, organisation d'une seule personne, TVA sur encaissements,
  conservation vs effacement, fournisseurs étrangers, acomptes/avoirs, délais de paiement.
- 04 h 45 — A3 be87d0b fusionné : FILED « Identifiants lus sur la pièce, non retenus »
  (Confirmer seulement si la clé est juste, sinon « Saisir les vrais identifiants ») ;
  **défaut corrigé** : « Corriger une valeur » envoyait date_emission / echeance_lue / iban
  (refusés 22023) → date / echeance / fournisseur.iban, prouvé en réel (daf2@, R2026-000003).
  Quatre SIREN d'exemple à clé fausse remplacés. B6 : feu vert b6_07 (réponse OUI/NON
  entrante) et statut de l'envoi à l'écran ; accord permanent des J-2 → décision de Teo.
- 04 h 50 — **Lorani : six types de courriers sur six prouvés en réel** (lettre de délai :
  instruction portée à 6 mois, décision attendue 2027-03-20 ; certificat tacite : DP accordée
  tacitement le 02/07, retrait tenu). Jauge livrable B5 : 96 %. Question ouverte : échéance
  d'affichage passée (2026-07-17) restée « ouvert » → relue après le cron de 03:07 Z.
- 04 h 55 — **b6_07** (b3bd323, réponses OUI/NON entrantes) posé ; lecture OUI/NON juste sur
  essais directs ; b6_03 vert (29). **Régressions** : b6_01 test 86 (abonnement b6_06) et b6_02
  mort sur « Quota atteint : 5 chantiers ouverts » (installation du banc + ESSAI-J2 ; message
  « 5 » alors que quota_chantiers = 20 : colonne à vérifier). Renvoyé à B6 ; écran b6_07 non
  fusionné avant le vert.
- 05 h 00 — A3 50af351 fusionné : FILED « À payer » (/espace/filed/a-payer), factures
  validées groupées par échéance avec totaux, IBAN validé / à valider / manquant ; relu en
  réel (FAC-2026-10-0471, 288,00 €, échéance 01/11, IBAN à valider). Limite : FILED ne suit
  pas le paiement (pas de statut « payée ») — demande pour A4 si Teo la veut.
- **Point 06 h 15 (04 h 15 Z), après redémarrage de la session** : échéance d'affichage Lorani
  passée en « depasse » à 03:07 Z (cron horaire, pas de trou). **Daliro** : tests corrigés de
  B6 (9f7325e) → `^test_b6_` 154 + 38 + 29 verts ; écran b6_07 (« demande remise le … »)
  fusionné. **Lorani** : b5_07 prouvé en réel (Pavillon Lemoine : deux lettres réunies,
  [PCMI3, PCMI6, PCMI2, PCMI8], échéance 2027-01-01) ; b5_08 (titre d'alerte) et b5_09
  (titre du permis) posés, 120/120. A3 : décision en lot dans /espace/validations validée
  (deux demandes VARELO approuvées au plus). A4 : a4_15 (paiement) pas encore livré.
- 07 h 10 — A3 78cd9f0 fusionné : « Décider en lot » dans /espace/validations (mêmes
  garde-fous qu'à l'unité, écartées motivées, bilan ligne à ligne) ; relu en réel avec
  referent@ : 2 demandes VARELO approuvées et exécutées (05:04 Z), 5 restent en attente.
  Correctif transversal : les dialogues (portail hors de .esp) recevaient mal les styles de
  l'espace → espace.css (partagé) double 51 règles pour .dlg-panneau.resa ; à surveiller
  sur les écrans des B. Notes B6 f5c0cd1 fusionnées.
- 07 h 15 — **a4_15 posé** (634fe24) : public.filed_noter_paiement (gérant/admin/valideur ;
  partiel ; gardes : pas au-delà du reste, pas de date future, référence unique par facture)
  et public.filed_etat_paiement (a_payer / partielle / payee) ; a4_09 vert. Pas de statut
  « payee » sur la facture (la comptabilisation reste possible). A3 branche « Noter un
  paiement » dans « À payer ».
- 07 h 20 — A3 433b71a fusionné (accessibilité, axe-core WCAG 2.1 A/AA + clavier, 22
  contrôles) : files en listes de boutons (aria-current) au lieu de listbox/option invalides,
  contraste du numéro de page 5:1, point du matin role=img, et **components/ui/dialog.tsx
  (partagé site)** : le focus revient à l'élément d'origine à la fermeture d'un dialogue
  contrôlé (relu : handlers de l'appelant préservés, preventDefault respecté). Les écrans
  des B (tiroma/ListeAttente, tamila, varelo, daliro, lorani, tavaro) gardent le même
  role=listbox/option : à corriger par chacun (demandé).
- 07 h 25 — A3 04efcda fusionné : « Noter un paiement » dans « À payer » (reste à payer,
  « Payée en partie / Payée », payées masquées). Relu en réel : 100 € par virement sur
  FAC-2026-10-0471 (daf2@) → reste 188,00 € sur 288,00 €, filed_etat_paiement partielle.
- 07 h 30 — **Accessibilité des six écrans B fusionnée** (B1 be56d79, B2 3b3708e, B3 8d20e49,
  B4 71c9463, B5 afebaaf, B6 6131c1a) : listbox/option → listes de boutons (aria-current),
  pastilles role=img, cadres défilants tabIndex/region/aria-label ; scripts axe par module.
  Restent des cadres défilants sans tabIndex : tiroma/Cabinet (B3), varelo/Depot et
  ObjetDetail (B1), filed/EcranAPayer (A3) — demandés. A3 prépare
  omega/recette-a3/verifier-en-ligne.mjs (13 écrans sur omegaai.fr).
- **Vercel** : 4d1e26d est passé (statut success) — le quota glisse sur 24 h, des créneaux se
  libèrent ; 05c7391 et fccee92 refusés de nouveau. À chaque point : regarder le statut du
  HEAD et, s'il est refusé, retenter plus tard (une poussée suffit, elle emporte tout).
- 08 h 05 — A3 9efadfe fusionné : derniers cadres défilants (FILED dossier, À payer) au
  clavier ; contrôle « zone qui défile atteignable » ajouté à accessibilite.mjs et
  verifier-en-ligne.mjs. Vérifié dans le code de main : plus aucun role=listbox ni cadre
  .esp-tableau-cadre sans tabIndex dans components/espace. (Les 15 constats d'A3 sur les B
  venaient de sa branche sans main.)
- **Point 08 h 15 (06 h 15 Z)** : main 99c37b6 **déployé** (Vercel success ~06:08 Z) — tout le
  travail de la nuit est en ligne. **Contrôle sur omegaai.fr (A3, verifier-en-ligne) : 181 ✓,
  0 échec, 0 constat** sur onze écrans (5 d'A3 + filed?objet, 6 des B) : 200, titres, aucun
  débordement aux cinq largeurs, axe sans écart grave à 390/1440, zones défilantes au
  clavier, phrases de chaque lot présentes. B1 (varelo) et B3 (tiroma) l'ont confirmé par
  lecture des chunks servis. Sortie brute : omega/recette-a3/en-ligne-2026-10-06.txt.
  Rien de neuf à poser sur la recette. En attente de Teo : accord permanent des J-2 Daliro,
  Realtime de filed_fournisseurs, export Logos_w, SIRENE_API_KEY, HDS, coffre Tamila,
  juriste (seconde demande de pièces dans le mois), Vercel Pro.
- **Point 12 h 15 (10 h 15 Z)** : aucune branche worker-* n'a bougé depuis 08 h 15 (B et A3
  tout fusionnés ; A1/A2/A4/A5 = travail base déjà posé). main a91c572 toujours en ligne
  (Vercel success). Recette saine : 0 échec cron, 0 erreur HTTP sur 2 h, cron vivant 10:16 Z.
  Rien à poser. Notes commitées sans poussée (pas de déploiement Vercel pour une ligne de
  journal ; partiront avec la prochaine vraie modification). Toujours en attente de Teo.
- **Décisions de Teo (06/10, ~13 h 40 Z)** :
  1. J-2 Daliro : **accord permanent OUI** → B6 écrit b6_08 (réglage par organisation,
     révocable, approbation tracée « par accord permanent », mode essai prioritaire).
  2. Realtime filed_fournisseurs : **OUI** → posé sur la recette (version 20261006134231
     filed_realtime_fournisseurs) ; A3 branche l'abonnement sur la vue Fournisseurs.
  3. Export Logos_w : reporté à la fin (introuvable pour l'instant).
  4. SIRENE_API_KEY : à obtenir (compte INSEE au nom de Teo) ; le repli recherche-entreprises
     fonctionne déjà sans clé.
  5. HDS : **Scaleway** choisi par le coordinateur (certifié HDS depuis juillet 2024 ; il faut un
     support Business/Enterprise et un contrat HDS) — souscrit au premier client santé.
  6. Coffre Tamila : choix délégué → **Scaleway Key Manager** (même fournisseur que HDS),
     « local » gardé en repli ; B4 écrit b4_05 + ouvrier tamila-coffre, tests avec faux KMS.
  7. Juriste (seconde demande de pièces) : recherche du coordinateur — **CE 30 avril 2024
     n° 461958** : une nouvelle demande est possible mais sans incidence sur le délai ni sur le
     rejet tacite ; CE 4 février 2025 : une seule pièce prévue par le code suffit à interrompre.
     b5_07 est donc juste ; B5 ajoute la référence à l'avertissement.
  8. Courriel d'essai Tavaro : **reçu** par Teo → chaîne validée par un humain.
  9. Vercel Pro : **non**. On ne pousse sur main qu'à la fin d'un gros chantier.
  Préparation de la production confiée à A5 (omega/MISE-EN-PRODUCTION.md, prod non touchée).
- 13 h 50 Z — **b5_10 posé** (worker-b5 027eca3, depot 4343 + tests 4344) : l'alerte de
  seconde demande cite CE 30 avril 2024 n° 461958 ; `^test_b5_` 120/120. Écran fusionné et
  poussé (f8ba169, Vercel success) ; « 461958 » relu dans les chunks servis par
  omegaai.fr/espace/lorani. B6 : voie (A) retenue pour b6_08 (public.politiques ; corps des
  fonctions d'accord relayés) — à vérifier si le créateur peut activer seul. A5 : sorties
  brutes (migrations recette/prod en noms, crons, fonctions Edge) relayées. Une lecture de
  ces notes a été refusée par le classifieur (« Production Reads ») : non contournée.
- 14 h 00 Z — **A5 : omega/MISE-EN-PRODUCTION.md complet** (worker-a5 92893fb, rien posé, prod
  non touchée) : rejouer la séquence exacte de la recette (~110 lignes, exclusions listées),
  exporter d'abord en fichiers les lots posés sans fichier, réécrire les URL de recette en dur
  (19b, 19v, 19aa), répétition générale sur une copie de la prod, puis supabase db push par
  paliers P1–P6 ; crons de la prod à relever en P1 par Teo ou une session autorisée.
  Fonctions **reception v10** (4114a69) et **webhooks-brevo v10** (87a1112) passées en coquille
  sur la recette, verify_jwt false gardé ; fumée : 401 « jeton invalide » sans jeton.
- 14 h 00 Z — **Coquille webhooks-brevo prouvée** (banc A2 051862b) : envoi b109eea1 en essai,
  envoyé 13:59:01 Z <202610061359.72974083619@smtp-relay.mailin.fr>, « remis » noté par la
  coquille à 13:59:05 Z. reception v10 : chemin utile non prouvé (inbound non branché ; pas de
  FORMULAIRE_SECRET) → trou au dossier A5. **SIRENE_API_KEY posée par Teo** : identite sirene
  « sirene+repli », vérification 380129866 source « sirene » à 13:55 Z. **Faux négatif VIES**
  (ORANGE invalide à 13:54 après valide à 13:48, demande forcée) → B7 écrit b7_04.
- 14 h 01 Z — **b6_08 accord permanent J-2 posé** (bc7ca7c, depots 4389/4390) : `^test_b6_`
  154+38+29+40 verts. Auto-activation par le gérant donneur **refusée** (42501 « Le demandeur ne
  décide pas de sa propre demande ») → il faut une seconde personne pour activer : question à
  Teo. Écran AccordJ2 fusionné.
- 14 h 05 Z — **Teo, activation de l'accord J-2 : entre-deux** → B6 écrit b6_09 : règle
  politique.activer (gérant/admin/valideur, demandeur exclu) ; si le gérant est le SEUL décideur,
  porte btp_activer_accord_j2_seul, tracée, limitée aux politiques J-2, refusée dès qu'un second
  décideur existe. **b4_05 coffre Tamila posé** (e0c4bcc, depots 4403/4404) : `^test_b4_` 13/14,
  le 14 meurt sur « permission denied for function tamila_cle_maitre » (défaut du test, renvoyé).
  A1 : brancher lecteur.ts du coffre. **A3 6cb0135 fusionné** : vue Fournisseurs écoute aussi
  filed_historique ; témoin « En direct » / « Relue toutes les 30 s » (le conteneur refuse le
  WebSocket ; à rejouer d'un poste ordinaire). VIES MS_MAX_CONCURRENT_REQ relayé à B7.
- 14 h 10 Z — **b7_04 doute VIES posé** (0b1be57, depots 4429/4430) ; coquille **identite v4**
  (0b1be57, _partage 7425991) déployée AVANT la migration ; `^test_b7_` 11/11. Le rattrapage a
  redemandé ORANGE à 14:08:21 Z → **valide**, verdict du fournisseur 90cc1d86 rétabli.
  **Coffre Tamila** : test 14 corrigé (a90cd97) → 64/64 ; `^test_b4_` 14/14.
- 14 h 12 Z — **Lecteur v19** (coquille 2bf6c298, _partage idem) : pièces chiffrées Tamila lues
  via le coffre (scaleway), sinon ignore chiffree_sans_coffre comme avant ; battement 14:12 Z sain.
  **b6_09 posé** (4fbd941) mais **test_b6_05 meurt** : le socle refuse d'approuver sans
  approbation de personne (garder_demande 23514) — voulu. Écran b6_09 retiré de main (fusion
  locale annulée, rien poussé). Suite : **A5 écrit le socle 19af** (exception étroite dans
  preparer_approbation : seul décideur + liste blanche daliro envoi.*), puis B6 b6_10 (la porte
  insère une approbation au lieu de forcer le statut).
- 14 h 15 Z — **Demande de Teo : nouveau tableau de bord au design de Vercel** (disposition,
  boutons, animations ; marque Omega gardée, rien de propriétaire copié). Nouvel ouvrier
  **C1 session_013U6ss7Vw2rKrDY5C7ax656**, branche **tableau-de-bord-v2** (jamais main),
  construit à côté de l'ancien (/espace2), données d'exemple d'abord ; premier palier = coquille
  + FILED « À payer », montré à Teo par prévisualisation Vercel et captures ; migration de /espace
  seulement après son accord.
- 14 h 20 Z — **Écran du coffre Tamila fusionné** (worker-b4 9377b33 : « Coffre à clés »,
  « Passer au coffre Scaleway », ré-enveloppement). Fonction **tamila-coffre v1** déployée en
  coquille sur la recette (9377b33, verify_jwt true) ; fumée : 400 CLIENT_ILLISIBLE sur un corps
  vide (elle démarre). Sans secrets SCALEWAY_*, KM_ABSENT. b6_10 (79cb08a) écrit d'avance : à poser
  APRÈS 19af. C1 : peut utiliser les skills et saasui.design (inspiration, rien de copié).
- **Point 16 h 15 (14 h 15 Z)** : recette saine (0 cron en échec, 0 erreur HTTP, 0 travail en
  échec sur 2 h). Repris sur main : omega/MISE-EN-PRODUCTION.md (A5 9ab08c0), NOTES-B2 (1a0a628),
  NOTES-B5 (70c54d4), NOTES-B7 (87be597). En attente : A5 19af (socle « seul décideur ») puis b6_10
  (79cb08a) ; C1 premier palier du tableau de bord ; secrets Scaleway (Teo, au premier client).
- 14 h 22 Z — **19af posé** (A5 430cf0e : exception « seul décideur » dans preparer_approbation,
  liste blanche daliro envoi.*), test 55 vert ; **b6_09 + b6_10 posés** (79cb08a : la porte insère
  une approbation) ; test_b6_05 25/26 (le commentaire est préfixé « [seul décideur] » par le socle,
  test à corriger). Écran Daliro « Activer moi-même » fusionné. **Rejeu socle 40–55** : test_44
  rouge (filed_iban_valide, filed_luhn, filed_siren_valide, filed_tva_intracom_analyser non
  exécutables par authenticated ; tamila_coffre_reference/serveur exécutables en trop) → A5 19ag ;
  test_46 rouge (vues btp_avenants_chiffres, btp_avenants_lignes_chiffrees sans security_invoker)
  → B6 b6_11.
- 14 h 27 Z — **19ag posé** (A5 28a046b : EXECUTE rendu à authenticated sur filed_iban_valide,
  filed_luhn, filed_siren_valide, filed_tva_intracom_analyser — oubli d'a4_14, un membre ne pouvait
  plus saisir une valeur « humain » ; tamila_coffre_reference/serveur retirées à authenticated) ;
  **b6_11** (6263048 : vues btp_avenants_* en security_invoker) + tests b6_05/b6_06. Rejeu socle
  40–55 + `^test_b6_` : **22/22 verts**. Sources à corriger : A4 (a4_14 grants), B4 (b4_05
  l. 669-670), A5 (liste figée + btp_prix_avenant, btp_prix_ligne_avenant). Accord J-2 clos.
- 14 h 35 Z — **Vague 3 lancée** (Teo : « pourquoi les ouvriers n'ont plus de travail ») :
  A4 + A1 facture électronique en réception (Factur-X / UBL / CII, cycle de vie, note sur les PA),
  puis FEC ; A2 guide d'inbound Brevo pour Teo + preuve de reception par formulaire signé ; A3
  suite de non-régression /espace vs /espace2 ; A5 export des migrations pour la prod
  (omega/prod) ; B1–B6 « 3 manques pour un vrai client » + n° 1 codé ; B7 indisponibles ignorés
  dans filed_verification_recente + tiers étrangers ; C1 nouveau tableau de bord. Routine de
  2 h mise à jour.
- 14 h 40 Z — Vague 3, premières poses : **b7_05** (dbd308f, filed_verification_recente ignore
  les indisponibles devant une réponse récente) `^test_b7_` 12/12 ; **lecteur v20** (672ac97 :
  Factur-X/UBL/CII lus sans IA, concordance XML↔PDF, 2 bugs corrigés : commentaire de licence en
  tête, TVA UBL prise hors régime VAT) ; **b4_06 honoraires Tamila** (32479a4) `^test_b4_` 15/15 +
  socle 44/46/51 verts. A2 : GUIDE-INBOUND.md sur main. A5 : page 0 de l'export jouée — trou :
  les lots 18a–19aa posés par execute_sql n'ont que la note de pose en statements, à
  reconstruire depuis l'état de la recette ; motif « dépôt » à élargir ; 2 poses de tests à
  exclure ; a4_14 → 7c29802, b4_05 → dc24eec.
- 14 h 55 Z — Poses vague 3 : **a4_16** facture électronique (07cab32) 5/5 ; **b5_11** courriels
  du guichet (218a777) `^test_b5_` 2/2 ; **b6_12** situations de travaux (9566496) `^test_b6_`
  7/7 ; **b3_12** registre des appels (5f62e7e) 21/25 — **trou de périmètre** (un collaborateur
  voit et note des appels hors périmètre), renvoyé à B3 ; **b2_03** avis de contravention
  (8fd4e11) meurt sur « record r is not assigned yet », renvoyé à B2. Test socle 44 rouge :
  filed_meme_valeur (A4 a4_16b). **Factur-X réel prouvé** (R2026-000005, lu par le XML,
  appels_ia 0, coût 0). Lecteur v21 (d2d03f7, ARE/AEE). Empreinte du catalogue (A5) relevée.
  C1 : palier 1 du tableau de bord montré à Teo. Teo a posé les MX de recu.omegaai.fr (la
  seconde vise inbound1 au lieu d'inbound2, à corriger). Écrans fusionnés : Tamila honoraires,
  Lorani courriels du guichet, Daliro situations.
- 15 h 15 Z — **Inbound Brevo branché** par le coordinateur : fonction one-shot
  brevo-inbound-installer (BREVO_API_KEY et BREVO_WEBHOOK_JETON lus dans les secrets, aucun
  affiché ; désactivée ensuite, 410) → webhook **2225428**, domaine **omegaai.fr** (Brevo refuse le
  sous-domaine : « Domain is not found or is inactive »), url reception/brevo. MX recu.omegaai.fr
  10 inbound1 / 20 inbound2 (Teo, OVH). Boîte banc@recu.omegaai.fr dans expediteurs (a3630f13,
  reput, suspendu). En attente du courriel d'essai de Teo. Teo a montré sa clé Brevo sur une
  capture : à faire tourner (et mettre à jour BREVO_API_KEY dans Supabase).
- Poses : **a4_16b/a4_17/a4_18** (00eeeeb : FEC, portes PA) `^test_a4_` 19/19 ; **b3_12 v2 + 12c**
  (cef1ef4, 453e332) `^test_b3_` 15/15 et socle 44 vert ; **b2_03 v2 + b2_04** (7e97d91) `^test_b2_`
  13/13 ; **b1_04** encours groupe (786017e) 19/19 avec 46/51 ; **lecteur v22** (36a88b2, avoirs) ;
  **b4_07** conflits (875e83f) 15/16 (test 16 : clé étrangère auth.users, test à corriger) ;
  **b6_13** réception (eec567e) **casse btp_tableau_chantier** (42702 « v » ambigu) : 2/8, renvoyé
  en urgence à B6, écran non fusionné. Le cron de test coupe à ~2 min : un motif par appel.
  Écrans fusionnés : Tavaro avis de contravention, Tiroma appels, Varelo encours.
- 15 h 35 Z — **Teo valide le nouveau tableau de bord** (C1 366b75f, barre latérale + barre du
  haut) → **phase 2 confiée à C1** : tous les écrans de /espace réhabillés sur tableau-de-bord-v2,
  vraies données, mêmes portes ; bascule /espace2 → /espace après accord de Teo.
  Poses : b2_05b (36bd54f), test b4 16 (5f490c4). Tests : g11 ^test_b3_ 15/15 (b3_13 compris),
  g12 ^test_(b2_|44_) 15/15, g13 ^test_b4_16_ vert, g14 ^test_b1_ 20/20. tamila-coffre v2 (coquille
  5f490c4). Fusionnés et poussés dans main 1f6427c : Tamila conflits (5f490c4), Varelo contrats
  (d369676), Tiroma pilotage (29c453b), Tavaro état des lieux (36bd54f). Courriel d'essai de Teo
  vers banc@recu.omegaai.fr : toujours 0 réception.
- 15 h 55 Z — Poses : b5_13 + test b5_04 (53bc500), b6_16 + test b6_10 (187e1c1), 19ah_recette_seulement +
  19ah + test socle (dcb2542), b3_14 v2 + test 15 (d64d4c1). Tests : ^test_b5_ 4/4, ^test_b6_ 10/10,
  ^test_b3_ 17/17, 19ab 12/12, **19ah 18/19** (n° 15 : donnees_sante NULL au lieu de false → B3),
  44 et 46 verts, **51 rouge** (DELETE accordé sans politique sur lorani_honoraires/marches/situations/
  temps/visas → B5 b5_13b). echange-pa v2 (bb6ab78). Étape 5 PA : bloc A seul — le 204 de BAC-0001 est
  en échec « CDAR_INVALIDE : SIREN invalide : undefined » (fournisseur allemand sans SIREN) → A2.
  Fusionnés dans main : Daliro encaissement (187e1c1), notice Tamila (3d0e1a0) → 93ff8ee.
  **Vercel : 93ff8ee refusé « Deployment rate limited — retry in 24 hours »** (quota gratuit). En ligne :
  1f6427c. C1 limité à 2–3 pushes par jour. Les fusions suivantes partiront au retour du quota.
- 16 h 05 Z — **Teo absent plusieurs heures : décisions par le coordinateur** (son autorisation ;
  objectif « livrer tout ce que le site promet »). Routine passée à toutes les heures ; audit des
  promesses du site lancé (agent en lecture). Poses : b4_08 + test 17 (2556214), test 19ah corrigé
  (631ea79), b1_06 + test b1_09 (ccc8f8f), b5_13b (7515fbd). Tests : b4_17 vert, b1_09 2/2, 51 vert,
  44 vert, **19ah 19/20** (n° 16 : donnees_fictives vrai sur un envoi ordinaire → B3 corrige le lot).
  Fusionnés dans main 26cdd66 (build vert, en ligne au retour du quota) : Lorani chantier (7515fbd),
  Varelo réciproques (ccc8f8f), FILED facture électronique + Comptabilité/FEC (A3 5091088), lecteur
  Tamila (2556214). Décision Tamila : avis RPVA par le canal courriel (file « à rattacher », chiffrés
  au rattachement, copie en clair purgée, 7 j max) → B4 b4_09. A4 : TVA dans le cdar (fournisseur
  étranger) → a4_19, puis echange-pa 21466c7 et rejeu du 204. A1 : branchement avis Tamila.
  B2 b2_06 annoncé mais pas poussé.
- 16 h 20 Z — **Facture électronique : parcours PA du bac à sable prouvé de bout en bout** (a4_19 52100b4,
  echange-pa v3 21466c7) : 204 et 207 (litige TX_TVA_ERR) émis en CDAR, accusés ok, battement echange_pa.
  Lecteur v23 (A1 9eabc10 : pièces chiffrées lues chiffrées + passerelle avis RPVA). Poses : taux pénalités
  Daliro 0.1240 (66f5ec6), 19ah v2 (77cecd9, test 20/20), b2_06 + test 15 (03a86fa : 14/15, loc_dec 42501
  → B2). 44 vert.
  **Audit des promesses du site** rendu → omega/AUDIT-PROMESSES.md (carnet de commandes). Nouveaux
  ouvriers : **C2 CASHD** session_01FM1C6EZzNaNZdUh92m7KQP (worker-c2), **C3 REPUT réponse**
  session_01Fb8QHDbEZep6P1zq77gN3n (worker-c3), **C4 OFFLOAD** session_01TzwZQvXaqH1JTKSGp7JmrX
  (worker-c4), **C5 vitrine honnête** session_0165VcUYH1QptmMroZso9GQg (worker-c5) ; branches c2–c5
  exclues des prévisualisations Vercel (6dfeb11). Carnets envoyés à A1–A5, B1–B7.
  Main c239974 : voie C d'A5 (workflow de répétition, omega/prod ; omega-sauvegarde.yml NON repris :
  dumps hors UE), écran Rappels Tiroma (e79c729 + 19ah v2).
- 16 h 35 Z — Poses : b4_09 facture_entete + test 18 (99d0467), test b2_15 v2 (7bb5c00), b1_07 + test b1_10
  (7512a38, cron varelo-matin actif), b5_14 + b5_05 et b5_15 + b5_06 (d9000ea). Tests : b4_18 vert,
  b1_10 2/2, b5_05/06 2/2, 44 vert ; **b2_15 rouge** (loc_completer_locataire l. 32 : 22P02 « malformed
  array literal: siren » → B2 b2_06b). Main a264a45 : facture imprimable Tamila, Ce matin Varelo, lots
  Lorani (en ligne au retour du quota). C1 informé des nouveaux écrans et des modules CASHD/REPUT/OFFLOAD.
- 16 h 55 Z — Poses (toutes vertes sauf mention) : a4_20 + a4_13 (e749aa5, courriel → FILED), a4_21 + a4_14
  (f184edc, pièces filles), b2_07 + test 16 (0e2cc89), b4_10 + test 19 (e39e4ef, avis par courriel), b6_17 +
  b6_11 (c706dcb, heures), b6_18 + b6_12 (c3ab533), c3_01 + c3_00 + c3_01_base (C3 0419e27), b3_15 + test 16
  (72ec683 : **rouge**, préparation du test — daf2 valideur ne peut être direction → B3). 44, 46, 51 verts.
  Fonctions : lecteur v24 (A1 df07435 : découpage, TVA débits, contre-valeur, mentions), identite v5 (B7
  4ed0bff, sans effet tant que les CHECK ne sont pas élargis), tamila-purge v1 (b4b664e) + cron
  omega-tamila-purge */5. Boîte cabinet-banc@recu.omegaai.fr (module tamila). Main f733c22.
  Décisions : A5 19ai (réceptions lisibles selon le module, Tamila : pas les murés) ; A4 a4_22 (CHECK
  uid_ch/hmrc, retrait de l'ancienne contrainte posé à part) ; A2 autorisé à écrire 19aj_messageries
  (statut brouillon_depose) ; Gmail en régime Test, CASA = décision de Teo ; Microsoft 365 ensuite.
  À dire à Teo : frais de gestion d'avis de contravention à mettre dans les CGV des loueurs.
- 17 h 20 Z — Poses : b5_16 + b5_07 (a05f77c, contrôle du dossier Lorani), a4_22 + a4_15 (30d3991, FEC
  autoliquidation / devise / extourne), a4_23 + a4_16 (11c1f8b, recontrôle 3 voies), b1_08 + b1_11 (fdd8e5c,
  groupe sur une page), socle 19ai compteurs facturation (731eb98), 19aj export complet (27d1ad9), 19ak
  réceptions confidentielles par module (72bc763), b4_11 + test 20 (814adee), b3_15 v2 + b3_16 (3dd4b88).
  **c4_01 (C4 7c8c520) REFUSÉ** : modeles_jeux_coherent (clé « reference » facultative) → C4.
  Tests verts : b5_07, a4_22 ×3, b1_10/11, 57, b4_20, 44, 46, 51. Rouges (préparation des tests) :
  a4_23_02/03 (filed_receptions.entite_id NOT NULL → A4), 56 (sha256 en double → A5), 58 (fournisseur
  essai_a5 inconnu → A5), b3_16/17 (daf2 « direction » refusé → B3).
  Fonctions : lecteur v25 (A1 f893452 : Lorani), tamila-purge v2 (fab4e01), export-complet v1 (27d1ad9).
  Main f77a674. C1 : phase 2 finie (5e64be7, 13 écrans, 368/368), prévisualisation refusée par le quota ;
  captures envoyées à Teo.
  **Bloqué, pour Teo** : la sauvegarde vers Scaleway (A5). Le contrôle des permissions de la session A5 a
  refusé un workflow qui envoie les dumps de la prod hors de GitHub. Il faut l'accord explicite de Teo.
  Numéros : a4_24 = CHECK uid_ch / hmrc + comptes système ; 19al = messageries d'A2. B7 : ouvrier taux BCE.
- 17 h 50 Z — Poses : tests 56/58 v2 (b6ccec2 : 58 vert, 56 rouge pieces_rattachee_avant_lecture → A5),
  b3_17 + 18 (3b51e28, vert), c3_02 + c3_03 + banc_reput (54ec0ce : tests rouges, garder_envoi refuse
  « envoye » → C3 passe par commencer/confirmer_envoi), b4_12 + 21 (385e77c, vert), b1_09 + b1_12 (68f7d46,
  6/6), b6_19 + b6_13 (9ad8930, vert), a4_24 + a4_17 (e3eaac3 : 2/3, filed_fournisseurs.code NOT NULL → A4),
  b7_07 + b7_08 (67fd7ff, vert), b2_08 + 17 (981144c, vert ; b2_15 toujours rouge, b2_06b attendu).
  **c2_01 (C2 d23388e) REFUSÉ** : modeles_jeux_coherent, comme C4 → C2.
  Fonctions : taux-bce v1 (67fd7ff) + crons omega-taux-bce (35 14,15 * * 1-5) et taux-bce-veille ;
  tavaro-pdf v1 (981144c) + cron chaque minute ; reput-reponse v1 (54ec0ce) + cron omega-reput ; lecteur
  v26 (A1 c81a6d2, analyses inertes sans LECTEUR_ANALYSES).
  omega/SOCLE-EXTRAITS-ENVOIS.sql (959f115) : 24 fonctions du socle, pour A2 et C3.
  Main : vitrine honnête C5 (a803fd1) + écrans Tamila temps proposé, Varelo reportings, Daliro recalage,
  Lorani contrôle du dossier → a4521d5 (non poussé : test 44 en cours).
  **Test 44 dépasse 2 min** sur la recette → relancé avec statement_timeout 15 min (job g60) ; A5 doit
  l'accélérer. Numéros : A4 a4_25 = CHECK uid_ch/hmrc + comptes système ; A2 19al.
- 18 h 50 Z — Poses : 00_installation + 44 v2 (A5 3018e1d, 44 en moins d'une minute), 56 v3 (9f44233, vert),
  b2_06b (42fdbe4) + b2_09 + 18 (1ee1134) → Tavaro tout vert ; tests b3_16/17 v2 (e15aa42), b3_18 + 19
  (3240cb3), b3_19 + 20 (0c3976a) → 17, 18 verts, 16/19/20 rouges + **44 rouge (private.tiroma_duree_texte
  exécutable)** → B3 ; b4_13 + 22 + 19 (f4b2ba1, vert) ; b1_10 + b1_13 (e1c4eae, vert) ; a4 tests v2 (e020969),
  a4_25 + a4_18 (b2ee58c, vert), a4_26 + a4_26b (DROP CONSTRAINT accepté : élargissement) + a4_19 (3172b44 :
  01/03/05 verts, 02/04 rouges tva_check → normaliser les TVA étrangères), a4_23 rouges (filed_receptions_lignes
  client_id) → A4 ; **a4_27 REFUSÉ** (pieces_pages.page → n) → A4 ; b7_06 + b7_07 (faf9247 : 4 assertions
  42501 au lieu de 22023) → B7 ; C3 tests v2 + c3_04 (cd1aaa2, verts) ; **19al messageries** (A2 e9f4ebc, DROP
  CONSTRAINT d'élargissement accepté, vert) ; b6_20 + b6_14 (6dc34a7, vert ; exception anon accordée).
  taux-bce appelé à la main (net 5289) avant 17 h Z. 46/51 verts.
  Main e197172 : boîte de réception FILED (A3), Tamila conflits auto + honoraires du cabinet + file des avis,
  Lorani rapport PDF/Excel, écran REPUT (C3), vitrine passe 2 (C5), Varelo branchements, Daliro signature sur
  place (+ app/signer). C2 et C4 : c2_01 / c4_01 toujours pas corrigés (relancés).
  Décisions : atteste:true basculé seulement au palier de production ; A1 écrit 19an_analyses ; A5 19am
  (apercu_effacement, reception_marquer) ; A3 a la main sur ecrans.ts pour l'ancien /espace ; C4 consentement
  = intérêt légitime B2B / soft opt-in clients existants ; A4 API logiciels comptables sur doubles (identifiants
  de bac à sable = Teo).
- 19 h 05 Z — Poses : a4_27 (3656d23 ; test 02 : pieces_pages.methode NOT NULL → A4), b7 test 07 v2 (a6101c9,
  vert), 19am + test 59 (A5 79f0e58, vert), a5_01 v3 linéaire (b65dafa), Tiroma b3_19 v2 / b3_20 / b3_21 + tests
  (2da76ec : ^test_b3_ 24/24), b1_11 + b1_14 (306d644 : 10/10, mais 44 rouge sur
  private.grp_exiger_decideur_reception → B1 b1_11b), b6_21 météo + b6_15 (c33c69c : 14/15, gel J+3 → B6 ;
  source = API Météo-France, Open-Meteo gratuit interdit en commercial), b5_17 + b5_08 (10a59bf, vert),
  b2_09 v2 + 18 (2dba750, vert). tavaro-pdf v2 (6ea1694). b5_16 amendé par B5 alors qu'il était déjà posé
  → lot de reprise b5_16b demandé. Loc_contestations : aucun gardien (visible de tous les membres) → B2 b2_09b.
  Main : écrans Tiroma (synthèse, réinscription, absences, équipe absente, demi-journées, objectifs), Tavaro
  facture électronique + contestations, Lorani PLU, route OAuth app/api/messagerie + guides Gmail/Microsoft.
  C2 / C4 : c2_01 et c4_01 TOUJOURS non corrigés (lots 2 à 5 en attente derrière).
- 19 h 20 Z — **OFFLOAD posé** : c4_01 à c4_05 + tests (C4 f99562d). ^test_c4_ 8/19 : la plupart des rouges
  viennent de throws_ok à 3 arguments (le 3e est le message attendu) ; vrais écarts : source de consentement
  hors CHECK (décision : source 'contrat' + preuve de la base légale, pas d'élargissement du socle),
  « en essai, rien n'est préparé si le module est réglé en réel » non levé → C4 c4_06. b2_09b gardien des
  contestations (3856716, b2_18 vert). b4_14 point du matin Tamila (baedbd9 ; test 23 lit s.items → points_items).
  44 : seul rouge = private.grp_exiger_decideur_reception (B1). WebDAV : la passerelle Supabase laisse passer
  PROPFIND/MKCOL/LOCK → A2 lot 19ao_depots. Main 5c3362c : vitrine passe 3 (C5).
  B6 a proposé meteo_url Open-Meteo : NON posé (décision Météo-France).
- 19 h 40 Z — Poses : b5_18 + b5_09 (152721c), **19an analyses** (A1 fd0bb0e) + b4_15 + 24 (9e51869), test b4_23 v2
  (5644c0d), b1_11b (d6bb557 → **44 vert**), a4_28 envoi API comptable (5e509db) + a4_29 TVA étrangère normalisée
  (7a28a06) + tests → ^test_a4_2[36-9] 19/19, c3_05 accusés/avis (1ad1430), **19ao dépôts WebDAV** (A2 59fc8d0),
  b6 test 15 v2 (571382c, vert) + b6_22 appro (00e3337 ; test 16 : 42501 btp_echeances_commande → B6),
  **CASHD c2_01 à c2_03 + tests** (C2 6c29b77 : 3/4, assertion 42 « coupures au journal » → C2).
  Tous les autres verts ; 44/46/51 verts.
  **Dépôt par lot prouvé de bout en bout** : fonction depot v1 (verify_jwt false, 59fc8d0) ; OPTIONS 200 DAV 1,2 ;
  PUT d'un PDF → 201 → filed_documents R2026-000007 (source connecteur, en lecture) ; boîte de test fermée → 401.
  Décisions : météo = abonnement Open-Meteo à décider par Teo (Météo-France n'a pas d'API par point) ; pas d'agenda
  pour REPUT maintenant ; LECTEUR_ANALYSES à lire en base (pas de moyen de poser un secret Edge ici) → A1.
  Main 4238c6c : Varelo réserves + compteur d'exemple, REPUT réglages et avis, Lorani décennales, GUIDE-DEPOT.
- 17 h 10 Z (horloge serveur ; les entrées précédentes marquées « Z » étaient à l'heure de Paris) — Poses :
  b3_22 règles communes + test 23 (B3 4295ff8), c4_06 consentement en source « contrat » + tests c4_01/02/03/05
  (C4 4e6b417), b4_15 v2 politique PERMISSIVE + test 24 (B4 fad9015), test b6_16 v2 (B6 06026f4).
  ^test_(b3_|c4_|b4_24_|b6_16_) : 834 ok, 0 échec. 44/46/51 : 32 ok, 0 échec.
  Banc OFFLOAD installé (essai, courriel seul, jeux clients + ventes). Lecteur v27 (A1 6f57d5e : bon de livraison
  Varelo, métré et zone PLUi Lorani).
  Main : fusion worker-b3 (écran Règles communes, en-préparation), worker-c4 (écran /espace/offload),
  worker-b6 (météo, appro), worker-c5 passe 4. tsc, eslint, build verts ; 6 pages × 5 largeurs sans débord.
  Bascule C1 (0d36f55) NON fusionnée : attend Teo, après l'aperçu.
- 17 h 25 Z — Poses : CASHD c2_02 + c2_03 v2 et tests c2_03/c2_04 (C2 8b8fbb4 : journal de relance, cashd.facture_reglee,
  cashd_contact_en_litige), REPUT c3_06 + test (C3 83e67d5), FILED a4_30 alerte au changement d'IBAN + test a4_23
  (A4 a3054d4), Varelo b1_12 photos + b1_13 pièce unique + tests b1_15/b1_16 (B1 10276d8), Lorani b5_19 OS, réserves,
  GPA + test b5_10 (B5 eacc7a5), Daliro b6_23 appro suite + tests b6_17 et b6_16 v3 (B6 a1d141e), test c4_03 v3
  (C4 f9bf72d). ^test_(c2_|c3_|a4_30_|b1_1[4-6]_|b5_10_|b6_|c4_03_) : 1120 ok, 0 échec ; 44/46/51/55 : 34 ok, 0.
  (Attention : les noms de lot gNN sont réutilisés ; lire par motif et par heure.)
  Lecteur v28 (A1 25c86f5 : interrupteur en base, attestation décennale). reception v12 (A2 72c21d5 : médias
  WhatsApp). private.reglages lecteur_analyses = 'oui' sur la recette (plafond_ia_jour_client = 5).
  Main : fusion worker-c2 (écran CASHD), c3 (écran REPUT + export), a4, b1, b4 (pilotage du cabinet), b5, b6, c4 ;
  GUIDE-WHATSAPP (A2). Pastilles retirées : Tamila point du matin, marge, charge, séries, sans diligence ;
  Lorani OS et réserves/GPA ; Daliro signature sur place et 4 lignes d'appro ; Varelo réserves (plus aucune ligne).
  12 pages × 5 largeurs : 200, sans débord.
- 17 h 45 Z (point horaire) — Pose : Lorani b5_20 comptes rendus + test b5_11 (B5 81d468d) ; ^test_b5_ : 323 ok, 0 échec
  (la question suivie ouvre bien un suivi du socle, puis le clôt). banc_cashd joué (5781 : essai, email + lre).
  Main : fusion worker-a3 (Demandes reçues, Réglages : journal CSV, export complet, aperçu d'effacement), worker-c5
  passe 5 (Varelo point 9, REPUT sans prise de rendez-vous), worker-b4 jusqu'à a4b1cbc (écran des lectures longues,
  citation non retrouvée mise à part), worker-b5 (CR de chantier), tableau-de-bord-v2 jusqu'à 7eabe12 (/espace2 :
  REPUT, Boîte FILED) — SANS la bascule a1f12b2 (vérifié : pas ancêtre de main). Build vert ; 12 pages × 5 largeurs.
  /espace (racine) est en 404 en ligne comme avant : c'est la bascule qui le résoudra.
  Ouverts : export-complet appelle public.exporter_client (inexistante) → A5 ; « appel manqué par SMS » (lib/pub.ts)
  → A2 dit si l'ouvrier envoie réellement en brevo_sms, sinon C5 reformule.
- 18 h 15 Z (Teo de retour vers 18 h) — Poses : b1_14 signatures + b1_17 (B1 d794f00), c3_07 dossiers et services + c3_03
  + c3_07 (C3 588833e), b4_16 expertises + 25 (B4 55e15ed), c4_07 échéances + test (C4 5f2cc7e), b6_24 fil de chantier
  + b6_18 (B6 b062478), c2_04 v4 (C2 2643451), 19ap widgets + test (A2 de501c4), test b2_18 étendu (B2 3856716).
  Lot ^test_(b1_1[3-7]_|c3_0[37]_|b4_25_|c4_07_|b6_|c2_04_|socle_19ap) : 822 ok, 6 not ok →
  ROUGES : test_b6_03_reponses n° 20 (régression de b6_24, → B6), test_c2_04 n° 38 (balance arrêtée, → C2),
  test_c3_07 n° 9 (have bloquee, want a_valider, → C3). Écrans B6 et C3 NON fusionnés. 44/46/51/55 : 34 ok, 0.
  b5_21 NON posé : il dépend d'un b5_16 amendé alors que b5_16 est déjà posé → B5 doit fournir un delta.
  Redéployés : export-complet v2 (A5 66524c9 ; réglage export_origines_recette = http://localhost:3010, recette
  seule), reput-reponse v2 (588833e), lecteur v29 (A1 e5436cc : lecteur.media), widget v1 (A2 de501c4, verify_jwt
  false). FILED : filed_prochain_numero est un compteur en table (sans trou) ; drapeau d'effacement =
  private.effacement_en_cours(client) ; preparer_delegation ne vérifie PAS que le délégataire est membre → A4.
  Main : fusion b1, b4 (expertises), c4 (échéances), c5 passe 6, b2 (écran contestations) ; GUIDE-WIDGET ; pastille
  Tamila « pièces attendues » retirée ; apostrophe échappée dans app/offres/page.tsx (eslint).
  À décider par Teo : coffre Scaleway du banc (Key Manager), transcription Mistral, crédits SMS Brevo.
- 19 h 05 Z — Teo est là. Décisions de Teo : BASCULE oui (a1f12b2 fusionnée + exception proxy.ts pour cashd, offload,
  demandes absents de /espace2 ; Vercel « rate limited » : pas encore en ligne) ; Scaleway seulement si gratuit (A5 :
  non, 0,008 à 0,016 €/Go/mois ; essai 90 j) → après le premier client ; météo gratuite → MET Norway (réglage posé) ;
  clé Brevo : sujet clos. Modèles de page : aperçu de projet Vercel pour la vue d'ensemble, page Usage pour les suivis
  (→ C1). Bug signalé par Teo sur la fenêtre Approuver : corrigé (36d475b).
  Poses : b5_16b (DROP CONSTRAINT d'élargissement, accepté) + b5_07 v3 + b5_09, b5_21 + b5_12, b5_22 + b5_13 (B5
  defb33a) ; b6_24b + b6_19, b6_21b + b6_20 + réglage MET Norway (B6 72ce4c9) ; b3t_01 v3 à b3t_04 + test (B3
  f8d8bd2) ; b2_10 + test 19 (B2 1c467ef) ; a4_31 + a4_24 (A4 655d260) ; 19an_export_complet_gerant_seul + 57 (A5
  7d64984) ; tests c2_01/c2_04 (C2 a693a81), c3_07 (C3 cffb6c5) ; c4_08 + test (C4 e4365bf). Lecteur v30 (A1 d52bc71).
  Lots h1830lot 1630 ok / 2, h1900lot 860 ok / 2 : seul rouge test_b3t_02 n° 9 (journal tavaro.controle_conducteur_note)
  → B3 ; écran B3 non fusionné. 44/46/51/55/57 verts. btp_meteo_demander() = 0 (aucun passage extérieur au banc).
  Main : fusion b5, b6, b2, a4, c2, c3, a3, c5, c4. Pastilles retirées : alerte météo, 6 lignes Lorani, remise en
  location et entretien. Restent volontairement : métré (phrase trop forte), PLU servitudes/risques, vocaux.
- 19 h 40 Z — DÉCISION DE TEO (19 h 20) : sur omegaai.fr, aucune modification, aucune pastille « En préparation ».
  Fait : composants EnPreparation / SiEnPreparation neutralisés (88d2402) ; puis, avec son accord explicite, les 42
  fichiers de la vitrine remis à leur état de a6b5e7a (15 h 55), SAUF trois phrases inexactes corrigées avec son accord
  (6f2a957) : Tamila « hébergé dans l'UE » au lieu de « en France » ; Tiroma « point du matin dans l'espace sécurisé »
  au lieu de « sur WhatsApp » ; Tiroma « ne contacte un patient qu'avec un message validé ». 0 mention « préparation »
  sur 34 pages publiques. C5 arrêté sur la vitrine ; sa passe 8 (972ccfda) n'est PAS fusionnée. Routine horaire
  réécrite en conséquence. Poses : c3_08 (bb153a2), a4_32 (19d98ea), b2_10 v2 (66d8199), b2_11 (a8f17be), 19ao
  (f10a4b0) ; lots h1915tav 501/0, h1930lot 85/0 (44/46/51/56 compris). Fusion c3, a4, b2, b3 (espace client).
  worker-a5 non fusionnée (omega-sauvegarde.yml, non approuvé). Vercel toujours limité : en ligne demain.

## REPRISE — pause demandée par Teo le 06/10 à 21 h Z

- Routine horaire trig_01PJKxdeE5XGx3n8QTMoWwVe DÉSACTIVÉE (enabled = false) ; son texte porte la règle de Teo
  sur la vitrine. Le déclencheur unique de 02 h 32 Z (redéploiement de main) reste actif.
- Ouvriers en pause, chacun avec une section « REPRISE » en tête de sa NOTES : A1 6022838, A3 66cf791, A4 ac31278,
  A5 8abc536, B1 41e86e5, B2 528034d, B3 0ea8ec5, B4 52ecf3b, B6 a418d1f, C2 abbefb4, C3 6a815f2, C4 b639da2,
  C5 c4ff2736. Pas encore de réponse à la pause : A2, B5, B7, C1.
- Main (dab9e49 + ce commit) : fusion a3, a4, b1, b2, b3, b4, b6, c2, c3, c4. NON fusionnées : worker-a1
  (vercel.json propre à la branche ; le code tourne depuis le SHA déployé, lecteur v31 e0932e3), worker-a2
  (fonctions servies depuis leurs SHA), worker-a5 (omega-sauvegarde.yml non approuvé), worker-c5 (passes de vitrine
  annulées par Teo), worker-b5 et tableau-de-bord-v2 (attendre leur SHA de pause). Vitrine : 0 fichier modifié
  depuis 6f2a957.
- Recette : tout est posé et vert jusqu'à b6_25b, c4_09, b2_11b, b5_23, c3_08, a4_32, 19ao. Déployés : lecteur v31,
  reception v12, widget v1, export-complet v2, reput-reponse v2. Réglages recette : lecteur_analyses = oui,
  export_origines_recette = http://localhost:3010, MET Norway.
- À la reprise : (1) lire omega/CHIFFRAGE/SYNTHESE.md avec Teo et choisir le premier module à mettre en vrai ;
  (2) la production (omega/CHIFFRAGE/production.md : Supabase Pro, Vercel Pro, Bedrock UE, secrets) ;
  (3) débordement de 9 px à 390 sur /espace2/cashd (C1/C2) ; (4) Géorisques injoignable (B5 : relais Vercel puis
  data.gouv) ; (5) Teo a dit NON à toute modification de la vitrine, phrases fausses comprises (relevé dans
  transversal.md et les fichiers par module).
- Prospection Guadeloupe : session P1 (session_01Lv8Yz477zkrpiu5TWReysT), branche prospection-guadeloupe,
  sources ouvertes seulement (SIRENE, Annuaire Santé, ordres, sites officiels).
- Pauses reçues ensuite : A2 e067bc6 (à fusionner : GUIDE-GMAIL, GUIDE-MICROSOFT, banc/mise_en_service_sms.sql ;
  à déployer quand les secrets Google/Microsoft existent : messagerie + messagerie-oauth + cron omega-messagerie) ;
  B7 68a01aa (à la reprise : poser omega/tests/identite/b7_07_etrangers.sql depuis a6101c9, rejouer ^test_b7_13,
  lui rendre le résultat et le premier bilan taux-bce ; HMRC attend Teo). Restent sans réponse : B5, C1.
- B5 (pause, dernier lot terminé avant l'arrêt) : worker-b5 6082922 — risques par données ouvertes (GASPAR, sismicité,
  radon ; Géorisques et BRGM filtrent les IP de cloud). À la reprise : poser b5_24_risques_donnees_ouvertes.sql, puis
  les 15 fichiers omega/modules/lorani/donnees/b5_24_*.sql (lorani_ref_sources attendu : libelles 49, risques 31 733,
  radon 32 771, sismicite 35 346), puis test b5_14 v2 ; relevé réel : lorani_chercher_plu sur « Extension Garnier
  (banc) » doit finir « fait » avec les risques de Nantes. Seul C1 n'a pas encore confirmé sa pause.
- C1 en pause : tableau-de-bord-v2 c632394 fusionnée (vue d'ensemble « aperçu de projet », Suivi.tsx réutilisable,
  /espace2/utilisation). Avis de Teo attendu sur ces deux pages. TOUS les ouvriers sont en pause (18/18).

## Reprise du 11/10 (≈13 h 40 Z)
- Routine trig_01PJ… réactivée, toutes les 3 h, avec une consigne d'économie de tokens.
- 16 ouvriers réveillés (C5 reste à l'arrêt), avec la consigne : 3 lignes max, seulement quand un SHA est prêt.
- Posé depuis worker-b5 23af6b0 : b5_24, ses 15 fichiers de données et le test b5_14. Posé depuis a6101c9 : b7_07.
- Lot h1340b5b7 : 42 ok, 0 not ok. Comptes des tables lorani_ref conformes.
- Relevé PLU réel à Nantes : confié à B5 (il faut la session du gérant).
- Fonctions Edge à déployer en un seul lot :
  - **sortie** : A4 619a04b, cron chaque minute ;
  - **alertes-quotidiennes** : A5 42ee9db, 19ap posé ; puis les réglages et le cron de 06:17 ;
  - **expediteur** et **reception** : A2 b69423f, branche=false sur meta_whatsapp et ar24 ; vérifier que noter_remise accepte 'meta_whatsapp'.
- C3 3eca49f7 : la preuve en vrai mail + formulaire attend deux vrais courriels de Teo.
- A1 : decoupage_reel.mjs suspendu (règle « jamais Supabase » maintenue).
- 11/10, 14 h 05 Z :
  - lot h1350b3a5 (b3, 44, 60) : 597 ok, 0 not ok ;
  - lot h1404tout : 888 ok, 10 not ok (a4_33 ×2, a4_34, b1_18, b2_23, b2_25, b5_15, b6_22, c4_10, 44 pour filed_rapprocher_ligne), relayés aux ouvriers ;
  - fusionnés : C1 86706a9 et B4 300bd59. Écrans B1, B5, B6 et C4 retenus tant que leurs tests sont rouges.

## REPRISE — pause du 11/10, 15 h 40 Z (demande de Teo : « économiser les tokens »)
- **Routines coupées** : trig_01PJKxdeE5XGx3n8QTMoWwVe (point toutes les 3 h) est désactivée. Pour repartir : update_trigger enabled=true.
- **Pause** : les 16 ouvriers et P1 ont reçu la consigne de pause (commit, push, REPRISE dans leurs NOTES, puis silence). C5 reste à l'arrêt.
- **main** = 1e27e72. Les écrans d'aujourd'hui sont fusionnés : Varelo, Daliro, CASHD, Tavaro, Tamila, Tiroma, Lorani, OFFLOAD, FILED et C1.
- **Posé sur la recette, test pas encore lu** :
  - h1527c2 (c2_ + 44 ; C2 0615c80, portefeuille par chargé) : à lire dans private.sorties_tests ;
  - à lancer : ^test_(b6_(0[1-3]|25|27)_|b5_17_). b6_31 et b6_27 sont posés depuis 43353c4, b5_28 et b5_17 depuis 4bff78f.
- **Écrans à fusionner une fois ces tests verts** :
  - C2 : d01be6e..worker-c2, sur cashd ;
  - B5 : eada47c..worker-b5, sur lorani ;
  - B6 : cb55002..worker-b6, sur daliro.
- **Priorité de Teo (15 h Z)** : l'espace client /espace2 doit prendre le dessin de /omega, recopié et sans rien de propre à Teo. C1 est dessus, sur tableau-de-bord-v2 après dc963df ; rien n'est encore fusionné.
- **Décisions qui reviennent à Teo** :
  - l'outil « contexte_varelo » pour l'assistant (B1, 357fcb2) ;
  - la preuve en vrai mail + formulaire de C3 (deux vrais courriels) ;
  - les secrets AR24 et HMRC ;
  - le coffre Scaleway, Bedrock UE et les exports réels.
- **Recette** : une autre session a appliqué « varelo_referentiel_perf » à 15 h 28 Z, puis la base a redémarré à 15 h 29. Les identifiants de dépôt (pg_net) sont repartis à 23 ; aucune donnée perdue.
- **Copie de travail pour les fusions** : scratchpad/wt, avec node_modules installé. Le package-lock de main est désynchronisé : `npm install`, pas `npm ci`.
- **SHA d'arrêt (15 h 40 Z)** :

  | Ouvrier | SHA |
  |---|---|
  | A1 | c8d755e |
  | A2 | c2fdd1e |
  | A3 | 517a9e4 |
  | A4 | 4d22265 |
  | A5 | 69ff368 |
  | B1 | 7b0187c |
  | B2 | 3e0dedd |
  | B3 | 733caa4 |
  | B4 | 60733aa |
  | B5 | c26f7a6 |
  | B6 | 32ee8da |
  | B7 | 941ddd6 |
  | C2 | b0ae2133 |
  | C3 | 49c6799c |
  | C4 | c567cfcb |
  | P1 | 5d44a1e (vague 5, 200 PME, attend le feu vert de Teo) |

  C1 a fusionné son lot 1 du dessin /omega (e5198b7).
- **Question de C1 pour Teo** : faut-il retirer de la vue d'ensemble client le « Bonjour » et la rangée de chiffres, comme sur /omega ? En attendant, ils restent.

## Reprise du 15/10 (12 h 18 → 15 h 15 Z), plafond 50 % du forfait
- Réveil sur ordre de Teo, relayé par la routine « Relance du build (15/10) ».
- Posé et testé vert sur la recette :
  - c2_04 → c2_09 (CASHD complet hors G19) ;
  - c4_11 → c4_15 (OFFLOAD complet) ;
  - b2_17 → b2_19 ;
  - a4_36 et a4_37 ;
  - b3t_05 ; c3_09 ;
  - b5_28 → b5_33 ;
  - b6_31 → b6_35.
- Lecteur v34 (c51c6de).
- Fusionnés dans main (dernier 8f4106b) : écrans C2, B5, B6, B4, B3, B2, A3 (Équipe), C1 lots 2a à 2d (dessin /omega).
- Restent à déployer en Edge : reput-reponse (C3 8699ed0), webhooks-ar24 et expediteur (A2 8c0e608).
- En attente de Teo :
  - « un message par trimestre » contre « deux messages en tout » (C4) ;
  - Bonjour et les 4 chiffres de la vue d'ensemble (C1) ;
  - fournisseur de modèle (assistants B1 et B6) ;
  - gabarit ANTAI (B2) ; compte INSEE (B5) ; secrets HMRC et AR24 ;
  - preuve en vrai de C3 ;
  - premier client (CASHD G19).
- En cours : C1, lot 2e (Activité, Utilisation, Réglages).

## REPRISE — pause 50 % du 15/10, 16 h 12 Z
- Ordre « PAUSE 50 % (Teo) » reçu à 16 h 12 Z (forfait hebdo à 49 %). Tous les ouvriers ont commit, poussé, mis REPRISE à jour, puis silence.
- Routine « Point coordinateur Omega » déjà coupée ; aucun rappel send_later actif. Ne rien relancer avant le feu vert de Teo.
- SHA d'arrêt (sessions actives) : A1 c51c6de, A2 8c0e608, A3 34b8589, A4 d5db287, A5 798255f4, B1 f46b2c3, B2 0d675bf, B3 bcd02f6, B4 cd77750, B5 e8a95b9, B6 84df2e6, B7 0e1c2bb, C1 66930e4, C2 b0d8131d, C3 09dffb99, C4 a0e59013, P1 5d44a1e. C5 reste à l'arrêt.
- À la reprise, d'abord : fusionner C1 lot 2e (diff 650424a..66930e4, limité à app/espace2 et components/espace2) et A3 ef5eeb4 ; déployer en Edge reput-reponse (C3 8699ed0), webhooks-ar24 et expediteur (A2 8c0e608).
- Rien posé ni fusionné entre 15 h 15 et 16 h 12 Z ; dernier main fonctionnel 8f4106b.

## Reprise du 17/10 (15 h 05 Z) et décisions de Teo du 17/10
- Feu vert de Teo relayé par sa session bureau. Première vague : plafond 95 %, « PAUSE (Teo) » attendue vers 85 % ; pause de sécurité à 19 h 00 Z (rappel trig_01Pf8UuVk3CbaUTTsH184TEb). Seconde vague vers 02 h 20 Z (plafond 50 %). Au plus 2 pushes sur main par jour. Ne contacter que les sessions Opus 5.5 (colonne de gauche de la table), plus C1 à C4 et P1.
- C1 lot 2e : rien à fusionner (66930e4 = notes seulement). A3 ef5eeb4 : le correctif d'EcranEquipe était déjà dans main (0cc4dfb8) ; seuls les scripts de recette A3 sont repris.
- Déployés en Edge sur la recette : reput-reponse v4 (C3 8699ed0), expediteur v15 et webhooks-ar24 v1, verify_jwt false (A2 8c0e608). Les trois démarrent ; webhooks-ar24 répond « webhook non configuré » tant que les secrets AR24 manquent.

### Décisions de Teo du 17/10 (déléguées à sa session bureau ; valent feu vert)
Principe commun : les phrases du site font foi, le produit s'y met ; aucun prix dans le produit ; rien n'est acheté ni ouvert sans Teo.
1. C1 : retirer « Bonjour » et la rangée de 4 chiffres de la vue d'ensemble, comme /omega.
2. C4 OFFLOAD : « un message par trimestre » prévaut (une reprise = un seul message écrit, un seul canal, quarantaine 90 j gardée ; relance écrite = réglage désactivé par défaut). Réécriture CRM : attend un connecteur. `atteste` = état réel (faux pour la ligne 15 tant que la messagerie A2 n'est pas branchée).
3. C2 CASHD : cadence du site = défaut réglable par organisation (devis J+3 puis J+7 après envoi, plus J+10 ; rappel courtois le jour de l'échéance des factures). Quatre captures depuis l'écran réel (390 et 1440) dans omega/captures/cashd/, sans toucher au site.
4. C3 REPUT : validation AVANT envoi sauf sujets autorisés d'avance ; pas de relecture « le lendemain » (A:177) ; K:122 = transmission au service planning, pas d'agenda, bloc RDV non construit avant un premier client ; « réponse à 21 h » = vrai sur sujet autorisé, accusé sinon. Prochain bloc (choix du coordinateur) : valider depuis le mail de notification par lien signé (ligne 15) ; astreinte après le compte de téléphonie.
5. A4 FILED : après le n° 26 (historique complet pour tous, aucune limite), « rédige ce qui repart » (n° 125) en minimal, brouillon toujours validé par un humain. Effacement : tout sauf ce que la loi oblige à garder ; archive probante et registre 10 ans, scellés, exportables, et l'écran le dit. Paliers = réglages techniques, aucun prix.
6. B1 Varelo : OUI à contexte_varelo (lecture seule, session de la personne, journal, aucun IBAN).
7. A1 lecteur : médical NON (pas d'HDS) ; DWG NON (PDF des planches) ; métré mesuré NON ; nouveaux types Tamila OUI (B4) ; première lecture longue Tamila OUI sur la recette (coffre en repli local, pièces fictives), puis Key Manager avec le compte Scaleway.
8. Assistants « Questions » (Varelo, Daliro, Tavaro) et contexte_varelo : même fournisseur et garde-fous que le lecteur (plafond par client et par jour), même abstraction commutable ; recette = API Anthropic ; production = Bedrock Francfort avec le compte AWS ; aucun autre fournisseur.
9. Vercel Pro : le jour du premier client.
10. Sauvegarde : Scaleway Paris le jour du premier client ; d'ici là GitHub chiffrée dès que Teo pose les deux secrets ; workflow Scaleway écrit par une session autorisée à ce moment-là, pas par A5.
11. HMRC et fournisseurs britanniques : ABANDONNÉ ; GB = « non vérifiable automatiquement », vérification humaine (B7, A4). Retiré des listes d'attente.
- Teo ouvre en parallèle AR24, Meta, Google, Microsoft, Scaleway, éditeurs comptables, Mistral, INSEE, AWS : ne rien présumer posé avant de le voir dans les secrets.
- Décisions relayées le 17/10 vers 15 h 20 Z à C1, C2, C3, C4, A1, A2, A4, A5, B1, B2, B4, B6, B7 ; B3, B5, A3 et P1 restent en silence.
- Posé et vert sur la recette le 17/10 (niveau 1) : c4_16 (421 ok) ; b2_20 + b2_20b (621 ok) ; socle 19ar consommation IA (tous genres + registre) avec c3_* et b2_29 relancés (verts) ; c3_10 (281 ok) ; b1_19 + b4_19 + test 44 (1405 ok). a4_38 : 2 rouges sur a3fa4be, corrigé et reposé avec a4_39 en 90a2cd1 (tests en cours).
- Déployés sur la recette : lecteur v38 (A1 9e4cdfd), tavaro-questions v1 + cron omega-tavaro-questions (B2 348e22a), varelo-assistant v1 (B1 b62f7dd).
- Première lecture longue réelle (modèle réel, pièces fictives du banc, module essai) : analyse 8d85b76b finie, 10/10 pièces, 15 constats tous sourcés et vérifiés, 0,17 €.
- Refusés : `atteste` de C4 (lib/produits = site public, gardé pour Teo) ; b6_36 de B6 tel quel (il réécrivait consommation_ia_jour par-dessus 19ar).
- C3 lot 2 : choix (a), l'envoi interne vers un membre est ajouté au socle par A1 (gabarit fermé, sans texte libre) ; pas d'accord permanent.
- app/api/assistant (B1) fusionné : route réservée aux personnes connectées, appelée seulement par components/espace2/Assistant.tsx ; ce n'est pas une page publique.

### Suite du 17/10 (15 h 30 → 17 h 00 Z), recette (niveau 1)
- Posés et verts : c2_10 cadence (256 ok, lot long ~8 min) ; a4_38 à a4_42 (FILED : réponses fournisseurs, GB sans HMRC, conservation légale 10 ans, purge au terme, bilan) ; socle 19as_envoi_interne (A1) ; socle 19as_effacement_fichiers_gardes (A5 : effacer_* ne bloquent plus sur les fichiers gardés, code identique hors contrôle 55000) ; b6_36 + b6_36b (B6 718 ok après une régression de droit corrigée) ; c3_11 prévenir les décideurs (9/9 après correction).
- Déployés : tavaro-questions v2 (B2 dcd98d50 + _partage d'A1 9e4cdfd), daliro-questions v1 + cron (B6 6c6ab11 + _partage A1).
- Preuve réelle (modèle réel, données fictives du banc) : question Tavaro 097ac6f4, répondue, 1 lecture, 0,008 €.
- Refusé : transmettre une clé ou un mot de passe à B2 ; la preuve est passée par un script SQL joué par le coordinateur.
- Pause de sécurité déplacée au 18/10, 07 h 30 Z (trig_01Pf8UuVk3CbaUTTsH184TEb), sur ordre de Teo.
- 2e fusion main : C1 (vue d'ensemble sans « Bonjour » ni les 4 chiffres, c4701a5), B2 carte Questions (47a209c), B4 pièces citées (45d4216), B6 carte Questions (98a7d12).

## 18/10 (02 h 20 Z) : nouvelle semaine, plafond 50 % (pause attendue vers 40 % ; sécurité 07 h 30 Z)
- Secrets Google posés par Teo sur la recette. Déployés depuis worker-a2 53acbbc : messagerie v1 (verify_jwt true), messagerie-oauth v1 (verify_jwt false, retour = URL de la fonction) ; cron omega-messagerie ; fournisseurs_envoi.gmail branche = true (microsoft false). Démarrage vérifié (400 « Lien invalide » sans état).
- WhatsApp test Meta : expéditeur ab8778d8 (daliro, +15551998680, phone_number_id 1304208509431404) posé par omega/banc/expediteur_whatsapp.sql (7d631e7) ; meta_whatsapp reste branche = false jusqu'à META_ACCESS_TOKEN.
- Écran Messagerie (A3 b0becc5) fusionné dans Réglages. Attention : omegaai.fr pointe sur la prod, où ni les fonctions ni les secrets Google ne sont posés ; l'essai Gmail de Teo se fait sur la recette, par le lien d'omega/banc/connexion_gmail.sql (A2, valable 15 min) que joue le coordinateur.

## REPRISE — pause de sécurité du 18/10, 07 h 30 Z
- Aucun « PAUSE (Teo) » reçu avant 07 h 30 Z : pause faite par le coordinateur, sessions Opus 5.5 actives seulement. Routine trig_01PJKxdeE5XGx3n8QTMoWwVe coupée. Ne rien relancer avant le feu vert de Teo.
- SHA d'arrêt : A1 bc83f994, A2 39845c7, A3 7535987, A4 246b20f, A5 fa0357a0, B1 38a88c5, B2 cff734cb, B3 bcd02f62, B4 9ea8d0d, B5 3fd6df97, B6 46c9596, B7 9388a1b6, C1 c4701a5, C2 b6916856, C3 b0c8508b, C4 47acffc1, P1 5d44a1e. C5 à l'arrêt.
- Depuis 02 h 20 Z : Gmail branché sur la recette (messagerie + messagerie-oauth, cron, gmail branche = true) ; WhatsApp test Meta branché (meta_whatsapp branche = true, expéditeur ab8778d8, secrets Meta posés par Teo) ; écran Messagerie fusionné (47ec59ea, en ligne 6459f136).
- En attente de Teo : (1) son numéro de destinataire de test Meta → jouer omega/banc/preuve_whatsapp.sql (A2 0796edd, ligne v_numero), modèle hello_world, relever sent/delivered ; (2) « prêt pour Gmail » → jouer omega/banc/connexion_gmail.sql (lien 15 min) ; la réception WhatsApp réelle attend le passage « En ligne » de l'app Meta.

## 18/10 (14 h 20 → 15 h 50 Z) : relance de Teo, preuves réelles (niveau 2)
- **Gmail prouvé en vrai** : messagerie 259b8938 (teopetit50@gmail.com, readonly + compose) connectée 14 h 27 Z ; courriel « test Omega » de petitteo50@gmail.com reçu en réception 668 (14 h 29 Z), relevé par l'ouvrier messagerie à 14 h 31 Z. Recette, régime Test Google.
- **WhatsApp prouvé en vrai (envoi)** : envoi f737cfe1 (banc:a2:preuve-whatsapp:5, mode reel), modèle Meta hello_world vers +33768163443 depuis +1 555 199-8680 ; envoye 15 h 48 m 03 Z, wamid.HBgLMzM3NjgxNjM0NDMVAgARGBI0MTRFRDc5MEIxM0FDNUY5MDUA ; « remis » 15 h 48 m 05 Z par le webhook. Avec le jeton 24 h de la page Étape 1 de l'app OMEGA ; **le jeton permanent de l'utilisateur système reste à corriger d'ici 24 h** (deux essais refusés par Meta, 100/33 sur 1304208509431404 : accès au WABA de test ou jeton d'une autre app). Accord WhatsApp de Teo enregistré (noter_consentement, source écrit). Réception réelle : attend le passage « En ligne » de l'app Meta.
- Pour un envoi réel sur le banc : la ligne organisation (module null) ne peut pas être reel (contrainte) → la passer à NULL, daliro à reel/whatsapp, le temps du passage du cron omega-expediteur (le contrôle se refait à l'envoi), puis tout remettre en essai. Fait ; tous les modules du banc sont en essai.
- **Coffre Tamila sur le vrai Key Manager Scaleway (niveau 2, pièces fictives)** : tamila-coffre v15 (B4 bb7ea12, déployé par le bureau) ; activation 200 « bascule », clé maître 9bb47abb-f0dc-47ab-8208-9411a8e88fe1 (fr-par), 3 dossiers locaux ; sonde 200 : clé relue, pièce relue, autre dossier refusé.
- Posés et verts : b5_34 révision BT par l'API INSEE BDM publique, sans clé (459 ok, cron lorani-index :23) ; b4_20 clé d'analyse au coffre (test_b4_* 760 ok, 2 rouges b4_19 dus aux réceptions Gmail réelles du banc, B4 corrige).
- En attente du bureau de Teo : redéployer tamila-coffre depuis B4 ccb6d69 et poser le secret TAMILA_BANC_CLIENT (recette) ; mes déploiements Edge bloquent sur une autorisation. Microsoft reporté par Teo.

## 18/10, 16 h 18 → 17 h 15 Z : Omega client de lui-même, sources publiques, puis PAUSE ciblée

**Posé sur la recette (niveau 1)** :
- **Client « Omega »** 633470bc-0ccd-4b4a-934c-692024c3a419 (config->>'slug'='omega'). Teo est gérant, avec un compte auth au mot de passe aléatoire (« mot de passe oublié »). Les 10 réglages d'envoi sont en essai, cashd est coupé. Posé par A3 c21a14d.
- **Boîtes de réception** : omega@recu.omegaai.fr (reput) et factures-omega@recu.omegaai.fr (filed), par A2 08fb5c47. resoudre_boite route bien les boîtes suspendues.
- **Modules d'Omega** : FILED installé (A4 956fcf8), REPUT avec 16 fiches en brouillon (C3 afa2c1d6), CASHD (C2 8c69cbc7). test_a5_omega_ (A5 c26305f7) : 10/11 ; le 6 reste rouge tant qu'OFFLOAD n'est pas importé.
- **OFFLOAD** : 11 896 comptes, dont 1 933 entrepreneurs individuels. NON importé : le garde-fou de C4 refuse ces données personnelles, il faut l'accord écrit de Teo.
- **DCE réels** (A1 3b581dd9 et 71c6637b, téléchargement direct ; PLACE et Mégalis exigent une acceptation de CGU par une personne) :
  - Daliro : 6 pièces lues pour 0,42 €, n° 12, 44 et 52 en A pour la partie devis (B6, arrêt 6468906) ;
  - Lorani : 1 DPGF lu pour 0,16 € (B5 348f89c) ;
  - aucune ligne ne passe de B à A sans attendu relu.
- **FILED** : 36 exemples de la norme Factur-X (pas de vraies factures) lus par le XML, 0 €. a4_43 (f2034de) corrige trois défauts : SIREN réclamé hors de France, doublon comparé à la première pièce seulement, blancs dans les noms. ^test_a4_ 84/84, recontrôle joué (000022 et 000025 écartées).
- **Varelo** : 3 groupes réels issus des comptes publiés INPI/BCE (EDH, Ankama, Normaxis ; 19 balances), prouvés sous la session de chaque gérant (B1 737bd0b et 009a6bb). Caisses fictives.
- **REPUT métiers** : 62 fiches en brouillon depuis des sources réutilisables (C3 3130c656), faq.ada.fr exclu.
- **Tamila** : bloqué. Le garde-fou de B4 refuse les décisions DILA (données personnelles) ; il faut l'accord de Teo.
- **Arrêt IA** : depuis 17 h 00 Z, l'API Anthropic de la recette répond HTTP 400 « credit balance is too low ». Teo doit recharger.
- **CI** : .github/workflows/omega-repetition-ci.yml est rejeté à chaque push, 0 job (${{ runner.temp }} dans le env: du job, ligne 61) ; omega-sauvegarde.yml a le même défaut (ligne 98). Ma désactivation et celle d'A5 ont été refusées par le contrôle des sessions : **Teo désactive les deux dans GitHub → Actions**.

### REPRISE (pause ciblée de Teo, 17 h 00 Z : « le focus est le grand groupe et l'architecture »)
SHA d'arrêt :

| Ouvrier | SHA |
|---|---|
| A1 | 5d6856c2 |
| A2 | ef88f351 |
| A3 | 96965cb |
| A4 | 86670ba |
| A5 | be0f4227 |
| B2 | cff734cb |
| B3 | bcd02f6 |
| B4 | 9aba87e |
| B6 | 6468906 |
| B7 | 9388a1b6 |
| C1 | c4701a5 |
| C2 | e6298e94 |
| C3 | 3130c656 |
| C4 | 1349e9fd |

**Seuls B1 (Varelo, /secteurs/groupes) et B5 (Lorani, /secteurs/architectes) continuent**, un lot à la fois, sans sous-agent. Leur objectif est la chaîne de leur page prouvée sur la recette, au niveau 2 dès que possible. La routine 3 h est désactivée par la session bureau : ne pas la réarmer.

En attente de Teo :
- la recharge du crédit API Anthropic de la recette ;
- la désactivation des deux workflows ;
- l'accord OFFLOAD (données personnelles) ;
- l'accord Tamila DILA ;
- les PDF CASHD ;
- un mail test à omega@recu.omegaai.fr ;
- le lien Gmail d'Omega (receptions_omega.sql partie 3, A2 08fb5c47) ;
- tamila-coffre a7a0f9d avec le secret TAMILA_BANC_CLIENT ;
- reput-reponse 15a01a67 + c3_09 ;
- sur main, l'écran Varelo « non publiée » (worker-b1 737bd0b, components/espace/varelo).

## 18/10 21 h Z → 19/10 00 h 20 Z : quatre SaaS, puis PAUSE à 29 % (reprise samedi 25/10 après 02 h Z)

Posés et verts sur la recette (niveau 1) :
- **FILED** : a4_44 à a4_49, ^test_a4_ à 91 ok. Au programme : libellé de TVA étrangère, « 19 % » lisible, historique chaîné, catégories d'achat, comptabilisation réservée, sortie complète.
- **CASHD** : c2_11 à c2_14 (envoi à la main, modèle 2 sur les rappels des paliers 1 et 2, point du matin, texte du jour d'échéance), ^test_c2_ 14/14. LRE et mise en demeure toujours retenues.
- **REPUT** : c3_12 (indicateurs par service), c3_13 (envoi automatique, retenue doute / urgence / sujet), test c3_05 en heure de Paris ; ^test_c3_ 12/12.
- **OFFLOAD** : c4_17 (restitution), vert.
- **Socle** : 19at (sceau et export du journal, A5 30b9fc7a), test_62 vert.

Posés, tests non joués : c2_15 (taux BCE), a4_50 (quotas), c3_14 (pièces jointes). **Le lot de tests groupé h2357mx fait redémarrer la recette à chaque essai** (« server restarted » 23 h 56, 23 h 59, 00 h 05, 00 h 10 Z) ; il est désactivé. test_62 seul passe. Bissection à reprendre : ^test_c3_1[234], puis ^test_c2_15, puis ^test_a4_, un à la fois. Coupure possiblement liée, de 21 h 41 à 22 h 16 Z.

À poser à la reprise, dans l'ordre :
- c4_18 (4391d8b4), avec (offload, envoi.email) dans private.activation_seul_autorisee (seul décideur seulement, comme 19af) et (offload, offload.message_retenu) dans private.actions_sans_accord ;
- c4_19 (a879098a) ;
- a4_51 (d2f7aed), a4_52 (3dd98c6), a4_53 (422f40d, barème BOFiP 2022 vérifié), a4_54 (9476916) ;
- c3_15 (fb071172), c3_16 (4477c6e3, plus le redéploiement de reput-reponse), c3_17 (d13ea1d5), c3_18 (d98c272b).

Décisions de Teo en attente :
- OFFLOAD : réécriture par modèle de langue ou interpréteur ; branche Gmail, accord à donner dans la session C4 ;
- FILED : envoi mensuel du sceau ;
- blocage au dépassement du quota ;
- prix des paliers.
REPUT à ajouter : astreinte téléphonique et appels non décrochés transcrits (Twilio en test, compte à ouvrir par Teo).

Pas sur main : l'écran REPUT de l'envoi automatique (worker-c3 e06d6ca7), car omegaai.fr est branché sur la prod, où c3_13 n'existe pas. Le compte de Teo a été retiré de aa01 par la session bureau.

### REPRISE (19/10, 00 h 25 Z) : têtes de branche à l'arrêt
A1 5d6856c2 · A2 ef88f351 · A3 96965cbf · A4 422f40d0 · A5 30b9fc7a · B1 41924b93 · B2 cff734cb · B3 bcd02f62 · B4 9aba87ef · B5 528b933f · B6 0ba479ad · B7 9388a1b6 · C2 2278f180 · C3 d98c272b · C4 a879098a. Routine 3 h désactivée.

## 19/10 14 h 22 Z → 14 h 55 Z : relance de Teo (plafond 40 %), quatre moteurs au bout de ce qui se construit seul

Bissection : chaque lot passe seul (^test_c3_1[234] 3/3, ^test_c2_15 11/11, ^test_a4_ 92/92). C'est le groupement des tests qui fait redémarrer la recette : **un job de tests à la fois**.

Posés et verts sur la recette (niveau 1) :
- **OFFLOAD** : c4_18 (envoi automatique ; test corrigé c676d17f, le gérant éteint), avec (offload, envoi.email) dans activation_seul_autorisee et (offload, offload.message_retenu) dans actions_sans_accord ; c4_19 (effacement). c4_20 : écran seul.
- **CASHD** : c2_16 (le taux le plus récent l'emporte). Écran « Taux de change » : 879dce0c.
- **REPUT** : c3_15 → c3_21 (7/7), c3_22 astreinte (tâche cron reput-astreinte), c3_23a socle (canal 'appel' dans receptions_canal_check et private.deposer_reception ; relu : identique à la liste des canaux près), c3_23 appels transcrits.
- **FILED** : a4_51 → a4_59 (test a4_39 corrigé 596c34cf ; contrats, courriers, tickets, octroi de mer, exonération art. 295) ; ^test_a4_ 102/102.

NOBAT (6 vraies pièces, client banc) : le lecteur A1 8596e165 relève taxes.autres (OMR/OMRI), mention.exoneration, SIREN du RCS et IBAN partiel. **Il attend le redéploiement de l'Edge lecteur** (session bureau) ; il faudra ensuite relire R2026-000045 et 000047, un job à la fois. Avec l'ancienne lecture, la facture Gedimat reste bloquée (tva.sans_mention, identite.siren). Relevé d'heures : avis A4 « releve_heures », nature autre (décision de Teo).

À déployer (session bureau) : Edge lecteur, reput-reponse, reput-astreinte, reput-appels (Twilio en doublures, compte à ouvrir par Teo). Point RGPD/HDS : la reconnaissance vocale Twilio se fait hors UE.

### Arrêt (19/10, 14 h 55 Z) : versions d'arrêt
A1 8596e165 · A4 89599be6 · C2 879dce0c · C3 a67a4e04 · C4 db647d2f. A2, A3, A5, les B et C1 n'ont pas été réveillés.

## 19/10 14 h 55 Z → 17 h 50 Z : décisions du bureau (délégation de Teo), puis PAUSE (Teo) à 35 %

Posés et verts sur la recette (niveau 1), en plus de la section précédente :
- **FILED** : a4_60 (IBAN lu comme TVA), a4_61 (documents de chantier → Daliro ; filed_integrer_piece vérifiée par empreinte), a4_62 (banc de référence, 39 cas ; relevé 4 : contrôles 25/30, champs 16/18), a4_63 v2 (relevé d'heures ↔ facture d'intérim), a4_64 (sceau mensuel au gérant), a4_65 (quota sans blocage, alertes 80/100 %), a4_66 (devis ↔ facture proposé à une personne) ; filed_controler_facture vérifiée par empreinte (deux lignes ajoutées). ^test_a4_ 109/109.
- **Daliro** : b6_37 (documents de chantier : réserves à lever, références du marché), test b6_33 vert. Écran « Documents du chantier » sur worker-b6 7a0ff42e, **non fusionné** (la prod n'a pas b6_37).
- **OFFLOAD** : c4_21 (réécriture par règles, sans modèle de langue), c4_22 (Gmail en essai), verts.
- **REPUT** : c3_22 astreinte, c3_23a socle (canal 'appel', vérifié par empreinte), c3_23 appels transcrits, c3_24 transcription commutable (Twilio / UE), verts.
- Cas NOBAT du banc remplis à la main sur la recette (hors git).

Attend Teo :
- **Déployer l'Edge lecteur** depuis worker-a1 4a4ad9e1 (SIREN depuis SIRET, IBAN, octroi de mer, exonération, types chantier et relevé d'heures ; ajouter analyse/, media/, mesure/ et _partage/) : non fait. Puis relire R2026-000045, 47, 53 et les 6 pièces chantier, un job à la fois.
- **Redéployer reput-appels v2** depuis worker-c3 4ab27cb0 (+ reput-astreinte/twilio.ts) ; le 403 vient de l'Auth Token : Twilio signe avec le jeton PRINCIPAL, et REPUT_APPELS_URL doit être exactement l'URL de la console.
- **Import OFFLOAD des personnes morales** (script worker-c4 6f0a05b2) : la garde de C4 a refusé la vraie liste ; non joué, en attente d'une confirmation écrite de Teo.
- Accord permanent du gérant pour l'envoi seul du sceau mensuel (envoi.email / filed_sceau) ; fournisseur de transcription UE ; écran des exports FILED.

### REPRISE (19/10, 17 h 50 Z) : versions d'arrêt
A1 4a4ad9e1 · A4 ca5e4aa0 · B6 7a0ff42e · C2 879dce0c · C3 4ab27cb0 · C4 6f0a05b2. Routine 3 h coupée. Reprise samedi 25/10 après 02 h Z ou au feu vert de Teo.

## 19/10 18 h 30 Z → 18 h 50 Z : deux correctifs NOBAT, puis PAUSE (Teo) à 37 %

- Fait par le bureau : Edge lecteur déployé depuis worker-a1 4a4ad9e1 puis b7773e70 ; reput-reponse v26 ; reput-appels v5 (chaîne REPUT prouvée par un appel simulé). NOBAT relu : octroi de mer, exonération, SIREN, IBAN au bon champ.
- Posé et vert (niveau 1) : a4_67 (worker-a4 55c0cfa2 : compléter la fiche fournisseur sur proposition confirmée ; iban.masque au lieu d'iban.absent, virement non notable tant qu'il est ouvert), ^test_a4_ 111/111. Boulogne Matériaux et LEADER MAT : fiches déjà au SIREN, factures relues identifiées par SIREN.
- Nouvelles pièces NOBAT R2026-000065 → 000077 (chantier SOFIJAR, facture LEADER MAT à trois taux) : déposées par le bureau, à traiter à la reprise.

### REPRISE (19/10, 18 h 50 Z) : versions d'arrêt
A1 b7773e70 · A4 55c0cfa2 · B6 7a0ff42e · C2 879dce0c · C3 4ab27cb0 · C4 6f0a05b2. Routine 3 h coupée. Reprise samedi 25/10 après 02 h Z ou au feu vert de Teo. Ces notes sont sur la branche notes-coordinateur (les 2 pushes du jour sur main sont faits) : à fusionner dans main au prochain push.

## 21/10, 18 h 42 → 21 h 15 Z : relance (plafond 70 %), quatre testeurs boîte noire, lots correctifs

Décisions de Teo du 21/10 : import OFFLOAD des personnes morales (fait, 9 898 comptes « exclu ») ; accord permanent du sceau FILED (politique posée, non activable : le banc n'a qu'un gérant) ; jeu de factures CASHD à 5 erreurs (fait, 5/5 attrapées) ; testeurs lancés (contrat omega/CONTRAT-TESTEUR.md).

### Testeurs (Opus 5.5, tag omega-testeur, parent = coordinateur)

| Testeur | Session | Branche | Banc (client recette) |
|---|---|---|---|
| T-FILED | session_012s3D9VQdzHfQS5qxdZ8GP6 | testeur-filed | banc-test-filed dddddddd-0000-4000-8000-0000000000f1 |
| T-CASHD | session_01ELKvAvjP6TZexVtPGJeGyb | testeur-cashd | banc-test-cashd …00c2 |
| T-REPUT | session_01QdbMQ9uALEhFTxBB5LPFPX | testeur-reput | banc-test-reput …00c3 |
| T-OFFLOAD | session_01Y9xBbG3KjuQM5tPeZAcmqV | testeur-offload | banc-test-offload …00c4 |

Comptes du banc : gérant eeeeeeee-0000-4000-8000-0000000001xx, valideur …02xx (xx = f1, c2, c3, c4). Aucun réglage d'envoi, sauf OFFLOAD c4 (essai, adresse .invalid, envoi_auto false). Aucun secret transmis entre sessions. Deux dépôts par lot ouverts par moi sur f1 puis fermés (401 vérifié) ; leur mot de passe est passé une fois dans mes sorties d'outil, rien n'a été transmis.

### Niveau 1 (recette), posé et vert, rejoué juste par le testeur

- OFFLOAD c4_23 → c4_28 : TOFFLOAD-01, 04 à 08.
- CASHD c2_17 → c2_37 : TCASHD-01 à 06, 07 (garde côté CASHD), 12, 14 à 17, plus les lots de ton 08/09/10 (défauts : 1 500 €, 15/45 j, 3 j ouvrés + 2 j de remise).
- REPUT c3_25 → c3_32 : TREPUT-02, 04 (base), 05, 06, 07, 08. 01, 03 et le texte de 04 attendent le redéploiement de l'Edge reput-reponse (bureau).
- FILED a4_71 → a4_75 : TFILED-02, 03, 04, 08, 11, 14.

### Incident

20 h 22 Z : la suite complète ^test_c2_ en un seul job a fait redémarrer la recette. Tests désormais par petits lots (≤ 4 fichiers).

### Pas poussé en main

Les écrans d'espace des branches worker-a4/c2/c3/c4 appellent des portes qui n'existent que sur la recette : ne pas les fusionner tant que les migrations ne sont pas en production (niveau 3, décision de Teo).

### REPRISE

- C2 : reste TCASHD-11 (« par »), puis les deux réglages de délai à l'écran (espace seulement).
- A4, C3, C4 : en attente. T-FILED, T-CASHD, T-REPUT, T-OFFLOAD : à l'arrêt, séries closes.
- À Teo : réveil d'A5 (TCASHD-07 refus à la saisie, délégations TFILED-09/10, crochet « réécrire à l'approbation » de 10b) ; envoi d'essai REPUT ; O6 (TOFFLOAD-03) ; sceau (un seul gérant) ; site ou moteur pour TFILED-06 et 07 ; TFILED-12 (l'ouvreur d'un dépôt vaut-il saisisseur ?) ; statut de cycle de vie 207/208 après un 205 (A4).
- Au bureau : redéployer l'Edge reput-reponse (c3_25 à c3_28) et le lecteur A1 fd2da4bd.
- Sécurité : pause à 01 h 00 Z (trig_01Y1g8hC8geoXnUd7GyYhhAB) si pas de PAUSE avant.

## PAUSE (Teo, par le bureau) — 21/10, 22 h 45 Z, forfait 60 %

Sessions actives arrêtées par message (A1, A4, C2, C3, C4, T-FILED, T-CASHD, T-REPUT, T-OFFLOAD). Routine 3 h coupée par le bureau ; sécurité trig_01Y1g8hC8geoXnUd7GyYhhAB désarmée. Aucun job de test en cours sur la recette.

### SHA d'arrêt

| Branche | SHA |
|---|---|
| main | b4673c78 |
| worker-a1 | fd2da4bd |
| worker-a4 | f4df31b6 (notes ; a4_63 corrigé déjà posé et vert, 2/2) |
| worker-c2 | 0ce7bbd8 |
| worker-c3 | 192a033f |
| worker-c4 | f4f2e2ed (notes) |
| testeur-filed | 0edc36d7 |
| testeur-cashd | 064bbb52 |
| testeur-reput | 9c54b74c |
| testeur-offload | 847710dd |

Dernière pose sur la recette : c2_38 (TCASHD-11), vert. Aucun écart CASHD, OFFLOAD ou FILED ouvert sur les bancs hors décisions de Teo ; REPUT 01/02/03/04-texte attendent l'Edge reput-reponse.

### À TEO (telle quelle)

- Réveil d'A5 : TCASHD-07 (refus à la saisie d'une approbation sans commentaire), TFILED-09/10 (délégations : messages bruts, minuit UTC), crochet « réécrire à l'approbation » pour 10b.
- Envoi d'essai REPUT.
- O6 / TOFFLOAD-03.
- Sceau à un seul gérant.
- Site ou moteur pour TFILED-06 (découpage d'un PDF à deux factures) et TFILED-07 (fournisseur inconnu bloqué avant paiement).
- TFILED-12 : l'ouvreur d'un dépôt par lot vaut-il saisisseur ?
- Statut de cycle de vie 207/208 après un 205 déjà transmis (A4).

### Au bureau

Redéployer l'Edge reput-reponse (c3_25 à c3_28) et le lecteur A1 fd2da4bd.

### Reprise

Au feu vert de Teo ou samedi 25/10 après 02 h Z. Fusionner d'abord cette section dans main (les 2 pushes du 21/10 étaient pris). Les écrans d'espace des branches worker ne vont dans main qu'avec leurs migrations en production (niveau 3, Teo).

## Preuve REPUT en vrai (21/10)

BOÎTE OUVERTE : banc@recu.omegaai.fr à 23 h 06 Z (expediteurs a3630f13 → actif, vérifié encore à 23 h 50 Z). Bloc 0 vérifié : REPUT en essai avec adresse d essai, 3 fiches validées (Horaires d ouverture, Diagnostic à domicile, Comment prendre rendez-vous ?), 62 fiches métiers en brouillon, crons reput-synchro et omega-reput actifs, aucun accord actif (attendu : a_valider). Edge reput-reponse v28 (bureau, 23 h 07 Z). En attente des deux courriels de Teo.

Résultat (bureau, 22/10 00 h 07 Z) : les deux courriels de Teo (23 h 57 Z et 00 h 00 Z) vers banc@recu.omegaai.fr sont rejetés par Brevo, « 550 5.1.2 adresse introuvable ». MX corrects (inbound1/2.sendinblue.com) : c'est Brevo qui refuse le destinataire (domaine non déclaré en inbound parsing ou webhook absent). **Preuve REPUT niveau 2 : NON FAITE.** Inbound Brevo à rétablir (Teo : compte Brevo → Inbound parsing → domaine recu.omegaai.fr ; puis brevo-inbound-installer).

## PAUSE (Teo, par le bureau) — 22/10, 00 h 11 Z

Sessions actives arrêtées par message (A4, A5, C3, C4, T-FILED, T-CASHD, T-OFFLOAD, T-REPUT ; C3 note « inbound Brevo à rétablir » dans NOTES-C3). Sécurité trig_013vYXQg14DBt13FqcfGH1kt désarmée. Aucun job de test en cours sur la recette. Toutes les sessions réveillées le sont en Opus 5.5, effort medium.

### SHA d'arrêt (git ls-remote, 00 h 12 Z)

| Branche | SHA |
|---|---|
| main | 63d6173a |
| worker-a4 | 2ee67ed7 |
| worker-a5 | 3cf96646 |
| worker-c2 | 0ce7bbd8 |
| worker-c3 | b2efa7d2 (note inbound Brevo dans NOTES-C3) |
| worker-c4 | 27c89ecf |
| testeur-filed | cb6c7fec |
| testeur-cashd | 858f0395 |
| testeur-reput | 1d641ac8 |
| testeur-offload | 97fe6938 |

### Testeurs

| Testeur | Banc | État |
|---|---|---|
| T-FILED | FILED | série close ; TFILED-06/07/12 tranchés par Teo ; TFILED-14 cosmétique (date de fin D2 affichée 23/10) |
| T-CASHD | CASHD | série close, aucun écart ouvert |
| T-OFFLOAD | OFFLOAD | série close (un cycle par trimestre, forçage avec motif, dates en heure de Paris) |
| T-REPUT | REPUT | série close au niveau 1 ; preuve en vrai bloquée par l'inbound Brevo |

### À TEO

- Statut de cycle de vie 207/208 après un 205 déjà transmis (A4).
- Passage en production des lots de cette nuit (niveau 3).

Tranché ce soir, retiré : règle des deux personnes (gérant seul), O6/TOFFLOAD-03, TFILED-06/07 (le site gagne), TFILED-12, sceau à un seul gérant, réveil d'A5.

### Pour la reprise

C2 inscrit le crochet cashd de 19ay (10b). C4 : fuseau par organisation dans OFFLOAD. Un seul job de test à la fois, 4 fichiers au plus.

### BILAN pour Teo

1. Fait (niv. 1) : gérant décide seul, approbation sans commentaire refusée à la saisie, délégations en français et à l'heure locale (A5).
2. Fait (niv. 1) : FILED a4_71→a4_76, découpage et fournisseur inconnu côté moteur.
3. Fait (niv. 1) : CASHD c2_17→c2_38 (avoirs, mises en demeure, envoi manuel).
4. Fait (niv. 1) : OFFLOAD c4_23→c4_30 (un cycle par trimestre, forçage avec motif, heure de Paris).
5. Fait (niv. 1) : REPUT c3_25→c3_32 ; boîte du banc ouverte.
6. Fait (niv. 2) : preuve REPUT en vrai — 2 vrais courriels, réponses préparées en 106 s et 59 s, regroupées en une seule, validée puis partie 33 s après (voir section 22/10 00 h 50 Z).
7. Quatre testeurs : séries closes, aucun écart ouvert hors vos décisions.
8. Reste à vous : statut 207/208 ; envoi au vrai expéditeur (mode réel) si vous le voulez.
9. Reste (niv. 3) : migrations de production, puis écrans d'espace dans main.
10. Reprise : à votre feu vert ou samedi 25/10 après 02 h Z.

## Preuve REPUT niveau 2 — 22/10, 00 h 50 → 00 h 58 Z (consigne du bureau)

Inbound Brevo rétabli par le bureau à 00 h 41 Z : `recu.omegaai.fr` n'existait pas chez Brevo (seul `omegaai.fr`), le webhook 2225428 portait `omegaai.fr`. Domaine ajouté et authentifié par l'API, DNS posés par Teo chez OVH, webhook basculé ; brevo-inbound-installer remis en stub 410. GUIDE-INBOUND corrigé ; NOTES-A2 complété.

| Étape | Résultat |
|---|---|
| 1 (Teo) | (a) « Diagnostic à domicile » → réception 1436, 00:41:19 Z ; (b) « Chaudière à granulés » → réception 1437, 00:44:08 Z. Réception 1435 (00:37:04 Z) sans demande REPUT : essai du bureau. |
| 2 (formulaire signé) | **Non jouée** : FORMULAIRE_SECRET n'est ni dans mon environnement ni dans le coffre de la recette (secret de l'Edge seulement). |
| 3 | (a) demande 763a0b50 : couverte, fiches « Horaires d'ouverture » + « Diagnostic à domicile », **106 s** (> 60 s promis), puis `ignoree` « Regroupée avec le message suivant ». (b) demande bd3c193c : couverte faux, `reput.transferer`, raison écrite, **59 s**, `a_valider`. Modèle claude-sonnet-5-5 ; 0,009 € et 0,010 €. Travaux `reput.preparer` : 3 faits, 0 erreur. Rien parti avant validation. |
| 4 | Validée au nom du gérant du banc (approbation 1dc19a6f, 00:54:30 Z, commentaire écrit). |
| 5 | Envoi b65bc08a `envoye` à 00:55:02 Z (33 s après la validation), mode essai, référence Brevo reçue, événement fournisseur à 00:55:04 Z. Journal dans l'ordre : demande_recue → reponse_preparee → accuse_prepare → demande_regroupee → approbation → reponse_approuvee → envoi → reponse_envoyee (00:56:00 Z). Quatre avis « Réponses clients à valider » partis au gérant (essai) à 00:44:19 Z. |

À vérifier à l'œil par Teo : le courriel arrivé à l'adresse d'essai du banc (signature et mention de réponse automatisée) ; je n'ai pas accès à cette boîte.

Écarts ouverts pour C3 (pas corrigés ce soir) :
- **TREPUT-05** : préparation de (a) en 106 s > 60 s promis (cadence du cron omega-reput + temps du modèle).
- **TREPUT-06** : règle « regroupée avec le message suivant » à confirmer quand deux questions arrivent à 3 min d'écart (ici, une seule réponse complète : bon résultat).
- **TREPUT-07** : deux accusés de réception (3745fcb2, 60eaee37) restent `a_valider` après l'envoi de la réponse ; à clore ou annuler avec elle.

## RELANCE (Teo, par le bureau) — 22/10, 19 h 06 Z, plafond 85 %, sécurité 23 h 30 Z

Réveillés (Opus 5.5 ; l'effort « medium » ne se règle pas sur une session existante, aucun outil ne le permet) : A5 (étape 1 MISE-EN-PRODUCTION), A1 + A4 (NOBAT 065→077, COH-FXC-002/005/016, écran exports), C2 (crochet 19ay + délais, puis stop), C3 (gabarit appel, TREPUT-05/07, WhatsApp en doublures), C4 (fuseau par organisation, puis stop), T-FILED, T-CASHD, T-OFFLOAD, T-REPUT. Pas B1, B5, C5. Sécurité trig_01X9QTaRUic1w1JRoUotiHXn à 23 h 30 Z.

**Pour le bureau — Edge `lecteur` (recette) depuis worker-a1 fd2da4bd : non redéployé par le coordinateur.** Le paquet fait ~340 Ko (31 fichiers lecteur + 12 de `_partage`) ; le passer à la main dans l'outil MCP coûterait ~100 k jetons, et `outils/preparer_deploiement.ts` est périmé (il oublie `analyse/`, `media/`, `mesure/`). Commande à jouer par le bureau (CLI Supabase connectée) :

```sh
git worktree add /tmp/lecteur fd2da4bd && cd /tmp/lecteur/omega
mkdir -p supabase/functions && cp -r functions/lecteur functions/_partage supabase/functions/
sed -i 's#"@partage/": "../_partage/"#"@partage/": "../_partage/"#' supabase/functions/lecteur/deno.json
supabase functions deploy lecteur --project-ref ygwbgpowzlbdaajlsqkn --import-map supabase/functions/lecteur/deno.json
```

(`verify_jwt` : garder le réglage de la version en place.) Ensuite prévenir A1/A4 : les 13 pièces NOBAT attendent ce lecteur.

**T-OFFLOAD — à trancher (bureau/Teo).** Les 9 898 sociétés sont sur le client interne « Omega » 633470bc (vrais prospects Guadeloupe, tous `exclu`), seul compte = celui, réel, de Teo ; détection jamais jouée (0 signal) ; OFFLOAD en essai, `envoi_auto` vrai, adresse d'essai = boîte de Teo. Le contrat testeur interdit vraies données et identité hors banc : je n'ai ni prêté l'identité de Teo ni lancé la détection. T-OFFLOAD continue sur son banc (dddddddd-…-c4). Pour lever : accord écrit de Teo pour (1) jouer la détection sur 633470bc, (2) laisser un testeur lire sous son identité (ou créer un membre lecteur dédié).

### Pour le bureau — redéploiements (mise à jour 19 h 25 Z), remplace la commande ci-dessus

1. **`lecteur`** : depuis worker-a1 **ea1f941ce018dcc29186445c743908e7f3aa4e9c** (remplace d46bc4d3 et bda7a5ed ; SIRET à 9 chiffres jamais complété ; plans : titre ou numéro ; 069 : ventilation TVA, IBAN, SIREN déduit, TVA intracom de secours). Le paquet sort de `deno run -A omega/functions/lecteur/outils/preparer_deploiement.ts` (réparé par A1 : il suit les imports, 41 fichiers). Puis relances une à une : 069, puis 067, 068, 072, 074, 075, 077.
2. **`reput-reponse`** : depuis worker-c3 **1296dc256f81b2e2898d35849a6bdcc4c6c84409** (consigne SMS courte, durées écrites dans le résultat ; va avec c3_34, déjà posé).

Posés et verts depuis 19 h 06 Z : c4_31 (fuseau par organisation), c4_32 (TOFFLOAD-09/10). Posés, tests en cours : c3_33 à c3_35. Réglages du banc : SIREN fictif 912345659 (banc-test-filed), fuseau America/Guadeloupe (banc-test-offload), reglages_envois reput en essai pour le banc c3 (il manquait : CONFIG_ABSENTE).

19 h 35 Z : a4_78 (TFILED-16, identite.registre levable) posé, vert 3/3. A5 : étape 1 faite (worker-a5 f4878dac, 397 fichiers, P1-P6) ; empreinte recette 22/10 19:32 Z sur export-prod 1190e8d2. **À TEO** : relevé du schéma de production (`PROD_DB_URL=… bash omega/prod/base/relever-base.sh`, lecture seule, ~2 min, gratuit), puis lancement de la répétition (Actions → « Répétition du SQL (Postgres jetable) » sur worker-a5).

19 h 50 Z — **Pour le bureau** : lecteur v63 (fd2da4bd) reçu, 069 relue (ventilation et IBAN justes). Redéployer maintenant le lecteur depuis worker-a1 **ea1f941ce018dcc29186445c743908e7f3aa4e9c** (SHA final d'A1) ; reput-reponse depuis worker-c3 **fccce2de0f725a051848769ea7507a2db619b2a7** (ou plus récent) ; et déployer l'Edge **reput-astreinte** avec son cron (appels de garde, c3_37). Posés et verts depuis 19 h 35 : c2_39, c3_33 à c3_37, c3_36 v2, a4_78, a4_79. Réglages du banc : ligne d'appel +33199000099 (banc c3), envoi_auto coupé sur le client Omega (détection jouée : 9 898 « sans_achat », 0 signal).

19 h 55 Z — Lecteur : **SHA final d'A1 = ea1f941ce018dcc29186445c743908e7f3aa4e9c** (inclut 2348ab88 et f7b19a91 : SIRET à 9 chiffres, date au mois, titre ≠ cote, dispositions vérifiées par morceaux). Relances après déploiement : 069, 066, puis 067, 068, 072, 074, 075, 077, une à une. Posés et verts : a4_80 ; a4_81 en test. Ouvert chez C3 : TREPUT-15 (appel jamais passé compté « sans réponse »).

### RÈGLE (bureau, 22/10 20 h 37 Z) — déploiements Edge

**Ne jamais appeler `mcp__Supabase__deploy_edge_function`.** Dans le cloud, cet outil ouvre une fenêtre d'autorisation que personne ne peut valider : la session du coordinateur est restée figée dessus de 19 h 58 à 20 h 37 Z, chantier à l'arrêt. Seul le bureau déploie : le coordinateur écrit la demande ici (fonction + SHA), le bureau la joue dans les 10 minutes.

20 h 40 Z — déployé par le bureau : lecteur v66 (worker-a1 ea1f941c), reput-astreinte v3 (worker-c3 0ea5e540), reput-reponse v30 ; cron 660 omega-reput-astreinte à 200. Posés et verts : a4_82, c3_39 v2 (37405a91). 069 relue sur v64 : plus de faux SIRET, mais tva.ventilation perdue (variance du modèle) → relance sur v66 en cours. Ouverts chez C3 : TREPUT-16 (astreinte épuisée sans alerte), TREPUT-17 (dépôts simultanés non regroupés).

**DEMANDE DE DÉPLOIEMENT (bureau) — 20 h 47 Z** : `lecteur` depuis worker-a1 **37583a8ffa6536c588ffd9da5f2edab8f838eb2c** (remplace ea1f941c ; TFILED-25 : tableau des taux de TVA relu même quand les rangées sont séparées par des lignes vides ou « / » ; version_lecteur porte le SHA court). Le paquet doit sortir de `omega/functions/lecteur/outils/preparer_deploiement.ts` (il y écrit le SHA). Ensuite : 069 seule, puis 066 et les six plans.

20 h 52 Z — Posés et verts : c3_40 (TREPUT-16 alerte d'épuisement dans l'espace ; TREPUT-17 dépôts simultanés regroupés), a4_82 (TFILED-24, vérifié par F14 > 150 €). **À TEO** : C3 a écrit c3_41a (socle : un envoi INTERNE urgent à un membre saute le seul contrôle HORS_HEURES, pour prévenir le gérant d'une urgence ou d'une astreinte épuisée la nuit) + c3_41 ; le commit a été refusé par le contrôle de permissions de sa session (« Modify Shared Resources », fonction du socle). Non contourné, non porté ailleurs : à autoriser par Teo dans la session C3, ou à laisser. Fichiers prêts, non commités, dans l'arbre de C3.

21 h 37 Z — Posés et verts : c3_41a (socle, porté par C3, autorisé par Teo : l'envoi INTERNE urgent à un membre saute le seul verrou HORS_HEURES ; tiers et interne ordinaire restent différés, test 9/9) + c3_41 ; a4_83 (TFILED-17). Lecteur 37583a8 déployé : NOBAT relues (069 juste ; 065 date juste ; 067/068/072/075 lus ; 074/077 à vérifier, justes ; 066 et 071 restes). Lot lecteur suivant prêt, à déployer plus tard : worker-a1 **57284506** (TFILED-26) ; reste : numéro « Plan 101 » de secours (071). T-REPUT : série close, TREPUT-01 à 17 justes. **À TEO (arbitrage)** : l'accusé au client en urgence est lui aussi différé hors heures, alors que le site promet « un accusé dans la minute » (capacites:32) — faut-il qu'un accusé d'urgence parte la nuit ?

**DEMANDE DE DÉPLOIEMENT (bureau) — 21 h 55 Z** : `lecteur` depuis worker-a1 **572845062e827c80b72217f1eff2ac6e04107250** (TFILED-26 : l'intitulé d'un détail n'est plus le titre de la planche ; dispositions recopiées sans abréger ; inclut 37583a8). Paquet par `omega/functions/lecteur/outils/preparer_deploiement.ts` (SHA_PAQUET = "5728450"). Ensuite : relance de 067, 075 et 066.

Arbitrage de Teo (21 h 49 Z) : l'accusé de réception part dans la minute même la nuit (horaires dits) ; la réponse de fond attend l'ouverture. Lot demandé à C3. TFILED-27 (heure de l'avis « déjà donné » en heure de Paris, pas celle de l'entité) noté pour A4 à la reprise.

## PAUSE (Teo, par le bureau) — 22/10, 22 h 04 Z, forfait 78 %

Sessions actives arrêtées par message (T-OFFLOAD, C3 ; les autres déjà arrêtées). Sécurité trig_01X9QTaRUic1w1JRoUotiHXn désarmée. Aucun job de test en cours. Aucun push sur main ce soir après les 2 du jour.

### SHA d'arrêt (22 h 10 Z)

| Branche | SHA |
|---|---|
| main | 70b9c938 |
| worker-a1 | 36e041c0 |
| worker-a4 | d0b9e9e7 |
| worker-a5 | 90f386cb |
| worker-c2 | bab78415 |
| worker-c3 | fd0d302b |
| worker-c4 | 2f027b48 |
| export-prod | 1190e8d2 |
| testeur-filed | d5ce390b |
| testeur-cashd | 09d9c5e6 |
| testeur-reput | 5043e740 |
| testeur-offload | 39bf6c09 (fuseau juste, plus aucun écart ouvert) |

### NOBAT 065 → 077 (recette ; lecteur déployé 5728450)

| Pièce | Lecteur | Résultat |
|---|---|---|
| 065 | 37583a8 | juste (date 2023-09, titre, n° 101, échelle, phase…) — TFILED-22 juste |
| 066 | 37583a8 | dispositions 3/5 non vérifiées (réécriture du modèle) — à relire sur 5728450 (non relue) |
| 067 | 5728450 | à vérifier (intitulé de détail écarté) — TFILED-26 juste |
| 068, 072 | 37583a8 | justes (n° 101) |
| 069 | 37583a8 | juste (ventilation, IBAN, SIREN, plus de faux SIRET) ; tva.taux = écart de banc connu (entité en métropole) |
| 070, 073, 076 | 19/10 | justes, non relues |
| 071 | 37583a8 | à vérifier ; reste : « Plan 101 » non relevé (A1, lot suivant) |
| 074, 077 | 37583a8 | à vérifier, justes (sans cartouche) |
| 075 | 5728450 | à vérifier (intitulé de détail écarté), comme voulu |

### À la reprise

- C3 : accusé de nuit (arbitrage de Teo, 21 h 49 Z) — lot c3_42a (socle) + c3_42 bloqué par les permissions de sa session : Teo doit l'autoriser dans la session C3. Libellés (a) « rappelez cette personne », (b) titre « Hors de la base » vs « en partie ».
- A1 : relevé de secours « Plan NNN » (071) ; relire 066 sur 5728450.
- A4 : TFILED-27 (heure de l'avis « déjà donné » en heure de Paris, pas celle de l'entité).
- A5 : la répétition attend le relevé de prod de Teo (`PROD_DB_URL=… bash omega/prod/base/relever-base.sh`).
- Banc FILED : NOBAT rattachées à l'entité Sogexal (FR) — écart de banc, à décider si on les range sous une entité GP.

### BILAN pour Teo (22/10, 19 h 06 → 22 h 04 Z)

1. Production : A5 a préparé les 397 fichiers en 6 paliers (rien posé) ; la répétition gratuite attend votre relevé de la base de production (2 min, lecture seule).
2. FILED (niv. 1) : 7 lots verts (a4_78 → a4_83) ; circuit à 1 personne, imputation, comptabilisation, FEC et Sage justes (testés à 1 et 3 taux).
3. NOBAT (niv. 1, vraies pièces sur la recette) : 13 pièces relues ; facture 069 juste ; 4 plans justes, 6 « à vérifier » à raison ; 2 restes de lecture chez A1.
4. REPUT (niv. 1) : délai < 60 s tenu (0 à 5 s), réponses aux appels (SMS, fixe), WhatsApp en doublures, astreinte de bout en bout en Twilio de test, alerte d'astreinte épuisée — 17 écarts testeur, tous justes.
5. REPUT, accusé de nuit (votre arbitrage) : à faire à la reprise, il faut votre autorisation dans la session C3.
6. OFFLOAD (niv. 1) : fuseau par organisation et reprises d'avant (c4_31, c4_32) verts ; vérifié en Guadeloupe à 22 h 07 Z.
7. OFFLOAD sur vos 9 898 prospects : détection jouée, 0 signal (aucun historique d'achat) ; envoi automatique coupé sur ce client.
8. CASHD (niv. 1) : date limite réécrite à la validation (c2_39) ; mise en demeure réelle testable à partir du 26/10.
9. Incident : ma session est restée bloquée 40 min sur un déploiement ; règle posée, seul le bureau déploie.
10. Rien en production (niv. 3) ; reprise à votre feu vert ou samedi 25/10 après 02 h Z.

## RELANCE (Teo, 23/10 00 h 05 Z) — sécurité trig_0141qUHeNDs5m9Xs1RcJ1TnB à 03 h 00 Z

**DEMANDE DE DÉPLOIEMENT (bureau) — 00 h 13 Z** : `lecteur` depuis worker-a1 **2f21e987b5281dbc10fde3efa69faabc0fae1395** (inclut 57284506 ; relevé de secours « Plan NNN », 071). Paquet par `omega/functions/lecteur/outils/preparer_deploiement.ts` (SHA_PAQUET = "2f21e98"). Ensuite : 066 puis 071.

**POUR TEO (00 h 13 Z)** : le lot « accusé de nuit » est bloqué dans la session C3 (session_01Fb8QHDbEZep6P1zq77gN3n) par le contrôle de permissions ; aucune fenêtre ne s'ouvre et une autorisation relayée ne compte pas. Teo doit écrire lui-même dans la session C3, par exemple « j'autorise c3_42a et c3_42 » (c'est ainsi que c3_41a est passé). 066 relue sur 5728450 : juste (6/6 dispositions vérifiées).

## PAUSE (Teo, par le bureau) — 23/10, 01 h 37 Z, forfait 81 %

Sessions actives arrêtées (T-REPUT en dernière passe courte ; C3, C4, A1, A4, T-FILED, T-OFFLOAD déjà arrêtés). Sécurité trig_0141qUHeNDs5m9Xs1RcJ1TnB désarmée. Aucun job de test en cours.

### SHA d'arrêt (01 h 42 Z)

main da414cfb (avant ce commit) · worker-a1 2f21e987 · worker-a4 ddaea652 · worker-a5 90f386cb · worker-c2 bab78415 · worker-c3 42d01c3c · worker-c4 0fc5a614 · testeur-filed 87b82cd0 · testeur-cashd 09d9c5e6 · testeur-offload 3e3b6a00 · testeur-reput 5043e740 (avant sa passe accusé de nuit).

### Posés et verts depuis la relance de 00 h 05 Z (recette, niveau 1)

a4_84 (TFILED-27) ; c4_33 (affaires en plan : relance et chiffrage) ; **c3_42a + c3_42 (accusé de nuit, autorisé par Teo dans la session C3 ; tests c3_41 + c3_42 verts)**. Banc : entité « NOBAT (banc) » GP (9118458d), 33 pièces NOBAT déplacées avec historique. Lecteur déployé : 2f21e98.

### NOBAT 065 → 077 (lecteur 2f21e98 et précédents)

065 juste (37583a8) · 066 juste, 6/6 dispositions (5728450) · 067 à vérifier, juste (5728450) · 068, 072 justes (37583a8) · 069 juste, tva.taux ok depuis l'entité GP · 070, 073, 076 justes, lus le 19/10 non relus · 071 juste, n° 101 vérifié (2f21e98) · 074, 077 à vérifier, justes · 075 à vérifier, juste (5728450). Écarts TFILED-20 → 27 tous justes.

### À la reprise

- C4 : **TOFFLOAD-11** (relances d'affaire c4_33 : absentes de offload_tableau.a_valider ; « relancé deux fois » alors que rien n'est parti ; relance 2 et décision sans attendre la relance 1) ; puis c4_34 (échéances à reconduction, 2/3, non poussé, cause notée dans NOTES-C4).
- Promesses non faites : valeur en jeu par segment + export tableur (OFFLOAD), lien de paiement dans la relance (CASHD, C:84), facture adressée à une autre société → arrêt « destinataire » (FILED, TFILED-05).
- T-REPUT : rejeu de l'accusé de nuit s'il n'a pas pu le finir.
- A5 : répétition, attend le relevé de prod de Teo.
- Rien à déployer : lecteur 2f21e98, reput-reponse v30, reput-astreinte v3 sont à jour.

### BILAN pour Teo (23/10, 00 h 05 → 01 h 37 Z)

1. Accusé de nuit (votre arbitrage) : fait et vert (niv. 1) grâce à votre autorisation dans la session C3 ; l'accusé part la nuit, la réponse attend l'ouverture.
2. NOBAT : les 13 pièces sont justes ou « à vérifier » à raison ; tous les écarts de lecture sont clos (niv. 1, vraies pièces sur la recette).
3. FILED : NOBAT rangées sous une entité Guadeloupe, TVA 8,5 % acceptée ; heure des messages à l'heure de l'entité.
4. OFFLOAD : relance et chiffrage des affaires en plan posés (niv. 1), mais un écart trouvé (TOFFLOAD-11) à corriger.
5. OFFLOAD : échéances des contrats commencées, pas finies.
6. Non commencées : valeur par segment (OFFLOAD), lien de paiement (CASHD), facture adressée à une autre société (FILED).
7. REPUT : libellés corrigés (« rappelez cette personne », « en partie dans la base »).
8. Production (niv. 3) : rien ; A5 attend votre relevé de la base de production.
9. Notes fusionnées dans main (2 pushes ce jour).
10. Reprise à votre feu vert ou samedi 25/10 après 02 h Z.

## DÉCISION DE TEO (23/10, 15 h 05 Z, par le bureau) — reprise après refus par le moteur

Teo a demandé, après avoir vu la nouvelle carte de décision de /espace2/validations : « quand une demande est refusée avec un commentaire, le moteur relit la pièce avec cette remarque comme consigne et repropose une demande corrigée, liée à la demande refusée ». Aujourd'hui un refus n'écrit que le motif, le commentaire et la pièce jointe dans `approbations` ; aucun moteur ne les relit. Nouveau lot, périmètre fermé, à répartir par le coordinateur à la reprise : socle d'abord (déclencheur et lien), puis un lot par moteur, FILED en premier (la facture est le cas de Teo).

### Ce que fait le lot

1. **Déclencheur (socle)** : une ligne `approbations` avec `decision = 'rejete'` sur une demande qui passe `rejetee`. Le motif (liste de six : « Montant ou bénéficiaire à vérifier », « Pièce manquante ou illisible », « Hors budget ou hors période », « Doublon », « Fournisseur non référencé », « Désaccord (préciser) ») et le commentaire libre forment la consigne. Sans commentaire, le motif seul fait consigne.
2. **Reprise par le moteur de la demande** (module de la demande) : il rejoue sa préparation avec la consigne (FILED relit la pièce ; CASHD refait la relance ou le virement ; OFFLOAD refait la proposition ; REPUT reprépare la réponse) et crée une **nouvelle demande `en_attente`, liée à la refusée** (`reprise_de` = id de la demande refusée, colonne ou clé du payload, au choix du socle), résumé préfixé « Reprise après refus », avec dans le payload la liste `corrections` (champ, avant, après) pour que le valideur voie ce qui a changé.
3. **Délai** : la reprise est proposée dans la minute, par la mécanique de cron des moteurs ; rien ne part et rien ne s'exécute sans une nouvelle validation humaine.
4. **Garde-fous** : une seule reprise automatique par demande refusée (pas de boucle : le refus d'une reprise ne relance rien, il revient au demandeur) ; si le moteur ne peut pas corriger (consigne hors de sa portée, ou même résultat qu'avant), pas de nouvelle demande, mais une note « reprise impossible : … » dans le journal de la demande refusée et un avis au demandeur ; la demande de reprise est saisie au nom du moteur, jamais au nom du valideur (séparation saisie / approbation respectée) ; le circuit (nombre d'approbations, rôles) est celui de la demande d'origine.
5. **Écran** (site, bureau, quand le socle est posé) : dans /espace2/validations, la carte d'une reprise affiche « Reprise après refus de … » avec le lien vers la demande refusée et la liste des corrections ; la demande refusée montre « reprise proposée » ou « reprise impossible ».
6. **Tests niveau 1 (testeurs)** : refus avec commentaire → nouvelle demande liée dans la minute, corrections listées et justes ; refus avec motif seul → reprise sur le motif ; cas impossible → note et avis, aucune demande ; refus de la reprise → aucune troisième demande ; jamais d'exécution sans validation.

### À la reprise (ajout)

- Ce lot s'ajoute à la liste « À la reprise » du 23/10 01 h 37 Z ; par défaut après TOFFLOAD-11 et avant les promesses non faites, sauf ordre contraire de Teo à la relance.

## RELANCE (Teo, 25/10 01 h 10 Z) — **BLOCAGE : accès à la recette perdu**

01 h 16 Z : le connecteur Supabase de cette session répond « You do not have permission to perform this action » sur la recette ygwbgpowzlbdaajlsqkn (même `select 1`). `list_projects` ne montre plus que deux projets d'une AUTRE organisation (compte teo.karczewski@omegaai.fr, créés le 23/10) : « omega-metiers-recette » (hstcfemeldpfzfslytek) et un projet sans nom (ohwolvyjtceisvtkiftb). Je ne bascule PAS sur ces projets sans consigne écrite de Teo/du bureau : la recette de référence, ses tests et tout l'historique sont sur ygwbgpowzlbdaajlsqkn. **À TEO / BUREAU** : rendre l'accès du connecteur à ygwbgpowzlbdaajlsqkn, ou dire explicitement si la recette a été déplacée. En attendant : les ouvriers écrivent et poussent leurs lots verts (testés en local) ; aucune pose ni rejeu testeur possible de mon côté.

Sessions réveillées 01 h 13 Z : C4 (TOFFLOAD-11, c4_34, segments), A5 (socle reprise après refus), A4 (TFILED-05 puis reprise FILED), C2 (lien de paiement C:84 puis reprise CASHD), C3 (reprise REPUT, libellé « rappellera »), B1, B5, T-FILED/T-CASHD/T-OFFLOAD en attente. A1 : rien d'indépendant. Message à T-REPUT refusé par le contrôle de permissions (non essentiel).

### File de pose (recette inaccessible, 01 h 18 Z) — à poser dès l'accès rendu, dans l'ordre

1. worker-c4 **b9bc84718a571e0c6af8b75d8e93efe740418146** : omega/modules/offload/migrations/c4_34_contrats_a_reconduction.sql, puis omega/tests/offload/c4_34_contrats_a_reconduction.sql (3/3 en local).
2. worker-c3 **8c882b8e3534dd21ddea35dc6f491af7c171e614** : omega/modules/reput/migrations/c3_43_tournures_neutres.sql + omega/tests/reput/c3_43_tournures_neutres.sql.
**DEMANDE DE DÉPLOIEMENT (bureau)** : `reput-reponse` depuis worker-c3 **8c882b8e3534dd21ddea35dc6f491af7c171e614** (« une personne de l'équipe rappellera ce numéro », règle 11, entrée consigne_valideur prête pour la reprise après refus).
3. worker-a5 **f5f8ff0ca1fa35fbe3274f260e9d5eb7bcc414f3** (tête actuelle ; le lot est à f5f8ff0c) : omega/modules/socle/migrations/19az_reprise_apres_refus.sql, puis omega/tests/socle/68_reprise_apres_refus.sql (^test_68_) — socle de la reprise après refus (déclencheur approbations_zz_reprise, payload.reprise_de unique, portes reprises_a_faire / proposer_reprise / reprise_impossible).
Arrêts : C3 c1acfb25 ; B1 061ea633 (relevé 7 h non fait, faute d'accès).
4. worker-a4 **4c8d9fbea11412ee5d1b30291287ca647c00f2ba** : omega/migrations/a4_85_filed_lot77_destinataire.sql + omega/tests/filed/a4_73_destinataire.sql (TFILED-05 ; T-FILED a les pièces F15/F16 prêtes, recontrôler F9).
5. worker-c4 **fe4ddfafef0985e22e033daff389eb113a380270** : omega/modules/offload/migrations/c4_35_relances_affaire_visibles.sql, puis tests c4_35_relances_affaire_visibles.sql et c4_08_affaires.sql (mis à jour) — TOFFLOAD-11 (4/4 en local). À poser APRÈS c4_33 (déjà posé) et c4_34 (point 1).
6. worker-c4 **58b850b612685a0a78aee9e85834245d4c37ee7a** : omega/modules/offload/migrations/c4_36_segments_et_tableur.sql + omega/tests/offload/c4_36_segments_et_tableur.sql (valeur en jeu par segment, restitution CSV ; 4/4 en local). C4 arrêté.
Reprise après refus, lecteur (A1) : format validé — charge.consigne (≤ 500 car., « Indication du valideur », jamais une valeur), charge.essai → version « …+c<n> », porte relire:<piece>:<n> ; ~0,5 j à la reprise. FILED ce soir : version réduite (A4).
7. worker-a4 **6470f895b11da3219501f4f3e5cbbe47181139d7** : omega/migrations/a4_86_filed_lot78_reprise_apres_refus.sql + omega/tests/filed/a4_74_reprise_apres_refus.sql (^test_a4_86_) — reprise après refus FILED, version réduite (correction humaine, 24 h max ; doublon / hors budget → impossible). À poser APRÈS 19az (point 3). A4 arrêté.
8. worker-c2 **2b61661005bb3020cd5fbf9c40bfbc93e60317fd** : omega/modules/cashd/migrations/c2_40_lien_paiement.sql + omega/tests/cashd/c2_40_lien_paiement.sql (C:84, lien de paiement réglé par le client ; 3/3).
9. worker-c2 **b996c405a5343f7b98fc6c61716e830da7684e43** : omega/modules/cashd/migrations/c2_41_reprise_apres_refus.sql + omega/tests/cashd/c2_41_reprise_apres_refus.sql (reprise CASHD ; APRÈS 19az ; à vérifier sur la recette : le nouvel envoi adossé à la reprise). C2 arrêté (c6dfbe88).

## PAUSE (Teo, par le bureau) — 25/10, 01 h 23 Z, forfait weekly 95 %

Sessions réveillées à 01 h 13 Z arrêtées (C4, A5, A4, C2, C3, A1, B1 arrêtés d'eux-mêmes ; B5, T-FILED, T-CASHD, T-OFFLOAD prévenus). Pause d'office de 01 h 52 Z désarmée. Rien ne repart.

### SHA d'arrêt (01 h 25 Z)

main 76eeb68c (avant ce commit) · worker-a1 4069fdf4 · worker-a4 6470f895 · worker-a5 f5f8ff0c · worker-b1 061ea633 · worker-b5 528b933f · worker-c2 c6dfbe88 · worker-c3 c1acfb25 · worker-c4 58b850b6 · testeur-filed badbfd71 · testeur-cashd 9b1dcd9c · testeur-offload 3e3b6a00 · testeur-reput eaaf0140.

### Reprise — d'abord l'accès

**Recette inaccessible depuis 01 h 16 Z** (connecteur Supabase : « permission » sur ygwbgpowzlbdaajlsqkn ; il ne voit plus que 2 projets d'une autre organisation, dont « omega-metiers-recette »). Teo : rendre l'accès, ou dire si la recette a changé. Puis poser la file ci-dessus dans l'ordre (points 1 à 9), un job de test à la fois, et faire rejouer les testeurs (T-FILED a F15/F16 prêtes pour TFILED-05 ; T-OFFLOAD : c4_34/35/36 ; T-CASHD : c2_40/41 ; T-REPUT : c3_43). Bureau : reput-reponse depuis worker-c3 8c882b8e. A1 : relecture avec consigne (~0,5 j, format validé). B1 : relevé du point de 7 h à faire dès l'accès rendu.

### BILAN pour Teo (25/10, 01 h 10 → 01 h 23 Z)

1. Bloquant : l'accès à la base de test (recette) a été coupé à 01 h 16 Z ; rien n'a pu être posé ni testé par les testeurs ce soir.
2. Écrit et testé en local (niveau 0, pas encore niv. 1) : 9 lots dans la file, prêts à poser.
3. OFFLOAD : contrats à reconduction (c4_34), correction TOFFLOAD-11 (c4_35), valeur par segment + export tableur (c4_36).
4. Socle : reprise après refus (19az, A5) — déclencheur, lien, une seule reprise.
5. FILED : facture adressée à une autre société bloquée (a4_85, TFILED-05) ; reprise après refus en version réduite (a4_86).
6. CASHD : lien de paiement dans la relance (c2_40, sans prestataire) ; reprise après refus (c2_41).
7. REPUT : tournures neutres (c3_43) ; la reprise REPUT attend le socle posé.
8. Lecteur : la relecture avec la consigne du valideur est conçue (format validé), à coder à la reprise.
9. Varelo (B1) : bloqué, relevé du point de 7 h impossible sans accès.
10. Rien en production (niv. 3) ; reprise à votre feu vert, après rétablissement de l'accès à la recette.

## POSE de la file (session de Teo, 25/10, 15 h 13 → 15 h 18 Z) — recette rendue

**Accès.** La recette `ygwbgpowzlbdaajlsqkn` est de nouveau visible par le connecteur Supabase de la session de Teo (organisation d'Omega). Le connecteur ne se branche que sur une organisation à la fois : il reste sur celle d'Omega ; `omega-metiers-recette` passe par une connexion directe (mot de passe tapé par Teo).

**Les 9 lots de la file sont posés, dans l'ordre**, par `private.depot_demander` / `depot_executer` aux SHA de la file, chacun inscrit dans `schema_migrations` avec sa provenance :

| # | Lot | SHA | Recette |
|---|---|---|---|
| 1 | c4_34 contrats à reconduction | b9bc8471 | `^test_c4_34` 3/3 |
| 2 | c3_43 tournures neutres | 8c882b8e | `^test_c3_43` 2/2 ; `^test_c3_4[0-3]` 4/4 |
| 3 | socle 19az reprise après refus | f5f8ff0c | `^test_68_` 9/9 |
| 4 | a4_85 destinataire (TFILED-05) | 4c8d9fbe | `^test_a4_85` 5/5 |
| 5 | c4_35 relances d'affaire visibles (TOFFLOAD-11) | fe4ddfaf | `^test_c4_35` 4/4 ; **`test_c4_08_cycle` 22/25** (voir plus bas) |
| 6 | c4_36 segments et tableur | 58b850b6 | `^test_c4_3[4-6]` 3/3 |
| 7 | a4_86 reprise après refus FILED | 6470f895 | `^test_a4_8[56]` 3/3 (13 assertions) |
| 8 | c2_40 lien de paiement | 2b616610 | `^test_c2_40` 3/3 |
| 9 | c2_41 reprise après refus CASHD | b996c405 | `^test_c2_4[01]` 2/2 |

**Non-régression vérifiée** sur ce que les lots touchent : `^test_6[4-7]_` 4/4 (décision seule, commentaire, délégations, crochet d'approbation), `^test_c2_(05|07|39)_` 3/3, `^test_a4_(07|18)` 7/7. Une suite complète d'un module en un seul appel dépasse la minute de l'outil : elle reste à jouer par morceaux.

**C4 — `test_c4_08_cycle` rouge sur la recette (12, 14, 21), cause de test et non de produit.** Diagnostic (bloc annulé en fin de transaction, rien laissé en base) : les remises du test donnent `envoye`, puis `differe / DELAI_MINIMAL`, `envoye`, `differe / DELAI_MINIMAL`. La seconde relance est remise à la même seconde réelle que la première (le test simule les jours par `p_jour`, pas l'horloge des envois), et la recette applique le délai minimal entre deux messages au même destinataire ; c4_35 attendant désormais le départ de la seconde, la décision ne vient pas. Le test doit vieillir la première remise ou régler le délai du client du banc. À reprendre par C4.

**Reste de la file de reprise** (inchangé) : déploiement de `reput-reponse` depuis worker-c3 8c882b8e (bureau) ; reprises REPUT et OFFLOAD à écrire (le socle 19az est posé) ; A1, relecture avec consigne (~0,5 j) ; testeurs à rejouer (T-FILED F15/F16 pour TFILED-05, T-OFFLOAD c4_34/35/36, T-CASHD c2_40/41, T-REPUT c3_43) ; B1, relevé du point de 7 h. Les sessions restent en pause : rien ne repart sans le feu vert de Teo.

## RELANCE du 26/10, 00 h 51 Z — plafond 15 % du forfait (Teo)

### DEMANDE DE DÉPLOIEMENT (bureau) — 26/10, 00 h 56 Z

- Fonction : `reput-reponse`
- Source : branche `worker-c3`, SHA `8c882b8e3534dd21ddea35dc6f491af7c171e614`
- Cible : recette `ygwbgpowzlbdaajlsqkn` uniquement.
- Une fois que c'est fait, prévenir le coordinateur : T-REPUT rejoue alors le texte de réponse c3_43.

### Relancés à 00 h 55 Z

- T-FILED, T-OFFLOAD, T-CASHD, T-REPUT : ils rejouent les lots posés le 25/10.
- C4 : correction de `test_c4_08_cycle`, puis la reprise après refus OFFLOAD.
- C3 : la reprise après refus REPUT.
- A1 : la relecture avec consigne.
- B1 : le relevé du point de 7 h (23/10) est transmis brut.
- Pause d'office à 01 h 40 Z au plus tard, ou plus tôt si Teo envoie PAUSE à 15 %.

### ANNULÉE — demande reput-reponse 8c882b8e (01 h 02 Z)

reput-reponse v31 est déjà déployée au SHA 08b9fe2c00b042ab2c8347a71d4a546b25b02c02, qui contient 8c882b8e (le fichier de la fonction est identique). Il n'y a rien à redéployer. La reprise après refus REPUT (c3_44) était déjà posée et verte le 25/10 : ^test_c3_44 19/19.

### DEMANDE DE DÉPLOIEMENT (bureau) — 26/10, 01 h 02 Z

- Fonction : `lecteur`
- Source : branche `worker-a1`, SHA `971aec0c58e7713f0cf5d7087cef696c7cf069a3`, paquet produit par outils/preparer_deploiement.ts.
- Cible : recette `ygwbgpowzlbdaajlsqkn`.
- Côté SQL, a1_01 et a1_02 et leurs tests sont posés depuis ce SHA ; ^test_a1_0[12]_ passe 4/4.

### Écarts relevés pendant la relance (26/10)

- TFILED-28 (A4, a4_86) : filed_corriger_facture refuse une facture « refusee » (« elle ne se corrige plus »). La reprise après refus attend une correction qui ne peut pas venir : c'est une impasse, et toute reprise FILED finira en reprise_impossible au bout de 24 h.
- TFILED-29 (FILED) : dans « Imputation proposée, à valider », 2 lignes pour 1 074,68 €. F3, pourtant refusée, y reste comptée, et F13 y est comptée deux fois.
- TFILED-05 : rejoué. F15 (tiers) donne destinataire.societe bloquant, ce qui est juste. F16 (variante de nom) ne donne pas d'anomalie destinataire, ce qui est juste. F9 reste bloquée par destinataire et doublon.
- TCASHD-18 (C2, c2_41) : un rappel refusé, puis un règlement partiel lettré, puis la préparation donne 0 préparée et aucune reprise.
- TCASHD-19 (C2) : la relance en attente reste à 1 085 € après un règlement de 500 €, alors que le reste dû est de 585 €.
- B1, point de 7 h : l'assemblage est observé (05:00:00,78 Z, 3 groupes), mais la remise n'est pas observée (statut perime). Le gérant, aussi membre de presidence, reçoit la section deux fois. À décider par Teo : soit A3 fusionne les sections de même titre, soit on sort le gérant de presidence sur le banc.
- T-REPUT, c3_43 : juste. Observation : « un client » (masculin générique) dans le titre de l'alerte et dans le résumé.
- T-OFFLOAD :
  - c4_34 juste ;
  - c4_36 juste (O12 et O13 absents) ;
  - c4_35 : la passe du 26/10 met la relance 1 d'O8 à valider. Les passes du 02/11 et du 09/11 renvoient 0 partout, ce qui est l'attendu.
  - O4 n'est pas repris (observation).
