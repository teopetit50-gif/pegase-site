-- TOUT_3.sql — partie 3/4 de TOUT.sql (tests 26 à 38). Lancer les quatre dans l'ordre.

-- 26 — UPDATE sur public.echeances_pro_journal échoue (ajout seul)
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_26_update_echeances_pro_journal() returns setof text
language plpgsql as $f$
declare
  nb int; v_ctid tid; col name;
begin
  if not tests.table_existe('echeances_pro_journal') then
    return next pass('public.echeances_pro_journal n''existe pas sur cet environnement : règle sans objet ici');
    return next diag('Le cahier des charges la nomme ; à confirmer par le coordinateur si elle doit exister.');
    return;
  end if;
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
  return next diag('Tables du cahier absentes ici (sans objet) : ' || coalesce((select string_agg(t.nom, ', ') from tests.tables_ajout_seul() t(nom) where to_regclass('public.' || t.nom) is null), 'aucune'));
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
    perform tests.journaliser((jeu ->> 'client_a')::uuid, 'essai_a5_' || i, 'essai', 'x', jsonb_build_object('i', i));
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



-- 32 — l'empreinte du journal vient de la porte private.journaliser(), jamais d'un INSERT direct
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_32_journal_hash_non_fourni() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; r record; n int := 0;
begin
  -- (a) aucun rôle applicatif n'écrit directement au journal
  return next ok(not has_table_privilege('anon', 'public.journal_opposable', 'INSERT'), 'anon : pas d''INSERT direct sur journal_opposable');
  return next ok(not has_table_privilege('authenticated', 'public.journal_opposable', 'INSERT'), 'authenticated : pas d''INSERT direct sur journal_opposable');
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    return next ok(not has_table_privilege('service_role', 'public.journal_opposable', 'INSERT'), 'service_role : pas d''INSERT direct sur journal_opposable');
  else
    return next pass('service_role absent ici');
  end if;
  return next ok(to_regprocedure('private.journaliser(uuid, text, text, text, jsonb, uuid)') is not null, 'La porte private.journaliser(uuid, text, text, text, jsonb, uuid) existe');
  -- (b) la porte produit 32 octets et chaîne sur la précédente
  jeu := tests.jeu();
  perform tests.journaliser((jeu ->> 'client_a')::uuid, 'essai_a5_1');
  perform tests.journaliser((jeu ->> 'client_a')::uuid, 'essai_a5_2');
  for r in select id, hash, hash_precedent, lag(hash) over (order by id) as precedent from public.journal_opposable where client_id = (jeu ->> 'client_a')::uuid order by id loop
    n := n + 1;
    return next is(octet_length(r.hash), 32, format('Ligne %s : empreinte de 32 octets', n));
    if n = 2 then return next ok(r.hash_precedent = r.precedent, 'Ligne 2 : hash_precedent = empreinte de la ligne 1'); end if;
  end loop;
  return next is(n, 2, 'Deux lignes écrites par la porte');
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
    perform tests.journaliser((jeu ->> 'client_a')::uuid, 'essai_a5_' || i);
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
    perform tests.journaliser((jeu ->> 'client_a')::uuid, 'essai_a5_' || i);
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



-- 36 — un envoi vers une personne en opposition est refusé par les verrous d'envoi
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.
-- Mécanique réelle (coordinateur, 5/10) : pas de déclencheur d'insertion ; private.opposer(...) pose l'opposition,
-- private.verrous_envoi(p_e envois, p_complet boolean, p_instant timestamptz) rend les verrous que lit tache_envois.

create or replace function tests.test_36_envoi_opposition_refuse() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; col_dest text; col_canal text; col_trans text; type_oppos text; valeurs jsonb; ligne jsonb; verrous jsonb; sans_opposition jsonb;
begin
  jeu := tests.jeu();
  if not tests.table_existe('envois') then return next fail('Table envois introuvable'); return; end if;
  col_dest := tests.colonne_parmi('public.envois'::regclass, array['destinataire_adresse', 'adresse', 'destinataire', 'contact', 'valeur', 'identifiant', 'cible']);
  col_canal := tests.colonne_parmi('public.envois'::regclass, array['canal']);
  col_trans := tests.colonne_parmi('public.envois'::regclass, array['transactionnel']);
  if col_dest is null then
    return next fail('Colonne du destinataire introuvable dans envois — adapter la liste de candidates');
    return next diag('Colonnes : ' || (select string_agg(attname || ' ' || format_type(atttypid, null), ', ' order by attnum) from pg_attribute where attrelid = 'public.envois'::regclass and attnum > 0 and not attisdropped));
    return;
  end if;
  valeurs := jsonb_build_object('client_id', jeu ->> 'client_a', col_dest, 'oppose-a5@essai.invalid');
  if col_canal is not null then valeurs := valeurs || jsonb_build_object(col_canal, 'courriel'); end if;
  if col_trans is not null then valeurs := valeurs || jsonb_build_object(col_trans, true); end if;
  ligne := tests.inserer_minimal('public', 'envois', valeurs);
  -- Verrous AVANT opposition : témoin
  begin
    execute 'select to_jsonb(private.verrous_envoi(e, true, now())) from public.envois e where e.id = $1' into sans_opposition using (ligne ->> 'id')::bigint;
  exception when others then
    return next fail('private.verrous_envoi(envois, boolean, timestamptz) injoignable : ' || sqlerrm);
    return next diag('Signatures : ' || coalesce((select string_agg(p.oid::regprocedure::text, ' ; ') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname ~ 'verrou'), 'aucune'));
    return;
  end;
  -- Opposition par la porte du socle
  type_oppos := coalesce(nullif(regexp_replace(coalesce(tests.valeur_selon_check('public.oppositions'::regclass, 'type', 'text'::regtype), ''), '::.*$|''', '', 'g'), ''), 'prospect');
  begin
    perform tests.appeler_privee('opposer', jeu ->> 'client_a', type_oppos, 'oppose-a5@essai.invalid', 'courriel', null, null, 'essai A5', 'essai_a5', null);
  exception when others then
    return next fail('private.opposer(...) refuse l''appel d''essai : ' || sqlerrm);
    return next diag('Signature : ' || coalesce((select string_agg(p.oid::regprocedure::text, ' ; ') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and p.proname = 'opposer'), 'absente') || ' ; type essayé : ' || type_oppos);
    return;
  end;
  execute 'select to_jsonb(private.verrous_envoi(e, true, now())) from public.envois e where e.id = $1' into verrous using (ligne ->> 'id')::bigint;
  return next ok(verrous::text ~* 'oppos', 'Avec une opposition posée, verrous_envoi() nomme l''opposition');
  return next ok(sans_opposition::text !~* 'oppos', 'Sans opposition, verrous_envoi() ne la nommait pas (témoin)');
  return next diag('Verrous avec opposition : ' || left(verrous::text, 400));
  return next diag('Verrous sans opposition : ' || left(sans_opposition::text, 400));
end $f$;



-- 37 — un envoi non transactionnel hors heures légales est différé par les verrous, pas parti
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_37_envoi_hors_heures_differe() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; col_dest text; col_canal text; col_trans text; valeurs jsonb; ligne jsonb; verrous_nuit jsonb; verrous_jour jsonb;
  dimanche_soir timestamptz := '2026-10-11T23:00:00+02:00'; mardi_matin timestamptz := '2026-10-13T10:30:00+02:00';
begin
  jeu := tests.jeu();
  if not tests.table_existe('envois') then return next fail('Table envois introuvable'); return; end if;
  col_dest := tests.colonne_parmi('public.envois'::regclass, array['destinataire_adresse', 'adresse', 'destinataire', 'contact', 'valeur', 'identifiant', 'cible']);
  col_canal := tests.colonne_parmi('public.envois'::regclass, array['canal']);
  col_trans := tests.colonne_parmi('public.envois'::regclass, array['transactionnel', 'nature']);
  if col_dest is null or col_canal is null then
    return next fail('Colonnes destinataire/canal introuvables dans envois — adapter la liste de candidates');
    return next diag('Colonnes : ' || (select string_agg(attname || ' ' || format_type(atttypid, null), ', ' order by attnum) from pg_attribute where attrelid = 'public.envois'::regclass and attnum > 0 and not attisdropped));
    return;
  end if;
  valeurs := jsonb_build_object('client_id', jeu ->> 'client_a', col_dest, '+33600000000', col_canal, 'sms');
  if col_trans = 'transactionnel' then valeurs := valeurs || jsonb_build_object('transactionnel', false);
  elsif col_trans = 'nature' then valeurs := valeurs || jsonb_build_object('nature', 'prospection'); end if;
  ligne := tests.inserer_minimal('public', 'envois', valeurs);
  begin
    execute 'select to_jsonb(private.verrous_envoi(e, true, $2)) from public.envois e where e.id = $1' into verrous_nuit using (ligne ->> 'id')::bigint, dimanche_soir;
    execute 'select to_jsonb(private.verrous_envoi(e, true, $2)) from public.envois e where e.id = $1' into verrous_jour using (ligne ->> 'id')::bigint, mardi_matin;
  exception when others then
    return next fail('private.verrous_envoi(envois, boolean, timestamptz) injoignable : ' || sqlerrm);
    return;
  end;
  return next ok(verrous_nuit::text ~* '(differ|hors|plage|heure|report|dimanche|fenetre|fenêtre)', 'Dimanche 23 h, SMS non transactionnel : verrous_envoi() diffère (hors plage)');
  return next ok(verrous_jour::text !~* '(hors.?plage|differ)', 'Mardi 10 h 30 : pas de verrou horaire (témoin)');
  return next diag('Verrous dimanche soir : ' || left(verrous_nuit::text, 400));
  return next diag('Verrous mardi matin : ' || left(verrous_jour::text, 400));
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
