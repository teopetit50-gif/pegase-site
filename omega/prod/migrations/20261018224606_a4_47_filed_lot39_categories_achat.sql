-- 20261018224606 a4_47_filed_lot39_categories_achat
-- Source : dépôt : 3bec273 omega/migrations/a4_47_filed_lot39_categories_achat.sql ; 3bec273 omega/migrations/a4_35_filed_lot27_notes_de_frais.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_47_filed_lot39_categories_achat.sql @ 3bec273, a4_35_filed_lot27_notes_de_frais.sql @ 3bec273.
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


-- ═══ omega/migrations/a4_35_filed_lot27_notes_de_frais.sql @ 3bec273
-- FILED, lot 27 (a4_35) — la note de frais : une dépense avancée par un salarié, remboursée à lui.
--
-- Promesse du site (lib/produits/factures.ts:78, « Note de frais ») ; chiffrage n° 13. Une note de frais est une
-- pièce comme les autres (ticket, facture de restaurant, de péage…), lue, contrôlée, imputée et approuvée par le
-- même circuit ; ce qui change, c'est à qui l'on doit l'argent. Ce lot pose :
--   filed_notes_frais                 la pièce déclarée « avancée par » une personne de l'organisation (le
--                                     bénéficiaire), son statut (a_rembourser, remboursee, refusee) ;
--   public.filed_declarer_note_frais  un membre la déclare pour lui-même ; gérant, admin ou valideur pour un autre ;
--   la garde d'approbation            le bénéficiaire n'approuve pas sa propre note (la facture ne passe pas
--                                     « validee » de sa main) ;
--   l'écriture                        à la comptabilisation, la dette va au compte du personnel (421 par défaut,
--                                     réglable : filed_regler_compte_notes_frais) au nom du bénéficiaire (compte
--                                     auxiliaire NDF…), pas au fournisseur (401) ; de même pour le remboursement.
--                                     Les écrivains d'a4_27 ne sont pas réécrits : un déclencheur avant insertion
--                                     sur filed_ecritures change le compte de tiers des seules lignes de la note ;
--                                     le lettrage (texte d'a4_17) suit le compte de tiers de la facture ;
--   public.filed_rembourser_note_frais  le remboursement (filed_marquer_reglee), et la note passe « remboursee »
--                                     quand le reste est nul — y compris quand c'est le relevé (a4_34) qui le voit.
-- Migration idempotente ; aucune suppression.

create table if not exists public.filed_notes_frais (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  entite_id       uuid references public.entites(id) on delete cascade,
  facture_id      uuid not null references public.filed_factures(id) on delete cascade,
  document_id     uuid not null references public.filed_documents(id) on delete cascade,
  beneficiaire    uuid not null,
  beneficiaire_nom text not null check (char_length(btrim(beneficiaire_nom)) between 1 and 120),
  -- Le code du compte auxiliaire du bénéficiaire : NDF + 6 caractères stables.
  code_tiers      text not null,
  motif           text,
  statut          text not null default 'a_rembourser' check (statut in ('a_rembourser', 'remboursee', 'refusee')),
  declaree_par    uuid,
  declaree_le     timestamptz not null default now(),
  remboursee_le   date,
  maj_le          timestamptz not null default now()
);
comment on table public.filed_notes_frais is
  'Lot 27 (a4_35) : les pièces avancées par une personne de l''organisation. La dette va au compte du personnel, au nom du bénéficiaire, et se rembourse à lui.';
create unique index if not exists filed_notes_frais_facture on public.filed_notes_frais (facture_id);
create index if not exists filed_notes_frais_beneficiaire on public.filed_notes_frais (client_id, beneficiaire, statut);
alter table public.filed_notes_frais enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_notes_frais' and policyname = 'filed_notes_frais_lecture') then
    execute 'create policy filed_notes_frais_lecture on public.filed_notes_frais for select to authenticated using (exists (select 1 from public.filed_documents d where d.id = document_id) or beneficiaire = (select auth.uid()))';
  end if;
end $$;
revoke all on table public.filed_notes_frais from anon, authenticated;
grant select on public.filed_notes_frais to authenticated;

create table if not exists public.filed_notes_frais_compte (
  client_id  uuid primary key references public.clients(id) on delete cascade,
  numero     text not null check (numero ~ '^[0-9]{3,12}$'),
  libelle    text not null check (char_length(btrim(libelle)) between 1 and 200),
  maj_le     timestamptz not null default now()
);
comment on table public.filed_notes_frais_compte is 'Lot 27 (a4_35) : le compte où vont les notes de frais d''une organisation (421 par défaut).';
alter table public.filed_notes_frais_compte enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_notes_frais_compte' and policyname = 'filed_notes_frais_compte_lecture') then
    execute 'create policy filed_notes_frais_compte_lecture on public.filed_notes_frais_compte for select to authenticated using (client_id in (select private.mes_clients()))';
  end if;
end $$;
revoke all on table public.filed_notes_frais_compte from anon, authenticated;
grant select on public.filed_notes_frais_compte to authenticated;

insert into private.tables_locataires (nom, ordre_effacement, note) values ('filed_notes_frais', 4, 'FILED, lot 27'), ('filed_notes_frais_compte', 30, 'FILED, lot 27')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;
insert into private.tables_objets (nom, objet_type, colonne, ordre_effacement) values ('filed_notes_frais', 'filed_document', 'document_id', 4)
on conflict do nothing;

create or replace function private.filed_compte_notes_frais(p_client uuid, out numero text, out libelle text)
language sql stable security definer set search_path to '' as $$
  select coalesce(c.numero, '421'), coalesce(c.libelle, 'Personnel - rémunérations dues')
    from (select 1) x left join public.filed_notes_frais_compte c on c.client_id = p_client
$$;
revoke all on function private.filed_compte_notes_frais(uuid) from public, anon, authenticated;

-- Le compte de tiers d'une facture : celui du personnel pour une note de frais, sinon celui des fournisseurs.
create or replace function private.filed_compte_tiers(p_facture uuid, out numero text, out libelle text)
language plpgsql stable security definer set search_path to '' as $$
declare v_f public.filed_factures;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if exists (select 1 from public.filed_notes_frais n where n.facture_id = p_facture and n.statut <> 'refusee') then
    select c.numero, c.libelle into numero, libelle from private.filed_compte_notes_frais(v_f.client_id) c;
  else
    select c.numero, c.libelle into numero, libelle from private.filed_compte_systeme(v_f.client_id, 'fournisseurs') c;
  end if;
end $$;
revoke all on function private.filed_compte_tiers(uuid) from public, anon, authenticated;

create or replace function public.filed_regler_compte_notes_frais(p_client uuid, p_numero text, p_libelle text)
returns void language plpgsql security definer set search_path to '' as $$
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin']);
  if p_numero is null or p_numero !~ '^[0-9]{3,12}$' then raise exception 'Numéro de compte : de 3 à 12 chiffres.' using errcode = '22023'; end if;
  if nullif(btrim(p_libelle), '') is null then raise exception 'Le compte a un libellé.' using errcode = '22023'; end if;
  insert into public.filed_notes_frais_compte (client_id, numero, libelle) values (p_client, p_numero, left(btrim(p_libelle), 200))
  on conflict (client_id) do update set numero = excluded.numero, libelle = excluded.libelle, maj_le = now();
  perform private.filed_journaliser(p_client, 'filed.compte_notes_frais', 'filed_compte_systeme', 'notes_frais',
    jsonb_build_object('numero', p_numero, 'libelle', btrim(p_libelle)));
end $$;
comment on function public.filed_regler_compte_notes_frais(uuid, text, text) is 'Règle le compte des notes de frais (421 par défaut ; 4386, 467… selon l''usage du cabinet). Gérant ou admin.';
revoke all on function public.filed_regler_compte_notes_frais(uuid, text, text) from public, anon;
grant execute on function public.filed_regler_compte_notes_frais(uuid, text, text) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- Déclarer
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_declarer_note_frais(p_facture uuid, p_beneficiaire uuid default null, p_nom text default null, p_motif text default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_uid uuid; v_benef uuid; v_nom text; v_id uuid; v_role text;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found then raise exception 'Pièce introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(v_f.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'], v_f.entite_id);
  if v_uid is not null and not private.voit_objet(v_f.client_id, 'filed_document', v_f.document_id::text) then
    raise exception 'Pièce introuvable.' using errcode = 'P0002';
  end if;
  v_benef := coalesce(p_beneficiaire, v_uid);
  if v_benef is null then raise exception 'Dites qui a avancé la dépense.' using errcode = '22023'; end if;
  select c.role into v_role from public.comptes c where c.user_id = v_uid and c.client_id = v_f.client_id;
  if v_uid is not null and v_benef <> v_uid and coalesce(v_role, '') not in ('gerant', 'admin', 'valideur') then
    raise exception 'Vous déclarez vos propres notes de frais ; celles d''un autre, un gérant, un admin ou un valideur.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.comptes c where c.user_id = v_benef and c.client_id = v_f.client_id) then
    raise exception 'Le bénéficiaire n''est pas une personne de l''organisation.' using errcode = '22023';
  end if;
  if v_f.statut in ('comptabilisee', 'refusee', 'ecartee') then
    raise exception 'Cette pièce est % : elle ne devient plus une note de frais.', v_f.statut using errcode = '55000';
  end if;
  if exists (select 1 from public.filed_reglements r where r.facture_id = v_f.id) then
    raise exception 'Un règlement est déjà noté sur cette pièce : elle a été payée au fournisseur.' using errcode = '55000';
  end if;
  v_nom := nullif(btrim(p_nom), '');
  if v_nom is null then
    select split_part(u.email, '@', 1) into v_nom from auth.users u where u.id = v_benef;
  end if;
  insert into public.filed_notes_frais (client_id, entite_id, facture_id, document_id, beneficiaire, beneficiaire_nom, code_tiers, motif, declaree_par)
  values (v_f.client_id, v_f.entite_id, v_f.id, v_f.document_id, v_benef, left(coalesce(v_nom, 'Salarié'), 120),
          'NDF' || upper(left(replace(v_benef::text, '-', ''), 6)), left(nullif(btrim(p_motif), ''), 300), v_uid)
  on conflict (facture_id) do update set beneficiaire = excluded.beneficiaire, beneficiaire_nom = excluded.beneficiaire_nom,
         code_tiers = excluded.code_tiers, motif = excluded.motif, statut = 'a_rembourser', declaree_par = excluded.declaree_par, maj_le = now()
  returning id into v_id;
  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'note_frais',
    format('Note de frais : dépense avancée par %s, à lui rembourser.', left(coalesce(v_nom, 'un salarié'), 120)),
    jsonb_build_object('note', v_id, 'beneficiaire', v_benef));
  perform private.filed_journaliser(v_f.client_id, 'filed.note_frais.declaration', 'filed_facture', v_f.id::text,
    jsonb_build_object('note', v_id, 'beneficiaire', v_benef), v_f.entite_id);
  return v_id;
end $$;
revoke all on function private.filed_declarer_note_frais(uuid, uuid, text, text) from public, anon;
grant execute on function private.filed_declarer_note_frais(uuid, uuid, text, text) to authenticated, service_role;

create or replace function public.filed_declarer_note_frais(p_facture uuid, p_beneficiaire uuid default null, p_nom text default null, p_motif text default null)
returns uuid language sql set search_path to '' as $$ select private.filed_declarer_note_frais(p_facture, p_beneficiaire, p_nom, p_motif) $$;
comment on function public.filed_declarer_note_frais(uuid, uuid, text, text) is
  'Déclare une pièce comme note de frais : la dépense a été avancée par le bénéficiaire (soi-même par défaut ; un autre : gérant, admin, valideur) et se rembourse à lui.';
revoke all on function public.filed_declarer_note_frais(uuid, uuid, text, text) from public, anon;
grant execute on function public.filed_declarer_note_frais(uuid, uuid, text, text) to authenticated, service_role;

-- Le bénéficiaire n'approuve pas sa propre note.
create or replace function private.filed_note_frais_approbation()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if new.statut = 'validee' and old.statut is distinct from 'validee' and v_uid is not null
     and exists (select 1 from public.filed_notes_frais n where n.facture_id = new.id and n.beneficiaire = v_uid and n.statut <> 'refusee') then
    raise exception 'Une note de frais ne s''approuve pas par celui qui a avancé la dépense.' using errcode = '42501';
  end if;
  if new.statut = 'refusee' and old.statut is distinct from 'refusee' then
    update public.filed_notes_frais set statut = 'refusee', maj_le = now() where facture_id = new.id and statut = 'a_rembourser';
  end if;
  return new;
end $$;
revoke all on function private.filed_note_frais_approbation() from public, anon, authenticated;
create or replace trigger filed_factures_note_frais
  before update of statut on public.filed_factures
  for each row execute function private.filed_note_frais_approbation();

-- ───────────────────────────────────────────────────────────────────────────
-- L'écriture : le tiers d'une note de frais est le bénéficiaire, au compte du personnel
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_ecriture_note_frais()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_n public.filed_notes_frais; v_401 record; v_c record;
begin
  if new.facture_id is null or new.origine not in ('facture', 'reglement') then return new; end if;
  select * into v_n from public.filed_notes_frais where facture_id = new.facture_id and statut <> 'refusee';
  if not found then return new; end if;
  select * into v_401 from private.filed_compte_systeme(new.client_id, 'fournisseurs');
  if new.compte_num <> v_401.numero then return new; end if;
  select * into v_c from private.filed_compte_notes_frais(new.client_id);
  new.compte_num := v_c.numero;
  new.compte_lib := left(v_c.libelle, 200);
  new.comp_aux_num := v_n.code_tiers;
  new.comp_aux_lib := left(v_n.beneficiaire_nom, 200);
  new.ecriture_lib := left(regexp_replace(new.ecriture_lib, '^(Facture|Avoir|Règlement)', '\1 (note de frais ' || v_n.beneficiaire_nom || ')'), 200);
  return new;
end $$;
revoke all on function private.filed_ecriture_note_frais() from public, anon, authenticated;
create or replace trigger filed_ecritures_note_frais
  before insert on public.filed_ecritures
  for each row execute function private.filed_ecriture_note_frais();

-- Le lettrage (texte d'a4_17) suit le compte de tiers de la facture.
create or replace function private.filed_lettrer_facture(p_facture uuid)
returns text language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_c record; v_d numeric; v_k numeric; v_code text; v_n integer;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  select * into v_c from private.filed_compte_tiers(p_facture);
  select coalesce(sum(e.debit), 0), coalesce(sum(e.credit), 0) into v_d, v_k from public.filed_ecritures e
   where e.facture_id = p_facture and e.compte_num = v_c.numero and e.ecriture_let is null;
  if v_d = 0 or v_k = 0 or v_d <> v_k then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended('filed_lettrage|' || v_f.client_id::text, 0));
  select coalesce(max(substring(e.ecriture_let from 2)::integer), 0) + 1 into v_n from public.filed_ecritures e
   where e.client_id = v_f.client_id and e.ecriture_let ~ '^L[0-9]{1,9}$';
  v_code := 'L' || lpad(v_n::text, 6, '0');
  update public.filed_ecritures e set ecriture_let = v_code, date_let = current_date
   where e.facture_id = p_facture and e.compte_num = v_c.numero and e.ecriture_let is null;
  return v_code;
end $$;
revoke all on function private.filed_lettrer_facture(uuid) from public, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- Rembourser
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_rembourser_note_frais(p_note uuid, p_le date default null, p_mode text default 'virement', p_reference text default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_n public.filed_notes_frais; v_uid uuid;
begin
  select * into v_n from public.filed_notes_frais where id = p_note;
  if not found then raise exception 'Note de frais introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(v_n.client_id, array['gerant', 'admin', 'valideur'], v_n.entite_id);
  if v_uid is not null and v_uid = v_n.beneficiaire then
    raise exception 'On ne se rembourse pas soi-même.' using errcode = '42501';
  end if;
  if v_n.statut <> 'a_rembourser' then raise exception 'Cette note de frais est %.', v_n.statut using errcode = '55000'; end if;
  return private.filed_marquer_reglee(v_n.facture_id, coalesce(p_le, current_date), null, coalesce(p_mode, 'virement'),
                                      coalesce(p_reference, 'NDF ' || v_n.beneficiaire_nom));
end $$;
revoke all on function private.filed_rembourser_note_frais(uuid, date, text, text) from public, anon;
grant execute on function private.filed_rembourser_note_frais(uuid, date, text, text) to authenticated, service_role;

create or replace function public.filed_rembourser_note_frais(p_note uuid, p_le date default null, p_mode text default 'virement', p_reference text default null)
returns uuid language sql set search_path to '' as $$ select private.filed_rembourser_note_frais(p_note, p_le, p_mode, p_reference) $$;
comment on function public.filed_rembourser_note_frais(uuid, date, text, text) is
  'Note le remboursement d''une note de frais approuvée (le reste à payer, au bénéficiaire). Gérant, admin, valideur ; jamais le bénéficiaire.';
revoke all on function public.filed_rembourser_note_frais(uuid, date, text, text) from public, anon;
grant execute on function public.filed_rembourser_note_frais(uuid, date, text, text) to authenticated, service_role;

-- Tout règlement d'une note (remboursement, relevé, saisie) : remboursée quand le reste est nul.
create or replace function private.filed_note_frais_reglee()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_reste numeric;
begin
  if not exists (select 1 from public.filed_notes_frais n where n.facture_id = new.facture_id and n.statut = 'a_rembourser') then return null; end if;
  select * into v_f from public.filed_factures where id = new.facture_id;
  v_reste := coalesce(v_f.net_a_payer, v_f.montant_ttc) - coalesce((select sum(r.montant) from public.filed_reglements r where r.facture_id = v_f.id), 0);
  if v_reste <= 0 then
    update public.filed_notes_frais set statut = 'remboursee', remboursee_le = new.regle_le, maj_le = now()
     where facture_id = new.facture_id and statut = 'a_rembourser';
    perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'note_frais_remboursee',
      format('Note de frais remboursée le %s.', to_char(new.regle_le, 'DD/MM/YYYY')), jsonb_build_object('reglement', new.id));
  end if;
  return null;
end $$;
revoke all on function private.filed_note_frais_reglee() from public, anon, authenticated;
create or replace trigger filed_reglements_note_frais
  after insert on public.filed_reglements
  for each row execute function private.filed_note_frais_reglee();
