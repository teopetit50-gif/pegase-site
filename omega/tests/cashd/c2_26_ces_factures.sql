-- CASHD — c2_26 : « ces factures » quand le message en porte plusieurs (TCASHD-10c).
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_26_ces_factures() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_deux uuid; v_une uuid; v_en uuid;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_deux := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-PLU-2', 'nom', 'Génie Civil Deux Factures', 'contact_facturation_email', 'compta@plu2.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_deux, 'numero', 'FB-2026-1012', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_deux, 'numero', 'FB-2026-1013', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 542.5));
  v_une := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-PLU-1', 'nom', 'Témoin Une Facture', 'contact_facturation_email', 'compta@plu1.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_une, 'numero', 'FB-2026-1011', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  v_en := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-PLU-EN', 'nom', 'Two Invoices Ltd', 'langue', 'en', 'contact_facturation_email', 'ap@two.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_en, 'numero', 'FB-2026-1014', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 300));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_en, 'numero', 'FB-2026-1015', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 400));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);

  return next ok((select tests.c2_plat(x.corps) like '%Pour toute question sur ces factures,%' and x.corps not like '%cette facture%'
                  from public.cashd_relances x where x.compte_id = v_deux and x.jour = j),
                 'Deux factures : « ces factures »');
  return next ok((select tests.c2_plat(x.corps) like '%Pour toute question sur cette facture,%' from public.cashd_relances x where x.compte_id = v_une and x.jour = j),
                 'Une facture : « cette facture »');
  return next ok((select x.corps like '%any question about these invoices,%' from public.cashd_relances x where x.compte_id = v_en and x.jour = j),
                 'En anglais : « these invoices »');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next lives_ok(format('select public.cashd_ecrire_gabarit(%L, %L, %L, 1, %L, %L)', v_client, 'rappel', 'fr', 'Rappel {objet}',
                              'Bonjour, voici {cette_facture} : {lignes}'),
                       'La variable {cette_facture} est offerte aux textes de l''organisation');
  perform tests.redevenir_admin();
end $f$;
