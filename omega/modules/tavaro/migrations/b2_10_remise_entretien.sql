-- b2_10 — Remise en location et entretien (audit des promesses, § 2 Tavaro, point 3 ; modules 02 et 03 ; session B2,
-- 06/10/2026). La promesse (components/secteurs/location/textes.ts) : « Dès qu'un véhicule rentre, Tavaro crée la tâche
-- d'inspection, de nettoyage et de recharge avec l'heure du prochain départ. L'entretien est placé dans les creux du
-- planning, hors des réservations, si bien que l'atelier n'immobilise pas un véhicule attendu. Un véhicule parti chez le
-- carrossier garde sa date de retour, et un rappel du constructeur le retire des réservations. » ; « Le responsable est
-- alerté dès que la remise en location risque de manquer le prochain départ. » ; « Chaque anomalie de retour remonte à
-- une personne nommée. » ; « Tavaro place les révisions dans les creux du planning, hors des réservations, et prévient
-- l'atelier à l'avance. »
--
-- CE QUE ÇA POSE (rien n'est effacé ni remplacé dans le socle ; deux déclencheurs AJOUTÉS sur loc_contrats et
-- loc_propositions, qui n'empêchent jamais l'écriture qui les réveille) :
--   · loc_reglages : remise_duree_min (90), remise_marge_min (30), entretien_alerte_jours (30), entretien_alerte_km (1000) ;
--   · public.loc_immobilisations : les périodes où un véhicule n'est pas louable (préparation, entretien, carrosserie,
--     contrôle technique, sinistre, attente de pièces, rappel du constructeur, autre), avec leur date de retour prévue ;
--     lue aussi par B3 (véhicules inactifs, plan de flotte) ;
--   · public.loc_remises : la tâche de remise en location créée au retour (contrat rendu par l'export, ou retour saisi
--     à l'agence) — inspection, nettoyage, carburant ou recharge — avec l'heure du prochain départ (réservation ou
--     contrat du véhicule, sinon réservation non affectée de la même catégorie dans l'agence) et l'heure limite ;
--   · public.loc_anomalies_retour : chaque anomalie de retour a une personne nommée, qui est prévenue ;
--   · public.loc_entretiens : les révisions, contrôles et pneus à faire, leurs créneaux proposés dans les creux du
--     planning (hors contrats, réservations et immobilisations), la planification refusée sur une réservation, l'atelier
--     prévenu par le chemin de tout envoi ;
--   · private.loc_surveiller_parc + cron tavaro-parc (toutes les 15 minutes) : remise qui risque de manquer le départ,
--     immobilisation qui dépasse sa date, immobilisation qui chevauche une réservation affectée (rappel, carrosserie :
--     la réservation est à réaffecter), entretien dû non planifié.

alter table public.loc_reglages add column if not exists remise_duree_min smallint not null default 90;
alter table public.loc_reglages add column if not exists remise_marge_min smallint not null default 30;
alter table public.loc_reglages add column if not exists entretien_alerte_jours smallint not null default 30;
alter table public.loc_reglages add column if not exists entretien_alerte_km integer not null default 1000;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'loc_reglages_remise_check') then
    alter table public.loc_reglages add constraint loc_reglages_remise_check
      check (remise_duree_min between 10 and 1440 and remise_marge_min between 0 and 720
             and entretien_alerte_jours between 1 and 180 and entretien_alerte_km between 0 and 20000);
  end if;
end $$;
comment on column public.loc_reglages.remise_duree_min is 'b2_10 : durée d''une remise en location complète (inspection, nettoyage, énergie), en minutes';
comment on column public.loc_reglages.remise_marge_min is 'b2_10 : marge avant le prochain départ : la remise doit être prête à départ - marge';

-- ── Les immobilisations ──────────────────────────────────────────────────────────────────
create table if not exists public.loc_immobilisations (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  entite_id uuid,
  vehicule_id uuid not null,
  motif text not null,
  debut_le timestamp with time zone not null default now(),
  fin_prevue_le timestamp with time zone,
  fin_le timestamp with time zone,
  contrat_id uuid,
  prestataire text,
  cout_eur numeric(10,2),
  notes text,
  cree_par uuid,
  cree_le timestamp with time zone not null default now(),
  maj_le timestamp with time zone not null default now(),
  constraint loc_immobilisations_pkey primary key (id),
  constraint loc_immobilisations_client_id_id_key unique (client_id, id),
  constraint loc_immobilisations_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_immobilisations_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id),
  constraint loc_immobilisations_vehicule_fkey foreign key (client_id, vehicule_id) references public.loc_vehicules(client_id, id),
  constraint loc_immobilisations_contrat_fkey foreign key (client_id, contrat_id) references public.loc_contrats(client_id, id),
  constraint loc_immobilisations_motif_check check (motif in ('preparation', 'entretien', 'carrosserie', 'controle_technique', 'sinistre', 'attente_pieces', 'rappel_constructeur', 'autre')),
  constraint loc_immobilisations_dates check ((fin_prevue_le is null or fin_prevue_le > debut_le) and (fin_le is null or fin_le >= debut_le)),
  constraint loc_immobilisations_retour_prevu check (motif in ('preparation', 'sinistre', 'autre') or fin_prevue_le is not null),
  constraint loc_immobilisations_textes_check check (char_length(prestataire) <= 200 and char_length(notes) <= 1000),
  constraint loc_immobilisations_cout_check check (cout_eur >= 0 and cout_eur <= 1000000)
);
comment on table public.loc_immobilisations is 'b2_10 : périodes où un véhicule n''est pas louable, avec leur date de retour prévue (fin_le null : encore immobilisé)';
create index if not exists loc_immobilisations_en_cours on public.loc_immobilisations (client_id, vehicule_id) where fin_le is null;

-- ── Les remises en location ──────────────────────────────────────────────────────────────
create table if not exists public.loc_remises (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  entite_id uuid not null,
  vehicule_id uuid not null,
  contrat_id uuid not null,
  retour_le timestamp with time zone not null,
  prochain_depart_le timestamp with time zone,
  prochain_depart_source text,
  prochain_depart_ref text,
  limite_le timestamp with time zone,
  responsable uuid,
  statut text not null default 'a_faire',
  inspection_le timestamp with time zone,
  inspection_par uuid,
  nettoyage_le timestamp with time zone,
  nettoyage_par uuid,
  energie_le timestamp with time zone,
  energie_par uuid,
  prete_le timestamp with time zone,
  immobilisation_id uuid,
  alerte text,
  annulee_motif text,
  cree_le timestamp with time zone not null default now(),
  maj_le timestamp with time zone not null default now(),
  constraint loc_remises_pkey primary key (id),
  constraint loc_remises_client_id_id_key unique (client_id, id),
  constraint loc_remises_une_par_contrat unique (client_id, contrat_id),
  constraint loc_remises_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_remises_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id),
  constraint loc_remises_vehicule_fkey foreign key (client_id, vehicule_id) references public.loc_vehicules(client_id, id),
  constraint loc_remises_contrat_fkey foreign key (client_id, contrat_id) references public.loc_contrats(client_id, id),
  constraint loc_remises_immobilisation_fkey foreign key (client_id, immobilisation_id) references public.loc_immobilisations(client_id, id),
  constraint loc_remises_statut_check check (statut in ('a_faire', 'en_cours', 'prete', 'annulee')),
  constraint loc_remises_source_check check (prochain_depart_source in ('reservation', 'contrat', 'categorie')),
  constraint loc_remises_alerte_check check (alerte in ('risque', 'retard')),
  constraint loc_remises_prete check (statut <> 'prete' or (prete_le is not null and inspection_le is not null and nettoyage_le is not null and energie_le is not null)),
  constraint loc_remises_annulee check ((statut = 'annulee') = (annulee_motif is not null)),
  constraint loc_remises_textes_check check (char_length(prochain_depart_ref) <= 120 and char_length(annulee_motif) <= 500)
);
comment on table public.loc_remises is 'b2_10 : la remise en location créée au retour d''un véhicule, avec l''heure du prochain départ';
create index if not exists loc_remises_ouvertes on public.loc_remises (client_id, limite_le) where statut in ('a_faire', 'en_cours');

-- ── Les anomalies de retour ──────────────────────────────────────────────────────────────
create table if not exists public.loc_anomalies_retour (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  entite_id uuid not null,
  remise_id uuid not null,
  vehicule_id uuid not null,
  type text not null,
  description text not null,
  responsable uuid not null,
  statut text not null default 'ouverte',
  signalee_par uuid,
  signalee_le timestamp with time zone not null default now(),
  traitee_le timestamp with time zone,
  traitee_par uuid,
  note text,
  maj_le timestamp with time zone not null default now(),
  constraint loc_anomalies_retour_pkey primary key (id),
  constraint loc_anomalies_client_id_id_key unique (client_id, id),
  constraint loc_anomalies_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_anomalies_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id),
  constraint loc_anomalies_remise_fkey foreign key (client_id, remise_id) references public.loc_remises(client_id, id),
  constraint loc_anomalies_vehicule_fkey foreign key (client_id, vehicule_id) references public.loc_vehicules(client_id, id),
  constraint loc_anomalies_type_check check (type in ('voyant', 'dommage', 'proprete', 'objet_oublie', 'pneu', 'cle_papiers', 'equipement', 'autre')),
  constraint loc_anomalies_statut_check check (statut in ('ouverte', 'traitee')),
  constraint loc_anomalies_traitee check ((statut = 'traitee') = (traitee_le is not null)),
  constraint loc_anomalies_textes_check check (char_length(description) between 3 and 1000 and char_length(note) <= 1000)
);
comment on table public.loc_anomalies_retour is 'b2_10 : anomalies constatées à la remise en location, chacune confiée à une personne nommée';

-- ── Les entretiens ───────────────────────────────────────────────────────────────────────
create table if not exists public.loc_entretiens (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  entite_id uuid,
  vehicule_id uuid not null,
  nature text not null,
  libelle text,
  echeance_le date,
  echeance_km integer,
  duree_h smallint not null default 4,
  statut text not null default 'a_planifier',
  debut_le timestamp with time zone,
  fin_le timestamp with time zone,
  atelier_nom text,
  atelier_adresse text,
  envoi_id uuid,
  immobilisation_id uuid,
  fait_le timestamp with time zone,
  km_fait integer,
  cout_eur numeric(10,2),
  notes text,
  cree_par uuid,
  cree_le timestamp with time zone not null default now(),
  maj_le timestamp with time zone not null default now(),
  constraint loc_entretiens_pkey primary key (id),
  constraint loc_entretiens_client_id_id_key unique (client_id, id),
  constraint loc_entretiens_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_entretiens_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id),
  constraint loc_entretiens_vehicule_fkey foreign key (client_id, vehicule_id) references public.loc_vehicules(client_id, id),
  constraint loc_entretiens_immobilisation_fkey foreign key (client_id, immobilisation_id) references public.loc_immobilisations(client_id, id),
  constraint loc_entretiens_nature_check check (nature in ('revision', 'vidange', 'controle_technique', 'pneus', 'freins', 'climatisation', 'autre')),
  constraint loc_entretiens_statut_check check (statut in ('a_planifier', 'planifie', 'fait', 'annule')),
  constraint loc_entretiens_echeance check (echeance_le is not null or echeance_km is not null),
  constraint loc_entretiens_km_check check (echeance_km between 0 and 2000000 and km_fait between 0 and 2000000),
  constraint loc_entretiens_duree_check check (duree_h between 1 and 720),
  constraint loc_entretiens_planifie check (statut not in ('planifie', 'fait') or (debut_le is not null and fin_le is not null and fin_le > debut_le)),
  constraint loc_entretiens_fait check ((statut = 'fait') = (fait_le is not null)),
  constraint loc_entretiens_adresse_check check (atelier_adresse ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(atelier_adresse) <= 320),
  constraint loc_entretiens_textes_check check (char_length(libelle) <= 200 and char_length(atelier_nom) <= 200 and char_length(notes) <= 1000),
  constraint loc_entretiens_cout_check check (cout_eur >= 0 and cout_eur <= 1000000)
);
comment on table public.loc_entretiens is 'b2_10 : révisions, contrôles et pneus à faire, placés dans les creux du planning, hors des réservations';
create index if not exists loc_entretiens_a_faire on public.loc_entretiens (client_id, echeance_le) where statut in ('a_planifier', 'planifie');

-- ── Lecture : par agence ; sans agence, la direction et les valideurs ─────────────────────
do $$
declare t text;
begin
  foreach t in array array['loc_immobilisations', 'loc_remises', 'loc_anomalies_retour', 'loc_entretiens'] loop
    execute format('alter table public.%I enable row level security', t);
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'on voit le parc de son agence') then
      execute format($p$create policy "on voit le parc de son agence" on public.%I for select to authenticated
        using (client_id in (select private.mes_clients())
               and (case when entite_id is null then private.a_un_role(client_id, array['gerant', 'admin', 'valideur'])
                         else private.voit_entite(client_id, entite_id) end))$p$, t);
    end if;
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
    if not exists (select 1 from pg_trigger where tgname = t || '_toucher' and tgrelid = ('public.' || t)::regclass) then
      execute format('create trigger %I before update on public.%I for each row execute function private.loc_toucher()', t || '_toucher', t);
    end if;
    if not exists (select 1 from pg_trigger where tgname = t || '_tracer' and tgrelid = ('public.' || t)::regclass) then
      execute format('create trigger %I after insert or update on public.%I for each row execute function private.tracer(%L)', t || '_tracer', t, 'maj_le');
    end if;
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ── Le planning d'un véhicule ────────────────────────────────────────────────────────────

-- Une heure telle que l'agence la lit (les messages ne parlent pas en UTC).
CREATE OR REPLACE FUNCTION private.loc_heure_locale(p_quand timestamp with time zone, p_client uuid, p_entite uuid, p_format text DEFAULT 'DD/MM à HH24:MI')
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select to_char(p_quand at time zone coalesce((select e.fuseau from public.entites e where e.client_id = p_client and e.id = p_entite), 'Europe/Paris'), p_format)
$function$;

-- Les périodes où le véhicule est pris : contrats non annulés, réservations affectées (option, confirmée),
-- immobilisations en cours ou à venir. p_sauf : une immobilisation à ignorer (celle qu'on replanifie).
CREATE OR REPLACE FUNCTION private.loc_occupations(p_client uuid, p_vehicule uuid, p_sauf uuid DEFAULT NULL::uuid)
 RETURNS TABLE(debut timestamp with time zone, fin timestamp with time zone, quoi text, ref text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select c.depart_le, coalesce(c.retour_reel_le, c.retour_prevu_le), 'contrat', c.numero
  from public.loc_contrats c
  where c.client_id = p_client and c.vehicule_id = p_vehicule and c.statut <> 'annule' and c.disparu_le is null
  union all
  select r.depart_prevu_le, r.retour_prevu_le, 'reservation', r.ref_source
  from public.loc_reservations r
  where r.client_id = p_client and r.vehicule_id = p_vehicule and r.statut in ('option', 'confirmee') and r.disparue_le is null
  union all
  -- une préparation sans date de fin compte douze heures (elle se finit dans la journée) ; le reste, jusqu'à son retour
  select i.debut_le, coalesce(i.fin_le, i.fin_prevue_le,
                              case when i.motif = 'preparation' then greatest(now(), i.debut_le) + interval '12 hours' else 'infinity'::timestamptz end),
         'immobilisation', i.motif
  from public.loc_immobilisations i
  where i.client_id = p_client and i.vehicule_id = p_vehicule and (i.fin_le is null or i.fin_le > now()) and i.id is distinct from p_sauf
$function$;

-- Le prochain départ après un retour : le véhicule lui-même (contrat, réservation affectée), sinon la première
-- réservation non affectée de sa catégorie dans l'agence.
CREATE OR REPLACE FUNCTION private.loc_prochain_depart(p_client uuid, p_vehicule uuid, p_entite uuid, p_apres timestamp with time zone,
                                                      OUT depart_le timestamp with time zone, OUT source text, OUT ref text)
 RETURNS record
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_categorie uuid;
begin
  select o.debut, o.quoi, o.ref into depart_le, source, ref
  from private.loc_occupations(p_client, p_vehicule) o
  where o.quoi in ('contrat', 'reservation') and o.debut > p_apres
  order by o.debut limit 1;
  if depart_le is not null then
    return;
  end if;
  select v.categorie_id into v_categorie from public.loc_vehicules v where v.client_id = p_client and v.id = p_vehicule;
  if v_categorie is null then
    return;
  end if;
  select r.depart_prevu_le, 'categorie', r.ref_source into depart_le, source, ref
  from public.loc_reservations r
  where r.client_id = p_client and r.vehicule_id is null and r.categorie_id = v_categorie and r.entite_id = p_entite
    and r.statut in ('option', 'confirmee') and r.disparue_le is null and r.depart_prevu_le > p_apres
  order by r.depart_prevu_le limit 1;
end $function$;

-- ── La remise en location ────────────────────────────────────────────────────────────────

-- Créée une fois par contrat rendu. Rend son identifiant (ou null : pas de véhicule, contrat annulé ou ancien).
CREATE OR REPLACE FUNCTION private.loc_creer_remise(p_client uuid, p_contrat uuid, p_retour timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.loc_contrats;
  v_id uuid;
  v_entite uuid;
  v_depart timestamptz;
  v_source text;
  v_ref text;
  v_marge integer;
  v_immo uuid;
  v_immat text;
begin
  select x.id into v_id from public.loc_remises x where x.client_id = p_client and x.contrat_id = p_contrat;
  if v_id is not null then
    return v_id;
  end if;
  select * into c from public.loc_contrats where client_id = p_client and id = p_contrat;
  if not found or c.vehicule_id is null or c.statut = 'annule' or p_retour is null or p_retour < now() - interval '48 hours' then
    return null;
  end if;
  v_entite := coalesce(c.entite_retour_id, c.entite_id);
  select d.depart_le, d.source, d.ref into v_depart, v_source, v_ref from private.loc_prochain_depart(p_client, c.vehicule_id, v_entite, p_retour) d;
  select coalesce(g.remise_marge_min, 30) into v_marge from public.loc_reglages g where g.client_id = p_client;
  insert into public.loc_immobilisations (client_id, entite_id, vehicule_id, motif, debut_le, contrat_id, notes)
  values (p_client, v_entite, c.vehicule_id, 'preparation', p_retour, c.id, 'Remise en location après le contrat ' || c.numero)
  returning id into v_immo;
  insert into public.loc_remises (client_id, entite_id, vehicule_id, contrat_id, retour_le, prochain_depart_le, prochain_depart_source,
                                  prochain_depart_ref, limite_le, immobilisation_id)
  values (p_client, v_entite, c.vehicule_id, c.id, p_retour, v_depart, v_source, left(v_ref, 120),
          v_depart - make_interval(mins => coalesce(v_marge, 30)), v_immo)
  on conflict on constraint loc_remises_une_par_contrat do nothing
  returning id into v_id;
  if v_id is null then
    -- une autre transaction l'a créée entre-temps : la préparation en double est close aussitôt
    update public.loc_immobilisations set fin_le = debut_le, notes = 'Doublon : remise déjà créée' where id = v_immo;
    select x.id into v_id from public.loc_remises x where x.client_id = p_client and x.contrat_id = p_contrat;
    return v_id;
  end if;
  select v.immatriculation into v_immat from public.loc_vehicules v where v.client_id = p_client and v.id = c.vehicule_id;
  perform private.lever_alerte_module(p_client, 'tavaro', 'info',
    case when v_depart is null then format('%s est rentré (contrat %s) : remise en location à faire — inspection, nettoyage, carburant ou recharge.', v_immat, c.numero)
         else format('%s est rentré (contrat %s) : remise en location à finir avant le %s (prochain départ %s).', v_immat, c.numero,
                     private.loc_heure_locale(v_depart - make_interval(mins => coalesce(v_marge, 30)), p_client, v_entite), coalesce(v_ref, '')) end,
    jsonb_build_object('remise', v_id, 'vehicule', c.vehicule_id, 'contrat', c.numero, 'limite', v_depart - make_interval(mins => coalesce(v_marge, 30))),
    'remise:nouvelle:' || v_id::text, true, null);
  perform private.journaliser_module(p_client, 'tavaro', 'tavaro.remise_creee', 'loc_remises', v_id::text,
    jsonb_build_object('contrat', c.numero, 'vehicule', v_immat, 'prochain_depart', v_depart, 'source', v_source), v_entite);
  return v_id;
end $function$;

-- Le déclencheur du retour : le contrat porte son heure de retour (export du logiciel du loueur).
-- Il ne bloque jamais l'écriture du contrat.
CREATE OR REPLACE FUNCTION private.loc_remise_au_retour()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.retour_reel_le is not null and (tg_op = 'INSERT' or old.retour_reel_le is null) then
    begin
      perform private.loc_creer_remise(new.client_id, new.id, new.retour_reel_le);
    exception when others then
      raise warning 'loc_remise_au_retour %: %', new.id, sqlerrm;
    end;
  end if;
  return null;
end $function$;

-- Le retour saisi à l'agence (une proposition chiffrée porte l'heure de retour).
CREATE OR REPLACE FUNCTION private.loc_remise_au_chiffrage()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_retour timestamptz;
begin
  begin
    v_retour := nullif(new.entrees ->> 'retour_reel_le', '')::timestamptz;
    if v_retour is not null then
      perform private.loc_creer_remise(new.client_id, new.contrat_id, v_retour);
    end if;
  exception when others then
    raise warning 'loc_remise_au_chiffrage %: %', new.id, sqlerrm;
  end;
  return null;
end $function$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'loc_contrats_remise' and tgrelid = 'public.loc_contrats'::regclass) then
    create trigger loc_contrats_remise after insert or update of retour_reel_le on public.loc_contrats
      for each row execute function private.loc_remise_au_retour();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'loc_propositions_remise' and tgrelid = 'public.loc_propositions'::regclass) then
    create trigger loc_propositions_remise after insert on public.loc_propositions
      for each row execute function private.loc_remise_au_chiffrage();
  end if;
end $$;

-- Une remise vue par la personne connectée (périmètre de l'agence, rôle).
CREATE OR REPLACE FUNCTION private.loc_remise_de_l_agence(p_remise uuid, p_roles text[], p_refus text)
 RETURNS public.loc_remises
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  r public.loc_remises;
begin
  if v_uid is null then
    raise exception 'Ce geste se fait par une personne connectée.' using errcode = '42501';
  end if;
  select * into r from public.loc_remises where id = p_remise;
  if not found or not exists (select 1 from public.comptes k where k.user_id = v_uid and k.client_id = r.client_id) then
    raise exception 'Remise introuvable.' using errcode = 'P0002';
  end if;
  if not private.voit_entite(r.client_id, r.entite_id) then
    raise exception 'Cette remise n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  if not private.a_un_role(r.client_id, p_roles) then
    raise exception '%', p_refus using errcode = '42501';
  end if;
  return r;
end $function$;

-- Une étape faite (ou défaite) : inspection, nettoyage, energie (carburant ou recharge). Les trois faites : prête.
CREATE OR REPLACE FUNCTION public.loc_etape_remise(p_remise uuid, p_etape text, p_fait boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r public.loc_remises := private.loc_remise_de_l_agence(p_remise, array['gerant', 'admin', 'valideur', 'collaborateur'], 'La remise en location se fait par l''agence.');
  v_uid uuid := (select auth.uid());
  v_quand timestamptz := case when coalesce(p_fait, true) then now() end;
  v_par uuid := case when coalesce(p_fait, true) then v_uid end;
begin
  if p_etape not in ('inspection', 'nettoyage', 'energie') then
    raise exception 'Étape inconnue : inspection, nettoyage ou energie.' using errcode = '22023';
  end if;
  if r.statut = 'annulee' then
    raise exception 'Cette remise est annulée.' using errcode = '23514';
  end if;
  if r.statut = 'prete' and not coalesce(p_fait, true) then
    raise exception 'Le véhicule est déjà remis en location : rouvrez une anomalie plutôt que de défaire une étape.' using errcode = '23514';
  end if;
  update public.loc_remises
     set inspection_le = case when p_etape = 'inspection' then v_quand else inspection_le end,
         inspection_par = case when p_etape = 'inspection' then v_par else inspection_par end,
         nettoyage_le = case when p_etape = 'nettoyage' then v_quand else nettoyage_le end,
         nettoyage_par = case when p_etape = 'nettoyage' then v_par else nettoyage_par end,
         energie_le = case when p_etape = 'energie' then v_quand else energie_le end,
         energie_par = case when p_etape = 'energie' then v_par else energie_par end
   where id = r.id
  returning * into r;
  if r.statut <> 'prete' and r.inspection_le is not null and r.nettoyage_le is not null and r.energie_le is not null then
    update public.loc_remises set statut = 'prete', prete_le = now() where id = r.id returning * into r;
    update public.loc_immobilisations set fin_le = now() where id = r.immobilisation_id and fin_le is null;
    perform private.journaliser_module(r.client_id, 'tavaro', 'tavaro.remise_prete', 'loc_remises', r.id::text,
      jsonb_build_object('duree_min', round(extract(epoch from (r.prete_le - r.retour_le)) / 60), 'limite', r.limite_le,
                         'a_temps', r.limite_le is null or r.prete_le <= r.limite_le, 'par', v_uid), r.entite_id);
  elsif r.statut = 'a_faire' and (r.inspection_le is not null or r.nettoyage_le is not null or r.energie_le is not null) then
    update public.loc_remises set statut = 'en_cours' where id = r.id returning * into r;
  end if;
  return jsonb_build_object('remise', r.id, 'statut', r.statut, 'inspection', r.inspection_le is not null, 'nettoyage', r.nettoyage_le is not null,
                            'energie', r.energie_le is not null, 'prete_le', r.prete_le);
end $function$;

-- Le responsable de la remise (une personne de l'organisation) ; null : personne en particulier.
CREATE OR REPLACE FUNCTION public.loc_assigner_remise(p_remise uuid, p_responsable uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r public.loc_remises := private.loc_remise_de_l_agence(p_remise, array['gerant', 'admin', 'valideur', 'collaborateur'], 'La remise en location se confie par l''agence.');
begin
  if p_responsable is not null and not exists (select 1 from public.comptes k where k.user_id = p_responsable and k.client_id = r.client_id) then
    raise exception 'Cette personne n''est pas de votre organisation.' using errcode = '22023';
  end if;
  update public.loc_remises set responsable = p_responsable, alerte = null where id = r.id;
  perform private.journaliser_module(r.client_id, 'tavaro', 'tavaro.remise_confiee', 'loc_remises', r.id::text,
    jsonb_build_object('responsable', p_responsable, 'par', (select auth.uid())), r.entite_id);
  return jsonb_build_object('remise', r.id, 'responsable', p_responsable);
end $function$;

-- Annuler une remise (véhicule sorti de flotte, contrat rendu par erreur) : direction ou valideur.
CREATE OR REPLACE FUNCTION public.loc_annuler_remise(p_remise uuid, p_motif text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r public.loc_remises := private.loc_remise_de_l_agence(p_remise, array['gerant', 'admin', 'valideur'], 'Annuler une remise en location se fait par la direction ou un valideur.');
begin
  if char_length(btrim(coalesce(p_motif, ''))) < 5 then
    raise exception 'Le motif dit pourquoi (cinq caractères au moins).' using errcode = '22023';
  end if;
  if r.statut in ('prete', 'annulee') then
    raise exception 'Cette remise est close (%).', r.statut using errcode = '23514';
  end if;
  update public.loc_remises set statut = 'annulee', annulee_motif = left(btrim(p_motif), 500) where id = r.id;
  update public.loc_immobilisations set fin_le = now() where id = r.immobilisation_id and fin_le is null;
  perform private.journaliser_module(r.client_id, 'tavaro', 'tavaro.remise_annulee', 'loc_remises', r.id::text,
    jsonb_build_object('motif', left(btrim(p_motif), 500), 'par', (select auth.uid())), r.entite_id);
  return jsonb_build_object('remise', r.id, 'statut', 'annulee');
end $function$;

-- Une anomalie de retour, confiée à une personne nommée, qui est prévenue.
CREATE OR REPLACE FUNCTION public.loc_signaler_anomalie(p_remise uuid, p_type text, p_description text, p_responsable uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r public.loc_remises := private.loc_remise_de_l_agence(p_remise, array['gerant', 'admin', 'valideur', 'collaborateur'], 'Une anomalie se signale par l''agence.');
  v_id uuid;
  v_immat text;
begin
  if p_type not in ('voyant', 'dommage', 'proprete', 'objet_oublie', 'pneu', 'cle_papiers', 'equipement', 'autre') then
    raise exception 'Type d''anomalie inconnu.' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_description, ''))) < 3 then
    raise exception 'Décrivez l''anomalie.' using errcode = '22023';
  end if;
  if p_responsable is null then
    raise exception 'Chaque anomalie est confiée à une personne nommée.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.comptes k where k.user_id = p_responsable and k.client_id = r.client_id) then
    raise exception 'Cette personne n''est pas de votre organisation.' using errcode = '22023';
  end if;
  insert into public.loc_anomalies_retour (client_id, entite_id, remise_id, vehicule_id, type, description, responsable, signalee_par)
  values (r.client_id, r.entite_id, r.id, r.vehicule_id, p_type, left(btrim(p_description), 1000), p_responsable, (select auth.uid()))
  returning id into v_id;
  select v.immatriculation into v_immat from public.loc_vehicules v where v.client_id = r.client_id and v.id = r.vehicule_id;
  perform private.lever_alerte_module(r.client_id, 'tavaro', 'attention',
    format('Anomalie au retour de %s, confiée à vous : %s', v_immat, left(btrim(p_description), 200)),
    jsonb_build_object('anomalie', v_id, 'remise', r.id, 'type', p_type), 'anomalie:' || v_id::text, true, p_responsable);
  perform private.journaliser_module(r.client_id, 'tavaro', 'tavaro.anomalie_signalee', 'loc_anomalies_retour', v_id::text,
    jsonb_build_object('remise', r.id, 'type', p_type, 'responsable', p_responsable), r.entite_id);
  return jsonb_build_object('anomalie', v_id, 'responsable', p_responsable);
end $function$;

-- L'anomalie traitée : par la personne qui en a la charge, ou la direction.
CREATE OR REPLACE FUNCTION public.loc_traiter_anomalie(p_anomalie uuid, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  a public.loc_anomalies_retour;
begin
  if v_uid is null then
    raise exception 'Ce geste se fait par une personne connectée.' using errcode = '42501';
  end if;
  select * into a from public.loc_anomalies_retour where id = p_anomalie for update;
  if not found or not exists (select 1 from public.comptes k where k.user_id = v_uid and k.client_id = a.client_id) or not private.voit_entite(a.client_id, a.entite_id) then
    raise exception 'Anomalie introuvable.' using errcode = 'P0002';
  end if;
  if a.responsable <> v_uid and not private.a_un_role(a.client_id, array['gerant', 'admin', 'valideur']) then
    raise exception 'Cette anomalie est confiée à une autre personne : elle, ou la direction, la clôt.' using errcode = '42501';
  end if;
  if a.statut = 'traitee' then
    raise exception 'Cette anomalie est déjà traitée.' using errcode = '23514';
  end if;
  update public.loc_anomalies_retour set statut = 'traitee', traitee_le = now(), traitee_par = v_uid, note = left(nullif(btrim(p_note), ''), 1000)
   where id = a.id;
  perform private.journaliser_module(a.client_id, 'tavaro', 'tavaro.anomalie_traitee', 'loc_anomalies_retour', a.id::text,
    jsonb_build_object('par', v_uid), a.entite_id);
  return jsonb_build_object('anomalie', a.id, 'statut', 'traitee');
end $function$;

-- ── Les immobilisations à la main (carrosserie, rappel, sinistre…) ───────────────────────

-- p_valeurs : {motif, fin_prevue_le?, prestataire?, cout_eur?, notes?, debut_le?}
CREATE OR REPLACE FUNCTION public.loc_immobiliser(p_vehicule uuid, p_valeurs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'Une immobilisation se déclare par l''agence.');
  v public.loc_vehicules;
  v_motif text := p_valeurs ->> 'motif';
  v_debut timestamptz;
  v_fin timestamptz;
  v_id uuid;
  v_conflits jsonb;
begin
  select * into v from public.loc_vehicules where client_id = v_client and id = p_vehicule;
  if not found then
    raise exception 'Véhicule introuvable.' using errcode = 'P0002';
  end if;
  if v.entite_id is not null and not private.voit_entite(v_client, v.entite_id) then
    raise exception 'Ce véhicule n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  if v_motif is null or v_motif not in ('entretien', 'carrosserie', 'controle_technique', 'sinistre', 'attente_pieces', 'rappel_constructeur', 'autre') then
    raise exception 'Motif inconnu.' using errcode = '22023';
  end if;
  begin
    v_debut := coalesce(nullif(p_valeurs ->> 'debut_le', '')::timestamptz, now());
    v_fin := nullif(p_valeurs ->> 'fin_prevue_le', '')::timestamptz;
  exception when others then
    raise exception 'Date illisible.' using errcode = '22007';
  end;
  if v_fin is null and v_motif not in ('sinistre', 'autre') then
    raise exception 'Un véhicule immobilisé pour ce motif garde sa date de retour prévue : saisissez-la.' using errcode = '22023';
  end if;
  if v_fin is not null and v_fin <= v_debut then
    raise exception 'Le retour prévu suit le début.' using errcode = '22023';
  end if;
  insert into public.loc_immobilisations (client_id, entite_id, vehicule_id, motif, debut_le, fin_prevue_le, prestataire, cout_eur, notes, cree_par)
  values (v_client, v.entite_id, v.id, v_motif, v_debut, v_fin, private.loc_lire_texte(p_valeurs, 'prestataire', 200),
          case when jsonb_typeof(p_valeurs -> 'cout_eur') = 'number' then round((p_valeurs ->> 'cout_eur')::numeric, 2) end,
          private.loc_lire_texte(p_valeurs, 'notes', 1000), (select auth.uid()))
  returning id into v_id;
  -- ce que l'immobilisation empêche : les réservations et contrats du véhicule sur la période, à réaffecter
  select coalesce(jsonb_agg(jsonb_build_object('quoi', o.quoi, 'ref', o.ref, 'debut', o.debut) order by o.debut), '[]'::jsonb) into v_conflits
  from private.loc_occupations(v_client, v.id, v_id) o
  where o.quoi in ('contrat', 'reservation') and o.debut < coalesce(v_fin, 'infinity'::timestamptz) and o.fin > v_debut;
  if jsonb_array_length(v_conflits) > 0 then
    perform private.lever_alerte_module(v_client, 'tavaro', 'attention',
      format('%s est immobilisé (%s) : %s réservation(s) ou contrat(s) à réaffecter sur un autre véhicule.', v.immatriculation, replace(v_motif, '_', ' '), jsonb_array_length(v_conflits)),
      jsonb_build_object('immobilisation', v_id, 'vehicule', v.id, 'a_reaffecter', v_conflits), 'immobilisation:conflit:' || v_id::text, true, null);
  end if;
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.vehicule_immobilise', 'loc_immobilisations', v_id::text,
    jsonb_build_object('vehicule', v.immatriculation, 'motif', v_motif, 'fin_prevue', v_fin, 'a_reaffecter', jsonb_array_length(v_conflits)), v.entite_id);
  return jsonb_build_object('immobilisation', v_id, 'a_reaffecter', v_conflits);
end $function$;

-- Le véhicule revient (carrossier, garage) : l'immobilisation est close ; le coût réel peut être noté.
CREATE OR REPLACE FUNCTION public.loc_lever_immobilisation(p_immobilisation uuid, p_cout_eur numeric DEFAULT NULL::numeric, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'Une immobilisation se lève par l''agence.');
  i public.loc_immobilisations;
begin
  select * into i from public.loc_immobilisations where client_id = v_client and id = p_immobilisation for update;
  if not found or (i.entite_id is not null and not private.voit_entite(v_client, i.entite_id)) then
    raise exception 'Immobilisation introuvable.' using errcode = 'P0002';
  end if;
  if i.fin_le is not null then
    raise exception 'Le véhicule est déjà revenu.' using errcode = '23514';
  end if;
  if i.motif = 'preparation' then
    raise exception 'La préparation se clôt en finissant la remise en location.' using errcode = '23514';
  end if;
  if p_cout_eur is not null and (p_cout_eur < 0 or p_cout_eur > 1000000) then
    raise exception 'Coût illisible.' using errcode = '22023';
  end if;
  update public.loc_immobilisations
     set fin_le = greatest(now(), debut_le), cout_eur = coalesce(round(p_cout_eur, 2), cout_eur),
         notes = coalesce(left(nullif(btrim(p_notes), ''), 1000), notes)
   where id = i.id;
  update public.loc_entretiens set statut = 'fait', fait_le = now(), cout_eur = coalesce(round(p_cout_eur, 2), cout_eur)
   where immobilisation_id = i.id and statut = 'planifie';
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.vehicule_revenu', 'loc_immobilisations', i.id::text,
    jsonb_build_object('motif', i.motif, 'jours', round(extract(epoch from (now() - i.debut_le)) / 86400, 1), 'cout', p_cout_eur), i.entite_id);
  return jsonb_build_object('immobilisation', i.id, 'fin_le', now());
end $function$;

-- ── L'entretien ─────────────────────────────────────────────────────────────────────────

-- p_valeurs : {nature, libelle?, echeance_le?, echeance_km?, duree_h?, notes?}
CREATE OR REPLACE FUNCTION public.loc_prevoir_entretien(p_vehicule uuid, p_valeurs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'Un entretien se prévoit par l''agence.');
  v public.loc_vehicules;
  v_id uuid;
  v_echeance date;
  v_km integer;
  v_duree integer;
begin
  select * into v from public.loc_vehicules where client_id = v_client and id = p_vehicule;
  if not found or (v.entite_id is not null and not private.voit_entite(v_client, v.entite_id)) then
    raise exception 'Véhicule introuvable.' using errcode = 'P0002';
  end if;
  if coalesce(p_valeurs ->> 'nature', '') not in ('revision', 'vidange', 'controle_technique', 'pneus', 'freins', 'climatisation', 'autre') then
    raise exception 'Nature d''entretien inconnue.' using errcode = '22023';
  end if;
  begin
    v_echeance := nullif(p_valeurs ->> 'echeance_le', '')::date;
    v_km := nullif(p_valeurs ->> 'echeance_km', '')::integer;
    v_duree := coalesce(nullif(p_valeurs ->> 'duree_h', '')::integer, 4);
  exception when others then
    raise exception 'Échéance ou durée illisible.' using errcode = '22023';
  end;
  if v_echeance is null and v_km is null then
    raise exception 'Un entretien a une échéance : une date, un kilométrage, ou les deux.' using errcode = '22023';
  end if;
  if v_duree < 1 or v_duree > 720 then
    raise exception 'La durée d''atelier va d''une heure à trente jours.' using errcode = '22023';
  end if;
  insert into public.loc_entretiens (client_id, entite_id, vehicule_id, nature, libelle, echeance_le, echeance_km, duree_h, notes, cree_par)
  values (v_client, v.entite_id, v.id, p_valeurs ->> 'nature', private.loc_lire_texte(p_valeurs, 'libelle', 200), v_echeance, v_km, v_duree,
          private.loc_lire_texte(p_valeurs, 'notes', 1000), (select auth.uid()))
  returning id into v_id;
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.entretien_prevu', 'loc_entretiens', v_id::text,
    jsonb_build_object('vehicule', v.immatriculation, 'nature', p_valeurs ->> 'nature', 'echeance_le', v_echeance, 'echeance_km', v_km), v.entite_id);
  return jsonb_build_object('entretien', v_id);
end $function$;

-- Les creux du planning : jusqu'à p_nombre créneaux libres de la durée de l'entretien, à 8 h (heure de l'agence),
-- dans les 60 jours, avant l'échéance si possible ; aucun ne touche un contrat, une réservation affectée ou une
-- immobilisation du véhicule.
CREATE OR REPLACE FUNCTION public.loc_creneaux_entretien(p_entretien uuid, p_nombre integer DEFAULT 3)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'Les créneaux se lisent par l''agence.');
  e public.loc_entretiens;
  v_fuseau text;
  v_jour date;
  v_debut timestamptz;
  v_fin timestamptz;
  v_creneaux jsonb := '[]'::jsonb;
  i integer;
begin
  select * into e from public.loc_entretiens where client_id = v_client and id = p_entretien;
  if not found or (e.entite_id is not null and not private.voit_entite(v_client, e.entite_id)) then
    raise exception 'Entretien introuvable.' using errcode = 'P0002';
  end if;
  select coalesce(x.fuseau, 'Europe/Paris') into v_fuseau from public.entites x where x.client_id = v_client and x.id = e.entite_id;
  v_fuseau := coalesce(v_fuseau, 'Europe/Paris');
  v_jour := (now() at time zone v_fuseau)::date + 1;
  for i in 0..59 loop
    v_debut := ((v_jour + i)::timestamp + time '08:00') at time zone v_fuseau;
    v_fin := v_debut + make_interval(hours => e.duree_h);
    if not exists (select 1 from private.loc_occupations(v_client, e.vehicule_id, e.immobilisation_id) o
                   where o.debut < v_fin + interval '1 hour' and o.fin > v_debut - interval '1 hour') then
      v_creneaux := v_creneaux || jsonb_build_array(jsonb_build_object('debut', v_debut, 'fin', v_fin,
                                                                       'avant_echeance', e.echeance_le is null or (v_fin at time zone v_fuseau)::date <= e.echeance_le));
      exit when jsonb_array_length(v_creneaux) >= greatest(1, least(coalesce(p_nombre, 3), 10));
    end if;
  end loop;
  return jsonb_build_object('entretien', e.id, 'duree_h', e.duree_h, 'creneaux', v_creneaux);
end $function$;

-- Planifier : refusé si le créneau touche un contrat ou une réservation du véhicule (on n'immobilise pas un véhicule
-- attendu). L'atelier est prévenu par le chemin de tout envoi (validation comprise) si son adresse est donnée.
CREATE OR REPLACE FUNCTION public.loc_planifier_entretien(p_entretien uuid, p_debut timestamp with time zone, p_atelier_nom text DEFAULT NULL::text,
                                                        p_atelier_adresse text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'Un entretien se planifie par l''agence.');
  e public.loc_entretiens;
  v public.loc_vehicules;
  v_fin timestamptz;
  v_cquoi text;
  v_cref text;
  v_cdebut timestamptz;
  v_immo uuid;
  v_envoi uuid;
  v_adresse text := nullif(btrim(coalesce(p_atelier_adresse, '')), '');
  v_nom_loueur text;
begin
  select * into e from public.loc_entretiens where client_id = v_client and id = p_entretien for update;
  if not found or (e.entite_id is not null and not private.voit_entite(v_client, e.entite_id)) then
    raise exception 'Entretien introuvable.' using errcode = 'P0002';
  end if;
  if e.statut not in ('a_planifier', 'planifie') then
    raise exception 'Cet entretien est clos (%).', e.statut using errcode = '23514';
  end if;
  if p_debut is null or p_debut < now() - interval '1 hour' then
    raise exception 'Le créneau est à venir.' using errcode = '22023';
  end if;
  if v_adresse is not null and (v_adresse !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_adresse) > 320) then
    raise exception 'L''adresse de l''atelier n''est pas une adresse de courriel.' using errcode = '22023';
  end if;
  v_fin := p_debut + make_interval(hours => e.duree_h);
  select o.quoi, o.ref, o.debut into v_cquoi, v_cref, v_cdebut from private.loc_occupations(v_client, e.vehicule_id, e.immobilisation_id) o
  where o.quoi in ('contrat', 'reservation') and o.debut < v_fin and o.fin > p_debut
  order by o.debut limit 1;
  if v_cquoi is not null then
    raise exception 'Ce créneau immobiliserait un véhicule attendu : % % le %. Choisissez un creux.',
      case v_cquoi when 'contrat' then 'contrat' else 'réservation' end, coalesce(v_cref, ''), private.loc_heure_locale(v_cdebut, v_client, e.entite_id)
      using errcode = '23514';
  end if;
  select * into v from public.loc_vehicules where client_id = v_client and id = e.vehicule_id;
  if e.immobilisation_id is not null then
    update public.loc_immobilisations set debut_le = p_debut, fin_prevue_le = v_fin, prestataire = coalesce(left(p_atelier_nom, 200), prestataire)
     where id = e.immobilisation_id and fin_le is null;
    v_immo := e.immobilisation_id;
  else
    insert into public.loc_immobilisations (client_id, entite_id, vehicule_id, motif, debut_le, fin_prevue_le, prestataire, notes, cree_par)
    values (v_client, e.entite_id, e.vehicule_id, case when e.nature = 'controle_technique' then 'controle_technique' else 'entretien' end,
            p_debut, v_fin, left(p_atelier_nom, 200), 'Entretien : ' || coalesce(e.libelle, replace(e.nature, '_', ' ')), (select auth.uid()))
    returning id into v_immo;
  end if;
  update public.loc_entretiens
     set statut = 'planifie', debut_le = p_debut, fin_le = v_fin, immobilisation_id = v_immo,
         atelier_nom = coalesce(left(nullif(btrim(p_atelier_nom), ''), 200), atelier_nom), atelier_adresse = coalesce(v_adresse, atelier_adresse)
   where id = e.id
  returning * into e;
  if v_adresse is not null and (private.reglages_envois_effectifs(v_client, 'tavaro') ->> 'mode') is not null then
    select coalesce(g.emetteur ->> 'nom', (select x.nom from public.clients x where x.id = v_client)) into v_nom_loueur
    from public.loc_reglages g where g.client_id = v_client;
    v_envoi := private.preparer_envoi(v_client, 'tavaro', 'loc_entretiens', e.id::text, 'email',
      jsonb_build_object('adresse', v_adresse, 'nom', coalesce(e.atelier_nom, 'Atelier'), 'professionnel', true, 'langue', 'fr'),
      null, '{}'::jsonb,
      format('%s — %s : %s le %s', coalesce(v_nom_loueur, 'Location'), v.immatriculation, coalesce(e.libelle, replace(e.nature, '_', ' ')), private.loc_heure_locale(p_debut, v_client, e.entite_id, 'DD/MM/YYYY')),
      format(E'Bonjour,\n\nNous vous confions le véhicule %s%s pour : %s.\nDépôt le %s, reprise prévue le %s.%s\n\nMerci de nous prévenir au plus tôt si ce créneau ne vous convient pas ou si l''intervention doit durer plus longtemps : le véhicule est attendu en location ensuite.\n\n%s\n',
             v.immatriculation, case when v.modele is not null then ' (' || v.modele || ')' else '' end, coalesce(e.libelle, replace(e.nature, '_', ' ')),
             private.loc_heure_locale(p_debut, v_client, e.entite_id, 'DD/MM/YYYY à HH24:MI'), private.loc_heure_locale(v_fin, v_client, e.entite_id, 'DD/MM/YYYY à HH24:MI'),
             case when v.km_dernier is not null then format(E'\nKilométrage relevé : %s km.', v.km_dernier) else '' end, coalesce(v_nom_loueur, '')),
      null, 'tavaro:atelier:' || e.id::text || ':' || to_char(p_debut, 'YYYYMMDDHH24MI'), e.entite_id, true, false, null::timestamptz, '{}'::jsonb);
    update public.loc_entretiens set envoi_id = v_envoi where id = e.id;
  end if;
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.entretien_planifie', 'loc_entretiens', e.id::text,
    jsonb_build_object('vehicule', v.immatriculation, 'debut', p_debut, 'fin', v_fin, 'atelier', e.atelier_nom, 'envoi', v_envoi), e.entite_id);
  return jsonb_build_object('entretien', e.id, 'statut', 'planifie', 'debut', p_debut, 'fin', v_fin, 'envoi', v_envoi,
                            'atelier_prevenu', v_envoi is not null);
end $function$;

-- L'entretien est fait : la date, le kilométrage, le coût ; l'immobilisation est close.
CREATE OR REPLACE FUNCTION public.loc_entretien_fait(p_entretien uuid, p_km integer DEFAULT NULL::integer, p_cout_eur numeric DEFAULT NULL::numeric, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'Un entretien se clôt par l''agence.');
  e public.loc_entretiens;
begin
  select * into e from public.loc_entretiens where client_id = v_client and id = p_entretien for update;
  if not found or (e.entite_id is not null and not private.voit_entite(v_client, e.entite_id)) then
    raise exception 'Entretien introuvable.' using errcode = 'P0002';
  end if;
  if e.statut in ('fait', 'annule') then
    raise exception 'Cet entretien est clos (%).', e.statut using errcode = '23514';
  end if;
  if (p_km is not null and (p_km < 0 or p_km > 2000000)) or (p_cout_eur is not null and (p_cout_eur < 0 or p_cout_eur > 1000000)) then
    raise exception 'Kilométrage ou coût illisible.' using errcode = '22023';
  end if;
  update public.loc_entretiens
     set statut = 'fait', fait_le = now(), km_fait = p_km, cout_eur = round(p_cout_eur, 2), notes = coalesce(left(nullif(btrim(p_notes), ''), 1000), notes),
         debut_le = coalesce(debut_le, now() - make_interval(hours => duree_h)), fin_le = coalesce(fin_le, now())
   where id = e.id;
  update public.loc_immobilisations set fin_le = greatest(now(), debut_le), cout_eur = coalesce(round(p_cout_eur, 2), cout_eur)
   where id = e.immobilisation_id and fin_le is null;
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.entretien_fait', 'loc_entretiens', e.id::text,
    jsonb_build_object('km', p_km, 'cout', p_cout_eur), e.entite_id);
  return jsonb_build_object('entretien', e.id, 'statut', 'fait');
end $function$;

-- ── La surveillance du parc ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION private.loc_surveiller_parc(p_maintenant timestamp with time zone DEFAULT now())
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r public.loc_remises;
  i public.loc_immobilisations;
  e public.loc_entretiens;
  v_depart timestamptz;
  v_source text;
  v_ref text;
  v_marge integer;
  v_duree integer;
  v_reste numeric;
  v_niveau text;
  v_immat text;
  v_conflits integer;
  v_jours integer;
  v_km integer;
  v_kmd integer;
  n integer := 0;
  v_client uuid;
begin
  -- 1. les remises ouvertes : le prochain départ est relu (une réservation a pu arriver), le risque recalculé
  for r in select x.* from public.loc_remises x where x.statut in ('a_faire', 'en_cours') order by x.client_id loop
    begin
      select coalesce(g.remise_marge_min, 30), coalesce(g.remise_duree_min, 90) into v_marge, v_duree from public.loc_reglages g where g.client_id = r.client_id;
      v_marge := coalesce(v_marge, 30);
      v_duree := coalesce(v_duree, 90);
      select d.depart_le, d.source, d.ref into v_depart, v_source, v_ref from private.loc_prochain_depart(r.client_id, r.vehicule_id, r.entite_id, r.retour_le) d;
      if v_depart is distinct from r.prochain_depart_le then
        update public.loc_remises set prochain_depart_le = v_depart, prochain_depart_source = v_source, prochain_depart_ref = left(v_ref, 120),
                                      limite_le = v_depart - make_interval(mins => v_marge)
         where id = r.id returning * into r;
      end if;
      v_reste := v_duree * (3 - (r.inspection_le is not null)::int - (r.nettoyage_le is not null)::int - (r.energie_le is not null)::int) / 3.0;
      v_niveau := case when r.limite_le is null then null
                       when p_maintenant > r.limite_le then 'retard'
                       when p_maintenant + make_interval(mins => ceil(v_reste)::int) > r.limite_le then 'risque' end;
      if v_niveau is not null and v_niveau is distinct from r.alerte then
        select v.immatriculation into v_immat from public.loc_vehicules v where v.client_id = r.client_id and v.id = r.vehicule_id;
        perform private.lever_alerte_module(r.client_id, 'tavaro', case v_niveau when 'retard' then 'critique' else 'attention' end,
          case v_niveau
            when 'retard' then format('%s n''est pas prêt et l''heure limite est passée (%s) : le départ %s du %s est menacé.', v_immat,
                                      private.loc_heure_locale(r.limite_le, r.client_id, r.entite_id, 'HH24:MI'), coalesce(r.prochain_depart_ref, ''), private.loc_heure_locale(r.prochain_depart_le, r.client_id, r.entite_id))
            else format('La remise en location de %s risque de manquer le départ %s du %s : il reste environ %s min de travail.', v_immat,
                        coalesce(r.prochain_depart_ref, ''), private.loc_heure_locale(r.prochain_depart_le, r.client_id, r.entite_id), ceil(v_reste)) end,
          jsonb_build_object('remise', r.id, 'limite', r.limite_le, 'depart', r.prochain_depart_le),
          'remise:' || v_niveau || ':' || r.id::text, true, r.responsable);
        update public.loc_remises set alerte = v_niveau where id = r.id;
        n := n + 1;
      end if;
    exception when others then
      raise warning 'loc_surveiller_parc remise %: %', r.id, sqlerrm;
    end;
  end loop;

  -- 2. les immobilisations : retour prévu dépassé ; chevauchement d'une réservation affectée (à réaffecter)
  for i in select x.* from public.loc_immobilisations x where x.fin_le is null and x.motif <> 'preparation' loop
    begin
      select v.immatriculation into v_immat from public.loc_vehicules v where v.client_id = i.client_id and v.id = i.vehicule_id;
      if i.fin_prevue_le is not null and i.fin_prevue_le < p_maintenant then
        perform private.lever_alerte_module(i.client_id, 'tavaro', 'attention',
          format('%s devait revenir le %s (%s%s) : relancez le prestataire ou prolongez l''immobilisation.', v_immat, private.loc_heure_locale(i.fin_prevue_le, i.client_id, i.entite_id, 'DD/MM'),
                 replace(i.motif, '_', ' '), case when i.prestataire is not null then ', ' || i.prestataire else '' end),
          jsonb_build_object('immobilisation', i.id), 'immobilisation:depassee:' || i.id::text || ':' || to_char(p_maintenant, 'YYYYMMDD'), true, null);
        n := n + 1;
      end if;
      select count(*) into v_conflits from private.loc_occupations(i.client_id, i.vehicule_id, i.id) o
      where o.quoi = 'reservation' and o.debut < coalesce(i.fin_prevue_le, 'infinity'::timestamptz) and o.fin > i.debut_le and o.debut > p_maintenant;
      if v_conflits > 0 then
        perform private.lever_alerte_module(i.client_id, 'tavaro', 'attention',
          format('%s est immobilisé (%s) et porte encore %s réservation(s) : réaffectez-les sur un autre véhicule.', v_immat, replace(i.motif, '_', ' '), v_conflits),
          jsonb_build_object('immobilisation', i.id), 'immobilisation:conflit:' || i.id::text || ':' || to_char(p_maintenant, 'YYYYMMDD'), true, null);
        n := n + 1;
      end if;
    exception when others then
      raise warning 'loc_surveiller_parc immobilisation %: %', i.id, sqlerrm;
    end;
  end loop;

  -- 3. les entretiens dus et pas planifiés (une alerte par jour)
  for e in select x.* from public.loc_entretiens x where x.statut = 'a_planifier' loop
    begin
      select coalesce(g.entretien_alerte_jours, 30), coalesce(g.entretien_alerte_km, 1000) into v_jours, v_km from public.loc_reglages g where g.client_id = e.client_id;
      select v.immatriculation, v.km_dernier into v_immat, v_kmd from public.loc_vehicules v where v.client_id = e.client_id and v.id = e.vehicule_id;
      if (e.echeance_le is not null and e.echeance_le <= (p_maintenant at time zone 'UTC')::date + coalesce(v_jours, 30))
         or (e.echeance_km is not null and v_kmd is not null and v_kmd >= e.echeance_km - coalesce(v_km, 1000)) then
        perform private.lever_alerte_module(e.client_id, 'tavaro', case when e.echeance_le < (p_maintenant at time zone 'UTC')::date or v_kmd >= e.echeance_km then 'critique' else 'attention' end,
          format('%s : %s à planifier (échéance %s).', v_immat, coalesce(e.libelle, replace(e.nature, '_', ' ')),
                 concat_ws(' ou ', to_char(e.echeance_le, 'DD/MM/YYYY'), case when e.echeance_km is not null then e.echeance_km || ' km' end)),
          jsonb_build_object('entretien', e.id), 'entretien:du:' || e.id::text || ':' || to_char(p_maintenant, 'YYYYMMDD'), true, null);
        n := n + 1;
      end if;
    exception when others then
      raise warning 'loc_surveiller_parc entretien %: %', e.id, sqlerrm;
    end;
  end loop;

  for v_client in select distinct x.client_id from public.loc_remises x where x.cree_le > p_maintenant - interval '30 days' loop
    perform private.battre(v_client, 'tavaro_parc', jsonb_build_object('passage', p_maintenant), interval '1 hour');
  end loop;
  return n;
end $function$;

do $$ begin
  if not exists (select 1 from cron.job where jobname = 'tavaro-parc') then
    perform cron.schedule('tavaro-parc', '*/15 * * * *', 'select private.loc_surveiller_parc()');
  end if;
end $$;

revoke all on function private.loc_heure_locale(timestamp with time zone, uuid, uuid, text) from public, anon, authenticated;
revoke all on function private.loc_occupations(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function private.loc_prochain_depart(uuid, uuid, uuid, timestamp with time zone) from public, anon, authenticated;
revoke all on function private.loc_creer_remise(uuid, uuid, timestamp with time zone) from public, anon, authenticated;
revoke all on function private.loc_remise_au_retour() from public, anon, authenticated;
revoke all on function private.loc_remise_au_chiffrage() from public, anon, authenticated;
revoke all on function private.loc_remise_de_l_agence(uuid, text[], text) from public, anon, authenticated;
revoke all on function private.loc_surveiller_parc(timestamp with time zone) from public, anon, authenticated;
grant execute on function private.loc_surveiller_parc(timestamp with time zone) to service_role;
grant execute on function private.loc_creer_remise(uuid, uuid, timestamp with time zone) to service_role;
revoke all on function public.loc_etape_remise(uuid, text, boolean) from public, anon;
revoke all on function public.loc_assigner_remise(uuid, uuid) from public, anon;
revoke all on function public.loc_annuler_remise(uuid, text) from public, anon;
revoke all on function public.loc_signaler_anomalie(uuid, text, text, uuid) from public, anon;
revoke all on function public.loc_traiter_anomalie(uuid, text) from public, anon;
revoke all on function public.loc_immobiliser(uuid, jsonb) from public, anon;
revoke all on function public.loc_lever_immobilisation(uuid, numeric, text) from public, anon;
revoke all on function public.loc_prevoir_entretien(uuid, jsonb) from public, anon;
revoke all on function public.loc_creneaux_entretien(uuid, integer) from public, anon;
revoke all on function public.loc_planifier_entretien(uuid, timestamp with time zone, text, text) from public, anon;
revoke all on function public.loc_entretien_fait(uuid, integer, numeric, text) from public, anon;
grant execute on function public.loc_etape_remise(uuid, text, boolean) to authenticated, service_role;
grant execute on function public.loc_assigner_remise(uuid, uuid) to authenticated, service_role;
grant execute on function public.loc_annuler_remise(uuid, text) to authenticated, service_role;
grant execute on function public.loc_signaler_anomalie(uuid, text, text, uuid) to authenticated, service_role;
grant execute on function public.loc_traiter_anomalie(uuid, text) to authenticated, service_role;
grant execute on function public.loc_immobiliser(uuid, jsonb) to authenticated, service_role;
grant execute on function public.loc_lever_immobilisation(uuid, numeric, text) to authenticated, service_role;
grant execute on function public.loc_prevoir_entretien(uuid, jsonb) to authenticated, service_role;
grant execute on function public.loc_creneaux_entretien(uuid, integer) to authenticated, service_role;
grant execute on function public.loc_planifier_entretien(uuid, timestamp with time zone, text, text) to authenticated, service_role;
grant execute on function public.loc_entretien_fait(uuid, integer, numeric, text) to authenticated, service_role;
