-- CASHD — c2_20 : un avoir ne s'impute qu'à la facture qu'il vise ; s'il vise une facture inconnue, nulle part, et c'est dit
-- (TCASHD-03). Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_20_avoir_vise() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_r jsonb;
  v_fa uuid; v_av uuid; v_fb1 uuid; v_fb2 uuid; v_fc uuid;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_importer(v_client, 'clients', jsonb_build_array(
    jsonb_build_object('code', 'C-AV-A', 'nom', 'Plomberie Avoir Perdu', 'email', 'compta@avoir-a.test'),
    jsonb_build_object('code', 'C-AV-B', 'nom', 'Plomberie Avoir Visé', 'email', 'compta@avoir-b.test'),
    jsonb_build_object('code', 'C-AV-C', 'nom', 'Plomberie Avoir Libre', 'email', 'compta@avoir-c.test')));
  v_r := public.cashd_importer(v_client, 'factures', jsonb_build_array(
    -- A : l'avoir vise une facture que ce compte n'a pas
    jsonb_build_object('numero', 'FB-2026-0906', 'compte_ref', 'C-AV-A', 'date_emission', j - 38, 'echeance', j - 8, 'montant_ttc', 1085, 'reste_du', 1085),
    jsonb_build_object('numero', 'AV-2026-0906', 'compte_ref', 'C-AV-A', 'date_emission', j - 11, 'montant_ttc', -200, 'reste_du', -200,
                       'commande_ref', 'Chantier : Résidence Gosier — avoir sur FB-2026-0999'),
    -- B : l'avoir vise la plus récente des deux factures échues
    jsonb_build_object('numero', 'FB-2026-0911', 'compte_ref', 'C-AV-B', 'date_emission', j - 50, 'echeance', j - 20, 'montant_ttc', 600, 'reste_du', 600),
    jsonb_build_object('numero', 'FB-2026-0912', 'compte_ref', 'C-AV-B', 'date_emission', j - 38, 'echeance', j - 8, 'montant_ttc', 900, 'reste_du', 900),
    jsonb_build_object('numero', 'AV-2026-0912', 'compte_ref', 'C-AV-B', 'date_emission', j - 11, 'montant_ttc', -150, 'reste_du', -150,
                       'facture_visee', 'FB-2026-0912'),
    -- C : l'avoir ne vise rien — imputé comme avant, sur la plus ancienne échue
    jsonb_build_object('numero', 'FB-2026-0921', 'compte_ref', 'C-AV-C', 'date_emission', j - 38, 'echeance', j - 8, 'montant_ttc', 500, 'reste_du', 500),
    jsonb_build_object('numero', 'AV-2026-0921', 'compte_ref', 'C-AV-C', 'date_emission', j - 11, 'montant_ttc', -100, 'reste_du', -100)));
  perform tests.redevenir_admin();
  select x.id into v_fa from public.cashd_factures x where x.client_id = v_client and x.numero = 'FB-2026-0906';
  select x.id into v_av from public.cashd_factures x where x.client_id = v_client and x.numero = 'AV-2026-0906';
  select x.id into v_fb1 from public.cashd_factures x where x.client_id = v_client and x.numero = 'FB-2026-0911';
  select x.id into v_fb2 from public.cashd_factures x where x.client_id = v_client and x.numero = 'FB-2026-0912';
  select x.id into v_fc from public.cashd_factures x where x.client_id = v_client and x.numero = 'FB-2026-0921';

  -- ── À l'import ──
  return next ok((select f.nature = 'avoir' and to_jsonb(f) ->> 'facture_visee' = 'FB-2026-0999' from public.cashd_factures f where f.id = v_av),
                 'La facture visée est relevée dans commande_ref');
  return next ok(v_r -> 'avoirs_non_imputes' @> '[{"numero": "AV-2026-0906", "vise": "FB-2026-0999"}]'::jsonb and jsonb_array_length(v_r -> 'avoirs_non_imputes') = 1,
                 'La réponse de l''import dit l''avoir qui vise une facture inconnue, et lui seul');
  return next ok((select f.statut_motif like 'avoir sur FB-2026-0999%non imputé' from public.cashd_factures f where f.id = v_av),
                 'Sa fiche porte le motif');

  -- ── Au passage du matin ──
  perform private.cashd_preparer_relances(v_client, j, null);
  return next ok((select e.reste_du = 1085 and e.avoirs_imputes = 0 from public.cashd_factures_etat e where e.id = v_fa)
                 and (select p.reste_du from public.cashd_relances_pieces p where p.facture_id = v_fa and not p.annulee) = 1085,
                 'L''avoir orphelin n''est déduit de rien : la relance réclame 1 085 €, comme la fiche');
  return next ok((select e.avoirs_imputes from public.cashd_factures_etat e where e.id = v_fb2) = 150
                 and (select e.avoirs_imputes from public.cashd_factures_etat e where e.id = v_fb1) = 0,
                 'L''avoir qui vise une facture s''impute à elle, pas à la plus ancienne');
  return next ok((select e.avoirs_imputes from public.cashd_factures_etat e where e.id = v_fc) = 100,
                 'L''avoir qui ne vise rien s''impute comme avant');
end $f$;
