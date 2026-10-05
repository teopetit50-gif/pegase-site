-- a5_01_private_execute — reprendre l'EXECUTE accordé par défaut à PUBLIC sur les fonctions du schéma private.
--
-- Constat (recette, 5/10/2026, test 44) : Postgres accorde EXECUTE à PUBLIC à la création d'une fonction ;
-- anon et authenticated pouvaient donc exécuter ~110 fonctions de private (filed_decider_facture,
-- deposer_reception, noter_remise…). Le schéma n'étant pas exposé par PostgREST, l'appel direct est
-- improbable, mais rien ne doit tenir à ça.
--
-- Règle appliquée : authenticated garde EXECUTE sur les seules fonctions (a) dont une politique RLS dépend
-- (pg_depend : exact), (b) qu'une fonction publique SECURITY INVOKER exécutable par authenticated appelle
-- (texte du corps), (c) qu'un déclencheur SECURITY INVOKER de private appelle, (d) qu'une vue de public
-- lisible par authenticated utilise (pg_depend), (e) qu'un CHECK ou un DEFAULT d'une table de public utilise
-- (pg_depend) ; avec fermeture transitive sur les fonctions SECURITY INVOKER ainsi retenues. Les fonctions
-- déclencheur elles-mêmes n'ont jamais besoin d'EXECUTE. anon ne garde rien. (f) service_role garde tout.
-- Posée sur la recette le 5/10/2026 (version 20261005185500, complément service_role en 20261005190500 « lot 19j ») :
-- 187 fonctions sur 741 restent à authenticated.
-- La liste retenue est écrite en NOTICE et dans le journal de la migration ; la figer en clair est le
-- travail du coordinateur après lecture (voir omega/migrations/a5_01_liste_requises.sql).
--
-- Sans DROP ni DELETE. Rejouable. Vérifiée par omega/tests/socle/44_private_fonctions_exposees.sql.

do $$
declare
  r record; liste text;
begin
  -- 1) Calculer l'ensemble requis AVANT de révoquer quoi que ce soit (mêmes sources que tests.fonctions_private_requises()).
  create temp table _a5_requises (oid oid primary key, nom text, signature text, raison text) on commit drop;
  insert into _a5_requises
  with recursive requises as (
    -- (a) citées par une politique RLS (pg_depend : exact)
    select distinct p.oid, p.proname, 'politique RLS'::text as raison
    from pg_depend d join pg_proc p on p.oid = d.refobjid and d.refclassid = 'pg_proc'::regclass
    join pg_namespace n on n.oid = p.pronamespace
    where d.classid = 'pg_policy'::regclass and n.nspname = 'private'
    union
    -- (b) appelées par une fonction publique SECURITY INVOKER exécutable par authenticated
    select distinct p.oid, p.proname, 'appelée par public.' || q.proname
    from pg_proc q join pg_namespace m on m.oid = q.pronamespace
    join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
    where m.nspname = 'public' and q.prokind = 'f' and not q.prosecdef and has_function_privilege('authenticated', q.oid, 'execute')
      and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
      and q.prosrc ~ ('private\.' || p.proname || '\s*\(')
    union
    -- (c) appelées par un déclencheur SECURITY INVOKER de private (il s'exécute avec les droits de l'utilisateur qui écrit)
    select distinct p.oid, p.proname, 'appelée par le déclencheur private.' || t.proname
    from pg_proc t join pg_namespace nt on nt.oid = t.pronamespace
    join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
    where nt.nspname = 'private' and t.prorettype = 'trigger'::regtype and not t.prosecdef
      and exists (select 1 from pg_trigger tg where tg.tgfoid = t.oid and not tg.tgisinternal)
      and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
      and t.prosrc ~ ('private\.' || p.proname || '\s*\(')
    union
    -- (d) utilisées par une vue de public lisible par authenticated (pg_depend via la règle de réécriture : exact)
    select distinct p.oid, p.proname, 'vue public.' || v.relname
    from pg_depend d join pg_rewrite rw on rw.oid = d.objid and d.classid = 'pg_rewrite'::regclass
    join pg_class v on v.oid = rw.ev_class join pg_namespace nv on nv.oid = v.relnamespace
    join pg_proc p on p.oid = d.refobjid and d.refclassid = 'pg_proc'::regclass
    join pg_namespace n on n.oid = p.pronamespace
    where nv.nspname = 'public' and v.relkind in ('v', 'm') and has_table_privilege('authenticated', v.oid, 'select')
      and n.nspname = 'private' and p.prokind = 'f'
    union
    -- (e) utilisées par un CHECK ou un DEFAULT d'une table de public (pg_depend : exact)
    select distinct p.oid, p.proname, 'contrainte/défaut de public.' || c.relname
    from pg_depend d
    join pg_proc p on p.oid = d.refobjid and d.refclassid = 'pg_proc'::regclass
    join pg_namespace n on n.oid = p.pronamespace
    join lateral (
      select con.conrelid as relid from pg_constraint con where d.classid = 'pg_constraint'::regclass and con.oid = d.objid
      union all
      select ad.adrelid from pg_attrdef ad where d.classid = 'pg_attrdef'::regclass and ad.oid = d.objid
    ) src on true
    join pg_class c on c.oid = src.relid join pg_namespace nc on nc.oid = c.relnamespace
    where nc.nspname = 'public' and n.nspname = 'private' and p.prokind = 'f'
    union
    -- fermeture transitive à travers les SECURITY INVOKER retenues
    select distinct p.oid, p.proname, 'appelée par private.' || q.proname
    from requises x join pg_proc q on q.oid = x.oid
    join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
    where not q.prosecdef and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype and p.oid <> q.oid
      and q.prosrc ~ ('private\.' || p.proname || '\s*\(')
  )
  select oid, proname, oid::regprocedure::text, string_agg(distinct raison, ' ; ') from requises group by oid, proname;

  -- 2) Reprendre tout, pour tout le monde sauf le propriétaire.
  revoke execute on all functions in schema private from public, anon, authenticated;
  revoke execute on all procedures in schema private from public, anon, authenticated;

  -- 3) Rendre à authenticated exactement ce qui est requis.
  for r in select * from _a5_requises order by nom loop
    execute format('grant execute on function %s to authenticated', r.signature);
  end loop;

  -- 4) Et pour les fonctions à venir : plus d'EXECUTE par défaut à PUBLIC dans private.
  alter default privileges in schema private revoke execute on functions from public;
  alter default privileges for role postgres in schema private revoke execute on functions from public;

  -- 4 bis) (f) service_role est la clé d'Omega (lecteur, tâches) : il garde tout, explicitement et pour l'avenir.
  --        Avant a5_01 il n'avait EXECUTE que par PUBLIC ; sans ce bloc, « permission denied for function piece_a_lire ».
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema private to service_role;
    grant execute on all functions in schema private to service_role;
    grant execute on all procedures in schema private to service_role;
    alter default privileges in schema private grant execute on functions to service_role;
    alter default privileges for role postgres in schema private grant execute on functions to service_role;
  end if;

  -- 5) Dire ce qui a été fait.
  select string_agg(signature || ' — ' || raison, E'\n  ' order by nom) into liste from _a5_requises;
  raise notice E'a5_01_private_execute : % fonction(s) de private restent exécutables par authenticated :\n  %',
    (select count(*) from _a5_requises), coalesce(liste, '(aucune)');

  -- 6) Contrôle immédiat : anon n'exécute plus rien, authenticated rien hors liste.
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
               and has_function_privilege('anon', p.oid, 'execute')) then
    raise exception 'a5_01_private_execute : anon exécute encore une fonction de private';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
               and has_function_privilege('authenticated', p.oid, 'execute') and p.oid not in (select oid from _a5_requises)) then
    raise exception 'a5_01_private_execute : authenticated exécute encore une fonction de private hors liste';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role')
     and exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'private' and p.prokind = 'f' and not has_function_privilege('service_role', p.oid, 'execute')) then
    raise exception 'a5_01_private_execute : service_role n''exécute pas toutes les fonctions de private';
  end if;
end $$;
