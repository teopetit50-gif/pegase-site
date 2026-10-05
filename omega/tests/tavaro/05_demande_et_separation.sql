-- 05 — L'ouvrier dépose la demande de validation (étape 7) ; celui qui a chiffré n'approuve pas (étape 8, trou H1) ;
-- un second chiffrage pendant l'attente annule la demande.

create or replace function tests.test_b2_05_demande_et_separation() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; d public.demandes_validation; p public.loc_propositions; v_prop2 uuid; v_demande uuid;
begin
  jeu := tests.tavaro_chiffrer(tests.tavaro_jeu_contrat(), 'referent');
  v_client := (jeu ->> 'client')::uuid;
  return next is((jeu -> 'ouvrier' ->> 'faits')::int, 1, format('L''ouvrier de base a fait un travail (%s)', jeu -> 'ouvrier'));
  return next isnt(jeu ->> 'demande', null, 'La proposition porte sa demande de validation');
  select * into d from public.demandes_validation where id = (jeu ->> 'demande')::uuid;
  select * into p from public.loc_propositions where id = (jeu ->> 'proposition')::uuid;
  return next is(p.statut, 'a_valider', 'La proposition est à valider');
  return next is(d.statut, 'en_attente', 'La demande est en attente');
  return next is(d.module || ' ' || d.type_action, 'tavaro facture.envoyer', 'Type facture.envoyer (au barème)');
  return next is(d.montant, 418.20::numeric, 'Pour 418,20 €');
  return next is(d.approbations_requises, 1, 'Sous 1 500 € : un accord suffit (règle par défaut)');
  return next ok(d.roles_autorises @> array['valideur']::text[] and d.roles_autorises @> array['gerant']::text[], format('Les valideurs et la direction décident (%s)', d.roles_autorises));
  return next ok(d.resume like 'Facturer le retour du contrat C-2026-0001%', format('Le résumé dit le contrat et le montant : %s', d.resume));
  return next is((d.payload ->> 'proposition')::uuid, p.id, 'Le payload désigne la proposition');
  return next ok(d.echeance > now() and d.echeance < now() + interval '2 days', 'L''échéance est la fin de la journée locale');
  return next is(tests.compter('public', 'regles_validation', format('client_id = %L and module = %L', v_client, 'tavaro')), 4::bigint, 'Les quatre règles par défaut de TAVARO sont posées');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.demande_deposee') >= 1, 'Le journal opposable porte tavaro.demande_deposee');

  -- Trou H1 : celui qui a chiffré (ici le référent, valideur) ne doit pas pouvoir approuver sa propre facture.
  return next is(d.payload ->> 'saisi_par', jeu ->> 'referent', 'La demande porte qui a saisi (payload.saisi_par = calculee_par) — migration b2_01');
  return next throws_ok(format('select tests.tavaro_decider(%L::jsonb, %L::uuid, %L)', jeu::text, d.id, 'referent'), '42501', null,
    'Celui qui a chiffré le retour n''approuve pas sa facture (séparation saisie / approbation, 42501)');
  return next is((select x.statut from public.demandes_validation x where x.id = d.id), 'en_attente', 'La demande reste en attente');

  -- Le collaborateur n'est pas dans les rôles autorisés.
  return next throws_ok(format('select tests.tavaro_decider(%L::jsonb, %L::uuid, %L)', jeu::text, d.id, 'collab'), null, null,
    'Un collaborateur n''approuve pas une facture (rôle non autorisé)');

  -- Un second chiffrage pendant l'attente : la demande est annulée, la proposition remplacée.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_prop2 := public.loc_chiffrer_retour((jeu ->> 'contrat')::uuid, tests.tavaro_retour() || '{"km_retour": 12700}'::jsonb);
  perform tests.redevenir_admin();
  return next is((select x.statut from public.demandes_validation x where x.id = d.id), 'annulee', 'Un nouveau calcul annule la demande en attente');
  return next is((select x.statut from public.loc_propositions x where x.id = p.id), 'remplacee', 'La proposition v1 est remplacée');
  return next is((select x.version from public.loc_propositions x where x.id = v_prop2), 2, 'La nouvelle est la v2');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.demande_annulee') >= 1, 'Le journal opposable porte tavaro.demande_annulee');
  perform private.loc_ouvrier(50);
  select p.demande_id into v_demande from public.loc_propositions p where p.id = v_prop2;
  return next isnt(v_demande, null, 'La v2 a sa propre demande après le passage de l''ouvrier');
  return next is((select x.montant from public.demandes_validation x where x.id = v_demande), 433.20::numeric, 'Pour 433,20 € (100 km au-delà du forfait : 36 + 25 + 90 + 60 HT, TVA 20 %, plus 180 de dommage)');

  -- Hors barème : la direction seule.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  v_prop2 := public.loc_chiffrer_retour((jeu ->> 'contrat')::uuid, tests.tavaro_retour() || '{"non_contradictoire": true}'::jsonb);
  perform tests.redevenir_admin();
  perform private.loc_ouvrier(50);
  select d.* into d from public.demandes_validation d join public.loc_propositions p on p.demande_id = d.id where p.id = v_prop2;
  return next is(d.type_action, 'facture.envoyer_hors_bareme', 'Hors barème : type facture.envoyer_hors_bareme');
  return next ok(not (d.roles_autorises @> array['valideur']::text[]), format('Le valideur n''est pas autorisé sur le hors barème (%s)', d.roles_autorises));
  return next throws_ok(format('select tests.tavaro_decider(%L::jsonb, %L::uuid, %L)', jeu::text, d.id, 'daf'), null, null, 'La DAF (valideur) ne décide pas un hors barème');
  return next lives_ok(format('select tests.tavaro_decider(%L::jsonb, %L::uuid, %L)', jeu::text, d.id, 'gerant'), 'Le gérant décide le hors barème');
end $f$;

select * from runtests('tests'::name, '^test_b2_05_');
