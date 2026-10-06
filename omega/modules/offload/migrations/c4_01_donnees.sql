-- c4_01 — OFFLOAD : l'historique d'achats de chaque client, importé ou saisi (session C4, 06/10/2026)
--
-- CE QUE ÇA POSE. Le site promet qu'OFFLOAD « relit votre base clients » et repère le client qui s'éteint
-- avant la clôture. Il faut d'abord la base : qui sont les clients, et qu'ont-ils acheté, quand, pour combien.
--   · public.offload_reglages : OFFLOAD installé chez une organisation (mode « essai » à l'installation : rien
--     ne part), ses seuils (délai de silence, montant minimal, jour de clôture) et son branchement d'exports.
--   · public.offload_comptes  : un compte client (code du logiciel de ventes, raison sociale, contact, commercial,
--     groupe). Statut « suivi », « exclu » (suivi en direct par un commercial) ou « arrete » (demande d'arrêt).
--   · public.offload_achats   : une pièce de l'historique (facture, commande ou avoir) d'un compte, datée et chiffrée
--     hors taxes, importée d'un export (les lignes d'une même pièce sont additionnées) ou saisie à la main.
--     Rien ne s'efface : une pièce fausse est annulée.
--   · deux modèles d'export (public.modeles_jeux, module offload, logiciel « tableur ») que le lecteur d'exports
--     d'A1 reconnaît : « ventes » (une ligne par facture ou commande : code client, date, montant HT…) et
--     « clients » (le référentiel : code client, raison sociale, contact, commercial…). Jeux non complets : un
--     export qui ne couvre que les douze derniers mois AJOUTE à l'historique, il ne fait rien disparaître.
--   · la chaîne d'import : relevé déposé (recevoir_releve, ou public.offload_deposer_export depuis l'espace) →
--     lecteur-exports → avancer_releves → événement releve.pret.offload → travail offload.appliquer_releve →
--     private.offload_appliquer_releve, qui lit les lignes, applique un garde-fou (plus de la moitié des lignes
--     sans date, montant ou code client lisibles : l'export est « douteux » et rien n'est appliqué), puis range
--     comptes et achats. Dates et montants sont relus à la française (14/03/2025, 1 234,50 €, avoirs négatifs).
--   · la saisie : offload_saisir_compte, offload_saisir_achat, offload_annuler_achat (gérant, admin, valideur,
--     collaborateur de l'entité ; jamais un lecteur).
--   · l'installation : offload_installer (Omega ou le gérant), offload_regler (gérant ou admin).
--
-- Règles de pose : create … if not exists, create or replace, insert … where not exists, cron si absent.
-- Aucun DROP, aucun DELETE. RLS sur chaque table, revoke all d'anon et authenticated puis les GRANT voulus,
-- revoke execute from public sur chaque fonction privée.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Tables
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.offload_reglages (
  client_id uuid primary key references public.clients(id) on delete cascade,
  mode text not null default 'essai',
  delai_silence_jours integer not null default 90,
  montant_min numeric(14,2) not null default 0,
  jour_cloture smallint,
  alerte_avant_cloture_jours smallint not null default 10,
  branchement_id uuid,
  installe_le timestamptz not null default now(),
  installe_par uuid,
  maj_le timestamptz not null default now(),
  constraint offload_reglages_mode_check check (mode in ('essai', 'reel')),
  constraint offload_reglages_delai_check check (delai_silence_jours between 7 and 3650),
  constraint offload_reglages_montant_check check (montant_min >= 0),
  constraint offload_reglages_cloture_check check (jour_cloture between 1 and 31),
  constraint offload_reglages_avant_cloture_check check (alerte_avant_cloture_jours between 1 and 28),
  constraint offload_reglages_branchement_fkey foreign key (client_id, branchement_id)
    references public.branchements(client_id, id) on delete set null (branchement_id)
);
comment on table public.offload_reglages is 'OFFLOAD — installation chez une organisation : mode (essai : rien ne part), délai de silence, montant minimal, jour de clôture (null = dernier jour du mois), branchement d''exports.';

create table if not exists public.offload_comptes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  ref text not null,
  nom text not null,
  contact text,
  email text,
  telephone text,
  commercial text,
  groupe text,
  ville text,
  secteur text,
  source text not null,
  jeu_id uuid,
  statut text not null default 'suivi',
  statut_motif text,
  statut_par uuid,
  statut_le timestamptz,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint offload_comptes_client_id_id_key unique (client_id, id),
  constraint offload_comptes_une_ref unique (client_id, entite_id, ref),
  constraint offload_comptes_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint offload_comptes_ref_check check (char_length(btrim(ref)) between 1 and 120),
  constraint offload_comptes_nom_check check (char_length(btrim(nom)) between 1 and 200),
  constraint offload_comptes_contact_check check (char_length(contact) <= 200),
  constraint offload_comptes_email_check check (char_length(email) <= 320),
  constraint offload_comptes_telephone_check check (char_length(telephone) <= 40),
  constraint offload_comptes_commercial_check check (char_length(commercial) <= 120),
  constraint offload_comptes_groupe_check check (char_length(groupe) <= 200),
  constraint offload_comptes_ville_check check (char_length(ville) <= 120),
  constraint offload_comptes_secteur_check check (char_length(secteur) <= 120),
  constraint offload_comptes_source_check check (source in ('import', 'saisie')),
  constraint offload_comptes_statut_check check (statut in ('suivi', 'exclu', 'arrete')),
  constraint offload_comptes_statut_motif_check check (char_length(statut_motif) <= 500)
);
comment on table public.offload_comptes is 'OFFLOAD — un compte client d''une entité : code du logiciel de ventes (ref), raison sociale, contact, commercial. statut : suivi, exclu (suivi en direct), arrete (demande d''arrêt, définitive).';

create table if not exists public.offload_achats (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  compte_id uuid not null,
  date_achat date not null,
  montant_ht numeric(14,2) not null,
  reference text,
  libelle text,
  nature text not null default 'facture',
  source text not null,
  jeu_id uuid,
  cle text,
  saisi_par uuid,
  annule_le timestamptz,
  annule_par uuid,
  annule_motif text,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint offload_achats_client_id_id_key unique (client_id, id),
  constraint offload_achats_une_cle unique (jeu_id, cle),
  constraint offload_achats_compte_fkey foreign key (client_id, compte_id) references public.offload_comptes(client_id, id) on delete cascade,
  constraint offload_achats_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint offload_achats_date_check check (date_achat >= date '1990-01-01'),
  constraint offload_achats_montant_check check (abs(montant_ht) < 10000000000),
  constraint offload_achats_reference_check check (char_length(reference) <= 120),
  constraint offload_achats_libelle_check check (char_length(libelle) <= 500),
  constraint offload_achats_nature_check check (nature in ('facture', 'commande', 'avoir')),
  constraint offload_achats_source_check check (source in ('import', 'saisie')),
  constraint offload_achats_provenance check ((source = 'import') = (jeu_id is not null and cle is not null)),
  constraint offload_achats_cle_check check (char_length(cle) <= 1000),
  constraint offload_achats_annulation check ((annule_le is null) = (annule_motif is null)),
  constraint offload_achats_annule_motif_check check (char_length(annule_motif) <= 500)
);
comment on table public.offload_achats is 'OFFLOAD — une ligne de l''historique d''achats d''un compte (facture, commande, avoir négatif), hors taxes, importée d''un export (jeu_id, cle) ou saisie. Une ligne fausse est annulée (annule_le), jamais effacée.';

create index if not exists offload_comptes_entite_idx on public.offload_comptes (client_id, entite_id, statut);
create index if not exists offload_achats_compte_idx on public.offload_achats (compte_id, date_achat);
create index if not exists offload_achats_client_idx on public.offload_achats (client_id, date_achat);

-- RLS : on lit son organisation, et dans son organisation les entités de son périmètre. Aucune écriture directe.
alter table public.offload_reglages enable row level security;
alter table public.offload_comptes enable row level security;
alter table public.offload_achats enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'offload_reglages'
                 and policyname = 'on lit les reglages de son organisation') then
    create policy "on lit les reglages de son organisation" on public.offload_reglages
      for select to authenticated using (client_id in (select private.mes_clients()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'offload_comptes'
                 and policyname = 'on lit les comptes de son perimetre') then
    create policy "on lit les comptes de son perimetre" on public.offload_comptes
      for select to authenticated using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'offload_achats'
                 and policyname = 'on lit les achats de son perimetre') then
    create policy "on lit les achats de son perimetre" on public.offload_achats
      for select to authenticated using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $$;

revoke all on public.offload_reglages from anon, authenticated;
revoke all on public.offload_comptes from anon, authenticated;
revoke all on public.offload_achats from anon, authenticated;
grant select on public.offload_reglages to authenticated;
grant select on public.offload_comptes to authenticated;
grant select on public.offload_achats to authenticated;
grant all on public.offload_reglages to service_role;
grant all on public.offload_comptes to service_role;
grant all on public.offload_achats to service_role;

create or replace trigger offload_reglages_tracer after insert or delete or update on public.offload_reglages
  for each row execute function private.tracer('maj_le');

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Les deux modèles d'export « tableur » (lecteur-exports d'A1)
-- ─────────────────────────────────────────────────────────────────────────

insert into public.modeles_jeux (module, logiciel, code, version, libelle, motif_fichier, entetes, colonnes, cle, complet,
                                 fenetre, seuil_anomalies, source)
select 'offload', 'tableur', 'ventes', 1, 'Historique des ventes (factures ou commandes)',
       '^(ventes?|factures?|commandes?|historique|chiffre)',
       array['Code client', 'Date'],
       $j${
         "compte_ref": {"type": "texte", "libelle": "Code du client", "obligatoire": true,
                        "entetes": ["Code client", "N° client", "Numéro client", "Réf. client", "Code tiers", "Compte client", "Client ID"]},
         "compte_nom": {"type": "texte", "libelle": "Nom du client", "facultative": true,
                        "entetes": ["Client", "Nom du client", "Nom client", "Raison sociale", "Tiers"]},
         "date":       {"type": "date", "libelle": "Date de la facture ou de la commande", "obligatoire": true,
                        "entetes": ["Date", "Date facture", "Date de facture", "Date commande", "Date de commande", "Date pièce", "Date document"]},
         "reference":  {"type": "texte", "libelle": "Numéro de la pièce", "facultative": true,
                        "entetes": ["N° facture", "Numéro de facture", "N° pièce", "N° commande", "Numéro", "Référence", "Pièce"]},
         "montant":    {"type": "decimal", "libelle": "Montant hors taxes", "obligatoire": true,
                        "entetes": ["Montant HT", "Total HT", "HT", "Montant", "Total"]},
         "libelle":    {"type": "texte", "libelle": "Libellé", "facultative": true,
                        "entetes": ["Libellé", "Désignation", "Objet", "Prestation"]},
         "nature":     {"type": "texte", "libelle": "Type de pièce (facture, avoir, commande)", "facultative": true,
                        "entetes": ["Type", "Type de pièce", "Nature"]},
         "email":      {"type": "texte", "facultative": true, "entetes": ["E-mail", "Email", "Courriel"]},
         "telephone":  {"type": "texte", "facultative": true, "entetes": ["Téléphone", "Tél.", "Tel"]},
         "commercial": {"type": "texte", "facultative": true, "entetes": ["Commercial", "Représentant", "Vendeur", "Chargé de compte"]},
         "groupe":     {"type": "texte", "facultative": true, "entetes": ["Groupe", "Société mère", "Maison mère"]}
       }$j$::jsonb,
       array['compte_ref', 'date', 'reference'], false, '{"colonne": "date", "observee": true}'::jsonb, 1.000,
       'Modèle générique OFFLOAD (C4, 06/10/2026) : export CSV ou XLSX d''un logiciel de ventes ou d''un facturier, une ligne par pièce. En-têtes à confirmer sur un vrai export.'
where not exists (select 1 from public.modeles_jeux m where m.module = 'offload' and m.logiciel = 'tableur' and m.code = 'ventes' and m.version = 1);

insert into public.modeles_jeux (module, logiciel, code, version, libelle, motif_fichier, entetes, colonnes, cle, complet,
                                 seuil_anomalies, source)
select 'offload', 'tableur', 'clients', 1, 'Fichier clients (référentiel du CRM ou de l''ERP)',
       '^(clients?|tiers|fichier[_ -]?clients?)',
       array['Code client', 'Raison sociale'],
       $j${
         "compte_ref": {"type": "texte", "libelle": "Code du client", "obligatoire": true,
                        "entetes": ["Code client", "N° client", "Numéro client", "Réf. client", "Code tiers", "Code"]},
         "nom":        {"type": "texte", "libelle": "Raison sociale", "obligatoire": true,
                        "entetes": ["Raison sociale", "Nom", "Client", "Nom du client", "Société"]},
         "contact":    {"type": "texte", "facultative": true, "entetes": ["Contact", "Interlocuteur", "Nom du contact"]},
         "email":      {"type": "texte", "facultative": true, "entetes": ["E-mail", "Email", "Courriel"]},
         "telephone":  {"type": "texte", "facultative": true, "entetes": ["Téléphone", "Tél.", "Tel", "Portable"]},
         "commercial": {"type": "texte", "facultative": true, "entetes": ["Commercial", "Représentant", "Vendeur", "Chargé de compte"]},
         "groupe":     {"type": "texte", "facultative": true, "entetes": ["Groupe", "Société mère", "Maison mère"]},
         "ville":      {"type": "texte", "facultative": true, "entetes": ["Ville", "Commune"]},
         "secteur":    {"type": "texte", "facultative": true, "entetes": ["Secteur", "Activité", "Famille"]}
       }$j$::jsonb,
       array['compte_ref'], false, 1.000,
       'Modèle générique OFFLOAD (C4, 06/10/2026) : export du fichier clients d''un CRM, d''un ERP ou d''un tableur. En-têtes à confirmer sur un vrai export.'
where not exists (select 1 from public.modeles_jeux m where m.module = 'offload' and m.logiciel = 'tableur' and m.code = 'clients' and m.version = 1);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Aides : qui agit, quelle entité, lire une date et un montant à la française
-- ─────────────────────────────────────────────────────────────────────────

create or replace function private.offload_est_serveur()
 returns boolean
 language sql
 stable
 set search_path to ''
as $function$
  select (select auth.uid()) is null
     and coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),
                  nullif(current_setting('role', true), 'none'),
                  session_user::text) in ('service_role', 'postgres')
$function$;

create or replace function private.offload_exiger(p_client uuid, p_entite uuid, p_roles text[], p_quoi text)
 returns void
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  if private.offload_est_serveur() then
    return;
  end if;
  if (select auth.uid()) is null or not private.a_un_role(p_client, p_roles)
     or (p_entite is not null and not private.voit_entite(p_client, p_entite)) then
    raise exception 'Vous n''avez pas le droit de % dans OFFLOAD pour cette organisation.', p_quoi using errcode = '42501';
  end if;
end $function$;

-- L'entité demandée, sinon l'entité principale de l'organisation.
create or replace function private.offload_entite(p_client uuid, p_entite uuid)
 returns uuid
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare v uuid;
begin
  if p_entite is not null then
    select e.id into v from public.entites e where e.client_id = p_client and e.id = p_entite;
  else
    select e.id into v from public.entites e where e.client_id = p_client and e.principale;
  end if;
  if v is null then
    raise exception 'Entité introuvable dans cette organisation.' using errcode = 'P0002';
  end if;
  return v;
end $function$;

-- 14/03/2025, 14-03-2025, 14.03.25, 2025-03-14 (avec ou sans heure), 20250314. Null si illisible.
create or replace function private.offload_lire_date(p text)
 returns date
 language plpgsql
 immutable
 set search_path to ''
as $function$
declare
  t text := btrim(coalesce(p, ''));
  m text[];
  a integer;
begin
  if t = '' then
    return null;
  end if;
  m := regexp_match(t, '^(\d{4})-(\d{1,2})-(\d{1,2})([ T].*)?$');
  if m is not null then
    return make_date(m[1]::integer, m[2]::integer, m[3]::integer);
  end if;
  m := regexp_match(t, '^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})( .*)?$');
  if m is not null then
    a := m[3]::integer;
    if char_length(m[3]) = 2 then
      a := a + 2000;
    end if;
    return make_date(a, m[2]::integer, m[1]::integer);
  end if;
  m := regexp_match(t, '^(\d{4})(\d{2})(\d{2})$');
  if m is not null then
    return make_date(m[1]::integer, m[2]::integer, m[3]::integer);
  end if;
  return null;
exception when others then
  return null;
end $function$;

-- 1 234,50 € · 1.234,50 · 1,234.50 · 1234.5 · -12,00 · (12,00) · 12,00- . Null si illisible.
create or replace function private.offload_lire_montant(p text)
 returns numeric
 language plpgsql
 immutable
 set search_path to ''
as $function$
declare
  t text := coalesce(p, '');
  v_negatif boolean := false;
  v_virgule integer;
  v_point integer;
begin
  t := regexp_replace(t, '[\s  €]|EUR', '', 'gi');
  if t = '' then
    return null;
  end if;
  if t ~ '^\(.*\)$' then
    v_negatif := true;
    t := substr(t, 2, char_length(t) - 2);
  end if;
  if t ~ '-$' then
    v_negatif := not v_negatif;
    t := left(t, -1);
  end if;
  if t ~ '^-' then
    v_negatif := not v_negatif;
    t := substr(t, 2);
  elsif t ~ '^\+' then
    t := substr(t, 2);
  end if;
  if t !~ '^[0-9.,'']+$' or t !~ '[0-9]' then
    return null;
  end if;
  t := replace(t, '''', '');
  v_virgule := char_length(t) - char_length(replace(t, ',', ''));
  v_point := char_length(t) - char_length(replace(t, '.', ''));
  if v_virgule > 0 and v_point > 0 then
    -- Le dernier des deux est le séparateur décimal.
    if strpos(reverse(t), ',') < strpos(reverse(t), '.') then
      t := replace(replace(t, '.', ''), ',', '.');
    else
      t := replace(t, ',', '');
    end if;
  elsif v_virgule > 1 then
    t := replace(t, ',', '');
  elsif v_virgule = 1 then
    t := replace(t, ',', '.');
  elsif v_point > 1 then
    t := replace(t, '.', '');
  end if;
  return case when v_negatif then -t::numeric else t::numeric end;
exception when others then
  return null;
end $function$;

-- facture | commande | avoir, d'après le libellé de type de pièce du logiciel (facture par défaut).
create or replace function private.offload_nature(p text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case
    when p ~* '(avoir|cr[ée]dit|remboursement|^av$)' then 'avoir'
    when p ~* '(commande|^cde|^bc$|bon de commande)' then 'commande'
    else 'facture' end
$function$;

-- Une valeur texte nettoyée, tronquée, null si vide.
create or replace function private.offload_texte(p text, p_max integer)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select left(nullif(btrim(regexp_replace(coalesce(p, ''), '\s+', ' ', 'g')), ''), p_max)
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. L'import : un relevé prêt devient des comptes et des achats
-- ─────────────────────────────────────────────────────────────────────────

-- Une ligne de « ventes » est exploitable si elle a un code client, une date (entre 1990 et demain) et un montant.
create or replace function private.offload_ligne_vente_ok(p_valeurs jsonb)
 returns boolean
 language sql
 immutable
 set search_path to ''
as $function$
  select private.offload_texte(p_valeurs ->> 'compte_ref', 120) is not null
     and private.offload_lire_date(p_valeurs ->> 'date') between date '1990-01-01' and current_date + 1
     and private.offload_lire_montant(p_valeurs ->> 'montant') is not null
     and abs(private.offload_lire_montant(p_valeurs ->> 'montant')) < 10000000000
$function$;

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
    order by case j.code when 'clients' then 0 when 'ventes' then 1 else 2 end, x.recu_le, x.id
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

    else
      -- Un jeu que le module ne lit pas : appliqué tel quel, sans effet.
      perform private.acquitter_instantane(i.id, 'applique');
    end if;
  end loop;

  perform private.journaliser_module(b.client_id, 'offload', 'offload.import_applique', 'releves', rl.id::text,
    jsonb_build_object('releve', rl.id, 'jeux', v_jeux, 'douteux', v_douteux), v_entite);
  return jsonb_build_object('releve', rl.id, 'jeux', v_jeux, 'douteux', v_douteux);
end $function$;

-- Le passage du module : prend ses travaux, les traite un par un, ne laisse jamais filer une exception.
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
    select * from private.prendre_travaux(array['offload.appliquer_releve'], p_nombre, interval '10 minutes', 'offload-sql')
  loop
    begin
      r := case t.genre
             when 'offload.appliquer_releve' then private.offload_appliquer_releve(t.charge)
           end;
      perform private.finir_travail(t.id, r);
      n_ok := n_ok + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 2000), true);
      n_ko := n_ko + 1;
    end;
  end loop;
  return jsonb_build_object('faits', n_ok, 'echecs', n_ko);
end $function$;

insert into private.abonnements (evenement, module, genre)
select 'releve.pret.offload', 'offload', 'offload.appliquer_releve'
where not exists (select 1 from private.abonnements a
                  where a.evenement = 'releve.pret.offload' and a.module = 'offload' and a.genre = 'offload.appliquer_releve');

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Les portes : installer, régler, déposer un export, saisir
-- ─────────────────────────────────────────────────────────────────────────

create or replace function private.offload_installer(p_client uuid, p_entite uuid default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  v_entite uuid;
  v_branchement uuid;
  v_nouveau boolean := false;
begin
  if not exists (select 1 from public.clients where id = p_client) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  if not private.offload_est_serveur() then
    if (select auth.uid()) is null or not private.a_un_role(p_client, array['gerant'])
       or (p_entite is not null and not private.voit_entite(p_client, p_entite)) then
      raise exception 'OFFLOAD s''installe par Omega ou par le gérant de l''organisation.' using errcode = '42501';
    end if;
  end if;
  v_entite := case when p_entite is null then null else private.offload_entite(p_client, p_entite) end;

  insert into public.offload_reglages (client_id, installe_par) values (p_client, (select auth.uid()))
  on conflict (client_id) do nothing
  returning true into v_nouveau;
  select * into g from public.offload_reglages where client_id = p_client for update;

  v_branchement := g.branchement_id;
  if v_branchement is null then
    select x.id into v_branchement from public.branchements x
    where x.client_id = p_client and x.module = 'offload' and x.logiciel = 'tableur' and x.entite_id is not distinct from v_entite;
    if v_branchement is null then
      v_branchement := private.brancher(p_client, 'offload', 'tableur', 'exports', 'Exports des ventes et du fichier clients',
                                        v_entite, null, null);
    end if;
    update public.offload_reglages set branchement_id = v_branchement, maj_le = now() where client_id = p_client;
  end if;

  if coalesce(v_nouveau, false) then
    perform private.journaliser_module(p_client, 'offload', 'offload.installe', 'offload_reglages', p_client::text,
      jsonb_build_object('mode', 'essai', 'branchement', v_branchement), v_entite);
  end if;
  return jsonb_build_object('client', p_client, 'mode', coalesce(g.mode, 'essai'), 'nouveau', coalesce(v_nouveau, false),
    'branchement', v_branchement,
    'jeux', (select coalesce(jsonb_agg(j.code order by j.code), '[]'::jsonb) from public.branchements_jeux j where j.branchement_id = v_branchement));
end $function$;

create or replace function private.offload_regler(p_client uuid, p_reglages jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  v_inconnus text;
  p jsonb := coalesce(p_reglages, '{}'::jsonb);
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin'], 'régler les seuils');
  if jsonb_typeof(p) <> 'object' then
    raise exception 'Les réglages se donnent en objet.' using errcode = '22023';
  end if;
  select string_agg(k, ', ') into v_inconnus from jsonb_object_keys(p) k
  where k not in ('delai_silence_jours', 'montant_min', 'jour_cloture', 'alerte_avant_cloture_jours');
  if v_inconnus is not null then
    raise exception 'Réglage inconnu : %.', v_inconnus using errcode = '22023';
  end if;
  select * into g from public.offload_reglages where client_id = p_client for update;
  if not found then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  update public.offload_reglages set
    delai_silence_jours = case when p ? 'delai_silence_jours' then (p ->> 'delai_silence_jours')::integer else delai_silence_jours end,
    montant_min = case when p ? 'montant_min' then (p ->> 'montant_min')::numeric else montant_min end,
    jour_cloture = case when p ? 'jour_cloture' then (p ->> 'jour_cloture')::smallint else jour_cloture end,
    alerte_avant_cloture_jours = case when p ? 'alerte_avant_cloture_jours' then (p ->> 'alerte_avant_cloture_jours')::smallint
                                      else alerte_avant_cloture_jours end,
    maj_le = now()
  where client_id = p_client;
  perform private.journaliser_module(p_client, 'offload', 'offload.reglages', 'offload_reglages', p_client::text,
    jsonb_build_object('avant', jsonb_build_object('delai_silence_jours', g.delai_silence_jours, 'montant_min', g.montant_min,
                                                   'jour_cloture', g.jour_cloture, 'alerte_avant_cloture_jours', g.alerte_avant_cloture_jours),
                       'demande', p), null);
  return (select to_jsonb(x) from public.offload_reglages x where x.client_id = p_client);
end $function$;

-- Un export déjà posé dans l'armoire (bucket omega-clients, sous <client>/branchement/<id>/) devient un relevé.
-- p_fichier : {nom_fichier, sha256, chemin, mime, octets, jeu (ventes | clients, facultatif), cle (facultative)}.
create or replace function private.offload_deposer_export(p_client uuid, p_fichier jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  b public.branchements;
  f jsonb := coalesce(p_fichier, '{}'::jsonb);
begin
  select * into g from public.offload_reglages where client_id = p_client;
  if not found or g.branchement_id is null then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  select * into b from public.branchements where id = g.branchement_id;
  perform private.offload_exiger(p_client, b.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'déposer un export');
  if jsonb_typeof(f) <> 'object' then
    raise exception 'Le fichier se décrit en objet.' using errcode = '22023';
  end if;
  if f ->> 'jeu' is not null and f ->> 'jeu' not in ('ventes', 'clients') then
    raise exception 'Un export OFFLOAD est « ventes » ou « clients ».' using errcode = '22023';
  end if;
  return private.recevoir_releve(b.id,
    jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'nom_fichier', f ->> 'nom_fichier', 'sha256', f ->> 'sha256', 'chemin', f ->> 'chemin',
      'mime', f ->> 'mime', 'octets', f -> 'octets', 'jeu', f ->> 'jeu'))),
    'depot', f ->> 'cle',
    (select left(u.email, 320) from auth.users u where u.id = (select auth.uid())));
end $function$;

create or replace function private.offload_saisir_compte(p_client uuid, p_entite uuid, p_ref text, p_nom text, p_champs jsonb default '{}'::jsonb)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_entite uuid;
  v_id uuid;
  v_ref text;
  v_nom text := private.offload_texte(p_nom, 200);
  p jsonb := coalesce(p_champs, '{}'::jsonb);
  v_inconnus text;
  v_nouveau boolean;
begin
  v_entite := private.offload_entite(p_client, p_entite);
  perform private.offload_exiger(p_client, v_entite, array['gerant', 'admin', 'valideur', 'collaborateur'], 'saisir un compte');
  if not exists (select 1 from public.offload_reglages g where g.client_id = p_client) then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  if v_nom is null then
    raise exception 'Un compte a un nom.' using errcode = '22023';
  end if;
  if jsonb_typeof(p) <> 'object' then
    raise exception 'Les champs du compte se donnent en objet.' using errcode = '22023';
  end if;
  select string_agg(k, ', ') into v_inconnus from jsonb_object_keys(p) k
  where k not in ('contact', 'email', 'telephone', 'commercial', 'groupe', 'ville', 'secteur');
  if v_inconnus is not null then
    raise exception 'Champ de compte inconnu : %.', v_inconnus using errcode = '22023';
  end if;
  v_ref := coalesce(private.offload_texte(p_ref, 120), 'S-' || upper(left(replace(gen_random_uuid()::text, '-', ''), 8)));

  insert into public.offload_comptes as c (client_id, entite_id, ref, nom, contact, email, telephone, commercial, groupe, ville,
                                           secteur, source)
  values (p_client, v_entite, v_ref, v_nom, private.offload_texte(p ->> 'contact', 200), private.offload_texte(p ->> 'email', 320),
          private.offload_texte(p ->> 'telephone', 40), private.offload_texte(p ->> 'commercial', 120),
          private.offload_texte(p ->> 'groupe', 200), private.offload_texte(p ->> 'ville', 120),
          private.offload_texte(p ->> 'secteur', 120), 'saisie')
  on conflict (client_id, entite_id, ref) do update
    set nom = excluded.nom,
        contact = case when p ? 'contact' then excluded.contact else c.contact end,
        email = case when p ? 'email' then excluded.email else c.email end,
        telephone = case when p ? 'telephone' then excluded.telephone else c.telephone end,
        commercial = case when p ? 'commercial' then excluded.commercial else c.commercial end,
        groupe = case when p ? 'groupe' then excluded.groupe else c.groupe end,
        ville = case when p ? 'ville' then excluded.ville else c.ville end,
        secteur = case when p ? 'secteur' then excluded.secteur else c.secteur end,
        maj_le = now()
  returning id, (xmax = 0) into v_id, v_nouveau;
  perform private.journaliser_module(p_client, 'offload', case when v_nouveau then 'offload.compte_saisi' else 'offload.compte_modifie' end,
    'offload_comptes', v_id::text, jsonb_build_object('ref', v_ref, 'champs', jsonb_build_object('nom', v_nom) || p), v_entite);
  return v_id;
end $function$;

create or replace function private.offload_saisir_achat(p_compte uuid, p_date date, p_montant numeric, p_reference text default null,
                                                        p_libelle text default null, p_nature text default 'facture')
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  v_id uuid;
  v_nature text := coalesce(p_nature, 'facture');
begin
  select * into c from public.offload_comptes where id = p_compte;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(c.client_id, c.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'saisir un achat');
  if p_date is null or p_date < date '1990-01-01' or p_date > current_date then
    raise exception 'La date d''un achat est connue et passée.' using errcode = '22023';
  end if;
  if p_montant is null or abs(p_montant) >= 10000000000 then
    raise exception 'Le montant hors taxes est obligatoire.' using errcode = '22023';
  end if;
  if v_nature not in ('facture', 'commande', 'avoir') then
    raise exception 'Une pièce est une facture, une commande ou un avoir.' using errcode = '22023';
  end if;
  insert into public.offload_achats (client_id, entite_id, compte_id, date_achat, montant_ht, reference, libelle, nature, source, saisi_par)
  values (c.client_id, c.entite_id, c.id, p_date,
          round(case when v_nature = 'avoir' then -abs(p_montant) else p_montant end, 2),
          private.offload_texte(p_reference, 120), private.offload_texte(p_libelle, 500), v_nature, 'saisie', (select auth.uid()))
  returning id into v_id;
  perform private.journaliser_module(c.client_id, 'offload', 'offload.achat_saisi', 'offload_achats', v_id::text,
    jsonb_build_object('compte', c.id, 'date', p_date, 'montant_ht', p_montant, 'nature', v_nature), c.entite_id);
  return v_id;
end $function$;

create or replace function private.offload_annuler_achat(p_achat uuid, p_motif text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  a public.offload_achats;
  v_motif text := private.offload_texte(p_motif, 500);
begin
  select * into a from public.offload_achats where id = p_achat for update;
  if not found then
    raise exception 'Achat introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(a.client_id, a.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'annuler un achat');
  if v_motif is null then
    raise exception 'Une annulation dit pourquoi.' using errcode = '22023';
  end if;
  if a.annule_le is not null then
    return;
  end if;
  update public.offload_achats set annule_le = now(), annule_par = (select auth.uid()), annule_motif = v_motif, maj_le = now()
  where id = a.id;
  perform private.journaliser_module(a.client_id, 'offload', 'offload.achat_annule', 'offload_achats', a.id::text,
    jsonb_build_object('compte', a.compte_id, 'date', a.date_achat, 'montant_ht', a.montant_ht, 'motif', v_motif), a.entite_id);
end $function$;

-- Les façades publiques (SECURITY INVOKER) : la fonction privée vérifie les droits.
create or replace function public.offload_installer(p_client uuid, p_entite uuid default null)
 returns jsonb language sql set search_path to ''
as $function$ select private.offload_installer(p_client, p_entite) $function$;

create or replace function public.offload_regler(p_client uuid, p_reglages jsonb)
 returns jsonb language sql set search_path to ''
as $function$ select private.offload_regler(p_client, p_reglages) $function$;

create or replace function public.offload_deposer_export(p_client uuid, p_fichier jsonb)
 returns jsonb language sql set search_path to ''
as $function$ select private.offload_deposer_export(p_client, p_fichier) $function$;

create or replace function public.offload_saisir_compte(p_client uuid, p_entite uuid, p_ref text, p_nom text, p_champs jsonb default '{}'::jsonb)
 returns uuid language sql set search_path to ''
as $function$ select private.offload_saisir_compte(p_client, p_entite, p_ref, p_nom, p_champs) $function$;

create or replace function public.offload_saisir_achat(p_compte uuid, p_date date, p_montant numeric, p_reference text default null,
                                                       p_libelle text default null, p_nature text default 'facture')
 returns uuid language sql set search_path to ''
as $function$ select private.offload_saisir_achat(p_compte, p_date, p_montant, p_reference, p_libelle, p_nature) $function$;

create or replace function public.offload_annuler_achat(p_achat uuid, p_motif text)
 returns void language sql set search_path to ''
as $function$ select private.offload_annuler_achat(p_achat, p_motif) $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Droits (à inscrire dans omega/a5_01_liste_figee.txt, règle b : appelées par une porte publique
--    SECURITY INVOKER exécutable par authenticated) et le cron
-- ─────────────────────────────────────────────────────────────────────────

revoke all on function public.offload_installer(uuid, uuid) from public, anon;
revoke all on function public.offload_regler(uuid, jsonb) from public, anon;
revoke all on function public.offload_deposer_export(uuid, jsonb) from public, anon;
revoke all on function public.offload_saisir_compte(uuid, uuid, text, text, jsonb) from public, anon;
revoke all on function public.offload_saisir_achat(uuid, date, numeric, text, text, text) from public, anon;
revoke all on function public.offload_annuler_achat(uuid, text) from public, anon;
grant execute on function public.offload_installer(uuid, uuid) to authenticated, service_role;
grant execute on function public.offload_regler(uuid, jsonb) to authenticated, service_role;
grant execute on function public.offload_deposer_export(uuid, jsonb) to authenticated, service_role;
grant execute on function public.offload_saisir_compte(uuid, uuid, text, text, jsonb) to authenticated, service_role;
grant execute on function public.offload_saisir_achat(uuid, date, numeric, text, text, text) to authenticated, service_role;
grant execute on function public.offload_annuler_achat(uuid, text) to authenticated, service_role;

revoke execute on function private.offload_installer(uuid, uuid) from public, anon;
revoke execute on function private.offload_regler(uuid, jsonb) from public, anon;
revoke execute on function private.offload_deposer_export(uuid, jsonb) from public, anon;
revoke execute on function private.offload_saisir_compte(uuid, uuid, text, text, jsonb) from public, anon;
revoke execute on function private.offload_saisir_achat(uuid, date, numeric, text, text, text) from public, anon;
revoke execute on function private.offload_annuler_achat(uuid, text) from public, anon;
grant execute on function private.offload_installer(uuid, uuid) to authenticated, service_role;
grant execute on function private.offload_regler(uuid, jsonb) to authenticated, service_role;
grant execute on function private.offload_deposer_export(uuid, jsonb) to authenticated, service_role;
grant execute on function private.offload_saisir_compte(uuid, uuid, text, text, jsonb) to authenticated, service_role;
grant execute on function private.offload_saisir_achat(uuid, date, numeric, text, text, text) to authenticated, service_role;
grant execute on function private.offload_annuler_achat(uuid, text) to authenticated, service_role;

-- Les aides : appelées seulement depuis des fonctions SECURITY DEFINER, donc le serveur seul.
revoke execute on function private.offload_est_serveur() from public, anon, authenticated;
revoke execute on function private.offload_exiger(uuid, uuid, text[], text) from public, anon, authenticated;
revoke execute on function private.offload_entite(uuid, uuid) from public, anon, authenticated;
revoke execute on function private.offload_lire_date(text) from public, anon, authenticated;
revoke execute on function private.offload_lire_montant(text) from public, anon, authenticated;
revoke execute on function private.offload_nature(text) from public, anon, authenticated;
revoke execute on function private.offload_texte(text, integer) from public, anon, authenticated;
revoke execute on function private.offload_ligne_vente_ok(jsonb) from public, anon, authenticated;
revoke execute on function private.offload_appliquer_releve(jsonb) from public, anon, authenticated;
revoke execute on function private.offload_traiter_travaux(integer) from public, anon, authenticated;
grant execute on function private.offload_est_serveur() to service_role;
grant execute on function private.offload_exiger(uuid, uuid, text[], text) to service_role;
grant execute on function private.offload_entite(uuid, uuid) to service_role;
grant execute on function private.offload_lire_date(text) to service_role;
grant execute on function private.offload_lire_montant(text) to service_role;
grant execute on function private.offload_nature(text) to service_role;
grant execute on function private.offload_texte(text, integer) to service_role;
grant execute on function private.offload_ligne_vente_ok(jsonb) to service_role;
grant execute on function private.offload_appliquer_releve(jsonb) to service_role;
grant execute on function private.offload_traiter_travaux(integer) to service_role;

select cron.schedule('offload-releves', '* * * * *', $cron$select private.offload_traiter_travaux()$cron$)
where not exists (select 1 from cron.job where jobname = 'offload-releves');
