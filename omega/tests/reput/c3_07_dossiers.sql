-- c3_07 — REPUT : une même demande sur deux canaux = un seul dossier ; le routage par service (migration c3_07).
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_06 (aides tests.c3_*) et les migrations c3_01 à c3_07.
-- runtests() annule tout.

create or replace function tests.c3_reception_detail(p_client uuid, p_canal text, p_de text, p_nom text, p_corps text, p_detail jsonb default '{}')
returns bigint language plpgsql as $$
declare v_id bigint;
begin
  insert into public.receptions (client_id, module, canal, boite, identifiant_externe, de_adresse, de_empreinte, de_nom, sujet, corps, detail)
  values (p_client, 'reput', p_canal, 'banc@recu.omegaai.fr', 'c3-07-' || gen_random_uuid()::text, p_de,
          case when p_de is null then null else encode(extensions.digest(lower(trim(p_de)), 'sha256'), 'hex') end,
          p_nom, case when p_canal = 'email' then 'Question' when p_canal = 'formulaire' then 'Formulaire du site' end, p_corps, p_detail)
  returning id into v_id;
  return v_id;
end $$;

create or replace function tests.test_c3_07_dossiers() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; v_daf uuid; v_referent uuid; v_collab uuid; v_equipe uuid;
  v_rec bigint; v_c jsonb; v_d1 jsonb; v_d2 jsonb; v_dem1 uuid; v_dem2 uuid; v_dem3 uuid; v_r jsonb; v_dv uuid;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  v_referent := tests.c3_compte(v_client, 'valideur', 'c3-07-hors-equipe@banc-varelo.test');
  v_collab := tests.c3_compte(v_client, 'collaborateur', 'c3-07-collab@banc-varelo.test');
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email', 'whatsapp']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);

  -- ── Deux canaux, un dossier ──
  v_rec := tests.c3_reception_detail(v_client, 'formulaire', 'jean.dupont@exemple.test', 'Jean Dupont', 'Quel est le prix d''un diagnostic ?',
                                     jsonb_build_object('email', 'jean.dupont@exemple.test', 'telephone', '06 11 22 33 44'));
  v_c := public.reput_commencer(v_rec);
  v_dem1 := (v_c ->> 'demande')::uuid;
  return next is((select cardinality(d.cles_contact) from public.reput_demandes d where d.id = v_dem1), 2,
                 'Un formulaire qui donne courriel et téléphone porte deux clés de contact');
  v_d1 := public.reput_deposer_reponse(v_dem1, '{"sujet":"tarifs","langue":"fr","couverte":false,"corps":"Nous vérifions et revenons vers vous."}'::jsonb);
  v_rec := tests.c3_reception_detail(v_client, 'whatsapp', '+33 6 11 22 33 44', 'Jean', 'Et vous êtes ouverts samedi ?');
  v_c := public.reput_commencer(v_rec);
  v_dem2 := (v_c ->> 'demande')::uuid;
  return next is((select d.dossier_id from public.reput_demandes d where d.id = v_dem2), (select d.dossier_id from public.reput_demandes d where d.id = v_dem1),
                 'Le message WhatsApp du même numéro rejoint le dossier du formulaire');
  return next is(jsonb_array_length(v_c -> 'precedents'), 1, 'Le dossier préparé joint le message précédent');
  return next ok(v_c -> 'precedents' -> 0 ->> 'corps' like '%prix d''un diagnostic%', 'avec son texte, pour une réponse qui couvre tout');
  v_d2 := public.reput_deposer_reponse(v_dem2, '{"sujet":"tarifs","langue":"fr","couverte":false,"corps":"Pour le prix et le samedi, nous revenons vers vous."}'::jsonb);
  return next is((select e.canal from public.envois e where e.id = (v_d2 ->> 'envoi')::uuid), 'whatsapp', 'La réponse part sur le dernier canal utilisé');
  perform private.reput_ouvrier(20);
  return next is((select d.statut || ' / ' || d.regroupee_avec::text from public.reput_demandes d where d.id = v_dem1), 'ignoree / ' || v_dem2::text,
                 'La première demande est regroupée avec la seconde');
  return next is((select e.statut from public.envois e where e.id = (v_d1 ->> 'envoi')::uuid), 'annule', 'Sa réponse en attente ne partira pas : une réponse, pas deux');
  return next is((select v.statut from public.demandes_validation v where v.id = (v_d1 ->> 'demande_validation')::uuid), 'annulee', 'et sort de la file');
  -- Sur la recette, une réponse WhatsApp est « bloquee » par les verrous du socle (accord préalable du destinataire
  -- exigé) ; ici seul compte qu'elle reste, non regroupée.
  return next ok((select d.statut in ('a_valider', 'bloquee') and d.regroupee_avec is null from public.reput_demandes d where d.id = v_dem2),
                 'La seconde reste, seule (à valider, ou bloquée par les verrous WhatsApp du socle) : '
                 || (select d.statut from public.reput_demandes d where d.id = v_dem2));
  v_rec := tests.c3_reception_detail(v_client, 'email', 'autre.personne@exemple.test', 'Autre', 'Bonjour');
  v_dem3 := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  return next isnt((select d.dossier_id from public.reput_demandes d where d.id = v_dem3), (select d.dossier_id from public.reput_demandes d where d.id = v_dem2),
                   'Une autre personne ouvre un autre dossier');
  update public.reput_demandes set recu_le = now() - interval '9 days' where id in (v_dem1, v_dem2);
  v_rec := tests.c3_reception_detail(v_client, 'email', 'jean.dupont@exemple.test', 'Jean Dupont', 'Nouvelle question, deux semaines après.');
  return next isnt((select d.dossier_id from public.reput_demandes d where d.id = (public.reput_commencer(v_rec) ->> 'demande')::uuid),
                   (select d.dossier_id from public.reput_demandes d where d.id = v_dem2), 'Au-delà de sept jours : un nouveau dossier');

  -- ── Le routage par service ──
  insert into public.equipes (client_id, cle, nom) values (v_client, 'c3_accueil_tarifs', 'Accueil tarifs (C3)') returning id into v_equipe;
  insert into public.equipes_membres (client_id, equipe_id, user_id) values (v_client, v_equipe, v_daf);
  perform tests.endosser(v_collab, 'c3-07-collab@banc-varelo.test');
  return next throws_ok(format('select public.reput_router_sujet(%L, %L, %L)', v_client, 'tarifs', v_equipe), '42501', null, 'Un collaborateur ne route pas');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_router_sujet(v_client, 'tarifs', v_equipe);
  perform tests.redevenir_admin();
  return next is((select count(*)::int from public.regles_validation r where r.client_id = v_client and r.module = 'reput' and r.actif
                  and r.equipe_id = v_equipe and r.type_action in ('reput.repondre.tarifs', 'reput.transferer.tarifs')), 2,
                 'Deux règles du socle : les réponses « tarifs » vont à l''équipe');
  v_rec := tests.c3_reception_detail(v_client, 'email', 'routage@exemple.test', 'Routage', 'Combien coûte un diagnostic ?');
  v_r := public.reput_deposer_reponse((public.reput_commencer(v_rec) ->> 'demande')::uuid,
                                      '{"sujet":"tarifs","langue":"fr","couverte":false,"corps":"Nous revenons vers vous."}'::jsonb);
  v_dv := (v_r ->> 'demande_validation')::uuid;
  return next is((select v.type_action from public.demandes_validation v where v.id = v_dv), 'reput.transferer.tarifs', 'La file porte le sujet');
  return next is((select v.equipe_id from public.demandes_validation v where v.id = v_dv), v_equipe, 'et l''équipe du service concerné');
  perform tests.endosser(v_referent, 'c3-07-hors-equipe@banc-varelo.test');
  return next throws_ok(format('select public.reput_decider(%L, %L)', (v_r ->> 'reponse'), 'valider'), '42501', null,
                        'Un valideur hors de l''équipe ne décide pas');
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  return next is(public.reput_decider((v_r ->> 'reponse')::uuid, 'valider') ->> 'statut', 'approuvee', 'Un membre de l''équipe décide');
  perform tests.redevenir_admin();
  return next throws_ok(format($q$insert into public.politiques (client_id, module, type_action, libelle, nombre_mensuel, fin)
                                 values (%L, 'reput', 'reput.transferer.tarifs', 'x', 10, now() + interval '30 days')$q$, v_client),
                        '42501', null, 'Aucun accord ne couvre « à relire », même par sujet');

  -- ── Correctif : le sujet « avis » et le message « demandes d'avis » ont chacun leur accord ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_dv := (public.reput_donner_accord(v_client, 'avis') ->> 'proposee')::uuid;
  return next is((select p.type_action from public.politiques p where p.id = v_dv), 'reput.repondre.avis', 'L''accord du sujet « avis » porte sur ses réponses');
  v_dv := (public.reput_donner_accord(v_client, 'demande_avis') ->> 'proposee')::uuid;
  return next is((select p.type_action from public.politiques p where p.id = v_dv), 'reput.avis', 'L''accord « demande_avis » porte sur les demandes d''avis');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_c3_07_');
