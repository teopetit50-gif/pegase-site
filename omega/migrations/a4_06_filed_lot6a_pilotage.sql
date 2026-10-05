-- FILED, lot 6a — Pilotage : engagé, échéancier, délai, pièces en cours, indicateurs, export tableur.
--
-- Ce que ce lot pose :
--   filed_reglements, filed_litiges            ce qui est réglé, ce qui est en litige (pour l'échéancier et les comptes) ;
--   filed_marquer_reglee, filed_ouvrir_litige, filed_clore_litige   les portes ;
--   filed_engage_mois(client, mois)            l'engagé du mois par fournisseur, société et centre de coût ;
--   filed_echeancier(client, au)               la prévision de décaissement à trente et soixante jours ;
--   filed_delai_traitement(client, du, au)     le délai moyen de la réception au classement ;
--   filed_pieces_en_cours(client)              bloquées, en litige, en attente d'approbation, comptées en continu ;
--   indicateurs filed.*                        enregistrés par private.filed_mesurer(client, jour) dans les mesures du socle ;
--   filed_exporter_tableau(…)                  l'export CSV à la demande, inscrit au journal ;
--   filed_exports_programmes, filed_exports    l'export à date fixe, produit par le balayage de FILED.
--
-- Migration idempotente.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Règlements et litiges
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.filed_reglements (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  facture_id   uuid not null references public.filed_factures(id) on delete cascade,
  document_id  uuid not null references public.filed_documents(id) on delete cascade,
  regle_le     date not null,
  montant      numeric(14,2) not null check (montant <> 0),
  mode         text check (mode is null or mode in ('virement', 'prelevement', 'cheque', 'carte', 'especes', 'compensation', 'autre')),
  reference    text,
  saisi_par    uuid,
  cree_le      timestamptz not null default now()
);
comment on table public.filed_reglements is
  'Ce qui a été réglé sur une facture : date, montant, mode. Saisi par une personne ou repris du relevé bancaire. Sert l''échéancier : le reste à payer est le TTC moins les règlements.';
create index if not exists filed_reglements_facture on public.filed_reglements (facture_id);
create index if not exists filed_reglements_client on public.filed_reglements (client_id, regle_le);
alter table public.filed_reglements enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_reglements' and policyname = 'filed_reglements_lecture') then
    execute 'create policy filed_reglements_lecture on public.filed_reglements for select to authenticated using (exists (select 1 from public.filed_documents d where d.id = document_id))';
  end if;
end $$;
revoke insert, update, delete on public.filed_reglements from anon, authenticated;
grant select on public.filed_reglements to authenticated;

create table if not exists public.filed_litiges (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  facture_id   uuid not null references public.filed_factures(id) on delete cascade,
  document_id  uuid not null references public.filed_documents(id) on delete cascade,
  ouvert_le    timestamptz not null default now(),
  ouvert_par   uuid,
  motif        text not null check (char_length(btrim(motif)) between 3 and 500),
  clos_le      timestamptz,
  clos_par     uuid,
  issue        text,
  constraint filed_litiges_issue check ((clos_le is null) = (issue is null))
);
comment on table public.filed_litiges is
  'Un litige avec le fournisseur sur une facture : ouvert avec son motif, clos avec son issue. Une facture en litige n''entre pas dans l''échéancier tant que le litige est ouvert.';
create index if not exists filed_litiges_facture on public.filed_litiges (facture_id);
create index if not exists filed_litiges_ouverts on public.filed_litiges (client_id) where clos_le is null;
alter table public.filed_litiges enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_litiges' and policyname = 'filed_litiges_lecture') then
    execute 'create policy filed_litiges_lecture on public.filed_litiges for select to authenticated using (exists (select 1 from public.filed_documents d where d.id = document_id))';
  end if;
end $$;
revoke insert, update, delete on public.filed_litiges from anon, authenticated;
grant select on public.filed_litiges to authenticated;

insert into private.tables_locataires (nom, ordre_effacement, note) values ('filed_reglements', 2, 'FILED, lot 6'), ('filed_litiges', 2, 'FILED, lot 6')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;
insert into private.tables_objets (nom, objet_type, colonne, ordre_effacement) values
  ('filed_reglements', 'filed_document', 'document_id', 5), ('filed_litiges', 'filed_document', 'document_id', 5)
on conflict (nom) do update set objet_type = excluded.objet_type, colonne = excluded.colonne, ordre_effacement = excluded.ordre_effacement;

create or replace function private.filed_marquer_reglee(p_facture uuid, p_regle_le date, p_montant numeric default null, p_mode text default null, p_reference text default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_uid uuid; v_id uuid; v_montant numeric;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found then raise exception 'Facture introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(v_f.client_id, array['gerant', 'admin', 'valideur'], v_f.entite_id);
  if (select auth.uid()) is not null and not private.voit_objet(v_f.client_id, 'filed_document', v_f.document_id::text) then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  if v_f.statut not in ('validee', 'comptabilisee') then
    raise exception 'Un règlement se note sur une facture validée ou comptabilisée (ici : %).', v_f.statut using errcode = '55000';
  end if;
  v_montant := coalesce(p_montant, coalesce(v_f.net_a_payer, v_f.montant_ttc) - coalesce((select sum(r.montant) from public.filed_reglements r where r.facture_id = v_f.id), 0));
  if coalesce(v_montant, 0) = 0 then raise exception 'Rien à régler sur cette facture.' using errcode = '22023'; end if;
  insert into public.filed_reglements (client_id, facture_id, document_id, regle_le, montant, mode, reference, saisi_par)
  values (v_f.client_id, v_f.id, v_f.document_id, coalesce(p_regle_le, current_date), round(v_montant, 2), p_mode, left(p_reference, 80), v_uid)
  returning id into v_id;
  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'reglee',
    format('Règlement noté : %s le %s%s.', round(v_montant, 2), to_char(coalesce(p_regle_le, current_date), 'DD/MM/YYYY'), coalesce(' (' || p_mode || ')', '')),
    jsonb_build_object('reglement', v_id, 'montant', round(v_montant, 2), 'regle_le', coalesce(p_regle_le, current_date)));
  perform private.filed_journaliser(v_f.client_id, 'filed.reglement', 'filed_facture', v_f.id::text,
    jsonb_build_object('reglement', v_id, 'regle_le', coalesce(p_regle_le, current_date)), v_f.entite_id);
  return v_id;
end $$;

create or replace function public.filed_marquer_reglee(p_facture uuid, p_regle_le date default null, p_montant numeric default null, p_mode text default null, p_reference text default null)
returns uuid language sql set search_path to '' as $$ select private.filed_marquer_reglee(p_facture, p_regle_le, p_montant, p_mode, p_reference) $$;
comment on function public.filed_marquer_reglee(uuid, date, numeric, text, text) is 'Note un règlement sur une facture validée (montant par défaut : le reste à payer).';
revoke all on function public.filed_marquer_reglee(uuid, date, numeric, text, text) from public, anon;
grant execute on function public.filed_marquer_reglee(uuid, date, numeric, text, text) to authenticated, service_role;

create or replace function private.filed_ouvrir_litige(p_facture uuid, p_motif text)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_uid uuid; v_id uuid;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found then raise exception 'Facture introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(v_f.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'], v_f.entite_id);
  if (select auth.uid()) is not null and not private.voit_objet(v_f.client_id, 'filed_document', v_f.document_id::text) then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  if nullif(btrim(p_motif), '') is null or char_length(btrim(p_motif)) < 3 then raise exception 'Un litige dit pourquoi.' using errcode = '22023'; end if;
  if exists (select 1 from public.filed_litiges l where l.facture_id = v_f.id and l.clos_le is null) then
    raise exception 'Un litige est déjà ouvert sur cette facture.' using errcode = '55000';
  end if;
  insert into public.filed_litiges (client_id, facture_id, document_id, ouvert_par, motif)
  values (v_f.client_id, v_f.id, v_f.document_id, v_uid, left(btrim(p_motif), 500)) returning id into v_id;
  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'litige_ouvert', 'Litige ouvert : ' || left(btrim(p_motif), 300), jsonb_build_object('litige', v_id));
  perform private.filed_journaliser(v_f.client_id, 'filed.litige.ouverture', 'filed_facture', v_f.id::text, jsonb_build_object('litige', v_id), v_f.entite_id);
  return v_id;
end $$;

create or replace function public.filed_ouvrir_litige(p_facture uuid, p_motif text)
returns uuid language sql set search_path to '' as $$ select private.filed_ouvrir_litige(p_facture, p_motif) $$;
comment on function public.filed_ouvrir_litige(uuid, text) is 'Ouvre un litige sur une facture, avec son motif.';
revoke all on function public.filed_ouvrir_litige(uuid, text) from public, anon;
grant execute on function public.filed_ouvrir_litige(uuid, text) to authenticated, service_role;

create or replace function private.filed_clore_litige(p_litige uuid, p_issue text)
returns void language plpgsql security definer set search_path to '' as $$
declare v_l public.filed_litiges; v_f public.filed_factures; v_uid uuid;
begin
  select * into v_l from public.filed_litiges where id = p_litige for update;
  if not found then raise exception 'Litige introuvable.' using errcode = 'P0002'; end if;
  if v_l.clos_le is not null then raise exception 'Ce litige est déjà clos.' using errcode = '55000'; end if;
  select * into v_f from public.filed_factures where id = v_l.facture_id;
  v_uid := private.filed_exiger_acteur(v_f.client_id, array['gerant', 'admin', 'valideur'], v_f.entite_id);
  if nullif(btrim(p_issue), '') is null then raise exception 'Un litige se clôt avec son issue.' using errcode = '22023'; end if;
  update public.filed_litiges set clos_le = now(), clos_par = v_uid, issue = left(btrim(p_issue), 500) where id = p_litige;
  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'litige_clos', 'Litige clos : ' || left(btrim(p_issue), 300), jsonb_build_object('litige', p_litige));
  perform private.filed_journaliser(v_f.client_id, 'filed.litige.cloture', 'filed_facture', v_f.id::text, jsonb_build_object('litige', p_litige), v_f.entite_id);
end $$;

create or replace function public.filed_clore_litige(p_litige uuid, p_issue text)
returns void language sql set search_path to '' as $$ select private.filed_clore_litige(p_litige, p_issue) $$;
comment on function public.filed_clore_litige(uuid, text) is 'Clôt un litige avec son issue.';
revoke all on function public.filed_clore_litige(uuid, text) from public, anon;
grant execute on function public.filed_clore_litige(uuid, text) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Le droit de lire le pilotage d'une organisation
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_exiger_lecteur(p_client uuid, p_entite uuid default null)
returns void language plpgsql stable security definer set search_path to '' as $$
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur', 'collaborateur'], p_entite);
end $$;

-- Les factures qui comptent dans le pilotage : reçues, non écartées, non refusées, dans le périmètre du lecteur.
create or replace function private.filed_factures_visibles(p_client uuid, p_entite uuid)
returns setof public.filed_factures language sql stable security definer set search_path to '' as $$
  select f.* from public.filed_factures f
   where f.client_id = p_client
     and (p_entite is null or f.entite_id = p_entite)
     and ((select auth.uid()) is null or private.perimetre_couvre((select auth.uid()), f.client_id, f.entite_id))
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. L'engagé du mois : par fournisseur, par société et par centre de coût
-- ───────────────────────────────────────────────────────────────────────────
-- Engagé = les factures du mois (date d'émission) reçues et non écartées, avoirs en moins. Le centre de
-- coût vient des imputations validées, au prorata ; sans imputation, la ligne est « non imputé ».
create or replace function private.filed_engage_mois(p_client uuid, p_mois date default null, p_entite uuid default null)
returns table (entite_id uuid, entite text, fournisseur_id uuid, fournisseur text, centre_id uuid, centre text, nb_factures bigint, montant_ht numeric, montant_ttc numeric)
language plpgsql stable security definer set search_path to '' as $$
declare v_debut date := date_trunc('month', coalesce(p_mois, current_date)::timestamp)::date; v_fin date;
begin
  perform private.filed_exiger_lecteur(p_client, p_entite);
  v_fin := (v_debut + interval '1 month' - interval '1 day')::date;
  return query
    with f as (
      select x.id, x.entite_id, x.fournisseur_id,
             case when x.nature = 'avoir' then -1 else 1 end * coalesce(x.montant_ht, 0) as ht,
             case when x.nature = 'avoir' then -1 else 1 end * coalesce(x.montant_ttc, 0) as ttc
        from private.filed_factures_visibles(p_client, p_entite) x
       where x.statut in ('bloquee', 'a_valider', 'validee', 'comptabilisee')
         and x.date_emission between v_debut and v_fin
    ),
    imp as (
      select i.facture_id, i.centre_id, sum(i.montant_ht) as part, sum(sum(i.montant_ht)) over (partition by i.facture_id) as total
        from public.filed_imputations i join f on f.id = i.facture_id
       where i.statut = 'validee'
       group by i.facture_id, i.centre_id
    ),
    rep as (
      select f.id, f.entite_id, f.fournisseur_id, imp.centre_id,
             f.ht * coalesce(imp.part / nullif(imp.total, 0), 1) as ht,
             f.ttc * coalesce(imp.part / nullif(imp.total, 0), 1) as ttc
        from f left join imp on imp.facture_id = f.id
    )
    select r.entite_id, e.nom, r.fournisseur_id, coalesce(fo.nom, 'Fournisseur non rattaché'), r.centre_id, coalesce(k.code || ' — ' || k.libelle, 'Non imputé'),
           count(distinct r.id), round(sum(r.ht), 2), round(sum(r.ttc), 2)
      from rep r
      left join public.entites e on e.id = r.entite_id
      left join public.filed_fournisseurs fo on fo.id = r.fournisseur_id
      left join public.filed_centres_cout k on k.id = r.centre_id
     group by r.entite_id, e.nom, r.fournisseur_id, fo.nom, r.centre_id, k.code, k.libelle
     order by e.nom, fo.nom, k.code;
end $$;

create or replace function public.filed_engage_mois(p_client uuid, p_mois date default null, p_entite uuid default null)
returns table (entite_id uuid, entite text, fournisseur_id uuid, fournisseur text, centre_id uuid, centre text, nb_factures bigint, montant_ht numeric, montant_ttc numeric)
language sql set search_path to '' as $$ select * from private.filed_engage_mois(p_client, p_mois, p_entite) $$;
comment on function public.filed_engage_mois(uuid, date, uuid) is 'L''engagé d''un mois (date d''émission), par société, fournisseur et centre de coût, avoirs déduits.';
revoke all on function public.filed_engage_mois(uuid, date, uuid) from public, anon;
grant execute on function public.filed_engage_mois(uuid, date, uuid) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. L'échéancier : prévision de décaissement à trente et soixante jours
-- ───────────────────────────────────────────────────────────────────────────
-- Les factures validées ou comptabilisées, hors litige ouvert, dont le reste à payer est positif.
-- Échéance = celle lue sur la pièce, sinon trente jours après l'émission (C. com. L441-10, délai par défaut).
create or replace function private.filed_echeancier(p_client uuid, p_au date default null, p_entite uuid default null)
returns table (horizon text, echeance date, entite_id uuid, entite text, fournisseur_id uuid, fournisseur text, facture_id uuid, numero text, montant_ttc numeric, regle numeric, reste_a_payer numeric, en_retard boolean)
language plpgsql stable security definer set search_path to '' as $$
declare v_au date := coalesce(p_au, current_date);
begin
  perform private.filed_exiger_lecteur(p_client, p_entite);
  return query
    with f as (
      select x.*, coalesce(x.echeance_lue, x.date_emission + 30) as ech,
             coalesce((select sum(r.montant) from public.filed_reglements r where r.facture_id = x.id), 0) as deja
        from private.filed_factures_visibles(p_client, p_entite) x
       where x.statut in ('validee', 'comptabilisee') and x.nature = 'facture'
         and not exists (select 1 from public.filed_litiges l where l.facture_id = x.id and l.clos_le is null)
    )
    select case when f.ech <= v_au + 30 then '30 jours' when f.ech <= v_au + 60 then '60 jours' else 'au-delà' end,
           f.ech, f.entite_id, e.nom, f.fournisseur_id, coalesce(fo.nom, 'Fournisseur non rattaché'), f.id, f.numero,
           coalesce(f.net_a_payer, f.montant_ttc), f.deja, round(coalesce(f.net_a_payer, f.montant_ttc) - f.deja, 2), f.ech < v_au
      from f
      left join public.entites e on e.id = f.entite_id
      left join public.filed_fournisseurs fo on fo.id = f.fournisseur_id
     where coalesce(f.net_a_payer, f.montant_ttc) - f.deja > 0.005
     order by f.ech, fo.nom;
end $$;

create or replace function public.filed_echeancier(p_client uuid, p_au date default null, p_entite uuid default null)
returns table (horizon text, echeance date, entite_id uuid, entite text, fournisseur_id uuid, fournisseur text, facture_id uuid, numero text, montant_ttc numeric, regle numeric, reste_a_payer numeric, en_retard boolean)
language sql set search_path to '' as $$ select * from private.filed_echeancier(p_client, p_au, p_entite) $$;
comment on function public.filed_echeancier(uuid, date, uuid) is 'L''échéancier fournisseur : ce qui reste à décaisser, à trente jours, à soixante jours et au-delà, hors litiges ouverts.';
revoke all on function public.filed_echeancier(uuid, date, uuid) from public, anon;
grant execute on function public.filed_echeancier(uuid, date, uuid) to authenticated, service_role;

-- Les deux sommes, pour les indicateurs et l'écran.
create or replace function private.filed_decaissement(p_client uuid, p_au date, p_entite uuid, p_jours integer)
returns numeric language sql stable security definer set search_path to '' as $$
  select coalesce(sum(coalesce(x.net_a_payer, x.montant_ttc) - coalesce((select sum(r.montant) from public.filed_reglements r where r.facture_id = x.id), 0)), 0)
    from public.filed_factures x
   where x.client_id = p_client and (p_entite is null or x.entite_id = p_entite)
     and x.statut in ('validee', 'comptabilisee') and x.nature = 'facture'
     and not exists (select 1 from public.filed_litiges l where l.facture_id = x.id and l.clos_le is null)
     and coalesce(x.echeance_lue, x.date_emission + 30) <= p_au + p_jours
     and coalesce(x.net_a_payer, x.montant_ttc) - coalesce((select sum(r.montant) from public.filed_reglements r where r.facture_id = x.id), 0) > 0.005
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Le délai de traitement : de la réception au classement (validation)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_delai_traitement(p_client uuid, p_du date default null, p_au date default null, p_entite uuid default null)
returns table (nb_factures bigint, delai_moyen_jours numeric, delai_median_jours numeric, delai_max_jours numeric)
language plpgsql stable security definer set search_path to '' as $$
declare v_du date := coalesce(p_du, date_trunc('month', current_date::timestamp)::date); v_au date := coalesce(p_au, current_date);
begin
  perform private.filed_exiger_lecteur(p_client, p_entite);
  return query
    with d as (
      select extract(epoch from (a.archive_le - doc.recu_le)) / 86400 as jours
        from public.filed_archives a
        join public.filed_documents doc on doc.id = a.document_id
        join private.filed_factures_visibles(p_client, p_entite) f on f.id = a.facture_id
       where a.client_id = p_client and a.archive_le::date between v_du and v_au
         and a.version = (select min(a2.version) from public.filed_archives a2 where a2.facture_id = a.facture_id)
    )
    select count(*), round(avg(d.jours)::numeric, 1), round((percentile_cont(0.5) within group (order by d.jours))::numeric, 1), round(max(d.jours)::numeric, 1) from d;
end $$;

create or replace function public.filed_delai_traitement(p_client uuid, p_du date default null, p_au date default null, p_entite uuid default null)
returns table (nb_factures bigint, delai_moyen_jours numeric, delai_median_jours numeric, delai_max_jours numeric)
language sql set search_path to '' as $$ select * from private.filed_delai_traitement(p_client, p_du, p_au, p_entite) $$;
comment on function public.filed_delai_traitement(uuid, date, date, uuid) is 'Le délai de traitement des factures classées sur la période : de la réception de la pièce à sa validation (première archive).';
revoke all on function public.filed_delai_traitement(uuid, date, date, uuid) from public, anon;
grant execute on function public.filed_delai_traitement(uuid, date, date, uuid) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Les pièces en cours : bloquées, en litige, en attente d'approbation, à compléter
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_pieces_en_cours(p_client uuid, p_entite uuid default null)
returns table (categorie text, libelle text, nombre bigint, montant_ttc numeric)
language plpgsql stable security definer set search_path to '' as $$
begin
  perform private.filed_exiger_lecteur(p_client, p_entite);
  return query
    with f as (select * from private.filed_factures_visibles(p_client, p_entite)),
    c as (
      select 'bloquees' as categorie, 'Bloquées par un contrôle' as libelle, 1 as rang, f.id, f.montant_ttc from f where f.statut = 'bloquee'
      union all
      select 'litige', 'En litige avec le fournisseur', 2, f.id, f.montant_ttc from f where exists (select 1 from public.filed_litiges l where l.facture_id = f.id and l.clos_le is null)
      union all
      select 'attente', 'En attente d''approbation', 3, f.id, f.montant_ttc from f where f.statut = 'a_valider'
      union all
      select 'a_completer', 'À compléter (lecture incomplète)', 4, f.id, f.montant_ttc from f where f.statut = 'a_completer'
      union all
      select 'imputation', 'Imputation proposée, à valider', 5, f.id, f.montant_ttc from f where exists (select 1 from public.filed_imputations i where i.facture_id = f.id and i.statut = 'proposee')
    )
    select c.categorie, c.libelle, count(*), round(coalesce(sum(c.montant_ttc), 0), 2) from c group by c.categorie, c.libelle, c.rang order by c.rang;
end $$;

create or replace function public.filed_pieces_en_cours(p_client uuid, p_entite uuid default null)
returns table (categorie text, libelle text, nombre bigint, montant_ttc numeric)
language sql set search_path to '' as $$ select * from private.filed_pieces_en_cours(p_client, p_entite) $$;
comment on function public.filed_pieces_en_cours(uuid, uuid) is 'Les pièces en cours, comptées à l''instant : bloquées, en litige, en attente d''approbation, à compléter, imputation à valider.';
revoke all on function public.filed_pieces_en_cours(uuid, uuid) from public, anon;
grant execute on function public.filed_pieces_en_cours(uuid, uuid) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 7. Les indicateurs du socle (code filed.*), enregistrés chaque jour par entité
-- ───────────────────────────────────────────────────────────────────────────
insert into public.indicateurs (code, version, libelle, definition, formule, unite, sens, agregation, decimales, droit_lecture, droit_detail, source, en_service) values
  ('filed.engage_mois', 1, 'Engagé du mois', 'Total hors taxes des factures fournisseurs émises dans le mois, reçues et non écartées, avoirs déduits.', 'somme(montant_ht signé) des factures du mois, statut hors ecartee/refusee/a_completer', 'euros', 'baisse', 'dernier', 2, 'filed.pilotage', 'filed.pilotage', 'FILED, lot 6', true),
  ('filed.decaissement_30j', 1, 'Décaissement à trente jours', 'Reste à payer des factures validées dont l''échéance tombe dans les trente jours, hors litiges ouverts.', 'somme(ttc - réglé) où échéance <= jour + 30', 'euros', 'baisse', 'dernier', 2, 'filed.pilotage', 'filed.pilotage', 'FILED, lot 6', true),
  ('filed.decaissement_60j', 1, 'Décaissement à soixante jours', 'Reste à payer des factures validées dont l''échéance tombe dans les soixante jours, hors litiges ouverts.', 'somme(ttc - réglé) où échéance <= jour + 60', 'euros', 'baisse', 'dernier', 2, 'filed.pilotage', 'filed.pilotage', 'FILED, lot 6', true),
  ('filed.delai_traitement', 1, 'Délai de traitement', 'Délai moyen, en jours, de la réception d''une pièce à sa validation (première archive), sur les factures validées le jour.', 'somme(jours réception → archive) / nombre de factures archivées', 'jours', 'baisse', 'moyenne', 1, 'filed.pilotage', 'filed.pilotage', 'FILED, lot 6', true),
  ('filed.pieces_bloquees', 1, 'Pièces bloquées', 'Nombre de factures bloquées par un contrôle à la fin du jour.', 'compte(statut = bloquee)', 'nombre', 'baisse', 'dernier', 0, 'filed.pilotage', 'filed.pilotage', 'FILED, lot 6', true),
  ('filed.pieces_litige', 1, 'Pièces en litige', 'Nombre de factures avec un litige ouvert à la fin du jour.', 'compte(litige ouvert)', 'nombre', 'baisse', 'dernier', 0, 'filed.pilotage', 'filed.pilotage', 'FILED, lot 6', true),
  ('filed.pieces_attente', 1, 'Pièces en attente d''approbation', 'Nombre de factures à valider à la fin du jour.', 'compte(statut = a_valider)', 'nombre', 'baisse', 'dernier', 0, 'filed.pilotage', 'filed.pilotage', 'FILED, lot 6', true),
  ('filed.charges_manquantes', 1, 'Factures attendues absentes', 'Nombre d''écritures attendues des charges récurrentes passées en « manquante » et toujours sans facture.', 'compte(filed_charges_attendues.statut = manquante)', 'nombre', 'baisse', 'dernier', 0, 'filed.pilotage', 'filed.pilotage', 'FILED, lot 6', true)
on conflict (code, version) do nothing;

-- Enregistre les mesures d'un jour pour une organisation : consolidé (entité nulle) et par société.
create or replace function private.filed_mesurer(p_client uuid, p_jour date default null)
returns integer language plpgsql security definer set search_path to '' as $$
declare v_jour date := coalesce(p_jour, current_date); v_e record; v_n integer := 0; v_num numeric; v_base numeric; v_mois date;
begin
  v_mois := date_trunc('month', v_jour::timestamp)::date;
  for v_e in
    select null::uuid as id
    union all
    select e.id from public.entites e where e.client_id = p_client and e.type = 'societe'
  loop
    perform public.enregistrer_mesure(p_client, 'filed.engage_mois', 1, 'jour', v_jour,
      (select coalesce(sum(case when f.nature = 'avoir' then -1 else 1 end * coalesce(f.montant_ht, 0)), 0) from public.filed_factures f
        where f.client_id = p_client and (v_e.id is null or f.entite_id = v_e.id) and f.statut in ('bloquee', 'a_valider', 'validee', 'comptabilisee')
          and f.date_emission >= v_mois and f.date_emission < (v_mois + interval '1 month')::date),
      null, 'reel', null, v_e.id, null, null, null, null);
    perform public.enregistrer_mesure(p_client, 'filed.decaissement_30j', 1, 'jour', v_jour, private.filed_decaissement(p_client, v_jour, v_e.id, 30), null, 'reel', null, v_e.id, null, null, null, null);
    perform public.enregistrer_mesure(p_client, 'filed.decaissement_60j', 1, 'jour', v_jour, private.filed_decaissement(p_client, v_jour, v_e.id, 60), null, 'reel', null, v_e.id, null, null, null, null);
    perform public.enregistrer_mesure(p_client, 'filed.pieces_bloquees', 1, 'jour', v_jour,
      (select count(*) from public.filed_factures f where f.client_id = p_client and (v_e.id is null or f.entite_id = v_e.id) and f.statut = 'bloquee'),
      null, 'reel', null, v_e.id, null, null, null, null);
    perform public.enregistrer_mesure(p_client, 'filed.pieces_litige', 1, 'jour', v_jour,
      (select count(*) from public.filed_factures f where f.client_id = p_client and (v_e.id is null or f.entite_id = v_e.id)
         and exists (select 1 from public.filed_litiges l where l.facture_id = f.id and l.clos_le is null)),
      null, 'reel', null, v_e.id, null, null, null, null);
    perform public.enregistrer_mesure(p_client, 'filed.pieces_attente', 1, 'jour', v_jour,
      (select count(*) from public.filed_factures f where f.client_id = p_client and (v_e.id is null or f.entite_id = v_e.id) and f.statut = 'a_valider'),
      null, 'reel', null, v_e.id, null, null, null, null);
    perform public.enregistrer_mesure(p_client, 'filed.charges_manquantes', 1, 'jour', v_jour,
      (select count(*) from public.filed_charges_attendues a join public.filed_charges_recurrentes c on c.id = a.charge_id
        where a.client_id = p_client and (v_e.id is null or c.entite_id = v_e.id) and a.statut = 'manquante'),
      null, 'reel', null, v_e.id, null, null, null, null);
    -- Délai : une moyenne, base = nombre de factures validées le jour (rien n'est écrit sans base).
    select count(*), coalesce(sum(extract(epoch from (a.archive_le - d.recu_le)) / 86400), 0) into v_base, v_num
      from public.filed_archives a join public.filed_documents d on d.id = a.document_id
     where a.client_id = p_client and (v_e.id is null or a.entite_id = v_e.id) and a.archive_le::date = v_jour
       and a.version = (select min(a2.version) from public.filed_archives a2 where a2.facture_id = a.facture_id);
    if v_base > 0 then
      perform public.enregistrer_mesure(p_client, 'filed.delai_traitement', 1, 'jour', v_jour, round(v_num / v_base, 3), v_base, 'reel', round(v_num, 3), v_e.id, null, null, null, null);
    end if;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
comment on function private.filed_mesurer(uuid, date) is 'Enregistre les indicateurs filed.* d''un jour, consolidés et par société, dans les mesures du socle.';

-- ───────────────────────────────────────────────────────────────────────────
-- 8. L'export tableur (CSV, séparateur « ; », virgule décimale, UTF-8)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_csv_cellule(p anyelement) returns text
language sql immutable set search_path to '' as $$
  select case
    when p is null then ''
    when pg_typeof(p) in ('numeric'::regtype, 'double precision'::regtype, 'real'::regtype) then replace(p::text, '.', ',')
    when pg_typeof(p) = 'date'::regtype then to_char(p::text::date, 'DD/MM/YYYY')
    when pg_typeof(p) = 'boolean'::regtype then case when p::text = 'true' then 'oui' else 'non' end
    else '"' || replace(p::text, '"', '""') || '"'
  end
$$;

-- p_tableau : engage | echeancier | delais | en_cours | factures
create or replace function private.filed_exporter_tableau(p_client uuid, p_tableau text, p_debut date default null, p_fin date default null, p_entite uuid default null)
returns text language plpgsql security definer set search_path to '' as $$
declare v_lignes text[]; v_csv text; v_n integer; v_debut date; v_fin date; v_r record;
begin
  perform private.filed_exiger_lecteur(p_client, p_entite);
  v_debut := coalesce(p_debut, date_trunc('month', current_date::timestamp)::date);
  v_fin := coalesce(p_fin, current_date);
  case p_tableau
    when 'engage' then
      v_lignes := array['Société;Fournisseur;Centre de coût;Nombre de factures;Montant HT;Montant TTC'];
      for v_r in select * from private.filed_engage_mois(p_client, v_debut, p_entite) loop
        v_lignes := v_lignes || (private.filed_csv_cellule(v_r.entite) || ';' || private.filed_csv_cellule(v_r.fournisseur) || ';' || private.filed_csv_cellule(v_r.centre) || ';' || v_r.nb_factures || ';' || private.filed_csv_cellule(v_r.montant_ht) || ';' || private.filed_csv_cellule(v_r.montant_ttc));
      end loop;
    when 'echeancier' then
      v_lignes := array['Horizon;Échéance;Société;Fournisseur;Numéro;Montant TTC;Réglé;Reste à payer;En retard'];
      for v_r in select * from private.filed_echeancier(p_client, v_fin, p_entite) loop
        v_lignes := v_lignes || (private.filed_csv_cellule(v_r.horizon) || ';' || private.filed_csv_cellule(v_r.echeance) || ';' || private.filed_csv_cellule(v_r.entite) || ';' || private.filed_csv_cellule(v_r.fournisseur) || ';' || private.filed_csv_cellule(v_r.numero) || ';' || private.filed_csv_cellule(v_r.montant_ttc) || ';' || private.filed_csv_cellule(v_r.regle) || ';' || private.filed_csv_cellule(v_r.reste_a_payer) || ';' || private.filed_csv_cellule(v_r.en_retard));
      end loop;
    when 'delais' then
      v_lignes := array['Du;Au;Factures classées;Délai moyen (jours);Délai médian (jours);Délai maximal (jours)'];
      for v_r in select * from private.filed_delai_traitement(p_client, v_debut, v_fin, p_entite) loop
        v_lignes := v_lignes || (private.filed_csv_cellule(v_debut) || ';' || private.filed_csv_cellule(v_fin) || ';' || v_r.nb_factures || ';' || private.filed_csv_cellule(v_r.delai_moyen_jours) || ';' || private.filed_csv_cellule(v_r.delai_median_jours) || ';' || private.filed_csv_cellule(v_r.delai_max_jours));
      end loop;
    when 'en_cours' then
      v_lignes := array['Catégorie;Libellé;Nombre;Montant TTC'];
      for v_r in select * from private.filed_pieces_en_cours(p_client, p_entite) loop
        v_lignes := v_lignes || (private.filed_csv_cellule(v_r.categorie) || ';' || private.filed_csv_cellule(v_r.libelle) || ';' || v_r.nombre || ';' || private.filed_csv_cellule(v_r.montant_ttc));
      end loop;
    when 'factures' then
      v_lignes := array['Référence;Société;Fournisseur;Nature;Numéro;Émission;Réception;Échéance;Devise;HT;TVA;TTC;Statut;Anomalies;Compte;Centre;Exercice'];
      for v_r in
        select d.reference, e.nom as entite, fo.nom as fournisseur, f.nature, f.numero, f.date_emission, f.date_reception, f.echeance_lue, f.devise, f.montant_ht, f.montant_tva, f.montant_ttc, f.statut,
               array_to_string(f.anomalies, ' ') as anomalies,
               (select string_agg(c.numero, ' ') from public.filed_imputations i join public.filed_plan_comptable c on c.id = i.compte_id where i.facture_id = f.id and i.statut = 'validee') as comptes,
               (select string_agg(k.code, ' ') from public.filed_imputations i join public.filed_centres_cout k on k.id = i.centre_id where i.facture_id = f.id and i.statut = 'validee') as centres,
               (select x.libelle from public.filed_factures_exercices fe join public.filed_exercices x on x.id = fe.exercice_id where fe.facture_id = f.id) as exercice
          from private.filed_factures_visibles(p_client, p_entite) f
          join public.filed_documents d on d.id = f.document_id
          left join public.entites e on e.id = f.entite_id
          left join public.filed_fournisseurs fo on fo.id = f.fournisseur_id
         where f.date_reception between v_debut and v_fin
         order by d.reference
      loop
        v_lignes := v_lignes || (private.filed_csv_cellule(v_r.reference) || ';' || private.filed_csv_cellule(v_r.entite) || ';' || private.filed_csv_cellule(v_r.fournisseur) || ';' || private.filed_csv_cellule(v_r.nature) || ';' || private.filed_csv_cellule(v_r.numero) || ';' || private.filed_csv_cellule(v_r.date_emission) || ';' || private.filed_csv_cellule(v_r.date_reception) || ';' || private.filed_csv_cellule(v_r.echeance_lue) || ';' || private.filed_csv_cellule(v_r.devise) || ';' || private.filed_csv_cellule(v_r.montant_ht) || ';' || private.filed_csv_cellule(v_r.montant_tva) || ';' || private.filed_csv_cellule(v_r.montant_ttc) || ';' || private.filed_csv_cellule(v_r.statut) || ';' || private.filed_csv_cellule(v_r.anomalies) || ';' || private.filed_csv_cellule(v_r.comptes) || ';' || private.filed_csv_cellule(v_r.centres) || ';' || private.filed_csv_cellule(v_r.exercice));
      end loop;
    else
      raise exception 'Tableau inconnu : % (engage, echeancier, delais, en_cours, factures).', coalesce(p_tableau, 'vide') using errcode = '22023';
  end case;
  v_csv := array_to_string(v_lignes, E'\r\n') || E'\r\n';
  v_n := cardinality(v_lignes) - 1;
  perform private.filed_journaliser(p_client, 'filed.export', 'filed_export', p_tableau,
    jsonb_build_object('tableau', p_tableau, 'du', v_debut, 'au', v_fin, 'entite', p_entite, 'lignes', v_n,
                       'sha256', encode(extensions.digest(convert_to(v_csv, 'UTF8'), 'sha256'), 'hex')), p_entite);
  return v_csv;
end $$;

create or replace function public.filed_exporter_tableau(p_client uuid, p_tableau text, p_debut date default null, p_fin date default null, p_entite uuid default null)
returns text language sql set search_path to '' as $$ select private.filed_exporter_tableau(p_client, p_tableau, p_debut, p_fin, p_entite) $$;
comment on function public.filed_exporter_tableau(uuid, text, date, date, uuid) is
  'Exporte un tableau de pilotage en CSV (séparateur « ; », virgule décimale) : engage, echeancier, delais, en_cours, factures. Chaque export s''inscrit au journal avec son empreinte.';
revoke all on function public.filed_exporter_tableau(uuid, text, date, date, uuid) from public, anon;
grant execute on function public.filed_exporter_tableau(uuid, text, date, date, uuid) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 9. L'export à date fixe
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.filed_exports_programmes (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  entite_id     uuid references public.entites(id) on delete cascade,
  tableau       text not null check (tableau in ('engage', 'echeancier', 'delais', 'en_cours', 'factures')),
  -- hebdomadaire : jour = 1 (lundi) à 7 ; mensuelle : jour = 1 à 28.
  cadence       text not null check (cadence in ('hebdomadaire', 'mensuelle')),
  jour          smallint not null check (jour between 1 and 28),
  destinataire  uuid,
  actif         boolean not null default true,
  prochain_le   date not null,
  dernier_le    date,
  cree_par      uuid,
  cree_le       timestamptz not null default now(),
  maj_le        timestamptz not null default now()
);
comment on table public.filed_exports_programmes is
  'Les exports à date fixe d''une organisation : quel tableau, à quelle cadence, pour qui. Le balayage de FILED les produit le jour venu dans filed_exports.';
create index if not exists filed_exports_programmes_a_faire on public.filed_exports_programmes (prochain_le) where actif;
alter table public.filed_exports_programmes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_exports_programmes' and policyname = 'filed_exports_programmes_lecture') then
    execute 'create policy filed_exports_programmes_lecture on public.filed_exports_programmes for select to authenticated using (client_id in (select private.mes_clients()))';
  end if;
end $$;
revoke insert, update, delete on public.filed_exports_programmes from anon, authenticated;
grant select on public.filed_exports_programmes to authenticated;

create table if not exists public.filed_exports (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  entite_id     uuid references public.entites(id) on delete cascade,
  programme_id  uuid references public.filed_exports_programmes(id) on delete set null,
  tableau       text not null,
  du            date,
  au            date,
  nb_lignes     integer not null,
  sha256        text not null,
  -- Le CSV lui-même ; vidé à 90 jours (purge_le), l'empreinte et la période restent.
  contenu       text,
  purge_le      timestamptz,
  genere_le     timestamptz not null default now()
);
comment on table public.filed_exports is
  'Les exports produits à date fixe : le CSV, son empreinte, sa période. Le contenu est vidé à 90 jours par le balayage ; la ligne et son empreinte restent.';
create index if not exists filed_exports_client on public.filed_exports (client_id, genere_le desc);
alter table public.filed_exports enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_exports' and policyname = 'filed_exports_lecture') then
    execute 'create policy filed_exports_lecture on public.filed_exports for select to authenticated using (client_id in (select private.mes_clients()) and (entite_id is null or private.perimetre_couvre((select auth.uid()), client_id, entite_id)))';
  end if;
end $$;
revoke insert, update, delete on public.filed_exports from anon, authenticated;
grant select on public.filed_exports to authenticated;

insert into private.tables_locataires (nom, ordre_effacement, note) values ('filed_exports', 1, 'FILED, lot 6'), ('filed_exports_programmes', 2, 'FILED, lot 6')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;

create or replace function private.filed_prochain_export(p_cadence text, p_jour integer, p_apres date)
returns date language sql immutable set search_path to '' as $$
  select case p_cadence
    when 'hebdomadaire' then (p_apres + ((p_jour - extract(isodow from p_apres)::int + 7) % 7 + case when (p_jour - extract(isodow from p_apres)::int + 7) % 7 = 0 then 7 else 0 end))::date
    else case when extract(day from p_apres)::int < p_jour then (date_trunc('month', p_apres::timestamp) + (p_jour - 1) * interval '1 day')::date
              else (date_trunc('month', p_apres::timestamp) + interval '1 month' + (p_jour - 1) * interval '1 day')::date end
  end
$$;

create or replace function private.filed_programmer_export(p_client uuid, p_tableau text, p_cadence text, p_jour integer, p_entite uuid default null, p_destinataire uuid default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_uid uuid; v_id uuid;
begin
  v_uid := private.filed_exiger_acteur(p_client, array['gerant', 'admin'], p_entite);
  if p_tableau not in ('engage', 'echeancier', 'delais', 'en_cours', 'factures') then raise exception 'Tableau inconnu : %.', coalesce(p_tableau, 'vide') using errcode = '22023'; end if;
  if p_cadence not in ('hebdomadaire', 'mensuelle') then raise exception 'Cadence inconnue : %.', coalesce(p_cadence, 'vide') using errcode = '22023'; end if;
  if p_cadence = 'hebdomadaire' and p_jour not between 1 and 7 then raise exception 'Le jour d''un export hebdomadaire va de 1 (lundi) à 7.' using errcode = '22023'; end if;
  if p_cadence = 'mensuelle' and p_jour not between 1 and 28 then raise exception 'Le jour d''un export mensuel va de 1 à 28.' using errcode = '22023'; end if;
  insert into public.filed_exports_programmes (client_id, entite_id, tableau, cadence, jour, destinataire, prochain_le, cree_par)
  values (p_client, p_entite, p_tableau, p_cadence, p_jour, coalesce(p_destinataire, v_uid), private.filed_prochain_export(p_cadence, p_jour, current_date), v_uid)
  returning id into v_id;
  perform private.filed_journaliser(p_client, 'filed.export.programme', 'filed_export_programme', v_id::text,
    jsonb_build_object('tableau', p_tableau, 'cadence', p_cadence, 'jour', p_jour), p_entite);
  return v_id;
end $$;

create or replace function public.filed_programmer_export(p_client uuid, p_tableau text, p_cadence text, p_jour integer, p_entite uuid default null, p_destinataire uuid default null)
returns uuid language sql set search_path to '' as $$ select private.filed_programmer_export(p_client, p_tableau, p_cadence, p_jour, p_entite, p_destinataire) $$;
comment on function public.filed_programmer_export(uuid, text, text, integer, uuid, uuid) is 'Programme un export à date fixe : tableau, cadence (hebdomadaire, mensuelle), jour, destinataire.';
revoke all on function public.filed_programmer_export(uuid, text, text, integer, uuid, uuid) from public, anon;
grant execute on function public.filed_programmer_export(uuid, text, text, integer, uuid, uuid) to authenticated, service_role;

create or replace function private.filed_arreter_export(p_programme uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare v_p public.filed_exports_programmes;
begin
  select * into v_p from public.filed_exports_programmes where id = p_programme for update;
  if not found then raise exception 'Export programmé introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(v_p.client_id, array['gerant', 'admin'], v_p.entite_id);
  update public.filed_exports_programmes set actif = false, maj_le = now() where id = p_programme;
  perform private.filed_journaliser(v_p.client_id, 'filed.export.arret', 'filed_export_programme', v_p.id::text, '{}'::jsonb, v_p.entite_id);
end $$;

create or replace function public.filed_arreter_export(p_programme uuid)
returns void language sql set search_path to '' as $$ select private.filed_arreter_export(p_programme) $$;
comment on function public.filed_arreter_export(uuid) is 'Arrête un export programmé.';
revoke all on function public.filed_arreter_export(uuid) from public, anon;
grant execute on function public.filed_arreter_export(uuid) to authenticated, service_role;

-- Produit les exports du jour (appelé par le balayage de FILED), et purge ceux de plus de 90 jours.
create or replace function private.filed_produire_exports(p_aujourdhui date default current_date)
returns integer language plpgsql security definer set search_path to '' as $$
declare v_p public.filed_exports_programmes; v_csv text; v_du date; v_au date; v_id uuid; v_n integer := 0;
begin
  for v_p in select * from public.filed_exports_programmes where actif and prochain_le <= p_aujourdhui order by prochain_le loop
    begin
      if v_p.cadence = 'hebdomadaire' then v_du := p_aujourdhui - 7; else v_du := (date_trunc('month', p_aujourdhui::timestamp) - interval '1 month')::date; end if;
      v_au := p_aujourdhui - 1;
      if v_p.tableau = 'engage' then v_du := (date_trunc('month', p_aujourdhui::timestamp) - interval '1 month')::date; end if;
      v_csv := private.filed_exporter_tableau(v_p.client_id, v_p.tableau, v_du, v_au, v_p.entite_id);
      insert into public.filed_exports (client_id, entite_id, programme_id, tableau, du, au, nb_lignes, sha256, contenu)
      values (v_p.client_id, v_p.entite_id, v_p.id, v_p.tableau, v_du, v_au, greatest(0, array_length(string_to_array(v_csv, E'\r\n'), 1) - 2),
              encode(extensions.digest(convert_to(v_csv, 'UTF8'), 'sha256'), 'hex'), v_csv)
      returning id into v_id;
      update public.filed_exports_programmes set dernier_le = p_aujourdhui, prochain_le = private.filed_prochain_export(cadence, jour, p_aujourdhui), maj_le = now() where id = v_p.id;
      perform private.lever_alerte_module(v_p.client_id, 'filed', 'info',
        left(format('Export prêt : %s (%s au %s)', v_p.tableau, to_char(v_du, 'DD/MM/YYYY'), to_char(v_au, 'DD/MM/YYYY')), 200),
        jsonb_build_object('export', v_id, 'programme', v_p.id, 'tableau', v_p.tableau),
        'export:' || v_id::text, true, v_p.destinataire);
      v_n := v_n + 1;
    exception when others then
      raise warning 'FILED : export programmé % non produit (%)', v_p.id, sqlerrm;
      update public.filed_exports_programmes set prochain_le = p_aujourdhui + 1, maj_le = now() where id = v_p.id;
    end;
  end loop;
  update public.filed_exports set contenu = null, purge_le = now() where contenu is not null and genere_le < now() - interval '90 days';
  return v_n;
end $$;
