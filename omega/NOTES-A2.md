# NOTES-A2 — ouvrier EXPÉDITEUR et RÉCEPTION

Session worker A2, branche `worker-a2`. Dernière mise à jour : 06/10/2026.
Coordinateur depuis le 06/10 : session `session_01BCGFdpRKBvXKjouC75sYBg` (passation
de `session_01B4JNQXyT69GytdvE9SjAnE`).
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
    `<client_id>/receptions/<identifiant externe assaini>/<nom>` (forme posée par le
    coordinateur ; chevrons retirés, caractères hors `[A-Za-z0-9._@-]` remplacés ;
    deux pièces de même nom dans un message : la seconde est préfixée de son rang) :
    une relivraison réécrit le même objet, jamais de doublon. `p_pieces` =
    `[{nom, mime, taille, chemin}]`.
  - `detail` porte les clés que la porte consomme : `en_reponse_a` (In-Reply-To pour
    l'e-mail, `context.id` pour WhatsApp), `fil` (première `References` ou Message-ID ;
    numéro de l'interlocuteur pour WhatsApp). La porte rattache elle-même la réception
    à l'envoi d'origine et publie `reception.nouvelle` : l'ouvrier ne publie rien.
- **Rapprochement « accepté par Brevo mais non confirmé »** : quand `confirmer_envoi`
  tombe trois fois après une remise acceptée, l'expéditeur dépose lui-même un travail
  `envois.confirmer` `{envoi, reference}` (porte `deposer_travail`, clé
  `confirmer:<envoi>`, priorité 1, client = `client_id` du travail d'origine) et finit
  le travail avec `{confirme: false, rapprochement: <id>}`. Il prend ce genre à chaque
  passage et rejoue `confirmer_envoi` ; repris tant que la porte tombe, jamais de
  ré-émission. Si le dépôt est impossible (travail sans `client_id`, porte en panne),
  journal `RAPPROCHEMENT IMPOSSIBLE` et `rapprochement: null`.
- **`omega/functions/README.md`** : déploiement de chaque fonction, variables, tests
  en local, essais à la main ; `reception/outils/signer_formulaire.ts` fabrique une
  requête de formulaire signée (imprime la commande `curl`).
- **Déployé sur la recette** par le coordinateur le 05/10 : `expediteur` (version 2,
  avec le rapprochement, verify_jwt true), `webhooks-brevo` et `reception` (version 1,
  verify_jwt false).
  Cron `omega-expediteur` posé, inactif tant que la clé de service n'est pas au coffre.
  La boîte `site:omegaai.fr` est portée par `clients.config.boite_formulaire`
  (client du banc, module reput).
- **Tests** : 61 tests Deno verts sur doubles (expéditeur 24, webhook 11, réception 26).
  Chaque dossier : `deno test --allow-env` (et `deno lint`, `deno check index.ts`).
  Cas couverts : passage à vide avec battement, e-mail et SMS remis, pièces, refus du
  socle, clé absente, erreurs 400 / 503 Brevo, `confirmer_envoi` en panne, idempotence
  (deux livraisons du même webhook, du même e-mail entrant, de la même notification
  Meta, du même formulaire n'écrivent qu'une ligne), signatures et jetons faux.

## Bloqué

- ~~Push GitHub~~ : poussé, voir la fin de ce fichier.
- ~~Migration santé~~ : posée par le coordinateur (lot socle 19ab, 06/10) à partir de
  la spécification d'A2, voir « Avis A2 ». `expediteur` redéployé le 06/10 (version 11,
  coquille qui importe `index.ts` au SHA 29ef6e6) : la garde SANTE_FOURNISSEUR_NON_HDS
  est active sur la recette ; le coordinateur vérifie le battement.
- **Secrets** : `BREVO_API_KEY`, `BREVO_WEBHOOK_JETON`, `FORMULAIRE_SECRET`,
  `META_*` sont entre les mains de Teo (liste transmise par le coordinateur). Tant
  qu'ils manquent, `webhooks-brevo` et `reception` répondent 503, l'expéditeur
  reporte.
- **Envoi réel** : e-mail et webhook de remise validés le 05/10 (voir « Premier envoi
  réel »). SMS d'essai à vérifier dès que Teo a validé l'émetteur SMS chez Brevo.

## Demain

1. Dès que `BREVO_API_KEY` est posée et le fournisseur branché sur la recette :
   déposer un envoi e-mail et un envoi SMS de test, vérifier `envoye` +
   `reference_externe`, puis recevoir les webhooks `delivered`.
2. Recevoir un vrai e-mail entrant (domaine inbound Brevo) et un vrai message WhatsApp
   de test ; vérifier les pièces dans le bucket.
3. Brancher le formulaire du site (`app/.../route.ts`, hors de mon périmètre : à
   confier à la session vitrine) : signer avec `FORMULAIRE_SECRET`, générer
   l'`identifiant` côté serveur, renvoyer vers `/reception/formulaire`.

## Portes du socle utilisées (toutes posées sur la recette, lot 18 du 05/10/2026)

Toutes réservées à `service_role`, appelées par RPC.

1. **`noter_remise(p_fournisseur, p_reference, p_evenement, p_detail, p_survenu_le, p_cle text) → boolean`**
   : déjà notée sous `p_cle` → `true` sans rien réécrire ; `false` si l'envoi
   (fournisseur, référence) est inconnu. Le webhook appelle cette forme à six arguments.
   Point d'attention SMS : la référence que je confirme est `messageId` (nombre) ;
   si le webhook SMS de Brevo ne renvoie que `reference`, la porte ne retrouvera pas
   l'envoi. Le webhook essaie les deux ; si ça ne suffit pas, une variante acceptant
   `p_reference = 'envoi:<uuid>'` (le tag revient dans tous les webhooks) règle le cas.
2. **`resoudre_boite(p_canal text, p_boite text) → jsonb | null`** : retrouve
   l'expéditeur dont `identite` = boîte (courriel, insensible à la casse) ou
   `parametres->>'phone_number_id'` = boîte (WhatsApp). Rend `{client_id, entite_id,
   module, expediteur_id}`. **À déclarer** : une ligne `expediteurs` par boîte de
   réception, dont `site:omegaai.fr` (canal `formulaire`) pour le formulaire du site,
   sinon la réception répond 500 et le site réessaie.
3. **`deposer_reception(p_client, p_canal, p_boite, p_identifiant, p_de, p_de_nom, p_sujet, p_corps, p_corps_html, p_pieces, p_detail, p_recu_le) → {id, nouvelle}`**
   idempotente sur `(client, canal, identifiant externe)` ; `p_pieces`
   `[{nom, mime, taille, chemin}]` ; `p_detail` : `module`, `entite_id`, `envoi_id`,
   `en_reponse_a`, `fil`, `langue` consommées, le reste gardé. Calcule l'empreinte,
   rattache à l'envoi d'origine, publie `reception.nouvelle`.
4. **Table `public.receptions`** (posée) :
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

## Premier envoi réel (05/10, 21h Paris)

Chaîne vérifiée par le coordinateur sur la recette, secrets posés : `creer_envoi` →
verrous (hors heures → différé, doublon détecté) → `pret`, fournisseur `brevo` →
travail pris par l'expéditeur en 15 s → Brevo répond **401 « unrecognised IP
address »** : la clé API Brevo est restreinte par IP, or les Edge Functions n'ont pas
d'IP fixe. L'ouvrier a bien classé l'erreur en transitoire (`reporte: true`, envoi
`0a607529-…` revenu `pret`, essais 1). **Teo** : retirer la restriction d'IP de la clé
(Brevo → Sécurité → Adresses IP autorisées), ou créer une clé sans restriction.

Reprise après report vérifiée par le coordinateur : `tache_envois` a reconfié un
deuxième travail `envois.brevo` pour l'envoi `0a607529-…` (essais 2), la clé
`envoi:<uuid>` ne bloque pas ; le différé `6be6e6cd-…` porte `reprise_le` au 06/10 06:00Z.
Rien à changer côté ouvrier.

**Premier e-mail réel parti le 05/10 à 19:05:01Z**, une fois la restriction d'IP Brevo
levée par Teo : envoi `0a607529-…` en statut `envoye` au troisième essai,
`reference_externe` `<202610051905.67751143774@smtp-relay.mailin.fr>`, travail 2146
fini avec `{fournisseur_id, remis_a}`. **L'expéditeur est validé en réel pour
l'e-mail** : l'envoi `08ae112f-…` de 19:17Z (référence
`<202610051917.97558286656@smtp-relay.mailin.fr>`) est arrivé dans la boîte de Teo.

**Condition de mise en service, rien à coder** : les deux premiers e-mails, partis
avant que l'expéditeur `essais@omegaai.fr` soit déclaré chez Brevo, ne sont jamais
arrivés bien que Brevo ait répondu 201 et rendu un `messageId`. Un 201 Brevo n'est
donc pas une preuve de remise : avant tout envoi réel, **l'adresse expéditrice doit
être déclarée et validée chez Brevo et le domaine authentifié (SPF, DKIM, DMARC)**.
Le webhook de remise (`delivered` / `blocked`) est le seul vrai signal ; d'ici là,
seuls des envois vers des adresses de test.

**Webhook de remise validé en réel le 05/10 à 19:38Z** : envoi `c3e142bb-…` parti à
19:38:00, Brevo a rappelé `webhooks-brevo` (200) à 19:38:03 avec `delivered`,
`noter_remise` a écrit `envois_evenements` id 13 de type `remis` sous la clé
`brevo:email:<message-id>:delivered:<horodatage>`.
Conditions côté Brevo, rien à coder : le webhook doit être créé en type
**Transactionnel** (un webhook Marketing ne voit pas les e-mails transactionnels),
authentification **Bearer token** = `BREVO_WEBHOOK_JETON`. Tant que le suivi
d'ouverture n'est pas coupé au niveau du compte, Brevo envoie aussi `opened` :
le webhook l'ignore sans erreur ni ligne (répond 200, compté `ignores` ; test
« ouvertures et clics : ignorés, jamais notés »), mais Teo doit quand même couper
le suivi d'ouverture et de clic, le socle l'interdit.

Restent à vérifier en réel : un SMS d'essai (émetteur alphanumérique à valider chez
Brevo) et les trois entrées de la réception.

## Reste

Plus rien en attente côté A2 : tout le périmètre est codé, testé, déployé sur la
recette et poussé. Ce qui suit ne dépend pas de cette session :

1. **Teo** pose les secrets (`BREVO_API_KEY`, `BREVO_WEBHOOK_JETON`,
   `FORMULAIRE_SECRET`, `META_VERIFY_TOKEN`, `META_APP_SECRET`, `META_ACCESS_TOKEN`)
   et la configuration Brevo / Meta décrite plus bas.
2. **Le coordinateur** fait alors l'appel signé `/reception/formulaire`
   (`reception/outils/signer_formulaire.ts`), branche `brevo` / `brevo_sms` sur la
   recette, dépose un envoi e-mail et un envoi SMS d'essai, et renvoie les lignes
   `envois` + résultat du travail à A2 pour vérification de bout en bout.
3. **La session vitrine** branche le formulaire du site (signature HMAC côté
   serveur, `identifiant` uuid généré côté serveur, POST vers `/reception/formulaire`).
4. À la première livraison réelle des webhooks Brevo SMS : vérifier que la référence
   renvoyée (`messageId` ou `reference`) retrouve bien l'envoi, sinon la variante
   `p_reference = 'envoi:<uuid>'` de `noter_remise`.

## Avis A2 : règle santé sur les envois (trou commun n° 7, proposé par B3)

Position de l'ouvrier : **la restriction doit vivre dans le socle, avant que le
travail existe**, pas dans l'ouvrier. L'expéditeur remet ce que `commencer_envoi` lui
rend ; s'il doit décider seul qu'un fournisseur est interdit, la règle est déjà
contournable (un autre ouvrier, un autre fournisseur).

Où la porter, dans cet ordre :

1. **Sur le fournisseur** : `private.fournisseurs_envoi.hds boolean not null default
   false` (hébergement de données de santé certifié). Aujourd'hui tous à `false`,
   `brevo` et `brevo_sms` compris, sauf preuve de certification HDS fournie par Teo.
   `manuel` reste le seul chemin des envois de santé tant qu'aucun fournisseur HDS
   n'est branché.
2. **Sur le canal** : `canaux_envoi.sante_autorise boolean` : `email` et `lre`
   oui (si fournisseur HDS), `sms` et `whatsapp` **non** pour un contenu de santé
   (texte en clair chez un tiers non HDS, pas de pièce jointe chiffrée). Un module
   de santé peut quand même envoyer un SMS *neutre* (« vous avez un message sur votre
   espace ») : c'est un envoi avec `donnees_sante = false`, et c'est le gabarit qui
   le dit (`gabarits_messages.donnees_sante`), pas le module.
3. **Sur l'envoi, pas seulement sur le module** : `envois.donnees_sante` existe déjà,
   c'est la bonne maille. `reglages_envois.sante = true` sert de garde-fou de module
   (force `donnees_sante = true` sur tout envoi du module, ou interdit les gabarits
   non marqués), pas de règle en soi.

Règle à appliquer par le socle, au moment des verrous de `creer_envoi` / de la
préparation, et à nouveau dans `confier_envoi` : **un envoi `donnees_sante = true`
n'est confié qu'à un fournisseur `hds = true` sur un canal `sante_autorise`** ;
sinon verrou `SANTE_FOURNISSEUR` (statut `bloque`, motif explicite, événement), jamais
un simple différé, et jamais de repli silencieux vers un autre fournisseur.

Ceinture et bretelles côté ouvrier, à faible coût : que `commencer_envoi` rende
`donnees_sante` et `fournisseur_hds` ; l'expéditeur refuse alors définitivement
(`echouer_envoi(…, true)`, code `SANTE_FOURNISSEUR_NON_HDS`) un envoi de santé qui
lui arriverait quand même vers un fournisseur non HDS. Une vérification, un test.

**Lot socle nécessaire : oui, petit** : deux colonnes (`fournisseurs_envoi.hds`,
`canaux_envoi.sante_autorise`), le verrou dans la préparation et dans
`confier_envoi`, et les deux clés dans la réponse de `commencer_envoi`.

**Côté A2, fait le 06/10** : la vérification ceinture et bretelles est dans
`expediteur/passage.ts` (`SANTE_FOURNISSEUR_NON_HDS`, échec définitif, rien n'est
envoyé) avec son test ; no-op tant que `commencer_envoi` n'expose pas
`donnees_sante` (clé absente → comportement inchangé ; `donnees_sante = true` et
`fournisseur_hds` absent ou faux → refus).

**Lot socle 19ab posé par le coordinateur le 06/10** (`verrous_envoi` refuse le canal
non permis pour tout envoi `donnees_sante` ; `commencer_envoi` rend `donnees_sante` et
`fournisseur_hds` = `agree_sante` du fournisseur, en essai comme en réel ; test pgTAP
12/12). **Aucun fournisseur n'est agréé, `manuel` compris : décision de Teo.** Tant
qu'il n'en agrée pas un, tout envoi de santé est bloqué par le socle, et la garde de
l'ouvrier le refuserait de toute façon.

**Question d'A5, tranchée par A2 le 06/10** : `verrous_envoi` juge le fournisseur de
l'expéditeur actif, `commencer_envoi` rend `fournisseur_hds` d'après `envois.fournisseur`.
Si les deux divergent, la garde refuse déjà dès que `fournisseur_hds` n'est pas vrai.
Trou restant, fermé côté ouvrier : l'expéditeur remet **toujours par Brevo** quel que soit
`envoi.fournisseur`. Un envoi de santé dont `envois.fournisseur` serait agréé (`manuel`,
par exemple) mais qui arriverait en `envois.brevo` passait la garde. Désormais, un envoi
de santé est aussi refusé (`SANTE_FOURNISSEUR_NON_HDS`, définitif) si `envoi.fournisseur`
n'est pas `brevo` / `brevo_sms` (`FOURNISSEURS_REMIS`). Test ajouté (cas « e »).
Commit 67f9cf6, redéployé par le coordinateur le 06/10 à 01 h 35 Z (version 12, passage
de 01 h 36 : 200, pris 0). Test 54 d'A5 (cohérence fournisseur) vert 3/3 sur la recette.

**Essai sur données de santé fictives (06/10, lot socle 19ah de B3, pour Tiroma)** : quand
`commencer_envoi` rend `mode = 'essai'` ET `donnees_fictives = true` (drapeau
`reglages_envois.essai_donnees_fictives`, vrai seulement sur la recette et en essai),
l'expéditeur accepte un envoi de santé vers un fournisseur non agréé ; la remise va à
l'adresse d'essai (c'est `commencer_envoi` qui la rend). Il n'exempte que l'agrément HDS :
le fournisseur doit toujours être `brevo` / `brevo_sms`. En réel, ou sans le drapeau, refus
`SANTE_FOURNISSEUR_NON_HDS` comme avant. Test : cinq cas (essai+fictives → remis ; réel+fictives,
essai sans drapeau, essai+drapeau faux, essai+fictives vers `manuel` → refus). **À déployer
seulement après la pose de 19ah.**

**Migration du lot : demandée à A2 le 06/10, NON écrite par A2, finalement posée par
le coordinateur.**
Deux raisons : le brief de Teo pose « aucune migration SQL » et un périmètre limité à
`omega/functions/` ; et A2 n'a pas la source des fonctions du socle à modifier
(préparation, `confier_envoi`, `commencer_envoi` vivent dans la base, qu'A2 ne lit
pas). Une migration « corps complet » écrite à l'aveugle serait fausse. Décision à
prendre par Teo ou le coordinateur : l'écrire côté socle (A5 ou coordinateur, qui ont
les sources) à partir de la spécification ci-dessous, ou lever explicitement
l'interdiction pour A2 **et** lui donner les sources.

### Spécification de la migration santé (à poser par qui a les sources)

```sql
-- Colonnes (idempotent, pas de DROP)
alter table private.fournisseurs_envoi
  add column if not exists hds boolean not null default false;
alter table public.canaux_envoi            -- ou private., selon où vit la table
  add column if not exists sante_autorise boolean not null default false;
update public.canaux_envoi set sante_autorise = true where code in ('email', 'lre');
-- Aucun fournisseur hds = true tant que Teo n'a pas fourni la preuve de certification.
```

Verrou `SANTE_FOURNISSEUR`, à poser à deux endroits, même test :

```
si envoi.donnees_sante
   et ( fournisseur choisi n'a pas hds
        ou canal de l'envoi n'a pas sante_autorise )
alors statut := 'bloque', verrou := 'SANTE_FOURNISSEUR',
      motif := 'fournisseur <x> non HDS' | 'canal <c> interdit pour un contenu de santé',
      événement envoi.bloque ; jamais 'differe', jamais de repli vers un autre fournisseur.
```

1. dans la préparation (`creer_envoi` / passage à `pret`, avec les autres verrous) ;
2. dans `private.confier_envoi`, juste avant `deposer_travail` (le fournisseur a pu
   changer entre les deux, et `manuel` reste le seul chemin tant qu'aucun HDS n'est
   branché : `manuel` doit donc avoir `hds = true` si l'on veut que les envois de
   santé passent en mode manuel, ce qui est cohérent : un humain les remet).

`commencer_envoi` : ajouter `"donnees_sante": envois.donnees_sante` et
`"fournisseur_hds": fournisseurs_envoi.hds` au jsonb rendu (mode essai compris :
en mode essai, un envoi de santé part vers l'adresse d'essai par le fournisseur
d'essai, donc `fournisseur_hds` vaut celui de `envois_essai_fournisseur`, ce qui le
bloque chez l'ouvrier tant que brevo n'est pas HDS : voulu).

Tests pgTAP attendus : (a) envoi `donnees_sante = true`, module santé, fournisseur
`brevo` → `bloque`, verrou `SANTE_FOURNISSEUR`, aucun travail déposé ; (b) même envoi,
fournisseur `manuel` (`hds = true`) → `pret`, travail déposé ; (c) envoi santé canal
`sms` → `bloque` quel que soit le fournisseur ; (d) envoi `donnees_sante = false`
vers `brevo` → inchangé ; (e) `commencer_envoi` rend les deux clés.
Nouvelles fonctions privées : `revoke execute … from public` (lot 19z). Point de vigilance pour B3 :
la réception (`receptions`) porte aussi des données de santé quand un patient
répond ; même logique, le bucket `omega-clients` et la base doivent être HDS pour
ces clients, ce qui est une question d'hébergement Supabase, pas d'ouvrier.

## Banc de la coquille webhooks-brevo (06/10, demandé par le coordinateur)

`omega/banc/banc_a2_coquille_webhooks.sql` : un envoi e-mail d'essai (module tavaro du banc, mode
essai → adresse d'essai de Teo), objet « Essai coquille webhooks-brevo », clé
`banc:a2:coquille-webhooks:1`, préparé par le moteur, approuvé par la DAF, confié par
`tache_envois` ; l'expéditeur le remet. Contrôle (bloc E) : `envois_evenements` type `remis`,
clé `brevo:email:<reference_externe>:delivered:…`, `recu_le` > `envoye_le`. Sans DROP ni DELETE.

**Joué par le coordinateur le 06/10 à 13 h 58 Z : chemin utile de webhooks-brevo v10 (87a1112) prouvé.**
Envoi `b109eea1-…`, approuvé par la DAF, `pret` 13:58:54 Z, `envoye` 13:59:01 Z, référence
`<202610061359.72974083619@smtp-relay.mailin.fr>` ; `envois_evenements` `remis`, clé
`brevo:email:<…>:delivered:2026-10-06T13:59:04.000Z`, `recu_le` 13:59:05 Z : 4 s de bout en bout.
Le travail `tavaro.envoi` laissé `a_faire` est attendu : c'est l'événement `envoi.envoye.tavaro`
routé vers l'ouvrier de base tavaro (`loc_envoi_issue`), qui rend `ignoree` pour un envoi sans objet.

**Trou : l'inbound Brevo n'est pas branché sur la recette** (NOTES-COORDINATEUR, « Ce que Teo
doit encore poser » n° 4 : domaine inbound vers `/functions/v1/reception/brevo`). Aucun
courriel entrant ne peut donc atteindre `reception/brevo`. À poser par Teo : un sous-domaine
(ex. `reponses.omegaai.fr`, MX vers Brevo), le webhook `inbound` Brevo vers
`…/functions/v1/reception/brevo` avec le même jeton bearer, et une ligne `expediteurs`
(canal `email`) dont `identite` est l'adresse de la boîte sur ce domaine. Ensuite il suffit
d'écrire à cette adresse. D'ici là, le chemin utile de la coquille `reception` se prouve
par `/reception/formulaire` (`FORMULAIRE_SECRET` posé, boîte `site:omegaai.fr` connue) :
`FORMULAIRE_SECRET=… deno run reception/outils/signer_formulaire.ts '<corps JSON>' [URL]` imprime la
commande curl signée (il faut la valeur du secret : Teo, ou une session qui la lit).

## Vague du 06/10 après-midi : guide inbound et preuve du formulaire

- `omega/GUIDE-INBOUND.md` : guide pas à pas pour Teo, d'après la doc Brevo du 06/10.
  Sous-domaine `recu.omegaai.fr` ; MX 10 `inbound1.sendinblue.com.` et MX 20
  `inbound2.sendinblue.com.` ; webhook par l'API (`POST /v3/webhooks`, `type: inbound`,
  `events: [inboundEmailProcessed]`, `domain`, `url` …/reception/brevo, jeton en `auth`
  bearer **et** en en-tête `X-Omega-Jeton`, car la doc ne dit pas si l'inbound envoie
  `auth`). Ligne `expediteurs` de la boîte d'essai `banc@recu.omegaai.fr`, posée par le
  coordinateur, statut `suspendu` pour qu'aucun envoi ne la prenne. Contrôle en base.
- `omega/functions/reception/outils/preuve_formulaire.ts` (demandé « dans omega/banc/ »,
  placé sous `omega/functions/` parce que `tsconfig.json` de main n'exclut que
  `omega/functions` : un `.ts` Deno dans `omega/banc/` casserait `npx tsc` / `npm run build`
  du site). `FORMULAIRE_SECRET` lu dans l'environnement, jamais imprimé. Quatre contrôles :
  signature fausse → 401, signée → 201 nouvelle, rejeu → 200 même id, une seule ligne dans
  `public.receptions` (lue par REST si `SUPABASE_SERVICE_ROLE_KEY` est fournie, sinon
  requête SQL imprimée). Vérifié en local contre `traiterFormulaire` et les doubles : 1–3 OK.

## Échange PA (06/10, demandé par le coordinateur) : ouvrier `echange-pa`

Code dans `omega/functions/echange-pa/`, 24 tests Deno verts sur doubles, **rien de déployé,
aucun appel réseau réel** (pas de compte PA). Voir le README des fonctions.

**Choix de l'adaptateur, en attendant A4** : A4 n'a pas encore écrit sa recommandation de
PA (pas de section « PA » dans NOTES-A4 au 06/10 14 h 40 Z). J'ai donc écrit l'adaptateur de
**l'API normalisée AFNOR XP Z12-013** (annexe A, service Flow), que toutes les PA sont
censées exposer aux opérateurs de dématérialisation. Il vaut pour la PA qu'A4 choisira, si
elle suit la norme. Sources : les modèles publics de la norme (FlowInfo, Flow,
SearchFlowParams, Acknowledgement), repris dans le SDK public `factpulse/sdk-go`, et pour
les statuts la description publique de XP Z12-012 (CDAR). Si A4 recommande une PA dont
l'API propre diffère (B2Brouter, par exemple : `/accounts/{account}/invoices…`), il suffit
d'un second adaptateur qui implémente `PlateformeAgreee` : le passage ne change pas.

**À A4, par le coordinateur** : (1) quelle PA, et expose-t-elle XP Z12-013 ? (2) qui fabrique
les CDAR : le socle (champ `chemin`) ou l'ouvrier (champ `cdar`) ? Les deux sont prévus.
(3) Ta table d'événements de cycle de vie : je prends les codes 200 à 213 ; l'ouvrier refuse
d'émettre 200, 201, 202, 203 et 213 (statuts de plateforme).

### Portes à poser (socle / FILED, pas A2), toutes `service_role`, en RPC

Genres de travaux : `pa.deposer` charge `{"facture": uuid}` ; `pa.statut` charge
`{"statut": uuid}`. Déposés par le socle quand une facture émise est prête, ou quand un
statut est décidé (refus, encaissement…).

1. `pa_commencer_depot(p_facture uuid) → jsonb` : verrouille. Rend `{deposer: false, statut,
   motif}` (déjà déposée, annulée…) ou `{deposer: true, facture, client_id, suivi, nom,
   syntaxe ('Factur-X'|'UBL'|'CII'), profil, regle, chemin, type_mime}`. `suivi` = id Omega
   de la facture : c'est le `trackingId`, clé d'idempotence côté PA. `chemin` : le fichier
   dans `omega-clients`.
2. `pa_noter_depot(p_facture uuid, p_flux text, p_depose_le timestamptz)` : rejouable.
3. `pa_echouer_depot(p_facture uuid, p_erreur text, p_definitif boolean)`.
4. `pa_commencer_statut(p_statut uuid) → jsonb` : `{envoyer: false, …}` ou `{envoyer: true,
   statut, client_id, suivi, chemin | cdar}`. `cdar` = `{message, emis_le, code, facture:
   {numero, date AAAA-MM-JJ, type_code, emetteur_siren}, emetteur: {siren, nom, role BY|SE},
   destinataire: {…}, motif: {code, texte}, montant: {valeur, devise}}`. Montant obligatoire
   pour 212 ; motif pour 206, 207, 210.
5. `pa_noter_statut(p_statut uuid, p_flux text, p_depose_le timestamptz)` et
   `pa_echouer_statut(p_statut uuid, p_erreur text, p_definitif boolean)`.
6. `pa_curseur() → timestamptz | null` et `pa_poser_curseur(p_curseur timestamptz)` : le
   `updatedAt` du dernier flux relevé (une ligne, par PA).
7. `pa_noter_flux(p_flux, p_sens 'entrant'|'sortant', p_type, p_syntaxe, p_suivi, p_accuse
   'en_attente'|'ok'|'erreur', p_maj_le, p_chemin, p_sha256, p_detail jsonb, p_cle text) →
   {id, nouveau}` : **idempotente sur `p_cle`** (`pa:<flux>:<maj_le>:<accuse>`). Elle fait le
   métier :
   - sortant avec `p_suivi` = id d'une facture ou d'un statut Omega : accusé de la PA (ok →
     déposée ; erreur → rejetée, `p_detail.details` porte les motifs) ; c'est aussi le
     rapprochement si `pa_noter_depot` est tombé après un dépôt accepté ;
   - entrant facture (`SupplierInvoice`…) : `p_chemin` = `_pa/entrants/<flux>/<nom>` dans
     `omega-clients`. **Le client n'est pas connu de l'ouvrier** : la porte le retrouve
     (SIREN de l'acheteur dans le document, ou annuaire), rattache, et dépose la facture dans
     FILED (lecture Factur-X / UBL / CII, côté A4) ;
   - entrant statut (`…LC`, syntaxe CDAR) : `p_detail.cdar` = `{message, code, libelle,
     facture, motif}` lu par l'ouvrier ; la porte retrouve la facture émise par son numéro.

**Réponses du coordinateur (06/10, provisoires jusqu'au choix de Teo)** : voie 1, Omega
opérateur de dématérialisation chez une PA technique en marque blanche, par l'API AFNOR
XP Z12-013 (Iopole, B2Brouter… immatriculation à vérifier) : l'adaptateur AFNOR est le bon.
L'ouvrier fabrique les CDAR (champ `cdar`). Codes 200 à 213, jamais d'émission de 200–203 ni
de 213. Une seule connexion PA pour tous les clients. Pas de facture de santé dans FILED pour
l'instant. A4 écrit les portes `pa_*` dans a4_17.

**Bac à sable** (`omega/functions/pa-bac-a-sable/`) : aucune PA trouvée qui ouvre un bac à
sable sans contrat. J'ai donc écrit un faux serveur AFNOR, déployable en fonction Edge
(verify_jwt false, flux dans le bucket sous `_pa/bac-a-sable/`) pour que `echange-pa` le
joigne depuis la recette. Le test de bout en bout passe : dépôt, accusé relevé, rejet simulé
(`REJET-BAC`), facture et CDAR entrants injectés par `/_bac/entrant`, idempotence au troisième
passage. Mode d'emploi pour la recette : README des fonctions, § « Bac à sable de la PA ».

**Aligné sur les portes réelles d'A4 (a4_18, worker-a4 00eeeeb, posées sur la recette 7/7)** :
- `pa_commencer_depot` refuse toujours (FILED tient les achats ; émission en 2027) : le
  travail `pa.deposer` finit avec la réponse, rien n'est déposé. Code gardé pour 2027.
- `pa_commencer_statut` rend `statut` = le **code** (nombre) et `cdar` avec code et montant en
  nombres : `normaliserStatut` (cdar.ts) les remet en texte avant tout contrôle ; le fichier
  s'appelle `cdar-<id du statut>.xml`.
- Facture entrante en deux temps : `pa_noter_flux` rend `{etat, client_id, document,
  chemin_cible, flux_id?}` ; si `rattache` (ou `sans_suite` avec `chemin_cible`), l'ouvrier
  copie le fichier à `chemin_cible` puis appelle `pa_deposer_facture(flux_id ?? id, octets)`.
  Un échec entre les deux arrête le relevé sans avancer le curseur : rejoué au passage suivant.
- Le client se retrouve par le SIREN de l'acheteur (`p_detail.acheteur_siren`) : `acheteur.ts`
  le lit dans un CII, un UBL ou le CII joint d'un Factur-X (flux PDF décompressés). Illisible →
  « orphelin », journalisé, compté au battement.
- Tests : echange-pa 32/32, pa-bac-a-sable 5/5 (le parcours de bout en bout dépose une facture
  reçue dans FILED par les deux temps). Marche à suivre de la recette : README des fonctions.

**Inbound Brevo branché (06/10)** : webhook 2225428, `domain` = `omegaai.fr` (Brevo refuse
`recu.omegaai.fr` : « Domain is not found or is inactive », il veut le domaine authentifié),
MX de `recu.omegaai.fr` posés, boîte `banc@recu.omegaai.fr` (expediteurs a3630f13, reput,
suspendu). GUIDE-INBOUND.md corrigé. Reste à voir au premier courriel de Teo si Brevo
transmet bien les messages adressés au sous-domaine avec un webhook posé sur la racine.

**Recette sans secret (06/10)** : le coordinateur ne peut pas poser de secrets Edge. Entrées
`recette.ts` dans `echange-pa/` et `pa-bac-a-sable/` : réglages fixes et publics (`garde.ts`)
passés au démarrage, sans `Deno.env.set` (pas besoin de savoir s'il est permis par le runtime
Edge). Garde dure : hôte exact `ygwbgpowzlbdaajlsqkn.supabase.co`, sinon 503 (bac) ou aucune PA
(ouvrier) ; testée, y compris contre `…supabase.co.ailleurs.fr`. `/_bac/entrant` accepte
`exemple: "ubl-public"` (UBL public XRechnung du banc d'A1, Apache-2.0, recopié dans
`exemples.ts`) avec `acheteur_siren` et `numero`, et des identifiants en en-têtes (appel
d'une seule requête, `net.http_post`). Fumée locale : bac sur l'URL de recette → 401 sans
jeton, jeton fixe → healthcheck UP ; sur une autre URL → 503 « pas la recette ».

**Parcours PA du bac, étapes 1 à 4 réussies sur la recette (06/10, 15 h 21 Z)** : bac et ouvrier
déployés en coquille (9d6cace, recette.ts) ; healthcheck sans jeton → 401 ; facture UBL publique
injectée avec l'acheteur 500000013 (entité principale du banc) → `filed_pa_flux` 19 `depose`,
`chemin_cible` dans `filed_document`, pièce FILED source `connecteur` lue en xml, facture
BAC-0001 créée (`bloquee` : fournisseur inconnu, attendu). **Battement absent** : le module
s'appelait `echange-pa`, or `battements.module` n'admet pas de tiret (`^[a-z][a-z_]{1,29}$`) ;
corrigé en `echange_pa` (test ajouté). Et `battre_ouvrier` ne bat que pour les clients qui ont
un travail `pa.*` dans la journée : pas de ligne tant qu'aucun statut n'a été déposé.
Étape 5 : `omega/banc/banc_a2_pa_statut.sql` (litige 207 codé TX_TVA_ERR, car un refus 210
exige la file de validation et BAC-0001 est bloquée ; bloc 210 conditionnel ; contrôles
cycle de vie, travaux, accusé, battement).

**Étape 5, premier essai (06/10, 15 h 24 Z) : 204 en échec « CDAR_INVALIDE : SIREN invalide :
undefined »**. Facture BAC-0001 d'un fournisseur allemand (`fournisseur_lu` : TVA DE123456789,
pas de SIREN) : `pa_commencer_statut` rend un `destinataire` et une `facture` sans SIREN, et le
CDAR exigeait un SIREN. Vrai cas (fournisseurs UE et hors UE). Correctif A2 : `Partie` porte
`siren` OU `tva` OU `identifiant {valeur, schema}` ; ordre : SIREN → schéma 0002 ; TVA FR → son
SIREN, 0002 ; TVA d'un autre pays de l'UE → 0223 ; hors UE → 0227 (liste des identifiants de la
réforme, à valider au bac à sable de la PA). Même règle pour l'émetteur de la facture
(`facture.emetteur_tva`). Faute des deux : « <partie> sans SIREN ni n° de TVA ». Tests ajoutés
(allemand, FR, suisse, rien ; passage avec la forme a4_18 sans SIREN).
**Côté A4 (nécessaire, l'ouvrier ne peut pas inventer la TVA)** : `pa_commencer_statut` doit
rendre aussi `destinataire.tva` et `facture.emetteur_tva` =
`coalesce(v_f.fournisseur_lu ->> 'tva', <TVA de filed_fournisseurs>)`, et `emetteur.tva` pour
l'acheteur si l'entité en a une (`jsonb_strip_nulls` garde le reste propre).
**Relancer le 204 sans DELETE, une fois A4 posé et echange-pa redéployé** :
`select public.pa_echouer_statut('<suivi>', 'Rejoué après correctif (TVA du fournisseur étranger)', false);`
(remet `a_emettre`, puisque le statut n'est pas émis) puis
`select public.deposer_travail('<client>', 'filed', 'pa.statut', jsonb_build_object('statut', '<suivi>'), 'pa.statut:<suivi>', 5::smallint);`
(la clé ne bloque que contre un travail actif : l'ancien est « fait », un nouveau naît).

**Étape 5, 204 réussi de bout en bout (06/10, 15 h 52 Z)** : a4_19 d'A4 (52100b4, TVA transmise)
posé, echange-pa v3 (21466c7), 204 relancé par `pa_echouer_statut` + `deposer_travail`. Cycle
de vie 204 `emis` (flux b0d2b4e1-…, essais 2) ; travail 5220 `fait` {pa afnor, note true} ; flux
sortant CDAR `CustomerInvoiceLC` accusé `ok` ; battement `echange_pa` présent (pa_branchee vrai,
erreur_releve null). Reste : le litige 207 (bloc B) et ses contrôles (bloc D).

Points ouverts (avant réponse) : chiffrement ou HDS des factures de santé ; une seule connexion PA (Omega
opérateur pour tous ses clients) ou une par client (alors `pa_commencer_*` rend aussi
l'identité de connexion, et l'ouvrier lit les secrets par client comme `secret_expediteur`).

## Risques résiduels et choix

- **Clé Brevo absente** : l'envoi est reporté par `echouer_envoi(…, false)` et le
  socle le reconfie ; `essais` monte à chaque minute. Si le socle plafonne `essais`,
  un trou de configuration de quelques heures peut clore des envois : au coordinateur
  de ne pas compter les erreurs `FOURNISSEUR_NON_BRANCHE`, ou de ne brancher le
  fournisseur qu'une fois la clé posée (c'est déjà la règle).
- **Accepté par Brevo, non confirmé** (`confirmer_envoi` trois fois en panne) : travail
  `envois.confirmer` déposé et rejoué au passage suivant, une minute plus tard, bien
  avant la fin du bail de 15 minutes de l'envoi. Le seul trou restant : travail
  d'origine sans `client_id` ou `deposer_travail` en panne au même moment ; le journal
  `RAPPROCHEMENT IMPOSSIBLE` porte l'envoi et la référence à rejouer à la main.
  Confirmé par le coordinateur : `prendre_travaux` rend des lignes complètes de
  `public.travaux`, `client_id` est toujours présent ; `deposer_travail` est bien
  exécutable par `service_role`.
- **Corps HTML ou texte** : heuristique (`corpsEstHtml`) ; si le socle sait le canal
  de rendu, autant l'ajouter à la réponse de `commencer_envoi`.
- **Date Brevo** sans fuseau (`AAAA-MM-JJ HH:MM:SS`) : lue en UTC quand `ts_event`
  manque ; `ts_event` est préféré.
- **Formulaire** : la fonction répond 500 tant que `site:omegaai.fr` n'est pas connue
  de `resoudre_boite` : le site doit garder l'`identifiant` et réessayer.

## État du push

`worker-a2` poussé sur GitHub le 05/10/2026 (cinq commits, pas de 403). Pas de PR :
le coordinateur intègre.
