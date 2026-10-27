-- CASHD — c2_45 : un règlement de 0 € est refusé avec un message clair et juste (TMOD-05).
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_45_reglement_nul() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_c uuid;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_c := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-ZERO', 'nom', 'Règlement Nul', 'contact_facturation_email', 'compta@zero.test'));
  return next throws_ok(format('select public.cashd_noter_reglement(%L, %L, 0, %L, %L, %L)', v_client, v_c, j, 'VIR-ZERO', 'virement'),
                        '22023', 'Un règlement de 0 € ou moins ne se note pas : le montant reçu doit être supérieur à 0 €.',
                        'Un règlement de 0 € est refusé, et le message dit ce qu''il faut');
  return next throws_ok(format('select public.cashd_noter_reglement(%L, %L, -10, %L, %L, %L)', v_client, v_c, j, 'VIR-NEG', 'virement'),
                        '22023', 'Un règlement de 0 € ou moins ne se note pas : le montant reçu doit être supérieur à 0 €.',
                        'Un montant négatif aussi');
  return next ok(not exists (select 1 from public.cashd_reglements r where r.compte_id = v_c), 'Rien n''est noté');
  perform tests.redevenir_admin();
end $f$;
