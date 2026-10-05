# Notes du coordinateur — vague 1

Tenu par le coordinateur (session chef). Les ouvriers A1 à A5 lisent ce
fichier ; Teo lit la session du coordinateur, pas celles des ouvriers.

## Recette `omega-recette` (ygwbgpowzlbdaajlsqkn) — état au 5 octobre 2026, 20 h

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
| filed_lot4a … filed_lot4g, filed_lot5a, filed_lot6a | les neuf migrations d'A4 (`omega/migrations/a4_01` à `a4_09`) : exercices, plan comptable, centres, imputations apprises, charges récurrentes, identité TVA/SIREN, archivage probant, pilotage, circuit de validation, branchements, acquittement d'alerte. `filed_factures_statut_check` retiré, `filed_factures_statut_v2` en place |

Tests sur la recette : a4_01 à a4_04 verts (après adaptation des jeux de
données aux colonnes réelles, renvoyée à A4) ; pgTAP d'A5 : 26 verts sur 44,
le reste renvoyé à A5 avec les faits du socle (voir messages du 5/10, 17 h 40
et 18 h 00). Vrai trou relevé par le test 44 : EXECUTE à PUBLIC sur les
fonctions de `private` ; migration `a5_01` demandée à A5.

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
lue dans Vault (`vault.decrypted_secrets`, nom `cle_service`). **Tant que ce
secret n'est pas posé, les crons ne font rien.**

### Ce que Teo doit poser (recette)

1. Supabase → Edge Functions → Secrets : la liste ci-dessus.
2. Supabase → Vault : `cle_service` = clé `service_role` du projet.
3. GitHub → Settings → Secrets : `SUPABASE_DB_URL`, `SAUVEGARDE_PHRASE`
   (workflow de sauvegarde d'A5).
4. Brevo : webhook transactionnel vers `/functions/v1/webhooks-brevo`, avec le
   jeton ; domaine inbound vers `/functions/v1/reception/brevo`.

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

## Branches des ouvriers

| Session | Branche | État |
|---|---|---|
| A1 lecteur | worker-a1 | v3 déployée ; 42 tests ; attend les secrets Bedrock et le Vault |
| A2 expéditeur / réception | worker-a2 | fini, déployé, 60 tests ; attend les secrets pour l'essai réel |
| A3 écran client | worker-a3 | deux lots fusionnés ; rendu PDF en cours |
| A4 FILED compta | worker-a4 | neuf lots posés ; tests à aligner sur les colonnes de la recette (renvoyé) |
| A5 garde-fous | worker-a5 | 44 tests lancés sur la recette : 26 verts ; corrections et `a5_01` (EXECUTE sur private) attendues |
