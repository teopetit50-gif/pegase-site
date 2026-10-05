# Notes du coordinateur — vague 1

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
| socle_lot19g | `private.canaux_envoi` : sms et whatsapp bornés pour le non-transactionnel à 08:00–20:00, lundi–samedi (décision du coordinateur, à confirmer par Teo) |
| socle_lot19h | publication Realtime `supabase_realtime` : `demandes_validation`, `approbations`, `filed_documents`, `filed_factures`, `delegations`, `filed_controles`, `filed_historique`, `points_du_jour` (demandé par A3) |
| socle_lot19i | `private.fournisseurs_envoi` : Brevo `branche = true` sur la recette |
| a5_01_private_execute | EXECUTE sur `private` retiré à PUBLIC/anon/authenticated puis rendu à la liste requise (migration d'A5 + compléments c/d/e du coordinateur : fonctions des triggers SECURITY INVOKER de private, des vues de public lisibles, des CHECK/defaults). Résultat : authenticated 187/741, anon 0. Liste figée : `omega/a5_01_liste_figee.txt` |
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
| `lecteur` (v3, commit 976853d) | A1 | true | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (eu-central-1), `BEDROCK_MODEL_ID`, `MISTRAL_API_KEY` (facultatif) |
| `expediteur` (v2) | A2 | true | `BREVO_API_KEY` |
| `webhooks-brevo` (v1) | A2 | false | `BREVO_WEBHOOK_JETON` |
| `reception` (v1) | A2 | false | `BREVO_WEBHOOK_JETON`, `BREVO_API_KEY`, `META_VERIFY_TOKEN`, `META_APP_SECRET`, `META_ACCESS_TOKEN`, `FORMULAIRE_SECRET`, `FORMULAIRE_BOITE` |

Le paquet du lecteur se construit comme `lecteur/outils/preparer_deploiement.ts`
(fichiers `.ts` hors tests, `schemas/`, `_partage/` copié sous la fonction,
`deno.json` avec `@partage/` → `./_partage/`), `import_map_path = deno.json`.

Les crons appellent les fonctions avec `Authorization: Bearer <cle_service>`
lue dans Vault (`vault.decrypted_secrets`, nom `cle_service`). Posé par Teo le
5/10 à 18 h 37 Z : les deux crons tournent chaque minute (lecteur 200,
`IA_NON_BRANCHEE` sans Bedrock ; expéditeur 200). Secrets Edge posés par Teo à
18 h 45 Z (webhooks-brevo et reception répondent 401 sans signature : bon).

### Ce que Teo doit encore poser (recette)

1. Brevo : restriction d'IP désactivée, expéditeur `essais@omegaai.fr` déclaré,
   webhook transactionnel posé (fait le 5/10). Reste : couper le suivi
   d'ouverture/clic ; supprimer le webhook « omega » Marketing.
2. Edge Secrets manquants : `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
   (Bedrock, eu-central-1), `META_APP_SECRET`, `META_ACCESS_TOKEN`.
3. GitHub → Settings → Secrets : `SUPABASE_DB_URL`, `SAUVEGARDE_PHRASE`
   (workflow de sauvegarde d'A5).
4. Brevo : domaine inbound vers `/functions/v1/reception/brevo` (le webhook
   transactionnel est posé).
5. Confirmer la décision sms/whatsapp 08 h–20 h lundi–samedi (lot 19g).

### Règles de pose

- L'outil Supabase bloque sur `DROP TABLE`, `DROP POLICY`, `DELETE` (il attend
  une confirmation qui n'arrive jamais). `alter table … drop constraint` passe.
  Les migrations confiées au coordinateur n'en contiennent donc pas.
- `apply_migration` expire ; on passe par `execute_sql` et on inscrit la ligne
  dans `supabase_migrations.schema_migrations` à la main.
- Toute nouvelle table de `public` : `revoke all … from anon, authenticated`
  puis `grant select … to authenticated` si une politique la lit. Les default
  privileges retirent désormais TRUNCATE/REFERENCES/TRIGGER d'office.
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
| A1 lecteur | worker-a1 | v3 déployée, crons actifs ; 42 tests ; attend les clés Bedrock (Teo) |
| A2 expéditeur / réception | worker-a2 | fini, déployé, 60 tests ; chaîne d'envoi vérifiée jusqu'à Brevo (401 IP, côté Teo) |
| A3 écran client | worker-a3 | quatre lots en ligne (43c4f68, 372df1c, 3aa753d, b99131d) ; compte de recette fourni pour la relecture |
| A4 FILED compta | worker-a4 | neuf lots posés, tests verts ; fini, attend la prod |
| A5 garde-fous | worker-a5 | `a5_01` posé avec compléments ; 10 tests à corriger (renvoyés) ; liste figée dans `omega/a5_01_liste_figee.txt` |
