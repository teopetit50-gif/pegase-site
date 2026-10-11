-- b6_27 — DALIRO : les disponibilités de l'annuaire (session B6, 11/10/2026), b6_31.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_31.
-- runtests() annule tout. Un passage d'Alpha ; trois remplaçants possibles : Bravo déjà pris sur un autre passage,
-- Charlie absent (absence notée), Delta libre.

create or replace function tests.test_b6_27_disponibilites() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_collab uuid;
  v_mo uuid; v_ch uuid; v_l1 uuid; v_l2 uuid; v_a uuid; v_b uuid; v_c uuid; v_d uuid; v_p uuid; v_abs uuid;
  v_j date := (now() at time zone 'Europe/Paris')::date + 20; v_dispo jsonb;
  v_tel text := lpad((floor(random() * 9000000) + 1000000)::bigint::text, 7, '0');
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');
  v_collab := tests.b6_compte(v_client, 'collaborateur', 'b6-dispo-collab@banc-varelo.test');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO des disponibilités') returning id into v_mo;
  insert into public.btp_tiers (client_id, roles, nom, telephone, canal, vigilance_attestation_le) values
    (v_client, array['sous_traitant'], 'Alpha disponibilités', '+3361' || v_tel, 'sms', current_date - 10) returning id into v_a;
  insert into public.btp_tiers (client_id, roles, nom, telephone, canal, vigilance_attestation_le) values
    (v_client, array['sous_traitant'], 'Bravo disponibilités', '+3362' || v_tel, 'sms', current_date - 10) returning id into v_b;
  insert into public.btp_tiers (client_id, roles, nom, telephone, canal, vigilance_attestation_le) values
    (v_client, array['sous_traitant'], 'Charlie disponibilités', '+3363' || v_tel, 'sms', current_date - 10) returning id into v_c;
  insert into public.btp_tiers (client_id, roles, nom, telephone, canal, vigilance_attestation_le) values
    (v_client, array['sous_traitant'], 'Delta disponibilités', '+3364' || v_tel, 'sms', current_date - 10) returning id into v_d;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier des disponibilités', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution, tiers_id) values (v_client, v_ch, '07', 'Lot Alpha', 'sous_traitant', v_a) returning id into v_l1;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution, tiers_id) values (v_client, v_ch, '08', 'Lot Bravo', 'sous_traitant', v_b) returning id into v_l2;
  insert into public.btp_passages (client_id, chantier_id, lot_id, tiers_id, tache, debut, fin) values (v_client, v_ch, v_l1, v_a, 'Passage d''Alpha', v_j, v_j + 1) returning id into v_p;
  insert into public.btp_passages (client_id, chantier_id, lot_id, tiers_id, tache, debut, fin) values (v_client, v_ch, v_l2, v_b, 'Bravo ailleurs', v_j + 1, v_j + 3);

  -- ── Les droits ──
  return next ok(not has_function_privilege('anon', 'public.btp_noter_indisponibilite(uuid, date, date, text)', 'execute'), 'anon ne note pas d''absence');
  perform tests.endosser(v_collab, 'b6-dispo-collab@banc-varelo.test');
  return next throws_ok(format('select public.btp_noter_indisponibilite(%L, %L, %L)', v_c, v_j, v_j), '42501', null, 'Un collaborateur ne note pas d''absence');

  -- ── L'absence de Charlie ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.btp_noter_indisponibilite(%L, %L, %L)', v_c, v_j, v_j - 1), '22023', null, 'Une absence finit après avoir commencé');
  v_abs := public.btp_noter_indisponibilite(v_c, v_j - 2, v_j + 5, 'Congés');
  return next ok(tests.b6_journal(v_client, 'daliro.absence_notee', v_c::text) is not null, 'L''absence est au journal');

  -- ── Les remplaçants du passage d'Alpha ──
  return next is((select string_agg(r.nom, ',' order by r.nom) from public.btp_proposer_remplacants(v_p) r where r.nom like '% disponibilités'),
                 'Delta disponibilités', 'Seul Delta est proposé : Bravo est pris ailleurs ces jours-là, Charlie est absent');
  v_dispo := public.btp_disponibilites(v_client, v_j, v_j + 3);
  return next ok((select jsonb_array_length(x -> 'passages') = 1 from jsonb_array_elements(v_dispo) x where x ->> 'tiers' = v_b::text)
                 and (select x -> 'absences' -> 0 ->> 'motif' = 'Congés' from jsonb_array_elements(v_dispo) x where x ->> 'tiers' = v_c::text),
                 'L''annuaire montre le passage de Bravo et l''absence de Charlie sur la période');

  -- ── L'absence annulée : Charlie redevient disponible ──
  perform public.btp_annuler_indisponibilite(v_abs);
  return next is((select string_agg(r.nom, ',' order by r.nom) from public.btp_proposer_remplacants(v_p) r where r.nom like '% disponibilités'),
                 'Charlie disponibilités,Delta disponibilités', 'Absence annulée : Charlie revient dans les remplaçants');
  return next ok((select i.annulee from public.btp_indisponibilites i where i.id = v_abs), 'L''absence est annulée, pas effacée');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b6_27_');
