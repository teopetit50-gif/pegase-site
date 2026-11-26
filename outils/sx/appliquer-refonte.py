#!/usr/bin/env python3
"""Applique outils/sx/refonte-erx.json (ancien -> nouveau, bloc par bloc)
à outils/sx/textes.py et aux composants de components/accueil-sx/gen.
usage : python3 -I outils/sx/appliquer-refonte.py [--essai]"""
import json, os, re, sys
ICI = os.path.dirname(os.path.abspath(__file__)); RACINE = os.path.dirname(os.path.dirname(ICI))
essai = "--essai" in sys.argv
paires = json.load(open(os.path.join(ICI, "refonte-erx.json"), encoding="utf-8"))
tp = os.path.join(ICI, "textes.py"); src = open(tp, encoding="utf-8").read()
erreurs = 0; gens = {}
def fr(t):
    t = re.sub(r" ([?:;!»€%])", "\u00a0\\1", t)
    return re.sub(r"« ", "«\u00a0", t)
def variantes(t):
    return [(t, lambda x: x), (fr(t), fr), (" " + t, lambda x: " " + x), (" " + fr(t), lambda x: " " + fr(x))]
for cle, liste in paires.items():
    bloc, comp = cle.split("|")
    m = re.search(r'B\["%s"\] = """(.*?)"""' % re.escape(bloc), src, re.S)
    if not m: print("BLOC ABSENT", bloc); erreurs += 1; continue
    corps = m.group(1); lignes = corps.split("\n")
    gp = os.path.join(RACINE, "components/accueil-sx/gen", comp + ".tsx")
    g = gens.get(gp) or open(gp, encoding="utf-8").read()
    for ancien, nouveau in liste:
        vt = [(a, f) for a, f in variantes(ancien)[:2] if lignes.count(a) == 1]
        vg = [(json.dumps(a, ensure_ascii=False), f) for a, f in variantes(ancien) if g.count(json.dumps(a, ensure_ascii=False))]
        if not vt:
            cible = re.sub(r"[ \u00a0]", " ", ancien)
            vt = [(l, fr) for l in lignes if re.sub(r"[ \u00a0]", " ", l) == cible][:1]
        if not vg:
            motif = '" ?' + re.sub(r"\\[ \u00a0]|\\ ", "[ \u00a0]?", "[ \u00a0]".join(re.escape(m) for m in re.split(r"[ \u00a0]", ancien))) + '"'
            vg = [(m, fr) for m in set(re.findall(motif, g))]
            vg = [(lit, (lambda x, lit=lit: (" " if lit.startswith('" ') else "") + fr(x))) for lit, _ in vg]
        if not vt or not vg:
            print(f"! {bloc} | textes.py:{len(vt)} | {comp}:{len(vg)} | {ancien[:70]}"); erreurs += 1; continue
        a, f = vt[0]; lignes[lignes.index(a)] = f(nouveau)
        for lit, f in vg: g = g.replace(lit, json.dumps(f(nouveau), ensure_ascii=False))
    gens[gp] = g
    src = src.replace(m.group(0), m.group(0).replace(corps, "\n".join(lignes)))
print("erreurs :", erreurs)
if not essai and not erreurs:
    open(tp, "w", encoding="utf-8").write(src)
    for gp, g in gens.items(): open(gp, "w", encoding="utf-8").write(g)
    print("appliqué")
