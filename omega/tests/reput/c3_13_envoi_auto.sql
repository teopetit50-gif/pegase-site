-- c3_13 — REPUT : le modèle 2 (envoi automatique par défaut ; retenue sur le doute et sur le sujet ; réglable).
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_12 (aides tests.c3_*, dont tests.c3_repondre de
-- c3_03 et tests.c3_reception de c3_02) et les migrations c3_01 à c3_13. Banc en mode essai : rien ne part pour de vrai.
-- runtests() annule tout.

create or replace function tests.test_c3_13_envoi_auto() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; v_daf uuid; v_collab uuid; v_h uuid; v_j jsonb; v_r jsonb; v_rec bigint; v_dem uuid; d record;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  v_collab := tests.c3_compte(v_client, 'collaborateur', 'c3-13-collab@banc-varelo.test');
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_h := (public.reput_ecrire_connaissance(null, v_client, jsonb_build_object('sujet', 'horaires', 'genre', 'horaires',
    'titre', 'Horaires (C3-13)', 'contenu', 'Le samedi de 9 h à 12 h.', 'source', 'Banc C3-13')) ->> 'id')::uuid;
  perform tests.redevenir_admin();

  return next ok((select r.envoi_auto from public.reput_reglages r where r.client_id = v_client and r.entite_id is null),
                 'Par défaut, l''organisation veut l''envoi automatique');
  perform tests.endosser(v_collab, 'c3-13-collab@banc-varelo.test');
  return next throws_ok(format('select public.reput_envoi_automatique(%L, true)', v_client), '42501', null,
                        'Un collaborateur ne règle pas l''envoi automatique');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_j := public.reput_envoi_automatique(v_client, true);
  return next ok((v_j ->> 'proposes')::int >= 1 and (v_j ->> 'a_activer_par_un_autre')::boolean,
                 'Un geste du gérant propose l''accord de tous les sujets autorisables ; un autre décideur l''active');
  perform tests.redevenir_admin();
  return next ok(not exists (select 1 from public.politiques p where p.client_id = v_client and p.module = 'reput'
                             and p.type_action in ('reput.repondre.reclamation', 'reput.repondre.urgence', 'reput.repondre.humain',
                                                   'reput.repondre.autre')),
                 'Aucun accord sur réclamation, urgence, parler à quelqu''un, hors sujet');
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  for d in select v.id from public.demandes_validation v join public.politiques p on p.demande_id = v.id
           where p.client_id = v_client and p.module = 'reput' and p.statut = 'a_valider' and v.statut = 'en_attente' loop
    insert into public.approbations (demande_id, client_id, user_id, decision) values (d.id, v_client, v_daf, 'approuve');
  end loop;
  perform tests.redevenir_admin();

  -- ── Automatique : tirée de la base, sur un sujet autorisé ──
  v_r := tests.c3_repondre(v_client, 'c3-13a@exemple.test', 'Fictif A', 'Ouvert samedi ?', 'horaires', true, array[v_h],
                           'Oui, le samedi de 9 h à 12 h.');
  return next ok(v_r ->> 'politique' is not null and v_r ->> 'envoi_statut' <> 'a_valider',
                 'Automatique : la réponse tirée de la base part seule — ' || coalesce(v_r ->> 'envoi_statut', 'rien'));
  -- ── Retenue : l'IA doute (hors base) ──
  v_r := tests.c3_repondre(v_client, 'c3-13b@exemple.test', 'Fictif B', 'Ouvert le 25 décembre ?', 'horaires', false, null,
                           'Nous vérifions et revenons vers vous.');
  return next is(v_r ->> 'envoi_statut', 'a_valider', 'Retenue sur le doute : hors base, la réponse attend une personne');
  -- ── Retenue : urgence, même tirée de la base ──
  v_rec := tests.c3_reception(v_client, 'email', 'c3-13c@exemple.test', 'Fictif C', 'Urgent', 'Ouvert samedi ? C''est urgent, fuite.');
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  v_r := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'horaires', 'langue', 'fr', 'couverte', true, 'urgence', true,
                                      'sources', jsonb_build_array(v_h), 'corps', 'Oui, le samedi de 9 h à 12 h.'));
  return next is(v_r ->> 'envoi_statut', 'a_valider', 'Retenue sur le doute : une urgence n''est jamais envoyée seule');
  -- ── Retenue : sujet non autorisé ──
  v_r := tests.c3_repondre(v_client, 'c3-13d@exemple.test', 'Fictif D', 'Je suis mécontent.', 'reclamation', true, array[v_h],
                           'Le samedi de 9 h à 12 h.');
  return next is(v_r ->> 'envoi_statut', 'a_valider', 'Retenue sur le sujet : une réclamation attend toujours une personne');

  -- ── Réglable par organisation : coupé, tout redevient relu ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_j := public.reput_envoi_automatique(v_client, false, 'Essai C3-13');
  perform tests.redevenir_admin();
  return next ok((v_j ->> 'revoques')::int >= 1 and not (select r.envoi_auto from public.reput_reglages r
                                                         where r.client_id = v_client and r.entite_id is null),
                 'Coupé : les accords sont révoqués et le réglage le dit');
  v_r := tests.c3_repondre(v_client, 'c3-13e@exemple.test', 'Fictif E', 'Ouvert samedi ?', 'horaires', true, array[v_h],
                           'Oui, le samedi de 9 h à 12 h.');
  return next is(v_r ->> 'envoi_statut', 'a_valider', 'Coupé : la même réponse attend de nouveau une personne');
  return next ok(tests.c3_journal(v_client, 'reput.envoi_automatique', v_client::text) is not null, 'Journal : reput.envoi_automatique');
end $f$;

select * from runtests('tests'::name, '^test_c3_13_');
