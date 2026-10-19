-- c3_15 — REPUT : une même demande sur deux canaux, même sans clé commune d'avance (signature ; nom proposé à une personne).
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_14 (aides tests.c3_*, dont tests.c3_reception de
-- c3_02) et les migrations c3_01 à c3_15. Contacts fictifs (exemple.test, numéros 06 00 …). Banc en essai. runtests() annule tout.

create or replace function tests.c3_15_demande(p_client uuid, p_canal text, p_de text, p_nom text, p_corps text, p_recu_le timestamptz default now())
returns uuid language plpgsql as $$
declare v_rec bigint;
begin
  v_rec := tests.c3_reception(p_client, p_canal, p_de, p_nom, case when p_canal = 'email' then 'Question' end, p_corps);
  update public.receptions set recu_le = p_recu_le where id = v_rec;
  return (public.reput_commencer(v_rec) ->> 'demande')::uuid;
end $$;

create or replace function tests.test_c3_15_rapprochement() returns setof text
language plpgsql as $f$
declare
  banc jsonb; jeu jsonb;
  v_client uuid; v_gerant uuid; v_collab uuid; v_lecteur uuid; v_autre uuid;
  a uuid; b uuid; c uuid; e uuid; g uuid; h uuid; m uuid; n uuid; p uuid; q uuid; s uuid; v_r jsonb;
  dos_a uuid; dos_b uuid;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  v_collab := tests.c3_compte(v_client, 'collaborateur', 'c3-15-collab@banc-varelo.test');
  v_lecteur := tests.c3_compte(v_client, 'lecteur', 'c3-15-lecteur@banc-varelo.test');
  jeu := tests.jeu();
  v_autre := (jeu ->> 'gerant_a')::uuid;
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);

  -- ── Les aides ──
  return next is(private.reput_nom_cle('Marie-Hélène DURAND'), private.reput_nom_cle('durand marie helene'),
                 'Le nom comparable ignore l''ordre, la casse et les accents');
  return next ok(private.reput_nom_cle('Paul') is null, 'Un seul mot ne fait pas un nom comparable');
  return next is(cardinality(private.reput_cles_texte('Merci. Marie — 06 00 11 22 33 — marie@exemple.test')), 2,
                 'Signature : un téléphone et un courriel deviennent deux clés');
  return next is(cardinality(private.reput_cles_texte(E'D''accord.\n\nLe 18/10/2026, Atelier a écrit :\n> appelez le 06 00 99 88 77')), 0,
                 'Le texte cité n''est pas lu');

  -- ── Signature : le courriel donne le téléphone, le WhatsApp de ce téléphone rejoint le dossier ──
  a := tests.c3_15_demande(v_client, 'email', 'c3-15-marie@exemple.test', 'Marie Fictive',
                           E'Bonjour, ouvert samedi ?\nMarie Fictive\n06 00 11 22 33', now() - interval '2 hours');
  b := tests.c3_15_demande(v_client, 'whatsapp', '+33600112233', null, 'Je relance : ouvert samedi ?');
  return next is((select dossier_id from public.reput_demandes where id = b), (select dossier_id from public.reput_demandes where id = a),
                 'Signature : le WhatsApp du numéro signé rejoint le dossier du courriel');
  -- ── Et dans l'autre sens : le WhatsApp d'abord, puis un courriel qui donne ce numéro ──
  c := tests.c3_15_demande(v_client, 'whatsapp', '+33600445566', null, 'Un devis pour une fenêtre ?', now() - interval '1 hour');
  e := tests.c3_15_demande(v_client, 'email', 'c3-15-luc@exemple.test', 'Luc Fictif', E'Suite à mon message au 06 00 44 55 66, voici les mesures.');
  return next is((select dossier_id from public.reput_demandes where id = e), (select dossier_id from public.reput_demandes where id = c),
                 'Signature : le courriel qui donne le numéro du WhatsApp rejoint son dossier');
  -- ── Jamais deux textes entre eux : la signature de l'organisation citée par deux clients ──
  g := tests.c3_15_demande(v_client, 'email', 'c3-15-g@exemple.test', 'Client G', 'J''ai vu votre numéro, le 01 00 20 30 40.', now() - interval '30 minutes');
  h := tests.c3_15_demande(v_client, 'email', 'c3-15-h@exemple.test', 'Client H', 'Votre standard, le 01 00 20 30 40, ne répond pas.');
  return next isnt((select dossier_id from public.reput_demandes where id = h), (select dossier_id from public.reput_demandes where id = g),
                   'Deux clients qui écrivent le même numéro dans leur texte restent deux dossiers');
  return next ok(not ((select cles_texte from public.reput_demandes where id = h) && private.reput_cles_contact('texte', 'banc@recu.omegaai.fr', '{}'::jsonb)),
                 'L''adresse de la boîte de réception n''est jamais une clé');
  m := tests.c3_15_demande(v_client, 'email', 'c3-15-m@exemple.test', 'Client M',
                           E'Merci.\n\nLe 18/10/2026, Atelier a écrit :\n> rappelez au 06 00 77 88 99', now() - interval '20 minutes');
  n := tests.c3_15_demande(v_client, 'whatsapp', '+33600778899', null, 'Bonjour');
  return next isnt((select dossier_id from public.reput_demandes where id = n), (select dossier_id from public.reput_demandes where id = m),
                   'Un numéro seulement cité ne rapproche pas');

  -- ── Le nom : proposé, jamais fusionné seul ──
  p := tests.c3_15_demande(v_client, 'email', 'c3-15-paul@exemple.test', 'Paul Lefèvre', 'Combien pour une porte ?', now() - interval '3 hours');
  perform public.reput_deposer_reponse(p, jsonb_build_object('sujet', 'tarifs', 'langue', 'fr', 'couverte', false, 'corps', 'Nous revenons vers vous.'));
  q := tests.c3_15_demande(v_client, 'whatsapp', '+33600990011', 'lefevre paul', 'Pour la porte, c''est 90 cm.');
  return next is((select rapprochement_propose from public.reput_demandes where id = q), p,
                 'Même nom, autre canal, dans les 48 h : le rapprochement est proposé');
  return next isnt((select dossier_id from public.reput_demandes where id = q), (select dossier_id from public.reput_demandes where id = p),
                   'La proposition ne fusionne rien');
  s := tests.c3_15_demande(v_client, 'whatsapp', '+33600990022', 'Paul', 'Bonjour');
  return next ok((select rapprochement_propose from public.reput_demandes where id = s) is null, 'Un prénom seul ne propose rien');

  -- ── Droits ──
  return next ok(not has_function_privilege('anon', 'public.reput_rapprocher(uuid, uuid)', 'execute')
                 and not has_function_privilege('anon', 'public.reput_separer(uuid)', 'execute'), 'anon ne rapproche ni ne sépare');
  perform tests.endosser(v_lecteur, 'c3-15-lecteur@banc-varelo.test');
  return next throws_ok(format('select public.reput_rapprocher(%L, %L)', q, p), '42501', null, 'Un lecteur ne rapproche pas');
  perform tests.endosser(v_autre, 'a5-gerant-a@essai.invalid');
  return next throws_ok(format('select public.reput_rapprocher(%L, %L)', q, p), '42501', null, 'Une autre organisation ne rapproche pas');

  -- ── Une personne rapproche : un dossier, une réponse ──
  perform tests.redevenir_admin();
  perform public.reput_deposer_reponse(q, jsonb_build_object('sujet', 'tarifs', 'langue', 'fr', 'couverte', false, 'corps', 'Merci, nous chiffrons la porte de 90 cm.'));
  perform tests.endosser(v_collab, 'c3-15-collab@banc-varelo.test');
  v_r := public.reput_rapprocher(q, p);
  perform tests.redevenir_admin();
  return next is((select dossier_id from public.reput_demandes where id = q), (select dossier_id from public.reput_demandes where id = p),
                 'Rapprochées : un seul dossier');
  return next ok((select rapprochement_propose from public.reput_demandes where id = q) is null, 'La proposition tombe');
  return next is((select statut from public.reput_demandes where id = p), 'ignoree',
                 'La réponse plus ancienne en attente cède la place (une seule réponse)');
  return next ok(tests.c3_journal(v_client, 'reput.demande_rapprochee', q::text) is not null, 'Journal : reput.demande_rapprochee');

  -- ── Séparer : la fusion à tort se défait ; la demande regroupée revient à une personne ──
  perform tests.endosser(v_collab, 'c3-15-collab@banc-varelo.test');
  v_r := public.reput_separer(p);
  perform tests.redevenir_admin();
  return next ok((v_r ->> 'separee')::boolean and (select dossier_id from public.reput_demandes where id = p) = p,
                 'Séparée : la demande retrouve son propre dossier');
  return next is((select statut from public.reput_demandes where id = p), 'a_traiter', 'Séparée après regroupement : à traiter par une personne');
  return next ok(tests.c3_journal(v_client, 'reput.demande_separee', p::text) is not null, 'Journal : reput.demande_separee');

  -- ── Écarter une proposition ──
  dos_a := tests.c3_15_demande(v_client, 'email', 'c3-15-jeanne@exemple.test', 'Jeanne Martin', 'Bonjour', now() - interval '1 hour');
  dos_b := tests.c3_15_demande(v_client, 'sms', '+33600123400', 'Martin Jeanne', 'Bonjour');
  perform tests.endosser(v_collab, 'c3-15-collab@banc-varelo.test');
  return next ok((public.reput_ecarter_rapprochement(dos_b) ->> 'ecarte')::boolean, 'Écarter : la proposition est écartée');
  perform tests.redevenir_admin();
  return next ok((select rapprochement_propose from public.reput_demandes where id = dos_b) is null
                 and (select dossier_id from public.reput_demandes where id = dos_b) <> (select dossier_id from public.reput_demandes where id = dos_a),
                 'Écartée : deux dossiers, plus de proposition');
end $f$;

select * from runtests('tests'::name, '^test_c3_15_');
