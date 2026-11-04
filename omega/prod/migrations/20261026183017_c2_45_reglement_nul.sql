-- 20261026183017 c2_45_reglement_nul
-- Source : dépôt : 28e284a836d43dc8c084243c8b33f90b69f5c53f omega/modules/cashd/migrations/c2_45_reglement_nul.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c2_45_reglement_nul.sql @ 28e284a836d43dc8c084243c8b33f90b69f5c53f ; fichiers de tests ignorés : omega/tests/cashd/c2_45_reglement_nul.sql.
-- ═══ omega/modules/cashd/migrations/c2_45_reglement_nul.sql @ 28e284a836d43dc8c084243c8b33f90b69f5c53f
-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_45 : un règlement de 0 € est refusé avec un message clair et juste (26/10/2026, session C2 — TMOD-05)
-- ═══════════════════════════════════════════════════════════════════════════
-- TMOD-05 : cashd_noter_reglement à 0 € refusait (juste) en répondant « Le montant reçu est positif. », une phrase qui
-- se lit à l'envers. Il répond désormais : « Un règlement de 0 € ou moins ne se note pas : le montant reçu doit être
-- supérieur à 0 €. » Même code (22023), rien d'autre ne change : la fonction est celle de c2_01, recopiée telle quelle.
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE ; revoke execute de public.

-- Noter un règlement (c2_01), avec le refus d'un montant nul ou négatif dit à l'endroit.
create or replace function private.cashd_noter_reglement(p_client uuid, p_compte uuid, p_montant numeric, p_date date, p_reference text,
  p_mode text, p_facture uuid, p_entite uuid, p_libelle text, p_facture_citee text, p_source text, p_source_cle text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  v_entite uuid;
  v_uid uuid;
  c public.cashd_comptes;
  f public.cashd_factures;
  v_id uuid;
  v_cle text;
  v_ref text := nullif(btrim(left(p_reference, 140)), '');
  v_n integer := 0;
begin
  if p_facture is not null then
    select * into f from public.cashd_factures where id = p_facture and client_id = p_client;
    if not found then
      raise exception 'Facture introuvable.' using errcode = 'P0002';
    end if;
  end if;
  if p_compte is not null then
    select * into c from public.cashd_comptes where id = p_compte and client_id = p_client;
    if not found then
      raise exception 'Compte client introuvable.' using errcode = 'P0002';
    end if;
  end if;
  v_entite := coalesce(f.entite_id, c.entite_id, private.cashd_entite(p_client, p_entite));
  v_uid := private.cashd_exiger_gestion(p_client, v_entite);
  perform private.cashd_exiger_installe(p_client);
  if p_montant is null or p_montant <= 0 then
    raise exception 'Un règlement de 0 € ou moins ne se note pas : le montant reçu doit être supérieur à 0 €.' using errcode = '22023';
  end if;
  if p_date is null or p_date > (now() at time zone 'Europe/Paris')::date then
    raise exception 'La date du règlement est connue et n''est pas dans le futur.' using errcode = '22023';
  end if;
  if p_mode is not null and p_mode not in ('virement', 'prelevement', 'cheque', 'carte', 'especes', 'compensation', 'lien_paiement', 'autre') then
    raise exception 'Moyen de règlement inconnu : %.', p_mode using errcode = '22023';
  end if;
  if c.id is not null and f.id is not null and c.id <> f.compte_id then
    raise exception 'La facture nommée n''est pas celle de ce compte.' using errcode = '23514';
  end if;
  v_cle := coalesce(nullif(btrim(p_source_cle), ''),
                    case when v_ref is not null then 'ref:' || lower(v_ref) || '|' || p_date::text || '|' || round(p_montant, 2)::text end);
  if v_cle is not null then
    select r.id into v_id from public.cashd_reglements r where r.client_id = p_client and r.entite_id = v_entite and r.source_cle = v_cle;
    if v_id is not null then
      return jsonb_build_object('reglement', v_id, 'deja_note', true, 'a_imputer', private.cashd_a_imputer(v_id));
    end if;
  end if;
  insert into public.cashd_reglements (client_id, entite_id, compte_id, recu_le, montant, mode, reference, libelle, facture_citee, source, source_cle, note_par)
  values (p_client, v_entite, coalesce(c.id, f.compte_id), p_date, round(p_montant, 2), p_mode, v_ref, nullif(btrim(left(p_libelle, 300)), ''),
          coalesce(f.numero, nullif(btrim(left(p_facture_citee, 80)), '')), coalesce(p_source, 'saisie'), v_cle, v_uid)
  returning id into v_id;
  perform private.journaliser_module(p_client, 'cashd', 'cashd.reglement_note', 'cashd_reglements', v_id::text,
    jsonb_build_object('montant', round(p_montant, 2), 'recu_le', p_date, 'reference', v_ref, 'mode', p_mode,
                       'compte', coalesce(c.reference, (select x.reference from public.cashd_comptes x where x.id = f.compte_id)),
                       'facture', f.numero, 'source', coalesce(p_source, 'saisie')), v_entite);
  if f.id is not null then
    perform private.cashd_imputer(f.id, v_id, null, least(round(p_montant, 2),
      greatest(f.montant_ttc - coalesce((select sum(x.montant) from public.cashd_imputations x where x.facture_id = f.id and x.annulee_le is null), 0), 0)),
      false, 'facture désignée à la saisie');
    v_n := 1;
  else
    v_n := private.cashd_lettrer_auto(v_id);
  end if;
  return jsonb_build_object('reglement', v_id, 'deja_note', false, 'imputations', v_n, 'a_imputer', private.cashd_a_imputer(v_id),
    'compte', (select r.compte_id from public.cashd_reglements r where r.id = v_id));
end $function$;


revoke execute on function private.cashd_noter_reglement(uuid, uuid, numeric, date, text, text, uuid, uuid, text, text, text, text) from public, anon, authenticated;
