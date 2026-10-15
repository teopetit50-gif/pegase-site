-- b6_22 — DALIRO : l'approvisionnement — commandes, délais fournisseurs, livraisons attendues (session B6, 06/10/2026)
--
-- CE QUE ÇA CORRIGE. Un passage confirmé à J-2 ne sert à rien si les menuiseries ne sont pas livrées : le délai du
-- fournisseur (trois semaines pour des fenêtres sur mesure) se joue bien avant. Daliro ne savait rien des commandes.
--
-- CE QUI EST POSÉ.
--   · public.btp_commandes : une commande de chantier (fournisseur de l'annuaire ou nommé librement, objet, quantité
--     en clair, référence), rattachée au passage qui en a besoin (ou à une date de besoin), avec le délai annoncé par
--     le fournisseur en jours ouvrés. États : à commander → commandée → livrée en partie → livrée ; ou annulée.
--     Pas de montant : il est sur la facture (FILED, b6_03).
--   · private.btp_echeances_commande : le besoin (début du passage, qui suit donc ses recalages, b6_19), « livrer
--     avant » = le jour ouvré qui précède, « commander avant » = livrer avant − délai du fournisseur, en jours ouvrés
--     du territoire du chantier (public.ajouter_jours) ; et l'état : à commander vite (≤ 2 jours ouvrés), commande en
--     retard, livraison prévue trop tard, livraison attendue (date passée, rien reçu).
--   · portes : btp_ecrire_commande, btp_noter_commande (commandée, livraison promise), btp_noter_livraison (complète
--     ou partielle), btp_annuler_commande, btp_appro_chantier (l'écran). Le bureau du chantier (gérant, admin,
--     valideur, collaborateur : le conducteur de travaux) ; lecture par les membres qui voient le chantier. Journal.
--   · Le point du matin (b6_21) porte en plus ce qui est à commander ou à relancer.
--
-- Règles de pose : create … if not exists / create or replace ; rien n'est retiré ni effacé. La fonction du point du
-- matin est celle de b6_21 à l'identique, plus le bloc « 0 quinquies » : poser APRÈS b6_21.

create table if not exists public.btp_commandes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  chantier_id uuid not null,
  entite_id uuid not null,
  lot_id uuid,
  passage_id uuid,
  fournisseur_id uuid,
  fournisseur_libelle text,
  objet text not null,
  quantite_texte text,
  reference text,
  delai_jours smallint not null default 5,
  besoin_le date,
  statut text not null default 'a_commander',
  commandee_le date,
  livraison_prevue date,
  livree_le date,
  note text,
  motif text,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint btp_commandes_client_id_id_key unique (client_id, id),
  constraint btp_commandes_chantier_fkey foreign key (client_id, chantier_id) references public.btp_chantiers(client_id, id) on delete cascade,
  constraint btp_commandes_lot_fkey foreign key (chantier_id, lot_id) references public.btp_lots(chantier_id, id) on delete set null (lot_id),
  constraint btp_commandes_passage_fkey foreign key (chantier_id, passage_id) references public.btp_passages(chantier_id, id) on delete set null (passage_id),
  constraint btp_commandes_fournisseur_fkey foreign key (client_id, fournisseur_id) references public.btp_tiers(client_id, id) on delete set null (fournisseur_id),
  constraint btp_commandes_statut_check check (statut in ('a_commander', 'commandee', 'livree_partielle', 'livree', 'annulee')),
  constraint btp_commandes_objet_check check (char_length(btrim(objet)) between 1 and 300),
  constraint btp_commandes_quantite_check check (char_length(quantite_texte) <= 120),
  constraint btp_commandes_reference_check check (char_length(reference) <= 60),
  constraint btp_commandes_fournisseur_libelle_check check (char_length(fournisseur_libelle) <= 120),
  constraint btp_commandes_note_check check (char_length(note) <= 500),
  constraint btp_commandes_motif_check check (char_length(motif) <= 300),
  constraint btp_commandes_delai_check check (delai_jours between 0 and 120),
  constraint btp_commandes_commandee_check check (statut in ('a_commander', 'annulee') or (commandee_le is not null and livraison_prevue is not null)),
  constraint btp_commandes_livree_check check (statut not in ('livree', 'livree_partielle') or livree_le is not null)
);
comment on table public.btp_commandes is 'DALIRO — commandes de chantier : délai fournisseur, livraison promise, livraison reçue. Écrite par les portes seules.';
create index if not exists btp_commandes_chantier_idx on public.btp_commandes (chantier_id, statut);
create index if not exists btp_commandes_passage_idx on public.btp_commandes (passage_id);
alter table public.btp_commandes enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_commandes' and policyname = 'membres lisent les commandes de leurs chantiers') then
    create policy "membres lisent les commandes de leurs chantiers" on public.btp_commandes
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $do$;
revoke all on table public.btp_commandes from anon, authenticated;
grant select on table public.btp_commandes to authenticated;
do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select x from unnest(array['btp_commandes']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;

-- ─────────────────────────────────────────────────────────────────────────
-- Qui commande : le bureau du chantier (conducteur compris) ; le serveur
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_exiger_appro(p_client uuid, p_entite uuid)
 returns void
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  if private.btp_est_serveur() then
    return;
  end if;
  if (select auth.uid()) is null
     or not private.a_un_role(p_client, array['gerant', 'admin', 'valideur', 'collaborateur'])
     or not private.voit_entite(p_client, p_entite) then
    raise exception 'Les commandes de ce chantier ne vous sont pas ouvertes.' using errcode = '42501';
  end if;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Les échéances d'une commande et son état
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
  v_livrer date;
  v_commander date;
  v_etat text;
begin
  select * into k from public.btp_commandes where id = p_commande;
  if not found then
    return null;
  end if;
  select coalesce(c.territoire, 'metropole') into v_territoire from public.btp_chantiers c where c.id = k.chantier_id;
  v_besoin := coalesce((select p.debut from public.btp_passages p where p.id = k.passage_id and p.statut <> 'annule'), k.besoin_le);
  if v_besoin is not null then
    v_livrer := public.ajouter_jours(v_besoin, -1, 'ouvres', v_territoire);
    v_commander := public.ajouter_jours(v_livrer, -k.delai_jours, 'ouvres', v_territoire);
  end if;
  v_etat := case
    when k.statut in ('livree', 'annulee') then k.statut
    when k.statut = 'a_commander' and v_commander is not null and v_commander < v_jour then 'commande_en_retard'
    when k.statut = 'a_commander' and v_commander is not null and v_commander <= public.ajouter_jours(v_jour, 2, 'ouvres', v_territoire) then 'a_commander_vite'
    when k.statut = 'a_commander' then 'a_commander'
    when k.livraison_prevue < v_jour then 'livraison_attendue'
    when v_livrer is not null and k.livraison_prevue > v_livrer then 'livraison_tardive'
    else k.statut
  end;
  return jsonb_build_object('besoin_le', v_besoin, 'livrer_avant', v_livrer, 'commander_avant', v_commander, 'etat', v_etat);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Écrire, commander, recevoir, annuler
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
  if coalesce(btrim(case when v ? 'objet' then v ->> 'objet' else k.objet end), '') = '' then
    raise exception 'Dites ce qui est commandé.' using errcode = '22023';
  end if;
  if v_fournisseur is null and coalesce(btrim(case when v ? 'fournisseur_libelle' then v ->> 'fournisseur_libelle' else k.fournisseur_libelle end), '') = '' then
    raise exception 'Nommez le fournisseur (de l''annuaire ou en clair).' using errcode = '22023';
  end if;

  if p_commande is null then
    insert into public.btp_commandes (client_id, chantier_id, entite_id, lot_id, passage_id, fournisseur_id, fournisseur_libelle, objet,
                                      quantite_texte, reference, delai_jours, besoin_le, note, cree_par)
    values (c.client_id, c.id, c.entite_id, v_lot, v_passage, v_fournisseur, nullif(btrim(v ->> 'fournisseur_libelle'), ''),
            btrim(v ->> 'objet'), nullif(btrim(v ->> 'quantite_texte'), ''), nullif(btrim(v ->> 'reference'), ''), v_delai,
            nullif(v ->> 'besoin_le', '')::date, nullif(btrim(v ->> 'note'), ''), (select auth.uid()))
    returning id into v_id;
    perform private.journaliser(c.client_id, 'daliro.commande_ouverte', 'btp_commandes', v_id::text,
      jsonb_build_object('chantier', c.id, 'objet', btrim(v ->> 'objet'), 'passage', v_passage, 'delai_jours', v_delai), c.entite_id);
  else
    update public.btp_commandes set
      lot_id = v_lot, passage_id = v_passage, fournisseur_id = v_fournisseur, delai_jours = v_delai,
      fournisseur_libelle = case when v ? 'fournisseur_libelle' then nullif(btrim(v ->> 'fournisseur_libelle'), '') else fournisseur_libelle end,
      objet = case when v ? 'objet' then btrim(v ->> 'objet') else objet end,
      quantite_texte = case when v ? 'quantite_texte' then nullif(btrim(v ->> 'quantite_texte'), '') else quantite_texte end,
      reference = case when v ? 'reference' then nullif(btrim(v ->> 'reference'), '') else reference end,
      besoin_le = case when v ? 'besoin_le' then nullif(v ->> 'besoin_le', '')::date else besoin_le end,
      note = case when v ? 'note' then nullif(btrim(v ->> 'note'), '') else note end,
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

create or replace function public.btp_noter_livraison(p_commande uuid, p_livree_le date default null, p_complete boolean default true, p_note text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k public.btp_commandes;
  v_le date := coalesce(p_livree_le, (now() at time zone 'Europe/Paris')::date);
begin
  select * into k from public.btp_commandes where id = p_commande for update;
  if not found then
    raise exception 'Commande introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_appro(k.client_id, k.entite_id);
  if k.statut not in ('commandee', 'livree_partielle') then
    raise exception 'Seule une commande passée se reçoit.' using errcode = '23514';
  end if;
  if v_le > (now() at time zone 'Europe/Paris')::date or v_le < k.commandee_le then
    raise exception 'La livraison est entre le jour de la commande et aujourd''hui.' using errcode = '22023';
  end if;
  update public.btp_commandes set statut = case when coalesce(p_complete, true) then 'livree' else 'livree_partielle' end,
         livree_le = v_le, note = coalesce(nullif(btrim(p_note), ''), note), maj_le = now()
  where id = k.id;
  perform private.journaliser(k.client_id, 'daliro.commande_livree', 'btp_commandes', k.id::text,
    jsonb_build_object('livree_le', v_le, 'complete', coalesce(p_complete, true), 'note', p_note), k.entite_id);
  return private.btp_echeances_commande(k.id);
end $function$;

create or replace function public.btp_annuler_commande(p_commande uuid, p_motif text)
 returns void
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
  perform private.btp_exiger_appro(k.client_id, k.entite_id);
  if k.statut in ('livree', 'annulee') then
    raise exception 'Cette commande est déjà livrée ou annulée.' using errcode = '23514';
  end if;
  if coalesce(btrim(p_motif), '') = '' then
    raise exception 'Une annulation se fait avec son motif.' using errcode = '22023';
  end if;
  update public.btp_commandes set statut = 'annulee', motif = left(btrim(p_motif), 300), maj_le = now() where id = k.id;
  perform private.journaliser(k.client_id, 'daliro.commande_annulee', 'btp_commandes', k.id::text,
    jsonb_build_object('motif', p_motif), k.entite_id);
end $function$;

-- L'écran : les commandes du chantier et leurs échéances.
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
               'echeances', private.btp_echeances_commande(k.id))
             order by k.statut = 'annulee', k.statut = 'livree', k.cree_le), '[]'::jsonb)
      from public.btp_commandes k where k.chantier_id = c.id),
    'fournisseurs', (
      select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'nom', t.nom) order by t.nom collate "C"), '[]'::jsonb)
      from public.btp_tiers t where t.client_id = c.client_id and t.actif and t.roles && array['fournisseur', 'loueur', 'sous_traitant']));
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Le point du matin (b6_21) : plus l'approvisionnement
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
revoke execute on function private.btp_exiger_appro(uuid, uuid) from public, anon, authenticated;
revoke execute on function private.btp_echeances_commande(uuid, date) from public, anon, authenticated;
revoke execute on function private.btp_point_matin_lignes(uuid, date) from public, anon, authenticated;
grant execute on function private.btp_exiger_appro(uuid, uuid) to service_role;
grant execute on function private.btp_echeances_commande(uuid, date) to service_role;
grant execute on function private.btp_point_matin_lignes(uuid, date) to service_role;
revoke execute on function public.btp_ecrire_commande(uuid, uuid, jsonb) from public, anon;
revoke execute on function public.btp_noter_commande(uuid, date, date, text) from public, anon;
revoke execute on function public.btp_noter_livraison(uuid, date, boolean, text) from public, anon;
revoke execute on function public.btp_annuler_commande(uuid, text) from public, anon;
revoke execute on function public.btp_appro_chantier(uuid) from public, anon;
grant execute on function public.btp_ecrire_commande(uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function public.btp_noter_commande(uuid, date, date, text) to authenticated, service_role;
grant execute on function public.btp_noter_livraison(uuid, date, boolean, text) to authenticated, service_role;
grant execute on function public.btp_annuler_commande(uuid, text) to authenticated, service_role;
grant execute on function public.btp_appro_chantier(uuid) to authenticated, service_role;
