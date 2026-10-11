-- CASHD — c2_07 : qui valide selon le montant (trois paliers écrits en règles de validation du socle).
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée.

create or replace function tests.test_c2_07_validation() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; p jsonb; j date := tests.c2_jour(); v_r jsonb; v_regles uuid[];
  v_paliers jsonb := '[{"montant": 0, "roles": ["collaborateur", "valideur", "gerant"]}, {"montant": 2000, "roles": ["valideur", "gerant"]}, {"montant": 10000, "roles": ["gerant"]}]';
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  p := tests.c2_portefeuille();
  perform public.cashd_regler_relances(v_client, '{"seuil_direction": 5000}');

  -- ── Les gardes ──
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  return next throws_ok(format('select public.cashd_regler_validation(%L, %L)', v_client, v_paliers), '42501', null, 'Seul le gérant décide qui valide');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.cashd_regler_validation(%L, %L)', v_client, '[{"montant": 0, "roles": ["gerant"]}, {"montant": 0, "roles": ["gerant"]}]'),
                        '22023', null, 'Des montants qui ne croissent pas sont refusés');
  return next throws_ok(format('select public.cashd_regler_validation(%L, %L)', v_client, '[{"montant": 0, "roles": ["stagiaire"]}]'), '22023', null,
                        'Un rôle inconnu est refusé');
  return next throws_ok(format('select public.cashd_regler_validation(%L, %L)', v_client, '[{"montant": 100, "roles": ["gerant"]}]'), '22023', null,
                        'Le premier palier part de 0 €');

  -- ── Trois paliers ──
  v_r := public.cashd_regler_validation(v_client, v_paliers);
  perform tests.redevenir_admin();
  v_regles := (select g.regles_paliers from public.cashd_reglages g where g.client_id = v_client);
  return next ok(array_length(v_regles, 1) = 3
                 and (select count(*) from public.regles_validation r where r.id = any(v_regles) and r.actif and r.module = 'cashd') = 3
                 and not (select r.actif from public.regles_validation r where r.id = (select g.regle_direction_id from public.cashd_reglages g where g.client_id = v_client))
                 and (select g.seuil_direction from public.cashd_reglages g where g.client_id = v_client) is null,
                 'Trois règles de validation du socle, le seuil de direction remplacé');
  perform private.cashd_preparer_relances(v_client, j + 1, null);
  return next is((select d.roles_autorises::text from public.cashd_relances x join public.demandes_validation d on d.id = x.demande_id
                  where x.compte_id = (p ->> 'sci')::uuid and x.jour = j + 1 and x.nature = 'facture'), '{gerant}',
                 'Une relance de 12 000 € ne se valide que par la direction');
  return next is((select d.roles_autorises::text from public.cashd_relances x join public.demandes_validation d on d.id = x.demande_id
                  where x.compte_id = (p ->> 'hotel')::uuid and x.jour = j + 1 and x.nature = 'facture'), '{valideur,gerant}',
                 'Une relance de 3 000 € se valide par le responsable crédit ou la direction');
  return next is((select d.roles_autorises::text from public.cashd_relances x join public.demandes_validation d on d.id = x.demande_id
                  where x.compte_id = (p ->> 'sci')::uuid and x.jour = j + 1 and x.nature = 'devis'), '{collaborateur,valideur,gerant}',
                 'Une relance de devis (sans montant dû) se valide dès le chargé de compte');
  return next ok(exists (select 1 from public.cashd_historique_reglages h where h.client_id = v_client and h.donnees ? 'paliers_validation'),
                 'Le changement reste daté');

  -- ── Les liens du point du matin vont au nouvel espace (c2_07) ──
  return next ok(jsonb_array_length(private.cashd_point_lignes(v_client, j + 1)) > 0
                 and not exists (select 1 from jsonb_array_elements(private.cashd_point_lignes(v_client, j + 1)) x where x ->> 'lien' is distinct from '/espace2/cashd/suivi'),
                 'Chaque ligne du point du matin mène à /espace2/cashd/suivi, jamais à l''ancien dessin');

  -- ── Retour aux rôles par défaut ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_regler_validation(v_client, '[]');
  perform tests.redevenir_admin();
  return next ok(not exists (select 1 from public.regles_validation r where r.id = any(v_regles) and r.actif)
                 and exists (select 1 from public.regles_validation r where r.id = any(v_regles))
                 and (select g.paliers_validation from public.cashd_reglages g where g.client_id = v_client) is null,
                 'Sans paliers, les règles passent inactives, sans être supprimées');
end $f$;
