-- CASHD — c2_37 : une relance notée envoyée à la main a le statut « envoyee » (TCASHD-17).
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée. Utilise tests.c2_approuver (c2_11).

create or replace function tests.test_c2_37_statut_envoyee() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; j date := tests.c2_jour(); v_c uuid; r public.cashd_relances;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_c := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-C19S', 'nom', 'Statut Envoyée', 'contact_facturation_email', 'compta@c19s.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_c, 'numero', 'FB-2026-2219', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  select * into r from public.cashd_relances x where x.compte_id = v_c and x.jour = j;
  perform tests.c2_approuver(r.demande_id, v_client, v_daf, 'daf@banc-varelo.test');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_noter_envoi_main(r.id, 'courrier');
  return next is((select x.statut from public.cashd_relances x where x.id = r.id), 'envoyee', 'Notée envoyée à la main : son statut est « envoyee »');
  return next is((select x.etat from public.cashd_relances_etat x where x.id = r.id), 'envoyee', 'Son état aussi');
  return next throws_ok(format('select public.cashd_noter_envoi_main(%L, %L)', r.id, 'email'), '23505', null, 'Un envoi ne se note toujours qu''une fois');
  perform tests.redevenir_admin();
end $f$;
