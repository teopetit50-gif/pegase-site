-- CASHD — c2_40 : l'adresse de paiement de l'organisation, dans la relance (C:84).
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_40_lien_paiement() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_c uuid; v_corps text;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.cashd_regler_relances(%L, %L)', v_client, '{"lien_paiement": "http://paie.exemple.test/{numero}"}'), '22023', null,
                        'Une adresse de paiement est en https');
  perform public.cashd_regler_relances(v_client, '{"lien_paiement": "https://paie.banc.test/regler?facture={numero}&montant={montant}"}');
  v_c := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-LIEN', 'nom', 'Lien De Paiement', 'contact_facturation_email', 'compta@lien.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_c, 'numero', 'FB 2026/2501', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085.5));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  select x.corps into v_corps from public.cashd_relances x where x.compte_id = v_c and x.jour = j;
  return next ok(v_corps like '%Régler en ligne : https://paie.banc.test/regler?facture=FB%202026%2F2501&montant=1085.50%',
                 'La relance porte l''adresse de paiement, numéro (encodé) et reste dû remplacés');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, '{"lien_paiement": null}');
  perform tests.redevenir_admin();
  return next ok((private.cashd_ecrire_texte((select x.id from public.cashd_relances x where x.compte_id = v_c and x.jour = j)) ->> 'corps') not like '%Régler en ligne%',
                 'Sans adresse réglée, pas de lien');
end $f$;
