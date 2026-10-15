-- b3_13 — Le pilotage du titulaire, en euros : devis, plans qui dorment, rendez-vous manqués, sur une période glissante.
--
-- CE QUE ÇA CORRIGE (vague 3, manque n° 2, NOTES-B3) : tout ce qu'il faut pour piloter le cabinet est déjà en base
-- (tiroma_plans : présenté le, signé le, montant, panier ; tiroma_rendez_vous : statut ; tiroma_appels : relances),
-- mais aucune porte ne le rend au titulaire. Il ne voit ni son taux d'acceptation des devis, ni le chiffre signé qui
-- attend un rendez-vous, ni les devis présentés restés sans réponse, ni qui, parmi les praticiens, subit les manqués.
--
-- CE QUE ÇA POSE :
--   public.tiroma_pilotage(p_client, p_entite, p_jours int = 30) → jsonb   (titulaire et direction seulement)
--     { periode: {du, au, jours},
--       devis: {presentes, signes, taux, montant_presente, montant_signe,
--               par_panier: [{panier, presentes, signes, montant_signe}], precedent: {presentes, signes, taux}},
--       en_attente: {devis, montant, expirent_30j, a_relancer, a_relancer_liste: [≤ 10 devis]},
--       plans_sans_rdv: {nombre, montant, reste_a_charge},
--       rendez_vous: {passes, honores, manques, annules, taux_manques,
--                     par_praticien: [{praticien_id, nom, passes, manques, taux}], precedent: {passes, manques, taux_manques}},
--       appels: {appels, rdv_pris} }
--   Période : les p_jours derniers jours, aujourd'hui compris, à l'heure du cabinet ; « precedent » = la période d'avant,
--   de même longueur. Un devis est compté dans la période où il est présenté ; « signé » s'il porte une date de
--   signature. Un rendez-vous « passé » a commencé avant maintenant, n'est ni annulé, ni reporté, ni supprimé.
--   « À relancer » : devis présenté depuis 7 jours ou plus, toujours « présenté », non expiré, patient joignable, et
--   sans appel noté depuis 14 jours (b3_12).
-- Lecture seule ; idempotent (create or replace, grant).

create or replace function private.tiroma_pilotage_lire(p_client uuid, p_entite uuid, p_jours integer default 30)
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
  v_avant date;
  v_debut timestamp with time zone;
  v_debut_avant timestamp with time zone;
  v_devis jsonb;
  v_attente jsonb;
  v_plans jsonb;
  v_rdv jsonb;
  v_appels jsonb;
  v_sans_rdv jsonb;
begin
  rg := private.tiroma_exiger_regard(p_client, p_entite, array['titulaire', 'direction']);
  if p_jours is null or p_jours not between 7 and 366 then
    raise exception 'La période va de 7 à 366 jours.' using errcode = '22023';
  end if;
  select e.fuseau into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;
  v_fuseau := coalesce(v_fuseau, 'Europe/Paris');
  v_jour := (now() at time zone v_fuseau)::date;
  v_du := v_jour - (p_jours - 1);
  v_avant := v_du - p_jours;
  v_debut := v_du::timestamp at time zone v_fuseau;
  v_debut_avant := v_avant::timestamp at time zone v_fuseau;

  -- Les devis présentés (l'orthodontie a son propre circuit d'entente : elle n'entre pas dans le taux).
  with d as (
    select p.*, coalesce(p.panier, 'non_precise') as panier_lu
    from public.tiroma_plans p
    where p.client_id = p_client and p.entite_id = p_entite and p.type <> 'odf' and p.disparu_le is null
      and p.presente_le between v_avant and v_jour
  ),
  cur as (select * from d where presente_le >= v_du),
  pre as (select * from d where presente_le < v_du)
  select jsonb_build_object(
    'presentes', (select count(*) from cur),
    'signes', (select count(*) from cur where signe_le is not null),
    'taux', (select case when count(*) = 0 then null else round(count(*) filter (where signe_le is not null)::numeric / count(*), 3) end from cur),
    'montant_presente', (select coalesce(sum(montant), 0) from cur),
    'montant_signe', (select coalesce(sum(montant) filter (where signe_le is not null), 0) from cur),
    'par_panier', (select coalesce(jsonb_agg(jsonb_build_object('panier', x.panier_lu, 'presentes', x.n, 'signes', x.s, 'montant_signe', x.m)
                                             order by x.panier_lu), '[]'::jsonb)
                   from (select panier_lu, count(*) as n, count(*) filter (where signe_le is not null) as s,
                                coalesce(sum(montant) filter (where signe_le is not null), 0) as m
                         from cur group by panier_lu) x),
    'precedent', (select jsonb_build_object('presentes', count(*), 'signes', count(*) filter (where signe_le is not null),
                                            'taux', case when count(*) = 0 then null else round(count(*) filter (where signe_le is not null)::numeric / count(*), 3) end)
                  from pre))
  into v_devis;

  -- Les devis qui attendent une réponse.
  with att as (
    select p.*, pa.nom, pa.prenom, pa.ne_pas_contacter,
           exists (select 1 from public.tiroma_appels a where a.client_id = p.client_id and a.entite_id = p.entite_id
                     and a.patient_id = p.patient_id and a.appele_le >= now() - interval '14 days') as appele_recemment
    from public.tiroma_plans p
    join public.tiroma_patients pa on pa.id = p.patient_id
    where p.client_id = p_client and p.entite_id = p_entite and p.type <> 'odf' and p.disparu_le is null
      and p.statut = 'presente' and (p.valide_jusqu_au is null or p.valide_jusqu_au >= v_jour)
  ),
  rel as (
    select * from att
    where coalesce(presente_le, vu_premier_le::date) <= v_jour - 7 and not ne_pas_contacter and not appele_recemment
  )
  select jsonb_build_object(
    'devis', (select count(*) from att),
    'montant', (select coalesce(sum(montant), 0) from att),
    'expirent_30j', (select count(*) from att where valide_jusqu_au is not null and valide_jusqu_au <= v_jour + 30),
    'a_relancer', (select count(*) from rel),
    'a_relancer_liste', (select coalesce(jsonb_agg(jsonb_build_object(
                            'plan_id', r.id, 'patient_id', r.patient_id, 'patient_nom', private.tiroma_nom_patient(true, r.nom, r.prenom),
                            'devis_numero', r.devis_numero, 'montant', r.montant, 'reste_a_charge', r.reste_a_charge,
                            'presente_le', r.presente_le, 'valide_jusqu_au', r.valide_jusqu_au, 'panier', r.panier)
                          order by r.montant desc nulls last, r.presente_le), '[]'::jsonb)
                         from (select * from rel order by montant desc nulls last, presente_le limit 10) r))
  into v_attente;

  -- Le chiffre signé qui attend un rendez-vous (la porte de b3_03, vue par le titulaire).
  v_sans_rdv := coalesce(private.tiroma_plans_sans_rendez_vous_pour(p_client, p_entite, true, null), '[]'::jsonb);
  select jsonb_build_object('nombre', count(*),
                            'montant', coalesce(sum((x ->> 'montant')::numeric), 0),
                            'reste_a_charge', coalesce(sum((x ->> 'reste_a_charge')::numeric), 0))
    into v_plans
  from jsonb_array_elements(v_sans_rdv) x;

  -- Les rendez-vous passés de la période, et ceux de la période d'avant.
  with r as (
    select x.*, (x.debut >= v_debut) as courant
    from public.tiroma_rendez_vous x
    where x.client_id = p_client and x.entite_id = p_entite and x.debut >= v_debut_avant and x.debut < now()
  ),
  passes as (select * from r where statut not in ('annule', 'reporte', 'supprime'))
  select jsonb_build_object(
    'passes', (select count(*) from passes where courant),
    'honores', (select count(*) from passes where courant and (statut = 'honore' or (statut = 'prevu' and presume is distinct from 'absent'))),
    'manques', (select count(*) from passes where courant and statut = 'manque'),
    'annules', (select count(*) from r where courant and statut in ('annule', 'reporte', 'supprime')),
    'taux_manques', (select case when count(*) = 0 then null else round(count(*) filter (where statut = 'manque')::numeric / count(*), 3) end
                     from passes where courant),
    'par_praticien', (select coalesce(jsonb_agg(jsonb_build_object('praticien_id', y.praticien_id, 'nom', y.nom, 'passes', y.n, 'manques', y.m,
                                                                   'taux', case when y.n = 0 then null else round(y.m::numeric / y.n, 3) end)
                                                order by y.m desc, y.nom nulls last), '[]'::jsonb)
                      from (select p.praticien_id, pr.nom_affiche as nom, count(*) as n, count(*) filter (where p.statut = 'manque') as m
                            from passes p left join public.tiroma_praticiens pr on pr.id = p.praticien_id
                            where p.courant group by p.praticien_id, pr.nom_affiche) y),
    'precedent', (select jsonb_build_object('passes', count(*), 'manques', count(*) filter (where statut = 'manque'),
                                            'taux_manques', case when count(*) = 0 then null else round(count(*) filter (where statut = 'manque')::numeric / count(*), 3) end)
                  from passes where not courant))
  into v_rdv;

  select jsonb_build_object('appels', count(*), 'rdv_pris', count(*) filter (where a.issue = 'rdv_pris'))
    into v_appels
  from public.tiroma_appels a
  where a.client_id = p_client and a.entite_id = p_entite and a.appele_le >= v_debut;

  return jsonb_build_object(
    'periode', jsonb_build_object('du', v_du, 'au', v_jour, 'jours', p_jours),
    'devis', v_devis, 'en_attente', v_attente, 'plans_sans_rdv', v_plans, 'rendez_vous', v_rdv, 'appels', v_appels);
end $function$;

create or replace function public.tiroma_pilotage(p_client uuid, p_entite uuid, p_jours integer default 30)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select private.tiroma_pilotage_lire(p_client, p_entite, p_jours)
$function$;

revoke all on function public.tiroma_pilotage(uuid, uuid, integer) from public, anon;
revoke all on function private.tiroma_pilotage_lire(uuid, uuid, integer) from public, anon;
grant execute on function public.tiroma_pilotage(uuid, uuid, integer) to authenticated, service_role;
grant execute on function private.tiroma_pilotage_lire(uuid, uuid, integer) to authenticated, service_role;

select 'b3_13 pilotage posé' as resultat;
