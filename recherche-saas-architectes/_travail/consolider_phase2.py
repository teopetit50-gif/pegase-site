#!/usr/bin/env python3
"""Consolide les fragments JSONL de la Phase 2 en 02_base_saas.csv (dédoublonnage par nom normalisé)."""
import csv, glob, json, os, re, sys, unicodedata

COLS = ["nom","url","categorie","etapes_workflow","segment_cible","probleme_resolu",
        "fonctionnalites_cles","fonctionnalites_ia","modele_prix","prix_public","integrations",
        "annee_creation","siege","proprietaire_ou_levees","note_g2","nb_avis_g2","points_forts",
        "points_faibles","date_verification","sources"]

def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii","ignore").decode().lower()
    s = re.sub(r"\(.*?\)", "", s)
    s = re.sub(r"[^a-z0-9]+", "", s)
    return s

def clean(v):
    if v is None: return "non trouvé"
    if isinstance(v, (list, tuple)): v = "; ".join(str(x) for x in v)
    v = str(v).replace("—", ", ").replace("–", "-").replace("\r"," ").replace("\n"," ")
    v = re.sub(r"\s+", " ", v).strip()
    return v if v else "non trouvé"

base = os.path.dirname(os.path.abspath(__file__))
rows, seen, dups = [], {}, []
for f in sorted(glob.glob(os.path.join(base, "02_frag_*.jsonl"))):
    with open(f, encoding="utf-8") as fh:
        for i, line in enumerate(fh, 1):
            line = line.strip()
            if not line: continue
            try: obj = json.loads(line)
            except Exception as e:
                print(f"[ERREUR JSON] {os.path.basename(f)} ligne {i}: {e}", file=sys.stderr); continue
            row = {c: clean(obj.get(c)) for c in COLS}
            missing = [c for c in COLS if c not in obj]
            if missing: print(f"[CLES MANQUANTES] {os.path.basename(f)} {row['nom']}: {missing}", file=sys.stderr)
            k = norm(row["nom"])
            if k in seen:
                dups.append((row["nom"], os.path.basename(f), seen[k])); continue
            seen[k] = os.path.basename(f)
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
