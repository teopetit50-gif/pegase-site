-- CASHD — c2_16 : le taux de change le plus récent l'emporte ; le même jour, celui de l'organisation.
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_16_taux_recent() returns setof text
language plpgsql as $f$
declare banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_compte uuid;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_compte := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-CHF16', 'nom', 'Menuiserie Genève SA', 'devise', 'CHF',
                'contact_facturation_email', 'compta@geneve.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_compte, 'numero', 'F-2026-810', 'date_emission', j - 30,
             'echeance', j, 'montant_ttc', 5000, 'devise', 'CHF'));
  -- Un taux saisi il y a quarante jours par l'organisation.
  perform public.cashd_poser_taux('CHF', j - 40, 1.20, v_client);
  perform tests.redevenir_admin();
  return next is((select e.taux_eur from public.cashd_factures_etat e where e.numero = 'F-2026-810' and e.client_id = v_client), 1.20::numeric,
                 'Seul taux connu : celui saisi par l''organisation');

  -- La BCE publie un taux plus récent : il l'emporte.
  perform private.cashd_taux_bce_ranger(format(E'KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE\nEXR.D.CHF.EUR.SP00.A,D,CHF,EUR,SP00,A,%s,0.9400\n', j - 1));
  return next is((select e.taux_eur from public.cashd_factures_etat e where e.numero = 'F-2026-810' and e.client_id = v_client), round(1 / 0.94, 8),
                 'Un taux BCE plus récent l''emporte sur une saisie ancienne');
  return next ok((select x ->> 'source' = 'bce' from jsonb_array_elements(public.cashd_taux_connus(v_client)) x where x ->> 'devise' = 'CHF'),
                 'cashd_taux_connus dit la même chose');

  -- Le même jour, la saisie de l'organisation corrige la BCE.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_poser_taux('CHF', j - 1, 1.05, v_client);
  perform tests.redevenir_admin();
  return next is((select e.taux_eur from public.cashd_factures_etat e where e.numero = 'F-2026-810' and e.client_id = v_client), 1.05::numeric,
                 'Le même jour, le taux saisi par l''organisation l''emporte sur la BCE');
  return next is((select e.reste_du_eur from public.cashd_factures_etat e where e.numero = 'F-2026-810' and e.client_id = v_client), 5250.00::numeric,
                 'Le reste dû en euros suit : 5 000 CHF × 1,05');
  -- Un taux daté de demain ne compte pas encore.
  perform private.cashd_taux_bce_ranger(format(E'KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE\nEXR.D.CHF.EUR.SP00.A,D,CHF,EUR,SP00,A,%s,0.5000\n', j + 1));
  return next is((select e.taux_eur from public.cashd_factures_etat e where e.numero = 'F-2026-810' and e.client_id = v_client), 1.05::numeric,
                 'Un taux daté de demain n''est pas encore pris');
end $f$;
