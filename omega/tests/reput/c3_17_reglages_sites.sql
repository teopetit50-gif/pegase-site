-- c3_17 — REPUT : les réglages par entité et par site (héritage, périmètre, lecture par site).
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_16 (aides tests.c3_*) et les migrations c3_01 à c3_17.
-- Rien n'est envoyé. runtests() annule tout.

create or replace function tests.test_c3_17_reglages_sites() returns setof text
language plpgsql as $f$
declare
  banc jsonb; jeu jsonb;
  v_client uuid; v_gerant uuid; v_admin_lyon uuid; v_lecteur_lyon uuid; v_autre uuid; v_lyon uuid; v_nantes uuid; v_base jsonb;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  v_gerant := tests.c3_compte(v_client, 'gerant', 'c3-17-gerant@banc-varelo.test');
  v_admin_lyon := tests.c3_compte(v_client, 'admin', 'c3-17-admin-lyon@banc-varelo.test', false);
  v_lecteur_lyon := tests.c3_compte(v_client, 'lecteur', 'c3-17-lecteur-lyon@banc-varelo.test', false);
  insert into public.entites (client_id, nom, type) values (v_client, 'Agence de Lyon (C3-17)', 'site') returning id into v_lyon;
  insert into public.entites (client_id, nom, type) values (v_client, 'Agence de Nantes (C3-17)', 'site') returning id into v_nantes;
  insert into public.comptes_entites (client_id, user_id, entite_id) values (v_client, v_admin_lyon, v_lyon), (v_client, v_lecteur_lyon, v_lyon);
  jeu := tests.jeu();
  v_autre := (jeu ->> 'gerant_a')::uuid;
  perform public.reput_installer(v_client);

  -- ── L'organisation, puis une entité qui s'installe : elle hérite ──
  perform tests.endosser(v_gerant, 'c3-17-gerant@banc-varelo.test');
  perform public.reput_regler(v_client, null, jsonb_build_object('signature', 'Atelier (C3-17)', 'ton', 'vouvoiement'));
  perform tests.redevenir_admin();
  perform private.reput_installer(v_client, v_lyon);
  return next ok((select r.suit_organisation and r.signature = 'Atelier (C3-17)' from public.reput_reglages r
                  where r.client_id = v_client and r.entite_id = v_lyon),
                 'Une entité installée suit l''organisation : mêmes réglages');
  perform tests.endosser(v_gerant, 'c3-17-gerant@banc-varelo.test');
  perform public.reput_regler(v_client, null, jsonb_build_object('signature', 'Atelier V2 (C3-17)'));
  perform tests.redevenir_admin();
  return next is((select r.signature from public.reput_reglages r where r.client_id = v_client and r.entite_id = v_lyon),
                 'Atelier V2 (C3-17)', 'L''organisation change : l''entité qui la suit suit');

  -- ── Le site réglé lui-même : ses propres réglages ──
  perform tests.endosser(v_admin_lyon, 'c3-17-admin-lyon@banc-varelo.test');
  perform public.reput_regler(v_client, v_lyon, jsonb_build_object('signature', 'Atelier — Lyon', 'ton', 'tutoiement'));
  return next throws_ok(format('select public.reput_regler(%L, %L, %L::jsonb)', v_client, v_nantes, '{"signature": "Nantes"}'), '42501', null,
                        'Un administrateur de site ne règle pas un autre site');
  return next throws_ok(format('select public.reput_regler(%L, null, %L::jsonb)', v_client, '{"signature": "Toute l''organisation"}'), '42501', null,
                        'Un administrateur de site ne règle pas toute l''organisation');
  perform tests.redevenir_admin();
  v_base := private.reput_base(v_client, v_lyon, now());
  return next is((v_base -> 'reglages' ->> 'signature') || ' / ' || (v_base -> 'reglages' ->> 'ton'), 'Atelier — Lyon / tutoiement',
                 'La base en vigueur du site porte ses propres réglages');
  return next ok(not (select r.suit_organisation from public.reput_reglages r where r.client_id = v_client and r.entite_id = v_lyon),
                 'Réglé lui-même, le site ne suit plus l''organisation');
  return next is(private.reput_base(v_client, v_nantes, now()) -> 'reglages' ->> 'signature', 'Atelier V2 (C3-17)',
                 'Un site sans réglages propres a ceux de l''organisation');
  perform tests.endosser(v_gerant, 'c3-17-gerant@banc-varelo.test');
  perform public.reput_regler(v_client, null, jsonb_build_object('formule_appel', 'Bonjour à vous,'));
  perform tests.redevenir_admin();
  return next is((select r.formule_appel from public.reput_reglages r where r.client_id = v_client and r.entite_id = v_lyon), 'Bonjour,',
                 'Un site aux réglages propres ne change pas quand l''organisation change');

  -- ── La lecture par site ──
  perform tests.endosser(v_gerant, 'c3-17-gerant@banc-varelo.test');
  return next is((select s.source from public.reput_reglages_sites s where s.entite_id = v_lyon), 'propres', 'Lecture : Lyon a ses propres réglages');
  return next is((select s.source || ' / ' || s.signature from public.reput_reglages_sites s where s.entite_id = v_nantes),
                 'organisation / Atelier V2 (C3-17)', 'Lecture : Nantes suit l''organisation');
  perform tests.endosser(v_lecteur_lyon, 'c3-17-lecteur-lyon@banc-varelo.test');
  return next is(tests.compter('public', 'reput_reglages', format('client_id = %L and entite_id = %L', v_client, v_nantes))::int, 0,
                 'Un lecteur de Lyon ne lit pas les réglages propres de Nantes');
  perform tests.endosser(v_autre, 'a5-gerant-a@essai.invalid');
  return next is(tests.compter('public', 'reput_reglages_sites', format('client_id = %L', v_client))::int, 0,
                 'Une autre organisation ne lit rien');

  -- ── Revenir à l'organisation ──
  return next ok(not has_function_privilege('anon', 'public.reput_suivre_organisation(uuid, uuid)', 'execute'), 'anon ne ramène pas un site');
  perform tests.endosser(v_admin_lyon, 'c3-17-admin-lyon@banc-varelo.test');
  return next throws_ok(format('select public.reput_suivre_organisation(%L, %L)', v_client, v_nantes), '42501', null,
                        'Un administrateur de site ne ramène pas un autre site');
  perform public.reput_suivre_organisation(v_client, v_lyon);
  perform tests.redevenir_admin();
  return next ok((select r.suit_organisation and r.signature = 'Atelier V2 (C3-17)' and r.ton = 'vouvoiement' and r.formule_appel = 'Bonjour à vous,'
                  from public.reput_reglages r where r.client_id = v_client and r.entite_id = v_lyon),
                 'Ramené : le site reprend tous les réglages de l''organisation');
  return next ok(tests.c3_journal(v_client, 'reput.reglages_suivent_organisation') is not null, 'Journal : reput.reglages_suivent_organisation');
  perform tests.endosser(v_gerant, 'c3-17-gerant@banc-varelo.test');
  perform public.reput_regler(v_client, null, jsonb_build_object('signature', 'Atelier V3 (C3-17)'));
  perform tests.redevenir_admin();
  return next is((select r.signature from public.reput_reglages r where r.client_id = v_client and r.entite_id = v_lyon), 'Atelier V3 (C3-17)',
                 'Ramené, le site suit de nouveau les changements de l''organisation');
end $f$;

select * from runtests('tests'::name, '^test_c3_17_');
