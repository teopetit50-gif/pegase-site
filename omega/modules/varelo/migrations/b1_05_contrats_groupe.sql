-- b1_05 — VARELO : les contrats du groupe à dénoncer (session B1, vague 3, manque n° 2, 06/10/2026)
-- Pose : coordinateur, recette ygwbgpowzlbdaajlsqkn, puis production. Après b1_04.
--
-- CE QUE ÇA CORRIGE (omega/NOTES-B1.md, « Vague 3 », n° 2). /secteurs/groupes promet « les contrats du
-- groupe à reconduction tacite, chacun avec sa date limite de dénonciation » ; aucune table grp_* ne
-- porte un contrat. Un contrat à durée déterminée que personne ne dénonce à temps se reconduit et
-- produit un nouveau contrat (art. 1215 C. civ.) : une année de plus chez un prestataire qu'on voulait
-- quitter, souvent dans plusieurs sociétés du groupe à la fois.
--
-- CE QUI EST POSÉ.
--   · public.grp_contrats : un contrat d'une société du groupe, rattaché si possible à un objet du
--     référentiel (le fournisseur ou le client du groupe), avec son échéance, son mode de reconduction
--     (tacite, expresse, aucune), la durée d'une reconduction, le préavis (en jours ou en mois), le
--     montant annuel. Statut : actif → denonce (la dénonciation est partie) | archive (n'est plus suivi).
--   · vue public.grp_contrats_echeancier (security_invoker) : l'échéance COURANTE (un contrat tacite
--     dont l'échéance est passée sans dénonciation a été reconduit : l'échéance avance d'une durée de
--     reconduction jusqu'à aujourd'hui), la date limite de dénonciation (échéance − préavis), les jours
--     restants, l'état du délai (depasse | urgent ≤ 30 j | bientot ≤ 90 j | large | sans_objet), et le
--     nombre de contrats actifs du même tiers dans tout le groupe (une négociation groupe à mener).
--   · portes : grp_enregistrer_contrat (créer ou corriger ; toute personne de la société, sauf lecteur),
--     grp_denoncer_contrat (gérant, admin, valideur de la direction juridique ou financière : la
--     dénonciation est partie, à telle date ; hors délai si après la date limite), grp_archiver_contrat
--     (gérant, admin).
--   · contrôle quotidien (cron varelo-contrats, 5 h 17) et après chaque écriture : une alerte par contrat
--     tacite actif dont la date limite tombe dans les 30 jours (« attention », « critique » à 7 jours),
--     clé varelo:contrats.<id>, fermée d'elle-même quand le contrat est dénoncé, archivé ou reconduit.
--   · journal opposable : varelo.contrat.enregistre, varelo.contrat.denonce, varelo.contrat.archive.
--
-- Règles de pose : create … if not exists / create or replace ; jamais de suppression (un contrat suivi
-- pour rien passe archive). Nouvelle table : revoke all puis SELECT. Fonctions de private : EXECUTE
-- retiré à PUBLIC et anon ; rendu à authenticated pour les trois appelées par les portes publiques.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Table
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.grp_contrats (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  nature text,
  objet_id uuid,
  tiers text,
  intitule text not null,
  reference text,
  categorie text not null default 'autre',
  date_debut date,
  date_echeance date not null,
  reconduction text not null default 'tacite',
  duree_reconduction_mois smallint not null default 12,
  preavis_valeur smallint not null default 3,
  preavis_unite text not null default 'mois',
  montant_annuel numeric(16,2),
  notes text,
  statut text not null default 'actif',
  denonce_le date,
  denonce_par uuid,
  motif text,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint grp_contrats_client_id_id_key unique (client_id, id),
  constraint grp_contrats_societe_fkey foreign key (client_id, entite_id) references public.grp_societes(client_id, entite_id) on delete cascade,
  constraint grp_contrats_objet_fkey foreign key (objet_id, client_id, nature) references public.grp_ref_objets(id, client_id, nature),
  constraint grp_contrats_nature_check check (nature in ('fournisseur', 'client')),
  constraint grp_contrats_tiers_present check (objet_id is not null or coalesce(char_length(btrim(tiers)), 0) >= 1),
  constraint grp_contrats_objet_nature check (objet_id is null or nature is not null),
  constraint grp_contrats_tiers_check check (char_length(tiers) <= 200),
  constraint grp_contrats_intitule_check check (char_length(btrim(intitule)) between 1 and 200),
  constraint grp_contrats_reference_check check (char_length(reference) <= 80),
  constraint grp_contrats_categorie_check check (categorie in ('maintenance', 'location', 'assurance', 'abonnement', 'prestation', 'fourniture', 'bail', 'licence', 'autre')),
  constraint grp_contrats_reconduction_check check (reconduction in ('tacite', 'expresse', 'aucune')),
  constraint grp_contrats_duree_check check (duree_reconduction_mois between 1 and 120),
  constraint grp_contrats_preavis_check check (preavis_valeur between 0 and 730),
  constraint grp_contrats_preavis_unite_check check (preavis_unite in ('jours', 'mois')),
  constraint grp_contrats_montant_check check (montant_annuel >= 0),
  constraint grp_contrats_debut_avant_echeance check (date_debut is null or date_debut <= date_echeance),
  constraint grp_contrats_notes_check check (char_length(notes) <= 2000),
  constraint grp_contrats_statut_check check (statut in ('actif', 'denonce', 'archive')),
  constraint grp_contrats_denonce_date check (statut <> 'denonce' or denonce_le is not null),
  constraint grp_contrats_motif_check check (char_length(motif) <= 500)
);
comment on table public.grp_contrats is 'VARELO — un contrat d''une société du groupe : échéance, reconduction, préavis, tiers du référentiel. Écrit par les portes grp_enregistrer_contrat, grp_denoncer_contrat, grp_archiver_contrat ; rien ne s''efface.';

create index if not exists grp_contrats_client_idx on public.grp_contrats (client_id, statut, date_echeance);
create index if not exists grp_contrats_objet_idx on public.grp_contrats (client_id, objet_id) where objet_id is not null;

create or replace trigger grp_contrats_tracer after insert or update on public.grp_contrats
  for each row execute function private.tracer();

alter table public.grp_contrats enable row level security;
revoke all on public.grp_contrats from anon, authenticated;
grant select on public.grp_contrats to authenticated;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'grp_contrats'
                 and policyname = 'membres lisent les contrats de leur perimetre') then
    create policy "membres lisent les contrats de leur perimetre" on public.grp_contrats
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Les dates d'un contrat
-- ─────────────────────────────────────────────────────────────────────────

-- L'échéance courante : un contrat tacite, actif, dont l'échéance est passée a été reconduit
-- (art. 1215 C. civ.) ; on avance d'une durée de reconduction jusqu'à atteindre p_jour.
create or replace function private.grp_contrat_echeance(p_echeance date, p_reconduction text, p_duree_mois integer,
                                                        p_statut text, p_jour date)
 returns date
 language plpgsql
 immutable
 set search_path to ''
as $function$
declare
  d date := p_echeance;
  n integer := 0;
begin
  if p_reconduction <> 'tacite' or p_statut <> 'actif' or p_duree_mois is null or p_duree_mois < 1 then
    return p_echeance;
  end if;
  while d < p_jour and n < 1200 loop
    d := (p_echeance + make_interval(months => p_duree_mois * (n + 1)))::date;
    n := n + 1;
  end loop;
  return d;
end $function$;

create or replace function private.grp_contrat_limite(p_echeance date, p_valeur integer, p_unite text)
 returns date
 language sql
 immutable
 set search_path to ''
as $function$
  select case when p_unite = 'mois' then (p_echeance - make_interval(months => p_valeur))::date
              else p_echeance - p_valeur end
$function$;

create or replace view public.grp_contrats_echeancier with (security_invoker = true) as
  with c as (
    select k.*, private.grp_contrat_echeance(k.date_echeance, k.reconduction, k.duree_reconduction_mois, k.statut, current_date) as echeance_courante
    from public.grp_contrats k
  ), d as (
    select c.*, private.grp_contrat_limite(c.echeance_courante, c.preavis_valeur, c.preavis_unite) as date_limite
    from c
  )
  select d.id, d.client_id, d.entite_id, e.nom as societe, d.nature, d.objet_id, o.code_groupe,
         coalesce(o.nom_groupe, d.tiers) as tiers, d.intitule, d.reference, d.categorie, d.date_debut,
         d.date_echeance, d.echeance_courante, (d.echeance_courante > d.date_echeance) as reconduit,
         d.reconduction, d.duree_reconduction_mois, d.preavis_valeur, d.preavis_unite, d.date_limite,
         (d.date_limite - current_date) as jours_restants,
         case
           when d.statut <> 'actif' or d.reconduction = 'aucune' then 'sans_objet'
           when d.date_limite < current_date then 'depasse'
           when d.date_limite - current_date <= 30 then 'urgent'
           when d.date_limite - current_date <= 90 then 'bientot'
           else 'large'
         end as etat_delai,
         d.montant_annuel, d.notes, d.statut, d.denonce_le, d.denonce_par, d.motif, d.cree_par, d.cree_le, d.maj_le,
         (select count(*) from public.grp_contrats x
          where x.client_id = d.client_id and x.objet_id = d.objet_id and x.statut = 'actif')::integer as contrats_du_tiers,
         (select count(distinct x.entite_id) from public.grp_contrats x
          where x.client_id = d.client_id and x.objet_id = d.objet_id and x.statut = 'actif')::integer as societes_du_tiers
  from d
  join public.entites e on e.client_id = d.client_id and e.id = d.entite_id
  left join public.grp_ref_objets o on o.client_id = d.client_id and o.id = d.objet_id;
comment on view public.grp_contrats_echeancier is 'VARELO — les contrats du groupe avec leur échéance courante (reconduction tacite comprise), la date limite de dénonciation, les jours restants et l''état du délai ; contrats_du_tiers : contrats actifs du même tiers dans le groupe (dans le périmètre de la personne).';

revoke all on public.grp_contrats_echeancier from anon, authenticated;
grant select on public.grp_contrats_echeancier to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Le contrôle des délais : une alerte par contrat dont la date limite approche
-- ─────────────────────────────────────────────────────────────────────────

create or replace function private.grp_controler_contrats(p_client uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_levees integer := 0;
  v_closes integer := 0;
  v_id uuid;
  v_niveau text;
begin
  perform set_config('omega.module', 'varelo', true);
  for r in
    select x.* from public.grp_contrats_echeancier x
    where x.client_id = p_client and x.statut = 'actif' and x.reconduction = 'tacite'
      and x.date_limite >= current_date and x.date_limite - current_date <= 30
  loop
    v_niveau := case when r.jours_restants <= 7 then 'critique' else 'attention' end;
    -- une alerte « attention » ouverte qui passe à 7 jours est remplacée par une « critique »
    if v_niveau = 'critique' and exists (select 1 from public.alertes a
               where a.client_id = p_client and a.acquittee_le is null and a.niveau = 'attention'
                 and a.cle_regroupement = 'varelo:contrats.' || r.id::text) then
      perform private.fermer_alertes_releve(p_client, 'varelo', 'contrats.' || r.id::text, 'la date limite est à moins de 7 jours');
    end if;
    if not exists (select 1 from public.alertes a
                   where a.client_id = p_client and a.acquittee_le is null
                     and a.cle_regroupement = 'varelo:contrats.' || r.id::text) then
      v_id := private.lever_alerte_module(p_client, 'varelo', v_niveau,
        left(format('Contrat à dénoncer avant le %s : %s (%s)', to_char(r.date_limite, 'DD/MM/YYYY'), r.intitule, r.tiers), 200),
        jsonb_build_object('contrat_id', r.id, 'societe', r.societe, 'tiers', r.tiers, 'intitule', r.intitule,
                           'echeance', r.echeance_courante, 'date_limite', r.date_limite, 'jours_restants', r.jours_restants,
                           'montant_annuel', r.montant_annuel, 'contrats_du_tiers', r.contrats_du_tiers),
        'contrats.' || r.id::text, true);
      if v_id is not null then
        v_levees := v_levees + 1;
      end if;
    end if;
  end loop;
  -- ferme les alertes des contrats dénoncés, archivés, ou dont la date limite est passée (reconduits)
  for r in
    select a.cle_regroupement from public.alertes a
    where a.client_id = p_client and a.acquittee_le is null and a.cle_regroupement like 'varelo:contrats.%'
      and not exists (select 1 from public.grp_contrats_echeancier x
                      where x.client_id = p_client and x.statut = 'actif' and x.reconduction = 'tacite'
                        and x.date_limite >= current_date and x.date_limite - current_date <= 30
                        and 'varelo:contrats.' || x.id::text = a.cle_regroupement)
  loop
    v_closes := v_closes + private.fermer_alertes_releve(p_client, 'varelo', substr(r.cle_regroupement, char_length('varelo:') + 1),
                                                         'le contrat est dénoncé, archivé ou son délai est passé');
  end loop;
  return jsonb_build_object('alertes_levees', v_levees, 'alertes_closes', v_closes);
end $function$;

-- le passage quotidien, pour chaque groupe qui suit des contrats
create or replace function private.grp_controler_contrats_tous()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c uuid;
  n integer := 0;
begin
  for c in select distinct k.client_id from public.grp_contrats k where k.statut = 'actif' loop
    begin
      perform private.grp_controler_contrats(c);
      n := n + 1;
    exception when others then
      raise warning 'varelo-contrats : client % : %', c, sqlerrm;
    end;
  end loop;
  return n;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Les portes
-- ─────────────────────────────────────────────────────────────────────────

-- Créer (p_contrat nul) ou corriger un contrat. Champs : intitule, reference, categorie, objet_id ou tiers,
-- date_debut, date_echeance, reconduction, duree_reconduction_mois, preavis_valeur, preavis_unite,
-- montant_annuel, notes. Un champ absent garde sa valeur (correction) ou prend la valeur par défaut.
create or replace function private.grp_enregistrer_contrat(p_client uuid, p_entite uuid, p_champs jsonb, p_contrat uuid default null::uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_avant public.grp_contrats;
  v_objet public.grp_ref_objets;
  v_id uuid;
  f jsonb := coalesce(p_champs, '{}'::jsonb);
  v_texte text;
  v_date date;
  v_nombre numeric;
  v_entite uuid := p_entite;
begin
  perform private.grp_exiger_installation(p_client);
  if jsonb_typeof(f) <> 'object' then
    raise exception 'Les champs d''un contrat se donnent en objet JSON.' using errcode = '22023';
  end if;
  if p_contrat is not null then
    select * into v_avant from public.grp_contrats k where k.id = p_contrat and k.client_id = p_client;
    if v_avant.id is null then
      raise exception 'Contrat introuvable.' using errcode = 'P0002';
    end if;
    if v_avant.statut = 'archive' then
      raise exception 'Ce contrat est archivé : il ne se corrige plus.' using errcode = '22023';
    end if;
    v_entite := coalesce(p_entite, v_avant.entite_id);
  end if;
  if v_uid is not null then
    if not private.a_un_role(p_client, array['gerant', 'admin', 'valideur', 'collaborateur']) then
      raise exception 'Un contrat s''enregistre par une personne de l''organisation (pas un lecteur).' using errcode = '42501';
    end if;
    if not private.voit_entite(p_client, v_entite) or (v_avant.id is not null and not private.voit_entite(p_client, v_avant.entite_id)) then
      raise exception 'Cette société est hors de votre périmètre.' using errcode = '42501';
    end if;
  end if;
  if not exists (select 1 from public.grp_societes s where s.client_id = p_client and s.entite_id = v_entite) then
    raise exception 'Cette entité n''est pas une société du groupe inscrite dans Varelo.' using errcode = '22023';
  end if;
  -- le tiers : un objet du référentiel (fournisseur ou client du groupe), sinon un libellé
  if f ? 'objet_id' and nullif(f ->> 'objet_id', '') is not null then
    begin
      select * into v_objet from public.grp_ref_objets o where o.id = (f ->> 'objet_id')::uuid and o.client_id = p_client;
    exception when invalid_text_representation then
      raise exception 'Identifiant d''objet illisible.' using errcode = '22023';
    end;
    if v_objet.id is null or v_objet.nature not in ('fournisseur', 'client') or v_objet.statut <> 'actif' then
      raise exception 'Le tiers d''un contrat est un fournisseur ou un client actif du référentiel du groupe.' using errcode = '22023';
    end if;
  end if;
  perform set_config('omega.module', 'varelo', true);
  begin
    if p_contrat is null then
      insert into public.grp_contrats (client_id, entite_id, nature, objet_id, tiers, intitule, reference, categorie, date_debut,
        date_echeance, reconduction, duree_reconduction_mois, preavis_valeur, preavis_unite, montant_annuel, notes, cree_par)
      values (p_client, v_entite, v_objet.nature, v_objet.id,
        left(nullif(btrim(f ->> 'tiers'), ''), 200),
        btrim(coalesce(f ->> 'intitule', '')),
        left(nullif(btrim(f ->> 'reference'), ''), 80),
        coalesce(nullif(f ->> 'categorie', ''), 'autre'),
        nullif(f ->> 'date_debut', '')::date,
        nullif(f ->> 'date_echeance', '')::date,
        coalesce(nullif(f ->> 'reconduction', ''), 'tacite'),
        coalesce(nullif(f ->> 'duree_reconduction_mois', '')::smallint, 12),
        coalesce(nullif(f ->> 'preavis_valeur', '')::smallint, 3),
        coalesce(nullif(f ->> 'preavis_unite', ''), 'mois'),
        round(nullif(f ->> 'montant_annuel', '')::numeric, 2),
        nullif(btrim(f ->> 'notes'), ''),
        v_uid)
      returning id into v_id;
    else
      update public.grp_contrats k set
        entite_id = v_entite,
        nature = case when f ? 'objet_id' then v_objet.nature else k.nature end,
        objet_id = case when f ? 'objet_id' then v_objet.id else k.objet_id end,
        tiers = case when f ? 'tiers' then left(nullif(btrim(f ->> 'tiers'), ''), 200) else k.tiers end,
        intitule = case when f ? 'intitule' then btrim(coalesce(f ->> 'intitule', '')) else k.intitule end,
        reference = case when f ? 'reference' then left(nullif(btrim(f ->> 'reference'), ''), 80) else k.reference end,
        categorie = case when f ? 'categorie' then coalesce(nullif(f ->> 'categorie', ''), 'autre') else k.categorie end,
        date_debut = case when f ? 'date_debut' then nullif(f ->> 'date_debut', '')::date else k.date_debut end,
        date_echeance = case when f ? 'date_echeance' then nullif(f ->> 'date_echeance', '')::date else k.date_echeance end,
        reconduction = case when f ? 'reconduction' then coalesce(nullif(f ->> 'reconduction', ''), 'tacite') else k.reconduction end,
        duree_reconduction_mois = case when f ? 'duree_reconduction_mois' then coalesce(nullif(f ->> 'duree_reconduction_mois', '')::smallint, 12) else k.duree_reconduction_mois end,
        preavis_valeur = case when f ? 'preavis_valeur' then coalesce(nullif(f ->> 'preavis_valeur', '')::smallint, 3) else k.preavis_valeur end,
        preavis_unite = case when f ? 'preavis_unite' then coalesce(nullif(f ->> 'preavis_unite', ''), 'mois') else k.preavis_unite end,
        montant_annuel = case when f ? 'montant_annuel' then round(nullif(f ->> 'montant_annuel', '')::numeric, 2) else k.montant_annuel end,
        notes = case when f ? 'notes' then nullif(btrim(f ->> 'notes'), '') else k.notes end,
        maj_le = now()
      where k.id = p_contrat
      returning k.id into v_id;
    end if;
  exception
    when not_null_violation then
      raise exception 'Un contrat a une date d''échéance (la fin de la période en cours).' using errcode = '22023';
    when check_violation then
      raise exception 'Contrat refusé : %', case
        when sqlerrm like '%tiers_present%' then 'il faut un tiers (un objet du référentiel ou un libellé).'
        when sqlerrm like '%intitule%' then 'l''intitulé fait 1 à 200 caractères.'
        when sqlerrm like '%categorie%' then 'catégorie inconnue.'
        when sqlerrm like '%reconduction_check%' then 'reconduction tacite, expresse ou aucune.'
        when sqlerrm like '%duree%' then 'une reconduction dure de 1 à 120 mois.'
        when sqlerrm like '%preavis_check%' then 'un préavis va de 0 à 730.'
        when sqlerrm like '%preavis_unite%' then 'un préavis se compte en jours ou en mois.'
        when sqlerrm like '%montant%' then 'le montant annuel est positif.'
        when sqlerrm like '%debut_avant%' then 'le début est avant l''échéance.'
        else sqlerrm end using errcode = '22023';
    when invalid_datetime_format or datetime_field_overflow or invalid_text_representation or numeric_value_out_of_range then
      raise exception 'Contrat refusé : une date ou un nombre est illisible (dates au format AAAA-MM-JJ).' using errcode = '22023';
  end;
  perform private.grp_journal(p_client, 'varelo.contrat.enregistre', 'grp_contrats', v_id::text,
    jsonb_build_object('creation', p_contrat is null, 'champs', f - 'notes'), v_entite);
  perform private.grp_controler_contrats(p_client);
  return v_id;
end $function$;

-- La dénonciation est partie (lettre recommandée, courriel, portail du prestataire) : à quelle date.
create or replace function private.grp_denoncer_contrat(p_contrat uuid, p_date date default current_date, p_motif text default null::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k public.grp_contrats;
  v_uid uuid := (select auth.uid());
  v_limite date;
  v_hors_delai boolean;
begin
  select * into k from public.grp_contrats where id = p_contrat;
  if k.id is null or (v_uid is not null and k.client_id not in (select private.mes_clients())) then
    raise exception 'Contrat introuvable.' using errcode = 'P0002';
  end if;
  if v_uid is not null and not (
       private.a_un_role(k.client_id, array['gerant', 'admin'])
       or (private.a_un_role(k.client_id, array['valideur'])
           and exists (select 1 from public.equipes e
                       where e.client_id = k.client_id and e.cle in ('direction_juridique', 'direction_financiere')
                         and private.dans_equipe(v_uid, e.id)))) then
    raise exception 'Une dénonciation se note par le gérant, l''administrateur, la direction juridique ou la direction financière.' using errcode = '42501';
  end if;
  if v_uid is not null and not private.voit_entite(k.client_id, k.entite_id) then
    raise exception 'Ce contrat est hors de votre périmètre.' using errcode = '42501';
  end if;
  if k.statut <> 'actif' then
    raise exception 'Ce contrat n''est plus actif (%).', k.statut using errcode = '22023';
  end if;
  if p_date is null or p_date > current_date then
    raise exception 'La date de dénonciation est celle où elle est partie : aujourd''hui ou avant.' using errcode = '22023';
  end if;
  select x.date_limite into v_limite from public.grp_contrats_echeancier x where x.id = k.id;
  v_hors_delai := k.reconduction = 'tacite' and p_date > v_limite;
  perform set_config('omega.module', 'varelo', true);
  update public.grp_contrats set statut = 'denonce', denonce_le = p_date, denonce_par = v_uid,
         motif = left(nullif(btrim(p_motif), ''), 500), maj_le = now()
  where id = k.id;
  perform private.grp_journal(k.client_id, 'varelo.contrat.denonce', 'grp_contrats', k.id::text,
    jsonb_build_object('intitule', k.intitule, 'date', p_date, 'date_limite', v_limite, 'hors_delai', v_hors_delai,
                       'motif', left(nullif(btrim(p_motif), ''), 500)), k.entite_id);
  perform private.grp_controler_contrats(k.client_id);
  return jsonb_build_object('contrat', k.id, 'denonce_le', p_date, 'date_limite', v_limite, 'hors_delai', v_hors_delai);
end $function$;

create or replace function private.grp_archiver_contrat(p_contrat uuid, p_motif text default null::text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k public.grp_contrats;
  v_uid uuid := (select auth.uid());
begin
  select * into k from public.grp_contrats where id = p_contrat;
  if k.id is null or (v_uid is not null and k.client_id not in (select private.mes_clients())) then
    raise exception 'Contrat introuvable.' using errcode = 'P0002';
  end if;
  if v_uid is not null and not private.a_un_role(k.client_id, array['gerant', 'admin']) then
    raise exception 'Un contrat s''archive par le gérant ou l''administrateur.' using errcode = '42501';
  end if;
  if k.statut = 'archive' then
    return;
  end if;
  perform set_config('omega.module', 'varelo', true);
  update public.grp_contrats set statut = 'archive', motif = coalesce(left(nullif(btrim(p_motif), ''), 500), motif), maj_le = now()
  where id = k.id;
  perform private.grp_journal(k.client_id, 'varelo.contrat.archive', 'grp_contrats', k.id::text,
    jsonb_build_object('intitule', k.intitule, 'statut_avant', k.statut, 'motif', left(nullif(btrim(p_motif), ''), 500)), k.entite_id);
  perform private.grp_controler_contrats(k.client_id);
end $function$;

-- Façades publiques (SECURITY INVOKER).
create or replace function public.grp_enregistrer_contrat(p_client uuid, p_entite uuid, p_champs jsonb, p_contrat uuid default null::uuid)
 returns uuid language sql set search_path to ''
as $function$ select private.grp_enregistrer_contrat(p_client, p_entite, p_champs, p_contrat) $function$;

create or replace function public.grp_denoncer_contrat(p_contrat uuid, p_date date default current_date, p_motif text default null::text)
 returns jsonb language sql set search_path to ''
as $function$ select private.grp_denoncer_contrat(p_contrat, p_date, p_motif) $function$;

create or replace function public.grp_archiver_contrat(p_contrat uuid, p_motif text default null::text)
 returns void language sql set search_path to ''
as $function$ select private.grp_archiver_contrat(p_contrat, p_motif) $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Droits d'exécution
-- ─────────────────────────────────────────────────────────────────────────

-- la vue appelle les deux fonctions de dates : quiconque lit la vue les exécute
revoke execute on function private.grp_contrat_echeance(date, text, integer, text, date) from public, anon;
revoke execute on function private.grp_contrat_limite(date, integer, text) from public, anon;
grant execute on function private.grp_contrat_echeance(date, text, integer, text, date) to authenticated, service_role;
grant execute on function private.grp_contrat_limite(date, integer, text) to authenticated, service_role;

revoke execute on function private.grp_controler_contrats(uuid) from public, anon, authenticated;
revoke execute on function private.grp_controler_contrats_tous() from public, anon, authenticated;
grant execute on function private.grp_controler_contrats(uuid) to service_role;
grant execute on function private.grp_controler_contrats_tous() to service_role;

revoke execute on function private.grp_enregistrer_contrat(uuid, uuid, jsonb, uuid) from public, anon;
revoke execute on function private.grp_denoncer_contrat(uuid, date, text) from public, anon;
revoke execute on function private.grp_archiver_contrat(uuid, text) from public, anon;
grant execute on function private.grp_enregistrer_contrat(uuid, uuid, jsonb, uuid) to authenticated, service_role;
grant execute on function private.grp_denoncer_contrat(uuid, date, text) to authenticated, service_role;
grant execute on function private.grp_archiver_contrat(uuid, text) to authenticated, service_role;

revoke execute on function public.grp_enregistrer_contrat(uuid, uuid, jsonb, uuid) from public, anon;
revoke execute on function public.grp_denoncer_contrat(uuid, date, text) from public, anon;
revoke execute on function public.grp_archiver_contrat(uuid, text) from public, anon;
grant execute on function public.grp_enregistrer_contrat(uuid, uuid, jsonb, uuid) to authenticated, service_role;
grant execute on function public.grp_denoncer_contrat(uuid, date, text) to authenticated, service_role;
grant execute on function public.grp_archiver_contrat(uuid, text) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Le passage quotidien (cron.schedule remplace un cron du même nom)
-- ─────────────────────────────────────────────────────────────────────────

select cron.schedule('varelo-contrats', '17 5 * * *', $cron$select private.grp_controler_contrats_tous()$cron$);
