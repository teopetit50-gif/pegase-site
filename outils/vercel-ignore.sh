#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════
# L'« Ignored Build Step » des six projets Vercel des sites dédiés (11/11/2026)
#
# Chaque push sur main reconstruisait les sept projets (omegaai.fr + six
# sites dédiés) : le plafond du plan gratuit (cent déploiements par
# vingt-quatre heures) a été atteint le 11/11 à 15 h 50. Vercel appelle ce
# script avant de construire ; sortie 0 = construction IGNORÉE, sortie 1 =
# construire. Réglage par projet : `bash outils/vercel-ignore.sh <cle>`.
#
# Règle : un site dédié ne se reconstruit pas quand les commits poussés ne
# touchent que les pages des AUTRES métiers, la vitrine Omega (offres,
# accueil, modèles, blog…), les briefs ou les outils. Tout le reste
# (lib/, components/site-dedie, portail, layout, dépendances, sa propre
# page) le reconstruit. Dans le doute, on construit.
# ══════════════════════════════════════════════════════════════════════
set -u
CLE="${1:-}"
case "$CLE" in
  daliro) MOI="btp|btp|btp" ;;
  lorani) MOI="architectes|architectes|architectes" ;;
  tamila) MOI="avocats|avocats|avocats" ;;
  tiroma) MOI="dentaire|dentaire|dentaire" ;;
  tavaro) MOI="location|location-automobile|location" ;;
  varelo) MOI="groupes|groupes|groupes" ;;
  *) echo "clé inconnue : $CLE → construction"; exit 1 ;;
esac
IFS='|' read -r MOI_COMP MOI_APP MOI_PUB <<<"$MOI"

# les commits à examiner : depuis le dernier déploiement réussi, sinon le dernier commit
AVANT="${VERCEL_GIT_PREVIOUS_SHA:-}"
if [ -n "$AVANT" ] && git cat-file -e "$AVANT^{commit}" 2>/dev/null; then
  FICHIERS=$(git diff --name-only "$AVANT" HEAD 2>/dev/null)
else
  FICHIERS=$(git diff --name-only HEAD^ HEAD 2>/dev/null)
fi
if [ -z "$FICHIERS" ]; then echo "diff illisible → construction"; exit 1; fi

# les dossiers des métiers (composants, pages, images) : tous les métiers connus
METIERS_COMP="architectes|architectes-nivara|avocats|btp|dentaire|groupes|hotellerie|location"
METIERS_APP="architectes|architectes-nivara|avocats|btp|dentaire|groupes|hotellerie|location-automobile"
METIERS_PUB="architectes|architectes-nivara|avocats|btp|dentaire|groupes|hotellerie|location"
# la vitrine Omega seule : pages et composants qui n'existent pas sur un site dédié
OMEGA='^(app/(blog|commencer|contact|espace3|formation|integrations|modeles|offres|omega|reserver|tarifs|vos-donnees)/|components/(offres|accueil|modeles|formation|blog|tarifs)/|docs/|outils/|\.claude/|public/(accueil-secteurs|apercus-secteurs|modeles|formation|blog)/)'

while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in *.md|*.MD|LICENCES.txt|LISEZ-MOI*) continue ;; esac
  if [[ "$f" =~ ^components/secteurs/($METIERS_COMP)/ ]]; then
    [ "${BASH_REMATCH[1]}" = "$MOI_COMP" ] && { echo "$f → ma page → construction"; exit 1; }
    continue
  fi
  if [[ "$f" =~ ^app/secteurs/($METIERS_APP)/ ]]; then
    [ "${BASH_REMATCH[1]}" = "$MOI_APP" ] && { echo "$f → ma page → construction"; exit 1; }
    continue
  fi
  if [[ "$f" =~ ^public/secteurs-($METIERS_PUB)/ ]]; then
    [ "${BASH_REMATCH[1]}" = "$MOI_PUB" ] && { echo "$f → mes images → construction"; exit 1; }
    continue
  fi
  if [[ "$f" =~ ^components/site-dedie/(entetes|pieds)/([A-Z][a-z]+)\.tsx$ ]]; then
    # la barre ou le pied d'un AUTRE site dédié ne me concerne pas
    autre=$(echo "${BASH_REMATCH[2]}" | tr '[:upper:]' '[:lower:]')
    [ "$autre" = "$CLE" ] && { echo "$f → ma barre → construction"; exit 1; }
    continue
  fi
  if [[ "$f" =~ $OMEGA ]]; then continue; fi
  echo "$f → fichier partagé → construction"; exit 1
done <<<"$FICHIERS"

echo "aucun fichier de $CLE touché → construction ignorée"
exit 0
