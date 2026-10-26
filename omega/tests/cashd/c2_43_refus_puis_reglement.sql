-- CASHD — c2_43 : une relance refusée, puis un règlement partiel lettré : une nouvelle relance au reste dû (TCASHD-18).
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée. Socle 19az.

create or replace function tests.test_c2_43_refus_puis_reglement() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; j date := tests.c2_jour(); v_a uuid; v_b uuid;
  ra public.cashd_relances; rb public.cashd_relances; r1 public.cashd_relances;
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
  v_a := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-REFR', 'nom', 'Refus Puis Règlement', 'contact_facturation_email', 'compta@refr.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_a, 'numero', 'FB-2026-2801', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  v_b := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-REFS', 'nom', 'Refus Sans Règlement', 'contact_facturation_email', 'compta@refs.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_b, 'numero', 'FB-2026-2802', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  select * into ra from public.cashd_relances x where x.compte_id = v_a and x.jour = j;
  select * into rb from public.cashd_relances x where x.compte_id = v_b and x.jour = j;

  -- Les deux rappels sont refusés ; la reprise passe tout de suite : rien n'a changé, elle est impossible.
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire) values (ra.demande_id, v_client, v_daf, 'rejete', 'Le client annonce un virement partiel, attendre');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire) values (rb.demande_id, v_client, v_daf, 'rejete', 'Attendre');
  perform tests.redevenir_admin();
  perform private.cashd_traiter_reprises();
  return next ok((select x.statut = 'impossible' from private.reprises x where x.demande_id = ra.demande_id),
                 'Sans changement, la reprise est impossible (c2_41)');
  return next ok((select x.motif like 'refusée dans la file de validation : Le client annonce un virement partiel, attendre%' and x.motif not like '%l''envoi viendra%'
                  from public.cashd_relances x where x.id = ra.id),
                 'La relance refusée dit son refus et sa consigne, plus « l''envoi viendra une fois le réglage posé »');

  -- Puis 500 € sont lettrés sur la facture de A.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_noter_reglement(v_client, v_a, 500, j, 'VIR FB-2026-2801', 'virement');
  perform tests.redevenir_admin();
  return next ok((select x.statut = 'coupee' and tests.c2_plat(x.motif) like 'refusée, puis montant revu : FB-2026-2801 ne doit plus que 585,00 €%'
                  from public.cashd_relances x where x.id = ra.id),
                 'Le règlement partiel rend la relance refusée : « refusée, puis montant revu »');

  -- Le passage écrit une nouvelle relance au reste dû, à valider ; le compte B, refusé sans changement, n'en reçoit pas.
  perform private.cashd_preparer_relances(v_client, j, null);
  select * into r1 from public.cashd_relances x where x.compte_id = v_a and x.jour = j and x.id <> ra.id;
  return next ok(r1.id is not null and r1.montant = 585 and tests.c2_plat(r1.corps) like '%585,00 €%'
                 and (select d.statut = 'en_attente' and d.montant = 585 from public.demandes_validation d where d.id = r1.demande_id),
                 'Une nouvelle relance au reste dû (585 €), à valider : rien ne part sans validation');
  return next ok(not exists (select 1 from public.cashd_relances x where x.compte_id = v_b and x.jour = j and x.id <> rb.id),
                 'Une relance refusée sans changement n''est pas réécrite');
end $f$;
