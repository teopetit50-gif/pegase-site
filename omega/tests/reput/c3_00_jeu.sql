-- c3_00 — Le jeu d'essai REPUT sur le banc (session C3, 06/10/2026).
-- À jouer sur la RECETTE après omega/tests/socle/00_installation.sql d'A5 (pgTAP, schéma tests,
-- tests.endosser / tests.redevenir_admin / tests.jeu). Rien ici n'écrit dans les tables : des
-- fonctions d'aide seulement. Les tests c3_NN écrivent sur le client du BANC
-- (cccccccc-0000-4000-8000-00000000000c) et sont annulés par runtests() à la fin de chacun.

create extension if not exists pgtap with schema extensions;
create schema if not exists tests;

-- Le banc : son client, ses comptes (par courriel, sinon par rôle), son entité principale.
create or replace function tests.c3_banc() returns jsonb
language plpgsql stable as $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_gerant uuid; v_referent uuid; v_daf uuid; v_entite uuid;
begin
  select u.id into v_gerant from auth.users u where u.email = 'gerant@banc-varelo.test';
  select u.id into v_referent from auth.users u where u.email = 'referent@banc-varelo.test';
  select u.id into v_daf from auth.users u where u.email = 'daf@banc-varelo.test';
  if v_gerant is null then
    select c.user_id into v_gerant from public.comptes c where c.client_id = v_client and c.role = 'gerant' order by c.user_id limit 1;
  end if;
  if v_daf is null then
    select c.user_id into v_daf from public.comptes c where c.client_id = v_client and c.role = 'valideur'
      and c.user_id is distinct from v_referent order by c.user_id limit 1;
  end if;
  select e.id into v_entite from public.entites e where e.client_id = v_client and e.principale;
  return jsonb_build_object('client', v_client, 'gerant', v_gerant, 'referent', v_referent, 'daf', v_daf, 'entite', v_entite);
end $$;

-- Un utilisateur d'essai (auth.users + compte) chez un client.
create or replace function tests.c3_compte(p_client uuid, p_role text, p_email text, p_total boolean default true) returns uuid
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
    raise notice 'tests.c3_compte : auth.users non alimentée (%)', sqlerrm;
  end;
  insert into public.comptes (user_id, client_id, role, perimetre_total) values (v_id, p_client, p_role, p_total);
  return v_id;
end $$;

-- La dernière ligne du journal opposable d'une action (et d'un objet).
-- SECURITY DEFINER : lisible même pendant qu'un test endosse un collaborateur.
create or replace function tests.c3_journal(p_client uuid, p_action text, p_objet_id text default null) returns jsonb
language sql stable security definer set search_path to '' as $$
  select to_jsonb(j) from public.journal_opposable j
  where j.client_id = p_client and j.action = p_action and (p_objet_id is null or j.objet_id = p_objet_id)
  order by j.id desc limit 1
$$;

select 'c3_00 : fonctions d''aide posées' as resultat;
