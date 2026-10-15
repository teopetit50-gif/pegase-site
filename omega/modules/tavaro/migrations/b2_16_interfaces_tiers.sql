-- b2_16 — Les contrats d'interface sans fournisseur : Assistance (module 04), Relevés constructeur (module 19), paiement
-- de la caution (préautorisation, capture, libération). Carnet de l'audit, points 4 et 5 ; session B2, 11/10/2026.
--
-- Teo choisira les fournisseurs (voix et dépanneurs, agrégateur de données constructeur, prestataire de paiement).
-- Ce lot pose côté Tavaro tout ce qui ne dépend pas d'eux : les tables, les portes que le fournisseur appellera (service
-- seul), les portes de l'agence, les travaux que l'ouvrier du fournisseur prendra. Le détail des messages est dans
-- omega/modules/tavaro/INTERFACES.md. Aucun appel sortant ici ; aucun secret.
--
--   · Assistance : public.loc_grille_assistance (ce que l'assistant fait, par type d'incident), public.loc_incidents ;
--     portes du fournisseur : loc_assistance_ouvrir (l'appel arrive : contrat retrouvé, action selon la grille, l'agence
--     prévenue), loc_assistance_evenement (missionné, arrivée estimée, transcription, transféré, clos) ; un accident
--     ouvre le dossier de sinistre (b2_15) ;
--   · Relevés constructeur : public.loc_releves_constructeur ; porte du fournisseur loc_enregistrer_releves_constructeur
--     (par numéro de série ou plaque) ; porte de l'agence loc_releve_au_retour(contrat) : le relevé le plus proche du
--     retour, et l'écart avec l'état des lieux ;
--   · Caution : public.loc_cautions ; portes de l'agence : loc_demander_preautorisation, loc_capturer_caution (direction
--     ou valideur, sur une facture du contrat, jamais plus que la préautorisation), loc_liberer_caution ; chacune dépose
--     le travail tavaro.caution que l'ouvrier du prestataire prendra ; porte du prestataire loc_caution_evenement.

-- ── Assistance ──────────────────────────────────────────────────────────────────────────
create table if not exists public.loc_grille_assistance (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  type_incident text not null,
  action text not null,
  prestataire text,
  prestataire_telephone text,
  delai_cible_min integer,
  consignes text,
  rang smallint not null default 0,
  maj_le timestamp with time zone not null default now(),
  constraint loc_grille_assistance_pkey primary key (id),
  constraint loc_grille_assistance_un unique (client_id, type_incident),
  constraint loc_grille_assistance_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_grille_assistance_type_check check (type_incident in ('panne', 'accident', 'cle_perdue', 'crevaison', 'batterie', 'carburant', 'vol', 'autre')),
  constraint loc_grille_assistance_action_check check (action in ('depanneuse', 'vehicule_remplacement', 'serrurier', 'conseil', 'transfert_humain')),
  constraint loc_grille_assistance_textes check (char_length(prestataire) <= 120 and char_length(prestataire_telephone) <= 30 and char_length(consignes) <= 1000),
  constraint loc_grille_assistance_delai check (delai_cible_min between 5 and 1440)
);
create table if not exists public.loc_incidents (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  entite_id uuid,
  contrat_id uuid,
  vehicule_id uuid,
  canal text not null,
  appelant_telephone text,
  type_incident text not null,
  description text,
  position text,
  recu_le timestamp with time zone not null default now(),
  action text,
  prestataire text,
  missionne_le timestamp with time zone,
  arrivee_estimee_le timestamp with time zone,
  statut text not null default 'ouvert',
  transfere_le timestamp with time zone,
  transfert_motif text,
  resume text,
  transcription text,
  sinistre_id uuid,
  fournisseur text,
  fournisseur_reference text,
  clos_le timestamp with time zone,
  maj_le timestamp with time zone not null default now(),
  constraint loc_incidents_pkey primary key (id),
  constraint loc_incidents_client_id_id_key unique (client_id, id),
  constraint loc_incidents_fournisseur_un unique (client_id, fournisseur, fournisseur_reference),
  constraint loc_incidents_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_incidents_contrat_fkey foreign key (client_id, contrat_id) references public.loc_contrats(client_id, id),
  constraint loc_incidents_vehicule_fkey foreign key (client_id, vehicule_id) references public.loc_vehicules(client_id, id),
  constraint loc_incidents_canal_check check (canal in ('telephone', 'sms', 'messagerie', 'web')),
  constraint loc_incidents_type_check check (type_incident in ('panne', 'accident', 'cle_perdue', 'crevaison', 'batterie', 'carburant', 'vol', 'autre')),
  constraint loc_incidents_statut_check check (statut in ('ouvert', 'missionne', 'transfere', 'clos')),
  constraint loc_incidents_textes check (char_length(description) <= 2000 and char_length(position) <= 300 and char_length(resume) <= 2000
                                         and char_length(transcription) <= 50000 and char_length(transfert_motif) <= 500 and char_length(fournisseur_reference) <= 120)
);
comment on table public.loc_incidents is 'b2_16 : incidents reçus par l''assistance (fournisseur de voix à choisir), traités selon la grille de l''agence';

-- ── Relevés constructeur ────────────────────────────────────────────────────────────────
create table if not exists public.loc_releves_constructeur (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  vehicule_id uuid not null,
  lu_le timestamp with time zone not null,
  km integer,
  carburant_pct numeric(5,1),
  batterie_pct numeric(5,1),
  autonomie_km integer,
  source text not null,
  reference text,
  recu_le timestamp with time zone not null default now(),
  constraint loc_releves_constructeur_pkey primary key (id),
  constraint loc_releves_constructeur_un unique (client_id, vehicule_id, lu_le, source),
  constraint loc_releves_constructeur_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_releves_constructeur_vehicule_fkey foreign key (client_id, vehicule_id) references public.loc_vehicules(client_id, id),
  constraint loc_releves_constructeur_valeurs check (km between 0 and 2000000 and carburant_pct between 0 and 100 and batterie_pct between 0 and 100 and autonomie_km between 0 and 3000),
  constraint loc_releves_constructeur_source check (char_length(source) between 2 and 60 and char_length(reference) <= 120)
);
create index if not exists loc_releves_constructeur_vehicule on public.loc_releves_constructeur (client_id, vehicule_id, lu_le desc);
comment on table public.loc_releves_constructeur is 'b2_16 : kilométrage, carburant et batterie lus auprès du constructeur (agrégateur à choisir)';

-- ── Caution ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.loc_cautions (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  entite_id uuid not null,
  contrat_id uuid not null,
  montant_eur numeric(10,2) not null,
  statut text not null default 'demandee',
  prestataire text,
  reference_externe text,
  preautorisee_le timestamp with time zone,
  expire_le timestamp with time zone,
  capture_demandee_eur numeric(10,2),
  capture_eur numeric(10,2),
  capture_facture_id uuid,
  capture_motif text,
  capturee_le timestamp with time zone,
  liberee_le timestamp with time zone,
  erreur text,
  evenements jsonb not null default '[]'::jsonb,
  demande_par uuid,
  cree_le timestamp with time zone not null default now(),
  maj_le timestamp with time zone not null default now(),
  constraint loc_cautions_pkey primary key (id),
  constraint loc_cautions_client_id_id_key unique (client_id, id),
  constraint loc_cautions_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_cautions_contrat_fkey foreign key (client_id, contrat_id) references public.loc_contrats(client_id, id),
  constraint loc_cautions_facture_fkey foreign key (client_id, capture_facture_id) references public.loc_factures(client_id, id),
  constraint loc_cautions_statut_check check (statut in ('demandee', 'preautorisee', 'capture_demandee', 'capturee', 'liberation_demandee', 'liberee', 'expiree', 'echec')),
  constraint loc_cautions_montants check (montant_eur > 0 and montant_eur <= 100000 and capture_demandee_eur >= 0 and capture_eur >= 0),
  constraint loc_cautions_capture_bornee check (capture_demandee_eur is null or capture_demandee_eur <= montant_eur),
  constraint loc_cautions_textes check (char_length(prestataire) <= 60 and char_length(reference_externe) <= 120 and char_length(capture_motif) <= 500 and char_length(erreur) <= 500)
);
create unique index if not exists loc_cautions_une_active on public.loc_cautions (client_id, contrat_id) where statut in ('demandee', 'preautorisee', 'capture_demandee', 'liberation_demandee');
comment on table public.loc_cautions is 'b2_16 : la caution par carte (préautorisation, capture, libération) ; le prestataire de paiement est à choisir';

do $$
declare t text;
begin
  foreach t in array array['loc_grille_assistance', 'loc_incidents', 'loc_releves_constructeur', 'loc_cautions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from public, anon, authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_grille_assistance' and policyname = 'membres lisent la grille') then
    create policy "membres lisent la grille" on public.loc_grille_assistance for select to authenticated using (client_id in (select private.mes_clients()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_releves_constructeur' and policyname = 'membres lisent les releves constructeur') then
    create policy "membres lisent les releves constructeur" on public.loc_releves_constructeur for select to authenticated using (client_id in (select private.mes_clients()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_incidents' and policyname = 'on voit les incidents de son agence') then
    create policy "on voit les incidents de son agence" on public.loc_incidents for select to authenticated
      using (client_id in (select private.mes_clients())
             and (case when entite_id is null then private.a_un_role(client_id, array['gerant', 'admin', 'valideur']) else private.voit_entite(client_id, entite_id) end));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_cautions' and policyname = 'on voit les cautions de son agence') then
    create policy "on voit les cautions de son agence" on public.loc_cautions for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
  foreach t in array array['loc_grille_assistance', 'loc_incidents', 'loc_cautions'] loop
    if not exists (select 1 from pg_trigger where tgname = t || '_toucher' and tgrelid = ('public.' || t)::regclass) then
      execute format('create trigger %I before update on public.%I for each row execute function private.loc_toucher()', t || '_toucher', t);
    end if;
    if not exists (select 1 from pg_trigger where tgname = t || '_tracer' and tgrelid = ('public.' || t)::regclass) then
      -- la transcription de l'appel ne part pas dans la trace
      execute format('create trigger %I after insert or update on public.%I for each row execute function private.tracer(%L, %L)', t || '_tracer', t, 'maj_le', 'transcription');
    end if;
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- La grille de l'agence : ce que l'assistant fait pour chaque type d'incident. Direction seule.
-- p_lignes : [{type_incident, action, prestataire?, prestataire_telephone?, delai_cible_min?, consignes?}]
CREATE OR REPLACE FUNCTION public.loc_poser_grille_assistance(p_lignes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin'], 'La grille d''assistance se règle par la direction.');
  x jsonb;
  v_n integer := 0;
begin
  if jsonb_typeof(p_lignes) is distinct from 'array' then
    raise exception 'La grille est un tableau.' using errcode = '22023';
  end if;
  for x in select * from jsonb_array_elements(p_lignes) loop
    begin
      insert into public.loc_grille_assistance (client_id, type_incident, action, prestataire, prestataire_telephone, delai_cible_min, consignes, rang)
      values (v_client, x ->> 'type_incident', x ->> 'action', private.loc_lire_texte(x, 'prestataire', 120), private.loc_lire_texte(x, 'prestataire_telephone', 30),
              nullif(x ->> 'delai_cible_min', '')::integer, private.loc_lire_texte(x, 'consignes', 1000), v_n)
      on conflict on constraint loc_grille_assistance_un do update
        set action = excluded.action, prestataire = excluded.prestataire, prestataire_telephone = excluded.prestataire_telephone,
            delai_cible_min = excluded.delai_cible_min, consignes = excluded.consignes, rang = excluded.rang;
    exception when check_violation or invalid_text_representation or not_null_violation then
      raise exception 'Ligne de grille refusée : %.', left(x::text, 160) using errcode = '22023';
    end;
    v_n := v_n + 1;
  end loop;
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.grille_assistance_posee', 'loc_grille_assistance', null,
    jsonb_build_object('lignes', v_n, 'par', (select auth.uid())), null);
  return jsonb_build_object('lignes', v_n);
end $function$;

-- PORTE DU FOURNISSEUR DE VOIX (service seul). Un appel arrive : le contrat est retrouvé par le numéro de l'appelant
-- (locataire d'un contrat ouvert) ou par la plaque ; l'action vient de la grille ; l'agence est prévenue.
-- p_appel : {fournisseur, fournisseur_reference, canal, appelant_telephone?, immatriculation?, type_incident, description?, position?}
CREATE OR REPLACE FUNCTION public.loc_assistance_ouvrir(p_client uuid, p_appel jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  c public.loc_contrats;
  g public.loc_grille_assistance;
  v_id uuid;
  v_tel text := regexp_replace(coalesce(p_appel ->> 'appelant_telephone', ''), '[^0-9+]', '', 'g');
  v_type text := coalesce(p_appel ->> 'type_incident', 'autre');
  v_existant uuid;
  v_immat text;
begin
  if not exists (select 1 from public.clients x where x.id = p_client) then
    raise exception 'Organisation inconnue.' using errcode = 'P0002';
  end if;
  if nullif(p_appel ->> 'fournisseur', '') is null or nullif(p_appel ->> 'fournisseur_reference', '') is null then
    raise exception 'Le fournisseur et sa référence d''appel sont obligatoires (rejouer ne doit jamais ouvrir deux dossiers).' using errcode = '22023';
  end if;
  select i.id into v_existant from public.loc_incidents i where i.client_id = p_client and i.fournisseur = p_appel ->> 'fournisseur' and i.fournisseur_reference = p_appel ->> 'fournisseur_reference';
  if v_existant is not null then
    return jsonb_build_object('incident', v_existant, 'deja', true);
  end if;
  -- le contrat : d'abord par le numéro de l'appelant (contrat en cours), sinon par la plaque
  if char_length(v_tel) >= 6 then
    select x.* into c from public.loc_contrats x join public.loc_locataires l on l.client_id = x.client_id and l.id = x.locataire_id
    where x.client_id = p_client and x.statut = 'ouvert' and right(regexp_replace(coalesce(l.telephone, ''), '[^0-9]', '', 'g'), 9) = right(regexp_replace(v_tel, '[^0-9]', '', 'g'), 9)
    order by x.depart_le desc limit 1;
  end if;
  if c.id is null and nullif(p_appel ->> 'immatriculation', '') is not null then
    select x.* into c from public.loc_contrats x join private.loc_rapprocher_avis(p_client, p_appel ->> 'immatriculation', now()) r on r.contrat_id = x.id limit 1;
  end if;
  select * into g from public.loc_grille_assistance x where x.client_id = p_client and x.type_incident = v_type;
  insert into public.loc_incidents (client_id, entite_id, contrat_id, vehicule_id, canal, appelant_telephone, type_incident, description, position, action, prestataire,
                                    statut, fournisseur, fournisseur_reference)
  values (p_client, c.entite_id, c.id, c.vehicule_id, coalesce(p_appel ->> 'canal', 'telephone'), left(nullif(v_tel, ''), 30), v_type,
          private.loc_lire_texte(p_appel, 'description', 2000), private.loc_lire_texte(p_appel, 'position', 300),
          coalesce(g.action, 'transfert_humain'), g.prestataire, 'ouvert', left(p_appel ->> 'fournisseur', 60), left(p_appel ->> 'fournisseur_reference', 120))
  returning id into v_id;
  select v.immatriculation into v_immat from public.loc_vehicules v where v.id = c.vehicule_id;
  perform private.lever_alerte_module(p_client, 'tavaro', case when v_type in ('accident', 'vol') then 'critique' else 'attention' end,
    format('Assistance : %s%s%s. Action : %s%s.', replace(v_type, '_', ' '), case when v_immat is not null then ' sur ' || v_immat else '' end,
           case when c.numero is not null then ' (contrat ' || c.numero || ')' else ' — contrat non retrouvé' end,
           replace(coalesce(g.action, 'transfert_humain'), '_', ' '), case when g.prestataire is not null then ', ' || g.prestataire else '' end),
    jsonb_build_object('incident', v_id), 'incident:' || v_id::text, true, null);
  perform private.journaliser_module(p_client, 'tavaro', 'tavaro.incident_ouvert', 'loc_incidents', v_id::text,
    jsonb_build_object('type', v_type, 'contrat', c.numero, 'action', coalesce(g.action, 'transfert_humain'), 'fournisseur', p_appel ->> 'fournisseur'), c.entite_id);
  return jsonb_build_object('incident', v_id, 'deja', false, 'contrat', c.numero, 'vehicule', v_immat,
    'action', coalesce(g.action, 'transfert_humain'), 'prestataire', g.prestataire, 'prestataire_telephone', g.prestataire_telephone,
    'delai_cible_min', g.delai_cible_min, 'consignes', g.consignes,
    -- sans grille ou sans contrat retrouvé, l'assistant passe la main à une personne
    'transferer', g.id is null or c.id is null or g.action = 'transfert_humain');
end $function$;

-- PORTE DU FOURNISSEUR DE VOIX (service seul) : ce qui arrive ensuite.
-- p_evenement : {type: missionne|arrivee_estimee|transcription|transfere|clos, prestataire?, arrivee_estimee_le?, resume?, transcription?, motif?}
CREATE OR REPLACE FUNCTION public.loc_assistance_evenement(p_incident uuid, p_evenement jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  i public.loc_incidents;
  v_type text := p_evenement ->> 'type';
  v_sin jsonb;
begin
  select * into i from public.loc_incidents where id = p_incident for update;
  if not found then
    raise exception 'Incident introuvable.' using errcode = 'P0002';
  end if;
  if i.statut = 'clos' then
    return jsonb_build_object('incident', i.id, 'statut', 'clos', 'ignore', true);
  end if;
  case v_type
    when 'missionne' then
      update public.loc_incidents set statut = 'missionne', missionne_le = now(), prestataire = coalesce(private.loc_lire_texte(p_evenement, 'prestataire', 120), prestataire),
             arrivee_estimee_le = coalesce(nullif(p_evenement ->> 'arrivee_estimee_le', '')::timestamptz, arrivee_estimee_le) where id = i.id;
    when 'arrivee_estimee' then
      update public.loc_incidents set arrivee_estimee_le = nullif(p_evenement ->> 'arrivee_estimee_le', '')::timestamptz where id = i.id;
    when 'transcription' then
      update public.loc_incidents set resume = coalesce(private.loc_lire_texte(p_evenement, 'resume', 2000), resume),
             transcription = coalesce(left(p_evenement ->> 'transcription', 50000), transcription) where id = i.id;
    when 'transfere' then
      update public.loc_incidents set statut = 'transfere', transfere_le = now(), transfert_motif = private.loc_lire_texte(p_evenement, 'motif', 500),
             resume = coalesce(private.loc_lire_texte(p_evenement, 'resume', 2000), resume) where id = i.id;
      perform private.lever_alerte_module(i.client_id, 'tavaro', 'critique',
        format('Assistance : un appel est transféré à l''agence (%s). %s', replace(i.type_incident, '_', ' '), coalesce(private.loc_lire_texte(p_evenement, 'resume', 300), '')),
        jsonb_build_object('incident', i.id), 'incident:transfere:' || i.id::text, true, null);
    when 'clos' then
      update public.loc_incidents set statut = 'clos', clos_le = now(), resume = coalesce(private.loc_lire_texte(p_evenement, 'resume', 2000), resume) where id = i.id;
    else
      raise exception 'Événement inconnu : missionne, arrivee_estimee, transcription, transfere ou clos.' using errcode = '22023';
  end case;
  perform private.journaliser_module(i.client_id, 'tavaro', 'tavaro.incident_' || v_type, 'loc_incidents', i.id::text, jsonb_build_object('type', v_type), i.entite_id);
  return jsonb_build_object('incident', i.id, 'evenement', v_type);
end $function$;

-- L'agence clôt l'incident, et ouvre au besoin le dossier de sinistre (b2_15) depuis lui.
CREATE OR REPLACE FUNCTION public.loc_clore_incident(p_incident uuid, p_note text DEFAULT NULL::text, p_ouvrir_sinistre boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'Un incident se clôt par l''agence.');
  i public.loc_incidents;
  v_sin jsonb;
begin
  select * into i from public.loc_incidents where client_id = v_client and id = p_incident for update;
  if not found or (i.entite_id is not null and not private.voit_entite(v_client, i.entite_id)) then
    raise exception 'Incident introuvable.' using errcode = 'P0002';
  end if;
  if coalesce(p_ouvrir_sinistre, false) then
    if i.vehicule_id is null then
      raise exception 'L''incident n''est rattaché à aucun véhicule : ouvrez le sinistre depuis le contrat.' using errcode = '23514';
    end if;
    v_sin := public.loc_ouvrir_sinistre(jsonb_strip_nulls(jsonb_build_object('contrat', i.contrat_id, 'vehicule', i.vehicule_id, 'survenu_le', i.recu_le,
      'nature', case i.type_incident when 'vol' then 'vol' else 'accident' end, 'lieu', i.position, 'description', coalesce(i.resume, i.description))));
  end if;
  update public.loc_incidents set statut = 'clos', clos_le = coalesce(clos_le, now()), resume = coalesce(nullif(btrim(p_note), ''), resume),
         sinistre_id = coalesce((v_sin ->> 'sinistre')::uuid, sinistre_id)
   where id = i.id;
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.incident_clos', 'loc_incidents', i.id::text,
    jsonb_build_object('sinistre', v_sin ->> 'reference', 'par', (select auth.uid())), i.entite_id);
  return jsonb_build_object('incident', i.id, 'statut', 'clos', 'sinistre', v_sin -> 'sinistre');
end $function$;

-- PORTE DE L'AGRÉGATEUR (service seul) : les relevés lus chez le constructeur, par numéro de série ou plaque.
-- p_lignes : [{vin? | immatriculation?, lu_le, km?, carburant_pct?, batterie_pct?, autonomie_km?, reference?}]
CREATE OR REPLACE FUNCTION public.loc_enregistrer_releves_constructeur(p_client uuid, p_source text, p_lignes jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  x jsonb;
  v_vehicule uuid;
  v_n integer := 0;
  v_inconnus integer := 0;
begin
  if jsonb_typeof(p_lignes) is distinct from 'array' or nullif(btrim(coalesce(p_source, '')), '') is null then
    raise exception 'Une source et un tableau de relevés.' using errcode = '22023';
  end if;
  for x in select * from jsonb_array_elements(p_lignes) loop
    select v.id into v_vehicule from public.loc_vehicules v
    where v.client_id = p_client and ((nullif(x ->> 'vin', '') is not null and v.vin = upper(x ->> 'vin'))
                                       or (nullif(x ->> 'immatriculation', '') is not null and v.immatriculation = (select p.plaque from private.loc_plaque(x ->> 'immatriculation') p)))
    limit 1;
    if v_vehicule is null then
      v_inconnus := v_inconnus + 1;
      continue;
    end if;
    begin
      insert into public.loc_releves_constructeur (client_id, vehicule_id, lu_le, km, carburant_pct, batterie_pct, autonomie_km, source, reference)
      values (p_client, v_vehicule, (x ->> 'lu_le')::timestamptz, nullif(x ->> 'km', '')::integer, nullif(x ->> 'carburant_pct', '')::numeric,
              nullif(x ->> 'batterie_pct', '')::numeric, nullif(x ->> 'autonomie_km', '')::integer, left(p_source, 60), left(x ->> 'reference', 120))
      on conflict on constraint loc_releves_constructeur_un do nothing;
    exception when check_violation or invalid_text_representation or not_null_violation or invalid_datetime_format then
      raise exception 'Relevé refusé : %.', left(x::text, 160) using errcode = '22023';
    end;
    v_n := v_n + 1;
  end loop;
  return jsonb_build_object('releves', v_n, 'vehicules_inconnus', v_inconnus);
end $function$;

-- Le relevé constructeur le plus proche du retour (à deux heures près), et l'écart avec l'état des lieux de retour.
CREATE OR REPLACE FUNCTION public.loc_releve_au_retour(p_contrat uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  c public.loc_contrats;
  r public.loc_releves_constructeur;
  v_retour timestamptz;
  v_edl_km integer;
  v_edl_carb smallint;
begin
  select * into c from public.loc_contrats where id = p_contrat;
  if not found or v_uid is null or not exists (select 1 from public.comptes k where k.user_id = v_uid and k.client_id = c.client_id)
     or not (private.voit_entite(c.client_id, c.entite_id) or (c.entite_retour_id is not null and private.voit_entite(c.client_id, c.entite_retour_id))) then
    raise exception 'Contrat introuvable.' using errcode = 'P0002';
  end if;
  v_retour := coalesce(c.retour_reel_le, (select max((p.entrees ->> 'retour_reel_le')::timestamptz) from public.loc_propositions p where p.contrat_id = c.id and p.entrees ? 'retour_reel_le'), now());
  select x.* into r from public.loc_releves_constructeur x
  where x.client_id = c.client_id and x.vehicule_id = c.vehicule_id and x.lu_le between v_retour - interval '2 hours' and v_retour + interval '2 hours'
  order by abs(extract(epoch from (x.lu_le - v_retour))) limit 1;
  if r.id is null then
    return jsonb_build_object('releve', null, 'message', 'Aucun relevé du constructeur à l''heure du retour (agrégateur non branché, ou véhicule non connecté).');
  end if;
  select e.km, e.carburant_8 into v_edl_km, v_edl_carb from public.loc_etats_des_lieux e where e.client_id = c.client_id and e.contrat_id = c.id and e.moment = 'retour';
  return jsonb_build_object('releve', jsonb_build_object('lu_le', r.lu_le, 'km', r.km, 'carburant_pct', r.carburant_pct,
                                                         'carburant_8', case when r.carburant_pct is not null then round(r.carburant_pct / 12.5)::int end,
                                                         'batterie_pct', r.batterie_pct, 'source', r.source),
                            'ecart_km', case when r.km is not null and v_edl_km is not null then v_edl_km - r.km end,
                            'ecart_carburant_8', case when r.carburant_pct is not null and v_edl_carb is not null then v_edl_carb - round(r.carburant_pct / 12.5)::int end);
end $function$;

-- ── La caution ─────────────────────────────────────────────────────────────────────────

-- Demander la préautorisation au départ : le travail tavaro.caution {action: preautoriser} attend l'ouvrier du prestataire.
CREATE OR REPLACE FUNCTION public.loc_demander_preautorisation(p_contrat uuid, p_montant_eur numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'La caution se demande par l''agence.');
  c public.loc_contrats;
  v_montant numeric;
  v_id uuid;
begin
  select * into c from public.loc_contrats where client_id = v_client and id = p_contrat;
  if not found or not private.voit_entite(v_client, c.entite_id) then
    raise exception 'Contrat introuvable.' using errcode = 'P0002';
  end if;
  v_montant := round(coalesce(p_montant_eur, c.depot_eur), 2);
  if v_montant is null or v_montant <= 0 then
    raise exception 'Le montant de la caution est obligatoire (le contrat n''en porte pas).' using errcode = '22023';
  end if;
  begin
    insert into public.loc_cautions (client_id, entite_id, contrat_id, montant_eur, demande_par) values (v_client, c.entite_id, c.id, v_montant, (select auth.uid()))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Une caution est déjà en cours sur ce contrat.' using errcode = '23505';
  end;
  perform private.deposer_travail(v_client, 'tavaro', 'tavaro.caution', jsonb_build_object('caution', v_id, 'action', 'preautoriser', 'montant_eur', v_montant),
                                  'tavaro:caution:' || v_id::text || ':preautoriser', 1::smallint);
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.caution_demandee', 'loc_cautions', v_id::text,
    jsonb_build_object('contrat', c.numero, 'montant', v_montant, 'par', (select auth.uid())), c.entite_id);
  return jsonb_build_object('caution', v_id, 'statut', 'demandee', 'montant_eur', v_montant);
end $function$;

-- Capturer tout ou partie de la caution pour régler une facture du contrat : direction ou valideur, jamais plus que la
-- préautorisation ni que ce qui reste dû sur la facture.
CREATE OR REPLACE FUNCTION public.loc_capturer_caution(p_caution uuid, p_facture uuid, p_montant_eur numeric, p_motif text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur'], 'Une caution se capture par la direction ou un valideur.');
  k public.loc_cautions;
  f public.loc_factures;
begin
  select * into k from public.loc_cautions where client_id = v_client and id = p_caution for update;
  if not found or not private.voit_entite(v_client, k.entite_id) then
    raise exception 'Caution introuvable.' using errcode = 'P0002';
  end if;
  if k.statut <> 'preautorisee' then
    raise exception 'Une caution se capture une fois préautorisée (statut : %).', k.statut using errcode = '23514';
  end if;
  if k.expire_le is not null and k.expire_le < now() then
    raise exception 'La préautorisation a expiré le % : demandez le règlement de la facture.', private.loc_heure_locale(k.expire_le, k.client_id, k.entite_id, 'DD/MM/YYYY') using errcode = '23514';
  end if;
  select * into f from public.loc_factures where client_id = v_client and id = p_facture;
  if not found or f.contrat_id <> k.contrat_id then
    raise exception 'La facture doit être une facture de ce contrat.' using errcode = '22023';
  end if;
  if f.statut in ('reglee', 'avoir') then
    raise exception 'Cette facture n''est plus due (%).', f.statut using errcode = '23514';
  end if;
  if p_montant_eur is null or p_montant_eur <= 0 or p_montant_eur > k.montant_eur or p_montant_eur > f.total_ttc then
    raise exception 'Le montant capturé est positif, et ne dépasse ni la caution (% €) ni la facture (% €).', k.montant_eur, f.total_ttc using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(p_motif, ''))) < 5 then
    raise exception 'Le motif est obligatoire (cinq caractères au moins).' using errcode = '22023';
  end if;
  update public.loc_cautions set statut = 'capture_demandee', capture_demandee_eur = round(p_montant_eur, 2), capture_facture_id = f.id, capture_motif = left(btrim(p_motif), 500)
   where id = k.id;
  perform private.deposer_travail(v_client, 'tavaro', 'tavaro.caution', jsonb_build_object('caution', k.id, 'action', 'capturer', 'montant_eur', round(p_montant_eur, 2),
                                  'reference_externe', k.reference_externe), 'tavaro:caution:' || k.id::text || ':capturer', 1::smallint);
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.caution_capture_demandee', 'loc_cautions', k.id::text,
    jsonb_build_object('facture', f.reference, 'montant', round(p_montant_eur, 2), 'motif', left(btrim(p_motif), 500), 'par', (select auth.uid())), k.entite_id);
  return jsonb_build_object('caution', k.id, 'statut', 'capture_demandee');
end $function$;

-- Libérer la caution (retour sans frais, ou reste après capture) : l'agence.
CREATE OR REPLACE FUNCTION public.loc_liberer_caution(p_caution uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'Une caution se libère par l''agence.');
  k public.loc_cautions;
begin
  select * into k from public.loc_cautions where client_id = v_client and id = p_caution for update;
  if not found or not private.voit_entite(v_client, k.entite_id) then
    raise exception 'Caution introuvable.' using errcode = 'P0002';
  end if;
  if k.statut not in ('preautorisee', 'capturee') then
    raise exception 'Cette caution n''est pas à libérer (statut : %).', k.statut using errcode = '23514';
  end if;
  update public.loc_cautions set statut = 'liberation_demandee' where id = k.id;
  perform private.deposer_travail(v_client, 'tavaro', 'tavaro.caution', jsonb_build_object('caution', k.id, 'action', 'liberer', 'reference_externe', k.reference_externe),
                                  'tavaro:caution:' || k.id::text || ':liberer', 1::smallint);
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.caution_liberation_demandee', 'loc_cautions', k.id::text, jsonb_build_object('par', (select auth.uid())), k.entite_id);
  return jsonb_build_object('caution', k.id, 'statut', 'liberation_demandee');
end $function$;

-- PORTE DU PRESTATAIRE DE PAIEMENT (service seul) : le résultat de chaque action.
-- p_evenement : {type: preautorisee|capturee|liberee|expiree|echec, prestataire, reference_externe?, expire_le?, montant_eur?, erreur?}
CREATE OR REPLACE FUNCTION public.loc_caution_evenement(p_caution uuid, p_evenement jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  k public.loc_cautions;
  v_type text := p_evenement ->> 'type';
  v_statut text;
begin
  select * into k from public.loc_cautions where id = p_caution for update;
  if not found then
    raise exception 'Caution introuvable.' using errcode = 'P0002';
  end if;
  v_statut := case v_type
    when 'preautorisee' then case when k.statut = 'demandee' then 'preautorisee' end
    when 'capturee' then case when k.statut = 'capture_demandee' then 'capturee' end
    when 'liberee' then case when k.statut in ('liberation_demandee', 'preautorisee') then 'liberee' end
    when 'expiree' then case when k.statut in ('preautorisee', 'capture_demandee', 'liberation_demandee') then 'expiree' end
    -- un échec de capture laisse la préautorisation en place ; un échec de demande ou de libération se signale
    when 'echec' then case k.statut when 'demandee' then 'echec' when 'capture_demandee' then 'preautorisee' when 'liberation_demandee' then 'echec' end end;
  if v_type not in ('preautorisee', 'capturee', 'liberee', 'expiree', 'echec') then
    raise exception 'Événement inconnu : preautorisee, capturee, liberee, expiree ou echec.' using errcode = '22023';
  end if;
  if v_statut is null then
    -- un événement rejoué ou hors d'ordre ne défait rien : il est seulement noté
    update public.loc_cautions set evenements = evenements || jsonb_build_array(jsonb_build_object('le', now(), 'type', v_type, 'ignore', true)) where id = k.id;
    return jsonb_build_object('caution', k.id, 'statut', k.statut, 'ignore', true);
  end if;
  update public.loc_cautions
     set statut = v_statut, prestataire = coalesce(left(p_evenement ->> 'prestataire', 60), prestataire),
         reference_externe = coalesce(left(p_evenement ->> 'reference_externe', 120), reference_externe),
         preautorisee_le = case when v_statut = 'preautorisee' then now() else preautorisee_le end,
         expire_le = coalesce(nullif(p_evenement ->> 'expire_le', '')::timestamptz, expire_le),
         capture_eur = case when v_statut = 'capturee' then coalesce(nullif(p_evenement ->> 'montant_eur', '')::numeric, capture_demandee_eur) else capture_eur end,
         capturee_le = case when v_statut = 'capturee' then now() else capturee_le end,
         liberee_le = case when v_statut = 'liberee' then now() else liberee_le end,
         erreur = case when v_type = 'echec' then left(p_evenement ->> 'erreur', 500) else erreur end,
         capture_demandee_eur = case when v_type = 'echec' and k.statut = 'capture_demandee' then null else capture_demandee_eur end,
         capture_facture_id = case when v_type = 'echec' and k.statut = 'capture_demandee' then null else capture_facture_id end,
         evenements = evenements || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('le', now(), 'type', v_type, 'reference', p_evenement ->> 'reference_externe')))
   where id = k.id;
  if v_type in ('capturee', 'echec', 'expiree') then
    perform private.lever_alerte_module(k.client_id, 'tavaro', case v_type when 'capturee' then 'info' else 'attention' end,
      case v_type
        when 'capturee' then format('%s € capturés sur la caution : marquez la facture réglée (mode dépôt de garantie), puis libérez le reste.', coalesce(p_evenement ->> 'montant_eur', k.capture_demandee_eur::text))
        when 'expiree' then 'Une préautorisation de caution a expiré : la caution n''est plus garantie.'
        else format('L''opération de caution a échoué : %s', coalesce(left(p_evenement ->> 'erreur', 200), 'sans détail du prestataire')) end,
      jsonb_build_object('caution', k.id), 'caution:' || v_type || ':' || k.id::text || ':' || jsonb_array_length(k.evenements), true, k.demande_par);
  end if;
  perform private.journaliser_module(k.client_id, 'tavaro', 'tavaro.caution_' || v_type, 'loc_cautions', k.id::text,
    jsonb_build_object('type', v_type, 'prestataire', p_evenement ->> 'prestataire'), k.entite_id);
  return jsonb_build_object('caution', k.id, 'statut', v_statut);
end $function$;

revoke all on function public.loc_poser_grille_assistance(jsonb) from public, anon;
revoke all on function public.loc_clore_incident(uuid, text, boolean) from public, anon;
revoke all on function public.loc_releve_au_retour(uuid) from public, anon;
revoke all on function public.loc_demander_preautorisation(uuid, numeric) from public, anon;
revoke all on function public.loc_capturer_caution(uuid, uuid, numeric, text) from public, anon;
revoke all on function public.loc_liberer_caution(uuid) from public, anon;
grant execute on function public.loc_poser_grille_assistance(jsonb) to authenticated, service_role;
grant execute on function public.loc_clore_incident(uuid, text, boolean) to authenticated, service_role;
grant execute on function public.loc_releve_au_retour(uuid) to authenticated, service_role;
grant execute on function public.loc_demander_preautorisation(uuid, numeric) to authenticated, service_role;
grant execute on function public.loc_capturer_caution(uuid, uuid, numeric, text) to authenticated, service_role;
grant execute on function public.loc_liberer_caution(uuid) to authenticated, service_role;
-- les portes des fournisseurs : service seul
revoke all on function public.loc_assistance_ouvrir(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.loc_assistance_evenement(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.loc_enregistrer_releves_constructeur(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.loc_caution_evenement(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.loc_assistance_ouvrir(uuid, jsonb) to service_role;
grant execute on function public.loc_assistance_evenement(uuid, jsonb) to service_role;
grant execute on function public.loc_enregistrer_releves_constructeur(uuid, text, jsonb) to service_role;
grant execute on function public.loc_caution_evenement(uuid, jsonb) to service_role;
