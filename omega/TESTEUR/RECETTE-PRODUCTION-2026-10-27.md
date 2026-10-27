# Recette en lecture seule de la mise en production des 4 modules

> Testeur indépendant (session « testeur modules »), le 27/10/2026 entre 02 h 55 et 03 h 30 Z, soit le 26/10 au soir à l'heure
> de Guadeloupe.
>
> - **Base contrôlée** : production `omega-core-eu` (`noepmkkplxshjbmqqxft`), en SELECT seulement par le connecteur.
> - **Site contrôlé** : omegaai.fr (main `15ec1c22`).
>
> Rien n'a été écrit, ni en production ni dans le dépôt, hormis ce rapport. Je n'ai utilisé aucun compte et lu aucun secret :
> de Vault, seuls les **noms** des secrets ont été lus, et des crons, aucun contenu d'en-tête. Aucun serveur de dev n'a tourné.

## Synthèse (dix lignes)

1. Les garde-fous de la production sont tous verts (12 contrôles).
2. `espace_url` vaut `https://omegaai.fr/espace2`, `environnement` vaut `production`, et aucun cron ni aucune fonction ne vise la recette.
3. Sans jeton, les 16 fonctions Edge répondent 401, 404 ou 405 : **aucun 500**.
4. **TPROD-01, bloquant.** Le Vault de production n'a ni `cle_service` ni `reput_astreinte_jeton`. Les 9 crons Edge tournent donc sans rien appeler. La première facture ne serait pas lue, la première demande n'aurait pas de réponse, rien ne partirait, et l'astreinte ne sonnerait pas.
5. **TPROD-02, important.** Les fonctions `messagerie` et `echange-pa`, et leurs crons, ne sont pas en production. Il manque donc la boîte du client branchée (FILED, REPUT) et l'échange de factures électroniques (FILED).
6. Le site en ligne passe aux cinq largeurs (390, 768, 1024, 1440, 1700) sur 31 pages : aucun débordement, aucune page vide, aucun texte cassé, et les 70 liens répondent 200.
7. **TPROD-03, mineur.** L'erreur React #418 (hydratation) apparaît sur 7 pages FILED et REPUT, à toutes les largeurs.
8. **TPROD-04, mineur.** Un visiteur non connecté voit l'espace avec des données d'exemple. REPUT le dit, mais pas la vue d'ensemble ni FILED.
9. **TPROD-05 à 07, mineurs.** Conseils de sécurité (mots de passe divulgués non contrôlés, 4 fonctions SECURITY DEFINER ouvertes à anon), tables du banc FILED présentes (vides), titre h1 vide sur `/espace2/filed`.
10. Les CHIFFRAGE des modules disent encore « rien n'est en production » : à mettre à jour (observation).

## Ce qui est juste

| Contrôle | Preuve |
|---|---|
| Garde-fous (`omega/prod/garde_fous.sql` de main, joué tel quel, en SELECT) | `anon` exécute 0 fonction de `private` ; `service_role` 1 881 sur 1 881 ; aucune politique sans GRANT ; anon n'écrit nulle part dans `public` ; 0 table locataire sans RLS ; 0 cron en échec sur 15 min ; 0 URL de la recette en base ; 0 outillage de la recette ; essai de données fictives à 0 ; environnement `production` |
| `authenticated` exécute dans `private` | production 420 sur 1 881 ; recette 419 sur 1 886 : écart de 1 fonction exécutable, cohérent avec l'arbitrage du runbook |
| Aucun cron ne vise la recette | 89 crons, tous actifs : aucune commande ne contient `ygwbgpowzlbdaajlsqkn`, et les 9 crons HTTP visent `noepmkkplxshjbmqqxft.supabase.co/functions/v1/…` |
| Crons qui tournent | dernière heure : `omega-filed`, `offload-reprises`, `omega-lecteur`, `omega-reput` et les autres crons Edge, 60 passages sur 60 réussis ; `cashd-matin` 6 sur 6 |
| `espace_url`, `environnement` | `private.lire_parametre('espace_url')` = `https://omegaai.fr/espace2` ; `lire_parametre('environnement')` = `production` |
| Fonctions Edge sans jeton (GET, sans en-tête ni corps) | `lecteur`, `lecteur-exports`, `expediteur`, `identite`, `sortie`, `alertes-quotidiennes`, `export-complet`, `taux-bce`, `reput-reponse` → **401** « Missing authorization header » ; `reput-astreinte` → **401** « jeton du cron absent ou faux » ; `webhooks-brevo`, `webhooks-ar24`, `reput-appels`, `routes-site` → **405** ; `reception` → **404** « entrée inconnue : brevo, whatsapp ou formulaire » ; `widget` → **404** « introuvable ». Aucun 500, aucun 503 |
| Données de démonstration absentes de la production | `private.filed_banc_*` vides ; pas de schéma `tests` ; 0 document FILED, 0 compte CASHD, 0 demande REPUT, 0 compte OFFLOAD, 0 travail en attente, 0 envoi en file |
| Site, cinq largeurs × 31 pages | `/espace2`, les 26 pages des 4 modules (FILED 8, CASHD 7, REPUT 5, OFFLOAD 6) et les 4 pages d'offre (`/offres/factures-fournisseurs`, `relances-impayes`, `demandes-clients`, `nouvelles-affaires`) : toutes chargées, débordement horizontal 0, aucun « undefined », « NaN », « Invalid Date » ou `[object …]`, aucune requête réseau en échec, aucune page sous 800 caractères |
| Liens | 70 liens distincts relevés à 1 440 px : 70 répondent 200 |
| Écran FILED neuf | `/espace2/filed/refusees` en ligne, titre « Refusées, à reprendre ou à classer » |

## Écarts

**TPROD-01 · socle, tous les modules · bloquant pour un premier client · le Vault de production n'a pas la clé de service : les crons Edge tournent à vide**

- **Preuve** :
  - `select name from vault.secrets` en production → `webhook_secret` (03/08) **seulement**.
  - La même lecture sur la recette → `cle_service`, `reput_astreinte_jeton`, deux secrets de messagerie, etc.
  - `cron.job_run_details`, sur la dernière heure, des 9 crons Edge (`omega-lecteur`, `omega-reput`, `omega-expediteur`, `omega-identite`, `omega-sortie`, `omega-reput-astreinte`, …) : 60 passages réussis chacun, retour **`0 rows`**.
  - `net._http_response` : **aucune** réponse sur 2 h. Aucun appel n'est parti.
- **La promesse.** `CHIFFRAGE/production.md`, ligne « Sécurité » : « Sans clé de service, les tâches planifiées n'appellent pas les fonctions. » Le runbook prévoyait ces crons « présents et sans effet » tant que `cle_service` n'est pas posée (palier P3).
- **Conséquences** :
  - FILED : aucune pièce lue ;
  - REPUT : aucune réponse préparée, et l'astreinte ne peut pas appeler (`reput_astreinte_jeton` absent) ;
  - tous les modules : rien ne part par `expediteur` ;
  - pas d'alerte quotidienne, pas de taux BCE.

  La base est vide de clients des modules : le défaut ne se voit donc pas encore.
- **Hypothèse** : c'est peut-être l'étape « secrets » du runbook, laissée à Teo. Elle doit être faite et vérifiée avant le premier client.
- **Non vérifiable par moi** : les secrets des fonctions Edge (Bedrock, Brevo, Twilio). Aucune porte de lecture ne les montre sans les exposer.

**TPROD-02 · FILED, REPUT · important · `messagerie` et `echange-pa` ne sont pas en production**

- **Preuve** :
  - La production a 16 fonctions Edge, sans `messagerie` ni `echange-pa`, et n'a pas les crons `omega-messagerie` ni `omega-echange-pa`.
  - La recette a ces deux crons, qui appellent `functions/v1/messagerie` et `functions/v1/echange-pa`.
- **Conséquences** :
  - une boîte Gmail ou Outlook branchée par le client n'est pas relevée (FILED « Boîte de réception », REPUT par la boîte du client) ;
  - FILED n'échange pas avec la plateforme agréée de facturation électronique.
- **Ce qui marche quand même** : l'adresse dédiée et le formulaire passent par `reception`, qui est en production.
- **À confirmer** : un choix de périmètre est possible, par exemple attendre la vérification Google prévue au CHIFFRAGE FILED. Les crons des métiers (`tavaro-pdf`, `tavaro-questions`, `tamila-purge`, `daliro-questions`) manquent aussi. Ils sont hors des 4 modules.

**TPROD-03 · FILED, REPUT · mineur · erreur React #418 (hydratation) sur 7 pages, à toutes les largeurs**

- **Preuve** : à 390, 768, 1 024, 1 440 et 1 700 px, la console lève `Minified React error #418 … args[]=text` sur :
  - FILED : `/espace2/filed`, `/espace2/filed/boite`, `/espace2/filed/fournisseurs` ;
  - REPUT : `/espace2/reput`, `/espace2/reput/base`, `/espace2/reput/reglages`, `/espace2/reput/sujets`.

  Les 24 autres pages sont propres.
- **Hypothèse** : un texte qui diffère entre le serveur et le navigateur, comme les heures relatives (« il y a 22 heures ») ou les dates mises en forme. C'est la même famille que le #418 de l'horloge corrigé par 895b013b.

**TPROD-04 · écrans · mineur · sans session, l'espace s'affiche avec des données d'exemple, que seul REPUT signale**

- **Preuve** : sans cookie, `/espace2` et les 26 pages des modules répondent **200**. L'écran affiche « Non connecté », le client « CAMA », et des fournisseurs, montants et personnes fictifs (« Transports Rivière 1 208,00 € », « Congés de Sofia Carvalho… »).
- Le navigateur ne fait aucune requête vers Supabase : ce sont des données d'exemple, aucune donnée de production n'est exposée.
- `/espace2/reput` affiche « Données d'exemple ». `/espace2` et `/espace2/filed` n'affichent rien de tel.
- **Attendu** : la mention « Données d'exemple » sur toutes les pages, ou un renvoi vers la connexion.

**TPROD-05 · socle · mineur · conseils de sécurité Supabase**

- **Preuve**, `get_advisors(security)` en production :
  - aucune ERROR ;
  - **protection des mots de passe divulgués désactivée** (`auth_leaked_password_protection`) ;
  - **4 fonctions SECURITY DEFINER exécutables par `anon`** : `agenda_public`, `btp_lire_a_signer`, `btp_signer_sur_place`, `demande_pour_confirmation`. Ce sont vraisemblablement des pages publiques voulues, à confirmer ;
  - 247 fonctions de même nature pour `authenticated` (le modèle des portes) ;
  - 1 `search_path` mutable (`private.loc_catalogue_questions`) ;
  - 5 colonnes `reg*` ;
  - 78 tables RLS sans politique (INFO, `private`).
- **La promesse.** `CHIFFRAGE/production.md` prévoit la « lecture des conseils de sécurité Supabase après la pose ». La protection des mots de passe s'active en un réglage d'Auth (Teo).

**TPROD-06 · FILED · mineur · les tables du banc de test FILED sont en production**

- **Preuve** : `private.filed_banc_cas`, `private.filed_banc_releves` et `private.filed_banc_verdicts` existent (0 ligne chacune). Le garde-fou « outillage de la recette » ne les vise pas.
- **Attendu** : ne pas les exporter vers la production, ou les ajouter au garde-fou.

**TPROD-07 · FILED · mineur · `/espace2/filed` n'a pas de titre h1**

- **Preuve** : le h1 est vide à toutes les largeurs, alors que les 25 autres pages de module en ont un (« Documents reçus » n'apparaît que dans le fil d'Ariane).

## Observations

- **Webhooks non sondés en POST.** `webhooks-brevo`, `reception`, `widget`, `webhooks-ar24` et `reput-appels` n'ont été appelés qu'en GET. Un POST, même vide, aurait pu écrire une trace en production. Le contrôle « 401/503 sans jeton » du runbook § 5 reste donc à faire en POST par la session autorisée à écrire.
- **CHIFFRAGE à jour.** `filed.md` (ligne 35) et `reput.md` (ligne 43) disent encore « rien n'est en production ».
- **Comparaison avec les promesses de `CHIFFRAGE/production.md`** :
  - garde-fous verts : tenu ;
  - environnement : tenu ;
  - clé de service : **non** (TPROD-01) ;
  - lecture des conseils de sécurité : à faire (TPROD-05) ;
  - offre Pro, sauvegarde, MFA, DPA, Bedrock et Brevo de production : **non vérifiables en lecture seule** par le connecteur.
