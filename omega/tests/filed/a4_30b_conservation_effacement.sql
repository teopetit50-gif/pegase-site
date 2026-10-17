-- Tests A4 — lot 32 (a4_40), À JOUER À LA MAIN (coordinateur) : l'effacement simulé, comme private.effacer_client
-- (réglage omega.effacement_client, suppression table par table, puis la ligne de clients). Ce fichier contient des
-- suppressions : elles ne s'exécutent que dans les tests, dans la transaction que runtests() annule. Après
-- a4_30_conservation.sql. `select * from runtests('tests', '^test_a4_40_9')`.

create or replace function tests.a4_simuler_effacement(p_client uuid) returns void language plpgsql as $$
declare r record; i integer;
begin
  perform set_config('omega.effacement_client', p_client::text, true);
  for i in 1 .. 10 loop
    for r in select t.nom from private.tables_locataires t where to_regclass('public.' || t.nom) is not null order by t.ordre_effacement, t.nom loop
      begin
        execute format('delete from public.%I where client_id = $1', r.nom) using p_client;
      exception when foreign_key_violation then null;
      end;
    end loop;
  end loop;
  delete from public.clients where id = p_client;
  perform set_config('omega.effacement_client', '', true);
end $$;

create or replace function tests.test_a4_40_91_effacement_garde_la_loi() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; fa jsonb; b jsonb; v jsonb; n_doc bigint; n_ecr bigint;
begin
  update public.entites set siren = '987654329' where id = (o ->> 'entite')::uuid;
  fa := tests.a4_facture_comptabilisee(o, 'CONS-001');
  perform tests.a4_facture(o, 'ia', 'CONS-002', 60);
  select count(*) into n_doc from public.filed_documents where client_id = v_cl;
  select count(*) into n_ecr from public.filed_ecritures where client_id = v_cl;

  reset role; perform tests.a4_comme((o ->> 'valideur')::uuid);
  return next throws_ok(format('select public.filed_bilan_effacement(%L)', v_cl), '42501', null, 'Le bilan est pour le gérant ou l''admin');
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  b := public.filed_bilan_effacement(v_cl);
  reset role;
  return next is((b -> 'garde' ->> 'registre')::bigint, n_doc, 'Le bilan compte le registre gardé');
  return next is((b -> 'garde' ->> 'ecritures')::bigint, n_ecr, 'et les écritures');
  return next ok((b ->> 'garde_jusqu_au')::date >= (current_date + interval '10 years')::date, 'Gardé au moins dix ans : ' || (b ->> 'garde_jusqu_au'));
  return next ok(b ->> 'texte' like 'Tout ce que FILED tient pour vous est effacé, sauf ce que la loi oblige à garder.%'
                 and b ->> 'texte' like '%scellés%exportables sur demande%', 'La phrase de l''écran le dit');
  return next ok(b -> 'efface' ? 'filed_fournisseurs', 'Le bilan dit ce qui part (les fournisseurs)');

  perform tests.a4_simuler_effacement(v_cl);
  return next is((select count(*) from public.clients where id = v_cl), 0::bigint, 'L''organisation est effacée');
  return next is((select count(*) from public.filed_fournisseurs where client_id = v_cl), 0::bigint, 'ses fournisseurs aussi');
  return next is((select count(*) from public.filed_conservation where client_id = v_cl and nature = 'registre'), n_doc, 'Le registre est au dépôt légal');
  return next is((select count(*) from public.filed_conservation where client_id = v_cl and nature = 'ecriture'), n_ecr, 'les écritures aussi');
  return next ok(exists (select 1 from public.filed_conservation where client_id = v_cl and nature = 'facture' and donnees ->> 'numero' = 'CONS-001'
                           and donnees -> 'fournisseur' ->> 'siren' = '123456782'), 'et le résumé de chaque facture, avec son fournisseur');
  return next ok(not exists (select 1 from public.filed_conservation where client_id = v_cl and nature = 'registre' and donnees ? 'expediteur'),
                 'sans l''adresse de l''expéditeur');
  return next is((select sirens from public.filed_conservation_clients where client_id = v_cl), array['987654329'], 'L''en-tête garde le SIREN');

  set local role service_role;
  v := public.filed_exporter_conservation(v_cl, 'Opérateur Omega, demande du 17/10');
  return next ok((v -> 'verification' ->> 'intacte')::boolean, 'La chaîne est intacte');
  return next is(jsonb_array_length(v -> 'lignes'), (select count(*)::int from public.filed_conservation where client_id = v_cl), 'L''export rend toutes les lignes');
  reset role;
  return next throws_ok(format('update public.filed_conservation set donnees = ''{}'' where client_id = %L', v_cl), '55000', null, 'Le dépôt ne se modifie pas');
  return next throws_ok(format('delete from public.filed_conservation where client_id = %L', v_cl), '55000', null, 'et ne s''efface pas avant son terme');
  return next ok(not has_table_privilege('authenticated', 'public.filed_conservation', 'select')
             and not has_function_privilege('authenticated', 'public.filed_exporter_conservation(uuid, text)', 'execute'), 'Le dépôt est fermé aux membres');
end $f$;

create or replace function tests.test_a4_40_92_chaine_scellee() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; fa jsonb; v_id bigint;
begin
  fa := tests.a4_facture(o, 'ia', 'CONS-010', 120);
  perform tests.a4_simuler_effacement(v_cl);
  -- Une ligne glissée au dépôt sans la bonne empreinte (insertion directe en base) se voit à la vérification.
  insert into public.filed_conservation (client_id, nature, source_id, donnees, conserver_jusqu_au, cause, empreinte_precedente, empreinte)
  select v_cl, 'facture', 'faux', '{"montant_ttc": 1}', current_date + 3650, 'effacement_organisation', c.empreinte, repeat('0', 64)
    from public.filed_conservation c where c.client_id = v_cl order by c.id desc limit 1
  returning id into v_id;
  set local role service_role;
  return next is((public.filed_verifier_conservation(v_cl) ->> 'intacte')::boolean, false, 'Une ligne glissée rompt la chaîne');
  return next is((public.filed_verifier_conservation(v_cl) ->> 'rompue_a')::bigint, v_id, 'et la vérification dit où');
  reset role;
  return next ok(not exists (select 1 from private.tables_locataires where nom in ('filed_conservation', 'filed_conservation_clients')),
                 'Le dépôt n''est pas dans les tables que l''effacement vide');
end $f$;
