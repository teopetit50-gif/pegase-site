-- b1_21 — VARELO : le contexte du groupe pour l'assistant (migration b1_18_contexte, après b1_17)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5), b1_00_aides.sql et b1_11.
-- runtests() annule tout ce que le test écrit. Motif : ^test_b1_21_
--
-- Deux sociétés ont déposé leur balance générale ; la société A a une livraison à protester. Le gérant lit tout
-- le groupe ; un collaborateur de la seule société A ne voit qu'elle ; chaque lecture est au journal ; une
-- personne d'un autre groupe est refusée.

create or replace function tests.test_b1_21_contexte() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; a uuid; bb uuid;
  g uuid; ge text := 'b1-gerant@essai.invalid';
  c jsonb; cp jsonb;
begin
  b := tests.b1_preparer(3);
  v_client := (b ->> 'client')::uuid; a := (b ->> 'soc_a')::uuid; bb := (b ->> 'soc_b')::uuid; g := (b ->> 'gerant')::uuid;
  perform tests.endosser(g, ge);
  perform public.grp_deposer_balance(v_client, a, current_date - 5, date_trunc('year', current_date)::date, tests.b1_balance_a(), 'Sage 100');
  perform public.grp_deposer_balance(v_client, bb, current_date - 5, date_trunc('year', current_date)::date, tests.b1_balance_a(), 'EBP');
  perform public.grp_enregistrer_reception(v_client, a, jsonb_build_object('transporteur', 'Transports Caraïbes', 'avarie', true, 'constat', 'Palette écrasée.'));
  c := public.grp_contexte(v_client, 'question du gérant');
  perform tests.redevenir_admin();
  return next is(jsonb_array_length(c -> 'societes'), 2, 'le gérant lit les deux sociétés');
  return next ok(c -> 'societes' -> 0 ? 'ventes' and c -> 'societes' -> 0 ? 'tresorerie', 'chaque société porte ses ventes et sa trésorerie');
  return next ok(jsonb_array_length(c -> 'reserves_a_emettre') = 1 and c ? 'ce_matin' and c ? 'decisions_en_attente' and c ? 'caisses_hier',
                 'les réserves, le point du matin, les décisions et les caisses y sont');
  return next ok(c::text not like '%iban%' and length(c::text) < 60000, format('aucun IBAN, et borné (%s caractères)', length(c::text)));

  perform tests.endosser((b ->> 'partiel')::uuid, 'b1-collaborateur-a@essai.invalid');
  cp := public.grp_contexte(v_client, null);
  perform tests.redevenir_admin();
  return next ok(jsonb_array_length(cp -> 'societes') = 1 and cp -> 'societes' -> 0 ->> 'societe' = (select nom from public.entites where id = a),
                 'un collaborateur de la société A ne voit qu''elle (RLS)');

  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action = %L', v_client, 'varelo.lecture.contexte')), 2::bigint,
                 'les deux lectures sont au journal');
  perform tests.endosser((b ->> 'etranger')::uuid, 'a5-client-b@essai.invalid');
  return next throws_ok(format('select public.grp_contexte(%L)', v_client), 'P0002', null, 'une personne d''un autre groupe : refusée (P0002)');
  perform tests.redevenir_admin();
end $f$;
