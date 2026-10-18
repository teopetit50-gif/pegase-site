-- b1_14 — VARELO : les réserves à émettre (migration b1_11_reserves, après b1_09)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5) et b1_00_aides.sql.
-- runtests() annule tout ce que le test écrit. Motif : ^test_b1_14_
-- Les dates limites attendues se demandent au moteur du socle (public.echeance_de) : le test ne recompte pas les fériés.
--
-- Hier, la société A (Guadeloupe) a reçu de la quincaillerie du groupe, par Transports Caraïbes, 9 colis sur 10 dont
-- un écrasé. Il reste trois jours ouvrables pour protester en recommandé (C. com., art. L133-3).

create or replace function tests.test_b1_14_reception() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; a uuid; bb uuid;
  g uuid; ge text := 'b1-gerant@essai.invalid';
  v_quinc uuid;
  r jsonb; r2 jsonb;
  x record;
  v_attendue date;
  v_lettre text;
begin
  b := tests.b1_preparer(7);
  v_client := (b ->> 'client')::uuid; a := (b ->> 'soc_a')::uuid; bb := (b ->> 'soc_b')::uuid; g := (b ->> 'gerant')::uuid;
  v_quinc := (tests.b1_code(v_client, a, 'F0200')).objet_id;

  -- un collaborateur de la société enregistre la livraison
  perform tests.endosser((b ->> 'collab')::uuid, 'b1-collaborateur@essai.invalid');
  r := public.grp_enregistrer_reception(v_client, a, jsonb_build_object('date_reception', current_date - 1, 'mode', 'routier',
         'transporteur', 'Transports Caraïbes', 'document_transport', 'LV-2026-0457', 'objet_id', v_quinc,
         'colis_attendus', 10, 'colis_recus', 9, 'avarie', true, 'manquant', true,
         'constat', 'Un carton écrasé (visserie répandue) ; un colis manquant.', 'reserves_sur_bon', 'Un colis manquant, un carton écrasé',
         'montant_estime', '1200'));
  r2 := public.grp_enregistrer_reception(v_client, a, jsonb_build_object('transporteur', 'Transports Caraïbes', 'colis_attendus', 4, 'colis_recus', 4));
  perform tests.redevenir_admin();
  v_attendue := (public.echeance_de('varelo.reserves.routier', current_date - 1, public.territoire_de_entite(v_client, a)) ->> 'echeance')::date;
  select * into x from public.grp_reserves where id = (r ->> 'reception')::uuid;
  return next ok(x.statut = 'a_examiner' and x.echeance = v_attendue and x.regle_code = 'varelo.reserves.routier' and x.expediteur is not null,
                 format('avarie et manquant : à examiner, date limite du moteur du socle (%s, %s)', x.echeance, r ->> 'detail'));
  return next ok(x.regle_source like 'C. com., art. L133-3%', 'la règle cite l''article L133-3');
  return next is((r2 ->> 'statut'), 'sans_suite', 'une livraison conforme est classée sans suite d''office');
  return next is(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement = %L and acquittee_le is null and not interne and niveau = %L',
                   v_client, 'varelo:reserve.' || (r ->> 'reception'), case when x.jours_restants <= 1 then 'critique' else 'attention' end)), 1::bigint,
                 format('une alerte, %s', case when x.jours_restants <= 1 then 'critique (la veille ou le jour)' else 'attention' end));
  return next is(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement = %L', v_client, 'varelo:reserve.' || (r2 ->> 'reception'))), 0::bigint,
                 'aucune alerte pour la livraison conforme');

  -- la lettre de protestation
  perform tests.endosser(g, ge);
  v_lettre := public.grp_lettre_reserve((r ->> 'reception')::uuid);
  perform tests.redevenir_admin();
  return next ok(v_lettre like '%Objet : protestation motivée — livraison du %, document de transport n° LV-2026-0457%'
                 and v_lettre like '%10 colis annoncés, 9 reçus%' and v_lettre like '%Préjudice estimé à ce jour : 1 200 €%'
                 and v_lettre like '%avarie et perte partielle%' and v_lettre like '%C. com., art. L133-3%',
                 'la lettre : objet, document, colis, préjudice, nature du dommage, texte');

  -- les refus à l'enregistrement
  perform tests.endosser(g, ge);
  return next throws_ok(format('select public.grp_enregistrer_reception(%L, %L, %L)', v_client, a, jsonb_build_object('transporteur', 'X', 'date_reception', current_date + 1)), '22023', null, 'une livraison de demain : refusée (22023)');
  return next throws_ok(format('select public.grp_enregistrer_reception(%L, %L, %L)', v_client, a, jsonb_build_object('transporteur', 'X', 'mode', 'fluvial')), '22023', null, 'un mode inconnu : refusé (22023)');
  return next throws_ok(format('select public.grp_enregistrer_reception(%L, %L, %L)', v_client, a, jsonb_build_object('transporteur', 'X', 'avarie', true)), '22023', null, 'une avarie sans constat : refusée (22023)');
  return next throws_ok(format('select public.grp_enregistrer_reception(%L, %L, %L)', v_client, a, jsonb_build_object('transporteur', ' ')), '22023', null, 'sans transporteur : refusé (22023)');
  return next throws_ok(format('select public.grp_enregistrer_reception(%L, %L, %L)', v_client, a, jsonb_build_object('transporteur', 'X', 'objet_id', b ->> 'pole_d')), '22023', null, 'un expéditeur inconnu du référentiel : refusé (22023)');
  perform tests.redevenir_admin();
  perform tests.endosser((b ->> 'partiel')::uuid, 'b1-collaborateur-a@essai.invalid');
  return next throws_ok(format('select public.grp_enregistrer_reception(%L, %L, %L)', v_client, bb, jsonb_build_object('transporteur', 'X')), '42501', null, 'pas pour une société hors de son périmètre (42501)');
  perform tests.redevenir_admin();

  -- la protestation : ni le référent, ni le collaborateur ; le gérant, si
  perform tests.endosser((b ->> 'referent')::uuid, 'b1-referent@essai.invalid');
  return next throws_ok(format('select public.grp_noter_protestation(%L)', r ->> 'reception'), '42501', null, 'le référent données ne décide pas de la suite (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((b ->> 'collab')::uuid, 'b1-collaborateur@essai.invalid');
  return next throws_ok(format('select public.grp_noter_protestation(%L)', r ->> 'reception'), '42501', null, 'le collaborateur non plus (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser(g, ge);
  return next throws_ok(format('select public.grp_noter_protestation(%L, current_date + 1)', r ->> 'reception'), '22023', null, 'une protestation datée de demain : refusée (22023)');
  r2 := public.grp_noter_protestation((r ->> 'reception')::uuid, current_date, 'courriel', 'Courriel au transporteur en attendant le recommandé');
  perform tests.redevenir_admin();
  return next ok(r2 ->> 'avertissement' like '%lettre recommandée%' and not (r2 ->> 'hors_delai')::boolean, 'par courriel : notée, dans le délai, avec l''avertissement que L133-3 veut un recommandé');
  return next is((select etat from public.grp_reserves where id = (r ->> 'reception')::uuid), 'protestee', 'la livraison est « protestée »');
  return next is(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement = %L and acquittee_le is null', v_client, 'varelo:reserve.' || (r ->> 'reception'))), 0::bigint,
                 'son alerte se ferme');
  perform tests.endosser(g, ge);
  return next throws_ok(format('select public.grp_noter_protestation(%L)', r ->> 'reception'), '22023', null, 'une seconde protestation : refusée (22023)');
  perform tests.redevenir_admin();
end $f$;

create or replace function tests.test_b1_14_matin() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; a uuid;
  g uuid; ge text := 'b1-gerant@essai.invalid';
  r_mar jsonb; r_aer jsonb;
  m jsonb;
  t text;
  v_do uuid; v_dj uuid; v_df uuid;
begin
  b := tests.b1_preparer(3);
  v_client := (b ->> 'client')::uuid; a := (b ->> 'soc_a')::uuid; g := (b ->> 'gerant')::uuid;
  perform tests.endosser(g, ge);
  -- un conteneur reçu il y a dix jours : trois jours calendaires (La Haye-Visby), délai passé
  r_mar := public.grp_enregistrer_reception(v_client, a, jsonb_build_object('date_reception', current_date - 10, 'mode', 'maritime',
             'transporteur', 'CMA CGM', 'document_transport', 'BL-FDF-88412', 'expediteur', 'Fournisseur de Rungis', 'avarie', true, 'constat', 'Palettes mouillées'));
  -- un colis aérien reçu hier : quatorze jours (Montréal, art. 31)
  r_aer := public.grp_enregistrer_reception(v_client, a, jsonb_build_object('date_reception', current_date - 1, 'mode', 'aerien',
             'transporteur', 'Air Caraïbes Cargo', 'avarie', true, 'constat', 'Écran fêlé'));
  m := public.grp_ce_matin(v_client);
  perform tests.redevenir_admin();
  return next is((select etat from public.grp_reserves where id = (r_mar ->> 'reception')::uuid), 'depasse', 'maritime, reçu il y a dix jours : délai passé');
  return next is((select echeance from public.grp_reserves where id = (r_aer ->> 'reception')::uuid),
                 (public.echeance_de('varelo.reserves.aerien', current_date - 1, public.territoire_de_entite(v_client, a)) ->> 'echeance')::date, 'aérien : quatorze jours');
  return next is(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement = %L and acquittee_le is null', v_client, 'varelo:reserve.' || (r_mar ->> 'reception'))), 0::bigint,
                 'un délai passé ne lève plus d''alerte (le point du matin le dit)');
  select string_agg(x ->> 'texte', ' | ') into t from jsonb_array_elements(m -> 'reserves') x;
  return next ok(t like 'Délai passé depuis le % : CMA CGM (Essai B1 Distribution, livraison du %) — la protestation est désormais tardive%'
                 and t like '%Avant le % : protestation à Air Caraïbes Cargo (Essai B1 Distribution, livraison du %)%', format('« Réserves à émettre » : %s', t));
  perform private.grp_deposer_points((current_date + time '06:00') at time zone 'Europe/Paris');
  select id into v_do from public.equipes where client_id = v_client and cle = 'direction_operations';
  select id into v_dj from public.equipes where client_id = v_client and cle = 'direction_juridique';
  select id into v_df from public.equipes where client_id = v_client and cle = 'direction_financiere';
  return next is(tests.compter('public', 'points_sections', format('client_id = %L and module = ''varelo'' and titre = ''Réserves à émettre'' and (role = ''gerant'' or equipe_id in (%L, %L))', v_client, v_do, v_dj)), 3::bigint,
                 '« Réserves à émettre » au gérant, à la direction des opérations et à la direction juridique');
  return next is(tests.compter('public', 'points_sections', format('client_id = %L and module = ''varelo'' and titre = ''Réserves à émettre'' and equipe_id = %L', v_client, v_df)), 0::bigint,
                 'pas à la direction financière');

  -- classer sans suite : motivé
  perform tests.endosser(g, ge);
  return next throws_ok(format('select public.grp_classer_reception(%L, '' '')', r_mar ->> 'reception'), '22023', null, 'classer sans motif : refusé (22023)');
  perform public.grp_classer_reception((r_mar ->> 'reception')::uuid, 'Délai passé, avarie couverte par l''assurance marchandises');
  perform tests.redevenir_admin();
  return next is((select etat from public.grp_reserves where id = (r_mar ->> 'reception')::uuid), 'sans_suite', 'classée sans suite, motivée');

  -- une autre organisation
  perform tests.endosser((b ->> 'etranger')::uuid, 'a5-client-b@essai.invalid');
  return next is(tests.compter('public', 'grp_reserves', format('client_id = %L', v_client)), 0::bigint, 'grp_reserves : rien pour une autre organisation');
  return next throws_ok(format('select public.grp_lettre_reserve(%L)', r_aer ->> 'reception'), 'P0002', null, 'la lettre d''un autre groupe : introuvable (P0002)');
  return next throws_ok(format('select public.grp_noter_protestation(%L)', r_aer ->> 'reception'), 'P0002', null, 'protester chez un autre groupe : introuvable (P0002)');
  return next throws_ok(format('select public.grp_enregistrer_reception(%L, %L, %L)', v_client, a, jsonb_build_object('transporteur', 'X')), '42501', null, 'enregistrer chez un autre groupe : refusé (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser(g, ge);
  return next throws_ok(format('update public.grp_receptions set statut = ''sans_suite'' where id = %L', r_aer ->> 'reception'), '42501', null, 'personne ne change un statut à la main (42501)');
  perform tests.redevenir_admin();
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action like ''varelo.reception.%%''', v_client)), 3::bigint,
                 'au journal : deux enregistrées, une classée');
end $f$;
