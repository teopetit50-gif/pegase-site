# NOTES-A2 — ouvrier EXPÉDITEUR et RÉCEPTION

Session worker A2, branche `worker-a2`. Dernière mise à jour : 05/10/2026.
Périmètre : `omega/functions/expediteur/`, `omega/functions/reception/`,
`omega/functions/webhooks/`. Aucune migration SQL, aucune écriture directe en table :
tout passe par les portes du socle, appelées en RPC avec la clé de service.

## Fait

- **Expéditeur** (`omega/functions/expediteur/`, appelée chaque minute). Prend
  `['envois.brevo', 'envois.brevo_sms']` par `prendre_travaux`, puis pour chaque
  travail `{"envoi": uuid}` suit le flux posé par le coordinateur :
  `commencer_envoi` → refus du socle (`envoyer: false`) : `finir_travail` avec la
  réponse telle quelle ; sinon clé Brevo (`secret_expediteur` si `expediteur.secret`,
  sinon `BREVO_API_KEY`) → remise Brevo (e-mail `/v3/smtp/email`, SMS
  `/v3/transactionalSMS/sms`) → `confirmer_envoi(envoi, messageId Brevo)` (trois
  tentatives, elle est rejouable) → `finir_travail(travail, {"fournisseur_id", "remis_a"})`.
  Erreur transitoire (5xx, 429, réseau, pièce illisible, clé absente) :
  `echouer_envoi(envoi, err, false)` puis `finir_travail(travail, {"reporte": true})`.
  Erreur définitive (400 Brevo, canal non pris en charge, expéditeur ou sujet absent,
  numéro invalide) : `echouer_envoi(envoi, err, true)` puis `finir_travail(travail,
  {"echec": true})`. `battre_ouvrier('expediteur', genres, bilan, '15 minutes')` en fin
  de passage, même à vide. Pièces lues en lecture seule dans le bucket `omega-clients`
  par leur `chemin`. Aucun suivi d'ouverture ni de clic. **Jamais** de marquage
  `branche = true` : c'est la migration du coordinateur.
  La porte `envoi_a_remettre` que je pensais demander n'est plus nécessaire :
  `commencer_envoi` rend tout.
  Tag Brevo `envoi:<uuid>` + en-têtes `X-Omega-Envoi` et `X-Mailin-custom` sur chaque
  e-mail, tag `envoi:<uuid>` sur chaque SMS : c'est la clé d'idempotence côté
  fournisseur et ce que les webhooks renvoient.
- **Webhook Brevo** (`omega/functions/webhooks/brevo/`). Jeton bearer vérifié en temps
  constant (Brevo n'a pas de signature HMAC), événements e-mail (`event`) et SMS
  (`msg_status`) traduits dans le vocabulaire de `noter_remise` :

  | Brevo | socle |
  |---|---|
  | `delivered` | `remis` |
  | `hard_bounce` / `hardBounce` | `rebond` |
  | `soft_bounce`, `deferred` | `rebond_temporaire` |
  | `blocked`, `invalid_email`, `error` | `refuse` |
  | `spam`, `unsubscribed` / `unsubscribe` | `plainte` |
  | `request`, `sent`, `accepted`, `reply`, `opened`, `unique_opened`, `click`, `loaded_by_proxy` | ignorés (jamais notés) |

  `detail` = `{"code": ≤100, "raison": ≤300}`. Clé d'idempotence
  `brevo:<canal>:<message-id>:<event>:<horodatage ISO>`. Fournisseur `brevo` (e-mail)
  ou `brevo_sms` (SMS). Référence : `message-id` pour l'e-mail ; pour le SMS
  `messageId` puis, s'il est inconnu, `reference`. 200 même si la référence est
  inconnue ; 500 si la porte tombe (Brevo rejoue, la clé rend le rejeu inoffensif).
- **Réception** (`omega/functions/reception/`), trois entrées sur une fonction :
  - `POST /reception/brevo` : inbound parsing Brevo (`{"items": [...]}`), jeton bearer
    `BREVO_WEBHOOK_JETON`. Boîte = première adresse de `To` puis `Cc` connue de
    `resoudre_boite`. Identifiant = `MessageId` (repli `Uuid[0]`). Corps =
    `ExtractedMarkdownMessage` sinon `RawTextBody` ; `RawHtmlBody` en `corps_html`.
    Pièces téléchargées par `DownloadToken` (`GET /v3/inbound/attachments/{token}`,
    clé `BREVO_API_KEY`) ; sans clé, le message passe sans ses pièces et
    `detail.pieces_ignorees` les liste. `detail` porte `message_id`, `in_reply_to`,
    `references`, `a`, `cc`, `spam`.
  - `GET|POST /reception/whatsapp` : vérification Meta (`hub.verify_token` =
    `META_VERIFY_TOKEN`, renvoie `hub.challenge`) ; POST signé
    `X-Hub-Signature-256 = sha256=HMAC(META_APP_SECRET, corps brut)`, accusé 200
    immédiat, traitement après la réponse (`EdgeRuntime.waitUntil`). Boîte =
    `metadata.phone_number_id`, identifiant = `wamid`, `de` = numéro, `de_nom` = profil.
    Texte, légende, bouton, liste, position, réaction ; médias (image, document, audio,
    vidéo, sticker) lus par Graph (`GET /v21.0/{media_id}` puis l'URL, jeton
    `META_ACCESS_TOKEN`) et déposés dans le bucket. `value.statuses` ignorés.
  - `POST /reception/formulaire` : corps JSON signé par le site côté serveur,
    `X-Omega-Horodatage` (secondes Unix) et `X-Omega-Signature` = hex
    HMAC-SHA256(`FORMULAIRE_SECRET`, `"<horodatage>.<corps brut>"`), 5 minutes de
    tolérance. Champs : `identifiant` (uuid généré par le site, c'est la clé
    d'idempotence), `formulaire`, `nom`, `email`, `telephone`, `societe`, `message`,
    `page`, `consentement`, `champs {}`. Boîte fixe `FORMULAIRE_BOITE`
    (défaut `site:omegaai.fr`). Réponse 201 `{id, nouvelle: true}` ou 200 `{id,
    nouvelle: false}`.
  - Pièces déposées en **upsert** dans `omega-clients` sous
    `<client_id>/receptions/<canal>/<sha256(identifiant)[0:16]>/<n>-<nom>` : une
    relivraison réécrit le même objet, jamais de doublon.
- **Tests** : 56 tests Deno verts sur doubles (expéditeur 20, webhook 11, réception 25).
  Chaque dossier : `deno test --allow-env` (et `deno lint`, `deno check index.ts`).
  Cas couverts : passage à vide avec battement, e-mail et SMS remis, pièces, refus du
  socle, clé absente, erreurs 400 / 503 Brevo, `confirmer_envoi` en panne, idempotence
  (deux livraisons du même webhook, du même e-mail entrant, de la même notification
  Meta, du même formulaire n'écrivent qu'une ligne), signatures et jetons faux.

## Bloqué

- ~~Push GitHub~~ : poussé, voir la fin de ce fichier.
- **Déploiement sur la recette** : le coordinateur déploie (plus d'appel Supabase
  depuis cette session). Message « prêt à déployer » envoyé avec la liste des
  fichiers et des secrets. `webhooks-brevo` et `reception` doivent être déployées
  avec `verify_jwt = false` (Brevo, Meta et le site n'envoient pas de JWT Supabase ;
  chaque entrée porte sa propre authentification). `expediteur` garde `verify_jwt =
  true` (appelée par pg_cron avec la clé de service).
- **Envoi réel** (un e-mail et un SMS vers une adresse et un numéro de test) : impossible
  tant que `BREVO_API_KEY` n'existe pas et que `brevo` / `brevo_sms` ne sont pas
  `branche = true` sur la recette. À faire dès que Teo a posé la clé.
- **Réception** : les portes `resoudre_boite` et `deposer_reception` n'existent pas
  encore ; le coordinateur les pose à partir de la forme ci-dessous. Si sa signature
  finale diffère, seul `omega/functions/reception/portes.ts` change.

## Demain

1. Dès que `BREVO_API_KEY` est posée et le fournisseur branché sur la recette :
   déposer un envoi e-mail et un envoi SMS de test, vérifier `envoye` +
   `reference_externe`, puis recevoir les webhooks `delivered`.
2. Recevoir un vrai e-mail entrant (domaine inbound Brevo) et un vrai message WhatsApp
   de test ; vérifier les pièces dans le bucket.
3. Brancher le formulaire du site (`app/.../route.ts`, hors de mon périmètre : à
   confier à la session vitrine) : signer avec `FORMULAIRE_SECRET`, générer
   l'`identifiant` côté serveur, renvoyer vers `/reception/formulaire`.
4. Rapprochement « accepté par Brevo mais non confirmé » : un passage de contrôle qui
   relit les `confirme: false` dans les résultats de travaux (ou le socle).

## Portes demandées au coordinateur

Toutes SECURITY DEFINER, EXECUTE réservé à `service_role`, REVOKE au public.

1. **`noter_remise(p_fournisseur, p_reference, p_evenement, p_detail, p_survenu_le, p_cle text) → boolean`**
   (surcharge à six arguments annoncée par le coordinateur) : ignore un événement
   déjà noté sous `p_cle`. Le webhook appelle déjà la forme à six arguments.
   Point d'attention SMS : la référence que je confirme est `messageId` (nombre) ;
   si le webhook SMS de Brevo ne renvoie que `reference`, la porte ne retrouvera pas
   l'envoi. Le webhook essaie les deux ; si ça ne suffit pas, une variante acceptant
   `p_reference = 'envoi:<uuid>'` (le tag revient dans tous les webhooks) règle le cas.
2. **`resoudre_boite(p_canal text, p_boite text) → jsonb`**
   `{"client_id": uuid, "entite_id": uuid|null, "module": text|null, "expediteur_id": uuid|null}`
   ou NULL. `p_boite` : adresse e-mail destinataire (inbound Brevo),
   `phone_number_id` Meta (WhatsApp ; peut vivre dans `expediteurs.parametres->>'phone_number_id'`),
   `site:omegaai.fr` (formulaire). Nécessaire **avant** le dépôt pour ranger les pièces
   sous le bon client dans le bucket.
3. **`deposer_reception(p_client uuid, p_canal text, p_boite text, p_identifiant text, p_de text, p_de_nom text, p_sujet text, p_corps text, p_corps_html text, p_pieces jsonb, p_detail jsonb, p_recu_le timestamptz) → jsonb`**
   `{"id": bigint, "nouvelle": bool}`, idempotente sur
   `(client_id, canal, identifiant_externe)`. `p_pieces` =
   `[{"nom", "type_mime", "taille", "chemin"}]` (déjà dans le bucket). Suggestion :
   publier `reception.nouvelle` quand `nouvelle = true`, et poser `en_reponse_a` quand
   `p_detail->>'in_reply_to'` correspond à un `envois.reference_externe`.
4. **Table `public.receptions`** :
   `id bigint generated always as identity PK ; client_id uuid NN ; entite_id uuid ;
   module text ; canal text NN check in ('email','whatsapp','sms','formulaire') ;
   boite text NN ; identifiant_externe text NN ; de_adresse text ; de_empreinte text ;
   de_nom text ; sujet text ; corps text NN default '' ; corps_html text ;
   pieces jsonb NN default '[]' ; detail jsonb NN default '{}' ;
   en_reponse_a uuid → envois(id) ; fil text ; langue text ;
   statut text NN default 'nouvelle' check in ('nouvelle','lue','traitee','ignoree','indesirable') ;
   traite_par uuid ; recu_le timestamptz NN ; cree_le timestamptz NN default now() ; maj_le timestamptz.`
   `UNIQUE (client_id, canal, identifiant_externe)` ; index `(client_id, statut, recu_le desc)` ;
   RLS lecture par les membres du client, écriture par la porte seule.

### Ligne SQL du coordinateur après un envoi réel réussi

À passer par migration, jamais par l'ouvrier, une fois un e-mail et un SMS réels
confirmés `envoye` sur la recette :

```sql
update private.fournisseurs_envoi set branche = true
 where <colonne clé du fournisseur> in ('brevo', 'brevo_sms');
```

(sur la recette d'abord ; en production seulement après recette validée).

### Cron

`expediteur` est appelée chaque minute par pg_cron → pg_net avec la clé de service
(POST `https://<projet>.supabase.co/functions/v1/expediteur`, en-tête
`Authorization: Bearer <service_role>`). C'est au coordinateur de poser le job.

## Ce que Teo doit poser

**Brevo** (compte de la recette d'abord) :
- Domaine d'envoi authentifié (SPF, DKIM, DMARC) pour `omegaai.fr` et l'adresse
  `essais@omegaai.fr` (expéditeur des envois d'essai).
- Clé API v3 → secret `BREVO_API_KEY` des fonctions `expediteur` et `reception`.
- **Désactiver le suivi d'ouverture et de clic** au niveau du compte (Transactionnel →
  Paramètres) : le socle l'interdit, et l'API n'a pas d'interrupteur par message.
- Webhook transactionnel e-mail (Transactionnel → Paramètres → Webhooks, ou
  `POST /v3/webhooks` type `transactional`) vers
  `https://<projet>.supabase.co/functions/v1/webhooks-brevo`, événements `delivered`,
  `hardBounce`, `softBounce`, `blocked`, `spam`, `invalid`, `deferred`, `unsubscribed`,
  `error` ; **pas** `opened`, `click`, `uniqueOpened`, `loadedByProxy`. Authentification :
  `auth: {"type": "bearer", "token": <BREVO_WEBHOOK_JETON>}` (ou en-tête
  `X-Omega-Jeton`). Même chose pour le webhook SMS (`delivered`, `hardBounce`,
  `softBounce`, `blocked`, `unsubscribe`).
- Jeton `BREVO_WEBHOOK_JETON` : une chaîne aléatoire longue (32 octets hex), posée en
  secret des fonctions `webhooks-brevo` et `reception`, et saisie chez Brevo.
- Inbound parsing : un domaine (ex. `reponses.omegaai.fr`, MX vers Brevo) et un
  webhook `inbound` vers `https://<projet>.supabase.co/functions/v1/reception/brevo`,
  même jeton bearer. Chaque client qui veut recevoir doit avoir une adresse sur ce
  domaine connue de `resoudre_boite`.
- SMS : un émetteur alphanumérique (≤ 11 caractères, ex. `Omega`) validé chez Brevo ;
  pour l'essai, un numéro de test.

**Meta / WhatsApp** :
- Un compte Meta Business vérifié, une app Meta avec le produit WhatsApp, un numéro
  dédié (le `phone_number_id` est la boîte à déclarer dans `resoudre_boite`).
- `META_VERIFY_TOKEN` (chaîne choisie par nous, saisie dans l'app lors de l'abonnement
  du webhook), `META_APP_SECRET` (Paramètres de l'app → Clé secrète), `META_ACCESS_TOKEN`
  (jeton système permanent, permission `whatsapp_business_messaging`).
- Webhook de l'app : URL `https://<projet>.supabase.co/functions/v1/reception/whatsapp`,
  champ `messages` abonné.

**Site** : `FORMULAIRE_SECRET` (32 octets hex) partagé entre Vercel (`pegase-site2`)
et la fonction `reception`.

## Risques résiduels et choix

- **Clé Brevo absente** : l'envoi est reporté par `echouer_envoi(…, false)` et le
  socle le reconfie ; `essais` monte à chaque minute. Si le socle plafonne `essais`,
  un trou de configuration de quelques heures peut clore des envois : au coordinateur
  de ne pas compter les erreurs `FOURNISSEUR_NON_BRANCHE`, ou de ne brancher le
  fournisseur qu'une fois la clé posée (c'est déjà la règle).
- **Accepté par Brevo, non confirmé** (`confirmer_envoi` trois fois en panne) : le
  travail est fini avec `{"confirme": false, "fournisseur_id"}` et un journal
  `NON CONFIRMÉ`, pour ne jamais ré-émettre ; l'envoi reste `en_cours` jusqu'au bail.
- **Corps HTML ou texte** : heuristique (`corpsEstHtml`) ; si le socle sait le canal
  de rendu, autant l'ajouter à la réponse de `commencer_envoi`.
- **Date Brevo** sans fuseau (`AAAA-MM-JJ HH:MM:SS`) : lue en UTC quand `ts_event`
  manque ; `ts_event` est préféré.
- **Formulaire** : la fonction répond 500 tant que `site:omegaai.fr` n'est pas connue
  de `resoudre_boite` : le site doit garder l'`identifiant` et réessayer.

## État du push

`worker-a2` poussé sur GitHub le 05/10/2026 (cinq commits, pas de 403). Pas de PR :
le coordinateur intègre.
