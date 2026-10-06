-- 05 — Audiences et avis RPVA saisis (étapes 8 et 9). Après 00_jeu_tamila.sql. runtests() annule tout.

create or replace function tests.test_b4_05_audiences_avis() returns setof text
language plpgsql as $f$
declare jeu jsonb; v_dossier uuid; v_appel uuid; v_aud uuid; v_renvoi uuid; au public.tamila_audiences; v_piece uuid; r jsonb; t public.tamila_delais;
begin
  jeu := tests.tamila_scene();
  v_dossier := (jeu ->> 'dossier')::uuid;

  -- ── Audience de mise en état, posée par l'avocat du dossier ──
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select public.tamila_ajouter_audience(%L::uuid, null)', v_dossier), '22023', null, 'la date de l''audience est nécessaire (22023)');
  return next throws_ok(format('select public.tamila_ajouter_audience(%L::uuid, now() + interval ''20 days'', ''mise_en_etat'', null, null, %L::uuid)', v_dossier, jeu ->> 'assistante'), '22023', null,
    'l''avocat de l''audience est un avocat du cabinet (22023)');
  v_aud := public.tamila_ajouter_audience(v_dossier, (date '2026-11-12' + time '14:00') at time zone 'Europe/Paris', 'mise_en_etat', 'Cour d''appel de Paris', 'Pôle 4 – chambre 5', (jeu ->> 'avocat')::uuid, true);
  perform tests.redevenir_admin();
  select * into au from public.tamila_audiences where id = v_aud;
  return next is(au.nature, 'mise_en_etat', 'audience de mise en état');
  return next is(au.statut, 'prevue', 'prévue');
  return next is(au.source, 'saisie', 'saisie à la main');
  return next is(au.chambre, 'Pôle 4 – chambre 5', 'chambre');
  return next is(au.avocat_id, (jeu ->> 'avocat')::uuid, 'Me Rousseau plaide');

  -- Renvoi : l'ancienne pointe vers la nouvelle.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_changer_audience(%L::uuid, ''renvoyee'', %L::timestamptz)', v_aud, au.date_heure - interval '1 day'), '22023', null,
    'un renvoi porte une date postérieure (22023)');
  v_renvoi := public.tamila_changer_audience(v_aud, 'renvoyee', au.date_heure + interval '35 days');
  perform tests.redevenir_admin();
  return next ok(v_renvoi <> v_aud, 'le renvoi crée une nouvelle audience');
  return next is((select statut from public.tamila_audiences where id = v_aud), 'renvoyee', 'l''ancienne est renvoyée');
  return next is((select renvoyee_a from public.tamila_audiences where id = v_aud), v_renvoi, 'et pointe sur la nouvelle');
  return next is((select chambre from public.tamila_audiences where id = v_renvoi), 'Pôle 4 – chambre 5', 'la nouvelle garde la chambre');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_changer_audience(%L::uuid, ''tenue'')', v_aud), '55000', null, 'une audience renvoyée ne se tient plus (55000)');
  return next lives_ok(format('select public.tamila_changer_audience(%L::uuid, ''tenue'')', v_renvoi), 'la nouvelle se tient');
  perform tests.redevenir_admin();
  -- Sous RLS, le stagiaire lecteur voit les audiences du dossier ; le voisin non.
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next is(tests.compter('public', 'tamila_audiences', format('dossier_id = %L', v_dossier)), 2::bigint, 'le stagiaire lit les deux audiences');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'autre_gerant')::uuid, 'b4-voisin@essai.invalid');
  return next is(tests.compter('public', 'tamila_audiences', format('dossier_id = %L', v_dossier)), 0::bigint, 'le voisin, aucune');
  perform tests.redevenir_admin();

  -- ── Avis RPVA avant la déclaration d'appel : sans effet, à déclarer ──
  v_piece := tests.tamila_piece(jeu, 'avis-fixation.pdf');
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select public.tamila_avis_lu(%L::uuid, %L::uuid, %L::uuid, ''rpva_inconnu'', ''{}'')', jeu ->> 'client', v_dossier, v_piece), '22023', null, 'type d''avis inconnu (22023)');
  return next throws_ok(format('select public.tamila_avis_lu(%L::uuid, %L::uuid, %L::uuid, ''rpva_ordonnance_mee'', ''{}'')', jeu ->> 'client', v_dossier, v_piece), '22023', null, 'la date de l''avis est nécessaire (22023)');
  return next throws_ok(format('select public.tamila_avis_lu(%L::uuid, %L::uuid, %L::uuid, ''rpva_accuse_depot'', ''{"date_avis": "2026-10-01"}'')', jeu ->> 'client', v_dossier, v_piece), '22023', null, 'un accusé de dépôt porte sa date de dépôt (22023)');
  r := public.tamila_avis_lu((jeu ->> 'client')::uuid, v_dossier, v_piece, 'rpva_ordonnance_mee', '{"date_avis": "2026-10-01", "date_limite": "2026-12-15"}');
  perform tests.redevenir_admin();
  return next is(r ->> 'statut', 'sans_effet', 'sans appel déclaré, l''avis est sans effet');
  return next is(r ->> 'effet', 'appel_a_declarer', 'effet : appel à déclarer');
  return next is((select confiance from public.tamila_avis where id = (r ->> 'avis')::uuid), 'saisie', 'saisi par une personne : confiance « saisie »');
  -- Le même avis relu : déjà lu, rien ne se duplique.
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  r := public.tamila_avis_lu((jeu ->> 'client')::uuid, v_dossier, v_piece, 'rpva_ordonnance_mee', '{"date_avis": "2026-10-01", "date_limite": "2026-12-15"}');
  perform tests.redevenir_admin();
  return next ok((r ->> 'deja_lu')::boolean, 'une pièce déjà lue ne fait pas un second avis');

  -- ── La déclaration d'appel rejoue l'avis : orientation en mise en état, date fixée par le juge ──
  v_appel := tests.tamila_appel(jeu);
  return next is((select statut from public.tamila_avis where id = (r ->> 'avis')::uuid), 'applique', 'l''avis en attente est appliqué à la déclaration d''appel');
  return next is((select procedure from public.tamila_appels where id = v_appel), 'mise_en_etat', 'ordonnance du CME : l''appel est orienté en mise en état');
  select * into t from public.tamila_delais where avis_id = (r ->> 'avis')::uuid;
  return next is(t.nature, 'date_fixee', 'la date limite de l''ordonnance est posée en date fixée');
  return next is(t.source_date, 'ordonnance', 'source : ordonnance');
  return next is(t.echeance_retenue, date '2026-12-15', 'au 15/12/2026');
  return next is(t.statut, 'a_confirmer', 'à confirmer par un avocat (l''avis vient d''une pièce)');

  -- ── Avis d'audience : l'audience se pose depuis l'avis ──
  v_piece := tests.tamila_piece(jeu, 'avis-audience.pdf');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  r := public.tamila_avis_lu((jeu ->> 'client')::uuid, v_dossier, v_piece, 'rpva_avis_audience', '{"date_avis": "2026-10-02", "date_audience": "2027-02-04T09:30:00"}');
  perform tests.redevenir_admin();
  return next is(r ->> 'effet', 'audience_ajoutee', 'un avis d''audience ajoute l''audience');
  select * into au from public.tamila_audiences where id = (r ->> 'audience')::uuid;
  return next is(au.source, 'avis', 'audience venue d''un avis');
  return next ok(au.heure_connue, 'heure connue (l''avis la donne)');
  return next is((au.date_heure at time zone 'Europe/Paris')::date, date '2027-02-04', 'le 4 février 2027, heure de Paris');

  -- ── Accusé de dépôt : à rattacher au délai qu'il éteint ──
  v_piece := tests.tamila_piece(jeu, 'accuse-depot.pdf');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  r := public.tamila_avis_lu((jeu ->> 'client')::uuid, v_dossier, v_piece, 'rpva_accuse_depot', '{"date_avis": "2026-10-03", "depose_le": "2026-10-03T16:12:00"}');
  perform tests.redevenir_admin();
  return next is(r ->> 'statut', 'a_rattacher', 'un accusé de dépôt attend d''être rattaché');
  return next is(r ->> 'effet', 'preuve_a_rattacher', 'effet : preuve à rattacher');

  -- ── Un avis dont le RG ne concorde pas : à vérifier ──
  v_piece := tests.tamila_piece(jeu, 'avis-autre-rg.pdf');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  r := public.tamila_avis_lu((jeu ->> 'client')::uuid, v_dossier, v_piece, 'rpva_avis_audience', '{"date_avis": "2026-10-02", "date_audience": "2027-02-04T09:30:00"}', 'gabarit', false);
  perform tests.redevenir_admin();
  return next is(r ->> 'effet', 'rg_different', 'n° RG différent : l''avis est mis à vérifier, rien n''est posé');
  -- La pièce d'un autre dossier n'est pas acceptée.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_avis_lu(%L::uuid, %L::uuid, gen_random_uuid(), ''rpva_avis_audience'', ''{"date_avis": "2026-10-02"}'')', jeu ->> 'client', v_dossier), '22023', null,
    'une pièce qui n''est pas dans le dossier est refusée (22023)');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b4_05_');
