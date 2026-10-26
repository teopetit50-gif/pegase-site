#!/usr/bin/env bash
# omega/prod/poser-palier-cli.sh — pose UN palier (P1 à P6) de omega/prod/migrations/ en PRODUCTION, par la CLI Supabase
# connectée sur le Mac (`db query --linked` : API de gestion, rôle postgres, aucun mot de passe ni clé à manipuler).
#
# Même déroulé que poser-palier.sh (RUNBOOK-20261026.md § 4), sans psql ni URL de base :
#   bash omega/prod/poser-palier-cli.sh P1 --essai    # tout le palier dans UNE transaction, puis ROLLBACK : rien ne reste
#   bash omega/prod/poser-palier-cli.sh P1            # pose réelle : un fichier = une transaction, arrêt au premier échec
#
# Pose réelle : chaque fichier est enveloppé dans begin … commit avec sa ligne de supabase_migrations.schema_migrations ;
# une erreur annule tout le fichier (la CLI rend le code 1 ; Postgres abandonne la transaction ouverte quand la requête
# échoue — non éprouvé sur la production, le test a été refusé le 26/10 : à vérifier au premier palier). Un fichier déjà
# inscrit est sauté : on relance après correction. lock_timeout 10 s, statement_timeout 2 min (plafond de l'API).
# Essai : si le palier dépasse ce que l'API accepte en une requête (P5 : 7,7 Mo), il échoue sans rien poser ; on passe
# alors à la pose réelle fichier par fichier, déjà éprouvée par la répétition.
set -uo pipefail

ICI="$(cd "$(dirname "$0")" && pwd)"
PALIER="${1:-}"; MODE="${2:-}"
PROJET=noepmkkplxshjbmqqxft
TRAVAIL="${TRAVAIL:-$HOME/omega-pose/travail}"; mkdir -p "$TRAVAIL"
JOURNAL="$HOME/omega-pose/pose-$(date -u +%Y%m%d).log"
requete() { npx --yes supabase@2.122.0 db query --linked --project-ref "$PROJET" "$@"; }

case "$PALIER" in
  P1) DE=00000000000000; A=20260929034413 ;;
  P2) DE=20260929034414; A=20261005182000 ;;
  P3) DE=20261005182001; A=20261005215301 ;;
  P4) DE=20261005215302; A=20261006003701 ;;
  P5) DE=20261006003702; A=99999999999999 ;;
  P6) DE=00000000000000; A=99999999999999 ;;
  *) echo "Usage : bash omega/prod/poser-palier-cli.sh P1..P6 [--essai]"; exit 2 ;;
esac
FICHIERS=()
for f in $(ls "$ICI"/migrations/*.sql | sort); do
  v=$(basename "$f" | cut -c1-14)
  cloture=0; case "$f" in *_a5_01_cloture.sql|*_environnement_production.sql) cloture=1 ;; esac
  [ "$PALIER" = P6 ] && [ $cloture = 0 ] && continue
  [ "$PALIER" != P6 ] && [ $cloture = 1 ] && continue
  [[ "$v" > "$DE" || "$v" == "$DE" ]] && [[ "$v" < "$A" || "$v" == "$A" ]] && FICHIERS+=("$f")
done
echo "Palier $PALIER ($MODE) : ${#FICHIERS[@]} fichier(s), $(basename "${FICHIERS[0]}") → $(basename "${FICHIERS[${#FICHIERS[@]}-1]}")" | tee -a "$JOURNAL"

if [ "$MODE" = "--essai" ]; then
  e="$TRAVAIL/essai-$PALIER.sql"
  { echo "begin;"; echo "set local lock_timeout = '10s';"; for f in "${FICHIERS[@]}"; do cat "$f"; echo; echo ";"; done; echo "rollback;"; } > "$e"
  debut=$(date +%s)
  if requete -f "$e" > "$TRAVAIL/essai-$PALIER.out" 2>&1; then
    echo "ESSAI VERT en $(( $(date +%s) - debut )) s : le palier passe sur les vraies données ; tout est annulé (ROLLBACK)." | tee -a "$JOURNAL"
  else
    echo "ESSAI ROUGE (rien n'est resté) : $(grep -o 'ERROR:[^"]*' "$TRAVAIL/essai-$PALIER.out" | head -2)" | tee -a "$JOURNAL"
    exit 1
  fi
  exit 0
fi

requete -f /dev/stdin <<'SQL' > /dev/null || { echo "table d'historique injoignable"; exit 1; }
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);
SQL
deja=$(requete --output-format json "select coalesce(string_agg(version, ' '), '') as v from supabase_migrations.schema_migrations" 2>/dev/null | grep -o '"v": *"[^"]*"' | sed 's/.*: *"//; s/"$//')
n=0; sautes=0; debut=$(date +%s)
for f in "${FICHIERS[@]}"; do
  base=$(basename "$f" .sql); v=${base:0:14}; nom=${base:15}
  case " $deja " in *" $v "*) sautes=$((sautes + 1)); continue ;; esac
  empreinte=$(shasum -a 256 "$f" | cut -c1-16)
  t="$TRAVAIL/$base.sql"
  { echo "begin;"; echo "set local lock_timeout = '10s';"; cat "$f"; echo; echo ";";
    echo "insert into supabase_migrations.schema_migrations (version, name, statements) values ('$v', '$nom', array['posé par poser-palier-cli.sh : omega/prod/migrations/$base.sql sha256 $empreinte']);";
    echo "commit;"; } > "$t"
  t0=$(date +%s)
  if ! requete -f "$t" > "$TRAVAIL/$base.out" 2>&1; then
    echo "ÉCHEC à $base (rien de ce fichier n'est posé ; les $n précédents le sont) : $(grep -o 'ERROR:[^"]*' "$TRAVAIL/$base.out" | head -2)" | tee -a "$JOURNAL"
    exit 1
  fi
  n=$((n + 1)); echo "  ok $base ($(( $(date +%s) - t0 )) s)" | tee -a "$JOURNAL"
done
echo "Palier $PALIER posé : $n fichier(s), $sautes déjà inscrit(s), en $(( $(date +%s) - debut )) s." | tee -a "$JOURNAL"
echo "Garde-fous :" | tee -a "$JOURNAL"
requete --output-format json -f "$ICI/garde_fous.sql" 2>/dev/null | tee "$TRAVAIL/garde-fous-$PALIER.json" | grep -E '"(controle|ok)"' | paste - - | sed 's/[",]//g' | tee -a "$JOURNAL"
