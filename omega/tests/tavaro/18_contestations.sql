-- 18 — Les contestations bancaires (migration b2_09) : l'agence ouvre la contestation sur la facture, Tavaro dit ce qui
-- rendra le dossier fort et dépose le travail tavaro.dossier_contestation ; l'ouvrier tavaro-pdf (simulé ici par ses
-- portes) lit le dossier et l'enregistre ; un clic l'envoie à la banque par le chemin de tout envoi ; l'issue se
-- consigne par la direction ; la surveillance alerte avant la date limite.

create or replace function tests.test_b2_18_contestations() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_facture uuid; v_total numeric; r jsonb; a jsonb; v_k uuid; v_k2 uuid; v_regle boolean := true; n bigint;
  v_envoi public.envois;
begin
  if to_regprocedure('public.loc_ouvrir_contestation(uuid, jsonb)') is null then
    return next fail('La migration b2_09 (contestations bancaires) n''est pas posée : public.loc_ouvrir_contestation manque');
    return;
  end if;
  jeu := tests.tavaro_jeu_facture();
  v_client := (jeu ->> 'client')::uuid;
  v_facture := (jeu -> 'factures' -> 0 ->> 'id')::uuid;
  v_total := (jeu -> 'factures' -> 0 ->> 'total_ttc')::numeric;
  return next ok(v_facture is not null, 'Une facture est émise');

  -- Le gérant pose un réglage d'envoi en essai pour tavaro (sinon le dossier se télécharge et part à la main).
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  begin
    insert into public.reglages_envois (client_id, module, mode, essai_adresse) values (v_client, 'tavaro', 'essai', 'essai-b2@essai.invalid');
  exception when unique_violation then
    null;
  when others then
    v_regle := false;
    return next diag('Réglage d''envoi non posé (' || sqlerrm || ') : seul le refus « non réglé » est vérifié.');
  end;

  -- L'ouverture : périmètre, champs obligatoires, montant.
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre@essai.invalid');
  return next throws_ok(format('select public.loc_ouvrir_contestation(%L::uuid, %L::jsonb)', v_facture, '{"reference_banque":"CB-1","motif_banque":"13.1"}'),
    'P0002', null, 'Un autre loueur ne voit pas la facture');
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_ouvrir_contestation(%L::uuid, %L::jsonb)', v_facture, '{"motif_banque":"13.1"}'),
    '22023', null, 'La référence de la banque est obligatoire');
  return next throws_ok(format('select public.loc_ouvrir_contestation(%L::uuid, %L::jsonb)', v_facture,
                               jsonb_build_object('reference_banque', 'CB-1', 'motif_banque', '13.1', 'montant_eur', v_total + 1)),
    '22023', null, 'Le montant contesté ne dépasse pas la facture');
  r := public.loc_ouvrir_contestation(v_facture, jsonb_build_object('reference_banque', 'CB-2026-88412', 'motif_banque', '13.1 — prestation contestée',
                                                                    'adresse_banque', 'litiges-b2@essai.invalid'));
  v_k := (r ->> 'contestation')::uuid;
  return next is(r ->> 'statut', 'ouverte', 'La contestation est ouverte');
  return next is(jsonb_array_length(r -> 'forces'), 7, 'Tavaro dit ce qui rend le dossier fort ou faible (7 points)');
  return next is((select k.montant_eur from public.loc_contestations k where k.id = v_k), v_total, 'Par défaut, le montant contesté est celui de la facture');
  return next ok((select k.repondre_avant > k.recue_le from public.loc_contestations k where k.id = v_k), 'La date limite suit la réception (délai réglé)');
  r := public.loc_ouvrir_contestation(v_facture, jsonb_build_object('reference_banque', 'CB-2026-88412', 'motif_banque', 'autre'));
  return next ok((r ->> 'deja')::boolean and (r ->> 'contestation')::uuid = v_k, 'Rouvrir la même référence rend la même contestation');
  perform tests.redevenir_admin();
  return next is(tests.compter('public', 'travaux', format('client_id = %L and genre = %L and cle = %L', v_client, 'tavaro.dossier_contestation', 'tavaro:contestation:' || v_k)),
    1::bigint, 'Le travail tavaro.dossier_contestation est déposé');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.contestation_ouverte') >= 1, 'Le journal porte tavaro.contestation_ouverte');

  -- Les portes de l'ouvrier sont au service seul ; le dossier ne part pas avant d'être composé.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_dossier_a_produire(%L::uuid)', v_k), '42501', null, 'Une personne connectée n''appelle pas les portes de l''ouvrier');
  return next throws_ok(format('select public.loc_envoyer_dossier(%L::uuid)', v_k), '55000', null, 'Le dossier ne part pas avant d''être composé');
  perform tests.redevenir_admin();

  -- Ce que l'ouvrier lit, puis ce qu'il enregistre.
  a := public.loc_dossier_a_produire(v_k);
  return next ok(a -> 'contrat' ->> 'numero' is not null and jsonb_array_length(a -> 'facture' -> 'lignes') >= 1 and a ? 'decision',
    'L''ouvrier lit le contrat, les lignes de la facture et la décision');
  return next throws_ok(format('select public.loc_enregistrer_dossier(%L::uuid, %L::jsonb)', v_k, jsonb_build_object(
      'chemin', 'un-autre-loueur/d.pdf', 'nom', 'd.pdf', 'mime', 'application/pdf', 'octets', 10, 'sha256', repeat('c', 64))),
    '42501', null, 'Un dossier hors du dossier du loueur est refusé');
  r := public.loc_enregistrer_dossier(v_k, jsonb_build_object('chemin', v_client || '/loc_contestations/' || v_k || '/dossier-CB-2026-88412.pdf',
                                                             'nom', 'dossier-CB-2026-88412.pdf', 'mime', 'application/pdf', 'octets', 240000,
                                                             'sha256', repeat('c', 64), 'pages', 6));
  return next is(r ->> 'statut', 'dossier_pret', 'Le dossier est prêt');
  select count(*) into n from public.pieces pc where pc.client_id = v_client and pc.objet_type = 'loc_contestations' and pc.objet_id = v_k::text and pc.statut = 'lue';
  return next is(n, 1::bigint, 'Le dossier est une pièce, au statut « lue »');

  -- L'issue : la direction seule ; gagnée suppose un dossier envoyé.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_issue_contestation(%L::uuid, %L)', v_k, 'gagnee'), '42501', null, 'Un collaborateur ne consigne pas l''issue');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  return next throws_ok(format('select public.loc_issue_contestation(%L::uuid, %L)', v_k, 'gagnee'), '23514', null, 'Gagnée suppose un dossier envoyé');

  -- Le clic.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  if v_regle then
    r := public.loc_envoyer_dossier(v_k);
    return next is(r ->> 'statut', 'envoyee', 'Le dossier est remis à l''envoi');
    perform tests.redevenir_admin();
    select * into v_envoi from public.envois e where e.client_id = v_client and e.id = (r ->> 'envoi')::uuid;
    return next ok(v_envoi.id is not null and (select k.dossier_piece_id from public.loc_contestations k where k.id = v_k) = any (v_envoi.pieces),
      'Le courriel à la banque porte le dossier en pièce jointe');
    perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
    r := public.loc_envoyer_dossier(v_k);
    return next ok((r ->> 'deja')::boolean, 'Recliquer ne fait pas un second envoi');
    perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
    r := public.loc_issue_contestation(v_k, 'gagnee', 'Notifiée par la banque');
    return next is(r ->> 'statut', 'gagnee', 'La direction consigne l''issue');
  else
    return next throws_ok(format('select public.loc_envoyer_dossier(%L::uuid)', v_k), '55000', null, 'Sans réglage d''envoi, le dossier se télécharge et part à la main');
  end if;

  -- La surveillance : une contestation à répondre aujourd'hui lève une alerte.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  r := public.loc_ouvrir_contestation(v_facture, jsonb_build_object('reference_banque', 'CB-2026-90001', 'motif_banque', '10.4 — fraude',
                                                                    'repondre_avant', to_char(current_date, 'YYYY-MM-DD'), 'recue_le', to_char(current_date, 'YYYY-MM-DD')));
  v_k2 := (r ->> 'contestation')::uuid;
  perform tests.redevenir_admin();
  return next ok(private.loc_surveiller_contestations() >= 1, 'Le jour de la date limite, la surveillance alerte');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  r := public.loc_issue_contestation(v_k2, 'abandonnee');
  return next is(r ->> 'statut', 'abandonnee', 'Une contestation non défendue se classe « abandonnée »');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b2_18_');
