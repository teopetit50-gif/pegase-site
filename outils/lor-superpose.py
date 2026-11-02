#!/usr/bin/env python3
"""LORANI — superposer une capture de notre page et la capture de référence (02/11/2026).

Consigne docs/refonte-metiers/cloud/COMMUN.md § 3.4 : côte à côte ET en
superposition (différence PIL). Les deux images sont découpées au cadre de
la carte (Linear : x 244, y 8 ; espace 2 : x 304, y 48), à la même taille.

python3 outils/lor-superpose.py <reference.png> <notre.png> <dossier> <nom> \
    [--ref x,y] [--notre x,y] [--taille l,h] [--melange]

Écrit dans <dossier> : <nom>-cote.png (référence | nôtre), <nom>-diff.png
(différence absolue, renforcée ×3), avec --melange <nom>-melange.png (50 / 50), et imprime
la part de pixels qui diffèrent de plus de 24 (sur 255) sur un canal.
"""
import sys
from PIL import Image, ImageChops

args = sys.argv[1:]
ref_png, notre_png, dossier, nom = args[:4]
ref_xy, notre_xy, taille, melange = (244, 8), (304, 48), None, False
i = 4
while i < len(args):
    if args[i] == "--melange":
        melange = True
        i += 1
        continue
    cle, val = args[i], tuple(int(float(v)) for v in args[i + 1].split(","))
    if cle == "--ref":
        ref_xy = val
    elif cle == "--notre":
        notre_xy = val
    elif cle == "--taille":
        taille = val
    i += 2

ref = Image.open(ref_png).convert("RGB")
notre = Image.open(notre_png).convert("RGB")
if taille is None:
    taille = (min(ref.width - ref_xy[0], notre.width - notre_xy[0]), min(ref.height - ref_xy[1], notre.height - notre_xy[1]))
l, h = taille
a = ref.crop((ref_xy[0], ref_xy[1], ref_xy[0] + l, ref_xy[1] + h))
b = notre.crop((notre_xy[0], notre_xy[1], notre_xy[0] + l, notre_xy[1] + h))

cote = Image.new("RGB", (l * 2 + 8, h), (255, 0, 255))
cote.paste(a, (0, 0))
cote.paste(b, (l + 8, 0))
cote.save(f"{dossier}/{nom}-cote.png")

diff = ImageChops.difference(a, b)
diff.point(lambda v: min(255, v * 3)).save(f"{dossier}/{nom}-diff.png")
if melange:
    Image.blend(a, b, 0.5).save(f"{dossier}/{nom}-melange.png")

px = diff.get_flattened_data() if hasattr(diff, "get_flattened_data") else diff.getdata()
ecarts = sum(1 for p in px if max(p) > 24)
print(f"{nom} : {l}x{h}, {ecarts} pixels en écart ({100 * ecarts / (l * h):.2f} %)")
