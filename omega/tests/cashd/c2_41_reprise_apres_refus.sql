-- CASHD — c2_41 : la reprise après refus (socle 19az). Sur le banc (client cccccccc-…-0c), transaction annulée.

create or replace function tests.test_c2_41_reprise_apres_refus() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; j date := tests.c2_jour(); v_a uuid; v_b uuid; ra public.cashd_relances; rb public.cashd_relances;
  v_n integer; v_rep uuid;
begin
  if to_regclass('private.reprises') is null or to_regclass('public.approbations') is null then
    return next ok(true, 'Lot socle 19az absent du banc : reprise non vérifiable ici');
    return;
  end if;
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_a := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-REP-A', 'nom', 'Reprise Identique', 'contact_facturation_email', 'compta@repa.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_a, 'numero', 'FB-2026-2601', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  v_b := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-REP-B', 'nom', 'Reprise Corrigée', 'contact_facturation_email', 'compta@repb.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_b, 'numero', 'FB-2026-2602', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  select * into ra from public.cashd_relances x where x.compte_id = v_a and x.jour = j;
  select * into rb from public.cashd_relances x where x.compte_id = v_b and x.jour = j;

  -- Les deux relances sont refusées, avec un commentaire.
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire) values (ra.demande_id, v_client, v_daf, 'rejete', 'Montant à vérifier');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire) values (rb.demande_id, v_client, v_daf, 'rejete', 'Le client a payé 500 € hier');
  perform tests.redevenir_admin();
  -- B : le règlement est noté entre-temps.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_noter_reglement(v_client, v_b, 500, j, 'VIR FB-2026-2602', 'virement');
  perform tests.redevenir_admin();
  return next ok((select count(*) from private.reprises x where x.demande_id in (ra.demande_id, rb.demande_id) and x.statut = 'a_faire') = 2,
                 'Le refus dépose une consigne par relance (socle)');

  v_n := private.cashd_traiter_reprises();
  return next ok(v_n = 2, 'Le passage traite les deux reprises');
  return next ok((select x.statut = 'impossible' and x.motif like 'même résultat qu''avant%Montant à vérifier%' from private.reprises x where x.demande_id = ra.demande_id)
                 and not exists (select 1 from public.demandes_validation d where d.payload ->> 'reprise_de' = ra.demande_id::text),
                 'Rien n''a changé pour A : reprise impossible, avec la consigne, et aucune nouvelle demande');
  select d.id into v_rep from public.demandes_validation d where d.payload ->> 'reprise_de' = rb.demande_id::text;
  return next ok(v_rep is not null and (select d.statut = 'en_attente' and d.resume like 'Reprise après refus — %' and d.montant = 585
                                         and d.payload -> 'corrections' @> '[{"champ": "montant"}]'::jsonb
                                         from public.demandes_validation d where d.id = v_rep),
                 'B : une demande liée à la refusée, en attente, au nouveau montant, avec ses corrections');
  return next ok((select x.demande_id = v_rep and x.statut = 'a_valider' and x.montant = 585 and tests.c2_plat(x.corps) like '%585,00 €%' from public.cashd_relances x where x.id = rb.id),
                 'La relance de B passe sur la reprise, à valider de nouveau');

  -- La reprise refusée ne relance rien.
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire) values (v_rep, v_client, v_daf, 'rejete', 'Toujours pas');
  perform tests.redevenir_admin();
  return next ok(not exists (select 1 from private.reprises x where x.demande_id = v_rep) and private.cashd_traiter_reprises() = 0,
                 'Une reprise refusée ne relance rien : pas de troisième demande');
end $f$;
