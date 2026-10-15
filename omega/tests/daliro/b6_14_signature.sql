-- b6_14 — DALIRO : la signature du client sur le téléphone du chef d'équipe (session B6, 06/10/2026), b6_20.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_20.
-- runtests() annule tout.
--
-- Un avenant de 800 € HT, validé par la DAF ; le gérant prépare le lien ; le maître d'ouvrage signe sans compte (anon).

create or replace function tests.test_b6_14_signature() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; v_collab uuid;
  v_mo uuid; v_ch uuid; v_lot uuid; v_m uuid; v_av uuid; v_av2 uuid; v_dem uuid; v_dem2 uuid;
  v_r jsonb; v_jeton text; v_jeton2 text; v_s jsonb; v_signe jsonb; v_etats text[] := '{}';
  v_trace text := 'data:image/png;base64,' || repeat('iVBORw0KGgoAAAANSUhEUgAA', 20);
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');
  v_collab := tests.b6_compte(v_client, 'collaborateur', 'b6-signature-collab@banc-varelo.test');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO de la signature') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier de la signature', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '01', 'Lot de la signature', 'client') returning id into v_lot;
  v_m := public.btp_ecrire_marche(null, v_ch, jsonb_build_object('reference', 'SIG-1', 'mode_prix', 'forfait', 'montant_ht_declare', 1000, 'retenue_taux', 0));
  perform public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Travaux', 'unite_lue', 'forfait', 'nature', 'forfait', 'montant_ht', 1000, 'lot_id', v_lot));
  perform public.btp_verifier_marche(v_m);
  v_av := public.btp_ouvrir_avenant(v_ch, 'Deux portes de placard (signature)');
  perform public.btp_chiffrer_ligne_avenant(v_av, 2, null, v_lot, 'Porte de placard coulissante (signature)', 'u', 400);

  -- ── Les droits : l'exception anon, et elle seule ──
  return next ok(has_function_privilege('anon', 'public.btp_signer_sur_place(text, text, text, text, boolean, text)', 'execute')
                 and has_function_privilege('anon', 'public.btp_lire_a_signer(text)', 'execute'), 'Le téléphone du chantier (anon) lit et signe par le jeton');
  return next ok(not has_function_privilege('anon', 'public.btp_preparer_signature(uuid, integer)', 'execute'), 'anon ne prépare pas de lien');
  return next ok(not has_table_privilege('anon', 'public.btp_signatures', 'select'), 'anon ne lit pas la table des signatures');
  return next throws_ok(format('select public.btp_preparer_signature(%L)', v_av), '23514', null, 'Un avenant en préparation ne se fait pas signer');

  v_dem := public.btp_soumettre_avenant(v_av);
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, decision, commentaire) values (v_dem, 'approuve', 'Signature (essai)');
  perform tests.endosser(v_collab, 'b6-signature-collab@banc-varelo.test');
  return next throws_ok(format('select public.btp_preparer_signature(%L)', v_av), '42501', null, 'Un collaborateur ne prépare pas de lien');

  -- ── Le gérant prépare le lien ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_r := public.btp_preparer_signature(v_av);
  v_jeton := v_r ->> 'jeton';
  return next ok(v_jeton ~ '^[0-9a-f]{64}$' and v_r ->> 'lien' = '/signer/' || v_jeton, 'Le lien porte un jeton de 64 caractères');
  return next ok(not exists (select 1 from public.btp_signatures s where s.jeton_empreinte = v_jeton) and exists (select 1 from public.btp_signatures s where s.avenant_id = v_av),
                 'La base garde l''empreinte du jeton, pas le jeton');

  -- ── Sur le téléphone, sans compte (rôle anon ; les résultats sont vérifiés une fois revenu admin) ──
  perform tests.redevenir_admin();
  execute 'set local role anon';
  v_s := public.btp_lire_a_signer(v_jeton);
  begin perform public.btp_lire_a_signer(repeat('0', 64)); v_etats := v_etats || 'aucune'; exception when others then v_etats := v_etats || sqlstate; end;
  begin perform public.btp_signer_sur_place(v_jeton, 'Paul Essai', null, v_trace, false); v_etats := v_etats || 'aucune'; exception when others then v_etats := v_etats || sqlstate; end;
  begin perform public.btp_signer_sur_place(v_jeton, 'Paul Essai', null, 'data:image/png;base64,abc', true); v_etats := v_etats || 'aucune'; exception when others then v_etats := v_etats || sqlstate; end;
  v_signe := public.btp_signer_sur_place(v_jeton, 'Paul Essai', 'Gérant de la SCI', v_trace, true, 'Mozilla/5.0 (essai)');
  begin perform public.btp_signer_sur_place(v_jeton, 'Paul Essai', null, v_trace, true); v_etats := v_etats || 'aucune'; exception when others then v_etats := v_etats || sqlstate; end;
  execute 'reset role';
  return next ok(v_s -> 'document' ->> 'total_ht' = '800.00' and v_s -> 'document' ->> 'maitre_ouvrage' = 'MO de la signature'
                 and jsonb_array_length(v_s -> 'document' -> 'lignes') = 1, 'Le client lit l''avenant : 800 € HT, une ligne, son nom');
  return next is(v_etats[1], 'P0002', 'Un faux jeton n''ouvre rien');
  return next is(v_etats[2], '22023', 'Sans « lu et approuvé » : refusé');
  return next is(v_etats[3], '22023', 'Sans tracé de signature : refusé');
  return next ok((v_signe ->> 'signee')::boolean, 'Le client signe');
  return next is(v_etats[4], 'P0002', 'Le lien ne sert qu''une fois');

  -- ── Ce qui reste ──
  return next is((select a.statut || '/' || a.signe_libelle from public.btp_avenants a where a.id = v_av), 'signe/Signé sur place par Paul Essai (Gérant de la SCI)',
                 'L''avenant est signé, « signé sur place par » le signataire');
  return next is((select d.statut from public.demandes_validation d where d.id = v_dem), 'executee', 'La demande du socle est exécutée');
  return next ok((select s.empreinte = encode(sha256(convert_to(s.document::text, 'UTF8')), 'hex') and s.preuve_empreinte ~ '^[0-9a-f]{64}$'
                         and s.trace_empreinte = encode(sha256(convert_to(v_trace, 'UTF8')), 'hex') and s.signee_le is not null and s.appareil = 'Mozilla/5.0 (essai)'
                  from public.btp_signatures s where s.avenant_id = v_av), 'La trace : empreinte du document, du tracé, de preuve, horodatage, appareil');
  return next ok(tests.b6_journal(v_client, 'daliro.avenant_signe', v_av::text) is not null, 'La signature est au journal');

  -- ── Un nouveau lien annule l'ancien ; un lien expiré n'ouvre plus ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_av2 := public.btp_ouvrir_avenant(v_ch, 'Seuil (signature)');
  perform public.btp_chiffrer_ligne_avenant(v_av2, 1, null, v_lot, 'Seuil aluminium (signature)', 'u', 120);
  v_dem2 := public.btp_soumettre_avenant(v_av2);
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, decision, commentaire) values (v_dem2, 'approuve', 'Signature 2 (essai)');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_jeton := public.btp_preparer_signature(v_av2) ->> 'jeton';
  v_jeton2 := public.btp_preparer_signature(v_av2, 24) ->> 'jeton';
  return next throws_ok(format('select public.btp_lire_a_signer(%L)', v_jeton), 'P0002', null, 'Un nouveau lien annule le précédent');
  perform tests.redevenir_admin();
  update public.btp_signatures set expire_le = now() - interval '1 second' where avenant_id = v_av2 and statut = 'ouverte';
  return next throws_ok(format('select public.btp_lire_a_signer(%L)', v_jeton2), 'P0002', null, 'Un lien expiré n''ouvre plus');
end $f$;

select * from runtests('tests'::name, '^test_b6_14_');
