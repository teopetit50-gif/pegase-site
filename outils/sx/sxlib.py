"""Lecteur du HTML rendu par React (casse préservée) -> arbre simple.
Noeud = dict(tag, attrs: list[(nom, valeur|None)], enfants: list[noeud|str])"""
import re, html

VIDES = {"area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"}
TOK = re.compile(r"<!--.*?-->|<!DOCTYPE[^>]*>|</([A-Za-z][\w:-]*)\s*>|<([A-Za-z][\w:-]*)((?:\s+[^\s=>/]+(?:=\"[^\"]*\")?)*)\s*(/?)>", re.S)
ATTR = re.compile(r"([^\s=>/]+)(?:=\"([^\"]*)\")?")

def lire(src):
    racine = {"tag": "#racine", "attrs": [], "enfants": []}
    pile = [racine]
    pos = 0
    def texte(t):
        if not t: return
        t = html.unescape(t)
        e = pile[-1]["enfants"]
        if e and isinstance(e[-1], str): e[-1] += t
        else: e.append(t)
    while True:
        m = TOK.search(src, pos)
        if not m:
            texte(src[pos:]); break
        texte(src[pos:m.start()])
        pos = m.end()
        if m.group(0).startswith("<!"): continue
        if m.group(1):  # fermeture
            nom = m.group(1)
            for i in range(len(pile) - 1, 0, -1):
                if pile[i]["tag"] == nom:
                    del pile[i:]; break
            continue
        nom = m.group(2)
        attrs = [(a.group(1), html.unescape(a.group(2)) if a.group(2) is not None else None) for a in ATTR.finditer(m.group(3) or "")]
        n = {"tag": nom, "attrs": attrs, "enfants": []}
        pile[-1]["enfants"].append(n)
        if nom in ("script", "style"):
            f = src.find("</" + nom + ">", pos)
            n["enfants"].append(src[pos:f]); pos = f + len(nom) + 3
            continue
        if not (m.group(4) or nom.lower() in VIDES):
            pile.append(n)
    return racine

def attr(n, nom, defaut=None):
    for k, v in n["attrs"]:
        if k == nom: return v
    return defaut

def parcourir(n):
    yield n
    for e in n["enfants"]:
        if isinstance(e, dict): yield from parcourir(e)

def trouver(n, pred):
    return [x for x in parcourir(n) if pred(x)]
