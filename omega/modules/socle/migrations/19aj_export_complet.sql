-- 19aj_export_complet.sql — export complet d'un client, fichiers Storage compris (A5, 06/10/2026).
-- Promesse du site : « export complet en un clic », « à la sortie : export puis effacement »
-- (omega/AUDIT-PROMESSES.md § 0). public.exporter_client rend les données en base, mais pas les fichiers.
--
-- Le parcours (fonction Edge export-complet, bouton d'A3) :
--   1. le gérant demande : public.demander_export_complet(client) vérifie son rôle et ouvre une ligne « en_cours » ;
--   2. la fonction, avec la clé de service, lit la liste des fichiers du client (private.export_complet_fichiers),
--      les télécharge du bucket omega-clients, les met avec exporter_client() dans un zip chiffré AES-256 par un mot de
--      passe tiré au hasard et rendu une seule fois au gérant (jamais gardé), dépose le zip dans le bucket privé
--      omega-exports, puis inscrit le résultat (private.export_complet_fini) ;
--   3. le gérant reçoit un lien signé valable 24 heures. Après expiration, le zip est retiré du bucket.
-- Les pièces chiffrées de bout en bout (Tamila, « dossier:v1 ») sortent telles qu'elles sont rangées, chiffrées.
-- Idempotent : rejouable sans effet.

create table if not exists public.exports_complets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id),   -- effacée par la règle des tables locataires
  demande_par uuid not null,
  demande_le timestamptz not null default now(),
  statut text not null default 'en_cours' check (statut in ('en_cours', 'pret', 'echec', 'expire')),
  chemin text,
  octets bigint,
  sha256 text check (sha256 is null or sha256 ~ '^[0-9a-f]{64}$'),
  nb_fichiers int,
  fichiers_manquants int,
  expire_le timestamptz,
  fini_le timestamptz,
  erreur text
);
comment on table public.exports_complets is
  'Exports complets (base + fichiers Storage) d''un client, en zip chiffré à lien temporaire (19aj). Le mot de passe n''est jamais gardé.';
create index if not exists exports_complets_client on public.exports_complets (client_id, demande_le desc);

alter table public.exports_complets enable row level security;
revoke all on public.exports_complets from anon, authenticated;
grant select on public.exports_complets to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'exports_complets' and policyname = 'exports_complets_lecture') then
    create policy exports_complets_lecture on public.exports_complets for select to authenticated
      using (client_id in (select private.mes_clients()));
  end if;
end $$;

-- Le bucket des zips : privé, sans politique ; seul le service y écrit, et le lien signé sert la lecture.
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public) values ('omega-exports', 'omega-exports', false) on conflict (id) do nothing;
  end if;
end $$;

-- 1. La demande, au nom du gérant (ou d'un admin du client). Une seule demande en cours par client et par demi-heure.
create or replace function public.demander_export_complet(p_client uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not exists (
       select 1 from public.comptes c where c.user_id = auth.uid() and c.client_id = p_client and c.role in ('gerant', 'admin')) then
    raise exception 'export complet réservé au gérant du client' using errcode = '42501';
  end if;
  if exists (select 1 from public.exports_complets e
             where e.client_id = p_client and e.statut = 'en_cours' and e.demande_le > now() - interval '30 minutes') then
    raise exception 'un export complet est déjà en cours pour ce client' using errcode = '55P03';
  end if;
  insert into public.exports_complets (client_id, demande_par) values (p_client, auth.uid()) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.demander_export_complet(uuid) from public, anon;
grant execute on function public.demander_export_complet(uuid) to authenticated;

-- 2. Les fichiers du client : tout ce que le bucket omega-clients range sous son identifiant, plus les chemins de
--    ses pièces (au cas où une pièce serait rangée ailleurs). Service seulement.
create or replace function private.export_complet_fichiers(p_export uuid) returns table (chemin text, octets bigint)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_client uuid;
begin
  select e.client_id into v_client from public.exports_complets e where e.id = p_export and e.statut = 'en_cours';
  if v_client is null then raise exception 'export % inconnu ou déjà clos', p_export; end if;
  return query
    select o.name::text, coalesce((o.metadata ->> 'size')::bigint, 0)
    from storage.objects o
    where o.bucket_id = 'omega-clients'
      and (o.name like v_client::text || '/%'
           or o.name in (select p.chemin from public.pieces p where p.client_id = v_client))
    order by o.name;
end $$;

-- 3. L'issue, inscrite par la fonction Edge.
create or replace function private.export_complet_fini(p_export uuid, p_chemin text, p_octets bigint, p_sha256 text,
                                                       p_nb int, p_manquants int, p_expire timestamptz) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.exports_complets
     set statut = 'pret', chemin = p_chemin, octets = p_octets, sha256 = p_sha256, nb_fichiers = p_nb,
         fichiers_manquants = p_manquants, expire_le = p_expire, fini_le = now()
   where id = p_export and statut = 'en_cours';
  if not found then raise exception 'export % inconnu ou déjà clos', p_export; end if;
end $$;

create or replace function private.export_complet_echec(p_export uuid, p_erreur text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.exports_complets set statut = 'echec', erreur = left(p_erreur, 500), fini_le = now()
   where id = p_export and statut = 'en_cours';
end $$;

-- 4. Les zips expirés : la fonction les retire du bucket, puis les marque.
create or replace function private.exports_complets_expires() returns table (id uuid, chemin text)
language sql stable security definer set search_path = '' as $$
  select e.id, e.chemin from public.exports_complets e where e.statut = 'pret' and e.expire_le < now() order by e.expire_le
$$;

create or replace function private.export_complet_expire(p_export uuid) returns void
language sql security definer set search_path = '' as $$
  update public.exports_complets set statut = 'expire' where id = p_export and statut = 'pret'
$$;

do $$ declare f text; begin
  foreach f in array array['private.export_complet_fichiers(uuid)',
                           'private.export_complet_fini(uuid, text, bigint, text, integer, integer, timestamp with time zone)',
                           'private.export_complet_echec(uuid, text)', 'private.exports_complets_expires()',
                           'private.export_complet_expire(uuid)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- Portes publiques du service (PostgREST n'expose pas private) : elles enveloppent les fonctions ci-dessus sans rien
-- y changer, comme celles du lot 17. Service seul.
create or replace function public.export_complet_fichiers(p_export uuid) returns table (chemin text, octets bigint)
language sql set search_path = '' as $$ select * from private.export_complet_fichiers(p_export) $$;
create or replace function public.export_complet_fini(p_export uuid, p_chemin text, p_octets bigint, p_sha256 text,
                                                      p_nb int, p_manquants int, p_expire timestamptz) returns void
language sql set search_path = '' as $$ select private.export_complet_fini(p_export, p_chemin, p_octets, p_sha256, p_nb, p_manquants, p_expire) $$;
create or replace function public.export_complet_echec(p_export uuid, p_erreur text) returns void
language sql set search_path = '' as $$ select private.export_complet_echec(p_export, p_erreur) $$;
create or replace function public.exports_complets_expires() returns table (id uuid, chemin text)
language sql set search_path = '' as $$ select * from private.exports_complets_expires() $$;
create or replace function public.export_complet_expire(p_export uuid) returns void
language sql set search_path = '' as $$ select private.export_complet_expire(p_export) $$;

do $$ declare f text; begin
  foreach f in array array['public.export_complet_fichiers(uuid)',
                           'public.export_complet_fini(uuid, text, bigint, text, integer, integer, timestamp with time zone)',
                           'public.export_complet_echec(uuid, text)', 'public.exports_complets_expires()',
                           'public.export_complet_expire(uuid)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

do $$ begin
  if to_regclass('private.tables_locataires') is not null
     and not exists (select 1 from private.tables_locataires where nom = 'exports_complets') then
    insert into private.tables_locataires (nom, ordre_effacement, note) values ('exports_complets', 1, 'socle 19aj, exports complets');
  end if;
end $$;
