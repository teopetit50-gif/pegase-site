# Brancher les logiciels comptables — ce qu'il faut demander aux éditeurs

Pour Teo. Le code de l'envoi par API est écrit et testé sur des doubles (lot a4_28, ouvrier `omega/functions/compta`).
Il ne manque que les accès que seuls toi ou la société pouvez obtenir. Tant qu'ils manquent, rien ne part : la
connexion reste « à autoriser » ou s'arrête avec un message clair. L'export par fichier (a4_25) marche sans rien de
tout cela.

Une seule adresse de retour pour les autorisations, à déclarer chez QuickBooks et chez Pennylane :
`https://<projet>.supabase.co/functions/v1/compta`, à poser aussi dans la variable `COMPTA_URL_RETOUR`.
Les variables se posent dans les secrets des fonctions Edge (Supabase, Edge Functions, Secrets), jamais dans le code.

## QuickBooks Online (Intuit)

Créer une application sur le portail développeur Intuit (developer.intuit.com) avec la portée « Accounting »
(`com.intuit.quickbooks.accounting`). Intuit fournit d'emblée une entreprise de démonstration (sandbox) : c'est là
qu'on fait le premier essai réel. Déclarer l'adresse de retour ci-dessus dans « Redirect URIs », puis poser
`QBO_CLIENT_ID` et `QBO_CLIENT_SECRET`. Les clés de production demandent ensuite de remplir le questionnaire
d'Intuit (description de l'application, politique de confidentialité, conditions d'utilisation). Point d'attention :
QuickBooks retrouve les comptes par leur numéro, il faut donc que la société ait activé les numéros de compte dans
ses paramètres.

## Pennylane

Demander un accès partenaire à l'API v2 (pennylane.readme.io). Pennylane donne un jeton d'entreprise pour le bac à
sable. En production, il faut une application OAuth avec la portée `ledger_entries:all` ; selon ce que Pennylane
accorde, ajouter aussi la lecture des journaux et des comptes et la création de comptes. Poser
`PENNYLANE_CLIENT_ID` et `PENNYLANE_CLIENT_SECRET`, et `PENNYLANE_SCOPES` si la liste diffère. Deux points sont à
confirmer avec eux au premier essai, car leur documentation publique ne les tranche pas :
- l'adresse de renouvellement des jetons (le code suppose `https://app.pennylane.com/oauth/token`) ;
- le filtre `piece_number` sur la liste des écritures, qui sert à ne jamais envoyer deux fois la même.

## Cegid Loop

Il n'y a pas d'autorisation en ligne. Il faut deux clés, une **clé d'abonnement** (« Subscription Key ») et une
**clé d'API**. La clé d'abonnement s'obtient auprès du référent partenaire Cegid. Il faut aussi l'accès au
« Catalogue des API Cegid », rubrique « Loop API Publiques », tag « Écritures comptables, Import ». Ce catalogue
donne l'adresse et les chemins exacts, que la documentation publique ne montre pas. Les poser dans `CEGID_LOOP_URL`,
`CEGID_LOOP_CHEMIN_IMPORT` et `CEGID_LOOP_CHEMIN_STATUT` (avec `{id}` à la place du numéro de demande), plus
`CEGID_LOOP_CHAMP_URL` si le champ de l'adresse du fichier ne s'appelle pas `url`. Le cabinet donne le code du
dossier (`codeIbs`) de chaque client. Loop lit le fichier TRA à une adresse : il est déposé dans Storage, et
l'adresse est signée pour 24 heures. Il faut un dossier de démonstration Loop pour valider le format étendu (ETE),
dont certaines zones (régime et code de TVA) dépendent du paramétrage du dossier.

## Sage

Pas d'API commune à toutes les éditions. Sage 100 (le plus courant chez les PME) s'alimente par fichier : c'est
l'export `.pnm` du lot a4_25 (menu Fichier, Importer, Format Sage). Une API ne vaudra la peine qu'une fois l'édition
de la société connue (Sage 50, Sage 100 avec Sage Data Cloud, Sage Business Cloud).

Sources : [QuickBooks, JournalEntry](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/journalentry) ·
[Pennylane, créer une écriture](https://pennylane.readme.io/v2.0/reference/postledgerentries) ·
[Cegid Loop, Écritures comptables (import)](https://assistanceloop.blob.core.windows.net/documentation/API%20Publiques/Documentation%20des%20Web%20APIs%20Cegid%20Loop,%20_Ecritures%20comptables%20importTRA_.pdf)
