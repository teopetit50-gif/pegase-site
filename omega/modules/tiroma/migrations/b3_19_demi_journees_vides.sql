-- b3_19 — Les demi-journées vides des collaborateurs (audit des promesses, § 2 Tiroma, n° 5).
--
-- CE QUE ÇA CORRIGE : la page /secteurs/dentaire promet « Demi-journées vides des collaborateurs » (offre Groupe) et
-- raconte « Le collaborateur a une demi-journée vide jeudi. Le titulaire l'apprend le jeudi matin. » La charge des
-- fauteuils (b3_05) ne regarde que le jour même et par fauteuil : rien ne voyait venir l'agenda vide d'un praticien.
--
-- LE CALCUL, sur les p_jours prochains jours, par praticien actif et par demi-journée (matin avant 13 h, après-midi) :
--   · les heures où il consulte : ses horaires propres (tiroma_horaires.praticien_id) s'il en a ; sinon les horaires
--     du cabinet, réduits aux demi-journées où il travaille d'habitude (des rendez-vous à cette demi-journée de la
--     semaine au moins 3 des 8 dernières semaines). Un jour férié ferme ; un horaire exceptionnel du jour l'emporte ;
--     ses fermetures et celles du cabinet, et ses plages « personnel », se retirent ;
--   · ce qui est réservé : ses rendez-vous prévus ou honorés ;
--   · « vide » : au moins une heure ouverte et une occupation sous le seuil du cabinet (tiroma_regles.seuil_demi_journee_vide).
--   Aujourd'hui, seul ce qui reste de la journée compte. Pour chaque demi-journée vide : les minutes libres, et le
--   nombre de patients de la liste d'attente qui pourraient la remplir (sans praticien demandé ou avec lui).
--
-- QUI LE VOIT : le titulaire, pour tous les praticiens ; un collaborateur, pour son propre agenda seulement. Ni
-- l'assistante ni la direction : la page promet que la charge ne se lit jamais par personne hors du titulaire. On ne
-- regarde que l'avenir, sans taux passé : c'est un agenda à remplir, pas une note.
--
-- CE QUE ÇA POSE :
--   public.tiroma_demi_journees_vides(p_client, p_entite, p_jours int = 14) → jsonb
--     { du, au, seuil, demi_journees: [{praticien_id, praticien, jour, moment ('matin' | 'apres_midi'), source
--       ('horaires' | 'habitude'), ouvert_min, prevu_min, libre_min, taux, attente}] }   (jours de 1 à 28)
--   private.tiroma_deposer_demi_journees(p_maintenant) : chaque jour dès 5 h (heure du cabinet), au point du matin du
--     titulaire, une section « Demi-journées vides — <centre> » pour les sept jours qui viennent (8 lignes au plus),
--     sans nom de patient (sante = false). Cron tiroma-demi-journees.
-- Lecture seule pour les profils ; idempotent (create or replace, grant, cron s'il manque).

create or replace function private.tiroma_ouvert_praticien(p_client uuid, p_entite uuid, p_praticien uuid, p_jour date)
 returns table(ouvert tstzmultirange, source text)
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_fuseau text;
  v_territoire text;
  v_complet boolean;
  v_propres boolean;
  v_exception boolean;
  v_ouvert tstzmultirange;
  v_habitude tstzmultirange := '{}'::tstzmultirange;
  v_moitie record;
begin
  select e.fuseau into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;
  if v_fuseau is null then
    return;
  end if;
  v_propres := exists (select 1 from public.tiroma_horaires h
                       where h.client_id = p_client and h.entite_id = p_entite and h.praticien_id = p_praticien);
  v_exception := exists (
    select 1 from public.tiroma_horaires h
    where h.client_id = p_client and h.entite_id = p_entite and h.exceptionnel and h.valide_du = p_jour
      and (case when v_propres then h.praticien_id = p_praticien else h.praticien_id is null and h.fauteuil_id is null end));
  if not v_exception then
    v_territoire := private.territoire_de_entite(p_client, p_entite);
    select t.complet into v_complet from public.territoires t where t.code = v_territoire;
    if not coalesce(v_complet, false) then
      return;  -- jours fériés inconnus : on ne sait pas si le cabinet ouvre
    end if;
    if public.jour_ferie(p_jour, v_territoire) then
      ouvert := '{}'::tstzmultirange;
      source := case when v_propres then 'horaires' else 'habitude' end;
      return next;
      return;
    end if;
  end if;

  select range_agg(tstzmultirange(tstzrange((p_jour + h.debut) at time zone v_fuseau, (p_jour + h.fin) at time zone v_fuseau)))
    into v_ouvert
  from public.tiroma_horaires h
  where h.client_id = p_client and h.entite_id = p_entite
    and (case when v_propres then h.praticien_id = p_praticien else h.praticien_id is null and h.fauteuil_id is null end)
    and (case when v_exception then h.exceptionnel and h.valide_du = p_jour
              else not h.exceptionnel and h.jour = extract(isodow from p_jour)
                   and (h.valide_du is null or h.valide_du <= p_jour)
                   and (h.valide_au is null or h.valide_au >= p_jour) end);
  v_ouvert := coalesce(v_ouvert, '{}'::tstzmultirange);

  if not v_propres then
    -- Sans horaires propres : les demi-journées où il travaille d'habitude (3 des 8 dernières semaines au moins).
    for v_moitie in
      select m.matin,
             case when m.matin then tstzrange(p_jour::timestamp at time zone v_fuseau, (p_jour + time '13:00') at time zone v_fuseau)
                  else tstzrange((p_jour + time '13:00') at time zone v_fuseau, (p_jour + 1)::timestamp at time zone v_fuseau) end as plage
      from (values (true), (false)) m(matin)
    loop
      if (select count(distinct (r.debut at time zone v_fuseau)::date)
          from public.tiroma_rendez_vous r
          where r.client_id = p_client and r.entite_id = p_entite and r.praticien_id = p_praticien
            and r.statut in ('prevu', 'honore', 'manque') and r.disparu_le is null
            and (r.debut at time zone v_fuseau)::date between p_jour - 56 and p_jour - 1
            and extract(isodow from r.debut at time zone v_fuseau) = extract(isodow from p_jour)
            and ((r.debut at time zone v_fuseau)::time < time '13:00') = v_moitie.matin) >= 3 then
        v_habitude := v_habitude + tstzmultirange(v_moitie.plage);
      end if;
    end loop;
    v_ouvert := v_ouvert * v_habitude;
  end if;

  -- Ses fermetures et celles du cabinet, ses plages « personnel ».
  v_ouvert := v_ouvert
    - coalesce((select range_agg(tstzrange(f.debut, f.fin)) from public.tiroma_fermetures f
                where f.client_id = p_client and f.entite_id = p_entite
                  and (f.praticien_id = p_praticien or (f.praticien_id is null and f.fauteuil_id is null))
                  and tstzrange(f.debut, f.fin) && private.tiroma_bornes_jour(p_jour, v_fuseau)), '{}'::tstzmultirange)
    - coalesce((select range_agg(tstzrange(r.debut, r.fin)) from public.tiroma_rendez_vous r
                join public.tiroma_types_rdv t on t.id = r.type_rdv_id
                where r.client_id = p_client and r.entite_id = p_entite and r.praticien_id = p_praticien
                  and t.famille = 'personnel' and r.statut in ('prevu', 'honore') and r.disparu_le is null
                  and tstzrange(r.debut, r.fin) && private.tiroma_bornes_jour(p_jour, v_fuseau)), '{}'::tstzmultirange);
  ouvert := v_ouvert;
  source := case when v_propres then 'horaires' else 'habitude' end;
  return next;
end $function$;

create or replace function private.tiroma_demi_journees_calc(p_client uuid, p_entite uuid, p_du date, p_au date,
                                                             p_praticien uuid default null, p_depuis timestamp with time zone default now())
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_fuseau text;
  v_seuil numeric;
  p record;
  d date;
  o record;
  v_moitie record;
  v_ouv tstzmultirange;
  v_prevu tstzmultirange;
  m_ouv numeric;
  m_prevu numeric;
  v_res jsonb := '[]'::jsonb;
begin
  select coalesce(e.fuseau, 'Europe/Paris') into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;
  v_fuseau := coalesce(v_fuseau, 'Europe/Paris');
  select g.seuil_demi_journee_vide into v_seuil from public.tiroma_regles g where g.client_id = p_client and g.entite_id = p_entite;
  v_seuil := coalesce(v_seuil, 0.2);

  for p in
    select k.id, k.nom_affiche from public.tiroma_praticiens k
    where k.client_id = p_client and k.entite_id = p_entite and k.actif and (p_praticien is null or k.id = p_praticien)
    order by k.nom_affiche, k.id
  loop
    for d in select g::date from generate_series(p_du, p_au, interval '1 day') g loop
      select * into o from private.tiroma_ouvert_praticien(p_client, p_entite, p.id, d);
      continue when o.ouvert is null or isempty(o.ouvert);
      for v_moitie in
        select m.moment,
               case when m.moment = 'matin' then tstzrange(d::timestamp at time zone v_fuseau, (d + time '13:00') at time zone v_fuseau)
                    else tstzrange((d + time '13:00') at time zone v_fuseau, (d + 1)::timestamp at time zone v_fuseau) end as plage
        from (values ('matin'), ('apres_midi')) m(moment)
      loop
        -- Ce qui reste de la demi-journée.
        v_ouv := o.ouvert * tstzmultirange(v_moitie.plage) * tstzmultirange(tstzrange(p_depuis, null));
        m_ouv := private.tiroma_minutes(v_ouv);
        continue when m_ouv < 60;
        select coalesce(range_agg(tstzrange(r.debut, r.fin)), '{}'::tstzmultirange) into v_prevu
        from public.tiroma_rendez_vous r
        left join public.tiroma_types_rdv t on t.id = r.type_rdv_id
        where r.client_id = p_client and r.entite_id = p_entite and r.praticien_id = p.id
          and r.statut in ('prevu', 'honore') and r.disparu_le is null and coalesce(t.famille, '') <> 'personnel'
          and tstzrange(r.debut, r.fin) && v_moitie.plage;
        m_prevu := private.tiroma_minutes(v_prevu * v_ouv);
        continue when m_prevu / m_ouv >= v_seuil;
        v_res := v_res || jsonb_build_object(
          'praticien_id', p.id, 'praticien', p.nom_affiche, 'jour', d, 'moment', v_moitie.moment, 'source', o.source,
          'ouvert_min', round(m_ouv), 'prevu_min', round(m_prevu), 'libre_min', round(m_ouv - m_prevu),
          'taux', round(m_prevu / m_ouv, 3),
          'attente', (select count(*) from public.tiroma_liste_attente a
                      where a.client_id = p_client and a.entite_id = p_entite and a.retire_le is null
                        and (a.praticien_id is null or a.praticien_id = p.id)
                        and (a.duree_min is null or a.duree_min <= m_ouv - m_prevu)));
      end loop;
    end loop;
  end loop;

  return jsonb_build_object('du', p_du, 'au', p_au, 'seuil', v_seuil,
    'demi_journees', coalesce((select jsonb_agg(x order by x ->> 'jour', x ->> 'moment' desc, x ->> 'praticien') from jsonb_array_elements(v_res) x), '[]'::jsonb));
end $function$;

create or replace function private.tiroma_demi_journees_vides_lire(p_client uuid, p_entite uuid, p_jours integer default 14)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  rg record;
  v_fuseau text;
  v_jour date;
begin
  rg := private.tiroma_exiger_regard(p_client, p_entite, array['titulaire', 'collaborateur']);
  if p_jours is null or p_jours not between 1 and 28 then
    raise exception 'L''horizon va de 1 à 28 jours.' using errcode = '22023';
  end if;
  select coalesce(e.fuseau, 'Europe/Paris') into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;
  v_jour := (now() at time zone coalesce(v_fuseau, 'Europe/Paris'))::date;
  if rg.profil = 'collaborateur' then
    -- Un collaborateur ne voit que son propre agenda, quel que soit le périmètre du cabinet.
    if rg.praticien_id is null then
      return jsonb_build_object('du', v_jour, 'au', v_jour + p_jours, 'seuil', null, 'demi_journees', '[]'::jsonb);
    end if;
    return private.tiroma_demi_journees_calc(p_client, p_entite, v_jour, v_jour + p_jours, rg.praticien_id, now());
  end if;
  return private.tiroma_demi_journees_calc(p_client, p_entite, v_jour, v_jour + p_jours, null, now());
end $function$;

create or replace function public.tiroma_demi_journees_vides(p_client uuid, p_entite uuid, p_jours integer default 14)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select private.tiroma_demi_journees_vides_lire(p_client, p_entite, p_jours)
$function$;

create or replace function private.tiroma_deposer_demi_journees(p_maintenant timestamp with time zone default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k record;
  m record;
  v_jour date;
  v jsonb;
  v_items jsonb;
  n integer := 0;
begin
  for k in
    select c.client_id, c.entite_id, coalesce(e.fuseau, 'Europe/Paris') as fuseau, e.nom as entite_nom
    from public.tiroma_cabinets c
    join public.entites e on e.client_id = c.client_id and e.id = c.entite_id
    where c.statut = 'actif'
  loop
    v_jour := (p_maintenant at time zone k.fuseau)::date;
    continue when (p_maintenant at time zone k.fuseau)::time < time '05:00';
    begin
      v := private.tiroma_demi_journees_calc(k.client_id, k.entite_id, v_jour, v_jour + 7, null, p_maintenant);
      continue when jsonb_array_length(v -> 'demi_journees') = 0;
      select jsonb_agg(jsonb_build_object(
               'texte', left(format('%s, %s %s : %s libre(s) sur %s%s.',
                 x ->> 'praticien',
                 to_char((x ->> 'jour')::date, 'DD/MM'),
                 case x ->> 'moment' when 'matin' then 'matin' else 'après-midi' end,
                 private.tiroma_duree_texte((x ->> 'libre_min')::integer), private.tiroma_duree_texte((x ->> 'ouvert_min')::integer),
                 case when (x ->> 'attente')::integer > 0 then format(' ; %s patient(s) en liste d''attente', x ->> 'attente') else '' end), 300),
               'gravite', case when (x ->> 'jour')::date <= v_jour + 1 then 'attention' else 'info' end,
               'lien', '/espace/tiroma')
             order by x ->> 'jour', x ->> 'moment' desc, x ->> 'praticien')
        into v_items
      from (select x from jsonb_array_elements(v -> 'demi_journees') x order by x ->> 'jour', x ->> 'moment' desc, x ->> 'praticien' limit 8) s;
      for m in
        select distinct p.user_id from public.tiroma_profils p
        join public.comptes c on c.user_id = p.user_id and c.client_id = p.client_id
        where p.client_id = k.client_id and p.entite_id = k.entite_id and p.profil = 'titulaire'
      loop
        perform private.deposer_section(k.client_id, 'tiroma', v_jour, m.user_id, null,
          'Demi-journées vides — ' || left(k.entite_nom, 80), v_items,
          k.entite_id, null, false, null, false, 6);
        n := n + 1;
      end loop;
    exception when others then
      perform private.lever_alerte_module(k.client_id, 'tiroma', 'attention',
        'Les demi-journées vides n''ont pas pu être déposées au point du matin.',
        jsonb_build_object('entite', k.entite_id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'demi_journees:' || k.entite_id::text || ':' || v_jour, false, null);
    end;
  end loop;
  return n;
end $function$;

-- « 3 h 30 », « 45 min ».
create or replace function private.tiroma_duree_texte(p_minutes integer)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case when p_minutes < 60 then p_minutes || ' min'
              when p_minutes % 60 = 0 then (p_minutes / 60) || ' h'
              else (p_minutes / 60) || ' h ' || lpad((p_minutes % 60)::text, 2, '0') end
$function$;

revoke all on function public.tiroma_demi_journees_vides(uuid, uuid, integer) from public, anon;
grant execute on function public.tiroma_demi_journees_vides(uuid, uuid, integer) to authenticated, service_role;
revoke all on function private.tiroma_demi_journees_vides_lire(uuid, uuid, integer) from public, anon;
grant execute on function private.tiroma_demi_journees_vides_lire(uuid, uuid, integer) to authenticated, service_role;
revoke all on function private.tiroma_demi_journees_calc(uuid, uuid, date, date, uuid, timestamp with time zone) from public, anon, authenticated;
grant execute on function private.tiroma_demi_journees_calc(uuid, uuid, date, date, uuid, timestamp with time zone) to service_role;
revoke all on function private.tiroma_ouvert_praticien(uuid, uuid, uuid, date) from public, anon, authenticated;
grant execute on function private.tiroma_ouvert_praticien(uuid, uuid, uuid, date) to service_role;
revoke all on function private.tiroma_deposer_demi_journees(timestamp with time zone) from public, anon, authenticated;
grant execute on function private.tiroma_deposer_demi_journees(timestamp with time zone) to service_role;
revoke all on function private.tiroma_duree_texte(integer) from public, anon;
grant execute on function private.tiroma_duree_texte(integer) to authenticated, service_role;

select cron.schedule('tiroma-demi-journees', '*/30 * * * *', $cron$select private.tiroma_deposer_demi_journees()$cron$)
where not exists (select 1 from cron.job where jobname = 'tiroma-demi-journees');

select 'b3_19 demi-journées vides posées' as resultat;
