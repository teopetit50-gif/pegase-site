# Retrouver, et remplacer, les anciens signes des modules dans des images.
#
#   python3 outils/logos-modules/signes.py cherche <image>…
#       une ligne JSON par image où un ancien signe apparaît (score ≥ 0,74)
#   python3 outils/logos-modules/signes.py remplace <image> <sortie>
#       redessine chaque ancien signe trouvé avec le nouveau, dans la même
#       boîte (mask-size: contain) et la même encre
#
# 27/09/2026 — écrit pour les captures d'écran du cockpit publiées sur le site
# (hero de l'accueil, aperçus des relances, page /installer du cockpit), qui
# portaient encore l'ancien signe CASHD figé dans l'image. Corrélation
# normalisée multi-échelle sur la carte d'« encre » ; les fenêtres sans
# contraste sont écartées (le score y dégénère à 1). Au-dessous de ~0,74, on
# tombe sur les pastilles d'état en pointillés, pas sur des signes.
# Les anciens signes (avant le 27/09) sont dans anciens/, les nouveaux dans
# public/logos/.
import json, os, sys
import cv2
import numpy as np
from PIL import Image

ICI = os.path.dirname(os.path.abspath(__file__))
LOGOS = os.path.join(ICI, "..", "..", "public", "logos")
NOUVEAU = {"cashd": "cashd", "reload": "offload", "frontd": "reput", "filed": "filed"}
SEUIL = 0.74


def charge(chemin):
    a = cv2.imread(chemin, cv2.IMREAD_UNCHANGED)[:, :, 3].astype(np.float32) / 255
    ys, xs = np.where(a > 20 / 255)
    return a, (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)


ANCIENS = {n: charge(os.path.join(ICI, "anciens", f"{n}-mark.png")) for n in NOUVEAU}


def carte_encre(rgb):
    g = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
    return g, np.abs(g - np.median(g))


def correle(encre, t):
    r = cv2.matchTemplate(encre, t, cv2.TM_CCOEFF_NORMED)
    k = (t.shape[1], t.shape[0])
    m1 = cv2.boxFilter(encre, -1, k, normalize=True, anchor=(0, 0), borderType=cv2.BORDER_CONSTANT)
    m2 = cv2.boxFilter(encre * encre, -1, k, normalize=True, anchor=(0, 0), borderType=cv2.BORDER_CONSTANT)
    sd = np.sqrt(np.maximum(m2 - m1 * m1, 0))[: r.shape[0], : r.shape[1]]
    return np.where((sd > 0.08) & np.isfinite(r), r, 0).astype(np.float32)


def cherche(rgb):
    """[(signe, score, x, y, l, h)] en pixels de l'image, doublons retirés"""
    g, _ = carte_encre(rgb)
    f = min(1.0, 1400 / max(g.shape))
    if f < 1:
        g = cv2.resize(g, None, fx=f, fy=f, interpolation=cv2.INTER_AREA)
    encre = np.abs(g - np.median(g))
    boites = []
    for n, (a, (x0, y0, x1, y1)) in ANCIENS.items():
        t0 = a[y0:y1, x0:x1]
        for h in np.geomspace(8, 80, 30):
            t = cv2.resize(t0, (max(3, round(t0.shape[1] * h / t0.shape[0])), max(3, round(h))), interpolation=cv2.INTER_AREA)
            if t.shape[0] >= encre.shape[0] or t.shape[1] >= encre.shape[1]:
                continue
            r = correle(encre, t)
            for y, x in zip(*np.where(r >= SEUIL)):
                boites.append((n, float(r[y, x]), int(x), int(y), t.shape[1], t.shape[0]))
    boites.sort(key=lambda b: -b[1])
    garde = []
    for b in boites:
        _, _, x, y, w, h = b
        if all(max(0, min(x + w, g2[2] + g2[4]) - max(x, g2[2])) * max(0, min(y + h, g2[3] + g2[5]) - max(y, g2[3]))
               <= 0.3 * min(w * h, g2[4] * g2[5]) for g2 in garde):
            garde.append(b)
    return [(n, round(s, 3), round(x / f), round(y / f), round(w / f), round(h / f)) for n, s, x, y, w, h in garde]


def remplace(rgb, signes):
    im = rgb.astype(np.float32)
    _, encre = carte_encre(rgb)
    journal = []
    for n, _, x, y, w, h in signes:
        a_old, (bx0, by0, bx1, by1) = ANCIENS[n]
        t_plein = a_old[by0:by1, bx0:bx1]
        # recalage fin, en pleine résolution
        m = max(6, int(0.4 * max(w, h)))
        zy, zx = max(0, y - m), max(0, x - m)
        zone = encre[zy:y + h + m, zx:x + w + m]
        v, X, Y, W = -1, 0, 0, w
        for k in np.linspace(0.85, 1.15, 31):
            tw, th = max(3, round(w * k)), max(3, round(h * k))
            if th >= zone.shape[0] or tw >= zone.shape[1]:
                continue
            r = cv2.matchTemplate(zone, cv2.resize(t_plein, (tw, th), interpolation=cv2.INTER_AREA), cv2.TM_CCOEFF_NORMED)
            _, vv, _, loc = cv2.minMaxLoc(r)
            if vv > v:
                v, X, Y, W = vv, zx + loc[0], zy + loc[1], tw
        s = W / (bx1 - bx0)                  # pixels par unité du carré de 512
        cx, cy, cote = X - bx0 * s, Y - by0 * s, 512 * s
        taille = (im.shape[1], im.shape[0])
        ancien = cv2.warpAffine(cv2.resize(a_old, (0, 0), fx=s, fy=s, interpolation=cv2.INTER_AREA),
                                np.float32([[1, 0, cx], [0, 1, cy]]), taille)
        # l'encre : les pixels les plus foncés sous le cœur du signe (seuil
        # relatif — un signe de 10 px n'a aucun pixel « plein » après lissage)
        coeur = ancien >= 0.6 * ancien.max()
        pix = im[coeur]
        lum = pix @ np.float32([0.299, 0.587, 0.114])
        encre_rgb = np.median(pix[lum <= np.percentile(lum, 30)], axis=0)
        masque = cv2.dilate((ancien > 0.03).astype(np.uint8), np.ones((3, 3), np.uint8),
                            iterations=max(1, round(cote / 40))) * 255
        fond = cv2.inpaint(np.clip(im, 0, 255).astype(np.uint8), masque, 3, cv2.INPAINT_TELEA).astype(np.float32)
        im = np.where(masque[..., None] > 0, fond, im)
        # le nouveau signe, rendu à 4× puis réduit
        neuf, _ = charge(os.path.join(LOGOS, f"{NOUVEAU[n]}-mark.png"))
        k = 4
        grand = cv2.resize(neuf, (max(1, round(cote * k)),) * 2, interpolation=cv2.INTER_AREA)
        pose = cv2.warpAffine(grand, np.float32([[1, 0, cx * k], [0, 1, cy * k]]), (taille[0] * k, taille[1] * k))
        al = cv2.resize(pose, taille, interpolation=cv2.INTER_AREA)[..., None]
        im = im * (1 - al) + encre_rgb[None, None, :] * al
        journal.append(f"{n} → {NOUVEAU[n]} (recalé {v:.2f}, boîte {cote:.1f} px en {cx:.0f},{cy:.0f})")
    return np.clip(im + 0.5, 0, 255).astype(np.uint8), journal


if __name__ == "__main__":
    action, *args = sys.argv[1:]
    if action == "cherche":
        for chemin in args:
            trouve = cherche(np.asarray(Image.open(chemin).convert("RGB")))
            if trouve:
                print(json.dumps({"image": chemin, "signes": trouve}), flush=True)
    elif action == "remplace":
        source, sortie = args
        rgb = np.asarray(Image.open(source).convert("RGB"))
        out, journal = remplace(rgb, cherche(rgb))
        img = Image.fromarray(out)
        if sortie.endswith(".webp"):
            img.save(sortie, quality=80, method=6)
        else:
            img.save(sortie, optimize=True)
        print(os.path.basename(source), "→", os.path.basename(sortie), "·", " ; ".join(journal) or "aucun signe")
