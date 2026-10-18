-- b1_09 — VARELO, vague 3 : les comptes réciproques intragroupe (migration b1_06_reciproques, après b1_04)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5), b1_00_aides.sql et b1_06.
-- runtests() annule tout ce que le test écrit. Motif : ^test_b1_09_
--
-- Le scénario, à l'arrêté J-5 : la société A (Distribution) dit que B (Logistique) lui doit 10 000 € ; B dit
-- devoir 9 500 € à A : 500 € d'écart (une facture en transit). B dit que A lui doit 3 000 € ; A le reconnaît :
-- concorde. C (Services) dit que A lui doit 700 € ; A n'a aucun code pour C dans sa balance fournisseurs.

create or replace function tests.b1_preparer_reciproques() returns jsonb
language plpgsql as $$
declare
  b jsonb := tests.b1_preparer(3);
  v_client uuid := (b ->> 'client')::uuid;
  a uuid := (b ->> 'soc_a')::uuid; bb uuid := (b ->> 'soc_b')::uuid; c uuid := (b ->> 'soc_c')::uuid;
  j date := current_date - 5;
begin
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  perform public.grp_deposer_encours(v_client, a, 'client', j, jsonb_build_array(
    jsonb_build_object('code', 'SOCB', 'nom', 'Essai B1 Logistique', 'siren', '849300140', 'total', '10 000,00'),
    jsonb_build_object('code', 'C100', 'nom', 'Client ordinaire', 'total', '1 234')), 'A clients');
  perform public.grp_deposer_encours(v_client, a, 'fournisseur', j, jsonb_build_array(
    jsonb_build_object('code', 'FSOCB', 'nom', 'ESSAI B1 LOGISTIQUE', 'siren', '849300140', 'total', '3000')), 'A fournisseurs');
  perform public.grp_deposer_encours(v_client, bb, 'fournisseur', j, jsonb_build_array(
    jsonb_build_object('code', 'FSOCA', 'nom', 'Essai B1 Distribution', 'siren', '849300157', 'total', '9 500,00')), 'B fournisseurs');
  perform public.grp_deposer_encours(v_client, bb, 'client', j, jsonb_build_array(
    jsonb_build_object('code', 'CLA', 'nom', 'Essai B1 Distribution', 'siren', '849300157', 'total', '3 000')), 'B clients');
  perform public.grp_deposer_encours(v_client, c, 'client', j, jsonb_build_array(
    jsonb_build_object('code', 'CA', 'nom', 'ESSAI B1 DISTRIBUTION', 'siren', '849300157', 'total', '700')), 'C clients');
  perform public.grp_rapprocher(v_client, false);
  perform tests.redevenir_admin();
  return b || jsonb_build_object('arrete', j);
end $$;

-- ---------------------------------------------------------------------------
create or replace function tests.test_b1_09_paires() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; a uuid; bb uuid; c uuid;
  x record;
  v_j uuid;
begin
  b := tests.b1_preparer_reciproques();
  v_client := (b ->> 'client')::uuid; a := (b ->> 'soc_a')::uuid; bb := (b ->> 'soc_b')::uuid; c := (b ->> 'soc_c')::uuid;

  perform tests.endosser((b ->> 'daf')::uuid, 'b1-daf@essai.invalid');
  select * into x from public.grp_reciproques where client_id = v_client and creancier_id = a and debiteur_id = bb;
  return next ok(x.creance = 10000 and x.dette = 9500 and x.ecart = 500 and x.etat = 'ecart',
                 format('A sur B : créance 10 000, dette reconnue 9 500, écart 500 à expliquer (%s / %s / %s / %s)', x.creance, x.dette, x.ecart, x.etat));
  select * into x from public.grp_reciproques where client_id = v_client and creancier_id = bb and debiteur_id = a;
  return next ok(x.creance = 3000 and x.dette = 3000 and x.etat = 'concorde', format('B sur A : 3 000 des deux côtés, concorde (%s)', x.etat));
  select * into x from public.grp_reciproques where client_id = v_client and creancier_id = c and debiteur_id = a;
  return next ok(x.creance = 700 and x.dette is null and x.etat = 'manque_debiteur', format('C sur A : A ne reconnaît rien, manque côté débiteur (%s)', x.etat));
  return next is(tests.compter('public', 'grp_reciproques', format('client_id = %L', v_client)), 3::bigint, 'trois paires, le client ordinaire n''en fait pas partie');

  -- la DAF justifie l'écart A→B : la paire passe « justifie »
  v_j := public.grp_justifier_ecart(v_client, a, bb, 'en_transit', 'Facture F-778 du 30/09, reçue par B le 2/10.');
  select * into x from public.grp_reciproques where client_id = v_client and creancier_id = a and debiteur_id = bb;
  perform tests.redevenir_admin();
  return next ok(x.etat = 'justifie' and x.categorie = 'en_transit' and x.justification_id = v_j, 'justifié par la DAF : en transit');
  -- un nouveau dépôt de B qui change l'écart rend la justification caduque
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  perform public.grp_deposer_encours(v_client, bb, 'fournisseur', (b ->> 'arrete')::date, jsonb_build_array(
    jsonb_build_object('code', 'FSOCA', 'total', '9 800')), 'B fournisseurs corrigés');
  select * into x from public.grp_reciproques where client_id = v_client and creancier_id = a and debiteur_id = bb;
  return next ok(x.ecart = 200 and x.etat = 'ecart' and x.justification_id is null, format('B corrige à 9 800 : l''écart de 200 est à justifier de nouveau (%s)', x.etat));
  -- des arrêtés différents ne se comparent pas
  perform public.grp_deposer_encours(v_client, bb, 'fournisseur', current_date - 1, jsonb_build_array(
    jsonb_build_object('code', 'FSOCA', 'total', '10 000')), 'B fournisseurs à J-1');
  select * into x from public.grp_reciproques where client_id = v_client and creancier_id = a and debiteur_id = bb;
  perform tests.redevenir_admin();
  return next ok(x.etat = 'dates_differentes' and x.arrete_creancier = current_date - 5 and x.arrete_debiteur = current_date - 1,
                 'montants égaux mais arrêtés différents (J-5, J-1) : « dates différentes », pas « concorde »');

  -- les refus
  perform tests.endosser((b ->> 'referent')::uuid, 'b1-referent@essai.invalid');
  return next throws_ok(format('select public.grp_justifier_ecart(%L, %L, %L, ''litige'', ''x'')', v_client, a, bb), '42501', null, 'le référent données ne justifie pas un écart (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((b ->> 'collab')::uuid, 'b1-collaborateur@essai.invalid');
  return next throws_ok(format('select public.grp_justifier_ecart(%L, %L, %L, ''litige'', ''x'')', v_client, a, bb), '42501', null, 'un collaborateur non plus (42501)');
  return next throws_ok(format('select public.grp_exporter_reciproques(%L)', v_client), '42501', null, 'un collaborateur n''exporte pas les réciproques (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  return next throws_ok(format('select public.grp_justifier_ecart(%L, %L, %L, ''litige'', ''Rien'')', v_client, bb, a), '22023', null, 'une paire qui concorde : rien à justifier (22023)');
  return next throws_ok(format('select public.grp_justifier_ecart(%L, %L, %L, ''litige'', ''  '')', v_client, a, bb), '22023', null, 'sans motif : refusé (22023)');
  return next throws_ok(format('select public.grp_justifier_ecart(%L, %L, %L, ''oubli'', ''x'')', v_client, a, bb), '22023', null, 'catégorie inconnue : refusée (22023)');
  return next throws_ok(format('select public.grp_justifier_ecart(%L, %L, %L, ''litige'', ''x'')', v_client, a, c), 'P0002', null, 'aucune réciproque entre A et C dans ce sens : introuvable (P0002)');
  perform tests.redevenir_admin();
end $f$;

-- ---------------------------------------------------------------------------
create or replace function tests.test_b1_09_export_isolement() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; a uuid; bb uuid;
  csv text;
begin
  b := tests.b1_preparer_reciproques();
  v_client := (b ->> 'client')::uuid; a := (b ->> 'soc_a')::uuid; bb := (b ->> 'soc_b')::uuid;

  perform tests.endosser((b ->> 'daf')::uuid, 'b1-daf@essai.invalid');
  perform public.grp_justifier_ecart(v_client, a, bb, 'litige', '=HYPERLIEN("x") ; avoir contesté');
  csv := public.grp_exporter_reciproques(v_client);
  perform tests.redevenir_admin();
  return next ok(csv like 'creancier;debiteur;creance;arrete_creancier;dette;arrete_debiteur;ecart;etat;categorie;motif' || E'\n%', 'l''export commence par son en-tête');
  return next is(array_length(string_to_array(csv, E'\n'), 1), 4, 'l''en-tête et trois paires');
  return next ok(position('Essai B1 Distribution;Essai B1 Logistique;10000,00;' in csv) > 0 and position(';500,00;justifie;litige;' in csv) > 0,
                 'A sur B : 10 000,00, écart 500,00, justifié (litige), montants à la française');
  return next ok(position(';"''=HYPERLIEN(""x"") ; avoir contesté"' in csv) > 0, 'un motif qui commence par = est neutralisé et mis entre guillemets');
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action in (''varelo.reciproques.justification'', ''varelo.reciproques.export'')', v_client)), 2::bigint,
                 'la justification et l''export sont au journal');

  -- une autre organisation ne lit rien et n'agit pas
  perform tests.endosser((b ->> 'etranger')::uuid, 'a5-client-b@essai.invalid');
  return next is(tests.compter('public', 'grp_reciproques', format('client_id = %L', v_client)), 0::bigint, 'grp_reciproques : rien pour une autre organisation');
  return next is(tests.compter('public', 'grp_reciproques_justifs', format('client_id = %L', v_client)), 0::bigint, 'grp_reciproques_justifs : rien pour une autre organisation');
  return next throws_ok(format('select public.grp_justifier_ecart(%L, %L, %L, ''litige'', ''x'')', v_client, a, bb), '42501', null, 'justifier chez un autre groupe : refusé (42501)');
  return next throws_ok(format('select public.grp_exporter_reciproques(%L)', v_client), '42501', null, 'exporter chez un autre groupe : refusé (42501)');
  perform tests.redevenir_admin();
  -- personne n'écrit une justification à la main
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  return next throws_ok(format('insert into public.grp_reciproques_justifs (client_id, creancier_id, debiteur_id, ecart, categorie, motif) values (%L, %L, %L, 0, ''autre'', ''x'')', v_client, a, bb),
                        '42501', null, 'le gérant n''écrit pas une justification à la main (42501)');
  perform tests.redevenir_admin();
end $f$;
