-- Démo Lorani, Guadeloupe — le client « Atelier d'Architecture et d'Urbanisme (démo) » sur la recette (B5, 18/10/2026).
-- Plan : omega/banc/demo-aau/PLAN.md. À poser par le coordinateur, bloc par bloc. Rejouable (on conflict do nothing,
-- et rien n'est créé deux fois) ; rien n'est supprimé.
--
-- Le gérant de démo (demo-aau@banc-varelo.test) n'a pas de mot de passe utilisable (encrypted_password vide, comme les
-- groupes de B1) : le coordinateur le pose s'il faut se connecter à l'écran. Aucun envoi ne part vers un tiers : les
-- envois Lorani du client sont en mode essai, à l'adresse d'essai du banc.

-- ══ 1. Le client, son gérant, son entité en Guadeloupe, ses envois en essai (administrateur) ══
do $demo$
declare
  v_client constant uuid := 'cccccccc-0000-4000-8000-00000000aa01';
  v_gerant constant uuid := 'cccccccc-0000-4000-8000-00000000aac1';
  v_banc constant uuid := 'cccccccc-0000-4000-8000-00000000000c';
begin
  insert into public.clients (id, nom, secteur, commune, statut, profil)
  select v_client, 'Atelier d''Architecture et d''Urbanisme (démo)', 'archi', 'Baie-Mahault', b.statut, b.profil
  from public.clients b where b.id = v_banc
  on conflict do nothing;
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
  values (v_gerant, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo-aau@banc-varelo.test', '',
          now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"nom":"Gérant de démo"}', false, false)
  on conflict do nothing;
  insert into public.comptes (user_id, client_id, role, perimetre_total) values (v_gerant, v_client, 'gerant', true)
  on conflict do nothing;
  -- l'entité principale (créée par le trigger clients_entite_principale) : le fuseau et le territoire de la Guadeloupe
  -- (entites.territoire suit le code ISO 3166 : « GP » ; le projet Lorani, lui, déduit « guadeloupe » de son code INSEE)
  update public.entites set nom = 'Atelier d''Architecture et d''Urbanisme (démo)', fuseau = 'America/Guadeloupe', territoire = 'GP'
  where client_id = v_client and principale
    and (nom, fuseau, territoire) is distinct from ('Atelier d''Architecture et d''Urbanisme (démo)', 'America/Guadeloupe', 'GP');
  -- les envois Lorani en essai, comme sur le banc
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, plages, feries, delai_min, plafond_destinataire_jour,
                                      plafond_jour, fenetre_doublon, canaux, pause_reponse, pause_sensible, sante)
  select v_client, r.module, r.mode, r.essai_adresse, r.plages, r.feries, r.delai_min, r.plafond_destinataire_jour,
         r.plafond_jour, r.fenetre_doublon, r.canaux, r.pause_reponse, r.pause_sensible, r.sante
  from public.reglages_envois r
  where r.client_id = v_banc and r.module = 'lorani'
    and not exists (select 1 from public.reglages_envois x where x.client_id = v_client and x.module = 'lorani');
end $demo$;

-- ══ 2. Le dossier PCMI à Baie-Mahault, au nom du gérant de démo (JWT simulé : la RLS s'applique, comme à l'écran) ══
do $demo$
declare
  v_client constant uuid := 'cccccccc-0000-4000-8000-00000000aa01';
  v_gerant constant uuid := 'cccccccc-0000-4000-8000-00000000aac1';
  v_projet uuid;
  v_plu jsonb;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', v_gerant, 'role', 'authenticated', 'aud', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_gerant::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('role', 'authenticated', true);

  select id into v_projet from public.lorani_projets where client_id = v_client and reference = 'AAU-DEMO-PCMI';
  if v_projet is null then
    insert into public.lorani_projets (client_id, reference, nom, nature, adresse, code_postal, commune, code_insee, parcelles, marche_public)
    values (v_client, 'AAU-DEMO-PCMI', 'Maison individuelle, rue Jean Jaurès (démo)', 'maison_individuelle', 'Rue Jean Jaurès',
            '97122', 'Baie-Mahault', '97103', '{}', false)
    returning id into v_projet;
    insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_projet, v_gerant, 'chef_projet');
    insert into public.lorani_permis (client_id, projet_id, type_autorisation, intitule) values (v_client, v_projet, 'pcmi', 'Maison individuelle, rue Jean Jaurès');
  end if;
  -- le PLU, les servitudes et les risques depuis l'adresse (la base appelle l'IGN ; réponse en quelques secondes)
  v_plu := public.lorani_chercher_plu(v_projet);
  raise notice 'projet % : recherche du PLU %', v_projet, v_plu ->> 'statut';

end $demo$;
reset role;

-- ══ 3. Contrôle (une minute plus tard) ══
select c.nom, c.secteur, e.fuseau, e.territoire,
       (select count(*) from public.comptes k join auth.users u on u.id = k.user_id
         where k.client_id = c.id and u.email = 'demo-aau@banc-varelo.test' and k.role = 'gerant') as gerant,
       (select r.mode from public.reglages_envois r where r.client_id = c.id and r.module = 'lorani') as envois_lorani
from public.clients c join public.entites e on e.client_id = c.id and e.principale
where c.id = 'cccccccc-0000-4000-8000-00000000aa01';

select pr.reference, pr.territoire, pe.type_autorisation, pe.etat, l.statut as plu, l.zone, l.secteur_protege,
       l.risques ->> 'sismicite' as sismicite, jsonb_array_length(l.servitudes) as servitudes, l.complements_statut
from public.lorani_projets pr
left join public.lorani_permis pe on pe.projet_id = pr.id
left join public.lorani_plu l on l.projet_id = pr.id
where pr.client_id = 'cccccccc-0000-4000-8000-00000000aa01';
-- Attendu : territoire guadeloupe ; permis pcmi « a_deposer » ; PLU « trouve », zone UCa, secteur protégé (deux AC1),
-- sismicité « 5 - Forte » (relevé du 18/10 sur le banc, même adresse).
