-- b6_23 — DALIRO : l'approvisionnement, suite — liste cadencée depuis le devis, livraisons calées sur la pose,
-- bons de livraison rapprochés, suivi des retours (session B6, 06/10/2026)
--
-- Les quatre lignes « Approvisionnement » de /secteurs/btp encore « en préparation » après b6_22 :
--   · Liste cadencée depuis le devis — public.btp_preparer_liste(chantier) : chaque ligne du marché vérifié (ouvrage ou
--     fourniture, avec quantité et unité de matière) d'un lot exécuté par l'entreprise devient une commande « à
--     commander », rattachée au premier passage prévu de son lot. Quantités du devis, dates du planning. Rejouable :
--     une ligne déjà reprise (et pas annulée) ne l'est pas deux fois. Le fournisseur se choisit ensuite : il n'est
--     exigé qu'au moment de commander.
--   · Livraisons calées sur la pose — l'échéance « livrer le » proposée est la veille ouvrée de la pose (et plus
--     seulement une limite) ; une livraison promise plus de 5 jours ouvrés avant est signalée « trop tôt : stockage
--     sur site ».
--   · Bons de livraison rapprochés — public.btp_livraisons : chaque réception (quantité, n° du bon, pièce scannée)
--     est comparée à la commande : manquant, complet, excédent. public.btp_recevoir.
--   · Suivi des retours — une commande peut porter du matériel à rendre (location, consigne) : « à rendre le »
--     (par défaut le jour ouvré qui suit la fin du passage), public.btp_noter_retour ; le point du matin relance ce
--     qui reste sur le chantier après la date.
--
-- Règles de pose : alter … add column if not exists / create … if not exists / create or replace ; rien n'est retiré ni
-- effacé. La fonction du point du matin est celle de b6_22 à l'identique, plus le bloc « 0 sexies » : poser APRÈS
-- b6_22.

alter table public.btp_commandes add column if not exists ligne_marche_id uuid;
alter table public.btp_commandes add column if not exists quantite numeric(14,3);
alter table public.btp_commandes add column if not exists unite text;
alter table public.btp_commandes add column if not exists a_retourner boolean not null default false;
alter table public.btp_commandes add column if not exists retour_prevu date;
alter table public.btp_commandes add column if not exists retourne_le date;
do $do$ begin
  if not exists (select 1 from pg_constraint where conname = 'btp_commandes_quantite_positive') then
    alter table public.btp_commandes add constraint btp_commandes_quantite_positive check (quantite is null or quantite > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'btp_commandes_unite_check') then
    alter table public.btp_commandes add constraint btp_commandes_unite_check check (unite is null or char_length(unite) <= 12);
  end if;
end $do$;
create unique index if not exists btp_commandes_une_ligne_du_devis on public.btp_commandes (chantier_id, ligne_marche_id)
  where ligne_marche_id is not null and statut <> 'annulee';

create table if not exists public.btp_livraisons (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  commande_id uuid not null,
  chantier_id uuid not null,
  entite_id uuid not null,
  livree_le date not null,
  quantite numeric(14,3),
  bon_reference text,
  piece_id uuid,
  note text,
  saisi_par uuid,
  cree_le timestamptz not null default now(),
  constraint btp_livraisons_client_id_id_key unique (client_id, id),
  constraint btp_livraisons_commande_fkey foreign key (client_id, commande_id) references public.btp_commandes(client_id, id) on delete cascade,
  constraint btp_livraisons_piece_fkey foreign key (client_id, piece_id) references public.pieces(client_id, id) on delete set null (piece_id),
  constraint btp_livraisons_quantite_check check (quantite is null or quantite > 0),
  constraint btp_livraisons_bon_check check (char_length(bon_reference) <= 60),
  constraint btp_livraisons_note_check check (char_length(note) <= 500)
);
comment on table public.btp_livraisons is 'DALIRO — chaque réception d''une commande : quantité, bon de livraison, pièce. Écrite par les portes seules.';
create index if not exists btp_livraisons_commande_idx on public.btp_livraisons (commande_id, livree_le);
alter table public.btp_livraisons enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_livraisons' and policyname = 'membres lisent les livraisons de leurs chantiers') then
    create policy "membres lisent les livraisons de leurs chantiers" on public.btp_livraisons
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $do$;
revoke all on table public.btp_livraisons from anon, authenticated;
grant select on table public.btp_livraisons to authenticated;
do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select x from unnest(array['btp_livraisons']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;

-- ─────────────────────────────────────────────────────────────────────────
-- Les échéances : besoin, livrer le, commander avant, quantités, retour
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_echeances_commande(p_commande uuid, p_jour date default null)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  k public.btp_commandes;
  v_jour date := coalesce(p_jour, (now() at time zone 'Europe/Paris')::date);
  v_territoire text;
  v_besoin date;
  v_fin_passage date;
  v_livrer date;
  v_commander date;
  v_etat text;
  v_livre numeric;
  v_retour date;
  v_retour_etat text;
begin
  select * into k from public.btp_commandes where id = p_commande;
  if not found then
    return null;
  end if;
  select coalesce(c.territoire, 'metropole') into v_territoire from public.btp_chantiers c where c.id = k.chantier_id;
  select p.debut, p.fin into v_besoin, v_fin_passage from public.btp_passages p where p.id = k.passage_id and p.statut <> 'annule';
  v_besoin := coalesce(v_besoin, k.besoin_le);
  if v_besoin is not null then
    v_livrer := public.ajouter_jours(v_besoin, -1, 'ouvres', v_territoire);
    v_commander := public.ajouter_jours(v_livrer, -k.delai_jours, 'ouvres', v_territoire);
  end if;
  select sum(l.quantite) into v_livre from public.btp_livraisons l where l.commande_id = k.id;
  v_etat := case
    when k.statut in ('livree', 'annulee') then k.statut
    when k.statut = 'a_commander' and v_commander is not null and v_commander < v_jour then 'commande_en_retard'
    when k.statut = 'a_commander' and v_commander is not null and v_commander <= public.ajouter_jours(v_jour, 2, 'ouvres', v_territoire) then 'a_commander_vite'
    when k.statut = 'a_commander' then 'a_commander'
    when k.statut = 'livree_partielle' then 'livree_partielle'
    when k.livraison_prevue < v_jour then 'livraison_attendue'
    when v_livrer is not null and k.livraison_prevue > v_livrer then 'livraison_tardive'
    when v_livrer is not null and k.livraison_prevue < public.ajouter_jours(v_livrer, -5, 'ouvres', v_territoire) then 'livraison_trop_tot'
    else k.statut
  end;
  if k.a_retourner then
    v_retour := coalesce(k.retour_prevu, case when v_fin_passage is not null then public.ajouter_jours(v_fin_passage, 1, 'ouvres', v_territoire) end);
    v_retour_etat := case when k.retourne_le is not null then 'rendu'
                          when k.statut not in ('livree', 'livree_partielle') then null
                          when v_retour is not null and v_retour < v_jour then 'a_rendre'
                          else 'sur_chantier' end;
  end if;
  return jsonb_build_object('besoin_le', v_besoin, 'livrer_avant', v_livrer, 'livrer_le', v_livrer, 'commander_avant', v_commander, 'etat', v_etat,
                            'quantite_commandee', k.quantite, 'quantite_livree', v_livre,
                            'ecart', case when k.quantite is not null and v_livre is not null then v_livre - k.quantite end,
                            'retour_prevu', v_retour, 'retour', v_retour_etat);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Écrire une commande : le fournisseur n'est exigé qu'à la commande
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_ecrire_commande(p_commande uuid, p_chantier uuid, p_champs jsonb)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
  k public.btp_commandes;
  v jsonb := coalesce(p_champs, '{}'::jsonb);
  v_id uuid;
  v_lot uuid;
  v_passage uuid;
  v_fournisseur uuid;
  v_delai integer;
  v_quantite numeric;
begin
  if p_commande is not null then
    select * into k from public.btp_commandes where id = p_commande for update;
    if not found then
      raise exception 'Commande introuvable.' using errcode = 'P0002';
    end if;
    if k.statut not in ('a_commander', 'commandee') then
      raise exception 'Une commande livrée ou annulée ne se modifie plus.' using errcode = '23514';
    end if;
    select * into c from public.btp_chantiers where id = k.chantier_id;
  else
    select * into c from public.btp_chantiers where id = p_chantier;
    if not found then
      raise exception 'Chantier introuvable.' using errcode = 'P0002';
    end if;
    if c.statut not in ('preparation', 'ouvert', 'suspendu') then
      raise exception 'Le chantier n''est plus en cours : on n''y commande plus.' using errcode = '23514';
    end if;
  end if;
  perform private.btp_exiger_appro(c.client_id, c.entite_id);

  v_lot := case when v ? 'lot_id' then nullif(v ->> 'lot_id', '')::uuid else k.lot_id end;
  v_passage := case when v ? 'passage_id' then nullif(v ->> 'passage_id', '')::uuid else k.passage_id end;
  v_fournisseur := case when v ? 'fournisseur_id' then nullif(v ->> 'fournisseur_id', '')::uuid else k.fournisseur_id end;
  v_delai := case when v ? 'delai_jours' then (v ->> 'delai_jours')::integer else coalesce(k.delai_jours, 5) end;
  v_quantite := case when v ? 'quantite' then nullif(v ->> 'quantite', '')::numeric else k.quantite end;
  if v_lot is not null and not exists (select 1 from public.btp_lots l where l.chantier_id = c.id and l.id = v_lot) then
    raise exception 'Ce lot n''est pas celui de ce chantier.' using errcode = '22023';
  end if;
  if v_passage is not null and not exists (select 1 from public.btp_passages p where p.chantier_id = c.id and p.id = v_passage) then
    raise exception 'Ce passage n''est pas celui de ce chantier.' using errcode = '22023';
  end if;
  if v_fournisseur is not null and not exists (select 1 from public.btp_tiers t where t.client_id = c.client_id and t.id = v_fournisseur
                                                and t.roles && array['fournisseur', 'loueur', 'sous_traitant']) then
    raise exception 'Ce tiers n''est ni fournisseur, ni loueur, ni sous-traitant dans l''annuaire.' using errcode = '22023';
  end if;
  if v_delai is null or v_delai < 0 or v_delai > 120 then
    raise exception 'Le délai du fournisseur va de 0 à 120 jours ouvrés.' using errcode = '22023';
  end if;
  if v_quantite is not null and v_quantite <= 0 then
    raise exception 'La quantité commandée est positive.' using errcode = '22023';
  end if;
  if coalesce(btrim(case when v ? 'objet' then v ->> 'objet' else k.objet end), '') = '' then
    raise exception 'Dites ce qui est commandé.' using errcode = '22023';
  end if;

  if p_commande is null then
    insert into public.btp_commandes (client_id, chantier_id, entite_id, lot_id, passage_id, fournisseur_id, fournisseur_libelle, objet,
                                      quantite_texte, quantite, unite, reference, delai_jours, besoin_le, note, a_retourner, retour_prevu, cree_par)
    values (c.client_id, c.id, c.entite_id, v_lot, v_passage, v_fournisseur, nullif(btrim(v ->> 'fournisseur_libelle'), ''),
            btrim(v ->> 'objet'), nullif(btrim(v ->> 'quantite_texte'), ''), v_quantite, left(nullif(btrim(v ->> 'unite'), ''), 12),
            nullif(btrim(v ->> 'reference'), ''), v_delai, nullif(v ->> 'besoin_le', '')::date, nullif(btrim(v ->> 'note'), ''),
            coalesce((v ->> 'a_retourner')::boolean, false), nullif(v ->> 'retour_prevu', '')::date, (select auth.uid()))
    returning id into v_id;
    perform private.journaliser(c.client_id, 'daliro.commande_ouverte', 'btp_commandes', v_id::text,
      jsonb_build_object('chantier', c.id, 'objet', btrim(v ->> 'objet'), 'passage', v_passage, 'delai_jours', v_delai), c.entite_id);
  else
    update public.btp_commandes set
      lot_id = v_lot, passage_id = v_passage, fournisseur_id = v_fournisseur, delai_jours = v_delai, quantite = v_quantite,
      fournisseur_libelle = case when v ? 'fournisseur_libelle' then nullif(btrim(v ->> 'fournisseur_libelle'), '') else fournisseur_libelle end,
      objet = case when v ? 'objet' then btrim(v ->> 'objet') else objet end,
      quantite_texte = case when v ? 'quantite_texte' then nullif(btrim(v ->> 'quantite_texte'), '') else quantite_texte end,
      unite = case when v ? 'unite' then left(nullif(btrim(v ->> 'unite'), ''), 12) else unite end,
      reference = case when v ? 'reference' then nullif(btrim(v ->> 'reference'), '') else reference end,
      besoin_le = case when v ? 'besoin_le' then nullif(v ->> 'besoin_le', '')::date else besoin_le end,
      note = case when v ? 'note' then nullif(btrim(v ->> 'note'), '') else note end,
      a_retourner = case when v ? 'a_retourner' then coalesce((v ->> 'a_retourner')::boolean, false) else a_retourner end,
      retour_prevu = case when v ? 'retour_prevu' then nullif(v ->> 'retour_prevu', '')::date else retour_prevu end,
      maj_le = now()
    where id = k.id;
    v_id := k.id;
  end if;
  return v_id;
end $function$;

create or replace function public.btp_noter_commande(p_commande uuid, p_livraison_prevue date, p_commandee_le date default null, p_reference text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k public.btp_commandes;
  v_le date := coalesce(p_commandee_le, (now() at time zone 'Europe/Paris')::date);
begin
  select * into k from public.btp_commandes where id = p_commande for update;
  if not found then
    raise exception 'Commande introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_appro(k.client_id, k.entite_id);
  if k.statut not in ('a_commander', 'commandee') then
    raise exception 'Cette commande est déjà livrée ou annulée.' using errcode = '23514';
  end if;
  if k.fournisseur_id is null and coalesce(btrim(k.fournisseur_libelle), '') = '' then
    raise exception 'Choisissez le fournisseur avant de commander.' using errcode = '22023';
  end if;
  if v_le > (now() at time zone 'Europe/Paris')::date then
    raise exception 'Une commande se note passée au plus tard aujourd''hui.' using errcode = '22023';
  end if;
  if p_livraison_prevue is null or p_livraison_prevue < v_le then
    raise exception 'La livraison promise est au plus tôt le jour de la commande.' using errcode = '22023';
  end if;
  update public.btp_commandes set statut = 'commandee', commandee_le = v_le, livraison_prevue = p_livraison_prevue,
         reference = coalesce(nullif(btrim(p_reference), ''), reference), maj_le = now()
  where id = k.id;
  perform private.journaliser(k.client_id, 'daliro.commande_passee', 'btp_commandes', k.id::text,
    jsonb_build_object('commandee_le', v_le, 'livraison_prevue', p_livraison_prevue, 'reference', p_reference), k.entite_id);
  return private.btp_echeances_commande(k.id);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- La liste cadencée depuis le devis
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_preparer_liste(p_chantier uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
  r record;
  v_creees integer := 0;
  v_deja integer := 0;
  v_passage uuid;
begin
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_appro(c.client_id, c.entite_id);
  if c.statut not in ('preparation', 'ouvert', 'suspendu') then
    raise exception 'Le chantier n''est plus en cours : on n''y commande plus.' using errcode = '23514';
  end if;
  if not exists (select 1 from public.btp_marches m where m.chantier_id = c.id and m.statut = 'verifie') then
    raise exception 'La liste se prépare depuis le marché vérifié : vérifiez d''abord le marché.' using errcode = '23514';
  end if;
  for r in
    select li.id, li.lot_id, li.designation, li.quantite, li.unite
    from public.btp_lignes_marche li
    join public.btp_marches m on m.id = li.marche_id
    join public.btp_lots l on l.id = li.lot_id
    where m.chantier_id = c.id and m.statut = 'verifie' and l.execution = 'client'
      and li.nature in ('ouvrage', 'fourniture') and li.quantite is not null and li.quantite > 0
      and li.unite in ('u', 'ml', 'm2', 'm3', 'kg', 't', 'l')
    order by l.rang, l.code, li.ordre
  loop
    if exists (select 1 from public.btp_commandes k where k.chantier_id = c.id and k.ligne_marche_id = r.id and k.statut <> 'annulee') then
      v_deja := v_deja + 1;
      continue;
    end if;
    select p.id into v_passage from public.btp_passages p
    where p.chantier_id = c.id and p.lot_id = r.lot_id and p.statut = 'prevu' and p.remplace_par_id is null
    order by p.debut limit 1;
    insert into public.btp_commandes (client_id, chantier_id, entite_id, lot_id, passage_id, ligne_marche_id, objet, quantite, unite,
                                      quantite_texte, delai_jours, cree_par)
    values (c.client_id, c.id, c.entite_id, r.lot_id, v_passage, r.id, left(btrim(r.designation), 300), r.quantite, r.unite,
            translate(regexp_replace(to_char(r.quantite, 'FM999999990.999'), '\.$', ''), '.', ',') || ' '
              || case r.unite when 'm2' then 'm²' when 'm3' then 'm³' when 'ml' then 'm' else r.unite end,
            5, (select auth.uid()));
    v_creees := v_creees + 1;
  end loop;
  if v_creees > 0 then
    perform private.journaliser(c.client_id, 'daliro.liste_preparee', 'btp_chantiers', c.id::text,
      jsonb_build_object('creees', v_creees, 'deja', v_deja), c.entite_id);
  end if;
  return jsonb_build_object('creees', v_creees, 'deja', v_deja);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Recevoir : chaque bon de livraison comparé à la commande
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_recevoir(k public.btp_commandes, p_livree_le date, p_quantite numeric, p_bon text, p_piece uuid,
                                                p_note text, p_complete boolean)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_le date := coalesce(p_livree_le, (now() at time zone 'Europe/Paris')::date);
  v_cumul numeric;
  v_complete boolean;
  e jsonb;
begin
  perform private.btp_exiger_appro(k.client_id, k.entite_id);
  if k.statut not in ('commandee', 'livree_partielle') then
    raise exception 'Seule une commande passée se reçoit.' using errcode = '23514';
  end if;
  if v_le > (now() at time zone 'Europe/Paris')::date or v_le < k.commandee_le then
    raise exception 'La livraison est entre le jour de la commande et aujourd''hui.' using errcode = '22023';
  end if;
  if p_quantite is not null and p_quantite <= 0 then
    raise exception 'La quantité reçue est positive.' using errcode = '22023';
  end if;
  if p_piece is not null and not exists (select 1 from public.pieces x where x.client_id = k.client_id and x.id = p_piece) then
    raise exception 'Le bon de livraison n''est pas une pièce de l''organisation.' using errcode = '23514';
  end if;
  insert into public.btp_livraisons (client_id, commande_id, chantier_id, entite_id, livree_le, quantite, bon_reference, piece_id, note, saisi_par)
  values (k.client_id, k.id, k.chantier_id, k.entite_id, v_le, p_quantite, left(nullif(btrim(p_bon), ''), 60), p_piece,
          left(nullif(btrim(p_note), ''), 500), (select auth.uid()));
  select sum(l.quantite) into v_cumul from public.btp_livraisons l where l.commande_id = k.id;
  -- Complète : la quantité commandée est atteinte ; sans quantité connue, ce que dit la personne.
  v_complete := case when k.quantite is not null and v_cumul is not null then v_cumul >= k.quantite else coalesce(p_complete, true) end;
  update public.btp_commandes set statut = case when v_complete then 'livree' else 'livree_partielle' end, livree_le = v_le,
         note = coalesce(left(nullif(btrim(p_note), ''), 500), note), maj_le = now()
  where id = k.id;
  e := private.btp_echeances_commande(k.id);
  perform private.journaliser(k.client_id, 'daliro.commande_livree', 'btp_commandes', k.id::text,
    jsonb_build_object('livree_le', v_le, 'quantite', p_quantite, 'bon', p_bon, 'piece', p_piece, 'complete', v_complete,
                       'cumul', v_cumul, 'commandee', k.quantite, 'ecart', e -> 'ecart'), k.entite_id);
  return e || jsonb_build_object('rapprochement',
    case when k.quantite is null or v_cumul is null then 'sans_quantite'
         when v_cumul < k.quantite then 'manquant'
         when v_cumul = k.quantite then 'conforme'
         else 'excedent' end);
end $function$;

create or replace function public.btp_recevoir(p_commande uuid, p_livree_le date default null, p_quantite numeric default null,
                                               p_bon_reference text default null, p_piece uuid default null, p_note text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k public.btp_commandes;
begin
  select * into k from public.btp_commandes where id = p_commande for update;
  if not found then
    raise exception 'Commande introuvable.' using errcode = 'P0002';
  end if;
  return private.btp_recevoir(k, p_livree_le, p_quantite, p_bon_reference, p_piece, p_note, null);
end $function$;

-- L'ancienne porte de b6_22 (sans quantité) passe par la même réception.
create or replace function public.btp_noter_livraison(p_commande uuid, p_livree_le date default null, p_complete boolean default true, p_note text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k public.btp_commandes;
begin
  select * into k from public.btp_commandes where id = p_commande for update;
  if not found then
    raise exception 'Commande introuvable.' using errcode = 'P0002';
  end if;
  return private.btp_recevoir(k, p_livree_le, null, null, null, p_note, p_complete);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Le matériel à rendre
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_noter_retour(p_commande uuid, p_rendu_le date default null, p_retour_prevu date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k public.btp_commandes;
  v_auj date := (now() at time zone 'Europe/Paris')::date;
begin
  select * into k from public.btp_commandes where id = p_commande for update;
  if not found then
    raise exception 'Commande introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_appro(k.client_id, k.entite_id);
  if p_rendu_le is null and p_retour_prevu is null then
    raise exception 'Donnez la date du retour, ou la date à laquelle le rendre.' using errcode = '22023';
  end if;
  if p_rendu_le is not null then
    if k.statut not in ('livree', 'livree_partielle') then
      raise exception 'Seul du matériel reçu se rend.' using errcode = '23514';
    end if;
    if p_rendu_le > v_auj or p_rendu_le < k.livree_le then
      raise exception 'Le retour est entre la livraison et aujourd''hui.' using errcode = '22023';
    end if;
  end if;
  update public.btp_commandes
     set a_retourner = true, retour_prevu = coalesce(p_retour_prevu, retour_prevu), retourne_le = coalesce(p_rendu_le, retourne_le), maj_le = now()
   where id = k.id;
  if p_rendu_le is not null then
    perform private.journaliser(k.client_id, 'daliro.materiel_rendu', 'btp_commandes', k.id::text,
      jsonb_build_object('rendu_le', p_rendu_le), k.entite_id);
  end if;
  return private.btp_echeances_commande(k.id);
end $function$;

-- L'écran : plus les livraisons de chaque commande.
create or replace function public.btp_appro_chantier(p_chantier uuid)
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
  if not private.btp_est_serveur() and ((select auth.uid()) is null or c.client_id not in (select private.mes_clients())
                                       or not private.voit_entite(c.client_id, c.entite_id)) then
    raise exception 'Ce chantier ne vous est pas ouvert.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'commandes', (
      select coalesce(jsonb_agg(to_jsonb(k) || jsonb_build_object(
               'fournisseur_nom', coalesce((select t.nom from public.btp_tiers t where t.id = k.fournisseur_id), k.fournisseur_libelle),
               'passage_tache', (select p.tache from public.btp_passages p where p.id = k.passage_id),
               'lot_code', (select l.code from public.btp_lots l where l.id = k.lot_id),
               'livraisons', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'livree_le', x.livree_le, 'quantite', x.quantite,
                                                                          'bon_reference', x.bon_reference, 'piece_id', x.piece_id, 'note', x.note)
                                                        order by x.livree_le, x.cree_le), '[]'::jsonb)
                              from public.btp_livraisons x where x.commande_id = k.id),
               'echeances', private.btp_echeances_commande(k.id))
             order by k.statut = 'annulee', k.statut = 'livree' and not k.a_retourner, k.cree_le), '[]'::jsonb)
      from public.btp_commandes k where k.chantier_id = c.id),
    'fournisseurs', (
      select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'nom', t.nom) order by t.nom collate "C"), '[]'::jsonb)
      from public.btp_tiers t where t.client_id = c.client_id and t.actif and t.roles && array['fournisseur', 'loueur', 'sous_traitant']),
    'devis_verifie', exists (select 1 from public.btp_marches m where m.chantier_id = c.id and m.statut = 'verifie'));
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Le point du matin (b6_22) : plus les retours et les livraisons incomplètes
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_point_matin_lignes(p_client uuid, p_jour date)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_items jsonb := '[]'::jsonb;
  v_n integer := 0;
  v_total numeric;
  v_facture numeric;
  v_ouvertes integer;
begin
  -- 0. Les situations en retard de paiement (b6_16) : relancez.
  for r in
    select s.id, s.numero, s.chantier_id, c.nom as chantier_nom, private.btp_encaissement(s.id, p_jour) as e
    from public.btp_situations s join public.btp_chantiers c on c.id = s.chantier_id
    where s.client_id = p_client and s.statut = 'validee' and s.echeance < p_jour
    order by s.echeance, c.nom, s.numero
  loop
    continue when r.e ->> 'etat' <> 'en_retard';
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : situation n° %s impayée depuis %s jour%s, reste dû %s € (indemnité de 40 € due) : relancez', r.chantier_nom, r.numero,
                           r.e ->> 'retard_jours', case when (r.e ->> 'retard_jours')::int > 1 then 's' else '' end,
                           translate(to_char((r.e ->> 'reste_du')::numeric, 'FM999,999,990.00'), ',.', ' ,')), 300),
      'gravite', case when (r.e ->> 'retard_jours')::int >= 30 then 'critique' else 'attention' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 0 bis. Les avenants pas encore signés (b6_18) : un travail supplémentaire exécuté sans accord écrit risque de
  -- ne pas être payé (marché à forfait : Code civil, art. 1793).
  for r in
    select a.id, a.numero, a.objet, a.statut, a.chantier_id, c.nom as chantier_nom,
           (a.cree_le at time zone 'Europe/Paris')::date as cree_jour,
           (a.soumis_le at time zone 'Europe/Paris')::date as soumis_jour,
           d.statut as demande_statut,
           (select coalesce(sum(l.montant_ht), 0) from public.btp_avenants_lignes l where l.avenant_id = a.id and not l.retiree) as montant
    from public.btp_avenants a
    join public.btp_chantiers c on c.id = a.chantier_id
    left join public.demandes_validation d on d.id = a.demande_id
    where a.client_id = p_client and a.statut in ('brouillon', 'soumis') and c.statut in ('preparation', 'ouvert', 'suspendu')
    order by a.soumis_le nulls last, a.cree_le, c.nom, a.numero
  loop
    exit when v_n >= 50;
    if r.statut = 'soumis' and r.demande_statut = 'approuvee' then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : avenant n° %s « %s » (%s € HT) validé, pas encore signé : faites-le signer par le maître d''ouvrage avant d''exécuter (C. civ. art. 1793)',
                             r.chantier_nom, r.numero, left(r.objet, 60), translate(to_char(r.montant, 'FM999,999,990.00'), ',.', ' ,')), 300),
        'gravite', case when r.soumis_jour <= p_jour - 14 then 'critique' else 'attention' end,
        'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
      v_n := v_n + 1;
    elsif r.statut = 'soumis' and r.demande_statut = 'en_attente' and r.soumis_jour <= p_jour - 2 then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : avenant n° %s « %s » en attente de validation depuis le %s : décidez dans « À valider »',
                             r.chantier_nom, r.numero, left(r.objet, 60), to_char(r.soumis_jour, 'DD/MM/YYYY')), 300),
        'gravite', case when r.soumis_jour <= p_jour - 7 then 'attention' else 'info' end,
        'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
      v_n := v_n + 1;
    elsif r.statut = 'brouillon' and r.cree_jour <= p_jour - 7 then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : avenant n° %s « %s » en préparation depuis le %s : chiffrez-le et soumettez-le, ou abandonnez-le',
                             r.chantier_nom, r.numero, left(r.objet, 60), to_char(r.cree_jour, 'DD/MM/YYYY')), 300),
        'gravite', 'info',
        'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
      v_n := v_n + 1;
    end if;
  end loop;

  -- 0 ter. Les passages qui devaient être finis et ne sont pas notés faits (b6_19) : notez-les faits ou recalez la suite.
  for r in
    select q.id, q.tache, q.fin, q.chantier_id, c.nom as chantier_nom,
           coalesce((select e.nom from public.btp_equipes e where e.id = q.equipe_id),
                    (select t.nom from public.btp_tiers t where t.id = q.tiers_id), q.intervenant_lu) as intervenant,
           (with recursive aval(id) as (
              select d.aval_id from public.btp_dependances d where d.amont_id = q.id
              union
              select d.aval_id from public.btp_dependances d join aval x on d.amont_id = x.id)
            select count(*) from aval x join public.btp_passages w on w.id = x.id where w.statut = 'prevu') as en_aval
    from public.btp_passages q join public.btp_chantiers c on c.id = q.chantier_id
    where q.client_id = p_client and q.statut = 'prevu' and q.remplace_par_id is null and q.fin < p_jour
      and c.statut in ('ouvert', 'suspendu')
    order by q.fin, c.nom
  loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : « %s »%s devait finir le %s et n''est pas noté fait : notez-le fait ou recalez la suite%s',
                           r.chantier_nom, coalesce(r.tache, 'passage'), coalesce(' (' || r.intervenant || ')', ''), to_char(r.fin, 'DD/MM/YYYY'),
                           case when r.en_aval > 0 then format(' (%s passage%s en aval)', r.en_aval, case when r.en_aval > 1 then 's' else '' end) else '' end), 300),
      'gravite', case when r.en_aval > 0 then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 0 quater. La météo des passages extérieurs (b6_21) : décalez ou protégez.
  for r in select x from jsonb_array_elements(private.btp_risques_meteo(p_client, p_jour)) x loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(r.x ->> 'texte', 300),
      'gravite', case when (r.x ->> 'jour')::date <= p_jour + 2 then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.x ->> 'chantier_id');
    v_n := v_n + 1;
  end loop;

  -- 0 quinquies. L'approvisionnement (b6_22) : à commander, à relancer.
  for r in
    select k.id, k.objet, k.chantier_id, k.livraison_prevue, c.nom as chantier_nom,
           coalesce((select t.nom from public.btp_tiers t where t.id = k.fournisseur_id), k.fournisseur_libelle) as fournisseur,
           private.btp_echeances_commande(k.id, p_jour) as e
    from public.btp_commandes k join public.btp_chantiers c on c.id = k.chantier_id
    where k.client_id = p_client and k.statut in ('a_commander', 'commandee', 'livree_partielle')
      and c.statut in ('preparation', 'ouvert', 'suspendu')
    order by k.cree_le
  loop
    exit when v_n >= 50;
    continue when r.e ->> 'etat' not in ('commande_en_retard', 'a_commander_vite', 'livraison_attendue', 'livraison_tardive');
    v_items := v_items || jsonb_build_object(
      'texte', left(case r.e ->> 'etat'
        when 'commande_en_retard' then format('%s : « %s » chez %s devait être commandé avant le %s — commandez aujourd''hui ou recalez le passage',
                                              r.chantier_nom, left(r.objet, 60), r.fournisseur, to_char((r.e ->> 'commander_avant')::date, 'DD/MM/YYYY'))
        when 'a_commander_vite' then format('%s : commandez « %s » chez %s avant le %s (livraison avant le %s)',
                                            r.chantier_nom, left(r.objet, 60), r.fournisseur, to_char((r.e ->> 'commander_avant')::date, 'DD/MM/YYYY'),
                                            to_char((r.e ->> 'livrer_avant')::date, 'DD/MM/YYYY'))
        when 'livraison_attendue' then format('%s : « %s » attendu le %s chez %s n''est pas noté reçu — relancez le fournisseur',
                                              r.chantier_nom, left(r.objet, 60), to_char(r.livraison_prevue, 'DD/MM/YYYY'), r.fournisseur)
        else format('%s : « %s » promis le %s par %s, après le %s où il le faut — relancez ou recalez',
                    r.chantier_nom, left(r.objet, 60), to_char(r.livraison_prevue, 'DD/MM/YYYY'), r.fournisseur,
                    to_char((r.e ->> 'livrer_avant')::date, 'DD/MM/YYYY'))
      end, 300),
      'gravite', case when r.e ->> 'etat' = 'a_commander_vite' then 'info' else 'attention' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 0 sexies. Le matériel à rendre et les livraisons incomplètes (b6_23).
  for r in
    select k.id, k.objet, k.chantier_id, k.unite, c.nom as chantier_nom,
           coalesce((select t.nom from public.btp_tiers t where t.id = k.fournisseur_id), k.fournisseur_libelle) as fournisseur,
           private.btp_echeances_commande(k.id, p_jour) as e
    from public.btp_commandes k join public.btp_chantiers c on c.id = k.chantier_id
    where k.client_id = p_client and c.statut in ('ouvert', 'suspendu', 'receptionne')
      and ((k.a_retourner and k.retourne_le is null and k.statut in ('livree', 'livree_partielle')) or k.statut = 'livree_partielle')
    order by k.cree_le
  loop
    exit when v_n >= 50;
    if r.e ->> 'retour' = 'a_rendre' then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : « %s » (%s) devait repartir le %s et reste sur le chantier — rendez-le, chaque jour se paie',
                             r.chantier_nom, left(r.objet, 60), r.fournisseur, to_char((r.e ->> 'retour_prevu')::date, 'DD/MM/YYYY')), 300),
        'gravite', 'attention', 'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
      v_n := v_n + 1;
    elsif r.e ->> 'etat' = 'livree_partielle' and (r.e ->> 'ecart') is not null and (r.e ->> 'ecart')::numeric < 0 then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : « %s » chez %s — il manque %s %s au bon de livraison : relancez',
                             r.chantier_nom, left(r.objet, 60), r.fournisseur,
                             translate(regexp_replace(to_char(-(r.e ->> 'ecart')::numeric, 'FM999999990.999'), '\.$', ''), '.', ','),
                             coalesce(case r.unite when 'm2' then 'm²' when 'm3' then 'm³' when 'ml' then 'm' else r.unite end, '')), 300),
        'gravite', case when (r.e ->> 'livrer_avant')::date <= p_jour then 'attention' else 'info' end,
        'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
      v_n := v_n + 1;
    end if;
  end loop;

  -- 1. Les retenues : dues (à réclamer), puis dues dans les 30 jours.
  for r in
    select x.*, c.nom as chantier_nom from public.btp_receptions x join public.btp_chantiers c on c.id = x.chantier_id
    where x.client_id = p_client and x.retenue_statut = 'bloquee' and (x.retenue_montant > 0 or x.retenue_caution)
      and x.retenue_due_le <= p_jour + 30
    order by x.retenue_due_le, c.nom
  loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : %s %s le %s%s', r.chantier_nom,
                           case when r.retenue_caution then 'caution de retenue de garantie' else 'retenue de garantie de ' || translate(to_char(r.retenue_montant, 'FM999,999,990.00'), ',.', ' ,') || ' €' end,
                           case when r.retenue_due_le <= p_jour then 'due depuis' else 'due' end,
                           to_char(r.retenue_due_le, 'DD/MM/YYYY'),
                           case when r.retenue_due_le <= p_jour then ' : réclamez-la' else '' end), 300),
      'gravite', case when r.retenue_due_le <= p_jour then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 2. Les décomptes finals à envoyer (45 jours après la réception).
  for r in
    select x.*, c.nom as chantier_nom from public.btp_receptions x join public.btp_chantiers c on c.id = x.chantier_id
    where x.client_id = p_client and x.decompte_statut in ('a_preparer', 'projet')
    order by x.date_reception, c.nom
  loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : décompte final à envoyer %s le %s', r.chantier_nom,
                           case when p_jour > r.date_reception + 45 then 'depuis' else 'avant' end,
                           to_char(r.date_reception + 45, 'DD/MM/YYYY')), 300),
      'gravite', case when p_jour >= r.date_reception + 30 then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 3. Les réserves encore ouvertes.
  for r in
    select x.chantier_id, x.date_reception, c.nom as chantier_nom, count(v.id) as ouvertes
    from public.btp_receptions x
    join public.btp_chantiers c on c.id = x.chantier_id
    join public.btp_reserves v on v.reception_id = x.id and v.statut = 'ouverte'
    where x.client_id = p_client
    group by x.chantier_id, x.date_reception, c.nom
    order by x.date_reception, c.nom
  loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : %s réserve%s encore ouverte%s depuis la réception du %s', r.chantier_nom, r.ouvertes,
                           case when r.ouvertes > 1 then 's' else '' end, case when r.ouvertes > 1 then 's' else '' end,
                           to_char(r.date_reception, 'DD/MM/YYYY')), 300),
      'gravite', case when p_jour >= r.date_reception + 60 then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 4. Les réceptions à prononcer.
  for r in
    select c.* from public.btp_chantiers c
    where c.client_id = p_client and c.statut in ('ouvert', 'suspendu')
      and not exists (select 1 from public.btp_receptions x where x.chantier_id = c.id)
    order by c.nom
  loop
    exit when v_n >= 50;
    select coalesce(sum(l.montant_ht), 0) into v_total
    from public.btp_lignes_marche l
    where l.nature <> 'option'
      and l.marche_id = (select m.id from public.btp_marches m where m.chantier_id = r.id and m.statut = 'verifie' order by m.verifie_le desc nulls last limit 1);
    v_total := v_total + coalesce((select sum(l.montant_ht) from public.btp_avenants_lignes l join public.btp_avenants a on a.id = l.avenant_id
                                   where a.chantier_id = r.id and a.statut = 'signe' and not l.retiree), 0);
    select s.cumul_ht into v_facture from public.btp_situations s where s.chantier_id = r.id and s.statut = 'validee' order by s.numero desc limit 1;
    if v_total > 0 and coalesce(v_facture, 0) >= v_total * 0.995 then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : travaux facturés à 100 %% par les situations — prononcez la réception', r.nom), 300),
        'gravite', 'attention', 'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.id::text);
      v_n := v_n + 1;
    elsif r.date_fin_prevue is not null and r.date_fin_prevue < p_jour then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : fin prévue le %s dépassée — réception à prononcer ou planning à recaler', r.nom,
                             to_char(r.date_fin_prevue, 'DD/MM/YYYY')), 300),
        'gravite', 'info', 'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.id::text);
      v_n := v_n + 1;
    end if;
  end loop;
  return v_items;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Droits (à inscrire dans omega/a5_01_liste_figee.txt)
-- ─────────────────────────────────────────────────────────────────────────
revoke execute on function private.btp_echeances_commande(uuid, date) from public, anon, authenticated;
revoke execute on function private.btp_recevoir(public.btp_commandes, date, numeric, text, uuid, text, boolean) from public, anon, authenticated;
revoke execute on function private.btp_point_matin_lignes(uuid, date) from public, anon, authenticated;
grant execute on function private.btp_echeances_commande(uuid, date) to service_role;
grant execute on function private.btp_recevoir(public.btp_commandes, date, numeric, text, uuid, text, boolean) to service_role;
grant execute on function private.btp_point_matin_lignes(uuid, date) to service_role;
revoke execute on function public.btp_ecrire_commande(uuid, uuid, jsonb) from public, anon;
revoke execute on function public.btp_noter_commande(uuid, date, date, text) from public, anon;
revoke execute on function public.btp_noter_livraison(uuid, date, boolean, text) from public, anon;
revoke execute on function public.btp_appro_chantier(uuid) from public, anon;
revoke execute on function public.btp_preparer_liste(uuid) from public, anon;
revoke execute on function public.btp_recevoir(uuid, date, numeric, text, uuid, text) from public, anon;
revoke execute on function public.btp_noter_retour(uuid, date, date) from public, anon;
grant execute on function public.btp_ecrire_commande(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function public.btp_noter_commande(uuid, date, date, text) to authenticated, service_role;
grant execute on function public.btp_noter_livraison(uuid, date, boolean, text) to authenticated, service_role;
grant execute on function public.btp_appro_chantier(uuid) to authenticated, service_role;
grant execute on function public.btp_preparer_liste(uuid) to authenticated, service_role;
grant execute on function public.btp_recevoir(uuid, date, numeric, text, uuid, text) to authenticated, service_role;
grant execute on function public.btp_noter_retour(uuid, date, date) to authenticated, service_role;
