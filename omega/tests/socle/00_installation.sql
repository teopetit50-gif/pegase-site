-- 00 — Installation de pgTAP et du schéma « tests » sur la RECETTE (ygwbgpowzlbdaajlsqkn).
-- À lancer une fois, avant les fichiers 01 à 50. Rien ici ne touche aux tables du socle.
-- Jamais en production : les tests écrivent des données d'exemple (annulées par runtests, mais tout de même).

create extension if not exists pgtap with schema extensions;
create schema if not exists tests;
comment on schema tests is 'Tests pgTAP du socle Omega (session A5). Données d''exemple uniquement, annulées à la fin de chaque test par runtests().';

-- ---------------------------------------------------------------------------
-- Valeur d'exemple pour un type donné (sert à poser des lignes minimales sans connaître chaque table).
create or replace function tests.valeur_exemple(p_type regtype) returns text
language plpgsql stable as $$
declare
  nom text := p_type::text;
  t pg_type%rowtype;
  etiquette text;
begin
  select * into t from pg_type where oid = p_type;
  if t.typtype = 'd' then return tests.valeur_exemple(t.typbasetype::regtype); end if;
  if t.typtype = 'e' then
    select enumlabel into etiquette from pg_enum where enumtypid = p_type order by enumsortorder limit 1;
    return format('%L::%s', etiquette, nom);
  end if;
  if t.typcategory = 'A' then return format('%L::%s', '{}', nom); end if;
  return case
    when nom = 'uuid' then 'gen_random_uuid()'
    when nom in ('text', 'character varying', 'character', 'citext', 'name') then format('%L::%s', 'essai-a5', nom)
    when nom = 'boolean' then 'false'
    when nom in ('smallint', 'integer', 'bigint', 'numeric', 'real', 'double precision', 'money') then format('0::%s', nom)
    when nom = 'date' then 'current_date'
    when nom in ('timestamp with time zone', 'timestamp without time zone') then format('now()::%s', nom)
    when nom in ('time with time zone', 'time without time zone') then format('%L::%s', '12:00', nom)
    when nom = 'interval' then '''0''::interval'
    when nom in ('jsonb', 'json') then format('%L::%s', '{}', nom)
    when nom = 'bytea' then '''\x00''::bytea'
    when nom = 'inet' then '''127.0.0.1''::inet'
    when nom = 'tstzrange' then 'tstzrange(now(), now() + interval ''1 hour'')'
    when nom = 'daterange' then 'daterange(current_date, current_date + 1)'
    else null
  end;
end $$;

-- Insère une ligne minimale dans une table : les colonnes fournies, plus une valeur d'exemple pour chaque
-- colonne NOT NULL sans défaut. Renvoie la ligne insérée en jsonb.
create or replace function tests.inserer_minimal(p_schema text, p_table text, p_valeurs jsonb default '{}'::jsonb) returns jsonb
language plpgsql as $$
declare
  r record;
  cols text := '';
  vals text := '';
  v text;
  typ regtype;
  resultat jsonb;
begin
  for r in
    select a.attname as colonne, a.atttypid as type_oid, a.attnotnull as non_nul, a.atthasdef as a_defaut,
           a.attidentity <> '' as identite, a.attgenerated <> '' as generee
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = p_schema and c.relname = p_table and a.attnum > 0 and not a.attisdropped
    order by a.attnum
  loop
    typ := r.type_oid::regtype;
    if p_valeurs ? r.colonne then
      if jsonb_typeof(p_valeurs -> r.colonne) = 'null' then v := 'null';
      elsif jsonb_typeof(p_valeurs -> r.colonne) in ('object', 'array') then v := format('%L::%s', (p_valeurs -> r.colonne)::text, typ);
      else v := format('%L::%s', p_valeurs ->> r.colonne, typ);
      end if;
    elsif r.non_nul and not r.a_defaut and not r.identite and not r.generee then
      v := tests.valeur_exemple(typ);
      if v is null then raise exception 'tests.inserer_minimal : pas de valeur d''exemple pour %.%.% (type %)', p_schema, p_table, r.colonne, typ; end if;
    else
      continue;
    end if;
    cols := cols || format('%I,', r.colonne);
    vals := vals || v || ',';
  end loop;
  execute format('insert into %I.%I (%s) values (%s) returning to_jsonb(%I.*)', p_schema, p_table, rtrim(cols, ','), rtrim(vals, ','), p_table) into resultat;
  return resultat;
end $$;

-- Jeu d'essai : deux clients fictifs, deux utilisateurs, deux comptes. Renvoie les identifiants.
-- Tout est annulé par runtests() à la fin de chaque test.
create or replace function tests.jeu() returns jsonb
language plpgsql as $$
declare
  client_a uuid; client_b uuid; user_a uuid := gen_random_uuid(); user_b uuid := gen_random_uuid();
  ligne jsonb;
  role_membre text;
begin
  perform set_config('tests.jeu_actif', 'oui', true);
  ligne := tests.inserer_minimal('public', 'clients', jsonb_build_object('nom', 'Client A — essai A5'));
  client_a := (ligne ->> 'id')::uuid;
  ligne := tests.inserer_minimal('public', 'clients', jsonb_build_object('nom', 'Client B — essai A5'));
  client_b := (ligne ->> 'id')::uuid;

  -- Utilisateurs d'authentification (si la table est accessible ; sinon les user_id restent de simples uuid).
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
    values (user_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a5-client-a@essai.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, false),
           (user_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a5-client-b@essai.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, false);
  exception when others then
    raise notice 'tests.jeu : auth.users non alimentée (%), on continue avec des uuid libres', sqlerrm;
  end;

  -- Rôle de membre « simple » : première étiquette de l'énumération si public.comptes.role est un enum, sinon 'membre'.
  select coalesce((select enumlabel from pg_enum e join pg_attribute a on a.atttypid = e.enumtypid
                   where a.attrelid = 'public.comptes'::regclass and a.attname = 'role' order by enumsortorder limit 1), 'membre')
    into role_membre;
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', user_a, 'client_id', client_a, 'role', role_membre, 'perimetre_total', true));
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', user_b, 'client_id', client_b, 'role', role_membre, 'perimetre_total', true));

  return jsonb_build_object('client_a', client_a, 'client_b', client_b, 'user_a', user_a, 'user_b', user_b, 'role_membre', role_membre);
end $$;

-- Endosser un utilisateur authentifié : JWT simulé + rôle authenticated (RLS active).
create or replace function tests.endosser(p_user uuid, p_email text default 'essai@essai.invalid') returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated', 'email', p_email, 'aud', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claim.email', p_email, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- Revenir au rôle d'origine (postgres) pour poser ou lire des données hors RLS.
create or replace function tests.redevenir_admin() returns void
language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
end $$;

-- Compte les lignes d'une table sous le rôle courant (RLS appliquée si authenticated).
create or replace function tests.compter(p_schema text, p_table text, p_condition text default 'true') returns bigint
language plpgsql as $$
declare n bigint;
begin
  execute format('select count(*) from %I.%I where %s', p_schema, p_table, p_condition) into n;
  return n;
end $$;

-- Première colonne existante parmi des candidates (pour s'adapter aux noms réels sans les connaître d'avance).
create or replace function tests.colonne_parmi(p_table regclass, p_candidates text[]) returns text
language sql stable as $$
  select c.attname::text from unnest(p_candidates) with ordinality cand(nom, rang)
  join pg_attribute c on c.attrelid = p_table and c.attname = cand.nom and c.attnum > 0 and not c.attisdropped
  order by cand.rang limit 1;
$$;

-- Première table existante (schéma public) parmi des candidates.
create or replace function tests.table_parmi(p_candidates text[]) returns text
language sql stable as $$
  select nom from unnest(p_candidates) with ordinality cand(nom, rang)
  where to_regclass('public.' || quote_ident(nom)) is not null order by rang limit 1;
$$;

-- Appelle private.lit_objet avec les bons types d'arguments, quels qu'ils soient.
create or replace function tests.lit_objet(p_client uuid, p_type text, p_objet uuid) returns boolean
language plpgsql as $$
declare types text[]; resultat boolean; appel text;
begin
  select array_agg(format_type(t, null) order by o) into types
  from pg_proc p, unnest(p.proargtypes) with ordinality u(t, o)
  where p.oid = 'private.lit_objet'::regproc;
  appel := format('select private.lit_objet(%L::%s, %L::%s, %L::%s)', p_client, types[1], p_type, types[2], p_objet, types[3]);
  execute appel into resultat;
  return coalesce(resultat, false);
end $$;

-- Tables du socle devant être en ajout seul.
create or replace function tests.tables_ajout_seul() returns setof text language sql immutable as $$
  select unnest(array['journal_opposable', 'envois_evenements', 'effacements', 'filed_historique', 'suivis_evenements', 'echeances_pro_journal']);
$$;

-- Déclencheur BEFORE qui couvre UPDATE et/ou DELETE sur une table (tgtype : 1 = ROW, 2 = BEFORE, 8 = DELETE, 16 = UPDATE).
create or replace function tests.declencheurs_bloquants(p_table text) returns table(nom text, sur_update boolean, sur_delete boolean, avant boolean)
language sql stable as $$
  select t.tgname::text, (t.tgtype & 16) <> 0, (t.tgtype & 8) <> 0, (t.tgtype & 2) <> 0
  from pg_trigger t
  where t.tgrelid = ('public.' || quote_ident(p_table))::regclass and not t.tgisinternal and t.tgenabled <> 'D';
$$;

-- Trouve (ou pose) une ligne d'essai dans une table en ajout seul, renvoie son ctid (toutes n'ont pas de colonne id).
create or replace function tests.ligne_pour_essai(p_table text) returns tid
language plpgsql as $$
declare
  v_ctid tid; jeu jsonb; valeurs jsonb := '{}'::jsonb;
begin
  execute format('select ctid from public.%I limit 1', p_table) into v_ctid;
  if v_ctid is not null then return v_ctid; end if;
  jeu := tests.jeu();
  if tests.colonne_parmi(('public.' || quote_ident(p_table))::regclass, array['client_id']) is not null then
    valeurs := jsonb_build_object('client_id', jeu ->> 'client_a');
  elsif tests.colonne_parmi(('public.' || quote_ident(p_table))::regclass, array['client_efface']) is not null then
    valeurs := jsonb_build_object('client_efface', jeu ->> 'client_b', 'nom_client', 'Client B — essai A5');
  end if;
  perform tests.inserer_minimal('public', p_table, valeurs);
  execute format('select ctid from public.%I limit 1', p_table) into v_ctid;
  return v_ctid;
end $$;

-- Les tests endossent le rôle authenticated puis rappellent ces aides : il faut qu'il puisse les exécuter.
-- Elles s'exécutent avec les droits de l'appelant (pas de SECURITY DEFINER) : aucune élévation possible.
grant usage on schema tests to authenticated;
grant execute on all functions in schema tests to authenticated;
alter default privileges in schema tests grant execute on functions to authenticated;

select 'pgTAP ' || extversion as installation from pg_extension where extname = 'pgtap';
