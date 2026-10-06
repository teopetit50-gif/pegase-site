# NOTES — session A5 (garde-fous)

Branche `worker-a5`. Mise à jour : 5 octobre 2026.

## Fait aujourd'hui

- **Sauvegarde.** `.github/workflows/omega-sauvegarde.yml` : chaque nuit à
  02:17 UTC, contrôle des deux secrets (échec explicite s'ils manquent),
  comptages de référence, `pg_dump` custom zstd des schémas `public`,
  `private`, `tests`, `auth`, `storage`, `supabase_migrations`, chiffrement
  gpg AES-256 avec `SAUVEGARDE_PHRASE`, restauration d'essai **depuis
  l'artefact chiffré** dans un `postgres:17` de service (rôles Supabase et
  extensions posés d'abord), verdict `reussie` seulement si `pg_restore`
  strict passe et si les comptages table par table sont identiques, preuve
  insérée dans `private.sauvegardes` (y compris `echouee`), rejoue
  `private.verifier_sauvegardes()`, artefact gardé 30 jours, tâche rouge si
  le verdict n'est pas `reussie`. Procédure, RPO (24 h, alerte à 26 h), RTO
  (2 h) et restauration réelle dans `omega/docs/SAUVEGARDE.md`.
- **Tests.** 50 fichiers pgTAP dans `omega/tests/socle/` + `00_installation.sql`
  (pgTAP, schéma `tests`, aides : jeu de deux clients fictifs, endosser un
  utilisateur `authenticated` par `request.jwt.claims`, insertion minimale par
  introspection). Chaque fichier est exécutable tel quel par `execute_sql` ;
  `runtests()` annule toutes les données d'essai. **50/50 verts sur la maquette
  locale** (`omega/tests/socle/local/`, cluster Postgres 16 jetable). Pas
  encore lancés sur la recette (voir « Bloqué »).
- **Banc.** `omega/banc/` : 100 factures fournisseurs fictives générées par
  `generer-factures.mjs` (pdf-lib, déterministe, graine 2026) : 40 natives
  (4 gabarits, remises, acomptes, port, éco-participation, périodes,
  franchise, autoliquidation), 3 avoirs, 15 numérisées (bonne/moyenne/faible),
  8 multi-pages, 5 lots multi-factures, 8 Factur-X (XML CII joint, BASIC et
  EN 16931), 6 UBL 2.1, 8 tickets de caisse, 6 manuscrites, 1 illisible.
  Chaque pièce a son JSON attendu ; `verifier-banc.mjs` recalcule tous les
  totaux et toutes les clés (SIREN/SIRET Luhn, TVA, IBAN). Aucune raison
  sociale réelle, identifiants dans des plages fictives. 6,8 Mo.
- **Sécurité.** `omega/docs/SECURITE.md` : analyse et corrections par
  priorité. Point majeur : **ne pas révoquer USAGE sur `private` pour
  `authenticated`**, les politiques RLS en dépendent (résolution de
  `private.mes_clients()`) ; proposer à la place la reprise des EXECUTE dans
  `private` (grants explicites + default privileges), un rôle `sauvegarde`
  dédié, `search_path` des SECURITY DEFINER, vues `security_invoker`, index
  `client_id`.

## Lot 19af — activation par un seul décideur (6 octobre, demande du coordinateur, décision de Teo)

- `omega/modules/socle/migrations/19af_activation_seul_decideur.sql` :
  - liste blanche `private.activation_seul_autorisee` (Daliro J-2 : envoi.email,
    whatsapp, sms) ;
  - `private.seul_decideur(client, user)` : gérant ou admin, et aucun autre
    gérant, admin ou valideur actif (auth.users non supprimé, non banni) ;
  - `private.activation_par_seul_decideur(demande, au_nom_de, uid)` ;
  - `preparer_approbation` réécrite par repère (regex tolérante aux blancs,
    1 occurrence exigée). Seule la règle du demandeur reçoit l'exception, le
    commentaire est forcé à « [seul décideur] … ». 19c, exiger_decideur,
    périmètre et objet restent inchangés ;
  - rejouable : un corps qui porte déjà l'exception n'est pas retouché. Rien
    n'est supprimé.
- Test `omega/tests/socle/55_activation_seul_decideur.sql`, 21 assertions. Sur la
  maquette, il est sans objet (pas de politiques). Sur une souche locale qui porte
  le vrai corps de `preparer_approbation` et la mécanique des politiques
  simplifiée, il passe 21/21. Sans la réécriture, 10, 11 et 12 sont rouges. Ce
  n'est pas encore joué sur la recette.
- TOUT.sql à 55 tests ; TOUT_4 = 40 à 55.

## Reprise (session_01BnmsMXfPeMf55k32si4Zdd, 6 octobre) — tests santé des envois 52 et 53

Reçu : a5_01 v2 posée depuis 97853cb, test 44 5/5, test 51 3/3.

- **52 `sante_canal_non_permis`** : envoi `donnees_sante` sur un canal dont
  `permis_sante` est faux (SMS), module tavaro (pas de santé), mode essai →
  `CANAL_NON_PERMIS`, définitif ; témoin sans santé (le canal n'est pas
  refusé en soi), contre-épreuve sur le courriel.
- **53 `sante_fournisseur_non_agree`** : le verrou « sante:fournisseur »
  **existe** déjà, sous le nom `SANTE_HORS_CANAL_AGREE` (verrous_envoi, après
  le consentement). Envoi santé par courriel (permis), fournisseur d'essai
  (`envois_essai_fournisseur`, brevo) à `agree_sante` faux → verrouillé,
  définitif, pas le canal ; témoins : brevo agréé dans la transaction, envoi
  sans santé.
- Envoi construit en mémoire (`jsonb_populate_record`), pas d'insertion dans
  `envois` ; le réglage d'essai `reglages_envois (client fictif A, tavaro,
  essai)` est posé par `inserer_minimal` (diag s'il est refusé). runtests()
  annule tout, y compris la bascule d'`agree_sante`.
- Maquette alignée (canaux `permis_sante`, `fournisseurs_envoi`,
  `reglages`, deux verrous santé) : 53/53, `TOUT.sql` → 53 `ok`. Mutation :
  retirer chaque règle rend son test rouge.
- **Point à vérifier (non testé)** : en mode réel, `verrous_envoi` lit le
  fournisseur de l'**expéditeur actif**, alors que `commencer_envoi` (19ab)
  rend `fournisseur_hds` d'après **`envois.fournisseur`**. Si les deux peuvent
  diverger, l'ouvrier d'A2 reçoit un `fournisseur_hds` qui n'est pas celui
  que le verrou a jugé.

**Recette (coordinateur, 01 h 35 Z)** : 52 ok 4/4, 53 ok 5/5. Les témoins
sortent `HORS_HEURES`, pas le verrou santé : c'est attendu.

**Test 54 `sante_fournisseur_coherent`** (lecture seule) : il vérifie la
divergence ci-dessus sur les envois existants. En essai, `envois.fournisseur`
doit valoir `envois_essai_fournisseur` ; en réel, le fournisseur de
l'expéditeur retenu (`expediteur_id`). Aucun envoi de santé prêt, en cours
ou parti ne doit viser un fournisseur non agréé. Sur la maquette il est
sans objet (pas d'`expediteurs`) : seule la recette le juge.

**Recette 01 h 37 Z** : le test 54 passe 3/3 (5 envois d'essai cohérents, **0 envoi réel
comparé**). La divergence n'est donc ni prouvée ni écartée par les données. Côté ouvrier,
A2 la ferme : expediteur v12 (67f9cf6) refuse tout envoi santé dont
`envoi.fournisseur` n'est pas brevo/brevo_sms. Rien d'autre n'est attendu d'A5
pour l'instant.

## PASSATION — pour le nouveau coordinateur (session_01BCGFdpRKBvXKjouC75sYBg), 6 octobre 01:15 UTC

L'ancien coordinateur me demande de t'envoyer mes réponses en attente. Le
canal `send_message` m'est refusé depuis le début de la session : ce fichier
est mon seul canal ; il est à jour à chaque commit de `worker-a5`.

**SHA à poser depuis le dépôt, dans l'ordre** : `72053b1` (test 51),
`db8fb41` (a5_01 + sources requises + TOUT à 51 tests), `87ce516` et le
présent commit (documentation). Fichiers : `omega/migrations/a5_01_private_execute.sql`,
`omega/migrations/a5_01_liste_requises.sql`, `omega/tests/socle/00_installation.sql`,
`omega/tests/socle/44_*.sql`, `51_*.sql`, `TOUT.sql`, `TOUT_1..4.sql`,
`omega/docs/SECURITE.md`.

1. **Test 44 — liste « en trop » après 19z.** Je ne peux pas la calculer :
   elle ne se lit que sur la recette, et je n'ai pas l'outil. `db8fb41`
   change la règle, pas une liste : appels non qualifiés (`f(` via
   `search_path`, ce qui manquait pour `ecrit_par_la_brique`,
   `effacement_en_cours`, les `_pour` de Tiroma), CHECK de domaines, DEFAULT,
   vues lisibles directement ou via une fonction publique SECURITY INVOKER,
   clauses WHEN, déclencheurs SECURITY INVOKER de `private`, fermeture
   transitive. Et la cause de la rechute des lots de la vague 2 : un REVOKE
   de défaut *par schéma* n'enlève pas le défaut intégré (EXECUTE à
   PUBLIC) ; a5_01 pose maintenant le REVOKE *global* par rôle créateur, avec
   compensation par schéma pour `public` et `extensions`. Marche à suivre :
   poser `a5_01_private_execute.sql` (idempotente), lancer `TOUT_4.sql`, lire
   le test 44 : « En trop » = à révoquer pour de vrai, « Manquantes » = à
   m'envoyer avec leur usage pour que j'ajoute la source.
2. **Test 51 — « unrecognized privilege type DELETE ».** Corrigé en
   `72053b1`. `has_table_privilege` accepte DELETE ; c'est
   `has_any_column_privilege` (droits par colonne, cas `tamila_cles`) qui
   ne le connaît pas : l'un sert pour DELETE, l'autre pour
   SELECT/INSERT/UPDATE. Vert sur la maquette.
3. **Règle santé des envois — avis sur le lot 19ab.** Le lot va dans le bon
   sens et recoupe ma proposition (`SECURITE.md` §3 bis) : refuser tout
   envoi `donnees_sante` sur un canal dont `canaux_envoi.permis_sante` est
   faux, et faire porter `donnees_sante` et `fournisseur_hds` par
   `commencer_envoi`. Trois compléments à mes yeux : (a) `fournisseur_hds`
   doit être un **verrou** dans `private.verrous_envoi()` (`sante:fournisseur`),
   pas seulement une valeur rendue, sinon un fournisseur non HDS passe si
   le canal est permis ; (b) `donnees_sante` doit être **posé par le module**
   (Tiroma) et jamais déduit du contenu ni modifiable par le client ;
   (c) aucun repli automatique vers un autre canal : différer, alerter le
   gérant, écrire une ligne au journal opposable. Je peux écrire les deux
   tests pgTAP (envoi santé → canal non permis verrouillé ; → fournisseur
   non HDS verrouillé) dès que les noms de colonnes de `envois`
   (`donnees_sante`, `fournisseur`) et de la table des fournisseurs me sont
   donnés ici.

Tout le reste de l'état est dans les sections ci-dessous (du plus récent au
plus ancien) : « PAUSE », « Fait », « Bloqué », « Alignement », « Ce que Teo
doit poser ».

## Réponse au coordinateur (message de 00:52 UTC) — SHA à poser

Tes trois points étaient déjà couverts par `db8fb41` (poussé à 00:40 UTC,
juste avant ton message) ; le présent commit n'ajoute que la règle santé.

1. **Test 44 / a5_01** : la fin de 19z est intégrée dans `db8fb41`, avec la
   vraie cause de la rechute : un REVOKE de défaut *par schéma* n'enlève pas
   le défaut intégré, il faut le REVOKE *global* par rôle créateur (posé pour
   `postgres`, le rôle courant et chaque propriétaire de fonction de
   `private`, avec compensation par schéma pour `public` et `extensions`).
   Ma liste « en trop » ne peut se calculer que sur la recette : rejoue le 44
   de `db8fb41`, il l'imprime ; avec les sources élargies (appels non
   qualifiés, domaines, vues via fonctions publiques) les 58 d'hier
   devraient fondre à ce qui est vraiment à révoquer.
2. **Test 51** : corrigé depuis `72053b1`. Précision : `has_table_privilege`
   accepte bien `DELETE` ; c'est `has_any_column_privilege` (que j'utilisais
   pour admettre les droits par colonne de `tamila_cles`) qui ne le connaît
   pas. Le test utilise maintenant l'un pour DELETE et l'autre pour
   SELECT/INSERT/UPDATE ; vert sur la maquette.
3. **Règle santé des envois (trou n° 7 de B3)** : proposition rédigée dans
   `omega/docs/SECURITE.md` §3 bis pour A2 : drapeau `hds` côté
   fournisseur, qualification « santé » posée par le module (jamais déduite
   du contenu), deux verrous dans `private.verrous_envoi()` (`sante:canal`,
   `sante:fournisseur`), pas de repli automatique, deux tests pgTAP et une
   ligne au journal par refus.

SHA à poser : `72053b1` (test 51), `db8fb41` (a5_01, sources, TOUT à 51
tests), puis le présent commit (règle santé, documentation seule).

## Réponse au coordinateur (REPRISE, message de 23:41 UTC) — commit à lire : `db8fb41`

Fichiers touchés : `omega/migrations/a5_01_private_execute.sql`,
`omega/migrations/a5_01_liste_requises.sql`, `omega/tests/socle/00_installation.sql`
(`tests.fonctions_private_requises()`), `omega/tests/socle/51_politiques_et_grants.sql`
(déjà corrigé en `72053b1`), `TOUT.sql` et `TOUT_1..4.sql` (51 tests désormais),
`local/maquette.sql`, `local/lancer.sh`, `README.md`, `docs/SECURITE.md`.

1. **La règle qui manquait, trouvée et corrigée.** Ce n'était pas l'absence
   du revoke (a5_01 l'avait) mais un piège de Postgres : un `alter default
   privileges … in schema private revoke execute … from public` **ne retire
   pas** le défaut intégré (EXECUTE à PUBLIC) : les défauts par schéma
   s'ajoutent aux défauts globaux, seul un REVOKE **global** (sans `in
   schema`) l'enlève. D'où les fonctions de la vague 2 nées exécutables par
   anon après la première pose. a5_01 pose maintenant, pour `postgres`, le
   rôle courant et chaque rôle propriétaire d'une fonction de `private` :
   `alter default privileges for role R revoke execute on functions from
   public` (global), puis redonne par schéma ce que Supabase donne
   d'habitude (`public` et `extensions` : EXECUTE à anon, authenticated,
   service_role) et `private` → service_role. Vérifié sur la maquette : une
   fonction créée après la migration n'est plus exécutable par anon, une
   porte publique reste exécutable par authenticated. **Conséquence à
   connaître** : une fonction créée par `postgres` dans un autre schéma que
   `public`/`extensions`/`private` (par exemple `tests`, `graphql_public`)
   ne naît plus exécutable par PUBLIC ; `tests` a déjà ses propres défauts.
   Si tu préfères ne pas toucher au défaut global, supprime la ligne du
   REVOKE global et rejoue a5_01 après chaque lot : elle est idempotente.
2. **Sources élargies** (même CTE dans l'aide, la migration et la liste) :
   - appels **non qualifiés** reconnus (`f(` autant que `private.f(`, via
     `search_path`) : c'est ce qui manquait pour `ecrit_par_la_brique`,
     `effacement_en_cours`, les `_pour` de Tiroma et les `*_valide` appelées
     depuis d'autres fonctions ;
   - CHECK de **domaines** (`contypid`), en plus des tables de `public`, par
     `pg_depend` et par le texte de `pg_get_constraintdef` ; DEFAULT et
     colonnes générées par `pg_depend` et `pg_get_expr(adbin)` ;
   - vues lisibles : directement (`pg_depend`) **et** via une fonction
     publique SECURITY INVOKER qu'elles appellent (`btp_est_serveur` par
     `contexte_serveur`) ; ces fonctions publiques servies par une vue
     comptent comme exécutables par le client ;
   - clauses WHEN (f) ; déclencheurs SECURITY INVOKER de `private` (c) ;
     fermeture transitive à travers toute fonction retenue SECURITY INVOKER.
   - Les **fonctions de déclencheur** elles-mêmes restent hors règle (ni
     requises ni « en trop ») : Postgres ne vérifie pas EXECUTE au
     déclenchement ; garder ou retirer 19r ne change rien au test 44.
   Sur la maquette, les neuf cas (politique, fonction publique, déclencheur,
   vue directe, vue via fonction publique, CHECK de domaine, DEFAULT, WHEN,
   appel non qualifié) sont retenus. Rejoue le 44 : ce qui restera « en
   trop » est à révoquer pour de vrai ; si une fonction légitime y figure,
   colle-moi son usage et j'ajoute la source.
3. **Test 51** : corrigé en `72053b1` (DELETE n'existe pas au niveau
   colonne : `has_table_privilege` pour DELETE, `has_any_column_privilege`
   pour SELECT/INSERT/UPDATE). Vert sur la maquette.
4. Règle « pas de DELETE en clair » levée : `TOUT.sql` porte les **51**
   tests, `TOUT_1..4` = 13 + 13 + 13 + 12. Maquette : 51/51, `TOUT.sql` →
   51 `ok`, migration rejouée sans effet.

## PAUSE du 5 octobre, 21:00 UTC — état exact à la reprise

Teo arrête toutes les sessions. Tout est commité et poussé sur `worker-a5`.

- **Dernier geste** : test 51 corrigé pour l'erreur « unrecognized privilege
  type DELETE » signalée par le coordinateur (`has_any_column_privilege`
  n'accepte pas DELETE : `has_table_privilege` pour DELETE, colonne pour
  SELECT/INSERT/UPDATE). TOUT*.sql régénérés. **Non rejoué sur la maquette
  locale** (consigne : ne plus rien lancer) ; la modification tient en trois
  lignes, à vérifier au premier passage.
- **Attendu du coordinateur à la reprise** : sortie des tests 44 (4/5 après
  son lot 19z : il reste une assertion rouge, probablement « en trop » ou
  « manquantes » à lire) et 51 sur la recette.
- **Prochaine étape A5** : lire ces deux sorties, ajuster la règle de
  `tests.fonctions_private_requises()` si 44 nomme des fonctions, puis
  relancer `bash omega/tests/socle/local/lancer.sh` (51/51 attendu) et
  régénérer TOUT*.sql.
- **Reste ouvert** (inchangé) : advisors de production (NOTES-COORDINATEUR.md),
  secrets GitHub à poser par Teo, première exécution du workflow de
  sauvegarde, migrations Tamila/Tiroma et lots 17 à 19 à pousser en
  production par le coordinateur, `echeances_pro_journal` (table à venir
  ou nom périmé ?), retrait conseillé du lot 19r.

## Réponse au coordinateur (message de 20:39 UTC, compléments f/g/h)

- **(f) clause WHEN des déclencheurs** : intégrée comme sixième source dans
  `tests.fonctions_private_requises()`, `a5_01_private_execute.sql` et
  `a5_01_liste_requises.sql`. Règle : fonction de `private` dont dépend un
  déclencheur non interne d'une table de `public` (`pg_depend`, qui
  enregistre les dépendances de la clause WHEN), autre que la fonction de
  déclencheur elle-même, **ou** citée après `WHEN` dans
  `pg_get_triggerdef()` (ta regex, en ceinture). Sur la maquette, un
  déclencheur `WHEN (private.tiroma_trace_ecriture())` est bien retenu.
  Ton lot 19u correspond à cette règle.
- **(g) les 89 fonctions de déclencheur (lot 19r) : inutile, à retirer.**
  Postgres vérifie EXECUTE sur la fonction de déclencheur au `CREATE
  TRIGGER` (pour celui qui crée) et jamais au déclenchement :
  `ExecCallTriggerFunc` n'appelle pas de contrôle d'ACL, c'est pourquoi
  les déclencheurs des tables de `public` tournaient déjà pour les clients
  avant a5_01 alors que ces fonctions n'étaient exécutables que par PUBLIC…
  et c'est aussi pourquoi `verifier_brique`/`*_tracer` continuent de
  tourner après la révocation. Sans risque non plus (une fonction de
  déclencheur ne s'appelle pas directement : « trigger functions can only
  be called as triggers »), donc le test 44 les ignore (`prorettype <>
  trigger`) dans les deux cas. Je recommande de retirer 19r pour la
  lisibilité de la liste figée : l'erreur de B3 venait de la clause WHEN
  (f), pas de la fonction de déclencheur.
- **(h)** : noté, zéro manque, cohérent avec la fermeture implémentée ici.
- Le lot corrigé des tests 11/12/18/24/30/32/34/36/37/43/44 est poussé
  depuis `ced7895` (puis `372b1c4`, `fbbf153` et le présent commit) : TOUT_1
  à TOUT_4 sur `worker-a5` sont à jour. Maquette : 51/51, TOUT.sql → 45 `ok`.

## Réponse au coordinateur (message de 19:48 UTC, lots 19k et 19l)

Règle figée dans un nouveau test, **51_politiques_et_grants.sql**, inclus
dans TOUT.sql (45 tests désormais) et TOUT_4 :

1. toute politique de `public` visant `authenticated` (ou `public`) a le
   droit de sa commande (`has_any_column_privilege`, pour admettre les
   droits par colonne comme sur `tamila_cles`) ;
2. tout INSERT/UPDATE/DELETE accordé à `authenticated` sur une table en RLS
   a une politique de la même commande (ou `ALL`) ;
3. aucun droit d'écriture pour `authenticated` sur une table de `public`
   **sans** RLS ; le diag liste les tables sans RLS pour SECURITE.md
   (`lorani_echeances_permis`, `tamila_registre` attendues).

Maquette : 51/51, TOUT.sql → 45 `ok`. Les lots 19k/19l devraient le rendre
vert chez vous ; s'il reste rouge, les triplets (table, politique, commande)
sont dans la sortie.

## Réponse au coordinateur (message de 19:02 UTC, complément (f) service_role)

Intégré : `a5_01_private_execute.sql` accorde désormais à `service_role`
USAGE sur `private`, EXECUTE sur toutes les fonctions et procédures, et les
default privileges correspondants (schéma et `for role postgres`) ; son
contrôle immédiat exige que `service_role` exécute tout. Le test 44 ne
comptait déjà que `authenticated` et `anon` ; il vérifie en plus que
`service_role` exécute toutes les fonctions de `private` et a USAGE dessus.
Maquette : 50/50, TOUT.sql → 44 `ok`. Rejouable sur la recette sans effet
après ton lot 19j.

## Réponse au coordinateur (message de 18:56 UTC, a5_01 posé, TOUT_1..4 rejoués)

Poussé sur `worker-a5` ; TOUT*.sql régénérés ; maquette alignée (canal
`email`, `envois.id` uuid, journal réservé aux gérants/admins, création de
client journalisée, FK non nulles vers `envois` et `suivis`, exemples des
sources c/d/e) : 50/50 verts, TOUT.sql → 44 `ok`.

- **Sources (c), (d), (e)** intégrées à `tests.fonctions_private_requises()`,
  à `omega/migrations/a5_01_private_execute.sql` et à
  `a5_01_liste_requises.sql`, avec la même fermeture transitive :
  (c) fonctions appelées dans le corps d'un déclencheur SECURITY INVOKER de
  `private` effectivement attaché à une table ; (d) fonctions dont dépend une
  vue ou vue matérialisée de `public` lisible par authenticated (`pg_depend`
  via `pg_rewrite`, exact) ; (e) fonctions dont dépend un CHECK ou un DEFAULT
  d'une table de `public` (`pg_depend` via `pg_constraint` et `pg_attrdef`,
  exact). Sur la maquette, la migration retient bien les cinq cas. Si ta
  liste de 187 et la mienne divergent sur la recette, le test 44 affiche
  « en trop » et « manquantes » : colle-les, j'ajuste la règle plutôt que la
  liste.
- **11, 12, 30, 32** : comptages filtrés sur `action like 'essai_a5%'`.
  `tests.jeu()` crée désormais aussi un **gérant** de A (`gerant_a`,
  rôle `gerant` s'il est admis) : 11 vérifie que ni le gérant ni le
  collaborateur de A ne voient le journal de B ; 12 vérifie que le gérant de
  A voit sa ligne et note en diag ce que voit le collaborateur (0 attendu
  chez vous).
- **18, 24** : `tests.inserer_minimal()` pose désormais les lignes parentes
  des clés étrangères NOT NULL (récursif, `client_id` propagé) ; pour une
  table de référence (hors `public` ou sans `client_id`, comme
  `canaux_envoi`) il prend une valeur existante.
- **34** : lecture du verdict par `tests.verdict_signale_rupture()` :
  `premiere_ligne_fausse` (ou toute clé « faux/rupture/écart ») non nulle,
  ou `ok`/`valide` à faux, ou un mot explicite. 33 utilise la négation.
- **36** : canal pris dans `private.canaux_envoi` (`email` chez vous,
  `courriel` sur la maquette). **37** : `envois.id` comparé en texte, quel
  que soit son type.
- **43** : admet toute politique non triviale : aide de `private`,
  `client_id`, `auth.uid()` ou `exists (select …)` (jointure parente) ; le
  diag garde la liste hors mes_clients()/lit_objet().
- Pris note des lots 19e à 19i ; rien à changer dans les tests pour 19h
  (Realtime) et 19i (Brevo).

À rejouer : TOUT_1 à TOUT_4 en un passage.

## Réponse au coordinateur (message de 18:00 UTC, retour de TOUT_3 et TOUT_4)

Tout est poussé ensemble sur `worker-a5` ; TOUT*.sql régénérés ; maquette
locale alignée sur la mécanique réelle (journaliser, opposer, verrous_envoi,
colonnes d'envois, EXECUTE à PUBLIC puis migration) : 50/50 verts, TOUT.sql →
44 `ok`, migration rejouée deux fois sans erreur.

- **Migration demandée** : `omega/migrations/a5_01_private_execute.sql`.
  Calcule d'abord l'ensemble requis (politiques via `pg_depend`, exact ;
  fonctions publiques SECURITY INVOKER exécutables par authenticated via le
  texte du corps ; fermeture transitive sur les SECURITY INVOKER retenues ;
  jamais les fonctions déclencheur), puis `revoke execute on all functions
  in schema private from public, anon, authenticated`, puis `grant` explicite
  de chaque signature retenue, puis `alter default privileges` (schéma et
  `for role postgres`), puis contrôle immédiat (exception si anon exécute
  encore quelque chose ou si authenticated exécute hors liste). La liste
  retenue sort en NOTICE. Sans DROP ni DELETE, rejouable.
  `omega/migrations/a5_01_liste_requises.sql` (lecture seule) rend la même
  liste en `grant … ;` prêts à figer : lance-le avant pour relire, après pour
  vérifier, et colle le résultat dans NOTES-COORDINATEUR.md ; je ne peux pas
  la générer moi-même depuis la recette. Le test 44 rejoue la règle.
  Précaution : les fonctions publiques `SECURITY DEFINER` qui appellent du
  `private` ne sont pas comptées (elles s'exécutent avec les droits de
  `postgres`) ; si une porte publique est en fait SECURITY INVOKER et
  n'apparaît pas exécutable par authenticated au moment de la migration,
  elle ne compte pas non plus. Le contrôle immédiat et le test 44 le diront.
- **Journal** : `tests.journaliser()` passe par
  `private.journaliser(uuid, text, text, text, jsonb, uuid)` (tests 11, 12,
  30, 33, 34). Test 32 reformulé : ni anon, ni authenticated, ni service_role
  n'ont INSERT sur `journal_opposable` ; la porte existe ; deux lignes écrites
  par elle font 32 octets et la seconde pointe la première.
- **26 / 29** : `echeances_pro_journal` absente → le test le dit et passe
  (tous les tests 16–27 sont tolérants à une table absente ; 29 liste les
  absentes en diag). Question en retour : le cahier la nomme ; est-ce une
  table à venir (Lorani ?) ou un nom périmé ?
- **36 / 37** : insertion de l'envoi par `inserer_minimal` (colonnes
  `destinataire_adresse`, `canal`, `transactionnel`), opposition par
  `private.opposer(...)` (le `type` est pris dans la contrainte CHECK de
  `oppositions.type` s'il y en a une, sinon `prospect`), puis
  `private.verrous_envoi(e, true, p_instant)` ; le résultat est lu en jsonb
  et doit nommer l'opposition (36) ou un verrou horaire (37, dimanche
  11/10 23 h, SMS non transactionnel), avec un témoin sans opposition / un
  mardi 10 h 30. Si la forme du retour ne contient ni « oppos » ni
  « differ|hors|plage|heure|report », le diag montre le JSON et j'ajuste.
- **35** : rien à changer (lot19g).
- **42** : `client_id` nullable admis si toute politique SELECT permissive
  pour authenticated conditionne `client_id` (un null n'y passe jamais) ;
  diag des tables concernées (`demandes_audit`, `gabarits_messages`,
  `travaux`). Si l'une d'elles a une politique sans `client_id`, elle reste
  rouge, à raison.
- **43** : accepte toute politique qui appelle une fonction `private.` ou
  contient `client_id in (select` ; diag des politiques hors
  mes_clients()/lit_objet() pour SECURITE.md.
- **44** : liste exacte (voir migration) ; rouge tant que a5_01 n'est pas
  posée, vert après.
- **05 / 08 / 18 / 20 / 24 / 11-12** : déjà couverts par le commit précédent
  (CHECK lus, rôle lu dans la contrainte, tables internes sans politique).

Tu peux relancer TOUT_1 à TOUT_4 en un passage, puis poser a5_01 et relancer
TOUT_4 (test 44).

## Réponse au coordinateur (message de 17:40 UTC, retour de TOUT_1 et TOUT_2)

Corrections poussées sur `worker-a5` (commit indiqué dans le journal git,
TOUT*.sql régénérés) :

- **`tests.jeu()`** : le rôle du compte est pris dans l'ordre : `collaborateur`
  s'il est admis (enum ou contrainte CHECK), sinon la première valeur admise,
  sinon `collaborateur`. Ton patch de la recette est donc reporté.
- **`tests.inserer_minimal()`** lit désormais les contraintes CHECK
  mono-colonne (`tests.valeur_selon_check`) : `= ANY (ARRAY[...])` → première
  valeur ; `octet_length(col) = n` → n octets nuls ; une ou plusieurs regex
  `~ '...'` → premier candidat qui les satisfait toutes parmi `essai_a5`,
  `essai`, `filed_essai`, `essai.a5`, 64 zéros, 64 « a », … ; sinon la valeur
  par type (bytea : 32 octets par défaut). Cela couvre
  `journal_opposable_hash_check`, `envois_evenements_type_check`,
  `suivis_evenements_type_check`, `effacements_empreinte_export_check`, les
  regex de `filed_historique` et les bornes de longueur.
- **Test 05** : une table locataire sans politique est admise si
  `authenticated` n'a pas SELECT dessus ; le diagnostic liste ces tables.
  **Test 43** : même exemption.
- **Test 08** : rien à changer, c'était un vrai trou ; merci pour les lots
  19d/e/f. Consigné dans SECURITE.md §1.4 avec `lorani_echeances_permis` et
  `tamila_registre` sans RLS (analyse et requête pour trancher).
- Maquette locale durcie avec les contraintes réelles que tu m'as données
  (rôles, hash 32 octets, types d'événements, regex FILED, empreinte
  d'export, table interne sans politique) : 50/50 verts, `TOUT.sql` → 44 `ok`.
- Point à surveiller sur la recette : si les tests 11/12 passent mais que le
  test 32 échoue (« empreinte fournie remplacée »), c'est que l'insertion
  directe dans `journal_opposable` ne recalcule pas l'empreinte : la base
  compte sur la porte d'écriture. Dans ce cas, dis-moi le nom de la porte
  (fonction qui écrit au journal) et je ferai passer les tests 11, 12, 30,
  32–34 par elle.

Tu peux relancer TOUT_1 et TOUT_2, puis TOUT_3 et TOUT_4.

## Réponse au coordinateur (message de 16:34 UTC) — commit `2057897`

1. **TOUT.sql est prêt** : `omega/tests/socle/TOUT.sql` (63 Ko) enchaîne
   `00_installation.sql` puis les 44 tests hors DELETE et se termine par un
   seul `select * from runtests('tests'::name, '^test_')` : une ligne `ok` /
   `not ok` par test, détails en `#`. Si c'est trop gros pour un appel :
   `TOUT_1.sql` … `TOUT_4.sql` (8 + 12 + 12 + 12 tests, 13 à 19 Ko chacun),
   dans l'ordre, chacun avec son `runtests()`. Validé sur la maquette locale :
   `1..44`, 44 `ok`. Le `create extension if not exists pgtap` du début est
   sans effet puisque pgTAP est déjà posé.
   Les premiers échecs attendus sur la recette : `tests.jeu()` si
   `public.clients` n'a pas `id`/`nom` ou si `comptes` a d'autres colonnes
   obligatoires sans défaut (le message dit laquelle), et les tests 36–38 qui
   affichent les colonnes réelles dans leur diagnostic. Colle-moi la sortie
   TAP ici, je corrige dans l'heure qui suit la lecture.
2. Test 34 gardé.
3. Alignement : noté, tu t'en charges après A4 (socle_lot18 et lot19 ajoutés
   à la liste « à pousser » ci-dessous).
4. Advisors : j'attends `NOTES-COORDINATEUR.md` sur main ; SECURITE.md reste un
   attendu jusque-là.
5. Banc : les trois compléments sont posés (pièces 101 à 103, total 103,
   `verifier-banc.mjs` vert) : facture en USD d'un fournisseur étranger
   (pas de SIREN, ABA + SWIFT, autoliquidation, `total_ttc_eur`), facture
   d'acompte pure (30 % d'un devis, `acompte_sur`), note de frais d'un
   salarié (lignes TTC, six justificatifs en page 2, numérisée).

## Reçu du coordinateur à 16:09 UTC

GitHub est rétabli (la branche était déjà poussée : trois commits, dernier
`1f2585f`). Règle pour le SQL que je confie : jamais de DROP ni de DELETE,
l'outil bloque dessus. État de mes fichiers au regard de cette règle :

- `00_installation.sql` et les tests : uniquement `create or replace`,
  `create ... if not exists`, `grant`. Aucun DROP.
- **Six tests contiennent le mot DELETE** à l'intérieur d'une chaîne passée à
  `throws_ok()` : 17, 19, 21, 23, 25, 27 (« DELETE sur une table en ajout
  seul échoue »). C'est l'objet même du test, l'instruction doit lever une
  erreur et runtests() annule tout. Je ne contourne pas le filtre : si l'outil
  les bloque, les passer par une autre voie ou les laisser de côté ; les tests
  UPDATE (16, 18, 20, 22, 24, 26) et les tests de droits (28, 29) couvrent
  déjà le reste de la règle.
- Le test 34 fait `alter table public.journal_opposable disable trigger user`
  puis un UPDATE d'une empreinte, pour vérifier que `verifier_journal_client()`
  détecte l'altération ; le tout est annulé par runtests(). À signaler si
  l'outil s'en inquiète.
- `local/maquette.sql` et `local/lancer.sh` contiennent `drop` : ils ne
  servent qu'au cluster local jetable, jamais à la recette.

## Bloqué

1. **Outil Supabase** : chaque appel (`execute_sql`, `list_extensions`,
   `get_advisors`) est refusé pour cette session (« permission request
   aborted »). Conséquences : pgTAP non installé sur la recette, tests non
   lancés sur la recette, advisors de production non lus, corps des fonctions
   non lus, statements des migrations non lus.
2. **Message au coordinateur** (`send_message @parent`) : refusé par le
   classificateur de la session. Ce fichier est donc le seul canal. Les
   requêtes que j'aurais envoyées sont à la section « Demandes au
   coordinateur ».
3. **Advisors** : §3 de SECURITE.md est un attendu, pas un relevé.

## Demain

- Dès que pgTAP est posé sur la recette : lancer `00_installation.sql` puis
  les 50 fichiers, lire les diagnostics des tests 36–38 et de `tests.jeu()`,
  adapter les listes de colonnes candidates, retourner au vert.
- Avec la sortie réelle des advisors : remplacer le §3 de SECURITE.md par le
  relevé, priorisé, avec la migration `socle_lot18_hygiene_droits` prête.
- Avec le retour de la première exécution du workflow : ajuster la liste des
  extensions du Postgres d'essai et la liste des schémas dumpés.
- Banc : ajouter une facture en devise étrangère (USD, mention « équivalent
  EUR »), une facture d'acompte pure et une note de frais, si A1 en veut.
- Sauvegarde des buckets Storage (hors `pg_dump`) : à décider (§5 de
  SAUVEGARDE.md).

## Alignement des migrations (comparaison des deux `list_migrations`)

Communes aux deux projets : 73 migrations (socle lot 1 → 16, lorani, filed,
tavaro, tiroma, tamila m0/m10/m10b). Leur **ordre** diffère légèrement entre
les deux projets (par exemple `filed_lot1b_battement_par_moteur` passe avant
`tavaro_lot0b_referentiels` en prod, après en recette) : sans incidence si
elles sont indépendantes, à garder en tête si une migration en référence une
autre.

**Recette seulement — à pousser en production** (ordre de version) :

| Version | Nom | Ce qu'elle change |
|---|---|---|
| 20260929024032 | `tamila_m10_delais_correctifs` | correctifs des délais Tamila (contenu à lire : `statements` non accessibles à A5) |
| 20260929033851 | `tamila_m10b_porte_etroite` | porte étroite Tamila (idem) |
| 20260929034413 | `tiroma_releve` | relevé Tiroma (idem) |

**Recette seulement — à garder en recette** :

| Version | Nom |
|---|---|
| 20260928214838 | `daliro_m0a_referentiel` |
| 20260928222752 | `daliro_m0b_marches` |
| 20260929023244 | `daliro_m0c_planning` |
| 20260928221251 | `varelo_referentiel` |
| 20260928223335 | `varelo_referentiel_index` |
| 20260929033045 | `varelo_referentiel_perf` |

**Posées par le coordinateur** : 20261004220932 `socle_lot17_portes_ouvrier`,
puis `socle_lot18` et `socle_lot19` (posées le 5/10 d'après son message de
16:34 ; à pousser en prod avec les trois Tamila/Tiroma quand A4 aura fini).

**Recette** : 20260927153015 `base_existante` = l'écrasement des 61 migrations
historiques de la production (v1_2 → securite_fermer_appel_direct), qui
n'existent pas une à une en recette. Normal.

Pour remplir la colonne « ce qu'elle change » :

```sql
-- recette
select version, name, array_length(statements, 1) nb, left(array_to_string(statements, E'\n'), 2000)
from supabase_migrations.schema_migrations
where name in ('tamila_m10_delais_correctifs','tamila_m10b_porte_etroite','tiroma_releve','socle_lot17_portes_ouvrier')
order by version;
```

## Demandes au coordinateur (lecture seule, sauf le point 0)

0. Recette : `create extension if not exists pgtap with schema extensions;
   create schema if not exists tests;` puis lancer `omega/tests/socle/00_installation.sql`
   et les fichiers 01 → 50 (ou `select * from runtests('tests'::name, '^test_')`
   après les avoir tous chargés). Me coller la sortie TAP ici.
1. Production, contraintes de `private.sauvegardes` : `select conname,
   pg_get_constraintdef(oid) from pg_constraint where
   conrelid='private.sauvegardes'::regclass;` — pour confirmer les libellés
   `reussie`/`echouee` que le workflow écrit.
2. Production : la sortie complète de `get_advisors security` et
   `get_advisors performance`.
3. Production, fonctions de `private` exécutables par `authenticated` (requête
   §1.1 de SECURITE.md) et liste des fonctions publiques exécutables par
   `anon` (§2.3).
4. Production, signatures réelles : `private.lit_objet`, la porte de création
   d'envoi, la porte d'approbation, et les colonnes de `public.envois`,
   `public.oppositions`, `public.approbations` (ou équivalent) — pour figer
   les tests 36–38.
5. Confirmer que `postgres` lit `auth.*` et `storage.*` (sinon je retire ces
   schémas du dump).

## Ce que Teo doit poser

Dans GitHub, dépôt `pegase-site`, *Settings → Secrets and variables → Actions* :

- `SUPABASE_DB_URL` : URL **Session pooler** de `omega-core-eu` (port 5432,
  utilisateur `postgres.noepmkkplxshjbmqqxft`), ou mieux celle du rôle
  `sauvegarde` du §1.3 de SECURITE.md une fois créé.
- `SAUVEGARDE_PHRASE` : phrase longue générée, gardée aussi dans le
  gestionnaire de mots de passe de l'entreprise.

Puis *Actions → Sauvegarde de la base → Run workflow* une première fois, et
m'envoyer le résumé.

## Décisions prises seule (à contester si besoin)

- Chiffrement `gpg` symétrique plutôt que `age` : `age -p` exige un terminal
  pour la phrase ; `gpg --passphrase-fd` est scriptable. Même sécurité
  (AES-256, dérivation itérée).
- Le dump inclut `auth` et `storage` : sans `auth.users`, une restauration
  rend des comptes orphelins. Si les droits ne le permettent pas, on retire.
- Le verdict `reussie` exige l'égalité **exacte** des comptages : une table
  qui bouge pendant le dump (journal) peut créer un écart d'une ligne et un
  verdict `echouee` une nuit sur dix. Si cela arrive, passer à une tolérance
  sur les seules tables en ajout seul, pas sur les autres.
- Le banc commet 6,8 Mo de PDF dans le dépôt : A1 en a besoin tel quel.
