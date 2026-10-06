-- omega/prod/empreinte.sql — preuve (c) du dossier MISE-EN-PRODUCTION.md : l'empreinte du catalogue.
-- A5, 06/10/2026. LECTURE SEULE : un seul SELECT. À jouer à l'identique sur la recette, puis sur la répétition (copie de
-- la production après pose de toute la séquence), puis sur la production. Les deux sorties doivent être égales.
--
-- Une ligne par objet : categorie, objet (nom stable : schéma, nom, signature), empreinte (md5 de sa définition
-- normalisée). Les identifiants internes (oid), les propriétaires et les références de projet Supabase ne comptent pas :
-- ygwbgpowzlbdaajlsqkn (recette) et noepmkkplxshjbmqqxft (production) sont remplacés par <projet>.
--
-- Catégories : fonction, table (colonnes, RLS), contrainte, index, declencheur, vue (définition et options),
-- politique (public, private, storage), publication (tables de supabase_realtime), cron (planning + commande),
-- droit (ACL des tables, vues, séquences, fonctions et schémas), droit_defaut (pg_default_acl), enum, extension.
--
-- Réglage (CTE « reglage ») :
--   niveau = 'resume' → une ligne par catégorie : nombre d'objets et md5 de l'ensemble ; c'est la sortie à comparer
--            d'abord (une quinzaine de lignes, une vingtaine de Ko au plus) ;
--   niveau = 'detail' → une ligne par objet de la catégorie « categorie » (et dont le nom commence par « prefixe ») :
--            pour trouver l'écart dans une catégorie dont le résumé diffère.
-- Hors champ : schémas tests et scories ; outillage propre à la recette (depot_*, tests_en_tache, tester_sans_trace,
-- sorties_tests) ; les données (lignes des tables) ne sont pas comparées ici.

with reglage as (
  select 'resume'::text as niveau,          -- ← 'resume' ou 'detail'
         'fonction'::text as categorie,     -- ← pour 'detail' : la catégorie à détailler
         ''::text as prefixe                -- ← pour 'detail' : début du nom d'objet (ex. 'private.filed_'), '' pour tout
),
schemas(nspname) as (values ('public'), ('private')),
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
         md5(coalesce((select string_agg(format('%s:%s%s', coalesce(r.rolname, 'PUBLIC'), a.privilege_type, case when a.is_grantable then '*' else '' end), ',' order by 1)
                       from aclexplode(c.relacl) a left join pg_roles r on r.oid = a.grantee
                       where a.grantee <> c.relowner), 'défaut'))
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in (select nspname from schemas) and c.relkind in ('r', 'p', 'v', 'm', 'S')
  union all
  select 'droit', p.oid::regprocedure::text,
         md5(coalesce((select string_agg(format('%s:%s', coalesce(r.rolname, 'PUBLIC'), a.privilege_type), ',' order by 1)
                       from aclexplode(p.proacl) a left join pg_roles r on r.oid = a.grantee
                       where a.grantee <> p.proowner), 'défaut'))
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in (select nspname from schemas) and p.prokind in ('f', 'p')
  union all
  select 'droit', 'schema ' || n.nspname,
         md5(coalesce((select string_agg(format('%s:%s', coalesce(r.rolname, 'PUBLIC'), a.privilege_type), ',' order by 1)
                       from aclexplode(n.nspacl) a left join pg_roles r on r.oid = a.grantee
                       where a.grantee <> n.nspowner), 'défaut'))
  from pg_namespace n
  where n.nspname in (select nspname from schemas)
  union all
  select 'droit_defaut', format('%s %s %s', coalesce(r.rolname, '?'), coalesce(n.nspname, '(global)'), d.defaclobjtype::text),
         md5(coalesce((select string_agg(format('%s:%s', coalesce(g.rolname, 'PUBLIC'), a.privilege_type), ',' order by 1)
                       from aclexplode(d.defaclacl) a left join pg_roles g on g.oid = a.grantee), ''))
  from pg_default_acl d left join pg_roles r on r.oid = d.defaclrole left join pg_namespace n on n.oid = d.defaclnamespace
  where n.nspname is null or n.nspname in ('public', 'private', 'extensions')
  union all
  select 'enum', format('%I.%I', n.nspname, t.typname),
         md5((select string_agg(e.enumlabel, ',' order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid))
  from pg_type t join pg_namespace n on n.oid = t.typnamespace
  where n.nspname in (select nspname from schemas) and t.typtype = 'e'
  union all
  select 'extension', x.extname, md5(x.extname)
  from pg_extension x
  where x.extname <> 'pgtap'
),
retenus as (
  select o.* from objets o
  where not exists (select 1 from exclus e where o.objet ~ e.motif)
)
select r.categorie, null::text as objet, count(*)::int as nombre,
       md5(string_agg(r.objet || '=' || r.empreinte, E'\n' order by r.objet)) as empreinte
from retenus r
where (select niveau from reglage) = 'resume'
group by r.categorie
union all
select r.categorie, r.objet, 1, r.empreinte
from retenus r
where (select niveau from reglage) = 'detail'
  and r.categorie = (select categorie from reglage)
  and r.objet like (select prefixe from reglage) || '%'
order by 1, 2;
