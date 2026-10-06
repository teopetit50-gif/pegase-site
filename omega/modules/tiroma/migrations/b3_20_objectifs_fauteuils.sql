-- b3_20 — Les objectifs par fauteuil (audit des promesses, § 2 Tiroma, n° 6).
--
-- CE QUE ÇA CORRIGE : la page /secteurs/dentaire promet « Objectifs par fauteuil » (offre Centre). Le fauteuil porte
-- un objectif d'occupation (tiroma_fauteuils.objectif_occupation, que le titulaire fixe sous RLS), mais il n'était lu
-- que pour le jour même (b3_05) : rien ne disait, semaine après semaine, si le fauteuil tient son objectif.
--
-- LE CALCUL, par fauteuil actif et par semaine (lundi à dimanche) :
--   · ouvert : les plages ouvertes du fauteuil (private.tiroma_ouvert, fériés et fermetures déduits) ; un jour dont on
--     ne sait pas s'il est ouvert (calendrier des fériés incomplet) ne compte pas ;
--   · les semaines passées : l'occupation RÉALISÉE (rendez-vous honorés ou présumés honorés, private.tiroma_reserve
--     'realisee') ; un manqué n'occupe pas le fauteuil ;
--   · la semaine en cours et la suivante : l'occupation PRÉVUE (rendez-vous prévus ou honorés, 'prevue') ;
--   · « atteint » : taux ≥ objectif, quand le fauteuil a un objectif et au moins une heure ouverte dans la semaine.
--   Rien par personne : la charge se lit par fauteuil, et seul le titulaire la voit (la promesse de la page).
--
-- CE QUE ÇA POSE :
--   public.tiroma_objectifs_fauteuils(p_client, p_entite, p_semaines int = 4) → jsonb   (titulaire ; 1 à 12 semaines)
--     { semaines: [{lundi, nature ('realisee' | 'prevue'), en_cours}], fauteuils: [{fauteuil_id, nom, objectif,
--       semaines: [{lundi, ouvert_min, occupe_min, taux, atteint}], moyenne (des semaines passées), atteintes, comptees}] }
-- Lecture seule ; idempotent (create or replace, grant).

create or replace function private.tiroma_occupation_semaine(p_client uuid, p_entite uuid, p_fauteuil uuid, p_lundi date, p_genre text)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  d date;
  v_ouvert tstzmultirange;
  m_ouv numeric := 0;
  m_occ numeric := 0;
begin
  for d in select g::date from generate_series(p_lundi, p_lundi + 6, interval '1 day') g loop
    v_ouvert := private.tiroma_ouvert(p_client, p_entite, p_fauteuil, d);
    continue when v_ouvert is null;
    m_ouv := m_ouv + private.tiroma_minutes(v_ouvert);
    m_occ := m_occ + private.tiroma_minutes(private.tiroma_reserve(p_client, p_entite, p_fauteuil, d, p_genre) * v_ouvert);
  end loop;
  return jsonb_build_object('lundi', p_lundi, 'ouvert_min', round(m_ouv), 'occupe_min', round(m_occ),
                            'taux', case when m_ouv > 0 then round(m_occ / m_ouv, 3) end);
end $function$;

create or replace function private.tiroma_objectifs_fauteuils_lire(p_client uuid, p_entite uuid, p_semaines integer default 4)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_fuseau text;
  v_lundi date;
  f record;
  s jsonb;
  v_sem jsonb;
  v_semaines jsonb := '[]'::jsonb;
  v_fauteuils jsonb := '[]'::jsonb;
  k integer;
  v_occ numeric;
  v_ouv numeric;
  n_atteintes integer;
  n_comptees integer;
begin
  perform private.tiroma_exiger_regard(p_client, p_entite, array['titulaire']);
  if p_semaines is null or p_semaines not between 1 and 12 then
    raise exception 'De 1 à 12 semaines.' using errcode = '22023';
  end if;
  select coalesce(e.fuseau, 'Europe/Paris') into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;
  v_lundi := date_trunc('week', (now() at time zone coalesce(v_fuseau, 'Europe/Paris'))::date)::date;

  for k in select g from generate_series(-p_semaines, 1) g loop
    v_semaines := v_semaines || jsonb_build_object('lundi', v_lundi + 7 * k, 'nature', case when k < 0 then 'realisee' else 'prevue' end,
                                                   'en_cours', k = 0);
  end loop;

  for f in
    select x.id, x.nom, x.objectif_occupation from public.tiroma_fauteuils x
    where x.client_id = p_client and x.entite_id = p_entite and x.actif order by x.nom, x.id
  loop
    v_sem := '[]'::jsonb;
    v_occ := 0; v_ouv := 0; n_atteintes := 0; n_comptees := 0;
    for k in select g from generate_series(-p_semaines, 1) g loop
      s := private.tiroma_occupation_semaine(p_client, p_entite, f.id, v_lundi + 7 * k, case when k < 0 then 'realisee' else 'prevue' end);
      s := s || jsonb_build_object('atteint',
        case when f.objectif_occupation is null or (s ->> 'ouvert_min')::numeric < 60 then null
             else (s ->> 'taux')::numeric >= f.objectif_occupation end);
      if k < 0 and (s ->> 'ouvert_min')::numeric >= 60 then
        v_occ := v_occ + (s ->> 'occupe_min')::numeric;
        v_ouv := v_ouv + (s ->> 'ouvert_min')::numeric;
        if f.objectif_occupation is not null then
          n_comptees := n_comptees + 1;
          n_atteintes := n_atteintes + case when (s ->> 'atteint')::boolean then 1 else 0 end;
        end if;
      end if;
      v_sem := v_sem || s;
    end loop;
    v_fauteuils := v_fauteuils || jsonb_build_object(
      'fauteuil_id', f.id, 'nom', f.nom, 'objectif', f.objectif_occupation, 'semaines', v_sem,
      'moyenne', case when v_ouv > 0 then round(v_occ / v_ouv, 3) end,
      'atteintes', n_atteintes, 'comptees', n_comptees);
  end loop;

  return jsonb_build_object('semaines', v_semaines, 'fauteuils', v_fauteuils);
end $function$;

create or replace function public.tiroma_objectifs_fauteuils(p_client uuid, p_entite uuid, p_semaines integer default 4)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select private.tiroma_objectifs_fauteuils_lire(p_client, p_entite, p_semaines)
$function$;

revoke all on function public.tiroma_objectifs_fauteuils(uuid, uuid, integer) from public, anon;
grant execute on function public.tiroma_objectifs_fauteuils(uuid, uuid, integer) to authenticated, service_role;
revoke all on function private.tiroma_objectifs_fauteuils_lire(uuid, uuid, integer) from public, anon;
grant execute on function private.tiroma_objectifs_fauteuils_lire(uuid, uuid, integer) to authenticated, service_role;
revoke all on function private.tiroma_occupation_semaine(uuid, uuid, uuid, date, text) from public, anon, authenticated;
grant execute on function private.tiroma_occupation_semaine(uuid, uuid, uuid, date, text) to service_role;

select 'b3_20 objectifs par fauteuil posés' as resultat;
