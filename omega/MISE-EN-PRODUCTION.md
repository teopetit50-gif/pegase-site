# Mise en production d'Omega — dossier de passage

Préparé par A5 (garde-fous), 6 octobre 2026, à la demande du coordinateur.
**Rien n'est posé par ce document.** La production (`noepmkkplxshjbmqqxft`) n'a
été ni lue ni touchée ; l'inventaire vient du dépôt (main, `worker-a1`, `worker-a2`,
`worker-a4`, `worker-a5`) et du journal `omega/NOTES-COORDINATEUR.md`.

Recette de référence : `ygwbgpowzlbdaajlsqkn`. Les cases « à confirmer » attendent
les quatre sorties brutes demandées au coordinateur (§ 8).

---

## 0. Trois constats avant tout

1. **Une bonne moitié de ce qui est posé sur la recette n'existe pas en fichier.**
   Les lots du socle 17, 18a–d, 19a à 19aa (hors 19ab), 19ac à 19ae, le Realtime de
   `filed_fournisseurs` (20261006134231) et les migrations de base de Tamila, Tiroma,
   Varelo et Daliro ont été posés par `execute_sql` : leur texte n'est que dans
   `supabase_migrations.schema_migrations.statements` de la recette. **Étape 1 du plan :
   les exporter en fichiers dans le dépôt**, sinon la production ne peut pas être
   reproduite ni relue.
2. **La « pose depuis le dépôt » ne doit pas aller en production.**
   `private.depot_demander` / `private.depot_executer` exécutent du SQL téléchargé
   depuis GitHub : en production, c'est une porte d'exécution de code à distance.
   Même chose pour `private.tests_en_tache` (19ac) et `private.tester_sans_trace`
   (19ae). La production se pose autrement (§ 1.4).
3. **Faire une répétition générale avant la production.** On rejoue tout le plan
   sur une copie de la production : une branche Supabase, ou la restauration de la
   sauvegarde de la nuit dans un projet jetable. On y passe les suites pgTAP
   complètes. Ensuite seulement, on rejoue le même plan, à l'identique, sur la
   production. La production ne reçoit que des contrôles en lecture seule (§ 4).

---

## 1. Inventaire ordonné des migrations

### 1.1 Règle d'ordre

L'ordre de vérité est **l'ordre des versions de la recette** (`schema_migrations`) :
chaque lot y a été posé sur l'état laissé par le précédent, et plusieurs corps sont
réécrits « par repère » (19ab, a4_11, b5_05…) — rejoués dans un autre ordre, ils
s'arrêtent (sans rien changer, c'est voulu) ou, pire, réécrivent une version
périmée. L'ordre ci-dessous est celui que donnent les notes ; il sera recalé ligne
par ligne sur la sortie n° 1 du coordinateur.

Chaque fichier se pose **dans une transaction** : il passe en entier ou rien.

### 1.2 Ce que la production a déjà

D'après la comparaison des deux `list_migrations` du 5 octobre (NOTES-A5,
« Alignement ») : les 61 migrations historiques (la recette les a écrasées en
`base_existante`) et 73 migrations communes (socle lots 1 → 16, lorani, filed lots
1–3, tavaro, tiroma, tamila m0). **À confirmer** par la sortie n° 2 : rien n'a été
posé en production depuis.

### 1.3 Ce qui doit y aller, dans l'ordre

Légende de la colonne Source : **fichier** = chemin dans le dépôt + SHA du dernier
commit qui le touche ; **recette seule** = à exporter d'abord (constat 1).

**Étape A — bases des modules absentes de la production**

| # | Version (recette) | Nom | Source |
|---|---|---|---|
| A1 | 20260928214838 | `daliro_m0a_referentiel` | recette seule |
| A2 | 20260928221251 | `varelo_referentiel` | recette seule |
| A3 | 20260928222752 | `daliro_m0b_marches` | recette seule |
| A4 | 20260928223335 | `varelo_referentiel_index` | recette seule |
| A5 | 20260929023244 | `daliro_m0c_planning` | recette seule |
| A6 | 20260929024032 | `tamila_m10_delais_correctifs` | recette seule |
| A7 | 20260929033045 | `varelo_referentiel_perf` | recette seule |
| A8 | 20260929033851 | `tamila_m10b_porte_etroite` | recette seule |
| A9 | 20260929034413 | `tiroma_releve` | recette seule |

Le 5 octobre, Daliro et Varelo étaient notés « à garder en recette ». Les deux
modules sont maintenant livrés (écrans en ligne) : leurs bases partent donc.
**Décision de Teo à confirmer.**

**Étape B — socle, avant les modules de la vague 2**

| # | Nom | Contenu (résumé) | Source |
|---|---|---|---|
| B1 | `socle_lot17_portes_ouvrier` (20261004220932) | `prendre_travaux`, `battre_ouvrier` | recette seule |
| B2 | `socle_lot18a` … `18d` | `receptions`, `resoudre_boite`, `deposer_reception`, `noter_remise` à 6 arguments | recette seule |
| B3 | `socle_lot19a` | `regles_validation`/`demandes_validation` : `exige_*` ; `approbations.piece_id` ; `public.annuaire` | recette seule |
| B4 | `socle_lot19b` | portes du lecteur (`piece_a_lire`, `consommation_ia_jour`, `lire_parametre`), réglage `plafond_ia_jour_client` = 5, crons `omega-lecteur` et `omega-expediteur`, politique Storage SELECT `omega-clients`. **Sans** `create extension pgtap` (voir § 3) | recette seule |
| B5 | `socle_lot19c` | `preparer_approbation` refuse le déposant | recette seule |
| B6 | `filed_lot4a` … `4g`, `5a`, `6a` | `omega/migrations/a4_01` → `a4_09` (voir étape C) | fichiers |
| B7 | `socle_lot19d` | revoke des droits par défaut (dont les 20 tables FILED des lots 4–6 : **après B6**) | recette seule |
| B8 | `socle_lot19e`, `19f` | TRUNCATE/REFERENCES/TRIGGER retirés ; INSERT/UPDATE d'anon retirés | recette seule |
| B9 | `socle_lot19g` | plages SMS/WhatsApp 08:00–20:00 lun–sam | recette seule |
| B10 | `socle_lot19h`, `19n`, `19x`, `19y`, Realtime `filed_fournisseurs` (20261006134231) | publication `supabase_realtime` (validations, FILED, Varelo, Lorani, Tiroma, Tavaro, fournisseurs) | recette seule |
| B11 | `socle_lot19k`, `19l` | GRANT pour chaque politique visant authenticated ; revoke des écritures sans politique | recette seule |
| B12 | `socle_lot19m`, `19o`, `19p` | politiques Storage INSERT des membres ; vue `tamila_registre` (anon sans rien) | recette seule |
| B13 | `socle_lot19v`, `socle_lot19aa` | crons `omega-identite` et `omega-lecteur-exports` (après le déploiement des fonctions, § 2) | recette seule |
| B14 | `socle_lot19i` | Brevo `branche = true` dans `private.fournisseurs_envoi` : **seulement quand les secrets Brevo de production sont posés** (§ 2) | recette seule |

**Étape C — FILED (A4), dans l'ordre des numéros**

| # | Fichier (`worker-a4`) | SHA | Lot recette |
|---|---|---|---|
| C1 | `omega/migrations/a4_01_filed_lot4a_comptabilite_tables.sql` | 1500b1a | filed_lot4a |
| C2 | `omega/migrations/a4_02_filed_lot4b_comptabilite_portes.sql` | 1500b1a | filed_lot4b |
| C3 | `omega/migrations/a4_03_filed_lot4c_charges_recurrentes.sql` | 2ea2cc1 | filed_lot4c |
| C4 | `omega/migrations/a4_04_filed_lot4d_controles_identite.sql` | 1500b1a | filed_lot4d |
| C5 | `omega/migrations/a4_05_filed_lot5a_archivage_probant.sql` | 1500b1a | filed_lot5a |
| C6 | `omega/migrations/a4_06_filed_lot6a_pilotage.sql` | 1500b1a | filed_lot6a |
| C7 | `omega/migrations/a4_07_filed_lot4f_circuit_validation.sql` | 1500b1a | filed_lot4f |
| C8 | `omega/migrations/a4_08_filed_lot4e_branchements.sql` | 2ea2cc1 | filed_lot4e |
| C9 | `omega/migrations/a4_09_filed_lot4g_acquittement_alerte.sql` | 55af068 | filed_lot4g |
| C10 | `omega/migrations/a4_10_filed_lot7_identite_fournisseur.sql` | 316697e | filed_lot7 |
| C11 | `omega/migrations/a4_11_filed_lot7_controler_facture_complet.sql` | 179fd13 | (corps complet, remplace le patch de a4_10) |
| C12 | `omega/migrations/a4_12_filed_lot7_a_confirmer_non_levable.sql` | 18578a3 | |
| C13 | `omega/migrations/a4_13_filed_lot7_demandeur_systeme_iban.sql` | 5f6aa66 | |
| C14 | `omega/migrations/a4_14_filed_lot7_cle_valeurs_humaines.sql` | cf4c3af | |
| C15 | `omega/migrations/a4_15_filed_lot8_paiements.sql` | 634fe24 | |

C1–C9 se posent **à la place B6** (avant 19d). C10–C15 vont avant B7 Identité (étape D) :
`identite_b7_01` v3 suppose la contrainte `filed_fournisseurs_identite_source` d'a4_10.

**Étape D — modules de la vague 2 (fichiers sur main)**

| # | Fichier | SHA |
|---|---|---|
| D1 | `omega/modules/identite/migrations/b7_01_portes.sql` | 9032537 |
| D2 | `omega/modules/identite/migrations/b7_02_demander.sql` | 4d0f61b |
| D3 | `omega/modules/identite/migrations/b7_03_balayer.sql` | 8145532 |
| D4 | `omega/modules/varelo/migrations/b1_01_portes_roles.sql` | b287d04 |
| D5 | `omega/modules/varelo/migrations/b1_02_portes_authenticated.sql` | b287d04 |
| D6 | `omega/modules/varelo/migrations/b1_03_proposer_nom_unique.sql` | 3860e00 |
| D7 | `omega/modules/tavaro/migrations/b2_01_separation_saisie_approbation.sql` | e6d991a |
| D8 | `omega/modules/tavaro/migrations/b2_02_relances_factures.sql` (cron `tavaro-relances` 09:15 UTC) | e6d991a |
| D9–D19 | `omega/modules/tiroma/migrations/b3_01` → `b3_11` (b3_06 : cron `tiroma-matin` */30) | 7d13c1a, b287d04, e6d991a, 7d13c1a, 7d13c1a, e6d991a, b287d04, b287d04, b287d04, e6d991a, 9a183b1 |
| D20–D23 | `omega/modules/tamila/migrations/b4_01` → `b4_04` | b287d04 |
| D24–D32 | `omega/modules/lorani/migrations/b5_01` → `b5_09` | 7d13c1a ×3, b287d04, ea53b85, fcd1b1a, a4e3197, 8b9ebbc, fbf4c98 |
| D33–D39 | `omega/modules/daliro/migrations/b6_01` → `b6_07` (b6_02 : cron `daliro-confirmations-j2` 15:00 ; b6_06 : cron `daliro-ouvrier` chaque minute) | d572973 ×4, daab913, 697c580, b3bd323 |

Dépendances relevées dans les fichiers :
- b6_03 référence `filed_factures`, donc FILED (étape C) passe avant ;
- b2_01 s'appuie sur `preparer_approbation` de 19c (B5) ;
- b5_03 et b6_06 passent par `preparer_envoi` ;
- b3_06 et b3_10 supposent `private.verrous_envoi` (lot socle).

**Étape E — socle après les modules**

| # | Fichier | SHA | Remarque |
|---|---|---|---|
| E1 | `omega/modules/socle/migrations/19ab_sante_envois.sql` | 6b9c88d | réécrit `verrous_envoi` et `commencer_envoi` par repère ; s'arrête sans rien changer si le corps de production diffère |
| E2 | `omega/migrations/a5_01_private_execute.sql` (`worker-a5`) | db8fb41 | **toujours en dernier**, et à rejouer après tout lot futur. Calcule les fonctions de `private` requises, retire EXECUTE à public/anon/authenticated, le rend à la liste, donne tout à service_role, pose les droits par défaut globaux. Idempotente ; elle s'arrête par exception si anon exécute encore quelque chose |
| E3 | `omega/migrations/a5_01_liste_requises.sql` | db8fb41 | lecture seule : la liste à comparer à `omega/a5_01_liste_figee.txt` et à la recette (221 fonctions le 6/10) |

**Lots de la recette absorbés par a5_01 (E2) — ne pas les rejouer un par un :**
`socle_lot19j` (EXECUTE à service_role), `19r` (fonctions de déclencheur, inutile),
`19s`, `19t`, `19u` (clause WHEN), `19w`, `19z`. Le test 44 (§ 4) prouve que E2 les
couvre.

### 1.4 Comment poser en production

- **Pas** de `depot_demander` / `depot_executer` (constat 2).
- **Pas** d'`execute_sql` fichier par fichier : l'outil bloque sur le mot
  `delete`, et les migrations en contiennent (`on delete cascade`, déclencheurs
  `before … or delete`).
- **Ce que je conseille** : un dossier `supabase/migrations/` (ou
  `omega/prod/migrations/`), avec un fichier par ligne des étapes A à E. Il se
  remplit avec les fichiers du dépôt, et pour les lots « recette seule » avec leurs
  `statements` exportés. Teo (ou une session autorisée) pose ensuite :
  `supabase link --project-ref noepmkkplxshjbmqqxft`, puis
  `supabase db push --dry-run`, relu, puis `supabase db push`.
  Les 61 + 73 versions déjà en production doivent figurer dans l'historique local
  (`supabase migration repair --status applied <version>`), sinon `db push` veut
  les rejouer.
- Figer un **tag** du dépôt (`prod-AAAA-MM-JJ`) après la fusion de `worker-a4` et
  `worker-a5` dans main. Tous les SHA ci-dessus deviennent alors un seul point de
  vérité.

---

## 2. Fonctions Edge

Méthode inchangée : une « coquille ». `index.ts` importe
`https://raw.githubusercontent.com/teopetit50-gif/pegase-site/<SHA complet>/omega/functions/<nom>/index.ts`,
et `deno.json` sert d'`import_map_path` (obligatoire). Chaque coquille est **figée
sur un SHA**.

| Fonction | SHA (branche) | Version recette | verify_jwt | Secrets (noms seuls) | Cron |
|---|---|---|---|---|---|
| `lecteur` | 0d54731 (`worker-a1`) | v17 | true | **Production : Bedrock** (décision de Teo, données en UE) : `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (eu-central-1), `BEDROCK_MODEL_ID` ; **pas** d'`ANTHROPIC_API_KEY`. Facultatifs : `MISTRAL_API_KEY`, `PLAFOND_IA_JOUR_CLIENT_EUR` | `omega-lecteur` `* * * * *` (19b) |
| `lecteur-exports` | d963121 (`worker-a1`) | v2 | true | aucun en plus de ceux de Supabase | `omega-lecteur-exports` `* * * * *` (19aa) |
| `expediteur` | 67f9cf6 (`worker-a2`) | v12 | true | `BREVO_API_KEY` | `omega-expediteur` `* * * * *` (19b) |
| `webhooks-brevo` | 87a1112 (`worker-a2`, dernier commit de `omega/functions/webhooks`) | v1 | **false** (jeton vérifié dans la fonction) | `BREVO_WEBHOOK_JETON` | aucun ; webhook Brevo *Transactionnel* → `/functions/v1/webhooks-brevo` |
| `reception` | 4114a69 (`worker-a2`, dernier commit de `omega/functions/reception`) | v1 | **false** | `BREVO_WEBHOOK_JETON`, `BREVO_API_KEY`, `META_VERIFY_TOKEN`, `META_APP_SECRET`, `META_ACCESS_TOKEN`, `FORMULAIRE_SECRET`, `FORMULAIRE_BOITE` | aucun ; domaine inbound Brevo → `/functions/v1/reception/brevo` |
| `identite` | e77fabb (main ; code au 7035cb2) — **à confirmer** | v2 | true | `SIRENE_API_KEY` (facultatif : repli recherche-entreprises), `IDENTITE_CACHE_JOURS` (30), `IDENTITE_BALAYAGE_JOURS`, `IDENTITE_BALAYAGE_MAX` | `omega-identite` `* * * * *` (19v) |

Communs à toutes : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (fournis par
Supabase). **Vault** de production : le secret `cle_service`, lu par chaque cron qui
appelle une fonction. Sans lui, les crons tournent mais les fonctions répondent 401.

Ordre de déploiement :
1. Les fonctions, d'abord sans cron.
2. Les secrets.
3. Un appel à la main de chaque fonction (200, battement écrit).
4. Les crons, aux étapes B4 et B13.

`webhooks-brevo` et `reception` répondent 503 tant que leurs secrets manquent :
c'est voulu.

### 2.1 Crons SQL (sans fonction Edge)

Sur la recette au 5/10 au soir (`SOCLE-EXTRAITS-COMMUN.sql`), 34 crons :
`omega-*` (chien de garde, contrôle des délais, envois, filed, mesure, points ×3,
purges ×5, relevés ×2, suivis, `omega-verifier-sauvegardes`), `daliro-referentiel`,
`lorani-calendrier`, `lorani-lectures`, `tamila-*` (×3), `tavaro-*` (×4),
`tiroma-*` (×3), `varelo-referentiel*` (×3). Depuis : `tavaro-relances`,
`tiroma-matin`, `daliro-confirmations-j2`, `daliro-ouvrier`, `omega-identite`,
`omega-lecteur-exports`.

**À confirmer** par la sortie n° 3 :
- lesquels existent déjà en production ;
- lesquels viennent des migrations de base de l'étape A.

**À ne pas emporter** : toute tâche `tests_*` ou nommée d'après un lot de tests
(19ac).

---

## 3. Ce qu'il ne faut PAS emporter

| Objet | Où | Pourquoi |
|---|---|---|
| Client du banc `cccccccc-0000-4000-8000-00000000000c` « Groupe Sogexal (banc) », ses entités, sociétés Varelo, chantiers, dossiers Tamila `BANC-*`, permis Lorani, factures (FAC-2026-10-0471, FA-2026-000001/2), envois, journal | données recette | données d'essai ; elles ne passent jamais par une migration, rien à faire sauf ne pas les copier |
| Comptes `gerant@`, `referent@`, `daf@`, `daf2@banc-varelo.test` (mot de passe de recette) | `auth.users` recette | comptes de test |
| `banc_lot19q` (territoire de l'entité du banc) | recette seule | donnée du banc |
| Lignes `reglages_envois` du banc (tavaro, lorani, tiroma, daliro en mode `essai`, adresse de Teo) | données recette | en production, chaque client est réglé à l'installation : mode `coupe` ou `essai` d'abord, `reel` sur décision écrite. Aucune ligne copiée |
| Scripts `omega/recette-a3`, `recette-b1` … `recette-b6`, `omega/banc/`, `banc_01_parcours_reel.sql` (B2), `banc_j2_reel.sql` (B6), `b6_00_jeu.sql` | dépôt | outils de recette, jamais exécutés en production |
| Schéma `tests`, fonctions `tests.*`, `omega/tests/**`, extension `pgtap` | recette | ne s'installent en production que **dans une transaction annulée** (§ 4.2) |
| `private.sorties_tests`, `private.tests_en_tache` (19ac), `private.tester_sans_trace` (19ae) | recette seule | outillage de test |
| `private.depot_demander`, `private.depot_executer` | recette seule | exécution de SQL distant (constat 2) |
| Schéma `scories` (`zz_essai_lot18*`), réception d'essai `receptions` id 1 | recette | scories |
| Fournisseur d'envoi agréé santé | `private.fournisseurs_envoi` | rester à `agree_sante = false` partout tant que Teo n'a pas la preuve HDS (§ 6) |
| `ANTHROPIC_API_KEY` | secrets Edge | recette seulement (données hors UE) ; Bedrock en production |
| Modèles d'essai à blanc `lecteur-exports/modeles/*.json`, `lecteur/banc/` | dépôt | jamais déployés : la coquille n'importe que `index.ts` et ce qu'il importe |

---

## 4. Contrôles après chaque étape

### 4.1 Sur la répétition (copie de la production)

Après chaque étape A à E, et sur la copie seulement :
1. `00_installation.sql`, puis les suites pgTAP.
2. Socle (`omega/tests/socle/TOUT_1..4.sql`, **54 tests**, `worker-a5`) ; `19ab_sante_envois.sql`.
3. FILED (`a4_*`).
4. Modules `^test_b1_` … `^test_b7_`, avec les décomptes de la recette du 6/10 comme
   attendus : Varelo 14/14, Tavaro 11/11, Tiroma 12/12, Tamila 13/13, Lorani 120/120,
   Daliro 154 + 38 + 29, Identité 10/10.

### 4.2 Sur la production — lecture seule

Après chaque étape :

```sql
-- Garde-fou 1 : EXECUTE sur private (attendu après E2 : anon 0 ; authenticated = le nombre de la répétition ; service_role = tout)
select r.rolname,
       count(*) filter (where has_function_privilege(r.rolname, p.oid, 'execute')) as executables,
       count(*) as total
from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'private'
cross join (values ('anon'), ('authenticated'), ('service_role')) r(rolname)
group by r.rolname;

-- Garde-fou 2 : toute politique de public visant authenticated a son GRANT (attendu : 0 ligne)
select p.tablename, p.policyname, p.cmd
from pg_policies p
where p.schemaname = 'public' and 'authenticated' = any (p.roles)
  and p.cmd <> 'ALL'
  and not case when p.cmd = 'DELETE' then has_table_privilege('authenticated', format('public.%I', p.tablename), 'DELETE')
               else has_any_column_privilege('authenticated', format('public.%I', p.tablename), p.cmd) end;  -- droits par colonne admis (tamila_cles), comme le test 51

-- Garde-fou 3 : aucune écriture d'anon sur une table de public (attendu : 0 ligne)
select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
where c.relkind in ('r', 'p', 'v')
  and (has_table_privilege('anon', c.oid, 'INSERT') or has_table_privilege('anon', c.oid, 'UPDATE')
       or has_table_privilege('anon', c.oid, 'DELETE') or has_table_privilege('anon', c.oid, 'TRUNCATE'));

-- Garde-fou 4 : RLS active sur toute table locataire (attendu : 0 ligne)
select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
join pg_attribute a on a.attrelid = c.oid and a.attname = 'client_id'
where c.relkind = 'r' and not c.relrowsecurity;

-- Crons : aucun échec depuis l'étape (attendu : 0 ligne)
select j.jobname, d.status, d.return_message, d.start_time
from cron.job_run_details d join cron.job j on j.jobid = d.jobid
where d.start_time > now() - interval '15 minutes' and d.status <> 'succeeded';
```

À compléter à chaque étape :
- **Advisors** : `get_advisors security` et `get_advisors performance`. Aucune
  nouvelle alerte de niveau ERROR par rapport au relevé d'avant l'étape.
- **Après le § 2** : les battements des ouvriers sont frais (moins de 2 minutes) ;
  chaque fonction répond 200 à un appel avec la clé de service.
- **Sur la production, en dernier recours** : les tests structurels du socle (02–08,
  28–29, 42–46, 51, 44, 52–53) peuvent tourner **dans une seule transaction
  annulée** : `begin;` puis `00_installation.sql`, les fonctions de test,
  `runtests()` et `rollback;`. pgTAP, le schéma `tests` et toutes les données d'essai
  disparaissent avec le `rollback`. Le cas échéant, c'est au coordinateur de le
  lancer.

---

## 5. Retour arrière, étape par étape

**Avant chaque étape**, on garde de quoi revenir en arrière :
1. La sauvegarde du workflow `omega-sauvegarde`, lancée à la main, avec le verdict
   `reussie` exigé (voir `omega/docs/SAUVEGARDE.md`).
2. Un `pg_dump --schema-only` de `public` et `private`.
3. Pour l'étape suivante, la définition actuelle de chaque fonction qu'elle remplace
   (`pg_get_functiondef`) et l'état des droits (`aclexplode`). Ce relevé se fait sur
   la répétition, qui a le même état de départ.
4. Si le plan Supabase le permet, PITR actif.

| Étape | Retour arrière |
|---|---|
| Un fichier qui échoue | rien à faire : la transaction est annulée, rien n'est posé. On corrige sur la répétition et on rejoue |
| A, C, D (tables et portes nouvelles) | désactiver ce qui agit : `cron.alter_job(jobid, active := false)` pour les crons du lot, `revoke execute` sur les portes publiques du lot pour anon/authenticated. Les tables restent, vides et inertes (pas de DROP : l'outil le refuse, et une table vide ne nuit pas). Les fonctions remplacées sont rejouées depuis le relevé fait avant l'étape |
| B (droits, Realtime, Storage) | rejouer l'inverse, généré avant l'étape à partir du relevé `aclexplode` / `pg_publication_tables` / `pg_policies` de `storage.objects` |
| B4, B13, D8, D19, D35, D38 (crons) | `cron.alter_job(…, active := false)` |
| E1 (19ab) | rejouer les deux corps relevés (`verrous_envoi`, `commencer_envoi`) |
| E2 (a5_01) | ne pas annuler : un manque se corrige en ajoutant la source dans a5_01, puis en la rejouant. En urgence, `grant execute on function private.<f> to authenticated` sur la seule fonction en cause, à reporter ensuite dans a5_01 |
| § 2 (fonctions Edge) | redéployer la coquille au SHA précédent ; désactiver le cron le temps de le faire |
| Catastrophe (données abîmées) | restauration de la sauvegarde d'avant l'étape (procédure `SAUVEGARDE.md` § 4), ou PITR. RPO de la sauvegarde nocturne : 24 h ; la sauvegarde manuelle faite juste avant l'étape le ramène à quelques minutes |

---

## 6. Ce qui bloque encore — pour Teo

1. **HDS.** Choix : Scaleway, à souscrire au premier client santé. Jusque-là, tous
   les fournisseurs restent `agree_sante = false` en production. Aucun envoi
   portant des données de santé ne part : il est verrouillé `SANTE_HORS_CANAL_AGREE`,
   et `CANAL_NON_PERMIS` en SMS (tests 52, 53, 54 et 19ab, verts sur la recette).
   Tiroma peut aller en production, mais son point du matin ne sort que sans donnée
   de santé (gabarit `tiroma.point_matin`). Quand Scaleway sera souscrit, il faudra :
   - une ligne `fournisseurs_envoi` pour Scaleway, `agree_sante = true` sur preuve
     de certification ;
   - un ouvrier qui sache l'appeler (A2) ;
   - rejouer les tests 52 à 54.
2. **Clé SIRENE.** Pas bloquant : le repli recherche-entreprises marche sans clé
   (prouvé sur ORANGE SA). Poser `SIRENE_API_KEY` en production pour le quota et la
   source officielle.
3. **Export Logos_w.** Reporté. `lecteur-exports` et les signatures de b3_11 sont
   prêts, mais aucun vrai export n'est encore passé. Tiroma en production restera
   sans relevé automatique jusque-là.
4. **Autres décisions nécessaires** (relevées dans les notes) :
   - Bedrock en production : identifiants IAM, région eu-central-1, modèle ;
   - Brevo de production : domaine, expéditeur, webhook *Transactionnel*, suivi
     d'ouverture coupé, IP non restreinte ;
   - secrets Meta (WhatsApp) ;
   - `cle_service` dans le Vault de production ;
   - secrets GitHub `SUPABASE_DB_URL` et `SAUVEGARDE_PHRASE`, puis une première
     sauvegarde `reussie` **avant** la première étape ;
   - accord permanent des J-2 Daliro ;
   - juriste : seconde demande de pièces Lorani dans le mois ;
   - plan Vercel Pro.
5. **Fusion de `worker-a4` et `worker-a5` dans main** avant de figer le tag (§ 1.4).
   `worker-a1` et `worker-a2` peuvent rester sur leurs SHA : les coquilles pointent
   sur leurs branches.

---

## 7. Résumé du plan

0. Préalables Teo (§ 6.4), sauvegarde `reussie`, tag figé.
1. Exporter les lots « recette seule » en fichiers (constat 1).
2. Répétition générale sur une copie de la production : A → E, fonctions Edge, crons.
   Toutes les suites pgTAP doivent passer au vert.
3. Production : A → B → C → D → E, avec les contrôles du § 4.2 après chaque étape.
4. Production : fonctions Edge, secrets, appel à la main, puis crons (B4, B13).
5. Premier client : réglages d'envoi en `coupe` ou `essai`, puis `reel` sur décision
   écrite.

---

## 8. Sorties demandées au coordinateur (lecture seule)

1. Recette : `select version, name, array_length(statements,1), left(array_to_string(statements, E'\n'), 300) from supabase_migrations.schema_migrations order by version;`
   — fixe l'ordre exact et sert à l'export du constat 1.
2. Production : `version, name` de `schema_migrations`, si le filtre le permet ;
   sinon, la dernière liste connue.
3. Recette : `select jobname, schedule, left(command, 200) from cron.job order by jobname;`
4. Recette : `list_edge_functions` (nom, version, verify_jwt, SHA de chaque coquille),
   et les **noms** des secrets Edge posés.
