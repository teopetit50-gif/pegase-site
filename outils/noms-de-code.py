#!/usr/bin/env python3
# ════════════════════════════════════════════════════════════════════════
# Les noms de code des agents ne sortent plus du serveur (24/11/2026)
#
# Teo : « les termes CASHD, FILED etc. ne doivent pas apparaître », ni dans
# le texte, ni dans le code source des pages. Ce script cherche les huit
# noms (les quatre agents et les quatre anciens) dans le site CONSTRUIT :
#
#   · le texte visible, les métadonnées (title, meta, JSON-LD) et les
#     attributs lus par un visiteur ou un lecteur d'écran ;
#   · le HTML BRUT de chaque page, flux de données compris : une clé React
#     ou une prop passée à un composant client y est écrite en clair ;
#   · les fichiers .rsc, le même flux servi aux navigations internes.
#
# Usage, après `npm run build` :
#     python3 outils/noms-de-code.py            (lit .next)
#     python3 outils/noms-de-code.py --tout     (l'espace client compte aussi)
# Sortie 0 = rien trouvé sur les pages jugées, sortie 1 = au moins un nom.
#
# Deux limites à connaître. Les pages rendues à la demande (/reserver,
# /installation, l'espace client) n'ont pas de HTML construit : elles ne
# sont pas vues ici. Les scripts JS envoyés au navigateur sont comptés À
# TITRE D'INFORMATION seulement : les tables qui traduisent un code en
# libellé y sont embarquées (lib/content.ts, components/logos.tsx), et les
# en sortir demande de renommer les clés partout, espace client compris.
# ════════════════════════════════════════════════════════════════════════
import os
import re
import sys
from html.parser import HTMLParser

NOMS = re.compile(r"\b(CASHD|OFFLOAD|REPUT|FILED|RELOAD|FRONTD|PULSE|VAULT)\b")
ESPACE = re.compile(r"^/(espace[23]?|formation|bienvenue)(/|$)")
ATTRIBUTS = ("alt", "aria-label", "title", "placeholder")


class Page(HTMLParser):
    """Sépare ce qu'un visiteur lit (texte, métadonnées, attributs) du reste du source."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.hors_texte = 0
        self.dans_title = False
        self.dans_jsonld = False
        self.texte, self.meta, self.attrs = [], [], []

    def handle_starttag(self, balise, attrs):
        a = dict(attrs)
        if balise in ("script", "style", "noscript", "template"):
            self.hors_texte += 1
            self.dans_jsonld = balise == "script" and a.get("type") == "application/ld+json"
            return
        if balise == "title":
            self.dans_title = True
        if balise == "meta":
            contenu = a.get("content") or ""
            if NOMS.search(contenu):
                self.meta.append(f"{a.get('name') or a.get('property') or '?'} : {contenu[:140]}")
            return
        for cle in ATTRIBUTS:
            valeur = a.get(cle)
            if valeur and NOMS.search(valeur):
                self.attrs.append(f"{cle} : {valeur[:140]}")

    def handle_endtag(self, balise):
        if balise in ("script", "style", "noscript", "template"):
            self.hors_texte = max(0, self.hors_texte - 1)
            self.dans_jsonld = False
        if balise == "title":
            self.dans_title = False

    def handle_data(self, donnees):
        if not NOMS.search(donnees):
            return
        extrait = " ".join(donnees.split())[:140]
        if self.dans_jsonld:
            self.meta.append(f"json-ld : {extrait}")
        elif self.dans_title:
            self.meta.append(f"title : {extrait}")
        elif not self.hors_texte:
            self.texte.append(extrait)


def lire(chemin):
    with open(chemin, encoding="utf-8", errors="replace") as f:
        return f.read()


def contextes(brut, maxi=3):
    vus = []
    for m in NOMS.finditer(brut):
        c = " ".join(brut[max(0, m.start() - 40) : m.end() + 30].split())
        if c not in vus:
            vus.append(c)
        if len(vus) == maxi:
            break
    return vus


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    tout = "--tout" in sys.argv
    racine = args[0] if args else ".next"
    app = os.path.join(racine, "server", "app")
    if not os.path.isdir(app):
        print(f"{app} introuvable : lancer `npm run build` d'abord.", file=sys.stderr)
        return 2

    pages, flux = {}, {}
    for dossier, _, fichiers in os.walk(app):
        for nom in fichiers:
            chemin = os.path.join(dossier, nom)
            rel = "/" + os.path.relpath(chemin, app)
            if nom.endswith(".html"):
                brut = lire(chemin)
                p = Page()
                p.feed(brut)
                pages[rel[:-5]] = (p.texte, p.meta, p.attrs, NOMS.findall(brut), brut)
            elif ".rsc" in nom or ".segments" in rel:
                n = NOMS.findall(lire(chemin))
                if n:
                    route = re.sub(r"(\.segments/.*|\.prefetch\.rsc|\.rsc)$", "", rel)
                    flux[route] = flux.get(route, 0) + len(n)

    juge = lambda route: tout or not (ESPACE.match(route) or route.startswith("/omega"))
    echecs = 0
    print(f"{len(pages)} pages construites lues dans {app}")
    for route in sorted(pages):
        texte, meta, attrs, brut_n, brut = pages[route]
        n_flux = flux.get(route, 0)
        if not (texte or meta or attrs or brut_n or n_flux):
            continue
        marque = "✗" if juge(route) else "·"
        echecs += 1 if juge(route) else 0
        print(f"{marque} {route} : texte {len(texte)}, métadonnées {len(meta)}, attributs {len(attrs)}, "
              f"HTML brut {len(brut_n)}, flux .rsc {n_flux}")
        for ligne in (texte + meta + attrs)[:4]:
            print(f"      lu par un visiteur : {ligne}")
        if not (texte or meta or attrs):
            for c in contextes(brut):
                print(f"      dans le source : …{c}…")
    for route in sorted(set(flux) - set(pages)):
        marque = "✗" if juge(route) else "·"
        echecs += 1 if juge(route) else 0
        print(f"{marque} {route} : flux .rsc {flux[route]} (pas de HTML construit)")

    # À titre d'information : les scripts envoyés au navigateur.
    statique = os.path.join(racine, "static")
    scripts = {}
    for dossier, _, fichiers in os.walk(statique):
        for nom in fichiers:
            if nom.endswith(".js"):
                n = len(NOMS.findall(lire(os.path.join(dossier, nom))))
                if n:
                    scripts["/_next/" + os.path.relpath(os.path.join(dossier, nom), racine)] = n
    charges = set()
    for route, (_, _, _, _, brut) in pages.items():
        if juge(route):
            charges.update(s for s in re.findall(r"/_next/static/[^\"'\\ ]+\.js", brut) if s in scripts)
    print(f"\nPour information — scripts JS portant un nom : {len(scripts)} fichiers, "
          f"dont {len(charges)} chargés par les pages jugées ({sum(scripts[s] for s in charges)} occurrences).")

    if echecs:
        print(f"\n{echecs} page(s) portent encore un nom de code.")
        return 1
    print("\nAucun nom de code dans le texte, les métadonnées, le HTML brut ni les flux des pages jugées.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
