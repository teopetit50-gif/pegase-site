-- b1_12 — VARELO : les reportings dus (migration b1_09_reportings, après b1_08)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5) et b1_00_aides.sql.
-- runtests() annule tout ce que le test écrit. Motif : ^test_b1_12_
-- Dates relatives à current_date : le nombre d'échéances attendues se calcule dans le test.
--
-- La société A doit chaque mois à la marque qu'elle distribue ses ventes et son stock, dix jours après la fin
-- du mois ; le suivi commence il y a 70 jours : deux mois sont déjà en retard. Le collaborateur en est responsable.

create or replace function tests.test_b1_12_echeances() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; a uuid; bb uuid;
  g uuid; ge text := 'b1-gerant@essai.invalid';
  v_collab uuid;
  r_a uuid; r_b uuid; r_h uuid;
  attendu bigint; retards bigint;
  e1 uuid; e2 uuid;
  x record;
  m jsonb;
begin
  b := tests.b1_preparer(3);
  v_client := (b ->> 'client')::uuid; a := (b ->> 'soc_a')::uuid; bb := (b ->> 'soc_b')::uuid; g := (b ->> 'gerant')::uuid;
  v_collab := (b ->> 'collab')::uuid;

  perform tests.endosser(g, ge);
  r_a := public.grp_enregistrer_reporting(v_client, a, jsonb_build_object('destinataire', 'Marque Atlantique Automobiles', 'intitule', 'Ventes et stock du mois',
           'periodicite', 'mensuelle', 'delai_jours', 10, 'debut', current_date - 70, 'canal', 'portail', 'responsable_id', v_collab));
  r_b := public.grp_enregistrer_reporting(v_client, bb, jsonb_build_object('destinataire', 'Banque des Antilles', 'intitule', 'Covenants trimestriels',
           'periodicite', 'trimestrielle', 'delai_jours', 30, 'debut', current_date - 200));
  r_h := public.grp_enregistrer_reporting(v_client, a, jsonb_build_object('destinataire', 'Marque Atlantique Automobiles', 'intitule', 'Prévisions de la semaine',
           'periodicite', 'hebdomadaire', 'delai_jours', 1, 'debut', current_date - 20));
  perform tests.redevenir_admin();

  select count(*) into attendu from generate_series(date_trunc('month', (current_date - 70)::timestamp), (current_date + 45)::timestamp, interval '1 month') d
   where (d + interval '1 month')::date - 1 + 10 <= current_date + 45;
  select count(*) into retards from generate_series(date_trunc('month', (current_date - 70)::timestamp), (current_date + 45)::timestamp, interval '1 month') d
   where (d + interval '1 month')::date - 1 + 10 < current_date;
  return next is(tests.compter('public', 'grp_reportings_echeances', format('reporting_id = %L', r_a)), attendu,
                 format('mensuel : %s échéances, du mois du début jusqu''à 45 jours devant', attendu));
  return next is(tests.compter('public', 'grp_reportings_dus', format('reporting_id = %L and etat = ''en_retard''', r_a)), retards, format('%s en retard', retards));
  return next is(tests.compter('public', 'grp_reportings_echeances', format('reporting_id = %L and (periode_debut <> date_trunc(''month'', periode_debut)::date or echeance <> periode_fin + 10 or periode_fin <> (periode_debut + interval ''1 month'')::date - 1)', r_a)),
                 0::bigint, 'chaque période est un mois calendaire, due dix jours après sa fin');
  return next is(tests.compter('public', 'grp_reportings_echeances', format('reporting_id = %L and periode_debut <> date_trunc(''quarter'', periode_debut)::date', r_b)),
                 0::bigint, 'trimestriel : des trimestres calendaires');
  return next is(tests.compter('public', 'grp_reportings_echeances', format('reporting_id = %L and extract(isodow from periode_debut) <> 1', r_h)),
                 0::bigint, 'hebdomadaire : des semaines du lundi au dimanche');
  return next is(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement like ''varelo:reporting.%%'' and acquittee_le is null and not interne and destinataire_id = %L', v_client, v_collab)),
                 retards, 'une alerte par échéance en retard, adressée au responsable');
  perform private.grp_tache_reportings();
  return next is(tests.compter('public', 'grp_reportings_echeances', format('reporting_id = %L', r_a)), attendu, 'le passage de nuit ne crée rien en double');

  -- le responsable (collaborateur) marque la plus ancienne envoyée aujourd'hui : en retard, et dit
  select id into e1 from public.grp_reportings_echeances where reporting_id = r_a order by periode_debut limit 1;
  perform tests.endosser(v_collab, 'b1-collaborateur@essai.invalid');
  m := public.grp_marquer_reporting(e1, 'envoye', current_date, 'Déposé sur le portail de la marque');
  perform tests.redevenir_admin();
  select * into x from public.grp_reportings_dus where id = e1;
  return next ok(x.etat = 'envoye_en_retard' and x.fait_le = current_date and (m ->> 'en_retard')::boolean, 'envoyée après son échéance : « envoyé en retard »');
  return next is(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement = %L and acquittee_le is null', v_client, 'varelo:reporting.' || e1)), 0::bigint,
                 'son alerte est close');

  -- les refus
  select id into e2 from public.grp_reportings_echeances where reporting_id = r_a and statut = 'a_faire' order by periode_debut limit 1;
  perform tests.endosser(v_collab, 'b1-collaborateur@essai.invalid');
  return next throws_ok(format('select public.grp_marquer_reporting(%L, ''envoye'')', e1), '22023', null, 'une échéance déjà envoyée : refusée (22023)');
  return next throws_ok(format('select public.grp_marquer_reporting(%L, ''dispense'')', e2), '22023', null, 'une dispense sans motif : refusée (22023)');
  return next throws_ok(format('select public.grp_marquer_reporting(%L, ''envoye'', current_date + 2)', e2), '22023', null, 'une date d''envoi future : refusée (22023)');
  return next throws_ok(format('select public.grp_marquer_reporting(%L, ''fait'')', e2), '22023', null, 'un statut inconnu : refusé (22023)');
  return next throws_ok(format('select public.grp_arreter_reporting(%L)', r_a), '42501', null, 'un collaborateur n''arrête pas un reporting (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((b ->> 'partiel')::uuid, 'b1-collaborateur-a@essai.invalid');
  return next throws_ok(format('select public.grp_marquer_reporting(%L, ''envoye'')', e2), '42501', null, 'un collaborateur qui n''en est pas responsable ne le marque pas (42501)');
  perform tests.redevenir_admin();
  -- un valideur de la société, si : une dispense motivée
  perform tests.endosser((b ->> 'referent')::uuid, 'b1-referent@essai.invalid');
  perform public.grp_marquer_reporting(e2, 'dispense', current_date, 'La marque a fermé son portail ce mois-là');
  perform tests.redevenir_admin();
  return next is((select etat from public.grp_reportings_dus where id = e2), 'dispense', 'un valideur dispense, avec son motif');

  -- corriger le délai : les échéances à faire se recalent, les faites non
  perform tests.endosser(g, ge);
  perform public.grp_enregistrer_reporting(v_client, null, jsonb_build_object('delai_jours', 5), r_a);
  perform tests.redevenir_admin();
  return next is(tests.compter('public', 'grp_reportings_echeances', format('reporting_id = %L and statut = ''a_faire'' and echeance <> periode_fin + 5', r_a)), 0::bigint,
                 'délai ramené à 5 jours : les échéances à faire se recalent');
  return next is(tests.compter('public', 'grp_reportings_echeances', format('id = %L and echeance = periode_fin + 10', e1)), 1::bigint, 'l''échéance déjà envoyée garde sa date');

  -- le point du matin
  perform tests.endosser(g, ge);
  m := public.grp_ce_matin(v_client);
  perform tests.redevenir_admin();
  return next ok(jsonb_array_length(m -> 'reportings') >= 1 and (m -> 'reportings' -> 0 ->> 'gravite') in ('critique', 'attention', 'info'),
                 format('« Reportings dus » au point du matin : %s', m -> 'reportings' -> 0 ->> 'texte'));
  perform private.grp_deposer_points((current_date + time '06:00') at time zone 'Europe/Paris');
  return next is(tests.compter('public', 'points_sections', format('client_id = %L and module = ''varelo'' and titre = ''Reportings dus'' and role = ''gerant''', v_client)), 1::bigint,
                 'la section « Reportings dus » est déposée au gérant');
  return next is(tests.compter('public', 'points_sections', format('client_id = %L and module = ''varelo'' and titre = ''Mes reportings dus'' and destinataire = %L', v_client, v_collab)),
                 (case when exists (select 1 from public.grp_reportings_dus where reporting_id = r_a and etat in ('en_retard', 'aujourdhui', 'semaine')) then 1 else 0 end)::bigint,
                 'le responsable reçoit « Mes reportings dus » s''il en a dans la semaine ou en retard');

  -- arrêter : plus d'alerte, plus de ligne au point du matin
  perform tests.endosser(g, ge);
  perform public.grp_arreter_reporting(r_a, 'La marque est reprise par un autre distributeur');
  m := public.grp_ce_matin(v_client);
  perform tests.redevenir_admin();
  return next is(tests.compter('public', 'alertes', format('client_id = %L and cle_regroupement like ''varelo:reporting.%%'' and acquittee_le is null and (detail ->> ''reporting_id'') = %L', v_client, r_a)),
                 0::bigint, 'arrêté : ses alertes se ferment');
  return next ok(not exists (select 1 from jsonb_array_elements(m -> 'reportings') l where l ->> 'texte' like '%Ventes et stock du mois%'), 'et il quitte le point du matin');
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action like ''varelo.reporting.%%''', v_client)), 7::bigint,
                 'au journal : trois enregistrés, une correction, un envoyé, une dispense, un arrêt');
end $f$;

create or replace function tests.test_b1_12_droits() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; a uuid; bb uuid;
  g uuid; ge text := 'b1-gerant@essai.invalid';
  r_b uuid; e uuid;
begin
  b := tests.b1_preparer(3);
  v_client := (b ->> 'client')::uuid; a := (b ->> 'soc_a')::uuid; bb := (b ->> 'soc_b')::uuid; g := (b ->> 'gerant')::uuid;
  perform tests.endosser(g, ge);
  r_b := public.grp_enregistrer_reporting(v_client, bb, jsonb_build_object('destinataire', 'Banque', 'intitule', 'Tableau mensuel', 'debut', current_date - 40));
  return next throws_ok(format('select public.grp_enregistrer_reporting(%L, %L, %L)', v_client, a, jsonb_build_object('intitule', 'Sans destinataire')), '22023', null, 'sans destinataire : refusé (22023)');
  return next throws_ok(format('select public.grp_enregistrer_reporting(%L, %L, %L)', v_client, a, jsonb_build_object('destinataire', 'X', 'intitule', 'Y', 'periodicite', 'quotidienne')), '22023', null, 'périodicité inconnue : refusée (22023)');
  return next throws_ok(format('select public.grp_enregistrer_reporting(%L, %L, %L)', v_client, a, jsonb_build_object('destinataire', 'X', 'intitule', 'Y', 'delai_jours', 400)), '22023', null, 'délai de 400 jours : refusé (22023)');
  return next throws_ok(format('select public.grp_enregistrer_reporting(%L, %L, %L)', v_client, a, jsonb_build_object('destinataire', 'X', 'intitule', 'Y', 'responsable_id', gen_random_uuid())), '22023', null, 'un responsable hors de l''organisation : refusé (22023)');
  return next throws_ok(format('insert into public.grp_reportings (client_id, entite_id, destinataire, intitule) values (%L, %L, ''X'', ''Y'')', v_client, a), '42501', null, 'personne n''écrit la table à la main (42501)');
  perform tests.redevenir_admin();
  -- périmètre partiel : la seule société A
  perform tests.endosser((b ->> 'partiel')::uuid, 'b1-collaborateur-a@essai.invalid');
  return next is(tests.compter('public', 'grp_reportings_dus', format('client_id = %L', v_client)), 0::bigint, 'périmètre partiel : aucun reporting de B');
  return next throws_ok(format('select public.grp_enregistrer_reporting(%L, %L, %L)', v_client, bb, jsonb_build_object('destinataire', 'X', 'intitule', 'Y')), '42501', null, 'ni en enregistrer pour B (42501)');
  perform tests.redevenir_admin();
  -- une autre organisation
  select id into e from public.grp_reportings_echeances where reporting_id = r_b limit 1;
  perform tests.endosser((b ->> 'etranger')::uuid, 'a5-client-b@essai.invalid');
  return next is(tests.compter('public', 'grp_reportings', format('client_id = %L', v_client)), 0::bigint, 'grp_reportings : rien pour une autre organisation');
  return next is(tests.compter('public', 'grp_reportings_dus', format('client_id = %L', v_client)), 0::bigint, 'grp_reportings_dus : rien pour une autre organisation');
  return next throws_ok(format('select public.grp_marquer_reporting(%L, ''envoye'')', e), 'P0002', null, 'marquer chez un autre groupe : introuvable (P0002)');
  return next throws_ok(format('select public.grp_enregistrer_reporting(%L, %L, %L)', v_client, a, jsonb_build_object('destinataire', 'X', 'intitule', 'Y')), '42501', null, 'enregistrer chez un autre groupe : refusé (42501)');
  perform tests.redevenir_admin();
end $f$;
