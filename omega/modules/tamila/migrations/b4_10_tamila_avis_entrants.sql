-- b4_10 — Tamila : les avis RPVA reçus par courriel, à rattacher (session B4, 06/10/2026, vague 3, n° 3, porte d'entrée).
--
-- LA DÉCISION (coordinateur, délégation de Teo, 06/10) : pas d'API e-barreau ouverte, on n'en invente pas. Le cabinet
-- fait suivre ses notifications e-barreau vers une adresse du type cabinet-x@recu.omegaai.fr (ligne public.expediteurs,
-- canal email, module tamila) ; l'inbound Brevo du socle (A2) dépose la réception (public.receptions) et ses pièces
-- jointes au bucket sous <client>/receptions/… ; deposer_reception publie « reception.nouvelle ».
--
-- CE QUE ÇA POSE.
--   · Abonnement reception.nouvelle → tamila (genre tamila.reception) ; private.tamila_receptions_passage() (cron
--     toutes les 5 minutes) : chaque réception du module tamila entre dans la file tamila_avis_entrants, avec le TYPE
--     SUPPOSÉ (un code, tiré du sujet) et sa date ; rien d'autre, aucun clair n'est recopié dans Tamila. Les associés
--     et les avocats reçoivent une alerte « avis à rattacher ». Le même passage fait expirer ce qui attend depuis
--     sept jours (alerte, puis purge).
--   · Le RAPPROCHEMENT se fait dans le navigateur : il lit la réception (RLS du socle), en tire le n° RG, et le compare
--     aux n° RG qu'il sait déchiffrer ; la base ne voit jamais le RG en clair côté Tamila.
--   · Le RATTACHEMENT : l'avocat choisit le dossier ; le navigateur chiffre chaque pièce jointe avec la clé du dossier
--     et la dépose (tamila_deposer_piece, b4_01) ; puis tamila_rattacher_avis(entrant, dossier, pièces) : la file note
--     le rattachement et la PURGE commence : la réception perd sujet, corps et nom de l'expéditeur (statut traitee),
--     et un travail tamila.purger_reception est déposé pour l'ouvrier tamila-purge, qui efface les fichiers au bucket
--     (API Storage) puis appelle tamila_reception_purgee. Aucune suppression SQL : des mises à jour et une porte.
--   · tamila_ecarter_avis(entrant, motif) : pas un avis, doublon… : même purge.
--   · Mention honnête (écran) : l'avis transite en clair chez le prestataire de courriel et dans la réception le temps
--     du rattachement, au plus sept jours.
--
-- Rien n'est effacé : create table if not exists, create or replace. Fonctions private : revoke from public.

create table if not exists public.tamila_avis_entrants (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  reception_id bigint not null,
  recu_le timestamptz not null,
  type_suppose text,
  nb_pieces integer not null default 0,
  statut text not null default 'a_rattacher',
  dossier_id uuid,
  pieces uuid[] not null default '{}',
  decide_par uuid,
  decide_le timestamptz,
  motif text,
  expire_le timestamptz not null,
  purge_demandee_le timestamptz,
  purgee_le timestamptz,
  cree_le timestamptz not null default now(),
  constraint tamila_avis_entrants_reception unique (reception_id),
  constraint tamila_avis_entrants_statut_check check (statut in ('a_rattacher', 'rattache', 'ecarte', 'expire')),
  constraint tamila_avis_entrants_type_check check (type_suppose ~ '^rpva_[a-z0-9_]{2,40}$'),
  constraint tamila_avis_entrants_motif_check check (motif ~ '^[a-z][a-z_]{2,40}$'),
  constraint tamila_avis_entrants_rattache check ((statut = 'rattache') = (dossier_id is not null))
);
create index if not exists tamila_avis_entrants_file on public.tamila_avis_entrants (client_id, statut, recu_le desc);

comment on table public.tamila_avis_entrants is
  'Tamila (B4, b4_10) : la file des avis RPVA reçus par courriel, à rattacher à un dossier ; aucun clair (type supposé en code, dates, identifiants).';

do $droits$
begin
  alter table public.tamila_avis_entrants enable row level security;
  revoke all on table public.tamila_avis_entrants from anon, authenticated, service_role;
  grant select on table public.tamila_avis_entrants to authenticated;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tamila_avis_entrants'
                   and policyname = 'qui ouvre des dossiers voit la file des avis') then
    create policy "qui ouvre des dossiers voit la file des avis" on public.tamila_avis_entrants for select to authenticated
      using (private.a_un_role(client_id, array['gerant', 'admin', 'valideur', 'collaborateur']));
  end if;
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select 'tamila_avis_entrants'
               where not exists (select 1 from private.tables_locataires t where t.nom = 'tamila_avis_entrants')$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
  if to_regclass('private.abonnements') is not null and not exists (
       select 1 from private.abonnements a where a.evenement = 'reception.nouvelle' and a.module = 'tamila' and a.genre = 'tamila.reception') then
    insert into private.abonnements (evenement, module, genre) values ('reception.nouvelle', 'tamila', 'tamila.reception');
  end if;
end $droits$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- L'entrée dans la file
-- ════════════════════════════════════════════════════════════════════════════════════════════

-- Le type d'avis, supposé d'après le sujet du courriel e-barreau (l'avocat le confirme en rattachant ; le lecteur le
-- relira dans la pièce). Rend un code, jamais le sujet.
create or replace function private.tamila_type_suppose(p_sujet text)
returns text
language sql
immutable
set search_path to ''
as $function$
  select case
    when s ~ 'accus[eé] de (d[eé]p[oô]t|r[eé]ception)' then 'rpva_accuse_depot'
    when s ~ 'fixation' or s ~ 'bref d[eé]lai' then 'rpva_avis_fixation'
    when s ~ '902' or s ~ 'signifier la d[eé]claration' then 'rpva_avis_902'
    when s ~ 'ordonnance' or s ~ 'mise en [eé]tat' or s ~ 'calendrier' then 'rpva_ordonnance_mee'
    when s ~ 'audience' or s ~ 'convocation' or s ~ 'renvoi' then 'rpva_avis_audience'
    when s ~ 'appel incident' then 'rpva_appel_incident'
    when s ~ 'intervention' then 'rpva_intervention'
    when s ~ 'interruption' or s ~ 'radiation' or s ~ 'sursis' then 'rpva_interruption'
    when s ~ 'conclusions' then 'rpva_conclusions'
    when s ~ 'd[eé]claration d.appel' then 'rpva_declaration_appel'
  end
  from (select lower(coalesce(p_sujet, '')) as s) x
$function$;

-- Une réception du module tamila entre dans la file (idempotent).
create or replace function private.tamila_recevoir(p_reception bigint)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_r public.receptions;
  v_id uuid;
begin
  select * into v_r from public.receptions where id = p_reception;
  if not found then
    return jsonb_build_object('ignore', 'réception introuvable');
  end if;
  if v_r.module is distinct from 'tamila' then
    return jsonb_build_object('ignore', 'réception d''un autre module');
  end if;
  if not exists (select 1 from public.tamila_reglages g where g.client_id = v_r.client_id) then
    return jsonb_build_object('ignore', 'Tamila n''est pas installé');
  end if;
  insert into public.tamila_avis_entrants (client_id, reception_id, recu_le, type_suppose, nb_pieces, expire_le)
  values (v_r.client_id, v_r.id, v_r.recu_le, private.tamila_type_suppose(v_r.sujet),
          coalesce(jsonb_array_length(case when jsonb_typeof(v_r.pieces) = 'array' then v_r.pieces end), 0),
          v_r.recu_le + interval '7 days')
  on conflict (reception_id) do nothing
  returning id into v_id;
  if v_id is null then
    return jsonb_build_object('deja', true);
  end if;
  update public.receptions set statut = 'lue', maj_le = now() where id = v_r.id and statut = 'nouvelle';
  perform private.lever_alerte_module(v_r.client_id, 'tamila', 'attention',
    'Un avis RPVA est arrivé par courriel : rattachez-le à son dossier',
    jsonb_build_object('entrant', v_id, 'lien', '/espace/tamila'), 'avis_entrant', true, null);
  return jsonb_build_object('entrant', v_id);
end $function$;

-- La purge de la copie en clair : la réception perd sujet, corps et nom de l'expéditeur ; l'ouvrier tamila-purge
-- efface ensuite les fichiers au bucket.
create or replace function private.tamila_purger_reception(p_entrant uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_e public.tamila_avis_entrants;
begin
  select * into v_e from public.tamila_avis_entrants where id = p_entrant for update;
  update public.receptions
     set statut = 'traitee', sujet = null, corps = null, corps_html = null, de_nom = null, de_adresse = null, maj_le = now()
   where id = v_e.reception_id;
  update public.tamila_avis_entrants set purge_demandee_le = now() where id = p_entrant;
  perform private.deposer_travail(v_e.client_id, 'tamila', 'tamila.purger_reception', jsonb_build_object('reception', v_e.reception_id),
                                  'purge:' || v_e.reception_id::text, 0::smallint);
end $function$;

-- Le passage (cron) : les réceptions nouvelles entrent dans la file ; ce qui attend depuis sept jours expire.
create or replace function private.tamila_receptions_passage()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  t public.travaux;
  r record;
  v_res jsonb;
  n integer := 0;
  n_erreurs integer := 0;
  n_expires integer := 0;
begin
  for t in select * from private.prendre_travaux(array['tamila.reception'], 200, interval '10 minutes', 'tamila_receptions') loop
    begin
      v_res := private.tamila_recevoir((t.charge ->> 'reception')::bigint);
      perform private.finir_travail(t.id, v_res);
      n := n + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 2000));
      n_erreurs := n_erreurs + 1;
    end;
  end loop;
  for r in select e.id, e.client_id from public.tamila_avis_entrants e where e.statut = 'a_rattacher' and e.expire_le < now() for update skip locked loop
    update public.tamila_avis_entrants set statut = 'expire', decide_le = now(), motif = 'sept_jours_sans_rattachement' where id = r.id;
    perform private.tamila_purger_reception(r.id);
    perform private.lever_alerte_module(r.client_id, 'tamila', 'critique',
      'Un avis RPVA reçu par courriel n''a pas été rattaché en sept jours : sa copie est effacée, retrouvez-le sur e-barreau',
      jsonb_build_object('entrant', r.id), 'avis_expire:' || r.id::text, true, null);
    n_expires := n_expires + 1;
  end loop;
  return jsonb_build_object('receptions', n, 'erreurs', n_erreurs, 'expires', n_expires);
end $function$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Le rattachement et l'écartement (personnes connectées)
-- ════════════════════════════════════════════════════════════════════════════════════════════

create or replace function private.tamila_rattacher_avis(p_entrant uuid, p_dossier uuid, p_pieces uuid[])
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_e public.tamila_avis_entrants;
  v_d public.tamila_dossiers;
begin
  select * into v_e from public.tamila_avis_entrants where id = p_entrant for update;
  if not found then
    raise exception 'Avis introuvable.' using errcode = 'P0002';
  end if;
  if v_uid is null or not private.tamila_ecrit_dossier_pour(v_uid, v_e.client_id, p_dossier::text) then
    raise exception 'Un avis se rattache à un dossier où l''on écrit.' using errcode = '42501';
  end if;
  if v_e.statut <> 'a_rattacher' then
    raise exception 'Cet avis est déjà %.', v_e.statut using errcode = '55000';
  end if;
  select * into v_d from public.tamila_dossiers where id = p_dossier;
  if p_pieces is null or cardinality(p_pieces) < 1
     or exists (select 1 from unnest(p_pieces) x where not exists (
                  select 1 from public.pieces pc where pc.id = x and pc.client_id = v_e.client_id and pc.objet_type = 'tamila_dossier'
                    and pc.objet_id = p_dossier::text and pc.chiffrement = 'dossier:v1')) then
    raise exception 'Les pièces rattachées sont les pièces chiffrées déposées dans ce dossier.' using errcode = '22023';
  end if;
  update public.tamila_avis_entrants
     set statut = 'rattache', dossier_id = p_dossier, pieces = p_pieces, decide_par = v_uid, decide_le = now()
   where id = p_entrant;
  perform private.tamila_purger_reception(p_entrant);
  perform private.journaliser_module(v_e.client_id, 'tamila', 'tamila.avis_entrant.rattache', 'tamila_dossier', p_dossier::text,
    jsonb_build_object('entrant', p_entrant, 'reception', v_e.reception_id, 'pieces', to_jsonb(p_pieces), 'type_suppose', v_e.type_suppose));
  return jsonb_build_object('entrant', p_entrant, 'dossier', p_dossier, 'pieces', cardinality(p_pieces));
end $function$;

create or replace function private.tamila_ecarter_avis(p_entrant uuid, p_motif text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_e public.tamila_avis_entrants;
begin
  select * into v_e from public.tamila_avis_entrants where id = p_entrant for update;
  if not found then
    raise exception 'Avis introuvable.' using errcode = 'P0002';
  end if;
  if v_uid is null or not exists (select 1 from public.comptes c where c.user_id = v_uid and c.client_id = v_e.client_id
                                    and c.role in ('gerant', 'admin', 'valideur')) then
    raise exception 'Un avis s''écarte par un avocat du cabinet.' using errcode = '42501';
  end if;
  if v_e.statut <> 'a_rattacher' then
    raise exception 'Cet avis est déjà %.', v_e.statut using errcode = '55000';
  end if;
  if p_motif is null or p_motif !~ '^[a-z][a-z_]{2,40}$' then
    raise exception 'Le motif est un code (pas_un_avis, doublon, autre_cabinet…), jamais un texte libre.' using errcode = '22023';
  end if;
  update public.tamila_avis_entrants set statut = 'ecarte', motif = p_motif, decide_par = v_uid, decide_le = now() where id = p_entrant;
  perform private.tamila_purger_reception(p_entrant);
  perform private.journaliser_module(v_e.client_id, 'tamila', 'tamila.avis_entrant.ecarte', 'tamila_cabinet', v_e.client_id::text,
    jsonb_build_object('entrant', p_entrant, 'reception', v_e.reception_id, 'motif', p_motif));
end $function$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- L'ouvrier tamila-purge (serveur) : les fichiers à effacer, puis la purge constatée
-- ════════════════════════════════════════════════════════════════════════════════════════════

create or replace function private.tamila_reception_a_purger(p_reception bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_r public.receptions;
begin
  if not private.tamila_coffre_serveur() then
    raise exception 'La purge est faite par le serveur.' using errcode = '42501';
  end if;
  select * into v_r from public.receptions where id = p_reception;
  if not found or v_r.module is distinct from 'tamila'
     or not exists (select 1 from public.tamila_avis_entrants e where e.reception_id = p_reception and e.purge_demandee_le is not null) then
    raise exception 'Aucune purge demandée pour cette réception.' using errcode = '55000';
  end if;
  return jsonb_build_object('reception', p_reception, 'client', v_r.client_id,
    'chemins', coalesce((select jsonb_agg(p ->> 'chemin') from jsonb_array_elements(case when jsonb_typeof(v_r.pieces) = 'array' then v_r.pieces else '[]'::jsonb end) p
                         where p ->> 'chemin' like v_r.client_id::text || '/receptions/%'), '[]'::jsonb));
end $function$;

create or replace function private.tamila_reception_purgee(p_reception bigint, p_fichiers integer)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_e public.tamila_avis_entrants;
begin
  if not private.tamila_coffre_serveur() then
    raise exception 'La purge est constatée par le serveur.' using errcode = '42501';
  end if;
  select * into v_e from public.tamila_avis_entrants where reception_id = p_reception for update;
  if not found or v_e.purge_demandee_le is null then
    raise exception 'Aucune purge demandée pour cette réception.' using errcode = '55000';
  end if;
  update public.receptions set pieces = '[]'::jsonb, maj_le = now() where id = p_reception;
  update public.tamila_avis_entrants set purgee_le = now() where id = v_e.id;
  perform private.journaliser_module(v_e.client_id, 'tamila', 'tamila.avis_entrant.purge', 'tamila_cabinet', v_e.client_id::text,
    jsonb_build_object('entrant', v_e.id, 'reception', p_reception, 'fichiers', coalesce(p_fichiers, 0)));
end $function$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Les portes publiques, les droits, le cron
-- ════════════════════════════════════════════════════════════════════════════════════════════

create or replace function public.tamila_rattacher_avis(p_entrant uuid, p_dossier uuid, p_pieces uuid[]) returns jsonb
language sql set search_path to '' as $function$ select private.tamila_rattacher_avis(p_entrant, p_dossier, p_pieces) $function$;
create or replace function public.tamila_ecarter_avis(p_entrant uuid, p_motif text) returns void
language sql set search_path to '' as $function$ select private.tamila_ecarter_avis(p_entrant, p_motif) $function$;
create or replace function public.tamila_reception_a_purger(p_reception bigint) returns jsonb
language sql stable set search_path to '' as $function$ select private.tamila_reception_a_purger(p_reception) $function$;
create or replace function public.tamila_reception_purgee(p_reception bigint, p_fichiers integer) returns void
language sql set search_path to '' as $function$ select private.tamila_reception_purgee(p_reception, p_fichiers) $function$;

do $grants$
begin
  revoke execute on function private.tamila_type_suppose(text) from public;
  revoke execute on function private.tamila_recevoir(bigint) from public;
  revoke execute on function private.tamila_purger_reception(uuid) from public;
  revoke execute on function private.tamila_receptions_passage() from public;
  revoke execute on function private.tamila_rattacher_avis(uuid, uuid, uuid[]) from public;
  revoke execute on function private.tamila_ecarter_avis(uuid, text) from public;
  revoke execute on function private.tamila_reception_a_purger(bigint) from public;
  revoke execute on function private.tamila_reception_purgee(bigint, integer) from public;
  revoke execute on function public.tamila_rattacher_avis(uuid, uuid, uuid[]) from public, anon;
  revoke execute on function public.tamila_ecarter_avis(uuid, text) from public, anon;
  revoke execute on function public.tamila_reception_a_purger(bigint) from public, anon, authenticated;
  revoke execute on function public.tamila_reception_purgee(bigint, integer) from public, anon, authenticated;
  grant execute on function private.tamila_rattacher_avis(uuid, uuid, uuid[]) to authenticated;
  grant execute on function public.tamila_rattacher_avis(uuid, uuid, uuid[]) to authenticated;
  grant execute on function private.tamila_ecarter_avis(uuid, text) to authenticated;
  grant execute on function public.tamila_ecarter_avis(uuid, text) to authenticated;
  grant execute on function private.tamila_reception_a_purger(bigint) to service_role;
  grant execute on function public.tamila_reception_a_purger(bigint) to service_role;
  grant execute on function private.tamila_reception_purgee(bigint, integer) to service_role;
  grant execute on function public.tamila_reception_purgee(bigint, integer) to service_role;
  -- Le passage tourne en cron (postgres) ; l'entrée dans la file aussi.
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('tamila-receptions', '*/5 * * * *', 'select private.tamila_receptions_passage()');
  end if;
end $grants$;
