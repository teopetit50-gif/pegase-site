-- 09 — private.mes_clients() ne rend rien sans JWT
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_09_mes_clients_sans_jwt() returns setof text
language plpgsql as $f$
declare
  n bigint;
begin
  perform tests.redevenir_admin();
  perform set_config('role', 'authenticated', true);
  begin
    execute 'select count(*) from private.mes_clients()' into n;
    return next is(n, 0::bigint, 'Sans JWT, mes_clients() est vide');
  exception when others then
    return next pass('Sans JWT, mes_clients() refuse : ' || sqlerrm);
  end;
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_09_');
