-- b6_31 — DALIRO : sur pluie annoncée, un nouvel ordre de la semaine proposé (session B6, 15/10/2026), b6_35.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_35.
-- runtests() annule tout. Une prévision posée à la main : pluie à J+1 et J+2, sec ensuite.

create or replace function tests.test_b6_31_ordre_meteo() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_collab uuid;
  v_mo uuid; v_c1 uuid; v_c2 uuid; v_l1 uuid; v_l2 uuid; v_eq uuid; v_ext uuid; v_int uuid; v_int2 uuid; v_r jsonb;
  v_j date := (now() at time zone 'Europe/Paris')::date;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');
  v_collab := tests.b6_compte(v_client, 'collaborateur', 'b6-ordre-collab@banc-varelo.test');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO de l''ordre météo') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut, latitude, longitude)
  values (v_client, 'Façade de l''ordre météo', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert', 45.77, 4.89) returning id into v_c1;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Intérieur de l''ordre météo', '69003', 'Lyon', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_c2;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_c1, '01', 'Façade', 'client') returning id into v_l1;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_c2, '01', 'Cloisons', 'client') returning id into v_l2;
  insert into public.btp_equipes (client_id, nom) values (v_client, 'Équipe de l''ordre météo') returning id into v_eq;
  insert into public.btp_passages (client_id, chantier_id, lot_id, equipe_id, tache, debut, fin, exterieur) values
    (v_client, v_c1, v_l1, v_eq, 'Enduit de façade', v_j + 1, v_j + 1, true) returning id into v_ext;
  insert into public.btp_passages (client_id, chantier_id, lot_id, equipe_id, tache, debut, fin) values
    (v_client, v_c2, v_l2, v_eq, 'Cloisons R+2', v_j + 2, v_j + 2) returning id into v_int2;
  insert into public.btp_passages (client_id, chantier_id, lot_id, equipe_id, tache, debut, fin) values
    (v_client, v_c2, v_l2, v_eq, 'Cloisons R+1', v_j + 4, v_j + 4) returning id into v_int;
  perform tests.redevenir_admin();
  insert into public.btp_meteo (chantier_id, client_id, entite_id, latitude, longitude, demandee_le, recue_le, fournisseur, prevision)
  select c.id, c.client_id, c.entite_id, 45.77, 4.89, now(), now(), 'met_norway',
         (select jsonb_agg(jsonb_build_object('jour', v_j + k, 'pluie_mm', case when k in (1, 2) then 12 else 0 end, 'vent_kmh', 15,
                                              'rafales_kmh', null, 'tmin', 8, 'tmax', 16) order by k) from generate_series(0, 6) k)
  from public.btp_chantiers c where c.id = v_c1;

  -- ── Les droits ──
  return next ok(not has_function_privilege('anon', 'public.btp_echanger_passages(uuid, uuid, text)', 'execute'), 'anon n''échange pas de passages');
  perform tests.endosser(v_collab, 'b6-ordre-collab@banc-varelo.test');
  return next throws_ok(format('select public.btp_ordre_meteo(%L)', v_client), '42501', null, 'Un collaborateur ne lit pas l''ordre proposé');

  -- ── La proposition ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_r := public.btp_ordre_meteo(v_client);
  select x into v_r from jsonb_array_elements(v_r -> 'propositions') x where x ->> 'exterieur' = v_ext::text;
  return next is(v_r ->> 'interieur', v_int::text, 'L''enduit (pluie à J+1) s''échange avec les cloisons de J+4 (sec), pas avec celles de J+2 (pluie)');
  return next ok(v_r ->> 'texte' like 'Échanger « Enduit de façade »%avec « Cloisons R+1 »%', 'La proposition se lit');
  return next is((select p.debut from public.btp_passages p where p.id = v_ext), v_j + 1, 'Proposer ne déplace rien');

  -- ── Le conducteur valide ──
  return next throws_ok(format('select public.btp_echanger_passages(%L, %L)', v_ext, v_int2), '23514', null, 'Un échange vers un jour de pluie est refusé');
  perform public.btp_echanger_passages(v_ext, v_int, 'Pluie annoncée');
  return next is((select string_agg(p.tache || ':' || (p.debut - v_j), ',' order by p.tache) from public.btp_passages p where p.id in (v_ext, v_int)),
                 'Cloisons R+1:1,Enduit de façade:4', 'Les dates s''échangent : l''enduit au sec, les cloisons le jour de pluie');
  return next ok(tests.b6_journal(v_client, 'daliro.ordre_meteo', v_c1::text) is not null, 'L''échange est au journal');

  -- ── Une dépendance bloque l'échange ──
  insert into public.btp_dependances (client_id, chantier_id, amont_id, aval_id, delai_min_jours) values (v_client, v_c2, v_int2, v_int, 0);
  return next throws_ok(format('select public.btp_echanger_passages(%L, %L)', v_ext, v_int), '23514', null, 'Avec une dépendance : on recale, on n''échange pas');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b6_31_');
