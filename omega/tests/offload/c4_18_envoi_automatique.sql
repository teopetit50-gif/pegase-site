-- c4_18 — OFFLOAD : l'envoi automatique par défaut, « modèle 2 » (session C4, 18/10/2026). Après c4_00, c4_03, c4_09
-- (aides) et les migrations c4_01 à c4_18. runtests() annule tout. Données fictives ; en recette, les envois restent en essai.

create or replace function tests.test_c4_18_envoi_automatique() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_gerant uuid := (banc ->> 'gerant')::uuid;
  v_gerant2 uuid;
  v_collab uuid;
  g public.offload_reglages;
  v_etat jsonb;
  v_a uuid; v_b uuid; v_c uuid; v_d uuid; v_e uuid;
  e public.envois;
  d public.demandes_validation;
begin
  perform tests.c4_reprises_pretes();
  select * into g from public.offload_reglages where client_id = v_client;
  return next ok(g.envoi_auto and g.sujets_auto = array['affaire', 'echeance', 'reprise'],
                 'Par défaut, l''envoi automatique est allumé, pour les trois sujets');

  -- Sans accord permanent actif : le message passe par « À valider », comme avant.
  v_a := tests.c4_compte_courriel('EA1', 'Bâti Nord SARL', 'achats@bati-nord.test', 70);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  select * into e from public.envois where id = (tests.c4_reprise(v_a)).envoi1_id;
  select * into d from public.demandes_validation where id = e.demande_id;
  return next ok(e.statut = 'a_valider' and d.type_action = 'envoi.email' and d.statut = 'en_attente',
                 'Sans accord actif, le message attend une validation (' || coalesce(e.statut, '?') || ')');

  -- L'accord : un collaborateur ne le donne pas, le serveur non plus ; le gérant le donne, une autre personne l'active.
  v_collab := tests.c4_compte(v_client, 'collaborateur', 'collab-c4-auto@banc-varelo.test');
  perform tests.endosser(v_collab, 'collab-c4-auto@banc-varelo.test');
  return next throws_ok(format('select public.offload_donner_accord_auto(%L::uuid)', v_client), '42501', null,
                        'Un collaborateur ne donne pas l''accord de l''envoi automatique');
  perform tests.redevenir_admin();
  return next throws_ok(format('select public.offload_donner_accord_auto(%L::uuid)', v_client), '42501', null,
                        'Le serveur ne donne pas l''accord à la place d''une personne');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_etat := public.offload_donner_accord_auto(v_client);
  return next is(v_etat ->> 'accord', 'a_valider', 'Le gérant donne l''accord : il est « à valider » au socle');
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from public.politiques p where p.client_id = v_client and p.module = 'offload' and p.type_action = 'envoi.email'
                         and p.statut = 'a_valider' and p.nombre_mensuel >= 100 and p.cree_par = v_gerant),
                 'Un accord permanent du socle, borné en nombre par mois, donné par le gérant');
  v_gerant2 := tests.c4_compte(v_client, 'gerant', 'gerant2-c4-auto@banc-varelo.test');
  perform tests.endosser(v_gerant2, 'gerant2-c4-auto@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
  select p.demande_id, v_client, v_gerant2, 'approuve', 'Activation de l''envoi automatique (essai C4)'
  from public.politiques p where p.client_id = v_client and p.module = 'offload' and p.statut = 'a_valider';
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_etat := public.offload_envoi_auto(v_client);
  perform tests.redevenir_admin();
  return next is(v_etat ->> 'accord', 'actif', 'Activé par une autre personne, l''accord est actif');

  -- Avec l'accord : un message sans doute part seul ; un message douteux est retenu pour une personne.
  v_b := tests.c4_compte_courriel('EA2', 'Garage Roux', 'atelier@garage-roux.test', 70);
  v_c := tests.c4_compte_courriel('EA3', 'Pressing Lenoir', 'contact@pressing-lenoir.test', 70);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  select * into e from public.envois where id = (tests.c4_reprise(v_b)).envoi1_id;
  select * into d from public.demandes_validation where id = e.demande_id;
  return next ok(e.statut not in ('a_valider', 'bloque') and d.statut = 'approuvee' and d.politique_id is not null,
                 'Sous l''accord, le message part sans validation (' || coalesce(e.statut, '?') || ', ' || coalesce(d.statut, '?') || ')');
  select * into e from public.envois where id = (tests.c4_reprise(v_c)).envoi1_id;
  select * into d from public.demandes_validation where id = e.demande_id;
  return next ok(e.statut = 'a_valider' and d.type_action = 'offload.message_retenu' and d.statut = 'en_attente'
                 and d.politique_id is null and d.resume ilike '%adresse générique%',
                 'Une adresse générique fait douter : le message est retenu pour une personne (' || coalesce(d.resume, '?') || ')');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.message_retenu'),
                 'La retenue est au journal');
  return next is(tests.c4_remettre(e.id, v_gerant2, 'gerant2-c4-auto@banc-varelo.test'), 'envoye',
                 'Lu et approuvé par une personne, le message retenu part');

  -- Un sujet que l'organisation n'a pas autorisé est retenu.
  perform public.offload_regler(v_client, '{"sujets_auto": ["echeance", "affaire"]}');
  return next is((select x.sujets_auto from public.offload_reglages x where x.client_id = v_client), array['affaire', 'echeance'],
                 'Les sujets de l''envoi automatique se règlent par organisation');
  v_d := tests.c4_compte_courriel('EA4', 'Fleurs Morin', 'boutique@fleurs-morin.test', 70);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  select * into d from public.demandes_validation
  where id = (select x.demande_id from public.envois x where x.id = (tests.c4_reprise(v_d)).envoi1_id);
  return next ok(d.type_action = 'offload.message_retenu' and d.resume ilike '%sujet non autorisé%',
                 'Un sujet non autorisé est retenu (' || coalesce(d.resume, '?') || ')');
  return next throws_ok(format('select public.offload_regler(%L::uuid, %L)', v_client, '{"sujets_auto": ["prospection"]}'), '23514', null,
                        'Seuls reprise, échéance et affaire sont des sujets');

  -- Éteindre l'envoi automatique révoque l'accord ; chaque message repasse par une personne.
  perform public.offload_regler(v_client, '{"envoi_auto": false, "sujets_auto": ["reprise", "echeance", "affaire"]}');
  return next ok(not exists (select 1 from public.politiques p where p.client_id = v_client and p.module = 'offload' and p.statut in ('a_valider', 'active'))
                 and exists (select 1 from public.politiques p where p.client_id = v_client and p.module = 'offload' and p.statut = 'revoquee'),
                 'Éteint, l''accord permanent d''OFFLOAD est révoqué');
  v_e := tests.c4_compte_courriel('EA5', 'Menuiserie Caron', 'devis@menuiserie-caron.test', 70);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  select * into d from public.demandes_validation
  where id = (select x.demande_id from public.envois x where x.id = (tests.c4_reprise(v_e)).envoi1_id);
  return next ok(d.type_action = 'offload.message_retenu' and d.resume ilike '%éteint%',
                 'Éteint, le message attend une personne (' || coalesce(d.resume, '?') || ')');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.offload_donner_accord_auto(%L::uuid)', v_client), '55000', null,
                        'Pas d''accord tant que l''envoi automatique est éteint');
  perform tests.redevenir_admin();

  -- La règle d'un message par trimestre et la quarantaine restent.
  select * into g from public.offload_reglages where client_id = v_client;
  return next ok(not g.relance_ecrite and g.quarantaine_jours = 90, 'Un message par trimestre, quarantaine de 90 jours : inchangés');
  return next ok(not has_function_privilege('authenticated', 'private.offload_envoyer(uuid, text, uuid, text, text, jsonb, jsonb, text, uuid)', 'execute')
                 and not has_function_privilege('anon', 'public.offload_donner_accord_auto(uuid)', 'execute'),
                 'Les portes privées restent fermées');
end $f$;

select * from runtests('tests'::name, '^test_c4_18_');
