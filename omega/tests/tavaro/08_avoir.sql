-- 08 — L'avoir (étapes 12 et 13) : demandé par l'agence, décidé par la direction seule, émis AV-2026-000001, immuable ;
-- un avoir total annule la facture.

create or replace function tests.test_b2_08_avoir() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; f public.loc_factures; a public.loc_avoirs; d public.demandes_validation; v_avoir uuid; v_avoir2 uuid;
begin
  jeu := tests.tavaro_jeu_facture();
  v_client := (jeu ->> 'client')::uuid;
  select * into f from public.loc_factures where client_id = v_client and nature = 'dommages';

  -- La demande d'avoir partiel, par le collaborateur.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_demander_avoir(%L::uuid, %L, 120)', f.id, 'x'), '22023', null, 'Un avoir a un motif d''au moins trois caractères');
  return next throws_ok(format('select public.loc_demander_avoir(%L::uuid, %L, 500)', f.id, 'trop'), '22023', null, 'Un avoir ne dépasse pas ce qui reste de la facture');
  return next throws_ok(format('select public.loc_demander_avoir(%L::uuid, %L, 120.005)', f.id, 'centimes'), '22023', null, 'Un avoir se fait au centime');
  v_avoir := public.loc_demander_avoir(f.id, 'La rayure de portière était signalée au départ (photo de départ).', 120);
  return next throws_ok(format('select public.loc_demander_avoir(%L::uuid, %L, 10)', f.id, 'second'), '55000', null, 'Un seul avoir en attente par facture');
  perform tests.redevenir_admin();
  select * into a from public.loc_avoirs where id = v_avoir;
  return next is(a.statut, 'a_valider', 'L''avoir naît en attente de la direction');
  return next is(a.montant_ttc, 120::numeric, 'Pour 120 €');
  return next is(a.montant_tva, 0::numeric, 'Sans TVA (la facture de dommages n''en a pas)');
  return next is(a.total, false, 'Partiel');
  return next is(a.demande_par, (jeu ->> 'collab')::uuid, 'Il porte qui l''a demandé');
  select * into d from public.demandes_validation where id = a.demande_id;
  return next is(d.type_action, 'avoir.emettre', 'La demande est avoir.emettre');
  return next ok(not (d.roles_autorises @> array['valideur']::text[]), format('La direction seule décide un avoir (%s)', d.roles_autorises));
  return next ok(jsonb_typeof(d.payload -> 'saisi_par') = 'array' and d.payload -> 'saisi_par' ? (jeu ->> 'collab'), format('La demande d''avoir porte qui l''a saisi, en tableau (b2_01) : %s', d.payload -> 'saisi_par'));
  return next ok(tests.tavaro_journal(v_client, 'tavaro.avoir_demande') >= 1, 'Le journal opposable porte tavaro.avoir_demande');
  return next ok(private.loc_section_facturation(v_client, null, current_date) is not null, 'La section de facturation se calcule');

  -- Le référent (valideur) ne peut pas ; le gérant approuve ; l'ouvrier émet.
  return next throws_ok(format('select tests.tavaro_decider(%L::jsonb, %L::uuid, %L)', jeu::text, d.id, 'referent'), null, null, 'Le référent (valideur) n''approuve pas un avoir');
  perform tests.tavaro_decider(jeu, d.id, 'gerant', 'approuve', 'Vu la photo de départ.');
  perform private.loc_ouvrier(50);
  select * into a from public.loc_avoirs where id = v_avoir;
  return next is(a.statut, 'emis', format('L''avoir est émis (travaux : %s)', tests.tavaro_travaux(v_client, 'tavaro.decision')));
  return next is(a.reference, 'AV-2026-000001', 'AV-2026-000001');
  return next is(a.emetteur, f.emetteur, 'Même émetteur que la facture');
  return next ok(a.mentions ->> 'objet' like 'Avoir partiel sur la facture FA-2026-000002%', format('L''objet dit la facture corrigée (%s)', a.mentions ->> 'objet'));
  return next is((select x.statut from public.loc_factures x where x.id = f.id), 'emise', 'La facture reste émise : l''avoir partiel ne la couvre pas');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.avoir_emis') >= 1, 'Le journal opposable porte tavaro.avoir_emis');
  return next throws_ok(format('update public.loc_avoirs set montant_ttc = 1 where id = %L', a.id), '42501', null, 'Un avoir émis ne se modifie pas');

  -- Le reste en avoir : la facture est annulée par ses avoirs.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_avoir2 := public.loc_demander_avoir(f.id, 'Geste commercial sur le reste.');
  perform tests.redevenir_admin();
  return next is((select x.montant_ttc from public.loc_avoirs x where x.id = v_avoir2), 60::numeric, 'Sans montant, l''avoir vaut ce qui reste (60 €)');
  perform tests.tavaro_decider(jeu, (select x.demande_id from public.loc_avoirs x where x.id = v_avoir2), 'gerant', 'approuve', 'D''accord.');
  perform private.loc_ouvrier(50);
  return next is((select x.reference from public.loc_avoirs x where x.id = v_avoir2), 'AV-2026-000002', 'AV-2026-000002');
  return next is((select x.statut from public.loc_factures x where x.id = f.id), 'avoir', 'Couverte par ses avoirs, la facture est annulée');
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_demander_avoir(%L::uuid, %L)', f.id, 'encore'), '23514', null, 'Plus rien à créditer');
  perform tests.redevenir_admin();

  -- Le refus d'un avoir.
  select * into f from public.loc_factures where client_id = v_client and nature = 'frais';
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_avoir := public.loc_demander_avoir(f.id, 'Le client réclame le nettoyage.', 72);
  perform tests.redevenir_admin();
  perform tests.tavaro_decider(jeu, (select x.demande_id from public.loc_avoirs x where x.id = v_avoir), 'gerant', 'rejete', 'Les photos montrent l''habitacle sale.');
  perform private.loc_ouvrier(50);
  return next is((select x.statut from public.loc_avoirs x where x.id = v_avoir), 'refuse', 'Un avoir refusé par la direction est refusé');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.avoir_refuse') >= 1, 'Le journal opposable porte tavaro.avoir_refuse');
  return next is((select x.statut from public.loc_factures x where x.id = f.id), 'emise', 'La facture n''a pas bougé');
end $f$;

select * from runtests('tests'::name, '^test_b2_08_');
