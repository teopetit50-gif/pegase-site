-- 19ai_compteurs_facturation.sql — compteurs de facturation par client et par mois (A5, 06/10/2026).
-- Promesse de la page tarifs : un tarif indexé sur le nombre de pièces lues et sur la part reprise par un opérateur
-- (omega/AUDIT-PROMESSES.md § 0). Rien ne les comptait.
--
-- Deux mesures, comptées une seule fois par pièce, au mois (heure de Paris) où la lecture aboutit :
--   pieces_lues     la pièce reçoit un résultat de lecture exploitable : statut 'lue', 'a_verifier' ou 'a_classer'
--                   (pas 'rejetee' ni 'echec' : rien n'a été lu, rien n'est facturé) ;
--   pieces_reprises la lecture n'a pas suffi et la pièce part chez un opérateur : statut 'a_verifier' ou 'a_classer'.
-- Une pièce relue (nouvelle version du lecteur) ne compte pas deux fois : private.mesures_pieces garde la trace.
--
-- Lecture : public.facturation_mois (vue, security_invoker) rend par client et par mois les deux nombres et la part
-- reprise ; RLS par private.mes_clients() sur la table sous-jacente. Écriture : seulement par le déclencheur.
-- Idempotent : rejouable sans effet.

create table if not exists public.facturation_mesures (
  client_id uuid not null references public.clients (id),   -- effacée par la règle des tables locataires (fin du fichier)
  mois date not null check (mois = date_trunc('month', mois)::date),
  mesure text not null check (mesure in ('pieces_lues', 'pieces_reprises')),
  quantite bigint not null default 0 check (quantite >= 0),
  maj_le timestamptz not null default now(),
  primary key (client_id, mois, mesure)
);
comment on table public.facturation_mesures is
  'Compteurs de facturation par client et par mois (19ai) : pièces lues, pièces reprises par un opérateur. Écrite par private.facturation_compter_piece seulement.';

alter table public.facturation_mesures enable row level security;
revoke all on public.facturation_mesures from anon, authenticated;
grant select on public.facturation_mesures to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'facturation_mesures' and policyname = 'facturation_mesures_lecture') then
    create policy facturation_mesures_lecture on public.facturation_mesures for select to authenticated
      using (client_id in (select private.mes_clients()));
  end if;
end $$;

-- Une ligne par pièce et par mesure : la garantie « une seule fois ».
create table if not exists private.mesures_pieces (
  piece_id text not null,                -- text : l'identifiant de public.pieces, quel que soit son type
  mesure text not null,
  client_id uuid not null,              -- sans clé étrangère : la trace « déjà comptée » ne bloque pas l'effacement d'un client
  mois date not null,
  compte_le timestamptz not null default now(),
  primary key (piece_id, mesure)
);
revoke all on private.mesures_pieces from public, anon, authenticated;

create or replace function private.facturation_compter_piece() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_mois date := date_trunc('month', now() at time zone 'Europe/Paris')::date;
  v_mesure text;
begin
  foreach v_mesure in array
    case when new.statut in ('a_verifier', 'a_classer') then array['pieces_lues', 'pieces_reprises']
         when new.statut = 'lue' then array['pieces_lues']
         else array[]::text[] end
  loop
    insert into private.mesures_pieces (piece_id, mesure, client_id, mois)
    values (new.id::text, v_mesure, new.client_id, v_mois)
    on conflict (piece_id, mesure) do nothing;
    if found then
      insert into public.facturation_mesures (client_id, mois, mesure, quantite)
      values (new.client_id, v_mois, v_mesure, 1)
      on conflict (client_id, mois, mesure) do update set quantite = public.facturation_mesures.quantite + 1, maj_le = now();
    end if;
  end loop;
  return null;
end $$;
revoke all on function private.facturation_compter_piece() from public, anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_attribute where attrelid = 'public.pieces'::regclass and attname = 'statut' and not attisdropped) then
    raise exception '19ai : public.pieces.statut introuvable';
  end if;
  if not exists (select 1 from pg_trigger where tgrelid = 'public.pieces'::regclass and tgname = 'facturation_compter_piece') then
    create trigger facturation_compter_piece after insert or update of statut on public.pieces
      for each row when (new.statut in ('lue', 'a_verifier', 'a_classer'))
      execute function private.facturation_compter_piece();
  end if;
end $$;

create or replace view public.facturation_mois with (security_invoker = on) as
select client_id, mois,
       coalesce(sum(quantite) filter (where mesure = 'pieces_lues'), 0) as pieces_lues,
       coalesce(sum(quantite) filter (where mesure = 'pieces_reprises'), 0) as pieces_reprises,
       round(coalesce(sum(quantite) filter (where mesure = 'pieces_reprises'), 0)::numeric
             / nullif(coalesce(sum(quantite) filter (where mesure = 'pieces_lues'), 0), 0), 4) as part_reprise
from public.facturation_mesures
group by client_id, mois;
comment on view public.facturation_mois is
  'Par client et par mois (heure de Paris) : pièces lues, pièces reprises par un opérateur, part reprise (0 à 1). Base du tarif indexé (19ai).';
revoke all on public.facturation_mois from anon, authenticated;
grant select on public.facturation_mois to authenticated;

-- Effacement à la sortie d'un client : la table suit la règle commune des tables locataires.
do $$ begin
  if to_regclass('private.tables_locataires') is not null
     and not exists (select 1 from private.tables_locataires where nom = 'facturation_mesures') then
    insert into private.tables_locataires (nom, ordre_effacement, note) values ('facturation_mesures', 1, 'socle 19ai, compteurs de facturation');
  end if;
end $$;
