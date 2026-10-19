-- b6_21 — DALIRO : l'alerte météo sur les tâches sensibles (session B6, 06/10/2026)
--
-- CE QUE ÇA CORRIGE. Le socle porte des seuils météo sur chaque passage (pluie, vent, températures) et la position
-- de chaque chantier ; le contrôle « chantier_sans_coordonnees » dit même « pas de météo ». Aucune prévision n'était
-- lue : la couverture posée sous la pluie, la grue sous les rafales, la chape sous le gel se découvraient le matin.
--
-- CE QUI EST POSÉ.
--   · public.btp_meteo : la dernière prévision à 7 jours de chaque chantier (cumul de pluie, rafales maximales,
--     minimale et maximale par jour), position arrondie à 0,01° (environ 1 km : rien de plus précis ne sort).
--   · private.btp_meteo_demander() : deux fois par jour (cron daliro-meteo), pour chaque chantier ouvert ou suspendu,
--     localisé, dont la formule ouvre « meteo » (btp_fonction_ouverte) et qui a un passage extérieur prévu dans les
--     7 jours : une requête HTTP par pg_net (net.http_get), asynchrone.
--   · private.btp_meteo_lire() : toutes les 10 minutes (cron daliro-meteo-lire), lit les réponses
--     (net._http_response), range la prévision, lève les alertes.
--   · private.btp_risques_meteo(client, jour) : chaque passage prévu, extérieur, dont un jour des 7 prochains dépasse
--     un seuil — ceux du passage, sinon : pluie ≥ 5 mm dans la journée, rafales ≥ 60 km/h, gel (minimale < 0 °C) ;
--     la chaleur n'est regardée que si le passage a son seuil.
--   · Alerte au conducteur du chantier (private.lever_alerte_module, module daliro_meteo, une par passage et par jour),
--     ligne au point du matin (b6_19 + ce bloc), et public.btp_meteo_chantier(chantier) pour l'écran.
--
-- LA SOURCE (décision du coordinateur). L'adresse du service est lue dans private.reglages (« daliro_meteo_url ») ;
-- sans elle, rien n'est demandé. Le format attendu est celui d'Open-Meteo (/v1/forecast, données quotidiennes,
-- modèle meteofrance_seamless : AROME et ARPEGE de Météo-France). L'API gratuite d'Open-Meteo est réservée à l'usage
-- non commercial : pour Omega, l'adresse d'abonnement (customer-api.open-meteo.com) et sa clé, lue dans le vault
-- (secret « daliro_meteo_cle ») si elle existe.
--
-- Règles de pose : create … if not exists / create or replace ; cron.schedule si absent ; rien n'est retiré ni effacé.
-- La fonction du point du matin est celle de b6_19 à l'identique, plus le bloc « 0 quater » : poser APRÈS b6_19.

create table if not exists public.btp_meteo (
  chantier_id uuid primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  latitude numeric(5,2) not null,
  longitude numeric(6,2) not null,
  demande_id bigint,
  demandee_le timestamptz,
  recue_le timestamptz,
  prevision jsonb not null default '[]'::jsonb,
  erreur text,
  maj_le timestamptz not null default now(),
  constraint btp_meteo_chantier_fkey foreign key (client_id, chantier_id) references public.btp_chantiers(client_id, id) on delete cascade,
  constraint btp_meteo_erreur_check check (char_length(erreur) <= 300)
);
comment on table public.btp_meteo is 'DALIRO — la dernière prévision à 7 jours de chaque chantier (pg_net). Écrite par le serveur seul.';
alter table public.btp_meteo enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_meteo' and policyname = 'membres lisent la meteo de leurs chantiers') then
    create policy "membres lisent la meteo de leurs chantiers" on public.btp_meteo
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $do$;
revoke all on table public.btp_meteo from anon, authenticated;
grant select on table public.btp_meteo to authenticated;
do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select x from unnest(array['btp_meteo']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;

-- ─────────────────────────────────────────────────────────────────────────
-- Demander, puis lire
-- ─────────────────────────────────────────────────────────────────────────
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
  v_id bigint;
  n integer := 0;
begin
  for r in
    select c.id, c.client_id, c.entite_id, round(c.latitude, 2) as lat, round(c.longitude, 2) as lon
    from public.btp_chantiers c
    where c.statut in ('ouvert', 'suspendu') and c.latitude is not null and c.longitude is not null
      and public.btp_fonction_ouverte(c.client_id, 'meteo')
      and exists (select 1 from public.btp_passages p where p.chantier_id = c.id and p.statut = 'prevu' and p.exterieur
                                                       and p.remplace_par_id is null and p.fin >= v_jour and p.debut <= v_jour + 6)
      and not exists (select 1 from public.btp_meteo m where m.chantier_id = c.id and m.demandee_le > p_maintenant - interval '5 hours')
    order by c.id
    limit 500
  loop
    v_adresse := private.btp_meteo_adresse(r.lat, r.lon);
    exit when v_adresse is null;
    begin
      v_id := net.http_get(v_adresse, '{}'::jsonb, '{}'::jsonb, 10000);
    exception when others then
      perform private.lever_alerte_module(r.client_id, 'daliro_meteo', 'info', 'La prévision météo n''a pas pu être demandée.',
        jsonb_build_object('chantier', r.id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'demande:' || r.id::text, false, null);
      continue;
    end;
    insert into public.btp_meteo (chantier_id, client_id, entite_id, latitude, longitude, demande_id, demandee_le)
    values (r.id, r.client_id, r.entite_id, r.lat, r.lon, v_id, p_maintenant)
    on conflict (chantier_id) do update
      set latitude = excluded.latitude, longitude = excluded.longitude, demande_id = excluded.demande_id,
          demandee_le = excluded.demandee_le, entite_id = excluded.entite_id, maj_le = now();
    n := n + 1;
  end loop;
  return n;
end $function$;

-- Une réponse Open-Meteo (« daily ») → [{jour, pluie_mm, rafales_kmh, tmin, tmax}].
create or replace function private.btp_meteo_lire_reponse(p_contenu jsonb)
 returns jsonb
 language sql
 immutable
 set search_path to ''
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
           'jour', (p_contenu -> 'daily' -> 'time' ->> k),
           'pluie_mm', (p_contenu -> 'daily' -> 'precipitation_sum' ->> k)::numeric,
           'rafales_kmh', (p_contenu -> 'daily' -> 'wind_gusts_10m_max' ->> k)::numeric,
           'tmin', (p_contenu -> 'daily' -> 'temperature_2m_min' ->> k)::numeric,
           'tmax', (p_contenu -> 'daily' -> 'temperature_2m_max' ->> k)::numeric) order by k), '[]'::jsonb)
  from generate_series(0, coalesce(jsonb_array_length(p_contenu -> 'daily' -> 'time'), 0) - 1) k
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
  n integer := 0;
begin
  for m in
    select * from public.btp_meteo where demande_id is not null and (recue_le is null or recue_le < demandee_le) order by demandee_le limit 500
  loop
    select x.status_code, x.content, x.timed_out, x.error_msg into h from net._http_response x where x.id = m.demande_id;
    if not found then
      if m.demandee_le < now() - interval '1 hour' then
        update public.btp_meteo set erreur = 'Pas de réponse du service météo', recue_le = now(), maj_le = now() where chantier_id = m.chantier_id;
      end if;
      continue;
    end if;
    if h.status_code = 200 and not coalesce(h.timed_out, false) then
      begin
        update public.btp_meteo set prevision = private.btp_meteo_lire_reponse(h.content::jsonb), recue_le = now(), erreur = null, maj_le = now()
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

-- ─────────────────────────────────────────────────────────────────────────
-- Les risques : passage par passage, le premier jour qui dépasse un seuil
-- ─────────────────────────────────────────────────────────────────────────
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
           (d ->> 'pluie_mm')::numeric as pluie, (d ->> 'rafales_kmh')::numeric as rafales,
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
             case when j.rafales >= j.s_vent then format('rafales %s km/h (seuil %s)', round(j.rafales), j.s_vent) end,
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

create or replace function private.btp_alerter_meteo(p_chantier uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
  r jsonb;
  n integer := 0;
begin
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    return 0;
  end if;
  for r in select x from jsonb_array_elements(private.btp_risques_meteo(c.client_id, (now() at time zone 'Europe/Paris')::date, c.id)) x loop
    begin
      perform private.lever_alerte_module(c.client_id, 'daliro_meteo',
        case when (r ->> 'jour')::date <= (now() at time zone 'Europe/Paris')::date + 2 then 'attention' else 'info' end,
        left('Météo — ' || (r ->> 'texte'), 150),
        jsonb_build_object('chantier', c.id, 'passage', r -> 'passage_id', 'jour', r -> 'jour', 'motifs', r -> 'motifs'),
        'meteo:' || (r ->> 'passage_id') || ':' || (r ->> 'jour'), true, c.conducteur_id);
      n := n + 1;
    exception when others then
      null;  -- un conducteur qui n'est plus membre ne bloque pas les autres alertes
    end;
  end loop;
  return n;
end $function$;

-- L'écran : la prévision du chantier et ses risques.
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
    'risques', private.btp_risques_meteo(c.client_id, (now() at time zone 'Europe/Paris')::date, c.id));
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Le point du matin (b6_19) : plus la météo
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_point_matin_lignes(p_client uuid, p_jour date)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_items jsonb := '[]'::jsonb;
  v_n integer := 0;
  v_total numeric;
  v_facture numeric;
  v_ouvertes integer;
begin
  -- 0. Les situations en retard de paiement (b6_16) : relancez.
  for r in
    select s.id, s.numero, s.chantier_id, c.nom as chantier_nom, private.btp_encaissement(s.id, p_jour) as e
    from public.btp_situations s join public.btp_chantiers c on c.id = s.chantier_id
    where s.client_id = p_client and s.statut = 'validee' and s.echeance < p_jour
    order by s.echeance, c.nom, s.numero
  loop
    continue when r.e ->> 'etat' <> 'en_retard';
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : situation n° %s impayée depuis %s jour%s, reste dû %s € (indemnité de 40 € due) : relancez', r.chantier_nom, r.numero,
                           r.e ->> 'retard_jours', case when (r.e ->> 'retard_jours')::int > 1 then 's' else '' end,
                           translate(to_char((r.e ->> 'reste_du')::numeric, 'FM999,999,990.00'), ',.', ' ,')), 300),
      'gravite', case when (r.e ->> 'retard_jours')::int >= 30 then 'critique' else 'attention' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 0 bis. Les avenants pas encore signés (b6_18) : un travail supplémentaire exécuté sans accord écrit risque de
  -- ne pas être payé (marché à forfait : Code civil, art. 1793).
  for r in
    select a.id, a.numero, a.objet, a.statut, a.chantier_id, c.nom as chantier_nom,
           (a.cree_le at time zone 'Europe/Paris')::date as cree_jour,
           (a.soumis_le at time zone 'Europe/Paris')::date as soumis_jour,
           d.statut as demande_statut,
           (select coalesce(sum(l.montant_ht), 0) from public.btp_avenants_lignes l where l.avenant_id = a.id and not l.retiree) as montant
    from public.btp_avenants a
    join public.btp_chantiers c on c.id = a.chantier_id
    left join public.demandes_validation d on d.id = a.demande_id
    where a.client_id = p_client and a.statut in ('brouillon', 'soumis') and c.statut in ('preparation', 'ouvert', 'suspendu')
    order by a.soumis_le nulls last, a.cree_le, c.nom, a.numero
  loop
    exit when v_n >= 50;
    if r.statut = 'soumis' and r.demande_statut = 'approuvee' then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : avenant n° %s « %s » (%s € HT) validé, pas encore signé : faites-le signer par le maître d''ouvrage avant d''exécuter (C. civ. art. 1793)',
                             r.chantier_nom, r.numero, left(r.objet, 60), translate(to_char(r.montant, 'FM999,999,990.00'), ',.', ' ,')), 300),
        'gravite', case when r.soumis_jour <= p_jour - 14 then 'critique' else 'attention' end,
        'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
      v_n := v_n + 1;
    elsif r.statut = 'soumis' and r.demande_statut = 'en_attente' and r.soumis_jour <= p_jour - 2 then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : avenant n° %s « %s » en attente de validation depuis le %s : décidez dans « À valider »',
                             r.chantier_nom, r.numero, left(r.objet, 60), to_char(r.soumis_jour, 'DD/MM/YYYY')), 300),
        'gravite', case when r.soumis_jour <= p_jour - 7 then 'attention' else 'info' end,
        'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
      v_n := v_n + 1;
    elsif r.statut = 'brouillon' and r.cree_jour <= p_jour - 7 then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : avenant n° %s « %s » en préparation depuis le %s : chiffrez-le et soumettez-le, ou abandonnez-le',
                             r.chantier_nom, r.numero, left(r.objet, 60), to_char(r.cree_jour, 'DD/MM/YYYY')), 300),
        'gravite', 'info',
        'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
      v_n := v_n + 1;
    end if;
  end loop;

  -- 0 ter. Les passages qui devaient être finis et ne sont pas notés faits (b6_19) : notez-les faits ou recalez la suite.
  for r in
    select q.id, q.tache, q.fin, q.chantier_id, c.nom as chantier_nom,
           coalesce((select e.nom from public.btp_equipes e where e.id = q.equipe_id),
                    (select t.nom from public.btp_tiers t where t.id = q.tiers_id), q.intervenant_lu) as intervenant,
           (with recursive aval(id) as (
              select d.aval_id from public.btp_dependances d where d.amont_id = q.id
              union
              select d.aval_id from public.btp_dependances d join aval x on d.amont_id = x.id)
            select count(*) from aval x join public.btp_passages w on w.id = x.id where w.statut = 'prevu') as en_aval
    from public.btp_passages q join public.btp_chantiers c on c.id = q.chantier_id
    where q.client_id = p_client and q.statut = 'prevu' and q.remplace_par_id is null and q.fin < p_jour
      and c.statut in ('ouvert', 'suspendu')
    order by q.fin, c.nom
  loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : « %s »%s devait finir le %s et n''est pas noté fait : notez-le fait ou recalez la suite%s',
                           r.chantier_nom, coalesce(r.tache, 'passage'), coalesce(' (' || r.intervenant || ')', ''), to_char(r.fin, 'DD/MM/YYYY'),
                           case when r.en_aval > 0 then format(' (%s passage%s en aval)', r.en_aval, case when r.en_aval > 1 then 's' else '' end) else '' end), 300),
      'gravite', case when r.en_aval > 0 then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 0 quater. La météo des passages extérieurs (b6_21) : décalez ou protégez.
  for r in select x from jsonb_array_elements(private.btp_risques_meteo(p_client, p_jour)) x loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(r.x ->> 'texte', 300),
      'gravite', case when (r.x ->> 'jour')::date <= p_jour + 2 then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.x ->> 'chantier_id');
    v_n := v_n + 1;
  end loop;

  -- 1. Les retenues : dues (à réclamer), puis dues dans les 30 jours.
  for r in
    select x.*, c.nom as chantier_nom from public.btp_receptions x join public.btp_chantiers c on c.id = x.chantier_id
    where x.client_id = p_client and x.retenue_statut = 'bloquee' and (x.retenue_montant > 0 or x.retenue_caution)
      and x.retenue_due_le <= p_jour + 30
    order by x.retenue_due_le, c.nom
  loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : %s %s le %s%s', r.chantier_nom,
                           case when r.retenue_caution then 'caution de retenue de garantie' else 'retenue de garantie de ' || translate(to_char(r.retenue_montant, 'FM999,999,990.00'), ',.', ' ,') || ' €' end,
                           case when r.retenue_due_le <= p_jour then 'due depuis' else 'due' end,
                           to_char(r.retenue_due_le, 'DD/MM/YYYY'),
                           case when r.retenue_due_le <= p_jour then ' : réclamez-la' else '' end), 300),
      'gravite', case when r.retenue_due_le <= p_jour then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 2. Les décomptes finals à envoyer (45 jours après la réception).
  for r in
    select x.*, c.nom as chantier_nom from public.btp_receptions x join public.btp_chantiers c on c.id = x.chantier_id
    where x.client_id = p_client and x.decompte_statut in ('a_preparer', 'projet')
    order by x.date_reception, c.nom
  loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : décompte final à envoyer %s le %s', r.chantier_nom,
                           case when p_jour > r.date_reception + 45 then 'depuis' else 'avant' end,
                           to_char(r.date_reception + 45, 'DD/MM/YYYY')), 300),
      'gravite', case when p_jour >= r.date_reception + 30 then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 3. Les réserves encore ouvertes.
  for r in
    select x.chantier_id, x.date_reception, c.nom as chantier_nom, count(v.id) as ouvertes
    from public.btp_receptions x
    join public.btp_chantiers c on c.id = x.chantier_id
    join public.btp_reserves v on v.reception_id = x.id and v.statut = 'ouverte'
    where x.client_id = p_client
    group by x.chantier_id, x.date_reception, c.nom
    order by x.date_reception, c.nom
  loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : %s réserve%s encore ouverte%s depuis la réception du %s', r.chantier_nom, r.ouvertes,
                           case when r.ouvertes > 1 then 's' else '' end, case when r.ouvertes > 1 then 's' else '' end,
                           to_char(r.date_reception, 'DD/MM/YYYY')), 300),
      'gravite', case when p_jour >= r.date_reception + 60 then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 4. Les réceptions à prononcer.
  for r in
    select c.* from public.btp_chantiers c
    where c.client_id = p_client and c.statut in ('ouvert', 'suspendu')
      and not exists (select 1 from public.btp_receptions x where x.chantier_id = c.id)
    order by c.nom
  loop
    exit when v_n >= 50;
    select coalesce(sum(l.montant_ht), 0) into v_total
    from public.btp_lignes_marche l
    where l.nature <> 'option'
      and l.marche_id = (select m.id from public.btp_marches m where m.chantier_id = r.id and m.statut = 'verifie' order by m.verifie_le desc nulls last limit 1);
    v_total := v_total + coalesce((select sum(l.montant_ht) from public.btp_avenants_lignes l join public.btp_avenants a on a.id = l.avenant_id
                                   where a.chantier_id = r.id and a.statut = 'signe' and not l.retiree), 0);
    select s.cumul_ht into v_facture from public.btp_situations s where s.chantier_id = r.id and s.statut = 'validee' order by s.numero desc limit 1;
    if v_total > 0 and coalesce(v_facture, 0) >= v_total * 0.995 then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : travaux facturés à 100 %% par les situations — prononcez la réception', r.nom), 300),
        'gravite', 'attention', 'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.id::text);
      v_n := v_n + 1;
    elsif r.date_fin_prevue is not null and r.date_fin_prevue < p_jour then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : fin prévue le %s dépassée — réception à prononcer ou planning à recaler', r.nom,
                             to_char(r.date_fin_prevue, 'DD/MM/YYYY')), 300),
        'gravite', 'info', 'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.id::text);
      v_n := v_n + 1;
    end if;
  end loop;
  return v_items;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Droits (à inscrire dans omega/a5_01_liste_figee.txt) et crons
-- ─────────────────────────────────────────────────────────────────────────
revoke execute on function private.btp_meteo_adresse(numeric, numeric) from public, anon, authenticated;
revoke execute on function private.btp_meteo_demander(timestamptz) from public, anon, authenticated;
revoke execute on function private.btp_meteo_lire_reponse(jsonb) from public, anon, authenticated;
revoke execute on function private.btp_meteo_lire() from public, anon, authenticated;
revoke execute on function private.btp_risques_meteo(uuid, date, uuid) from public, anon, authenticated;
revoke execute on function private.btp_alerter_meteo(uuid) from public, anon, authenticated;
revoke execute on function private.btp_point_matin_lignes(uuid, date) from public, anon, authenticated;
grant execute on function private.btp_meteo_adresse(numeric, numeric) to service_role;
grant execute on function private.btp_meteo_demander(timestamptz) to service_role;
grant execute on function private.btp_meteo_lire_reponse(jsonb) to service_role;
grant execute on function private.btp_meteo_lire() to service_role;
grant execute on function private.btp_risques_meteo(uuid, date, uuid) to service_role;
grant execute on function private.btp_alerter_meteo(uuid) to service_role;
grant execute on function private.btp_point_matin_lignes(uuid, date) to service_role;
revoke execute on function public.btp_meteo_chantier(uuid) from public, anon;
grant execute on function public.btp_meteo_chantier(uuid) to authenticated, service_role;

select cron.schedule('daliro-meteo', '7 3,12 * * *', $cron$select private.btp_meteo_demander()$cron$)
where not exists (select 1 from cron.job where jobname = 'daliro-meteo');
select cron.schedule('daliro-meteo-lire', '*/10 * * * *', $cron$select private.btp_meteo_lire()$cron$)
where not exists (select 1 from cron.job where jobname = 'daliro-meteo-lire');
