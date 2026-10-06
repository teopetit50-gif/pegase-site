-- Tests A4 — lot 20 (a4_28) : envoi des écritures par API (connexions, secret au coffre, file, reprise, refus, panne).
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation (a4_10) et tests.a4_facture_comptabilisee (a4_18).
-- `select * from runtests('tests', '^test_a4_')` ; runtests() annule tout. Données d'exemple seulement.

-- Une personne de l'organisation agit (gérant par défaut).
create or replace function tests.a4_en_tant_que(p_user text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;

-- Une connexion active à Pennylane qui reprend tout l'historique de la société. Rend son id.
create or replace function tests.a4_connexion_active(p_org jsonb, p_editeur text default 'pennylane') returns uuid language plpgsql as $$
declare v uuid;
begin
  perform tests.a4_en_tant_que(p_org ->> 'gerant');
  v := public.filed_connecter_logiciel((p_org ->> 'client')::uuid, (p_org ->> 'entite')::uuid, p_editeur,
         case p_editeur when 'quickbooks' then '{"realm_id": "9130", "environnement": "sandbox"}' when 'cegid_loop' then '{"code_ibs": "DOS01"}' else '{"journal_achats": "HA"}' end::jsonb,
         date '2000-01-01');
  reset role;
  set local role service_role;
  perform public.compta_activer_connexion(v, '{"access_token": "jeton-exemple", "refresh_token": "renouvellement-exemple"}');
  reset role;
  return v;
end $$;

-- La file de l'ouvrier, vue par le service.
create or replace function tests.a4_file(p_max integer default 20) returns jsonb language plpgsql as $$
declare r jsonb;
begin
  set local role service_role;
  r := public.compta_a_envoyer(p_max);
  reset role;
  return r;
end $$;

create or replace function tests.test_a4_28_01_connexion() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_c uuid; r public.filed_connexions_comptables;
begin
  perform tests.a4_facture_comptabilisee(o, 'API-000');   -- l'historique, écrit avant la connexion
  perform tests.a4_en_tant_que(o ->> 'gerant');
  v_c := public.filed_connecter_logiciel((o ->> 'client')::uuid, (o ->> 'entite')::uuid, 'quickbooks', '{"realm_id": "9130", "environnement": "sandbox"}');
  return next throws_ok(format($$select public.filed_connecter_logiciel(%L, %L, 'pennylane', '{"access_token": "x"}')$$, o ->> 'client', o ->> 'entite'),
                        '22023', null, 'Un secret dans les paramètres est refusé');
  return next throws_ok(format($$select public.filed_connecter_logiciel(%L, %L, 'cegid_loop', '{}')$$, o ->> 'client', o ->> 'entite'),
                        '22023', null, 'Cegid Loop sans code de dossier aussi');
  return next throws_ok(format($$select public.filed_connecter_logiciel(%L, %L, 'sage', '{}')$$, o ->> 'client', o ->> 'entite'),
                        '22023', null, 'Un éditeur inconnu aussi');
  reset role;
  perform tests.a4_en_tant_que(o ->> 'valideur');
  return next throws_ok(format($$select public.filed_connecter_logiciel(%L, %L, 'pennylane', '{}')$$, o ->> 'client', o ->> 'entite'),
                        '42501', null, 'Un valideur ne connecte pas de logiciel');
  reset role;
  select * into r from public.filed_connexions_comptables where id = v_c;
  return next is(r.etat, 'a_autoriser', 'La connexion attend l''autorisation chez l''éditeur');
  return next is(r.secret_nom, 'compta:' || v_c, 'Elle ne garde que le nom de son secret');
  return next is(jsonb_array_length(tests.a4_file()), 0, 'Rien ne part tant qu''elle n''est pas active');
  set local role service_role;
  perform public.compta_activer_connexion(v_c, '{"access_token": "a", "refresh_token": "r"}');
  return next is(public.compta_secret(v_c), '{"access_token": "a", "refresh_token": "r"}', 'Le secret est au coffre, lu par le service');
  perform public.compta_poser_secret(v_c, '{"access_token": "b", "refresh_token": "r2"}');
  return next is(public.compta_secret(v_c), '{"access_token": "b", "refresh_token": "r2"}', 'et renouvelé');
  reset role;
  return next is(jsonb_array_length(tests.a4_file()), 0, 'Sans date de reprise, l''historique ne part pas');
  perform tests.a4_facture_comptabilisee(o, 'API-001');
  return next is(jsonb_array_length(tests.a4_file()), 1, 'mais la nouvelle écriture, oui');
end $f$;

create or replace function tests.test_a4_28_02_envoi() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_c uuid; f jsonb; e jsonb; r jsonb;
begin
  perform tests.a4_facture_comptabilisee(o, 'API-010');
  v_c := tests.a4_connexion_active(o);
  f := tests.a4_file();
  return next is(jsonb_array_length(f), 1, 'Depuis une date : l''écriture déjà passée part');
  e := f -> 0 -> 'ecriture';
  return next is(jsonb_array_length(e -> 'lignes'), 3, 'avec ses trois lignes');
  return next ok(e ->> 'cle' like 'OMEGA-%-HA-%', 'et sa clé pour la retrouver chez l''éditeur');
  return next ok(not (f -> 0 -> 'connexion' ? 'secret_nom') and (f -> 0 -> 'connexion' ->> 'editeur') = 'pennylane', 'La connexion, sans secret');
  set local role service_role;
  r := public.compta_commencer_envoi(v_c, e ->> 'exercice_cle', (e ->> 'ecriture_num')::int);
  return next is(r, '{"reprise": false, "tentatives": 1}'::jsonb, 'Premier essai, pas de reprise');
  perform public.compta_noter_envoi(v_c, e ->> 'exercice_cle', (e ->> 'ecriture_num')::int, '456789');
  return next throws_ok(format($$select public.compta_commencer_envoi(%L, %L, %s)$$, v_c, e ->> 'exercice_cle', e ->> 'ecriture_num'), '55000', null,
                        'Une écriture envoyée ne repart pas');
  perform public.compta_noter_envoi(v_c, e ->> 'exercice_cle', (e ->> 'ecriture_num')::int, '456789');
  reset role;
  return next is(jsonb_array_length(tests.a4_file()), 0, 'La file est vide');
  return next is((select id_externe from public.filed_envois_api where connexion_id = v_c), '456789', 'L''identifiant de l''éditeur est gardé');
  return next ok(exists (select 1 from public.journal_opposable where client_id = (o ->> 'client')::uuid and action = 'filed.envoi_api'), 'Au journal');
end $f$;

create or replace function tests.test_a4_28_03_reprise_et_refus() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_c uuid; e jsonb; r jsonb;
begin
  perform tests.a4_facture_comptabilisee(o, 'API-020');
  v_c := tests.a4_connexion_active(o, 'quickbooks');
  e := tests.a4_file() -> 0 -> 'ecriture';
  set local role service_role;
  perform public.compta_commencer_envoi(v_c, e ->> 'exercice_cle', (e ->> 'ecriture_num')::int);
  return next is(public.compta_echouer_envoi(v_c, e ->> 'exercice_cle', (e ->> 'ecriture_num')::int, 'HTTP 503'), 'a_reprendre', 'Une panne passagère : à reprendre');
  reset role;
  return next is(jsonb_array_length(tests.a4_file()), 1, 'l''écriture revient dans la file');
  set local role service_role;
  r := public.compta_commencer_envoi(v_c, e ->> 'exercice_cle', (e ->> 'ecriture_num')::int);
  return next is(r, '{"reprise": true, "tentatives": 2}'::jsonb, 'Deuxième essai : reprise, l''ouvrier cherche d''abord chez l''éditeur');
  return next is(public.compta_echouer_envoi(v_c, e ->> 'exercice_cle', (e ->> 'ecriture_num')::int, 'Compte 6061 inconnu', true), 'refuse',
                 'Un rejet de l''éditeur est définitif');
  reset role;
  return next is(jsonb_array_length(tests.a4_file()), 0, 'Une écriture refusée ne repart pas d''elle-même');
  return next ok(exists (select 1 from public.alertes where client_id = (o ->> 'client')::uuid and titre like '%refusée par QuickBooks%'), 'Une personne est prévenue');
end $f$;

create or replace function tests.test_a4_28_04_panne() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_c uuid;
begin
  perform tests.a4_facture_comptabilisee(o, 'API-030');
  v_c := tests.a4_connexion_active(o);
  set local role service_role;
  perform public.compta_connexion_en_panne(v_c, 'Jeton révoqué (HTTP 401)');
  reset role;
  return next is((select etat from public.filed_connexions_comptables where id = v_c), 'en_panne', 'Jeton refusé : la connexion s''arrête');
  return next is(jsonb_array_length(tests.a4_file()), 0, 'plus rien ne part');
  return next ok(exists (select 1 from public.alertes where client_id = (o ->> 'client')::uuid and titre like 'Envoi vers Pennylane arrêté%'), 'et une personne est prévenue');
  perform tests.a4_en_tant_que(o ->> 'gerant');
  perform public.filed_reprendre_connexion(v_c);
  reset role;
  return next is(jsonb_array_length(tests.a4_file()), 1, 'Reprise par le gérant : l''écriture repart');
end $f$;

create or replace function tests.test_a4_28_05_droits() returns setof text
language plpgsql as $f$
begin
  return next ok(not has_function_privilege('authenticated', 'public.compta_secret(uuid)', 'execute'), 'Le secret n''est jamais lisible par un membre');
  return next ok(not has_function_privilege('authenticated', 'public.compta_a_envoyer(integer)', 'execute')
                 and not has_function_privilege('authenticated', 'public.compta_noter_envoi(uuid, text, integer, text)', 'execute'),
                 'Les portes de l''ouvrier sont au service seul');
  return next ok(has_function_privilege('authenticated', 'public.filed_connecter_logiciel(uuid, uuid, text, jsonb, date)', 'execute'), 'Connecter est ouvert aux membres (rôle vérifié dedans)');
  return next ok(not has_function_privilege('anon', 'public.filed_connecter_logiciel(uuid, uuid, text, jsonb, date)', 'execute'), 'pas à anon');
end $f$;

create or replace function tests.test_a4_28_06_autorisation() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_c uuid; v_n text; r jsonb;
begin
  perform tests.a4_en_tant_que(o ->> 'gerant');
  v_c := public.filed_connecter_logiciel((o ->> 'client')::uuid, (o ->> 'entite')::uuid, 'quickbooks', '{"environnement": "sandbox"}');
  v_n := public.filed_preparer_autorisation(v_c);
  reset role;
  return next ok(v_n ~ '^[0-9a-f]{64}$', 'Le gérant obtient un nonce à usage unique');
  return next ok((select autorisation_empreinte <> v_n from public.filed_connexions_comptables where id = v_c), 'seule son empreinte est gardée');
  perform tests.a4_en_tant_que(o ->> 'valideur');
  return next throws_ok(format($$select public.filed_preparer_autorisation(%L)$$, v_c), '42501', null, 'Un valideur ne l''obtient pas');
  reset role;
  set local role service_role;
  return next is(public.compta_consommer_autorisation(repeat('0', 64)), null, 'Un nonce inconnu ne désigne rien');
  r := public.compta_consommer_autorisation(v_n);
  return next is(r ->> 'connexion', v_c::text, 'Le retour de l''éditeur désigne la connexion');
  return next is(public.compta_consommer_autorisation(v_n), null, 'une seule fois');
  perform public.compta_activer_connexion(v_c, '{"access_token": "a", "refresh_token": "r"}', '{"realm_id": "9130"}');
  return next throws_ok(format($$select public.compta_activer_connexion(%L, 'x', '{"refresh_token": "fuite"}')$$, v_c), '22023', null,
                        'Les paramètres n''acceptent jamais de secret');
  reset role;
  return next is((select parametres ->> 'realm_id' from public.filed_connexions_comptables where id = v_c), '9130', 'L''entreprise QuickBooks est notée');
  return next ok(not has_column_privilege('authenticated', 'public.filed_connexions_comptables', 'autorisation_empreinte', 'select'),
                 'L''empreinte n''est pas lisible par les membres');
end $f$;
