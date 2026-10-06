-- c2_02 — CASHD, palier 2 : le moteur de relance (session C2, 06/10/2026).
--
-- CE QUE ÇA POSE. Chaque matin, à l'heure réglée (7 h, heure de Paris, par défaut), CASHD relit l'état du jour (le
-- facturier relu par c2_01) et écrit les relances : un message par compte et par jour, qui reprend chaque facture
-- arrivée à un palier de sa propre séquence. Rien ne part sans validation humaine :
--   · la relance dépose une demande de validation du socle (module cashd, type cashd.relance, cashd.mise_en_demeure
--     ou cashd.devis), avec son MONTANT : au-delà du seuil fixé par l'organisation, une règle de validation la fait
--     remonter à la direction (gérant, administrateur) ;
--   · le message est préparé par private.preparer_envoi, ADOSSÉ à cette demande : il ne part que si elle est approuvée,
--     en mode essai tant que l'envoi de CASHD est réglé en essai ;
--   · la mise en demeure n'est jamais couverte par un accord permanent : si un accord l'approuvait d'office, elle n'est
--     pas préparée et une alerte le dit.
-- Les paliers (ceux que le site promet) : facture — rappel courtois à J+7 de l'échéance, relance ferme à J+21 (elle
-- récapitule les sommes dues, l'indemnité et les pénalités, et fixe une échéance), mise en demeure à J+30 ; devis —
-- J+3 puis J+10 (sept jours après le rappel). Réglables par organisation et par compte. Un palier manqué n'est pas
-- sauté : la fermeté monte d'un cran à la fois, au moins cinq jours entre deux paliers d'une même facture.
-- Pénalités et indemnité (Code de commerce, art. L441-10 et D441-5, règles reprises de b6_16) : indemnité forfaitaire
-- de 40 € par facture payée en retard (sauf compte particulier) ; pénalités au taux réglé, sur le reste dû, du
-- lendemain de l'échéance au jour du calcul.
-- Ce qui suspend : compte en pause, en litige, en recouvrement, hors périmètre, en attente de contact ou réciproque ;
-- facture en litige ; règlement du compte non lettré (l'imputation d'abord) ; reste dû sous le seuil de relance.
-- Ce qui coupe ce qui est prêt : un règlement, une facture sortie de l'export, un litige, une pause — la demande en
-- attente est annulée (le socle annule l'envoi qui lui est adossé) et la relance passe « coupée ».
-- Le point du matin (deposer_section du socle) : qui doit quoi, où en est la relance, ce qui attend la validation.
--
-- Règles de pose : alter … add column if not exists / create … if not exists / create or replace ; jamais de DROP ni
-- de DELETE. RLS sur toute table, revoke all puis grants ; vues security_invoker ; revoke execute de public sur les
-- fonctions privées.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. Les colonnes nouvelles
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.cashd_reglages add column if not exists heure_relances time not null default time '07:00';
alter table public.cashd_reglages add column if not exists scenario jsonb not null
  default '[{"palier": "rappel", "jours": 7}, {"palier": "relance", "jours": 21}, {"palier": "mise_en_demeure", "jours": 30}]'::jsonb;
alter table public.cashd_reglages add column if not exists scenario_devis jsonb not null
  default '[{"palier": "devis_rappel", "jours": 3}, {"palier": "devis_relance", "jours": 10}]'::jsonb;
alter table public.cashd_reglages add column if not exists ecart_paliers_jours smallint not null default 5;
alter table public.cashd_reglages add column if not exists seuil_direction numeric(14,2);
alter table public.cashd_reglages add column if not exists regle_direction_id uuid;
alter table public.cashd_reglages add column if not exists signature text;
alter table public.cashd_reglages add column if not exists formule text;
alter table public.cashd_reglages add column if not exists interdits text[] not null default '{}';
alter table public.cashd_reglages add column if not exists delai_mise_en_demeure_jours smallint not null default 8;

alter table public.cashd_comptes add column if not exists secteur text;
alter table public.cashd_comptes add column if not exists scenario jsonb;
alter table public.cashd_comptes add column if not exists particulier boolean not null default false;

do $do$ begin
  if not exists (select 1 from pg_constraint where conname = 'cashd_reglages_scenario_check') then
    alter table public.cashd_reglages add constraint cashd_reglages_scenario_check check (
      jsonb_typeof(scenario) = 'array' and jsonb_array_length(scenario) between 1 and 6
      and jsonb_typeof(scenario_devis) = 'array' and jsonb_array_length(scenario_devis) between 0 and 4);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cashd_reglages_textes_check') then
    alter table public.cashd_reglages add constraint cashd_reglages_textes_check check (
      char_length(signature) <= 600 and char_length(formule) <= 300 and cardinality(interdits) <= 50
      and ecart_paliers_jours between 1 and 30 and delai_mise_en_demeure_jours between 1 and 30
      and (seuil_direction is null or seuil_direction >= 0));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cashd_comptes_secteur_check') then
    alter table public.cashd_comptes add constraint cashd_comptes_secteur_check check (
      char_length(secteur) <= 120 and (scenario is null or (jsonb_typeof(scenario) = 'array' and jsonb_array_length(scenario) between 1 and 6)));
  end if;
end $do$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Les relances
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.cashd_relances (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  compte_id uuid not null,
  jour date not null,
  nature text not null default 'facture',
  palier text not null,
  langue text not null default 'fr',
  canal text not null default 'email',
  destinataire_adresse text,
  destinataire_nom text,
  sujet text,
  corps text,
  montant numeric(14,2) not null default 0,
  penalites numeric(14,2) not null default 0,
  indemnites numeric(14,2) not null default 0,
  statut text not null default 'preparee',
  motif text,
  demande_id uuid,
  envoi_id uuid,
  prepare_par uuid,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint cashd_relances_client_id_id_key unique (client_id, id),
  constraint cashd_relances_une_par_jour unique (compte_id, jour, nature),
  constraint cashd_relances_compte_fkey foreign key (client_id, compte_id) references public.cashd_comptes(client_id, id),
  constraint cashd_relances_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id),
  constraint cashd_relances_nature_check check (nature in ('facture', 'devis')),
  constraint cashd_relances_palier_check check (palier ~ '^[a-z][a-z_]{1,39}$'),
  constraint cashd_relances_canal_check check (canal in ('email', 'lre', 'whatsapp', 'appel')),
  constraint cashd_relances_statut_check check (statut in ('preparee', 'a_valider', 'non_reglee', 'sans_adresse', 'bloquee', 'coupee', 'echec')),
  constraint cashd_relances_textes_check check (char_length(sujet) <= 300 and char_length(corps) <= 20000 and char_length(motif) <= 500
                                                and char_length(destinataire_adresse) <= 254 and char_length(destinataire_nom) <= 200)
);
create index if not exists cashd_relances_client_idx on public.cashd_relances (client_id, jour desc);

create table if not exists public.cashd_relances_pieces (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  relance_id uuid not null,
  facture_id uuid not null,
  palier text not null,
  rang smallint not null,
  reste_du numeric(14,2) not null,
  retard_jours integer not null default 0,
  penalites numeric(14,2) not null default 0,
  indemnite numeric(14,2) not null default 0,
  annulee boolean not null default false,
  cree_le timestamptz not null default now(),
  constraint cashd_relances_pieces_relance_fkey foreign key (client_id, relance_id) references public.cashd_relances(client_id, id),
  constraint cashd_relances_pieces_facture_fkey foreign key (client_id, facture_id) references public.cashd_factures(client_id, id)
);
create unique index if not exists cashd_relances_pieces_un_palier on public.cashd_relances_pieces (facture_id, palier) where not annulee;
create index if not exists cashd_relances_pieces_relance_idx on public.cashd_relances_pieces (relance_id);

create table if not exists public.cashd_passages (
  client_id uuid not null references public.clients(id) on delete cascade,
  jour date not null,
  fait_le timestamptz not null default now(),
  bilan jsonb not null default '{}'::jsonb,
  primary key (client_id, jour)
);

alter table public.cashd_relances enable row level security;
alter table public.cashd_relances_pieces enable row level security;
alter table public.cashd_passages enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cashd_relances' and policyname = 'les membres lisent les relances de leur perimetre') then
    create policy "les membres lisent les relances de leur perimetre" on public.cashd_relances for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cashd_relances_pieces' and policyname = 'les membres lisent les pieces des relances qu''ils voient') then
    create policy "les membres lisent les pieces des relances qu'ils voient" on public.cashd_relances_pieces for select to authenticated
      using (client_id in (select private.mes_clients())
             and exists (select 1 from public.cashd_relances r where r.id = cashd_relances_pieces.relance_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'cashd_passages' and policyname = 'les membres lisent les passages cashd') then
    create policy "les membres lisent les passages cashd" on public.cashd_passages for select to authenticated
      using (client_id in (select private.mes_clients()));
  end if;
end $do$;
revoke all on table public.cashd_relances, public.cashd_relances_pieces, public.cashd_passages from anon, authenticated;
grant select on table public.cashd_relances, public.cashd_relances_pieces, public.cashd_passages to authenticated;
do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom)
               select x from unnest(array['cashd_relances', 'cashd_relances_pieces', 'cashd_passages']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. Les vues : l'état de chaque relance, et la séquence de chaque facture
-- ═══════════════════════════════════════════════════════════════════════════

-- Une relance et son état vu de la file : à valider, approuvée, refusée, partie (date de l'envoi), coupée…
-- Lecture des demandes et des envois du socle sous la RLS du lecteur.
-- Rejouable même après une migration plus récente qui a étendu la vue (colonnes ajoutées à la fin) :
-- dans ce cas la définition plus récente est gardée.
do $vue$ begin
  execute $v$
create or replace view public.cashd_relances_etat with (security_invoker = true) as
select r.*,
       d.statut as demande_statut, d.decide_le, d.politique_id,
       e.statut as envoi_statut, e.mode as envoi_mode, e.envoye_le,
       case
         when r.statut <> 'a_valider' then r.statut
         when e.statut = 'envoye' or e.envoye_le is not null then 'envoyee'
         when d.statut = 'approuvee' then 'validee'
         when d.statut = 'rejetee' then 'refusee'
         when d.statut in ('annulee', 'expiree') then 'coupee'
         else 'a_valider' end as etat,
       (select count(*) from public.cashd_relances_pieces p where p.relance_id = r.id and not p.annulee)::integer as nb_pieces
from public.cashd_relances r
left join public.demandes_validation d on d.id = r.demande_id
left join public.envois e on e.id = r.envoi_id
$v$;
exception when invalid_table_definition then
  raise notice 'public.cashd_relances_etat : déjà étendue par une migration plus récente que c2_02, gardée telle quelle.';
end $vue$;

-- Chaque pièce suivie : le dernier palier atteint, son état, le palier suivant et sa date. Le scénario est celui du
-- compte, ou celui de l'organisation.
-- Rejouable même après une migration plus récente qui a étendu la vue (colonnes ajoutées à la fin) :
-- dans ce cas la définition plus récente est gardée.
do $vue$ begin
  execute $v$
create or replace view public.cashd_suivi with (security_invoker = true) as
with f as (
  select x.*, c.statut as compte_statut, c.reciproque,
         case when x.nature = 'devis' then g.scenario_devis else coalesce(c.scenario, g.scenario) end as sc,
         g.ecart_paliers_jours
  from public.cashd_factures_etat x
  join public.cashd_comptes c on c.id = x.compte_id
  join public.cashd_reglages g on g.client_id = x.client_id
  where (x.nature in ('facture', 'acompte') and x.statut in ('ouverte', 'litige') and x.reste_du > 0)
     or (x.nature = 'devis' and x.statut = 'en_attente')
), dernier as (
  select distinct on (p.facture_id) p.facture_id, p.palier, p.rang, r.jour, r.id as relance_id, r.statut
  from public.cashd_relances_pieces p join public.cashd_relances r on r.id = p.relance_id
  where not p.annulee
  order by p.facture_id, p.rang desc, r.jour desc
)
select f.id as facture_id, f.client_id, f.entite_id, f.compte_id, f.nature, f.numero, f.reste_du, f.montant_ttc, f.echeance,
       f.date_emission, f.retard_jours, f.jours_ecoules, f.statut, f.compte_statut,
       d.palier as palier_atteint, d.jour as palier_atteint_le, d.relance_id as derniere_relance_id, d.statut as derniere_relance_statut,
       s.palier as palier_suivant,
       case when s.palier is null then null
            else greatest(case when f.nature = 'devis' then f.date_emission else coalesce(f.echeance, f.date_emission) end + (s.jours)::integer,
                          coalesce(d.jour + f.ecart_paliers_jours, (now() at time zone 'Europe/Paris')::date)) end as palier_suivant_le,
       case
         when f.statut = 'litige' then 'litige'
         when f.reciproque then 'reciproque'
         when f.compte_statut <> 'actif' then f.compte_statut
         when s.palier is null and d.palier is not null then 'sequence_terminee'
         when d.palier is null then 'pas_encore_relancee'
         else 'en_cours' end as etat_sequence
from f
left join dernier d on d.facture_id = f.id
left join lateral (
  select x.value ->> 'palier' as palier, (x.value ->> 'jours')::integer as jours, x.ordinality
  from jsonb_array_elements(f.sc) with ordinality x
  where x.ordinality > coalesce(d.rang, 0)
  order by x.ordinality limit 1) s on true
$v$;
exception when invalid_table_definition then
  raise notice 'public.cashd_suivi : déjà étendue par une migration plus récente que c2_02, gardée telle quelle.';
end $vue$;

revoke all on table public.cashd_relances_etat, public.cashd_suivi from anon, authenticated;
grant select on table public.cashd_relances_etat, public.cashd_suivi to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Les aides du moteur
-- ═══════════════════════════════════════════════════════════════════════════

-- Un montant en euros à la française : « 12 345,60 € » (espaces insécables).
create or replace function private.cashd_eur(p numeric, p_langue text default 'fr')
 returns text language sql immutable set search_path to ''
as $function$
  select case when p_langue = 'en' then '€' || to_char(coalesce(p, 0), 'FM999,999,999,990.00')
              else translate(to_char(coalesce(p, 0), 'FM999,999,999,990.00'), ',.', chr(8239) || ',') || chr(160) || '€' end
$function$;

create or replace function private.cashd_date_texte(p date, p_langue text default 'fr')
 returns text language sql immutable set search_path to ''
as $function$ select case when p_langue = 'en' then to_char(p, 'DD/MM/YYYY') else to_char(p, 'DD/MM/YYYY') end $function$;

-- L'indemnité et les pénalités d'une facture à une date (L441-10 ; calcul de b6_16, sur le reste dû).
create or replace function private.cashd_penalites(p_facture uuid, p_jour date)
 returns jsonb language sql stable security definer set search_path to ''
as $function$
  select jsonb_build_object(
    'retard_jours', greatest(p_jour - f.echeance, 0),
    'indemnite', case when f.echeance < p_jour and not c.particulier then g.indemnite_forfaitaire else 0 end,
    'penalites', case when g.taux_penalites is null or f.echeance is null or f.echeance >= p_jour then 0
                      else round(g.taux_penalites / 365.0 * private.cashd_reste(f.id) * (p_jour - f.echeance), 2) end,
    'taux', g.taux_penalites)
  from public.cashd_factures f
  join public.cashd_comptes c on c.id = f.compte_id
  join public.cashd_reglages g on g.client_id = f.client_id
  where f.id = p_facture
$function$;

-- Le compte a-t-il déjà payé en retard ? (l'historique de paiement pèse sur le ton)
create or replace function private.cashd_payeur_en_retard(p_compte uuid)
 returns boolean language sql stable security definer set search_path to ''
as $function$
  select exists (
    select 1 from public.cashd_factures f
    where f.compte_id = p_compte and f.nature in ('facture', 'acompte') and f.statut = 'soldee' and f.echeance is not null
      and (select max(r.recu_le) from public.cashd_imputations x join public.cashd_reglements r on r.id = x.reglement_id
           where x.facture_id = f.id and x.annulee_le is null) > f.echeance + 15)
$function$;

-- Couper ce qui est prêt : les relances encore en attente de validation qui portent une facture (ou un compte) qui ne
-- doit plus être relancé. La demande en attente est annulée (le socle annule l'envoi adossé), la relance passe
-- « coupée », ses paliers sont libérés pour les factures encore dues (sauf remplacement). Rend le nombre coupé.
create or replace function private.cashd_couper(p_client uuid, p_compte uuid, p_facture uuid, p_motif text,
  p_liberer boolean default true, p_nature text default null, p_avant date default null)
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare
  r record;
  n integer := 0;
begin
  for r in
    select x.* from public.cashd_relances x
    where x.client_id = p_client and x.statut in ('a_valider', 'non_reglee', 'sans_adresse', 'bloquee', 'preparee')
      and (p_compte is null or x.compte_id = p_compte)
      and (p_nature is null or x.nature = p_nature)
      and (p_avant is null or x.jour < p_avant)
      and (p_facture is null or exists (select 1 from public.cashd_relances_pieces p where p.relance_id = x.id and p.facture_id = p_facture and not p.annulee))
      and (x.demande_id is null or exists (select 1 from public.demandes_validation d where d.id = x.demande_id and d.statut = 'en_attente'))
    for update
  loop
    if r.demande_id is not null then
      begin
        update public.demandes_validation set statut = 'annulee' where id = r.demande_id and statut = 'en_attente';
      exception when others then
        perform private.lever_alerte_module(p_client, 'cashd', 'critique',
          'Une relance n''a pas pu être retirée de la file de validation : refusez-la à la main.',
          jsonb_build_object('relance', r.id, 'demande', r.demande_id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)),
          'relance:coupure:' || r.id::text, true, null);
        continue;
      end;
    end if;
    update public.cashd_relances set statut = 'coupee', motif = left(p_motif, 500), maj_le = now() where id = r.id;
    -- Les paliers d'une relance coupée sont rendus (elle sera réécrite si la facture est encore due), sauf quand elle
    -- est remplacée par une relance plus ferme : son palier compte alors comme atteint.
    if coalesce(p_liberer, true) then
      update public.cashd_relances_pieces set annulee = true where relance_id = r.id;
    end if;
    perform private.journaliser_module(p_client, 'cashd', 'cashd.relance_coupee', 'cashd_relances', r.id::text,
      jsonb_build_object('motif', left(p_motif, 500), 'compte', r.compte_id, 'palier', r.palier, 'demande', r.demande_id), r.entite_id);
    n := n + 1;
  end loop;
  return n;
end $function$;

-- Relire avant d'envoyer : coupe chaque relance en attente dont une facture n'est plus due (réglée, sortie de
-- l'export, en litige, sous le seuil) ou dont le compte n'est plus actif.
create or replace function private.cashd_verifier_relances(p_client uuid)
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare
  r record;
  n integer := 0;
  g public.cashd_reglages;
begin
  select * into g from public.cashd_reglages where client_id = p_client;
  for r in
    select distinct x.id, x.compte_id,
      case when c.statut <> 'actif' or c.reciproque then 'compte ' || replace(c.statut, '_', ' ')
           else 'facture ' || f.numero || case when f.statut = 'litige' then ' en litige'
                                                when f.nature = 'devis' and f.statut <> 'en_attente' then ' : devis ' || f.statut
                                                else ' réglée ou sortie de l''export' end end as motif,
      p.facture_id
    from public.cashd_relances x
    join public.cashd_comptes c on c.id = x.compte_id
    join public.cashd_relances_pieces p on p.relance_id = x.id and not p.annulee
    join public.cashd_factures f on f.id = p.facture_id
    where x.client_id = p_client and x.statut in ('a_valider', 'non_reglee', 'sans_adresse', 'bloquee', 'preparee')
      and (c.statut <> 'actif' or c.reciproque
           or (f.nature = 'devis' and f.statut <> 'en_attente')
           or (f.nature <> 'devis' and (f.statut <> 'ouverte' or private.cashd_reste(f.id) <= greatest(g.seuil_relance, 0.005))))
  loop
    n := n + private.cashd_couper(p_client, null, r.facture_id, 'avant l''envoi : ' || r.motif);
  end loop;
  return n;
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Écrire le texte d'une relance
-- ═══════════════════════════════════════════════════════════════════════════
-- Le ton suit le palier, le montant, l'ancienneté du retard et l'historique de paiement du compte ; le message reprend
-- le secteur du compte, sa référence, chaque facture (numéro, date, montant, reste dû, échéance, retard), la formule et
-- la signature réglées par l'organisation. Deux langues : français, anglais (comptes export).

create or replace function private.cashd_ecrire_texte(p_relance uuid)
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare
  r public.cashd_relances;
  c public.cashd_comptes;
  g public.cashd_reglages;
  v_emetteur text;
  v_l text;
  v_lignes text := '';
  v_total numeric := 0;
  v_pen numeric := 0;
  v_ind numeric := 0;
  v_n integer := 0;
  v_max_retard integer := 0;
  v_ttc_total numeric := 0;
  v_retardataire boolean;
  v_bonjour text;
  v_sujet text;
  v_corps text;
  v_limite date;
  v_ref text;
  p record;
begin
  select * into r from public.cashd_relances where id = p_relance;
  select * into c from public.cashd_comptes where id = r.compte_id;
  select * into g from public.cashd_reglages where client_id = r.client_id;
  v_l := case when r.langue = 'en' then 'en' else 'fr' end;
  v_emetteur := coalesce((select e.nom from public.entites e where e.id = r.entite_id), (select x.nom from public.clients x where x.id = r.client_id));
  v_retardataire := private.cashd_payeur_en_retard(c.id);
  v_ref := c.reference || case when c.secteur is not null then case when v_l = 'en' then ', ' || c.secteur || ' sector' else ', secteur ' || c.secteur end else '' end;
  for p in
    select x.*, f.numero, f.date_emission, f.echeance, f.montant_ttc
    from public.cashd_relances_pieces x join public.cashd_factures f on f.id = x.facture_id
    where x.relance_id = r.id and not x.annulee
    order by f.echeance nulls last, f.date_emission, f.numero
  loop
    v_n := v_n + 1;
    v_total := v_total + p.reste_du;
    v_ttc_total := v_ttc_total + p.montant_ttc;
    v_pen := v_pen + p.penalites;
    v_ind := v_ind + p.indemnite;
    v_max_retard := greatest(v_max_retard, p.retard_jours);
    if r.nature = 'devis' then
      v_lignes := v_lignes || case when v_l = 'en'
        then format(E'  • Quote %s of %s: %s\n', p.numero, private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l))
        else format(E'  • Devis %s du %s : %s\n', p.numero, private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l)) end;
    else
      v_lignes := v_lignes || case when v_l = 'en'
        then format(E'  • Invoice %s of %s, %s incl. VAT, due on %s (%s days overdue): %s outstanding\n', p.numero,
                    private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l), private.cashd_date_texte(p.echeance, v_l),
                    p.retard_jours, private.cashd_eur(p.reste_du, v_l))
        else format(E'  • Facture %s du %s, %s TTC, échue le %s (%s jour%s de retard) : %s restant dus\n', p.numero,
                    private.cashd_date_texte(p.date_emission, v_l), private.cashd_eur(p.montant_ttc, v_l), private.cashd_date_texte(p.echeance, v_l),
                    p.retard_jours, case when p.retard_jours > 1 then 's' else '' end, private.cashd_eur(p.reste_du, v_l)) end;
    end if;
  end loop;
  v_bonjour := case when v_l = 'en' then 'Dear ' || coalesce(c.contact_facturation_nom, 'Sir or Madam') || ','
                    else 'Bonjour' || coalesce(' ' || c.contact_facturation_nom, ' Madame, Monsieur') || ',' end;
  v_limite := r.jour + g.delai_mise_en_demeure_jours;

  if r.nature = 'devis' then
    if v_l = 'en' then
      v_sujet := format('%s — following up on our quote%s', v_emetteur, case when v_n > 1 then 's' else ' ' || (select f.numero from public.cashd_relances_pieces x join public.cashd_factures f on f.id = x.facture_id where x.relance_id = r.id and not x.annulee limit 1) end);
      v_corps := v_bonjour || E'\n\n' || format(E'We sent you the following quote%s (account %s):\n', case when v_n > 1 then 's' else '' end, v_ref) || v_lignes
        || case when r.palier = 'devis_rappel' then E'\nDo you have any questions, or would you like us to adjust anything? We will be glad to discuss it.\n'
                else E'\nWe would be grateful for your decision so that we can plan the work. If the project has changed, a short reply is enough.\n' end;
    else
      v_sujet := format('%s — votre devis%s', v_emetteur, case when v_n > 1 then ' (' || v_n || ')' else ' ' || (select f.numero from public.cashd_relances_pieces x join public.cashd_factures f on f.id = x.facture_id where x.relance_id = r.id and not x.annulee limit 1) end);
      v_corps := v_bonjour || E'\n\n' || format(E'Nous vous avons adressé le%s devis suivant%s (compte %s) :\n', case when v_n > 1 then 's' else '' end, case when v_n > 1 then 's' else '' end, v_ref) || v_lignes
        || case when r.palier = 'devis_rappel' then E'\nAvez-vous des questions, ou souhaitez-vous que nous l''ajustions ? Nous en parlerons volontiers.\n'
                else E'\nVotre réponse nous permettrait de planifier les travaux. Si le projet a changé, un mot suffit pour nous le dire.\n' end;
    end if;
  elsif r.palier = 'mise_en_demeure' then
    if v_l = 'en' then
      v_sujet := format('%s — formal notice to pay %s', v_emetteur, private.cashd_eur(v_total, v_l));
      v_corps := v_bonjour || E'\n\n' || format(E'Despite our previous reminders, the following amounts remain unpaid (account %s):\n', v_ref) || v_lignes
        || format(E'\nWe hereby give you formal notice to pay the sum of %s within %s days of receipt of this letter, that is by %s at the latest.\n',
                  private.cashd_eur(v_total, v_l), g.delai_mise_en_demeure_jours, private.cashd_date_texte(v_limite, v_l))
        || case when v_ind > 0 or v_pen > 0 then format(E'Under articles L441-10 and D441-5 of the French Commercial Code, late payment interest%s and a fixed recovery fee of %s per invoice (%s in total) are also due.\n',
                  case when v_pen > 0 then ' (' || private.cashd_eur(v_pen, v_l) || ' to date)' else '' end, private.cashd_eur(g.indemnite_forfaitaire, v_l), private.cashd_eur(v_ind, v_l)) else '' end
        || E'Failing payment within this period, we will initiate recovery proceedings without further notice.\n';
    else
      v_sujet := format('%s — mise en demeure de payer %s', v_emetteur, private.cashd_eur(v_total, v_l));
      v_corps := v_bonjour || E'\n\n' || format(E'Malgré nos précédentes relances, les sommes suivantes restent impayées (compte %s) :\n', v_ref) || v_lignes
        || format(E'\nPar la présente, nous vous mettons en demeure de régler la somme de %s dans un délai de %s jours à compter de la réception de ce courrier, soit au plus tard le %s.\n',
                  private.cashd_eur(v_total, v_l), g.delai_mise_en_demeure_jours, private.cashd_date_texte(v_limite, v_l))
        || case when v_ind > 0 or v_pen > 0 then format(E'En application des articles L441-10 et D441-5 du Code de commerce, sont également dues des pénalités de retard%s et une indemnité forfaitaire pour frais de recouvrement de %s par facture (%s au total).\n',
                  case when v_pen > 0 then ' (' || private.cashd_eur(v_pen, v_l) || ' à ce jour)' else '' end, private.cashd_eur(g.indemnite_forfaitaire, v_l), private.cashd_eur(v_ind, v_l)) else '' end
        || E'À défaut de règlement dans ce délai, nous engagerons une procédure de recouvrement, sans autre avis.\n';
    end if;
  elsif r.palier = 'rappel' or (select x.rang from public.cashd_relances_pieces x where x.relance_id = r.id and not x.annulee order by x.rang desc limit 1) = 1 then
    if v_l = 'en' then
      v_sujet := format('%s — reminder: %s overdue', v_emetteur, case when v_n > 1 then v_n || ' invoices' else 'invoice ' || (select f.numero from public.cashd_relances_pieces x join public.cashd_factures f on f.id = x.facture_id where x.relance_id = r.id and not x.annulee limit 1) end);
      v_corps := v_bonjour || E'\n\n' || format(E'Unless we are mistaken, the following amount%s remain%s unpaid on your account %s:\n', case when v_n > 1 then 's' else '' end, case when v_n > 1 then '' else 's' end, v_ref) || v_lignes
        || case when not v_retardataire then E'\nThis is probably a simple oversight. ' else E'\n' end
        || E'If payment has already been made, please disregard this message. Should you have any question about this invoice, simply reply to this e-mail.\n';
    else
      v_sujet := format('%s — rappel : %s', v_emetteur, case when v_n > 1 then v_n || ' factures échues' else 'facture ' || (select f.numero from public.cashd_relances_pieces x join public.cashd_factures f on f.id = x.facture_id where x.relance_id = r.id and not x.annulee limit 1) || ' échue' end);
      v_corps := v_bonjour || E'\n\n' || format(E'Sauf erreur de notre part, %s sur votre compte %s :\n', case when v_n > 1 then 'les sommes suivantes restent dues' else 'la somme suivante reste due' end, v_ref) || v_lignes
        || case when not v_retardataire then E'\nIl s''agit sans doute d''un simple oubli. ' else E'\n' end
        || E'Si le règlement est déjà parti, merci de ne pas tenir compte de ce message. Pour toute question sur cette facture, il vous suffit de répondre à ce courriel.\n';
    end if;
  else
    -- La relance ferme : elle récapitule les sommes dues, ce que le retard ouvre de droit, et fixe une échéance.
    if v_l = 'en' then
      v_sujet := format('%s — second reminder: %s outstanding', v_emetteur, private.cashd_eur(v_total, v_l));
      v_corps := v_bonjour || E'\n\n' || format(E'Despite our reminder, the following amount%s still remain%s unpaid on your account %s:\n', case when v_n > 1 then 's' else '' end, case when v_n > 1 then '' else 's' end, v_ref) || v_lignes
        || format(E'\nTotal outstanding: %s. Please settle it by %s at the latest.\n', private.cashd_eur(v_total, v_l), private.cashd_date_texte(v_limite, v_l))
        || case when v_ind > 0 then format(E'We remind you that any late payment entitles us to a fixed recovery fee of %s per invoice and to late payment interest (French Commercial Code, art. L441-10).\n', private.cashd_eur(g.indemnite_forfaitaire, v_l)) else '' end
        || E'If you dispute any part of these amounts, please let us know in writing so that we can look into it.\n';
    else
      v_sujet := format('%s — relance : %s restent dus', v_emetteur, private.cashd_eur(v_total, v_l));
      v_corps := v_bonjour || E'\n\n' || format(E'Malgré notre précédent rappel, %s sur votre compte %s :\n', case when v_n > 1 then 'les sommes suivantes restent impayées' else 'la somme suivante reste impayée' end, v_ref) || v_lignes
        || format(E'\nTotal restant dû : %s. Nous vous remercions de procéder au règlement au plus tard le %s.\n', private.cashd_eur(v_total, v_l), private.cashd_date_texte(v_limite, v_l))
        || case when v_ind > 0 then format(E'Nous vous rappelons que tout retard de paiement rend exigibles une indemnité forfaitaire pour frais de recouvrement de %s par facture et des pénalités de retard (Code de commerce, art. L441-10).\n', private.cashd_eur(g.indemnite_forfaitaire, v_l)) else '' end
        || E'Si vous contestez tout ou partie de ces montants, merci de nous l''écrire pour que nous l''examinions.\n';
    end if;
  end if;
  v_corps := v_corps || E'\n' || coalesce(nullif(btrim(g.formule), ''), case when v_l = 'en' then 'Kind regards,' else 'Nous vous prions d''agréer, Madame, Monsieur, nos salutations distinguées.' end)
             || E'\n' || coalesce(nullif(btrim(g.signature), ''), v_emetteur) || E'\n';
  return jsonb_build_object('sujet', left(v_sujet, 300), 'corps', v_corps, 'montant', v_total, 'penalites', v_pen, 'indemnites', v_ind,
                            'retard_max', v_max_retard, 'pieces', v_n);
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Préparer les relances d'une organisation pour un jour
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function private.cashd_preparer_relances(p_client uuid, p_jour date, p_par uuid default null)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  g public.cashd_reglages;
  c record;
  f record;
  v_rel uuid;
  v_nature text;
  v_texte jsonb;
  v_pen jsonb;
  v_demande uuid;
  v_dstatut text;
  v_dpolitique uuid;
  v_envoi uuid;
  v_type text;
  v_palier_max text;
  v_rang_max integer;
  v_mot text;
  v_n_prep integer := 0;
  v_n_bloq integer := 0;
  v_n_coupees integer;
  v_mode_envoi text;
  v_interdit text;
  v_erreur text;
begin
  select * into g from public.cashd_reglages where client_id = p_client;
  if not found then
    return jsonb_build_object('installe', false);
  end if;
  -- Relire avant d'écrire : ce qui a été réglé depuis hier coupe ce qui était prêt.
  v_n_coupees := private.cashd_verifier_relances(p_client);
  begin
    v_mode_envoi := private.reglages_envois_effectifs(p_client, 'cashd') ->> 'mode';
  exception when others then
    v_mode_envoi := null;
  end;

  foreach v_nature in array array['facture', 'devis'] loop
    for c in
      select x.* from public.cashd_comptes x
      where x.client_id = p_client and x.statut = 'actif' and not x.reciproque
        and not exists (select 1 from public.cashd_relances r where r.compte_id = x.id and r.jour = p_jour and r.nature = v_nature)
        -- un règlement du compte reste à lettrer : la séquence attend l'imputation
        and not (v_nature = 'facture' and exists (select 1 from public.cashd_reglements_etat e where e.compte_id = x.id and e.a_imputer > 0))
      order by x.nom
    loop
      v_rel := null;
      -- Les avoirs ouverts du compte sont déduits avant tout calcul du solde dû : imputés sur ses factures échues, de la
      -- plus ancienne à la plus récente (lettrage automatique, journalisé).
      if v_nature = 'facture' then
        for f in
          select a.id as avoir_id, x.id as facture_id
          from public.cashd_factures a
          cross join lateral (select y.id from public.cashd_factures_etat y
                              where y.compte_id = c.id and y.nature in ('facture', 'acompte') and y.statut = 'ouverte' and y.reste_du > 0
                                and y.echeance < p_jour order by y.echeance, y.numero) x
          where a.compte_id = c.id and a.nature = 'avoir' and a.statut = 'ouverte'
          order by a.date_emission, a.numero
        loop
          continue when private.cashd_reste(f.avoir_id) <= 0.005 or private.cashd_reste(f.facture_id) <= 0.005;
          perform private.cashd_imputer(f.facture_id, null, f.avoir_id, least(private.cashd_reste(f.avoir_id), private.cashd_reste(f.facture_id)), true,
                                        'avoir déduit avant la relance');
        end loop;
      end if;
      for f in
        select s.*, (select x.ordinality from jsonb_array_elements(case when v_nature = 'devis' then g.scenario_devis else coalesce(c.scenario, g.scenario) end)
                     with ordinality x where x.value ->> 'palier' = s.palier_suivant limit 1)::integer as rang
        from public.cashd_suivi s
        where s.compte_id = c.id and s.palier_suivant is not null and s.palier_suivant_le <= p_jour
          and s.etat_sequence in ('pas_encore_relancee', 'en_cours')
          and ((v_nature = 'facture' and s.nature in ('facture', 'acompte') and s.statut = 'ouverte' and s.reste_du > g.seuil_relance)
               or (v_nature = 'devis' and s.nature = 'devis'))
        order by s.echeance nulls last, s.numero
      loop
        if v_rel is null then
          -- Une relance plus ferme remplace celle du même compte encore en attente : un client ne reçoit jamais deux
          -- messages pour la même dette.
          perform private.cashd_couper(p_client, c.id, null, 'remplacée par la relance du ' || to_char(p_jour, 'DD/MM/YYYY'), false, v_nature, p_jour);
          insert into public.cashd_relances (client_id, entite_id, compte_id, jour, nature, palier, langue, destinataire_adresse, destinataire_nom, statut, prepare_par)
          values (p_client, c.entite_id, c.id, p_jour, v_nature, f.palier_suivant, c.langue, c.contact_facturation_email,
                  coalesce(c.contact_facturation_nom, c.nom), 'preparee', p_par)
          returning id into v_rel;
        end if;
        v_pen := case when v_nature = 'facture' then private.cashd_penalites(f.facture_id, p_jour) else '{}'::jsonb end;
        insert into public.cashd_relances_pieces (client_id, relance_id, facture_id, palier, rang, reste_du, retard_jours, penalites, indemnite)
        values (p_client, v_rel, f.facture_id, f.palier_suivant, f.rang, case when v_nature = 'devis' then f.montant_ttc else f.reste_du end,
                coalesce((v_pen ->> 'retard_jours')::integer, 0), coalesce((v_pen ->> 'penalites')::numeric, 0), coalesce((v_pen ->> 'indemnite')::numeric, 0));
      end loop;
      continue when v_rel is null;

      -- Le palier du message : le plus ferme de ses factures.
      select p.palier, p.rang into v_palier_max, v_rang_max from public.cashd_relances_pieces p where p.relance_id = v_rel order by p.rang desc limit 1;
      update public.cashd_relances set palier = v_palier_max where id = v_rel;
      v_texte := private.cashd_ecrire_texte(v_rel);
      update public.cashd_relances set sujet = v_texte ->> 'sujet', corps = v_texte ->> 'corps', montant = (v_texte ->> 'montant')::numeric,
             penalites = (v_texte ->> 'penalites')::numeric, indemnites = (v_texte ->> 'indemnites')::numeric, maj_le = now()
       where id = v_rel;

      if c.contact_facturation_email is null then
        update public.cashd_relances set statut = 'sans_adresse', motif = 'le compte n''a pas d''adresse de facturation : relancez-le vous-même ou complétez sa fiche' where id = v_rel;
        perform private.lever_alerte_module(p_client, 'cashd', 'attention',
          format('La relance de %s est écrite mais ne peut pas partir : le compte n''a pas d''adresse de facturation.', c.nom),
          jsonb_build_object('compte', c.id, 'relance', v_rel), 'relance:sans_adresse:' || c.id::text, true, null);
        v_n_bloq := v_n_bloq + 1;
        continue;
      end if;

      -- Les interdits de l'organisation : un message qui en contient un ne part pas.
      v_interdit := null;
      foreach v_mot in array g.interdits loop
        if nullif(btrim(v_mot), '') is not null and position(lower(btrim(v_mot)) in lower((v_texte ->> 'sujet') || ' ' || (v_texte ->> 'corps'))) > 0 then
          v_interdit := v_mot;
          exit;
        end if;
      end loop;
      if v_interdit is not null then
        update public.cashd_relances set statut = 'bloquee', motif = format('le message contient un mot interdit par vos règles : « %s »', v_interdit) where id = v_rel;
        v_n_bloq := v_n_bloq + 1;
        continue;
      end if;
      -- La demande de validation, avec son montant (le seuil de la direction s'y applique).
      v_type := case when v_nature = 'devis' then 'cashd.devis' when v_palier_max = 'mise_en_demeure' then 'cashd.mise_en_demeure' else 'cashd.relance' end;
      begin
        insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, montant, payload, echeance, cle_idempotence)
        values (p_client, c.entite_id, 'cashd', v_type, 'cashd_relances', v_rel::text,
          left(case when g.mode = 'essai' then 'Essai — ' else '' end
               || case v_type when 'cashd.mise_en_demeure' then 'Mise en demeure' when 'cashd.devis' then 'Relance de devis' else 'Relance' end
               || ' : ' || c.nom || ', ' || private.cashd_eur((v_texte ->> 'montant')::numeric), 500),
          case when v_nature = 'devis' then null else (v_texte ->> 'montant')::numeric end,
          jsonb_build_object('relance', v_rel, 'canal', 'email', 'mode', g.mode, 'palier', v_palier_max,
            'destinataire', jsonb_build_object('nom', coalesce(c.contact_facturation_nom, c.nom), 'adresse', c.contact_facturation_email),
            'compte', jsonb_build_object('id', c.id, 'nom', c.nom, 'reference', c.reference),
            'sujet', v_texte ->> 'sujet', 'corps', v_texte ->> 'corps',
            'penalites', (v_texte ->> 'penalites')::numeric, 'indemnites', (v_texte ->> 'indemnites')::numeric,
            'exigences', case when v_type = 'cashd.mise_en_demeure' then jsonb_build_object('commentaire', true) else '{}'::jsonb end),
          (p_jour + 7)::timestamptz, 'cashd:relance:' || v_rel::text)
        returning id, statut, politique_id into v_demande, v_dstatut, v_dpolitique;
      exception when others then
        v_erreur := left(sqlstate || ' ' || sqlerrm, 400);
        update public.cashd_relances set statut = 'echec', motif = left('la demande de validation n''a pas pu être déposée : ' || v_erreur, 500) where id = v_rel;
        perform private.lever_alerte_module(p_client, 'cashd', 'critique', format('La relance de %s n''a pas pu entrer dans la file de validation.', c.nom),
          jsonb_build_object('relance', v_rel, 'erreur', v_erreur), 'relance:echec:' || v_rel::text, true, null);
        v_n_bloq := v_n_bloq + 1;
        continue;
      end;
      update public.cashd_relances set demande_id = v_demande, statut = 'a_valider', maj_le = now() where id = v_rel;
      -- Toute relance écrite et déposée dans la file est au journal, quel que soit le réglage d'envoi.
      perform private.journaliser_module(p_client, 'cashd', 'cashd.relance_preparee', 'cashd_relances', v_rel::text,
        jsonb_build_object('compte', c.reference, 'palier', v_palier_max, 'montant', (v_texte ->> 'montant')::numeric, 'pieces', (v_texte ->> 'pieces')::integer,
                           'demande', v_demande, 'jour', p_jour), c.entite_id);

      -- La mise en demeure exige une validation explicite : un accord permanent ne la couvre jamais.
      if v_type = 'cashd.mise_en_demeure' and v_dstatut = 'approuvee' and v_dpolitique is not null then
        update public.cashd_relances set statut = 'bloquee',
          motif = 'un accord permanent l''a approuvée d''office : une mise en demeure exige une validation explicite, elle n''est pas préparée' where id = v_rel;
        perform private.lever_alerte_module(p_client, 'cashd', 'attention',
          format('La mise en demeure de %s n''a pas été préparée : un accord permanent couvre les relances CASHD, et une mise en demeure exige une validation explicite.', c.nom),
          jsonb_build_object('relance', v_rel, 'politique', v_dpolitique), 'relance:med_accord:' || v_rel::text, true, null);
        v_n_bloq := v_n_bloq + 1;
        continue;
      end if;

      -- Le message, adossé à la demande : il ne part que si elle est approuvée.
      if v_mode_envoi is null then
        update public.cashd_relances set statut = 'non_reglee',
          motif = 'l''envoi par courriel n''est pas encore réglé pour CASHD : la relance est écrite et validable, l''envoi viendra une fois le réglage posé' where id = v_rel;
        v_n_prep := v_n_prep + 1;
        continue;
      end if;
      begin
        v_envoi := private.preparer_envoi(p_client, 'cashd', 'cashd_relances', v_rel::text, 'email',
          jsonb_build_object('adresse', c.contact_facturation_email, 'nom', coalesce(c.contact_facturation_nom, c.nom), 'ref', c.reference,
                             'professionnel', not c.particulier, 'langue', c.langue),
          null, '{}'::jsonb, v_texte ->> 'sujet', v_texte ->> 'corps', null::uuid[], 'cashd:relance:' || v_rel::text, c.entite_id, true, false,
          null::timestamptz, jsonb_build_object('demande', v_demande));
        update public.cashd_relances set envoi_id = v_envoi, maj_le = now() where id = v_rel;
        v_n_prep := v_n_prep + 1;
      exception when others then
        v_erreur := left(sqlstate || ' ' || sqlerrm, 400);
        update public.cashd_relances set motif = left('le message n''a pas pu être préparé : ' || v_erreur, 500) where id = v_rel;
        perform private.lever_alerte_module(p_client, 'cashd', 'critique', format('Le message de relance de %s n''a pas pu être préparé ; la demande reste dans la file.', c.nom),
          jsonb_build_object('relance', v_rel, 'erreur', v_erreur), 'relance:envoi:' || v_rel::text, true, null);
        v_n_bloq := v_n_bloq + 1;
      end;
    end loop;
  end loop;
  perform private.battre(p_client, 'cashd_relances', jsonb_build_object('jour', p_jour, 'preparees', v_n_prep), interval '1 day');
  return jsonb_build_object('jour', p_jour, 'preparees', v_n_prep, 'bloquees', v_n_bloq, 'coupees', v_n_coupees, 'mode_envoi', v_mode_envoi);
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Le point du matin
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function private.cashd_point_lignes(p_client uuid, p_jour date)
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare
  v_items jsonb := '[]'::jsonb;
  r record;
  n integer := 0;
  v_a_valider integer;
  v_med integer;
  v_dernier timestamptz;
begin
  -- 1. Ce qui attend la validation ce matin.
  select count(*), count(*) filter (where x.palier = 'mise_en_demeure') into v_a_valider, v_med
  from public.cashd_relances x
  where x.client_id = p_client and x.statut in ('a_valider', 'non_reglee')
    and (x.demande_id is null or exists (select 1 from public.demandes_validation d where d.id = x.demande_id and d.statut = 'en_attente'));
  if v_a_valider > 0 then
    v_items := v_items || jsonb_build_object('texte', format('%s relance%s écrite%s attend%s votre validation%s', v_a_valider,
        case when v_a_valider > 1 then 's' else '' end, case when v_a_valider > 1 then 's' else '' end, case when v_a_valider > 1 then 'ent' else '' end,
        case when v_med > 0 then format(', dont %s mise%s en demeure', v_med, case when v_med > 1 then 's' else '' end) else '' end),
      'gravite', case when v_med > 0 then 'attention' else 'info' end, 'lien', '/espace/cashd');
  end if;
  -- 2. Le facturier relu ce matin ?
  select max(f.vue_le) into v_dernier from public.cashd_factures f where f.client_id = p_client and f.source in ('export', 'import');
  if exists (select 1 from public.branchements b where b.client_id = p_client and b.module = 'cashd' and b.statut = 'actif')
     and (v_dernier is null or (v_dernier at time zone 'Europe/Paris')::date < p_jour) then
    v_items := v_items || jsonb_build_object('texte', format('Le facturier n''a pas été relu ce matin%s : les relances partent de l''état connu',
        case when v_dernier is not null then ' (dernier export lu le ' || to_char(v_dernier at time zone 'Europe/Paris', 'DD/MM/YYYY') || ')' else '' end),
      'gravite', 'attention', 'lien', '/espace/cashd');
  end if;
  -- 3. Qui doit quoi, où en est la relance (les comptes les plus en retard d'abord).
  for r in
    select b.*, (select s.palier_atteint from public.cashd_suivi s where s.compte_id = b.compte_id and s.palier_atteint is not null
                 order by s.palier_atteint_le desc nulls last limit 1) as palier,
                (select min(s.palier_suivant_le) from public.cashd_suivi s where s.compte_id = b.compte_id and s.palier_suivant is not null) as prochain
    from public.cashd_balance_agee b
    where b.client_id = p_client and b.echu > 0
    order by b.echu_plus_90 + b.echu_61_90 desc, b.echu desc
    limit 10
  loop
    v_items := v_items || jsonb_build_object('texte', left(format('%s doit %s échus (retard le plus ancien : %s jours)%s%s', r.nom, private.cashd_eur(r.echu),
        r.retard_max_jours,
        case when r.statut <> 'actif' then ' — compte ' || replace(r.statut, '_', ' ') else
          case when r.palier is not null then ' — dernier palier : ' || replace(r.palier, '_', ' ') else ' — pas encore relancé' end
          || case when r.prochain is not null then ', suivant le ' || to_char(r.prochain, 'DD/MM') else '' end end,
        case when r.plafond_encours is not null and r.encours > r.plafond_encours then ' ; plafond d''encours dépassé' else '' end), 300),
      'gravite', case when r.retard_max_jours > 60 then 'critique' when r.retard_max_jours > 30 then 'attention' else 'info' end,
      'lien', '/espace/cashd', 'objet_type', 'cashd_comptes', 'objet_id', r.compte_id::text);
    n := n + 1;
  end loop;
  -- 4. Les règlements à lettrer.
  for r in
    select count(*) as n, sum(e.a_imputer) as montant from public.cashd_reglements_etat e where e.client_id = p_client and e.a_imputer > 0 having count(*) > 0
  loop
    v_items := v_items || jsonb_build_object('texte', format('%s règlement%s à rapprocher (%s) : la relance des comptes concernés attend', r.n,
        case when r.n > 1 then 's' else '' end, private.cashd_eur(r.montant)), 'gravite', 'attention', 'lien', '/espace/cashd');
  end loop;
  -- 5. Les comptes au-dessus de leur plafond.
  for r in select b.nom, b.encours, b.plafond_encours, b.compte_id from public.cashd_balance_agee b
           where b.client_id = p_client and b.plafond_encours is not null and b.encours > b.plafond_encours order by b.encours - b.plafond_encours desc limit 5 loop
    v_items := v_items || jsonb_build_object('texte', left(format('%s : encours %s pour un plafond de %s — à voir avant toute nouvelle commande', r.nom,
        private.cashd_eur(r.encours), private.cashd_eur(r.plafond_encours)), 300),
      'gravite', 'attention', 'lien', '/espace/cashd', 'objet_type', 'cashd_comptes', 'objet_id', r.compte_id::text);
  end loop;
  return v_items;
end $function$;

-- Le passage du matin : à l'heure réglée (Paris), une fois par jour et par organisation, relire, écrire les relances,
-- déposer le point du matin. Rejouable : le passage du jour ne se refait pas.
create or replace function private.cashd_passage(p_maintenant timestamptz default now())
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare
  g record;
  v_jour date := (p_maintenant at time zone 'Europe/Paris')::date;
  v_bilan jsonb;
  v_items jsonb;
  v_role text;
  n integer := 0;
begin
  for g in select x.* from public.cashd_reglages x
           where (p_maintenant at time zone 'Europe/Paris')::time >= x.heure_relances
             and not exists (select 1 from public.cashd_passages p where p.client_id = x.client_id and p.jour = v_jour)
           order by x.client_id loop
    begin
      v_bilan := private.cashd_preparer_relances(g.client_id, v_jour, null);
      insert into public.cashd_passages (client_id, jour, bilan) values (g.client_id, v_jour, v_bilan) on conflict do nothing;
      v_items := private.cashd_point_lignes(g.client_id, v_jour);
      foreach v_role in array array['gerant', 'admin', 'valideur'] loop
        begin
          if jsonb_array_length(v_items) = 0 then
            perform private.retirer_section(g.client_id, 'cashd', v_jour, null, v_role, 'Impayés : qui doit quoi', null, null);
          else
            perform private.deposer_section(g.client_id, 'cashd', v_jour, null, v_role, 'Impayés : qui doit quoi', v_items,
                                            null, null, false, p_maintenant, false, 30);
          end if;
        exception when others then
          perform private.lever_alerte_module(g.client_id, 'cashd', 'attention', 'Le point du matin des impayés n''a pas pu être déposé.',
            jsonb_build_object('role', v_role, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'point:' || v_jour::text || ':' || v_role, false, null);
        end;
      end loop;
      n := n + 1;
    exception when others then
      perform private.lever_alerte_module(g.client_id, 'cashd', 'critique', 'Les relances du matin n''ont pas pu être écrites.',
        jsonb_build_object('jour', v_jour, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'passage:' || v_jour::text, false, null);
    end;
  end loop;
  return n;
end $function$;

do $do$ begin
  if not exists (select 1 from cron.job where jobname = 'cashd-matin') then
    perform cron.schedule('cashd-matin', '*/10 * * * *', 'select private.cashd_passage()');
  end if;
end $do$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Les portes
-- ═══════════════════════════════════════════════════════════════════════════

-- Préparer maintenant (bouton de l'écran, ou essai) : les relances du jour pour une organisation.
create or replace function public.cashd_preparer_maintenant(p_client uuid)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_uid uuid; v_jour date := (now() at time zone 'Europe/Paris')::date; v_bilan jsonb;
begin
  v_uid := private.cashd_exiger_gestion(p_client);
  perform private.cashd_exiger_installe(p_client);
  v_bilan := private.cashd_preparer_relances(p_client, v_jour, v_uid);
  insert into public.cashd_passages (client_id, jour, bilan) values (p_client, v_jour, v_bilan)
  on conflict (client_id, jour) do update set bilan = public.cashd_passages.bilan || jsonb_build_object('relance_' || to_char(now(), 'HH24MI'), excluded.bilan);
  return v_bilan;
end $function$;

-- Le statut d'un compte : pause, litige, recouvrement, hors périmètre, attente de contact, ou retour à « actif ».
-- Toute sortie du cycle coupe ce qui est prêt ; le retour est une décision (motif obligatoire), jamais un délai.
create or replace function public.cashd_statut_compte(p_compte uuid, p_statut text, p_motif text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare c public.cashd_comptes; v_uid uuid; v_coupees integer := 0;
begin
  select * into c from public.cashd_comptes where id = p_compte for update;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  v_uid := private.cashd_exiger_gestion(c.client_id, c.entite_id);
  if p_statut is null or p_statut not in ('actif', 'pause', 'litige', 'recouvrement', 'hors_perimetre', 'attente_contact') then
    raise exception 'Statut inconnu : % (actif, pause, litige, recouvrement, hors_perimetre, attente_contact).', coalesce(p_statut, 'vide') using errcode = '22023';
  end if;
  if nullif(btrim(p_motif), '') is null then
    raise exception 'Un changement de statut dit pourquoi.' using errcode = '22023';
  end if;
  if p_statut = c.statut then
    return jsonb_build_object('compte', c.id, 'statut', c.statut, 'inchange', true);
  end if;
  if p_statut = 'actif' and c.statut = 'hors_perimetre' and v_uid is not null and not private.a_un_role(c.client_id, array['gerant', 'admin']) then
    raise exception 'Seuls le gérant ou un administrateur remettent un compte dans le périmètre.' using errcode = '42501';
  end if;
  update public.cashd_comptes set statut = p_statut, statut_motif = left(btrim(p_motif), 500), statut_le = now(), statut_par = v_uid, maj_le = now()
  where id = c.id;
  if p_statut <> 'actif' then
    v_coupees := private.cashd_couper(c.client_id, c.id, null, 'compte ' || replace(p_statut, '_', ' ') || ' : ' || left(btrim(p_motif), 300));
  end if;
  perform private.journaliser_module(c.client_id, 'cashd', 'cashd.compte_statut', 'cashd_comptes', c.id::text,
    jsonb_build_object('avant', c.statut, 'apres', p_statut, 'motif', left(btrim(p_motif), 500), 'relances_coupees', v_coupees), c.entite_id);
  return jsonb_build_object('compte', c.id, 'statut', p_statut, 'relances_coupees', v_coupees);
end $function$;

-- Mettre une facture en litige (contestation) : elle sort du cycle ; la reprise est une décision motivée.
create or replace function public.cashd_litige(p_facture uuid, p_ouvrir boolean, p_motif text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare f public.cashd_factures; v_uid uuid; v_coupees integer := 0;
begin
  select * into f from public.cashd_factures where id = p_facture for update;
  if not found or f.nature not in ('facture', 'acompte') then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  v_uid := private.cashd_exiger_gestion(f.client_id, f.entite_id);
  if nullif(btrim(p_motif), '') is null then
    raise exception 'Un litige s''ouvre et se clôt avec son motif.' using errcode = '22023';
  end if;
  if coalesce(p_ouvrir, true) then
    if f.statut <> 'ouverte' then
      raise exception 'Seule une facture ouverte passe en litige (ici : %).', f.statut using errcode = '23514';
    end if;
    update public.cashd_factures set statut = 'litige', statut_motif = left(btrim(p_motif), 500), statut_le = now(), maj_le = now() where id = f.id;
    v_coupees := private.cashd_couper(f.client_id, null, f.id, 'facture ' || f.numero || ' en litige : ' || left(btrim(p_motif), 300));
  else
    if f.statut <> 'litige' then
      raise exception 'Cette facture n''est pas en litige.' using errcode = '23514';
    end if;
    update public.cashd_factures set statut = 'ouverte', statut_motif = left('litige clos : ' || btrim(p_motif), 500), statut_le = now(), maj_le = now() where id = f.id;
  end if;
  perform private.journaliser_module(f.client_id, 'cashd', case when coalesce(p_ouvrir, true) then 'cashd.litige_ouvert' else 'cashd.litige_clos' end,
    'cashd_factures', f.id::text, jsonb_build_object('numero', f.numero, 'motif', left(btrim(p_motif), 500), 'relances_coupees', v_coupees), f.entite_id);
  return jsonb_build_object('facture', f.id, 'statut', case when coalesce(p_ouvrir, true) then 'litige' else 'ouverte' end, 'relances_coupees', v_coupees);
end $function$;

-- Les réglages du moteur : scénario, seuil de la direction, signature, formule, interdits, heure.
-- Le seuil de la direction pose (ou met à jour) une règle de validation du socle pour le module cashd : au-delà du
-- montant, seuls le gérant et un administrateur valident.
create or replace function public.cashd_regler_relances(p_client uuid, p_champs jsonb)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  g public.cashd_reglages;
  v_inconnus text;
  v_seuil numeric;
  v_regle uuid;
  e jsonb;
begin
  perform private.cashd_exiger_gestion(p_client);
  select * into g from public.cashd_reglages where client_id = p_client for update;
  if not found then
    raise exception 'CASHD n''est pas installé pour cette organisation.' using errcode = '55000';
  end if;
  if p_champs is null or jsonb_typeof(p_champs) <> 'object' then
    raise exception 'Les réglages se donnent en objet.' using errcode = '22023';
  end if;
  select string_agg(k, ', ') into v_inconnus from jsonb_object_keys(p_champs) k
  where k not in ('scenario', 'scenario_devis', 'seuil_direction', 'signature', 'formule', 'interdits', 'heure_relances', 'ecart_paliers_jours', 'delai_mise_en_demeure_jours');
  if v_inconnus is not null then
    raise exception 'Réglage inconnu : %.', v_inconnus using errcode = '22023';
  end if;
  foreach e in array array[p_champs -> 'scenario', p_champs -> 'scenario_devis'] loop
    continue when e is null;
    if jsonb_typeof(e) <> 'array' or exists (
         select 1 from jsonb_array_elements(e) with ordinality x
         where jsonb_typeof(x.value) <> 'object' or coalesce(x.value ->> 'palier', '') !~ '^[a-z][a-z_]{1,39}$'
            or coalesce(x.value ->> 'jours', '') !~ '^-?[0-9]{1,3}$'
            or (x.ordinality > 1 and (x.value ->> 'jours')::integer <= (e -> (x.ordinality::integer - 2) ->> 'jours')::integer)) then
      raise exception 'Un scénario est une liste de paliers {palier, jours}, aux jours croissants.' using errcode = '22023';
    end if;
  end loop;
  if p_champs ? 'scenario' and (select count(*) from jsonb_array_elements(p_champs -> 'scenario') x where x.value ->> 'palier' = 'mise_en_demeure') > 1 then
    raise exception 'Une seule mise en demeure par scénario.' using errcode = '22023';
  end if;
  update public.cashd_reglages set
    scenario = case when p_champs ? 'scenario' then p_champs -> 'scenario' else scenario end,
    scenario_devis = case when p_champs ? 'scenario_devis' then p_champs -> 'scenario_devis' else scenario_devis end,
    seuil_direction = case when p_champs ? 'seuil_direction' then (p_champs ->> 'seuil_direction')::numeric else seuil_direction end,
    signature = case when p_champs ? 'signature' then nullif(btrim(p_champs ->> 'signature'), '') else signature end,
    formule = case when p_champs ? 'formule' then nullif(btrim(p_champs ->> 'formule'), '') else formule end,
    interdits = case when p_champs ? 'interdits' then coalesce(array(select btrim(x) from jsonb_array_elements_text(p_champs -> 'interdits') x where btrim(x) <> ''), '{}') else interdits end,
    heure_relances = case when p_champs ? 'heure_relances' then (p_champs ->> 'heure_relances')::time else heure_relances end,
    ecart_paliers_jours = case when p_champs ? 'ecart_paliers_jours' then (p_champs ->> 'ecart_paliers_jours')::smallint else ecart_paliers_jours end,
    delai_mise_en_demeure_jours = case when p_champs ? 'delai_mise_en_demeure_jours' then (p_champs ->> 'delai_mise_en_demeure_jours')::smallint else delai_mise_en_demeure_jours end,
    maj_le = now()
  where client_id = p_client
  returning * into g;
  if p_champs ? 'seuil_direction' then
    v_seuil := g.seuil_direction;
    if g.regle_direction_id is not null and exists (select 1 from public.regles_validation r where r.id = g.regle_direction_id) then
      update public.regles_validation set montant_min = coalesce(v_seuil, montant_min), actif = v_seuil is not null where id = g.regle_direction_id;
    elsif v_seuil is not null then
      insert into public.regles_validation (client_id, module, montant_min, approbations_requises, roles_autorises, actif)
      values (p_client, 'cashd', v_seuil, 1, array['gerant', 'admin'], true)
      returning id into v_regle;
      update public.cashd_reglages set regle_direction_id = v_regle where client_id = p_client;
    end if;
  end if;
  perform private.journaliser_module(p_client, 'cashd', 'cashd.reglages_relances', 'cashd_reglages', p_client::text, p_champs, null);
  return (select to_jsonb(x) from public.cashd_reglages x where x.client_id = p_client);
end $function$;

-- Le scénario propre d'un compte (null : celui de l'organisation) et son secteur, son caractère particulier.
create or replace function public.cashd_regler_compte(p_compte uuid, p_champs jsonb)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare c public.cashd_comptes; v_inconnus text;
begin
  select * into c from public.cashd_comptes where id = p_compte for update;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  perform private.cashd_exiger_gestion(c.client_id, c.entite_id);
  if p_champs is null or jsonb_typeof(p_champs) <> 'object' then
    raise exception 'Les réglages se donnent en objet.' using errcode = '22023';
  end if;
  select string_agg(k, ', ') into v_inconnus from jsonb_object_keys(p_champs) k where k not in ('scenario', 'secteur', 'particulier');
  if v_inconnus is not null then
    raise exception 'Réglage inconnu : %.', v_inconnus using errcode = '22023';
  end if;
  if p_champs ? 'scenario' and p_champs -> 'scenario' <> 'null'::jsonb and (jsonb_typeof(p_champs -> 'scenario') <> 'array' or exists (
       select 1 from jsonb_array_elements(p_champs -> 'scenario') with ordinality x
       where coalesce(x.value ->> 'palier', '') !~ '^[a-z][a-z_]{1,39}$' or coalesce(x.value ->> 'jours', '') !~ '^-?[0-9]{1,3}$'
          or (x.ordinality > 1 and (x.value ->> 'jours')::integer <= (p_champs -> 'scenario' -> (x.ordinality::integer - 2) ->> 'jours')::integer))) then
    raise exception 'Un scénario est une liste de paliers {palier, jours}, aux jours croissants.' using errcode = '22023';
  end if;
  update public.cashd_comptes set
    scenario = case when p_champs ? 'scenario' then nullif(p_champs -> 'scenario', 'null'::jsonb) else scenario end,
    secteur = case when p_champs ? 'secteur' then nullif(btrim(p_champs ->> 'secteur'), '') else secteur end,
    particulier = case when p_champs ? 'particulier' then coalesce((p_champs ->> 'particulier')::boolean, false) else particulier end,
    maj_le = now()
  where id = c.id;
  perform private.journaliser_module(c.client_id, 'cashd', 'cashd.compte_regle', 'cashd_comptes', c.id::text, p_champs, c.entite_id);
  return (select to_jsonb(x) from public.cashd_comptes x where x.id = c.id);
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. Relire avant d'envoyer, à chaque mouvement
-- ═══════════════════════════════════════════════════════════════════════════
-- Le solde d'une facture (c2_01) et l'intégration d'un export coupent désormais ce qui était prêt.

create or replace function private.cashd_suivre_solde(p_facture uuid)
 returns text language plpgsql security definer set search_path to ''
as $function$
declare f public.cashd_factures; v_reste numeric; v_brut numeric; v_statut text;
begin
  select * into f from public.cashd_factures where id = p_facture;
  if not found then
    return null;
  end if;
  v_statut := f.statut;
  if f.nature = 'avoir' then
    v_reste := private.cashd_reste(f.id);
    if v_reste <= 0.005 and f.statut = 'ouverte' then
      update public.cashd_factures set statut = 'soldee', statut_motif = 'avoir entièrement imputé', statut_le = now(), maj_le = now() where id = f.id;
      v_statut := 'soldee';
    elsif v_reste > 0.005 and f.statut = 'soldee' then
      update public.cashd_factures set statut = 'ouverte', statut_motif = null, statut_le = now(), maj_le = now() where id = f.id;
      v_statut := 'ouverte';
    end if;
    return v_statut;
  end if;
  if f.nature = 'devis' then
    return f.statut;
  end if;
  v_brut := f.montant_ttc - coalesce((select sum(x.montant) from public.cashd_imputations x where x.facture_id = f.id and x.annulee_le is null), 0);
  if f.statut = 'ouverte' and v_brut <= 0.005 then
    update public.cashd_factures set statut = 'soldee', statut_motif = 'réglée (lettrage)', statut_le = now(), maj_le = now() where id = f.id;
    v_statut := 'soldee';
  elsif f.statut = 'soldee' and f.statut_motif = 'réglée (lettrage)' and v_brut > 0.005 then
    update public.cashd_factures set statut = 'ouverte', statut_motif = null, statut_le = now(), maj_le = now() where id = f.id;
    v_statut := 'ouverte';
  end if;
  -- Un règlement interrompt la séquence avant le prochain envoi.
  if v_statut <> 'ouverte' or private.cashd_reste(f.id) <= 0.005 then
    perform private.cashd_couper(f.client_id, null, f.id, 'facture ' || f.numero || ' réglée');
  end if;
  return v_statut;
end $function$;

-- Relettrer : les règlements encore à imputer retentent le lettrage automatique. Les exports arrivent dans n'importe quel
-- ordre (le journal des encaissements peut précéder les factures qu'il solde) : chaque intégration rattrape les
-- règlements arrivés avant leurs factures. Rend le nombre d'imputations faites.
create or replace function private.cashd_relettrer(p_client uuid)
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare r record; n integer := 0;
begin
  for r in select e.id from public.cashd_reglements_etat e where e.client_id = p_client and e.a_imputer > 0 order by e.recu_le, e.cree_le loop
    begin
      n := n + private.cashd_lettrer_auto(r.id);
    exception when others then
      perform private.lever_alerte_module(p_client, 'cashd', 'attention', 'Un règlement n''a pas pu être lettré automatiquement : rapprochez-le à la main.',
        jsonb_build_object('reglement', r.id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'lettrage:' || r.id::text, true, null);
    end;
  end loop;
  return n;
end $function$;

-- L'intégration d'un export (c2_01) se termine désormais par le relettrage et la relecture des relances en attente :
-- le dépôt depuis l'écran et le travail du relevé (mêmes corps que c2_01, plus ces deux pas).
create or replace function public.cashd_importer(p_client uuid, p_jeu text, p_lignes jsonb, p_complet boolean default false,
  p_entite uuid default null, p_fichier text default null)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare v_entite uuid; v_res jsonb;
begin
  v_entite := private.cashd_entite(p_client, p_entite);
  perform private.cashd_exiger_gestion(p_client, v_entite);
  v_res := private.cashd_integrer(p_client, v_entite, p_jeu, p_lignes, p_complet, 'import', left(coalesce(nullif(btrim(p_fichier), ''), 'dépôt depuis l''espace'), 200));
  return v_res || jsonb_build_object('relettrees', private.cashd_relettrer(p_client), 'relances_coupees', private.cashd_verifier_relances(p_client));
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
      r := r || jsonb_build_object('relettrees', private.cashd_relettrer(t.client_id), 'relances_coupees', private.cashd_verifier_relances(t.client_id));
      perform private.finir_travail(t.id, r);
      n_ok := n_ok + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 2000), true);
      n_ko := n_ko + 1;
    end;
  end loop;
  return jsonb_build_object('faits', n_ok, 'echecs', n_ko);
end $function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. Lire : les relances dans le tableau et la fiche
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.cashd_relances_du_jour(p_client uuid, p_jour date default null)
 returns jsonb language sql stable security invoker set search_path to ''
as $function$
  select coalesce(jsonb_agg(to_jsonb(r) || jsonb_build_object(
      'compte', (select c.nom from public.cashd_comptes c where c.id = r.compte_id),
      'pieces', (select coalesce(jsonb_agg(jsonb_build_object('facture_id', p.facture_id, 'numero', f.numero, 'palier', p.palier, 'reste_du', p.reste_du,
                                                              'retard_jours', p.retard_jours, 'penalites', p.penalites, 'indemnite', p.indemnite) order by f.echeance), '[]'::jsonb)
                 from public.cashd_relances_pieces p join public.cashd_factures f on f.id = p.facture_id where p.relance_id = r.id and not p.annulee))
      order by case r.etat when 'a_valider' then 0 when 'non_reglee' then 1 when 'bloquee' then 2 when 'sans_adresse' then 3 else 4 end, r.montant desc), '[]'::jsonb)
  from public.cashd_relances_etat r
  where r.client_id = p_client and (p_jour is null or r.jour = p_jour)
    and (p_jour is not null or r.jour >= (now() at time zone 'Europe/Paris')::date - 30)
$function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. Droits
-- ═══════════════════════════════════════════════════════════════════════════

revoke execute on function private.cashd_eur(numeric, text) from public, anon, authenticated;
revoke execute on function private.cashd_date_texte(date, text) from public, anon, authenticated;
revoke execute on function private.cashd_penalites(uuid, date) from public, anon, authenticated;
revoke execute on function private.cashd_payeur_en_retard(uuid) from public, anon, authenticated;
revoke execute on function private.cashd_couper(uuid, uuid, uuid, text, boolean, text, date) from public, anon, authenticated;
revoke execute on function private.cashd_verifier_relances(uuid) from public, anon, authenticated;
revoke execute on function private.cashd_ecrire_texte(uuid) from public, anon, authenticated;
revoke execute on function private.cashd_relettrer(uuid) from public, anon, authenticated;
revoke execute on function private.cashd_preparer_relances(uuid, date, uuid) from public, anon, authenticated;
revoke execute on function private.cashd_point_lignes(uuid, date) from public, anon, authenticated;
revoke execute on function private.cashd_passage(timestamptz) from public, anon, authenticated;
revoke execute on function private.cashd_suivre_solde(uuid) from public, anon, authenticated;
grant execute on function private.cashd_preparer_relances(uuid, date, uuid) to service_role;
grant execute on function private.cashd_point_lignes(uuid, date) to service_role;
grant execute on function private.cashd_passage(timestamptz) to service_role;

revoke execute on function public.cashd_preparer_maintenant(uuid) from public, anon;
revoke execute on function public.cashd_statut_compte(uuid, text, text) from public, anon;
revoke execute on function public.cashd_litige(uuid, boolean, text) from public, anon;
revoke execute on function public.cashd_regler_relances(uuid, jsonb) from public, anon;
revoke execute on function public.cashd_regler_compte(uuid, jsonb) from public, anon;
revoke execute on function public.cashd_relances_du_jour(uuid, date) from public, anon;
grant execute on function public.cashd_preparer_maintenant(uuid) to authenticated, service_role;
grant execute on function public.cashd_statut_compte(uuid, text, text) to authenticated, service_role;
grant execute on function public.cashd_litige(uuid, boolean, text) to authenticated, service_role;
grant execute on function public.cashd_regler_relances(uuid, jsonb) to authenticated, service_role;
grant execute on function public.cashd_regler_compte(uuid, jsonb) to authenticated, service_role;
grant execute on function public.cashd_relances_du_jour(uuid, date) to authenticated, service_role;
