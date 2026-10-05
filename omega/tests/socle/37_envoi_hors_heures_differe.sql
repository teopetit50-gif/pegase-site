-- 37 — un envoi non transactionnel hors heures légales est différé par les verrous, pas parti
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_37_envoi_hors_heures_differe() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; col_dest text; col_canal text; col_trans text; valeurs jsonb; ligne jsonb; verrous_nuit jsonb; verrous_jour jsonb;
  dimanche_soir timestamptz := '2026-10-11T23:00:00+02:00'; mardi_matin timestamptz := '2026-10-13T10:30:00+02:00';
begin
  jeu := tests.jeu();
  if not tests.table_existe('envois') then return next fail('Table envois introuvable'); return; end if;
  col_dest := tests.colonne_parmi('public.envois'::regclass, array['destinataire_adresse', 'adresse', 'destinataire', 'contact', 'valeur', 'identifiant', 'cible']);
  col_canal := tests.colonne_parmi('public.envois'::regclass, array['canal']);
  col_trans := tests.colonne_parmi('public.envois'::regclass, array['transactionnel', 'nature']);
  if col_dest is null or col_canal is null then
    return next fail('Colonnes destinataire/canal introuvables dans envois — adapter la liste de candidates');
    return next diag('Colonnes : ' || (select string_agg(attname || ' ' || format_type(atttypid, null), ', ' order by attnum) from pg_attribute where attrelid = 'public.envois'::regclass and attnum > 0 and not attisdropped));
    return;
  end if;
  valeurs := jsonb_build_object('client_id', jeu ->> 'client_a', col_dest, '+33600000000', col_canal, 'sms');
  if col_trans = 'transactionnel' then valeurs := valeurs || jsonb_build_object('transactionnel', false);
  elsif col_trans = 'nature' then valeurs := valeurs || jsonb_build_object('nature', 'prospection'); end if;
  ligne := tests.inserer_minimal('public', 'envois', valeurs);
  begin
    execute 'select to_jsonb(private.verrous_envoi(e, true, $2)) from public.envois e where e.id = $1' into verrous_nuit using (ligne ->> 'id')::bigint, dimanche_soir;
    execute 'select to_jsonb(private.verrous_envoi(e, true, $2)) from public.envois e where e.id = $1' into verrous_jour using (ligne ->> 'id')::bigint, mardi_matin;
  exception when others then
    return next fail('private.verrous_envoi(envois, boolean, timestamptz) injoignable : ' || sqlerrm);
    return;
  end;
  return next ok(verrous_nuit::text ~* '(differ|hors|plage|heure|report|dimanche|fenetre|fenêtre)', 'Dimanche 23 h, SMS non transactionnel : verrous_envoi() diffère (hors plage)');
  return next ok(verrous_jour::text !~* '(hors.?plage|differ)', 'Mardi 10 h 30 : pas de verrou horaire (témoin)');
  return next diag('Verrous dimanche soir : ' || left(verrous_nuit::text, 400));
  return next diag('Verrous mardi matin : ' || left(verrous_jour::text, 400));
end $f$;

select * from runtests('tests'::name, '^test_37_');
