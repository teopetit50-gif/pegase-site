# Usage : python3 outils/logos-modules/extraire.py [dossier de sortie]
# Extrait des logos noir-sur-blanc fournis par Teo (27/09/2026) les deux
# masques alpha du parc : <code>-mark.png (512 × 512, le signe) et
# <code>-lockup.png (signe + mot, à plat). RVB blanc uniforme, l'alpha porte
# le dessin — même convention que les fichiers qu'ils remplacent.
import os
import sys
import numpy as np
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ICI, "sources", "{}.png")
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ICI, "..", "..", "public", "logos")
NOMS = ["reput", "offload", "filed", "cashd"]

def encre(img):
    """0 = papier, 1 = encre ; le gris clair du cadre et le bruit de
    compression tombent à 0, le noir franc sature à 1."""
    l = np.asarray(img.convert("L"), dtype=np.float32) / 255.0
    e = 1.0 - l
    return np.clip((e - 0.22) / (0.78 - 0.22), 0, 1)

def resserre(a, seuil=0.5, largeur=0.9):
    """rampe raide autour du seuil : rend des bords nets après un agrandissement"""
    return np.clip((a - seuil) / (largeur * 0.5) * 0.5 + 0.5, 0, 1)

def agrandi(e, taille):
    im = Image.fromarray((e * 255).astype(np.uint8))
    im = im.resize(taille, Image.LANCZOS)
    a = np.asarray(im, dtype=np.float32) / 255.0
    return a

def masque(a):
    h, w = a.shape
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[..., :3] = 255
    rgba[..., 3] = np.round(np.clip(a, 0, 1) * 255).astype(np.uint8)
    return Image.fromarray(rgba)

def boite(e, seuil=0.03):
    ys, xs = np.where(e > seuil)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

for nom in NOMS:
    src = Image.open(SRC.format(nom))
    e = encre(src)
    # on ignore une marge de 2 % : le cadre du papier y traîne parfois
    H, W = e.shape
    my, mx = int(H * 0.02), int(W * 0.02)
    e[:my] = 0; e[-my:] = 0; e[:, :mx] = 0; e[:, -mx:] = 0
    x0, y0, x1, y1 = boite(e)
    # colonnes encrées → le plus grand blanc sépare le signe du mot
    cols = (e[y0:y1, x0:x1] > 0.5).any(axis=0)
    trous, debut = [], None
    for i, c in enumerate(cols):
        if not c and debut is None: debut = i
        if c and debut is not None: trous.append((i - debut, debut, i)); debut = None
    ecart, g0, g1 = max(trous)
    sx1 = x0 + g0
    # le signe
    s = e[:, x0:sx1]
    bx0, by0, bx1, by1 = boite(s)
    s = s[by0:by1, bx0:bx1]
    sh, sw = s.shape
    cote = 490  # l'emprise des anciens signes dans leur carré de 512
    k = cote / max(sh, sw)
    tw, th = round(sw * k), round(sh * k)
    a = resserre(agrandi(s, (tw, th)))
    carre = np.zeros((512, 512), dtype=np.float32)
    ox, oy = (512 - tw) // 2, (512 - th) // 2
    carre[oy:oy + th, ox:ox + tw] = a
    masque(carre).save(f"{OUT}/{nom}-mark.png", optimize=True)
    # le lockup, à plat, 400 px de haut
    l = e[y0:y1, x0:x1]
    k = 400 / l.shape[0]
    tw, th = round(l.shape[1] * k), 400
    a = resserre(agrandi(l, (tw, th)))
    pad = 12
    grand = np.zeros((th + 2 * pad, tw + 2 * pad), dtype=np.float32)
    grand[pad:pad + th, pad:pad + tw] = a
    masque(grand).save(f"{OUT}/{nom}-lockup.png", optimize=True)
    print(nom, "signe", (sw, sh), "→", (round(sw * 490 / max(sh, sw)), round(sh * 490 / max(sh, sw))),
          "| écart signe/mot", ecart, "px | lockup", grand.shape[::-1])
