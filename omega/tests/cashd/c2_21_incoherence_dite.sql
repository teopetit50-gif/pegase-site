-- CASHD — c2_21 : la pièce au total incohérent est dite à l'import et sur la fiche (TCASHD-02).
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_21_incoherence_dite() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_r jsonb; v_compte uuid; v_fiche jsonb; v_p jsonb; v_av jsonb;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_importer(v_client, 'clients', jsonb_build_array(jsonb_build_object('code', 'C-INC21', 'nom', 'Gros Œuvre Total Faux', 'email', 'compta@inc21.test')));
  v_r := public.cashd_importer(v_client, 'factures', jsonb_build_array(
    jsonb_build_object('numero', 'FB-2026-0952', 'compte_ref', 'C-INC21', 'date_emission', j - 38, 'echeance', j - 8, 'montant_ht', 1000, 'montant_ttc', 1185, 'reste_du', 1185,
                       'lignes', jsonb_build_array(jsonb_build_object('article', 'Fer à béton', 'quantite', 1, 'prix_ht', 1000, 'montant_ht', 1000, 'tva', 8.5))),
    jsonb_build_object('numero', 'FB-2026-0953', 'compte_ref', 'C-INC21', 'date_emission', j - 38, 'echeance', j - 8, 'montant_ht', 1000, 'montant_ttc', 1085, 'reste_du', 1085),
    jsonb_build_object('numero', 'AV-2026-0953', 'compte_ref', 'C-INC21', 'date_emission', j - 5, 'montant_ttc', -50, 'reste_du', -50, 'facture_visee', 'FB-2026-0953')));
  select x.id into v_compte from public.cashd_comptes x where x.client_id = v_client and x.reference = 'C-INC21';

  -- ── À l'import ──
  return next ok(v_r -> 'incoherentes' @> '[{"numero": "FB-2026-0952", "compte": "C-INC21"}]'::jsonb and jsonb_array_length(v_r -> 'incoherentes') = 1
                 and (v_r -> 'incoherentes' -> 0 ->> 'motif') like 'TTC 1185%',
                 'La réponse de l''import dit la pièce au total incohérent, avec son motif, et elle seule');

  -- ── Sur la fiche ──
  v_fiche := public.cashd_fiche_compte(v_compte);
  select x into v_p from jsonb_array_elements(v_fiche -> 'pieces') x where x ->> 'numero' = 'FB-2026-0952';
  return next ok(v_p ->> 'incoherence' like 'TTC 1185%' and v_p ->> 'relance_suspendue' like 'total incohérent (TTC 1185%relance suspendue%',
                 'La fiche dit l''incohérence et la relance suspendue');
  return next ok((v_p ->> 'reste_relancable')::numeric = 0 and (v_p ->> 'reste_du')::numeric = 1185,
                 'Rien n''est relançable tant que la marque tient ; le reste dû reste celui de l''export');
  return next ok((select (x ->> 'reste_relancable')::numeric = 1085 and x ->> 'relance_suspendue' is null from jsonb_array_elements(v_fiche -> 'pieces') x where x ->> 'numero' = 'FB-2026-0953'),
                 'La pièce juste reste relançable, sans motif');
  select x into v_av from jsonb_array_elements(v_fiche -> 'pieces') x where x ->> 'numero' = 'AV-2026-0953';
  return next ok((v_av ->> 'reste_relancable')::numeric = 0 and v_av ->> 'facture_visee' = 'FB-2026-0953',
                 'Un avoir n''est pas relançable ; la fiche dit la facture qu''il vise');

  -- ── La marque levée : la pièce redevient relançable ──
  perform public.cashd_lever_incoherence((v_p ->> 'id')::uuid, 'Total vérifié avec le facturier : 1 185 € justes (octroi de mer)');
  select x into v_p from jsonb_array_elements(public.cashd_fiche_compte(v_compte) -> 'pieces') x where x ->> 'numero' = 'FB-2026-0952';
  return next ok(v_p ->> 'relance_suspendue' is null and (v_p ->> 'reste_relancable')::numeric = 1185, 'La marque levée, la pièce redevient relançable');
  perform tests.redevenir_admin();
end $f$;
