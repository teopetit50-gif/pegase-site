#!/usr/bin/env bash
# omega/prod/repetition-locale.sh — la répétition « voie C » (omega/prod/REPETITION-CI.md) sur le Mac, dans Docker.
#
# Même déroulé que .github/workflows/omega-repetition-ci.yml, sans GitHub : une base supabase/postgres jetable à la
# version de la production, remise « comme la production » par le relevé (omega/prod/base/), puis toute la séquence
# omega/prod/migrations/ (un fichier par transaction), les garde-fous, les tests pgTAP et le relevé détaillé du
# catalogue (omega/prod/releve.sql). Aucun secret, aucune connexion à la production ni à la recette ; pg_cron et
# pg_net sont coupés avant toute pose. Gratuit : il faut Docker (colima) et ~2 Go de disque pour l'image.
#
#   bash omega/prod/repetition-locale.sh [dossier de sortie]      # défaut : /tmp/omega-repetition
#   GARDER=1 bash omega/prod/repetition-locale.sh                  # laisse la base tourner (port 54329) pour enquêter
#
# Sortie : poses/<fichier>.txt, garde_fous.txt, tests/<fichier>.txt, releve-repetition.tsv, RESUME.txt.
set -uo pipefail

ICI="$(cd "$(dirname "$0")" && pwd)"
RACINE="$(cd "$ICI/../.." && pwd)"
SORTIE="${1:-/tmp/omega-repetition}"
IMAGE="${IMAGE:-supabase/postgres:17.6.1.155}"
NOM=omega-repetition
PORT=54329
ADMIN_URL="postgresql://supabase_admin:repetition@localhost:$PORT/postgres"
BASE_URL="postgresql://postgres:repetition@localhost:$PORT/postgres"   # le rôle de la pose en production

rm -rf "$SORTIE" && mkdir -p "$SORTIE/poses" "$SORTIE/tests"
docker rm -f "$NOM" >/dev/null 2>&1 || true
docker run -d --name "$NOM" -e POSTGRES_PASSWORD=repetition -p "$PORT:5432" "$IMAGE" >/dev/null || exit 1
fin() { [ "${GARDER:-0}" = 1 ] || docker rm -f "$NOM" >/dev/null 2>&1; }
trap fin EXIT
for _ in $(seq 1 90); do psql "$ADMIN_URL" -XAtc 'select 1' >/dev/null 2>&1 && break; sleep 2; done
psql "$ADMIN_URL" -XAtc 'select version()' > "$SORTIE/version.txt" || { echo "base injoignable"; exit 1; }

# 1. pg_cron et pg_net coupés avant toute pose (identique au workflow).
psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -X -q <<'SQL' || exit 1
  create extension if not exists pg_cron;
  create extension if not exists pg_net with schema extensions;
  create schema if not exists repetition;
  create or replace function repetition.cron_inactif() returns trigger language plpgsql as $$
  begin new.active := false; return new; end $$;
  create trigger repetition_cron_inactif before insert or update on cron.job
    for each row execute function repetition.cron_inactif();
  do $$ begin
    if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
      create publication supabase_realtime;
    end if;
    alter publication supabase_realtime owner to postgres;
  end $$;
  update cron.job set active = false where active;
  do $$ declare r record; begin
    for r in select p.oid::regprocedure as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'net' and p.proname in ('http_get', 'http_post', 'http_delete') loop
      execute format('revoke execute on function %s from public, postgres, anon, authenticated, service_role', r.f);
    end loop;
  end $$;
SQL

# 2. Relevé de la production, puis la séquence, un fichier par transaction ; arrêt au premier échec.
n=0; debut=$(date +%s); echec=""
for f in $(ls "$ICI"/base/0[0-9]_*.sql | sort) $(ls "$ICI"/migrations/*.sql | sort); do
  nom=$(basename "$f" .sql)
  t0=$(date +%s)
  url="$BASE_URL"; case "$f" in "$ICI"/base/00_*|"$ICI"/base/01_*) url="$ADMIN_URL" ;; esac
  if [ "$nom" = 02_schema ]; then
    grep 'FOR ROLE supabase_admin' "$f" | psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -X -q -1 -f - > "$SORTIE/poses/02_admin.txt" 2>&1 || { echo "02 (supabase_admin) en échec"; exit 1; }
    grep -v 'FOR ROLE supabase_admin' "$f" > "$SORTIE/02_postgres.sql"; f="$SORTIE/02_postgres.sql"
  fi
  if ! psql "$url" -v ON_ERROR_STOP=1 -X -q -1 -f "$f" > "$SORTIE/poses/$nom.txt" 2>&1; then
    echec="$nom"; break
  fi
  echo "$nom $(( $(date +%s) - t0 ))s" >> "$SORTIE/durees.txt"
  n=$((n + 1))
done
{
  echo "Image : $IMAGE ; $(cat "$SORTIE/version.txt")"
  echo "Posés : $n fichier(s) en $(( $(date +%s) - debut )) s."
  [ -n "$echec" ] && { echo "ÉCHEC à $echec :"; tail -15 "$SORTIE/poses/$echec.txt"; }
} | tee "$SORTIE/RESUME.txt"
[ -n "$echec" ] && exit 1

# 3. Rien n'est parti.
actifs=$(psql "$ADMIN_URL" -XAtc "select count(*) from cron.job where active")
partis=$(psql "$ADMIN_URL" -XAtc "select case when to_regclass('net._http_response') is null then 0 else (select count(*) from net._http_response) end")
recette=$(psql "$ADMIN_URL" -XAtc "select count(*) from cron.job where command like '%ygwbgpowzlbdaajlsqkn%'")
echo "Crons actifs : $actifs ; réponses pg_net : $partis ; crons vers la recette : $recette." | tee -a "$SORTIE/RESUME.txt"

# 4. Garde-fous.
psql "$ADMIN_URL" -X -At -F ' | ' -f "$ICI/garde_fous.sql" > "$SORTIE/garde_fous.txt" 2>&1
echo "Garde-fous rouges : $(awk -F ' [|] ' '$4 == "f"' "$SORTIE/garde_fous.txt" | wc -l | tr -d ' ')" | tee -a "$SORTIE/RESUME.txt"

# 5. Tests pgTAP, un fichier par appel (ceux qui supposent le banc de la recette sont sans objet).
psql "$ADMIN_URL" -X -q -c "create extension if not exists pgtap with schema extensions" -c "create schema if not exists tests" >/dev/null
sed 's/^create extension if not exists pgtap with schema extensions;/-- (pgTAP déjà présent)/' "$RACINE/omega/tests/socle/00_installation.sql" |
  psql "$ADMIN_URL" -X -q -f - > "$SORTIE/tests/00_installation.txt" 2>&1
total=0; ko=0; so=0
for f in "$RACINE"/omega/tests/socle/[0-9][0-9]_*.sql "$RACINE"/omega/tests/socle/19[a-z]*.sql "$RACINE"/omega/tests/{filed,identite,varelo,tavaro,tiroma,tamila,lorani,daliro,cashd,reput,offload}/*.sql; do
  [ -f "$f" ] || continue
  case "$(basename "$f")" in 00_installation.sql|TOUT*.sql) continue ;; esac
  nom="$(basename "$(dirname "$f")")_$(basename "$f" .sql)"
  if grep -qE 'cccccccc-0000-4000-8000-00000000000c|banc-varelo' "$f"; then so=$((so + 1)); continue; fi
  psql "$ADMIN_URL" -X -q -At -c "set statement_timeout = '110s'" -f "$f" > "$SORTIE/tests/$nom.txt" 2>&1 || true
  n_ok=$(grep -c '^ok ' "$SORTIE/tests/$nom.txt" || true)
  n_ko=$(grep -cE '^not ok |ERROR' "$SORTIE/tests/$nom.txt" || true)
  total=$((total + n_ok + n_ko)); ko=$((ko + n_ko))
  [ "$n_ko" -gt 0 ] && echo "$nom : $n_ko rouge(s)" >> "$SORTIE/tests_rouges.txt"
done
echo "Tests : $total résultats, $ko rouges, $so fichiers sans objet." | tee -a "$SORTIE/RESUME.txt"

# 6. Relevé détaillé du catalogue (même requête que pour la production et la recette), après retrait des tests.
psql "$ADMIN_URL" -X -q -c "drop schema if exists tests cascade" -c "drop extension if exists pgtap" \
  -c "create schema if not exists supabase_migrations" \
  -c "create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text)" \
  -c "grant usage on schema supabase_migrations to postgres" -c "grant select on supabase_migrations.schema_migrations to postgres" >/dev/null 2>&1
PGOPTIONS='-c search_path="$user",public,extensions' psql "$BASE_URL" -X -At -f "$ICI/releve.sql" > "$SORTIE/releve-repetition.tsv" 2>&1
echo "Relevé : $(wc -l < "$SORTIE/releve-repetition.tsv" | tr -d ' ') objets → $SORTIE/releve-repetition.tsv" | tee -a "$SORTIE/RESUME.txt"
