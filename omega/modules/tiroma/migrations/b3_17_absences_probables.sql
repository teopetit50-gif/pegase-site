-- b3_17 — Les absences probables (audit des promesses, § 2 Tiroma, n° 3).
--
-- CE QUE ÇA CORRIGE : la page /secteurs/dentaire promet « Absences probables » (offre Groupe). Rien ne les signalait :
-- le cabinet découvrait le manqué le jour même, sans avoir rappelé le patient.
--
-- LE CALCUL : un score à règles, lisible, sans boîte noire. Chaque point vient avec sa raison, affichée telle quelle :
--   +3  deux manqués ou plus du patient en 18 mois ;   +2  un manqué en 18 mois ;
--   +1  nouveau patient (aucune visite honorée connue avant ce rendez-vous) ;
--   +1  créneau à risque : sur 180 jours, au même jour de la semaine et à la même demi-journée, le cabinet a au moins
--       10 rendez-vous et un taux de manqués d'au moins une fois et demie son taux général ;
--   +1  rendez-vous pris de longue date (60 jours ou plus avant, si l'export porte la date de création) ;
--   −3  le patient a confirmé par sa réponse au rappel (b3_14).
--   Niveau : « fort » à partir de 3 points, « moyen » à 2 ; en dessous, rien n'est listé. Un patient qui a répondu NON
--   au rappel est rendu à part (« a annoncé son absence ») : son créneau est à libérer.
--
-- CE QUE ÇA POSE :
--   public.tiroma_absences_probables(p_client, p_entite, p_jours int = 3) → jsonb
--     [{rendez_vous_id, debut, patient_id, patient_nom, praticien_nom, fauteuil_nom, score, niveau, raisons: [texte],
--       annonce}]   — titulaire, assistante, collaborateur (ses patients) ; les rendez-vous prévus des p_jours prochains
--     jours (1 à 14), par score décroissant puis par heure.
-- Lecture seule ; idempotent (create or replace, grant).

create or replace function private.tiroma_absences_probables_lire(p_client uuid, p_entite uuid, p_jours integer default 3)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  rg record;
  v_fuseau text;
  v_taux_general numeric;
  v_res jsonb;
begin
  rg := private.tiroma_exiger_regard(p_client, p_entite, array['titulaire', 'assistante', 'collaborateur']);
  if p_jours is null or p_jours not between 1 and 14 then
    raise exception 'L''horizon va de 1 à 14 jours.' using errcode = '22023';
  end if;
  select coalesce(e.fuseau, 'Europe/Paris') into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;
  v_fuseau := coalesce(v_fuseau, 'Europe/Paris');

  select case when count(*) = 0 then null else count(*) filter (where statut = 'manque')::numeric / count(*) end
    into v_taux_general
  from public.tiroma_rendez_vous
  where client_id = p_client and entite_id = p_entite and debut >= now() - interval '180 days' and debut < now()
    and statut not in ('annule', 'reporte', 'supprime');

  with a_venir as (
    select r.*, pa.nom, pa.prenom, pa.praticien_habituel_id,
           extract(isodow from r.debut at time zone v_fuseau)::integer as jour_sem,
           ((r.debut at time zone v_fuseau)::time < time '13:00') as matin
    from public.tiroma_rendez_vous r
    join public.tiroma_patients pa on pa.id = r.patient_id
    where r.client_id = p_client and r.entite_id = p_entite and r.statut = 'prevu' and r.disparu_le is null
      and r.debut > now() and (r.debut at time zone v_fuseau)::date <= (now() at time zone v_fuseau)::date + p_jours
      and (rg.voit_tous or (rg.praticien_id is not null and pa.praticien_habituel_id = rg.praticien_id))
  ),
  creneaux as (
    select extract(isodow from h.debut at time zone v_fuseau)::integer as jour_sem,
           ((h.debut at time zone v_fuseau)::time < time '13:00') as matin,
           count(*) as n, count(*) filter (where h.statut = 'manque') as m
    from public.tiroma_rendez_vous h
    where h.client_id = p_client and h.entite_id = p_entite and h.debut >= now() - interval '180 days' and h.debut < now()
      and h.statut not in ('annule', 'reporte', 'supprime')
    group by 1, 2
  ),
  scores as (
    select a.*,
           (select count(*) from public.tiroma_rendez_vous h where h.client_id = p_client and h.entite_id = p_entite
              and h.patient_id = a.patient_id and h.statut = 'manque' and h.debut >= now() - interval '18 months') as manques_pat,
           not exists (select 1 from public.tiroma_rendez_vous h where h.client_id = p_client and h.entite_id = p_entite
              and h.patient_id = a.patient_id and h.debut < a.debut and (h.statut = 'honore' or (h.statut = 'prevu' and h.presume = 'honore'))) as nouveau,
           coalesce((select c.n >= 10 and v_taux_general is not null and v_taux_general > 0 and c.m::numeric / c.n >= 1.5 * v_taux_general
                     from creneaux c where c.jour_sem = a.jour_sem and c.matin = a.matin), false) as creneau_risque,
           (a.cree_source_le is not null and a.debut - a.cree_source_le >= interval '60 days') as pris_tot,
           (select q.reponse from public.tiroma_reponses_rappels q where q.client_id = p_client and q.rendez_vous_id = a.id
              and q.reponse in ('confirme', 'annule') order by q.recue_le desc limit 1) as reponse
    from a_venir a
  ),
  notes as (
    select s.*,
           (case when s.manques_pat >= 2 then 3 when s.manques_pat = 1 then 2 else 0 end
            + case when s.nouveau then 1 else 0 end
            + case when s.creneau_risque then 1 else 0 end
            + case when s.pris_tot then 1 else 0 end
            - case when s.reponse = 'confirme' then 3 else 0 end) as score,
           array_remove(array[
             case when s.manques_pat >= 2 then format('%s rendez-vous manqués en 18 mois', s.manques_pat)
                  when s.manques_pat = 1 then 'un rendez-vous manqué en 18 mois' end,
             case when s.nouveau then 'nouveau patient' end,
             case when s.creneau_risque then 'créneau où les absences sont fréquentes au cabinet' end,
             case when s.pris_tot then format('pris il y a %s jours', extract(day from s.debut - s.cree_source_le)::integer) end,
             case when s.reponse = 'confirme' then 'a confirmé par sa réponse au rappel' end], null) as raisons
    from scores s
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'rendez_vous_id', n.id, 'debut', n.debut, 'patient_id', n.patient_id,
           'patient_nom', private.tiroma_nom_patient(rg.voit_tous or n.praticien_habituel_id = rg.praticien_id, n.nom, n.prenom),
           'praticien_nom', (select p.nom_affiche from public.tiroma_praticiens p where p.id = n.praticien_id),
           'fauteuil_nom', (select f.nom from public.tiroma_fauteuils f where f.id = n.fauteuil_id),
           'score', greatest(n.score, 0),
           'niveau', case when n.reponse = 'annule' then 'annonce' when n.score >= 3 then 'fort' else 'moyen' end,
           'raisons', to_jsonb(case when n.reponse = 'annule' then array['a répondu NON au rappel : créneau à libérer'] else n.raisons end),
           'annonce', n.reponse = 'annule')
         order by (n.reponse = 'annule') desc, n.score desc, n.debut), '[]'::jsonb)
    into v_res
  from notes n
  where n.reponse = 'annule' or n.score >= 2;
  return v_res;
end $function$;

create or replace function public.tiroma_absences_probables(p_client uuid, p_entite uuid, p_jours integer default 3)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select private.tiroma_absences_probables_lire(p_client, p_entite, p_jours)
$function$;

revoke all on function public.tiroma_absences_probables(uuid, uuid, integer) from public, anon;
grant execute on function public.tiroma_absences_probables(uuid, uuid, integer) to authenticated, service_role;
revoke all on function private.tiroma_absences_probables_lire(uuid, uuid, integer) from public, anon;
grant execute on function private.tiroma_absences_probables_lire(uuid, uuid, integer) to authenticated, service_role;

select 'b3_17 absences probables posées' as resultat;
