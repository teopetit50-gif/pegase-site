-- b4_05 — Tamila : le coffre à clés Scaleway (session B4, 06/10/2026).
--
-- LA DÉCISION (coordinateur, délégation de Teo, 06/10) : Scaleway Key Manager. Une clé maître par
-- cabinet, chez Scaleway ; chaque clé de dossier (AES-256-GCM, celle qui chiffre référence, intitulé,
-- n° RG, parties et pièces) est enveloppée par cette clé maître. Le déballage se fait côté serveur, dans
-- l'ouvrier « tamila-coffre » (omega/functions/tamila-coffre), pour deux demandeurs seulement : le
-- lecteur (une pièce à lire) et un membre habilité du dossier. Le mode « local » (clé enveloppée dans le
-- navigateur sous la phrase du cabinet) reste le mode d'un cabinet qui n'a pas basculé.
--
-- CE QUE ÇA POSE.
--   · public.tamila_coffres : un coffre par cabinet (local | bascule | scaleway), la région et la clé
--     maître Scaleway (identifiant seulement : la clé ne quitte jamais Scaleway).
--   · public.tamila_coffre_journal : CHAQUE remise d'enveloppe en vue d'un déballage (qui, quand, quel
--     dossier, quelle pièce, pour qui, et l'issue rendue par l'ouvrier). Lu par les associés.
--   · Les portes, toutes par identifiant, jamais par contenu :
--       tamila_coffre_etat(client)                       membres du cabinet
--       tamila_coffre_demander_activation(client)        gérant          → preuve d'autorité pour l'ouvrier
--       tamila_coffre_activer(client, région, clé, par)  serveur         → coffre en « bascule » ou « scaleway »
--       tamila_coffre_pour_nouvelle_cle(client)          qui ouvre un dossier → identifiant du dossier + journal
--       tamila_coffre_pour_membre(dossier, pièce)        membre qui voit le dossier
--       tamila_coffre_pour_lecteur(pièce)                serveur (le lecteur, par l'ouvrier)
--       tamila_coffre_a_reenvelopper(dossier)            gérant, associé ou responsable qui voit le dossier
--       tamila_coffre_reenveloppe(journal, enveloppe)    serveur         → la clé du dossier passe à scaleway
--       tamila_coffre_conclure(journal, issue, détail)   serveur         → l'issue du déballage au journal
--   · private.tamila_garder_cle (create or replace) : une clé de dossier ne se retouche toujours pas, SAUF
--     le ré-enveloppement local → scaleway, autorisé seulement depuis tamila_coffre_reenveloppe (réglage de
--     transaction posé par la porte, que personne d'autre ne peut exploiter : authenticated n'a que SELECT
--     sur tamila_cles).
--   · private.tamila_cle_conforme (déclencheur avant insertion sur tamila_cles) : un cabinet passé au
--     coffre n'ouvre plus de dossier qu'avec une clé scaleway émise par l'ouvrier pour CE dossier et CETTE
--     personne ; un cabinet local n'accepte pas de clé scaleway.
--
-- CE QUI NE CHANGE PAS. Aucune pièce n'est jamais déchiffrée en base, ni re-chiffrée : le ré-enveloppement
-- ne change que l'enveloppe de la clé, pas la clé. Le serveur ne voit la clé de dossier qu'en mémoire,
-- le temps d'un appel. Les pièces d'un dossier ré-enveloppé qui n'avaient pas pu être lues
-- (« chiffree_sans_coffre ») repartent à la lecture.
--
-- Rien n'est effacé : create table if not exists, create or replace seulement. Toute fonction private
-- nouvelle : revoke execute from public, puis grant au seul rôle qui l'appelle.

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Les tables
-- ════════════════════════════════════════════════════════════════════════════════════════════

create table if not exists public.tamila_coffres (
  client_id uuid primary key,
  statut text not null default 'local',
  region text,
  cle_maitre text,
  active_par uuid,
  active_le timestamptz,
  bascule_finie_le timestamptz,
  maj_le timestamptz not null default now(),
  constraint tamila_coffres_statut_check check (statut in ('local', 'bascule', 'scaleway')),
  constraint tamila_coffres_region_check check (region ~ '^[a-z]{2}-[a-z]{3}$'),
  constraint tamila_coffres_cle_maitre_check check (cle_maitre ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'),
  constraint tamila_coffres_scaleway check ((statut = 'local') = (cle_maitre is null and region is null))
);

comment on table public.tamila_coffres is
  'Tamila (B4, b4_05) : le coffre à clés d''un cabinet. local = phrase du cabinet ; bascule = clé maître Scaleway posée, dossiers locaux en cours de ré-enveloppement ; scaleway = tous les dossiers sous la clé maître.';

alter table public.tamila_coffres enable row level security;
revoke all on table public.tamila_coffres from anon, authenticated, service_role;
grant select on table public.tamila_coffres to authenticated;

do $politique$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tamila_coffres'
                   and policyname = 'membres lisent le coffre de leur cabinet') then
    create policy "membres lisent le coffre de leur cabinet" on public.tamila_coffres
      for select to authenticated using (client_id in (select private.mes_clients()));
  end if;
end $politique$;

create table if not exists public.tamila_coffre_journal (
  id bigint generated always as identity primary key,
  client_id uuid not null,
  dossier_id uuid not null,
  piece_id uuid,
  pour text not null,
  demandeur uuid,
  issue text not null default 'demande',
  detail jsonb not null default '{}'::jsonb,
  demande_le timestamptz not null default now(),
  conclu_le timestamptz,
  constraint tamila_coffre_journal_pour_check check (pour in ('membre', 'lecteur', 'reenveloppement', 'nouvelle_cle')),
  constraint tamila_coffre_journal_issue_check check (issue in ('demande', 'deballe', 'emise', 'reenveloppe', 'refuse', 'echec')),
  constraint tamila_coffre_journal_demandeur check ((pour = 'lecteur') = (demandeur is null)),
  constraint tamila_coffre_journal_piece check (pour <> 'lecteur' or piece_id is not null)
);

create index if not exists tamila_coffre_journal_dossier on public.tamila_coffre_journal (dossier_id, demande_le desc);
create index if not exists tamila_coffre_journal_client on public.tamila_coffre_journal (client_id, demande_le desc);

comment on table public.tamila_coffre_journal is
  'Tamila (B4, b4_05) : chaque remise d''une enveloppe de clé en vue d''un déballage au coffre (membre, lecteur, ré-enveloppement) et chaque émission de clé (nouvelle_cle), avec son issue. Aucun contenu, des identifiants seulement.';

alter table public.tamila_coffre_journal enable row level security;
revoke all on table public.tamila_coffre_journal from anon, authenticated, service_role;
grant select on table public.tamila_coffre_journal to authenticated;

do $politique$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tamila_coffre_journal'
                   and policyname = 'les associes lisent le journal du coffre') then
    create policy "les associes lisent le journal du coffre" on public.tamila_coffre_journal
      for select to authenticated using (private.a_un_role(client_id, array['gerant', 'admin']));
  end if;
end $politique$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Les outils
-- ════════════════════════════════════════════════════════════════════════════════════════════

-- Le geste est-il celui du serveur (rôle de service, personne de connectée) ?
create or replace function private.tamila_coffre_serveur()
returns boolean
language sql
stable
set search_path to ''
as $function$
  select (select auth.uid()) is null and private.tamila_role_session() = 'service_role'
$function$;

-- La référence d'une clé de dossier sous la clé maître d'un cabinet (tamila_cles.reference).
create or replace function private.tamila_coffre_reference(p_region text, p_cle_maitre text)
returns text
language sql
immutable
set search_path to ''
as $function$ select 'scaleway:' || p_region || ':' || p_cle_maitre $function$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- L'état et l'activation
-- ════════════════════════════════════════════════════════════════════════════════════════════

create or replace function private.tamila_coffre_etat(p_client uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_c public.tamila_coffres;
begin
  if not private.tamila_coffre_serveur() and p_client not in (select private.mes_clients()) then
    raise exception 'Ce cabinet n''est pas le vôtre.' using errcode = '42501';
  end if;
  select * into v_c from public.tamila_coffres where client_id = p_client;
  return jsonb_build_object(
    'client', p_client,
    'statut', coalesce(v_c.statut, 'local'),
    'region', v_c.region,
    'active_le', v_c.active_le,
    'bascule_finie_le', v_c.bascule_finie_le,
    'dossiers_locaux', (select count(*) from public.tamila_cles k where k.client_id = p_client and k.statut = 'active' and k.fournisseur = 'local'),
    'dossiers_scaleway', (select count(*) from public.tamila_cles k where k.client_id = p_client and k.statut = 'active' and k.fournisseur = 'scaleway'));
end $function$;

-- Le gérant demande le passage au coffre : rien n'est écrit, la porte rend la preuve que la personne
-- connectée est le gérant d'un cabinet où Tamila est installé. L'ouvrier crée (ou retrouve) la clé maître
-- chez Scaleway, puis appelle tamila_coffre_activer avec cet identifiant.
create or replace function private.tamila_coffre_demander_activation(p_client uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_c public.tamila_coffres;
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant']) then
    raise exception 'Le coffre d''un cabinet s''active par son gérant.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.tamila_reglages r where r.client_id = p_client) then
    raise exception 'Tamila n''est pas installé pour ce cabinet.' using errcode = '55000';
  end if;
  select * into v_c from public.tamila_coffres where client_id = p_client;
  return jsonb_build_object('client', p_client, 'par', v_uid, 'statut', coalesce(v_c.statut, 'local'),
                            'region', v_c.region, 'cle_maitre', v_c.cle_maitre);
end $function$;

create or replace function private.tamila_coffre_activer(p_client uuid, p_region text, p_cle_maitre text, p_par uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_c public.tamila_coffres;
  v_locaux bigint;
  v_statut text;
begin
  if not private.tamila_coffre_serveur() then
    raise exception 'La clé maître d''un cabinet est posée par le serveur, depuis le coffre.' using errcode = '42501';
  end if;
  if p_region is null or p_region !~ '^[a-z]{2}-[a-z]{3}$' then
    raise exception 'Région du coffre illisible : %.', coalesce(p_region, 'vide') using errcode = '22023';
  end if;
  if p_cle_maitre is null or p_cle_maitre !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    raise exception 'Identifiant de clé maître illisible.' using errcode = '22023';
  end if;
  if p_par is null or not exists (select 1 from public.comptes c where c.client_id = p_client and c.user_id = p_par and c.role = 'gerant') then
    raise exception 'Le coffre d''un cabinet s''active par son gérant.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.tamila_reglages r where r.client_id = p_client) then
    raise exception 'Tamila n''est pas installé pour ce cabinet.' using errcode = '55000';
  end if;
  select * into v_c from public.tamila_coffres where client_id = p_client for update;
  if found and v_c.statut <> 'local' then
    if v_c.region = p_region and v_c.cle_maitre = p_cle_maitre then
      return jsonb_build_object('client', p_client, 'statut', v_c.statut, 'deja', true);
    end if;
    raise exception 'Ce cabinet a déjà sa clé maître : elle ne se remplace pas ici.' using errcode = '55000';
  end if;
  select count(*) into v_locaux from public.tamila_cles k where k.client_id = p_client and k.statut = 'active' and k.fournisseur = 'local';
  v_statut := case when v_locaux > 0 then 'bascule' else 'scaleway' end;
  insert into public.tamila_coffres (client_id, statut, region, cle_maitre, active_par, active_le, bascule_finie_le, maj_le)
  values (p_client, v_statut, p_region, p_cle_maitre, p_par, now(), case when v_statut = 'scaleway' then now() end, now())
  on conflict (client_id) do update
     set statut = excluded.statut, region = excluded.region, cle_maitre = excluded.cle_maitre, active_par = excluded.active_par,
         active_le = excluded.active_le, bascule_finie_le = excluded.bascule_finie_le, maj_le = now();
  perform private.journaliser_module(p_client, 'tamila', 'tamila.coffre.active', 'tamila_coffre', p_client::text,
    jsonb_build_object('statut', v_statut, 'region', p_region, 'par', p_par, 'dossiers_locaux', v_locaux));
  return jsonb_build_object('client', p_client, 'statut', v_statut, 'dossiers_locaux', v_locaux, 'deja', false);
end $function$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Les remises d'enveloppe (chacune journalisée)
-- ════════════════════════════════════════════════════════════════════════════════════════════

-- Une clé pour un dossier qui va s'ouvrir : l'identifiant du dossier est tiré ici, la clé l'est par
-- l'ouvrier, qui l'enveloppe sous la clé maître (données associées = l'identifiant du dossier) et la rend
-- au navigateur avec son enveloppe ; le navigateur appelle ensuite tamila_creer_dossier.
create or replace function private.tamila_coffre_pour_nouvelle_cle(p_client uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_role text;
  v_c public.tamila_coffres;
  v_dossier uuid := gen_random_uuid();
  v_journal bigint;
begin
  if v_uid is null then
    raise exception 'Une clé de dossier se demande par une personne connectée.' using errcode = '42501';
  end if;
  select c.role into v_role from public.comptes c where c.user_id = v_uid and c.client_id = p_client;
  if v_role is null or v_role = 'lecteur' then
    raise exception 'Vous ne pouvez pas ouvrir de dossier dans ce cabinet.' using errcode = '42501';
  end if;
  select * into v_c from public.tamila_coffres where client_id = p_client;
  if not found or v_c.statut = 'local' then
    raise exception 'Ce cabinet chiffre sous sa phrase : la clé se tire dans le navigateur.' using errcode = '55000';
  end if;
  insert into public.tamila_coffre_journal (client_id, dossier_id, pour, demandeur)
  values (p_client, v_dossier, 'nouvelle_cle', v_uid)
  returning id into v_journal;
  return jsonb_build_object('client', p_client, 'dossier', v_dossier, 'journal', v_journal, 'region', v_c.region,
                            'cle_maitre', v_c.cle_maitre, 'reference', private.tamila_coffre_reference(v_c.region, v_c.cle_maitre));
end $function$;

-- Un membre qui voit le dossier : l'enveloppe Scaleway, pour que l'ouvrier la déballe. Un dossier local
-- rend {fournisseur: local} et rien d'autre (le navigateur passe par tamila_cle_dossier et la phrase).
create or replace function private.tamila_coffre_pour_membre(p_dossier uuid, p_piece uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_k public.tamila_cles;
  v_c public.tamila_coffres;
  v_journal bigint;
begin
  if v_uid is null then
    raise exception 'La clé d''un dossier se remet à une personne connectée.' using errcode = '42501';
  end if;
  select * into v_d from public.tamila_dossiers where id = p_dossier;
  if not found or not private.tamila_voit_dossier_pour(v_uid, v_d.client_id, p_dossier::text) then
    raise exception 'Ce dossier ne vous est pas ouvert.' using errcode = '42501';
  end if;
  if v_d.statut not in ('attente', 'ouvert', 'audit', 'clos') then
    raise exception 'Ce dossier n''a plus de contenu.' using errcode = '55000';
  end if;
  if p_piece is not null and not exists (select 1 from public.pieces pc where pc.id = p_piece and pc.client_id = v_d.client_id
                                           and pc.objet_type = 'tamila_dossier' and pc.objet_id = p_dossier::text) then
    raise exception 'Cette pièce n''est pas dans le dossier.' using errcode = '22023';
  end if;
  select * into v_k from public.tamila_cles k where k.dossier_id = p_dossier and k.statut = 'active';
  if not found then
    return null;
  end if;
  if v_k.fournisseur = 'local' then
    return jsonb_build_object('dossier', p_dossier, 'fournisseur', 'local');
  end if;
  select * into v_c from public.tamila_coffres where client_id = v_d.client_id;
  perform private.tracer_lecture(v_d.client_id, 'tamila_dossier', p_dossier::text, 'cle');
  insert into public.tamila_coffre_journal (client_id, dossier_id, piece_id, pour, demandeur)
  values (v_d.client_id, p_dossier, p_piece, 'membre', v_uid)
  returning id into v_journal;
  return jsonb_build_object('dossier', p_dossier, 'fournisseur', 'scaleway', 'journal', v_journal, 'reference', v_k.reference,
                            'enveloppe', encode(v_k.enveloppe, 'hex'));
end $function$;

-- Le lecteur, pour une pièce qu'il a à lire : seulement une pièce Tamila chiffrée, reçue ou en lecture,
-- d'un dossier vivant. Un dossier local rend {fournisseur: local} (le lecteur clôt « chiffree_sans_coffre »).
create or replace function private.tamila_coffre_pour_lecteur(p_piece uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_p public.pieces;
  v_d public.tamila_dossiers;
  v_k public.tamila_cles;
  v_journal bigint;
begin
  if not private.tamila_coffre_serveur() then
    raise exception 'Le lecteur passe par le serveur.' using errcode = '42501';
  end if;
  select * into v_p from public.pieces where id = p_piece;
  if not found then
    raise exception 'Pièce introuvable.' using errcode = 'P0002';
  end if;
  if v_p.module <> 'tamila' or v_p.objet_type is distinct from 'tamila_dossier' or v_p.chiffrement is distinct from 'dossier:v1' then
    raise exception 'Le coffre ne sert que les pièces chiffrées des dossiers Tamila.' using errcode = '22023';
  end if;
  if v_p.statut not in ('recue', 'en_lecture') then
    raise exception 'Cette pièce n''est pas à lire (%).', v_p.statut using errcode = '55000';
  end if;
  select * into v_d from public.tamila_dossiers where id = private.tamila_uuid(v_p.objet_id) and client_id = v_p.client_id;
  if not found or v_d.statut not in ('ouvert', 'audit') then
    raise exception 'Le dossier de cette pièce n''est pas ouvert.' using errcode = '55000';
  end if;
  select * into v_k from public.tamila_cles k where k.dossier_id = v_d.id and k.statut = 'active';
  if not found then
    raise exception 'Le dossier n''a plus de clé active.' using errcode = '55000';
  end if;
  if v_k.fournisseur = 'local' then
    return jsonb_build_object('piece', p_piece, 'dossier', v_d.id, 'fournisseur', 'local');
  end if;
  insert into public.tamila_coffre_journal (client_id, dossier_id, piece_id, pour)
  values (v_d.client_id, v_d.id, p_piece, 'lecteur')
  returning id into v_journal;
  return jsonb_build_object('piece', p_piece, 'dossier', v_d.id, 'fournisseur', 'scaleway', 'journal', v_journal,
                            'reference', v_k.reference, 'enveloppe', encode(v_k.enveloppe, 'hex'));
end $function$;

-- L'issue d'une remise, rendue par l'ouvrier : une fois, dans l'heure.
create or replace function private.tamila_coffre_conclure(p_journal bigint, p_issue text, p_detail jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_j public.tamila_coffre_journal;
begin
  if not private.tamila_coffre_serveur() then
    raise exception 'L''issue d''un déballage est rendue par le serveur.' using errcode = '42501';
  end if;
  if p_issue is null or p_issue not in ('deballe', 'emise', 'refuse', 'echec') then
    raise exception 'Issue inconnue : %.', coalesce(p_issue, 'vide') using errcode = '22023';
  end if;
  select * into v_j from public.tamila_coffre_journal where id = p_journal for update;
  if not found then
    raise exception 'Remise introuvable.' using errcode = 'P0002';
  end if;
  if v_j.issue <> 'demande' then
    raise exception 'Cette remise a déjà son issue (%).', v_j.issue using errcode = '55000';
  end if;
  if (p_issue = 'emise' and v_j.pour <> 'nouvelle_cle') or (v_j.pour = 'nouvelle_cle' and p_issue not in ('emise', 'echec')) then
    raise exception 'Une demande de nouvelle clé se conclut en clé émise ou en échec, et elle seule en clé émise.' using errcode = '22023';
  end if;
  update public.tamila_coffre_journal
     set issue = p_issue, conclu_le = now(), detail = v_j.detail || coalesce(p_detail, '{}'::jsonb)
   where id = p_journal;
  if p_issue = 'echec' then
    perform private.lever_alerte_module(v_j.client_id, 'tamila', 'critique',
      'Le coffre à clés n''a pas pu déballer une clé de dossier',
      jsonb_build_object('dossier', v_j.dossier_id, 'piece', v_j.piece_id, 'pour', v_j.pour, 'journal', v_j.id),
      'coffre_echec:' || v_j.dossier_id::text, false, null);
  end if;
end $function$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Le ré-enveloppement local → scaleway (la clé ne change pas, son enveloppe si)
-- ════════════════════════════════════════════════════════════════════════════════════════════

-- 1. La personne qui a la phrase (gérant, associé ou responsable, et qui voit le dossier) déballe la clé
--    dans son navigateur et l'envoie à l'ouvrier. La porte rend le témoin (la référence chiffrée du
--    dossier) : l'ouvrier vérifie que la clé reçue l'ouvre (étiquette GCM) avant de l'envelopper.
create or replace function private.tamila_coffre_a_reenvelopper(p_dossier uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_k public.tamila_cles;
  v_c public.tamila_coffres;
  v_journal bigint;
begin
  if v_uid is null then
    raise exception 'Une clé se ré-enveloppe par une personne connectée.' using errcode = '42501';
  end if;
  select * into v_d from public.tamila_dossiers where id = p_dossier;
  if not found or not private.tamila_voit_dossier_pour(v_uid, v_d.client_id, p_dossier::text)
     or not (private.a_un_role(v_d.client_id, array['gerant', 'admin']) or v_d.responsable_id = v_uid) then
    raise exception 'Le ré-enveloppement d''un dossier est fait par un associé ou son responsable, qui le voit.' using errcode = '42501';
  end if;
  if v_d.statut not in ('attente', 'ouvert', 'audit', 'clos') then
    raise exception 'Ce dossier n''a plus de contenu.' using errcode = '55000';
  end if;
  select * into v_c from public.tamila_coffres where client_id = v_d.client_id;
  if not found or v_c.statut = 'local' then
    raise exception 'Le coffre du cabinet n''est pas activé.' using errcode = '55000';
  end if;
  select * into v_k from public.tamila_cles k where k.dossier_id = p_dossier and k.statut = 'active';
  if not found then
    raise exception 'Le dossier n''a plus de clé active.' using errcode = '55000';
  end if;
  if v_k.fournisseur <> 'local' then
    return jsonb_build_object('dossier', p_dossier, 'deja', true);
  end if;
  insert into public.tamila_coffre_journal (client_id, dossier_id, pour, demandeur)
  values (v_d.client_id, p_dossier, 'reenveloppement', v_uid)
  returning id into v_journal;
  return jsonb_build_object('dossier', p_dossier, 'deja', false, 'journal', v_journal, 'region', v_c.region,
                            'cle_maitre', v_c.cle_maitre, 'temoin', encode(v_d.reference_chiffree, 'hex'));
end $function$;

-- 2. L'ouvrier rend l'enveloppe Scaleway de la même clé : la ligne tamila_cles passe à scaleway, les
--    pièces restées « recue » repartent à la lecture, le coffre finit sa bascule quand plus aucun dossier
--    n'est local.
create or replace function private.tamila_coffre_reenveloppe(p_journal bigint, p_enveloppe bytea)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_j public.tamila_coffre_journal;
  v_c public.tamila_coffres;
  v_k public.tamila_cles;
  v_relances integer := 0;
  v_locaux bigint;
  r record;
begin
  if not private.tamila_coffre_serveur() then
    raise exception 'Une enveloppe Scaleway est posée par le serveur, depuis le coffre.' using errcode = '42501';
  end if;
  select * into v_j from public.tamila_coffre_journal where id = p_journal for update;
  if not found or v_j.pour <> 'reenveloppement' then
    raise exception 'Demande de ré-enveloppement introuvable.' using errcode = 'P0002';
  end if;
  if v_j.issue <> 'demande' then
    raise exception 'Cette demande a déjà son issue (%).', v_j.issue using errcode = '55000';
  end if;
  if v_j.demande_le < now() - interval '1 hour' then
    raise exception 'La demande de ré-enveloppement a plus d''une heure : recommencez.' using errcode = '55000';
  end if;
  if p_enveloppe is null or octet_length(p_enveloppe) < 16 or octet_length(p_enveloppe) > 4096 then
    raise exception 'Enveloppe illisible.' using errcode = '22023';
  end if;
  select * into v_c from public.tamila_coffres where client_id = v_j.client_id for update;
  if not found or v_c.statut = 'local' then
    raise exception 'Le coffre du cabinet n''est pas activé.' using errcode = '55000';
  end if;
  select * into v_k from public.tamila_cles k where k.dossier_id = v_j.dossier_id and k.statut = 'active' for update;
  if not found or v_k.fournisseur <> 'local' then
    raise exception 'La clé de ce dossier n''est plus une clé locale active.' using errcode = '55000';
  end if;

  perform set_config('omega.tamila_reenveloppement', v_j.dossier_id::text, true);
  update public.tamila_cles
     set fournisseur = 'scaleway', reference = private.tamila_coffre_reference(v_c.region, v_c.cle_maitre), enveloppe = p_enveloppe
   where id = v_k.id;
  perform set_config('omega.tamila_reenveloppement', '', true);

  update public.tamila_coffre_journal
     set issue = 'reenveloppe', conclu_le = now(),
         detail = detail || jsonb_build_object('ancienne_empreinte', encode(sha256(v_k.enveloppe), 'hex'))
   where id = v_j.id;

  -- Les pièces que le lecteur a laissées faute de coffre repartent à la lecture.
  for r in
    select pc.id from public.pieces pc
     where pc.client_id = v_j.client_id and pc.module = 'tamila' and pc.objet_type = 'tamila_dossier'
       and pc.objet_id = v_j.dossier_id::text and pc.chiffrement = 'dossier:v1' and pc.statut = 'recue'
  loop
    perform private.deposer_travail(v_j.client_id, 'tamila', 'lecteur.lire', jsonb_build_object('piece', r.id),
                                    'piece:' || r.id::text, 0::smallint);
    v_relances := v_relances + 1;
  end loop;

  select count(*) into v_locaux from public.tamila_cles k where k.client_id = v_j.client_id and k.statut = 'active' and k.fournisseur = 'local';
  if v_locaux = 0 and v_c.statut = 'bascule' then
    update public.tamila_coffres set statut = 'scaleway', bascule_finie_le = now(), maj_le = now() where client_id = v_j.client_id;
  end if;
  perform private.journaliser_module(v_j.client_id, 'tamila', 'tamila.cle.reenveloppee', 'tamila_dossier', v_j.dossier_id::text,
    jsonb_build_object('journal', v_j.id, 'par', v_j.demandeur, 'pieces_relancees', v_relances, 'dossiers_locaux', v_locaux));
  return jsonb_build_object('dossier', v_j.dossier_id, 'pieces_relancees', v_relances, 'dossiers_locaux', v_locaux,
                            'statut', case when v_locaux = 0 then 'scaleway' else v_c.statut end);
end $function$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Les gardes de tamila_cles
-- ════════════════════════════════════════════════════════════════════════════════════════════

-- Reprise de la garde du socle, à l'identique, plus une seule exception : le ré-enveloppement local →
-- scaleway d'une clé active, posé par tamila_coffre_reenveloppe pour ce dossier-là.
create or replace function private.tamila_garder_cle()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  if tg_op <> 'UPDATE' then
    if old.client_id::text = coalesce(current_setting('omega.effacement_client', true), '') then
      return old;
    end if;
    raise exception 'Une clé de dossier ne se supprime pas : elle se détruit au coffre, et la preuve reste.'
      using errcode = '42501';
  end if;
  if coalesce(current_setting('omega.tamila_reenveloppement', true), '') = old.dossier_id::text
     and old.fournisseur = 'local' and new.fournisseur = 'scaleway'
     and old.statut = 'active' and new.statut = 'active'
     and (new.id, new.client_id, new.dossier_id, new.algorithme, new.creee_le)
         is not distinct from (old.id, old.client_id, old.dossier_id, old.algorithme, old.creee_le)
     and new.reference ~ '^scaleway:[a-z]{2}-[a-z]{3}:[0-9a-f-]{36}$' then
    return new;
  end if;
  if (new.id, new.client_id, new.dossier_id, new.fournisseur, new.reference, new.algorithme, new.creee_le)
     is distinct from (old.id, old.client_id, old.dossier_id, old.fournisseur, old.reference, old.algorithme, old.creee_le) then
    raise exception 'Une clé de dossier ne se retouche pas.' using errcode = '42501';
  end if;
  if new.statut is distinct from old.statut and not (
       (old.statut = 'active' and new.statut = 'desactivee')
    or (old.statut = 'desactivee' and new.statut = 'detruite')) then
    raise exception 'Passage refusé : % vers %.', old.statut, new.statut using errcode = '23514';
  end if;
  if new.enveloppe is distinct from old.enveloppe and new.statut <> 'detruite' then
    raise exception 'L''enveloppe d''une clé ne change qu''à sa destruction.' using errcode = '42501';
  end if;
  return new;
end $function$;

-- Une clé qui naît : celle du coffre du cabinet.
create or replace function private.tamila_cle_conforme()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_c public.tamila_coffres;
begin
  select * into v_c from public.tamila_coffres where client_id = new.client_id;
  if not found or v_c.statut = 'local' then
    if new.fournisseur <> 'local' then
      raise exception 'Ce cabinet n''a pas de coffre Scaleway : la clé du dossier est enveloppée sous sa phrase.' using errcode = '22023';
    end if;
    return new;
  end if;
  if new.fournisseur <> 'scaleway' or new.reference <> private.tamila_coffre_reference(v_c.region, v_c.cle_maitre) then
    raise exception 'Ce cabinet est passé au coffre : la clé d''un nouveau dossier vient de sa clé maître.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.tamila_coffre_journal j
                  where j.client_id = new.client_id and j.dossier_id = new.dossier_id and j.pour = 'nouvelle_cle'
                    and j.issue in ('demande', 'emise') and j.demandeur = (select auth.uid())
                    and j.demande_le > now() - interval '1 hour') then
    raise exception 'Cette clé n''a pas été émise par le coffre pour ce dossier.' using errcode = '42501';
  end if;
  return new;
end $function$;

create or replace trigger tamila_cles_conforme
  before insert on public.tamila_cles
  for each row execute function private.tamila_cle_conforme();

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Les portes publiques et les droits
-- ════════════════════════════════════════════════════════════════════════════════════════════

create or replace function public.tamila_coffre_etat(p_client uuid) returns jsonb
language sql stable set search_path to '' as $function$ select private.tamila_coffre_etat(p_client) $function$;

create or replace function public.tamila_coffre_demander_activation(p_client uuid) returns jsonb
language sql set search_path to '' as $function$ select private.tamila_coffre_demander_activation(p_client) $function$;

create or replace function public.tamila_coffre_activer(p_client uuid, p_region text, p_cle_maitre text, p_par uuid) returns jsonb
language sql set search_path to '' as $function$ select private.tamila_coffre_activer(p_client, p_region, p_cle_maitre, p_par) $function$;

create or replace function public.tamila_coffre_pour_nouvelle_cle(p_client uuid) returns jsonb
language sql set search_path to '' as $function$ select private.tamila_coffre_pour_nouvelle_cle(p_client) $function$;

create or replace function public.tamila_coffre_pour_membre(p_dossier uuid, p_piece uuid default null) returns jsonb
language sql set search_path to '' as $function$ select private.tamila_coffre_pour_membre(p_dossier, p_piece) $function$;

create or replace function public.tamila_coffre_pour_lecteur(p_piece uuid) returns jsonb
language sql set search_path to '' as $function$ select private.tamila_coffre_pour_lecteur(p_piece) $function$;

create or replace function public.tamila_coffre_conclure(p_journal bigint, p_issue text, p_detail jsonb default '{}'::jsonb) returns void
language sql set search_path to '' as $function$ select private.tamila_coffre_conclure(p_journal, p_issue, p_detail) $function$;

create or replace function public.tamila_coffre_a_reenvelopper(p_dossier uuid) returns jsonb
language sql set search_path to '' as $function$ select private.tamila_coffre_a_reenvelopper(p_dossier) $function$;

create or replace function public.tamila_coffre_reenveloppe(p_journal bigint, p_enveloppe bytea) returns jsonb
language sql set search_path to '' as $function$ select private.tamila_coffre_reenveloppe(p_journal, p_enveloppe) $function$;

revoke execute on function private.tamila_coffre_serveur() from public;
revoke execute on function private.tamila_coffre_reference(text, text) from public;
revoke execute on function private.tamila_coffre_etat(uuid) from public;
revoke execute on function private.tamila_coffre_demander_activation(uuid) from public;
revoke execute on function private.tamila_coffre_activer(uuid, text, text, uuid) from public;
revoke execute on function private.tamila_coffre_pour_nouvelle_cle(uuid) from public;
revoke execute on function private.tamila_coffre_pour_membre(uuid, uuid) from public;
revoke execute on function private.tamila_coffre_pour_lecteur(uuid) from public;
revoke execute on function private.tamila_coffre_conclure(bigint, text, jsonb) from public;
revoke execute on function private.tamila_coffre_a_reenvelopper(uuid) from public;
revoke execute on function private.tamila_coffre_reenveloppe(bigint, bytea) from public;
revoke execute on function private.tamila_cle_conforme() from public;

revoke execute on function public.tamila_coffre_etat(uuid) from public, anon;
revoke execute on function public.tamila_coffre_demander_activation(uuid) from public, anon;
revoke execute on function public.tamila_coffre_activer(uuid, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.tamila_coffre_pour_nouvelle_cle(uuid) from public, anon;
revoke execute on function public.tamila_coffre_pour_membre(uuid, uuid) from public, anon;
revoke execute on function public.tamila_coffre_pour_lecteur(uuid) from public, anon, authenticated;
revoke execute on function public.tamila_coffre_conclure(bigint, text, jsonb) from public, anon, authenticated;
revoke execute on function public.tamila_coffre_a_reenvelopper(uuid) from public, anon;
revoke execute on function public.tamila_coffre_reenveloppe(bigint, bytea) from public, anon, authenticated;

-- Les personnes connectées : l'état, l'activation demandée, la nouvelle clé, la clé d'un membre, le ré-enveloppement demandé.
grant execute on function public.tamila_coffre_etat(uuid) to authenticated, service_role;
grant execute on function private.tamila_coffre_etat(uuid) to authenticated, service_role;
grant execute on function public.tamila_coffre_demander_activation(uuid) to authenticated;
grant execute on function private.tamila_coffre_demander_activation(uuid) to authenticated;
grant execute on function public.tamila_coffre_pour_nouvelle_cle(uuid) to authenticated;
grant execute on function private.tamila_coffre_pour_nouvelle_cle(uuid) to authenticated;
grant execute on function public.tamila_coffre_pour_membre(uuid, uuid) to authenticated;
grant execute on function private.tamila_coffre_pour_membre(uuid, uuid) to authenticated;
grant execute on function public.tamila_coffre_a_reenvelopper(uuid) to authenticated;
grant execute on function private.tamila_coffre_a_reenvelopper(uuid) to authenticated;
-- Le serveur (l'ouvrier tamila-coffre) : l'activation, la remise au lecteur, l'issue, la nouvelle enveloppe.
grant execute on function public.tamila_coffre_activer(uuid, text, text, uuid) to service_role;
grant execute on function private.tamila_coffre_activer(uuid, text, text, uuid) to service_role;
grant execute on function public.tamila_coffre_pour_lecteur(uuid) to service_role;
grant execute on function private.tamila_coffre_pour_lecteur(uuid) to service_role;
grant execute on function public.tamila_coffre_conclure(bigint, text, jsonb) to service_role;
grant execute on function private.tamila_coffre_conclure(bigint, text, jsonb) to service_role;
grant execute on function public.tamila_coffre_reenveloppe(bigint, bytea) to service_role;
grant execute on function private.tamila_coffre_reenveloppe(bigint, bytea) to service_role;
-- Les outils : appelés seulement depuis des fonctions security definer (et le déclencheur), donc jamais par authenticated (test socle 44).
grant execute on function private.tamila_coffre_serveur() to service_role;
grant execute on function private.tamila_coffre_reference(text, text) to service_role;
grant execute on function private.tamila_cle_conforme() to authenticated, service_role;

comment on function public.tamila_coffre_pour_membre(uuid, uuid) is
  'Tamila (B4, b4_05) : à un membre qui voit le dossier, l''enveloppe Scaleway de sa clé (pour l''ouvrier tamila-coffre), remise journalisée ; {fournisseur: local} pour un dossier local.';
comment on function public.tamila_coffre_pour_lecteur(uuid) is
  'Tamila (B4, b4_05) : au serveur, pour le lecteur, l''enveloppe Scaleway de la clé du dossier d''une pièce à lire ; remise journalisée.';
comment on function public.tamila_coffre_reenveloppe(bigint, bytea) is
  'Tamila (B4, b4_05) : le serveur pose l''enveloppe Scaleway d''une clé locale (même clé, nouvelle enveloppe) ; les pièces non lues repartent à la lecture.';
