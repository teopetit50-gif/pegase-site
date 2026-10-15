# Lettre recommandée électronique (AR24)

A2, 11/10/2026. La mise en demeure de CASHD part en LRE par AR24. L'ouvrier `expediteur` sait la
remettre (travaux `envois.ar24`) : il téléverse les pièces, crée la lettre et note la référence
AR24 sur l'envoi. Il manque ce que vous seul pouvez créer : **le compte AR24 et l'accès API**.

## Ce que ça coûte

AR24 facture à la lettre. Le prix exact est à vérifier sur leur grille ou leur devis. Le bac à
sable est gratuit.

## Étape 1 — Le compte et l'accès API

1. Ouvrez un compte professionnel sur ar24.fr, au nom de l'entreprise qui envoie.
2. Demandez à AR24 l'accès API (formulaire développeur ou support). Ils fournissent :
   - un **token** ;
   - une **clé privée** ;
   - l'accès au bac à sable `https://sandbox.ar24.fr/api` ;
   - plus tard, l'adresse de production.
3. Notez l'**identifiant utilisateur** (id_user) du compte qui signe les lettres.

## Étape 2 — Les secrets dans Supabase (vous seul)

Dans Edge Functions → Secrets :
- `AR24_TOKEN` ;
- `AR24_CLE_PRIVEE` ;
- `AR24_URL` : à laisser **vide tant qu'on essaie**. Sans lui, l'ouvrier parle au bac à sable et
  aucune lettre réelle ne part. Mettez l'adresse de production donnée par AR24 seulement quand
  l'essai est bon.

Une organisation qui a son propre compte AR24 peut garder ses accès dans le coffre de son
expéditeur, en JSON : `{"token": "…", "cle_privee": "…"}`.

## Étape 3 — L'expéditeur (coordinateur)

Le coordinateur crée la ligne d'expéditeur :
- canal `lre`, fournisseur `ar24` ;
- identité = l'adresse e-mail de l'expéditeur chez AR24 ;
- `parametres = {"id_utilisateur": "<id_user>", "eidas": false}`.

Il branche ensuite le fournisseur : `fournisseurs_envoi.ar24.branche = true`.

## eIDAS

Avec `"eidas": true`, la lettre est une LRE qualifiée eIDAS, qui vaut lettre recommandée papier.
AR24 exige alors une validation par code (OTP) de l'expéditeur. Omega ne la fait pas à sa place.
La lettre attend donc 7 jours sur AR24 (« à valider »), le temps que l'expéditeur la valide.
C'est voulu : une mise en demeure garde une main humaine.

Sans eIDAS, c'est une lettre recommandée électronique simple, qui part tout de suite.

## Destinataire

- **Professionnel** : la lettre est adressée à la société (le nom du destinataire).
- **Particulier** : le prénom est le premier mot du nom, le nom de famille est le reste.

Un envoi sans nom de destinataire est refusé, sans réessai.

## Les accusés (fonction `webhooks-ar24`)

AR24 prévient Omega à chaque changement d'état d'une lettre. Omega le note sur l'envoi :
- accusé de réception (lettre ouverte) → « remis » ;
- refus, négligence (non retirée en 15 jours), erreur AR24 ou annulation → « refusé » ;
- adresse en erreur → « rebond ».

Le lien vers la preuve AR24 est gardé avec l'événement.

AR24 ne signe pas ses notifications. Omega ne les croit donc pas sur parole : il relit la lettre
chez AR24 avec ses propres accès et ne note que ce qu'AR24 confirme.

Mise en place :
1. Vous : un secret `AR24_WEBHOOK_JETON` (une longue suite de lettres et de chiffres au hasard),
   puis `AR24_WEBHOOK_URL` =
   `https://<projet>.supabase.co/functions/v1/webhooks-ar24?jeton=<le même jeton>`.
2. Le coordinateur : déployer `webhooks-ar24` avec `verify_jwt = false`. L'ouvrier
   `expediteur` passe cette URL à chaque lettre, rien à régler chez AR24.

Limite : une organisation qui a ses propres accès AR24 dans le coffre n'a pas ses accusés relus.
Le webhook ne connaît que les accès `AR24_TOKEN` et `AR24_CLE_PRIVEE`.
