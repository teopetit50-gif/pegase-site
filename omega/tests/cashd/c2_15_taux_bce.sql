-- CASHD — c2_15 : les taux de la BCE, demandés chaque jour ouvré et rangés (G17). Aucune requête réelle ici : la réponse
-- de la BCE est simulée (net._http_response quand pg_net est là). Sur le banc (client cccccccc-…-0c), transaction annulée.

create or replace function tests.test_c2_15_taux_bce() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_compte uuid; v_f uuid; v_n integer; v_dem bigint;
  v_csv text := E'KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE,OBS_STATUS\r\n'
             || E'EXR.D.USD.EUR.SP00.A,D,USD,EUR,SP00,A,2026-10-16,1.0876,A\r\n'
             || E'EXR.D.GBP.EUR.SP00.A,D,GBP,EUR,SP00,A,2026-10-16,0.8412,A\r\n'
             || E'EXR.D.XXX.EUR.SP00.A,D,XXX,EUR,SP00,A,2026-10-16,NaN,A\r\n';
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);

  -- ── Lire la réponse ──
  return next is((select count(*)::int from private.cashd_taux_bce_lire_csv(v_csv)), 2, 'Le CSV de la BCE se lit par ses colonnes ; une valeur illisible est écartée');
  return next is((select x.valeur from private.cashd_taux_bce_lire_csv(v_csv) x where x.devise = 'USD'), 1.0876::numeric, '1 euro = 1,0876 dollar');
  return next throws_ok($q$select * from private.cashd_taux_bce_lire_csv(E'A,B\n1,2')$q$, '22023', null, 'Une réponse sans les colonnes attendues est refusée');
  return next ok(private.cashd_taux_bce_adresse(array['GBP', 'USD']) = 'https://data-api.ecb.europa.eu/service/data/EXR/D.GBP+USD.EUR.SP00.A?lastNObservations=1&format=csvdata',
                 'La demande vise l''API publique de la BCE, les devises des factures, la dernière observation');

  -- ── Ranger les taux ──
  v_n := private.cashd_taux_bce_ranger(v_csv);
  return next ok(v_n = 2 and (select t.taux = round(1 / 1.0876, 8) and t.source = 'bce' and t.client_id is null from public.cashd_taux_change t
                              where t.devise = 'USD' and t.jour = date '2026-10-16' and t.client_id is null),
                 'Rangés pour toutes les organisations : 1 dollar = 1 / 1,0876 euro, source BCE');
  perform private.cashd_taux_bce_ranger(replace(v_csv, '1.0876', '1.1000'));
  return next is((select t.taux from public.cashd_taux_change t where t.devise = 'USD' and t.jour = date '2026-10-16' and t.client_id is null),
                 round(1 / 1.1, 8)::numeric(18,8), 'Une nouvelle réponse du même jour remplace le taux BCE');

  -- ── Une facture en dollars est suivie en euros ; le taux saisi par l'organisation garde la priorité ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_compte := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-USD15', 'nom', 'Boston Millwork Inc.', 'langue', 'en', 'devise', 'USD',
                'contact_facturation_email', 'ap@bostonmillwork.test'));
  v_f := public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_compte, 'numero', 'F-2026-710', 'date_emission', date '2026-10-01',
            'echeance', date '2026-10-31', 'montant_ttc', 11000, 'devise', 'USD'));
  perform tests.redevenir_admin();
  return next ok((select e.taux_eur = round(1 / 1.1, 8) and e.montant_ttc_eur = round(11000 * round(1 / 1.1, 8), 2) from public.cashd_factures_etat e where e.numero = 'F-2026-710' and e.client_id = v_client),
                 'La facture en dollars prend le taux BCE');
  return next ok((select x ->> 'source' = 'bce' from jsonb_array_elements(public.cashd_taux_connus(v_client)) x where x ->> 'devise' = 'USD'),
                 'cashd_taux_connus montre le taux BCE');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_poser_taux('USD', date '2026-10-16', 0.95, v_client);
  perform tests.redevenir_admin();
  perform private.cashd_taux_bce_ranger(v_csv);
  return next ok((select e.taux_eur = 0.95 from public.cashd_factures_etat e where e.numero = 'F-2026-710' and e.client_id = v_client)
                 and (select t.source from public.cashd_taux_change t where t.devise = 'USD' and t.jour = date '2026-10-16' and t.client_id = v_client) = 'saisie',
                 'Le taux saisi par l''organisation garde la priorité, la BCE ne l''écrase pas');

  -- ── La réponse asynchrone (pg_net) ──
  if to_regclass('net._http_response') is not null then
    insert into public.cashd_taux_demandes (demande_id, devises, demandee_le) values (-915015, array['GBP', 'USD'], now()) returning id into v_dem;
    execute 'insert into net._http_response (id, status_code, content_type, headers, content, timed_out, error_msg, created)
             values ($1, 200, ''text/csv'', ''{}''::jsonb, $2, false, null, now())' using -915015::bigint, replace(v_csv, '2026-10-16', '2026-10-17');
    v_n := private.cashd_taux_bce_lire();
    return next ok((select d.recue_le is not null and d.taux_ranges = 2 and d.erreur is null from public.cashd_taux_demandes d where d.id = v_dem)
                   and exists (select 1 from public.cashd_taux_change t where t.devise = 'GBP' and t.jour = date '2026-10-17' and t.source = 'bce'),
                   'La réponse arrivée est lue et rangée ; la demande est close');
  else
    return next ok(true, 'pg_net absent du banc local : réponse asynchrone non simulée');
  end if;
  return next ok(not has_function_privilege('authenticated', 'private.cashd_taux_bce_demander(timestamptz)', 'execute')
                 and not has_table_privilege('authenticated', 'public.cashd_taux_demandes', 'select'),
                 'Le chargement reste au serveur');
end $f$;
