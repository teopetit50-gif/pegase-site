#!/usr/bin/env bash
# Preuve 1:1 d'une sous-page TAMILA (02/11/2026) : captures 1440 sombre et clair + 390 sombre et clair,
# superposées à la référence ; images dans docs/refonte-metiers/comparaisons/tamila/<nom>-*.png.
# outils/tam-preuve.sh <nom> <url> <dossier de captures de référence> [linear|plain] [dx]
set -euo pipefail
nom=$1; url=$2; ref=$3; genre=${4:-linear}; dx=${5:-0}
out=docs/refonte-metiers/comparaisons/tamila
mkdir -p "$out"
for th in sombre clair; do
  node outils/tam-capture.mjs "$url" 1440 $th "/tmp/$nom-1440-$th-nous.png" >/dev/null
  echo -n "1440 $th : "
  python3 outils/tam-superpose.py "/tmp/$nom-1440-$th-nous.png" "$ref/1440-reel-$th.png" "$out/$nom-1440-$th" --ref "$genre" --dx "$dx" 2>/dev/null
  node outils/tam-capture.mjs "$url" 390 $th "/tmp/$nom-390-$th-nous.png" >/dev/null
  python3 - "/tmp/$nom-390-$th-nous.png" "$ref/390-$th.png" "$out/$nom-390-$th-cote.png" <<'PY'
import sys
from PIL import Image
a = Image.open(sys.argv[1]).convert("RGB"); b = Image.open(sys.argv[2]).convert("RGB")
if b.width != 390: b = b.resize((390, round(b.height * 390 / b.width)))
im = Image.new("RGB", (788, max(a.height, b.height)), (255, 0, 255)); im.paste(b, (0, 0)); im.paste(a, (398, 0)); im.quantize(256).save(sys.argv[3], optimize=True)
PY
done
