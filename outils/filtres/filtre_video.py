"""Le filtre « sombre » pour une vidéo déjà montée (texte incrusté).

Deux protections, toutes deux par couleur (donc exportables en .cube) :
  · la peau : les tons chair modérément saturés ne prennent qu'un
    assombrissement léger et gardent leur saturation (règle « peau
    naturelle ») ;
  · le texte : le blanc pur, quasi sans couleur, reste blanc.

  python3 outils/filtres/filtre_video.py <expo_EV> <sortie.cube>
  ffmpeg -i video.mp4 -vf "format=rgb24,lut3d=sortie.cube,format=yuv420p" …

Premier essai le 11/10/2026 sur IMG_8735 (pièce claire, en journée) :
−0,45 « léger » et −0,75 « marqué ». La photo de nuit avait pris −1,05.
"""
import sys
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import filtre as F


def peau_douce(rgb, expo_ev):
    lin = F.srgb_vers_lin(rgb) * (2 ** expo_ev)
    s = F.lin_vers_srgb(lin)
    y = (s * F.LUMA).sum(-1, keepdims=True)
    s = y + (s - y) * 0.96
    return np.clip(s, 0, 1)


def etalonner_video(rgb, expo_sombre):
    base = F.etalonner(rgb, "sombre", expo_sombre)
    h, s = F.teinte_sat(rgb)
    y = (rgb * F.LUMA).sum(-1)

    # tons chair : teinte 5–45°, saturation 0,15–0,65, luminance moyenne
    k_teinte = np.clip(1 - np.abs(((h - 24 + 180) % 360) - 180) / 22, 0, 1)
    k_sat = np.clip((s - 0.12) / 0.08, 0, 1) * np.clip((0.68 - s) / 0.10, 0, 1)
    k_lum = np.clip((y - 0.18) / 0.10, 0, 1)
    k_peau = (k_teinte * k_sat * k_lum * 0.85)[..., None]
    peau = peau_douce(rgb, -0.30)
    out = base * (1 - k_peau) + peau * k_peau

    # blanc pur (le texte) : inchangé
    k_blanc = (np.clip((y - 0.90) / 0.06, 0, 1) * np.clip((0.10 - s) / 0.06, 0, 1))[..., None]
    return np.clip(out * (1 - k_blanc) + rgb * k_blanc, 0, 1)


if __name__ == "__main__":
    expo = float(sys.argv[1])
    cube = sys.argv[2]
    n = 33
    g = np.linspace(0, 1, n)
    b, gg, r = np.meshgrid(g, g, g, indexing="ij")
    grille = np.stack([r, gg, b], -1).reshape(-1, 3)
    sortie = etalonner_video(grille, expo)
    with open(cube, "w") as f:
        f.write(f'TITLE "Omega sombre video {expo}"\nLUT_3D_SIZE {n}\nDOMAIN_MIN 0 0 0\nDOMAIN_MAX 1 1 1\n')
        for v in sortie:
            f.write(f"{v[0]:.6f} {v[1]:.6f} {v[2]:.6f}\n")
    print("cube", cube)
