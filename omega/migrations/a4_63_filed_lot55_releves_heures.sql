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
