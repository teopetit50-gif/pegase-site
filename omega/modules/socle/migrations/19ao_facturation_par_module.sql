-- 19ao_facturation_par_module.sql — compteurs de facturation ventilés par module (A5, 06/10/2026).
-- Complète 19ai pour un devis par poste (FILED, Tamila, …). Rien n'est supprimé : la table de 19ai et sa clé restent telles quelles ;
-- une table voisine porte la ventilation, le compteur de 19ai (create or replace) écrit dans les deux, et une vue
-- public.facturation_mois_modules la rend. Le module est celui de la pièce (public.pieces.module), « inconnu » s'il manque.
-- Les totaux par client de facturation_mois ne changent pas. Pas de reprise de l'historique (décision du 6/10).
-- Idempotent : rejouable sans effet.

create table if not exists public.facturation_mesures_modules (
  client_id uuid not null references public.clients (id),   -- effacée par la règle des tables locataires
  mois date not null check (mois = date_trunc('month', mois)::date),
  module text not null,
  mesure text not null check (mesure in ('pieces_lues', 'pieces_reprises')),
  quantite bigint not null default 0 check (quantite >= 0),
  maj_le timestamptz not null default now(),
  primary key (client_id, mois, module, mesure)
);
comment on table public.facturation_mesures_modules is
  'Compteurs de facturation par client, mois et module (19ao). Écrite par private.facturation_compter_piece seulement.';
alter table public.facturation_mesures_modules enable row level security;
revoke all on public.facturation_mesures_modules from anon, authenticated;
grant select on public.facturation_mesures_modules to authenticated;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'facturation_mesures_modules'
                 and policyname = 'facturation_mesures_modules_lecture') then
    create policy facturation_mesures_modules_lecture on public.facturation_mesures_modules for select to authenticated
      using (client_id in (select private.mes_clients()));
  end if;
  if to_regclass('private.tables_locataires') is not null
     and not exists (select 1 from private.tables_locataires where nom = 'facturation_mesures_modules') then
    insert into private.tables_locataires (nom, ordre_effacement, note) values ('facturation_mesures_modules', 1, 'socle 19ao, compteurs par module');
  end if;
end $$;

-- Le compteur de 19ai, qui écrit maintenant aussi la ventilation (même garantie « une fois par pièce »).
create or replace function private.facturation_compter_piece() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_mois date := date_trunc('month', now() at time zone 'Europe/Paris')::date;
  v_module text := coalesce(nullif(to_jsonb(new) ->> 'module', ''), 'inconnu');
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
      insert into public.facturation_mesures_modules (client_id, mois, module, mesure, quantite)
      values (new.client_id, v_mois, v_module, v_mesure, 1)
      on conflict (client_id, mois, module, mesure)
        do update set quantite = public.facturation_mesures_modules.quantite + 1, maj_le = now();
    end if;
  end loop;
  return null;
end $$;
revoke all on function private.facturation_compter_piece() from public, anon, authenticated;

create or replace view public.facturation_mois_modules with (security_invoker = on) as
select client_id, mois, module,
       coalesce(sum(quantite) filter (where mesure = 'pieces_lues'), 0) as pieces_lues,
       coalesce(sum(quantite) filter (where mesure = 'pieces_reprises'), 0) as pieces_reprises,
       round(coalesce(sum(quantite) filter (where mesure = 'pieces_reprises'), 0)::numeric
             / nullif(coalesce(sum(quantite) filter (where mesure = 'pieces_lues'), 0), 0), 4) as part_reprise
from public.facturation_mesures_modules
group by client_id, mois, module;
comment on view public.facturation_mois_modules is
  'Par client, mois (heure de Paris) et module : pièces lues, reprises par un opérateur, part reprise (19ao).';
revoke all on public.facturation_mois_modules from anon, authenticated;
grant select on public.facturation_mois_modules to authenticated;
