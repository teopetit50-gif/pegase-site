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

-- Les vues security_invoker appellent ces fonctions de private sous le rôle du lecteur (règle du lot 19w : exécutables par authenticated).
grant execute on function private.btp_est_serveur() to authenticated, service_role;
grant execute on function private.btp_voit_prix(uuid) to authenticated, service_role;

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
