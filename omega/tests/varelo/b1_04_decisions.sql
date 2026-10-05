-- b1_04 — VARELO, étapes 9, 10, 12 et 13 : écarter une paire, approuver le lot, séparation, deux approbations
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5) et b1_00_aides.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_b1_04_ecarter_et_approuver() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; v_soc_a uuid; v_soc_b uuid;
  f0123 public.grp_ref_codes; f0400 public.grp_ref_codes; trcar public.grp_ref_codes; essai_b1 public.grp_ref_codes;
  p_trcar public.grp_ref_propositions; p_essai_b1 public.grp_ref_propositions;
  d public.demandes_validation;
  v_obj_essai_b1 uuid;
  v_exec jsonb;
begin
  b := tests.b1_preparer(7);
  v_client := (b ->> 'client')::uuid; v_soc_a := (b ->> 'soc_a')::uuid; v_soc_b := (b ->> 'soc_b')::uuid;
  f0123 := tests.b1_code(v_client, v_soc_a, 'F0123'); f0400 := tests.b1_code(v_client, v_soc_a, 'F0400');
  trcar := tests.b1_code(v_client, v_soc_b, 'TRCAR'); essai_b1 := tests.b1_code(v_client, v_soc_b, 'ESSAI');
  select * into p_trcar from public.grp_ref_propositions k where k.code_id = trcar.id and k.statut = 'a_valider';
  select * into p_essai_b1 from public.grp_ref_propositions k where k.code_id = essai_b1.id and k.statut = 'a_valider';
  v_obj_essai_b1 := essai_b1.objet_id;

  -- 9. un collaborateur hors équipe n'écarte pas ; une autre organisation ne voit pas la proposition
  perform tests.endosser((b ->> 'collab')::uuid, 'b1-collaborateur@essai.invalid');
  return next throws_ok(format('select public.grp_ecarter_proposition(%L, ''pas à moi'')', p_essai_b1.id), null, null, 'un collaborateur hors équipe n''écarte pas une paire');
  perform tests.redevenir_admin();
  perform tests.endosser((b ->> 'etranger')::uuid, 'a5-client-b@essai.invalid');
  return next throws_ok(format('select public.grp_ecarter_proposition(%L, ''pas à moi'')', p_essai_b1.id), 'P0002', null, 'une autre organisation : proposition introuvable (P0002)');
  perform tests.redevenir_admin();

  -- le référent écarte la paire ESSAI
  perform tests.endosser((b ->> 'referent')::uuid, 'b1-referent@essai.invalid');
  return next lives_ok(format('select public.grp_ecarter_proposition(%L, ''C''''est la société elle-même, pas un fournisseur à regrouper.'')', p_essai_b1.id), 'le référent écarte la paire ESSAI');
  return next throws_ok(format('select public.grp_ecarter_proposition(%L, ''encore'')', p_essai_b1.id), '23514', null, 'écartée deux fois : refusé (23514)');
  perform tests.redevenir_admin();
  select * into p_essai_b1 from public.grp_ref_propositions k where k.id = p_essai_b1.id;
  return next is(p_essai_b1.statut, 'ecartee', 'la proposition passe « écartée »');
  return next is(p_essai_b1.decide_par, (b ->> 'referent')::uuid, '… signée du référent');
  return next matches(p_essai_b1.motif, '^C''est la société elle-même', '… avec son motif');
  essai_b1 := tests.b1_code(v_client, v_soc_b, 'ESSAI');
  return next is(essai_b1.etat, 'nouveau', 'le code ESSAI repart « nouveau »…');
  return next isnt(essai_b1.objet_id, v_obj_essai_b1, '… sur un objet à lui');
  return next is(essai_b1.methode, 'rejet', '… méthode rejet');
  return next is(essai_b1.a_rapprocher, false, '… et ne sera pas reproposé au prochain passage');
  select * into d from public.demandes_validation k where k.id = p_trcar.demande_id;
  return next is(d.statut, 'en_attente', 'le lot reste en attente : il porte encore TRCAR');

  -- 10. personne ne confirme un code à la main
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  return next throws_ok(format('update public.grp_ref_codes set etat = ''confirme'' where id = %L', trcar.id), '42501', null,
                        'le gérant ne confirme pas un code par UPDATE (42501)');
  return next throws_ok(format('update public.grp_ref_propositions set statut = ''executee'' where id = %L', p_trcar.id), '42501', null,
                        '… ni ne clôt une proposition (42501)');
  perform tests.redevenir_admin();
  -- le gérant n'est pas membre de l'équipe du référent : il n'approuve pas ce lot
  return next throws_ok(format('select tests.b1_decider(%L, ''b1-gerant@essai.invalid'', %L, %L, ''approuve'')', b ->> 'gerant', v_client, d.id), null, null,
                        'le gérant, hors équipe « Référent données », n''approuve pas le lot');
  -- le référent approuve le lot
  return next lives_ok(format('select tests.b1_decider(%L, ''b1-referent@essai.invalid'', %L, %L, ''approuve'')', b ->> 'referent', v_client, d.id), 'le référent approuve le lot');
  select * into d from public.demandes_validation k where k.id = d.id;
  return next ok(d.statut in ('approuvee', 'executee'), format('la demande est approuvée (%s)', d.statut));
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  v_exec := public.grp_appliquer_decisions(v_client);
  perform tests.redevenir_admin();
  return next diag('exécution : ' || v_exec::text);
  trcar := tests.b1_code(v_client, v_soc_b, 'TRCAR');
  return next is(trcar.etat, 'confirme', 'TRCAR est confirmé');
  return next is(trcar.objet_id, f0123.objet_id, '… sur l''objet du transporteur');
  return next is(trcar.demande_id, d.id, '… par cette demande');
  return next ok(trcar.rattache_le is not null, '… daté');
  select * into p_trcar from public.grp_ref_propositions k where k.id = p_trcar.id;
  return next is(p_trcar.statut, 'executee', 'la proposition est exécutée');
  select * into d from public.demandes_validation k where k.id = d.id;
  return next is(d.statut, 'executee', 'la demande est exécutée');
  return next is((select count(*) from public.grp_ref_codes k where k.objet_id = f0123.objet_id), 2::bigint, 'l''objet du transporteur porte deux codes');
end $f$;

create or replace function tests.test_b1_04_deux_approbations() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; v_soc_a uuid; v_soc_b uuid;
  f0200 public.grp_ref_codes; qdl public.grp_ref_codes;
  p public.grp_ref_propositions;
  d public.demandes_validation;
begin
  b := tests.b1_preparer(7);
  v_client := (b ->> 'client')::uuid; v_soc_a := (b ->> 'soc_a')::uuid; v_soc_b := (b ->> 'soc_b')::uuid;
  f0200 := tests.b1_code(v_client, v_soc_a, 'F0200'); qdl := tests.b1_code(v_client, v_soc_b, 'QDL');
  select * into p from public.grp_ref_propositions k where k.code_id = qdl.id and k.statut = 'a_valider';
  select * into d from public.demandes_validation k where k.id = p.demande_id;

  -- 13. le référent n'est pas de la direction financière
  return next throws_ok(format('select tests.b1_decider(%L, ''b1-referent@essai.invalid'', %L, %L, ''approuve'')', b ->> 'referent', v_client, d.id), null, null,
                        'le référent n''approuve pas un lot de la direction financière');
  -- la DAF approuve : une sur deux, rien ne s'applique
  return next lives_ok(format('select tests.b1_decider(%L, ''b1-daf@essai.invalid'', %L, %L, ''approuve'')', b ->> 'daf', v_client, d.id), 'la DAF approuve (1 sur 2)');
  select * into d from public.demandes_validation k where k.id = d.id;
  return next is(d.statut, 'en_attente', 'une approbation sur deux : la demande attend encore');
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  perform public.grp_appliquer_decisions(v_client);
  perform tests.redevenir_admin();
  qdl := tests.b1_code(v_client, v_soc_b, 'QDL');
  return next is(qdl.etat, 'propose', 'QDL reste proposé');
  -- la même personne n'approuve pas deux fois
  return next throws_ok(format('select tests.b1_decider(%L, ''b1-daf@essai.invalid'', %L, %L, ''approuve'')', b ->> 'daf', v_client, d.id), null, null,
                        'la DAF n''approuve pas deux fois');
  -- la seconde approbation exécute
  return next lives_ok(format('select tests.b1_decider(%L, ''b1-daf2@essai.invalid'', %L, %L, ''approuve'')', b ->> 'daf2', v_client, d.id), 'DAF2 approuve (2 sur 2)');
  select * into d from public.demandes_validation k where k.id = d.id;
  return next ok(d.statut in ('approuvee', 'executee'), format('la demande est approuvée (%s)', d.statut));
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  perform public.grp_appliquer_decisions(v_client);
  perform tests.redevenir_admin();
  qdl := tests.b1_code(v_client, v_soc_b, 'QDL');
  return next is(qdl.etat, 'confirme', 'QDL est confirmé sur l''objet de la quincaillerie');
  return next is(qdl.objet_id, f0200.objet_id, '… le même objet que F0200');
end $f$;

create or replace function tests.test_b1_04_refus_et_separation() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; v_soc_a uuid; v_soc_b uuid;
  f0300 public.grp_ref_codes; trcar public.grp_ref_codes;
  p public.grp_ref_propositions;
  d public.demandes_validation;
  v_obj uuid; v_dem uuid;
  o public.grp_ref_objets;
begin
  b := tests.b1_preparer(7);
  v_client := (b ->> 'client')::uuid; v_soc_a := (b ->> 'soc_a')::uuid; v_soc_b := (b ->> 'soc_b')::uuid;
  f0300 := tests.b1_code(v_client, v_soc_a, 'F0300'); trcar := tests.b1_code(v_client, v_soc_b, 'TRCAR');

  -- un lot refusé : le code proposé est libéré, la proposition rejetée
  select * into p from public.grp_ref_propositions k where k.code_id = trcar.id and k.statut = 'a_valider';
  v_obj := trcar.objet_id;
  return next lives_ok(format('select tests.b1_decider(%L, ''b1-referent@essai.invalid'', %L, %L, ''rejete'', ''Deux transporteurs homonymes.'')', b ->> 'referent', v_client, p.demande_id), 'le référent refuse le lot');
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  perform public.grp_appliquer_decisions(v_client);
  perform tests.redevenir_admin();
  select * into p from public.grp_ref_propositions k where k.id = p.id;
  return next is(p.statut, 'rejetee', 'la proposition est rejetée');
  trcar := tests.b1_code(v_client, v_soc_b, 'TRCAR');
  return next is(trcar.etat, 'nouveau', 'TRCAR repart nouveau…');
  return next isnt(trcar.objet_id, v_obj, '… sur son propre objet');
  return next is(trcar.methode, 'rejet', '… méthode rejet');

  -- 12. séparation saisie / approbation : le référent propose un nom, il ne l'approuve pas lui-même
  perform tests.endosser((b ->> 'referent')::uuid, 'b1-referent@essai.invalid');
  v_dem := public.grp_proposer_nom(f0300.objet_id, 'Imprimerie Antillaise (groupe)', 'Nom d''usage dans le groupe');
  perform tests.redevenir_admin();
  select * into d from public.demandes_validation k where k.id = v_dem;
  return next is(d.type_action, 'renommer_objet', 'la correction humaine ouvre une demande renommer_objet');
  return next is(d.statut, 'en_attente', '… en attente');
  return next throws_ok(format('select tests.b1_decider(%L, ''b1-referent@essai.invalid'', %L, %L, ''approuve'')', b ->> 'referent', v_client, v_dem), '42501', null,
                        'celui qui a saisi la correction ne l''approuve pas (42501)');
  select * into o from public.grp_ref_objets k where k.id = f0300.objet_id;
  return next is(o.nom_groupe, 'Imprimerie Antillaise', 'le nom du groupe n''a pas bougé sans approbation');
end $f$;

select * from runtests('tests'::name, '^test_b1_04_');
