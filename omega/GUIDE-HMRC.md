# Guide HMRC pour Teo : vérifier les fournisseurs britanniques

**But.** Omega vérifie auprès de l'administration fiscale britannique (HMRC) qu'un fournisseur au numéro de TVA
« GB… » est bien enregistré, à quel nom et à quelle adresse. C'est gratuit, mais HMRC exige une application
déclarée à votre nom. Le code est prêt ; il n'attend que deux identifiants.

**Temps.** Environ 20 minutes de votre côté, puis environ deux semaines d'examen par HMRC pour la production.

## 1. Créer le compte (5 minutes)

1. Aller sur https://developer.service.hmrc.gov.uk et cliquer sur « Register ».
2. Nom, adresse courriel, mot de passe. Confirmer l'adresse avec le lien reçu.
3. Activer la vérification en deux étapes (application d'authentification ou SMS) : HMRC l'exige.

## 2. L'application de test (5 minutes)

1. Menu « Applications » → « Add an application to the sandbox ».
2. Nom : **Omega identité**.
3. Abonner l'application à l'API **« Check a UK VAT number »**, **version 2.0**.
4. Ouvrir les identifiants de l'application (sandbox) :
   - copier le **Client ID** ;
   - cliquer sur « Generate a client secret » et copier le **secret d'un seul bloc** : il ne s'affiche qu'une fois.

## 3. Poser les identifiants de test (2 minutes)

Supabase → projet recette → Edge Functions → **Secrets**, trois secrets :

| Nom | Valeur |
|---|---|
| `HMRC_CLIENT_ID` | le Client ID |
| `HMRC_CLIENT_SECRET` | le secret |
| `HMRC_BASE` | `https://test-api.service.hmrc.gov.uk` |

Ne les envoyez ni par courriel ni dans une conversation : seulement dans les secrets. Prévenez le coordinateur ;
B7 fait l'essai avec les numéros fictifs de HMRC. Aucun redéploiement n'est nécessaire : l'ouvrier lit les secrets
à chaque passage.

## 4. Demander la production (10 minutes, puis environ deux semaines)

Dans l'application : « Get production credentials ». HMRC demande notamment :

- l'organisation et une personne responsable ;
- l'adresse d'une **politique de confidentialité** et de **conditions d'utilisation** (pages d'omegaai.fr) ;
- quelques réponses sur le logiciel et sur la façon dont il traite les données ;
- l'acceptation des **Terms of Use 2.0**.

À la question de l'usage, répondre : *vérifier les fournisseurs britanniques d'une entreprise avant de les payer*
(« due diligence on VAT-registered businesses »). C'est exactement l'objet de cette API.

## 5. Passer en production

Une fois les identifiants de production accordés :

- remplacer `HMRC_CLIENT_ID` et `HMRC_CLIENT_SECRET` par ceux de production ;
- **supprimer** `HMRC_BASE`, car sans lui l'ouvrier vise la production.

Facultatif : `HMRC_VRN_REQUERANT` = le numéro de TVA britannique de l'entreprise qui vérifie, si elle en a un.
HMRC rend alors un numéro de consultation, preuve de la vérification. Une entreprise française n'en a en général
pas : ce n'est pas nécessaire.

## Pour vérifier que c'est branché

Le battement de l'ouvrier `identite` porte `hmrc: "hmrc"` (au lieu de `"absent"`) dès que les deux identifiants
sont posés. Détails techniques : `omega/NOTES-B7.md`, section 13.
