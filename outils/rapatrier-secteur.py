#!/usr/bin/env python3
"""Rapatrier un site SaaS sectoriel dans omegaai.fr — la passe MÉCANIQUE.

Écrit le 24/09/2026 pour Daliro (/secteurs/btp), à reprendre pour Tamila,
Lorani et Tavaro. La méthode complète est dans app/secteurs/RAPATRIEMENT.md :
cet outil n'en fait que la partie répétitive, et rien d'autre.

    python3 outils/rapatrier-secteur.py \\
        --source ~/Desktop/OMEGA/chantieros-site \\
        --prefixe btp \\
        --dest components/secteurs/btp \\
        src/components/hero.tsx=Heros.tsx \\
        src/components/sections/features.tsx=Fonctions.tsx  ...

CE QU'IL FAIT, dans les chaînes entre guillemets doubles seulement
(className, cn(), cva, chemins) — jamais dans le texte affiché ni le code :
  1. retire tout utilitaire `dark:` (monde clair figé, règle 4) ;
  2. convertit chaque utilitaire de couleur né du `@theme` source
     (`bg-card`, `text-muted-foreground`, `border-border/40`…) en valeur
     arbitraire (`bg-[#ffffff]`, `border-[#e6e6e6]/40`) — la table est LUE
     dans le globals.css de la source (`@theme` + `:root`), ou imposée par
     `--jetons fichier.json` (obligatoire si la source est sombre : c'est là
     qu'on donne les valeurs CLAIRES) ;
  3. renomme les `animate-X` définis par la source en `<prefixe>-X` (les
     keyframes sont à écrire dans le CSS de la page, préfixées aussi) ;
  4. réécrit les chemins `"/<entrée de public/>` en `"/secteurs-<prefixe>/…`.
Pour les fichiers GÉNÉRÉS (première ligne « Généré par »), il échappe aussi
les apostrophes du texte JSX (`react/no-unescaped-entities`).

CE QU'IL NE FAIT PAS (à la main, voir RAPATRIEMENT.md) : les liens morts,
les imports, les polices, les `sticky top-…` sous l'entête d'Omega, les
dépendances absentes (tooltip Radix, tw-animate-css), les surfaces sombres
écrites en dur (`bg-black`, `bg-neutral-900`, `text-white`…), les « J-2 ».
Il imprime la table des jetons et un rapport par fichier : c'est la matière
des en-têtes de fichiers et du tableau de conversions.
"""
import argparse
import json
import os
import re
import sys
from collections import Counter

UTILS = ['ring-offset', 'border-x', 'border-y', 'border-t', 'border-b', 'border-l', 'border-r', 'border-s',
         'border-e', 'bg', 'text', 'border', 'divide', 'ring', 'outline', 'fill', 'stroke', 'from', 'via', 'to',
         'decoration', 'shadow', 'caret', 'placeholder', 'accent']


def lire_jetons(css):
    """--color-X du @theme, résolus sur le premier :root. Rend {X: valeur}."""
    racine = {}
    m = re.search(r':root\s*\{(.*?)\}', css, re.S)
    if m:
        for nom, val in re.findall(r'--([\w-]+)\s*:\s*([^;]+);', m.group(1)):
            racine[nom] = val.strip()
    jetons = {}
    for bloc in re.findall(r'@theme[^{]*\{(.*?)\n\}', css, re.S):
        for nom, val in re.findall(r'--color-([\w-]+)\s*:\s*([^;]+);', bloc):
            val = val.strip()
            for _ in range(4):  # var(--a) -> valeur, hsl(var(--a)) -> hsl(valeur)
                val = re.sub(r'var\(--([\w-]+)\)', lambda v: racine.get(v.group(1), v.group(0)), val)
            if 'var(' not in val:
                jetons[nom] = val
    return jetons


def arbitraire(val):
    return val.replace(', ', ',').replace(' ', '_')


def echapper_apostrophes(jsx):
    out, etat, prof, q, n = [], 'texte', 0, None, 0
    for c in jsx:
        if etat == 'texte':
            if c == '<':
                etat = 'balise'
            elif c == '{':
                etat, prof = 'expr', 1
            elif c == "'":
                out.append('&apos;'); n += 1; continue
        elif etat == 'balise':
            if q:
                q = None if c == q else q
            elif c in '"\'':
                q = c
            elif c == '{':
                prof += 1
            elif c == '}':
                prof -= 1
            elif c == '>' and prof == 0:
                etat = 'texte'
        else:
            if q:
                q = None if c == q else q
            elif c in '"\'`':
                q = c
            elif c == '{':
                prof += 1
            elif c == '}':
                prof -= 1
                if prof == 0:
                    etat = 'texte'
        out.append(c)
    return ''.join(out), n


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--source', required=True, help='dossier du site SaaS (OMEGA/<nom>-site)')
    p.add_argument('--prefixe', required=True, help='btp, avocats… (classes <prefixe>-*, public/secteurs-<prefixe>/)')
    p.add_argument('--dest', required=True, help='components/secteurs/<prefixe>')
    p.add_argument('--globals', help='globals.css de la source (défaut : src/app/ ou app/)')
    p.add_argument('--jetons', help='JSON {"card": "#ffffff", …} qui remplace ou complète la table lue')
    p.add_argument('fichiers', nargs='+', help='chemin/source.tsx=Destination.tsx')
    a = p.parse_args()

    g = a.globals or next((os.path.join(a.source, x) for x in ('src/app/globals.css', 'app/globals.css')
                           if os.path.exists(os.path.join(a.source, x))), None)
    css = open(g).read() if g else ''
    jetons = lire_jetons(css)
    if a.jetons:
        jetons.update(json.load(open(a.jetons)))
    print('JETONS (vérifier : ce sont les valeurs qui seront écrites en dur)')
    for k, v in sorted(jetons.items()):
        print(f'  {k:24} {v}')
    anims = sorted(set(re.findall(r'@utility\s+animate-([\w-]+)', css)) |
                   set(re.findall(r'--animate-([\w-]+)\s*:', css)), key=len, reverse=True)
    publics = sorted(os.listdir(os.path.join(a.source, 'public'))) if os.path.isdir(os.path.join(a.source, 'public')) else []

    rx_coul = re.compile(r'(?<![\w\-\[#/.])(' + '|'.join(UTILS) + r')-(' +
                         '|'.join(sorted(map(re.escape, jetons), key=len, reverse=True)) +
                         r')(/(?:\d+(?:\.\d+)?|\[[^\]\s"]+\]))?(?![\w\-])') if jetons else None
    rx_anim = re.compile(r'(?<![\w\-])animate-(' + '|'.join(map(re.escape, anims)) + r')(?![\w\-])') if anims else None

    os.makedirs(a.dest, exist_ok=True)
    for paire in a.fichiers:
        src, dst = paire.split('=')
        texte = open(os.path.join(a.source, src)).read()
        rap, sombres = Counter(), 0

        def chaine(m):
            nonlocal sombres
            morceaux, garde = re.split(r'(\s+)', m.group(1)), []
            for t in morceaux:
                if re.search(r'(^|:)dark:', t):
                    sombres += 1
                    if garde and garde[-1].isspace():
                        garde.pop()
                    continue
                garde.append(t)
            s = ''.join(garde)
            if rx_coul:
                def coul(mm):
                    neuf = f'{mm.group(1)}-[{arbitraire(jetons[mm.group(2)])}]{mm.group(3) or ""}'
                    rap[f'{mm.group(1)}-{mm.group(2)} → {neuf.split("/")[0]}'] += 1
                    return neuf
                s = rx_coul.sub(coul, s)
            if rx_anim:
                def anim(mm):
                    rap[f'animate-{mm.group(1)} → {a.prefixe}-{mm.group(1)}'] += 1
                    return f'{a.prefixe}-{mm.group(1)}'
                s = rx_anim.sub(anim, s)
            for e in publics:
                if s.startswith('/' + e):
                    rap[f'/{e} → /secteurs-{a.prefixe}/{e}'] += 1
                    s = f'/secteurs-{a.prefixe}' + s
            return '"' + s + '"'

        texte = re.sub(r'"((?:[^"\\\n]|\\.)*)"', chaine, texte)
        apos = 0
        if texte.lstrip().startswith('/* Généré par') and '  return (\n' in texte:
            i = texte.index('  return (\n') + len('  return (\n')
            j = texte.rindex('\n  );')
            corps, apos = echapper_apostrophes(texte[i:j])
            texte = texte[:i] + corps + texte[j:]
        open(os.path.join(a.dest, dst), 'w').write(texte)
        print(f'\n{dst} — {sum(rap.values())} conversions, {sombres} dark: retirés, {apos} apostrophes échappées')
        for k, v in sorted(rap.items()):
            print(f'  {v:4}  {k}')
        reste = sorted(set(re.findall(r'\b(?:bg-black|bg-neutral-[89]\d0|bg-zinc-[89]\d0|bg-gray-[89]\d0|'
                                      r'bg-slate-[89]\d0|text-white)\b', texte)))
        if reste:
            print('  ⚠ surfaces sombres écrites en dur, à regarder une par une :', ', '.join(reste))


if __name__ == '__main__':
    sys.exit(main())
