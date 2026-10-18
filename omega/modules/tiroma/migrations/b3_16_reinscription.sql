-- b3_16 — Le taux de réinscription, et les patients vus repartis sans prochain rendez-vous (audit § 2 Tiroma, n° 2).
--
-- CE QUE ÇA CORRIGE : la page /secteurs/dentaire promet « Taux de réinscription » (offre Centre) et « Taux de
-- réinscription et d'acceptation des devis » (Réseau). Le taux d'acceptation existait (b3_13) ; pas la réinscription.
--
-- LA DÉFINITION (private.tiroma_reinscription_calc, posée par b3_15) : parmi les patients VUS dans la période (rendez-
-- vous honoré ou présumé honoré, une visite par patient et par jour), la part qui a déjà un prochain rendez-vous
-- (commençant après la visite, ni annulé ni supprimé). Elle ne s'appuie pas sur la date de création des rendez-vous,
-- que beaucoup d'exports ne portent pas.
--
-- CE QUE ÇA POSE :
--   public.tiroma_reinscription(p_client, p_entite, p_jours int = 30) → jsonb   (titulaire, assistante, direction)
--     { periode: {du, au, jours}, visites, reinscrits, taux, precedent: {taux},
--       par_praticien: [...]  (titulaire et direction),
--       sans_suite: [≤ 25 {patient_id, patient_nom, derniere_visite, praticien}] }
--     sans_suite : les patients vus dans la période qui n'ont ni prochain rendez-vous, ni plan signé en cours, ni
--     demande de ne pas être contactés, ni appel noté depuis 14 jours (b3_12) : la liste des appels à refaire.
--     La direction ne voit pas les noms (« Patient du cabinet »).
-- Lecture seule ; idempotent (create or replace, grant).

create or replace function private.tiroma_reinscription_lire(p_client uuid, p_entite uuid, p_jours integer default 30)
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
  v_du date;
  v_cur jsonb;
  v_pre jsonb;
  v_sans jsonb;
begin
  rg := private.tiroma_exiger_regard(p_client, p_entite, array['titulaire', 'assistante', 'direction']);
  if p_jours is null or p_jours not between 7 and 366 then
    raise exception 'La période va de 7 à 366 jours.' using errcode = '22023';
  end if;
  select coalesce(e.fuseau, 'Europe/Paris') into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;
  v_fuseau := coalesce(v_fuseau, 'Europe/Paris');
  v_jour := (now() at time zone v_fuseau)::date;
  v_du := v_jour - (p_jours - 1);
  v_cur := private.tiroma_reinscription_calc(p_client, p_entite, v_du, v_jour);
  v_pre := private.tiroma_reinscription_calc(p_client, p_entite, v_du - p_jours, v_du - 1);

  with vus as (
    select distinct on (r.patient_id) r.patient_id, r.debut, r.praticien_id
    from public.tiroma_rendez_vous r
    where r.client_id = p_client and r.entite_id = p_entite and r.patient_id is not null
      and (r.statut = 'honore' or (r.statut = 'prevu' and r.presume = 'honore'))
      and (r.debut at time zone v_fuseau)::date between v_du and v_jour and r.debut < now()
    order by r.patient_id, r.debut desc
  ),
  sans as (
    select v.*, pa.nom, pa.prenom, pa.praticien_habituel_id, pr.nom_affiche as praticien
    from vus v
    join public.tiroma_patients pa on pa.id = v.patient_id
    left join public.tiroma_praticiens pr on pr.id = v.praticien_id
    where not pa.ne_pas_contacter
      and not exists (select 1 from public.tiroma_rendez_vous n
                      where n.client_id = p_client and n.entite_id = p_entite and n.patient_id = v.patient_id
                        and n.debut > v.debut and n.statut not in ('annule', 'supprime') and n.disparu_le is null)
      and not exists (select 1 from public.tiroma_plans pl
                      where pl.client_id = p_client and pl.entite_id = p_entite and pl.patient_id = v.patient_id
                        and pl.statut in ('signe', 'commence') and pl.disparu_le is null)
      and not exists (select 1 from public.tiroma_appels a
                      where a.client_id = p_client and a.entite_id = p_entite and a.patient_id = v.patient_id
                        and a.appele_le >= now() - interval '14 days')
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'patient_id', x.patient_id,
           'patient_nom', private.tiroma_nom_patient(rg.profil <> 'direction' and (rg.voit_tous or x.praticien_habituel_id = rg.praticien_id), x.nom, x.prenom),
           'derniere_visite', (x.debut at time zone v_fuseau)::date, 'praticien', x.praticien) order by x.debut), '[]'::jsonb)
    into v_sans
  from (select * from sans order by debut limit 25) x;

  return jsonb_build_object(
    'periode', jsonb_build_object('du', v_du, 'au', v_jour, 'jours', p_jours),
    'visites', v_cur -> 'visites', 'reinscrits', v_cur -> 'reinscrits', 'taux', v_cur -> 'taux',
    'precedent', jsonb_build_object('taux', v_pre -> 'taux', 'visites', v_pre -> 'visites'),
    'par_praticien', case when rg.profil in ('titulaire', 'direction') then v_cur -> 'par_praticien' else '[]'::jsonb end,
    'sans_suite', v_sans);
end $function$;

create or replace function public.tiroma_reinscription(p_client uuid, p_entite uuid, p_jours integer default 30)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select private.tiroma_reinscription_lire(p_client, p_entite, p_jours)
$function$;

revoke all on function public.tiroma_reinscription(uuid, uuid, integer) from public, anon;
grant execute on function public.tiroma_reinscription(uuid, uuid, integer) to authenticated, service_role;
revoke all on function private.tiroma_reinscription_lire(uuid, uuid, integer) from public, anon;
grant execute on function private.tiroma_reinscription_lire(uuid, uuid, integer) to authenticated, service_role;

select 'b3_16 réinscription posée' as resultat;
