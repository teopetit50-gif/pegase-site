-- 14 — sous le rôle authenticated d'un client, aucune ligne d'un autre client n'est lisible, sur toutes les tables locataires
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_14_isolement_toutes_tables() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; tables text[]; nom_table text; n bigint; fuites text[] := '{}'; illisibles text[] := '{}'; sans_client text[] := '{}'; testees int := 0;
begin
  jeu := tests.jeu();
  -- la liste se lit en admin (private n'est pas lisible par authenticated), la lecture se fait en authenticated
  select array_agg(regexp_replace(nom, '^public\.', '') order by nom) into tables from private.tables_locataires;
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  foreach nom_table in array tables loop
    begin
      n := tests.compter('public', nom_table, format('client_id <> %L', jeu ->> 'client_a'));
      if n > 0 then fuites := fuites || format('%s (%s lignes)', nom_table, n); end if;
      testees := testees + 1;
    exception when insufficient_privilege then
      illisibles := illisibles || nom_table; -- pas de SELECT pour authenticated : pas de fuite possible
    when undefined_column then
      sans_client := sans_client || nom_table;
    end;
  end loop;
  perform tests.redevenir_admin();
  return next is(array_length(fuites, 1), null, 'Aucune ligne d''un autre client n''est lisible par A (' || testees || ' tables lues, ' || coalesce(array_length(illisibles, 1), 0) || ' non lisibles par authenticated)');
  if array_length(fuites, 1) > 0 then return next diag('Fuites : ' || array_to_string(fuites, ', ')); end if;
  if array_length(sans_client, 1) > 0 then return next diag('Tables locataires sans colonne client_id (vérifier private.tables_objets) : ' || array_to_string(sans_client, ', ')); end if;
end $f$;

select * from runtests('tests'::name, '^test_14_');
