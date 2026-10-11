-- CASHD — c2_08 : un chargé de recouvrement ne voit que son portefeuille ; la direction lit le consolidé.
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_08_portefeuille() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; v_collab uuid; p jsonb; j date := tests.c2_jour(); v_t jsonb; v_r jsonb;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  v_collab := tests.c2_compte(v_client, 'collaborateur', 'c2-portefeuille-collab@banc-varelo.test');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  p := tests.c2_portefeuille();
  -- Le collaborateur est le chargé de la SCI.
  perform public.cashd_ecrire_compte((p ->> 'sci')::uuid, v_client, jsonb_build_object('commercial_id', v_collab));
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j + 1, null);

  -- ── Sans le réglage : le périmètre de l'entité ──
  perform tests.endosser(v_collab, 'c2-portefeuille-collab@banc-varelo.test');
  return next is((select count(*)::int from public.cashd_comptes c where c.client_id = v_client), 3, 'Sans portefeuille, le collaborateur lit les trois comptes de son périmètre');

  -- ── Les gardes ──
  return next throws_ok(format('select public.cashd_regler_portefeuille(%L, true)', v_client), '42501', null, 'Un collaborateur n''active pas le portefeuille');
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  return next throws_ok(format('select public.cashd_regler_portefeuille(%L, true)', v_client), '42501', null, 'Un valideur non plus : seul le gérant décide');

  -- ── Le portefeuille actif ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_r := public.cashd_regler_portefeuille(v_client, true);
  return next is((v_r ->> 'comptes_sans_charge')::int, 2, 'Le gérant voit combien de comptes n''ont pas encore de chargé');
  perform tests.endosser(v_collab, 'c2-portefeuille-collab@banc-varelo.test');
  return next is((select string_agg(c.reference, ',') from public.cashd_comptes c where c.client_id = v_client), 'C-LEFEVRE',
                 'Le chargé ne lit plus que son compte');
  return next ok(not exists (select 1 from public.cashd_factures f where f.client_id = v_client and f.compte_id <> (p ->> 'sci')::uuid)
                 and exists (select 1 from public.cashd_factures f where f.id = (p ->> 'f1')::uuid),
                 'Ses factures, et seulement les siennes');
  return next ok(not exists (select 1 from public.cashd_relances r where r.client_id = v_client and r.compte_id <> (p ->> 'sci')::uuid)
                 and not exists (select 1 from public.cashd_relances_pieces x join public.cashd_factures f on f.id = x.facture_id where f.compte_id <> (p ->> 'sci')::uuid),
                 'Ses relances, et leurs pièces');
  v_t := public.cashd_tableau(v_client);
  return next ok(jsonb_array_length(v_t -> 'comptes') = 1 and (v_t #>> '{totaux,encours}')::numeric = 18000,
                 'Son tableau est celui de son portefeuille : un compte, 18 000 € d''encours');
  return next is(public.cashd_fiche_compte((p ->> 'hotel')::uuid) -> 'compte', null::jsonb, 'La fiche d''un compte qui n''est pas le sien ne se lit pas');
  return next ok(not exists (select 1 from public.cashd_arretes a where a.client_id = v_client), 'Les arrêtés du consolidé ne se lisent pas');

  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  return next is((select count(*)::int from public.cashd_comptes c where c.client_id = v_client), 3, 'Le valideur lit toujours le consolidé');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next is(jsonb_array_length(public.cashd_tableau(v_client) -> 'comptes'), 3, 'La direction aussi');
  return next ok(exists (select 1 from public.cashd_historique_reglages h where h.client_id = v_client and h.donnees ? 'portefeuille_par_charge'),
                 'Le changement reste daté');

  -- ── Coupé : retour au périmètre ──
  perform public.cashd_regler_portefeuille(v_client, false);
  perform tests.endosser(v_collab, 'c2-portefeuille-collab@banc-varelo.test');
  return next is((select count(*)::int from public.cashd_comptes c where c.client_id = v_client), 3, 'Coupé, le collaborateur retrouve son périmètre');
  perform tests.redevenir_admin();
end $f$;
