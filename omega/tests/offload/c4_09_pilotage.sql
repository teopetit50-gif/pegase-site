-- c4_09 — OFFLOAD : le pilotage (session C4, 06/10/2026). Après c4_00, c4_02, c4_03, c4_07, c4_08 (aides) et les
-- migrations c4_01 à c4_09. runtests() annule tout. Dates relatives au jour du test.

-- La remise d'un envoi par la voie du socle (comme C3 et le test 19ab d'A5) : une personne l'approuve, puis
-- l'ouvrier d'envoi le commence et le confirme. Rend le statut final de l'envoi.
create or replace function tests.c4_remettre(p_envoi uuid, p_valideur uuid, p_email text) returns text
language plpgsql as $$
declare
  e public.envois;
  r jsonb;
begin
  select * into e from public.envois where id = p_envoi;
  perform tests.endosser(p_valideur, p_email);
  insert into public.approbations (demande_id, client_id, user_id, decision) values (e.demande_id, e.client_id, p_valideur, 'approuve');
  perform tests.redevenir_admin();
  if to_regprocedure('tests.endosser_serveur()') is not null then
    execute 'select tests.endosser_serveur()';
  end if;
  r := private.commencer_envoi(p_envoi);
  if coalesce((r ->> 'envoyer')::boolean, false) then
    perform private.confirmer_envoi(p_envoi, 'essai:c4:' || p_envoi::text);
  end if;
  perform tests.redevenir_admin();
  return (select x.statut || coalesce(' / ' || x.verrou, '') from public.envois x where x.id = p_envoi);
end $$;

create or replace function tests.test_c4_09_pilotage() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_site uuid;
  v_a uuid; v_b uuid; v_aff uuid; v_eq uuid;
  r public.offload_reprises;
  a public.offload_affaires;
  p jsonb;
  v jsonb;
  v_collab uuid;
begin
  perform tests.c4_reprises_pretes();
  -- Une agence (site) rattachée à la société du banc.
  insert into public.entites (client_id, nom, type, parent_id)
  values (v_client, 'Agence de Rennes', 'site', (banc ->> 'entite')::uuid) returning id into v_site;

  v_a := tests.c4_compte_courriel('PI1', 'Bâti Ouest SARL', 'achats@bati.test', 70);
  v_b := tests.c4_compte_courriel('PI2', 'Cabinet Dentaire Morin', 'cabinet@morin.test', 70);
  update public.offload_comptes set secteur = 'BTP' where id = v_a;
  update public.offload_comptes set secteur = 'Santé', entite_id = v_site where id = v_b;
  update public.offload_achats set entite_id = v_site where compte_id = v_b;
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);

  r := tests.c4_reprise(v_a);
  return next ok(r.valeur_en_jeu > 0 and r.segment = 'BTP',
                 'Chaque reprise garde, à son ouverture, le chiffre en jeu du compte et son segment (' || coalesce(r.valeur_en_jeu::text, '?') || ')');

  -- A répond ; B ne répond pas mais commande.
  perform tests.c4_evenement_envoi(r.envoi1_id, 'envoye');
  perform tests.c4_evenement_envoi((tests.c4_reprise(v_b)).envoi1_id, 'envoye');
  perform public.deposer_reception(v_client, 'email', 'contact@sogexal.test', 'msg-c4-p1', 'achats@bati.test', 'Martin',
    'Re : votre dossier', E'Rappelez-moi lundi.', null, '[]'::jsonb, jsonb_build_object('envoi_id', r.envoi1_id), now());
  perform private.offload_traiter_travaux(50);
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  perform public.offload_saisir_achat(v_b, current_date, 900, 'F-9001', 'Détartreur', 'facture');
  perform tests.redevenir_admin();

  -- Un rappel de retrait, parti, auquel le client répond (sur le compte B : A, qui a répondu à sa reprise, est en pause
  -- au socle pendant 30 jours, et son rappel serait retenu).
  v_aff := tests.c4_affaire(v_b, 'CMD-P1', 9, '{"valeur_ht": 200}');
  perform private.offload_affaires_cycle(v_client, null);
  a := tests.c4_affaire_lue(v_aff);
  return next is(tests.c4_remettre(a.envoi1_id, (banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test'), 'envoye',
                 'Le rappel de retrait part par la voie du socle (approbation, puis ouvrier d''envoi)');
  perform public.deposer_reception(v_client, 'email', 'contact@sogexal.test', 'msg-c4-p2', 'cabinet@morin.test', 'Martin',
    'Re : votre commande', E'Je passe demain.', null, '[]'::jsonb, jsonb_build_object('envoi_id', a.envoi1_id), now());
  perform private.offload_traiter_travaux(50);
  return next ok((tests.c4_affaire_lue(v_aff)).repondu_le is not null, 'La réponse à un rappel de retrait est datée');

  -- Une échéance prévenue puis honorée.
  v_eq := tests.c4_equipement(v_b, 'PI-EQ1', 'Autoclave', 3);
  perform private.offload_echeances_cycle(v_client, null);
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  perform public.offload_noter_intervention(v_eq, current_date, 'entretien', false, 'BI-1');
  p := public.offload_pilotage(v_client, null);
  perform tests.redevenir_admin();

  -- Vague par vague.
  v := p -> 'vagues' -> 0;
  return next ok((v ->> 'vague')::date = current_date and (v ->> 'comptes')::integer = 2 and (v ->> 'messages')::integer = 2
                 and (v ->> 'reponses')::integer = 1 and (v ->> 'commandes')::integer = 1 and (v ->> 'chiffre_repris')::numeric = 900
                 and (v ->> 'en_jeu')::numeric > 0 and (v ->> 'taux_reponse')::numeric = 50,
                 'Le chiffre d''affaires remis en jeu se lit vague par vague : ' || coalesce(v::text, ''));

  -- Le taux de réponse, par segment, par canal, par message.
  return next ok(exists (select 1 from jsonb_array_elements(p -> 'taux' -> 'segment') x where x ->> 'valeur' = 'BTP' and (x ->> 'taux')::numeric = 100)
                 and exists (select 1 from jsonb_array_elements(p -> 'taux' -> 'segment') x where x ->> 'valeur' = 'Santé' and (x ->> 'taux')::numeric = 0),
                 'Le taux de réponse se compare par segment');
  return next ok(exists (select 1 from jsonb_array_elements(p -> 'taux' -> 'canal') x where x ->> 'valeur' = 'Courriel'
                         and (x ->> 'sollicites')::integer = 2 and (x ->> 'reponses')::integer = 1),
                 'Par canal');
  return next ok(exists (select 1 from jsonb_array_elements(p -> 'taux' -> 'message') x where x ->> 'valeur' = 'Premier message' and (x ->> 'taux')::numeric = 50)
                 and exists (select 1 from jsonb_array_elements(p -> 'taux' -> 'message') x where x ->> 'valeur' = 'Rappel de retrait'
                             and (x ->> 'sollicites')::integer = 1 and (x ->> 'reponses')::integer = 1),
                 'Et par message (premier message, rappel de retrait)');
  return next ok(jsonb_array_length(p -> 'taux' -> 'niveau') >= 1, 'Et par niveau de signal');

  -- Le tableau de suivi du mois.
  v := (select x from jsonb_array_elements(p -> 'suivi') x where x ->> 'mois' = to_char(current_date, 'YYYY-MM'));
  return next ok((v ->> 'echeances_honorees')::integer = 1 and (v ->> 'echeances_apres_message')::integer = 1
                 and (v ->> 'commandes_reprises')::integer = 1 and (v ->> 'chiffre_repris')::numeric = 900,
                 'Les échéances honorées et les commandes reprises alimentent le tableau de suivi : ' || coalesce(v::text, ''));

  -- Par entité, par site, en consolidé.
  return next ok(exists (select 1 from jsonb_array_elements(p -> 'entites' -> 'par_site') x where x ->> 'site' = 'Agence de Rennes'
                         and (x ->> 'comptes')::integer = 1 and (x ->> 'chiffre_repris')::numeric = 900 and (x ->> 'echeances_honorees')::integer = 1),
                 'Les résultats se lisent par site');
  return next ok(jsonb_array_length(p -> 'entites' -> 'par_entite') = 1
                 and (p -> 'entites' -> 'par_entite' -> 0 ->> 'comptes')::integer = 2
                 and (p -> 'entites' -> 'par_entite' -> 0 ->> 'societe') = (select e.nom from public.entites e where e.id = (banc ->> 'entite')::uuid),
                 'Par entité (le site compte dans sa société)');
  return next ok((p -> 'entites' -> 'consolide' ->> 'comptes')::integer = 2 and (p -> 'entites' -> 'consolide' ->> 'chiffre_repris')::numeric = 900,
                 'Et en consolidé');

  -- La vue consolidée est pour la direction.
  v_collab := tests.c4_compte(v_client, 'collaborateur', 'collab-c4-pilotage@banc-varelo.test');
  perform tests.endosser(v_collab, 'collab-c4-pilotage@banc-varelo.test');
  return next throws_ok(format('select public.offload_pilotage(%L::uuid, null)', v_client), '42501', null,
                        'Un collaborateur ne lit pas le pilotage consolidé');
  perform tests.redevenir_admin();
end $f$;

create or replace function tests.test_c4_09_arretes() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_mois date := (date_trunc('month', current_date) + interval '1 month')::date;
  l jsonb;
begin
  perform tests.c4_reprises_pretes();
  perform tests.c4_compte_courriel('AR1', 'Garage Lucas', 'garage@lucas.test', 70);
  perform public.offload_regler(v_client, '{"arrete_jour": 5}');
  return next is(private.offload_arreter(v_client, v_mois + 2), null::date, 'Avant le jour réglé, pas d''arrêté');
  perform private.offload_detecter_tout(v_mois + 5);
  return next ok(exists (select 1 from public.offload_arretes a where a.client_id = v_client and a.jour = v_mois + 5),
                 'À date fixe, la nuit pose l''arrêté du mois');
  return next is(private.offload_arreter(v_client, v_mois + 9), null::date, 'Un seul arrêté par mois');
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  l := public.offload_arretes_liste(v_client);
  perform tests.redevenir_admin();
  return next ok(jsonb_array_length(l) = 1 and (l -> 0 -> 'pilotage') ? 'vagues' and (l -> 0 -> 'pilotage') ? 'suivi'
                 and (l -> 0 -> 'pilotage') ? 'entites',
                 'L''arrêté porte les tableaux du pilotage, prêts pour le tableur');
  return next throws_ok(format('select public.offload_regler(%L::uuid, %L)', v_client, '{"arrete_jour": 31}'), '23514', null,
                        'Le jour d''arrêté reste entre 1 et 28');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'offload.arrete'),
                 'L''arrêté est au journal');
end $f$;

select * from runtests('tests'::name, '^test_c4_09_');
