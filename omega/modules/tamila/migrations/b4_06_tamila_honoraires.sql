-- b4_06 — Tamila : les honoraires du dossier (session B4, 06/10/2026, vague 3, manque n° 1).
--
-- POURQUOI. Un cabinet paie d'abord un logiciel pour le temps passé et la facturation (Jarvis Legal, Secib :
-- 45 à 85 € HT par utilisateur et par mois) ; et la loi l'exige : convention d'honoraires écrite en toute
-- matière sauf urgence (loi n° 71-1130 du 31/12/1971, art. 10, rédaction de la loi n° 2015-990), critères du
-- RIN art. 11.2, modes de règlement art. 11.6, compte détaillé définitif art. 11.7. Sources : NOTES-B4, vague 3.
--
-- CE QUE ÇA POSE.
--   · tamila_conventions : la convention du dossier (temps passé, forfait ou mixte ; taux horaire, forfait,
--     honoraire de résultat en complément ; TVA) ; proposée puis signée (la pièce signée est une pièce chiffrée
--     du dossier), ou « urgence » (pas d'écrit, permis par l'art. 10). Une seule vivante par dossier.
--   · tamila_temps : le temps passé, par personne et par jour, en minutes ; la description est CHIFFRÉE avec la
--     clé du dossier (bytea, format tamila_chiffre_valide), jamais en clair.
--   · tamila_provisions : provisions demandées, reçues (mode de règlement de l'art. 11.6).
--   · tamila_factures : facture ou compte détaillé définitif, numérotée sans trou par cabinet et par année
--     (H-2026-000001), honoraires au temps et au forfait, déboursés hors TVA, TVA, TTC, provisions imputées,
--     reste dû ; émise, payée ou annulée (le numéro reste). Montants en centimes.
--   · Portes : tamila_poser_convention, tamila_signer_convention, tamila_saisir_temps, tamila_annuler_temps,
--     tamila_demander_provision, tamila_provision_recue, tamila_emettre_facture, tamila_facture_payee,
--     tamila_annuler_facture, tamila_honoraires (le résumé du dossier pour l'écran).
--
-- QUI. Convention, provisions, factures : un avocat qui gère le dossier (responsable, associé, titulaire perso).
-- Temps : toute personne qui écrit dans le dossier, pour elle-même. Réception d'une provision, paiement : un
-- associé ou celui qui gère. Lecture : qui voit le dossier (RLS), comme le reste de Tamila.
--
-- EFFACEMENT. Les temps (descriptions chiffrées) s'effacent avec le dossier (private.tables_objets). Factures,
-- provisions et conventions NE s'effacent PAS avec le dossier : pièces comptables et contractuelles, à conserver
-- (Code de commerce, art. L.123-22 : dix ans) ; elles ne portent aucun clair (montants, dates, identifiants).
--
-- Rien n'est effacé : create table if not exists, create or replace. Fonctions private : revoke from public.

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Les tables
-- ════════════════════════════════════════════════════════════════════════════════════════════

create table if not exists public.tamila_conventions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  dossier_id uuid not null,
  mode text not null,
  taux_horaire_cents integer,
  forfait_cents bigint,
  complement_resultat_pct numeric(5,2),
  taux_tva numeric(4,2) not null default 20,
  urgence boolean not null default false,
  statut text not null default 'proposee',
  signee_le date,
  piece_id uuid,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  resiliee_le timestamptz,
  constraint tamila_conventions_mode_check check (mode in ('temps_passe', 'forfait', 'mixte')),
  constraint tamila_conventions_statut_check check (statut in ('proposee', 'signee', 'resiliee')),
  constraint tamila_conventions_taux check ((mode = 'forfait') = (taux_horaire_cents is null) and (taux_horaire_cents is null or taux_horaire_cents between 1000 and 200000)),
  constraint tamila_conventions_forfait check ((mode = 'temps_passe') = (forfait_cents is null) and (forfait_cents is null or forfait_cents between 1 and 100000000)),
  constraint tamila_conventions_complement check (complement_resultat_pct is null or complement_resultat_pct between 0 and 50),
  constraint tamila_conventions_tva check (taux_tva between 0 and 20),
  constraint tamila_conventions_signee check ((statut = 'signee') = (signee_le is not null) or statut = 'resiliee')
);
create unique index if not exists tamila_conventions_une_vivante on public.tamila_conventions (dossier_id) where statut in ('proposee', 'signee');

create table if not exists public.tamila_temps (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  dossier_id uuid not null,
  user_id uuid not null,
  jour date not null,
  minutes integer not null,
  nature text not null,
  description_chiffree bytea,
  facturable boolean not null default true,
  statut text not null default 'saisi',
  facture_id uuid,
  cree_le timestamptz not null default now(),
  constraint tamila_temps_minutes_check check (minutes between 1 and 1440),
  constraint tamila_temps_nature_check check (nature in ('consultation', 'redaction', 'recherche', 'audience', 'rendez_vous',
                                                          'correspondance', 'deplacement', 'negociation', 'autre')),
  constraint tamila_temps_statut_check check (statut in ('saisi', 'facture', 'annule')),
  constraint tamila_temps_description_check check (private.tamila_chiffre_valide(description_chiffree)),
  constraint tamila_temps_facture check ((statut = 'facture') = (facture_id is not null))
);
create index if not exists tamila_temps_dossier on public.tamila_temps (dossier_id, jour);

create table if not exists public.tamila_provisions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  dossier_id uuid not null,
  montant_ttc_cents bigint not null,
  demandee_le date not null,
  recue_le date,
  mode_reglement text,
  statut text not null default 'demandee',
  facture_id uuid,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  constraint tamila_provisions_montant_check check (montant_ttc_cents between 1 and 100000000),
  constraint tamila_provisions_mode_check check (mode_reglement in ('especes', 'cheque', 'virement', 'billet_a_ordre', 'carte')),
  constraint tamila_provisions_statut_check check (statut in ('demandee', 'recue', 'annulee')),
  constraint tamila_provisions_recue check ((statut = 'recue') = (recue_le is not null and mode_reglement is not null))
);
create index if not exists tamila_provisions_dossier on public.tamila_provisions (dossier_id);

create table if not exists public.tamila_factures (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  dossier_id uuid not null,
  numero text not null,
  nature text not null default 'facture',
  emise_le date not null,
  jusqu_au date not null,
  minutes integer not null default 0,
  honoraires_temps_cents bigint not null default 0,
  forfait_cents bigint not null default 0,
  debours_cents bigint not null default 0,
  total_ht_cents bigint not null,
  taux_tva numeric(4,2) not null,
  tva_cents bigint not null,
  total_ttc_cents bigint not null,
  provisions_imputees_cents bigint not null default 0,
  reste_du_cents bigint not null,
  statut text not null default 'emise',
  payee_le date,
  mode_reglement text,
  motif_annulation text,
  emise_par uuid,
  cree_le timestamptz not null default now(),
  constraint tamila_factures_numero_unique unique (client_id, numero),
  constraint tamila_factures_numero_check check (numero ~ '^H-[0-9]{4}-[0-9]{6}$'),
  constraint tamila_factures_nature_check check (nature in ('facture', 'compte_definitif')),
  constraint tamila_factures_statut_check check (statut in ('emise', 'payee', 'annulee')),
  constraint tamila_factures_mode_check check (mode_reglement in ('especes', 'cheque', 'virement', 'billet_a_ordre', 'carte')),
  constraint tamila_factures_payee check ((statut = 'payee') = (payee_le is not null)),
  constraint tamila_factures_annulee check ((statut = 'annulee') = (motif_annulation is not null)),
  constraint tamila_factures_montants check (honoraires_temps_cents >= 0 and forfait_cents >= 0 and debours_cents >= 0 and tva_cents >= 0
                                              and total_ht_cents = honoraires_temps_cents + forfait_cents
                                              and total_ttc_cents = total_ht_cents + tva_cents + debours_cents
                                              and reste_du_cents = total_ttc_cents - provisions_imputees_cents)
);
create index if not exists tamila_factures_dossier on public.tamila_factures (dossier_id, emise_le);

create table if not exists public.tamila_factures_compteurs (
  client_id uuid not null,
  annee integer not null,
  dernier integer not null default 0,
  primary key (client_id, annee)
);

comment on table public.tamila_conventions is 'Tamila (B4, b4_06) : la convention d''honoraires d''un dossier (loi 1971 art. 10 ; RIN art. 11).';
comment on table public.tamila_temps is 'Tamila (B4, b4_06) : le temps passé sur un dossier ; la description est chiffrée avec la clé du dossier.';
comment on table public.tamila_provisions is 'Tamila (B4, b4_06) : les provisions sur honoraires demandées et reçues (RIN art. 11.6).';
comment on table public.tamila_factures is 'Tamila (B4, b4_06) : factures et comptes détaillés définitifs (RIN art. 11.7), numérotés sans trou ; conservés après l''effacement du dossier.';

do $droits$
declare t text;
begin
  foreach t in array array['tamila_conventions', 'tamila_temps', 'tamila_provisions', 'tamila_factures'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated, service_role', t);
    execute format('grant select on table public.%I to authenticated', t);
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = 'on lit les honoraires des dossiers qu''on voit') then
      execute format('create policy "on lit les honoraires des dossiers qu''on voit" on public.%I for select to authenticated '
                     'using (private.tamila_voit_dossier_pour((select auth.uid()), client_id, (dossier_id)::text))', t);
    end if;
  end loop;
  alter table public.tamila_factures_compteurs enable row level security;
  revoke all on table public.tamila_factures_compteurs from anon, authenticated, service_role;
end $droits$;

-- Les temps s'effacent avec le dossier ; tout le reste part avec le cabinet.
do $effacement$
begin
  if to_regclass('private.tables_objets') is not null then
    begin
      execute $q$insert into private.tables_objets (nom, objet_type, colonne) select 'tamila_temps', 'tamila_dossier', 'dossier_id'
               where not exists (select 1 from private.tables_objets t where t.nom = 'tamila_temps')$q$;
    exception when others then raise notice 'tables_objets : % (à inscrire à la main)', sqlerrm; end;
  end if;
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select x
               from unnest(array['tamila_conventions', 'tamila_temps', 'tamila_provisions', 'tamila_factures', 'tamila_factures_compteurs']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $effacement$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Les outils
-- ════════════════════════════════════════════════════════════════════════════════════════════

-- Le dossier, pour un geste d'honoraires d'un avocat qui le gère (ou le serveur).
create or replace function private.tamila_honoraires_gere(p_dossier uuid)
returns public.tamila_dossiers
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
begin
  v_d := private.tamila_dossier_ecrit(p_dossier, true);
  if v_uid is not null and not private.tamila_gere_dossier_pour(v_uid, p_dossier) then
    raise exception 'Les honoraires d''un dossier sont l''affaire de son responsable ou d''un associé.' using errcode = '42501';
  end if;
  return v_d;
end $function$;

-- Un associé du cabinet, ou celui qui gère le dossier (réception d'une provision, paiement d'une facture).
create or replace function private.tamila_encaisse_pour(p_dossier uuid)
returns public.tamila_dossiers
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
begin
  select * into v_d from public.tamila_dossiers where id = p_dossier;
  if not found then
    raise exception 'Dossier introuvable.' using errcode = 'P0002';
  end if;
  if v_uid is null then
    if private.tamila_role_session() not in ('service_role', 'postgres') then
      raise exception 'Seul un associé, ou le serveur, fait ce geste.' using errcode = '42501';
    end if;
    return v_d;
  end if;
  if not private.tamila_voit_dossier_pour(v_uid, v_d.client_id, p_dossier::text)
     or not (private.tamila_gere_dossier_pour(v_uid, p_dossier)
             or exists (select 1 from public.comptes c where c.user_id = v_uid and c.client_id = v_d.client_id and c.role in ('gerant', 'admin'))) then
    raise exception 'Un encaissement est noté par un associé ou par l''avocat qui gère le dossier.' using errcode = '42501';
  end if;
  return v_d;
end $function$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- La convention
-- ════════════════════════════════════════════════════════════════════════════════════════════

create or replace function private.tamila_poser_convention(p_dossier uuid, p_mode text, p_taux_horaire_cents integer default null,
                                                           p_forfait_cents bigint default null, p_complement_pct numeric default null,
                                                           p_taux_tva numeric default 20, p_urgence boolean default false)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_d public.tamila_dossiers;
  v_id uuid;
begin
  v_d := private.tamila_honoraires_gere(p_dossier);
  if p_mode is null or p_mode not in ('temps_passe', 'forfait', 'mixte') then
    raise exception 'Mode d''honoraires inconnu : %.', coalesce(p_mode, 'vide') using errcode = '22023';
  end if;
  if (p_mode = 'forfait') <> (p_taux_horaire_cents is null) then
    raise exception 'Un taux horaire pour le temps passé ou le mixte, aucun pour un forfait.' using errcode = '22023';
  end if;
  if (p_mode = 'temps_passe') <> (p_forfait_cents is null) then
    raise exception 'Un forfait pour le forfait ou le mixte, aucun pour le temps passé.' using errcode = '22023';
  end if;
  update public.tamila_conventions set statut = 'resiliee', resiliee_le = now()
   where dossier_id = p_dossier and statut in ('proposee', 'signee');
  begin
    insert into public.tamila_conventions (client_id, dossier_id, mode, taux_horaire_cents, forfait_cents, complement_resultat_pct,
                                           taux_tva, urgence, cree_par)
    values (v_d.client_id, p_dossier, p_mode, p_taux_horaire_cents, p_forfait_cents, p_complement_pct,
            coalesce(p_taux_tva, 20), coalesce(p_urgence, false), (select auth.uid()))
    returning id into v_id;
  exception when check_violation then
    raise exception 'Convention illisible : taux horaire de 10 à 2 000 €, forfait positif, complément de résultat de 0 à 50 %%, TVA de 0 à 20 %%.' using errcode = '22023';
  end;
  perform private.journaliser_module(v_d.client_id, 'tamila', 'tamila.convention.posee', 'tamila_dossier', p_dossier::text,
    jsonb_build_object('convention', v_id, 'mode', p_mode, 'urgence', coalesce(p_urgence, false)));
  return v_id;
end $function$;

create or replace function private.tamila_signer_convention(p_convention uuid, p_signee_le date, p_piece uuid default null)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_c public.tamila_conventions;
  v_d public.tamila_dossiers;
begin
  select * into v_c from public.tamila_conventions where id = p_convention for update;
  if not found then
    raise exception 'Convention introuvable.' using errcode = 'P0002';
  end if;
  v_d := private.tamila_honoraires_gere(v_c.dossier_id);
  if v_c.statut <> 'proposee' then
    raise exception 'Seule une convention proposée se signe (celle-ci est %).', v_c.statut using errcode = '55000';
  end if;
  if p_signee_le is null or p_signee_le > (now() at time zone 'Europe/Paris')::date then
    raise exception 'La date de signature est passée ou du jour.' using errcode = '22023';
  end if;
  if p_piece is not null and not exists (select 1 from public.pieces pc where pc.id = p_piece and pc.client_id = v_d.client_id
                                           and pc.objet_type = 'tamila_dossier' and pc.objet_id = v_d.id::text) then
    raise exception 'La convention signée est une pièce de ce dossier.' using errcode = '22023';
  end if;
  update public.tamila_conventions set statut = 'signee', signee_le = p_signee_le, piece_id = p_piece where id = p_convention;
  perform private.journaliser_module(v_d.client_id, 'tamila', 'tamila.convention.signee', 'tamila_dossier', v_d.id::text,
    jsonb_build_object('convention', p_convention, 'signee_le', p_signee_le, 'piece', p_piece));
end $function$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Le temps passé
-- ════════════════════════════════════════════════════════════════════════════════════════════

create or replace function private.tamila_saisir_temps(p_dossier uuid, p_jour date, p_minutes integer, p_nature text,
                                                       p_description bytea default null, p_facturable boolean default true)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_aujourdhui date := (now() at time zone 'Europe/Paris')::date;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Le temps passé se saisit par la personne qui l''a passé.' using errcode = '42501';
  end if;
  v_d := private.tamila_dossier_ecrit(p_dossier, false);
  if p_jour is null or p_jour > v_aujourdhui or p_jour < v_aujourdhui - 366 then
    raise exception 'Le jour est passé ou du jour, et dans l''année écoulée.' using errcode = '22023';
  end if;
  if p_minutes is null or p_minutes < 1 or p_minutes > 1440 then
    raise exception 'Une durée de 1 minute à 24 heures.' using errcode = '22023';
  end if;
  if p_nature is null or p_nature not in ('consultation', 'redaction', 'recherche', 'audience', 'rendez_vous', 'correspondance',
                                          'deplacement', 'negociation', 'autre') then
    raise exception 'Nature du temps inconnue : %.', coalesce(p_nature, 'vide') using errcode = '22023';
  end if;
  if p_description is not null and not private.tamila_chiffre_valide(p_description) then
    raise exception 'La description se chiffre avec la clé du dossier, jamais en clair.' using errcode = '22023';
  end if;
  insert into public.tamila_temps (client_id, dossier_id, user_id, jour, minutes, nature, description_chiffree, facturable)
  values (v_d.client_id, p_dossier, v_uid, p_jour, p_minutes, p_nature, p_description, coalesce(p_facturable, true))
  returning id into v_id;
  return v_id;
end $function$;

create or replace function private.tamila_annuler_temps(p_temps uuid)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_t public.tamila_temps;
begin
  select * into v_t from public.tamila_temps where id = p_temps for update;
  if not found then
    raise exception 'Temps introuvable.' using errcode = 'P0002';
  end if;
  perform private.tamila_dossier_ecrit(v_t.dossier_id, false);
  if v_uid is not null and v_t.user_id <> v_uid and not private.tamila_gere_dossier_pour(v_uid, v_t.dossier_id) then
    raise exception 'On annule son propre temps, ou celui d''un dossier qu''on gère.' using errcode = '42501';
  end if;
  if v_t.statut <> 'saisi' then
    raise exception 'Ce temps est %, il ne s''annule plus ici.', v_t.statut using errcode = '55000';
  end if;
  update public.tamila_temps set statut = 'annule' where id = p_temps;
end $function$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Les provisions
-- ════════════════════════════════════════════════════════════════════════════════════════════

create or replace function private.tamila_demander_provision(p_dossier uuid, p_montant_ttc_cents bigint, p_le date default null)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_d public.tamila_dossiers;
  v_id uuid;
begin
  v_d := private.tamila_honoraires_gere(p_dossier);
  if p_montant_ttc_cents is null or p_montant_ttc_cents < 1 or p_montant_ttc_cents > 100000000 then
    raise exception 'Une provision de 0,01 € à 1 000 000 €.' using errcode = '22023';
  end if;
  insert into public.tamila_provisions (client_id, dossier_id, montant_ttc_cents, demandee_le, cree_par)
  values (v_d.client_id, p_dossier, p_montant_ttc_cents, coalesce(p_le, (now() at time zone 'Europe/Paris')::date), (select auth.uid()))
  returning id into v_id;
  perform private.journaliser_module(v_d.client_id, 'tamila', 'tamila.provision.demandee', 'tamila_dossier', p_dossier::text,
    jsonb_build_object('provision', v_id, 'montant_ttc_cents', p_montant_ttc_cents));
  return v_id;
end $function$;

create or replace function private.tamila_provision_recue(p_provision uuid, p_recue_le date, p_mode text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_p public.tamila_provisions;
  v_d public.tamila_dossiers;
begin
  select * into v_p from public.tamila_provisions where id = p_provision for update;
  if not found then
    raise exception 'Provision introuvable.' using errcode = 'P0002';
  end if;
  v_d := private.tamila_encaisse_pour(v_p.dossier_id);
  if v_p.statut <> 'demandee' then
    raise exception 'Cette provision est déjà %.', v_p.statut using errcode = '55000';
  end if;
  if p_mode is null or p_mode not in ('especes', 'cheque', 'virement', 'billet_a_ordre', 'carte') then
    raise exception 'Mode de règlement inconnu (RIN art. 11.6) : %.', coalesce(p_mode, 'vide') using errcode = '22023';
  end if;
  if p_recue_le is null or p_recue_le > (now() at time zone 'Europe/Paris')::date then
    raise exception 'La date de réception est passée ou du jour.' using errcode = '22023';
  end if;
  update public.tamila_provisions set statut = 'recue', recue_le = p_recue_le, mode_reglement = p_mode where id = p_provision;
  perform private.journaliser_module(v_d.client_id, 'tamila', 'tamila.provision.recue', 'tamila_dossier', v_d.id::text,
    jsonb_build_object('provision', p_provision, 'montant_ttc_cents', v_p.montant_ttc_cents, 'mode', p_mode));
end $function$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- La facture et le compte détaillé définitif
-- ════════════════════════════════════════════════════════════════════════════════════════════

create or replace function private.tamila_emettre_facture(p_dossier uuid, p_jusqu_au date default null, p_debours_cents bigint default 0,
                                                          p_definitif boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_c public.tamila_conventions;
  v_aujourdhui date := (now() at time zone 'Europe/Paris')::date;
  v_jusqu date := coalesce(p_jusqu_au, (now() at time zone 'Europe/Paris')::date);
  v_minutes integer;
  v_temps bigint := 0;
  v_forfait bigint := 0;
  v_ht bigint;
  v_tva bigint;
  v_ttc bigint;
  v_prov bigint;
  v_annee integer := extract(year from (now() at time zone 'Europe/Paris'))::integer;
  v_n integer;
  v_numero text;
  v_id uuid;
begin
  v_d := private.tamila_honoraires_gere(p_dossier);
  select * into v_c from public.tamila_conventions c where c.dossier_id = p_dossier and c.statut in ('proposee', 'signee');
  if not found or (v_c.statut <> 'signee' and not v_c.urgence) then
    raise exception 'Pas de facture sans convention d''honoraires signée (loi du 31/12/1971, art. 10), sauf urgence.' using errcode = '55000';
  end if;
  if v_jusqu > v_aujourdhui then
    raise exception 'On facture le temps passé, jusqu''à aujourd''hui au plus.' using errcode = '22023';
  end if;
  if coalesce(p_debours_cents, 0) < 0 or coalesce(p_debours_cents, 0) > 100000000 then
    raise exception 'Déboursés de 0 à 1 000 000 €.' using errcode = '22023';
  end if;

  select coalesce(sum(t.minutes), 0) into v_minutes from public.tamila_temps t
   where t.dossier_id = p_dossier and t.statut = 'saisi' and t.facturable and t.jour <= v_jusqu;
  if v_c.mode in ('temps_passe', 'mixte') then
    v_temps := round(v_minutes::numeric * v_c.taux_horaire_cents / 60)::bigint;
  end if;
  if v_c.mode in ('forfait', 'mixte') and not exists (select 1 from public.tamila_factures f
                                                        where f.dossier_id = p_dossier and f.statut <> 'annulee' and f.forfait_cents > 0) then
    v_forfait := v_c.forfait_cents;
  end if;
  v_ht := v_temps + v_forfait;
  if v_ht = 0 and coalesce(p_debours_cents, 0) = 0 and not coalesce(p_definitif, false) then
    raise exception 'Rien à facturer : aucun temps facturable saisi, forfait déjà facturé, aucun déboursé.' using errcode = '22023';
  end if;
  v_tva := round(v_ht * v_c.taux_tva / 100)::bigint;
  v_ttc := v_ht + v_tva + coalesce(p_debours_cents, 0);
  select coalesce(sum(p.montant_ttc_cents), 0) into v_prov from public.tamila_provisions p
   where p.dossier_id = p_dossier and p.statut = 'recue' and p.facture_id is null;

  -- Le numéro : sans trou, par cabinet et par année (la ligne du compteur est verrouillée jusqu'à la fin).
  insert into public.tamila_factures_compteurs (client_id, annee, dernier) values (v_d.client_id, v_annee, 0)
  on conflict (client_id, annee) do nothing;
  update public.tamila_factures_compteurs set dernier = dernier + 1
   where client_id = v_d.client_id and annee = v_annee
  returning dernier into v_n;
  v_numero := 'H-' || v_annee::text || '-' || lpad(v_n::text, 6, '0');

  insert into public.tamila_factures (client_id, dossier_id, numero, nature, emise_le, jusqu_au, minutes, honoraires_temps_cents,
                                      forfait_cents, debours_cents, total_ht_cents, taux_tva, tva_cents, total_ttc_cents,
                                      provisions_imputees_cents, reste_du_cents, emise_par)
  values (v_d.client_id, p_dossier, v_numero, case when coalesce(p_definitif, false) then 'compte_definitif' else 'facture' end,
          v_aujourdhui, v_jusqu, v_minutes, v_temps, v_forfait, coalesce(p_debours_cents, 0), v_ht, v_c.taux_tva, v_tva, v_ttc,
          v_prov, v_ttc - v_prov, v_uid)
  returning id into v_id;
  update public.tamila_temps set statut = 'facture', facture_id = v_id
   where dossier_id = p_dossier and statut = 'saisi' and facturable and jour <= v_jusqu;
  update public.tamila_provisions set facture_id = v_id
   where dossier_id = p_dossier and statut = 'recue' and facture_id is null;
  perform private.journaliser_module(v_d.client_id, 'tamila', 'tamila.facture.emise', 'tamila_dossier', p_dossier::text,
    jsonb_build_object('facture', v_id, 'numero', v_numero, 'total_ttc_cents', v_ttc, 'definitif', coalesce(p_definitif, false)));
  return jsonb_build_object('facture', v_id, 'numero', v_numero, 'minutes', v_minutes, 'honoraires_temps_cents', v_temps,
                            'forfait_cents', v_forfait, 'debours_cents', coalesce(p_debours_cents, 0), 'total_ht_cents', v_ht,
                            'tva_cents', v_tva, 'total_ttc_cents', v_ttc, 'provisions_imputees_cents', v_prov, 'reste_du_cents', v_ttc - v_prov);
end $function$;

create or replace function private.tamila_facture_payee(p_facture uuid, p_payee_le date, p_mode text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_f public.tamila_factures;
  v_d public.tamila_dossiers;
begin
  select * into v_f from public.tamila_factures where id = p_facture for update;
  if not found then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  v_d := private.tamila_encaisse_pour(v_f.dossier_id);
  if v_f.statut <> 'emise' then
    raise exception 'Cette facture est déjà %.', v_f.statut using errcode = '55000';
  end if;
  if p_mode is null or p_mode not in ('especes', 'cheque', 'virement', 'billet_a_ordre', 'carte') then
    raise exception 'Mode de règlement inconnu (RIN art. 11.6) : %.', coalesce(p_mode, 'vide') using errcode = '22023';
  end if;
  if p_payee_le is null or p_payee_le > (now() at time zone 'Europe/Paris')::date or p_payee_le < v_f.emise_le then
    raise exception 'Le paiement est daté entre l''émission et aujourd''hui.' using errcode = '22023';
  end if;
  update public.tamila_factures set statut = 'payee', payee_le = p_payee_le, mode_reglement = p_mode where id = p_facture;
  perform private.journaliser_module(v_d.client_id, 'tamila', 'tamila.facture.payee', 'tamila_dossier', v_d.id::text,
    jsonb_build_object('facture', p_facture, 'numero', v_f.numero, 'mode', p_mode));
end $function$;

-- Une facture émise par erreur s'annule : son numéro reste (la suite est sans trou), le temps et les
-- provisions qu'elle portait redeviennent à facturer.
create or replace function private.tamila_annuler_facture(p_facture uuid, p_motif text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_f public.tamila_factures;
  v_d public.tamila_dossiers;
begin
  select * into v_f from public.tamila_factures where id = p_facture for update;
  if not found then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  v_d := private.tamila_honoraires_gere(v_f.dossier_id);
  if v_f.statut <> 'emise' then
    raise exception 'Une facture % ne s''annule pas.', v_f.statut using errcode = '55000';
  end if;
  if p_motif is null or p_motif !~ '^[a-z][a-z_]{2,40}$' then
    raise exception 'Le motif d''une annulation est un code (erreur_montant, erreur_client, doublon…), jamais un texte libre.' using errcode = '22023';
  end if;
  update public.tamila_factures set statut = 'annulee', motif_annulation = p_motif where id = p_facture;
  update public.tamila_temps set statut = 'saisi', facture_id = null where facture_id = p_facture;
  update public.tamila_provisions set facture_id = null where facture_id = p_facture;
  perform private.journaliser_module(v_d.client_id, 'tamila', 'tamila.facture.annulee', 'tamila_dossier', v_d.id::text,
    jsonb_build_object('facture', p_facture, 'numero', v_f.numero, 'motif', p_motif));
end $function$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Le résumé du dossier, pour l'écran
-- ════════════════════════════════════════════════════════════════════════════════════════════

create or replace function private.tamila_honoraires(p_dossier uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_c public.tamila_conventions;
  v_minutes integer;
  v_a_facturer bigint := 0;
begin
  select * into v_d from public.tamila_dossiers where id = p_dossier;
  if not found or (v_uid is not null and not private.tamila_voit_dossier_pour(v_uid, v_d.client_id, p_dossier::text)) then
    raise exception 'Ce dossier ne vous est pas ouvert.' using errcode = '42501';
  end if;
  select * into v_c from public.tamila_conventions c where c.dossier_id = p_dossier and c.statut in ('proposee', 'signee');
  select coalesce(sum(t.minutes), 0) into v_minutes from public.tamila_temps t
   where t.dossier_id = p_dossier and t.statut = 'saisi' and t.facturable;
  if v_c.id is not null and v_c.mode in ('temps_passe', 'mixte') then
    v_a_facturer := round(v_minutes::numeric * v_c.taux_horaire_cents / 60)::bigint;
  end if;
  if v_c.id is not null and v_c.mode in ('forfait', 'mixte')
     and not exists (select 1 from public.tamila_factures f where f.dossier_id = p_dossier and f.statut <> 'annulee' and f.forfait_cents > 0) then
    v_a_facturer := v_a_facturer + v_c.forfait_cents;
  end if;
  return jsonb_build_object(
    'dossier', p_dossier,
    'convention', case when v_c.id is null then null else to_jsonb(v_c) end,
    -- Ouvert depuis plus de quinze jours sans convention signée (ni urgence) : l'écran le signale (loi 1971 art. 10).
    'sans_convention', v_d.statut in ('ouvert', 'audit') and (v_c.id is null or (v_c.statut <> 'signee' and not v_c.urgence))
                       and coalesce(v_d.ouvert_le, v_d.cree_le) < now() - interval '15 days',
    'minutes_a_facturer', v_minutes,
    'a_facturer_ht_cents', v_a_facturer,
    'provisions_recues_non_imputees_cents', (select coalesce(sum(p.montant_ttc_cents), 0) from public.tamila_provisions p
                                             where p.dossier_id = p_dossier and p.statut = 'recue' and p.facture_id is null),
    'provisions_demandees_cents', (select coalesce(sum(p.montant_ttc_cents), 0) from public.tamila_provisions p
                                   where p.dossier_id = p_dossier and p.statut = 'demandee'),
    'facture_ttc_cents', (select coalesce(sum(f.total_ttc_cents), 0) from public.tamila_factures f
                          where f.dossier_id = p_dossier and f.statut <> 'annulee'),
    'reste_du_cents', (select coalesce(sum(f.reste_du_cents), 0) from public.tamila_factures f
                       where f.dossier_id = p_dossier and f.statut = 'emise'));
end $function$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Les portes publiques et les droits
-- ════════════════════════════════════════════════════════════════════════════════════════════

create or replace function public.tamila_poser_convention(p_dossier uuid, p_mode text, p_taux_horaire_cents integer default null,
                                                          p_forfait_cents bigint default null, p_complement_pct numeric default null,
                                                          p_taux_tva numeric default 20, p_urgence boolean default false) returns uuid
language sql set search_path to '' as $function$
  select private.tamila_poser_convention(p_dossier, p_mode, p_taux_horaire_cents, p_forfait_cents, p_complement_pct, p_taux_tva, p_urgence) $function$;
create or replace function public.tamila_signer_convention(p_convention uuid, p_signee_le date, p_piece uuid default null) returns void
language sql set search_path to '' as $function$ select private.tamila_signer_convention(p_convention, p_signee_le, p_piece) $function$;
create or replace function public.tamila_saisir_temps(p_dossier uuid, p_jour date, p_minutes integer, p_nature text,
                                                      p_description bytea default null, p_facturable boolean default true) returns uuid
language sql set search_path to '' as $function$
  select private.tamila_saisir_temps(p_dossier, p_jour, p_minutes, p_nature, p_description, p_facturable) $function$;
create or replace function public.tamila_annuler_temps(p_temps uuid) returns void
language sql set search_path to '' as $function$ select private.tamila_annuler_temps(p_temps) $function$;
create or replace function public.tamila_demander_provision(p_dossier uuid, p_montant_ttc_cents bigint, p_le date default null) returns uuid
language sql set search_path to '' as $function$ select private.tamila_demander_provision(p_dossier, p_montant_ttc_cents, p_le) $function$;
create or replace function public.tamila_provision_recue(p_provision uuid, p_recue_le date, p_mode text) returns void
language sql set search_path to '' as $function$ select private.tamila_provision_recue(p_provision, p_recue_le, p_mode) $function$;
create or replace function public.tamila_emettre_facture(p_dossier uuid, p_jusqu_au date default null, p_debours_cents bigint default 0,
                                                         p_definitif boolean default false) returns jsonb
language sql set search_path to '' as $function$ select private.tamila_emettre_facture(p_dossier, p_jusqu_au, p_debours_cents, p_definitif) $function$;
create or replace function public.tamila_facture_payee(p_facture uuid, p_payee_le date, p_mode text) returns void
language sql set search_path to '' as $function$ select private.tamila_facture_payee(p_facture, p_payee_le, p_mode) $function$;
create or replace function public.tamila_annuler_facture(p_facture uuid, p_motif text) returns void
language sql set search_path to '' as $function$ select private.tamila_annuler_facture(p_facture, p_motif) $function$;
create or replace function public.tamila_honoraires(p_dossier uuid) returns jsonb
language sql stable set search_path to '' as $function$ select private.tamila_honoraires(p_dossier) $function$;

do $grants$
declare f text;
begin
  -- Les outils : appelés seulement par les fonctions security definer ci-dessous.
  foreach f in array array['private.tamila_honoraires_gere(uuid)', 'private.tamila_encaisse_pour(uuid)'] loop
    execute format('revoke execute on function %s from public', f);
  end loop;
  -- Les portes, ouvertes aux personnes connectées (la porte vérifie le reste) et au serveur.
  foreach f in array array[
    'tamila_poser_convention(uuid, text, integer, bigint, numeric, numeric, boolean)',
    'tamila_signer_convention(uuid, date, uuid)',
    'tamila_saisir_temps(uuid, date, integer, text, bytea, boolean)',
    'tamila_annuler_temps(uuid)',
    'tamila_demander_provision(uuid, bigint, date)',
    'tamila_provision_recue(uuid, date, text)',
    'tamila_emettre_facture(uuid, date, bigint, boolean)',
    'tamila_facture_payee(uuid, date, text)',
    'tamila_annuler_facture(uuid, text)',
    'tamila_honoraires(uuid)'] loop
    execute format('revoke execute on function private.%s from public', f);
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function private.%s to authenticated, service_role', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end $grants$;
