#!/usr/bin/env python3
"""LORANI — régénère components/espace2/lorani/lor-sprite.ts (02/11/2026).

Les symboles du sprite de Linear (releves/linear-commun/sprite-icones.svg,
tiré du bundle public) recopiés tels quels : un symbole = sa viewBox et son
contenu. On garde les symboles déjà présents et on ajoute ceux passés en
arguments.

python3 outils/lor-sprite.py <sprite-icones.svg> [Nom…]
"""
import json, re, sys

CIBLE = "components/espace2/lorani/lor-sprite.ts"
svg = open(sys.argv[1], encoding="utf-8").read()
symboles = {}
for m in re.finditer(r'<symbol id="([^"]+)" viewBox="([^"]+)">(.*?)</symbol>', svg, re.S):
    symboles.setdefault(m.group(1), (m.group(2), m.group(3)))  # un nom en double : le premier, celui de l'application
actuels = re.findall(r"^  ([A-Za-z0-9]+): \[", open(CIBLE, encoding="utf-8").read(), re.M)
noms = actuels + [n for n in sys.argv[2:] if n not in actuels]
tete = open(CIBLE, encoding="utf-8").read().split("export const SPRITE = {")[0]
lignes = [tete + "export const SPRITE = {"]
for n in noms:
    vb, contenu = symboles[n]
    lignes.append(f"  {n}: [{json.dumps(vb)}, {json.dumps(contenu)}],")
lignes.append("} as const;\n\nexport type NomIcone = keyof typeof SPRITE;\n")
open(CIBLE, "w", encoding="utf-8").write("\n".join(lignes))
print(len(noms), "symboles")
