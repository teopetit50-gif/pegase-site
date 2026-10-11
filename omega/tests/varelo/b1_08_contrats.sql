-- b1_08 — VARELO, vague 3 : les contrats du groupe à dénoncer (migration b1_05_contrats_groupe)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5), b1_00_aides.sql et b1_05.
-- runtests() annule tout ce que le test écrit. Motif : ^test_b1_08_
-- Toutes les dates sont relatives à current_date : le test ne vieillit pas.
--
-- Le scénario : le transporteur du groupe (F0123 chez la société A, TRCAR chez la société B, même objet du
-- référentiel) a un contrat dans chacune des deux sociétés. Celui de A se dénonce un mois avant son échéance,
-- dans 50 jours : il reste 20 jours, une alerte se lève. La DAF note la dénonciation partie : l'alerte se ferme.

create or replace function tests.b1_contrat(p_client uuid, p_entite uuid, p_champs jsonb, p_user uuid, p_email text) returns uuid
language plpgsql as $$
declare v uuid;
begin
  perform tests.endosser(p_user, p_email);
  v := public.grp_enregistrer_contrat(p_client, p_entite, p_champs);
  perform tests.redevenir_admin();
  return v;
end $$;

-- ---------------------------------------------------------------------------
-- Les dates : échéance courante, date limite, état du délai, reconduction tacite.
create or replace function tests.test_b1_08_echeances() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; v_soc_a uuid; v_soc_b uuid; v_transp uuid;
  g uuid; ge text := 'b1-gerant@essai.invalid';
  c_a uuid; c_b uuid; c_c uuid; c_d uuid; c_e uuid;
  x record;
begin
  b := tests.b1_preparer(7);
  v_client := (b ->> 'client')::uuid; v_soc_a := (b ->> 'soc_a')::uuid; v_soc_b := (b ->> 'soc_b')::uuid; g := (b ->> 'gerant')::uuid;
  v_transp := (tests.b1_code(v_client, v_soc_a, 'F0123')).objet_id;

  c_a := tests.b1_contrat(v_client, v_soc_a, jsonb_build_object('objet_id', v_transp, 'intitule', 'Transport des palettes', 'categorie', 'prestation',
           'date_echeance', current_date + 50, 'preavis_valeur', 1, 'preavis_unite', 'mois', 'montant_annuel', '48000'), g, ge);
  c_b := tests.b1_contrat(v_client, v_soc_b, jsonb_build_object('objet_id', v_transp, 'intitule', 'Navettes Fort-de-France',
           'date_echeance', current_date + 200, 'preavis_valeur', 3), g, ge);
  c_c := tests.b1_contrat(v_client, v_soc_a, jsonb_build_object('tiers', 'Bureau de contrôle Antilles', 'intitule', 'Vérifications électriques', 'categorie', 'maintenance',
           'date_debut', current_date - 375, 'date_echeance', current_date - 10, 'duree_reconduction_mois', 12, 'preavis_valeur', 2), g, ge);
  c_d := tests.b1_contrat(v_client, v_soc_a, jsonb_build_object('tiers', 'Loueur de chariots', 'intitule', 'Location de deux chariots', 'categorie', 'location',
           'date_echeance', current_date + 12, 'preavis_valeur', 10, 'preavis_unite', 'jours'), g, ge);
  c_e := tests.b1_contrat(v_client, v_soc_b, jsonb_build_object('tiers', 'Éditeur du logiciel de paie', 'intitule', 'Licence de paie',
           'date_echeance', current_date + 5, 'reconduction', 'aucune'), g, ge);

  select * into x from public.grp_contrats_echeancier where id = c_a;
  return next ok(x.date_limite = (current_date + 50 - interval '1 month')::date and x.etat_delai = 'urgent' and not x.reconduit,
                 format('A : échéance J+50, préavis d''un mois : à dénoncer avant le %s, état urgent', x.date_limite));
  return next ok(x.code_groupe like 'F-%' and x.tiers is not null and x.contrats_du_tiers = 2 and x.societes_du_tiers = 2,
                 format('le transporteur du groupe a deux contrats dans deux sociétés (%s)', x.code_groupe));
  select * into x from public.grp_contrats_echeancier where id = c_b;
  return next ok(x.date_limite = (current_date + 200 - interval '3 months')::date and x.etat_delai in ('bientot', 'large'),
                 format('B : échéance J+200, préavis de trois mois (par défaut) : %s, %s', x.date_limite, x.etat_delai));
  select * into x from public.grp_contrats_echeancier where id = c_c;
  return next ok(x.reconduit and x.echeance_courante = (current_date - 10 + interval '12 months')::date
                 and x.date_limite = (current_date - 10 + interval '12 months' - interval '2 months')::date,
                 format('C : échéance passée sans dénonciation, reconduit d''un an (art. 1215) : échéance courante %s', x.echeance_courante));
  select * into x from public.grp_contrats_echeancier where id = c_d;
  return next ok(x.date_limite = current_date + 2 and x.jours_restants = 2 and x.etat_delai = 'urgent', 'D : préavis de dix jours, il reste deux jours');
  select * into x from public.grp_contrats_echeancier where id = c_e;
  return next is(x.etat_delai, 'sans_objet', 'E : sans reconduction, rien à dénoncer');

  -- les alertes : A (20 jours) en « attention », D (2 jours) en « critique », rien pour B, C, E
  return next is(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement = %L and acquittee_le is null and niveau = ''attention'' and not interne', v_client, 'varelo:contrats.' || c_a)),
                 1::bigint, 'A : une alerte « attention », visible du client');
  return next is(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement = %L and acquittee_le is null and niveau = ''critique''', v_client, 'varelo:contrats.' || c_d)),
                 1::bigint, 'D : une alerte « critique » (moins de sept jours)');
  return next is(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement like ''varelo:contrats.%%'' and acquittee_le is null', v_client)),
                 2::bigint, 'deux alertes ouvertes en tout (ni B, ni C, ni E)');
  perform private.grp_controler_contrats_tous();
  return next is(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement like ''varelo:contrats.%%''', v_client)),
                 2::bigint, 'le passage quotidien ne relève pas d''alerte en double');

  -- corriger l'échéance de A : J+200, l'alerte se ferme d'elle-même
  perform tests.endosser(g, ge);
  perform public.grp_enregistrer_contrat(v_client, null, jsonb_build_object('date_echeance', current_date + 200), c_a);
  perform tests.redevenir_admin();
  select * into x from public.grp_contrats_echeancier where id = c_a;
  return next ok(x.intitule = 'Transport des palettes' and x.montant_annuel = 48000 and x.date_echeance = current_date + 200,
                 'une correction ne touche que les champs donnés');
  return next is(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement = %L and acquittee_le is null', v_client, 'varelo:contrats.' || c_a)),
                 0::bigint, 'l''échéance repoussée, l''alerte de A est close');
end $f$;

-- ---------------------------------------------------------------------------
-- Dénoncer, archiver, les refus.
create or replace function tests.test_b1_08_denonciation() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; v_soc_a uuid; v_soc_b uuid; v_transp uuid;
  g uuid; ge text := 'b1-gerant@essai.invalid';
  c_a uuid; c_d uuid;
  r jsonb;
  x record;
begin
  b := tests.b1_preparer(7);
  v_client := (b ->> 'client')::uuid; v_soc_a := (b ->> 'soc_a')::uuid; v_soc_b := (b ->> 'soc_b')::uuid; g := (b ->> 'gerant')::uuid;
  v_transp := (tests.b1_code(v_client, v_soc_a, 'F0123')).objet_id;
  c_a := tests.b1_contrat(v_client, v_soc_a, jsonb_build_object('objet_id', v_transp, 'intitule', 'Transport des palettes',
           'date_echeance', current_date + 50, 'preavis_valeur', 1), g, ge);
  c_d := tests.b1_contrat(v_client, v_soc_a, jsonb_build_object('tiers', 'Loueur de chariots', 'intitule', 'Location de deux chariots',
           'date_echeance', current_date + 5, 'preavis_valeur', 10, 'preavis_unite', 'jours'), g, ge);

  -- le référent données (valideur, hors DJ et DF) ne note pas une dénonciation ; la DAF, si
  perform tests.endosser((b ->> 'referent')::uuid, 'b1-referent@essai.invalid');
  return next throws_ok(format('select public.grp_denoncer_contrat(%L)', c_a), '42501', null, 'le référent données ne note pas une dénonciation (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((b ->> 'daf')::uuid, 'b1-daf@essai.invalid');
  return next throws_ok(format('select public.grp_denoncer_contrat(%L, current_date + 1)', c_a), '22023', null, 'une dénonciation datée de demain : refusée (22023)');
  r := public.grp_denoncer_contrat(c_a, current_date, 'Appel d''offres transport groupe');
  perform tests.redevenir_admin();
  return next ok(not (r ->> 'hors_delai')::boolean, 'la DAF note la dénonciation partie aujourd''hui, dans le délai');
  select * into x from public.grp_contrats_echeancier where id = c_a;
  return next ok(x.statut = 'denonce' and x.denonce_le = current_date and x.etat_delai = 'sans_objet', 'A : dénoncé, plus rien à surveiller');
  return next is(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement = %L and acquittee_le is null', v_client, 'varelo:contrats.' || c_a)),
                 0::bigint, 'l''alerte de A se ferme');
  perform tests.endosser((b ->> 'daf')::uuid, 'b1-daf@essai.invalid');
  return next throws_ok(format('select public.grp_denoncer_contrat(%L)', c_a), '22023', null, 'un contrat déjà dénoncé ne se dénonce pas deux fois (22023)');
  -- D : préavis de dix jours, échéance J+5 : la date limite est passée, la dénonciation est hors délai
  r := public.grp_denoncer_contrat(c_d, current_date, null);
  perform tests.redevenir_admin();
  return next ok((r ->> 'hors_delai')::boolean, 'D dénoncé après sa date limite : hors délai, et dit');

  -- archiver : gérant seulement ; un contrat archivé ne se corrige plus
  perform tests.endosser((b ->> 'collab')::uuid, 'b1-collaborateur@essai.invalid');
  return next throws_ok(format('select public.grp_archiver_contrat(%L)', c_d), '42501', null, 'un collaborateur n''archive pas (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser(g, ge);
  perform public.grp_archiver_contrat(c_d, 'Chariots rendus');
  return next throws_ok(format('select public.grp_enregistrer_contrat(%L, null, ''{"intitule": "autre"}'', %L)', v_client, c_d), '22023', null,
                        'un contrat archivé ne se corrige plus (22023)');
  -- les champs refusés
  return next throws_ok(format('select public.grp_enregistrer_contrat(%L, %L, ''{"intitule": "Sans échéance", "tiers": "X"}'')', v_client, v_soc_a), '22023', null, 'sans échéance : refusé (22023)');
  return next throws_ok(format('select public.grp_enregistrer_contrat(%L, %L, %L)', v_client, v_soc_a, jsonb_build_object('intitule', ' ', 'tiers', 'X', 'date_echeance', current_date)), '22023', null, 'intitulé vide : refusé (22023)');
  return next throws_ok(format('select public.grp_enregistrer_contrat(%L, %L, %L)', v_client, v_soc_a, jsonb_build_object('intitule', 'Sans tiers', 'date_echeance', current_date)), '22023', null, 'sans tiers : refusé (22023)');
  return next throws_ok(format('select public.grp_enregistrer_contrat(%L, %L, %L)', v_client, v_soc_a, jsonb_build_object('intitule', 'P', 'tiers', 'X', 'date_echeance', current_date, 'preavis_unite', 'semaines')), '22023', null, 'préavis en semaines : refusé (22023)');
  return next throws_ok(format('select public.grp_enregistrer_contrat(%L, %L, %L)', v_client, v_soc_a, jsonb_build_object('intitule', 'P', 'tiers', 'X', 'date_echeance', '31/12/2026')), '22023', null, 'date illisible : refusée (22023)');
  return next throws_ok(format('select public.grp_enregistrer_contrat(%L, %L, %L)', v_client, v_soc_a, jsonb_build_object('intitule', 'P', 'objet_id', gen_random_uuid(), 'date_echeance', current_date)), '22023', null, 'un objet inconnu du référentiel : refusé (22023)');
  return next throws_ok(format('select public.grp_enregistrer_contrat(%L, %L, %L)', v_client, b ->> 'pole_d', jsonb_build_object('intitule', 'P', 'tiers', 'X', 'date_echeance', current_date)), '22023', null, 'une entité qui n''est pas une société du groupe : refusée (22023)');
  perform tests.redevenir_admin();

  -- le journal
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action = ''varelo.contrat.enregistre''', v_client)), 2::bigint, 'deux contrats enregistrés au journal');
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action = ''varelo.contrat.denonce''', v_client)), 2::bigint, 'deux dénonciations au journal');
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action = ''varelo.contrat.archive''', v_client)), 1::bigint, 'un archivage au journal');
end $f$;

-- ---------------------------------------------------------------------------
-- Le périmètre et l'isolement.
create or replace function tests.test_b1_08_perimetre() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; v_soc_a uuid; v_soc_b uuid;
  g uuid; ge text := 'b1-gerant@essai.invalid';
  c_b uuid; c_p uuid;
begin
  b := tests.b1_preparer(3);
  v_client := (b ->> 'client')::uuid; v_soc_a := (b ->> 'soc_a')::uuid; v_soc_b := (b ->> 'soc_b')::uuid; g := (b ->> 'gerant')::uuid;
  c_b := tests.b1_contrat(v_client, v_soc_b, jsonb_build_object('tiers', 'Assureur', 'intitule', 'Flotte automobile', 'categorie', 'assurance',
           'date_echeance', current_date + 100), g, ge);
  -- le collaborateur de la seule société A enregistre un contrat de A, pas de B, et ne voit que A
  c_p := tests.b1_contrat(v_client, v_soc_a, jsonb_build_object('tiers', 'Opérateur', 'intitule', 'Lignes mobiles', 'categorie', 'abonnement',
           'date_echeance', current_date + 300), (b ->> 'partiel')::uuid, 'b1-collaborateur-a@essai.invalid');
  return next isnt(c_p, null::uuid, 'un collaborateur enregistre un contrat de sa société');
  perform tests.endosser((b ->> 'partiel')::uuid, 'b1-collaborateur-a@essai.invalid');
  return next throws_ok(format('select public.grp_enregistrer_contrat(%L, %L, %L)', v_client, v_soc_b, jsonb_build_object('intitule', 'P', 'tiers', 'X', 'date_echeance', current_date)), '42501', null,
                        'pas dans une société hors de son périmètre (42501)');
  return next throws_ok(format('select public.grp_enregistrer_contrat(%L, %L, %L, %L)', v_client, v_soc_a, jsonb_build_object('intitule', 'détourné'), c_b), '42501', null,
                        'ni corriger le contrat d''une autre société en le déplaçant (42501)');
  return next is(tests.compter('public', 'grp_contrats_echeancier', format('client_id = %L', v_client)), 1::bigint, 'il ne voit que le contrat de sa société');
  perform tests.redevenir_admin();

  -- une autre organisation ne lit rien et n'écrit rien ; personne n'écrit la table à la main
  perform tests.endosser((b ->> 'etranger')::uuid, 'a5-client-b@essai.invalid');
  return next is(tests.compter('public', 'grp_contrats', format('client_id = %L', v_client)), 0::bigint, 'grp_contrats : rien pour une autre organisation');
  return next is(tests.compter('public', 'grp_contrats_echeancier', format('client_id = %L', v_client)), 0::bigint, 'grp_contrats_echeancier : rien pour une autre organisation');
  return next throws_ok(format('select public.grp_enregistrer_contrat(%L, %L, %L)', v_client, v_soc_a, jsonb_build_object('intitule', 'P', 'tiers', 'X', 'date_echeance', current_date)), '42501', null,
                        'enregistrer un contrat chez un autre groupe : refusé (42501)');
  return next throws_ok(format('select public.grp_denoncer_contrat(%L)', c_b), 'P0002', null, 'dénoncer un contrat d''un autre groupe : introuvable (P0002)');
  perform tests.redevenir_admin();
  perform tests.endosser(g, ge);
  return next throws_ok(format('update public.grp_contrats set statut = ''denonce'' where id = %L', c_b), '42501', null, 'le gérant ne change pas un statut à la main (42501)');
  perform tests.redevenir_admin();
end $f$;
