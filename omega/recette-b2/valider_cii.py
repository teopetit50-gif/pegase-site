"""valider_cii.py — valide un XML CII TAVARO hors base (session B2, 06/10/2026, b2_06).

Trois contrôles, ceux que fera une plateforme agréée :
  1. le schéma XSD Factur-X EN 16931 ;
  2. le schematron EN 16931 (règles BR-*, PEPPOL comprises) ;
  3. le schematron français de la réforme, Flux 2 B2B (règles BR-FR-*) — sans objet pour une pièce au particulier,
     qui part en e-reporting et non en facture électronique.
Les fichiers viennent du paquet `factur-x` (Akretion), l'exécution XSLT 2.0 de `saxonche`.
  python3 -m venv /tmp/fx && /tmp/fx/bin/pip install factur-x saxonche
  /tmp/fx/bin/python omega/recette-b2/valider_cii.py piece1.xml [piece2.xml …]
Le XML d'une pièce se lit par la porte : select public.loc_facture_electronique('<facture>') ->> 'xml'.
"""
import os
import re
import subprocess
import sys

import facturx
from saxonche import PySaxonProcessor

BASE = os.path.join(os.path.dirname(facturx.__file__), "xsd_and_schematron")
XSD = os.path.join(BASE, "facturx-en16931", "Factur-X_EN16931.xsd")
SCHEMATRONS = [
    ("EN 16931", os.path.join(BASE, "facturx-en16931", "FACTUR-X_EN16931.xslt")),
    ("BR-FR Flux 2", os.path.join(BASE, "cii-schematron-fr-ctc", "BR-FR-Flux2-Schematron-CII.xslt")),
]
ECHEC = re.compile(r"<svrl:failed-assert\b(?P<attrs>[^>]*)>.*?<svrl:text>(?P<texte>.*?)</svrl:text>", re.S)


def attribut(attrs, nom):
    m = re.search(nom + r'="([^"]*)"', attrs)
    return m.group(1) if m else ""


def main(fichiers):
    graves = 0
    for f in fichiers:
        r = subprocess.run(["xmllint", "--noout", "--schema", XSD, f], capture_output=True, text=True)
        ok = r.returncode == 0
        print(f"{os.path.basename(f)} — XSD : {'valide' if ok else 'INVALIDE'}")
        if not ok:
            graves += 1
            print("   " + r.stderr.strip().replace("\n", "\n   "))
    with PySaxonProcessor(license=False) as p:
        for nom, xsl in SCHEMATRONS:
            exe = p.new_xslt30_processor().compile_stylesheet(stylesheet_file=xsl)
            for f in fichiers:
                svrl = exe.transform_to_string(source_file=f)
                echecs = [(attribut(m["attrs"], "flag"), attribut(m["attrs"], "id"), re.sub(r"\s+", " ", m["texte"]).strip()) for m in ECHEC.finditer(svrl)]
                fatals = [e for e in echecs if e[0] in ("fatal", "error", "")]
                graves += len(fatals)
                print(f"{os.path.basename(f)} — {nom} : {len(fatals)} erreur(s), {len(echecs) - len(fatals)} avertissement(s)")
                for flag, ident, texte in echecs:
                    print(f"   [{flag or 'erreur'}] {ident} {texte[:200]}")
    return 1 if graves else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
