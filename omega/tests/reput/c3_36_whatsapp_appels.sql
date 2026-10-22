-- c3_36 — REPUT : un appel manqué se répond par WhatsApp quand l'organisation l'a choisi et que son modèle Meta est validé ;
-- sinon par SMS. Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_35 et les migrations c3_01 à c3_36.
-- Doublures : numéros fictifs, modèle Meta fictif « c3_36_appel_manque » ; aucun compte, rien n'est envoyé (mode essai).
-- runtests() annule tout (le gabarit déposé et validé compris).

create or replace function tests.test_c3_36_whatsapp_appels() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; v_j jsonb; v_g uuid; v_rec bigint; v_dem uuid; d public.reput_demandes; p public.reput_reponses;
  e public.envois;
  function_appel text := 'select (private.deposer_reception(%L, ''appel'', ''+33100000001'', %L, %L, null, null, %L, null, ''[]''::jsonb, ''{"module": "reput"}''::jsonb) ->> ''id'')::bigint';
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);

  -- ── Par défaut : SMS ──
  execute format(function_appel, v_client, 'CA-c3-36-1', '06 00 00 00 36', 'Vous êtes ouverts demain ?') into v_rec;
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  return next is((select canal_reponse from public.reput_demandes where id = v_dem), 'sms', 'Sans réglage : l''appel se répond par SMS');

  -- ── Le gérant choisit WhatsApp : gabarit en brouillon, SMS tant que le modèle n'est pas validé ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.reput_regler_reponse_appels(%L, %L, %L)', v_client, 'whatsapp', 'Appel Manqué'), '22023', null,
                        'Un nom de modèle hors des règles de Meta est refusé');
  return next throws_ok(format('select public.reput_regler_reponse_appels(%L, %L, %L, %L)', v_client, 'whatsapp', 'c3_36_appel_manque', 'Bonjour, rappelez-nous.'),
                        '22023', null, 'Un texte de modèle sans {{message}} est refusé');
  return next throws_ok(format('select public.reput_regler_reponse_appels(%L, %L, %L, %L)', v_client, 'whatsapp', 'c3_36_appel_manque', '{{prenom}} : {{message}}'),
                        '22023', null, 'Une variable inconnue est refusée');
  v_j := public.reput_regler_reponse_appels(v_client, 'whatsapp', 'c3_36_appel_manque', null);
  v_g := (v_j ->> 'gabarit')::uuid;
  return next ok(v_g is not null and v_j ->> 'gabarit_statut' = 'brouillon' and not (v_j ->> 'actif')::boolean,
                 'WhatsApp choisi : le gabarit est déposé en brouillon, pas encore actif');
  return next is((public.reput_regler_reponse_appels(v_client, 'whatsapp', 'c3_36_appel_manque', null) ->> 'gabarit')::uuid, v_g,
                 'Le même réglage rejoué ne dépose pas un second gabarit');
  perform tests.redevenir_admin();
  return next ok((select g.modele_externe = 'c3_36_appel_manque' and g.canal = 'whatsapp' and g.client_id = v_client
                  from public.gabarits_messages g where g.id = v_g), 'Le gabarit porte le nom du modèle Meta, canal WhatsApp, propre à l''organisation');
  execute format(function_appel, v_client, 'CA-c3-36-2', '06 00 00 00 37', 'Pouvez-vous passer pour un diagnostic de la chaudière ?') into v_rec;
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  return next is((select canal_reponse from public.reput_demandes where id = v_dem), 'sms',
                 'Modèle pas encore validé : toujours SMS');

  -- ── Modèle approuvé chez Meta (Teo), validé par le serveur : WhatsApp ──
  execute 'set local role service_role';
  perform public.valider_gabarit(v_g, 'C3-36 — doublure, modèle fictif');
  execute 'reset role';
  execute format(function_appel, v_client, 'CA-c3-36-3', '06 00 00 00 38', 'Bonjour, vous faites les diagnostics le samedi ?') into v_rec;
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  select * into d from public.reput_demandes x where x.id = v_dem;
  return next ok(d.canal_reponse = 'whatsapp' and d.adresse_reponse = '+33600000038', 'Validé : l''appel d''un mobile se répond par WhatsApp');
  v_j := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'horaires', 'langue', 'fr', 'couverte', false,
           'corps', E'Votre question est transmise à notre équipe.\n\nElle vous répond rapidement.'));
  select * into p from public.reput_reponses x where x.id = (v_j ->> 'reponse')::uuid;
  select * into e from public.envois x where x.id = (v_j ->> 'envoi')::uuid;
  return next ok(e.canal = 'whatsapp' and e.gabarit_id = v_g, 'L''envoi part dans le modèle validé');
  return next ok(e.variables ->> 'message' like 'Votre question est transmise à notre équipe. Elle vous répond rapidement.%'
                 and position(E'\n' in e.variables ->> 'message') = 0, 'La réponse est la variable {{message}}, sur une ligne');
  return next ok(position('excusez-nous de ne pas avoir décroché' in p.corps) = 0 and e.corps like 'Bonjour, vous avez appelé % : excusez-nous. Votre question%',
                 'L''ouverture est celle du modèle Meta, jamais répétée dans le message');

  -- ── L'accusé passe aussi par le modèle ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_regler(v_client, null, jsonb_build_object('accuse', true));
  perform tests.redevenir_admin();
  v_j := private.reput_accuser(v_dem);
  select * into e from public.envois x where x.id = (v_j ->> 'envoi')::uuid;
  return next ok(e.canal = 'whatsapp' and e.gabarit_id = v_g and position(E'\n' in e.variables ->> 'message') = 0,
                 'L''accusé de réception part dans le même modèle');

  -- ── Un autre nom de modèle : nouvelle version en brouillon, retour au SMS jusqu'à sa validation ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_j := public.reput_regler_reponse_appels(v_client, 'whatsapp', 'c3_36_appel_manque_v2', 'Appel manqué chez {{organisation}}. {{message}}');
  perform tests.redevenir_admin();
  return next ok((v_j ->> 'gabarit')::uuid <> v_g and not (v_j ->> 'actif')::boolean, 'Nouveau modèle : nouvelle version, inactive');
  execute format(function_appel, v_client, 'CA-c3-36-4', '06 00 00 00 39', 'Quel est le prix d''un ramonage ?') into v_rec;
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  return next is((select canal_reponse from public.reput_demandes where id = v_dem), 'sms',
                 'Le modèle réglé n''est pas validé : SMS');

  -- ── Retour au SMS ; un fixe se rappelle toujours ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_regler_reponse_appels(v_client, 'sms');
  perform tests.redevenir_admin();
  return next is((select reponse_appels from public.reput_reglages where client_id = v_client and entite_id is null), 'sms', 'Le gérant revient au SMS');
  execute format(function_appel, v_client, 'CA-c3-36-5', '01 00 00 00 36', 'Rappelez-moi.') into v_rec;
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  return next is((select canal_reponse from public.reput_demandes where id = v_dem), null::text,
                 'Un fixe : aucune réponse écrite, à rappeler');
  v_j := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'autre', 'langue', 'fr', 'couverte', false,
           'corps', 'Le client demande à être rappelé.'));
  return next is((select corps from public.reput_reponses where id = (v_j ->> 'reponse')::uuid), 'Le client demande à être rappelé.',
                 'TREPUT-12 : un fixe, la note de rappel seule (ni excuse, ni signature, ni SMS)');
  return next ok(not has_function_privilege('authenticated', 'private.reput_preparer_envoi(public.reput_demandes, text, text, text, text, uuid)', 'execute'),
                 'L''envoi reste au serveur');
end $f$;

select * from runtests('tests'::name, '^test_c3_36_');
