#!/usr/bin/env python3
"""Remplace des textes dans n'importe quel fichier du site, sans toucher au reste.

Usage : python3 -I outils/sx/remplacer-textes.py <fichier.json> [--essai]

Le JSON a la forme { "chemin/relatif.tsx": [["ancien", "nouveau"], ...], ... }.
Chaque ancien texte doit apparaître UNE seule fois dans son fichier, sauf s'il
est préfixé par « * » (remplacé partout). On essaie, dans l'ordre :
  1. le texte tel quel ;
  2. une version tolérante : les blancs valent n'importe quelle suite de blancs
     (espaces, retours à la ligne du JSX, espaces insécables, {" "}), et
     l'apostrophe vaut ' ’ &apos; ou &#39;.
Dans le cas 2, le nouveau texte garde les espaces insécables devant ? : ; ! »
€ % et après «, comme le reste du site.
Rien n'est écrit tant qu'il reste une erreur.
"""
import json
import re
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parents[2]
NBSP = " "


def fr(texte: str) -> str:
    texte = re.sub(r" ([?:;!»€%])", NBSP + r"\1", texte)
    return re.sub(r"« ", "«" + NBSP, texte)


def motif(ancien: str) -> str:
    morceaux = []
    ancien = re.sub(r"[   ]+", " ", ancien.strip())
    for car in ancien:
        if car in "   ":
            morceaux.append(r'(?:\s| | |\\u00a0|\\u202f|&nbsp;|\{" "\}|\{\' \'\})+')
        elif car in "'’":
            morceaux.append(r"(?:'|’|&apos;|&#39;|\\')")
        elif car == '"':
            morceaux.append(r'(?:"|\\"|&quot;)')
        else:
            morceaux.append(re.escape(car))
    return "".join(morceaux)


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    essai = "--essai" in sys.argv
    table = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    erreurs = 0
    a_ecrire = {}
    for chemin, paires in table.items():
        fichier = RACINE / chemin
        if not fichier.exists():
            print(f"✗ fichier absent : {chemin}")
            erreurs += 1
            continue
        contenu = fichier.read_text(encoding="utf-8")
        for ancien, nouveau in paires:
            partout = ancien.startswith("*")
            if partout:
                ancien = ancien[1:]
            n = contenu.count(ancien)
            if n == 1 or (partout and n >= 1):
                contenu = contenu.replace(ancien, nouveau)
                continue
            if n > 1:
                print(f"✗ {chemin} : {n} occurrences de « {ancien[:60]} »")
                erreurs += 1
                continue
            rx = re.compile(motif(ancien))
            trouves = rx.findall(contenu)
            if len(trouves) == 1 or (partout and trouves):
                def adapte(m, nouveau=nouveau):
                    vu = m.group(0)
                    texte = fr(nouveau)
                    if "&nbsp;" in vu:
                        texte = texte.replace(NBSP, "&nbsp;")
                    if "\\u00a0" in vu:
                        texte = texte.replace(NBSP, "\\u00a0")
                    for forme in ("&apos;", "&#39;", "\\'", "’"):
                        if forme in vu:
                            return texte.replace("'", forme)
                    return texte

                contenu = rx.sub(adapte, contenu)
                continue
            if trouves:
                print(f"✗ {chemin} : {len(trouves)} occurrences (souple) de « {ancien[:60]} »")
            else:
                print(f"✗ {chemin} : introuvable « {ancien[:70]} »")
            erreurs += 1
        a_ecrire[fichier] = contenu
    print(f"erreurs : {erreurs}")
    if erreurs or essai:
        return 1 if erreurs else 0
    for fichier, contenu in a_ecrire.items():
        fichier.write_text(contenu, encoding="utf-8")
    print(f"écrit : {len(a_ecrire)} fichier(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
