-- recupere 20261005165200 filed_lot4f_circuit_validation
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Note : a4_07.
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête c63fa85a-d5b2-494d-bb73-92649a2bf2b9 (mcp__Supabase__execute_sql, 2026-10-05T16:59:44.274Z, résultat : réussi)
set lock_timeout = '8s';
-- FILED, lot 4f — Le circuit de validation d'une facture (a4_07, session A4, posé par le coordinateur)
create table if not exists public.filed_circuits (
  id                    uuid primary key default gen_random_uuid(),
  client_id             uuid not null references public.clients(id) on delete cascade,
  entite_id             uuid references public.entites(id) on delete cascade,
  centre_id             uuid references public.filed_centres_cout(id) on delete cascade,
  montant_min           numeric(14,2) not null default 0 check (montant_min >= 0),
  montant_max           numeric(14,2) check (montant_max is null or montant_max > montant_min),
  niveau                smallint not null default 1 check (niveau in (1, 2)),
  approbations_requises smallint not null default 1 check (approbations_requises between 1 and 3),
  roles_autorises       text[] not null default array['gerant', 'admin', 'valideur'],
  equipe_id             uuid references public.equipes(id) on delete set null,
  delai_relance_jours   smallint not null default 3 check (delai_relance_jours between 1 and 60),
  delai_remontee_jours  smallint not null default 7 check (delai_remontee_jours between 1 and 90),
  regle_id              uuid references public.regles_validation(id) on delete set null,
  actif                 boolean not null default true,
  cree_par              uuid,
  cree_le               timestamptz not null default now(),
  maj_le                timestamptz not null default now(),
  constraint filed_circuits_roles check (roles_autorises <@ array['gerant', 'admin', 'valideur'] and cardinality(roles_autorises) >= 1),
  constraint filed_circuits_delais check (delai_remontee_jours > delai_relance_jours)
);
comment on table public.filed_circuits is
  'Le circuit d''approbation des factures : par société, centre de coût et tranche de montant, combien d''approbations distinctes, de quels rôles ou de quelle équipe, à quel niveau, et les délais de relance puis de remontée. Chaque circuit porte sa règle dans regles_validation.';
create unique index if not exists filed_circuits_un on public.filed_circuits
  (client_id, coalesce(entite_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(centre_id, '00000000-0000-0000-0000-000000000000'::uuid), niveau, montant_min) where actif;
create index if not exists filed_circuits_client on public.filed_circuits (client_id, actif);

create table if not exists public.filed_validations (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  facture_id    uuid not null references public.filed_factures(id) on delete cascade,
  document_id   uuid not null references public.filed_documents(id) on delete cascade,
  demande_id    uuid not null references public.demandes_validation(id) on delete cascade,
  version       integer not null,
  niveau        smallint not null default 1 check (niveau in (1, 2)),
  type_action   text not null,
  circuit_id    uuid references public.filed_circuits(id) on delete set null,
  deposee_le    timestamptz not null default now(),
  relance_le    timestamptz,
  remontee_le   timestamptz,
  issue         text,
  decide_le     timestamptz
);
comment on table public.filed_validations is
  'Chaque demande de validation que FILED dépose pour une facture : sa version, son niveau, son circuit, la relance faite, la remontée faite, et son issue.';
create unique index if not exists filed_validations_demande on public.filed_validations (demande_id);
create index if not exists filed_validations_facture on public.filed_validations (facture_id, deposee_le desc);
create index if not exists filed_validations_en_cours on public.filed_validations (client_id, deposee_le) where issue is null;

create table if not exists public.filed_factures_annexes (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients(id) on delete cascade,
  facture_id    uuid not null references public.filed_factures(id) on delete cascade,
  document_id   uuid not null references public.filed_documents(id) on delete cascade,
  nature        text not null check (nature in ('commentaire', 'piece', 'motif_refus', 'approbation')),
  piece_id      uuid references public.pieces(id) on delete set null,
  texte         text check (texte is null or char_length(texte) between 1 and 2000),
  auteur_id     uuid,
  demande_id    uuid references public.demandes_validation(id) on delete set null,
  cree_le       timestamptz not null default now(),
  constraint filed_factures_annexes_contenu check (texte is not null or piece_id is not null)
);
comment on table public.filed_factures_annexes is
  'Ce qui reste attaché à une facture au long de son circuit : commentaires, pièces jointes, motif de refus, commentaires d''approbation. Ajout seul.';
create index if not exists filed_factures_annexes_facture on public.filed_factures_annexes (facture_id, cree_le);

do $$ declare t text; begin
  foreach t in array array['filed_circuits', 'filed_validations', 'filed_factures_annexes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke insert, update, delete on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_circuits' and policyname = 'filed_circuits_lecture') then
    create policy filed_circuits_lecture on public.filed_circuits for select to authenticated using (client_id in (select private.mes_clients()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_validations' and policyname = 'filed_validations_lecture') then
    create policy filed_validations_lecture on public.filed_validations for select to authenticated using (exists (select 1 from public.filed_documents d where d.id = document_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_factures_annexes' and policyname = 'filed_factures_annexes_lecture') then
    create policy filed_factures_annexes_lecture on public.filed_factures_annexes for select to authenticated using (exists (select 1 from public.filed_documents d where d.id = document_id));
  end if;
end $$;
create or replace trigger filed_circuits_maj_le before update on public.filed_circuits for each row execute function private.filed_lot4_maj_le();

insert into private.tables_locataires (nom, ordre_effacement, note) values
  ('filed_validations', 2, 'FILED, lot 4'), ('filed_factures_annexes', 2, 'FILED, lot 4'), ('filed_circuits', 30, 'FILED, lot 4')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;
insert into private.tables_objets (nom, objet_type, colonne, ordre_effacement) values
  ('filed_validations', 'filed_document', 'document_id', 5), ('filed_factures_annexes', 'filed_document', 'document_id', 5)
on conflict (nom) do update set objet_type = excluded.objet_type, colonne = excluded.colonne, ordre_effacement = excluded.ordre_effacement;

create or replace function private.filed_type_action_facture(p_client uuid, p_centre uuid, p_niveau integer)
returns text language sql stable set search_path to '' as $$
  select 'filed.valider_facture'
      || coalesce((select '.' || lower(k.code) from public.filed_centres_cout k
                    where k.id = p_centre and exists (select 1 from public.filed_circuits c where c.client_id = p_client and c.centre_id = k.id and c.actif)), '')
      || case when p_niveau = 2 then '.direction' else '' end
$$;

create or replace function private.filed_centre_de(p_facture uuid)
returns uuid language sql stable set search_path to '' as $$
  select i.centre_id from public.filed_imputations i
   where i.facture_id = p_facture and i.statut in ('validee', 'proposee') and i.centre_id is not null
   order by (i.statut = 'validee') desc, abs(i.montant_ht) desc limit 1
$$;

create or replace function private.filed_circuit_pour(p_client uuid, p_entite uuid, p_centre uuid, p_montant numeric, p_niveau integer)
returns public.filed_circuits language sql stable set search_path to '' as $$
  select c.* from public.filed_circuits c
   where c.client_id = p_client and c.actif and c.niveau = p_niveau
     and (c.entite_id is null or c.entite_id = p_entite)
     and (c.centre_id is null or c.centre_id = p_centre)
     and coalesce(p_montant, 0) >= c.montant_min and (c.montant_max is null or coalesce(p_montant, 0) < c.montant_max)
   order by (c.entite_id is not null) desc, (c.centre_id is not null) desc, c.montant_min desc
   limit 1
$$;

create or replace function private.filed_regler_circuit(
  p_client uuid, p_entite uuid, p_centre uuid, p_montant_min numeric, p_montant_max numeric,
  p_approbations_requises integer, p_roles text[], p_equipe uuid default null, p_niveau integer default 1,
  p_delai_relance_jours integer default 3, p_delai_remontee_jours integer default 7)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_uid uuid; v_c public.filed_circuits; v_regle uuid; v_type text; v_roles text[] := coalesce(p_roles, array['gerant', 'admin', 'valideur']);
begin
  v_uid := private.filed_exiger_acteur(p_client, array['gerant', 'admin'], p_entite);
  if p_centre is not null and not exists (select 1 from public.filed_centres_cout k where k.id = p_centre and k.client_id = p_client and k.actif) then
    raise exception 'Centre de coût introuvable ou retiré.' using errcode = '22023';
  end if;
  if p_equipe is not null and not exists (select 1 from public.equipes e where e.id = p_equipe and e.client_id = p_client) then
    raise exception 'Équipe introuvable.' using errcode = '22023';
  end if;
  if not (v_roles <@ array['gerant', 'admin', 'valideur']) or cardinality(v_roles) = 0 then
    raise exception 'Les rôles d''un circuit sont gerant, admin ou valideur.' using errcode = '22023';
  end if;
  if coalesce(p_niveau, 1) not in (1, 2) then raise exception 'Le niveau est 1 (approbation) ou 2 (direction).' using errcode = '22023'; end if;

  select * into v_c from public.filed_circuits c
   where c.client_id = p_client and c.entite_id is not distinct from p_entite and c.centre_id is not distinct from p_centre
     and c.niveau = coalesce(p_niveau, 1) and c.montant_min = coalesce(p_montant_min, 0) and c.actif;
  if found then
    update public.filed_circuits set montant_max = p_montant_max, approbations_requises = coalesce(p_approbations_requises, 1), roles_autorises = v_roles,
      equipe_id = p_equipe, delai_relance_jours = coalesce(p_delai_relance_jours, 3), delai_remontee_jours = coalesce(p_delai_remontee_jours, 7)
     where id = v_c.id returning * into v_c;
  else
    insert into public.filed_circuits (client_id, entite_id, centre_id, montant_min, montant_max, niveau, approbations_requises, roles_autorises, equipe_id, delai_relance_jours, delai_remontee_jours, cree_par)
    values (p_client, p_entite, p_centre, coalesce(p_montant_min, 0), p_montant_max, coalesce(p_niveau, 1), coalesce(p_approbations_requises, 1), v_roles, p_equipe, coalesce(p_delai_relance_jours, 3), coalesce(p_delai_remontee_jours, 7), v_uid)
    returning * into v_c;
  end if;

  v_type := private.filed_type_action_facture(p_client, p_centre, coalesce(p_niveau, 1));
  if v_c.regle_id is not null then
    update public.regles_validation set entite_id = p_entite, montant_min = coalesce(p_montant_min, 0), montant_max = p_montant_max,
      approbations_requises = coalesce(p_approbations_requises, 1), roles_autorises = v_roles, equipe_id = p_equipe, type_action = v_type, actif = true
     where id = v_c.regle_id;
    v_regle := v_c.regle_id;
  else
    insert into public.regles_validation (client_id, entite_id, module, montant_min, montant_max, approbations_requises, roles_autorises, actif, type_action, equipe_id)
    values (p_client, p_entite, 'filed', coalesce(p_montant_min, 0), p_montant_max, coalesce(p_approbations_requises, 1), v_roles, true, v_type, p_equipe)
    returning id into v_regle;
    update public.filed_circuits set regle_id = v_regle where id = v_c.id;
  end if;
  perform private.filed_journaliser(p_client, 'filed.circuit', 'filed_circuit', v_c.id::text,
    jsonb_build_object('type_action', v_type, 'niveau', coalesce(p_niveau, 1), 'montant_min', coalesce(p_montant_min, 0), 'montant_max', p_montant_max,
                       'approbations_requises', coalesce(p_approbations_requises, 1), 'roles', to_jsonb(v_roles), 'equipe', p_equipe, 'centre', p_centre, 'regle', v_regle), p_entite);
  return v_c.id;
end $$;
create or replace function public.filed_regler_circuit(
  p_client uuid, p_entite uuid, p_centre uuid, p_montant_min numeric, p_montant_max numeric,
  p_approbations_requises integer, p_roles text[], p_equipe uuid default null, p_niveau integer default 1,
  p_delai_relance_jours integer default 3, p_delai_remontee_jours integer default 7)
returns uuid language sql set search_path to '' as $$
  select private.filed_regler_circuit(p_client, p_entite, p_centre, p_montant_min, p_montant_max, p_approbations_requises, p_roles, p_equipe, p_niveau, p_delai_relance_jours, p_delai_remontee_jours)
$$;
comment on function public.filed_regler_circuit(uuid, uuid, uuid, numeric, numeric, integer, text[], uuid, integer, integer, integer) is
  'Pose un circuit d''approbation : société, centre de coût, tranche de montant, nombre d''approbations distinctes, rôles ou équipe, niveau (1 ou 2 direction), délais de relance et de remontée. Gérant ou admin.';
revoke all on function public.filed_regler_circuit(uuid, uuid, uuid, numeric, numeric, integer, text[], uuid, integer, integer, integer) from public, anon;
grant execute on function public.filed_regler_circuit(uuid, uuid, uuid, numeric, numeric, integer, text[], uuid, integer, integer, integer) to authenticated, service_role;

create or replace function private.filed_retirer_circuit(p_circuit uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare v_c public.filed_circuits;
begin
  select * into v_c from public.filed_circuits where id = p_circuit for update;
  if not found then raise exception 'Circuit introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(v_c.client_id, array['gerant', 'admin'], v_c.entite_id);
  update public.filed_circuits set actif = false where id = p_circuit;
  if v_c.regle_id is not null then update public.regles_validation set actif = false where id = v_c.regle_id; end if;
  perform private.filed_journaliser(v_c.client_id, 'filed.circuit.retrait', 'filed_circuit', v_c.id::text, '{}'::jsonb, v_c.entite_id);
end $$;
create or replace function public.filed_retirer_circuit(p_circuit uuid)
returns void language sql set search_path to '' as $$ select private.filed_retirer_circuit(p_circuit) $$;
comment on function public.filed_retirer_circuit(uuid) is 'Retire un circuit d''approbation et désactive sa règle.';
revoke all on function public.filed_retirer_circuit(uuid) from public, anon;
grant execute on function public.filed_retirer_circuit(uuid) to authenticated, service_role;

create or replace function private.filed_saisisseurs(p_facture uuid)
returns uuid[] language sql stable set search_path to '' as $$
  select coalesce(array_agg(distinct u), '{}')
    from (
      select d.depose_par as u from public.filed_factures f join public.filed_documents d on d.id = f.document_id where f.id = p_facture and d.depose_par is not null
      union
      select h.acteur_id from public.filed_factures f join public.filed_historique h on h.document_id = f.document_id
       where f.id = p_facture and h.acteur_type = 'utilisateur' and h.acteur_id is not null
         and h.etape not in ('validee', 'refusee', 'archivee', 'litige_ouvert', 'litige_clos', 'reglee', 'validation_demandee', 'relancee', 'remontee', 'annexe')
    ) s
$$;
comment on function private.filed_saisisseurs(uuid) is 'Les personnes qui ont déposé, corrigé ou confirmé la pièce : elles ne l''approuvent pas.';

create or replace function private.filed_deposer_validation(p_facture uuid, p_niveau integer default 1, p_suffixe text default '')
returns uuid language plpgsql security definer set search_path to '' as $$
declare
  v_f public.filed_factures; v_doc public.filed_documents; v_four text; v_centre uuid; v_centre_code text; v_circuit public.filed_circuits;
  v_type text; v_cle text; v_demande uuid; v_montant numeric; v_regle uuid; v_resume text; v_d public.demandes_validation;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found or v_f.statut <> 'a_valider' then return null; end if;
  select * into v_doc from public.filed_documents where id = v_f.document_id;
  select f.nom into v_four from public.filed_fournisseurs f where f.id = v_f.fournisseur_id;
  v_centre := private.filed_centre_de(v_f.id);
  select k.code into v_centre_code from public.filed_centres_cout k where k.id = v_centre;
  v_montant := abs(coalesce(v_f.montant_ttc, 0));
  v_circuit := private.filed_circuit_pour(v_f.client_id, v_f.entite_id, v_centre, v_montant, p_niveau);
  v_type := private.filed_type_action_facture(v_f.client_id, v_centre, p_niveau);

  if p_niveau = 2 and v_circuit.id is null then
    insert into public.regles_validation (client_id, entite_id, module, montant_min, montant_max, approbations_requises, roles_autorises, actif, type_action, equipe_id)
    values (v_f.client_id, null, 'filed', 0, null, 1, array['gerant', 'admin'], true, v_type, null) returning id into v_regle;
    insert into public.filed_circuits (client_id, entite_id, centre_id, montant_min, niveau, approbations_requises, roles_autorises, regle_id)
    values (v_f.client_id, null, null, 0, 2, 1, array['gerant', 'admin'], v_regle) returning * into v_circuit;
  end if;

  v_cle := 'filed:facture:' || v_f.id::text || ':v' || v_f.version::text || case when p_niveau = 2 then ':n2' else '' end || coalesce(p_suffixe, '');
  update public.demandes_validation set statut = 'annulee'
   where client_id = v_f.client_id and module = 'filed' and objet_type = 'filed_facture' and objet_id = v_f.id::text
     and type_action like 'filed.valider_facture%' and statut = 'en_attente' and cle_idempotence <> v_cle;
  update public.filed_validations v set issue = 'annulee', decide_le = now()
   from public.demandes_validation d where d.id = v.demande_id and v.facture_id = v_f.id and v.issue is null and d.statut = 'annulee';

  v_resume := left(format('Valider %s %s de %s : %s TTC%s%s%s',
    case when v_f.nature = 'avoir' then 'l''avoir' else 'la facture' end, coalesce(v_f.numero, '(sans numéro)'), coalesce(v_four, 'fournisseur inconnu'),
    private.filed_montant_texte(coalesce(v_f.montant_ttc, 0)),
    coalesce(', centre ' || v_centre_code, ''),
    case when p_niveau = 2 then ' — remontée à la direction' else '' end,
    case when v_f.nb_attention > 0 then format(' (%s point(s) d''attention)', v_f.nb_attention) else '' end), 500);

  v_demande := private.filed_deposer_demande(v_f.client_id, v_f.entite_id, v_type, 'filed_facture', v_f.id::text, v_resume, v_montant,
    jsonb_build_object('facture', v_f.id, 'document', v_f.document_id, 'reference', v_doc.reference, 'version', v_f.version, 'niveau', p_niveau,
                       'centre', v_centre, 'montant_ttc', v_f.montant_ttc, 'fournisseur', v_f.fournisseur_id, 'anomalies', to_jsonb(v_f.anomalies),
                       'saisi_par', to_jsonb(private.filed_saisisseurs(v_f.id)), 'circuit', v_circuit.id),
    v_cle);
  if v_demande is null then return null; end if;
  select * into v_d from public.demandes_validation where id = v_demande;

  insert into public.filed_validations (client_id, facture_id, document_id, demande_id, version, niveau, type_action, circuit_id)
  values (v_f.client_id, v_f.id, v_f.document_id, v_demande, v_f.version, p_niveau, v_type, v_circuit.id)
  on conflict (demande_id) do nothing;
  if found then
    perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'validation_demandee',
      format('Validation demandée (niveau %s, %s approbation(s) : %s%s).', p_niveau, v_d.approbations_requises, array_to_string(v_d.roles_autorises, ', '),
             coalesce(', équipe ' || (select e.nom from public.equipes e where e.id = v_d.equipe_id), '')),
      jsonb_build_object('demande', v_demande, 'type_action', v_type, 'niveau', p_niveau, 'circuit', v_circuit.id, 'approbations_requises', v_d.approbations_requises));
  end if;
  return v_demande;
end $$;
comment on function private.filed_deposer_validation(uuid, integer, text) is
  'Dépose la demande de validation d''une facture à valider : le type d''action suit le centre de coût et le niveau, la règle du socle fait le reste. Une seule demande vive par facture.';

create or replace function private.filed_annuler_validations(p_facture uuid, p_motif text default 'annulee')
returns integer language plpgsql security definer set search_path to '' as $$
declare v_n integer;
begin
  with a as (
    update public.demandes_validation d set statut = 'annulee'
     where d.module = 'filed' and d.objet_type = 'filed_facture' and d.objet_id = p_facture::text
       and d.type_action like 'filed.valider_facture%' and d.statut = 'en_attente'
     returning d.id)
  update public.filed_validations v set issue = p_motif, decide_le = now() from a where v.demande_id = a.id and v.issue is null;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

create or replace function private.filed_joindre_annexe(p_facture uuid, p_texte text, p_piece uuid default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_uid uuid; v_id uuid;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found then raise exception 'Facture introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(v_f.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'], v_f.entite_id);
  if (select auth.uid()) is not null and not private.voit_objet(v_f.client_id, 'filed_document', v_f.document_id::text) then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  if nullif(btrim(p_texte), '') is null and p_piece is null then raise exception 'Une annexe porte un texte ou une pièce.' using errcode = '22023'; end if;
  if p_piece is not null and not exists (select 1 from public.pieces p where p.id = p_piece and p.client_id = v_f.client_id) then
    raise exception 'Pièce introuvable dans cette organisation.' using errcode = '22023';
  end if;
  insert into public.filed_factures_annexes (client_id, facture_id, document_id, nature, piece_id, texte, auteur_id)
  values (v_f.client_id, v_f.id, v_f.document_id, case when p_piece is null then 'commentaire' else 'piece' end, p_piece, left(nullif(btrim(p_texte), ''), 2000), v_uid)
  returning id into v_id;
  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'annexe',
    case when p_piece is null then 'Commentaire : ' || left(btrim(p_texte), 300) else 'Pièce jointe attachée' || coalesce(' : ' || left(btrim(p_texte), 250), '.') end,
    jsonb_build_object('annexe', v_id, 'piece', p_piece));
  return v_id;
end $$;
create or replace function public.filed_joindre_annexe(p_facture uuid, p_texte text, p_piece uuid default null)
returns uuid language sql set search_path to '' as $$ select private.filed_joindre_annexe(p_facture, p_texte, p_piece) $$;
comment on function public.filed_joindre_annexe(uuid, text, uuid) is 'Attache un commentaire ou une pièce jointe à une facture : ils y restent.';
revoke all on function public.filed_joindre_annexe(uuid, text, uuid) from public, anon;
grant execute on function public.filed_joindre_annexe(uuid, text, uuid) to authenticated, service_role;

create or replace function private.filed_decider_facture(p_d public.demandes_validation, p_decideur uuid, p_commentaire text)
returns text language plpgsql security definer set search_path to '' as $$
declare
  v_f public.filed_factures; v_v public.filed_validations; v_saisisseurs uuid[]; v_decideurs uuid[]; v_commun uuid[]; v_a public.filed_archives; r record; v_n integer;
begin
  select * into v_f from public.filed_factures where client_id = p_d.client_id and id::text = p_d.objet_id for update;
  if not found then return 'facture_effacee'; end if;
  select * into v_v from public.filed_validations where demande_id = p_d.id;

  if p_d.statut = 'approuvee' and p_d.politique_id is not null then
    update public.demandes_validation set statut = 'echec_execution', motif_echec = 'Une facture n''est jamais validée d''office par un accord permanent.' where id = p_d.id;
    update public.filed_validations set issue = 'refus_accord', decide_le = now() where demande_id = p_d.id;
    return 'refuse_accord';
  end if;

  if v_f.statut <> 'a_valider' or v_f.version <> coalesce((p_d.payload->>'version')::integer, v_f.version) then
    if p_d.statut = 'approuvee' then update public.demandes_validation set statut = 'executee' where id = p_d.id; end if;
    update public.filed_validations set issue = 'perimee', decide_le = now() where demande_id = p_d.id;
    perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'decision_perimee',
      format('Décision (%s) arrivée après un changement de la facture (statut %s, version %s) : sans effet.', p_d.statut, v_f.statut, v_f.version),
      jsonb_build_object('demande', p_d.id));
    return 'perimee';
  end if;

  if p_d.statut = 'approuvee' then
    v_saisisseurs := private.filed_saisisseurs(v_f.id);
    select coalesce(array_agg(distinct coalesce(a.au_nom_de, a.user_id)), '{}') into v_decideurs from public.approbations a where a.demande_id = p_d.id and a.decision = 'approuve';
    select coalesce(array_agg(x), '{}') into v_commun from unnest(v_decideurs) x where x = any (v_saisisseurs);
    if cardinality(v_commun) > 0 then
      update public.demandes_validation set statut = 'echec_execution', motif_echec = 'Celui qui a saisi la pièce ne l''approuve pas : une autre personne décide.' where id = p_d.id;
      update public.filed_validations set issue = 'separation', decide_le = now() where demande_id = p_d.id;
      perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'approbation_refusee',
        'Approbation sans effet : la personne qui a saisi ou corrigé la pièce ne peut pas l''approuver. La demande est redéposée.',
        jsonb_build_object('demande', p_d.id, 'personnes', to_jsonb(v_commun)));
      perform private.lever_alerte_module(v_f.client_id, 'filed', 'attention',
        left(format('Facture %s : la personne qui l''a saisie a tenté de l''approuver. Une autre personne doit décider.', coalesce(v_f.numero, '?')), 200),
        jsonb_build_object('facture', v_f.id, 'demande', p_d.id), 'separation:' || p_d.id::text, true, null);
      perform private.filed_journaliser(v_f.client_id, 'filed.validation.separation', 'filed_facture', v_f.id::text, jsonb_build_object('demande', p_d.id), v_f.entite_id);
      select count(*) into v_n from public.filed_validations where facture_id = v_f.id and version = v_f.version;
      perform private.filed_deposer_validation(v_f.id, coalesce(v_v.niveau, 1), ':s' || v_n::text);
      return 'separation_refusee';
    end if;

    update public.filed_factures set statut = 'validee', maj_le = now() where id = v_f.id;
    v_f.statut := 'validee';
    for r in select a.user_id, a.au_nom_de, a.commentaire from public.approbations a where a.demande_id = p_d.id and nullif(btrim(a.commentaire), '') is not null loop
      insert into public.filed_factures_annexes (client_id, facture_id, document_id, nature, texte, auteur_id, demande_id)
      values (v_f.client_id, v_f.id, v_f.document_id, 'approbation', left(r.commentaire, 2000), r.user_id, p_d.id);
    end loop;
    v_a := private.filed_archiver(v_f.id);
    perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'validee',
      format('Validée par %s personne(s)%s : classée, empreinte au journal (ligne %s).', cardinality(v_decideurs),
             case when v_v.niveau = 2 then ' (direction)' else '' end, v_a.journal_id),
      jsonb_build_object('demande', p_d.id, 'decideurs', to_jsonb(v_decideurs), 'archive', v_a.id, 'journal', v_a.journal_id, 'version', v_f.version));
    perform private.filed_journaliser(v_f.client_id, 'filed.validation', 'filed_facture', v_f.id::text,
      jsonb_build_object('demande', p_d.id, 'decision', 'approuvee', 'niveau', v_v.niveau, 'decideurs', to_jsonb(v_decideurs), 'version', v_f.version, 'archive', v_a.id), v_f.entite_id);
    update public.filed_validations set issue = 'approuvee', decide_le = now() where demande_id = p_d.id;
    update public.demandes_validation set statut = 'executee' where id = p_d.id;
    if not exists (select 1 from public.filed_imputations i where i.facture_id = v_f.id and i.statut in ('proposee', 'validee')) then
      perform private.filed_proposer_imputation(v_f.id, 'apprise');
    end if;
    return 'facture_validee';

  elsif p_d.statut = 'rejetee' then
    update public.filed_factures set statut = 'refusee', maj_le = now() where id = v_f.id;
    insert into public.filed_factures_annexes (client_id, facture_id, document_id, nature, texte, auteur_id, demande_id)
    values (v_f.client_id, v_f.id, v_f.document_id, 'motif_refus', left(coalesce(nullif(btrim(p_commentaire), ''), 'Refusée sans motif écrit.'), 2000), p_decideur, p_d.id);
    perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'refusee',
      'Refusée par une personne' || coalesce(' : ' || left(btrim(p_commentaire), 300), '.'), jsonb_build_object('demande', p_d.id, 'par', p_decideur));
    perform private.filed_journaliser(v_f.client_id, 'filed.validation', 'filed_facture', v_f.id::text,
      jsonb_build_object('demande', p_d.id, 'decision', 'rejetee', 'version', v_f.version), v_f.entite_id);
    perform private.lever_alerte_module(v_f.client_id, 'filed', 'attention',
      left(format('Facture %s refusée%s', coalesce(v_f.numero, '?'), coalesce(' : ' || left(btrim(p_commentaire), 120), '.')), 200),
      jsonb_build_object('facture', v_f.id, 'demande', p_d.id), 'facture_refusee:' || v_f.id::text, true, null);
    update public.filed_validations set issue = 'rejetee', decide_le = now() where demande_id = p_d.id;
    update public.filed_charges_attendues set statut = 'attendue', facture_id = null, recue_le = null where facture_id = v_f.id and statut = 'recue';
    return 'facture_refusee';
  end if;

  update public.filed_validations set issue = 'expiree', decide_le = now() where demande_id = p_d.id;
  return 'expiree';
end $$;
comment on function private.filed_decider_facture(public.demandes_validation, uuid, text) is
  'Exécute la décision de la file sur une facture : validée (classée, archivée au journal) ou refusée (motif attaché). Celui qui a saisi la pièce ne l''approuve pas.';

create or replace function private.filed_relancer_validations(p_maintenant timestamptz default now())
returns jsonb language plpgsql security definer set search_path to '' as $$
declare r record; n_relances integer := 0; n_remontees integer := 0; v_relance interval; v_remontee interval; v_d uuid;
begin
  for r in
    select v.*, d.cree_le, d.resume, d.approbations_requises, d.roles_autorises, d.equipe_id, f.numero, f.entite_id,
           coalesce(c.delai_relance_jours, 3) as relance_jours, coalesce(c.delai_remontee_jours, 7) as remontee_jours
      from public.filed_validations v
      join public.demandes_validation d on d.id = v.demande_id and d.statut = 'en_attente'
      join public.filed_factures f on f.id = v.facture_id
      left join public.filed_circuits c on c.id = v.circuit_id
     where v.issue is null
     order by d.cree_le
  loop
    v_relance := make_interval(days => r.relance_jours);
    v_remontee := make_interval(days => r.remontee_jours);
    if r.remontee_le is null and r.cree_le + v_remontee <= p_maintenant then
      if r.niveau = 1 then
        update public.demandes_validation set statut = 'annulee' where id = r.demande_id and statut = 'en_attente';
        update public.filed_validations set issue = 'remontee', remontee_le = p_maintenant, decide_le = p_maintenant where id = r.id;
        v_d := private.filed_deposer_validation(r.facture_id, 2);
        perform private.filed_historiser(r.client_id, r.document_id, 'filed_facture', r.facture_id::text, 'remontee',
          format('Sans décision depuis %s jours : la demande remonte à la direction.', r.remontee_jours),
          jsonb_build_object('demande', r.demande_id, 'nouvelle_demande', v_d));
        perform private.lever_alerte_module(r.client_id, 'filed', 'attention',
          left(format('Facture %s : sans décision depuis %s jours, remontée à la direction.', coalesce(r.numero, '?'), r.remontee_jours), 200),
          jsonb_build_object('facture', r.facture_id, 'demande', v_d), 'remontee:' || r.demande_id::text, true, null);
        n_remontees := n_remontees + 1;
      else
        update public.filed_validations set remontee_le = p_maintenant where id = r.id;
        perform private.lever_alerte_module(r.client_id, 'filed', 'critique',
          left(format('Facture %s : la direction n''a pas décidé depuis %s jours.', coalesce(r.numero, '?'), r.remontee_jours), 200),
          jsonb_build_object('facture', r.facture_id, 'demande', r.demande_id), 'direction_silencieuse:' || r.demande_id::text, true, null);
        n_remontees := n_remontees + 1;
      end if;
    elsif r.relance_le is null and r.cree_le + v_relance <= p_maintenant then
      update public.filed_validations set relance_le = p_maintenant where id = r.id;
      perform private.filed_historiser(r.client_id, r.document_id, 'filed_facture', r.facture_id::text, 'relancee',
        format('Approbateur relancé : sans décision depuis %s jours (%s).', r.relance_jours, array_to_string(r.roles_autorises, ', ')),
        jsonb_build_object('demande', r.demande_id));
      perform private.lever_alerte_module(r.client_id, 'filed', 'attention',
        left(format('À décider : %s (en attente depuis %s jours)', r.resume, r.relance_jours), 200),
        jsonb_build_object('facture', r.facture_id, 'demande', r.demande_id, 'roles', to_jsonb(r.roles_autorises), 'equipe', r.equipe_id),
        'relance:' || r.demande_id::text, true, null);
      n_relances := n_relances + 1;
    end if;
  end loop;
  return jsonb_build_object('relances', n_relances, 'remontees', n_remontees);
end $$;
comment on function private.filed_relancer_validations(timestamptz) is
  'Relance l''approbateur silencieux au délai du circuit, puis annule et redépose la demande au niveau direction au délai de remontée.';

create or replace function private.filed_comptabiliser_facture(p_facture uuid, p_motif text default null)
returns void language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_uid uuid; v_n integer; v_a public.filed_archives;
begin
  select * into v_f from public.filed_factures where id = p_facture for update;
  if not found then raise exception 'Facture introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(v_f.client_id, array['gerant', 'admin', 'valideur'], v_f.entite_id);
  if (select auth.uid()) is not null and not private.voit_objet(v_f.client_id, 'filed_document', v_f.document_id::text) then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  if v_f.statut <> 'validee' then raise exception 'Seule une facture validée se comptabilise (ici : %).', v_f.statut using errcode = '55000'; end if;
  select count(*) into v_n from public.filed_imputations i where i.facture_id = v_f.id and i.statut = 'validee';
  if v_n = 0 then raise exception 'Aucune imputation validée : le compte et le centre de coût se posent avant.' using errcode = '55000'; end if;
  v_a := private.filed_archiver(v_f.id);
  update public.filed_factures set statut = 'comptabilisee', maj_le = now() where id = v_f.id;
  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'comptabilisee',
    format('Transmise à la comptabilité avec %s imputation(s)%s.', v_n, coalesce(' (' || left(btrim(p_motif), 200) || ')', '')),
    jsonb_build_object('imputations', v_n, 'archive', v_a.id));
  perform private.filed_journaliser(v_f.client_id, 'filed.comptabilisation', 'filed_facture', v_f.id::text,
    jsonb_build_object('imputations', v_n, 'archive', v_a.id, 'version', v_f.version), v_f.entite_id);
end $$;
create or replace function public.filed_comptabiliser_facture(p_facture uuid, p_motif text default null)
returns void language sql set search_path to '' as $$ select private.filed_comptabiliser_facture(p_facture, p_motif) $$;
comment on function public.filed_comptabiliser_facture(uuid, text) is 'Marque une facture validée comme transmise à la comptabilité : elle porte au moins une imputation validée.';
revoke all on function public.filed_comptabiliser_facture(uuid, text) from public, anon;
grant execute on function public.filed_comptabiliser_facture(uuid, text) to authenticated, service_role;
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261005165200', 'filed_lot4f_circuit_validation', array['-- A4 a4_07, posé par execute_sql']);
select 'a4_07 ok' as r;
