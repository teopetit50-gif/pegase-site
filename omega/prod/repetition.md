# Répétition générale de la mise en production

A5, 6 octobre 2026. Étape 2 du dossier `omega/MISE-EN-PRODUCTION.md`. Le script
est `omega/prod/repetition.sh`.

**Pour la session qui a les droits** (Teo, ou une session autorisée) : la CLI
Supabase et l'accès à une copie de la production. Le script **refuse** la recette
et la production comme cible : il ne touche qu'une copie.

## 0. Choisir la copie (décision de Teo)

Prix relevés le 6/10/2026 sur supabase.com ; à vérifier au moment de commander.

| Voie | Ce qu'elle copie | Coût | Réserve |
|---|---|---|---|
| **A. Branche Supabase** créée depuis le tableau de bord, option « Include data » | Le schéma est rejoué depuis l'historique des migrations du projet principal ; les données sont copiées si on coche « Include data ». Ni les objets Storage, ni les fonctions Edge | Plans Pro et Team seulement (pas Free). **0,01344 $ de l'heure** en compute Micro, soit 0,32 $ par jour et environ 9,60 $ pour un mois entier. S'y ajoutent disque et trafic au-delà du quota. Les crédits de compute ne s'appliquent pas, et le plafond de dépense (Spend Cap) ne couvre pas les branches | La doc dit qu'une branche est construite « depuis les fichiers de migration » : il faut vérifier que l'historique de la production suffit à la reconstruire, alors que ses 61 migrations historiques ne sont pas dans le dépôt. Si la branche naît vide ou incomplète, passer à B |
| **B. Dupliquer le projet** depuis une sauvegarde (« Restore to a new project ») | Schéma, données, index, rôles, droits, utilisateurs Auth, clé racine du Vault. **Pas** les objets Storage, les fonctions Edge, les réglages Auth, Realtime ni les extensions, à remettre à la main | Plans payants, sauvegardes physiques actives. Le nouveau projet est facturé comme un projet normal, au prorata. En Micro : 10 $ par mois, soit 0,0139 $ de l'heure, environ 0,33 $ par jour, plus le disque | **pg_cron et pg_net se réactivent seuls à la restauration**, et la clé du Vault est copiée : les crons de la copie appelleraient les fonctions Edge de la **production** avec sa clé de service. `repetition.sh securiser` en premier, sans délai. Une copie restaurée ne peut pas servir de source à une autre |
| **C. Postgres jetable en CI** (image `supabase/postgres`) : `.github/workflows/omega-repetition-ci.yml`, mode d'emploi `omega/prod/REPETITION-CI.md`. **Répétition principale** (Teo, 6/10) | Le schéma de la production relevé sans données (`omega/prod/base/relever-base.sh`, lecture seule), puis toute la séquence, les garde-fous, tous les pgTAP et l'empreinte comparée à la recette, à chaque tag `prod-*` | Gratuit (minutes GitHub Actions) | Aucun secret. Ne couvre pas les données, Auth, Storage, les fonctions Edge, ni les crons en marche (liste dans REPETITION-CI.md) |

Décision du 6/10 : **C**, gratuite, est la répétition principale
(`omega/prod/REPETITION-CI.md`). **B** ne sert qu'en dernier recours, si C laisse un
doute sur les données réelles. C'est la seule copie qui porte l'état réel, pour
environ 0,33 $ par jour. La suite de ce document décrit B.
Supprimer la copie dès la fin de la répétition.

## 1. Préparer

```bash
git checkout prod-AAAA-MM-JJ          # le tag figé (MISE-EN-PRODUCTION.md § 1.7)
export REPETITION_REF=<ref de la copie>                      # 20 lettres
export REPETITION_DB_URL='postgresql://postgres:…@db.<ref>.supabase.co:5432/postgres'
export SUPABASE_ACCESS_TOKEN=…        # pour les fonctions Edge et les secrets
export OMEGA_PAGES=omega/prod/sortie  # pages de exporter.sql du gel
bash omega/prod/repetition.sh verifier
```

`verifier` contrôle les outils, l'arbre propre, la cible, et signale si la base
est bien une copie de la production.

## 2. Sécuriser, puis relever (immédiatement)

```bash
bash omega/prod/repetition.sh securiser   # pg_cron puis pg_net coupés, aucun appel parti, arrêt général des envois
bash omega/prod/repetition.sh relever     # définitions, crons, publication d'avant pose (pour l'exercice du § 7)
bash omega/prod/repetition.sh empreinte avant
```

`securiser` passe en premier, dès la fin de la restauration. Chaque étape est
bloquante, dans cet ordre :
1. **pg_cron** : tous les jobs désactivés (`cron.alter_job`), puis contrôle qu'il
   n'en reste aucun actif. L'état d'origine est gardé dans `crons-avant.txt`.
2. **pg_net** : la file `net.http_request_queue` est vidée (`truncate`), le droit
   d'exécuter `net.http_get/http_post/http_delete` est retiré à public, postgres,
   anon, authenticated, service_role et supabase_functions_admin, et le secret
   Vault `cle_service` (la clé de service de la **production**, copiée avec la
   base) est remplacé par une valeur neutre. Le retrait des droits n'aboutit que
   si postgres en est le concédant : le résultat réel est dans
   `net-droits-apres.txt`. La clé neutralisée suffit à ce qu'un appel égaré soit
   refusé par la production.
3. **Aucun appel parti** : `net._http_response` doit être vide. Cette table n'est
   pas journalisée, donc vide à la restauration : une ligne veut dire qu'un cron
   a tiré entre la restauration et `securiser`. Le script s'arrête alors
   (`net-partis.txt`). Il faut prévenir Teo et faire tourner la clé de service de
   la production.
4. Arrêt général des envois (`envois_arret_general = 'oui'`).

Sans `securise.ok`, toutes les autres sous-commandes (sauf `verifier` et
`rapport`) refusent de tourner. Elles refusent aussi dès qu'un cron actif appelle
`functions/v1` ailleurs que sur la copie.

## 3. Assembler

```bash
bash omega/prod/repetition.sh preparer
```

Le script appelle `assembler.mjs --cloture --projet=<ref de la copie>` : les URL
de la recette sont réécrites vers **la copie**, pas vers la production. Il place les
migrations dans un projet Supabase de travail. Pour chaque version déjà présente sur
la base, il écrit un fichier repère vide : `db push` ne la rejoue pas et ne bute pas
sur son absence. Le script s'arrête si l'assembleur signale une erreur ou une ligne
« À RECONSTRUIRE » (manifeste : `$OMEGA_TRAVAIL/assemblees/MANIFESTE.md`).

## 4. Poser, par paliers

Chaque palier commence par un `db push --dry-run`, demande « oui », pose, puis lance
les contrôles de `garde_fous.sql`.

```bash
bash omega/prod/repetition.sh pousser 20260929034413   # P1 : bases des modules (étape A)
bash omega/prod/repetition.sh pousser 20261005182000   # P2 : jusqu'à 19h
bash omega/prod/repetition.sh pousser 20261005215301   # P3 : jusqu'à 19z
bash omega/prod/repetition.sh pousser 20261006003701   # P4 : jusqu'à b3_06_v2
bash omega/prod/repetition.sh pousser tout             # P5 + étape C (a5_01 de clôture)
```

Les versions de la vague 3 et des suivantes entrent avec `tout`. Si un palier
échoue, la migration en cause est annulée en entier : on corrige sur le dépôt, on
rassemble (`preparer`), puis on reprend au même palier.

## 5. Fonctions Edge et secrets

```bash
bash omega/prod/repetition.sh edge       # six coquilles figées sur leur SHA (MISE-EN-PRODUCTION.md § 2)
bash omega/prod/repetition.sh secrets    # les secrets présents dans l'environnement, par nom ; jamais affichés
```

Pour la répétition, **ne pas** exporter `BREVO_API_KEY` ni `META_*` : aucun message
ne doit partir d'une copie des données réelles. Le lecteur peut recevoir les clés
Bedrock pour une lecture d'essai.

Poser à la main le secret Vault `cle_service` (la clé de service **de la copie**,
`select vault.update_secret(id, '<clé de la copie>') from vault.secrets where name = 'cle_service'`)
et rendre l'appel à pg_net (`grant execute on function net.http_post(text, jsonb, jsonb, jsonb, integer)
to postgres`, idem pour les rôles listés dans `net-coupe.txt` si besoin). Ensuite seulement, réactiver un par un les crons qui appellent une fonction, en
vérifiant leur URL :

```sql
select jobname, command ~ '<ref>' as vise_la_copie from cron.job where command like '%functions/v1%';
select cron.alter_job(jobid, active := true) from cron.job where jobname = 'omega-lecteur';
```

## 6. Prouver

```bash
bash omega/prod/repetition.sh controles
bash omega/prod/repetition.sh tests          # un fichier pgTAP par appel ; ceux qui supposent le banc sont « sans objet »
bash omega/prod/repetition.sh empreinte apres
OMEGA_EMPREINTE_RECETTE=omega/prod/empreintes/recette-<gel>.txt bash omega/prod/repetition.sh comparer
```

- **`tests`**
  - Il installe pgTAP et `00_installation.sql`, puis joue chaque fichier à part,
    avec un délai de 110 s par fichier. On n'utilise pas le cron de la recette,
    qui coupe vers 2 minutes.
  - Il couvre les tests du socle (01 à 55, 19ab), de FILED et des modules, sauf
    ceux qui citent le banc de la recette : 8 Daliro, 2 Lorani, 3 Tiroma,
    1 Tavaro, 1 Identité. Ceux-là restent prouvés sur la recette.
  - Tous les tests annulent ce qu'ils écrivent.
- **`comparer`** : les empreintes doivent être **identiques** à celles de la
  recette au gel. Un écart se localise avec `empreinte.sql` en niveau `detail`.

## 7. Exercer le retour arrière

```bash
bash omega/prod/repetition.sh restaurer-fonctions
```

L'exercice rejoue la définition d'avant pose des fonctions changées. Il montre
qu'un retour par définitions est possible, mais que `db push` ne repose pas ce qui
est déjà inscrit. En production, le retour se fait donc par la sauvegarde prise
juste avant, ou par un lot correctif (MISE-EN-PRODUCTION.md § 5).

À exercer aussi à la main, sur la copie :
- désactiver puis réactiver un cron (`cron.alter_job`) ;
- redéployer une coquille Edge sur un SHA précédent, puis sur le bon ;
- restaurer la copie depuis sa propre sauvegarde (voie B). Mesurer la durée : c'est
  le RTO réel.

## 8. Rendre compte et démonter

```bash
bash omega/prod/repetition.sh rapport
```

Le rapport contient le journal, le manifeste, les sorties des tests, les deux
empreintes et le diff. Il faut ensuite **supprimer la copie** (branche ou projet).
Rien d'autre n'a été touché : la production n'a été ni lue ni écrite par le script.

## Ce qui a été essayé ici (A5, 6/10)

Sur une base Postgres locale jetable (pas une copie de la production) :
- refus de la recette, de la production et d'une URL qui les désigne ;
- `securiser` : crons coupés et contrôlés, file pg_net vidée, `cle_service`
  neutralisée, arrêt sur une ligne de `net._http_response`, refus des autres
  sous-commandes sans sécurisation ou avec un cron actif vers la production
  (bouchons locaux pour `cron`, `net` et `vault` : à confirmer sur la vraie copie) ;
- `relever`, `preparer` (repères compris), `empreinte`, `controles`,
  `tests` (56 fichiers joués un à un), `restaurer-fonctions` et `comparer`.

**Pas essayé, faute de CLI Supabase et de projet** : `pousser` (`db push`), `edge`
et `secrets`. Les options de la CLI (`--workdir`, `--db-url`, `--include-all`,
`--dry-run`, `--yes`, `functions deploy --import-map --no-verify-jwt`,
`secrets set --env-file`) sont à vérifier sur la version installée, au premier
`verifier`.
