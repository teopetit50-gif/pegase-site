"""Preuve 1:1 des sous-pages Tiroma (02/11/2026).

Compare la carte de notre page à la carte de la page de référence : côte à
côte, en différence (|a-b| amplifiée ×4) et en fondu à 50 %. Les cadres ne
sont pas les mêmes (coquille d'espace2 : barre du haut 48, rail et sous-menu
jusqu'à x 304 ; Linear : barre latérale 244 ; Plain : 353) : on capture notre
page dans une fenêtre dont la carte a la taille exacte de celle de la
référence (Linear 1188×856 → fenêtre 1500×920 ; Plain 1079×884 → 1391×948),
puis on découpe carte contre carte.

python3 outils/tir-superpose.py nous.png ref.png sortie_prefixe \
    --nous X,Y,L,H --ref X,Y,L,H
"""
import sys
from PIL import Image, ImageChops, ImageOps

args = sys.argv[1:]
def opt(nom, defaut):
    if nom in args:
        i = args.index(nom)
        v = args[i + 1]
        del args[i : i + 2]
        return tuple(int(float(x)) for x in v.split(","))
    return defaut
cn = opt("--nous", (304, 56, 1188, 856))
cr = opt("--ref", (244, 8, 1188, 856))
nous_p, ref_p, sortie = args
nous = Image.open(nous_p).convert("RGB").crop((cn[0], cn[1], cn[0] + cn[2], cn[1] + cn[3]))
eux = Image.open(ref_p).convert("RGB").crop((cr[0], cr[1], cr[0] + cr[2], cr[1] + cr[3]))
w, h = min(nous.width, eux.width), min(nous.height, eux.height)
nous, eux = nous.crop((0, 0, w, h)), eux.crop((0, 0, w, h))
cote = Image.new("RGB", (w * 2 + 8, h), (255, 0, 255))
cote.paste(eux, (0, 0))
cote.paste(nous, (w + 8, 0))
cote.save(f"{sortie}-cote.png")
diff = ImageChops.difference(nous, eux)
ImageOps.autocontrast(diff.point(lambda v: min(255, v * 4))).save(f"{sortie}-diff.png")
Image.blend(eux, nous, 0.5).save(f"{sortie}-fusion.png")
px = list(diff.convert("L").getdata())
print(f"{w}×{h} comparés ; écart moyen {sum(px) / len(px):.2f}/255 ; pixels > 40 : {sum(1 for v in px if v > 40) / len(px) * 100:.2f} %")
