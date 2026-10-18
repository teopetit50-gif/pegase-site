-- FILED, lot 14 (a4_22) — les écritures : autoliquidation, contre-valeur en euros, extourne.
--
-- Audit des promesses (§ 2 FILED, n° 3). Remplace, textes d'a4_17 repris et complétés :
--   private.filed_compte_systeme, private.filed_ecrire_facture, private.filed_ecrire_reglement.
--
-- 1. Autoliquidation. Une facture dont le régime de TVA (filed_factures.regime_tva, posé par le contrôle du socle) est
--    `autoliquidation` (sous-traitance du BTP, art. 283-2 nonies du CGI), `intracom` (acquisition intracommunautaire)
--    ou `hors_ue` (service d'un prestataire hors UE), et qui ne porte pas de TVA, voit la TVA calculée au taux normal
--    (20 %) : débit de la TVA déductible (44566, ou 44562 sur une immobilisation ; dans la charge si le compte ne la
--    déduit pas), crédit de la TVA due (4452 pour l'intracommunautaire et le hors UE, 4457 pour l'autoliquidation
--    intérieure). Le fournisseur n'est crédité que du hors taxes.
-- 2. Contre-valeur en euros. public.filed_taux_change (devise, jour, taux : unités de devise pour 1 €, convention BCE)
--    est alimentée par public.filed_poser_taux_change (service_role ; un ouvrier BCE ou une saisie). Une facture en devise
--    s'écrit en euros au taux du jour de sa date (ou du dernier jour connu dans les 10 jours qui précèdent), avec
--    Montantdevise et Idevise ; sans taux, la comptabilisation est refusée (55000) avec le moyen de le poser. Un
--    règlement en devise solde le fournisseur au taux de la facture et sort de la banque au taux du jour du règlement :
--    l'écart va en perte (666) ou en gain (766) de change. Sans taux du jour, le taux de la facture sert.
-- 3. Extourne. public.filed_extourner_facture(p_facture, p_motif) (gérant, admin) : l'écriture d'achat d'une facture
--    comptabilisée est contre-passée (mêmes comptes, sens inversés, nouvelle écriture, filed_ecritures.extourne_de =
--    le numéro contre-passé), la facture revient « validee », historisée et journalisée ; une nouvelle comptabilisation
--    écrit une nouvelle écriture. Les règlements déjà écrits restent.
-- Les nouveaux comptes système (tva_due_intracom 4452, tva_autoliquidee 4457, perte_change 666, gain_change 766) ont
-- leur valeur par défaut ; les rendre réglables demande d'élargir la contrainte de filed_comptes_systeme.role (un drop :
-- à Teo).
-- Migration idempotente ; aucune suppression.

-- ───────────────────────────────────────────────────────────────────────────
-- Les comptes système (texte d'a4_17 + quatre rôles)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_compte_systeme(p_client uuid, p_role text, out numero text, out libelle text)
language sql stable security definer set search_path to '' as $$
  select coalesce(c.numero, d.numero), coalesce(c.libelle, d.libelle)
    from (values ('fournisseurs', '401', 'Fournisseurs'),
                 ('tva_deductible_abs', '44566', 'TVA déductible sur autres biens et services'),
                 ('tva_deductible_immo', '44562', 'TVA déductible sur immobilisations'),
                 ('banque', '512', 'Banque'),
                 ('caisse', '530', 'Caisse'),
                 ('tva_due_intracom', '4452', 'TVA due intracommunautaire'),
                 ('tva_autoliquidee', '4457', 'TVA collectée (autoliquidation)'),
                 ('perte_change', '666', 'Pertes de change'),
                 ('gain_change', '766', 'Gains de change')) d(role, numero, libelle)
    left join public.filed_comptes_systeme c on c.client_id = p_client and c.role = d.role
   where d.role = p_role
$$;
revoke all on function private.filed_compte_systeme(uuid, text) from public, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- Les taux de change
-- ───────────────────────────────────────────────────────────────────────────
create table if not exists public.filed_taux_change (
  devise  text not null check (devise ~ '^[A-Z]{3}$' and devise <> 'EUR'),
  jour    date not null,
  taux    numeric(18,8) not null check (taux > 0),
  source  text not null default 'bce' check (source in ('bce', 'saisie')),
  pose_le timestamptz not null default now(),
  primary key (devise, jour)
);
comment on table public.filed_taux_change is
  'Taux de change de référence : unités de devise pour 1 € (convention BCE), par jour. Sert la contre-valeur en euros des écritures.';
alter table public.filed_taux_change enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_taux_change' and policyname = 'filed_taux_change_lecture') then
    execute 'create policy filed_taux_change_lecture on public.filed_taux_change for select to authenticated using (true)';
  end if;
end $$;
revoke all on table public.filed_taux_change from anon, authenticated;
grant select on public.filed_taux_change to authenticated;

create or replace function public.filed_poser_taux_change(p_devise text, p_jour date, p_taux numeric, p_source text default 'bce')
returns void language plpgsql security definer set search_path to '' as $$
begin
  if upper(coalesce(p_devise, '')) !~ '^[A-Z]{3}$' or upper(p_devise) = 'EUR' then raise exception 'Devise : trois lettres ISO 4217, hors EUR.' using errcode = '22023'; end if;
  if coalesce(p_taux, 0) <= 0 then raise exception 'Un taux de change est positif.' using errcode = '22023'; end if;
  insert into public.filed_taux_change (devise, jour, taux, source) values (upper(p_devise), p_jour, p_taux, coalesce(p_source, 'bce'))
  on conflict (devise, jour) do update set taux = excluded.taux, source = excluded.source, pose_le = now();
end $$;
comment on function public.filed_poser_taux_change(text, date, numeric, text) is
  'Pose le taux de référence d''une devise pour un jour (unités de devise pour 1 €). service_role : ouvrier BCE ou saisie de l''administration.';
revoke all on function public.filed_poser_taux_change(text, date, numeric, text) from public, anon, authenticated;
grant execute on function public.filed_poser_taux_change(text, date, numeric, text) to service_role;

-- Le taux d'une devise à une date : celui du jour, ou du dernier jour connu dans les 10 jours qui précèdent.
create or replace function private.filed_taux_a(p_devise text, p_jour date)
returns numeric language sql stable security definer set search_path to '' as $$
  select t.taux from public.filed_taux_change t
   where t.devise = upper(p_devise) and t.jour <= p_jour and t.jour > p_jour - 10
   order by t.jour desc limit 1
$$;
revoke all on function private.filed_taux_a(text, date) from public, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- L'extourne : la colonne
-- ───────────────────────────────────────────────────────────────────────────
alter table public.filed_ecritures add column if not exists extourne_de integer;
comment on column public.filed_ecritures.extourne_de is 'Écriture de contre-passation : le numéro de l''écriture qu''elle extourne.';

-- La facture a-t-elle une écriture d'achat vivante (écrite et non extournée) ?
create or replace function private.filed_achat_ecrit(p_facture uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.filed_ecritures e
                  where e.facture_id = p_facture and e.origine = 'facture' and e.extourne_de is null
                    and not exists (select 1 from public.filed_ecritures x
                                     where x.facture_id = p_facture and x.origine = 'facture' and x.extourne_de = e.ecriture_num
                                       and x.exercice_cle = e.exercice_cle))
$$;
revoke all on function private.filed_achat_ecrit(uuid) from public, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- L'écriture d'achat
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_ecrire_facture(p_facture uuid)
returns integer language plpgsql security definer set search_path to '' as $$
declare
  v_f public.filed_factures; v_four public.filed_fournisseurs; v_doc public.filed_documents; v_x record; v_num integer;
  v_date date; v_sens integer; v_ht numeric; v_tva numeric; v_somme numeric; v_tva_reste numeric; v_tva_ligne numeric;
  v_dev boolean; v_taux numeric; v_lib text; v_four_c record; v_tva_abs record; v_tva_immo record; v_due record; r record;
  v_n integer := 0; v_nb integer; v_lignes jsonb := '[]'::jsonb; l jsonb; v_tva_abs_total numeric := 0; v_tva_immo_total numeric := 0;
  v_auto boolean; v_eur numeric; v_debit_eur numeric := 0; v_k integer := 0; v_nl integer;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found then return null; end if;
  if private.filed_achat_ecrit(v_f.id) then return null; end if;
  select * into v_four from public.filed_fournisseurs where id = v_f.fournisseur_id;
  select * into v_doc from public.filed_documents where id = v_f.document_id;
  select * into v_x from private.filed_exercice_de(v_f);
  v_sens := case when v_f.nature = 'avoir' then -1 else 1 end;
  v_ht := abs(coalesce(v_f.montant_ht, 0)); v_tva := abs(coalesce(v_f.montant_tva, 0));
  v_dev := coalesce(v_f.devise, 'EUR') <> 'EUR';
  -- Autoliquidation : la TVA n'est pas facturée, l'acheteur la calcule (taux normal) et la déclare.
  v_auto := coalesce(v_f.regime_tva, '') in ('autoliquidation', 'intracom', 'hors_ue') and v_tva = 0;
  if v_auto then v_tva := round(v_ht * 0.20, 2); end if;
  if v_dev then
    v_taux := private.filed_taux_a(v_f.devise, coalesce(v_f.date_emission, current_date));
    if v_taux is null then
      raise exception 'Taux de change % au % inconnu : il se pose par filed_poser_taux_change, puis la facture se comptabilise.',
        v_f.devise, to_char(coalesce(v_f.date_emission, current_date), 'DD/MM/YYYY') using errcode = '55000';
    end if;
  end if;

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
  select * into v_due from private.filed_compte_systeme(v_f.client_id,
    case when v_f.regime_tva = 'autoliquidation' then 'tva_autoliquidee' else 'tva_due_intracom' end);

  -- Les débits, en devise de la facture : charges (ou immobilisations), TVA au prorata ; l'écart d'arrondi va à la dernière.
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
  if v_somme <> v_ht then
    v_lignes := jsonb_set(v_lignes, '{0,montant}', to_jsonb((v_lignes -> 0 ->> 'montant')::numeric + (v_ht - v_somme)));
  end if;
  if v_tva_abs_total <> 0 then
    v_lignes := v_lignes || jsonb_build_object('compte', v_tva_abs.numero, 'lib', v_tva_abs.libelle, 'montant', v_tva_abs_total, 'debit', true);
  end if;
  if v_tva_immo_total <> 0 then
    v_lignes := v_lignes || jsonb_build_object('compte', v_tva_immo.numero, 'lib', v_tva_immo.libelle, 'montant', v_tva_immo_total, 'debit', true);
  end if;
  -- Les crédits : la TVA due (autoliquidation), puis le fournisseur pour le reste.
  if v_auto and v_tva <> 0 then
    v_lignes := v_lignes || jsonb_build_object('compte', v_due.numero, 'lib', v_due.libelle, 'montant', v_tva, 'debit', false);
  end if;
  v_lignes := v_lignes || jsonb_build_object('compte', v_four_c.numero, 'lib', v_four_c.libelle, 'aux', true,
    'montant', (select sum((x ->> 'montant')::numeric) from jsonb_array_elements(v_lignes) x where (x ->> 'debit')::boolean)
               - case when v_auto then v_tva else 0 end, 'debit', false);

  -- En euros : chaque débit converti, la TVA due convertie, le fournisseur pour le solde (équilibre exact).
  v_nl := jsonb_array_length(v_lignes);
  for l in select * from jsonb_array_elements(v_lignes) loop
    v_k := v_k + 1;
    if not v_dev then
      v_eur := (l ->> 'montant')::numeric;
    elsif v_k < v_nl then
      v_eur := round((l ->> 'montant')::numeric / v_taux, 2);
    else
      v_eur := v_debit_eur;
    end if;
    if v_dev then
      v_debit_eur := v_debit_eur + case when (l ->> 'debit')::boolean then v_eur else -v_eur end;
    end if;
    insert into public.filed_ecritures (client_id, entite_id, exercice_id, exercice_cle, journal_code, journal_lib, ecriture_num, ecriture_date,
      compte_num, compte_lib, comp_aux_num, comp_aux_lib, piece_ref, piece_date, ecriture_lib, debit, credit, valid_date,
      montant_devise, idevise, origine, facture_id, document_id)
    values (v_f.client_id, v_f.entite_id, v_x.exercice_id, v_x.cle, 'HA', 'Achats', v_num, v_date,
      l ->> 'compte', left(l ->> 'lib', 200),
      case when (l ->> 'aux')::boolean then coalesce(v_four.code, left(v_four.id::text, 8)) end,
      case when (l ->> 'aux')::boolean then left(v_four.nom, 200) end,
      left(coalesce(v_f.numero, v_doc.reference), 100), coalesce(v_f.date_emission, v_date), v_lib,
      case when ((l ->> 'debit')::boolean) = (v_sens > 0) then v_eur else 0 end,
      case when ((l ->> 'debit')::boolean) <> (v_sens > 0) then v_eur else 0 end,
      current_date,
      case when v_dev then (l ->> 'montant')::numeric * v_sens * case when (l ->> 'debit')::boolean then 1 else -1 end end,
      case when v_dev then v_f.devise end,
      'facture', v_f.id, v_f.document_id);
    v_n := v_n + 1;
  end loop;
  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'ecrite',
    format('Écriture d''achat n° %s passée au journal HA (%s lignes)%s%s.', v_num, v_n,
           case when v_auto then ', TVA autoliquidée' else '' end,
           case when v_dev then format(', %s au taux de %s', v_f.devise, v_taux) else '' end),
    jsonb_build_object('ecriture_num', v_num, 'exercice', v_x.cle, 'autoliquidation', v_auto, 'taux', v_taux));
  return v_num;
end $$;
comment on function private.filed_ecrire_facture(uuid) is
  'Écrit au journal des achats (HA) une facture comptabilisée : charges, TVA déductible, TVA autoliquidée, fournisseur ; en euros au taux du jour pour une facture en devise (a4_22).';
revoke all on function private.filed_ecrire_facture(uuid) from public, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- L'écriture d'un règlement (journal BQ, ou CA pour les espèces), avec l'écart de change ; puis le lettrage
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_ecrire_reglement(p_reglement uuid)
returns integer language plpgsql security definer set search_path to '' as $$
declare
  v_r public.filed_reglements; v_f public.filed_factures; v_four public.filed_fournisseurs; v_x record; v_num integer; v_date date;
  v_four_c record; v_tres record; v_change record; v_journal text; v_jlib text; v_m numeric; v_dev boolean; v_lib text;
  v_taux_f numeric; v_taux_r numeric; v_four_eur numeric; v_tres_eur numeric; v_ecart numeric; v_ref text;
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
  v_ref := left(coalesce(v_r.reference, v_f.numero, 'REGLEMENT'), 100);
  if v_dev then
    v_taux_f := private.filed_taux_a(v_f.devise, coalesce(v_f.date_emission, v_r.regle_le));
    v_taux_r := coalesce(private.filed_taux_a(v_f.devise, v_r.regle_le), v_taux_f);
    v_four_eur := case when v_taux_f is null then 0 else round(v_m / v_taux_f, 2) end;
    v_tres_eur := case when v_taux_r is null then 0 else round(v_m / v_taux_r, 2) end;
  else
    v_four_eur := v_m; v_tres_eur := v_m;
  end if;
  v_ecart := v_tres_eur - v_four_eur;   -- > 0 : payé plus cher en euros (perte) ; < 0 : gain

  -- Un règlement positif solde le fournisseur (débit 401, crédit trésorerie) ; un remboursement d'avoir inverse.
  insert into public.filed_ecritures (client_id, entite_id, exercice_id, exercice_cle, journal_code, journal_lib, ecriture_num, ecriture_date,
    compte_num, compte_lib, comp_aux_num, comp_aux_lib, piece_ref, piece_date, ecriture_lib, debit, credit, valid_date,
    montant_devise, idevise, origine, facture_id, document_id, reglement_id)
  values
    (v_f.client_id, v_f.entite_id, v_x.exercice_id, v_x.cle, v_journal, v_jlib, v_num, v_date, v_four_c.numero, v_four_c.libelle,
     coalesce(v_four.code, left(v_four.id::text, 8)), left(v_four.nom, 200), v_ref, v_r.regle_le, v_lib,
     case when v_r.montant > 0 then v_four_eur else 0 end, case when v_r.montant < 0 then v_four_eur else 0 end, current_date,
     case when v_dev then v_r.montant end, case when v_dev then v_f.devise end, 'reglement', v_f.id, v_f.document_id, v_r.id),
    (v_f.client_id, v_f.entite_id, v_x.exercice_id, v_x.cle, v_journal, v_jlib, v_num, v_date, v_tres.numero, v_tres.libelle,
     null, null, v_ref, v_r.regle_le, v_lib,
     case when v_r.montant < 0 then v_tres_eur else 0 end, case when v_r.montant > 0 then v_tres_eur else 0 end, current_date,
     case when v_dev then -v_r.montant end, case when v_dev then v_f.devise end, 'reglement', v_f.id, v_f.document_id, v_r.id);
  if v_ecart <> 0 then
    select * into v_change from private.filed_compte_systeme(v_f.client_id,
      case when (v_ecart > 0) = (v_r.montant > 0) then 'perte_change' else 'gain_change' end);
    insert into public.filed_ecritures (client_id, entite_id, exercice_id, exercice_cle, journal_code, journal_lib, ecriture_num, ecriture_date,
      compte_num, compte_lib, piece_ref, piece_date, ecriture_lib, debit, credit, valid_date, origine, facture_id, document_id, reglement_id)
    values (v_f.client_id, v_f.entite_id, v_x.exercice_id, v_x.cle, v_journal, v_jlib, v_num, v_date, v_change.numero, v_change.libelle,
      v_ref, v_r.regle_le, left('Écart de change ' || v_lib, 200),
      case when (v_ecart > 0) = (v_r.montant > 0) then abs(v_ecart) else 0 end,
      case when (v_ecart > 0) <> (v_r.montant > 0) then abs(v_ecart) else 0 end,
      current_date, 'reglement', v_f.id, v_f.document_id, v_r.id);
  end if;
  perform private.filed_lettrer_facture(v_f.id);
  return v_num;
end $$;
revoke all on function private.filed_ecrire_reglement(uuid) from public, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- L'extourne
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_extourner_facture(p_facture uuid, p_motif text)
returns integer language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_uid uuid; v_orig record; v_x record; v_num integer; v_date date; v_n integer;
begin
  select * into v_f from public.filed_factures where id = p_facture for update;
  if not found then raise exception 'Facture introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(v_f.client_id, array['gerant', 'admin'], v_f.entite_id);
  if nullif(btrim(p_motif), '') is null or char_length(btrim(p_motif)) < 3 then
    raise exception 'Une extourne dit pourquoi.' using errcode = '22023';
  end if;
  if v_f.statut <> 'comptabilisee' or not private.filed_achat_ecrit(v_f.id) then
    raise exception 'Seule une facture comptabilisée, avec son écriture d''achat, s''extourne (ici : %).', v_f.statut using errcode = '55000';
  end if;
  -- L'écriture d'achat vivante (la dernière non extournée).
  select e.ecriture_num, e.exercice_cle, e.exercice_id into v_orig from public.filed_ecritures e
   where e.facture_id = v_f.id and e.origine = 'facture' and e.extourne_de is null
     and not exists (select 1 from public.filed_ecritures x where x.facture_id = v_f.id and x.extourne_de = e.ecriture_num and x.exercice_cle = e.exercice_cle)
   order by e.id desc limit 1;
  -- La contre-passation se date dans l'exercice ouvert d'aujourd'hui.
  select * into v_x from private.filed_exercice_a_date(v_f.client_id, v_f.entite_id, current_date);
  v_date := private.filed_date_enregistrement(v_x.debut, v_x.fin);
  v_num := private.filed_prochain_numero_ecriture(v_f.client_id, v_f.entite_id, v_x.cle);
  insert into public.filed_ecritures (client_id, entite_id, exercice_id, exercice_cle, journal_code, journal_lib, ecriture_num, ecriture_date,
    compte_num, compte_lib, comp_aux_num, comp_aux_lib, piece_ref, piece_date, ecriture_lib, debit, credit, valid_date,
    montant_devise, idevise, origine, facture_id, document_id, extourne_de)
  select e.client_id, e.entite_id, v_x.exercice_id, v_x.cle, e.journal_code, e.journal_lib, v_num, v_date,
         e.compte_num, e.compte_lib, e.comp_aux_num, e.comp_aux_lib, e.piece_ref, e.piece_date, left('Extourne : ' || e.ecriture_lib, 200),
         e.credit, e.debit, current_date, -e.montant_devise, e.idevise, 'facture', e.facture_id, e.document_id, v_orig.ecriture_num
    from public.filed_ecritures e
   where e.facture_id = v_f.id and e.origine = 'facture' and e.ecriture_num = v_orig.ecriture_num and e.exercice_cle = v_orig.exercice_cle
   order by e.id;
  get diagnostics v_n = row_count;
  update public.filed_factures set statut = 'validee', maj_le = now() where id = v_f.id;
  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'extournee',
    format('Écriture d''achat n° %s extournée par l''écriture n° %s : %s', v_orig.ecriture_num, v_num, left(btrim(p_motif), 300)),
    jsonb_build_object('extournee', v_orig.ecriture_num, 'extourne', v_num, 'lignes', v_n));
  perform private.filed_journaliser(v_f.client_id, 'filed.extourne', 'filed_facture', v_f.id::text,
    jsonb_build_object('extournee', v_orig.ecriture_num, 'extourne', v_num, 'motif', left(btrim(p_motif), 300)), v_f.entite_id);
  return v_num;
end $$;
revoke all on function private.filed_extourner_facture(uuid, text) from public, anon;
grant execute on function private.filed_extourner_facture(uuid, text) to authenticated, service_role;

create or replace function public.filed_extourner_facture(p_facture uuid, p_motif text)
returns integer language sql set search_path to '' as $$ select private.filed_extourner_facture(p_facture, p_motif) $$;
comment on function public.filed_extourner_facture(uuid, text) is
  'Contre-passe l''écriture d''achat d''une facture comptabilisée (gérant, admin) ; la facture revient validée, une nouvelle comptabilisation la réécrit. Rend le numéro de l''extourne.';
revoke all on function public.filed_extourner_facture(uuid, text) from public, anon;
grant execute on function public.filed_extourner_facture(uuid, text) to authenticated, service_role;
