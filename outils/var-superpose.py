"""VARELO — preuve 1:1 (02/11/2026) : notre capture contre celle de la référence.

On compare carte contre carte : la carte `main` de Linear ou de Plain (relevé) et notre
`.var-carte` (posée dans la coquille d'espace2, dont la barre latérale remplace celle du
SaaS). Sorties : <prefixe>-cote.png (référence à gauche, nous à droite),
<prefixe>-diff.png (différence absolue ×4) et <prefixe>-fusion.png (moitié-moitié).

python3 outils/var-superpose.py nous.png ref.png prefixe --nous X,Y --ref X,Y [--taille L,H] [--dx N] [--dy N]
"""
import sys
from PIL import Image, ImageChops, ImageOps

args = sys.argv[1:]


def option(nom, defaut):
    if nom in args:
        i = args.index(nom)
        v = args[i + 1]
        del args[i : i + 2]
        return v
    return defaut


xy_nous = [int(float(v)) for v in option("--nous", "0,0").split(",")]
xy_ref = [int(float(v)) for v in option("--ref", "244,8").split(",")]
taille = option("--taille", None)
dx = int(option("--dx", "0"))
dy = int(option("--dy", "0"))
nous_chemin, ref_chemin, sortie = args
nous_img = Image.open(nous_chemin).convert("RGB")
ref_img = Image.open(ref_chemin).convert("RGB")
if taille:
    w, h = [int(v) for v in taille.split(",")]
else:
    w = min(nous_img.width - xy_nous[0], ref_img.width - xy_ref[0])
    h = min(nous_img.height - xy_nous[1], ref_img.height - xy_ref[1])
nous = nous_img.crop((xy_nous[0] + dx, xy_nous[1] + dy, xy_nous[0] + dx + w, xy_nous[1] + dy + h))
eux = ref_img.crop((xy_ref[0], xy_ref[1], xy_ref[0] + w, xy_ref[1] + h))
cote = Image.new("RGB", (w * 2 + 8, h), (255, 0, 255))
cote.paste(eux, (0, 0))
cote.paste(nous, (w + 8, 0))
cote.save(f"{sortie}-cote.png")
diff = ImageChops.difference(nous, eux)
ImageOps.autocontrast(diff.point(lambda v: min(255, v * 4))).save(f"{sortie}-diff.png")
Image.blend(eux, nous, 0.5).save(f"{sortie}-fusion.png")
px = list(diff.convert("L").getdata())
print(f"{w}×{h} comparés ; écart moyen {sum(px) / len(px):.2f}/255 ; pixels > 40 : {sum(1 for v in px if v > 40) / len(px) * 100:.2f} %")
