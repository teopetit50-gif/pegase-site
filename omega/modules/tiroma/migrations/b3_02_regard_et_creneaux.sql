-- b3_02 — Les créneaux à sauver : chaque créneau libéré arrive avec les patients qui peuvent le reprendre.
--
-- CE QUE ÇA CORRIGE : la page /secteurs/dentaire promet « Quand un patient annule la veille, Tiroma indique qui
-- peut prendre sa place : d'abord un patient dont le plan est accepté, puis la liste d'attente, puis un contrôle
-- dû » et « une annulation saisie à 8 h remonte dans les minutes qui suivent ». Le socle enregistre bien les
-- événements d'agenda (annulation, report, déplacement) et porte les règles du cabinet (ordre de priorité,
-- durée, préférences, préavis, horizon, nombre de propositions, quota de contrôles), mais aucune porte ne
-- rapproche les deux : l'écran devrait tout recalculer. Ici, une porte de lecture le fait dans la base, avec les
-- règles du cabinet, et rend les candidats dans l'ordre.
--
-- CE QUE ÇA POSE :
--   · private.tiroma_regard(p_client, p_entite) : ce que la personne connectée a le droit de voir dans ce
--     cabinet (profil, praticien relié, voit-elle tous les patients) ; sans jeton, le service voit tout ;
--   · private.tiroma_nom_patient(...) : le nom entier quand on voit le patient, ses initiales sinon ;
--   · private.tiroma_capacite_famille(famille) : la capacité de fauteuil qu'une famille de soin demande ;
--   · private.tiroma_disponible(disponibilites jsonb, p_debut timestamptz, p_fuseau) : les préférences connues
--     du patient (même forme que reserve_urgences : [{jours:[1..7], demi_journee:'matin'|'apres_midi'}]) ;
--     une liste vide ou d'une autre forme ne contraint pas ;
--   · public.tiroma_creneaux_a_sauver(p_client, p_entite) → jsonb : les créneaux libérés à venir, dans
--     l'horizon des règles, encore libres, chacun avec jusqu'à nb_propositions candidats :
--       [{ evenement_id, type, detecte_le, debut, fin, minutes, fauteuil_id, fauteuil_nom, praticien_id,
--          praticien_nom, famille, libre, candidats: [{ rang, origine: plan|attente|controle, patient_id,
--          patient_nom, motif, duree_min, plan_id, attente_id, depuis, preferences_ok, ne_pas_contacter }] }]
-- Lecture seule ; aucune table, aucune politique ne change. Idempotent (create or replace, grant).

create or replace function private.tiroma_regard(p_client uuid, p_entite uuid)
 returns table(profil text, praticien_id uuid, perimetre text, voit_tous boolean, voit_production boolean)
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare m record;
begin
  if (select auth.uid()) is null then
    if private.tiroma_role_session() in ('service_role', 'postgres') then
      profil := 'titulaire'; praticien_id := null; perimetre := 'cabinet'; voit_tous := true; voit_production := true;
      return next;
    end if;
    return;
  end if;
  for m in
    select x.profil, x.praticien_id, x.perimetre from private.tiroma_mes_cabinets() x
    where x.client_id = p_client and x.entite_id = p_entite
    order by case x.profil when 'titulaire' then 1 when 'assistante' then 2 when 'collaborateur' then 3 else 4 end
    limit 1
  loop
    profil := m.profil; praticien_id := m.praticien_id; perimetre := m.perimetre;
    voit_tous := p_entite in (select private.tiroma_cabinets_patients());
    voit_production := p_entite in (select private.tiroma_cabinets_production());
    return next;
  end loop;
end $function$;

create or replace function private.tiroma_exiger_regard(p_client uuid, p_entite uuid, p_profils text[],
  out profil text, out praticien_id uuid, out perimetre text, out voit_tous boolean, out voit_production boolean)
 returns record
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  select x.profil, x.praticien_id, x.perimetre, x.voit_tous, x.voit_production
    into profil, praticien_id, perimetre, voit_tous, voit_production
  from private.tiroma_regard(p_client, p_entite) x;
  if profil is null or not (profil = any (p_profils)) then
    raise exception 'Ce cabinet n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
end $function$;

create or replace function private.tiroma_nom_patient(p_voit boolean, p_nom text, p_prenom text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case when p_voit then btrim(coalesce(p_prenom || ' ', '') || coalesce(p_nom, ''))
              else coalesce(left(btrim(p_prenom), 1) || '. ', '') || coalesce(left(btrim(p_nom), 1) || '.', '—') end
$function$;

create or replace function private.tiroma_capacite_famille(p_famille text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case p_famille
    when 'prothese_preparation' then 'prothese' when 'prothese_empreinte' then 'prothese' when 'prothese_pose' then 'prothese'
    when 'implant_prothese' then 'prothese'
    when 'implant_chirurgie' then 'chirurgie' when 'chirurgie' then 'chirurgie'
    when 'orthodontie_pose' then 'orthodontie' when 'orthodontie_controle' then 'orthodontie'
    when 'controle' then 'prevention' when 'detartrage' then 'prevention'
    else 'soins' end
$function$;

create or replace function private.tiroma_disponible(p_disponibilites jsonb, p_debut timestamp with time zone, p_fuseau text)
 returns boolean
 language plpgsql
 immutable
 set search_path to ''
as $function$
declare e jsonb; v_jour integer; v_demi text; n integer := 0;
begin
  if p_disponibilites is null or jsonb_typeof(p_disponibilites) <> 'array' or jsonb_array_length(p_disponibilites) = 0 then
    return true;
  end if;
  v_jour := extract(isodow from (p_debut at time zone p_fuseau))::integer;
  v_demi := case when (p_debut at time zone p_fuseau)::time < time '13:00' then 'matin' else 'apres_midi' end;
  for e in select value from jsonb_array_elements(p_disponibilites) loop
    continue when jsonb_typeof(e) <> 'object' or jsonb_typeof(e -> 'jours') <> 'array';
    n := n + 1;
    if e -> 'jours' @> to_jsonb(v_jour) and (e ->> 'demi_journee' is null or e ->> 'demi_journee' = v_demi) then
      return true;
    end if;
  end loop;
  return n = 0;  -- aucune préférence lisible : on ne contraint pas
end $function$;

-- Le calcul lui-même, pour un regard donné (celui de la personne connectée, ou celui que le point du matin
-- compose pour chaque membre de l'équipe).
create or replace function private.tiroma_creneaux_a_sauver_pour(p_client uuid, p_entite uuid, p_voit_tous boolean, p_praticien uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  g public.tiroma_regles;
  v_fuseau text;
  v_maintenant timestamptz := now();
  v_jour date;
  c record;
  v_cands jsonb;
  v_res jsonb := '[]'::jsonb;
  v_quota_pris integer;
begin
  select * into g from public.tiroma_regles where client_id = p_client and entite_id = p_entite;
  select e.fuseau into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;
  if g.id is null or v_fuseau is null then
    return '[]'::jsonb;
  end if;
  v_jour := (v_maintenant at time zone v_fuseau)::date;

  for c in
    with liberes as (
      select distinct on (ev.rendez_vous_id, ev.avant ->> 'debut')
             ev.id, ev.type, ev.detecte_le, ev.rendez_vous_id,
             (ev.avant ->> 'debut')::timestamptz as debut, (ev.avant ->> 'fin')::timestamptz as fin,
             nullif(ev.avant ->> 'fauteuil_id', '')::uuid as fauteuil_id,
             nullif(ev.avant ->> 'praticien_id', '')::uuid as praticien_id,
             t.famille
      from public.tiroma_evenements_agenda ev
      left join public.tiroma_rendez_vous r on r.id = ev.rendez_vous_id
      left join public.tiroma_types_rdv t on t.id = r.type_rdv_id
      where ev.client_id = p_client and ev.entite_id = p_entite
        and ev.type in ('annulation', 'report', 'deplacement')
        and ev.avant ? 'debut' and ev.avant ? 'fin'
        and (ev.avant ->> 'debut')::timestamptz > v_maintenant
        and (ev.avant ->> 'debut')::timestamptz < ((v_jour + g.horizon_creneaux_jours + 1)::timestamp at time zone v_fuseau)
        and (p_voit_tous or p_praticien is null or nullif(ev.avant ->> 'praticien_id', '')::uuid = p_praticien)
      order by ev.rendez_vous_id, ev.avant ->> 'debut', ev.detecte_le desc
    )
    select l.*, f.nom as fauteuil_nom, f.capacites, p.nom_affiche as praticien_nom,
           round(extract(epoch from (l.fin - l.debut)) / 60)::integer as minutes,
           not exists (
             select 1 from public.tiroma_rendez_vous r
             where r.client_id = p_client and r.entite_id = p_entite and r.statut in ('prevu', 'honore')
               and tstzrange(r.debut, r.fin) && tstzrange(l.debut, l.fin)
               and case when l.fauteuil_id is not null then r.fauteuil_id = l.fauteuil_id
                        when l.praticien_id is not null then r.praticien_id = l.praticien_id
                        else false end) as libre
    from liberes l
    left join public.tiroma_fauteuils f on f.id = l.fauteuil_id
    left join public.tiroma_praticiens p on p.id = l.praticien_id
    order by l.debut, l.fauteuil_id
  loop
    v_cands := '[]'::jsonb;
    if c.libre and c.minutes >= g.creneau_min_minutes
       and c.debut - v_maintenant >= make_interval(mins => g.delai_min_appel_minutes) then
      -- Le quota de contrôles de la demi-journée.
      select count(*) into v_quota_pris
      from public.tiroma_rendez_vous r join public.tiroma_types_rdv t on t.id = r.type_rdv_id
      where r.client_id = p_client and r.entite_id = p_entite and r.statut = 'prevu' and t.famille = 'controle'
        and (r.debut at time zone v_fuseau)::date = (c.debut at time zone v_fuseau)::date
        and ((r.debut at time zone v_fuseau)::time < time '13:00') = ((c.debut at time zone v_fuseau)::time < time '13:00');

      with
      plans as (
        select pa.id as patient_id, pa.nom, pa.prenom, pa.ne_pas_contacter, pa.disponibilites, pa.preavis_minutes, pa.praticien_habituel_id,
               pl.id as plan_id, pl.praticien_id, coalesce(pl.signe_le, pl.presente_le) as depuis,
               a.libelle, a.famille,
               coalesce(a.duree_min, (select min(t.duree_defaut_min) from public.tiroma_types_rdv t
                                      where t.client_id = p_client and t.entite_id = p_entite and t.famille = a.famille), 45) as duree_min, a.rang
        from public.tiroma_plans pl
        join public.tiroma_patients pa on pa.id = pl.patient_id
        join lateral (
          select a2.* from public.tiroma_plan_actes a2
          where a2.plan_id = pl.id and a2.statut = 'a_faire' and a2.rendez_vous_id is null
            and (a2.delai_min_jours is null or a2.rang = 1
                 or coalesce((select max(a3.fait_le) from public.tiroma_plan_actes a3 where a3.plan_id = pl.id and a3.rang < a2.rang and a3.fait_le is not null), date '1900-01-01')
                    + a2.delai_min_jours <= (c.debut at time zone v_fuseau)::date)
          order by a2.rang limit 1) a on true
        where pl.client_id = p_client and pl.entite_id = p_entite and pl.statut in ('signe', 'commence') and pl.disparu_le is null
          and pa.actif and pa.fusionne_dans_id is null
          and not exists (select 1 from public.tiroma_rendez_vous r where r.plan_id = pl.id and r.statut = 'prevu' and r.debut > v_maintenant)
          and (pl.praticien_id is null or c.praticien_id is null or pl.praticien_id = c.praticien_id)
          and (c.famille is null or c.famille in ('personnel', 'autre') or a.famille = c.famille
               or private.tiroma_capacite_famille(a.famille) = private.tiroma_capacite_famille(c.famille))
          and (c.capacites is null or private.tiroma_capacite_famille(a.famille) = any (c.capacites))
      ),
      attente as (
        select pa.id as patient_id, pa.nom, pa.prenom, pa.ne_pas_contacter, pa.disponibilites, pa.praticien_habituel_id,
               l.id as attente_id, l.praticien_id, l.ajoute_le::date as depuis, l.famille, l.drapeau_gene,
               coalesce(l.duree_min, t.duree_defaut_min, 30) as duree_min, coalesce(l.preavis_minutes, pa.preavis_minutes, 0) as preavis_minutes,
               coalesce(l.disponibilites, pa.disponibilites) as dispo, coalesce(t.libelle_source, l.famille, 'liste d''attente') as libelle
        from public.tiroma_liste_attente l
        join public.tiroma_patients pa on pa.id = l.patient_id
        left join public.tiroma_types_rdv t on t.id = l.type_rdv_id
        where l.client_id = p_client and l.entite_id = p_entite and l.retire_le is null
          and pa.actif and pa.fusionne_dans_id is null
          and (l.praticien_id is null or c.praticien_id is null or l.praticien_id = c.praticien_id)
          and (c.capacites is null or l.famille is null or private.tiroma_capacite_famille(l.famille) = any (c.capacites))
      ),
      controles as (
        select pa.id as patient_id, pa.nom, pa.prenom, pa.ne_pas_contacter, pa.disponibilites, pa.praticien_habituel_id,
               pa.dernier_controle_le as depuis, pa.preavis_minutes,
               coalesce((select min(t.duree_defaut_min) from public.tiroma_types_rdv t
                         where t.client_id = p_client and t.entite_id = p_entite and t.famille = 'controle' and t.duree_defaut_min is not null), 20) as duree_min
        from public.tiroma_patients pa
        where pa.client_id = p_client and pa.entite_id = p_entite and pa.actif and pa.fusionne_dans_id is null
          and not pa.ne_pas_contacter
          and (pa.prochain_rdv_le is null or pa.prochain_rdv_le < v_maintenant)
          and coalesce(pa.dernier_controle_le, date '1900-01-01') < v_jour - make_interval(months => g.seuil_controle_mois)
          and coalesce(greatest(pa.dernier_rdv_le, pa.dernier_acte_le), (pa.vu_premier_le at time zone v_fuseau)::date) >= v_jour - make_interval(months => g.patient_actif_mois)
          and (pa.praticien_habituel_id is null or c.praticien_id is null or pa.praticien_habituel_id = c.praticien_id)
          and (c.capacites is null or c.capacites && array['prevention', 'soins'])
          and v_quota_pris < g.quota_controles_demi_journee
      ),
      tous as (
        select 'plan' as origine, p.patient_id, p.nom, p.prenom, p.ne_pas_contacter, p.plan_id, null::uuid as attente_id, p.depuis,
               p.duree_min, p.praticien_habituel_id, p.disponibilites as dispo, 0 as preavis,
               format('plan signé le %s : %s (séance %s)', to_char(p.depuis, 'DD/MM/YYYY'), coalesce(p.libelle, p.famille, 'soin'), p.rang) as motif,
               false as gene
        from plans p
        union all
        select 'attente', a.patient_id, a.nom, a.prenom, a.ne_pas_contacter, null, a.attente_id, a.depuis, a.duree_min, a.praticien_habituel_id, a.dispo, a.preavis_minutes,
               format('en liste d''attente depuis le %s : %s%s', to_char(a.depuis, 'DD/MM/YYYY'), a.libelle, case when a.drapeau_gene then ' (patient gêné)' else '' end),
               a.drapeau_gene
        from attente a
        union all
        select 'controle', k.patient_id, k.nom, k.prenom, k.ne_pas_contacter, null, null, k.depuis, k.duree_min, k.praticien_habituel_id, k.disponibilites, coalesce(k.preavis_minutes, 0),
               case when k.depuis is null then 'aucun contrôle connu' else format('dernier contrôle le %s', to_char(k.depuis, 'DD/MM/YYYY')) end,
               false
        from controles k
      ),
      classes as (
        select t.*,
               array_position(g.ordre_priorite, t.origine) as priorite,
               private.tiroma_disponible(t.dispo, c.debut, v_fuseau) as preferences_ok,
               (t.duree_min <= c.minutes) as duree_ok,
               (c.debut - v_maintenant >= make_interval(mins => t.preavis)) as preavis_ok
        from tous t
      )
      select coalesce(jsonb_agg(jsonb_build_object(
               'rang', x.rang, 'origine', x.origine, 'patient_id', x.patient_id,
               'patient_nom', private.tiroma_nom_patient(p_voit_tous or x.praticien_habituel_id = p_praticien, x.nom, x.prenom),
               'motif', x.motif, 'duree_min', x.duree_min, 'plan_id', x.plan_id, 'attente_id', x.attente_id, 'depuis', x.depuis,
               'preferences_ok', x.preferences_ok, 'ne_pas_contacter', x.ne_pas_contacter) order by x.rang), '[]'::jsonb)
        into v_cands
      from (
        select u.*, row_number() over (order by u.priorite, u.gene desc, u.depuis nulls last, u.patient_id) as rang
        from (
          -- Un patient n'est proposé qu'une fois, par sa meilleure voie (plan avant attente avant contrôle).
          select distinct on (k.patient_id) k.*
          from classes k
          where not k.ne_pas_contacter
            and k.preavis_ok
            and (not g.tenir_duree or k.duree_ok)
            and (not g.tenir_preferences or k.preferences_ok)
          order by k.patient_id, k.priorite, k.depuis nulls last) u
        limit g.nb_propositions) x;
    end if;

    v_res := v_res || jsonb_build_object(
      'evenement_id', c.id, 'type', c.type, 'detecte_le', c.detecte_le, 'rendez_vous_id', c.rendez_vous_id,
      'debut', c.debut, 'fin', c.fin, 'minutes', c.minutes,
      'fauteuil_id', c.fauteuil_id, 'fauteuil_nom', c.fauteuil_nom, 'praticien_id', c.praticien_id, 'praticien_nom', c.praticien_nom,
      'famille', c.famille, 'libre', c.libre, 'candidats', v_cands);
  end loop;
  return v_res;
end $function$;

-- La porte : le regard de la personne connectée, puis le calcul.
create or replace function private.tiroma_creneaux_a_sauver(p_client uuid, p_entite uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare rg record;
begin
  rg := private.tiroma_exiger_regard(p_client, p_entite, array['titulaire', 'collaborateur', 'assistante']);
  return private.tiroma_creneaux_a_sauver_pour(p_client, p_entite, rg.voit_tous, rg.praticien_id);
end $function$;

create or replace function public.tiroma_creneaux_a_sauver(p_client uuid, p_entite uuid)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select private.tiroma_creneaux_a_sauver(p_client, p_entite)
$function$;

revoke all on function public.tiroma_creneaux_a_sauver(uuid, uuid) from public, anon;
grant execute on function public.tiroma_creneaux_a_sauver(uuid, uuid) to authenticated, service_role;
grant execute on function private.tiroma_creneaux_a_sauver(uuid, uuid) to authenticated, service_role;
grant execute on function private.tiroma_creneaux_a_sauver_pour(uuid, uuid, boolean, uuid) to authenticated, service_role;
grant execute on function private.tiroma_regard(uuid, uuid) to authenticated, service_role;
grant execute on function private.tiroma_exiger_regard(uuid, uuid, text[]) to authenticated, service_role;
grant execute on function private.tiroma_nom_patient(boolean, text, text) to authenticated, service_role;
grant execute on function private.tiroma_capacite_famille(text) to authenticated, service_role;
grant execute on function private.tiroma_disponible(jsonb, timestamp with time zone, text) to authenticated, service_role;
