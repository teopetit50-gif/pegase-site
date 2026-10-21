-- CASHD — c2_22b : sur la fiche, toute suspension rend la pièce non relançable (A-C15) ; « sous le seuil » est dit même
-- sans relance préparée (A-C16). Sur le banc (client cccccccc-0000-4000-8000-00000000000c), transaction annulée.

create or replace function tests.test_c2_22b_fiche_suspension() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_c15 uuid; v_c16 uuid; v_c18 uuid; v_entite uuid; v_p jsonb;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_importer(v_client, 'clients', jsonb_build_array(
    jsonb_build_object('code', 'A-C15', 'nom', 'Règlement À Imputer', 'email', 'compta@c15.test'),
    jsonb_build_object('code', 'A-C16', 'nom', 'Cinq Euros', 'email', 'compta@c16.test'),
    jsonb_build_object('code', 'A-C18', 'nom', 'Témoin Relançable', 'email', 'compta@c18.test')));
  perform public.cashd_importer(v_client, 'factures', jsonb_build_array(
    jsonb_build_object('numero', 'FB-2026-1115', 'compte_ref', 'A-C15', 'date_emission', j - 38, 'echeance', j - 8, 'montant_ttc', 1085, 'reste_du', 1085),
    jsonb_build_object('numero', 'FB-2026-1116', 'compte_ref', 'A-C16', 'date_emission', j - 38, 'echeance', j - 8, 'montant_ttc', 1085, 'reste_du', 5),
    jsonb_build_object('numero', 'FB-2026-1118', 'compte_ref', 'A-C18', 'date_emission', j - 38, 'echeance', j - 8, 'montant_ttc', 1085, 'reste_du', 1085)));
  perform public.cashd_importer(v_client, 'reglements', jsonb_build_array(
    jsonb_build_object('date', j - 3, 'montant', 500, 'mode', 'VIR', 'compte_ref', 'A-C15', 'reference', 'VIR-C15-0001', 'libelle', 'VIR SANS REFERENCE')));
  select x.id, x.entite_id into v_c15, v_entite from public.cashd_comptes x where x.client_id = v_client and x.reference = 'A-C15';
  select x.id into v_c16 from public.cashd_comptes x where x.client_id = v_client and x.reference = 'A-C16';
  select x.id into v_c18 from public.cashd_comptes x where x.client_id = v_client and x.reference = 'A-C18';
  perform public.cashd_regler_entite(v_entite, 10);

  -- ── 04b : suspendue par un règlement à imputer ──
  select x into v_p from jsonb_array_elements(public.cashd_fiche_compte(v_c15) -> 'pieces') x where x ->> 'numero' = 'FB-2026-1115';
  return next ok(v_p ->> 'relance_suspendue' like 'un règlement reçu reste à imputer%' and (v_p ->> 'reste_relancable')::numeric = 0
                 and (v_p ->> 'reste_du')::numeric = 1085,
                 'Suspendue (règlement à imputer) : relançable 0, le reste dû 1 085 € reste lisible');

  -- ── 05b : sous le seuil, jamais relancée ──
  select x into v_p from jsonb_array_elements(public.cashd_fiche_compte(v_c16) -> 'pieces') x where x ->> 'numero' = 'FB-2026-1116';
  return next ok(not exists (select 1 from public.cashd_relances r where r.compte_id = v_c16), 'A-C16 n''a jamais eu de relance');
  return next ok(tests.c2_plat(v_p ->> 'relance_suspendue') = 'reste dû 5,00 €, sous le seuil de relance de 10,00 € : il reste dans l''encours, à abandonner ou à réclamer'
                 and (v_p ->> 'reste_relancable')::numeric = 0 and (v_p ->> 'reste_du')::numeric = 5,
                 'Sa fiche dit « reste dû 5,00 €, sous le seuil de relance de 10,00 € », relançable 0');

  -- ── Le témoin : rien de suspendu, tout est relançable ──
  select x into v_p from jsonb_array_elements(public.cashd_fiche_compte(v_c18) -> 'pieces') x where x ->> 'numero' = 'FB-2026-1118';
  return next ok(v_p ->> 'relance_suspendue' is null and (v_p ->> 'reste_relancable')::numeric = 1085, 'Une facture non suspendue reste relançable, sans motif');
  perform tests.redevenir_admin();
end $f$;
