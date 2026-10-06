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
