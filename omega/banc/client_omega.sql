-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- omega/banc/client_omega.sql — Omega, son propre premier client, SUR LA RECETTE SEULEMENT
-- A3, 18/10/2026 (décision de Teo, 16 h 05 Z). Posé par le coordinateur (A3 n'appelle pas Supabase).
--
-- Ce que fait le script, rejouable sans doublon (chaque étape vérifie avant d'écrire) :
--   0. refuse de tourner ailleurs que sur la recette (private.reglages 'environnement' = 'recette') ;
--   1. l'organisation « Omega » dans public.clients, retrouvable par config->>'slug' = 'omega'
--      (la table n'a pas de colonne slug ; le déclencheur clients_entite_principale crée la société principale) ;
--   2. le compte de Teo (teopetit50@gmail.com) dans auth.users s'il n'existe pas : mot de passe ALÉATOIRE
--      (gen_random_bytes, haché bcrypt), jamais écrit ni affiché — Teo passe par « mot de passe oublié » ;
--   3. Teo gérant de l'organisation, par la porte du socle public.rattacher_membre (appelée en service_role,
--      le seul rôle qui l'ouvre sans session) ;
--   4. tous les modules souscrits et installés (public.abonnements_modules, source « manuel »), pour les codes
--      présents dans public.moteurs_reconnus ;
--   5. chaque module en mode d'envoi « essai » (public.reglages_envois), les essais partant à l'adresse de Teo :
--      rien ne part à un vrai destinataire.
--   Les installations propres à chaque module (filed_installer, grp_installer, btp_installer, tamila_installer,
--   tiroma_installer_cabinet…) demandent des choix métier (exercice, formule, logiciel…) : elles se font ensuite
--   par leurs écrans ou par l'ouvrier du module, avec l'id rendu ici.
-- Le script se termine par un select qui rend l'id de l'organisation (et ce qui a été posé).
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

begin;

do $garde$
begin
  if coalesce((select g.valeur from private.reglages g where g.cle = 'environnement'), '') <> 'recette' then
    raise exception 'client_omega.sql ne se pose que sur la recette (private.reglages environnement = recette).';
  end if;
end $garde$;

-- 1 · l'organisation
insert into public.clients (nom, email, statut, config)
select 'Omega', 'teopetit50@gmail.com', 'actif', jsonb_build_object('slug', 'omega', 'client_interne', true)
where not exists (select 1 from public.clients c where c.config ->> 'slug' = 'omega');

-- 2 · le compte de Teo, s'il manque (mot de passe aléatoire, jamais connu de personne)
do $compte$
declare
  v_uid uuid;
begin
  select u.id into v_uid from auth.users u where lower(u.email) = 'teopetit50@gmail.com';
  if v_uid is null then
    v_uid := gen_random_uuid();
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change_token_new, email_change)
    values ('00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', 'teopetit50@gmail.com',
            extensions.crypt(encode(extensions.gen_random_bytes(32), 'base64'), extensions.gen_salt('bf')), now(),
            '{"provider": "email", "providers": ["email"]}'::jsonb, '{"nom": "Teo Petit"}'::jsonb, now(), now(),
            '', '', '', '');
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (v_uid::text, v_uid,
            jsonb_build_object('sub', v_uid::text, 'email', 'teopetit50@gmail.com', 'email_verified', true),
            'email', null, now(), now());
    raise notice 'Compte créé pour teopetit50@gmail.com (mot de passe aléatoire : « mot de passe oublié » pour entrer).';
  else
    raise notice 'Compte existant pour teopetit50@gmail.com : réutilisé.';
  end if;
end $compte$;

-- 3 · Teo gérant, par la porte du socle (service_role : la porte n'accepte pas d'autre appelant sans session)
set local role service_role;
do $membre$
begin
  perform public.rattacher_membre((select c.id from public.clients c where c.config ->> 'slug' = 'omega'), 'teopetit50@gmail.com', 'gerant');
exception when unique_violation then
  raise notice 'Teo est déjà membre de l''organisation Omega.';
end $membre$;
reset role;

-- 4 · tous les modules, souscrits et installés
insert into public.abonnements_modules (client_id, moteur, source, choisi_le, installe_le)
select c.id, m.code, 'manuel', now(), now()
from public.clients c
cross join public.moteurs_reconnus m
where c.config ->> 'slug' = 'omega'
  and upper(m.code) in ('FILED', 'VARELO', 'TAVARO', 'LORANI', 'TIROMA', 'TAMILA', 'DALIRO', 'REPUT', 'CASHD', 'OFFLOAD')
on conflict (client_id, moteur) do nothing;

-- 5 · chaque module en mode d'envoi « essai » : tout part à l'adresse de Teo, jamais au destinataire
insert into public.reglages_envois (client_id, module, mode, essai_adresse)
select c.id, m.module, 'essai', 'teopetit50@gmail.com'
from public.clients c
cross join (values ('filed'), ('varelo'), ('tavaro'), ('lorani'), ('tiroma'), ('tamila'), ('daliro'), ('reput'), ('cashd'), ('offload')) as m(module)
where c.config ->> 'slug' = 'omega'
on conflict (client_id, module) do nothing;

commit;

-- l'id de l'organisation, et ce qui est posé
select c.id as organisation,
       c.nom,
       c.config ->> 'slug' as slug,
       (select string_agg(a.moteur, ', ' order by a.moteur) from public.abonnements_modules a where a.client_id = c.id) as modules,
       (select string_agg(r.module || ' : ' || r.mode, ', ' order by r.module) from public.reglages_envois r where r.client_id = c.id) as envois,
       (select string_agg(u.email || ' (' || k.role || ')', ', ') from public.comptes k join auth.users u on u.id = k.user_id where k.client_id = c.id) as comptes
from public.clients c
where c.config ->> 'slug' = 'omega';
