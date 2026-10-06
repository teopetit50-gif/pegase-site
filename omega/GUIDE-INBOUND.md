# Recevoir les courriels dans Omega : brancher l'« inbound » Brevo

Pour Teo, pas à pas. Rédigé par A2 le 6 octobre 2026, d'après la documentation Brevo
consultée le même jour (« Inbound parsing webhooks » et « Create a webhook »).

## En deux phrases

On crée une adresse de réception à part, sur un sous-domaine (`recu.omegaai.fr`). Les
courriels qui y arrivent sont lus par Brevo, qui les transmet à Omega. Omega les range
dans la boîte du bon client.

Votre messagerie actuelle sur `omegaai.fr` ne change pas : seul le sous-domaine `recu.`
est confié à Brevo.

Comptez 20 minutes de travail, plus jusqu'à quelques heures d'attente que le DNS se propage.

## Ce qu'il faut avoir sous la main

- L'accès au gestionnaire du nom de domaine `omegaai.fr`, là où vous avez posé les
  enregistrements SPF et DKIM de Brevo (OVH, Gandi, Cloudflare, Vercel…).
- L'accès au compte Brevo de la recette, et sa clé API v3 (Brevo → menu du compte →
  SMTP & API → onglet Clés API).
- Le jeton `BREVO_WEBHOOK_JETON`, celui que vous avez déjà saisi pour le webhook
  transactionnel le 5/10. C'est le même : ne pas en créer un nouveau.

## Étape 1 — Les deux enregistrements MX (chez le gestionnaire du domaine)

Dans la zone DNS de `omegaai.fr`, ajoutez **deux** enregistrements :

| Type | Nom (sous-domaine) | Priorité | Valeur (cible) |
|---|---|---|---|
| MX | `recu` | 10 | `inbound1.sendinblue.com.` |
| MX | `recu` | 20 | `inbound2.sendinblue.com.` |

- Selon l'outil, le champ « Nom » attend `recu` ou `recu.omegaai.fr` : les deux veulent
  dire la même chose.
- Le point final de `sendinblue.com.` est voulu. Certains outils l'ajoutent seuls, ne
  pas le doubler.
- Ne touchez **pas** aux MX de `omegaai.fr` lui-même (sans `recu`) : votre messagerie
  actuelle en dépend.
- Le nom `sendinblue` est normal : c'est l'ancien nom de Brevo, toujours utilisé pour
  ces serveurs.

Le domaine `omegaai.fr` est déjà authentifié chez Brevo (envois d'essai du 5/10). C'est
la condition que Brevo pose avant tout inbound : rien d'autre à faire de ce côté.

## Étape 2 — Le webhook « inbound » chez Brevo

Brevo ne propose pas ce réglage dans ses écrans : il se crée par son API, en une seule
commande. Ouvrez le Terminal (Mac : Applications → Utilitaires → Terminal).

Copiez la commande ci-dessous dans un éditeur de texte. Remplacez les deux valeurs entre
chevrons, chevrons compris, puis collez-la dans le Terminal et validez :

```sh
curl -s -X POST https://api.brevo.com/v3/webhooks \
  -H "api-key: <CLÉ API BREVO>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "inbound",
    "events": ["inboundEmailProcessed"],
    "domain": "recu.omegaai.fr",
    "url": "https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/reception/brevo",
    "description": "Omega recette : courriels entrants",
    "auth": {"type": "bearer", "token": "<BREVO_WEBHOOK_JETON>"},
    "headers": [{"key": "X-Omega-Jeton", "value": "<BREVO_WEBHOOK_JETON>"}]
  }'
```

La réponse attendue est courte, du genre `{"id":1234567}`. Notez ce numéro.

- `"auth"` et `"headers"` portent le même jeton, deux fois. Omega accepte l'un ou
  l'autre. On met les deux parce que la documentation Brevo ne dit pas si un webhook
  inbound envoie le jeton `auth`.
- Une réponse `unauthorized` : la clé API est fausse, ou restreinte par adresse IP.
  Brevo → Sécurité → Adresses IP autorisées : vous l'aviez déjà levée le 5/10.
- Ne collez jamais la clé ni le jeton dans une conversation, un fichier ou un message :
  seulement dans le Terminal.

Pour vérifier que le webhook existe, collez cette commande, avec la même clé API :

```sh
curl -s "https://api.brevo.com/v3/webhooks?type=inbound" -H "api-key: <CLÉ API BREVO>"
```

La liste doit contenir `recu.omegaai.fr` et l'URL `…/functions/v1/reception/brevo`.

## Étape 3 — La boîte dans Omega (le coordinateur s'en charge)

Omega doit savoir à quel client appartient chaque adresse de `recu.omegaai.fr`. Pour
l'essai, une seule adresse : `banc@recu.omegaai.fr`, rattachée au client du banc.

Cette étape est faite par le coordinateur, pas par vous. C'est une ligne dans la table
`public.expediteurs` (canal `email`, `identite` = l'adresse). La porte `resoudre_boite`
retrouve la boîte par cette `identite`, insensible à la casse.

```sql
-- Coordinateur, recette. La ligne sert à la RÉCEPTION seulement : statut 'suspendu',
-- pour qu'aucun envoi ne la choisisse comme expéditeur (resoudre_boite ne regarde pas le statut).
insert into public.expediteurs (client_id, module, canal, fournisseur, identite, nom_affiche, parametres, statut)
select 'cccccccc-0000-4000-8000-00000000000c', 'reput', 'email', 'brevo', 'banc@recu.omegaai.fr',
       'Boîte de réception du banc', '{"usage": "reception"}'::jsonb, 'suspendu'
where not exists (select 1 from public.expediteurs where canal = 'email' and lower(identite) = 'banc@recu.omegaai.fr');
select id, client_id, module, canal, identite, statut from public.expediteurs where lower(identite) = 'banc@recu.omegaai.fr';
```

Point à vérifier en posant la ligne : le déclencheur `expediteurs_preparer` peut
normaliser ou refuser certaines valeurs. S'il refuse `suspendu`, mettre `a_verifier`,
puis vérifier qu'aucun envoi du module `reput` du banc ne la prend comme expéditeur.

## Étape 4 — Vérifier (5 minutes, une fois le DNS propagé)

1. **Le DNS.** Sur <https://mxtoolbox.com/>, tapez `recu.omegaai.fr` et cliquez « MX
   Lookup ». Il faut voir les deux lignes `inbound1.sendinblue.com` (10) et
   `inbound2.sendinblue.com` (20). Tant qu'elles n'y sont pas, attendre : jusqu'à
   quelques heures.
2. **Un courriel d'essai.** Depuis votre messagerie habituelle, écrivez à
   `banc@recu.omegaai.fr`. Objet : « Essai réception Omega ». Quelques lignes de texte et
   une petite pièce jointe (une image ou un PDF).
3. **Le contrôle (coordinateur).** Une à deux minutes plus tard :

   ```sql
   select id, canal, boite, de_adresse, sujet, statut, jsonb_array_length(pieces) as pieces, recu_le, detail ->> 'message_id' as message_id
   from public.receptions where canal = 'email' and boite = 'banc@recu.omegaai.fr' order by id desc limit 5;
   ```

   Attendu : une ligne, objet « Essai réception Omega », `de_adresse` = votre adresse,
   `pieces` = 1, statut `nouvelle`. La pièce est dans le bucket `omega-clients`, sous
   `cccccccc-…/receptions/<message-id>/`.

Si rien n'arrive :
- **Journal de `reception` (Supabase → Edge Functions) sans appel** : le webhook
  Brevo n'est pas déclenché. Vérifier l'étape 2 et le DNS.
- **401 « jeton invalide »** : le jeton saisi chez Brevo n'est pas `BREVO_WEBHOOK_JETON`.
- **200, mais « boîte inconnue, réception ignorée » dans le journal** : l'adresse n'est pas dans
  `expediteurs`. Vérifier l'étape 3.
- **Le message est là, sans sa pièce** (`detail.pieces_ignorees`) : la fonction
  `reception` n'a pas `BREVO_API_KEY`.

## Plus tard, pour un vrai client

Une ligne `expediteurs` par adresse de réception, par exemple
`cabinet-dupont@recu.omegaai.fr`, rattachée à son client et à son module. Le DNS et le
webhook ne changent plus : c'est le même sous-domaine pour tous.

Les données de santé d'un patient qui répond passent par Brevo, hébergeur non certifié
HDS. Pour un client santé, la question de l'hébergement reste ouverte (NOTES-A2, « Avis
A2 »).
