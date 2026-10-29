"""Vidéo provisoire de la page /formation : « Découvrir Omega ».

Images tirées avec PIL, encodées en H.264 par ffmpeg (lu sur stdin).
Usage : python3 -I faire_video.py <ffmpeg> <logo-sombre.png> <sortie.mp4> <affiche.jpg>
"""
import math
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

FFMPEG, LOGO, SORTIE, AFFICHE = sys.argv[1:5]
W, H, FPS = 1920, 1080, 25
POLICE = "/System/Library/Fonts/SFNS.ttf"
ENCRE = (15, 16, 19)
GRIS = (98, 102, 109)


def police(taille, graisse):
    f = ImageFont.truetype(POLICE, taille)
    try:
        f.set_variation_by_axes([100, min(96, max(17, taille / 2)), 400, graisse])
    except Exception:
        pass
    return f


def fond():
    """Dégradé clair + deux anneaux entrelacés (le dessin de la marque), très pâles."""
    img = Image.new("RGB", (W, H))
    px = img.load()
    for y in range(H):
        for x in range(0, W):
            t = (x / W) * 0.35 + (y / H) * 0.65
            v = int(250 - 26 * t)
            px[x, y] = (v, v, min(255, v + 2))
    calque = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(calque)
    for cx, cy, r in ((1380, 330, 430), (1660, 520, 430)):
        for k, a in ((0, 70), (34, 45), (68, 28)):
            d.ellipse((cx - r + k, cy - r + k, cx + r - k, cy + r - k), outline=(255, 255, 255, a + 60), width=26)
            d.ellipse((cx - r + k + 4, cy - r + k + 4, cx + r - k + 4, cy + r - k + 4), outline=(0, 0, 0, a // 6), width=22)
    calque = calque.filter(ImageFilter.GaussianBlur(3))
    img = img.convert("RGBA")
    img.alpha_composite(calque)
    # le bas s'assombrit légèrement, comme sous une barre de lecture
    voile = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dv = ImageDraw.Draw(voile)
    for y in range(H - 380, H):
        dv.line([(0, y), (W, y)], fill=(0, 0, 0, int(26 * (y - (H - 380)) / 380)))
    img.alpha_composite(voile)
    return img


def entete():
    """Logo + « Formation Omega », en haut à gauche."""
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    logo = Image.open(LOGO).convert("RGBA").resize((52, 52), Image.LANCZOS)
    c.alpha_composite(logo, (80, 72))
    ImageDraw.Draw(c).text((150, 78), "Formation Omega", font=police(40, 560), fill=ENCRE)
    return c


def texte(sur, titre, phrase, taille=150):
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(c)
    y = H - 205
    if phrase:
        lignes = phrase if isinstance(phrase, list) else [phrase]
        for ligne in reversed(lignes):
            y -= 56
            d.text((80, y), ligne, font=police(40, 430), fill=GRIS)
        y -= 34
    ft = police(taille, 600)
    hauteur = ft.getbbox("Hg")[3]
    y -= hauteur
    d.text((74, y), titre, font=ft, fill=ENCRE)
    if sur:
        d.text((80, y - 70), sur, font=police(40, 560), fill=GRIS)
    return c


DIAPOS = [
    (5.0, None, "Découvrir Omega", None, 128),
    (5.5, "01 · Le point du matin", "Chaque matin, une page", ["Ce qui est parti hier, ce qui attend votre accord, ce qui a coincé."], 96),
    (5.5, "02 · À valider", "Ils proposent, vous décidez", ["Une relance, une réponse, une facture : un clic, oui ou non."], 96),
    (6.5, "03 · Les modules", "Quatre modules, un espace", ["FILED, vos documents reçus · CASHD, vos relances", "REPUT, vos demandes clients · OFFLOAD, les clients qui décrochent"], 96),
    (5.5, "04 · Vous gardez la main", "Rien ne part sans vous", ["Aucun message engageant n'est envoyé sans votre accord."], 96),
    (5.5, "05 · Le rendez-vous de la semaine", "Dix minutes par semaine", ["Vous transmettez vos factures et vous confirmez vos paiements."], 96),
    (4.5, None, "À vous de jouer", ["omegaai.fr/espace2"], 116),
]

base = fond()
base.alpha_composite(entete())
calques = [texte(s, t, p, z) for _, s, t, p, z in DIAPOS]


def image(i, dt):
    """La diapo i, dt secondes après son début : fondu + montée de 18 px."""
    entree = min(1.0, dt / 0.7)
    e = 1 - (1 - entree) ** 3
    img = base.copy()
    cal = calques[i]
    if e < 1:
        cal = cal.copy()
        a = cal.getchannel("A").point(lambda v: int(v * e))
        cal.putalpha(a)
    img.alpha_composite(cal, (0, int(18 * (1 - e))))
    return img


proc = subprocess.Popen(
    [FFMPEG, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
     "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
     "-c:v", "libx264", "-preset", "slow", "-crf", "22", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
     "-c:a", "aac", "-b:a", "32k", "-shortest", SORTIE],
    stdin=subprocess.PIPE,
)
premiere = None
for i, (duree, *_r) in enumerate(DIAPOS):
    n = int(round(duree * FPS))
    for f in range(n):
        dt = f / FPS
        img = image(i, dt).convert("RGB")
        # sortie en fondu vers la diapo suivante (0,4 s), sauf la dernière
        reste = duree - dt
        if reste < 0.4 and i < len(DIAPOS) - 1:
            img = Image.blend(img, base.convert("RGB"), 1 - reste / 0.4)
        if premiere is None and i == 0 and dt >= 1.0:
            premiere = img.copy()
        proc.stdin.write(img.tobytes())
proc.stdin.close()
proc.wait()
premiere.resize((1280, 720), Image.LANCZOS).save(AFFICHE, quality=88)
print("ok", sum(d[0] for d in DIAPOS), "s")
