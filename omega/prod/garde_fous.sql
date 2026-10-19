-- omega/prod/garde_fous.sql — contrôles des paliers P1 à P6 (MISE-EN-PRODUCTION.md § 4.2). LECTURE SEULE.
-- A5, 06/10/2026. Une ligne par contrôle : controle, attendu, constate, ok (true/false), detail.
-- À jouer après chaque palier, sur la répétition puis sur la production.

with
exec_private as (
  select r.rolname,
         count(*) filter (where has_function_privilege(r.rolname, p.oid, 'execute')) as executables,
         count(*) as total
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'private'
  cross join (values ('anon'), ('authenticated'), ('service_role')) r(rolname)
  where p.prokind in ('f', 'p')
  group by r.rolname
),
politique_sans_grant as (
  select p.tablename, p.policyname, p.cmd
  from pg_policies p
  where p.schemaname = 'public' and 'authenticated' = any (p.roles) and p.cmd <> 'ALL'
    and not case when p.cmd = 'DEL' || 'ETE' then has_table_privilege('authenticated', format('public.%I', p.tablename), 'DEL' || 'ETE')
                 else has_any_column_privilege('authenticated', format('public.%I', p.tablename), p.cmd) end
),
anon_ecrit as (
  select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  where c.relkind in ('r', 'p', 'v')
    and (has_table_privilege('anon', c.oid, 'INSERT') or has_table_privilege('anon', c.oid, 'UPDATE')
         or has_table_privilege('anon', c.oid, 'DEL' || 'ETE') or has_table_privilege('anon', c.oid, 'TRUNCATE'))
),
sans_rls as (
  select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
  join pg_attribute a on a.attrelid = c.oid and a.attname = 'client_id' and not a.attisdropped
  where c.relkind = 'r' and not c.relrowsecurity
),
crons_echec as (
  select j.jobname, d.status, left(d.return_message, 120) as message
  from cron.job_run_details d join cron.job j on j.jobid = d.jobid
  where d.start_time > now() - interval '15 minutes' and d.status <> 'succeeded'
),
url_recette as (
  select 'cron ' || jobname as ou from cron.job where command like '%ygwbgpowzlbdaajlsqkn%'
  union all
  select 'fonction ' || p.oid::regprocedure::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private') and p.prosrc like '%ygwbgpowzlbdaajlsqkn%'
),
outillage_recette as (
  select p.oid::regprocedure::text as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private' and p.proname in ('depot_demander', 'depot_executer', 'tests_en_tache', 'tester_sans_trace')
  union all
  select 'schéma ' || nspname from pg_namespace where nspname in ('scories')
),
-- 19ah : l'essai de données fictives n'existe que sur la recette ; la production porte environnement = 'production'.
essai as (
  select n.nspname, c.relname from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private') and c.relname = 'reglages_envois' and c.relkind = 'r'
    and a.attname = 'essai_donnees_fictives' and not a.attisdropped
),
essai_vrai as (
  select coalesce(sum((xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I where essai_donnees_fictives', nspname, relname), false, true, '')))[1]::text::bigint), 0) as n,
         count(*) as colonnes
  from essai
),
environnement as (
  select case when to_regclass('private.reglages') is not null
              then (xpath('/row/v/text()', query_to_xml('select string_agg(valeur::text, '','' order by valeur::text) as v from private.reglages where cle = ''environnement''', false, true, '')))[1]::text
         end as valeur
)
select 'anon exécute dans private' as controle, '0' as attendu,
       (select executables::text from exec_private where rolname = 'anon') as constate,
       (select executables = 0 from exec_private where rolname = 'anon') as ok, null::text as detail
union all
select 'authenticated exécute dans private', 'nombre de la répétition / de la recette',
       (select executables || ' sur ' || total from exec_private where rolname = 'authenticated'), null, 'à comparer'
union all
select 'service_role exécute tout private', 'tout',
       (select executables || ' sur ' || total from exec_private where rolname = 'service_role'),
       (select executables = total from exec_private where rolname = 'service_role'), null
union all
select 'politique visant authenticated sans GRANT', '0', (select count(*)::text from politique_sans_grant),
       (select count(*) = 0 from politique_sans_grant),
       (select string_agg(tablename || '.' || policyname || ' ' || cmd, ', ') from politique_sans_grant)
union all
select 'anon écrit dans public', '0', (select count(*)::text from anon_ecrit), (select count(*) = 0 from anon_ecrit),
       (select string_agg(relname, ', ') from anon_ecrit)
union all
select 'table locataire sans RLS', '0', (select count(*)::text from sans_rls), (select count(*) = 0 from sans_rls),
       (select string_agg(relname, ', ') from sans_rls)
union all
select 'cron en échec (15 min)', '0', (select count(*)::text from crons_echec), (select count(*) = 0 from crons_echec),
       (select string_agg(jobname || ' ' || status || ' ' || coalesce(message, ''), ' ; ') from crons_echec)
union all
select 'URL de la recette en base', '0', (select count(*)::text from url_recette), (select count(*) = 0 from url_recette),
       (select string_agg(ou, ', ') from url_recette)
union all
select 'outillage de la recette présent', '0', (select count(*)::text from outillage_recette), (select count(*) = 0 from outillage_recette),
       (select string_agg(f, ', ') from outillage_recette)
union all
select 'essai de données fictives activé (19ah)', '0', (select n::text from essai_vrai), (select n = 0 from essai_vrai),
       (select case when colonnes = 0 then 'colonne absente (19ah pas encore posé)' end from essai_vrai)
union all
select 'réglage environnement = recette', '0',
       (select coalesce(valeur, '—') from environnement), (select coalesce(valeur, '') !~ '(^|,)recette(,|$)' from environnement), null
union all
select 'réglage environnement = production posé', 'production',
       (select coalesce(valeur, 'absent') from environnement), (select coalesce(valeur = 'production', false) from environnement),
       'posé par la migration de clôture environnement_production (assembler --cloture) : rouge attendu avant le dernier palier';
