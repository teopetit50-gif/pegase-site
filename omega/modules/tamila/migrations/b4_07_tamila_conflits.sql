-- b4_07 — Tamila : le contrôle des conflits d'intérêts et la vigilance LCB-FT (session B4, 06/10/2026, vague 3, n° 2).
--
-- POURQUOI. Avant d'accepter un dossier, l'avocat vérifie qu'il ne défend pas des intérêts opposés à ceux d'un
-- client actuel ou ancien (RIN art. 4) ; pour les activités assujetties (CMF art. L.561-3 : transactions
-- immobilières ou financières, gestion de fonds, constitution de sociétés, fiducie…), il identifie le client et
-- le bénéficiaire effectif et apprécie le risque (guide LCB-FT du CNB). Sources : NOTES-B4, vague 3.
--
-- LA DIFFICULTÉ. Les noms des parties sont chiffrés, chacun sous la clé de SON dossier : le serveur ne peut pas
-- comparer deux noms. D'où un INDEX AVEUGLE : le navigateur normalise le nom (minuscules, sans accents, sans forme
-- sociale, mots triés) et en calcule une empreinte HMAC-SHA-256 sous une CLÉ D'INDEX DU CABINET que le serveur
-- n'a jamais en clair (enveloppée sous la phrase du cabinet, ou sous la clé maître Scaleway, b4_05). Le serveur
-- compare des empreintes de 32 octets ; il ne peut ni retrouver un nom, ni en essayer un (il n'a pas la clé).
--
-- CE QUE ÇA POSE.
--   · tamila_index_cles : la clé d'index du cabinet, enveloppée (une par cabinet, posée une fois par le gérant).
--   · tamila_empreintes : les empreintes des parties (nom, et SIREN s'il est connu), avec la qualité de la partie.
--     Personne ne les lit en direct : seule la porte de contrôle les compare. Elles restent après l'effacement du
--     dossier (registre des conflits : un ancien client compte, RIN art. 4) ; elles ne portent aucun clair.
--   · tamila_controles_conflits : chaque contrôle (qui, quand, quelle qualité, combien de correspondances) et la
--     décision de l'avocat (pas de conflit, conflit levé, refus du dossier), avec son motif en code.
--   · tamila_vigilances : la vigilance LCB-FT d'un dossier (assujetti ou non, activité, identification du client et
--     du bénéficiaire effectif, niveau de risque, date de revue).
--   · Portes : tamila_poser_index_cle, tamila_index_cle, tamila_indexer_partie, tamila_controler_conflits,
--     tamila_decider_conflit, tamila_poser_vigilance, tamila_conformite ; et pour un cabinet au coffre :
--     tamila_coffre_demander_index, tamila_coffre_poser_index (serveur), tamila_coffre_index_pour_membre.
--
-- Rien n'est effacé : create table if not exists, create or replace. Fonctions private : revoke from public.

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Les tables
-- ════════════════════════════════════════════════════════════════════════════════════════════

create table if not exists public.tamila_index_cles (
  client_id uuid primary key,
  fournisseur text not null,
  reference text not null,
  enveloppe bytea not null,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  constraint tamila_index_cles_fournisseur_check check (fournisseur in ('local', 'scaleway')),
  constraint tamila_index_cles_reference_check check (reference ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$'),
  constraint tamila_index_cles_enveloppe_check check (octet_length(enveloppe) between 16 and 4096)
);

create table if not exists public.tamila_empreintes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  dossier_id uuid not null,
  partie_id uuid not null,
  empreinte bytea not null,
  qualite text not null,
  cree_le timestamptz not null default now(),
  constraint tamila_empreintes_empreinte_check check (octet_length(empreinte) = 32),
  constraint tamila_empreintes_qualite_check check (qualite in ('client', 'adverse', 'confrere_adverse', 'expert', 'juridiction', 'tiers')),
  constraint tamila_empreintes_une_fois unique (partie_id, empreinte)
);
create index if not exists tamila_empreintes_cherche on public.tamila_empreintes (client_id, empreinte);

create table if not exists public.tamila_controles_conflits (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null,
  dossier_id uuid,
  demande_par uuid not null,
  demande_le timestamptz not null default now(),
  qualite text not null,
  empreintes integer not null,
  correspondances integer not null,
  conflits integer not null,
  resultat jsonb not null default '{}'::jsonb,
  decision text,
  motif text,
  decide_par uuid,
  decide_le timestamptz,
  constraint tamila_controles_conflits_qualite_check check (qualite in ('client', 'adverse', 'confrere_adverse', 'expert', 'juridiction', 'tiers')),
  constraint tamila_controles_conflits_decision_check check (decision in ('pas_de_conflit', 'conflit_leve', 'refus')),
  constraint tamila_controles_conflits_motif_check check (motif ~ '^[a-z][a-z_]{2,40}$'),
  constraint tamila_controles_conflits_decide check ((decision is null) = (decide_par is null) and (decision is null) = (decide_le is null))
);
create index if not exists tamila_controles_conflits_dossier on public.tamila_controles_conflits (dossier_id, demande_le desc);

create table if not exists public.tamila_vigilances (
  dossier_id uuid primary key,
  client_id uuid not null,
  assujetti boolean not null,
  activite text,
  identification_le date,
  identification_piece uuid,
  beneficiaire_effectif_le date,
  risque text,
  revue_le date,
  par uuid,
  maj_le timestamptz not null default now(),
  constraint tamila_vigilances_activite_check check (activite in ('transaction_immobiliere', 'transaction_financiere', 'gestion_fonds', 'constitution_societe',
                                                                  'fiducie', 'cession_entreprise', 'autre_assujettie')),
  constraint tamila_vigilances_risque_check check (risque in ('faible', 'standard', 'eleve')),
  constraint tamila_vigilances_assujetti check (assujetti = (activite is not null))
);

comment on table public.tamila_index_cles is 'Tamila (B4, b4_07) : la clé d''index aveugle du cabinet, enveloppée (phrase ou clé maître Scaleway) ; le serveur ne l''a jamais en clair.';
comment on table public.tamila_empreintes is 'Tamila (B4, b4_07) : empreintes HMAC des noms des parties (index aveugle) ; comparées par tamila_controler_conflits seulement ; registre des conflits, conservé après l''effacement du dossier.';
comment on table public.tamila_controles_conflits is 'Tamila (B4, b4_07) : chaque contrôle de conflits d''intérêts (RIN art. 4) et la décision de l''avocat.';
comment on table public.tamila_vigilances is 'Tamila (B4, b4_07) : la vigilance LCB-FT d''un dossier (CMF art. L.561-3 et suivants).';

do $droits$
begin
  alter table public.tamila_index_cles enable row level security;
  alter table public.tamila_empreintes enable row level security;
  alter table public.tamila_controles_conflits enable row level security;
  alter table public.tamila_vigilances enable row level security;
  revoke all on table public.tamila_index_cles, public.tamila_empreintes, public.tamila_controles_conflits, public.tamila_vigilances
    from anon, authenticated, service_role;
  -- Les empreintes ne se lisent jamais en direct ; la clé d'index passe par sa porte.
  grant select on table public.tamila_controles_conflits, public.tamila_vigilances to authenticated;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tamila_controles_conflits'
                   and policyname = 'les associes et le demandeur lisent les controles') then
    create policy "les associes et le demandeur lisent les controles" on public.tamila_controles_conflits for select to authenticated
      using (demande_par = (select auth.uid()) or private.a_un_role(client_id, array['gerant', 'admin'])
             or (dossier_id is not null and private.tamila_voit_dossier_pour((select auth.uid()), client_id, dossier_id::text)));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'tamila_vigilances'
                   and policyname = 'on lit la vigilance des dossiers qu''on voit') then
    create policy "on lit la vigilance des dossiers qu'on voit" on public.tamila_vigilances for select to authenticated
      using (private.tamila_voit_dossier_pour((select auth.uid()), client_id, dossier_id::text));
  end if;
end $droits$;

-- Le registre des conflits et la vigilance partent avec le cabinet ; la vigilance aussi avec le dossier.
do $effacement$
begin
  if to_regclass('private.tables_objets') is not null then
    begin
      execute $q$insert into private.tables_objets (nom, objet_type, colonne) select 'tamila_vigilances', 'tamila_dossier', 'dossier_id'
               where not exists (select 1 from private.tables_objets t where t.nom = 'tamila_vigilances')$q$;
    exception when others then raise notice 'tables_objets : % (à inscrire à la main)', sqlerrm; end;
  end if;
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select x
               from unnest(array['tamila_index_cles', 'tamila_empreintes', 'tamila_controles_conflits', 'tamila_vigilances']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $effacement$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- La clé d'index du cabinet
-- ════════════════════════════════════════════════════════════════════════════════════════════

-- Le gérant la pose une fois, enveloppée sous la phrase du cabinet (cabinet local). Au coffre, c'est l'ouvrier qui
-- la pose (tamila_coffre_poser_index).
create or replace function private.tamila_poser_index_cle(p_client uuid, p_reference text, p_enveloppe bytea)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant']) then
    raise exception 'La clé d''index du cabinet est posée par son gérant.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.tamila_reglages r where r.client_id = p_client) then
    raise exception 'Tamila n''est pas installé pour ce cabinet.' using errcode = '55000';
  end if;
  if exists (select 1 from public.tamila_coffres c where c.client_id = p_client and c.statut <> 'local') then
    raise exception 'Ce cabinet est au coffre : la clé d''index s''y demande (tamila-coffre, nouvelle_cle_index).' using errcode = '55000';
  end if;
  if exists (select 1 from public.tamila_index_cles k where k.client_id = p_client) then
    raise exception 'Le cabinet a déjà sa clé d''index : elle ne se remplace pas (les empreintes en dépendent).' using errcode = '55000';
  end if;
  if p_enveloppe is null or octet_length(p_enveloppe) <> 77 or get_byte(p_enveloppe, 0) <> 1 then
    raise exception 'Une enveloppe locale fait 77 octets (version, sel, nonce, clé chiffrée).' using errcode = '22023';
  end if;
  insert into public.tamila_index_cles (client_id, fournisseur, reference, enveloppe, cree_par)
  values (p_client, 'local', coalesce(p_reference, 'index:' || p_client::text), p_enveloppe, v_uid);
  perform private.journaliser_module(p_client, 'tamila', 'tamila.index.pose', 'tamila_cabinet', p_client::text,
    jsonb_build_object('fournisseur', 'local', 'par', v_uid));
end $function$;

-- L'enveloppe de la clé d'index, à une personne du cabinet qui ouvre ou écrit des dossiers (pas un stagiaire).
create or replace function private.tamila_index_cle(p_client uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_k public.tamila_index_cles;
begin
  if v_uid is null or not exists (select 1 from public.comptes c where c.user_id = v_uid and c.client_id = p_client and c.role <> 'lecteur') then
    raise exception 'La clé d''index se remet à une personne du cabinet qui ouvre des dossiers.' using errcode = '42501';
  end if;
  select * into v_k from public.tamila_index_cles where client_id = p_client;
  if not found then
    return null;
  end if;
  return jsonb_build_object('fournisseur', v_k.fournisseur, 'reference', v_k.reference,
                            'enveloppe', case when v_k.fournisseur = 'local' then encode(v_k.enveloppe, 'hex') end);
end $function$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Les empreintes et le contrôle
-- ════════════════════════════════════════════════════════════════════════════════════════════

create or replace function private.tamila_indexer_partie(p_partie uuid, p_empreintes bytea[])
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_p public.tamila_parties;
  v_e bytea;
  n integer := 0;
begin
  select * into v_p from public.tamila_parties where id = p_partie;
  if v_uid is null or not found or not private.tamila_ecrit_dossier_pour(v_uid, v_p.client_id, v_p.dossier_id::text) then
    raise exception 'Vous n''écrivez pas dans ce dossier.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.tamila_index_cles k where k.client_id = v_p.client_id) then
    raise exception 'Le cabinet n''a pas encore de clé d''index.' using errcode = '55000';
  end if;
  if p_empreintes is null or cardinality(p_empreintes) < 1 or cardinality(p_empreintes) > 8 then
    raise exception 'De une à huit empreintes par partie.' using errcode = '22023';
  end if;
  foreach v_e in array p_empreintes loop
    if v_e is null or octet_length(v_e) <> 32 then
      raise exception 'Une empreinte fait 32 octets (HMAC-SHA-256).' using errcode = '22023';
    end if;
    insert into public.tamila_empreintes (client_id, dossier_id, partie_id, empreinte, qualite)
    values (v_p.client_id, v_p.dossier_id, v_p.id, v_e, v_p.qualite)
    on conflict (partie_id, empreinte) do nothing;
    if found then n := n + 1; end if;
  end loop;
  return n;
end $function$;

-- Le contrôle : des empreintes (celles d'un nom à tester), la qualité que la personne aura dans le dossier, le dossier
-- s'il existe déjà (ses propres parties ne comptent pas). Une correspondance compte si la partie existe encore, ou
-- si son dossier a été effacé (ancien client). Elle est un CONFLIT quand les côtés s'opposent (client ↔ adverse).
-- Les dossiers que la personne ne voit pas sont comptés, jamais nommés.
create or replace function private.tamila_controler_conflits(p_client uuid, p_dossier uuid, p_qualite text, p_empreintes bytea[])
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
  v_vus jsonb := '[]'::jsonb;
  v_hors_vue integer := 0;
  v_conflits integer := 0;
  v_total integer := 0;
  r record;
begin
  if v_uid is null or not exists (select 1 from public.comptes c where c.user_id = v_uid and c.client_id = p_client and c.role <> 'lecteur') then
    raise exception 'Le contrôle des conflits est fait par une personne du cabinet qui ouvre des dossiers.' using errcode = '42501';
  end if;
  if p_dossier is not null and not private.tamila_ecrit_dossier_pour(v_uid, p_client, p_dossier::text) then
    raise exception 'Vous n''écrivez pas dans ce dossier.' using errcode = '42501';
  end if;
  if p_qualite is null or p_qualite not in ('client', 'adverse', 'confrere_adverse', 'expert', 'juridiction', 'tiers') then
    raise exception 'Qualité inconnue : %.', coalesce(p_qualite, 'vide') using errcode = '22023';
  end if;
  if p_empreintes is null or cardinality(p_empreintes) < 1 or cardinality(p_empreintes) > 8
     or exists (select 1 from unnest(p_empreintes) e where e is null or octet_length(e) <> 32) then
    raise exception 'De une à huit empreintes de 32 octets.' using errcode = '22023';
  end if;

  for r in
    select distinct on (e.dossier_id, e.qualite) e.dossier_id, e.qualite, d.statut,
           private.tamila_voit_dossier_pour(v_uid, p_client, e.dossier_id::text) as vu,
           case when (p_qualite = 'client' and e.qualite = 'adverse') or (p_qualite = 'adverse' and e.qualite = 'client') then 'conflit'
                when p_qualite = e.qualite then 'meme_cote'
                else 'information' end as nature
      from public.tamila_empreintes e
      join public.tamila_dossiers d on d.id = e.dossier_id
     where e.client_id = p_client and e.empreinte = any (p_empreintes)
       and e.dossier_id is distinct from p_dossier
       and (d.statut = 'efface' or exists (select 1 from public.tamila_parties pa where pa.id = e.partie_id))
     order by e.dossier_id, e.qualite
  loop
    v_total := v_total + 1;
    if r.nature = 'conflit' then v_conflits := v_conflits + 1; end if;
    if r.vu and r.statut <> 'efface' then
      v_vus := v_vus || jsonb_build_object('dossier', r.dossier_id, 'qualite', r.qualite, 'statut', r.statut, 'nature', r.nature);
    else
      v_hors_vue := v_hors_vue + 1;
      v_vus := v_vus || jsonb_build_object('dossier', null, 'qualite', r.qualite, 'statut', case when r.statut = 'efface' then 'efface' end,
                                           'nature', r.nature);
    end if;
  end loop;

  insert into public.tamila_controles_conflits (client_id, dossier_id, demande_par, qualite, empreintes, correspondances, conflits, resultat)
  values (p_client, p_dossier, v_uid, p_qualite, cardinality(p_empreintes), v_total, v_conflits,
          jsonb_build_object('hors_vue', v_hors_vue))
  returning id into v_id;
  perform private.journaliser_module(p_client, 'tamila', 'tamila.conflits.controle', 'tamila_dossier', coalesce(p_dossier::text, 'nouveau'),
    jsonb_build_object('controle', v_id, 'qualite', p_qualite, 'correspondances', v_total, 'conflits', v_conflits));
  return jsonb_build_object('controle', v_id, 'correspondances', v_total, 'conflits', v_conflits, 'hors_vue', v_hors_vue,
                            'trouves', v_vus);
end $function$;

-- La décision de l'avocat sur un contrôle : pas de conflit, conflit levé (accord des clients, RIN art. 4.1), refus.
create or replace function private.tamila_decider_conflit(p_controle uuid, p_decision text, p_motif text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_c public.tamila_controles_conflits;
begin
  select * into v_c from public.tamila_controles_conflits where id = p_controle for update;
  if not found then
    raise exception 'Contrôle introuvable.' using errcode = 'P0002';
  end if;
  if v_uid is null or not private.tamila_est_avocat(v_uid, v_c.client_id)
     or (v_c.dossier_id is not null and not private.tamila_gere_dossier_pour(v_uid, v_c.dossier_id)
         and not private.a_un_role(v_c.client_id, array['gerant', 'admin']))
     or (v_c.dossier_id is null and v_c.demande_par <> v_uid and not private.a_un_role(v_c.client_id, array['gerant', 'admin'])) then
    raise exception 'La décision sur un conflit revient à l''avocat qui gère le dossier, ou à un associé.' using errcode = '42501';
  end if;
  if v_c.decision is not null then
    raise exception 'Ce contrôle a déjà sa décision (%).', v_c.decision using errcode = '55000';
  end if;
  if p_decision is null or p_decision not in ('pas_de_conflit', 'conflit_leve', 'refus') then
    raise exception 'Décision inconnue : %.', coalesce(p_decision, 'vide') using errcode = '22023';
  end if;
  if v_c.conflits > 0 and p_decision = 'pas_de_conflit' then
    raise exception 'Un conflit a été trouvé : il se lève (accord écrit des clients) ou le dossier se refuse.' using errcode = '22023';
  end if;
  if p_motif is null or p_motif !~ '^[a-z][a-z_]{2,40}$' then
    raise exception 'Le motif est un code (homonyme, accord_ecrit_des_clients, meme_cote, ancien_dossier_sans_lien…), jamais un texte libre.' using errcode = '22023';
  end if;
  update public.tamila_controles_conflits set decision = p_decision, motif = p_motif, decide_par = v_uid, decide_le = now() where id = p_controle;
  perform private.journaliser_module(v_c.client_id, 'tamila', 'tamila.conflits.decide', 'tamila_dossier', coalesce(v_c.dossier_id::text, 'nouveau'),
    jsonb_build_object('controle', p_controle, 'decision', p_decision, 'motif', p_motif));
end $function$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- La vigilance LCB-FT
-- ════════════════════════════════════════════════════════════════════════════════════════════

create or replace function private.tamila_poser_vigilance(p_dossier uuid, p_assujetti boolean, p_activite text default null,
                                                          p_identification_le date default null, p_identification_piece uuid default null,
                                                          p_beneficiaire_effectif_le date default null, p_risque text default null)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_auj date := (now() at time zone 'Europe/Paris')::date;
begin
  v_d := private.tamila_dossier_ecrit(p_dossier, true);
  if v_uid is not null and not private.tamila_gere_dossier_pour(v_uid, p_dossier) then
    raise exception 'La vigilance d''un dossier est posée par son responsable ou un associé.' using errcode = '42501';
  end if;
  if p_assujetti is null or p_assujetti <> (p_activite is not null) then
    raise exception 'Un dossier assujetti nomme son activité (CMF art. L.561-3) ; un dossier non assujetti n''en nomme pas.' using errcode = '22023';
  end if;
  if p_activite is not null and p_activite not in ('transaction_immobiliere', 'transaction_financiere', 'gestion_fonds', 'constitution_societe',
                                                   'fiducie', 'cession_entreprise', 'autre_assujettie') then
    raise exception 'Activité inconnue : %.', p_activite using errcode = '22023';
  end if;
  if p_risque is not null and p_risque not in ('faible', 'standard', 'eleve') then
    raise exception 'Niveau de risque inconnu : %.', p_risque using errcode = '22023';
  end if;
  if (p_identification_le is not null and p_identification_le > v_auj) or (p_beneficiaire_effectif_le is not null and p_beneficiaire_effectif_le > v_auj) then
    raise exception 'Une identification est datée du passé ou du jour.' using errcode = '22023';
  end if;
  if p_identification_piece is not null and not exists (select 1 from public.pieces pc where pc.id = p_identification_piece and pc.client_id = v_d.client_id
                                                          and pc.objet_type = 'tamila_dossier' and pc.objet_id = v_d.id::text) then
    raise exception 'La pièce d''identité est une pièce de ce dossier.' using errcode = '22023';
  end if;
  insert into public.tamila_vigilances (dossier_id, client_id, assujetti, activite, identification_le, identification_piece,
                                        beneficiaire_effectif_le, risque, revue_le, par, maj_le)
  values (p_dossier, v_d.client_id, p_assujetti, p_activite, p_identification_le, p_identification_piece, p_beneficiaire_effectif_le,
          p_risque, v_auj, v_uid, now())
  on conflict (dossier_id) do update
     set assujetti = excluded.assujetti, activite = excluded.activite, identification_le = excluded.identification_le,
         identification_piece = excluded.identification_piece, beneficiaire_effectif_le = excluded.beneficiaire_effectif_le,
         risque = excluded.risque, revue_le = excluded.revue_le, par = excluded.par, maj_le = now();
  perform private.journaliser_module(v_d.client_id, 'tamila', 'tamila.vigilance.posee', 'tamila_dossier', p_dossier::text,
    jsonb_build_object('assujetti', p_assujetti, 'activite', p_activite, 'risque', p_risque,
                       'identifie', p_identification_le is not null, 'beneficiaire', p_beneficiaire_effectif_le is not null));
end $function$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Le résumé de conformité d'un dossier, pour l'écran
-- ════════════════════════════════════════════════════════════════════════════════════════════

create or replace function private.tamila_conformite(p_dossier uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_v public.tamila_vigilances;
  v_parties integer;
  v_indexees integer;
begin
  select * into v_d from public.tamila_dossiers where id = p_dossier;
  if not found or (v_uid is not null and not private.tamila_voit_dossier_pour(v_uid, v_d.client_id, p_dossier::text)) then
    raise exception 'Ce dossier ne vous est pas ouvert.' using errcode = '42501';
  end if;
  select * into v_v from public.tamila_vigilances where dossier_id = p_dossier;
  select count(*) into v_parties from public.tamila_parties pa where pa.dossier_id = p_dossier and pa.qualite in ('client', 'adverse');
  select count(distinct e.partie_id) into v_indexees from public.tamila_empreintes e
   join public.tamila_parties pa on pa.id = e.partie_id
   where e.dossier_id = p_dossier and pa.qualite in ('client', 'adverse');
  return jsonb_build_object(
    'dossier', p_dossier,
    'index', exists (select 1 from public.tamila_index_cles k where k.client_id = v_d.client_id),
    'parties', v_parties,
    'parties_indexees', v_indexees,
    'controles', (select count(*) from public.tamila_controles_conflits c where c.dossier_id = p_dossier),
    'conflits_sans_decision', (select count(*) from public.tamila_controles_conflits c where c.dossier_id = p_dossier and c.conflits > 0 and c.decision is null),
    'dernier_controle', (select jsonb_build_object('le', c.demande_le, 'correspondances', c.correspondances, 'conflits', c.conflits, 'decision', c.decision)
                           from public.tamila_controles_conflits c where c.dossier_id = p_dossier order by c.demande_le desc limit 1),
    'vigilance', case when v_v.dossier_id is null then null else to_jsonb(v_v) end,
    -- À faire : la vigilance n'est pas posée, ou le dossier est assujetti sans client identifié, sans bénéficiaire
    -- effectif vérifié ou sans niveau de risque, ou la revue a plus d'un an.
    'vigilance_a_faire', v_d.statut in ('attente', 'ouvert', 'audit')
                         and (v_v.dossier_id is null
                              or (v_v.assujetti and (v_v.identification_le is null or v_v.beneficiaire_effectif_le is null or v_v.risque is null))
                              or (v_v.assujetti and v_v.revue_le < (now() at time zone 'Europe/Paris')::date - 365)));
end $function$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- La clé d'index d'un cabinet au coffre (b4_05) : émise et déballée par l'ouvrier tamila-coffre
-- ════════════════════════════════════════════════════════════════════════════════════════════

-- Le gérant demande la clé d'index au coffre : la porte prouve son autorité et ouvre une ligne au journal du coffre
-- (pour « membre », sur l'identifiant du cabinet, détail index).
create or replace function private.tamila_coffre_demander_index(p_client uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_c public.tamila_coffres;
  v_journal bigint;
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant']) then
    raise exception 'La clé d''index du cabinet est demandée par son gérant.' using errcode = '42501';
  end if;
  select * into v_c from public.tamila_coffres where client_id = p_client;
  if not found or v_c.statut = 'local' then
    raise exception 'Ce cabinet chiffre sous sa phrase : la clé d''index se tire dans le navigateur.' using errcode = '55000';
  end if;
  if exists (select 1 from public.tamila_index_cles k where k.client_id = p_client) then
    raise exception 'Le cabinet a déjà sa clé d''index.' using errcode = '55000';
  end if;
  insert into public.tamila_coffre_journal (client_id, dossier_id, pour, demandeur, detail)
  values (p_client, p_client, 'membre', v_uid, '{"index": "creation"}'::jsonb)
  returning id into v_journal;
  return jsonb_build_object('client', p_client, 'journal', v_journal, 'region', v_c.region, 'cle_maitre', v_c.cle_maitre,
                            'reference', private.tamila_coffre_reference(v_c.region, v_c.cle_maitre));
end $function$;

create or replace function private.tamila_coffre_poser_index(p_journal bigint, p_enveloppe bytea)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_j public.tamila_coffre_journal;
  v_c public.tamila_coffres;
begin
  if not private.tamila_coffre_serveur() then
    raise exception 'La clé d''index d''un cabinet au coffre est posée par le serveur.' using errcode = '42501';
  end if;
  select * into v_j from public.tamila_coffre_journal where id = p_journal for update;
  if not found or v_j.detail ->> 'index' is distinct from 'creation' or v_j.issue <> 'demande' or v_j.demande_le < now() - interval '1 hour' then
    raise exception 'Demande de clé d''index introuvable, close ou trop ancienne.' using errcode = '55000';
  end if;
  if p_enveloppe is null or octet_length(p_enveloppe) < 16 or octet_length(p_enveloppe) > 4096 then
    raise exception 'Enveloppe illisible.' using errcode = '22023';
  end if;
  select * into v_c from public.tamila_coffres where client_id = v_j.client_id;
  insert into public.tamila_index_cles (client_id, fournisseur, reference, enveloppe, cree_par)
  values (v_j.client_id, 'scaleway', private.tamila_coffre_reference(v_c.region, v_c.cle_maitre), p_enveloppe, v_j.demandeur);
  update public.tamila_coffre_journal set issue = 'emise', conclu_le = now() where id = p_journal;
  perform private.journaliser_module(v_j.client_id, 'tamila', 'tamila.index.pose', 'tamila_cabinet', v_j.client_id::text,
    jsonb_build_object('fournisseur', 'scaleway', 'par', v_j.demandeur));
end $function$;

-- Une personne du cabinet (pas un stagiaire) : l'enveloppe Scaleway de la clé d'index, remise journalisée.
create or replace function private.tamila_coffre_index_pour_membre(p_client uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_k public.tamila_index_cles;
  v_journal bigint;
begin
  if v_uid is null or not exists (select 1 from public.comptes c where c.user_id = v_uid and c.client_id = p_client and c.role <> 'lecteur') then
    raise exception 'La clé d''index se remet à une personne du cabinet qui ouvre des dossiers.' using errcode = '42501';
  end if;
  select * into v_k from public.tamila_index_cles where client_id = p_client;
  if not found then
    return null;
  end if;
  if v_k.fournisseur = 'local' then
    return jsonb_build_object('fournisseur', 'local');
  end if;
  insert into public.tamila_coffre_journal (client_id, dossier_id, pour, demandeur, detail)
  values (p_client, p_client, 'membre', v_uid, '{"index": "remise"}'::jsonb)
  returning id into v_journal;
  return jsonb_build_object('fournisseur', 'scaleway', 'journal', v_journal, 'reference', v_k.reference, 'enveloppe', encode(v_k.enveloppe, 'hex'));
end $function$;

-- ════════════════════════════════════════════════════════════════════════════════════════════
-- Les portes publiques et les droits
-- ════════════════════════════════════════════════════════════════════════════════════════════

create or replace function public.tamila_poser_index_cle(p_client uuid, p_reference text, p_enveloppe bytea) returns void
language sql set search_path to '' as $function$ select private.tamila_poser_index_cle(p_client, p_reference, p_enveloppe) $function$;
create or replace function public.tamila_index_cle(p_client uuid) returns jsonb
language sql stable set search_path to '' as $function$ select private.tamila_index_cle(p_client) $function$;
create or replace function public.tamila_indexer_partie(p_partie uuid, p_empreintes bytea[]) returns integer
language sql set search_path to '' as $function$ select private.tamila_indexer_partie(p_partie, p_empreintes) $function$;
create or replace function public.tamila_controler_conflits(p_client uuid, p_dossier uuid, p_qualite text, p_empreintes bytea[]) returns jsonb
language sql set search_path to '' as $function$ select private.tamila_controler_conflits(p_client, p_dossier, p_qualite, p_empreintes) $function$;
create or replace function public.tamila_decider_conflit(p_controle uuid, p_decision text, p_motif text) returns void
language sql set search_path to '' as $function$ select private.tamila_decider_conflit(p_controle, p_decision, p_motif) $function$;
create or replace function public.tamila_poser_vigilance(p_dossier uuid, p_assujetti boolean, p_activite text default null,
                                                         p_identification_le date default null, p_identification_piece uuid default null,
                                                         p_beneficiaire_effectif_le date default null, p_risque text default null) returns void
language sql set search_path to '' as $function$
  select private.tamila_poser_vigilance(p_dossier, p_assujetti, p_activite, p_identification_le, p_identification_piece, p_beneficiaire_effectif_le, p_risque) $function$;
create or replace function public.tamila_conformite(p_dossier uuid) returns jsonb
language sql stable set search_path to '' as $function$ select private.tamila_conformite(p_dossier) $function$;
create or replace function public.tamila_coffre_demander_index(p_client uuid) returns jsonb
language sql set search_path to '' as $function$ select private.tamila_coffre_demander_index(p_client) $function$;
create or replace function public.tamila_coffre_poser_index(p_journal bigint, p_enveloppe bytea) returns void
language sql set search_path to '' as $function$ select private.tamila_coffre_poser_index(p_journal, p_enveloppe) $function$;
create or replace function public.tamila_coffre_index_pour_membre(p_client uuid) returns jsonb
language sql set search_path to '' as $function$ select private.tamila_coffre_index_pour_membre(p_client) $function$;

do $grants$
declare f text;
begin
  -- Les portes des personnes connectées.
  foreach f in array array[
    'tamila_poser_index_cle(uuid, text, bytea)',
    'tamila_index_cle(uuid)',
    'tamila_indexer_partie(uuid, bytea[])',
    'tamila_controler_conflits(uuid, uuid, text, bytea[])',
    'tamila_decider_conflit(uuid, text, text)',
    'tamila_poser_vigilance(uuid, boolean, text, date, uuid, date, text)',
    'tamila_conformite(uuid)',
    'tamila_coffre_demander_index(uuid)',
    'tamila_coffre_index_pour_membre(uuid)'] loop
    execute format('revoke execute on function private.%s from public', f);
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function private.%s to authenticated', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- Le serveur seul.
  revoke execute on function private.tamila_coffre_poser_index(bigint, bytea) from public;
  revoke execute on function public.tamila_coffre_poser_index(bigint, bytea) from public, anon, authenticated;
  grant execute on function private.tamila_coffre_poser_index(bigint, bytea) to service_role;
  grant execute on function public.tamila_coffre_poser_index(bigint, bytea) to service_role;
  -- La conformité se lit aussi par le serveur.
  grant execute on function private.tamila_conformite(uuid) to service_role;
  grant execute on function public.tamila_conformite(uuid) to service_role;
end $grants$;
