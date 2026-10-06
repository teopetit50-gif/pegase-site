#!/usr/bin/env bash
# omega/prod/repetition.sh — la répétition générale de la mise en production (MISE-EN-PRODUCTION.md, étape 2).
# A5, 06/10/2026. Mode d'emploi : omega/prod/repetition.md. À lancer par la session qui a les droits (Teo, ou une
# session autorisée), sur une COPIE de la production : une branche Supabase avec « Include data », ou une restauration
# de la sauvegarde dans un projet jetable. Jamais sur la recette, jamais sur la production : le script refuse les deux.
#
# Variables (export avant de lancer) :
#   REPETITION_REF          référence du projet de répétition (20 lettres minuscules)
#   REPETITION_DB_URL       URL postgres de la répétition (rôle postgres), pour psql et `supabase db push --db-url`
#   SUPABASE_ACCESS_TOKEN   jeton de la CLI Supabase (fonctions Edge, secrets)
#   OMEGA_PAGES             dossier des pages de exporter.sql (défaut omega/prod/sortie)
#   OMEGA_EMPREINTE_RECETTE fichier d'empreinte de la recette au gel (défaut : le plus récent de omega/prod/empreintes/)
#   OMEGA_TRAVAIL           dossier de travail (défaut /tmp/omega-repetition-<ref>)
#   Secrets Edge (facultatifs, jamais affichés) : voir SECRETS plus bas ; seuls ceux présents dans l'environnement
#   sont posés. Pour la répétition, NE PAS fournir BREVO_API_KEY ni META_* : aucun message ne doit partir.
#
# Sous-commandes, dans l'ordre :
#   verifier · securiser · relever · preparer · empreinte avant · pousser <version|tout> · controles · edge · secrets
#   · tests · empreinte apres · comparer · restaurer-fonctions · rapport
set -euo pipefail

RECETTE=ygwbgpowzlbdaajlsqkn
PRODUCTION=noepmkkplxshjbmqqxft
DEPOT=teopetit50-gif/pegase-site
ICI="$(cd "$(dirname "$0")" && pwd)"
RACINE="$(cd "$ICI/../.." && pwd)"
REF="${REPETITION_REF:-}"
TRAVAIL="${OMEGA_TRAVAIL:-/tmp/omega-repetition-${REF:-sans-ref}}"
PAGES="${OMEGA_PAGES:-$ICI/sortie}"
JOURNAL="$TRAVAIL/journal.txt"

# Fonctions Edge : nom déployé | dossier source | SHA du code | SHA de _partage (vide si sans @partage) | verify_jwt
FONCTIONS=(
  "lecteur|lecteur|0d547318d1f4c7f57763b2d3128d1eb631811762|0d547318d1f4c7f57763b2d3128d1eb631811762|true"
  "lecteur-exports|lecteur-exports|d963121419b014081fc5155c8e01151b8fd76deb|d963121419b014081fc5155c8e01151b8fd76deb|true"
  "expediteur|expediteur|67f9cf677d306f4e82ce66dde0485602ee5e8956||true"
  "webhooks-brevo|webhooks/brevo|87a1112||false"
  "reception|reception|4114a69||false"
  "identite|identite|e77fabb|7425991|true"
)
# Secrets Edge, par nom (MISE-EN-PRODUCTION.md § 2). Valeurs lues dans l'environnement, jamais affichées ni écrites
# ailleurs qu'un fichier temporaire 600 effacé aussitôt.
SECRETS=(AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_REGION BEDROCK_MODEL_ID MISTRAL_API_KEY PLAFOND_IA_JOUR_CLIENT_EUR
         BREVO_API_KEY BREVO_WEBHOOK_JETON META_VERIFY_TOKEN META_APP_SECRET META_ACCESS_TOKEN FORMULAIRE_SECRET
         FORMULAIRE_BOITE SIRENE_API_KEY IDENTITE_CACHE_JOURS IDENTITE_BALAYAGE_JOURS IDENTITE_BALAYAGE_MAX)

dire() { mkdir -p "$TRAVAIL"; printf '%s  %s\n' "$(date -u +%H:%M:%SZ)" "$*" | tee -a "$JOURNAL"; }
arret() { dire "ARRÊT : $*"; exit 1; }
psqlr() { psql "$REPETITION_DB_URL" -v ON_ERROR_STOP=1 -X -q "$@"; }

garde() {
  [[ "$REF" =~ ^[a-z]{20}$ ]] || arret "REPETITION_REF absente ou invalide"
  [[ "$REF" != "$RECETTE" ]] || arret "la recette n'est pas une répétition"
  [[ "$REF" != "$PRODUCTION" ]] || arret "la production n'est pas une répétition : ce script ne la touche jamais"
  [[ -n "${REPETITION_DB_URL:-}" ]] || arret "REPETITION_DB_URL absente"
  [[ "$REPETITION_DB_URL" != *"$PRODUCTION"* && "$REPETITION_DB_URL" != *"$RECETTE"* ]] || arret "REPETITION_DB_URL désigne la recette ou la production"
  [[ "$REPETITION_DB_URL" == *"$REF"* ]] || arret "REPETITION_DB_URL ne désigne pas $REF"
  mkdir -p "$TRAVAIL"
}

cmd_verifier() {
  garde
  for o in psql node git supabase; do command -v "$o" >/dev/null || arret "outil manquant : $o"; done
  dire "CLI Supabase : $(supabase --version 2>/dev/null | head -1)"
  [[ -z "$(git -C "$RACINE" status --porcelain -- omega/prod omega/tests omega/migrations omega/modules)" ]] || arret "arbre modifié sous omega/ : partir d'un tag propre"
  dire "Dépôt : $(git -C "$RACINE" describe --tags --always) ; répétition : $REF"
  psqlr -At -c "select 'base ' || current_database() || ', ' || (select count(*) from supabase_migrations.schema_migrations) || ' migrations, dernière ' || (select max(version) from supabase_migrations.schema_migrations)" | tee -a "$JOURNAL"
  psqlr -At -c "select 'copie de la production : ' || (exists (select 1 from cron.job where command like '%$PRODUCTION%'))::text" | tee -a "$JOURNAL"
}

# Avant tout : rien ne doit partir d'une copie qui porte les données de la production.
cmd_securiser() {
  garde
  psqlr -At -c "select jobid, jobname, active from cron.job order by jobname" > "$TRAVAIL/crons-avant.txt"
  psqlr -c "select cron.alter_job(jobid, active := false) from cron.job where active"
  psqlr -c "do \$\$ begin
    if to_regclass('private.reglages') is not null then
      update private.reglages set valeur = 'oui' where cle = 'envois_arret_general';
      if not found then insert into private.reglages (cle, valeur) values ('envois_arret_general', 'oui'); end if;
    end if; end \$\$"
  dire "Sécurisé : $(grep -c . "$TRAVAIL/crons-avant.txt") crons désactivés (état d'origine dans crons-avant.txt), arrêt général des envois posé."
}

# Relevé d'avant pose, pour s'exercer au retour arrière (MISE-EN-PRODUCTION.md § 5).
cmd_relever() {
  garde
  mkdir -p "$TRAVAIL/releve"
  psqlr -At -c "select string_agg(pg_get_functiondef(p.oid) || ';', E'\n\n' order by p.oid::regprocedure::text)
                from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where n.nspname in ('public', 'private') and p.prokind in ('f', 'p')" > "$TRAVAIL/releve/fonctions.sql"
  psqlr -At -c "select p.oid::regprocedure::text || ' ' || md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where n.nspname in ('public', 'private') and p.prokind in ('f', 'p') order by 1" > "$TRAVAIL/releve/fonctions.md5"
  psqlr -At -c "select jobname || ' | ' || schedule || ' | ' || command from cron.job order by 1" > "$TRAVAIL/releve/crons.txt"
  psqlr -At -c "select schemaname || '.' || tablename from pg_publication_tables where pubname = 'supabase_realtime' order by 1" > "$TRAVAIL/releve/publication.txt"
  dire "Relevé d'avant pose : $(wc -l < "$TRAVAIL/releve/fonctions.md5") fonctions, $(wc -l < "$TRAVAIL/releve/crons.txt") crons."
}

# Assemble les migrations, URL réécrites vers la répétition, et les place dans un projet Supabase de travail.
cmd_preparer() {
  garde
  ls "$PAGES"/*.json >/dev/null 2>&1 || arret "aucune page d'export dans $PAGES"
  rm -rf "$TRAVAIL/projet"; mkdir -p "$TRAVAIL/projet/supabase/migrations" "$TRAVAIL/projet/supabase/functions"
  printf 'project_id = "%s"\n' "$REF" > "$TRAVAIL/projet/supabase/config.toml"
  OMEGA_SORTIE_MIGRATIONS="$TRAVAIL/assemblees" node "$ICI/assembler.mjs" --cloture --projet="$REF" "$PAGES"/*.json \
    || arret "assembleur en échec (code $?) : lire $TRAVAIL/assemblees/MANIFESTE.md"
  cp "$TRAVAIL/assemblees/"*.sql "$TRAVAIL/projet/supabase/migrations/"
  # Repères pour les versions déjà en base : db push ne doit ni les rejouer ni s'étonner de leur absence.
  psqlr -At -F'|' -c "select version, name from supabase_migrations.schema_migrations order by version" |
  while IFS='|' read -r v n; do
    ls "$TRAVAIL/projet/supabase/migrations/${v}_"*.sql >/dev/null 2>&1 && continue
    printf -- '-- %s %s : déjà posée sur cette base (repère pour db push, rien à exécuter).\nselect 1;\n' "$v" "$n" \
      > "$TRAVAIL/projet/supabase/migrations/${v}_deja_posee.sql"
  done
  dire "Préparé : $(ls "$TRAVAIL/assemblees/"*.sql | wc -l) migrations à poser, $(ls "$TRAVAIL/projet/supabase/migrations/"*_deja_posee.sql 2>/dev/null | wc -l) repères."
}

cmd_empreinte() {
  garde
  local quand="${1:?avant ou apres}"
  psqlr -At -F' | ' -f "$ICI/empreinte.sql" > "$TRAVAIL/empreinte-$quand.txt"
  dire "Empreinte $quand : $(wc -l < "$TRAVAIL/empreinte-$quand.txt") catégories (empreinte-$quand.txt)."
}

# Pose jusqu'à une version incluse (un palier P2…P5), ou tout. Toujours un --dry-run relu d'abord.
cmd_pousser() {
  garde
  local jusqua="${1:?version de palier ou « tout »}"
  local d="$TRAVAIL/pousse"; rm -rf "$d"; mkdir -p "$d/supabase/migrations"
  cp "$TRAVAIL/projet/supabase/config.toml" "$d/supabase/"
  for f in "$TRAVAIL/projet/supabase/migrations/"*.sql; do
    local v; v="$(basename "$f" | cut -c1-14)"
    if [[ "$jusqua" == tout || "$v" < "$jusqua" || "$v" == "$jusqua" ]]; then cp "$f" "$d/supabase/migrations/"; fi
  done
  dire "Essai à blanc jusqu'à $jusqua :"
  supabase db push --workdir "$d" --db-url "$REPETITION_DB_URL" --include-all --dry-run 2>&1 | tee -a "$JOURNAL"
  read -r -p "Poser ces migrations sur la répétition $REF ? (oui/non) " r
  [[ "$r" == oui ]] || arret "pose refusée"
  supabase db push --workdir "$d" --db-url "$REPETITION_DB_URL" --include-all --yes 2>&1 | tee -a "$JOURNAL"
  dire "Posé jusqu'à $jusqua."
  cmd_controles
}

cmd_controles() {
  garde
  psqlr -At -F' | ' -f "$ICI/garde_fous.sql" | tee "$TRAVAIL/garde-fous-$(date -u +%H%M%S).txt" | tee -a "$JOURNAL"
  ! grep -q ' | f | ' "$TRAVAIL"/garde-fous-*.txt 2>/dev/null || dire "ATTENTION : au moins un garde-fou est faux (ligne « | f | »)."
}

# Coquilles Edge figées sur un SHA (deno.json : imports du dossier source, chemins relatifs vers raw.githubusercontent).
cmd_edge() {
  garde
  [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]] || arret "SUPABASE_ACCESS_TOKEN absent"
  local base="$TRAVAIL/projet/supabase/functions"
  for ligne in "${FONCTIONS[@]}"; do
    IFS='|' read -r nom dossier sha partage jwt <<< "$ligne"
    sha="$(git -C "$RACINE" rev-parse "$sha^{commit}")"
    [[ -n "$partage" ]] && partage="$(git -C "$RACINE" rev-parse "$partage^{commit}")"
    mkdir -p "$base/$nom"
    printf 'import "https://raw.githubusercontent.com/%s/%s/omega/functions/%s/index.ts";\n' "$DEPOT" "$sha" "$dossier" > "$base/$nom/index.ts"
    git -C "$RACINE" show "$sha:omega/functions/$dossier/deno.json" |
      DEPOT="$DEPOT" SHA="$sha" PARTAGE="${partage:-$sha}" DOSSIER="$dossier" node -e '
        const s = JSON.parse(require("fs").readFileSync(0, "utf8"));
        const imports = {};
        for (const [k, v] of Object.entries(s.imports || {})) {
          if (v.startsWith("../")) {
            const cible = v.replace(/^\.\.\//, "");
            const sha = k === "@partage/" ? process.env.PARTAGE : process.env.SHA;
            imports[k] = `https://raw.githubusercontent.com/${process.env.DEPOT}/${sha}/omega/functions/${cible}`;
          } else imports[k] = v;
        }
        process.stdout.write(JSON.stringify({ imports }, null, 2) + "\n");' > "$base/$nom/deno.json"
    local opt=(); [[ "$jwt" == false ]] && opt=(--no-verify-jwt)
    supabase functions deploy "$nom" --project-ref "$REF" --workdir "$TRAVAIL/projet" --import-map "$base/$nom/deno.json" "${opt[@]}" 2>&1 | tee -a "$JOURNAL"
    dire "Edge $nom : coquille sur $sha (verify_jwt $jwt)."
  done
}

cmd_secrets() {
  garde
  local f; f="$(mktemp)"; chmod 600 "$f"; local n=0
  for s in "${SECRETS[@]}"; do
    if [[ -n "${!s:-}" ]]; then printf '%s=%s\n' "$s" "${!s}" >> "$f"; n=$((n + 1)); dire "secret $s : posé (valeur non affichée)"; else dire "secret $s : absent (non posé)"; fi
  done
  if (( n > 0 )); then supabase secrets set --project-ref "$REF" --env-file "$f" 2>&1 | grep -v '=' | tee -a "$JOURNAL"; fi
  rm -f "$f"
  dire "Vault : poser à la main le secret « cle_service » (clé de service de $REF) avant de réactiver les crons."
}

# Suites pgTAP, un fichier par appel. Un fichier qui suppose le banc de la recette est « sans objet » ici.
cmd_tests() {
  garde
  local sortie="$TRAVAIL/tests"; mkdir -p "$sortie"
  psqlr -c "do \$\$ begin if not exists (select 1 from pg_proc where proname = 'runtests') then
              create extension if not exists pgtap with schema extensions; end if; end \$\$" -c "create schema if not exists tests"
  # pgTAP déjà là (extension ou chargé à la main) : la ligne « create extension pgtap » de 00 est neutralisée, comme lancer.sh.
  sed 's/^create extension if not exists pgtap with schema extensions;/-- (pgTAP déjà présent)/' "$RACINE/omega/tests/socle/00_installation.sql" |
    psqlr -f - > "$sortie/00_installation.txt" 2>&1 || arret "00_installation en échec : $sortie/00_installation.txt"
  local total=0 ko=0 so=0
  for f in "$RACINE"/omega/tests/socle/[0-9][0-9]_*.sql "$RACINE"/omega/tests/socle/19[a-z]*.sql "$RACINE"/omega/tests/{filed,identite,varelo,tavaro,tiroma,tamila,lorani,daliro}/*.sql; do
    [[ -f "$f" ]] || continue
    case "$(basename "$f")" in 00_installation.sql|TOUT*.sql) continue ;; esac
    local nom; nom="$(basename "$(dirname "$f")")/$(basename "$f" .sql)"
    if grep -qE 'cccccccc-0000-4000-8000-00000000000c|banc-varelo' "$f"; then
      echo "sans objet (banc de recette)" > "$sortie/${nom//\//_}.txt"; so=$((so + 1)); continue
    fi
    psql "$REPETITION_DB_URL" -X -q -At -c "set statement_timeout = '110s'" -f "$f" > "$sortie/${nom//\//_}.txt" 2>&1 || true
    local n_ok n_ko; n_ok=$(grep -c '^ok ' "$sortie/${nom//\//_}.txt" || true); n_ko=$(grep -cE '^not ok |ERROR' "$sortie/${nom//\//_}.txt" || true)
    total=$((total + n_ok + n_ko)); ko=$((ko + n_ko))
    printf '%-55s ok %3s  rouge %3s\n' "$nom" "$n_ok" "$n_ko" | tee -a "$JOURNAL"
  done
  dire "Tests : $total résultats, $ko rouges, $so fichiers sans objet (banc). Détail : $sortie/."
}

cmd_comparer() {
  local ref="${OMEGA_EMPREINTE_RECETTE:-$(ls -t "$ICI"/empreintes/recette-*.txt | head -1)}"
  dire "Comparaison avec $(basename "$ref") :"
  diff <(grep -v '^#' "$ref" | sort) <(sort "$TRAVAIL/empreinte-apres.txt") | tee -a "$JOURNAL" && dire "EMPREINTES IDENTIQUES." \
    || dire "Écarts ci-dessus : détailler la catégorie avec empreinte.sql (niveau 'detail')."
}

# Exercice de retour arrière : rejoue la définition d'avant pose des fonctions que la pose a changées, puis relève.
cmd_restaurer_fonctions() {
  garde
  psqlr -At -c "select p.oid::regprocedure::text || ' ' || md5(pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                where n.nspname in ('public', 'private') and p.prokind in ('f', 'p') order by 1" > "$TRAVAIL/releve/fonctions-apres.md5"
  local changees; changees=$(comm -23 <(sort "$TRAVAIL/releve/fonctions.md5") <(sort "$TRAVAIL/releve/fonctions-apres.md5") | cut -d' ' -f1 | sort -u | wc -l)
  dire "$changees fonction(s) changée(s) par la pose ; rejeu de leur définition d'avant (exercice, sur la répétition seulement)."
  psqlr -f "$TRAVAIL/releve/fonctions.sql" > /dev/null
  dire "Définitions d'avant rejouées. Rejouer « pousser tout » ne les rétablira pas (versions déjà inscrites) : c'est la leçon de l'exercice — en production, le retour se fait par la sauvegarde ou par un lot correctif."
}

cmd_rapport() {
  dire "Rapport : $JOURNAL ; assemblage $TRAVAIL/assemblees/MANIFESTE.md ; tests $TRAVAIL/tests ; empreintes $TRAVAIL/empreinte-*.txt"
  dire "Démontage : supprimer la branche (tableau de bord, ou supabase branches delete) ou le projet jetable. Rien d'autre n'a été touché."
}

case "${1:-}" in
  verifier) cmd_verifier ;; securiser) cmd_securiser ;; relever) cmd_relever ;; preparer) cmd_preparer ;;
  empreinte) cmd_empreinte "${2:-}" ;; pousser) cmd_pousser "${2:-}" ;; controles) cmd_controles ;; edge) cmd_edge ;;
  secrets) cmd_secrets ;; tests) cmd_tests ;; comparer) cmd_comparer ;; restaurer-fonctions) cmd_restaurer_fonctions ;;
  rapport) cmd_rapport ;;
  *) sed -n '2,24p' "$0"; exit 2 ;;
esac
