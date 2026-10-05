-- a5_01_private_execute — reprendre l'EXECUTE accordé par défaut à PUBLIC sur les fonctions du schéma private.
--
-- Constat (recette, 5/10/2026, test 44) : Postgres accorde EXECUTE à PUBLIC à la création d'une fonction ;
-- anon et authenticated pouvaient donc exécuter ~110 fonctions de private (filed_decider_facture,
-- deposer_reception, noter_remise…). Le schéma n'étant pas exposé par PostgREST, l'appel direct est
-- improbable, mais rien ne doit tenir à ça.
--
-- Règle appliquée : authenticated garde EXECUTE sur les seules fonctions dont une politique RLS dépend
-- (pg_depend : exact, pas une regex) ou qu'une fonction publique SECURITY INVOKER exécutable par
-- authenticated appelle (texte du corps), avec fermeture transitive sur les fonctions SECURITY INVOKER
-- ainsi retenues. Les fonctions déclencheur n'ont jamais besoin d'EXECUTE. anon ne garde rien.
-- La liste retenue est écrite en NOTICE et dans le journal de la migration ; la figer en clair est le
-- travail du coordinateur après lecture (voir omega/migrations/a5_01_liste_requises.sql).
--
-- Sans DROP ni DELETE. Rejouable. Vérifiée par omega/tests/socle/44_private_fonctions_exposees.sql.

do $$
declare
  r record; ajout int; liste text;
begin
  -- 1) Calculer l'ensemble requis AVANT de révoquer quoi que ce soit.
  create temp table _a5_requises (oid oid primary key, nom text, signature text, raison text) on commit drop;

  insert into _a5_requises
  select distinct p.oid, p.proname, p.oid::regprocedure::text, 'politique RLS'
  from pg_depend d join pg_proc p on p.oid = d.refobjid and d.refclassid = 'pg_proc'::regclass
  join pg_namespace n on n.oid = p.pronamespace
  where d.classid = 'pg_policy'::regclass and n.nspname = 'private'
  on conflict do nothing;

  insert into _a5_requises
  select distinct p.oid, p.proname, p.oid::regprocedure::text, 'appelée par public.' || q.proname
  from pg_proc q join pg_namespace m on m.oid = q.pronamespace
  join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
  where m.nspname = 'public' and q.prokind = 'f' and not q.prosecdef and has_function_privilege('authenticated', q.oid, 'execute')
    and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
    and q.prosrc ~ ('private\.' || p.proname || '\s*\(')
  on conflict do nothing;

  loop
    insert into _a5_requises
    select distinct p.oid, p.proname, p.oid::regprocedure::text, 'appelée par private.' || q.proname
    from _a5_requises x join pg_proc q on q.oid = x.oid
    join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
    where not q.prosecdef and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype and p.oid <> q.oid
      and q.prosrc ~ ('private\.' || p.proname || '\s*\(')
    on conflict do nothing;
    get diagnostics ajout = row_count;
    exit when ajout = 0;
  end loop;

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
end $$;
