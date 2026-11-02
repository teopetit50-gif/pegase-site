-- ══════════════════════════════════════════════════════════════════════
-- Réseau Omega › Opportunités — schéma VISÉ (02/11/2026)
--
-- RÉDIGÉ, PAS APPLIQUÉ. Aucune migration n'est passée : la page
-- /espace2/reseau/opportunites montre aujourd'hui, en « Base réelle », un
-- état vide (« Le réseau ouvre bientôt »). Ce fichier dit ce qu'il faudra
-- pour qu'elle lise de vraies données, sans rien présumer des tables des
-- trois autres pages (Fil, Membres, Messages) : la table des membres est
-- supposée s'appeler reseau_membres, avec une clé uuid et un slug, et
-- l'organisation connectée est un client Omega (clients.id), lue par
-- mes_clients() comme ailleurs dans Espace 2. À recaler à l'intégration.
--
-- Principes :
--   · « vous » = l'organisation connectée (client_id) ; toute ligne est
--     vue depuis elle, jamais depuis un membre ;
--   · une suggestion garde sa RAISON en clair et la donnée qui l'a fait
--     naître (provenance), pour être affichée telle quelle ;
--   · les badges ne sont jamais copiés ici : on les lit dans la fiche du
--     membre, filtrés par son accord (reseau_membres_badges.montre) ;
--   · les gestes (accepter, pas maintenant, former, participer) passent
--     par des portes RPC SECURITY DEFINER, pas par des écritures directes.
-- ══════════════════════════════════════════════════════════════════════

-- 1. Mises en relation tirées des données ------------------------------

create type reseau_relation_etat as enum ('proposee', 'acceptee', 'plus_tard', 'refusee');

create table reseau_mises_en_relation (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id) on delete cascade,   -- « vous »
  membre_id     uuid not null references reseau_membres(id) on delete cascade,
  titre         text not null,          -- « Vous commandez vos emballages en métropole ; … »
  raison        text not null,          -- pourquoi, en clair
  provenance    text not null,          -- 'factures_fournisseurs' | 'catalogue' | 'contrats' | …
  provenance_detail text,               -- « 9 factures, 2 fournisseurs, 4 180 € HT »
  etat          reseau_relation_etat not null default 'proposee',
  revoir_le     date,                   -- « pas maintenant » : quand la reproposer
  cree_le       timestamptz not null default now(),
  decide_le     timestamptz,
  unique (client_id, membre_id, titre)
);
create index on reseau_mises_en_relation (client_id, etat);

-- 2. Groupements de marchés publics -----------------------------------

create table reseau_marches (
  id            uuid primary key default gen_random_uuid(),
  titre         text not null,
  montant_ht    numeric(14, 2),
  acheteur      text not null,
  commune       text,
  remise_le     date not null,          -- date limite de remise des offres
  source_url    text,                   -- l'avis publié (BOAMP, profil d'acheteur…)
  publie_le     date,
  cree_le       timestamptz not null default now()
);

create table reseau_marches_lots (
  marche_id     uuid not null references reseau_marches(id) on delete cascade,
  numero        int  not null,
  intitule      text not null,
  primary key (marche_id, numero)
);

-- la suggestion de groupement, vue depuis « vous » : qui tient quel lot
create table reseau_groupements (
  id            uuid primary key default gen_random_uuid(),
  marche_id     uuid not null references reseau_marches(id) on delete cascade,
  client_id     uuid not null references clients(id) on delete cascade,   -- « vous »
  raison        text not null,
  etat          text not null default 'propose' check (etat in ('propose', 'forme', 'decline', 'depose')),
  cree_le       timestamptz not null default now(),
  forme_le      timestamptz,
  unique (marche_id, client_id)
);

create table reseau_groupements_lots (
  groupement_id uuid not null references reseau_groupements(id) on delete cascade,
  numero        int  not null,
  membre_id     uuid references reseau_membres(id),  -- null = « vous »
  accord        boolean,                              -- le membre a-t-il dit oui ?
  primary key (groupement_id, numero)
);

-- 3. Achats groupés ------------------------------------------------------

create table reseau_achats_groupes (
  id              uuid primary key default gen_random_uuid(),
  titre           text not null,
  organisateur_id uuid references reseau_membres(id), -- null = Omega
  gain_vise       text,                               -- « environ 18 % de moins sur la bouteille »
  seuil           int  not null check (seuil > 0),
  cloture_le      date not null,
  cree_le         timestamptz not null default now()
);

create table reseau_achats_inscriptions (
  achat_id      uuid not null references reseau_achats_groupes(id) on delete cascade,
  client_id     uuid not null references clients(id) on delete cascade,
  raison        text,                   -- pourquoi on le lui a proposé
  inscrit_le    timestamptz not null default now(),
  primary key (achat_id, client_id)
);

-- le nombre d'inscrits se lit, il ne se stocke pas
create view reseau_achats_groupes_etat as
  select a.*, count(i.client_id)::int as inscrits, count(i.client_id) >= a.seuil as seuil_atteint
  from reseau_achats_groupes a
  left join reseau_achats_inscriptions i on i.achat_id = a.id
  group by a.id;

-- 4. « Ce que le réseau vous a apporté » ------------------------------
-- une ligne par intro acceptée ; devis et montants posés à la main ou
-- reconnus dans les documents (FileD) qui citent le membre.

create table reseau_apports (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references clients(id) on delete cascade,
  relation_id   uuid references reseau_mises_en_relation(id) on delete set null,
  membre_id     uuid not null references reseau_membres(id),
  objet         text not null,
  intro_le      date not null,
  devis_ht      numeric(14, 2),
  devis_sens    text check (devis_sens in ('recu', 'envoye')),
  etat          text not null default 'intro' check (etat in ('intro', 'devis', 'signe', 'perdu')),
  maj_le        timestamptz not null default now()
);
create index on reseau_apports (client_id, etat);

-- RLS : chaque organisation ne voit que ses lignes ------------------

alter table reseau_mises_en_relation   enable row level security;
alter table reseau_groupements          enable row level security;
alter table reseau_groupements_lots     enable row level security;
alter table reseau_achats_inscriptions  enable row level security;
alter table reseau_apports              enable row level security;
alter table reseau_marches              enable row level security;
alter table reseau_marches_lots         enable row level security;
alter table reseau_achats_groupes       enable row level security;

create policy lire_les_miennes on reseau_mises_en_relation for select using (client_id in (select mes_clients()));
create policy lire_les_miens   on reseau_groupements       for select using (client_id in (select mes_clients()));
create policy lire_mes_lots    on reseau_groupements_lots  for select using (groupement_id in (select id from reseau_groupements where client_id in (select mes_clients())));
create policy lire_les_miennes on reseau_achats_inscriptions for select using (client_id in (select mes_clients()));
create policy lire_les_miens   on reseau_apports           for select using (client_id in (select mes_clients()));
-- marchés, lots et achats groupés : lisibles par tout client connecté
create policy lire_marches on reseau_marches        for select using (auth.uid() is not null);
create policy lire_lots    on reseau_marches_lots   for select using (auth.uid() is not null);
create policy lire_achats  on reseau_achats_groupes for select using (auth.uid() is not null);

-- Portes (aucune écriture directe depuis le navigateur) -------------
--   reseau_accepter_relation(relation uuid)            → etat 'acceptee', crée la ligne reseau_apports
--   reseau_plus_tard_relation(relation uuid, jours int) → etat 'plus_tard', revoir_le
--   reseau_former_groupement(groupement uuid)          → etat 'forme', prévient les membres des lots
--   reseau_participer_achat(achat uuid, oui boolean)   → insère / retire l'inscription
-- Chacune vérifie que la ligne appartient à mes_clients() avant d'écrire.
