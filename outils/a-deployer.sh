#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# Quels projets Vercel déployer après un push sur main ? (11/11/2026, soir)
#
# Depuis le 11/11 au soir, Vercel ne déploie plus rien tout seul sur un
# push (vercel.json : git.deploymentEnabled.main = false) : sept projets
# reliés au même dépôt épuisaient le plafond gratuit (cent déploiements
# par vingt-quatre heures) en quatorze pushs. C'est la session qui a
# poussé qui crée les déploiements par l'API Vercel (outil
# create_deployment), et seulement ceux qui servent :
#   · pegase-site2 (omegaai.fr) : toujours ;
#   · chaque site dédié (daliro, lorani, tamila, tiroma, tavaro, varelo) :
#     seulement si un commit poussé le touche, selon la règle de
#     outils/vercel-ignore.sh.
#
# Usage : bash outils/a-deployer.sh <sha du dernier déploiement> [<sha à déployer>]
#   Le premier sha est celui que sert omegaai.fr aujourd'hui (list_deployments
#   de pegase-site2, champ githubCommitSha) ; le second vaut HEAD par défaut.
#   Sortie : un nom de projet par ligne. Pour chaque ligne, create_deployment
#   avec { name: <projet>, project: <projet>, target: "production",
#   gitSource: { type: "github", org: "teopetit50-gif", repo: "pegase-site",
#   ref: "main", sha: <sha à déployer> } } et forceNew = "1".
# ══════════════════════════════════════════════════════════════════════
set -u
AVANT="${1:-}"; APRES="${2:-HEAD}"
if [ -z "$AVANT" ]; then echo "usage : bash outils/a-deployer.sh <sha avant> [<sha après>]" >&2; exit 2; fi
echo "pegase-site2"
for cle in daliro lorani tamila tiroma tavaro varelo; do
  if ! VERCEL_GIT_PREVIOUS_SHA="$AVANT" VERCEL_GIT_COMMIT_SHA="$APRES" bash outils/vercel-ignore.sh "$cle" >/dev/null 2>&1; then
    echo "$cle"
  fi
done
