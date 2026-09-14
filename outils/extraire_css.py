#!/usr/bin/env python3
"""Extrait d'une feuille compilée ce qu'on recopierait sinon à l'œil.

    extraire_css.py <app.css> [sortie.txt]

Quatre sections : jetons (clair et sombre), utilitaires maison, keyframes,
conteneur. C'est le contenu qu'on ne devine pas — une couleur « à peu près
grise » se voit à l'écran quand elle est posée à côté de la vraie.
"""
import re
import sys

JETON = re.compile(
    r'--color-[a-z0-9-]*'
    r'(background|foreground|border|card|primary|muted|accent|popover|secondary|ring)\s*:')

# Distinguer un utilitaire MAISON d'un utilitaire généré par le framework est
# le point délicat. Filtrer par préfixe échoue : les plus utiles s'appellent
# souvent .bg-quelque-chose. Ne garder que ceux qui portent une variable
# échoue aussi : Tailwind v4 génère ses utilitaires avec des variables --tw-*.
#
# Ce qui marche : noter la DISTINCTION du corps. Un utilitaire généré renvoie
# à un jeton du thème (`var(--color-accent)`) ; un utilitaire maison écrit des
# valeurs littérales — un dégradé à sept arrêts, six variables propres, une
# ombre en hexadécimal. On note, on trie, on garde le haut du panier.
ECHELLE = re.compile(
    r'^\.(p|m|w|h|gap|top|left|right|bottom|inset|size|min|max|order|z|basis'
    r'|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|ms|me|ps|pe|start|end'
    r'|text|bg|border|rounded|shadow|ring|opacity|leading|tracking|font'
    r'|translate|scale|rotate|skew|duration|delay|ease|col|row|space|divide'
    r'|from|via|to|fill|stroke|aspect|animate|transition|grid|flex|scroll'
    r'|backdrop|outline|decoration|underline|indent|align|whitespace|break)'
    r'-[a-z0-9]+(\\/[0-9]+)?$')
LITTERAL = re.compile(r'#[0-9a-fA-F]{3,8}\b|rgba?\(|oklch\(|hsl\(|[0-9.]+(deg|turn|vh|vw)')
BRUIT = re.compile(r'^\.(tw-|-)')


def distinction(nom, decls):
    """Plus le score est haut, plus la règle a de chances d'être du décor
    écrit à la main plutôt qu'une case du barème du framework."""
    corps = ';'.join(decls)
    propres = [d for d in decls if d.startswith('--') and not d.startswith('--tw-')]
    structure = bool(re.search(r'gradient|mask|clip-path|offset-path', corps))

    score = len(decls) - 1
    score += 3 * len(propres)
    if structure:
        score += 4
    if LITTERAL.search(re.sub(r'var\([^)]*\)', '', corps)):
        score += 2

    # Le nom peut ressembler à une case du barème (.bg-dashed) alors que le
    # corps écrit un dégradé à sept arrêts. Un signal de structure fort — un
    # dégradé, un masque, plusieurs variables propres — l'emporte donc sur la
    # forme du nom : c'est précisément le cas intéressant.
    if ECHELLE.match(nom) and not structure and len(propres) < 2:
        score -= 6
    return score


def bloc_contenant(css, pos):
    """Le bloc { … } qui contient la position, avec son sélecteur."""
    a = css.rfind('{', 0, pos)
    if a < 0:
        return None, None
    debut_sel = max(css.rfind('}', 0, a), css.rfind('{', 0, a)) + 1
    b = css.find('}', pos)
    return css[debut_sel:a].strip()[-120:], css[a + 1:b]


def extraire(css):
    out = []

    out.append('════ JETONS ════')
    vus = set()
    for m in JETON.finditer(css):
        sel, blk = bloc_contenant(css, m.start())
        if blk is None or sel in vus:
            continue
        props = [p.strip() for p in blk.split(';') if p.strip().startswith('--')]
        if len(props) < 3:
            continue
        vus.add(sel)
        out.append(f'\n── {sel or ":root"}')
        out.extend('   ' + p for p in props
                   if 'color' in p or 'radius' in p or 'font' in p or 'shadow' in p)
        if len(vus) > 6:
            break

    out.append('\n\n════ UTILITAIRES MAISON ════')
    candidats = {}
    for m in re.finditer(r'(?:^|\})(\.[a-zA-Z][\w-]{2,48})\{([^}]{24,1600})\}', css):
        nom, corps = m.group(1), m.group(2)
        if nom in candidats or BRUIT.match(nom):
            continue
        decls = [d.strip() for d in corps.split(';') if d.strip()]
        s_ = distinction(nom, decls)
        if s_ >= 3:
            candidats[nom] = (s_, decls)
    retenus = sorted(candidats.items(), key=lambda kv: -kv[1][0])[:25]
    for nom, (s_, decls) in retenus:
        out.append(f'\n{nom} {{')
        out.extend('   ' + d for d in decls)
        out.append('}')
    if not retenus:
        out.append("  (aucun — la référence n'utilise que des utilitaires standard)")
    else:
        out.append(f'\n  [{len(retenus)} règles les plus distinctives sur {len(candidats)} candidates ;'
                   f'\n   pour le reste, chercher dans app.css]')

    out.append('\n\n════ KEYFRAMES ════')
    for m in re.finditer(r'@keyframes\s+([\w-]+)\s*\{', css):
        nom = m.group(1)
        i, prof = m.end(), 1
        while i < len(css) and prof:
            if css[i] == '{':
                prof += 1
            elif css[i] == '}':
                prof -= 1
            i += 1
        out.append(f'@keyframes {nom} {{{css[m.end():i-1]}}}'[:420])

    out.append('\n\n════ CONTENEUR ════')
    for m in re.finditer(r'(@media[^{]*\{)?\.container\{[^}]*\}', css):
        out.append(m.group(0)[:220])

    return out


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    with open(sys.argv[1], encoding='utf-8', errors='replace') as f:
        lignes = extraire(f.read())
    texte = '\n'.join(lignes)
    if len(sys.argv) > 2:
        with open(sys.argv[2], 'w', encoding='utf-8') as f:
            f.write(texte)
        print(f'  {sys.argv[2]}  {len(lignes)} lignes '
              f'— jetons, utilitaires, keyframes, conteneur')
    else:
        print(texte)
