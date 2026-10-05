-- b1_01 — VARELO, étapes 1 à 4 du scénario : installation, pôles, sociétés, périmètre
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5) et b1_00_aides.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_b1_01_installation() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid;
  v_inst jsonb;
  v_regles integer;
  v_equipes integer;
begin
  b := tests.b1_banc();
  v_client := (b ->> 'client')::uuid;

  -- 1. le gérant installe Varelo : équipes, règles, battement ; rejoué, rien en double
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  v_inst := public.grp_installer(v_client);
  return next is((v_inst ->> 'installe')::boolean, true, 'grp_installer par le gérant rend installe = true');
  return next is((v_inst ->> 'regles_posees')::integer, 7, 'sur un groupe neuf, sept règles sont posées');
  v_inst := public.grp_installer(v_client);
  return next is((v_inst ->> 'regles_posees')::integer, 0, 'rejouée, l''installation ne pose aucune règle de plus');
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from public.grp_installations where client_id = v_client), 'grp_installations porte le banc');
  select count(*) into v_equipes from public.equipes where client_id = v_client
    and cle in ('presidence', 'direction_financiere', 'direction_juridique', 'direction_operations', 'dsi', 'referent_donnees');
  return next is(v_equipes, 6, 'les six équipes du groupe existent chez le banc');
  select count(*) into v_regles from public.regles_validation where client_id = v_client and module = 'varelo' and entite_id is null
    and type_action in ('rattacher_codes', 'rapprocher_codes', 'rattacher_iban_different', 'fusionner_objets', 'detacher_code', 'scinder_objet', 'renommer_objet');
  return next is(v_regles, 7, 'les sept règles de validation du référentiel sont posées');
  return next is((select g.approbations_requises::integer from public.regles_validation g where g.client_id = v_client and g.module = 'varelo'
                    and g.type_action = 'rattacher_iban_different' and g.entite_id is null), 2,
                 'un fournisseur aux coordonnées bancaires différentes exige deux approbations');
  return next is((select e.cle from public.regles_validation g join public.equipes e on e.id = g.equipe_id
                   where g.client_id = v_client and g.module = 'varelo' and g.type_action = 'rattacher_codes' and g.entite_id is null), 'referent_donnees',
                 'le rattachement de codes revient à l''équipe du référent données');
  return next is((select e.cle from public.regles_validation g join public.equipes e on e.id = g.equipe_id
                   where g.client_id = v_client and g.module = 'varelo' and g.type_action = 'rattacher_iban_different' and g.entite_id is null), 'direction_financiere',
                 'les coordonnées bancaires différentes reviennent à la direction financière');

  -- un collaborateur n'installe pas
  perform tests.endosser((b ->> 'collab')::uuid, 'b1-collaborateur@essai.invalid');
  return next throws_ok(format('select public.grp_installer(%L)', v_client), '42501', null, 'grp_installer par un collaborateur : refusé (42501)');
  perform tests.redevenir_admin();
end $f$;

create or replace function tests.test_b1_01_poles() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid;
begin
  b := tests.b1_preparer(1);
  v_client := (b ->> 'client')::uuid;

  -- 2. le gérant crée les pôles ; un collaborateur est refusé ; la clé est tenue
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  return next lives_ok(format('insert into public.grp_poles (client_id, cle, nom, ordre) values (%L, ''b1_distribution'', ''Distribution (essai B1)'', 1)', v_client),
                       'le gérant crée le pôle Distribution');
  return next throws_ok(format('insert into public.grp_poles (client_id, cle, nom) values (%L, ''Pôle Mal Formé'', ''x'')', v_client), '23514', null,
                        'une clé de pôle hors ^[a-z][a-z0-9_]{1,39}$ est refusée (23514)');
  return next throws_ok(format('insert into public.grp_poles (client_id, cle, nom) values (%L, ''b1_distribution'', ''Doublon'')', v_client), '23505', null,
                        'deux pôles ne portent pas la même clé (23505)');
  return next is(tests.compter('public', 'grp_poles', format('client_id = %L and cle = ''b1_distribution''', v_client)), 1::bigint, 'le gérant relit son pôle');
  perform tests.redevenir_admin();
  perform tests.endosser((b ->> 'collab')::uuid, 'b1-collaborateur@essai.invalid');
  return next throws_ok(format('insert into public.grp_poles (client_id, cle, nom) values (%L, ''b1_services'', ''Services'')', v_client), '42501', null,
                        'un collaborateur ne crée pas de pôle (42501)');
  return next is(tests.compter('public', 'grp_poles', format('client_id = %L and cle = ''b1_distribution''', v_client)), 1::bigint, 'un collaborateur lit les pôles du groupe');
  perform tests.redevenir_admin();
end $f$;

create or replace function tests.test_b1_01_societes() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid;
  v_soc_a uuid; v_soc_b uuid; v_soc_c uuid;
  v record;
begin
  b := tests.b1_preparer(3);
  v_client := (b ->> 'client')::uuid;
  v_soc_a := (b ->> 'soc_a')::uuid;
  v_soc_b := (b ->> 'soc_b')::uuid;
  v_soc_c := (b ->> 'soc_c')::uuid;

  -- 3. trois sociétés inscrites par le gérant, chacune avec son territoire et son fuseau
  return next ok(v_soc_a is not null and v_soc_b is not null and v_soc_c is not null, 'grp_ajouter_societe rend trois identifiants');
  select * into v from public.grp_societes_vue s where s.client_id = v_client and s.entite_id = v_soc_a;
  return next is(v.nom, 'Essai B1 Distribution', 'la société A porte son nom');
  return next is(v.siren, '849300157', 'la société A porte son SIREN nettoyé');
  return next is(v.pole, 'Distribution (essai B1)', 'la société A est dans le pôle Distribution');
  return next is(v.territoire_iso, 'GP', 'la société A est en Guadeloupe');
  return next is(v.fuseau, 'America/Guadeloupe', 'le fuseau de la société A suit son territoire');
  return next is(v.logiciel, 'Sage 100', 'le logiciel de la société A est noté');
  return next is(v.statut_branchement, 'a_brancher', 'une société inscrite est à brancher');
  select * into v from public.grp_societes_vue s where s.client_id = v_client and s.entite_id = v_soc_b;
  return next is(v.fuseau, 'America/Martinique', 'la société B est à l''heure de la Martinique');
  select * into v from public.grp_societes_vue s where s.client_id = v_client and s.entite_id = v_soc_c;
  return next is(v.fuseau, 'Europe/Paris', 'la société C est à l''heure de Paris');
  return next ok(v.pole is null, 'la société C n''a pas de pôle');
  return next ok(exists (select 1 from public.entites e where e.client_id = v_client and e.id = v_soc_a and e.type = 'societe' and e.parent_id is not null),
                 'la société A est une entité « societe » rattachée à l''entité principale');

  -- refus : territoire illisible, SIREN à clé fausse
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  return next throws_ok(format('select public.grp_ajouter_societe(%L, ''Sans territoire'', null, null)', v_client), '22023', null,
                        'sans territoire lisible, la société n''entre pas (22023) : on ne suppose jamais la métropole');
  return next throws_ok(format('select public.grp_ajouter_societe(%L, ''Mauvais SIREN'', ''123456789'', ''GP'')', v_client), '22023', null,
                        'un SIREN à clé fausse est refusé (22023)');
  perform tests.redevenir_admin();

  -- un collaborateur n'inscrit pas de société
  perform tests.endosser((b ->> 'collab')::uuid, 'b1-collaborateur@essai.invalid');
  return next throws_ok(format('select public.grp_ajouter_societe(%L, ''Par un collaborateur'', null, ''GP'')', v_client), '42501', null,
                        'un collaborateur n''inscrit pas de société (42501)');
  perform tests.redevenir_admin();
end $f$;

create or replace function tests.test_b1_01_perimetre() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid;
  n bigint;
begin
  b := tests.b1_preparer(3);
  v_client := (b ->> 'client')::uuid;

  -- 4. le gérant (périmètre total) voit les trois sociétés ; une autre organisation n'en voit aucune
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  n := tests.compter('public', 'grp_societes_vue', format('client_id = %L and nom like ''Essai B1 %%''', v_client));
  return next is(n, 3::bigint, 'le gérant voit les trois sociétés de l''essai');
  perform tests.redevenir_admin();
  perform tests.endosser((b ->> 'etranger')::uuid, 'a5-client-b@essai.invalid');
  n := tests.compter('public', 'grp_societes', format('client_id = %L', v_client));
  return next is(n, 0::bigint, 'une personne d''une autre organisation ne voit aucune société du banc');
  n := tests.compter('public', 'grp_poles', format('client_id = %L', v_client));
  return next is(n, 0::bigint, '… ni ses pôles');
  n := tests.compter('public', 'grp_installations', format('client_id = %L', v_client));
  return next is(n, 0::bigint, '… ni son installation');
  perform tests.redevenir_admin();
  -- le collaborateur rattaché à la seule société A (comptes.perimetre_total = false + comptes_entites)
  perform tests.endosser((b ->> 'partiel')::uuid, 'b1-collaborateur-a@essai.invalid');
  n := tests.compter('public', 'grp_societes_vue', format('client_id = %L', v_client));
  return next is(n, 1::bigint, 'un collaborateur au périmètre d''une société ne voit que la sienne');
  return next is((select s.nom from public.grp_societes_vue s where s.client_id = v_client limit 1), 'Essai B1 Distribution', '… la société A');
  n := tests.compter('public', 'grp_poles', format('client_id = %L', v_client));
  return next is(n, 2::bigint, '… mais lit les pôles du groupe');
  perform tests.redevenir_admin();
  -- une personne d'une autre organisation n'inscrit rien ici
  perform tests.endosser((b ->> 'etranger')::uuid, 'a5-client-b@essai.invalid');
  return next throws_ok(format('select public.grp_ajouter_societe(%L, ''Intruse'', null, ''GP'')', v_client), '42501', null,
                        'inscrire une société chez un autre groupe : refusé (42501)');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b1_01_');
