-- c3_02 — REPUT : la réponse préparée, déposée en envoi « a_valider », la décision recopiée (migration c3_02).
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00_jeu.sql et les migrations c3_01, c3_02.
-- Le banc est en mode essai (reglages_envois) : rien ne part vers un vrai client ; runtests() annule tout.
-- Le test joue le rôle de la fonction Edge (clé de service) : il appelle les portes avec un résultat
-- de modèle écrit à la main.

create or replace function tests.c3_reception(p_client uuid, p_canal text, p_de text, p_nom text, p_sujet text, p_corps text,
                                              p_module text default 'reput', p_detail jsonb default '{}') returns bigint
language plpgsql as $$
declare v_id bigint;
begin
  insert into public.receptions (client_id, module, canal, boite, identifiant_externe, de_adresse, de_nom, sujet, corps, detail)
  values (p_client, p_module, p_canal, 'banc@recu.omegaai.fr', 'c3-' || gen_random_uuid()::text, p_de, p_nom, p_sujet, p_corps, p_detail)
  returning id into v_id;
  return v_id;
end $$;

create or replace function tests.test_c3_02_preparation() returns setof text
language plpgsql as $f$
declare
  banc jsonb; jeu jsonb;
  v_client uuid; v_gerant uuid; v_daf uuid; v_autre uuid;
  v_h uuid; v_t uuid; v_rec bigint; v_c jsonb; v_d jsonb; v_dem uuid; v_rep uuid; v_env uuid; v_dv uuid; n integer;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  jeu := tests.jeu();
  v_autre := (jeu ->> 'gerant_a')::uuid;
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai',
         coalesce((select r.essai_adresse from public.reglages_envois r where r.client_id = v_client and r.module is null), 'essais@omegaai.fr'),
         array['email', 'whatsapp', 'sms']
  where to_regclass('public.reglages_envois') is not null
    and not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_regler(v_client, null, jsonb_build_object('signature', 'L''équipe Sogexal', 'formule_appel', 'Bonjour,',
    'formule_politesse', 'Bien cordialement,', 'mention_automatisee', 'Réponse préparée par notre assistant et relue par notre équipe.',
    'langues', jsonb_build_array('fr', 'en')));
  v_h := (public.reput_ecrire_connaissance(null, v_client, jsonb_build_object('sujet', 'horaires', 'genre', 'horaires',
    'titre', 'Horaires', 'contenu', 'Du lundi au vendredi de 8 h 30 à 18 h ; le samedi de 9 h à 12 h.', 'source', 'Gérant')) ->> 'id')::uuid;
  v_t := (public.reput_ecrire_connaissance(null, v_client, jsonb_build_object('sujet', 'tarifs', 'genre', 'tarif',
    'titre', 'Diagnostic', 'contenu', 'Le diagnostic coûte 89 € TTC.', 'source', 'Grille 2026')) ->> 'id')::uuid;
  perform tests.redevenir_admin();

  -- ── Droits ──
  return next ok(not has_function_privilege('authenticated', 'public.reput_commencer(bigint)', 'execute'), 'authenticated n''exécute pas reput_commencer');
  return next ok(not has_function_privilege('authenticated', 'public.reput_deposer_reponse(uuid, jsonb, text)', 'execute'), 'authenticated n''exécute pas reput_deposer_reponse');
  return next ok(not has_function_privilege('authenticated', 'private.reput_synchroniser(uuid)', 'execute'), 'authenticated n''exécute pas reput_synchroniser');
  return next ok(has_function_privilege('service_role', 'public.reput_commencer(bigint)', 'execute'), 'service_role exécute reput_commencer');
  return next ok(exists (select 1 from cron.job j where j.jobname = 'reput-synchro'), 'Cron reput-synchro posé');

  -- ── Une réception d'un autre module est ignorée ──
  v_rec := tests.c3_reception(v_client, 'email', 'compta@fournisseur.test', 'Fournisseur', 'Facture', 'Ci-joint.', 'filed');
  return next is(public.reput_commencer(v_rec) ->> 'statut', 'ignore', 'Une réception FILED n''est pas une demande REPUT');

  -- ── Un courriel couvert par la base : brouillon sourcé, en envoi a_valider, sur le même canal ──
  v_rec := tests.c3_reception(v_client, 'email', 'marie.durand@exemple.test', 'Marie Durand', 'Ouvert samedi ?',
                              'Bonjour, êtes-vous ouverts samedi matin ? Merci.');
  v_c := public.reput_commencer(v_rec);
  v_dem := (v_c ->> 'demande')::uuid;
  return next is(v_c ->> 'statut', 'a_preparer', 'Commencer : la demande est à préparer');
  return next is(v_c ->> 'canal_reponse', 'email', 'Elle se répond par courriel');
  return next ok((v_c -> 'base' -> 'fiches') @> jsonb_build_array(jsonb_build_object('id', v_h)), 'La base en vigueur est jointe');
  return next is(v_c -> 'reception' ->> 'corps', 'Bonjour, êtes-vous ouverts samedi matin ? Merci.', 'Le texte de la demande est joint');
  return next is(public.reput_commencer(v_rec) ->> 'demande', v_dem::text, 'Recommencer rend la même demande');
  return next ok(tests.c3_journal(v_client, 'reput.demande_recue', v_dem::text) is not null, 'Journal : reput.demande_recue');

  v_d := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'horaires', 'langue', 'fr', 'urgence', false, 'couverte', true,
    'sources', jsonb_build_array(v_h), 'corps', 'Oui, nous sommes ouverts le samedi de 9 h à 12 h.',
    'modele', 'claude-essai', 'tokens_entree', 1200, 'tokens_sortie', 80, 'cout_eur', 0.0031), 'reput-reponse/essai');
  v_rep := (v_d ->> 'reponse')::uuid; v_env := (v_d ->> 'envoi')::uuid; v_dv := (v_d ->> 'demande_validation')::uuid;
  return next is(v_d ->> 'statut', 'a_valider', 'La réponse attend la validation');
  return next is(v_d ->> 'type_action', 'reput.repondre.horaires', 'Type d''action par sujet : reput.repondre.horaires');
  return next is((select e.statut from public.envois e where e.id = v_env), 'a_valider', 'L''envoi est « a_valider »');
  return next is((select e.canal from public.envois e where e.id = v_env), 'email', 'sur le canal de la demande');
  return next is((select e.destinataire_adresse from public.envois e where e.id = v_env), 'marie.durand@exemple.test', 'à l''auteur de la demande');
  return next is((select e.sujet from public.envois e where e.id = v_env), 'Re : Ouvert samedi ?', 'Objet : « Re : » et l''objet reçu');
  return next is((select e.demande_id from public.envois e where e.id = v_env), v_dv, 'L''envoi est adossé à la demande de validation REPUT');
  return next ok((select e.corps from public.envois e where e.id = v_env) like 'Bonjour,%samedi de 9 h à 12 h.%Bien cordialement,' || E'\n' || 'L''équipe Sogexal%Réponse préparée par notre assistant%',
                 'Le message porte la formule d''appel, la politesse, la signature et la mention choisies');
  return next is((select d.statut from public.demandes_validation d where d.id = v_dv), 'en_attente', 'La demande de validation est en attente');
  return next is((select d.objet_type || '/' || d.objet_id from public.demandes_validation d where d.id = v_dv), 'reput_demandes/' || v_dem::text,
                 'Elle porte sur la demande REPUT');
  return next is((select p.sources from public.reput_reponses p where p.id = v_rep), array[v_h], 'La réponse garde ses sources');
  return next is((select p.cout_eur from public.reput_reponses p where p.id = v_rep), 0.003100::numeric(12,6), 'Coût et jetons comptés');
  return next is((select r.statut from public.receptions r where r.id = v_rec), 'lue', 'La réception passe « lue »');
  return next ok(not (tests.c3_journal(v_client, 'reput.reponse_preparee', v_dem::text) -> 'donnees' ? 'corps'), 'Le journal ne porte pas le texte');
  return next is(public.reput_deposer_reponse(v_dem, '{"corps":"x"}'::jsonb) ->> 'statut', 'deja', 'Déposer deux fois ne crée rien');

  -- ── Validée par une personne : l'envoi part ; la décision est recopiée ──
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision) values (v_dv, v_client, v_daf, 'approuve');
  perform tests.redevenir_admin();
  perform private.reput_synchroniser(v_client);
  return next is((select p.statut from public.reput_reponses p where p.id = v_rep), 'approuvee', 'Validée : la réponse est approuvée');
  return next is((select d.statut from public.reput_demandes d where d.id = v_dem), 'validee', 'et la demande validée');
  update public.envois set statut = 'envoye', envoye_le = now() where id = v_env;
  perform private.reput_synchroniser(v_client);
  return next is((select d.statut from public.reput_demandes d where d.id = v_dem), 'envoyee', 'Partie : la demande est répondue');
  return next is((select r.statut from public.receptions r where r.id = v_rec), 'traitee', 'et la réception traitée');
  return next ok(tests.c3_journal(v_client, 'reput.reponse_envoyee', v_dem::text) is not null, 'Journal : reput.reponse_envoyee');

  -- ── Refusée par une personne ──
  v_rec := tests.c3_reception(v_client, 'email', 'paul@exemple.test', 'Paul', 'Prix', 'Combien coûte un diagnostic ?');
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  v_d := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'tarifs', 'langue', 'fr', 'couverte', true,
    'sources', jsonb_build_array(v_t), 'corps', 'Le diagnostic coûte 89 € TTC.'));
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
  values ((v_d ->> 'demande_validation')::uuid, v_client, v_daf, 'rejete', 'Je l''appelle moi-même.');
  perform tests.redevenir_admin();
  perform private.reput_synchroniser(v_client);
  return next is((select d.statut from public.reput_demandes d where d.id = v_dem), 'refusee', 'Refusée : la demande est refusée');
  return next isnt((select e.statut from public.envois e where e.id = (v_d ->> 'envoi')::uuid), 'envoye', 'et rien n''est parti');

  -- ── Hors de la base : « je ne sais pas », jamais couvert par un accord, remonté ──
  v_rec := tests.c3_reception(v_client, 'email', 'lea@exemple.test', 'Léa', 'Garantie', 'Quelle est la durée de garantie de vos poses ?');
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  v_d := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'information', 'langue', 'fr', 'couverte', true,
    'sources', jsonb_build_array(gen_random_uuid()), 'corps', 'Nous vérifions ce point et revenons vers vous très vite.'));
  return next is(v_d ->> 'couverte', 'false', 'Des sources qui ne sont pas des fiches de la base : non couverte');
  return next is(v_d ->> 'type_action', 'reput.transferer', 'Type reput.transferer');
  return next is(v_d ->> 'statut', 'a_valider', 'Le « je ne sais pas » attend la validation');
  return next ok(exists (select 1 from public.alertes a where a.client_id = v_client and a.detail ->> 'demande' = v_dem::text),
                 'Une alerte remonte la demande hors base');

  -- ── Une langue non couverte est transférée ──
  v_rec := tests.c3_reception(v_client, 'email', 'hans@beispiel.test', 'Hans', 'Öffnungszeiten', 'Haben Sie am Samstag geöffnet?');
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  v_d := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'horaires', 'langue', 'de', 'couverte', true,
    'sources', jsonb_build_array(v_h), 'corps', 'Samstag von 9 bis 12 Uhr.', 'appel', 'Guten Tag,', 'politesse', 'Mit freundlichen Grüßen,'));
  return next is(v_d ->> 'couverte', 'false', 'Allemand non couvert par les réglages : non couverte');
  return next is((select p.langue from public.reput_reponses p where p.id = (v_d ->> 'reponse')::uuid), 'de', 'La langue de la demande est gardée');
  return next ok((select p.corps from public.reput_reponses p where p.id = (v_d ->> 'reponse')::uuid) like 'Guten Tag,%',
                 'Hors français, les formules sont celles de la langue de la demande');

  -- ── Une réponse en anglais couverte ──
  v_rec := tests.c3_reception(v_client, 'email', 'john@example.test', 'John', 'Opening hours', 'Are you open on Saturday?');
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  v_d := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'horaires', 'langue', 'en', 'couverte', true,
    'sources', jsonb_build_array(v_h), 'corps', 'Yes, we are open on Saturday from 9 am to 12 pm.', 'appel', 'Hello,', 'politesse', 'Kind regards,'));
  return next is(v_d ->> 'type_action', 'reput.repondre.horaires', 'Anglais couvert : réponse par sujet');
  return next is((select e.destinataire_langue from public.envois e where e.id = (v_d ->> 'envoi')::uuid), 'en', 'L''envoi est en anglais');

  -- ── Réclamation et urgence : jamais en envoi seul, alertes ──
  v_rec := tests.c3_reception(v_client, 'email', 'colere@exemple.test', 'Client fâché', 'Inadmissible', 'Votre technicien n''est jamais venu, je résilie.');
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  v_d := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'reclamation', 'langue', 'fr', 'couverte', true,
    'sources', jsonb_build_array(v_h), 'corps', 'Nous avons bien reçu votre message ; le responsable vous rappelle aujourd''hui.'));
  return next is(v_d ->> 'type_action', 'reput.transferer', 'Une réclamation est toujours « à transférer »');
  return next ok(exists (select 1 from public.alertes a where a.client_id = v_client and a.detail ->> 'demande' = v_dem::text), 'Réclamation : alerte');
  v_rec := tests.c3_reception(v_client, 'email', 'fuite@exemple.test', 'Fuite', 'Urgent', 'Il y a une fuite d''eau chez moi, ça coule partout.');
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  v_d := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'urgence', 'langue', 'fr', 'urgence', true, 'couverte', false,
    'corps', 'Nous transmettons immédiatement votre demande à notre équipe d''astreinte.'));
  return next is((select a.niveau from public.alertes a where a.client_id = v_client and a.detail ->> 'demande' = v_dem::text order by a.cree_le desc limit 1),
                 'critique', 'Urgence : alerte critique');
  return next is((select d.urgence from public.reput_demandes d where d.id = v_dem), true, 'La demande est marquée urgente');

  -- ── Un sujet inconnu devient « autre » ──
  v_rec := tests.c3_reception(v_client, 'email', 'x@exemple.test', 'X', 'Question', 'Vendez-vous des chats ?');
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  v_d := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'animaux', 'langue', 'fr', 'couverte', false, 'corps', 'Nous revenons vers vous.'));
  return next is(v_d ->> 'sujet', 'autre', 'Un sujet inconnu devient « autre »');

  -- ── WhatsApp : même canal, sans objet ──
  v_rec := tests.c3_reception(v_client, 'whatsapp', '+33612345678', 'Sophie', null, 'Vous êtes ouverts samedi ?');
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  v_d := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'horaires', 'langue', 'fr', 'couverte', true,
    'sources', jsonb_build_array(v_h), 'corps', 'Oui, le samedi de 9 h à 12 h.'));
  return next is((select e.canal from public.envois e where e.id = (v_d ->> 'envoi')::uuid), 'whatsapp', 'Une demande WhatsApp se répond par WhatsApp');
  return next is((select e.sujet from public.envois e where e.id = (v_d ->> 'envoi')::uuid), null, 'sans objet');

  -- ── Formulaire : par courriel ; sans courriel, à traiter par une personne ──
  v_rec := tests.c3_reception(v_client, 'formulaire', 'anne@exemple.test', 'Anne', 'Formulaire du site', 'Quels sont vos horaires ?');
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  return next is((select d.canal_reponse from public.reput_demandes d where d.id = v_dem), 'email', 'Un formulaire se répond par courriel');
  v_rec := tests.c3_reception(v_client, 'formulaire', null, 'Bernard', 'Formulaire du site', 'Rappelez-moi au 06 00 00 00 00.');
  v_c := public.reput_commencer(v_rec);
  v_dem := (v_c ->> 'demande')::uuid;
  return next is(v_c ->> 'canal_reponse', null, 'Un formulaire sans courriel n''a pas d''adresse de réponse');
  v_d := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'rendez_vous', 'langue', 'fr', 'couverte', false, 'corps', 'Nous vous rappelons.'));
  return next is(v_d ->> 'statut', 'a_traiter', 'Sans adresse : à traiter par une personne');
  return next is(v_d ->> 'envoi', null, 'aucun envoi');

  -- ── Le dépôt échoue (message trop long pour le canal) : à traiter, le travail ne casse pas ──
  v_rec := tests.c3_reception(v_client, 'sms', '+33698765432', 'Long', null, 'Horaires ?');
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  v_d := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'horaires', 'langue', 'fr', 'couverte', true,
    'sources', jsonb_build_array(v_h), 'corps', repeat('Nous sommes ouverts. ', 200)));
  return next is(v_d ->> 'statut', 'a_traiter', 'Envoi refusé par le socle : la demande est à traiter');
  return next ok(v_d ->> 'erreur' is not null, 'et l''erreur est rendue');

  -- ── Échec définitif de la préparation ──
  v_rec := tests.c3_reception(v_client, 'email', 'z@exemple.test', 'Z', 'Q', 'Question.');
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  return next is(public.reput_marquer_echec(v_dem, 'PLAFOND_IA : plafond atteint') ->> 'statut', 'a_traiter', 'Échec définitif : à traiter');

  -- ── Lecture sous RLS ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next ok(tests.compter('public', 'reput_demandes', format('client_id = %L', v_client)) >= 10, 'Le gérant lit les demandes de son organisation');
  return next ok(tests.compter('public', 'reput_reponses', format('client_id = %L', v_client)) >= 9, 'et leurs réponses');
  return next throws_ok(format('select public.reput_commencer(%s)', v_rec), '42501', null, 'Un membre n''appelle pas les portes du serveur');
  perform tests.endosser(v_autre, 'a5-gerant-a@essai.invalid');
  return next is(tests.compter('public', 'reput_demandes', format('client_id = %L', v_client))::int, 0, 'Une autre organisation ne lit pas les demandes du banc');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_c3_02_');
