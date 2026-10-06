-- b6_10 — DALIRO : l'encaissement des situations (session B6, 06/10/2026), b6_16.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_16.
-- runtests() annule tout.
--
-- Une situation validée de 1 200 € nets (1 000 HT + TVA 20 %, sans retenue) ; échéance à 30 jours ; paiements de
-- 500 puis 700 € ; retard simulé de 20 jours ; pénalités au taux de 12,15 % : 1 200 × 20 j × 0,1215 / 365 = 7,99 €.

create or replace function tests.test_b6_10_encaissement() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; v_collab uuid;
  v_mo uuid; v_ch uuid; v_lot uuid; v_m uuid; v_l uuid; v_s uuid; v_s2 uuid; v_dem uuid; v_e jsonb; v_j jsonb;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');
  v_collab := tests.b6_compte(v_client, 'collaborateur', 'b6-encaiss-collab@banc-varelo.test');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO de l''encaissement') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier de l''encaissement', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '01', 'Lot de l''encaissement', 'client') returning id into v_lot;
  v_m := public.btp_ecrire_marche(null, v_ch, jsonb_build_object('reference', 'ENC-1', 'mode_prix', 'forfait', 'montant_ht_declare', 1000, 'retenue_taux', 0));
  v_l := public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Travaux', 'unite_lue', 'forfait', 'nature', 'forfait', 'montant_ht', 1000, 'lot_id', v_lot));
  perform public.btp_verifier_marche(v_m);
  v_s := public.btp_ouvrir_situation(v_ch, current_date - 1);
  perform public.btp_avancer_situation((select l.id from public.btp_situations_lignes l where l.situation_id = v_s), 100);
  v_dem := public.btp_soumettre_situation(v_s);
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire) values (v_dem, v_client, v_daf, 'approuve', 'Encaissement (essai)');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.btp_valider_situation(v_s);

  -- ── L'échéance ──
  return next is((select s.net_a_payer || '/' || s.echeance from public.btp_situations s where s.id = v_s), '1200.00/' || (current_date + 30)::text,
                 'Validée : 1 200 € nets, échéance à 30 jours (délai par défaut)');
  return next throws_ok(format('select public.btp_fixer_echeance(%L, current_date + 61)', v_s), '23514', null, 'Une échéance au-delà de 60 jours est refusée (L441-10)');
  v_e := public.btp_fixer_echeance(v_s, current_date + 45);
  return next is(v_e ->> 'echeance', (current_date + 45)::text, 'L''échéance se fixe à 45 jours');
  return next is(v_e ->> 'etat', 'a_echoir', 'Rien de reçu, échéance future : « à échoir »');

  -- ── Les paiements ──
  return next ok(not has_function_privilege('anon', 'public.btp_noter_paiement(uuid, numeric, date, text)', 'execute'), 'anon ne note pas de paiement');
  return next ok(not has_table_privilege('authenticated', 'public.btp_situations_paiements', 'insert'), 'Les paiements ne s''écrivent que par la porte');
  perform tests.endosser(v_collab, 'b6-encaiss-collab@banc-varelo.test');
  return next throws_ok(format('select public.btp_noter_paiement(%L, 100)', v_s), '42501', null, 'Un collaborateur ne note pas de paiement');
  return next is((select count(*)::int from public.btp_situations_paiements p where p.situation_id = v_s), 0, 'Collaborateur sans voit_prix : aucun paiement lisible');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.btp_noter_paiement(%L, 0)', v_s), '22023', null, 'Un montant nul est refusé');
  return next throws_ok(format('select public.btp_noter_paiement(%L, 100, current_date + 1)', v_s), '22023', null, 'Un paiement daté du futur est refusé');
  v_e := public.btp_noter_paiement(v_s, 500, current_date, 'VIR SCI 0001');
  return next is(v_e ->> 'etat' || '/' || (v_e ->> 'encaisse')::numeric || '/' || (v_e ->> 'reste_du')::numeric, 'partielle/500.00/700.00', 'Paiement de 500 € : partielle, reste 700 €');
  return next throws_ok(format('select public.btp_noter_paiement(%L, 800)', v_s), '23514', null, 'Un paiement au-delà du reste dû est refusé');
  v_s2 := public.btp_ouvrir_situation(v_ch, current_date);
  return next throws_ok(format('select public.btp_noter_paiement(%L, 10)', v_s2), '23514', null, 'Pas de paiement sur une situation non validée');
  perform public.btp_annuler_situation(v_s2, 'Essai');

  -- ── Le retard (simulé : la situation date de 50 jours, échue depuis 20) ──
  perform tests.redevenir_admin();
  update public.btp_situations set validee_le = now() - interval '50 days', echeance = current_date - 20, penalites_taux = 0.1215 where id = v_s;
  update public.btp_situations_paiements set recu_le = current_date where situation_id = v_s;
  v_e := private.btp_encaissement(v_s, current_date);
  return next is(v_e ->> 'etat' || '/' || (v_e ->> 'retard_jours') || '/' || (v_e ->> 'indemnite_forfaitaire'), 'en_retard/20/40',
                 'En retard de 20 jours : l''indemnité forfaitaire de 40 € est due');
  return next ok(exists (select 1 from jsonb_array_elements(private.btp_point_matin_lignes(v_client, current_date)) x
                         where x ->> 'texte' like 'Chantier de l''encaissement : situation n° 1 impayée depuis 20 jours, reste dû 700,00 €%relancez'),
                 'Le point du matin dit de relancer');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_e := public.btp_noter_paiement(v_s, 700);
  return next is(v_e ->> 'etat' || '/' || (v_e ->> 'reste_du')::numeric, 'payee/0.00', 'Le solde reçu : payée');
  return next is((v_e ->> 'penalites')::numeric, 7.99::numeric, 'Pénalités de retard : 1 200 € × 20 jours × 12,15 % / 365 = 7,99 €');
  return next is((v_e ->> 'indemnite_forfaitaire')::int, 40, 'Payée en retard : l''indemnité de 40 € reste due');
  v_j := public.btp_tableau_chantier(v_ch);
  return next is((select (x ->> 'encaisse')::numeric || '/' || jsonb_array_length(x -> 'paiements') from jsonb_array_elements(v_j -> 'situations') x where x ->> 'id' = v_s::text),
                 '1200.00/2', 'Le tableau du chantier porte l''encaissé et les deux paiements');
  perform tests.redevenir_admin();
  return next ok(tests.b6_journal(v_client, 'daliro.situation_payee', v_s::text) is not null, 'Le paiement complet est au journal');
end $f$;

select * from runtests('tests'::name, '^test_b6_10_');
