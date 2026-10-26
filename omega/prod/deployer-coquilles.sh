#!/usr/bin/env bash
# omega/prod/deployer-coquilles.sh — déploie en PRODUCTION les coquilles Edge de omega/prod/coquilles/ (RUNBOOK § 5).
#
# Lancé par Teo seulement, après le palier P6 et une fois ses secrets posés. Il faut être connecté à la CLI Supabase
# (npx --yes supabase@2.122.0 login) avec un compte qui a accès à omega-core-eu.
#
#   bash omega/prod/deployer-coquilles.sh                       # toutes celles de coquilles/LISTE.txt
#   bash omega/prod/deployer-coquilles.sh expediteur reception  # seulement celles-là
#
# verify_jwt suit LISTE.txt (« false » : la fonction se garde elle-même : jeton, signature Meta/Twilio, état OAuth).
set -euo pipefail
ICI="$(cd "$(dirname "$0")" && pwd)"
PROJET=noepmkkplxshjbmqqxft
TRAVAIL="$(mktemp -d)"; trap 'rm -rf "$TRAVAIL"' EXIT
mkdir -p "$TRAVAIL/supabase/functions"
choix=("$@"); [ ${#choix[@]} -eq 0 ] && choix=($(awk '{print $1}' "$ICI/coquilles/LISTE.txt"))
cd "$TRAVAIL"
for f in "${choix[@]}"; do
  jwt=$(awk -v f="$f" '$1 == f { print $2 }' "$ICI/coquilles/LISTE.txt")
  [ -n "$jwt" ] || { echo "inconnue : $f"; exit 2; }
  cp -R "$ICI/coquilles/$f" "supabase/functions/$f"
  options=(--project-ref "$PROJET" --import-map "supabase/functions/$f/deno.json")
  [ "$jwt" = false ] && options+=(--no-verify-jwt)
  echo "→ $f (verify_jwt $jwt) : $(grep -o 'pegase-site/[0-9a-f]\{8\}' "supabase/functions/$f/index.ts")"
  npx --yes supabase@2.122.0 functions deploy "$f" "${options[@]}"
done
echo "Vérifier : liste des fonctions Edge de omega-core-eu (versions), puis un appel à la main de chacune (RUNBOOK § 5)."
