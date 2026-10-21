-- CASHD — c2_22 : la raison exacte d'une relance retenue (règlement à lettrer) ou coupée (sous le seuil) — TCASHD-04/05.
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_22_raison_exacte() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_c5 uuid; v_c11 uuid; v_entite uuid; v_p jsonb; r public.cashd_relances;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_importer(v_client, 'clients', jsonb_build_array(
    jsonb_build_object('code', 'C-RX-05', 'nom', 'Carrelage Partiel', 'email', 'compta@rx05.test'),
    jsonb_build_object('code', 'C-RX-11', 'nom', 'Isolation Trois Euros', 'email', 'compta@rx11.test')));
  perform public.cashd_importer(v_client, 'factures', jsonb_build_array(
    jsonb_build_object('numero', 'FB-2026-0965', 'compte_ref', 'C-RX-05', 'date_emission', j - 38, 'echeance', j - 8, 'montant_ttc', 1085, 'reste_du', 1085),
    jsonb_build_object('numero', 'FB-2026-0971', 'compte_ref', 'C-RX-11', 'date_emission', j - 38, 'echeance', j - 8, 'montant_ttc', 1085, 'reste_du', 1085)));
  perform public.cashd_importer(v_client, 'reglements', jsonb_build_array(
    jsonb_build_object('date', j - 3, 'montant', 500, 'mode', 'VIR', 'compte_ref', 'C-RX-05', 'reference', 'VIR-RX05-0001', 'libelle', 'VIR SARL CARRELAGE PARTIEL'),
    jsonb_build_object('date', j - 6, 'montant', 1082, 'mode', 'CHQ', 'compte_ref', 'C-RX-11', 'reference', 'CHQ-0004521', 'libelle', 'CHQ FB-2026-0971')));
  select x.id into v_c5 from public.cashd_comptes x where x.client_id = v_client and x.reference = 'C-RX-05';
  select x.id, x.entite_id into v_c11, v_entite from public.cashd_comptes x where x.client_id = v_client and x.reference = 'C-RX-11';

  -- ── TCASHD-04 : la séquence attend le lettrage, et la fiche le dit ──
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j, null);
  return next ok(not exists (select 1 from public.cashd_relances x where x.compte_id = v_c5 and x.jour = j), 'Un règlement à lettrer suspend la relance du compte');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  select x into v_p from jsonb_array_elements(public.cashd_fiche_compte(v_c5) -> 'pieces') x where x ->> 'numero' = 'FB-2026-0965';
  return next ok(tests.c2_plat(v_p ->> 'relance_suspendue') like 'un règlement reçu reste à imputer sur ce compte (500,00 € du %, VIR-RX05-0001) : la relance attend son lettrage',
                 'La fiche dit pourquoi : le règlement à imputer, son montant, sa date, sa référence');

  -- ── TCASHD-05 : coupée sous le seuil, le motif le dit ──
  select * into r from public.cashd_relances x where x.compte_id = v_c11 and x.jour = j;
  return next ok(r.id is not null and (select p.reste_du from public.cashd_relances_pieces p where p.relance_id = r.id and not p.annulee) = 3,
                 'Sans seuil, le reste de 3 € est relancé');
  perform public.cashd_regler_entite(v_entite, 10);
  perform tests.redevenir_admin();
  perform private.cashd_verifier_relances(v_client);
  select * into r from public.cashd_relances x where x.id = r.id;
  return next ok(r.statut = 'coupee' and tests.c2_plat(r.motif) like '%FB-2026-0971 : reste dû 3,00 €, sous le seuil de relance de 10,00 €%reste dans l''encours%'
                 and r.motif not like '%réglée%',
                 'Sous le seuil, la relance est coupée avec la vraie raison, pas « réglée ou sortie de l''export »');
end $f$;
