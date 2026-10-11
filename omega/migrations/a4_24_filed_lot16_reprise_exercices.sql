-- FILED, lot 16 (a4_24) — un historique de plusieurs exercices se reprend en une fois à l'installation.
--
-- Audit des promesses (§ 2 FILED, n° 5 ; factures.ts ligne 35). À l'installation, l'organisation confie les fichiers des
-- écritures comptables (FEC, A. 47 A-1 du LPF) de ses exercices passés, tels que son ancien logiciel les produit. Un seul
-- appel les reprend tous :
--
--   public.filed_reprendre_historique(p_client, p_entite, p_fichiers jsonb) → jsonb (tableau, un rendu par fichier)
--     p_fichiers = [{nom_fichier, contenu, debut?}] ; contenu = le texte du fichier (décodé en UTF-8 par l'écran ;
--     tabulation ou « | », virgule décimale, dates AAAAMMJJ ; Debit/Credit ou Montant/Sens). Gérant ou admin.
--
-- Pour chaque fichier, du plus ancien au plus récent :
--   · contrôles : nom SirenFECAAAAMMJJ (le SIREN est celui de la société quand elle en a un), en-tête reconnu, nombre de
--     colonnes constant, dates et montants lisibles, aucune écriture déséquilibrée, aucune date après la clôture. Un
--     fichier refusé l'est seul : le rendu dit pourquoi, les autres sont repris ;
--   · l'exercice : créé clos (du lendemain de l'exercice précédent, ou du premier jour du mois de la première écriture,
--     jusqu'à la date de clôture du nom du fichier), ou repris s'il existe déjà avec la même fin ;
--   · les lignes, gardées telles quelles (filed_reprise_ecritures), consultables, jamais réécrites ;
--   · le plan comptable : les comptes de charge (6) et d'immobilisation (2) absents sont posés, source « import » ;
--   · les fournisseurs de l'ancien logiciel (comptes auxiliaires des comptes 40) et leurs comptes de charge habituels
--     (filed_reprise_tiers). Un tiers se lie à un fournisseur FILED par son code ou son nom — maintenant, ou plus tard
--     quand le fournisseur est créé — et ses habitudes nourrissent filed_imputations_apprises : la première facture
--     d'un fournisseur repris se voit proposer le compte de toujours ;
--   · rejouable : un fichier déjà repris (même empreinte) est rendu avec deja = true.
--
-- Et au contrôle de chaque facture (private.filed_controles_comptables, réécrite) : une facture déjà comptabilisée dans
-- l'ancien logiciel (même fournisseur, même numéro de pièce) est bloquée, « doublon.historique », avec l'écriture d'origine.
-- Migration idempotente ; aucune suppression.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Tables
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.filed_reprises (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  entite_id     uuid not null references public.entites(id) on delete cascade,
  nom_fichier   text not null check (char_length(nom_fichier) between 1 and 200),
  empreinte     text not null check (empreinte ~ '^[0-9a-f]{64}$'),
  siren         text,
  debut         date not null,
  fin           date not null,
  exercice_id   uuid references public.filed_exercices(id) on delete set null,
  lignes        integer not null default 0,
  ecritures     integer not null default 0,
  total_debit   numeric(16,2) not null default 0,
  total_credit  numeric(16,2) not null default 0,
  comptes_poses integer not null default 0,
  tiers         integer not null default 0,
  depose_par    uuid,
  cree_le       timestamptz not null default now(),
  constraint filed_reprises_bornes check (fin >= debut)
);
comment on table public.filed_reprises is
  'Les fichiers des écritures comptables des exercices passés, repris à l''installation (a4_24) : un par exercice, avec son empreinte.';
create unique index if not exists filed_reprises_un on public.filed_reprises (client_id, entite_id, empreinte);
alter table public.filed_reprises enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_reprises' and policyname = 'filed_reprises_lecture') then
    execute 'create policy filed_reprises_lecture on public.filed_reprises for select to authenticated using (client_id in (select private.mes_clients()))';
  end if;
end $$;
revoke all on table public.filed_reprises from anon, authenticated;
grant select on public.filed_reprises to authenticated;

create table if not exists public.filed_reprise_ecritures (
  id                  bigint generated always as identity primary key,
  reprise_id          uuid not null references public.filed_reprises(id) on delete cascade,
  client_id           uuid not null references public.clients(id) on delete cascade,
  entite_id           uuid not null references public.entites(id) on delete cascade,
  ligne               integer not null,
  journal_code        text not null,
  journal_lib         text,
  ecriture_num        text not null,
  ecriture_date       date not null,
  compte_num          text not null,
  compte_lib          text,
  comp_aux_num        text,
  comp_aux_lib        text,
  piece_ref           text,
  piece_ref_normalise text,
  piece_date          date,
  ecriture_lib        text,
  debit               numeric(16,2) not null default 0,
  credit              numeric(16,2) not null default 0,
  ecriture_let        text,
  date_let            date,
  valid_date          date,
  montant_devise      numeric(16,2),
  idevise             text
);
comment on table public.filed_reprise_ecritures is
  'Les lignes des FEC repris, telles que l''ancien logiciel les a écrites. Jamais réécrites ; servent à la consultation, à l''apprentissage des imputations et à la détection des factures déjà comptabilisées.';
create index if not exists filed_reprise_ecritures_reprise on public.filed_reprise_ecritures (reprise_id, journal_code, ecriture_num);
create index if not exists filed_reprise_ecritures_piece on public.filed_reprise_ecritures (client_id, comp_aux_num, piece_ref_normalise);
alter table public.filed_reprise_ecritures enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_reprise_ecritures' and policyname = 'filed_reprise_ecritures_lecture') then
    execute 'create policy filed_reprise_ecritures_lecture on public.filed_reprise_ecritures for select to authenticated using (client_id in (select private.mes_clients()))';
  end if;
end $$;
revoke all on table public.filed_reprise_ecritures from anon, authenticated;
grant select on public.filed_reprise_ecritures to authenticated;

create table if not exists public.filed_reprise_tiers (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients(id) on delete cascade,
  entite_id      uuid not null references public.entites(id) on delete cascade,
  comp_aux_num   text not null,
  comp_aux_lib   text,
  cle_nom        text,
  fournisseur_id uuid references public.filed_fournisseurs(id) on delete set null,
  lie_le         timestamptz,
  -- {"606100": 12, "613200": 3} : combien de pièces de ce tiers ont été imputées à chaque compte.
  comptes        jsonb not null default '{}'::jsonb,
  pieces         integer not null default 0,
  total          numeric(16,2) not null default 0,
  premiere       date,
  derniere       date,
  maj_le         timestamptz not null default now()
);
comment on table public.filed_reprise_tiers is
  'Les fournisseurs de l''ancien logiciel (comptes auxiliaires des comptes 40 des FEC repris), leurs comptes de charge habituels et le fournisseur FILED auquel ils sont liés.';
create unique index if not exists filed_reprise_tiers_un on public.filed_reprise_tiers (client_id, entite_id, comp_aux_num);
create index if not exists filed_reprise_tiers_fournisseur on public.filed_reprise_tiers (fournisseur_id);
alter table public.filed_reprise_tiers enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_reprise_tiers' and policyname = 'filed_reprise_tiers_lecture') then
    execute 'create policy filed_reprise_tiers_lecture on public.filed_reprise_tiers for select to authenticated using (client_id in (select private.mes_clients()))';
  end if;
end $$;
revoke all on table public.filed_reprise_tiers from anon, authenticated;
grant select on public.filed_reprise_tiers to authenticated;

insert into private.tables_locataires (nom, ordre_effacement, note) values
  ('filed_reprise_ecritures', 1, 'FILED, lot 16'), ('filed_reprise_tiers', 2, 'FILED, lot 16'), ('filed_reprises', 3, 'FILED, lot 16')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Lecture d'un FEC
-- ───────────────────────────────────────────────────────────────────────────
-- Une date AAAAMMJJ (ou AAAA-MM-JJ) ; nulle si vide ou illisible.
create or replace function private.filed_fec_lire_date(p text)
returns date language plpgsql immutable set search_path to '' as $$
declare v text := btrim(coalesce(p, ''));
begin
  if v = '' then return null; end if;
  if v ~ '^[0-9]{8}$' then return to_date(v, 'YYYYMMDD'); end if;
  if v ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then return left(v, 10)::date; end if;
  return null;
exception when others then return null;
end $$;

-- Un montant à virgule décimale (« 1 234,56 », « 1.234,56 », « -12,5 », « 12.50 ») ; nul si illisible, 0 si vide.
create or replace function private.filed_fec_lire_montant(p text)
returns numeric language plpgsql immutable set search_path to '' as $$
declare v text := coalesce(p, '');
begin
  if v ~ '[A-Za-z]' then return null; end if;
  v := regexp_replace(v, '[^0-9,.+-]', '', 'g');   -- espaces, y compris insécables, séparateurs de milliers
  if v = '' then return 0; end if;
  if v ~ ',' then v := replace(replace(v, '.', ''), ',', '.'); end if;
  if v !~ '^[+-]?[0-9]+(\.[0-9]+)?$' then return null; end if;
  return round(v::numeric, 2);
exception when others then return null;
end $$;

-- La clé d'un nom : minuscules, sans accents, sans forme sociale ni ponctuation.
create or replace function private.filed_cle_nom(p text)
returns text language sql immutable set search_path to '' as $$
  select nullif(btrim(regexp_replace(regexp_replace(
           translate(lower(coalesce(p, '')), 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ', 'aaaaaaceeeeiiiinooooouuuuyyoa'),
           '[^a-z0-9]+', ' ', 'g'),
           '(^| )(sas|sasu|sarl|eurl|sa|sci|snc|selarl|ets|etablissements|societe|ste|the|cie)( |$)', ' ', 'g')), '')
$$;

revoke all on function private.filed_fec_lire_date(text) from public, anon, authenticated;
revoke all on function private.filed_fec_lire_montant(text) from public, anon, authenticated;
revoke all on function private.filed_cle_nom(text) from public, anon, authenticated;
grant execute on function private.filed_fec_lire_date(text), private.filed_fec_lire_montant(text), private.filed_cle_nom(text) to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Lier les tiers repris aux fournisseurs FILED, et apprendre leurs comptes
-- ───────────────────────────────────────────────────────────────────────────
-- Le compte du plan comptable d'un numéro : celui de la société d'abord, celui de l'organisation sinon.
create or replace function private.filed_compte_numero(p_client uuid, p_entite uuid, p_numero text)
returns uuid language sql stable set search_path to '' as $$
  select c.id from public.filed_plan_comptable c
   where c.client_id = p_client and (c.entite_id = p_entite or c.entite_id is null) and c.numero = p_numero and c.actif
   order by (c.entite_id is not null) desc limit 1
$$;
revoke all on function private.filed_compte_numero(uuid, uuid, text) from public, anon, authenticated;
grant execute on function private.filed_compte_numero(uuid, uuid, text) to service_role;

-- Ajoute aux imputations apprises d'un fournisseur les comptes d'un tiers repris ({"606100": 12, …}).
create or replace function private.filed_apprendre_reprise(p_client uuid, p_entite uuid, p_fournisseur uuid, p_comptes jsonb, p_derniere date)
returns integer language plpgsql security definer set search_path to '' as $$
declare r record; v_compte uuid; v_n integer := 0;
begin
  for r in select key, value from jsonb_each_text(coalesce(p_comptes, '{}'::jsonb)) loop
    v_compte := private.filed_compte_numero(p_client, p_entite, r.key);
    if v_compte is null or coalesce(r.value::integer, 0) <= 0 then continue; end if;
    insert into public.filed_imputations_apprises (client_id, fournisseur_id, compte_id, centre_id, nb_validees, derniere_le)
    values (p_client, p_fournisseur, v_compte, null, r.value::integer, p_derniere::timestamptz)
    on conflict (fournisseur_id, compte_id, coalesce(centre_id, '00000000-0000-0000-0000-000000000000'::uuid))
    do update set nb_validees = public.filed_imputations_apprises.nb_validees + excluded.nb_validees,
                  derniere_le = greatest(public.filed_imputations_apprises.derniere_le, excluded.derniere_le), maj_le = now();
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke all on function private.filed_apprendre_reprise(uuid, uuid, uuid, jsonb, date) from public, anon, authenticated;

-- Lie les tiers repris encore sans fournisseur (d'une organisation, ou au seul fournisseur donné) : même code, ou même
-- clé de nom, et un seul fournisseur possible. Rend le nombre de tiers liés.
create or replace function private.filed_lier_tiers_reprise(p_client uuid, p_fournisseur uuid default null)
returns integer language plpgsql security definer set search_path to '' as $$
declare t record; v_four uuid; v_n integer := 0;
begin
  for t in select * from public.filed_reprise_tiers where client_id = p_client and fournisseur_id is null for update loop
    select min(f.id::text)::uuid into v_four from public.filed_fournisseurs f
     where f.client_id = p_client and (p_fournisseur is null or f.id = p_fournisseur)
       and f.statut <> 'refuse'
       and (upper(btrim(coalesce(f.code, ''))) = upper(btrim(t.comp_aux_num)) or private.filed_cle_nom(f.nom) = t.cle_nom)
    having count(*) = 1;
    if v_four is null then continue; end if;
    update public.filed_reprise_tiers set fournisseur_id = v_four, lie_le = now(), maj_le = now() where id = t.id;
    perform private.filed_apprendre_reprise(t.client_id, t.entite_id, v_four, t.comptes, t.derniere);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke all on function private.filed_lier_tiers_reprise(uuid, uuid) from public, anon, authenticated;

-- Un fournisseur créé ou renommé après la reprise trouve son tiers.
create or replace function private.filed_fournisseurs_lier_reprise()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if exists (select 1 from public.filed_reprise_tiers where client_id = new.client_id and fournisseur_id is null) then
    perform private.filed_lier_tiers_reprise(new.client_id, new.id);
  end if;
  return null;
end $$;
revoke all on function private.filed_fournisseurs_lier_reprise() from public, anon, authenticated;
create or replace trigger filed_fournisseurs_lier_reprise
  after insert or update of nom, code on public.filed_fournisseurs
  for each row execute function private.filed_fournisseurs_lier_reprise();

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Reprendre un fichier
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_reprendre_fec(p_client uuid, p_entite uuid, p_nom text, p_contenu text, p_debut date, p_acteur uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_e public.entites; v_nom text := btrim(coalesce(p_nom, '')); v_m text[]; v_siren text; v_fin date; v_debut date;
  v_contenu text; v_empreinte text; v_deja public.filed_reprises; v_lignes text[]; v_entete text; v_sep text; v_cols text[];
  v_nb integer; i_jc int; i_jl int; i_en int; i_ed int; i_cn int; i_cl int; i_an int; i_al int; i_pr int; i_pd int; i_el int;
  i_d int; i_c int; i_mt int; i_sn int; i_lt int; i_dl int; i_vd int; i_md int; i_id int;
  v_rep uuid; v_bad integer; v_detail text; v_min date; v_max date; v_prec date; v_x public.filed_exercices; v_exo uuid;
  v_n integer; v_ecr integer; v_d numeric; v_c numeric; v_comptes integer; v_tiers integer; t record;
begin
  select * into v_e from public.entites where id = p_entite and client_id = p_client;
  if not found then raise exception 'Société introuvable dans cette organisation.' using errcode = '22023'; end if;
  v_m := regexp_match(v_nom, '^([0-9]{9})FEC([0-9]{8})(\.[A-Za-z]{2,4})?$', 'i');
  if v_m is null then
    raise exception 'Le fichier « % » ne porte pas un nom de FEC (SirenFECAAAAMMJJ).', left(v_nom, 80) using errcode = '22023';
  end if;
  v_siren := v_m[1];
  v_fin := private.filed_fec_lire_date(v_m[2]);
  if v_fin is null then raise exception 'La date de clôture du nom « % » est illisible.', v_nom using errcode = '22023'; end if;
  if v_fin >= current_date then raise exception 'Un exercice repris est clos : la clôture % n''est pas passée.', to_char(v_fin, 'DD/MM/YYYY') using errcode = '22023'; end if;
  if v_e.siren ~ '^[0-9]{9}$' and v_e.siren <> v_siren then
    raise exception 'Le fichier « % » est celui du SIREN %, la société a le SIREN %.', v_nom, v_siren, v_e.siren using errcode = '22023';
  end if;

  v_contenu := coalesce(p_contenu, '');
  if getdatabaseencoding() = 'UTF8' then v_contenu := regexp_replace(v_contenu, '^' || chr(65279), ''); end if;   -- marque d'ordre des octets
  v_empreinte := encode(sha256(convert_to(v_contenu, 'UTF8')), 'hex');
  select * into v_deja from public.filed_reprises where client_id = p_client and entite_id = p_entite and empreinte = v_empreinte;
  if found then
    return jsonb_build_object('nom_fichier', v_nom, 'reprise', v_deja.id, 'deja', true, 'exercice', v_deja.exercice_id,
      'debut', v_deja.debut, 'fin', v_deja.fin, 'lignes', v_deja.lignes, 'ecritures', v_deja.ecritures);
  end if;

  v_lignes := regexp_split_to_array(v_contenu, E'\r?\n');
  v_entete := v_lignes[1];
  if v_entete is null or btrim(v_entete) = '' then raise exception 'Le fichier « % » est vide.', v_nom using errcode = '22023'; end if;
  v_sep := case when position(chr(9) in v_entete) > 0 then chr(9) when position('|' in v_entete) > 0 then '|' else null end;
  if v_sep is null then raise exception 'Séparateur inconnu : un FEC se sépare par tabulation ou « | ».' using errcode = '22023'; end if;
  select array_agg(lower(btrim(x)) order by n) into v_cols from unnest(string_to_array(v_entete, v_sep)) with ordinality u(x, n);
  v_nb := cardinality(v_cols);
  i_jc := array_position(v_cols, 'journalcode'); i_jl := array_position(v_cols, 'journallib');
  i_en := array_position(v_cols, 'ecriturenum'); i_ed := array_position(v_cols, 'ecrituredate');
  i_cn := array_position(v_cols, 'comptenum'); i_cl := array_position(v_cols, 'comptelib');
  i_an := array_position(v_cols, 'compauxnum'); i_al := array_position(v_cols, 'compauxlib');
  i_pr := array_position(v_cols, 'pieceref'); i_pd := array_position(v_cols, 'piecedate');
  i_el := array_position(v_cols, 'ecriturelib'); i_d := array_position(v_cols, 'debit'); i_c := array_position(v_cols, 'credit');
  i_mt := array_position(v_cols, 'montant'); i_sn := array_position(v_cols, 'sens');
  i_lt := array_position(v_cols, 'ecriturelet'); i_dl := array_position(v_cols, 'datelet'); i_vd := array_position(v_cols, 'validdate');
  i_md := coalesce(array_position(v_cols, 'montantdevise'), array_position(v_cols, 'montant devise'));
  i_id := array_position(v_cols, 'idevise');
  if i_jc is null or i_en is null or i_ed is null or i_cn is null or i_pr is null
     or not ((i_d is not null and i_c is not null) or (i_mt is not null and i_sn is not null)) then
    raise exception 'En-tête de FEC incomplet : JournalCode, EcritureNum, EcritureDate, CompteNum, PieceRef et Debit/Credit (ou Montant/Sens) sont attendus.'
      using errcode = '22023';
  end if;

  select string_agg(n::text, ', ') into v_detail from (
    select n from unnest(v_lignes) with ordinality u(l, n)
     where n > 1 and btrim(l) <> '' and cardinality(string_to_array(l, v_sep)) <> v_nb order by n limit 5) s;
  if v_detail is not null then
    raise exception 'Nombre de colonnes différent de l''en-tête (% colonnes), ligne(s) %.', v_nb, v_detail using errcode = '22023';
  end if;

  select string_agg(n::text, ', ') into v_detail from (
    select n from (select n, string_to_array(l, v_sep) c from unnest(v_lignes) with ordinality u(l, n) where n > 1 and btrim(l) <> '') s
     where private.filed_fec_lire_date(c[i_ed]) is null or private.filed_fec_lire_montant(c[i_d]) is null
        or private.filed_fec_lire_montant(c[i_c]) is null or private.filed_fec_lire_montant(c[i_mt]) is null
        or btrim(c[i_jc]) = '' or btrim(c[i_en]) = '' or btrim(c[i_cn]) = ''
     order by n limit 5) s;
  if v_detail is not null then
    raise exception 'Date, montant, journal, numéro d''écriture ou compte illisible, ligne(s) %.', v_detail using errcode = '22023';
  end if;

  insert into public.filed_reprises (client_id, entite_id, nom_fichier, empreinte, siren, debut, fin, depose_par)
  values (p_client, p_entite, left(v_nom, 200), v_empreinte, v_siren, v_fin, v_fin, p_acteur)
  returning id into v_rep;

  insert into public.filed_reprise_ecritures (reprise_id, client_id, entite_id, ligne, journal_code, journal_lib, ecriture_num, ecriture_date,
    compte_num, compte_lib, comp_aux_num, comp_aux_lib, piece_ref, piece_ref_normalise, piece_date, ecriture_lib, debit, credit,
    ecriture_let, date_let, valid_date, montant_devise, idevise)
  select v_rep, p_client, p_entite, n, btrim(c[i_jc]), btrim(c[i_jl]), btrim(c[i_en]), private.filed_fec_lire_date(c[i_ed]),
         btrim(c[i_cn]), btrim(c[i_cl]), nullif(btrim(c[i_an]), ''), nullif(btrim(c[i_al]), ''),
         nullif(btrim(c[i_pr]), ''), nullif(upper(regexp_replace(coalesce(c[i_pr], ''), '[^A-Za-z0-9]', '', 'g')), ''),
         private.filed_fec_lire_date(c[i_pd]), btrim(c[i_el]),
         case when i_d is not null then private.filed_fec_lire_montant(c[i_d])
              when upper(btrim(c[i_sn])) in ('D', '+1', '1') then abs(private.filed_fec_lire_montant(c[i_mt])) else 0 end,
         case when i_c is not null then private.filed_fec_lire_montant(c[i_c])
              when upper(btrim(c[i_sn])) in ('C', '-1') then abs(private.filed_fec_lire_montant(c[i_mt])) else 0 end,
         nullif(btrim(c[i_lt]), ''), private.filed_fec_lire_date(c[i_dl]), private.filed_fec_lire_date(c[i_vd]),
         case when i_md is not null and nullif(btrim(c[i_md]), '') is not null then private.filed_fec_lire_montant(c[i_md]) end,
         nullif(upper(btrim(c[i_id])), '')
    from (select n, string_to_array(l, v_sep) c from unnest(v_lignes) with ordinality u(l, n) where n > 1 and btrim(l) <> '') s;
  get diagnostics v_n = row_count;
  if v_n = 0 then raise exception 'Le fichier « % » n''a aucune écriture.', v_nom using errcode = '22023'; end if;

  select string_agg(format('%s %s (écart %s)', journal_code, ecriture_num, private.filed_montant_texte(ecart)), ', '), count(*)
    into v_detail, v_bad from (
    select journal_code, ecriture_num, sum(debit) - sum(credit) ecart from public.filed_reprise_ecritures
     where reprise_id = v_rep group by journal_code, ecriture_num having sum(debit) <> sum(credit) order by 1, 2 limit 5) s;
  if v_bad > 0 then raise exception 'Écritures déséquilibrées : %.', v_detail using errcode = '22023'; end if;
  select min(ecriture_date), max(ecriture_date), count(distinct (journal_code, ecriture_num)), sum(debit), sum(credit)
    into v_min, v_max, v_ecr, v_d, v_c
    from public.filed_reprise_ecritures where reprise_id = v_rep;
  if v_max > v_fin then
    raise exception 'Écriture du % après la clôture du % : ce fichier n''est pas celui de cet exercice.', to_char(v_max, 'DD/MM/YYYY'), to_char(v_fin, 'DD/MM/YYYY')
      using errcode = '22023';
  end if;

  -- L'exercice : celui qui finit à la clôture s'il existe ; sinon un exercice clos, du lendemain du précédent.
  select * into v_x from public.filed_exercices where client_id = p_client and entite_id = p_entite and fin = v_fin;
  if found then
    if v_x.debut > v_min then
      raise exception 'L''exercice % commence le %, après la première écriture du fichier (%).', v_x.libelle, to_char(v_x.debut, 'DD/MM/YYYY'), to_char(v_min, 'DD/MM/YYYY')
        using errcode = '22023';
    end if;
    v_exo := v_x.id; v_debut := v_x.debut;
  else
    select max(fin) into v_prec from public.filed_exercices where client_id = p_client and entite_id = p_entite and fin < v_fin;
    v_debut := coalesce(p_debut, case when v_prec is not null and v_prec + 1 <= v_min then v_prec + 1 end,
                        date_trunc('month', v_min::timestamp)::date);
    if v_debut > v_min then
      raise exception 'L''exercice commencerait le %, après la première écriture du fichier (%).', to_char(v_debut, 'DD/MM/YYYY'), to_char(v_min, 'DD/MM/YYYY')
        using errcode = '22023';
    end if;
    if v_fin - v_debut > 730 then
      raise exception 'Du % au % : un exercice dure deux ans au plus.', to_char(v_debut, 'DD/MM/YYYY'), to_char(v_fin, 'DD/MM/YYYY') using errcode = '22023';
    end if;
    if exists (select 1 from public.filed_exercices e where e.client_id = p_client and e.entite_id = p_entite
               and daterange(e.debut, e.fin, '[]') && daterange(v_debut, v_fin, '[]')) then
      raise exception 'Un exercice de la société chevauche déjà le % au %.', to_char(v_debut, 'DD/MM/YYYY'), to_char(v_fin, 'DD/MM/YYYY') using errcode = '23P01';
    end if;
    insert into public.filed_exercices (client_id, entite_id, libelle, debut, fin, cloture_le, cloture_par, statut)
    values (p_client, p_entite,
            format('Exercice %s', to_char(v_debut, 'YYYY') || case when extract(year from v_fin) <> extract(year from v_debut) then '-' || to_char(v_fin, 'YYYY') else '' end),
            v_debut, v_fin, v_fin, p_acteur, 'cloture')
    returning id into v_exo;
    perform private.filed_journaliser(p_client, 'filed.exercice.ouverture', 'filed_exercice', v_exo::text,
      jsonb_build_object('debut', v_debut, 'fin', v_fin, 'origine', 'reprise', 'fichier', v_nom, 'clos', true), p_entite);
  end if;

  -- Le plan comptable : comptes de charge et d'immobilisation absents.
  with c as (
    select distinct on (compte_num) compte_num, coalesce(nullif(compte_lib, ''), 'Compte ' || compte_num) lib
      from public.filed_reprise_ecritures
     where reprise_id = v_rep and compte_num ~ '^[26][0-9]{2,11}$'
     order by compte_num, ligne desc)
  insert into public.filed_plan_comptable (client_id, entite_id, numero, libelle, nature, source)
  select p_client, p_entite, c.compte_num, left(c.lib, 200), case when left(c.compte_num, 1) = '2' then 'immobilisation' else 'charge' end, 'import'
    from c where private.filed_compte_numero(p_client, p_entite, c.compte_num) is null
  on conflict do nothing;
  get diagnostics v_comptes = row_count;

  -- Les tiers fournisseurs et leurs comptes habituels, pour les pièces de ce fichier.
  v_tiers := 0;
  for t in
    with p as (   -- les pièces d'achat : une ligne 40x avec compte auxiliaire, et au moins une ligne 2 ou 6
      select e.journal_code, e.ecriture_num, e.comp_aux_num, e.comp_aux_lib, e.credit - e.debit montant, e.ecriture_date
        from public.filed_reprise_ecritures e
       where e.reprise_id = v_rep and e.compte_num like '40%' and e.comp_aux_num is not null
         and exists (select 1 from public.filed_reprise_ecritures g where g.reprise_id = v_rep and g.journal_code = e.journal_code
                       and g.ecriture_num = e.ecriture_num and g.compte_num ~ '^[26]')),
    k as (
      select p.comp_aux_num, g.compte_num, count(distinct (p.journal_code, p.ecriture_num)) n
        from p join public.filed_reprise_ecritures g on g.reprise_id = v_rep and g.journal_code = p.journal_code
                                                    and g.ecriture_num = p.ecriture_num and g.compte_num ~ '^[26]'
       group by 1, 2)
    select p.comp_aux_num,
           (array_agg(p.comp_aux_lib order by p.ecriture_date desc) filter (where p.comp_aux_lib is not null))[1] lib,
           count(distinct (p.journal_code, p.ecriture_num))::integer pieces, sum(p.montant) total, min(p.ecriture_date) premiere,
           max(p.ecriture_date) derniere,
           coalesce((select jsonb_object_agg(k.compte_num, k.n) from k where k.comp_aux_num = p.comp_aux_num), '{}'::jsonb) comptes
      from p group by p.comp_aux_num
  loop
    insert into public.filed_reprise_tiers as x (client_id, entite_id, comp_aux_num, comp_aux_lib, cle_nom, comptes, pieces, total, premiere, derniere)
    values (p_client, p_entite, t.comp_aux_num, t.lib, private.filed_cle_nom(t.lib), t.comptes, t.pieces, t.total, t.premiere, t.derniere)
    on conflict (client_id, entite_id, comp_aux_num) do update
      set comp_aux_lib = case when excluded.derniere >= x.derniere then coalesce(excluded.comp_aux_lib, x.comp_aux_lib) else x.comp_aux_lib end,
          cle_nom = case when excluded.derniere >= x.derniere then coalesce(excluded.cle_nom, x.cle_nom) else x.cle_nom end,
          comptes = (select coalesce(jsonb_object_agg(key, s), '{}'::jsonb) from (
                       select key, sum(value::integer) s from (select * from jsonb_each_text(x.comptes) union all select * from jsonb_each_text(excluded.comptes)) u
                        group by key) z),
          pieces = x.pieces + excluded.pieces, total = x.total + excluded.total,
          premiere = least(x.premiere, excluded.premiere), derniere = greatest(x.derniere, excluded.derniere), maj_le = now();
    -- Un tiers déjà lié apprend tout de suite les pièces de ce fichier.
    perform private.filed_apprendre_reprise(p_client, p_entite, x.fournisseur_id, t.comptes, t.derniere)
       from public.filed_reprise_tiers x
      where x.client_id = p_client and x.entite_id = p_entite and x.comp_aux_num = t.comp_aux_num and x.fournisseur_id is not null;
    v_tiers := v_tiers + 1;
  end loop;

  update public.filed_reprises
     set debut = v_debut, exercice_id = v_exo, lignes = v_n, ecritures = v_ecr, total_debit = v_d, total_credit = v_c,
         comptes_poses = v_comptes, tiers = v_tiers
   where id = v_rep;
  perform private.filed_journaliser(p_client, 'filed.reprise_fec', 'entite', p_entite::text,
    jsonb_build_object('fichier', v_nom, 'empreinte', v_empreinte, 'debut', v_debut, 'fin', v_fin, 'lignes', v_n, 'ecritures', v_ecr,
                       'total_debit', v_d, 'total_credit', v_c, 'comptes_poses', v_comptes, 'tiers', v_tiers), p_entite);
  return jsonb_build_object('nom_fichier', v_nom, 'reprise', v_rep, 'deja', false, 'exercice', v_exo, 'debut', v_debut, 'fin', v_fin,
    'lignes', v_n, 'ecritures', v_ecr, 'total_debit', v_d, 'total_credit', v_c, 'comptes_poses', v_comptes, 'tiers', v_tiers);
end $$;
comment on function private.filed_reprendre_fec(uuid, uuid, text, text, date, uuid) is
  'Lot 16 (a4_24) : reprend un FEC d''un exercice passé (contrôles, exercice clos, lignes, plan comptable, tiers et comptes habituels). Appelée par filed_reprendre_historique.';
revoke all on function private.filed_reprendre_fec(uuid, uuid, text, text, date, uuid) from public, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. La porte : tous les exercices en une fois
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_reprendre_historique(p_client uuid, p_entite uuid, p_fichiers jsonb)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare v_acteur uuid; f jsonb; v_rendu jsonb := '[]'::jsonb; v_r jsonb; v_debut date; v_lies integer;
begin
  v_acteur := private.filed_exiger_acteur(p_client, array['gerant', 'admin'], p_entite);
  if jsonb_typeof(coalesce(p_fichiers, 'null'::jsonb)) <> 'array' or jsonb_array_length(p_fichiers) = 0 then
    raise exception 'p_fichiers est un tableau de fichiers [{nom_fichier, contenu}].' using errcode = '22023';
  end if;
  if jsonb_array_length(p_fichiers) > 20 then raise exception 'Vingt exercices au plus par reprise.' using errcode = '22023'; end if;
  for f in select x from jsonb_array_elements(p_fichiers) x
            order by substring(coalesce(x ->> 'nom_fichier', '') from '(?i)FEC([0-9]{8})') nulls first loop
    begin
      v_debut := nullif(f ->> 'debut', '')::date;
      v_r := private.filed_reprendre_fec(p_client, p_entite, f ->> 'nom_fichier', f ->> 'contenu', v_debut, v_acteur);
    exception when others then
      v_r := jsonb_build_object('nom_fichier', f ->> 'nom_fichier', 'erreur', sqlerrm, 'code', sqlstate);
    end;
    v_rendu := v_rendu || v_r;
  end loop;
  v_lies := private.filed_lier_tiers_reprise(p_client, null);
  return v_rendu || jsonb_build_object('tiers_lies', v_lies,
    'tiers_a_lier', (select count(*) from public.filed_reprise_tiers where client_id = p_client and entite_id = p_entite and fournisseur_id is null));
end $$;
comment on function private.filed_reprendre_historique(uuid, uuid, jsonb) is
  'Lot 16 (a4_24) : reprend en une fois les FEC des exercices passés d''une société. Un rendu par fichier (ou son erreur), puis le bilan des tiers liés.';
revoke all on function private.filed_reprendre_historique(uuid, uuid, jsonb) from public, anon;
grant execute on function private.filed_reprendre_historique(uuid, uuid, jsonb) to authenticated, service_role;

create or replace function public.filed_reprendre_historique(p_client uuid, p_entite uuid, p_fichiers jsonb)
returns jsonb language sql set search_path to '' as $$ select private.filed_reprendre_historique(p_client, p_entite, p_fichiers) $$;
comment on function public.filed_reprendre_historique(uuid, uuid, jsonb) is
  'Reprend en une fois l''historique comptable (les FEC des exercices passés) d''une société : exercices clos, plan comptable, fournisseurs et leurs comptes habituels. Gérant ou admin.';
revoke all on function public.filed_reprendre_historique(uuid, uuid, jsonb) from public, anon;
grant execute on function public.filed_reprendre_historique(uuid, uuid, jsonb) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Au contrôle : la facture déjà comptabilisée dans l'ancien logiciel
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_doublon_historique(p_f public.filed_factures)
returns void language plpgsql security definer set search_path to '' as $$
declare r record; v_num text;
begin
  if not exists (select 1 from public.filed_reprises rp where rp.client_id = p_f.client_id) then return; end if;   -- aucune reprise : rien à dire
  if p_f.fournisseur_id is null or not exists (select 1 from public.filed_reprise_tiers t where t.fournisseur_id = p_f.fournisseur_id) then
    perform private.filed_poser_resultat(p_f, 'doublon.historique', 'bloquant', false, 'Absente de l''historique repris.', null, '{}'::jsonb, '');
    return;
  end if;
  v_num := nullif(upper(regexp_replace(coalesce(p_f.numero_normalise, p_f.numero, ''), '[^A-Za-z0-9]', '', 'g')), '');
  select e.journal_code, e.ecriture_num, e.ecriture_date, e.piece_ref, e.credit - e.debit montant, rp.nom_fichier
    into r
    from public.filed_reprise_tiers t
    join public.filed_reprise_ecritures e on e.client_id = t.client_id and e.entite_id = t.entite_id and e.comp_aux_num = t.comp_aux_num
    join public.filed_reprises rp on rp.id = e.reprise_id
   where t.fournisseur_id = p_f.fournisseur_id and e.compte_num like '40%' and v_num is not null
     and e.piece_ref_normalise = v_num
     and (p_f.nature = 'avoir') = (e.debit > e.credit)
   order by e.ecriture_date desc limit 1;
  if found then
    perform private.filed_poser_resultat(p_f, 'doublon.historique', 'bloquant', true,
      format('Déjà comptabilisée dans l''ancien logiciel : pièce %s, écriture %s %s du %s, %s (%s).', r.piece_ref, r.journal_code, r.ecriture_num,
             to_char(r.ecriture_date, 'DD/MM/YYYY'), private.filed_montant_texte(abs(r.montant)), r.nom_fichier),
      null,
      jsonb_build_object('journal', r.journal_code, 'ecriture', r.ecriture_num, 'date', r.ecriture_date, 'piece_ref', r.piece_ref,
                         'montant', abs(r.montant), 'fichier', r.nom_fichier),
      r.journal_code || ':' || r.ecriture_num);
  else
    perform private.filed_poser_resultat(p_f, 'doublon.historique', 'bloquant', false, 'Absente de l''historique repris.', null, '{}'::jsonb, '');
  end if;
end $$;
revoke all on function private.filed_doublon_historique(public.filed_factures) from public, anon, authenticated;

-- Réécrite (texte d'a4_02) : le contrôle du doublon historique passe en tête, le reste est inchangé.
create or replace function private.filed_controles_comptables(p_facture uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_exo public.filed_factures_exercices; v_e public.filed_exercices;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found then return; end if;
  perform private.filed_doublon_historique(v_f);
  v_exo := private.filed_orienter_exercice(v_f);
  if v_exo.facture_id is null then
    if exists (select 1 from public.filed_exercices e where e.client_id = v_f.client_id) then
      perform private.filed_poser_resultat(v_f, 'exercice.absent', 'attention', true,
        'Aucun exercice ne couvre la date d''émission : à ouvrir avant de comptabiliser.', null,
        jsonb_build_object('date_emission', v_f.date_emission), coalesce(v_f.date_emission::text, ''));
    else
      perform private.filed_poser_resultat(v_f, 'exercice.absent', 'info', false,
        'Aucun exercice réglé pour cette organisation : la pièce n''est pas orientée.', null, '{}'::jsonb, '');
    end if;
    return;
  end if;
  select * into v_e from public.filed_exercices where id = v_exo.exercice_id;
  perform private.filed_poser_resultat(v_f, 'exercice.cloture', 'attention', v_exo.orientee,
    case when v_exo.orientee then v_exo.mention else format('Exercice %s (du %s au %s).', v_e.libelle, to_char(v_e.debut, 'DD/MM/YYYY'), to_char(v_e.fin, 'DD/MM/YYYY')) end,
    null,
    jsonb_build_object('exercice', v_exo.exercice_id, 'exercice_naturel', v_exo.exercice_naturel_id, 'orientee', v_exo.orientee, 'date_reception', v_f.date_reception),
    v_exo.exercice_id::text);
end $$;
