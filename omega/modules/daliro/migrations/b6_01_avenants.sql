-- b6_01 — DALIRO : les travaux supplémentaires et l'avenant (session B6, 05/10/2026)
--
-- CE QUE ÇA CORRIGE. La page /secteurs/btp promet « les travaux supplémentaires
-- signés avant exécution, chiffrés sur vos prix unitaires, l'avenant préparé ».
-- Le socle a la bibliothèque de prix (btp_bibliotheque_prix, prix proposés par
-- les marchés vérifiés puis validés) et RIEN qui la consomme : aucune table
-- d'avenant, aucune ligne de travaux supplémentaires, aucune signature.
--
-- CE QUI EST POSÉ.
--   · public.btp_avenants        : un avenant par travail supplémentaire (ou lot
--     de travaux) d'un chantier ; numéroté par chantier ; brouillon → soumis →
--     signé | refusé | abandonné. Sa signature passe par une DEMANDE DE
--     VALIDATION du socle (type daliro.signer_avenant) : celui qui a chiffré
--     ne signe pas (payload.saisi_par, lot 19c du socle).
--   · public.btp_avenants_lignes : les lignes, chiffrées sur un prix VALIDÉ de
--     la bibliothèque (copié, donc figé), ou saisies librement — un prix saisi
--     librement est proposé à la bibliothèque, il ne vaudra qu'une fois validé.
--   · portes : btp_ouvrir_avenant, btp_chiffrer_ligne_avenant,
--     btp_retirer_ligne_avenant, btp_soumettre_avenant, btp_signer_avenant,
--     btp_abandonner_avenant ; vues btp_avenants_chiffres,
--     btp_avenants_lignes_chiffrees (prix cachés sans le droit voir_prix,
--     comme btp_lignes_marche_chiffrees).
--   · journal : private.journaliser seulement (daliro.avenant_*) ; événement
--     daliro.avenant_signe publié pour les modules abonnés.
--
-- Règles de pose : create or replace / if not exists / where not exists ;
-- jamais de DROP ni de DELETE (une ligne retirée est marquée retiree = true). Nouvelle table : revoke all d'anon et
-- authenticated puis les GRANT en face des politiques (règle du 05/10).

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Tables
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.btp_avenants (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  chantier_id uuid not null,
  entite_id uuid not null,
  marche_id uuid,
  numero integer not null,
  objet text not null,
  origine jsonb not null default '{}'::jsonb,
  statut text not null default 'brouillon',
  demande_id uuid,
  piece_id uuid,
  soumis_le timestamptz,
  signe_le date,
  signe_par uuid,
  signe_libelle text,
  motif text,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint btp_avenants_client_id_id_key unique (client_id, id),
  constraint btp_avenants_un_numero unique (chantier_id, numero),
  constraint btp_avenants_chantier_fkey foreign key (client_id, chantier_id) references public.btp_chantiers(client_id, id) on delete cascade,
  constraint btp_avenants_marche_fkey foreign key (client_id, marche_id) references public.btp_marches(client_id, id) on delete set null (marche_id),
  constraint btp_avenants_piece_fkey foreign key (client_id, piece_id) references public.pieces(client_id, id) on delete set null (piece_id),
  constraint btp_avenants_numero_check check (numero >= 1),
  constraint btp_avenants_objet_check check (char_length(btrim(objet)) between 1 and 500),
  constraint btp_avenants_motif_check check (char_length(motif) <= 500),
  constraint btp_avenants_statut_check check (statut in ('brouillon', 'soumis', 'signe', 'refuse', 'abandonne')),
  constraint btp_avenants_signature_datee check (statut <> 'signe' or signe_le is not null),
  constraint btp_avenants_soumission_datee check (statut not in ('soumis', 'signe', 'refuse') or soumis_le is not null)
);
comment on table public.btp_avenants is 'DALIRO — un avenant (travaux supplémentaires) d''un chantier, chiffré sur la bibliothèque de prix, signé après une demande de validation du socle.';

create table if not exists public.btp_avenants_lignes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  avenant_id uuid not null,
  chantier_id uuid not null,
  entite_id uuid not null,
  lot_id uuid,
  prix_id uuid,
  ordre integer not null default 0,
  designation text not null,
  unite text not null,
  quantite numeric(14,3) not null,
  prix_unitaire_ht numeric(14,4) not null,
  sens smallint not null default 1,
  montant_ht numeric(14,2) generated always as (round(quantite * prix_unitaire_ht * sens, 2)) stored,
  nature text not null default 'ouvrage',
  origine_prix text not null,
  retiree boolean not null default false,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint btp_avenants_lignes_client_id_id_key unique (client_id, id),
  constraint btp_avenants_lignes_avenant_fkey foreign key (client_id, avenant_id) references public.btp_avenants(client_id, id) on delete cascade,
  constraint btp_avenants_lignes_lot_fkey foreign key (chantier_id, lot_id) references public.btp_lots(chantier_id, id) on delete set null (lot_id),
  constraint btp_avenants_lignes_prix_fkey foreign key (client_id, prix_id) references public.btp_bibliotheque_prix(client_id, id) on delete set null (prix_id),
  constraint btp_avenants_lignes_designation_check check (char_length(btrim(designation)) between 1 and 2000),
  constraint btp_avenants_lignes_unite_check check (unite in ('u', 'ens', 'forfait', 'ml', 'm2', 'm3', 'kg', 't', 'l', 'h', 'j', 'sem', 'mois')),
  constraint btp_avenants_lignes_quantite_check check (quantite > 0),
  constraint btp_avenants_lignes_prix_check check (prix_unitaire_ht > 0),
  constraint btp_avenants_lignes_sens_check check (sens in (1, -1)),
  constraint btp_avenants_lignes_ordre_check check (ordre >= 0),
  constraint btp_avenants_lignes_nature_check check (nature in ('ouvrage', 'fourniture', 'forfait')),
  constraint btp_avenants_lignes_origine_check check (origine_prix in ('bibliotheque', 'saisie'))
);
comment on table public.btp_avenants_lignes is 'DALIRO — une ligne d''avenant : quantité × prix unitaire copié d''un prix validé de la bibliothèque (figé) ou saisi (alors proposé à la bibliothèque). sens = -1 pour une moins-value ; retiree = true quand le bureau l''a retirée (rien ne s''efface).';

create index if not exists btp_avenants_chantier_idx on public.btp_avenants (chantier_id, statut);
create index if not exists btp_avenants_lignes_avenant_idx on public.btp_avenants_lignes (avenant_id, ordre);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Déclencheurs : entité du chantier, immuables, passages d'état par les portes
-- ─────────────────────────────────────────────────────────────────────────

create or replace function private.btp_preparer_avenant()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_porte text := coalesce(current_setting('daliro.porte', true), '');
  v_c record;
begin
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.client_id := old.client_id;
    new.chantier_id := old.chantier_id;
    new.numero := old.numero;
    new.cree_le := old.cree_le;
    if old.statut in ('signe', 'refuse', 'abandonne') and new.statut = old.statut
       and (new.objet, new.origine, new.marche_id, new.piece_id, new.demande_id, new.signe_le, new.signe_par, new.motif)
           is distinct from (old.objet, old.origine, old.marche_id, old.piece_id, old.demande_id, old.signe_le, old.signe_par, old.motif) then
      raise exception 'Un avenant % ne se modifie plus.', case old.statut when 'signe' then 'signé' when 'refuse' then 'refusé' else 'abandonné' end
        using errcode = '42501';
    end if;
    if new.statut is distinct from old.statut then
      if v_porte = '' then
        raise exception 'Un avenant ne change d''état que par ses portes.' using errcode = '42501';
      end if;
      if not ((old.statut = 'brouillon' and new.statut in ('soumis', 'abandonne'))
           or (old.statut = 'soumis' and new.statut in ('signe', 'refuse', 'brouillon', 'abandonne'))
           or (old.statut = 'refuse' and new.statut in ('brouillon', 'abandonne'))) then
        raise exception 'Passage refusé : % vers %.', old.statut, new.statut using errcode = '23514';
      end if;
    end if;
  end if;
  select c.entite_id, c.statut into v_c from public.btp_chantiers c
  where c.client_id = new.client_id and c.id = new.chantier_id;
  if v_c.entite_id is null then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  new.entite_id := v_c.entite_id;
  new.objet := btrim(new.objet);
  if tg_op = 'INSERT' then
    new.statut := 'brouillon';
    new.demande_id := null;
    new.soumis_le := null;
    new.signe_le := null;
    new.signe_par := null;
    new.signe_libelle := null;
    new.cree_le := now();
  end if;
  if new.statut = 'brouillon' then
    new.signe_le := null;
    new.signe_par := null;
    new.signe_libelle := null;
  end if;
  new.maj_le := now();
  return new;
end $function$;

create or replace function private.btp_preparer_ligne_avenant()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_a record;
begin
  if tg_op = 'DELETE' then
    select a.statut into v_a from public.btp_avenants a where a.id = old.avenant_id;
    if found and v_a.statut <> 'brouillon' and not private.btp_en_effacement(old.client_id) then
      raise exception 'Les lignes d''un avenant soumis ou signé ne changent plus.' using errcode = '42501';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.client_id := old.client_id;
    new.avenant_id := old.avenant_id;
    new.cree_le := old.cree_le;
  end if;
  select a.chantier_id, a.entite_id, a.statut into v_a from public.btp_avenants a
  where a.client_id = new.client_id and a.id = new.avenant_id;
  if not found then
    raise exception 'Avenant introuvable.' using errcode = 'P0002';
  end if;
  if v_a.statut <> 'brouillon' then
    raise exception 'Les lignes d''un avenant soumis ou signé ne changent plus.' using errcode = '42501';
  end if;
  new.chantier_id := v_a.chantier_id;
  new.entite_id := v_a.entite_id;
  new.designation := btrim(new.designation);
  new.maj_le := now();
  return new;
end $function$;

create or replace trigger btp_avenants_preparer before insert or update on public.btp_avenants
  for each row execute function private.btp_preparer_avenant();
create or replace trigger btp_avenants_tracer after insert or delete or update on public.btp_avenants
  for each row execute function private.tracer('maj_le');
create or replace trigger btp_avenants_lignes_preparer before insert or delete or update on public.btp_avenants_lignes
  for each row execute function private.btp_preparer_ligne_avenant();

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Lecture : RLS et vues chiffrées
-- ─────────────────────────────────────────────────────────────────────────

alter table public.btp_avenants enable row level security;
alter table public.btp_avenants_lignes enable row level security;

do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_avenants' and policyname = 'membres lisent les avenants de leurs chantiers') then
    create policy "membres lisent les avenants de leurs chantiers" on public.btp_avenants
  for select to authenticated
  using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $do$;

do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_avenants_lignes' and policyname = 'membres lisent les lignes des avenants de leurs chantiers') then
    create policy "membres lisent les lignes des avenants de leurs chantiers" on public.btp_avenants_lignes
  for select to authenticated
  using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $do$;

revoke all on table public.btp_avenants from anon, authenticated;
revoke all on table public.btp_avenants_lignes from anon, authenticated;
grant select on table public.btp_avenants to authenticated;
grant select on table public.btp_avenants_lignes to authenticated;

create or replace function private.btp_prix_ligne_avenant(p_id uuid)
 returns table(prix_unitaire_ht numeric, montant_ht numeric)
 language sql
 stable security definer
 set search_path to ''
as $function$
  select l.prix_unitaire_ht, l.montant_ht from public.btp_avenants_lignes l
  where l.id = p_id
    and (private.btp_est_serveur() or (private.voit_entite(l.client_id, l.entite_id) and private.btp_voit_prix(l.client_id)))
$function$;

create or replace function private.btp_prix_avenant(p_id uuid)
 returns numeric
 language sql
 stable security definer
 set search_path to ''
as $function$
  select (select coalesce(sum(l.montant_ht), 0) from public.btp_avenants_lignes l where l.avenant_id = a.id and not l.retiree)
  from public.btp_avenants a
  where a.id = p_id
    and (private.btp_est_serveur() or (private.voit_entite(a.client_id, a.entite_id) and private.btp_voit_prix(a.client_id)))
$function$;

create or replace view public.btp_avenants_lignes_chiffrees as
 select l.id, l.client_id, l.avenant_id, l.chantier_id, l.lot_id, l.prix_id, l.ordre, l.designation, l.unite,
        l.quantite, l.sens, l.nature, l.origine_prix, p.prix_unitaire_ht, p.montant_ht
   from public.btp_avenants_lignes l
   left join lateral private.btp_prix_ligne_avenant(l.id) p(prix_unitaire_ht, montant_ht) on true
  where not l.retiree;

create or replace view public.btp_avenants_chiffres as
 select a.id, a.client_id, a.chantier_id, a.marche_id, a.numero, a.objet, a.origine, a.statut, a.demande_id, a.piece_id,
        a.soumis_le, a.signe_le, a.signe_par, a.signe_libelle, a.motif, a.cree_le, a.maj_le,
        (select count(*) from public.btp_avenants_lignes l where l.avenant_id = a.id and not l.retiree)::integer as nb_lignes,
        private.btp_prix_avenant(a.id) as montant_ht
   from public.btp_avenants a;

revoke all on public.btp_avenants_lignes_chiffrees from anon;
revoke all on public.btp_avenants_chiffres from anon;
grant select on public.btp_avenants_lignes_chiffrees to authenticated;
grant select on public.btp_avenants_chiffres to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Portes (private, SECURITY DEFINER) et leurs façades publiques
-- ─────────────────────────────────────────────────────────────────────────

create or replace function private.btp_ouvrir_avenant(p_chantier uuid, p_objet text, p_origine jsonb default '{}'::jsonb)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
  v_marche uuid;
  v_id uuid;
begin
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(c.client_id, c.entite_id);
  if c.statut not in ('ouvert', 'suspendu') then
    raise exception 'Un avenant se prépare sur un chantier ouvert.' using errcode = '23514';
  end if;
  if coalesce(btrim(p_objet), '') = '' then
    raise exception 'Un avenant a un objet : ce qui est demandé en plus du marché.' using errcode = '22023';
  end if;
  if p_origine is not null and jsonb_typeof(p_origine) <> 'object' then
    raise exception 'L''origine d''un avenant est un objet (canal, auteur, date, texte).' using errcode = '22023';
  end if;
  -- Le marché de référence : le dernier vérifié du chantier (il peut n'y en avoir pas encore).
  select m.id into v_marche from public.btp_marches m
  where m.client_id = c.client_id and m.chantier_id = c.id and m.statut = 'verifie'
  order by m.verifie_le desc nulls last limit 1;
  perform pg_advisory_xact_lock(hashtextextended('daliro.avenants:' || c.id::text, 0));
  insert into public.btp_avenants (client_id, chantier_id, marche_id, numero, objet, origine)
  values (c.client_id, c.id, v_marche,
          (select coalesce(max(a.numero), 0) + 1 from public.btp_avenants a where a.chantier_id = c.id),
          p_objet, coalesce(p_origine, '{}'::jsonb))
  returning id into v_id;
  perform private.journaliser(c.client_id, 'daliro.avenant_ouvert', 'btp_avenants', v_id::text,
    jsonb_build_object('chantier', c.id, 'marche', v_marche, 'objet', btrim(p_objet), 'origine', coalesce(p_origine, '{}'::jsonb)), c.entite_id);
  return v_id;
end $function$;

-- Chiffrer une ligne : sur un prix VALIDÉ de la bibliothèque (p_prix) — la
-- désignation, l'unité et le prix sont copiés ; ou librement (p_prix null,
-- alors désignation, unité et prix unitaire obligatoires) — le prix saisi est
-- proposé à la bibliothèque, à valider par qui en a le droit.
create or replace function private.btp_chiffrer_ligne_avenant(p_avenant uuid, p_quantite numeric, p_prix uuid default null,
                                                              p_lot uuid default null, p_designation text default null,
                                                              p_unite text default null, p_prix_unitaire numeric default null,
                                                              p_sens smallint default 1)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  a public.btp_avenants;
  b public.btp_bibliotheque_prix;
  v_id uuid;
  v_designation text;
  v_unite text;
  v_prix numeric;
  v_origine text;
  v_lot_corps text;
begin
  select * into a from public.btp_avenants where id = p_avenant for update;
  if not found then
    raise exception 'Avenant introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(a.client_id, a.entite_id);
  if a.statut <> 'brouillon' then
    raise exception 'Cet avenant n''est plus en préparation : ses lignes ne changent plus.' using errcode = '23514';
  end if;
  if p_quantite is null or p_quantite <= 0 then
    raise exception 'Une ligne d''avenant porte une quantité positive.' using errcode = '22023';
  end if;
  if p_lot is not null and not exists (select 1 from public.btp_lots l where l.chantier_id = a.chantier_id and l.id = p_lot) then
    raise exception 'Ce lot n''est pas un lot du chantier.' using errcode = '23514';
  end if;
  if p_prix is not null then
    select * into b from public.btp_bibliotheque_prix where id = p_prix;
    if not found or b.client_id <> a.client_id then
      raise exception 'Prix introuvable dans la bibliothèque.' using errcode = 'P0002';
    end if;
    if b.statut <> 'valide' then
      raise exception 'Un avenant se chiffre sur un prix validé de la bibliothèque ; celui-ci est %.',
        case b.statut when 'propose' then 'seulement proposé' else 'retiré' end using errcode = '23514';
    end if;
    v_designation := coalesce(nullif(btrim(p_designation), ''), b.designation);
    v_unite := b.unite;
    v_prix := b.prix_unitaire_ht;
    v_origine := 'bibliotheque';
  else
    v_designation := nullif(btrim(p_designation), '');
    v_unite := coalesce(private.btp_unite(p_unite), p_unite);
    v_prix := p_prix_unitaire;
    v_origine := 'saisie';
    if v_designation is null or v_unite is null or v_prix is null or v_prix <= 0 then
      raise exception 'Sans prix de bibliothèque, une ligne se chiffre avec sa désignation, son unité et son prix unitaire.'
        using errcode = '22023';
    end if;
  end if;
  insert into public.btp_avenants_lignes (client_id, avenant_id, lot_id, prix_id, ordre, designation, unite, quantite,
                                          prix_unitaire_ht, sens, nature, origine_prix)
  values (a.client_id, a.id, p_lot, p_prix,
          (select coalesce(max(l.ordre), 0) + 1 from public.btp_avenants_lignes l where l.avenant_id = a.id),
          v_designation, v_unite, p_quantite, v_prix, coalesce(p_sens, 1), 'ouvrage', v_origine)
  returning id into v_id;
  -- Un prix saisi librement est proposé à la bibliothèque (il ne vaut qu'une fois validé).
  if v_origine = 'saisie' and coalesce(p_sens, 1) = 1 and not exists (
       select 1 from public.btp_bibliotheque_prix x
       where x.client_id = a.client_id and x.designation_normalisee = private.btp_normaliser(v_designation)
         and x.unite = v_unite and x.prix_unitaire_ht = v_prix and x.statut in ('propose', 'valide')) then
    select l.corps_etat into v_lot_corps from public.btp_lots l where l.chantier_id = a.chantier_id and l.id = p_lot;
    insert into public.btp_bibliotheque_prix (client_id, designation, unite, prix_unitaire_ht, corps_etat, origine)
    values (a.client_id, v_designation, v_unite, v_prix, v_lot_corps, 'saisie');
  end if;
  perform private.journaliser(a.client_id, 'daliro.avenant_ligne_chiffree', 'btp_avenants', a.id::text,
    jsonb_build_object('ligne', v_id, 'designation', v_designation, 'unite', v_unite, 'quantite', p_quantite,
                       'origine_prix', v_origine, 'prix', p_prix, 'sens', coalesce(p_sens, 1)), a.entite_id);
  return v_id;
end $function$;

create or replace function private.btp_retirer_ligne_avenant(p_ligne uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  l public.btp_avenants_lignes;
begin
  select * into l from public.btp_avenants_lignes where id = p_ligne for update;
  if not found then
    raise exception 'Ligne introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(l.client_id, l.entite_id);
  if l.retiree then
    return;
  end if;
  update public.btp_avenants_lignes set retiree = true where id = l.id;
  perform private.journaliser(l.client_id, 'daliro.avenant_ligne_retiree', 'btp_avenants', l.avenant_id::text,
    jsonb_build_object('ligne', l.id, 'designation', l.designation), l.entite_id);
end $function$;

-- Soumettre à la signature : une demande de validation du socle (module
-- daliro, type daliro.signer_avenant, montant = total HT). Les règles de
-- validation de l'organisation choisissent qui signe ; sans règle, une
-- approbation d'un gérant, admin ou valideur. Celui qui a chiffré est dans
-- payload.saisi_par : le socle lui refuse la décision (lot 19c).
create or replace function private.btp_soumettre_avenant(p_avenant uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  a public.btp_avenants;
  c public.btp_chantiers;
  v_total numeric(14,2);
  v_lignes integer;
  v_acteur record;
  v_saisi uuid[];
  v_demande uuid;
  v_version integer;
  v_cle text;
begin
  select * into a from public.btp_avenants where id = p_avenant for update;
  if not found then
    raise exception 'Avenant introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(a.client_id, a.entite_id);
  if a.statut not in ('brouillon', 'refuse') then
    raise exception 'Cet avenant est déjà %.', case a.statut when 'soumis' then 'soumis' when 'signe' then 'signé' else 'abandonné' end
      using errcode = '23514';
  end if;
  select count(*), coalesce(sum(l.montant_ht), 0) into v_lignes, v_total
  from public.btp_avenants_lignes l where l.avenant_id = a.id and not l.retiree;
  if v_lignes = 0 then
    raise exception 'Un avenant se soumet avec au moins une ligne chiffrée.' using errcode = '23514';
  end if;
  select * into v_acteur from private.acteur_courant();
  -- Ceux qui ont chiffré cet avenant : ils ne le signeront pas.
  select coalesce(array_agg(distinct j.acteur_id), '{}') into v_saisi
  from public.journal_opposable j
  where j.client_id = a.client_id and j.objet_type = 'btp_avenants' and j.objet_id = a.id::text
    and j.action in ('daliro.avenant_ouvert', 'daliro.avenant_ligne_chiffree')
    and j.acteur_type = 'utilisateur' and j.acteur_id is not null;
  if v_acteur.acteur_type = 'utilisateur' and v_acteur.acteur_id is not null then
    v_saisi := array(select distinct x from unnest(v_saisi || v_acteur.acteur_id) x where x is not null);
  end if;
  select count(*) + 1 into v_version from public.demandes_validation d
  where d.client_id = a.client_id and d.objet_type = 'btp_avenant' and d.objet_id = a.id::text;
  v_cle := 'daliro:avenant:' || a.id::text || ':v' || v_version;
  select ch.* into c from public.btp_chantiers ch where ch.id = a.chantier_id;
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume,
                                          montant, payload, cle_idempotence)
  values (a.client_id, a.entite_id, 'daliro', 'daliro.signer_avenant', 'btp_avenant', a.id::text,
          left(format('Avenant n° %s — %s : %s', a.numero, c.nom, a.objet), 500), v_total,
          jsonb_build_object('avenant', a.id, 'chantier', a.chantier_id, 'chantier_nom', c.nom, 'numero', a.numero,
                             'objet', a.objet, 'marche', a.marche_id, 'total_ht', v_total, 'lignes', v_lignes,
                             'saisi_par', to_jsonb(v_saisi)),
          v_cle)
  on conflict (client_id, cle_idempotence) do nothing
  returning id into v_demande;
  if v_demande is null then
    select d.id into v_demande from public.demandes_validation d where d.client_id = a.client_id and d.cle_idempotence = v_cle;
  end if;
  perform set_config('daliro.porte', 'soumettre', true);
  update public.btp_avenants set statut = 'soumis', demande_id = v_demande, soumis_le = now(), motif = null where id = a.id;
  perform set_config('daliro.porte', '', true);
  perform private.journaliser(a.client_id, 'daliro.avenant_soumis', 'btp_avenants', a.id::text,
    jsonb_build_object('demande', v_demande, 'total_ht', v_total, 'lignes', v_lignes), a.entite_id);
  return v_demande;
end $function$;

-- Signer : la demande de validation doit être approuvée (par des personnes,
-- jamais par le déposant) ; la pièce signée (public.pieces) est rattachée.
-- Une demande rejetée passe l'avenant « refusé » : il se corrige et se
-- resoumet (nouvelle demande, nouvelle clé).
create or replace function private.btp_signer_avenant(p_avenant uuid, p_piece uuid default null, p_date date default current_date)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  a public.btp_avenants;
  d public.demandes_validation;
  v_acteur record;
  v_total numeric(14,2);
begin
  select * into a from public.btp_avenants where id = p_avenant for update;
  if not found then
    raise exception 'Avenant introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(a.client_id, a.entite_id);
  if a.statut <> 'soumis' then
    raise exception 'Cet avenant n''est pas soumis à la signature (%).', a.statut using errcode = '23514';
  end if;
  select * into d from public.demandes_validation where id = a.demande_id;
  if not found then
    raise exception 'La demande de validation de cet avenant est introuvable.' using errcode = 'P0002';
  end if;
  if d.statut = 'rejetee' then
    perform set_config('daliro.porte', 'refuser', true);
    update public.btp_avenants set statut = 'refuse',
      motif = left(coalesce((select string_agg(ap.commentaire, ' / ') from public.approbations ap where ap.demande_id = d.id and ap.decision = 'rejete'), 'Refusé à la validation.'), 500)
    where id = a.id;
    perform set_config('daliro.porte', '', true);
    perform private.journaliser(a.client_id, 'daliro.avenant_refuse', 'btp_avenants', a.id::text,
      jsonb_build_object('demande', d.id), a.entite_id);
    raise exception 'La signature a été refusée à la validation : l''avenant est marqué refusé.' using errcode = '23514';
  end if;
  if d.statut not in ('approuvee', 'executee') then
    raise exception 'L''avenant attend sa validation (%) : il ne se signe pas avant.', d.statut using errcode = '23514';
  end if;
  if p_piece is not null and not exists (select 1 from public.pieces p where p.id = p_piece and p.client_id = a.client_id) then
    raise exception 'La pièce signée n''est pas une pièce de l''organisation.' using errcode = '23514';
  end if;
  if p_date is null or p_date > current_date + 1 then
    raise exception 'La date de signature ne peut pas être dans le futur.' using errcode = '22023';
  end if;
  select * into v_acteur from private.acteur_courant();
  select coalesce(sum(l.montant_ht), 0) into v_total from public.btp_avenants_lignes l where l.avenant_id = a.id and not l.retiree;
  perform set_config('daliro.porte', 'signer', true);
  update public.btp_avenants
  set statut = 'signe', piece_id = coalesce(p_piece, piece_id), signe_le = p_date,
      signe_par = v_acteur.acteur_id, signe_libelle = v_acteur.acteur_libelle
  where id = a.id;
  perform set_config('daliro.porte', '', true);
  -- La demande du socle est exécutée : l'avenant est l'acte qu'elle autorisait.
  if d.statut = 'approuvee' then
    update public.demandes_validation set statut = 'executee' where id = d.id and statut = 'approuvee';
  end if;
  perform private.journaliser(a.client_id, 'daliro.avenant_signe', 'btp_avenants', a.id::text,
    jsonb_build_object('demande', d.id, 'piece', p_piece, 'signe_le', p_date, 'total_ht', v_total), a.entite_id);
  perform private.publier_evenement(a.client_id, 'daliro.avenant_signe',
    jsonb_build_object('avenant', a.id, 'chantier', a.chantier_id, 'marche', a.marche_id, 'total_ht', v_total, 'piece', p_piece),
    'avenant:' || a.id::text);
  return jsonb_build_object('avenant', a.id, 'statut', 'signe', 'total_ht', v_total, 'signe_le', p_date, 'demande', d.id);
end $function$;

create or replace function private.btp_abandonner_avenant(p_avenant uuid, p_motif text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  a public.btp_avenants;
begin
  select * into a from public.btp_avenants where id = p_avenant for update;
  if not found then
    raise exception 'Avenant introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(a.client_id, a.entite_id);
  if coalesce(btrim(p_motif), '') = '' then
    raise exception 'Un avenant s''abandonne avec son motif.' using errcode = '22023';
  end if;
  if a.statut not in ('brouillon', 'soumis', 'refuse') then
    raise exception 'Cet avenant est %.', case a.statut when 'signe' then 'signé : il ne s''abandonne plus' else 'déjà abandonné' end
      using errcode = '23514';
  end if;
  -- Une demande encore en attente est annulée par son demandeur (le socle ne le permet qu'à lui) ; sinon elle reste telle quelle.
  if a.demande_id is not null then
    begin
      update public.demandes_validation set statut = 'annulee' where id = a.demande_id and statut = 'en_attente';
    exception when others then
      null;
    end;
  end if;
  perform set_config('daliro.porte', 'abandonner', true);
  update public.btp_avenants set statut = 'abandonne', motif = btrim(p_motif) where id = a.id;
  perform set_config('daliro.porte', '', true);
  perform private.journaliser(a.client_id, 'daliro.avenant_abandonne', 'btp_avenants', a.id::text,
    jsonb_build_object('motif', btrim(p_motif), 'demande', a.demande_id), a.entite_id);
end $function$;

-- Façades publiques (SECURITY INVOKER, comme celles du socle).
create or replace function public.btp_ouvrir_avenant(p_chantier uuid, p_objet text, p_origine jsonb default '{}'::jsonb)
 returns uuid language sql set search_path to ''
as $function$ select private.btp_ouvrir_avenant(p_chantier, p_objet, p_origine) $function$;

create or replace function public.btp_chiffrer_ligne_avenant(p_avenant uuid, p_quantite numeric, p_prix uuid default null,
                                                             p_lot uuid default null, p_designation text default null,
                                                             p_unite text default null, p_prix_unitaire numeric default null,
                                                             p_sens smallint default 1)
 returns uuid language sql set search_path to ''
as $function$ select private.btp_chiffrer_ligne_avenant(p_avenant, p_quantite, p_prix, p_lot, p_designation, p_unite, p_prix_unitaire, p_sens) $function$;

create or replace function public.btp_retirer_ligne_avenant(p_ligne uuid)
 returns void language sql set search_path to ''
as $function$ select private.btp_retirer_ligne_avenant(p_ligne) $function$;

create or replace function public.btp_soumettre_avenant(p_avenant uuid)
 returns uuid language sql set search_path to ''
as $function$ select private.btp_soumettre_avenant(p_avenant) $function$;

create or replace function public.btp_signer_avenant(p_avenant uuid, p_piece uuid default null, p_date date default current_date)
 returns jsonb language sql set search_path to ''
as $function$ select private.btp_signer_avenant(p_avenant, p_piece, p_date) $function$;

create or replace function public.btp_abandonner_avenant(p_avenant uuid, p_motif text)
 returns void language sql set search_path to ''
as $function$ select private.btp_abandonner_avenant(p_avenant, p_motif) $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Droits d'exécution (a5_01 : EXECUTE sur private retiré à PUBLIC, rendu
--    à la liste requise — ces fonctions s'y ajoutent, à inscrire dans
--    omega/a5_01_liste_figee.txt par A5 / le coordinateur)
-- ─────────────────────────────────────────────────────────────────────────

revoke execute on function private.btp_ouvrir_avenant(uuid, text, jsonb) from public, anon;
revoke execute on function private.btp_chiffrer_ligne_avenant(uuid, numeric, uuid, uuid, text, text, numeric, smallint) from public, anon;
revoke execute on function private.btp_retirer_ligne_avenant(uuid) from public, anon;
revoke execute on function private.btp_soumettre_avenant(uuid) from public, anon;
revoke execute on function private.btp_signer_avenant(uuid, uuid, date) from public, anon;
revoke execute on function private.btp_abandonner_avenant(uuid, text) from public, anon;
revoke execute on function private.btp_prix_ligne_avenant(uuid) from public, anon;
revoke execute on function private.btp_prix_avenant(uuid) from public, anon;
grant execute on function private.btp_ouvrir_avenant(uuid, text, jsonb) to authenticated, service_role;
grant execute on function private.btp_chiffrer_ligne_avenant(uuid, numeric, uuid, uuid, text, text, numeric, smallint) to authenticated, service_role;
grant execute on function private.btp_retirer_ligne_avenant(uuid) to authenticated, service_role;
grant execute on function private.btp_soumettre_avenant(uuid) to authenticated, service_role;
grant execute on function private.btp_signer_avenant(uuid, uuid, date) to authenticated, service_role;
grant execute on function private.btp_abandonner_avenant(uuid, text) to authenticated, service_role;
grant execute on function private.btp_prix_ligne_avenant(uuid) to authenticated, service_role;
grant execute on function private.btp_prix_avenant(uuid) to authenticated, service_role;

revoke execute on function public.btp_ouvrir_avenant(uuid, text, jsonb) from public, anon;
revoke execute on function public.btp_chiffrer_ligne_avenant(uuid, numeric, uuid, uuid, text, text, numeric, smallint) from public, anon;
revoke execute on function public.btp_retirer_ligne_avenant(uuid) from public, anon;
revoke execute on function public.btp_soumettre_avenant(uuid) from public, anon;
revoke execute on function public.btp_signer_avenant(uuid, uuid, date) from public, anon;
revoke execute on function public.btp_abandonner_avenant(uuid, text) from public, anon;
grant execute on function public.btp_ouvrir_avenant(uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.btp_chiffrer_ligne_avenant(uuid, numeric, uuid, uuid, text, text, numeric, smallint) to authenticated, service_role;
grant execute on function public.btp_retirer_ligne_avenant(uuid) to authenticated, service_role;
grant execute on function public.btp_soumettre_avenant(uuid) to authenticated, service_role;
grant execute on function public.btp_signer_avenant(uuid, uuid, date) to authenticated, service_role;
grant execute on function public.btp_abandonner_avenant(uuid, text) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Le socle doit connaître l'objet « btp_avenant » (visibilité d'une
--    demande pour ses décideurs : private.voit_objet_pour) et la table
--    locataire (effacement d'un client). Sans contrainte connue sur ces
--    tables, on insère « where not exists ».
-- ─────────────────────────────────────────────────────────────────────────

do $do$ begin
  if to_regclass('private.tables_objets') is not null then
    begin
      execute $q$insert into private.tables_objets (nom, objet_type, colonne) select 'btp_avenants', 'btp_avenant', 'id'
               where not exists (select 1 from private.tables_objets t where t.nom = 'btp_avenants')$q$;
    exception when others then raise notice 'tables_objets : % (à inscrire à la main)', sqlerrm; end;
  end if;
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select x from unnest(array['btp_avenants', 'btp_avenants_lignes']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;
