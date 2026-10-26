-- 20261018231046 a4_48_filed_lot40_comptabilisation_reservee
-- Source : dépôt : be149e1 omega/migrations/a4_48_filed_lot40_comptabilisation_reservee.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_48_filed_lot40_comptabilisation_reservee.sql @ be149e1 ; a4_36 cité comme test : ignoré.
-- ═══ omega/migrations/a4_48_filed_lot40_comptabilisation_reservee.sql @ be149e1
-- FILED, lot 40 (a4_48) — la comptabilisation réservée et la séparation des tâches, dans FILED seul (chiffrage n° 111).
--
-- « Saisie, approbation, comptabilisation et administration sont quatre rôles distincts. » Le socle connaît gérant,
-- admin, valideur, collaborateur, lecteur ; sans toucher à ces rôles (décision du coordinateur, 18/10, voie b), FILED
-- tient pour chaque organisation :
--   · la liste des personnes qui comptabilisent (public.filed_comptables), quel que soit leur rôle hormis lecteur ;
--   · deux réglages (public.filed_comptabilisation_reglages), tous deux DÉSACTIVÉS par défaut :
--       reservee   — seules les personnes de la liste comptabilisent une facture validée ;
--       separation — qui a approuvé une facture ne la comptabilise pas lui-même.
-- Sans réglage posé, rien ne change : gérant, admin et valideur comptabilisent comme avant. Le serveur (service_role)
-- n'est jamais retenu (envois vers la comptabilité, reprises).
-- Portes : filed_designer_comptable, filed_regler_comptabilisation (gérant, admin) ; filed_etat_comptabilisation.
-- Branchement : private.filed_comptabiliser_facture (texte d'a4_07) demande private.filed_exiger_comptabilisation au
-- lieu du seul contrôle de rôle ; pose « par repère ».
-- Migration idempotente. Aucun DROP, aucune suppression ; aucun envoi.

create table if not exists public.filed_comptabilisation_reglages (
  client_id   uuid primary key references public.clients(id) on delete cascade,
  reservee    boolean not null default false,
  separation  boolean not null default false,
  maj_par     uuid,
  cree_le     timestamptz not null default now(),
  maj_le      timestamptz not null default now()
);
comment on table public.filed_comptabilisation_reglages is
  'Lot 40 (a4_48) : comptabilisation réservée aux personnes désignées, séparation approbation / comptabilisation. Désactivées par défaut.';

create table if not exists public.filed_comptables (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  user_id     uuid not null,
  actif       boolean not null default true,
  designe_par uuid,
  cree_le     timestamptz not null default now(),
  maj_le      timestamptz not null default now(),
  unique (client_id, user_id)
);
comment on table public.filed_comptables is
  'Lot 40 (a4_48) : les personnes qui comptabilisent les factures validées de l''organisation, quand la comptabilisation est réservée.';

do $$
declare t text;
begin
  foreach t in array array['filed_comptabilisation_reglages', 'filed_comptables'] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || '_lecture') then
      execute format('create policy %I on public.%I for select to authenticated using (client_id in (select private.mes_clients()))', t || '_lecture', t);
    end if;
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('create or replace trigger %I before update on public.%I for each row execute function private.filed_lot4_maj_le()', t || '_maj_le', t);
  end loop;
end $$;

insert into private.tables_locataires (nom, ordre_effacement, note)
select x.nom, x.ordre, 'FILED, lot 40' from (values ('filed_comptables', 32), ('filed_comptabilisation_reglages', 33)) x(nom, ordre)
where not exists (select 1 from private.tables_locataires t where t.nom = x.nom);

-- Qui a approuvé une facture : les approbations de ses demandes de validation, et ce que l'historique de la validation
-- a retenu (décideurs, y compris au nom de qui une délégation a approuvé).
create or replace function private.filed_approbateurs(p_facture uuid)
returns uuid[] language sql stable security definer set search_path to '' as $$
  select coalesce(array_agg(distinct u) filter (where u is not null), '{}') from (
    select a.user_id u from public.approbations a join public.filed_validations v on v.demande_id = a.demande_id
     where v.facture_id = p_facture and a.decision = 'approuve'
    union all
    select a.au_nom_de from public.approbations a join public.filed_validations v on v.demande_id = a.demande_id
     where v.facture_id = p_facture and a.decision = 'approuve'
    union all
    select (d.x)::uuid from public.filed_historique h
      cross join lateral jsonb_array_elements_text(case when jsonb_typeof(h.detail -> 'decideurs') = 'array' then h.detail -> 'decideurs' else '[]'::jsonb end) d(x)
     where h.objet_type = 'filed_facture' and h.objet_id = p_facture::text and h.etape = 'validee'
       and d.x ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) s
$$;
revoke all on function private.filed_approbateurs(uuid) from public, anon, authenticated;
grant execute on function private.filed_approbateurs(uuid) to service_role;

-- Qui peut comptabiliser cette facture : le contrôle de rôle d'avant, ou, si l'organisation l'a réglé, la liste et la
-- séparation des tâches. Rend la personne (nulle pour le serveur).
create or replace function private.filed_exiger_comptabilisation(p_f public.filed_factures)
returns uuid language plpgsql stable security definer set search_path to '' as $$
declare v_r public.filed_comptabilisation_reglages; v_uid uuid;
begin
  select * into v_r from public.filed_comptabilisation_reglages r where r.client_id = p_f.client_id;
  if not coalesce(v_r.reservee, false) then
    v_uid := private.filed_exiger_acteur(p_f.client_id, array['gerant', 'admin', 'valideur'], p_f.entite_id);
  else
    v_uid := private.filed_exiger_acteur(p_f.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'], p_f.entite_id);
    if v_uid is not null and not exists (select 1 from public.filed_comptables c where c.client_id = p_f.client_id and c.user_id = v_uid and c.actif) then
      raise exception 'La comptabilisation est réservée aux personnes désignées par l''organisation.' using errcode = '42501';
    end if;
  end if;
  if v_uid is not null and coalesce(v_r.separation, false) and v_uid = any (private.filed_approbateurs(p_f.id)) then
    raise exception 'Vous avez approuvé cette facture : une autre personne la comptabilise.' using errcode = '42501';
  end if;
  return v_uid;
end $$;
revoke all on function private.filed_exiger_comptabilisation(public.filed_factures) from public, anon, authenticated;
grant execute on function private.filed_exiger_comptabilisation(public.filed_factures) to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- Les portes (gérant, admin)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_designer_comptable(p_client uuid, p_user uuid, p_actif boolean default true)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_par uuid; v_id uuid;
begin
  v_par := private.filed_exiger_acteur(p_client, array['gerant', 'admin']);
  if not exists (select 1 from public.comptes c where c.client_id = p_client and c.user_id = p_user and c.role <> 'lecteur') then
    raise exception 'Cette personne n''est pas membre de l''organisation (ou n''y a qu''un accès en lecture).' using errcode = '22023';
  end if;
  if not coalesce(p_actif, true)
     and coalesce((select r.reservee from public.filed_comptabilisation_reglages r where r.client_id = p_client), false)
     and not exists (select 1 from public.filed_comptables c where c.client_id = p_client and c.actif and c.user_id <> p_user) then
    raise exception 'La comptabilisation est réservée : gardez au moins une personne désignée, ou levez la réserve d''abord.' using errcode = '55000';
  end if;
  insert into public.filed_comptables (client_id, user_id, actif, designe_par)
  values (p_client, p_user, coalesce(p_actif, true), v_par)
  on conflict (client_id, user_id) do update set actif = excluded.actif, designe_par = excluded.designe_par
  returning id into v_id;
  perform private.filed_journaliser(p_client, case when coalesce(p_actif, true) then 'filed.comptable.designe' else 'filed.comptable.retire' end,
    'filed_comptable', v_id::text, jsonb_build_object('personne', p_user));
  return v_id;
end $$;
revoke all on function private.filed_designer_comptable(uuid, uuid, boolean) from public, anon;
grant execute on function private.filed_designer_comptable(uuid, uuid, boolean) to authenticated, service_role;

create or replace function public.filed_designer_comptable(p_client uuid, p_user uuid, p_actif boolean default true)
returns uuid language sql set search_path to '' as $$ select private.filed_designer_comptable(p_client, p_user, p_actif) $$;
comment on function public.filed_designer_comptable(uuid, uuid, boolean) is
  'Lot 40 (a4_48) : désigne (ou retire, p_actif faux) une personne qui comptabilise les factures validées. Gérant ou admin.';
revoke all on function public.filed_designer_comptable(uuid, uuid, boolean) from public, anon;
grant execute on function public.filed_designer_comptable(uuid, uuid, boolean) to authenticated, service_role;

create or replace function private.filed_regler_comptabilisation(p_client uuid, p_reservee boolean, p_separation boolean)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare v_par uuid; v public.filed_comptabilisation_reglages;
begin
  v_par := private.filed_exiger_acteur(p_client, array['gerant', 'admin']);
  if coalesce(p_reservee, false) and not exists (select 1 from public.filed_comptables c where c.client_id = p_client and c.actif) then
    raise exception 'Désignez d''abord au moins une personne qui comptabilise.' using errcode = '55000';
  end if;
  insert into public.filed_comptabilisation_reglages (client_id, reservee, separation, maj_par)
  values (p_client, coalesce(p_reservee, false), coalesce(p_separation, false), v_par)
  on conflict (client_id) do update set reservee = excluded.reservee, separation = excluded.separation, maj_par = excluded.maj_par
  returning * into v;
  perform private.filed_journaliser(p_client, 'filed.comptabilisation.reglage', 'filed_comptabilisation_reglages', p_client::text,
    jsonb_build_object('reservee', v.reservee, 'separation', v.separation));
  return jsonb_build_object('reservee', v.reservee, 'separation', v.separation);
end $$;
revoke all on function private.filed_regler_comptabilisation(uuid, boolean, boolean) from public, anon;
grant execute on function private.filed_regler_comptabilisation(uuid, boolean, boolean) to authenticated, service_role;

create or replace function public.filed_regler_comptabilisation(p_client uuid, p_reservee boolean, p_separation boolean)
returns jsonb language sql set search_path to '' as $$ select private.filed_regler_comptabilisation(p_client, p_reservee, p_separation) $$;
comment on function public.filed_regler_comptabilisation(uuid, boolean, boolean) is
  'Lot 40 (a4_48) : réserve la comptabilisation aux personnes désignées et/ou sépare approbation et comptabilisation. Gérant ou admin.';
revoke all on function public.filed_regler_comptabilisation(uuid, boolean, boolean) from public, anon;
grant execute on function public.filed_regler_comptabilisation(uuid, boolean, boolean) to authenticated, service_role;

create or replace function private.filed_etat_comptabilisation(p_client uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur', 'collaborateur']);
  return jsonb_build_object(
    'reservee', coalesce((select r.reservee from public.filed_comptabilisation_reglages r where r.client_id = p_client), false),
    'separation', coalesce((select r.separation from public.filed_comptabilisation_reglages r where r.client_id = p_client), false),
    'comptables', coalesce((select jsonb_agg(c.user_id order by c.cree_le) from public.filed_comptables c where c.client_id = p_client and c.actif), '[]'::jsonb));
end $$;
revoke all on function private.filed_etat_comptabilisation(uuid) from public, anon;
grant execute on function private.filed_etat_comptabilisation(uuid) to authenticated, service_role;

create or replace function public.filed_etat_comptabilisation(p_client uuid)
returns jsonb language sql stable set search_path to '' as $$ select private.filed_etat_comptabilisation(p_client) $$;
comment on function public.filed_etat_comptabilisation(uuid) is
  'Lot 40 (a4_48) : les réglages de comptabilisation et les personnes désignées. Membres de l''organisation (hors lecteur).';
revoke all on function public.filed_etat_comptabilisation(uuid) from public, anon;
grant execute on function public.filed_etat_comptabilisation(uuid) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- Le branchement (texte d'a4_07, par repère)
-- ───────────────────────────────────────────────────────────────────────────
do $do$
declare
  v_def text;
  v_ancien text := $o$  v_uid := private.filed_exiger_acteur(v_f.client_id, array['gerant', 'admin', 'valideur'], v_f.entite_id);
  if (select auth.uid()) is not null and not private.voit_objet(v_f.client_id, 'filed_document', v_f.document_id::text) then$o$;
  v_nouveau text := $n$  v_uid := private.filed_exiger_comptabilisation(v_f);   -- a4_48 : réservée et séparation des tâches, si l'organisation l'a réglé
  if (select auth.uid()) is not null and not private.voit_objet(v_f.client_id, 'filed_document', v_f.document_id::text) then$n$;
begin
  v_def := pg_get_functiondef('private.filed_comptabiliser_facture(uuid, text)'::regprocedure);
  if position('private.filed_exiger_comptabilisation(v_f)' in v_def) > 0 then
    raise notice 'a4_48 : private.filed_comptabiliser_facture déjà branchée.';
    return;
  end if;
  if (length(v_def) - length(replace(v_def, v_ancien, ''))) / length(v_ancien) <> 1 then
    raise exception 'a4_48 : le repère attendu n''est pas une fois et une seule dans private.filed_comptabiliser_facture. Rien n''est posé.';
  end if;
  execute replace(v_def, v_ancien, v_nouveau);
  raise notice 'a4_48 : private.filed_comptabiliser_facture branchée.';
end $do$;
