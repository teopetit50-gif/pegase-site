-- c3_11 — REPUT : les décideurs reçoivent un courriel quand une réponse attend leur validation (migration c3_11, socle 19as).
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_10 (aides tests.c3_*, dont tests.c3_repondre de
-- c3_03), le socle 19as et les migrations c3_01 à c3_11. runtests() annule tout.

create or replace function tests.test_c3_11_prevenir() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; v_daf uuid; v_collab uuid; v_equipe uuid; v_rep uuid; v_n int; v_dv int;
  v_h timestamptz := date_trunc('hour', now()) + interval '10 minutes';
  e public.envois;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  v_collab := tests.c3_compte(v_client, 'collaborateur', 'c3-11-collab@banc-varelo.test');
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);
  perform tests.c3_repondre(v_client, 'c3-11@exemple.test', 'Client Confidentiel', 'Vous posez des velux ?', 'autre', false, null,
                            'Nous transmettons votre question à l''équipe.');
  update public.reput_reponses set cree_le = v_h where client_id = v_client and statut = 'a_valider';
  v_dv := (select count(*)::int from public.demandes_validation d where d.client_id = v_client);

  v_n := private.reput_prevenir_decideurs(v_h);
  select * into e from public.envois x where x.client_id = v_client and x.destinataire_membre = v_gerant
    and x.cle_idempotence like 'reput.a_valider:%' order by x.cree_le desc limit 1;
  return next ok(e.id is not null and e.direct and e.canal = 'email', 'Le gérant reçoit un courriel interne, sans validation');
  return next is((select count(*)::int from public.demandes_validation d where d.client_id = v_client), v_dv,
                 'Aucune demande de validation pour ce courriel');
  return next ok(e.corps like '%https://omegaai.fr/espace2/reput%' and e.corps not like '%Confidentiel%' and e.corps not like '%velux%',
                 'Le courriel mène à /espace2/reput et ne dit ni le client ni sa question');
  return next is(private.reput_prevenir_decideurs(v_h + interval '20 minutes'), 0, 'Un seul courriel par décideur et par heure');
  return next ok(not exists (select 1 from public.envois x where x.client_id = v_client and x.destinataire_membre = v_collab),
                 'Un collaborateur n''est jamais prévenu');
  return next is(private.reput_prevenir_decideurs(v_h + interval '1 hour'), 0,
                 'L''heure suivante, sans nouvelle réponse : pas de rappel en boucle');

  -- Un sujet routé vers un service : seuls ses membres sont prévenus.
  insert into public.equipes (client_id, cle, nom) values (v_client, 'c3_11_tarifs', 'Tarifs (C3-11)') returning id into v_equipe;
  insert into public.equipes_membres (client_id, equipe_id, user_id) values (v_client, v_equipe, v_daf);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_router_sujet(v_client, 'tarifs', v_equipe);
  perform tests.redevenir_admin();
  v_rep := ((tests.c3_repondre(v_client, 'c3-11b@exemple.test', 'Autre', 'Votre prix ?', 'tarifs', false, null,
                               'Nous vérifions et revenons vers vous.')) ->> 'reponse')::uuid;
  update public.reput_reponses set cree_le = v_h + interval '2 hours' where client_id = v_client and sujet = 'tarifs' and statut = 'a_valider';
  perform private.reput_prevenir_decideurs(v_h + interval '2 hours');
  return next ok(exists (select 1 from public.envois x where x.client_id = v_client and x.destinataire_membre = v_daf
                         and x.cle_idempotence = 'reput.a_valider:' || v_daf::text || ':' || to_char((v_h + interval '2 hours') at time zone 'UTC', 'YYYY-MM-DD"T"HH24')),
                 'Le membre du service est prévenu de la réponse de son sujet');
  return next ok(not exists (select 1 from public.envois x where x.client_id = v_client and x.destinataire_membre = v_gerant
                             and x.cle_idempotence = 'reput.a_valider:' || v_gerant::text || ':' || to_char((v_h + interval '2 hours') at time zone 'UTC', 'YYYY-MM-DD"T"HH24')),
                 'Le gérant hors du service n''est pas prévenu de cette réponse');
  return next ok(not has_function_privilege('authenticated', 'private.reput_prevenir_decideurs(timestamptz)', 'execute'),
                 'La fonction reste fermée aux utilisateurs');
end $f$;

select * from runtests('tests'::name, '^test_c3_11_');
