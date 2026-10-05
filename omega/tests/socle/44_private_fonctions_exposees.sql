-- 44 — dans private, anon n'exécute rien et authenticated n'exécute que les fonctions requises
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- Requises = citées par une politique RLS (pg_depend) ou appelées par une fonction publique SECURITY INVOKER
-- exécutable par authenticated, avec fermeture transitive (tests.fonctions_private_requises()).
-- La migration omega/migrations/a5_01_private_execute.sql applique exactement cette règle.

create or replace function tests.test_44_private_fonctions_exposees() returns setof text
language plpgsql as $f$
declare
  requises text; en_trop text; manquantes text; nb_total int; nb_exec int;
begin
  select count(*), count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute')) into nb_total, nb_exec
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype;
  select string_agg(nom || ' (' || raison || ')', ', ' order by nom) into requises from tests.fonctions_private_requises();
  select string_agg(p.proname, ', ' order by p.proname) into en_trop
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype
    and has_function_privilege('authenticated', p.oid, 'execute')
    and p.oid not in (select oid from tests.fonctions_private_requises());
  select string_agg(nom, ', ' order by nom) into manquantes
  from tests.fonctions_private_requises() r where not has_function_privilege('authenticated', r.oid, 'execute');
  return next is(en_trop, null, format('authenticated n''exécute aucune fonction de private hors des requises (%s exécutables sur %s)', nb_exec, nb_total));
  if en_trop is not null then return next diag('En trop (à révoquer) : ' || en_trop); end if;
  return next is(manquantes, null, 'Toutes les fonctions requises sont exécutables par authenticated (sinon les politiques cassent)');
  if manquantes is not null then return next diag('Manquantes (à accorder) : ' || manquantes); end if;
  return next is_empty($q$
    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private' and p.prokind = 'f' and p.prorettype <> 'trigger'::regtype and has_function_privilege('anon', p.oid, 'execute') order by 1
  $q$, 'anon n''exécute aucune fonction de private');
  return next diag('Requises : ' || coalesce(requises, 'aucune'));
end $f$;

select * from runtests('tests'::name, '^test_44_');
