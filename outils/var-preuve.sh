#!/usr/bin/env bash
# VARELO — preuve 1:1 d'une sous-page (02/11/2026) : captures 1440 et 390, sombre et clair,
# superposition 1440 carte contre carte (outils/var-superpose.py), côte à côte 390.
# Images dans docs/refonte-metiers/comparaisons/varelo/<nom>-*.png
#   outils/var-preuve.sh <route> <dossier des captures de référence> <nom> [dx] [action js]
# Variables : REFX (x de la carte de référence, 244 Linear, 353 Plain), NOUSX (304), TAILLE (1128,836).
set -euo pipefail
route=$1; ref=$2; nom=$3; dx=${4:-0}; action=${5:-}
out=docs/refonte-metiers/comparaisons/varelo; mkdir -p "$out"
tmp=${TMPDIR:-/tmp}/var-preuve; mkdir -p "$tmp"
for t in sombre clair; do
  args=(); [ -n "$action" ] && args=(--action "$action")
  node outils/var-capture.mjs "$route" $t 1440 "$tmp/$nom-$t.png" "${args[@]}" >/dev/null
  cp "$tmp/$nom-$t.png" "$out/$nom-1440-$t-nous.png"
  if [ -f "$ref/1440-reel-$t.png" ]; then
    echo -n "1440 $t : "
    python3 -W ignore outils/var-superpose.py "$tmp/$nom-$t.png" "$ref/1440-reel-$t.png" "$out/$nom-1440-$t" --nous ${NOUSX:-304},56 --ref ${REFX:-244},8 --dx "$dx" --taille ${TAILLE:-1128,836}
  fi
  node outils/var-capture.mjs "$route" $t 390 "$tmp/$nom-390-$t.png" "${args[@]}" >/dev/null
  if [ -f "$ref/390-$t.png" ]; then
    python3 - "$ref/390-$t.png" "$tmp/$nom-390-$t.png" "$out/$nom-390-$t-cote.png" <<'PY'
import sys
from PIL import Image
a=Image.open(sys.argv[1]).convert('RGB'); b=Image.open(sys.argv[2]).convert('RGB')
if a.width == 780: a = a.resize((390, a.height // 2))
c=Image.new('RGB',(a.width+b.width+8,max(a.height,b.height)),(255,0,255)); c.paste(a,(0,0)); c.paste(b,(a.width+8,0)); c.save(sys.argv[3])
PY
  fi
done
ls "$out" | grep "^$nom-" | wc -l
