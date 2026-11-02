-- ══════════════════════════════════════════════════════════════════════
-- Réseau Omega · Fil — le schéma visé (02/11/2026)
--
-- RÉDIGÉ, PAS APPLIQUÉ. Aucune migration ne part de ce fichier sans
-- l'accord de Teo. Il dit ce que le Fil lira en « Base réelle » le jour où
-- le réseau ouvre ; d'ici là, la page montre son état vide
-- (components/espace2/reseau/source.ts).
--
-- Conventions du dépôt reprises : une organisation cliente est une ligne
-- de public.clients ; private.mes_clients() rend les organisations de la
-- personne connectée (RLS de tous les modules).
--
-- Dépendance : public.reseau_membres (schema-membres.sql, session
-- Membres) — une ligne par organisation inscrite au réseau, avec au moins
-- client_id, slug, ile, secteur et actif. Le Fil n'en lit que l'adhésion.
-- ══════════════════════════════════════════════════════════════════════

-- Une organisation de la personne connectée est-elle membre active du réseau ?
create or replace function private.reseau_suis_membre()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.reseau_membres m
    where m.client_id in (select private.mes_clients()) and m.actif
  );
$$;

-- ——— les publications : demandes et alertes terrain ———
create table if not exists public.reseau_publications (
  id            uuid primary key default gen_random_uuid(),
  auteur_id     uuid not null references public.clients (id) on delete cascade,
  type          text not null check (type in ('demande', 'alerte')),
  -- une alerte : ce qu'elle concerne (l'icône du fil)
  genre         text check (genre in ('port', 'coupure', 'meteo', 'autre')),
  titre         text not null check (char_length(titre) between 3 and 140),
  texte         text not null default '' check (char_length(texte) <= 4000),
  ile           text not null check (ile in ('Guadeloupe', 'Martinique')),
  -- une alerte : où ; une demande : pour quand (texte libre, facultatif)
  lieu          text check (char_length(lieu) <= 140),
  quand         text check (char_length(quand) <= 140),
  cree_le       timestamptz not null default now(),
  -- une alerte expire d'elle-même (fin de vigilance, fin de coupure)
  expire_le     timestamptz,
  -- retirée par son auteur ou par Omega (modération) : jamais effacée
  retiree_le    timestamptz,
  constraint reseau_publications_genre_alerte check (type = 'alerte' or genre is null)
);
create index if not exists reseau_publications_fil on public.reseau_publications (cree_le desc) where retiree_le is null;
create index if not exists reseau_publications_ile on public.reseau_publications (ile, type, cree_le desc) where retiree_le is null;

-- ——— les réponses sous une publication ———
create table if not exists public.reseau_reponses (
  id              uuid primary key default gen_random_uuid(),
  publication_id  uuid not null references public.reseau_publications (id) on delete cascade,
  auteur_id       uuid not null references public.clients (id) on delete cascade,
  texte           text not null check (char_length(texte) between 1 and 2000),
  cree_le         timestamptz not null default now(),
  retiree_le      timestamptz
);
create index if not exists reseau_reponses_publication on public.reseau_reponses (publication_id, cree_le);

-- ——— « Je peux aider » : une organisation, une fois par demande ———
create table if not exists public.reseau_aides (
  publication_id  uuid not null references public.reseau_publications (id) on delete cascade,
  client_id       uuid not null references public.clients (id) on delete cascade,
  cree_le         timestamptz not null default now(),
  primary key (publication_id, client_id)
);

-- ——— les alertes épinglées : propres à chaque organisation ———
create table if not exists public.reseau_epingles (
  publication_id  uuid not null references public.reseau_publications (id) on delete cascade,
  client_id       uuid not null references public.clients (id) on delete cascade,
  cree_le         timestamptz not null default now(),
  primary key (publication_id, client_id)
);

-- ——— RLS : on lit le fil si l'on est membre ; on n'écrit qu'au nom de ses organisations ———
alter table public.reseau_publications enable row level security;
alter table public.reseau_reponses     enable row level security;
alter table public.reseau_aides        enable row level security;
alter table public.reseau_epingles     enable row level security;

create policy "reseau : les membres lisent le fil" on public.reseau_publications
  for select to authenticated
  using (private.reseau_suis_membre() and (retiree_le is null or auteur_id in (select private.mes_clients())));
create policy "reseau : on publie au nom de son organisation" on public.reseau_publications
  for insert to authenticated
  with check (private.reseau_suis_membre() and auteur_id in (select private.mes_clients()));
-- modifier ou retirer : seulement ses propres publications (le retrait passe par retiree_le)
create policy "reseau : on modifie ses publications" on public.reseau_publications
  for update to authenticated
  using (auteur_id in (select private.mes_clients()))
  with check (auteur_id in (select private.mes_clients()));

create policy "reseau : les membres lisent les réponses" on public.reseau_reponses
  for select to authenticated
  using (private.reseau_suis_membre() and retiree_le is null
         and publication_id in (select p.id from public.reseau_publications p));
create policy "reseau : on répond au nom de son organisation" on public.reseau_reponses
  for insert to authenticated
  with check (private.reseau_suis_membre() and auteur_id in (select private.mes_clients())
              and publication_id in (select p.id from public.reseau_publications p));

create policy "reseau : les membres voient qui peut aider" on public.reseau_aides
  for select to authenticated
  using (private.reseau_suis_membre());
create policy "reseau : on propose son aide" on public.reseau_aides
  for insert to authenticated
  with check (private.reseau_suis_membre() and client_id in (select private.mes_clients())
              and publication_id in (select p.id from public.reseau_publications p
                                     where p.type = 'demande' and p.auteur_id not in (select private.mes_clients())));
create policy "reseau : on retire son aide" on public.reseau_aides
  for delete to authenticated
  using (client_id in (select private.mes_clients()));

-- les épingles d'une organisation ne regardent qu'elle
create policy "reseau : ses épingles" on public.reseau_epingles
  for all to authenticated
  using (client_id in (select private.mes_clients()))
  with check (client_id in (select private.mes_clients())
              and publication_id in (select p.id from public.reseau_publications p where p.type = 'alerte'));
