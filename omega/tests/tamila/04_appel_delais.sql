-- 04 — Déclaration d'appel, calcul des délais avec les règles de territoire, confirmation par un avocat,
-- correction, interruption, annulation (étapes 5, 6, 7). Après 00_jeu_tamila.sql. runtests() annule tout.

create or replace function tests.test_b4_04_appel_delais() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_dossier uuid; v_appel uuid; a public.tamila_appels; t public.tamila_delais; b5 public.delais;
  v_regles text[]; v_regle text; c jsonb; g public.regles_delais; v_attendu date; v_demande public.demandes_validation;
  v_statut text; v_n bigint;
begin
  jeu := tests.tamila_scene();
  v_dossier := (jeu ->> 'dossier')::uuid;
  v_regles := array(select tests.tamila_regles('declaration_appel'));
  return next ok(cardinality(v_regles) >= 1, format('au moins une règle de procédure joue à la déclaration d''appel (appelant, à orienter, régime cpc) : %s', array_to_string(v_regles, ', ')));

  -- ── Les refus ──
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_declarer_appel(%L::uuid, date ''2017-06-01'', ''appelant'')', v_dossier), '22023', null,
    'un appel antérieur au 01/09/2017 : Tamila ne calcule pas (22023)');
  return next throws_ok(format('select public.tamila_declarer_appel(%L::uuid, current_date + 1, ''appelant'')', v_dossier), '22023', null,
    'un appel ne s''introduit pas dans le futur (22023)');
  return next throws_ok(format('select public.tamila_declarer_appel(%L::uuid, date ''2026-09-15'', ''appelant'', ''a_orienter'', ''nouvelle-caledonie'')', v_dossier), '22023', null,
    'Nouvelle-Calédonie : procédure civile locale, Tamila ne calcule pas (22023)');
  return next throws_ok(format('select public.tamila_declarer_appel(%L::uuid, date ''2026-09-15'', ''demandeur'')', v_dossier), '22023', null,
    'rôle inconnu (22023)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next throws_ok(format('select public.tamila_declarer_appel(%L::uuid, date ''2026-09-15'', ''appelant'')', v_dossier), '42501', null,
    'le stagiaire ne déclare pas l''appel (42501)');
  perform tests.redevenir_admin();

  -- ── La déclaration d'appel : régime cpc, délais posés d'eux-mêmes ──
  v_appel := tests.tamila_appel(jeu);
  select * into a from public.tamila_appels where id = v_appel;
  return next is(a.regime, 'cpc', 'appel introduit après le 01/09/2024 : régime cpc (décret 2023-1391)');
  return next is(a.procedure, 'a_orienter', 'procédure à orienter');
  return next is(a.role_client, 'appelant', 'le client est appelant');
  return next is(a.territoire, 'metropole', 'cour de métropole');
  select count(*) into v_n from public.tamila_delais where appel_id = v_appel and nature = 'regle';
  return next is(v_n, cardinality(v_regles)::bigint, 'un délai par règle de la déclaration d''appel');

  -- ── Le calcul d'un délai : trois mois + un mois (client en Guadeloupe devant Paris), prorogation ──
  v_regle := v_regles[1];
  select * into t from public.tamila_delais where appel_id = v_appel and regle_code = v_regle;
  return next is(t.statut, 'a_confirmer', 'le délai attend la confirmation d''un avocat');
  return next is(t.residence, 'guadeloupe', 'résidence du client retenue : Guadeloupe');
  return next is(t.depart, date '2026-09-15', 'départ : la déclaration d''appel');
  select * into g from public.regles_delais where code = v_regle and version = t.regle_version;
  if (select augmentable from public.tamila_regles_procedure where code = v_regle) then
    return next is(t.augmentation_mois, 1::smallint, 'augmentation d''un mois (art. 915-4 : partie demeurant outre-mer devant une juridiction de métropole)');
    return next is(t.motif_augmentation, 'outre_mer_devant_metropole', 'motif de l''augmentation');
    v_attendu := public.proroger(case g.unite when 'mois' then public.ajouter_mois(t.depart, g.quantite + 1) else public.ajouter_mois(t.depart, 1) + g.quantite end, 'metropole');
  else
    return next is(t.augmentation_mois, 0::smallint, 'règle non augmentable : pas d''augmentation');
    return next is(t.motif_augmentation, 'non_augmentable', 'motif : non augmentable');
    v_attendu := public.proroger(case g.unite when 'mois' then public.ajouter_mois(t.depart, g.quantite) else t.depart + g.quantite end, 'metropole');
  end if;
  return next is(t.echeance_calculee, v_attendu, format('échéance calculée = %s (%s %s depuis le départ, augmentation, prorogation art. 642)', v_attendu, g.quantite, g.unite));
  return next is(t.echeance_retenue, t.echeance_calculee, 'échéance retenue = calculée tant qu''un avocat ne l''a pas corrigée');
  c := public.tamila_calculer_delai(v_regle, date '2026-09-15', 'metropole', 'guadeloupe');
  return next is((c ->> 'echeance')::date, t.echeance_calculee, 'tamila_calculer_delai rend la même échéance');
  return next ok(c ->> 'detail' like '%CPC, art. ' || (c ->> 'article') || '%', 'le détail en toutes lettres cite l''article');
  return next ok((c ->> 'detail') like '%' || private.jour_en_toutes_lettres(t.echeance_calculee) || '%', 'et la date retenue, en toutes lettres');
  return next is(c ->> 'regime', 'cpc', 'régime cpc dans le calcul');
  return next ok((c -> 'alternatives') is not null and jsonb_typeof(c -> 'alternatives') = 'array', 'les autres dates possibles sont rendues (liste)');
  -- Un domicile inconnu : deux dates de plus à montrer, à confirmer.
  c := public.tamila_calculer_delai(v_regle, date '2026-09-15', 'metropole', 'inconnue');
  return next ok(c -> 'raisons' @> '["domicile_inconnu"]'::jsonb, 'résidence inconnue : raison « domicile_inconnu »');
  return next is(jsonb_array_length(c -> 'alternatives'), case when (select augmentable from public.tamila_regles_procedure where code = v_regle) then 2 else 0 end,
    'avec un mois et deux mois de plus, montrés avec la date retenue');
  -- Devant la cour de Basse-Terre (Guadeloupe), un client de Guadeloupe : pas d'augmentation ; un client de métropole : un mois.
  c := public.tamila_calculer_delai(v_regle, date '2026-09-15', 'guadeloupe', 'guadeloupe');
  return next is((c ->> 'augmentation_mois')::int, 0, 'client de la collectivité devant sa cour : pas d''augmentation');
  c := public.tamila_calculer_delai(v_regle, date '2026-09-15', 'guadeloupe', 'metropole');
  return next is((c ->> 'augmentation_mois')::int, case when (select augmentable from public.tamila_regles_procedure where code = v_regle) then 1 else 0 end,
    'client hors de la collectivité devant une cour d''outre-mer : un mois (915-4)');
  return next throws_ok(format('select public.tamila_calculer_delai(%L, date ''2026-09-15'', ''polynesie-francaise'', ''metropole'')', v_regle), '22023', null,
    'Polynésie : procédure locale, pas de calcul (22023)');

  -- Le délai de B5 concorde et porte l'augmentation.
  select * into b5 from public.delais where id = t.delai_id;
  return next is(b5.echeance, t.echeance_retenue, 'le délai du socle (B5) porte la même échéance');
  return next is(b5.statut, 'ouvert', 'délai B5 ouvert');
  select * into v_demande from public.demandes_validation where id = t.demande_id;
  return next is(v_demande.type_action, 'confirmer_delai', 'une demande « confirmer_delai » accompagne le délai');
  return next is(v_demande.statut, 'en_attente', 'elle attend un avocat');
  return next ok(v_demande.resume like '%' || to_char(t.echeance_retenue, 'DD/MM/YYYY') || '%', 'le résumé de la demande dit l''échéance');

  -- ── Confirmation : l'assistante ne peut pas, l'avocat intervenant si ──
  perform tests.endosser((jeu ->> 'assistante')::uuid, 'b4-assistante@essai.invalid');
  begin
    v_statut := public.tamila_decider(v_demande.id, 'approuve', 'Vu.');
  exception when others then
    v_statut := 'refus:' || sqlstate;
  end;
  perform tests.redevenir_admin();
  return next isnt((select statut from public.tamila_delais where id = t.id), 'confirme', format('l''assistante ne confirme pas un délai (%s)', v_statut));
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  v_statut := public.tamila_decider(v_demande.id, 'approuve', 'Date vérifiée sur l''avis.');
  perform tests.redevenir_admin();
  return next is(v_statut, 'executee', 'Me Rousseau approuve : la demande est exécutée');
  select * into t from public.tamila_delais where id = t.id;
  return next is(t.statut, 'confirme', 'le délai est confirmé');
  return next is(t.confirme_par, (jeu ->> 'avocat')::uuid, 'par Me Rousseau');
  return next is(t.confirmation, 'approbation', 'confirmation par approbation');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = (jeu ->> 'client')::uuid and j.action = 'tamila.delai.confirme'
                         and j.objet_id = v_dossier::text), 'la confirmation est au journal opposable (tamila.delai.confirme)');

  -- ── Correction par un avocat (date notifiée) ──
  perform tests.endosser((jeu ->> 'assistante')::uuid, 'b4-assistante@essai.invalid');
  return next throws_ok(format('select public.tamila_corriger_delai(%L::uuid, %L::date, ''date_notifiee'')', t.id, t.echeance_retenue + 3), '42501', null,
    'une date se corrige par un avocat (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select public.tamila_corriger_delai(%L::uuid, %L::date, ''parce_que'')', t.id, t.echeance_retenue + 3), '22023', null, 'motif de correction inconnu (22023)');
  return next lives_ok(format('select public.tamila_corriger_delai(%L::uuid, %L::date, ''date_notifiee'')', t.id, t.echeance_retenue + 3), 'Me Rousseau saisit la date notifiée par le greffe');
  perform tests.redevenir_admin();
  select * into t from public.tamila_delais where id = t.id;
  return next is(t.echeance_retenue, t.echeance_calculee + 3, 'l''échéance retenue est corrigée');
  return next is(t.echeance_calculee, v_attendu, 'le calcul, lui, ne bouge pas');
  return next is(t.confirmation, 'saisie', 'confirmation par saisie');
  return next is((select echeance from public.delais where id = t.delai_id), t.echeance_retenue, 'B5 suit la date corrigée');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = (jeu ->> 'client')::uuid and j.action = 'tamila.delai.corrige'), 'correction au journal');

  -- ── Changer la date de l'appel avec des délais posés : refusé ; annulation puis interruption ──
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_declarer_appel(%L::uuid, date ''2026-09-16'', ''appelant'')', v_dossier), '55000', null,
    'des délais sont posés : la date de l''appel ne change pas sans les annuler (55000)');
  return next throws_ok(format('select public.tamila_annuler_delai(%L::uuid, ''envie'')', t.id), '22023', null, 'motif d''annulation inconnu (22023)');
  if (select interruptible from public.tamila_regles_procedure where code = v_regle) then
    return next lives_ok(format('select public.tamila_interrompre_delai(%L::uuid, ''mediation'', current_date)', t.id), 'une médiation interrompt le délai pour conclure (art. 915-3)');
    perform tests.redevenir_admin();
    return next is((select statut from public.tamila_delais where id = t.id), 'interrompu', 'délai interrompu');
    return next is((select statut from public.delais where id = t.delai_id), 'annule', 'le délai B5 est annulé, l''avocat saisira la reprise');
    perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
    return next lives_ok(format('select public.tamila_corriger_delai(%L::uuid, %L::date, ''reprise_apres_interruption'')', t.id, t.echeance_retenue + 60), 'la reprise après interruption pose la nouvelle date');
    perform tests.redevenir_admin();
    select * into t from public.tamila_delais where id = t.id;
    return next is(t.statut, 'confirme', 'reconfirmé');
    return next ok(t.delai_id <> b5.id, 'un nouveau délai B5 porte la date de reprise');
    perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  else
    return next throws_ok(format('select public.tamila_interrompre_delai(%L::uuid, ''mediation'', current_date)', t.id), '22023', null, 'ce délai ne s''interrompt pas (22023)');
  end if;
  return next lives_ok(format('select public.tamila_annuler_delai(%L::uuid, ''desistement'')', t.id), 'le gérant annule le délai (désistement)');
  perform tests.redevenir_admin();
  select * into t from public.tamila_delais where id = t.id;
  return next is(t.statut, 'annule', 'délai annulé');
  return next is(t.annule_par, (jeu ->> 'gerant')::uuid, 'par le gérant');
  return next is((select statut from public.delais where id = t.delai_id), 'annule', 'B5 annulé aussi');
  -- le socle vérifie qui parle avant l'état : c'est le gérant (avocat du dossier) qui réessaie, et tombe sur l'état
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_annuler_delai(%L::uuid, ''erreur'')', t.id), '55000', null, 'déjà annulé : on ne l''annule pas deux fois (55000)');
  perform tests.redevenir_admin();
  return next throws_ok(format('update public.tamila_delais set statut = ''confirme'' where id = %L', t.id), '55000', null, 'un délai annulé ne change plus (déclencheur, 55000)');
  return next throws_ok(format('delete from public.tamila_delais where id = %L', t.id), '42501', null, 'un délai de procédure ne se retire jamais (42501)');

  -- ── Une date fixée par le juge, saisie par l'avocat : confirmée d'office ──
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  v_regle := public.tamila_poser_date(v_dossier, date '2027-03-10', 'conclure', 'calendrier_de_procedure')::text;
  perform tests.redevenir_admin();
  select * into t from public.tamila_delais where id = v_regle::uuid;
  return next is(t.nature, 'date_fixee', 'date fixée');
  return next is(t.statut, 'confirme', 'saisie par un avocat : confirmée d''office');
  return next is(t.source_date, 'calendrier_de_procedure', 'source : calendrier de procédure');
  -- La même par l'assistante : à confirmer.
  perform tests.endosser((jeu ->> 'assistante')::uuid, 'b4-assistante@essai.invalid');
  v_regle := public.tamila_poser_date(v_dossier, date '2027-03-12', 'autre', 'saisie')::text;
  perform tests.redevenir_admin();
  return next is((select statut from public.tamila_delais where id = v_regle::uuid), 'a_confirmer', 'saisie par l''assistante : un avocat confirme');
  return next ok((select demande_id from public.tamila_delais where id = v_regle::uuid) is not null, 'avec sa demande');
end $f$;

select * from runtests('tests'::name, '^test_b4_04_');
