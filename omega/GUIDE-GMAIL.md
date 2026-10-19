# Connecter Gmail à Omega : créer l'application Google

Pour Teo, pas à pas. Rédigé par A2 le 6 octobre 2026, d'après la documentation Google
(portées de l'API Gmail, OAuth 2.0 pour applications web) consultée le même jour.

## En deux phrases

Pour qu'un client « connecte sa messagerie », Omega doit avoir sa propre **application
Google**. C'est elle qui demande au client la permission de lire sa boîte et d'y déposer des
brouillons. Vous la créez une fois, pour tous les clients ; ensuite chaque client clique sur
« Connecter Gmail » dans Omega et accepte.

Comptez 30 minutes. Aucune carte bancaire n'est demandée pour ce qui suit.

## À savoir avant de commencer : les deux régimes de Google

Omega demande deux permissions : **lire les messages** (`gmail.readonly`) et **gérer les
brouillons** (`gmail.compose`). Google les classe « restreintes », sa catégorie la plus
surveillée.

- **Régime « Test »** (celui de ce guide) : gratuit et immédiat, mais réservé à **100 comptes
  Google** que vous inscrivez vous-même, et **la connexion expire au bout de 7 jours** : le
  client doit la refaire chaque semaine. Parfait pour la recette et les premiers essais.
- **Régime « Production »** (pour de vrais clients) : Google doit **vérifier l'application**,
  et, parce que ces permissions sont restreintes et qu'Omega garde des données de messagerie
  sur ses serveurs, une **évaluation de sécurité** par un laboratoire agréé est exigée, à
  renouveler chaque année. C'est payant et cela prend plusieurs semaines. C'est une décision à
  prendre plus tard, en connaissance de cause.

Un second point pour la production : Google veut que l'adresse de retour soit sur un domaine
qui vous appartient (`omegaai.fr`). Pendant le régime « Test », l'adresse Supabase ci-dessous
suffit. Pour la production, il faudra une adresse de retour sur `omegaai.fr` qui renvoie vers
Supabase : c'est une petite tâche pour la session du site, à lancer le moment venu.

## Étape 1 — Le projet Google Cloud

1. Ouvrez <https://console.cloud.google.com/> avec le compte Google d'Omega (pas un compte
   personnel si possible).
2. En haut à gauche, liste des projets → **Nouveau projet**. Nom : `Omega`. Créez-le, puis
   vérifiez qu'il est bien sélectionné en haut de l'écran.

## Étape 2 — Activer l'API Gmail

1. Menu ☰ → **API et services** → **Bibliothèque**.
2. Cherchez **Gmail API**, ouvrez-la, cliquez **Activer**.

## Étape 3 — L'écran de consentement (ce que le client verra)

Menu ☰ → **API et services** → **Écran de consentement OAuth**. Selon la version de la
console, cette page s'appelle aussi **Google Auth Platform**, avec des onglets « Branding »,
« Audience », « Data access », « Clients ».

1. **Informations sur l'application (Branding)** : nom `Omega` ; e-mail d'assistance : le
   vôtre ; logo facultatif ; page d'accueil `https://omegaai.fr` ; règles de confidentialité
   `https://omegaai.fr/confidentialite` (ou la page qui existe) ; domaine autorisé :
   `omegaai.fr` ; e-mail du développeur : le vôtre.
2. **Audience** : type d'utilisateur **Externe**. Statut de publication : laissez **Test**.
   Dans **Utilisateurs test**, ajoutez les adresses Gmail qui feront les essais (la vôtre,
   celle du banc). Jusqu'à 100.
3. **Accès aux données (Data access)** → **Ajouter ou supprimer des champs d'application**.
   Cochez, ou collez dans « Ajouter manuellement » :
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.compose`

   Enregistrez. Google les rangera sous « Champs d'application restreints » : c'est normal.

## Étape 4 — L'identifiant de l'application (client OAuth)

1. **Identifiants** (ou onglet **Clients**) → **Créer des identifiants** → **ID client OAuth**.
2. Type d'application : **Application Web**. Nom : `Omega — recette`.
3. **URI de redirection autorisés** → **Ajouter un URI** :

   ```
   https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/messagerie-oauth/google/retour
   ```

   Exactement ainsi : sans barre finale, en `https`.
4. **Créer**. Google affiche un **ID client** (se termine par `.apps.googleusercontent.com`)
   et un **Code secret du client**. Téléchargez le JSON ou copiez-les dans votre gestionnaire
   de mots de passe. Ne les collez dans aucune conversation ni aucun fichier.

## Étape 5 — Les deux secrets dans Supabase (vous seul pouvez le faire)

Supabase → projet de recette → **Edge Functions** → **Secrets** (ou Project Settings → Edge
Functions) → **Add new secret**, deux fois :

| Nom | Valeur |
|---|---|
| `GOOGLE_CLIENT_ID` | l'ID client de l'étape 4 |
| `GOOGLE_CLIENT_SECRET` | le code secret de l'étape 4 |

Les deux fonctions `messagerie` et `messagerie-oauth` les lisent. Tant qu'ils manquent, la
connexion affiche « Connexion indisponible » et les brouillons attendent ; rien ne casse.

## Étape 6 — Vérifier

Le coordinateur déploie les deux fonctions et la partie base de données, puis :

1. Dans Omega (écran « Messagerie » du client du banc), **Connecter Gmail** : Google affiche
   « Google n'a pas validé cette application » (régime Test) → **Continuer** → acceptez les
   deux permissions. Vous revenez sur Omega, la messagerie apparaît « connectée ».
2. Envoyez un courriel à cette adresse Gmail depuis une autre boîte. Une à deux minutes plus
   tard, il apparaît dans les réceptions d'Omega, pièces jointes comprises.
3. Validez un envoi d'essai dans Omega pour ce client : un **brouillon** apparaît dans le
   Gmail connecté (dossier Brouillons), prêt à être relu et envoyé par vous. Omega ne l'envoie
   jamais lui-même.
4. **Déconnecter** depuis l'écran : la permission disparaît aussi de
   <https://myaccount.google.com/permissions>.

## Passer en production (décision de Teo, à son retour)

Décision du coordinateur du 6 octobre : la recette et les premiers clients pilotes restent en
régime « Test ». Cela veut dire 100 comptes au plus, et une reconnexion chaque semaine, que
l'écran signale. Le passage en production se décide plus tard. Voici ce qu'il demande.

**Pourquoi c'est obligatoire.** Google exige une évaluation de sécurité de toute application
qui demande des portées restreintes et qui peut lire ces données depuis un serveur. C'est le
cas d'Omega : la relève tourne sur Supabase. Les exemptions (usage personnel, application
interne à une seule organisation Google Workspace, données gardées sur l'appareil seulement)
ne s'appliquent pas.

**Les étapes, dans l'ordre :**

1. **Le domaine.** Prouver que `omegaai.fr` appartient à Omega dans Google Search Console
   (un enregistrement DNS TXT). La page d'accueil et les règles de confidentialité doivent
   être sur ce domaine.
2. **L'adresse de retour sur `omegaai.fr`.** Google n'accepte pas, en production, une URI de
   redirection sur un domaine qu'Omega ne possède pas (`supabase.co`). La route de renvoi
   `https://omegaai.fr/api/messagerie/google/retour` est écrite pour cela (branche
   worker-a2). Il faudra l'ajouter dans l'application Google (étape 4) et le dire au
   coordinateur.
3. **Les règles de confidentialité.** Elles doivent dire quelles données Gmail Omega lit, pour
   quoi faire, où elles sont gardées. Elles doivent aussi reprendre l'engagement « Limited
   Use » de Google : pas de publicité, pas de revente, pas d'entraînement de modèles d'IA
   généralistes avec ces données, lecture par un humain seulement avec l'accord du client
   ou pour la sécurité.
4. **La demande de validation.** Dans la console Google : passer en « Production »,
   remplir le formulaire de validation, expliquer chaque portée et joindre une **courte
   vidéo** qui montre la connexion et l'usage (relève, brouillon). Comptez 2 à 3 jours
   ouvrés pour la marque, puis plusieurs semaines en tout.
5. **L'évaluation de sécurité (CASA)** par un laboratoire agréé par l'App Defense Alliance
   (TAC Security, DEKRA, Leviathan…). Google fixe le niveau selon la sensibilité des données
   et le nombre d'utilisateurs. Le laboratoire remet une lettre de validation à Google.
6. **Le renouvellement.** Il faut repasser l'évaluation au moins tous les 12 mois, à compter
   de la date de la lettre.

**Coût et délai estimés** (source : DeepStrike, « Google CASA Security Assessment », mise à
jour du 2 septembre 2026, <https://deepstrike.io/blog/google-casa-security-assessment-2025>,
qui cite les tarifs publics de TAC Security ; Google ne publie aucun prix) :

| Niveau fixé par Google | Prix annoncé (TAC Security) | Durée de l'évaluation |
|---|---|---|
| Tier 2 | 540 à 1 800 $ par an | 1 à 3 semaines |
| Tier 3 (test d'intrusion) | 4 500 $ par an | 2 à 4 semaines, une fois le dossier complet |

Il faut prévoir **environ deux mois** de bout en bout, en comptant les allers-retours avec
Google et le laboratoire. Ces chiffres viennent d'un tiers et sont à confirmer par un devis
du laboratoire avant toute décision. Les exigences et la durée de validité viennent de la
page officielle de Google, « Restricted scope verification »
(<https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification>),
consultée le 6 octobre 2026.

**À comparer.** Microsoft 365 ne demande pas d'évaluation payante (voir
`GUIDE-MICROSOFT.md`). Brevo reste aussi disponible pour les envois qui n'ont pas besoin
de partir de la boîte du client.

## Si quelque chose ne va pas

- **« redirect_uri_mismatch »** : l'URI de l'étape 4 n'est pas exactement celle ci-dessus.
- **« access_denied » ou « app not verified » sans bouton Continuer** : l'adresse Gmail n'est
  pas dans les utilisateurs test (étape 3.2).
- **La messagerie passe « à reconnecter » au bout d'une semaine** : c'est la règle du régime
  Test. Reconnecter suffit.
- **« invalid_client »** dans le journal de la fonction : l'ID ou le secret de l'étape 5 est
  faux.
