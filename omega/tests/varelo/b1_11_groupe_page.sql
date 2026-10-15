-- b1_11 — VARELO : le groupe sur une page (migration b1_08_groupe_page, après b1_07)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5) et b1_00_aides.sql.
-- runtests() annule tout ce que le test écrit. Motif : ^test_b1_11_
-- Dates relatives à current_date ; l'exercice de la société A commence 99 jours avant l'arrêté (100 jours écoulés).
--
-- La société A dépose sa balance générale : 100 000 € de ventes (706 et 701), 60 000 € d'achats, une banque à
-- 15 000 €, un découvert de 5 000 € et 500 € de caisse : trésorerie 10 500 €. L'an dernier à la même date : 70 000 €
-- de ventes. La DAF pose un objectif de 730 000 € et un plancher de trésorerie de 20 000 €.

create or replace function tests.b1_balance_a() returns jsonb
language sql immutable as $$
  select jsonb_build_array(
    jsonb_build_object('compte', '706000', 'libelle', 'Prestations de services', 'debit', '', 'credit', '80 000,00'),
    jsonb_build_object('compte', '701000', 'libelle', 'Ventes de produits finis', 'solde', '-20000'),
    jsonb_build_object('compte', '607000', 'libelle', 'Achats de marchandises', 'debit', '60 000,00', 'credit', '0'),
    jsonb_build_object('compte', '512000', 'libelle', 'Banque (ancien solde)', 'solde', '1'),                -- doublon : la ligne suivante gagne
    jsonb_build_object('compte', '512 000', 'libelle', 'Banque', 'solde', '15 000'),
    jsonb_build_object('compte', '519000', 'libelle', 'Concours bancaires courants', 'credit', '5 000'),
    jsonb_build_object('compte', '530000', 'libelle', 'Caisse', 'debit', '500'),
    jsonb_build_object('compte', '411000', 'libelle', 'Clients', 'solde', '25 000'),
    jsonb_build_object('compte', 'ABC', 'solde', '1'),                                                      -- rejet : compte illisible
    jsonb_build_object('compte', '', 'solde', '1'),                                                         -- rejet : compte manquant
    jsonb_build_object('compte', '621000', 'solde', 'beaucoup'),                                            -- rejet : montant illisible
    jsonb_build_object('compte', '622000', 'libelle', 'Honoraires'))                                       -- rejet : aucun montant
$$;

create or replace function tests.test_b1_11_page() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; a uuid; bb uuid;
  g uuid; ge text := 'b1-gerant@essai.invalid';
  j date := current_date - 3;
  d0 date := current_date - 102;
  r jsonb;
  x record;
  v_motifs text;
  attendu numeric;
begin
  b := tests.b1_preparer(3);
  v_client := (b ->> 'client')::uuid; a := (b ->> 'soc_a')::uuid; bb := (b ->> 'soc_b')::uuid; g := (b ->> 'gerant')::uuid;

  perform tests.endosser(g, ge);
  r := public.grp_deposer_balance(v_client, a, j, d0, tests.b1_balance_a(), 'Sage 100 — balance générale');
  perform tests.redevenir_admin();
  return next ok((r ->> 'lus')::integer = 12 and (r ->> 'retenus')::integer = 7 and jsonb_array_length(r -> 'rejetes') = 5,
                 format('12 lignes lues, 7 retenues, 5 rejetées (%s / %s)', r ->> 'retenus', jsonb_array_length(r -> 'rejetes')));
  select string_agg(e ->> 'motif', ' | ' order by (e ->> 'ligne')::integer) into v_motifs from jsonb_array_elements(r -> 'rejetes') e;
  return next is(v_motifs, 'doublon dans le lot | numéro de compte illisible | numéro de compte manquant | montant illisible | aucun montant', 'les motifs, dans l''ordre');
  return next ok((r ->> 'ventes')::numeric = 100000 and (r ->> 'tresorerie')::numeric = 10500 and (r ->> 'resultat')::numeric = 40000,
                 'ventes 100 000 (706 + 701), trésorerie 10 500 (512 − 519 + 530), résultat 40 000');
  return next is((r ->> 'desequilibre')::numeric, -4500.00, 'la balance ne s''équilibre pas (−4 500) : c''est dit, pas refusé');

  -- l'an dernier à la même date
  perform tests.endosser(g, ge);
  perform public.grp_deposer_balance(v_client, a, (j - interval '1 year')::date, (d0 - interval '1 year')::date,
            jsonb_build_array(jsonb_build_object('compte', '706000', 'credit', '70000')), 'balance N-1');
  -- la société B, sans objectif
  perform public.grp_deposer_balance(v_client, bb, j, d0,
            jsonb_build_array(jsonb_build_object('compte', '706100', 'credit', '50000'), jsonb_build_object('compte', '512100', 'debit', '90000')), 'EBP');
  perform tests.redevenir_admin();

  -- la DAF règle l'objectif et le plancher de A : une alerte de trésorerie se lève
  perform tests.endosser((b ->> 'daf')::uuid, 'b1-daf@essai.invalid');
  perform public.grp_regler_objectif(v_client, a, d0, 730000, 20000, 'Budget voté en conseil');
  select * into x from public.grp_groupe_page where client_id = v_client and entite_id = a;
  perform tests.redevenir_admin();
  attendu := round(730000 * 100 / ((d0 + interval '1 year')::date - d0), 2);
  return next ok(x.arrete_le = j and x.ventes = 100000 and x.tresorerie = 10500 and x.resultat = 40000, 'la page lit la balance courante de A (la plus récente), pas celle de l''an dernier');
  return next ok(x.ventes_n1 = 70000 and x.ecart_n1 = 30000 and x.ecart_n1_pct = 42.9, format('sur l''an dernier à la même date : +30 000 (+%s %%)', x.ecart_n1_pct));
  return next ok(x.objectif_a_date = attendu and x.ecart_objectif = 100000 - attendu, format('objectif au prorata de 100 jours : %s, écart %s', x.objectif_a_date, x.ecart_objectif));
  return next ok(x.sous_plancher, 'trésorerie de 10 500 sous le plancher de 20 000');
  return next is(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement = %L and acquittee_le is null and not interne', v_client, 'varelo:tresorerie.' || a)),
                 1::bigint, 'une alerte de trésorerie, visible du client');
  select * into x from public.grp_groupe_page where client_id = v_client and entite_id = bb;
  return next ok(x.ventes = 50000 and x.tresorerie = 90000 and x.objectif_a_date is null and x.ventes_n1 is null and not x.sous_plancher, 'B : ventes et trésorerie, sans objectif ni N-1');

  -- le point du matin
  perform tests.endosser(g, ge);
  r := public.grp_ce_matin(v_client);
  perform tests.redevenir_admin();
  select string_agg(e ->> 'texte', ' | ') into v_motifs from jsonb_array_elements(r -> 'groupe') e;
  return next ok(v_motifs like '%Essai B1 Distribution : trésorerie de 10 500 €, sous son plancher de 20 000 €%'
                 and v_motifs like '%Essai B1 Distribution : ventes de 100 000 € au %, % € sous l''objectif à date%', format('« Le groupe ce matin » : %s', v_motifs));
  perform private.grp_deposer_points((current_date + time '06:00') at time zone 'Europe/Paris');
  return next is(tests.compter('public', 'points_sections', format('client_id = %L and module = ''varelo'' and titre = ''Le groupe ce matin'' and role = ''gerant''', v_client)), 1::bigint,
                 'la section « Le groupe ce matin » est déposée au gérant');

  -- une nouvelle balance remonte la trésorerie : l'alerte se ferme
  perform tests.endosser(g, ge);
  perform public.grp_deposer_balance(v_client, a, current_date - 1, d0,
            jsonb_build_array(jsonb_build_object('compte', '706000', 'credit', '110000'), jsonb_build_object('compte', '512000', 'debit', '42000')), 'Sage 100 — J-1');
  perform tests.redevenir_admin();
  return next is(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement = %L and acquittee_le is null', v_client, 'varelo:tresorerie.' || a)),
                 0::bigint, 'trésorerie à 42 000 : l''alerte est close');
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action in (''varelo.balance.depot'', ''varelo.objectif.regle'', ''varelo.tresorerie.plancher'')', v_client)),
                 6::bigint, 'au journal : quatre balances, un objectif, un passage sous le plancher');
end $f$;

create or replace function tests.test_b1_11_droits() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; a uuid; bb uuid;
  g uuid; ge text := 'b1-gerant@essai.invalid';
  t text;
begin
  b := tests.b1_preparer(3);
  v_client := (b ->> 'client')::uuid; a := (b ->> 'soc_a')::uuid; bb := (b ->> 'soc_b')::uuid; g := (b ->> 'gerant')::uuid;
  perform tests.endosser(g, ge);
  perform public.grp_deposer_balance(v_client, a, current_date, null, jsonb_build_array(jsonb_build_object('compte', '706000', 'credit', '1000')), 'A');
  perform public.grp_deposer_balance(v_client, bb, current_date, null, jsonb_build_array(jsonb_build_object('compte', '706000', 'credit', '2000')), 'B');
  return next throws_ok(format('select public.grp_deposer_balance(%L, %L, current_date + 5, null, ''[]'')', v_client, a), '22023', null, 'un arrêté dans le futur : refusé (22023)');
  return next throws_ok(format('select public.grp_deposer_balance(%L, %L, current_date, current_date - 800, ''[]'')', v_client, a), '22023', null, 'un exercice de plus de deux ans : refusé (22023)');
  return next throws_ok(format('select public.grp_regler_objectif(%L, %L, current_date, -5, null)', v_client, a), '22023', null, 'un objectif négatif : refusé (22023)');
  return next throws_ok(format('insert into public.grp_objectifs (client_id, entite_id, exercice_debut, ventes_objectif) values (%L, %L, current_date, 1)', v_client, a), '42501', null,
                        'le gérant n''écrit pas un objectif à la main (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((b ->> 'collab')::uuid, 'b1-collaborateur@essai.invalid');
  return next throws_ok(format('select public.grp_deposer_balance(%L, %L, current_date, null, ''[]'')', v_client, a), '42501', null, 'un collaborateur ne dépose pas de balance (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((b ->> 'referent')::uuid, 'b1-referent@essai.invalid');
  return next throws_ok(format('select public.grp_regler_objectif(%L, %L, current_date, 1000, null)', v_client, a), '42501', null, 'le référent données ne règle pas un objectif (42501)');
  perform tests.redevenir_admin();
  -- le périmètre partiel : la seule société A
  perform tests.endosser((b ->> 'partiel')::uuid, 'b1-collaborateur-a@essai.invalid');
  return next is(tests.compter('public', 'grp_groupe_page', format('client_id = %L', v_client)), 1::bigint, 'périmètre partiel : une seule société sur la page');
  return next is(tests.compter('public', 'grp_balances_lignes', format('client_id = %L and entite_id = %L', v_client, bb)), 0::bigint, 'ni les lignes de balance de B');
  perform tests.redevenir_admin();
  -- une autre organisation
  perform tests.endosser((b ->> 'etranger')::uuid, 'a5-client-b@essai.invalid');
  foreach t in array array['grp_balances_depots', 'grp_balances_lignes', 'grp_objectifs', 'grp_groupe_page'] loop
    return next is(tests.compter('public', t, format('client_id = %L', v_client)), 0::bigint, format('%s : rien pour une autre organisation', t));
  end loop;
  return next throws_ok(format('select public.grp_deposer_balance(%L, %L, current_date, null, ''[]'')', v_client, a), '42501', null, 'déposer une balance chez un autre groupe : refusé (42501)');
  return next throws_ok(format('select public.grp_regler_objectif(%L, %L, current_date, 1000, null)', v_client, a), '42501', null, 'régler un objectif chez un autre groupe : refusé (42501)');
  perform tests.redevenir_admin();
end $f$;
