"""Preuve 1:1 des pages TAMILA (02/11/2026).

Pose notre capture (1440×900, échelle 1) à côté de la capture de référence à taille réelle
(releves/captures/<page>/1440-reel-*.png) et en superposition (différence absolue ×4, fusion 50 %).

Les deux cartes n'ont pas la même origine : coquille d'espace2, carte à 304,56 ; Linear, carte à
244,8 ; Plain, carte à 353,8. On compare carte contre carte, depuis leur coin haut-gauche.
--dx N décale notre carte (contenu centré dans une carte plus étroite), --dy N de même.
--ref linear|plain choisit l'origine de la référence (linear par défaut).

python3 outils/tam-superpose.py nous.png ref.png sortie_prefixe [--ref plain] [--dx N] [--dy N]
"""
import sys
from PIL import Image, ImageChops, ImageOps

args = sys.argv[1:]
def opt(nom, defaut):
    if nom in args:
        i = args.index(nom)
        v = args[i + 1]
        del args[i : i + 2]
        return v
    return defaut
dx = int(opt("--dx", 0))
dy = int(opt("--dy", 0))
genre = opt("--ref", "linear")
nous_p, ref_p, sortie = args
n = Image.open(nous_p).convert("RGB")
r = Image.open(ref_p).convert("RGB")
if n.width <= 400:
    # 390 : les deux pages sont plein écran sous leur barre ; on compare depuis le haut du contenu
    nous = n.crop((0, 48 + dy, n.width, n.height))
    eux = r.crop((0, 0, r.width, r.height))
else:
    nous = n.crop((304 + dx, 56 + dy, 1432, 892))
    eux = r.crop((244, 8, 1432, 864)) if genre == "linear" else r.crop((353, 8, 1432, 892))
w, h = min(nous.width, eux.width), min(nous.height, eux.height)
nous, eux = nous.crop((0, 0, w, h)), eux.crop((0, 0, w, h))
cote = Image.new("RGB", (w * 2 + 8, h), (255, 0, 255))
cote.paste(eux, (0, 0))
cote.paste(nous, (w + 8, 0))
cote.quantize(256).save(f"{sortie}-cote.png", optimize=True)
diff = ImageChops.difference(nous, eux)
ImageOps.autocontrast(diff.point(lambda v: min(255, v * 4))).convert("L").save(f"{sortie}-diff.png", optimize=True)
Image.blend(eux, nous, 0.5).quantize(256).save(f"{sortie}-fusion.png", optimize=True)
px = list(diff.convert("L").get_flattened_data())
print(f"{w}×{h} comparés ; écart moyen {sum(px) / len(px):.2f}/255 ; pixels > 40 : {sum(1 for v in px if v > 40) / len(px) * 100:.2f} %")
