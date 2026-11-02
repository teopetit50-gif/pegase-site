"""Preuve 1:1 des pages Tavaro (02/11/2026).

Pose notre capture 1440×900 (échelle 1) à côté de la capture de référence
(`1440-reel-*.png` des relevés) et en superposition (différence absolue ×4,
fondu à 50 %). Les deux cartes n'ont pas la même origine (coquille d'espace2 :
carte à 304,56 ; Linear : 245,9) : on compare carte contre carte.
--dx N décale notre carte (colonne centrée dans une carte plus étroite).
--ref-origine x,y et --nous-origine x,y pour une autre référence (Plain).

python3 outils/tav-superpose.py nous.png ref.png sortie_prefixe [--dx N]
"""
import sys
from PIL import Image, ImageChops, ImageOps

args = sys.argv[1:]
def opt(nom, defaut):
    if nom in args:
        i = args.index(nom); v = args[i + 1]; del args[i:i + 2]; return v
    return defaut
dx = int(opt("--dx", "0"))
rx, ry = map(int, opt("--ref-origine", "245,9").split(","))
nx, ny = map(int, opt("--nous-origine", "304,56").split(","))
nous_p, ref_p, sortie = args
nous = Image.open(nous_p).convert("RGB")
eux = Image.open(ref_p).convert("RGB")
nous = nous.crop((nx + dx, ny, nous.width - 8, nous.height - 8))
eux = eux.crop((rx, ry, eux.width - 8, eux.height - 36 if eux.height == 900 else eux.height))
w, h = min(nous.width, eux.width), min(nous.height, eux.height)
nous, eux = nous.crop((0, 0, w, h)), eux.crop((0, 0, w, h))
cote = Image.new("RGB", (w * 2 + 8, h), (255, 0, 255))
cote.paste(eux, (0, 0)); cote.paste(nous, (w + 8, 0))
cote.save(f"{sortie}-cote.png")
diff = ImageChops.difference(nous, eux)
ImageOps.autocontrast(diff.point(lambda v: min(255, v * 4))).save(f"{sortie}-diff.png")
Image.blend(eux, nous, 0.5).save(f"{sortie}-fusion.png")
px = list(diff.convert("L").get_flattened_data())
print(f"{w}×{h} comparés ; écart moyen {sum(px) / len(px):.2f}/255 ; pixels > 40 : {sum(1 for v in px if v > 40) / len(px) * 100:.2f} %")
