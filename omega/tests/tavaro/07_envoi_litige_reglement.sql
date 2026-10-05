-- 07 — Le courriel de la facture (étape 10), le litige (11) et le règlement (14).

create or replace function tests.test_b2_07_envoi_litige_reglement() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; f public.loc_factures; d public.demandes_validation; v_envoi jsonb; v_res jsonb;
begin
  jeu := tests.tavaro_jeu_facture();
  v_client := (jeu ->> 'client')::uuid;
  select * into f from public.loc_factures where client_id = v_client and nature = 'frais';
  select * into d from public.demandes_validation where id = (jeu ->> 'demande')::uuid;
  v_envoi := (jeu -> 'ouvrier_decision');

  -- Le courriel : préparé si l'envoi est réglé pour ce loueur, sinon dit « non réglé » et la demande est exécutée quand même.
  if f.envoi_id is not null then
    return next pass('Le courriel de la facture est préparé (envoi ' || f.envoi_id || ')');
    return next is(tests.compter('public', 'envois', format('id = %L and module = %L', f.envoi_id, 'tavaro')), 1::bigint, 'L''envoi est du module tavaro');
    return next ok(tests.tavaro_journal(v_client, 'tavaro.facture_envoi_prepare') >= 1, 'Le journal opposable porte tavaro.facture_envoi_prepare');
    -- Le retour de l'expéditeur : parti.
    v_res := private.loc_envoi_issue(jsonb_build_object('objet_type', 'loc_propositions', 'objet_id', jeu ->> 'proposition', 'envoi', f.envoi_id, 'evenement', 'envoi.envoye'));
    return next is(v_res ->> 'statut', 'envoyee', 'Le retour « envoyé » de l''expéditeur passe les factures en envoyée');
    return next is((select x.statut from public.loc_factures x where x.id = f.id), 'envoyee', 'La facture est envoyée');
    return next ok(tests.tavaro_journal(v_client, 'tavaro.facture_envoyee') >= 1, 'Le journal opposable porte tavaro.facture_envoyee');
  else
    return next is(d.statut, 'executee', 'Sans réglage d''envoi pour ce loueur, la demande est tout de même exécutée (facture à envoyer soi-même)');
    return next ok(tests.tavaro_journal(v_client, 'tavaro.facture_envoi_non_regle') >= 1, 'Le journal opposable porte tavaro.facture_envoi_non_regle');
    return next diag('Pas de reglages_envois pour le loueur d''essai : le courriel réel se prouve sur le banc (mode essai), pas ici.');
    return next is(tests.compter('public', 'alertes', format('client_id = %L and cle like %L', v_client, '%facture:envoi_non_regle:' || (jeu ->> 'proposition'))), 1::bigint, 'Une alerte « envoyez-la vous-même » est levée (clé facture:envoi_non_regle:<proposition>)');
  end if;

  -- Le litige : par l'agence, avec la contestation du client.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_marquer_litige(%L::uuid, %L)', f.id, ''), '22023', null, 'Un litige a un motif');
  perform public.loc_marquer_litige(f.id, 'Le client conteste le retard : il dit avoir rendu les clés à 9 h.');
  perform tests.redevenir_admin();
  return next is((select x.statut from public.loc_factures x where x.id = f.id), 'litige', 'La facture passe en litige');
  return next is((select x.litige_motif from public.loc_factures x where x.id = f.id), 'Le client conteste le retard : il dit avoir rendu les clés à 9 h.', 'Le motif est gardé');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.facture_litige') >= 1, 'Le journal opposable porte tavaro.facture_litige');
  return next ok(private.loc_section_facturation(v_client, (jeu ->> 'siege')::uuid, current_date) @> '[{"gabarit": "tavaro.factures_en_litige"}]'::jsonb, 'Le point du matin de l''agence compte la facture en litige');

  -- Le règlement : la facture en litige se règle quand même (le client a payé) ; le mode est contrôlé.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_marquer_reglee(%L::uuid, %L)', f.id, 'bitcoin'), '22023', null, 'Un mode de règlement inconnu est refusé');
  perform public.loc_marquer_reglee(f.id, 'carte', timestamptz '2026-10-12 10:00:00+02');
  perform tests.redevenir_admin();
  return next is((select x.statut from public.loc_factures x where x.id = f.id), 'reglee', 'La facture est réglée');
  return next is((select x.mode_reglement from public.loc_factures x where x.id = f.id), 'carte', 'Par carte');
  return next is((select x.regle_le from public.loc_factures x where x.id = f.id), timestamptz '2026-10-12 10:00:00+02', 'À la date dite');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.facture_reglee') >= 1, 'Le journal opposable porte tavaro.facture_reglee');
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_marquer_litige(%L::uuid, %L)', f.id, 'trop tard'), '23514', null, 'Une facture réglée ne passe plus en litige');
  return next throws_ok(format('select public.loc_marquer_reglee(%L::uuid, %L)', f.id, 'carte'), '23514', null, 'Une facture réglée ne se règle pas deux fois');
  perform tests.redevenir_admin();

  -- Un autre loueur, ou une personne non connectée : rien.
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre-loueur@essai.invalid');
  return next throws_ok(format('select public.loc_marquer_litige(%L::uuid, %L)', f.id, 'pirate'), 'P0002', null, 'Un autre loueur ne touche pas à cette facture');
  return next is(tests.compter('public', 'loc_factures', 'true'), 0::bigint, 'Et n''en voit aucune (RLS)');
  perform tests.redevenir_admin();
  return next throws_ok(format('select public.loc_marquer_reglee(%L::uuid, %L)', f.id, 'carte'), '42501', null, 'Sans personne connectée, pas de règlement');
end $f$;

select * from runtests('tests'::name, '^test_b2_07_');
