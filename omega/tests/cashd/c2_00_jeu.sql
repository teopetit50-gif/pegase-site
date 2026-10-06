-- c2_00 — Le jeu d'essai CASHD sur le banc (session C2, 06/10/2026).
-- À jouer sur la RECETTE après omega/tests/socle/00_installation.sql d'A5 (pgTAP, schéma tests, tests.endosser /
-- tests.redevenir_admin / tests.endosser_serveur). Rien ici n'écrit dans les tables : des fonctions d'aide seulement.
-- Les tests c2_NN écrivent sur le client du BANC (cccccccc-0000-4000-8000-00000000000c) et sont annulés par runtests().
--
-- L'histoire : le banc joue « Atelier Bertin » (menuiserie, Lyon), qui facture ses clients professionnels et confie à
-- CASHD la relance de ses impayés. Trois clients : la SCI Lefèvre Patrimoine (deux factures, dont une échue depuis
-- 45 jours), Hôtel des Brotteaux (une facture échue depuis 100 jours et un avoir), Mairie de Caluire (non échue).

create extension if not exists pgtap with schema extensions;
create schema if not exists tests;

create or replace function tests.c2_banc() returns jsonb
language plpgsql stable as $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_gerant uuid; v_referent uuid; v_daf uuid; v_daf2 uuid; v_entite uuid;
begin
  select u.id into v_gerant from auth.users u where u.email = 'gerant@banc-varelo.test';
  select u.id into v_referent from auth.users u where u.email = 'referent@banc-varelo.test';
  select u.id into v_daf from auth.users u where u.email = 'daf@banc-varelo.test';
  select u.id into v_daf2 from auth.users u where u.email = 'daf2@banc-varelo.test';
  v_gerant := coalesce(v_gerant, (select c.user_id from public.comptes c where c.client_id = v_client and c.user_id = 'cccccccc-0000-4000-8000-0000000000c1'));
  v_referent := coalesce(v_referent, (select c.user_id from public.comptes c where c.client_id = v_client and c.user_id = 'cccccccc-0000-4000-8000-0000000000c2'));
  v_daf := coalesce(v_daf, (select c.user_id from public.comptes c where c.client_id = v_client and c.user_id = 'cccccccc-0000-4000-8000-0000000000c3'));
  v_daf2 := coalesce(v_daf2, (select c.user_id from public.comptes c where c.client_id = v_client and c.user_id = 'cccccccc-0000-4000-8000-0000000000c4'));
  if v_gerant is null then
    select c.user_id into v_gerant from public.comptes c where c.client_id = v_client and c.role = 'gerant' order by c.user_id limit 1;
  end if;
  select e.id into v_entite from public.entites e where e.client_id = v_client and e.principale;
  return jsonb_build_object('client', v_client, 'gerant', v_gerant, 'referent', v_referent, 'daf', v_daf, 'daf2', v_daf2, 'entite', v_entite);
end $$;

-- Le jour J à Paris (celui des vues de CASHD).
create or replace function tests.c2_jour() returns date language sql stable as $$ select (now() at time zone 'Europe/Paris')::date $$;

-- Un utilisateur d'essai (auth.users + compte) chez un client, pour les garde-fous.
create or replace function tests.c2_compte(p_client uuid, p_role text, p_email text) returns uuid
language plpgsql as $$
declare v_id uuid := gen_random_uuid();
begin
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,
                            raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous,
                            confirmation_token, recovery_token, email_change_token_new, email_change,
                            email_change_token_current, phone_change, phone_change_token, reauthentication_token)
    values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, '', now(), now(), now(),
            '{"provider":"email","providers":["email"]}', '{}', false, false, '', '', '', '', '', '', '', '');
  exception when others then
    begin
      insert into auth.users (id, email) values (v_id, p_email);
    exception when others then
      raise notice 'tests.c2_compte : auth.users non alimentée (%)', sqlerrm;
    end;
  end;
  insert into public.comptes (user_id, client_id, role, perimetre_total) values (v_id, p_client, p_role, true);
  return v_id;
end $$;

-- Une organisation étrangère au banc, avec son gérant (isolement).
create or replace function tests.c2_autre_client() returns jsonb
language plpgsql as $$
declare v_client uuid; v_gerant uuid;
begin
  insert into public.clients (nom) values ('Organisation étrangère (test C2)') returning id into v_client;
  if not exists (select 1 from public.entites e where e.client_id = v_client and e.principale) then
    insert into public.entites (client_id, nom, principale) values (v_client, 'Siège étranger', true);
  end if;
  v_gerant := tests.c2_compte(v_client, 'gerant', 'c2-etranger-' || left(v_client::text, 8) || '@banc-varelo.test');
  return jsonb_build_object('client', v_client, 'gerant', v_gerant);
end $$;

-- La dernière ligne du journal d'une action (et d'un objet).
create or replace function tests.c2_journal(p_client uuid, p_action text, p_objet_id text default null) returns jsonb
language sql stable as $$
  select to_jsonb(j) from public.journal_opposable j
  where j.client_id = p_client and j.action = p_action and (p_objet_id is null or j.objet_id = p_objet_id)
  order by j.id desc limit 1
$$;

-- Les trois clients d'Atelier Bertin et leurs pièces, saisis par les portes (à appeler sous le gérant, CASHD installé).
-- Rend les identifiants utiles.
create or replace function tests.c2_portefeuille() returns jsonb
language plpgsql as $$
declare
  j date := tests.c2_jour();
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_sci uuid; v_hotel uuid; v_mairie uuid; f1 uuid; f2 uuid; f3 uuid; f4 uuid; a1 uuid; d1 uuid;
begin
  v_sci := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-LEFEVRE', 'nom', 'SCI Lefèvre Patrimoine',
    'siren', '552100554', 'contact_facturation_nom', 'Mme Lefèvre', 'contact_facturation_email', 'compta@lefevre-patrimoine.test',
    'plafond_encours', 20000));
  v_hotel := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-BROTTEAUX', 'nom', 'Hôtel des Brotteaux',
    'contact_facturation_email', 'factures@hotel-brotteaux.test', 'groupe', 'Groupe Brotteaux'));
  v_mairie := public.cashd_ecrire_compte(null, v_client, jsonb_build_object('reference', 'C-CALUIRE', 'nom', 'Mairie de Caluire',
    'contact_facturation_email', 'mandatement@caluire.test', 'delai_paiement_jours', 30));
  -- SCI : F-2026-101 de 12 000 € échue depuis 45 jours ; F-2026-140 de 6 000 € non échue.
  f1 := public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_sci, 'numero', 'F-2026-101', 'date_emission', j - 75,
    'echeance', j - 45, 'montant_ht', 10000, 'montant_ttc', 12000));
  f2 := public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_sci, 'numero', 'F-2026-140', 'date_emission', j - 10,
    'montant_ht', 5000, 'montant_ttc', 6000));
  -- Hôtel : F-2026-050 de 3 600 € échue depuis 100 jours ; un avoir A-2026-007 de 600 €.
  f3 := public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_hotel, 'numero', 'F-2026-050', 'date_emission', j - 130,
    'echeance', j - 100, 'montant_ttc', 3600));
  a1 := public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_hotel, 'nature', 'avoir', 'numero', 'A-2026-007',
    'date_emission', j - 20, 'montant_ttc', 600));
  -- Mairie : F-2026-150 de 2 400 € émise hier (échéance à 30 jours).
  f4 := public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_reference', 'C-CALUIRE', 'numero', 'F-2026-150',
    'date_emission', j - 1, 'montant_ttc', 2400));
  -- Un devis envoyé il y a 5 jours à la SCI.
  d1 := public.cashd_ecrire_facture(null, v_client, jsonb_build_object('compte_id', v_sci, 'nature', 'devis', 'numero', 'D-2026-033',
    'date_emission', j - 5, 'montant_ttc', 8400));
  return jsonb_build_object('sci', v_sci, 'hotel', v_hotel, 'mairie', v_mairie, 'f1', f1, 'f2', f2, 'f3', f3, 'f4', f4, 'a1', a1, 'd1', d1);
end $$;

select 'c2_00 : fonctions d''aide posées' as resultat;

-- Dépose un export par les portes du socle, comme le ferait le lecteur d'exports d'A1 : recevoir_releve, puis
-- commencer_releve, deposer_lignes, terminer_lecture. p_lignes : tableau d'objets aux clés du modèle cashd/tableur.
-- À appeler en admin. Rend l'identifiant du relevé.
create or replace function tests.c2_deposer_export(p_branchement uuid, p_jeu text, p_lignes jsonb, p_variante text default '1')
returns uuid language plpgsql as $$
declare
  v_client uuid := (select b.client_id from public.branchements b where b.id = p_branchement);
  v_cle text[];
  v_recu jsonb;
  i jsonb;
  e jsonb;
  n integer := 0;
  v_lignes jsonb := '[]'::jsonb;
begin
  select j.cle into v_cle from public.branchements_jeux j where j.branchement_id = p_branchement and j.code = p_jeu;
  for e in select x.value from jsonb_array_elements(p_lignes) x loop
    n := n + 1;
    v_lignes := v_lignes || jsonb_build_object('n', n, 'ligne', n + 1,
      'cle', (select string_agg(coalesce(e ->> c, ''), '|' order by o) from unnest(v_cle) with ordinality u(c, o)),
      'valeurs', e, 'anomalies', null, 'empreinte', encode(sha256(convert_to(e::text, 'UTF8')), 'hex'));
  end loop;
  v_recu := public.recevoir_releve(p_branchement, jsonb_build_array(jsonb_build_object(
      'nom_fichier', p_jeu || '_' || p_variante || '.csv', 'mime', 'text/csv', 'octets', 1000,
      'sha256', encode(sha256(convert_to('c2:' || p_jeu || ':' || p_variante || ':' || clock_timestamp()::text, 'UTF8')), 'hex'),
      'chemin', v_client::text || '/branchement/' || p_branchement::text || '/' || p_jeu || '_' || p_variante || '.csv',
      'jeu', p_jeu)), 'depot', null, 'tests-c2@banc-varelo.test');
  for i in select x.value from jsonb_array_elements(v_recu -> 'instantanes') x loop
    perform public.commencer_releve((i ->> 'instantane')::uuid);
    perform public.deposer_lignes((i ->> 'instantane')::uuid, v_lignes);
    perform public.terminer_lecture((i ->> 'instantane')::uuid, jsonb_build_object('statut', 'lu', 'jeu', p_jeu, 'lignes', jsonb_array_length(v_lignes)), 'tests/c2/tableur');
  end loop;
  return (v_recu ->> 'releve')::uuid;
end $$;

-- Fait avancer la file des relevés puis traite les travaux de CASHD, comme les crons du socle et cashd-releves.
create or replace function tests.c2_traiter() returns jsonb language plpgsql as $$
declare r jsonb; k integer; n_faits integer := 0; n_echecs integer := 0;
begin
  perform private.avancer_releves();
  for k in 1..3 loop
    r := private.cashd_traiter_travaux(20);
    n_faits := n_faits + (r ->> 'faits')::integer;
    n_echecs := n_echecs + (r ->> 'echecs')::integer;
    exit when (r ->> 'faits')::integer = 0 and (r ->> 'echecs')::integer = 0;
  end loop;
  return jsonb_build_object('faits', n_faits, 'echecs', n_echecs);
end $$;

select 'c2_00 : dépôt d''export posé' as resultat;
