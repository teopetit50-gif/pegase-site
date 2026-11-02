#!/usr/bin/env bash
# Tiroma (02/11/2026) : les images de la preuve 1:1 d'une sous-page, dans
# docs/refonte-metiers/comparaisons/tiroma/. Serveur `npx next dev -p 3100` lancé.
#   outils/tir-preuve.sh <chemin> <nom> <dossier des captures de référence> <fenêtre LxH> <carte nous X,Y,L,H> <carte ref X,Y,L,H> [suffixe ref sombre] [suffixe ref clair]
# [préfixe 390, ex. « 390 » → 390-<thème>.png ; « 390-fil-ouvert » → 390-<thème>-fil-ouvert.png]
# Produit : <nom>-1440-<thème>-cote.png (fenêtres 1440×900 côte à côte), <nom>-carte-<thème>-{cote,diff,fusion}.png
# (carte contre carte, fenêtre aux dimensions de la carte de référence), <nom>-390-<thème>-cote.png.
set -euo pipefail
chemin=$1; nom=$2; refs=$3; fen=$4; cn=$5; cr=$6; rs=${7:-1440-reel-sombre.png}; rc=${8:-1440-reel-clair.png}; r390=${9:-390}
out=docs/refonte-metiers/comparaisons/tiroma; tmp=$(mktemp -d); mkdir -p "$out"
url="http://localhost:3100$chemin"
L=${fen%x*}; H=${fen#*x}
for t in sombre clair; do
  s=$([ $t = sombre ] && echo dark || echo light); ref=$([ $t = sombre ] && echo "$refs/$rs" || echo "$refs/$rc")
  node outils/tir-capture.mjs "$url" "$tmp/$t-carte.png" "$L" "$H" $s
  node outils/tir-capture.mjs "$url" "$tmp/$t-1440.png" 1440 900 $s
  node outils/tir-capture.mjs "$url" "$tmp/$t-390.png" 390 844 $s
  python3 outils/tir-superpose.py "$tmp/$t-carte.png" "$ref" "$out/$nom-carte-$t" --nous "$cn" --ref "$cr" 2>/dev/null
  python3 - "$ref" "$tmp/$t-1440.png" "$out/$nom-1440-$t-cote.png" "$refs" "$t" "$tmp/$t-390.png" "$out/$nom-390-$t-cote.png" "$r390" <<'PY'
import sys, os
from PIL import Image
ref, nous, sortie, refs, t, n390, s390, r390 = sys.argv[1:]
def cote(a, b, s):
    a, b = Image.open(a).convert("RGB"), Image.open(b).convert("RGB")
    if a.width != b.width: a = a.resize((b.width, round(a.height * b.width / a.width)))
    c = Image.new("RGB", (a.width + b.width + 8, max(a.height, b.height)), (255, 0, 255))
    c.paste(a, (0, 0)); c.paste(b, (a.width + 8, 0)); c.save(s)
cote(ref, nous, sortie)
r390 = os.path.join(refs, r390.replace("390", f"390-{t}", 1) + ".png")
if os.path.exists(r390): cote(r390, n390, s390)
PY
done
rm -rf "$tmp"
ls -la "$out" | grep "$nom"
