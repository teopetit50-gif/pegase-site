-- b3_04 — Avant les rendez-vous : deux jours avant, Tiroma vérifie le retour du laboratoire, l'implant en stock,
-- l'accord de la mutuelle, le devis qui expire, l'accord ODF qui dort et le traitement interrompu.
--
-- CE QUE ÇA CORRIGE : la page /secteurs/dentaire promet l'écran « Avant les rendez-vous (J-2) » et les situations
-- « Laboratoire », « Mutuelle », « Devis », « Implants », « Orthodontie », « Traitement interrompu ». Le socle
-- porte chaque donnée (fiches de laboratoire liées aux poses, stock, plans et mutuelles, ententes ODF, lignes de
-- plan faites ou à faire) et les délais dans tiroma_regles, mais aucune porte ne les rapproche de l'agenda.
--
-- CE QUE ÇA POSE : public.tiroma_avant_rendez_vous(p_client, p_entite, p_jours int = null) → jsonb :
--   [{ nature: labo|implant|devis_expire|mutuelle_accord|mutuelle_attente|odf_accord|odf_semestre|interruption|devis_sans_reponse,
--      gravite: critique|attention|info, quand (date), rendez_vous_id, patient_id, patient_nom, texte, objet_type, objet_id }]
-- triés par gravité puis par date. p_jours vaut par défaut labo_verif_jours des règles (2). Lecture seule ; idempotent.

create or replace function private.tiroma_avant_rendez_vous_pour(p_client uuid, p_entite uuid, p_jours integer, p_voit_tous boolean, p_praticien uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  g public.tiroma_regles;
  v_fuseau text;
  v_jour date;
  v_jours integer;
  v_res jsonb;
begin
  select * into g from public.tiroma_regles where client_id = p_client and entite_id = p_entite;
  select e.fuseau into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;
  if g.id is null then
    return '[]'::jsonb;
  end if;
  v_fuseau := coalesce(v_fuseau, 'UTC');
  v_jour := (now() at time zone v_fuseau)::date;
  v_jours := coalesce(p_jours, g.labo_verif_jours, 2);

  with
  voit as (
    select pa.id, private.tiroma_nom_patient(p_voit_tous or pa.praticien_habituel_id = p_praticien, pa.nom, pa.prenom) as nom,
           (p_voit_tous or pa.praticien_habituel_id = p_praticien) as visible, pa.praticien_habituel_id
    from public.tiroma_patients pa where pa.client_id = p_client and pa.entite_id = p_entite
  ),
  rdv as (
    select r.id, r.patient_id, r.praticien_id, r.debut, (r.debut at time zone v_fuseau)::date as jour, t.famille, t.necessite_labo, t.libelle_source
    from public.tiroma_rendez_vous r
    join public.tiroma_types_rdv t on t.id = r.type_rdv_id
    where r.client_id = p_client and r.entite_id = p_entite and r.statut = 'prevu' and r.patient_id is not null
      and (r.debut at time zone v_fuseau)::date between v_jour and v_jour + v_jours
      and (p_voit_tous or r.praticien_id = p_praticien)
  ),
  -- a) Le laboratoire : chaque pose (ou rendez-vous qui exige le laboratoire) et sa fiche.
  labo as (
    select r.*, w.id as travail_id, w.statut as travail_statut, w.retour_attendu_le, w.laboratoire, w.type_travail
    from rdv r
    left join lateral (
      select w.* from public.tiroma_travaux_labo w
      where w.client_id = p_client and w.entite_id = p_entite and w.statut <> 'annule'
        and (w.rendez_vous_pose_id = r.id
             or (w.rendez_vous_pose_id is null and w.patient_id = r.patient_id and coalesce(w.envoye_le, w.cree_le::date) between r.jour - 120 and r.jour))
      order by (w.rendez_vous_pose_id = r.id) desc, w.envoye_le desc nulls last limit 1) w on true
    where r.famille in ('prothese_pose', 'implant_prothese') or r.necessite_labo
  ),
  lignes as (
    select 'labo'::text as nature,
           case when l.travail_id is null then 'attention' when l.travail_statut = 'revenu' then 'info' else 'critique' end as gravite,
           l.jour as quand, l.id as rendez_vous_id, l.patient_id,
           case when l.travail_id is null then format('%s : aucune fiche de laboratoire connue pour la pose du %s.', l.libelle_source, to_char(l.jour, 'DD/MM'))
                when l.travail_statut = 'revenu' then format('%s : le travail est revenu du laboratoire (%s).', l.libelle_source, coalesce(l.type_travail, l.laboratoire, 'fiche'))
                else format('%s : le travail n''est pas revenu du laboratoire%s (pose le %s).', l.libelle_source,
                            case when l.retour_attendu_le is not null then ', attendu le ' || to_char(l.retour_attendu_le, 'DD/MM') else '' end, to_char(l.jour, 'DD/MM')) end as texte,
           'tiroma_travaux_labo'::text as objet_type, l.travail_id::text as objet_id
    from labo l
    union all
    -- b) Les implants : une chirurgie d'implant et le stock.
    select 'implant', case when s.n_total = 0 then 'critique' when s.n_bas > 0 then 'attention' else 'info' end, r.jour, r.id, r.patient_id,
           case when s.n_total = 0 then format('%s le %s : aucun implant en stock.', r.libelle_source, to_char(r.jour, 'DD/MM'))
                when s.n_bas > 0 then format('%s le %s : %s référence(s) d''implant sous le seuil (%s).', r.libelle_source, to_char(r.jour, 'DD/MM'), s.n_bas, s.refs_basses)
                else format('%s le %s : %s référence(s) d''implant en stock.', r.libelle_source, to_char(r.jour, 'DD/MM'), s.n_total) end,
           'tiroma_stock', null
    from rdv r
    cross join lateral (
      select count(*) filter (where st.quantite > 0) as n_total,
             count(*) filter (where st.seuil is not null and st.quantite <= st.seuil) as n_bas,
             string_agg(st.reference, ', ' order by st.reference) filter (where st.seuil is not null and st.quantite <= st.seuil) as refs_basses
      from public.tiroma_stock st where st.client_id = p_client and st.entite_id = p_entite and st.famille = 'implant') s
    where r.famille = 'implant_chirurgie'
    union all
    -- c) Les devis qui arrivent à échéance.
    select 'devis_expire', case when pl.valide_jusqu_au - v_jour <= 7 then 'critique' else 'attention' end, pl.valide_jusqu_au, null, pl.patient_id,
           format('Le devis %s (%s €) expire le %s : passé la date, il faudra le refaire%s.', coalesce(pl.devis_numero, '?'), coalesce(pl.montant::text, '—'),
                  to_char(pl.valide_jusqu_au, 'DD/MM/YYYY'), case when pl.mutuelle_statut in ('demandee', 'accord') then ' et redemander l''accord de la mutuelle' else '' end),
           'tiroma_plans', pl.id::text
    from public.tiroma_plans pl
    where pl.client_id = p_client and pl.entite_id = p_entite and pl.disparu_le is null
      and pl.statut in ('presente', 'signe', 'commence') and pl.valide_jusqu_au between v_jour and v_jour + g.alerte_devis_expire_jours
      and exists (select 1 from public.tiroma_plan_actes a where a.plan_id = pl.id and a.statut <> 'fait')
      and (p_voit_tous or pl.praticien_id = p_praticien)
    union all
    -- d) La mutuelle a répondu, personne n'a rappelé.
    select 'mutuelle_accord', 'attention', coalesce(pl.mutuelle_reponse_le, v_jour), null, pl.patient_id,
           format('La mutuelle a donné son accord%s pour le devis %s : aucun rendez-vous n''a suivi.',
                  case when pl.mutuelle_reponse_le is not null then ' le ' || to_char(pl.mutuelle_reponse_le, 'DD/MM/YYYY') else '' end, coalesce(pl.devis_numero, '?')),
           'tiroma_plans', pl.id::text
    from public.tiroma_plans pl
    where pl.client_id = p_client and pl.entite_id = p_entite and pl.disparu_le is null and pl.mutuelle_statut = 'accord'
      and pl.statut in ('presente', 'signe', 'commence')
      and exists (select 1 from public.tiroma_plan_actes a where a.plan_id = pl.id and a.statut = 'a_faire')
      and not exists (select 1 from public.tiroma_rendez_vous r where r.plan_id = pl.id and r.statut = 'prevu' and r.debut > now())
      and (p_voit_tous or pl.praticien_id = p_praticien)
    union all
    -- e) La mutuelle tarde.
    select 'mutuelle_attente', 'info', pl.mutuelle_demande_le, null, pl.patient_id,
           format('Réponse de la mutuelle attendue depuis le %s pour le devis %s (%s jours).', to_char(pl.mutuelle_demande_le, 'DD/MM/YYYY'), coalesce(pl.devis_numero, '?'), v_jour - pl.mutuelle_demande_le),
           'tiroma_plans', pl.id::text
    from public.tiroma_plans pl
    where pl.client_id = p_client and pl.entite_id = p_entite and pl.disparu_le is null and pl.mutuelle_statut = 'demandee'
      and pl.mutuelle_demande_le is not null and pl.mutuelle_demande_le < v_jour - g.delai_reponse_mutuelle_jours
      and (p_voit_tous or pl.praticien_id = p_praticien)
    union all
    -- f) L'accord de l'Assurance maladie (ODF) ne vaut que six mois.
    select 'odf_accord', case when o.accord_le + interval '6 months' - interval '30 days' <= v_jour then 'critique' else 'attention' end,
           (o.accord_le + interval '6 months')::date, null, o.patient_id,
           format('Orthodontie : l''accord de l''Assurance maladie du %s n''a pas été suivi d''un début de traitement ; il expire le %s.',
                  to_char(o.accord_le, 'DD/MM/YYYY'), to_char((o.accord_le + interval '6 months')::date, 'DD/MM/YYYY')),
           'tiroma_ententes_odf', o.id::text
    from public.tiroma_ententes_odf o
    join voit v on v.id = o.patient_id
    where o.client_id = p_client and o.entite_id = p_entite and o.statut = 'accordee' and o.accord_le is not null and o.debut_le is null
      and o.accord_le + interval '6 months' - interval '60 days' <= v_jour
      and v.visible
    union all
    -- g) Le semestre suivant n'a pas été posé.
    select 'odf_semestre', 'attention', o.semestre_fin_le, null, o.patient_id,
           format('Orthodontie : le semestre %s se termine le %s ; le suivant n''est pas posé.', coalesce(o.semestre_courant::text, '?'), to_char(o.semestre_fin_le, 'DD/MM/YYYY')),
           'tiroma_ententes_odf', o.id::text
    from public.tiroma_ententes_odf o
    join voit v on v.id = o.patient_id
    where o.client_id = p_client and o.entite_id = p_entite and o.statut = 'commencee' and o.semestre_fin_le is not null
      and o.semestre_fin_le between v_jour - 30 and v_jour + 30
      and not exists (select 1 from public.tiroma_rendez_vous r join public.tiroma_types_rdv t on t.id = r.type_rdv_id
                      where r.patient_id = o.patient_id and r.statut = 'prevu' and r.debut > now() and t.famille like 'orthodontie%')
      and v.visible
    union all
    -- h) Le traitement interrompu : une séance faite, la suivante jamais posée.
    select 'interruption', 'attention', d.derniere, null, pl.patient_id,
           format('Traitement interrompu : la séance %s de « %s » est faite depuis le %s, la suivante n''est pas posée (%s jours).',
                  d.rang, coalesce(d.libelle, pl.devis_numero, 'plan'), to_char(d.derniere, 'DD/MM/YYYY'), v_jour - d.derniere),
           'tiroma_plans', pl.id::text
    from public.tiroma_plans pl
    cross join lateral (select max(a.fait_le) as derniere, max(a.rang) as rang, (array_agg(a.libelle order by a.rang desc))[1] as libelle
                        from public.tiroma_plan_actes a where a.plan_id = pl.id and a.statut = 'fait') d
    where pl.client_id = p_client and pl.entite_id = p_entite and pl.disparu_le is null and pl.statut in ('signe', 'commence')
      and d.derniere is not null and d.derniere < v_jour - g.delai_interruption_jours
      and exists (select 1 from public.tiroma_plan_actes a where a.plan_id = pl.id and a.statut = 'a_faire')
      and not exists (select 1 from public.tiroma_rendez_vous r where r.plan_id = pl.id and r.statut = 'prevu' and r.debut > now())
      and (p_voit_tous or pl.praticien_id = p_praticien)
    union all
    -- i) Le devis présenté sans réponse.
    select 'devis_sans_reponse', 'info', pl.presente_le, null, pl.patient_id,
           format('Devis %s présenté le %s, sans réponse depuis %s jours.', coalesce(pl.devis_numero, '?'), to_char(pl.presente_le, 'DD/MM/YYYY'), v_jour - pl.presente_le),
           'tiroma_plans', pl.id::text
    from public.tiroma_plans pl
    where pl.client_id = p_client and pl.entite_id = p_entite and pl.disparu_le is null and pl.statut = 'presente'
      and pl.presente_le is not null and pl.presente_le < v_jour - g.delai_devis_presente_jours
      and (p_voit_tous or pl.praticien_id = p_praticien)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'nature', l.nature, 'gravite', l.gravite, 'quand', l.quand, 'rendez_vous_id', l.rendez_vous_id,
           'patient_id', l.patient_id, 'patient_nom', v.nom, 'texte', l.texte, 'objet_type', l.objet_type, 'objet_id', l.objet_id)
           order by case l.gravite when 'critique' then 1 when 'attention' then 2 else 3 end, l.quand nulls last, l.nature), '[]'::jsonb)
    into v_res
  from lignes l
  left join voit v on v.id = l.patient_id;
  return v_res;
end $function$;

create or replace function private.tiroma_avant_rendez_vous(p_client uuid, p_entite uuid, p_jours integer default null)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare rg record;
begin
  rg := private.tiroma_exiger_regard(p_client, p_entite, array['titulaire', 'collaborateur', 'assistante']);
  return private.tiroma_avant_rendez_vous_pour(p_client, p_entite, p_jours, rg.voit_tous, rg.praticien_id);
end $function$;

create or replace function public.tiroma_avant_rendez_vous(p_client uuid, p_entite uuid, p_jours integer default null)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select private.tiroma_avant_rendez_vous(p_client, p_entite, p_jours)
$function$;

revoke all on function public.tiroma_avant_rendez_vous(uuid, uuid, integer) from public, anon;
grant execute on function public.tiroma_avant_rendez_vous(uuid, uuid, integer) to authenticated, service_role;
grant execute on function private.tiroma_avant_rendez_vous(uuid, uuid, integer) to authenticated, service_role;
grant execute on function private.tiroma_avant_rendez_vous_pour(uuid, uuid, integer, boolean, uuid) to authenticated, service_role;
