-- TOUT_2.sql — partie 2/4 de TOUT.sql (tests 09 à 24). Lancer les quatre dans l'ordre.

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



-- 11 — un client ne lit pas le journal d'un autre
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_11_journal_isole_lecture() returns setof text
language plpgsql as $f$
declare
  jeu jsonb;
begin
  jeu := tests.jeu();
  perform tests.inserer_minimal('public', 'journal_opposable', jsonb_build_object('client_id', jeu ->> 'client_b', 'action', 'essai_a5', 'acteur_type', 'systeme', 'objet_type', 'essai'));
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L', jeu ->> 'client_b')), 0::bigint, 'A ne voit aucune ligne du journal de B');
  perform tests.redevenir_admin();
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L', jeu ->> 'client_b')), 1::bigint, 'La ligne de B existe pourtant (vue en admin)');
end $f$;



-- 12 — un client lit bien son propre journal
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_12_journal_lecture_propre() returns setof text
language plpgsql as $f$
declare
  jeu jsonb;
begin
  jeu := tests.jeu();
  perform tests.inserer_minimal('public', 'journal_opposable', jsonb_build_object('client_id', jeu ->> 'client_a', 'action', 'essai_a5', 'acteur_type', 'systeme', 'objet_type', 'essai'));
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L', jeu ->> 'client_a')), 1::bigint, 'A voit sa ligne de journal');
  perform tests.redevenir_admin();
end $f$;



-- 13 — un client ne peut pas écrire une ligne au nom d'un autre client
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_13_ecriture_chez_autrui_refusee() returns setof text
language plpgsql as $f$
declare
  jeu jsonb;
begin
  jeu := tests.jeu();
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  return next throws_ok(
    format('select tests.inserer_minimal(''public'', ''acces_objets'', %L::jsonb)', jsonb_build_object('client_id', jeu ->> 'client_b', 'objet_type', 'essai_a5', 'objet_id', gen_random_uuid(), 'user_id', jeu ->> 'user_a')::text),
    '42501', null, 'INSERT dans acces_objets avec le client_id de B, par A : refusé (42501)');
  perform tests.redevenir_admin();
end $f$;



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



-- 15 — une ligne posée pour A est vue par A et jamais par B (acces_objets)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_15_isolement_croise() returns setof text
language plpgsql as $f$
declare
  jeu jsonb;
begin
  jeu := tests.jeu();
  perform tests.inserer_minimal('public', 'acces_objets', jsonb_build_object('client_id', jeu ->> 'client_a', 'objet_type', 'essai_a5', 'objet_id', gen_random_uuid(), 'user_id', jeu ->> 'user_a'));
  perform tests.endosser((jeu ->> 'user_b')::uuid);
  return next is(tests.compter('public', 'acces_objets', format('client_id = %L', jeu ->> 'client_a')), 0::bigint, 'B ne voit pas la ligne de A');
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  return next is(tests.compter('public', 'acces_objets', format('client_id = %L', jeu ->> 'client_a')), 1::bigint, 'A voit sa ligne');
  perform tests.redevenir_admin();
end $f$;



-- 16 — UPDATE sur public.journal_opposable échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_16_update_journal_opposable() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  select count(*) into nb from tests.declencheurs_bloquants('journal_opposable') where sur_update and avant;
  return next ok(nb > 0, 'journal_opposable : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('journal_opposable');
  select attname into col from pg_attribute where attrelid = 'public.journal_opposable'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.journal_opposable set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur journal_opposable échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'journal_opposable', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;



-- 18 — UPDATE sur public.envois_evenements échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_18_update_envois_evenements() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  select count(*) into nb from tests.declencheurs_bloquants('envois_evenements') where sur_update and avant;
  return next ok(nb > 0, 'envois_evenements : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('envois_evenements');
  select attname into col from pg_attribute where attrelid = 'public.envois_evenements'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.envois_evenements set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur envois_evenements échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'envois_evenements', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;



-- 20 — UPDATE sur public.effacements échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_20_update_effacements() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  select count(*) into nb from tests.declencheurs_bloquants('effacements') where sur_update and avant;
  return next ok(nb > 0, 'effacements : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('effacements');
  select attname into col from pg_attribute where attrelid = 'public.effacements'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.effacements set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur effacements échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'effacements', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;



-- 22 — UPDATE sur public.filed_historique échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_22_update_filed_historique() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  select count(*) into nb from tests.declencheurs_bloquants('filed_historique') where sur_update and avant;
  return next ok(nb > 0, 'filed_historique : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('filed_historique');
  select attname into col from pg_attribute where attrelid = 'public.filed_historique'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.filed_historique set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur filed_historique échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'filed_historique', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;



-- 24 — UPDATE sur public.suivis_evenements échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_24_update_suivis_evenements() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  select count(*) into nb from tests.declencheurs_bloquants('suivis_evenements') where sur_update and avant;
  return next ok(nb > 0, 'suivis_evenements : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('suivis_evenements');
  select attname into col from pg_attribute where attrelid = 'public.suivis_evenements'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.suivis_evenements set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur suivis_evenements échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'suivis_evenements', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;



select * from runtests('tests'::name, '^test_(09|10|11|12|13|14|15|16|18|20|22|24)_');
