-- FILED, lot 4b — Comptabilité : les portes.
--
-- Ce que ce lot pose :
--   filed_factures.statut              étendu : validee, refusee, comptabilisee (au-delà de a_valider) ;
--   filed_factures_exercices           l'exercice que porte chaque facture, et la mention quand elle est
--                                      reçue après la clôture et orientée vers l'exercice suivant ;
--   exercices                          filed_ouvrir_exercice, filed_cloturer_exercice ;
--   plan comptable et centres          filed_poser_compte, filed_retirer_compte, filed_poser_centre, filed_retirer_centre ;
--   imputation                         filed_imputer_facture (une personne pose compte et centre),
--                                      private.filed_proposer_imputation (le système propose, par la file de validation),
--                                      private.filed_apprendre_imputation (l'apprentissage, fournisseur par fournisseur) ;
--   contrôle                           exercice.cloture, exercice.absent (posés par private.filed_controles_comptables).
--
-- Rien n'entre au plan comptable sans une personne. Une proposition n'est jamais une écriture.
-- Migration idempotente.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Les statuts d'une facture au-delà de la validation
-- ───────────────────────────────────────────────────────────────────────────
-- a_completer, bloquee, a_valider, ecartee (socle) + validee (une personne a approuvé : la pièce est
-- classée, son empreinte est au journal), refusee (rejetée par la file), comptabilisee (transmise à
-- la comptabilité du client, avec ses imputations).
do $$
declare v_nom text;
begin
  select c.conname into v_nom from pg_constraint c
   where c.conrelid = 'public.filed_factures'::regclass and c.contype = 'c'
     and pg_get_constraintdef(c.oid) ilike '%statut%' and pg_get_constraintdef(c.oid) ilike '%a_valider%';
  if v_nom is not null and pg_get_constraintdef((select oid from pg_constraint where conname = v_nom and conrelid = 'public.filed_factures'::regclass)) not ilike '%comptabilisee%' then
    execute format('alter table public.filed_factures drop constraint %I', v_nom);
    execute format('alter table public.filed_factures add constraint %I check (statut in (''a_completer'', ''bloquee'', ''a_valider'', ''ecartee'', ''validee'', ''refusee'', ''comptabilisee''))', v_nom);
  elsif v_nom is null then
    alter table public.filed_factures add constraint filed_factures_statut_check
      check (statut in ('a_completer', 'bloquee', 'a_valider', 'ecartee', 'validee', 'refusee', 'comptabilisee'));
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. L'exercice que porte chaque facture
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.filed_factures_exercices (
  facture_id            uuid primary key references public.filed_factures(id) on delete cascade,
  client_id             uuid not null references public.clients(id) on delete cascade,
  document_id           uuid not null references public.filed_documents(id) on delete cascade,
  -- L'exercice où la date d'émission tombe.
  exercice_naturel_id   uuid references public.filed_exercices(id) on delete set null,
  -- L'exercice retenu : le naturel, ou le suivant quand la pièce est reçue après la clôture.
  exercice_id           uuid references public.filed_exercices(id) on delete set null,
  orientee              boolean not null default false,
  mention               text,
  maj_le                timestamptz not null default now()
);
comment on table public.filed_factures_exercices is
  'L''exercice comptable que porte chaque facture : celui de sa date d''émission, ou le suivant quand la pièce est reçue après la clôture, avec la mention qui le dit.';
create index if not exists filed_factures_exercices_exercice on public.filed_factures_exercices (exercice_id);
alter table public.filed_factures_exercices enable row level security;
drop policy if exists filed_factures_exercices_lecture on public.filed_factures_exercices;
create policy filed_factures_exercices_lecture on public.filed_factures_exercices for select to authenticated
  using (exists (select 1 from public.filed_documents d where d.id = document_id));
revoke insert, update, delete on public.filed_factures_exercices from anon, authenticated;
grant select on public.filed_factures_exercices to authenticated;

insert into private.tables_locataires (nom, ordre_effacement, note) values ('filed_factures_exercices', 2, 'FILED, lot 4')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;
insert into private.tables_objets (nom, objet_type, colonne, ordre_effacement) values ('filed_factures_exercices', 'filed_document', 'document_id', 5)
on conflict (nom) do update set objet_type = excluded.objet_type, colonne = excluded.colonne, ordre_effacement = excluded.ordre_effacement;

-- L'exercice qui contient une date : celui de la société d'abord, celui de l'organisation sinon.
create or replace function private.filed_exercice_pour(p_client uuid, p_entite uuid, p_date date)
returns public.filed_exercices language sql stable set search_path to '' as $$
  select e.* from public.filed_exercices e
   where e.client_id = p_client and (e.entite_id = p_entite or e.entite_id is null)
     and p_date between e.debut and e.fin
   order by (e.entite_id is not null) desc limit 1
$$;

-- L'exercice qui suit un exercice (même périmètre) ; créé s'il n'existe pas, de la même durée.
create or replace function private.filed_exercice_suivant(p_exercice public.filed_exercices)
returns public.filed_exercices language plpgsql security definer set search_path to '' as $$
declare v_s public.filed_exercices; v_debut date; v_fin date;
begin
  select e.* into v_s from public.filed_exercices e
   where e.client_id = p_exercice.client_id and e.entite_id is not distinct from p_exercice.entite_id
     and e.debut = p_exercice.fin + 1 limit 1;
  if found then return v_s; end if;
  v_debut := p_exercice.fin + 1;
  v_fin := (p_exercice.fin + (p_exercice.fin - p_exercice.debut + 1))::date;
  -- Un exercice civil ou à cheval garde sa longueur ; on recale sur une fin de mois.
  v_fin := (date_trunc('month', v_fin::timestamp) + interval '1 month' - interval '1 day')::date;
  insert into public.filed_exercices (client_id, entite_id, libelle, debut, fin)
  values (p_exercice.client_id, p_exercice.entite_id,
          format('Exercice %s', to_char(v_debut, 'YYYY') || case when extract(year from v_fin) <> extract(year from v_debut) then '-' || to_char(v_fin, 'YYYY') else '' end),
          v_debut, v_fin)
  returning * into v_s;
  perform private.filed_journaliser(p_exercice.client_id, 'filed.exercice.ouverture', 'filed_exercice', v_s.id::text,
    jsonb_build_object('debut', v_s.debut, 'fin', v_s.fin, 'origine', 'suite'), p_exercice.entite_id);
  return v_s;
end $$;

-- Affecte son exercice à une facture : le naturel, ou le suivant si reçue après la clôture.
-- Rend la ligne écrite (nulle si l'organisation n'a aucun exercice).
create or replace function private.filed_orienter_exercice(p_f public.filed_factures)
returns public.filed_factures_exercices language plpgsql security definer set search_path to '' as $$
declare v_nat public.filed_exercices; v_ret public.filed_exercices; v_mention text; v_orientee boolean := false; v_r public.filed_factures_exercices;
begin
  if p_f.date_emission is null then return null; end if;
  v_nat := private.filed_exercice_pour(p_f.client_id, p_f.entite_id, p_f.date_emission);
  if v_nat.id is null then
    delete from public.filed_factures_exercices where facture_id = p_f.id;
    return null;
  end if;
  v_ret := v_nat;
  if v_nat.cloture_le is not null and p_f.date_reception > v_nat.cloture_le then
    v_ret := private.filed_exercice_suivant(v_nat);
    v_orientee := true;
    v_mention := format('Pièce du %s reçue le %s, après la clôture de l''exercice %s (clos le %s) : orientée vers l''exercice %s.',
      to_char(p_f.date_emission, 'DD/MM/YYYY'), to_char(p_f.date_reception, 'DD/MM/YYYY'), v_nat.libelle,
      to_char(v_nat.cloture_le, 'DD/MM/YYYY'), v_ret.libelle);
  end if;
  insert into public.filed_factures_exercices (facture_id, client_id, document_id, exercice_naturel_id, exercice_id, orientee, mention)
  values (p_f.id, p_f.client_id, p_f.document_id, v_nat.id, v_ret.id, v_orientee, v_mention)
  on conflict (facture_id) do update
    set exercice_naturel_id = excluded.exercice_naturel_id, exercice_id = excluded.exercice_id,
        orientee = excluded.orientee, mention = excluded.mention, maj_le = now()
  returning * into v_r;
  return v_r;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Portes des exercices
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_ouvrir_exercice(p_client uuid, p_entite uuid, p_debut date, p_fin date, p_libelle text default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_id uuid; v_libelle text;
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin'], p_entite);
  if p_debut is null or p_fin is null or p_fin < p_debut or p_fin - p_debut > 730 then
    raise exception 'Un exercice va d''une date à une date, deux ans au plus.' using errcode = '22023';
  end if;
  if exists (select 1 from public.filed_exercices e where e.client_id = p_client and e.entite_id is not distinct from p_entite
             and daterange(e.debut, e.fin, '[]') && daterange(p_debut, p_fin, '[]')) then
    raise exception 'Un exercice chevauche déjà ces dates.' using errcode = '23P01';
  end if;
  v_libelle := coalesce(nullif(btrim(p_libelle), ''),
    format('Exercice %s', to_char(p_debut, 'YYYY') || case when extract(year from p_fin) <> extract(year from p_debut) then '-' || to_char(p_fin, 'YYYY') else '' end));
  insert into public.filed_exercices (client_id, entite_id, libelle, debut, fin)
  values (p_client, p_entite, left(v_libelle, 80), p_debut, p_fin) returning id into v_id;
  perform private.filed_journaliser(p_client, 'filed.exercice.ouverture', 'filed_exercice', v_id::text,
    jsonb_build_object('debut', p_debut, 'fin', p_fin, 'origine', 'personne'), p_entite);
  return v_id;
end $$;

create or replace function public.filed_ouvrir_exercice(p_client uuid, p_entite uuid, p_debut date, p_fin date, p_libelle text default null)
returns uuid language sql set search_path to '' as $$ select private.filed_ouvrir_exercice(p_client, p_entite, p_debut, p_fin, p_libelle) $$;
comment on function public.filed_ouvrir_exercice(uuid, uuid, date, date, text) is 'Ouvre un exercice comptable pour l''organisation (entité nulle) ou une société. Gérant ou admin.';
revoke all on function public.filed_ouvrir_exercice(uuid, uuid, date, date, text) from public, anon;
grant execute on function public.filed_ouvrir_exercice(uuid, uuid, date, date, text) to authenticated, service_role;

-- Clore : à partir de cette date, une pièce reçue est orientée vers l'exercice suivant.
-- Les factures non décidées, reçues après la clôture, sont recontrôlées pour recevoir leur mention.
create or replace function private.filed_cloturer_exercice(p_exercice uuid, p_cloture_le date, p_motif text default null)
returns integer language plpgsql security definer set search_path to '' as $$
declare v_e public.filed_exercices; v_uid uuid; v_n integer := 0; v_f record;
begin
  select * into v_e from public.filed_exercices where id = p_exercice for update;
  if not found then raise exception 'Exercice introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(v_e.client_id, array['gerant', 'admin'], v_e.entite_id);
  if v_e.statut = 'cloture' then raise exception 'Cet exercice est déjà clos (le %).', to_char(v_e.cloture_le, 'DD/MM/YYYY') using errcode = '55000'; end if;
  if p_cloture_le is null or p_cloture_le < v_e.fin then
    raise exception 'La clôture se pose à la fin de l''exercice ou après (%).', to_char(v_e.fin, 'DD/MM/YYYY') using errcode = '22023';
  end if;
  update public.filed_exercices set statut = 'cloture', cloture_le = p_cloture_le, cloture_par = v_uid where id = p_exercice;
  perform private.filed_journaliser(v_e.client_id, 'filed.exercice.cloture', 'filed_exercice', v_e.id::text,
    jsonb_build_object('debut', v_e.debut, 'fin', v_e.fin, 'cloture_le', p_cloture_le, 'motif', left(nullif(btrim(p_motif), ''), 300)), v_e.entite_id);
  for v_f in
    select f.id from public.filed_factures f
     where f.client_id = v_e.client_id and (v_e.entite_id is null or f.entite_id = v_e.entite_id)
       and f.statut in ('a_completer', 'bloquee', 'a_valider')
       and f.date_emission between v_e.debut and v_e.fin and f.date_reception > p_cloture_le
  loop
    perform private.filed_controler_facture(v_f.id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

create or replace function public.filed_cloturer_exercice(p_exercice uuid, p_cloture_le date, p_motif text default null)
returns integer language sql set search_path to '' as $$ select private.filed_cloturer_exercice(p_exercice, p_cloture_le, p_motif) $$;
comment on function public.filed_cloturer_exercice(uuid, date, text) is 'Clôt un exercice à une date : les pièces reçues après sont orientées vers l''exercice suivant. Rend le nombre de factures en cours recontrôlées.';
revoke all on function public.filed_cloturer_exercice(uuid, date, text) from public, anon;
grant execute on function public.filed_cloturer_exercice(uuid, date, text) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Portes du plan comptable et des centres de coût
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_poser_compte(p_client uuid, p_entite uuid, p_numero text, p_libelle text, p_nature text default 'charge', p_tva_deductible boolean default true)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_id uuid; v_numero text := regexp_replace(coalesce(p_numero, ''), '[^0-9]', '', 'g');
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin'], p_entite);
  if v_numero !~ '^[0-9]{3,12}$' then raise exception 'Un numéro de compte fait de 3 à 12 chiffres.' using errcode = '22023'; end if;
  if nullif(btrim(p_libelle), '') is null then raise exception 'Un compte porte un libellé.' using errcode = '22023'; end if;
  insert into public.filed_plan_comptable (client_id, entite_id, numero, libelle, nature, tva_deductible, source)
  values (p_client, p_entite, v_numero, left(btrim(p_libelle), 200), coalesce(p_nature, 'charge'), coalesce(p_tva_deductible, true), 'saisie')
  on conflict (client_id, coalesce(entite_id, '00000000-0000-0000-0000-000000000000'::uuid), numero) do update
    set libelle = excluded.libelle, nature = excluded.nature, tva_deductible = excluded.tva_deductible, actif = true, maj_le = now()
  returning id into v_id;
  perform private.filed_journaliser(p_client, 'filed.plan_comptable.compte', 'filed_plan_comptable', v_id::text,
    jsonb_build_object('numero', v_numero, 'nature', coalesce(p_nature, 'charge')), p_entite);
  return v_id;
end $$;

create or replace function public.filed_poser_compte(p_client uuid, p_entite uuid, p_numero text, p_libelle text, p_nature text default 'charge', p_tva_deductible boolean default true)
returns uuid language sql set search_path to '' as $$ select private.filed_poser_compte(p_client, p_entite, p_numero, p_libelle, p_nature, p_tva_deductible) $$;
comment on function public.filed_poser_compte(uuid, uuid, text, text, text, boolean) is 'Pose ou met à jour un compte du plan comptable du client. Gérant ou admin.';
revoke all on function public.filed_poser_compte(uuid, uuid, text, text, text, boolean) from public, anon;
grant execute on function public.filed_poser_compte(uuid, uuid, text, text, text, boolean) to authenticated, service_role;

create or replace function private.filed_retirer_compte(p_compte uuid, p_motif text default null)
returns void language plpgsql security definer set search_path to '' as $$
declare v_c public.filed_plan_comptable;
begin
  select * into v_c from public.filed_plan_comptable where id = p_compte for update;
  if not found then raise exception 'Compte introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(v_c.client_id, array['gerant', 'admin'], v_c.entite_id);
  update public.filed_plan_comptable set actif = false where id = p_compte;
  perform private.filed_journaliser(v_c.client_id, 'filed.plan_comptable.retrait', 'filed_plan_comptable', v_c.id::text,
    jsonb_build_object('numero', v_c.numero, 'motif', left(nullif(btrim(p_motif), ''), 300)), v_c.entite_id);
end $$;

create or replace function public.filed_retirer_compte(p_compte uuid, p_motif text default null)
returns void language sql set search_path to '' as $$ select private.filed_retirer_compte(p_compte, p_motif) $$;
comment on function public.filed_retirer_compte(uuid, text) is 'Retire un compte du plan comptable (il reste lisible, les imputations passées le gardent).';
revoke all on function public.filed_retirer_compte(uuid, text) from public, anon;
grant execute on function public.filed_retirer_compte(uuid, text) to authenticated, service_role;

create or replace function private.filed_poser_centre(p_client uuid, p_entite uuid, p_code text, p_libelle text, p_parent uuid default null, p_responsable uuid default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_id uuid; v_code text := upper(btrim(coalesce(p_code, '')));
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin'], p_entite);
  if v_code !~ '^[A-Z0-9._-]{1,32}$' then raise exception 'Un code de centre fait de 1 à 32 lettres, chiffres, points ou tirets.' using errcode = '22023'; end if;
  if nullif(btrim(p_libelle), '') is null then raise exception 'Un centre de coût porte un libellé.' using errcode = '22023'; end if;
  if p_parent is not null and not exists (select 1 from public.filed_centres_cout c where c.id = p_parent and c.client_id = p_client) then
    raise exception 'Le centre parent n''est pas à cette organisation.' using errcode = '22023';
  end if;
  insert into public.filed_centres_cout (client_id, entite_id, code, libelle, parent_id, responsable)
  values (p_client, p_entite, v_code, left(btrim(p_libelle), 200), p_parent, p_responsable)
  on conflict (client_id, coalesce(entite_id, '00000000-0000-0000-0000-000000000000'::uuid), code) do update
    set libelle = excluded.libelle, parent_id = excluded.parent_id, responsable = excluded.responsable, actif = true, maj_le = now()
  returning id into v_id;
  perform private.filed_journaliser(p_client, 'filed.centre_cout.pose', 'filed_centre_cout', v_id::text, jsonb_build_object('code', v_code), p_entite);
  return v_id;
end $$;

create or replace function public.filed_poser_centre(p_client uuid, p_entite uuid, p_code text, p_libelle text, p_parent uuid default null, p_responsable uuid default null)
returns uuid language sql set search_path to '' as $$ select private.filed_poser_centre(p_client, p_entite, p_code, p_libelle, p_parent, p_responsable) $$;
comment on function public.filed_poser_centre(uuid, uuid, text, text, uuid, uuid) is 'Pose ou met à jour un centre de coût. Gérant ou admin.';
revoke all on function public.filed_poser_centre(uuid, uuid, text, text, uuid, uuid) from public, anon;
grant execute on function public.filed_poser_centre(uuid, uuid, text, text, uuid, uuid) to authenticated, service_role;

create or replace function private.filed_retirer_centre(p_centre uuid, p_motif text default null)
returns void language plpgsql security definer set search_path to '' as $$
declare v_c public.filed_centres_cout;
begin
  select * into v_c from public.filed_centres_cout where id = p_centre for update;
  if not found then raise exception 'Centre introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(v_c.client_id, array['gerant', 'admin'], v_c.entite_id);
  update public.filed_centres_cout set actif = false where id = p_centre;
  perform private.filed_journaliser(v_c.client_id, 'filed.centre_cout.retrait', 'filed_centre_cout', v_c.id::text,
    jsonb_build_object('code', v_c.code, 'motif', left(nullif(btrim(p_motif), ''), 300)), v_c.entite_id);
end $$;

create or replace function public.filed_retirer_centre(p_centre uuid, p_motif text default null)
returns void language sql set search_path to '' as $$ select private.filed_retirer_centre(p_centre, p_motif) $$;
comment on function public.filed_retirer_centre(uuid, text) is 'Retire un centre de coût (il reste lisible, les imputations passées le gardent).';
revoke all on function public.filed_retirer_centre(uuid, text) from public, anon;
grant execute on function public.filed_retirer_centre(uuid, text) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. L'apprentissage : ce que les écritures validées enseignent
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_apprendre_imputation(p_client uuid, p_fournisseur uuid, p_compte uuid, p_centre uuid, p_validee boolean, p_facture uuid)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if p_fournisseur is null or p_compte is null then return; end if;
  insert into public.filed_imputations_apprises (client_id, fournisseur_id, compte_id, centre_id, nb_validees, nb_refusees, derniere_le, derniere_facture)
  values (p_client, p_fournisseur, p_compte, p_centre, case when p_validee then 1 else 0 end, case when p_validee then 0 else 1 end, now(), p_facture)
  on conflict (fournisseur_id, compte_id, coalesce(centre_id, '00000000-0000-0000-0000-000000000000'::uuid)) do update
    set nb_validees = public.filed_imputations_apprises.nb_validees + (case when p_validee then 1 else 0 end),
        nb_refusees = public.filed_imputations_apprises.nb_refusees + (case when p_validee then 0 else 1 end),
        derniere_le = now(), derniere_facture = p_facture, maj_le = now();
end $$;

-- La meilleure imputation apprise pour un fournisseur : compte, centre, confiance (0..1), nombre d'écritures.
create or replace function private.filed_imputation_apprise(p_client uuid, p_fournisseur uuid)
returns table (compte_id uuid, centre_id uuid, confiance numeric, nb integer)
language sql stable set search_path to '' as $$
  with t as (
    select a.compte_id, a.centre_id, a.nb_validees, a.nb_refusees,
           sum(a.nb_validees) over () as total
      from public.filed_imputations_apprises a
      join public.filed_plan_comptable c on c.id = a.compte_id and c.actif
      left join public.filed_centres_cout k on k.id = a.centre_id
     where a.client_id = p_client and a.fournisseur_id = p_fournisseur and a.nb_validees > 0
       and (a.centre_id is null or k.actif)
  )
  select t.compte_id, t.centre_id,
         round((t.nb_validees::numeric / nullif(t.total, 0)) * (t.nb_validees::numeric / (t.nb_validees + t.nb_refusees)), 4),
         t.nb_validees::integer
    from t
   order by (t.nb_validees - t.nb_refusees) desc, t.nb_validees desc
   limit 1
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Une personne impute une facture (compte et centre, ligne par ligne)
-- ───────────────────────────────────────────────────────────────────────────
-- p_lignes : [{"compte": uuid | "numero": "6061", "centre": uuid | "code": "ATELIER", "montant_ht": 120.00, "libelle": "…"}, …]
-- La somme des lignes doit retrouver le hors taxes de la facture (à la tolérance des totaux près).
-- Les propositions en cours sont tranchées : confirmée si une ligne identique est posée, refusée sinon.
create or replace function private.filed_imputer_facture(p_facture uuid, p_lignes jsonb, p_motif text default null)
returns integer language plpgsql security definer set search_path to '' as $$
declare
  v_f public.filed_factures; v_uid uuid; v_l jsonb; v_rang int := 0; v_compte uuid; v_centre uuid; v_montant numeric;
  v_somme numeric := 0; v_tol numeric; v_exo public.filed_factures_exercices; v_p record; v_meme boolean;
begin
  select * into v_f from public.filed_factures where id = p_facture for update;
  if not found then raise exception 'Facture introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(v_f.client_id, array['gerant', 'admin', 'valideur'], v_f.entite_id);
  if (select auth.uid()) is not null and not private.voit_objet(v_f.client_id, 'filed_document', v_f.document_id::text) then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  if v_f.statut not in ('a_valider', 'validee') then
    raise exception 'Une facture s''impute quand elle est à valider ou validée (ici : %).', v_f.statut using errcode = '55000';
  end if;
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' or jsonb_array_length(p_lignes) = 0 then
    raise exception 'Au moins une ligne d''imputation.' using errcode = '22023';
  end if;
  v_tol := coalesce((private.filed_reglage(v_f.client_id, v_f.entite_id)).tolerance_totaux, 0.05);
  v_exo := private.filed_orienter_exercice(v_f);

  -- Les propositions en cours sont tranchées par ce que la personne pose.
  for v_p in select * from public.filed_imputations i where i.facture_id = v_f.id and i.statut = 'proposee' loop
    select exists (
      select 1 from jsonb_array_elements(p_lignes) l
       where coalesce((l->>'compte')::uuid, (select c.id from public.filed_plan_comptable c where c.client_id = v_f.client_id and c.numero = l->>'numero' and (c.entite_id = v_f.entite_id or c.entite_id is null) order by (c.entite_id is not null) desc limit 1)) = v_p.compte_id
         and coalesce((l->>'centre')::uuid, (select k.id from public.filed_centres_cout k where k.client_id = v_f.client_id and k.code = upper(l->>'code') and (k.entite_id = v_f.entite_id or k.entite_id is null) order by (k.entite_id is not null) desc limit 1)) is not distinct from v_p.centre_id
    ) into v_meme;
    perform private.filed_apprendre_imputation(v_f.client_id, v_f.fournisseur_id, v_p.compte_id, v_p.centre_id, v_meme, v_f.id);
    update public.filed_imputations set statut = case when v_meme then 'validee' else 'refusee' end, decide_le = now(), decide_par = v_uid,
      motif = case when v_meme then 'Confirmée par l''imputation posée' else 'Remplacée par l''imputation posée' end where id = v_p.id;
    if v_p.demande_id is not null then
      perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'imputation_tranchee',
        format('Proposition d''imputation %s par une imputation posée à la main.', case when v_meme then 'confirmée' else 'remplacée' end),
        jsonb_build_object('imputation', v_p.id, 'demande', v_p.demande_id));
    end if;
  end loop;
  -- Les lignes posées à la main occupent les rangs 1 à 100 ; les propositions tranchées restent, aux rangs 101 et plus.
  delete from public.filed_imputations where facture_id = v_f.id and statut in ('validee', 'refusee') and origine = 'saisie';

  for v_l in select * from jsonb_array_elements(p_lignes) loop
    v_rang := v_rang + 1;
    v_compte := coalesce((v_l->>'compte')::uuid,
      (select c.id from public.filed_plan_comptable c where c.client_id = v_f.client_id and c.numero = v_l->>'numero'
         and (c.entite_id = v_f.entite_id or c.entite_id is null) order by (c.entite_id is not null) desc limit 1));
    if v_compte is null or not exists (select 1 from public.filed_plan_comptable c where c.id = v_compte and c.client_id = v_f.client_id and c.actif) then
      raise exception 'Ligne % : compte inconnu ou retiré.', v_rang using errcode = '22023';
    end if;
    v_centre := coalesce((v_l->>'centre')::uuid,
      (select k.id from public.filed_centres_cout k where k.client_id = v_f.client_id and k.code = upper(v_l->>'code')
         and (k.entite_id = v_f.entite_id or k.entite_id is null) order by (k.entite_id is not null) desc limit 1));
    if v_l ? 'centre' or v_l ? 'code' then
      if v_centre is null or not exists (select 1 from public.filed_centres_cout k where k.id = v_centre and k.client_id = v_f.client_id and k.actif) then
        raise exception 'Ligne % : centre de coût inconnu ou retiré.', v_rang using errcode = '22023';
      end if;
    end if;
    v_montant := coalesce((v_l->>'montant_ht')::numeric, case when jsonb_array_length(p_lignes) = 1 then v_f.montant_ht end);
    if v_montant is null or v_montant = 0 then raise exception 'Ligne % : montant hors taxes manquant ou nul.', v_rang using errcode = '22023'; end if;
    v_somme := v_somme + v_montant;
    insert into public.filed_imputations (client_id, facture_id, document_id, rang, compte_id, centre_id, exercice_id, montant_ht, libelle, statut, origine, mention, decide_le, decide_par, motif)
    values (v_f.client_id, v_f.id, v_f.document_id, v_rang, v_compte, v_centre, v_exo.exercice_id, round(v_montant, 2), left(v_l->>'libelle', 200),
            'validee', 'saisie', v_exo.mention, now(), v_uid, left(nullif(btrim(p_motif), ''), 300));
    perform private.filed_apprendre_imputation(v_f.client_id, v_f.fournisseur_id, v_compte, v_centre, true, v_f.id);
  end loop;

  if v_f.montant_ht is not null and abs(v_somme - v_f.montant_ht) > v_tol then
    raise exception 'Les lignes font % HT, la facture %.', v_somme, v_f.montant_ht using errcode = '22023';
  end if;

  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'imputee',
    format('Imputée par une personne : %s ligne(s)%s.', v_rang, coalesce(' (' || nullif(btrim(p_motif), '') || ')', '')),
    jsonb_build_object('lignes', v_rang, 'montant_ht', v_somme, 'exercice', v_exo.exercice_id));
  perform private.filed_journaliser(v_f.client_id, 'filed.imputation', 'filed_facture', v_f.id::text,
    jsonb_build_object('lignes', v_rang, 'origine', 'saisie', 'exercice', v_exo.exercice_id, 'orientee', coalesce(v_exo.orientee, false)), v_f.entite_id);
  return v_rang;
end $$;

create or replace function public.filed_imputer_facture(p_facture uuid, p_lignes jsonb, p_motif text default null)
returns integer language sql set search_path to '' as $$ select private.filed_imputer_facture(p_facture, p_lignes, p_motif) $$;
comment on function public.filed_imputer_facture(uuid, jsonb, text) is
  'Une personne pose le compte et le centre de coût d''une facture, ligne par ligne. Les propositions en cours sont tranchées ; l''apprentissage retient ce qui est posé.';
revoke all on function public.filed_imputer_facture(uuid, jsonb, text) from public, anon;
grant execute on function public.filed_imputer_facture(uuid, jsonb, text) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 7. Le système propose : imputation apprise, soumise à la file de validation
-- ───────────────────────────────────────────────────────────────────────────
-- Appelée au contrôle d'une facture à valider : s'il n'y a ni imputation ni proposition en cours,
-- et qu'une imputation a été apprise pour ce fournisseur, elle est proposée (statut proposee) et une
-- demande « filed.imputer » part dans la file. Jamais une écriture.
create or replace function private.filed_proposer_imputation(p_facture uuid, p_origine text default 'apprise', p_compte uuid default null, p_centre uuid default null, p_libelle text default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_a record; v_id uuid; v_exo public.filed_factures_exercices; v_demande uuid; v_compte_num text; v_centre_code text; v_four text;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found or v_f.statut not in ('a_valider', 'validee') or v_f.montant_ht is null or v_f.montant_ht = 0 then return null; end if;
  if exists (select 1 from public.filed_imputations i where i.facture_id = v_f.id and i.statut in ('proposee', 'validee')) then return null; end if;

  if p_origine = 'apprise' then
    if v_f.fournisseur_id is null then return null; end if;
    select * into v_a from private.filed_imputation_apprise(v_f.client_id, v_f.fournisseur_id);
    if v_a.compte_id is null then return null; end if;
  else
    select p_compte as compte_id, p_centre as centre_id, 1::numeric as confiance, 0 as nb into v_a;
    if not exists (select 1 from public.filed_plan_comptable c where c.id = v_a.compte_id and c.client_id = v_f.client_id and c.actif) then return null; end if;
  end if;

  v_exo := private.filed_orienter_exercice(v_f);
  select c.numero into v_compte_num from public.filed_plan_comptable c where c.id = v_a.compte_id;
  select k.code into v_centre_code from public.filed_centres_cout k where k.id = v_a.centre_id;
  select f.nom into v_four from public.filed_fournisseurs f where f.id = v_f.fournisseur_id;

  insert into public.filed_imputations (client_id, facture_id, document_id, rang, compte_id, centre_id, exercice_id, montant_ht, libelle, statut, origine, confiance, mention)
  values (v_f.client_id, v_f.id, v_f.document_id,
          (select coalesce(max(i.rang), 100) + 1 from public.filed_imputations i where i.facture_id = v_f.id and i.rang > 100),
          v_a.compte_id, v_a.centre_id, v_exo.exercice_id, v_f.montant_ht, left(p_libelle, 200), 'proposee', p_origine, v_a.confiance, v_exo.mention)
  returning id into v_id;

  v_demande := private.filed_deposer_demande(
    v_f.client_id, v_f.entite_id, 'filed.imputer', 'filed_facture', v_f.id::text,
    left(format('Imputer la facture %s de %s : compte %s%s (%s%s)', coalesce(v_f.numero, '?'), coalesce(v_four, 'fournisseur inconnu'), v_compte_num,
      coalesce(', centre ' || v_centre_code, ''),
      case when p_origine = 'apprise' then format('apprise sur %s écriture(s), confiance %s %%', v_a.nb, round(v_a.confiance * 100)) else 'charge récurrente' end,
      coalesce(' ; ' || v_exo.mention, '')), 500),
    abs(v_f.montant_ht),
    jsonb_build_object('facture', v_f.id, 'imputation', v_id, 'compte', v_a.compte_id, 'centre', v_a.centre_id, 'origine', p_origine, 'confiance', v_a.confiance),
    'filed.imputer:' || v_id::text);
  update public.filed_imputations set demande_id = v_demande where id = v_id;

  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'imputation_proposee',
    format('Imputation proposée (%s) : compte %s%s, à valider.', case when p_origine = 'apprise' then 'apprise' else 'charge récurrente' end, v_compte_num, coalesce(', centre ' || v_centre_code, '')),
    jsonb_build_object('imputation', v_id, 'demande', v_demande, 'origine', p_origine, 'confiance', v_a.confiance));
  return v_id;
end $$;

-- Exécution de la décision « filed.imputer » (branchée dans private.filed_executer_decision au lot 4e).
create or replace function private.filed_decider_imputation(p_demande public.demandes_validation)
returns text language plpgsql security definer set search_path to '' as $$
declare v_i public.filed_imputations; v_f public.filed_factures; v_ok boolean;
begin
  select * into v_i from public.filed_imputations where id = (p_demande.payload->>'imputation')::uuid for update;
  if not found then return 'imputation introuvable'; end if;
  if v_i.statut <> 'proposee' then return 'déjà tranchée : ' || v_i.statut; end if;
  select * into v_f from public.filed_factures where id = v_i.facture_id;
  v_ok := p_demande.statut = 'approuvee';
  update public.filed_imputations set statut = case when v_ok then 'validee' else 'refusee' end, decide_le = now(),
    decide_par = (select a.decideur_id from public.approbations a where a.demande_id = p_demande.id order by a.cree_le desc limit 1),
    motif = case when v_ok then 'Approuvée par la file' else 'Rejetée par la file' end
  where id = v_i.id;
  perform private.filed_apprendre_imputation(v_f.client_id, v_f.fournisseur_id, v_i.compte_id, v_i.centre_id, v_ok, v_f.id);
  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text,
    case when v_ok then 'imputation_validee' else 'imputation_refusee' end,
    case when v_ok then 'Imputation proposée approuvée.' else 'Imputation proposée rejetée : elle ne sera plus proposée en premier.' end,
    jsonb_build_object('imputation', v_i.id, 'demande', p_demande.id));
  perform private.filed_journaliser(v_f.client_id, 'filed.imputation', 'filed_facture', v_f.id::text,
    jsonb_build_object('imputation', v_i.id, 'origine', v_i.origine, 'decision', p_demande.statut), v_f.entite_id);
  return case when v_ok then 'imputation validée' else 'imputation refusée' end;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 8. Contrôles comptables : exercice et clôture (posés avec les autres contrôles)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_controles_comptables(p_facture uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_exo public.filed_factures_exercices; v_e public.filed_exercices;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found then return; end if;
  v_exo := private.filed_orienter_exercice(v_f);
  if v_exo.facture_id is null then
    if exists (select 1 from public.filed_exercices e where e.client_id = v_f.client_id) then
      perform private.filed_poser_resultat(v_f, 'exercice.absent', 'attention', true,
        'Aucun exercice ne couvre la date d''émission : à ouvrir avant de comptabiliser.', null,
        jsonb_build_object('date_emission', v_f.date_emission), coalesce(v_f.date_emission::text, ''));
    else
      perform private.filed_poser_resultat(v_f, 'exercice.absent', 'info', false,
        'Aucun exercice réglé pour cette organisation : la pièce n''est pas orientée.', null, '{}'::jsonb, '');
    end if;
    return;
  end if;
  select * into v_e from public.filed_exercices where id = v_exo.exercice_id;
  perform private.filed_poser_resultat(v_f, 'exercice.cloture', 'attention', v_exo.orientee,
    case when v_exo.orientee then v_exo.mention else format('Exercice %s (du %s au %s).', v_e.libelle, to_char(v_e.debut, 'DD/MM/YYYY'), to_char(v_e.fin, 'DD/MM/YYYY')) end,
    null,
    jsonb_build_object('exercice', v_exo.exercice_id, 'exercice_naturel', v_exo.exercice_naturel_id, 'orientee', v_exo.orientee, 'date_reception', v_f.date_reception),
    v_exo.exercice_id::text);
end $$;
comment on function private.filed_controles_comptables(uuid) is
  'Oriente la facture vers son exercice (le suivant si reçue après la clôture) et pose les contrôles exercice.*. Appelée par private.filed_controler_facture.';
