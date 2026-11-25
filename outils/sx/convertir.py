#!/usr/bin/env python3
"""HTML rendu de la référence -> composants TSX, classes intactes.

usage : convertir.py <index.html> <dossier de sortie> [--vivant instantane.json]
                     [--images BASE] [--textes textes-fr.json] [--manquants out.json]

Deux emplois :
  1. SANS --textes : port littéral (texte et images de la référence, via
     --images BASE). C'est la version qu'on compare à la référence avec
     compare.mjs — elle prouve que la géométrie est identique.
  2. AVEC --textes : même balisage, contenu Omega. Le dictionnaire est rangé
     PAR BLOC (nav, hero, s1…s11, pied), parce qu'un même mot de la
     référence (« Payroll ») ne se rend pas pareil d'un bloc à l'autre :
        { "s1": { "Run payroll": "Relancer les impayés",
                  "@Share": "Partager",              <- attribut lisible (aria-label, alt…)
                  "Pay##2": "Pose" },                <- 2e occurrence du bloc seulement
          "__liens__":  { "nav": { "Pricing": "/tarifs" } },   <- <a>/<button> rendus en vrais liens
          "__images__": { "/employees/amy-mckinnon.jpg": "/accueil-sx/avatar-am.svg" },
          "__defile__": ["Ventes", "Achats", …],              <- mots du bandeau défilant
          "__mot_symbole__": "OMEGA" }
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
OMEGA = bool(DICO)
IMG = DICO.get("__images__", {})
LIENS = DICO.get("__liens__", {})
DEFILE = DICO.get("__defile__", [])
sans_trad = {}
liens_morts = []

BLOCS = {"SxNav": "nav", "SxFilets": "filets", "SxHero": "hero", "SxPlateforme": "s1", "SxFiche": "s2",
         "SxAgents": "s3", "SxIntegrations": "s4", "SxMarque": "s5", "SxSecurite": "s6", "SxClients": "s7",
         "SxTarifs": "s8", "SxBande": "s9", "SxFaq": "s10", "SxAppel": "s11", "SxPied": "pied"}

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

# La jauge à barres de la fiche : ses barres dépendent de la largeur mesurée,
# le composant SxBarres les recalcule. Montants relevés dans la charge utile
# du rendu serveur de la référence (props de son PayBreakdownChart).
BARRES = [
    ("normal-hours", "purple", [1006.08, 1257.6]),
    ("overtime", "blue", [188.64, 125.76]),
    ("benefits", "orange", [150, 64.29, 51.42]),
    ("employer-contributions", "green", [128.57, 22.64, 24.5]),
]
# L'icône du bouton principal : la référence y met le logo d'Apple (« Get it
# on Mac »). Remplacé, en mode Omega, par un calendrier dessiné ici — même
# boîte 17 × 20, même `currentColor`.
CALENDRIER = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17 20" fill="currentColor" aria-hidden="true" className={CLASSE}>'
              '<path fillRule="evenodd" clipRule="evenodd" d="M4.6 1a1 1 0 0 1 1 1v.9h5.8V2a1 1 0 1 1 2 0v.9h.5A3.1 3.1 0 0 1 17 6v9.9A3.1 3.1 0 0 1 13.9 19H3.1A3.1 3.1 0 0 1 0 15.9V6a3.1 3.1 0 0 1 3.1-3.1h.5V2a1 1 0 0 1 1-1ZM2 8.6v7.3c0 .6.5 1.1 1.1 1.1h10.8c.6 0 1.1-.5 1.1-1.1V8.6H2Zm9.6 2.2a1 1 0 0 1 .1 1.4l-3.2 3.6a1 1 0 0 1-1.5 0l-1.6-1.7a1 1 0 0 1 1.5-1.4l.8.9 2.5-2.7a1 1 0 0 1 1.4-.1Z" />'
              '</svg>')
# L'insigne « POPIA » dessine la carte de l'Afrique du Sud : sans objet ici.
# Même cadre, un hexagone à la place (la carte tenait dans ~730 × 790).
HEXAGONE = "M750 345L1101 547.5V952.5L750 1155L399 952.5V547.5Z"

# Aucune trace du nom de la référence dans le HTML servi : ses classes
# « synnax-* » sont renommées « sx-* » (et de même dans sx.css).
RENOMMER = lambda classes: re.sub(r"(?<![\w-])synnax-", "sx-", classes)

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

etat = {"bloc": None, "occ": {}, "occ_liens": {}, "defile": 0}
besoins = set()

def chercher(table, cle, compteur):
    """Rend la valeur de `cle` (ou de `cle##n` pour sa n-ième occurrence dans le bloc)."""
    compteur[cle] = compteur.get(cle, 0) + 1
    n = cle + "##" + str(compteur[cle])
    if n in table: return table[n]
    return table.get(cle)

def traduire(t, attribut=False):
    """Traduit en conservant les espaces de bord (ils comptent dans le rendu)."""
    if not OMEGA: return t
    coeur = t.strip()
    if not coeur: return t
    cle = ("@" if attribut else "") + coeur
    v = chercher(DICO.get(etat["bloc"], {}), cle, etat["occ"])
    if v is None:
        sans_trad.setdefault(etat["bloc"], []).append(cle)
        return t
    return t.replace(coeur, v, 1)

def texte_complet(n):
    out = []
    def rec(x):
        for e in x["enfants"]:
            if isinstance(e, str): out.append(e)
            elif e["tag"] not in ("script", "style", "title"): rec(e)
    rec(n)
    return " ".join("".join(out).split())

def est_ruban(n):
    if n["tag"] != "div": return False
    st = attr(n, "style") or ""
    enf = [e for e in n["enfants"] if isinstance(e, dict)]
    return "overflow:hidden" in st and "background:transparent" in st and len(enf) == 1 and enf[0]["tag"] == "canvas"

def est_regles(n):
    return n["tag"] == "div" and (attr(n, "class") or "").startswith("pointer-events-none absolute inset-y-0 left-1/2 z-0 mx-auto w-full max-w-[1920px]")

def enfants_barres(n, ind):
    etiq = [e for e in n["enfants"] if isinstance(e, dict) and e["tag"] == "span"]
    lignes = [ind + "<SxBarres", ind + "  categories={["]
    for (cle, coul, montants), e in zip(BARRES, etiq):
        sp = [c for c in e["enfants"] if isinstance(c, dict)]
        nom = traduire("".join(x for x in sp[0]["enfants"] if isinstance(x, str)))
        part = traduire("".join(x for x in sp[1]["enfants"] if isinstance(x, str)))
        lignes.append(ind + "    { cle: %s, etiquette: %s, part: %s, couleur: %s, montants: %s }," % (
            json.dumps(cle), json.dumps(nom, ensure_ascii=False), json.dumps(part, ensure_ascii=False), json.dumps(coul), json.dumps(montants)))
    lignes += [ind + "  ]}", ind + "/>"]
    return lignes

def rendre(n, prof, dans_main=False, dans_defile=False, dans_facturation=None):
    ind = "  " * prof
    if isinstance(n, str):
        return [ind + "{" + json.dumps(traduire(n), ensure_ascii=False) + "}"]
    tag = n["tag"]
    cls = attr(n, "class") or ""
    if tag in ("script", "style", "link", "template", "meta"):
        return []
    if tag == "svg" and cls == "sgf-svg":
        besoins.add("SxMotSymbole")
        mot = DICO.get("__mot_symbole__")
        if mot: return [ind + "<SxMotSymbole texte={" + json.dumps(mot, ensure_ascii=False) + "} largeur={604} />"]
        return [ind + '<SxMotSymbole texte="SYNNAX" marque={5} />']
    if OMEGA and tag == "svg" and attr(n, "viewBox") == "0 0 256 315":
        return [ind + CALENDRIER.replace("{CLASSE}", "{" + json.dumps(cls) + "}")]
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
    if OMEGA and tag == "img" and dans_defile and DEFILE:
        # Bandeau défilant : la référence y fait passer des logos de sociétés.
        # Ici, les modules d'Omega en mots-symboles typographiques (aucune
        # marque tierce, aucun « ils nous font confiance »).
        mot = DEFILE[etat["defile"] % len(DEFILE)]; etat["defile"] += 1
        return [ind + '<span className={"block font-sans text-[16.8px] leading-[16.8px] font-semibold tracking-[-0.04em] whitespace-nowrap text-[#121212] opacity-70 ipad:text-[19.6px] ipad:leading-[19.6px]"}>{' + json.dumps(mot, ensure_ascii=False) + "}</span>"]
    dans_main = dans_main or tag == "main"
    dans_defile = dans_defile or "logo-marquee" in cls.split()
    if "pr-billing" in cls.split(): dans_facturation = {"n": 0}

    # vrais liens
    lien = None
    if OMEGA and tag in ("a", "button"):
        lien = chercher(LIENS.get(etat["bloc"], {}), texte_complet(n) or ("@" + (attr(n, "aria-label") or "")), etat["occ_liens"])
        if tag == "a" and lien is None:
            liens_morts.append((etat["bloc"], texte_complet(n) or attr(n, "aria-label")))
    tag_rendu = tag
    if lien is not None:
        tag_rendu = "Link" if lien.startswith("/") else "a"
        if tag_rendu == "Link": besoins.add("Link")

    morceaux = []
    est_champ = tag in ("input", "textarea", "select")
    curseur = OMEGA and tag == "input" and "pr-range" in cls.split() and DICO.get("__curseur__")
    for k, v in n["attrs"]:
        kl = k.lower()
        if lien is not None and kl in ("href", "type"): continue
        if kl == "style":
            if curseur: v = "--fill:" + curseur["fill"]
            if v: morceaux.append("style=" + style_objet(v)); besoins.add("CSSProperties")
            continue
        nom = nom_attr(k)
        if est_champ and kl == "value": nom = "defaultValue"
        if est_champ and kl == "checked": nom = "defaultChecked"
        if curseur and kl in ("min", "max", "value"): v = str(curseur[kl])
        if OMEGA and dans_facturation is not None and tag == "button" and kl == "aria-pressed":
            # Omega n'a pas de prix à l'année : la bascule oppose « chaque mois » (active
            # par défaut) à « installation », là où la référence activait « yearly ».
            v = "true" if dans_facturation["n"] == 0 else "false"
        if OMEGA and tag == "path" and kl == "d" and (v or "").startswith("M990 385L1005 383"): v = HEXAGONE
        if kl in BOOLEENS and (v is None or v == ""):
            morceaux.append(nom + "={true}" if nom not in ("hidden",) else "hidden"); continue
        if v is None: v = ""
        if kl == "class": v = RENOMMER(v)
        # un <button> centre son texte d'office, un lien non : on le dit
        if kl == "class" and lien is not None and tag == "button": v = v + " text-center"
        if kl in LISIBLES: v = traduire(v, attribut=True)
        if kl in NUMERIQUES and re.fullmatch(r"-?\d+(\.\d+)?", v):
            morceaux.append(nom + "={" + v + "}"); continue
        if tag == "img" and kl == "src":
            v = IMG.get(v, (IMAGES + v) if v.startswith("/") else v)
        if tag == "img" and kl == "srcset":
            continue
        morceaux.append(nom + "={" + json.dumps(v, ensure_ascii=False) + "}")
    if OMEGA and dans_facturation is not None and tag == "button": dans_facturation["n"] += 1
    if lien is not None:
        morceaux.insert(0, "href={" + json.dumps(lien) + "}")
    ouvre = "<" + tag_rendu + ("" if not morceaux else " " + " ".join(morceaux))
    enfants = n["enfants"]
    if tag == "textarea":
        txt = "".join(e for e in enfants if isinstance(e, str))
        return [ind + ouvre + (" defaultValue={" + json.dumps(txt, ensure_ascii=False) + "}" if txt else "") + " />"]
    if not enfants:
        return [ind + ouvre + " />"]
    lignes = [ind + ouvre + ">"]
    if attr(n, "data-slot") == "pay-breakdown-chart-meter":
        besoins.add("SxBarres")
        lignes += enfants_barres(n, ind + "  ")
    else:
        for e in enfants:
            lignes += rendre(e, prof + 1, dans_main, dans_defile, dans_facturation)
    lignes.append(ind + "</" + tag_rendu + ">")
    return lignes

def composant(nom, noeud):
    besoins.clear()
    etat.update(bloc=BLOCS.get(nom), occ={}, occ_liens={})
    corps = rendre(noeud, 2)
    imports = []
    if "CSSProperties" in besoins: imports.append('import type { CSSProperties } from "react";')
    if "Link" in besoins: imports.append('import Link from "next/link";')
    if "RubanFibre" in besoins: imports.append('import RubanFibre from "../RubanFibre";')
    if "SxMotSymbole" in besoins: imports.append('import SxMotSymbole from "../SxMotSymbole";')
    if "SxBarres" in besoins: imports.append('import SxBarres from "../SxBarres";')
    if "SxRegles" in besoins: imports.append('import SxRegles from "../SxRegles";')
    tete = [
        "/* GÉNÉRÉ par outils/sx/convertir.py — bloc « " + nom + " ».",
        "   Balisage porté depuis le relevé de la référence, contenu posé par",
        "   outils/sx/textes-fr.json. Pour changer un TEXTE : le dictionnaire, puis",
        "   régénérer. Ne pas retoucher une classe sans repasser outils/sx/compare.mjs. */",
        "/* eslint-disable @next/next/no-img-element */",
    ] + imports + ["", "export default function " + nom + "() {", "  return ("]
    return "\n".join(tete + corps + ["  );", "}", ""])

racine = lire(open(SRC, encoding="utf-8").read())
body = trouver(racine, lambda n: n["tag"] == "body")[0]
enveloppe = [e for e in body["enfants"] if isinstance(e, dict) and "isolate" in (attr(e, "class") or "")][0]
pied = [e for e in body["enfants"] if isinstance(e, dict) and e["tag"] == "footer"][0]

# Greffes : ce que la référence ne remplit que dans le navigateur (lignes et
# en-têtes des tableaux) est repris de l'instantané de son DOM vivant.
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
    code = composant(nom, noeud)
    open(os.path.join(SORTIE, nom + ".tsx"), "w", encoding="utf-8").write(code)
    print("%-16s %5d éléments  %7d octets" % (nom, sum(1 for _ in parcourir(noeud)), len(code.encode())))
if OMEGA:
    total = sum(len(v) for v in sans_trad.values())
    print("textes sans traduction :", total, {k: len(v) for k, v in sans_trad.items()})
    print("liens <a> sans destination :", len(liens_morts), liens_morts[:12])
    if MANQUANTS is not None:
        json.dump({"textes": sans_trad, "liens": liens_morts}, open(MANQUANTS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
