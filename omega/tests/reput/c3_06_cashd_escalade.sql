-- c3_06 — REPUT : avis après règlement CASHD, litige, délai et escalade, client reconnu, sujets récurrents, avis par site.
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_05 (aides tests.c3_*) et les migrations c3_01 à c3_06.
-- runtests() annule tout. Le test pose sa propre private.cashd_contact_en_litige DANS sa transaction (annulée à la fin) :
-- il ne dépend pas de l'état de CASHD sur la recette, et n'y laisse rien.

create or replace function tests.c3_reception_signee(p_client uuid, p_de text, p_nom text, p_sujet text, p_corps text) returns bigint
language plpgsql as $$
declare v_id bigint;
begin
  insert into public.receptions (client_id, module, canal, boite, identifiant_externe, de_adresse, de_empreinte, de_nom, sujet, corps)
  values (p_client, 'reput', 'email', 'banc@recu.omegaai.fr', 'c3-06-' || gen_random_uuid()::text, p_de,
          encode(extensions.digest(lower(trim(p_de)), 'sha256'), 'hex'), p_nom, p_sujet, p_corps)
  returning id into v_id;
  return v_id;
end $$;

create or replace function tests.test_c3_06_cashd_escalade() returns setof text
language plpgsql as $f$
declare
  banc jsonb; jeu jsonb;
  v_client uuid; v_gerant uuid; v_daf uuid; v_collab uuid; v_autre uuid;
  v_h uuid; v_pol uuid; v_act uuid; v_rec bigint; v_c jsonb; v_d jsonb; v_dem uuid; v_items jsonb; n integer;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  jeu := tests.jeu();
  v_autre := (jeu ->> 'gerant_a')::uuid;
  v_collab := tests.c3_compte(v_client, 'collaborateur', 'c3-06-collab@banc-varelo.test');
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);
  execute $q$create or replace function private.cashd_contact_en_litige(p_client uuid, p_adresse text) returns boolean
             language sql stable set search_path to '' as $b$ select lower(p_adresse) = 'litige@exemple.test' $b$$q$;
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_h := (public.reput_ecrire_connaissance(null, v_client, jsonb_build_object('sujet', 'horaires', 'genre', 'horaires',
    'titre', 'Horaires', 'contenu', 'Le samedi de 9 h à 12 h.', 'source', 'Gérant')) ->> 'id')::uuid;
  v_pol := (public.reput_donner_accord(v_client, 'horaires') ->> 'proposee')::uuid;
  select p.demande_id into v_act from public.politiques p where p.id = v_pol;
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision) values (v_act, v_client, v_daf, 'approuve');
  perform tests.redevenir_admin();

  -- ── Un client en litige ne reçoit aucune réponse automatisée ──
  v_rec := tests.c3_reception_signee(v_client, 'Litige@Exemple.test', 'Client en litige', 'Samedi ?', 'Ouvert samedi ?');
  v_c := public.reput_commencer(v_rec);
  v_dem := (v_c ->> 'demande')::uuid;
  return next is(v_c ->> 'litige', 'true', 'Le dossier préparé dit : contact en litige');
  v_d := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'horaires', 'langue', 'fr', 'couverte', true,
    'sources', jsonb_build_array(v_h), 'corps', 'Oui, le samedi de 9 h à 12 h.'));
  return next is(v_d ->> 'type_action', 'reput.transferer', 'Couverte et sur un sujet autorisé, mais en litige : toujours relue');
  return next is(v_d ->> 'envoi_statut', 'a_valider', 'L''envoi attend la validation');
  return next ok(exists (select 1 from public.alertes a where a.client_id = v_client and a.detail ->> 'demande' = v_dem::text
                         and a.titre like 'Client en litige%'), 'Une alerte remonte le litige');
  v_rec := tests.c3_reception_signee(v_client, 'paix@exemple.test', 'Client serein', 'Samedi ?', 'Ouvert samedi ?');
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  v_d := public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'horaires', 'langue', 'fr', 'couverte', true,
    'sources', jsonb_build_array(v_h), 'corps', 'Oui, le samedi de 9 h à 12 h.'));
  return next is(v_d ->> 'type_action', 'reput.repondre.horaires', 'Hors litige, le même sujet part par l''accord');

  -- ── Le client reconnu à son adresse ──
  v_rec := tests.c3_reception_signee(v_client, 'PAIX@exemple.test', 'Client serein', 'Encore moi', 'Et le dimanche ?');
  v_c := public.reput_commencer(v_rec);
  return next is(v_c -> 'client_connu' ->> 'connu', 'true', 'Le deuxième message de la même adresse : client reconnu');
  return next is((v_c -> 'client_connu' ->> 'demandes')::int, 1, 'avec sa demande précédente');
  return next ok((v_c -> 'client_connu' -> 'sujets') ? 'horaires', 'et son sujet (sans le texte)');
  v_rec := tests.c3_reception_signee(v_client, 'nouveau@exemple.test', 'Nouveau', 'Bonjour', 'Première fois.');
  return next is(public.reput_commencer(v_rec) -> 'client_connu' ->> 'connu', 'false', 'Une adresse jamais vue : inconnu');

  -- ── Le délai de traitement et l'escalade ──
  return next is((select s.delai_heures from public.reput_sujets s where s.client_id = v_client and s.code = 'urgence'), 1, 'Urgence : 1 h par défaut');
  return next is((select s.delai_heures from public.reput_sujets s where s.client_id = v_client and s.code = 'tarifs'), 24, 'Tarifs : 24 h par défaut');
  perform tests.endosser(v_collab, 'c3-06-collab@banc-varelo.test');
  return next throws_ok(format('select public.reput_fixer_delai(%L, %L, 2)', v_client, 'tarifs'), '42501', null, 'Un collaborateur ne fixe pas les délais');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.reput_fixer_delai(%L, %L, 0)', v_client, 'tarifs'), '22023', null, 'Un délai de 0 h est refusé');
  perform public.reput_fixer_delai(v_client, 'tarifs', 2);
  perform tests.redevenir_admin();
  return next is((select s.delai_heures from public.reput_sujets s where s.client_id = v_client and s.code = 'tarifs'), 2, 'Le gérant fixe 2 h pour les tarifs');
  v_rec := tests.c3_reception_signee(v_client, 'attente@exemple.test', 'Client patient', 'Prix', 'Combien ?');
  v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
  perform public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'tarifs', 'langue', 'fr', 'couverte', false, 'corps', 'Nous revenons vers vous.'));
  perform private.reput_escalader(now());
  return next is((select d.escaladee_le from public.reput_demandes d where d.id = v_dem), null, 'Dans le délai : rien ne remonte');
  perform private.reput_escalader(now() + interval '3 hours');
  return next ok((select d.escaladee_le is not null from public.reput_demandes d where d.id = v_dem), 'Délai de 2 h dépassé : la demande remonte');
  return next ok(exists (select 1 from public.alertes a where a.client_id = v_client and a.cle_regroupement like '%delai:' || v_dem::text),
                 'une alerte au responsable');
  n := private.reput_escalader(now() + interval '5 hours');
  return next ok(not exists (select 1 from public.alertes a where a.client_id = v_client and a.detail ->> 'demande' = v_dem::text
                             and a.cle_regroupement like '%delai:%' group by a.detail ->> 'demande' having count(*) > 1), 'Une seule remontée par demande');

  -- ── Les sujets récurrents hors base ──
  for n in 1..2 loop
    v_rec := tests.c3_reception_signee(v_client, 'q' || n || '@exemple.test', 'Q' || n, 'Garantie', 'Quelle garantie ?');
    v_dem := (public.reput_commencer(v_rec) ->> 'demande')::uuid;
    perform public.reput_deposer_reponse(v_dem, jsonb_build_object('sujet', 'information', 'langue', 'fr', 'couverte', false, 'corps', 'Nous vérifions.'));
  end loop;
  v_items := private.reput_point_matin_lignes(v_client, (now() at time zone 'Europe/Paris')::date + 1);
  return next ok(exists (select 1 from jsonb_array_elements(v_items) x where x ->> 'texte' like '% questions hors de votre base cette semaine sur « Renseignement »%'),
                 'Le point du matin remonte un sujet qui revient hors base');

  -- ── La demande d'avis après un règlement lettré (CASHD) ──
  return next ok(exists (select 1 from private.abonnements a where a.evenement = 'cashd.facture_reglee' and a.module = 'reput'),
                 'Abonnement cashd.facture_reglee → reput');
  perform private.publier_evenement(v_client, 'cashd.facture_reglee', jsonb_build_object('facture', gen_random_uuid(), 'numero', 'FA-C3-001',
    'regle_le', current_date - 1, 'email', 'regle1@exemple.test', 'nom', 'Société Réglée'), 'facture:c3-06-1');
  perform private.reput_ouvrier(20);
  return next is((select count(*)::int from public.reput_avis a where a.client_id = v_client and a.adresse = 'regle1@exemple.test'), 0,
                 'Sans l''option : aucun avis demandé');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.reput_regler(v_client, null, '{"avis_auto_reglement": true, "lien_avis": "https://g.page/r/sogexal-banc/review"}'::jsonb);
  perform tests.redevenir_admin();
  perform private.publier_evenement(v_client, 'cashd.facture_reglee', jsonb_build_object('facture', gen_random_uuid(), 'numero', 'FA-C3-002',
    'regle_le', current_date - 1, 'email', 'regle2@exemple.test', 'nom', 'Société Réglée 2'), 'facture:c3-06-2');
  perform private.reput_ouvrier(20);
  return next is((select a.statut || ' / ' || a.reference from public.reput_avis a where a.client_id = v_client and a.adresse = 'regle2@exemple.test'),
                 'programme / FA-C3-002', 'Option cochée : la demande d''avis est programmée sur la facture réglée');
  return next ok((select a.prochain_le > now() from public.reput_avis a where a.client_id = v_client and a.adresse = 'regle2@exemple.test'),
                 'pour J+3 après le règlement');
  perform private.publier_evenement(v_client, 'cashd.facture_reglee', jsonb_build_object('facture', gen_random_uuid(), 'numero', 'FA-C3-003',
    'email', 'regle2@exemple.test'), 'facture:c3-06-3');
  perform private.reput_ouvrier(20);
  return next is((select count(*)::int from public.reput_avis a where a.client_id = v_client and a.adresse = 'regle2@exemple.test' and a.statut = 'programme'), 1,
                 'Un second règlement du même client ne le sollicite pas deux fois');

  -- ── Les avis comptés par site ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next ok((select sum(i.programmes) from public.reput_avis_indicateurs i where i.client_id = v_client) >= 1, 'Avis comptés (vue par site et par mois)');
  perform tests.endosser(v_autre, 'a5-gerant-a@essai.invalid');
  return next is((select count(*)::int from public.reput_avis_indicateurs i where i.client_id = v_client), 0, 'Une autre organisation ne les lit pas');
  perform tests.redevenir_admin();
  return next ok(not has_function_privilege('authenticated', 'private.reput_avis_depuis_reglement(uuid, jsonb)', 'execute'), 'authenticated n''exécute pas reput_avis_depuis_reglement');
end $f$;

select * from runtests('tests'::name, '^test_c3_06_');
