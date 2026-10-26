#!/usr/bin/env python3
"""Compare, pour les fonctions à arbitrer, le CORPS (texte entre les dollar-quotes, conservé tel quel par Postgres) :
recette (recette-definitions.json), production (relevé pg_dump omega/prod/base/02_schema.sql) et la dernière version
que pose l'export (omega/prod/migrations/, dans l'ordre). Signale un lot qui retouche la fonction « par repère »
(remplacement dans pg_get_functiondef) après sa dernière création. Lecture de fichiers seulement.

    python3 omega/prod/arbitrage/corps.py [--diff] > corps.md
"""
import difflib, glob, json, os, re, sys

ICI = os.path.dirname(os.path.abspath(__file__))
PROD = os.path.join(ICI, '..')
recette = json.load(open(os.path.join(ICI, 'recette-definitions.json')))

def corps_de(texte, debut):
    """Le corps de la fonction dont la déclaration commence à `debut` : premier AS $tag$ … $tag$ qui suit."""
    m = re.compile(r'\bAS\s+(\$[A-Za-z0-9_]*\$)', re.I).search(texte, debut)
    if not m:
        m2 = re.compile(r"\bAS\s+'", re.I).search(texte, debut)
        return None if not m2 else None
    tag = m.group(1)
    fin = texte.find(tag, m.end())
    return texte[m.end():fin] if fin >= 0 else None

def motif(nom):
    sch, _, n = nom.rpartition('.')
    sch = sch or 'public'
    q = rf'(?:{re.escape(sch)}\.|"{re.escape(sch)}"\.)?' if sch == 'public' else rf'(?:{re.escape(sch)}\.)'
    return re.compile(rf'create\s+(?:or\s+replace\s+)?function\s+{q}"?{re.escape(n)}"?\s*\(', re.I)

schema = open(os.path.join(PROD, 'base', '02_schema.sql')).read()
fichiers = sorted(glob.glob(os.path.join(PROD, 'migrations', '*.sql')))
textes = [(os.path.basename(f), open(f).read()) for f in fichiers]

def nettoie(c):
    return '\n'.join(l.rstrip() for l in (c or '').strip('\n').splitlines())

lignes = ['| Fonction | Production = recette | Export = recette | Export = production | Dernière pose par l\'export | Retouche par repère après |', '|---|---|---|---|---|---|']
details = []
for k in sorted(x for x in recette if x.startswith('fonction ')):
    sig = k.split(' ', 1)[1]
    nom = sig.split('(')[0]
    nb_args = 0 if sig.endswith('()') else sig.count(',') + 1
    r = nettoie(corps_de(recette[k], 0))
    mp = motif(nom)
    p = None
    for m in mp.finditer(schema):
        p = nettoie(corps_de(schema, m.start())); break
    e, ou = None, '—'
    for nomf, t in textes:
        for m in mp.finditer(t):
            e, ou = nettoie(corps_de(t, m.start())), nomf[:60]
    court = nom.split('.')[-1]
    reperes = [nomf[:40] for nomf, t in textes if ou != '—' and nomf > ou and court in t and re.search(r'pg_get_functiondef|replace\(', t)]
    if e is None:
        e = p   # l'export n'y touche pas : la production reste
    oui = lambda a, b: '—' if a is None or b is None else ('oui' if a == b else '**non**')
    lignes.append(f'| `{sig}` | {oui(p, r)} | {oui(e, r)} | {oui(e, p)} | {ou} | {", ".join(reperes) or "—"} |')
    if '--diff' in sys.argv and e != r:
        d = list(difflib.unified_diff((e or '').splitlines(), r.splitlines(), 'export' if ou != '—' else 'production', 'recette', n=2, lineterm=''))
        details.append(f'\n### `{sig}`\n\n```diff\n' + '\n'.join(d[:200]) + '\n```')
print('\n'.join(lignes))
print('\n'.join(details))
