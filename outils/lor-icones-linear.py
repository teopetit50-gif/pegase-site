#!/usr/bin/env python3
"""LORANI — les icônes de Linear tirées de son bundle public (02/11/2026).

Les relevés (releves/linear-commun) ne contiennent pas toutes les icônes des
pages copiées (Accept, Decline, Copy issue ID…). Elles sont dans le code public
de Linear (static.linear.app/client/assets/*.js), sous des noms raccourcis :
on part du composant utilisé dans le module d'une page (« Li » dans
IssueDetailsPaneSidebar.*.js), on suit ses import/export jusqu'à sa
définition et on recopie ses tracés tels quels.

python3 outils/lor-icones-linear.py <dossier du bundle> > components/espace2/lorani/lor-icones-linear.ts

<dossier du bundle> : les .js de la page de connexion de Linear et, dans
<dossier>/lazy/, les modules qu'elle cite (« assets/*.js »). La liste des icônes
voulues est dans outils/lor-icones-linear.json : nom → [module, composant].
"""
import json, os, re, sys

D = sys.argv[1]
LISTE = json.load(open(os.path.join(os.path.dirname(__file__), "lor-icones-linear.json")))


def lire(n):
    for p in (f"{D}/lazy/{n}", f"{D}/{n}"):
        if os.path.exists(p):
            return open(p, encoding="utf-8", errors="ignore").read()
    raise SystemExit("module absent : " + n)


def paires(bloc):
    m = {}
    for part in bloc.split(","):
        part = part.strip()
        a, b = part.split(" as ") if " as " in part else (part, part)
        m[b.strip()] = a.strip()
    return m


def definition(s, nom):
    for pat in (r"function " + re.escape(nom) + r"\(", r"[,; ]" + re.escape(nom) + r"=(?:[A-Za-z$_]+\()?(?:function|\(|[a-z]=>)"):
        mm = re.search(pat, s)
        if mm:
            return s[mm.start():mm.start() + 6000]
    return None


def resoudre(fichier, alias, prof=0):
    s = lire(fichier)
    d = definition(s, alias)
    if d and ("`svg`" in d[:800] or "`path`" in d[:900]):
        return d
    for bloc, src in re.findall(r'import\{([^}]*)\}from"\./([^"]+)"', s):
        m = paires(bloc)
        if alias in m:
            ex = {}
            for b2 in re.findall(r"export\{([^}]*)\}", lire(src)):
                ex.update(paires(b2))
            return resoudre(src, ex.get(m[alias], m[alias]), prof + 1)
    if d and prof < 4:
        mm = re.search(r"jsx\)\(([A-Za-z$_]+),", d)
        if mm:
            return resoudre(fichier, mm.group(1), prof + 1)
    raise SystemExit(f"introuvable : {alias} dans {fichier}")


def traces(d):
    fins = [m.start() for m in re.finditer(r"function |,[A-Za-z$_]{2,4}=(?:[a-z]=>|[A-Za-z$_]{1,3}\()", d[10:])]
    seg = d[: fins[0] + 10 if fins else 4000]
    out = []
    for el in re.finditer(r"jsx\)\(`path`,\{([^}]*)\}", seg):
        at = el.group(1)
        trace = re.search(r"d:`([^`$]*)`", at)
        if trace:
            out.append([trace.group(1), 1 if "evenodd" in at else 0])
    return out


print("/* Les icônes de Linear tirées de son bundle public (static.linear.app), telles quelles.")
print("   Généré par outils/lor-icones-linear.py, ne pas retoucher à la main : nom → tracés [d, evenodd]. */")
print()
print("export const LIN = {")
for nom, (module, composant) in LISTE.items():
    print(f"  {nom}: {json.dumps(traces(resoudre(module, composant)))},")
print("} as const satisfies Record<string, readonly (readonly [string, 0 | 1])[]>;")
print()
print("export type NomLin = keyof typeof LIN;")
