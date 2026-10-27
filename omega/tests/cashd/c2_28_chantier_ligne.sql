-- CASHD — c2_28 : le chantier (commande_ref) dans la ligne de chaque facture (TCASHD-09b).
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_28_chantier_ligne() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_a uuid; v_b uuid;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_a := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-C00', 'nom', 'BTP Témoin', 'contact_facturation_email', 'compta@c00.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_a, 'numero', 'FB-2026-1300', 'date_emission', j - 38, 'echeance', j - 8,
             'montant_ttc', 1085, 'commande_ref', 'Chantier : Résidence Les Flamboyants'));
  v_b := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'A-C00B', 'nom', 'Sans Chantier', 'contact_facturation_email', 'compta@c00b.test'));
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_b, 'numero', 'FB-2026-1301', 'date_emission', j - 38, 'echeance', j - 8, 'montant_ttc', 500));
  return next lives_ok(format('select public.cashd_ecrire_ligne(%L, %L, %L, %L)', v_client, 'de', 'facture', 'Rechnung {numero} ({commande}): {reste} offen'),
                       'Une ligne écrite par l''organisation peut citer {commande}');
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  return next ok((select tests.c2_plat(x.corps) like '%Facture FB-2026-1300 du %, 1 085,00 € TTC — Chantier : Résidence Les Flamboyants, échue le %'
                  from public.cashd_relances x where x.compte_id = v_a and x.jour = j),
                 'La ligne cite le chantier après le montant');
  return next ok((select tests.c2_plat(x.corps) like '%Facture FB-2026-1301 du %, 500,00 € TTC, échue le %' from public.cashd_relances x where x.compte_id = v_b and x.jour = j),
                 'Sans référence de chantier, la ligne reste telle quelle');
end $f$;
