-- 51 — toute politique RLS a son GRANT, tout GRANT d'écriture a sa politique (authenticated, schéma public)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- Règle posée par le coordinateur le 5/10 (lots 19k et 19l) : une politique sans GRANT est une porte peinte sur un mur ;
-- un GRANT d'écriture sans politique, sur une table en RLS, est un refus silencieux (ou, sans RLS, une table ouverte).

create or replace function tests.test_51_politiques_et_grants() returns setof text
language plpgsql as $f$
begin
  -- 1) Politique → GRANT : pour chaque politique de public visant authenticated (ou public), la commande est accordée.
  return next is_empty($q$
    with pol as (
      select p.tablename, p.policyname, unnest(case p.cmd when 'ALL' then array['SELECT', 'INSERT', 'UPDATE', 'DELETE'] else array[p.cmd::text] end) as commande
      from pg_policies p
      where p.schemaname = 'public' and ('authenticated' = any(p.roles) or p.roles = '{public}'::name[])
    )
    select tablename, policyname, commande from pol
    -- has_any_column_privilege : vrai aussi quand le droit n'est donné que sur certaines colonnes (clés Tamila par exemple)
    -- DELETE n'existe pas au niveau colonne : has_table_privilege pour lui, has_any_column_privilege pour les trois autres
    where not case when commande = 'DELETE' then has_table_privilege('authenticated', ('public.' || quote_ident(tablename))::regclass, commande)
                   else has_any_column_privilege('authenticated', ('public.' || quote_ident(tablename))::regclass, commande) end
    order by 1, 2, 3
  $q$, 'Chaque politique visant authenticated a le GRANT de sa commande (sinon elle ne sert à rien)');

  -- 2) GRANT d'écriture → politique : sur une table en RLS, un INSERT/UPDATE/DELETE accordé à authenticated a sa politique.
  return next is_empty($q$
    with droits as (
      select c.relname as tablename, cmd
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      cross join unnest(array['INSERT', 'UPDATE', 'DELETE']) as cmd
      where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
        and has_table_privilege('authenticated', c.oid, cmd)
    )
    select d.tablename, d.cmd from droits d
    where not exists (
      select 1 from pg_policies p
      where p.schemaname = 'public' and p.tablename = d.tablename and p.cmd in (d.cmd, 'ALL')
        and ('authenticated' = any(p.roles) or p.roles = '{public}'::name[]))
    order by 1, 2
  $q$, 'Chaque GRANT d''écriture à authenticated sur une table en RLS a sa politique (sinon : refus silencieux, ou droit oublié)');

  -- 3) Et jamais d'écriture accordée à authenticated sur une table de public SANS RLS : là, le GRANT ouvre tout.
  return next is_empty($q$
    select c.relname, cmd
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    cross join unnest(array['INSERT', 'UPDATE', 'DELETE']) as cmd
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity and has_table_privilege('authenticated', c.oid, cmd)
    order by 1, 2
  $q$, 'Aucun droit d''écriture pour authenticated sur une table de public sans RLS');

  return next diag('Tables de public sans RLS (à trancher dans SECURITE.md) : ' || coalesce((
    select string_agg(c.relname, ', ' order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity), 'aucune'));
end $f$;

select * from runtests('tests'::name, '^test_51_');
