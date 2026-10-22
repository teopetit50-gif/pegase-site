-- c3_33 — REPUT : la réponse à un appel manqué s'ouvre sur une excuse ; la réponse par SMS est courte ; un SMS trop long
-- va à la relecture. Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_32 (aides tests.c3_*, dont
-- tests.c3_15_demande de c3_15) et les migrations c3_01 à c3_33. Numéros fictifs ; rien n'est envoyé. runtests() annule tout.

create or replace function tests.test_c3_33_gabarit_appel() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; v_rec bigint; v_dem uuid; v_j jsonb; p public.reput_reponses; v_envoi text;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);
  update public.reput_reglages r set signature = E'L''équipe C3-33\n12 rue Fictive, 75000 Paris\n01 00 00 00 00',
         formule_politesse = 'Bien cordialement,', mention_automatisee = null
  where r.client_id = v_client and r.entite_id is null;

  -- ── L'appel manqué d'un mobile : l'excuse d'abord, la forme courte ──
  v_rec := (private.deposer_reception(v_client, 'appel', '+33100000001', 'CA-c3-33-1', '06 00 00 00 33', null, null,
            'Bonjour, vous êtes ouverts samedi ?', null, '[]'::jsonb, '{"module": "reput", "source": "twilio_voix"}'::jsonb) ->> 'id')::bigint;
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  v_j := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'horaires', 'langue', 'fr', 'couverte', false,
           'corps', E'Votre question est transmise à notre équipe.\n\nElle revient vers vous rapidement.'));
  select * into p from public.reput_reponses x where x.id = (v_j ->> 'reponse')::uuid;
  return next is(p.corps, E'Bonjour, excusez-nous de ne pas avoir décroché.\nVotre question est transmise à notre équipe.\nElle revient vers vous rapidement.\nL''équipe C3-33',
                 'Appel → SMS : l''excuse, la réponse, la première ligne de la signature ; ni politesse ni ligne vide');
  select e.corps into v_envoi from public.envois e where e.id = (v_j ->> 'envoi')::uuid;
  return next is(v_envoi, p.corps, 'L''envoi porte le même texte');

  -- ── La phrase se règle ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next is(public.reput_regler_ouverture_appel(v_client, '  Bonjour,   désolés de vous avoir manqué.  ') ->> 'ouverture_appel',
                 'Bonjour, désolés de vous avoir manqué.', 'Le gérant règle la phrase d''ouverture (espaces resserrés)');
  return next throws_ok(format('select public.reput_regler_ouverture_appel(%L, %L)', v_client, '   '), '22023', null, 'Une phrase vide est refusée');
  perform tests.redevenir_admin();
  return next is(private.reput_gabarit(v_client, null, 'appel', 'sms', private.reput_base(v_client) -> 'reglages', 'fr',
                   '{"corps": "Oui, de 9 h à 12 h."}'::jsonb),
                 E'Bonjour, désolés de vous avoir manqué.\nOui, de 9 h à 12 h.\nL''équipe C3-33', 'La phrase réglée est reprise');

  -- ── Appel d'un fixe (pas de SMS) : la forme longue, l'excuse en tête ──
  return next is(private.reput_gabarit(v_client, null, 'appel', null, private.reput_base(v_client) -> 'reglages', 'fr', '{"corps": "Nous vous rappelons."}'::jsonb),
                 E'Bonjour, désolés de vous avoir manqué.\n\nNous vous rappelons.\n\nBien cordialement,\nL''équipe C3-33\n12 rue Fictive, 75000 Paris\n01 00 00 00 00',
                 'Sans SMS : l''assemblage de toujours, l''excuse tenant lieu de formule d''appel');

  -- ── Ce qui ne change pas : un courriel ──
  return next is(private.reput_gabarit(v_client, null, 'email', 'email', private.reput_base(v_client) -> 'reglages', 'fr', '{"corps": "Oui."}'::jsonb),
                 E'Bonjour,\n\nOui.\n\nBien cordialement,\nL''équipe C3-33\n12 rue Fictive, 75000 Paris\n01 00 00 00 00',
                 'Un courriel garde sa forme, sans excuse');
  return next is(private.reput_gabarit(v_client, null, 'appel', 'sms', private.reput_base(v_client) -> 'reglages', 'en',
                   '{"corps": "Yes, we are open.", "appel": "Hello,"}'::jsonb),
                 E'Hello,\nYes, we are open.\nL''équipe C3-33', 'En anglais : la formule du modèle, la forme courte');

  -- ── Un SMS trop long ne part pas seul ──
  v_rec := (private.deposer_reception(v_client, 'appel', '+33100000001', 'CA-c3-33-2', '06 00 00 00 34', null, null,
            'Quels sont vos tarifs ?', null, '[]'::jsonb, '{"module": "reput", "source": "twilio_voix"}'::jsonb) ->> 'id')::bigint;
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  v_j := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'horaires', 'langue', 'fr', 'couverte', false,
           'corps', repeat('Une phrase bien trop longue pour un SMS. ', 14)));
  select * into p from public.reput_reponses x where x.id = (v_j ->> 'reponse')::uuid;
  return next ok(char_length(p.corps) > private.reput_limite_sms() and p.type_action = 'reput.transferer'
                 and p.raison like '%trop longue%à raccourcir%', 'Plus de 480 caractères : relecture, raison dite');
end $f$;

select * from runtests('tests'::name, '^test_c3_33_');
