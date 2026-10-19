-- a4_67 (FILED lot 59) : un SIREN ou une TVA lus pour un fournisseur connu à son seul nom : compléter sa fiche est
-- PROPOSÉ, une personne confirme, jamais seul.
--
-- Décision de Teo (19/10/2026, 18 h 30 Z). Le lecteur neuf lit les SIREN ; cas réels : Boulogne Matériaux, LEADER MAT,
-- reconnus à leur nom alors que la pièce porte leur SIREN.
--
--   · public.filed_fournisseurs_completions : les propositions (SIREN ou TVA, la pièce qui les porte, vérifiés ou lus
--     sans vérification), une par fournisseur, champ et valeur ; une personne les confirme ou les écarte.
--   · Le lot 7 (private.filed_completer_fournisseur_lu, a4_10) complétait seul la fiche d'un fournisseur sans SIREN.
--     Il ne le fait plus que pour un fournisseur encore « à confirmer » né de cette même pièce (la personne qui le
--     confirme voit son SIREN) ; un fournisseur établi reçoit une proposition. Posé par repère.
--   · Le contrôle « fournisseur.identification » (fournisseur reconnu à son nom) ne dit plus « faute de SIREN » quand
--     la pièce en porte un : il dit le SIREN (ou la TVA) lu et la proposition, ou qu'il appartient à un autre
--     fournisseur, ou qu'une personne l'a écarté. Si la fiche porte déjà ce SIREN, la facture est tenue pour reconnue
--     à son SIREN. Toujours en attention, jamais bloquant.
--   · public.filed_completer_fournisseur (confirmer) et public.filed_ecarter_completion (écarter, motif) : gérant,
--     admin, valideur. Confirmer complète la fiche (une TVA française donne aussi le SIREN s'il manque et qu'aucun
--     autre fournisseur ne le porte), écarte les autres valeurs proposées pour ce champ, et recontrôle les factures
--     ouvertes du fournisseur.
-- Rejouable ; aucune suppression.

create table if not exists public.filed_fournisseurs_completions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  fournisseur_id uuid not null references public.filed_fournisseurs(id) on delete cascade,
  champ text not null check (champ in ('siren', 'tva')),
  valeur text not null check (char_length(valeur) between 9 and 20),
  verifie boolean not null default false,
  document_id uuid references public.filed_documents(id) on delete set null,
  facture_id uuid references public.filed_factures(id) on delete set null,
  statut text not null default 'propose' check (statut in ('propose', 'confirme', 'ecarte')),
  propose_le timestamptz not null default now(),
  decide_par uuid,
  decide_le timestamptz,
  motif text check (char_length(motif) <= 500),
  unique (fournisseur_id, champ, valeur)
);
comment on table public.filed_fournisseurs_completions is
  'Lot 59 (a4_67) : SIREN ou TVA lus sur une pièce pour un fournisseur qui ne les a pas : proposés, une personne confirme ou écarte.';
alter table public.filed_fournisseurs_completions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_fournisseurs_completions'
                 and policyname = 'filed_fournisseurs_completions_lecture') then
    create policy filed_fournisseurs_completions_lecture on public.filed_fournisseurs_completions for select to authenticated
      using (client_id in (select private.mes_clients()));
  end if;
end $$;
revoke all on public.filed_fournisseurs_completions from anon, authenticated;
grant select on public.filed_fournisseurs_completions to authenticated;
grant all on public.filed_fournisseurs_completions to service_role;
insert into private.tables_locataires (nom, ordre_effacement, note)
select 'filed_fournisseurs_completions', 20, 'FILED, lot 59'
where not exists (select 1 from private.tables_locataires where nom = 'filed_fournisseurs_completions');

-- Le lot 7 complète seul la fiche d'un fournisseur encore à confirmer, né de cette pièce ; aucun autre.
create or replace function private.filed_completion_directe(p_four public.filed_fournisseurs, p_document uuid)
returns boolean language sql stable set search_path to '' as $$
  select p_four.statut = 'a_confirmer' and p_four.document_origine is not distinct from p_document
$$;
revoke all on function private.filed_completion_directe(public.filed_fournisseurs, uuid) from public, anon, authenticated;
grant execute on function private.filed_completion_directe(public.filed_fournisseurs, uuid) to service_role;

-- ─── Les propositions d'une facture : ce que sa pièce porte et que la fiche n'a pas ─────
-- Rend {"siren": {valeur, verifie, statut | autre_fournisseur}, "tva": {…}} pour ce qui a été lu.
create or replace function private.filed_proposer_completions(p_facture uuid)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_f public.filed_factures; v_four public.filed_fournisseurs; v_lu jsonb; v_nv jsonb;
  v_siren text; v_siren_ok boolean; v_tva text; v_tva_ok boolean; v_a record; v_autre public.filed_fournisseurs;
  v_r jsonb := '{}'::jsonb; v_c public.filed_fournisseurs_completions;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if v_f.fournisseur_id is null then return v_r; end if;
  select * into v_four from public.filed_fournisseurs where id = v_f.fournisseur_id;
  v_lu := coalesce(v_f.fournisseur_lu, '{}'::jsonb);
  v_nv := coalesce(v_lu -> 'non_verifie', '{}'::jsonb);

  v_tva := nullif(upper(regexp_replace(coalesce(nullif(v_lu ->> 'tva', ''), v_nv ->> 'tva', ''), '[^A-Za-z0-9]', '', 'g')), '');
  v_tva_ok := nullif(v_lu ->> 'tva', '') is not null;
  if v_tva is not null then
    select * into v_a from private.filed_tva_intracom_analyser(v_tva);
    if not coalesce(v_a.valide, false) then v_tva := null; end if;
  end if;
  v_siren := nullif(regexp_replace(coalesce(nullif(v_lu ->> 'siren', ''), v_nv ->> 'siren', ''), '[^0-9]', '', 'g'), '');
  v_siren_ok := nullif(v_lu ->> 'siren', '') is not null;
  if v_siren is not null and not private.filed_siren_valide(v_siren) then v_siren := null; end if;
  if v_siren is null and private.filed_siren_de_tva_fr(v_tva) is not null then
    v_siren := private.filed_siren_de_tva_fr(v_tva); v_siren_ok := v_tva_ok;
  end if;

  if v_siren is not null and v_four.siren is null then
    select * into v_autre from public.filed_fournisseurs x where x.client_id = v_f.client_id and x.siren = v_siren and x.id <> v_four.id limit 1;
    if v_autre.id is not null then
      v_r := v_r || jsonb_build_object('siren', jsonb_build_object('valeur', v_siren, 'verifie', v_siren_ok,
               'autre_fournisseur', v_autre.id, 'autre_nom', private.filed_libelle_fournisseur(v_autre)));
    else
      insert into public.filed_fournisseurs_completions (client_id, fournisseur_id, champ, valeur, verifie, document_id, facture_id)
      values (v_f.client_id, v_four.id, 'siren', v_siren, v_siren_ok, v_f.document_id, v_f.id)
      on conflict (fournisseur_id, champ, valeur) do update set verifie = public.filed_fournisseurs_completions.verifie or excluded.verifie
      returning * into v_c;
      v_r := v_r || jsonb_build_object('siren', jsonb_build_object('valeur', v_siren, 'verifie', v_c.verifie, 'statut', v_c.statut, 'proposition', v_c.id));
    end if;
  end if;
  if v_tva is not null and v_four.tva is null then
    v_autre := null;
    select * into v_autre from public.filed_fournisseurs x where x.client_id = v_f.client_id and x.tva = v_tva and x.id <> v_four.id limit 1;
    if v_autre.id is not null then
      v_r := v_r || jsonb_build_object('tva', jsonb_build_object('valeur', v_tva, 'verifie', v_tva_ok,
               'autre_fournisseur', v_autre.id, 'autre_nom', private.filed_libelle_fournisseur(v_autre)));
    else
      insert into public.filed_fournisseurs_completions (client_id, fournisseur_id, champ, valeur, verifie, document_id, facture_id)
      values (v_f.client_id, v_four.id, 'tva', v_tva, v_tva_ok, v_f.document_id, v_f.id)
      on conflict (fournisseur_id, champ, valeur) do update set verifie = public.filed_fournisseurs_completions.verifie or excluded.verifie
      returning * into v_c;
      v_r := v_r || jsonb_build_object('tva', jsonb_build_object('valeur', v_tva, 'verifie', v_c.verifie, 'statut', v_c.statut, 'proposition', v_c.id));
    end if;
  end if;
  if v_r <> '{}'::jsonb and exists (select 1 from public.filed_fournisseurs_completions c where c.facture_id = v_f.id and c.propose_le = now()) then
    perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_fournisseur', v_four.id::text, 'completion_proposee',
      left('Compléter la fiche du fournisseur est proposé : ' || (select string_agg(k || ' ' || (v_r -> k ->> 'valeur'), ', ') from jsonb_object_keys(v_r) k)
           || '. Une personne confirme.', 500),
      v_r);
  end if;
  return v_r;
end $$;
revoke all on function private.filed_proposer_completions(uuid) from public, anon, authenticated;
grant execute on function private.filed_proposer_completions(uuid) to service_role;

-- ─── Le contrôle d'un fournisseur reconnu à son nom ──────────────────────────
create or replace function private.filed_identification_par_nom(p_facture uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare
  v_f public.filed_factures; v_four public.filed_fournisseurs; v_r jsonb; v_lu jsonb; v_siren_lu text; v_tva_lu text;
  v_parts text[] := '{}'; v_autres text[] := '{}'; v_ecartes text[] := '{}'; k text; e jsonb; v_lib text;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  select * into v_four from public.filed_fournisseurs where id = v_f.fournisseur_id;
  v_lu := coalesce(v_f.fournisseur_lu, '{}'::jsonb);
  v_siren_lu := nullif(regexp_replace(coalesce(nullif(v_lu ->> 'siren', ''), v_lu -> 'non_verifie' ->> 'siren', ''), '[^0-9]', '', 'g'), '');
  v_tva_lu := nullif(upper(regexp_replace(coalesce(nullif(v_lu ->> 'tva', ''), v_lu -> 'non_verifie' ->> 'tva', ''), '[^A-Za-z0-9]', '', 'g')), '');

  -- La fiche porte déjà ce que la pièce donne : la facture est reconnue à son SIREN (ou à sa TVA).
  if (v_four.siren is not null and v_four.siren in (v_siren_lu, private.filed_siren_de_tva_fr(v_tva_lu)))
     or (v_four.tva is not null and v_four.tva = v_tva_lu) then
    update public.filed_factures
       set fournisseur_identification = case when v_four.siren is not null and v_four.siren in (v_siren_lu, private.filed_siren_de_tva_fr(v_tva_lu))
                                             then 'siren' else 'tva' end
     where id = v_f.id;
    perform private.filed_poser_resultat(v_f, 'fournisseur.identification', 'attention', false,
      'Fournisseur reconnu : le SIREN ou la TVA de la pièce sont ceux de sa fiche.', null, jsonb_build_object('fournisseur', v_four.id));
    return;
  end if;

  v_r := private.filed_proposer_completions(v_f.id);
  if v_r = '{}'::jsonb then
    perform private.filed_poser_resultat(v_f, 'fournisseur.identification', 'attention', true,
      'Fournisseur reconnu à son seul nom, faute de SIREN ou de TVA lisibles : vérifier.', null,
      jsonb_build_object('fournisseur', v_four.id));
    return;
  end if;

  for k, e in select * from jsonb_each(v_r) loop
    v_lib := case k when 'siren' then 'le SIREN ' || private.filed_siren_texte(e ->> 'valeur') else 'la TVA ' || (e ->> 'valeur') end
             || case when (e ->> 'verifie')::boolean then '' else ' (lu sans vérification)' end;
    if e ? 'autre_fournisseur' then
      v_autres := v_autres || format('%s, qui est celui de %s', v_lib, e ->> 'autre_nom');
    elsif e ->> 'statut' = 'ecarte' then
      v_ecartes := v_ecartes || v_lib;
    elsif e ->> 'statut' = 'propose' then
      v_parts := v_parts || v_lib;
    end if;
  end loop;
  perform private.filed_poser_resultat(v_f, 'fournisseur.identification', 'attention', true,
    left('Fournisseur reconnu à son nom. '
      || case when cardinality(v_parts) > 0
              then 'La pièce porte ' || array_to_string(v_parts, ' et ') || ', absent de sa fiche : la compléter est proposé, une personne confirme. '
              else '' end
      || case when cardinality(v_autres) > 0
              then 'La pièce porte ' || array_to_string(v_autres, ' ; ') || ' : vérifier le fournisseur retenu. '
              else '' end
      || case when cardinality(v_ecartes) > 0
              then 'Écarté par une personne pour ce fournisseur : ' || array_to_string(v_ecartes, ', ') || ' ; vérifier. '
              else '' end, 500),
    null, jsonb_build_object('fournisseur', v_four.id, 'lu', v_r));
end $$;
revoke all on function private.filed_identification_par_nom(uuid) from public, anon, authenticated;
grant execute on function private.filed_identification_par_nom(uuid) to service_role;

create or replace function private.filed_siren_texte(p text)
returns text language sql immutable set search_path to '' as $$
  select case when p ~ '^[0-9]{9}$' then substr(p, 1, 3) || ' ' || substr(p, 4, 3) || ' ' || substr(p, 7, 3) else p end
$$;
revoke all on function private.filed_siren_texte(text) from public, anon, authenticated;
grant execute on function private.filed_siren_texte(text) to service_role;

-- ─── Une personne confirme ou écarte ─────────────────────────────────────
create or replace function private.filed_decider_completion(p_completion uuid, p_decision text, p_motif text)
returns void language plpgsql security definer set search_path to '' as $$
declare c public.filed_fournisseurs_completions; v_four public.filed_fournisseurs; v_par uuid; v_siren text; r record;
begin
  select * into c from public.filed_fournisseurs_completions where id = p_completion for update;
  if not found then raise exception 'Proposition introuvable.' using errcode = 'P0002'; end if;
  v_par := private.filed_exiger_acteur(c.client_id, array['gerant', 'admin', 'valideur']);
  if c.statut <> 'propose' then raise exception 'Cette proposition est déjà tranchée (%).', c.statut using errcode = '55000'; end if;
  select * into v_four from public.filed_fournisseurs where id = c.fournisseur_id for update;
  if p_decision = 'confirme' then
    if c.champ = 'siren' then
      if v_four.siren is not null and v_four.siren <> c.valeur then
        raise exception 'La fiche porte déjà un autre SIREN (%).', v_four.siren using errcode = '55000';
      end if;
      if exists (select 1 from public.filed_fournisseurs x where x.client_id = c.client_id and x.siren = c.valeur and x.id <> v_four.id) then
        raise exception 'Ce SIREN est déjà celui d''un autre fournisseur de l''organisation.' using errcode = '23505';
      end if;
      update public.filed_fournisseurs set siren = c.valeur, maj_le = now() where id = v_four.id;
    else
      if v_four.tva is not null and v_four.tva <> c.valeur then
        raise exception 'La fiche porte déjà une autre TVA (%).', v_four.tva using errcode = '55000';
      end if;
      if exists (select 1 from public.filed_fournisseurs x where x.client_id = c.client_id and x.tva = c.valeur and x.id <> v_four.id) then
        raise exception 'Cette TVA est déjà celle d''un autre fournisseur de l''organisation.' using errcode = '23505';
      end if;
      v_siren := private.filed_siren_de_tva_fr(c.valeur);
      update public.filed_fournisseurs
         set tva = c.valeur,
             siren = case when siren is null and v_siren is not null
                               and not exists (select 1 from public.filed_fournisseurs x where x.client_id = c.client_id and x.siren = v_siren and x.id <> v_four.id)
                          then v_siren else siren end,
             maj_le = now()
       where id = v_four.id;
    end if;
    update public.filed_fournisseurs_completions set statut = 'confirme', decide_par = v_par, decide_le = now(), motif = left(nullif(btrim(p_motif), ''), 500)
     where id = c.id;
    update public.filed_fournisseurs_completions set statut = 'ecarte', decide_par = v_par, decide_le = now(), motif = 'Une autre valeur est confirmée.'
     where fournisseur_id = c.fournisseur_id and champ = c.champ and id <> c.id and statut = 'propose';
  elsif p_decision = 'ecarte' then
    if nullif(btrim(coalesce(p_motif, '')), '') is null then raise exception 'Un motif est demandé.' using errcode = '22023'; end if;
    update public.filed_fournisseurs_completions set statut = 'ecarte', decide_par = v_par, decide_le = now(), motif = left(btrim(p_motif), 500)
     where id = c.id;
  else
    raise exception 'Décision inconnue : confirme ou ecarte.' using errcode = '22023';
  end if;
  perform private.filed_historiser(c.client_id, null, 'filed_fournisseur', v_four.id::text, 'completion',
    case p_decision when 'confirme' then format('Fiche du fournisseur complétée par une personne : %s %s.', upper(c.champ), c.valeur)
                    else left(format('%s %s écarté par une personne : %s', upper(c.champ), c.valeur, btrim(p_motif)), 500) end,
    jsonb_build_object('proposition', c.id, 'champ', c.champ, 'valeur', c.valeur, 'decision', p_decision));
  -- Les factures ouvertes du fournisseur se recontrôlent.
  for r in select f.id from public.filed_factures f
            where f.fournisseur_id = c.fournisseur_id and f.statut in ('a_completer', 'bloquee', 'a_valider') loop
    perform private.filed_controler_facture(r.id);
  end loop;
end $$;
revoke all on function private.filed_decider_completion(uuid, text, text) from public, anon;
grant execute on function private.filed_decider_completion(uuid, text, text) to authenticated, service_role;

create or replace function public.filed_completer_fournisseur(p_completion uuid)
returns void language sql set search_path to '' as $$ select private.filed_decider_completion(p_completion, 'confirme', null) $$;
comment on function public.filed_completer_fournisseur(uuid) is
  'Lot 59 (a4_67) : confirme le SIREN ou la TVA proposés pour un fournisseur (lus sur une pièce) ; la fiche est complétée, ses factures ouvertes recontrôlées. Gérant, admin, valideur.';
revoke all on function public.filed_completer_fournisseur(uuid) from public, anon;
grant execute on function public.filed_completer_fournisseur(uuid) to authenticated, service_role;

create or replace function public.filed_ecarter_completion(p_completion uuid, p_motif text)
returns void language sql set search_path to '' as $$ select private.filed_decider_completion(p_completion, 'ecarte', p_motif) $$;
comment on function public.filed_ecarter_completion(uuid, text) is
  'Lot 59 (a4_67) : écarte le SIREN ou la TVA proposés pour un fournisseur (motif demandé). Gérant, admin, valideur.';
revoke all on function public.filed_ecarter_completion(uuid, text) from public, anon;
grant execute on function public.filed_ecarter_completion(uuid, text) to authenticated, service_role;

-- ─── Repères ─────────────────────────────────────────────────────────────
-- 1. Le lot 7 ne complète plus seul qu'un fournisseur à confirmer né de la pièce ; sinon, il propose.
do $$
declare
  v_def text;
  v_siren constant text := E'    if v_four.siren is null and v_siren is not null\n';
  v_tva constant text := E'    if v_four.tva is null and v_tva is not null\n';
  v_fin constant text := E'  if v_detail <> ''{}''::jsonb then\n';
  v_n int;
begin
  v_def := pg_get_functiondef('private.filed_completer_fournisseur_lu(uuid)'::regprocedure);
  if position('filed_completion_directe' in v_def) > 0 then
    return;
  end if;
  foreach v_n in array array[
      (length(v_def) - length(replace(v_def, v_siren, ''))) / length(v_siren),
      (length(v_def) - length(replace(v_def, v_tva, ''))) / length(v_tva),
      (length(v_def) - length(replace(v_def, v_fin, ''))) / length(v_fin)] loop
    if v_n <> 1 then
      raise exception 'a4_67 : un repère de filed_completer_fournisseur_lu n''y est pas une seule fois (%)', v_n;
    end if;
  end loop;
  v_def := replace(v_def, v_siren, E'    if v_four.siren is null and v_siren is not null and private.filed_completion_directe(v_four, v_f.document_id)   -- a4_67\n');
  v_def := replace(v_def, v_tva, E'    if v_four.tva is null and v_tva is not null and private.filed_completion_directe(v_four, v_f.document_id)   -- a4_67\n');
  v_def := replace(v_def, v_fin,
    E'  -- a4_67 : un fournisseur établi ne se complète pas seul : ce que la pièce porte est proposé, une personne confirme.\n'
    || E'  if v_f.fournisseur_id is not null and not private.filed_completion_directe(v_four, v_f.document_id) then\n'
    || E'    perform private.filed_proposer_completions(v_f.id);\n'
    || E'  end if;\n'
    || v_fin);
  execute v_def;
end $$;

-- 2. Le contrôle « reconnu à son seul nom » dit ce que la pièce porte.
do $$
declare
  v_def text;
  v_ancien constant text := E'      perform private.filed_poser_resultat(v_f, ''fournisseur.identification'', ''attention'', true,\n'
                         || E'        ''Fournisseur reconnu à son seul nom, faute de SIREN ou de TVA lisibles : vérifier.'', null,\n'
                         || E'        jsonb_build_object(''fournisseur'', v_four.id));\n';
  v_n int;
begin
  v_def := pg_get_functiondef('private.filed_controler_facture(uuid)'::regprocedure);
  if position('filed_identification_par_nom' in v_def) > 0 then
    return;
  end if;
  v_n := (length(v_def) - length(replace(v_def, v_ancien, ''))) / length(v_ancien);
  if v_n <> 1 then
    raise exception 'a4_67 : repère de filed_controler_facture trouvé % fois (1 attendu)', v_n;
  end if;
  execute replace(v_def, v_ancien,
    E'      perform private.filed_identification_par_nom(v_f.id);   -- a4_67 : le SIREN ou la TVA de la pièce, proposés à une personne\n');
end $$;

-- ═══ Complément (demande d'A1, b7773e70 ; coordinateur, 19/10 18 h 34 Z) : l'IBAN partiellement masqué ═══
-- filed_integrer_facture ne reprend pas un IBAN qui n'a pas la forme d'un IBAN (un IBAN masqué : « FR76 **** … 189 ») ;
-- le contrôle disait alors « iban.absent ». Désormais, quand la pièce porte un fournisseur.iban non vide mais
-- incomplet, le contrôle « iban.masque » (attention) le remplace : « IBAN partiellement masqué sur la pièce : à
-- compléter avant paiement. » L'IBAN n'est jamais repris d'office. Tant que ce contrôle est ouvert (ni levé par une
-- personne, ni résolu par un IBAN complet), noter un paiement par virement (ou sans moyen dit) est refusé.

-- Ce que la pièce porte comme IBAN quand ce n'en est pas un complet ; nul sinon.
create or replace function private.filed_iban_masque_lu(p_facture uuid)
returns text language plpgsql stable security definer set search_path to '' as $$
declare v_piece uuid; v_brut text; v_compact text;
begin
  select d.piece_id into v_piece from public.filed_factures f join public.filed_documents d on d.id = f.document_id where f.id = p_facture;
  if v_piece is null then return null; end if;
  v_brut := nullif(btrim(coalesce(private.filed_valeurs(v_piece) -> 'fournisseur.iban' ->> 'valeur', '')), '');
  if v_brut is null then return null; end if;
  v_compact := upper(regexp_replace(v_brut, '\s', '', 'g'));
  if v_compact ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$' then return null; end if;   -- complet : son cas est ailleurs (iban.invalide)
  if char_length(v_compact) < 4 then return null; end if;
  return left(v_brut, 60);
end $$;
revoke all on function private.filed_iban_masque_lu(uuid) from public, anon, authenticated;
grant execute on function private.filed_iban_masque_lu(uuid) to service_role;

-- Un IBAN masqué non résolu interdit de noter un virement.
create or replace function private.filed_iban_masque_ouvert(p_facture uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.filed_controles c where c.facture_id = p_facture and c.code = 'iban.masque' and c.resultat = 'anomalie')
$$;
revoke all on function private.filed_iban_masque_ouvert(uuid) from public, anon;
grant execute on function private.filed_iban_masque_ouvert(uuid) to authenticated, service_role;

-- 3. Le contrôle : iban.masque remplace iban.absent quand la pièce porte un IBAN incomplet.
do $$
declare
  v_def text;
  v_ancien constant text := E'    perform private.filed_poser_resultat(v_f, ''iban.absent'', ''info'', true,\n'
                         || E'      ''Aucun IBAN sur la facture ni au référentiel : le paiement passera par un autre moyen.'');\n';
  v_n int;
begin
  v_def := pg_get_functiondef('private.filed_controler_facture(uuid)'::regprocedure);
  if position('iban.masque' in v_def) > 0 then
    return;
  end if;
  v_n := (length(v_def) - length(replace(v_def, v_ancien, ''))) / length(v_ancien);
  if v_n <> 1 then
    raise exception 'a4_67 : repère iban.absent trouvé % fois (1 attendu)', v_n;
  end if;
  execute replace(v_def, v_ancien,
       E'    if private.filed_iban_masque_lu(v_f.id) is not null then   -- a4_67 : IBAN masqué sur la pièce, jamais repris\n'
    || E'      perform private.filed_poser_resultat(v_f, ''iban.masque'', ''attention'', true,\n'
    || E'        ''IBAN partiellement masqué sur la pièce : à compléter avant paiement.'', ''COORD_BANC_ERR'',\n'
    || E'        jsonb_build_object(''lu'', private.filed_iban_masque_lu(v_f.id)));\n'
    || E'    else\n'
    || regexp_replace(v_ancien, E'^    ', '      ', 'gn')
    || E'    end if;\n');
end $$;

-- 4. Noter un paiement : pas de virement tant que l'IBAN masqué n'est pas résolu.
do $$
declare
  v_def text;
  v_repere constant text := E'  return private.filed_marquer_reglee(p_facture, p_date, p_montant, p_moyen, p_reference);\n';
  v_n int;
begin
  v_def := pg_get_functiondef('public.filed_noter_paiement(uuid,date,numeric,text,text)'::regprocedure);
  if position('filed_iban_masque_ouvert' in v_def) > 0 then
    return;
  end if;
  v_n := (length(v_def) - length(replace(v_def, v_repere, ''))) / length(v_repere);
  if v_n <> 1 then
    raise exception 'a4_67 : repère de filed_noter_paiement trouvé % fois (1 attendu)', v_n;
  end if;
  execute replace(v_def, v_repere,
       E'  if coalesce(p_moyen, ''virement'') = ''virement'' and private.filed_iban_masque_ouvert(p_facture) then   -- a4_67\n'
    || E'    raise exception ''IBAN partiellement masqué sur la pièce : à compléter avant paiement.'' using errcode = ''55000'';\n'
    || E'  end if;\n'
    || v_repere);
end $$;
