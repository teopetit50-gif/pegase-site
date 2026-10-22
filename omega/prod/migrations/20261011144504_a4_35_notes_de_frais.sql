-- 20261011144504 a4_35_notes_de_frais
-- Source : dépôt : e8e960f omega/migrations/a4_35_filed_lot27_notes_de_frais.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_35_filed_lot27_notes_de_frais.sql @ e8e960f ; a4_28 cité comme test : ignoré ; b5_16 cité comme test : ignoré.
-- ═══ omega/migrations/a4_35_filed_lot27_notes_de_frais.sql @ e8e960f
-- FILED, lot 27 (a4_35) — la note de frais : une dépense avancée par un salarié, remboursée à lui.
--
-- Promesse du site (lib/produits/factures.ts:78, « Note de frais ») ; chiffrage n° 13. Une note de frais est une
-- pièce comme les autres (ticket, facture de restaurant, de péage…), lue, contrôlée, imputée et approuvée par le
-- même circuit ; ce qui change, c'est à qui l'on doit l'argent. Ce lot pose :
--   filed_notes_frais                 la pièce déclarée « avancée par » une personne de l'organisation (le
--                                     bénéficiaire), son statut (a_rembourser, remboursee, refusee) ;
--   public.filed_declarer_note_frais  un membre la déclare pour lui-même ; gérant, admin ou valideur pour un autre ;
--   la garde d'approbation            le bénéficiaire n'approuve pas sa propre note (la facture ne passe pas
--                                     « validee » de sa main) ;
--   l'écriture                        à la comptabilisation, la dette va au compte du personnel (421 par défaut,
--                                     réglable : filed_regler_compte_notes_frais) au nom du bénéficiaire (compte
--                                     auxiliaire NDF…), pas au fournisseur (401) ; de même pour le remboursement.
--                                     Les écrivains d'a4_27 ne sont pas réécrits : un déclencheur avant insertion
--                                     sur filed_ecritures change le compte de tiers des seules lignes de la note ;
--                                     le lettrage (texte d'a4_17) suit le compte de tiers de la facture ;
--   public.filed_rembourser_note_frais  le remboursement (filed_marquer_reglee), et la note passe « remboursee »
--                                     quand le reste est nul — y compris quand c'est le relevé (a4_34) qui le voit.
-- Migration idempotente ; aucune suppression.

create table if not exists public.filed_notes_frais (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  entite_id       uuid references public.entites(id) on delete cascade,
  facture_id      uuid not null references public.filed_factures(id) on delete cascade,
  document_id     uuid not null references public.filed_documents(id) on delete cascade,
  beneficiaire    uuid not null,
  beneficiaire_nom text not null check (char_length(btrim(beneficiaire_nom)) between 1 and 120),
  -- Le code du compte auxiliaire du bénéficiaire : NDF + 6 caractères stables.
  code_tiers      text not null,
  motif           text,
  statut          text not null default 'a_rembourser' check (statut in ('a_rembourser', 'remboursee', 'refusee')),
  declaree_par    uuid,
  declaree_le     timestamptz not null default now(),
  remboursee_le   date,
  maj_le          timestamptz not null default now()
);
comment on table public.filed_notes_frais is
  'Lot 27 (a4_35) : les pièces avancées par une personne de l''organisation. La dette va au compte du personnel, au nom du bénéficiaire, et se rembourse à lui.';
create unique index if not exists filed_notes_frais_facture on public.filed_notes_frais (facture_id);
create index if not exists filed_notes_frais_beneficiaire on public.filed_notes_frais (client_id, beneficiaire, statut);
alter table public.filed_notes_frais enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_notes_frais' and policyname = 'filed_notes_frais_lecture') then
    execute 'create policy filed_notes_frais_lecture on public.filed_notes_frais for select to authenticated using (exists (select 1 from public.filed_documents d where d.id = document_id) or beneficiaire = (select auth.uid()))';
  end if;
end $$;
revoke all on table public.filed_notes_frais from anon, authenticated;
grant select on public.filed_notes_frais to authenticated;

create table if not exists public.filed_notes_frais_compte (
  client_id  uuid primary key references public.clients(id) on delete cascade,
  numero     text not null check (numero ~ '^[0-9]{3,12}$'),
  libelle    text not null check (char_length(btrim(libelle)) between 1 and 200),
  maj_le     timestamptz not null default now()
);
comment on table public.filed_notes_frais_compte is 'Lot 27 (a4_35) : le compte où vont les notes de frais d''une organisation (421 par défaut).';
alter table public.filed_notes_frais_compte enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_notes_frais_compte' and policyname = 'filed_notes_frais_compte_lecture') then
    execute 'create policy filed_notes_frais_compte_lecture on public.filed_notes_frais_compte for select to authenticated using (client_id in (select private.mes_clients()))';
  end if;
end $$;
revoke all on table public.filed_notes_frais_compte from anon, authenticated;
grant select on public.filed_notes_frais_compte to authenticated;

insert into private.tables_locataires (nom, ordre_effacement, note) values ('filed_notes_frais', 4, 'FILED, lot 27'), ('filed_notes_frais_compte', 30, 'FILED, lot 27')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;
insert into private.tables_objets (nom, objet_type, colonne, ordre_effacement) values ('filed_notes_frais', 'filed_document', 'document_id', 4)
on conflict do nothing;

create or replace function private.filed_compte_notes_frais(p_client uuid, out numero text, out libelle text)
language sql stable security definer set search_path to '' as $$
  select coalesce(c.numero, '421'), coalesce(c.libelle, 'Personnel - rémunérations dues')
    from (select 1) x left join public.filed_notes_frais_compte c on c.client_id = p_client
$$;
revoke all on function private.filed_compte_notes_frais(uuid) from public, anon, authenticated;

-- Le compte de tiers d'une facture : celui du personnel pour une note de frais, sinon celui des fournisseurs.
create or replace function private.filed_compte_tiers(p_facture uuid, out numero text, out libelle text)
language plpgsql stable security definer set search_path to '' as $$
declare v_f public.filed_factures;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if exists (select 1 from public.filed_notes_frais n where n.facture_id = p_facture and n.statut <> 'refusee') then
    select c.numero, c.libelle into numero, libelle from private.filed_compte_notes_frais(v_f.client_id) c;
  else
    select c.numero, c.libelle into numero, libelle from private.filed_compte_systeme(v_f.client_id, 'fournisseurs') c;
  end if;
end $$;
revoke all on function private.filed_compte_tiers(uuid) from public, anon, authenticated;

create or replace function public.filed_regler_compte_notes_frais(p_client uuid, p_numero text, p_libelle text)
returns void language plpgsql security definer set search_path to '' as $$
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin']);
  if p_numero is null or p_numero !~ '^[0-9]{3,12}$' then raise exception 'Numéro de compte : de 3 à 12 chiffres.' using errcode = '22023'; end if;
  if nullif(btrim(p_libelle), '') is null then raise exception 'Le compte a un libellé.' using errcode = '22023'; end if;
  insert into public.filed_notes_frais_compte (client_id, numero, libelle) values (p_client, p_numero, left(btrim(p_libelle), 200))
  on conflict (client_id) do update set numero = excluded.numero, libelle = excluded.libelle, maj_le = now();
  perform private.filed_journaliser(p_client, 'filed.compte_notes_frais', 'filed_compte_systeme', 'notes_frais',
    jsonb_build_object('numero', p_numero, 'libelle', btrim(p_libelle)));
end $$;
comment on function public.filed_regler_compte_notes_frais(uuid, text, text) is 'Règle le compte des notes de frais (421 par défaut ; 4386, 467… selon l''usage du cabinet). Gérant ou admin.';
revoke all on function public.filed_regler_compte_notes_frais(uuid, text, text) from public, anon;
grant execute on function public.filed_regler_compte_notes_frais(uuid, text, text) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- Déclarer
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_declarer_note_frais(p_facture uuid, p_beneficiaire uuid default null, p_nom text default null, p_motif text default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_uid uuid; v_benef uuid; v_nom text; v_id uuid; v_role text;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found then raise exception 'Pièce introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(v_f.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'], v_f.entite_id);
  if v_uid is not null and not private.voit_objet(v_f.client_id, 'filed_document', v_f.document_id::text) then
    raise exception 'Pièce introuvable.' using errcode = 'P0002';
  end if;
  v_benef := coalesce(p_beneficiaire, v_uid);
  if v_benef is null then raise exception 'Dites qui a avancé la dépense.' using errcode = '22023'; end if;
  select c.role into v_role from public.comptes c where c.user_id = v_uid and c.client_id = v_f.client_id;
  if v_uid is not null and v_benef <> v_uid and coalesce(v_role, '') not in ('gerant', 'admin', 'valideur') then
    raise exception 'Vous déclarez vos propres notes de frais ; celles d''un autre, un gérant, un admin ou un valideur.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.comptes c where c.user_id = v_benef and c.client_id = v_f.client_id) then
    raise exception 'Le bénéficiaire n''est pas une personne de l''organisation.' using errcode = '22023';
  end if;
  if v_f.statut in ('comptabilisee', 'refusee', 'ecartee') then
    raise exception 'Cette pièce est % : elle ne devient plus une note de frais.', v_f.statut using errcode = '55000';
  end if;
  if exists (select 1 from public.filed_reglements r where r.facture_id = v_f.id) then
    raise exception 'Un règlement est déjà noté sur cette pièce : elle a été payée au fournisseur.' using errcode = '55000';
  end if;
  v_nom := nullif(btrim(p_nom), '');
  if v_nom is null then
    select split_part(u.email, '@', 1) into v_nom from auth.users u where u.id = v_benef;
  end if;
  insert into public.filed_notes_frais (client_id, entite_id, facture_id, document_id, beneficiaire, beneficiaire_nom, code_tiers, motif, declaree_par)
  values (v_f.client_id, v_f.entite_id, v_f.id, v_f.document_id, v_benef, left(coalesce(v_nom, 'Salarié'), 120),
          'NDF' || upper(left(replace(v_benef::text, '-', ''), 6)), left(nullif(btrim(p_motif), ''), 300), v_uid)
  on conflict (facture_id) do update set beneficiaire = excluded.beneficiaire, beneficiaire_nom = excluded.beneficiaire_nom,
         code_tiers = excluded.code_tiers, motif = excluded.motif, statut = 'a_rembourser', declaree_par = excluded.declaree_par, maj_le = now()
  returning id into v_id;
  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'note_frais',
    format('Note de frais : dépense avancée par %s, à lui rembourser.', left(coalesce(v_nom, 'un salarié'), 120)),
    jsonb_build_object('note', v_id, 'beneficiaire', v_benef));
  perform private.filed_journaliser(v_f.client_id, 'filed.note_frais.declaration', 'filed_facture', v_f.id::text,
    jsonb_build_object('note', v_id, 'beneficiaire', v_benef), v_f.entite_id);
  return v_id;
end $$;
revoke all on function private.filed_declarer_note_frais(uuid, uuid, text, text) from public, anon;
grant execute on function private.filed_declarer_note_frais(uuid, uuid, text, text) to authenticated, service_role;

create or replace function public.filed_declarer_note_frais(p_facture uuid, p_beneficiaire uuid default null, p_nom text default null, p_motif text default null)
returns uuid language sql set search_path to '' as $$ select private.filed_declarer_note_frais(p_facture, p_beneficiaire, p_nom, p_motif) $$;
comment on function public.filed_declarer_note_frais(uuid, uuid, text, text) is
  'Déclare une pièce comme note de frais : la dépense a été avancée par le bénéficiaire (soi-même par défaut ; un autre : gérant, admin, valideur) et se rembourse à lui.';
revoke all on function public.filed_declarer_note_frais(uuid, uuid, text, text) from public, anon;
grant execute on function public.filed_declarer_note_frais(uuid, uuid, text, text) to authenticated, service_role;

-- Le bénéficiaire n'approuve pas sa propre note.
create or replace function private.filed_note_frais_approbation()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if new.statut = 'validee' and old.statut is distinct from 'validee' and v_uid is not null
     and exists (select 1 from public.filed_notes_frais n where n.facture_id = new.id and n.beneficiaire = v_uid and n.statut <> 'refusee') then
    raise exception 'Une note de frais ne s''approuve pas par celui qui a avancé la dépense.' using errcode = '42501';
  end if;
  if new.statut = 'refusee' and old.statut is distinct from 'refusee' then
    update public.filed_notes_frais set statut = 'refusee', maj_le = now() where facture_id = new.id and statut = 'a_rembourser';
  end if;
  return new;
end $$;
revoke all on function private.filed_note_frais_approbation() from public, anon, authenticated;
create or replace trigger filed_factures_note_frais
  before update of statut on public.filed_factures
  for each row execute function private.filed_note_frais_approbation();

-- ───────────────────────────────────────────────────────────────────────────
-- L'écriture : le tiers d'une note de frais est le bénéficiaire, au compte du personnel
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_ecriture_note_frais()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_n public.filed_notes_frais; v_401 record; v_c record;
begin
  if new.facture_id is null or new.origine not in ('facture', 'reglement') then return new; end if;
  select * into v_n from public.filed_notes_frais where facture_id = new.facture_id and statut <> 'refusee';
  if not found then return new; end if;
  select * into v_401 from private.filed_compte_systeme(new.client_id, 'fournisseurs');
  if new.compte_num <> v_401.numero then return new; end if;
  select * into v_c from private.filed_compte_notes_frais(new.client_id);
  new.compte_num := v_c.numero;
  new.compte_lib := left(v_c.libelle, 200);
  new.comp_aux_num := v_n.code_tiers;
  new.comp_aux_lib := left(v_n.beneficiaire_nom, 200);
  new.ecriture_lib := left(regexp_replace(new.ecriture_lib, '^(Facture|Avoir|Règlement)', '\1 (note de frais ' || v_n.beneficiaire_nom || ')'), 200);
  return new;
end $$;
revoke all on function private.filed_ecriture_note_frais() from public, anon, authenticated;
create or replace trigger filed_ecritures_note_frais
  before insert on public.filed_ecritures
  for each row execute function private.filed_ecriture_note_frais();

-- Le lettrage (texte d'a4_17) suit le compte de tiers de la facture.
create or replace function private.filed_lettrer_facture(p_facture uuid)
returns text language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_c record; v_d numeric; v_k numeric; v_code text; v_n integer;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  select * into v_c from private.filed_compte_tiers(p_facture);
  select coalesce(sum(e.debit), 0), coalesce(sum(e.credit), 0) into v_d, v_k from public.filed_ecritures e
   where e.facture_id = p_facture and e.compte_num = v_c.numero and e.ecriture_let is null;
  if v_d = 0 or v_k = 0 or v_d <> v_k then return null; end if;
  perform pg_advisory_xact_lock(hashtextextended('filed_lettrage|' || v_f.client_id::text, 0));
  select coalesce(max(substring(e.ecriture_let from 2)::integer), 0) + 1 into v_n from public.filed_ecritures e
   where e.client_id = v_f.client_id and e.ecriture_let ~ '^L[0-9]{1,9}$';
  v_code := 'L' || lpad(v_n::text, 6, '0');
  update public.filed_ecritures e set ecriture_let = v_code, date_let = current_date
   where e.facture_id = p_facture and e.compte_num = v_c.numero and e.ecriture_let is null;
  return v_code;
end $$;
revoke all on function private.filed_lettrer_facture(uuid) from public, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- Rembourser
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_rembourser_note_frais(p_note uuid, p_le date default null, p_mode text default 'virement', p_reference text default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_n public.filed_notes_frais; v_uid uuid;
begin
  select * into v_n from public.filed_notes_frais where id = p_note;
  if not found then raise exception 'Note de frais introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(v_n.client_id, array['gerant', 'admin', 'valideur'], v_n.entite_id);
  if v_uid is not null and v_uid = v_n.beneficiaire then
    raise exception 'On ne se rembourse pas soi-même.' using errcode = '42501';
  end if;
  if v_n.statut <> 'a_rembourser' then raise exception 'Cette note de frais est %.', v_n.statut using errcode = '55000'; end if;
  return private.filed_marquer_reglee(v_n.facture_id, coalesce(p_le, current_date), null, coalesce(p_mode, 'virement'),
                                      coalesce(p_reference, 'NDF ' || v_n.beneficiaire_nom));
end $$;
revoke all on function private.filed_rembourser_note_frais(uuid, date, text, text) from public, anon;
grant execute on function private.filed_rembourser_note_frais(uuid, date, text, text) to authenticated, service_role;

create or replace function public.filed_rembourser_note_frais(p_note uuid, p_le date default null, p_mode text default 'virement', p_reference text default null)
returns uuid language sql set search_path to '' as $$ select private.filed_rembourser_note_frais(p_note, p_le, p_mode, p_reference) $$;
comment on function public.filed_rembourser_note_frais(uuid, date, text, text) is
  'Note le remboursement d''une note de frais approuvée (le reste à payer, au bénéficiaire). Gérant, admin, valideur ; jamais le bénéficiaire.';
revoke all on function public.filed_rembourser_note_frais(uuid, date, text, text) from public, anon;
grant execute on function public.filed_rembourser_note_frais(uuid, date, text, text) to authenticated, service_role;

-- Tout règlement d'une note (remboursement, relevé, saisie) : remboursée quand le reste est nul.
create or replace function private.filed_note_frais_reglee()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_reste numeric;
begin
  if not exists (select 1 from public.filed_notes_frais n where n.facture_id = new.facture_id and n.statut = 'a_rembourser') then return null; end if;
  select * into v_f from public.filed_factures where id = new.facture_id;
  v_reste := coalesce(v_f.net_a_payer, v_f.montant_ttc) - coalesce((select sum(r.montant) from public.filed_reglements r where r.facture_id = v_f.id), 0);
  if v_reste <= 0 then
    update public.filed_notes_frais set statut = 'remboursee', remboursee_le = new.regle_le, maj_le = now()
     where facture_id = new.facture_id and statut = 'a_rembourser';
    perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'note_frais_remboursee',
      format('Note de frais remboursée le %s.', to_char(new.regle_le, 'DD/MM/YYYY')), jsonb_build_object('reglement', new.id));
  end if;
  return null;
end $$;
revoke all on function private.filed_note_frais_reglee() from public, anon, authenticated;
create or replace trigger filed_reglements_note_frais
  after insert on public.filed_reglements
  for each row execute function private.filed_note_frais_reglee();
