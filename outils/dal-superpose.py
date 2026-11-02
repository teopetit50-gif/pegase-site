"""Preuve 1:1 des pages Daliro (02/11/2026).

Recolle quatre tuiles 800×500 prises à l'échelle 1 (méthode de linear-home.md :
origines 0,0 · 640,0 · 0,400 · 640,400) en une capture 1440×900, puis la pose à côté
de la capture de référence et en superposition (différence absolue, amplifiée ×4).

Les deux cartes n'ont pas la même origine (coquille d'espace2 : carte à 304,56 ;
Linear : 245,9) : on compare carte contre carte. --dx décale en plus notre carte
vers la gauche, pour aligner une colonne de contenu centrée dans une carte plus
étroite.

python3 outils/dal-superpose.py t00 t640 t0400 t640400 ref.png sortie_prefixe [--dx N]
python3 outils/dal-superpose.py capture-1440.png ref.png sortie_prefixe [--dx N] [--dy N]
    [--ref-origine X,Y (244,8)] [--nous-origine X,Y (304,56)]
  (dans le conteneur cloud, 02/11 : une capture 1440×900 entière, outils/dal-capture.mjs)
"""
import sys
from PIL import Image, ImageChops, ImageOps

args = sys.argv[1:]
dx = 0
if "--dx" in args:
    i = args.index("--dx")
    dx = int(args[i + 1])
    del args[i : i + 2]
def option(nom, defaut):
    if nom in args:
        i = args.index(nom)
        v = args[i + 1]
        del args[i : i + 2]
        return v
    return defaut
# origines des deux cartes (coin haut gauche de la bordure) : Linear 244,8 ; coquille d'espace2 304,56.
# Cal.com et Attio n'ont pas la carte de Linear : on passe l'origine de leur zone de contenu.
ref_x, ref_y = (int(v) for v in option("--ref-origine", "244,8").split(","))
nous_x, nous_y = (int(v) for v in option("--nous-origine", "304,56").split(","))
dy = 0
if "--dy" in args:
    i = args.index("--dy")
    dy = int(args[i + 1])
    del args[i : i + 2]
if len(args) == 3:
    capture, ref, sortie = args
    toile = Image.open(capture).convert("RGB")
else:
    t1, t2, t3, t4, ref, sortie = args
    toile = Image.new("RGB", (1440, 900))
    for chemin, (x, y) in zip((t1, t2, t3, t4), ((0, 0), (640, 0), (0, 400), (640, 400))):
        toile.paste(Image.open(chemin).convert("RGB").resize((800, 500)), (x, y))
    toile.save(f"{sortie}-nous.png")
r = Image.open(ref).convert("RGB")
nous = toile.crop((nous_x + dx, nous_y + dy, toile.width, toile.height))
eux = r.crop((ref_x, ref_y, r.width, r.height))
w, h = min(nous.width, eux.width), min(nous.height, eux.height)
nous, eux = nous.crop((0, 0, w, h)), eux.crop((0, 0, w, h))
cote = Image.new("RGB", (w * 2 + 8, h), (255, 0, 255))
cote.paste(eux, (0, 0))
cote.paste(nous, (w + 8, 0))
cote.save(f"{sortie}-cote.png")
diff = ImageChops.difference(nous, eux)
ImageOps.autocontrast(diff.point(lambda v: min(255, v * 4))).save(f"{sortie}-diff.png")
fusion = Image.blend(eux, nous, 0.5)
fusion.save(f"{sortie}-fusion.png")
px = list(diff.convert("L").tobytes())
print(f"{w}×{h} comparés ; écart moyen {sum(px) / len(px):.2f}/255 ; pixels > 40 : {sum(1 for v in px if v > 40) / len(px) * 100:.2f} %")
