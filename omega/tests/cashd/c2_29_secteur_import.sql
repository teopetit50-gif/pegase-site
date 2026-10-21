-- CASHD — c2_29 : le secteur du compte, lu à l'import des clients et repris dans les messages (TCASHD-09a).
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_29_secteur_import() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_r jsonb; v_c uuid;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_importer(v_client, 'clients', jsonb_build_array(
    jsonb_build_object('code', 'A-SEC1', 'nom', 'Maçonnerie Secteur', 'email', 'compta@sec1.test', 'secteur', 'BTP'),
    jsonb_build_object('code', 'A-SEC2', 'nom', 'Hôtel Activité', 'email', 'compta@sec2.test', 'activite', 'Hôtellerie')));
  return next ok((select x.secteur from public.cashd_comptes x where x.client_id = v_client and x.reference = 'A-SEC1') = 'BTP'
                 and (select x.secteur from public.cashd_comptes x where x.client_id = v_client and x.reference = 'A-SEC2') = 'Hôtellerie',
                 'Le secteur est lu (clé secteur, ou activite)');
  v_r := public.cashd_importer(v_client, 'clients', jsonb_build_array(
    jsonb_build_object('code', 'A-SEC1', 'nom', 'Maçonnerie Secteur', 'email', 'compta@sec1.test', 'secteur', 'BTP'),
    jsonb_build_object('code', 'A-SEC2', 'nom', 'Hôtel Activité', 'email', 'compta@sec2.test')));
  return next ok((v_r ->> 'inchangees')::int = 2 and (select x.secteur from public.cashd_comptes x where x.client_id = v_client and x.reference = 'A-SEC2') = 'Hôtellerie',
                 'Rejoué à l''identique : inchangé ; un export sans secteur garde celui qui est connu');
  v_r := public.cashd_importer(v_client, 'clients', jsonb_build_array(
    jsonb_build_object('code', 'A-SEC1', 'nom', 'Maçonnerie Secteur', 'email', 'compta@sec1.test', 'secteur', 'Gros œuvre')));
  return next ok((v_r ->> 'modifiees')::int = 1 and (select x.secteur from public.cashd_comptes x where x.client_id = v_client and x.reference = 'A-SEC1') = 'Gros œuvre',
                 'Un secteur qui change : modifié');
  select x.id into v_c from public.cashd_comptes x where x.client_id = v_client and x.reference = 'A-SEC1';
  perform public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_c, 'numero', 'FB-2026-1401', 'date_emission', j - 38, 'echeance', j - 8, 'montant_ttc', 1085));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  return next ok((select tests.c2_plat(x.corps) like '%votre compte A-SEC1, secteur Gros œuvre%' from public.cashd_relances x where x.compte_id = v_c and x.jour = j),
                 'Le message cite le secteur du compte');
end $f$;
