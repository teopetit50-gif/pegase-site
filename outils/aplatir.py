#!/usr/bin/env python3
"""Rend lisible le HTML d'une page de référence.

    aplatir.py <fichier.html> [--garder-svg] > balisage.txt

Les scripts et les SVG sont repliés : un seul planisphère en points peut peser
5 000 lignes et noyer l'arbre des composants. Après repli, un document de
7 000 lignes en fait environ 1 400 — et se lit comme du code source, avec les
classes exactes de chaque composant.

Les attributs très longs (style, srcSet, d, viewBox) sont abrégés en « … » :
ils n'apprennent rien de la structure et cassent l'indentation à l'œil.
"""
import re
import sys

VIDES = {'br', 'img', 'input', 'hr', 'meta', 'link', 'source', 'col', 'area',
         'base', 'embed', 'param', 'track', 'wbr'}


def aplatir(html: str, garder_svg: bool = False) -> str:
    html = re.sub(r'<script\b.*?</script>', '', html, flags=re.S | re.I)
    html = re.sub(r'<style\b.*?</style>', '<!--STYLE-->', html, flags=re.S | re.I)
    if not garder_svg:
        html = re.sub(r'<svg\b[^>]*>.*?</svg>', '<!--SVG-->', html, flags=re.S | re.I)

    lignes, prof = [], 0
    for jeton in re.split(r'(<[^>]+>)', html):
        if not jeton.strip():
            continue
        if jeton.startswith('</'):
            prof = max(0, prof - 1)
            lignes.append('  ' * prof + jeton)
        elif jeton.startswith('<!--'):
            lignes.append('  ' * prof + jeton)
        elif jeton.startswith('<'):
            nom = re.match(r'<\s*([a-zA-Z0-9:-]+)', jeton)
            nom = nom.group(1).lower() if nom else ''
            court = re.sub(r'\s(?:style|srcSet|srcset|src|d|viewBox|content)="[^"]{80,}"', ' …', jeton)
            lignes.append('  ' * prof + court)
            if not jeton.endswith('/>') and nom not in VIDES and not nom.startswith('!'):
                prof += 1
        else:
            texte = ' '.join(jeton.split())
            if texte:
                lignes.append('  ' * prof + '· ' + texte[:110])
    return '\n'.join(lignes)


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    with open(sys.argv[1], encoding='utf-8', errors='replace') as f:
        print(aplatir(f.read(), '--garder-svg' in sys.argv))
