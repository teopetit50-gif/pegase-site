#!/usr/bin/env bash
# Rejoue les tests REPUT (C3) sur un PostgreSQL 16 LOCAL — jamais la recette, jamais la production.
# Base « souche_reput » neuve : socle imité de B4 (omega/tests/tamila/souche_locale/01_socle.sql),
# compléments REPUT (02_complements.sql : réception, envois, politiques, points… imités), migrations
# omega/modules/reput/migrations/c3_*.sql, aides de test d'A5 (00_installation.sql de worker-a5),
# pgTAP imité (03_pgtap.sql de B4), le jeu c3_00, puis chaque test demandé.
#
# usage : omega/tests/reput/souche_locale/jouer.sh [01 02 …]   (par défaut : tous)
# Il faut être root (initdb tourne sous postgres) ; git doit voir origin/worker-a5.
set -euo pipefail
ICI="$(cd "$(dirname "$0")" && pwd)"
RACINE="$(cd "$ICI/../../../.." && pwd)"
TAMILA="$RACINE/omega/tests/tamila/souche_locale"
B=/usr/lib/postgresql/16/bin
DIR="${SOUCHE_DIR:-$(mktemp -d)}"
PORT="${SOUCHE_PORT:-54331}"
mkdir -p "$DIR"
id postgres >/dev/null 2>&1 || useradd -m postgres
chown postgres "$DIR"; chmod 755 "$DIR"
[ -d "$DIR/data" ] || su postgres -c "$B/initdb -D '$DIR/data' -U postgres -A trust" >/dev/null
if ! su postgres -c "$B/pg_ctl -D '$DIR/data' status" >/dev/null 2>&1; then
  su postgres -c "$B/pg_ctl -D '$DIR/data' -o '-p $PORT -k $DIR' -l '$DIR/log' start" >/dev/null
  sleep 2
fi
P=(psql -h "$DIR" -p "$PORT" -U postgres -q -At)
"${P[@]}" -d postgres -c "drop database if exists souche_reput" >/dev/null
"${P[@]}" -d postgres -c "create database souche_reput" >/dev/null
S=("${P[@]}" -d souche_reput -v ON_ERROR_STOP=0)

charger() { # fichier, étiquette : n'affiche que les erreurs (hors « existe déjà »)
  local e
  e=$("${S[@]}" -f "$1" 2>&1 | grep -iE 'error|erreur' | grep -v -e 'already exists' -e 'pgtap' || true)
  [ -z "$e" ] || { echo "!! $2"; echo "$e" | head -20; }
}

"${S[@]}" -c "create extension if not exists pgcrypto" >/dev/null
charger "$TAMILA/01_socle.sql" 01_socle_b4
charger "$ICI/02_complements.sql" 02_complements
for m in "$RACINE"/omega/modules/reput/migrations/c3_*.sql; do charger "$m" "$(basename "$m")"; done
charger "$TAMILA/03_pgtap.sql" 03_pgtap
git -C "$RACINE" show origin/worker-a5:omega/tests/socle/00_installation.sql | sed -n '6,433p' > "$DIR/a5.sql"
charger "$DIR/a5.sql" a5_installation
charger "$RACINE/omega/tests/reput/c3_00_jeu.sql" c3_00_jeu
charger "$ICI/04_banc.sql" 04_banc

if [ "$#" -eq 0 ]; then set -- $(ls "$RACINE"/omega/tests/reput/c3_[0-9][0-9]_*.sql | xargs -n1 basename | cut -c4-5 | grep -v '^00$'); fi
total_ok=0; total_ko=0
for n in "$@"; do
  f=$(ls "$RACINE"/omega/tests/reput/c3_"$n"_*.sql)
  r=$("${S[@]}" -f "$f" 2>&1 || true)
  ok=$(grep -c '^ok' <<<"$r" || true); ko=$(grep -c 'not ok' <<<"$r" || true)
  total_ok=$((total_ok + ok)); total_ko=$((total_ko + ko))
  echo "$(basename "$f") : $ok ok, $ko en échec"
  grep -E 'not ok|ERROR|ERREUR' <<<"$r" | head -15 || true
done
echo "total : $total_ok ok, $total_ko en échec"
