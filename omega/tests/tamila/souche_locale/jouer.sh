#!/usr/bin/env bash
# Rejoue les tests Tamila sur un PostgreSQL 16 LOCAL (jamais la recette) : base « souche » neuve,
# socle imité (01_socle.sql), socle Tamila extrait de la photographie (02, généré), les migrations
# b4_*, les aides de test d'A5 (00_installation.sql de worker-a5, sans pgTAP), un pgTAP imité
# (03_pgtap.sql), le jeu 00, puis chaque test demandé.
#
# usage : omega/tests/tamila/souche_locale/jouer.sh [14 13 …]   (par défaut : tous)
# variables : SOUCHE_DIR (répertoire de travail, par défaut un dossier temporaire), SOUCHE_PORT (54329).
# Il faut être root (initdb tourne sous l'utilisateur postgres) ; git doit voir origin/worker-a5.
set -euo pipefail
ICI="$(cd "$(dirname "$0")" && pwd)"
RACINE="$(cd "$ICI/../../../.." && pwd)"
B=/usr/lib/postgresql/16/bin
DIR="${SOUCHE_DIR:-$(mktemp -d)}"
PORT="${SOUCHE_PORT:-54329}"
mkdir -p "$DIR"
id postgres >/dev/null 2>&1 || useradd -m postgres
chown postgres "$DIR"; chmod 755 "$DIR"
if [ ! -d "$DIR/data" ]; then
  su postgres -c "$B/initdb -D '$DIR/data' -U postgres -A trust" >/dev/null
fi
if ! su postgres -c "$B/pg_ctl -D '$DIR/data' status" >/dev/null 2>&1; then
  su postgres -c "$B/pg_ctl -D '$DIR/data' -o '-p $PORT -k $DIR' -l '$DIR/log' start" >/dev/null
  sleep 2
fi
P=(psql -h "$DIR" -p "$PORT" -U postgres -q -At)
"${P[@]}" -d postgres -c "drop database if exists souche" >/dev/null
"${P[@]}" -d postgres -c "create database souche" >/dev/null
S=("${P[@]}" -d souche -v ON_ERROR_STOP=0)

charger() { # fichier, étiquette : n'affiche que les erreurs (hors « existe déjà »)
  local e
  e=$("${S[@]}" -f "$1" 2>&1 | grep -i 'error' | grep -v 'already exists' || true)
  [ -z "$e" ] || { echo "!! $2"; echo "$e" | head -20; }
}

"${S[@]}" -c "create extension if not exists pgcrypto" >/dev/null
charger "$ICI/01_socle.sql" 01_socle
python3 "$ICI/extraire.py" "$RACINE/omega/SOCLE-EXTRAITS-TAMILA.sql" > "$DIR/02_tamila.sql"
"${S[@]}" -f "$DIR/02_tamila.sql" >/dev/null 2>&1 || true   # premier passage : les politiques attendent leurs fonctions
charger "$DIR/02_tamila.sql" 02_tamila
for m in "$RACINE"/omega/modules/tamila/migrations/b4_*.sql; do charger "$m" "$(basename "$m")"; done
charger "$ICI/03_pgtap.sql" 03_pgtap
git -C "$RACINE" show origin/worker-a5:omega/tests/socle/00_installation.sql | sed -n '6,433p' > "$DIR/a5.sql"
charger "$DIR/a5.sql" a5_installation
charger "$RACINE/omega/tests/tamila/00_jeu_tamila.sql" 00_jeu

if [ "$#" -eq 0 ]; then set -- $(ls "$RACINE"/omega/tests/tamila/[0-9][0-9]_*.sql | xargs -n1 basename | cut -c1-2 | grep -v '^00$'); fi
total_ok=0; total_ko=0
for n in "$@"; do
  f=$(ls "$RACINE"/omega/tests/tamila/"$n"_*.sql)
  r=$("${S[@]}" -f "$f" 2>&1 || true)
  ok=$(grep -c '^ok' <<<"$r" || true); ko=$(grep -c 'not ok' <<<"$r" || true)
  total_ok=$((total_ok + ok)); total_ko=$((total_ko + ko))
  echo "$(basename "$f") : $ok ok, $ko en échec"
  grep -E 'not ok|ERROR' <<<"$r" | head -10 || true
done
echo "total : $total_ok ok, $total_ko en échec"
