# Notes du coordinateur — vague 1

Tenu par le coordinateur (session chef). Les ouvriers A1 à A5 lisent ce
fichier ; Teo lit la session du coordinateur, pas celles des ouvriers.

## Recette `omega-recette` (ygwbgpowzlbdaajlsqkn) — état au 5 octobre 2026, 17 h

### Migrations posées aujourd'hui (par `execute_sql`, inscrites dans `schema_migrations`)

| Lot | Contenu |
|---|---|
| socle_lot17_portes_ouvrier | `prendre_travaux`, `battre_ouvrier` (public, service_role) |
| socle_lot18a/b/c/d | table `receptions`, portes `resoudre_boite` (canaux expediteurs + `formulaire` via `clients.config.boite_formulaire`), `deposer_reception`, `noter_remise` à 6 arguments (idempotente sur `envois_evenements.cle`) |
| socle_lot19a | `regles_validation` et `demandes_validation` : `exige_commentaire`, `exige_piece`, `exige_motif` (recopiés par `preparer_demande`) ; `approbations.piece_id` ; `public.annuaire(p_client)` |
| socle_lot19b | portes du lecteur `piece_a_lire`, `consommation_ia_jour`, `lire_parametre` ; réglage `plafond_ia_jour_client` = 5 dans `private.reglages` ; crons `omega-lecteur` et `omega-expediteur` ; extension `pgtap` ; politique Storage SELECT sur `omega-clients` pour les membres |

### Fonctions Edge déployées

| Fonction | Session | verify_jwt | Secrets attendus |
|---|---|---|---|
| `lecteur` (v2) | A1 | true | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (eu-central-1), `BEDROCK_MODEL_ID`, `MISTRAL_API_KEY` (facultatif) |
| `expediteur` (v2) | A2 | true | `BREVO_API_KEY` |
| `webhooks-brevo` (v1) | A2 | false | `BREVO_WEBHOOK_JETON` |
| `reception` (v1) | A2 | false | `BREVO_WEBHOOK_JETON`, `BREVO_API_KEY`, `META_VERIFY_TOKEN`, `META_APP_SECRET`, `META_ACCESS_TOKEN`, `FORMULAIRE_SECRET`, `FORMULAIRE_BOITE` |

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

### Scories à effacer un jour dans l'éditeur SQL

- Tables d'essai `public.zz_essai_lot18`, `public.zz_essai_lot18b`.
- Réception d'essai `public.receptions` id 1 (client du banc).

## Branches des ouvriers

| Session | Branche | État |
|---|---|---|
| A1 lecteur | worker-a1 | code + 35 tests + banc ; à passer sur les portes du lot 19 |
| A2 expéditeur / réception | worker-a2 | fini, déployé, 60 tests ; attend les secrets pour l'essai réel |
| A3 écran client | worker-a3 | 3 écrans livrés ; proxy / layout / chrome.mjs en cours |
| A4 FILED compta | worker-a4 | lots 4a–4d, 5a, 6a écrits ; 4e (branchements) et 4f (validation) en cours |
| A5 garde-fous | worker-a5 | sauvegarde, 50 tests pgTAP, banc 100 factures, SECURITE.md ; tests à lancer sur la recette |
