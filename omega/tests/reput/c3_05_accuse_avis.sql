-- c3_05 — REPUT : accusé de réception, relance des devis, demandes d'avis, indicateurs (migration c3_05).
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00_jeu.sql, c3_02_preparation.sql, c3_03_accords.sql
-- (tests.c3_reception, tests.c3_remettre, tests.c3_repondre) et les migrations c3_01 à c3_05. runtests() annule tout.

create or replace function tests.test_c3_05_accuse_avis() returns setof text
language plpgsql as $f$
declare
  banc jsonb; jeu jsonb;
  v_client uuid; v_gerant uuid; v_daf uuid; v_collab uuid; v_autre uuid;
  v_h uuid; v_r jsonb; v_dem uuid; v_acc uuid; v_pol uuid; v_act uuid; v_av jsonb; v_a uuid; v_items jsonb; v_rec bigint;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  jeu := tests.jeu();
  v_autre := (jeu ->> 'gerant_a')::uuid;
  v_collab := tests.c3_compte(v_client, 'collaborateur', 'c3-avis-collab@banc-varelo.test');
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_regler(v_client, null, jsonb_build_object('signature', 'L''équipe Sogexal', 'accuse', true,
    'texte_accuse', 'Nous avons bien reçu votre message ; nous vous répondons avant demain midi.'));
  v_h := (public.reput_ecrire_connaissance(null, v_client, jsonb_build_object('sujet', 'horaires', 'genre', 'horaires',
    'titre', 'Horaires', 'contenu', 'Le samedi de 9 h à 12 h.', 'source', 'Gérant')) ->> 'id')::uuid;
  return next throws_ok(format('select public.reput_regler(%L, null, %L::jsonb)', v_client, '{"lien_avis":"http://pas-https.test"}'),
                        '23514', null, 'Un lien d''avis se donne en https');
  perform tests.redevenir_admin();

  -- ── Droits ──
  return next ok(not has_function_privilege('authenticated', 'private.reput_accuser(uuid)', 'execute'), 'authenticated n''exécute pas reput_accuser');
  return next ok(not has_function_privilege('anon', 'public.reput_programmer_avis(uuid, text, text, text, text, date, uuid)', 'execute'), 'anon ne programme pas d''avis');
  return next ok(has_table_privilege('authenticated', 'public.reput_indicateurs', 'select'), 'Les indicateurs se lisent');

  -- ── L'accusé de réception : dans la minute, sous la signature, quand la réponse attend ──
  v_r := tests.c3_repondre(v_client, 'acc@exemple.test', 'Accusé', 'Avez-vous un parking ?', 'information', false, null, 'Nous vérifions et revenons vers vous.');
  v_dem := (v_r ->> 'demande')::uuid;
  perform private.reput_ouvrier(20);
  select d.accuse_envoi into v_acc from public.reput_demandes d where d.id = v_dem;
  return next ok(v_acc is not null, 'Un accusé est déposé pour la demande qui attend');
  return next is((select e.canal || ' / ' || e.destinataire_adresse from public.envois e where e.id = v_acc), 'email / acc@exemple.test', 'sur le canal et à l''adresse de la demande');
  return next ok((select e.corps from public.envois e where e.id = v_acc) like '%avant demain midi%L''équipe Sogexal%', 'avec le texte et la signature des réglages');
  return next is((select e.statut from public.envois e where e.id = v_acc), 'a_valider', 'Sans accord, l''accusé attend la validation');
  perform private.reput_ouvrier(20);
  return next is((select count(*)::int from public.envois e where e.cle_idempotence = 'reput:accuse:' || v_dem::text), 1, 'Un seul accusé par demande');

  -- Avec l'accord « accuse », il part seul.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_pol := (public.reput_donner_accord(v_client, 'accuse') ->> 'proposee')::uuid;
  return next is((select p.type_action from public.politiques p where p.id = v_pol), 'reput.accuser', 'Accord « accuse » : type reput.accuser');
  select p.demande_id into v_act from public.politiques p where p.id = v_pol;
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision) values (v_act, v_client, v_daf, 'approuve');
  perform tests.redevenir_admin();
  v_r := tests.c3_repondre(v_client, 'acc2@exemple.test', 'Accusé 2', 'Livrez-vous à Lyon ?', 'information', false, null, 'Nous revenons vers vous.');
  perform private.reput_ouvrier(20);
  select d.accuse_envoi into v_acc from public.reput_demandes d where d.id = (v_r ->> 'demande')::uuid;
  return next isnt((select e.statut from public.envois e where e.id = v_acc), 'a_valider', 'Avec l''accord, l''accusé part seul');
  return next is((select r.statut from public.reput_reponses r where r.demande_id = (v_r ->> 'demande')::uuid), 'a_valider',
                 'mais la réponse hors base attend toujours');
  return next ok(exists (select 1 from jsonb_array_elements(private.reput_accords_etat(v_client)) x where x ->> 'sujet' = 'accuse' and x ->> 'statut' = 'active'),
                 'reput_accords dit « accusés de réception : actif »');

  -- Désactivé : rien.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_regler(v_client, null, '{"accuse": false}'::jsonb);
  perform tests.redevenir_admin();
  v_r := tests.c3_repondre(v_client, 'acc3@exemple.test', 'Accusé 3', 'Question ?', 'information', false, null, 'Nous revenons vers vous.');
  perform private.reput_ouvrier(20);
  return next is((select d.accuse_envoi from public.reput_demandes d where d.id = (v_r ->> 'demande')::uuid), null, 'Accusé désactivé : rien ne part');

  -- ── La relance d'un devis demandé ──
  v_r := tests.c3_repondre(v_client, 'devis@exemple.test', 'Client Devis', 'Un devis pour une cuisine ?', 'devis', false, null, 'Nous revenons vers vous.');
  v_items := private.reput_point_matin_lignes(v_client, ((now() at time zone 'Europe/Paris')::date + 3));
  return next ok(exists (select 1 from jsonb_array_elements(v_items) x where x ->> 'texte' like 'Devis demandé par Client Devis il y a 3 jours%'),
                 'Trois jours après, le point du matin relance le devis');

  -- ── Les demandes d'avis ──
  perform tests.endosser(v_collab, 'c3-avis-collab@banc-varelo.test');
  return next throws_ok(format('select public.reput_programmer_avis(%L, %L, %L)', v_client, 'email', 'avis@exemple.test'), '22023', null,
                        'Sans lien d''avis dans les réglages : refusé');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_regler(v_client, null, '{"lien_avis": "https://g.page/r/sogexal-banc/review"}'::jsonb);
  perform tests.endosser(v_collab, 'c3-avis-collab@banc-varelo.test');
  return next throws_ok(format('select public.reput_programmer_avis(%L, %L, %L, null, null, %L)', v_client, 'email', 'avis@exemple.test', current_date + 1),
                        '22023', null, 'Un règlement à venir est refusé');
  v_av := public.reput_programmer_avis(v_client, 'email', 'Avis@Exemple.test', 'Mme Avis', 'F-2026-118', current_date - 5);
  v_a := (v_av ->> 'avis')::uuid;
  return next is(v_av ->> 'statut', 'programme', 'Un collaborateur programme la demande d''avis après un règlement');
  return next is(public.reput_programmer_avis(v_client, 'email', 'avis@exemple.test', null, null, current_date) ->> 'statut', 'ecarte',
                 'La même personne n''est pas sollicitée deux fois');
  perform tests.endosser(v_autre, 'a5-gerant-a@essai.invalid');
  return next throws_ok(format('select public.reput_programmer_avis(%L, %L, %L)', v_client, 'email', 'x@exemple.test'), '42501', null,
                        'Une autre organisation ne programme rien chez le banc');
  perform tests.redevenir_admin();
  perform private.reput_ouvrier(20);
  return next is((select cardinality(a.envois) from public.reput_avis a where a.id = v_a), 1, 'Règlement il y a 5 jours : la demande part (J+3 passé)');
  return next ok((select e.corps from public.envois e where e.id = (select a.envois[1] from public.reput_avis a where a.id = v_a)) like '%https://g.page/r/sogexal-banc/review%',
                 'Le message porte le lien d''avis');
  return next is((select e.transactionnel from public.envois e where e.id = (select a.envois[1] from public.reput_avis a where a.id = v_a)), false,
                 'Message non transactionnel : les règles de consentement du socle s''appliquent');
  perform private.reput_ouvrier(20);
  return next is((select cardinality(a.envois) from public.reput_avis a where a.id = v_a), 1, 'Pas de relance avant quatre jours');
  -- Le temps passe : deux relances au plus.
  update public.reput_avis set prochain_le = now() - interval '1 minute' where id = v_a;
  perform private.reput_ouvrier(20);
  update public.reput_avis set prochain_le = now() - interval '1 minute' where id = v_a;
  perform private.reput_ouvrier(20);
  update public.reput_avis set prochain_le = now() - interval '1 minute' where id = v_a and prochain_le is not null;
  perform private.reput_ouvrier(20);
  return next is((select cardinality(a.envois) || ' / ' || a.statut from public.reput_avis a where a.id = v_a), '3 / termine',
                 'Une demande et deux relances au plus, puis terminé');
  v_av := public.reput_programmer_avis(v_client, 'whatsapp', '+33611112222', 'M. Content', null, current_date);
  perform public.reput_avis_recu((v_av ->> 'avis')::uuid);
  update public.reput_avis set prochain_le = now() - interval '1 minute' where id = (v_av ->> 'avis')::uuid;
  perform private.reput_ouvrier(20);
  return next is((select cardinality(a.envois) || ' / ' || a.statut from public.reput_avis a where a.id = (v_av ->> 'avis')::uuid), '0 / avis_recu',
                 'Avis reçu : plus aucune sollicitation');

  -- ── Les indicateurs ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next ok((select sum(i.recues) from public.reput_indicateurs i where i.client_id = v_client) >= 4, 'Indicateurs : reçues comptées');
  return next ok((select sum(i.hors_base) from public.reput_indicateurs i where i.client_id = v_client) >= 4, 'Indicateurs : hors base comptées');
  return next ok((select sum(v.recues) from public.reput_volumes_heure v where v.client_id = v_client) >= 4, 'Volumes par heure');
  perform tests.endosser(v_autre, 'a5-gerant-a@essai.invalid');
  return next is((select count(*)::int from public.reput_indicateurs i where i.client_id = v_client), 0, 'Une autre organisation ne lit pas les indicateurs du banc');
  return next is((select count(*)::int from public.reput_avis a where a.client_id = v_client), 0, 'ni ses demandes d''avis');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_c3_05_');
