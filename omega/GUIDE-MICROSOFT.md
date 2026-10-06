# Connecter Microsoft 365 / Outlook à Omega : inscrire l'application Microsoft

Pour Teo, pas à pas. Rédigé par A2 le 6 octobre 2026, d'après la documentation Microsoft
(plateforme d'identité Microsoft, Microsoft Graph : courrier, delta, création de message en
MIME) consultée le même jour. Le pendant Google est `omega/GUIDE-GMAIL.md`.

## En deux phrases

Pour qu'un client « connecte sa messagerie » Outlook ou Microsoft 365, Omega doit avoir sa
propre **application Microsoft**. C'est elle qui demande au client la permission de lire sa
boîte et d'y déposer des brouillons. Vous l'inscrivez une fois, pour tous les clients ; ensuite
chaque client clique sur « Connecter Microsoft 365 » dans Omega et accepte.

Comptez 20 minutes.

## À savoir avant de commencer

- **Où l'inscrire.** Une application Microsoft vit dans un « annuaire » Microsoft Entra
  (l'ancien Azure AD). Si Omega a un abonnement Microsoft 365 professionnel, il a déjà son
  annuaire : connectez-vous avec un compte administrateur de cet abonnement. Sinon, il faut
  créer un compte Azure gratuit (<https://azure.microsoft.com/free>), qui demande une carte
  bancaire pour vérifier l'identité ; l'inscription d'une application n'est pas facturée.
- **Une seule permission qui compte : `Mail.ReadWrite`.** Microsoft n'a pas de permission
  « brouillons seulement » : pour déposer un brouillon, il faut la permission de lire et
  écrire les messages. Omega ne s'en sert que pour relever la boîte de réception et créer des
  brouillons ; il n'envoie, ne déplace et ne supprime jamais rien.
- **Pas de « régime Test » comme chez Google**, mais une limite pratique : beaucoup
  d'entreprises interdisent à leurs salariés d'autoriser seuls une application d'un éditeur
  **non vérifié**. Chez ces clients, la connexion affichera « Approbation de l'administrateur
  requise » : leur administrateur informatique devra accepter Omega une fois pour toute
  l'entreprise. Pour l'éviter, Omega peut devenir **éditeur vérifié** (gratuit : un compte
  Microsoft AI Cloud Partner Program au nom de la société, et un domaine `omegaai.fr`
  vérifié). C'est une décision à prendre plus tard ; pour la recette, ce n'est pas nécessaire.
  Les comptes personnels (outlook.fr, hotmail.fr, live.fr) ne sont pas concernés.
- **Le secret expire.** Microsoft impose une date d'expiration au secret de l'application
  (24 mois au plus). Notez la date dans votre agenda : à l'échéance, il faut en créer un
  nouveau et le reposer dans Supabase (étape 5), sinon plus aucune messagerie Microsoft ne
  fonctionne.
- **Déconnexion.** Microsoft ne permet pas à une application de se retirer elle-même d'un
  compte. Quand un client déconnecte sa messagerie dans Omega, Omega efface immédiatement ses
  jetons et ne peut plus rien lire ; pour faire disparaître Omega de la liste de ses
  applications autorisées, le client passe par <https://myapps.microsoft.com> (compte
  professionnel) ou <https://account.live.com/consent/Manage> (compte personnel). L'écran de
  déconnexion le lui dira.

## Étape 1 — Inscrire l'application

1. Ouvrez <https://entra.microsoft.com> (centre d'administration Microsoft Entra). Le portail
   Azure (<https://portal.azure.com> → « Inscriptions d'applications ») mène au même endroit.
2. Menu de gauche : **Entra ID** (ou **Identité**) → **Applications** → **Inscriptions
   d'applications** → **Nouvelle inscription**.
3. **Nom** : `Omega`. C'est ce que verra le client sur l'écran de consentement.
4. **Types de comptes pris en charge** : choisissez
   **« Comptes dans un annuaire d'organisation (tout annuaire Microsoft Entra ID — multilocataire)
   et comptes Microsoft personnels (par exemple, Skype, Xbox) »**. C'est ce qui permet à la
   fois les clients Microsoft 365 et les boîtes Outlook.com / Hotmail.
5. **URI de redirection** : plateforme **Web**, puis :

   ```
   https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/messagerie-oauth/microsoft/retour
   ```

   Exactement ainsi : sans barre finale, en `https`.
6. **S'inscrire**. Sur la page qui s'ouvre (« Vue d'ensemble »), copiez l'**ID d'application
   (client)** : une suite du genre `1a2b3c4d-…`. C'est le premier des deux secrets de
   l'étape 5.

## Étape 2 — Les permissions

1. Dans l'application : **Autorisations de l'API** (API permissions).
2. `User.Read` (Microsoft Graph, déléguée) y est déjà : laissez-la.
3. **Ajouter une autorisation** → **Microsoft Graph** → **Autorisations déléguées**, puis
   cochez :
   - `offline_access` (rubrique « OpenId permissions ») : permet de relever la boîte en
     arrière-plan, sans que le client soit devant son écran ;
   - `Mail.ReadWrite` (rubrique « Mail »).

   **Ajouter des autorisations**.
4. Ne cochez **aucune** autorisation « d'application » (Application permissions) : elles
   donneraient accès à toutes les boîtes d'une entreprise, ce n'est pas ce qu'on veut.
5. Le bouton « Accorder un consentement d'administrateur » n'est pas nécessaire ; il ne vaut
   de toute façon que pour l'annuaire d'Omega, pas pour ceux des clients.

## Étape 3 — L'image de marque (ce que le client verra)

**Personnalisation et propriétés** (Branding & properties) : URL de la page d'accueil
`https://omegaai.fr`, conditions d'utilisation et règles de confidentialité (les pages qui
existent sur `omegaai.fr`), logo facultatif. **Domaine de l'éditeur** : laissez celui
proposé pour la recette ; `omegaai.fr` le jour où l'on fait vérifier l'éditeur.

## Étape 4 — Le secret de l'application

1. **Certificats et secrets** → onglet **Secrets client** → **Nouveau secret client**.
2. Description : `Omega recette` ; expiration : **24 mois** (le plus long proposé). Notez la
   date.
3. **Ajouter**. Microsoft affiche le secret **une seule fois**, dans la colonne **Valeur**
   (pas « ID du secret », qui ne sert à rien ici). Copiez la **Valeur** immédiatement dans
   votre gestionnaire de mots de passe. Ne la collez dans aucune conversation ni aucun
   fichier.

## Étape 5 — Les deux secrets dans Supabase (vous seul pouvez le faire)

Supabase → projet de recette → **Edge Functions** → **Secrets** (ou Project Settings → Edge
Functions) → **Add new secret**, deux fois :

| Nom | Valeur |
|---|---|
| `MICROSOFT_CLIENT_ID` | l'ID d'application (client) de l'étape 1 |
| `MICROSOFT_CLIENT_SECRET` | la **Valeur** du secret de l'étape 4 |

Les deux fonctions `messagerie` et `messagerie-oauth` les lisent. Tant qu'ils manquent, la
connexion Microsoft affiche « Connexion indisponible » et les brouillons Microsoft attendent ;
Gmail n'est pas touché, rien ne casse.

(Un troisième secret, `MICROSOFT_TENANT`, est facultatif : sans lui, tous les comptes Microsoft
sont acceptés, ce qu'on veut.)

## Étape 6 — Vérifier

Le coordinateur déploie les deux fonctions et la partie base de données, puis :

1. Dans Omega (écran « Messagerie » du client du banc), **Connecter Microsoft 365** :
   Microsoft demande quel compte utiliser, puis affiche « Omega souhaite… lire et écrire
   votre courrier, conserver l'accès aux données » → **Accepter**. Vous revenez sur Omega, la
   messagerie apparaît « connectée ». Avec un compte personnel (outlook.fr), cela marche
   tout de suite ; avec un compte professionnel, voir « Approbation de l'administrateur »
   plus bas.
2. Envoyez un courriel à cette adresse depuis une autre boîte. Une à deux minutes plus tard, il
   apparaît dans les réceptions d'Omega, pièces jointes comprises. Seuls les messages arrivés
   **après** la connexion sont relevés.
3. Validez un envoi d'essai dans Omega pour ce client : un **brouillon** apparaît dans le
   dossier Brouillons d'Outlook, prêt à être relu et envoyé par vous. Omega ne l'envoie jamais
   lui-même.
4. **Déconnecter** depuis l'écran : Omega ne relève plus rien. Retirez ensuite Omega de vos
   applications autorisées (liens plus haut) pour faire le ménage côté Microsoft.

## Si quelque chose ne va pas

- **« AADSTS50011 … redirect URI … does not match »** : l'URI de l'étape 1.5 n'est pas
  exactement celle ci-dessus, ou elle a été déclarée en « Application monopage » au lieu de
  « Web ».
- **« AADSTS50020 » ou « compte n'existe pas dans le locataire »** : à l'étape 1.4, le type
  de comptes n'est pas « multilocataire et comptes personnels ». Il se change dans
  **Authentification** (ou dans le **Manifeste** : `signInAudience` =
  `AzureADandPersonalMicrosoftAccount`).
- **« Approbation de l'administrateur requise »** (compte professionnel) : l'entreprise
  interdit le consentement par les salariés. Son administrateur ouvre le lien proposé et
  accepte pour toute l'entreprise, ou Omega fait vérifier l'éditeur (voir plus haut).
- **« invalid_client » / « AADSTS7000215 »** dans le journal de la fonction : la valeur de
  `MICROSOFT_CLIENT_SECRET` est fausse (souvent : « ID du secret » copié au lieu de
  « Valeur »), ou le secret a expiré.
- **La messagerie passe « à reconnecter »** : le client a changé son mot de passe, retiré
  l'autorisation, ou son entreprise impose une nouvelle connexion. Reconnecter suffit.
