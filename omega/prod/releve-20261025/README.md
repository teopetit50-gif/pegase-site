# Relevé du 25/10/2026 — production et recette, par le connecteur Supabase (lecture seule)

Fait le 25/10/2026 entre 18 h 00 et 18 h 30 Z, sans aucune écriture. Sur la production, uniquement le catalogue
(`pg_catalog`, `supabase_migrations.schema_migrations`, `cron.job`, liste des fonctions Edge) : **aucune ligne de
table de client n'a été lue**. Aucune valeur de secret ni de jeton ici.

| Fichier | Contenu |
|---|---|
| `production.tsv` | Production `noepmkkplxshjbmqqxft` (omega-core-eu, eu-central-1, Postgres 17.6.1.155) : 5 290 objets |
| `recette.tsv` | Recette `ygwbgpowzlbdaajlsqkn` : 12 978 objets, à la même heure |
| `../releve.sql` | La requête (un seul SELECT) : `categorie<TAB>objet<TAB>md5 (12)` |
| `../comparer_releves.py` | La comparaison : `python3 omega/prod/comparer_releves.py production.tsv recette.tsv production recette --sans-site --detail` |

Catégories : fonction (empreinte de `pg_get_functiondef`), table (colonnes, défauts, RLS), contrainte, index,
déclencheur, vue, politique RLS (public, private, storage), publication Realtime, cron (planning + commande + actif),
droit (ACL par rôle des tables, vues, séquences, fonctions, schémas), droit par défaut, enum, extension (avec version)
et migration inscrite (md5 de `statements`). L'URL du projet est normalisée en `<projet>` avant le md5.

Le relevé `pg_dump` du 23/10 (`omega/prod/base/`, fait par Teo avec `relever-base.sh`) reste la base de la répétition :
la production n'a pas bougé depuis (144 migrations, dernière `20261009144206 omega_contacts_v1`, 27 crons).

## 1. Production : ce qu'elle a

| Catégorie | Production | Recette |
|---|---|---|
| migrations inscrites | 144 (01/08 → 09/10) | 530 (27/09 → 25/10) |
| tables | 227 | 425 |
| fonctions | 770 | 2 639 |
| politiques RLS | 248 | 530 |
| publication Realtime | **0 table** | 46 tables |
| crons | 27 | 93 |
| fonctions Edge | **1** (`routes-site` v3) | 27 |
| extensions | moddatetime, pg_cron 1.6.4, pg_net 0.20.4, pg_stat_statements, pgcrypto, supabase_vault, unaccent, uuid-ossp | pg_cron, pg_net, pg_stat_statements, pgcrypto, pgtap, supabase_vault, uuid-ossp, wrappers |

### Aucune migration en commun, par le numéro

Les deux historiques sont étrangers l'un à l'autre : la production a posé le socle 1 → `tavaro_lot2a2_reseau` sous
d'autres numéros de version (73 noms communs, 23 dont le texte diffère), et la recette part de `base_existante`.
L'export ne rejoue donc **jamais** `db push` sur l'historique : chaque fichier est posé par `psql`, et c'est le
catalogue (pas `schema_migrations`) qui prouve l'état.

### Ce que la production a et la recette n'a pas : le site omegaai.fr d'avant Omega (à garder tel quel)

71 migrations propres à la production (v1_2 → v3_0, comptes clients, Stripe, grille de prix, réservation d'audit,
veille YouTube, sécurité, `omega_interne_v1` → `omega_contacts_v1` du 09/10). Elles portent **63 tables, 6 vues et
33 fonctions** que la recette n'a pas, dont celles que le site appelle aujourd'hui :
`reserver_audit_serveur`, `commander_site`, `mes_commandes_site`, `demander_abonnement`, `poser_abonnement_stripe`,
`confirmer_paiements`, `agenda_public`, `omega_est_admin`, `veille_upsert_*`, les tables `commandes_site`,
`reservations`, `demandes_abonnement`, `stripe_evenements`, `omega_prospects`, `omega_contacts`, `omega_pages`…
Plus, sur des tables communes : 65 index (dont `demandes_audit_stripe_*`), la politique `catalogue_site."catalogue
public"`, les politiques Storage `brief : lit son dossier` / `brief : retire de son dossier`, la contrainte
`filed_factures_statut_check`, le déclencheur `profils_metier.trg_maj_le`, les extensions `moddatetime` et `unaccent`.

**Aucun fichier de l'export ne crée, ne supprime ni ne renomme ces objets** (vérifié par nom). Trois lots touchent
les droits de tout le schéma `public` ; leur effet sur ces objets est à lire dans le résultat de la répétition
(RUNBOOK, § risques) : 19e (`revoke truncate, references, trigger on all tables in schema public from anon,
authenticated` : sans effet sur le site), 19k (ajoute à `authenticated` les droits de table qu'une politique
suppose : peut **élargir** une table du site), a5_01 (exécution des fonctions de `private` seulement).

### Ce qui diffère sur les objets communs (avant pose)

15 tables (`approbations`, `envois`, `envois_evenements`, `filed_factures`, `filed_fournisseurs`, `filed_historique`,
`filed_reglages`, `loc_factures`, `loc_reglages`, `lorani_permis`, `lorani_projets`, `reglages_envois`,
`regles_validation`, `tamila_reglages`, `demandes_validation`), 45 fonctions, 633 droits, 3 droits par défaut
(`postgres public` S, f, r), 2 contraintes. Attendu : ce sont les lots postérieurs au 29/09 qui les changent ; la
répétition dit si la séquence les amène bien à l'état de la recette.

## 2. Fonctions Edge de la recette, et le SHA de ce qu'elles exécutent

Lu par `get_edge_function` le 25/10. « Coquille » : `index.ts` importe le fichier du dépôt à ce SHA.
« Paquet » : sources complètes déployées par le bureau, SHA retrouvé en comparant chaque fichier au dépôt.

| Fonction | Recette | verify_jwt | Code exécuté (SHA, branche) | Pour la production |
|---|---|---|---|---|
| `lecteur` | v70, paquet | true | `2f21e987b5281dbc10fde3efa69faabc0fae1395` (worker-a1 ; 41 fichiers identiques, `SHA_PAQUET = "2f21e98"`) | oui |
| `lecteur-exports` | v26, coquille | true | `d963121419b014081fc5155c8e01151b8fd76deb` (worker-a1) | oui |
| `expediteur` | v39, coquille | true | `d1dd58ce53ea8149c6fb212a1f292b0911fc523c` (worker-a2) | oui |
| `webhooks-brevo` | v34, coquille | false | `87a1112` (worker-a2) — SHA court : passer le SHA complet | oui |
| `reception` | v36, coquille | false | `b69423f6bb319b5ff7c5fa00c0866dd47a22e0d6` (worker-a2) | oui |
| `messagerie` | v20, coquille | true | `53acbbca979fba9e91a336cecfee68067f78d36f` (worker-a2) | si Gmail/Microsoft en production |
| `messagerie-oauth` | v21, coquille | false | `d1dd58ce53ea8149c6fb212a1f292b0911fc523c` (worker-a2, `entree_oauth.ts`) | idem |
| `widget` | v24, coquille | false | `de501c4515da12be73edd77f635fd53b213c8083` (worker-a2) | oui |
| `webhooks-ar24` | v24, coquille | false | `8c0e6083b51a998fd590d78141f1538f857bbb80` (worker-a2) | si AR24 en production |
| `identite` | v28, coquille | true | `4ed0bffda63e1089ed20d81a46d29edcd0b86b3b` (worker-b7) + `_partage` `7425991` | oui |
| `taux-bce` | v24, coquille | true | `67fd7ff845385671ad916666ed1f52c3a264ae59` (worker-b7) + `_partage` `7425991` | oui |
| `sortie` | v24, coquille | true | `4e2a2246a1099613c264d6f295c7c6e180afa5be` (worker-a4) | oui |
| `alertes-quotidiennes` | v24, coquille | true | `42ee9db05e1cf2845e9f35152d32d9fc33c68ff3` (worker-a5) | oui |
| `export-complet` | v25, coquille | true | `66524c9292b8ee7034cda557c4f531717f62078c` (worker-a5) | oui (sans `export_origines_recette`) |
| `tamila-coffre` | v26, coquille | true | `bb7ea12214e4f230540619f05e1348e93a0cf0ac` (worker-b4) | si Tamila en production (Scaleway KM) |
| `tamila-purge` | v26, coquille | true | `18e61bc190945a290e9447fe5510ebdb79e748fc` (worker-b4) | idem |
| `tavaro-pdf` | v25, coquille | true | `6ea1694` (worker-b2) — SHA court | si Tavaro en production |
| `tavaro-questions` | v25, coquille | true | `dcd98d50925a763f556368d13c5e4d21ab8d2b85` (worker-b2) + `_partage` `9e4cdfd4` | idem |
| `varelo-assistant` | v24, coquille | true | `b62f7dd213b9c4d949783e8e86385ae41b28f88c` (worker-b1) | si Varelo en production |
| `daliro-questions` | v24, coquille | true | `6c6ab1100b72200344dc3c35d6a3f9bd1152a203` (worker-b6) + `_partage` `9e4cdfd4` | si Daliro en production |
| `reput-reponse` | v30, paquet | true | `0ea5e540` (worker-c3 ; 13 fichiers identiques). **En retard** : c3_43, posé le 25/10, va avec `8c882b8e` (consigne neutre) | oui, à **`8c882b8e`** après redéploiement sur la recette |
| `reput-astreinte` | v3, paquet | false | `0ea5e540` (worker-c3) | oui |
| `reput-appels` | v6, paquet | false | code inchangé depuis `c1509307` (worker-c3) ; prendre `8c882b8e` | si Twilio en production |
| `echange-pa` | v26, coquille | true | `21466c7b` (worker-a2), **entrée `recette.ts`** (bac à sable) | **non** tant que la plateforme agréée n'est pas choisie |
| `pa-bac-a-sable` | v24 | false | bac à sable de la plateforme agréée | **non** (recette seulement) |
| `depot` | v24 | false | outillage de pose depuis le dépôt | **jamais** |
| `brevo-inbound-installer` | v30 | true | désactivée (410), webhook 2225428 déjà posé | **non** |

**Production aujourd'hui** : `routes-site` v3 (verify_jwt false) seulement. Aucune des fonctions ci-dessus n'y est.

## 3. Crons

- **Production** : 27 tâches SQL (`omega/prod/base/03_crons.sql`), toutes présentes à l'identique sur la recette
  (même planning, même commande). Aucune n'appelle une fonction Edge.
- **Recette** : 93 tâches. L'export en crée 50 ; 4 appellent une fonction Edge et sont **réécrites vers la
  production** par l'assembleur (`omega-lecteur`, `omega-expediteur` dans 19b/18d ; `omega-identite` 19v ;
  `omega-lecteur-exports` 19aa). Les crons inactifs de la recette restent hors champ.
- **16 tâches de la recette ne sont créées par aucun fichier de l'export** (posées à la main par le coordinateur ou
  le bureau, ou par un lot sans ligne `schema_migrations`) :
  - 11 appellent une fonction Edge par `net.http_post` sur l'URL de la recette, avec le secret Vault `cle_service`
    (`reput_astreinte_jeton` pour l'astreinte) : `omega-reput` (*), `omega-reput-astreinte` (*),
    `omega-sortie` (*), `omega-tavaro-pdf` (*), `omega-tavaro-questions` (*), `daliro-questions` (*),
    `omega-messagerie` (*), `omega-echange-pa` (*), `omega-tamila-purge` (*/5),
    `omega-taux-bce` (35 14,15 * * 1-5), `omega-alertes-quotidiennes` (17 6 * * *) ;
  - 5 sont du SQL : `daliro-matin` (*/30, `private.btp_deposer_points()`, lot b6_15), `tavaro-avis` (5 6 * * *,
    `private.loc_surveiller_avis()`, b2_03), `tavaro-avis-conservation` (25 3 * * *,
    `private.loc_effacer_designations()`, b2_04), `varelo-contrats` (17 5 * * *,
    `private.grp_controler_contrats_tous()`, b1_05), `taux-bce-veille` (0 17 * * 1-5, `public.taux_bce_veiller()`).
    Leurs lots ne sont **pas** dans `schema_migrations` de la recette : voir le RUNBOOK, § « lots sans ligne ».

## 4. Réglages globaux de la recette (`private.reglages`, valeurs sans secret)

À poser autrement en production :
- `environnement = recette` → `production` (fait par le dernier fichier de l'export) ;
- `reput_reponse_url = https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/reput-reponse` (posé à la main le
  22/10, pas dans l'export) → l'URL de production ;
- `export_origines_recette = http://localhost:3010` : recette seule, ne pas poser ;
- `espace_url = https://app.omegaai.fr/espace` : à confirmer (l'espace client de Teo est `omegaai.fr/espace2`) ;
- `alertes_secret_resend` (14 caractères) : un secret rangé dans une table ; en production, valeur à poser par Teo.
