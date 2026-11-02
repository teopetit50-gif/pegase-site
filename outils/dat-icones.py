"""Génère components/espace2/daliro/DatIcone.tsx : les icônes d'Attio, telles quelles (02/11/2026).

Attio sert chaque icône comme un fichier SVG public (un <symbol id="icon">) sous
https://app.attio.com/web-assets/assets/icon-defs/<empreinte>.svg ; le nom de chaque
icône et son fichier se lisent dans son bundle public main.bundle.<…>.js (deux jeux :
12 px et 16 px ; on prend le 16, celui de la liste People et de la fiche).

python3 outils/dat-icones.py <icones.json tiré du bundle> [dossier de cache]
"""
import json, os, re, subprocess, sys

NOMS = ("PanelArrowRight PanelArrowLeft TableViewColor Controls SortDescending Filter ChevronDown ImportExport Plus Pin Bolt "
        "Handshake EmailArrowRight CalendarArrowRight Briefcase Email Phone NotePlus ListPlus Star Edit Dashboard VideoCamera "
        "Company Note CheckSquare Folder At Location DataText Text UserPlaceholderLight UserPlaceholderDark Check Copy Download "
        "Hashtag Columns ColumnsPlus Calendar WorkflowRun Cross Percentage Tag").split()
DOUZE, SEIZE = json.load(open(sys.argv[1]))
# absente du jeu 16 (seule la version en couleur de la barre latérale y est) : le tracé du jeu 12, mis à l'échelle
DU_DOUZE = ["Activity"]
cache = sys.argv[2] if len(sys.argv) > 2 else "/tmp/dat-icones"
os.makedirs(cache, exist_ok=True)
sortie = {}
for n in NOMS + DU_DOUZE:
    url = DOUZE[n] if n in DU_DOUZE else SEIZE[n]
    f = os.path.join(cache, n + ".svg")
    if not os.path.exists(f):
        subprocess.run(["curl", "-sL", "-m", "30", url, "-o", f], check=True)
    s = open(f).read()
    m = re.search(r'<symbol[^>]*viewBox="([^"]+)"[^>]*>(.*)</symbol>', s, re.S)
    corps = re.sub(r"\s+", " ", m.group(2)).strip()
    # attributs SVG → JSX n'est pas utile : on injecte le balisage tel quel
    sortie[n] = {"v": m.group(1), "c": corps, "u": url}
lignes = "\n".join(f'  {n}: {{ v: {json.dumps(x["v"])}, c: {json.dumps(x["c"])} }},' for n, x in sortie.items())
open("components/espace2/daliro/DatIcone.tsx", "w").write(f'''/* Les icônes d'Attio, telles quelles (02/11/2026) : le contenu de chaque <symbol id="icon">
   servi publiquement par Attio (https://app.attio.com/web-assets/assets/icon-defs/…, jeu 16 px,
   nom lu dans son bundle public). Leurs tracés peignent en var(--color) : on la pose sur la couleur
   du texte. Fichier généré par outils/dat-icones.py, ne pas retoucher. */

const TRACES = {{
{lignes}
}} as const;

export type NomDatIcone = keyof typeof TRACES;

export function DatIcone({{ nom, taille = 16, className, style }}: {{ nom: NomDatIcone; taille?: number; className?: string; style?: React.CSSProperties }}) {{
  const t = TRACES[nom];
  return <svg width={{taille}} height={{taille}} viewBox={{t.v}} fill="none" aria-hidden="true" className={{className}} style={{{{ ["--color" as string]: "currentColor", ...style }}}} dangerouslySetInnerHTML={{{{ __html: t.c }}}} />;
}}
''')
print(len(sortie), "icônes")
