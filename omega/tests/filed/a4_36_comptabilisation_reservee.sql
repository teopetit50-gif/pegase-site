-- Tests A4 — lot 40 (a4_48) : comptabilisation réservée et séparation des tâches. Données fictives.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql),
-- tests.a4_compte, tests.a4_imputer (a4_11_ecritures_fec.sql) et tests.a4_comme (a4_26_sortie_envois.sql), à poser avant.
-- Ce fichier ne supprime rien.

-- Une facture validée, imputée, prête à comptabiliser ; p_approbateur : qui l'a approuvée (l'historique de la validation).
create or replace function tests.a4_facture_validee(p_org jsonb, p_numero text, p_approbateur uuid default null) returns jsonb
language plpgsql as $$
declare fa jsonb := tests.a4_facture(p_org, 'ia', p_numero, 120); v_c uuid;
begin
  select id into v_c from public.filed_plan_comptable where client_id = (p_org ->> 'client')::uuid and numero = '6061';
  perform tests.a4_imputer(fa, coalesce(v_c, tests.a4_compte(p_org, '6061', 'Fournitures non stockables')), 100);
  update public.filed_factures set statut = 'validee' where id = (fa ->> 'facture')::uuid;
  if p_approbateur is not null then
    perform private.filed_historiser((p_org ->> 'client')::uuid, (fa ->> 'document')::uuid, 'filed_facture', fa ->> 'facture', 'validee',
      'Validée par 1 personne(s) (exemple).', jsonb_build_object('decideurs', jsonb_build_array(p_approbateur)));
  end if;
  return fa;
end $$;

create or replace function tests.test_a4_48_01_reservee_et_separation() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; v_c uuid := gen_random_uuid();
        v uuid := (o ->> 'valideur')::uuid; g uuid := (o ->> 'gerant')::uuid; f1 jsonb; f2 jsonb; f3 jsonb; f4 jsonb; e jsonb;
begin
  -- Une troisième personne, collaboratrice (la saisie).
  insert into auth.users (id, email, instance_id, aud, role, encrypted_password, created_at, updated_at)
  values (v_c, v_c::text || '@exemple.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', now(), now());
  insert into public.comptes (user_id, client_id, role) values (v_c, v_cl, 'collaborateur');
  f1 := tests.a4_facture_validee(o, 'CPT-001', v);
  f2 := tests.a4_facture_validee(o, 'CPT-002');
  f3 := tests.a4_facture_validee(o, 'CPT-003', v);
  f4 := tests.a4_facture_validee(o, 'CPT-004');

  -- 1. Sans réglage, rien ne change : le valideur comptabilise, même ce qu'il a approuvé.
  reset role; perform tests.a4_comme(v);
  return next lives_ok(format('select public.filed_comptabiliser_facture(%L)', f1 ->> 'facture'), 'Par défaut, le valideur comptabilise comme avant');
  reset role;
  return next is((select statut from public.filed_factures where id = (f1 ->> 'facture')::uuid), 'comptabilisee', 'comptabilisée');

  -- 2. Réserver sans personne désignée est refusé ; le valideur ne règle rien.
  reset role; perform tests.a4_comme(g);
  return next throws_ok(format('select public.filed_regler_comptabilisation(%L, true, true)', v_cl), '55000', null,
                        'Pas de réserve sans personne désignée');
  reset role; perform tests.a4_comme(v);
  return next throws_ok(format('select public.filed_designer_comptable(%L, %L)', v_cl, v), '42501', null, 'Le valideur ne désigne personne');
  reset role; perform tests.a4_comme(g);
  perform public.filed_designer_comptable(v_cl, v_c);
  e := public.filed_regler_comptabilisation(v_cl, true, true);
  return next ok((e ->> 'reservee')::boolean and (e ->> 'separation')::boolean, 'Réserve et séparation posées : ' || e::text);
  return next throws_ok(format('select public.filed_designer_comptable(%L, %L, false)', v_cl, v_c), '55000', null,
                        'La dernière personne désignée ne se retire pas tant que la réserve tient');

  -- 3. Réservée : le valideur, non désigné, ne comptabilise plus ; la collaboratrice désignée, oui.
  reset role; perform tests.a4_comme(v);
  return next throws_ok(format('select public.filed_comptabiliser_facture(%L)', f2 ->> 'facture'), '42501', null,
                        'Réservée : une personne non désignée ne comptabilise pas');
  reset role; perform tests.a4_comme(v_c);
  return next lives_ok(format('select public.filed_comptabiliser_facture(%L)', f2 ->> 'facture'), 'la personne désignée, oui (même collaboratrice)');

  -- 4. Séparation : désigné lui aussi, le valideur ne comptabilise pas ce qu'il a approuvé.
  reset role; perform tests.a4_comme(g);
  perform public.filed_designer_comptable(v_cl, v);
  reset role; perform tests.a4_comme(v);
  return next throws_ok(format('select public.filed_comptabiliser_facture(%L)', f3 ->> 'facture'), '42501', null,
                        'Séparation : qui a approuvé ne comptabilise pas');
  return next lives_ok(format('select public.filed_comptabiliser_facture(%L)', f4 ->> 'facture'), 'mais comptabilise ce qu''il n''a pas approuvé');
  reset role; perform tests.a4_comme(v_c);
  return next lives_ok(format('select public.filed_comptabiliser_facture(%L)', f3 ->> 'facture'), 'une autre personne comptabilise la facture approuvée');
  e := public.filed_etat_comptabilisation(v_cl);
  reset role;
  return next is(jsonb_array_length(e -> 'comptables'), 2, 'L''état donne les deux personnes désignées');
  return next is((select count(*) from public.filed_factures where client_id = v_cl and statut = 'comptabilisee'), 4::bigint, 'Les quatre factures sont comptabilisées');
end $f$;
