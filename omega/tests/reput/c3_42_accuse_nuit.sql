-- c3_42 (et le lot socle c3_42a) — l'accusé de réception part même la nuit, honnête sur les horaires ; la réponse de fond
-- de nuit reste différée ; libellés au plus juste. Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_41
-- et les migrations c3_01 à c3_42a. Rien n'est envoyé (mode essai). runtests() annule tout.

create or replace function tests.test_c3_42_accuse_nuit() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; v_fiche uuid; v_dem uuid; v_j jsonb; v_rec bigint;
  v_hors timestamptz := '2026-10-27 02:00:00+00';   -- mardi, 3 h à Paris
  acc public.envois; rep public.envois; r_acc jsonb; r_copie jsonb; r_rep jsonb; r_rep_marque jsonb;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  v_gerant := tests.c3_compte(v_client, 'gerant', 'c3-42-gerant@banc-varelo.test');
  perform public.reput_installer(v_client);
  perform tests.endosser(v_gerant, 'c3-42-gerant@banc-varelo.test');
  perform public.reput_regler(v_client, null, jsonb_build_object('accuse', true));
  v_fiche := (public.reput_ecrire_connaissance(null, v_client, jsonb_build_object('sujet', 'horaires', 'genre', 'horaires',
    'titre', 'Horaires (C3-42)', 'contenu', 'Du lundi au vendredi de 8 h 30 à 18 h.', 'source', 'Gérant')) ->> 'id')::uuid;
  perform tests.redevenir_admin();
  update public.reput_connaissances set statut = 'validee' where id = v_fiche and statut <> 'validee';

  -- ── Une demande de nuit : réponse de fond préparée, accusé préparé ──
  v_dem := tests.c3_15_demande(v_client, 'email', 'c3-42a@exemple.test', 'Fictif Nuit', 'Pouvez-vous passer demain pour la chaudière ?');
  v_j := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'autre', 'langue', 'fr', 'couverte', false,
           'corps', 'Notre équipe revient vers vous.'));
  select * into rep from public.envois e where e.id = (v_j ->> 'envoi')::uuid;
  update public.reput_demandes set statut = 'a_valider' where id = v_dem and statut <> 'a_valider';
  v_j := private.reput_accuser(v_dem);
  select * into acc from public.envois e where e.id = (v_j ->> 'envoi')::uuid;
  return next ok(acc.corps like '%Nos horaires : Du lundi au vendredi de 8 h 30 à 18 h. Si nous sommes fermés en ce moment, votre demande sera traitée en premier à l''ouverture.%',
                 'L''accusé dit les horaires de la base et qu''on traitera la demande en premier à l''ouverture'
                 || case when acc.id is null then ' [accuser : ' || coalesce(v_j::text, 'null') || ']' else '' end);
  return next ok(coalesce(acc.accuse, false) and not coalesce(rep.accuse, false), 'L''accusé est marqué ; la réponse de fond, non');
  return next ok(coalesce(current_setting('omega.envoi_accuse', true), '') <> 'on', 'Le drapeau est retombé après l''accusé');

  -- ── Le socle (c3_42a) : à 3 h, même envoi, avec ou sans la marque ──
  r_acc := private.verrous_envoi(acc, true, v_hors);
  r_copie := private.verrous_envoi(jsonb_populate_record(acc, '{"accuse": false}'), true, v_hors);
  return next ok(coalesce(r_acc ->> 'code', '') <> 'HORS_HEURES' and (coalesce(r_copie ->> 'code', '') = 'HORS_HEURES' or r_copie = r_acc),
                 'L''accusé de nuit part (sans HORS_HEURES) ; sans la marque, il serait différé'
                 || format(' [accusé : %s ; sans marque : %s]', coalesce(r_acc ->> 'code', 'aucun'), coalesce(r_copie ->> 'code', 'aucun')));
  r_rep := private.verrous_envoi(rep, true, v_hors);
  r_rep_marque := private.verrous_envoi(jsonb_populate_record(rep, '{"accuse": true}'), true, v_hors);
  return next ok(r_rep is not null and (coalesce(r_rep ->> 'code', '') = 'HORS_HEURES' or r_rep = r_acc)
                 and r_rep_marque is not distinct from r_rep,
                 'La réponse de fond de nuit reste différée, même marquée à tort (sa clé n''est pas celle d''un accusé)'
                 || format(' [réponse : %s ; marquée : %s]', coalesce(r_rep ->> 'code', 'aucun'), coalesce(r_rep_marque ->> 'code', 'aucun')));
  return next ok(private.envoi_hors_heures_permis(acc) and not private.envoi_hors_heures_permis(rep)
                 and not private.envoi_hors_heures_permis(jsonb_populate_record(acc, '{"module": "tiroma"}')),
                 'Seul l''accusé REPUT est permis la nuit (pas la réponse, pas un autre module)');

  -- ── Libellés ──
  v_rec := (private.deposer_reception(v_client, 'appel', '+33100000001', 'CA-c3-42-1', '01 00 00 04 21', null, null,
            'Rappelez-moi pour un devis.', null, '[]'::jsonb, '{"module": "reput"}'::jsonb) ->> 'id')::bigint;
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  v_j := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'autre', 'langue', 'fr', 'couverte', false,
           'corps', 'Le client demande un devis.'));
  return next ok((select raison like '%rappelez cette personne.' from public.reput_reponses where id = (v_j ->> 'reponse')::uuid)
                 and exists (select 1 from public.alertes a where a.client_id = v_client and a.titre like 'Appel à rappeler : %'),
                 'Appel d''un fixe : « rappelez cette personne », alerte « Appel à rappeler »');
  v_dem := tests.c3_15_demande(v_client, 'email', 'c3-42b@exemple.test', 'Fictif Partiel', 'Ouvert samedi, et le prix d''un ramonage ?');
  perform public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'horaires', 'langue', 'fr', 'couverte', false,
           'sources', jsonb_build_array(v_fiche), 'corps', 'Nous sommes ouverts du lundi au vendredi ; pour le ramonage, notre équipe revient vers vous.'));
  return next ok(exists (select 1 from public.alertes a where a.client_id = v_client and a.titre like 'En partie dans la base, à relire : Fictif Partiel%'),
                 'Fiches citées sans tout couvrir : l''alerte dit « en partie dans la base », pas « hors de la base »');
end $f$;

select * from runtests('tests'::name, '^test_c3_42_');
