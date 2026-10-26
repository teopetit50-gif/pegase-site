-- omega/prod/releve.sql — relevé DÉTAILLÉ du catalogue, une ligne par objet : categorie<TAB>objet<TAB>md5 (12).
-- A5 / préparation de la mise en production, 25/10/2026. LECTURE SEULE : un seul SELECT, aucune donnée de table.
-- Mêmes catégories et mêmes définitions normalisées qu'empreinte.sql (dont il reprend le corps), plus les versions des
-- extensions et les migrations inscrites (md5 de statements). Rien n'est exclu : la comparaison choisit.
-- Joué le 25/10 par le connecteur sur la production et la recette (omega/prod/releve-20261025/), et par
-- repetition-locale.sh sur la répétition. Comparer : python3 omega/prod/comparer_releves.py a.tsv b.tsv
with schemas(nspname) as (values ('public'), ('private')),
exclus(motif) as (values ('^private\.(depot_demander|depot_executer|tests_en_tache|tester_sans_trace)\M'), ('^private\.sorties_tests\M')),
norm as (
  select '(ygwbgpowzlbdaajlsqkn|noepmkkplxshjbmqqxft)'::text as projets
),
objets as (
  -- Fonctions et procédures (pas les agrégats)
  select 'fonction' as categorie, p.oid::regprocedure::text as objet,
         md5(regexp_replace(pg_get_functiondef(p.oid), (select projets from norm), '<projet>', 'g')) as empreinte
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in (select nspname from schemas) and p.prokind in ('f', 'p')
  union all
  -- Tables : colonnes (nom, type, non nul, défaut, identité, générée), RLS
  select 'table', format('%I.%I', n.nspname, c.relname),
         md5(coalesce((select string_agg(format('%s %s %s %s %s %s', a.attname, format_type(a.atttypid, a.atttypmod), a.attnotnull,
                                                coalesce(pg_get_expr(d.adbin, d.adrelid), ''), a.attidentity, a.attgenerated), ' | ' order by a.attnum)
                       from pg_attribute a left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
                       where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped), '')
             || format(' rls=%s force=%s', c.relrowsecurity, c.relforcerowsecurity))
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in (select nspname from schemas) and c.relkind in ('r', 'p')
  union all
  select 'contrainte', format('%I.%I.%I', n.nspname, c.relname, k.conname), md5(pg_get_constraintdef(k.oid))
  from pg_constraint k join pg_class c on c.oid = k.conrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in (select nspname from schemas)
  union all
  select 'index', format('%I.%I', n.nspname, i.relname), md5(pg_get_indexdef(x.indexrelid))
  from pg_index x join pg_class i on i.oid = x.indexrelid join pg_namespace n on n.oid = i.relnamespace
  where n.nspname in (select nspname from schemas)
  union all
  select 'declencheur', format('%I.%I.%I', n.nspname, c.relname, t.tgname), md5(pg_get_triggerdef(t.oid))
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in (select nspname from schemas) and not t.tgisinternal
  union all
  select 'vue', format('%I.%I', n.nspname, c.relname),
         md5(pg_get_viewdef(c.oid) || coalesce(array_to_string(c.reloptions, ','), '') || c.relkind::text)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in (select nspname from schemas) and c.relkind in ('v', 'm')
  union all
  select 'politique', format('%I.%I.%I', p.schemaname, p.tablename, p.policyname),
         md5(concat_ws(' | ', p.permissive, p.cmd, array_to_string(array(select unnest(p.roles) order by 1), ','), p.qual, p.with_check))
  from pg_policies p
  where p.schemaname in ('public', 'private', 'storage')
  union all
  select 'publication', format('%I.%I.%I', pt.pubname, pt.schemaname, pt.tablename), md5(pt.pubname::text)
  from pg_publication_tables pt
  where pt.pubname = 'supabase_realtime'
  union all
  select 'cron', j.jobname,
         md5(j.schedule || ' | ' || regexp_replace(j.command, (select projets from norm), '<projet>', 'g') || ' | ' || j.active::text)
  from cron.job j
  union all
  -- Droits sur les relations (tables, vues, séquences) et les fonctions, par rôle
  select 'droit', format('%I.%I', n.nspname, c.relname),
         md5(coalesce((select string_agg(format('%s:%s%s', coalesce(r.rolname, 'PUBLIC'), a.privilege_type, case when a.is_grantable then '*' else '' end), ',' order by coalesce(r.rolname, 'PUBLIC'), a.privilege_type)
                       from aclexplode(c.relacl) a left join pg_roles r on r.oid = a.grantee
                       where a.grantee <> c.relowner), 'défaut'))
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in (select nspname from schemas) and c.relkind in ('r', 'p', 'v', 'm', 'S')
  union all
  select 'droit', p.oid::regprocedure::text,
         md5(coalesce((select string_agg(format('%s:%s', coalesce(r.rolname, 'PUBLIC'), a.privilege_type), ',' order by coalesce(r.rolname, 'PUBLIC'), a.privilege_type)
                       from aclexplode(p.proacl) a left join pg_roles r on r.oid = a.grantee
                       where a.grantee <> p.proowner), 'défaut'))
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in (select nspname from schemas) and p.prokind in ('f', 'p')
  union all
  select 'droit', 'schema ' || n.nspname,
         md5(coalesce((select string_agg(format('%s:%s', coalesce(r.rolname, 'PUBLIC'), a.privilege_type), ',' order by coalesce(r.rolname, 'PUBLIC'), a.privilege_type)
                       from aclexplode(n.nspacl) a left join pg_roles r on r.oid = a.grantee
                       where a.grantee <> n.nspowner), 'défaut'))
  from pg_namespace n
  where n.nspname in (select nspname from schemas)
  union all
  select 'droit_defaut', format('%s %s %s', coalesce(r.rolname, '?'), coalesce(n.nspname, '(global)'), d.defaclobjtype::text),
         md5(coalesce((select string_agg(format('%s:%s', coalesce(g.rolname, 'PUBLIC'), a.privilege_type), ',' order by coalesce(g.rolname, 'PUBLIC'), a.privilege_type)
                       from aclexplode(d.defaclacl) a left join pg_roles g on g.oid = a.grantee), ''))
  from pg_default_acl d left join pg_roles r on r.oid = d.defaclrole left join pg_namespace n on n.oid = d.defaclnamespace
  where n.nspname is null or n.nspname in ('public', 'private', 'extensions')
  union all
  select 'enum', format('%I.%I', n.nspname, t.typname),
         md5((select string_agg(e.enumlabel, ',' order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid))
  from pg_type t join pg_namespace n on n.oid = t.typnamespace
  where n.nspname in (select nspname from schemas) and t.typtype = 'e'
  union all
  select 'extension', x.extname || ' ' || x.extversion || ' @' || x.extnamespace::regnamespace::text, md5(x.extname)
  from pg_extension x
  union all
  select 'migration', version || ' ' || coalesce(name, ''), md5(coalesce(array_to_string(statements, E'\n'), ''))
  from supabase_migrations.schema_migrations
)
select categorie || E'\t' || objet || E'\t' || left(empreinte, 12) from objets order by categorie, objet;
