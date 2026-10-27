-- CASHD — c2_47 : une relance revue (c2_42) ou reprise (c2_41) reçoit un envoi adossé à sa NOUVELLE demande.
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c, envoi CASHD réglé en essai), transaction annulée.

create or replace function tests.test_c2_47_envoi_readosse() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; j date := tests.c2_jour(); v_a uuid; v_b uuid;
  ra public.cashd_relances; rb public.cashd_relances; x public.cashd_relances;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  if private.reglages_envois_effectifs(v_client, 'cashd') ->> 'mode' is null then
    return next ok(true, 'Envoi CASHD non réglé sur ce banc : adossement non vérifiable ici');
    return;
  end if;
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_a := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-ADO-A', 'nom', 'Adossement Revue', 'contact_facturation_email', 'compta@adoa.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_a, 'numero', 'FB-2026-3101', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  v_b := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-ADO-B', 'nom', 'Adossement Reprise', 'contact_facturation_email', 'compta@adob.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_b, 'numero', 'FB-2026-3102', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  select * into ra from public.cashd_relances r where r.compte_id = v_a and r.jour = j;
  select * into rb from public.cashd_relances r where r.compte_id = v_b and r.jour = j;
  return next ok(ra.envoi_id is not null and (select e.demande_id = ra.demande_id from public.envois e where e.id = ra.envoi_id),
                 'À la préparation, le message est adossé à la demande');

  -- Revue (c2_42) : 500 € réglés.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_noter_reglement(v_client, v_a, 500, j, 'VIR FB-2026-3101', 'virement');
  perform tests.redevenir_admin();
  select * into x from public.cashd_relances r where r.id = ra.id;
  return next ok(x.envoi_id is not null and x.envoi_id <> ra.envoi_id
                 and (select e.demande_id = x.demande_id and tests.c2_plat(e.corps) like '%585,00 €%' from public.envois e where e.id = x.envoi_id),
                 'Revue, la relance a un nouveau message, adossé à la nouvelle demande, au reste dû');

  -- Reprise (c2_41) : refusée, réglée de 500 €, puis le passage des reprises.
  if to_regclass('private.reprises') is not null and to_regclass('public.approbations') is not null then
    perform tests.endosser(v_daf, 'daf@banc-varelo.test');
    insert into public.approbations (demande_id, client_id, user_id, decision, commentaire) values (rb.demande_id, v_client, v_daf, 'rejete', 'Le client a payé une partie');
    perform tests.redevenir_admin();
    perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
    perform public.cashd_noter_reglement(v_client, v_b, 500, j, 'VIR FB-2026-3102', 'virement');
    perform tests.redevenir_admin();
    perform private.cashd_traiter_reprises();
    select * into x from public.cashd_relances r where r.id = rb.id;
    return next ok(x.demande_id <> rb.demande_id and x.envoi_id is not null and x.envoi_id <> rb.envoi_id
                   and (select e.demande_id = x.demande_id from public.envois e where e.id = x.envoi_id),
                   'Reprise, la relance a un nouveau message, adossé à la demande de reprise');
  else
    return next ok(true, 'Lot socle 19az absent du banc : reprise non vérifiable ici');
  end if;
end $f$;
