-- CASHD — c2_33 : le ton suit le montant (1 500 € par défaut, le seuil de l'organisation l'emporte) ; le reste après un
-- règlement partiel est dit (TCASHD-08b). Sur le banc (client cccccccc-…-0c), dans une transaction annulée.

create or replace function tests.test_c2_33_ton_montant() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_gros uuid; v_petit uuid; v_reste uuid; v_r uuid;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, '{"seuil_ton": null}');
  v_gros := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-C12T', 'nom', 'Deux Factures', 'contact_facturation_email', 'compta@c12t.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_gros, 'numero', 'FB-2026-1812', 'date_emission', j - 38, 'echeance', j - 8, 'montant_ttc', 1085));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_gros, 'numero', 'FB-2026-1813', 'date_emission', j - 38, 'echeance', j - 8, 'montant_ttc', 542.5));
  v_petit := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-C00T', 'nom', 'Une Facture', 'contact_facturation_email', 'compta@c00t.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_petit, 'numero', 'FB-2026-1800', 'date_emission', j - 38, 'echeance', j - 8, 'montant_ttc', 1085));
  v_reste := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-C11T', 'nom', 'Trois Euros', 'contact_facturation_email', 'compta@c11t.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_reste, 'numero', 'FB-2026-1811', 'date_emission', j - 38, 'echeance', j - 8, 'montant_ttc', 1085));
  perform public.cashd_noter_reglement(v_client, v_reste, 1082, j - 6, 'CHQ FB-2026-1811', 'cheque');
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);

  return next ok((select tests.c2_plat(x.corps) like '%Compte tenu du montant en jeu%' from public.cashd_relances x where x.compte_id = v_gros and x.jour = j),
                 'Sans seuil posé : 1 627,50 €, au-delà de 1 500 € par défaut, le message demande la date de règlement');
  return next ok((select tests.c2_plat(x.corps) not like '%Compte tenu du montant%' from public.cashd_relances x where x.compte_id = v_petit and x.jour = j),
                 '1 085 €, sous le défaut : pas de demande de date');
  return next ok((select tests.c2_plat(x.corps) like '%(il reste 3,00 € après votre règlement du %' from public.cashd_relances x where x.compte_id = v_reste and x.jour = j),
                 'Un reste de 3 € après un règlement partiel est dit comme tel');

  -- Le seuil de l'organisation efface le défaut.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, '{"seuil_ton": 1000}');
  perform tests.redevenir_admin();
  select x.id into v_r from public.cashd_relances x where x.compte_id = v_petit and x.jour = j;
  return next ok(tests.c2_plat(private.cashd_ecrire_texte(v_r) ->> 'corps') like '%Compte tenu du montant en jeu%',
                 'Seuil posé à 1 000 € : 1 085 € fait demander la date');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, '{"seuil_ton": 5000}');
  perform tests.redevenir_admin();
  select x.id into v_r from public.cashd_relances x where x.compte_id = v_gros and x.jour = j;
  return next ok(tests.c2_plat(private.cashd_ecrire_texte(v_r) ->> 'corps') not like '%Compte tenu du montant%',
                 'Seuil posé à 5 000 € : le défaut de 1 500 € ne joue plus');
end $f$;
