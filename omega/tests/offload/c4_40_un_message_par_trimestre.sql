-- c4_40 — OFFLOAD : « Un message par trimestre au plus » par défaut (décision de Teo du 27/10 ; session C4).
-- Après c4_00, c4_02, c4_03 (aides) et les migrations c4_01 à c4_40. runtests() annule tout.

create or replace function tests.test_c4_40_un_message_par_trimestre() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v uuid; v2 uuid;
  r public.offload_reprises;
begin
  perform tests.c4_reprises_pretes();
  return next ok((select c.column_default from information_schema.columns c where c.table_schema = 'public'
                    and c.table_name = 'offload_reglages' and c.column_name = 'relance_ecrite') = 'false'
                 and not (select g.relance_ecrite from public.offload_reglages g where g.client_id = v_client),
                 'Par défaut, la relance écrite est éteinte, y compris chez un client qui ne l''a jamais choisie');

  -- Sans choix du client : un seul message, puis la sortie du cycle.
  v := tests.c4_compte_courriel('UT40', 'Garage Trimestre', 'atelier@trimestre.test', 70);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v);
  perform tests.c4_evenement_envoi(r.envoi1_id, 'envoye');
  update public.offload_reprises set envoye1_le = now() - interval '8 days' where id = r.id;
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v);
  return next ok(r.statut = 'close' and r.issue = 'sans_reponse' and r.envoi2_id is null
                 and (select count(*) from public.envois x where x.objet_type = 'offload_reprises' and x.objet_id = r.id::text) = 1,
                 'Un message sans réponse : aucun second message, le compte sort du cycle (' || r.statut || ')');
  -- Le trimestre suivant seulement : la quarantaine compte depuis la clôture.
  perform private.offload_cycle(v_client, null);
  return next is((select count(*)::integer from public.offload_reprises x where x.compte_id = v), 1,
                 'Pas de nouvelle reprise du compte dans le trimestre');

  -- La quarantaine ne descend plus sous 90 jours.
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.offload_regler(%L::uuid, %L)', v_client, '{"quarantaine_jours": 30}'), '23514',
                        'La quarantaine entre deux reprises va de 90 à 730 jours.',
                        'Une quarantaine de 30 jours est refusée : elle laisserait partir deux messages dans le trimestre');

  -- Le choix explicite du client rallume la relance écrite.
  perform public.offload_regler(v_client, '{"relance_ecrite": true}');
  perform tests.redevenir_admin();
  v2 := tests.c4_compte_courriel('UT41', 'Garage Choix', 'atelier@choix.test', 70);
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v2);
  perform tests.c4_evenement_envoi(r.envoi1_id, 'envoye');
  update public.offload_reprises set envoye1_le = now() - interval '8 days' where id = r.id;
  perform private.offload_cycle(v_client, null);
  r := tests.c4_reprise(v2);
  return next ok(r.envoi2_id is not null,
                 'Choisie dans les réglages, la relance écrite prépare un rappel (' || r.statut || ')');
end $f$;

select * from runtests('tests'::name, '^test_c4_40_');
