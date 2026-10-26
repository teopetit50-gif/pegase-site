-- c3_46 — la nuit, une réponse de fond part si et seulement si son sujet est couvert par un accord permanent du client.
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_45 (aides tests.c3_*, dont tests.c3_repondre de
-- c3_03) et les migrations c3_01 à c3_46. Banc en mode essai : rien ne part pour de vrai. runtests() annule tout.

create or replace function tests.test_c3_46_reponse_nuit_accord() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; v_daf uuid; v_h uuid; d record; v_r jsonb;
  v_nuit timestamptz := '2026-10-27 02:00:00+00';   -- mardi, 3 h à Paris
  v_jour timestamptz := '2026-10-27 09:00:00+00';   -- mardi, 10 h à Paris
  cou public.envois; sans public.envois;
  r_cou_nuit jsonb; r_sans_nuit jsonb; r_cou_jour jsonb; r_sans_jour jsonb; r_tiers jsonb; r_module jsonb; r_faux jsonb; r_revoque jsonb;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_h := (public.reput_ecrire_connaissance(null, v_client, jsonb_build_object('sujet', 'horaires', 'genre', 'horaires',
    'titre', 'Horaires (C3-46)', 'contenu', 'Le samedi de 9 h à 12 h.', 'source', 'Banc C3-46')) ->> 'id')::uuid;
  perform tests.redevenir_admin();
  update public.reput_connaissances set statut = 'validee' where id = v_h and statut <> 'validee';
  -- L'accord permanent : proposé par le gérant, activé par un autre décideur (c3_13).
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_envoi_automatique(v_client, true);
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  for d in select v.id from public.demandes_validation v join public.politiques p on p.demande_id = v.id
           where p.client_id = v_client and p.module = 'reput' and p.statut = 'a_valider' and v.statut = 'en_attente' loop
    insert into public.approbations (demande_id, client_id, user_id, decision) values (d.id, v_client, v_daf, 'approuve');
  end loop;
  perform tests.redevenir_admin();

  -- Une réponse couverte par l'accord (tirée de la base, sujet autorisé) ; une autre, hors base, sans accord.
  v_r := tests.c3_repondre(v_client, 'c3-46a@exemple.test', 'Fictif Nuit Accord', 'Ouvert samedi ?', 'horaires', true, array[v_h],
                           'Oui, le samedi de 9 h à 12 h.');
  select * into cou from public.envois e where e.id = (v_r ->> 'envoi')::uuid;
  v_r := tests.c3_repondre(v_client, 'c3-46b@exemple.test', 'Fictif Nuit Sans', 'Le prix d''un ramonage ?', 'autre', false, '{}'::uuid[],
                           'Notre équipe revient vers vous.');
  select * into sans from public.envois e where e.id = (v_r ->> 'envoi')::uuid;
  return next ok(cou.id is not null and sans.id is not null
                 and (select x.politique_id is not null from public.demandes_validation x where x.id = cou.demande_id)
                 and (select x.politique_id is null from public.demandes_validation x where x.id = sans.demande_id),
                 'Deux réponses : l''une couverte par un accord permanent, l''autre non');
  return next ok(coalesce((to_jsonb(cou) ->> 'reponse_accord')::boolean, false) and not coalesce((to_jsonb(sans) ->> 'reponse_accord')::boolean, false) and not coalesce(cou.accuse, false),
                 'Marquage : seule la réponse couverte par l''accord est marquée (et pas comme un accusé)');

  r_cou_nuit := private.verrous_envoi(cou, true, v_nuit);
  r_sans_nuit := private.verrous_envoi(sans, true, v_nuit);
  r_cou_jour := private.verrous_envoi(cou, true, v_jour);
  r_sans_jour := private.verrous_envoi(sans, true, v_jour);
  return next ok(coalesce(r_sans_nuit ->> 'code', '') = 'HORS_HEURES',
                 'Nuit, sans accord : la réponse attend l''ouverture (HORS_HEURES)' || format(' [%s]', coalesce(r_sans_nuit ->> 'code', 'aucun')));
  return next ok(coalesce(r_cou_nuit ->> 'code', '') <> 'HORS_HEURES',
                 'Nuit, avec accord : la réponse part (pas de HORS_HEURES)' || format(' [%s]', coalesce(r_cou_nuit ->> 'code', 'aucun')));
  return next ok(coalesce(r_cou_jour ->> 'code', '') <> 'HORS_HEURES' and coalesce(r_sans_jour ->> 'code', '') <> 'HORS_HEURES',
                 'Jour, avec ou sans accord : pas de HORS_HEURES' || format(' [avec %s ; sans %s]', coalesce(r_cou_jour ->> 'code', 'aucun'),
                                                                             coalesce(r_sans_jour ->> 'code', 'aucun')));
  return next ok(r_cou_nuit is not distinct from r_cou_jour,
                 'Nuit avec accord : toutes les autres vérifications d''envoi sont les mêmes que le jour'
                 || format(' [nuit %s ; jour %s]', coalesce(r_cou_nuit ->> 'code', 'aucun'), coalesce(r_cou_jour ->> 'code', 'aucun')));

  -- Garde-fous : la marque seule ne suffit pas ; jamais un tiers ; jamais un autre module.
  r_faux := private.verrous_envoi(jsonb_populate_record(sans, '{"reponse_accord": true}'), true, v_nuit);
  return next ok(coalesce(r_faux ->> 'code', '') = 'HORS_HEURES', 'Marquée à tort sans accord : elle attend l''ouverture');
  r_tiers := private.verrous_envoi(jsonb_populate_record(cou, jsonb_build_object('destinataire_adresse', 'tiers-c3-46@exemple.test')), true, v_nuit);
  return next ok(coalesce(r_tiers ->> 'code', '') = 'HORS_HEURES', 'Vers un tiers qui n''a rien demandé : elle attend l''ouverture'
                 || format(' [%s]', coalesce(r_tiers ->> 'code', 'aucun')));
  r_module := private.verrous_envoi(jsonb_populate_record(cou, '{"module": "tiroma"}'), true, v_nuit);
  return next ok(coalesce(r_module ->> 'code', '') = 'HORS_HEURES'
                 and not private.envoi_hors_heures_permis(jsonb_populate_record(cou, '{"module": "tiroma"}')),
                 'Un autre module, de nuit : jamais permis' || format(' [%s]', coalesce(r_module ->> 'code', 'aucun')));

  -- Le patron garde la main : l'accord révoqué, la même réponse attend de nouveau l'ouverture.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_envoi_automatique(v_client, false, 'Essai C3-46');
  perform tests.redevenir_admin();
  r_revoque := private.verrous_envoi(cou, true, v_nuit);
  return next ok(coalesce(r_revoque ->> 'code', '') = 'HORS_HEURES', 'Accord révoqué : la réponse marquée attend de nouveau l''ouverture'
                 || format(' [%s]', coalesce(r_revoque ->> 'code', 'aucun')));
end $f$;

select * from runtests('tests'::name, '^test_c3_46_');
