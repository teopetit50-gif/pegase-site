#!/usr/bin/env bash
# Fait tourner les cinquante tests du socle sur une maquette locale (cluster Postgres jetable).
# Prérequis : postgresql-16 (ou 17) installé, pgtap.sql (voir README). Usage : bash lancer.sh [port]
set -euo pipefail
ICI="$(cd "$(dirname "$0")" && pwd)"
PORT="${1:-5499}"
PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
export PATH="$PGBIN:$PATH"
PGTAP="${PGTAP_SQL:-$ICI/pgtap.sql}"
[ -f "$PGTAP" ] || { echo "pgtap.sql introuvable ($PGTAP). Voir README : section « maquette locale »." >&2; exit 2; }
DONNEES="${PGDATA_A5:-/var/lib/postgresql/a5}"
SOCKET=/var/run/postgresql
COMME_POSTGRES=""; [ "$(id -u)" = "0" ] && COMME_POSTGRES="runuser -u postgres --"
if [ ! -f "$DONNEES/PG_VERSION" ]; then
  mkdir -p "$DONNEES" "$SOCKET"; [ -n "$COMME_POSTGRES" ] && chown postgres "$DONNEES" "$SOCKET"
  $COMME_POSTGRES initdb -D "$DONNEES" -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null
  printf "port = %s\nunix_socket_directories = '%s'\nlisten_addresses = ''\n" "$PORT" "$SOCKET" >> "$DONNEES/postgresql.conf"
fi
$COMME_POSTGRES pg_ctl -D "$DONNEES" status >/dev/null 2>&1 || $COMME_POSTGRES pg_ctl -D "$DONNEES" -l "$DONNEES/pg.log" start -w >/dev/null
PSQL="psql -h $SOCKET -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$PSQL -d postgres -c "drop database if exists socle_a5" -c "create database socle_a5"
PSQL="$PSQL -d socle_a5"
$PSQL -c "create schema extensions" -c "alter database socle_a5 set search_path = \"\$user\", public, extensions"
$PSQL -c "set search_path = extensions" -f "$PGTAP" >/dev/null
$PSQL -f "$ICI/maquette.sql"
$PSQL -f "$ICI/../../../migrations/a5_01_private_execute.sql" 2>&1 | grep -v "^NOTICE" || true
# Une fonction créée APRÈS la migration ne doit plus naître avec EXECUTE à PUBLIC (défauts posés par a5_01)
$PSQL -c "create or replace function private.nee_apres_a5_01() returns int language sql as 'select 1'"
$PSQL -Atc "select case when has_function_privilege('anon', 'private.nee_apres_a5_01()', 'execute') then 'ÉCHEC : défauts non appliqués' else 'Défauts OK : une fonction née après a5_01 n''est pas exécutable par anon' end"
# 00 crée l'extension pgtap « with schema extensions » : sur la maquette, pgTAP est chargé à la main, on neutralise cette ligne.
sed 's/^create extension if not exists pgtap with schema extensions;/-- (pgTAP chargé par lancer.sh)/' "$ICI/../00_installation.sql" | $PSQL -f -
echo "Maquette prête. Tests :"
total=0; echecs=0
for f in "$ICI"/../[0-9][0-9]_*.sql; do
  [ "$(basename "$f")" = "00_installation.sql" ] && continue
  sortie="$($PSQL -At -f "$f" 2>&1)" || true
  nb_ok=$(printf '%s\n' "$sortie" | grep -c '^ok ' || true)
  nb_ko=$(printf '%s\n' "$sortie" | grep -c '^not ok ' || true)
  total=$((total + nb_ok + nb_ko)); echecs=$((echecs + nb_ko))
  if [ "$nb_ko" -gt 0 ] || [ "$nb_ok" -eq 0 ]; then
    printf '✗ %s\n' "$(basename "$f")"; printf '%s\n' "$sortie" | sed 's/^/    /'
  else
    printf '✓ %s (%s assertions)\n' "$(basename "$f")" "$nb_ok"
  fi
done
echo "----"
echo "$total assertions, $echecs échec(s)."
[ "$echecs" -eq 0 ]
