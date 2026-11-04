#!/usr/bin/env python3
"""Relève, sur une base (répétition), les objets à arbitrer : définitions des clés de recette-definitions.json et droits
(ACL) de toutes les relations et fonctions de public et private. LECTURE SEULE. Sortie : JSON sur stdout.

    python3 omega/prod/arbitrage/relever.py "$BASE_URL" > avant.json

Même rendu que les relevés faits par le connecteur sur la recette et la production : rôle postgres, search_path
"$user", public, extensions (sinon auth.uid() s'écrit uid()).
"""
import json, os, subprocess, sys

ICI = os.path.dirname(os.path.abspath(__file__))
url = sys.argv[1]
cles = sorted(json.load(open(os.path.join(ICI, 'recette-definitions.json'))))

def lit(s):
    return "'" + s.replace("'", "''") + "'"

lignes = []
for k in cles:
    genre, _, objet = k.partition(' ')
    if genre == 'fonction':
        lignes.append(f"select {lit(k)}, case when to_regprocedure({lit(objet)}) is null then null else pg_get_functiondef(to_regprocedure({lit(objet)})) end")
    elif genre == 'politique':
        sch, tab, nom = objet.split('.', 2)
        lignes.append(f"select {lit(k)}, (select concat_ws(E'\\n', 'cmd ' || cmd, 'roles ' || array_to_string(roles, ','), 'permissive ' || permissive, 'using ' || qual, 'check ' || with_check) from pg_policies where schemaname = {lit(sch)} and tablename = {lit(tab)} and policyname = {lit(nom)})")
    elif genre == 'contrainte':
        tab, nom = objet.split('.', 1)
        lignes.append(f"select {lit(k)}, (select pg_get_constraintdef(c.oid) from pg_constraint c where c.conrelid = to_regclass({lit(tab)}) and c.conname = {lit(nom)})")
defs = "with d(k, v) as (" + "\nunion all ".join(lignes) + ") select jsonb_object_agg(k, v)::text from d"
droits = """with s(nspname) as (values ('public'), ('private')),
d as (
  select format('%I.%I', n.nspname, c.relname) o,
         coalesce((select string_agg(format('%s:%s%s', coalesce(r.rolname, 'PUBLIC'), a.privilege_type, case when a.is_grantable then '*' else '' end), ',' order by coalesce(r.rolname, 'PUBLIC'), a.privilege_type)
                   from aclexplode(c.relacl) a left join pg_roles r on r.oid = a.grantee where a.grantee <> c.relowner), 'défaut') v
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in (select nspname from s) and c.relkind in ('r','p','v','m','S')
  union all
  select p.oid::regprocedure::text,
         coalesce((select string_agg(format('%s:%s', coalesce(r.rolname, 'PUBLIC'), a.privilege_type), ',' order by coalesce(r.rolname, 'PUBLIC'), a.privilege_type)
                   from aclexplode(p.proacl) a left join pg_roles r on r.oid = a.grantee where a.grantee <> p.proowner), 'défaut')
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in (select nspname from s) and p.prokind in ('f','p')
)
select jsonb_object_agg(o, v)::text from d"""
env = dict(os.environ, PGOPTIONS='-c search_path="$user",public,extensions')
def requete(q):
    return json.loads(subprocess.run(['psql', url, '-XAtq', '-v', 'ON_ERROR_STOP=1', '-c', q], capture_output=True, text=True, check=True, env=env).stdout)
json.dump({'definitions': requete(defs), 'droits': requete(droits)}, sys.stdout, ensure_ascii=False)
