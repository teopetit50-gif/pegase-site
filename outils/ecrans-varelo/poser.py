"""Pose un sujet détouré (PNG transparent) au centre d'un carré blanc pur,
comme une fiche produit de catalogue : marge constante, aucune ombre."""
import sys
from PIL import Image
def poser(src, dst, cote=800, marge=0.12):
    s = Image.open(src).convert('RGBA')
    bbox = s.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
    s = s.crop(bbox)
    utile = int(cote * (1 - 2 * marge))
    k = min(utile / s.width, utile / s.height)
    s = s.resize((max(1, round(s.width * k)), max(1, round(s.height * k))), Image.LANCZOS)
    fond = Image.new('RGBA', (cote, cote), (255, 255, 255, 255))
    fond.alpha_composite(s, ((cote - s.width) // 2, (cote - s.height) // 2))
    fond.convert('RGB').save(dst, quality=90)
    return k
if __name__ == '__main__':
    for a, b in zip(sys.argv[1::2], sys.argv[2::2]):
        print(b, 'agrandi ×%.2f' % poser(a, b))
