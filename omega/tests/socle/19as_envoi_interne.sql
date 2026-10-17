-- Socle 19as — envoi interne : du serveur à un membre, gabarit validé et fermé, sans demande de validation.
-- Banc cccccccc-…000c (il lui faut au moins un membre dans public.comptes). runtests() annule tout.

create or replace function tests.test_socle_19as_envoi_interne() returns setof text
language plpgsql as $f$
declare
  banc uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_membre uuid;
  v_ferme uuid;
  v_libre uuid;
  v_id uuid;
  v_id2 uuid;
  e public.envois;
begin
  select c.user_id into v_membre from public.comptes c where c.client_id = banc order by c.user_id limit 1;
  if v_membre is null then
    return next skip('le banc n''a aucun membre', 7);
    return;
  end if;
  perform tests.redevenir_admin();
  insert into public.gabarits_messages (client_id, module, code, langue, version, canal, libelle, sujet, corps, variables,
                                        transactionnel, donnees_sante, espacement, statut)
  values (banc, 'reput', 'reput.essai_19as_ferme', 'fr', 1, 'email', 'Essai 19as — fermé', 'Demande transférée',
          'Une demande vous est transférée le {{jour}} ; {{attente}} en attente.', '{"jour": "date", "attente": "nombre"}'::jsonb,
          true, false, false, 'brouillon')
  returning id into v_ferme;
  insert into public.gabarits_messages (client_id, module, code, langue, version, canal, libelle, sujet, corps, variables,
                                        transactionnel, donnees_sante, espacement, statut)
  values (banc, 'reput', 'reput.essai_19as_libre', 'fr', 1, 'email', 'Essai 19as — libre', 'Demande transférée',
          'Message : {{message}}', '{"message": "texte"}'::jsonb, true, false, false, 'brouillon')
  returning id into v_libre;
  perform tests.endosser_serveur();
  perform public.valider_gabarit(v_ferme, 'A1 — test 19as');
  perform public.valider_gabarit(v_libre, 'A1 — test 19as');

  v_id := public.envoyer_interne(banc, 'reput', null, null, 'email', v_membre, 'reput.essai_19as_ferme',
                                 jsonb_build_object('jour', to_char(current_date, 'YYYY-MM-DD'), 'attente', 3), 'test19as:1');
  v_id2 := public.envoyer_interne(banc, 'reput', null, null, 'email', v_membre, 'reput.essai_19as_ferme',
                                  jsonb_build_object('jour', to_char(current_date, 'YYYY-MM-DD'), 'attente', 3), 'test19as:1');
  perform tests.redevenir_admin();
  select * into e from public.envois where id = v_id;
  return next is(v_id2, v_id, 'rejouer avec la même clé rend le même envoi');
  return next ok(e.destinataire_membre = v_membre and e.direct and e.prepare_par is null and e.gabarit_id = v_ferme,
                 'au membre, par le gabarit, décidé par le serveur (direct, sans préparateur)');
  return next ok(e.demande_id is null and e.statut <> 'a_valider'
                 and not exists (select 1 from public.demandes_validation d where d.cle_idempotence = 'envoi:' || v_id::text),
                 format('exempté de validation : aucune demande, statut %s (%s)', e.statut, coalesce(e.verrou, 'sans verrou')));

  perform tests.endosser_serveur();
  return next throws_ok(format('select public.envoyer_interne(%L::uuid, ''reput'', null, null, ''email'', %L::uuid, ''reput.essai_19as_libre'', ''{"message": "x"}''::jsonb, ''test19as:2'')',
                               banc, v_membre), '22023', null, 'gabarit à variable de texte : refusé');
  return next throws_ok(format('select public.envoyer_interne(%L::uuid, ''reput'', null, null, ''email'', %L::uuid, ''reput.essai_19as_ferme'', ''{}''::jsonb, ''test19as:3'')',
                               banc, gen_random_uuid()), '22023', null, 'hors de l''organisation : refusé');
  perform tests.redevenir_admin();
  return next ok(has_function_privilege('service_role', 'public.envoyer_interne(uuid, text, text, text, text, uuid, text, jsonb, text, uuid)', 'execute')
                 and not has_function_privilege('authenticated', 'public.envoyer_interne(uuid, text, text, text, text, uuid, text, jsonb, text, uuid)', 'execute')
                 and not has_function_privilege('authenticated', 'private.envoyer_interne(uuid, text, text, text, text, uuid, text, jsonb, text, uuid)', 'execute'),
                 'envoyer_interne : service_role seul');
  return next ok(not exists (select 1 from public.envois x where x.cle_idempotence in ('test19as:2', 'test19as:3')),
                 'rien n''est né des refus');
end $f$;

select * from runtests('tests'::name, '^test_socle_19as_');
