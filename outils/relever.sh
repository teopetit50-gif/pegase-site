#!/usr/bin/env bash
# Relève une page de référence : HTML rendu + CSS compilé, puis extrait ce
# qu'on recopierait sinon à l'œil.
#
#   relever.sh <url> [dossier]
#
# Pourquoi le HTML rendu : sur un site rendu côté serveur, il contient déjà
# chaque classe finale de chaque composant, dans l'ordre du DOM. Pourquoi la
# feuille compilée : elle ne contient QUE ce que le site utilise vraiment,
# valeurs résolues comprises. C'est strictement mieux que la description d'un
# composant tirée d'un catalogue.
set -euo pipefail

URL="${1:?usage: relever.sh <url> [dossier]}"
DEST="${2:-releve}"
ICI="$(cd "$(dirname "$0")" && pwd)"
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"

mkdir -p "$DEST"
echo "→ $URL"
curl -sL -A "$UA" "$URL" -o "$DEST/index.html"
TAILLE="$(wc -c < "$DEST/index.html" | tr -d ' ')"
printf '  index.html   %s octets\n' "$TAILLE"

if [ "$TAILLE" -lt 4000 ]; then
  echo "  ⚠ page très courte : sans doute dessinée entièrement au JavaScript."
  echo "    Le curl ne suffira pas — extraire le DOM depuis un navigateur piloté"
  echo "    (squelette CDP réutilisable dans chrome.mjs)."
fi

ORIGINE="$(printf '%s' "$URL" | sed -E 's#^(https?://[^/]+).*#\1#')"

python3 - "$DEST/index.html" "$ORIGINE" > "$DEST/feuilles.txt" <<'PY'
import re, sys
from urllib.parse import urljoin
html = open(sys.argv[1], encoding='utf-8', errors='replace').read()
vues = []
for m in re.finditer(r'<link[^>]+>', html):
    if 'stylesheet' not in m.group(0):
        continue
    h = re.search(r'href="([^"]+)"', m.group(0))
    if h:
        u = urljoin(sys.argv[2] + '/', h.group(1))
        if u not in vues:
            vues.append(u)
print('\n'.join(vues))
PY

: > "$DEST/app.css"
N=0
while read -r feuille; do
  [ -z "$feuille" ] && continue
  N=$((N + 1))
  curl -sL -A "$UA" "$feuille" >> "$DEST/app.css"
  printf '\n' >> "$DEST/app.css"
done < "$DEST/feuilles.txt"
printf '  app.css      %s octets (%s feuille[s])\n' \
  "$(wc -c < "$DEST/app.css" | tr -d ' ')" "$N"

# Les styles posés en <style> dans la page comptent aussi : c'est souvent là
# que vivent les surcharges de dernière minute d'un thème.
python3 - "$DEST/index.html" >> "$DEST/app.css" <<'PY'
import re, sys
html = open(sys.argv[1], encoding='utf-8', errors='replace').read()
for m in re.finditer(r'<style[^>]*>(.*?)</style>', html, re.S):
    print(m.group(1))
PY

python3 "$ICI/extraire_css.py" "$DEST/app.css" "$DEST/extraits.txt"

echo
echo "Ensuite :"
echo "  python3 $ICI/aplatir.py $DEST/index.html > $DEST/balisage.txt   # arbre lisible"
echo "  less $DEST/extraits.txt                                          # jetons, utilitaires, keyframes"
