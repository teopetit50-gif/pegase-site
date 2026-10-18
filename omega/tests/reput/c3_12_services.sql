-- c3_12 — REPUT : les indicateurs par service (migration c3_12).
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_11 (aides tests.c3_*, dont tests.c3_repondre de
-- c3_03) et les migrations c3_01 à c3_12. Données du banc et fictives seulement. runtests() annule tout.

create or replace function tests.test_c3_12_services() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; v_equipe uuid;
  v_jour date := (now() at time zone 'Europe/Paris')::date;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);
  insert into public.equipes (client_id, cle, nom) values (v_client, 'c3_12_compta', 'Comptabilité (C3-12)') returning id into v_equipe;
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_router_sujet(v_client, 'tarifs', v_equipe);
  perform tests.redevenir_admin();

  perform tests.c3_repondre(v_client, 'c3-12a@exemple.test', 'Fictif A', 'Votre prix ?', 'tarifs', false, null, 'Nous vérifions.');
  perform tests.c3_repondre(v_client, 'c3-12b@exemple.test', 'Fictif B', 'Votre tarif ?', 'tarifs', false, null, 'Nous vérifions.');
  perform tests.c3_repondre(v_client, 'c3-12c@exemple.test', 'Fictif C', 'Ouvert samedi ?', 'horaires', false, null, 'Nous vérifions.');

  return next is((select sum(recues)::int from public.reput_indicateurs_services
                  where client_id = v_client and jour = v_jour and equipe_id = v_equipe), 2,
                 'Les demandes d''un sujet routé comptent pour son service');
  return next ok(exists (select 1 from public.reput_indicateurs_services where client_id = v_client and jour = v_jour
                         and equipe_id = v_equipe and service = 'Comptabilité (C3-12)'),
                 'Le service est nommé');
  return next ok((select sum(recues)::int from public.reput_indicateurs_services
                  where client_id = v_client and jour = v_jour and equipe_id is null and service = 'Tous les décideurs') >= 1,
                 'Un sujet non routé compte pour « Tous les décideurs »');
  return next is((select sum(en_attente)::int from public.reput_indicateurs_services
                  where client_id = v_client and jour = v_jour and equipe_id = v_equipe), 2,
                 'Les réponses à valider du service sont en attente');
  return next is((select sum(recues)::int from public.reput_indicateurs_services where client_id = v_client and jour = v_jour),
                 (select sum(recues)::int from public.reput_indicateurs where client_id = v_client and jour = v_jour),
                 'Par service ou par canal, le total des demandes reçues est le même');
  return next ok((select coalesce(c.reloptions, '{}') @> array['security_invoker=true'] from pg_class c
                  where c.oid = 'public.reput_indicateurs_services'::regclass),
                 'La vue est security_invoker : la RLS s''applique au lecteur');
  return next ok(not has_table_privilege('anon', 'public.reput_indicateurs_services', 'select'),
                 'Fermée aux anonymes');
end $f$;

select * from runtests('tests'::name, '^test_c3_12_');
