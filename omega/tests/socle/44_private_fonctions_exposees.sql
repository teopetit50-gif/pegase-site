-- 44 — dans private, anon n'exécute rien, authenticated n'exécute que les fonctions requises, service_role exécute tout
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- Requises = citées par une politique RLS, appelées par une fonction publique SECURITY INVOKER exécutable par authenticated,
-- par un déclencheur SECURITY INVOKER de private, utilisées par une vue lisible, un CHECK/DEFAULT ou la clause WHEN d'un
-- déclencheur de public, avec fermeture transitive (tests.fonctions_private_requises()). Les fonctions de déclencheur
-- elles-mêmes sont hors sujet : Postgres ne vérifie EXECUTE dessus qu'à la création du déclencheur, jamais au déclenchement.
-- La migration omega/migrations/a5_01_private_execute.sql applique exactement cette règle.

create or replace function tests.test_44_private_fonctions_exposees() returns setof text
language plpgsql as $f$
declare
  requises text; en_trop text; manquantes text; nb_total int; nb_exec int; oids_requises oid[];
begin
  select count(*), count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute')) into nb_total, nb_exec
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype;
  -- Un seul calcul des requises (il parcourt tout le catalogue) : la liste, les oids et les manquantes en un passage.
  select string_agg(r.nom || ' (' || r.raison || ')', ', ' order by r.nom), coalesce(array_agg(r.oid), '{}'),
         string_agg(r.nom, ', ' order by r.nom) filter (where not has_function_privilege('authenticated', r.oid, 'execute'))
    into requises, oids_requises, manquantes
  from tests.fonctions_private_requises() r;
  select string_agg(p.proname, ', ' order by p.proname) into en_trop
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
    and has_function_privilege('authenticated', p.oid, 'execute')
    and p.oid <> all (oids_requises);
  return next is(en_trop, null, format('authenticated n''exécute aucune fonction de private hors des requises (%s exécutables sur %s)', nb_exec, nb_total));
  if en_trop is not null then return next diag('En trop (à révoquer) : ' || en_trop); end if;
  return next is(manquantes, null, 'Toutes les fonctions requises sont exécutables par authenticated (sinon les politiques cassent)');
  if manquantes is not null then return next diag('Manquantes (à accorder) : ' || manquantes); end if;
  return next is_empty($q$
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype and has_function_privilege('anon', p.oid, 'execute') order by 1
  $q$, 'anon n''exécute aucune fonction de private');
  -- (f) service_role, la clé d'Omega, garde tout : il n'est jamais compté parmi les « en trop »
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    return next is_empty($q$
      select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'private' and p.prokind = 'f' and not has_function_privilege('service_role', p.oid, 'execute') order by 1
    $q$, 'service_role exécute toutes les fonctions de private (lecteur, tâches)');
    return next ok(has_schema_privilege('service_role', 'private', 'USAGE'), 'service_role a USAGE sur private');
  end if;
  return next diag('Requises : ' || coalesce(requises, 'aucune'));
end $f$;

select * from runtests('tests'::name, '^test_44_');
