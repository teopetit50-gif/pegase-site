-- 20261019171347 a4_63_a4_66
-- Source : dépôt : ca5e4aa0 omega/migrations/a4_63_filed_lot55_releves_heures.sql ; ca5e4aa0 omega/migrations/a4_66_filed_lot58_rapprochement_devis.sql ; ca5e4aa0 omega/migrations/a4_51_filed_lot43_plusieurs_boites.sql ; ca5e4aa0 omega/migrations/a4_52_filed_lot44_vue_cabinet.sql ; ca5e4aa0 omega/migrations/a4_53_filed_lot45_frais_kilometriques.sql ; ca5e4aa0 omega/migrations/a4_54_filed_lot46_historique_par_palier.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_63_filed_lot55_releves_heures.sql @ ca5e4aa0, a4_66_filed_lot58_rapprochement_devis.sql @ ca5e4aa0, a4_51_filed_lot43_plusieurs_boites.sql @ ca5e4aa0, a4_52_filed_lot44_vue_cabinet.sql @ ca5e4aa0, a4_53_filed_lot45_frais_kilometriques.sql @ ca5e4aa0, a4_54_filed_lot46_historique_par_palier.sql @ ca5e4aa0.
-- ═══ omega/migrations/a4_63_filed_lot55_releves_heures.sql @ ca5e4aa0
-- a4_63 (FILED lot 55) : le relevé d'heures signé, rapproché de la facture d'intérim.
--
-- Décision du bureau, par délégation de Teo (19/10/2026, 16 h 14 Z), point 1 : type « releve_heures » (nature
-- autre), rapproché de la facture d'intérim (heures signées ↔ heures facturées) quand elle arrive.
--
--   · La pièce : pieces.type_piece = 'releve_heures'. filed_nature_de la range en « autre » (rien à changer : tout
--     type inconnu de FILED y va), filed_etat_de en « classe ».
--   · Sa fiche : public.filed_releves_heures, une par document, lue des valeurs du lecteur, aux noms d'A1
--     (worker-a1 4a4ad9e1, CHAMPS-LECTURE.md) : agence (le fournisseur), interimaire, client, periode_du, periode_au,
--     total_heures (le total écrit ; à défaut, la somme des lignes), signature_client (booléen), lignes [{date, heures,
--     taux, page}] ; le SIREN de l'agence par fournisseur.siren s'il est écrit. Les noms de la v1 (releve.heures,
--     releve.periode_debut, releve.periode_fin, releve.signe, releve.reference, fournisseur.nom) restent en repli.
--     Une personne corrige la fiche (public.filed_poser_releve_heures).
--   · Le rapprochement, au contrôle de chaque facture : les relevés libres du même fournisseur dont la période
--     finit dans les 62 jours avant la facture (ou 7 jours après) s'y rattachent, du plus ancien au plus récent,
--     tant que les heures facturées ne sont pas couvertes ; une facture peut en porter plusieurs (relevés
--     hebdomadaires, facture mensuelle). Le contrôle « rapprochement.heures » compare la somme
--     des heures signées aux heures facturées (lignes en heures). Jamais bloquant : attention si écart, si un
--     relevé n'est pas signé ou si les heures manquent ; attention aussi pour une facture en heures d'un fournisseur
--     qui envoie des relevés, quand aucun relevé n'est arrivé.
--   · Un relevé arrivé après sa facture : la facture encore ouverte est recontrôlée, il s'y rattache.
--   · Une personne écarte un relevé mal rattaché (public.filed_ecarter_releve_heures) : il ne revient plus.
--
-- Branchement dans private.filed_controler_facture par repère, après filed_rapprocher_facture. Rejouable.

create table if not exists public.filed_releves_heures (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  document_id uuid not null unique references public.filed_documents(id) on delete cascade,
  fournisseur_id uuid references public.filed_fournisseurs(id),
  agence text check (char_length(agence) <= 200),
  reference text check (char_length(reference) <= 100),
  periode_debut date,
  periode_fin date,
  heures numeric(9,2) check (heures is null or heures >= 0),
  signe boolean,
  interimaire text check (char_length(interimaire) <= 200),
  lignes jsonb not null default '[]' check (jsonb_typeof(lignes) = 'array'),
  facture_id uuid references public.filed_factures(id) on delete set null,
  lien text not null default 'libre' check (lien in ('libre', 'rapproche', 'ecarte')),
  source text not null default 'lecture' check (source in ('lecture', 'humain')),
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  check ((lien = 'rapproche') = (facture_id is not null) or lien = 'ecarte'),
  check (periode_fin is null or periode_debut is null or periode_fin >= periode_debut)
);
-- v2 (noms d'A1) : l'intérimaire et les lignes du relevé, pour une table déjà créée par la v1.
alter table public.filed_releves_heures add column if not exists interimaire text check (char_length(interimaire) <= 200);
alter table public.filed_releves_heures add column if not exists lignes jsonb not null default '[]' check (jsonb_typeof(lignes) = 'array');
create index if not exists filed_releves_heures_facture_idx on public.filed_releves_heures (facture_id) where facture_id is not null;
create index if not exists filed_releves_heures_libres_idx on public.filed_releves_heures (client_id, fournisseur_id) where lien = 'libre';
alter table public.filed_releves_heures enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_releves_heures' and policyname = 'filed_releves_heures_lecture') then
    create policy filed_releves_heures_lecture on public.filed_releves_heures for select to authenticated
      using (exists (select 1 from public.filed_documents d where d.id = document_id));
  end if;
end $$;
revoke all on public.filed_releves_heures from anon;
grant select on public.filed_releves_heures to authenticated;
grant all on public.filed_releves_heures to service_role;
do $$ begin
  if not exists (select 1 from private.tables_locataires where nom = 'filed_releves_heures') then
    insert into private.tables_locataires (nom, ordre_effacement, note) values ('filed_releves_heures', 7, 'FILED, lot 55');
  end if;
end $$;

-- ─── La fenêtre : un relevé dont la période finit dans les 62 jours avant la facture, ou 7 jours après ────
create or replace function private.filed_releve_dans_fenetre(r public.filed_releves_heures, p_date date)
returns boolean language sql stable set search_path to '' as $$
  select p_date is not null
     and coalesce(r.periode_fin, r.periode_debut, (select d.recu_le::date from public.filed_documents d where d.id = r.document_id))
         between p_date - 62 and p_date + 7
$$;
revoke all on function private.filed_releve_dans_fenetre(public.filed_releves_heures, date) from public, anon, authenticated;
grant execute on function private.filed_releve_dans_fenetre(public.filed_releves_heures, date) to service_role;

-- ─── Lire la fiche d'un relevé ───────────────────────────────────────────
create or replace function private.filed_lire_releve_heures(p_document uuid)
returns uuid language plpgsql security definer set search_path to '' as $$
declare d public.filed_documents; r public.filed_releves_heures; v jsonb; v_id uuid; v_four uuid; v_agence text; v_siren text; v_signe text;
        v_lignes jsonb; v_heures numeric;
begin
  select * into d from public.filed_documents where id = p_document;
  if not found or not exists (select 1 from public.pieces p where p.id = d.piece_id and p.type_piece = 'releve_heures') then
    return null;
  end if;
  select * into r from public.filed_releves_heures where document_id = p_document;
  if r.id is not null and r.source = 'humain' then return r.id; end if;
  v := coalesce(private.filed_valeurs(d.piece_id), '{}'::jsonb);
  -- Les noms d'A1 d'abord, ceux de la v1 en repli.
  v_agence := left(nullif(btrim(coalesce(v -> 'agence' ->> 'valeur', v -> 'fournisseur.nom' ->> 'valeur', '')), ''), 200);
  v_siren := nullif(regexp_replace(coalesce(v -> 'fournisseur.siren' ->> 'valeur', ''), '\D', '', 'g'), '');
  v_signe := lower(coalesce(v -> 'signature_client' ->> 'valeur', v -> 'releve.signe' ->> 'valeur', ''));
  v_lignes := case when jsonb_typeof(v -> 'lignes' -> 'valeur') = 'array' then v -> 'lignes' -> 'valeur' else '[]'::jsonb end;
  v_heures := coalesce(private.filed_montant_lu(v -> 'total_heures' ->> 'valeur'), private.filed_montant_lu(v -> 'releve.heures' ->> 'valeur'),
                       (select sum(private.filed_montant_lu(e ->> 'heures')) from jsonb_array_elements(v_lignes) e
                         where jsonb_array_length(v_lignes) > 0));
  if v_siren is not null then
    select f.id into v_four from public.filed_fournisseurs f where f.client_id = d.client_id and f.siren = left(v_siren, 9) limit 1;
  end if;
  if v_four is null and v_agence is not null then
    select f.id into v_four from public.filed_fournisseurs f
     where f.client_id = d.client_id and f.nom_normalise = private.filed_normaliser_nom(v_agence) limit 1;
  end if;
  insert into public.filed_releves_heures (client_id, entite_id, document_id, fournisseur_id, agence, reference, periode_debut, periode_fin,
                                           heures, signe, interimaire, lignes, source)
  values (d.client_id, d.entite_id, d.id, v_four, v_agence,
          left(nullif(btrim(coalesce(v -> 'releve.reference' ->> 'valeur', '')), ''), 100),
          coalesce(private.filed_date_lue(v -> 'periode_du' ->> 'valeur'), private.filed_date_lue(v -> 'releve.periode_debut' ->> 'valeur')),
          coalesce(private.filed_date_lue(v -> 'periode_au' ->> 'valeur'), private.filed_date_lue(v -> 'releve.periode_fin' ->> 'valeur')),
          v_heures,
          case when v_signe in ('oui', 'true', 'vrai', '1') then true when v_signe in ('non', 'false', 'faux', '0') then false end,
          left(nullif(btrim(coalesce(v -> 'interimaire' ->> 'valeur', '')), ''), 200), v_lignes, 'lecture')
  on conflict (document_id) do update
    set fournisseur_id = excluded.fournisseur_id, agence = excluded.agence, reference = excluded.reference,
        periode_debut = excluded.periode_debut, periode_fin = excluded.periode_fin, heures = excluded.heures, signe = excluded.signe,
        interimaire = excluded.interimaire, lignes = excluded.lignes, maj_le = now()
  returning id into v_id;
  perform private.filed_historiser(d.client_id, d.id, 'filed_document', d.id::text, 'releve_heures',
    format('Relevé d''heures lu%s%s.', coalesce(' : ' || v_agence, ''),
           coalesce(', ' || replace(trim_scale((select heures from public.filed_releves_heures where id = v_id))::text, '.', ',') || ' h', '')),
    jsonb_build_object('releve', v_id));
  return v_id;
end $$;
revoke all on function private.filed_lire_releve_heures(uuid) from public, anon, authenticated;
grant execute on function private.filed_lire_releve_heures(uuid) to service_role;

-- Les factures encore ouvertes du fournisseur d'un relevé, dans sa fenêtre, sont recontrôlées : il s'y rattache.
create or replace function private.filed_releve_heures_arrive(p_releve uuid)
returns integer language plpgsql security definer set search_path to '' as $$
declare r public.filed_releves_heures; f record; n integer := 0;
begin
  select * into r from public.filed_releves_heures where id = p_releve;
  if r.id is null or r.lien <> 'libre' or r.fournisseur_id is null then return 0; end if;
  for f in select x.id from public.filed_factures x
            where x.client_id = r.client_id and x.fournisseur_id = r.fournisseur_id and x.nature = 'facture'
              and x.statut in ('a_completer', 'bloquee', 'a_valider') and private.filed_releve_dans_fenetre(r, x.date_emission)
            order by x.date_emission, x.cree_le loop
    perform private.filed_controler_facture(f.id);
    n := n + 1;
    exit when (select lien from public.filed_releves_heures where id = p_releve) <> 'libre';
  end loop;
  return n;
end $$;
revoke all on function private.filed_releve_heures_arrive(uuid) from public, anon, authenticated;
grant execute on function private.filed_releve_heures_arrive(uuid) to service_role;

create or replace function private.filed_document_releve_heures()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_id uuid;
begin
  if new.etat in ('classe', 'integre') and (tg_op = 'INSERT' or old.nature is distinct from new.nature or old.etat is distinct from new.etat)
     and exists (select 1 from public.pieces p where p.id = new.piece_id and p.type_piece = 'releve_heures') then
    begin
      v_id := private.filed_lire_releve_heures(new.id);
      perform private.filed_releve_heures_arrive(v_id);
    exception when others then
      raise warning 'FILED : relevé d''heures non lu pour le document % (%)', new.id, sqlerrm;
    end;
  end if;
  return null;
end $$;
revoke all on function private.filed_document_releve_heures() from public, anon, authenticated;
grant execute on function private.filed_document_releve_heures() to service_role;
do $$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.filed_documents'::regclass and tgname = 'filed_documents_releve_heures') then
    create trigger filed_documents_releve_heures after insert or update of nature, etat on public.filed_documents
      for each row execute function private.filed_document_releve_heures();
  end if;
end $$;

-- ─── Le contrôle rapprochement.heures ───────────────────────────────────
create or replace function private.filed_rapprocher_heures(p_facture uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare
  v_f public.filed_factures;
  v_h_facture numeric; v_lignes_h integer;
  v_nb integer; v_h_releves numeric; v_inconnues integer; v_non_signes integer; v_ids jsonb;
  v_ecart numeric; v_pbs text[] := '{}'; v_couvert numeric; v_libre record;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if v_f.id is null or v_f.nature <> 'facture' or v_f.fournisseur_id is null then return; end if;

  select count(*), sum(l.quantite) into v_lignes_h, v_h_facture from public.filed_factures_lignes l
   where l.facture_id = v_f.id
     and (lower(btrim(coalesce(l.unite, ''))) in ('h', 'hr', 'hrs', 'heure', 'heures', 'hur', 'hh')
          or (l.unite is null and l.designation ~* '(^|[^a-z])heures?([^a-z]|$)'));

  -- Les relevés libres du même fournisseur, dans la fenêtre, se rattachent à cette facture, du plus ancien au plus
  -- récent, tant que ses heures ne sont pas couvertes (toutes, si elle n'a pas d'heures lues).
  select coalesce(sum(r.heures), 0) into v_couvert from public.filed_releves_heures r where r.facture_id = v_f.id and r.lien = 'rapproche';
  for v_libre in select r.id, r.heures from public.filed_releves_heures r
                  where r.client_id = v_f.client_id and r.lien = 'libre' and r.fournisseur_id = v_f.fournisseur_id
                    and private.filed_releve_dans_fenetre(r, v_f.date_emission)
                  order by coalesce(r.periode_fin, r.periode_debut), r.cree_le loop
    exit when v_lignes_h > 0 and v_couvert >= v_h_facture - 0.01;
    update public.filed_releves_heures set facture_id = v_f.id, lien = 'rapproche', maj_le = now() where id = v_libre.id;
    v_couvert := v_couvert + coalesce(v_libre.heures, 0);
  end loop;

  select count(*), sum(r.heures), count(*) filter (where r.heures is null), count(*) filter (where r.signe is not true),
         coalesce(jsonb_agg(jsonb_build_object('releve', r.id, 'document', r.document_id, 'heures', r.heures, 'signe', r.signe,
                                               'du', r.periode_debut, 'au', r.periode_fin) order by r.periode_debut), '[]'::jsonb)
    into v_nb, v_h_releves, v_inconnues, v_non_signes, v_ids
  from public.filed_releves_heures r where r.facture_id = v_f.id and r.lien = 'rapproche';

  if v_nb = 0 then
    -- Une facture en heures d'un fournisseur qui envoie des relevés, sans relevé pour cette période.
    if v_lignes_h > 0 and exists (select 1 from public.filed_releves_heures r
                                   where r.client_id = v_f.client_id and r.fournisseur_id = v_f.fournisseur_id) then
      perform private.filed_poser_resultat(v_f, 'rapprochement.heures', 'attention', true,
        format('Facture de %s h : aucun relevé d''heures signé reçu pour cette période.', replace(trim_scale(v_h_facture)::text, '.', ',')),
        'QTE_ERR', jsonb_build_object('heures_facture', v_h_facture));
    end if;
    return;
  end if;

  if v_inconnues > 0 then v_pbs := v_pbs || format('%s relevé(s) sans total d''heures lu', v_inconnues); end if;
  if v_non_signes > 0 then v_pbs := v_pbs || format('%s relevé(s) sans signature reconnue', v_non_signes); end if;
  if v_lignes_h = 0 then v_pbs := v_pbs || 'heures facturées non lues'::text; end if;
  if v_inconnues = 0 and v_lignes_h > 0 then
    v_ecart := v_h_facture - v_h_releves;
    if abs(v_ecart) > 0.01 then
      v_pbs := v_pbs || format('%s h facturées pour %s h signées (écart %s h)', replace(trim_scale(v_h_facture)::text, '.', ','),
                               replace(trim_scale(v_h_releves)::text, '.', ','), replace(trim_scale(v_ecart)::text, '.', ','));
    end if;
  end if;
  perform private.filed_poser_resultat(v_f, 'rapprochement.heures', 'attention', cardinality(v_pbs) > 0,
    case when cardinality(v_pbs) = 0
         then format('%s relevé(s) d''heures signé(s) : %s h, comme la facture.', v_nb, replace(trim_scale(v_h_releves)::text, '.', ','))
         else format('%s relevé(s) d''heures rattaché(s) : %s.', v_nb, array_to_string(v_pbs, ' ; ')) end,
    'QTE_ERR', jsonb_build_object('releves', v_ids, 'heures_releves', v_h_releves, 'heures_facture', v_h_facture, 'ecart', v_ecart));
end $$;
revoke all on function private.filed_rapprocher_heures(uuid) from public, anon, authenticated;
grant execute on function private.filed_rapprocher_heures(uuid) to service_role;

-- ─── Une personne corrige la fiche, ou écarte un relevé mal rattaché ───────
create or replace function private.filed_poser_releve_heures(p_document uuid, p_valeurs jsonb)
returns uuid language plpgsql security definer set search_path to '' as $$
declare d public.filed_documents; v_id uuid; v jsonb := coalesce(p_valeurs, '{}'::jsonb); r public.filed_releves_heures;
begin
  select * into d from public.filed_documents where id = p_document;
  if not found then raise exception 'Document introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(d.client_id, array['gerant', 'admin', 'valideur'], d.entite_id);
  if not exists (select 1 from public.pieces p where p.id = d.piece_id and p.type_piece = 'releve_heures') then
    raise exception 'Ce document n''est pas un relevé d''heures.' using errcode = '55000';
  end if;
  v_id := private.filed_lire_releve_heures(p_document);
  update public.filed_releves_heures r set
    fournisseur_id = case when v ? 'fournisseur' then nullif(v ->> 'fournisseur', '')::uuid else r.fournisseur_id end,
    reference = case when v ? 'reference' then left(nullif(btrim(v ->> 'reference'), ''), 100) else r.reference end,
    periode_debut = case when v ? 'periode_debut' then (v ->> 'periode_debut')::date else r.periode_debut end,
    periode_fin = case when v ? 'periode_fin' then (v ->> 'periode_fin')::date else r.periode_fin end,
    heures = case when v ? 'heures' then (v ->> 'heures')::numeric else r.heures end,
    signe = case when v ? 'signe' then (v ->> 'signe')::boolean else r.signe end,
    source = 'humain', maj_le = now()
  where r.id = v_id
  returning * into r;
  if r.fournisseur_id is not null and not exists (select 1 from public.filed_fournisseurs f where f.id = r.fournisseur_id and f.client_id = d.client_id) then
    raise exception 'Le fournisseur n''est pas à cette organisation.' using errcode = '22023';
  end if;
  perform private.filed_historiser(d.client_id, d.id, 'filed_document', d.id::text, 'releve_heures', 'Relevé d''heures corrigé par une personne.',
    jsonb_build_object('releve', v_id, 'champs', (select jsonb_agg(k) from jsonb_object_keys(v) k)));
  if r.facture_id is not null then
    perform private.filed_controler_facture(r.facture_id);
  else
    perform private.filed_releve_heures_arrive(v_id);
  end if;
  return v_id;
end $$;
revoke all on function private.filed_poser_releve_heures(uuid, jsonb) from public, anon;
grant execute on function private.filed_poser_releve_heures(uuid, jsonb) to authenticated, service_role;
create or replace function public.filed_poser_releve_heures(p_document uuid, p_valeurs jsonb)
returns uuid language sql set search_path to '' as $$ select private.filed_poser_releve_heures(p_document, p_valeurs) $$;
comment on function public.filed_poser_releve_heures(uuid, jsonb) is
  'Lot 55 (a4_63) : corrige la fiche d''un relevé d''heures (fournisseur, reference, periode_debut, periode_fin, heures, signe). Gérant, admin, valideur.';
revoke all on function public.filed_poser_releve_heures(uuid, jsonb) from public, anon;
grant execute on function public.filed_poser_releve_heures(uuid, jsonb) to authenticated, service_role;

create or replace function private.filed_ecarter_releve_heures(p_releve uuid, p_motif text)
returns void language plpgsql security definer set search_path to '' as $$
declare r public.filed_releves_heures;
begin
  select * into r from public.filed_releves_heures where id = p_releve for update;
  if not found then raise exception 'Relevé introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(r.client_id, array['gerant', 'admin', 'valideur'], r.entite_id);
  if nullif(btrim(coalesce(p_motif, '')), '') is null then raise exception 'Un motif est demandé.' using errcode = '22023'; end if;
  update public.filed_releves_heures set lien = 'ecarte', facture_id = null, maj_le = now() where id = p_releve;
  perform private.filed_historiser(r.client_id, r.document_id, 'filed_document', r.document_id::text, 'releve_heures',
    left('Relevé d''heures écarté du rapprochement : ' || btrim(p_motif), 500), jsonb_build_object('releve', r.id, 'facture', r.facture_id));
  if r.facture_id is not null then
    perform private.filed_controler_facture(r.facture_id);
  end if;
end $$;
revoke all on function private.filed_ecarter_releve_heures(uuid, text) from public, anon;
grant execute on function private.filed_ecarter_releve_heures(uuid, text) to authenticated, service_role;
create or replace function public.filed_ecarter_releve_heures(p_releve uuid, p_motif text)
returns void language sql set search_path to '' as $$ select private.filed_ecarter_releve_heures(p_releve, p_motif) $$;
comment on function public.filed_ecarter_releve_heures(uuid, text) is
  'Lot 55 (a4_63) : écarte un relevé d''heures mal rattaché (motif demandé) ; la facture est recontrôlée. Gérant, admin, valideur.';
revoke all on function public.filed_ecarter_releve_heures(uuid, text) from public, anon;
grant execute on function public.filed_ecarter_releve_heures(uuid, text) to authenticated, service_role;

-- ─── Branchement dans filed_controler_facture, après le rapprochement commande / réception ───
do $$
declare
  v_def text;
  v_repere constant text := E'  perform private.filed_rapprocher_facture(v_f.id);\n';
  v_n int;
begin
  v_def := pg_get_functiondef('private.filed_controler_facture(uuid)'::regprocedure);
  if position('filed_rapprocher_heures' in v_def) > 0 then
    return;
  end if;
  v_n := (length(v_def) - length(replace(v_def, v_repere, ''))) / length(v_repere);
  if v_n <> 1 then
    raise exception 'a4_63 : repère de filed_controler_facture trouvé % fois (1 attendu)', v_n;
  end if;
  execute replace(v_def, v_repere,
    v_repere || E'  perform private.filed_rapprocher_heures(v_f.id);   -- a4_63 : relevés d''heures signés ↔ facture d''intérim\n');
end $$;


-- ═══ omega/migrations/a4_66_filed_lot58_rapprochement_devis.sql @ ca5e4aa0
-- a4_66 (FILED lot 58) : le rapprochement devis ↔ facture, proposé par FILED, confirmé par une personne.
--
-- Décision du bureau, par délégation de Teo (19/10/2026, 16 h 14 Z), point 4 : rapprochement.devis, proposé et
-- confirmé par une personne, jamais seul. Constat du banc (a4_62) : un devis et une facture du même fournisseur forment
-- un dossier, mais FILED disait « Sans commande : rien à rapprocher ».
--
--   · Le devis : nature « devis » (déjà au socle). Sa fiche, public.filed_devis, est lue des valeurs du lecteur
--     (numero, date, montant_ht, montant_ttc, lignes, fournisseur.siren, fournisseur.nom).
--   · Au contrôle d'une facture, les devis du même fournisseur, datés au plus tard du jour de la facture et de moins
--     de 12 mois, pas encore soldés par des factures confirmées, sont PROPOSÉS (public.filed_devis_rapprochements,
--     au plus trois, les plus proches d'abord), avec l'écart de montant et les articles en commun.
--   · Le contrôle « rapprochement.devis » n'est jamais « ok » sans une personne, ni jamais bloquant :
--       proposé, concordant (articles en commun et montant à la tolérance près)  → info, « à confirmer » ;
--       proposé, discordant (aucun article commun, ou montant au-delà)           → attention, « à vérifier » ;
--       confirmé par une personne                                                → ok ; attention si la facture
--                                                                                  dépasse le devis ; le reste à
--                                                                                  facturer est dit.
--   · Une personne confirme (public.filed_confirmer_devis) ou écarte (public.filed_ecarter_devis, motif) ; confirmer
--     un devis écarte les autres propositions de la même facture. Un devis écarté ne revient pas pour cette facture.
--
-- Branchement dans private.filed_controler_facture par repère, après le rapprochement des heures (a4_63) ou, à défaut,
-- après filed_rapprocher_facture. Rejouable ; aucune suppression.

create table if not exists public.filed_devis (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  document_id uuid not null unique references public.filed_documents(id) on delete cascade,
  fournisseur_id uuid references public.filed_fournisseurs(id),
  emetteur text check (char_length(emetteur) <= 200),
  numero text check (char_length(numero) <= 100),
  date_devis date,
  montant_ht numeric(14,2),
  montant_ttc numeric(14,2),
  lignes jsonb not null default '[]' check (jsonb_typeof(lignes) = 'array'),
  source text not null default 'lecture' check (source in ('lecture', 'humain')),
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now()
);
create index if not exists filed_devis_fournisseur_idx on public.filed_devis (client_id, fournisseur_id, date_devis);

create table if not exists public.filed_devis_rapprochements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  facture_id uuid not null references public.filed_factures(id) on delete cascade,
  devis_id uuid not null references public.filed_devis(id) on delete cascade,
  statut text not null default 'propose' check (statut in ('propose', 'confirme', 'ecarte')),
  ecart numeric(14,2),
  articles_communs integer,
  concordant boolean,
  propose_le timestamptz not null default now(),
  decide_par uuid,
  decide_le timestamptz,
  motif text check (char_length(motif) <= 500),
  unique (facture_id, devis_id)
);
create unique index if not exists filed_devis_rapprochements_un_confirme on public.filed_devis_rapprochements (facture_id) where statut = 'confirme';

do $$
declare t text;
begin
  foreach t in array array['filed_devis', 'filed_devis_rapprochements'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || '_lecture') then
      execute format('create policy %I on public.%I for select to authenticated using (client_id in (select private.mes_clients()))', t || '_lecture', t);
    end if;
  end loop;
end $$;
insert into private.tables_locataires (nom, ordre_effacement, note)
select x.nom, x.ordre, 'FILED, lot 58' from (values ('filed_devis_rapprochements', 6), ('filed_devis', 7)) x(nom, ordre)
where not exists (select 1 from private.tables_locataires t where t.nom = x.nom);

-- ─── Les mots significatifs d'une désignation (4 lettres et plus) ─────────────
create or replace function private.filed_mots(p text)
returns text[] language sql immutable set search_path to '' as $$
  select coalesce(array_agg(distinct m), '{}') from regexp_split_to_table(coalesce(private.filed_normaliser_nom(p), ''), ' ') m
   where char_length(m) >= 4 and m !~ '^[0-9]+$'
     and m not in ('pour', 'avec', 'dans', 'sans', 'ligne', 'lignes', 'paire', 'paires', 'piece', 'pieces', 'unite', 'unites', 'lot', 'forfait')
$$;
revoke all on function private.filed_mots(text) from public, anon, authenticated;
grant execute on function private.filed_mots(text) to service_role;

-- ─── Lire la fiche d'un devis ─────────────────────────────────────────────
create or replace function private.filed_lire_devis(p_document uuid)
returns uuid language plpgsql security definer set search_path to '' as $$
declare d public.filed_documents; x public.filed_devis; v jsonb; v_id uuid; v_four uuid; v_nom text; v_siren text; v_lignes jsonb;
begin
  select * into d from public.filed_documents where id = p_document;
  if not found or d.nature is distinct from 'devis' then return null; end if;
  select * into x from public.filed_devis where document_id = p_document;
  if x.id is not null and x.source = 'humain' then return x.id; end if;
  v := coalesce(private.filed_valeurs(d.piece_id), '{}'::jsonb);
  v_nom := left(nullif(btrim(coalesce(v -> 'fournisseur.nom' ->> 'valeur', '')), ''), 200);
  v_siren := nullif(regexp_replace(coalesce(v -> 'fournisseur.siren' ->> 'valeur', ''), '\D', '', 'g'), '');
  if v_siren is not null then
    select f.id into v_four from public.filed_fournisseurs f where f.client_id = d.client_id and f.siren = left(v_siren, 9) limit 1;
  end if;
  if v_four is null and v_nom is not null then
    select f.id into v_four from public.filed_fournisseurs f
     where f.client_id = d.client_id
       and (f.nom_normalise = private.filed_normaliser_nom(v_nom) or private.filed_normaliser_nom(f.nom) = private.filed_normaliser_nom(v_nom))
     order by f.statut = 'actif' desc limit 1;
  end if;
  v_lignes := case when jsonb_typeof(v -> 'lignes' -> 'valeur') = 'array' then v -> 'lignes' -> 'valeur' else '[]'::jsonb end;
  insert into public.filed_devis (client_id, entite_id, document_id, fournisseur_id, emetteur, numero, date_devis, montant_ht, montant_ttc, lignes, source)
  values (d.client_id, d.entite_id, d.id, v_four, v_nom, left(nullif(btrim(coalesce(v -> 'numero' ->> 'valeur', '')), ''), 100),
          private.filed_date_lue(v -> 'date' ->> 'valeur'), private.filed_montant_lu(v -> 'montant_ht' ->> 'valeur'),
          private.filed_montant_lu(v -> 'montant_ttc' ->> 'valeur'), v_lignes, 'lecture')
  on conflict (document_id) do update
    set fournisseur_id = excluded.fournisseur_id, emetteur = excluded.emetteur, numero = excluded.numero, date_devis = excluded.date_devis,
        montant_ht = excluded.montant_ht, montant_ttc = excluded.montant_ttc, lignes = excluded.lignes, maj_le = now()
  returning id into v_id;
  return v_id;
end $$;
revoke all on function private.filed_lire_devis(uuid) from public, anon, authenticated;
grant execute on function private.filed_lire_devis(uuid) to service_role;

create or replace function private.filed_document_devis()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.nature = 'devis' and (tg_op = 'INSERT' or old.nature is distinct from new.nature or old.etat is distinct from new.etat) then
    begin
      perform private.filed_lire_devis(new.id);
    exception when others then
      raise warning 'FILED : devis non lu pour le document % (%)', new.id, sqlerrm;
    end;
  end if;
  return null;
end $$;
revoke all on function private.filed_document_devis() from public, anon, authenticated;
grant execute on function private.filed_document_devis() to service_role;
do $$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.filed_documents'::regclass and tgname = 'filed_documents_devis') then
    create trigger filed_documents_devis after insert or update of nature, etat on public.filed_documents
      for each row execute function private.filed_document_devis();
  end if;
end $$;

-- ─── Le contrôle rapprochement.devis ─────────────────────────────────────
create or replace function private.filed_rapprocher_devis(p_facture uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare
  v_f public.filed_factures;
  v_tol numeric;
  v_mots_facture text[];
  r record;
  c record;
  v_conf record;
  v_n integer := 0;
  v_txt text;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if v_f.id is null or v_f.nature <> 'facture' or v_f.fournisseur_id is null then return; end if;
  v_tol := coalesce((private.filed_reglage(v_f.client_id, v_f.entite_id)).tolerance_totaux, 0.05);

  -- Les fiches des devis récents du client : lues si elles manquent ou si le lecteur a écrit depuis.
  for r in select d.id from public.filed_documents d
            where d.client_id = v_f.client_id and d.nature = 'devis' and d.recu_le > now() - interval '13 months'
              and not exists (select 1 from public.filed_devis x where x.document_id = d.id and (x.source = 'humain' or x.montant_ttc is not null or x.montant_ht is not null)) loop
    perform private.filed_lire_devis(r.id);
  end loop;

  -- Un devis confirmé par une personne : le contrôle le dit.
  select x.*, k.id as lien into v_conf from public.filed_devis_rapprochements k join public.filed_devis x on x.id = k.devis_id
   where k.facture_id = v_f.id and k.statut = 'confirme';
  if v_conf.lien is not null then
    v_txt := format('Rapprochée du devis %s%s, confirmé par une personne', coalesce(v_conf.numero, 'sans numéro'),
                    coalesce(' du ' || to_char(v_conf.date_devis, 'DD/MM/YYYY'), ''));
    perform private.filed_poser_resultat(v_f, 'rapprochement.devis', 'attention',
      v_conf.montant_ttc is not null and v_f.montant_ttc > v_conf.montant_ttc + v_tol,
      case when v_conf.montant_ttc is null then v_txt || '.'
           when v_f.montant_ttc > v_conf.montant_ttc + v_tol
             then format('%s : la facture (%s) dépasse le devis (%s).', v_txt, private.filed_montant_texte(v_f.montant_ttc), private.filed_montant_texte(v_conf.montant_ttc))
           when v_f.montant_ttc < v_conf.montant_ttc - v_tol
             then format('%s : reste à facturer %s sur le devis.', v_txt,
                         private.filed_montant_texte(v_conf.montant_ttc - coalesce((select sum(ff.montant_ttc) from public.filed_devis_rapprochements kk
                                                                                     join public.filed_factures ff on ff.id = kk.facture_id
                                                                                    where kk.devis_id = v_conf.id and kk.statut = 'confirme'), 0)))
           else v_txt || ', même montant.' end,
      null, jsonb_build_object('devis', v_conf.id, 'document', v_conf.document_id, 'montant_devis', v_conf.montant_ttc));
    return;
  end if;

  -- Sinon : les propositions (au plus trois), jamais un rapprochement d'office.
  select coalesce(array_agg(distinct m), '{}') into v_mots_facture
  from public.filed_factures_lignes l, unnest(private.filed_mots(l.designation)) m where l.facture_id = v_f.id;

  for c in
    select x.*, x.montant_ttc - v_f.montant_ttc as ecart,
           (select count(*) from jsonb_array_elements(x.lignes) e
             where private.filed_mots(coalesce(e ->> 'designation', e ->> 'libelle')) && v_mots_facture)::int as communs
    from public.filed_devis x
    where x.client_id = v_f.client_id and x.fournisseur_id = v_f.fournisseur_id
      and (x.date_devis is null or v_f.date_emission is null or x.date_devis between v_f.date_emission - 365 and v_f.date_emission)
      and not exists (select 1 from public.filed_devis_rapprochements k where k.devis_id = x.id and k.facture_id = v_f.id and k.statut = 'ecarte')
      -- pas déjà soldé par des factures confirmées
      and (x.montant_ttc is null or coalesce((select sum(ff.montant_ttc) from public.filed_devis_rapprochements kk join public.filed_factures ff on ff.id = kk.facture_id
                                               where kk.devis_id = x.id and kk.statut = 'confirme'), 0) < x.montant_ttc - v_tol)
    order by abs(coalesce(x.montant_ttc - v_f.montant_ttc, 1e9)), x.date_devis desc nulls last
    limit 3
  loop
    v_n := v_n + 1;
    insert into public.filed_devis_rapprochements (client_id, facture_id, devis_id, ecart, articles_communs, concordant)
    values (v_f.client_id, v_f.id, c.id, c.ecart, c.communs,
            c.montant_ttc is not null and abs(c.ecart) <= v_tol and (c.communs > 0 or jsonb_array_length(c.lignes) = 0 or cardinality(v_mots_facture) = 0))
    on conflict (facture_id, devis_id) do update
      set ecart = excluded.ecart, articles_communs = excluded.articles_communs, concordant = excluded.concordant
      where public.filed_devis_rapprochements.statut = 'propose';
  end loop;
  if v_n = 0 then return; end if;

  select x.numero, x.date_devis, x.montant_ttc, k.articles_communs, k.concordant, k.devis_id, x.document_id into c
  from public.filed_devis_rapprochements k join public.filed_devis x on x.id = k.devis_id
  where k.facture_id = v_f.id and k.statut = 'propose'
  order by k.concordant desc, abs(coalesce(k.ecart, 1e9)) limit 1;
  perform private.filed_poser_resultat(v_f, 'rapprochement.devis', case when c.concordant then 'info' else 'attention' end, true,
    left(format('Devis %s%s (%s) du même fournisseur proposé : %s%s. À confirmer ou écarter par une personne.',
                coalesce(c.numero, 'sans numéro'), coalesce(' du ' || to_char(c.date_devis, 'DD/MM/YYYY'), ''),
                coalesce(private.filed_montant_texte(c.montant_ttc), 'montant non lu'),
                case when c.articles_communs > 0 then c.articles_communs || ' article(s) en commun' else 'aucun article en commun' end,
                case when c.montant_ttc is null then ''
                     when abs(c.montant_ttc - v_f.montant_ttc) <= v_tol then ', même montant'
                     else ', écart de ' || private.filed_montant_texte(c.montant_ttc - v_f.montant_ttc) end), 500),
    null, jsonb_build_object('devis', c.devis_id, 'document', c.document_id, 'propositions', v_n, 'concordant', c.concordant));
end $$;
revoke all on function private.filed_rapprocher_devis(uuid) from public, anon, authenticated;
grant execute on function private.filed_rapprocher_devis(uuid) to service_role;

-- ─── Une personne confirme ou écarte ─────────────────────────────────────
create or replace function private.filed_decider_devis(p_rapprochement uuid, p_decision text, p_motif text)
returns void language plpgsql security definer set search_path to '' as $$
declare k public.filed_devis_rapprochements; v_par uuid; v_f public.filed_factures;
begin
  select * into k from public.filed_devis_rapprochements where id = p_rapprochement for update;
  if not found then raise exception 'Rapprochement introuvable.' using errcode = 'P0002'; end if;
  select * into v_f from public.filed_factures where id = k.facture_id;
  v_par := private.filed_exiger_acteur(k.client_id, array['gerant', 'admin', 'valideur'], v_f.entite_id);
  if p_decision = 'confirme' then
    update public.filed_devis_rapprochements set statut = 'ecarte', decide_par = v_par, decide_le = now(), motif = 'Un autre devis est confirmé.'
     where facture_id = k.facture_id and id <> k.id and statut <> 'ecarte';
    update public.filed_devis_rapprochements set statut = 'confirme', decide_par = v_par, decide_le = now(), motif = left(nullif(btrim(p_motif), ''), 500)
     where id = k.id;
  elsif p_decision = 'ecarte' then
    if nullif(btrim(coalesce(p_motif, '')), '') is null then raise exception 'Un motif est demandé.' using errcode = '22023'; end if;
    update public.filed_devis_rapprochements set statut = 'ecarte', decide_par = v_par, decide_le = now(), motif = left(btrim(p_motif), 500)
     where id = k.id;
  else
    raise exception 'Décision inconnue : confirme ou ecarte.' using errcode = '22023';
  end if;
  perform private.filed_historiser(k.client_id, v_f.document_id, 'filed_document', v_f.document_id::text, 'rapprochement_devis',
    case p_decision when 'confirme' then 'Devis rapproché de la facture par une personne.'
                    else left('Devis écarté du rapprochement : ' || btrim(p_motif), 500) end,
    jsonb_build_object('rapprochement', k.id, 'devis', k.devis_id, 'decision', p_decision));
  perform private.filed_controler_facture(k.facture_id);
end $$;
revoke all on function private.filed_decider_devis(uuid, text, text) from public, anon;
grant execute on function private.filed_decider_devis(uuid, text, text) to authenticated, service_role;

create or replace function public.filed_confirmer_devis(p_rapprochement uuid)
returns void language sql set search_path to '' as $$ select private.filed_decider_devis(p_rapprochement, 'confirme', null) $$;
comment on function public.filed_confirmer_devis(uuid) is
  'Lot 58 (a4_66) : confirme le devis proposé pour une facture (les autres propositions sont écartées) ; la facture est recontrôlée. Gérant, admin, valideur.';
revoke all on function public.filed_confirmer_devis(uuid) from public, anon;
grant execute on function public.filed_confirmer_devis(uuid) to authenticated, service_role;

create or replace function public.filed_ecarter_devis(p_rapprochement uuid, p_motif text)
returns void language sql set search_path to '' as $$ select private.filed_decider_devis(p_rapprochement, 'ecarte', p_motif) $$;
comment on function public.filed_ecarter_devis(uuid, text) is
  'Lot 58 (a4_66) : écarte un devis proposé pour une facture (motif demandé) ; il ne revient pas pour elle. Gérant, admin, valideur.';
revoke all on function public.filed_ecarter_devis(uuid, text) from public, anon;
grant execute on function public.filed_ecarter_devis(uuid, text) to authenticated, service_role;

-- ─── Branchement dans filed_controler_facture ─────────────────────────────
do $$
declare
  v_def text;
  v_repere text := E'  perform private.filed_rapprocher_heures(v_f.id);';
  v_n int;
  v_pos int;
  v_fin int;
begin
  v_def := pg_get_functiondef('private.filed_controler_facture(uuid)'::regprocedure);
  if position('filed_rapprocher_devis' in v_def) > 0 then
    return;
  end if;
  if position(v_repere in v_def) = 0 then
    v_repere := E'  perform private.filed_rapprocher_facture(v_f.id);';   -- a4_63 pas encore posé
  end if;
  v_n := (length(v_def) - length(replace(v_def, v_repere, ''))) / length(v_repere);
  if v_n <> 1 then
    raise exception 'a4_66 : repère de filed_controler_facture trouvé % fois (1 attendu)', v_n;
  end if;
  -- La nouvelle ligne se place après toute la ligne du repère (son commentaire compris).
  v_pos := position(v_repere in v_def);
  v_fin := v_pos + position(E'\n' in substr(v_def, v_pos)) - 1;
  execute left(v_def, v_fin)
       || E'  perform private.filed_rapprocher_devis(v_f.id);   -- a4_66 : devis du même fournisseur, proposé à une personne\n'
       || substr(v_def, v_fin + 1);
end $$;


-- ═══ omega/migrations/a4_51_filed_lot43_plusieurs_boites.sql @ ca5e4aa0
-- FILED, lot 43 (a4_51) — plusieurs boîtes de réception par organisation, et la limite du palier (Teo, 18/10 ;
-- chiffrage n° 23 : « une boîte mail connectée » / « deux boîtes » / « boîtes mail illimitées »).
--
-- Les boîtes sont celles du socle (public.expediteurs, canal email, module filed ; A2 les crée). Le socle n'admet qu'un
-- expéditeur ACTIF par organisation, canal et module (expediteurs_un_actif_idx) : c'est l'identité d'envoi. Une boîte
-- qui ne fait que recevoir reste donc non active (« a_verifier ») ; public.resoudre_boite la trouve quel que soit son
-- statut. FILED n'exige aucun statut à la déclaration et tient la liste :
--   · public.filed_boites : chaque boîte FILED déclarée, la société où ses factures sont rangées, un libellé ;
--   · la limite du palier (filed_paliers.boites, a4_50) s'applique à la déclaration ; sans abonnement, pas de limite ;
--   · le rattachement d'un courriel (private.filed_rattacher_reception, a4_20) range les pièces dans la société de la
--     boîte qui l'a reçu (une société donnée par la réception elle-même passe avant ; sinon la société principale) ;
--   · une boîte non déclarée continue de recevoir comme avant : aucune facture n'est perdue, l'état le signale.
-- Portes : filed_declarer_boite, filed_retirer_boite (gérant, admin) ; filed_boites_etat (gérant, admin, valideur).
-- Branchement par repère. Migration idempotente ; aucun DROP, aucune suppression ; aucun envoi.

create table if not exists public.filed_boites (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  expediteur_id uuid not null unique references public.expediteurs(id) on delete cascade,
  entite_id     uuid references public.entites(id) on delete set null,
  libelle       text check (libelle is null or char_length(libelle) <= 120),
  actif         boolean not null default true,
  declaree_par  uuid,
  cree_le       timestamptz not null default now(),
  maj_le        timestamptz not null default now()
);
comment on table public.filed_boites is
  'Lot 43 (a4_51) : les boîtes de réception FILED de l''organisation (expéditeurs du socle, canal email) et la société où leurs factures sont rangées.';
alter table public.filed_boites enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_boites' and policyname = 'filed_boites_lecture') then
    create policy filed_boites_lecture on public.filed_boites for select to authenticated using (client_id in (select private.mes_clients()));
  end if;
end $$;
revoke all on table public.filed_boites from anon, authenticated;
grant select on public.filed_boites to authenticated;
grant all on public.filed_boites to service_role;
create or replace trigger filed_boites_maj_le before update on public.filed_boites for each row execute function private.filed_lot4_maj_le();
insert into private.tables_locataires (nom, ordre_effacement, note)
select 'filed_boites', 36, 'FILED, lot 43' where not exists (select 1 from private.tables_locataires where nom = 'filed_boites');

-- La société d'une boîte déclarée, par son adresse (comme le socle résout une boîte).
create or replace function private.filed_entite_de_boite(p_client uuid, p_boite text)
returns uuid language sql stable security definer set search_path to '' as $$
  select b.entite_id from public.filed_boites b join public.expediteurs e on e.id = b.expediteur_id
   where b.client_id = p_client and b.actif and lower(e.identite) = lower(p_boite) limit 1
$$;
revoke all on function private.filed_entite_de_boite(uuid, text) from public, anon, authenticated;
grant execute on function private.filed_entite_de_boite(uuid, text) to service_role;

create or replace function private.filed_declarer_boite(p_client uuid, p_expediteur uuid, p_entite uuid default null, p_libelle text default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_par uuid; v_e public.expediteurs; v_p public.filed_paliers; v_n integer; v_id uuid;
begin
  v_par := private.filed_exiger_acteur(p_client, array['gerant', 'admin']);
  select * into v_e from public.expediteurs e where e.id = p_expediteur and e.client_id = p_client;
  if not found or v_e.canal <> 'email' or v_e.module is distinct from 'filed' then
    raise exception 'Cette boîte n''est pas une boîte de réception FILED de l''organisation.' using errcode = '22023';
  end if;
  if p_entite is not null and not exists (select 1 from public.entites x where x.id = p_entite and x.client_id = p_client) then
    raise exception 'La société n''est pas à cette organisation.' using errcode = '22023';
  end if;
  v_p := private.filed_palier_du(p_client, current_date);
  select count(*) into v_n from public.filed_boites b where b.client_id = p_client and b.actif and b.expediteur_id <> p_expediteur;
  if v_p.boites is not null and v_n >= v_p.boites then
    raise exception 'Le palier % permet % boîte(s) ; retirez-en une ou changez de palier.', v_p.libelle, v_p.boites using errcode = '55000';
  end if;
  insert into public.filed_boites (client_id, expediteur_id, entite_id, libelle, declaree_par)
  values (p_client, p_expediteur, p_entite, left(nullif(btrim(p_libelle), ''), 120), v_par)
  on conflict (expediteur_id) do update set entite_id = excluded.entite_id, libelle = excluded.libelle, actif = true, declaree_par = excluded.declaree_par
  returning id into v_id;
  perform private.filed_journaliser(p_client, 'filed.boite.declaree', 'filed_boite', v_id::text,
    jsonb_build_object('adresse', v_e.identite, 'entite', p_entite));
  return v_id;
end $$;
revoke all on function private.filed_declarer_boite(uuid, uuid, uuid, text) from public, anon;
grant execute on function private.filed_declarer_boite(uuid, uuid, uuid, text) to authenticated, service_role;
create or replace function public.filed_declarer_boite(p_client uuid, p_expediteur uuid, p_entite uuid default null, p_libelle text default null)
returns uuid language sql set search_path to '' as $$ select private.filed_declarer_boite(p_client, p_expediteur, p_entite, p_libelle) $$;
comment on function public.filed_declarer_boite(uuid, uuid, uuid, text) is
  'Lot 43 (a4_51) : déclare une boîte de réception FILED (expéditeur du socle) et la société où ranger ses factures, dans la limite du palier. Gérant ou admin.';
revoke all on function public.filed_declarer_boite(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.filed_declarer_boite(uuid, uuid, uuid, text) to authenticated, service_role;

create or replace function private.filed_retirer_boite(p_boite uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare v_b public.filed_boites;
begin
  select * into v_b from public.filed_boites where id = p_boite for update;
  if not found then raise exception 'Boîte introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(v_b.client_id, array['gerant', 'admin']);
  update public.filed_boites set actif = false where id = p_boite;
  perform private.filed_journaliser(v_b.client_id, 'filed.boite.retiree', 'filed_boite', v_b.id::text, jsonb_build_object('expediteur', v_b.expediteur_id));
end $$;
revoke all on function private.filed_retirer_boite(uuid) from public, anon;
grant execute on function private.filed_retirer_boite(uuid) to authenticated, service_role;
create or replace function public.filed_retirer_boite(p_boite uuid)
returns void language sql set search_path to '' as $$ select private.filed_retirer_boite(p_boite) $$;
comment on function public.filed_retirer_boite(uuid) is
  'Lot 43 (a4_51) : retire une boîte de la liste FILED (elle compte de nouveau hors limite ; ses courriels sont rangés dans la société principale). Gérant ou admin.';
revoke all on function public.filed_retirer_boite(uuid) from public, anon;
grant execute on function public.filed_retirer_boite(uuid) to authenticated, service_role;

create or replace function private.filed_boites_etat(p_client uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare v_p public.filed_paliers; v_n integer; v_liste jsonb;
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur']);
  v_p := private.filed_palier_du(p_client, current_date);
  select count(*) into v_n from public.filed_boites b where b.client_id = p_client and b.actif;
  select coalesce(jsonb_agg(jsonb_build_object('expediteur', e.id, 'adresse', e.identite, 'statut', e.statut,
           'declaree', coalesce(b.actif, false), 'boite', b.id, 'societe', b.entite_id,
           'societe_nom', (select x.nom from public.entites x where x.id = b.entite_id), 'libelle', b.libelle) order by e.cree_le), '[]'::jsonb)
    into v_liste
    from public.expediteurs e left join public.filed_boites b on b.expediteur_id = e.id
   where e.client_id = p_client and e.module = 'filed' and e.canal = 'email';
  return jsonb_build_object('palier', v_p.code, 'limite', v_p.boites, 'declarees', v_n,
    'non_declarees', (select count(*) from jsonb_array_elements(v_liste) x where not (x ->> 'declaree')::boolean),
    'boites', v_liste);
end $$;
revoke all on function private.filed_boites_etat(uuid) from public, anon;
grant execute on function private.filed_boites_etat(uuid) to authenticated, service_role;
create or replace function public.filed_boites_etat(p_client uuid)
returns jsonb language sql stable set search_path to '' as $$ select private.filed_boites_etat(p_client) $$;
comment on function public.filed_boites_etat(uuid) is
  'Lot 43 (a4_51) : les boîtes FILED de l''organisation (déclarées ou non, statut, société), la limite du palier. Gérant, admin, valideur.';
revoke all on function public.filed_boites_etat(uuid) from public, anon;
grant execute on function public.filed_boites_etat(uuid) to authenticated, service_role;

-- Le rattachement d'un courriel range ses pièces dans la société de la boîte (texte d'a4_20, par repère).
do $do$
declare
  v_def text;
  v_ancien text := $o$(case when r.entite_id is null then x.principale else x.id = r.entite_id end)$o$;
  v_nouveau text := $n$(case when coalesce(r.entite_id, private.filed_entite_de_boite(r.client_id, r.boite)) is null then x.principale   -- a4_51 : la société de la boîte
                else x.id = coalesce(r.entite_id, private.filed_entite_de_boite(r.client_id, r.boite)) end)$n$;
begin
  v_def := pg_get_functiondef('private.filed_rattacher_reception(bigint)'::regprocedure);
  if position('private.filed_entite_de_boite(r.client_id, r.boite)' in v_def) > 0 then
    raise notice 'a4_51 : private.filed_rattacher_reception déjà branchée.';
    return;
  end if;
  if (length(v_def) - length(replace(v_def, v_ancien, ''))) / length(v_ancien) <> 1 then
    raise exception 'a4_51 : le repère attendu n''est pas une fois et une seule dans private.filed_rattacher_reception. Rien n''est posé.';
  end if;
  execute replace(v_def, v_ancien, v_nouveau);
  raise notice 'a4_51 : private.filed_rattacher_reception branchée.';
end $do$;


-- ═══ omega/migrations/a4_52_filed_lot44_vue_cabinet.sql @ ca5e4aa0
-- FILED, lot 44 (a4_52) — l'espace multi-dossiers d'un cabinet : la vue d'ensemble de tous ses dossiers (Teo, 18/10 ;
-- chiffrage n° 33, 34 : « un espace par dossier client », « vue d'ensemble sur tous les dossiers »).
--
-- Un dossier est une organisation du socle ; un cabinet y travaille par les comptes du socle (une personne a un rôle
-- dans chaque organisation qu'elle suit) : les droits restent ceux du socle, FILED n'en crée aucun. FILED donne :
--   · public.filed_vue_ensemble() : une ligne par organisation où la personne a un rôle FILED (gérant, admin,
--     valideur, collaborateur) et où FILED est installé — pièces du mois et quota (a4_50), bloquées, en attente
--     d'approbation, à compléter, en litige, à payer sous 30 jours, en retard, dernière pièce reçue. Chaque chiffre
--     passe par les portes de pilotage existantes, donc par le périmètre de la personne dans ce dossier ;
--   · public.filed_epingler_dossier(organisation, épinglé, rang) : l'ordre et les favoris de la personne
--     (public.filed_dossiers_preferes, à elle seule).
-- La bascule d'un dossier à l'autre est celle de l'application (choix de l'organisation) : rien à poser ici.
-- Migration idempotente ; aucun DROP, aucune suppression ; aucun envoi.

create table if not exists public.filed_dossiers_preferes (
  user_id    uuid not null,
  client_id  uuid not null references public.clients(id) on delete cascade,
  epingle    boolean not null default true,
  rang       integer not null default 100,
  maj_le     timestamptz not null default now(),
  primary key (user_id, client_id)
);
comment on table public.filed_dossiers_preferes is
  'Lot 44 (a4_52) : les dossiers qu''une personne épingle, et leur ordre, dans la vue d''ensemble FILED. À elle seule.';
alter table public.filed_dossiers_preferes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_dossiers_preferes' and policyname = 'filed_dossiers_preferes_soi') then
    create policy filed_dossiers_preferes_soi on public.filed_dossiers_preferes for select to authenticated using (user_id = (select auth.uid()));
  end if;
end $$;
revoke all on table public.filed_dossiers_preferes from anon, authenticated;
grant select on public.filed_dossiers_preferes to authenticated;
grant all on public.filed_dossiers_preferes to service_role;
insert into private.tables_locataires (nom, ordre_effacement, note)
select 'filed_dossiers_preferes', 37, 'FILED, lot 44' where not exists (select 1 from private.tables_locataires where nom = 'filed_dossiers_preferes');

create or replace function private.filed_vue_ensemble()
returns table (client_id uuid, organisation text, role text, epingle boolean, rang integer,
               pieces_mois integer, quota integer, etat_quota text,
               bloquees bigint, attente bigint, a_completer bigint, litiges bigint,
               a_payer_30j numeric, en_retard bigint, dernier_recu_le timestamptz, erreur text)
language plpgsql stable security definer set search_path to '' as $$
declare v_uid uuid := (select auth.uid()); c record; v_q jsonb; v_e record;
begin
  if v_uid is null then return; end if;   -- une vue de personne : le serveur n'en a pas
  for c in
    select k.client_id, cl.nom, k.role, coalesce(p.epingle, false) as epingle, coalesce(p.rang, 100) as rang
      from public.comptes k join public.clients cl on cl.id = k.client_id
      left join public.filed_dossiers_preferes p on p.user_id = v_uid and p.client_id = k.client_id
     where k.user_id = v_uid and k.role in ('gerant', 'admin', 'valideur', 'collaborateur')
       and exists (select 1 from public.filed_reglages g where g.client_id = k.client_id and g.entite_id is null and g.actif)
     order by coalesce(p.epingle, false) desc, coalesce(p.rang, 100), cl.nom
  loop
    client_id := c.client_id; organisation := c.nom; role := c.role; epingle := c.epingle; rang := c.rang;
    pieces_mois := null; quota := null; etat_quota := null; bloquees := 0; attente := 0; a_completer := 0; litiges := 0;
    a_payer_30j := 0; en_retard := 0; dernier_recu_le := null; erreur := null;
    begin
      if c.role in ('gerant', 'admin', 'valideur') then
        v_q := private.filed_compteur(c.client_id, null);
        pieces_mois := (v_q ->> 'pieces')::integer; quota := (v_q ->> 'quota')::integer; etat_quota := v_q ->> 'etat';
      end if;
      for v_e in select * from private.filed_pieces_en_cours(c.client_id, null) loop
        case v_e.categorie
          when 'bloquees' then bloquees := v_e.nombre;
          when 'attente' then attente := v_e.nombre;
          when 'a_completer' then a_completer := v_e.nombre;
          when 'litige' then litiges := v_e.nombre;
          else null;
        end case;
      end loop;
      select coalesce(sum(x.reste_a_payer) filter (where x.echeance <= current_date + 30), 0), count(*) filter (where x.en_retard)
        into a_payer_30j, en_retard
        from private.filed_echeancier(c.client_id, null, null) x;
      select max(d.recu_le) into dernier_recu_le from public.filed_documents d
       where d.client_id = c.client_id and private.perimetre_couvre(v_uid, d.client_id, d.entite_id);
    exception when others then
      erreur := left(sqlerrm, 200);   -- un dossier illisible n'empêche pas la vue des autres
    end;
    return next;
  end loop;
end $$;
revoke all on function private.filed_vue_ensemble() from public, anon;
grant execute on function private.filed_vue_ensemble() to authenticated, service_role;

create or replace function public.filed_vue_ensemble()
returns table (client_id uuid, organisation text, role text, epingle boolean, rang integer,
               pieces_mois integer, quota integer, etat_quota text,
               bloquees bigint, attente bigint, a_completer bigint, litiges bigint,
               a_payer_30j numeric, en_retard bigint, dernier_recu_le timestamptz, erreur text)
language sql stable set search_path to '' as $$ select * from private.filed_vue_ensemble() $$;
comment on function public.filed_vue_ensemble() is
  'Lot 44 (a4_52) : la vue d''ensemble de tous les dossiers (organisations) où la personne a un rôle FILED : pièces du mois et quota, en cours, à payer, retards. Droits et périmètres du socle.';
revoke all on function public.filed_vue_ensemble() from public, anon;
grant execute on function public.filed_vue_ensemble() to authenticated, service_role;

create or replace function private.filed_epingler_dossier(p_client uuid, p_epingle boolean default true, p_rang integer default null)
returns void language plpgsql security definer set search_path to '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Une personne épingle ses dossiers.' using errcode = '42501'; end if;
  if not exists (select 1 from public.comptes k where k.user_id = v_uid and k.client_id = p_client) then
    raise exception 'Vous ne suivez pas ce dossier.' using errcode = '42501';
  end if;
  insert into public.filed_dossiers_preferes (user_id, client_id, epingle, rang)
  values (v_uid, p_client, coalesce(p_epingle, true), coalesce(p_rang, 100))
  on conflict (user_id, client_id) do update
    set epingle = excluded.epingle, rang = coalesce(p_rang, public.filed_dossiers_preferes.rang), maj_le = now();
end $$;
revoke all on function private.filed_epingler_dossier(uuid, boolean, integer) from public, anon;
grant execute on function private.filed_epingler_dossier(uuid, boolean, integer) to authenticated, service_role;
create or replace function public.filed_epingler_dossier(p_client uuid, p_epingle boolean default true, p_rang integer default null)
returns void language sql set search_path to '' as $$ select private.filed_epingler_dossier(p_client, p_epingle, p_rang) $$;
comment on function public.filed_epingler_dossier(uuid, boolean, integer) is
  'Lot 44 (a4_52) : épingle (ou non) un dossier et fixe son rang dans la vue d''ensemble de la personne.';
revoke all on function public.filed_epingler_dossier(uuid, boolean, integer) from public, anon;
grant execute on function public.filed_epingler_dossier(uuid, boolean, integer) to authenticated, service_role;


-- ═══ omega/migrations/a4_53_filed_lot45_frais_kilometriques.sql @ ca5e4aa0
-- FILED, lot 45 (a4_53) — les notes de frais : les indemnités kilométriques au barème (Teo, 18/10 ; chiffrage n° 13).
--
-- a4_35 fait des notes de frais à justificatif (ticket, facture). Manquait le trajet fait avec son propre véhicule,
-- remboursé au barème fiscal : il n'a pas de facture. Ce lot pose :
--   · public.filed_baremes_km : le barème par année, véhicule (voiture, moto, cyclomoteur), puissance et tranche de
--     distance annuelle (d × coef + fixe), majoré de 20 % pour un véhicule électrique. Source vérifiée le
--     19/10/2026, coefficient par coefficient : BOFiP BOI-BAREME-000001, version du 20/07/2023, barèmes « revenus
--     2022 » (§ 10 automobiles, § 20 cyclomoteurs, § 30 motocyclettes ; § 5 majoration de 20 % des véhicules
--     électriques, CGI ann. IV art. 6 B), https://bofip.impots.gouv.fr/bofip/2185-PGP.html/identifiant=BOI-BAREME-000001-20230720
--     — le dernier barème publié que j'ai pu lire ; il est posé sous l'année 2022. Un trajet prend le barème de son
--     année, sinon le plus récent posé : l'opérateur pose chaque nouveau barème quand il paraît (filed_regler_bareme_km) ;
--   · public.filed_trajets_km : chaque trajet déclaré (date, départ, arrivée, motif, km, véhicule) ; son montant est
--     la part du barème annuel qu'il ajoute : barème(cumul de l'année + km) − barème(cumul de l'année) — le changement
--     de tranche en cours d'année est ainsi juste ;
--   · l'approbation par une autre personne que le bénéficiaire (gérant, admin, valideur), comme a4_35 ;
--   · filed_etat_frais_km : l'état mensuel du bénéficiaire (trajets, barème appliqué, total approuvé), en CSV : c'est
--     le justificatif à déposer comme pièce (puis public.filed_declarer_note_frais, a4_35) pour qu'il soit écrit au
--     compte du personnel et passe au FEC ; filed_rembourser_frais_km marque les trajets remboursés.
-- Migration idempotente ; aucun DROP, aucune suppression ; aucun envoi.

create table if not exists public.filed_baremes_km (
  annee      integer not null check (annee between 2000 and 2100),
  vehicule   text not null check (vehicule in ('voiture', 'moto', 'cyclomoteur')),
  cv_min     integer not null,
  cv_max     integer not null,
  km_min     numeric not null,
  km_max     numeric,                       -- nul : sans limite haute
  coef       numeric(8,4) not null,
  fixe       numeric(10,2) not null default 0,
  source     text not null,
  primary key (annee, vehicule, cv_min, km_min)
);
comment on table public.filed_baremes_km is
  'Lot 45 (a4_53) : le barème kilométrique fiscal (d × coef + fixe), par année, véhicule, puissance et tranche annuelle. Opérateur.';
insert into public.filed_baremes_km (annee, vehicule, cv_min, cv_max, km_min, km_max, coef, fixe, source)
select 2022, v, cmin, cmax, kmin, kmax, coef, fixe, 'BOFiP BOI-BAREME-000001 du 20/07/2023, barème revenus 2022 (§ 10, 20, 30), https://bofip.impots.gouv.fr/bofip/2185-PGP.html/identifiant=BOI-BAREME-000001-20230720 ; vérifié le 19/10/2026'
from (values
  ('voiture', 0, 3, 0, 5000, 0.529, 0), ('voiture', 0, 3, 5000, 20000, 0.316, 1065), ('voiture', 0, 3, 20000, null, 0.370, 0),
  ('voiture', 4, 4, 0, 5000, 0.606, 0), ('voiture', 4, 4, 5000, 20000, 0.340, 1330), ('voiture', 4, 4, 20000, null, 0.407, 0),
  ('voiture', 5, 5, 0, 5000, 0.636, 0), ('voiture', 5, 5, 5000, 20000, 0.357, 1395), ('voiture', 5, 5, 20000, null, 0.427, 0),
  ('voiture', 6, 6, 0, 5000, 0.665, 0), ('voiture', 6, 6, 5000, 20000, 0.374, 1457), ('voiture', 6, 6, 20000, null, 0.447, 0),
  ('voiture', 7, 99, 0, 5000, 0.697, 0), ('voiture', 7, 99, 5000, 20000, 0.394, 1515), ('voiture', 7, 99, 20000, null, 0.470, 0),
  ('moto', 0, 2, 0, 3000, 0.395, 0), ('moto', 0, 2, 3000, 6000, 0.099, 891), ('moto', 0, 2, 6000, null, 0.248, 0),
  ('moto', 3, 5, 0, 3000, 0.468, 0), ('moto', 3, 5, 3000, 6000, 0.082, 1158), ('moto', 3, 5, 6000, null, 0.275, 0),
  ('moto', 6, 99, 0, 3000, 0.606, 0), ('moto', 6, 99, 3000, 6000, 0.079, 1583), ('moto', 6, 99, 6000, null, 0.343, 0),
  ('cyclomoteur', 0, 99, 0, 3000, 0.315, 0), ('cyclomoteur', 0, 99, 3000, 6000, 0.079, 711), ('cyclomoteur', 0, 99, 6000, null, 0.198, 0)
) b(v, cmin, cmax, kmin, kmax, coef, fixe)
on conflict (annee, vehicule, cv_min, km_min) do nothing;

create table if not exists public.filed_trajets_km (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients(id) on delete cascade,
  entite_id        uuid references public.entites(id) on delete cascade,
  beneficiaire     uuid not null,
  beneficiaire_nom text not null check (char_length(btrim(beneficiaire_nom)) between 1 and 120),
  le               date not null,
  depart           text check (depart is null or char_length(depart) <= 200),
  arrivee          text check (arrivee is null or char_length(arrivee) <= 200),
  motif            text not null check (char_length(btrim(motif)) between 1 and 300),
  km               numeric(8,1) not null check (km > 0 and km <= 5000),
  vehicule         text not null check (vehicule in ('voiture', 'moto', 'cyclomoteur')),
  cv               integer not null check (cv between 1 and 99),
  electrique       boolean not null default false,
  bareme_annee     integer not null,
  cumul_avant      numeric(10,1) not null,
  montant          numeric(10,2) not null check (montant >= 0),
  statut           text not null default 'a_valider' check (statut in ('a_valider', 'validee', 'refusee', 'remboursee')),
  declare_par      uuid,
  decide_par       uuid,
  decide_le        timestamptz,
  motif_decision   text,
  rembourse_le     date,
  cree_le          timestamptz not null default now(),
  maj_le           timestamptz not null default now()
);
comment on table public.filed_trajets_km is
  'Lot 45 (a4_53) : les trajets faits avec un véhicule personnel, remboursés au barème kilométrique ; approuvés par une autre personne.';
create index if not exists filed_trajets_km_benef on public.filed_trajets_km (client_id, beneficiaire, le);

do $$
declare t text;
begin
  alter table public.filed_baremes_km enable row level security;
  revoke all on table public.filed_baremes_km from anon, authenticated;
  grant select on public.filed_baremes_km to authenticated;
  grant all on public.filed_baremes_km to service_role;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_baremes_km' and policyname = 'filed_baremes_km_lecture') then
    create policy filed_baremes_km_lecture on public.filed_baremes_km for select to authenticated using (true);
  end if;
  alter table public.filed_trajets_km enable row level security;
  revoke all on table public.filed_trajets_km from anon, authenticated;
  grant select on public.filed_trajets_km to authenticated;
  grant all on public.filed_trajets_km to service_role;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_trajets_km' and policyname = 'filed_trajets_km_lecture') then
    create policy filed_trajets_km_lecture on public.filed_trajets_km for select to authenticated
      using (beneficiaire = (select auth.uid())
             or exists (select 1 from public.comptes c where c.client_id = filed_trajets_km.client_id and c.user_id = (select auth.uid())
                         and c.role in ('gerant', 'admin', 'valideur')));
  end if;
end $$;
create or replace trigger filed_trajets_km_maj_le before update on public.filed_trajets_km for each row execute function private.filed_lot4_maj_le();
insert into private.tables_locataires (nom, ordre_effacement, note)
select 'filed_trajets_km', 38, 'FILED, lot 45' where not exists (select 1 from private.tables_locataires where nom = 'filed_trajets_km');

-- Le barème annuel pour une distance annuelle (avant majoration électrique).
create or replace function private.filed_bareme_km(p_annee integer, p_vehicule text, p_cv integer, p_km numeric)
returns numeric language plpgsql stable security definer set search_path to '' as $$
declare b public.filed_baremes_km;
begin
  if coalesce(p_km, 0) <= 0 then return 0; end if;
  select * into b from public.filed_baremes_km x
   where x.annee = p_annee and x.vehicule = p_vehicule and p_cv between x.cv_min and x.cv_max
     and p_km > x.km_min and (x.km_max is null or p_km <= x.km_max)
   limit 1;
  if not found then
    raise exception 'Pas de barème kilométrique % pour ce véhicule (%, % CV).', p_annee, p_vehicule, p_cv using errcode = '22023';
  end if;
  return round(p_km * b.coef + b.fixe, 2);
end $$;
revoke all on function private.filed_bareme_km(integer, text, integer, numeric) from public, anon, authenticated;
grant execute on function private.filed_bareme_km(integer, text, integer, numeric) to service_role;

create or replace function private.filed_declarer_trajet(p_client uuid, p_entite uuid, p_le date, p_km numeric, p_vehicule text, p_cv integer,
  p_motif text, p_depart text default null, p_arrivee text default null, p_electrique boolean default false, p_beneficiaire uuid default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_uid uuid; v_benef uuid; v_nom text; v_annee integer; v_bareme integer; v_cumul numeric; v_montant numeric; v_id uuid;
begin
  v_uid := private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur', 'collaborateur'], p_entite);
  v_benef := coalesce(p_beneficiaire, v_uid);
  if v_benef is null then raise exception 'Le bénéficiaire du trajet est à nommer.' using errcode = '22023'; end if;
  if v_uid is not null and v_benef <> v_uid then
    perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur'], p_entite);
  end if;
  if not exists (select 1 from public.comptes c where c.client_id = p_client and c.user_id = v_benef) then
    raise exception 'Le bénéficiaire n''est pas membre de l''organisation.' using errcode = '22023';
  end if;
  if p_le is null or p_le > current_date then raise exception 'Un trajet a une date passée ou du jour.' using errcode = '22023'; end if;
  v_annee := extract(year from p_le)::integer;
  -- Le barème de l'année, sinon le plus récent publié (l'opérateur met l'année à jour quand il paraît).
  select max(b.annee) into v_bareme from public.filed_baremes_km b where b.annee <= v_annee and b.vehicule = p_vehicule;
  if v_bareme is null then raise exception 'Aucun barème kilométrique pour %.', p_vehicule using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('filed_trajets_km|' || v_benef::text || '|' || v_annee, 0));
  select coalesce(sum(t.km), 0) into v_cumul from public.filed_trajets_km t
   where t.client_id = p_client and t.beneficiaire = v_benef and t.vehicule = p_vehicule and t.statut <> 'refusee'
     and extract(year from t.le) = v_annee;
  v_montant := private.filed_bareme_km(v_bareme, p_vehicule, p_cv, v_cumul + p_km) - private.filed_bareme_km(v_bareme, p_vehicule, p_cv, v_cumul);
  if coalesce(p_electrique, false) then v_montant := round(v_montant * 1.2, 2); end if;
  select split_part(u.email, '@', 1) into v_nom from auth.users u where u.id = v_benef;   -- comme a4_35
  insert into public.filed_trajets_km (client_id, entite_id, beneficiaire, beneficiaire_nom, le, depart, arrivee, motif, km, vehicule, cv, electrique,
                                       bareme_annee, cumul_avant, montant, declare_par)
  values (p_client, p_entite, v_benef, left(coalesce(v_nom, 'Bénéficiaire'), 120), p_le, left(nullif(btrim(p_depart), ''), 200), left(nullif(btrim(p_arrivee), ''), 200),
          left(btrim(p_motif), 300), p_km, p_vehicule, p_cv, coalesce(p_electrique, false), v_bareme, v_cumul, greatest(v_montant, 0), v_uid)
  returning id into v_id;
  perform private.filed_journaliser(p_client, 'filed.trajet_km.declare', 'filed_trajet_km', v_id::text,
    jsonb_build_object('km', p_km, 'montant', v_montant, 'beneficiaire', v_benef, 'bareme', v_bareme), p_entite);
  return v_id;
end $$;
revoke all on function private.filed_declarer_trajet(uuid, uuid, date, numeric, text, integer, text, text, text, boolean, uuid) from public, anon;
grant execute on function private.filed_declarer_trajet(uuid, uuid, date, numeric, text, integer, text, text, text, boolean, uuid) to authenticated, service_role;
create or replace function public.filed_declarer_trajet(p_client uuid, p_entite uuid, p_le date, p_km numeric, p_vehicule text, p_cv integer,
  p_motif text, p_depart text default null, p_arrivee text default null, p_electrique boolean default false, p_beneficiaire uuid default null)
returns uuid language sql set search_path to '' as $$
  select private.filed_declarer_trajet(p_client, p_entite, p_le, p_km, p_vehicule, p_cv, p_motif, p_depart, p_arrivee, p_electrique, p_beneficiaire) $$;
comment on function public.filed_declarer_trajet(uuid, uuid, date, numeric, text, integer, text, text, text, boolean, uuid) is
  'Lot 45 (a4_53) : déclare un trajet fait avec un véhicule personnel ; le montant suit le barème kilométrique sur le cumul de l''année. Soi-même ; pour un autre : gérant, admin, valideur.';
revoke all on function public.filed_declarer_trajet(uuid, uuid, date, numeric, text, integer, text, text, text, boolean, uuid) from public, anon;
grant execute on function public.filed_declarer_trajet(uuid, uuid, date, numeric, text, integer, text, text, text, boolean, uuid) to authenticated, service_role;

create or replace function private.filed_decider_trajet(p_trajet uuid, p_approuve boolean, p_motif text default null)
returns void language plpgsql security definer set search_path to '' as $$
declare t public.filed_trajets_km; v_uid uuid;
begin
  select * into t from public.filed_trajets_km where id = p_trajet for update;
  if not found then raise exception 'Trajet introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(t.client_id, array['gerant', 'admin', 'valideur'], t.entite_id);
  if v_uid is not null and v_uid = t.beneficiaire then
    raise exception 'Le bénéficiaire n''approuve pas son propre trajet.' using errcode = '42501';
  end if;
  if t.statut <> 'a_valider' then raise exception 'Ce trajet est déjà décidé (%).', t.statut using errcode = '55000'; end if;
  if not coalesce(p_approuve, false) and nullif(btrim(p_motif), '') is null then
    raise exception 'Un refus porte son motif.' using errcode = '22023';
  end if;
  update public.filed_trajets_km set statut = case when p_approuve then 'validee' else 'refusee' end, decide_par = v_uid, decide_le = now(),
         motif_decision = left(nullif(btrim(p_motif), ''), 300)
   where id = p_trajet;
  perform private.filed_journaliser(t.client_id, case when p_approuve then 'filed.trajet_km.approuve' else 'filed.trajet_km.refuse' end,
    'filed_trajet_km', t.id::text, jsonb_build_object('montant', t.montant, 'motif', left(nullif(btrim(p_motif), ''), 300)), t.entite_id);
end $$;
revoke all on function private.filed_decider_trajet(uuid, boolean, text) from public, anon;
grant execute on function private.filed_decider_trajet(uuid, boolean, text) to authenticated, service_role;
create or replace function public.filed_decider_trajet(p_trajet uuid, p_approuve boolean, p_motif text default null)
returns void language sql set search_path to '' as $$ select private.filed_decider_trajet(p_trajet, p_approuve, p_motif) $$;
comment on function public.filed_decider_trajet(uuid, boolean, text) is
  'Lot 45 (a4_53) : approuve ou refuse (avec motif) un trajet kilométrique. Gérant, admin, valideur ; jamais le bénéficiaire.';
revoke all on function public.filed_decider_trajet(uuid, boolean, text) from public, anon;
grant execute on function public.filed_decider_trajet(uuid, boolean, text) to authenticated, service_role;

-- L'état mensuel : le justificatif à déposer, et son total.
create or replace function private.filed_etat_frais_km(p_client uuid, p_beneficiaire uuid, p_mois date)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare v_uid uuid := (select auth.uid()); v_du date := date_trunc('month', p_mois)::date; v_lignes text[]; r record; v_total numeric := 0;
        v_nom text; v_crlf text := chr(13) || chr(10); n integer := 0;
begin
  if v_uid is null or v_uid <> p_beneficiaire then
    perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur']);
  else
    perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur', 'collaborateur']);
  end if;
  v_lignes := array['date;depart;arrivee;motif;km;vehicule;cv;electrique;bareme;cumul_avant;montant;statut'];
  for r in select * from public.filed_trajets_km t
            where t.client_id = p_client and t.beneficiaire = p_beneficiaire and t.le >= v_du and t.le < (v_du + interval '1 month')::date
              and t.statut <> 'refusee'
            order by t.le, t.cree_le loop
    v_nom := r.beneficiaire_nom; n := n + 1;
    v_lignes := v_lignes || concat_ws(';', to_char(r.le, 'DD/MM/YYYY'), private.filed_csv_cellule(r.depart), private.filed_csv_cellule(r.arrivee),
      private.filed_csv_cellule(r.motif), private.filed_csv_cellule(r.km), r.vehicule, r.cv, case when r.electrique then 'oui' else 'non' end,
      r.bareme_annee, private.filed_csv_cellule(r.cumul_avant), private.filed_csv_cellule(r.montant), r.statut);
    if r.statut in ('validee', 'remboursee') then v_total := v_total + r.montant; end if;
  end loop;
  return jsonb_build_object('beneficiaire', p_beneficiaire, 'nom', v_nom, 'mois', v_du, 'trajets', n, 'total_approuve', v_total,
    'nom_fichier', 'frais_km_' || to_char(v_du, 'YYYY-MM') || '_' || private.filed_nom_sur(coalesce(v_nom, 'beneficiaire')) || '.csv',
    'contenu', array_to_string(v_lignes, v_crlf) || v_crlf
      || 'Total approuvé;' || replace(v_total::text, '.', ',') || v_crlf
      || 'Barème kilométrique fiscal (d × coef + fixe, sur le cumul annuel ; +20 % électrique) ; à déposer comme pièce de note de frais.' || v_crlf);
end $$;
revoke all on function private.filed_etat_frais_km(uuid, uuid, date) from public, anon;
grant execute on function private.filed_etat_frais_km(uuid, uuid, date) to authenticated, service_role;
create or replace function public.filed_etat_frais_km(p_client uuid, p_beneficiaire uuid, p_mois date)
returns jsonb language sql stable set search_path to '' as $$ select private.filed_etat_frais_km(p_client, p_beneficiaire, p_mois) $$;
comment on function public.filed_etat_frais_km(uuid, uuid, date) is
  'Lot 45 (a4_53) : l''état mensuel des frais kilométriques d''une personne (CSV et total approuvé), le justificatif à déposer. Soi-même, ou gérant, admin, valideur.';
revoke all on function public.filed_etat_frais_km(uuid, uuid, date) from public, anon;
grant execute on function public.filed_etat_frais_km(uuid, uuid, date) to authenticated, service_role;

create or replace function private.filed_rembourser_frais_km(p_client uuid, p_beneficiaire uuid, p_mois date, p_le date default current_date)
returns integer language plpgsql security definer set search_path to '' as $$
declare v_du date := date_trunc('month', p_mois)::date; n integer;
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur']);
  update public.filed_trajets_km t set statut = 'remboursee', rembourse_le = coalesce(p_le, current_date)
   where t.client_id = p_client and t.beneficiaire = p_beneficiaire and t.statut = 'validee'
     and t.le >= v_du and t.le < (v_du + interval '1 month')::date;
  get diagnostics n = row_count;
  perform private.filed_journaliser(p_client, 'filed.trajet_km.rembourse', 'filed_trajet_km', p_beneficiaire::text,
    jsonb_build_object('mois', v_du, 'trajets', n, 'le', coalesce(p_le, current_date)));
  return n;
end $$;
revoke all on function private.filed_rembourser_frais_km(uuid, uuid, date, date) from public, anon;
grant execute on function private.filed_rembourser_frais_km(uuid, uuid, date, date) to authenticated, service_role;
create or replace function public.filed_rembourser_frais_km(p_client uuid, p_beneficiaire uuid, p_mois date, p_le date default current_date)
returns integer language sql set search_path to '' as $$ select private.filed_rembourser_frais_km(p_client, p_beneficiaire, p_mois, p_le) $$;
comment on function public.filed_rembourser_frais_km(uuid, uuid, date, date) is
  'Lot 45 (a4_53) : marque remboursés les trajets approuvés du mois d''une personne. Gérant, admin, valideur.';
revoke all on function public.filed_rembourser_frais_km(uuid, uuid, date, date) from public, anon;
grant execute on function public.filed_rembourser_frais_km(uuid, uuid, date, date) to authenticated, service_role;

-- L'opérateur met le barème à jour chaque année (une ligne par tranche).
create or replace function public.filed_regler_bareme_km(p_annee integer, p_vehicule text, p_cv_min integer, p_cv_max integer,
  p_km_min numeric, p_km_max numeric, p_coef numeric, p_fixe numeric, p_source text)
returns void language sql security definer set search_path to '' as $$
  insert into public.filed_baremes_km (annee, vehicule, cv_min, cv_max, km_min, km_max, coef, fixe, source)
  values (p_annee, p_vehicule, p_cv_min, p_cv_max, p_km_min, p_km_max, p_coef, coalesce(p_fixe, 0), p_source)
  on conflict (annee, vehicule, cv_min, km_min) do update
    set cv_max = excluded.cv_max, km_max = excluded.km_max, coef = excluded.coef, fixe = excluded.fixe, source = excluded.source
$$;
comment on function public.filed_regler_bareme_km(integer, text, integer, integer, numeric, numeric, numeric, numeric, text) is
  'Lot 45 (a4_53) : pose ou corrige une tranche du barème kilométrique. Opérateur (service_role).';
revoke all on function public.filed_regler_bareme_km(integer, text, integer, integer, numeric, numeric, numeric, numeric, text) from public, anon, authenticated;
grant execute on function public.filed_regler_bareme_km(integer, text, integer, integer, numeric, numeric, numeric, numeric, text) to service_role;


-- ═══ omega/migrations/a4_54_filed_lot46_historique_par_palier.sql @ ca5e4aa0
-- FILED, lot 46 (a4_54) — la durée d'historique consultable par palier (Teo, 18/10, n° 7 du chantier ; chiffrage n° 26).
--
-- Le site promettait « trois mois / douze mois / historique complet ». Décision de Teo du 17/10 : historique complet
-- pour tous. Ce lot en fait un réglage technique, sans rien retirer :
--   · filed_paliers.historique_mois (a4_50) : nul = complet ; c'est la valeur des trois paliers, conformément au 17/10 ;
--     l'opérateur peut la régler (filed_regler_palier) ;
--   · public.filed_fenetre_historique(organisation) : la date à partir de laquelle l'écran montre les pièces de
--     l'organisation, selon son palier (nulle : tout) ;
--   · ce que la fenêtre ne touche JAMAIS : la conservation légale (registre, archives, écritures, FEC : dix ans),
--     le dossier de sortie (toujours complet, a4_33, a4_49), l'échéancier (une facture ancienne non réglée reste due),
--     les contrôles et la piste d'audit. Rien n'est effacé ni masqué en base : c'est une borne d'affichage.
-- Migration idempotente ; aucun DROP, aucune suppression ; aucun envoi.

create or replace function private.filed_fenetre_historique(p_client uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare v_p public.filed_paliers; v_depuis date;
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur', 'collaborateur']);
  v_p := private.filed_palier_du(p_client, current_date);
  if v_p.historique_mois is not null then
    v_depuis := (date_trunc('month', (now() at time zone 'Europe/Paris')) - make_interval(months => v_p.historique_mois - 1))::date;
  end if;
  return jsonb_build_object('palier', v_p.code, 'historique_mois', v_p.historique_mois, 'depuis', v_depuis,
    'complet', v_depuis is null,
    'texte', case when v_depuis is null then 'Historique complet.'
                  else format('Historique des %s derniers mois (depuis le %s) ; tout reste conservé et exportable.', v_p.historique_mois, to_char(v_depuis, 'DD/MM/YYYY')) end);
end $$;
revoke all on function private.filed_fenetre_historique(uuid) from public, anon;
grant execute on function private.filed_fenetre_historique(uuid) to authenticated, service_role;

create or replace function public.filed_fenetre_historique(p_client uuid)
returns jsonb language sql stable set search_path to '' as $$ select private.filed_fenetre_historique(p_client) $$;
comment on function public.filed_fenetre_historique(uuid) is
  'Lot 46 (a4_54) : la borne d''affichage de l''historique selon le palier (nulle : complet, la règle du 17/10). Ne masque ni n''efface rien en base. Membres de l''organisation.';
revoke all on function public.filed_fenetre_historique(uuid) from public, anon;
grant execute on function public.filed_fenetre_historique(uuid) to authenticated, service_role;
