-- b1_05 — VARELO, étape 11 : les corrections proposées par une personne (nom, rattachement, fusion, détachement, scission)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5) et b1_00_aides.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_b1_05_corrections() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; v_soc_a uuid; v_soc_b uuid;
  f0123 public.grp_ref_codes; f0200 public.grp_ref_codes; f0300 public.grp_ref_codes; f0600 public.grp_ref_codes;
  trcar public.grp_ref_codes; impda public.grp_ref_codes;
  v_dem uuid; v_dem2 uuid; v_dem3 uuid;
  d public.demandes_validation;
  p public.grp_ref_propositions;
  o public.grp_ref_objets;
  v_obj_impda uuid;
begin
  b := tests.b1_preparer(7);
  v_client := (b ->> 'client')::uuid; v_soc_a := (b ->> 'soc_a')::uuid; v_soc_b := (b ->> 'soc_b')::uuid;
  f0123 := tests.b1_code(v_client, v_soc_a, 'F0123'); f0200 := tests.b1_code(v_client, v_soc_a, 'F0200');
  f0300 := tests.b1_code(v_client, v_soc_a, 'F0300'); f0600 := tests.b1_code(v_client, v_soc_a, 'F0600');
  trcar := tests.b1_code(v_client, v_soc_b, 'TRCAR'); impda := tests.b1_code(v_client, v_soc_b, 'IMPDA');
  v_obj_impda := impda.objet_id;

  -- une autre organisation ne propose rien chez le banc
  perform tests.endosser((b ->> 'etranger')::uuid, 'a5-client-b@essai.invalid');
  return next throws_ok(format('select public.grp_proposer_nom(%L, ''Pirate'', null)', f0300.objet_id), null, null, 'une autre organisation ne propose rien chez le banc');
  perform tests.redevenir_admin();

  -- 11. un collaborateur propose un nom
  perform tests.endosser((b ->> 'collab')::uuid, 'b1-collaborateur@essai.invalid');
  v_dem := public.grp_proposer_nom(f0300.objet_id, 'Imprimerie Antillaise (groupe)', 'Nom d''usage dans le groupe');
  return next ok(v_dem is not null, 'grp_proposer_nom rend l''identifiant de la demande');
  -- refus : nom vide, deuxième proposition sur le même objet
  return next throws_ok(format('select public.grp_proposer_nom(%L, ''   '', null)', f0300.objet_id), '22023', null, 'un nom vide est refusé (22023)');
  return next throws_ok(format('select public.grp_proposer_nom(%L, ''Autre nom'', null)', f0300.objet_id), '23514', null,
                        'une seconde proposition sur le même objet attend la première (23514)');
  -- un rattachement : IMPDA rejoint l'objet de F0300
  v_dem2 := public.grp_proposer_rattachement(impda.id, f0300.objet_id, 'Même imprimerie, deux libellés');
  return next ok(v_dem2 is not null, 'grp_proposer_rattachement rend l''identifiant de la demande');
  -- refus : identifiants qui se contredisent, code déjà là, code en attente, dernier code, scission d''un code en attente
  return next throws_ok(format('select public.grp_proposer_rattachement(%L, %L, null)', f0200.id, f0123.objet_id), '23514', null,
                        'deux SIREN se contredisent : le rattachement est refusé (23514)');
  return next throws_ok(format('select public.grp_proposer_rattachement(%L, %L, null)', f0123.id, f0123.objet_id), '23514', null,
                        'un code déjà rattaché à l''objet : refusé (23514)');
  return next throws_ok(format('select public.grp_proposer_rattachement(%L, %L, null)', trcar.id, f0200.objet_id), '23514', null,
                        'un code qui attend déjà sa validation ne bouge pas (23514)');
  return next throws_ok(format('select public.grp_proposer_detachement(%L, null)', f0600.id), '23514', null,
                        'on ne détache pas le dernier code d''un objet (23514)');
  return next throws_ok(format('select public.grp_proposer_scission(%L, %L, null)', f0123.objet_id, array[trcar.id]::uuid[]), '23514', null,
                        'on ne scinde pas un code qui attend sa validation (23514)');
  return next throws_ok(format('select public.grp_proposer_fusion(%L, %L, null)', f0600.objet_id, f0600.objet_id), '23514', null,
                        'un objet ne fusionne pas avec lui-même (23514)');
  -- une fusion : l'objet de F0600 dans celui de F0300
  v_dem3 := public.grp_proposer_fusion(f0600.objet_id, f0300.objet_id, 'Même fournisseur');
  return next ok(v_dem3 is not null, 'grp_proposer_fusion rend l''identifiant de la demande');
  return next throws_ok(format('select public.grp_proposer_fusion(%L, %L, null)', f0600.objet_id, impda.objet_id), '23514', null,
                        'une seconde fusion du même objet attend la première (23514)');
  perform tests.redevenir_admin();

  -- les demandes ouvertes
  select * into d from public.demandes_validation k where k.id = v_dem;
  return next is(d.module, 'varelo', 'la demande de nom est du module varelo');
  return next is(d.type_action, 'renommer_objet', '… type renommer_objet');
  return next is(d.statut, 'en_attente', '… en attente');
  return next matches(d.resume, '^Référentiel : renommer F-[0-9]+\.$', format('… résumé : %s', d.resume));
  return next is(d.payload ->> 'genre', 'renommer', '… charge genre renommer');
  select * into p from public.grp_ref_propositions k where k.id = (d.payload ->> 'proposition')::uuid;
  return next is(p.preuve, 'humaine', 'la proposition est humaine');
  return next is(p.nom, 'Imprimerie Antillaise (groupe)', '… et porte le nom proposé');
  return next ok(p.raisons @> '[{"critere": "humain", "raison": "Nom d''usage dans le groupe"}]', '… avec la raison donnée');
  select * into d from public.demandes_validation k where k.id = v_dem2;
  return next is(d.type_action, 'fusionner_objets', 'le rattachement d''un code seul sur son objet est une fusion d''objets');
  return next is(d.entite_id, v_soc_b, '… portée par la société du code');

  -- le collaborateur n'approuve pas sa propre demande ; le référent si
  return next throws_ok(format('select tests.b1_decider(%L, ''b1-collaborateur@essai.invalid'', %L, %L, ''approuve'')', b ->> 'collab', v_client, v_dem), null, null,
                        'le collaborateur n''approuve pas sa propre proposition');
  return next lives_ok(format('select tests.b1_decider(%L, ''b1-referent@essai.invalid'', %L, %L, ''approuve'')', b ->> 'referent', v_client, v_dem), 'le référent approuve le nom');
  return next lives_ok(format('select tests.b1_decider(%L, ''b1-referent@essai.invalid'', %L, %L, ''approuve'')', b ->> 'referent', v_client, v_dem2), 'le référent approuve le rattachement');
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  perform public.grp_appliquer_decisions(v_client);
  perform tests.redevenir_admin();
  select * into o from public.grp_ref_objets k where k.id = f0300.objet_id;
  return next is(o.nom_groupe, 'Imprimerie Antillaise (groupe)', 'l''objet porte le nom approuvé');
  return next is(o.nom_origine, 'humain', '… d''origine humaine : le calcul ne le renommera plus');
  impda := tests.b1_code(v_client, v_soc_b, 'IMPDA');
  return next is(impda.objet_id, f0300.objet_id, 'IMPDA est sur l''objet de F0300');
  return next is(impda.etat, 'confirme', '… confirmé');
  return next is(impda.methode, 'humain', '… par une personne');
  select * into o from public.grp_ref_objets k where k.id = v_obj_impda;
  return next is(o.statut, 'fusionne', 'l''objet laissé vide par IMPDA est fusionné…');
  return next is(o.fusionne_dans, f0300.objet_id, '… dans celui de F0300');
  select * into d from public.demandes_validation k where k.id = v_dem;
  return next is(d.statut, 'executee', 'la demande de nom est exécutée');

  -- une fusion ne se défait pas ; le code du groupe ne change jamais
  return next throws_ok(format('update public.grp_ref_objets set statut = ''actif'', fusionne_dans = null where id = %L', v_obj_impda), null, null,
                        'une fusion ne se défait pas par UPDATE');
  return next throws_ok(format('update public.grp_ref_objets set numero = numero + 1 where id = %L', f0300.objet_id), null, null,
                        'le code du groupe ne change jamais');
end $f$;

select * from runtests('tests'::name, '^test_b1_05_');
