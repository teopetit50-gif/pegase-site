-- c3_16 — REPUT : le sujet secondaire et le second service prévenu.
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_15 (aides tests.c3_*, dont tests.c3_repondre de
-- c3_03) et les migrations c3_01 à c3_16 et le socle 19as. Banc en essai : rien ne part pour de vrai. runtests() annule tout.

create or replace function tests.test_c3_16_secondaire() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; v_daf uuid; v_collab uuid; v_lecteur uuid; v_hors uuid; v_site uuid;
  v_site_dem uuid; v_eq_t uuid; v_eq_r uuid; v_dem uuid; v_j jsonb; v_dv int; e record;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  v_collab := tests.c3_compte(v_client, 'collaborateur', 'c3-16-collab@banc-varelo.test');
  v_lecteur := tests.c3_compte(v_client, 'lecteur', 'c3-16-lecteur@banc-varelo.test');
  v_hors := tests.c3_compte(v_client, 'collaborateur', 'c3-16-hors@banc-varelo.test', false);
  insert into public.entites (client_id, nom, type) values (v_client, 'Agence de Brest (C3-16)', 'site') returning id into v_site;
  insert into public.comptes_entites (client_id, user_id, entite_id) values (v_client, v_hors, v_site);
  insert into public.entites (client_id, nom, type) values (v_client, 'Agence de Lille (C3-16)', 'site') returning id into v_site_dem;
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);
  insert into public.equipes (client_id, cle, nom) values (v_client, 'c3_16_tarifs', 'Tarifs (C3-16)') returning id into v_eq_t;
  insert into public.equipes (client_id, cle, nom) values (v_client, 'c3_16_planning', 'Planning (C3-16)') returning id into v_eq_r;
  insert into public.equipes_membres (client_id, equipe_id, user_id) values (v_client, v_eq_t, v_daf);
  insert into public.equipes_membres (client_id, equipe_id, user_id) values (v_client, v_eq_r, v_collab), (v_client, v_eq_r, v_hors);
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_router_sujet(v_client, 'tarifs', v_eq_t);
  perform public.reput_router_sujet(v_client, 'rendez_vous', v_eq_r);
  perform public.reput_router_sujet(v_client, 'devis', v_eq_t);
  perform tests.redevenir_admin();

  v_dem := (tests.c3_repondre(v_client, 'c3-16@exemple.test', 'Client Confidentiel', 'Combien pour la pose, et quand pouvez-vous venir ?',
                              'tarifs', false, null, 'Nous vérifions et revenons vers vous.') ->> 'demande')::uuid;
  update public.reput_demandes set entite_id = v_site_dem where id = v_dem;   -- une demande d'un site : le périmètre compte
  v_dv := (select count(*)::int from public.demandes_validation d where d.client_id = v_client);

  -- ── Le serveur note le sujet secondaire ; le second service est prévenu ──
  v_j := public.reput_noter_sujet_secondaire(v_dem, 'rendez_vous');
  return next is((select sujet_secondaire from public.reput_demandes where id = v_dem), 'rendez_vous', 'Le sujet secondaire est noté');
  return next is((select sujet from public.reput_demandes where id = v_dem), 'tarifs', 'Le sujet principal ne change pas (premier concerné)');
  return next is((v_j ->> 'prevenus')::int, 1, 'Un membre du second service est prévenu (celui dont le périmètre couvre la demande)');
  select * into e from public.envois x where x.client_id = v_client and x.destinataire_membre = v_collab
    and x.cle_idempotence = 'reput.second_service:' || v_dem::text || ':' || v_collab::text;
  return next ok(e.id is not null and e.direct and e.canal = 'email', 'Courriel interne au second service, sans validation');
  return next ok(e.corps like '%https://omegaai.fr/espace2/reput%' and e.corps not like '%Confidentiel%' and e.corps not like '%pose%',
                 'Le courriel mène à l''espace et ne dit ni le client ni sa question');
  return next ok(not exists (select 1 from public.envois x where x.client_id = v_client and x.destinataire_membre = v_hors
                             and x.cle_idempotence like 'reput.second_service:%'),
                 'Un membre dont le périmètre ne couvre pas la demande n''est pas prévenu');
  return next ok(not exists (select 1 from public.envois x where x.client_id = v_client and x.destinataire_membre = v_daf
                             and x.cle_idempotence like 'reput.second_service:%'),
                 'Le service principal n''est pas prévenu en second');
  return next is((select count(*)::int from public.demandes_validation d where d.client_id = v_client), v_dv,
                 'Aucune demande de validation de plus');
  return next is((public.reput_noter_sujet_secondaire(v_dem, 'rendez_vous') ->> 'change')::boolean, false, 'Le même sujet deux fois : rien ne change');
  perform public.reput_noter_sujet_secondaire(v_dem, null);
  return next ok((select sujet_secondaire from public.reput_demandes where id = v_dem) is null, 'Nul efface le sujet secondaire');
  return next is((public.reput_noter_sujet_secondaire(v_dem, 'rendez_vous') ->> 'prevenus')::int, 0,
                 'Un membre n''est prévenu qu''une fois par demande');

  -- ── Ce qui ne prévient personne ──
  return next is((public.reput_noter_sujet_secondaire(v_dem, 'devis') ->> 'prevenus')::int, 0,
                 'Second sujet du même service que le principal : personne n''est prévenu en second');
  return next is((public.reput_noter_sujet_secondaire(v_dem, 'horaires') ->> 'prevenus')::int, 0,
                 'Second sujet sans service : noté, personne n''est prévenu');
  return next throws_ok(format('select public.reput_noter_sujet_secondaire(%L, %L)', v_dem, 'tarifs'), '22023', null,
                        'Le sujet secondaire ne peut pas être le principal');
  return next throws_ok(format('select public.reput_noter_sujet_secondaire(%L, %L)', v_dem, 'inexistant'), '22023', null,
                        'Un sujet inconnu est refusé');

  -- ── Qui ──
  return next ok(not has_function_privilege('anon', 'public.reput_noter_sujet_secondaire(uuid, text)', 'execute'), 'anon ne note pas de sujet secondaire');
  perform tests.endosser(v_lecteur, 'c3-16-lecteur@banc-varelo.test');
  return next throws_ok(format('select public.reput_noter_sujet_secondaire(%L, %L)', v_dem, 'rendez_vous'), '42501', null,
                        'Un lecteur ne note pas de sujet secondaire');
  perform tests.endosser(v_collab, 'c3-16-collab@banc-varelo.test');
  return next is(public.reput_noter_sujet_secondaire(v_dem, 'rendez_vous') ->> 'sujet_secondaire', 'rendez_vous',
                 'Un collaborateur qui traite la demande note le sujet secondaire');
  perform tests.redevenir_admin();
  return next ok(tests.c3_journal(v_client, 'reput.sujet_secondaire', v_dem::text) is not null, 'Journal : reput.sujet_secondaire');
end $f$;

select * from runtests('tests'::name, '^test_c3_16_');
