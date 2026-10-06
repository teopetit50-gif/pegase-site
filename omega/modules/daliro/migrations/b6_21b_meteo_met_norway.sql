-- b6_21b — DALIRO : la météo par MET Norway (session B6, 06/10/2026)
--
-- DÉCISION (coordinateur, 06/10 18 h 25 Z, demande de Teo : une source gratuite). Locationforecast 2.0 de l'institut
-- météorologique norvégien (api.met.no) : gratuite y compris en usage commercial, données sous licence CC BY 4.0
-- (l'écran cite « Données météo : MET Norway »). Conditions (api.met.no/doc/TermsOfService) : en-tête User-Agent qui
-- identifie l'application et un contact, coordonnées à 4 décimales au plus (Daliro en garde 2), mise en cache et
-- If-Modified-Since, moins de 20 requêtes par seconde au total. Pas de lecture de pages de sites météo.
--
-- CE QUI CHANGE (b6_21 reste valable pour Open-Meteo, test b6_15 inchangé) :
--   · le fournisseur se lit dans l'adresse réglée : une adresse api.met.no → « met_norway » (…/compact?lat=…&lon=…) ;
--   · la requête porte User-Agent (réglage « daliro_meteo_user_agent », par défaut « OmegaAI/1.0 contact@omegaai.fr »)
--     et If-Modified-Since (le Last-Modified de la réponse précédente) ; on ne redemande pas avant l'Expires rendu ;
--   · une réponse 304 garde la prévision et compte comme reçue ;
--   · private.btp_meteo_lire_met : la série horaire (puis par 6 heures au-delà de deux jours et demi) rendue en jours de
--     Paris : pluie = somme des next_1_hours (ou next_6_hours là où il n'y a plus d'heure), vent moyen maximal (m/s →
--     km/h), températures minimale et maximale des relevés ;
--   · MET Norway ne donne pas les rafales hors de Scandinavie : sans rafales, le risque de vent se lit sur le vent
--     moyen à partir des deux tiers du seuil de rafales (40 km/h pour 60), dit tel quel (« rafales probables ») ;
--   · btp_meteo_chantier rend le fournisseur (l'écran affiche l'attribution).
--
-- Règles de pose : alter … add column if not exists / create or replace ; rien n'est retiré ni effacé.

alter table public.btp_meteo add column if not exists fournisseur text;
alter table public.btp_meteo add column if not exists derniere_modif text;
alter table public.btp_meteo add column if not exists expire_le timestamptz;

create or replace function private.btp_meteo_fournisseur()
 returns text
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select case when g.valeur like 'https://api.met.no/%' then 'met_norway'
              when g.valeur like 'https://%' then 'open_meteo' end
  from private.reglages g where g.cle = 'daliro_meteo_url'
$function$;

create or replace function private.btp_meteo_adresse(p_latitude numeric, p_longitude numeric)
 returns text
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_base text;
  v_cle text;
begin
  select nullif(btrim(g.valeur), '') into v_base from private.reglages g where g.cle = 'daliro_meteo_url';
  if v_base is null or v_base !~ '^https://' then
    return null;
  end if;
  if v_base like 'https://api.met.no/%' then
    -- MET Norway : quatre décimales au plus (on en garde deux), rien d'autre dans l'adresse.
    return v_base || '?lat=' || to_char(round(p_latitude, 2), 'FM990.00') || '&lon=' || to_char(round(p_longitude, 2), 'FM9990.00');
  end if;
  begin
    execute 'select decrypted_secret from vault.decrypted_secrets where name = $1 limit 1' into v_cle using 'daliro_meteo_cle';
  exception when others then
    v_cle := null;
  end;
  return v_base || '?latitude=' || to_char(p_latitude, 'FM990.00') || '&longitude=' || to_char(p_longitude, 'FM9990.00')
         || '&daily=precipitation_sum,wind_gusts_10m_max,temperature_2m_min,temperature_2m_max'
         || '&timezone=Europe%2FParis&forecast_days=7&models=meteofrance_seamless'
         || coalesce('&apikey=' || v_cle, '');
end $function$;

create or replace function private.btp_meteo_demander(p_maintenant timestamptz default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_jour date := (p_maintenant at time zone 'Europe/Paris')::date;
  v_adresse text;
  v_fournisseur text := private.btp_meteo_fournisseur();
  v_agent text;
  v_entetes jsonb;
  v_id bigint;
  n integer := 0;
begin
  select coalesce(nullif(btrim(g.valeur), ''), 'OmegaAI/1.0 contact@omegaai.fr') into v_agent from private.reglages g where g.cle = 'daliro_meteo_user_agent';
  v_agent := coalesce(v_agent, 'OmegaAI/1.0 contact@omegaai.fr');
  for r in
    select c.id, c.client_id, c.entite_id, round(c.latitude, 2) as lat, round(c.longitude, 2) as lon,
           m.derniere_modif, m.fournisseur as fournisseur_avant
    from public.btp_chantiers c
    left join public.btp_meteo m on m.chantier_id = c.id
    where c.statut in ('ouvert', 'suspendu') and c.latitude is not null and c.longitude is not null
      and public.btp_fonction_ouverte(c.client_id, 'meteo')
      and exists (select 1 from public.btp_passages p where p.chantier_id = c.id and p.statut = 'prevu' and p.exterieur
                                                       and p.remplace_par_id is null and p.fin >= v_jour and p.debut <= v_jour + 6)
      and (m.chantier_id is null or ((m.demandee_le is null or m.demandee_le <= p_maintenant - interval '5 hours')
                                     and (m.expire_le is null or m.expire_le <= p_maintenant)))
    order by c.id
    limit 500
  loop
    v_adresse := private.btp_meteo_adresse(r.lat, r.lon);
    exit when v_adresse is null;
    v_entetes := jsonb_build_object('User-Agent', v_agent);
    if r.derniere_modif is not null and r.fournisseur_avant is not distinct from v_fournisseur then
      v_entetes := v_entetes || jsonb_build_object('If-Modified-Since', r.derniere_modif);
    end if;
    begin
      v_id := net.http_get(v_adresse, '{}'::jsonb, v_entetes, 10000);
    exception when others then
      perform private.lever_alerte_module(r.client_id, 'daliro_meteo', 'info', 'La prévision météo n''a pas pu être demandée.',
        jsonb_build_object('chantier', r.id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'demande:' || r.id::text, false, null);
      continue;
    end;
    insert into public.btp_meteo (chantier_id, client_id, entite_id, latitude, longitude, demande_id, demandee_le, fournisseur)
    values (r.id, r.client_id, r.entite_id, r.lat, r.lon, v_id, p_maintenant, v_fournisseur)
    on conflict (chantier_id) do update
      set latitude = excluded.latitude, longitude = excluded.longitude, demande_id = excluded.demande_id,
          demandee_le = excluded.demandee_le, entite_id = excluded.entite_id, fournisseur = excluded.fournisseur, maj_le = now();
    n := n + 1;
  end loop;
  return n;
end $function$;

-- Une réponse MET Norway Locationforecast 2.0 (compact) → [{jour, pluie_mm, rafales_kmh: null, vent_kmh, tmin, tmax}].
create or replace function private.btp_meteo_lire_met(p_contenu jsonb)
 returns jsonb
 language sql
 immutable
 set search_path to ''
as $function$
  with pas as (
    select ((t ->> 'time')::timestamptz at time zone 'Europe/Paris')::date as jour,
           (t -> 'data' -> 'instant' -> 'details' ->> 'air_temperature')::numeric as temp,
           (t -> 'data' -> 'instant' -> 'details' ->> 'wind_speed')::numeric as vent_ms,
           coalesce((t -> 'data' -> 'next_1_hours' -> 'details' ->> 'precipitation_amount')::numeric,
                    case when t -> 'data' -> 'next_1_hours' is null then (t -> 'data' -> 'next_6_hours' -> 'details' ->> 'precipitation_amount')::numeric end) as pluie
    from jsonb_array_elements(coalesce(p_contenu -> 'properties' -> 'timeseries', '[]'::jsonb)) t
  ), jours as (
    select jour, round(coalesce(sum(pluie), 0), 1) as pluie_mm, round(max(vent_ms) * 3.6) as vent_kmh,
           round(min(temp), 1) as tmin, round(max(temp), 1) as tmax
    from pas where jour is not null group by jour order by jour limit 7
  )
  select coalesce(jsonb_agg(jsonb_build_object('jour', jour, 'pluie_mm', pluie_mm, 'rafales_kmh', null, 'vent_kmh', vent_kmh,
                                               'tmin', tmin, 'tmax', tmax) order by jour), '[]'::jsonb)
  from jours
$function$;

create or replace function private.btp_meteo_lire()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  m record;
  h record;
  v_expire timestamptz;
  n integer := 0;
begin
  for m in
    select * from public.btp_meteo where demande_id is not null and (recue_le is null or recue_le < demandee_le) order by demandee_le limit 500
  loop
    select x.status_code, x.content, x.timed_out, x.error_msg, x.headers into h from net._http_response x where x.id = m.demande_id;
    if not found then
      if m.demandee_le < now() - interval '1 hour' then
        update public.btp_meteo set erreur = 'Pas de réponse du service météo', recue_le = now(), maj_le = now() where chantier_id = m.chantier_id;
      end if;
      continue;
    end if;
    begin
      v_expire := (coalesce(h.headers ->> 'Expires', h.headers ->> 'expires'))::timestamptz;
    exception when others then
      v_expire := null;
    end;
    if h.status_code = 304 then
      update public.btp_meteo set recue_le = now(), erreur = null, expire_le = coalesce(v_expire, expire_le), maj_le = now() where chantier_id = m.chantier_id;
      perform private.btp_alerter_meteo(m.chantier_id);
      n := n + 1;
    elsif h.status_code = 200 and not coalesce(h.timed_out, false) then
      begin
        update public.btp_meteo
           set prevision = case when m.fournisseur = 'met_norway' then private.btp_meteo_lire_met(h.content::jsonb)
                                else private.btp_meteo_lire_reponse(h.content::jsonb) end,
               derniere_modif = coalesce(h.headers ->> 'Last-Modified', h.headers ->> 'last-modified'),
               expire_le = v_expire, recue_le = now(), erreur = null, maj_le = now()
        where chantier_id = m.chantier_id;
        perform private.btp_alerter_meteo(m.chantier_id);
        n := n + 1;
      exception when others then
        update public.btp_meteo set erreur = left('Réponse illisible : ' || sqlerrm, 300), recue_le = now(), maj_le = now() where chantier_id = m.chantier_id;
      end;
    else
      update public.btp_meteo set erreur = left(format('Service météo : %s %s', coalesce(h.status_code::text, ''), coalesce(h.error_msg, '')), 300),
             recue_le = now(), maj_le = now()
      where chantier_id = m.chantier_id;
    end if;
  end loop;
  return n;
end $function$;

-- Les risques : sans rafales (MET Norway hors de Scandinavie), le vent moyen à partir des deux tiers du seuil.
create or replace function private.btp_risques_meteo(p_client uuid, p_jour date, p_chantier uuid default null)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  with jours as (
    select p.id as passage_id, p.tache, p.chantier_id, c.nom as chantier_nom, c.conducteur_id,
           (d ->> 'jour')::date as jour,
           (d ->> 'pluie_mm')::numeric as pluie, (d ->> 'rafales_kmh')::numeric as rafales, (d ->> 'vent_kmh')::numeric as vent,
           (d ->> 'tmin')::numeric as tmin, (d ->> 'tmax')::numeric as tmax,
           coalesce(p.seuil_pluie_mm, 5) as s_pluie, coalesce(p.seuil_vent_kmh, 60) as s_vent,
           coalesce(p.seuil_temp_min, 0) as s_tmin, p.seuil_temp_max as s_tmax
    from public.btp_passages p
    join public.btp_chantiers c on c.id = p.chantier_id
    join public.btp_meteo m on m.chantier_id = p.chantier_id
    cross join lateral jsonb_array_elements(m.prevision) d
    where p.client_id = p_client and (p_chantier is null or p.chantier_id = p_chantier)
      and p.statut = 'prevu' and p.exterieur and p.remplace_par_id is null
      and c.statut in ('ouvert', 'suspendu')
      and (d ->> 'jour')::date between greatest(p.debut, p_jour) and least(p.fin, p_jour + 6)
  ), risques as (
    select j.*, array_remove(array[
             case when j.pluie >= j.s_pluie then format('pluie %s mm (seuil %s)', translate(regexp_replace(to_char(j.pluie, 'FM990.0'), '\.0$', ''), '.', ','), translate(regexp_replace(to_char(j.s_pluie, 'FM990.0'), '\.0$', ''), '.', ',')) end,
             case when j.rafales >= j.s_vent then format('rafales %s km/h (seuil %s)', round(j.rafales), j.s_vent)
                  when j.rafales is null and j.vent >= round(j.s_vent * 2 / 3.0) then format('vent moyen %s km/h, rafales probables au-delà de %s', round(j.vent), j.s_vent) end,
             case when j.tmin < j.s_tmin then case when j.s_tmin = 0 then format('gel, %s °C', translate(regexp_replace(to_char(j.tmin, 'FM990.0'), '\.0$', ''), '.', ',')) else format('%s °C au plus bas (seuil %s °C)', translate(regexp_replace(to_char(j.tmin, 'FM990.0'), '\.0$', ''), '.', ','), j.s_tmin) end end,
             case when j.s_tmax is not null and j.tmax > j.s_tmax then format('%s °C au plus haut (seuil %s °C)', translate(regexp_replace(to_char(j.tmax, 'FM990.0'), '\.0$', ''), '.', ','), j.s_tmax) end
           ], null) as motifs
    from jours j
  ), premiers as (
    select distinct on (r.passage_id) r.* from risques r where cardinality(r.motifs) > 0 order by r.passage_id, r.jour
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'passage_id', x.passage_id, 'tache', x.tache, 'chantier_id', x.chantier_id, 'chantier_nom', x.chantier_nom,
           'conducteur_id', x.conducteur_id, 'jour', x.jour, 'motifs', to_jsonb(x.motifs),
           'texte', format('%s, %s %s : %s sur « %s » (extérieur) — décalez ou protégez',
                           x.chantier_nom, (array['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'])[extract(isodow from x.jour)::int],
                           to_char(x.jour, 'DD/MM'), array_to_string(x.motifs, ', '), coalesce(x.tache, 'passage')))
         order by x.jour, x.chantier_nom), '[]'::jsonb)
  from premiers x
$function$;

create or replace function public.btp_meteo_chantier(p_chantier uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
begin
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  if not private.btp_est_serveur() and ((select auth.uid()) is null or c.client_id not in (select private.mes_clients())
                                       or not private.voit_entite(c.client_id, c.entite_id)) then
    raise exception 'Ce chantier ne vous est pas ouvert.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'localise', c.latitude is not null,
    'ouverte', public.btp_fonction_ouverte(c.client_id, 'meteo'),
    'prevision', coalesce((select m.prevision from public.btp_meteo m where m.chantier_id = c.id), '[]'::jsonb),
    'recue_le', (select m.recue_le from public.btp_meteo m where m.chantier_id = c.id),
    'erreur', (select m.erreur from public.btp_meteo m where m.chantier_id = c.id),
    'fournisseur', (select m.fournisseur from public.btp_meteo m where m.chantier_id = c.id),
    'risques', private.btp_risques_meteo(c.client_id, (now() at time zone 'Europe/Paris')::date, c.id));
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Droits (à inscrire dans omega/a5_01_liste_figee.txt)
-- ─────────────────────────────────────────────────────────────────────────
revoke execute on function private.btp_meteo_fournisseur() from public, anon, authenticated;
revoke execute on function private.btp_meteo_adresse(numeric, numeric) from public, anon, authenticated;
revoke execute on function private.btp_meteo_demander(timestamptz) from public, anon, authenticated;
revoke execute on function private.btp_meteo_lire_met(jsonb) from public, anon, authenticated;
revoke execute on function private.btp_meteo_lire() from public, anon, authenticated;
revoke execute on function private.btp_risques_meteo(uuid, date, uuid) from public, anon, authenticated;
grant execute on function private.btp_meteo_fournisseur() to service_role;
grant execute on function private.btp_meteo_adresse(numeric, numeric) to service_role;
grant execute on function private.btp_meteo_demander(timestamptz) to service_role;
grant execute on function private.btp_meteo_lire_met(jsonb) to service_role;
grant execute on function private.btp_meteo_lire() to service_role;
grant execute on function private.btp_risques_meteo(uuid, date, uuid) to service_role;
revoke execute on function public.btp_meteo_chantier(uuid) from public, anon;
grant execute on function public.btp_meteo_chantier(uuid) to authenticated, service_role;
