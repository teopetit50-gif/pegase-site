-- 22 — Qui lit une réception Tamila en clair (migration b4_13). Après 00_jeu_tamila.sql, b4_01 à b4_13.
-- runtests() annule tout.

create or replace function tests.test_b4_22_peut_lire_reception() returns setof text
language plpgsql as $f$
declare jeu jsonb; v_client uuid; v_dossier uuid;
begin
  jeu := tests.tamila_scene();
  v_client := (jeu ->> 'client')::uuid;
  v_dossier := (jeu ->> 'dossier')::uuid;
  perform tests.redevenir_admin();

  return next ok(private.tamila_peut_lire_reception(v_client, (jeu ->> 'gerant')::uuid), 'le gérant lit la réception');
  return next ok(private.tamila_peut_lire_reception(v_client, (jeu ->> 'admin')::uuid), 'l''associé la lit');
  return next ok(private.tamila_peut_lire_reception(v_client, (jeu ->> 'avocat')::uuid), 'l''avocat collaborateur la lit');
  return next ok(not private.tamila_peut_lire_reception(v_client, (jeu ->> 'assistante')::uuid), 'l''assistante non');
  return next ok(not private.tamila_peut_lire_reception(v_client, (jeu ->> 'stagiaire')::uuid), 'le stagiaire non');
  return next ok(not private.tamila_peut_lire_reception((jeu ->> 'autre_client')::uuid, (jeu ->> 'gerant')::uuid), 'pas la réception d''un autre cabinet');
  return next ok(not private.tamila_peut_lire_reception(v_client, null), 'sans personne : non');

  -- Sous muraille active : non ; muraille levée : de nouveau oui.
  insert into public.tamila_murailles (client_id, dossier_id, user_id, pose_par)
  values (v_client, v_dossier, (jeu ->> 'avocat')::uuid, (jeu ->> 'gerant')::uuid);
  return next ok(not private.tamila_peut_lire_reception(v_client, (jeu ->> 'avocat')::uuid), 'l''avocat sous muraille ne la lit plus');
  update public.tamila_murailles set leve_le = now(), leve_par = (jeu ->> 'gerant')::uuid where client_id = v_client and user_id = (jeu ->> 'avocat')::uuid;
  return next ok(private.tamila_peut_lire_reception(v_client, (jeu ->> 'avocat')::uuid), 'muraille levée : il la lit de nouveau');

  return next ok(not has_function_privilege('anon', 'private.tamila_peut_lire_reception(uuid, uuid)', 'execute')
                 and has_function_privilege('authenticated', 'private.tamila_peut_lire_reception(uuid, uuid)', 'execute'),
                 'appelable par les politiques (authenticated), pas par anon');
end $f$;

select * from runtests('tests'::name, '^test_b4_22_');
