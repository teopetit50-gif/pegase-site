-- Tests B5 — LORANI : le parcours réel d'un permis, de l'ouverture du projet à la purge des recours.
-- pgTAP, schéma « tests » (posé par A5, 00_installation.sql), client du banc cccccccc-0000-4000-8000-00000000000c,
-- comptes gerant / referent / daf / daf2 (lus par leur adresse dans auth.users).
-- Exécutable tel quel par execute_sql sur la RECETTE ; runtests() annule tout ce que le test écrit.
-- Scénario et ce que chaque étape prouve : omega/NOTES-B5.md, § 1.
--
-- Portes empruntées (jamais d'écriture directe hors RLS) :
--   tables écrites sous RLS par un membre : lorani_projets, lorani_membres_projet, lorani_lots, lorani_intervenants,
--     lorani_permis, lorani_permis_recours ;
--   portes RPC : lorani_deposer_piece (b5_01), lorani_confirmer_date_lue, lorani_ecarter_date_lue,
--     lorani_confirmer_decision_implicite, lorani_calendrier_permis ;
--   portes du lecteur (service_role) : commencer_lecture, enregistrer_lecture ; file : deposer_travail ;
--   crons : private.lorani_lectures_passage(), private.lorani_calendrier_passage() (appelés tels quels).

-- ---------------------------------------------------------------------------
-- Aides B5 (préfixe b5_, pour ne pas toucher celles d'A5).

-- Les quatre comptes du banc et l'organisation.
create or replace function tests.b5_jeu() returns jsonb
language plpgsql as $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  r jsonb := jsonb_build_object('client', v_client);
  v_nom text; v_id uuid;
begin
  -- Les quatre comptes du banc (coordinateur, 05/10) : …c1 gérant, …c2 referent, …c3 daf, …c4 daf2 (valideurs).
  foreach v_nom in array array['gerant', 'referent', 'daf', 'daf2'] loop
    v_id := ('cccccccc-0000-4000-8000-0000000000c' || (array_position(array['gerant', 'referent', 'daf', 'daf2'], v_nom))::text)::uuid;
    if not exists (select 1 from auth.users u where u.id = v_id) then
      select u.id into v_id from auth.users u where u.email = v_nom || '@banc-varelo.test';
    end if;
    if v_id is null then
      raise exception 'tests.b5_jeu : compte % du banc introuvable dans auth.users', v_nom;
    end if;
    if not exists (select 1 from public.comptes c where c.user_id = v_id and c.client_id = v_client) then
      raise exception 'tests.b5_jeu : % n''a pas de compte chez le client du banc', v_nom;
    end if;
    r := r || jsonb_build_object(v_nom, v_id);
  end loop;
  r := r || jsonb_build_object('entite', (select e.id from public.entites e where e.client_id = v_client and e.principale));
  return r;
end $$;

-- Endosser un membre (JWT simulé, rôle authenticated : la RLS s'applique).
create or replace function tests.b5_endosser(p_user uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'aud', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('role', 'authenticated', true);
end $$;

-- L'ouvrier (clé de service) : les portes du lecteur et de la file.
create or replace function tests.b5_ouvrier() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'service_role', true);
  perform set_config('role', 'service_role', true);
end $$;

-- Revenir à postgres (hors RLS) pour lire ce que le socle a écrit.
create or replace function tests.b5_admin() returns void
language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
end $$;

-- Le lecteur de pièces, joué par les portes du contrat de l'ouvrier : une pièce déposée sur le projet par un
-- membre (lorani_deposer_piece), prise en lecture (commencer_lecture) puis lue (enregistrer_lecture) par la clé
-- de service, avec les valeurs qu'un vrai lecteur rendrait. Rend l'identifiant de la pièce.
-- p_valeurs : [{champ, valeur, texte}] ; chaque texte est recopié dans la page pour que la citation se retrouve.
create or replace function tests.b5_lire(p_membre uuid, p_projet uuid, p_nom text, p_type text, p_valeurs jsonb) returns uuid
language plpgsql as $$
declare
  v_piece uuid; v_page text; v jsonb; v_vals jsonb := '[]'::jsonb; e jsonb; i integer := 0;
begin
  perform tests.b5_endosser(p_membre);
  v_piece := public.lorani_deposer_piece(p_projet, p_nom, 'application/pdf', 24000, encode(sha256(p_nom::bytea), 'hex'),
                                         format('cccccccc-0000-4000-8000-00000000000c/lorani_projet/%s/%s', p_projet, p_nom));
  v_page := 'MAIRIE DE NANTES — SERVICE URBANISME' || E'\n';
  for e in select * from jsonb_array_elements(p_valeurs) loop
    i := i + 1;
    v_page := v_page || (e ->> 'texte') || E'\n';
    v_vals := v_vals || jsonb_build_object('champ', e ->> 'champ', 'valeur', e -> 'valeur', 'texte', e ->> 'texte', 'page', 1,
      'boite', jsonb_build_object('x', 0.1, 'y', 0.1 + i * 0.05, 'l', 0.4, 'h', 0.02),
      'source', 'ia', 'confiance', 0.97, 'verifiee', true, 'controle', 'citation retrouvée page 1');
  end loop;
  v := jsonb_build_object('statut', 'lue', 'type_piece', p_type, 'confiance_type', 0.98, 'methode', 'natif', 'nb_pages', 1,
    'pages', jsonb_build_array(jsonb_build_object('n', 1, 'methode', 'natif', 'texte', v_page, 'confiance', 0.99, 'largeur', 595, 'hauteur', 842)),
    'valeurs', v_vals);
  perform tests.b5_ouvrier();
  if not public.commencer_lecture(v_piece) then
    raise exception 'tests.b5_lire : commencer_lecture rend false pour la pièce %', v_piece;
  end if;
  perform public.enregistrer_lecture(v_piece, v, 'lecteur/2026-10-05/essai-b5');
  perform tests.b5_admin();
  return v_piece;
end $$;

-- Une date relative au jour du test, au format du lecteur (AAAA-MM-JJ) et au format d'un courrier (JJ/MM/AAAA).
create or replace function tests.b5_iso(p_jours integer) returns text
language sql immutable as $$ select to_char(current_date + p_jours, 'YYYY-MM-DD') $$;
create or replace function tests.b5_fr(p_jours integer) returns text
language sql immutable as $$ select to_char(current_date + p_jours, 'DD/MM/YYYY') $$;

-- ---------------------------------------------------------------------------
-- Le parcours.

create or replace function tests.test_b5_01_parcours_permis() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_gerant uuid; v_referent uuid; v_daf uuid; v_daf2 uuid; v_entite uuid;
  v_autre_client uuid := gen_random_uuid(); v_autre_user uuid := gen_random_uuid();
  v_projet uuid; v_lot1 uuid; v_pc uuid; v_dp uuid; v_piece uuid; v_prop uuid; v_delai uuid; v_recours uuid;
  v_calcul jsonb; r jsonb; n integer; v_texte text; v_date date; v_travail bigint;
  x public.lorani_permis;
  v_d integer; v_j_demande integer; v_j_depot integer;
begin
  -- La demande de pièces est datée pour que le rappel J-10 de l'échéance « pieces » (trois mois) tombe AUJOURD'HUI :
  -- c'est ainsi que la vraie chaîne des délais (controler_delais) se joue sans attendre. Le dépôt la précède de trois jours.
  v_j_demande := null;
  for v_d in reverse -70..-100 loop
    if (public.echeance_de('lorani.urbanisme.pieces_manquantes', current_date + v_d, 'metropole') ->> 'echeance')::date - 10 = current_date then
      v_j_demande := v_d;
      exit;
    end if;
  end loop;
  if v_j_demande is null then
    raise exception 'tests.b5 : aucune date de demande ne met le rappel J-10 à aujourd''hui (echeance_de pieces_manquantes)';
  end if;
  v_j_depot := v_j_demande - 3;
  jeu := tests.b5_jeu();
  v_client := (jeu ->> 'client')::uuid; v_gerant := (jeu ->> 'gerant')::uuid; v_referent := (jeu ->> 'referent')::uuid;
  v_daf := (jeu ->> 'daf')::uuid; v_daf2 := (jeu ->> 'daf2')::uuid; v_entite := (jeu ->> 'entite')::uuid;

  -- Un membre d'une autre organisation, pour l'isolement.
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
                          raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
                          confirmation_token, recovery_token, email_change_token_new, email_change, email_change_token_current,
                          phone_change, phone_change_token, reauthentication_token)
  values (v_autre_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b5-autre@essai.invalid', 'x',
          now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, false, '', '', '', '', '', '', '', '');
  insert into public.clients (id, nom) values (v_autre_client, 'Autre agence — essai B5');
  insert into public.comptes (user_id, client_id, role, perimetre_total) values (v_autre_user, v_autre_client, 'gerant', true);

  -- Les projets Lorani du banc sont restreints : l'accès se donne personne par personne (acces_objets).
  insert into public.objets_restreints (client_id, objet_type) values (v_client, 'lorani_projet') on conflict do nothing;

  -- ── 1. Le gérant ouvre le projet ──
  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_projets (client_id, nom, reference, adresse, code_postal, commune, code_insee, parcelles, nature, phase)
  values (v_client, '  Maison Lemoine ', 'B5-LEMOINE', '12 rue des Hauts-Pavés', '44000', 'Nantes', '44109', array['ab 123', 'AB  124'], 'logement_collectif', 'pc')
  returning id into v_projet;
  perform tests.b5_admin();
  return next is((select territoire from public.lorani_projets where id = v_projet), 'metropole', '1. territoire « metropole » déduit du code INSEE 44109');
  return next is((select entite_id from public.lorani_projets where id = v_projet), v_entite, '1. entité principale héritée');
  return next is((select nom from public.lorani_projets where id = v_projet), 'Maison Lemoine', '1. nom épuré');
  return next is((select parcelles from public.lorani_projets where id = v_projet), array['AB 123', 'AB 124'], '1. parcelles normalisées « AB 123 »');

  -- Le gérant ouvre le projet au chef de projet (écriture) et à l'assistant (lecture).
  insert into public.acces_objets (client_id, objet_type, objet_id, user_id, niveau)
  values (v_client, 'lorani_projet', v_projet::text, v_referent, 'ecriture'), (v_client, 'lorani_projet', v_projet::text, v_daf, 'lecture');

  -- ── 2. L'équipe, les lots, un intervenant ──
  perform tests.b5_endosser(v_gerant);
  insert into public.lorani_membres_projet (client_id, projet_id, user_id, role_projet) values (v_client, v_projet, v_referent, 'chef_projet'), (v_client, v_projet, v_daf, 'assistant');
  insert into public.lorani_lots (client_id, projet_id, numero, intitule, activites_requises) values (v_client, v_projet, '01', 'Gros œuvre', array['maconnerie']) returning id into v_lot1;
  insert into public.lorani_lots (client_id, projet_id, numero, intitule) values (v_client, v_projet, '02', 'Charpente');
  insert into public.lorani_intervenants (client_id, projet_id, nature, organisme, contact, email, lot_id)
  values (v_client, v_projet, 'bet_structure', 'BET Structures de Loire', 'Hélène Cadot', 'h.cadot@bet-loire.example', v_lot1);
  return next throws_ok(format('insert into public.lorani_lots (client_id, projet_id, numero, intitule) values (%L, %L, ''01'', ''Doublon'')', v_client, v_projet), '23505', null, '2. un numéro de lot ne se saisit qu''une fois par projet');
  perform tests.b5_admin();
  return next is(private.lorani_chef_de_projet(v_client, v_projet), v_referent, '2. le chef de projet est trouvé');
  return next is((select entite_id from public.lorani_intervenants where projet_id = v_projet), v_entite, '2. l''intervenant hérite de l''entité du projet');

  -- ── 3. Qui voit quoi ──
  perform tests.b5_endosser(v_daf2);
  return next is((select count(*) from public.lorani_projets where id = v_projet), 0::bigint, '3. le valideur hors projet (daf2) ne voit pas le projet');
  return next is((select count(*) from public.lorani_lots where projet_id = v_projet), 0::bigint, '3. … ni ses lots');
  perform tests.b5_endosser(v_autre_user);
  return next is((select count(*) from public.lorani_projets where id = v_projet), 0::bigint, '3. un gérant d''une autre organisation ne voit rien');
  perform tests.b5_endosser(v_daf);
  return next is((select count(*) from public.lorani_projets where id = v_projet), 1::bigint, '3. l''assistant (lecture) voit le projet');
  update public.lorani_projets set phase = 'pro' where id = v_projet;
  perform tests.b5_admin();
  return next is((select phase from public.lorani_projets where id = v_projet), 'pc', '3. … mais ne le modifie pas (la RLS ne lui donne aucune ligne à écrire)');
  perform tests.b5_endosser(v_referent);
  return next is((select count(*) from public.lorani_projets where id = v_projet), 1::bigint, '3. le chef de projet voit le projet');

  -- ── 4. Le permis, sans date de dépôt ──
  insert into public.lorani_permis (client_id, projet_id, type_autorisation, intitule) values (v_client, v_projet, 'pc', 'Résidence Lemoine — six logements') returning id into v_pc;
  perform tests.b5_admin();
  select * into x from public.lorani_permis where id = v_pc;
  return next is(x.etat, 'a_deposer', '4. permis saisi : état « a_deposer »');
  return next is(x.calcul #>> '{regime,silence}', 'tacite', '4. régime : le silence vaut accord');
  return next is(x.calcul #>> '{regime,regle_instruction}', 'lorani.urbanisme.instruction_pc', '4. règle d''instruction du PC (trois mois)');
  return next is((select count(*) from public.lorani_permis_echeances where permis_id = v_pc), 0::bigint, '4. aucune échéance avant le dépôt');

  -- ── 5. Le récépissé de dépôt, lu ──
  v_piece := tests.b5_lire(v_referent, v_projet, 'recepisse-depot.pdf', 'lorani_recepisse_depot', jsonb_build_array(
    jsonb_build_object('champ', 'date_depot', 'valeur', tests.b5_iso(v_j_depot), 'texte', 'Dossier déposé le ' || tests.b5_fr(v_j_depot)),
    jsonb_build_object('champ', 'numero_dossier', 'valeur', 'PC 044109 26 A0042', 'texte', 'N° PC 044109 26 A0042')));
  return next is((select statut from public.pieces where id = v_piece), 'lue', '5. la pièce est lue');
  return next is((select module from public.pieces where id = v_piece), 'lorani', '5. … dans le module lorani, sur le projet');
  return next ok(exists (select 1 from private.abonnements a where a.module = 'lorani' and a.evenement = 'piece_lue.lorani'), '5. lorani est abonné à piece_lue.lorani');
  r := private.lorani_lectures_passage();
  return next ok((r ->> 'pieces')::integer >= 1, '5. le passage des lectures a traité la pièce : ' || r::text);
  select id into v_prop from public.lorani_permis_dates_lues where piece_id = v_piece and nature = 'depot';
  return next ok(v_prop is not null, '5. une proposition « depot » est née de la lecture');
  return next is((select permis_id from public.lorani_permis_dates_lues where id = v_prop), v_pc, '5. … rattachée au seul permis du dossier');
  return next is((select proposition from public.lorani_permis_dates_lues where id = v_prop), jsonb_build_object('date_depot', tests.b5_iso(v_j_depot), 'numero', 'PC04410926A0042'), '5. … avec la date et le numéro normalisé');
  return next ok((select verifiee from public.lorani_permis_dates_lues where id = v_prop), '5. … citation retrouvée : vérifiée');
  return next ok(exists (select 1 from public.alertes where client_id = v_client and cle_regroupement = 'lorani:lecture:' || v_prop and acquittee_le is null), '5. alerte « date de dépôt lue, à confirmer » levée');

  -- ── 6. Le chef de projet confirme ──
  perform tests.b5_endosser(v_daf2);
  return next throws_ok(format('select public.lorani_confirmer_date_lue(%L)', v_prop), 'P0002', null, '6. hors projet, la proposition est introuvable');
  perform tests.b5_endosser(v_referent);
  r := public.lorani_confirmer_date_lue(v_prop);
  perform tests.b5_admin();
  select * into x from public.lorani_permis where id = v_pc;
  return next is(x.date_depot, current_date + v_j_depot, '6. date de dépôt posée');
  return next is(x.numero, 'PC04410926A0042', '6. numéro posé');
  return next is(x.etat, 'instruction', '6. le mois de complétude est passé sans demande connue : « instruction »');
  return next ok(x.date_decision_attendue > current_date, format('6. fin d''instruction calculée au %s (trois mois après le dépôt)', x.date_decision_attendue));
  return next is((select statut from public.lorani_permis_dates_lues where id = v_prop), 'confirmee', '6. proposition confirmée');
  return next ok(exists (select 1 from public.lorani_echeances_permis where permis_id = v_pc and nature = 'instruction' and statut = 'ouvert'), '6. échéance « instruction » posée dans delais');
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_client and action = 'lorani.date_permis_confirmee' and objet_id = v_pc::text), '6. journal : lorani.date_permis_confirmee');
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_client and action = 'lorani.echeances_recalculees' and objet_id = v_pc::text), '6. journal : lorani.echeances_recalculees');
  return next ok((select acquittee_le is not null from public.alertes where client_id = v_client and cle_regroupement = 'lorani:lecture:' || v_prop), '6. l''alerte de lecture est acquittée');

  -- ── 7. La demande de pièces, lue ──
  v_piece := tests.b5_lire(v_referent, v_projet, 'demande-pieces.pdf', 'lorani_demande_pieces', jsonb_build_array(
    jsonb_build_object('champ', 'date_lettre', 'valeur', tests.b5_iso(v_j_demande), 'texte', 'Nantes, le ' || tests.b5_fr(v_j_demande)),
    jsonb_build_object('champ', 'numero_dossier', 'valeur', 'PC 044109 26 A0042', 'texte', 'Dossier n° PC 044109 26 A0042'),
    jsonb_build_object('champ', 'pieces', 'valeur', 'PC5', 'texte', 'PC5 — plan des façades'),
    jsonb_build_object('champ', 'pieces', 'valeur', 'PC 8', 'texte', 'PC 8 — photographie du terrain')));
  r := private.lorani_lectures_passage();
  select id into v_prop from public.lorani_permis_dates_lues where piece_id = v_piece and nature = 'demande_pieces';
  return next ok(v_prop is not null, '7. une proposition « demande_pieces » est née');
  return next is((select proposition -> 'pieces' from public.lorani_permis_dates_lues where id = v_prop), '[{"code": "PC5"}, {"code": "PC8"}]'::jsonb, '7. … avec les deux pièces, dans l''ordre de la lettre');

  -- Le point du matin, pendant qu'une date lue attend : elle passe avant le reste.
  n := private.lorani_deposer_point(v_client, current_date);
  return next ok(n >= 2, format('7. point du matin : une section « Calendrier des permis » pour le gérant et le chef de projet (%s sections)', n));
  -- deposer_section écrit la section du module dans points_sections / points_items ; le point du matin les assemble plus tard.
  return next diag('7. sections lorani du jour : ' || coalesce((select string_agg(format('%s → %s', coalesce((select u.email from auth.users u where u.id = ps.destinataire), ps.destinataire::text), (select string_agg(left(i.texte, 90), ' | ') from public.points_items i where i.section_id = ps.id)), ' ;; ')
                                                              from public.points_sections ps where ps.client_id = v_client and ps.module = 'lorani' and ps.jour = current_date), 'aucune'));
  return next ok(exists (select 1 from public.points_sections ps join public.points_items i on i.section_id = ps.id
                         where ps.client_id = v_client and ps.module = 'lorani' and ps.jour = current_date and ps.destinataire = v_referent
                           and i.texte like '%une date lue sur les courriers de la mairie%'),
                 '7. … la ligne du chef de projet dit « une date lue sur les courriers de la mairie, à confirmer ou à écarter »');
  return next ok(not exists (select 1 from public.points_sections ps where ps.client_id = v_client and ps.module = 'lorani' and ps.jour = current_date and ps.destinataire = v_daf2),
                 '7. … et rien pour le valideur hors projet');

  -- ── 8. Confirmée ──
  perform tests.b5_endosser(v_referent);
  r := public.lorani_confirmer_date_lue(v_prop);
  perform tests.b5_admin();
  select * into x from public.lorani_permis where id = v_pc;
  return next is(x.etat, 'pieces_demandees', '8. état « pieces_demandees »');
  return next is(x.date_demande_pieces, current_date + v_j_demande, '8. date de la demande posée');
  return next is(x.pieces_demandees, '[{"code": "PC5"}, {"code": "PC8"}]'::jsonb, '8. pièces demandées gardées');
  return next ok(x.date_decision_attendue is null, '8. pas de fin d''instruction tant que les pièces manquent');
  select delai_id, echeance into v_delai, v_date from public.lorani_echeances_permis where permis_id = v_pc and nature = 'pieces';
  return next ok(v_delai is not null and v_date = current_date + 10, format('8. échéance « pieces » ouverte dans delais, le %s (dans dix jours)', v_date));
  return next is((select rappels from public.lorani_echeances_permis where permis_id = v_pc and nature = 'pieces'), array[10, 3, 0], '8. rappels à J-10, J-3, J');
  return next is((select responsable from public.lorani_echeances_permis where permis_id = v_pc and nature = 'pieces'), v_referent, '8. responsable : le chef de projet');
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_client and action = 'lorani.date_permis_confirmee' and objet_id = v_pc::text and donnees ->> 'nature' = 'demande_pieces'), '8. journal : demande de pièces confirmée');

  -- ── 9. Une lettre de délai mal lue est écartée ──
  v_piece := tests.b5_lire(v_referent, v_projet, 'lettre-delai.pdf', 'lorani_lettre_delai', jsonb_build_array(
    jsonb_build_object('champ', 'date_lettre', 'valeur', tests.b5_iso(v_j_demande + 2), 'texte', 'Nantes, le ' || tests.b5_fr(v_j_demande + 2)),
    jsonb_build_object('champ', 'delai_mois', 'valeur', '5', 'texte', 'délai d''instruction porté à 5 mois')));
  r := private.lorani_lectures_passage();
  select id into v_prop from public.lorani_permis_dates_lues where piece_id = v_piece and nature = 'delai_notifie';
  return next ok(v_prop is not null, '9. une proposition « delai_notifie » est née');
  perform tests.b5_endosser(v_referent);
  return next throws_ok(format('select public.lorani_ecarter_date_lue(%L, ''  '')', v_prop), '22023', null, '9. écarter sans motif est refusé');
  perform public.lorani_ecarter_date_lue(v_prop, 'La lettre vise un autre dossier de la rue : délai sans objet ici.');
  return next throws_ok(format('select public.lorani_confirmer_date_lue(%L)', v_prop), '55000', null, '9. une proposition écartée ne se confirme plus');
  perform tests.b5_admin();
  return next is((select statut from public.lorani_permis_dates_lues where id = v_prop), 'ecartee', '9. proposition écartée');
  return next is((select decide_par from public.lorani_permis_dates_lues where id = v_prop), v_referent, '9. … par le chef de projet');
  return next ok((select delai_notifie_mois is null from public.lorani_permis where id = v_pc), '9. le permis ne porte pas le délai écarté');
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_client and action = 'lorani.date_lue_ecartee' and objet_id = v_prop::text), '9. journal : lorani.date_lue_ecartee');

  -- ── 10. Le rappel J-10 des pièces : le contrôle des délais le publie, le passage du calendrier l'alerte et l'envoie ──
  n := private.controler_delais(now());
  select id into v_travail from public.travaux
   where genre = 'lorani.calendrier.rappel' and client_id = v_client and (charge ->> 'delai')::uuid = v_delai and etat = 'a_faire';
  return next ok(v_travail is not null, format('10. controler_delais publie delai.proche.lorani → travail lorani.calendrier.rappel (%s événements)', n));
  return next is((select (charge ->> 'rappel')::integer from public.travaux where id = v_travail), 10, '10. … pour le rappel J-10');
  return next is((select rappels_faits from public.delais where id = v_delai), array[10], '10. … et le marque fait sur le délai');
  r := private.lorani_calendrier_passage();
  return next ok((r ->> 'evenements')::integer >= 1, '10. le passage du calendrier a pris le rappel : ' || r::text);
  return next is((select etat from public.travaux where id = v_travail), 'fait', '10. travail clos');
  select titre into v_texte from public.alertes where client_id = v_client and cle_regroupement = format('lorani:permis:%s:pieces:rappel:10', v_pc);
  return next ok(v_texte is not null, '10. alerte de rappel levée au chef de projet');
  return next ok(v_texte like 'PC « Maison Lemoine » : pièces manquantes à faire recevoir par la mairie au plus tard le ' || to_char(v_date, 'DD/MM/YYYY') || ' (dans 10 jours)%', '10. … qui dit la date butoir : ' || coalesce(v_texte, ''));
  return next is((select niveau from public.alertes where client_id = v_client and cle_regroupement = format('lorani:permis:%s:pieces:rappel:10', v_pc)), 'attention', '10. … niveau « attention » à J-10');
  return next is((select destinataire_id from public.alertes where client_id = v_client and cle_regroupement = format('lorani:permis:%s:pieces:rappel:10', v_pc)), v_referent, '10. … adressée au chef de projet');
  -- b5_03 : le rappel part au chef de projet par courriel, par la file des envois.
  return next ok(exists (select 1 from public.envois e where e.client_id = v_client and e.cle_idempotence = format('lorani:permis:%s:pieces:rappel:10', v_pc)
                         and e.module = 'lorani' and e.canal = 'email' and e.statut <> 'bloque'),
                 '10. un envoi « rappel » est préparé au chef de projet (b5_03) : ' || coalesce((select e.statut || ' → ' || coalesce(e.destinataire_adresse, 'sans adresse') from public.envois e where e.client_id = v_client and e.cle_idempotence = format('lorani:permis:%s:pieces:rappel:10', v_pc)), 'aucun'));
  return next ok(exists (select 1 from public.envois e where e.client_id = v_client and e.cle_idempotence = format('lorani:permis:%s:pieces:rappel:10', v_pc)
                         and e.sujet like 'Omega — PC « Maison Lemoine » : pièces manquantes%' and e.corps like '%PC5, PC8%' and e.corps like '%/espace/lorani?permis=' || v_pc::text || '%'),
                 '10. … qui nomme les pièces et mène au dossier');
  return next ok(not exists (select 1 from public.alertes where client_id = v_client and interne and cle_regroupement like 'lorani:envoi_rappel:%'), '10. … sans alerte interne d''échec');

  -- La mesure du jour : un permis en cours, dates complètes.
  n := private.lorani_enregistrer_mesures(v_client, current_date, true);
  return next ok(exists (select 1 from public.mesures m where m.client_id = v_client and m.indicateur = 'lorani.calendrier.dates_completes' and m.debut = current_date), '10. mesure lorani.calendrier.dates_completes enregistrée');

  -- ── 11. Les pièces reçues par la mairie ──
  perform tests.b5_endosser(v_referent);
  update public.lorani_permis set date_pieces_fournies = current_date - 5 where id = v_pc;
  perform tests.b5_admin();
  select * into x from public.lorani_permis where id = v_pc;
  return next is(x.etat, 'instruction', '11. l''instruction repart des pièces reçues');
  return next ok(x.date_decision_attendue > current_date + 30, format('11. décision attendue le %s (trois mois après les pièces)', x.date_decision_attendue));
  return next is((select statut from public.delais where id = v_delai), 'tenu', '11. l''échéance « pieces » est close « tenu »');
  return next ok((select acquittee_le is not null from public.alertes where client_id = v_client and cle_regroupement = format('lorani:permis:%s:pieces:rappel:10', v_pc)), '11. le rappel est acquitté');
  return next ok(exists (select 1 from public.lorani_echeances_permis where permis_id = v_pc and nature = 'instruction' and statut = 'ouvert' and echeance = x.date_decision_attendue), '11. échéance « instruction » recalculée sur les pièces reçues');

  -- ── 12. Garde-fou : une décision implicite ne se saisit pas à la main ──
  perform tests.b5_endosser(v_referent);
  return next throws_ok(format('update public.lorani_permis set decision = ''tacite'', date_decision = current_date where id = %L', v_pc), '42501', null, '12. decision = tacite à la main : refusé (42501)');
  return next throws_ok(format('select public.lorani_confirmer_decision_implicite(%L)', v_pc), '55000', null, '12. rien à confirmer : le délai court encore');

  -- ── 13. La déclaration préalable, déposée il y a longtemps ──
  insert into public.lorani_permis (client_id, projet_id, type_autorisation, intitule, numero, date_depot)
  values (v_client, v_projet, 'dp', 'Clôture Martin', 'DP 044109 26 N0107', current_date - 200) returning id into v_dp;
  perform tests.b5_admin();
  select * into x from public.lorani_permis where id = v_dp;
  return next is(x.etat, 'decision_a_confirmer', '13. DP sans courrier depuis 200 jours : « decision_a_confirmer »');
  return next is(x.calcul #>> '{decision_implicite,nature}', 'tacite', '13. non-opposition tacite née');
  return next is((x.calcul #>> '{decision_implicite,date}')::date, x.date_decision_attendue + 1, '13. … le lendemain de la fin du délai');
  v_date := x.date_decision_attendue + 1;

  -- ── 14. Confirmée ──
  perform tests.b5_endosser(v_daf);
  return next throws_ok(format('select public.lorani_confirmer_decision_implicite(%L)', v_dp), 'P0002', null, '14. l''assistant (lecture seule) ne confirme pas');
  perform tests.b5_endosser(v_referent);
  v_calcul := public.lorani_confirmer_decision_implicite(v_dp);
  return next throws_ok(format('select public.lorani_confirmer_decision_implicite(%L)', v_dp), '55000', null, '14. … et pas deux fois');
  perform tests.b5_admin();
  select * into x from public.lorani_permis where id = v_dp;
  return next is(x.decision, 'tacite', '14. décision « tacite »');
  return next is(x.date_decision, v_date, '14. datée par le moteur, le lendemain de la fin du délai');
  return next is(x.etat, 'accorde', '14. état « accorde »');
  return next ok(exists (select 1 from public.lorani_echeances_permis where permis_id = v_dp and nature = 'affichage' and statut in ('ouvert', 'depasse')), '14. échéance « affichage » (relance à quinze jours)');
  return next ok(exists (select 1 from public.lorani_echeances_permis where permis_id = v_dp and nature = 'retrait'), '14. échéance « retrait » (trois mois)');
  return next ok(x.date_purge is null, '14. pas de purge tant que l''affichage n''est pas saisi');
  return next ok(exists (select 1 from public.journal_opposable where client_id = v_client and action = 'lorani.decision_implicite_confirmee' and objet_id = v_dp::text), '14. journal : lorani.decision_implicite_confirmee');

  -- ── 15. Garde-fou : pas de recours contre un permis non accordé ──
  perform tests.b5_endosser(v_referent);
  return next throws_ok(format('insert into public.lorani_permis_recours (client_id, permis_id, nature, date_recours, auteur) values (%L, %L, ''gracieux'', current_date, ''Voisin'')', v_client, v_pc), '22023', null, '15. un recours contre le PC en instruction est refusé');
  return next throws_ok(format('insert into public.lorani_permis_recours (client_id, permis_id, nature, date_recours, auteur) values (%L, %L, ''gracieux'', current_date - 190, ''Voisin'')', v_client, v_dp), '22023', null, '15. un recours antérieur à la décision est refusé');
  perform tests.b5_admin();

  -- ── 16. Le constat d'affichage, lu puis confirmé ──
  v_piece := tests.b5_lire(v_referent, v_projet, 'constat-affichage.pdf', 'lorani_constat_affichage', jsonb_build_array(
    jsonb_build_object('champ', 'date_constat', 'valeur', tests.b5_iso(-165), 'texte', 'Constat dressé le ' || tests.b5_fr(-165)),
    jsonb_build_object('champ', 'numero_dossier', 'valeur', 'DP 044109 26 N0107', 'texte', 'Dossier DP 044109 26 N0107'),
    jsonb_build_object('champ', 'passage', 'valeur', '1', 'texte', 'Premier passage')));
  r := private.lorani_lectures_passage();
  select id into v_prop from public.lorani_permis_dates_lues where piece_id = v_piece and nature = 'affichage';
  return next ok(v_prop is not null, '16. une proposition « affichage » est née');
  return next is((select permis_id from public.lorani_permis_dates_lues where id = v_prop), v_dp, '16. … rattachée à la DP par son numéro (deux permis dans le dossier)');
  perform tests.b5_endosser(v_referent);
  r := public.lorani_confirmer_date_lue(v_prop);
  perform tests.b5_admin();
  select * into x from public.lorani_permis where id = v_dp;
  return next is(x.date_affichage, current_date - 165, '16. premier jour d''affichage posé');
  return next ok(exists (select 1 from public.lorani_echeances_permis where permis_id = v_dp and nature = 'recours'), '16. échéance « recours des tiers » (deux mois après l''affichage)');
  return next ok(x.date_purge is not null and x.date_purge < current_date, format('16. purge calculée (%s), déjà acquise', x.date_purge));
  return next is(x.etat, 'purge', '16. état « purge »');

  -- ── 17. Un recours contentieux, puis son rejet ──
  perform tests.b5_endosser(v_referent);
  insert into public.lorani_permis_recours (client_id, permis_id, nature, date_recours, auteur) values (v_client, v_dp, 'contentieux', current_date - 150, 'M. Martin, voisin') returning id into v_recours;
  perform tests.b5_admin();
  select * into x from public.lorani_permis where id = v_dp;
  return next is(x.etat, 'recours_en_cours', '17. recours en cours : plus de purge');
  return next ok(x.date_purge is null, '17. … la date de purge est retirée');
  return next ok(x.calcul -> 'avertissements' @> to_jsonb(array['Un recours est en cours : pas de purge avant son issue, à saisir ici.']), '17. … et le calcul le dit');
  perform tests.b5_endosser(v_referent);
  update public.lorani_permis_recours set issue = 'rejete', date_issue = current_date - 20 where id = v_recours;
  perform tests.b5_admin();
  select * into x from public.lorani_permis where id = v_dp;
  return next is(x.date_purge, current_date - 20, '17. recours rejeté le J-20 : la purge est reportée à cette date');
  return next is(x.etat, 'purge', '17. état « purge »');
  return next is((x.calcul ->> 'chantier_sans_risque_le')::date, current_date - 19, '17. chantier sans risque dès le lendemain');

  -- ── 18. Le passage quotidien ──
  update public.lorani_permis set calcule_le = now() - interval '2 days' where id in (v_pc, v_dp);
  r := private.lorani_calendrier_passage();
  return next ok((r ->> 'recalculs')::integer >= 1, '18. le passage quotidien recalcule les permis en cours : ' || r::text);
  return next ok((r ->> 'erreurs')::integer = 0, '18. … sans erreur');
  return next is((select etat from public.lorani_permis where id = v_pc), 'instruction', '18. le PC reste en instruction');
  return next ok(exists (select 1 from public.lorani_echeances_permis where permis_id = v_dp and nature = 'purge'), '18. la DP porte son échéance « purge »');
  return next ok(not exists (select 1 from public.lorani_echeances_permis where permis_id = v_dp and nature in ('affichage', 'retrait', 'recours') and statut = 'ouvert'), '18. ses échéances passées sont closes');

  -- ── 19. Le calcul pur, celui que l'écran appelle ──
  perform tests.b5_endosser(v_daf);
  v_calcul := public.lorani_calendrier_permis(jsonb_build_object('type_autorisation', 'pcmi', 'territoire', 'metropole', 'date_depot', tests.b5_iso(-10)), current_date);
  perform tests.b5_admin();
  return next is(v_calcul ->> 'etat', 'completude', '19. lorani_calendrier_permis : un PCMI déposé il y a dix jours est en complétude');
  return next is(jsonb_array_length(v_calcul -> 'etapes'), 3, '19. … trois étapes : dépôt, complétude, instruction');

  -- ── 20. Le journal ──
  return next ok((select count(distinct action) from public.journal_opposable where client_id = v_client and action in
                  ('lorani.date_permis_confirmee', 'lorani.echeances_recalculees', 'lorani.date_lue_ecartee', 'lorani.decision_implicite_confirmee')) = 4,
                 '20. les quatre actions du module sont au journal opposable');
  perform tests.b5_endosser(v_referent);
  return next throws_ok(format('insert into public.journal_opposable (client_id, action, acteur_type, objet_type, objet_id, donnees) values (%L, ''lorani.essai'', ''utilisateur'', ''lorani_permis'', %L, ''{}'')', v_client, v_pc), null, null, '20. nul n''écrit le journal à la main');
  perform tests.b5_admin();
end $f$;

select * from runtests('tests'::name, '^test_b5_01_');
