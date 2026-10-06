-- c2_01 — CASHD, palier 1 : les données de la relance (session C2, 06/10/2026).
--
-- CE QUE ÇA POSE. CASHD relance les impayés des clients de nos clients. Avant d'écrire la moindre relance, il faut savoir
-- qui doit quoi : les comptes clients (débiteurs), leurs factures, avoirs et devis, les règlements reçus et leur lettrage.
--   · cashd_reglages : CASHD installé pour une organisation (mode essai d'abord), délai de paiement par défaut, taux de
--     pénalités, indemnité forfaitaire, seuil de relance.
--   · cashd_comptes : un compte par client débiteur et par entité (deux filiales du même groupe client = deux comptes,
--     reliés par « groupe ») ; contact de facturation et contact commercial séparés ; plafond d'encours ; statut
--     (actif, pause, litige, recouvrement, hors périmètre, attente de contact) avec son motif.
--   · cashd_factures : factures, acomptes, avoirs et devis ; échéance (30 jours à défaut, L441-10) ; le « reste dû » lu
--     dans l'export du facturier, quand il le donne.
--   · cashd_reglements et cashd_imputations : les encaissements et le lettrage simple (un règlement soldant une ou
--     plusieurs factures, partiellement ou non ; un avoir imputé sur une facture). Une imputation ne s'efface pas :
--     elle s'annule, avec son motif.
--   · vues security_invoker : cashd_factures_etat (réglé, reste dû, retard, tranche), cashd_reglements_etat (imputé,
--     reste à imputer), cashd_balance_agee (l'encours de chaque compte par tranche d'ancienneté).
--   · deux voies d'entrée, qui finissent dans la même fonction (private.cashd_integrer) :
--       1. l'export du facturier relu chaque matin par la chaîne de relevés du socle : modèle `modeles_jeux` cashd /
--          tableur (factures, règlements, devis, clients ; CSV ou XLSX lus par le lecteur d'exports d'A1), branchement
--          par cashd_brancher, dépôt par cashd_deposer_export, application par le travail cashd.appliquer_releve
--          (abonnement releve.pret.cashd, cron cashd-releves) ;
--       2. le dépôt depuis l'écran (CSV lu dans le navigateur, en-têtes rapprochés avec le même modèle) :
--          cashd_importer ; et la saisie à la main : cashd_ecrire_compte, cashd_ecrire_facture.
--   · lettrage : cashd_noter_reglement (lettre seul quand la facture est nommée ou citée dans la référence, ou quand une
--     seule facture ouverte du compte a exactement ce montant), cashd_lettrer, cashd_imputer_avoir,
--     cashd_annuler_imputation, cashd_propositions (les factures probables d'un virement sans référence).
--   · lecture d'un appel : cashd_tableau (encours échu au total, balance âgée, à imputer), cashd_fiche_compte.
--
-- Droits : lecture sous RLS (organisation + entité) ; écriture par les portes seules, réservées au gérant, à
-- l'administrateur et à qui porte le droit « cashd.gerer », ou au serveur d'Omega. Journal : private.journaliser_module.
--
-- Règles de pose : create … if not exists / create or replace / on conflict do nothing ; jamais de DROP ni de DELETE.
-- Chaque table : RLS, revoke all d'anon et authenticated, puis les grants voulus. Chaque fonction privée nouvelle :
-- revoke execute de public (aucune n'est appelée par une politique ni par une vue).

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Les tables
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.cashd_reglages (
  client_id uuid primary key references public.clients(id) on delete cascade,
  mode text not null default 'essai',
  delai_paiement_jours smallint not null default 30,
  taux_penalites numeric(6,4),
  indemnite_forfaitaire numeric(8,2) not null default 40,
  seuil_relance numeric(14,2) not null default 0,
  devise text not null default 'EUR',
  installe_le timestamptz not null default now(),
  installe_par uuid,
  maj_le timestamptz not null default now(),
  constraint cashd_reglages_mode_check check (mode in ('essai', 'reel')),
  constraint cashd_reglages_delai_check check (delai_paiement_jours between 0 and 60),
  constraint cashd_reglages_taux_check check (taux_penalites is null or (taux_penalites >= 0 and taux_penalites <= 1)),
  constraint cashd_reglages_indemnite_check check (indemnite_forfaitaire >= 0),
  constraint cashd_reglages_seuil_check check (seuil_relance >= 0),
  constraint cashd_reglages_devise_check check (devise ~ '^[A-Z]{3}$')
);

create table if not exists public.cashd_comptes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  reference text not null,
  nom text not null,
  groupe text,
  siren text,
  pays text not null default 'FR',
  langue text not null default 'fr',
  devise text not null default 'EUR',
  contact_facturation_nom text,
  contact_facturation_email text,
  contact_facturation_telephone text,
  contact_commercial_nom text,
  contact_commercial_email text,
  commercial_id uuid,
  delai_paiement_jours smallint,
  plafond_encours numeric(14,2),
  reciproque boolean not null default false,
  statut text not null default 'actif',
  statut_motif text,
  statut_le timestamptz,
  statut_par uuid,
  source text not null default 'saisie',
  vu_le timestamptz,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint cashd_comptes_client_id_id_key unique (client_id, id),
  constraint cashd_comptes_une_reference unique (client_id, entite_id, reference),
  constraint cashd_comptes_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id),
  constraint cashd_comptes_reference_check check (char_length(btrim(reference)) between 1 and 80),
  constraint cashd_comptes_nom_check check (char_length(btrim(nom)) between 1 and 200),
  constraint cashd_comptes_groupe_check check (char_length(groupe) <= 200),
  constraint cashd_comptes_siren_check check (siren ~ '^[0-9]{9}$'),
  constraint cashd_comptes_pays_check check (pays ~ '^[A-Z]{2}$'),
  constraint cashd_comptes_langue_check check (langue ~ '^[a-z]{2}$'),
  constraint cashd_comptes_devise_check check (devise ~ '^[A-Z]{3}$'),
  constraint cashd_comptes_emails_check check (
    (contact_facturation_email is null or contact_facturation_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
    and (contact_commercial_email is null or contact_commercial_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  constraint cashd_comptes_textes_check check (
    char_length(contact_facturation_nom) <= 200 and char_length(contact_commercial_nom) <= 200
    and char_length(contact_facturation_telephone) <= 40 and char_length(statut_motif) <= 500),
  constraint cashd_comptes_delai_check check (delai_paiement_jours between 0 and 60),
  constraint cashd_comptes_plafond_check check (plafond_encours is null or plafond_encours >= 0),
  constraint cashd_comptes_statut_check check (statut in ('actif', 'pause', 'litige', 'recouvrement', 'hors_perimetre', 'attente_contact')),
  constraint cashd_comptes_source_check check (source in ('saisie', 'export', 'import'))
);
create index if not exists cashd_comptes_client_idx on public.cashd_comptes (client_id, entite_id, nom);

create table if not exists public.cashd_factures (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  compte_id uuid not null,
  nature text not null default 'facture',
  numero text not null,
  date_emission date not null,
  echeance date,
  montant_ht numeric(14,2),
  montant_ttc numeric(14,2) not null,
  devise text not null default 'EUR',
  reste_du_source numeric(14,2),
  statut text not null default 'ouverte',
  statut_motif text,
  statut_le timestamptz,
  commande_ref text,
  source text not null default 'saisie',
  vue_le timestamptz,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint cashd_factures_client_id_id_key unique (client_id, id),
  constraint cashd_factures_un_numero unique (client_id, entite_id, nature, numero),
  constraint cashd_factures_compte_fkey foreign key (client_id, compte_id) references public.cashd_comptes(client_id, id),
  constraint cashd_factures_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id),
  constraint cashd_factures_nature_check check (nature in ('facture', 'acompte', 'avoir', 'devis')),
  constraint cashd_factures_numero_check check (char_length(btrim(numero)) between 1 and 80),
  constraint cashd_factures_montant_check check (montant_ttc >= 0 and (montant_ht is null or montant_ht >= 0)),
  constraint cashd_factures_reste_check check (reste_du_source is null or reste_du_source >= 0),
  constraint cashd_factures_echeance_check check (echeance is null or echeance >= date_emission),
  constraint cashd_factures_devise_check check (devise ~ '^[A-Z]{3}$'),
  constraint cashd_factures_statut_check check (
    (nature = 'devis' and statut in ('en_attente', 'accepte', 'refuse', 'expire'))
    or (nature <> 'devis' and statut in ('ouverte', 'soldee', 'litige', 'annulee', 'abandonnee'))),
  constraint cashd_factures_motif_check check (char_length(statut_motif) <= 500),
  constraint cashd_factures_commande_check check (char_length(commande_ref) <= 80),
  constraint cashd_factures_source_check check (source in ('saisie', 'export', 'import'))
);
create index if not exists cashd_factures_compte_idx on public.cashd_factures (compte_id, statut, echeance);
create index if not exists cashd_factures_client_idx on public.cashd_factures (client_id, statut, echeance);

create table if not exists public.cashd_reglements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  compte_id uuid,
  recu_le date not null,
  montant numeric(14,2) not null,
  devise text not null default 'EUR',
  mode text,
  reference text,
  libelle text,
  facture_citee text,
  source text not null default 'saisie',
  source_cle text,
  statut text not null default 'actif',
  annule_motif text,
  annule_le timestamptz,
  note_par uuid,
  cree_le timestamptz not null default now(),
  constraint cashd_reglements_client_id_id_key unique (client_id, id),
  constraint cashd_reglements_une_source unique (client_id, entite_id, source_cle),
  constraint cashd_reglements_compte_fkey foreign key (client_id, compte_id) references public.cashd_comptes(client_id, id),
  constraint cashd_reglements_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id),
  constraint cashd_reglements_montant_check check (montant > 0),
  constraint cashd_reglements_devise_check check (devise ~ '^[A-Z]{3}$'),
  constraint cashd_reglements_mode_check check (mode in ('virement', 'prelevement', 'cheque', 'carte', 'especes', 'compensation', 'lien_paiement', 'autre')),
  constraint cashd_reglements_textes_check check (char_length(reference) <= 140 and char_length(libelle) <= 300 and char_length(facture_citee) <= 80
                                                  and char_length(source_cle) <= 300 and char_length(annule_motif) <= 500),
  constraint cashd_reglements_source_check check (source in ('saisie', 'export', 'import')),
  constraint cashd_reglements_statut_check check (statut in ('actif', 'annule'))
);
create index if not exists cashd_reglements_compte_idx on public.cashd_reglements (client_id, compte_id, recu_le);

create table if not exists public.cashd_imputations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  facture_id uuid not null,
  reglement_id uuid,
  avoir_id uuid,
  montant numeric(14,2) not null,
  auto boolean not null default false,
  motif text,
  par uuid,
  cree_le timestamptz not null default now(),
  annulee_le timestamptz,
  annulee_par uuid,
  annulee_motif text,
  constraint cashd_imputations_client_id_id_key unique (client_id, id),
  constraint cashd_imputations_facture_fkey foreign key (client_id, facture_id) references public.cashd_factures(client_id, id),
  constraint cashd_imputations_reglement_fkey foreign key (client_id, reglement_id) references public.cashd_reglements(client_id, id),
  constraint cashd_imputations_avoir_fkey foreign key (client_id, avoir_id) references public.cashd_factures(client_id, id),
  constraint cashd_imputations_une_origine check ((reglement_id is null) <> (avoir_id is null)),
  constraint cashd_imputations_montant_check check (montant > 0),
  constraint cashd_imputations_textes_check check (char_length(motif) <= 300 and char_length(annulee_motif) <= 500)
);
create index if not exists cashd_imputations_facture_idx on public.cashd_imputations (facture_id) where annulee_le is null;
create index if not exists cashd_imputations_reglement_idx on public.cashd_imputations (reglement_id) where annulee_le is null;
create index if not exists cashd_imputations_avoir_idx on public.cashd_imputations (avoir_id) where annulee_le is null;

-- RLS : un membre lit ce qui relève de son organisation et de son périmètre d'entités. Rien ne s'écrit en direct.
alter table public.cashd_reglages enable row level security;
alter table public.cashd_comptes enable row level security;
alter table public.cashd_factures enable row level security;
alter table public.cashd_reglements enable row level security;
alter table public.cashd_imputations enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cashd_reglages' and policyname = 'les membres lisent les reglages cashd') then
    create policy "les membres lisent les reglages cashd" on public.cashd_reglages for select to authenticated
      using (client_id in (select private.mes_clients()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cashd_comptes' and policyname = 'les membres lisent les comptes de leur perimetre') then
    create policy "les membres lisent les comptes de leur perimetre" on public.cashd_comptes for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cashd_factures' and policyname = 'les membres lisent les factures de leur perimetre') then
    create policy "les membres lisent les factures de leur perimetre" on public.cashd_factures for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cashd_reglements' and policyname = 'les membres lisent les reglements de leur perimetre') then
    create policy "les membres lisent les reglements de leur perimetre" on public.cashd_reglements for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cashd_imputations' and policyname = 'les membres lisent les imputations des factures qu''ils voient') then
    create policy "les membres lisent les imputations des factures qu'ils voient" on public.cashd_imputations for select to authenticated
      using (client_id in (select private.mes_clients())
             and exists (select 1 from public.cashd_factures f where f.id = cashd_imputations.facture_id));
  end if;
end $do$;
revoke all on table public.cashd_reglages, public.cashd_comptes, public.cashd_factures, public.cashd_reglements, public.cashd_imputations
  from anon, authenticated;
grant select on table public.cashd_reglages, public.cashd_comptes, public.cashd_factures, public.cashd_reglements, public.cashd_imputations
  to authenticated;

do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom)
               select x from unnest(array['cashd_reglages', 'cashd_comptes', 'cashd_factures', 'cashd_reglements', 'cashd_imputations']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Les vues (sous les droits de qui lit)
-- ═══════════════════════════════════════════════════════════════════════════

-- Une facture et son état : réglé, avoirs imputés, reste dû, retard, tranche d'ancienneté. Le reste dû est le plus
-- petit du calcul (TTC − imputations) et du reste dû lu dans l'export du facturier : un règlement que le facturier
-- connaît déjà sort la facture de la liste, même avant que son encaissement soit noté ici.
create or replace view public.cashd_factures_etat with (security_invoker = true) as
with i as (
  select x.facture_id,
         coalesce(sum(x.montant) filter (where x.reglement_id is not null), 0) as regle,
         coalesce(sum(x.montant) filter (where x.avoir_id is not null), 0) as avoirs_imputes,
         max(r.recu_le) as dernier_reglement_le
  from public.cashd_imputations x
  left join public.cashd_reglements r on r.id = x.reglement_id
  where x.annulee_le is null
  group by x.facture_id
), a as (
  select x.avoir_id, coalesce(sum(x.montant), 0) as impute
  from public.cashd_imputations x where x.annulee_le is null and x.avoir_id is not null group by x.avoir_id
), j as (select (now() at time zone 'Europe/Paris')::date as jour),
b as (
  select f.*, coalesce(i.regle, 0) as regle, coalesce(i.avoirs_imputes, 0) as avoirs_imputes, i.dernier_reglement_le,
         case
           when f.nature = 'avoir' then greatest(f.montant_ttc - coalesce(a.impute, 0), 0)
           when f.nature = 'devis' or f.statut in ('soldee', 'annulee', 'abandonnee') then 0
           else greatest(least(f.montant_ttc - coalesce(i.regle, 0) - coalesce(i.avoirs_imputes, 0), coalesce(f.reste_du_source, f.montant_ttc)), 0)
         end::numeric(14,2) as reste_du,
         j.jour
  from public.cashd_factures f cross join j
  left join i on i.facture_id = f.id
  left join a on a.avoir_id = f.id
)
select b.id, b.client_id, b.entite_id, b.compte_id, b.nature, b.numero, b.date_emission, b.echeance, b.montant_ht, b.montant_ttc,
       b.devise, b.reste_du_source, b.statut, b.statut_motif, b.statut_le, b.commande_ref, b.source, b.vue_le, b.cree_le, b.maj_le,
       b.regle, b.avoirs_imputes, b.dernier_reglement_le, b.reste_du,
       (b.jour - b.date_emission) as jours_ecoules,
       case when b.nature in ('facture', 'acompte') and b.reste_du > 0 and b.echeance < b.jour then b.jour - b.echeance else 0 end as retard_jours,
       case when b.nature not in ('facture', 'acompte') or b.reste_du <= 0 then null
            when b.echeance is null or b.echeance >= b.jour then 'non_echu'
            when b.jour - b.echeance <= 30 then '1_30'
            when b.jour - b.echeance <= 60 then '31_60'
            when b.jour - b.echeance <= 90 then '61_90'
            else 'plus_90' end as tranche,
       (b.echeance - b.date_emission) as delai_jours
from b;

-- Un règlement : ce qui en est imputé, ce qui reste à imputer.
create or replace view public.cashd_reglements_etat with (security_invoker = true) as
select r.*,
       coalesce((select sum(x.montant) from public.cashd_imputations x where x.reglement_id = r.id and x.annulee_le is null), 0)::numeric(14,2) as impute,
       case when r.statut = 'annule' then 0
            else greatest(r.montant - coalesce((select sum(x.montant) from public.cashd_imputations x where x.reglement_id = r.id and x.annulee_le is null), 0), 0)
       end::numeric(14,2) as a_imputer
from public.cashd_reglements r;

-- La balance âgée : l'encours de chaque compte par tranche d'ancienneté du retard. Les avoirs non imputés et les
-- règlements non lettrés du compte sont déduits du solde (crédits), pas des tranches.
create or replace view public.cashd_balance_agee with (security_invoker = true) as
select c.id as compte_id, c.client_id, c.entite_id, c.reference, c.nom, c.groupe, c.statut, c.plafond_encours, c.devise,
       coalesce(sum(f.reste_du) filter (where f.tranche = 'non_echu' and f.statut <> 'litige'), 0)::numeric(14,2) as non_echu,
       coalesce(sum(f.reste_du) filter (where f.tranche = '1_30' and f.statut <> 'litige'), 0)::numeric(14,2) as echu_1_30,
       coalesce(sum(f.reste_du) filter (where f.tranche = '31_60' and f.statut <> 'litige'), 0)::numeric(14,2) as echu_31_60,
       coalesce(sum(f.reste_du) filter (where f.tranche = '61_90' and f.statut <> 'litige'), 0)::numeric(14,2) as echu_61_90,
       coalesce(sum(f.reste_du) filter (where f.tranche = 'plus_90' and f.statut <> 'litige'), 0)::numeric(14,2) as echu_plus_90,
       coalesce(sum(f.reste_du) filter (where f.tranche is not null and f.tranche <> 'non_echu' and f.statut <> 'litige'), 0)::numeric(14,2) as echu,
       coalesce(sum(f.reste_du) filter (where f.statut = 'litige'), 0)::numeric(14,2) as en_litige,
       coalesce(sum(f.reste_du) filter (where f.tranche is not null), 0)::numeric(14,2) as encours,
       (coalesce((select sum(a.reste_du) from public.cashd_factures_etat a where a.compte_id = c.id and a.nature = 'avoir' and a.statut = 'ouverte'), 0)
        + coalesce((select sum(r.a_imputer) from public.cashd_reglements_etat r where r.compte_id = c.id), 0))::numeric(14,2) as credits,
       count(f.id) filter (where f.tranche is not null)::integer as factures_ouvertes,
       count(f.id) filter (where f.retard_jours > 0)::integer as factures_echues,
       coalesce(max(f.retard_jours), 0)::integer as retard_max_jours,
       min(f.echeance) filter (where f.retard_jours > 0) as plus_ancienne_echeance
from public.cashd_comptes c
left join public.cashd_factures_etat f on f.compte_id = c.id and f.nature in ('facture', 'acompte')
group by c.id;

revoke all on table public.cashd_factures_etat, public.cashd_reglements_etat, public.cashd_balance_agee from anon, authenticated;
grant select on table public.cashd_factures_etat, public.cashd_reglements_etat, public.cashd_balance_agee to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Les aides privées
-- ═══════════════════════════════════════════════════════════════════════════

-- Le rôle de la session quand aucun utilisateur n'est connecté (serveur d'Omega, migrations).
create or replace function private.cashd_role_session()
 returns text language sql stable set search_path to ''
as $function$ select coalesce(nullif(current_setting('role', true), 'none'), session_user::text) $function$;

-- Qui gère CASHD pour une organisation : gérant, administrateur, ou titulaire du droit « cashd.gerer » ; ou le serveur.
-- Rend l'utilisateur (null pour le serveur).
create or replace function private.cashd_exiger_gestion(p_client uuid, p_entite uuid default null)
 returns uuid language plpgsql stable security definer set search_path to ''
as $function$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    if private.cashd_role_session() in ('service_role', 'postgres') then
      return null;
    end if;
    raise exception 'Seuls le gérant, un administrateur ou un membre chargé du recouvrement règlent CASHD.' using errcode = '42501';
  end if;
  if not (private.a_un_role(p_client, array['gerant', 'admin']) or private.a_le_droit(p_client, 'cashd.gerer'))
     or (p_entite is not null and not private.voit_entite(p_client, p_entite)) then
    raise exception 'Seuls le gérant, un administrateur ou un membre chargé du recouvrement règlent CASHD.' using errcode = '42501';
  end if;
  return v_uid;
end $function$;

-- L'entité visée, ou l'entité principale de l'organisation.
create or replace function private.cashd_entite(p_client uuid, p_entite uuid)
 returns uuid language plpgsql stable security definer set search_path to ''
as $function$
declare v uuid;
begin
  if p_entite is not null then
    select e.id into v from public.entites e where e.client_id = p_client and e.id = p_entite;
    if v is null then
      raise exception 'Entité introuvable pour cette organisation.' using errcode = 'P0002';
    end if;
    return v;
  end if;
  select e.id into v from public.entites e where e.client_id = p_client and e.principale;
  if v is null then
    raise exception 'L''organisation n''a pas d''entité principale.' using errcode = 'P0002';
  end if;
  return v;
end $function$;

create or replace function private.cashd_exiger_installe(p_client uuid)
 returns public.cashd_reglages language plpgsql stable security definer set search_path to ''
as $function$
declare r public.cashd_reglages;
begin
  select * into r from public.cashd_reglages where client_id = p_client;
  if not found then
    raise exception 'CASHD n''est pas installé pour cette organisation.' using errcode = '55000';
  end if;
  return r;
end $function$;

-- Une valeur texte d'une ligne d'export (vide = null).
create or replace function private.cashd_v(p jsonb, p_cle text)
 returns text language sql immutable set search_path to ''
as $function$
  select case
    when p is null or not (p ? p_cle) or jsonb_typeof(p -> p_cle) = 'null' then null
    when jsonb_typeof(p -> p_cle) = 'string' then nullif(btrim(p ->> p_cle), '')
    else p ->> p_cle end
$function$;

-- Un montant lu tel qu'un facturier l'écrit : « 1 234,56 », « 1.234,56 », « 1,234.56 », « 1234.56 € », « (12,00) »,
-- « 12,00- ». Null s'il est illisible.
create or replace function private.cashd_nombre(p text)
 returns numeric language plpgsql immutable set search_path to ''
as $function$
declare
  s text;
  v_neg boolean := false;
  v_dec text;
begin
  if p is null then return null; end if;
  s := regexp_replace(translate(p, chr(160) || chr(8239), '  '), '[[:space:]€$£]|EUR|USD|GBP|CHF', '', 'g');
  if s = '' then return null; end if;
  if s ~ '^\(.*\)$' then v_neg := true; s := substr(s, 2, length(s) - 2); end if;
  if s ~ '-$' then v_neg := true; s := left(s, -1); end if;
  if s ~ '^-' then v_neg := not v_neg; s := substr(s, 2); end if;
  if s ~ '^\+' then s := substr(s, 2); end if;
  if s !~ '^[0-9.,'']+$' or s !~ '[0-9]' then return null; end if;
  s := replace(s, '''', '');
  -- Le dernier séparateur est le décimal s'il est suivi d'un à deux chiffres (ou de trois quand l'autre séparateur est
  -- aussi présent) ; les autres séparateurs sont des milliers.
  if s ~ '[.,]' then
    v_dec := substring(s from '([.,])[0-9]*$');
    if s ~ ('\' || v_dec || '[0-9]{1,2}$') or (s ~ '[.]' and s ~ '[,]') or s ~ ('^[0-9]+\' || v_dec || '[0-9]{4,}$') then
      s := replace(replace(s, case v_dec when '.' then ',' else '.' end, ''), v_dec, '.');
      if (length(s) - length(replace(s, '.', ''))) > 1 then return null; end if;
    else
      s := replace(replace(s, '.', ''), ',', '');
    end if;
  end if;
  if s !~ '^[0-9]*\.?[0-9]+$' and s !~ '^[0-9]+\.?$' then return null; end if;
  return case when v_neg then -(s::numeric) else s::numeric end;
end $function$;

-- Une date lue telle qu'un facturier l'écrit : AAAA-MM-JJ (avec ou sans heure), JJ/MM/AAAA, JJ/MM/AA, JJ.MM.AAAA,
-- JJ-MM-AAAA, ou un numéro de série de tableur (jours depuis le 30/12/1899). Null si illisible.
create or replace function private.cashd_date(p text)
 returns date language plpgsql immutable set search_path to ''
as $function$
declare m text[]; a integer;
begin
  if p is null or btrim(p) = '' then return null; end if;
  m := regexp_match(btrim(p), '^([0-9]{4})-([0-9]{2})-([0-9]{2})');
  if m is null then
    m := regexp_match(btrim(p), '^([0-9]{1,2})[/.-]([0-9]{1,2})[/.-]([0-9]{2,4})');
    if m is not null then
      a := m[3]::integer;
      if length(m[3]) = 2 then a := 2000 + a; end if;
      m := array[a::text, m[2], m[1]];
    end if;
  end if;
  if m is null and btrim(p) ~ '^[0-9]{5}([.,][0-9]+)?$' then
    return date '1899-12-30' + floor(replace(btrim(p), ',', '.')::numeric)::integer;
  end if;
  if m is null then return null; end if;
  begin
    return make_date(m[1]::integer, m[2]::integer, m[3]::integer);
  exception when others then
    return null;
  end;
end $function$;

-- La nature d'une pièce lue (« Facture », « Avoir », « FA », « AV », « Acompte »…).
create or replace function private.cashd_nature(p text, p_montant numeric default null)
 returns text language sql immutable set search_path to ''
as $function$
  select case
    when p is null then case when p_montant < 0 then 'avoir' else 'facture' end
    when lower(p) ~ '(avoir|credit|crédit|^av$|^a$|^nc|note de cr)' then 'avoir'
    when lower(p) ~ '(acompte|^ac$|^aco?$)' then 'acompte'
    when lower(p) ~ '(devis|^dv$|^d$|proposition|offre)' then 'devis'
    else 'facture' end
$function$;

-- Un mode de règlement lu (« VIR », « Chèque », « CB », « PRLV »…).
create or replace function private.cashd_mode(p text)
 returns text language sql immutable set search_path to ''
as $function$
  select case
    when p is null then null
    when lower(p) ~ '(vir|transfer|sepa ct)' then 'virement'
    when lower(p) ~ '(prl|prel|prél|sdd|direct debit)' then 'prelevement'
    when lower(p) ~ '(ch[eè]q|chq)' then 'cheque'
    when lower(p) ~ '(cb|carte|card|stripe|tpe)' then 'carte'
    when lower(p) ~ '(esp|cash|liquide)' then 'especes'
    when lower(p) ~ '(compens)' then 'compensation'
    when lower(p) ~ '(lien|link)' then 'lien_paiement'
    else 'autre' end
$function$;

-- Le statut d'un devis lu (« Accepté », « Signé », « Refusé », « Perdu », « Expiré »…).
create or replace function private.cashd_statut_devis(p text)
 returns text language sql immutable set search_path to ''
as $function$
  select case
    when p is null then null
    when lower(p) ~ '(accept|sign|gagn|valid|command)' then 'accepte'
    when lower(p) ~ '(refus|perdu|annul|abandon)' then 'refuse'
    when lower(p) ~ '(expir|caduc|périm|perim)' then 'expire'
    else 'en_attente' end
$function$;

-- Le reste dû d'une facture et ce qu'un avoir peut encore imputer (sous verrou, par les portes).
create or replace function private.cashd_reste(p_facture uuid)
 returns numeric language sql stable security definer set search_path to ''
as $function$
  select round(case
    when f.nature = 'avoir' then greatest(f.montant_ttc - coalesce((select sum(x.montant) from public.cashd_imputations x where x.avoir_id = f.id and x.annulee_le is null), 0), 0)
    when f.nature = 'devis' or f.statut in ('soldee', 'annulee', 'abandonnee') then 0
    else greatest(least(f.montant_ttc - coalesce((select sum(x.montant) from public.cashd_imputations x where x.facture_id = f.id and x.annulee_le is null), 0),
                        coalesce(f.reste_du_source, f.montant_ttc)), 0) end, 2)
  from public.cashd_factures f where f.id = p_facture
$function$;

create or replace function private.cashd_a_imputer(p_reglement uuid)
 returns numeric language sql stable security definer set search_path to ''
as $function$
  select round(case when r.statut = 'annule' then 0
              else greatest(r.montant - coalesce((select sum(x.montant) from public.cashd_imputations x where x.reglement_id = r.id and x.annulee_le is null), 0), 0) end, 2)
  from public.cashd_reglements r where r.id = p_reglement
$function$;

-- Une facture entièrement réglée passe « soldée » ; une facture soldée par le lettrage qui retrouve un reste (imputation
-- annulée) redevient « ouverte ». Le litige, l'annulation et l'abandon ne bougent pas ici.
create or replace function private.cashd_suivre_solde(p_facture uuid)
 returns text language plpgsql security definer set search_path to ''
as $function$
declare f public.cashd_factures; v_reste numeric; v_brut numeric;
begin
  select * into f from public.cashd_factures where id = p_facture;
  if not found or f.nature in ('devis', 'avoir') then
    if found and f.nature = 'avoir' then
      v_reste := private.cashd_reste(f.id);
      if v_reste <= 0.005 and f.statut = 'ouverte' then
        update public.cashd_factures set statut = 'soldee', statut_motif = 'avoir entièrement imputé', statut_le = now(), maj_le = now() where id = f.id;
        return 'soldee';
      elsif v_reste > 0.005 and f.statut = 'soldee' then
        update public.cashd_factures set statut = 'ouverte', statut_motif = null, statut_le = now(), maj_le = now() where id = f.id;
        return 'ouverte';
      end if;
    end if;
    return f.statut;
  end if;
  v_brut := f.montant_ttc - coalesce((select sum(x.montant) from public.cashd_imputations x where x.facture_id = f.id and x.annulee_le is null), 0);
  if f.statut = 'ouverte' and v_brut <= 0.005 then
    update public.cashd_factures set statut = 'soldee', statut_motif = 'réglée (lettrage)', statut_le = now(), maj_le = now() where id = f.id;
    return 'soldee';
  elsif f.statut = 'soldee' and f.statut_motif = 'réglée (lettrage)' and v_brut > 0.005 then
    update public.cashd_factures set statut = 'ouverte', statut_motif = null, statut_le = now(), maj_le = now() where id = f.id;
    return 'ouverte';
  end if;
  return f.statut;
end $function$;

-- Imputer (sous verrou) : jamais au-delà du reste dû de la facture ni du reste à imputer du règlement ou de l'avoir.
create or replace function private.cashd_imputer(p_facture uuid, p_reglement uuid, p_avoir uuid, p_montant numeric, p_auto boolean, p_motif text default null)
 returns uuid language plpgsql security definer set search_path to ''
as $function$
declare
  f public.cashd_factures;
  v_dispo numeric;
  v_reste numeric;
  v_montant numeric;
  v_id uuid;
  v_client uuid;
  v_compte uuid;
  v_entite uuid;
begin
  select * into f from public.cashd_factures where id = p_facture for update;
  if not found then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  if f.nature not in ('facture', 'acompte') then
    raise exception 'On n''impute que sur une facture ou un acompte (ici : %).', f.nature using errcode = '23514';
  end if;
  if f.statut in ('annulee', 'abandonnee') then
    raise exception 'Cette facture est %, rien ne s''y impute.', case f.statut when 'annulee' then 'annulée' else 'abandonnée' end using errcode = '23514';
  end if;
  if p_reglement is not null then
    select r.client_id, r.compte_id, r.entite_id into v_client, v_compte, v_entite from public.cashd_reglements r where r.id = p_reglement for update;
    if v_client is null then
      raise exception 'Règlement introuvable.' using errcode = 'P0002';
    end if;
    if (select r.statut from public.cashd_reglements r where r.id = p_reglement) = 'annule' then
      raise exception 'Ce règlement est annulé.' using errcode = '23514';
    end if;
    v_dispo := private.cashd_a_imputer(p_reglement);
  else
    select a.client_id, a.compte_id, a.entite_id into v_client, v_compte, v_entite from public.cashd_factures a where a.id = p_avoir and a.nature = 'avoir' for update;
    if v_client is null then
      raise exception 'Avoir introuvable.' using errcode = 'P0002';
    end if;
    v_dispo := private.cashd_reste(p_avoir);
  end if;
  if v_client <> f.client_id or v_entite <> f.entite_id then
    raise exception 'Le règlement et la facture n''appartiennent pas à la même entité.' using errcode = '23514';
  end if;
  if v_compte is not null and v_compte <> f.compte_id then
    raise exception 'Ce règlement vient d''un autre compte client que celui de la facture.' using errcode = '23514';
  end if;
  -- Le reste brut (TTC − imputations), qu'une facture soldée par l'export peut encore recevoir.
  v_reste := greatest(f.montant_ttc - coalesce((select sum(x.montant) from public.cashd_imputations x where x.facture_id = f.id and x.annulee_le is null), 0), 0);
  v_montant := round(coalesce(p_montant, least(v_dispo, v_reste)), 2);
  if v_montant <= 0 then
    raise exception 'Rien à imputer : % € disponibles, % € restant dus.', v_dispo, v_reste using errcode = '23514';
  end if;
  if v_montant > v_dispo + 0.005 then
    raise exception 'L''imputation (% €) dépasse ce qui reste à imputer (% €).', v_montant, v_dispo using errcode = '23514';
  end if;
  if v_montant > v_reste + 0.005 then
    raise exception 'L''imputation (% €) dépasse le reste dû de la facture % (% €).', v_montant, f.numero, v_reste using errcode = '23514';
  end if;
  insert into public.cashd_imputations (client_id, facture_id, reglement_id, avoir_id, montant, auto, motif, par)
  values (f.client_id, f.id, p_reglement, p_avoir, v_montant, coalesce(p_auto, false), left(p_motif, 300), (select auth.uid()))
  returning id into v_id;
  -- Un règlement sans compte prend celui de la facture qu'il solde.
  if p_reglement is not null and v_compte is null then
    update public.cashd_reglements set compte_id = f.compte_id where id = p_reglement;
  end if;
  perform private.cashd_suivre_solde(f.id);
  if p_avoir is not null then
    perform private.cashd_suivre_solde(p_avoir);
  end if;
  perform private.journaliser_module(f.client_id, 'cashd', 'cashd.imputation', 'cashd_factures', f.id::text,
    jsonb_build_object('imputation', v_id, 'facture', f.numero, 'reglement', p_reglement, 'avoir', p_avoir, 'montant', v_montant,
                       'auto', coalesce(p_auto, false), 'reste_du', private.cashd_reste(f.id)), f.entite_id);
  return v_id;
end $function$;

-- Le lettrage automatique d'un règlement : la facture qu'il nomme (numéro donné ou cité dans sa référence ou son
-- libellé), puis, à défaut, la seule facture ouverte du compte dont le reste dû est exactement son montant.
-- Rend le nombre d'imputations faites.
create or replace function private.cashd_lettrer_auto(p_reglement uuid)
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare
  r public.cashd_reglements;
  f record;
  n integer := 0;
  v_dispo numeric;
  v_texte text;
  v_ids uuid[];
begin
  select * into r from public.cashd_reglements where id = p_reglement;
  if not found or r.statut = 'annule' then
    return 0;
  end if;
  v_texte := lower(concat_ws(' ', r.facture_citee, r.reference, r.libelle));
  -- 1. Les factures citées, de la plus ancienne à la plus récente.
  for f in
    select x.id, x.numero from public.cashd_factures x
    where x.client_id = r.client_id and x.entite_id = r.entite_id and x.nature in ('facture', 'acompte')
      and x.statut in ('ouverte', 'litige', 'soldee')
      and (r.compte_id is null or x.compte_id = r.compte_id)
      and (lower(x.numero) = lower(r.facture_citee)
           or (char_length(x.numero) >= 4 and v_texte ~ ('(^|[^a-z0-9])' || regexp_replace(lower(x.numero), '([.*+?^${}()|\[\]\\])', '\\\1', 'g') || '($|[^a-z0-9])')))
    order by x.echeance nulls last, x.date_emission, x.numero
  loop
    v_dispo := private.cashd_a_imputer(r.id);
    exit when v_dispo <= 0.005;
    continue when greatest((select y.montant_ttc from public.cashd_factures y where y.id = f.id)
                           - coalesce((select sum(z.montant) from public.cashd_imputations z where z.facture_id = f.id and z.annulee_le is null), 0), 0) <= 0.005;
    perform private.cashd_imputer(f.id, r.id, null, null, true, 'numéro cité dans le règlement');
    n := n + 1;
    -- Le compte a pu être déduit de la facture : on relit.
    select * into r from public.cashd_reglements where id = p_reglement;
  end loop;
  if n > 0 or r.compte_id is null then
    return n;
  end if;
  -- 2. Une seule facture ouverte du compte au montant exact.
  select array_agg(x.id) into v_ids from public.cashd_factures x
  where x.compte_id = r.compte_id and x.nature in ('facture', 'acompte') and x.statut = 'ouverte'
    and abs(private.cashd_reste(x.id) - r.montant) < 0.005;
  if cardinality(v_ids) = 1 then
    perform private.cashd_imputer(v_ids[1], r.id, null, null, true, 'seule facture ouverte de ce montant');
    n := 1;
  end if;
  return n;
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Installer
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.cashd_installer(p_client uuid, p_mode text default 'essai')
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  v_uid uuid;
  r public.cashd_reglages;
begin
  v_uid := (select auth.uid());
  if v_uid is null then
    if private.cashd_role_session() not in ('service_role', 'postgres') then
      raise exception 'CASHD s''installe par le gérant de l''organisation ou par Omega.' using errcode = '42501';
    end if;
  elsif not private.a_un_role(p_client, array['gerant']) then
    raise exception 'CASHD s''installe par le gérant de l''organisation ou par Omega.' using errcode = '42501';
  end if;
  if p_mode is null or p_mode not in ('essai', 'reel') then
    raise exception 'Le mode vaut essai ou reel.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.clients c where c.id = p_client) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  insert into public.cashd_reglages (client_id, mode, installe_par)
  values (p_client, p_mode, v_uid)
  on conflict (client_id) do nothing;
  select * into r from public.cashd_reglages where client_id = p_client;
  perform private.journaliser_module(p_client, 'cashd', 'cashd.installe', 'cashd_reglages', p_client::text,
    jsonb_build_object('mode', r.mode), null);
  return to_jsonb(r);
end $function$;

-- Régler : délai de paiement par défaut (60 jours au plus, L441-10), taux de pénalités, indemnité, seuil de relance.
-- Le passage en mode réel est une décision du gérant seul.
create or replace function public.cashd_regler(p_client uuid, p_champs jsonb)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  r public.cashd_reglages;
  v_inconnus text;
  v_uid uuid;
begin
  v_uid := private.cashd_exiger_gestion(p_client);
  select * into r from public.cashd_reglages where client_id = p_client for update;
  if not found then
    raise exception 'CASHD n''est pas installé pour cette organisation.' using errcode = '55000';
  end if;
  if p_champs is null or jsonb_typeof(p_champs) <> 'object' then
    raise exception 'Les réglages se donnent en objet.' using errcode = '22023';
  end if;
  select string_agg(k, ', ') into v_inconnus from jsonb_object_keys(p_champs) k
  where k not in ('mode', 'delai_paiement_jours', 'taux_penalites', 'indemnite_forfaitaire', 'seuil_relance', 'devise');
  if v_inconnus is not null then
    raise exception 'Réglage inconnu : %.', v_inconnus using errcode = '22023';
  end if;
  if p_champs ? 'mode' and p_champs ->> 'mode' is distinct from r.mode and v_uid is not null and not private.a_un_role(p_client, array['gerant']) then
    raise exception 'Seul le gérant fait passer CASHD en mode réel, ou le ramène à l''essai.' using errcode = '42501';
  end if;
  update public.cashd_reglages set
    mode = case when p_champs ? 'mode' then p_champs ->> 'mode' else mode end,
    delai_paiement_jours = case when p_champs ? 'delai_paiement_jours' then (p_champs ->> 'delai_paiement_jours')::smallint else delai_paiement_jours end,
    taux_penalites = case when p_champs ? 'taux_penalites' then (p_champs ->> 'taux_penalites')::numeric else taux_penalites end,
    indemnite_forfaitaire = case when p_champs ? 'indemnite_forfaitaire' then (p_champs ->> 'indemnite_forfaitaire')::numeric else indemnite_forfaitaire end,
    seuil_relance = case when p_champs ? 'seuil_relance' then (p_champs ->> 'seuil_relance')::numeric else seuil_relance end,
    devise = case when p_champs ? 'devise' then upper(p_champs ->> 'devise') else devise end,
    maj_le = now()
  where client_id = p_client
  returning * into r;
  perform private.journaliser_module(p_client, 'cashd', 'cashd.reglages', 'cashd_reglages', p_client::text, p_champs, null);
  return to_jsonb(r);
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Saisir un compte et une facture
-- ═══════════════════════════════════════════════════════════════════════════

-- Écrire un compte client (création si p_compte est null). Champs : reference, nom, groupe, siren, pays, langue, devise,
-- contact_facturation_nom, contact_facturation_email, contact_facturation_telephone, contact_commercial_nom,
-- contact_commercial_email, commercial_id, delai_paiement_jours, plafond_encours, reciproque, entite_id (création).
-- Le statut (pause, litige, hors périmètre…) ne s'écrit pas ici : il a ses portes et son journal (palier 2).
create or replace function private.cashd_ecrire_compte(p_compte uuid, p_client uuid, p_champs jsonb, p_source text)
 returns uuid language plpgsql security definer set search_path to ''
as $function$
declare
  c public.cashd_comptes;
  v_entite uuid;
  v_inconnus text;
  v_id uuid;
  p jsonb := coalesce(p_champs, '{}'::jsonb);
begin
  if jsonb_typeof(p) <> 'object' then
    raise exception 'Un compte se donne en objet.' using errcode = '22023';
  end if;
  select string_agg(k, ', ') into v_inconnus from jsonb_object_keys(p) k where k not in (
    'reference', 'nom', 'groupe', 'siren', 'pays', 'langue', 'devise', 'contact_facturation_nom', 'contact_facturation_email',
    'contact_facturation_telephone', 'contact_commercial_nom', 'contact_commercial_email', 'commercial_id',
    'delai_paiement_jours', 'plafond_encours', 'reciproque', 'entite_id');
  if v_inconnus is not null then
    raise exception 'Champ de compte inconnu : %.', v_inconnus using errcode = '22023';
  end if;
  if p ? 'commercial_id' and p ->> 'commercial_id' is not null
     and not exists (select 1 from public.comptes m
                     where m.client_id = coalesce(p_client, (select x.client_id from public.cashd_comptes x where x.id = p_compte))
                       and m.user_id = (p ->> 'commercial_id')::uuid) then
    raise exception 'Le commercial désigné n''est pas membre de l''organisation.' using errcode = '23503';
  end if;
  if p_compte is null then
    v_entite := private.cashd_entite(p_client, (p ->> 'entite_id')::uuid);
    perform private.cashd_exiger_gestion(p_client, v_entite);
    perform private.cashd_exiger_installe(p_client);
    if nullif(btrim(p ->> 'reference'), '') is null or nullif(btrim(p ->> 'nom'), '') is null then
      raise exception 'Un compte a une référence (le code client du facturier) et un nom.' using errcode = '22023';
    end if;
    insert into public.cashd_comptes (client_id, entite_id, reference, nom, groupe, siren, pays, langue, devise, contact_facturation_nom,
      contact_facturation_email, contact_facturation_telephone, contact_commercial_nom, contact_commercial_email, commercial_id,
      delai_paiement_jours, plafond_encours, reciproque, source)
    values (p_client, v_entite, btrim(p ->> 'reference'), btrim(p ->> 'nom'), nullif(btrim(p ->> 'groupe'), ''),
      nullif(regexp_replace(coalesce(p ->> 'siren', ''), '\s', '', 'g'), ''), coalesce(upper(nullif(btrim(p ->> 'pays'), '')), 'FR'),
      coalesce(lower(nullif(btrim(p ->> 'langue'), '')), 'fr'), coalesce(upper(nullif(btrim(p ->> 'devise'), '')), 'EUR'),
      nullif(btrim(p ->> 'contact_facturation_nom'), ''), lower(nullif(btrim(p ->> 'contact_facturation_email'), '')),
      nullif(btrim(p ->> 'contact_facturation_telephone'), ''), nullif(btrim(p ->> 'contact_commercial_nom'), ''),
      lower(nullif(btrim(p ->> 'contact_commercial_email'), '')), (p ->> 'commercial_id')::uuid,
      (p ->> 'delai_paiement_jours')::smallint, (p ->> 'plafond_encours')::numeric, coalesce((p ->> 'reciproque')::boolean, false),
      coalesce(p_source, 'saisie'))
    returning id into v_id;
    -- Un compte réciproque (client et fournisseur) sort du cycle automatique : la compensation est une décision.
    if coalesce((p ->> 'reciproque')::boolean, false) then
      update public.cashd_comptes set statut = 'pause', statut_motif = 'compte réciproque : la compensation relève de la direction financière',
        statut_le = now() where id = v_id;
    end if;
    perform private.journaliser_module(p_client, 'cashd', 'cashd.compte_cree', 'cashd_comptes', v_id::text,
      p - array['contact_facturation_email', 'contact_facturation_telephone', 'contact_commercial_email'] || jsonb_build_object('source', coalesce(p_source, 'saisie')), v_entite);
    return v_id;
  end if;

  select * into c from public.cashd_comptes where id = p_compte for update;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  perform private.cashd_exiger_gestion(c.client_id, c.entite_id);
  if p ? 'entite_id' and (p ->> 'entite_id')::uuid is distinct from c.entite_id then
    raise exception 'Un compte ne change pas d''entité : créez-en un autre.' using errcode = '23514';
  end if;
  update public.cashd_comptes set
    reference = case when p ? 'reference' then btrim(p ->> 'reference') else reference end,
    nom = case when p ? 'nom' then btrim(p ->> 'nom') else nom end,
    groupe = case when p ? 'groupe' then nullif(btrim(p ->> 'groupe'), '') else groupe end,
    siren = case when p ? 'siren' then nullif(regexp_replace(coalesce(p ->> 'siren', ''), '\s', '', 'g'), '') else siren end,
    pays = case when p ? 'pays' then coalesce(upper(nullif(btrim(p ->> 'pays'), '')), 'FR') else pays end,
    langue = case when p ? 'langue' then coalesce(lower(nullif(btrim(p ->> 'langue'), '')), 'fr') else langue end,
    devise = case when p ? 'devise' then coalesce(upper(nullif(btrim(p ->> 'devise'), '')), 'EUR') else devise end,
    contact_facturation_nom = case when p ? 'contact_facturation_nom' then nullif(btrim(p ->> 'contact_facturation_nom'), '') else contact_facturation_nom end,
    contact_facturation_email = case when p ? 'contact_facturation_email' then lower(nullif(btrim(p ->> 'contact_facturation_email'), '')) else contact_facturation_email end,
    contact_facturation_telephone = case when p ? 'contact_facturation_telephone' then nullif(btrim(p ->> 'contact_facturation_telephone'), '') else contact_facturation_telephone end,
    contact_commercial_nom = case when p ? 'contact_commercial_nom' then nullif(btrim(p ->> 'contact_commercial_nom'), '') else contact_commercial_nom end,
    contact_commercial_email = case when p ? 'contact_commercial_email' then lower(nullif(btrim(p ->> 'contact_commercial_email'), '')) else contact_commercial_email end,
    commercial_id = case when p ? 'commercial_id' then (p ->> 'commercial_id')::uuid else commercial_id end,
    delai_paiement_jours = case when p ? 'delai_paiement_jours' then (p ->> 'delai_paiement_jours')::smallint else delai_paiement_jours end,
    plafond_encours = case when p ? 'plafond_encours' then (p ->> 'plafond_encours')::numeric else plafond_encours end,
    reciproque = case when p ? 'reciproque' then coalesce((p ->> 'reciproque')::boolean, false) else reciproque end,
    vu_le = case when p_source in ('export', 'import') then now() else vu_le end,
    maj_le = now()
  where id = c.id;
  if coalesce((p ->> 'reciproque')::boolean, false) and not c.reciproque and c.statut = 'actif' then
    update public.cashd_comptes set statut = 'pause', statut_motif = 'compte réciproque : la compensation relève de la direction financière',
      statut_le = now() where id = c.id;
  end if;
  if p_source is distinct from 'export' then
    perform private.journaliser_module(c.client_id, 'cashd', 'cashd.compte_modifie', 'cashd_comptes', c.id::text,
      p - array['contact_facturation_email', 'contact_facturation_telephone', 'contact_commercial_email'], c.entite_id);
  end if;
  return c.id;
end $function$;

create or replace function public.cashd_ecrire_compte(p_compte uuid, p_client uuid, p_champs jsonb)
 returns uuid language sql security definer set search_path to ''
as $function$ select private.cashd_ecrire_compte(p_compte, p_client, p_champs, 'saisie') $function$;

-- Écrire une facture, un acompte, un avoir ou un devis (création si p_facture est null). Champs : compte_id (ou
-- compte_reference), nature, numero, date_emission, echeance, montant_ht, montant_ttc, devise, commande_ref, entite_id.
-- Sans échéance : la date d'émission plus le délai du compte, ou celui de l'organisation (30 jours par défaut,
-- L441-10). Une facture réglée, annulée ou en litige ne change plus de montant ici.
create or replace function private.cashd_ecrire_facture(p_facture uuid, p_client uuid, p_champs jsonb, p_source text)
 returns uuid language plpgsql security definer set search_path to ''
as $function$
declare
  f public.cashd_factures;
  c public.cashd_comptes;
  g public.cashd_reglages;
  p jsonb := coalesce(p_champs, '{}'::jsonb);
  v_inconnus text;
  v_entite uuid;
  v_nature text;
  v_emission date;
  v_echeance date;
  v_id uuid;
  v_uid uuid;
begin
  if jsonb_typeof(p) <> 'object' then
    raise exception 'Une facture se donne en objet.' using errcode = '22023';
  end if;
  select string_agg(k, ', ') into v_inconnus from jsonb_object_keys(p) k where k not in (
    'compte_id', 'compte_reference', 'nature', 'numero', 'date_emission', 'echeance', 'montant_ht', 'montant_ttc', 'devise',
    'commande_ref', 'entite_id', 'statut');
  if v_inconnus is not null then
    raise exception 'Champ de facture inconnu : %.', v_inconnus using errcode = '22023';
  end if;
  if p_facture is null then
    v_entite := private.cashd_entite(p_client, (p ->> 'entite_id')::uuid);
    v_uid := private.cashd_exiger_gestion(p_client, v_entite);
    g := private.cashd_exiger_installe(p_client);
    if p ? 'compte_id' then
      select * into c from public.cashd_comptes x where x.id = (p ->> 'compte_id')::uuid and x.client_id = p_client;
    else
      select * into c from public.cashd_comptes x where x.client_id = p_client and x.entite_id = v_entite and x.reference = btrim(p ->> 'compte_reference');
    end if;
    if c.id is null then
      raise exception 'Compte client introuvable pour cette facture.' using errcode = 'P0002';
    end if;
    if c.entite_id <> v_entite then
      raise exception 'Le compte appartient à une autre entité que la facture.' using errcode = '23514';
    end if;
    v_nature := coalesce(nullif(p ->> 'nature', ''), 'facture');
    if v_nature not in ('facture', 'acompte', 'avoir', 'devis') then
      raise exception 'Nature inconnue : % (facture, acompte, avoir, devis).', v_nature using errcode = '22023';
    end if;
    if nullif(btrim(p ->> 'numero'), '') is null then
      raise exception 'Une pièce a un numéro.' using errcode = '22023';
    end if;
    v_emission := coalesce((p ->> 'date_emission')::date, (now() at time zone 'Europe/Paris')::date);
    v_echeance := case when v_nature in ('facture', 'acompte')
                       then coalesce((p ->> 'echeance')::date, v_emission + coalesce(c.delai_paiement_jours, g.delai_paiement_jours))
                       else (p ->> 'echeance')::date end;
    if (p ->> 'montant_ttc') is null or (p ->> 'montant_ttc')::numeric < 0 then
      raise exception 'Le montant TTC est positif (un avoir se saisit en nature « avoir », montant positif).' using errcode = '22023';
    end if;
    insert into public.cashd_factures (client_id, entite_id, compte_id, nature, numero, date_emission, echeance, montant_ht, montant_ttc,
      devise, statut, commande_ref, source, vue_le, cree_par)
    values (p_client, v_entite, c.id, v_nature, btrim(p ->> 'numero'), v_emission, v_echeance, round((p ->> 'montant_ht')::numeric, 2),
      round((p ->> 'montant_ttc')::numeric, 2), coalesce(upper(nullif(btrim(p ->> 'devise'), '')), c.devise),
      case when v_nature = 'devis' then coalesce(nullif(p ->> 'statut', ''), 'en_attente') else 'ouverte' end,
      nullif(btrim(p ->> 'commande_ref'), ''), coalesce(p_source, 'saisie'),
      case when p_source in ('export', 'import') then now() end, v_uid)
    returning id into v_id;
    perform private.journaliser_module(p_client, 'cashd', 'cashd.facture_saisie', 'cashd_factures', v_id::text,
      jsonb_build_object('nature', v_nature, 'numero', btrim(p ->> 'numero'), 'compte', c.reference, 'montant_ttc', round((p ->> 'montant_ttc')::numeric, 2),
                         'echeance', v_echeance, 'source', coalesce(p_source, 'saisie')), v_entite);
    return v_id;
  end if;

  select * into f from public.cashd_factures where id = p_facture for update;
  if not found then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  perform private.cashd_exiger_gestion(f.client_id, f.entite_id);
  if (p ? 'montant_ttc' or p ? 'compte_id' or p ? 'compte_reference' or p ? 'nature')
     and (f.statut in ('litige', 'annulee', 'abandonnee') or exists (select 1 from public.cashd_imputations x where (x.facture_id = f.id or x.avoir_id = f.id) and x.annulee_le is null)) then
    raise exception 'Cette pièce est lettrée ou en litige : son montant et son compte ne changent plus ici.' using errcode = '23514';
  end if;
  if p ? 'entite_id' and (p ->> 'entite_id')::uuid is distinct from f.entite_id then
    raise exception 'Une pièce ne change pas d''entité.' using errcode = '23514';
  end if;
  if p ? 'statut' and f.nature = 'devis' and (p ->> 'statut') not in ('en_attente', 'accepte', 'refuse', 'expire') then
    raise exception 'Statut de devis inconnu : %.', p ->> 'statut' using errcode = '22023';
  end if;
  if p ? 'statut' and f.nature <> 'devis' then
    raise exception 'Le statut d''une facture suit ses règlements, son litige ou sa sortie du cycle : il ne s''écrit pas ici.' using errcode = '23514';
  end if;
  if p ? 'compte_id' or p ? 'compte_reference' then
    if p ? 'compte_id' then
      select * into c from public.cashd_comptes x where x.id = (p ->> 'compte_id')::uuid and x.client_id = f.client_id and x.entite_id = f.entite_id;
    else
      select * into c from public.cashd_comptes x where x.client_id = f.client_id and x.entite_id = f.entite_id and x.reference = btrim(p ->> 'compte_reference');
    end if;
    if c.id is null then
      raise exception 'Compte client introuvable pour cette facture.' using errcode = 'P0002';
    end if;
  end if;
  update public.cashd_factures set
    compte_id = coalesce(c.id, compte_id),
    nature = case when p ? 'nature' then p ->> 'nature' else nature end,
    numero = case when p ? 'numero' then btrim(p ->> 'numero') else numero end,
    date_emission = case when p ? 'date_emission' then (p ->> 'date_emission')::date else date_emission end,
    echeance = case when p ? 'echeance' then (p ->> 'echeance')::date else echeance end,
    montant_ht = case when p ? 'montant_ht' then round((p ->> 'montant_ht')::numeric, 2) else montant_ht end,
    montant_ttc = case when p ? 'montant_ttc' then round((p ->> 'montant_ttc')::numeric, 2) else montant_ttc end,
    devise = case when p ? 'devise' then upper(p ->> 'devise') else devise end,
    commande_ref = case when p ? 'commande_ref' then nullif(btrim(p ->> 'commande_ref'), '') else commande_ref end,
    statut = case when p ? 'statut' then p ->> 'statut' else statut end,
    statut_le = case when p ? 'statut' and p ->> 'statut' is distinct from statut then now() else statut_le end,
    maj_le = now()
  where id = f.id;
  perform private.journaliser_module(f.client_id, 'cashd', 'cashd.facture_modifiee', 'cashd_factures', f.id::text,
    p || jsonb_build_object('numero_avant', f.numero), f.entite_id);
  return f.id;
end $function$;

create or replace function public.cashd_ecrire_facture(p_facture uuid, p_client uuid, p_champs jsonb)
 returns uuid language sql security definer set search_path to ''
as $function$ select private.cashd_ecrire_facture(p_facture, p_client, p_champs, 'saisie') $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Les règlements et le lettrage
-- ═══════════════════════════════════════════════════════════════════════════

-- Noter un règlement reçu. p_facture (facultatif) : la facture qu'il solde. Sans elle, le lettrage automatique cherche
-- la facture citée, puis la seule facture ouverte de ce montant ; sinon le règlement reste « à imputer » et les
-- factures probables sont proposées (cashd_propositions). Une même référence, à la même date et du même montant, n'est
-- notée qu'une fois (double clic, import rejoué). Pas de date future.
create or replace function private.cashd_noter_reglement(p_client uuid, p_compte uuid, p_montant numeric, p_date date, p_reference text,
  p_mode text, p_facture uuid, p_entite uuid, p_libelle text, p_facture_citee text, p_source text, p_source_cle text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  v_entite uuid;
  v_uid uuid;
  c public.cashd_comptes;
  f public.cashd_factures;
  v_id uuid;
  v_cle text;
  v_ref text := nullif(btrim(left(p_reference, 140)), '');
  v_n integer := 0;
begin
  if p_facture is not null then
    select * into f from public.cashd_factures where id = p_facture and client_id = p_client;
    if not found then
      raise exception 'Facture introuvable.' using errcode = 'P0002';
    end if;
  end if;
  if p_compte is not null then
    select * into c from public.cashd_comptes where id = p_compte and client_id = p_client;
    if not found then
      raise exception 'Compte client introuvable.' using errcode = 'P0002';
    end if;
  end if;
  v_entite := coalesce(f.entite_id, c.entite_id, private.cashd_entite(p_client, p_entite));
  v_uid := private.cashd_exiger_gestion(p_client, v_entite);
  perform private.cashd_exiger_installe(p_client);
  if p_montant is null or p_montant <= 0 then
    raise exception 'Le montant reçu est positif.' using errcode = '22023';
  end if;
  if p_date is null or p_date > (now() at time zone 'Europe/Paris')::date then
    raise exception 'La date du règlement est connue et n''est pas dans le futur.' using errcode = '22023';
  end if;
  if p_mode is not null and p_mode not in ('virement', 'prelevement', 'cheque', 'carte', 'especes', 'compensation', 'lien_paiement', 'autre') then
    raise exception 'Moyen de règlement inconnu : %.', p_mode using errcode = '22023';
  end if;
  if c.id is not null and f.id is not null and c.id <> f.compte_id then
    raise exception 'La facture nommée n''est pas celle de ce compte.' using errcode = '23514';
  end if;
  v_cle := coalesce(nullif(btrim(p_source_cle), ''),
                    case when v_ref is not null then 'ref:' || lower(v_ref) || '|' || p_date::text || '|' || round(p_montant, 2)::text end);
  if v_cle is not null then
    select r.id into v_id from public.cashd_reglements r where r.client_id = p_client and r.entite_id = v_entite and r.source_cle = v_cle;
    if v_id is not null then
      return jsonb_build_object('reglement', v_id, 'deja_note', true, 'a_imputer', private.cashd_a_imputer(v_id));
    end if;
  end if;
  insert into public.cashd_reglements (client_id, entite_id, compte_id, recu_le, montant, mode, reference, libelle, facture_citee, source, source_cle, note_par)
  values (p_client, v_entite, coalesce(c.id, f.compte_id), p_date, round(p_montant, 2), p_mode, v_ref, nullif(btrim(left(p_libelle, 300)), ''),
          coalesce(f.numero, nullif(btrim(left(p_facture_citee, 80)), '')), coalesce(p_source, 'saisie'), v_cle, v_uid)
  returning id into v_id;
  perform private.journaliser_module(p_client, 'cashd', 'cashd.reglement_note', 'cashd_reglements', v_id::text,
    jsonb_build_object('montant', round(p_montant, 2), 'recu_le', p_date, 'reference', v_ref, 'mode', p_mode,
                       'compte', coalesce(c.reference, (select x.reference from public.cashd_comptes x where x.id = f.compte_id)),
                       'facture', f.numero, 'source', coalesce(p_source, 'saisie')), v_entite);
  if f.id is not null then
    perform private.cashd_imputer(f.id, v_id, null, least(round(p_montant, 2),
      greatest(f.montant_ttc - coalesce((select sum(x.montant) from public.cashd_imputations x where x.facture_id = f.id and x.annulee_le is null), 0), 0)),
      false, 'facture désignée à la saisie');
    v_n := 1;
  else
    v_n := private.cashd_lettrer_auto(v_id);
  end if;
  return jsonb_build_object('reglement', v_id, 'deja_note', false, 'imputations', v_n, 'a_imputer', private.cashd_a_imputer(v_id),
    'compte', (select r.compte_id from public.cashd_reglements r where r.id = v_id));
end $function$;

create or replace function public.cashd_noter_reglement(p_client uuid, p_compte uuid, p_montant numeric, p_date date default null,
  p_reference text default null, p_mode text default null, p_facture uuid default null, p_entite uuid default null)
 returns jsonb language sql security definer set search_path to ''
as $function$
  select private.cashd_noter_reglement(p_client, p_compte, p_montant, coalesce(p_date, (now() at time zone 'Europe/Paris')::date), p_reference, p_mode,
                                       p_facture, p_entite, null, null, 'saisie', null)
$function$;

-- Lettrer un règlement sur une facture (montant facultatif : le plus petit du reste à imputer et du reste dû).
create or replace function public.cashd_lettrer(p_reglement uuid, p_facture uuid, p_montant numeric default null)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare r public.cashd_reglements; v_id uuid;
begin
  select * into r from public.cashd_reglements where id = p_reglement;
  if not found then
    raise exception 'Règlement introuvable.' using errcode = 'P0002';
  end if;
  perform private.cashd_exiger_gestion(r.client_id, r.entite_id);
  if p_montant is not null and p_montant <= 0 then
    raise exception 'Le montant imputé est positif.' using errcode = '22023';
  end if;
  v_id := private.cashd_imputer(p_facture, p_reglement, null, p_montant, false, 'lettrage manuel');
  return jsonb_build_object('imputation', v_id, 'a_imputer', private.cashd_a_imputer(p_reglement), 'reste_du', private.cashd_reste(p_facture));
end $function$;

-- Imputer un avoir sur une facture du même compte.
create or replace function public.cashd_imputer_avoir(p_avoir uuid, p_facture uuid, p_montant numeric default null)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare a public.cashd_factures; v_id uuid;
begin
  select * into a from public.cashd_factures where id = p_avoir;
  if not found or a.nature <> 'avoir' then
    raise exception 'Avoir introuvable.' using errcode = 'P0002';
  end if;
  perform private.cashd_exiger_gestion(a.client_id, a.entite_id);
  if a.statut not in ('ouverte') then
    raise exception 'Cet avoir est déjà entièrement imputé.' using errcode = '23514';
  end if;
  if p_montant is not null and p_montant <= 0 then
    raise exception 'Le montant imputé est positif.' using errcode = '22023';
  end if;
  v_id := private.cashd_imputer(p_facture, null, p_avoir, p_montant, false, 'avoir imputé');
  return jsonb_build_object('imputation', v_id, 'avoir_reste', private.cashd_reste(p_avoir), 'reste_du', private.cashd_reste(p_facture));
end $function$;

-- Annuler une imputation (erreur de lettrage) : elle reste, marquée annulée, avec son motif.
create or replace function public.cashd_annuler_imputation(p_imputation uuid, p_motif text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare x public.cashd_imputations; v_entite uuid; v_uid uuid;
begin
  select * into x from public.cashd_imputations where id = p_imputation for update;
  if not found then
    raise exception 'Imputation introuvable.' using errcode = 'P0002';
  end if;
  select f.entite_id into v_entite from public.cashd_factures f where f.id = x.facture_id;
  v_uid := private.cashd_exiger_gestion(x.client_id, v_entite);
  if x.annulee_le is not null then
    raise exception 'Cette imputation est déjà annulée.' using errcode = '23514';
  end if;
  if nullif(btrim(p_motif), '') is null then
    raise exception 'Une annulation dit pourquoi.' using errcode = '22023';
  end if;
  update public.cashd_imputations set annulee_le = now(), annulee_par = v_uid, annulee_motif = left(btrim(p_motif), 500) where id = x.id;
  perform private.cashd_suivre_solde(x.facture_id);
  if x.avoir_id is not null then
    perform private.cashd_suivre_solde(x.avoir_id);
  end if;
  perform private.journaliser_module(x.client_id, 'cashd', 'cashd.imputation_annulee', 'cashd_factures', x.facture_id::text,
    jsonb_build_object('imputation', x.id, 'montant', x.montant, 'reglement', x.reglement_id, 'avoir', x.avoir_id, 'motif', left(btrim(p_motif), 500)), v_entite);
  return jsonb_build_object('imputation', x.id, 'reste_du', private.cashd_reste(x.facture_id));
end $function$;

-- Annuler un règlement noté par erreur (chèque impayé, doublon) : ses imputations sont annulées avec lui.
create or replace function public.cashd_annuler_reglement(p_reglement uuid, p_motif text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare r public.cashd_reglements; v_uid uuid; x record;
begin
  select * into r from public.cashd_reglements where id = p_reglement for update;
  if not found then
    raise exception 'Règlement introuvable.' using errcode = 'P0002';
  end if;
  v_uid := private.cashd_exiger_gestion(r.client_id, r.entite_id);
  if r.statut = 'annule' then
    raise exception 'Ce règlement est déjà annulé.' using errcode = '23514';
  end if;
  if nullif(btrim(p_motif), '') is null then
    raise exception 'Une annulation dit pourquoi.' using errcode = '22023';
  end if;
  for x in select * from public.cashd_imputations where reglement_id = r.id and annulee_le is null loop
    update public.cashd_imputations set annulee_le = now(), annulee_par = v_uid, annulee_motif = 'règlement annulé : ' || left(btrim(p_motif), 400) where id = x.id;
    perform private.cashd_suivre_solde(x.facture_id);
  end loop;
  update public.cashd_reglements set statut = 'annule', annule_motif = left(btrim(p_motif), 500), annule_le = now() where id = r.id;
  perform private.journaliser_module(r.client_id, 'cashd', 'cashd.reglement_annule', 'cashd_reglements', r.id::text,
    jsonb_build_object('montant', r.montant, 'recu_le', r.recu_le, 'motif', left(btrim(p_motif), 500)), r.entite_id);
  return jsonb_build_object('reglement', r.id, 'statut', 'annule');
end $function$;

-- Les factures probables d'un règlement à imputer : montant exact d'abord, puis une combinaison des plus anciennes
-- factures du compte qui fait le montant, puis les factures ouvertes de même montant chez les autres comptes (virement
-- sans référence ni compte). Lecture sous les droits de l'appelant.
create or replace function public.cashd_propositions(p_reglement uuid)
 returns jsonb language plpgsql stable security invoker set search_path to ''
as $function$
declare
  r public.cashd_reglements_etat;
  v jsonb := '[]'::jsonb;
  v_cumul numeric := 0;
  v_fifo jsonb := '[]'::jsonb;
  f record;
begin
  select * into r from public.cashd_reglements_etat where id = p_reglement;
  if not found or r.a_imputer <= 0 then
    return '[]'::jsonb;
  end if;
  -- 1. Le montant exact.
  select coalesce(jsonb_agg(jsonb_build_object('raison', 'montant_exact', 'factures', jsonb_build_array(jsonb_build_object(
           'id', x.id, 'numero', x.numero, 'compte_id', x.compte_id, 'compte', c.nom, 'reste_du', x.reste_du, 'echeance', x.echeance)))
         order by (x.compte_id = r.compte_id) desc, x.echeance), '[]'::jsonb)
    into v
  from public.cashd_factures_etat x join public.cashd_comptes c on c.id = x.compte_id
  where x.client_id = r.client_id and x.entite_id = r.entite_id and x.nature in ('facture', 'acompte')
    and x.statut in ('ouverte', 'litige') and abs(x.reste_du - r.a_imputer) < 0.005
    and (r.compte_id is null or x.compte_id = r.compte_id);
  -- 2. Les plus anciennes du compte, cumulées jusqu'au montant (si le cumul tombe juste).
  if r.compte_id is not null then
    for f in select x.id, x.numero, x.reste_du, x.echeance from public.cashd_factures_etat x
             where x.compte_id = r.compte_id and x.nature in ('facture', 'acompte') and x.statut = 'ouverte' and x.reste_du > 0
             order by x.echeance nulls last, x.date_emission, x.numero loop
      exit when v_cumul >= r.a_imputer - 0.005;
      v_cumul := v_cumul + f.reste_du;
      v_fifo := v_fifo || jsonb_build_object('id', f.id, 'numero', f.numero, 'reste_du', f.reste_du, 'echeance', f.echeance);
    end loop;
    if jsonb_array_length(v_fifo) > 1 and abs(v_cumul - r.a_imputer) < 0.005 then
      v := v || jsonb_build_array(jsonb_build_object('raison', 'plus_anciennes', 'factures', v_fifo));
    end if;
  end if;
  return v;
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Intégrer des lignes d'export (chaîne de relevés du socle, ou dépôt depuis l'écran)
-- ═══════════════════════════════════════════════════════════════════════════
-- p_jeu : clients | factures | reglements | devis. p_lignes : tableau d'objets aux clés du modèle cashd/tableur
-- (voir § 8). p_complet : l'export liste TOUTES les pièces ouvertes de l'entité ; une pièce importée qui n'y est
-- plus est soldée (le facturier l'a vue réglée). Rend le bilan, ligne par ligne pour les lignes écartées.

create or replace function private.cashd_compte_pour(p_client uuid, p_entite uuid, p_ref text, p_nom text, l jsonb, p_source text)
 returns uuid language plpgsql security definer set search_path to ''
as $function$
declare v_id uuid; v_ref text := coalesce(nullif(btrim(p_ref), ''), nullif(btrim(p_nom), ''));
begin
  if v_ref is null then
    return null;
  end if;
  select c.id into v_id from public.cashd_comptes c where c.client_id = p_client and c.entite_id = p_entite and c.reference = left(v_ref, 80);
  if v_id is not null then
    return v_id;
  end if;
  -- Un compte inconnu se crée depuis l'export, avec ce que la ligne dit de lui.
  return private.cashd_ecrire_compte(null, p_client, jsonb_strip_nulls(jsonb_build_object(
    'entite_id', p_entite, 'reference', left(v_ref, 80), 'nom', left(coalesce(nullif(btrim(p_nom), ''), v_ref), 200),
    'siren', case when regexp_replace(coalesce(private.cashd_v(l, 'compte_siren'), ''), '\s', '', 'g') ~ '^[0-9]{9}$'
                  then regexp_replace(private.cashd_v(l, 'compte_siren'), '\s', '', 'g') end,
    'contact_facturation_email', case when lower(private.cashd_v(l, 'compte_email')) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(private.cashd_v(l, 'compte_email')) end)),
    p_source);
end $function$;

create or replace function private.cashd_integrer(p_client uuid, p_entite uuid, p_jeu text, p_lignes jsonb, p_complet boolean, p_source text, p_origine text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  l jsonb;
  k integer := 0;
  v_cree integer := 0;
  v_modif integer := 0;
  v_pareil integer := 0;
  v_soldees integer := 0;
  v_ecartees jsonb := '[]'::jsonb;
  v_vus text[] := '{}';
  v_compte uuid;
  v_id uuid;
  f public.cashd_factures;
  v_nature text;
  v_numero text;
  v_ttc numeric;
  v_ht numeric;
  v_reste numeric;
  v_emission date;
  v_echeance date;
  v_statut text;
  v_res jsonb;
  v_lettrees integer := 0;
  g public.cashd_reglages;
  c record;
begin
  g := private.cashd_exiger_installe(p_client);
  if p_jeu not in ('clients', 'factures', 'reglements', 'devis') then
    raise exception 'Jeu inconnu : % (clients, factures, reglements, devis).', coalesce(p_jeu, 'vide') using errcode = '22023';
  end if;
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' then
    raise exception 'Les lignes se donnent en tableau.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_lignes) > 20000 then
    raise exception 'Plus de 20 000 lignes : découpez l''export.' using errcode = '22023';
  end if;

  for l in select x.value from jsonb_array_elements(p_lignes) x loop
    k := k + 1;
    begin
      if jsonb_typeof(l) <> 'object' then
        raise exception 'ligne illisible' using errcode = '22023';
      end if;

      if p_jeu = 'clients' then
        if private.cashd_v(l, 'code') is null and private.cashd_v(l, 'nom') is null then
          raise exception 'ni code ni nom' using errcode = '22023';
        end if;
        select x.id into v_id from public.cashd_comptes x
        where x.client_id = p_client and x.entite_id = p_entite and x.reference = left(coalesce(private.cashd_v(l, 'code'), private.cashd_v(l, 'nom')), 80);
        v_res := jsonb_strip_nulls(jsonb_build_object(
          'reference', left(coalesce(private.cashd_v(l, 'code'), private.cashd_v(l, 'nom')), 80),
          'nom', left(coalesce(private.cashd_v(l, 'nom'), private.cashd_v(l, 'code')), 200),
          'groupe', left(private.cashd_v(l, 'groupe'), 200),
          'siren', case when regexp_replace(coalesce(private.cashd_v(l, 'siren'), ''), '\s', '', 'g') ~ '^[0-9]{9}$' then regexp_replace(private.cashd_v(l, 'siren'), '\s', '', 'g') end,
          'pays', case when upper(private.cashd_v(l, 'pays')) ~ '^[A-Z]{2}$' then upper(private.cashd_v(l, 'pays')) end,
          'langue', case when lower(private.cashd_v(l, 'langue')) ~ '^[a-z]{2}$' then lower(private.cashd_v(l, 'langue')) end,
          'devise', case when upper(private.cashd_v(l, 'devise')) ~ '^[A-Z]{3}$' then upper(private.cashd_v(l, 'devise')) end,
          'contact_facturation_nom', left(private.cashd_v(l, 'contact'), 200),
          'contact_facturation_email', case when lower(private.cashd_v(l, 'email')) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(private.cashd_v(l, 'email')) end,
          'contact_facturation_telephone', left(private.cashd_v(l, 'telephone'), 40),
          'contact_commercial_email', case when lower(private.cashd_v(l, 'email_commercial')) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(private.cashd_v(l, 'email_commercial')) end,
          'delai_paiement_jours', case when private.cashd_nombre(private.cashd_v(l, 'delai_paiement')) between 0 and 60 then private.cashd_nombre(private.cashd_v(l, 'delai_paiement'))::integer end,
          'plafond_encours', case when private.cashd_nombre(private.cashd_v(l, 'plafond')) >= 0 then private.cashd_nombre(private.cashd_v(l, 'plafond')) end));
        if v_id is null then
          perform private.cashd_ecrire_compte(null, p_client, v_res || jsonb_build_object('entite_id', p_entite), p_source);
          v_cree := v_cree + 1;
        else
          perform private.cashd_ecrire_compte(v_id, p_client, v_res, p_source);
          v_modif := v_modif + 1;
        end if;
        continue;
      end if;

      if p_jeu = 'reglements' then
        v_ttc := private.cashd_nombre(private.cashd_v(l, 'montant'));
        v_emission := private.cashd_date(private.cashd_v(l, 'date'));
        if v_ttc is null or v_ttc <= 0 then
          raise exception 'montant illisible ou nul' using errcode = '22023';
        end if;
        if v_emission is null then
          raise exception 'date illisible' using errcode = '22023';
        end if;
        v_compte := null;
        if private.cashd_v(l, 'compte_ref') is not null or private.cashd_v(l, 'compte_nom') is not null then
          select x.id into v_compte from public.cashd_comptes x where x.client_id = p_client and x.entite_id = p_entite
            and x.reference = left(coalesce(private.cashd_v(l, 'compte_ref'), private.cashd_v(l, 'compte_nom')), 80);
        end if;
        v_res := private.cashd_noter_reglement(p_client, v_compte, v_ttc, v_emission, private.cashd_v(l, 'reference'),
          private.cashd_mode(private.cashd_v(l, 'mode')), null, p_entite, private.cashd_v(l, 'libelle'), private.cashd_v(l, 'facture_numero'),
          p_source, left(concat_ws('|', 'export', v_emission, round(v_ttc, 2), coalesce(private.cashd_v(l, 'reference'), ''),
                                   coalesce(private.cashd_v(l, 'facture_numero'), ''), coalesce(private.cashd_v(l, 'compte_ref'), '')), 300));
        if (v_res ->> 'deja_note')::boolean then
          v_pareil := v_pareil + 1;
        else
          v_cree := v_cree + 1;
          v_lettrees := v_lettrees + coalesce((v_res ->> 'imputations')::integer, 0);
        end if;
        continue;
      end if;

      -- factures et devis
      v_numero := left(private.cashd_v(l, 'numero'), 80);
      if v_numero is null then
        raise exception 'numéro absent' using errcode = '22023';
      end if;
      v_ttc := private.cashd_nombre(private.cashd_v(l, 'montant_ttc'));
      v_ht := private.cashd_nombre(private.cashd_v(l, 'montant_ht'));
      v_ttc := coalesce(v_ttc, v_ht);
      if v_ttc is null then
        raise exception 'montant illisible' using errcode = '22023';
      end if;
      v_nature := case when p_jeu = 'devis' then 'devis' else private.cashd_nature(private.cashd_v(l, 'nature'), v_ttc) end;
      if v_nature = 'devis' and p_jeu = 'factures' then
        raise exception 'un devis dans l''export des factures' using errcode = '22023';
      end if;
      v_ttc := abs(v_ttc);
      v_ht := abs(v_ht);
      v_reste := abs(private.cashd_nombre(private.cashd_v(l, 'reste_du')));
      v_emission := private.cashd_date(private.cashd_v(l, 'date_emission'));
      if v_emission is null then
        raise exception 'date d''émission illisible' using errcode = '22023';
      end if;
      v_echeance := private.cashd_date(private.cashd_v(l, 'echeance'));
      if v_echeance is not null and v_echeance < v_emission then
        raise exception 'échéance antérieure à l''émission' using errcode = '22023';
      end if;
      v_compte := private.cashd_compte_pour(p_client, p_entite, private.cashd_v(l, 'compte_ref'), private.cashd_v(l, 'compte_nom'), l, p_source);
      if v_compte is null then
        raise exception 'compte client absent' using errcode = '22023';
      end if;
      v_vus := v_vus || (v_nature || ':' || v_numero);
      select * into f from public.cashd_factures x where x.client_id = p_client and x.entite_id = p_entite and x.nature = v_nature and x.numero = v_numero for update;
      if not found then
        v_id := private.cashd_ecrire_facture(null, p_client, jsonb_strip_nulls(jsonb_build_object(
          'entite_id', p_entite, 'compte_id', v_compte, 'nature', v_nature, 'numero', v_numero, 'date_emission', v_emission,
          'echeance', v_echeance, 'montant_ht', v_ht, 'montant_ttc', v_ttc,
          'devise', case when upper(private.cashd_v(l, 'devise')) ~ '^[A-Z]{3}$' then upper(private.cashd_v(l, 'devise')) end,
          'commande_ref', left(private.cashd_v(l, 'commande_ref'), 80),
          'statut', case when v_nature = 'devis' then coalesce(private.cashd_statut_devis(private.cashd_v(l, 'statut')), 'en_attente') end)), p_source);
        update public.cashd_factures set reste_du_source = case when v_nature in ('facture', 'acompte') then least(v_reste, montant_ttc) end where id = v_id;
        v_cree := v_cree + 1;
      else
        -- La pièce connue : on suit ce que le facturier en dit, sans toucher à ce qu'une personne a décidé ici.
        v_statut := case
          when f.nature = 'devis' then coalesce(private.cashd_statut_devis(private.cashd_v(l, 'statut')), f.statut)
          when f.statut = 'soldee' and f.statut_motif like 'absente de l''export%' and coalesce(v_reste, v_ttc) > 0 then 'ouverte'
          else f.statut end;
        if (f.montant_ttc, f.date_emission, f.echeance, f.reste_du_source, f.compte_id, f.statut)
           is distinct from (case when f.statut in ('litige') then f.montant_ttc else v_ttc end, v_emission, coalesce(v_echeance, f.echeance),
                             case when f.nature in ('facture', 'acompte') then least(v_reste, v_ttc) end, f.compte_id, v_statut) then
          update public.cashd_factures set
            montant_ttc = case when statut = 'litige' or exists (select 1 from public.cashd_imputations x where (x.facture_id = f.id or x.avoir_id = f.id) and x.annulee_le is null)
                               then montant_ttc else v_ttc end,
            montant_ht = coalesce(v_ht, montant_ht),
            date_emission = v_emission,
            echeance = coalesce(v_echeance, echeance),
            reste_du_source = case when nature in ('facture', 'acompte') then least(v_reste, v_ttc) end,
            statut = v_statut,
            statut_motif = case when v_statut is distinct from f.statut then 'suivi de l''export' else statut_motif end,
            statut_le = case when v_statut is distinct from f.statut then now() else statut_le end,
            vue_le = now(), maj_le = now()
          where id = f.id;
          v_modif := v_modif + 1;
        else
          update public.cashd_factures set vue_le = now() where id = f.id;
          v_pareil := v_pareil + 1;
        end if;
      end if;
    exception when others then
      if sqlstate = '42501' then
        raise;
      end if;
      v_ecartees := v_ecartees || jsonb_build_object('ligne', k, 'motif', left(sqlerrm, 200));
    end;
  end loop;

  -- L'export complet : les pièces importées qui n'y sont plus sont soldées (ou, pour un devis, sorties du suivi).
  if coalesce(p_complet, false) and p_jeu in ('factures', 'devis') and jsonb_array_length(p_lignes) > 0 then
    for c in
      select x.id, x.nature, x.numero, x.statut from public.cashd_factures x
      where x.client_id = p_client and x.entite_id = p_entite and x.source in ('export', 'import')
        and ((p_jeu = 'factures' and x.nature in ('facture', 'acompte', 'avoir') and x.statut = 'ouverte')
             or (p_jeu = 'devis' and x.nature = 'devis' and x.statut = 'en_attente'))
        and not ((x.nature || ':' || x.numero) = any (v_vus))
    loop
      update public.cashd_factures
         set statut = case when c.nature = 'devis' then 'expire' else 'soldee' end,
             statut_motif = left(format('absente de l''export du %s (%s)', to_char((now() at time zone 'Europe/Paris')::date, 'DD/MM/YYYY'), coalesce(p_origine, p_source)), 500),
             statut_le = now(), maj_le = now()
       where id = c.id;
      perform private.journaliser_module(p_client, 'cashd', 'cashd.piece_sortie_export', 'cashd_factures', c.id::text,
        jsonb_build_object('nature', c.nature, 'numero', c.numero, 'origine', p_origine), p_entite);
      v_soldees := v_soldees + 1;
    end loop;
  end if;

  perform private.journaliser_module(p_client, 'cashd', 'cashd.import', 'cashd_reglages', p_client::text,
    jsonb_build_object('jeu', p_jeu, 'source', p_source, 'origine', p_origine, 'lignes', k, 'creees', v_cree, 'modifiees', v_modif,
                       'inchangees', v_pareil, 'ecartees', jsonb_array_length(v_ecartees), 'soldees_par_absence', v_soldees,
                       'lettrees', v_lettrees, 'complet', coalesce(p_complet, false)), p_entite);
  return jsonb_build_object('jeu', p_jeu, 'lignes', k, 'creees', v_cree, 'modifiees', v_modif, 'inchangees', v_pareil,
    'soldees_par_absence', v_soldees, 'lettrees', v_lettrees, 'ecartees', v_ecartees);
end $function$;

-- Le dépôt depuis l'écran : les lignes déjà lues dans le navigateur (CSV), aux clés du modèle cashd/tableur.
create or replace function public.cashd_importer(p_client uuid, p_jeu text, p_lignes jsonb, p_complet boolean default false,
  p_entite uuid default null, p_fichier text default null)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_entite uuid;
begin
  v_entite := private.cashd_entite(p_client, p_entite);
  perform private.cashd_exiger_gestion(p_client, v_entite);
  return private.cashd_integrer(p_client, v_entite, p_jeu, p_lignes, p_complet, 'import', left(coalesce(nullif(btrim(p_fichier), ''), 'dépôt depuis l''espace'), 200));
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Le modèle d'export « tableur » (facturiers : Sage, EBP, Cegid, Pennylane, Sellsy, Axonaut, QuickBooks, Excel)
-- ═══════════════════════════════════════════════════════════════════════════
-- En-têtes : synonymes courants, rapprochés par le lecteur d'exports d'A1 (forme normalisée, exacte ou par préfixe).
-- Hypothèses d'en-têtes à confirmer sur les exports du premier client (colonne source).

insert into public.modeles_jeux (module, logiciel, code, version, libelle, motif_fichier, entetes, colonnes, cle, complet, confirmer_disparition,
  seuil_perte, perte_min, seuil_anomalies, options, accuse, source)
values
('cashd', 'tableur', 'factures', 1, 'Factures clients non soldées', '(factures?|encours|impayes|echeancier|balance|clients?[_ -]?ouverts?|en[_ -]?cours)',
 array['Échéance'],
 '{"numero": {"type": "texte", "obligatoire": true, "libelle": "Numéro de facture", "entetes": ["N° facture", "Numéro de facture", "N° de facture", "Numéro", "Facture", "Pièce", "N° pièce", "Invoice number", "Invoice", "Référence"]},
   "nature": {"type": "texte", "facultative": true, "entetes": ["Type", "Type de pièce", "Nature", "Type de document"]},
   "compte_ref": {"type": "texte", "libelle": "Code client", "entetes": ["Code client", "N° client", "Compte client", "Compte", "Compte auxiliaire", "Code tiers", "Tiers", "Customer ID"]},
   "compte_nom": {"type": "texte", "libelle": "Client", "entetes": ["Client", "Nom du client", "Raison sociale", "Nom", "Intitulé", "Customer", "Customer name"]},
   "compte_siren": {"type": "texte", "facultative": true, "entetes": ["SIREN", "SIRET", "N° SIREN"]},
   "compte_email": {"type": "texte", "facultative": true, "entetes": ["E-mail", "Email", "Courriel", "E-mail de facturation", "Email facturation"]},
   "date_emission": {"type": "date", "obligatoire": true, "libelle": "Date de facture", "entetes": ["Date de facture", "Date facture", "Date d''émission", "Date", "Date pièce", "Invoice date"]},
   "echeance": {"type": "date", "libelle": "Échéance", "entetes": ["Échéance", "Date d''échéance", "Date échéance", "Due date", "À régler avant le"]},
   "montant_ht": {"type": "decimal", "facultative": true, "entetes": ["Montant HT", "Total HT", "HT", "Net HT", "Amount excl. tax"]},
   "montant_ttc": {"type": "decimal", "obligatoire": true, "libelle": "Montant TTC", "entetes": ["Montant TTC", "Total TTC", "TTC", "Montant", "Total", "Amount", "Total amount"]},
   "reste_du": {"type": "decimal", "libelle": "Reste dû", "entetes": ["Reste dû", "Reste à payer", "Restant dû", "Solde", "Solde dû", "Montant dû", "Reste à régler", "Balance due", "Amount due"]},
   "devise": {"type": "texte", "facultative": true, "entetes": ["Devise", "Currency"]},
   "commande_ref": {"type": "texte", "facultative": true, "entetes": ["N° commande", "Bon de commande", "Référence commande", "PO", "Purchase order"]}}'::jsonb,
 array['nature', 'numero'], true, 1, 0.5, 1, 0.05, '{}'::jsonb, true,
 'CASHD (C2) : hypothèses d''en-têtes des facturiers courants (Sage, EBP, Cegid, Pennylane, Sellsy, Axonaut, QuickBooks) ; à confirmer sur le premier export réel'),
('cashd', 'tableur', 'reglements', 1, 'Règlements clients reçus', '(reglements?|encaissements?|paiements?|recettes|releve|banque)',
 array['Montant'],
 '{"date": {"type": "date", "obligatoire": true, "libelle": "Date du règlement", "entetes": ["Date de règlement", "Date règlement", "Date d''encaissement", "Date de paiement", "Date opération", "Date valeur", "Date", "Payment date"]},
   "montant": {"type": "decimal", "obligatoire": true, "libelle": "Montant", "entetes": ["Montant", "Montant reçu", "Crédit", "Montant réglé", "Encaissement", "Amount"]},
   "compte_ref": {"type": "texte", "facultative": true, "entetes": ["Code client", "N° client", "Compte client", "Compte", "Code tiers", "Tiers"]},
   "compte_nom": {"type": "texte", "facultative": true, "entetes": ["Client", "Nom du client", "Raison sociale", "Payeur", "Émetteur"]},
   "facture_numero": {"type": "texte", "facultative": true, "entetes": ["N° facture", "Facture", "Facture réglée", "Pièce lettrée", "Invoice"]},
   "reference": {"type": "texte", "facultative": true, "entetes": ["Référence", "Réf.", "Référence du virement", "N° chèque", "Reference"]},
   "libelle": {"type": "texte", "facultative": true, "entetes": ["Libellé", "Libellé opération", "Description", "Motif"]},
   "mode": {"type": "texte", "facultative": true, "entetes": ["Mode", "Mode de règlement", "Moyen de paiement", "Type de paiement", "Payment method"]}}'::jsonb,
 array['date', 'montant', 'reference', 'facture_numero'], false, 1, 0.5, 1, 0.05, '{}'::jsonb, true,
 'CASHD (C2) : journal des encaissements ou relevé bancaire filtré sur les crédits ; hypothèses d''en-têtes à confirmer'),
('cashd', 'tableur', 'devis', 1, 'Devis envoyés', '(devis|propositions?|offres?)',
 array['Date'],
 '{"numero": {"type": "texte", "obligatoire": true, "entetes": ["N° devis", "Numéro de devis", "Numéro", "Devis", "Référence"]},
   "compte_ref": {"type": "texte", "entetes": ["Code client", "N° client", "Compte client", "Code tiers"]},
   "compte_nom": {"type": "texte", "entetes": ["Client", "Prospect", "Nom du client", "Raison sociale", "Nom"]},
   "compte_email": {"type": "texte", "facultative": true, "entetes": ["E-mail", "Email", "Courriel"]},
   "date_emission": {"type": "date", "obligatoire": true, "entetes": ["Date d''envoi", "Date du devis", "Date", "Envoyé le"]},
   "echeance": {"type": "date", "facultative": true, "entetes": ["Valide jusqu''au", "Validité", "Date de validité", "Expire le"]},
   "montant_ht": {"type": "decimal", "facultative": true, "entetes": ["Montant HT", "Total HT", "HT"]},
   "montant_ttc": {"type": "decimal", "entetes": ["Montant TTC", "Total TTC", "TTC", "Montant", "Total"]},
   "statut": {"type": "texte", "facultative": true, "entetes": ["Statut", "État", "Etat"]}}'::jsonb,
 array['numero'], true, 1, 0.5, 1, 0.05, '{}'::jsonb, true,
 'CASHD (C2) : devis envoyés, suivis jusqu''à la réponse ; hypothèses d''en-têtes à confirmer'),
('cashd', 'tableur', 'clients', 1, 'Fichier clients', '(clients?|tiers|comptes?)',
 array['Code client'],
 '{"code": {"type": "texte", "obligatoire": true, "entetes": ["Code client", "N° client", "Code", "Compte", "Code tiers", "Customer ID"]},
   "nom": {"type": "texte", "obligatoire": true, "entetes": ["Raison sociale", "Nom", "Client", "Intitulé", "Dénomination", "Customer name"]},
   "groupe": {"type": "texte", "facultative": true, "entetes": ["Groupe", "Maison mère", "Société mère"]},
   "siren": {"type": "texte", "facultative": true, "entetes": ["SIREN", "N° SIREN"]},
   "pays": {"type": "texte", "facultative": true, "entetes": ["Pays", "Code pays", "Country"]},
   "langue": {"type": "texte", "facultative": true, "entetes": ["Langue", "Langue de facturation", "Language"]},
   "devise": {"type": "texte", "facultative": true, "entetes": ["Devise", "Currency"]},
   "contact": {"type": "texte", "facultative": true, "entetes": ["Contact facturation", "Contact comptable", "Contact"]},
   "email": {"type": "texte", "facultative": true, "entetes": ["E-mail de facturation", "Email facturation", "E-mail", "Email", "Courriel"]},
   "telephone": {"type": "texte", "facultative": true, "entetes": ["Téléphone", "Tél.", "Phone"]},
   "email_commercial": {"type": "texte", "facultative": true, "entetes": ["E-mail commercial", "Email commercial", "Commercial"]},
   "delai_paiement": {"type": "entier", "facultative": true, "entetes": ["Délai de paiement", "Conditions de paiement (jours)", "Délai (jours)"]},
   "plafond": {"type": "decimal", "facultative": true, "entetes": ["Plafond d''encours", "Encours autorisé", "Plafond", "Credit limit"]}}'::jsonb,
 array['code'], false, 1, 0.5, 1, 0.05, '{}'::jsonb, true,
 'CASHD (C2) : fichier clients ; hypothèses d''en-têtes à confirmer')
on conflict (module, logiciel, code, version) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. Brancher le facturier, déposer un export, appliquer le relevé
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.cashd_brancher(p_client uuid, p_logiciel text default 'tableur', p_entite uuid default null, p_libelle text default null)
 returns uuid language plpgsql security definer set search_path to ''
as $function$
declare v_entite uuid; v_id uuid;
begin
  v_entite := private.cashd_entite(p_client, p_entite);
  perform private.cashd_exiger_gestion(p_client, v_entite);
  perform private.cashd_exiger_installe(p_client);
  if not exists (select 1 from public.modeles_jeux m where m.module = 'cashd' and m.logiciel = coalesce(p_logiciel, 'tableur')) then
    raise exception 'Aucun modèle d''export « % » pour CASHD.', p_logiciel using errcode = 'P0002';
  end if;
  v_id := private.brancher(p_client, 'cashd', coalesce(p_logiciel, 'tableur'), 'exports',
    left(coalesce(nullif(btrim(p_libelle), ''), 'Facturier — ' || (select e.nom from public.entites e where e.id = v_entite)), 200), v_entite, null, null);
  perform private.journaliser_module(p_client, 'cashd', 'cashd.facturier_branche', 'branchements', v_id::text,
    jsonb_build_object('logiciel', coalesce(p_logiciel, 'tableur')), v_entite);
  return v_id;
end $function$;

-- Déposer les fichiers d'un export (déjà mis dans le bucket omega-clients sous <client>/branchement/<id>/) : la chaîne
-- de relevés du socle les lit (lecteur d'exports d'A1), puis publie releve.pret.cashd.
create or replace function public.cashd_deposer_export(p_branchement uuid, p_fichiers jsonb)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare b public.branchements;
begin
  select * into b from public.branchements where id = p_branchement;
  if not found or b.module <> 'cashd' then
    raise exception 'Branchement CASHD introuvable.' using errcode = 'P0002';
  end if;
  perform private.cashd_exiger_gestion(b.client_id, b.entite_id);
  return private.recevoir_releve(p_branchement, p_fichiers, 'depot', null, null);
end $function$;

-- Appliquer un relevé prêt : chaque export « à appliquer » est d'abord appliqué par le socle (jeux_lignes = l'état du
-- jour), puis intégré dans les tables de CASHD, dans l'ordre clients → factures → devis → règlements.
create or replace function private.cashd_appliquer_releve(p_charge jsonb)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  b public.branchements;
  i record;
  v_res jsonb := '{}'::jsonb;
  v_lignes jsonb;
  v_complet boolean;
begin
  select * into b from public.branchements where id = (p_charge ->> 'branchement')::uuid;
  if not found or b.module <> 'cashd' then
    raise exception 'Branchement introuvable ou étranger à CASHD.' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.cashd_reglages g where g.client_id = b.client_id) then
    raise exception 'CASHD n''est pas installé pour cette organisation.' using errcode = '55000';
  end if;
  for i in
    select x.id, x.nom_fichier, j.code, j.id as jeu_id, coalesce(x.complet, j.complet) as complet
    from public.instantanes x join public.branchements_jeux j on j.id = x.jeu_id
    where x.releve_id = (p_charge ->> 'releve')::uuid and x.branchement_id = b.id and x.statut = 'a_appliquer'
    order by case j.code when 'clients' then 0 when 'factures' then 1 when 'devis' then 2 when 'reglements' then 3 else 9 end, x.recu_le
  loop
    perform private.acquitter_instantane(i.id, 'applique');
    if i.code = 'reglements' then
      -- Un journal d'encaissements : seules les lignes nouvelles de cet export comptent (idempotence par la clé).
      select coalesce(jsonb_agg(l.valeurs), '[]'::jsonb) into v_lignes from public.jeux_lignes l where l.jeu_id = i.jeu_id and l.instantane_id = i.id;
    else
      select coalesce(jsonb_agg(l.valeurs), '[]'::jsonb) into v_lignes from public.jeux_lignes l where l.jeu_id = i.jeu_id;
    end if;
    v_complet := i.complet;
    v_res := v_res || jsonb_build_object(i.code, private.cashd_integrer(b.client_id, b.entite_id, i.code, v_lignes, v_complet, 'export',
                                                                          left(coalesce(i.nom_fichier, 'export du facturier'), 200)));
  end loop;
  perform private.battre(b.client_id, 'cashd_releve', jsonb_build_object('branchement', b.id, 'releve', p_charge ->> 'releve'), interval '1 day');
  return v_res;
end $function$;

create or replace function private.cashd_traiter_travaux(p_nombre integer default 20)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  t public.travaux;
  r jsonb;
  n_ok integer := 0;
  n_ko integer := 0;
begin
  for t in select * from private.prendre_travaux(array['cashd.appliquer_releve'], p_nombre, interval '10 minutes', 'cashd-sql') loop
    begin
      r := private.cashd_appliquer_releve(t.charge);
      perform private.finir_travail(t.id, r);
      n_ok := n_ok + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 2000), true);
      n_ko := n_ko + 1;
    end;
  end loop;
  return jsonb_build_object('faits', n_ok, 'echecs', n_ko);
end $function$;

do $do$ begin
  if not exists (select 1 from private.abonnements a where a.evenement = 'releve.pret.cashd' and a.module = 'cashd') then
    insert into private.abonnements (evenement, module, genre) values ('releve.pret.cashd', 'cashd', 'cashd.appliquer_releve');
  end if;
end $do$;

do $do$ begin
  if not exists (select 1 from cron.job where jobname = 'cashd-releves') then
    perform cron.schedule('cashd-releves', '* * * * *', 'select private.cashd_traiter_travaux()');
  end if;
end $do$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. Lire d'un appel (sous les droits de qui lit)
-- ═══════════════════════════════════════════════════════════════════════════

-- Le tableau des impayés : l'encours échu au total, la balance âgée par tranche, les comptes, les règlements à imputer.
create or replace function public.cashd_tableau(p_client uuid, p_entite uuid default null)
 returns jsonb language sql stable security invoker set search_path to ''
as $function$
  with b as (select * from public.cashd_balance_agee x where x.client_id = p_client and (p_entite is null or x.entite_id = p_entite))
  select jsonb_build_object(
    'reglages', (select to_jsonb(g) from public.cashd_reglages g where g.client_id = p_client),
    'totaux', (select jsonb_build_object(
        'encours', coalesce(sum(b.encours), 0), 'echu', coalesce(sum(b.echu), 0), 'non_echu', coalesce(sum(b.non_echu), 0),
        'echu_1_30', coalesce(sum(b.echu_1_30), 0), 'echu_31_60', coalesce(sum(b.echu_31_60), 0),
        'echu_61_90', coalesce(sum(b.echu_61_90), 0), 'echu_plus_90', coalesce(sum(b.echu_plus_90), 0),
        'en_litige', coalesce(sum(b.en_litige), 0), 'credits', coalesce(sum(b.credits), 0),
        'comptes_en_retard', count(*) filter (where b.echu > 0), 'factures_echues', coalesce(sum(b.factures_echues), 0),
        'au_dessus_du_plafond', count(*) filter (where b.plafond_encours is not null and b.encours > b.plafond_encours)) from b),
    'comptes', (select coalesce(jsonb_agg(to_jsonb(b) || jsonb_build_object('depasse_plafond', b.plafond_encours is not null and b.encours > b.plafond_encours)
                                          order by b.echu desc, b.encours desc, b.nom), '[]'::jsonb) from b where b.encours > 0 or b.credits > 0 or b.statut <> 'actif'),
    'a_imputer', (select coalesce(jsonb_agg(to_jsonb(r) || jsonb_build_object('compte', (select c.nom from public.cashd_comptes c where c.id = r.compte_id))
                                            order by r.recu_le desc), '[]'::jsonb)
                  from public.cashd_reglements_etat r where r.client_id = p_client and r.a_imputer > 0 and (p_entite is null or r.entite_id = p_entite)),
    'devis_en_attente', (select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'numero', f.numero, 'compte_id', f.compte_id,
                                        'compte', (select c.nom from public.cashd_comptes c where c.id = f.compte_id), 'montant_ttc', f.montant_ttc,
                                        'date_emission', f.date_emission, 'jours_ecoules', f.jours_ecoules) order by f.date_emission), '[]'::jsonb)
                         from public.cashd_factures_etat f where f.client_id = p_client and f.nature = 'devis' and f.statut = 'en_attente'
                           and (p_entite is null or f.entite_id = p_entite)),
    'dernier_import', (select max(f.vue_le) from public.cashd_factures f where f.client_id = p_client))
  from (select 1) x
$function$;

-- La fiche d'un compte : le compte, sa balance, ses pièces (ouvertes d'abord), ses règlements, ses imputations.
create or replace function public.cashd_fiche_compte(p_compte uuid)
 returns jsonb language sql stable security invoker set search_path to ''
as $function$
  select case when c.id is null then null else jsonb_build_object(
    'compte', to_jsonb(c),
    'balance', (select to_jsonb(b) from public.cashd_balance_agee b where b.compte_id = c.id),
    'pieces', (select coalesce(jsonb_agg(to_jsonb(f) order by (f.reste_du > 0) desc, f.echeance nulls last, f.date_emission desc), '[]'::jsonb)
               from public.cashd_factures_etat f where f.compte_id = c.id),
    'reglements', (select coalesce(jsonb_agg(to_jsonb(r) order by r.recu_le desc, r.cree_le desc), '[]'::jsonb)
                   from public.cashd_reglements_etat r where r.compte_id = c.id),
    'imputations', (select coalesce(jsonb_agg(to_jsonb(x) || jsonb_build_object('facture', (select f.numero from public.cashd_factures f where f.id = x.facture_id))
                                              order by x.cree_le desc), '[]'::jsonb)
                    from public.cashd_imputations x join public.cashd_factures f on f.id = x.facture_id where f.compte_id = c.id)) end
  from (select 1) d left join public.cashd_comptes c on c.id = p_compte
$function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. Droits
-- ═══════════════════════════════════════════════════════════════════════════

-- Les fonctions privées : jamais exécutables par public, anon ni authenticated (aucune politique, aucune vue, aucune
-- fonction SECURITY INVOKER de public ne les appelle) ; le serveur seul.
revoke execute on function private.cashd_role_session() from public, anon, authenticated;
revoke execute on function private.cashd_exiger_gestion(uuid, uuid) from public, anon, authenticated;
revoke execute on function private.cashd_entite(uuid, uuid) from public, anon, authenticated;
revoke execute on function private.cashd_exiger_installe(uuid) from public, anon, authenticated;
revoke execute on function private.cashd_v(jsonb, text) from public, anon, authenticated;
revoke execute on function private.cashd_nombre(text) from public, anon, authenticated;
revoke execute on function private.cashd_date(text) from public, anon, authenticated;
revoke execute on function private.cashd_nature(text, numeric) from public, anon, authenticated;
revoke execute on function private.cashd_mode(text) from public, anon, authenticated;
revoke execute on function private.cashd_statut_devis(text) from public, anon, authenticated;
revoke execute on function private.cashd_reste(uuid) from public, anon, authenticated;
revoke execute on function private.cashd_a_imputer(uuid) from public, anon, authenticated;
revoke execute on function private.cashd_suivre_solde(uuid) from public, anon, authenticated;
revoke execute on function private.cashd_imputer(uuid, uuid, uuid, numeric, boolean, text) from public, anon, authenticated;
revoke execute on function private.cashd_lettrer_auto(uuid) from public, anon, authenticated;
revoke execute on function private.cashd_ecrire_compte(uuid, uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function private.cashd_ecrire_facture(uuid, uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function private.cashd_noter_reglement(uuid, uuid, numeric, date, text, text, uuid, uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function private.cashd_compte_pour(uuid, uuid, text, text, jsonb, text) from public, anon, authenticated;
revoke execute on function private.cashd_integrer(uuid, uuid, text, jsonb, boolean, text, text) from public, anon, authenticated;
revoke execute on function private.cashd_appliquer_releve(jsonb) from public, anon, authenticated;
revoke execute on function private.cashd_traiter_travaux(integer) from public, anon, authenticated;
grant execute on function private.cashd_integrer(uuid, uuid, text, jsonb, boolean, text, text) to service_role;
grant execute on function private.cashd_appliquer_releve(jsonb) to service_role;
grant execute on function private.cashd_traiter_travaux(integer) to service_role;

-- Les portes : authenticated (le contrôle des rôles est dans le corps) et le serveur ; jamais anon.
revoke execute on function public.cashd_installer(uuid, text) from public, anon;
revoke execute on function public.cashd_regler(uuid, jsonb) from public, anon;
revoke execute on function public.cashd_ecrire_compte(uuid, uuid, jsonb) from public, anon;
revoke execute on function public.cashd_ecrire_facture(uuid, uuid, jsonb) from public, anon;
revoke execute on function public.cashd_noter_reglement(uuid, uuid, numeric, date, text, text, uuid, uuid) from public, anon;
revoke execute on function public.cashd_lettrer(uuid, uuid, numeric) from public, anon;
revoke execute on function public.cashd_imputer_avoir(uuid, uuid, numeric) from public, anon;
revoke execute on function public.cashd_annuler_imputation(uuid, text) from public, anon;
revoke execute on function public.cashd_annuler_reglement(uuid, text) from public, anon;
revoke execute on function public.cashd_propositions(uuid) from public, anon;
revoke execute on function public.cashd_importer(uuid, text, jsonb, boolean, uuid, text) from public, anon;
revoke execute on function public.cashd_brancher(uuid, text, uuid, text) from public, anon;
revoke execute on function public.cashd_deposer_export(uuid, jsonb) from public, anon;
revoke execute on function public.cashd_tableau(uuid, uuid) from public, anon;
revoke execute on function public.cashd_fiche_compte(uuid) from public, anon;
grant execute on function public.cashd_installer(uuid, text) to authenticated, service_role;
grant execute on function public.cashd_regler(uuid, jsonb) to authenticated, service_role;
grant execute on function public.cashd_ecrire_compte(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function public.cashd_ecrire_facture(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function public.cashd_noter_reglement(uuid, uuid, numeric, date, text, text, uuid, uuid) to authenticated, service_role;
grant execute on function public.cashd_lettrer(uuid, uuid, numeric) to authenticated, service_role;
grant execute on function public.cashd_imputer_avoir(uuid, uuid, numeric) to authenticated, service_role;
grant execute on function public.cashd_annuler_imputation(uuid, text) to authenticated, service_role;
grant execute on function public.cashd_annuler_reglement(uuid, text) to authenticated, service_role;
grant execute on function public.cashd_propositions(uuid) to authenticated, service_role;
grant execute on function public.cashd_importer(uuid, text, jsonb, boolean, uuid, text) to authenticated, service_role;
grant execute on function public.cashd_brancher(uuid, text, uuid, text) to authenticated, service_role;
grant execute on function public.cashd_deposer_export(uuid, jsonb) to authenticated, service_role;
grant execute on function public.cashd_tableau(uuid, uuid) to authenticated, service_role;
grant execute on function public.cashd_fiche_compte(uuid) to authenticated, service_role;
