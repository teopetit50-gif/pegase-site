-- b3_09 — La liste d'attente commune : l'assistante inscrit un patient, Tiroma le propose au premier créneau libéré.
--
-- CE QUE ÇA CORRIGE : la page /secteurs/dentaire promet « Une liste d'attente commune » (cabinet de groupe) et « Le
-- créneau va d'abord à un plan accepté, puis à la liste d'attente ». tiroma_liste_attente admet source = 'tiroma'
-- (une inscription faite dans Tiroma, pas dans le logiciel) mais aucune porte n'y écrit : seule la liste du logiciel
-- entrait, par le relevé. Ici, l'équipe inscrit et retire un patient depuis l'espace ; private.tiroma_ligne_attente
-- (le relevé) continue de faire primer l'entrée du logiciel.
--
-- CE QUE ÇA POSE :
--   public.tiroma_ajouter_attente(p_client, p_entite, p_patient uuid, p_famille text = null, p_duree_min int = null,
--     p_praticien uuid = null, p_preavis_minutes int = null, p_disponibilites jsonb = null, p_gene bool = false) → uuid
--   public.tiroma_retirer_attente(p_attente uuid, p_motif text) → void   (motifs : rdv_obtenu | date_passee | annule | doublon | autre)
-- Profils : titulaire, assistante, collaborateur (sur ses patients). Journal « tiroma.attente_ajoutee » /
-- « tiroma.attente_retiree ». Idempotent (create or replace, grant).

create or replace function private.tiroma_ajouter_attente(p_client uuid, p_entite uuid, p_patient uuid, p_famille text default null,
  p_duree_min integer default null, p_praticien uuid default null, p_preavis_minutes integer default null,
  p_disponibilites jsonb default null, p_gene boolean default false)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  rg record;
  pa public.tiroma_patients;
  v_id uuid;
begin
  rg := private.tiroma_exiger_regard(p_client, p_entite, array['titulaire', 'collaborateur', 'assistante']);
  select * into pa from public.tiroma_patients where id = p_patient and client_id = p_client and entite_id = p_entite;
  if not found then
    raise exception 'Patient introuvable dans ce cabinet.' using errcode = 'P0002';
  end if;
  if not rg.voit_tous and (rg.praticien_id is null or pa.praticien_habituel_id is distinct from rg.praticien_id) then
    raise exception 'Ce patient n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  if pa.ne_pas_contacter then
    raise exception 'Ce patient a demandé à ne pas être contacté : il ne s''inscrit pas en liste d''attente.' using errcode = '22023';
  end if;
  if p_famille is not null and p_famille not in ('controle', 'detartrage', 'soin_conservateur', 'endodontie', 'prothese_preparation', 'prothese_empreinte',
       'prothese_pose', 'implant_chirurgie', 'implant_prothese', 'chirurgie', 'parodontie', 'orthodontie_pose', 'orthodontie_controle',
       'urgence', 'premiere_consultation', 'personnel', 'autre') then
    raise exception 'Famille de soin inconnue : %.', p_famille using errcode = '22023';
  end if;
  if p_duree_min is not null and p_duree_min not between 5 and 600 then
    raise exception 'La durée va de 5 à 600 minutes.' using errcode = '22023';
  end if;
  if p_praticien is not null and not exists (select 1 from public.tiroma_praticiens x where x.id = p_praticien and x.entite_id = p_entite) then
    raise exception 'Praticien introuvable dans ce cabinet.' using errcode = 'P0002';
  end if;
  if p_disponibilites is not null and jsonb_typeof(p_disponibilites) <> 'array' then
    raise exception 'Les disponibilités forment un tableau ([{jours: [1..7], demi_journee: matin|apres_midi}]).' using errcode = '22023';
  end if;
  -- Une seule entrée ouverte par patient.
  select l.id into v_id from public.tiroma_liste_attente l
  where l.client_id = p_client and l.entite_id = p_entite and l.patient_id = p_patient and l.retire_le is null;
  if v_id is not null then
    update public.tiroma_liste_attente
       set famille = coalesce(p_famille, famille), duree_min = coalesce(p_duree_min, duree_min), praticien_id = coalesce(p_praticien, praticien_id),
           preavis_minutes = coalesce(p_preavis_minutes, preavis_minutes), disponibilites = coalesce(p_disponibilites, disponibilites),
           drapeau_gene = drapeau_gene or coalesce(p_gene, false), maj_le = now()
     where id = v_id;
    return v_id;
  end if;
  insert into public.tiroma_liste_attente (client_id, entite_id, patient_id, famille, duree_min, praticien_id, preavis_minutes,
                                           disponibilites, drapeau_gene, source, ajoute_le, ajoute_par)
  values (p_client, p_entite, p_patient, p_famille, p_duree_min, p_praticien, p_preavis_minutes, p_disponibilites,
          coalesce(p_gene, false), 'tiroma', now(), (select auth.uid()))
  returning id into v_id;
  perform private.journaliser_module(p_client, 'tiroma', 'tiroma.attente_ajoutee', 'tiroma_liste_attente', v_id::text,
    jsonb_strip_nulls(jsonb_build_object('patient', p_patient, 'famille', p_famille, 'duree_min', p_duree_min, 'gene', p_gene)), p_entite);
  return v_id;
end $function$;

create or replace function private.tiroma_retirer_attente(p_attente uuid, p_motif text default 'autre')
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  l public.tiroma_liste_attente;
  rg record;
  pa public.tiroma_patients;
begin
  if p_motif is null or p_motif not in ('rdv_obtenu', 'date_passee', 'annule', 'doublon', 'autre') then
    raise exception 'Le motif vaut rdv_obtenu, date_passee, annule, doublon ou autre.' using errcode = '22023';
  end if;
  select * into l from public.tiroma_liste_attente where id = p_attente for update;
  if not found then
    raise exception 'Inscription introuvable.' using errcode = 'P0002';
  end if;
  rg := private.tiroma_exiger_regard(l.client_id, l.entite_id, array['titulaire', 'collaborateur', 'assistante']);
  select * into pa from public.tiroma_patients where id = l.patient_id;
  if not rg.voit_tous and (rg.praticien_id is null or pa.praticien_habituel_id is distinct from rg.praticien_id) then
    raise exception 'Ce patient n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  if l.retire_le is not null then
    return;
  end if;
  update public.tiroma_liste_attente set retire_le = now(), motif_retrait = p_motif, maj_le = now() where id = l.id;
  perform private.journaliser_module(l.client_id, 'tiroma', 'tiroma.attente_retiree', 'tiroma_liste_attente', l.id::text,
    jsonb_build_object('patient', l.patient_id, 'motif', p_motif), l.entite_id);
end $function$;

create or replace function public.tiroma_ajouter_attente(p_client uuid, p_entite uuid, p_patient uuid, p_famille text default null,
  p_duree_min integer default null, p_praticien uuid default null, p_preavis_minutes integer default null,
  p_disponibilites jsonb default null, p_gene boolean default false)
 returns uuid
 language sql
 set search_path to ''
as $function$
  select private.tiroma_ajouter_attente(p_client, p_entite, p_patient, p_famille, p_duree_min, p_praticien, p_preavis_minutes, p_disponibilites, p_gene)
$function$;

create or replace function public.tiroma_retirer_attente(p_attente uuid, p_motif text default 'autre')
 returns void
 language sql
 set search_path to ''
as $function$
  select private.tiroma_retirer_attente(p_attente, p_motif)
$function$;

revoke all on function public.tiroma_ajouter_attente(uuid, uuid, uuid, text, integer, uuid, integer, jsonb, boolean) from public, anon;
revoke all on function public.tiroma_retirer_attente(uuid, text) from public, anon;
grant execute on function public.tiroma_ajouter_attente(uuid, uuid, uuid, text, integer, uuid, integer, jsonb, boolean) to authenticated, service_role;
grant execute on function public.tiroma_retirer_attente(uuid, text) to authenticated, service_role;
grant execute on function private.tiroma_ajouter_attente(uuid, uuid, uuid, text, integer, uuid, integer, jsonb, boolean) to authenticated, service_role;
grant execute on function private.tiroma_retirer_attente(uuid, text) to authenticated, service_role;
