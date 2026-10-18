-- c4_07 — OFFLOAD : les échéances et les renouvellements (session C4, 06/10/2026)
--
-- CE QUE ÇA POSE (lib/produits/capacites/reprise.ts, famille « Échéances et renouvellements » et la ligne « Les
-- contrats et les équipements installés sont suivis jusqu'à leur échéance ») :
--   · public.offload_equipements : un équipement installé chez un compte (désignation, n° de série, site du client,
--     type d'entretien, périodicité en mois, nature réglementaire ou commerciale, dernière intervention). Importé
--     (jeu « equipements ») ou saisi. « Les équipements installés sont rattachés au compte qui les exploite. »
--   · public.offload_interventions : une intervention datée sur un équipement (jeu « interventions », ou saisie),
--     éventuellement faite AILLEURS (le client l'a fait faire par un autre) : « Une échéance déjà honorée ailleurs
--     sort du cycle dès que la date est connue. »
--   · public.offload_contrats : un contrat d'entretien (jeu « contrats », ou saisi), sa fin et sa reconduction
--     (tacite, expresse, aucune) : « Les contrats d'entretien qui s'éteignent faute de reconduction sont signalés. »
--   · public.offload_echeances : l'échéance de chaque équipement, DATÉE à partir de la dernière intervention
--     enregistrée (dernière intervention + périodicité), et celle de chaque contrat (sa fin). Statuts : a_venir,
--     a_valider (message en validation), prevenue, appel (pas de courriel : tâche d'appel), depassee (tombée sans
--     intervention connue : en attente, jamais relancée une seconde fois), honoree, honoree_ailleurs, close.
--   · le message, la SEMAINE QUI PRÉCÈDE (de J-7 à J-1, jamais le jour même), un seul par échéance, rédigé sans IA
--     depuis la fiche de l'équipement ; « contrôle réglementaire » ou « entretien » selon la nature ; par
--     preparer_envoi (validation, verrous, mode du socle) ; consentement d'un client existant (c4_06).
--   · le plafond au groupe : un message d'échéance par groupe et par semaine ; chaque entité garde ses échéances.
--   · « Un parc réparti sur plusieurs sites se lit site par site et en consolidé » : public.offload_parc(client).
--   · « Les échéances réglementaires sont distinguées des échéances commerciales » : colonne nature, message, point
--     du matin, écran.
--   · le cycle : private.offload_echeances_cycle(client, jour), enchaîné à la nuit et après chaque import ou saisie
--     d'intervention ; le point du matin ajoute ses lignes ; portes de saisie : offload_saisir_equipement,
--     offload_noter_intervention, offload_saisir_contrat ; lectures : offload_echeances_tableau, offload_parc_compte.
--
-- Règles de pose : create … if not exists, alter … add column if not exists, create or replace, insert … where not
-- exists. Aucun DROP, aucun DELETE.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Tables
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.offload_equipements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  compte_id uuid not null,
  ref text not null,
  designation text not null,
  site text,
  type_entretien text,
  periodicite_mois smallint not null default 12,
  nature text not null default 'commerciale',
  derniere_intervention date,
  mise_en_service date,
  statut text not null default 'actif',
  source text not null,
  jeu_id uuid,
  cle text,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint offload_equipements_client_id_id_key unique (client_id, id),
  constraint offload_equipements_une_ref unique (client_id, compte_id, ref),
  constraint offload_equipements_compte_fkey foreign key (client_id, compte_id) references public.offload_comptes(client_id, id) on delete cascade,
  constraint offload_equipements_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint offload_equipements_ref_check check (char_length(btrim(ref)) between 1 and 120),
  constraint offload_equipements_designation_check check (char_length(btrim(designation)) between 1 and 200),
  constraint offload_equipements_site_check check (char_length(site) <= 200),
  constraint offload_equipements_type_check check (char_length(type_entretien) <= 200),
  constraint offload_equipements_periodicite_check check (periodicite_mois between 1 and 120),
  constraint offload_equipements_nature_check check (nature in ('reglementaire', 'commerciale')),
  constraint offload_equipements_statut_check check (statut in ('actif', 'retire')),
  constraint offload_equipements_source_check check (source in ('import', 'saisie'))
);
comment on table public.offload_equipements is 'OFFLOAD — un équipement installé chez un compte, sur un site : périodicité, nature (réglementaire ou commerciale), dernière intervention.';

create table if not exists public.offload_interventions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  compte_id uuid not null,
  equipement_id uuid not null,
  le date not null,
  nature text not null default 'entretien',
  ailleurs boolean not null default false,
  reference text,
  source text not null,
  jeu_id uuid,
  cle text,
  saisi_par uuid,
  cree_le timestamptz not null default now(),
  constraint offload_interventions_client_id_id_key unique (client_id, id),
  constraint offload_interventions_une_cle unique (jeu_id, cle),
  constraint offload_interventions_equipement_fkey foreign key (client_id, equipement_id) references public.offload_equipements(client_id, id) on delete cascade,
  constraint offload_interventions_le_check check (le >= date '1990-01-01'),
  constraint offload_interventions_nature_check check (nature in ('entretien', 'controle', 'reparation', 'installation')),
  constraint offload_interventions_reference_check check (char_length(reference) <= 120),
  constraint offload_interventions_source_check check (source in ('import', 'saisie'))
);
comment on table public.offload_interventions is 'OFFLOAD — une intervention datée sur un équipement ; ailleurs = faite par un autre prestataire, déclarée par le client.';
create index if not exists offload_interventions_equipement_idx on public.offload_interventions (equipement_id, le desc);

create table if not exists public.offload_contrats (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  compte_id uuid not null,
  equipement_id uuid,
  numero text not null,
  libelle text,
  debut date,
  fin date not null,
  reconduction text not null default 'expresse',
  statut text not null default 'actif',
  source text not null,
  jeu_id uuid,
  cle text,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint offload_contrats_client_id_id_key unique (client_id, id),
  constraint offload_contrats_un_numero unique (client_id, numero),
  constraint offload_contrats_compte_fkey foreign key (client_id, compte_id) references public.offload_comptes(client_id, id) on delete cascade,
  constraint offload_contrats_equipement_fkey foreign key (client_id, equipement_id) references public.offload_equipements(client_id, id) on delete set null (equipement_id),
  constraint offload_contrats_numero_check check (char_length(btrim(numero)) between 1 and 120),
  constraint offload_contrats_libelle_check check (char_length(libelle) <= 300),
  constraint offload_contrats_reconduction_check check (reconduction in ('tacite', 'expresse', 'aucune')),
  constraint offload_contrats_statut_check check (statut in ('actif', 'reconduit', 'echu', 'resilie')),
  constraint offload_contrats_source_check check (source in ('import', 'saisie')),
  constraint offload_contrats_dates_check check (debut is null or debut <= fin)
);
comment on table public.offload_contrats is 'OFFLOAD — un contrat d''entretien d''un compte : sa fin et sa reconduction (tacite, expresse, aucune).';

create table if not exists public.offload_echeances (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  compte_id uuid not null,
  type text not null,
  equipement_id uuid,
  contrat_id uuid,
  nature text not null,
  due_le date not null,
  base_le date,
  statut text not null default 'a_venir',
  s_eteint boolean not null default false,
  envoi_id uuid,
  prevenue_le timestamptz,
  honoree_le date,
  motif text,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint offload_echeances_client_id_id_key unique (client_id, id),
  constraint offload_echeances_compte_fkey foreign key (client_id, compte_id) references public.offload_comptes(client_id, id) on delete cascade,
  constraint offload_echeances_equipement_fkey foreign key (client_id, equipement_id) references public.offload_equipements(client_id, id) on delete cascade,
  constraint offload_echeances_contrat_fkey foreign key (client_id, contrat_id) references public.offload_contrats(client_id, id) on delete cascade,
  constraint offload_echeances_envoi_fkey foreign key (client_id, envoi_id) references public.envois(client_id, id) on delete set null (envoi_id),
  constraint offload_echeances_type_check check (type in ('entretien', 'contrat')),
  constraint offload_echeances_objet check ((type = 'entretien' and equipement_id is not null and contrat_id is null)
                                         or (type = 'contrat' and contrat_id is not null)),
  constraint offload_echeances_nature_check check (nature in ('reglementaire', 'commerciale')),
  constraint offload_echeances_statut_check check (statut in ('a_venir', 'a_valider', 'prevenue', 'appel', 'depassee', 'honoree', 'honoree_ailleurs', 'close')),
  constraint offload_echeances_motif_check check (char_length(motif) <= 500)
);
comment on table public.offload_echeances is 'OFFLOAD — une échéance : l''entretien d''un équipement (dernière intervention + périodicité) ou la fin d''un contrat. Un seul message, la semaine qui précède ; tombée sans trace, elle reste en attente sans seconde relance.';
create unique index if not exists offload_echeances_une_entretien on public.offload_echeances (equipement_id, due_le) where type = 'entretien';
create unique index if not exists offload_echeances_une_contrat on public.offload_echeances (contrat_id, due_le) where type = 'contrat';
create index if not exists offload_echeances_client_idx on public.offload_echeances (client_id, statut, due_le);

alter table public.offload_taches add column if not exists echeance_id uuid;
create unique index if not exists offload_taches_une_par_echeance on public.offload_taches (echeance_id, type) where echeance_id is not null;

alter table public.offload_equipements enable row level security;
alter table public.offload_interventions enable row level security;
alter table public.offload_contrats enable row level security;
alter table public.offload_echeances enable row level security;
do $$
declare t text;
begin
  foreach t in array array['offload_equipements', 'offload_interventions', 'offload_contrats', 'offload_echeances'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'on lit dans son perimetre') then
      execute format('create policy "on lit dans son perimetre" on public.%I for select to authenticated '
                     'using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id))', t);
    end if;
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Les trois modèles d'export (clés sur des colonnes obligatoires seulement)
-- ─────────────────────────────────────────────────────────────────────────
insert into public.modeles_jeux (module, logiciel, code, version, libelle, motif_fichier, entetes, colonnes, cle, complet, seuil_anomalies, source)
select 'offload', 'tableur', 'equipements', 1, 'Parc installé (équipements suivis)',
       '^(equipements?|parc|installations?|materiels?)',
       array['Code client', 'N° de série'],
       $j${
         "compte_ref":            {"type": "texte", "obligatoire": true, "entetes": ["Code client", "N° client", "Code tiers", "Compte client"]},
         "ref":                   {"type": "texte", "obligatoire": true, "entetes": ["N° de série", "N° série", "Immatriculation", "N° équipement", "Référence équipement"]},
         "designation":           {"type": "texte", "obligatoire": true, "entetes": ["Équipement", "Désignation", "Modèle", "Matériel"]},
         "site":                  {"type": "texte", "facultative": true, "entetes": ["Site", "Adresse d'installation", "Lieu"]},
         "type_entretien":        {"type": "texte", "facultative": true, "entetes": ["Type d'entretien", "Entretien", "Prestation", "Contrôle"]},
         "periodicite_mois":      {"type": "texte", "facultative": true, "entetes": ["Périodicité (mois)", "Périodicité", "Fréquence"]},
         "nature":                {"type": "texte", "facultative": true, "entetes": ["Nature", "Réglementaire", "Obligation"]},
         "derniere_intervention": {"type": "date", "facultative": true, "entetes": ["Dernière intervention", "Dernier entretien", "Date du dernier entretien", "Dernier contrôle"]},
         "mise_en_service":       {"type": "date", "facultative": true, "entetes": ["Mise en service", "Date d'installation"]}
       }$j$::jsonb,
       array['compte_ref', 'ref'], false, 1.000,
       'Modèle générique OFFLOAD (C4, 06/10/2026) : le parc installé, un équipement par ligne. En-têtes à confirmer sur un vrai export.'
where not exists (select 1 from public.modeles_jeux m where m.module = 'offload' and m.logiciel = 'tableur' and m.code = 'equipements' and m.version = 1);

insert into public.modeles_jeux (module, logiciel, code, version, libelle, motif_fichier, entetes, colonnes, cle, complet, fenetre, seuil_anomalies, source)
select 'offload', 'tableur', 'interventions', 1, 'Interventions (fiches d''intervention)',
       '^(interventions?|fiches?|bons?[_ -]?d)',
       array['N° de série', 'Date d''intervention'],
       $j${
         "equipement_ref": {"type": "texte", "obligatoire": true, "entetes": ["N° de série", "N° série", "Immatriculation", "N° équipement"]},
         "date":           {"type": "date", "obligatoire": true, "entetes": ["Date d'intervention", "Date", "Date du passage"]},
         "compte_ref":     {"type": "texte", "facultative": true, "entetes": ["Code client", "N° client", "Code tiers"]},
         "nature":         {"type": "texte", "facultative": true, "entetes": ["Type", "Nature", "Type d'intervention"]},
         "reference":      {"type": "texte", "facultative": true, "entetes": ["N° intervention", "N° bon", "N° fiche", "Référence"]}
       }$j$::jsonb,
       array['equipement_ref', 'date'], false, '{"colonne": "date", "observee": true}'::jsonb, 1.000,
       'Modèle générique OFFLOAD (C4, 06/10/2026) : une intervention par ligne. En-têtes à confirmer sur un vrai export.'
where not exists (select 1 from public.modeles_jeux m where m.module = 'offload' and m.logiciel = 'tableur' and m.code = 'interventions' and m.version = 1);

insert into public.modeles_jeux (module, logiciel, code, version, libelle, motif_fichier, entetes, colonnes, cle, complet, seuil_anomalies, source)
select 'offload', 'tableur', 'contrats', 1, 'Contrats d''entretien',
       '^(contrats?)',
       array['N° contrat', 'Fin'],
       $j${
         "numero":         {"type": "texte", "obligatoire": true, "entetes": ["N° contrat", "Contrat", "Numéro de contrat"]},
         "compte_ref":     {"type": "texte", "obligatoire": true, "entetes": ["Code client", "N° client", "Code tiers"]},
         "fin":            {"type": "date", "obligatoire": true, "entetes": ["Fin", "Date de fin", "Échéance", "Fin de contrat"]},
         "debut":          {"type": "date", "facultative": true, "entetes": ["Début", "Date de début", "Prise d'effet"]},
         "libelle":        {"type": "texte", "facultative": true, "entetes": ["Libellé", "Objet", "Formule"]},
         "reconduction":   {"type": "texte", "facultative": true, "entetes": ["Reconduction", "Tacite reconduction", "Renouvellement"]},
         "equipement_ref": {"type": "texte", "facultative": true, "entetes": ["N° de série", "N° équipement", "Équipement"]}
       }$j$::jsonb,
       array['numero'], false, 1.000,
       'Modèle générique OFFLOAD (C4, 06/10/2026) : un contrat par ligne. En-têtes à confirmer sur un vrai export.'
where not exists (select 1 from public.modeles_jeux m where m.module = 'offload' and m.logiciel = 'tableur' and m.code = 'contrats' and m.version = 1);

-- Les branchements déjà posés reçoivent les trois nouveaux jeux (copie du modèle).
do $$
declare b record; c text;
begin
  for b in select x.id from public.branchements x where x.module = 'offload' and x.logiciel = 'tableur' loop
    foreach c in array array['equipements', 'interventions', 'contrats'] loop
      if not exists (select 1 from public.branchements_jeux j where j.branchement_id = b.id and j.code = c) then
        perform private.declarer_jeu(b.id, c, '{}'::jsonb);
      end if;
    end loop;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Lire une périodicité, une nature, une reconduction
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.offload_lire_periodicite(p text)
 returns smallint
 language sql
 immutable
 set search_path to ''
as $function$
  select case
    when p ~ '^\s*\d{1,3}\s*(mois)?\s*$' and (regexp_replace(p, '\D', '', 'g'))::integer between 1 and 120 then (regexp_replace(p, '\D', '', 'g'))::smallint
    when p ~* 'mensuel' then 1::smallint
    when p ~* 'trimestr' then 3::smallint
    when p ~* 'semest' then 6::smallint
    when p ~* '(bisannuel|biennal|2\s*ans)' then 24::smallint
    when p ~* '(annuel|1\s*an|an\s*$)' then 12::smallint
    else null end
$function$;

create or replace function private.offload_lire_nature(p text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case when p ~* '(r[ée]gl|obligatoire|l[ée]gal|^\s*oui\s*$)' then 'reglementaire' else 'commerciale' end
$function$;

create or replace function private.offload_lire_reconduction(p text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case when p ~* 'tacite' then 'tacite' when p ~* '(^\s*non\s*$|aucune|sans)' then 'aucune' else 'expresse' end
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Le message d'échéance (la semaine qui précède)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.offload_message_echeance(p_echeance uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  h public.offload_echeances;
  q public.offload_equipements;
  c public.offload_comptes;
  g public.offload_reglages;
  v_org text;
  v_quoi text;
  v_corps text;
  v_stop constant text := 'Si vous ne souhaitez plus recevoir nos messages, répondez simplement « stop » : nous ne vous écrirons plus.';
begin
  select * into h from public.offload_echeances where id = p_echeance;
  select * into q from public.offload_equipements where id = h.equipement_id;
  select * into c from public.offload_comptes where id = h.compte_id;
  select * into g from public.offload_reglages where client_id = h.client_id;
  select x.nom into v_org from public.clients x where x.id = h.client_id;
  v_quoi := case when h.nature = 'reglementaire' then 'le contrôle réglementaire' else 'l''entretien' end
            || coalesce(' (' || lower(q.type_entretien) || ')', '');
  v_corps := 'Bonjour' || coalesce(' ' || c.contact, '') || ',' || E'\n\n'
    || format('%s de votre %s%s%s arrive à échéance le %s : la dernière intervention enregistrée date du %s.',
              initcap(left(v_quoi, 1)) || substr(v_quoi, 2), q.designation, ' (n° ' || q.ref || ')', coalesce(', site ' || q.site, ''),
              private.offload_date_longue(h.due_le), private.offload_date_longue(h.base_le))
    || case when h.nature = 'reglementaire' then ' Ce contrôle est obligatoire.' else '' end || E'\n\n'
    || 'Souhaitez-vous que nous convenions d''un créneau ? Un simple retour à ce message suffit. Si l''intervention a déjà '
    || 'été faite, dites-le-nous : nous mettrons votre fiche à jour.' || E'\n\n'
    || 'Bien cordialement,' || E'\n' || coalesce(nullif(btrim(g.signature), ''), v_org) || E'\n\n' || v_stop;
  return jsonb_build_object(
    'sujet', left(v_org || ' — ' || case when h.nature = 'reglementaire' then 'contrôle réglementaire' else 'entretien' end
                  || ' de votre ' || q.designation || ' le ' || private.offload_le(h.due_le), 300),
    'corps', v_corps);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Le cycle des échéances
-- ─────────────────────────────────────────────────────────────────────────
-- Un compte peut recevoir un message d'échéance : suivi, non fusionné, hors listes d'exclusion ; et son groupe n'a
-- pas déjà reçu un message d'échéance préparé ces 7 derniers jours (plafond au groupe).
create or replace function private.offload_ecarte_echeance(p_compte uuid, p_jour date)
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  v_raison text;
begin
  select * into c from public.offload_comptes where id = p_compte;
  v_raison := private.offload_ecarte(p_compte);
  -- Les raisons propres aux reprises (contact récent, groupe déjà sollicité par une reprise) ne valent pas ici.
  if v_raison is not null and v_raison not like 'Déjà contacté le %' and v_raison not like 'Le groupe « % » est déjà sollicité%' then
    return v_raison;
  end if;
  if nullif(btrim(c.groupe), '') is not null and exists (
       select 1 from public.offload_echeances h join public.offload_comptes k on k.id = h.compte_id
       where h.client_id = c.client_id and k.id <> c.id and lower(btrim(k.groupe)) = lower(btrim(c.groupe))
         and h.envoi_id is not null and h.maj_le > now() - interval '7 days') then
    return format('Le groupe « %s » a déjà reçu un message d''échéance cette semaine.', c.groupe);
  end if;
  return null;
end $function$;

create or replace function private.offload_echeances_cycle(p_client uuid, p_jour date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_jour date := coalesce(p_jour, (now() at time zone 'Europe/Paris')::date);
  q record;
  k record;
  v_base date;
  v_ailleurs boolean;
  v_due date;
  v_id uuid;
  v_envoi uuid;
  e public.envois;
  c public.offload_comptes;
  v_msg jsonb;
  v_raison text;
  v_n integer;
  n_nouvelles integer := 0; n_honorees integer := 0; n_depassees integer := 0; n_prevenues integer := 0; n_appels integer := 0;
  n_contrats integer := 0; n_ecartees integer := 0;
begin
  if not exists (select 1 from public.offload_reglages g where g.client_id = p_client) then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;

  -- 1. Chaque équipement actif : son échéance datée depuis la dernière intervention enregistrée.
  for q in select x.* from public.offload_equipements x where x.client_id = p_client and x.statut = 'actif' loop
    select i.le, i.ailleurs into v_base, v_ailleurs from public.offload_interventions i
    where i.equipement_id = q.id order by i.le desc, i.ailleurs limit 1;
    if q.derniere_intervention is not null and (v_base is null or q.derniere_intervention > v_base) then
      v_base := q.derniere_intervention;
      v_ailleurs := false;
    end if;
    continue when v_base is null;
    v_due := (v_base + make_interval(months => q.periodicite_mois))::date;
    -- Une intervention plus récente honore les échéances d'avant (ailleurs : « honorée ailleurs »).
    update public.offload_echeances h
       set statut = case when v_ailleurs then 'honoree_ailleurs' else 'honoree' end, honoree_le = v_base, maj_le = now(),
           motif = case when v_ailleurs then 'Intervention faite ailleurs le ' || private.offload_le(v_base) || ' : l''échéance sort du cycle.'
                        else 'Intervention du ' || private.offload_le(v_base) || '.' end
     where h.equipement_id = q.id and h.type = 'entretien' and h.due_le < v_due
       and h.statut in ('a_venir', 'a_valider', 'prevenue', 'appel', 'depassee');
    get diagnostics v_n = row_count;
    n_honorees := n_honorees + v_n;
    insert into public.offload_echeances (client_id, entite_id, compte_id, type, equipement_id, nature, due_le, base_le)
    values (q.client_id, q.entite_id, q.compte_id, 'entretien', q.id, q.nature, v_due, v_base)
    on conflict do nothing
    returning id into v_id;
    if v_id is not null then
      n_nouvelles := n_nouvelles + 1;
    end if;
  end loop;

  -- 2. Tombée sans intervention connue : en attente, jamais relancée une seconde fois.
  update public.offload_echeances h set statut = 'depassee', maj_le = now(),
         motif = 'Échéance du ' || private.offload_le(h.due_le) || ' tombée sans intervention connue : en attente, sans seconde relance.'
   where h.client_id = p_client and h.type = 'entretien' and h.due_le < v_jour and h.statut in ('a_venir', 'prevenue', 'appel');
  get diagnostics n_depassees = row_count;

  -- 3. Les contrats : leur fin est une échéance ; sans reconduction tacite, à 60 jours ou passée, il s'éteint.
  for k in select x.* from public.offload_contrats x where x.client_id = p_client and x.statut = 'actif' loop
    insert into public.offload_echeances (client_id, entite_id, compte_id, type, equipement_id, contrat_id, nature, due_le, base_le)
    values (k.client_id, k.entite_id, k.compte_id, 'contrat', k.equipement_id, k.id, 'commerciale', k.fin, k.debut)
    on conflict do nothing;
    if k.reconduction <> 'tacite' and k.fin <= v_jour + 60
       and not exists (select 1 from public.offload_contrats y where y.compte_id = k.compte_id and y.id <> k.id
                       and y.statut = 'actif' and y.fin > k.fin and coalesce(y.equipement_id, k.equipement_id) is not distinct from k.equipement_id) then
      update public.offload_echeances h set s_eteint = true, maj_le = now(),
             motif = format('Le contrat %s %s le %s sans reconduction %s.', k.numero,
                            case when k.fin < v_jour then 's''est éteint' else 's''éteint' end, private.offload_le(k.fin),
                            case k.reconduction when 'aucune' then 'prévue' else 'tacite : il faut le renouveler' end)
       where h.contrat_id = k.id and h.type = 'contrat' and h.due_le = k.fin and not h.s_eteint
      returning h.id into v_id;
      if found then
        n_contrats := n_contrats + 1;
        select * into c from public.offload_comptes where id = k.compte_id;
        insert into public.offload_taches (client_id, entite_id, compte_id, echeance_id, type, titre, detail, commercial, echeance)
        values (k.client_id, k.entite_id, k.compte_id, v_id, 'appel', left('Proposer le renouvellement du contrat ' || k.numero || ' — ' || c.nom, 200),
                left(format('Le contrat %s%s prend fin le %s, sans reconduction tacite.%s', k.numero, coalesce(' (' || k.libelle || ')', ''),
                            private.offload_le(k.fin), coalesce(E'\nTéléphone : ' || c.telephone, '')), 4000),
                c.commercial, least(greatest(v_jour, k.fin - 30), v_jour + 3))
        on conflict do nothing;
        perform private.journaliser_module(k.client_id, 'offload', 'offload.contrat_s_eteint', 'offload_contrats', k.id::text,
          jsonb_build_object('numero', k.numero, 'fin', k.fin, 'reconduction', k.reconduction), k.entite_id);
      end if;
    end if;
    if k.fin < v_jour and k.reconduction <> 'tacite' then
      update public.offload_contrats set statut = 'echu', maj_le = now() where id = k.id;
    elsif k.fin < v_jour and k.reconduction = 'tacite' then
      update public.offload_contrats set statut = 'reconduit', maj_le = now() where id = k.id;
    end if;
  end loop;

  -- 4. Prévenir la semaine qui précède (J-7 à J-1, jamais le jour même), une fois.
  if not private.offload_essai_contre_reel(p_client) then
    for k in
      select h.* from public.offload_echeances h
      where h.client_id = p_client and h.type = 'entretien' and h.statut = 'a_venir'
        and h.due_le between v_jour + 1 and v_jour + 7
      order by h.due_le, h.nature desc, h.id
    loop
      v_raison := private.offload_ecarte_echeance(k.compte_id, v_jour);
      if v_raison is not null then
        n_ecartees := n_ecartees + 1;
        continue;
      end if;
      select * into c from public.offload_comptes where id = k.compte_id;
      begin
        v_envoi := null;
        if nullif(btrim(c.email), '') is not null then
          perform private.offload_assurer_consentement(c.id);
          v_msg := private.offload_message_echeance(k.id);
          v_envoi := private.preparer_envoi(k.client_id, 'offload', 'offload_echeances', k.id::text, 'email',
            jsonb_build_object('adresse', c.email, 'nom', coalesce(c.contact, c.nom), 'ref', c.ref,
                               'professionnel', private.offload_est_professionnel(c.id), 'langue', 'fr'),
            null, '{}'::jsonb, v_msg ->> 'sujet', v_msg ->> 'corps', null::uuid[],
            'offload:echeance:' || k.id::text, k.entite_id, false, false, null::timestamptz, '{}'::jsonb);
          select * into e from public.envois where id = v_envoi;
        end if;
        if v_envoi is not null and e.statut <> 'bloque' then
          update public.offload_echeances set statut = 'a_valider', envoi_id = v_envoi, maj_le = now() where id = k.id;
          n_prevenues := n_prevenues + 1;
        else
          update public.offload_echeances set statut = 'appel', envoi_id = v_envoi, maj_le = now(),
                 motif = case when v_envoi is null then 'Pas de courriel connu : le commercial prévient le client.'
                              else left(format('Message retenu par le socle (%s) : le commercial prévient le client.', e.verrou), 500) end
           where id = k.id;
          insert into public.offload_taches (client_id, entite_id, compte_id, echeance_id, type, titre, detail, commercial, echeance)
          select k.client_id, k.entite_id, k.compte_id, k.id, 'appel',
                 left(format('Prévenir %s : %s le %s', c.nom, case when k.nature = 'reglementaire' then 'contrôle réglementaire' else 'entretien' end,
                             private.offload_le(k.due_le)), 200),
                 left(format('%s (n° %s%s), dernière intervention le %s.%s', q2.designation, q2.ref, coalesce(', site ' || q2.site, ''),
                             private.offload_le(k.base_le), coalesce(E'\nTéléphone : ' || c.telephone, '')), 4000),
                 c.commercial, v_jour
          from public.offload_equipements q2 where q2.id = k.equipement_id
          on conflict do nothing;
          n_appels := n_appels + 1;
        end if;
      exception when others then
        n_ecartees := n_ecartees + 1;
      end;
    end loop;
  end if;

  if n_nouvelles + n_honorees + n_depassees + n_prevenues + n_appels + n_contrats > 0 then
    perform private.journaliser_module(p_client, 'offload', 'offload.echeances', 'offload_reglages', p_client::text,
      jsonb_build_object('jour', v_jour, 'nouvelles', n_nouvelles, 'honorees', n_honorees, 'depassees', n_depassees,
                         'prevenues', n_prevenues, 'appels', n_appels, 'contrats_s_eteignent', n_contrats, 'ecartees', n_ecartees), null);
  end if;
  return jsonb_build_object('nouvelles', n_nouvelles, 'honorees', n_honorees, 'depassees', n_depassees, 'prevenues', n_prevenues,
                            'appels', n_appels, 'contrats_s_eteignent', n_contrats, 'ecartees', n_ecartees);
end $function$;

-- Le suivi d'un message d'échéance (événements envoi.*.offload, objet offload_echeances).
create or replace function private.offload_suivre_envoi_echeance(p_charge jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  h public.offload_echeances;
  e public.envois;
  v_issue text := split_part(coalesce(p_charge ->> 'evenement', ''), '.', 2);
begin
  select * into e from public.envois where id = (p_charge ->> 'envoi')::uuid;
  select * into h from public.offload_echeances where id = (p_charge ->> 'objet_id')::uuid for update;
  if e.id is null or h.id is null or h.client_id <> e.client_id or h.envoi_id is distinct from e.id then
    return jsonb_build_object('statut', 'introuvable');
  end if;
  if h.statut not in ('a_valider') then
    return jsonb_build_object('statut', 'sans_effet', 'echeance', h.statut);
  end if;
  if v_issue = 'envoye' then
    update public.offload_echeances set statut = 'prevenue', prevenue_le = coalesce(e.envoye_le, now()), maj_le = now() where id = h.id;
    perform private.journaliser_module(h.client_id, 'offload', 'offload.echeance_prevenue', 'offload_echeances', h.id::text,
      jsonb_build_object('envoi', e.id, 'due_le', h.due_le, 'nature', h.nature, 'mode', e.mode), h.entite_id);
    return jsonb_build_object('statut', 'prevenue');
  elsif v_issue = 'refuse' then
    update public.offload_echeances set statut = 'close', maj_le = now(), motif = 'Message refusé en validation.' where id = h.id;
    return jsonb_build_object('statut', 'refusee');
  elsif v_issue in ('bloque', 'annule', 'expire', 'echec', 'non_remis') then
    update public.offload_echeances set statut = 'appel', maj_le = now(),
           motif = left(format('Le message n''est pas parti (%s%s) : le commercial prévient le client.', v_issue, coalesce(', ' || e.verrou, '')), 500)
     where id = h.id;
    return jsonb_build_object('statut', 'appel');
  end if;
  return jsonb_build_object('statut', 'ignore');
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Les portes de saisie
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.offload_saisir_equipement(p_compte uuid, p_ref text, p_designation text, p_champs jsonb default '{}'::jsonb)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  p jsonb := coalesce(p_champs, '{}'::jsonb);
  v_inconnus text;
  v_id uuid;
begin
  select * into c from public.offload_comptes where id = p_compte;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(c.client_id, c.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'saisir un équipement');
  select string_agg(x, ', ') into v_inconnus from jsonb_object_keys(p) x
  where x not in ('site', 'type_entretien', 'periodicite_mois', 'nature', 'derniere_intervention', 'mise_en_service');
  if v_inconnus is not null then
    raise exception 'Champ d''équipement inconnu : %.', v_inconnus using errcode = '22023';
  end if;
  if private.offload_texte(p_ref, 120) is null or private.offload_texte(p_designation, 200) is null then
    raise exception 'Un équipement a un numéro et une désignation.' using errcode = '22023';
  end if;
  if p ? 'derniere_intervention' and (p ->> 'derniere_intervention')::date > current_date then
    raise exception 'Une intervention n''est jamais datée dans le futur.' using errcode = '22023';
  end if;
  insert into public.offload_equipements as q (client_id, entite_id, compte_id, ref, designation, site, type_entretien, periodicite_mois, nature,
                                               derniere_intervention, mise_en_service, source)
  values (c.client_id, c.entite_id, c.id, private.offload_texte(p_ref, 120), private.offload_texte(p_designation, 200),
          private.offload_texte(p ->> 'site', 200), private.offload_texte(p ->> 'type_entretien', 200),
          coalesce((p ->> 'periodicite_mois')::smallint, 12), coalesce(p ->> 'nature', 'commerciale'),
          (p ->> 'derniere_intervention')::date, (p ->> 'mise_en_service')::date, 'saisie')
  on conflict (client_id, compte_id, ref) do update
    set designation = excluded.designation, site = coalesce(excluded.site, q.site), type_entretien = coalesce(excluded.type_entretien, q.type_entretien),
        periodicite_mois = case when p ? 'periodicite_mois' then excluded.periodicite_mois else q.periodicite_mois end,
        nature = case when p ? 'nature' then excluded.nature else q.nature end,
        derniere_intervention = greatest(q.derniere_intervention, excluded.derniere_intervention), maj_le = now()
  returning id into v_id;
  perform private.journaliser_module(c.client_id, 'offload', 'offload.equipement_saisi', 'offload_equipements', v_id::text,
    jsonb_build_object('compte', c.id, 'ref', p_ref, 'champs', p), c.entite_id);
  perform private.offload_echeances_cycle(c.client_id, null);
  return v_id;
end $function$;

create or replace function private.offload_noter_intervention(p_equipement uuid, p_le date, p_nature text default 'entretien',
                                                              p_ailleurs boolean default false, p_reference text default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  q public.offload_equipements;
  v_id uuid;
begin
  select * into q from public.offload_equipements where id = p_equipement;
  if not found then
    raise exception 'Équipement introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(q.client_id, q.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'noter une intervention');
  if p_le is null or p_le > (now() at time zone 'Europe/Paris')::date or p_le < date '1990-01-01' then
    raise exception 'Une intervention est datée, et pas dans le futur.' using errcode = '22023';
  end if;
  if coalesce(p_nature, 'entretien') not in ('entretien', 'controle', 'reparation', 'installation') then
    raise exception 'Nature : entretien, controle, reparation ou installation.' using errcode = '22023';
  end if;
  insert into public.offload_interventions (client_id, entite_id, compte_id, equipement_id, le, nature, ailleurs, reference, source, saisi_par)
  values (q.client_id, q.entite_id, q.compte_id, q.id, p_le, coalesce(p_nature, 'entretien'), coalesce(p_ailleurs, false),
          private.offload_texte(p_reference, 120), 'saisie', (select auth.uid()))
  returning id into v_id;
  perform private.journaliser_module(q.client_id, 'offload', 'offload.intervention_notee', 'offload_equipements', q.id::text,
    jsonb_build_object('le', p_le, 'nature', p_nature, 'ailleurs', coalesce(p_ailleurs, false)), q.entite_id);
  perform private.offload_echeances_cycle(q.client_id, null);
  return v_id;
end $function$;

create or replace function private.offload_saisir_contrat(p_compte uuid, p_numero text, p_fin date, p_champs jsonb default '{}'::jsonb)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  p jsonb := coalesce(p_champs, '{}'::jsonb);
  v_inconnus text;
  v_id uuid;
  v_equipement uuid;
begin
  select * into c from public.offload_comptes where id = p_compte;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(c.client_id, c.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'saisir un contrat');
  select string_agg(x, ', ') into v_inconnus from jsonb_object_keys(p) x where x not in ('libelle', 'debut', 'reconduction', 'equipement_ref');
  if v_inconnus is not null then
    raise exception 'Champ de contrat inconnu : %.', v_inconnus using errcode = '22023';
  end if;
  if private.offload_texte(p_numero, 120) is null or p_fin is null then
    raise exception 'Un contrat a un numéro et une date de fin.' using errcode = '22023';
  end if;
  if coalesce(p ->> 'reconduction', 'expresse') not in ('tacite', 'expresse', 'aucune') then
    raise exception 'Reconduction : tacite, expresse ou aucune.' using errcode = '22023';
  end if;
  select q.id into v_equipement from public.offload_equipements q where q.compte_id = c.id and q.ref = p ->> 'equipement_ref';
  insert into public.offload_contrats as k (client_id, entite_id, compte_id, equipement_id, numero, libelle, debut, fin, reconduction, source)
  values (c.client_id, c.entite_id, c.id, v_equipement, private.offload_texte(p_numero, 120), private.offload_texte(p ->> 'libelle', 300),
          (p ->> 'debut')::date, p_fin, coalesce(p ->> 'reconduction', 'expresse'), 'saisie')
  on conflict (client_id, numero) do update
    set fin = excluded.fin, libelle = coalesce(excluded.libelle, k.libelle), debut = coalesce(excluded.debut, k.debut),
        reconduction = excluded.reconduction, equipement_id = coalesce(excluded.equipement_id, k.equipement_id),
        statut = case when excluded.fin > k.fin then 'actif' else k.statut end, maj_le = now()
  returning id into v_id;
  perform private.journaliser_module(c.client_id, 'offload', 'offload.contrat_saisi', 'offload_contrats', v_id::text,
    jsonb_build_object('compte', c.id, 'numero', p_numero, 'fin', p_fin, 'champs', p), c.entite_id);
  perform private.offload_echeances_cycle(c.client_id, null);
  return v_id;
end $function$;

create or replace function public.offload_saisir_equipement(p_compte uuid, p_ref text, p_designation text, p_champs jsonb default '{}'::jsonb)
 returns uuid language sql set search_path to ''
as $function$ select private.offload_saisir_equipement(p_compte, p_ref, p_designation, p_champs) $function$;
create or replace function public.offload_noter_intervention(p_equipement uuid, p_le date, p_nature text default 'entretien',
                                                             p_ailleurs boolean default false, p_reference text default null)
 returns uuid language sql set search_path to ''
as $function$ select private.offload_noter_intervention(p_equipement, p_le, p_nature, p_ailleurs, p_reference) $function$;
create or replace function public.offload_saisir_contrat(p_compte uuid, p_numero text, p_fin date, p_champs jsonb default '{}'::jsonb)
 returns uuid language sql set search_path to ''
as $function$ select private.offload_saisir_contrat(p_compte, p_numero, p_fin, p_champs) $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 7. Les lectures : le parc site par site et en consolidé, les échéances de l'écran
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.offload_parc(p_client uuid default null)
 returns jsonb
 language sql
 stable security invoker
 set search_path to ''
as $function$
  with moi as (
    select coalesce(p_client, (select c.client_id from public.comptes c where c.user_id = (select auth.uid()) order by c.client_id limit 1)) as client_id
  ), parc as (
    select q.*, k.nom as compte_nom,
           (select h.due_le from public.offload_echeances h where h.equipement_id = q.id and h.type = 'entretien'
              and h.statut in ('a_venir', 'a_valider', 'prevenue', 'appel', 'depassee') order by h.due_le limit 1) as prochaine,
           (select h.statut from public.offload_echeances h where h.equipement_id = q.id and h.type = 'entretien'
              and h.statut in ('a_venir', 'a_valider', 'prevenue', 'appel', 'depassee') order by h.due_le limit 1) as etat
    from public.offload_equipements q join public.offload_comptes k on k.id = q.compte_id
    where q.client_id = (select client_id from moi) and q.statut = 'actif' and k.fusionne_dans is null
  )
  select jsonb_build_object(
    'consolide', jsonb_build_object(
      'equipements', (select count(*) from parc),
      'sites', (select count(distinct (compte_id, coalesce(site, ''))) from parc),
      'comptes', (select count(distinct compte_id) from parc),
      'reglementaires', (select count(*) from parc where nature = 'reglementaire'),
      'a_30_jours', (select count(*) from parc where prochaine between current_date and current_date + 30),
      'depassees', (select count(*) from parc where etat = 'depassee'),
      'sans_date', (select count(*) from parc where prochaine is null),
      'contrats_s_eteignent', (select count(*) from public.offload_echeances h where h.client_id = (select client_id from moi)
                               and h.type = 'contrat' and h.s_eteint and h.statut not in ('close'))),
    'sites', coalesce((
      select jsonb_agg(jsonb_build_object('compte_id', s.compte_id, 'compte_nom', s.compte_nom, 'site', s.site,
                                          'equipements', s.n, 'reglementaires', s.nr, 'prochaine', s.prochaine, 'depassees', s.nd)
                       order by s.prochaine nulls last, s.compte_nom, s.site)
      from (select compte_id, compte_nom, coalesce(site, 'Site principal') as site, count(*) as n,
                   count(*) filter (where nature = 'reglementaire') as nr, min(prochaine) as prochaine,
                   count(*) filter (where etat = 'depassee') as nd
            from parc group by compte_id, compte_nom, coalesce(site, 'Site principal')) s), '[]'::jsonb))
$function$;

create or replace function public.offload_echeances_tableau(p_client uuid default null)
 returns jsonb
 language sql
 stable security invoker
 set search_path to ''
as $function$
  with moi as (
    select coalesce(p_client, (select c.client_id from public.comptes c where c.user_id = (select auth.uid()) order by c.client_id limit 1)) as client_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', h.id, 'type', h.type, 'nature', h.nature, 'due_le', h.due_le, 'base_le', h.base_le, 'statut', h.statut,
           's_eteint', h.s_eteint, 'motif', h.motif, 'compte_id', h.compte_id, 'compte_nom', k.nom,
           'equipement', case when q.id is not null then jsonb_build_object('id', q.id, 'ref', q.ref, 'designation', q.designation,
                                                                            'site', q.site, 'type_entretien', q.type_entretien) end,
           'contrat', case when t.id is not null then jsonb_build_object('id', t.id, 'numero', t.numero, 'libelle', t.libelle,
                                                                         'reconduction', t.reconduction) end)
           order by h.due_le, h.nature desc), '[]'::jsonb)
  from public.offload_echeances h
  join public.offload_comptes k on k.id = h.compte_id
  left join public.offload_equipements q on q.id = h.equipement_id
  left join public.offload_contrats t on t.id = h.contrat_id
  where h.client_id = (select client_id from moi)
    and ((h.type = 'entretien' and h.statut in ('a_venir', 'a_valider', 'prevenue', 'appel', 'depassee') and h.due_le <= current_date + 60)
         or (h.type = 'contrat' and h.s_eteint and h.statut <> 'close'))
$function$;

create or replace function public.offload_parc_compte(p_compte uuid)
 returns jsonb
 language sql
 stable security invoker
 set search_path to ''
as $function$
  select jsonb_build_object(
    'equipements', coalesce((select jsonb_agg((to_jsonb(q) - 'client_id' - 'cle') || jsonb_build_object(
        'interventions', (select coalesce(jsonb_agg(jsonb_build_object('le', i.le, 'nature', i.nature, 'ailleurs', i.ailleurs, 'reference', i.reference)
                                                    order by i.le desc), '[]'::jsonb)
                          from (select * from public.offload_interventions x where x.equipement_id = q.id order by x.le desc limit 10) i),
        'echeance', (select to_jsonb(h) - 'client_id' from public.offload_echeances h where h.equipement_id = q.id and h.type = 'entretien'
                     order by h.due_le desc limit 1)) order by q.site nulls first, q.designation)
      from public.offload_equipements q where q.compte_id = p_compte), '[]'::jsonb),
    'contrats', coalesce((select jsonb_agg((to_jsonb(t) - 'client_id' - 'cle') || jsonb_build_object(
        's_eteint', exists (select 1 from public.offload_echeances h where h.contrat_id = t.id and h.s_eteint)) order by t.fin)
      from public.offload_contrats t where t.compte_id = p_compte), '[]'::jsonb))
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 8. Redéfinitions (copie de la dernière version, avec les échéances branchées)
-- ─────────────────────────────────────────────────────────────────────────
-- L'import lit aussi les jeux « equipements », « contrats », « interventions ».
create or replace function private.offload_appliquer_releve(p_charge jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  b public.branchements;
  rl public.releves;
  i record;
  v_entite uuid;
  v_total integer;
  v_ok integer;
  v_raison text;
  v_comptes_nouveaux integer;
  v_achats_nouveaux integer;
  v_achats_modifies integer;
  v_jeux jsonb := '{}'::jsonb;
  v_douteux boolean := false;
begin
  select * into b from public.branchements where id = (p_charge ->> 'branchement')::uuid;
  if not found or b.module <> 'offload' then
    raise exception 'Branchement introuvable ou étranger à OFFLOAD.' using errcode = 'P0002';
  end if;
  select * into rl from public.releves where id = (p_charge ->> 'releve')::uuid and branchement_id = b.id;
  if not found then
    raise exception 'Relevé introuvable.' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.offload_reglages g where g.client_id = b.client_id) then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  v_entite := private.offload_entite(b.client_id, b.entite_id);

  if not exists (select 1 from public.instantanes x where x.releve_id = rl.id and x.statut = 'a_appliquer') then
    return jsonb_build_object('releve', rl.id, 'deja_applique', true);
  end if;

  -- Le référentiel d'abord, pour que les ventes trouvent leurs comptes avec leur vrai nom.
  for i in
    select x.id, j.code, j.id as jeu_id
    from public.instantanes x join public.branchements_jeux j on j.id = x.jeu_id
    where x.releve_id = rl.id and x.statut = 'a_appliquer'
    order by case j.code when 'clients' then 0 when 'ventes' then 1 when 'equipements' then 2 when 'contrats' then 3
                          when 'interventions' then 4 else 5 end, x.recu_le, x.id
  loop
    v_comptes_nouveaux := 0;
    v_achats_nouveaux := 0;
    v_achats_modifies := 0;

    if i.code = 'clients' then
      select count(*) into v_total from public.instantanes_lignes l where l.instantane_id = i.id;
      with lus as (
        select distinct on (ref) *
        from (select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as ref, l.valeurs as v, l.n
              from public.instantanes_lignes l where l.instantane_id = i.id) z
        where ref is not null
        order by ref, n desc
      ), ecrits as (
        insert into public.offload_comptes as c (client_id, entite_id, ref, nom, contact, email, telephone, commercial, groupe,
                                                 ville, secteur, source, jeu_id)
        select b.client_id, v_entite, lus.ref, coalesce(private.offload_texte(v ->> 'nom', 200), lus.ref),
               private.offload_texte(v ->> 'contact', 200), private.offload_texte(v ->> 'email', 320),
               private.offload_texte(v ->> 'telephone', 40), private.offload_texte(v ->> 'commercial', 120),
               private.offload_texte(v ->> 'groupe', 200), private.offload_texte(v ->> 'ville', 120),
               private.offload_texte(v ->> 'secteur', 120), 'import', i.jeu_id
        from lus
        on conflict (client_id, entite_id, ref) do update
          set nom = excluded.nom,
              contact = coalesce(excluded.contact, c.contact),
              email = coalesce(excluded.email, c.email),
              telephone = coalesce(excluded.telephone, c.telephone),
              commercial = coalesce(excluded.commercial, c.commercial),
              groupe = coalesce(excluded.groupe, c.groupe),
              ville = coalesce(excluded.ville, c.ville),
              secteur = coalesce(excluded.secteur, c.secteur),
              maj_le = now()
          where (c.nom, c.contact, c.email, c.telephone, c.commercial, c.groupe, c.ville, c.secteur)
                is distinct from (excluded.nom, coalesce(excluded.contact, c.contact), coalesce(excluded.email, c.email),
                                  coalesce(excluded.telephone, c.telephone), coalesce(excluded.commercial, c.commercial),
                                  coalesce(excluded.groupe, c.groupe), coalesce(excluded.ville, c.ville),
                                  coalesce(excluded.secteur, c.secteur))
        returning (xmax = 0) as nouveau
      )
      select count(*) filter (where nouveau), count(*) filter (where not nouveau)
        into v_comptes_nouveaux, v_achats_modifies from ecrits;
      perform private.acquitter_instantane(i.id, 'applique');
      v_jeux := v_jeux || jsonb_build_object('clients', jsonb_build_object(
        'lignes', v_total, 'comptes_nouveaux', v_comptes_nouveaux, 'comptes_modifies', v_achats_modifies));

    elsif i.code = 'ventes' then
      select count(*), count(*) filter (where private.offload_ligne_vente_ok(l.valeurs))
        into v_total, v_ok
      from public.instantanes_lignes l where l.instantane_id = i.id;

      -- Le garde-fou : un export dont plus de la moitié des lignes est illisible n'est pas appliqué.
      if v_total > 0 and v_ok * 2 < v_total then
        v_raison := format('Sur %s lignes, %s seulement ont un code client, une date et un montant lisibles : '
                           'l''export n''est pas appliqué. Vérifiez les colonnes du fichier.', v_total, v_ok);
        perform private.acquitter_instantane(i.id, 'douteux', v_raison);
        perform private.journaliser_module(b.client_id, 'offload', 'offload.import_douteux', 'releves', rl.id::text,
          jsonb_build_object('releve', rl.id, 'instantane', i.id, 'jeu', 'ventes', 'lignes', v_total, 'exploitables', v_ok),
          v_entite);
        v_douteux := true;
        v_jeux := v_jeux || jsonb_build_object('ventes', jsonb_build_object('douteux', v_raison, 'lignes', v_total));
        continue;
      end if;

      -- Les comptes que les ventes citent et que le référentiel ne connaît pas encore.
      with lus as (
        select distinct on (ref) *
        from (select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as ref, l.valeurs as v, l.n
              from public.instantanes_lignes l
              where l.instantane_id = i.id and private.offload_ligne_vente_ok(l.valeurs)) z
        order by ref, (private.offload_texte(v ->> 'compte_nom', 200) is not null) desc, n desc
      ), ecrits as (
        insert into public.offload_comptes as c (client_id, entite_id, ref, nom, email, telephone, commercial, groupe, source, jeu_id)
        select b.client_id, v_entite, lus.ref, coalesce(private.offload_texte(v ->> 'compte_nom', 200), lus.ref),
               private.offload_texte(v ->> 'email', 320), private.offload_texte(v ->> 'telephone', 40),
               private.offload_texte(v ->> 'commercial', 120), private.offload_texte(v ->> 'groupe', 200), 'import', i.jeu_id
        from lus
        on conflict (client_id, entite_id, ref) do update
          set nom = case when c.nom = c.ref and excluded.nom <> excluded.ref then excluded.nom else c.nom end,
              email = coalesce(c.email, excluded.email),
              telephone = coalesce(c.telephone, excluded.telephone),
              commercial = coalesce(c.commercial, excluded.commercial),
              groupe = coalesce(c.groupe, excluded.groupe),
              maj_le = now()
          where (c.nom = c.ref and excluded.nom <> excluded.ref)
             or (c.email is null and excluded.email is not null)
             or (c.telephone is null and excluded.telephone is not null)
             or (c.commercial is null and excluded.commercial is not null)
             or (c.groupe is null and excluded.groupe is not null)
        returning (xmax = 0) as nouveau
      )
      select count(*) filter (where nouveau) into v_comptes_nouveaux from ecrits;

      -- Les achats. Un achat est une PIÈCE : un client, une date, un numéro de pièce. Un export ligne à ligne
      -- (plusieurs lignes par facture) est additionné pièce par pièce. La clé est relue (date normalisée), elle
      -- ne dépend ni de l'ordre du fichier ni de la façon dont le logiciel écrit ses dates : un export rejoué,
      -- trié autrement ou corrigé met à jour la même pièce, il ne la double jamais.
      with lignes as (
        select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as ref,
               private.offload_lire_date(l.valeurs ->> 'date') as d,
               private.offload_texte(l.valeurs ->> 'reference', 120) as piece,
               private.offload_nature(l.valeurs ->> 'nature') as nat,
               private.offload_lire_montant(l.valeurs ->> 'montant') as m,
               private.offload_texte(l.valeurs ->> 'libelle', 500) as lib,
               l.n
        from public.instantanes_lignes l
        where l.instantane_id = i.id and private.offload_ligne_vente_ok(l.valeurs)
      ), lus as (
        select 'p1:' || ref || '|' || d::text || '|' || coalesce(piece, '') as k, ref, d, piece,
               sum(case when nat = 'avoir' then -abs(m) else m end) as montant,
               case when bool_and(nat = 'avoir') then 'avoir'
                    when bool_and(nat in ('commande', 'avoir')) and bool_or(nat = 'commande') then 'commande'
                    else 'facture' end as nature,
               left(string_agg(distinct lib, ' · '), 500) as lib
        from lignes
        group by ref, d, piece
      ), ecrits as (
        insert into public.offload_achats as a (client_id, entite_id, compte_id, date_achat, montant_ht, reference, libelle,
                                                nature, source, jeu_id, cle)
        select b.client_id, v_entite, c.id, lus.d, round(lus.montant, 2), lus.piece, lus.lib, lus.nature, 'import', i.jeu_id, lus.k
        from lus
        join public.offload_comptes c on c.client_id = b.client_id and c.entite_id = v_entite and c.ref = lus.ref
        on conflict (jeu_id, cle) do update
          set compte_id = excluded.compte_id, date_achat = excluded.date_achat, montant_ht = excluded.montant_ht,
              reference = excluded.reference, libelle = excluded.libelle, nature = excluded.nature, maj_le = now()
          where (a.compte_id, a.date_achat, a.montant_ht, a.reference, a.libelle, a.nature)
                is distinct from (excluded.compte_id, excluded.date_achat, excluded.montant_ht, excluded.reference,
                                  excluded.libelle, excluded.nature)
        returning (xmax = 0) as nouveau
      )
      select count(*) filter (where nouveau), count(*) filter (where not nouveau)
        into v_achats_nouveaux, v_achats_modifies from ecrits;

      perform private.acquitter_instantane(i.id, 'applique');
      v_jeux := v_jeux || jsonb_build_object('ventes', jsonb_build_object(
        'lignes', v_total, 'ecartees', v_total - v_ok, 'comptes_nouveaux', v_comptes_nouveaux,
        'achats_nouveaux', v_achats_nouveaux, 'achats_modifies', v_achats_modifies));

    elsif i.code in ('equipements', 'contrats', 'interventions') then
      select count(*) into v_total from public.instantanes_lignes l where l.instantane_id = i.id;
      -- Les comptes cités et pas encore connus (le référentiel viendra les nommer).
      insert into public.offload_comptes (client_id, entite_id, ref, nom, source, jeu_id)
      select distinct b.client_id, v_entite, z.ref, z.ref, 'import', i.jeu_id
      from (select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as ref from public.instantanes_lignes l where l.instantane_id = i.id) z
      where z.ref is not null
      on conflict (client_id, entite_id, ref) do nothing;
      get diagnostics v_comptes_nouveaux = row_count;

      if i.code = 'equipements' then
        with lus as (
          select distinct on (c.id, z.eref) c.id as compte_id, z.*
          from (select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as cref, private.offload_texte(l.valeurs ->> 'ref', 120) as eref,
                       l.valeurs as v, l.cle, l.n
                from public.instantanes_lignes l where l.instantane_id = i.id) z
          join public.offload_comptes c on c.client_id = b.client_id and c.entite_id = v_entite and c.ref = z.cref
          where z.eref is not null and private.offload_texte(z.v ->> 'designation', 200) is not null
          order by c.id, z.eref, z.n desc
        ), ecrits as (
          insert into public.offload_equipements as q (client_id, entite_id, compte_id, ref, designation, site, type_entretien, periodicite_mois,
                                                       nature, derniere_intervention, mise_en_service, source, jeu_id, cle)
          select b.client_id, v_entite, lus.compte_id, lus.eref, private.offload_texte(lus.v ->> 'designation', 200),
                 private.offload_texte(lus.v ->> 'site', 200), private.offload_texte(lus.v ->> 'type_entretien', 200),
                 coalesce(private.offload_lire_periodicite(lus.v ->> 'periodicite_mois'), 12), private.offload_lire_nature(lus.v ->> 'nature'),
                 private.offload_lire_date(lus.v ->> 'derniere_intervention'), private.offload_lire_date(lus.v ->> 'mise_en_service'),
                 'import', i.jeu_id, lus.cle
          from lus
          on conflict (client_id, compte_id, ref) do update
            set designation = excluded.designation, site = coalesce(excluded.site, q.site),
                type_entretien = coalesce(excluded.type_entretien, q.type_entretien), periodicite_mois = excluded.periodicite_mois,
                nature = excluded.nature, derniere_intervention = greatest(q.derniere_intervention, excluded.derniere_intervention),
                mise_en_service = coalesce(excluded.mise_en_service, q.mise_en_service), maj_le = now()
            where (q.designation, q.site, q.type_entretien, q.periodicite_mois, q.nature, q.derniere_intervention)
                  is distinct from (excluded.designation, coalesce(excluded.site, q.site), coalesce(excluded.type_entretien, q.type_entretien),
                                    excluded.periodicite_mois, excluded.nature, greatest(q.derniere_intervention, excluded.derniere_intervention))
          returning (xmax = 0) as nouveau
        )
        select count(*) filter (where nouveau), count(*) filter (where not nouveau) into v_achats_nouveaux, v_achats_modifies from ecrits;
      elsif i.code = 'contrats' then
        with lus as (
          select distinct on (z.num) c.id as compte_id, z.*
          from (select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as cref, private.offload_texte(l.valeurs ->> 'numero', 120) as num,
                       l.valeurs as v, l.cle, l.n
                from public.instantanes_lignes l where l.instantane_id = i.id) z
          join public.offload_comptes c on c.client_id = b.client_id and c.entite_id = v_entite and c.ref = z.cref
          where z.num is not null and private.offload_lire_date(z.v ->> 'fin') is not null
          order by z.num, z.n desc
        ), ecrits as (
          insert into public.offload_contrats as k (client_id, entite_id, compte_id, equipement_id, numero, libelle, debut, fin, reconduction,
                                                    source, jeu_id, cle)
          select b.client_id, v_entite, lus.compte_id,
                 (select q.id from public.offload_equipements q where q.compte_id = lus.compte_id
                    and q.ref = private.offload_texte(lus.v ->> 'equipement_ref', 120)),
                 lus.num, private.offload_texte(lus.v ->> 'libelle', 300), private.offload_lire_date(lus.v ->> 'debut'),
                 private.offload_lire_date(lus.v ->> 'fin'), private.offload_lire_reconduction(lus.v ->> 'reconduction'), 'import', i.jeu_id, lus.cle
          from lus
          on conflict (client_id, numero) do update
            set fin = excluded.fin, libelle = coalesce(excluded.libelle, k.libelle), debut = coalesce(excluded.debut, k.debut),
                reconduction = excluded.reconduction, equipement_id = coalesce(excluded.equipement_id, k.equipement_id),
                statut = case when excluded.fin > k.fin then 'actif' else k.statut end, maj_le = now()
            where (k.fin, k.libelle, k.debut, k.reconduction) is distinct from (excluded.fin, coalesce(excluded.libelle, k.libelle),
                                                                                coalesce(excluded.debut, k.debut), excluded.reconduction)
          returning (xmax = 0) as nouveau
        )
        select count(*) filter (where nouveau), count(*) filter (where not nouveau) into v_achats_nouveaux, v_achats_modifies from ecrits;
      else
        -- Une intervention se rattache à son équipement par le n° de série (et le code client s'il est donné).
        with lus as (
          select distinct on (q.id, z.d) q.id as equipement_id, q.compte_id, q.entite_id, z.*
          from (select private.offload_texte(l.valeurs ->> 'equipement_ref', 120) as eref, private.offload_texte(l.valeurs ->> 'compte_ref', 120) as cref,
                       private.offload_lire_date(l.valeurs ->> 'date') as d, l.valeurs as v, l.n
                from public.instantanes_lignes l where l.instantane_id = i.id) z
          join public.offload_equipements q on q.client_id = b.client_id and q.ref = z.eref
          join public.offload_comptes c on c.id = q.compte_id and (z.cref is null or c.ref = z.cref)
          where z.d between date '1990-01-01' and current_date
          order by q.id, z.d, z.n desc
        ), ecrits as (
          insert into public.offload_interventions (client_id, entite_id, compte_id, equipement_id, le, nature, reference, source, jeu_id, cle)
          select b.client_id, lus.entite_id, lus.compte_id, lus.equipement_id, lus.d,
                 case when lus.v ->> 'nature' ~* 'contr[ôo]le' then 'controle' when lus.v ->> 'nature' ~* '(r[ée]par|d[ée]pann)' then 'reparation'
                      when lus.v ->> 'nature' ~* '(install|mise en service)' then 'installation' else 'entretien' end,
                 private.offload_texte(lus.v ->> 'reference', 120), 'import', i.jeu_id, 'i:' || lus.equipement_id::text || '|' || lus.d::text
          from lus
          on conflict (jeu_id, cle) do nothing
          returning 1
        )
        select count(*), 0 into v_achats_nouveaux, v_achats_modifies from ecrits;
      end if;
      perform private.acquitter_instantane(i.id, 'applique');
      v_jeux := v_jeux || jsonb_build_object(i.code, jsonb_build_object('lignes', v_total, 'comptes_nouveaux', v_comptes_nouveaux,
                                                                         'nouveaux', v_achats_nouveaux, 'modifies', v_achats_modifies));

    else
      -- Un jeu que le module ne lit pas : appliqué tel quel, sans effet.
      perform private.acquitter_instantane(i.id, 'applique');
    end if;
  end loop;

  perform private.journaliser_module(b.client_id, 'offload', 'offload.import_applique', 'releves', rl.id::text,
    jsonb_build_object('releve', rl.id, 'jeux', v_jeux, 'douteux', v_douteux), v_entite);
  return jsonb_build_object('releve', rl.id, 'jeux', v_jeux, 'douteux', v_douteux);
end $function$;

-- Le passage du module : après un import, détection puis échéances.
create or replace function private.offload_traiter_travaux(p_nombre integer default 20)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t public.travaux;
  r jsonb;
  n_ok integer := 0;
  n_ko integer := 0;
begin
  for t in
    select * from private.prendre_travaux(array['offload.appliquer_releve', 'offload.envoi', 'offload.reception'], p_nombre,
                                          interval '10 minutes', 'offload-sql')
  loop
    begin
      r := case t.genre
             when 'offload.appliquer_releve' then private.offload_appliquer_releve(t.charge)
             when 'offload.envoi' then private.offload_suivre_envoi(t.charge)
             when 'offload.reception' then private.offload_lire_reponse(t.charge)
           end;
      if t.genre = 'offload.appliquer_releve' and t.client_id is not null and not coalesce((r ->> 'deja_applique')::boolean, false) then
        r := r || jsonb_build_object('detection', private.offload_detecter(t.client_id, null),
                                     'echeances', private.offload_echeances_cycle(t.client_id, null));
      end if;
      perform private.finir_travail(t.id, r);
      n_ok := n_ok + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 2000), true);
      n_ko := n_ko + 1;
    end;
  end loop;
  return jsonb_build_object('faits', n_ok, 'echecs', n_ko);
end $function$;

-- Le suivi des envois : un message d'échéance a son propre suivi.
create or replace function private.offload_suivre_envoi(p_charge jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.offload_reprises;
  e public.envois;
  v_issue text := split_part(coalesce(p_charge ->> 'evenement', ''), '.', 2);
  v_rang integer;
begin
  if p_charge ->> 'objet_type' = 'offload_echeances' and p_charge ->> 'envoi' is not null then
    return private.offload_suivre_envoi_echeance(p_charge);
  end if;
  if p_charge ->> 'objet_type' is distinct from 'offload_reprises' or p_charge ->> 'envoi' is null then
    return jsonb_build_object('statut', 'ignore');
  end if;
  select * into e from public.envois where id = (p_charge ->> 'envoi')::uuid;
  select * into r from public.offload_reprises where id = (p_charge ->> 'objet_id')::uuid for update;
  if e.id is null or r.id is null or r.client_id <> e.client_id then
    return jsonb_build_object('statut', 'introuvable');
  end if;
  v_rang := case when r.envoi1_id = e.id then 1 when r.envoi2_id = e.id then 2 end;
  if v_rang is null or r.statut in ('repondue', 'close') then
    return jsonb_build_object('statut', 'sans_effet', 'reprise', r.statut);
  end if;

  if v_issue = 'envoye' then
    if v_rang = 1 then
      update public.offload_reprises set statut = 'envoyee', envoye1_le = coalesce(e.envoye_le, now()), maj_le = now()
       where id = r.id and statut in ('a_valider', 'appel');
    else
      update public.offload_reprises set statut = 'relancee', envoye2_le = coalesce(e.envoye_le, now()), maj_le = now()
       where id = r.id and statut = 'relance_a_valider';
    end if;
    perform private.journaliser_module(r.client_id, 'offload', 'offload.message_envoye', 'offload_reprises', r.id::text,
      jsonb_build_object('envoi', e.id, 'rang', v_rang, 'mode', e.mode), r.entite_id);
    return jsonb_build_object('statut', 'envoye', 'rang', v_rang);
  elsif v_issue = 'refuse' then
    -- Refusé en validation : une personne a dit non, la reprise s'arrête là.
    perform private.offload_clore(r.id, 'refusee', 'Le message de rang ' || v_rang || ' a été refusé en validation.');
    return jsonb_build_object('statut', 'refusee', 'rang', v_rang);
  elsif v_issue in ('bloque', 'annule', 'expire', 'echec', 'non_remis') then
    if v_rang = 1 then
      update public.offload_reprises set statut = 'appel', maj_le = now(),
             motif = left(format('Le message n''est pas parti (%s%s) : la reprise passe par l''appel.', v_issue,
                                 coalesce(', ' || e.verrou, '')), 500)
       where id = r.id;
    else
      -- La relance ne part pas : le compte sort du cycle, l'appel reste.
      perform private.offload_clore(r.id, 'sans_reponse', format('La relance n''est pas partie (%s%s).', v_issue, coalesce(', ' || e.verrou, '')));
    end if;
    perform private.journaliser_module(r.client_id, 'offload', 'offload.message_non_parti', 'offload_reprises', r.id::text,
      jsonb_build_object('envoi', e.id, 'rang', v_rang, 'issue', v_issue, 'verrou', e.verrou), r.entite_id);
    return jsonb_build_object('statut', v_issue, 'rang', v_rang);
  end if;
  return jsonb_build_object('statut', 'ignore');
end $function$;

-- Le point du matin : avec les échéances de la semaine et les contrats qui s'éteignent.
create or replace function private.offload_point_lignes(p_client uuid, p_jour date)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_items jsonb := '[]'::jsonb;
  v_n integer;
begin
  -- 1. Les réponses à traiter.
  for r in
    select t.titre, t.detail, t.compte_id from public.offload_taches t
    where t.client_id = p_client and t.type = 'repondre' and t.statut = 'a_faire'
    order by t.echeance, t.cree_le limit 10
  loop
    v_items := v_items || jsonb_build_object('texte', left(r.detail, 300), 'gravite', 'attention', 'lien', '/espace/offload',
                                             'objet_type', 'offload_comptes', 'objet_id', r.compte_id::text);
  end loop;
  -- 2. Avant la clôture : les comptes à risque dont la commande devait tomber ce mois-ci.
  for r in
    select c.nom, s.compte_id, s.cloture_le, s.raisons, s.priorite from public.offload_signaux s join public.offload_comptes c on c.id = s.compte_id
    where s.client_id = p_client and s.avant_cloture and c.statut = 'suivi'
    order by s.priorite desc limit 10
  loop
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : à joindre avant la clôture du %s. %s', r.nom, private.offload_le(r.cloture_le), r.raisons -> 0 ->> 'phrase'), 300),
      'gravite', 'attention', 'lien', '/espace/offload', 'objet_type', 'offload_comptes', 'objet_id', r.compte_id::text);
  end loop;
  -- 3. Les comptes entrés à risque ces dernières 24 heures.
  for r in
    select c.nom, s.compte_id, s.raisons from public.offload_signaux s join public.offload_comptes c on c.id = s.compte_id
    where s.client_id = p_client and s.niveau in ('eteint', 'decroche', 'saison', 'ralentit') and s.depuis_le >= p_jour - 1
      and not s.avant_cloture and c.statut = 'suivi'
    order by s.priorite desc limit 10
  loop
    v_items := v_items || jsonb_build_object('texte', left(r.nom || ' : ' || (r.raisons -> 0 ->> 'phrase'), 300), 'gravite', 'info',
                                             'lien', '/espace/offload', 'objet_type', 'offload_comptes', 'objet_id', r.compte_id::text);
  end loop;
  -- 4. Les appels du jour et en retard.
  select count(*) into v_n from public.offload_taches t
  where t.client_id = p_client and t.type = 'appel' and t.statut = 'a_faire' and t.echeance <= p_jour;
  if v_n > 0 then
    v_items := v_items || jsonb_build_object('texte', format('%s appel%s de reprise à passer aujourd''hui ou en retard.', v_n,
                                                             case when v_n > 1 then 's' else '' end),
                                             'gravite', 'info', 'lien', '/espace/offload');
  end if;
  -- 5. Les messages qui attendent une validation.
  select count(*) into v_n from public.offload_reprises p
  where p.client_id = p_client and p.statut in ('a_valider', 'relance_a_valider');
  if v_n > 0 then
    v_items := v_items || jsonb_build_object('texte', format('%s message%s de reprise attend%s votre validation.', v_n,
                                                             case when v_n > 1 then 's' else '' end, case when v_n > 1 then 'ent' else '' end),
                                             'gravite', 'info', 'lien', '/espace/validations');
  end if;
  -- 6. Les échéances de la semaine (réglementaires d'abord) et les contrats qui s'éteignent (c4_07).
  for r in
    select h.*, k.nom, q.designation, q.site from public.offload_echeances h
    join public.offload_comptes k on k.id = h.compte_id
    left join public.offload_equipements q on q.id = h.equipement_id
    where h.client_id = p_client
      and ((h.type = 'entretien' and h.statut in ('a_venir', 'a_valider', 'appel') and h.due_le between p_jour and p_jour + 7)
           or (h.type = 'contrat' and h.s_eteint and h.statut <> 'close' and h.due_le >= p_jour - 30))
    order by h.type desc, (h.nature = 'reglementaire') desc, h.due_le limit 10
  loop
    v_items := v_items || jsonb_build_object(
      'texte', left(case when r.type = 'contrat' then coalesce(r.motif, 'Contrat qui s''éteint.') || ' — ' || r.nom
                         else format('%s : %s de %s%s le %s', r.nom,
                                     case when r.nature = 'reglementaire' then 'contrôle réglementaire' else 'entretien' end,
                                     r.designation, coalesce(' (' || r.site || ')', ''), private.offload_le(r.due_le)) end, 300),
      'gravite', case when r.type = 'contrat' or r.nature = 'reglementaire' then 'attention' else 'info' end,
      'lien', '/espace/offload', 'objet_type', 'offload_comptes', 'objet_id', r.compte_id::text);
  end loop;
  return v_items;
end $function$;

-- La nuit : détection, doublons, cycle des reprises, puis échéances.
create or replace function private.offload_detecter_tout(p_jour date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k record;
  n integer := 0;
  e integer := 0;
begin
  for k in select g.client_id from public.offload_reglages g order by g.client_id loop
    begin
      perform private.offload_detecter(k.client_id, p_jour);
      perform private.offload_proposer_rapprochements(k.client_id);
      perform private.offload_cycle(k.client_id, p_jour);
      perform private.offload_echeances_cycle(k.client_id, p_jour);
      n := n + 1;
    exception when others then
      e := e + 1;
      perform private.lever_alerte_module(k.client_id, 'offload', 'attention',
        'La détection des clients qui décrochent n''a pas pu être calculée.',
        jsonb_build_object('erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'offload:detection', false, null);
    end;
  end loop;
  return jsonb_build_object('organisations', n, 'echecs', e);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 9. Droits (à inscrire dans a5_01 : les trois portes de saisie)
-- ─────────────────────────────────────────────────────────────────────────
revoke all on function public.offload_saisir_equipement(uuid, text, text, jsonb) from public, anon;
revoke all on function public.offload_noter_intervention(uuid, date, text, boolean, text) from public, anon;
revoke all on function public.offload_saisir_contrat(uuid, text, date, jsonb) from public, anon;
revoke all on function public.offload_parc(uuid) from public, anon;
revoke all on function public.offload_echeances_tableau(uuid) from public, anon;
revoke all on function public.offload_parc_compte(uuid) from public, anon;
grant execute on function public.offload_saisir_equipement(uuid, text, text, jsonb) to authenticated, service_role;
grant execute on function public.offload_noter_intervention(uuid, date, text, boolean, text) to authenticated, service_role;
grant execute on function public.offload_saisir_contrat(uuid, text, date, jsonb) to authenticated, service_role;
grant execute on function public.offload_parc(uuid) to authenticated, service_role;
grant execute on function public.offload_echeances_tableau(uuid) to authenticated, service_role;
grant execute on function public.offload_parc_compte(uuid) to authenticated, service_role;
revoke execute on function private.offload_saisir_equipement(uuid, text, text, jsonb) from public, anon;
revoke execute on function private.offload_noter_intervention(uuid, date, text, boolean, text) from public, anon;
revoke execute on function private.offload_saisir_contrat(uuid, text, date, jsonb) from public, anon;
grant execute on function private.offload_saisir_equipement(uuid, text, text, jsonb) to authenticated, service_role;
grant execute on function private.offload_noter_intervention(uuid, date, text, boolean, text) to authenticated, service_role;
grant execute on function private.offload_saisir_contrat(uuid, text, date, jsonb) to authenticated, service_role;
revoke execute on function private.offload_lire_periodicite(text) from public, anon, authenticated;
grant execute on function private.offload_lire_periodicite(text) to service_role;
revoke execute on function private.offload_lire_nature(text) from public, anon, authenticated;
grant execute on function private.offload_lire_nature(text) to service_role;
revoke execute on function private.offload_lire_reconduction(text) from public, anon, authenticated;
grant execute on function private.offload_lire_reconduction(text) to service_role;
revoke execute on function private.offload_message_echeance(uuid) from public, anon, authenticated;
grant execute on function private.offload_message_echeance(uuid) to service_role;
revoke execute on function private.offload_ecarte_echeance(uuid, date) from public, anon, authenticated;
grant execute on function private.offload_ecarte_echeance(uuid, date) to service_role;
revoke execute on function private.offload_echeances_cycle(uuid, date) from public, anon, authenticated;
grant execute on function private.offload_echeances_cycle(uuid, date) to service_role;
revoke execute on function private.offload_suivre_envoi_echeance(jsonb) from public, anon, authenticated;
grant execute on function private.offload_suivre_envoi_echeance(jsonb) to service_role;
revoke execute on function private.offload_appliquer_releve(jsonb) from public, anon, authenticated;
grant execute on function private.offload_appliquer_releve(jsonb) to service_role;
revoke execute on function private.offload_traiter_travaux(integer) from public, anon, authenticated;
grant execute on function private.offload_traiter_travaux(integer) to service_role;
revoke execute on function private.offload_suivre_envoi(jsonb) from public, anon, authenticated;
grant execute on function private.offload_suivre_envoi(jsonb) to service_role;
revoke execute on function private.offload_point_lignes(uuid, date) from public, anon, authenticated;
grant execute on function private.offload_point_lignes(uuid, date) to service_role;
revoke execute on function private.offload_detecter_tout(date) from public, anon, authenticated;
grant execute on function private.offload_detecter_tout(date) to service_role;
