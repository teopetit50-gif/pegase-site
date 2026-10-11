-- b1_20 — VARELO : les ventes des caisses (migration b1_17_caisses, après b1_16)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5) et b1_00_aides.sql.
-- runtests() annule tout ce que le test écrit. Motif : ^test_b1_20_
--
-- La société A a deux magasins (Jarry, Destreland). Le Z d'hier et celui du même jour la semaine dernière sont
-- déposés : Jarry a vendu 30 % de moins, Destreland n'a rien remonté hier. Le point du matin le dit.

create or replace function tests.test_b1_20_caisses() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; a uuid;
  g uuid; ge text := 'b1-gerant@essai.invalid';
  r jsonb; m jsonb; x record;
begin
  b := tests.b1_preparer(3);
  v_client := (b ->> 'client')::uuid; a := (b ->> 'soc_a')::uuid; g := (b ->> 'gerant')::uuid;

  return next is((select count(*) from public.modeles_jeux where module = 'varelo' and code = 'ventes_caisse' and version = 1), 6::bigint,
                 'le jeu ventes_caisse existe pour six logiciels de caisse ou tableurs');

  perform tests.endosser((b ->> 'collab')::uuid, 'b1-collaborateur@essai.invalid');
  r := public.grp_deposer_ventes(v_client, a, jsonb_build_array(
         jsonb_build_object('jour', to_char(current_date - 8, 'DD/MM/YYYY'), 'magasin', 'Jarry', 'ca_ttc', '10 000,00', 'ca_ht', '9 216,59', 'tickets', '412'),
         jsonb_build_object('jour', to_char(current_date - 8, 'DD/MM/YYYY'), 'magasin', 'Destreland', 'ca_ttc', '6 500,00', 'tickets', '250'),
         jsonb_build_object('jour', (current_date - 1)::text, 'magasin', 'Jarry', 'ca_ttc', '7 000,00', 'tickets', '301'),
         jsonb_build_object('jour', 'hier', 'magasin', 'Jarry', 'ca_ttc', '1'),
         jsonb_build_object('jour', (current_date + 3)::text, 'magasin', 'Jarry', 'ca_ttc', '1'),
         jsonb_build_object('jour', (current_date - 1)::text, 'magasin', '', 'ca_ttc', '1'),
         jsonb_build_object('jour', (current_date - 1)::text, 'magasin', 'Jarry', 'ca_ttc', 'beaucoup')), 'Lightspeed — Z de caisse');
  perform tests.redevenir_admin();
  return next ok((r ->> 'retenues')::int = 3 and (r ->> 'rejetees')::int = 4,
                 format('trois lignes retenues, quatre rejetées avec leur raison (%s)', r -> 'rejets'));
  return next ok(r -> 'rejets' @> '[{"motif": "jour illisible"}, {"motif": "jour dans le futur"}, {"motif": "magasin absent"}, {"motif": "CA TTC illisible"}]'::jsonb,
                 'les raisons : jour illisible, futur, magasin absent, montant illisible');
  select * into x from public.grp_ventes_magasins where client_id = v_client and magasin = 'Jarry';
  return next ok(x.hier_ttc = 7000 and x.semaine_derniere_ttc = 10000 and x.hier_tickets = 301, 'Jarry : 7 000 € hier, 10 000 € le même jour la semaine dernière');

  -- un nouveau dépôt du même jour remplace l'ancien
  perform tests.endosser(g, ge);
  perform public.grp_deposer_ventes(v_client, a, jsonb_build_array(jsonb_build_object('jour', (current_date - 1)::text, 'magasin', 'Jarry', 'ca_ttc', '7 200')), 'correction');
  perform tests.redevenir_admin();
  return next is(tests.compter('public', 'grp_ventes_caisse', format('client_id = %L and magasin = %L and jour = %L', v_client, 'Jarry', current_date - 1)), 1::bigint,
                 'un nouveau dépôt du même jour remplace l''ancien');

  m := private.grp_lignes_groupe(v_client);
  return next ok(m::text like '%caisses d''hier à 7 200 € TTC, 56 % sous le même jour de la semaine dernière (16 500 €)%',
                 'la société vend 56 % de moins qu''il y a une semaine (Jarry baisse, Destreland muet)');
  return next ok(m::text like '%Destreland (%) : aucune vente remontée hier, alors qu''il vendait 6 500 € le même jour la semaine dernière%',
                 'Destreland, muet hier, est signalé');
  return next ok(m::text like '%Caisses d''hier : 7 200 € TTC pour le groupe, 1 magasin%', 'le total d''hier pour le groupe');

  -- refus
  perform tests.endosser((b ->> 'partiel')::uuid, 'b1-collaborateur-a@essai.invalid');
  return next throws_ok(format('select public.grp_deposer_ventes(%L, %L, %L)', v_client, (b ->> 'soc_b'), '[]'), '42501', null,
                 'pas pour une société hors de son périmètre (42501)');
  perform tests.redevenir_admin();
  return next throws_ok(format('select public.grp_deposer_ventes(%L, %L, %L)', v_client, a, '{"jour": "x"}'), '22023', null, 'des lignes hors liste : refusées (22023)');
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action = %L', v_client, 'varelo.ventes.depot')), 2::bigint,
                 'deux dépôts au journal');
end $f$;
