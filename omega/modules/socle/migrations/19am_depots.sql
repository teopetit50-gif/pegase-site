-- 19am_depots — socle : le dépôt par lot d'une organisation (dossier réseau WebDAV), d'abord pour FILED.
-- A2, 06/10/2026, demandé par le coordinateur (promesse de FILED : « dépôt par lot depuis un dossier partagé ou un
-- transfert de fichiers »). Numéro à confirmer par le coordinateur. Pose : recette ygwbgpowzlbdaajlsqkn, puis production.
-- Fonction Edge : omega/functions/depot/ (contrat des portes : depot/portes.ts). Choix WebDAV plutôt que SFTP : NOTES-A2.
--
-- Ce lot pose :
--   1. public.depots : un dépôt = une organisation (une société au besoin), un module (filed), un identifiant
--      « depot-… » et l'EMPREINTE SHA-256 de son mot de passe. Le mot de passe est tiré au hasard (128 bits), montré une
--      seule fois à la création ou au renouvellement, jamais gardé. Lecture par gérant et admin, sans l'empreinte.
--   2. public.depots_fichiers : ce que le dépôt a reçu (dossiers, fichiers, état, référence FILED), lisible par les
--      membres de l'organisation ; écrit par les portes seulement.
--   3. private.depots_echecs : les échecs d'ouverture ; 10 échecs en 15 minutes ferment l'identifiant 15 minutes.
--   4. Portes de l'écran (gérant ou admin) : depot_creer, depot_renouveler, depot_fermer.
--   5. Portes de l'ouvrier (service_role) : depot_ouvrir, depot_lister, depot_noter, depot_renommer,
--      depot_deposer_filed (impose le client et la société du dépôt, puis private.filed_deposer_piece, source
--      « connecteur »).
-- Idempotent (if not exists, create or replace) ; aucun DROP ; aucune donnée retirée.

create table if not exists public.depots (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  entite_id uuid,
  module text not null default 'filed',
  libelle text not null,
  identifiant text not null,
  empreinte text not null,
  actif boolean not null default true,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  renouvele_le timestamptz,
  dernier_depot_le timestamptz,
  ferme_le timestamptz,
  maj_le timestamptz not null default now(),
  constraint depots_pkey primary key (id),
  constraint depots_client_id_id_key unique (client_id, id),
  constraint depots_identifiant_key unique (identifiant),
  constraint depots_identifiant_check check (identifiant ~ '^depot-[a-z0-9]{6,40}$'),
  constraint depots_empreinte_check check (empreinte ~ '^[0-9a-f]{64}$'),
  constraint depots_module_check check (module ~ '^[a-z][a-z_]{1,29}$'),
  constraint depots_libelle_check check (char_length(btrim(libelle)) between 1 and 120),
  constraint depots_entite_fkey foreign key (client_id, entite_id) references public.entites (client_id, id)
);
comment on table public.depots is
  'Lot 19am : dépôts par lot (WebDAV) d''une organisation. Le mot de passe n''est jamais gardé, seulement son empreinte.';
alter table public.depots enable row level security;
revoke all on table public.depots from public, anon, authenticated;
grant select (id, client_id, entite_id, module, libelle, identifiant, actif, cree_par, cree_le, renouvele_le,
              dernier_depot_le, ferme_le, maj_le)
  on table public.depots to authenticated;
grant all on table public.depots to service_role;

create table if not exists public.depots_fichiers (
  id bigint generated always as identity,
  client_id uuid not null,
  depot_id uuid not null,
  chemin text not null,
  dossier boolean not null default false,
  octets bigint not null default 0,
  sha256 text,
  etat text not null,
  document_id uuid,
  reference text,
  motif text,
  recu_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint depots_fichiers_pkey primary key (id),
  constraint depots_fichiers_un_chemin unique (depot_id, chemin),
  constraint depots_fichiers_depot_fkey foreign key (client_id, depot_id) references public.depots (client_id, id) on delete cascade,
  constraint depots_fichiers_chemin_check check (char_length(chemin) between 1 and 1300 and chemin !~ '(^|/)\.\.?(/|$)'),
  constraint depots_fichiers_etat_check check (etat in ('dossier', 'vide', 'importe', 'doublon', 'ignore', 'refuse')),
  constraint depots_fichiers_octets_check check (octets >= 0),
  constraint depots_fichiers_sha256_check check (sha256 ~ '^[0-9a-f]{64}$'),
  constraint depots_fichiers_reference_check check (char_length(reference) <= 100),
  constraint depots_fichiers_motif_check check (char_length(motif) <= 300)
);
comment on table public.depots_fichiers is 'Lot 19am : ce que chaque dépôt par lot a reçu (dossiers, fichiers, état, référence FILED).';
alter table public.depots_fichiers enable row level security;
revoke all on table public.depots_fichiers from public, anon, authenticated;
grant select on table public.depots_fichiers to authenticated;
grant all on table public.depots_fichiers to service_role;
create index if not exists depots_fichiers_recents on public.depots_fichiers (depot_id, recu_le desc);

create table if not exists private.depots_echecs (
  id bigint generated always as identity primary key,
  identifiant text not null,
  ip text,
  survenu_le timestamptz not null default now()
);
alter table private.depots_echecs enable row level security;
revoke all on table private.depots_echecs from public, anon, authenticated;
grant all on table private.depots_echecs to service_role;
create index if not exists depots_echecs_recents on private.depots_echecs (identifiant, survenu_le desc);

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'depots'
                 and policyname = 'gerants et admins voient les depots') then
    create policy "gerants et admins voient les depots" on public.depots
      for select to authenticated using (private.a_un_role(client_id, array['gerant', 'admin']));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'depots_fichiers'
                 and policyname = 'membres voient ce que les depots ont recu') then
    create policy "membres voient ce que les depots ont recu" on public.depots_fichiers
      for select to authenticated using (client_id in (select private.mes_clients()));
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.depots'::regclass
                 and tgname = 'depots_tracer' and not tgisinternal) then
    create trigger depots_tracer after insert or delete or update on public.depots
      for each row execute function private.tracer('+module', '+actif', '+libelle');
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- Portes de l'écran (gérant ou admin)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.depot_mot_de_passe()
returns text language sql volatile set search_path to '' as $$
  select replace(gen_random_uuid()::text, '-', '')
$$;
revoke all on function private.depot_mot_de_passe() from public, anon, authenticated;

create or replace function private.depot_empreinte(p_mot_de_passe text)
returns text language sql immutable set search_path to '' as $$
  select encode(extensions.digest(convert_to(p_mot_de_passe, 'UTF8'), 'sha256'), 'hex')
$$;
revoke all on function private.depot_empreinte(text) from public, anon, authenticated;
grant execute on function private.depot_empreinte(text) to service_role;

create or replace function private.depot_creer(p_client uuid, p_libelle text, p_module text default 'filed',
                                               p_entite uuid default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_mdp text := private.depot_mot_de_passe();
  v_identifiant text := 'depot-' || left(replace(gen_random_uuid()::text, '-', ''), 12);
  v_id uuid;
begin
  if (select auth.uid()) is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Seuls un gérant ou un admin de l''organisation ouvrent un dépôt.' using errcode = '42501';
  end if;
  if coalesce(p_module, '') <> 'filed' then
    raise exception 'Le dépôt par lot n''est branché que pour FILED.' using errcode = '22023';
  end if;
  if (select count(*) from public.depots d where d.client_id = p_client and d.actif) >= 20 then
    raise exception 'Vingt dépôts ouverts au plus par organisation.' using errcode = '54000';
  end if;
  insert into public.depots (client_id, entite_id, module, libelle, identifiant, empreinte, cree_par)
  values (p_client, p_entite, p_module, btrim(p_libelle), v_identifiant, private.depot_empreinte(v_mdp), (select auth.uid()))
  returning id into v_id;
  return jsonb_build_object('depot', v_id, 'identifiant', v_identifiant, 'mot_de_passe', v_mdp,
                            'avertissement', 'Ce mot de passe ne sera plus jamais affiché : notez-le maintenant.');
end $$;
revoke all on function private.depot_creer(uuid, text, text, uuid) from public, anon;
grant execute on function private.depot_creer(uuid, text, text, uuid) to authenticated, service_role;

create or replace function private.depot_renouveler(p_depot uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  d public.depots;
  v_mdp text := private.depot_mot_de_passe();
begin
  select * into d from public.depots x where x.id = p_depot for update;
  if d.id is null or (select auth.uid()) is null or not private.a_un_role(d.client_id, array['gerant', 'admin']) then
    raise exception 'Dépôt introuvable.' using errcode = '42501';
  end if;
  update public.depots set empreinte = private.depot_empreinte(v_mdp), actif = true, ferme_le = null,
                           renouvele_le = now(), maj_le = now()
   where id = d.id;
  return jsonb_build_object('depot', d.id, 'identifiant', d.identifiant, 'mot_de_passe', v_mdp,
                            'avertissement', 'L''ancien mot de passe ne marche plus. Celui-ci ne sera plus jamais affiché.');
end $$;
revoke all on function private.depot_renouveler(uuid) from public, anon;
grant execute on function private.depot_renouveler(uuid) to authenticated, service_role;

create or replace function private.depot_fermer(p_depot uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare d public.depots;
begin
  select * into d from public.depots x where x.id = p_depot for update;
  if d.id is null or (select auth.uid()) is null or not private.a_un_role(d.client_id, array['gerant', 'admin']) then
    raise exception 'Dépôt introuvable.' using errcode = '42501';
  end if;
  update public.depots set actif = false, ferme_le = now(), maj_le = now() where id = d.id and actif;
end $$;
revoke all on function private.depot_fermer(uuid) from public, anon;
grant execute on function private.depot_fermer(uuid) to authenticated, service_role;

create or replace function public.depot_creer(p_client uuid, p_libelle text, p_module text default 'filed', p_entite uuid default null)
returns jsonb language sql set search_path to '' as $$ select private.depot_creer(p_client, p_libelle, p_module, p_entite) $$;
create or replace function public.depot_renouveler(p_depot uuid)
returns jsonb language sql set search_path to '' as $$ select private.depot_renouveler(p_depot) $$;
create or replace function public.depot_fermer(p_depot uuid)
returns void language sql set search_path to '' as $$ select private.depot_fermer(p_depot) $$;
revoke all on function public.depot_creer(uuid, text, text, uuid) from public, anon;
revoke all on function public.depot_renouveler(uuid) from public, anon;
revoke all on function public.depot_fermer(uuid) from public, anon;
grant execute on function public.depot_creer(uuid, text, text, uuid) to authenticated, service_role;
grant execute on function public.depot_renouveler(uuid) to authenticated, service_role;
grant execute on function public.depot_fermer(uuid) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- Portes de l'ouvrier (service_role seulement)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.depot_ouvrir(p_identifiant text, p_empreinte text, p_ip text default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare d public.depots;
begin
  perform private.exiger_ouvrier();
  if (select count(*) from private.depots_echecs e
      where e.identifiant = lower(p_identifiant) and e.survenu_le > now() - interval '15 minutes') >= 10 then
    return null;   -- trop d'échecs récents : l'identifiant est fermé un quart d'heure
  end if;
  select * into d from public.depots x where x.identifiant = lower(p_identifiant) and x.actif;
  if d.id is null or d.empreinte <> lower(coalesce(p_empreinte, '')) then
    insert into private.depots_echecs (identifiant, ip) values (left(lower(coalesce(p_identifiant, '')), 60), left(p_ip, 60));
    delete from private.depots_echecs where survenu_le < now() - interval '1 day';
    return null;
  end if;
  return jsonb_build_object('depot', d.id, 'client_id', d.client_id, 'entite_id', d.entite_id, 'module', d.module,
                            'libelle', d.libelle);
end $$;

create or replace function private.depot_lister(p_depot uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
begin
  perform private.exiger_ouvrier();
  return coalesce((
    select jsonb_agg(jsonb_build_object('chemin', f.chemin, 'dossier', f.dossier, 'octets', f.octets, 'etat', f.etat,
                                        'reference', f.reference, 'recu_le', f.recu_le) order by f.chemin)
    from public.depots_fichiers f
    where f.depot_id = p_depot and f.recu_le > now() - interval '30 days'), '[]'::jsonb);
end $$;

create or replace function private.depot_noter(p_depot uuid, p_chemin text, p_dossier boolean, p_octets bigint, p_sha256 text,
                                               p_etat text, p_document uuid default null, p_reference text default null,
                                               p_motif text default null)
returns void language plpgsql security definer set search_path to '' as $$
declare d public.depots;
begin
  perform private.exiger_ouvrier();
  select * into d from public.depots x where x.id = p_depot and x.actif;
  if d.id is null then
    raise exception 'Dépôt introuvable ou fermé.' using errcode = 'P0002';
  end if;
  insert into public.depots_fichiers (client_id, depot_id, chemin, dossier, octets, sha256, etat, document_id, reference, motif)
  values (d.client_id, d.id, p_chemin, coalesce(p_dossier, false), greatest(coalesce(p_octets, 0), 0), lower(p_sha256), p_etat,
          p_document, left(p_reference, 100), left(p_motif, 300))
  on conflict (depot_id, chemin) do update
    set dossier = excluded.dossier, octets = excluded.octets, sha256 = excluded.sha256, etat = excluded.etat,
        document_id = coalesce(excluded.document_id, public.depots_fichiers.document_id),
        reference = coalesce(excluded.reference, public.depots_fichiers.reference),
        motif = excluded.motif, recu_le = now(), maj_le = now();
  if p_etat in ('importe', 'doublon') then
    update public.depots set dernier_depot_le = now() where id = d.id;
  end if;
end $$;

create or replace function private.depot_renommer(p_depot uuid, p_de text, p_vers text)
returns boolean language plpgsql security definer set search_path to '' as $$
declare f public.depots_fichiers;
begin
  perform private.exiger_ouvrier();
  select * into f from public.depots_fichiers x where x.depot_id = p_depot and x.chemin = p_de for update;
  -- Seuls un dossier vide, un fichier réservé (0 octet) ou ignoré se renomment : une pièce reçue ne bouge plus.
  if f.id is null or f.etat not in ('dossier', 'vide', 'ignore')
     or exists (select 1 from public.depots_fichiers x where x.depot_id = p_depot and starts_with(x.chemin, p_de || '/'))
     or exists (select 1 from public.depots_fichiers x where x.depot_id = p_depot and x.chemin = p_vers) then
    return false;
  end if;
  update public.depots_fichiers set chemin = p_vers, maj_le = now() where id = f.id;
  return true;
end $$;

create or replace function private.depot_deposer_filed(p_depot uuid, p_document uuid, p_nom_fichier text, p_mime text,
                                                       p_octets bigint, p_sha256 text, p_chemin text, p_origine text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare d public.depots;
begin
  perform private.exiger_ouvrier();
  select * into d from public.depots x where x.id = p_depot and x.actif;
  if d.id is null then
    raise exception 'Dépôt introuvable ou fermé.' using errcode = 'P0002';
  end if;
  if d.module <> 'filed' then
    raise exception 'Ce dépôt n''alimente pas FILED.' using errcode = '22023';
  end if;
  -- Le client et la société sont ceux du dépôt, jamais ceux que l'ouvrier dirait.
  return private.filed_deposer_piece(d.client_id, p_document, p_nom_fichier, p_mime, p_octets, p_sha256, p_chemin,
                                     d.entite_id, 'connecteur', left(p_origine, 300));
end $$;

create or replace function public.depot_ouvrir(p_identifiant text, p_empreinte text, p_ip text default null)
returns jsonb language sql set search_path to '' as $$ select private.depot_ouvrir(p_identifiant, p_empreinte, p_ip) $$;
create or replace function public.depot_lister(p_depot uuid)
returns jsonb language sql stable set search_path to '' as $$ select private.depot_lister(p_depot) $$;
create or replace function public.depot_noter(p_depot uuid, p_chemin text, p_dossier boolean, p_octets bigint, p_sha256 text,
                                              p_etat text, p_document uuid default null, p_reference text default null,
                                              p_motif text default null)
returns void language sql set search_path to '' as $$
  select private.depot_noter(p_depot, p_chemin, p_dossier, p_octets, p_sha256, p_etat, p_document, p_reference, p_motif)
$$;
create or replace function public.depot_renommer(p_depot uuid, p_de text, p_vers text)
returns boolean language sql set search_path to '' as $$ select private.depot_renommer(p_depot, p_de, p_vers) $$;
create or replace function public.depot_deposer_filed(p_depot uuid, p_document uuid, p_nom_fichier text, p_mime text,
                                                      p_octets bigint, p_sha256 text, p_chemin text, p_origine text)
returns jsonb language sql set search_path to '' as $$
  select private.depot_deposer_filed(p_depot, p_document, p_nom_fichier, p_mime, p_octets, p_sha256, p_chemin, p_origine)
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'depot_ouvrir(text, text, text)', 'depot_lister(uuid)',
    'depot_noter(uuid, text, boolean, bigint, text, text, uuid, text, text)', 'depot_renommer(uuid, text, text)',
    'depot_deposer_filed(uuid, uuid, text, text, bigint, text, text, text)']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
    execute format('revoke all on function private.%s from public, anon, authenticated', f);
    execute format('grant execute on function private.%s to service_role', f);
  end loop;
end $$;

select (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('depots', 'depots_fichiers')) as tables,
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname like 'depot\_%') as portes_publiques;
