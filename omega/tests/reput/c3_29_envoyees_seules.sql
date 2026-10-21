-- c3_29 — REPUT, correctif TREPUT-05 : « envoyées seules ce mois » ne compte que les réponses vraiment parties.
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_28 (aides tests.c3_*, dont tests.c3_repondre de c3_03
-- et tests.c3_remettre de c3_02) et les migrations c3_01 à c3_29. Banc en essai : rien ne part pour de vrai. runtests() annule tout.

create or replace function tests.test_c3_29_envoyees_seules() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; v_daf uuid; v_h uuid; d record; v_r jsonb; v_e1 uuid; v_e2 uuid; v_e3 uuid; v_n int;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_h := (public.reput_ecrire_connaissance(null, v_client, jsonb_build_object('sujet', 'horaires', 'genre', 'horaires',
    'titre', 'Horaires (C3-29)', 'contenu', 'Le samedi de 9 h à 12 h.', 'source', 'Banc C3-29')) ->> 'id')::uuid;
  perform public.reput_donner_accord(v_client, 'horaires');
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  for d in select v.id from public.demandes_validation v join public.politiques p on p.demande_id = v.id
           where p.client_id = v_client and p.module = 'reput' and p.statut = 'a_valider' and v.statut = 'en_attente' loop
    insert into public.approbations (demande_id, client_id, user_id, decision) values (d.id, v_client, v_daf, 'approuve');
  end loop;
  perform tests.redevenir_admin();

  v_r := tests.c3_repondre(v_client, 'c3-29a@exemple.test', 'Fictif A', 'Ouvert samedi ?', 'horaires', true, array[v_h], 'Oui, le samedi de 9 h à 12 h.');
  v_e1 := (v_r ->> 'envoi')::uuid;
  v_r := tests.c3_repondre(v_client, 'c3-29b@exemple.test', 'Fictif B', 'Ouvert samedi ?', 'horaires', true, array[v_h], 'Oui, le samedi de 9 h à 12 h.');
  v_e2 := (v_r ->> 'envoi')::uuid;
  v_r := tests.c3_repondre(v_client, 'c3-29c@exemple.test', 'Fictif C', 'Ouvert samedi ?', 'horaires', true, array[v_h], 'Oui, le samedi de 9 h à 12 h.');
  v_e3 := (v_r ->> 'envoi')::uuid;
  return next ok(v_r ->> 'politique' is not null, 'Les trois réponses sont couvertes par l''accord « horaires »');
  perform tests.c3_remettre(v_e1);
  update public.envois set statut = 'bloque', motif = 'Essai C3-29 : envoi bloqué, rien parti' where id = v_e2;
  return next is((select statut from public.envois where id = v_e1), 'envoye', 'La première est partie');
  select (x ->> 'envoyees_seules_mois')::int into v_n from jsonb_array_elements(private.reput_accords_etat(v_client)) x where x ->> 'sujet' = 'horaires';
  return next is(v_n, 1, 'Envoyées seules ce mois : 1 — ni l''envoi bloqué ni celui qui n''est pas encore parti ne comptent');
end $f$;

select * from runtests('tests'::name, '^test_c3_29_');
