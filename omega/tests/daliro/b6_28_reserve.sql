-- b6_28 — DALIRO : la réserve hors devis devient un avenant (session B6, 15/10/2026), b6_32.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_32.
-- runtests() annule tout.

create or replace function tests.test_b6_28_reserve() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_collab uuid;
  v_mo uuid; v_ch uuid; v_lot uuid; v_m uuid; v_rec uuid; v_r1 uuid; v_r2 uuid; v_av uuid;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');
  v_collab := tests.b6_compte(v_client, 'collaborateur', 'b6-reserve-collab@banc-varelo.test');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO des réserves') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier des réserves', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '01', 'Peinture', 'client') returning id into v_lot;
  v_m := public.btp_ecrire_marche(null, v_ch, jsonb_build_object('reference', 'RES-1', 'mode_prix', 'forfait', 'montant_ht_declare', 3000, 'retenue_taux', 0));
  perform public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Peinture des murs du séjour', 'unite_lue', 'forfait', 'nature', 'forfait', 'montant_ht', 3000, 'lot_id', v_lot));
  perform public.btp_verifier_marche(v_m);
  v_rec := public.btp_prononcer_reception(v_ch, current_date - 2,
             jsonb_build_array(jsonb_build_object('description', 'Reprise de peinture du séjour', 'lot', '01'),
                               jsonb_build_object('description', 'Peindre aussi le placard de l''entrée (non prévu)')));
  select id into v_r1 from public.btp_reserves where reception_id = v_rec and ordre = 1;
  select id into v_r2 from public.btp_reserves where reception_id = v_rec and ordre = 2;

  -- ── Les droits ──
  return next ok(not has_function_privilege('anon', 'public.btp_avenant_depuis_reserve(uuid, text)', 'execute'), 'anon n''ouvre pas d''avenant depuis une réserve');
  perform tests.endosser(v_collab, 'b6-reserve-collab@banc-varelo.test');
  return next throws_ok(format('select public.btp_avenant_depuis_reserve(%L)', v_r2), '42501', null, 'Un collaborateur non plus');

  -- ── Le chantier réceptionné n'ouvre d'avenant que depuis une réserve ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.btp_ouvrir_avenant(%L, %L)', v_ch, 'Avenant ordinaire'), '23514', null,
                        'Réceptionné : un avenant ordinaire est refusé');
  v_av := public.btp_avenant_depuis_reserve(v_r2);
  return next is((select a.statut || '/' || (a.origine ->> 'canal') || '/' || (a.origine ->> 'reserve') from public.btp_avenants a where a.id = v_av),
                 'brouillon/reception/' || v_r2::text, 'La réserve hors devis ouvre un avenant brouillon, origine « réception »');
  return next ok((select a.objet like 'Reprise hors devis demandée à la réception : Peindre aussi le placard%' from public.btp_avenants a where a.id = v_av),
                 'L''objet reprend la réserve');
  return next ok((select a.origine ? 'chiffrage' from public.btp_avenants a where a.id = v_av), 'La recherche de prix est gardée (b6_26)');
  return next is((select v.avenant_id from public.btp_reserves v where v.id = v_r2), v_av, 'La réserve porte son avenant');
  return next throws_ok(format('select public.btp_avenant_depuis_reserve(%L)', v_r2), '23514', null, 'Une réserve n''a qu''un avenant');

  -- ── L'avenant se chiffre comme les autres ; une réserve levée n'en ouvre plus ──
  perform public.btp_chiffrer_ligne_avenant(v_av, 1, null, v_lot, 'Peinture du placard de l''entrée', 'forfait', 180);
  return next is((select count(*)::int from public.btp_avenants_lignes l where l.avenant_id = v_av), 1, 'L''avenant se chiffre');
  perform public.btp_lever_reserve(v_r1, current_date);
  return next throws_ok(format('select public.btp_avenant_depuis_reserve(%L)', v_r1), '23514', null, 'Une réserve levée n''ouvre plus d''avenant');
  return next ok(tests.b6_journal(v_client, 'daliro.reserve_hors_devis', v_rec::text) is not null, 'Au journal');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b6_28_');
