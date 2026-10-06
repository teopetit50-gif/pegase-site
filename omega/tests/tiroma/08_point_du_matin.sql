-- B3-08 — Le point du matin de Tiroma et la santé : les sections sont déposées pour l'équipe, lues par apercu_point,
-- et rien de nominatif ne part par un canal sans expéditeur agréé (étape 14 du scénario).
-- Après 00_aides_b3.sql, 00b_export_logosw.sql, b3_01 à b3_10, et la ligne reglages_envois (banc, tiroma, essai, sante)
-- posée par le coordinateur. runtests() annule tout.

create or replace function tests.test_b3_08_point_du_matin() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  j date := tests.b3_jour();
  r jsonb;
  v_cabinet uuid;
  n integer;
  v_apercu jsonb;
  v_envoi uuid;
  v_reglage jsonb;
begin
  r := tests.b3_cabinet_releve('initial');
  v_cabinet := (r ->> 'cabinet')::uuid;
  perform tests.b3_deposer_releve((r ->> 'branchement')::uuid, array['agenda', 'actes'], 'courant', 'b3:courant');
  perform tests.b3_traiter();

  -- 14. Le dépôt des sections à 6 h 30, heure du cabinet.
  n := private.tiroma_deposer_points((j + time '06:30') at time zone (select fuseau from public.entites where id = entite));
  return next is(n, 3, 'trois membres servis (titulaire, collaborateur, assistante)');
  return next ok(not exists (select 1 from public.alertes a where a.client_id = banc and a.cle_regroupement = 'tiroma:point:depot:' || v_cabinet::text and a.acquittee_le is null),
                 'aucune alerte de dépôt' || coalesce((select ' : ' || (a.detail ->> 'erreur') from public.alertes a where a.client_id = banc and a.cle_regroupement = 'tiroma:point:depot:' || v_cabinet::text limit 1), ''));
  return next ok(exists (select 1 from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = j and s.destinataire = tests.b3_compte('gerant') and s.titre = 'Créneaux à sauver' and s.sante and s.nb_items = 1),
                 'titulaire : section « Créneaux à sauver », santé, 1 ligne');
  return next ok(exists (select 1 from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = j and s.destinataire = tests.b3_compte('gerant') and s.titre = 'Plans sans rendez-vous' and s.sante and s.nb_items = 4),
                 'titulaire : section « Plans sans rendez-vous », santé, 4 lignes');
  return next ok(exists (select 1 from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = j and s.destinataire = tests.b3_compte('gerant') and s.titre = 'Avant les rendez-vous' and s.sante and s.nb_items >= 5),
                 'titulaire : section « Avant les rendez-vous », santé');
  return next ok(exists (select 1 from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = j and s.destinataire = tests.b3_compte('referent') and s.titre = 'Créneaux à sauver'),
                 'assistante : « Créneaux à sauver » aussi');
  return next ok(not exists (select 1 from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = j and s.destinataire = tests.b3_compte('referent') and s.titre = 'Charge des fauteuils'),
                 'assistante : jamais la charge des fauteuils');
  return next ok(not exists (select 1 from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = j and s.destinataire = tests.b3_compte('daf') and s.titre = 'Créneaux à sauver'),
                 'collaborateur (Dr Rousseau) : pas le créneau du Dr Lacour');
  return next ok(exists (select 1 from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = j and s.destinataire = tests.b3_compte('daf') and s.titre = 'Plans sans rendez-vous' and s.nb_items = 1),
                 'collaborateur : son seul plan (D002)');
  return next ok(not exists (select 1 from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = j and s.destinataire = tests.b3_compte('daf2')),
                 'daf2, sans profil : rien');
  -- Rejouer le dépôt ne double rien.
  n := private.tiroma_deposer_points((j + time '06:45') at time zone (select fuseau from public.entites where id = entite));
  return next is(tests.compter('public', 'points_sections', format('client_id = %L and module = ''tiroma'' and jour = %L and destinataire = %L', banc, j, tests.b3_compte('gerant'))),
                 (select count(*) from public.points_sections s where s.client_id = banc and s.module = 'tiroma' and s.jour = j and s.destinataire = tests.b3_compte('gerant')),
                 'un second passage remplace les sections, sans doublon');
  -- Avant 5 h, rien ne se dépose.
  return next is(private.tiroma_deposer_points((j + 1 + time '03:00') at time zone (select fuseau from public.entites where id = entite)), 0, 'à 3 h du matin, aucun dépôt');

  -- L'aperçu du point, sous le jeton du titulaire : la section Tiroma nomme la patiente à appeler.
  perform tests.b3_endosser('gerant');
  v_apercu := public.apercu_point(banc, tests.b3_compte('gerant'), j);
  return next ok(exists (select 1 from jsonb_array_elements(v_apercu -> 'sections') s where s.value ->> 'module' = 'tiroma' and s.value ->> 'titre' = 'Créneaux à sauver' and (s.value ->> 'sante')::boolean),
                 'apercu_point : la section « Créneaux à sauver » de Tiroma, marquée santé');
  return next ok(exists (select 1 from jsonb_array_elements(v_apercu -> 'sections') s, jsonb_array_elements(s.value -> 'lignes') l
                         where s.value ->> 'module' = 'tiroma' and l.value ->> 'texte' like '%Marguerite Delannoy%' and l.value ->> 'lien' = '/espace/tiroma'),
                 'la ligne nomme Marguerite Delannoy et renvoie vers /espace/tiroma');
  perform tests.b3_endosser('daf');
  v_apercu := public.apercu_point(banc, tests.b3_compte('daf'), j);
  return next ok(not exists (select 1 from jsonb_array_elements(v_apercu -> 'sections') s, jsonb_array_elements(s.value -> 'lignes') l
                             where s.value ->> 'module' = 'tiroma' and l.value ->> 'texte' like '%Delannoy%'),
                 'le collaborateur ne voit pas la patiente du Dr Lacour dans son point');
  perform tests.redevenir_admin();

  -- La santé : un message nominatif ne part que par un expéditeur agréé ; sans lui, il est bloqué. (Transactionnel : sinon le
  -- verrou de consentement, qui précède celui de santé dans verrous_envoi, répondrait CONSENTEMENT_ABSENT.)
  v_reglage := private.reglages_envois_effectifs(banc, 'tiroma');
  return next ok(v_reglage ->> 'mode' is not null, 'reglages_envois (banc, tiroma) est posé : mode ' || coalesce(v_reglage ->> 'mode', 'ABSENT'));
  v_envoi := private.preparer_envoi(banc, 'tiroma', 'tiroma_cabinets', v_cabinet::text, 'email',
               jsonb_build_object('adresse', 'gerant@banc-varelo.test', 'nom', 'Gérant du banc'), null, '{}'::jsonb,
               'Point du matin — Tiroma', 'Annulation demain 9 h : appeler Marguerite Delannoy (plan accepté).', null,
               'b3:sante:email:' || v_cabinet::text, entite, true, true, null, '{}'::jsonb);
  return next is((select statut || '/' || coalesce(verrou, '') from public.envois where id = v_envoi), 'bloque/SANTE_HORS_CANAL_AGREE',
                 'courriel nominatif (données de santé) : bloqué, SANTE_HORS_CANAL_AGREE — aucun fournisseur n''est agréé');
  v_envoi := private.preparer_envoi(banc, 'tiroma', 'tiroma_cabinets', v_cabinet::text, 'sms',
               jsonb_build_object('adresse', '+590690000000', 'nom', 'Gérant du banc'), null, '{}'::jsonb,
               null, 'Point du matin : 1 créneau à reprendre.', null,
               'b3:sante:sms:' || v_cabinet::text, entite, false, false, null, '{}'::jsonb);
  return next is((select statut || '/' || coalesce(verrou, '') from public.envois where id = v_envoi), 'bloque/CANAL_NON_PERMIS',
                 'SMS, même sans nom : bloqué, CANAL_NON_PERMIS (contexte de santé, aucun prestataire certifié)');
  v_envoi := private.preparer_envoi(banc, 'tiroma', 'tiroma_cabinets', v_cabinet::text, 'email',
               jsonb_build_object('adresse', 'gerant@banc-varelo.test', 'nom', 'Gérant du banc'), null, '{}'::jsonb,
               'Point du matin — Tiroma', '1 créneau à reprendre, 4 plans sans rendez-vous, 6 vérifications : https://app.omegaai.fr/espace/tiroma', null,
               'b3:sante:compteurs:' || v_cabinet::text, entite, true, false, null, '{}'::jsonb);
  -- Le socle tient tout texte libre d'un module de santé pour de la santé (creer_envoi : v_contexte_sante) : même le
  -- courriel des seuls compteurs est bloqué. Pour qu'il parte, il faudra un gabarit validé (gabarits_messages,
  -- donnees_sante = false) : trou n° 10 dans omega/NOTES-B3.md.
  return next is((select statut || '/' || coalesce(verrou, '') from public.envois where id = v_envoi), 'bloque/SANTE_HORS_CANAL_AGREE',
                 'courriel des compteurs en texte libre : bloqué lui aussi, le module est un contexte de santé (il faudra un gabarit validé)');
  return next ok((select donnees_sante from public.envois where id = v_envoi), 'le socle l''a marqué santé de lui-même');
  -- b3_10 : le même contenu par le gabarit validé tiroma.point_matin (aucune variable libre) : il n'est pas santé, il part.
  return next ok(exists (select 1 from public.gabarits_messages g where g.client_id is null and g.code = 'tiroma.point_matin' and g.statut = 'valide'),
                 'le gabarit tiroma.point_matin est validé (b3_10)');
  v_envoi := private.preparer_envoi(banc, 'tiroma', 'tiroma_cabinets', v_cabinet::text, 'email',
               jsonb_build_object('adresse', 'gerant@banc-varelo.test', 'nom', 'Gérant du banc'), 'tiroma.point_matin',
               jsonb_build_object('jour', j, 'creneaux', 1, 'plans', 4, 'verifications', 6, 'demi_journees_vides', 2), null, null, null,
               'b3:sante:gabarit:' || v_cabinet::text, entite, true, false, null, '{}'::jsonb);
  return next ok((select statut in ('a_valider', 'differe', 'pret') from public.envois where id = v_envoi),
                 'courriel des compteurs par le gabarit : accepté (' || (select statut || coalesce(' / ' || verrou, '') from public.envois where id = v_envoi) || ')');
  return next ok((select not donnees_sante from public.envois where id = v_envoi), 'il n''est pas marqué santé');
  return next ok((select corps like '%1 créneau(x)%' and corps like '%/espace/tiroma%' and corps not like '%Delannoy%' from public.envois where id = v_envoi),
                 'le corps porte les compteurs et le lien, aucun nom');
end $f$;

select * from runtests('tests'::name, '^test_b3_08_');
