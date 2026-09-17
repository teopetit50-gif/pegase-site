#!/bin/bash
# ══════════════════════════════════════════════════════════════════════
#  POSER LES VARIABLES GOOGLE SUR VERCEL — sans les faire passer par le chat
#
#      bash outils/poser-variables-google.sh
#
#  Le script demande les trois valeurs imprimées par
#  outils/jeton-google.mjs, les envoie au projet Vercel `pegase-site2`
#  (celui qui sert omegaai.fr — PAS `pegase-site`, que le dossier .vercel
#  du dépôt désigne et qui ne sert plus rien), puis rappelle qu'un
#  changement de variable ne s'applique qu'au PROCHAIN déploiement.
#
#  Le secret et le jeton sont saisis en aveugle : ils ne s'affichent pas
#  à l'écran et ne restent nulle part sur le disque.
# ══════════════════════════════════════════════════════════════════════
set -euo pipefail

PROJET=pegase-site2
EQUIPE=teo18

DOSSIER=$(mktemp -d)
trap 'rm -rf "$DOSSIER"' EXIT
cd "$DOSSIER"

echo "→ liaison au projet $PROJET…"
npx --yes vercel@latest link --yes --project "$PROJET" --scope "$EQUIPE" >/dev/null

read -r  -p "GOOGLE_OAUTH_CLIENT_ID     : " ID
read -rs -p "GOOGLE_OAUTH_CLIENT_SECRET : " SECRET; echo
read -rs -p "GOOGLE_OAUTH_REFRESH_TOKEN : " TOKEN;  echo
read -r  -p "GOOGLE_CALENDAR_ID (Entrée = primary) : " AGENDA

poser() { # poser <NOM> <VALEUR>
  for cible in production preview; do
    printf '%s' "$2" | npx vercel env add "$1" "$cible" --scope "$EQUIPE" --force >/dev/null
  done
  echo "  ✓ $1"
}

poser GOOGLE_OAUTH_CLIENT_ID     "$ID"
poser GOOGLE_OAUTH_CLIENT_SECRET "$SECRET"
poser GOOGLE_OAUTH_REFRESH_TOKEN "$TOKEN"
[ -n "$AGENDA" ] && poser GOOGLE_CALENDAR_ID "$AGENDA"

echo
echo "Posé sur $PROJET. Un déploiement doit repartir pour que le site les voie :"
echo "dis-le-moi et je pousse, ou attends le prochain changement du site."
