-- 19ap_widgets — socle : la messagerie instantanée du site d'un client (REPUT), entrée dans le même circuit que le reste.
-- A2, 06/10/2026, demandé par le coordinateur (promesse REPUT : « La messagerie instantanée du site est tenue aux mêmes
-- règles que le reste »). Numéro à confirmer par le coordinateur. Pose : recette, puis production.
-- Fonction Edge : omega/functions/widget/ (verify_jwt false). Guide : omega/GUIDE-WIDGET.md.
--
-- Un widget = une organisation, un module (reput par défaut), une CLÉ PUBLIQUE (« w_… », elle s'écrit dans la page du
-- site, ce n'est pas un secret) et la liste des ORIGINES autorisées (https://www.exemple.fr). Ce qui protège :
--   · l'origine du navigateur doit être dans la liste (un autre site ne peut pas l'utiliser depuis un navigateur) ;
--   · des plafonds : 10 messages par 10 minutes depuis une même adresse IP, 300 par jour pour le widget ;
--   · un champ piège et un délai minimal de saisie (contrôlés par la fonction) ;
--   · l'adresse IP n'est jamais gardée en clair (empreinte SHA-256 salée par jour, effacée après 2 jours).
-- Chaque message devient une réception (canal « formulaire », boîte « widget:<clé> », fil = la conversation) : la même
-- file, la même qualification, la même réponse (par e-mail ou SMS aux coordonnées laissées) que les autres canaux.
-- Idempotent ; aucun DROP ; aucune donnée retirée.

create table if not exists public.widgets (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  entite_id uuid,
  module text not null default 'reput',
  cle text not null,
  libelle text not null,
  origines text[] not null default '{}',
  couleur text not null default '#111111',
  accueil text not null default 'Bonjour ! Écrivez-nous, nous vous répondons rapidement.',
  actif boolean not null default true,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint widgets_pkey primary key (id),
  constraint widgets_client_id_id_key unique (client_id, id),
  constraint widgets_cle_key unique (cle),
  constraint widgets_cle_check check (cle ~ '^w_[a-z0-9]{20,40}$'),
  constraint widgets_module_check check (module ~ '^[a-z][a-z_]{1,29}$'),
  constraint widgets_libelle_check check (char_length(btrim(libelle)) between 1 and 120),
  constraint widgets_origines_check check (cardinality(origines) <= 20),
  constraint widgets_couleur_check check (couleur ~ '^#[0-9a-fA-F]{6}$'),
  constraint widgets_accueil_check check (char_length(accueil) between 1 and 300),
  constraint widgets_entite_fkey foreign key (client_id, entite_id) references public.entites (client_id, id)
);
comment on table public.widgets is
  'Lot 19ap : messageries instantanées des sites des clients (clé publique, origines autorisées). Écriture par les portes.';
alter table public.widgets enable row level security;
revoke all on table public.widgets from public, anon, authenticated;
grant select on table public.widgets to authenticated;
grant all on table public.widgets to service_role;

create table if not exists private.widgets_appels (
  id bigint generated always as identity primary key,
  widget_id uuid not null,
  ip_empreinte text not null,
  survenu_le timestamptz not null default now()
);
alter table private.widgets_appels enable row level security;
revoke all on table private.widgets_appels from public, anon, authenticated;
grant all on table private.widgets_appels to service_role;
create index if not exists widgets_appels_recents on private.widgets_appels (widget_id, survenu_le desc);
create index if not exists widgets_appels_ip on private.widgets_appels (widget_id, ip_empreinte, survenu_le desc);

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'widgets'
                 and policyname = 'gerants et admins voient les widgets') then
    create policy "gerants et admins voient les widgets" on public.widgets
      for select to authenticated using (private.a_un_role(client_id, array['gerant', 'admin']));
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.widgets'::regclass
                 and tgname = 'widgets_tracer' and not tgisinternal) then
    create trigger widgets_tracer after insert or delete or update on public.widgets
      for each row execute function private.tracer('+module', '+actif', '+origines');
  end if;
end $$;

-- Une origine s'écrit https://hote[:port], sans chemin ni barre finale ; http seulement pour localhost (essais).
create or replace function private.widget_origines_propres(p_origines text[])
returns text[] language plpgsql immutable set search_path to '' as $$
declare o text; r text[] := '{}';
begin
  foreach o in array coalesce(p_origines, '{}') loop
    o := lower(btrim(o));
    o := regexp_replace(o, '/+$', '');
    if o !~ '^https://[a-z0-9.-]+(:[0-9]{1,5})?$' and o !~ '^http://localhost(:[0-9]{1,5})?$' then
      raise exception 'Origine invalide : % (forme attendue : https://www.exemple.fr).', o using errcode = '22023';
    end if;
    if not (o = any (r)) then r := r || o; end if;
  end loop;
  return r;
end $$;
revoke all on function private.widget_origines_propres(text[]) from public, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- Portes de l'écran (gérant ou admin)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.widget_regler(p_client uuid, p_libelle text, p_origines text[], p_widget uuid default null,
                                                 p_couleur text default null, p_accueil text default null,
                                                 p_actif boolean default null, p_module text default 'reput')
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  w public.widgets;
  v_origines text[] := private.widget_origines_propres(p_origines);
begin
  if (select auth.uid()) is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Seuls un gérant ou un admin de l''organisation règlent la messagerie du site.' using errcode = '42501';
  end if;
  if p_widget is null then
    if (select count(*) from public.widgets x where x.client_id = p_client) >= 20 then
      raise exception 'Vingt messageries de site au plus par organisation.' using errcode = '54000';
    end if;
    insert into public.widgets (client_id, module, cle, libelle, origines, couleur, accueil, cree_par)
    values (p_client, coalesce(p_module, 'reput'), 'w_' || replace(gen_random_uuid()::text, '-', ''), btrim(p_libelle),
            v_origines, coalesce(p_couleur, '#111111'),
            coalesce(nullif(btrim(p_accueil), ''), 'Bonjour ! Écrivez-nous, nous vous répondons rapidement.'),
            (select auth.uid()))
    returning * into w;
  else
    update public.widgets
       set libelle = coalesce(nullif(btrim(p_libelle), ''), libelle), origines = v_origines,
           couleur = coalesce(p_couleur, couleur), accueil = coalesce(nullif(btrim(p_accueil), ''), accueil),
           actif = coalesce(p_actif, actif), maj_le = now()
     where id = p_widget and client_id = p_client
    returning * into w;
    if w.id is null then
      raise exception 'Messagerie de site introuvable.' using errcode = 'P0002';
    end if;
  end if;
  return jsonb_build_object('widget', w.id, 'cle', w.cle, 'origines', w.origines, 'actif', w.actif);
end $$;
revoke all on function private.widget_regler(uuid, text, text[], uuid, text, text, boolean, text) from public, anon;
grant execute on function private.widget_regler(uuid, text, text[], uuid, text, text, boolean, text) to authenticated, service_role;

create or replace function public.widget_regler(p_client uuid, p_libelle text, p_origines text[], p_widget uuid default null,
                                                p_couleur text default null, p_accueil text default null,
                                                p_actif boolean default null, p_module text default 'reput')
returns jsonb language sql set search_path to '' as $$
  select private.widget_regler(p_client, p_libelle, p_origines, p_widget, p_couleur, p_accueil, p_actif, p_module)
$$;
revoke all on function public.widget_regler(uuid, text, text[], uuid, text, text, boolean, text) from public, anon;
grant execute on function public.widget_regler(uuid, text, text[], uuid, text, text, boolean, text) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- Portes de la fonction (service_role seulement)
-- ───────────────────────────────────────────────────────────────────────────
-- Ce que le script affiche (aucune donnée de l'organisation au-delà) ; null si la clé est inconnue ou fermée.
create or replace function private.widget_apparence(p_cle text)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare w public.widgets;
begin
  perform private.exiger_ouvrier();
  select * into w from public.widgets x where x.cle = p_cle and x.actif;
  if w.id is null then return null; end if;
  return jsonb_build_object('libelle', w.libelle, 'couleur', w.couleur, 'accueil', w.accueil, 'origines', w.origines);
end $$;

create or replace function private.widget_deposer(p_cle text, p_origine text, p_ip_empreinte text, p_conversation uuid,
                                                  p_message uuid, p_texte text, p_nom text default null,
                                                  p_email text default null, p_telephone text default null,
                                                  p_page text default null, p_consentement boolean default false)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  w public.widgets;
  r jsonb;
begin
  perform private.exiger_ouvrier();
  select * into w from public.widgets x where x.cle = p_cle and x.actif;
  if w.id is null then
    return jsonb_build_object('statut', 'refuse', 'motif', 'cle');
  end if;
  if p_origine is null or not (lower(p_origine) = any (w.origines)) then
    return jsonb_build_object('statut', 'refuse', 'motif', 'origine');
  end if;
  if nullif(btrim(p_texte), '') is null or char_length(p_texte) > 5000 then
    return jsonb_build_object('statut', 'refuse', 'motif', 'message');
  end if;
  if nullif(btrim(p_email), '') is null and nullif(btrim(p_telephone), '') is null then
    return jsonb_build_object('statut', 'refuse', 'motif', 'coordonnees');
  end if;
  -- Un message déjà reçu (même identifiant) : réponse identique, sans compter un appel de plus.
  if exists (select 1 from public.receptions x where x.client_id = w.client_id and x.canal = 'formulaire'
             and x.identifiant_externe = 'widget:' || p_message::text) then
    return jsonb_build_object('statut', 'recu', 'deja', true);
  end if;
  if (select count(*) from private.widgets_appels a where a.widget_id = w.id and a.ip_empreinte = p_ip_empreinte
      and a.survenu_le > now() - interval '10 minutes') >= 10
     or (select count(*) from private.widgets_appels a where a.widget_id = w.id
         and a.survenu_le > now() - interval '1 day') >= 300 then
    return jsonb_build_object('statut', 'refuse', 'motif', 'plafond');
  end if;
  insert into private.widgets_appels (widget_id, ip_empreinte) values (w.id, left(p_ip_empreinte, 64));
  delete from private.widgets_appels where survenu_le < now() - interval '2 days';

  r := private.deposer_reception(
    w.client_id, 'formulaire', 'widget:' || w.cle, 'widget:' || p_message::text,
    nullif(lower(btrim(p_email)), ''), left(nullif(btrim(p_nom), ''), 200),
    left('Messagerie du site' || coalesce(' — ' || nullif(btrim(p_nom), ''), ''), 200),
    left(p_texte, 5000), null, '[]'::jsonb,
    jsonb_strip_nulls(jsonb_build_object(
      'module', w.module, 'entite_id', w.entite_id, 'fil', 'widget:' || p_conversation::text,
      'source', 'messagerie_site', 'widget', w.cle, 'conversation', p_conversation,
      'telephone', left(nullif(btrim(p_telephone), ''), 40), 'page', left(p_page, 500),
      'consentement', coalesce(p_consentement, false), 'origine', lower(p_origine))),
    now());
  return jsonb_build_object('statut', 'recu', 'reception', r -> 'id');
end $$;

create or replace function public.widget_apparence(p_cle text)
returns jsonb language sql stable set search_path to '' as $$ select private.widget_apparence(p_cle) $$;
create or replace function public.widget_deposer(p_cle text, p_origine text, p_ip_empreinte text, p_conversation uuid,
                                                 p_message uuid, p_texte text, p_nom text default null,
                                                 p_email text default null, p_telephone text default null,
                                                 p_page text default null, p_consentement boolean default false)
returns jsonb language sql set search_path to '' as $$
  select private.widget_deposer(p_cle, p_origine, p_ip_empreinte, p_conversation, p_message, p_texte, p_nom, p_email,
                                p_telephone, p_page, p_consentement)
$$;

do $$
declare f text;
begin
  foreach f in array array['widget_apparence(text)',
    'widget_deposer(text, text, text, uuid, uuid, text, text, text, text, text, boolean)']
  loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
    execute format('revoke all on function private.%s from public, anon, authenticated', f);
    execute format('grant execute on function private.%s to service_role', f);
  end loop;
end $$;

select (select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'widgets') as widgets,
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname like 'widget\_%') as portes_publiques;
