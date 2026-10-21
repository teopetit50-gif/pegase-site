-- CASHD — c2_23 : un client rejoué à l'identique est « inchangé », un client qui change est « modifié » (TCASHD-01).
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_23_clients_inchanges() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_lot jsonb; v_r jsonb;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_lot := jsonb_build_array(
    jsonb_build_object('code', 'C-REJ-1', 'nom', 'BTP Témoin', 'pays', 'FR', 'delai_paiement', 30, 'email', 'compta@rej1.test', 'plafond', 5000),
    jsonb_build_object('code', 'C-REJ-2', 'nom', 'Couverture Sans Adresse', 'pays', 'FR', 'delai_paiement', 30));
  v_r := public.cashd_importer(v_client, 'clients', v_lot);
  return next ok((v_r ->> 'creees')::int = 2, 'Premier import : deux comptes créés');
  v_r := public.cashd_importer(v_client, 'clients', v_lot);
  return next ok((v_r ->> 'creees')::int = 0 and (v_r ->> 'modifiees')::int = 0 and (v_r ->> 'inchangees')::int = 2,
                 'Rejoué à l''identique : deux inchangés, aucun modifié');
  v_r := public.cashd_importer(v_client, 'clients', jsonb_set(v_lot, '{0,email}', '"tresorerie@rej1.test"'));
  return next ok((v_r ->> 'modifiees')::int = 1 and (v_r ->> 'inchangees')::int = 1
                 and (select x.contact_facturation_email from public.cashd_comptes x where x.client_id = v_client and x.reference = 'C-REJ-1') = 'tresorerie@rej1.test',
                 'Une adresse qui change : un modifié, écrit ; l''autre inchangé');
  perform tests.redevenir_admin();
end $f$;
