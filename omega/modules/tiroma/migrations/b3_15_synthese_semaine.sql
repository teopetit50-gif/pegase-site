-- b3_15 — La synthèse de la semaine pour la direction (audit des promesses, § 2 Tiroma, n° 1).
--
-- CE QUE ÇA CORRIGE : la page /secteurs/dentaire promet « Synthèse de la semaine pour la direction » (offres Centre et
-- Réseau) et « Quand plusieurs sites dépendent d'une même direction, chaque centre reçoit son point du matin et la
-- direction reçoit la synthèse de la semaine ». Rien ne la produisait.
--
-- CE QUE ÇA POSE :
--   · private.tiroma_indicateurs_semaine(p_client, p_entite, p_lundi, p_avec_precedent) → jsonb, sans contrôle de droits
--     (appelée par les portes) : la semaine du lundi au dimanche, à l'heure du cabinet :
--       rdv      {passes, honores, manques, annules, taux_manques}     (rendez-vous commencés dans la semaine)
--       creneaux {liberes}                                            (annulations, reports, déplacements lus)
--       devis    {presentes, signes, taux, montant_signe}             (présentés dans la semaine)
--       plans_sans_rdv {nombre, montant}                              (à la date de lecture)
--       appels   {appels, rdv_pris, confirmes}                        (registre b3_12)
--       rappels  {prepares, envoyes, retenus}                         (b3_14)
--       reinscription {visites, reinscrits, taux}                      (patients vus qui ont déjà un prochain rendez-vous)
--       precedent {taux_manques, devis_signes, devis_taux}            (la semaine d'avant)
--   · public.tiroma_synthese_semaine(p_client, p_entite = null, p_lundi = null) → jsonb : titulaire et direction.
--     Sans entité : tous les cabinets du client où la personne est titulaire ou direction (la direction voit ses
--     sous-entités). Rend {semaine: {du, au}, cabinets: [{entite_id, nom, ...}], total}. Aucune donnée nominative.
--     Par défaut, la dernière semaine complète.
--   · private.tiroma_deposer_synthese(p_maintenant) : le lundi dès 5 h (heure du cabinet), dépose au point du matin du
--     titulaire et de la direction une section « Synthèse de la semaine » (une ligne de chiffres, sans nom, sante =
--     false). Cron tiroma-synthese, toutes les 30 minutes (rien à faire hors du lundi).
-- Lecture seule sur les données du cabinet ; idempotent (create or replace, cron s'il manque).

-- La réinscription (audit § 2 Tiroma, n° 2 ; aussi rendue par la synthèse) : parmi les patients VUS dans la période
-- (rendez-vous honoré, ou présumé honoré), la part qui a déjà un prochain rendez-vous (commençant après la visite,
-- ni annulé ni supprimé). Une visite par patient et par jour. On ne s'appuie pas sur la date de création des
-- rendez-vous : beaucoup d'exports ne la portent pas (capacité « dates_creation »).
create or replace function private.tiroma_reinscription_calc(p_client uuid, p_entite uuid, p_du date, p_au date)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  with fz as (
    select coalesce((select e.fuseau from public.entites e where e.client_id = p_client and e.id = p_entite), 'Europe/Paris') as f
  ),
  visites as (
    select distinct on (r.patient_id, (r.debut at time zone fz.f)::date)
           r.patient_id, r.debut, r.praticien_id, (r.debut at time zone fz.f)::date as jour
    from public.tiroma_rendez_vous r, fz
    where r.client_id = p_client and r.entite_id = p_entite and r.patient_id is not null
      and (r.statut = 'honore' or (r.statut = 'prevu' and r.presume = 'honore'))
      and (r.debut at time zone fz.f)::date between p_du and p_au and r.debut < now()
    order by r.patient_id, (r.debut at time zone fz.f)::date, r.debut desc
  ),
  v as (
    select x.*, exists (select 1 from public.tiroma_rendez_vous n
                        where n.client_id = p_client and n.entite_id = p_entite and n.patient_id = x.patient_id
                          and n.debut > x.debut and n.statut not in ('annule', 'supprime') and n.disparu_le is null) as reinscrit
    from visites x
  )
  select jsonb_build_object(
    'visites', (select count(*) from v),
    'reinscrits', (select count(*) from v where reinscrit),
    'taux', (select case when count(*) = 0 then null else round(count(*) filter (where reinscrit)::numeric / count(*), 3) end from v),
    'par_praticien', (select coalesce(jsonb_agg(jsonb_build_object('praticien_id', y.praticien_id, 'nom', y.nom, 'visites', y.n, 'reinscrits', y.r,
                                                                   'taux', case when y.n = 0 then null else round(y.r::numeric / y.n, 3) end)
                                                order by y.nom nulls last), '[]'::jsonb)
                      from (select v.praticien_id, pr.nom_affiche as nom, count(*) as n, count(*) filter (where v.reinscrit) as r
                            from v left join public.tiroma_praticiens pr on pr.id = v.praticien_id
                            group by v.praticien_id, pr.nom_affiche) y))
$function$;

create or replace function private.tiroma_indicateurs_semaine(p_client uuid, p_entite uuid, p_lundi date, p_avec_precedent boolean default true)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_fuseau text;
  v_debut timestamp with time zone;
  v_fin timestamp with time zone;
  v_rdv jsonb;
  v_devis jsonb;
  v_plans jsonb;
  v_appels jsonb;
  v_rappels jsonb;
  v_creneaux jsonb;
  v_prec jsonb;
  v_sans jsonb;
begin
  select coalesce(e.fuseau, 'Europe/Paris') into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;
  v_fuseau := coalesce(v_fuseau, 'Europe/Paris');
  v_debut := p_lundi::timestamp at time zone v_fuseau;
  v_fin := (p_lundi + 7)::timestamp at time zone v_fuseau;

  select jsonb_build_object(
    'passes', count(*) filter (where statut not in ('annule', 'reporte', 'supprime')),
    'honores', count(*) filter (where statut = 'honore' or (statut = 'prevu' and presume is distinct from 'absent')),
    'manques', count(*) filter (where statut = 'manque'),
    'annules', count(*) filter (where statut in ('annule', 'reporte', 'supprime')),
    'taux_manques', case when count(*) filter (where statut not in ('annule', 'reporte', 'supprime')) = 0 then null
                         else round(count(*) filter (where statut = 'manque')::numeric
                                    / count(*) filter (where statut not in ('annule', 'reporte', 'supprime')), 3) end)
    into v_rdv
  from public.tiroma_rendez_vous r
  where r.client_id = p_client and r.entite_id = p_entite and r.debut >= v_debut and r.debut < v_fin and r.debut < now();

  select jsonb_build_object('liberes', count(*)) into v_creneaux
  from public.tiroma_evenements_agenda ev
  where ev.client_id = p_client and ev.entite_id = p_entite and ev.type in ('annulation', 'report', 'deplacement')
    and ev.detecte_le >= v_debut and ev.detecte_le < v_fin;

  select jsonb_build_object(
    'presentes', count(*),
    'signes', count(*) filter (where p.signe_le is not null),
    'taux', case when count(*) = 0 then null else round(count(*) filter (where p.signe_le is not null)::numeric / count(*), 3) end,
    'montant_signe', coalesce(sum(p.montant) filter (where p.signe_le is not null), 0))
    into v_devis
  from public.tiroma_plans p
  where p.client_id = p_client and p.entite_id = p_entite and p.type <> 'odf' and p.disparu_le is null
    and p.presente_le >= p_lundi and p.presente_le < p_lundi + 7;

  v_sans := coalesce(private.tiroma_plans_sans_rendez_vous_pour(p_client, p_entite, true, null), '[]'::jsonb);
  select jsonb_build_object('nombre', count(*), 'montant', coalesce(sum((x ->> 'montant')::numeric), 0)) into v_plans
  from jsonb_array_elements(v_sans) x;

  select jsonb_build_object(
    'appels', count(*),
    'rdv_pris', count(*) filter (where a.issue = 'rdv_pris'),
    'confirmes', count(*) filter (where a.issue = 'rdv_pris' and exists (
        select 1 from public.tiroma_rendez_vous r where r.client_id = a.client_id and r.entite_id = a.entite_id and r.patient_id = a.patient_id
          and r.vu_premier_le >= a.appele_le and r.debut > a.appele_le and r.statut not in ('annule', 'supprime') and r.disparu_le is null)))
    into v_appels
  from public.tiroma_appels a
  where a.client_id = p_client and a.entite_id = p_entite and a.appele_le >= v_debut and a.appele_le < v_fin;

  select jsonb_build_object(
    'prepares', count(*),
    'envoyes', count(*) filter (where e.statut = 'envoye'),
    'retenus', count(*) filter (where e.statut in ('bloque', 'refuse', 'echec')))
    into v_rappels
  from public.envois e
  where e.client_id = p_client and e.module = 'tiroma' and e.cle_idempotence like 'tiroma:%'
    and e.cree_le >= v_debut and e.cree_le < v_fin
    and exists (select 1 from public.tiroma_rendez_vous r where e.objet_type = 'tiroma_rendez_vous' and r.id::text = e.objet_id and r.entite_id = p_entite
                union all
                select 1 from public.tiroma_plans pl where e.objet_type = 'tiroma_plans' and pl.id::text = e.objet_id and pl.entite_id = p_entite);

  if p_avec_precedent then
    v_prec := private.tiroma_indicateurs_semaine(p_client, p_entite, p_lundi - 7, false);
    v_prec := jsonb_build_object('taux_manques', v_prec #> '{rdv,taux_manques}', 'devis_signes', v_prec #> '{devis,signes}',
                                 'devis_taux', v_prec #> '{devis,taux}', 'passes', v_prec #> '{rdv,passes}',
                                 'reinscription_taux', v_prec #> '{reinscription,taux}');
  end if;

  return jsonb_build_object('semaine', jsonb_build_object('du', p_lundi, 'au', p_lundi + 6),
    'rdv', v_rdv, 'creneaux', v_creneaux, 'devis', v_devis, 'plans_sans_rdv', v_plans, 'appels', v_appels, 'rappels', v_rappels,
    'reinscription', private.tiroma_reinscription_calc(p_client, p_entite, p_lundi, p_lundi + 6) - 'par_praticien')
    || case when p_avec_precedent then jsonb_build_object('precedent', v_prec) else '{}'::jsonb end;
end $function$;

create or replace function private.tiroma_synthese_semaine_lire(p_client uuid, p_entite uuid default null, p_lundi date default null)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_entites uuid[];
  v_fuseau text;
  v_lundi date;
  v_cabinets jsonb := '[]'::jsonb;
  v_ind jsonb;
  k record;
begin
  if p_entite is not null then
    perform private.tiroma_exiger_regard(p_client, p_entite, array['titulaire', 'direction']);
    v_entites := array[p_entite];
  else
    select array_agg(distinct m.entite_id) into v_entites
    from private.tiroma_mes_cabinets() m
    where m.client_id = p_client and m.profil in ('titulaire', 'direction');
    if (select auth.uid()) is null and private.tiroma_role_session() in ('service_role', 'postgres') then
      select array_agg(c.entite_id) into v_entites from public.tiroma_cabinets c where c.client_id = p_client;
    end if;
    if v_entites is null or cardinality(v_entites) = 0 then
      raise exception 'La synthèse de la semaine est réservée au titulaire et à la direction.' using errcode = '42501';
    end if;
  end if;
  select coalesce(e.fuseau, 'Europe/Paris') into v_fuseau from public.entites e where e.client_id = p_client and e.id = v_entites[1];
  -- Par défaut : la dernière semaine complète (du lundi au dimanche), à l'heure du premier cabinet.
  v_lundi := coalesce(p_lundi, date_trunc('week', (now() at time zone coalesce(v_fuseau, 'Europe/Paris'))::date)::date - 7);
  if extract(isodow from v_lundi) <> 1 then
    raise exception 'La semaine commence un lundi.' using errcode = '22023';
  end if;

  for k in
    select c.entite_id, en.nom
    from public.tiroma_cabinets c join public.entites en on en.client_id = c.client_id and en.id = c.entite_id
    where c.client_id = p_client and c.entite_id = any (v_entites)
    order by en.nom
  loop
    v_ind := private.tiroma_indicateurs_semaine(p_client, k.entite_id, v_lundi, true);
    v_cabinets := v_cabinets || (jsonb_build_object('entite_id', k.entite_id, 'nom', k.nom) || (v_ind - 'semaine'));
  end loop;

  return jsonb_build_object(
    'semaine', jsonb_build_object('du', v_lundi, 'au', v_lundi + 6),
    'cabinets', v_cabinets,
    'total', (select jsonb_build_object(
        'passes', coalesce(sum((c #>> '{rdv,passes}')::integer), 0),
        'manques', coalesce(sum((c #>> '{rdv,manques}')::integer), 0),
        'taux_manques', case when coalesce(sum((c #>> '{rdv,passes}')::integer), 0) = 0 then null
                             else round(sum((c #>> '{rdv,manques}')::integer)::numeric / sum((c #>> '{rdv,passes}')::integer), 3) end,
        'creneaux_liberes', coalesce(sum((c #>> '{creneaux,liberes}')::integer), 0),
        'devis_presentes', coalesce(sum((c #>> '{devis,presentes}')::integer), 0),
        'devis_signes', coalesce(sum((c #>> '{devis,signes}')::integer), 0),
        'montant_signe', coalesce(sum((c #>> '{devis,montant_signe}')::numeric), 0),
        'plans_sans_rdv', coalesce(sum((c #>> '{plans_sans_rdv,nombre}')::integer), 0),
        'montant_plans_sans_rdv', coalesce(sum((c #>> '{plans_sans_rdv,montant}')::numeric), 0),
        'appels', coalesce(sum((c #>> '{appels,appels}')::integer), 0),
        'visites', coalesce(sum((c #>> '{reinscription,visites}')::integer), 0),
        'reinscrits', coalesce(sum((c #>> '{reinscription,reinscrits}')::integer), 0),
        'reinscription_taux', case when coalesce(sum((c #>> '{reinscription,visites}')::integer), 0) = 0 then null
                                   else round(sum((c #>> '{reinscription,reinscrits}')::integer)::numeric / sum((c #>> '{reinscription,visites}')::integer), 3) end,
        'rdv_confirmes', coalesce(sum((c #>> '{appels,confirmes}')::integer), 0))
      from jsonb_array_elements(v_cabinets) c));
end $function$;

create or replace function public.tiroma_synthese_semaine(p_client uuid, p_entite uuid default null, p_lundi date default null)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select private.tiroma_synthese_semaine_lire(p_client, p_entite, p_lundi)
$function$;

-- Le lundi : une ligne de chiffres au point du matin du titulaire et de la direction.
create or replace function private.tiroma_deposer_synthese(p_maintenant timestamp with time zone default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k record;
  m record;
  v_jour date;
  v_lundi date;
  v jsonb;
  v_texte text;
  n integer := 0;
  pct text;
begin
  for k in
    select c.client_id, c.entite_id, coalesce(e.fuseau, 'Europe/Paris') as fuseau, e.nom as entite_nom
    from public.tiroma_cabinets c
    join public.entites e on e.client_id = c.client_id and e.id = c.entite_id
    where c.statut = 'actif'
  loop
    v_jour := (p_maintenant at time zone k.fuseau)::date;
    continue when extract(isodow from v_jour) <> 1 or (p_maintenant at time zone k.fuseau)::time < time '05:00';
    v_lundi := v_jour - 7;
    begin
      v := private.tiroma_indicateurs_semaine(k.client_id, k.entite_id, v_lundi, true);
      pct := case when v #>> '{rdv,taux_manques}' is null then '—'
                  else replace(to_char(round((v #>> '{rdv,taux_manques}')::numeric * 100, 1), 'FM990.0'), '.', ',') || ' %' end;
      v_texte := format('Semaine du %s au %s : %s rendez-vous, %s manqué(s) (%s) ; réinscription %s ; %s créneau(x) libéré(s) ; %s devis signé(s) sur %s présenté(s) (%s €) ; %s plan(s) signé(s) sans rendez-vous (%s €) ; %s appel(s), %s rendez-vous repris.',
        to_char(v_lundi, 'DD/MM'), to_char(v_lundi + 6, 'DD/MM'),
        v #>> '{rdv,passes}', v #>> '{rdv,manques}', pct,
        case when v #>> '{reinscription,taux}' is null then '—'
             else replace(to_char(round((v #>> '{reinscription,taux}')::numeric * 100, 1), 'FM990.0'), '.', ',') || ' %' end,
        v #>> '{creneaux,liberes}',
        v #>> '{devis,signes}', v #>> '{devis,presentes}', to_char((v #>> '{devis,montant_signe}')::numeric, 'FM999G999G990'),
        v #>> '{plans_sans_rdv,nombre}', to_char((v #>> '{plans_sans_rdv,montant}')::numeric, 'FM999G999G990'),
        v #>> '{appels,appels}', v #>> '{appels,confirmes}');
      for m in
        select distinct p.user_id
        from private.tiroma_profils_synthese(k.client_id, k.entite_id) p
      loop
        perform private.deposer_section(k.client_id, 'tiroma', v_jour, m.user_id, null,
          'Synthèse de la semaine — ' || left(k.entite_nom, 80),
          jsonb_build_array(jsonb_build_object('texte', left(v_texte, 300), 'gravite', 'info', 'lien', '/espace/tiroma')),
          k.entite_id, null, false, null, false, 5);
        n := n + 1;
      end loop;
    exception when others then
      perform private.lever_alerte_module(k.client_id, 'tiroma', 'attention',
        'La synthèse de la semaine n''a pas pu être déposée.',
        jsonb_build_object('entite', k.entite_id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'synthese:' || k.entite_id::text || ':' || v_lundi, false, null);
    end;
  end loop;
  return n;
end $function$;

-- Qui reçoit la synthèse d'un cabinet : son titulaire, et la direction de l'entité ou d'une entité parente.
create or replace function private.tiroma_profils_synthese(p_client uuid, p_entite uuid)
 returns table(user_id uuid)
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  with recursive parents as (
    select e.id, e.parent_id, 0 as profondeur from public.entites e where e.client_id = p_client and e.id = p_entite
    union all
    select e.id, e.parent_id, p.profondeur + 1 from public.entites e join parents p on e.id = p.parent_id
    where e.client_id = p_client and p.profondeur < 20
  )
  select p.user_id from public.tiroma_profils p
  join public.comptes c on c.user_id = p.user_id and c.client_id = p.client_id
  where p.client_id = p_client
    and ((p.entite_id = p_entite and p.profil = 'titulaire')
         or (p.profil = 'direction' and p.entite_id in (select id from parents)))
$function$;

revoke all on function public.tiroma_synthese_semaine(uuid, uuid, date) from public, anon;
grant execute on function public.tiroma_synthese_semaine(uuid, uuid, date) to authenticated, service_role;
revoke all on function private.tiroma_synthese_semaine_lire(uuid, uuid, date) from public, anon;
grant execute on function private.tiroma_synthese_semaine_lire(uuid, uuid, date) to authenticated, service_role;
revoke all on function private.tiroma_reinscription_calc(uuid, uuid, date, date) from public, anon, authenticated;
grant execute on function private.tiroma_reinscription_calc(uuid, uuid, date, date) to service_role;
revoke all on function private.tiroma_indicateurs_semaine(uuid, uuid, date, boolean) from public, anon, authenticated;
grant execute on function private.tiroma_indicateurs_semaine(uuid, uuid, date, boolean) to service_role;
revoke all on function private.tiroma_deposer_synthese(timestamp with time zone) from public, anon, authenticated;
grant execute on function private.tiroma_deposer_synthese(timestamp with time zone) to service_role;
revoke all on function private.tiroma_profils_synthese(uuid, uuid) from public, anon, authenticated;
grant execute on function private.tiroma_profils_synthese(uuid, uuid) to service_role;

select cron.schedule('tiroma-synthese', '*/30 * * * *', $cron$select private.tiroma_deposer_synthese()$cron$)
where not exists (select 1 from cron.job where jobname = 'tiroma-synthese');

select 'b3_15 synthèse de la semaine posée' as resultat;
