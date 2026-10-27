-- CASHD — c2_17 : à l'import, un numéro déjà porté par un autre compte est écarté et signalé ; un total incohérent est
-- marqué et sa relance suspendue. Sur le banc (client cccccccc-0000-4000-8000-00000000000c), transaction annulée.

create or replace function tests.test_c2_17_controles_import() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); r jsonb; v_f uuid;
  v_lignes jsonb := '[{"montant_ht": 1000.00, "tva": 8.5}, {"montant_ht": 200.00, "tva": 2.1}, {"montant_ht": 50.00}]';
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_importer(v_client, 'clients', jsonb_build_array(
    jsonb_build_object('code', 'T17-A', 'nom', 'Démo A SAS', 'email', 'a@demo17.test'),
    jsonb_build_object('code', 'T17-B', 'nom', 'Démo B SAS', 'email', 'b@demo17.test')));

  -- ── Le contrôle du total (fonction privée : sous le serveur) ──
  perform tests.redevenir_admin();
  return next is(private.cashd_controle_total(jsonb_build_object('montant_ht', 1250, 'montant_tva', 89.20, 'montant_ttc', 1339.20)), null, 'HT + TVA = TTC : cohérent');
  return next ok(private.cashd_controle_total(jsonb_build_object('montant_ht', 1250, 'montant_tva', 89.20, 'montant_ttc', 1439.20)) like 'TTC 1439.20 ≠ HT 1250 + TVA 89.20%',
                 'HT + TVA ≠ TTC : le motif le dit');
  return next is(private.cashd_controle_total(jsonb_build_object('montant_ht', 1250, 'montant_ttc', 1339.20, 'lignes', v_lignes)), null,
                 'Par les lignes : 1 250 HT, TVA 85 + 4,20 = 1 339,20 : cohérent');
  return next ok(private.cashd_controle_total(jsonb_build_object('montant_ht', 1250, 'montant_ttc', 1349.20, 'lignes', v_lignes)) like 'TTC 1349.20 ≠ lignes%',
                 'Par les lignes, 10 € de trop : incohérent');
  return next ok(private.cashd_controle_total(jsonb_build_object('montant_ht', 1250, 'montant_ttc', 1600)) like '%hors de HT%'
                 and private.cashd_controle_total(jsonb_build_object('montant_ht', 1250, 'montant_ttc', 1300)) is null,
                 'Avec le seul HT : un TTC au-delà de HT + 20 % est incohérent, en deçà il passe');
  return next is(private.cashd_controle_total(jsonb_build_object('montant_ttc', 1300)), null, 'Sans HT ni TVA : rien à contrôler');

  -- ── L'import ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  r := public.cashd_importer(v_client, 'factures', jsonb_build_array(
    jsonb_build_object('numero', 'T17-001', 'compte_ref', 'T17-A', 'date_emission', j - 45, 'echeance', j - 15, 'montant_ht', 1250, 'montant_ttc', 1339.20, 'lignes', v_lignes),
    jsonb_build_object('numero', 'T17-001', 'compte_ref', 'T17-B', 'date_emission', j - 45, 'echeance', j - 15, 'montant_ht', 1250, 'montant_ttc', 999.00),
    jsonb_build_object('numero', 'T17-002', 'compte_ref', 'T17-B', 'date_emission', j - 45, 'echeance', j - 15, 'montant_ht', 1250, 'montant_ttc', 1439.20, 'montant_tva', 89.20)));
  return next ok(jsonb_array_length(r -> 'ecartees') = 1 and r #>> '{ecartees,0,motif}' like 'numéro déjà porté par la pièce du compte T17-A%',
                 'Le même numéro sur un autre compte : la ligne est écartée, avec le compte qui le porte');
  return next ok((select f.montant_ttc = 1339.20 and c.reference = 'T17-A' from public.cashd_factures f join public.cashd_comptes c on c.id = f.compte_id
                  where f.client_id = v_client and f.numero = 'T17-001'),
                 'La pièce existante est gardée : ni son compte ni son montant ne changent');
  select f.id into v_f from public.cashd_factures f where f.client_id = v_client and f.numero = 'T17-002';
  return next ok((select f.incoherence like 'TTC 1439.20 ≠ HT 1250%' from public.cashd_factures f where f.id = v_f)
                 and (select f.incoherence is null from public.cashd_factures f where f.client_id = v_client and f.numero = 'T17-001'),
                 'Le total incohérent est marqué ; la pièce cohérente ne l''est pas');
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  return next ok(not exists (select 1 from public.cashd_relances_pieces p where p.facture_id = v_f)
                 and exists (select 1 from public.cashd_relances_pieces p join public.cashd_factures f on f.id = p.facture_id
                             where f.client_id = v_client and f.numero = 'T17-001'),
                 'La pièce incohérente n''est pas relancée ; la cohérente l''est');

  -- ── Corrigée par l'export suivant, ou levée par une personne ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_importer(v_client, 'factures', jsonb_build_array(
    jsonb_build_object('numero', 'T17-002', 'compte_ref', 'T17-B', 'date_emission', j - 45, 'echeance', j - 15, 'montant_ht', 1250, 'montant_ttc', 1339.20, 'montant_tva', 89.20)));
  return next ok((select f.incoherence is null and f.montant_ttc = 1339.20 from public.cashd_factures f where f.id = v_f),
                 'L''export corrigé lève la marque');
  perform public.cashd_importer(v_client, 'factures', jsonb_build_array(
    jsonb_build_object('numero', 'T17-002', 'compte_ref', 'T17-B', 'date_emission', j - 45, 'echeance', j - 15, 'montant_ht', 1250, 'montant_ttc', 1439.20, 'montant_tva', 89.20)));
  return next throws_ok(format('select public.cashd_lever_incoherence(%L, %L)', v_f, ' '), '22023', null, 'Lever la marque demande un motif');
  perform public.cashd_lever_incoherence(v_f, 'Frais de port de 100 € facturés à part, total confirmé');
  return next ok((select f.incoherence is null from public.cashd_factures f where f.id = v_f)
                 and tests.c2_journal(v_client, 'cashd.incoherence_levee', v_f::text) ->> 'donnees' like '%Frais de port%',
                 'Une personne lève la marque, avec son motif, au journal');
  perform tests.redevenir_admin();
end $f$;
