-- b3_07 — L'accord de la mutuelle se note dans Tiroma : l'export Logos_w ne le porte pas.
--
-- CE QUE ÇA CORRIGE : la page /secteurs/dentaire promet « Accords des mutuelles rapprochés de l'agenda » et « Quand la
-- mutuelle a donné son accord, Tiroma vérifie qu'un rendez-vous a suivi ». tiroma_plans porte mutuelle_statut,
-- mutuelle_demande_le, mutuelle_reponse_le, mutuelle_source (dont 'saisie'), mais le modèle d'export devis de Logos_w
-- n'a aucune colonne de mutuelle (modeles_jeux tiroma/logosw/devis) et aucune porte n'écrit ces colonnes : la promesse
-- n'avait aucune source. Ici, l'assistante ou le titulaire note la demande et la réponse de la mutuelle.
--
-- CE QUE ÇA POSE : public.tiroma_noter_mutuelle(p_plan uuid, p_statut text, p_le date = aujourd'hui, p_motif text = null)
--   → jsonb {plan, mutuelle_statut, mutuelle_demande_le, mutuelle_reponse_le}. Statuts : non_requise | a_demander |
--   demandee | accord | refus. Profils : titulaire, assistante, collaborateur (sur ses plans). Journal
--   « tiroma.mutuelle_notee ». Idempotent (create or replace, grant).

create or replace function private.tiroma_noter_mutuelle(p_plan uuid, p_statut text, p_le date default null, p_motif text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  p public.tiroma_plans;
  rg record;
  v_le date;
begin
  if p_statut is null or p_statut not in ('non_requise', 'a_demander', 'demandee', 'accord', 'refus') then
    raise exception 'Le statut de la mutuelle vaut non_requise, a_demander, demandee, accord ou refus.' using errcode = '22023';
  end if;
  select * into p from public.tiroma_plans where id = p_plan for update;
  if not found then
    raise exception 'Plan introuvable.' using errcode = 'P0002';
  end if;
  rg := private.tiroma_exiger_regard(p.client_id, p.entite_id, array['titulaire', 'collaborateur', 'assistante']);
  if not rg.voit_tous and (rg.praticien_id is null or p.praticien_id is distinct from rg.praticien_id) then
    raise exception 'Ce plan n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  v_le := coalesce(p_le, (now() at time zone coalesce((select e.fuseau from public.entites e where e.id = p.entite_id), 'UTC'))::date);
  if v_le > current_date + 1 then
    raise exception 'La date notée n''est pas dans le futur.' using errcode = '22023';
  end if;
  update public.tiroma_plans
     set mutuelle_statut = p_statut,
         mutuelle_demande_le = case when p_statut = 'demandee' then v_le when p_statut in ('accord', 'refus') then coalesce(mutuelle_demande_le, v_le) else mutuelle_demande_le end,
         mutuelle_reponse_le = case when p_statut in ('accord', 'refus') then v_le else null end,
         mutuelle_source = 'saisie',
         vu_dernier_le = vu_dernier_le
   where id = p.id;
  perform private.journaliser_module(p.client_id, 'tiroma', 'tiroma.mutuelle_notee', 'tiroma_plans', p.id::text,
    jsonb_strip_nulls(jsonb_build_object('statut', p_statut, 'le', v_le, 'devis', p.devis_numero, 'motif', left(p_motif, 200))), p.entite_id);
  return (select jsonb_build_object('plan', x.id, 'mutuelle_statut', x.mutuelle_statut, 'mutuelle_demande_le', x.mutuelle_demande_le,
                                    'mutuelle_reponse_le', x.mutuelle_reponse_le)
          from public.tiroma_plans x where x.id = p.id);
end $function$;

create or replace function public.tiroma_noter_mutuelle(p_plan uuid, p_statut text, p_le date default null, p_motif text default null)
 returns jsonb
 language sql
 set search_path to ''
as $function$
  select private.tiroma_noter_mutuelle(p_plan, p_statut, p_le, p_motif)
$function$;

revoke all on function public.tiroma_noter_mutuelle(uuid, text, date, text) from public, anon;
grant execute on function public.tiroma_noter_mutuelle(uuid, text, date, text) to authenticated, service_role;
grant execute on function private.tiroma_noter_mutuelle(uuid, text, date, text) to authenticated, service_role;
