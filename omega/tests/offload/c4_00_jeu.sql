-- c4_00 — Le jeu d'essai OFFLOAD sur le banc (session C4, 06/10/2026).
-- À jouer sur la RECETTE après omega/tests/socle/00_installation.sql d'A5 (pgTAP, schéma tests,
-- tests.endosser / tests.redevenir_admin) et après la migration c4_01.
-- Rien ici n'écrit dans les tables : des fonctions d'aide seulement. Les tests c4_NN écrivent sur le client du
-- BANC (cccccccc-0000-4000-8000-00000000000c) et sont annulés par runtests() à la fin de chaque test.
-- Aucun client réel : noms et montants inventés.

create extension if not exists pgtap with schema extensions;
create schema if not exists tests;

-- Le banc : son client, son entité principale, son gérant (retrouvé par courriel, sinon par rôle).
create or replace function tests.c4_banc() returns jsonb
language plpgsql stable as $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_gerant uuid;
  v_entite uuid;
begin
  select u.id into v_gerant from auth.users u where u.email = 'gerant@banc-varelo.test';
  if v_gerant is null or not exists (select 1 from public.comptes c where c.user_id = v_gerant and c.client_id = v_client) then
    select c.user_id into v_gerant from public.comptes c where c.client_id = v_client and c.role = 'gerant' order by c.user_id limit 1;
  end if;
  select e.id into v_entite from public.entites e where e.client_id = v_client and e.principale;
  return jsonb_build_object('client', v_client, 'gerant', v_gerant, 'entite', v_entite);
end $$;

-- Un utilisateur d'essai (auth.users + compte) chez un client, pour les garde-fous de droits.
create or replace function tests.c4_compte(p_client uuid, p_role text, p_email text) returns uuid
language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
                            raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
                            confirmation_token, recovery_token, email_change_token_new, email_change,
                            email_change_token_current, phone_change, phone_change_token, reauthentication_token)
    values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, '', now(), now(), now(),
            '{"provider":"email","providers":["email"]}', '{}', false, false, '', '', '', '', '', '', '', '');
  exception when others then
    insert into auth.users (id, email) values (v_id, p_email);
  end;
  insert into public.comptes (user_id, client_id, role) values (v_id, p_client, p_role);
  return v_id;
end $$;

-- OFFLOAD installé sur le banc (en admin). Rend le jsonb de offload_installer.
create or replace function tests.c4_installer() returns jsonb
language plpgsql as $$
begin
  perform tests.redevenir_admin();
  return public.offload_installer((tests.c4_banc() ->> 'client')::uuid, null);
end $$;

-- Dépose un export par les portes du socle, comme le ferait le lecteur d'exports d'A1 : recevoir_releve,
-- commencer_releve, deposer_lignes (clé = colonnes clé du jeu jointes par « | » ; vide → « #n » ; doublon →
-- « <clé>#n », avec l'anomalie que le lecteur pose), terminer_lecture ; puis fait avancer la file et passe le
-- module (crons omega-releves-file et offload-releves). p_valeurs : tableau d'objets {colonne: texte}.
-- Rend {releve, instantane, traitement}. En admin.
create or replace function tests.c4_deposer(p_jeu text, p_valeurs jsonb, p_cle text default null) returns jsonb
language plpgsql as $$
declare
  v_client uuid := (tests.c4_banc() ->> 'client')::uuid;
  v_branchement uuid;
  v_cle_jeu text[];
  v_recu jsonb;
  v_inst uuid;
  v_lignes jsonb := '[]'::jsonb;
  v_vues text[] := '{}';
  v_k text;
  v_anom jsonb;
  e jsonb;
  n integer := 0;
  v_trait jsonb;
begin
  perform tests.redevenir_admin();
  select g.branchement_id into v_branchement from public.offload_reglages g where g.client_id = v_client;
  select j.cle into v_cle_jeu from public.branchements_jeux j where j.branchement_id = v_branchement and j.code = p_jeu;
  v_recu := public.recevoir_releve(v_branchement, jsonb_build_array(jsonb_build_object(
      'nom_fichier', p_jeu || '_' || coalesce(p_cle, 'essai') || '.csv', 'mime', 'text/csv', 'octets', 1000,
      'sha256', encode(sha256(convert_to('c4:' || p_jeu || ':' || coalesce(p_cle, '') || ':' || clock_timestamp()::text, 'UTF8')), 'hex'),
      'chemin', v_client::text || '/branchement/' || v_branchement::text || '/' || p_jeu || '_' || coalesce(p_cle, 'essai') || '.csv',
      'jeu', p_jeu)),
    'depot', p_cle, 'tests-c4@banc-varelo.test');
  v_inst := (v_recu -> 'instantanes' -> 0 ->> 'instantane')::uuid;
  perform public.commencer_releve(v_inst);
  for e in select x.value from jsonb_array_elements(p_valeurs) x loop
    n := n + 1;
    v_anom := null;
    v_k := (select string_agg(coalesce(btrim(e ->> c), ''), '|' order by o) from unnest(v_cle_jeu) with ordinality u(c, o));
    if coalesce(replace(v_k, '|', ''), '') = '' then
      v_k := '#' || n;
      v_anom := jsonb_build_object('cle', 'clé vide');
    elsif v_k = any (v_vues) then
      v_anom := jsonb_build_object('cle', 'doublon');
      v_k := v_k || '#' || n;
    end if;
    v_vues := v_vues || v_k;
    v_lignes := v_lignes || jsonb_strip_nulls(jsonb_build_object('n', n, 'ligne', n + 1, 'cle', v_k, 'valeurs', e, 'anomalies', v_anom));
  end loop;
  perform public.deposer_lignes(v_inst, v_lignes);
  perform public.terminer_lecture(v_inst, jsonb_build_object('statut', 'lu', 'jeu', p_jeu, 'lignes', n), 'tests/c4');
  perform private.avancer_releves();
  v_trait := private.offload_traiter_travaux(20);
  return jsonb_build_object('releve', v_recu ->> 'releve', 'instantane', v_inst, 'traitement', v_trait);
end $$;

-- Le fichier clients d'essai : trois comptes.
create or replace function tests.c4_fichier_clients() returns jsonb language sql immutable as $$
  select jsonb_build_array(
    jsonb_build_object('compte_ref', 'C001', 'nom', 'Garage Martin', 'contact', 'Martin', 'email', 'atelier@garage-martin.test', 'commercial', 'Sophie'),
    jsonb_build_object('compte_ref', 'C002', 'nom', 'Froid Services Ouest', 'contact', 'Mme Le Goff', 'telephone', '02 99 00 00 01'),
    jsonb_build_object('compte_ref', 'C003', 'nom', 'Menuiserie Dubreuil', 'groupe', 'Groupe Dubreuil'))
$$;

grant execute on all functions in schema tests to authenticated;
select 'c4_00 : fonctions d''aide posées' as resultat;
