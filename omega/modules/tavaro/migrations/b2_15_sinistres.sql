-- b2_15 — Sinistres et recours (module 18 ; session B2, 11/10/2026).
-- La promesse : « Chaque accident est suivi du constat au règlement, et le recours contre l'assureur du client est
-- préparé pour les jours d'immobilisation. » (et, dans l'Assistance : « Le dossier d'accident est ensuite suivi jusqu'au
-- règlement. »)
--
-- LE DOSSIER : ouvert depuis le contrat (ou le véhicule), avec le constat, le tiers et son assureur, la responsabilité ;
-- il avance (expertise, réparation, recours, réglé, clos) et garde son historique ; le véhicule immobilisé l'est par
-- b2_10 (motif sinistre). LE RECOURS (perte d'exploitation) : les jours où le véhicule n'a pas pu être loué — lus sur ses
-- immobilisations depuis le sinistre — multipliés par son tarif journalier moyen (les contrats de sa catégorie sur douze
-- mois), au prorata de la responsabilité du tiers ; le courrier part à l'assureur du tiers par le chemin de tout envoi
-- (validation comprise), et Tavaro relance à trente jours sans réponse.

create table if not exists public.loc_sinistres (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  entite_id uuid,
  contrat_id uuid,
  vehicule_id uuid not null,
  reference text not null,
  survenu_le timestamp with time zone not null,
  lieu text,
  nature text not null,
  responsabilite text not null default 'inconnue',
  description text,
  tiers jsonb not null default '{}'::jsonb,
  constat_piece_id uuid,
  statut text not null default 'ouvert',
  expert jsonb not null default '{}'::jsonb,
  montant_reparation_eur numeric(12,2),
  franchise_eur numeric(12,2),
  immobilisation_id uuid,
  recours jsonb,
  regle_le date,
  montant_recu_eur numeric(12,2),
  historique jsonb not null default '[]'::jsonb,
  cree_par uuid,
  cree_le timestamp with time zone not null default now(),
  maj_le timestamp with time zone not null default now(),
  constraint loc_sinistres_pkey primary key (id),
  constraint loc_sinistres_client_id_id_key unique (client_id, id),
  constraint loc_sinistres_reference_un unique (client_id, reference),
  constraint loc_sinistres_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_sinistres_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id),
  constraint loc_sinistres_contrat_fkey foreign key (client_id, contrat_id) references public.loc_contrats(client_id, id),
  constraint loc_sinistres_vehicule_fkey foreign key (client_id, vehicule_id) references public.loc_vehicules(client_id, id),
  constraint loc_sinistres_nature_check check (nature in ('accident', 'vol', 'vandalisme', 'bris_de_glace', 'incendie', 'catastrophe_naturelle', 'autre')),
  constraint loc_sinistres_responsabilite_check check (responsabilite in ('locataire', 'tiers', 'partagee', 'inconnue')),
  constraint loc_sinistres_statut_check check (statut in ('ouvert', 'expertise', 'reparation', 'recours', 'regle', 'clos')),
  constraint loc_sinistres_regle check (statut not in ('regle') or regle_le is not null),
  constraint loc_sinistres_objets check (jsonb_typeof(tiers) = 'object' and jsonb_typeof(expert) = 'object' and jsonb_typeof(historique) = 'array'),
  constraint loc_sinistres_textes check (char_length(lieu) <= 300 and char_length(description) <= 4000 and char_length(reference) <= 40),
  constraint loc_sinistres_montants check (montant_reparation_eur >= 0 and franchise_eur >= 0 and montant_recu_eur >= 0)
);
comment on table public.loc_sinistres is 'b2_15 : dossiers de sinistre du constat au règlement, et le recours pour les jours d''immobilisation';
create index if not exists loc_sinistres_ouverts on public.loc_sinistres (client_id, statut) where statut not in ('regle', 'clos');

alter table public.loc_sinistres enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_sinistres' and policyname = 'on voit les sinistres de son agence') then
    create policy "on voit les sinistres de son agence" on public.loc_sinistres for select to authenticated
      using (client_id in (select private.mes_clients())
             and (case when entite_id is null then private.a_un_role(client_id, array['gerant', 'admin', 'valideur'])
                       else private.voit_entite(client_id, entite_id) end));
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'loc_sinistres_toucher' and tgrelid = 'public.loc_sinistres'::regclass) then
    create trigger loc_sinistres_toucher before update on public.loc_sinistres for each row execute function private.loc_toucher();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'loc_sinistres_tracer' and tgrelid = 'public.loc_sinistres'::regclass) then
    -- liste blanche : le tiers (identité, police) ne part pas dans la trace
    create trigger loc_sinistres_tracer after insert or update on public.loc_sinistres for each row
      execute function private.tracer('+reference', '+vehicule_id', '+contrat_id', '+nature', '+responsabilite', '+statut', '+regle_le', '+montant_recu_eur');
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'loc_sinistres') then
    alter publication supabase_realtime add table public.loc_sinistres;
  end if;
end $$;
revoke all on table public.loc_sinistres from public, anon, authenticated;
grant select on table public.loc_sinistres to authenticated;
grant all on table public.loc_sinistres to service_role;

-- Un dossier vu par la personne connectée.
CREATE OR REPLACE FUNCTION private.loc_sinistre_de_l_agence(p_sinistre uuid, p_roles text[], p_refus text)
 RETURNS public.loc_sinistres
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(p_roles, p_refus);
  s public.loc_sinistres;
begin
  select * into s from public.loc_sinistres where client_id = v_client and id = p_sinistre;
  if not found or (s.entite_id is not null and not private.voit_entite(v_client, s.entite_id))
     or (s.entite_id is null and not private.a_un_role(v_client, array['gerant', 'admin', 'valideur'])) then
    raise exception 'Dossier de sinistre introuvable.' using errcode = 'P0002';
  end if;
  return s;
end $function$;

-- Ouvrir le dossier. p_valeurs : {contrat? | vehicule, survenu_le, nature, lieu?, description?, responsabilite?,
-- tiers? {nom, assureur, assureur_adresse, police, immatriculation, telephone}, immobilise? (bool), fin_prevue_le?}
CREATE OR REPLACE FUNCTION public.loc_ouvrir_sinistre(p_valeurs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'Un sinistre se déclare par l''agence.');
  c public.loc_contrats;
  v public.loc_vehicules;
  v_survenu timestamptz;
  v_entite uuid;
  v_id uuid;
  v_ref text;
  v_immo jsonb;
  v_n integer;
begin
  if jsonb_typeof(p_valeurs) is distinct from 'object' then
    raise exception 'Les valeurs sont un objet.' using errcode = '22023';
  end if;
  if coalesce(p_valeurs ->> 'nature', '') not in ('accident', 'vol', 'vandalisme', 'bris_de_glace', 'incendie', 'catastrophe_naturelle', 'autre') then
    raise exception 'Nature du sinistre inconnue.' using errcode = '22023';
  end if;
  if coalesce(p_valeurs ->> 'responsabilite', 'inconnue') not in ('locataire', 'tiers', 'partagee', 'inconnue') then
    raise exception 'Responsabilité inconnue : locataire, tiers, partagee ou inconnue.' using errcode = '22023';
  end if;
  begin
    v_survenu := (p_valeurs ->> 'survenu_le')::timestamptz;
  exception when others then
    raise exception 'Date du sinistre illisible.' using errcode = '22007';
  end;
  if v_survenu is null or v_survenu > now() + interval '1 hour' then
    raise exception 'La date du sinistre est obligatoire et passée.' using errcode = '22023';
  end if;
  if nullif(p_valeurs ->> 'contrat', '') is not null then
    select * into c from public.loc_contrats where client_id = v_client and id = (p_valeurs ->> 'contrat')::uuid;
    if not found or not private.voit_entite(c.client_id, c.entite_id) then
      raise exception 'Contrat introuvable.' using errcode = 'P0002';
    end if;
    if c.vehicule_id is null then
      raise exception 'Ce contrat n''a pas de véhicule.' using errcode = '23514';
    end if;
    select * into v from public.loc_vehicules where client_id = v_client and id = c.vehicule_id;
    v_entite := c.entite_id;
  else
    select * into v from public.loc_vehicules where client_id = v_client and id = nullif(p_valeurs ->> 'vehicule', '')::uuid;
    if not found then
      raise exception 'Un sinistre se rattache à un contrat ou à un véhicule.' using errcode = '22023';
    end if;
    v_entite := v.entite_id;
  end if;
  if jsonb_typeof(coalesce(p_valeurs -> 'tiers', '{}'::jsonb)) <> 'object' then
    raise exception 'Le tiers est un objet.' using errcode = '22023';
  end if;
  select count(*) + 1 into v_n from public.loc_sinistres s where s.client_id = v_client and extract(year from s.cree_le) = extract(year from now());
  v_ref := 'SIN-' || to_char(now(), 'YYYY') || '-' || lpad(v_n::text, 4, '0');
  insert into public.loc_sinistres (client_id, entite_id, contrat_id, vehicule_id, reference, survenu_le, lieu, nature, responsabilite, description, tiers, historique, cree_par)
  values (v_client, v_entite, c.id, v.id, v_ref, v_survenu, private.loc_lire_texte(p_valeurs, 'lieu', 300), p_valeurs ->> 'nature',
          coalesce(p_valeurs ->> 'responsabilite', 'inconnue'), private.loc_lire_texte(p_valeurs, 'description', 4000), coalesce(p_valeurs -> 'tiers', '{}'::jsonb),
          jsonb_build_array(jsonb_build_object('le', now(), 'statut', 'ouvert', 'par', (select auth.uid()))), (select auth.uid()))
  returning id into v_id;
  if coalesce((p_valeurs ->> 'immobilise')::boolean, false) then
    v_immo := public.loc_immobiliser(v.id, jsonb_build_object('motif', 'sinistre', 'debut_le', greatest(v_survenu, now() - interval '30 days'),
                                                             'fin_prevue_le', nullif(p_valeurs ->> 'fin_prevue_le', ''), 'notes', 'Sinistre ' || v_ref));
    update public.loc_sinistres set immobilisation_id = (v_immo ->> 'immobilisation')::uuid where id = v_id;
  end if;
  perform private.lever_alerte_module(v_client, 'tavaro', 'attention',
    format('Sinistre %s déclaré sur %s (%s) : le dossier est ouvert.', v_ref, v.immatriculation, replace(p_valeurs ->> 'nature', '_', ' ')),
    jsonb_build_object('sinistre', v_id), 'sinistre:ouvert:' || v_id::text, true, null);
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.sinistre_ouvert', 'loc_sinistres', v_id::text,
    jsonb_build_object('reference', v_ref, 'vehicule', v.immatriculation, 'nature', p_valeurs ->> 'nature', 'responsabilite', coalesce(p_valeurs ->> 'responsabilite', 'inconnue')), v_entite);
  return jsonb_build_object('sinistre', v_id, 'reference', v_ref, 'a_reaffecter', coalesce(v_immo -> 'a_reaffecter', '[]'::jsonb));
end $function$;

-- Faire avancer le dossier : expertise, réparation, recours, réglé, clos ; et compléter (tiers, expert, montants).
-- p_valeurs : {responsabilite?, tiers?, expert?, montant_reparation_eur?, franchise_eur?, regle_le?, montant_recu_eur?, note?}
CREATE OR REPLACE FUNCTION public.loc_avancer_sinistre(p_sinistre uuid, p_statut text, p_valeurs jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s public.loc_sinistres := private.loc_sinistre_de_l_agence(p_sinistre, array['gerant', 'admin', 'valideur', 'collaborateur'], 'Un sinistre se suit par l''agence.');
  v_statut text := coalesce(nullif(p_statut, ''), s.statut);
begin
  if v_statut not in ('ouvert', 'expertise', 'reparation', 'recours', 'regle', 'clos') then
    raise exception 'Étape inconnue.' using errcode = '22023';
  end if;
  if s.statut = 'clos' then
    raise exception 'Ce dossier est clos.' using errcode = '23514';
  end if;
  if v_statut in ('regle', 'clos') and not private.a_un_role(s.client_id, array['gerant', 'admin', 'valideur']) then
    raise exception 'Un dossier se règle ou se clôt par la direction ou un valideur.' using errcode = '42501';
  end if;
  if v_statut = 'regle' and nullif(p_valeurs ->> 'regle_le', '') is null and s.regle_le is null then
    raise exception 'La date du règlement est obligatoire.' using errcode = '22023';
  end if;
  if p_valeurs ? 'responsabilite' and p_valeurs ->> 'responsabilite' not in ('locataire', 'tiers', 'partagee', 'inconnue') then
    raise exception 'Responsabilité inconnue.' using errcode = '22023';
  end if;
  begin
    update public.loc_sinistres
       set statut = v_statut,
           responsabilite = coalesce(p_valeurs ->> 'responsabilite', responsabilite),
           tiers = case when jsonb_typeof(p_valeurs -> 'tiers') = 'object' then tiers || (p_valeurs -> 'tiers') else tiers end,
           expert = case when jsonb_typeof(p_valeurs -> 'expert') = 'object' then expert || (p_valeurs -> 'expert') else expert end,
           montant_reparation_eur = coalesce(round(nullif(p_valeurs ->> 'montant_reparation_eur', '')::numeric, 2), montant_reparation_eur),
           franchise_eur = coalesce(round(nullif(p_valeurs ->> 'franchise_eur', '')::numeric, 2), franchise_eur),
           regle_le = coalesce(nullif(p_valeurs ->> 'regle_le', '')::date, regle_le),
           montant_recu_eur = coalesce(round(nullif(p_valeurs ->> 'montant_recu_eur', '')::numeric, 2), montant_recu_eur),
           historique = historique || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('le', now(), 'statut', v_statut, 'par', (select auth.uid()),
                                                                                             'note', private.loc_lire_texte(p_valeurs, 'note', 500))))
     where id = s.id;
  exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
    raise exception 'Valeur illisible.' using errcode = '22023';
  when check_violation then
    raise exception 'Valeur refusée : %.', sqlerrm using errcode = '22023';
  end;
  perform private.journaliser_module(s.client_id, 'tavaro', 'tavaro.sinistre_avance', 'loc_sinistres', s.id::text,
    jsonb_build_object('reference', s.reference, 'de', s.statut, 'vers', v_statut, 'par', (select auth.uid())), s.entite_id);
  return jsonb_build_object('sinistre', s.id, 'statut', v_statut);
end $function$;

-- Préparer le recours pour les jours d'immobilisation, et l'envoyer à l'assureur du tiers (si l'adresse est connue et
-- l'envoi réglé ; sinon le courrier se télécharge). Direction ou valideur.
CREATE OR REPLACE FUNCTION public.loc_preparer_recours(p_sinistre uuid, p_envoyer boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s public.loc_sinistres := private.loc_sinistre_de_l_agence(p_sinistre, array['gerant', 'admin', 'valideur'], 'Le recours se prépare par la direction ou un valideur.');
  v public.loc_vehicules;
  v_jours numeric;
  v_tarif numeric;
  v_part numeric;
  v_montant numeric;
  v_nom_loueur text;
  v_courrier text;
  v_adresse text := nullif(btrim(coalesce(s.tiers ->> 'assureur_adresse', '')), '');
  v_envoi uuid;
  v_recours jsonb;
begin
  if s.responsabilite not in ('tiers', 'partagee') then
    raise exception 'Un recours se prépare quand le tiers est responsable, en tout ou en partie (responsabilité : %).', s.responsabilite using errcode = '23514';
  end if;
  if nullif(s.tiers ->> 'assureur', '') is null then
    raise exception 'L''assureur du tiers manque au dossier.' using errcode = '22023';
  end if;
  select * into v from public.loc_vehicules where client_id = s.client_id and id = s.vehicule_id;
  -- les jours où le véhicule n'a pas pu être loué : ses immobilisations depuis le sinistre (hors préparation)
  select coalesce(sum(extract(epoch from (least(coalesce(i.fin_le, now()), now()) - greatest(i.debut_le, s.survenu_le))) / 86400), 0)
    into v_jours
  from public.loc_immobilisations i
  where i.client_id = s.client_id and i.vehicule_id = s.vehicule_id and i.motif <> 'preparation' and coalesce(i.fin_le, now()) > s.survenu_le;
  v_jours := ceil(v_jours);
  -- son tarif journalier moyen : les contrats de sa catégorie sur douze mois, sinon les siens
  select avg(c.tarif_jour_eur) into v_tarif from public.loc_contrats c join public.loc_vehicules x on x.id = c.vehicule_id
  where c.client_id = s.client_id and x.categorie_id is not distinct from v.categorie_id and c.tarif_jour_eur is not null
    and c.depart_le > now() - interval '365 days' and c.statut <> 'annule';
  if v_tarif is null then
    raise exception 'Aucun tarif journalier connu pour cette catégorie : le recours ne peut pas être chiffré.' using errcode = '55000';
  end if;
  if v_jours < 1 then
    raise exception 'Aucun jour d''immobilisation depuis le sinistre : immobilisez le véhicule (carrosserie, sinistre) pour chiffrer le recours.' using errcode = '55000';
  end if;
  v_part := case s.responsabilite when 'tiers' then 1 else 0.5 end;
  v_montant := round(v_jours * v_tarif * v_part, 2);
  select coalesce(g.emetteur ->> 'nom', (select x.nom from public.clients x where x.id = s.client_id)) into v_nom_loueur from public.loc_reglages g where g.client_id = s.client_id;
  v_courrier := format(E'Objet : recours — perte d''exploitation du véhicule %s — sinistre du %s\nVotre assuré : %s%s\n\nMadame, Monsieur,\n\n'
                       'Le %s, le véhicule %s%s, appartenant à %s et loué à cette date, a été endommagé lors d''un sinistre dont votre assuré est %s.\n\n'
                       'Le véhicule n''a pas pu être loué pendant %s jour%s (immobilisation constatée du %s au %s). Sur la base de son tarif journalier moyen (%s € TTC, contrats de sa catégorie sur douze mois), '
                       'la perte d''exploitation s''élève à %s €%s.\n\nNous vous remercions de bien vouloir nous adresser votre règlement, ou votre position, sous trente jours. '
                       'Les justificatifs (constat, immobilisations, contrats) sont à votre disposition.\n\n%s\n',
                       v.immatriculation, private.loc_heure_locale(s.survenu_le, s.client_id, s.entite_id, 'DD/MM/YYYY'), coalesce(s.tiers ->> 'nom', 'non nommé'),
                       case when s.tiers ->> 'police' is not null then ', contrat n° ' || (s.tiers ->> 'police') else '' end,
                       private.loc_heure_locale(s.survenu_le, s.client_id, s.entite_id, 'DD/MM/YYYY'), v.immatriculation, case when v.modele is not null then ' (' || v.modele || ')' else '' end, v_nom_loueur,
                       case s.responsabilite when 'tiers' then 'reconnu responsable' else 'reconnu responsable pour moitié' end,
                       v_jours, case when v_jours > 1 then 's' else '' end, private.loc_heure_locale(s.survenu_le, s.client_id, s.entite_id, 'DD/MM/YYYY'), private.loc_heure_locale(now(), s.client_id, s.entite_id, 'DD/MM/YYYY'),
                       replace(round(v_tarif, 2)::text, '.', ','), replace(v_montant::text, '.', ','),
                       case when v_part < 1 then ' (la moitié, responsabilité partagée)' else '' end, coalesce(v_nom_loueur, ''));
  if coalesce(p_envoyer, false) then
    if v_adresse is null or v_adresse !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      raise exception 'L''adresse de courriel de l''assureur du tiers manque ou est fausse : complétez le dossier, ou téléchargez le courrier.' using errcode = '22023';
    end if;
    if (private.reglages_envois_effectifs(s.client_id, 'tavaro') ->> 'mode') is null then
      raise exception 'L''envoi par courriel n''est pas réglé pour votre organisation : téléchargez le courrier et envoyez-le vous-même.' using errcode = '55000';
    end if;
    v_envoi := private.preparer_envoi(s.client_id, 'tavaro', 'loc_sinistres', s.id::text, 'email',
      jsonb_build_object('adresse', v_adresse, 'nom', s.tiers ->> 'assureur', 'professionnel', true, 'langue', 'fr'), null, '{}'::jsonb,
      format('Recours — perte d''exploitation — %s — sinistre du %s', v.immatriculation, private.loc_heure_locale(s.survenu_le, s.client_id, s.entite_id, 'DD/MM/YYYY')), v_courrier, null,
      'tavaro:recours:' || s.id::text || ':' || v_montant::text, s.entite_id, true, false, null::timestamptz, '{}'::jsonb);
  end if;
  v_recours := jsonb_build_object('jours', v_jours, 'tarif_moyen', round(v_tarif, 2), 'part', v_part, 'montant', v_montant, 'courrier', v_courrier,
                                  'prepare_le', now(), 'envoi', v_envoi, 'envoye_le', case when v_envoi is not null then now() end);
  update public.loc_sinistres
     set recours = v_recours, statut = case when statut in ('ouvert', 'expertise', 'reparation') then 'recours' else statut end,
         historique = historique || jsonb_build_array(jsonb_build_object('le', now(), 'statut', 'recours', 'montant', v_montant, 'envoye', v_envoi is not null, 'par', (select auth.uid())))
   where id = s.id;
  perform private.journaliser_module(s.client_id, 'tavaro', 'tavaro.recours_prepare', 'loc_sinistres', s.id::text,
    jsonb_build_object('reference', s.reference, 'jours', v_jours, 'montant', v_montant, 'envoi', v_envoi), s.entite_id);
  return v_recours - 'courrier' || jsonb_build_object('sinistre', s.id, 'courrier', v_courrier);
end $function$;

-- Chaque matin : un recours envoyé sans règlement depuis trente jours est à relancer.
CREATE OR REPLACE FUNCTION private.loc_surveiller_sinistres(p_maintenant timestamp with time zone DEFAULT now())
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s record;
  n integer := 0;
begin
  for s in
    select x.* from public.loc_sinistres x
    where x.statut = 'recours' and x.recours is not null and coalesce((x.recours ->> 'envoye_le')::timestamptz, (x.recours ->> 'prepare_le')::timestamptz) < p_maintenant - interval '30 days'
  loop
    perform private.lever_alerte_module(s.client_id, 'tavaro', 'attention',
      format('Le recours du sinistre %s (%s €) attend la réponse de l''assureur depuis plus de trente jours : relancez-le.', s.reference, replace((s.recours ->> 'montant'), '.', ',')),
      jsonb_build_object('sinistre', s.id), 'sinistre:relance:' || s.id::text || ':' || to_char(p_maintenant, 'IYYY-IW'), true, null);
    n := n + 1;
  end loop;
  return n;
end $function$;

do $$ begin
  if not exists (select 1 from cron.job where jobname = 'tavaro-sinistres') then
    perform cron.schedule('tavaro-sinistres', '40 6 * * *', 'select private.loc_surveiller_sinistres()');
  end if;
end $$;

revoke all on function private.loc_sinistre_de_l_agence(uuid, text[], text) from public, anon, authenticated;
revoke all on function private.loc_surveiller_sinistres(timestamp with time zone) from public, anon, authenticated;
grant execute on function private.loc_surveiller_sinistres(timestamp with time zone) to service_role;
revoke all on function public.loc_ouvrir_sinistre(jsonb) from public, anon;
revoke all on function public.loc_avancer_sinistre(uuid, text, jsonb) from public, anon;
revoke all on function public.loc_preparer_recours(uuid, boolean) from public, anon;
grant execute on function public.loc_ouvrir_sinistre(jsonb) to authenticated, service_role;
grant execute on function public.loc_avancer_sinistre(uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.loc_preparer_recours(uuid, boolean) to authenticated, service_role;
