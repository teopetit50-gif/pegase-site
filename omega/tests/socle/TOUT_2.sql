-- TOUT_2.sql — partie 2/4 de TOUT.sql (tests 14 à 26). Lancer les quatre dans l'ordre.

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
  if not tests.table_existe('journal_opposable') then
    return next pass('public.journal_opposable n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('journal_opposable') where sur_update and avant;
  return next ok(nb > 0, 'journal_opposable : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('journal_opposable');
  select attname into col from pg_attribute where attrelid = 'public.journal_opposable'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.journal_opposable set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur journal_opposable échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'journal_opposable', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;



-- 17 — DELETE sur public.journal_opposable échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_17_delete_journal_opposable() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('journal_opposable') then
    return next pass('public.journal_opposable n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('journal_opposable') where sur_delete and avant;
  return next ok(nb > 0, 'journal_opposable : un déclencheur BEFORE DELETE existe');
  v_ctid := tests.ligne_pour_essai('journal_opposable');
  return next throws_ok(format('delete from public.journal_opposable where ctid = %L', v_ctid), null, null, 'DELETE sur journal_opposable échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'journal_opposable', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est toujours là');
end $f$;



-- 18 — UPDATE sur public.envois_evenements échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_18_update_envois_evenements() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('envois_evenements') then
    return next pass('public.envois_evenements n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('envois_evenements') where sur_update and avant;
  return next ok(nb > 0, 'envois_evenements : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('envois_evenements');
  select attname into col from pg_attribute where attrelid = 'public.envois_evenements'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.envois_evenements set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur envois_evenements échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'envois_evenements', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;



-- 19 — DELETE sur public.envois_evenements échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_19_delete_envois_evenements() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('envois_evenements') then
    return next pass('public.envois_evenements n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('envois_evenements') where sur_delete and avant;
  return next ok(nb > 0, 'envois_evenements : un déclencheur BEFORE DELETE existe');
  v_ctid := tests.ligne_pour_essai('envois_evenements');
  return next throws_ok(format('delete from public.envois_evenements where ctid = %L', v_ctid), null, null, 'DELETE sur envois_evenements échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'envois_evenements', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est toujours là');
end $f$;



-- 20 — UPDATE sur public.effacements échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_20_update_effacements() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('effacements') then
    return next pass('public.effacements n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('effacements') where sur_update and avant;
  return next ok(nb > 0, 'effacements : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('effacements');
  select attname into col from pg_attribute where attrelid = 'public.effacements'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.effacements set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur effacements échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'effacements', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;



-- 21 — DELETE sur public.effacements échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_21_delete_effacements() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('effacements') then
    return next pass('public.effacements n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('effacements') where sur_delete and avant;
  return next ok(nb > 0, 'effacements : un déclencheur BEFORE DELETE existe');
  v_ctid := tests.ligne_pour_essai('effacements');
  return next throws_ok(format('delete from public.effacements where ctid = %L', v_ctid), null, null, 'DELETE sur effacements échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'effacements', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est toujours là');
end $f$;



-- 22 — UPDATE sur public.filed_historique échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_22_update_filed_historique() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('filed_historique') then
    return next pass('public.filed_historique n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('filed_historique') where sur_update and avant;
  return next ok(nb > 0, 'filed_historique : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('filed_historique');
  select attname into col from pg_attribute where attrelid = 'public.filed_historique'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.filed_historique set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur filed_historique échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'filed_historique', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;



-- 23 — DELETE sur public.filed_historique échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_23_delete_filed_historique() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('filed_historique') then
    return next pass('public.filed_historique n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('filed_historique') where sur_delete and avant;
  return next ok(nb > 0, 'filed_historique : un déclencheur BEFORE DELETE existe');
  v_ctid := tests.ligne_pour_essai('filed_historique');
  return next throws_ok(format('delete from public.filed_historique where ctid = %L', v_ctid), null, null, 'DELETE sur filed_historique échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'filed_historique', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est toujours là');
end $f$;



-- 24 — UPDATE sur public.suivis_evenements échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_24_update_suivis_evenements() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('suivis_evenements') then
    return next pass('public.suivis_evenements n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('suivis_evenements') where sur_update and avant;
  return next ok(nb > 0, 'suivis_evenements : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('suivis_evenements');
  select attname into col from pg_attribute where attrelid = 'public.suivis_evenements'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.suivis_evenements set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur suivis_evenements échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'suivis_evenements', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;



-- 25 — DELETE sur public.suivis_evenements échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_25_delete_suivis_evenements() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('suivis_evenements') then
    return next pass('public.suivis_evenements n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('suivis_evenements') where sur_delete and avant;
  return next ok(nb > 0, 'suivis_evenements : un déclencheur BEFORE DELETE existe');
  v_ctid := tests.ligne_pour_essai('suivis_evenements');
  return next throws_ok(format('delete from public.suivis_evenements where ctid = %L', v_ctid), null, null, 'DELETE sur suivis_evenements échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'suivis_evenements', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est toujours là');
end $f$;



-- 26 — UPDATE sur public.echeances_pro_journal échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_26_update_echeances_pro_journal() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('echeances_pro_journal') then
    return next pass('public.echeances_pro_journal n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
  select count(*) into nb from tests.declencheurs_bloquants('echeances_pro_journal') where sur_update and avant;
  return next ok(nb > 0, 'echeances_pro_journal : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('echeances_pro_journal');
  select attname into col from pg_attribute where attrelid = 'public.echeances_pro_journal'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.echeances_pro_journal set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur echeances_pro_journal échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'echeances_pro_journal', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;



select * from runtests('tests'::name, '^test_(14|15|16|17|18|19|20|21|22|23|24|25|26)_');
