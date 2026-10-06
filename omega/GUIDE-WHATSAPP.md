# Brancher le numéro WhatsApp professionnel : l'application Meta

Pour Teo, pas à pas. Rédigé par A2 le 6 octobre 2026, d'après la documentation Meta de la
WhatsApp Cloud API et de sa tarification, consultée le même jour.

## Ce que ça permet

La promesse de Daliro : « Daliro lit les photos et les vocaux envoyés au numéro WhatsApp
professionnel ». Quand un client ou un ouvrier envoie un message, une photo, un vocal ou un
document à ce numéro, Meta le transmet à Omega. La fonction `reception` le range :
- le texte et la légende dans les réceptions ;
- le fichier lui-même comme pièce.

Daliro le lit ensuite.

Le code de réception est écrit et testé. Il manque seulement ce que vous seul pouvez créer :
**l'application Meta, le numéro, et trois secrets**.

Comptez une heure, plus le délai de vérification de l'entreprise par Meta (de quelques jours à
deux semaines).

## Ce que ça coûte (sources : voir en bas)

- **Recevoir est gratuit.** Meta ne facture jamais un message envoyé par un utilisateur à
  l'entreprise. Photos, vocaux et documents reçus ne coûtent rien.
- **Répondre** dans les 24 heures qui suivent le dernier message du client (la « fenêtre de
  service ») :
  - c'est gratuit selon la page de tarification de Meta consultée le 6 octobre ;
  - mais plusieurs sources tierces annoncent qu'à partir du 1er octobre 2026, ces réponses
    sont facturées au tarif « utility » au-delà de 1 000 par numéro et par mois. À vérifier sur
    la page de Meta avant de décider ;
  - pour un artisan, 1 000 réponses par mois laissent de la marge.
- **Écrire le premier** (rappel J-2, confirmation de rendez-vous) passe par un modèle approuvé
  par Meta, facturé à chaque message remis. En France, environ 0,03 $ pour un modèle
  « utility » (rappel, confirmation) et environ 0,086 $ pour un modèle « marketing » (tarifs
  relevés par des tiers ; la grille officielle de Meta fait foi).
- Il faut un **moyen de paiement** dans le compte Meta dès qu'on envoie des modèles. Pour
  seulement recevoir, aucun.

## Étape 1 — Le portefeuille Meta Business

1. <https://business.facebook.com> avec le compte Facebook d'Omega → créez (ou choisissez) le
   portefeuille d'entreprise « Omega ».
2. **Paramètres** → **Centre de sécurité** → **Vérification de l'entreprise** : lancez-la
   (Kbis, adresse, site `omegaai.fr`). Elle n'est pas nécessaire pour les premiers essais, mais
   elle l'est pour dépasser les limites d'envoi et pour faire valider le nom affiché.

## Étape 2 — L'application et le produit WhatsApp

1. <https://developers.facebook.com/apps> → **Créer une app** → cas d'usage **« Se connecter
   avec les clients via WhatsApp »** (selon la version : type « Entreprise », puis produit
   WhatsApp) → rattachez-la au portefeuille « Omega ».
2. **WhatsApp** → **Configuration de l'API** : Meta fournit un **numéro de test** et un jeton
   temporaire (24 heures). Ajoutez votre propre portable comme destinataire de test : il
   suffit pour un premier essai.

## Étape 3 — Le vrai numéro professionnel

**WhatsApp** → **Configuration de l'API** → **Ajouter un numéro de téléphone**. Ensuite :
- nom affiché, catégorie ;
- vérification du numéro par SMS ou appel.

Notez son **Phone number ID** (une longue suite de chiffres, différente du numéro lui-même).

- Un numéro déjà utilisé dans l'application WhatsApp ou WhatsApp Business : Meta propose
  désormais de le garder dans l'application **et** de le brancher sur l'API (« coexistence »).
  Sinon, il faut le retirer de l'application d'abord.
- Un numéro neuf (une ligne fixe ou mobile dédiée) évite toute question.

## Étape 4 — Les trois secrets dans Supabase (vous seul pouvez le faire)

1. **Le secret de l'application** : developers.facebook.com → votre app → **Paramètres de
   l'app** → **Général** → **Clé secrète** → Afficher.
2. **Le jeton permanent** : business.facebook.com → **Paramètres** → **Utilisateurs du
   système** → **Ajouter** (nom « omega-reception », rôle Admin) → **Attribuer des
   éléments** :
   - l'app, en contrôle total ;
   - le compte WhatsApp, en contrôle total.

   Puis **Générer un jeton** :
   - l'app ;
   - expiration **Jamais** ;
   - permissions `whatsapp_business_messaging` et `whatsapp_business_management`.

   Le jeton temporaire de l'étape 2 ne convient pas : il expire en 24 heures.
3. **Le jeton de vérification** : une phrase de votre choix, longue et aléatoire, que vous
   saisirez aussi chez Meta à l'étape 5.

Supabase → projet de recette → **Edge Functions** → **Secrets** :

| Nom | Valeur |
|---|---|
| `META_APP_SECRET` | la clé secrète (1) |
| `META_ACCESS_TOKEN` | le jeton permanent (2) |
| `META_VERIFY_TOKEN` | votre phrase (3) |

Sans `META_APP_SECRET`, la réception refuse tout (aucune notification non signée n'entre).
Sans `META_ACCESS_TOKEN`, les messages entrent mais les photos et vocaux sont ignorés (et
signalés).

## Étape 5 — Le webhook (vers Omega)

developers.facebook.com → votre app → **WhatsApp** → **Configuration** → **Webhook** →
**Modifier** :

- URL de rappel : `https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/reception/whatsapp`
- Jeton de vérification : la phrase de l'étape 4.3

**Vérifier et enregistrer** : Meta appelle Omega, qui répond si la phrase est la même. Puis
**Champs du webhook** → **S'abonner** à `messages` (seulement celui-là suffit).

## Étape 6 — Rattacher le numéro à l'organisation (coordinateur)

Omega retrouve l'organisation d'un message par le Phone number ID. Le coordinateur crée la
ligne d'expéditeur, une fois par numéro. Il faut :
- canal `whatsapp`, fournisseur `meta_whatsapp` ;
- identité = le numéro au format +33… ;
- `parametres = {"phone_number_id": "<ID de l'étape 3>"}` ;
- module `daliro`, pour que les réceptions arrivent dans Daliro.

Donnez-lui le Phone number ID.

## Étape 7 — Vérifier

1. Depuis un portable, envoyez au numéro : un texte, une photo, un vocal.
2. Dans la minute, trois réceptions apparaissent dans Omega (canal WhatsApp, module Daliro).
   La photo et le vocal y sont en pièces : `image.jpg` (ou le nom du fichier envoyé), et `vocal.ogg`
   pour un vocal.
3. Le journal de la fonction `reception` dit « notification WhatsApp traitée ».

## Si quelque chose ne va pas

- **« La vérification de l'URL de rappel a échoué »** :
  - la phrase saisie chez Meta n'est pas exactement `META_VERIFY_TOKEN` ;
  - ou la fonction `reception` n'est pas déployée avec verify_jwt désactivé.
- **Rien n'arrive** :
  - le champ `messages` n'est pas coché (étape 5) ;
  - ou le numéro n'est pas rattaché (étape 6 ; le journal dit alors « boîte inconnue »).
- **Le message arrive sans sa photo** : `META_ACCESS_TOKEN` absent ou expiré. Le message
  garde l'id du média : Meta le conserve 30 jours, il peut être relu une fois le jeton posé.
- **« signature invalide »** dans le journal : `META_APP_SECRET` n'est pas la clé de cette app.

## Pour A1 (lecture des médias)

Chaque média reçu est une pièce de la réception. On la trouve :
- dans le bucket `omega-clients`, sous `<client>/receptions/<wamid>/<nom>` ;
- et décrite dans `receptions.pieces` : `nom`, `mime` (type simple : `image/jpeg`,
  `audio/ogg`…), `taille`, `chemin`.

`receptions.detail.media` dit en plus :
- `vocal` (vrai pour un message vocal, faux pour un fichier audio joint) ;
- `erreur`, quand le média n'a pas pu être téléchargé. Le message est alors déposé quand même,
  et `detail.media.id` permet de le relire.

## Sources

- Meta, « Pricing on the WhatsApp Business Platform » :
  <https://developers.facebook.com/docs/whatsapp/pricing>. Consulté le 6 octobre 2026 : les
  messages reçus ne sont pas facturés, le paiement se fait à chaque modèle remis, et la fenêtre
  de service dure 24 heures.
- EngageLab, « WhatsApp Business API Pricing 2026 » :
  <https://www.engagelab.com/blog/whatsapp-business-api-pricing>. C'est la source du
  changement au 1er octobre 2026 (1 000 messages de service gratuits par numéro et par mois)
  et des tarifs France (utility 0,0300 $, marketing 0,0859 $).
