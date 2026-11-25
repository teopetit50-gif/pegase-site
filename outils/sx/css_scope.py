#!/usr/bin/env python3
"""CSS compilé de la référence -> bloc isolé, scopé sous .sx (spécificité inchangée).
usage : css_scope.py <app.css> <sortie.css>"""
import sys, os, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from csslib import blocs, tete, corps

SRC, OUT = sys.argv[1], sys.argv[2]
css = open(SRC, encoding="utf-8").read()

def liste_selecteurs(s):
    out, cur, prof, ch = [], "", 0, None
    for c in s:
        if ch:
            cur += c
            if c == ch: ch = None
            continue
        if c in "\"'": ch = c
        elif c in "([": prof += 1
        elif c in ")]": prof -= 1
        if c == "," and prof == 0: out.append(cur); cur = ""
        else: cur += c
    out.append(cur)
    return [x.strip() for x in out if x.strip()]

RACINES = [":where(:root,:host)", ":root,:host", ":root", ":host", "html", "body"]
def scoper(sel):
    for r in RACINES:
        if sel == r: return ".sx"
        if sel.startswith(r) and not re.match(r"[\w-]", sel[len(r):len(r) + 1] or " "):
            reste = sel[len(r):]
            if r == "html" and reste.startswith("::"): return "html:has(.sx)" + reste
            if reste[:1] in (" ", ">", "+", "~"): return ".sx" + reste
            return ".sx" + reste
    if sel.startswith(":where(.sgf)") or sel.startswith(":where([data"): return ":where(.sx) " + sel
    return ":where(.sx) " + sel

ignores = []
def regle(b):
    t = tete(b)
    if t.startswith("._ZQUfa_"): ignores.append(t); return ""
    sels = liste_selecteurs(t)
    if t.strip() == "html":  # barre de défilement : portée par <html>, seulement quand la page est là
        return "html:has(.sx){" + corps(b) + "}"
    return ",".join(scoper(s) for s in sels) + "{" + corps(b) + "}"

def traiter(liste):
    out = []
    for b in liste:
        t = tete(b)
        if not t.startswith("@"):
            r = regle(b)
            if r: out.append(r)
        elif t.startswith(("@media", "@supports", "@container")):
            out.append(t + "{" + "".join(traiter(blocs(corps(b)))) + "}")
        elif t.startswith("@keyframes"):
            if t.split()[1] != "pulse": out.append(b)
        elif t.startswith(("@property", "@font-face", "@layer")):
            pass
        else:
            ignores.append(t[:60])
    return out

B = blocs(css)
ui = "".join(traiter(blocs(corps(b)))) if False else ""
ui_parts, libres = [], []
for b in B:
    t = tete(b)
    if t.startswith("@layer ui-sdk"): ui_parts += traiter(blocs(corps(b)))
libres = traiter([b for b in B if not tete(b).startswith("@layer")])

def joli(regles):
    return "\n".join(regles)

sortie = "@layer sx-ui-sdk{\n" + joli(ui_parts) + "\n}\n\n" + joli(libres) + "\n"
open(OUT, "w", encoding="utf-8").write(sortie)
print("ui-sdk :", len(ui_parts), "règles ; hors couche :", len(libres), "blocs ;", len(sortie), "octets")
print("ignorés :", ignores[:12])
