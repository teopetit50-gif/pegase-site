-- Tests B7 — la porte identite_demander (lot b7_02), en pgTAP, schéma « tests » d'A5.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b7_01_portes.sql (tests) et b7_02_demander.sql.
-- Client du banc ; identifiants fabriqués ; runtests() annule tout.

create or replace function tests.test_b7_09_demander() returns setof text
language plpgsql as $f$
declare v_cl uuid := tests.b7_client(); v_id uuid; v_id2 uuid; v public.filed_verifications_tiers; t public.travaux; v_user uuid := gen_random_uuid();
  -- (le rôle service_role n'a pas USAGE sur le schéma tests : le client est lu avant de changer de rôle)
begin
  -- Le service demande (comme un autre module le ferait).
  execute 'set local role service_role';
  v_id := public.identite_demander(v_cl, 'sirene', '123 456 782', null, false);
  execute 'reset role';
  select * into v from public.filed_verifications_tiers where id = v_id;
  return next ok(v.id is not null and v.repondu_le is null, 'Le service ouvre une demande');
  return next is(v.identifiant, '123456782', 'identifiant normalisé');
  select * into t from public.travaux where cle = 'verification:' || v_id::text order by id desc limit 1;
  return next ok(t.id is not null, 'et le travail est déposé');
  return next ok(not coalesce((t.charge ->> 'force')::boolean, false), 'sans force');

  -- Redemander le même identifiant rend la même demande ; avec force, le travail porte force.
  execute 'set local role service_role';
  v_id2 := public.identite_demander(v_cl, 'sirene', '123456782', null, true);
  execute 'reset role';
  return next is(v_id2, v_id, 'Une demande déjà ouverte est rendue, pas doublée');
  select * into t from public.travaux where cle = 'verification:' || v_id::text order by id desc limit 1;
  return next is(t.charge ->> 'force', 'true', 'force posé sur le travail existant');

  -- Une demande forcée neuve : la preuve de la ligne porte force, la charge du travail aussi.
  execute 'set local role service_role';
  v_id2 := public.identite_demander(v_cl, 'vies', 'fr 11 123 456 782', null, true);
  execute 'reset role';
  select * into v from public.filed_verifications_tiers where id = v_id2;
  return next is(v.identifiant, 'FR11123456782', 'numéro de TVA normalisé');
  return next is(v.preuve ->> 'force', 'true', 'la demande ouverte dit force');
  select * into t from public.travaux where cle = 'verification:' || v_id2::text order by id desc limit 1;
  return next is(t.charge ->> 'force', 'true', 'le travail dit force');

  -- Refus : registre inconnu, SIREN mal formé, TVA mal formée, fournisseur d'ailleurs.
  execute 'set local role service_role';
  return next throws_ok(format('select public.identite_demander(%L, %L, %L)', v_cl, 'rne', '123456782'), '22023', null, 'registre inconnu refusé');
  return next throws_ok(format('select public.identite_demander(%L, %L, %L)', v_cl, 'sirene', '1234'), '22023', null, 'SIREN mal formé refusé');
  return next throws_ok(format('select public.identite_demander(%L, %L, %L)', v_cl, 'vies', '123456782'), '22023', null, 'TVA sans pays refusée');
  return next throws_ok(format('select public.identite_demander(%L, %L, %L, %L)', v_cl, 'sirene', '123456782', gen_random_uuid()), 'P0002', null, 'fournisseur inconnu refusé');
  execute 'reset role';

  -- Une personne de l'organisation peut demander ; une personne d'ailleurs, non.
  -- (sans les aides tests.role_admis / tests.endosser, absentes de la recette : utilisateur, compte et JWT posés ici)
  insert into auth.users (id, email, instance_id, aud, role, encrypted_password, created_at, updated_at)
  values (v_user, 'b7-gerant@essai.invalid', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', now(), now());
  insert into public.comptes (user_id, client_id, role, perimetre_total) values (v_user, v_cl, 'gerant', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_user, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  v_id2 := public.identite_demander(v_cl, 'sirene', '100000009', null, false);
  execute 'reset role';
  return next ok(v_id2 is not null, 'Un membre de l''organisation demande une vérification');
  perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  return next throws_ok(format('select public.identite_demander(%L, %L, %L)', v_cl, 'sirene', '100000009'), '42501', null, 'Une personne étrangère à l''organisation est refusée');
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);
  return next ok(not has_function_privilege('anon', 'public.identite_demander(uuid,text,text,uuid,boolean)', 'execute'), 'anon n''exécute pas identite_demander');
end $f$;

select * from runtests('tests'::name, '^test_b7_09_');
