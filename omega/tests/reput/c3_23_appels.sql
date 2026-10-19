-- c3_23 — REPUT : les appels non décrochés, transcrits (réception « appel », réponse par SMS à un mobile, sinon à rappeler).
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_22 (aides tests.c3_*, dont tests.c3_15_demande de
-- c3_15), le socle c3_23a et les migrations c3_01 à c3_23. Numéros fictifs ; aucun appel, aucun enregistrement. runtests() annule tout.

create or replace function tests.test_c3_23_appels() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_j jsonb; v_rec bigint; v_dem uuid; v_wa uuid; d public.reput_demandes;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);

  -- ── Le socle (c3_23a) : une réception « appel » ──
  v_wa := tests.c3_15_demande(v_client, 'whatsapp', '+33600000023', 'Fictif Appel', 'Bonjour, ma chaudière fait un bruit.', now() - interval '1 hour');
  v_j := private.deposer_reception(v_client, 'appel', '+33100000001', 'CA-c3-23-1', '06 00 00 00 23', null, null,
                                   'Bonjour, je vous ai écrit sur WhatsApp, la chaudière fuit maintenant, rappelez-moi.', null, '[]'::jsonb,
                                   '{"module": "reput", "source": "twilio_voix"}'::jsonb);
  v_rec := (v_j ->> 'id')::bigint;
  return next ok((v_j ->> 'nouvelle')::boolean and (select canal from public.receptions where id = v_rec) = 'appel',
                 'Le socle accepte une réception « appel » (message transcrit)');
  return next is((private.deposer_reception(v_client, 'appel', '+33100000001', 'CA-c3-23-1', '0600000023') ->> 'nouvelle')::boolean, false,
                 'Le même appel n''est déposé qu''une fois');
  return next throws_ok(format('select private.deposer_reception(%L, %L, %L, %L)', v_client, 'fax', '+33100000001', 'X'), '22023', null,
                        'Un canal inconnu reste refusé');

  -- ── REPUT : la demande, la réponse par SMS au mobile ──
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  select * into d from public.reput_demandes x where x.id = v_dem;
  return next ok(d.canal = 'appel' and d.canal_reponse = 'sms' and d.adresse_reponse = '+33600000023',
                 'Un appel d''un mobile se répond par SMS, au numéro au format international');
  return next is(d.dossier_id, (select x.dossier_id from public.reput_demandes x where x.id = v_wa),
                 'L''appel rejoint le dossier du WhatsApp du même numéro');

  -- ── Un fixe, un numéro masqué : à rappeler ──
  v_rec := (private.deposer_reception(v_client, 'appel', '+33100000001', 'CA-c3-23-2', '+33 1 00 00 00 99', null, null,
                                      'Appel manqué, sans message laissé.', null, '[]'::jsonb, '{"module": "reput"}'::jsonb) ->> 'id')::bigint;
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  return next ok((select canal_reponse is null and adresse_reponse is null from public.reput_demandes where id = v_dem),
                 'Un fixe n''a pas d''adresse écrite : pas de SMS');
  perform public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'autre', 'langue', 'fr', 'couverte', false, 'corps', 'Nous vous rappelons.'));
  return next is((select statut from public.reput_demandes where id = v_dem), 'a_traiter', 'Il va « à traiter » : une personne rappelle');
  v_rec := (private.deposer_reception(v_client, 'appel', '+33100000001', 'CA-c3-23-3', null, null, null,
                                      'Appel manqué, sans message laissé.', null, '[]'::jsonb, '{"module": "reput"}'::jsonb) ->> 'id')::bigint;
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  return next ok((select canal_reponse is null from public.reput_demandes where id = v_dem),
                 'Un numéro masqué : rien à quoi répondre par écrit');

  -- ── Le mobile français ──
  return next ok(private.reput_mobile_fr('07 00 00 00 01') = '+33700000001' and private.reput_mobile_fr('0033600000001') = '+33600000001'
                 and private.reput_mobile_fr('+33100000001') is null and private.reput_mobile_fr('+447700900123') is null,
                 'Mobiles français reconnus ; fixe et étranger non');
end $f$;

select * from runtests('tests'::name, '^test_c3_23_');
