# Fonctions Edge d'Omega — expéditeur, webhooks, réception

Trois fonctions Deno, hors de Postgres, qui ne voient la base que par les **portes**
du socle (fonctions `public.*` réservées au rôle de service, appelées en RPC avec la
clé de service que Supabase fournit à la fonction). Jamais d'écriture directe dans
une table. Chaque dossier est autonome : `index.ts` est l'entrée, `deno.json` porte
les options du compilateur et l'import `@std/assert` des tests, `portes.ts` le client
RPC et le contrat des portes, `doubles.ts` les doubles de test.

| Fonction | Dossier | Rôle | `verify_jwt` |
|---|---|---|---|
| `expediteur` | `expediteur/` | ouvrier `envois.brevo`, `envois.brevo_sms`, `envois.confirmer` ; appelé chaque minute | `true` |
| `webhooks-brevo` | `webhooks/brevo/` | événements de remise Brevo (remis, rebond, plainte, refus) | `false` |
| `reception` | `reception/` | e-mail entrant Brevo, WhatsApp Cloud API, formulaire du site | `false` |
| `messagerie` | `messagerie/` (`index.ts`) | ouvrier des messageries connectées : relève Gmail / Microsoft 365 → réceptions, brouillons `envois.gmail` / `envois.microsoft`, révocations ; chaque minute. Portes `messagerie_*` à poser | `true` |
| `messagerie-oauth` | `messagerie/` (`entree_oauth.ts`) | connexion OAuth Google et Microsoft (`google/…` et `microsoft/…` : `debut`, `retour`) | `false` |
| `depot` | `depot/` (`index.ts`) | dépôt par lot WebDAV (FILED) : un « dossier réseau » par organisation, Basic par dépôt, chaque fichier devient une pièce FILED. Lot 19am, guide `omega/GUIDE-DEPOT.md` | `false` |
| `pa-bac-a-sable` | `pa-bac-a-sable/` | faux serveur AFNOR XP Z12-013 (recette seulement) pour jouer `echange-pa` sans compte PA | `false` |
| `echange-pa` | `echange-pa/` | ouvrier `pa.statut` (et `pa.deposer`, refusé par FILED tant qu'Omega n'émet pas de factures) + relevé de la plateforme agréée ; appelé chaque minute. Portes `pa_*` : a4_18 | `true` |

Projet de recette : `ygwbgpowzlbdaajlsqkn` (`https://ygwbgpowzlbdaajlsqkn.supabase.co`).
Jamais la production depuis ces sessions.

## Tester en local

Prérequis : Deno 2 (`curl -fsSL https://deno.land/install.sh | sh`).

```sh
cd omega/functions/expediteur     && deno fmt --check && deno lint && deno check index.ts && deno test --allow-env
cd omega/functions/webhooks/brevo && deno fmt --check && deno lint && deno check index.ts && deno test --allow-env
cd omega/functions/reception      && deno fmt --check && deno lint && deno check index.ts && deno test --allow-env
cd omega/functions/echange-pa     && deno fmt --check && deno lint && deno check index.ts && deno test --allow-env
cd omega/functions/messagerie     && deno fmt --check && deno lint && deno check index.ts entree_oauth.ts && deno test --allow-env
cd omega/functions/depot          && deno fmt --check && deno lint && deno check index.ts && deno test --allow-env
cd omega/functions/pa-bac-a-sable && deno fmt --check && deno lint && deno check index.ts && deno test --allow-env
```

Les tests n'ont besoin ni de réseau ni de base : toutes les portes, Brevo, Graph et
le bucket sont doublés (`doubles.ts` et les doubles locaux des fichiers `*_test.ts`).
Chaque cas du contrat a son test ; les cas d'idempotence (deux livraisons du même
webhook, du même e-mail, de la même notification Meta, du même formulaire) vérifient
qu'une seule ligne est écrite.

Pour servir une fonction en local avec la CLI Supabase (optionnel) :

```sh
supabase functions serve reception --no-verify-jwt --env-file omega/functions/.env.local
```

(le fichier `.env.local` n'est pas versionné : il porte les variables ci-dessous).

## Déployer sur la recette

Par la CLI Supabase, depuis la racine du dépôt :

```sh
supabase functions deploy expediteur     --project-ref ygwbgpowzlbdaajlsqkn --import-map omega/functions/expediteur/deno.json
supabase functions deploy webhooks-brevo --project-ref ygwbgpowzlbdaajlsqkn --no-verify-jwt
supabase functions deploy reception      --project-ref ygwbgpowzlbdaajlsqkn --no-verify-jwt
```

ou par l'outil MCP Supabase `deploy_edge_function` (nom, `entrypoint_path: index.ts`,
`verify_jwt` selon le tableau, tous les fichiers `.ts` du dossier plus `deno.json`).
Le dossier `webhooks/brevo/` se déploie sous le nom `webhooks-brevo`.

Secrets des fonctions (`supabase secrets set --project-ref … NOM=valeur`, ou le
tableau de bord) :

| Variable | Fonctions | Rôle |
|---|---|---|
| `BREVO_API_KEY` | `expediteur`, `reception` | clé API v3 Brevo : envoi (mode essai ou expéditeur sans secret au coffre) et téléchargement des pièces entrantes. Absente : les envois sont reportés `FOURNISSEUR_NON_BRANCHE`, les pièces entrantes ignorées |
| `BREVO_WEBHOOK_JETON` | `webhooks-brevo`, `reception` | jeton bearer que Brevo envoie (champ `auth` du webhook) ; aussi accepté en en-tête `X-Omega-Jeton`. Absent : 503 |
| `META_VERIFY_TOKEN` | `reception` | jeton de vérification du webhook WhatsApp (GET `hub.verify_token`) |
| `META_APP_SECRET` | `reception` | secret de l'app Meta, vérifie `X-Hub-Signature-256`. Absent : 503 |
| `META_ACCESS_TOKEN` | `reception` | jeton système Graph pour télécharger les médias. Absent : médias ignorés, message reçu |
| `FORMULAIRE_SECRET` | `reception` | HMAC du formulaire du site. Absent : 503 |
| `FORMULAIRE_BOITE` | `reception` | boîte du formulaire, défaut `site:omegaai.fr` |

`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis par Supabase à chaque fonction.

Après déploiement :
- `expediteur` : le cron `omega-expediteur` (pg_cron → `net.http_post` chaque minute,
  clé de service lue dans Vault) appelle `POST …/functions/v1/expediteur`. Sans JWT la
  fonction répond 401 : normal.
- `webhooks-brevo` : sans `BREVO_WEBHOOK_JETON`, répond 503 `webhook non configuré` : normal.
- `reception` : routes `POST …/reception/brevo`, `GET|POST …/reception/whatsapp`,
  `POST …/reception/formulaire`. Autre chemin : 404.

## Expéditeur (`expediteur/`)

Un passage = `prendre_travaux(['envois.brevo','envois.brevo_sms','envois.confirmer'], 5, '10 minutes', ouvrier)`,
puis par travail :

- `envois.brevo` / `envois.brevo_sms`, charge `{"envoi": uuid}` :
  `commencer_envoi(envoi)` → `envoyer: false` : `finir_travail(travail, réponse)` ;
  `envoyer: true` : clé Brevo (`secret_expediteur` si `expediteur.secret`, sinon
  `BREVO_API_KEY`) → `POST /v3/smtp/email` ou `/v3/transactionalSMS/sms` →
  `confirmer_envoi(envoi, messageId)` (trois tentatives) →
  `finir_travail(travail, {fournisseur_id, remis_a})`.
  Erreur transitoire → `echouer_envoi(envoi, err, false)` + `finir_travail({reporte: true})`.
  Erreur définitive → `echouer_envoi(envoi, err, true)` + `finir_travail({echec: true})`.
- `envois.confirmer`, charge `{"envoi", "reference"}` (rapprochement) : rejoue
  `confirmer_envoi` ; repris tant que la porte tombe. Déposé par l'ouvrier lui-même
  (`deposer_travail`, clé `confirmer:<envoi>`, priorité 1) quand Brevo a accepté mais
  que `confirmer_envoi` est tombée trois fois : l'envoi n'est **jamais** ré-émis.
- `battre_ouvrier('expediteur', genres, bilan, '15 minutes')` en fin de passage, même à vide.

Tag Brevo `envoi:<uuid>` et en-têtes `X-Omega-Envoi`, `X-Mailin-custom` sur chaque
message : c'est ce que les webhooks renvoient. Aucun suivi d'ouverture ni de clic
(à désactiver aussi au niveau du compte Brevo).

## Webhook Brevo (`webhooks/brevo/`)

`POST` avec `Authorization: Bearer <BREVO_WEBHOOK_JETON>`. Corps : un événement, un
tableau, ou `{"events": [...]}`. E-mail (`event`) et SMS (`msg_status`) traduits vers
`noter_remise(p_fournisseur, p_reference, p_evenement, p_detail, p_survenu_le, p_cle)` :

| Brevo | `p_evenement` |
|---|---|
| `delivered` | `remis` |
| `hard_bounce` | `rebond` |
| `soft_bounce`, `deferred` | `rebond_temporaire` |
| `blocked`, `invalid_email`, `error` | `refuse` |
| `spam`, `unsubscribed` | `plainte` |
| `request`, `sent`, `accepted`, `reply`, `opened`, `unique_opened`, `click`, `loaded_by_proxy` | ignorés |

`p_fournisseur` = `brevo` (e-mail, référence `message-id`) ou `brevo_sms` (SMS,
référence `messageId` puis `reference`). `p_cle` =
`brevo:<canal>:<référence>:<event>:<horodatage ISO>`. Réponse 200 même si la
référence est inconnue ; 500 si la porte tombe (Brevo rejoue).

Essai à la main (jeton de test `J`) :

```sh
curl -s -X POST https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/webhooks-brevo \
  -H "Authorization: Bearer $J" -H 'Content-Type: application/json' \
  -d '{"event":"delivered","message-id":"<x@smtp-relay.mailin.fr>","ts_event":1791209001,"tags":["envoi:…"]}'
```

## Réception (`reception/`)

Trois entrées, un seul schéma : `resoudre_boite(canal, boite)` → client ; pièces
déposées en upsert dans le bucket `omega-clients` sous
`<client_id>/receptions/<identifiant externe assaini>/<nom>` ;
`deposer_reception(p_client, p_canal, p_boite, p_identifiant, p_de, p_de_nom, p_sujet, p_corps, p_corps_html, p_pieces, p_detail, p_recu_le)`
→ `{id, nouvelle}`, idempotente sur (client, canal, identifiant). La porte publie
elle-même `reception.nouvelle` et rattache la réception à l'envoi d'origine quand
`detail.en_reponse_a` (In-Reply-To, `context.id` WhatsApp) correspond.

- **`POST /reception/brevo`** : inbound parsing Brevo, `{"items": [...]}`, jeton
  bearer. Boîte = première adresse `To` puis `Cc` connue. Identifiant = `MessageId`.
  Pièces par `DownloadToken` (`GET /v3/inbound/attachments/{token}`).
- **`GET /reception/whatsapp`** : vérification Meta, renvoie `hub.challenge`.
  **`POST`** : `X-Hub-Signature-256`, accusé 200 immédiat, traitement après la
  réponse (`EdgeRuntime.waitUntil`). Boîte = `metadata.phone_number_id`
  (`expediteurs.parametres->>'phone_number_id'`), identifiant = `wamid`. Médias par
  Graph (`GET /v21.0/{media_id}` puis l'URL). `value.statuses` ignorés.
- **`POST /reception/formulaire`** : corps JSON signé par le site côté serveur,
  `X-Omega-Horodatage` (secondes Unix) et `X-Omega-Signature` = hex
  HMAC-SHA256(`FORMULAIRE_SECRET`, `"<horodatage>.<corps brut>"`), 5 minutes de
  tolérance. Champs : `identifiant` (uuid généré par le site = clé d'idempotence),
  `formulaire`, `nom`, `email`, `telephone`, `societe`, `message`, `page`,
  `consentement`, `champs {}`. Réponse 201 `{id, nouvelle: true}` ou 200
  `{id, nouvelle: false}` ; 500 tant que la boîte `site:omegaai.fr` n'est pas connue
  du socle (le site réessaie avec le même identifiant).

Pour fabriquer une requête de formulaire signée (essai ou intégration côté site) :

```sh
FORMULAIRE_SECRET=… deno run --allow-env omega/functions/reception/outils/signer_formulaire.ts \
  '{"identifiant":"a1b2c3d4-0000-4000-8000-000000000042","formulaire":"audit","nom":"Essai","email":"essai@exemple.test","message":"Bonjour"}'
```

Il imprime la commande `curl` complète avec les deux en-têtes.

## Échange avec la plateforme agréée (`echange-pa/`)

Facture électronique (réforme du 1/09/2026) : dépôt des factures émises, dépôt des statuts
de cycle de vie (CDAR), relevé des factures et statuts reçus. Même forme que l'expéditeur.

- `pa.ts` : l'interface `PlateformeAgreee` (`deposer`, `relever`, `telecharger`, `sante`),
  `ErreurPA` classée définitive (400, 404, 413, 422) ou transitoire (401, 403, 429, 5xx,
  réseau), les quatorze statuts 200 à 213.
- `afnor.ts` : adaptateur de l'API normalisée AFNOR XP Z12-013 (service Flow : `POST /flows`
  multipart `flowInfo` + `file`, `POST /flows/search`, `GET /flows/{id}?docType=Original`,
  `GET /healthcheck`), OAuth2 client credentials. Écrit d'après les modèles publics de la
  norme ; **aucun appel réel fait** (pas de compte PA).
- `cdar.ts` : fabrication d'un CDAR de traitement (TypeCode 23) pour les statuts 204 à 212,
  lecture tolérante d'un CDAR reçu. **À valider contre le XSD CDAR D22B et le Schematron
  BR-FR-CDV dans le bac à sable de la PA avant tout envoi réel.**
- `acheteur.ts` : le SIREN de l'acheteur d'une facture reçue (CII, UBL, et le CII joint d'un
  PDF Factur-X, décompressé au besoin) ; c'est par lui que `pa_noter_flux` retrouve le client.
- `passage.ts` : travaux `pa.deposer` {facture} et `pa.statut` {statut}, puis relevé depuis
  le curseur, puis `battre_ouvrier('echange_pa', …)` (sans tiret : contrainte de `battements.module` ; le socle ne bat que pour un client qui a eu un travail `pa.*` dans la journée). Une facture reçue se dépose en deux
  temps (a4_18) : `pa_noter_flux` rend `chemin_cible` → l'ouvrier y copie le fichier →
  `pa_deposer_facture(flux_id, octets)`. Si un passage s'arrête entre les deux, le suivant
  relit le flux (curseur non avancé), la même clé rend `rattache`, et le dépôt est rejoué.
- Variables : `PA_FLOW_URL` (racine du service Flow chez la PA, version comprise),
  `PA_TOKEN_URL`, `PA_CLIENT_ID`, `PA_CLIENT_SECRET`, `PA_SCOPE` (facultatif). Absentes :
  travaux reportés `PA_NON_BRANCHEE`, aucun relevé, battement `pa_branchee: false`.
- Portes `pa_*` : FILED lot 11, `omega/migrations/a4_18_filed_lot11_echange_pa.sql` (A4),
  posées sur la recette le 06/10. `pa_commencer_depot` répond « non pris en charge » (FILED
  tient les achats ; l'émission viendra en 2027).

### Bac à sable de la PA (`pa-bac-a-sable/`, recette seulement)

Aucune PA n'ouvre de bac à sable sans contrat : `pa-bac-a-sable` est un faux serveur
AFNOR XP Z12-013 (jeton OAuth2, `flows`, `flows/search`, `flows/{id}`, `healthcheck`), qui
garde ses flux dans `omega-clients` sous `_pa/bac-a-sable/`. Il accuse « Ok » tout dépôt, sauf
un fichier contenant `REJET-BAC` (accusé « Error », motif `REJ_SEMAN`). Il rend le même flux
pour le même `trackingId`. Il ne valide ni Factur-X, ni UBL, ni CDAR : ce n'est pas une PA.
`serveur_test.ts` le joue de bout en bout avec l'adaptateur AFNOR et le passage d'`echange-pa`.

**Sans secret Edge (06/10)** : seul Teo peut poser des secrets Edge. Chaque fonction a donc
une entrée `recette.ts` qui fixe ses réglages elle-même, **sans `Deno.env.set`** : les valeurs
fixes (publiques, `garde.ts`) sont passées au démarrage, et ne valent que si `SUPABASE_URL`
a pour hôte exact `ygwbgpowzlbdaajlsqkn.supabase.co` ; ailleurs, `pa-bac-a-sable` répond 503
et `echange-pa` n'a aucune PA. Des secrets `PA_*` posés l'emportent (vraie PA). Coquille de
déploiement : un `index.ts` d'une ligne, `import "https://raw.githubusercontent.com/teopetit50-gif/pegase-site/<SHA>/omega/functions/<dossier>/recette.ts";`,
avec un `deno.json` vide comme pour l'expéditeur. Identifiants du bac : `bac-recette` /
`bac-recette-pas-un-secret`. Injection d'une facture d'une seule requête, possible depuis
SQL par `net.http_post` : `POST …/pa-bac-a-sable/_bac/entrant`, en-têtes
`X-Bac-Client-Id` / `X-Bac-Client-Secret`, corps `{"exemple": "ubl-public",
"acheteur_siren": "<SIREN d'une entité du banc>", "numero": "BAC-0001"}` (la facture UBL
publique du banc d'A1, acheteur remplacé).

Avec des secrets (autre voie), pour le jouer sur la recette (portes `pa_*` posées : a4_18) :

1. **Déployer `pa-bac-a-sable`**, verify_jwt **false** (il fait son propre OAuth2). Secrets
   de la fonction : `PA_BAC_CLIENT_ID`, `PA_BAC_CLIENT_SECRET`, `PA_BAC_CLE_JETONS`, trois
   chaînes aléatoires (`openssl rand -hex 32`). Fumée : `GET …/pa-bac-a-sable/flow/v1/healthcheck`
   sans jeton → 401 `UNAUTHORIZED` ; sans secrets → 503 `NOT_CONFIGURED`.
2. **Déployer `echange-pa`**, verify_jwt **true**. Secrets de la fonction :
   `PA_FLOW_URL=https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/pa-bac-a-sable/flow/v1`,
   `PA_TOKEN_URL=https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/pa-bac-a-sable/oauth/token`,
   `PA_CLIENT_ID` = `PA_BAC_CLIENT_ID`, `PA_CLIENT_SECRET` = `PA_BAC_CLIENT_SECRET`.
3. **Cron `omega-echange-pa`** chaque minute, même forme que `omega-expediteur`
   (`net.http_post` vers `…/functions/v1/echange-pa`, `Authorization: Bearer` clé de service
   lue dans Vault). Premier battement attendu : `battements` module `echange-pa`,
   `detail.pa_branchee` vrai, `erreur_releve` null.
4. **Simuler une facture fournisseur reçue par le banc.** L'acheteur doit porter le SIREN
   d'une entité du banc où FILED est actif (`select e.siren from public.entites e where
   e.client_id = 'cccccccc-0000-4000-8000-00000000000c'`), sinon le flux reste « orphelin » :

   ```sh
   BAC=https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/pa-bac-a-sable
   J=$(curl -s -X POST "$BAC/oauth/token" -d grant_type=client_credentials \
        -d client_id="$PA_BAC_CLIENT_ID" -d client_secret="$PA_BAC_CLIENT_SECRET" | jq -r .access_token)
   curl -s -X POST "$BAC/_bac/entrant" -H "Authorization: Bearer $J" -H 'Content-Type: application/json' \
        -d '{"name":"FAC-BAC-0001.xml","flowSyntax":"UBL","contenu":"<Invoice><cbc:ID>FAC-BAC-0001</cbc:ID><cac:AccountingSupplierParty><cac:Party><cac:PartyLegalEntity><cbc:CompanyID schemeID=\"0002\">380129866</cbc:CompanyID></cac:PartyLegalEntity></cac:Party></cac:AccountingSupplierParty><cac:AccountingCustomerParty><cac:Party><cac:PartyLegalEntity><cbc:CompanyID schemeID=\"0002\">SIREN_DU_BANC</cbc:CompanyID></cac:PartyLegalEntity></cac:Party></cac:AccountingCustomerParty></Invoice>"}'
   ```

   Une à deux minutes plus tard :
   `select id, flux, sens, etat, client_id, document_id, chemin_cible, detail->>'acheteur_siren' from public.filed_pa_flux order by id desc limit 5;`
   → `etat` `depose`, `chemin_cible` `<client>/filed_document/<document>/FAC-BAC-0001.xml`,
   puis la pièce FILED (source `connecteur`). Un vrai UBL complet est nécessaire pour que la
   lecture xml de FILED aille au bout ; ce squelette prouve le canal, pas la lecture.
5. **Un statut émis** : une décision sur cette facture dans FILED (refus → 210, approbation
   → 205…) crée la ligne `filed_cycle_vie` « à émettre » et le travail `pa.statut` ; au
   passage suivant, le CDAR est déposé au bac à sable, puis l'accusé « Ok » relevé :
   `select code, etat, flux_pa, emis_le, erreur from public.filed_cycle_vie order by id desc limit 5;`
   → `emis`. (Le rejet simulé `REJET-BAC` ne vaut que pour un fichier que nous déposons ;
   un CDAR n'en contient jamais : le chemin « rejeté par la plateforme » se prouve par les tests.)

## Contrat des portes (rappel)

`prendre_travaux`, `finir_travail`, `echouer_travail`, `deposer_travail`,
`publier_evenement`, `battre_ouvrier` (socle) ; `commencer_envoi`,
`secret_expediteur`, `confirmer_envoi`, `echouer_envoi`, `noter_remise` (envois) ;
`resoudre_boite`, `deposer_reception` (réception). Détails et décisions dans
`omega/NOTES-A2.md`.
