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
-- déclencheur elles-mêmes n'ont jamais besoin d'EXECUTE. anon ne garde rien. service_role garde tout.
-- Posée sur la recette le 5/10/2026 (version 20261005185500, compléments 19j, 19u, 19z). Après 19z : anon 0/881,
-- authenticated 330/881, service_role 881/881. Les appels non qualifiés (via search_path), les contraintes de domaine
-- et les vues servies par des fonctions publiques SECURITY INVOKER sont pris en compte depuis le 6/10.
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
  with recursive
  -- Qui appelle quelle fonction de private, d'après le corps : nom qualifié (private.f) ou non (f, via search_path).
  -- Inclusif à dessein : accorder une fonction de trop est bénin, en oublier une casse une écriture client.
  appels as (
    select q.oid as appelant, p.oid as appelee
    from pg_proc q join pg_namespace m on m.oid = q.pronamespace
    join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
    where m.nspname in ('public', 'private') and q.prokind = 'f'
      and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype and p.oid <> q.oid
      and position(p.proname in q.prosrc) > 0
      and q.prosrc ~ ('(^|[^A-Za-z0-9_])(private\.)?' || p.proname || '\s*\(')
  ),
  -- Fonctions publiques SECURITY INVOKER qui s'exécutent avec les droits du client : exécutables par authenticated,
  -- ou utilisées par une vue de public lisible par authenticated (la vue les appelle pour lui).
  publiques_invoker as (
    select q.oid, 'public.' || q.proname as nom
    from pg_proc q join pg_namespace m on m.oid = q.pronamespace
    where m.nspname = 'public' and q.prokind = 'f' and not q.prosecdef
      and (has_function_privilege('authenticated', q.oid, 'execute')
           or exists (select 1 from pg_depend d join pg_rewrite rw on rw.oid = d.objid and d.classid = 'pg_rewrite'::regclass
                      join pg_class v on v.oid = rw.ev_class join pg_namespace nv on nv.oid = v.relnamespace
                      where d.refclassid = 'pg_proc'::regclass and d.refobjid = q.oid
                        and nv.nspname = 'public' and v.relkind in ('v', 'm') and has_table_privilege('authenticated', v.oid, 'select')))
  ),
  requises as (
    -- (a) citées par une politique RLS (pg_depend : exact)
    select distinct p.oid, p.proname, 'politique RLS'::text as raison
    from pg_depend d join pg_proc p on p.oid = d.refobjid and d.refclassid = 'pg_proc'::regclass
    join pg_namespace n on n.oid = p.pronamespace
    where d.classid = 'pg_policy'::regclass and n.nspname = 'private' and p.prorettype <> 'trigger'::regtype
    union
    -- (b) appelées par une fonction publique SECURITY INVOKER exécutable par authenticated ou servie par une vue lisible
    select distinct p.oid, p.proname, 'appelée par ' || pi.nom
    from publiques_invoker pi join appels a on a.appelant = pi.oid join pg_proc p on p.oid = a.appelee
    union
    -- (c) appelées par un déclencheur SECURITY INVOKER de private attaché à une table (il s'exécute avec les droits de celui qui écrit)
    select distinct p.oid, p.proname, 'appelée par le déclencheur private.' || t.proname
    from pg_proc t join pg_namespace nt on nt.oid = t.pronamespace
    join appels a on a.appelant = t.oid join pg_proc p on p.oid = a.appelee
    where nt.nspname = 'private' and t.prorettype = 'trigger'::regtype and not t.prosecdef
      and exists (select 1 from pg_trigger tg where tg.tgfoid = t.oid and not tg.tgisinternal)
    union
    -- (d) utilisées directement par une vue de public lisible par authenticated (pg_depend via la règle de réécriture : exact)
    select distinct p.oid, p.proname, 'vue public.' || v.relname
    from pg_depend d join pg_rewrite rw on rw.oid = d.objid and d.classid = 'pg_rewrite'::regclass
    join pg_class v on v.oid = rw.ev_class join pg_namespace nv on nv.oid = v.relnamespace
    join pg_proc p on p.oid = d.refobjid and d.refclassid = 'pg_proc'::regclass
    join pg_namespace n on n.oid = p.pronamespace
    where nv.nspname = 'public' and v.relkind in ('v', 'm') and has_table_privilege('authenticated', v.oid, 'select')
      and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
    union
    -- (e1) utilisées par un CHECK d'une table de public ou d'un domaine (pg_depend, et la définition textuelle en ceinture)
    select distinct p.oid, p.proname, 'contrainte ' || con.conname
    from pg_constraint con
    left join pg_class c on c.oid = con.conrelid left join pg_namespace nc on nc.oid = c.relnamespace
    join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
    where con.contype = 'c' and (con.contypid <> 0 or nc.nspname = 'public')
      and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
      and (exists (select 1 from pg_depend d where d.classid = 'pg_constraint'::regclass and d.objid = con.oid and d.refclassid = 'pg_proc'::regclass and d.refobjid = p.oid)
           or pg_get_constraintdef(con.oid) ~ ('(^|[^A-Za-z0-9_])(private\.)?' || p.proname || '\s*\('))
    union
    -- (e2) utilisées par un DEFAULT ou une colonne générée d'une table de public
    select distinct p.oid, p.proname, 'défaut de public.' || c.relname
    from pg_attrdef ad join pg_class c on c.oid = ad.adrelid join pg_namespace nc on nc.oid = c.relnamespace
    join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
    where nc.nspname = 'public' and n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
      and (exists (select 1 from pg_depend d where d.classid = 'pg_attrdef'::regclass and d.objid = ad.oid and d.refclassid = 'pg_proc'::regclass and d.refobjid = p.oid)
           or pg_get_expr(ad.adbin, ad.adrelid) ~ ('(^|[^A-Za-z0-9_])(private\.)?' || p.proname || '\s*\('))
    union
    -- (f) utilisées dans la clause WHEN d'un déclencheur d'une table de public (évaluée avec les droits de celui qui écrit)
    select distinct p.oid, p.proname, 'clause WHEN du déclencheur ' || t.tgname || ' sur public.' || c.relname
    from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace nc on nc.oid = c.relnamespace
    join pg_proc p on true join pg_namespace n on n.oid = p.pronamespace
    where not t.tgisinternal and nc.nspname = 'public' and n.nspname = 'private' and p.prokind = 'f' and p.oid <> t.tgfoid
      and p.prorettype <> 'trigger'::regtype
      and (exists (select 1 from pg_depend d where d.classid = 'pg_trigger'::regclass and d.objid = t.oid and d.refclassid = 'pg_proc'::regclass and d.refobjid = p.oid)
           or pg_get_triggerdef(t.oid) ~ ('WHEN .*(^|[^A-Za-z0-9_])(private\.)?' || p.proname || '\s*\('))
    union
    -- fermeture transitive : ce qu'appelle une fonction retenue qui s'exécute encore avec les droits du client (SECURITY INVOKER)
    select distinct p.oid, p.proname, 'appelée par private.' || q.proname
    from requises x join pg_proc q on q.oid = x.oid join appels a on a.appelant = q.oid join pg_proc p on p.oid = a.appelee
    where not q.prosecdef
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
  --    Deux pièges, vérifiés sur la maquette :
  --    - un REVOKE de défaut « IN SCHEMA » ne retire PAS le défaut intégré de Postgres (EXECUTE à PUBLIC) : les défauts
  --      par schéma s'AJOUTENT aux défauts globaux ; seul un REVOKE global (sans IN SCHEMA) l'enlève. C'est pour cela que
  --      les fonctions de la vague 2 naissaient encore exécutables par anon après la première pose d'a5_01 ;
  --    - ALTER DEFAULT PRIVILEGES ne vaut que pour le rôle visé : on le pose pour postgres, pour le rôle courant et pour
  --      chaque rôle qui possède déjà une fonction dans private ; un rôle dont on n'est pas membre est signalé.
  --    Le REVOKE global touche tous les schémas : pour garder le comportement Supabase des portes publiques (anon,
  --    authenticated et service_role exécutent les nouvelles fonctions de public et d'extensions), on le redonne par schéma.
  for r in select 'postgres'::text as rolname where exists (select 1 from pg_roles where rolname = 'postgres')
           union select distinct pg_get_userbyid(p.proowner) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private'
           union select current_user::text loop
    begin
      execute format('alter default privileges for role %I revoke execute on functions from public', r.rolname);
      execute format('alter default privileges for role %I in schema public grant execute on functions to anon, authenticated, service_role', r.rolname);
      if exists (select 1 from pg_namespace where nspname = 'extensions') then
        execute format('alter default privileges for role %I in schema extensions grant execute on functions to anon, authenticated, service_role', r.rolname);
      end if;
      if exists (select 1 from pg_roles where rolname = 'service_role') then
        execute format('alter default privileges for role %I in schema private grant execute on functions to service_role', r.rolname);
      end if;
    exception when insufficient_privilege or undefined_object then
      raise notice 'a5_01_private_execute : défauts non posés pour le rôle % (%) — à poser par ce rôle', r.rolname, sqlerrm;
    end;
  end loop;
  -- Rejouer cette migration après chaque lot qui ajoute des fonctions à private : elle est sans effet si tout est en ordre.

  -- 4 bis) service_role est la clé d'Omega (lecteur, tâches) : il garde tout, explicitement et pour l'avenir.
  --        Avant a5_01 il n'avait EXECUTE que par PUBLIC ; sans ce bloc, « permission denied for function piece_a_lire ».
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema private to service_role;
    grant execute on all functions in schema private to service_role;
    grant execute on all procedures in schema private to service_role;
    alter default privileges in schema private grant execute on functions to service_role;
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
