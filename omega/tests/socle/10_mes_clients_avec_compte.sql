-- 10 — private.mes_clients() rend le client du compte endossé, et lui seul
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_10_mes_clients_avec_compte() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; present boolean; present_b boolean; n bigint;
begin
  jeu := tests.jeu();
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  execute format('select %L::uuid in (select * from private.mes_clients())', jeu ->> 'client_a') into present;
  execute format('select %L::uuid in (select * from private.mes_clients())', jeu ->> 'client_b') into present_b;
  execute 'select count(*) from private.mes_clients()' into n;
  return next ok(present, 'Le client A est dans mes_clients() pour l''utilisateur A');
  return next ok(not present_b, 'Le client B n''y est pas');
  return next is(n, 1::bigint, 'Exactement un client');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_10_');
