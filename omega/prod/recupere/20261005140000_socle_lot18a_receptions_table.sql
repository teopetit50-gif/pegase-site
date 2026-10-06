-- recupere 20261005140000 socle_lot18a_receptions_table
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Note : Essais précédents : apply_migration socle_lot18_receptions_et_remise_idempotente b897d769 (15:54, délai dépassé), apply_migration socle_lot18a 2a9b4120 (15:58, délai dépassé), execute_sql e80f9511 (15:59, erreur).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête 72e0309e-4c60-426f-9617-fb7a4fbc5132 (mcp__Supabase__execute_sql, 2026-10-05T16:03:01.691Z, résultat : réussi)
set lock_timeout = '8s';
create table if not exists public.receptions (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  module text,
  canal text not null check (canal in ('email', 'whatsapp', 'sms', 'formulaire')),
  boite text not null,
  identifiant_externe text not null,
  de_adresse text,
  de_empreinte text,
  de_nom text,
  sujet text,
  corps text,
  corps_html text,
  pieces jsonb not null default '[]'::jsonb,
  detail jsonb not null default '{}'::jsonb,
  en_reponse_a uuid references public.envois(id) on delete set null,
  fil text,
  langue text,
  statut text not null default 'nouvelle' check (statut in ('nouvelle', 'lue', 'traitee', 'ignoree', 'indesirable')),
  traite_par uuid,
  recu_le timestamptz not null default now(),
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  unique (client_id, canal, identifiant_externe)
);
create index if not exists receptions_client_statut_idx on public.receptions (client_id, statut, recu_le desc);
create index if not exists receptions_en_reponse_a_idx on public.receptions (en_reponse_a) where en_reponse_a is not null;
comment on table public.receptions is 'Messages entrants déposés par l''ouvrier de réception (webhooks). Idempotent sur (client, canal, identifiant externe).';
alter table public.receptions enable row level security;
create policy "on voit les réceptions de son périmètre" on public.receptions
  for select to authenticated
  using (client_id in (select private.mes_clients())
         and private.perimetre_couvre((select auth.uid()), client_id, entite_id));
insert into private.tables_locataires (nom, ordre_effacement, note)
values ('receptions', 5, 'Messages entrants (lot 18).')
on conflict (nom) do nothing;
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261005140000', 'socle_lot18a_receptions_table', array['-- posé par execute_sql : table public.receptions, RLS, tables_locataires']);
select to_regclass('public.receptions') as ok;
