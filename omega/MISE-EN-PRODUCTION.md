# Mise en production d'Omega — dossier de passage

Préparé par A5 (garde-fous), 6 octobre 2026, à la demande du coordinateur.
**Rien n'est posé par ce document.** La production (`noepmkkplxshjbmqqxft`) n'a
été ni lue ni touchée ; l'inventaire vient du dépôt (main, `worker-a1`, `worker-a2`,
`worker-a4`, `worker-a5`) et du journal `omega/NOTES-COORDINATEUR.md`.

Recette de référence : `ygwbgpowzlbdaajlsqkn`. Ordre, crons et fonctions recalés le
6/10 sur les sorties brutes relayées par le coordinateur (§ 8) ; ce qui reste à
relever est listé au § 8.

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

### 1.1 Règle : rejouer la séquence de la recette, à l'identique

L'ordre de vérité est **l'ordre des versions de la recette** (`schema_migrations`,
sortie n° 1 du coordinateur, 6/10 13 h 45 Z). Chaque lot y a été posé sur l'état
laissé par le précédent. Plusieurs corps sont réécrits « par repère » : 19ab, a4_11,
b5_05, et les `_v2`, `_v3`, `_v4` qui reprennent un lot. Rejoués dans un autre
ordre, ils s'arrêtent sans rien changer (c'est voulu), ou bien ils posent une
version périmée.

**Décision proposée** : la production rejoue **la même séquence, version pour
version, en gardant les numéros de version de la recette**. Elle exclut seulement
les lignes du § 1.4. Les reprises (`_v2`, `_v3`…) sont rejouées à leur place, et non
fusionnées dans la première pose. C'est la seule façon d'arriver au même état sans
avoir à prouver que chaque version finale ne dépend de rien de posé après sa
première version. Le coût, quelques corps de fonction écrits deux fois, est nul.

Chaque ligne se pose **dans une transaction** : elle passe en entier ou rien.

### 1.2 Ce que la production a déjà (sortie n° 2)

Un historique propre jusqu'au 27/09 (v1_2 → v3_0, comptes_clients,
paiement_stripe, grille de prix, veille_youtube, securite_*). Ensuite, les lots
1 à 16 du socle et les lots de modules communs, jusqu'à `20260929092923
tavaro_lot2a2_reseau`. **Rien après.** `base_existante` n'existe pas en production,
et c'est normal (elle ne sert qu'à la recette et à la CI ; elle refuse une base non
vide).

### 1.3 Ce qui doit y aller, dans l'ordre (sortie n° 1)

Source de chaque ligne :
- **fichier** : chemin du dépôt, SHA du dernier commit qui le touche ;
- **dépôt** : posée « depuis le dépôt ». Le champ `statements` de la recette porte
  la provenance (branche, SHA, chemin), et c'est **ce SHA-là** qui fait foi ;
- **SQL** : posée par `execute_sql`. Le texte est dans `statements`, à exporter en
  fichier (§ 1.5).

**Étape A — bases des modules, posées sur la recette avant le 29/09 et absentes de
la production.** Elles se placent entre les lots de modules communs, à leur version.
Il faudra vérifier, sur la répétition, qu'elles passent après
`tavaro_lot2a2_reseau`.

| Version | Nom | Source |
|---|---|---|
| 20260928214838 | `daliro_m0a_referentiel` | SQL |
| 20260928221251 | `varelo_referentiel` | SQL |
| 20260928222752 | `daliro_m0b_marches` | SQL |
| 20260928223335 | `varelo_referentiel_index` | SQL |
| 20260929023244 | `daliro_m0c_planning` | SQL |
| 20260929024032 | `tamila_m10_delais_correctifs` | SQL |
| 20260929033045 | `varelo_referentiel_perf` | SQL |
| 20260929033851 | `tamila_m10b_porte_etroite` | SQL — marquée « recette seulement » à la pose : **à juger** sur le texte exporté (porte étroite d'essai, ou correctif à emporter ?) |
| 20260929034413 | `tiroma_releve` | SQL (absente de la production : confirmé le 6/10) |

Daliro et Varelo étaient notés « à garder en recette » le 5/10. Les deux modules
sont livrés : leurs bases partent. **Teo confirme.**

**Étape B — la séquence du 4 au 6 octobre** (✗ = ne pas emporter, voir § 1.4).

| Version | Nom | Source | Note |
|---|---|---|---|
| 20261004220932 | `socle_lot17_portes_ouvrier` | SQL | `prendre_travaux`, `battre_ouvrier` |
| 20261005140000 → 140300 | `socle_lot18a` à `18d` (receptions, portes de réception, remise idempotente, boîte formulaire) | SQL | |
| 20261005163500 | `socle_lot19a_exigences_annuaire` | SQL | |
| 20261005163600 | `socle_lot19b_portes_lecteur_pgtap_storage` | SQL | **à retoucher** : sans `create extension pgtap`, cron `omega-lecteur` réécrit sur l'URL de production (§ 2.2) |
| 20261005164500 | `filed_lot4a_comptabilite_tables` | dépôt (a4_01) | |
| 20261005164600 | `filed_lot4b_comptabilite_portes` | dépôt (a4_02) | retire l'ancienne contrainte `filed_factures_statut_check` |
| 20261005164700 | `socle_lot19c_separation_saisie_approbation` | SQL | |
| 20261005164800 | `filed_lot4c_charges_recurrentes` | dépôt (a4_03) | |
| 20261005164900 | `filed_lot4d_controles_identite` | dépôt (a4_04) | |
| 20261005165000 | `filed_lot5a_archivage_probant` | dépôt (a4_05) | |
| 20261005165100 | `filed_lot6a_pilotage` | dépôt (a4_06) | |
| 20261005165200 | `filed_lot4f_circuit_validation` | dépôt (a4_07) | |
| 20261005170800 | `filed_lot4e` | dépôt (a4_08) | |
| 20261005170900 | `filed_lot4g` | dépôt (a4_09) | |
| 20261005171500 | `socle_lot19d_droits_tables` | SQL | après les tables FILED 4–6 |
| 20261005171800 | `socle_lot19e_droits_larges` | SQL | |
| 20261005172000 | `socle_lot19f_anon_sans_ecriture` | SQL | |
| 20261005175500 | `socle_lot19g_plages_sms_whatsapp` | SQL | |
| 20261005181500 | `filed_lot4f_decider_sans_separation` | dépôt (a4_07, 1500b1a) | |
| 20261005182000 | `socle_lot19h_realtime_espace` | SQL | |
| 20261005185500 | `a5_01_private_execute` (v1) | dépôt | rejouée en v2 plus loin, et en dernier (étape C) |
| 20261005190000 | `socle_lot19i_brevo_branche_recette` | SQL | ✗ « recette seulement » : en production, `branche = true` seulement quand les secrets Brevo de production sont posés (§ 2) |
| 20261005190500 | `socle_lot19j_service_role_private` | SQL | |
| 20261005195000 | `socle_lot19k_grants_selon_policies` (75) | SQL | |
| 20261005195100 | `socle_lot19l` | SQL | |
| 20261005195800 | `socle_lot19m_storage_depot_membres` | SQL | |
| 20261005202500 | `socle_lot19n_realtime_vague2` | SQL | |
| 20261005202600 | `socle_lot19o_storage_depot_tout_objet` | SQL | |
| 20261005203000 | `socle_lot19p` | SQL | |
| 20261005204500 | `tiroma_b3_01` | dépôt | |
| 20261005205000 | `banc_lot19q` | SQL | ✗ banc |
| 20261005205500 → 205800 | `socle_lot19r` (89), `19s`, `19t` (« aucun »), `19u` | SQL | 19r est inutile mais sans effet durable : a5_01 v2 le défait |
| 20261005210000 | `a4_10` | dépôt | |
| 20261005210100 → 210300 | `b2_01`, `b2_02`, `b1_01` | dépôt | |
| 20261005211500 | `socle_lot19v_cron_omega_identite` | SQL | cron réécrit sur l'URL de production (§ 2.2) |
| 20261005212000 | `b7_01` | dépôt | |
| 20261005212100 | `b6_01` → `b6_04` | dépôt | |
| 20261005212500 | `socle_lot19w` (4) | SQL | |
| 20261005213000 | `socle_lot19x_realtime_tiroma` | SQL | |
| 20261005213500 | `a4_11` | dépôt | |
| 20261005215001 | `b7_01_v2` | dépôt | |
| 20261005215101 → 215105 | `b3_02` → `b3_06` | dépôt | |
| 20261005215106, 215107 | `b5_01`, `b5_02` | dépôt | |
| 20261005215201 | `socle_lot19y_realtime_loc` | SQL | |
| 20261005215301 | `socle_lot19z_private_anon_zero` | SQL | |
| 20261005234001 → 234006 | `b7_01_v3`, `b1_02`, `b6_03_v2`, `b4_02`, `b4_03`, `b5_03` | dépôt | |
| 20261006000101 → 000112 | `b7_02`, `b6_01_v2`, `b6_04_v2`, `b4_01`, `b4_04`, `b5_01_v2`, `b5_03_v2`, `b5_04`, `b3_08`, `b3_07`, `b3_09`, `b3_02_v2` | dépôt | |
| 20261006000201 | `socle_lot19aa_cron_lecteur_exports` | SQL | cron réécrit sur l'URL de production (§ 2.2) |
| 20261006003001 → 003701 | `b1_03`, `b2_01_v2`, `b6_05`, `b2_02_v2`, `b3_03_v2`, `b7_03`, `b3_10`, `b3_06_v2` | dépôt | |
| 20261006010711 | `socle_lot19ab_sante_envois` | fichier `omega/modules/socle/migrations/19ab_sante_envois.sql` (6b9c88d) | |
| 20261006011655 | `socle_lot19ac_sorties_tests` | SQL | ✗ outil de test |
| 20261006011840 | `a5_01_private_execute_v2` | dépôt (worker-a5 97853cb) | |
| 20261006012449 | `b2_11` (tests) | dépôt | ✗ tests |
| 20261006013028 | `b7_01_v4` | dépôt | |
| 20261006013338 | tests A5 52/53 | dépôt | ✗ tests |
| 20261006013731 | `b3_11` | dépôt (9a183b1) | |
| 20261006014905 | `b5_05` | dépôt (ea53b85) | |
| 20261006015557 | `socle_lot19ae_tester_sans_trace` | SQL | ✗ outil de test |
| 20261006015637 | `a4_12` | dépôt (18578a3) | |
| 20261006020532, 020533 | `b5_06`, `a4_13` | dépôt (fcd1b1a, 5f6aa66) | |
| 20261006023553 → 023555 | `b6_06`, `b5_07`, `a4_14` | dépôt (697c580, a4e3197, cf4c3af) | |
| 20261006045756, 045757 | `b6_07`, `b5_08` + `b5_09` | dépôt (b3bd323, 8b9ebbc, fbf4c98) | |
| 20261006051221 | `a4_15` | dépôt (634fe24) | |
| 20261006134231 | `filed_realtime_fournisseurs` | SQL | |

**Étape C — clôture, toujours en dernier.**

| Ordre | Quoi | Source |
|---|---|---|
| C1 | `a5_01_private_execute.sql` rejouée. Depuis sa v2 (011840), dix lots ont créé des fonctions dans `private` (b7_01_v4, b3_11, b5_05 → a4_15). Elle les range dans la règle et pose les droits par défaut globaux. Idempotente ; elle s'arrête par exception si anon exécute encore quelque chose | `omega/migrations/a5_01_private_execute.sql`, worker-a5 db8fb41 |
| C2 | `a5_01_liste_requises.sql` (lecture seule) : la liste à comparer à celle de la répétition et à la recette (221 le 6/10) | même SHA |

### 1.4 Lignes de la recette à ne pas rejouer

- `base_existante` : la production a son propre historique.
- `banc_lot19q` : donnée du banc.
- `socle_lot19ac_sorties_tests` et `socle_lot19ae_tester_sans_trace` : outils de
  test.
- `b2_11` (tests) et tests A5 52/53 : des tests, pas des migrations.
- `socle_lot19i_brevo_branche_recette` : à remplacer par la décision de production
  (§ 2).
- Dans `socle_lot19b`, la ligne `create extension pgtap` : retirée.

Le reste est rejoué tel quel, y compris 19j, 19r, 19s, 19t, 19u, 19w et 19z. a5_01
(étape C) rétablit ensuite la règle exacte, et le test 44 le prouve.

### 1.5 Exporter les lignes « SQL » et figer les lignes « dépôt »

Avant toute répétition, une seule extraction en lecture seule sur la recette :

```sql
select version, name, statements
from supabase_migrations.schema_migrations
where version > '20260929092923' or name in ('daliro_m0a_referentiel', 'daliro_m0b_marches', 'daliro_m0c_planning',
  'varelo_referentiel', 'varelo_referentiel_index', 'varelo_referentiel_perf',
  'tamila_m10_delais_correctifs', 'tamila_m10b_porte_etroite', 'tiroma_releve')
order by version;
```

Chaque ligne devient le fichier `omega/prod/migrations/<version>_<name>.sql` :
- pour une ligne « SQL », c'est le texte de `statements` ;
- pour une ligne « dépôt », c'est le fichier lu au SHA de la provenance
  (`git show <sha>:<chemin>`), pas la version de main. Le SHA de provenance prime
  sur ceux du § 1.6, qui ne donnent que le dernier commit du fichier.

Les lignes du § 1.4 n'y figurent pas. Le dossier est commité et relu, puis il sert
tel quel à la répétition et à la production.

### 1.6 Fichiers du dépôt concernés (pour la relecture)

- FILED (`worker-a4`) : `omega/migrations/a4_01` … `a4_15`, derniers commits
  1500b1a (01, 02, 04–07), 2ea2cc1 (03, 08), 55af068 (09), 316697e (10),
  179fd13 (11), 18578a3 (12), 5f6aa66 (13), cf4c3af (14), 634fe24 (15).
- Modules (main) : `omega/modules/identite/migrations/b7_01..03` (9032537,
  4d0f61b, 8145532) ; `varelo/b1_01..03` (b287d04, b287d04, 3860e00) ;
  `tavaro/b2_01..02` (e6d991a) ; `tiroma/b3_01..11` ; `tamila/b4_01..04`
  (b287d04) ; `lorani/b5_01..09` ; `daliro/b6_01..07`.
- Socle : `omega/modules/socle/migrations/19ab_sante_envois.sql` (6b9c88d) ;
  `omega/migrations/a5_01_private_execute.sql` et `a5_01_liste_requises.sql`
  (worker-a5 db8fb41).
- Aucun de ces fichiers ne contient de donnée du banc : vérifié par recherche de
  `cccccccc` et de `banc` dans tous les fichiers de migration.

### 1.7 Comment poser en production

- **Pas** de `depot_demander` / `depot_executer` (constat 2).
- **Pas** d'`execute_sql` fichier par fichier : l'outil bloque sur le mot
  `delete`, et les migrations en contiennent (`on delete cascade`, déclencheurs
  `before … or delete`).
- **Ce que je conseille** :
  1. Pour la répétition, copier `omega/prod/migrations/` (§ 1.5) dans
     `supabase/migrations/`.
  2. `supabase migration repair --status applied <version>` pour chaque version
     déjà en production (sortie n° 2), afin que l'historique local la connaisse.
  3. `supabase db push --dry-run`, relu, puis `supabase db push`.
  4. La même chose en production, lancée par Teo ou une session autorisée.
- Figer un **tag** du dépôt (`prod-AAAA-MM-JJ`) quand le dossier est commité.

---

## 2. Fonctions Edge

Méthode inchangée : une « coquille ». `index.ts` importe
`https://raw.githubusercontent.com/teopetit50-gif/pegase-site/<SHA complet>/omega/functions/<nom>/index.ts`,
et `deno.json` sert d'`import_map_path` (obligatoire). Chaque coquille est **figée
sur un SHA**. Recette relevée le 6/10 à 13 h 45 Z (sortie n° 4).

| Fonction | SHA à déployer | Recette | verify_jwt | Secrets (noms seuls) | Cron |
|---|---|---|---|---|---|
| `lecteur` | `0d547318d1f4c7f57763b2d3128d1eb631811762` (worker-a1) | v17, coquille | true | **Production : Bedrock** (données en UE) : `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (eu-central-1), `BEDROCK_MODEL_ID` ; **pas** d'`ANTHROPIC_API_KEY`. Facultatifs : `MISTRAL_API_KEY`, `PLAFOND_IA_JOUR_CLIENT_EUR` | `omega-lecteur` `* * * * *` (19b) |
| `lecteur-exports` | `d963121419b014081fc5155c8e01151b8fd76deb` (worker-a1) | v2, coquille | true | aucun en plus de ceux de Supabase | `omega-lecteur-exports` `* * * * *` (19aa) |
| `expediteur` | `67f9cf677d306f4e82ce66dde0485602ee5e8956` (worker-a2) | v12, coquille | true | `BREVO_API_KEY` | `omega-expediteur` `* * * * *` (19b) |
| `webhooks-brevo` | **87a1112** (worker-a2, `omega/functions/webhooks/brevo/index.ts`) — **figé** : la recette est passée en coquille sur ce SHA le 6/10 (v10) | v10, coquille | **false** (jeton vérifié dans la fonction) | `BREVO_WEBHOOK_JETON` | aucun ; webhook Brevo *Transactionnel* → `/functions/v1/webhooks-brevo` |
| `reception` | **4114a69** (worker-a2, `omega/functions/reception/index.ts`) — **figé** : la recette est passée en coquille sur ce SHA le 6/10 (v10) | v10, coquille | **false** | `BREVO_WEBHOOK_JETON`, `BREVO_API_KEY`, `META_VERIFY_TOKEN`, `META_APP_SECRET`, `META_ACCESS_TOKEN`, `FORMULAIRE_SECRET`, `FORMULAIRE_BOITE` | aucun ; domaine inbound Brevo → `/functions/v1/reception/brevo` |
| `identite` | **e77fabb** (coquille relevée) ; `deno.json` mappe `@partage/` sur `_partage` au **7425991** | v2 | true | `SIRENE_API_KEY` (facultatif : repli recherche-entreprises), `IDENTITE_CACHE_JOURS` (30), `IDENTITE_BALAYAGE_JOURS`, `IDENTITE_BALAYAGE_MAX` | `omega-identite` `* * * * *` (19v) |

En production, **toutes** les fonctions sont des coquilles sur un SHA complet. On
ne recopie jamais une version de la recette dont on ignore le SHA, ce qui vaut pour
`reception` et `webhooks-brevo` (§ 2.3).

Communs à toutes : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (fournis par
Supabase). **Vault** de production : le secret `cle_service`, lu par les crons qui
appellent une fonction. Sans lui, les crons tournent mais les fonctions répondent
401.

Ordre :
1. Les fonctions, d'abord sans cron.
2. Les secrets et `cle_service`.
3. Un appel à la main de chaque fonction : 200, et le battement écrit.
4. Les crons.

`webhooks-brevo` et `reception` répondent 503 tant que leurs secrets manquent :
c'est voulu.

### 2.1 Crons — sortie n° 3 (recette, 40 tâches)

| Origine | Tâches |
|---|---|
| Lots déjà en production (socle 1–16, modules communs) — **à vérifier présents en production au palier P1** (`select jobname, schedule from cron.job order by 1;`, par Teo ou la session autorisée : la lecture de la production est refusée au coordinateur) | `omega-chien-de-garde` */15, `omega-controle-delais` 7 *, `omega-envois` */5, `omega-filed` *, `omega-mesure` 11 *, `omega-points-assemblage` */5, `omega-points-controle` 2-59/5, `omega-points-purge` 29 3, `omega-purge-historique-cron` 17 3, `omega-purge-lectures` 17 3, `omega-purge-releves` 47 3, `omega-purge-travaux` 43 3, `omega-releves` */15, `omega-releves-file` *, `omega-suivis` 23 *, `omega-verifier-sauvegardes` 7 8, `lorani-calendrier` 12 *, `lorani-lectures` */5, `tamila-coffre` 11 *, `tamila-decisions` *, `tamila-delais` 17 *, `tavaro-matin` */30, `tavaro-mesure` 0 9, `tavaro-ouvrier` *, `tavaro-purge` 27 3, `tiroma-horloge` */10, `tiroma-purge` 37 3, `tiroma-releves` * |
| Étape A (bases Daliro, Varelo) | `daliro-referentiel` 20 6, `varelo-referentiel` *, `varelo-referentiel-hebdo` 45 4 * * 0, `varelo-referentiel-quotidien` 30 4 |
| Étape B, SQL pur | `tavaro-relances` 15 9 (b2_02), `tiroma-matin` */30 (b3_06), `daliro-confirmations-j2` 0 15 (b6_02), `daliro-ouvrier` * (b6_06) |
| Étape B, appel d'une fonction Edge | `omega-lecteur` *, `omega-expediteur` * (19b), `omega-identite` * (19v), `omega-lecteur-exports` * (19aa) |

### 2.2 Les quatre crons qui appellent une fonction portent l'URL de la recette

`omega-lecteur`, `omega-expediteur`, `omega-identite` et `omega-lecteur-exports`
appellent `net.http_post` sur `https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/…`,
écrit en dur.
- **Rejoués tels quels en production, ils réveilleraient les ouvriers de la
  recette.**
- Dans les fichiers exportés de 19b, 19v et 19aa (§ 1.5), il faut remplacer
  `ygwbgpowzlbdaajlsqkn` par `noepmkkplxshjbmqqxft` avant toute répétition. Mieux
  encore : une URL lue dans `private.reglages`, pour que le même fichier serve
  partout.
- Contrôle après pose (attendu : 0 ligne) :
  `select jobname from cron.job where command like '%ygwbgpowzlbdaajlsqkn%';`
- Il faut aussi chercher l'URL de la recette dans tout le corps de fonction de
  production (attendu : 0 ligne) :
  `select p.oid::regprocedure from pg_proc p where prosrc like '%ygwbgpowzlbdaajlsqkn%';`

À ne pas emporter : aucune tâche de test. `private.tests_en_tache` (19ac)
programme des tâches qui se retirent seules, et 19ac est exclu.

### 2.3 `reception` et `webhooks-brevo` : figées le 6/10

Jusqu'au 6/10, ces deux fonctions étaient sur la recette des dépôts de sources
complètes (v9, sans SHA).

**Ce qui a été comparé**, par moi dans le dépôt :
- `webhooks-brevo` : un seul commit touche son dossier, 87a1112.
- `reception` : 18e7999 et 4114a69 portent les mêmes sept fichiers. 81e1bd5, plus
  ancien, a un `portes.ts` différent (champ `type_mime`).
- Le coordinateur a vérifié que `portes.ts` à 4114a69 porte bien `mime: string;`
  (ligne 25).

**Ce qui a été fait**, par le coordinateur, le 6/10 vers 13 h 54 Z : les deux
fonctions de la recette sont passées en coquille.
- `webhooks-brevo` v10, sur 87a1112 ;
- `reception` v10, sur 4114a69 ;
- toutes deux en `verify_jwt` false, avec `@std/assert` dans `deno.json`.

**Contrôle de fumée** (POST `{}` sans jeton) : `reception/formulaire` 401,
`reception/brevo` 401, `webhooks-brevo` 401 `{"erreur":"jeton invalide"}`. C'est le
code du dépôt qui répond.

**Chemin utile, 6/10 vers 14 h Z (coordinateur)** :
- **`webhooks-brevo` v10 : prouvé.** Envoi d'essai `b109eea1` parti à 13:59:01 Z
  (référence `<202610061359.72974083619@smtp-relay.mailin.fr>`). Webhook
  `delivered` reçu, et ligne `envois_evenements` « remis » écrite à 13:59:05.66 Z
  (clé `brevo:email:<…>:delivered:2026-10-06T13:59:04.000Z`).
- **`reception` v10 : pas prouvé, c'est un trou.** L'inbound Brevo n'est pas
  branché sur la recette. Un POST signé sur `/reception/formulaire` demande la valeur
  de `FORMULAIRE_SECRET`, que le coordinateur n'a pas. Il faut le prouver :
  - pendant la répétition, par un formulaire signé (outil
    `omega/functions/reception/outils/` de worker-a2, avec le secret posé par
    Teo) ;
  - ou au branchement de l'inbound : un sous-domaine dont le MX pointe vers Brevo,
    vers `/functions/v1/reception/brevo`.

  Tant que ce n'est pas fait, la réception (courriel entrant, WhatsApp, formulaire
  du site) ne part pas en production comme « prouvée ».

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
| `private.depot_demander`, `private.depot_executer` | recette seule, posées hors `schema_migrations` | exécution de SQL distant (constat 2) ; elles ne sont dans aucune ligne rejouée, vérifier sur la répétition qu'elles n'existent pas |
| Schéma `scories` (`zz_essai_lot18*`), réception d'essai `receptions` id 1 | recette | scories |
| Fournisseur d'envoi agréé santé | `private.fournisseurs_envoi` | rester à `agree_sante = false` partout tant que Teo n'a pas la preuve HDS (§ 6) |
| `ANTHROPIC_API_KEY` | secrets Edge | recette seulement (données hors UE) ; Bedrock en production |
| Modèles d'essai à blanc `lecteur-exports/modeles/*.json`, `lecteur/banc/` | dépôt | jamais déployés : la coquille n'importe que `index.ts` et ce qu'il importe |

---

## 4. Contrôles après chaque étape

### 4.1 Sur la répétition (copie de la production)

Après **chaque ligne** des étapes A à C, et sur la copie seulement (la répétition s'automatise : un `db push` par ligne, puis les suites) :
1. `00_installation.sql`, puis les suites pgTAP.
2. Socle (`omega/tests/socle/TOUT_1..4.sql`, **54 tests**, `worker-a5`) ; `19ab_sante_envois.sql`.
3. FILED (`a4_*`).
4. Modules `^test_b1_` … `^test_b7_`, avec les décomptes de la recette du 6/10 comme
   attendus : Varelo 14/14, Tavaro 11/11, Tiroma 12/12, Tamila 13/13, Lorani 120/120,
   Daliro 154 + 38 + 29, Identité 10/10.

### 4.2 Sur la production — lecture seule

On contrôle à six **paliers** plutôt qu'après chacune des quelque 110 lignes :
- **P1**, avant l'étape A puis après elle. Avant : relever `select jobname, schedule from cron.job order by 1;` et comparer au § 2.1. La lecture de la production est refusée au coordinateur ; c'est donc Teo ou la session autorisée qui la fait ;
- **P2**, après `socle_lot19h` (20261005182000) ;
- **P3**, après `socle_lot19z` (20261005215301) ;
- **P4**, après `b3_06_v2` (20261006003701) ;
- **P5**, après `filed_realtime_fournisseurs` (20261006134231) ;
- **P6**, après l'étape C.

À chaque palier :

```sql
-- Garde-fou 1 : EXECUTE sur private (attendu à P6 : anon 0 ; authenticated = le nombre de la répétition ; service_role = tout)
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
| A et B, lots qui créent tables et portes | désactiver ce qui agit : `cron.alter_job(jobid, active := false)` pour les crons du lot, `revoke execute` sur les portes publiques du lot pour anon/authenticated. Les tables restent, vides et inertes (pas de DROP : l'outil le refuse, et une table vide ne nuit pas). Les fonctions remplacées sont rejouées depuis le relevé fait avant l'étape |
| B, lots de droits, Realtime, Storage (19d–19p, 19x, 19y, Realtime filed_fournisseurs) | rejouer l'inverse, généré avant l'étape à partir du relevé `aclexplode` / `pg_publication_tables` / `pg_policies` de `storage.objects` |
| Lots qui posent un cron (19b, 19v, 19aa, b2_02, b3_06, b6_02, b6_06 et leurs `_v2`) | `cron.alter_job(…, active := false)` |
| `socle_lot19ab` | rejouer les deux corps relevés (`verrous_envoi`, `commencer_envoi`) |
| a5_01 (v1, v2, étape C) | ne pas annuler : un manque se corrige en ajoutant la source dans a5_01, puis en la rejouant. En urgence, `grant execute on function private.<f> to authenticated` sur la seule fonction en cause, à reporter ensuite dans a5_01 |
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
3. Production : A → B → C, avec les contrôles du § 4.2 à chaque palier (P1 à P6). Les quatre crons qui appellent une fonction (19b, 19v, 19aa) portent l'URL de production (§ 2.2).
4. Production : fonctions Edge, secrets, `cle_service`, appel à la main de chaque fonction.
5. Premier client : réglages d'envoi en `coupe` ou `essai`, puis `reel` sur décision
   écrite.

---

## 8. Sorties de la recette (reçues le 6/10 à 13 h 45 et 13 h 52 Z)

Reçues du coordinateur, en lecture seule, et intégrées aux § 1.2, 1.3, 2 et 2.1 à 2.3 :
1. `schema_migrations` de la recette, y compris l'ordre des lignes 164500 → 165200 ;
2. noms des migrations de production, avec la confirmation que `tiroma_releve`,
   `varelo_referentiel_perf` et `tamila_m10b_porte_etroite` y sont absentes ;
3. `cron.job` de la recette ;
4. fonctions Edge de la recette, avec le contenu des coquilles et la liste des fichiers
   de `reception` et `webhooks-brevo`.

Restent ouverts :
- la provenance de chaque ligne « dépôt », lue dans `statements` à l'export (§ 1.5) ;
- les crons de la production, relevés à P1 par Teo ou la session autorisée (la
  lecture de la production est refusée au coordinateur, à juste titre) ;
- `reception` et `webhooks-brevo` : figées en coquille (4114a69, 87a1112).
  `webhooks-brevo` est prouvée de bout en bout. `reception` est un **trou** :
  son chemin utile reste à prouver, par un formulaire signé à la répétition ou au
  branchement de l'inbound Brevo (§ 2.3) ;
- `tamila_m10b_porte_etroite` : emporter ou non, à juger sur son texte.
