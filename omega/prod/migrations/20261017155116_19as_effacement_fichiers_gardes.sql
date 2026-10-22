-- 20261017155116 19as_effacement_fichiers_gardes
-- Source : dépôt : 0555d1e6 omega/modules/socle/migrations/19as_effacement_fichiers_gardes.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : 19as_effacement_fichiers_gardes.sql @ 0555d1e6.
-- ═══ omega/modules/socle/migrations/19as_effacement_fichiers_gardes.sql @ 0555d1e6
-- 19as_effacement_fichiers_gardes.sql — l'effacement efface tout, sauf les fichiers que la loi oblige à garder
-- (A5, 17/10/2026, décision de Teo : « tout effacer sauf ce que la loi impose » ; pendant fichiers d'a4_40..a4_42).
--
-- FILED garde dix ans le registre, les archives, les factures et les écritures (a4_40 : filed_conservation). Les
-- FICHIERS de ces pièces sont gardés aussi : ils restent au stockage, hors de l'effacement, et le manifeste les liste
-- « gardés ». Sont gardés, et rien d'autre :
--   (1) les fichiers des pièces FILED : public.pieces où module = 'filed', par leur chemin au stockage ;
--   (2) les fichiers d'archives probantes FILED : public.filed_archives, si la table porte un jour une colonne
--       « chemin » (ce n'est pas le cas au 17/10 : sans objet jusque-là).
--
-- Ce lot :
--   · private.fichiers_gardes(client, type, id) : parmi private.fichiers_de(...), ceux qui sont gardés, et pourquoi ;
--   · private.fichiers_a_effacer(client, type, id) : private.fichiers_de(...) moins les gardés ;
--   · private.preparer_effacement : la liste à effacer exclut les gardés ; le manifeste les compte et les liste
--     (« gardes ») ; le retour porte aussi « gardes » ;
--   · private.effacer_client et private.effacer_objet : le refus 55000 ne compte plus que les fichiers à effacer.
-- private.fichiers_de reste inchangée : l'export et l'aperçu voient toujours tous les fichiers du client.
-- Rien n'est supprimé à la pose : les seules suppressions du fichier sont celles que effacer_client et effacer_objet
-- contiennent déjà sur la recette, reprises telles quelles. Idempotent : rejouable sans effet.

create or replace function private.fichiers_gardes(p_client uuid, p_objet_type text default null, p_objet_id text default null)
returns table (bucket text, nom text, octets bigint, empreinte text, motif text)
language plpgsql stable security definer set search_path = '' as $$
begin
  return query
    select f.bucket, f.nom, f.octets, f.empreinte, 'piece_filed'::text
    from private.fichiers_de(p_client, p_objet_type, p_objet_id) f
    where exists (select 1 from public.pieces p
                  where p.client_id = p_client and p.module = 'filed' and p.chemin = f.nom);
  if to_regclass('public.filed_archives') is not null
     and exists (select 1 from pg_attribute a
                 where a.attrelid = to_regclass('public.filed_archives') and a.attname = 'chemin' and not a.attisdropped) then
    return query execute $q$
      select f.bucket, f.nom, f.octets, f.empreinte, 'archive_filed'::text
      from private.fichiers_de($1, $2, $3) f
      where exists (select 1 from public.filed_archives a where a.client_id = $1 and to_jsonb(a) ->> 'chemin' = f.nom)
        and not exists (select 1 from public.pieces p where p.client_id = $1 and p.module = 'filed' and p.chemin = f.nom)
    $q$ using p_client, p_objet_type, p_objet_id;
  end if;
end $$;

create or replace function private.fichiers_a_effacer(p_client uuid, p_objet_type text default null, p_objet_id text default null)
returns table (bucket text, nom text, octets bigint, empreinte text, cree_le timestamptz)
language sql stable security definer set search_path = '' as $$
  select f.bucket, f.nom, f.octets, f.empreinte, f.cree_le
  from private.fichiers_de(p_client, p_objet_type, p_objet_id) f
  where not exists (select 1 from private.fichiers_gardes(p_client, p_objet_type, p_objet_id) g
                    where g.bucket = f.bucket and g.nom = f.nom)
$$;

create or replace function private.preparer_effacement(p_client uuid, p_objet_type text default null, p_objet_id text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_cle text := p_client::text || coalesce('/' || p_objet_type || '/' || p_objet_id, '');
  v_liste jsonb;
  v_gardes jsonb;
  v_manifeste jsonb;
begin
  if not exists (select 1 from public.clients where id = p_client) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  if (p_objet_type is null) <> (p_objet_id is null) then
    raise exception 'Un objet se désigne par son type et son identifiant.' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('bucket', f.bucket, 'nom', f.nom, 'octets', f.octets,
                                               'empreinte', f.empreinte) order by f.bucket, f.nom), '[]'::jsonb)
  into v_liste
  from private.fichiers_a_effacer(p_client, p_objet_type, p_objet_id) f;

  select coalesce(jsonb_agg(jsonb_build_object('bucket', g.bucket, 'nom', g.nom, 'octets', g.octets,
                                               'empreinte', g.empreinte, 'motif', g.motif) order by g.bucket, g.nom), '[]'::jsonb)
  into v_gardes
  from private.fichiers_gardes(p_client, p_objet_type, p_objet_id) g;

  v_manifeste := jsonb_build_object(
    'nombre', jsonb_array_length(v_liste),
    'octets', (select coalesce(sum((e ->> 'octets')::bigint), 0) from jsonb_array_elements(v_liste) e),
    'empreinte_sha256', encode(sha256(convert_to(v_liste::text, 'UTF8')), 'hex'),
    'prepare_le', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'gardes', jsonb_build_object(
      'nombre', jsonb_array_length(v_gardes),
      'octets', (select coalesce(sum((e ->> 'octets')::bigint), 0) from jsonb_array_elements(v_gardes) e),
      'empreinte_sha256', encode(sha256(convert_to(v_gardes::text, 'UTF8')), 'hex'),
      'motif', 'Conservation légale (Code de commerce, L123-22) : fichiers des pièces et archives FILED, gardés au stockage.',
      'liste', v_gardes));

  insert into private.manifestes_effacement (cle, manifeste) values (v_cle, v_manifeste)
  on conflict (cle) do update set manifeste = excluded.manifeste, cree_le = now();
  return jsonb_build_object('manifeste', v_manifeste, 'fichiers', v_liste, 'gardes', v_gardes);
end $$;

-- private.effacer_client et private.effacer_objet : texte de la recette du 17/10 (transmis par le coordinateur), repris
-- À L'IDENTIQUE, sauf le contrôle 55000, qui ne compte plus que les fichiers à effacer (private.fichiers_a_effacer).
-- Les suppressions de lignes ci-dessous sont celles qui existent déjà dans ces fonctions : rien ne s'exécute à la pose.
create or replace function private.effacer_client(p_client uuid, p_confirmation text, p_par text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_nom text;
  v_export jsonb;
  v_lignes jsonb := '{}'::jsonb;
  v_restantes text[];
  v_orphelins uuid[];
  v_nom_table text;
  v_n bigint;
  v_passe int := 0;
  v_progres boolean;
  v_fichiers jsonb;
begin
  select c.nom into v_nom from public.clients c where c.id = p_client for update;
  if not found then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  if p_confirmation is distinct from v_nom then
    raise exception 'Confirmation refusée : saisir exactement le nom de l''organisation.' using errcode = '22023';
  end if;
  if coalesce(btrim(p_par), '') = '' then
    raise exception 'Un effacement est toujours signé : qui efface ?' using errcode = '22023';
  end if;
  -- 19as : les fichiers gardés par la loi (pièces FILED) restent au stockage et ne bloquent pas.
  if exists (select 1 from private.fichiers_a_effacer(p_client)) then
    raise exception 'Des fichiers de l''organisation restent dans le stockage : le serveur les efface d''abord (preparer_effacement, puis l''API du stockage).'
      using errcode = '55000';
  end if;
  select m.manifeste into v_fichiers from private.manifestes_effacement m where m.cle = p_client::text;

  v_export := private.exporter_client(p_client, null);

  select coalesce(array_agg(c.user_id), '{}') into v_orphelins
  from public.comptes c
  where c.client_id = p_client
    and not exists (select 1 from public.comptes o where o.user_id = c.user_id and o.client_id <> p_client);

  perform set_config('omega.effacement_client', p_client::text, true);

  select array_agg(t.nom order by t.ordre_effacement, t.nom) into v_restantes from private.tables_locataires t;
  loop
    v_passe := v_passe + 1;
    v_progres := false;
    foreach v_nom_table in array v_restantes loop
      begin
        execute format('delete from public.%I where client_id = $1', v_nom_table) using p_client;
        get diagnostics v_n = row_count;
        v_lignes := v_lignes || jsonb_build_object(v_nom_table, v_n);
        v_restantes := array_remove(v_restantes, v_nom_table);
        v_progres := true;
      exception when foreign_key_violation then
        null;
      end;
    end loop;
    exit when cardinality(v_restantes) = 0;
    if not v_progres or v_passe >= 10 then
      raise exception 'Effacement bloqué par des références croisées : %.', v_restantes using errcode = '23503';
    end if;
  end loop;

  delete from public.clients where id = p_client;
  v_lignes := v_lignes || jsonb_build_object('clients', 1);

  delete from public.audit_journal a
  where a.cle_ligne = p_client::text
     or a.cle_ligne like p_client::text || '/%'
     or a.avant ->> 'client_id' = p_client::text
     or a.apres ->> 'client_id' = p_client::text
     or (a.table_cible = 'clients' and (a.avant ->> 'id' = p_client::text or a.apres ->> 'id' = p_client::text));
  get diagnostics v_n = row_count;
  v_lignes := v_lignes || jsonb_build_object('audit_journal', v_n);

  delete from private.manifestes_effacement m
  where m.cle = p_client::text or starts_with(m.cle, p_client::text || '/');

  insert into public.effacements (client_efface, nom_client, par, empreinte_export, lignes, comptes_orphelins, fichiers)
  values (p_client, v_nom, p_par, v_export ->> 'empreinte_sha256', v_lignes, v_orphelins,
          coalesce(v_fichiers, '{"nombre": 0}'::jsonb));

  perform set_config('omega.effacement_client', '', true);

  return jsonb_build_object(
    'organisation', p_client,
    'lignes', v_lignes,
    'fichiers', coalesce(v_fichiers, '{"nombre": 0}'::jsonb),
    'empreinte_export', v_export ->> 'empreinte_sha256',
    'comptes_orphelins', to_jsonb(v_orphelins));
end $function$;

create or replace function private.effacer_objet(p_client uuid, p_objet_type text, p_objet_id text, p_confirmation text, p_par text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_role text := coalesce(nullif(current_setting('role', true), 'none'), session_user::text);
  v_entetes jsonb;
  v_par text;
  v_cle text := p_client::text || '/' || p_objet_type || '/' || p_objet_id;
  v_manifeste jsonb;
  v_lignes jsonb := '{}'::jsonb;
  v_n bigint;
  r record;
begin
  if p_objet_type is null or p_objet_id is null or not exists (select 1 from public.clients where id = p_client) then
    raise exception 'Objet introuvable.' using errcode = 'P0002';
  end if;
  if p_confirmation is distinct from p_objet_id then
    raise exception 'Confirmation refusée : saisir exactement l''identifiant de l''objet.' using errcode = '22023';
  end if;

  if v_uid is not null then
    if not ((private.a_un_role(p_client, array['gerant'])
             and (not exists (select 1 from private.gardiens_objets g where g.objet_type = p_objet_type)
                  or private.ecrit_objet(p_client, p_objet_type, p_objet_id)))
            or (private.a_le_droit(p_client, 'effacer.' || p_objet_type)
                and private.ecrit_objet(p_client, p_objet_type, p_objet_id))) then
      raise exception 'Seul le gérant, ou qui en a reçu le droit, efface un objet.' using errcode = '42501';
    end if;
    select coalesce(u.email, v_uid::text) into v_par from auth.users u where u.id = v_uid;
  elsif v_role = 'service_role' then
    begin
      v_entetes := nullif(current_setting('request.headers', true), '')::jsonb;
    exception when others then
      v_entetes := null;
    end;
    v_par := coalesce(nullif(btrim(p_par), ''), nullif(v_entetes ->> 'x-omega-operateur', ''));
    if v_par is null then
      raise exception 'Un effacement est toujours signé : qui efface ?' using errcode = '22023';
    end if;
  else
    raise exception 'Seul le gérant, ou qui en a reçu le droit, efface un objet.' using errcode = '42501';
  end if;

  -- 19as : les fichiers gardés par la loi (pièces FILED) restent au stockage et ne bloquent pas.
  if exists (select 1 from private.fichiers_a_effacer(p_client, p_objet_type, p_objet_id)) then
    raise exception 'Des fichiers de cet objet restent dans le stockage : le serveur les efface d''abord.'
      using errcode = '55000';
  end if;
  select m.manifeste into v_manifeste from private.manifestes_effacement m where m.cle = v_cle;

  perform set_config('omega.effacement_objet', 'oui', true);
  for r in
    select t.nom, t.colonne from private.tables_objets t
    where t.objet_type = p_objet_type
    order by t.ordre_effacement, t.nom
  loop
    execute format('delete from public.%I where client_id = $1 and %I::text = $2', r.nom, r.colonne)
      using p_client, p_objet_id;
    get diagnostics v_n = row_count;
    v_lignes := v_lignes || jsonb_build_object(r.nom, v_n);
  end loop;

  -- Les tables génériques : délais, envois, suivis… de cet objet, quel que soit son type.
  for r in select g.nom from private.tables_objets_generiques g order by g.ordre_effacement, g.nom loop
    execute format('delete from public.%I where client_id = $1 and objet_type = $2 and objet_id = $3', r.nom)
      using p_client, p_objet_type, p_objet_id;
    get diagnostics v_n = row_count;
    v_lignes := v_lignes || jsonb_build_object(r.nom, v_n);
  end loop;

  -- Du socle : les pièces de l'objet (leurs pages et valeurs suivent), ses
  -- demandes de validation (et leurs décisions), ses accès.
  delete from public.pieces p
  where p.client_id = p_client and p.objet_type = p_objet_type and p.objet_id = p_objet_id;
  get diagnostics v_n = row_count;
  v_lignes := v_lignes || jsonb_build_object('pieces', v_n);
  delete from public.demandes_validation d
  where d.client_id = p_client and d.objet_type = p_objet_type and d.objet_id = p_objet_id;
  get diagnostics v_n = row_count;
  v_lignes := v_lignes || jsonb_build_object('demandes_validation', v_n);
  delete from public.acces_objets a
  where a.client_id = p_client and a.objet_type = p_objet_type and a.objet_id = p_objet_id;
  get diagnostics v_n = row_count;
  v_lignes := v_lignes || jsonb_build_object('acces_objets', v_n);
  perform set_config('omega.effacement_objet', '', true);

  insert into public.effacements_objets (client_id, objet_type, objet_id, par, acteur_id, lignes, fichiers)
  values (p_client, p_objet_type, p_objet_id, v_par, v_uid, v_lignes, coalesce(v_manifeste, '{"nombre": 0}'::jsonb));
  delete from private.manifestes_effacement m where m.cle = v_cle;

  perform private.journaliser(p_client, 'objet.effacement', p_objet_type, p_objet_id,
    jsonb_build_object('lignes', v_lignes, 'fichiers', coalesce(v_manifeste -> 'nombre', '0'::jsonb)));

  return jsonb_build_object('objet_type', p_objet_type, 'objet_id', p_objet_id, 'lignes', v_lignes,
                            'fichiers', coalesce(v_manifeste, '{"nombre": 0}'::jsonb));
end $function$;

do $$ declare f text; begin
  foreach f in array array['private.fichiers_gardes(uuid, text, text)', 'private.fichiers_a_effacer(uuid, text, text)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
