#!/usr/bin/env python3
"""Convertit omega/SOCLE-EXTRAITS-TAMILA.sql (photographie, non exécutable) en DDL exécutable
pour la souche locale : tables (contraintes hors FK), puis FK, RLS et politiques, déclencheurs,
grants, la vue, puis toutes les fonctions telles quelles. Les crons sont ignorés.

usage : python3 extraire.py ../../../SOCLE-EXTRAITS-TAMILA.sql > 02_tamila.sql
Jamais sur la recette : c'est une souche pour un PostgreSQL local."""
import re
import sys

src = open(sys.argv[1], encoding="utf-8").read().split("\n")

tables = {}      # nom -> {cols: [...], cons: [...], fks: [...], policies: [...], triggers: [...], grants: [...]}
views = {}
functions = []   # textes complets
ordre_tables = []

i = 0
n = len(src)
while i < n:
    line = src[i]
    m = re.match(r"^-- ═══ TABLE (public\.\w+)$", line)
    if m:
        nom = m.group(1)
        t = {"cols": [], "cons": [], "fks": [], "policies": [], "triggers": [], "grants": []}
        tables[nom] = t
        ordre_tables.append(nom)
        i += 1
        while i < n and not src[i].startswith("-- ═══") and not src[i].startswith("-- ═════"):
            l = src[i]
            if l.startswith("  constraint "):
                body = l[2:]
                if " FOREIGN KEY " in body:
                    t["fks"].append(body)
                else:
                    t["cons"].append(body)
            elif l.startswith("  policy "):
                t["policies"].append(l[2:])
            elif l.startswith("  CREATE TRIGGER "):
                t["triggers"].append(l[2:])
            elif l.startswith("  grants authenticated: "):
                t["grants"].append(l.split(":", 1)[1].strip())
            elif l.startswith("  ") and not l.startswith("    "):
                # une colonne ; un défaut peut se poursuivre sur les lignes suivantes (CASE … END)
                col = l[2:]
                j = i + 1
                while j < n and src[j] and not src[j].startswith("  ") and not src[j].startswith("-- "):
                    col += " " + src[j].strip()
                    j += 1
                while j < n and src[j].startswith("    ") :
                    col += " " + src[j].strip()
                    j += 1
                    # après les WHEN/ELSE, le END sans indentation
                    if j < n and src[j] == "END":
                        col += " END"
                        j += 1
                        break
                t["cols"].append(col)
                i = j
                continue
            i += 1
        continue
    m = re.match(r"^-- ═══ VUE (public\.\w+)$", line)
    if m:
        nom = m.group(1)
        i += 1
        corps = []
        while i < n and not src[i].startswith("-- ═══") and not src[i].startswith("-- ═════"):
            corps.append(src[i])
            i += 1
        views[nom] = "\n".join(corps).strip().rstrip(";")
        continue
    m = re.match(r"^-- ═══ FONCTION ((private|public)\.\w+)$", line)
    if m:
        i += 1
        corps = []
        while i < n and not src[i].startswith("-- ═══") and not src[i].startswith("-- ═════"):
            corps.append(src[i])
            i += 1
        texte = "\n".join(corps).strip()
        if texte:
            functions.append(texte)
        continue
    i += 1

out = []
out.append("-- 02_tamila.sql — GÉNÉRÉ par extraire.py depuis omega/SOCLE-EXTRAITS-TAMILA.sql. Ne pas éditer ; jamais sur la recette.")
out.append("set check_function_bodies = off;")
# La fonction citée par les CHECK doit exister avant les tables.
for f in functions:
    if "FUNCTION private.tamila_chiffre_valide" in f:
        out.append(f.rstrip(";") + ";")
def colonne_generee(col, noms):
    """Un « défaut » qui cite une autre colonne est en réalité une colonne générée (la photographie
    rend les deux par pg_get_expr) : on la réécrit en generated always as (…) stored."""
    m = re.match(r"^(\w+ .*?) default (.+)$", col)
    if not m:
        return col
    tete, expr = m.groups()
    if any(re.search(r"\b" + re.escape(n) + r"\b", expr) for n in noms if n != col.split(" ")[0]):
        return f"{tete} generated always as ({expr.strip()}) stored"
    return col

for nom in ordre_tables:
    t = tables[nom]
    noms = [c.split(" ")[0] for c in t["cols"]]
    lignes = [colonne_generee(c, noms) for c in t["cols"]] + t["cons"]
    out.append(f"create table {nom} (\n  " + ",\n  ".join(lignes) + "\n);")
for nom in ordre_tables:
    for fk in tables[nom]["fks"]:
        out.append(f"alter table {nom} add {fk};")
for nom in ordre_tables:
    t = tables[nom]
    out.append(f"alter table {nom} enable row level security;")
    out.append(f"revoke all on {nom} from anon, authenticated;")
    for p in t["policies"]:
        m = re.match(r'^policy ("[^"]+") (\w+) to (\w+) using \((.*)\) with check \((.*)\)$', p)
        if not m:
            raise SystemExit("politique illisible : " + p)
        nomp, cmd, role, using, check = m.groups()
        s = f"create policy {nomp} on {nom} for {cmd.lower()} to {role}"
        if using.strip():
            s += f" using ({using})"
        if check.strip():
            s += f" with check ({check})"
        out.append(s + ";")
    for g in t["grants"]:
        out.append(f"grant {g.lower()} on {nom} to authenticated;")
for nom, corps in views.items():
    out.append(f"create view {nom} with (security_invoker = on) as\n{corps};")
    out.append(f"grant select on {nom} to authenticated;")
for f in functions:
    out.append(f.rstrip(";") + ";")
# les déclencheurs après les fonctions qu'ils appellent
for nom in ordre_tables:
    for tg in tables[nom]["triggers"]:
        out.append(tg.rstrip(";") + ";")
out.append("grant execute on all functions in schema private to authenticated, service_role;")
out.append("grant execute on all functions in schema public to authenticated, service_role;")
print("\n\n".join(out))
