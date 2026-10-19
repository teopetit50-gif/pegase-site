-- b6_37 — DALIRO : les documents de chantier (PV de réserves, plans, notes techniques) reçus par Daliro
-- (session B6, 19/10/2026 ; décision de Teo : « les documents de chantier vont à Daliro »).
--
-- LE CONSTAT : six photos NOBAT réelles sont lues sur la recette (banc) : un PV de réserves OPR, un cartouche de plans,
-- trois plans de structure cotés, une note de dispositions parasismiques. FILED les laisse en type « autre », « à
-- classer », sans champ : rien ne les porte vers le chantier.
--
-- LA PROMESSE (/secteurs/btp) : les travaux absents du marché, l'accord écrit avant que l'ouvrage soit refermé, les
-- reprises demandées à la réception. Un PV de réserves fait des réserves à lever, avec leur échéance ; les plans et
-- les notes techniques sont les références du marché.
--
-- CE QUI EST POSÉ.
--   · public.btp_documents : un document de chantier reçu par Daliro (une pièce du socle, quel que soit son module) ;
--     sous-type pv_reserves | plan | note_technique ; rattaché à un chantier, ou « à rattacher ».
--   · public.btp_reserves_a_lever : chaque réserve lue dans un PV, avec son numéro, sa localisation, son lot, son
--     entreprise et son échéance. L'échéance est celle écrite sur le PV. Sinon, et seulement si le PV écrit une date
--     et un délai en jours, elle est la date + le délai (« calculee »). Sinon elle est absente.
--   · public.btp_references_marche : les plans (titre, numéro, indice, date, échelle) et les notes techniques, avec
--     leurs dispositions, rattachés au marché du chantier (le marché vérifié le plus récent, sinon le plus récent).
--   · RÈGLE : chaque élément porte sa pièce et sa page, et sa vérification par le lecteur (« verifiee »). Un champ que
--     le lecteur n'a pas rendu reste absent. Rien ne vient du nom du fichier ni d'une supposition.
--   · private.btp_integrer_document(piece) : le serveur reçoit une pièce typée chantier_* (types demandés au lecteur,
--     voir DEMANDE-SOCLE-documents-chantier.md). Il rattache le document au chantier SEULEMENT si un seul chantier
--     du client correspond (maître d'ouvrage ou nom). Sinon, il reste « à rattacher ».
--   · Le travail daliro.document (déposé par FILED, voir la demande) est pris par l'ouvrier btp_ouvrier.
--   · Portes du bureau : btp_prendre_document(piece, sous_type, chantier) prend en main une pièce restée « à classer »
--     (sans champ : le document est rangé, rien n'est tiré) ; btp_rattacher_document(document, chantier) ;
--     btp_lever_reserve_lue(reserve, le) ; lecture btp_documents_chantier(chantier).
--
-- Règles de pose : create or replace ; rien n'est retiré ni effacé. Après b6_01 → b6_36b.

-- ─── Tables ─────────────────────────────────────────────────────────────
create table if not exists public.btp_documents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  piece_id uuid not null,
  chantier_id uuid,
  sous_type text not null,
  classe_par text not null,
  statut text not null default 'a_rattacher',
  titre text,
  numero text,
  indice text,
  date_document date,
  maitre_ouvrage text,
  motif text,
  rattache_le timestamptz,
  rattache_par uuid,
  extrait_le timestamptz,
  cree_le timestamptz not null default now(),
  constraint btp_documents_client_id_id_key unique (client_id, id),
  constraint btp_documents_piece_key unique (client_id, piece_id),
  constraint btp_documents_piece_fkey foreign key (client_id, piece_id) references public.pieces(client_id, id) on delete cascade,
  constraint btp_documents_chantier_fkey foreign key (client_id, chantier_id) references public.btp_chantiers(client_id, id) on delete set null (chantier_id),
  constraint btp_documents_sous_type_check check (sous_type in ('pv_reserves', 'plan', 'note_technique')),
  constraint btp_documents_classe_par_check check (classe_par in ('lecteur', 'humain')),
  constraint btp_documents_statut_check check (statut in ('a_rattacher', 'rattache')),
  constraint btp_documents_rattache_check check ((statut = 'rattache') = (chantier_id is not null)),
  constraint btp_documents_textes_check check (char_length(titre) <= 300 and char_length(numero) <= 60 and char_length(indice) <= 20
                                               and char_length(maitre_ouvrage) <= 200 and char_length(motif) <= 500)
);
create index if not exists btp_documents_chantier_idx on public.btp_documents (chantier_id, cree_le desc);
create index if not exists btp_documents_a_rattacher_idx on public.btp_documents (client_id, cree_le desc) where statut = 'a_rattacher';

create table if not exists public.btp_reserves_a_lever (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  chantier_id uuid not null,
  entite_id uuid,
  document_id uuid not null,
  piece_id uuid not null,
  page integer,
  ordre integer not null,
  numero text,
  localisation text,
  lot_texte text,
  lot_id uuid,
  entreprise text,
  description text not null,
  delai_texte text,
  echeance date,
  echeance_source text,
  verifiee boolean not null default false,
  statut text not null default 'a_lever',
  levee_le date,
  levee_par uuid,
  cree_le timestamptz not null default now(),
  constraint btp_reserves_a_lever_client_id_id_key unique (client_id, id),
  constraint btp_reserves_a_lever_ordre_key unique (document_id, ordre),
  constraint btp_reserves_a_lever_document_fkey foreign key (client_id, document_id) references public.btp_documents(client_id, id) on delete cascade,
  constraint btp_reserves_a_lever_chantier_fkey foreign key (client_id, chantier_id) references public.btp_chantiers(client_id, id) on delete cascade,
  constraint btp_reserves_a_lever_statut_check check (statut in ('a_lever', 'levee')),
  constraint btp_reserves_a_lever_levee_check check ((statut = 'levee') = (levee_le is not null)),
  constraint btp_reserves_a_lever_echeance_check check ((echeance is null) = (echeance_source is null) and echeance_source in ('ecrite', 'calculee')),
  constraint btp_reserves_a_lever_page_check check (page >= 1),
  constraint btp_reserves_a_lever_textes_check check (char_length(btrim(description)) between 1 and 1000 and char_length(numero) <= 30
                                                      and char_length(localisation) <= 200 and char_length(lot_texte) <= 120
                                                      and char_length(entreprise) <= 200 and char_length(delai_texte) <= 120)
);
create index if not exists btp_reserves_a_lever_chantier_idx on public.btp_reserves_a_lever (chantier_id, statut, echeance);

create table if not exists public.btp_references_marche (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  chantier_id uuid not null,
  marche_id uuid,
  entite_id uuid,
  document_id uuid not null,
  piece_id uuid not null,
  page integer,
  ordre integer not null,
  nature text not null,
  titre text,
  numero text,
  indice text,
  date_document date,
  echelle text,
  texte text,
  reference_normative text,
  verifiee boolean not null default false,
  cree_le timestamptz not null default now(),
  constraint btp_references_marche_ordre_key unique (document_id, ordre),
  constraint btp_references_marche_document_fkey foreign key (client_id, document_id) references public.btp_documents(client_id, id) on delete cascade,
  constraint btp_references_marche_chantier_fkey foreign key (client_id, chantier_id) references public.btp_chantiers(client_id, id) on delete cascade,
  constraint btp_references_marche_nature_check check (nature in ('plan', 'note_technique', 'disposition')),
  constraint btp_references_marche_page_check check (page >= 1),
  constraint btp_references_marche_textes_check check (char_length(titre) <= 300 and char_length(numero) <= 60 and char_length(indice) <= 20
                                                       and char_length(echelle) <= 30 and char_length(texte) <= 2000
                                                       and char_length(reference_normative) <= 200)
);
create index if not exists btp_references_marche_chantier_idx on public.btp_references_marche (chantier_id, nature, ordre);

alter table public.btp_documents enable row level security;
alter table public.btp_reserves_a_lever enable row level security;
alter table public.btp_references_marche enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_documents' and policyname = 'membres lisent les documents de chantier') then
    create policy "membres lisent les documents de chantier" on public.btp_documents
      for select to authenticated using (client_id in (select private.mes_clients()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_reserves_a_lever' and policyname = 'membres lisent les reserves a lever') then
    create policy "membres lisent les reserves a lever" on public.btp_reserves_a_lever
      for select to authenticated using (client_id in (select private.mes_clients()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_references_marche' and policyname = 'membres lisent les references du marche') then
    create policy "membres lisent les references du marche" on public.btp_references_marche
      for select to authenticated using (client_id in (select private.mes_clients()));
  end if;
end $do$;
revoke all on table public.btp_documents, public.btp_reserves_a_lever, public.btp_references_marche from anon, authenticated;
grant select on table public.btp_documents, public.btp_reserves_a_lever, public.btp_references_marche to authenticated;
grant all on table public.btp_documents, public.btp_reserves_a_lever, public.btp_references_marche to service_role;
do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select x from unnest(array['btp_documents', 'btp_reserves_a_lever', 'btp_references_marche']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;

-- ─── Lire une valeur rendue par le lecteur, telle quelle ─────────────────
-- {valeur, page, verifiee} de la valeur la plus récente du champ ; null si le lecteur ne l'a pas rendue.
create or replace function private.btp_valeur_lue(p_piece uuid, p_champ text)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select jsonb_build_object('valeur', v.valeur, 'page', v.page, 'verifiee', v.verifiee)
  from public.pieces_valeurs v
  where v.piece_id = p_piece and v.champ = p_champ and v.chiffre is null and v.valeur is not null and v.valeur <> 'null'::jsonb
  order by v.cree_le desc, v.id desc
  limit 1
$function$;

-- Le texte d'une valeur (chaîne, ou nombre écrit), borné ; null si absente ou vide.
create or replace function private.btp_texte_lu(p_v jsonb, p_max integer)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select nullif(left(btrim(case jsonb_typeof(p_v) when 'string' then p_v #>> '{}' when 'number' then p_v #>> '{}' end), p_max), '')
$function$;

-- Une date ISO (AAAA-MM-JJ) telle que le lecteur la rend ; null sinon (jamais devinée).
create or replace function private.btp_date_lue(p_v jsonb)
 returns date
 language plpgsql
 immutable
 set search_path to ''
as $function$
begin
  if jsonb_typeof(p_v) = 'string' and (p_v #>> '{}') ~ '^\d{4}-\d{2}-\d{2}$' then
    return (p_v #>> '{}')::date;
  end if;
  return null;
exception when others then
  return null;
end $function$;

create or replace function private.btp_sous_type_de(p_type_piece text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case p_type_piece when 'chantier_pv_reserves' then 'pv_reserves' when 'chantier_plan' then 'plan'
                           when 'chantier_note_technique' then 'note_technique' end
$function$;

create or replace function private.btp_normaliser_nom(p text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select nullif(btrim(regexp_replace(translate(lower(coalesce(p, '')), 'àâäáãéèêëíìîïóòôöõúùûüçñ''’', 'aaaaaeeeeiiiiooooouuuucn  '),
                                     '[^a-z0-9]+', ' ', 'g')), '')
$function$;

-- Le seul chantier du client qui correspond au document (maître d'ouvrage ou nom), sinon null.
create or replace function private.btp_chantier_du_document(p_client uuid, p_maitre_ouvrage text, p_titre text)
 returns uuid
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_mo text := private.btp_normaliser_nom(p_maitre_ouvrage);
  v_titre text := private.btp_normaliser_nom(p_titre);
  v_ids uuid[];
begin
  if v_mo is null and v_titre is null then
    return null;
  end if;
  select array_agg(distinct c.id) into v_ids
  from public.btp_chantiers c
  left join public.btp_tiers t on t.id = c.maitre_ouvrage_id
  where c.client_id = p_client and c.statut not in ('clos', 'annule')
    and ((v_mo is not null and char_length(private.btp_normaliser_nom(t.nom)) >= 4
          and (position(private.btp_normaliser_nom(t.nom) in v_mo) > 0 or position(v_mo in private.btp_normaliser_nom(t.nom)) > 0))
      or (v_titre is not null and char_length(private.btp_normaliser_nom(c.nom)) >= 6 and position(private.btp_normaliser_nom(c.nom) in v_titre) > 0));
  return case when cardinality(v_ids) = 1 then v_ids[1] end;
end $function$;

-- ─── Tirer les éléments d'un document rattaché (une seule fois) ─────────
create or replace function private.btp_extraire_document(p_document uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.btp_documents;
  v_marche uuid;
  v_date jsonb;
  v_liste jsonb;
  v_item jsonb;
  v_ordre integer := 0;
  v_n integer := 0;
  v_ech date;
  v_src text;
  v_delai text;
  v_jours integer;
  v_nb_pages integer;
  v_lot uuid;
  v_titre jsonb;
begin
  select * into d from public.btp_documents where id = p_document for update;
  if not found or d.chantier_id is null then
    return jsonb_build_object('extrait', 0, 'motif', 'document sans chantier');
  end if;
  if d.extrait_le is not null then
    return jsonb_build_object('extrait', 0, 'motif', 'déjà tiré');
  end if;
  select p.nb_pages into v_nb_pages from public.pieces p where p.id = d.piece_id;

  if d.sous_type = 'pv_reserves' then
    v_date := private.btp_valeur_lue(d.piece_id, 'date_pv');
    v_liste := private.btp_valeur_lue(d.piece_id, 'reserves');
    if v_liste is not null and jsonb_typeof(v_liste -> 'valeur') = 'array' then
      for v_item in select x from jsonb_array_elements(v_liste -> 'valeur') x loop
        continue when jsonb_typeof(v_item) <> 'object' or private.btp_texte_lu(v_item -> 'description', 1000) is null;
        v_ordre := v_ordre + 1;
        v_ech := private.btp_date_lue(v_item -> 'echeance');
        v_src := case when v_ech is not null then 'ecrite' end;
        v_delai := private.btp_texte_lu(v_item -> 'delai', 120);
        if v_ech is null and v_delai is not null and private.btp_date_lue(v_date -> 'valeur') is not null then
          v_jours := (substring(v_delai from '^\s*(\d{1,3})\s*(?:j|jours?)\y'))::integer;
          if v_jours is not null then
            v_ech := private.btp_date_lue(v_date -> 'valeur') + v_jours;
            v_src := 'calculee';
          end if;
        end if;
        select l.id into v_lot from public.btp_lots l
         where l.chantier_id = d.chantier_id and l.code = private.btp_texte_lu(v_item -> 'lot', 120) limit 1;
        insert into public.btp_reserves_a_lever (client_id, chantier_id, entite_id, document_id, piece_id, page, ordre, numero, localisation,
                                                 lot_texte, lot_id, entreprise, description, delai_texte, echeance, echeance_source, verifiee)
        values (d.client_id, d.chantier_id, d.entite_id, d.id, d.piece_id,
                case when (v_item ->> 'page') ~ '^[1-9][0-9]{0,3}$' then (v_item ->> 'page')::integer
                     when v_nb_pages = 1 then 1 else (v_liste ->> 'page')::integer end,
                v_ordre, private.btp_texte_lu(v_item -> 'numero', 30), private.btp_texte_lu(v_item -> 'localisation', 200),
                private.btp_texte_lu(v_item -> 'lot', 120), v_lot, private.btp_texte_lu(v_item -> 'entreprise', 200),
                private.btp_texte_lu(v_item -> 'description', 1000), v_delai, v_ech, v_src,
                coalesce((v_liste ->> 'verifiee')::boolean, false));
        v_n := v_n + 1;
        v_lot := null;
      end loop;
    end if;
  else
    select m.id into v_marche from public.btp_marches m where m.chantier_id = d.chantier_id
     order by m.statut = 'verifie' desc, m.verifie_le desc nulls last, m.cree_le desc limit 1;
    v_titre := private.btp_valeur_lue(d.piece_id, 'titre');
    v_ordre := 1;
    insert into public.btp_references_marche (client_id, chantier_id, marche_id, entite_id, document_id, piece_id, page, ordre, nature,
                                              titre, numero, indice, date_document, echelle, verifiee)
    values (d.client_id, d.chantier_id, v_marche, d.entite_id, d.id, d.piece_id,
            coalesce((v_titre ->> 'page')::integer, case when v_nb_pages = 1 then 1 end), 1, d.sous_type,
            d.titre, d.numero, d.indice, d.date_document,
            private.btp_texte_lu(private.btp_valeur_lue(d.piece_id, 'echelle') -> 'valeur', 30),
            coalesce((v_titre ->> 'verifiee')::boolean, false));
    v_n := 1;
    if d.sous_type = 'note_technique' then
      v_liste := private.btp_valeur_lue(d.piece_id, 'dispositions');
      if v_liste is not null and jsonb_typeof(v_liste -> 'valeur') = 'array' then
        for v_item in select x from jsonb_array_elements(v_liste -> 'valeur') x loop
          continue when jsonb_typeof(v_item) <> 'object' or private.btp_texte_lu(v_item -> 'texte', 2000) is null;
          v_ordre := v_ordre + 1;
          insert into public.btp_references_marche (client_id, chantier_id, marche_id, entite_id, document_id, piece_id, page, ordre, nature,
                                                    texte, reference_normative, verifiee)
          values (d.client_id, d.chantier_id, v_marche, d.entite_id, d.id, d.piece_id,
                  case when (v_item ->> 'page') ~ '^[1-9][0-9]{0,3}$' then (v_item ->> 'page')::integer
                       when v_nb_pages = 1 then 1 else (v_liste ->> 'page')::integer end,
                  v_ordre, 'disposition', private.btp_texte_lu(v_item -> 'texte', 2000),
                  private.btp_texte_lu(v_item -> 'reference', 200), coalesce((v_liste ->> 'verifiee')::boolean, false));
          v_n := v_n + 1;
        end loop;
      end if;
    end if;
  end if;

  update public.btp_documents set extrait_le = now() where id = d.id;
  perform private.journaliser(d.client_id, 'daliro.document_extrait', 'btp_documents', d.id::text,
    jsonb_build_object('piece', d.piece_id, 'chantier', d.chantier_id, 'sous_type', d.sous_type, 'elements', v_n), d.entite_id);
  return jsonb_build_object('extrait', v_n, 'sous_type', d.sous_type);
end $function$;

-- Créer (ou retrouver) le document d'une pièce, avec les champs d'en-tête lus ; jamais deux documents par pièce.
create or replace function private.btp_document_de_piece(p_piece uuid, p_sous_type text, p_classe_par text)
 returns public.btp_documents
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  p public.pieces;
  d public.btp_documents;
  v_titre_champ text := case p_sous_type when 'pv_reserves' then 'operation' else 'titre' end;
begin
  select * into p from public.pieces where id = p_piece;
  if not found then
    raise exception 'Pièce introuvable.' using errcode = 'P0002';
  end if;
  insert into public.btp_documents (client_id, piece_id, sous_type, classe_par, titre, numero, indice, date_document, maitre_ouvrage)
  values (p.client_id, p.id, p_sous_type, p_classe_par,
          private.btp_texte_lu(private.btp_valeur_lue(p.id, v_titre_champ) -> 'valeur', 300),
          private.btp_texte_lu(private.btp_valeur_lue(p.id, 'numero_plan') -> 'valeur', 60),
          private.btp_texte_lu(private.btp_valeur_lue(p.id, 'indice') -> 'valeur', 20),
          private.btp_date_lue(private.btp_valeur_lue(p.id, case p_sous_type when 'pv_reserves' then 'date_pv' else 'date' end) -> 'valeur'),
          private.btp_texte_lu(private.btp_valeur_lue(p.id, 'maitre_ouvrage') -> 'valeur', 200))
  on conflict (client_id, piece_id) do nothing
  returning * into d;
  if d.id is null then
    select * into d from public.btp_documents x where x.client_id = p.client_id and x.piece_id = p.id;
  end if;
  return d;
end $function$;

create or replace function private.btp_rattacher(d public.btp_documents, p_chantier uuid, p_par uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
begin
  select * into c from public.btp_chantiers where id = p_chantier and client_id = d.client_id;
  if not found then
    raise exception 'Chantier introuvable pour ce client.' using errcode = 'P0002';
  end if;
  if d.chantier_id is not null and d.chantier_id <> c.id then
    raise exception 'Ce document est déjà rattaché à un autre chantier.' using errcode = '23514';
  end if;
  update public.btp_documents set chantier_id = c.id, entite_id = c.entite_id, statut = 'rattache',
                                  rattache_le = coalesce(rattache_le, now()), rattache_par = coalesce(rattache_par, p_par)
   where id = d.id;
  perform private.journaliser(d.client_id, 'daliro.document_rattache', 'btp_documents', d.id::text,
    jsonb_build_object('piece', d.piece_id, 'chantier', c.id, 'sous_type', d.sous_type, 'par', coalesce(p_par::text, 'serveur')), c.entite_id);
  return private.btp_extraire_document(d.id) || jsonb_build_object('document', d.id, 'chantier', c.id);
end $function$;

-- ─── Le serveur reçoit une pièce typée « document de chantier » ─────────
create or replace function private.btp_integrer_document(p_piece uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  p public.pieces;
  d public.btp_documents;
  v_sous text;
  v_ch uuid;
begin
  select * into p from public.pieces where id = p_piece;
  if not found then
    return jsonb_build_object('ignore', 'pièce introuvable');
  end if;
  v_sous := private.btp_sous_type_de(p.type_piece);
  if v_sous is null then
    return jsonb_build_object('ignore', format('type %s : pas un document de chantier', coalesce(p.type_piece, 'absent')));
  end if;
  if p.statut not in ('lue', 'a_verifier') then
    return jsonb_build_object('ignore', 'pièce pas encore lue (' || p.statut || ')');
  end if;
  if not exists (select 1 from public.btp_reglages r where r.client_id = p.client_id) then
    return jsonb_build_object('ignore', 'Daliro n''est pas installé chez ce client');
  end if;
  d := private.btp_document_de_piece(p.id, v_sous, 'lecteur');
  if d.chantier_id is not null then
    return jsonb_build_object('document', d.id, 'deja', true);
  end if;
  v_ch := private.btp_chantier_du_document(p.client_id, d.maitre_ouvrage, d.titre);
  if v_ch is null then
    update public.btp_documents set motif = 'Aucun chantier, ou plusieurs, ne correspondent : à rattacher par le bureau.' where id = d.id;
    perform private.journaliser(p.client_id, 'daliro.document_recu', 'btp_documents', d.id::text,
      jsonb_build_object('piece', p.id, 'sous_type', v_sous, 'statut', 'a_rattacher'), null);
    return jsonb_build_object('document', d.id, 'statut', 'a_rattacher');
  end if;
  return private.btp_rattacher(d, v_ch, null);
end $function$;

-- ─── Portes du bureau ───────────────────────────────────────────────────
-- Une pièce que personne n'a typée (« à classer » chez FILED) : une personne dit que c'est un document de chantier
-- et de quel chantier. Rien n'est tiré de plus que ce que le lecteur a rendu.
create or replace function public.btp_prendre_document(p_piece uuid, p_sous_type text, p_chantier uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  p public.pieces;
  c public.btp_chantiers;
  d public.btp_documents;
begin
  select * into p from public.pieces where id = p_piece;
  if not found then
    raise exception 'Pièce introuvable.' using errcode = 'P0002';
  end if;
  select * into c from public.btp_chantiers where id = p_chantier and client_id = p.client_id;
  if not found then
    raise exception 'Chantier introuvable pour ce client.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_planning(c.client_id, c.entite_id);
  if p_sous_type not in ('pv_reserves', 'plan', 'note_technique') then
    raise exception 'Sous-type attendu : pv_reserves, plan ou note_technique.' using errcode = '22023';
  end if;
  if p.statut not in ('lue', 'a_verifier', 'a_classer') then
    raise exception 'La pièce n''est pas lue (%).', p.statut using errcode = '23514';
  end if;
  select * into d from public.btp_documents where client_id = p.client_id and piece_id = p.id;
  if d.id is not null and d.sous_type <> p_sous_type then
    raise exception 'Cette pièce est déjà un document « % ».', d.sous_type using errcode = '23514';
  end if;
  d := private.btp_document_de_piece(p.id, p_sous_type, 'humain');
  return private.btp_rattacher(d, c.id, (select auth.uid()));
end $function$;

create or replace function public.btp_rattacher_document(p_document uuid, p_chantier uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.btp_documents;
  c public.btp_chantiers;
begin
  select * into d from public.btp_documents where id = p_document;
  if not found then
    raise exception 'Document introuvable.' using errcode = 'P0002';
  end if;
  select * into c from public.btp_chantiers where id = p_chantier and client_id = d.client_id;
  if not found then
    raise exception 'Chantier introuvable pour ce client.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_planning(c.client_id, c.entite_id);
  return private.btp_rattacher(d, c.id, (select auth.uid()));
end $function$;

create or replace function public.btp_lever_reserve_lue(p_reserve uuid, p_le date default null)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.btp_reserves_a_lever;
begin
  select * into r from public.btp_reserves_a_lever where id = p_reserve for update;
  if not found then
    raise exception 'Réserve introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_planning(r.client_id, (select c.entite_id from public.btp_chantiers c where c.id = r.chantier_id));
  if r.statut = 'levee' then
    return;
  end if;
  update public.btp_reserves_a_lever set statut = 'levee', levee_le = coalesce(p_le, current_date), levee_par = (select auth.uid())
   where id = r.id;
  perform private.journaliser(r.client_id, 'daliro.reserve_lue_levee', 'btp_reserves_a_lever', r.id::text,
    jsonb_build_object('document', r.document_id, 'piece', r.piece_id, 'page', r.page, 'le', coalesce(p_le, current_date)), r.entite_id);
end $function$;

-- Les documents du chantier, leurs réserves à lever et leurs références, chacun avec sa pièce et sa page.
create or replace function public.btp_documents_chantier(p_chantier uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
begin
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.comptes k where k.client_id = c.client_id and k.user_id = (select auth.uid()))
     and not private.btp_est_serveur() then
    raise exception 'Ce chantier ne vous est pas ouvert.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'documents', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'piece', d.piece_id, 'sous_type', d.sous_type, 'classe_par', d.classe_par,
                     'titre', d.titre, 'numero', d.numero, 'indice', d.indice, 'date', d.date_document, 'maitre_ouvrage', d.maitre_ouvrage,
                     'nom_fichier', (select p.nom_fichier from public.pieces p where p.id = d.piece_id), 'rattache_le', d.rattache_le)
                   order by d.date_document desc nulls last, d.cree_le desc), '[]'::jsonb)
                  from public.btp_documents d where d.chantier_id = c.id),
    'reserves', (select coalesce(jsonb_agg(to_jsonb(r) - 'client_id' - 'entite_id' order by r.statut, r.echeance nulls last, r.ordre), '[]'::jsonb)
                 from public.btp_reserves_a_lever r where r.chantier_id = c.id),
    'references', (select coalesce(jsonb_agg(to_jsonb(x) - 'client_id' - 'entite_id' order by x.document_id, x.ordre), '[]'::jsonb)
                   from public.btp_references_marche x where x.chantier_id = c.id));
end $function$;

-- ─── L'ouvrier prend aussi les travaux daliro.document (déposés par FILED) ──
create or replace function private.btp_ouvrier(p_nombre integer default 20)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t public.travaux;
  v_res jsonb;
  v_rang jsonb;
  v_lecture bigint;
  v_faits integer := 0;
  v_rendus integer := 0;
  v_ignores integer := 0;
begin
  for t in
    select * from private.prendre_travaux(array['daliro.confirmation', 'daliro.reception', 'daliro.decalage', 'daliro.document'], p_nombre, interval '5 minutes', 'daliro-base')
  loop
    begin
      v_rang := null;
      if t.genre = 'daliro.confirmation' then
        v_res := private.btp_envoyer_demande(t);
      elsif t.genre = 'daliro.decalage' then
        v_res := private.btp_envoyer_decalage(t);
      elsif t.genre = 'daliro.document' then
        v_res := case when (t.charge ->> 'piece') ~ '^[0-9a-f-]{36}$' then private.btp_integrer_document((t.charge ->> 'piece')::uuid)
                      else jsonb_build_object('ignore', 'travail sans pièce') end;
      else
        v_res := case when (t.charge ->> 'reception') ~ '^[0-9]+$' and t.charge ->> 'en_reponse_a' is not null
                      then private.btp_lire_reponse((t.charge ->> 'reception')::bigint)
                      else jsonb_build_object('ignore', 'ne répond à aucun envoi') end;
        if (t.charge ->> 'reception') ~ '^[0-9]+$' then
          v_rang := private.btp_ranger_reception((t.charge ->> 'reception')::bigint);
          if v_rang ? 'message' then
            v_lecture := private.btp_demander_lecture((v_rang ->> 'message')::uuid);
            if v_lecture is not null then
              v_rang := v_rang || jsonb_build_object('lecture', v_lecture);
            end if;
          end if;
          v_res := v_res || jsonb_build_object('fil', v_rang);
        end if;
      end if;
      perform private.finir_travail(t.id, v_res);
      if v_res ? 'ignore' and not coalesce(v_rang ? 'message', false) then v_ignores := v_ignores + 1; else v_faits := v_faits + 1; end if;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 300), true);
      v_rendus := v_rendus + 1;
    end;
  end loop;
  begin
    perform private.battre_ouvrier('daliro', array['daliro.confirmation', 'daliro.reception', 'daliro.decalage', 'daliro.document'],
      jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'ignores', v_ignores), interval '15 minutes');
  exception when others then
    raise notice 'battre_ouvrier : %', sqlerrm;
  end;
  return jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'ignores', v_ignores);
end $function$;

-- ─── Droits ─────────────────────────────────────────────────────────────
revoke execute on function private.btp_valeur_lue(uuid, text) from public, anon, authenticated;
revoke execute on function private.btp_texte_lu(jsonb, integer) from public, anon, authenticated;
revoke execute on function private.btp_date_lue(jsonb) from public, anon, authenticated;
revoke execute on function private.btp_sous_type_de(text) from public, anon, authenticated;
revoke execute on function private.btp_normaliser_nom(text) from public, anon, authenticated;
revoke execute on function private.btp_chantier_du_document(uuid, text, text) from public, anon, authenticated;
revoke execute on function private.btp_extraire_document(uuid) from public, anon, authenticated;
revoke execute on function private.btp_document_de_piece(uuid, text, text) from public, anon, authenticated;
revoke execute on function private.btp_rattacher(public.btp_documents, uuid, uuid) from public, anon, authenticated;
revoke execute on function private.btp_integrer_document(uuid) from public, anon, authenticated;
grant execute on function private.btp_valeur_lue(uuid, text) to service_role;
grant execute on function private.btp_texte_lu(jsonb, integer) to service_role;
grant execute on function private.btp_date_lue(jsonb) to service_role;
grant execute on function private.btp_sous_type_de(text) to service_role;
grant execute on function private.btp_normaliser_nom(text) to service_role;
grant execute on function private.btp_chantier_du_document(uuid, text, text) to service_role;
grant execute on function private.btp_extraire_document(uuid) to service_role;
grant execute on function private.btp_document_de_piece(uuid, text, text) to service_role;
grant execute on function private.btp_rattacher(public.btp_documents, uuid, uuid) to service_role;
grant execute on function private.btp_integrer_document(uuid) to service_role;

revoke execute on function public.btp_prendre_document(uuid, text, uuid) from public, anon;
revoke execute on function public.btp_rattacher_document(uuid, uuid) from public, anon;
revoke execute on function public.btp_lever_reserve_lue(uuid, date) from public, anon;
revoke execute on function public.btp_documents_chantier(uuid) from public, anon;
grant execute on function public.btp_prendre_document(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.btp_rattacher_document(uuid, uuid) to authenticated, service_role;
grant execute on function public.btp_lever_reserve_lue(uuid, date) to authenticated, service_role;
grant execute on function public.btp_documents_chantier(uuid) to authenticated, service_role;
