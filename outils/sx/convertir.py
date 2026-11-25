#!/usr/bin/env python3
"""HTML rendu de la référence -> composants TSX, classes intactes.

usage : convertir.py <index.html> <dossier de sortie> [--images BASE] [--textes fr.json] [--manquants out.json]

  --images BASE   préfixe posé devant les `src` relatifs (phase de comparaison :
                  on pointe sur la référence ; ensuite, sur nos propres fichiers)
  --textes        dictionnaire { "texte d'origine": "texte Omega" } appliqué aux
                  noeuds texte et aux attributs lisibles (aria-label, alt, title,
                  placeholder)
"""
import sys, os, re, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sxlib import lire, attr, parcourir, trouver

ARGS = sys.argv[1:]
def option(nom, defaut=None):
    if nom in ARGS:
        i = ARGS.index(nom); v = ARGS[i + 1]; del ARGS[i:i + 2]; return v
    return defaut
IMAGES = option("--images", "")
TEXTES = option("--textes")
MANQUANTS = option("--manquants")
VIVANT = option("--vivant")
SRC, SORTIE = ARGS[0], ARGS[1]
DICO = json.load(open(TEXTES, encoding="utf-8")) if TEXTES else {}
IMG = DICO.get("__images__", {}) if DICO else {}
vus_sans_trad = {}

HTML_ATTR = {
    "class": "className", "for": "htmlFor", "tabindex": "tabIndex", "readonly": "readOnly",
    "maxlength": "maxLength", "minlength": "minLength", "autocomplete": "autoComplete",
    "srcset": "srcSet", "crossorigin": "crossOrigin", "fetchpriority": "fetchPriority",
    "colspan": "colSpan", "rowspan": "rowSpan", "charset": "charSet", "autofocus": "autoFocus",
    "spellcheck": "spellCheck", "enterkeyhint": "enterKeyHint", "inputmode": "inputMode",
    "datetime": "dateTime", "novalidate": "noValidate", "contenteditable": "contentEditable",
    "playsinline": "playsInline", "autocapitalize": "autoCapitalize", "autocorrect": "autoCorrect",
    "xlink:href": "xlinkHref", "xmlns:xlink": "xmlnsXlink", "xml:space": "xmlSpace",
    "referrerpolicy": "referrerPolicy", "usemap": "useMap", "cellpadding": "cellPadding",
    "cellspacing": "cellSpacing", "frameborder": "frameBorder", "allowfullscreen": "allowFullScreen",
}
BOOLEENS = {"hidden", "inert", "disabled", "checked", "selected", "open", "multiple", "autoplay",
            "loop", "muted", "playsinline", "readonly", "required", "autofocus", "novalidate", "controls"}
NUMERIQUES = {"tabindex", "colspan", "rowspan", "span", "rows", "cols", "size", "maxlength", "minlength", "start",
              "aria-valuemin", "aria-valuemax", "aria-valuenow", "aria-colcount", "aria-rowcount", "aria-colindex",
              "aria-rowindex", "aria-level", "aria-posinset", "aria-setsize", "aria-colspan", "aria-rowspan"}
LISIBLES = {"aria-label", "alt", "title", "placeholder", "aria-description", "aria-valuetext"}

def camel(nom):
    p = nom.split("-")
    return p[0] + "".join(x[:1].upper() + x[1:] for x in p[1:])

def nom_attr(k):
    kl = k.lower()
    if kl in HTML_ATTR: return HTML_ATTR[kl]
    if kl.startswith("aria-") or kl.startswith("data-"): return k
    if "-" in k: return camel(k)
    if ":" in k: return camel(k.replace(":", "-"))
    return k

def decoupe_style(s):
    out, cur, prof, ch = [], "", 0, None
    for c in s:
        if ch:
            cur += c
            if c == ch: ch = None
            continue
        if c in "\"'": ch = c; cur += c; continue
        if c == "(": prof += 1
        elif c == ")": prof -= 1
        if c == ";" and prof == 0:
            out.append(cur); cur = ""
        else: cur += c
    out.append(cur)
    return [x for x in (y.strip() for y in out) if x]

def style_objet(s):
    paires = []
    for d in decoupe_style(s):
        k, _, v = d.partition(":")
        k, v = k.strip(), v.strip()
        if not k.startswith("--"):
            if k.startswith("-ms-"): k = "ms" + camel("x" + k[3:])[1:]
            elif k.startswith("-"): k = camel("x" + k)[1:]
            else: k = camel(k)
        paires.append(json.dumps(k, ensure_ascii=False) + ": " + json.dumps(v, ensure_ascii=False))
    return "{{ " + ", ".join(paires) + " } as CSSProperties}"

def traduire(t, contexte):
    """Traduit en conservant les espaces de bord (ils comptent dans le rendu)."""
    if not DICO: return t
    coeur = t.strip()
    if not coeur: return t
    if coeur in DICO:
        return t.replace(coeur, DICO[coeur], 1)
    vus_sans_trad.setdefault(coeur, contexte)
    return t

besoins = set()

def est_ruban(n):
    if n["tag"] != "div": return False
    st = attr(n, "style") or ""
    enf = [e for e in n["enfants"] if isinstance(e, dict)]
    return "overflow:hidden" in st and "background:transparent" in st and len(enf) == 1 and enf[0]["tag"] == "canvas"

# La jauge à barres de la fiche : ses barres dépendent de la largeur mesurée,
# le composant SxBarres les recalcule. Montants relevés dans la charge utile
# du rendu serveur de la référence (props de son PayBreakdownChart).
BARRES = [
    ("normal-hours", "purple", [1006.08, 1257.6]),
    ("overtime", "blue", [188.64, 125.76]),
    ("benefits", "orange", [150, 64.29, 51.42]),
    ("employer-contributions", "green", [128.57, 22.64, 24.5]),
]

def enfants_barres(n, ind, fil):
    etiq = [e for e in n["enfants"] if isinstance(e, dict) and e["tag"] == "span"]
    lignes = [ind + "<SxBarres", ind + "  categories={["]
    for (cle, coul, montants), e in zip(BARRES, etiq):
        sp = [c for c in e["enfants"] if isinstance(c, dict)]
        nom = traduire("".join(x for x in sp[0]["enfants"] if isinstance(x, str)), fil + ">barres")
        part = traduire("".join(x for x in sp[1]["enfants"] if isinstance(x, str)), fil + ">barres%")
        lignes.append(ind + "    { cle: %s, etiquette: %s, part: %s, couleur: %s, montants: %s }," % (
            json.dumps(cle), json.dumps(nom, ensure_ascii=False), json.dumps(part, ensure_ascii=False), json.dumps(coul), json.dumps(montants)))
    lignes += [ind + "  ]}", ind + "/>"]
    return lignes

def est_regles(n):
    return n["tag"] == "div" and (attr(n, "class") or "").startswith("pointer-events-none absolute inset-y-0 left-1/2 z-0 mx-auto w-full max-w-[1920px]")

def rendre(n, prof, dans_main=False, fil=""):
    ind = "  " * prof
    if isinstance(n, str):
        t = traduire(n, fil)
        return [ind + "{" + json.dumps(t, ensure_ascii=False) + "}"]
    tag = n["tag"]
    if tag in ("script", "style", "link", "template", "meta"):
        return []
    if est_regles(n):
        besoins.add("SxRegles")
        coul = ""
        for e in n["enfants"]:
            if isinstance(e, dict):
                coul = (attr(e, "style") or "").replace("border-color:", "").strip(); break
        if coul and coul != "#dcdcda":
            return [ind + "<SxRegles couleur={" + json.dumps(coul) + "} repereHaut={false} repereBas={false} />"]
        return [ind + "<SxRegles />"]
    if est_ruban(n):
        besoins.add("RubanFibre")
        if dans_main:
            return [ind + '<RubanFibre variante="arc" centreX={52} encre="#F5F5F2" lueur={0} />']
        return [ind + '<RubanFibre variante="droit" />']
    dans_main = dans_main or tag == "main"
    morceaux = []
    est_champ = tag in ("input", "textarea", "select")
    for k, v in n["attrs"]:
        kl = k.lower()
        if kl == "style":
            if v: morceaux.append("style=" + style_objet(v)); besoins.add("CSSProperties")
            continue
        nom = nom_attr(k)
        if est_champ and kl == "value": nom = "defaultValue"
        if est_champ and kl == "checked": nom = "defaultChecked"
        if kl in BOOLEENS and (v is None or v == ""):
            morceaux.append(nom + "={true}" if nom not in ("hidden",) else "hidden"); continue
        if v is None: v = ""
        if kl in LISIBLES: v = traduire(v, fil + "@" + kl)
        if kl in NUMERIQUES and re.fullmatch(r"-?\d+(\.\d+)?", v):
            morceaux.append(nom + "={" + v + "}"); continue
        if tag == "img" and kl == "src":
            v = IMG.get(v, (IMAGES + v) if v.startswith("/") else v)
        if tag == "img" and kl == "srcset":
            continue
        morceaux.append(nom + "={" + json.dumps(v, ensure_ascii=False) + "}")
    ouvre = "<" + tag + ("" if not morceaux else " " + " ".join(morceaux))
    enfants = n["enfants"]
    if tag == "textarea":
        txt = "".join(e for e in enfants if isinstance(e, str))
        return [ind + ouvre + (" defaultValue={" + json.dumps(txt, ensure_ascii=False) + "}" if txt else "") + " />"]
    if not enfants:
        return [ind + ouvre + " />"]
    lignes = [ind + ouvre + ">"]
    cls = (attr(n, "class") or "").split()
    fil2 = (fil + ">" + tag + ("." + cls[0] if cls else ""))[-90:]
    if attr(n, "data-slot") == "pay-breakdown-chart-meter":
        besoins.add("SxBarres")
        lignes += enfants_barres(n, ind + "  ", fil2)
    else:
        for e in enfants:
            lignes += rendre(e, prof + 1, dans_main, fil2)
    lignes.append(ind + "</" + tag + ">")
    return lignes

def composant(nom, noeud, source):
    besoins.clear()
    corps = rendre(noeud, 2)
    imports = []
    if "CSSProperties" in besoins: imports.append('import type { CSSProperties } from "react";')
    if "RubanFibre" in besoins: imports.append('import RubanFibre from "../RubanFibre";')
    if "SxBarres" in besoins: imports.append('import SxBarres from "../SxBarres";')
    if "SxRegles" in besoins: imports.append('import SxRegles from "../SxRegles";')
    tete = [
        "/* GÉNÉRÉ par outils/sx/convertir.py — " + source + ".",
        "   Balisage porté tel quel depuis le relevé de la référence : ne pas",
        "   « corriger » une classe à la main sans repasser outils/sx/compare.mjs. */",
    ] + imports + ["", "export default function " + nom + "() {", "  return ("]
    return "\n".join(tete + corps + ["  );", "}", ""])

racine = lire(open(SRC, encoding="utf-8").read())
body = trouver(racine, lambda n: n["tag"] == "body")[0]
enveloppe = [e for e in body["enfants"] if isinstance(e, dict) and "isolate" in (attr(e, "class") or "")][0]
pied = [e for e in body["enfants"] if isinstance(e, dict) and e["tag"] == "footer"][0]

# Greffes : les <tbody> que la référence ne remplit que dans le navigateur
# (lignes des tableaux) sont repris de l'instantané du DOM vivant.
if VIVANT:
    viv = json.load(open(VIVANT, encoding="utf-8"))
    arbre_vivant = lire(viv["enveloppe"])
    greffes = 0
    for balise in ("tbody", "thead"):
        tb_viv = trouver(arbre_vivant, lambda n: n["tag"] == balise)
        tb_ssr = trouver(enveloppe, lambda n: n["tag"] == balise)
        assert len(tb_viv) == len(tb_ssr), (balise, len(tb_viv), len(tb_ssr))
        for a, b in zip(tb_ssr, tb_viv):
            vide = not any(isinstance(e, dict) for e in a["enfants"])
            if (balise == "tbody" and vide and b["enfants"]) or (balise == "thead" and trouver(a, lambda n: n["tag"] == "th") and len(trouver(a, lambda n: True)) == len(trouver(b, lambda n: True))):
                a["enfants"] = b["enfants"]; greffes += 1
    print("greffes de <tbody> et <thead> depuis le DOM vivant :", greffes)

NOMS_SECTIONS = ["Plateforme", "Fiche", "Agents", "Integrations", "Marque", "Securite",
                 "Clients", "Tarifs", "Bande", "Faq", "Appel"]
plan = []
i = 0
for e in enveloppe["enfants"]:
    if not isinstance(e, dict): continue
    if e["tag"] == "main": plan.append(("SxHero", e))
    elif e["tag"] == "section":
        plan.append(("Sx" + (NOMS_SECTIONS[i] if i < len(NOMS_SECTIONS) else "Section%d" % i), e)); i += 1
    elif "synnax-navbar-sticky" in (attr(e, "class") or ""): plan.append(("SxNav", e))
    else: plan.append(("SxFilets", e))
plan.append(("SxPied", pied))

os.makedirs(SORTIE, exist_ok=True)
for nom, noeud in plan:
    code = composant(nom, noeud, "bloc « " + nom + " »")
    open(os.path.join(SORTIE, nom + ".tsx"), "w", encoding="utf-8").write(code)
    print("%-16s %5d éléments  %7d octets" % (nom, sum(1 for _ in parcourir(noeud)), len(code.encode())))
print("classe de l'enveloppe :", attr(enveloppe, "class"))
print("classe du body        :", attr(body, "class"))
if MANQUANTS is not None:
    json.dump(vus_sans_trad, open(MANQUANTS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("textes sans traduction :", len(vus_sans_trad))
