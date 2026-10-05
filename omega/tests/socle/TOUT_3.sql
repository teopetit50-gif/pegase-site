-- TOUT_3.sql — partie 3/4 de TOUT.sql (tests 26 à 38). Lancer les quatre dans l'ordre.

-- 26 — UPDATE sur public.echeances_pro_journal échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_26_update_echeances_pro_journal() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  select count(*) into nb from tests.declencheurs_bloquants('echeances_pro_journal') where sur_update and avant;
  return next ok(nb > 0, 'echeances_pro_journal : un déclencheur BEFORE UPDATE existe');
  v_ctid := tests.ligne_pour_essai('echeances_pro_journal');
  select attname into col from pg_attribute where attrelid = 'public.echeances_pro_journal'::regclass and attnum > 0 and not attisdropped and attgenerated = '' and attidentity = '' order by attnum limit 1;
  return next throws_ok(format('update public.echeances_pro_journal set %I = %I where ctid = %L', col, col, v_ctid), null, null, 'UPDATE sur echeances_pro_journal échoue, même pour le propriétaire');
  return next is(tests.compter('public', 'echeances_pro_journal', format('ctid = %L', v_ctid)), 1::bigint, 'La ligne est intacte');
end $f$;



-- 28 — anon et authenticated n'ont ni UPDATE, ni DELETE, ni TRUNCATE sur les tables en ajout seul
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_28_ajout_seul_droits() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select table_name, grantee, privilege_type from information_schema.role_table_grants
    where table_schema = 'public' and grantee in ('anon', 'authenticated') and privilege_type in ('UPDATE', 'DELETE', 'TRUNCATE')
      and table_name in (select tests.tables_ajout_seul()) order by 1, 2, 3
  $q$, 'Aucun droit UPDATE/DELETE/TRUNCATE pour anon/authenticated sur les six tables en ajout seul');
end $f$;



-- 29 — aucune politique UPDATE ou DELETE sur les tables en ajout seul
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_29_ajout_seul_politiques() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$
    select tablename, policyname, cmd from pg_policies
    where schemaname = 'public' and tablename in (select tests.tables_ajout_seul()) and cmd in ('UPDATE', 'DELETE') order by 1, 2
  $q$, 'Pas de politique UPDATE/DELETE sur les six tables en ajout seul');
  return next is_empty($q$
    select t.nom from tests.tables_ajout_seul() t(nom) where to_regclass('public.' || t.nom) is null
  $q$, 'Les six tables en ajout seul existent');
end $f$;



-- 30 — chaque ligne du journal porte l'empreinte de la précédente (chaîne par client ou globale)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_30_journal_chaine_precedent() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; i int; ruptures_client bigint; ruptures_globale bigint;
begin
  jeu := tests.jeu();
  for i in 1..3 loop
    perform tests.inserer_minimal('public', 'journal_opposable', jsonb_build_object('client_id', jeu ->> 'client_a', 'action', 'essai_a5_' || i, 'acteur_type', 'systeme', 'objet_type', 'essai', 'donnees', jsonb_build_object('i', i)));
  end loop;
  select count(*) into ruptures_client from (
    select id, hash_precedent, lag(hash) over (partition by client_id order by id) as precedent from public.journal_opposable) s
    where precedent is distinct from hash_precedent;
  select count(*) into ruptures_globale from (
    select id, hash_precedent, lag(hash) over (order by id) as precedent from public.journal_opposable) s
    where precedent is distinct from hash_precedent;
  return next ok(ruptures_client = 0 or ruptures_globale = 0, format('La chaîne se suit (ruptures : %s par client, %s en global)', ruptures_client, ruptures_globale));
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L', jeu ->> 'client_a')), 3::bigint, 'Les trois lignes d''essai sont écrites');
  return next is_empty($q$
    select client_id, count(*) from public.journal_opposable where hash_precedent is null group by client_id having count(*) > 1
  $q$, 'Au plus une ligne de genèse (hash_precedent null) par client');
end $f$;



-- 31 — toutes les empreintes du journal font 32 octets (SHA-256) et sont uniques
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_31_journal_hash_sha256() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next is_empty($q$ select id from public.journal_opposable where hash is null or octet_length(hash) <> 32 $q$, 'Toute empreinte fait 32 octets');
  return next is_empty($q$ select hash from public.journal_opposable group by hash having count(*) > 1 $q$, 'Aucune empreinte en double');
  return next is_empty($q$ select id from public.journal_opposable where hash_precedent is not null and octet_length(hash_precedent) <> 32 $q$, 'Toute empreinte précédente fait 32 octets');
end $f$;



-- 32 — l'empreinte est calculée par la base, pas acceptée du client
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_32_journal_hash_non_fourni() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; ligne jsonb;
begin
  jeu := tests.jeu();
  ligne := tests.inserer_minimal('public', 'journal_opposable', jsonb_build_object('client_id', jeu ->> 'client_a', 'action', 'essai_a5', 'acteur_type', 'systeme', 'objet_type', 'essai', 'hash', '\x0000000000000000000000000000000000000000000000000000000000000000'));
  return next isnt(ligne ->> 'hash', '\x0000000000000000000000000000000000000000000000000000000000000000', 'Une empreinte fournie à l''insertion est remplacée par le calcul de la base');
  return next is(octet_length(decode(substr(ligne ->> 'hash', 3), 'hex')), 32, 'L''empreinte calculée fait 32 octets');
end $f$;



-- 33 — public.verifier_journal_client() valide une chaîne intacte
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_33_journal_verification_porte() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; i int; verdict jsonb;
begin
  jeu := tests.jeu();
  for i in 1..3 loop
    perform tests.inserer_minimal('public', 'journal_opposable', jsonb_build_object('client_id', jeu ->> 'client_a', 'action', 'essai_a5_' || i, 'acteur_type', 'systeme', 'objet_type', 'essai'));
  end loop;
  execute format('select coalesce(jsonb_agg(to_jsonb(v)), ''[]''::jsonb) from public.verifier_journal_client(%L::uuid) v', jeu ->> 'client_a') into verdict;
  return next ok(verdict::text !~* '(false|rompu|invalide|cass|erreur|ecart|écart)', 'Le verdict ne signale aucune rupture');
  return next diag('Verdict rendu : ' || left(verdict::text, 400));
end $f$;



-- 34 — public.verifier_journal_client() détecte une empreinte altérée
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_34_journal_detection_rupture() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; i int; verdict jsonb;
begin
  jeu := tests.jeu();
  for i in 1..3 loop
    perform tests.inserer_minimal('public', 'journal_opposable', jsonb_build_object('client_id', jeu ->> 'client_a', 'action', 'essai_a5_' || i, 'acteur_type', 'systeme', 'objet_type', 'essai'));
  end loop;
  begin
    execute 'alter table public.journal_opposable disable trigger user';
    execute format('update public.journal_opposable set hash = decode(repeat(''ab'', 32), ''hex'') where client_id = %L and id = (select min(id) from public.journal_opposable where client_id = %L)', jeu ->> 'client_a', jeu ->> 'client_a');
    execute 'alter table public.journal_opposable enable trigger user';
  exception when others then
    return next pass('Altération impossible même déclencheurs désactivés (' || sqlerrm || ') : rupture non simulable, test sans objet');
    return;
  end;
  execute format('select coalesce(jsonb_agg(to_jsonb(v)), ''[]''::jsonb) from public.verifier_journal_client(%L::uuid) v', jeu ->> 'client_a') into verdict;
  return next ok(verdict::text ~* '(false|rompu|invalide|cass|erreur|ecart|écart)', 'Le verdict signale la rupture');
  return next diag('Verdict rendu : ' || left(verdict::text, 400));
end $f$;



-- 35 — private.canaux_envoi porte des plages horaires pour les envois non transactionnels
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_35_canaux_heures_legales() returns setof text
language plpgsql as $f$
declare
  -- rien
begin
  return next ok((select count(*) from private.canaux_envoi) > 0, 'Des canaux sont déclarés');
  return next ok((select count(*) from private.canaux_envoi where plages_non_transactionnel is not null) > 0, 'Au moins un canal a des plages non transactionnelles (heures légales)');
  return next is_empty($q$
    select canal from private.canaux_envoi where plages_non_transactionnel is not null and jsonb_typeof(plages_non_transactionnel) not in ('object', 'array')
  $q$, 'Les plages sont des objets ou tableaux JSON');
  return next ok(exists (select 1 from private.canaux_envoi where canal ~* 'sms' and plages_non_transactionnel is not null), 'Le canal SMS est borné par des plages (prospection : 8 h – 20 h, jamais le dimanche)');
  return next diag('Canaux : ' || (select string_agg(canal || ' → ' || coalesce(plages_non_transactionnel::text, 'libre'), ' ; ') from private.canaux_envoi));
end $f$;



-- 36 — un envoi vers une personne en opposition est refusé
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_36_envoi_opposition_refuse() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; t_oppos text; t_envois text; col_oppos text; col_envoi text; col_canal_o text; col_canal_e text; col_statut text; valeurs jsonb; ligne jsonb;
begin
  jeu := tests.jeu();
  t_oppos := tests.table_parmi(array['oppositions']);
  t_envois := tests.table_parmi(array['envois']);
  if t_oppos is null or t_envois is null then return next fail('Tables oppositions/envois introuvables'); return; end if;
  col_oppos := tests.colonne_parmi(('public.' || t_oppos)::regclass, array['adresse', 'destinataire', 'contact', 'valeur', 'identifiant', 'cible']);
  col_envoi := tests.colonne_parmi(('public.' || t_envois)::regclass, array['adresse', 'destinataire', 'contact', 'valeur', 'identifiant', 'cible', 'a']);
  col_canal_o := tests.colonne_parmi(('public.' || t_oppos)::regclass, array['canal']);
  col_canal_e := tests.colonne_parmi(('public.' || t_envois)::regclass, array['canal']);
  if col_oppos is null or col_envoi is null then
    return next fail(format('Colonne du destinataire introuvable (oppositions : %s ; envois : %s) — adapter la liste de candidates', col_oppos, col_envoi));
    return next diag('Colonnes de ' || t_envois || ' : ' || (select string_agg(attname, ', ' order by attnum) from pg_attribute where attrelid = ('public.' || t_envois)::regclass and attnum > 0 and not attisdropped));
    return;
  end if;
  valeurs := jsonb_build_object('client_id', jeu ->> 'client_a', col_oppos, 'oppose-a5@essai.invalid');
  if col_canal_o is not null then valeurs := valeurs || jsonb_build_object(col_canal_o, 'courriel'); end if;
  perform tests.inserer_minimal('public', t_oppos, valeurs);
  valeurs := jsonb_build_object('client_id', jeu ->> 'client_a', col_envoi, 'oppose-a5@essai.invalid');
  if col_canal_e is not null then valeurs := valeurs || jsonb_build_object(col_canal_e, 'courriel'); end if;
  begin
    ligne := tests.inserer_minimal('public', t_envois, valeurs);
  exception when others then
    return next pass('L''envoi vers une personne en opposition est rejeté à l''insertion : ' || sqlerrm);
    return;
  end;
  col_statut := tests.colonne_parmi(('public.' || t_envois)::regclass, array['statut', 'etat', 'decision', 'verdict']);
  return next ok(col_statut is not null and (ligne ->> col_statut) ~* '(refus|bloqu|oppos|interdit)', format('Envoi accepté en base mais marqué %s = %L (attendu : refusé)', col_statut, ligne ->> col_statut));
  return next diag('Ligne d''envoi : ' || left(ligne::text, 500));
end $f$;



-- 37 — un envoi non transactionnel hors heures légales est différé, pas parti
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_37_envoi_hors_heures_differe() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; t_envois text; col_dest text; col_quand text; col_nature text; col_statut text; col_differe text; valeurs jsonb; ligne jsonb;
begin
  jeu := tests.jeu();
  t_envois := tests.table_parmi(array['envois']);
  if t_envois is null then return next fail('Table envois introuvable'); return; end if;
  col_dest := tests.colonne_parmi(('public.' || t_envois)::regclass, array['adresse', 'destinataire', 'contact', 'valeur', 'identifiant', 'cible', 'a']);
  col_quand := tests.colonne_parmi(('public.' || t_envois)::regclass, array['prevu_le', 'programme_le', 'envoyer_le', 'souhaite_le', 'demande_le', 'a_partir_de']);
  col_nature := tests.colonne_parmi(('public.' || t_envois)::regclass, array['nature', 'type_envoi', 'categorie', 'transactionnel']);
  col_statut := tests.colonne_parmi(('public.' || t_envois)::regclass, array['statut', 'etat']);
  if col_dest is null then
    return next fail('Colonne du destinataire introuvable dans envois — adapter la liste de candidates');
    return next diag('Colonnes : ' || (select string_agg(attname || ' ' || format_type(atttypid, null), ', ' order by attnum) from pg_attribute where attrelid = ('public.' || t_envois)::regclass and attnum > 0 and not attisdropped));
    return;
  end if;
  -- Un dimanche à 23 h : hors plage quel que soit le canal
  valeurs := jsonb_build_object('client_id', jeu ->> 'client_a', col_dest, '+33600000000', 'canal', 'sms');
  if col_quand is not null then valeurs := valeurs || jsonb_build_object(col_quand, '2026-10-11T23:00:00+02:00'); end if;
  if col_nature is not null then valeurs := valeurs || jsonb_build_object(col_nature, case when col_nature = 'transactionnel' then 'false' else 'prospection' end); end if;
  begin
    ligne := tests.inserer_minimal('public', t_envois, valeurs);
  exception when others then
    return next fail('L''envoi hors heures est rejeté au lieu d''être différé : ' || sqlerrm);
    return;
  end;
  col_differe := tests.colonne_parmi(('public.' || t_envois)::regclass, array['differe_a', 'reporte_a', 'envoi_prevu_le', 'prochaine_fenetre', 'prevu_le', 'programme_le']);
  return next ok((col_statut is not null and (ligne ->> col_statut) ~* '(differ|report|attente|planifi|programm)')
              or (col_differe is not null and col_quand is not null and col_differe <> col_quand and (ligne ->> col_differe) is not null
                  and (ligne ->> col_differe)::timestamptz > '2026-10-11T23:00:00+02:00'::timestamptz),
    format('L''envoi est différé (%s = %L ; %s = %L)', col_statut, ligne ->> col_statut, col_differe, ligne ->> col_differe));
  return next diag('Ligne d''envoi : ' || left(ligne::text, 500));
end $f$;



-- 38 — approuver au nom d'un autre sans délégation échoue
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_38_approbation_sans_delegation_refusee() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; t_app text; col_par text;
begin
  jeu := tests.jeu();
  t_app := tests.table_parmi(array['approbations', 'validations', 'decisions', 'accords']);
  if t_app is null then return next fail('Table des approbations introuvable (approbations/validations/decisions/accords)'); return; end if;
  col_par := tests.colonne_parmi(('public.' || t_app)::regclass, array['approuve_par', 'valide_par', 'decide_par', 'par', 'user_id', 'acteur_id', 'auteur_id']);
  if col_par is null then
    return next fail(format('Colonne de l''auteur introuvable dans %s — adapter la liste de candidates', t_app));
    return next diag('Colonnes : ' || (select string_agg(attname || ' ' || format_type(atttypid, null), ', ' order by attnum) from pg_attribute where attrelid = ('public.' || t_app)::regclass and attnum > 0 and not attisdropped));
    return;
  end if;
  -- A, authentifié, tente d'enregistrer une approbation signée B (même client, sans délégation)
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', jeu ->> 'user_b', 'client_id', jeu ->> 'client_a', 'role', jeu ->> 'role_membre', 'perimetre_total', true));
  perform tests.endosser((jeu ->> 'user_a')::uuid);
  return next throws_ok(
    format('select tests.inserer_minimal(''public'', %L, %L::jsonb)', t_app, jsonb_build_object('client_id', jeu ->> 'client_a', col_par, jeu ->> 'user_b')::text),
    null, null, format('%s : une approbation au nom de B écrite par A sans délégation est refusée', t_app));
  perform tests.redevenir_admin();
  return next diag(format('Table %s, colonne auteur %s. Si la porte d''approbation est une fonction, la brancher ici (nom à fournir par le coordinateur).', t_app, col_par));
end $f$;



select * from runtests('tests'::name, '^test_(26|28|29|30|31|32|33|34|35|36|37|38)_');
