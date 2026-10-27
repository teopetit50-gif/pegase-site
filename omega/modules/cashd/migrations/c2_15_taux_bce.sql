-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_15 : les taux de change de la BCE, chargés chaque jour ouvré (19/10/2026, session C2) — G17
-- ═══════════════════════════════════════════════════════════════════════════
-- « Les factures en devise étrangère sont suivies dans leur devise et en euros. » (C35) Jusqu'ici les taux se saisissaient
-- à la main (cashd_poser_taux). Désormais, chaque jour ouvré après la publication de la BCE (vers 16 h, heure de
-- Francfort), CASHD demande les taux de référence des devises présentes dans ses factures à l'API publique de la BCE
-- (data-api.ecb.europa.eu, sans compte, sans clé), par pg_net, de façon asynchrone ; un second passage lit la réponse
-- (CSV) et range les taux dans cashd_taux_change (source « bce », valables pour toutes les organisations ; 1 unité =
-- 1 / taux BCE euros). Un taux saisi par une organisation garde la priorité pour elle, comme avant.
-- Le modèle est celui de DALIRO (b6_21, météo) : rien n'attend une réponse, rien ne bloque la base.
--
-- Règles de pose : create … if not exists / create or replace ; cron.schedule si absent ; jamais de DROP ni de DELETE ;
-- RLS sans lecture directe (journal du serveur) ; revoke execute de public sur les fonctions.

-- Le journal des demandes à la BCE (une ligne par demande), lu et écrit par le serveur seul.
create table if not exists public.cashd_taux_demandes (
  id bigint generated always as identity primary key,
  demande_id bigint,
  devises text[] not null,
  demandee_le timestamptz not null default now(),
  recue_le timestamptz,
  taux_ranges integer,
  erreur text,
  constraint cashd_taux_demandes_check check (cardinality(devises) between 1 and 60 and char_length(erreur) <= 300)
);
alter table public.cashd_taux_demandes enable row level security;
revoke all on table public.cashd_taux_demandes from anon, authenticated;

-- L'adresse de la demande : les taux de référence quotidiens (EXR, D.<devises>.EUR.SP00.A), la dernière observation.
create or replace function private.cashd_taux_bce_adresse(p_devises text[])
 returns text language sql immutable set search_path to ''
as $function$
  select 'https://data-api.ecb.europa.eu/service/data/EXR/D.' || array_to_string(p_devises, '+') || '.EUR.SP00.A?lastNObservations=1&format=csvdata'
$function$;

-- Une réponse CSV de la BCE → (devise, jour, valeur BCE : 1 euro = valeur devise). Les colonnes sont lues par leur nom.
create or replace function private.cashd_taux_bce_lire_csv(p_csv text)
 returns table (devise text, jour date, valeur numeric)
 language plpgsql immutable set search_path to ''
as $function$
declare
  v_lignes text[] := regexp_split_to_array(btrim(replace(coalesce(p_csv, ''), E'\r', '')), E'\n');
  v_entete text[];
  v_c integer; v_t integer; v_v integer;
  v_champs text[];
  i integer;
begin
  if coalesce(array_length(v_lignes, 1), 0) < 2 then return; end if;
  v_entete := string_to_array(v_lignes[1], ',');
  v_c := array_position(v_entete, 'CURRENCY');
  v_t := array_position(v_entete, 'TIME_PERIOD');
  v_v := array_position(v_entete, 'OBS_VALUE');
  if v_c is null or v_t is null or v_v is null then
    raise exception 'Réponse de la BCE sans colonnes CURRENCY, TIME_PERIOD, OBS_VALUE.' using errcode = '22023';
  end if;
  for i in 2 .. array_length(v_lignes, 1) loop
    continue when btrim(v_lignes[i]) = '';
    v_champs := string_to_array(v_lignes[i], ',');
    continue when coalesce(v_champs[v_c], '') !~ '^[A-Z]{3}$' or coalesce(v_champs[v_t], '') !~ '^\d{4}-\d{2}-\d{2}$'
               or coalesce(v_champs[v_v], '') !~ '^\d+(\.\d+)?$' or v_champs[v_v]::numeric <= 0;
    devise := v_champs[v_c]; jour := v_champs[v_t]::date; valeur := v_champs[v_v]::numeric;
    return next;
  end loop;
end $function$;

-- Demander les taux du jour : les devises des factures (hors euro), une demande par jour au plus. Rend 1 si demandé.
create or replace function private.cashd_taux_bce_demander(p_maintenant timestamptz default now())
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare v_devises text[]; v_id bigint;
begin
  if to_regnamespace('net') is null then return 0; end if;
  if exists (select 1 from public.cashd_taux_demandes d where d.demandee_le > p_maintenant - interval '20 hours') then return 0; end if;
  select array_agg(distinct f.devise order by f.devise) into v_devises
  from public.cashd_factures f where f.devise is not null and f.devise <> 'EUR' and f.devise ~ '^[A-Z]{3}$';
  if v_devises is null then return 0; end if;
  v_devises := v_devises[1:60];
  begin
    execute 'select net.http_get($1, ''{}''::jsonb, ''{}''::jsonb, 15000)' into v_id using private.cashd_taux_bce_adresse(v_devises);
  exception when others then
    insert into public.cashd_taux_demandes (devises, demandee_le, recue_le, erreur)
    values (v_devises, p_maintenant, now(), left('Demande impossible : ' || sqlstate || ' ' || sqlerrm, 300));
    return 0;
  end;
  insert into public.cashd_taux_demandes (demande_id, devises, demandee_le) values (v_id, v_devises, p_maintenant);
  return 1;
end $function$;

-- Ranger un CSV de la BCE dans cashd_taux_change (taux globaux, source bce). Rend le nombre de taux rangés.
create or replace function private.cashd_taux_bce_ranger(p_csv text)
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare n integer := 0; x record;
begin
  for x in select * from private.cashd_taux_bce_lire_csv(p_csv) loop
    continue when x.devise = 'EUR';
    insert into public.cashd_taux_change (devise, jour, taux, source, client_id)
    values (x.devise, x.jour, round(1 / x.valeur, 8), 'bce', null)
    on conflict (devise, jour, coalesce(client_id, '00000000-0000-0000-0000-000000000000'::uuid))
      do update set taux = excluded.taux, source = 'bce' where cashd_taux_change.source = 'bce';
    n := n + 1;
  end loop;
  return n;
end $function$;

-- Lire les réponses arrivées (net._http_response) et ranger les taux.
create or replace function private.cashd_taux_bce_lire()
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare d record; h record; n integer := 0; v_n integer;
begin
  if to_regclass('net._http_response') is null then return 0; end if;
  for d in select * from public.cashd_taux_demandes x where x.demande_id is not null and x.recue_le is null order by x.demandee_le limit 20 loop
    execute 'select x.status_code, x.content, x.timed_out, x.error_msg from net._http_response x where x.id = $1' into h using d.demande_id;
    if h is null or h.status_code is null and h.error_msg is null and not coalesce(h.timed_out, false) then
      if d.demandee_le < now() - interval '1 hour' then
        update public.cashd_taux_demandes set recue_le = now(), erreur = 'Pas de réponse de la BCE' where id = d.id;
      end if;
      continue;
    end if;
    if h.status_code = 200 and not coalesce(h.timed_out, false) then
      begin
        v_n := private.cashd_taux_bce_ranger(h.content::text);
        update public.cashd_taux_demandes set recue_le = now(), taux_ranges = v_n, erreur = null where id = d.id;
        n := n + v_n;
      exception when others then
        update public.cashd_taux_demandes set recue_le = now(), erreur = left('Réponse illisible : ' || sqlerrm, 300) where id = d.id;
      end;
    else
      update public.cashd_taux_demandes set recue_le = now(),
             erreur = left(format('BCE : %s %s', coalesce(h.status_code::text, ''), coalesce(h.error_msg, '')), 300) where id = d.id;
    end if;
    h := null;
  end loop;
  return n;
end $function$;

-- Le dernier taux connu de chaque devise des factures, et sa source (lecture pour l'écran et le point du matin).
create or replace function public.cashd_taux_connus(p_client uuid)
 returns jsonb language sql stable security invoker set search_path to ''
as $function$
  select coalesce(jsonb_agg(jsonb_build_object('devise', d.devise, 'jour', t.jour, 'taux', t.taux, 'source', t.source) order by d.devise), '[]'::jsonb)
  from (select distinct f.devise from public.cashd_factures f where f.client_id = p_client and f.devise <> 'EUR') d
  left join lateral (select x.jour, x.taux, x.source from public.cashd_taux_change x
                     where x.devise = d.devise and (x.client_id is null or x.client_id = p_client)
                     -- le même choix que cashd_factures_etat (c2_03) : le taux de l'organisation d'abord, puis le plus récent
                     and x.jour <= (now() at time zone 'Europe/Paris')::date
                     order by (x.client_id is not null) desc, x.jour desc limit 1) t on true
$function$;

do $do$ begin
  if to_regnamespace('cron') is not null then
    if not exists (select 1 from cron.job where jobname = 'cashd-taux-bce') then
      perform cron.schedule('cashd-taux-bce', '35 15 * * 1-5', 'select private.cashd_taux_bce_demander()');
    end if;
    if not exists (select 1 from cron.job where jobname = 'cashd-taux-bce-lire') then
      perform cron.schedule('cashd-taux-bce-lire', '*/15 15-18 * * 1-5', 'select private.cashd_taux_bce_lire()');
    end if;
  end if;
end $do$;

revoke execute on function private.cashd_taux_bce_adresse(text[]) from public, anon, authenticated;
revoke execute on function private.cashd_taux_bce_lire_csv(text) from public, anon, authenticated;
revoke execute on function private.cashd_taux_bce_demander(timestamptz) from public, anon, authenticated;
revoke execute on function private.cashd_taux_bce_ranger(text) from public, anon, authenticated;
revoke execute on function private.cashd_taux_bce_lire() from public, anon, authenticated;
revoke execute on function public.cashd_taux_connus(uuid) from public, anon;
grant execute on function public.cashd_taux_connus(uuid) to authenticated, service_role;
