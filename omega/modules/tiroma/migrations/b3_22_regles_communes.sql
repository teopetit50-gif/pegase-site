-- b3_22 — Les règles de priorité communes à plusieurs centres (lignes « Mêmes règles de priorité partout », offre
-- Centre, et « Règles de priorité communes », offre Réseau, de /secteurs/dentaire).
--
-- CE QUE ÇA CORRIGE : chaque cabinet a ses règles (tiroma_regles, une ligne par entité, posée à l'installation). Un
-- titulaire de plusieurs centres devait les recopier à la main, centre par centre, sans rien qui lui montre les écarts.
--
-- CE QUE ÇA POSE :
--   · public.tiroma_regles_communes(p_client) → jsonb : pour les cabinets dont l'appelant est titulaire, les règles de
--     priorité de chacun et la liste des règles qui diffèrent d'un centre à l'autre :
--     { centres: [{entite_id, nom, regles: {…}}], ecarts: [nom de règle] } ;
--   · public.tiroma_aligner_regles(p_client, p_source, p_cibles uuid[] = null) → integer : recopie les règles de
--     priorité du centre source sur les centres cibles (par défaut : tous les autres cabinets dont il est titulaire).
--     Titulaire de la source ET de chaque cible, sinon 42501. Rend le nombre de centres alignés ; journal
--     « tiroma.regles_alignees ».
-- Ce qui est recopié : les règles de décision (ordre de priorité, propositions, délais, seuils, contrôles, devis,
-- laboratoire, orthodontie, demi-journée vide). Ce qui reste propre à chaque centre : la réserve d'urgences (elle dépend
-- de ses jours), les garde-fous d'import (ils dépendent de son volume), la fenêtre de report et l'objectif de production.
-- Idempotent (create or replace, grant).

create or replace function private.tiroma_regles_de_priorite(r public.tiroma_regles)
 returns jsonb
 language sql
 immutable
 set search_path to ''
as $function$
  select jsonb_build_object(
    'ordre_priorite', r.ordre_priorite, 'tenir_duree', r.tenir_duree, 'tenir_preferences', r.tenir_preferences,
    'creneau_min_minutes', r.creneau_min_minutes, 'delai_min_appel_minutes', r.delai_min_appel_minutes,
    'horizon_creneaux_jours', r.horizon_creneaux_jours, 'nb_propositions', r.nb_propositions,
    'seuil_controle_mois', r.seuil_controle_mois, 'patient_actif_mois', r.patient_actif_mois, 'actes_controle', r.actes_controle,
    'quota_controles_demi_journee', r.quota_controles_demi_journee, 'delai_interruption_jours', r.delai_interruption_jours,
    'delai_devis_presente_jours', r.delai_devis_presente_jours, 'delai_reponse_mutuelle_jours', r.delai_reponse_mutuelle_jours,
    'alerte_devis_expire_jours', r.alerte_devis_expire_jours, 'validite_devis_jours', r.validite_devis_jours,
    'labo_verif_jours', r.labo_verif_jours, 'renouvellement_accord_odf', r.renouvellement_accord_odf,
    'seuil_demi_journee_vide', r.seuil_demi_journee_vide)
$function$;

create or replace function private.tiroma_regles_communes_lire(p_client uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_centres jsonb;
  v_ecarts jsonb;
begin
  if (select auth.uid()) is null or not exists (select 1 from public.comptes c where c.client_id = p_client and c.user_id = (select auth.uid())) then
    raise exception 'Organisation hors de votre périmètre.' using errcode = '42501';
  end if;
  with centres as (
    select g.entite_id, e.nom, private.tiroma_regles_de_priorite(g) as regles
    from public.tiroma_regles g
    join public.tiroma_cabinets k on k.client_id = g.client_id and k.entite_id = g.entite_id and k.statut <> 'clos'
    join public.entites e on e.client_id = g.client_id and e.id = g.entite_id
    where g.client_id = p_client and private.tiroma_est_titulaire(g.client_id, g.entite_id)
  )
  select coalesce(jsonb_agg(jsonb_build_object('entite_id', c.entite_id, 'nom', c.nom, 'regles', c.regles) order by c.nom), '[]'::jsonb),
         coalesce((select jsonb_agg(x.cle order by x.cle) from (
                     select r.key as cle from centres c2, jsonb_each(c2.regles) r group by r.key having count(distinct r.value) > 1) x), '[]'::jsonb)
    into v_centres, v_ecarts
  from centres c;
  return jsonb_build_object('centres', v_centres, 'ecarts', v_ecarts);
end $function$;

create or replace function public.tiroma_regles_communes(p_client uuid)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select private.tiroma_regles_communes_lire(p_client)
$function$;

create or replace function private.tiroma_aligner_regles(p_client uuid, p_source uuid, p_cibles uuid[] default null)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  s public.tiroma_regles;
  v_cibles uuid[];
  c uuid;
  n integer := 0;
begin
  if not private.tiroma_est_titulaire(p_client, p_source) then
    raise exception 'Vous n''êtes pas titulaire du centre dont les règles serviraient de modèle.' using errcode = '42501';
  end if;
  select * into s from public.tiroma_regles where client_id = p_client and entite_id = p_source;
  if not found then
    raise exception 'Ce centre n''a pas de règles : installez d''abord son cabinet.' using errcode = 'P0002';
  end if;
  v_cibles := coalesce(p_cibles, (
    select array_agg(k.entite_id) from public.tiroma_cabinets k
    where k.client_id = p_client and k.statut <> 'clos' and private.tiroma_est_titulaire(k.client_id, k.entite_id)));
  foreach c in array coalesce(v_cibles, '{}'::uuid[]) loop
    continue when c = p_source;
    if not private.tiroma_est_titulaire(p_client, c) then
      raise exception 'Vous n''êtes pas titulaire de l''un des centres à aligner : rien n''a été changé.' using errcode = '42501';
    end if;
    update public.tiroma_regles g set
      ordre_priorite = s.ordre_priorite, tenir_duree = s.tenir_duree, tenir_preferences = s.tenir_preferences,
      creneau_min_minutes = s.creneau_min_minutes, delai_min_appel_minutes = s.delai_min_appel_minutes,
      horizon_creneaux_jours = s.horizon_creneaux_jours, nb_propositions = s.nb_propositions,
      seuil_controle_mois = s.seuil_controle_mois, patient_actif_mois = s.patient_actif_mois, actes_controle = s.actes_controle,
      quota_controles_demi_journee = s.quota_controles_demi_journee, delai_interruption_jours = s.delai_interruption_jours,
      delai_devis_presente_jours = s.delai_devis_presente_jours, delai_reponse_mutuelle_jours = s.delai_reponse_mutuelle_jours,
      alerte_devis_expire_jours = s.alerte_devis_expire_jours, validite_devis_jours = s.validite_devis_jours,
      labo_verif_jours = s.labo_verif_jours, renouvellement_accord_odf = s.renouvellement_accord_odf,
      seuil_demi_journee_vide = s.seuil_demi_journee_vide
    where g.client_id = p_client and g.entite_id = c;
    if found then
      n := n + 1;
    end if;
  end loop;
  perform private.journaliser_module(p_client, 'tiroma', 'tiroma.regles_alignees', 'tiroma_regles', s.id::text,
    jsonb_build_object('source', p_source, 'cibles', to_jsonb(array_remove(coalesce(v_cibles, '{}'::uuid[]), p_source)), 'alignes', n), p_source);
  return n;
end $function$;

create or replace function public.tiroma_aligner_regles(p_client uuid, p_source uuid, p_cibles uuid[] default null)
 returns integer
 language sql
 set search_path to ''
as $function$
  select private.tiroma_aligner_regles(p_client, p_source, p_cibles)
$function$;

revoke all on function public.tiroma_regles_communes(uuid) from public, anon;
grant execute on function public.tiroma_regles_communes(uuid) to authenticated, service_role;
revoke all on function private.tiroma_regles_communes_lire(uuid) from public, anon;
grant execute on function private.tiroma_regles_communes_lire(uuid) to authenticated, service_role;
revoke all on function public.tiroma_aligner_regles(uuid, uuid, uuid[]) from public, anon;
grant execute on function public.tiroma_aligner_regles(uuid, uuid, uuid[]) to authenticated, service_role;
revoke all on function private.tiroma_aligner_regles(uuid, uuid, uuid[]) from public, anon;
grant execute on function private.tiroma_aligner_regles(uuid, uuid, uuid[]) to authenticated, service_role;
revoke all on function private.tiroma_regles_de_priorite(public.tiroma_regles) from public, anon, authenticated;
grant execute on function private.tiroma_regles_de_priorite(public.tiroma_regles) to service_role;

select 'b3_22 règles de priorité communes posées' as resultat;
