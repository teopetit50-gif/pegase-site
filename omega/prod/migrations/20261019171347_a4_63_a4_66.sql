-- 20261019171347 a4_63_a4_66
-- Source : dépôt : ca5e4aa0 omega/migrations/a4_63_filed_lot55_releves_heures.sql ; ca5e4aa0 omega/migrations/a4_66_filed_lot58_rapprochement_devis.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_63_filed_lot55_releves_heures.sql @ ca5e4aa0, a4_66_filed_lot58_rapprochement_devis.sql @ ca5e4aa0 ; a4_51..54 cités comme tests : ignorés.
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
