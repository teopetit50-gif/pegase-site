#!/usr/bin/env python3
"""Convertit 02_base_saas.csv en base_saas.xlsx : feuille 'Tous' avec filtres + une feuille par catégorie."""
import csv, os, re
from collections import OrderedDict
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

base = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(base, "..", "02_base_saas.csv")
dst = os.path.join(base, "..", "base_saas.xlsx")
with open(src, encoding="utf-8-sig", newline="") as fh:
    rd = csv.DictReader(fh); cols = rd.fieldnames; rows = list(rd)

WIDTHS = {"nom":24,"url":30,"categorie":30,"etapes_workflow":14,"segment_cible":22,"probleme_resolu":50,
          "fonctionnalites_cles":50,"fonctionnalites_ia":40,"modele_prix":22,"prix_public":40,"integrations":40,
          "annee_creation":10,"siege":22,"proprietaire_ou_levees":40,"note_g2":8,"nb_avis_g2":10,
          "points_forts":50,"points_faibles":50,"date_verification":13,"sources":60}

def safe_title(t):
    t = re.sub(r"[\[\]\*\?/\\:]", "-", t)[:31]
    return t or "Autre"

def write_sheet(ws, data):
    ws.append(cols)
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor="1F3A5F")
        c.alignment = Alignment(vertical="top", wrap_text=True)
    for r in data: ws.append([r[c] for c in cols])
    for i, c in enumerate(cols, 1):
        ws.column_dimensions[get_column_letter(i)].width = WIDTHS.get(c, 20)
    for row in ws.iter_rows(min_row=2):
        for cell in row: cell.alignment = Alignment(vertical="top", wrap_text=True)
    ws.freeze_panes = "B2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(cols))}{len(data)+1}"

wb = Workbook(); ws = wb.active; ws.title = "Tous"; write_sheet(ws, rows)
groups = OrderedDict()
for r in rows: groups.setdefault(r["categorie"].split(" / ")[0], []).append(r)
used = set()
for cat, data in groups.items():
    t = safe_title(cat); n = 2
    while t in used: t = safe_title(cat)[:28] + f"_{n}"; n += 1
    used.add(t); write_sheet(wb.create_sheet(t), data)
wb.save(dst); print(f"{dst} : {len(rows)} lignes, {1+len(groups)} feuilles")
