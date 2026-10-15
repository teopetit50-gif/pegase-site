-- FILED, lot 28 (a4_36) — une note de frais en devise est soldée à sa valeur d'achat.
--
-- Limite notée à a4_35 : private.filed_ecrire_reglement (texte d'a4_27) cherchait la valeur en euros de la dette sur
-- le compte 401 ; une note de frais la porte au compte du personnel (421 par défaut), et son remboursement en devise
-- était donc soldé au taux du jour, sans écart de change. Le texte d'a4_27 est repris à l'identique, une seule
-- recherche change : elle suit le compte de tiers de la facture (private.filed_compte_tiers, a4_35). Pour une facture
-- ordinaire, rien ne change (401). Généré par gen36.py. Migration idempotente ; aucune suppression.

create or replace function private.filed_ecrire_reglement(p_reglement uuid)
returns integer language plpgsql security definer set search_path to '' as $$
declare
  v_r public.filed_reglements; v_f public.filed_factures; v_four public.filed_fournisseurs; v_x record; v_num integer; v_date date;
  v_four_c record; v_tres record; v_change record; v_journal text; v_jlib text; v_m numeric; v_dev boolean; v_lib text;
  v_taux_f numeric; v_taux_r numeric; v_four_eur numeric; v_tres_eur numeric; v_ecart numeric; v_ref text; v_401 numeric;
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
    v_taux_f := private.filed_taux_facture(v_f);
    v_taux_r := coalesce(private.filed_taux_a(v_f.devise, v_r.regle_le), v_taux_f);
    -- Le fournisseur est soldé à la valeur en euros que l'écriture d'achat lui a donnée, au prorata du payé (a4_27).
    -- Le compte de tiers de la facture : 401, ou celui du personnel pour une note de frais (a4_35, a4_36).
    select sum(e.credit - e.debit) into v_401 from public.filed_ecritures e
     where e.facture_id = v_f.id and e.origine = 'facture' and e.compte_num = (select t.numero from private.filed_compte_tiers(v_f.id) t);
    v_four_eur := case when v_401 is not null and coalesce(v_f.montant_ttc, 0) <> 0 then round(v_m * abs(v_401) / abs(v_f.montant_ttc), 2)
                       when v_taux_f is null then 0 else round(v_m / v_taux_f, 2) end;
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
