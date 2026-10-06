-- FILED, lot 9 (a4_16) — la facture électronique reçue : elle fait foi, et son cycle de vie est prêt à repartir.
--
-- Cadre (vérifié le 06/10/2026 sur impots.gouv.fr, voir NOTES-A4 § « PA ») : depuis le 1er septembre 2026, toute
-- entreprise assujettie doit pouvoir RECEVOIR ses factures électroniques par une plateforme agréée (PA) ; l'émission
-- devient obligatoire pour les PME et micro-entreprises au 1er septembre 2027. Formats du socle : UBL 2.1, CII D22B et
-- Factur-X (PDF/A-3 + XML CII joint), conformes à la norme EN 16931. Le cycle de vie compte quatorze statuts (200 à
-- 213), dont quatre obligatoires : Déposée (200), Refusée (210), Encaissée (212), Rejetée (213).
--
-- Répartition avec A1 : le LECTEUR extrait le XML (Factur-X, UBL, CII) et écrit ses valeurs dans pieces_valeurs avec
-- source = 'xml', verifiee = true, sans IA (omega/CHAMPS-LECTURE.md). Ce lot fait le reste, côté FILED :
--   1. filed_factures.provenance : 'structuree' quand la pièce porte des valeurs xml, sinon 'lue' (posée à l'insertion ;
--      private.filed_provenance pour les factures plus anciennes).
--   2. La facture structurée fait foi : une valeur saisie par une personne qui contredit la valeur xml du même champ
--      est refusée (22023). On refuse la facture ou on ouvre un litige ; on ne la réécrit pas.
--   3. Le référentiel des statuts de la réforme (public.filed_cycle_vie_statuts) et des motifs
--      (public.filed_cycle_vie_motifs).
--   4. public.filed_cycle_vie : les statuts que FILED, côté acheteur, doit renvoyer au fournisseur par sa plateforme,
--      déposés par les événements de FILED : facture intégrée → 204 Prise en charge ; validée → 205 Approuvée ;
--      refusée ou écartée en doublon → 210 Refusée (motif) ; litige ouvert → 207 En litige ; règlement noté →
--      211 Paiement transmis. État 'a_emettre' pour une facture structurée, 'sans_objet' pour une facture lue sur PDF
--      (journal seulement). Aucun appel réseau : l'ouvrier de la plateforme les prendra par
--      public.filed_cycle_vie_a_emettre et rendra compte par public.filed_noter_emission_cycle_vie (service_role).
--   5. public.filed_cycle_vie_facture(p_facture) : la frise d'une facture, pour l'écran.
-- Migration idempotente (if not exists, create or replace, on conflict do nothing). Aucune suppression.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Les référentiels de la réforme
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.filed_cycle_vie_statuts (
  code                     smallint primary key check (code between 200 and 299),
  libelle                  text not null,
  emetteur                 text not null check (emetteur in ('plateforme', 'acheteur', 'fournisseur')),
  obligatoire              boolean not null default false,
  transmis_administration  boolean not null default false,
  motif_requis             boolean not null default false
);
comment on table public.filed_cycle_vie_statuts is
  'Les statuts du cycle de vie de la facture électronique (réforme 2026, XP Z12-012) : qui les émet, lesquels sont obligatoires et transmis à l''administration.';
insert into public.filed_cycle_vie_statuts (code, libelle, emetteur, obligatoire, transmis_administration, motif_requis) values
  (200, 'Déposée', 'plateforme', true, true, false),
  (201, 'Émise par la plateforme', 'plateforme', false, false, false),
  (202, 'Reçue par la plateforme', 'plateforme', false, false, false),
  (203, 'Mise à disposition', 'plateforme', false, false, false),
  (204, 'Prise en charge', 'acheteur', false, false, false),
  (205, 'Approuvée', 'acheteur', false, false, false),
  (206, 'Approuvée partiellement', 'acheteur', false, false, true),
  (207, 'En litige', 'acheteur', false, false, true),
  (208, 'Suspendue', 'acheteur', false, false, true),
  (209, 'Complétée', 'fournisseur', false, false, false),
  (210, 'Refusée', 'acheteur', true, true, true),
  (211, 'Paiement transmis', 'acheteur', false, false, false),
  (212, 'Encaissée', 'fournisseur', true, true, false),
  (213, 'Rejetée', 'plateforme', true, false, false)
on conflict (code) do nothing;
alter table public.filed_cycle_vie_statuts enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_cycle_vie_statuts' and policyname = 'filed_cycle_vie_statuts_lecture') then
    execute 'create policy filed_cycle_vie_statuts_lecture on public.filed_cycle_vie_statuts for select to authenticated using (true)';
  end if;
end $$;
revoke all on table public.filed_cycle_vie_statuts from anon, authenticated;
grant select on public.filed_cycle_vie_statuts to authenticated;

create table if not exists public.filed_cycle_vie_motifs (
  code     text primary key check (code ~ '^[A-Z][A-Z_]{1,29}$'),
  libelle  text not null,
  statuts  smallint[] not null
);
comment on table public.filed_cycle_vie_motifs is
  'Les motifs normalisés d''un statut 206, 207, 208 ou 210 (réforme 2026) et les statuts où chacun s''emploie.';
insert into public.filed_cycle_vie_motifs (code, libelle, statuts) values
  ('TX_TVA_ERR', 'Taux de TVA erroné', '{206,207,210}'),
  ('MONTANTTOTAL_ERR', 'Montant total erroné', '{206,207,210}'),
  ('CALCUL_ERR', 'Erreur de calcul', '{206,207,210}'),
  ('NON_CONFORME', 'Mention légale manquante, facture non conforme', '{206,207,210}'),
  ('DOUBLON', 'Facture en double', '{206,207,210}'),
  ('DEST_ERR', 'Destinataire erroné', '{206,207,210}'),
  ('TRANSAC_INC', 'Transaction inconnue', '{206,207,210}'),
  ('EMMET_INC', 'Émetteur inconnu', '{206,207,210}'),
  ('CONTRAT_TERM', 'Contrat terminé', '{206,207,210}'),
  ('DOUBLE_FACT', 'Double facturation', '{206,207,210}'),
  ('CMD_ERR', 'Commande erronée', '{206,207,208,210}'),
  ('ADR_ERR', 'Adresse erronée', '{206,208,210}'),
  ('REF_CT_ABSENT', 'Référence contractuelle absente', '{206,208,210}'),
  ('SIRET_ERR', 'SIRET erroné', '{206,208}'),
  ('CODE_ROUTAGE_ERR', 'Code de routage erroné', '{206,208}'),
  ('REF_ERR', 'Référence erronée', '{206,208}'),
  ('JUSTIF_ABS', 'Justificatif absent', '{208}'),
  ('PU_ERR', 'Prix unitaire erroné', '{206}'),
  ('REM_ERR', 'Remise erronée', '{206}'),
  ('QTE_ERR', 'Quantité erronée', '{206}'),
  ('ART_ERR', 'Article erroné', '{206}'),
  ('MODPAI_ERR', 'Modalités de paiement erronées', '{206}'),
  ('QUALITE_ERR', 'Qualité non conforme', '{206}'),
  ('LIVR_INCOMP', 'Livraison incomplète', '{206}'),
  ('AUTRE', 'Autre motif', '{206,207,208,210}')
on conflict (code) do nothing;
alter table public.filed_cycle_vie_motifs enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_cycle_vie_motifs' and policyname = 'filed_cycle_vie_motifs_lecture') then
    execute 'create policy filed_cycle_vie_motifs_lecture on public.filed_cycle_vie_motifs for select to authenticated using (true)';
  end if;
end $$;
revoke all on table public.filed_cycle_vie_motifs from anon, authenticated;
grant select on public.filed_cycle_vie_motifs to authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. La provenance d'une facture
-- ───────────────────────────────────────────────────────────────────────────
alter table public.filed_factures add column if not exists provenance text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'filed_factures_provenance_check') then
    alter table public.filed_factures add constraint filed_factures_provenance_check
      check (provenance is null or provenance in ('structuree', 'lue', 'saisie'));
  end if;
end $$;
comment on column public.filed_factures.provenance is
  'structuree : facture électronique (Factur-X, UBL, CII), ses valeurs viennent du XML et font foi ; lue : lue sur PDF ou image ; saisie : sans pièce lue.';

-- Une pièce est structurée quand le lecteur y a écrit ses valeurs clés depuis le XML.
create or replace function private.filed_piece_structuree(p_piece uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select p_piece is not null and exists (
    select 1 from public.pieces_valeurs v
     where v.piece_id = p_piece and v.source = 'xml' and v.champ in ('numero', 'montant_ttc'))
$$;
revoke all on function private.filed_piece_structuree(uuid) from public, anon, authenticated;

create or replace function private.filed_provenance(p_facture uuid)
returns text language sql stable security definer set search_path to '' as $$
  select coalesce(f.provenance,
                  case when d.piece_id is null then 'saisie'
                       when private.filed_piece_structuree(d.piece_id) then 'structuree'
                       else 'lue' end)
    from public.filed_factures f join public.filed_documents d on d.id = f.document_id
   where f.id = p_facture
$$;
comment on function private.filed_provenance(uuid) is 'Provenance d''une facture : structuree, lue ou saisie (calculée pour les factures antérieures au lot 9).';
revoke all on function private.filed_provenance(uuid) from public, anon, authenticated;

create or replace function private.filed_poser_provenance()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_piece uuid;
begin
  if new.provenance is null then
    select d.piece_id into v_piece from public.filed_documents d where d.id = new.document_id;
    new.provenance := case when v_piece is null then 'saisie'
                           when private.filed_piece_structuree(v_piece) then 'structuree'
                           else 'lue' end;
  end if;
  return new;
end $$;
revoke all on function private.filed_poser_provenance() from public, anon, authenticated;

create or replace trigger filed_factures_provenance
  before insert on public.filed_factures
  for each row execute function private.filed_poser_provenance();

-- ───────────────────────────────────────────────────────────────────────────
-- 3. La facture structurée fait foi
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_meme_valeur(a jsonb, b jsonb)
returns boolean language plpgsql immutable set search_path to '' as $$
declare ta text := a #>> '{}'; tb text := b #>> '{}';
begin
  if a is null or b is null then return a is not distinct from b; end if;
  if a = b then return true; end if;
  if jsonb_typeof(a) in ('array', 'object') or jsonb_typeof(b) in ('array', 'object') then return false; end if;
  if btrim(ta) = btrim(tb) then return true; end if;
  if replace(ta, ',', '.') ~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$' and replace(tb, ',', '.') ~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$' then
    return replace(ta, ',', '.')::numeric = replace(tb, ',', '.')::numeric;
  end if;
  return upper(regexp_replace(ta, '\s', '', 'g')) = upper(regexp_replace(tb, '\s', '', 'g'));
end $$;
revoke all on function private.filed_meme_valeur(jsonb, jsonb) from public, anon;
grant execute on function private.filed_meme_valeur(jsonb, jsonb) to authenticated, service_role;

create or replace function private.filed_xml_fait_foi()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_xml jsonb;
begin
  if new.source is distinct from 'humain' then return new; end if;
  if tg_op = 'UPDATE' and new.valeur is not distinct from old.valeur and new.champ = old.champ
     and new.source is not distinct from old.source then
    return new;
  end if;
  select x.valeur into v_xml from public.pieces_valeurs x
   where x.piece_id = new.piece_id and x.champ = new.champ and x.source = 'xml'
   order by x.cree_le desc limit 1;
  if found and not private.filed_meme_valeur(new.valeur, v_xml) then
    raise exception 'Facture électronique : la valeur de % vient du fichier structuré et fait foi. Refusez la facture ou ouvrez un litige avec le fournisseur ; elle ne se corrige pas.',
      new.champ using errcode = '22023';
  end if;
  return new;
end $$;
comment on function private.filed_xml_fait_foi() is
  'Lot 9 (a4_16) : sur une pièce structurée, une valeur saisie par une personne ne contredit pas la valeur xml du même champ.';
revoke all on function private.filed_xml_fait_foi() from public, anon, authenticated;

create or replace trigger pieces_valeurs_xml_fait_foi
  before insert or update on public.pieces_valeurs
  for each row execute function private.filed_xml_fait_foi();

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Les statuts du cycle de vie à renvoyer
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.filed_cycle_vie (
  id              bigint generated always as identity primary key,
  client_id       uuid not null references public.clients(id) on delete cascade,
  facture_id      uuid not null references public.filed_factures(id) on delete cascade,
  document_id     uuid not null references public.filed_documents(id) on delete cascade,
  code            smallint not null references public.filed_cycle_vie_statuts(code),
  motif_code      text references public.filed_cycle_vie_motifs(code),
  motif           text check (motif is null or char_length(motif) <= 500),
  montant         numeric(14,2),
  survenu_le      timestamptz not null default now(),
  cle             text not null check (char_length(cle) between 1 and 200),
  etat            text not null default 'a_emettre' check (etat in ('a_emettre', 'en_cours', 'emis', 'echec', 'sans_objet')),
  essais          smallint not null default 0,
  pris_le         timestamptz,
  emis_le         timestamptz,
  reference_pa    text check (reference_pa is null or char_length(reference_pa) <= 200),
  erreur          text check (erreur is null or char_length(erreur) <= 500),
  constraint filed_cycle_vie_une_fois unique (client_id, cle)
);
comment on table public.filed_cycle_vie is
  'Les statuts du cycle de vie qu''une facture reçue doit renvoyer au fournisseur par la plateforme agréée : à émettre (structurée), sans objet (lue sur PDF, journal seulement), émis ou en échec.';
create index if not exists filed_cycle_vie_facture on public.filed_cycle_vie (facture_id, survenu_le);
create index if not exists filed_cycle_vie_a_emettre on public.filed_cycle_vie (survenu_le) where etat = 'a_emettre';
alter table public.filed_cycle_vie enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_cycle_vie' and policyname = 'filed_cycle_vie_lecture') then
    execute 'create policy filed_cycle_vie_lecture on public.filed_cycle_vie for select to authenticated using (exists (select 1 from public.filed_documents d where d.id = document_id))';
  end if;
end $$;
revoke all on table public.filed_cycle_vie from anon, authenticated;
grant select on public.filed_cycle_vie to authenticated;
-- Effacement d'une organisation : comme les autres tables du lot 6.
insert into private.tables_locataires (nom, ordre_effacement, note) values ('filed_cycle_vie', 2, 'FILED, lot 9')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;
insert into private.tables_objets (nom, objet_type, colonne, ordre_effacement) values ('filed_cycle_vie', 'filed_document', 'document_id', 5)
on conflict (nom) do update set objet_type = excluded.objet_type, colonne = excluded.colonne, ordre_effacement = excluded.ordre_effacement;

-- Le motif normalisé d'un refus : le motif officiel du premier contrôle bloquant de la version, sinon AUTRE.
create or replace function private.filed_motif_refus(p_facture uuid)
returns text language sql stable security definer set search_path to '' as $$
  select coalesce((
    select c.motif_officiel from public.filed_controles c
      join public.filed_factures f on f.id = c.facture_id and f.version = c.version
      join public.filed_cycle_vie_motifs m on m.code = c.motif_officiel and 210 = any (m.statuts)
     where c.facture_id = p_facture and c.resultat = 'anomalie' and c.gravite = 'bloquant'
     order by c.cree_le limit 1), 'AUTRE')
$$;
revoke all on function private.filed_motif_refus(uuid) from public, anon, authenticated;

create or replace function private.filed_deposer_cycle_vie(p_f public.filed_factures, p_code smallint, p_cle text,
                                                         p_motif_code text default null, p_motif text default null, p_montant numeric default null)
returns bigint language plpgsql security definer set search_path to '' as $$
declare v_id bigint; v_prov text := coalesce(p_f.provenance, private.filed_provenance(p_f.id));
begin
  insert into public.filed_cycle_vie (client_id, facture_id, document_id, code, motif_code, motif, montant, cle, etat)
  values (p_f.client_id, p_f.id, p_f.document_id, p_code, p_motif_code, left(p_motif, 500), p_montant, left(p_cle, 200),
          case when v_prov = 'structuree' then 'a_emettre' else 'sans_objet' end)
  on conflict (client_id, cle) do nothing
  returning id into v_id;
  return v_id;
end $$;
comment on function private.filed_deposer_cycle_vie(public.filed_factures, smallint, text, text, text, numeric) is
  'Dépose un statut du cycle de vie (idempotent sur la clé) : à émettre si la facture est structurée, sans objet sinon.';
revoke all on function private.filed_deposer_cycle_vie(public.filed_factures, smallint, text, text, text, numeric) from public, anon, authenticated;

-- Facture intégrée, validée, refusée ou écartée en doublon.
create or replace function private.filed_cycle_vie_facture_changee()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.nature not in ('facture', 'avoir') then return null; end if;
  if tg_op = 'INSERT' then
    perform private.filed_deposer_cycle_vie(new, 204::smallint, 'f:' || new.id::text || ':204');
    return null;
  end if;
  if new.statut is not distinct from old.statut then return null; end if;
  if new.statut = 'validee' then
    perform private.filed_deposer_cycle_vie(new, 205::smallint, 'f:' || new.id::text || ':205:v' || new.version::text);
  elsif new.statut = 'refusee' then
    perform private.filed_deposer_cycle_vie(new, 210::smallint, 'f:' || new.id::text || ':210:v' || new.version::text,
                                            private.filed_motif_refus(new.id));
  elsif new.statut = 'ecartee' then
    perform private.filed_deposer_cycle_vie(new, 210::smallint, 'f:' || new.id::text || ':210:v' || new.version::text,
                                            'DOUBLON', 'Facture déjà reçue : écartée en doublon.');
  end if;
  return null;
end $$;
revoke all on function private.filed_cycle_vie_facture_changee() from public, anon, authenticated;

create or replace trigger filed_factures_cycle_vie
  after insert or update of statut on public.filed_factures
  for each row execute function private.filed_cycle_vie_facture_changee();

-- Litige ouvert.
create or replace function private.filed_cycle_vie_litige()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_code text;
begin
  select * into v_f from public.filed_factures where id = new.facture_id;
  if not found then return null; end if;
  -- Un motif qui commence par un code normalisé (« CMD_ERR : … ») le porte ; sinon AUTRE.
  select m.code into v_code from public.filed_cycle_vie_motifs m
   where 207 = any (m.statuts) and upper(btrim(new.motif)) like m.code || '%'
   order by char_length(m.code) desc limit 1;
  perform private.filed_deposer_cycle_vie(v_f, 207::smallint, 'l:' || new.id::text, coalesce(v_code, 'AUTRE'), new.motif);
  return null;
end $$;
revoke all on function private.filed_cycle_vie_litige() from public, anon, authenticated;

create or replace trigger filed_litiges_cycle_vie
  after insert on public.filed_litiges
  for each row execute function private.filed_cycle_vie_litige();

-- Règlement noté.
create or replace function private.filed_cycle_vie_reglement()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures;
begin
  if new.montant <= 0 then return null; end if;
  select * into v_f from public.filed_factures where id = new.facture_id;
  if not found then return null; end if;
  perform private.filed_deposer_cycle_vie(v_f, 211::smallint, 'r:' || new.id::text, null, null, new.montant);
  return null;
end $$;
revoke all on function private.filed_cycle_vie_reglement() from public, anon, authenticated;

create or replace trigger filed_reglements_cycle_vie
  after insert on public.filed_reglements
  for each row execute function private.filed_cycle_vie_reglement();

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Les portes de l'ouvrier de la plateforme (service_role) — pas d'appel réseau ici
-- ───────────────────────────────────────────────────────────────────────────
-- Prend sous bail jusqu'à n statuts à émettre, avec ce qu'il faut pour les envoyer.
create or replace function public.filed_cycle_vie_a_emettre(p_nombre integer default 50, p_bail interval default '10 minutes')
returns table (id bigint, client_id uuid, facture_id uuid, code smallint, libelle text, motif_code text, motif text,
               montant numeric, survenu_le timestamptz, numero text, date_emission date, fournisseur_siren text,
               fournisseur_tva text, acheteur_siren text, essais smallint)
language plpgsql security definer set search_path to '' as $$
#variable_conflict use_column
begin
  return query
  with pris as (
    select e.id from public.filed_cycle_vie e
     where e.etat = 'a_emettre' or (e.etat = 'en_cours' and e.pris_le < now() - p_bail)
     order by e.survenu_le, e.id
     limit greatest(1, least(coalesce(p_nombre, 50), 500))
     for update skip locked
  ), maj as (
    update public.filed_cycle_vie e set etat = 'en_cours', pris_le = now(), essais = e.essais + 1
      from pris where e.id = pris.id
    returning e.*
  )
  select m.id, m.client_id, m.facture_id, m.code, s.libelle, m.motif_code,
         coalesce(m.motif, (select a.texte from public.filed_factures_annexes a
                             where a.facture_id = m.facture_id and a.nature = 'motif_refus' order by a.cree_le desc limit 1)),
         m.montant, m.survenu_le, f.numero, f.date_emission,
         coalesce(f.fournisseur_lu ->> 'siren', fo.siren), coalesce(f.fournisseur_lu ->> 'tva', fo.tva),
         coalesce(f.acheteur_lu ->> 'siren', en.siren), m.essais
    from maj m
    join public.filed_cycle_vie_statuts s on s.code = m.code
    join public.filed_factures f on f.id = m.facture_id
    left join public.filed_fournisseurs fo on fo.id = f.fournisseur_id
    left join public.entites en on en.id = f.entite_id
   order by m.survenu_le, m.id;
end $$;
comment on function public.filed_cycle_vie_a_emettre(integer, interval) is
  'Ouvrier de la plateforme agréée : prend sous bail les statuts du cycle de vie à émettre, avec la facture et les parties.';
revoke all on function public.filed_cycle_vie_a_emettre(integer, interval) from public, anon, authenticated;
grant execute on function public.filed_cycle_vie_a_emettre(integer, interval) to service_role;

-- Rend compte d'une émission : émis (avec la référence de la plateforme) ou échec (repris jusqu'à 5 essais).
create or replace function public.filed_noter_emission_cycle_vie(p_id bigint, p_ok boolean, p_reference text default null, p_erreur text default null)
returns text language plpgsql security definer set search_path to '' as $$
declare v_e public.filed_cycle_vie;
begin
  select * into v_e from public.filed_cycle_vie where id = p_id for update;
  if not found then raise exception 'Statut de cycle de vie introuvable.' using errcode = 'P0002'; end if;
  if v_e.etat = 'emis' then return 'deja_emis'; end if;
  if coalesce(p_ok, false) then
    update public.filed_cycle_vie set etat = 'emis', emis_le = now(), reference_pa = left(p_reference, 200), erreur = null where id = p_id;
    return 'emis';
  end if;
  update public.filed_cycle_vie
     set etat = case when v_e.essais >= 5 then 'echec' else 'a_emettre' end, erreur = left(coalesce(p_erreur, 'Erreur inconnue'), 500)
   where id = p_id;
  if v_e.essais >= 5 then
    perform private.lever_alerte_module(v_e.client_id, 'filed', 'attention',
      left(format('Statut %s non transmis à la plateforme après %s essais : %s', v_e.code, v_e.essais, coalesce(p_erreur, 'erreur inconnue')), 200),
      jsonb_build_object('facture', v_e.facture_id, 'cycle_vie', v_e.id), 'cycle_vie_echec:' || v_e.id::text, false, null);
    return 'echec';
  end if;
  return 'repris';
end $$;
comment on function public.filed_noter_emission_cycle_vie(bigint, boolean, text, text) is
  'Ouvrier de la plateforme agréée : statut émis (référence de la plateforme) ou échec, repris jusqu''à cinq essais puis alerte.';
revoke all on function public.filed_noter_emission_cycle_vie(bigint, boolean, text, text) from public, anon, authenticated;
grant execute on function public.filed_noter_emission_cycle_vie(bigint, boolean, text, text) to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. La frise d'une facture, pour l'écran (droits de l'appelant)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function public.filed_cycle_vie_facture(p_facture uuid)
returns table (code smallint, libelle text, survenu_le timestamptz, motif_code text, motif_libelle text, motif text,
               montant numeric, etat text, emis_le timestamptz)
language sql stable set search_path to '' as $$
  select e.code, s.libelle, e.survenu_le, e.motif_code, m.libelle, e.motif, e.montant, e.etat, e.emis_le
    from public.filed_cycle_vie e
    join public.filed_cycle_vie_statuts s on s.code = e.code
    left join public.filed_cycle_vie_motifs m on m.code = e.motif_code
   where e.facture_id = p_facture
   order by e.survenu_le, e.id
$$;
comment on function public.filed_cycle_vie_facture(uuid) is
  'La frise du cycle de vie d''une facture (statuts de la réforme déposés par FILED), sous les droits de l''appelant.';
revoke all on function public.filed_cycle_vie_facture(uuid) from public, anon;
grant execute on function public.filed_cycle_vie_facture(uuid) to authenticated, service_role;
