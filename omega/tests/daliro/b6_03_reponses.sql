-- b6_03 — DALIRO : la réponse OUI / NON reçue est portée au passage (session B6, 06/10/2026), b6_07.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_07.
-- Il faut la ligne reglages_envois daliro du banc (mode essai, posée par omega/recette-b6/banc_j2_reel.sql) :
-- le test la pose si elle manque, en essai. runtests() annule tout : aucun envoi ne part.

create or replace function tests.test_b6_03_reponses() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_referent uuid;
  v_mo uuid; v_ch uuid; v_lot uuid; v_debut date; v_j jsonb;
  v_t1 uuid; v_t2 uuid; v_t3 uuid; v_p1 uuid; v_p2 uuid; v_p3 uuid; v_e1 uuid; v_e2 uuid; v_e3 uuid;
  v_r1 bigint; v_r2 bigint; v_r3 bigint; v_r4 bigint; v_res jsonb; v_n integer;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_referent := (banc ->> 'referent')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'daliro', 'essai',
         coalesce((select r.essai_adresse from public.reglages_envois r where r.client_id = v_client and r.module = 'tavaro'),
                  (select r.essai_adresse from public.reglages_envois r where r.client_id = v_client and r.module is null),
                  'essais@omegaai.fr'),
         array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'daliro');
  v_debut := coalesce(public.ajouter_jours(current_date, 2, 'ouvres', 'metropole'), current_date + 2);

  -- Un chantier ouvert, trois sous-traitants joignables par courriel, trois passages à J-2.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO des réponses') returning id into v_mo;
  insert into public.btp_tiers (client_id, roles, nom, email, canal) values (v_client, array['sous_traitant'], 'Réponses Un', 'un@b6-reponses.test', 'email') returning id into v_t1;
  insert into public.btp_tiers (client_id, roles, nom, email, canal) values (v_client, array['sous_traitant'], 'Réponses Deux', 'deux@b6-reponses.test', 'email') returning id into v_t2;
  insert into public.btp_tiers (client_id, roles, nom, email, canal) values (v_client, array['sous_traitant'], 'Réponses Trois', 'trois@b6-reponses.test', 'email') returning id into v_t3;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, conducteur_id, statut)
  values (v_client, 'Chantier des réponses', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, coalesce(v_referent, v_gerant), 'ouvert')
  returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution, tiers_id) values (v_client, v_ch, '01', 'Lot des réponses', 'sous_traitant', v_t1) returning id into v_lot;
  v_j := public.btp_importer_passages(v_ch, 'tableur', jsonb_build_array(
    jsonb_build_object('ref', 'R1', 'lot', '01', 'intervenant', 'Réponses Un', 'tache', 'Pose', 'debut', v_debut, 'fin', v_debut),
    jsonb_build_object('ref', 'R2', 'lot', '01', 'intervenant', 'Réponses Deux', 'tache', 'Pose', 'debut', v_debut, 'fin', v_debut),
    jsonb_build_object('ref', 'R3', 'lot', '01', 'intervenant', 'Réponses Trois', 'tache', 'Pose', 'debut', v_debut, 'fin', v_debut)), false);
  perform tests.redevenir_admin();
  select id into v_p1 from public.btp_passages where chantier_id = v_ch and source_ref = 'R1';
  select id into v_p2 from public.btp_passages where chantier_id = v_ch and source_ref = 'R2';
  select id into v_p3 from public.btp_passages where chantier_id = v_ch and source_ref = 'R3';
  return next ok((select count(*) from public.btp_passages where chantier_id = v_ch and tiers_id is not null) = 3, 'Trois passages rapprochés de leurs sous-traitants');

  -- La demande J-2 et l'ouvrier (b6_06) : un envoi par passage.
  perform private.btp_demander_confirmations(v_client, current_date);
  perform private.btp_ouvrier(50);
  select e.id into v_e1 from public.envois e where e.client_id = v_client and e.module = 'daliro' and e.objet_id = v_p1::text;
  select e.id into v_e2 from public.envois e where e.client_id = v_client and e.module = 'daliro' and e.objet_id = v_p2::text;
  select e.id into v_e3 from public.envois e where e.client_id = v_client and e.module = 'daliro' and e.objet_id = v_p3::text;
  return next ok(v_e1 is not null and v_e2 is not null and v_e3 is not null, 'La demande J-2 est préparée pour les trois passages');
  return next is((select e.mode from public.envois e where e.id = v_e1), 'essai', 'Le banc est en mode essai : rien ne part au tiers');

  -- La lecture stricte.
  return next is(private.btp_lire_oui_non(E'Oui !\n\nLe 6 oct. Omega a écrit :\n> Confirmez votre passage'), 'confirmee', 'Lecture : « Oui ! » au-dessus de la citation = confirmé');
  return next is(private.btp_lire_oui_non('Ok pas de souci'), 'confirmee', 'Lecture : « Ok pas de souci » = confirmé');
  return next is(private.btp_lire_oui_non('Non désolé'), 'declinee', 'Lecture : « Non désolé » = décliné');
  return next is(private.btp_lire_oui_non('Je ne peux pas'), 'declinee', 'Lecture : « Je ne peux pas » = décliné');
  return next ok(private.btp_lire_oui_non('Oui mais pas jeudi') is null, 'Lecture : « Oui mais pas jeudi » n''est pas lu');
  return next ok(private.btp_lire_oui_non('Non, c''est bon je viens') is null, 'Lecture : « Non, c''est bon je viens » n''est pas lu');
  return next ok(private.btp_lire_oui_non('> seulement la citation') is null, 'Lecture : une citation seule n''est pas une réponse');

  -- Les réponses arrivent par la porte de la réception du socle (celle qu'appelle la réception d'A2), rattachées à l'envoi.
  v_r1 := (private.deposer_reception(v_client, 'email', 'essais@omegaai.fr', 'b6-rep-1', 'un@b6-reponses.test', 'Réponses Un',
             'Re: Confirmez', E'Oui !\n\n> Confirmez votre passage', null, '[]'::jsonb,
             jsonb_build_object('module', 'daliro', 'envoi_id', v_e1)) ->> 'id')::bigint;
  v_r2 := (private.deposer_reception(v_client, 'email', 'essais@omegaai.fr', 'b6-rep-2', 'deux@b6-reponses.test', 'Réponses Deux',
             'Re: Confirmez', 'Non désolé, empêché', null, '[]'::jsonb,
             jsonb_build_object('module', 'daliro', 'envoi_id', v_e2)) ->> 'id')::bigint;
  v_r3 := (private.deposer_reception(v_client, 'email', 'essais@omegaai.fr', 'b6-rep-3', 'trois@b6-reponses.test', 'Réponses Trois',
             'Re: Confirmez', 'Oui mais pas jeudi, plutôt vendredi', null, '[]'::jsonb,
             jsonb_build_object('module', 'daliro', 'envoi_id', v_e3)) ->> 'id')::bigint;
  v_r4 := (private.deposer_reception(v_client, 'email', 'essais@omegaai.fr', 'b6-rep-4', 'quelquun@b6-reponses.test', null,
             'Une question', 'Oui', null, '[]'::jsonb, jsonb_build_object('module', 'daliro')) ->> 'id')::bigint;
  return next ok((select r.en_reponse_a from public.receptions r where r.id = v_r1) = v_e1, 'La réception R1 est rattachée à sa demande J-2');
  return next is((select count(*)::int from public.travaux t where t.genre = 'daliro.reception' and t.etat = 'a_faire'
                  and (t.charge ->> 'reception')::bigint in (v_r1, v_r2, v_r3, v_r4)), 4, 'Chaque réception dépose un travail daliro.reception');
  perform private.btp_ouvrier(50);

  return next is((select p.confirmation from public.btp_passages p where p.id = v_p1), 'confirmee', '« Oui ! » : le passage R1 est confirmé');
  return next ok(exists (select 1 from public.btp_confirmations x where x.passage_id = v_p1 and x.evenement = 'confirmee' and x.cle = 'reception:' || v_r1),
                 'Le fil de R1 porte la confirmation, clé reception:<id>');
  return next is((select r.statut from public.receptions r where r.id = v_r1), 'traitee', 'La réception lue passe « traitée »');
  return next is((select p.confirmation from public.btp_passages p where p.id = v_p2), 'declinee', '« Non désolé » : le passage R2 est décliné');
  return next is((select p.confirmation from public.btp_passages p where p.id = v_p3), 'demandee', '« Oui mais pas jeudi » : R3 reste en attente, rien n''est noté');
  return next ok(exists (select 1 from public.alertes a where a.client_id = v_client and a.titre like 'Réponses Trois a répondu%à lire%'),
                 'Une alerte « à lire » est levée pour le conducteur');
  return next is((select r.statut from public.receptions r where r.id = v_r3), 'nouvelle', 'La réception illisible reste « nouvelle » pour le bureau');
  return next is((select t.resultat ->> 'ignore' from public.travaux t where t.genre = 'daliro.reception' and (t.charge ->> 'reception')::bigint = v_r4),
                 'ne répond à aucun envoi', 'Une réception qui ne répond à aucun envoi est ignorée');
  return next is((select count(*)::int from public.travaux t where t.genre = 'daliro.reception' and t.etat <> 'fait'
                  and (t.charge ->> 'reception')::bigint in (v_r1, v_r2, v_r3, v_r4)), 0, 'Les quatre travaux sont faits, aucun rendu');

  -- Rejouer la même réception ne réécrit rien.
  v_res := private.btp_lire_reponse(v_r1);
  return next is(v_res ->> 'statut', 'notee', 'Rejouer la réception R1 rend « notée »');
  return next is((select count(*)::int from public.btp_confirmations x where x.passage_id = v_p1 and x.evenement = 'confirmee'), 1, 'Rejouée, elle n''écrit pas une seconde confirmation');

  -- Le tableau du chantier montre la demande partie.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_j := public.btp_tableau_chantier(v_ch);
  select count(*) into v_n from jsonb_array_elements(v_j -> 'passages') x where x -> 'envoi' ->> 'id' is not null;
  return next is(v_n, 3, 'Le tableau rend l''envoi de la demande J-2 sur chaque passage (sous la RLS du gérant)');
  return next is((select x -> 'envoi' ->> 'canal' from jsonb_array_elements(v_j -> 'passages') x where x ->> 'id' = v_p1::text), 'email', 'Avec son canal');
  perform tests.redevenir_admin();

  -- Droits : rien de neuf n'est ouvert aux membres.
  return next ok(not has_function_privilege('authenticated', 'private.btp_lire_reponse(bigint)', 'execute'), 'authenticated n''exécute pas btp_lire_reponse');
  return next ok(not has_function_privilege('authenticated', 'private.btp_lire_oui_non(text)', 'execute'), 'authenticated n''exécute pas btp_lire_oui_non');
  return next ok(not has_function_privilege('authenticated', 'private.btp_ouvrier(integer)', 'execute'), 'authenticated n''exécute pas btp_ouvrier');
  return next ok(not has_function_privilege('anon', 'private.btp_envoyer_demande(public.travaux)', 'execute'), 'anon n''exécute pas btp_envoyer_demande');
end $f$;

select * from runtests('tests'::name, '^test_b6_03_');
