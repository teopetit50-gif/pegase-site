-- b1_07 — VARELO, vague 3 : l'encours du groupe par tiers et son plafond (migration b1_04_encours_groupe)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5), b1_00_aides.sql et b1_04.
-- runtests() annule tout ce que le test écrit. Motif : ^test_b1_07_
--
-- Le scénario : la société A (Guadeloupe) et la société B (Martinique) vendent toutes deux à HYPER CARAIBES,
-- sous deux codes clients différents. Chacune dépose sa balance âgée clients ; le référentiel reconnaît le même
-- client (même SIREN) ; le groupe voit 110 000 € d'encours chez lui, la DAF pose un plafond de 100 000 € :
-- une alerte se lève, une seule, et se ferme quand le plafond est relevé ou l'encours redescend.

-- Les balances âgées clients des deux sociétés, telles que Sage et EBP les sortent (montants à la française).
create or replace function tests.b1_encours_a() returns jsonb
language sql immutable as $$
  select jsonb_build_array(
    jsonb_build_object('code', 'C001', 'nom', 'HYPER CARAIBES', 'siren', '849 300 173',
                       'non_echu', '40 000,00', 'echu_30', '12 000', 'echu_plus', '8 000,00 €'),   -- 60 000, dont 20 000 échus
    jsonb_build_object('code', 'C002', 'nom', 'Boulangerie du Port', 'total', '999'),             -- doublon : la ligne suivante gagne
    jsonb_build_object('code', 'C002', 'nom', 'Boulangerie du Port', 'total', '1.500,50', 'echu', '0'),
    jsonb_build_object('code', 'C003', 'solde', '100'),                                           -- code inconnu sans nom : gardé, non inscrit
    jsonb_build_object('code', '', 'nom', 'Sans code', 'total', '5'),                              -- rejet : code local manquant
    jsonb_build_object('code', 'C004', 'nom', 'Montant illisible', 'total', 'douze'),              -- rejet : montant illisible
    jsonb_build_object('code', 'C005', 'nom', 'Sans montant'),                                     -- rejet : aucun montant
    jsonb_build_object('code', 'C006', 'nom', 'Total faux', 'non_echu', '10', 'echu_30', '5', 'total', '20'))  -- rejet : total incohérent
$$;

create or replace function tests.b1_encours_b() returns jsonb
language sql immutable as $$
  select jsonb_build_array(
    jsonb_build_object('code', 'CLHY', 'nom', 'Hyper Caraibes SAS', 'siren', '849300173', 'total', '50000', 'echu', '5000'),
    jsonb_build_object('code', 'SOCA', 'nom', 'Essai B1 Distribution', 'siren', '849300157', 'total', '250000'),  -- intragroupe : la société A
    jsonb_build_object('code', 'AVOIR', 'nom', 'Client crediteur', 'total', '(120,00)'))                      -- avoir : encours négatif
$$;

-- Le groupe jusqu'aux sociétés, les deux balances déposées par le gérant, puis un passage du référentiel.
create or replace function tests.b1_preparer_encours() returns jsonb
language plpgsql as $$
declare
  b jsonb := tests.b1_preparer(3);
  v_client uuid := (b ->> 'client')::uuid;
  v_dep_a jsonb; v_dep_b jsonb; v_rap jsonb;
  v_hyper uuid; v_soca uuid;
begin
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  v_dep_a := public.grp_deposer_encours(v_client, (b ->> 'soc_a')::uuid, 'client', date '2026-09-30', tests.b1_encours_a(), 'Sage 100 — balance âgée au 30/09');
  v_dep_b := public.grp_deposer_encours(v_client, (b ->> 'soc_b')::uuid, 'client', date '2026-09-30', tests.b1_encours_b(), 'EBP — balance âgée au 30/09');
  v_rap := public.grp_rapprocher(v_client, false);
  perform tests.redevenir_admin();
  select c.objet_id into v_hyper from public.grp_ref_codes c
   where c.client_id = v_client and c.entite_id = (b ->> 'soc_a')::uuid and c.nature = 'client' and c.code_local = 'C001';
  select c.objet_id into v_soca from public.grp_ref_codes c
   where c.client_id = v_client and c.entite_id = (b ->> 'soc_b')::uuid and c.nature = 'client' and c.code_local = 'SOCA';
  return b || jsonb_build_object('encours_a', v_dep_a, 'encours_b', v_dep_b, 'rapprochement', v_rap, 'hyper', v_hyper, 'soca', v_soca);
end $$;

-- ---------------------------------------------------------------------------
-- Le dépôt : lecture des montants, rejets, codes inscrits au référentiel, dépôt courant.
create or replace function tests.test_b1_07_depot() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; v_soc_a uuid;
  d jsonb; d2 jsonb; d3 jsonb;
  v_motifs text;
  v_ligne record;
  v_courant record;
begin
  b := tests.b1_preparer(3);
  v_client := (b ->> 'client')::uuid; v_soc_a := (b ->> 'soc_a')::uuid;

  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  d := public.grp_deposer_encours(v_client, v_soc_a, 'client', date '2026-09-30', tests.b1_encours_a(), 'Sage 100');
  perform tests.redevenir_admin();
  return next is((d ->> 'lus')::integer, 8, 'huit lignes lues');
  return next is((d ->> 'retenus')::integer, 3, 'trois lignes retenues (C001, C002 dernière occurrence, C003)');
  return next is(jsonb_array_length(d -> 'rejetes'), 5, 'cinq lignes rejetées');
  select string_agg(r ->> 'motif', ' | ' order by (r ->> 'ligne')::integer) into v_motifs from jsonb_array_elements(d -> 'rejetes') r;
  return next is(v_motifs, 'doublon dans le lot | code local manquant | montant illisible (total) | aucun montant | total différent de la somme de ses tranches',
                 'les motifs, dans l''ordre des lignes');
  return next is((d ->> 'total')::numeric, 61600.50, 'total déposé : 60 000 + 1 500,50 + 100');
  return next is((d ->> 'echu')::numeric, 20000.00, 'échu déposé : 12 000 + 8 000');
  return next is((d ->> 'codes_inscrits')::integer, 2, 'C001 et C002 inconnus du référentiel y sont inscrits');
  return next is((d ->> 'codes_inconnus_sans_nom')::integer, 1, 'C003, sans nom, n''est pas inscrit');

  select * into v_ligne from public.grp_encours_lignes l where l.depot_id = (d ->> 'depot')::uuid and l.code_local = 'C001';
  return next ok(v_ligne.non_echu = 40000 and v_ligne.echu_30 = 12000 and v_ligne.echu_plus = 8000 and v_ligne.total = 60000 and v_ligne.echu = 20000,
                 'C001 : « 40 000,00 », « 12 000 », « 8 000,00 € » lus en tranches, total 60 000');
  select * into v_ligne from public.grp_encours_lignes l where l.depot_id = (d ->> 'depot')::uuid and l.code_local = 'C002';
  return next ok(v_ligne.total = 1500.50 and v_ligne.non_echu = 1500.50, 'C002 : « 1.500,50 » lu 1 500,50, la dernière ligne du code gagne');
  return next is(tests.compter('public', 'grp_ref_codes', format('client_id = %L and entite_id = %L and nature = ''client'' and code_local in (''C001'', ''C002'') and siren is not distinct from (case code_local when ''C001'' then ''849300173'' end)', v_client, v_soc_a)),
                 2::bigint, 'les deux codes inscrits portent leurs identifiants (le SIREN de C001)');
  return next is(tests.compter('public', 'travaux', format('client_id = %L and genre = ''varelo.referentiel.rapprocher'' and etat = ''a_faire''', v_client)),
                 1::bigint, 'l''inscription dépose le travail de rapprochement');

  -- un code déjà connu n'est pas réécrit par un dépôt d'encours (son nom ni son SIREN)
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  d2 := public.grp_deposer_encours(v_client, v_soc_a, 'client', date '2026-10-05',
          jsonb_build_array(jsonb_build_object('code', 'C001', 'nom', 'AUTRE NOM', 'total', '30 000')), 'Sage 100 au 05/10');
  perform tests.redevenir_admin();
  return next is((d2 ->> 'codes_inscrits')::integer, 0, 'un code connu n''est pas réinscrit');
  return next is(tests.compter('public', 'grp_ref_codes', format('client_id = %L and entite_id = %L and code_local = ''C001'' and nom_local = ''HYPER CARAIBES'' and siren = ''849300173''', v_client, v_soc_a)),
                 1::bigint, 'le nom et le SIREN de C001 restent ceux du référentiel');
  select * into v_courant from public.grp_encours_courant c where c.client_id = v_client and c.entite_id = v_soc_a and c.nature = 'client';
  return next ok(v_courant.depot_id = (d2 ->> 'depot')::uuid and v_courant.arrete_le = date '2026-10-05' and v_courant.total = 30000,
                 'le dépôt au 05/10 devient le dépôt courant de la société A');
  -- une correction d'un arrêté plus ancien, déposée après, ne le remplace pas
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  d3 := public.grp_deposer_encours(v_client, v_soc_a, 'client', date '2026-09-01',
          jsonb_build_array(jsonb_build_object('code', 'C001', 'total', '1')), 'rattrapage au 01/09');
  perform tests.redevenir_admin();
  select * into v_courant from public.grp_encours_courant c where c.client_id = v_client and c.entite_id = v_soc_a and c.nature = 'client';
  return next is(v_courant.depot_id, (d2 ->> 'depot')::uuid, 'un arrêté plus ancien déposé ensuite ne remplace pas le courant');
  return next is(tests.compter('public', 'grp_encours_depots', format('client_id = %L and entite_id = %L', v_client, v_soc_a)), 3::bigint,
                 'les trois dépôts sont gardés (rien ne s''efface)');

  -- les montants : formats reconnus, avoir négatif
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  d := public.grp_deposer_encours(v_client, (b ->> 'soc_b')::uuid, 'fournisseur', date '2026-09-30', jsonb_build_array(
         jsonb_build_object('code', 'F1', 'total', '1,234.56'), jsonb_build_object('code', 'F2', 'total', '12,50-'),
         jsonb_build_object('code', 'F3', 'total', '(7)'), jsonb_build_object('code', 'F4', 'total', 42.4),
         jsonb_build_object('code', 'F5', 'echu', '300')), 'formats');
  perform tests.redevenir_admin();
  return next is((d ->> 'total')::numeric, 1234.56 - 12.50 - 7 + 42.40 + 300, 'montants « 1,234.56 », « 12,50- », « (7) », 42.4 et un échu seul : lus');
  return next is((select l.echu_autre from public.grp_encours_lignes l where l.depot_id = (d ->> 'depot')::uuid and l.code_local = 'F5'), 300.00::numeric(16,2),
                 'un échu sans tranche est gardé à part (échu sans ancienneté)');

  -- les refus
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  return next throws_ok(format('select public.grp_deposer_encours(%L, %L, ''article'', current_date, ''[]'', null)', v_client, v_soc_a), '22023', null,
                        'une balance âgée d''articles : refusée (22023)');
  return next throws_ok(format('select public.grp_deposer_encours(%L, %L, ''client'', current_date + 10, ''[]'', null)', v_client, v_soc_a), '22023', null,
                        'un arrêté dans le futur : refusé (22023)');
  return next throws_ok(format('select public.grp_deposer_encours(%L, %L, ''client'', current_date, ''[]'', null)', v_client, (b ->> 'pole_d')), '22023', null,
                        'une entité qui n''est pas une société du groupe : refusée (22023)');
  perform tests.redevenir_admin();
  perform tests.endosser((b ->> 'collab')::uuid, 'b1-collaborateur@essai.invalid');
  return next throws_ok(format('select public.grp_deposer_encours(%L, %L, ''client'', current_date, ''[]'', null)', v_client, v_soc_a), '42501', null,
                        'un collaborateur ne dépose pas de balance âgée (42501)');
  perform tests.redevenir_admin();
end $f$;

-- ---------------------------------------------------------------------------
-- L'encours du groupe et le plafond : un client vu de deux sociétés, une alerte, une seule, qui se ferme.
create or replace function tests.test_b1_07_plafond() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; v_hyper uuid;
  g record;
  r jsonb;
  v_fourn uuid;
begin
  b := tests.b1_preparer_encours();
  v_client := (b ->> 'client')::uuid; v_hyper := (b ->> 'hyper')::uuid;
  return next isnt(v_hyper, null::uuid, 'C001 a son objet du groupe après le passage');
  return next is(tests.compter('public', 'grp_ref_codes', format('client_id = %L and nature = ''client'' and objet_id = %L', v_client, v_hyper)), 2::bigint,
                 'le passage place CLHY (société B) sur l''objet de C001 : même SIREN');

  perform tests.endosser((b ->> 'daf')::uuid, 'b1-daf@essai.invalid');
  select * into g from public.grp_encours_groupe x where x.client_id = v_client and x.objet_id = v_hyper;
  perform tests.redevenir_admin();
  return next ok(g.total = 110000 and g.echu = 25000 and g.echu_plus_90 = 8000 and g.societes = 2 and g.codes = 2,
                 format('encours du groupe chez Hyper Caraïbes : 110 000 dont 25 000 échus, 8 000 à plus de 90 jours, deux sociétés (%s / %s / %s)', g.total, g.echu, g.societes));
  return next ok(g.provisoire, 'provisoire : le code de B n''est que proposé, en attente du référent');
  return next ok(g.plafond is null and not g.depasse, 'sans plafond, rien ne dépasse');
  -- l'intragroupe est vu à part et ne lève jamais d'alerte
  return next is(tests.compter('public', 'grp_encours_groupe', format('client_id = %L and objet_id = %L and intragroupe and total = 250000', v_client, b ->> 'soca')),
                 1::bigint, 'les 250 000 que B facture à A sont marqués intragroupe');

  -- la DAF (valideur, direction financière) pose 100 000 : l'alerte se lève, une seule
  perform tests.endosser((b ->> 'daf')::uuid, 'b1-daf@essai.invalid');
  r := public.grp_regler_plafond(v_hyper, 100000, null, 'Assurance-crédit : 100 k€');
  perform tests.redevenir_admin();
  return next ok((r ->> 'depasse')::boolean and (r ->> 'total')::numeric = 110000, 'la DAF pose 100 000 : le client dépasse');
  return next is(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement = %L and acquittee_le is null and not interne and niveau = ''attention''', v_client, 'varelo:encours.' || v_hyper)),
                 1::bigint, 'une alerte « attention », visible du client, est levée');
  -- un nouveau dépôt qui laisse le dépassement ne relève pas une seconde alerte
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  perform public.grp_deposer_encours(v_client, (b ->> 'soc_b')::uuid, 'client', date '2026-10-01',
            jsonb_build_array(jsonb_build_object('code', 'CLHY', 'total', '55000'), jsonb_build_object('code', 'SOCA', 'total', '250000')), 'EBP au 01/10');
  perform tests.redevenir_admin();
  return next is(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement = %L', v_client, 'varelo:encours.' || v_hyper)),
                 1::bigint, 'le dépôt suivant (115 000) ne lève pas de seconde alerte');
  -- le plafond de l'échu, seul, suffit aussi à dépasser
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  r := public.grp_regler_plafond(v_hyper, 200000, 10000, 'Relevé, mais l''échu est surveillé');
  perform tests.redevenir_admin();
  return next ok((r ->> 'depasse')::boolean, 'plafond 200 000 mais échu 20 000 > 10 000 : le client dépasse encore');
  return next is(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement = %L and acquittee_le is null', v_client, 'varelo:encours.' || v_hyper)),
                 1::bigint, 'toujours une seule alerte ouverte');
  -- relevé sans plafond d'échu : l'alerte se ferme d'elle-même
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  r := public.grp_regler_plafond(v_hyper, 200000, null, 'Garantie bancaire reçue');
  perform tests.redevenir_admin();
  return next ok(not (r ->> 'depasse')::boolean, 'plafond 200 000 sans plafond d''échu : sous le plafond');
  return next is(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement = %L and acquittee_le is null', v_client, 'varelo:encours.' || v_hyper)),
                 0::bigint, 'l''alerte est close d''elle-même');
  -- retiré : actif = false, rien ne s'efface
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  perform public.grp_regler_plafond(v_hyper, null, null, 'Client sorti de l''assurance-crédit');
  perform tests.redevenir_admin();
  return next is(tests.compter('public', 'grp_encours_plafonds', format('client_id = %L and objet_id = %L and not actif', v_client, v_hyper)), 1::bigint,
                 'un plafond retiré reste en base, inactif');

  -- les refus
  perform tests.endosser((b ->> 'referent')::uuid, 'b1-referent@essai.invalid');
  return next throws_ok(format('select public.grp_regler_plafond(%L, 1000)', v_hyper), '42501', null,
                        'le référent données (valideur hors direction financière) ne règle pas un plafond (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((b ->> 'collab')::uuid, 'b1-collaborateur@essai.invalid');
  return next throws_ok(format('select public.grp_regler_plafond(%L, 1000)', v_hyper), '42501', null,
                        'un collaborateur ne règle pas un plafond (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  return next throws_ok(format('select public.grp_regler_plafond(%L, 0)', v_hyper), '22023', null, 'un plafond nul : refusé (22023)');
  return next throws_ok(format('select public.grp_regler_plafond(%L, 1000)', b ->> 'soca'), '22023', null,
                        'un client intragroupe (la société A vue de B) n''a pas de plafond (22023)');
  perform public.grp_deposer_codes(v_client, (b ->> 'soc_a')::uuid, 'fournisseur', jsonb_build_array(jsonb_build_object('code', 'FX', 'nom', 'Fournisseur X')), 'essai');
  perform public.grp_rapprocher(v_client, false);
  perform tests.redevenir_admin();
  select c.objet_id into v_fourn from public.grp_ref_codes c where c.client_id = v_client and c.nature = 'fournisseur' and c.code_local = 'FX';
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  return next throws_ok(format('select public.grp_regler_plafond(%L, 1000)', v_fourn), '22023', null, 'un fournisseur n''a pas de plafond d''encours (22023)');
  perform tests.redevenir_admin();

end $f$;

-- ---------------------------------------------------------------------------
-- Périmètre, isolement, journal.
create or replace function tests.test_b1_07_perimetre() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; v_soc_a uuid;
  t text;
begin
  b := tests.b1_preparer_encours();
  v_client := (b ->> 'client')::uuid; v_soc_a := (b ->> 'soc_a')::uuid;

  -- le collaborateur rattaché à la seule société A ne voit que l'encours de A
  perform tests.endosser((b ->> 'partiel')::uuid, 'b1-collaborateur-a@essai.invalid');
  return next is(tests.compter('public', 'grp_encours_par_code', format('client_id = %L and entite_id <> %L', v_client, v_soc_a)), 0::bigint,
                 'périmètre partiel : aucune ligne d''une autre société');
  return next cmp_ok(tests.compter('public', 'grp_encours_par_code', format('client_id = %L and entite_id = %L', v_client, v_soc_a)), '>=', 2::bigint,
                     'périmètre partiel : les lignes de la société A');
  return next is(tests.compter('public', 'grp_encours_depots', format('client_id = %L and entite_id <> %L', v_client, v_soc_a)), 0::bigint,
                 'périmètre partiel : aucun dépôt d''une autre société');
  perform tests.redevenir_admin();

  -- une autre organisation ne lit rien et ne dépose rien
  perform tests.endosser((b ->> 'etranger')::uuid, 'a5-client-b@essai.invalid');
  foreach t in array array['grp_encours_depots', 'grp_encours_lignes', 'grp_encours_plafonds', 'grp_encours_courant', 'grp_encours_par_code', 'grp_encours_groupe'] loop
    return next is(tests.compter('public', t, format('client_id = %L', v_client)), 0::bigint, format('%s : aucune ligne du groupe pour une autre organisation', t));
  end loop;
  return next throws_ok(format('select public.grp_deposer_encours(%L, %L, ''client'', current_date, ''[]'', null)', v_client, v_soc_a), '42501', null,
                        'déposer une balance âgée chez un autre groupe : refusé (42501)');
  return next throws_ok(format('select public.grp_regler_plafond(%L, 1000)', b ->> 'hyper'), 'P0002', null,
                        'régler le plafond d''un client d''un autre groupe : introuvable (P0002)');
  perform tests.redevenir_admin();

  -- personne n'écrit les tables à la main
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  return next throws_ok(format('insert into public.grp_encours_plafonds (client_id, objet_id, plafond) values (%L, %L, 1)', v_client, b ->> 'hyper'), '42501', null,
                        'le gérant n''écrit pas un plafond à la main (42501)');
  return next throws_ok(format('update public.grp_encours_lignes set non_echu = 0 where client_id = %L', v_client), '42501', null,
                        'personne ne corrige une ligne d''encours à la main (42501)');
  perform tests.redevenir_admin();

  -- le journal opposable
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action = ''varelo.encours.depot''', v_client)), 2::bigint,
                 'deux dépôts journalisés (varelo.encours.depot)');
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  perform public.grp_regler_plafond((b ->> 'hyper')::uuid, 50000, null, 'essai');
  perform tests.redevenir_admin();
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action = ''varelo.encours.plafond''', v_client)), 1::bigint,
                 'le plafond journalisé (varelo.encours.plafond)');
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action = ''varelo.encours.depassement''', v_client)), 1::bigint,
                 'le dépassement journalisé (varelo.encours.depassement)');
end $f$;
