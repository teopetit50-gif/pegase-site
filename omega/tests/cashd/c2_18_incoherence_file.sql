-- CASHD — c2_18 : une relance déjà en file est coupée quand sa pièce devient incohérente, et revient quand la marque est
-- levée. Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_18_incoherence_file() returns setof text
language plpgsql as $f$
declare banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); r public.cashd_relances; v_f uuid;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_importer(v_client, 'clients', jsonb_build_array(jsonb_build_object('code', 'T18-A', 'nom', 'Démo T18 SAS', 'email', 'a@demo18.test')));
  perform public.cashd_importer(v_client, 'factures', jsonb_build_array(
    jsonb_build_object('numero', 'T18-001', 'compte_ref', 'T18-A', 'date_emission', j - 45, 'echeance', j - 15, 'montant_ht', 1000, 'montant_tva', 85, 'montant_ttc', 1085)));
  select f.id into v_f from public.cashd_factures f where f.client_id = v_client and f.numero = 'T18-001';
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  select x.* into r from public.cashd_relances x join public.cashd_relances_pieces p on p.relance_id = x.id where p.facture_id = v_f and x.jour = j;
  return next is(r.statut, 'a_valider', 'Une relance de 1 085 € est dans la file');

  -- L'export suivant donne un TTC incohérent : la pièce est marquée, la relance en file est coupée.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_importer(v_client, 'factures', jsonb_build_array(
    jsonb_build_object('numero', 'T18-001', 'compte_ref', 'T18-A', 'date_emission', j - 45, 'echeance', j - 15, 'montant_ht', 1000, 'montant_tva', 85, 'montant_ttc', 1185)));
  perform tests.redevenir_admin();
  return next ok((select f.incoherence like 'TTC 1185%' from public.cashd_factures f where f.id = v_f), 'La pièce est marquée incohérente');
  return next ok((select x.statut = 'coupee' and x.motif like '%total incohérent (TTC 1185%' from public.cashd_relances x where x.id = r.id),
                 'La relance déjà en file est coupée, avec le motif');

  -- La marque levée par une personne : la relance revient au passage suivant.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_lever_incoherence(v_f, 'Frais de port de 100 € facturés à part, total confirmé');
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j + 1, null);
  return next ok(exists (select 1 from public.cashd_relances x join public.cashd_relances_pieces p on p.relance_id = x.id and not p.annulee
                         where p.facture_id = v_f and x.jour = j + 1 and x.statut = 'a_valider' and x.montant = 1185),
                 'Marque levée : la relance revient, au montant confirmé');
end $f$;
