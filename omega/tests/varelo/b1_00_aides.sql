-- b1_00 — VARELO : les aides des tests de B1 (schéma tests, après le 00_installation.sql d'A5)
-- Exécutable tel quel par execute_sql sur la RECETTE. Ne joue aucun test : il pose
-- tests.b1_banc() et tests.b1_preparer(), que les fichiers b1_01 à b1_06 appellent.
-- Tout ce que ces aides écrivent (sociétés, codes, propositions, demandes) l'est DANS la
-- transaction du test : runtests() l'annule à la fin de chaque test.
--
-- Le client : le banc « Groupe Sogexal (banc) », cccccccc-0000-4000-8000-00000000000c.
-- Les personnes : gerant / referent / daf / daf2 @banc-varelo.test (comptes du coordinateur),
-- plus un collaborateur et une personne d'une AUTRE organisation, créés le temps du test.
-- Tout passe par les portes publiques ; les seules écritures directes sont celles que le
-- socle veut directes : INSERT grp_poles (politique gérant/admin) et INSERT approbations.

-- ---------------------------------------------------------------------------
-- Les identifiants du banc et les deux personnes de passage.
create or replace function tests.b1_banc() returns jsonb
language plpgsql as $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_gerant uuid; v_referent uuid; v_daf uuid; v_daf2 uuid;
  v_collab uuid := gen_random_uuid();
  v_jeu jsonb;
  v_role_collab text;
begin
  select id into v_gerant from auth.users where email = 'gerant@banc-varelo.test';
  select id into v_referent from auth.users where email = 'referent@banc-varelo.test';
  select id into v_daf from auth.users where email = 'daf@banc-varelo.test';
  select id into v_daf2 from auth.users where email = 'daf2@banc-varelo.test';
  if v_gerant is null or v_referent is null or v_daf is null or v_daf2 is null then
    raise exception 'tests.b1_banc : un compte du banc manque (gerant %, referent %, daf %, daf2 %)', v_gerant, v_referent, v_daf, v_daf2;
  end if;
  if not exists (select 1 from public.clients where id = v_client) then
    raise exception 'tests.b1_banc : le client du banc % est absent', v_client;
  end if;
  -- un collaborateur du banc, le temps du test (il propose, il n'approuve jamais)
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
                            raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
    values (v_collab, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b1-collaborateur@essai.invalid', 'x',
            now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, false);
  exception when others then
    raise notice 'tests.b1_banc : auth.users non alimentée (%), on continue avec un uuid libre', sqlerrm;
  end;
  v_role_collab := tests.role_admis('collaborateur');
  perform tests.inserer_minimal('public', 'comptes',
    jsonb_build_object('user_id', v_collab, 'client_id', v_client, 'role', v_role_collab, 'perimetre_total', true));
  -- une personne d'une autre organisation : le jeu d'A5 (client B, user_b collaborateur)
  v_jeu := tests.jeu();
  return jsonb_build_object('client', v_client, 'gerant', v_gerant, 'referent', v_referent, 'daf', v_daf, 'daf2', v_daf2,
                            'collab', v_collab, 'etranger', v_jeu ->> 'user_b', 'client_etranger', v_jeu ->> 'client_b');
end $$;

-- ---------------------------------------------------------------------------
-- Les lignes d'un export fournisseurs, telles qu'un logiciel de gestion les sortirait.
-- Société A (Distribution, GP) : huit lignes dont trois à rejeter et une à anomalie.
create or replace function tests.b1_lignes_a(p_siren_societe_b text) returns jsonb
language sql immutable as $$
  select jsonb_build_array(
    jsonb_build_object('code', 'F0123', 'nom', 'ANCIEN LIBELLE DU TRANSPORTEUR'),                        -- doublon : la dernière ligne du code gagne
    jsonb_build_object('code', 'F0123', 'nom', 'TRANSPORTS CARAIBES SARL', 'siren', '849 300 124',
                       'iban', 'FR76 3000 6000 0112 3456 7890 189', 'adresse', 'ZI de Jarry', 'code_postal', '97122',
                       'ville', 'Baie-Mahault', 'pays', 'FR', 'telephone', '0590 26 12 34', 'email', 'compta@transports-caraibes.gp'),
    jsonb_build_object('code', 'F0200', 'nom', 'SODIMAT', 'siren', '849300132', 'iban', 'FR1420041010050500013M02606'),
    jsonb_build_object('code', 'F0300', 'nom', 'Imprimerie Antillaise', 'code_postal', '97110', 'ville', 'Pointe-à-Pitre'),
    jsonb_build_object('code', 'F0400', 'nom', 'SOGEXAL LOGISTIQUE', 'siren', p_siren_societe_b),          -- intragroupe
    jsonb_build_object('code', '', 'nom', 'Sans code'),                                                   -- rejet : code local manquant
    jsonb_build_object('code', 'F0500'),                                                                  -- rejet : nom manquant
    jsonb_build_object('code', 'F0600', 'nom', 'Mauvais SIREN', 'siren', '123456789'))                    -- anomalie : clé fausse
$$;

-- Société B (Logistique, MQ) : le même transporteur sous un autre code, SODIMAT avec un autre IBAN,
-- la société B elle-même (intragroupe), une imprimerie proche de nom sans identifiant.
create or replace function tests.b1_lignes_b(p_siren_societe_b text) returns jsonb
language sql immutable as $$
  select jsonb_build_array(
    jsonb_build_object('code', 'TRCAR', 'nom', 'Transports Caraibes', 'siren', '849300124'),
    jsonb_build_object('code', 'SODIM', 'nom', 'SODIMAT SAS', 'siren', '849300132', 'iban', 'FR7630004000031234567890143'),
    jsonb_build_object('code', 'SOGEX', 'nom', 'Sogexal Logistique', 'siren', p_siren_societe_b),
    jsonb_build_object('code', 'IMPDA', 'nom', 'Imprimerie des Antilles', 'code_postal', '97110'))
$$;

-- ---------------------------------------------------------------------------
-- Joue le scénario jusqu'au palier demandé et rend tous les identifiants.
--   1 : installation (gérant)            2 : pôles (gérant)        3 : sociétés A, B, C (gérant)
--   5 : dépôt des codes de A (gérant)    6 : dépôt des codes de B  7 : passage de rapprochement (gérant)
-- Les paliers 4 (périmètre) et 8+ (décisions) sont joués par les tests eux-mêmes.
create or replace function tests.b1_preparer(p_palier integer) returns jsonb
language plpgsql as $$
declare
  b jsonb := tests.b1_banc();
  v_client uuid := (b ->> 'client')::uuid;
  v_gerant uuid := (b ->> 'gerant')::uuid;
  v_siren_b text := '849300140';
  v_pole_d uuid; v_pole_l uuid;
  v_soc_a uuid; v_soc_b uuid; v_soc_c uuid;
  v_inst jsonb; v_dep_a jsonb; v_dep_b jsonb; v_rap jsonb;
  r jsonb := b;
begin
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  if p_palier >= 1 then
    v_inst := public.grp_installer(v_client);
    r := r || jsonb_build_object('installation', v_inst);
  end if;
  if p_palier >= 2 then
    insert into public.grp_poles (client_id, cle, nom, ordre) values (v_client, 'b1_distribution', 'Distribution (essai B1)', 1) returning id into v_pole_d;
    insert into public.grp_poles (client_id, cle, nom, ordre) values (v_client, 'b1_logistique', 'Logistique (essai B1)', 2) returning id into v_pole_l;
    r := r || jsonb_build_object('pole_d', v_pole_d, 'pole_l', v_pole_l);
  end if;
  if p_palier >= 3 then
    v_soc_a := public.grp_ajouter_societe(v_client, 'Sogexal Distribution (essai B1)', '849300157', 'GP', null, v_pole_d, 'Sage 100', 'Plan fournisseurs 2019');
    v_soc_b := public.grp_ajouter_societe(v_client, 'Sogexal Logistique (essai B1)', v_siren_b, 'MQ', null, v_pole_l, 'EBP', 'Codes transporteurs');
    v_soc_c := public.grp_ajouter_societe(v_client, 'Sogexal Services (essai B1)', '849300165', 'FR', null, null, null, null);
    r := r || jsonb_build_object('soc_a', v_soc_a, 'soc_b', v_soc_b, 'soc_c', v_soc_c, 'siren_b', v_siren_b);
  end if;
  if p_palier >= 5 then
    v_dep_a := public.grp_deposer_codes(v_client, v_soc_a, 'fournisseur', tests.b1_lignes_a(v_siren_b), 'export Sage 100 du 05/10');
    r := r || jsonb_build_object('depot_a', v_dep_a);
  end if;
  if p_palier >= 6 then
    v_dep_b := public.grp_deposer_codes(v_client, v_soc_b, 'fournisseur', tests.b1_lignes_b(v_siren_b), 'export EBP du 05/10');
    r := r || jsonb_build_object('depot_b', v_dep_b);
  end if;
  if p_palier >= 7 then
    v_rap := public.grp_rapprocher(v_client, false);
    r := r || jsonb_build_object('rapprochement', v_rap);
  end if;
  perform tests.redevenir_admin();
  return r;
end $$;

-- ---------------------------------------------------------------------------
-- Le code local d'une société du banc (hors RLS : à appeler en admin).
create or replace function tests.b1_code(p_client uuid, p_entite uuid, p_code text) returns public.grp_ref_codes
language sql stable as $$
  select c.* from public.grp_ref_codes c
  where c.client_id = p_client and c.entite_id = p_entite and c.nature = 'fournisseur' and c.code_local = p_code
$$;

-- Approuver ou refuser une demande comme le fait l'écran d'A3 : un INSERT dans approbations.
create or replace function tests.b1_decider(p_user uuid, p_email text, p_client uuid, p_demande uuid, p_decision text, p_commentaire text default 'Vérifié (essai B1).') returns void
language plpgsql as $$
begin
  perform tests.endosser(p_user, p_email);
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
  values (p_demande, p_client, p_user, p_decision, p_commentaire);
  perform tests.redevenir_admin();
end $$;
