-- 20261005212100 daliro_b6_01_04_lot1
-- Source : dépôt : b672b32 omega/modules/daliro/migrations/b6_01_avenants.sql ; b672b32 omega/modules/daliro/migrations/b6_02_confirmation_j2.sql ; b672b32 omega/modules/daliro/migrations/b6_03_factures_chantier.sql ; b672b32 omega/modules/daliro/migrations/b6_04_installer_et_tableau.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : b6_01_avenants.sql @ b672b32, b6_02_confirmation_j2.sql @ b672b32, b6_03_factures_chantier.sql @ b672b32, b6_04_installer_et_tableau.sql @ b672b32.
-- ═══ omega/modules/daliro/migrations/b6_01_avenants.sql @ b672b32
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
  select c.* into c from public.btp_chantiers c where c.id = a.chantier_id;
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


-- ═══ omega/modules/daliro/migrations/b6_02_confirmation_j2.sql @ b672b32
-- b6_02 — DALIRO : la confirmation des passages à J-2 et les remplaçants (session B6, 05/10/2026)
--
-- CE QUE ÇA CORRIGE. La page /secteurs/btp promet « vos sous-traitants
-- confirment leur passage à J-2 ; si l'un d'eux ne répond pas, des remplaçants
-- vous sont proposés ». Le socle porte l'état (btp_passages.confirmation :
-- non_demandee → demandee → confirmee | declinee | sans_reponse) et RIEN ne le
-- fait avancer : aucune porte ne demande, aucune ne reçoit la réponse, aucune
-- ne propose de remplaçant, aucun cron.
--
-- CE QUI EST POSÉ.
--   · public.btp_confirmations : chaque événement de confirmation (demandée,
--     confirmée, déclinée, sans réponse) avec sa clé — une réponse rejouée
--     avec la même clé ne réécrit rien.
--   · private.btp_demander_confirmations(p_client, p_jour) : les passages de
--     sous-traitants qui commencent dans deux jours OUVRÉS (ajouter_jours du
--     socle, territoire du chantier) passent « demandee » et l'événement
--     daliro.confirmation_demandee est publié (l'expéditeur du socle le porte
--     au tiers par son canal) ; ceux qui commencent demain sans réponse
--     passent « sans_reponse », une alerte est levée pour le conducteur avec
--     les remplaçants possibles.
--   · private.btp_repondre_confirmation(p_passage, p_reponse, p_cle, p_detail)
--     : la réponse du tiers (par la réception du socle, ou le bureau qui la
--     note après un appel) ; idempotente sur la clé.
--   · private.btp_proposer_remplacants(p_passage) : les tiers sous-traitants
--     du même corps d'état, du même département, joignables, à jour de
--     vigilance, qui n'ont pas décliné ce passage.
--   · private.btp_tache_confirmations() + cron daliro-confirmations-j2 à 17 h
--     Paris (15 h UTC).
--   · journal : private.journaliser seulement.
--
-- Règles de pose : create or replace / if not exists / where not exists ;
-- jamais de DROP ni de DELETE.

create table if not exists public.btp_confirmations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  passage_id uuid not null,
  chantier_id uuid not null,
  entite_id uuid not null,
  tiers_id uuid,
  evenement text not null,
  canal text,
  cle text not null,
  detail jsonb not null default '{}'::jsonb,
  version_passage integer,
  survenu_le timestamptz not null default now(),
  constraint btp_confirmations_client_id_id_key unique (client_id, id),
  constraint btp_confirmations_une_cle unique (client_id, cle),
  constraint btp_confirmations_passage_fkey foreign key (client_id, passage_id) references public.btp_passages(client_id, id) on delete cascade,
  constraint btp_confirmations_chantier_fkey foreign key (client_id, chantier_id) references public.btp_chantiers(client_id, id) on delete cascade,
  constraint btp_confirmations_tiers_fkey foreign key (client_id, tiers_id) references public.btp_tiers(client_id, id) on delete set null (tiers_id),
  constraint btp_confirmations_evenement_check check (evenement in ('demandee', 'confirmee', 'declinee', 'sans_reponse')),
  constraint btp_confirmations_canal_check check (canal is null or canal in ('whatsapp', 'sms', 'email', 'telephone')),
  constraint btp_confirmations_cle_check check (char_length(cle) between 1 and 200)
);
comment on table public.btp_confirmations is 'DALIRO — le fil des confirmations d''un passage (demandée à J-2, confirmée, déclinée, sans réponse), idempotent sur (client, clé).';
create index if not exists btp_confirmations_passage_idx on public.btp_confirmations (passage_id, survenu_le);

alter table public.btp_confirmations enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_confirmations' and policyname = 'membres lisent les confirmations de leurs chantiers') then
    create policy "membres lisent les confirmations de leurs chantiers" on public.btp_confirmations
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $do$;
revoke all on table public.btp_confirmations from anon, authenticated;
grant select on table public.btp_confirmations to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Les remplaçants possibles d'un passage de sous-traitant
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_proposer_remplacants(p_passage uuid)
 returns table(tiers_id uuid, nom text, telephone text, email text, canal text, vigilance text,
               corps_commun boolean, departement_ok boolean)
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  p public.btp_passages;
  v_corps text;
  v_departement text;
begin
  select * into p from public.btp_passages where id = p_passage;
  if not found then
    raise exception 'Passage introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_planning(p.client_id, p.entite_id);
  select l.corps_etat into v_corps from public.btp_lots l where l.chantier_id = p.chantier_id and l.id = p.lot_id;
  select c.departement into v_departement from public.btp_chantiers c where c.id = p.chantier_id;
  return query
    select t.id, t.nom, t.telephone, t.email,
           coalesce(t.canal, case when t.telephone is not null then 'whatsapp' else 'email' end),
           public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le),
           (v_corps is not null and v_corps = any (t.corps_etat)),
           (cardinality(t.departements) = 0 or v_departement = any (t.departements))
    from public.btp_tiers t
    where t.client_id = p.client_id and t.actif and t.confirmer_passages
      and 'sous_traitant' = any (t.roles)
      and t.id is distinct from p.tiers_id
      and (t.telephone is not null or t.email is not null)
      and public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le) not in ('absente', 'echue')
      and (v_corps is null or v_corps = any (t.corps_etat))
      and (cardinality(t.departements) = 0 or v_departement is null or v_departement = any (t.departements))
      and not exists (select 1 from public.btp_confirmations x
                      where x.passage_id = p.id and x.tiers_id = t.id and x.evenement = 'declinee')
    order by (v_corps is not null and v_corps = any (t.corps_etat)) desc,
             (v_departement = any (t.departements)) desc nulls last,
             case public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le)
               when 'a_jour' then 0 when 'a_renouveler' then 1 else 2 end,
             t.nom collate "C";
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Demander les confirmations (J-2 ouvrés) et relever les sans-réponse (J-1)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_demander_confirmations(p_client uuid, p_jour date default current_date)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_jour date := coalesce(p_jour, current_date);
  v_canal text;
  v_demandees integer := 0;
  v_sans_reponse integer := 0;
  v_remplacants jsonb;
  v_chantiers uuid[] := '{}';
begin
  if not private.btp_est_serveur() then
    if (select auth.uid()) is null or not private.a_un_role(p_client, array['gerant', 'admin', 'valideur']) then
      raise exception 'Réservé au bureau du client ou au serveur d''Omega.' using errcode = '42501';
    end if;
  end if;

  -- 1. J-2 : les passages de sous-traitants qui commencent dans deux jours ouvrés, pas encore demandés.
  for r in
    select p.*, c.nom as chantier_nom, c.territoire, c.conducteur_id, t.nom as tiers_nom, t.telephone, t.email, t.canal as tiers_canal
    from public.btp_passages p
    join public.btp_chantiers c on c.client_id = p.client_id and c.id = p.chantier_id
    join public.btp_tiers t on t.client_id = p.client_id and t.id = p.tiers_id
    where p.client_id = p_client and p.statut = 'prevu' and p.confirmation = 'non_demandee'
      and c.statut = 'ouvert' and t.actif and t.confirmer_passages
      and (t.telephone is not null or t.email is not null)
      and p.debut > v_jour
      and p.debut <= coalesce(public.ajouter_jours(v_jour, 2, 'ouvres', c.territoire), v_jour + 2)
    order by p.debut, p.id
  loop
    v_canal := coalesce(r.tiers_canal, case when r.telephone is not null then 'whatsapp' else 'email' end);
    update public.btp_passages set confirmation = 'demandee' where id = r.id;
    insert into public.btp_confirmations (client_id, passage_id, chantier_id, entite_id, tiers_id, evenement, canal, cle, detail, version_passage)
    values (r.client_id, r.id, r.chantier_id, r.entite_id, r.tiers_id, 'demandee', v_canal,
            'demande:' || r.id::text || ':v' || r.version || ':' || to_char(v_jour, 'YYYYMMDD'),
            jsonb_build_object('debut', r.debut, 'fin', r.fin, 'tache', r.tache), r.version)
    on conflict (client_id, cle) do nothing;
    perform private.publier_evenement(r.client_id, 'daliro.confirmation_demandee',
      jsonb_build_object('passage', r.id, 'chantier', r.chantier_id, 'chantier_nom', r.chantier_nom, 'tiers', r.tiers_id,
                         'tiers_nom', r.tiers_nom, 'canal', v_canal, 'telephone', r.telephone, 'email', r.email,
                         'debut', r.debut, 'fin', r.fin, 'tache', r.tache, 'version', r.version),
      'confirmation:' || r.id::text || ':v' || r.version);
    v_demandees := v_demandees + 1;
    if not (r.chantier_id = any (v_chantiers)) then v_chantiers := v_chantiers || r.chantier_id; end if;
  end loop;

  -- 2. J-1 : demandé, toujours sans réponse la veille → sans_reponse, alerte au conducteur avec les remplaçants.
  for r in
    select p.*, c.nom as chantier_nom, c.conducteur_id, t.nom as tiers_nom
    from public.btp_passages p
    join public.btp_chantiers c on c.client_id = p.client_id and c.id = p.chantier_id
    left join public.btp_tiers t on t.client_id = p.client_id and t.id = p.tiers_id
    where p.client_id = p_client and p.statut = 'prevu' and p.confirmation = 'demandee'
      and p.debut <= v_jour + 1
    order by p.debut, p.id
  loop
    update public.btp_passages set confirmation = 'sans_reponse' where id = r.id;
    select coalesce(jsonb_agg(jsonb_build_object('tiers', x.tiers_id, 'nom', x.nom, 'canal', x.canal, 'vigilance', x.vigilance)), '[]'::jsonb)
      into v_remplacants
    from (select * from private.btp_proposer_remplacants(r.id) limit 5) x;
    insert into public.btp_confirmations (client_id, passage_id, chantier_id, entite_id, tiers_id, evenement, cle, detail, version_passage)
    values (r.client_id, r.id, r.chantier_id, r.entite_id, r.tiers_id, 'sans_reponse',
            'sans_reponse:' || r.id::text || ':v' || r.version || ':' || to_char(v_jour, 'YYYYMMDD'),
            jsonb_build_object('remplacants', v_remplacants), r.version)
    on conflict (client_id, cle) do nothing;
    perform private.lever_alerte_module(r.client_id, 'daliro_referentiel', 'attention',
      left(format('%s n''a pas confirmé son passage du %s sur %s', coalesce(r.tiers_nom, 'Un sous-traitant'),
                  to_char(r.debut, 'DD/MM'), r.chantier_nom), 150),
      jsonb_build_object('passage', r.id, 'chantier', r.chantier_id, 'tiers', r.tiers_id, 'debut', r.debut,
                         'remplacants', v_remplacants),
      'sans_reponse:' || r.id::text, true, r.conducteur_id);
    perform private.publier_evenement(r.client_id, 'daliro.passage_sans_reponse',
      jsonb_build_object('passage', r.id, 'chantier', r.chantier_id, 'tiers', r.tiers_id, 'debut', r.debut, 'remplacants', v_remplacants),
      'sans_reponse:' || r.id::text || ':v' || r.version);
    v_sans_reponse := v_sans_reponse + 1;
    if not (r.chantier_id = any (v_chantiers)) then v_chantiers := v_chantiers || r.chantier_id; end if;
  end loop;

  for r in select c.id, c.entite_id from public.btp_chantiers c where c.id = any (v_chantiers) loop
    perform private.journaliser(p_client, 'daliro.confirmations_relevees', 'btp_chantiers', r.id::text,
      jsonb_build_object('jour', v_jour, 'demandees', v_demandees, 'sans_reponse', v_sans_reponse), r.entite_id);
  end loop;
  return jsonb_build_object('jour', v_jour, 'demandees', v_demandees, 'sans_reponse', v_sans_reponse);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- La réponse du tiers (réception du socle, ou le bureau après un appel)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_repondre_confirmation(p_passage uuid, p_reponse text, p_cle text, p_detail jsonb default '{}'::jsonb)
 returns boolean
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  p public.btp_passages;
  c public.btp_chantiers;
  v_tiers text;
  v_remplacants jsonb;
begin
  if p_reponse not in ('confirmee', 'declinee') then
    raise exception 'Une réponse est « confirmee » ou « declinee ».' using errcode = '22023';
  end if;
  if coalesce(btrim(p_cle), '') = '' then
    raise exception 'Une réponse porte sa clé (l''identifiant du message reçu).' using errcode = '22023';
  end if;
  select * into p from public.btp_passages where id = p_passage for update;
  if not found then
    return false;
  end if;
  perform private.btp_exiger_planning(p.client_id, p.entite_id);
  if exists (select 1 from public.btp_confirmations x where x.client_id = p.client_id and x.cle = btrim(p_cle)) then
    return true;
  end if;
  if p.confirmation = 'non_demandee' then
    raise exception 'Aucune confirmation n''a été demandée pour ce passage.' using errcode = '23514';
  end if;
  if p.statut <> 'prevu' then
    raise exception 'Ce passage n''est plus prévu (%).', p.statut using errcode = '23514';
  end if;
  select * into c from public.btp_chantiers where id = p.chantier_id;
  select t.nom into v_tiers from public.btp_tiers t where t.id = p.tiers_id;
  update public.btp_passages set confirmation = p_reponse where id = p.id;
  insert into public.btp_confirmations (client_id, passage_id, chantier_id, entite_id, tiers_id, evenement, canal, cle, detail, version_passage)
  values (p.client_id, p.id, p.chantier_id, p.entite_id, p.tiers_id, p_reponse, nullif(p_detail ->> 'canal', ''), btrim(p_cle),
          coalesce(p_detail, '{}'::jsonb), p.version);
  if p_reponse = 'declinee' then
    select coalesce(jsonb_agg(jsonb_build_object('tiers', x.tiers_id, 'nom', x.nom, 'canal', x.canal, 'vigilance', x.vigilance)), '[]'::jsonb)
      into v_remplacants
    from (select * from private.btp_proposer_remplacants(p.id) limit 5) x;
    perform private.lever_alerte_module(p.client_id, 'daliro_referentiel', 'attention',
      left(format('%s a décliné son passage du %s sur %s', coalesce(v_tiers, 'Un sous-traitant'), to_char(p.debut, 'DD/MM'), c.nom), 150),
      jsonb_build_object('passage', p.id, 'chantier', p.chantier_id, 'tiers', p.tiers_id, 'debut', p.debut, 'remplacants', v_remplacants),
      'decline:' || p.id::text, true, c.conducteur_id);
    perform private.publier_evenement(p.client_id, 'daliro.passage_decline',
      jsonb_build_object('passage', p.id, 'chantier', p.chantier_id, 'tiers', p.tiers_id, 'debut', p.debut, 'remplacants', v_remplacants),
      'decline:' || p.id::text || ':v' || p.version);
  end if;
  perform private.journaliser(p.client_id, case p_reponse when 'confirmee' then 'daliro.passage_confirme' else 'daliro.passage_decline' end,
    'btp_passages', p.id::text, jsonb_build_object('tiers', p.tiers_id, 'debut', p.debut, 'cle', btrim(p_cle)), p.entite_id);
  return true;
end $function$;

-- Le passage quotidien (cron) : chaque organisation installée.
create or replace function private.btp_tache_confirmations()
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_res jsonb := '[]'::jsonb;
begin
  for r in select client_id from public.btp_reglages loop
    begin
      v_res := v_res || jsonb_build_object('client', r.client_id, 'resultat', private.btp_demander_confirmations(r.client_id, current_date));
    exception when others then
      perform private.lever_alerte_module(r.client_id, 'daliro_referentiel', 'critique',
        'La demande des confirmations à J-2 a échoué', jsonb_build_object('erreur', sqlerrm, 'code', sqlstate),
        'confirmations_echec', false, null);
      v_res := v_res || jsonb_build_object('client', r.client_id, 'erreur', sqlerrm);
    end;
  end loop;
  return v_res;
end $function$;

-- Façades publiques.
create or replace function public.btp_demander_confirmations(p_client uuid, p_jour date default current_date)
 returns jsonb language sql set search_path to ''
as $function$ select private.btp_demander_confirmations(p_client, p_jour) $function$;

create or replace function public.btp_repondre_confirmation(p_passage uuid, p_reponse text, p_cle text, p_detail jsonb default '{}'::jsonb)
 returns boolean language sql set search_path to ''
as $function$ select private.btp_repondre_confirmation(p_passage, p_reponse, p_cle, p_detail) $function$;

create or replace function public.btp_proposer_remplacants(p_passage uuid)
 returns table(tiers_id uuid, nom text, telephone text, email text, canal text, vigilance text, corps_commun boolean, departement_ok boolean)
 language sql stable set search_path to ''
as $function$ select * from private.btp_proposer_remplacants(p_passage) $function$;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt).
revoke execute on function private.btp_proposer_remplacants(uuid) from public, anon;
revoke execute on function private.btp_demander_confirmations(uuid, date) from public, anon;
revoke execute on function private.btp_repondre_confirmation(uuid, text, text, jsonb) from public, anon;
revoke execute on function private.btp_tache_confirmations() from public, anon, authenticated;
grant execute on function private.btp_proposer_remplacants(uuid) to authenticated, service_role;
grant execute on function private.btp_demander_confirmations(uuid, date) to authenticated, service_role;
grant execute on function private.btp_repondre_confirmation(uuid, text, text, jsonb) to authenticated, service_role;
grant execute on function private.btp_tache_confirmations() to service_role;
revoke execute on function public.btp_demander_confirmations(uuid, date) from public, anon;
revoke execute on function public.btp_repondre_confirmation(uuid, text, text, jsonb) from public, anon;
revoke execute on function public.btp_proposer_remplacants(uuid) from public, anon;
grant execute on function public.btp_demander_confirmations(uuid, date) to authenticated, service_role;
grant execute on function public.btp_repondre_confirmation(uuid, text, text, jsonb) to authenticated, service_role;
grant execute on function public.btp_proposer_remplacants(uuid) to authenticated, service_role;

do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select x from unnest(array['btp_confirmations']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;

-- Le cron : 17 h Paris (15 h UTC l'été, 16 h l'hiver — le socle planifie en UTC).
select cron.schedule('daliro-confirmations-j2', '0 15 * * *', $cron$select private.btp_tache_confirmations()$cron$)
where not exists (select 1 from cron.job where jobname = 'daliro-confirmations-j2');


-- ═══ omega/modules/daliro/migrations/b6_03_factures_chantier.sql @ b672b32
-- b6_03 — DALIRO : la facture fournisseur rattachée au chantier et au lot ; le déboursé par lot (session B6, 05/10/2026)
--
-- CE QUE ÇA CORRIGE. Un chantier reçoit des factures (sous-traitants,
-- fournisseurs, loueurs). FILED les reçoit, les lit et les contrôle ; DALIRO
-- a le marché, ses lots et leurs montants. Rien ne relie les deux : on ne
-- sait pas ce qu'un lot a coûté ni ce qu'il reste à facturer sur ce que le
-- marché (et ses avenants signés) engage.
--
-- CE QUI EST POSÉ.
--   · public.btp_factures_chantier : une facture FILED ↔ un chantier (+ un
--     lot, + le marché vérifié du moment) ; rattachée ou détachée (rien ne
--     s'efface), avec le motif et qui l'a fait.
--   · private.btp_rattacher_facture(p_facture, p_chantier, p_lot, p_motif) :
--     le bureau du chantier ; la facture est du même client ; si le lot est
--     exécuté par un tiers, le SIREN du fournisseur de la facture doit être
--     celui du tiers (sinon refus : « ce n'est pas le sous-traitant du lot »).
--   · private.btp_detacher_facture(p_facture, p_motif).
--   · vues (security_invoker : la RLS du lecteur s'applique) :
--     btp_factures_chantier_detail (facture, fournisseur, document, lot) et
--     btp_debourse_lots (engagé marché + avenants signés, facturé, reste) —
--     montants cachés sans le droit voir_prix, comme les vues chiffrées.
--   · journal : private.journaliser seulement (daliro.facture_rattachee /
--     daliro.facture_detachee).
--
-- Règles de pose : create or replace / if not exists / where not exists ;
-- jamais de DROP ni de DELETE.

create table if not exists public.btp_factures_chantier (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  facture_id uuid not null references public.filed_factures(id) on delete cascade,
  document_id uuid,
  chantier_id uuid not null,
  entite_id uuid not null,
  lot_id uuid,
  marche_id uuid,
  statut text not null default 'rattachee',
  motif text,
  fournisseur_siren text,
  tiers_id uuid,
  rattache_par uuid,
  rattache_libelle text,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint btp_factures_chantier_client_id_id_key unique (client_id, id),
  constraint btp_factures_chantier_une_facture unique (client_id, facture_id),
  constraint btp_factures_chantier_chantier_fkey foreign key (client_id, chantier_id) references public.btp_chantiers(client_id, id) on delete cascade,
  constraint btp_factures_chantier_lot_fkey foreign key (chantier_id, lot_id) references public.btp_lots(chantier_id, id) on delete set null (lot_id),
  constraint btp_factures_chantier_marche_fkey foreign key (client_id, marche_id) references public.btp_marches(client_id, id) on delete set null (marche_id),
  constraint btp_factures_chantier_tiers_fkey foreign key (client_id, tiers_id) references public.btp_tiers(client_id, id) on delete set null (tiers_id),
  constraint btp_factures_chantier_statut_check check (statut in ('rattachee', 'detachee')),
  constraint btp_factures_chantier_motif_check check (char_length(motif) <= 500)
);
comment on table public.btp_factures_chantier is 'DALIRO — une facture fournisseur (FILED) rattachée à un chantier et à un lot ; détachée plutôt qu''effacée.';
create index if not exists btp_factures_chantier_chantier_idx on public.btp_factures_chantier (chantier_id, statut);

alter table public.btp_factures_chantier enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_factures_chantier' and policyname = 'membres lisent les factures de leurs chantiers') then
    create policy "membres lisent les factures de leurs chantiers" on public.btp_factures_chantier
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $do$;
revoke all on table public.btp_factures_chantier from anon, authenticated;
grant select on table public.btp_factures_chantier to authenticated;

create or replace function private.btp_preparer_facture_chantier()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.client_id := old.client_id;
    new.facture_id := old.facture_id;
    new.cree_le := old.cree_le;
  end if;
  select c.entite_id into new.entite_id from public.btp_chantiers c
  where c.client_id = new.client_id and c.id = new.chantier_id;
  if new.entite_id is null then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  new.maj_le := now();
  return new;
end $function$;

create or replace trigger btp_factures_chantier_preparer before insert or update on public.btp_factures_chantier
  for each row execute function private.btp_preparer_facture_chantier();
create or replace trigger btp_factures_chantier_tracer after insert or delete or update on public.btp_factures_chantier
  for each row execute function private.tracer('maj_le');

-- ─────────────────────────────────────────────────────────────────────────
-- Rattacher / détacher
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_rattacher_facture(p_facture uuid, p_chantier uuid, p_lot uuid default null, p_motif text default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  f record;
  c public.btp_chantiers;
  l public.btp_lots;
  t public.btp_tiers;
  v_siren text;
  v_fournisseur text;
  v_marche uuid;
  v_acteur record;
  v_id uuid;
  v_avis text := null;
begin
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(c.client_id, c.entite_id);
  select ff.id, ff.client_id, ff.document_id, ff.fournisseur_id, ff.montant_ht, ff.statut, ff.numero,
         fo.siren, fo.nom as fournisseur_nom
    into f
  from public.filed_factures ff
  left join public.filed_fournisseurs fo on fo.id = ff.fournisseur_id
  where ff.id = p_facture;
  if not found or f.client_id <> c.client_id then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  v_siren := f.siren;
  v_fournisseur := f.fournisseur_nom;
  if p_lot is not null then
    select * into l from public.btp_lots where chantier_id = c.id and id = p_lot;
    if not found then
      raise exception 'Ce lot n''est pas un lot du chantier.' using errcode = '23514';
    end if;
    if l.tiers_id is not null then
      select * into t from public.btp_tiers where id = l.tiers_id;
      if t.siren is not null and v_siren is not null and t.siren <> v_siren then
        raise exception 'Le fournisseur de la facture (%, SIREN %) n''est pas l''entreprise du lot % (%, SIREN %).',
          coalesce(v_fournisseur, '?'), v_siren, l.code, t.nom, t.siren using errcode = '23514';
      end if;
      if t.siren is null or v_siren is null then
        v_avis := 'SIREN non comparé : ' || case when t.siren is null then 'le tiers du lot n''a pas de SIREN' else 'le fournisseur de la facture n''a pas de SIREN' end;
      end if;
    end if;
  end if;
  select m.id into v_marche from public.btp_marches m
  where m.client_id = c.client_id and m.chantier_id = c.id and m.statut = 'verifie'
  order by m.verifie_le desc nulls last limit 1;
  select * into v_acteur from private.acteur_courant();
  insert into public.btp_factures_chantier (client_id, facture_id, document_id, chantier_id, lot_id, marche_id, statut, motif,
                                            fournisseur_siren, tiers_id, rattache_par, rattache_libelle)
  values (c.client_id, f.id, f.document_id, c.id, p_lot, v_marche, 'rattachee', nullif(btrim(p_motif), ''),
          v_siren, l.tiers_id, v_acteur.acteur_id, v_acteur.acteur_libelle)
  on conflict (client_id, facture_id) do update
    set chantier_id = excluded.chantier_id, lot_id = excluded.lot_id, marche_id = excluded.marche_id, statut = 'rattachee',
        motif = excluded.motif, fournisseur_siren = excluded.fournisseur_siren, tiers_id = excluded.tiers_id,
        rattache_par = excluded.rattache_par, rattache_libelle = excluded.rattache_libelle
  returning id into v_id;
  perform private.journaliser(c.client_id, 'daliro.facture_rattachee', 'btp_factures_chantier', v_id::text,
    jsonb_build_object('facture', f.id, 'numero', f.numero, 'document', f.document_id, 'chantier', c.id, 'lot', p_lot,
                       'marche', v_marche, 'fournisseur', v_fournisseur, 'siren', v_siren, 'motif', nullif(btrim(p_motif), ''),
                       'avis', v_avis), c.entite_id);
  return v_id;
end $function$;

create or replace function private.btp_detacher_facture(p_facture uuid, p_motif text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x public.btp_factures_chantier;
begin
  select * into x from public.btp_factures_chantier where facture_id = p_facture and statut = 'rattachee' for update;
  if not found then
    raise exception 'Cette facture n''est rattachée à aucun chantier.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(x.client_id, x.entite_id);
  if coalesce(btrim(p_motif), '') = '' then
    raise exception 'Une facture se détache avec son motif.' using errcode = '22023';
  end if;
  update public.btp_factures_chantier set statut = 'detachee', motif = btrim(p_motif) where id = x.id;
  perform private.journaliser(x.client_id, 'daliro.facture_detachee', 'btp_factures_chantier', x.id::text,
    jsonb_build_object('facture', x.facture_id, 'chantier', x.chantier_id, 'lot', x.lot_id, 'motif', btrim(p_motif)), x.entite_id);
end $function$;

create or replace function public.btp_rattacher_facture(p_facture uuid, p_chantier uuid, p_lot uuid default null, p_motif text default null)
 returns uuid language sql set search_path to ''
as $function$ select private.btp_rattacher_facture(p_facture, p_chantier, p_lot, p_motif) $function$;

create or replace function public.btp_detacher_facture(p_facture uuid, p_motif text)
 returns void language sql set search_path to ''
as $function$ select private.btp_detacher_facture(p_facture, p_motif) $function$;

revoke execute on function private.btp_rattacher_facture(uuid, uuid, uuid, text) from public, anon;
revoke execute on function private.btp_detacher_facture(uuid, text) from public, anon;
grant execute on function private.btp_rattacher_facture(uuid, uuid, uuid, text) to authenticated, service_role;
grant execute on function private.btp_detacher_facture(uuid, text) to authenticated, service_role;
revoke execute on function public.btp_rattacher_facture(uuid, uuid, uuid, text) from public, anon;
revoke execute on function public.btp_detacher_facture(uuid, text) from public, anon;
grant execute on function public.btp_rattacher_facture(uuid, uuid, uuid, text) to authenticated, service_role;
grant execute on function public.btp_detacher_facture(uuid, text) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Vues (la RLS du lecteur s'applique : security_invoker)
-- ─────────────────────────────────────────────────────────────────────────
create or replace view public.btp_factures_chantier_detail with (security_invoker = true) as
 select x.id, x.client_id, x.facture_id, x.document_id, x.chantier_id, x.lot_id, x.marche_id, x.statut, x.motif,
        x.fournisseur_siren, x.tiers_id, x.rattache_par, x.rattache_libelle, x.cree_le, x.maj_le,
        l.code as lot_code, l.libelle as lot_libelle,
        f.numero as facture_numero, f.nature as facture_nature, f.date_emission, f.echeance_lue, f.statut as facture_statut,
        f.fournisseur_id, fo.nom as fournisseur_nom,
        d.reference as document_reference,
        case when private.btp_est_serveur() or private.btp_voit_prix(x.client_id) then f.montant_ht end as montant_ht,
        case when private.btp_est_serveur() or private.btp_voit_prix(x.client_id) then f.montant_ttc end as montant_ttc
   from public.btp_factures_chantier x
   join public.filed_factures f on f.id = x.facture_id
   left join public.filed_fournisseurs fo on fo.id = f.fournisseur_id
   left join public.filed_documents d on d.id = f.document_id
   left join public.btp_lots l on l.chantier_id = x.chantier_id and l.id = x.lot_id;

create or replace view public.btp_debourse_lots with (security_invoker = true) as
 with marche as (
   select li.client_id, li.chantier_id, li.lot_id, sum(li.montant_ht) as engage
   from public.btp_lignes_marche li
   join public.btp_marches m on m.client_id = li.client_id and m.id = li.marche_id
   where m.statut = 'verifie' and li.nature <> 'option' and li.lot_id is not null
   group by li.client_id, li.chantier_id, li.lot_id
 ), avenants as (
   select al.client_id, al.chantier_id, al.lot_id, sum(al.montant_ht) as engage
   from public.btp_avenants_lignes al
   join public.btp_avenants a on a.client_id = al.client_id and a.id = al.avenant_id
   where a.statut = 'signe' and not al.retiree and al.lot_id is not null
   group by al.client_id, al.chantier_id, al.lot_id
 ), factures as (
   select x.client_id, x.chantier_id, x.lot_id, count(*)::integer as nb, sum(f.montant_ht) as facture
   from public.btp_factures_chantier x
   join public.filed_factures f on f.id = x.facture_id
   where x.statut = 'rattachee' and f.statut <> 'ecartee' and x.lot_id is not null
   group by x.client_id, x.chantier_id, x.lot_id
 )
 select l.client_id, l.chantier_id, l.id as lot_id, l.code, l.libelle, l.execution, l.tiers_id, l.statut as lot_statut,
        coalesce(f.nb, 0) as nb_factures,
        case when private.btp_est_serveur() or private.btp_voit_prix(l.client_id) then coalesce(m.engage, 0) end as engage_marche_ht,
        case when private.btp_est_serveur() or private.btp_voit_prix(l.client_id) then coalesce(a.engage, 0) end as engage_avenants_ht,
        case when private.btp_est_serveur() or private.btp_voit_prix(l.client_id) then coalesce(f.facture, 0) end as facture_ht,
        case when private.btp_est_serveur() or private.btp_voit_prix(l.client_id)
             then coalesce(m.engage, 0) + coalesce(a.engage, 0) - coalesce(f.facture, 0) end as reste_ht
   from public.btp_lots l
   left join marche m on m.client_id = l.client_id and m.lot_id = l.id
   left join avenants a on a.client_id = l.client_id and a.lot_id = l.id
   left join factures f on f.client_id = l.client_id and f.lot_id = l.id;

revoke all on public.btp_factures_chantier_detail from anon;
revoke all on public.btp_debourse_lots from anon;
grant select on public.btp_factures_chantier_detail to authenticated;
grant select on public.btp_debourse_lots to authenticated;

do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select x from unnest(array['btp_factures_chantier']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;


-- ═══ omega/modules/daliro/migrations/b6_04_installer_et_tableau.sql @ b672b32
-- b6_04 — DALIRO : l'installation gardée, la liste et le tableau d'un chantier en un appel (session B6, 05/10/2026)
--
-- CE QUE ÇA CORRIGE.
--   1. private.btp_installer n'exige rien : la façade publique installe (ou
--      change) la formule de N'IMPORTE QUELLE organisation pour qui l'appelle.
--      Elle est désormais réservée au serveur d'Omega ou au gérant de
--      l'organisation, et s'inscrit au journal (daliro.installe).
--   2. L'écran /espace/daliro aurait douze requêtes à faire pour montrer un
--      chantier (chantier, étape, lots, marchés et lignes, contrôles, passages
--      et confirmations, dépendances, acceptations, avenants, factures,
--      déboursé). Deux fonctions de LECTURE, SECURITY INVOKER (la RLS du
--      lecteur s'applique, les prix restent cachés sans voir_prix) :
--        · public.btp_liste_chantiers() → jsonb : mes chantiers avec leur
--          étape, leurs contrôles bloquants / à voir et leur prochain passage ;
--        · public.btp_tableau_chantier(p_chantier) → jsonb : tout le chantier.
--
-- Règles de pose : create or replace ; jamais de DROP ni de DELETE.

create or replace function private.btp_installer(p_client uuid, p_formule text, p_quota_chantiers integer default null, p_quota_comptes integer default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_id uuid;
  v_avant record;
begin
  if not private.btp_est_serveur() then
    if (select auth.uid()) is null or not private.a_un_role(p_client, array['gerant']) then
      raise exception 'Daliro s''installe par Omega ou par le gérant de l''organisation.' using errcode = '42501';
    end if;
  end if;
  if not exists (select 1 from public.clients where id = p_client) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  select r.formule, r.quota_chantiers, r.quota_comptes_bureau into v_avant from public.btp_reglages r where r.client_id = p_client;
  insert into public.btp_reglages (client_id, formule, quota_chantiers, quota_comptes_bureau)
  values (p_client, p_formule, p_quota_chantiers, p_quota_comptes)
  on conflict (client_id) do update
    set formule = excluded.formule,
        quota_chantiers = excluded.quota_chantiers,
        quota_comptes_bureau = excluded.quota_comptes_bureau
  returning id into v_id;
  perform private.journaliser(p_client, 'daliro.installe', 'btp_reglages', v_id::text,
    jsonb_build_object('formule', p_formule, 'quota_chantiers', p_quota_chantiers, 'quota_comptes', p_quota_comptes,
                       'avant', case when v_avant.formule is null then null
                                     else jsonb_build_object('formule', v_avant.formule, 'quota_chantiers', v_avant.quota_chantiers,
                                                             'quota_comptes', v_avant.quota_comptes_bureau) end), null);
  return v_id;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Mes chantiers, en un appel (RLS du lecteur)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_liste_chantiers()
 returns jsonb
 language sql
 stable security invoker
 set search_path to ''
as $function$
  select coalesce(jsonb_agg(x order by (x ->> 'statut') = 'ouvert' desc, (x ->> 'statut') = 'preparation' desc, x ->> 'nom'), '[]'::jsonb)
  from (
    select to_jsonb(c)
        || jsonb_build_object(
             'etape', (select to_jsonb(e) from public.btp_chantiers_etape e where e.chantier_id = c.id),
             'maitre_ouvrage_nom', (select t.nom from public.btp_tiers t where t.id = c.maitre_ouvrage_id),
             'nb_lots', (select count(*) from public.btp_lots l where l.chantier_id = c.id),
             'nb_bloquants', (select count(*) from public.btp_controle k where k.chantier_id = c.id and k.gravite = 'bloquant'),
             'nb_attention', (select count(*) from public.btp_controle k where k.chantier_id = c.id and k.gravite = 'attention'),
             'marche_verifie', exists (select 1 from public.btp_marches m where m.chantier_id = c.id and m.statut = 'verifie'),
             'prochain_passage', (select to_jsonb(p) from (
                 select p.id, p.debut, p.fin, p.tache, p.confirmation, p.intervenant_type,
                        coalesce(e.nom, t.nom, p.intervenant_lu) as intervenant_nom
                 from public.btp_passages p
                 left join public.btp_equipes e on e.id = p.equipe_id
                 left join public.btp_tiers t on t.id = p.tiers_id
                 where p.chantier_id = c.id and p.statut = 'prevu' and p.fin >= current_date
                 order by p.debut, p.id limit 1) p),
             'nb_avenants_en_cours', (select count(*) from public.btp_avenants a where a.chantier_id = c.id and a.statut in ('brouillon', 'soumis')),
             'nb_avenants_signes', (select count(*) from public.btp_avenants a where a.chantier_id = c.id and a.statut = 'signe'))
    from public.btp_chantiers c
  ) s(x)
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Le tableau complet d'un chantier (RLS du lecteur ; null s'il ne le voit pas)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_tableau_chantier(p_chantier uuid)
 returns jsonb
 language plpgsql
 stable security invoker
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
  v jsonb;
begin
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    return null;
  end if;
  v := jsonb_build_object(
    'chantier', to_jsonb(c) || jsonb_build_object(
        'maitre_ouvrage_nom', (select t.nom from public.btp_tiers t where t.id = c.maitre_ouvrage_id),
        'maitre_oeuvre_nom', (select t.nom from public.btp_tiers t where t.id = c.maitre_oeuvre_id),
        'donneur_ordre_nom', (select t.nom from public.btp_tiers t where t.id = c.donneur_ordre_id),
        'etape', (select to_jsonb(e) from public.btp_chantiers_etape e where e.chantier_id = c.id)),
    'reglages', (select to_jsonb(r) from public.btp_reglages r where r.client_id = c.client_id),
    'voit_prix', public.btp_voit_prix(c.client_id),
    'lots', (select coalesce(jsonb_agg(to_jsonb(l) || jsonb_build_object(
        'tiers_nom', (select t.nom from public.btp_tiers t where t.id = l.tiers_id),
        'equipe_nom', (select e.nom from public.btp_equipes e where e.id = l.equipe_id),
        'corps_etat_libelle', (select ce.libelle from public.btp_corps_etat ce where ce.code = l.corps_etat),
        'acceptation', (select a.statut from public.btp_acceptations a where a.chantier_id = l.chantier_id and a.tiers_id = l.tiers_id order by a.maj_le desc limit 1))
        order by l.rang, l.code collate "C"), '[]'::jsonb)
      from public.btp_lots l where l.chantier_id = c.id),
    'marches', (select coalesce(jsonb_agg(to_jsonb(m) || jsonb_build_object(
        'lignes', (select coalesce(jsonb_agg(to_jsonb(li) order by li.ordre), '[]'::jsonb) from public.btp_lignes_marche_chiffrees li where li.marche_id = m.id),
        'controles', (select coalesce(jsonb_agg(to_jsonb(k) order by k.ordre nulls last), '[]'::jsonb) from public.btp_controle_marches k where k.marche_id = m.id))
        order by m.statut = 'verifie' desc, m.verifie_le desc nulls last, m.cree_le desc), '[]'::jsonb)
      from public.btp_marches_chiffres m where m.chantier_id = c.id),
    'controles', (select coalesce(jsonb_agg(to_jsonb(k) order by case k.gravite when 'bloquant' then 0 when 'attention' then 1 else 2 end, k.code), '[]'::jsonb)
      from public.btp_controle k where k.chantier_id = c.id),
    'controles_organisation', (select coalesce(jsonb_agg(to_jsonb(k) order by case k.gravite when 'bloquant' then 0 when 'attention' then 1 else 2 end, k.code), '[]'::jsonb)
      from public.btp_controle k where k.client_id = c.client_id and k.chantier_id is null),
    'passages', (select coalesce(jsonb_agg(to_jsonb(p) || jsonb_build_object(
        'lot_code', (select l.code from public.btp_lots l where l.id = p.lot_id),
        'lot_libelle', (select l.libelle from public.btp_lots l where l.id = p.lot_id),
        'intervenant_nom', coalesce((select e.nom from public.btp_equipes e where e.id = p.equipe_id), (select t.nom from public.btp_tiers t where t.id = p.tiers_id), p.intervenant_lu),
        'confirmations', (select coalesce(jsonb_agg(to_jsonb(x) order by x.survenu_le), '[]'::jsonb) from public.btp_confirmations x where x.passage_id = p.id))
        order by p.debut, p.fin, p.id), '[]'::jsonb)
      from public.btp_passages p where p.chantier_id = c.id and p.statut <> 'annule' and p.fin >= current_date - 14),
    'dependances', (select coalesce(jsonb_agg(to_jsonb(d) || jsonb_build_object(
        'amont_tache', (select coalesce(a.tache, a.intervenant_lu) from public.btp_passages a where a.id = d.amont_id),
        'aval_tache', (select coalesce(b.tache, b.intervenant_lu) from public.btp_passages b where b.id = d.aval_id))
        order by d.cree_le), '[]'::jsonb)
      from public.btp_dependances d where d.chantier_id = c.id),
    'acceptations', (select coalesce(jsonb_agg(to_jsonb(a) || jsonb_build_object('tiers_nom', (select t.nom from public.btp_tiers t where t.id = a.tiers_id)) order by a.cree_le), '[]'::jsonb)
      from public.btp_acceptations a where a.chantier_id = c.id),
    'avenants', (select coalesce(jsonb_agg(to_jsonb(a) || jsonb_build_object(
        'lignes', (select coalesce(jsonb_agg(to_jsonb(li) order by li.ordre), '[]'::jsonb) from public.btp_avenants_lignes_chiffrees li where li.avenant_id = a.id),
        'demande_statut', (select d.statut from public.demandes_validation d where d.id = a.demande_id))
        order by a.numero), '[]'::jsonb)
      from public.btp_avenants_chiffres a where a.chantier_id = c.id),
    'factures', (select coalesce(jsonb_agg(to_jsonb(f) order by f.date_emission desc nulls last, f.cree_le desc), '[]'::jsonb)
      from public.btp_factures_chantier_detail f where f.chantier_id = c.id and f.statut = 'rattachee'),
    'debourse', (select coalesce(jsonb_agg(to_jsonb(d) order by d.code collate "C"), '[]'::jsonb)
      from public.btp_debourse_lots d where d.chantier_id = c.id),
    'tiers', (select coalesce(jsonb_agg(to_jsonb(t) || jsonb_build_object('vigilance', public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le)) order by t.nom collate "C"), '[]'::jsonb)
      from public.btp_tiers t where t.client_id = c.client_id and t.actif),
    'equipes', (select coalesce(jsonb_agg(to_jsonb(e) order by e.nom collate "C"), '[]'::jsonb) from public.btp_equipes e where e.client_id = c.client_id and e.actif),
    'bibliotheque', (select coalesce(jsonb_agg(to_jsonb(b) order by b.designation collate "C"), '[]'::jsonb)
      from public.btp_bibliotheque_chiffree b where b.client_id = c.client_id and b.statut in ('valide', 'propose')));
  return v;
end $function$;

revoke execute on function public.btp_liste_chantiers() from public, anon;
revoke execute on function public.btp_tableau_chantier(uuid) from public, anon;
grant execute on function public.btp_liste_chantiers() to authenticated, service_role;
grant execute on function public.btp_tableau_chantier(uuid) to authenticated, service_role;
