-- 20260928214838 daliro_m0a_referentiel
-- Source : statements de la recette.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : aucune.
-- ═══════════════════════════════════════════════════════════════════════════
-- Daliro (BTP), M0 RÉFÉRENTIEL, partie a — réglages, chantiers, lots,
-- équipes, intervenants et annuaire des tiers, avec l'écran de contrôle.
--
-- Plan : OMEGA/moteurs/btp.md (M0, §3.3). Règles : docs/socle/BRIQUES.md.
-- Preuves : supabase/tests/database/daliro_m0a_referentiel.test.sql
--
-- Ce que la base tient, pas l'appelant :
--  · un chantier est une entité « site » du socle, créée par la base : le
--    périmètre d'un conducteur, les seuils par chantier et le journal par
--    chantier viennent du socle sans rien ajouter ;
--  · le territoire (jours fériés, brique B5), le fuseau, le département et la
--    zone de TVA se déduisent du code postal ; le régime de TVA du chantier
--    se déduit de la zone et de la place du client ;
--  · le quota de chantiers ouverts de la formule (5, 20, sur mesure) ;
--  · un chantier ne s'ouvre qu'avec sa situation contractuelle complète ;
--  · un numéro de téléphone désigne une seule personne ou entreprise dans
--    l'organisation : M1 reconnaît l'expéditeur par son numéro ;
--  · l'écran de contrôle (vue btp_controle) dit, chantier par chantier, ce qui
--    empêche un moteur de travailler.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Outils ─────────────────────────────────────────────────────────────

-- Texte comparable : minuscules, sans accents, ponctuation réduite à une
-- espace. Ne dépend pas de la locale : les majuscules accentuées sont
-- traduites aussi.
create function private.btp_normaliser(p text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select nullif(btrim(regexp_replace(
    translate(
      replace(replace(replace(replace(lower(p), 'œ', 'oe'), 'Œ', 'oe'), 'æ', 'ae'), 'Æ', 'ae'),
      'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸ',
      'aaaaaaceeeeiiiinooooouuuuyyaaaaaaceeeeiiiinooooouuuuyy'),
    '[^a-z0-9]+', ' ', 'g')), '')
$$;
comment on function private.btp_normaliser(text) is
  'Texte comparable : minuscules, sans accents, ponctuation réduite à une espace.';

-- Clé de Luhn (SIREN, SIRET).
create function private.btp_luhn(p text) returns boolean
language sql immutable parallel safe set search_path = '' as $$
  select coalesce(p ~ '^[0-9]+$', false) and (
    select sum(case when (length(p) - i) % 2 = 1
                    then case when d * 2 > 9 then d * 2 - 9 else d * 2 end
                    else d end) % 10 = 0
    from (select i, substr(p, i, 1)::int as d from generate_series(1, length(p)) as i) x)
$$;

-- SIRET : clé de Luhn, sauf La Poste, dont la somme des chiffres est un multiple de 5.
create function private.btp_siret_valide(p text) returns boolean
language sql immutable parallel safe set search_path = '' as $$
  select coalesce(p ~ '^[0-9]{14}$', false) and (
    private.btp_luhn(p)
    or (left(p, 9) = '356000000'
        and (select sum(substr(p, i, 1)::int) from generate_series(1, 14) i) % 5 = 0))
$$;

-- Le territoire de la brique B5 (jours fériés, fuseau), depuis le code postal.
-- Nul pour un code que Daliro ne couvre pas (Monaco, TAAF, code impossible).
create function private.btp_territoire(p_code_postal text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select case
    when p_code_postal is null or p_code_postal !~ '^[0-9]{5}$' then null
    when p_code_postal = '97133' then 'saint-barthelemy'
    when p_code_postal = '97150' then 'saint-martin'
    when left(p_code_postal, 3) = '971' then 'guadeloupe'
    when left(p_code_postal, 3) = '972' then 'martinique'
    when left(p_code_postal, 3) = '973' then 'guyane'
    when left(p_code_postal, 3) = '974' then 'la-reunion'
    when left(p_code_postal, 3) = '975' then 'saint-pierre-et-miquelon'
    when left(p_code_postal, 3) = '976' then 'mayotte'
    when left(p_code_postal, 3) = '986' then 'wallis-et-futuna'
    when left(p_code_postal, 3) = '987' then 'polynesie-francaise'
    when left(p_code_postal, 3) = '988' then 'nouvelle-caledonie'
    when left(p_code_postal, 2) in ('00', '96', '97', '98', '99') then null
    when left(p_code_postal, 2) in ('57', '67', '68') then 'alsace-moselle'
    else 'metropole'
  end
$$;
comment on function private.btp_territoire(text) is
  'Territoire des jours fériés (brique B5) d''un code postal ; nul hors de ce que Daliro couvre.';

-- La zone de TVA : la métropole continentale, la Corse (CGI art. 297), les
-- trois départements d'outre-mer où la TVA s'applique (CGI art. 296), la
-- Guyane et Mayotte où elle ne s'applique pas (CGI art. 294), et les
-- collectivités d'outre-mer, hors du champ de la TVA française.
create function private.btp_zone_tva(p_code_postal text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select case
    when t is null then null
    when t = 'metropole' and left(p_code_postal, 2) = '20' then 'corse'
    when t in ('metropole', 'alsace-moselle') then 'metropole'
    when t in ('guadeloupe', 'martinique', 'la-reunion', 'guyane', 'mayotte') then t
    else 'hors_champ'
  end
  from (select private.btp_territoire(p_code_postal) as t) x
$$;

-- Le département d'un code postal (zones d'intervention de l'annuaire).
create function private.btp_departement(p_code_postal text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select case
    when private.btp_territoire(p_code_postal) is null then null
    when left(p_code_postal, 2) = '20' then case when p_code_postal < '20200' then '2A' else '2B' end
    when p_code_postal = '97133' then '977'
    when p_code_postal = '97150' then '978'
    when left(p_code_postal, 2) in ('97', '98') then left(p_code_postal, 3)
    else left(p_code_postal, 2)
  end
$$;

create function private.btp_departements_valides(p text[]) returns boolean
language sql immutable parallel safe set search_path = '' as $$
  select coalesce(bool_and(d ~ '^(0[1-9]|1[0-9]|2[1-9]|[3-8][0-9]|9[0-5]|2A|2B|97[1-8]|98[678])$'), true)
  from unnest(p) d
$$;

-- Le régime de TVA d'un chantier, par la base :
--  · hors du champ de la TVA française (collectivités d'outre-mer) ;
--  · non applicable en Guyane et à Mayotte (CGI art. 294) ;
--  · autoliquidée quand le client est sous-traitant (CGI art. 283-2 nonies) ;
--  · sinon, TVA due au taux de chaque ligne.
create function private.btp_regime_tva(p_zone text, p_place_client text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select case
    when p_zone is null then null
    when p_zone = 'hors_champ' then 'hors_champ'
    when p_zone in ('guyane', 'mayotte') then 'non_applicable'
    when p_place_client = 'sous_traitant' then 'autoliquidation'
    else 'normal'
  end
$$;

revoke all on function private.btp_normaliser(text), private.btp_luhn(text), private.btp_siret_valide(text), private.btp_territoire(text),
  private.btp_zone_tva(text), private.btp_departement(text), private.btp_departements_valides(text[]),
  private.btp_regime_tva(text, text) from public;
grant execute on function private.btp_normaliser(text), private.btp_luhn(text), private.btp_siret_valide(text), private.btp_territoire(text),
  private.btp_zone_tva(text), private.btp_departement(text), private.btp_departements_valides(text[]),
  private.btp_regime_tva(text, text) to authenticated, service_role;

-- Le code ISO 3166 que porte l'entité « site » du chantier : celui du
-- département en métropole (FR-75, FR-2A, FR-67…), sinon le premier code
-- que la brique B5 donne au territoire. public.territoire_de_entite() rend
-- ainsi exactement le calendrier du chantier, Alsace-Moselle comprise.
create function private.btp_iso_chantier(p_code_postal text) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when private.btp_territoire(p_code_postal) in ('metropole', 'alsace-moselle')
      then 'FR-' || private.btp_departement(p_code_postal)
    else (select t.iso[1] from public.territoires t where t.code = private.btp_territoire(p_code_postal))
  end
$$;
revoke all on function private.btp_iso_chantier(text) from public;

-- ── 2. Les corps d'état (référence commune, sans donnée de client) ───────

create table public.btp_corps_etat (
  code text primary key check (code ~ '^[a-z][a-z_]{1,39}$'),
  libelle text not null check (char_length(btrim(libelle)) between 1 and 120),
  rang_sequence smallint not null check (rang_sequence between 1 and 99),
  exterieur boolean not null default false
);
comment on table public.btp_corps_etat is
  'Corps d''état du bâtiment. rang_sequence : ordre habituel d''intervention [H], qui sert à proposer les dépendances ; exterieur : tâches exposées aux intempéries par défaut.';

insert into public.btp_corps_etat (code, libelle, rang_sequence, exterieur) values
  ('demolition', 'Démolition, curage', 1, false),
  ('terrassement_vrd', 'Terrassement, voirie et réseaux divers', 2, true),
  ('gros_oeuvre', 'Gros œuvre, maçonnerie', 3, true),
  ('charpente', 'Charpente', 4, true),
  ('couverture', 'Couverture, zinguerie', 5, true),
  ('etancheite', 'Étanchéité', 5, true),
  ('menuiserie_exterieure', 'Menuiseries extérieures', 6, false),
  ('facade', 'Façades, ravalement, bardage, isolation par l''extérieur', 7, true),
  ('electricite', 'Électricité', 8, false),
  ('plomberie', 'Plomberie, sanitaires', 8, false),
  ('cvc', 'Chauffage, ventilation, climatisation', 8, false),
  ('isolation', 'Isolation', 9, false),
  ('platrerie', 'Plâtrerie, cloisons, doublages, faux plafonds', 10, false),
  ('chape', 'Chapes', 11, false),
  ('menuiserie_interieure', 'Menuiseries intérieures, agencement', 12, false),
  ('carrelage', 'Carrelage, faïence', 13, false),
  ('sols_souples', 'Sols souples, parquets', 14, false),
  ('peinture', 'Peinture, revêtements muraux', 15, false),
  ('serrurerie', 'Serrurerie, métallerie', 15, false),
  ('ascenseur', 'Ascenseurs', 16, false),
  ('espaces_verts', 'Espaces verts, clôtures', 17, true),
  ('nettoyage', 'Nettoyage de fin de chantier', 18, false);

alter table public.btp_corps_etat enable row level security;
revoke all on table public.btp_corps_etat from anon, authenticated;
grant select on table public.btp_corps_etat to authenticated;
grant all on table public.btp_corps_etat to service_role;
create policy "tout compte lit les corps d'etat" on public.btp_corps_etat
  for select to authenticated using (true);

-- ── 3. Les réglages de Daliro pour une organisation ──────────────────────
-- La formule ouvre les fonctions et fixe les quotas de la page
-- (textes.ts, comparatif des formules) : 5 chantiers et 2 comptes bureau,
-- 20 et 5, ou sur mesure. Posés par Omega à l'installation.

create table public.btp_reglages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients (id) on delete cascade,
  formule text not null check (formule in ('demarrage', 'chantiers', 'entreprise')),
  quota_chantiers integer not null check (quota_chantiers between 1 and 5000),
  quota_comptes_bureau integer not null check (quota_comptes_bureau between 1 and 5000),
  installe_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint btp_reglages_quotas_de_la_formule check (
    formule = 'entreprise'
    or (formule = 'demarrage' and quota_chantiers = 5 and quota_comptes_bureau = 2)
    or (formule = 'chantiers' and quota_chantiers = 20 and quota_comptes_bureau = 5))
);
comment on table public.btp_reglages is
  'Daliro installé pour une organisation : sa formule et ses quotas. Sans ligne, aucun chantier ne s''ouvre.';

-- Les fonctions de chaque formule, telles que la page les promet.
create function public.btp_fonctions_de(p_formule text) returns text[]
language sql immutable parallel safe set search_path = '' as $$
  select case p_formule
    when 'demarrage' then array['lecture', 'avenants', 'signature', 'confirmation_j2', 'annuaire',
                                'point_matin', 'questions', 'audit']
    when 'chantiers' then array['lecture', 'avenants', 'signature', 'confirmation_j2', 'annuaire',
                                'point_matin', 'questions', 'audit',
                                'relance_avenants', 'remplacants', 'ordre_lots', 'meteo', 'liste_cadencee',
                                'livraisons_calees', 'roles_droits', 'journal_validations', 'point_mensuel']
    when 'entreprise' then array['lecture', 'avenants', 'signature', 'confirmation_j2', 'annuaire',
                                 'point_matin', 'questions', 'audit',
                                 'relance_avenants', 'remplacants', 'ordre_lots', 'meteo', 'liste_cadencee',
                                 'livraisons_calees', 'roles_droits', 'journal_validations', 'point_mensuel',
                                 'retours', 'bons_livraison', 'situations']
  end
$$;
comment on function public.btp_fonctions_de(text) is
  'Les fonctions ouvertes par une formule de Daliro (comparatif de la page omegaai.fr/secteurs/btp).';

create function public.btp_fonction_ouverte(p_client uuid, p_fonction text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select coalesce((select p_fonction = any (public.btp_fonctions_de(r.formule))
                   from public.btp_reglages r where r.client_id = p_client), false)
$$;
comment on function public.btp_fonction_ouverte(uuid, text) is
  'Vrai si la formule de l''organisation ouvre cette fonction. Sous la RLS : un non-membre lit faux.';
revoke all on function public.btp_fonctions_de(text), public.btp_fonction_ouverte(uuid, text) from public, anon;
grant execute on function public.btp_fonctions_de(text), public.btp_fonction_ouverte(uuid, text)
  to authenticated, service_role;

create function private.btp_preparer_reglages() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_ouverts integer;
  v_chantiers integer := case new.formule when 'demarrage' then 5 when 'chantiers' then 20 end;
  v_comptes integer := case new.formule when 'demarrage' then 2 when 'chantiers' then 5 end;
begin
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.client_id := old.client_id;
    new.installe_le := old.installe_le;
  end if;
  -- Les quotas de Démarrage et de Chantiers sont ceux de la page ; un quota
  -- donné qui les contredit est refusé par la contrainte, jamais corrigé en silence.
  if new.formule in ('demarrage', 'chantiers') then
    if tg_op = 'INSERT' then
      new.quota_chantiers := coalesce(new.quota_chantiers, v_chantiers);
      new.quota_comptes_bureau := coalesce(new.quota_comptes_bureau, v_comptes);
    elsif new.formule is distinct from old.formule then
      if new.quota_chantiers is not distinct from old.quota_chantiers then
        new.quota_chantiers := v_chantiers;
      end if;
      if new.quota_comptes_bureau is not distinct from old.quota_comptes_bureau then
        new.quota_comptes_bureau := v_comptes;
      end if;
    end if;
  elsif new.quota_chantiers is null or new.quota_comptes_bureau is null then
    raise exception 'La formule Entreprise est sur mesure : donnez le nombre de chantiers et de comptes bureau.'
      using errcode = '22023';
  end if;
  if tg_op = 'UPDATE' then
    perform pg_advisory_xact_lock(hashtextextended('daliro.quota:' || new.client_id::text, 0));
    select count(*) into v_ouverts from public.btp_chantiers c
    where c.client_id = new.client_id and c.statut in ('ouvert', 'suspendu');
    if v_ouverts > new.quota_chantiers then
      raise exception '% chantiers sont ouverts : la nouvelle formule n''en suit que %. Fermez-en d''abord %.',
        v_ouverts, new.quota_chantiers, v_ouverts - new.quota_chantiers using errcode = 'P0001';
    end if;
  end if;
  new.maj_le := now();
  return new;
end $$;
revoke all on function private.btp_preparer_reglages() from public;

create trigger btp_reglages_preparer before insert or update on public.btp_reglages
  for each row execute function private.btp_preparer_reglages();

-- La porte d'installation, pour le serveur d'Omega.
create function private.btp_installer(
  p_client uuid, p_formule text, p_quota_chantiers integer default null, p_quota_comptes integer default null
) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.clients where id = p_client) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  insert into public.btp_reglages (client_id, formule, quota_chantiers, quota_comptes_bureau)
  values (p_client, p_formule, p_quota_chantiers, p_quota_comptes)
  on conflict (client_id) do update
    set formule = excluded.formule,
        quota_chantiers = excluded.quota_chantiers,
        quota_comptes_bureau = excluded.quota_comptes_bureau
  returning id into v_id;
  return v_id;
end $$;
revoke all on function private.btp_installer(uuid, text, integer, integer) from public;
grant execute on function private.btp_installer(uuid, text, integer, integer) to service_role;

create function public.btp_installer(
  p_client uuid, p_formule text, p_quota_chantiers integer default null, p_quota_comptes integer default null
) returns uuid
language sql volatile security invoker set search_path = '' as $$
  select private.btp_installer(p_client, p_formule, p_quota_chantiers, p_quota_comptes)
$$;
revoke all on function public.btp_installer(uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.btp_installer(uuid, text, integer, integer) to service_role;

-- ── 4. L'annuaire des tiers ───────────────────────────────────────────────
-- Maîtres d'ouvrage, maîtres d'œuvre, sous-traitants, titulaires d'autres
-- lots, fournisseurs, loueurs, entreprises principales (quand le client est
-- lui-même sous-traitant). Un tiers peut tenir plusieurs rôles.

create table public.btp_tiers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  roles text[] not null check (
    cardinality(roles) between 1 and 8
    and roles <@ array['maitre_ouvrage', 'maitre_oeuvre', 'sous_traitant', 'autre_titulaire', 'fournisseur',
                       'loueur', 'entreprise_principale', 'controleur']),
  personne_physique boolean not null default false,
  nom text not null check (char_length(btrim(nom)) between 1 and 200),
  siren text check (siren is null or (siren ~ '^[0-9]{9}$' and private.btp_luhn(siren))),
  siret text check (siret ~ '^[0-9]{14}$'),
  contact_nom text check (char_length(contact_nom) <= 120),
  telephone text check (telephone ~ '^\+[1-9][0-9]{7,14}$'),
  email text check (char_length(email) <= 320 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  canal text check (canal in ('whatsapp', 'sms', 'email', 'telephone')),
  adresse text check (char_length(adresse) <= 300),
  code_postal text check (code_postal ~ '^[0-9]{5}$'),
  commune text check (char_length(commune) <= 120),
  corps_etat text[] not null default '{}',
  departements text[] not null default '{}' check (private.btp_departements_valides(departements)),
  confirmer_passages boolean not null default true,
  vigilance_attestation_le date,
  vigilance_verifiee_le timestamptz,
  vigilance_verifiee_par uuid,
  actif boolean not null default true,
  note text check (char_length(note) <= 2000),
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint btp_tiers_client_id_id_key unique (client_id, id),
  constraint btp_tiers_siret_du_siren check (siret is null or siren is null or left(siret, 9) = siren),
  constraint btp_tiers_siret_valide check (siret is null or private.btp_siret_valide(siret)),
  constraint btp_tiers_particulier_sans_siren check (not personne_physique or siren is null),
  constraint btp_tiers_vigilance_verifiee check (vigilance_verifiee_le is null or vigilance_attestation_le is not null)
);
comment on table public.btp_tiers is
  'L''annuaire : tiers de l''organisation, leurs rôles, leurs corps d''état et zones, leur état de vigilance (C. trav. D8222-5).';
comment on column public.btp_tiers.confirmer_passages is
  'Faux : ses passages ne reçoivent pas de demande à J-2 (titulaire d''un autre lot quand le client ne coordonne pas).';
comment on column public.btp_tiers.vigilance_attestation_le is
  'Date de l''attestation de vigilance de l''Urssaf ; elle vaut six mois (C. trav. D8222-5).';
comment on column public.btp_tiers.vigilance_verifiee_le is
  'Authenticité de l''attestation vérifiée auprès de l''Urssaf (code de sécurité), par une personne.';

create index btp_tiers_client_idx on public.btp_tiers (client_id);
create unique index btp_tiers_un_telephone_idx on public.btp_tiers (client_id, telephone)
  where actif and telephone is not null;

-- L'état de vigilance d'un tiers, à une date : les obligations de l'art.
-- D8222-5 (attestation de moins de six mois, vérifiée), « à renouveler »
-- quinze jours avant l'échéance.
create function public.btp_etat_vigilance(
  p_roles text[], p_attestation date, p_verifiee timestamptz, p_au date default current_date
) returns text
language sql stable parallel safe set search_path = '' as $$
  select case
    when not (coalesce(p_roles, '{}') && array['sous_traitant']) then 'sans_objet'
    when p_attestation is null then 'absente'
    when p_au >= (p_attestation + interval '6 months')::date then 'echue'
    when p_verifiee is null then 'a_verifier'
    when p_au >= (p_attestation + interval '6 months' - interval '15 days')::date then 'a_renouveler'
    else 'a_jour'
  end
$$;
comment on function public.btp_etat_vigilance(text[], date, timestamptz, date) is
  'sans_objet, absente, a_verifier, a_jour, a_renouveler (15 jours avant les six mois) ou echue.';
revoke all on function public.btp_etat_vigilance(text[], date, timestamptz, date) from public, anon;
grant execute on function public.btp_etat_vigilance(text[], date, timestamptz, date) to authenticated, service_role;

-- ── 5. Les équipes et les intervenants ───────────────────────────────────
-- Chefs d'équipe et compagnons : ils n'ont pas de compte ; ils sont reconnus
-- par leur numéro. Leurs messages ne sont lus qu'une fois la date
-- d'information posée (C. trav. L1222-4).

create table public.btp_equipes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  nom text not null check (char_length(btrim(nom)) between 1 and 80),
  chef_id uuid,
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  constraint btp_equipes_client_id_id_key unique (client_id, id),
  constraint btp_equipes_un_nom unique (client_id, nom)
);
comment on table public.btp_equipes is 'Les équipes du client, chacune menée par un chef d''équipe.';

create table public.btp_intervenants (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  nom text not null check (char_length(btrim(nom)) between 1 and 120),
  telephone text check (telephone ~ '^\+[1-9][0-9]{7,14}$'),
  role_terrain text not null default 'compagnon' check (role_terrain in ('chef_equipe', 'compagnon', 'conducteur', 'autre')),
  equipe_id uuid,
  informe_le date,
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint btp_intervenants_client_id_id_key unique (client_id, id),
  foreign key (client_id, equipe_id) references public.btp_equipes (client_id, id) on delete set null (equipe_id)
);
comment on table public.btp_intervenants is
  'Chefs d''équipe et compagnons, sans compte, reconnus par leur numéro au format E.164.';
comment on column public.btp_intervenants.informe_le is
  'Date à laquelle la personne a été informée que ses messages sont lus par Daliro (C. trav. L1222-4). Sans elle, M1 ne lit rien d''elle.';

create index btp_intervenants_equipe_idx on public.btp_intervenants (client_id, equipe_id);
create unique index btp_intervenants_un_telephone_idx on public.btp_intervenants (client_id, telephone)
  where actif and telephone is not null;

alter table public.btp_equipes
  add constraint btp_equipes_chef_fkey foreign key (client_id, chef_id)
    references public.btp_intervenants (client_id, id) on delete set null (chef_id);
create index btp_equipes_chef_idx on public.btp_equipes (client_id, chef_id);

-- Un numéro, une seule personne ou entreprise active dans l'organisation :
-- intervenants et tiers confondus.
create function private.btp_telephone_unique() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.telephone is null or not new.actif then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('daliro.telephone:' || new.client_id::text || new.telephone, 0));
  if exists (select 1 from public.btp_intervenants i
             where i.client_id = new.client_id and i.telephone = new.telephone and i.actif
               and (tg_table_name <> 'btp_intervenants' or i.id <> new.id))
     or exists (select 1 from public.btp_tiers t
                where t.client_id = new.client_id and t.telephone = new.telephone and t.actif
                  and (tg_table_name <> 'btp_tiers' or t.id <> new.id)) then
    raise exception 'Le numéro % est déjà celui d''une autre personne de l''annuaire : un numéro ne désigne qu''une personne.',
      new.telephone using errcode = '23505';
  end if;
  return new;
end $$;
revoke all on function private.btp_telephone_unique() from public;

create function private.btp_preparer_personne() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.nom := btrim(new.nom);
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.client_id := old.client_id;
    new.cree_le := old.cree_le;
  end if;

  if tg_table_name = 'btp_intervenants' then
    if new.informe_le is not null and new.informe_le > current_date + 1 then
      raise exception 'La date d''information ne peut pas être dans le futur.' using errcode = '22023';
    end if;
    new.maj_le := now();
  elsif tg_table_name = 'btp_tiers' then
    if exists (select 1 from unnest(new.corps_etat) c
               where not exists (select 1 from public.btp_corps_etat r where r.code = c)) then
      raise exception 'Corps d''état inconnu parmi %.', new.corps_etat using errcode = '23503';
    end if;
    if tg_op = 'INSERT' then
      if new.vigilance_verifiee_le is not null then
        new.vigilance_verifiee_par := coalesce((select auth.uid()), new.vigilance_verifiee_par);
      end if;
    elsif new.vigilance_attestation_le is distinct from old.vigilance_attestation_le
          and new.vigilance_verifiee_le is not distinct from old.vigilance_verifiee_le then
      -- Une nouvelle attestation n'est pas encore vérifiée.
      new.vigilance_verifiee_le := null;
      new.vigilance_verifiee_par := null;
    elsif new.vigilance_verifiee_le is distinct from old.vigilance_verifiee_le then
      new.vigilance_verifiee_par := case when new.vigilance_verifiee_le is null then null
                                         else coalesce((select auth.uid()), new.vigilance_verifiee_par) end;
    end if;
    new.maj_le := now();
  end if;
  return new;
end $$;
revoke all on function private.btp_preparer_personne() from public;

create trigger btp_tiers_preparer before insert or update on public.btp_tiers
  for each row execute function private.btp_preparer_personne();
create trigger btp_tiers_telephone before insert or update of telephone, actif on public.btp_tiers
  for each row execute function private.btp_telephone_unique();
create trigger btp_equipes_preparer before insert or update on public.btp_equipes
  for each row execute function private.btp_preparer_personne();
create trigger btp_intervenants_preparer before insert or update on public.btp_intervenants
  for each row execute function private.btp_preparer_personne();
create trigger btp_intervenants_telephone before insert or update of telephone, actif on public.btp_intervenants
  for each row execute function private.btp_telephone_unique();

-- ── 6. Les chantiers ─────────────────────────────────────────────────────

create table public.btp_chantiers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  entite_id uuid not null,
  nom text not null check (char_length(btrim(nom)) between 1 and 200),
  alias text[] not null default '{}' check (cardinality(alias) <= 20),
  reference text check (char_length(reference) <= 60),
  adresse text check (char_length(adresse) <= 300),
  code_postal text not null check (code_postal ~ '^[0-9]{5}$'),
  commune text not null check (char_length(btrim(commune)) between 1 and 120),
  departement text not null,
  territoire text not null,
  zone_tva text not null check (zone_tva in ('metropole', 'corse', 'guadeloupe', 'martinique', 'la-reunion',
                                             'guyane', 'mayotte', 'hors_champ')),
  latitude numeric(9,6) check (latitude between -90 and 90),
  longitude numeric(9,6) check (longitude between -180 and 180),
  geocode_source text check (geocode_source in ('geoplateforme', 'saisie')),
  geocode_score numeric(4,3) check (geocode_score between 0 and 1),
  maitre_ouvrage_type text not null check (maitre_ouvrage_type in ('particulier', 'professionnel', 'acheteur_public')),
  nature_marche text generated always as (case when maitre_ouvrage_type = 'acheteur_public' then 'public' else 'prive' end) stored,
  place_client text not null check (place_client in ('titulaire', 'sous_traitant', 'cotraitant')),
  regime_tva text not null check (regime_tva in ('normal', 'autoliquidation', 'non_applicable', 'hors_champ')),
  maitre_ouvrage_id uuid,
  maitre_oeuvre_id uuid,
  donneur_ordre_id uuid,
  conducteur_id uuid,
  statut text not null default 'preparation'
    check (statut in ('preparation', 'ouvert', 'suspendu', 'receptionne', 'clos', 'annule')),
  date_debut date,
  date_fin_prevue date,
  date_reception date,
  jour_situation smallint check (jour_situation between 1 and 31),
  cree_le timestamptz not null default now(),
  ouvert_le timestamptz,
  clos_le timestamptz,
  maj_le timestamptz not null default now(),
  constraint btp_chantiers_client_id_id_key unique (client_id, id),
  constraint btp_chantiers_une_entite unique (entite_id),
  constraint btp_chantiers_entite_fkey foreign key (client_id, entite_id) references public.entites (client_id, id),
  constraint btp_chantiers_maitre_ouvrage_fkey foreign key (client_id, maitre_ouvrage_id)
    references public.btp_tiers (client_id, id) on delete set null (maitre_ouvrage_id),
  constraint btp_chantiers_maitre_oeuvre_fkey foreign key (client_id, maitre_oeuvre_id)
    references public.btp_tiers (client_id, id) on delete set null (maitre_oeuvre_id),
  constraint btp_chantiers_donneur_ordre_fkey foreign key (client_id, donneur_ordre_id)
    references public.btp_tiers (client_id, id) on delete set null (donneur_ordre_id),
  constraint btp_chantiers_conducteur_fkey foreign key (conducteur_id, client_id)
    references public.comptes (user_id, client_id) on delete set null (conducteur_id),
  constraint btp_chantiers_coordonnees check ((latitude is null) = (longitude is null)),
  constraint btp_chantiers_dates check (date_fin_prevue is null or date_debut is null or date_fin_prevue >= date_debut),
  constraint btp_chantiers_reception check (statut not in ('receptionne', 'clos') or date_reception is not null),
  constraint btp_chantiers_donneur_ordre check (place_client = 'sous_traitant' or donneur_ordre_id is null)
);
comment on table public.btp_chantiers is
  'Les chantiers du client. Chacun est une entité « site » du socle (périmètres, seuils, journal par chantier).';
comment on column public.btp_chantiers.alias is 'Autres noms sous lesquels les équipes désignent le chantier (M1).';
comment on column public.btp_chantiers.place_client is
  'La place du client : titulaire du marché, sous-traitant d''une entreprise principale, ou cotraitant d''un groupement.';
comment on column public.btp_chantiers.regime_tva is
  'Posé par la base : normal, autoliquidation (sous-traitance, CGI 283-2 nonies), non_applicable (Guyane, Mayotte, CGI 294), hors_champ (collectivités d''outre-mer).';

create index btp_chantiers_client_idx on public.btp_chantiers (client_id, statut);
create index btp_chantiers_conducteur_idx on public.btp_chantiers (conducteur_id, client_id);
create index btp_chantiers_mo_idx on public.btp_chantiers (client_id, maitre_ouvrage_id);
create index btp_chantiers_moe_idx on public.btp_chantiers (client_id, maitre_oeuvre_id);
create index btp_chantiers_do_idx on public.btp_chantiers (client_id, donneur_ordre_id);

create function private.btp_exiger_role_tiers(p_client uuid, p_tiers uuid, p_role text, p_quoi text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_tiers is not null and not exists (
    select 1 from public.btp_tiers t where t.client_id = p_client and t.id = p_tiers and p_role = any (t.roles)) then
    raise exception '% doit être un tiers de l''annuaire qui a le rôle « % ».', p_quoi, p_role using errcode = '23514';
  end if;
end $$;
revoke all on function private.btp_exiger_role_tiers(uuid, uuid, text, text) from public;

create function private.btp_preparer_chantier() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_territoire text;
  v_fuseau text;
  v_principale uuid;
  v_formule record;
  v_ouverts integer;
  v_statut_avant text;
  v_coordonnees_posees boolean;
  v_voient uuid[];
begin
  new.nom := btrim(new.nom);
  new.commune := btrim(new.commune);
  new.alias := array(select distinct btrim(a) from unnest(coalesce(new.alias, '{}')) a where btrim(a) <> '' order by 1);

  v_territoire := private.btp_territoire(new.code_postal);
  if v_territoire is null then
    raise exception 'Le code postal % n''est pas couvert par Daliro (métropole, Corse et outre-mer seulement).',
      new.code_postal using errcode = '22023';
  end if;
  select t.fuseau into v_fuseau from public.territoires t where t.code = v_territoire;
  if v_fuseau is null then
    raise exception 'Le territoire « % » manque à la brique des délais : ses jours fériés ne sont pas connus.',
      v_territoire using errcode = '22023';
  end if;
  new.territoire := v_territoire;
  new.departement := private.btp_departement(new.code_postal);
  new.zone_tva := private.btp_zone_tva(new.code_postal);
  new.regime_tva := private.btp_regime_tva(new.zone_tva, new.place_client);

  perform private.btp_exiger_role_tiers(new.client_id, new.maitre_ouvrage_id, 'maitre_ouvrage', 'Le maître d''ouvrage');
  perform private.btp_exiger_role_tiers(new.client_id, new.maitre_oeuvre_id, 'maitre_oeuvre', 'Le maître d''œuvre');
  perform private.btp_exiger_role_tiers(new.client_id, new.donneur_ordre_id, 'entreprise_principale', 'Le donneur d''ordre');

  if tg_op = 'INSERT' then
    if new.statut not in ('preparation', 'ouvert') then
      raise exception 'Un chantier naît en préparation ou ouvert.' using errcode = '23514';
    end if;
    v_statut_avant := null;
    v_coordonnees_posees := new.latitude is not null;
    new.cree_le := now();
    new.ouvert_le := null;
    new.clos_le := null;
    -- L'entité « site » du socle : périmètres, seuils et journal par chantier.
    select e.id into v_principale from public.entites e where e.client_id = new.client_id and e.principale;
    insert into public.entites (client_id, parent_id, nom, type, fuseau, territoire)
    values (new.client_id, v_principale, left(new.nom, 200), 'site', v_fuseau, private.btp_iso_chantier(new.code_postal))
    returning id into new.entite_id;
    v_voient := array[v_uid, new.conducteur_id];
  else
    new.id := old.id;
    new.client_id := old.client_id;
    new.entite_id := old.entite_id;
    new.cree_le := old.cree_le;
    new.ouvert_le := old.ouvert_le;
    new.clos_le := old.clos_le;
    v_statut_avant := old.statut;
    v_coordonnees_posees := (new.latitude, new.longitude) is distinct from (old.latitude, old.longitude)
                            and new.latitude is not null;
    -- Une adresse qui change rend les coordonnées caduques, sauf si on les pose en même temps.
    if (new.adresse, new.code_postal, new.commune) is distinct from (old.adresse, old.code_postal, old.commune)
       and (new.latitude, new.longitude) is not distinct from (old.latitude, old.longitude) then
      new.latitude := null;
      new.longitude := null;
    end if;
    if new.statut is distinct from old.statut and not (
         (old.statut = 'preparation' and new.statut in ('ouvert', 'annule'))
      or (old.statut = 'ouvert' and new.statut in ('suspendu', 'receptionne', 'annule'))
      or (old.statut = 'suspendu' and new.statut in ('ouvert', 'receptionne', 'annule'))
      or (old.statut = 'receptionne' and new.statut in ('clos'))) then
      raise exception 'Passage de statut refusé : % vers %.', old.statut, new.statut using errcode = '23514';
    end if;
    -- L'entité suit le nom et le territoire du chantier.
    if (new.nom, new.code_postal) is distinct from (old.nom, old.code_postal) then
      update public.entites e
      set nom = left(new.nom, 200), fuseau = v_fuseau, territoire = private.btp_iso_chantier(new.code_postal)
      where e.client_id = new.client_id and e.id = new.entite_id;
    end if;
    v_voient := case when new.conducteur_id is distinct from old.conducteur_id then array[new.conducteur_id]
                     else '{}'::uuid[] end;
  end if;

  -- Des coordonnées posées par une personne sont une saisie.
  if v_coordonnees_posees and v_uid is not null then
    new.geocode_source := 'saisie';
    new.geocode_score := null;
  end if;
  if new.latitude is null then
    new.geocode_source := null;
    new.geocode_score := null;
  end if;

  if new.statut in ('ouvert', 'suspendu') and coalesce(v_statut_avant, 'preparation') not in ('ouvert', 'suspendu') then
    -- Sans la situation contractuelle, M2 et M6 ne sauraient pas qui signe.
    if new.place_client in ('titulaire', 'cotraitant') and new.maitre_ouvrage_id is null then
      raise exception 'Pour ouvrir ce chantier, désignez son maître d''ouvrage dans l''annuaire.' using errcode = '23514';
    end if;
    if new.place_client = 'sous_traitant' and new.donneur_ordre_id is null then
      raise exception 'Pour ouvrir ce chantier, désignez l''entreprise principale qui vous sous-traite.' using errcode = '23514';
    end if;
    -- Le quota de la formule, compté sous verrou : deux ouvertures simultanées ne le dépassent pas.
    perform pg_advisory_xact_lock(hashtextextended('daliro.quota:' || new.client_id::text, 0));
    select r.formule, r.quota_chantiers into v_formule from public.btp_reglages r where r.client_id = new.client_id;
    if not found then
      raise exception 'Daliro n''est pas installé pour cette organisation : aucun chantier ne peut s''ouvrir.'
        using errcode = 'P0001';
    end if;
    select count(*) into v_ouverts from public.btp_chantiers c
    where c.client_id = new.client_id and c.statut in ('ouvert', 'suspendu') and c.id <> new.id;
    if v_ouverts + 1 > v_formule.quota_chantiers then
      raise exception 'Quota atteint : la formule suit % chantiers ouverts à la fois. Fermez-en un ou changez de formule.',
        v_formule.quota_chantiers using errcode = 'P0001';
    end if;
    new.ouvert_le := coalesce(new.ouvert_le, now());
  end if;
  if new.statut in ('clos', 'annule') and v_statut_avant is distinct from new.statut then
    new.clos_le := now();
  end if;

  -- Celui qui crée le chantier, et son conducteur, le voient : périmètre du
  -- socle, posé avant l'écriture pour qu'un « insert … returning » le lise.
  insert into public.comptes_entites (client_id, user_id, entite_id)
  select new.client_id, c.user_id, new.entite_id
  from public.comptes c
  where c.client_id = new.client_id and not c.perimetre_total and c.user_id = any (v_voient)
  on conflict do nothing;

  new.maj_le := now();
  return new;
end $$;
revoke all on function private.btp_preparer_chantier() from public;

create trigger btp_chantiers_preparer before insert or update on public.btp_chantiers
  for each row execute function private.btp_preparer_chantier();

-- Un chantier effacé emporte son entité ; si le socle la retient encore, elle
-- perd le nom du chantier.
create function private.btp_chantier_efface() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.client_id::text = coalesce(current_setting('omega.effacement_client', true), '') then
    return null;
  end if;
  begin
    delete from public.entites e where e.client_id = old.client_id and e.id = old.entite_id;
  exception when foreign_key_violation then
    update public.entites e set nom = 'Chantier effacé' where e.client_id = old.client_id and e.id = old.entite_id;
  end;
  return null;
end $$;
revoke all on function private.btp_chantier_efface() from public;

create trigger btp_chantiers_efface after delete on public.btp_chantiers
  for each row execute function private.btp_chantier_efface();

-- ── 7. Les lots d'un chantier ────────────────────────────────────────────

create table public.btp_lots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  chantier_id uuid not null,
  entite_id uuid not null,
  code text not null check (code ~ '^[0-9A-Za-z][0-9A-Za-z._-]{0,9}$'),
  libelle text not null check (char_length(btrim(libelle)) between 1 and 200),
  corps_etat text references public.btp_corps_etat (code),
  rang smallint not null default 0 check (rang between 0 and 999),
  execution text not null default 'client' check (execution in ('client', 'sous_traitant', 'autre_titulaire')),
  tiers_id uuid,
  equipe_id uuid,
  referme_par_lot_id uuid,
  exterieur boolean not null default false,
  statut text not null default 'a_venir' check (statut in ('a_venir', 'en_cours', 'termine')),
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint btp_lots_client_id_id_key unique (client_id, id),
  constraint btp_lots_chantier_id_id_key unique (chantier_id, id),
  constraint btp_lots_un_code unique (chantier_id, code),
  constraint btp_lots_chantier_fkey foreign key (client_id, chantier_id)
    references public.btp_chantiers (client_id, id) on delete cascade,
  constraint btp_lots_tiers_fkey foreign key (client_id, tiers_id)
    references public.btp_tiers (client_id, id) on delete set null (tiers_id),
  constraint btp_lots_equipe_fkey foreign key (client_id, equipe_id)
    references public.btp_equipes (client_id, id) on delete set null (equipe_id),
  constraint btp_lots_referme_fkey foreign key (chantier_id, referme_par_lot_id)
    references public.btp_lots (chantier_id, id) on delete set null (referme_par_lot_id),
  constraint btp_lots_pas_soi_meme check (referme_par_lot_id is null or referme_par_lot_id <> id),
  constraint btp_lots_executant check (
    (execution = 'client' and tiers_id is null) or (execution <> 'client' and equipe_id is null))
);
comment on table public.btp_lots is
  'Les lots (corps d''état) d''un chantier, dans l''ordre du planning, et qui les exécute.';
comment on column public.btp_lots.referme_par_lot_id is
  'Le lot qui refermera les ouvrages de celui-ci (doublage sur l''électricité…) : la barrière avant fermeture de M2 le surveille.';

create index btp_lots_chantier_idx on public.btp_lots (client_id, chantier_id, rang);
create index btp_lots_tiers_idx on public.btp_lots (client_id, tiers_id);
create index btp_lots_equipe_idx on public.btp_lots (client_id, equipe_id);
create index btp_lots_referme_idx on public.btp_lots (chantier_id, referme_par_lot_id);

create function private.btp_preparer_lot() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.client_id := old.client_id;
    new.chantier_id := old.chantier_id;
    new.cree_le := old.cree_le;
  end if;
  -- L'entité est celle du chantier, jamais celle que l'appelant donnerait.
  select c.entite_id into new.entite_id from public.btp_chantiers c
  where c.client_id = new.client_id and c.id = new.chantier_id;
  if new.entite_id is null then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  new.code := btrim(new.code);
  new.libelle := btrim(new.libelle);
  if new.execution = 'sous_traitant' then
    perform private.btp_exiger_role_tiers(new.client_id, new.tiers_id, 'sous_traitant', 'Le sous-traitant du lot');
  elsif new.execution = 'autre_titulaire' then
    perform private.btp_exiger_role_tiers(new.client_id, new.tiers_id, 'autre_titulaire', 'Le titulaire de l''autre lot');
  end if;
  new.maj_le := now();
  return new;
end $$;
revoke all on function private.btp_preparer_lot() from public;

create trigger btp_lots_preparer before insert or update on public.btp_lots
  for each row execute function private.btp_preparer_lot();

-- ── 8. Droits ────────────────────────────────────────────────────────────

-- La visibilité d'un chantier. La fonction du socle (voit_entite) est STABLE :
-- elle lit avec l'instantané du début de l'instruction et ne voit pas le
-- périmètre que le déclencheur vient de poser. Enveloppée dans une fonction
-- VOLATILE, elle reprend un instantané neuf : celui qui crée un chantier
-- le relit dans la même instruction (« insert … returning »).
create function private.btp_voit_chantier(p_client uuid, p_entite uuid) returns boolean
language sql volatile security definer set search_path = '' as $$
  select private.voit_entite(p_client, p_entite)
$$;
revoke all on function private.btp_voit_chantier(uuid, uuid) from public;
grant execute on function private.btp_voit_chantier(uuid, uuid) to authenticated, service_role;

alter table public.btp_reglages enable row level security;
alter table public.btp_tiers enable row level security;
alter table public.btp_equipes enable row level security;
alter table public.btp_intervenants enable row level security;
alter table public.btp_chantiers enable row level security;
alter table public.btp_lots enable row level security;

revoke all on table public.btp_reglages, public.btp_tiers, public.btp_equipes, public.btp_intervenants,
  public.btp_chantiers, public.btp_lots from anon, authenticated;
grant all on table public.btp_reglages, public.btp_tiers, public.btp_equipes, public.btp_intervenants,
  public.btp_chantiers, public.btp_lots to service_role;
grant select on table public.btp_reglages, public.btp_tiers, public.btp_equipes, public.btp_intervenants,
  public.btp_chantiers, public.btp_lots to authenticated;

grant insert (client_id, roles, personne_physique, nom, siren, siret, contact_nom, telephone, email, canal, adresse,
              code_postal, commune, corps_etat, departements, confirmer_passages, vigilance_attestation_le,
              vigilance_verifiee_le, actif, note)
  on table public.btp_tiers to authenticated;
grant update (roles, personne_physique, nom, siren, siret, contact_nom, telephone, email, canal, adresse,
              code_postal, commune, corps_etat, departements, confirmer_passages, vigilance_attestation_le,
              vigilance_verifiee_le, actif, note)
  on table public.btp_tiers to authenticated;
grant delete on table public.btp_tiers to authenticated;

grant insert (client_id, nom, chef_id, actif), update (nom, chef_id, actif), delete
  on table public.btp_equipes to authenticated;
grant insert (client_id, nom, telephone, role_terrain, equipe_id, informe_le, actif),
      update (nom, telephone, role_terrain, equipe_id, informe_le, actif), delete
  on table public.btp_intervenants to authenticated;

grant insert (client_id, nom, alias, reference, adresse, code_postal, commune, latitude, longitude,
              maitre_ouvrage_type, place_client, maitre_ouvrage_id, maitre_oeuvre_id, donneur_ordre_id,
              conducteur_id, statut, date_debut, date_fin_prevue, jour_situation)
  on table public.btp_chantiers to authenticated;
grant update (nom, alias, reference, adresse, code_postal, commune, latitude, longitude,
              maitre_ouvrage_type, place_client, maitre_ouvrage_id, maitre_oeuvre_id, donneur_ordre_id,
              conducteur_id, statut, date_debut, date_fin_prevue, date_reception, jour_situation)
  on table public.btp_chantiers to authenticated;

grant insert (client_id, chantier_id, code, libelle, corps_etat, rang, execution, tiers_id, equipe_id,
              referme_par_lot_id, exterieur, statut),
      update (code, libelle, corps_etat, rang, execution, tiers_id, equipe_id, referme_par_lot_id, exterieur, statut),
      delete
  on table public.btp_lots to authenticated;

create policy "membres lisent les reglages de daliro" on public.btp_reglages
  for select to authenticated using (client_id in (select private.mes_clients()));

create policy "membres lisent l'annuaire" on public.btp_tiers
  for select to authenticated using (client_id in (select private.mes_clients()));
create policy "le bureau ajoute des tiers" on public.btp_tiers
  for insert to authenticated
  with check (private.a_un_role(client_id, array['gerant', 'admin', 'valideur', 'collaborateur']));
create policy "le bureau modifie les tiers" on public.btp_tiers
  for update to authenticated
  using (private.a_un_role(client_id, array['gerant', 'admin', 'valideur', 'collaborateur']))
  with check (private.a_un_role(client_id, array['gerant', 'admin', 'valideur', 'collaborateur']));
create policy "gerants et admins retirent des tiers" on public.btp_tiers
  for delete to authenticated using (private.a_un_role(client_id, array['gerant', 'admin']));

create policy "membres lisent les equipes" on public.btp_equipes
  for select to authenticated using (client_id in (select private.mes_clients()));
create policy "le bureau cree les equipes" on public.btp_equipes
  for insert to authenticated
  with check (private.a_un_role(client_id, array['gerant', 'admin', 'valideur', 'collaborateur']));
create policy "le bureau modifie les equipes" on public.btp_equipes
  for update to authenticated
  using (private.a_un_role(client_id, array['gerant', 'admin', 'valideur', 'collaborateur']))
  with check (private.a_un_role(client_id, array['gerant', 'admin', 'valideur', 'collaborateur']));
create policy "gerants et admins retirent des equipes" on public.btp_equipes
  for delete to authenticated using (private.a_un_role(client_id, array['gerant', 'admin']));

create policy "membres lisent les intervenants" on public.btp_intervenants
  for select to authenticated using (client_id in (select private.mes_clients()));
create policy "le bureau ajoute des intervenants" on public.btp_intervenants
  for insert to authenticated
  with check (private.a_un_role(client_id, array['gerant', 'admin', 'valideur', 'collaborateur']));
create policy "le bureau modifie les intervenants" on public.btp_intervenants
  for update to authenticated
  using (private.a_un_role(client_id, array['gerant', 'admin', 'valideur', 'collaborateur']))
  with check (private.a_un_role(client_id, array['gerant', 'admin', 'valideur', 'collaborateur']));
create policy "gerants et admins retirent des intervenants" on public.btp_intervenants
  for delete to authenticated using (private.a_un_role(client_id, array['gerant', 'admin']));

create policy "membres lisent les chantiers de leur perimetre" on public.btp_chantiers
  for select to authenticated
  using (client_id in (select private.mes_clients()) and private.btp_voit_chantier(client_id, entite_id));
create policy "gerants, admins et conducteurs creent des chantiers" on public.btp_chantiers
  for insert to authenticated
  with check (private.a_un_role(client_id, array['gerant', 'admin', 'valideur']));
create policy "gerants, admins et conducteurs modifient leurs chantiers" on public.btp_chantiers
  for update to authenticated
  using (private.a_un_role(client_id, array['gerant', 'admin', 'valideur']) and private.voit_entite(client_id, entite_id))
  with check (private.a_un_role(client_id, array['gerant', 'admin', 'valideur']) and private.voit_entite(client_id, entite_id));

create policy "membres lisent les lots de leurs chantiers" on public.btp_lots
  for select to authenticated
  using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
create policy "gerants, admins et conducteurs posent les lots" on public.btp_lots
  for insert to authenticated
  with check (private.a_un_role(client_id, array['gerant', 'admin', 'valideur']) and private.voit_entite(client_id, entite_id));
create policy "gerants, admins et conducteurs modifient les lots" on public.btp_lots
  for update to authenticated
  using (private.a_un_role(client_id, array['gerant', 'admin', 'valideur']) and private.voit_entite(client_id, entite_id))
  with check (private.a_un_role(client_id, array['gerant', 'admin', 'valideur']) and private.voit_entite(client_id, entite_id));
create policy "gerants, admins et conducteurs retirent des lots" on public.btp_lots
  for delete to authenticated
  using (private.a_un_role(client_id, array['gerant', 'admin', 'valideur']) and private.voit_entite(client_id, entite_id));

-- ── 9. L'écran de contrôle ───────────────────────────────────────────────
-- Une ligne par défaut du référentiel qui empêche un moteur de travailler,
-- ou le fait travailler moins bien. Lue sous la RLS de chacun.

create view public.btp_controle with (security_invoker = true) as
  select c.client_id, c.id as chantier_id, 'btp_chantiers'::text as objet_type, c.id as objet_id,
         'chantier_sans_maitre_ouvrage'::text as code, 'bloquant'::text as gravite,
         format('%s : aucun maître d''ouvrage désigné ; personne ne peut signer ses avenants.', c.nom) as message
  from public.btp_chantiers c
  where c.statut in ('preparation', 'ouvert', 'suspendu') and c.place_client <> 'sous_traitant' and c.maitre_ouvrage_id is null
  union all
  select c.client_id, c.id, 'btp_chantiers', c.id, 'chantier_sans_donneur_ordre', 'bloquant',
         format('%s : l''entreprise principale n''est pas désignée ; elle signe les avenants du sous-traitant.', c.nom)
  from public.btp_chantiers c
  where c.statut in ('preparation', 'ouvert', 'suspendu') and c.place_client = 'sous_traitant' and c.donneur_ordre_id is null
  union all
  select c.client_id, c.id, 'btp_chantiers', c.id, 'chantier_sans_conducteur', 'attention',
         format('%s : aucun conducteur de travaux ; ses listes du matin n''ont pas de destinataire.', c.nom)
  from public.btp_chantiers c
  where c.statut in ('ouvert', 'suspendu') and c.conducteur_id is null
  union all
  select c.client_id, c.id, 'btp_chantiers', c.id, 'chantier_sans_lots', 'attention',
         format('%s : aucun lot ; le planning et les passages ne peuvent pas s''y rattacher.', c.nom)
  from public.btp_chantiers c
  where c.statut in ('preparation', 'ouvert', 'suspendu')
    and not exists (select 1 from public.btp_lots l where l.client_id = c.client_id and l.chantier_id = c.id)
  union all
  select c.client_id, c.id, 'btp_chantiers', c.id, 'chantier_sans_coordonnees', 'info',
         format('%s : adresse non localisée ; pas de météo, ni de rattachement par la position.', c.nom)
  from public.btp_chantiers c
  where c.statut in ('preparation', 'ouvert', 'suspendu') and c.latitude is null
  union all
  select c.client_id, c.id, 'btp_chantiers', c.id, 'chantier_hors_champ_tva', 'info',
         format('%s : collectivité d''outre-mer, hors du champ de la TVA française ; les montants sont préparés hors taxe.', c.nom)
  from public.btp_chantiers c
  where c.statut in ('preparation', 'ouvert', 'suspendu') and c.regime_tva = 'hors_champ'
  union all
  select l.client_id, l.chantier_id, 'btp_lots', l.id, 'lot_sans_executant', 'attention',
         format('Lot %s %s : l''entreprise qui l''exécute n''est pas désignée.', l.code, l.libelle)
  from public.btp_lots l
  join public.btp_chantiers c on c.client_id = l.client_id and c.id = l.chantier_id
  where c.statut in ('preparation', 'ouvert', 'suspendu') and l.statut <> 'termine'
    and ((l.execution <> 'client' and l.tiers_id is null) or (l.execution = 'client' and l.equipe_id is null))
  union all
  select i.client_id, null::uuid, 'btp_intervenants', i.id, 'intervenant_non_informe', 'bloquant',
         format('%s n''a pas été informé que ses messages sont lus (C. trav. L1222-4) : Daliro ne lit rien de lui.', i.nom)
  from public.btp_intervenants i
  where i.actif and i.informe_le is null
  union all
  select i.client_id, null::uuid, 'btp_intervenants', i.id, 'chef_sans_telephone', 'attention',
         format('%s, chef d''équipe, n''a pas de numéro : ses messages ne peuvent pas être reconnus.', i.nom)
  from public.btp_intervenants i
  where i.actif and i.role_terrain = 'chef_equipe' and i.telephone is null
  union all
  select t.client_id, null::uuid, 'btp_tiers', t.id,
         'vigilance_' || public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le),
         case when public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le) = 'a_renouveler'
              then 'info' else 'attention' end,
         format('%s : attestation de vigilance %s (C. trav. D8222-5).', t.nom,
                case public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le)
                  when 'absente' then 'absente'
                  when 'echue' then 'de plus de six mois'
                  when 'a_verifier' then 'non vérifiée auprès de l''Urssaf'
                  else 'à renouveler dans les quinze jours' end)
  from public.btp_tiers t
  where t.actif and public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le)
                    in ('absente', 'echue', 'a_verifier', 'a_renouveler')
  union all
  select t.client_id, null::uuid, 'btp_tiers', t.id, 'sous_traitant_injoignable', 'attention',
         format('%s : ni téléphone ni courriel ; ses passages ne peuvent pas être confirmés.', t.nom)
  from public.btp_tiers t
  where t.actif and 'sous_traitant' = any (t.roles) and t.telephone is null and t.email is null;
comment on view public.btp_controle is
  'L''écran de contrôle du référentiel : ce qui empêche un moteur de Daliro de travailler (bloquant), ou le fait travailler moins bien.';

revoke all on table public.btp_controle from anon, authenticated;
grant select on table public.btp_controle to authenticated, service_role;

-- ── 10. Traçage, registre, objets ────────────────────────────────────────

create trigger btp_reglages_tracer after insert or update or delete on public.btp_reglages
  for each row execute function private.tracer('maj_le');
create trigger btp_tiers_tracer after insert or update or delete on public.btp_tiers
  for each row execute function private.tracer('maj_le');
create trigger btp_equipes_tracer after insert or update or delete on public.btp_equipes
  for each row execute function private.tracer();
create trigger btp_intervenants_tracer after insert or update or delete on public.btp_intervenants
  for each row execute function private.tracer('maj_le');
create trigger btp_chantiers_tracer after insert or update or delete on public.btp_chantiers
  for each row execute function private.tracer('maj_le');
create trigger btp_lots_tracer after insert or update or delete on public.btp_lots
  for each row execute function private.tracer('maj_le');

insert into private.tables_locataires (nom, ordre_effacement, note) values
  ('btp_lots', 7, 'daliro, M0'),
  ('btp_chantiers', 9, 'daliro, M0'),
  ('btp_intervenants', 8, 'daliro, M0'),
  ('btp_equipes', 8, 'daliro, M0'),
  ('btp_tiers', 8, 'daliro, M0'),
  ('btp_reglages', 9, 'daliro, M0')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;

insert into private.tables_objets (nom, objet_type, colonne, ordre_effacement) values
  ('btp_lots', 'btp_chantier', 'chantier_id', 7),
  ('btp_chantiers', 'btp_chantier', 'id', 9),
  ('btp_tiers', 'btp_tiers', 'id', 9),
  ('btp_intervenants', 'btp_intervenant', 'id', 9)
on conflict (nom) do update
  set objet_type = excluded.objet_type, colonne = excluded.colonne, ordre_effacement = excluded.ordre_effacement;
