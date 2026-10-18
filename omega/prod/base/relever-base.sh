#!/usr/bin/env bash
# omega/prod/base/relever-base.sh — relevé du SCHÉMA de la production, pour la répétition en CI (voie C).
# A5, 06/10/2026. Mode d'emploi : omega/prod/REPETITION-CI.md.
#
# À lancer par Teo (ou une session autorisée à LIRE la production), au gel, avant le tag prod-AAAA-MM-JJ.
# LECTURE SEULE : pg_dump --schema-only et deux SELECT. Aucune donnée, aucun secret dans ce qui est écrit :
#   01_extensions.sql  les extensions de la production (create extension if not exists …)
#   02_schema.sql      pg_dump --schema-only de public et private (tables, fonctions, vues, politiques, droits)
#   03_crons.sql       cron.schedule(nom, planning, commande) de chaque tâche ; la clé de service reste dans le Vault
#   RELEVE.md          date, version du serveur, dernière migration, empreintes des trois fichiers
#
# Variable : PROD_DB_URL (URL postgres de la production, rôle postgres ; le « Session pooler » si pas d'IPv6).
# Elle n'est lue que dans l'environnement, jamais écrite.
set -euo pipefail

ICI="$(cd "$(dirname "$0")" && pwd)"
: "${PROD_DB_URL:?PROD_DB_URL absente (URL de la production, lue dans l environnement seulement)}"
[[ "$PROD_DB_URL" == *noepmkkplxshjbmqqxft* ]] || { echo "PROD_DB_URL ne désigne pas la production (noepmkkplxshjbmqqxft)"; exit 1; }
for o in psql pg_dump; do command -v "$o" >/dev/null || { echo "outil manquant : $o"; exit 1; }; done
lire() { PGOPTIONS='-c default_transaction_read_only=on' psql "$PROD_DB_URL" -X -q -At -v ON_ERROR_STOP=1 "$@"; }

lire -c "select '-- Extensions de la production, relevées le ' || to_char(now() at time zone 'UTC', 'YYYY-MM-DD HH24:MI') || ' Z.'" > "$ICI/01_extensions.sql"
lire -c "select format('create extension if not exists %I with schema %I;', e.extname, n.nspname)
         from pg_extension e join pg_namespace n on n.oid = e.extnamespace
         where e.extname not in ('plpgsql') order by e.extname" >> "$ICI/01_extensions.sql"

PGOPTIONS='-c default_transaction_read_only=on' pg_dump "$PROD_DB_URL" --schema-only --no-owner --no-comments \
  --schema=public --schema=private --no-publications --no-subscriptions > "$ICI/02_schema.brut.sql"
# Le schéma public existe déjà dans toute base ; le reste passe tel quel.
# Les lignes \restrict / \unrestrict des pg_dump récents sont des commandes psql : retirées, pour tout client psql.
sed -e 's/^CREATE SCHEMA public;/-- (schéma public déjà présent)/' -e '/^\\\(un\)\{0,1\}restrict /d' "$ICI/02_schema.brut.sql" > "$ICI/02_schema.sql"
rm -f "$ICI/02_schema.brut.sql"
# Publication supabase_realtime : relevée à part (pg_dump --no-publications), ajoutée en fin de fichier.
lire -c "select format('alter publication supabase_realtime add table %I.%I;', schemaname, tablename)
         from pg_publication_tables where pubname = 'supabase_realtime' and schemaname in ('public', 'private') order by 1" >> "$ICI/02_schema.sql"

lire -c "select '-- Tâches pg_cron de la production (relevé ; la clé de service reste dans le Vault, pas ici).'" > "$ICI/03_crons.sql"
lire -c "select format('select cron.schedule(%L, %L, %L);', jobname, schedule, command) from cron.job order by jobname" >> "$ICI/03_crons.sql"

# Garde : aucune donnée ne doit sortir.
if grep -nE '^(COPY|INSERT INTO) ' "$ICI"/0[123]_*.sql; then echo "ARRÊT : des données ont été relevées ; ne rien commiter"; exit 1; fi
if grep -nE 'eyJ[A-Za-z0-9_-]{20,}|sb_secret_|service_role_key' "$ICI"/0[123]_*.sql; then echo "ARRÊT : un secret apparaît ; ne rien commiter"; exit 1; fi

{
  echo "# Relevé du schéma de la production"
  echo
  echo "- Date : $(date -u +%FT%TZ)"
  echo "- Serveur : $(lire -c 'select version()' | sed 's/ on .*//')"
  echo "- Dernière migration : $(lire -c "select version || ' ' || name from supabase_migrations.schema_migrations order by version desc limit 1")"
  echo "- Migrations : $(lire -c 'select count(*) from supabase_migrations.schema_migrations')"
  echo
  echo '```'
  (cd "$ICI" && sha256sum 01_extensions.sql 02_schema.sql 03_crons.sql)
  echo '```'
} > "$ICI/RELEVE.md"
echo "Relevé écrit dans $ICI : $(wc -l < "$ICI/02_schema.sql") lignes de schéma, $(grep -c 'cron.schedule' "$ICI/03_crons.sql") crons. Relire, puis commiter ces quatre fichiers."
