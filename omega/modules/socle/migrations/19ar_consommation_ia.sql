-- 19ar_consommation_ia — socle : le plafond d'IA du jour compte TOUTE l'IA du client. A1, 17/10/2026.
-- consommation_ia_jour ne sommait que les travaux lecteur.lire et reput.preparer (c3_04) : les lectures longues
-- (lecteur.analyser, jusqu'à 15 € par analyse), les photos et vocaux (lecteur.media) et les futurs assistants des
-- modules (B1, B6, B2) échappaient au plafond plafond_ia_jour_client.
--   · private.consommation_ia_jour(p_client) : la somme des cout_eur des travaux FAITS du jour (minuit Paris), quel que
--     soit leur genre (chaque travail ne porte que son coût : le lecteur rend le coût du palier, pas le cumul), plus les
--     consommations notées hors travaux. Même signature, mêmes droits ; remplace c3_04 (qui reste couverte).
--   · public.consommations_ia : le registre des appels d'IA faits hors travaux (un assistant appelé depuis l'écran).
--   · public.noter_consommation_ia(p_client, p_module, p_source, p_cout_eur, p_detail) : la porte qui y écrit
--     (service_role seul ; l'assistant l'appelle après chaque appel au modèle). Voir omega/functions/_partage/IA.md.
-- Create or replace et create if not exists seulement ; aucune suppression ; rejouable.

create table if not exists public.consommations_ia (
  id bigint generated always as identity primary key,
  client_id uuid not null references public.clients(id),
  module text not null check (module ~ '^[a-z][a-z_]{1,29}$'),
  source text not null check (char_length(source) between 1 and 80),
  cout_eur numeric(12, 6) not null check (cout_eur >= 0 and cout_eur <= 100),
  detail jsonb not null default '{}'::jsonb check (pg_column_size(detail) <= 4000),
  survenue_le timestamptz not null default now()
);
create index if not exists consommations_ia_client_jour on public.consommations_ia (client_id, survenue_le desc);
alter table public.consommations_ia enable row level security;
revoke all on table public.consommations_ia from public, anon, authenticated;
grant all on table public.consommations_ia to service_role;
comment on table public.consommations_ia is
  'Appels d''IA faits hors travaux (assistants des modules), comptés dans le plafond du jour (19ar). Écriture par noter_consommation_ia.';

create or replace function private.noter_consommation_ia(p_client uuid, p_module text, p_source text, p_cout_eur numeric, p_detail jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path to '' as $$
declare v_id bigint;
begin
  perform private.exiger_ouvrier();
  if p_client is null or p_cout_eur is null or p_cout_eur < 0 then
    raise exception 'Organisation et coût (≥ 0) sont nécessaires.' using errcode = '22023';
  end if;
  insert into public.consommations_ia (client_id, module, source, cout_eur, detail)
  values (p_client, p_module, left(p_source, 80), round(p_cout_eur, 6), coalesce(p_detail, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.noter_consommation_ia(p_client uuid, p_module text, p_source text, p_cout_eur numeric, p_detail jsonb default '{}'::jsonb)
returns bigint language sql set search_path to '' as $$ select private.noter_consommation_ia(p_client, p_module, p_source, p_cout_eur, p_detail) $$;

CREATE OR REPLACE FUNCTION private.consommation_ia_jour(p_client uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_travaux numeric; v_hors numeric; v_minuit timestamptz := date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
begin
  perform private.exiger_ouvrier();
  select coalesce(sum((t.resultat ->> 'cout_eur')::numeric), 0) into v_travaux
  from public.travaux t
  where t.client_id = p_client and t.etat = 'fait' and t.fini_le >= v_minuit
    and (t.resultat ->> 'cout_eur') ~ '^[0-9]+(\.[0-9]+)?$';
  select coalesce(sum(c.cout_eur), 0) into v_hors
  from public.consommations_ia c
  where c.client_id = p_client and c.survenue_le >= v_minuit;
  return v_travaux + v_hors;
end $function$;

revoke all on function private.noter_consommation_ia(uuid, text, text, numeric, jsonb) from public, anon, authenticated;
revoke all on function public.noter_consommation_ia(uuid, text, text, numeric, jsonb) from public, anon, authenticated;
grant execute on function private.noter_consommation_ia(uuid, text, text, numeric, jsonb) to service_role;
grant execute on function public.noter_consommation_ia(uuid, text, text, numeric, jsonb) to service_role;
revoke all on function private.consommation_ia_jour(uuid) from public, anon, authenticated;
grant execute on function private.consommation_ia_jour(uuid) to service_role;
