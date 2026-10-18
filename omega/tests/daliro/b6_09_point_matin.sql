-- b6_09 — DALIRO : la section « Chantiers : réceptions et retenues » du point du matin (session B6, 06/10/2026), b6_15.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_15.
-- runtests() annule tout.

create or replace function tests.test_b6_09_point_matin() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_mo uuid; v_a uuid; v_b uuid; v_lot uuid; v_m uuid; v_rec uuid;
  v_matin timestamptz := ((current_date + time '08:00') at time zone 'Europe/Paris');
  v_nuit timestamptz := ((current_date + time '03:00') at time zone 'Europe/Paris');
  v_section uuid; n integer;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');

  -- Chantier A : réceptionné il y a 370 jours, retenue sous caution, une réserve ouverte, décompte pas envoyé.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO du point du matin') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Point du matin A', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_a;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_a, '01', 'Lot A', 'client') returning id into v_lot;
  v_m := public.btp_ecrire_marche(null, v_a, jsonb_build_object('reference', 'PM-A', 'mode_prix', 'forfait', 'montant_ht_declare', 1000,
                                                                'retenue_taux', 0.05, 'retenue_base', 'ht', 'retenue_caution', true));
  perform public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Travaux A', 'unite_lue', 'forfait', 'nature', 'forfait', 'montant_ht', 1000, 'lot_id', v_lot));
  perform public.btp_verifier_marche(v_m);
  v_rec := public.btp_prononcer_reception(v_a, current_date - 370, jsonb_build_array(jsonb_build_object('description', 'Seuil de porte à reprendre')));

  -- Chantier B : ouvert, fin prévue dépassée.
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut, date_fin_prevue)
  values (v_client, 'Point du matin B', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert', current_date - 3) returning id into v_b;
  perform tests.redevenir_admin();

  return next ok(not has_function_privilege('authenticated', 'private.btp_deposer_points(timestamp with time zone)', 'execute'), 'authenticated ne dépose pas le point du matin');
  return next is(private.btp_deposer_points(v_nuit), 0, 'Avant 5 h (Paris) : rien n''est déposé');
  perform private.btp_deposer_points(v_matin);
  select s.id into v_section from public.points_sections s
  where s.client_id = v_client and s.module = 'daliro' and s.role = 'gerant' and s.jour = current_date and s.titre = 'Chantiers : réceptions et retenues';
  return next ok(v_section is not null, 'Le gérant reçoit la section « Chantiers : réceptions et retenues »');
  return next ok(exists (select 1 from public.points_sections s where s.client_id = v_client and s.module = 'daliro' and s.role = 'valideur' and s.jour = current_date),
                 'Les valideurs (la DAF) la reçoivent aussi');
  return next ok(exists (select 1 from public.points_items i where i.section_id = v_section and i.gravite = 'attention'
                           and i.texte like 'Point du matin A : caution de retenue de garantie due depuis le %réclamez-la'),
                 'Ligne : la caution est due, réclamez-la');
  return next ok(exists (select 1 from public.points_items i where i.section_id = v_section and i.texte like 'Point du matin A : décompte final à envoyer depuis le %'),
                 'Ligne : le décompte final est à envoyer');
  return next ok(exists (select 1 from public.points_items i where i.section_id = v_section and i.texte like 'Point du matin A : 1 réserve encore ouverte%'),
                 'Ligne : une réserve encore ouverte');
  return next ok(exists (select 1 from public.points_items i where i.section_id = v_section and i.texte like 'Point du matin B : fin prévue le % dépassée%'),
                 'Ligne : la fin prévue du chantier B est dépassée');
  return next ok((select bool_and(i.lien = '/espace/daliro' and i.objet_type = 'btp_chantiers') from public.points_items i where i.section_id = v_section),
                 'Chaque ligne mène à /espace/daliro et désigne son chantier');
  select count(*) into n from public.points_items i where i.section_id = v_section;
  perform private.btp_deposer_points(v_matin);
  return next is((select count(*)::int from public.points_items i where i.section_id = v_section), n, 'Redéposer ne double rien');
end $f$;

select * from runtests('tests'::name, '^test_b6_09_');
