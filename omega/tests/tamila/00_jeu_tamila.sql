-- 00 — Le jeu d'essai de Tamila (session B4). À poser une fois sur la RECETTE, après
-- omega/tests/socle/00_installation.sql d'A5 (schéma « tests », pgTAP, tests.endosser…).
-- Rien ici ne touche aux tables du socle hors des tests ; runtests() annule tout.
--
-- Le cabinet fictif « Delorme & Associés » : deux associés (gerant Me Delorme, admin
-- Me Haddad), un avocat collaborateur (valideur Me Rousseau), une assistante juridique
-- (collaborateur), un stagiaire (lecteur). Le dossier : un appel en construction devant
-- la cour d'appel de Paris, le client demeurant en Guadeloupe (augmentation d'un mois,
-- CPC art. 915-4).

create schema if not exists tests;
grant usage on schema tests to authenticated, service_role;

-- Un « chiffré » d'exemple au format de private.tamila_chiffre_valide : premier octet 1,
-- au moins 29 octets, et JAMAIS le clair dedans (les 48 octets qui suivent sont des
-- empreintes salées : on ne retrouve pas le texte en relisant la base).
create or replace function tests.tamila_chiffre(p_clair text) returns bytea
language sql volatile as $$
  select decode('01' || md5(random()::text) || md5(coalesce(p_clair, '') || random()::text) || md5(random()::text), 'hex')
$$;

-- Le mot sentinelle : il n'apparaît que chiffré ; aucun journal, aucune alerte, aucune
-- demande ne doit le porter en clair (test 11).
create or replace function tests.tamila_sentinelle() returns text
language sql immutable as $$ select 'SENTINELLE-B4-ZQX' $$;

-- Le cabinet : un client, cinq personnes, cinq comptes. Renvoie les identifiants.
create or replace function tests.tamila_jeu() returns jsonb
language plpgsql as $$
declare
  v_client uuid; v_entite uuid;
  v_gerant uuid := gen_random_uuid(); v_admin uuid := gen_random_uuid(); v_avocat uuid := gen_random_uuid();
  v_assistante uuid := gen_random_uuid(); v_stagiaire uuid := gen_random_uuid();
  v_autre_client uuid; v_autre_gerant uuid := gen_random_uuid();
  ligne jsonb;
begin
  perform set_config('tests.jeu_actif', 'oui', true);
  ligne := tests.inserer_minimal('public', 'clients', jsonb_build_object('nom', 'Delorme & Associés — essai B4'));
  v_client := (ligne ->> 'id')::uuid;
  ligne := tests.inserer_minimal('public', 'clients', jsonb_build_object('nom', 'Cabinet voisin — essai B4'));
  v_autre_client := (ligne ->> 'id')::uuid;
  select e.id into v_entite from public.entites e where e.client_id = v_client and e.principale;
  update public.entites set fuseau = 'Europe/Paris' where id = v_entite and fuseau is distinct from 'Europe/Paris';

  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
                            raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
    select u.id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', u.email, 'x', now(), now(), now(),
           '{"provider":"email","providers":["email"]}', '{}', false, false
    from (values (v_gerant, 'b4-delorme@essai.invalid'), (v_admin, 'b4-haddad@essai.invalid'),
                 (v_avocat, 'b4-rousseau@essai.invalid'), (v_assistante, 'b4-assistante@essai.invalid'),
                 (v_stagiaire, 'b4-stagiaire@essai.invalid'), (v_autre_gerant, 'b4-voisin@essai.invalid')) u(id, email);
  exception when others then
    raise notice 'tests.tamila_jeu : auth.users non alimentée (%), on continue avec des uuid libres', sqlerrm;
  end;

  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', v_gerant, 'client_id', v_client, 'role', 'gerant', 'perimetre_total', true));
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', v_admin, 'client_id', v_client, 'role', 'admin', 'perimetre_total', true));
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', v_avocat, 'client_id', v_client, 'role', 'valideur', 'perimetre_total', true));
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', v_assistante, 'client_id', v_client, 'role', 'collaborateur', 'perimetre_total', true));
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', v_stagiaire, 'client_id', v_client, 'role', 'lecteur', 'perimetre_total', true));
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', v_autre_gerant, 'client_id', v_autre_client, 'role', 'gerant', 'perimetre_total', true));

  return jsonb_build_object('client', v_client, 'entite', v_entite, 'gerant', v_gerant, 'admin', v_admin, 'avocat', v_avocat,
                            'assistante', v_assistante, 'stagiaire', v_stagiaire,
                            'autre_client', v_autre_client, 'autre_gerant', v_autre_gerant);
end $$;

-- Tamila installé par le gérant (porte publique, sous le rôle authenticated).
create or replace function tests.tamila_installe(p_jeu jsonb) returns void
language plpgsql as $$
begin
  perform tests.endosser((p_jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  perform public.tamila_installer((p_jeu ->> 'client')::uuid);
  perform tests.redevenir_admin();
end $$;

-- Un dossier ouvert par le gérant, par la porte, avec sa clé enveloppée et ses chiffrés.
-- Renvoie l'identifiant du dossier (tiré ici, comme le ferait le navigateur).
create or replace function tests.tamila_dossier(p_jeu jsonb, p_territoire text default 'metropole', p_responsable uuid default null)
returns uuid
language plpgsql as $$
declare v_dossier uuid := gen_random_uuid(); v_rendu uuid;
begin
  perform tests.endosser((p_jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  v_rendu := public.tamila_creer_dossier(
    (p_jeu ->> 'client')::uuid, v_dossier,
    tests.tamila_chiffre('2026-0412 ' || tests.tamila_sentinelle()),
    tests.tamila_chiffre('SCI du Moulin c/ Bâti-Sud ' || tests.tamila_sentinelle()),
    'local', 'cabinet:' || (p_jeu ->> 'client') || ':' || v_dossier::text,
    decode(repeat('ab', 77), 'hex'),
    tests.tamila_chiffre('RG 26/01234'),
    'construction', 'Cour d''appel de Paris', p_territoire, 'contentieux', false, null, p_responsable, null);
  perform tests.redevenir_admin();
  return v_rendu;
end $$;

-- La scène complète : cabinet installé, dossier ouvert, trois parties, l'avocat et l'assistante
-- intervenants (un collaborateur n'écrit dans un dossier qu'en y étant membre), le stagiaire lecteur. Renvoie le jeu enrichi (dossier, parties).
create or replace function tests.tamila_scene(p_territoire text default 'metropole') returns jsonb
language plpgsql as $$
declare jeu jsonb; v_dossier uuid; v_client_partie uuid; v_adverse uuid; v_confrere uuid;
begin
  jeu := tests.tamila_jeu();
  perform tests.tamila_installe(jeu);
  v_dossier := tests.tamila_dossier(jeu, p_territoire);
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  v_client_partie := public.tamila_ajouter_partie(v_dossier, tests.tamila_chiffre('SCI du Moulin ' || tests.tamila_sentinelle()), 'client',
                                                  'guadeloupe', 'appelant', tests.tamila_chiffre('gerance@moulin.invalid'));
  v_adverse := public.tamila_ajouter_partie(v_dossier, tests.tamila_chiffre('Bâti-Sud SAS ' || tests.tamila_sentinelle()), 'adverse',
                                            'metropole', 'intime', null);
  v_confrere := public.tamila_ajouter_partie(v_dossier, tests.tamila_chiffre('Me Lenoir'), 'confrere_adverse', 'metropole', null, null);
  perform public.tamila_ajouter_membre(v_dossier, (jeu ->> 'avocat')::uuid, 'intervenant', null);
  perform public.tamila_ajouter_membre(v_dossier, (jeu ->> 'assistante')::uuid, 'intervenant', null);
  perform public.tamila_ajouter_membre(v_dossier, (jeu ->> 'stagiaire')::uuid, 'lecteur', now() + interval '30 days');
  perform tests.redevenir_admin();
  return jeu || jsonb_build_object('dossier', v_dossier, 'partie_client', v_client_partie, 'partie_adverse', v_adverse,
                                   'partie_confrere', v_confrere);
end $$;

-- Une pièce chiffrée dans le dossier (posée par le socle, comme le ferait le dépôt) :
-- chiffrement 'dossier:v1', objet tamila_dossier. Renvoie son identifiant.
create or replace function tests.tamila_piece(p_jeu jsonb, p_nom text default 'avis-rpva.pdf', p_type text default null) returns uuid
language plpgsql as $$
declare ligne jsonb; v jsonb;
begin
  perform tests.redevenir_admin();
  v := jsonb_build_object('client_id', p_jeu ->> 'client', 'module', 'tamila', 'source', 'depot', 'nom_fichier', p_nom,
                          'mime', 'application/pdf', 'octets', 2048, 'sha256', md5(p_nom || (p_jeu ->> 'dossier')) || md5('b4:' || p_nom),
                          'chemin', (p_jeu ->> 'client') || '/tamila_dossier/' || (p_jeu ->> 'dossier') || '/' || p_nom,
                          'objet_type', 'tamila_dossier', 'objet_id', p_jeu ->> 'dossier', 'chiffrement', 'dossier:v1');
  if p_type is not null then v := v || jsonb_build_object('type_piece', p_type); end if;
  ligne := tests.inserer_minimal('public', 'pieces', v);
  return (ligne ->> 'id')::uuid;
end $$;

-- L'appel déclaré par le gérant : appelant, à orienter, introduit le 15/09/2026. Renvoie l'appel.
create or replace function tests.tamila_appel(p_jeu jsonb, p_introduit date default date '2026-09-15', p_role text default 'appelant')
returns uuid
language plpgsql as $$
declare v uuid;
begin
  perform tests.endosser((p_jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  v := public.tamila_declarer_appel((p_jeu ->> 'dossier')::uuid, p_introduit, p_role, 'a_orienter', 'metropole');
  perform tests.redevenir_admin();
  return v;
end $$;

-- La ou les règles de procédure qu'un événement fait jouer pour l'appel (régime, procédure, partie).
create or replace function tests.tamila_regles(p_evenement text, p_regime text default 'cpc', p_procedure text default 'a_orienter',
                                              p_partie text default 'appelant') returns setof text
language sql stable as $$
  select p.code from public.tamila_regles_procedure p
  where p.regime = p_regime and p.evenement = p_evenement and p_procedure = any (p.procedures)
    and (p.partie in ('destinataire', 'toutes') or p.partie = p_partie)
  order by p.code
$$;

-- Compte les lignes d'une table qui portent un texte en clair, toutes colonnes confondues.
create or replace function tests.tamila_clair_dans(p_table text, p_texte text) returns bigint
language plpgsql as $$
declare n bigint;
begin
  if to_regclass('public.' || quote_ident(p_table)) is null then return 0; end if;
  execute format('select count(*) from public.%I t where to_jsonb(t)::text like %L', p_table, '%' || p_texte || '%') into n;
  return n;
end $$;

-- Le rôle de service, pour les gestes du serveur (export prêt, effacement, destruction de clé).
create or replace function tests.endosser_serveur() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform set_config('role', 'service_role', true);
end $$;
