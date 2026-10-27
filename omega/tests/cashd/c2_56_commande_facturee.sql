-- CASHD — c2_56 : une commande autorisée puis facturée ne compte qu'une fois dans le cumul du plafond (TNUIT-09).
-- Sur le banc (client cccccccc-…-0c), transaction annulée.

create or replace function tests.test_c2_56_commande_facturee() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_c uuid; v_cle text; v_x jsonb;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_c := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-FAC', 'nom', 'Commande Puis Facture', 'contact_facturation_email', 'compta@fac.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_c, 'numero', 'FB-2026-4001', 'date_emission', j - 5, 'echeance', j + 25, 'montant_ttc', 585));
  perform public.cashd_fixer_plafond(v_c, 1000, 'Plafond du banc, commande facturée');
  v_cle := public.cashd_creer_cle_commandes(v_client, 'Logiciel du banc, facturation') ->> 'cle';
  perform tests.redevenir_admin();
  perform set_config('request.jwt.claims', '', true);
  execute 'set local role anon';
  v_x := public.cashd_commande(v_cle, 'A-FAC', 300, 'FAC-1');
  execute 'reset role';
  return next ok(v_x ->> 'decision' = 'autorisee', 'La commande FAC-1 de 300 € est autorisée (585 + 300)');

  -- Elle est facturée : la facture porte la référence de la commande.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_c, 'numero', 'FB-2026-4002', 'commande_ref', 'FAC-1',
                                                                         'date_emission', j, 'echeance', j + 30, 'montant_ttc', 300));
  perform tests.redevenir_admin();
  execute 'set local role anon';
  v_x := public.cashd_commande(v_cle, 'A-FAC', 100, 'FAC-2');
  execute 'reset role';
  return next ok(v_x ->> 'decision' = 'autorisee' and (v_x ->> 'encours')::numeric = 885 and (v_x ->> 'engage')::numeric = 0,
                 'Facturée, elle n''est plus dans l''engagé : 885 + 100 = 985 ≤ 1 000, la commande de 100 € passe');

  -- Une facture dont le numéro est la référence de la commande l'éteint aussi.
  execute 'set local role anon';
  v_x := public.cashd_commande(v_cle, 'A-FAC', 10, 'FAC-3');
  execute 'reset role';
  return next ok((v_x ->> 'engage')::numeric = 100, 'FAC-2 (100 €), pas encore facturée, reste dans l''engagé');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_c, 'numero', 'FAC-2', 'date_emission', j, 'echeance', j + 30, 'montant_ttc', 100));
  perform tests.redevenir_admin();
  return next ok(private.cashd_commandes_engagees(v_c, 30) = 10, 'Facturée sous son propre numéro, FAC-2 sort de l''engagé ; reste FAC-3 (10 €)');

  -- La facture d'un autre compte ne l'éteint pas.
  return next ok(not exists (select 1 from public.cashd_commandes o where o.compte_id = v_c and o.reference = 'FAC-3' and private.cashd_commande_facturee(o.id)),
                 'Une commande sans facture qui la cite reste engagée');
end $f$;
