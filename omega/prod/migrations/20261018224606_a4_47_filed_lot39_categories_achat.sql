-- 20261018224606 a4_47_filed_lot39_categories_achat
-- Source : dépôt : 3bec273 omega/migrations/a4_47_filed_lot39_categories_achat.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_47_filed_lot39_categories_achat.sql @ 3bec273 ; a4_35 cité comme test : ignoré.
-- ═══ omega/migrations/a4_47_filed_lot39_categories_achat.sql @ 3bec273
-- FILED, lot 39 (a4_47) — les catégories d'achat propres à l'organisation (chiffrage FILED, n° 31).
--
-- « Catégories d'achat sur mesure » : chaque organisation tient sa liste (code, libellé, mots-clés, compte par défaut
-- au besoin) ; FILED range chaque facture dans une catégorie de cette liste, jamais ailleurs :
--   1. ce que le lecteur a proposé (valeur « categorie », « categorie_achat » ou « depense.categorie ») s'il désigne
--      une catégorie de la liste (code, libellé ou mot-clé) — source « lecture » ;
--   2. sinon la catégorie que ce fournisseur reçoit d'habitude (d'abord le choix d'une personne, puis la plus
--      fréquente) — source « fournisseur » ;
--   3. sinon rien : la facture reste sans catégorie, une personne la range.
-- Le choix d'une personne (filed_categoriser_facture) n'est jamais repris par la machine.
-- Pour le lecteur (A1) : private.filed_categories_lecteur(organisation) rend la liste à lui donner (service_role).
-- Portes : filed_categories_par_defaut (une liste de départ, sans écraser), filed_poser_categorie,
-- filed_retirer_categorie (gérant, admin) ; filed_categoriser_facture (gérant, admin, valideur) ;
-- filed_depenses_par_categorie (le pilotage par catégorie).
-- Branchement : private.filed_apres_controle (texte d'a4_32) range la facture après chaque contrôle ; une erreur de
-- rangement n'arrête jamais le contrôle. Pose « par repère » pour ce branchement.
-- Migration idempotente. Aucun DROP, aucune suppression ; aucun envoi.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. La liste de l'organisation
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.filed_categories (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,
  code        text not null check (code ~ '^[A-Z0-9._-]{1,32}$'),
  libelle     text not null check (char_length(btrim(libelle)) between 1 and 120),
  mots_cles   text[] not null default '{}',
  compte_id   uuid references public.filed_plan_comptable(id) on delete set null,
  rang        integer not null default 100,
  actif       boolean not null default true,
  cree_le     timestamptz not null default now(),
  maj_le      timestamptz not null default now(),
  unique (client_id, code)
);
comment on table public.filed_categories is
  'Lot 39 (a4_47) : les catégories d''achat d''une organisation (code, libellé, mots-clés, compte par défaut). Les factures ne reçoivent qu''une catégorie de cette liste.';
create index if not exists filed_categories_client_actif on public.filed_categories (client_id, actif);

alter table public.filed_categories enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_categories' and policyname = 'filed_categories_lecture') then
    execute 'create policy filed_categories_lecture on public.filed_categories for select to authenticated using (client_id in (select private.mes_clients()))';
  end if;
end $$;
revoke all on table public.filed_categories from anon, authenticated;
grant select on public.filed_categories to authenticated;
grant all on public.filed_categories to service_role;
create or replace trigger filed_categories_maj_le before update on public.filed_categories
  for each row execute function private.filed_lot4_maj_le();

insert into private.tables_locataires (nom, ordre_effacement, note)
select 'filed_categories', 31, 'FILED, lot 39'
where not exists (select 1 from private.tables_locataires where nom = 'filed_categories');

-- La catégorie de chaque facture.
alter table public.filed_factures add column if not exists categorie text;
alter table public.filed_factures add column if not exists categorie_source text
  check (categorie_source in ('lecture', 'fournisseur', 'humain'));
alter table public.filed_factures add column if not exists categorie_le timestamptz;
create index if not exists filed_factures_categorie on public.filed_factures (client_id, categorie) where categorie is not null;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Les portes de la liste (gérant, admin)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_poser_categorie(p_client uuid, p_code text, p_libelle text, p_mots_cles text[] default null,
                                                         p_compte uuid default null, p_rang integer default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_id uuid; v_code text := upper(btrim(coalesce(p_code, ''))); v_mots text[];
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin']);
  if v_code !~ '^[A-Z0-9._-]{1,32}$' then raise exception 'Un code de catégorie fait de 1 à 32 lettres, chiffres, points ou tirets.' using errcode = '22023'; end if;
  if nullif(btrim(p_libelle), '') is null then raise exception 'Une catégorie porte un libellé.' using errcode = '22023'; end if;
  if p_compte is not null and not exists (select 1 from public.filed_plan_comptable c where c.id = p_compte and c.client_id = p_client) then
    raise exception 'Le compte n''est pas au plan de cette organisation.' using errcode = '22023';
  end if;
  select coalesce(array_agg(distinct m order by m), '{}') into v_mots
    from (select left(btrim(x), 60) m from unnest(coalesce(p_mots_cles, '{}')) x where nullif(btrim(x), '') is not null) s;
  insert into public.filed_categories (client_id, code, libelle, mots_cles, compte_id, rang)
  values (p_client, v_code, left(btrim(p_libelle), 120), v_mots, p_compte, coalesce(p_rang, 100))
  on conflict (client_id, code) do update
    set libelle = excluded.libelle, mots_cles = excluded.mots_cles, compte_id = excluded.compte_id,
        rang = coalesce(p_rang, public.filed_categories.rang), actif = true
  returning id into v_id;
  perform private.filed_journaliser(p_client, 'filed.categorie.pose', 'filed_categorie', v_id::text, jsonb_build_object('code', v_code));
  return v_id;
end $$;
revoke all on function private.filed_poser_categorie(uuid, text, text, text[], uuid, integer) from public, anon;
grant execute on function private.filed_poser_categorie(uuid, text, text, text[], uuid, integer) to authenticated, service_role;

create or replace function public.filed_poser_categorie(p_client uuid, p_code text, p_libelle text, p_mots_cles text[] default null,
                                                        p_compte uuid default null, p_rang integer default null)
returns uuid language sql set search_path to '' as $$ select private.filed_poser_categorie(p_client, p_code, p_libelle, p_mots_cles, p_compte, p_rang) $$;
comment on function public.filed_poser_categorie(uuid, text, text, text[], uuid, integer) is
  'Lot 39 (a4_47) : pose ou met à jour une catégorie d''achat de l''organisation (code, libellé, mots-clés, compte par défaut, rang). Gérant ou admin.';
revoke all on function public.filed_poser_categorie(uuid, text, text, text[], uuid, integer) from public, anon;
grant execute on function public.filed_poser_categorie(uuid, text, text, text[], uuid, integer) to authenticated, service_role;

create or replace function private.filed_retirer_categorie(p_categorie uuid, p_motif text default null)
returns void language plpgsql security definer set search_path to '' as $$
declare v_c public.filed_categories;
begin
  select * into v_c from public.filed_categories where id = p_categorie for update;
  if not found then raise exception 'Catégorie introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(v_c.client_id, array['gerant', 'admin']);
  update public.filed_categories set actif = false where id = p_categorie;
  perform private.filed_journaliser(v_c.client_id, 'filed.categorie.retrait', 'filed_categorie', v_c.id::text,
    jsonb_build_object('code', v_c.code, 'motif', left(nullif(btrim(p_motif), ''), 300)));
end $$;
revoke all on function private.filed_retirer_categorie(uuid, text) from public, anon;
grant execute on function private.filed_retirer_categorie(uuid, text) to authenticated, service_role;

create or replace function public.filed_retirer_categorie(p_categorie uuid, p_motif text default null)
returns void language sql set search_path to '' as $$ select private.filed_retirer_categorie(p_categorie, p_motif) $$;
comment on function public.filed_retirer_categorie(uuid, text) is
  'Lot 39 (a4_47) : retire une catégorie (les factures déjà rangées la gardent ; aucune nouvelle ne la reçoit). Gérant ou admin.';
revoke all on function public.filed_retirer_categorie(uuid, text) from public, anon;
grant execute on function public.filed_retirer_categorie(uuid, text) to authenticated, service_role;

-- Une liste de départ, que l'organisation modifie ensuite ; ne remplace rien de ce qu'elle a déjà posé.
create or replace function private.filed_categories_par_defaut(p_client uuid)
returns integer language plpgsql security definer set search_path to '' as $$
declare n integer;
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin']);
  insert into public.filed_categories (client_id, code, libelle, mots_cles, rang)
  select p_client, c.code, c.libelle, c.mots, c.rang from (values
    ('MARCHANDISES', 'Achats de marchandises',          array['marchandise', 'revente', 'stock'], 10),
    ('SOUS-TRAITANCE','Sous-traitance',                  array['sous traitance', 'prestation sous traitee'], 20),
    ('FOURNITURES',  'Fournitures et petit équipement', array['fourniture', 'papeterie', 'consommable', 'petit materiel'], 30),
    ('LOGICIELS',    'Logiciels et abonnements',        array['logiciel', 'abonnement', 'licence', 'saas', 'hebergement', 'cloud'], 40),
    ('TELECOM',      'Téléphone et internet',           array['telephone', 'internet', 'mobile', 'fibre', 'telecom'], 50),
    ('ENERGIE',      'Énergie et eau',                  array['electricite', 'gaz', 'eau', 'energie', 'carburant'], 60),
    ('LOYERS',       'Loyers et charges locatives',     array['loyer', 'bail', 'charges locatives', 'location'], 70),
    ('ENTRETIEN',    'Entretien et réparations',        array['entretien', 'reparation', 'maintenance', 'nettoyage'], 80),
    ('ASSURANCES',   'Assurances',                      array['assurance', 'prime', 'cotisation assurance'], 90),
    ('HONORAIRES',   'Honoraires',                      array['honoraires', 'avocat', 'expert comptable', 'conseil'], 100),
    ('PUBLICITE',    'Publicité et communication',      array['publicite', 'communication', 'marketing', 'annonce'], 110),
    ('TRANSPORT',    'Transport et livraison',          array['transport', 'livraison', 'fret', 'expedition', 'messagerie'], 120),
    ('DEPLACEMENTS', 'Déplacements',                    array['deplacement', 'train', 'avion', 'hotel', 'taxi', 'peage'], 130),
    ('REPAS',        'Repas et réceptions',             array['repas', 'restaurant', 'reception', 'traiteur'], 140),
    ('BANQUE',       'Frais bancaires',                 array['frais bancaires', 'commission', 'agios'], 150),
    ('FORMATION',    'Formation',                       array['formation', 'stage', 'seminaire'], 160),
    ('AUTRES',       'Autres achats',                   array[]::text[], 990)) c(code, libelle, mots, rang)
  on conflict (client_id, code) do nothing;
  get diagnostics n = row_count;
  if n > 0 then
    perform private.filed_journaliser(p_client, 'filed.categorie.depart', 'filed_categorie', p_client::text, jsonb_build_object('posees', n));
  end if;
  return n;
end $$;
revoke all on function private.filed_categories_par_defaut(uuid) from public, anon;
grant execute on function private.filed_categories_par_defaut(uuid) to authenticated, service_role;

create or replace function public.filed_categories_par_defaut(p_client uuid)
returns integer language sql set search_path to '' as $$ select private.filed_categories_par_defaut(p_client) $$;
comment on function public.filed_categories_par_defaut(uuid) is
  'Lot 39 (a4_47) : pose une liste de départ de catégories d''achat (sans toucher à celles déjà posées) ; rend le nombre posé. Gérant ou admin.';
revoke all on function public.filed_categories_par_defaut(uuid) from public, anon;
grant execute on function public.filed_categories_par_defaut(uuid) to authenticated, service_role;

-- Pour le lecteur (A1) : la liste à proposer, dans l'ordre.
create or replace function private.filed_categories_lecteur(p_client uuid)
returns jsonb language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', c.code, 'libelle', c.libelle, 'mots_cles', to_jsonb(c.mots_cles)) order by c.rang, c.code), '[]'::jsonb)
  from public.filed_categories c where c.client_id = p_client and c.actif
$$;
revoke all on function private.filed_categories_lecteur(uuid) from public, anon, authenticated;
grant execute on function private.filed_categories_lecteur(uuid) to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Ranger une facture
-- ───────────────────────────────────────────────────────────────────────────
-- La catégorie de la liste que désigne un texte libre (code, libellé ou mot-clé), ou rien.
create or replace function private.filed_categorie_designee(p_client uuid, p_texte text)
returns text language plpgsql stable security definer set search_path to '' as $$
declare v_txt text := private.filed_normaliser_nom(p_texte); v_code text;
begin
  if v_txt is null or v_txt = '' then return null; end if;
  select c.code into v_code from public.filed_categories c
   where c.client_id = p_client and c.actif
     and (upper(btrim(p_texte)) = c.code or private.filed_normaliser_nom(c.libelle) = v_txt)
   order by c.rang, c.code limit 1;
  if v_code is not null then return v_code; end if;
  select c.code into v_code from public.filed_categories c
   where c.client_id = p_client and c.actif
     and (position(' ' || private.filed_normaliser_nom(c.libelle) || ' ' in ' ' || v_txt || ' ') > 0
          or exists (select 1 from unnest(c.mots_cles) m
                      where nullif(private.filed_normaliser_nom(m), '') is not null
                        and position(' ' || private.filed_normaliser_nom(m) || ' ' in ' ' || v_txt || ' ') > 0))
   order by c.rang, c.code limit 1;
  return v_code;
end $$;
revoke all on function private.filed_categorie_designee(uuid, text) from public, anon, authenticated;
grant execute on function private.filed_categorie_designee(uuid, text) to service_role;

-- Le rangement automatique, après chaque contrôle ; ne touche jamais au choix d'une personne.
create or replace function private.filed_categoriser(p_facture uuid)
returns text language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_doc public.filed_documents; v_lu text; v_code text; v_source text;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found or v_f.categorie_source = 'humain' then return v_f.categorie; end if;
  if not exists (select 1 from public.filed_categories c where c.client_id = v_f.client_id and c.actif) then return v_f.categorie; end if;
  select * into v_doc from public.filed_documents where id = v_f.document_id;
  -- 1. Ce que le lecteur a proposé.
  select coalesce(pv.valeur #>> '{}', pv.texte) into v_lu from public.pieces_valeurs pv
   where pv.piece_id = v_doc.piece_id and pv.champ in ('categorie', 'categorie_achat', 'depense.categorie')
   order by pv.cree_le desc nulls last limit 1;
  v_code := private.filed_categorie_designee(v_f.client_id, v_lu);
  if v_code is not null then v_source := 'lecture'; end if;
  -- 2. Ce que ce fournisseur reçoit d'habitude : le choix d'une personne d'abord, puis le plus fréquent.
  if v_code is null and v_f.fournisseur_id is not null then
    select f.categorie into v_code from public.filed_factures f
      join public.filed_categories c on c.client_id = f.client_id and c.code = f.categorie and c.actif
     where f.client_id = v_f.client_id and f.fournisseur_id = v_f.fournisseur_id and f.id <> v_f.id and f.categorie is not null
       and f.statut <> 'ecartee'
     group by f.categorie
     order by bool_or(f.categorie_source = 'humain') desc, count(*) desc, f.categorie
     limit 1;
    if v_code is not null then v_source := 'fournisseur'; end if;
  end if;
  if v_code is not null and v_code is distinct from v_f.categorie then
    update public.filed_factures set categorie = v_code, categorie_source = v_source, categorie_le = now() where id = v_f.id;
    perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'categorisee',
      format('Rangée en « %s » (%s).', (select c.libelle from public.filed_categories c where c.client_id = v_f.client_id and c.code = v_code),
             case v_source when 'lecture' then 'proposée par la lecture' else 'habituelle chez ce fournisseur' end),
      jsonb_build_object('categorie', v_code, 'source', v_source, 'lu', left(v_lu, 120)));
  end if;
  return coalesce(v_code, v_f.categorie);
end $$;
revoke all on function private.filed_categoriser(uuid) from public, anon, authenticated;
grant execute on function private.filed_categoriser(uuid) to service_role;

-- Le choix d'une personne ; nul retire la catégorie (la machine peut alors reranger).
create or replace function private.filed_categoriser_facture(p_facture uuid, p_code text)
returns void language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_code text := nullif(upper(btrim(coalesce(p_code, ''))), '');
begin
  select * into v_f from public.filed_factures where id = p_facture for update;
  if not found then raise exception 'Facture introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(v_f.client_id, array['gerant', 'admin', 'valideur'], v_f.entite_id);
  if v_code is not null and not exists (select 1 from public.filed_categories c where c.client_id = v_f.client_id and c.code = v_code and c.actif) then
    raise exception 'Cette catégorie n''est pas dans la liste de l''organisation.' using errcode = '22023';
  end if;
  update public.filed_factures
     set categorie = v_code, categorie_source = case when v_code is null then null else 'humain' end, categorie_le = now()
   where id = v_f.id;
  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'categorisee',
    case when v_code is null then 'Catégorie retirée par une personne.'
         else format('Rangée en « %s » par une personne.', (select c.libelle from public.filed_categories c where c.client_id = v_f.client_id and c.code = v_code)) end,
    jsonb_build_object('categorie', v_code, 'source', 'humain', 'avant', v_f.categorie));
end $$;
revoke all on function private.filed_categoriser_facture(uuid, text) from public, anon;
grant execute on function private.filed_categoriser_facture(uuid, text) to authenticated, service_role;

create or replace function public.filed_categoriser_facture(p_facture uuid, p_code text)
returns void language sql set search_path to '' as $$ select private.filed_categoriser_facture(p_facture, p_code) $$;
comment on function public.filed_categoriser_facture(uuid, text) is
  'Lot 39 (a4_47) : range une facture dans une catégorie de la liste (nul : la retire). Le choix d''une personne n''est pas repris par la machine. Gérant, admin ou valideur.';
revoke all on function public.filed_categoriser_facture(uuid, text) from public, anon;
grant execute on function public.filed_categoriser_facture(uuid, text) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Le pilotage par catégorie
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_depenses_par_categorie(p_client uuid, p_du date, p_au date, p_entite uuid default null)
returns table (categorie text, libelle text, nombre bigint, montant_ht numeric, montant_ttc numeric)
language plpgsql stable security definer set search_path to '' as $$
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur'], p_entite);
  return query
    select coalesce(f.categorie, '(sans)'), coalesce(min(c.libelle), 'Sans catégorie'), count(*),
           round(coalesce(sum(case when f.nature = 'avoir' then -f.montant_ht else f.montant_ht end), 0), 2),
           round(coalesce(sum(case when f.nature = 'avoir' then -f.montant_ttc else f.montant_ttc end), 0), 2)
      from public.filed_factures f
      left join public.filed_categories c on c.client_id = f.client_id and c.code = f.categorie
     where f.client_id = p_client and (p_entite is null or f.entite_id = p_entite)
       and f.statut not in ('ecartee', 'refusee')
       and f.date_emission between coalesce(p_du, '-infinity'::date) and coalesce(p_au, 'infinity'::date)
     group by f.categorie
     order by min(coalesce(c.rang, 1000)), f.categorie;
end $$;
revoke all on function private.filed_depenses_par_categorie(uuid, date, date, uuid) from public, anon;
grant execute on function private.filed_depenses_par_categorie(uuid, date, date, uuid) to authenticated, service_role;

create or replace function public.filed_depenses_par_categorie(p_client uuid, p_du date, p_au date, p_entite uuid default null)
returns table (categorie text, libelle text, nombre bigint, montant_ht numeric, montant_ttc numeric)
language sql stable set search_path to '' as $$ select * from private.filed_depenses_par_categorie(p_client, p_du, p_au, p_entite) $$;
comment on function public.filed_depenses_par_categorie(uuid, date, date, uuid) is
  'Lot 39 (a4_47) : les dépenses de la période par catégorie (nombre, HT, TTC ; avoirs déduits ; écartées et refusées exclues). Gérant, admin ou valideur.';
revoke all on function public.filed_depenses_par_categorie(uuid, date, date, uuid) from public, anon;
grant execute on function public.filed_depenses_par_categorie(uuid, date, date, uuid) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Le branchement : après chaque contrôle, la facture est rangée (texte d'a4_32, par repère)
-- ───────────────────────────────────────────────────────────────────────────
do $do$
declare
  v_def text;
  v_ancien text := $o$  -- a4_32 : une pièce de l'historique repris, retrouvée dans le FEC, sort du circuit.
$o$;
  v_nouveau text := $n$  -- a4_47 : la facture est rangée dans une catégorie de l'organisation ; un échec n'arrête pas le contrôle.
  begin
    perform private.filed_categoriser(p_facture);
  exception when others then
    raise warning 'FILED : facture % non rangée (%)', p_facture, sqlerrm;
  end;
  -- a4_32 : une pièce de l'historique repris, retrouvée dans le FEC, sort du circuit.
$n$;
begin
  v_def := pg_get_functiondef('private.filed_apres_controle(uuid, text)'::regprocedure);
  if position('private.filed_categoriser(p_facture)' in v_def) > 0 then
    raise notice 'a4_47 : private.filed_apres_controle déjà branchée.';
    return;
  end if;
  if (length(v_def) - length(replace(v_def, v_ancien, ''))) / length(v_ancien) <> 1 then
    raise exception 'a4_47 : le repère attendu n''est pas une fois et une seule dans private.filed_apres_controle. Rien n''est posé.';
  end if;
  execute replace(v_def, v_ancien, v_nouveau);
  raise notice 'a4_47 : private.filed_apres_controle branchée.';
end $do$;
