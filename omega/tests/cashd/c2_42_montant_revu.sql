-- CASHD — c2_42 : une relance en attente est revue quand un règlement partiel est lettré (TCASHD-19).
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_42_montant_revu() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_c uuid; r0 public.cashd_relances; r1 public.cashd_relances;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_c := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-REVU', 'nom', 'Montant Revu', 'contact_facturation_email', 'compta@revu.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_c, 'numero', 'FB-2026-2701', 'date_emission', j - 40, 'echeance', j - 10, 'montant_ttc', 1085));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  select * into r0 from public.cashd_relances x where x.compte_id = v_c and x.jour = j;
  return next ok(r0.montant = 1085 and (select d.statut = 'en_attente' from public.demandes_validation d where d.id = r0.demande_id),
                 'La relance attend sa validation, à 1 085 €');

  -- Un règlement de 500 € est lettré sur la facture : la même relance est revue sur place.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_noter_reglement(v_client, v_c, 500, j, 'VIR FB-2026-2701', 'virement');
  perform tests.redevenir_admin();
  select * into r1 from public.cashd_relances x where x.id = r0.id;
  return next ok(r1.statut in ('a_valider', 'non_reglee') and r1.montant = 585 and tests.c2_plat(r1.corps) like '%585,00 €%'
                 and tests.c2_plat(r1.motif) like 'montant revu : FB-2026-2701 ne doit plus que 585,00 €%',
                 'Le règlement partiel revoit la relance en attente : 585 €, motif « montant revu »');
  return next ok((select d.statut = 'annulee' from public.demandes_validation d where d.id = r0.demande_id)
                 and r1.demande_id <> r0.demande_id
                 and (select d.statut = 'en_attente' and d.montant = 585 and (d.payload ->> 'revue_de')::uuid = r0.demande_id
                             and tests.c2_plat(d.payload ->> 'corps') like '%585,00 €%' from public.demandes_validation d where d.id = r1.demande_id),
                 'L''ancienne demande est retirée de la file ; une nouvelle, à 585 €, attend la validation');
  perform private.cashd_preparer_relances(v_client, j, null);
  return next ok((select count(*) from public.cashd_relances x where x.compte_id = v_c and x.jour = j) = 1
                 and (select x.demande_id = r1.demande_id from public.cashd_relances x where x.id = r0.id),
                 'Un seul message par compte et par jour : le passage suivant n''écrit rien de plus');

  -- Le solde réglé coupe comme avant (« réglée »), sans « montant revu ».
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_noter_reglement(v_client, v_c, 585, j, 'VIR FB-2026-2701 solde', 'virement');
  perform tests.redevenir_admin();
  return next ok((select x.statut = 'coupee' and x.motif like '%réglée%' and x.motif not like 'montant revu%' from public.cashd_relances x where x.id = r1.id),
                 'Le solde réglé coupe la relance « réglée », comme avant');
end $f$;
