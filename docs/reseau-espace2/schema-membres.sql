-- ══════════════════════════════════════════════════════════════════════
-- Réseau Omega — page Membres : le schéma VISÉ (02/11/2026)
--
-- NON APPLIQUÉ. Aucune migration n'est passée : ce fichier dit ce que la
-- page /espace2/reseau/membres lira en « Base réelle » le jour où le réseau
-- ouvrira. D'ici là, la base réelle montre un état vide honnête, jamais
-- les membres d'exemple (components/espace2/reseau/membres.ts).
--
-- Les règles qui ont dessiné ce schéma :
--   · un membre est une organisation cliente d'Omega (public.clients) ;
--     « vous », c'est l'organisation connectée, lue par private.mes_clients() ;
--   · RIEN n'est visible sans accord : chaque champ (secteur, commune,
--     propose, cherche, chaque badge) a son interrupteur, éteint par défaut ;
--     seul le nom est montré d'office (c'est ce qui fait un membre) ;
--   · un badge n'est jamais déclaré par le membre : Omega le calcule sur
--     ses vraies données (FILED pour le paiement des fournisseurs, les
--     demandes reçues pour la réponse) et note la période et la date du
--     calcul, que l'infobulle affiche ;
--   · les autres membres ne lisent JAMAIS les tables : seulement la porte
--     reseau_annuaire(), qui ne rend que les champs consentis.
--
-- Français partout, RLS par client_id via private.mes_clients(), comme le
-- reste du socle (omega/migrations/a4_01_*).
-- ══════════════════════════════════════════════════════════════════════

-- ——— le membre : une organisation cliente qui a rejoint le réseau ———
create table if not exists public.reseau_membres (
  client_id   uuid primary key references public.clients(id) on delete cascade,
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  secteur     text,
  ile         text check (ile in ('Guadeloupe', 'Martinique')),
  commune     text,
  entre_le    date not null default current_date,   -- affiché en mois : « septembre 2026 »
  actif       boolean not null default true,          -- false : sorti du réseau, plus listé
  cree_le     timestamptz not null default now(),
  modifie_le  timestamptz not null default now()
);

-- ——— ce qu'il propose et ce qu'il cherche : une ligne par entrée ———
create table if not exists public.reseau_membre_offres (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.reseau_membres(client_id) on delete cascade,
  sens       text not null check (sens in ('propose', 'cherche')),
  libelle    text not null check (length(libelle) between 2 and 120),
  ordre      smallint not null default 0,
  cree_le    timestamptz not null default now(),
  unique (client_id, sens, libelle)
);
create index if not exists reseau_membre_offres_client on public.reseau_membre_offres (client_id, sens, ordre);

-- ——— les badges, calculés par Omega (jamais saisis par le membre) ———
-- valeur : jours (bon_payeur, délai MOYEN réception → paiement des factures
-- fournisseurs FILED) ou minutes (reponse_rapide, délai MÉDIAN avant la
-- première réponse aux demandes reçues). Un calcul par période ; la page
-- lit le plus récent. Écrit seulement par la tâche de calcul (service_role).
create table if not exists public.reseau_badges (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.reseau_membres(client_id) on delete cascade,
  badge           text not null check (badge in ('bon_payeur', 'reponse_rapide')),
  valeur          numeric not null check (valeur >= 0),
  unite           text not null check (unite in ('jours', 'minutes')),
  periode_debut   date not null,
  periode_fin     date not null,                      -- 12 mois glissants : periode_fin - 12 mois
  echantillon     integer not null check (echantillon >= 0),  -- nombre de factures ou de demandes
  source          text not null,                      -- « FILED : factures fournisseurs », « Demandes reçues »
  calcule_le      timestamptz not null default now(),
  check (periode_fin > periode_debut),
  check ((badge = 'bon_payeur' and unite = 'jours') or (badge = 'reponse_rapide' and unite = 'minutes'))
);
create index if not exists reseau_badges_dernier on public.reseau_badges (client_id, badge, calcule_le desc);

-- ——— ce que je montre au réseau : un interrupteur par champ, éteint par défaut ———
create table if not exists public.reseau_visibilite (
  client_id   uuid not null references public.reseau_membres(client_id) on delete cascade,
  champ       text not null check (champ in ('bon_payeur', 'reponse_rapide', 'secteur', 'commune', 'propose', 'cherche')),
  visible     boolean not null default false,
  modifie_le  timestamptz not null default now(),
  modifie_par uuid,                                    -- auth.uid() de la personne qui a basculé
  primary key (client_id, champ)
);

-- ——— « Demander une mise en relation » : une demande à Omega ———
create table if not exists public.reseau_mises_en_relation (
  id            uuid primary key default gen_random_uuid(),
  demandeur_id  uuid not null references public.reseau_membres(client_id) on delete cascade,  -- « vous »
  cible_id      uuid not null references public.reseau_membres(client_id) on delete cascade,
  motif         text not null check (length(motif) between 3 and 1000),
  statut        text not null default 'demandee' check (statut in ('demandee', 'presentee', 'acceptee', 'declinee')),
  cree_le       timestamptz not null default now(),
  cree_par      uuid,
  check (demandeur_id <> cible_id)
);
create index if not exists reseau_mises_en_relation_cible on public.reseau_mises_en_relation (cible_id, statut);

-- ——— RLS : chacun ne lit et n'écrit que SES lignes ———
alter table public.reseau_membres            enable row level security;
alter table public.reseau_membre_offres      enable row level security;
alter table public.reseau_badges             enable row level security;
alter table public.reseau_visibilite         enable row level security;
alter table public.reseau_mises_en_relation  enable row level security;

create policy reseau_membres_moi on public.reseau_membres
  for all to authenticated
  using (client_id in (select private.mes_clients()))
  with check (client_id in (select private.mes_clients()));

create policy reseau_offres_moi on public.reseau_membre_offres
  for all to authenticated
  using (client_id in (select private.mes_clients()))
  with check (client_id in (select private.mes_clients()));

-- les badges : lecture de SES badges seulement ; aucune écriture côté client
create policy reseau_badges_moi_lecture on public.reseau_badges
  for select to authenticated
  using (client_id in (select private.mes_clients()));

create policy reseau_visibilite_moi on public.reseau_visibilite
  for all to authenticated
  using (client_id in (select private.mes_clients()))
  with check (client_id in (select private.mes_clients()));

-- une demande se crée pour soi ; elle se lit par le demandeur (la cible la
-- voit quand Omega la présente, par la page Messages)
create policy reseau_mer_moi on public.reseau_mises_en_relation
  for select to authenticated
  using (demandeur_id in (select private.mes_clients()));
create policy reseau_mer_creer on public.reseau_mises_en_relation
  for insert to authenticated
  with check (demandeur_id in (select private.mes_clients()) and statut = 'demandee');

-- ——— la porte de l'annuaire : seuls les champs consentis sortent ———
-- Lue par la liste et la fiche. Le nom vient toujours ; chaque autre champ
-- vaut NULL tant que son interrupteur est éteint (ou n'existe pas encore).
-- Réservée aux organisations qui sont elles-mêmes membres actifs.
create or replace function public.reseau_annuaire()
returns table (
  slug            text,
  nom             text,
  secteur         text,
  ile             text,
  commune         text,
  entre_le        date,
  propose         text[],
  cherche         text[],
  bon_payeur_jours        numeric,
  reponse_rapide_minutes  numeric,
  badges_periode_fin      date,
  est_moi         boolean
)
language sql
stable
security definer
set search_path = public, private
as $$
  with moi as (select private.mes_clients() as client_id),
  autorise as (
    select 1 from public.reseau_membres m where m.actif and m.client_id in (select client_id from moi)
  ),
  vis as (
    select client_id,
           bool_or(visible) filter (where champ = 'secteur')        as secteur,
           bool_or(visible) filter (where champ = 'commune')        as commune,
           bool_or(visible) filter (where champ = 'propose')        as propose,
           bool_or(visible) filter (where champ = 'cherche')        as cherche,
           bool_or(visible) filter (where champ = 'bon_payeur')     as bon_payeur,
           bool_or(visible) filter (where champ = 'reponse_rapide') as reponse_rapide
    from public.reseau_visibilite group by client_id
  ),
  dernier as (
    select distinct on (client_id, badge) client_id, badge, valeur, periode_fin
    from public.reseau_badges
    where periode_fin >= current_date - interval '45 days'   -- un calcul trop vieux ne s'affiche plus
    order by client_id, badge, calcule_le desc
  )
  select
    m.slug,
    c.nom,
    case when coalesce(v.secteur, false) then m.secteur end,
    case when coalesce(v.commune, false) then m.ile end,      -- l'île suit la commune : même accord
    case when coalesce(v.commune, false) then m.commune end,
    m.entre_le,
    case when coalesce(v.propose, false) then (select array_agg(o.libelle order by o.ordre) from public.reseau_membre_offres o where o.client_id = m.client_id and o.sens = 'propose') end,
    case when coalesce(v.cherche, false) then (select array_agg(o.libelle order by o.ordre) from public.reseau_membre_offres o where o.client_id = m.client_id and o.sens = 'cherche') end,
    case when coalesce(v.bon_payeur, false) then (select d.valeur from dernier d where d.client_id = m.client_id and d.badge = 'bon_payeur') end,
    case when coalesce(v.reponse_rapide, false) then (select d.valeur from dernier d where d.client_id = m.client_id and d.badge = 'reponse_rapide') end,
    (select max(d.periode_fin) from dernier d where d.client_id = m.client_id),
    m.client_id in (select client_id from moi)
  from public.reseau_membres m
  join public.clients c on c.id = m.client_id
  left join vis v on v.client_id = m.client_id
  where m.actif and exists (select 1 from autorise)
  order by c.nom;
$$;

revoke all on function public.reseau_annuaire() from public;
grant execute on function public.reseau_annuaire() to authenticated;

-- ——— le calcul des badges (tâche Omega, service_role) : à écrire ———
-- bon_payeur     : moyenne, sur les factures fournisseurs de public.filed_factures
--                  du client payées dans la période, de (date de paiement −
--                  date de réception) ; la date de paiement est celle que lit
--                  déjà filed_etat_paiement(). Minimum d'échantillon à fixer
--                  (proposé : 10 factures) avant d'écrire une ligne.
-- reponse_rapide : médiane (percentile_cont(0.5)) du délai entre la réception
--                  d'une demande et la première réponse sortante, sur les
--                  demandes suivies par Omega. Minimum proposé : 10 demandes.
-- Une ligne par client et par badge à chaque passage (quotidien), périodes de
-- 12 mois glissants ; les anciennes lignes restent pour l'historique.
