"""Deux étalonnages inspirés des stories de Léo Grindars (11/10/2026).

Le « sombre » a plu à Teo sur une photo de nuit, puis a été refusé sur
ses vidéos : les vidéos restent en couleurs naturelles (Activité → Styles
de montage → Ce qui a été essayé et refusé). Gardé ici au cas où.

  python3 outils/filtres/filtre.py photo.png
      → photo-sombre.jpg, photo-ambre.jpg, omega-sombre.cube, omega-ambre.cube
  ffmpeg -i video.mov -vf lut3d=outils/filtres/omega-sombre.cube …
      → le même rendu sur une vidéo (SDR ; une vidéo HDR se convertit d'abord)

Chaque réglage est une pure transformation de couleur (aucune opération
spatiale) : la même fonction s'applique à la photo et à une grille 33³,
ce qui donne un .cube qui reproduit exactement le rendu.

  sombre : exposition basse, noirs profonds, hautes lumières douces,
           couleurs retenues, verts tirés vers un bleu-vert de cinéma,
           tons chauds conservés,
           ombres légèrement froides.
  ambre  : même base, balance chaude et dorée.
"""
import sys
import numpy as np
from PIL import Image

LUMA = np.array([0.2126, 0.7152, 0.0722])


def srgb_vers_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lin_vers_srgb(c):
    c = np.clip(c, 0, None)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)


def teinte_sat(rgb):
    mx, mn = rgb.max(-1), rgb.min(-1)
    d = mx - mn + 1e-9
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = np.where(mx > 0, (mx - mn) / (mx + 1e-9), 0)
    return h, s


def poids(h, centre, largeur):
    """cloche de 0 à 1 autour d'une teinte (degrés)"""
    d = np.abs((h - centre + 180) % 360 - 180)
    return np.clip(1 - d / largeur, 0, 1) ** 1.5


def tourner(rgb, angle_deg):
    """fait tourner la teinte de chaque pixel (angle par pixel, degrés)"""
    a = np.radians(angle_deg)[..., None]
    k = np.ones(3) / np.sqrt(3)
    c, sn = np.cos(a), np.sin(a)
    return rgb * c + np.cross(k, rgb) * sn + k * (rgb @ k)[..., None] * (1 - c)


def courbe(x, noir, epaule, gamma):
    """noirs relevés à `noir` puis écrasés, S douce, épaule qui retient les hautes lumières"""
    x = np.clip(x, 0, 1)
    x = x ** gamma
    s = x * x * (3 - 2 * x)                 # S
    x = 0.65 * x + 0.35 * s
    x = 1 - (1 - x) ** 1.0
    x = np.where(x > epaule, epaule + (1 - epaule) * np.tanh((x - epaule) / (1 - epaule)) * 0.92, x)
    return noir + (1 - noir) * x


def etalonner(rgb, variante, expo_ev=None):
    """rgb : sRGB float 0..1, forme (..., 3) ; `expo_ev` remplace l'exposition
    par défaut (−1,05 pour « sombre », réglé sur une photo de nuit ; une pièce
    en plein jour en demande moins)"""
    lin = srgb_vers_lin(rgb)

    if variante == "sombre":
        balance = np.array([1.04, 0.93, 1.02])      # enlève une partie du vert des LED
        expo = 2 ** -1.05
    else:
        balance = np.array([1.32, 0.96, 0.62])      # chaud, doré
        expo = 2 ** -0.95
    if expo_ev is not None:
        expo = 2 ** expo_ev
    lin = lin * balance * expo

    srgb = lin_vers_srgb(lin)

    # saturation par teinte : verts et cyans éteints, chauds gardés
    h, s = teinte_sat(np.clip(srgb, 0, 1))
    y = (srgb * LUMA).sum(-1, keepdims=True)
    verts = poids(h, 140, 70)
    chauds = poids(h, 30, 35)
    # les verts des LED glissent vers un bleu-vert de cinéma au lieu de griser
    srgb = tourner(srgb, verts * (28 if variante == "sombre" else 10))
    if variante == "sombre":
        facteur = 0.86 - 0.30 * verts + 0.30 * chauds
    else:
        facteur = 0.80 - 0.42 * verts + 0.35 * chauds
    srgb = y + (srgb - y) * facteur[..., None]

    # tons : noirs profonds, hautes lumières retenues
    y = (srgb * LUMA).sum(-1, keepdims=True)
    if variante == "sombre":
        y2 = courbe(y, 0.008, 0.62, 1.30)
    else:
        y2 = courbe(y, 0.014, 0.64, 1.22)
    srgb = srgb * (y2 / np.maximum(y, 1e-6))

    # ombres froides, lumières chaudes (léger)
    y = np.clip((srgb * LUMA).sum(-1, keepdims=True), 0, 1)
    ombre = (1 - y) ** 2.2
    lumiere = y ** 2.0
    if variante == "sombre":
        srgb = srgb + ombre * np.array([-0.012, 0.000, 0.016]) + lumiere * np.array([0.020, 0.008, -0.018])
    else:
        srgb = srgb + ombre * np.array([-0.004, 0.000, 0.010]) + lumiere * np.array([0.030, 0.012, -0.030])

    return np.clip(srgb, 0, 1)


def ecrire_cube(chemin, variante, n=33):
    g = np.linspace(0, 1, n)
    b, gg, r = np.meshgrid(g, g, g, indexing="ij")   # R varie le plus vite
    grille = np.stack([r, gg, b], -1).reshape(-1, 3)
    sortie = etalonner(grille, variante)
    with open(chemin, "w") as f:
        f.write(f'TITLE "Omega {variante}"\nLUT_3D_SIZE {n}\nDOMAIN_MIN 0 0 0\nDOMAIN_MAX 1 1 1\n')
        for v in sortie:
            f.write(f"{v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")


if __name__ == "__main__":
    src = Image.open(sys.argv[1]).convert("RGB")
    a = np.asarray(src, dtype=np.float32) / 255
    for v in ("sombre", "ambre"):
        out = etalonner(a, v)
        Image.fromarray((out * 255 + 0.5).astype(np.uint8)).save(f"photo-{v}.jpg", quality=95, subsampling=0)
        ecrire_cube(f"omega-{v}.cube", v)
        print("ok", v)
