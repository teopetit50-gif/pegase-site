-- b3_05 — La charge des fauteuils : quel fauteuil tourne à vide aujourd'hui, par demi-journée, jamais par personne.
--
-- CE QUE ÇA CORRIGE : la page /secteurs/dentaire promet « Tiroma montre quel fauteuil tourne à vide aujourd'hui »,
-- « Charge par fauteuil et par demi-journée », « La charge se lit par fauteuil, jamais par personne, et seul le
-- titulaire la voit ». Le socle sait calculer les plages ouvertes (private.tiroma_ouvert) et les plages réservées
-- (private.tiroma_reserve) pour ses mesures du soir, mais rien ne les rend à l'écran en journée.
--
-- CE QUE ÇA POSE : public.tiroma_charge_fauteuils(p_client, p_entite, p_jour date = aujourd'hui) → jsonb, réservé au
-- titulaire (et à Omega) :
--   { jour, seuil_demi_journee_vide, fauteuils: [{ fauteuil_id, nom, capacites, objectif_occupation, assistante_habituelle,
--       matin: {ouvert_min, prevu_min, taux, vide}, apres_midi: {…}, journee: {…}, rendez_vous, sans_assistante_exigee }],
--     total: {ouvert_min, prevu_min, taux}, demi_journees_vides }
-- « vide » : une demi-journée ouverte dont le taux est sous seuil_demi_journee_vide. Lecture seule ; idempotent.

create or replace function private.tiroma_charge_fauteuils(p_client uuid, p_entite uuid, p_jour date default null)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  rg record;
  g public.tiroma_regles;
  v_fuseau text;
  v_jour date;
  f record;
  v_ouvert tstzmultirange;
  v_prevu tstzmultirange;
  v_matin tstzmultirange;
  v_apres tstzmultirange;
  v_fauteuils jsonb := '[]'::jsonb;
  v_tot_ouv numeric := 0;
  v_tot_prevu numeric := 0;
  v_vides integer := 0;
  v_assistante text;
  n_rdv integer;
  n_sans integer;
  v_m jsonb; v_a jsonb; v_j jsonb;
begin
  rg := private.tiroma_exiger_regard(p_client, p_entite, array['titulaire']);
  select * into g from public.tiroma_regles where client_id = p_client and entite_id = p_entite;
  select e.fuseau into v_fuseau from public.entites e where e.client_id = p_client and e.id = p_entite;
  v_fuseau := coalesce(v_fuseau, 'UTC');
  v_jour := coalesce(p_jour, (now() at time zone v_fuseau)::date);
  v_matin := tstzmultirange(tstzrange(v_jour::timestamp at time zone v_fuseau, (v_jour + time '13:00') at time zone v_fuseau, '[)'));
  v_apres := tstzmultirange(tstzrange((v_jour + time '13:00') at time zone v_fuseau, (v_jour + 1)::timestamp at time zone v_fuseau, '[)'));

  for f in
    select k.id, k.nom, k.capacites, k.objectif_occupation from public.tiroma_fauteuils k
    where k.client_id = p_client and k.entite_id = p_entite and k.actif order by k.nom, k.id
  loop
    v_ouvert := coalesce(private.tiroma_ouvert(p_client, p_entite, f.id, v_jour), '{}'::tstzmultirange);
    v_prevu := private.tiroma_reserve(p_client, p_entite, f.id, v_jour, 'prevue') * v_ouvert;
    select string_agg(m.prenom, ', ' order by m.prenom) into v_assistante
    from public.tiroma_membres m where m.client_id = p_client and m.entite_id = p_entite and m.fauteuil_habituel_id = f.id and m.actif;
    select count(*), count(*) filter (where coalesce(t.exige_assistante, true)) into n_rdv, n_sans
    from public.tiroma_rendez_vous r left join public.tiroma_types_rdv t on t.id = r.type_rdv_id
    where r.client_id = p_client and r.entite_id = p_entite and r.fauteuil_id = f.id and r.statut in ('prevu', 'honore')
      and tstzrange(r.debut, r.fin) && private.tiroma_bornes_jour(v_jour, v_fuseau) and coalesce(t.famille, '') <> 'personnel';

    v_m := private.tiroma_demi_journee(v_ouvert * v_matin, v_prevu * v_matin, g.seuil_demi_journee_vide);
    v_a := private.tiroma_demi_journee(v_ouvert * v_apres, v_prevu * v_apres, g.seuil_demi_journee_vide);
    v_j := private.tiroma_demi_journee(v_ouvert, v_prevu, g.seuil_demi_journee_vide);
    v_vides := v_vides + (v_m ->> 'vide')::boolean::integer + (v_a ->> 'vide')::boolean::integer;
    v_tot_ouv := v_tot_ouv + (v_j ->> 'ouvert_min')::numeric;
    v_tot_prevu := v_tot_prevu + (v_j ->> 'prevu_min')::numeric;
    v_fauteuils := v_fauteuils || jsonb_build_object(
      'fauteuil_id', f.id, 'nom', f.nom, 'capacites', to_jsonb(f.capacites), 'objectif_occupation', f.objectif_occupation,
      'assistante_habituelle', v_assistante, 'matin', v_m, 'apres_midi', v_a, 'journee', v_j,
      'rendez_vous', n_rdv, 'sans_assistante_exigee', case when v_assistante is null then n_sans else 0 end);
  end loop;

  return jsonb_build_object(
    'jour', v_jour, 'seuil_demi_journee_vide', g.seuil_demi_journee_vide, 'fauteuils', v_fauteuils,
    'total', jsonb_build_object('ouvert_min', v_tot_ouv, 'prevu_min', v_tot_prevu,
                                'taux', case when v_tot_ouv > 0 then round(v_tot_prevu / v_tot_ouv, 3) end),
    'demi_journees_vides', v_vides);
end $function$;

create or replace function private.tiroma_demi_journee(p_ouvert tstzmultirange, p_prevu tstzmultirange, p_seuil numeric)
 returns jsonb
 language sql
 immutable
 set search_path to ''
as $function$
  select jsonb_build_object(
    'ouvert_min', o.m, 'prevu_min', p.m,
    'taux', case when o.m > 0 then round(p.m / o.m, 3) end,
    'vide', o.m > 0 and p.m / o.m < p_seuil)
  from (select private.tiroma_minutes(p_ouvert) as m) o, (select private.tiroma_minutes(p_prevu) as m) p
$function$;

create or replace function public.tiroma_charge_fauteuils(p_client uuid, p_entite uuid, p_jour date default null)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select private.tiroma_charge_fauteuils(p_client, p_entite, p_jour)
$function$;

revoke all on function public.tiroma_charge_fauteuils(uuid, uuid, date) from public, anon;
grant execute on function public.tiroma_charge_fauteuils(uuid, uuid, date) to authenticated, service_role;
grant execute on function private.tiroma_charge_fauteuils(uuid, uuid, date) to authenticated, service_role;
grant execute on function private.tiroma_demi_journee(tstzmultirange, tstzmultirange, numeric) to authenticated, service_role;
