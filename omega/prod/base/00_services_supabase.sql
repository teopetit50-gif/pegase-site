-- omega/prod/base/00_services_supabase.sql — RÉPÉTITION SEULEMENT. Ne se pose jamais en production.
--
-- L'image supabase/postgres seule n'a pas ce que les services Storage et Auth de Supabase créent dans une vraie base :
-- le schéma storage (buckets, objects, foldername…) et les colonnes récentes de auth.users (deleted_at, is_anonymous…).
-- Forme relevée dans le catalogue de la production le 25/10/2026 (information_schema, pg_proc ; aucune donnée).
-- Sans ce fichier, la répétition du 25/10 échouait sur 19b, 19m, 19n, b5_01 (storage.objects) et 19af (deleted_at).
-- Idempotent : sur une base qui a déjà ces objets, il ne change rien.

alter table auth.users add column if not exists is_sso_user boolean not null default false;
alter table auth.users add column if not exists deleted_at timestamptz;
alter table auth.users add column if not exists is_anonymous boolean not null default false;

create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  public boolean default false,
  avif_autodetection boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  owner_id text,
  type text not null default 'STANDARD',
  versioning_status text not null default 'disabled',
  lifecycle_configuration jsonb,
  lifecycle_configuration_generation uuid
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_accessed_at timestamptz default now(),
  metadata jsonb,
  path_tokens text[] generated always as (string_to_array(name, '/')) stored,
  version text,
  owner_id text,
  user_metadata jsonb,
  archived_at timestamptz,
  is_delete_marker boolean not null default false,
  is_versioned boolean not null default false
);
alter table storage.objects enable row level security;
alter table storage.buckets enable row level security;
grant all on storage.objects, storage.buckets to anon, authenticated, service_role;

create or replace function storage.foldername(name text) returns text[]
language plpgsql immutable as $$
declare _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1 : array_length(_parts, 1) - 1];
end $$;

create or replace function storage.filename(name text) returns text
language plpgsql immutable as $$
declare _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[array_length(_parts, 1)];
end $$;

create or replace function storage.extension(name text) returns text
language plpgsql immutable as $$
declare _parts text[]; _filename text;
begin
  select string_to_array(name, '/') into _parts;
  select _parts[array_length(_parts, 1)] into _filename;
  return reverse(split_part(reverse(_filename), '.', 1));
end $$;
