-- b6_00 — Le jeu d'essai DALIRO sur le banc (session B6, 05/10/2026).
-- À jouer sur la RECETTE après omega/tests/socle/00_installation.sql d'A5 (pgTAP,
-- schéma tests, tests.endosser / tests.redevenir_admin / tests.jeu).
-- Rien ici n'écrit dans les tables du socle : des fonctions d'aide seulement.
-- Les tests b6_01 et b6_02 écrivent sur le client du BANC
-- (cccccccc-0000-4000-8000-00000000000c, « Groupe Sogexal (banc) ») et sont
-- annulés par runtests() à la fin de chaque test.

create extension if not exists pgtap with schema extensions;
create schema if not exists tests;

-- Le banc : son client et ses quatre comptes, retrouvés par courriel dans
-- auth.users ; à défaut, par rôle dans public.comptes.
create or replace function tests.b6_banc() returns jsonb
language plpgsql stable as $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_gerant uuid; v_referent uuid; v_daf uuid; v_daf2 uuid; v_entite uuid;
begin
  select u.id into v_gerant from auth.users u where u.email = 'gerant@banc-varelo.test';
  select u.id into v_referent from auth.users u where u.email = 'referent@banc-varelo.test';
  select u.id into v_daf from auth.users u where u.email = 'daf@banc-varelo.test';
  select u.id into v_daf2 from auth.users u where u.email = 'daf2@banc-varelo.test';
  -- Identifiants donnés par le coordinateur le 05/10 (comptes du banc), si les courriels ne sont pas ceux attendus.
  v_gerant := coalesce(v_gerant, (select c.user_id from public.comptes c where c.client_id = v_client and c.user_id = 'cccccccc-0000-4000-8000-0000000000c1'));
  v_referent := coalesce(v_referent, (select c.user_id from public.comptes c where c.client_id = v_client and c.user_id = 'cccccccc-0000-4000-8000-0000000000c2'));
  v_daf := coalesce(v_daf, (select c.user_id from public.comptes c where c.client_id = v_client and c.user_id = 'cccccccc-0000-4000-8000-0000000000c3'));
  v_daf2 := coalesce(v_daf2, (select c.user_id from public.comptes c where c.client_id = v_client and c.user_id = 'cccccccc-0000-4000-8000-0000000000c4'));
  if v_gerant is null then
    select c.user_id into v_gerant from public.comptes c where c.client_id = v_client and c.role = 'gerant' order by c.user_id limit 1;
  end if;
  if v_daf is null then
    select c.user_id into v_daf from public.comptes c where c.client_id = v_client and c.role = 'valideur' and c.user_id is distinct from v_referent order by c.user_id limit 1;
  end if;
  select e.id into v_entite from public.entites e where e.client_id = v_client and e.principale;
  return jsonb_build_object('client', v_client, 'gerant', v_gerant, 'referent', v_referent, 'daf', v_daf, 'daf2', v_daf2,
                            'entite', v_entite);
end $$;

-- Le n-ième corps d'état du référentiel, par rang de séquence (1 = le premier à
-- intervenir). Les codes ne sont pas connus d'avance : on les lit.
create or replace function tests.b6_corps(p_rang integer) returns text
language sql stable as $$
  select code from (select code, row_number() over (order by rang_sequence, code) as n from public.btp_corps_etat) x
  where x.n = p_rang
$$;

-- Un utilisateur d'essai (auth.users + compte) chez un client, pour les tests de garde-fous.
create or replace function tests.b6_compte(p_client uuid, p_role text, p_email text) returns uuid
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
    raise notice 'tests.b6_compte : auth.users non alimentée (%)', sqlerrm;
  end;
  insert into public.comptes (user_id, client_id, role, perimetre_total) values (v_id, p_client, p_role, true);
  return v_id;
end $$;

-- Lire une ligne du journal opposable de l'objet, la plus récente d'une action.
create or replace function tests.b6_journal(p_client uuid, p_action text, p_objet_id text default null) returns jsonb
language sql stable as $$
  select to_jsonb(j) from public.journal_opposable j
  where j.client_id = p_client and j.action = p_action and (p_objet_id is null or j.objet_id = p_objet_id)
  order by j.id desc limit 1
$$;

select 'b6_00 : fonctions d''aide posées' as resultat;
