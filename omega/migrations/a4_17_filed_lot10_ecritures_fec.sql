-- FILED, lot 10 (a4_17) — les écritures d'achat et l'export FEC.
--
-- Référence vérifiée le 06/10/2026 : article A. 47 A-1 du LPF (Légifrance) et BOI-CF-IOR-60-40-20 (BOFiP, 07/06/2017).
--   · 18 champs, dans l'ordre, nommés sur la première ligne : JournalCode, JournalLib, EcritureNum, EcritureDate,
--     CompteNum, CompteLib, CompAuxNum, CompAuxLib, PieceRef, PieceDate, EcritureLib, Debit, Credit, EcritureLet,
--     DateLet, ValidDate, Montantdevise, Idevise ;
--   · fichier à plat, zones séparées par une tabulation ou « | », enregistrements séparés par retour chariot et/ou
--     saut de ligne ; codage ASCII, ISO 8859-15 ou UTF-8 ; dates AAAAMMJJ ; montants avec la virgule décimale ;
--   · nom : SirenFECAAAAMMJJ (AAAAMMJJ = date de clôture de l'exercice) ;
--   · écritures numérotées chronologiquement, de manière croissante, sans rupture ni inversion (BOFiP § 40).
--
-- Ce lot pose :
--   1. public.filed_comptes_systeme : les comptes que FILED emploie hors plan de charges (fournisseurs 401, TVA déductible
--      44566 / 44562, banque 512, caisse 530), réglables par organisation (public.filed_regler_compte_systeme) ;
--   2. public.filed_ecritures : les lignes d'écriture, une table où l'on ajoute ; seuls le lettrage et sa date se posent
--      après coup. Écrites par FILED, jamais par une personne :
--        · à la comptabilisation d'une facture (journal HA) : débit des comptes de charge ou d'immobilisation de ses
--          imputations validées, débit de la TVA déductible répartie au prorata (ajoutée à la charge quand le compte porte
--          une TVA non déductible), crédit du compte fournisseur 401 avec le fournisseur en compte auxiliaire ; un avoir
--          inverse les sens ; les imputations doivent couvrir le HT (à un centime près), sinon la comptabilisation est
--          refusée (55000) ;
--        · à chaque règlement d'une facture comptabilisée (journal BQ, ou caisse pour les espèces) : débit 401, crédit
--          banque ; les règlements notés avant la comptabilisation sont écrits avec elle ;
--        · facture soldée : les lignes 401 de la facture et de ses règlements reçoivent le même code de lettrage ;
--      EcritureDate = date d'enregistrement, ramenée dans les bornes de l'exercice ; PieceDate = date de la pièce ;
--      EcritureNum : suite continue par société et par exercice ;
--   3. public.filed_exporter_fec(p_client, p_entite, p_exercice | p_du, p_au) : le fichier (UTF-8, tabulation), son nom,
--      ses totaux et le contrôle d'équilibre ; journalisé.
-- Limites, écrites dans NOTES-A4 : FILED ne tient que les achats (pas de ventes, d'à-nouveaux, de paie ni d'inventaire) ;
-- son FEC est un journal d'achats à fusionner dans le FEC du cabinet. L'autoliquidation (4452 / 44566) n'est pas encore
-- passée en écriture. Une facture en devise sans contre-valeur est écrite en devise seulement (Debit = Credit = 0).
-- Migration idempotente. Aucune suppression.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Les comptes système
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.filed_comptes_systeme (
  client_id  uuid not null references public.clients(id) on delete cascade,
  role       text not null check (role in ('fournisseurs', 'tva_deductible_abs', 'tva_deductible_immo', 'banque', 'caisse')),
  numero     text not null check (numero ~ '^[0-9]{3,12}$'),
  libelle    text not null check (char_length(btrim(libelle)) between 1 and 200),
  maj_le     timestamptz not null default now(),
  primary key (client_id, role)
);
comment on table public.filed_comptes_systeme is
  'Les comptes que FILED emploie dans ses écritures hors plan de charges, par organisation ; à défaut, ceux du plan comptable général (401, 44566, 44562, 512, 530).';
alter table public.filed_comptes_systeme enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_comptes_systeme' and policyname = 'filed_comptes_systeme_lecture') then
    execute 'create policy filed_comptes_systeme_lecture on public.filed_comptes_systeme for select to authenticated using (client_id in (select private.mes_clients()))';
  end if;
end $$;
revoke all on table public.filed_comptes_systeme from anon, authenticated;
grant select on public.filed_comptes_systeme to authenticated;
insert into private.tables_locataires (nom, ordre_effacement, note) values ('filed_comptes_systeme', 3, 'FILED, lot 10')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;

create or replace function private.filed_compte_systeme(p_client uuid, p_role text, out numero text, out libelle text)
language sql stable security definer set search_path to '' as $$
  select coalesce(c.numero, d.numero), coalesce(c.libelle, d.libelle)
    from (values ('fournisseurs', '401', 'Fournisseurs'),
                 ('tva_deductible_abs', '44566', 'TVA déductible sur autres biens et services'),
                 ('tva_deductible_immo', '44562', 'TVA déductible sur immobilisations'),
                 ('banque', '512', 'Banque'),
                 ('caisse', '530', 'Caisse')) d(role, numero, libelle)
    left join public.filed_comptes_systeme c on c.client_id = p_client and c.role = d.role
   where d.role = p_role
$$;
revoke all on function private.filed_compte_systeme(uuid, text) from public, anon, authenticated;

create or replace function public.filed_regler_compte_systeme(p_client uuid, p_role text, p_numero text, p_libelle text)
returns void language plpgsql security definer set search_path to '' as $$
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin']);
  if p_numero !~ '^[0-9]{3,12}$' then raise exception 'Numéro de compte : de 3 à 12 chiffres.' using errcode = '22023'; end if;
  insert into public.filed_comptes_systeme (client_id, role, numero, libelle) values (p_client, p_role, p_numero, btrim(p_libelle))
  on conflict (client_id, role) do update set numero = excluded.numero, libelle = excluded.libelle, maj_le = now();
  perform private.filed_journaliser(p_client, 'filed.compte_systeme', 'filed_compte_systeme', p_role,
    jsonb_build_object('numero', p_numero, 'libelle', btrim(p_libelle)));
end $$;
comment on function public.filed_regler_compte_systeme(uuid, text, text, text) is
  'Règle un compte système de FILED (fournisseurs, tva_deductible_abs, tva_deductible_immo, banque, caisse) : gérant ou admin.';
revoke all on function public.filed_regler_compte_systeme(uuid, text, text, text) from public, anon;
grant execute on function public.filed_regler_compte_systeme(uuid, text, text, text) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Les écritures
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.filed_ecritures (
  id              bigint generated always as identity primary key,
  client_id       uuid not null references public.clients(id) on delete cascade,
  entite_id       uuid not null references public.entites(id) on delete cascade,
  exercice_id     uuid references public.filed_exercices(id) on delete set null,
  exercice_cle    text not null,
  journal_code    text not null check (journal_code ~ '^[A-Z0-9]{1,10}$'),
  journal_lib     text not null,
  ecriture_num    integer not null check (ecriture_num > 0),
  ecriture_date   date not null,
  compte_num      text not null check (compte_num ~ '^[0-9]{3,12}$'),
  compte_lib      text not null,
  comp_aux_num    text,
  comp_aux_lib    text,
  piece_ref       text not null,
  piece_date      date not null,
  ecriture_lib    text not null,
  debit           numeric(14,2) not null default 0 check (debit >= 0),
  credit          numeric(14,2) not null default 0 check (credit >= 0),
  ecriture_let    text,
  date_let        date,
  valid_date      date not null,
  montant_devise  numeric(14,2),
  idevise         text check (idevise is null or idevise ~ '^[A-Z]{3}$'),
  origine         text not null check (origine in ('facture', 'reglement')),
  facture_id      uuid not null references public.filed_factures(id) on delete cascade,
  document_id     uuid not null references public.filed_documents(id) on delete cascade,
  reglement_id    uuid references public.filed_reglements(id) on delete cascade,
  cree_le         timestamptz not null default now(),
  constraint filed_ecritures_lettrage check ((ecriture_let is null) = (date_let is null))
);
comment on table public.filed_ecritures is
  'Les lignes d''écriture des achats (journal HA) et de leurs règlements (BQ, CA), écrites par FILED à la comptabilisation et au règlement ; seul le lettrage se pose après coup. Source de l''export FEC.';
create index if not exists filed_ecritures_suite on public.filed_ecritures (client_id, entite_id, exercice_cle, ecriture_num);
create index if not exists filed_ecritures_facture on public.filed_ecritures (facture_id);
create unique index if not exists filed_ecritures_reglement_une_fois on public.filed_ecritures (reglement_id, compte_num, (debit > 0)) where reglement_id is not null;
alter table public.filed_ecritures enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_ecritures' and policyname = 'filed_ecritures_lecture') then
    execute 'create policy filed_ecritures_lecture on public.filed_ecritures for select to authenticated using (exists (select 1 from public.filed_documents d where d.id = document_id))';
  end if;
end $$;
revoke all on table public.filed_ecritures from anon, authenticated;
grant select on public.filed_ecritures to authenticated;
insert into private.tables_locataires (nom, ordre_effacement, note) values ('filed_ecritures', 1, 'FILED, lot 10')
on conflict (nom) do update set ordre_effacement = excluded.ordre_effacement, note = excluded.note;
insert into private.tables_objets (nom, objet_type, colonne, ordre_effacement) values ('filed_ecritures', 'filed_document', 'document_id', 4)
on conflict (nom) do update set objet_type = excluded.objet_type, colonne = excluded.colonne, ordre_effacement = excluded.ordre_effacement;

-- Une écriture ne se réécrit pas : seuls le lettrage et sa date se posent.
create or replace function private.filed_ecritures_garder()
returns trigger language plpgsql set search_path to '' as $$
begin
  if (to_jsonb(new) - 'ecriture_let' - 'date_let') is distinct from (to_jsonb(old) - 'ecriture_let' - 'date_let') then
    raise exception 'Une écriture comptable ne se modifie pas : on passe une écriture de correction.' using errcode = '42501';
  end if;
  return new;
end $$;
revoke all on function private.filed_ecritures_garder() from public, anon, authenticated;
create or replace trigger filed_ecritures_garder
  before update on public.filed_ecritures
  for each row execute function private.filed_ecritures_garder();

-- L'exercice qui contient une date pour une société, sinon l'année civile.
create or replace function private.filed_exercice_a_date(p_client uuid, p_entite uuid, p_date date,
                                                        out exercice_id uuid, out cle text, out debut date, out fin date)
language plpgsql stable security definer set search_path to '' as $$
declare v_x public.filed_exercices;
begin
  select x.* into v_x from public.filed_exercices x
   where x.client_id = p_client and (x.entite_id is null or x.entite_id = p_entite) and p_date between x.debut and x.fin
   order by (x.entite_id is not null) desc limit 1;
  if v_x.id is not null then
    exercice_id := v_x.id; cle := v_x.id::text; debut := v_x.debut; fin := v_x.fin;
  else
    exercice_id := null; cle := to_char(p_date, 'YYYY');
    debut := make_date(extract(year from p_date)::int, 1, 1); fin := make_date(extract(year from p_date)::int, 12, 31);
  end if;
end $$;
revoke all on function private.filed_exercice_a_date(uuid, uuid, date) from public, anon, authenticated;

-- L'exercice d'une pièce : celui de ses imputations validées (orientation après clôture comprise), sinon celui de sa date.
create or replace function private.filed_exercice_de(p_f public.filed_factures, out exercice_id uuid, out cle text, out debut date, out fin date)
language plpgsql stable security definer set search_path to '' as $$
declare v_x public.filed_exercices;
begin
  select x.* into v_x from public.filed_imputations i join public.filed_exercices x on x.id = i.exercice_id
   where i.facture_id = p_f.id and i.statut = 'validee' order by i.rang limit 1;
  if v_x.id is not null then
    exercice_id := v_x.id; cle := v_x.id::text; debut := v_x.debut; fin := v_x.fin;
  else
    select * into exercice_id, cle, debut, fin from private.filed_exercice_a_date(p_f.client_id, p_f.entite_id, coalesce(p_f.date_emission, current_date));
  end if;
end $$;
revoke all on function private.filed_exercice_de(public.filed_factures) from public, anon, authenticated;

-- La date d'enregistrement dans un exercice : aujourd'hui, ramené dans ses bornes. Dans une même suite, les dates ne
-- reculent donc jamais (BOFiP § 40 : numérotation chronologique, sans inversion).
create or replace function private.filed_date_enregistrement(p_debut date, p_fin date)
returns date language sql stable set search_path to '' as $$ select greatest(least(current_date, p_fin), p_debut) $$;
revoke all on function private.filed_date_enregistrement(date, date) from public, anon, authenticated;

-- Le prochain numéro d'écriture de la suite (société, exercice) ; verrou de transaction sur la suite.
create or replace function private.filed_prochain_numero_ecriture(p_client uuid, p_entite uuid, p_cle text)
returns integer language plpgsql security definer set search_path to '' as $$
declare v_n integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('filed_ecritures|' || p_client::text || '|' || p_entite::text || '|' || p_cle, 0));
  select coalesce(max(e.ecriture_num), 0) + 1 into v_n from public.filed_ecritures e
   where e.client_id = p_client and e.entite_id = p_entite and e.exercice_cle = p_cle;
  return v_n;
end $$;
revoke all on function private.filed_prochain_numero_ecriture(uuid, uuid, text) from public, anon, authenticated;

-- Les écritures d'achat d'une facture comptabilisée (journal HA). Rend le numéro d'écriture, ou null si déjà écrite.
create or replace function private.filed_ecrire_facture(p_facture uuid)
returns integer language plpgsql security definer set search_path to '' as $$
declare
  v_f public.filed_factures; v_four public.filed_fournisseurs; v_doc public.filed_documents; v_x record; v_num integer;
  v_date date; v_sens integer; v_ht numeric; v_tva numeric; v_ttc numeric; v_somme numeric; v_tva_reste numeric; v_tva_ligne numeric;
  v_dev boolean; v_lib text; v_four_c record; v_tva_abs record; v_tva_immo record; r record; v_n integer := 0; v_nb integer;
  v_lignes jsonb := '[]'::jsonb; l jsonb; v_tva_abs_total numeric := 0; v_tva_immo_total numeric := 0;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found then return null; end if;
  if exists (select 1 from public.filed_ecritures e where e.facture_id = v_f.id and e.origine = 'facture') then return null; end if;
  select * into v_four from public.filed_fournisseurs where id = v_f.fournisseur_id;
  select * into v_doc from public.filed_documents where id = v_f.document_id;
  select * into v_x from private.filed_exercice_de(v_f);
  v_sens := case when v_f.nature = 'avoir' then -1 else 1 end;
  v_ht := abs(coalesce(v_f.montant_ht, 0)); v_tva := abs(coalesce(v_f.montant_tva, 0)); v_ttc := abs(coalesce(v_f.montant_ttc, v_ht + v_tva));
  v_dev := coalesce(v_f.devise, 'EUR') <> 'EUR';

  select coalesce(sum(abs(i.montant_ht)), 0), count(*) into v_somme, v_nb from public.filed_imputations i where i.facture_id = v_f.id and i.statut = 'validee';
  if v_nb = 0 then
    raise exception 'Aucune imputation validée : la facture ne peut pas être écrite en comptabilité.' using errcode = '55000';
  end if;
  if abs(v_somme - v_ht) > 0.01 then
    raise exception 'Les imputations validées (%) ne couvrent pas le hors taxes de la facture (%).',
      private.filed_montant_texte(v_somme), private.filed_montant_texte(v_ht) using errcode = '55000';
  end if;

  v_date := private.filed_date_enregistrement(v_x.debut, v_x.fin);
  v_num := private.filed_prochain_numero_ecriture(v_f.client_id, v_f.entite_id, v_x.cle);
  v_lib := left(format('%s %s %s', case when v_f.nature = 'avoir' then 'Avoir' else 'Facture' end,
                       coalesce(v_four.nom, 'fournisseur'), coalesce(v_f.numero, v_doc.reference)), 200);
  select * into v_four_c from private.filed_compte_systeme(v_f.client_id, 'fournisseurs');
  select * into v_tva_abs from private.filed_compte_systeme(v_f.client_id, 'tva_deductible_abs');
  select * into v_tva_immo from private.filed_compte_systeme(v_f.client_id, 'tva_deductible_immo');

  -- Les charges (ou immobilisations), et la TVA au prorata du HT ; l'écart d'arrondi va à la dernière.
  v_tva_reste := v_tva;
  for r in select i.rang, abs(i.montant_ht) as ht, p.numero, p.libelle, p.classe, p.tva_deductible,
                  row_number() over (order by i.rang) as k, count(*) over () as n
             from public.filed_imputations i join public.filed_plan_comptable p on p.id = i.compte_id
            where i.facture_id = v_f.id and i.statut = 'validee' order by i.rang loop
    v_tva_ligne := case when r.k = r.n then v_tva_reste when v_ht = 0 then 0 else round(v_tva * r.ht / v_ht, 2) end;
    v_tva_reste := v_tva_reste - v_tva_ligne;
    v_lignes := v_lignes || jsonb_build_object('compte', r.numero, 'lib', r.libelle,
      'montant', r.ht + case when r.tva_deductible then 0 else v_tva_ligne end, 'debit', true);
    if r.tva_deductible and v_tva_ligne <> 0 then
      if r.classe = 2 then v_tva_immo_total := v_tva_immo_total + v_tva_ligne; else v_tva_abs_total := v_tva_abs_total + v_tva_ligne; end if;
    end if;
  end loop;
  -- L'écart d'arrondi du HT (imputations à un centime près) va à la première charge.
  if v_somme <> v_ht then
    v_lignes := jsonb_set(v_lignes, '{0,montant}', to_jsonb((v_lignes -> 0 ->> 'montant')::numeric + (v_ht - v_somme)));
  end if;
  if v_tva_abs_total <> 0 then
    v_lignes := v_lignes || jsonb_build_object('compte', v_tva_abs.numero, 'lib', v_tva_abs.libelle, 'montant', v_tva_abs_total, 'debit', true);
  end if;
  if v_tva_immo_total <> 0 then
    v_lignes := v_lignes || jsonb_build_object('compte', v_tva_immo.numero, 'lib', v_tva_immo.libelle, 'montant', v_tva_immo_total, 'debit', true);
  end if;
  -- Le fournisseur, au crédit, pour le total des débits (l'écriture est équilibrée par construction).
  v_lignes := v_lignes || jsonb_build_object('compte', v_four_c.numero, 'lib', v_four_c.libelle, 'aux', true,
    'montant', (select sum((x ->> 'montant')::numeric) from jsonb_array_elements(v_lignes) x), 'debit', false);

  for l in select * from jsonb_array_elements(v_lignes) loop
    insert into public.filed_ecritures (client_id, entite_id, exercice_id, exercice_cle, journal_code, journal_lib, ecriture_num, ecriture_date,
      compte_num, compte_lib, comp_aux_num, comp_aux_lib, piece_ref, piece_date, ecriture_lib, debit, credit, valid_date,
      montant_devise, idevise, origine, facture_id, document_id)
    values (v_f.client_id, v_f.entite_id, v_x.exercice_id, v_x.cle, 'HA', 'Achats', v_num, v_date,
      l ->> 'compte', left(l ->> 'lib', 200),
      case when (l ->> 'aux')::boolean then coalesce(v_four.code, left(v_four.id::text, 8)) end,
      case when (l ->> 'aux')::boolean then left(v_four.nom, 200) end,
      left(coalesce(v_f.numero, v_doc.reference), 100), coalesce(v_f.date_emission, v_date), v_lib,
      case when v_dev then 0 when ((l ->> 'debit')::boolean) = (v_sens > 0) then (l ->> 'montant')::numeric else 0 end,
      case when v_dev then 0 when ((l ->> 'debit')::boolean) <> (v_sens > 0) then (l ->> 'montant')::numeric else 0 end,
      current_date,
      case when v_dev then (l ->> 'montant')::numeric * v_sens * case when (l ->> 'debit')::boolean then 1 else -1 end end,
      case when v_dev then v_f.devise end,
      'facture', v_f.id, v_f.document_id);
    v_n := v_n + 1;
  end loop;
  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'ecrite',
    format('Écriture d''achat n° %s passée au journal HA (%s lignes).', v_num, v_n), jsonb_build_object('ecriture_num', v_num, 'exercice', v_x.cle));
  return v_num;
end $$;
comment on function private.filed_ecrire_facture(uuid) is
  'Écrit au journal des achats (HA) une facture comptabilisée : charges des imputations validées, TVA déductible, fournisseur au crédit (sens inversés pour un avoir).';
revoke all on function private.filed_ecrire_facture(uuid) from public, anon, authenticated;

-- L'écriture d'un règlement (journal BQ, ou CA pour les espèces) ; puis le lettrage si la facture est soldée.
create or replace function private.filed_ecrire_reglement(p_reglement uuid)
returns integer language plpgsql security definer set search_path to '' as $$
declare
  v_r public.filed_reglements; v_f public.filed_factures; v_four public.filed_fournisseurs; v_x record; v_num integer; v_date date;
  v_four_c record; v_tres record; v_journal text; v_jlib text; v_m numeric; v_dev boolean; v_lib text;
begin
  select * into v_r from public.filed_reglements where id = p_reglement;
  if not found then return null; end if;
  if exists (select 1 from public.filed_ecritures e where e.reglement_id = v_r.id) then return null; end if;
  select * into v_f from public.filed_factures where id = v_r.facture_id;
  if v_f.statut <> 'comptabilisee' then return null; end if;
  select * into v_four from public.filed_fournisseurs where id = v_f.fournisseur_id;
  -- Le règlement va dans l'exercice qui contient sa date ; EcritureDate = date d'enregistrement, PieceDate = date du règlement.
  select * into v_x from private.filed_exercice_a_date(v_f.client_id, v_f.entite_id, v_r.regle_le);
  v_date := private.filed_date_enregistrement(v_x.debut, v_x.fin);
  v_num := private.filed_prochain_numero_ecriture(v_f.client_id, v_f.entite_id, v_x.cle);
  select * into v_four_c from private.filed_compte_systeme(v_f.client_id, 'fournisseurs');
  if v_r.mode = 'especes' then
    select * into v_tres from private.filed_compte_systeme(v_f.client_id, 'caisse'); v_journal := 'CA'; v_jlib := 'Caisse';
  else
    select * into v_tres from private.filed_compte_systeme(v_f.client_id, 'banque'); v_journal := 'BQ'; v_jlib := 'Banque';
  end if;
  v_m := abs(v_r.montant); v_dev := coalesce(v_f.devise, 'EUR') <> 'EUR';
  v_lib := left(format('Règlement %s %s%s', coalesce(v_four.nom, 'fournisseur'), coalesce(v_f.numero, ''), coalesce(' ' || v_r.reference, '')), 200);
  -- Un règlement positif solde le fournisseur (débit 401, crédit trésorerie) ; un remboursement d'avoir inverse.
  insert into public.filed_ecritures (client_id, entite_id, exercice_id, exercice_cle, journal_code, journal_lib, ecriture_num, ecriture_date,
    compte_num, compte_lib, comp_aux_num, comp_aux_lib, piece_ref, piece_date, ecriture_lib, debit, credit, valid_date,
    montant_devise, idevise, origine, facture_id, document_id, reglement_id)
  values
    (v_f.client_id, v_f.entite_id, v_x.exercice_id, v_x.cle, v_journal, v_jlib, v_num, v_date, v_four_c.numero, v_four_c.libelle,
     coalesce(v_four.code, left(v_four.id::text, 8)), left(v_four.nom, 200), left(coalesce(v_r.reference, v_f.numero, 'REGLEMENT'), 100), v_r.regle_le, v_lib,
     case when v_dev then 0 when v_r.montant > 0 then v_m else 0 end, case when v_dev then 0 when v_r.montant < 0 then v_m else 0 end, current_date,
     case when v_dev then v_r.montant end, case when v_dev then v_f.devise end, 'reglement', v_f.id, v_f.document_id, v_r.id),
    (v_f.client_id, v_f.entite_id, v_x.exercice_id, v_x.cle, v_journal, v_jlib, v_num, v_date, v_tres.numero, v_tres.libelle,
     null, null, left(coalesce(v_r.reference, v_f.numero, 'REGLEMENT'), 100), v_r.regle_le, v_lib,
     case when v_dev then 0 when v_r.montant < 0 then v_m else 0 end, case when v_dev then 0 when v_r.montant > 0 then v_m else 0 end, current_date,
     case when v_dev then -v_r.montant end, case when v_dev then v_f.devise end, 'reglement', v_f.id, v_f.document_id, v_r.id);
  perform private.filed_lettrer_facture(v_f.id);
  return v_num;
end $$;
revoke all on function private.filed_ecrire_reglement(uuid) from public, anon, authenticated;

-- Facture soldée : un même code de lettrage sur ses lignes fournisseur (achat et règlements).
create or replace function private.filed_lettrer_facture(p_facture uuid)
returns text language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_c record; v_d numeric; v_k numeric; v_code text; v_n integer;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  select * into v_c from private.filed_compte_systeme(v_f.client_id, 'fournisseurs');
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

-- Les déclencheurs : comptabilisation et règlement.
create or replace function private.filed_ecritures_facture()
returns trigger language plpgsql security definer set search_path to '' as $$
declare r record;
begin
  if new.statut = 'comptabilisee' and old.statut is distinct from 'comptabilisee' and new.nature in ('facture', 'avoir') then
    perform private.filed_ecrire_facture(new.id);
    for r in select g.id from public.filed_reglements g where g.facture_id = new.id order by g.regle_le, g.cree_le loop
      perform private.filed_ecrire_reglement(r.id);
    end loop;
  end if;
  return null;
end $$;
revoke all on function private.filed_ecritures_facture() from public, anon, authenticated;
create or replace trigger filed_factures_ecritures
  after update of statut on public.filed_factures
  for each row execute function private.filed_ecritures_facture();

create or replace function private.filed_ecritures_reglement()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  perform private.filed_ecrire_reglement(new.id);
  return null;
end $$;
revoke all on function private.filed_ecritures_reglement() from public, anon, authenticated;
create or replace trigger filed_reglements_ecritures
  after insert on public.filed_reglements
  for each row execute function private.filed_ecritures_reglement();

-- ───────────────────────────────────────────────────────────────────────────
-- 3. L'export FEC
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_fec_texte(p text) returns text
language sql immutable set search_path to '' as $$
  select coalesce(btrim(regexp_replace(p, '[\t\r\n|]+', ' ', 'g')), '')
$$;
create or replace function private.filed_fec_montant(p numeric) returns text
language sql immutable set search_path to '' as $$
  select case when p is null then '' else replace(to_char(p, 'FM9999999999990.00'), '.', ',') end
$$;
create or replace function private.filed_fec_date(p date) returns text
language sql immutable set search_path to '' as $$
  select coalesce(to_char(p, 'YYYYMMDD'), '')
$$;
-- Appelées seulement par private.filed_exporter_fec (definer) : pas d'EXECUTE pour les membres (règle du test socle 44).
revoke all on function private.filed_fec_texte(text) from public, anon, authenticated;
revoke all on function private.filed_fec_montant(numeric) from public, anon, authenticated;
revoke all on function private.filed_fec_date(date) from public, anon, authenticated;
grant execute on function private.filed_fec_texte(text), private.filed_fec_montant(numeric), private.filed_fec_date(date) to service_role;

create or replace function private.filed_exporter_fec(p_client uuid, p_entite uuid, p_exercice uuid default null, p_du date default null, p_au date default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_e public.entites; v_x public.filed_exercices; v_du date; v_au date; v_lignes text[]; v_n integer := 0; v_ecr integer := 0;
  v_d numeric := 0; v_c numeric := 0; v_desequilibres integer; v_nom text; v_contenu text; r record;
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur'], p_entite);
  select * into v_e from public.entites where id = p_entite and client_id = p_client;
  if not found then raise exception 'Société introuvable dans cette organisation.' using errcode = '22023'; end if;
  if v_e.siren is null or v_e.siren !~ '^[0-9]{9}$' then
    raise exception 'La société n''a pas de SIREN : le fichier des écritures comptables est nommé d''après lui.' using errcode = '55000';
  end if;
  if p_exercice is not null then
    select * into v_x from public.filed_exercices where id = p_exercice and client_id = p_client;
    if not found then raise exception 'Exercice introuvable.' using errcode = '22023'; end if;
    v_du := v_x.debut; v_au := v_x.fin;
  else
    v_du := coalesce(p_du, date_trunc('year', current_date::timestamp)::date);
    v_au := coalesce(p_au, (date_trunc('year', current_date::timestamp) + interval '1 year - 1 day')::date);
  end if;

  v_lignes := array['JournalCode' || chr(9) || 'JournalLib' || chr(9) || 'EcritureNum' || chr(9) || 'EcritureDate' || chr(9) ||
                    'CompteNum' || chr(9) || 'CompteLib' || chr(9) || 'CompAuxNum' || chr(9) || 'CompAuxLib' || chr(9) ||
                    'PieceRef' || chr(9) || 'PieceDate' || chr(9) || 'EcritureLib' || chr(9) || 'Debit' || chr(9) || 'Credit' || chr(9) ||
                    'EcritureLet' || chr(9) || 'DateLet' || chr(9) || 'ValidDate' || chr(9) || 'Montantdevise' || chr(9) || 'Idevise'];
  for r in select e.* from public.filed_ecritures e
            where e.client_id = p_client and e.entite_id = p_entite
              and (case when p_exercice is not null then e.exercice_id = p_exercice else e.ecriture_date between v_du and v_au end)
            order by e.exercice_cle, e.ecriture_num, e.id loop
    v_lignes := v_lignes || (private.filed_fec_texte(r.journal_code) || chr(9) || private.filed_fec_texte(r.journal_lib) || chr(9) ||
      r.ecriture_num::text || chr(9) || private.filed_fec_date(r.ecriture_date) || chr(9) ||
      private.filed_fec_texte(r.compte_num) || chr(9) || private.filed_fec_texte(r.compte_lib) || chr(9) ||
      private.filed_fec_texte(r.comp_aux_num) || chr(9) || private.filed_fec_texte(r.comp_aux_lib) || chr(9) ||
      private.filed_fec_texte(r.piece_ref) || chr(9) || private.filed_fec_date(r.piece_date) || chr(9) ||
      private.filed_fec_texte(r.ecriture_lib) || chr(9) || private.filed_fec_montant(r.debit) || chr(9) || private.filed_fec_montant(r.credit) || chr(9) ||
      private.filed_fec_texte(r.ecriture_let) || chr(9) || private.filed_fec_date(r.date_let) || chr(9) || private.filed_fec_date(r.valid_date) || chr(9) ||
      private.filed_fec_montant(r.montant_devise) || chr(9) || private.filed_fec_texte(r.idevise));
    v_n := v_n + 1; v_d := v_d + r.debit; v_c := v_c + r.credit;
  end loop;
  select count(distinct (e.exercice_cle, e.ecriture_num)) into v_ecr from public.filed_ecritures e
   where e.client_id = p_client and e.entite_id = p_entite
     and (case when p_exercice is not null then e.exercice_id = p_exercice else e.ecriture_date between v_du and v_au end);
  select count(*) into v_desequilibres from (
    select 1 from public.filed_ecritures e
     where e.client_id = p_client and e.entite_id = p_entite
       and (case when p_exercice is not null then e.exercice_id = p_exercice else e.ecriture_date between v_du and v_au end)
     group by e.exercice_cle, e.ecriture_num having sum(e.debit) <> sum(e.credit)) s;

  v_nom := v_e.siren || 'FEC' || to_char(v_au, 'YYYYMMDD') || '.txt';
  v_contenu := array_to_string(v_lignes, chr(13) || chr(10)) || chr(13) || chr(10);
  perform private.filed_journaliser(p_client, 'filed.export_fec', 'entite', p_entite::text,
    jsonb_build_object('fichier', v_nom, 'lignes', v_n, 'ecritures', v_ecr, 'du', v_du, 'au', v_au, 'exercice', p_exercice,
                       'empreinte', encode(sha256(convert_to(v_contenu, 'UTF8')), 'hex')), p_entite);
  return jsonb_build_object('nom_fichier', v_nom, 'encodage', 'UTF-8', 'separateur', 'tabulation', 'contenu', v_contenu,
    'lignes', v_n, 'ecritures', v_ecr, 'total_debit', v_d, 'total_credit', v_c, 'equilibre', v_d = v_c and v_desequilibres = 0,
    'ecritures_desequilibrees', v_desequilibres, 'du', v_du, 'au', v_au,
    'empreinte', encode(sha256(convert_to(v_contenu, 'UTF8')), 'hex'));
end $$;
comment on function private.filed_exporter_fec(uuid, uuid, uuid, date, date) is
  'Le fichier des écritures comptables (A. 47 A-1 du LPF) des achats d''une société pour un exercice ou une période : UTF-8, tabulation, nom SirenFECAAAAMMJJ ; journalisé avec son empreinte.';
revoke all on function private.filed_exporter_fec(uuid, uuid, uuid, date, date) from public, anon;
grant execute on function private.filed_exporter_fec(uuid, uuid, uuid, date, date) to authenticated, service_role;

create or replace function public.filed_exporter_fec(p_client uuid, p_entite uuid, p_exercice uuid default null, p_du date default null, p_au date default null)
returns jsonb language sql set search_path to '' as $$ select private.filed_exporter_fec(p_client, p_entite, p_exercice, p_du, p_au) $$;
comment on function public.filed_exporter_fec(uuid, uuid, uuid, date, date) is
  'Exporte le FEC des achats d''une société (exercice, ou période du … au …) : {nom_fichier, contenu, lignes, ecritures, equilibre…}. Gérant, admin, valideur.';
revoke all on function public.filed_exporter_fec(uuid, uuid, uuid, date, date) from public, anon;
grant execute on function public.filed_exporter_fec(uuid, uuid, uuid, date, date) to authenticated, service_role;

-- Rattrapage, à lancer à la main (service_role) : les factures comptabilisées avant ce lot n'ont pas d'écritures.
-- Elles sont écrites aujourd'hui (EcritureDate = date d'enregistrement), avec leurs règlements ; celles dont les
-- imputations ne couvrent pas le HT sont listées, pas écrites.
create or replace function public.filed_rattraper_ecritures(p_client uuid default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare r record; v_ok integer := 0; v_refus jsonb := '[]'::jsonb; g record;
begin
  for r in select f.id, f.numero from public.filed_factures f
            where f.statut = 'comptabilisee' and (p_client is null or f.client_id = p_client)
              and not exists (select 1 from public.filed_ecritures e where e.facture_id = f.id and e.origine = 'facture')
            order by f.maj_le, f.id loop
    begin
      perform private.filed_ecrire_facture(r.id);
      for g in select x.id from public.filed_reglements x where x.facture_id = r.id order by x.regle_le, x.cree_le loop
        perform private.filed_ecrire_reglement(g.id);
      end loop;
      v_ok := v_ok + 1;
    exception when object_not_in_prerequisite_state then
      v_refus := v_refus || jsonb_build_object('facture', r.id, 'numero', r.numero, 'motif', sqlerrm);
    end;
  end loop;
  return jsonb_build_object('ecrites', v_ok, 'refusees', v_refus);
end $$;
comment on function public.filed_rattraper_ecritures(uuid) is
  'Écrit les factures comptabilisées sans écritures (avant le lot 10), avec leurs règlements ; liste celles qui ne peuvent pas l''être. service_role.';
revoke all on function public.filed_rattraper_ecritures(uuid) from public, anon, authenticated;
grant execute on function public.filed_rattraper_ecritures(uuid) to service_role;
