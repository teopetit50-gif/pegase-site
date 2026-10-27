-- CASHD — c2_57 : les moyens de règlement existent dans chaque langue prise en charge ; ce qui reste non traduit est
-- signalé avant l'envoi, dans la file de validation (fin de TNUIT-06). Sur le banc (client cccccccc-…-0c), transaction annulée.

create or replace function tests.test_c2_57_moyens_langues() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_es uuid; v_pt uuid; v_fr uuid; v_es2 uuid; r public.cashd_relances; d public.demandes_validation; v_t text;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, jsonb_build_object('moyens_reglement', 'Virement IBAN FR76 3000 4000 0500 0012 3456 789 ou chèque à l''ordre de l''Atelier Bertin'));
  v_es := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-MO-ES', 'nom', 'Pago Español', 'langue', 'es', 'contact_facturation_email', 'es@mo.test'));
  v_pt := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-MO-PT', 'nom', 'Pagamento Português', 'langue', 'pt', 'contact_facturation_email', 'pt@mo.test'));
  v_fr := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-MO-FR', 'nom', 'Paiement Français', 'contact_facturation_email', 'fr@mo.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_es, 'numero', 'FB-2026-4101', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 400));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_pt, 'numero', 'FB-2026-4102', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 400));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_fr, 'numero', 'FB-2026-4103', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 400));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);

  -- Les moyens de règlement usuels sont rendus dans la langue du texte, sans traduction écrite par l'organisation.
  select * into r from public.cashd_relances x where x.compte_id = v_es and x.jour = j;
  v_t := tests.c2_plat(r.corps);
  return next ok(v_t like '%Formas de pago: transferencia bancaria (IBAN FR76 3000 4000 0500 0012 3456 789) o cheque a nombre de l''Atelier Bertin.%'
                 and v_t !~ '(Virement|chèque|à l''ordre)', 'En espagnol : transferencia bancaria (IBAN …) o cheque a nombre de …');
  select * into r from public.cashd_relances x where x.compte_id = v_pt and x.jour = j;
  v_t := tests.c2_plat(r.corps);
  return next ok(v_t like '%Payment methods: bank transfer (IBAN FR76 3000 4000 0500 0012 3456 789) or cheque payable to l''Atelier Bertin.%'
                 and v_t !~ '(Virement|chèque|à l''ordre)', 'En anglais : bank transfer (IBAN …) or cheque payable to …');
  select * into d from public.demandes_validation x where x.id = r.demande_id;
  return next ok(coalesce(jsonb_array_length(d.payload -> 'avertissements'), 0) = 0 and d.resume not like '%À relire%', 'Tout est traduit : rien à signaler au valideur');
  select * into r from public.cashd_relances x where x.compte_id = v_fr and x.jour = j;
  return next ok(tests.c2_plat(r.corps) like '%Moyens de règlement : Virement IBAN FR76 3000 4000 0500 0012 3456 789 ou chèque à l''ordre de l''Atelier Bertin.%',
                 'En français, le texte de l''organisation, tel quel');

  -- Une phrase que CASHD ne sait pas rendre : elle part en français, mais le valideur le voit avant l'envoi.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, jsonb_build_object('moyens_reglement', 'Règlement au siège social le mardi matin'));
  v_es2 := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-MO-ES2', 'nom', 'Pago Raro', 'langue', 'es', 'contact_facturation_email', 'es2@mo.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_es2, 'numero', 'FB-2026-4104', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 400));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  select * into r from public.cashd_relances x where x.compte_id = v_es2 and x.jour = j;
  select * into d from public.demandes_validation x where x.id = r.demande_id;
  return next ok(tests.c2_plat(r.corps) like '%Formas de pago: Règlement au siège social le mardi matin.%', 'La phrase inconnue part telle quelle, en français');
  return next ok(d.statut = 'en_attente' and d.resume like '%À relire%' and jsonb_array_length(d.payload -> 'avertissements') = 1
                 and d.payload #>> '{avertissements,0}' like '%moyens de règlement%en français%espagnol%',
                 'La demande de validation le dit avant l''envoi : « À relire », avec l''avertissement');
  return next ok(r.motif like 'à relire avant l''envoi : %', 'La relance le dit aussi');
end $f$;
