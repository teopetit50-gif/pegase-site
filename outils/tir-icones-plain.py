"""Tiroma (02/11/2026) : génère components/espace2/tiroma/PlainIcone.tsx à partir des tracés SVG
relevés dans le DOM de Plain (docs/refonte-metiers/releves/plain-*.md, branche refs-plain-attio-cal).
python3 outils/tir-icones-plain.py <dossier releves>"""
import re, sys, json
d = sys.argv[1]
NOMS = {
    ("plain-threads.md", "Statut « Needs first response »"): "Premiere",
    ("plain-threads.md", "Statut « Needs next response »"): "Suivante",
    ("plain-threads.md", "Statut « Investigating »"): "Enquete",
    ("plain-threads.md", "Canal CHAT"): "Bulle",
    ("plain-threads.md", "Non assigné"): "NonAssigne",
    ("plain-threads.md", "Coche de sélection"): "Coche",
    ("plain-tenants.md", "Titre / vignette"): "Batiment",
    ("plain-tenants.md", "Favori"): "Etoile",
    ("plain-tenants.md", "Filters"): "Filtres",
    ("plain-tenants.md", "Display"): "Ecran",
    ("plain-tenants.md", "Plus"): "Plus",
    ("plain-tenants.md", "Loupe"): "Loupe",
    ("plain-tenants.md", "×"): "Croix",
    ("plain-tenants.md", "Cercle « fil ouvert »"): "Cercle",
    ("plain-tenants.md", "Tier"): "Tier",
    ("plain-tenants.md", "⋯"): "Points",
    ("plain-tasks.md", "Icône « à faire »"): "Tache",
    ("plain-tasks.md", "Icône « faite »"): "TacheFaite",
}
out = {}
for (fichier, debut), nom in NOMS.items():
    for ligne in open(f"{d}/{fichier}", encoding="utf8"):
        l = ligne.strip()
        if l.startswith("- " + debut):
            m = re.findall(r"`(<path[^`]*)`", l)
            if m: out[nom] = m[0]
            break
    if nom not in out: print("absent :", nom, file=sys.stderr)
# cellule « API » (code <>), sur la ligne « Source »
for ligne in open(f"{d}/plain-tenants.md", encoding="utf8"):
    if "cellule « API »" in ligne:
        out["Code"] = re.findall(r"`(<path[^`]*)`", ligne)[-1]
# priorités (viewBox 18) : trois barres, couleurs du relevé ; Urgent : carré rouge
for ligne in open(f"{d}/plain-threads.md", encoding="utf8"):
    if ligne.strip().startswith("`<path fill=\"#f14e4b\""):
        out["Urgent"] = re.findall(r"`(<path[^`]*)`", ligne)[0]
barres = lambda h, m, b: f'<rect width="12" height="2" x="3" y="4" rx="0.5" fill="{h}"/><rect width="12" height="2" x="3" y="8" rx="0.5" fill="{m}"/><rect width="12" height="2" x="3" y="12" rx="0.5" fill="{b}"/>'
lignes = "\n".join(f"  {k}: {json.dumps(v, ensure_ascii=False)}," for k, v in out.items())
src = f'''/* Les icônes de Plain, telles quelles (02/11/2026) : tracés relevés dans le DOM par la session
   références (docs/refonte-metiers/releves/plain-threads.md, plain-tenants.md, plain-tasks.md).
   Fichier généré par outils/tir-icones-plain.py, ne pas retoucher à la main. viewBox 0 0 24 24
   (priorités : 0 0 18 18), fill = currentColor. */

const TRACES = {{
{lignes}
}} as const;

export type NomPlainIcone = keyof typeof TRACES;

export function PlainIcone({{ nom, taille = 18, className, style }}: {{ nom: NomPlainIcone; taille?: number; className?: string; style?: React.CSSProperties }}) {{
  return <svg width={{taille}} height={{taille}} viewBox={{nom === "Urgent" ? "0 0 18 18" : "0 0 24 24"}} fill="currentColor" aria-hidden="true" className={{className}} style={{style}} dangerouslySetInnerHTML={{{{ __html: TRACES[nom] }}}} />;
}}

/* priorité de Plain (viewBox 18) : High 3 barres #e79d00 ; Normal haut #cdcddb, milieu et bas #8e8e9c ; Low haut et milieu #cdcddb, bas #8e8e9c */
const BARRES = {{
  high: {json.dumps(barres("#e79d00", "#e79d00", "#e79d00"))},
  normal: {json.dumps(barres("var(--pl-barre-vide)", "#8e8e9c", "#8e8e9c"))},
  low: {json.dumps(barres("var(--pl-barre-vide)", "var(--pl-barre-vide)", "#8e8e9c"))},
}} as const;

export type PrioritePlain = "urgent" | "high" | "normal" | "low";

export function PrioriteIcone({{ p, taille = 18 }}: {{ p: PrioritePlain; taille?: number }}) {{
  if (p === "urgent") return <PlainIcone nom="Urgent" taille={{taille}} />;
  return <svg width={{taille}} height={{taille}} viewBox="0 0 18 18" aria-hidden="true" dangerouslySetInnerHTML={{{{ __html: BARRES[p] }}}} />;
}}
'''
open("components/espace2/tiroma/PlainIcone.tsx", "w", encoding="utf8").write(src)
print(len(out), "icônes")
