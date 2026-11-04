#!/usr/bin/env python3
"""Compare à trois voies les objets à arbitrer : production (relevé posé, avant la séquence), répétition (après la
séquence) et recette (recette-definitions.json, recette-droits.tsv). Écrit un rapport Markdown et, avec --annotations,
des annotations GitHub (::notice) de 60 000 caractères au plus.

    python3 omega/prod/arbitrage/comparer.py avant.json apres.json [--annotations] > rapport.md
"""
import difflib, json, os, sys
from collections import defaultdict

ICI = os.path.dirname(os.path.abspath(__file__))
avant, apres = (json.load(open(f)) for f in sys.argv[1:3])
recette_defs = json.load(open(os.path.join(ICI, 'recette-definitions.json')))
recette_droits = dict(l.rstrip('\n').split('\t', 1) for l in open(os.path.join(ICI, 'recette-droits.tsv')) if '\t' in l)

sortie = []
def p(*a): sortie.append(' '.join(str(x) for x in a))

p('# Arbitrage : production (avant la séquence), répétition (après), recette\n')
p('## Définitions\n')
p('| Objet | répétition = recette | répétition = production | production = recette |')
p('|---|---|---|---|')
for k in sorted(recette_defs):
    r, a, v = recette_defs[k], apres['definitions'].get(k), avant['definitions'].get(k)
    oui = lambda b: 'oui' if b else '**non**'
    p(f'| `{k}` | {oui(a == r)} | {oui(a == v) if v is not None else "absent en production"} | {oui(v == r) if v is not None else "—"} |')
for k in sorted(recette_defs):
    r, a, v = recette_defs[k], apres['definitions'].get(k), avant['definitions'].get(k)
    if a == r:
        continue
    p(f'\n### {k}\n')
    for titre, x, y, nx, ny in (('répétition → recette', a, r, 'repetition', 'recette'), ('production → recette', v, r, 'production', 'recette')):
        if x is None or x == y:
            continue
        diff = list(difflib.unified_diff((x or '').splitlines(), (y or '').splitlines(), nx, ny, n=1, lineterm=''))
        p(f'{titre} ({len(diff)} lignes) :\n```diff')
        p('\n'.join(diff[:120]) + ('\n…' if len(diff) > 120 else ''))
        p('```')

p('\n## Droits (ACL hors propriétaire) qui diffèrent entre la répétition et la recette\n')
familles = defaultdict(list)
for o in sorted(set(recette_droits) & set(apres['droits'])):
    r, a = recette_droits[o], apres['droits'][o]
    if r == a:
        continue
    genre = 'fonction' if '(' in o else 'relation'
    # ACL vide (« défaut ») : pour une fonction, EXECUTE à PUBLIC ; pour une relation, rien hors du propriétaire.
    ens = lambda x: {'PUBLIC:EXECUTE'} if x == 'défaut' and genre == 'fonction' else (set() if x == 'défaut' else set(x.split(',')))
    sr, sa = ens(r), ens(a)
    if sr == sa:
        continue   # même droits, ordre différent dans la chaîne relevée
    v = avant['droits'].get(o)
    schema = o.split('.')[0] if '.' in o.split('(')[0] else 'public'
    cle = (genre, schema, '+' + ' +'.join(sorted(sr - sa)) if sr - sa else '', '-' + ' -'.join(sorted(sa - sr)) if sa - sr else '',
           'production identique' if v is not None and ens(v) == sa else ('absent de la production' if v is None else 'production autre'))
    familles[cle].append(o)
p('| Genre | Schéma | Manque à la répétition (recette a) | En trop dans la répétition | Production | Nombre | Exemples |')
p('|---|---|---|---|---|---|---|')
for cle, objets in sorted(familles.items(), key=lambda x: -len(x[1])):
    p(f'| {cle[0]} | {cle[1]} | {cle[2] or "—"} | {cle[3] or "—"} | {cle[4]} | {len(objets)} | {", ".join(f"`{o}`" for o in objets[:6])}{" …" if len(objets) > 6 else ""} |')
p(f'\nTotal : {sum(len(x) for x in familles.values())} objets en {len(familles)} familles.')
p('\n### Liste complète\n')
for cle, objets in sorted(familles.items(), key=lambda x: -len(x[1])):
    p(f'- {cle} : ' + ', '.join(objets))

texte = '\n'.join(sortie)
print(texte)

# Annotations courtes (GitHub les coupe vers 4 000 caractères) : un résumé, puis un écart réel par annotation.
import re
def sans_bruit(t):
    # Sans commentaires « -- » (hors chaînes, approximation suffisante ici) ni différences d'espaces.
    t = re.sub(r"--[^\n]*", "", t or "")
    return re.sub(r"\s+", " ", t).strip()
def esc(m):
    return m.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
if '--annotations' in sys.argv:
    etats, reels = [], []
    for k in sorted(recette_defs):
        r, a, v = recette_defs[k], apres['definitions'].get(k), avant['definitions'].get(k)
        if a == r:
            continue
        if sans_bruit(a) == sans_bruit(r):
            etats.append(f'{k} : commentaires/espaces seulement')
            continue
        etats.append(f'{k} : DIFFÉRENT' + (' (production = répétition)' if v is not None and sans_bruit(v) == sans_bruit(a) else ''))
        ta, tr = sans_bruit(a).split(' '), sans_bruit(r).split(' ')
        morceaux = []
        for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, ta, tr, autojunk=False).get_opcodes():
            if op != 'equal':
                morceaux.append(f"[{op}] répétition « {' '.join(ta[max(0, i1 - 6):i2 + 3])} » → recette « {' '.join(tr[max(0, j1 - 6):j2 + 3])} »")
        reels.append((k, ' ‖ '.join(morceaux)))
    print('::notice title=Arbitrage : définitions::' + esc(' ; '.join(etats))[:3900], file=sys.stderr)
    for k, d in reels[:20]:
        print(f'::notice title=Écart {k[:80]}::' + esc(d)[:3900], file=sys.stderr)
    lignes = [f'{c[0]} {c[1]} | manque {c[2] or "—"} | trop {c[3] or "—"} | {c[4]} | {len(o)} : {", ".join(o[:4])}' for c, o in sorted(familles.items(), key=lambda x: -len(x[1]))]
    for n in range(0, len(lignes), 8):
        print(f'::notice title=Arbitrage : droits {n // 8 + 1}::' + esc('\n'.join(lignes[n:n + 8]))[:3900], file=sys.stderr)
