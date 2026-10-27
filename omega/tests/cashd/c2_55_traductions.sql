-- CASHD — c2_55 : une relance dans une autre langue ne mélange plus le français : moyens de règlement, formule et
-- signature traduits par l'organisation, sinon signalés (TNUIT-06). Sur le banc (client cccccccc-…-0c), transaction annulée.

create or replace function tests.test_c2_55_traductions() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_a uuid; v_b uuid; v_fr uuid; v_t text;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, jsonb_build_object('moyens_reglement', 'Virement IBAN FR76 3000 4000 0500 0012 3456 789 ou chèque à l''ordre de l''Atelier',
                                                                     'signature', 'Service comptabilité', 'formule', 'Bien cordialement,'));
  v_a := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-TR-A', 'nom', 'Traducción Pendiente', 'langue', 'es', 'contact_facturation_email', 'a@tr.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_a, 'numero', 'FB-2026-3901', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 400));
  v_fr := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-TR-FR', 'nom', 'Compte Français', 'contact_facturation_email', 'fr@tr.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_fr, 'numero', 'FB-2026-3902', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 400));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);

  -- Sans traduction : ni formule ni signature françaises ; les moyens de règlement (l'IBAN) restent, et l'organisation est prévenue.
  select tests.c2_plat(x.corps) into v_t from public.cashd_relances x where x.compte_id = v_a and x.jour = j;
  return next ok(v_t like '%Atentamente,%' and v_t not like '%Bien cordialement%' and v_t not like '%Service comptabilité%',
                 'Sans traduction, la formule et la signature françaises ne passent pas dans le texte espagnol');
  -- depuis c2_57, les moyens usuels sont rendus par CASHD ; la formule et la signature, non traduites, sont signalées
  return next ok(v_t like '%Formas de pago: transferencia bancaria (IBAN FR76 3000 4000 0500 0012 3456 789) o cheque a nombre de l''Atelier.%'
                 and exists (select 1 from public.alertes a where a.client_id = v_client and a.titre like '%espagnol%votre formule, votre signature%qu''en français%'
                               and a.titre not like '%moyens%'),
                 'Les moyens usuels sont rendus en espagnol ; l''organisation est prévenue que sa formule et sa signature n''existent qu''en français');

  -- Traduits par l'organisation : plus un mot de français.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.cashd_regler_traduction(%L, %L, %L)', v_client, 'espagnol', '{}'), '22023', null, 'Une langue se donne par son code');
  return next throws_ok(format('select public.cashd_regler_traduction(%L, %L, %L)', v_client, 'es', '{"couleur":"x"}'), '22023', null, 'Seuls les moyens de règlement, la formule et la signature se traduisent');
  perform public.cashd_regler_traduction(v_client, 'es-ES', jsonb_build_object('moyens_reglement', 'transferencia IBAN FR76 3000 4000 0500 0012 3456 789 o cheque a nombre del Atelier',
                                                                              'formule', 'Un cordial saludo,', 'signature', 'Departamento de contabilidad'));
  v_b := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-TR-B', 'nom', 'Traducción Hecha', 'langue', 'es', 'contact_facturation_email', 'b@tr.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_b, 'numero', 'FB-2026-3903', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 400));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  select tests.c2_plat(x.corps) into v_t from public.cashd_relances x where x.compte_id = v_b and x.jour = j;
  return next ok(v_t like '%Formas de pago: transferencia IBAN FR76%' and v_t like '%Un cordial saludo,%' and v_t like '%Departamento de contabilidad%'
                 and v_t !~ '(Virement|chèque|Service comptabilité|Bien cordialement)',
                 'Traduits, les moyens de règlement, la formule et la signature passent en espagnol ; plus un mot de français');

  -- Le français ne change pas.
  select tests.c2_plat(x.corps) into v_t from public.cashd_relances x where x.compte_id = v_fr and x.jour = j;
  return next ok(v_t like '%Moyens de règlement : Virement IBAN FR76%' and v_t like '%Bien cordialement,%' and v_t like '%Service comptabilité%',
                 'Un compte français garde les textes français de l''organisation');
end $f$;
