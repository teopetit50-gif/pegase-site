-- b3_03 — Les plans signés sans rendez-vous remontent, du plus ancien au plus récent.
--
-- CE QUE ÇA CORRIGE : la page /secteurs/dentaire promet « Les devis signés sans rendez-vous remontent chaque
-- matin, du plus ancien au plus récent », « Accords des mutuelles sans rendez-vous » et « Famille à planifier dans
-- la foulée ». Le socle porte les plans, leurs lignes, les liens avec l'agenda et le lien familial, mais aucune
-- porte ne rend la liste : l'écran devrait recouper quatre tables. Ici, une porte de lecture le fait dans la base.
--
-- CE QUE ÇA POSE : public.tiroma_plans_sans_rendez_vous(p_client, p_entite) → jsonb, les plans signés ou
-- commencés, présents dans le logiciel, dont au moins une ligne reste à faire et qu'aucun rendez-vous à venir ne
-- sert, du plus ancien au plus récent :
--   [{ plan_id, devis_numero, type, statut, patient_id, patient_nom, praticien_id, praticien_nom, signe_le,
--      jours_depuis, montant, reste_a_charge, mutuelle_statut, mutuelle_reponse_le, mutuelle_accord_sans_rdv,
--      valide_jusqu_au, jours_avant_expiration, a_verifier, lignes_a_faire, lignes_faites,
--      prochaine: { rang, libelle, famille, duree_min, seance }, proches_a_planifier, ne_pas_contacter }]
-- Les noms suivent le périmètre de la personne (private.tiroma_nom_patient). Lecture seule ; idempotent.

create or replace function private.tiroma_plans_sans_rendez_vous_pour(p_client uuid, p_entite uuid, p_voit_tous boolean, p_praticien uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_fuseau text;
  v_jour date;
  v_res jsonb;
begin
  select e.fuseau into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;
  v_jour := (now() at time zone coalesce(v_fuseau, 'UTC'))::date;

  with plans as (
    select pl.*, pa.nom, pa.prenom, pa.ne_pas_contacter, pa.famille_ref, pa.praticien_habituel_id, pr.nom_affiche as praticien_nom,
           coalesce(pl.signe_le, pl.presente_le, pl.vu_premier_le::date) as depuis
    from public.tiroma_plans pl
    join public.tiroma_patients pa on pa.id = pl.patient_id
    left join public.tiroma_praticiens pr on pr.id = pl.praticien_id
    where pl.client_id = p_client and pl.entite_id = p_entite
      and pl.statut in ('signe', 'commence') and pl.disparu_le is null
      and pa.actif and pa.fusionne_dans_id is null
      and (p_voit_tous or (p_praticien is not null and (pl.praticien_id = p_praticien or pa.praticien_habituel_id = p_praticien)))
      and exists (select 1 from public.tiroma_plan_actes a where a.plan_id = pl.id and a.statut = 'a_faire')
      and not exists (select 1 from public.tiroma_rendez_vous r
                      where r.client_id = p_client and r.entite_id = p_entite and r.plan_id = pl.id and r.statut = 'prevu' and r.debut > now())
      and not exists (select 1 from public.tiroma_plan_actes a join public.tiroma_rendez_vous r on r.id = a.rendez_vous_id
                      where a.plan_id = pl.id and a.statut = 'planifie' and r.statut = 'prevu' and r.debut > now())
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'plan_id', p.id, 'devis_numero', p.devis_numero, 'type', p.type, 'statut', p.statut,
           'patient_id', p.patient_id,
           'patient_nom', private.tiroma_nom_patient(p_voit_tous or p.praticien_habituel_id = p_praticien or p.praticien_id = p_praticien, p.nom, p.prenom),
           'praticien_id', p.praticien_id, 'praticien_nom', p.praticien_nom,
           'signe_le', p.signe_le, 'depuis', p.depuis, 'jours_depuis', v_jour - p.depuis,
           'montant', p.montant, 'reste_a_charge', p.reste_a_charge,
           'mutuelle_statut', p.mutuelle_statut, 'mutuelle_reponse_le', p.mutuelle_reponse_le,
           'mutuelle_accord_sans_rdv', coalesce(p.mutuelle_statut = 'accord', false),
           'valide_jusqu_au', p.valide_jusqu_au,
           'jours_avant_expiration', case when p.valide_jusqu_au is not null then p.valide_jusqu_au - v_jour end,
           'a_verifier', p.a_verifier,
           'lignes_a_faire', (select count(*) from public.tiroma_plan_actes a where a.plan_id = p.id and a.statut = 'a_faire'),
           'lignes_faites', (select count(*) from public.tiroma_plan_actes a where a.plan_id = p.id and a.statut = 'fait'),
           'prochaine', (select jsonb_build_object('rang', a.rang, 'libelle', a.libelle, 'famille', a.famille, 'duree_min', a.duree_min, 'seance', a.seance)
                         from public.tiroma_plan_actes a where a.plan_id = p.id and a.statut = 'a_faire' order by a.rang limit 1),
           'proches_a_planifier', case when p.famille_ref is null then 0 else
             (select count(distinct q.id) from public.tiroma_patients q
              where q.client_id = p_client and q.entite_id = p_entite and q.famille_ref = p.famille_ref and q.id <> p.patient_id and q.actif
                and (exists (select 1 from public.tiroma_plans pq where pq.patient_id = q.id and pq.statut in ('signe', 'commence') and pq.disparu_le is null
                             and exists (select 1 from public.tiroma_plan_actes a where a.plan_id = pq.id and a.statut = 'a_faire'))
                     or exists (select 1 from public.tiroma_liste_attente l where l.patient_id = q.id and l.retire_le is null))) end,
           'ne_pas_contacter', p.ne_pas_contacter) order by p.depuis, p.id), '[]'::jsonb)
    into v_res
  from plans p;
  return v_res;
end $function$;

create or replace function private.tiroma_plans_sans_rendez_vous(p_client uuid, p_entite uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare rg record;
begin
  rg := private.tiroma_exiger_regard(p_client, p_entite, array['titulaire', 'collaborateur', 'assistante']);
  return private.tiroma_plans_sans_rendez_vous_pour(p_client, p_entite, rg.voit_tous, rg.praticien_id);
end $function$;

create or replace function public.tiroma_plans_sans_rendez_vous(p_client uuid, p_entite uuid)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select private.tiroma_plans_sans_rendez_vous(p_client, p_entite)
$function$;

revoke all on function public.tiroma_plans_sans_rendez_vous(uuid, uuid) from public, anon;
grant execute on function public.tiroma_plans_sans_rendez_vous(uuid, uuid) to authenticated, service_role;
grant execute on function private.tiroma_plans_sans_rendez_vous(uuid, uuid) to authenticated, service_role;
grant execute on function private.tiroma_plans_sans_rendez_vous_pour(uuid, uuid, boolean, uuid) to authenticated, service_role;
