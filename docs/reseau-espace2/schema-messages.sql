-- ══════════════════════════════════════════════════════════════════════
-- Réseau Omega › Messages — le schéma visé (02/11/2026, revu à la reprise
-- du soir : le modèle de Zulip, « salon › sujet », remplace les fils de
-- réponse à la Slack)
--
-- RÉDIGÉ, PAS APPLIQUÉ. Aucune de ces tables n'existe en base : tant
-- qu'elles n'y sont pas, la page /espace2/reseau/messages montre en
-- « Base réelle » un état vide honnête (« Le réseau ouvre bientôt »), et
-- ses conversations d'exemple seulement en « Données d'exemple ».
--
-- Ce que la page attend de la base :
--   · des salons (par île, par secteur, et « Alertes ») et des messages
--     privés entre deux entreprises membres ;
--   · dans un salon, des SUJETS : chaque demande ouvre le sien, qu'on lit
--     et qu'on reprend séparément (Zulip, « Introduction to topics ») ;
--   · des messages, des réactions, des mentions (d'un membre, ou de
--     l'organisation qui lit) ;
--   · un « lu jusqu'à » par lecteur et par conversation, d'où les
--     compteurs de non-lus et le filet « Nouveaux » ;
--   · la présence (Supabase Realtime, voir la note en fin de fichier).
--
-- L'unité est l'ENTREPRISE (public.clients), comme partout dans Espace 2 :
-- « vous » est l'organisation connectée, que private.mes_clients() donne
-- pour la session ouverte. Un message est écrit PAR une entreprise ;
-- l'utilisateur qui l'a tapé est gardé à part (auteur_user), pour
-- l'historique, sans être montré aux autres membres.
--
-- Dépend de la table des membres du réseau (schema-membres.sql, page
-- « Membres ») : reseau_membres(client_id, slug, …), une ligne par
-- entreprise qui a accepté d'entrer dans le réseau. Seul un membre lit et
-- écrit dans les salons.
--
-- Idempotent : create … if not exists, politiques posées si absentes.
-- ══════════════════════════════════════════════════════════════════════

-- ——— les conversations : un salon, ou un message privé à deux ———
create table if not exists public.reseau_conversations (
  id uuid primary key default gen_random_uuid(),
  genre text not null check (genre in ('salon', 'prive')),
  -- salon seulement : 'guadeloupe', 'martinique', 'auto', 'btp', 'restauration', 'commerce', 'alertes'
  slug text unique,
  nom text,
  categorie text check (categorie in ('ile', 'secteur', 'alertes')),
  sujet text,
  -- privé seulement : les deux entreprises, rangées (a < b) pour qu'il n'y ait qu'une conversation par paire
  client_a uuid references public.clients(id) on delete cascade,
  client_b uuid references public.clients(id) on delete cascade,
  cree_le timestamptz not null default now(),
  constraint reseau_conv_forme check (
    (genre = 'salon' and slug is not null and nom is not null and categorie is not null and client_a is null and client_b is null)
    or (genre = 'prive' and slug is null and client_a is not null and client_b is not null and client_a < client_b)
  ),
  constraint reseau_conv_paire unique (client_a, client_b)
);

-- ——— qui est dans quel salon (les privés n'en ont pas besoin : client_a, client_b) ———
create table if not exists public.reseau_participants (
  conversation_id uuid not null references public.reseau_conversations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  -- le salon est-il en sourdine pour cette entreprise
  muet boolean not null default false,
  rejoint_le timestamptz not null default now(),
  primary key (conversation_id, client_id)
);
create index if not exists reseau_participants_client on public.reseau_participants (client_id);

-- ——— les sujets d'un salon (Zulip : « topics ») ———
create table if not exists public.reseau_sujets (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.reseau_conversations(id) on delete cascade,
  titre text not null check (length(btrim(titre)) between 1 and 80),
  ouvert_par uuid not null references public.clients(id) on delete cascade,
  cree_le timestamptz not null default now(),
  -- un même titre ne s'ouvre qu'une fois par salon : écrire dans un titre existant reprend le sujet
  constraint reseau_sujets_titre unique (conversation_id, titre)
);

-- ——— les messages : dans un sujet d'un salon, ou dans un privé (sujet_id vide) ———
create table if not exists public.reseau_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.reseau_conversations(id) on delete cascade,
  sujet_id uuid references public.reseau_sujets(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  auteur_user uuid references auth.users(id) on delete set null,
  texte text not null check (length(btrim(texte)) between 1 and 4000),
  -- les entreprises mentionnées (@slug dans le texte), relevées à l'écriture par reseau_envoyer
  mentions uuid[] not null default '{}',
  cree_le timestamptz not null default now(),
  modifie_le timestamptz,
  supprime_le timestamptz
);
create index if not exists reseau_messages_conv on public.reseau_messages (conversation_id, cree_le);
create index if not exists reseau_messages_sujet on public.reseau_messages (sujet_id, cree_le) where sujet_id is not null;
create index if not exists reseau_messages_mentions on public.reseau_messages using gin (mentions);

-- ——— les réactions : une par entreprise, emoji et message ———
create table if not exists public.reseau_reactions (
  message_id uuid not null references public.reseau_messages(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  emoji text not null check (length(emoji) between 1 and 16),
  cree_le timestamptz not null default now(),
  primary key (message_id, client_id, emoji)
);

-- ——— « lu jusqu'à » : par UTILISATEUR (deux personnes d'une même entreprise ne
-- lisent pas au même rythme), par sujet dans un salon, par conversation pour un privé ———
create table if not exists public.reseau_lectures (
  conversation_id uuid not null references public.reseau_conversations(id) on delete cascade,
  -- le sujet lu ; '00000000-0000-0000-0000-000000000000' pour un privé (une clé primaire n'admet pas de vide)
  sujet_id uuid not null default '00000000-0000-0000-0000-000000000000',
  user_id uuid not null references auth.users(id) on delete cascade,
  lu_jusqu_a timestamptz not null default now(),
  primary key (conversation_id, sujet_id, user_id)
);

-- ══ Qui voit quoi (RLS) ═══════════════════════════════════════════════
-- Un utilisateur voit une conversation si l'une de SES entreprises
-- (private.mes_clients()) est membre du réseau ET participe au salon, ou
-- est l'une des deux entreprises d'un privé. Les écritures passent par des
-- fonctions (reseau_envoyer, reseau_reagir, reseau_marquer_lu) : pas
-- d'insert direct, pour vérifier l'appartenance et relever les mentions
-- au même endroit.

create or replace function private.reseau_mes_conversations()
returns setof uuid
language sql stable security definer set search_path = '' as $$
  select c.id from public.reseau_conversations c
  where c.genre = 'prive'
    and (c.client_a in (select private.mes_clients()) or c.client_b in (select private.mes_clients()))
    and exists (select 1 from public.reseau_membres m where m.client_id in (select private.mes_clients()))
  union
  select p.conversation_id from public.reseau_participants p
  where p.client_id in (select private.mes_clients())
    and p.client_id in (select m.client_id from public.reseau_membres m)
$$;
revoke all on function private.reseau_mes_conversations() from public;

alter table public.reseau_conversations enable row level security;
alter table public.reseau_participants enable row level security;
alter table public.reseau_sujets enable row level security;
alter table public.reseau_messages enable row level security;
alter table public.reseau_reactions enable row level security;
alter table public.reseau_lectures enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'reseau_conversations' and policyname = 'reseau : mes conversations') then
    create policy "reseau : mes conversations" on public.reseau_conversations
      for select to authenticated using (id in (select private.reseau_mes_conversations()));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'reseau_participants' and policyname = 'reseau : les participants de mes salons') then
    create policy "reseau : les participants de mes salons" on public.reseau_participants
      for select to authenticated using (conversation_id in (select private.reseau_mes_conversations()));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'reseau_sujets' and policyname = 'reseau : les sujets de mes salons') then
    create policy "reseau : les sujets de mes salons" on public.reseau_sujets
      for select to authenticated using (conversation_id in (select private.reseau_mes_conversations()));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'reseau_messages' and policyname = 'reseau : les messages de mes conversations') then
    create policy "reseau : les messages de mes conversations" on public.reseau_messages
      for select to authenticated using (conversation_id in (select private.reseau_mes_conversations()) and supprime_le is null);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'reseau_reactions' and policyname = 'reseau : les réactions de mes conversations') then
    create policy "reseau : les réactions de mes conversations" on public.reseau_reactions
      for select to authenticated using (message_id in (select m.id from public.reseau_messages m));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'reseau_lectures' and policyname = 'reseau : mes lectures') then
    create policy "reseau : mes lectures" on public.reseau_lectures
      for select to authenticated using (user_id = (select auth.uid()));
  end if;
end $$;

grant select on public.reseau_conversations, public.reseau_participants, public.reseau_sujets, public.reseau_messages, public.reseau_reactions, public.reseau_lectures to authenticated;

-- ══ Les portes d'écriture ═════════════════════════════════════════════

-- envoyer : un message dans un sujet d'un salon (p_sujet), ou dans un privé
-- (p_sujet vide) ; dans un salon, p_titre ouvre un nouveau sujet (ou reprend
-- celui qui porte déjà ce titre). p_client est l'entreprise au nom de
-- laquelle on écrit (l'une de mes_clients(), membre du réseau).
create or replace function public.reseau_envoyer(p_conversation uuid, p_client uuid, p_texte text, p_sujet uuid default null, p_titre text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_mentions uuid[]; v_genre text; v_sujet uuid := p_sujet;
begin
  if p_client not in (select private.mes_clients()) then raise exception 'entreprise hors de votre compte'; end if;
  if p_client not in (select m.client_id from public.reseau_membres m) then raise exception 'entreprise hors du réseau'; end if;
  if p_conversation not in (select private.reseau_mes_conversations()) then raise exception 'conversation inconnue'; end if;
  select c.genre into v_genre from public.reseau_conversations c where c.id = p_conversation;
  if v_genre = 'salon' then
    if v_sujet is null then
      if coalesce(btrim(p_titre), '') = '' then raise exception 'un message de salon va dans un sujet'; end if;
      insert into public.reseau_sujets (conversation_id, titre, ouvert_par) values (p_conversation, btrim(p_titre), p_client)
      on conflict (conversation_id, titre) do nothing;
      select t.id into v_sujet from public.reseau_sujets t where t.conversation_id = p_conversation and t.titre = btrim(p_titre);
    elsif not exists (select 1 from public.reseau_sujets t where t.id = v_sujet and t.conversation_id = p_conversation) then
      raise exception 'sujet inconnu';
    end if;
  elsif v_sujet is not null then
    raise exception 'un privé n''a pas de sujet';
  end if;
  -- les @slug du texte qui désignent un membre du réseau
  select coalesce(array_agg(distinct m.client_id), '{}') into v_mentions
  from regexp_matches(p_texte, '@([a-z0-9-]+)', 'g') as x(t)
  join public.reseau_membres m on m.slug = x.t[1];
  insert into public.reseau_messages (conversation_id, sujet_id, client_id, auteur_user, texte, mentions)
  values (p_conversation, v_sujet, p_client, auth.uid(), btrim(p_texte), v_mentions)
  returning id into v_id;
  -- écrire, c'est avoir lu
  insert into public.reseau_lectures (conversation_id, sujet_id, user_id, lu_jusqu_a)
  values (p_conversation, coalesce(v_sujet, '00000000-0000-0000-0000-000000000000'), auth.uid(), now())
  on conflict (conversation_id, sujet_id, user_id) do update set lu_jusqu_a = excluded.lu_jusqu_a;
  return v_id;
end $$;

-- ouvrir (ou retrouver) le privé entre mon entreprise et un membre : ?a=<slug>
create or replace function public.reseau_ouvrir_prive(p_client uuid, p_slug text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_autre uuid; v_a uuid; v_b uuid; v_id uuid;
begin
  if p_client not in (select private.mes_clients()) then raise exception 'entreprise hors de votre compte'; end if;
  if p_client not in (select m.client_id from public.reseau_membres m) then raise exception 'entreprise hors du réseau'; end if;
  select m.client_id into v_autre from public.reseau_membres m where m.slug = p_slug;
  if v_autre is null or v_autre = p_client then raise exception 'membre inconnu'; end if;
  v_a := least(p_client, v_autre); v_b := greatest(p_client, v_autre);
  insert into public.reseau_conversations (genre, client_a, client_b) values ('prive', v_a, v_b)
  on conflict (client_a, client_b) do nothing;
  select c.id into v_id from public.reseau_conversations c where c.client_a = v_a and c.client_b = v_b;
  return v_id;
end $$;

-- réagir : ajoute la réaction, ou la retire si elle y est déjà
create or replace function public.reseau_reagir(p_message uuid, p_client uuid, p_emoji text)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_client not in (select private.mes_clients()) then raise exception 'entreprise hors de votre compte'; end if;
  if not exists (select 1 from public.reseau_messages m where m.id = p_message and m.conversation_id in (select private.reseau_mes_conversations())) then
    raise exception 'message inconnu';
  end if;
  delete from public.reseau_reactions where message_id = p_message and client_id = p_client and emoji = p_emoji;
  if not found then insert into public.reseau_reactions (message_id, client_id, emoji) values (p_message, p_client, p_emoji); end if;
end $$;

-- marquer lu : à l'ouverture d'un sujet ou d'un privé (p_sujet vide)
create or replace function public.reseau_marquer_lu(p_conversation uuid, p_sujet uuid default null)
returns void
language sql security definer set search_path = '' as $$
  insert into public.reseau_lectures (conversation_id, sujet_id, user_id, lu_jusqu_a)
  select p_conversation, coalesce(p_sujet, '00000000-0000-0000-0000-000000000000'), auth.uid(), now()
  where p_conversation in (select private.reseau_mes_conversations())
  on conflict (conversation_id, sujet_id, user_id) do update set lu_jusqu_a = excluded.lu_jusqu_a
$$;

-- la colonne et les « Conversations récentes » : une ligne par sujet de salon et
-- par privé, avec les non-lus et les mentions de MON entreprise, d'une requête
create or replace function public.reseau_conversations_liste(p_client uuid)
returns table (conversation_id uuid, sujet_id uuid, non_lus integer, mentions integer, dernier timestamptz, participants uuid[])
language sql stable security definer set search_path = '' as $$
  select m.conversation_id, m.sujet_id,
         count(*) filter (where m.cree_le > coalesce(l.lu_jusqu_a, '-infinity') and m.client_id <> p_client)::int,
         count(*) filter (where m.cree_le > coalesce(l.lu_jusqu_a, '-infinity') and p_client = any (m.mentions))::int,
         max(m.cree_le),
         -- les dernières entreprises à avoir écrit, la plus récente en tête (colonne « Participants » de Zulip)
         (array_agg(m.client_id order by m.cree_le desc))[1:4]
  from public.reseau_messages m
  left join public.reseau_lectures l
    on l.conversation_id = m.conversation_id and l.user_id = auth.uid()
   and l.sujet_id = coalesce(m.sujet_id, '00000000-0000-0000-0000-000000000000')
  where m.conversation_id in (select private.reseau_mes_conversations())
    and m.supprime_le is null
    and p_client in (select private.mes_clients())
  group by m.conversation_id, m.sujet_id, l.lu_jusqu_a
$$;

revoke all on function public.reseau_envoyer(uuid, uuid, text, uuid, text), public.reseau_ouvrir_prive(uuid, text), public.reseau_reagir(uuid, uuid, text), public.reseau_marquer_lu(uuid, uuid), public.reseau_conversations_liste(uuid) from public, anon;
grant execute on function public.reseau_envoyer(uuid, uuid, text, uuid, text), public.reseau_ouvrir_prive(uuid, text), public.reseau_reagir(uuid, uuid, text), public.reseau_marquer_lu(uuid, uuid), public.reseau_conversations_liste(uuid) to authenticated;

-- ——— les salons de départ (sans participants : on les rejoint à l'entrée dans le réseau) ———
insert into public.reseau_conversations (genre, slug, nom, categorie, sujet) values
  ('salon', 'alertes', 'Alertes', 'alertes', 'Alertes terrain des deux îles : météo, port, routes, coupures.'),
  ('salon', 'guadeloupe', 'Guadeloupe', 'ile', 'Les entreprises du réseau en Guadeloupe.'),
  ('salon', 'martinique', 'Martinique', 'ile', 'Les entreprises du réseau en Martinique.'),
  ('salon', 'auto', 'Auto', 'secteur', 'Garages, concessions, pièces, flottes et mécanique.'),
  ('salon', 'btp', 'BTP', 'secteur', 'Bâtiment, second œuvre et marchés publics.'),
  ('salon', 'restauration', 'Restauration', 'secteur', 'Restaurants, traiteurs, épiceries et métiers de bouche.'),
  ('salon', 'commerce', 'Commerce', 'secteur', 'Boutiques, distribution, services aux entreprises.')
on conflict (slug) do nothing;

-- ══ Pour la suite : Supabase Realtime ═════════════════════════════════
-- 1. Les nouveaux messages et réactions : ajouter les tables à la
--    publication, puis s'abonner côté page aux changements filtrés par
--    conversation. Realtime applique la RLS ci-dessus (« Postgres Changes »
--    vérifie la politique select de chaque abonné) : un membre ne reçoit
--    que ce qu'il pourrait lire.
--
--      alter publication supabase_realtime add table public.reseau_messages, public.reseau_reactions;
--
--      supabase.channel(`reseau:${conversationId}`)
--        .on("postgres_changes", { event: "INSERT", schema: "public", table: "reseau_messages", filter: `conversation_id=eq.${conversationId}` }, recevoir)
--        .subscribe();
--
--    Les compteurs de la colonne (non-lus, mentions) se rafraîchissent en
--    rappelant reseau_conversations_liste à chaque INSERT reçu, sans
--    filtre de conversation mais une seule fois par seconde au plus.
--
-- 2. La présence (« en ligne » / « absent ») n'a pas de table : c'est un
--    canal Realtime « Presence » commun au réseau, où chaque page ouverte
--    annonce son entreprise (track({ client: slug })) ; « en ligne » =
--    au moins une session de l'entreprise présente sur le canal. Le canal
--    doit être privé (Realtime Authorization, politique sur
--    realtime.messages) et réservé aux membres du réseau.
--
-- 3. « En train d'écrire… » (si on le veut) passe par Broadcast sur le
--    canal de la conversation, sans rien écrire en base.
--
-- 4. Une notification hors de la page (mention, message privé) reste à
--    décider avec Teo : e-mail récapitulatif ou rien ; jamais de SMS.
