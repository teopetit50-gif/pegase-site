#!/usr/bin/env python3
"""
Régénère toutes les déclinaisons du logo Omega à partir d'une image source :
une silhouette plate, blanche sur fond noir ou noire sur fond blanc (la
polarité est détectée), telle que Teo la livre dans le chat.

    python3 outils/logo-omega.py <image> [--tout]

Sans option : les cinq fichiers de CE site — public/logo-pegase.png,
public/logo-pegase-blanc.png, app/icon.png, app/apple-icon.png,
app/favicon.ico. Avec --tout : en plus le cockpit (pegase-dashboard : icône,
apple-icon, favicon, trois icônes PWA) et le masque public/logos/omega-mark.png
des quatre vitrines SaaS (OMEGA/*-site). Chaque arbre se met ensuite en ligne
à sa façon (push GitHub pour le site et le cockpit, CLI Vercel pour les
vitrines).

Règles reprises des fichiers en place le 23/09/2026 :
- la marque est unie, #0f1013 (la couleur du mot-symbole « Omega.AI » du
  Header) ; la variante blanche est #ffffff ; le fond est transparent ;
- la luminance de la silhouette EST l'alpha : le bord anticrénelé de l'image
  source devient le bord du logo, sans seuillage ni détourage ;
- cadrage : le plus grand côté de la marque vaut 444/512 du carré, centrée ;
- les icônes d'écran d'accueil (apple-icon, PWA) sont posées sur une plaque
  blanche opaque — iOS peint le transparent en noir, une marque sombre y
  disparaîtrait — avec une marque plus petite : ≈ 70 %, et 56 % pour la
  « maskable » dont Android rogne le bord.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

NOIR = (0x0F, 0x10, 0x13)
BLANC = (255, 255, 255)
FILL = 444 / 512

SITE = Path(__file__).resolve().parents[1]
COCKPIT = SITE.parent / "pegase-dashboard"
VITRINES = [Path.home() / "Desktop" / "OMEGA" / f"{n}-site" for n in ("filed", "reload", "cashd", "frontd")]


def couverture(chemin: Path) -> Image.Image:
    """La silhouette recadrée et centrée dans un carré, en niveaux de gris = alpha."""
    L = np.asarray(Image.open(chemin).convert("L")).astype(np.float32)
    bord = np.concatenate([L[0], L[-1], L[:, 0], L[:, -1]])
    if bord.mean() > 128:  # marque sombre sur fond clair : on inverse
        L = 255.0 - L
    cov = np.clip((L - 6.0) / (249.0 - 6.0), 0.0, 1.0)
    ys, xs = np.where(cov > 0.02)
    crop = cov[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
    h, w = crop.shape
    S = int(round(max(w, h) / FILL))
    carre = np.zeros((S, S), np.float32)
    carre[(S - h) // 2 : (S - h) // 2 + h, (S - w) // 2 : (S - w) // 2 + w] = crop
    return Image.fromarray((carre * 255).round().astype(np.uint8))


def marque(natif: Image.Image, taille: int, rgb) -> Image.Image:
    """marque unie sur fond transparent"""
    out = Image.new("RGBA", (taille, taille), rgb + (0,))
    out.putalpha(natif.resize((taille, taille), Image.LANCZOS))
    return out


def sur_plaque(natif: Image.Image, taille: int, rgb, plaque, remplissage: float) -> Image.Image:
    """marque centrée, plus petite, sur une plaque opaque"""
    t = int(round(taille * remplissage / FILL))
    a = np.asarray(natif.resize((t, t), Image.LANCZOS)).astype(np.float32)[:, :, None] / 255.0
    fond = np.full((t, t, 3), plaque, np.float32)
    coul = np.full((t, t, 3), rgb, np.float32)
    mel = Image.fromarray((fond * (1 - a) + coul * a).round().astype(np.uint8))
    out = Image.new("RGB", (taille, taille), plaque)
    out.paste(mel, ((taille - t) // 2, (taille - t) // 2))
    return out


def favicon(natif: Image.Image, chemin: Path) -> None:
    i16, i32, i48 = (marque(natif, t, NOIR) for t in (16, 32, 48))
    i48.save(chemin, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)], append_images=[i16, i32])


def ecrire(im: Image.Image, chemin: Path) -> None:
    chemin.parent.mkdir(parents=True, exist_ok=True)
    im.save(chemin, optimize=True)
    print(f"  {chemin.relative_to(Path.home())}  {im.size[0]}×{im.size[1]} {im.mode}")


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    natif = couverture(Path(sys.argv[1]))
    tout = "--tout" in sys.argv[2:]

    print("site :")
    ecrire(marque(natif, 512, NOIR), SITE / "public" / "logo-pegase.png")
    ecrire(marque(natif, 512, BLANC), SITE / "public" / "logo-pegase-blanc.png")
    ecrire(marque(natif, 512, NOIR), SITE / "app" / "icon.png")
    ecrire(sur_plaque(natif, 180, NOIR, BLANC, 0.70), SITE / "app" / "apple-icon.png")
    favicon(natif, SITE / "app" / "favicon.ico")
    print(f"  {(SITE / 'app' / 'favicon.ico').relative_to(Path.home())}  16/32/48")
    if not tout:
        return

    print("cockpit :")
    ecrire(marque(natif, 512, NOIR), COCKPIT / "app" / "icon.png")
    ecrire(sur_plaque(natif, 180, NOIR, BLANC, 0.69), COCKPIT / "app" / "apple-icon.png")
    favicon(natif, COCKPIT / "app" / "favicon.ico")
    print(f"  {(COCKPIT / 'app' / 'favicon.ico').relative_to(Path.home())}  16/32/48")
    ecrire(sur_plaque(natif, 192, NOIR, BLANC, 0.71), COCKPIT / "public" / "icones" / "omega-192.png")
    ecrire(sur_plaque(natif, 512, NOIR, BLANC, 0.72), COCKPIT / "public" / "icones" / "omega-512.png")
    ecrire(sur_plaque(natif, 512, NOIR, BLANC, 0.56), COCKPIT / "public" / "icones" / "omega-maskable-512.png")

    print("vitrines (masque alpha, la couleur vient de currentColor) :")
    for v in VITRINES:
        if (v / "public" / "logos").is_dir():
            ecrire(marque(natif, 512, NOIR), v / "public" / "logos" / "omega-mark.png")
        else:
            print(f"  {v.name} : pas de public/logos, ignoré")


if __name__ == "__main__":
    main()
