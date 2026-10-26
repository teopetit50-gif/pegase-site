-- c3_45 — les écarts du testeur indépendant sur la reprise après refus (RECETTE-TESTEUR-MODULES-2026-10-26, TMOD-08 à 10).
-- Exécutable tel quel par execute_sql sur la RECETTE, après le socle 19az et les migrations c3_01 à c3_45 (aide
-- tests.c3_44_preparee du test c3_44). Rien n'est envoyé (mode essai). runtests() annule tout.

create or replace function tests.test_c3_45_reprise_ecarts() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; v_mail text := 'c3-45-gerant@banc-varelo.test';
  v_a uuid; v_b uuid; v_c uuid; v_d uuid; v_nv uuid;
  dem_a uuid; dem_b uuid; dem_c uuid; dem_d uuid; v_j jsonb; v_raison text;
begin
  if to_regprocedure('private.proposer_reprise(uuid,text,jsonb,jsonb,numeric)') is null then
    return next ok(true, 'Lot socle 19az absent : reprise non vérifiable ici');
    return;
  end if;
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  v_gerant := tests.c3_compte(v_client, 'gerant', v_mail);
  perform public.reput_installer(v_client);
  update private.reprises set statut = 'impossible', motif = 'test c3_45 : hors scène', traite_le = now()
   where module = 'reput' and statut = 'a_faire';

  v_a := tests.c3_44_preparee(v_client, 'c3-45a@exemple.test', 'Fictif Civilité', 'La pièce changée est-elle garantie ?');
  v_b := tests.c3_44_preparee(v_client, 'c3-45b@exemple.test', 'Fictif Prix', 'Combien coûte un ramonage ?');
  v_c := tests.c3_44_preparee(v_client, 'c3-45c@exemple.test', 'Fictif Suivie', 'Vous faites les entretiens ?');
  v_d := tests.c3_44_preparee(v_client, 'c3-45d@exemple.test', 'Fictif Muet', 'Vous passez quand ?');
  select p.demande_id into dem_a from public.reput_reponses p where p.demande_validation_id = v_a;
  select p.demande_id into dem_b from public.reput_reponses p where p.demande_validation_id = v_b;
  select p.demande_id into dem_c from public.reput_reponses p where p.demande_validation_id = v_c;
  select p.demande_id into dem_d from public.reput_reponses p where p.demande_validation_id = v_d;

  perform tests.endosser(v_gerant, v_mail);
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
  values (v_a, v_client, v_gerant, 'rejete', 'Écrivez « Bonjour Madame Goyave » et dites que les pièces sont garanties un an.'),
         (v_b, v_client, v_gerant, 'rejete', 'Donnez le prix du ramonage.'),
         (v_c, v_client, v_gerant, 'rejete', 'Proposez un rendez-vous d''entretien.');
  insert into public.approbations (demande_id, client_id, user_id, decision) values (v_d, v_client, v_gerant, 'rejete');
  perform tests.redevenir_admin();
  perform private.reput_traiter_reprises();

  -- TMOD-10 : un refus sans consigne ne propose que des gestes possibles, et la demande va à une personne.
  return next ok((select x.statut = 'impossible' and x.motif not like '%refusez de nouveau%' from private.reprises x where x.demande_id = v_d),
                 'TMOD-10 : le motif d''un refus sans consigne ne propose plus de refuser de nouveau (geste impossible)'
                 || coalesce(' [' || (select x.motif from private.reprises x where x.demande_id = v_d) || ']', ''));
  return next ok((select d.statut = 'a_traiter' from public.reput_demandes d where d.id = dem_d)
                 and exists (select 1 from public.alertes a where a.client_id = v_client and a.titre like 'Demande à traiter vous-même : Fictif Muet%'),
                 'TMOD-08 : refus sans reprise possible → « à traiter vous-même », avec une alerte'
                 || coalesce(' [' || (select d.statut from public.reput_demandes d where d.id = dem_d) || ']', ''));

  -- TMOD-09 : une consigne qui touche la formule d'appel n'est suivie qu'en partie (elle vient des réglages).
  v_j := public.reput_deposer_reponse(dem_a, jsonb_build_object('sujet', 'autre', 'langue', 'fr', 'couverte', false,
           'corps', 'Les pièces remplacées sont garanties un an.'), 'test/c3_45');
  v_raison := (select p.raison from public.reput_reponses p where p.id = (v_j ->> 'reponse')::uuid);
  return next ok(v_raison like 'Reprise après refus (consigne suivie en partie%formule d''appel%' and v_raison not like '%(consigne suivie)%',
                 'TMOD-09 : formule d''appel demandée → « consigne suivie en partie », en disant ce qui ne l''est pas'
                 || coalesce(' [' || v_raison || ']', ''));
  v_nv := (v_j ->> 'demande_validation')::uuid;
  return next ok((select x.payload ->> 'consigne_suivie' = 'false' and x.payload -> 'consigne_non_suivie' ->> 0 like '%formule d''appel%'
                    from public.demandes_validation x where x.id = v_nv),
                 'La demande de validation porte « consigne suivie : non » et ce qui ne l''est pas');

  -- TMOD-09 : ce que le modèle dit ne pas avoir pu suivre est repris.
  v_j := public.reput_deposer_reponse(dem_b, jsonb_build_object('sujet', 'autre', 'langue', 'fr', 'couverte', false,
           'corps', 'Notre équipe vous donne le prix par téléphone.', 'consigne_non_suivie', 'le prix du ramonage n''est pas dans la base'),
           'test/c3_45');
  v_raison := (select p.raison from public.reput_reponses p where p.id = (v_j ->> 'reponse')::uuid);
  return next ok(v_raison like 'Reprise après refus (consigne suivie en partie%prix du ramonage n''est pas dans la base%',
                 'TMOD-09 : ce que le modèle n''a pas pu suivre est dit' || coalesce(' [' || v_raison || ']', ''));

  -- Une consigne entièrement suivie le reste.
  v_j := public.reput_deposer_reponse(dem_c, jsonb_build_object('sujet', 'autre', 'langue', 'fr', 'couverte', false,
           'corps', 'Nous pouvons passer pour l''entretien : notre équipe vous appelle pour fixer le rendez-vous.'), 'test/c3_45');
  v_raison := (select p.raison from public.reput_reponses p where p.id = (v_j ->> 'reponse')::uuid);
  return next ok(v_raison like 'Reprise après refus (consigne suivie)%', 'Consigne entièrement suivie : « consigne suivie »'
                 || coalesce(' [' || v_raison || ']', ''));

  -- TMOD-08 : le refus de la reprise ne laisse pas la demande « à valider » sans rien à valider.
  perform tests.endosser(v_gerant, v_mail);
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
  values (v_nv, v_client, v_gerant, 'rejete', 'Toujours sans le nom.');
  perform tests.redevenir_admin();
  perform private.reput_traiter_reprises();
  return next ok((select d.statut = 'a_traiter' and d.motif like 'Reprise refusée%Toujours sans le nom.%' from public.reput_demandes d where d.id = dem_a)
                 and exists (select 1 from public.alertes a where a.client_id = v_client and a.titre like 'Demande à traiter vous-même : Fictif Civilité%'),
                 'TMOD-08 : second refus → « à traiter vous-même », avec la consigne du second refus et une alerte'
                 || coalesce(' [' || (select d.statut || ' / ' || coalesce(d.motif, '') from public.reput_demandes d where d.id = dem_a) || ']', ''));
  return next ok(not exists (select 1 from public.reput_demandes d where d.id in (dem_a, dem_d) and d.statut = 'a_valider'
                               and not exists (select 1 from public.reput_reponses p join public.demandes_validation x on x.id = p.demande_validation_id
                                               where p.demande_id = d.id and x.statut = 'en_attente')),
                 'Aucune demande « à valider » sans validation en attente');
end $f$;

select * from runtests('tests'::name, '^test_c3_45_');
