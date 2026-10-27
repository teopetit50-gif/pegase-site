-- CASHD — c2_20b : la reprise défait l'imputation d'avoir faite à tort avant c2_20 (cas A-C06 de la recette) et ré-impute
-- à la facture visée. Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_20b_reparer_avoirs() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; j date := tests.c2_jour(); v_x jsonb;
  v_f6 uuid; v_av6 uuid; v_b1 uuid; v_b2 uuid; v_avb uuid; v_rel uuid;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_importer(v_client, 'clients', jsonb_build_array(
    jsonb_build_object('code', 'A-C06', 'nom', 'Plomberie Avoir Perdu', 'email', 'compta@c06.test'),
    jsonb_build_object('code', 'A-C06B', 'nom', 'Plomberie Avoir Visé', 'email', 'compta@c06b.test')));
  perform public.cashd_importer(v_client, 'factures', jsonb_build_array(
    jsonb_build_object('numero', 'FB-2026-0106', 'compte_ref', 'A-C06', 'date_emission', j - 38, 'echeance', j - 8, 'montant_ttc', 1085, 'reste_du', 1085),
    jsonb_build_object('numero', 'AV-2026-0006', 'compte_ref', 'A-C06', 'date_emission', j - 11, 'montant_ttc', -200, 'reste_du', -200,
                       'commande_ref', 'Chantier : Résidence Gosier — avoir sur FB-2026-0999'),
    jsonb_build_object('numero', 'FB-2026-0961', 'compte_ref', 'A-C06B', 'date_emission', j - 50, 'echeance', j - 20, 'montant_ttc', 600, 'reste_du', 600),
    jsonb_build_object('numero', 'FB-2026-0962', 'compte_ref', 'A-C06B', 'date_emission', j - 38, 'echeance', j - 8, 'montant_ttc', 900, 'reste_du', 900),
    jsonb_build_object('numero', 'AV-2026-0962', 'compte_ref', 'A-C06B', 'date_emission', j - 11, 'montant_ttc', -150, 'reste_du', -150,
                       'commande_ref', 'Avoir sur FB-2026-0962')));
  perform tests.redevenir_admin();
  select x.id into v_f6 from public.cashd_factures x where x.client_id = v_client and x.numero = 'FB-2026-0106';
  select x.id into v_av6 from public.cashd_factures x where x.client_id = v_client and x.numero = 'AV-2026-0006';
  select x.id into v_b1 from public.cashd_factures x where x.client_id = v_client and x.numero = 'FB-2026-0961';
  select x.id into v_b2 from public.cashd_factures x where x.client_id = v_client and x.numero = 'FB-2026-0962';
  select x.id into v_avb from public.cashd_factures x where x.client_id = v_client and x.numero = 'AV-2026-0962';

  -- L'état de la recette avant c2_20 : avoirs sans facture visée relevée, imputés au passage du matin à la plus ancienne.
  update public.cashd_factures set facture_visee = null, statut_motif = null where id in (v_av6, v_avb);
  perform private.cashd_preparer_relances(v_client, j, null);
  select x.relance_id into v_rel from public.cashd_relances_pieces x where x.facture_id = v_f6 and not x.annulee;
  return next ok((select e.reste_du from public.cashd_factures_etat e where e.id = v_f6) = 885
                 and (select statut from public.cashd_factures where id = v_av6) = 'soldee'
                 and (select e.avoirs_imputes from public.cashd_factures_etat e where e.id = v_b1) = 150,
                 'Reproduit : AV-2026-0006 déduit de FB-2026-0106 (885 €, avoir soldé), AV-2026-0962 de la mauvaise facture');

  -- ── La reprise ──
  v_x := private.cashd_reparer_avoirs(v_client);
  return next ok((v_x ->> 'imputations_annulees')::int = 2 and (v_x ->> 'reimputees')::int = 1, 'Deux imputations défaites, une ré-imputée à sa cible');
  return next ok((select e.reste_du = 1085 and e.avoirs_imputes = 0 from public.cashd_factures_etat e where e.id = v_f6)
                 and (select a.statut = 'ouverte' and a.facture_visee = 'FB-2026-0999' and a.statut_motif like 'avoir sur FB-2026-0999%non imputé' from public.cashd_factures a where a.id = v_av6),
                 'FB-2026-0106 revient à 1 085 € ; l''avoir rouvert dit qu''il vise une facture inconnue');
  return next ok((select e.avoirs_imputes from public.cashd_factures_etat e where e.id = v_b1) = 0
                 and (select e.avoirs_imputes from public.cashd_factures_etat e where e.id = v_b2) = 150,
                 'L''avoir qui vise FB-2026-0962 lui est ré-imputé');
  return next ok((select r.statut from public.cashd_relances r where r.id = v_rel) = 'coupee', 'La relance en file à 885 € est coupée');
  return next ok(tests.c2_journal(v_client, 'cashd.imputation_annulee') ->> 'donnees' like '%c2_20b%', 'La reprise est au journal');
  v_x := private.cashd_reparer_avoirs(v_client);
  return next ok((v_x ->> 'imputations_annulees')::int = 0 and (v_x ->> 'reimputees')::int = 0 and (v_x ->> 'visees_relevees')::int = 0,
                 'Rejouée, la reprise ne fait plus rien');
  return next ok((select e.avoirs_imputes from public.cashd_factures_etat e where e.id = v_b2) = 150, 'Et ne touche pas l''imputation juste');
end $f$;
