-- CASHD — c2_30 : le ton du rappel suit l'ancienneté du retard ; paliers 15 et 45 jours par défaut, réglables (TCASHD-08a).
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_30_ton_anciennete() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_8 uuid; v_30 uuid; v_60 uuid; v_r8 text; v_r30 text; v_r60 text;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_8 := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-T08', 'nom', 'Huit Jours', 'contact_facturation_email', 'compta@t08.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_8, 'numero', 'FB-2026-1508', 'date_emission', j - 38, 'echeance', j - 8, 'montant_ttc', 1085));
  v_30 := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-T30', 'nom', 'Trente Jours', 'contact_facturation_email', 'compta@t30.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_30, 'numero', 'FB-2026-1530', 'date_emission', j - 60, 'echeance', j - 30, 'montant_ttc', 1085));
  v_60 := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-T60', 'nom', 'Soixante Jours', 'contact_facturation_email', 'compta@t60.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_60, 'numero', 'FB-2026-1560', 'date_emission', j - 90, 'echeance', j - 60, 'montant_ttc', 1085));
  return next throws_ok(format('select public.cashd_regler_relances(%L, %L)', v_client, '{"ton_retard_jours": 50, "ton_retard_important_jours": 40}'), '22023', null,
                        'Les paliers du ton vont dans l''ordre');
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  select tests.c2_plat(x.corps) into v_r8 from public.cashd_relances x where x.compte_id = v_8 and x.jour = j;
  select tests.c2_plat(x.corps) into v_r30 from public.cashd_relances x where x.compte_id = v_30 and x.jour = j;
  select tests.c2_plat(x.corps) into v_r60 from public.cashd_relances x where x.compte_id = v_60 and x.jour = j;
  return next ok(v_r8 like '%simple oubli%', '8 jours de retard : « simple oubli »');
  return next ok(v_r30 like '%Ce retard dure maintenant depuis 30 jours.%' and v_r30 not like '%simple oubli%', '30 jours : « ce retard dure maintenant depuis 30 jours »');
  return next ok(v_r60 like '%Ce retard de 60 jours devient important : merci de nous indiquer dès à présent la date de règlement prévue.%',
                 '60 jours : « ce retard devient important », et la date de règlement demandée');
  return next ok(v_r8 <> replace(v_r30, 'FB-2026-1530', 'FB-2026-1508'), 'Les corps ne sont plus identiques d''un retard à l''autre');

  -- Réglés par l'organisation, les paliers remplacent les défauts.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_relances(v_client, '{"ton_retard_jours": 5, "ton_retard_important_jours": 25}');
  perform tests.redevenir_admin();
  return next ok(tests.c2_plat(private.cashd_ecrire_texte((select x.id from public.cashd_relances x where x.compte_id = v_8 and x.jour = j)) ->> 'corps')
                   like '%Ce retard dure maintenant depuis 8 jours.%'
                 and tests.c2_plat(private.cashd_ecrire_texte((select x.id from public.cashd_relances x where x.compte_id = v_30 and x.jour = j)) ->> 'corps')
                   like '%Ce retard de 30 jours devient important%',
                 'Réglés à 5 et 25 jours, les paliers de l''organisation s''appliquent');
end $f$;
