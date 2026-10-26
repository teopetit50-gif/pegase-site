#!/usr/bin/env bash
# omega/prod/poser-palier.sh — pose UN palier (P1 à P6) de omega/prod/migrations/ sur une base, fichier par fichier.
#
# Lancé par Teo (ou la session qu'il autorise) depuis son Mac, jamais par une session de travail. Voir RUNBOOK-20261026.md.
#
#   export BASE_URL='postgresql://postgres.<ref>:<mot de passe>@<hôte>:5432/postgres'   # jamais commitée, jamais affichée
#   bash omega/prod/poser-palier.sh P1 --essai     # tout le palier dans UNE transaction, puis ROLLBACK : rien ne reste
#   bash omega/prod/poser-palier.sh P1             # pose réelle : un fichier = une transaction, arrêt au premier échec
#
# Pose réelle : chaque fichier et sa ligne de supabase_migrations.schema_migrations partent dans la même transaction ; un
# fichier déjà inscrit est sauté (on peut relancer après un échec corrigé). lock_timeout 10 s : un verrou que le site
# tient ne bloque pas la pose plus de 10 s, le fichier échoue proprement et rien n'est posé. Garde-fous à la fin.
set -uo pipefail

ICI="$(cd "$(dirname "$0")" && pwd)"
PALIER="${1:-}"; MODE="${2:-}"
: "${BASE_URL:?BASE_URL manque (URL de la base cible, à ne jamais commiter)}"
case "$BASE_URL" in *ygwbgpowzlbdaajlsqkn*) echo "Refus : c'est la recette."; exit 2 ;; esac

# Bornes des paliers (versions incluses) : omega/prod/migrations/PALIERS.md.
case "$PALIER" in
  P1) DE=00000000000000; A=20260929034413 ;;
  P2) DE=20260929034414; A=20261005182000 ;;
  P3) DE=20261005182001; A=20261005215301 ;;
  P4) DE=20261005215302; A=20261006003701 ;;
  P5) DE=20261006003702; A=20261025151751 ;;
  P6) DE=20261025151752; A=99999999999999 ;;
  *) echo "Usage : bash omega/prod/poser-palier.sh P1..P6 [--essai]"; exit 2 ;;
esac
FICHIERS=()
for f in $(ls "$ICI"/migrations/*.sql | sort); do
  v=$(basename "$f" | cut -c1-14)
  [[ "$v" > "$DE" || "$v" == "$DE" ]] && [[ "$v" < "$A" || "$v" == "$A" ]] && FICHIERS+=("$f")
done
echo "Palier $PALIER : ${#FICHIERS[@]} fichier(s), $(basename "${FICHIERS[0]}") → $(basename "${FICHIERS[${#FICHIERS[@]}-1]}")"
echo "Base : $(psql "$BASE_URL" -XAtc "select current_database() || ' sur ' || inet_server_addr() || ', ' || version()" | cut -c1-90)"
export PGOPTIONS="-c lock_timeout=10s -c statement_timeout=15min"

if [ "$MODE" = "--essai" ]; then
  args=(-c "begin")
  for f in "${FICHIERS[@]}"; do args+=(-f "$f"); done
  args+=(-f "$ICI/garde_fous.sql" -c "rollback")
  debut=$(date +%s)
  if psql "$BASE_URL" -v ON_ERROR_STOP=1 -X -q "${args[@]}" > "/tmp/essai-$PALIER.txt" 2>&1; then
    echo "ESSAI VERT en $(( $(date +%s) - debut )) s : tout le palier passe sur les vraies données ; tout a été annulé (ROLLBACK)."
    awk -F ' [|] ' 'NF >= 4' "/tmp/essai-$PALIER.txt" | tail -20
  else
    echo "ESSAI ROUGE (annulé, rien n'est resté) :"; grep -m3 -E 'ERROR|ERREUR|psql:' "/tmp/essai-$PALIER.txt"
    exit 1
  fi
  exit 0
fi

psql "$BASE_URL" -X -q -c "create schema if not exists supabase_migrations" \
  -c "create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text)" >/dev/null
n=0; sautes=0; debut=$(date +%s)
for f in "${FICHIERS[@]}"; do
  base=$(basename "$f" .sql); v=${base:0:14}; nom=${base:15}
  if [ "$(psql "$BASE_URL" -XAtc "select count(*) from supabase_migrations.schema_migrations where version = '$v'")" != 0 ]; then
    sautes=$((sautes + 1)); continue
  fi
  empreinte=$(shasum -a 256 "$f" | cut -c1-16)
  t0=$(date +%s)
  if ! psql "$BASE_URL" -v ON_ERROR_STOP=1 -X -q -1 -f "$f" \
       -c "insert into supabase_migrations.schema_migrations (version, name, statements) values ('$v', '$nom', array['posé par poser-palier.sh : omega/prod/migrations/$base.sql sha256 $empreinte'])" \
       > "/tmp/pose-$base.txt" 2>&1; then
    echo "ÉCHEC à $base (rien de ce fichier n'est posé ; les $n précédents le sont) :"
    grep -m3 -E 'ERROR|ERREUR' "/tmp/pose-$base.txt"
    exit 1
  fi
  n=$((n + 1)); echo "  ok $base ($(( $(date +%s) - t0 )) s)"
done
echo "Palier $PALIER posé : $n fichier(s), $sautes déjà inscrit(s), en $(( $(date +%s) - debut )) s."
echo "Garde-fous :"
psql "$BASE_URL" -X -At -F ' | ' -f "$ICI/garde_fous.sql" | awk -F ' [|] ' '{ print ($4 == "f" ? "  ROUGE " : "  vert  ") $1 }'
echo "Crons actifs : $(psql "$BASE_URL" -XAtc "select count(*) from cron.job where active") ; vers la recette : $(psql "$BASE_URL" -XAtc "select count(*) from cron.job where command like '%ygwbgpowzlbdaajlsqkn%'")"
