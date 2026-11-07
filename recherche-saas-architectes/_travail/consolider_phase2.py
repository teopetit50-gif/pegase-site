#!/usr/bin/env python3
"""Consolide les fragments JSONL de la Phase 2 en 02_base_saas.csv (dédoublonnage par nom normalisé)."""
import csv, glob, json, os, re, sys, unicodedata

COLS = ["nom","url","categorie","etapes_workflow","segment_cible","probleme_resolu",
        "fonctionnalites_cles","fonctionnalites_ia","modele_prix","prix_public","integrations",
        "annee_creation","siege","proprietaire_ou_levees","note_g2","nb_avis_g2","points_forts",
        "points_faibles","date_verification","sources"]

HOMONYMES = {"bonsai"}  # noms identiques pour des produits différents : on garde la parenthèse

def norm(s, keep_paren=False):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii","ignore").decode().lower()
    if not keep_paren: s = re.sub(r"\(.*?\)", "", s)
    s = re.sub(r"[^a-z0-9]+", "", s)
    return s

def key(nom):
    k = norm(nom)
    return norm(nom, keep_paren=True) if k in HOMONYMES else k

CANON = [
    ("CAD / BIM / modélisation", "CAD, BIM et modélisation"),
    ("Collaboration, revue de plans, coordination BIM et gestion documentaire", "Collaboration et gestion documentaire"),
    ("Design nouvelle génération et IA", "Design nouvelle génération et IA"),
    ("Gestion de cabinet", "Gestion de cabinet"),
    ("Marketing, CRM, portfolio, gestion des connaissances, bibliothèques BIM, RH et formation", "Marketing, CRM, connaissances, RH"),
    ("Résidentiel, design-build et architecture d'intérieur (annexe)", "Résidentiel et intérieur (annexe)"),
    ("Suivi de chantier (Construction Administration)", "Suivi de chantier (CA)"),
    ("Visualisation, rendu, présentation client", "Visualisation et rendu"),
    ("Conformité, permis, spécifications, estimation, appel d'offres", "Conformité, specs, estimation, appels d'offres"),
]
PRIORITE = ["ia_design","cad_bim","visualisation","collaboration","conformite","chantier","residentiel","gestion_cabinet","marketing"]

def canon_cat(c):
    for pref, short in CANON:
        if c.startswith(pref):
            rest = c[len(pref):]
            rest = re.sub(r"^[\s:/,]*", "", rest)
            # retire les sous-catégories déjà contenues dans le préfixe (ex. "RFIs, submittals..." après ":")
            if " / " in rest: rest = rest.split(" / ", 1)[1]
            elif rest and ":" in c[:len(pref)+1]: rest = ""
            return f"{short} / {rest.strip()}" if rest.strip() else short
    return c

def prio(fname):
    for i, k in enumerate(PRIORITE):
        if k in fname: return i
    return 99

def clean(v):
    if v is None: return "non trouvé"
    if isinstance(v, (list, tuple)): v = "; ".join(str(x) for x in v)
    v = str(v).replace("—", ", ").replace("–", "-").replace("\r"," ").replace("\n"," ")
    v = re.sub(r"\s+", " ", v).strip()
    return v if v else "non trouvé"

base = os.path.dirname(os.path.abspath(__file__))
rows, seen, dups = [], {}, []
for f in sorted(glob.glob(os.path.join(base, "02_frag_*.jsonl")), key=lambda x: prio(os.path.basename(x))):
    with open(f, encoding="utf-8") as fh:
        for i, line in enumerate(fh, 1):
            line = line.strip()
            if not line: continue
            try: obj = json.loads(line)
            except Exception as e:
                print(f"[ERREUR JSON] {os.path.basename(f)} ligne {i}: {e}", file=sys.stderr); continue
            row = {c: clean(obj.get(c)) for c in COLS}
            row["categorie"] = canon_cat(row["categorie"])
            missing = [c for c in COLS if c not in obj]
            if missing: print(f"[CLES MANQUANTES] {os.path.basename(f)} {row['nom']}: {missing}", file=sys.stderr)
            k = key(row["nom"])
            if k in seen:
                kept = seen[k][1]
                for c in COLS:
                    if kept[c] == "non trouvé" and row[c] != "non trouvé" and c not in ("categorie","nom"):
                        kept[c] = row[c]
                if row["sources"] != "non trouvé":
                    extra = [u for u in row["sources"].split(" | ") if u not in kept["sources"]]
                    if extra: kept["sources"] = kept["sources"] + " | " + " | ".join(extra)
                dups.append((row["nom"], os.path.basename(f), "fusionné dans", seen[k][0])); continue
            seen[k] = (os.path.basename(f), row)
            rows.append(row)

rows.sort(key=lambda r: (r["categorie"], norm(r["nom"])))
out = os.path.join(base, "..", "02_base_saas.csv")
with open(out, "w", encoding="utf-8-sig", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=COLS, quoting=csv.QUOTE_ALL)
    w.writeheader(); w.writerows(rows)

print(f"{len(rows)} outils écrits dans {os.path.normpath(out)}")
print(f"{len(dups)} doublons ignorés :")
for d in dups: print("  -", d)
nosrc = [r["nom"] for r in rows if r["sources"] == "non trouvé" or not re.search(r"https?://", r["sources"])]
nodate = [r["nom"] for r in rows if not re.match(r"\d{4}-\d{2}-\d{2}", r["date_verification"])]
print(f"Sans source URL : {len(nosrc)} {nosrc}")
print(f"Sans date valide : {len(nodate)} {nodate}")
from collections import Counter
print("Par catégorie :")
for c, n in sorted(Counter(r["categorie"].split(" / ")[0] for r in rows).items()): print(f"  {n:3d}  {c}")
