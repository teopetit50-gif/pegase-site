-- 01 — Le gérant règle l'agence et publie le barème ; le collaborateur ne peut ni l'un ni l'autre (scénario, étapes 1 et 2).
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5) et 00_jeu_tavaro.sql.

create or replace function tests.test_b2_01_reglages_et_bareme() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_bareme uuid; n bigint;
begin
  jeu := tests.tavaro_jeu();
  v_client := (jeu ->> 'client')::uuid;
  v_bareme := (jeu ->> 'bareme')::uuid;

  -- Ce que le jeu a posé par le gérant, sous RLS.
  return next is(tests.compter('public', 'loc_agences', format('client_id = %L', v_client)), 2::bigint, 'Le gérant a posé ses deux agences (SIEGE, NORD)');
  return next is(tests.compter('public', 'loc_reglages', format('client_id = %L', v_client)), 1::bigint, 'Le gérant a posé les réglages du module (tolérance 59 min, émetteur)');
  return next isnt(v_bareme, null, 'loc_publier_bareme rend l''identifiant du barème');
  return next is((select b.statut from public.loc_baremes b where b.id = v_bareme), 'publie', 'Le barème est publié');
  return next is(tests.compter('public', 'loc_bareme_lignes', format('bareme_id = %L', v_bareme)), 9::bigint, 'Ses neuf lignes sont posées');
  return next is((select l.nature from public.loc_bareme_lignes l where l.bareme_id = v_bareme and l.code = 'RAYURE_PORTIERE'), 'dommage', 'Une ligne de la famille dommage est de nature dommage');
  return next is((select l.prix_eur from public.loc_bareme_lignes l where l.bareme_id = v_bareme and l.code = 'JANTE'), null::numeric, 'Une ligne sur devis n''a pas de prix');
  return next is(private.loc_bareme_en_vigueur(v_client, date '2026-10-01'), v_bareme, 'Ce barème est celui en vigueur au 1er octobre 2026');
  return next is(private.loc_bareme_en_vigueur(v_client, date '2025-12-31'), null::uuid, 'Avant sa date d''effet, aucun barème');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.bareme_publie') >= 1, 'Le journal opposable porte tavaro.bareme_publie');

  -- Un second barème à la même date : refusé.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  return next throws_ok(format('select public.loc_publier_bareme(%L, %L::date, tests.tavaro_bareme_lignes())', 'Doublon', '2026-01-01'),
    '22023', null, 'Un second barème à la même date d''effet est refusé (22023)');
  return next throws_ok(format('select public.loc_publier_bareme(%L, %L::date, %L::jsonb)', 'Vide', '2026-02-01', '[]'),
    '22023', null, 'Un barème sans ligne est refusé');
  return next throws_ok(format('select public.loc_publier_bareme(%L, %L::date, %L::jsonb)', 'Code faux', '2026-02-01',
    '[{"code": "rayure minuscule", "libelle": "x", "famille": "dommage", "unite": "forfait", "prix_eur": 1, "regime_tva": "hors_champ"}]'),
    '22023', null, 'Une ligne au code invalide est refusée avec son numéro de ligne');
  perform tests.redevenir_admin();

  -- Le collaborateur ne publie pas, ne retire pas, ne règle pas.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_publier_bareme(%L, %L::date, tests.tavaro_bareme_lignes())', 'Barème pirate', '2026-03-01'),
    '42501', null, 'Le collaborateur ne publie pas de barème (42501)');
  return next throws_ok(format('select public.loc_retirer_bareme(%L::uuid, %L)', v_bareme, 'essai'),
    '42501', null, 'Le collaborateur ne retire pas le barème (42501)');
  return next throws_ok(format('insert into public.loc_reglages (client_id, tolerance_retard_min) values (%L, 10)', (jeu ->> 'client_autre')),
    '42501', null, 'Le collaborateur ne pose pas de réglages (RLS, 42501)');
  return next throws_ok(format('insert into public.loc_agences (client_id, entite_id, code) values (%L, %L, %L)', v_client, jeu ->> 'siege', 'PIRATE'),
    '42501', null, 'Le collaborateur ne crée pas d''agence (RLS, 42501)');
  return next is(tests.compter('public', 'loc_bareme_lignes', format('bareme_id = %L', v_bareme)), 9::bigint, 'Le collaborateur lit le barème de son loueur (membre)');
  perform tests.redevenir_admin();

  -- La direction retire le barème avec un motif ; il n'est plus en vigueur.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  perform public.loc_retirer_bareme(v_bareme, 'Erreur sur le prix du nettoyage');
  perform tests.redevenir_admin();
  return next is((select b.statut from public.loc_baremes b where b.id = v_bareme), 'retire', 'Le gérant retire le barème');
  return next is(private.loc_bareme_en_vigueur(v_client, date '2026-10-01'), null::uuid, 'Retiré, il n''est plus en vigueur');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.bareme_retire') >= 1, 'Le journal opposable porte tavaro.bareme_retire');
end $f$;

select * from runtests('tests'::name, '^test_b2_01_');
