-- FILED, lot 42 (a4_50) — le compteur de pièces par mois et les quotas par palier (Teo, 18/10 ; chiffrage n° 21, 22).
--
-- « 20 / 100 / 500 factures par mois » ; « vous payez les pièces, pas les utilisateurs » ; « vous changez de palier d'un
-- mois sur l'autre ». Réglages techniques seulement (décision du 17/10) : AUCUN prix ici.
--   · public.filed_paliers : Découverte, Standard, Entreprise (lib/produits/factures.ts) — pièces par mois, boîtes,
--     seuil d'alerte (80 %), conduite au dépassement. Réglés par l'opérateur (service_role) ;
--   · public.filed_abonnements : le palier de l'organisation, et le palier suivant qui prend effet le 1er du mois
--     suivant (un premier palier prend effet tout de suite). Une organisation SANS abonnement n'a pas de quota : rien ne
--     change pour les clients actuels ;
--   · public.filed_compteurs_pieces (et non filed_compteurs, la numérotation du socle) : chaque mois (heure de Paris), les pièces reçues (hors doublons de fichier déjà reçus),
--     tenues par un déclencheur sur filed_documents ; à 80 % puis au dépassement, une alerte au gérant, une seule fois ;
--   · au dépassement : « prevenir » (par défaut) ou « facturer » (les pièces hors quota sont comptées pour la facture).
--     Le blocage n'est PAS proposé : refuser une pièce reçue ferait perdre une facture ; c'est une décision de Teo.
-- Portes : filed_compteur, filed_compteurs_mois (gérant, admin, valideur) ; filed_changer_palier (gérant, admin, ou
-- l'opérateur) ; filed_regler_palier (opérateur seulement). Migration idempotente ; aucun DROP, aucune suppression ;
-- aucun envoi (les alertes restent dans Omega).

create table if not exists public.filed_paliers (
  code          text primary key check (code ~ '^[A-Z][A-Z0-9_]{1,31}$'),
  libelle       text not null,
  pieces_mois   integer check (pieces_mois is null or pieces_mois > 0),      -- nul : illimité
  boites        integer check (boites is null or boites > 0),                -- nul : illimitées (lot 43)
  historique_mois integer check (historique_mois is null or historique_mois > 0), -- nul : complet (lot 47)
  alerte_pct    integer not null default 80 check (alerte_pct between 1 and 100),
  depassement   text not null default 'prevenir' check (depassement in ('prevenir', 'facturer')),
  rang          integer not null default 100,
  actif         boolean not null default true,
  maj_le        timestamptz not null default now()
);
comment on table public.filed_paliers is
  'Lot 42 (a4_50) : les paliers FILED (réglages techniques, sans prix) : pièces par mois, boîtes, historique, alerte, dépassement. Opérateur.';
insert into public.filed_paliers (code, libelle, pieces_mois, boites, historique_mois, rang) values
  ('DECOUVERTE', 'Découverte', 20, 1, null, 10),
  ('STANDARD',   'Standard',   100, 2, null, 20),
  ('ENTREPRISE', 'Entreprise', 500, null, null, 30)
on conflict (code) do nothing;

create table if not exists public.filed_abonnements (
  client_id       uuid primary key references public.clients(id) on delete cascade,
  palier          text not null references public.filed_paliers(code),
  depuis          date not null default current_date,
  palier_suivant  text references public.filed_paliers(code),
  suivant_le      date,
  maj_par         uuid,
  cree_le         timestamptz not null default now(),
  maj_le          timestamptz not null default now()
);
comment on table public.filed_abonnements is
  'Lot 42 (a4_50) : le palier FILED de l''organisation ; un changement prend effet le 1er du mois suivant.';

create table if not exists public.filed_compteurs_pieces (
  client_id   uuid not null references public.clients(id) on delete cascade,
  mois        date not null check (mois = date_trunc('month', mois)::date),
  pieces      integer not null default 0,
  doublons    integer not null default 0,
  palier      text,
  quota       integer,
  alerte_le   timestamptz,
  depasse_le  timestamptz,
  maj_le      timestamptz not null default now(),
  primary key (client_id, mois)
);
comment on table public.filed_compteurs_pieces is
  'Lot 42 (a4_50) : les pièces reçues par organisation et par mois (heure de Paris), hors doublons de fichier ; le quota du mois.';

do $$
declare t text;
begin
  foreach t in array array['filed_paliers', 'filed_abonnements', 'filed_compteurs_pieces'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
  grant select on public.filed_paliers to authenticated;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_paliers' and policyname = 'filed_paliers_lecture') then
    create policy filed_paliers_lecture on public.filed_paliers for select to authenticated using (true);
  end if;
  foreach t in array array['filed_abonnements', 'filed_compteurs_pieces'] loop
    execute format('grant select on public.%I to authenticated', t);
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || '_lecture') then
      execute format('create policy %I on public.%I for select to authenticated using (client_id in (select private.mes_clients()))', t || '_lecture', t);
    end if;
  end loop;
end $$;
create or replace trigger filed_paliers_maj_le before update on public.filed_paliers for each row execute function private.filed_lot4_maj_le();
create or replace trigger filed_abonnements_maj_le before update on public.filed_abonnements for each row execute function private.filed_lot4_maj_le();

insert into private.tables_locataires (nom, ordre_effacement, note)
select x.nom, x.ordre, 'FILED, lot 42' from (values ('filed_compteurs_pieces', 34), ('filed_abonnements', 35)) x(nom, ordre)
where not exists (select 1 from private.tables_locataires t where t.nom = x.nom);

-- Le palier en vigueur pour un mois donné (nul : pas d'abonnement, pas de quota).
create or replace function private.filed_palier_du(p_client uuid, p_mois date default current_date)
returns public.filed_paliers language sql stable security definer set search_path to '' as $$
  select p.* from public.filed_abonnements a
    join public.filed_paliers p on p.code = case when a.palier_suivant is not null and a.suivant_le <= date_trunc('month', p_mois)::date
                                                 then a.palier_suivant else a.palier end
   where a.client_id = p_client and a.depuis <= (date_trunc('month', p_mois) + interval '1 month - 1 day')::date
$$;
revoke all on function private.filed_palier_du(uuid, date) from public, anon, authenticated;
grant execute on function private.filed_palier_du(uuid, date) to service_role;

-- Le déclencheur : chaque document reçu compte dans le mois de sa réception ; les alertes, une fois par mois.
create or replace function private.filed_compter_piece()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_mois date := date_trunc('month', (new.recu_le at time zone 'Europe/Paris'))::date; v_p public.filed_paliers; c public.filed_compteurs_pieces;
begin
  v_p := private.filed_palier_du(new.client_id, v_mois);
  insert into public.filed_compteurs_pieces as k (client_id, mois, pieces, doublons, palier, quota)
  values (new.client_id, v_mois, case when new.doublon_de is null then 1 else 0 end, case when new.doublon_de is null then 0 else 1 end,
          v_p.code, v_p.pieces_mois)
  on conflict (client_id, mois) do update
    set pieces = k.pieces + case when new.doublon_de is null then 1 else 0 end,
        doublons = k.doublons + case when new.doublon_de is null then 0 else 1 end,
        palier = coalesce(v_p.code, k.palier), quota = v_p.pieces_mois, maj_le = now()
  returning * into c;
  if c.quota is not null then
    if c.alerte_le is null and c.pieces >= ceil(c.quota * v_p.alerte_pct / 100.0) and c.pieces <= c.quota then
      update public.filed_compteurs_pieces set alerte_le = now() where client_id = c.client_id and mois = c.mois;
      perform private.lever_alerte_module(c.client_id, 'filed', 'attention',
        left(format('FILED : %s pièces reçues ce mois sur %s prévues au palier %s.', c.pieces, c.quota, v_p.libelle), 200),
        jsonb_build_object('mois', c.mois, 'pieces', c.pieces, 'quota', c.quota, 'palier', c.palier),
        'filed:quota:alerte:' || to_char(c.mois, 'YYYY-MM'), true, null);
    end if;
    if c.depasse_le is null and c.pieces > c.quota then
      update public.filed_compteurs_pieces set depasse_le = now() where client_id = c.client_id and mois = c.mois;
      perform private.lever_alerte_module(c.client_id, 'filed', 'attention',
        left(format('FILED : le quota du palier %s (%s pièces) est dépassé ce mois ; les pièces continuent d''être lues%s.', v_p.libelle, c.quota,
                    case when v_p.depassement = 'facturer' then ', le dépassement est compté' else '' end), 200),
        jsonb_build_object('mois', c.mois, 'pieces', c.pieces, 'quota', c.quota, 'palier', c.palier, 'depassement', v_p.depassement),
        'filed:quota:depasse:' || to_char(c.mois, 'YYYY-MM'), true, null);
    end if;
  end if;
  return null;
exception when others then
  -- Le compteur ne doit jamais empêcher une pièce d'arriver.
  raise warning 'FILED : compteur non tenu pour le document % (%)', new.id, sqlerrm;
  return null;
end $$;
revoke all on function private.filed_compter_piece() from public, anon, authenticated;
grant execute on function private.filed_compter_piece() to service_role;

do $$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.filed_documents'::regclass and tgname = 'filed_documents_compter') then
    create trigger filed_documents_compter after insert on public.filed_documents for each row execute function private.filed_compter_piece();
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- Les portes
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_compteur(p_client uuid, p_mois date default null)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare v_mois date := date_trunc('month', coalesce(p_mois, (now() at time zone 'Europe/Paris')::date))::date; c public.filed_compteurs_pieces;
        v_p public.filed_paliers; v_a public.filed_abonnements;
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur']);
  select * into c from public.filed_compteurs_pieces k where k.client_id = p_client and k.mois = v_mois;
  v_p := private.filed_palier_du(p_client, v_mois);
  select * into v_a from public.filed_abonnements a where a.client_id = p_client;
  return jsonb_build_object('mois', v_mois, 'pieces', coalesce(c.pieces, 0), 'doublons', coalesce(c.doublons, 0),
    'palier', v_p.code, 'libelle', v_p.libelle, 'quota', v_p.pieces_mois,
    'pourcentage', case when v_p.pieces_mois is not null then round(100.0 * coalesce(c.pieces, 0) / v_p.pieces_mois, 1) end,
    'hors_quota', case when v_p.pieces_mois is not null then greatest(coalesce(c.pieces, 0) - v_p.pieces_mois, 0) else 0 end,
    'depassement', v_p.depassement,
    'etat', case when v_p.pieces_mois is null then 'sans_quota'
                 when coalesce(c.pieces, 0) > v_p.pieces_mois then 'depasse'
                 when coalesce(c.pieces, 0) >= ceil(v_p.pieces_mois * v_p.alerte_pct / 100.0) then 'alerte'
                 else 'ok' end,
    'palier_suivant', v_a.palier_suivant, 'suivant_le', v_a.suivant_le);
end $$;
revoke all on function private.filed_compteur(uuid, date) from public, anon;
grant execute on function private.filed_compteur(uuid, date) to authenticated, service_role;
create or replace function public.filed_compteur(p_client uuid, p_mois date default null)
returns jsonb language sql stable set search_path to '' as $$ select private.filed_compteur(p_client, p_mois) $$;
comment on function public.filed_compteur(uuid, date) is
  'Lot 42 (a4_50) : les pièces du mois, le quota du palier, l''état (ok, alerte, dépassé, sans quota). Gérant, admin, valideur.';
revoke all on function public.filed_compteur(uuid, date) from public, anon;
grant execute on function public.filed_compteur(uuid, date) to authenticated, service_role;

create or replace function private.filed_compteurs_mois(p_client uuid, p_mois integer default 12)
returns table (mois date, pieces integer, doublons integer, palier text, quota integer, hors_quota integer)
language plpgsql stable security definer set search_path to '' as $$
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur']);
  return query select k.mois, k.pieces, k.doublons, k.palier, k.quota, case when k.quota is null then 0 else greatest(k.pieces - k.quota, 0) end
    from public.filed_compteurs_pieces k where k.client_id = p_client
     and k.mois > (date_trunc('month', now() at time zone 'Europe/Paris') - make_interval(months => greatest(coalesce(p_mois, 12), 1)))::date
   order by k.mois desc;
end $$;
revoke all on function private.filed_compteurs_mois(uuid, integer) from public, anon;
grant execute on function private.filed_compteurs_mois(uuid, integer) to authenticated, service_role;
create or replace function public.filed_compteurs_mois(p_client uuid, p_mois integer default 12)
returns table (mois date, pieces integer, doublons integer, palier text, quota integer, hors_quota integer)
language sql stable set search_path to '' as $$ select * from private.filed_compteurs_mois(p_client, p_mois) $$;
comment on function public.filed_compteurs_mois(uuid, integer) is 'Lot 42 (a4_50) : les compteurs des derniers mois (pièces, doublons, quota, hors quota). Gérant, admin, valideur.';
revoke all on function public.filed_compteurs_mois(uuid, integer) from public, anon;
grant execute on function public.filed_compteurs_mois(uuid, integer) to authenticated, service_role;

-- Changer de palier : au 1er du mois suivant ; le premier palier prend effet tout de suite.
create or replace function private.filed_changer_palier(p_client uuid, p_palier text)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare v_par uuid; v_code text := upper(btrim(coalesce(p_palier, ''))); v_a public.filed_abonnements;
        v_debut date := date_trunc('month', (now() at time zone 'Europe/Paris'))::date;
begin
  v_par := private.filed_exiger_acteur(p_client, array['gerant', 'admin']);
  if not exists (select 1 from public.filed_paliers p where p.code = v_code and p.actif) then
    raise exception 'Palier inconnu : %.', v_code using errcode = '22023';
  end if;
  select * into v_a from public.filed_abonnements a where a.client_id = p_client for update;
  if not found then
    insert into public.filed_abonnements (client_id, palier, depuis, maj_par) values (p_client, v_code, v_debut, v_par) returning * into v_a;
    update public.filed_compteurs_pieces k set palier = v_code, quota = (select p.pieces_mois from public.filed_paliers p where p.code = v_code)
     where k.client_id = p_client and k.mois = v_debut;
  else
    -- Un palier suivant déjà échu devient le palier courant.
    if v_a.palier_suivant is not null and v_a.suivant_le <= v_debut then
      v_a.palier := v_a.palier_suivant;
    end if;
    update public.filed_abonnements
       set palier = v_a.palier,
           palier_suivant = case when v_code = v_a.palier then null else v_code end,
           suivant_le = case when v_code = v_a.palier then null else (v_debut + interval '1 month')::date end,
           maj_par = v_par
     where client_id = p_client returning * into v_a;
  end if;
  perform private.filed_journaliser(p_client, 'filed.palier.changement', 'filed_abonnement', p_client::text,
    jsonb_build_object('palier', v_a.palier, 'suivant', v_a.palier_suivant, 'le', v_a.suivant_le));
  return jsonb_build_object('palier', v_a.palier, 'palier_suivant', v_a.palier_suivant, 'suivant_le', v_a.suivant_le);
end $$;
revoke all on function private.filed_changer_palier(uuid, text) from public, anon;
grant execute on function private.filed_changer_palier(uuid, text) to authenticated, service_role;
create or replace function public.filed_changer_palier(p_client uuid, p_palier text)
returns jsonb language sql set search_path to '' as $$ select private.filed_changer_palier(p_client, p_palier) $$;
comment on function public.filed_changer_palier(uuid, text) is
  'Lot 42 (a4_50) : choisit le palier FILED ; un changement prend effet le 1er du mois suivant, un premier palier tout de suite. Gérant, admin ou opérateur.';
revoke all on function public.filed_changer_palier(uuid, text) from public, anon;
grant execute on function public.filed_changer_palier(uuid, text) to authenticated, service_role;

-- Les seuils d'un palier : l'opérateur seulement.
create or replace function public.filed_regler_palier(p_code text, p_pieces_mois integer, p_boites integer, p_historique_mois integer,
                                                      p_alerte_pct integer default 80, p_depassement text default 'prevenir')
returns void language plpgsql security definer set search_path to '' as $$
begin
  update public.filed_paliers set pieces_mois = p_pieces_mois, boites = p_boites, historique_mois = p_historique_mois,
         alerte_pct = coalesce(p_alerte_pct, 80), depassement = coalesce(p_depassement, 'prevenir')
   where code = upper(btrim(p_code));
  if not found then raise exception 'Palier inconnu : %.', p_code using errcode = '22023'; end if;
end $$;
comment on function public.filed_regler_palier(text, integer, integer, integer, integer, text) is
  'Lot 42 (a4_50) : règle les seuils d''un palier (pièces par mois, boîtes, historique, alerte, dépassement). Opérateur (service_role).';
revoke all on function public.filed_regler_palier(text, integer, integer, integer, integer, text) from public, anon, authenticated;
grant execute on function public.filed_regler_palier(text, integer, integer, integer, integer, text) to service_role;
