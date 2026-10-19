-- 19au_api_tiers.sql — une interface de programmation pour un tiers : clés, portées, quotas, documentation des portes
-- (A5, 19/10/2026, G12 du chiffrage CASHD, E5 : « les portes existent mais ne sont pas offertes à un tiers »).
--
-- Le socle ne s'ouvre pas : PostgREST reste réservé aux comptes Omega. Un tiers (le logiciel d'un client) parlera à une
-- passerelle HTTP (fonction Edge, lot à part) qui, à chaque appel, présente la clé à public.api_authentifier ; la
-- passerelle n'appelle ensuite, avec le service, que la porte autorisée et pour la seule organisation de la clé.
--
-- Ce lot :
--   · private.api_portes : le catalogue des portes OFFERTES aux tiers (rien n'y est par défaut ; le module qui possède
--     une porte l'y inscrit par private.api_offrir_porte) ; public.api_documentation() la documente : signature et
--     commentaire lus dans le catalogue de Postgres, description et lecture/écriture lues dans le catalogue ;
--   · private.cles_api : une clé par usage, rattachée à UNE organisation ; seul son SHA-256 est gardé (le secret n'est
--     montré qu'une fois, à la création) ; ses portées (portes permises), son quota par jour, sa révocation ;
--   · private.cles_api_usage : les appels par clé et par jour (Europe/Paris) ;
--   · public.creer_cle_api, public.revoquer_cle_api, public.lister_cles_api : gérant (ou admin) du client, ou le
--     service ; chaque création et révocation est inscrite au journal opposable ;
--   · public.api_authentifier(secret, porte) : service seul ; refuse une clé inconnue ou révoquée (42501), une porte
--     hors de ses portées ou retirée du catalogue (42501), un quota du jour atteint (54000) ; sinon compte l'appel et
--     rend l'organisation, la clé et ce qui reste du quota.
-- Rien n'est supprimé. Idempotent : rejouable sans effet.

create table if not exists private.api_portes (
  porte        text primary key check (porte ~ '^[a-z][a-z0-9_]{2,62}$'),
  description  text not null check (char_length(description) between 1 and 2000),
  lecture      boolean not null default true,
  offerte      boolean not null default true,
  module       text,
  maj_le       timestamptz not null default now()
);
comment on table private.api_portes is 'Lot 19au : les portes publiques offertes aux tiers par l''interface de programmation. Vide par défaut.';
revoke all on table private.api_portes from public, anon, authenticated;
grant select on table private.api_portes to service_role;

create table if not exists private.cles_api (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references public.clients(id) on delete cascade,
  nom                text not null check (char_length(btrim(nom)) between 1 and 120),
  prefixe            text not null unique check (prefixe ~ '^[0-9a-f]{8}$'),
  empreinte          text not null unique check (empreinte ~ '^[0-9a-f]{64}$'),
  portees            text[] not null check (cardinality(portees) between 1 and 100),
  quota_jour         integer not null default 1000 check (quota_jour between 1 and 1000000),
  creee_par          uuid,
  creee_le           timestamptz not null default now(),
  revoquee_le        timestamptz,
  revoquee_par       uuid,
  derniere_utilisation timestamptz
);
comment on table private.cles_api is 'Lot 19au : clés de l''interface de programmation, une organisation chacune. Seul le SHA-256 du secret est gardé.';
create index if not exists cles_api_client on private.cles_api (client_id);
revoke all on table private.cles_api from public, anon, authenticated;

create table if not exists private.cles_api_usage (
  cle_id  uuid not null references private.cles_api(id) on delete cascade,
  jour    date not null,
  appels  integer not null default 0,
  primary key (cle_id, jour)
);
revoke all on table private.cles_api_usage from public, anon, authenticated;

-- Le gérant ou un admin du client ; sans utilisateur, le service.
create or replace function private.api_exiger_gerant(p_client uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.clients c where c.id = p_client) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  if (select auth.uid()) is not null and not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Seuls le gérant et les admins gèrent les clés de l''interface.' using errcode = '42501';
  end if;
end $$;

create or replace function private.api_offrir_porte(p_porte text, p_description text, p_lecture boolean default true,
                                                    p_module text default null, p_offerte boolean default true) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                 where n.nspname = 'public' and p.proname = p_porte) then
    raise exception 'Porte publique introuvable : %.', p_porte using errcode = '42883';
  end if;
  insert into private.api_portes (porte, description, lecture, offerte, module)
  values (p_porte, p_description, p_lecture, p_offerte, p_module)
  on conflict (porte) do update set description = excluded.description, lecture = excluded.lecture,
                                    offerte = excluded.offerte, module = excluded.module, maj_le = now();
end $$;

create or replace function public.api_documentation() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'porte', a.porte, 'module', a.module, 'lecture', a.lecture, 'description', a.description,
           'signatures', (select coalesce(jsonb_agg(jsonb_build_object(
                                    'arguments', pg_get_function_arguments(p.oid),
                                    'rend', pg_get_function_result(p.oid),
                                    'note', obj_description(p.oid, 'pg_proc')) order by p.oid), '[]'::jsonb)
                          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                          where n.nspname = 'public' and p.proname = a.porte))
         order by a.porte), '[]'::jsonb)
  from private.api_portes a where a.offerte
$$;

create or replace function public.creer_cle_api(p_client uuid, p_nom text, p_portees text[], p_quota_jour integer default 1000)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_prefixe text; v_secret text; v_id uuid; v_inconnues text[];
begin
  perform private.api_exiger_gerant(p_client);
  select array_agg(x) into v_inconnues from unnest(coalesce(p_portees, '{}')) x
   where not exists (select 1 from private.api_portes a where a.porte = x and a.offerte);
  if cardinality(coalesce(p_portees, '{}')) = 0 or v_inconnues is not null then
    raise exception 'Portées refusées (portes non offertes aux tiers) : %.', coalesce(array_to_string(v_inconnues, ', '), 'aucune portée')
      using errcode = '22023';
  end if;
  v_secret := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_prefixe := left(v_secret, 8);
  insert into private.cles_api (client_id, nom, prefixe, empreinte, portees, quota_jour, creee_par)
  values (p_client, btrim(p_nom), v_prefixe, encode(sha256(convert_to('omk_' || v_secret, 'UTF8')), 'hex'),
          (select array_agg(distinct x order by x) from unnest(p_portees) x), p_quota_jour, (select auth.uid()))
  returning id into v_id;
  perform private.journaliser(p_client, 'api.cle_creee', 'cle_api', v_id::text,
    jsonb_build_object('nom', btrim(p_nom), 'prefixe', v_prefixe, 'portees', p_portees, 'quota_jour', p_quota_jour), null::uuid);
  return jsonb_build_object('id', v_id, 'prefixe', v_prefixe, 'secret', 'omk_' || v_secret,
    'avertissement', 'Ce secret n''est montré qu''une fois : Omega n''en garde que l''empreinte.');
end $$;

create or replace function public.revoquer_cle_api(p_cle uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare k private.cles_api;
begin
  select * into k from private.cles_api c where c.id = p_cle;
  if k.id is null then raise exception 'Clé introuvable.' using errcode = 'P0002'; end if;
  perform private.api_exiger_gerant(k.client_id);
  if k.revoquee_le is null then
    update private.cles_api set revoquee_le = now(), revoquee_par = (select auth.uid()) where id = p_cle;
    perform private.journaliser(k.client_id, 'api.cle_revoquee', 'cle_api', p_cle::text,
      jsonb_build_object('prefixe', k.prefixe), null::uuid);
  end if;
  return jsonb_build_object('id', p_cle, 'revoquee', true);
end $$;

create or replace function public.lister_cles_api(p_client uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.api_exiger_gerant(p_client);
  return (select coalesce(jsonb_agg(jsonb_build_object('id', k.id, 'nom', k.nom, 'prefixe', k.prefixe, 'portees', k.portees,
            'quota_jour', k.quota_jour, 'creee_le', k.creee_le, 'revoquee_le', k.revoquee_le,
            'derniere_utilisation', k.derniere_utilisation,
            'appels_du_jour', coalesce((select u.appels from private.cles_api_usage u
                                        where u.cle_id = k.id and u.jour = (now() at time zone 'Europe/Paris')::date), 0))
            order by k.creee_le), '[]'::jsonb)
          from private.cles_api k where k.client_id = p_client);
end $$;

create or replace function public.api_authentifier(p_secret text, p_porte text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare k private.cles_api; v_jour date := (now() at time zone 'Europe/Paris')::date; v_appels integer;
begin
  select * into k from private.cles_api c
   where c.empreinte = encode(sha256(convert_to(coalesce(p_secret, ''), 'UTF8')), 'hex');
  if k.id is null or k.revoquee_le is not null then
    raise exception 'Clé inconnue ou révoquée.' using errcode = '42501';
  end if;
  if not (p_porte = any (k.portees))
     or not exists (select 1 from private.api_portes a where a.porte = p_porte and a.offerte) then
    raise exception 'Cette clé n''ouvre pas la porte %.', p_porte using errcode = '42501';
  end if;
  insert into private.cles_api_usage as u (cle_id, jour, appels) values (k.id, v_jour, 1)
  on conflict (cle_id, jour) do update set appels = u.appels + 1
  where u.appels < k.quota_jour
  returning u.appels into v_appels;
  if v_appels is null then
    raise exception 'Quota du jour atteint pour cette clé (% appels).', k.quota_jour using errcode = '54000';
  end if;
  update private.cles_api set derniere_utilisation = now() where id = k.id;
  return jsonb_build_object('client_id', k.client_id, 'cle_id', k.id, 'porte', p_porte,
                            'appels_du_jour', v_appels, 'reste_du_jour', k.quota_jour - v_appels);
end $$;

comment on function public.api_documentation() is 'Lot 19au : les portes offertes aux tiers, leur signature et leur description.';
comment on function public.creer_cle_api(uuid, text, text[], integer) is 'Lot 19au : crée une clé pour un tiers (secret montré une fois). Gérant ou admin, ou service.';
comment on function public.revoquer_cle_api(uuid) is 'Lot 19au : révoque une clé. Gérant ou admin du client de la clé, ou service.';
comment on function public.lister_cles_api(uuid) is 'Lot 19au : les clés d''une organisation, sans secret. Gérant ou admin, ou service.';
comment on function public.api_authentifier(text, text) is 'Lot 19au : la passerelle présente la clé et la porte ; rend l''organisation ou refuse (42501, 54000). Service seul.';

do $$ declare f text; begin
  foreach f in array array['private.api_exiger_gerant(uuid)', 'private.api_offrir_porte(text, text, boolean, text, boolean)',
                           'public.api_authentifier(text, text)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
  foreach f in array array['public.api_documentation()', 'public.creer_cle_api(uuid, text, text[], integer)',
                           'public.revoquer_cle_api(uuid)', 'public.lister_cles_api(uuid)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;
