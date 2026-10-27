-- CASHD — c2_38 : « Moyens de règlement : … », quel que soit le texte saisi (TCASHD-11).
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_38_moyens_reglement() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_fr uuid; v_en uuid;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, '{"moyens_reglement": "Virement IBAN FR76 3000 4000 0500 0012 3456 789, chèque à l''ordre de Négoce Banc."}');
  v_fr := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-MOY', 'nom', 'Moyens Fr', 'contact_facturation_email', 'compta@moy.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_fr, 'numero', 'FB-2026-2301', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  v_en := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-MOY-EN', 'nom', 'Means Ltd', 'langue', 'en', 'contact_facturation_email', 'ap@moy.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_en, 'numero', 'FB-2026-2302', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 300));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  return next ok((select tests.c2_plat(x.corps) like '%Moyens de règlement : Virement IBAN FR76 3000 4000 0500 0012 3456 789, chèque à l''ordre de Négoce Banc.%'
                         and x.corps not like '%Vous pouvez régler%'
                  from public.cashd_relances x where x.compte_id = v_fr and x.jour = j),
                 'En français : « Moyens de règlement : … », le texte saisi repris tel quel');
  -- depuis c2_57, les moyens usuels sont rendus dans la langue du texte
  return next ok((select tests.c2_plat(x.corps) like '%Payment methods: bank transfer (IBAN FR76 3000 4000 0500 0012 3456 789), cheque payable to Négoce Banc.%'
                         and x.corps not like '%You can pay%' and x.corps not like '%Virement%' from public.cashd_relances x where x.compte_id = v_en and x.jour = j),
                 'En anglais : « Payment methods: … », dans la langue du texte');
end $f$;
