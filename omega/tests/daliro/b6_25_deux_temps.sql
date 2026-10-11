-- b6_25 — DALIRO : la confirmation J-2 en deux temps (session B6, 11/10/2026), b6_29.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_29.
-- runtests() annule tout. Les deux temps sont appelés par une passerelle (la fonction privée est au serveur).

create or replace function tests.b6_phase(p_client uuid, p_jour date, p_phase text) returns jsonb
language sql security definer set search_path to '' as $$ select private.btp_confirmations_phase(p_client, p_jour, p_phase) $$;

create or replace function tests.test_b6_25_deux_temps() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid;
  v_mo uuid; v_st uuid; v_ch uuid; v_p uuid; v_j jsonb; v_jour date := current_date; v_debut date;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO des deux temps') returning id into v_mo;
  insert into public.btp_tiers (client_id, roles, nom, telephone, canal, code_postal, commune)
  values (v_client, array['sous_traitant'], 'Plâtrerie des deux temps', '+336' || lpad((floor(random() * 90000000) + 10000000)::bigint::text, 8, '0'), 'sms', '69100', 'Villeurbanne')
  returning id into v_st;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier des deux temps', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution, tiers_id) values (v_client, v_ch, '05', 'Plâtrerie', 'sous_traitant', v_st);
  select public.ajouter_jours(v_jour, 2, 'ouvres', c.territoire) into v_debut from public.btp_chantiers c where c.id = v_ch;
  perform public.btp_importer_passages(v_ch, 'tableur', jsonb_build_array(jsonb_build_object('ref', 'DT-1', 'lot', '05', 'intervenant', 'Plâtrerie des deux temps',
                                                                                             'tache', 'Doublages', 'debut', v_debut, 'fin', v_debut)), false);
  select p.id into v_p from public.btp_passages p where p.chantier_id = v_ch and p.source_ref = 'DT-1';
  perform tests.redevenir_admin();

  return next ok(v_p is not null and (select p.tiers_id from public.btp_passages p where p.id = v_p) = v_st, 'Le passage du sous-traitant dans deux jours ouvrés');
  return next throws_ok(format('select tests.b6_phase(%L, %L, %L)', v_client, v_jour, 'midi'), '22023', null, 'Une phase inconnue est refusée');

  -- ── Le soir sans demande : rien ──
  perform tests.b6_phase(v_client, v_jour, 'soir');
  return next is((select p.confirmation from public.btp_passages p where p.id = v_p), 'non_demandee', 'Le soir ne demande rien');

  -- ── Le matin de J-2 : la demande part ──
  v_j := tests.b6_phase(v_client, v_jour, 'matin');
  return next is((select p.confirmation from public.btp_passages p where p.id = v_p) || '/' || (v_j ->> 'phase'), 'demandee/matin', 'Le matin de J-2, la demande part');
  perform tests.b6_phase(v_client, v_jour, 'matin');
  return next is((select count(*)::int from public.btp_confirmations x where x.passage_id = v_p and x.evenement = 'demandee'), 1, 'Rejoué le matin : une seule demande');

  -- ── Le soir de J-2, toujours sans réponse : alerte, il reste J-1 ──
  perform tests.b6_phase(v_client, v_jour, 'soir');
  return next is((select p.confirmation from public.btp_passages p where p.id = v_p), 'sans_reponse', 'Le soir même, sans réponse : « sans réponse »');
  return next ok(exists (select 1 from public.btp_confirmations x where x.passage_id = v_p and x.evenement = 'sans_reponse' and x.detail ? 'remplacants'),
                 'L''événement porte les remplaçants proposés');
  return next ok(exists (select 1 from public.alertes a where a.client_id = v_client and a.source = 'daliro_referentiel'
                         and a.titre like 'Plâtrerie des deux temps n''a pas confirmé son passage du ' || to_char(v_debut, 'DD/MM') || '%'),
                 'Le conducteur est prévenu le soir de J-2, la veille de la veille');

  -- ── Les tâches ──
  return next ok(pg_get_functiondef('private.btp_tache_confirmations()'::regprocedure) like '%btp_confirmations_phase(%''soir'')%'
                 and pg_get_functiondef('private.btp_tache_confirmations_matin()'::regprocedure) like '%btp_confirmations_phase(%''matin'')%',
                 'La tâche de 17 h relève le soir ; celle du matin demande');
  return next ok(not has_function_privilege('authenticated', 'private.btp_confirmations_phase(uuid, date, text)', 'execute'), 'Les deux temps restent au serveur');
end $f$;

select * from runtests('tests'::name, '^test_b6_25_');
