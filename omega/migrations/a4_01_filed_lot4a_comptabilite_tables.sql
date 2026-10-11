-- FILED, lot 4a — Comptabilité : les tables.
--
-- Ce que ce lot pose :
--   filed_exercices            l'exercice comptable d'une organisation, sa date de clôture ;
--   filed_plan_comptable       les comptes de charge du client, par organisation (et par société) ;
--   filed_centres_cout         les centres de coût, par organisation (et par société) ;
--   filed_imputations          le compte et le centre que porte chaque facture classée ;
--   filed_imputations_apprises ce que les écritures passées apprennent, fournisseur par fournisseur ;
--   filed_charges_recurrentes  les abonnements et leur rythme ;
--   filed_charges_attendues    les écritures attendues qu'ils produisent, et la facture qui les sert.
--
-- Règles : français partout, RLS par client_id via private.mes_clients(), rien n'entre dans le
-- plan comptable du client sans une personne (le système propose, une personne impute).
-- Migration idempotente.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Exercices comptables
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.filed_exercices (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  entite_id   uuid references public.entites(id) on delete cascade,
  libelle     text not null,
  debut       date not null,
  fin         date not null,
  -- Date à partir de laquelle plus aucune pièce n'entre dans l'exercice. Nulle : exercice ouvert.
  cloture_le  date,
  cloture_par uuid,
  statut      text not null default 'ouvert' check (statut in ('ouvert', 'cloture')),
  cree_le     timestamptz not null default now(),
  maj_le      timestamptz not null default now(),
  constraint filed_exercices_bornes check (fin >= debut),
  constraint filed_exercices_cloture_apres_fin check (cloture_le is null or cloture_le >= fin),
  constraint filed_exercices_statut_cloture check ((statut = 'cloture') = (cloture_le is not null))
);
comment on table public.filed_exercices is
  'L''exercice comptable d''une organisation (entite_id nul) ou d''une société. Clos à une date : une pièce reçue après cette date est orientée vers l''exercice suivant, avec sa mention.';
comment on column public.filed_exercices.cloture_le is 'Date de clôture effective : après elle, aucune pièce n''entre plus dans l''exercice.';

create unique index if not exists filed_exercices_un
  on public.filed_exercices (client_id, coalesce(entite_id, '00000000-0000-0000-0000-000000000000'::uuid), debut);
create index if not exists filed_exercices_client_fin on public.filed_exercices (client_id, fin);

alter table public.filed_exercices enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_exercices' and policyname = 'filed_exercices_lecture') then
    execute 'create policy filed_exercices_lecture on public.filed_exercices for select to authenticated using (client_id in (select private.mes_clients()))';
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Plan comptable du client
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.filed_plan_comptable (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  entite_id   uuid references public.entites(id) on delete cascade,
  numero      text not null check (numero ~ '^[0-9]{3,12}$'),
  libelle     text not null check (char_length(btrim(libelle)) between 1 and 200),
  classe      smallint generated always as (left(numero, 1)::smallint) stored,
  -- charge (6), immobilisation (2), stock (3), tiers (4), autre
  nature      text not null default 'charge' check (nature in ('charge', 'immobilisation', 'stock', 'tiers', 'autre')),
  tva_deductible boolean not null default true,
  actif       boolean not null default true,
  source      text not null default 'saisie' check (source in ('saisie', 'import', 'modele')),
  cree_le     timestamptz not null default now(),
  maj_le      timestamptz not null default now()
);
comment on table public.filed_plan_comptable is
  'Le plan comptable du client tel qu''il nous le confie, par organisation (entite_id nul) ou par société. FILED y lit les comptes de charge ; il n''y crée jamais de compte de lui-même.';

create unique index if not exists filed_plan_comptable_un
  on public.filed_plan_comptable (client_id, coalesce(entite_id, '00000000-0000-0000-0000-000000000000'::uuid), numero);
create index if not exists filed_plan_comptable_client_actif on public.filed_plan_comptable (client_id, actif);

alter table public.filed_plan_comptable enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_plan_comptable' and policyname = 'filed_plan_comptable_lecture') then
    execute 'create policy filed_plan_comptable_lecture on public.filed_plan_comptable for select to authenticated using (client_id in (select private.mes_clients()))';
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Centres de coût
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.filed_centres_cout (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  entite_id   uuid references public.entites(id) on delete cascade,
  code        text not null check (code ~ '^[A-Za-z0-9._-]{1,32}$'),
  libelle     text not null check (char_length(btrim(libelle)) between 1 and 200),
  parent_id   uuid references public.filed_centres_cout(id) on delete set null,
  responsable uuid,
  actif       boolean not null default true,
  cree_le     timestamptz not null default now(),
  maj_le      timestamptz not null default now()
);
comment on table public.filed_centres_cout is
  'Les centres de coût d''une organisation (entite_id nul) ou d''une société : un code, un libellé, un parent au besoin. Chaque facture classée en reçoit un.';

create unique index if not exists filed_centres_cout_un
  on public.filed_centres_cout (client_id, coalesce(entite_id, '00000000-0000-0000-0000-000000000000'::uuid), code);
create index if not exists filed_centres_cout_client_actif on public.filed_centres_cout (client_id, actif);

alter table public.filed_centres_cout enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_centres_cout' and policyname = 'filed_centres_cout_lecture') then
    execute 'create policy filed_centres_cout_lecture on public.filed_centres_cout for select to authenticated using (client_id in (select private.mes_clients()))';
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Imputations : ce que porte chaque facture
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.filed_imputations (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  facture_id    uuid not null references public.filed_factures(id) on delete cascade,
  document_id   uuid not null references public.filed_documents(id) on delete cascade,
  rang          smallint not null default 1 check (rang between 1 and 200),
  compte_id     uuid not null references public.filed_plan_comptable(id),
  centre_id     uuid references public.filed_centres_cout(id),
  exercice_id   uuid references public.filed_exercices(id),
  montant_ht    numeric(14,2) not null check (montant_ht <> 0),
  libelle       text,
  -- proposee : écrite par le système, en attente d'une personne ; validee : une personne l'a posée
  -- ou approuvée ; refusee : la proposition a été écartée ; remplacee : une imputation plus récente la remplace.
  statut        text not null default 'proposee' check (statut in ('proposee', 'validee', 'refusee', 'remplacee')),
  -- apprise : tirée de filed_imputations_apprises ; recurrente : d'une charge récurrente ;
  -- saisie : posée par une personne.
  origine       text not null check (origine in ('apprise', 'recurrente', 'saisie')),
  confiance     numeric(5,4) check (confiance is null or (confiance >= 0 and confiance <= 1)),
  demande_id    uuid references public.demandes_validation(id) on delete set null,
  -- Mention portée quand la pièce est orientée vers l'exercice suivant.
  mention       text,
  propose_le    timestamptz not null default now(),
  decide_le     timestamptz,
  decide_par    uuid,
  motif         text,
  cree_le       timestamptz not null default now(),
  maj_le        timestamptz not null default now()
);
comment on table public.filed_imputations is
  'Le compte du plan comptable et le centre de coût que porte chaque facture classée, ligne par ligne. Proposée par le système (apprise, récurrente), validée par une personne : aucune écriture n''est automatique.';
comment on column public.filed_imputations.mention is 'La mention portée quand la pièce est reçue après la clôture et orientée vers l''exercice suivant.';

-- Un rang n'est occupé qu'une fois parmi les lignes vivantes ; une ligne refusée ou remplacée garde son rang, en mémoire.
create unique index if not exists filed_imputations_un on public.filed_imputations (facture_id, rang) where statut in ('proposee', 'validee');
create index if not exists filed_imputations_client_statut on public.filed_imputations (client_id, statut);
create index if not exists filed_imputations_compte on public.filed_imputations (compte_id);
create index if not exists filed_imputations_centre on public.filed_imputations (centre_id);
create index if not exists filed_imputations_exercice on public.filed_imputations (exercice_id);

alter table public.filed_imputations enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_imputations' and policyname = 'filed_imputations_lecture') then
    execute 'create policy filed_imputations_lecture on public.filed_imputations for select to authenticated using (exists (select 1 from public.filed_documents d where d.id = document_id))';
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Imputations apprises
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.filed_imputations_apprises (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  fournisseur_id  uuid not null references public.filed_fournisseurs(id) on delete cascade,
  compte_id       uuid not null references public.filed_plan_comptable(id) on delete cascade,
  centre_id       uuid references public.filed_centres_cout(id) on delete cascade,
  nb_validees     integer not null default 0 check (nb_validees >= 0),
  nb_refusees     integer not null default 0 check (nb_refusees >= 0),
  derniere_le     timestamptz,
  derniere_facture uuid references public.filed_factures(id) on delete set null,
  cree_le         timestamptz not null default now(),
  maj_le          timestamptz not null default now()
);
comment on table public.filed_imputations_apprises is
  'Ce que les écritures validées apprennent, fournisseur par fournisseur : combien de fois ce compte et ce centre ont été retenus, combien de fois refusés. Sert à proposer, jamais à écrire.';

create unique index if not exists filed_imputations_apprises_un
  on public.filed_imputations_apprises (fournisseur_id, compte_id, coalesce(centre_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists filed_imputations_apprises_client on public.filed_imputations_apprises (client_id, fournisseur_id);

alter table public.filed_imputations_apprises enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_imputations_apprises' and policyname = 'filed_imputations_apprises_lecture') then
    execute 'create policy filed_imputations_apprises_lecture on public.filed_imputations_apprises for select to authenticated using (client_id in (select private.mes_clients()))';
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Charges récurrentes (abonnements) et leurs écritures attendues
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.filed_charges_recurrentes (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  entite_id       uuid references public.entites(id) on delete cascade,
  fournisseur_id  uuid not null references public.filed_fournisseurs(id) on delete cascade,
  libelle         text not null check (char_length(btrim(libelle)) between 1 and 200),
  periodicite     text not null check (periodicite in ('mensuelle', 'bimestrielle', 'trimestrielle', 'semestrielle', 'annuelle')),
  -- Jour du mois où la facture est attendue (1 à 28 pour tenir tous les mois).
  jour_attendu    smallint not null default 1 check (jour_attendu between 1 and 28),
  -- Combien de jours après la date attendue on considère la facture manquante.
  tolerance_jours smallint not null default 10 check (tolerance_jours between 0 and 90),
  montant_ht      numeric(14,2) not null check (montant_ht > 0),
  -- Tolérance sur le montant pour reconnaître la facture (en pourcentage).
  tolerance_pct   numeric(5,2) not null default 10 check (tolerance_pct between 0 and 100),
  compte_id       uuid not null references public.filed_plan_comptable(id),
  centre_id       uuid references public.filed_centres_cout(id),
  debut           date not null,
  fin             date,
  actif           boolean not null default true,
  cree_par        uuid,
  cree_le         timestamptz not null default now(),
  maj_le          timestamptz not null default now(),
  constraint filed_charges_recurrentes_bornes check (fin is null or fin >= debut)
);
comment on table public.filed_charges_recurrentes is
  'Les abonnements et charges récurrentes d''une organisation : fournisseur, rythme, montant attendu, compte et centre. Ils produisent leurs écritures attendues sans ressaisie.';

create index if not exists filed_charges_recurrentes_client on public.filed_charges_recurrentes (client_id, actif);
create index if not exists filed_charges_recurrentes_fournisseur on public.filed_charges_recurrentes (fournisseur_id);

alter table public.filed_charges_recurrentes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_charges_recurrentes' and policyname = 'filed_charges_recurrentes_lecture') then
    execute 'create policy filed_charges_recurrentes_lecture on public.filed_charges_recurrentes for select to authenticated using (client_id in (select private.mes_clients()))';
  end if;
end $$;

create table if not exists public.filed_charges_attendues (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  charge_id       uuid not null references public.filed_charges_recurrentes(id) on delete cascade,
  -- Premier jour de la période couverte (le mois, le trimestre…).
  periode         date not null,
  attendue_le     date not null,
  montant_ht      numeric(14,2) not null,
  -- attendue : pas encore de facture ; recue : une facture la sert ; manquante : passée la tolérance,
  -- une alerte a été levée ; annulee : la charge a pris fin.
  statut          text not null default 'attendue' check (statut in ('attendue', 'recue', 'manquante', 'annulee')),
  facture_id      uuid references public.filed_factures(id) on delete set null,
  imputation_id   uuid references public.filed_imputations(id) on delete set null,
  alerte_le       timestamptz,
  recue_le        timestamptz,
  cree_le         timestamptz not null default now(),
  maj_le          timestamptz not null default now()
);
comment on table public.filed_charges_attendues is
  'Les écritures attendues que produisent les charges récurrentes, période par période. Une facture reçue la sert ; une facture absente passée la tolérance lève une alerte.';

create unique index if not exists filed_charges_attendues_un on public.filed_charges_attendues (charge_id, periode);
create index if not exists filed_charges_attendues_client_statut on public.filed_charges_attendues (client_id, statut, attendue_le);
create index if not exists filed_charges_attendues_facture on public.filed_charges_attendues (facture_id);

alter table public.filed_charges_attendues enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_charges_attendues' and policyname = 'filed_charges_attendues_lecture') then
    execute 'create policy filed_charges_attendues_lecture on public.filed_charges_attendues for select to authenticated using (client_id in (select private.mes_clients()))';
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 7. Horodatage de mise à jour (même mécanique que les autres tables FILED : maj_le)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_lot4_maj_le() returns trigger
language plpgsql set search_path to '' as $$
begin
  new.maj_le := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['filed_exercices', 'filed_plan_comptable', 'filed_centres_cout', 'filed_imputations',
                           'filed_imputations_apprises', 'filed_charges_recurrentes', 'filed_charges_attendues'] loop
    execute format('create or replace trigger %I_maj_le before update on public.%I for each row execute function private.filed_lot4_maj_le()', t, t);
  end loop;
end $$;

-- Aucun droit d''écriture direct : tout passe par les portes (lot 4b et suivants).
revoke all on table public.filed_exercices, public.filed_plan_comptable, public.filed_centres_cout,
  public.filed_imputations, public.filed_imputations_apprises, public.filed_charges_recurrentes,
  public.filed_charges_attendues from anon, authenticated;
grant select on public.filed_exercices, public.filed_plan_comptable, public.filed_centres_cout,
  public.filed_imputations, public.filed_imputations_apprises, public.filed_charges_recurrentes,
  public.filed_charges_attendues to authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 8. Inscription à l'effacement du socle
-- ───────────────────────────────────────────────────────────────────────────
-- Les tables qui portent un client_id s'effacent avec l'organisation, dans l'ordre croissant
-- (les dépendantes d'abord : les factures sont à 6, les fournisseurs à 25, les réglages à 46).
insert into private.tables_locataires (nom, ordre_effacement, note) values
  ('filed_charges_attendues',    1, 'FILED, lot 4'),
  ('filed_imputations',          2, 'FILED, lot 4'),
  ('filed_imputations_apprises', 4, 'FILED, lot 4'),
  ('filed_charges_recurrentes',  5, 'FILED, lot 4'),
  ('filed_centres_cout',        30, 'FILED, lot 4'),
  ('filed_plan_comptable',      31, 'FILED, lot 4'),
  ('filed_exercices',           32, 'FILED, lot 4')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;

-- Les tables qui portent les données d'un document s'effacent avec lui (private.tables_objets).
insert into private.tables_objets (nom, objet_type, colonne, ordre_effacement) values
  ('filed_imputations', 'filed_document', 'document_id', 5)
on conflict (nom) do update set objet_type = excluded.objet_type, colonne = excluded.colonne, ordre_effacement = excluded.ordre_effacement;
