-- 20260928222752 daliro_m0b_marches
-- Source : statements de la recette.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : aucune.
-- ═══════════════════════════════════════════════════════════════════════════
-- Daliro (BTP), M0 RÉFÉRENTIEL, partie b — les marchés ligne à ligne, leur
-- écran de contrôle, la bibliothèque de prix, et les prix masqués.
--
-- Plan : OMEGA/moteurs/btp.md (M0, étapes 2 à 4 ; §3.3).
-- Preuves : supabase/tests/database/daliro_m0b_marches.test.sql
--
--  · un marché importé naît « à vérifier » : aucun moteur ne chiffre dessus
--    avant qu'une personne l'ait vérifié ligne à ligne ;
--  · la base recalcule chaque ligne (quantité × prix = montant, à 0,01 €) et
--    le total (à 1 €) ; un écart se corrige, ou s'accepte avec son motif ;
--  · vérifié, un marché est figé ; seul le gérant le rouvre, avec un motif ;
--  · ce que l'import a lu reste gardé : on mesure la part des lignes justes
--    du premier coup (indicateur de M0 : 95 %) ;
--  · les prix ne se lisent qu'avec le droit « voir_prix » (formule
--    Démarrage : tous les comptes, la formule n'ayant pas de rôles et droits) ;
--    le journal garde qui a changé un prix, jamais sa valeur ;
--  · la bibliothèque de prix apprend des marchés vérifiés ; un prix n'y vaut
--    qu'une fois validé par qui en a le droit (daliro.valider_prix).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Outils ─────────────────────────────────────────────────────────────

-- L'unité d'une ligne, ramenée à un code : m² → m2, M.L. → ml, Fft → forfait…
create function private.btp_unite(p text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select case u
    when 'u' then 'u' when 'un' then 'u' when 'unite' then 'u' when 'unites' then 'u' when 'pce' then 'u'
    when 'pc' then 'u' when 'piece' then 'u' when 'pieces' then 'u' when 'nb' then 'u' when 'nombre' then 'u'
    when 'ens' then 'ens' when 'ensemble' then 'ens'
    when 'ft' then 'forfait' when 'fft' then 'forfait' when 'forfait' then 'forfait' when 'f' then 'forfait'
    when 'forf' then 'forfait'
    when 'm' then 'ml' when 'ml' then 'ml' when 'm l' then 'ml' when 'lm' then 'ml' when 'metre' then 'ml'
    when 'metres' then 'ml' when 'metre lineaire' then 'ml' when 'metres lineaires' then 'ml'
    when 'm2' then 'm2' when 'm 2' then 'm2' when 'metre carre' then 'm2' when 'metres carres' then 'm2'
    when 'm3' then 'm3' when 'm 3' then 'm3' when 'metre cube' then 'm3' when 'metres cubes' then 'm3'
    when 'kg' then 'kg' when 'kilo' then 'kg' when 'kilos' then 'kg' when 'kilogramme' then 'kg'
    when 'kilogrammes' then 'kg'
    when 't' then 't' when 'tonne' then 't' when 'tonnes' then 't'
    when 'l' then 'l' when 'litre' then 'l' when 'litres' then 'l'
    when 'h' then 'h' when 'heure' then 'h' when 'heures' then 'h' when 'hr' then 'h'
    when 'j' then 'j' when 'jour' then 'j' when 'jours' then 'j'
    when 'sem' then 'sem' when 'semaine' then 'sem' when 'semaines' then 'sem'
    when 'mois' then 'mois'
  end
  from (select private.btp_normaliser(replace(replace(p, '²', '2'), '³', '3')) as u) x
$$;
revoke all on function private.btp_unite(text) from public;
grant execute on function private.btp_unite(text) to authenticated, service_role;

-- Voir les prix : le droit nommé du socle ; en formule Démarrage, qui n'a
-- pas de rôles et droits, tout membre de l'organisation.
create function private.btp_voit_prix(p_client uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null
     and exists (select 1 from public.comptes c where c.client_id = p_client and c.user_id = (select auth.uid()))
     and (private.a_le_droit(p_client, 'voir_prix')
          or exists (select 1 from public.btp_reglages r where r.client_id = p_client and r.formule = 'demarrage'))
$$;
revoke all on function private.btp_voit_prix(uuid) from public;
grant execute on function private.btp_voit_prix(uuid) to authenticated, service_role;

create function public.btp_voit_prix(p_client uuid) returns boolean
language sql stable security invoker set search_path = '' as $$
  select private.btp_voit_prix(p_client)
$$;
revoke all on function public.btp_voit_prix(uuid) from public, anon;
grant execute on function public.btp_voit_prix(uuid) to authenticated, service_role;

-- Qui écrit un marché : le serveur d'Omega (installation), ou le bureau
-- (gérant, admin, valideur) qui voit le chantier et ses prix.
create function private.btp_exiger_bureau(p_client uuid, p_entite uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  v_role text := coalesce(nullif(current_setting('role', true), 'none'), session_user::text);
begin
  if (select auth.uid()) is null then
    if v_role not in ('service_role', 'postgres') then
      raise exception 'Réservé au bureau du client ou au serveur d''Omega.' using errcode = '42501';
    end if;
    return;
  end if;
  if not private.a_un_role(p_client, array['gerant', 'admin', 'valideur'])
     or not private.voit_entite(p_client, p_entite) then
    raise exception 'Ce marché ne vous est pas ouvert.' using errcode = '42501';
  end if;
  if not private.btp_voit_prix(p_client) then
    raise exception 'Il faut le droit de voir les prix pour tenir un marché.' using errcode = '42501';
  end if;
end $$;
revoke all on function private.btp_exiger_bureau(uuid, uuid) from public;

-- Un effacement déclaré (objet ou organisation) : rien ne résiste.
create function private.btp_en_effacement(p_client uuid) returns boolean
language sql stable set search_path = '' as $$
  select coalesce(current_setting('omega.effacement_objet', true), '') = 'oui'
      or coalesce(current_setting('omega.effacement_client', true), '') = p_client::text
$$;
revoke all on function private.btp_en_effacement(uuid) from public;

-- ── 2. Les marchés ───────────────────────────────────────────────────────

create table public.btp_marches (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  chantier_id uuid not null,
  entite_id uuid not null,
  reference text check (char_length(reference) <= 60),
  objet text check (char_length(objet) <= 500),
  date_signature date,
  mode_prix text not null check (mode_prix in ('forfait', 'unitaire', 'mixte')),
  montant_ht_declare numeric(14,2) check (montant_ht_declare >= 0),
  retenue_taux numeric(5,4) not null default 0 check (retenue_taux between 0 and 0.05),
  retenue_base text not null default 'ttc' check (retenue_base in ('ht', 'ttc')),
  retenue_caution boolean not null default false,
  source text not null default 'saisie' check (source in ('saisie', 'tableur', 'pdf', 'api')),
  piece_id uuid,
  statut text not null default 'a_verifier' check (statut in ('a_verifier', 'verifie')),
  verifie_par uuid,
  verifie_libelle text,
  verifie_le timestamptz,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint btp_marches_client_id_id_key unique (client_id, id),
  constraint btp_marches_chantier_fkey foreign key (client_id, chantier_id)
    references public.btp_chantiers (client_id, id) on delete cascade,
  constraint btp_marches_piece_fkey foreign key (client_id, piece_id)
    references public.pieces (client_id, id) on delete set null (piece_id),
  constraint btp_marches_verification check (statut <> 'verifie' or verifie_le is not null)
);
comment on table public.btp_marches is
  'Les marchés signés (devis acceptés) d''un chantier. À vérifier tant qu''une personne n''a pas contrôlé leurs lignes.';
comment on column public.btp_marches.retenue_taux is 'Retenue de garantie, 5 % au plus (loi n° 71-584 du 16 juillet 1971).';
comment on column public.btp_marches.retenue_caution is 'Vrai : une caution remplace la retenue, rien n''est retenu sur les situations.';
create index btp_marches_chantier_idx on public.btp_marches (client_id, chantier_id);
create index btp_marches_piece_idx on public.btp_marches (client_id, piece_id);

create function private.btp_preparer_marche() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_porte text := coalesce(current_setting('daliro.porte', true), '');
begin
  if tg_op = 'DELETE' then
    if old.statut = 'verifie' and not private.btp_en_effacement(old.client_id) then
      raise exception 'Un marché vérifié ne s''efface pas.' using errcode = '42501';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.client_id := old.client_id;
    new.chantier_id := old.chantier_id;
    new.source := old.source;
    new.cree_le := old.cree_le;
  end if;
  select c.entite_id into new.entite_id from public.btp_chantiers c
  where c.client_id = new.client_id and c.id = new.chantier_id;
  if new.entite_id is null then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  if tg_op = 'INSERT' then
    new.statut := 'a_verifier';
    new.verifie_par := null;
    new.verifie_libelle := null;
    new.verifie_le := null;
  elsif new.statut is distinct from old.statut then
    if not ((old.statut = 'a_verifier' and new.statut = 'verifie' and v_porte = 'verifier')
         or (old.statut = 'verifie' and new.statut = 'a_verifier' and v_porte = 'rouvrir')) then
      raise exception 'Un marché ne se vérifie et ne se rouvre que par ses portes.' using errcode = '42501';
    end if;
    if new.statut = 'a_verifier' then
      new.verifie_par := null;
      new.verifie_libelle := null;
      new.verifie_le := null;
    end if;
  elsif old.statut = 'verifie'
        and (new.reference, new.objet, new.date_signature, new.mode_prix, new.montant_ht_declare,
             new.retenue_taux, new.retenue_base, new.piece_id, new.verifie_par, new.verifie_libelle, new.verifie_le)
            is distinct from
            (old.reference, old.objet, old.date_signature, old.mode_prix, old.montant_ht_declare,
             old.retenue_taux, old.retenue_base, old.piece_id, old.verifie_par, old.verifie_libelle, old.verifie_le) then
    raise exception 'Un marché vérifié est figé : rouvrez-le pour le corriger.' using errcode = '42501';
  end if;
  new.maj_le := now();
  return new;
end $$;
revoke all on function private.btp_preparer_marche() from public;

create trigger btp_marches_preparer before insert or update or delete on public.btp_marches
  for each row execute function private.btp_preparer_marche();

-- ── 3. Les lignes d'un marché ────────────────────────────────────────────

create table public.btp_lignes_marche (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  chantier_id uuid not null,
  entite_id uuid not null,
  marche_id uuid not null,
  lot_id uuid,
  ordre integer not null default 0 check (ordre >= 0),
  numero text check (char_length(numero) <= 30),
  section text check (char_length(section) <= 300),
  designation text not null check (char_length(btrim(designation)) between 1 and 2000),
  designation_normalisee text generated always as (private.btp_normaliser(designation)) stored,
  unite_lue text check (char_length(unite_lue) <= 30),
  unite text check (unite in ('u', 'ens', 'forfait', 'ml', 'm2', 'm3', 'kg', 't', 'l', 'h', 'j', 'sem', 'mois')),
  quantite numeric(14,3),
  prix_unitaire_ht numeric(14,4),
  montant_ht numeric(14,2),
  nature text not null default 'ouvrage' check (nature in ('ouvrage', 'fourniture', 'forfait', 'option')),
  ecart numeric(14,2) generated always as (montant_ht - round(quantite * prix_unitaire_ht, 2)) stored,
  controle text generated always as (
    case
      when nature = 'forfait' then
        case when montant_ht is null then 'incomplet'
             when quantite is not null and prix_unitaire_ht is not null
                  and abs(round(quantite * prix_unitaire_ht, 2) - montant_ht) > 0.01 then 'montant_faux'
             else 'ok' end
      when quantite is null or prix_unitaire_ht is null or montant_ht is null or unite is null then 'incomplet'
      when abs(round(quantite * prix_unitaire_ht, 2) - montant_ht) > 0.01 then 'montant_faux'
      else 'ok'
    end) stored,
  ecart_accepte boolean not null default false,
  ecart_motif text check (char_length(ecart_motif) <= 500),
  lu jsonb not null default '{}'::jsonb,
  corrigee boolean not null default false,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint btp_lignes_marche_client_id_id_key unique (client_id, id),
  constraint btp_lignes_marche_marche_fkey foreign key (client_id, marche_id)
    references public.btp_marches (client_id, id) on delete cascade,
  constraint btp_lignes_marche_lot_fkey foreign key (chantier_id, lot_id)
    references public.btp_lots (chantier_id, id) on delete set null (lot_id),
  constraint btp_lignes_marche_motif check (not ecart_accepte or ecart_motif is not null)
);
comment on table public.btp_lignes_marche is
  'Les lignes d''un marché. controle : ok, incomplet ou montant_faux, recalculé par la base. lu : ce que l''import avait lu.';
create index btp_lignes_marche_marche_idx on public.btp_lignes_marche (client_id, marche_id, ordre);
create index btp_lignes_marche_lot_idx on public.btp_lignes_marche (chantier_id, lot_id);
create index btp_lignes_marche_recherche_idx on public.btp_lignes_marche (client_id, designation_normalisee, unite);

create function private.btp_preparer_ligne_marche() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_m record;
begin
  if tg_op = 'DELETE' then
    select m.statut into v_m from public.btp_marches m where m.client_id = old.client_id and m.id = old.marche_id;
    if found and v_m.statut = 'verifie' and not private.btp_en_effacement(old.client_id) then
      raise exception 'Un marché vérifié est figé : ses lignes ne changent plus.' using errcode = '42501';
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.client_id := old.client_id;
    new.marche_id := old.marche_id;
    new.lu := old.lu;
    new.cree_le := old.cree_le;
  end if;
  select m.chantier_id, m.entite_id, m.statut into v_m from public.btp_marches m
  where m.client_id = new.client_id and m.id = new.marche_id;
  if not found then
    raise exception 'Marché introuvable.' using errcode = 'P0002';
  end if;
  if v_m.statut <> 'a_verifier' then
    raise exception 'Un marché vérifié est figé : ses lignes ne changent plus.' using errcode = '42501';
  end if;
  new.chantier_id := v_m.chantier_id;
  new.entite_id := v_m.entite_id;
  new.designation := btrim(new.designation);
  if tg_op = 'INSERT' then
    new.unite := coalesce(new.unite, private.btp_unite(new.unite_lue));
    new.lu := jsonb_build_object('designation', new.designation, 'unite', coalesce(new.unite_lue, new.unite),
                                 'quantite', new.quantite, 'prix_unitaire_ht', new.prix_unitaire_ht,
                                 'montant_ht', new.montant_ht, 'nature', new.nature);
    new.corrigee := false;
  else
    if new.unite_lue is distinct from old.unite_lue and new.unite is not distinct from old.unite then
      new.unite := private.btp_unite(new.unite_lue);
    end if;
    if (new.designation, new.unite, new.quantite, new.prix_unitaire_ht, new.montant_ht, new.nature)
       is distinct from (old.designation, old.unite, old.quantite, old.prix_unitaire_ht, old.montant_ht, old.nature) then
      new.corrigee := true;
      -- Un écart accepté l'était pour d'autres chiffres.
      if (new.quantite, new.prix_unitaire_ht, new.montant_ht) is distinct from (old.quantite, old.prix_unitaire_ht, old.montant_ht)
         and new.ecart_accepte is not distinct from old.ecart_accepte then
        new.ecart_accepte := false;
      end if;
    end if;
  end if;
  if not new.ecart_accepte then
    new.ecart_motif := null;
  end if;
  new.maj_le := now();
  return new;
end $$;
revoke all on function private.btp_preparer_ligne_marche() from public;

create trigger btp_lignes_marche_preparer before insert or update or delete on public.btp_lignes_marche
  for each row execute function private.btp_preparer_ligne_marche();

-- ── 4. La bibliothèque de prix ───────────────────────────────────────────

create table public.btp_bibliotheque_prix (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  designation text not null check (char_length(btrim(designation)) between 1 and 2000),
  designation_normalisee text generated always as (private.btp_normaliser(designation)) stored,
  unite text not null check (unite in ('u', 'ens', 'forfait', 'ml', 'm2', 'm3', 'kg', 't', 'l', 'h', 'j', 'sem', 'mois')),
  prix_unitaire_ht numeric(14,4) not null check (prix_unitaire_ht > 0),
  corps_etat text references public.btp_corps_etat (code),
  origine text not null check (origine in ('marche', 'saisie')),
  ligne_marche_id uuid,
  date_prix date not null default current_date,
  statut text not null default 'propose' check (statut in ('propose', 'valide', 'retire')),
  valide_par uuid,
  valide_le timestamptz,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint btp_bibliotheque_prix_client_id_id_key unique (client_id, id),
  constraint btp_bibliotheque_prix_ligne_fkey foreign key (client_id, ligne_marche_id)
    references public.btp_lignes_marche (client_id, id) on delete set null (ligne_marche_id),
  constraint btp_bibliotheque_prix_validation check (statut = 'propose' or valide_le is not null)
);
comment on table public.btp_bibliotheque_prix is
  'Les prix unitaires du client hors marché. Un prix ne sert au chiffrage qu''une fois validé ; un nouveau prix retire l''ancien.';
create unique index btp_bibliotheque_prix_un_valide_idx on public.btp_bibliotheque_prix (client_id, designation_normalisee, unite)
  where statut = 'valide';
create index btp_bibliotheque_prix_ligne_idx on public.btp_bibliotheque_prix (client_id, ligne_marche_id);

create function private.btp_preparer_prix() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    new.id := old.id;
    new.client_id := old.client_id;
    new.origine := old.origine;
    new.cree_le := old.cree_le;
    if old.statut <> 'propose'
       and (new.designation, new.unite, new.prix_unitaire_ht, new.valide_par, new.valide_le)
           is distinct from (old.designation, old.unite, old.prix_unitaire_ht, old.valide_par, old.valide_le) then
      raise exception 'Un prix validé ne se retouche pas : validez-en un nouveau.' using errcode = '42501';
    end if;
    if new.statut is distinct from old.statut and not (
         (old.statut = 'propose' and new.statut in ('valide', 'retire'))
      or (old.statut = 'valide' and new.statut = 'retire')) then
      raise exception 'Passage refusé : % vers %.', old.statut, new.statut using errcode = '23514';
    end if;
  end if;
  new.designation := btrim(new.designation);
  new.maj_le := now();
  return new;
end $$;
revoke all on function private.btp_preparer_prix() from public;

create trigger btp_bibliotheque_prix_preparer before insert or update on public.btp_bibliotheque_prix
  for each row execute function private.btp_preparer_prix();

-- ── 5. Les portes du bureau ──────────────────────────────────────────────

-- Créer ou corriger l'en-tête d'un marché.
create function private.btp_ecrire_marche(p_marche uuid, p_chantier uuid, p_champs jsonb) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_c record;
  m public.btp_marches;
  v_id uuid;
  v_champs jsonb := coalesce(p_champs, '{}'::jsonb);
begin
  if exists (select 1 from jsonb_object_keys(v_champs) k
             where k not in ('reference', 'objet', 'date_signature', 'mode_prix', 'montant_ht_declare', 'retenue_taux',
                             'retenue_base', 'retenue_caution', 'source', 'piece_id')) then
    raise exception 'Champ inconnu pour un marché.' using errcode = '22023';
  end if;
  if p_marche is null then
    select c.client_id, c.id, c.entite_id into v_c from public.btp_chantiers c where c.id = p_chantier;
    if not found then
      raise exception 'Chantier introuvable.' using errcode = 'P0002';
    end if;
    perform private.btp_exiger_bureau(v_c.client_id, v_c.entite_id);
    insert into public.btp_marches (client_id, chantier_id, reference, objet, date_signature, mode_prix,
                                    montant_ht_declare, retenue_taux, retenue_base, retenue_caution, source, piece_id)
    values (v_c.client_id, v_c.id, v_champs ->> 'reference', v_champs ->> 'objet', (v_champs ->> 'date_signature')::date,
            v_champs ->> 'mode_prix', (v_champs ->> 'montant_ht_declare')::numeric,
            coalesce((v_champs ->> 'retenue_taux')::numeric, 0), coalesce(v_champs ->> 'retenue_base', 'ttc'),
            coalesce((v_champs ->> 'retenue_caution')::boolean, false), coalesce(v_champs ->> 'source', 'saisie'),
            (v_champs ->> 'piece_id')::uuid)
    returning id into v_id;
    return v_id;
  end if;
  select * into m from public.btp_marches where id = p_marche for update;
  if not found then
    raise exception 'Marché introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(m.client_id, m.entite_id);
  if v_champs ? 'source' then
    raise exception 'La source d''un marché ne change pas.' using errcode = '22023';
  end if;
  update public.btp_marches set
    reference = case when v_champs ? 'reference' then v_champs ->> 'reference' else reference end,
    objet = case when v_champs ? 'objet' then v_champs ->> 'objet' else objet end,
    date_signature = case when v_champs ? 'date_signature' then (v_champs ->> 'date_signature')::date else date_signature end,
    mode_prix = case when v_champs ? 'mode_prix' then v_champs ->> 'mode_prix' else mode_prix end,
    montant_ht_declare = case when v_champs ? 'montant_ht_declare' then (v_champs ->> 'montant_ht_declare')::numeric
                              else montant_ht_declare end,
    retenue_taux = case when v_champs ? 'retenue_taux' then (v_champs ->> 'retenue_taux')::numeric else retenue_taux end,
    retenue_base = case when v_champs ? 'retenue_base' then v_champs ->> 'retenue_base' else retenue_base end,
    retenue_caution = case when v_champs ? 'retenue_caution' then (v_champs ->> 'retenue_caution')::boolean
                           else retenue_caution end,
    piece_id = case when v_champs ? 'piece_id' then (v_champs ->> 'piece_id')::uuid else piece_id end
  where id = m.id;
  return m.id;
end $$;
revoke all on function private.btp_ecrire_marche(uuid, uuid, jsonb) from public;
grant execute on function private.btp_ecrire_marche(uuid, uuid, jsonb) to authenticated, service_role;

-- Créer ou corriger une ligne. Au journal : qui, quels champs ; jamais un prix.
create function private.btp_ecrire_ligne(p_ligne uuid, p_marche uuid, p_champs jsonb) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  m public.btp_marches;
  l public.btp_lignes_marche;
  v_apres public.btp_lignes_marche;
  v_id uuid;
  v_champs jsonb := coalesce(p_champs, '{}'::jsonb);
  v_modifs jsonb := '{}'::jsonb;
  v_cle text;
begin
  if exists (select 1 from jsonb_object_keys(v_champs) k
             where k not in ('designation', 'unite', 'unite_lue', 'quantite', 'prix_unitaire_ht', 'montant_ht', 'nature',
                             'lot_id', 'numero', 'section', 'ordre')) then
    raise exception 'Champ inconnu pour une ligne.' using errcode = '22023';
  end if;
  if p_ligne is null then
    select * into m from public.btp_marches where id = p_marche;
    if not found then
      raise exception 'Marché introuvable.' using errcode = 'P0002';
    end if;
    perform private.btp_exiger_bureau(m.client_id, m.entite_id);
    insert into public.btp_lignes_marche (client_id, marche_id, lot_id, ordre, numero, section, designation, unite_lue,
                                          unite, quantite, prix_unitaire_ht, montant_ht, nature)
    values (m.client_id, m.id, (v_champs ->> 'lot_id')::uuid,
            coalesce((v_champs ->> 'ordre')::integer,
                     (select coalesce(max(x.ordre), 0) + 1 from public.btp_lignes_marche x
                      where x.client_id = m.client_id and x.marche_id = m.id)),
            v_champs ->> 'numero', v_champs ->> 'section', v_champs ->> 'designation', v_champs ->> 'unite_lue',
            v_champs ->> 'unite', (v_champs ->> 'quantite')::numeric, (v_champs ->> 'prix_unitaire_ht')::numeric,
            (v_champs ->> 'montant_ht')::numeric, coalesce(v_champs ->> 'nature', 'ouvrage'))
    returning id into v_id;
    return v_id;
  end if;
  select * into l from public.btp_lignes_marche where id = p_ligne for update;
  if not found then
    raise exception 'Ligne introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(l.client_id, l.entite_id);
  update public.btp_lignes_marche set
    designation = case when v_champs ? 'designation' then v_champs ->> 'designation' else designation end,
    unite_lue = case when v_champs ? 'unite_lue' then v_champs ->> 'unite_lue' else unite_lue end,
    unite = case when v_champs ? 'unite' then v_champs ->> 'unite' else unite end,
    quantite = case when v_champs ? 'quantite' then (v_champs ->> 'quantite')::numeric else quantite end,
    prix_unitaire_ht = case when v_champs ? 'prix_unitaire_ht' then (v_champs ->> 'prix_unitaire_ht')::numeric
                            else prix_unitaire_ht end,
    montant_ht = case when v_champs ? 'montant_ht' then (v_champs ->> 'montant_ht')::numeric else montant_ht end,
    nature = case when v_champs ? 'nature' then v_champs ->> 'nature' else nature end,
    lot_id = case when v_champs ? 'lot_id' then (v_champs ->> 'lot_id')::uuid else lot_id end,
    numero = case when v_champs ? 'numero' then v_champs ->> 'numero' else numero end,
    section = case when v_champs ? 'section' then v_champs ->> 'section' else section end,
    ordre = case when v_champs ? 'ordre' then (v_champs ->> 'ordre')::integer else ordre end
  where id = l.id
  returning * into v_apres;
  for v_cle in select k from jsonb_object_keys(v_champs) k loop
    if (to_jsonb(l) -> v_cle) is distinct from (to_jsonb(v_apres) -> v_cle) then
      v_modifs := v_modifs || jsonb_build_object(v_cle,
        case when v_cle in ('prix_unitaire_ht', 'montant_ht') then to_jsonb('modifié'::text)
             else jsonb_build_array(to_jsonb(l) -> v_cle, to_jsonb(v_apres) -> v_cle) end);
    end if;
  end loop;
  if v_modifs <> '{}'::jsonb then
    perform private.journaliser(l.client_id, 'daliro.ligne_corrigee', 'btp_lignes_marche', l.id::text,
      jsonb_build_object('marche', l.marche_id, 'modifications', v_modifs), l.entite_id);
  end if;
  return l.id;
end $$;
revoke all on function private.btp_ecrire_ligne(uuid, uuid, jsonb) from public;
grant execute on function private.btp_ecrire_ligne(uuid, uuid, jsonb) to authenticated, service_role;

create function private.btp_retirer_ligne(p_ligne uuid) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  l public.btp_lignes_marche;
begin
  select * into l from public.btp_lignes_marche where id = p_ligne for update;
  if not found then
    raise exception 'Ligne introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(l.client_id, l.entite_id);
  delete from public.btp_lignes_marche where id = l.id;
  perform private.journaliser(l.client_id, 'daliro.ligne_retiree', 'btp_lignes_marche', l.id::text,
    jsonb_build_object('marche', l.marche_id, 'designation', l.designation), l.entite_id);
end $$;
revoke all on function private.btp_retirer_ligne(uuid) from public;
grant execute on function private.btp_retirer_ligne(uuid) to authenticated, service_role;

create function private.btp_accepter_ecart(p_ligne uuid, p_motif text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  l public.btp_lignes_marche;
begin
  select * into l from public.btp_lignes_marche where id = p_ligne for update;
  if not found then
    raise exception 'Ligne introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(l.client_id, l.entite_id);
  if l.controle <> 'montant_faux' then
    raise exception 'Cette ligne n''a pas d''écart à accepter.' using errcode = '22023';
  end if;
  if coalesce(btrim(p_motif), '') = '' then
    raise exception 'Un écart s''accepte avec son motif.' using errcode = '22023';
  end if;
  update public.btp_lignes_marche set ecart_accepte = true, ecart_motif = btrim(p_motif) where id = l.id;
  perform private.journaliser(l.client_id, 'daliro.ecart_accepte', 'btp_lignes_marche', l.id::text,
    jsonb_build_object('marche', l.marche_id, 'motif', btrim(p_motif)), l.entite_id);
end $$;
revoke all on function private.btp_accepter_ecart(uuid, text) from public;
grant execute on function private.btp_accepter_ecart(uuid, text) to authenticated, service_role;

-- La vérification : le geste de l'écran de contrôle.
create function private.btp_verifier_marche(p_marche uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  m public.btp_marches;
  v_acteur record;
  v_lignes integer;
  v_corrigees integer;
  v_acceptes integer;
  v_incompletes integer;
  v_faux integer;
  v_sans_lot integer;
  v_total numeric(14,2);
  v_raisons text[] := '{}';
  v_proposes integer;
begin
  select * into m from public.btp_marches where id = p_marche for update;
  if not found then
    raise exception 'Marché introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(m.client_id, m.entite_id);
  if m.statut <> 'a_verifier' then
    raise exception 'Ce marché est déjà vérifié.' using errcode = '23514';
  end if;

  select count(*), count(*) filter (where l.corrigee), count(*) filter (where l.ecart_accepte),
         count(*) filter (where l.nature <> 'option' and l.controle = 'incomplet'),
         count(*) filter (where l.nature <> 'option' and l.controle = 'montant_faux' and not l.ecart_accepte),
         count(*) filter (where l.nature <> 'option' and l.lot_id is null),
         coalesce(sum(l.montant_ht) filter (where l.nature <> 'option'), 0)
  into v_lignes, v_corrigees, v_acceptes, v_incompletes, v_faux, v_sans_lot, v_total
  from public.btp_lignes_marche l where l.client_id = m.client_id and l.marche_id = m.id;

  if v_lignes = 0 then
    v_raisons := v_raisons || 'il n''a aucune ligne'::text;
  end if;
  if v_incompletes > 0 then
    v_raisons := v_raisons || format('%s ligne(s) incomplète(s)', v_incompletes);
  end if;
  if v_faux > 0 then
    v_raisons := v_raisons || format('%s ligne(s) dont le montant n''est pas quantité × prix', v_faux);
  end if;
  if v_sans_lot > 0 then
    v_raisons := v_raisons || format('%s ligne(s) sans lot', v_sans_lot);
  end if;
  if m.montant_ht_declare is not null and abs(v_total - m.montant_ht_declare) > 1 then
    v_raisons := v_raisons || 'le total des lignes diffère du total du devis de plus d''un euro'::text;
  end if;
  if cardinality(v_raisons) > 0 then
    raise exception 'Marché non vérifiable : %.', array_to_string(v_raisons, ' ; ') using errcode = '23514';
  end if;

  select * into v_acteur from private.acteur_courant();
  perform set_config('daliro.porte', 'verifier', true);
  update public.btp_marches
  set statut = 'verifie', verifie_par = v_acteur.acteur_id, verifie_libelle = v_acteur.acteur_libelle, verifie_le = now()
  where id = m.id;
  perform set_config('daliro.porte', '', true);

  -- La bibliothèque apprend les prix du marché ; ils n'y valent qu'une fois validés.
  insert into public.btp_bibliotheque_prix (client_id, designation, unite, prix_unitaire_ht, corps_etat, origine,
                                            ligne_marche_id, date_prix)
  select distinct on (l.designation_normalisee, l.unite, l.prix_unitaire_ht)
         l.client_id, l.designation, l.unite, l.prix_unitaire_ht, lo.corps_etat, 'marche', l.id,
         coalesce(m.date_signature, current_date)
  from public.btp_lignes_marche l
  left join public.btp_lots lo on lo.chantier_id = l.chantier_id and lo.id = l.lot_id
  where l.client_id = m.client_id and l.marche_id = m.id and l.nature in ('ouvrage', 'fourniture')
    and l.unite is not null and l.prix_unitaire_ht > 0
    and not exists (select 1 from public.btp_bibliotheque_prix b
                    where b.client_id = l.client_id and b.designation_normalisee = l.designation_normalisee
                      and b.unite = l.unite and b.prix_unitaire_ht = l.prix_unitaire_ht
                      and b.statut in ('propose', 'valide'))
  order by l.designation_normalisee, l.unite, l.prix_unitaire_ht, l.ordre;
  get diagnostics v_proposes = row_count;

  perform private.journaliser(m.client_id, 'daliro.marche_verifie', 'btp_marches', m.id::text,
    jsonb_build_object('lignes', v_lignes, 'corrigees', v_corrigees, 'ecarts_acceptes', v_acceptes,
                       'prix_proposes', v_proposes), m.entite_id);
  perform private.publier_evenement(m.client_id, 'daliro.marche_verifie',
    jsonb_build_object('marche', m.id, 'chantier', m.chantier_id), m.id::text);
  return jsonb_build_object('marche', m.id, 'lignes', v_lignes, 'corrigees', v_corrigees,
    'justes_du_premier_coup', round(100.0 * (v_lignes - v_corrigees) / v_lignes, 1), 'prix_proposes', v_proposes);
end $$;
revoke all on function private.btp_verifier_marche(uuid) from public;
grant execute on function private.btp_verifier_marche(uuid) to authenticated, service_role;

-- Rouvrir un marché vérifié : le gérant, ou Omega, avec un motif.
create function private.btp_rouvrir_marche(p_marche uuid, p_motif text) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  m public.btp_marches;
begin
  select * into m from public.btp_marches where id = p_marche for update;
  if not found then
    raise exception 'Marché introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(m.client_id, m.entite_id);
  if (select auth.uid()) is not null and not private.a_un_role(m.client_id, array['gerant']) then
    raise exception 'Seul le gérant rouvre un marché vérifié.' using errcode = '42501';
  end if;
  if coalesce(btrim(p_motif), '') = '' then
    raise exception 'Un marché se rouvre avec son motif.' using errcode = '22023';
  end if;
  if m.statut <> 'verifie' then
    raise exception 'Ce marché n''est pas vérifié.' using errcode = '23514';
  end if;
  perform set_config('daliro.porte', 'rouvrir', true);
  update public.btp_marches set statut = 'a_verifier' where id = m.id;
  perform set_config('daliro.porte', '', true);
  perform private.journaliser(m.client_id, 'daliro.marche_rouvert', 'btp_marches', m.id::text,
    jsonb_build_object('motif', btrim(p_motif)), m.entite_id);
end $$;
revoke all on function private.btp_rouvrir_marche(uuid, text) from public;
grant execute on function private.btp_rouvrir_marche(uuid, text) to authenticated, service_role;

-- Valider un prix proposé (au besoin corrigé), ou poser un prix nouveau :
-- qui a le droit daliro.valider_prix (le gérant l'a toujours), ou Omega.
create function private.btp_exiger_valideur_prix(p_client uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
declare
  v_role text := coalesce(nullif(current_setting('role', true), 'none'), session_user::text);
begin
  if (select auth.uid()) is null then
    if v_role not in ('service_role', 'postgres') then
      raise exception 'Réservé à qui valide les prix.' using errcode = '42501';
    end if;
  elsif not private.a_le_droit(p_client, 'daliro.valider_prix') then
    raise exception 'Il faut le droit de valider les prix.' using errcode = '42501';
  end if;
end $$;
revoke all on function private.btp_exiger_valideur_prix(uuid) from public;

create function private.btp_valider_prix(p_prix uuid, p_prix_unitaire numeric default null) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  b public.btp_bibliotheque_prix;
  v_acteur record;
begin
  select * into b from public.btp_bibliotheque_prix where id = p_prix for update;
  if not found then
    raise exception 'Prix introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_valideur_prix(b.client_id);
  if b.statut <> 'propose' then
    raise exception 'Seul un prix proposé se valide.' using errcode = '23514';
  end if;
  select * into v_acteur from private.acteur_courant();
  update public.btp_bibliotheque_prix set statut = 'retire'
  where client_id = b.client_id and designation_normalisee = b.designation_normalisee and unite = b.unite
    and statut = 'valide';
  update public.btp_bibliotheque_prix
  set prix_unitaire_ht = coalesce(p_prix_unitaire, prix_unitaire_ht), statut = 'valide',
      valide_par = v_acteur.acteur_id, valide_le = now()
  where id = b.id;
  return b.id;
end $$;
revoke all on function private.btp_valider_prix(uuid, numeric) from public;
grant execute on function private.btp_valider_prix(uuid, numeric) to authenticated, service_role;

create function private.btp_poser_prix(
  p_client uuid, p_designation text, p_unite text, p_prix_unitaire numeric, p_corps_etat text default null
) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  perform private.btp_exiger_valideur_prix(p_client);
  insert into public.btp_bibliotheque_prix (client_id, designation, unite, prix_unitaire_ht, corps_etat, origine)
  values (p_client, p_designation, coalesce(private.btp_unite(p_unite), p_unite), p_prix_unitaire, p_corps_etat, 'saisie')
  returning id into v_id;
  perform private.btp_valider_prix(v_id, null);
  return v_id;
end $$;
revoke all on function private.btp_poser_prix(uuid, text, text, numeric, text) from public;
grant execute on function private.btp_poser_prix(uuid, text, text, numeric, text) to authenticated, service_role;

-- Les portes exposées : sans privilège propre, elles transmettent.
create function public.btp_ecrire_marche(p_marche uuid, p_chantier uuid, p_champs jsonb) returns uuid
language sql volatile security invoker set search_path = '' as $$ select private.btp_ecrire_marche(p_marche, p_chantier, p_champs) $$;
create function public.btp_ecrire_ligne(p_ligne uuid, p_marche uuid, p_champs jsonb) returns uuid
language sql volatile security invoker set search_path = '' as $$ select private.btp_ecrire_ligne(p_ligne, p_marche, p_champs) $$;
create function public.btp_retirer_ligne(p_ligne uuid) returns void
language sql volatile security invoker set search_path = '' as $$ select private.btp_retirer_ligne(p_ligne) $$;
create function public.btp_accepter_ecart(p_ligne uuid, p_motif text) returns void
language sql volatile security invoker set search_path = '' as $$ select private.btp_accepter_ecart(p_ligne, p_motif) $$;
create function public.btp_verifier_marche(p_marche uuid) returns jsonb
language sql volatile security invoker set search_path = '' as $$ select private.btp_verifier_marche(p_marche) $$;
create function public.btp_rouvrir_marche(p_marche uuid, p_motif text) returns void
language sql volatile security invoker set search_path = '' as $$ select private.btp_rouvrir_marche(p_marche, p_motif) $$;
create function public.btp_valider_prix(p_prix uuid, p_prix_unitaire numeric default null) returns uuid
language sql volatile security invoker set search_path = '' as $$ select private.btp_valider_prix(p_prix, p_prix_unitaire) $$;
create function public.btp_poser_prix(
  p_client uuid, p_designation text, p_unite text, p_prix_unitaire numeric, p_corps_etat text default null
) returns uuid
language sql volatile security invoker set search_path = '' as $$
  select private.btp_poser_prix(p_client, p_designation, p_unite, p_prix_unitaire, p_corps_etat) $$;

revoke all on function public.btp_ecrire_marche(uuid, uuid, jsonb), public.btp_ecrire_ligne(uuid, uuid, jsonb),
  public.btp_retirer_ligne(uuid), public.btp_accepter_ecart(uuid, text), public.btp_verifier_marche(uuid),
  public.btp_rouvrir_marche(uuid, text), public.btp_valider_prix(uuid, numeric),
  public.btp_poser_prix(uuid, text, text, numeric, text) from public, anon;
grant execute on function public.btp_ecrire_marche(uuid, uuid, jsonb), public.btp_ecrire_ligne(uuid, uuid, jsonb),
  public.btp_retirer_ligne(uuid), public.btp_accepter_ecart(uuid, text), public.btp_verifier_marche(uuid),
  public.btp_rouvrir_marche(uuid, text), public.btp_valider_prix(uuid, numeric),
  public.btp_poser_prix(uuid, text, text, numeric, text) to authenticated, service_role;

-- ── 6. Les prix masqués ──────────────────────────────────────────────────
-- Les colonnes de prix ne sont pas lisibles par les comptes. Les vues
-- « chiffrées » les rendent, ligne à ligne, à qui a le droit de les voir ;
-- aux autres, elles rendent un vide.

-- Le serveur d'Omega (moteurs, installation) : pas de session, rôle de service.
create function private.btp_est_serveur() returns boolean
language sql stable set search_path = '' as $$
  select (select auth.uid()) is null
     and coalesce(nullif(current_setting('role', true), 'none'), session_user::text) in ('service_role', 'postgres')
$$;
revoke all on function private.btp_est_serveur() from public;
grant execute on function private.btp_est_serveur() to authenticated, service_role;

create function private.btp_prix_ligne_marche(p_id uuid)
returns table (prix_unitaire_ht numeric, montant_ht numeric, ecart numeric)
language sql stable security definer set search_path = '' as $$
  select l.prix_unitaire_ht, l.montant_ht, l.ecart from public.btp_lignes_marche l
  where l.id = p_id
    and (private.btp_est_serveur() or (private.voit_entite(l.client_id, l.entite_id) and private.btp_voit_prix(l.client_id)))
$$;
create function private.btp_prix_marche(p_id uuid)
returns table (montant_ht_declare numeric, total_ht_lignes numeric)
language sql stable security definer set search_path = '' as $$
  select m.montant_ht_declare,
         (select coalesce(sum(l.montant_ht), 0) from public.btp_lignes_marche l
          where l.client_id = m.client_id and l.marche_id = m.id and l.nature <> 'option')
  from public.btp_marches m
  where m.id = p_id
    and (private.btp_est_serveur() or (private.voit_entite(m.client_id, m.entite_id) and private.btp_voit_prix(m.client_id)))
$$;
create function private.btp_prix_bibliotheque(p_id uuid) returns numeric
language sql stable security definer set search_path = '' as $$
  select b.prix_unitaire_ht from public.btp_bibliotheque_prix b
  where b.id = p_id
    and (private.btp_est_serveur() or (b.client_id in (select private.mes_clients()) and private.btp_voit_prix(b.client_id)))
$$;
-- Le total diffère-t-il du devis ? Un oui ou un non, jamais le montant.
create function private.btp_total_different(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select m.montant_ht_declare is not null
     and abs(m.montant_ht_declare - (select coalesce(sum(l.montant_ht), 0) from public.btp_lignes_marche l
                                     where l.client_id = m.client_id and l.marche_id = m.id and l.nature <> 'option')) > 1
  from public.btp_marches m
  where m.id = p_id and (private.btp_est_serveur() or private.voit_entite(m.client_id, m.entite_id))
$$;
revoke all on function private.btp_prix_ligne_marche(uuid), private.btp_prix_marche(uuid),
  private.btp_prix_bibliotheque(uuid), private.btp_total_different(uuid) from public;
grant execute on function private.btp_prix_ligne_marche(uuid), private.btp_prix_marche(uuid),
  private.btp_prix_bibliotheque(uuid), private.btp_total_different(uuid) to authenticated, service_role;

create view public.btp_marches_chiffres with (security_invoker = true) as
  select m.id, m.client_id, m.chantier_id, m.reference, m.objet, m.date_signature, m.mode_prix, m.retenue_taux,
         m.retenue_base, m.retenue_caution, m.source, m.piece_id, m.statut, m.verifie_par, m.verifie_libelle, m.verifie_le,
         p.montant_ht_declare, p.total_ht_lignes
  from public.btp_marches m
  left join lateral private.btp_prix_marche(m.id) p on true;

create view public.btp_lignes_marche_chiffrees with (security_invoker = true) as
  select l.id, l.client_id, l.chantier_id, l.marche_id, l.lot_id, l.ordre, l.numero, l.section, l.designation,
         l.unite, l.quantite, l.nature, l.controle, l.ecart_accepte, l.ecart_motif, l.corrigee,
         p.prix_unitaire_ht, p.montant_ht, p.ecart
  from public.btp_lignes_marche l
  left join lateral private.btp_prix_ligne_marche(l.id) p on true;

create view public.btp_bibliotheque_chiffree with (security_invoker = true) as
  select b.id, b.client_id, b.designation, b.unite, b.corps_etat, b.origine, b.ligne_marche_id, b.date_prix, b.statut,
         b.valide_par, b.valide_le, private.btp_prix_bibliotheque(b.id) as prix_unitaire_ht
  from public.btp_bibliotheque_prix b;

-- L'écran de contrôle d'un marché : ce qui empêche de le vérifier.
create view public.btp_controle_marches with (security_invoker = true) as
  select l.client_id, l.chantier_id, l.marche_id, l.id as ligne_id, l.ordre, l.controle as code,
         (l.nature <> 'option' and (l.controle = 'incomplet' or (l.controle = 'montant_faux' and not l.ecart_accepte)))
           as bloquant,
         case l.controle
           when 'incomplet' then 'Quantité, unité, prix unitaire ou montant manquant.'
           when 'montant_faux' then case when l.ecart_accepte then 'Écart accepté : ' || l.ecart_motif
                                         else 'Le montant n''est pas quantité × prix unitaire.' end
         end as message
  from public.btp_lignes_marche l
  join public.btp_marches m on m.client_id = l.client_id and m.id = l.marche_id
  where m.statut = 'a_verifier' and l.controle <> 'ok'
  union all
  select l.client_id, l.chantier_id, l.marche_id, l.id, l.ordre, 'sans_lot', true, 'Ligne rattachée à aucun lot du chantier.'
  from public.btp_lignes_marche l
  join public.btp_marches m on m.client_id = l.client_id and m.id = l.marche_id
  where m.statut = 'a_verifier' and l.lot_id is null and l.nature <> 'option'
  union all
  select m.client_id, m.chantier_id, m.id, null, null, 'total_different', true,
         'Le total des lignes diffère du total du devis de plus d''un euro.'
  from public.btp_marches m
  where m.statut = 'a_verifier' and private.btp_total_different(m.id);

-- L'écran de contrôle du référentiel reçoit les marchés.
create or replace view public.btp_controle with (security_invoker = true) as
  select c.client_id, c.id as chantier_id, 'btp_chantiers'::text as objet_type, c.id as objet_id,
         'chantier_sans_maitre_ouvrage'::text as code, 'bloquant'::text as gravite,
         format('%s : aucun maître d''ouvrage désigné ; personne ne peut signer ses avenants.', c.nom) as message
  from public.btp_chantiers c
  where c.statut in ('preparation', 'ouvert', 'suspendu') and c.place_client <> 'sous_traitant' and c.maitre_ouvrage_id is null
  union all
  select c.client_id, c.id, 'btp_chantiers', c.id, 'chantier_sans_donneur_ordre', 'bloquant',
         format('%s : l''entreprise principale n''est pas désignée ; elle signe les avenants du sous-traitant.', c.nom)
  from public.btp_chantiers c
  where c.statut in ('preparation', 'ouvert', 'suspendu') and c.place_client = 'sous_traitant' and c.donneur_ordre_id is null
  union all
  select c.client_id, c.id, 'btp_chantiers', c.id, 'chantier_sans_conducteur', 'attention',
         format('%s : aucun conducteur de travaux ; ses listes du matin n''ont pas de destinataire.', c.nom)
  from public.btp_chantiers c
  where c.statut in ('ouvert', 'suspendu') and c.conducteur_id is null
  union all
  select c.client_id, c.id, 'btp_chantiers', c.id, 'chantier_sans_lots', 'attention',
         format('%s : aucun lot ; le planning et les passages ne peuvent pas s''y rattacher.', c.nom)
  from public.btp_chantiers c
  where c.statut in ('preparation', 'ouvert', 'suspendu')
    and not exists (select 1 from public.btp_lots l where l.client_id = c.client_id and l.chantier_id = c.id)
  union all
  select c.client_id, c.id, 'btp_chantiers', c.id, 'chantier_sans_coordonnees', 'info',
         format('%s : adresse non localisée ; pas de météo, ni de rattachement par la position.', c.nom)
  from public.btp_chantiers c
  where c.statut in ('preparation', 'ouvert', 'suspendu') and c.latitude is null
  union all
  select c.client_id, c.id, 'btp_chantiers', c.id, 'chantier_hors_champ_tva', 'info',
         format('%s : collectivité d''outre-mer, hors du champ de la TVA française ; les montants sont préparés hors taxe.', c.nom)
  from public.btp_chantiers c
  where c.statut in ('preparation', 'ouvert', 'suspendu') and c.regime_tva = 'hors_champ'
  union all
  select c.client_id, c.id, 'btp_chantiers', c.id, 'chantier_sans_marche_verifie', 'attention',
         format('%s : aucun marché vérifié ; les avenants et les situations ne peuvent pas être chiffrés.', c.nom)
  from public.btp_chantiers c
  where c.statut in ('ouvert', 'suspendu')
    and not exists (select 1 from public.btp_marches m
                    where m.client_id = c.client_id and m.chantier_id = c.id and m.statut = 'verifie')
  union all
  select m.client_id, m.chantier_id, 'btp_marches', m.id, 'marche_a_verifier', 'bloquant',
         format('Marché %s : à vérifier ligne à ligne avant tout chiffrage.', coalesce(m.reference, 'sans référence'))
  from public.btp_marches m
  where m.statut = 'a_verifier'
  union all
  select l.client_id, l.chantier_id, 'btp_lots', l.id, 'lot_sans_executant', 'attention',
         format('Lot %s %s : l''entreprise qui l''exécute n''est pas désignée.', l.code, l.libelle)
  from public.btp_lots l
  join public.btp_chantiers c on c.client_id = l.client_id and c.id = l.chantier_id
  where c.statut in ('preparation', 'ouvert', 'suspendu') and l.statut <> 'termine'
    and ((l.execution <> 'client' and l.tiers_id is null) or (l.execution = 'client' and l.equipe_id is null))
  union all
  select i.client_id, null::uuid, 'btp_intervenants', i.id, 'intervenant_non_informe', 'bloquant',
         format('%s n''a pas été informé que ses messages sont lus (C. trav. L1222-4) : Daliro ne lit rien de lui.', i.nom)
  from public.btp_intervenants i
  where i.actif and i.informe_le is null
  union all
  select i.client_id, null::uuid, 'btp_intervenants', i.id, 'chef_sans_telephone', 'attention',
         format('%s, chef d''équipe, n''a pas de numéro : ses messages ne peuvent pas être reconnus.', i.nom)
  from public.btp_intervenants i
  where i.actif and i.role_terrain = 'chef_equipe' and i.telephone is null
  union all
  select t.client_id, null::uuid, 'btp_tiers', t.id,
         'vigilance_' || public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le),
         case when public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le) = 'a_renouveler'
              then 'info' else 'attention' end,
         format('%s : attestation de vigilance %s (C. trav. D8222-5).', t.nom,
                case public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le)
                  when 'absente' then 'absente'
                  when 'echue' then 'de plus de six mois'
                  when 'a_verifier' then 'non vérifiée auprès de l''Urssaf'
                  else 'à renouveler dans les quinze jours' end)
  from public.btp_tiers t
  where t.actif and public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le)
                    in ('absente', 'echue', 'a_verifier', 'a_renouveler')
  union all
  select t.client_id, null::uuid, 'btp_tiers', t.id, 'sous_traitant_injoignable', 'attention',
         format('%s : ni téléphone ni courriel ; ses passages ne peuvent pas être confirmés.', t.nom)
  from public.btp_tiers t
  where t.actif and 'sous_traitant' = any (t.roles) and t.telephone is null and t.email is null;

-- ── 7. Droits ────────────────────────────────────────────────────────────

alter table public.btp_marches enable row level security;
alter table public.btp_lignes_marche enable row level security;
alter table public.btp_bibliotheque_prix enable row level security;

revoke all on table public.btp_marches, public.btp_lignes_marche, public.btp_bibliotheque_prix,
  public.btp_marches_chiffres, public.btp_lignes_marche_chiffrees, public.btp_bibliotheque_chiffree,
  public.btp_controle_marches from anon, authenticated;
grant all on table public.btp_marches, public.btp_lignes_marche, public.btp_bibliotheque_prix to service_role;
grant select on table public.btp_marches_chiffres, public.btp_lignes_marche_chiffrees, public.btp_bibliotheque_chiffree,
  public.btp_controle_marches to authenticated, service_role;
-- Les colonnes lisibles : toutes, sauf les prix.
grant select (id, client_id, chantier_id, entite_id, reference, objet, date_signature, mode_prix, retenue_taux,
              retenue_base, retenue_caution, source, piece_id, statut, verifie_par, verifie_libelle, verifie_le,
              cree_le, maj_le)
  on table public.btp_marches to authenticated;
grant select (id, client_id, chantier_id, entite_id, marche_id, lot_id, ordre, numero, section, designation,
              designation_normalisee, unite_lue, unite, quantite, nature, controle, ecart_accepte, ecart_motif,
              corrigee, cree_le, maj_le)
  on table public.btp_lignes_marche to authenticated;
grant select (id, client_id, designation, designation_normalisee, unite, corps_etat, origine, ligne_marche_id,
              date_prix, statut, valide_par, valide_le, cree_le, maj_le)
  on table public.btp_bibliotheque_prix to authenticated;

create policy "membres lisent les marches de leurs chantiers" on public.btp_marches
  for select to authenticated
  using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
create policy "membres lisent les lignes des marches de leurs chantiers" on public.btp_lignes_marche
  for select to authenticated
  using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
create policy "membres lisent la bibliotheque de prix" on public.btp_bibliotheque_prix
  for select to authenticated using (client_id in (select private.mes_clients()));

-- ── 8. Traçage, registre, objets ─────────────────────────────────────────
-- Au journal : l'état des marchés et de la bibliothèque, sans les montants.

create trigger btp_marches_tracer after insert or update or delete on public.btp_marches
  for each row execute function private.tracer('maj_le', 'montant_ht_declare');
create trigger btp_bibliotheque_prix_tracer after insert or update or delete on public.btp_bibliotheque_prix
  for each row execute function private.tracer('maj_le', 'prix_unitaire_ht');

insert into private.tables_locataires (nom, ordre_effacement, note) values
  ('btp_lignes_marche', 3, 'daliro, M0'),
  ('btp_marches', 6, 'daliro, M0'),
  ('btp_bibliotheque_prix', 2, 'daliro, M0')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;

insert into private.tables_objets (nom, objet_type, colonne, ordre_effacement) values
  ('btp_lignes_marche', 'btp_chantier', 'chantier_id', 3),
  ('btp_marches', 'btp_chantier', 'chantier_id', 6)
on conflict (nom) do update
  set objet_type = excluded.objet_type, colonne = excluded.colonne, ordre_effacement = excluded.ordre_effacement;
