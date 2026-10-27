-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_17 : un numéro déjà porté par un autre compte, un total incohérent (21/10/2026, session C2)
-- ═══════════════════════════════════════════════════════════════════════════
-- Les deux écarts relevés par le jeu NOBAT (omega/banc/cashd_nobat.sql, recette du 21/10) :
--   1. Un numéro de facture déjà porté par la pièce d'un AUTRE compte mettait à jour cette pièce, sans alerte : la
--      créance du second client disparaissait. Désormais la ligne est écartée à l'import (« numéro déjà porté par la
--      pièce du compte … »), la pièce existante reste intacte, et une alerte le dit.
--   2. Un TTC incohérent était relancé tel quel. Désormais, à l'import, le TTC est contrôlé dès que l'export en donne de
--      quoi : TTC = HT + TVA si la TVA est donnée (montant_tva) ; sinon, si les lignes sont données (lignes : montant_ht,
--      tva en %), contre leur somme (TVA arrondie par taux) ; sinon, avec le seul HT, TTC entre HT et HT + 20 %. Une
--      pièce incohérente est importée mais marquée (cashd_factures.incoherence, motif lisible) ; sa relance est suspendue
--      et une alerte le dit. Un export corrigé lève la marque ; une personne peut aussi la lever (cashd_lever_incoherence).
-- Tolérance : 0,05 € (arrondis par ligne).
--
-- Règles de pose : alter … add column if not exists ; create or replace ; jamais de DROP ni de DELETE ; revoke execute.

alter table public.cashd_factures add column if not exists incoherence text;
do $do$ begin
  if not exists (select 1 from pg_constraint where conname = 'cashd_factures_incoherence_check') then
    alter table public.cashd_factures add constraint cashd_factures_incoherence_check check (char_length(incoherence) <= 300);
  end if;
end $do$;

-- Le contrôle d'un total, sur une ligne d'export. Rend null si cohérent ou invérifiable, sinon le motif.
create or replace function private.cashd_controle_total(l jsonb)
 returns text language plpgsql immutable set search_path to ''
as $function$
declare
  v_ttc numeric := abs(private.cashd_nombre(private.cashd_v(l, 'montant_ttc')));
  v_ht numeric := abs(private.cashd_nombre(private.cashd_v(l, 'montant_ht')));
  v_tva numeric := abs(private.cashd_nombre(private.cashd_v(l, 'montant_tva')));
  v_ht_l numeric; v_tva_l numeric; v_n integer;
begin
  if v_ttc is null then return null; end if;
  if v_ht is not null and v_tva is not null then
    if abs(v_ht + v_tva - v_ttc) > 0.05 then
      return format('TTC %s ≠ HT %s + TVA %s', v_ttc, v_ht, v_tva);
    end if;
    return null;
  end if;
  if jsonb_typeof(l -> 'lignes') = 'array' then
    select count(*) filter (where private.cashd_nombre(x.value ->> 'montant_ht') is not null),
           sum(private.cashd_nombre(x.value ->> 'montant_ht'))
      into v_n, v_ht_l
    from jsonb_array_elements(l -> 'lignes') x;
    if v_n > 0 then
      select coalesce(sum(round(b.base * b.taux / 100, 2)), 0) into v_tva_l
      from (select coalesce(private.cashd_nombre(x.value ->> 'tva'), 0) as taux, sum(private.cashd_nombre(x.value ->> 'montant_ht')) as base
            from jsonb_array_elements(l -> 'lignes') x where private.cashd_nombre(x.value ->> 'montant_ht') is not null
            group by 1) b;
      if v_ht is not null and abs(v_ht - v_ht_l) > 0.05 then
        return format('HT %s ≠ somme des lignes %s', v_ht, v_ht_l);
      end if;
      if abs(v_ht_l + v_tva_l - v_ttc) > 0.05 then
        return format('TTC %s ≠ lignes : HT %s + TVA %s = %s', v_ttc, v_ht_l, v_tva_l, v_ht_l + v_tva_l);
      end if;
      return null;
    end if;
  end if;
  if v_ht is not null and (v_ttc < v_ht - 0.05 or v_ttc > round(v_ht * 1.20, 2) + 0.05) then
    return format('TTC %s hors de HT %s à HT + 20 %%', v_ttc, v_ht);
  end if;
  return null;
end $function$;

-- Lever la marque d'incohérence d'une pièce (le montant est confirmé). Gestion seulement ; daté au journal.
create or replace function public.cashd_lever_incoherence(p_facture uuid, p_motif text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare f public.cashd_factures;
begin
  select * into f from public.cashd_factures where id = p_facture;
  if not found then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  perform private.cashd_exiger_gestion(f.client_id, f.entite_id);
  if nullif(btrim(p_motif), '') is null then
    raise exception 'Dites pourquoi le montant est juste.' using errcode = '22023';
  end if;
  if f.incoherence is null then
    return jsonb_build_object('facture', f.id, 'incoherence', null);
  end if;
  update public.cashd_factures set incoherence = null, maj_le = now() where id = f.id;
  perform private.journaliser_module(f.client_id, 'cashd', 'cashd.incoherence_levee', 'cashd_factures', f.id::text,
    jsonb_build_object('numero', f.numero, 'incoherence', f.incoherence, 'motif', left(p_motif, 500)), f.entite_id);
  return jsonb_build_object('facture', f.id, 'incoherence', null);
end $function$;

-- Intégrer un export (c2_01) : numéro d'un autre compte écarté et signalé ; total contrôlé et marqué.
create or replace function private.cashd_integrer(p_client uuid, p_entite uuid, p_jeu text, p_lignes jsonb, p_complet boolean, p_source text, p_origine text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  l jsonb;
  k integer := 0;
  v_cree integer := 0;
  v_modif integer := 0;
  v_pareil integer := 0;
  v_soldees integer := 0;
  v_ecartees jsonb := '[]'::jsonb;
  v_vus text[] := '{}';
  v_compte uuid;
  v_id uuid;
  f public.cashd_factures;
  v_nature text;
  v_numero text;
  v_ttc numeric;
  v_ht numeric;
  v_reste numeric;
  v_emission date;
  v_echeance date;
  v_statut text;
  v_res jsonb;
  v_lettrees integer := 0;
  g public.cashd_reglages;
  c record;
  v_incoh text;
  v_autre text;
  v_doublons text[] := '{}';
begin
  g := private.cashd_exiger_installe(p_client);
  if p_jeu not in ('clients', 'factures', 'reglements', 'devis') then
    raise exception 'Jeu inconnu : % (clients, factures, reglements, devis).', coalesce(p_jeu, 'vide') using errcode = '22023';
  end if;
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' then
    raise exception 'Les lignes se donnent en tableau.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_lignes) > 20000 then
    raise exception 'Plus de 20 000 lignes : découpez l''export.' using errcode = '22023';
  end if;

  for l in select x.value from jsonb_array_elements(p_lignes) x loop
    k := k + 1;
    begin
      if jsonb_typeof(l) <> 'object' then
        raise exception 'ligne illisible' using errcode = '22023';
      end if;

      if p_jeu = 'clients' then
        if private.cashd_v(l, 'code') is null and private.cashd_v(l, 'nom') is null then
          raise exception 'ni code ni nom' using errcode = '22023';
        end if;
        select x.id into v_id from public.cashd_comptes x
        where x.client_id = p_client and x.entite_id = p_entite and x.reference = left(coalesce(private.cashd_v(l, 'code'), private.cashd_v(l, 'nom')), 80);
        v_res := jsonb_strip_nulls(jsonb_build_object(
          'reference', left(coalesce(private.cashd_v(l, 'code'), private.cashd_v(l, 'nom')), 80),
          'nom', left(coalesce(private.cashd_v(l, 'nom'), private.cashd_v(l, 'code')), 200),
          'groupe', left(private.cashd_v(l, 'groupe'), 200),
          'siren', case when regexp_replace(coalesce(private.cashd_v(l, 'siren'), ''), '\s', '', 'g') ~ '^[0-9]{9}$' then regexp_replace(private.cashd_v(l, 'siren'), '\s', '', 'g') end,
          'pays', case when upper(private.cashd_v(l, 'pays')) ~ '^[A-Z]{2}$' then upper(private.cashd_v(l, 'pays')) end,
          'langue', case when lower(private.cashd_v(l, 'langue')) ~ '^[a-z]{2}$' then lower(private.cashd_v(l, 'langue')) end,
          'devise', case when upper(private.cashd_v(l, 'devise')) ~ '^[A-Z]{3}$' then upper(private.cashd_v(l, 'devise')) end,
          'contact_facturation_nom', left(private.cashd_v(l, 'contact'), 200),
          'contact_facturation_email', case when lower(private.cashd_v(l, 'email')) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(private.cashd_v(l, 'email')) end,
          'contact_facturation_telephone', left(private.cashd_v(l, 'telephone'), 40),
          'contact_commercial_email', case when lower(private.cashd_v(l, 'email_commercial')) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(private.cashd_v(l, 'email_commercial')) end,
          'delai_paiement_jours', case when private.cashd_nombre(private.cashd_v(l, 'delai_paiement')) between 0 and 60 then private.cashd_nombre(private.cashd_v(l, 'delai_paiement'))::integer end,
          'plafond_encours', case when private.cashd_nombre(private.cashd_v(l, 'plafond')) >= 0 then private.cashd_nombre(private.cashd_v(l, 'plafond')) end));
        if v_id is null then
          perform private.cashd_ecrire_compte(null, p_client, v_res || jsonb_build_object('entite_id', p_entite), p_source);
          v_cree := v_cree + 1;
        else
          perform private.cashd_ecrire_compte(v_id, p_client, v_res, p_source);
          v_modif := v_modif + 1;
        end if;
        continue;
      end if;

      if p_jeu = 'reglements' then
        v_ttc := private.cashd_nombre(private.cashd_v(l, 'montant'));
        v_emission := private.cashd_date(private.cashd_v(l, 'date'));
        if v_ttc is null or v_ttc <= 0 then
          raise exception 'montant illisible ou nul' using errcode = '22023';
        end if;
        if v_emission is null then
          raise exception 'date illisible' using errcode = '22023';
        end if;
        v_compte := null;
        if private.cashd_v(l, 'compte_ref') is not null or private.cashd_v(l, 'compte_nom') is not null then
          select x.id into v_compte from public.cashd_comptes x where x.client_id = p_client and x.entite_id = p_entite
            and x.reference = left(coalesce(private.cashd_v(l, 'compte_ref'), private.cashd_v(l, 'compte_nom')), 80);
        end if;
        v_res := private.cashd_noter_reglement(p_client, v_compte, v_ttc, v_emission, private.cashd_v(l, 'reference'),
          private.cashd_mode(private.cashd_v(l, 'mode')), null, p_entite, private.cashd_v(l, 'libelle'), private.cashd_v(l, 'facture_numero'),
          p_source, left(concat_ws('|', 'export', v_emission, round(v_ttc, 2), coalesce(private.cashd_v(l, 'reference'), ''),
                                   coalesce(private.cashd_v(l, 'facture_numero'), ''), coalesce(private.cashd_v(l, 'compte_ref'), '')), 300));
        if (v_res ->> 'deja_note')::boolean then
          v_pareil := v_pareil + 1;
        else
          v_cree := v_cree + 1;
          v_lettrees := v_lettrees + coalesce((v_res ->> 'imputations')::integer, 0);
        end if;
        continue;
      end if;

      -- factures et devis
      v_numero := left(private.cashd_v(l, 'numero'), 80);
      if v_numero is null then
        raise exception 'numéro absent' using errcode = '22023';
      end if;
      v_ttc := private.cashd_nombre(private.cashd_v(l, 'montant_ttc'));
      v_ht := private.cashd_nombre(private.cashd_v(l, 'montant_ht'));
      v_ttc := coalesce(v_ttc, v_ht);
      if v_ttc is null then
        raise exception 'montant illisible' using errcode = '22023';
      end if;
      v_nature := case when p_jeu = 'devis' then 'devis' else private.cashd_nature(private.cashd_v(l, 'nature'), v_ttc) end;
      if v_nature = 'devis' and p_jeu = 'factures' then
        raise exception 'un devis dans l''export des factures' using errcode = '22023';
      end if;
      v_ttc := abs(v_ttc);
      v_ht := abs(v_ht);
      v_reste := abs(private.cashd_nombre(private.cashd_v(l, 'reste_du')));
      v_emission := private.cashd_date(private.cashd_v(l, 'date_emission'));
      if v_emission is null then
        raise exception 'date d''émission illisible' using errcode = '22023';
      end if;
      v_echeance := private.cashd_date(private.cashd_v(l, 'echeance'));
      if v_echeance is not null and v_echeance < v_emission then
        raise exception 'échéance antérieure à l''émission' using errcode = '22023';
      end if;
      v_compte := private.cashd_compte_pour(p_client, p_entite, private.cashd_v(l, 'compte_ref'), private.cashd_v(l, 'compte_nom'), l, p_source);
      if v_compte is null then
        raise exception 'compte client absent' using errcode = '22023';
      end if;
      v_incoh := case when v_nature in ('facture', 'acompte') then private.cashd_controle_total(l) end;   -- c2_17
      v_vus := v_vus || (v_nature || ':' || v_numero);
      select * into f from public.cashd_factures x where x.client_id = p_client and x.entite_id = p_entite and x.nature = v_nature and x.numero = v_numero for update;
      if not found then
        v_id := private.cashd_ecrire_facture(null, p_client, jsonb_strip_nulls(jsonb_build_object(
          'entite_id', p_entite, 'compte_id', v_compte, 'nature', v_nature, 'numero', v_numero, 'date_emission', v_emission,
          'echeance', v_echeance, 'montant_ht', v_ht, 'montant_ttc', v_ttc,
          'devise', case when upper(private.cashd_v(l, 'devise')) ~ '^[A-Z]{3}$' then upper(private.cashd_v(l, 'devise')) end,
          'commande_ref', left(private.cashd_v(l, 'commande_ref'), 80),
          'statut', case when v_nature = 'devis' then coalesce(private.cashd_statut_devis(private.cashd_v(l, 'statut')), 'en_attente') end)), p_source);
        update public.cashd_factures set reste_du_source = case when v_nature in ('facture', 'acompte') then least(v_reste, montant_ttc) end,
               incoherence = v_incoh where id = v_id;
        v_cree := v_cree + 1;
      else
        -- c2_17 : le même numéro sur un autre compte n'écrase pas la pièce existante ; la ligne est écartée et signalée.
        if f.compte_id is distinct from v_compte then
          select x.reference into v_autre from public.cashd_comptes x where x.id = f.compte_id;
          v_doublons := v_doublons || (v_numero || ' (déjà au compte ' || coalesce(v_autre, '?') || ')');
          raise exception 'numéro déjà porté par la pièce du compte % : ligne écartée, la pièce existante est gardée', coalesce(v_autre, '?') using errcode = '23505';
        end if;
        -- La pièce connue : on suit ce que le facturier en dit, sans toucher à ce qu'une personne a décidé ici.
        v_statut := case
          when f.nature = 'devis' then coalesce(private.cashd_statut_devis(private.cashd_v(l, 'statut')), f.statut)
          when f.statut = 'soldee' and f.statut_motif like 'absente de l''export%' and coalesce(v_reste, v_ttc) > 0 then 'ouverte'
          else f.statut end;
        if (f.montant_ttc, f.date_emission, f.echeance, f.reste_du_source, f.compte_id, f.statut, f.incoherence)
           is distinct from (case when f.statut in ('litige') then f.montant_ttc else v_ttc end, v_emission, coalesce(v_echeance, f.echeance),
                             case when f.nature in ('facture', 'acompte') then least(v_reste, v_ttc) end, f.compte_id, v_statut, v_incoh) then
          update public.cashd_factures set
            montant_ttc = case when statut = 'litige' or exists (select 1 from public.cashd_imputations x where (x.facture_id = f.id or x.avoir_id = f.id) and x.annulee_le is null)
                               then montant_ttc else v_ttc end,
            montant_ht = coalesce(v_ht, montant_ht),
            date_emission = v_emission,
            echeance = coalesce(v_echeance, echeance),
            reste_du_source = case when nature in ('facture', 'acompte') then least(v_reste, v_ttc) end,
            statut = v_statut,
            statut_motif = case when v_statut is distinct from f.statut then 'suivi de l''export' else statut_motif end,
            statut_le = case when v_statut is distinct from f.statut then now() else statut_le end,
            incoherence = v_incoh,
            vue_le = now(), maj_le = now()
          where id = f.id;
          v_modif := v_modif + 1;
        else
          update public.cashd_factures set vue_le = now() where id = f.id;
          v_pareil := v_pareil + 1;
        end if;
      end if;
    exception when others then
      if sqlstate = '42501' then
        raise;
      end if;
      v_ecartees := v_ecartees || jsonb_build_object('ligne', k, 'motif', left(sqlerrm, 200));
    end;
  end loop;

  -- L'export complet : les pièces importées qui n'y sont plus sont soldées (ou, pour un devis, sorties du suivi).
  if coalesce(p_complet, false) and p_jeu in ('factures', 'devis') and jsonb_array_length(p_lignes) > 0 then
    for c in
      select x.id, x.nature, x.numero, x.statut from public.cashd_factures x
      where x.client_id = p_client and x.entite_id = p_entite and x.source in ('export', 'import')
        and ((p_jeu = 'factures' and x.nature in ('facture', 'acompte', 'avoir') and x.statut = 'ouverte')
             or (p_jeu = 'devis' and x.nature = 'devis' and x.statut = 'en_attente'))
        and not ((x.nature || ':' || x.numero) = any (v_vus))
    loop
      update public.cashd_factures
         set statut = case when c.nature = 'devis' then 'expire' else 'soldee' end,
             statut_motif = left(format('absente de l''export du %s (%s)', to_char((now() at time zone 'Europe/Paris')::date, 'DD/MM/YYYY'), coalesce(p_origine, p_source)), 500),
             statut_le = now(), maj_le = now()
       where id = c.id;
      perform private.journaliser_module(p_client, 'cashd', 'cashd.piece_sortie_export', 'cashd_factures', c.id::text,
        jsonb_build_object('nature', c.nature, 'numero', c.numero, 'origine', p_origine), p_entite);
      v_soldees := v_soldees + 1;
    end loop;
  end if;

  -- c2_17 : ce qui doit être vu — les numéros en doublon d'un compte à l'autre, les pièces au total incohérent.
  if cardinality(v_doublons) > 0 then
    perform private.lever_alerte_module(p_client, 'cashd', 'attention',
      format('Import : %s ligne%s écartée%s, numéro déjà porté par la facture d''un autre client : %s. Vérifiez la numérotation du facturier.',
             cardinality(v_doublons), case when cardinality(v_doublons) > 1 then 's' else '' end, case when cardinality(v_doublons) > 1 then 's' else '' end,
             array_to_string(v_doublons[1:10], ', ')),
      jsonb_build_object('numeros', to_jsonb(v_doublons[1:50]), 'origine', p_origine), 'import:doublon:' || md5(array_to_string(v_doublons, ',')), true, null);
  end if;
  if p_jeu = 'factures' and exists (select 1 from public.cashd_factures x where x.client_id = p_client and x.entite_id = p_entite and x.incoherence is not null
                                    and x.statut = 'ouverte' and (x.nature || ':' || x.numero) = any (v_vus)) then
    perform private.lever_alerte_module(p_client, 'cashd', 'attention',
      format('Import : %s facture%s au total incohérent, relance suspendue : %s.',
             count(*), case when count(*) > 1 then 's' else '' end, string_agg(x.numero || ' (' || x.incoherence || ')', ' ; ' order by x.numero)),
      jsonb_build_object('factures', jsonb_agg(x.id)), 'import:incoherence:' || md5(string_agg(x.id::text, ',' order by x.id)), true, null)
    from public.cashd_factures x where x.client_id = p_client and x.entite_id = p_entite and x.incoherence is not null
      and x.statut = 'ouverte' and (x.nature || ':' || x.numero) = any (v_vus);
  end if;

  perform private.journaliser_module(p_client, 'cashd', 'cashd.import', 'cashd_reglages', p_client::text,
    jsonb_build_object('jeu', p_jeu, 'source', p_source, 'origine', p_origine, 'lignes', k, 'creees', v_cree, 'modifiees', v_modif,
                       'inchangees', v_pareil, 'ecartees', jsonb_array_length(v_ecartees), 'soldees_par_absence', v_soldees,
                       'lettrees', v_lettrees, 'complet', coalesce(p_complet, false)), p_entite);
  return jsonb_build_object('jeu', p_jeu, 'lignes', k, 'creees', v_cree, 'modifiees', v_modif, 'inchangees', v_pareil,
    'soldees_par_absence', v_soldees, 'lettrees', v_lettrees, 'ecartees', v_ecartees);
end $function$;

-- Préparer les relances (c2_12) : une pièce au total incohérent n'est pas relancée.
create or replace function private.cashd_preparer_relances(p_client uuid, p_jour date, p_par uuid default null)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  g public.cashd_reglages;
  c record;
  f record;
  v_rel uuid;
  v_nature text;
  v_texte jsonb;
  v_pen jsonb;
  v_demande uuid;
  v_dstatut text;
  v_dpolitique uuid;
  v_envoi uuid;
  v_type text;
  v_palier_max text;
  v_rang_max integer;
  v_mot text;
  v_n_prep integer := 0;
  v_n_bloq integer := 0;
  v_n_coupees integer;
  v_mode_envoi text;
  v_interdit text;
  v_erreur text;
  v_canal text;
begin
  select * into g from public.cashd_reglages where client_id = p_client;
  if not found then
    return jsonb_build_object('installe', false);
  end if;
  -- Relire avant d'écrire : ce qui a été réglé depuis hier coupe ce qui était prêt.
  v_n_coupees := private.cashd_verifier_relances(p_client);
  begin
    v_mode_envoi := private.reglages_envois_effectifs(p_client, 'cashd') ->> 'mode';
  exception when others then
    v_mode_envoi := null;
  end;

  foreach v_nature in array array['facture', 'devis'] loop
    for c in
      select x.* from public.cashd_comptes x
      where x.client_id = p_client and x.statut = 'actif' and not x.reciproque
        and not exists (select 1 from public.cashd_relances r where r.compte_id = x.id and r.jour = p_jour and r.nature = v_nature)
        -- un règlement du compte reste à lettrer : la séquence attend l'imputation
        and not (v_nature = 'facture' and exists (select 1 from public.cashd_reglements_etat e where e.compte_id = x.id and e.a_imputer > 0))
      order by x.nom
    loop
      v_rel := null;
      -- Les avoirs ouverts du compte sont déduits avant tout calcul du solde dû : imputés sur ses factures échues, de la
      -- plus ancienne à la plus récente (lettrage automatique, journalisé).
      if v_nature = 'facture' then
        for f in
          select a.id as avoir_id, x.id as facture_id
          from public.cashd_factures a
          cross join lateral (select y.id from public.cashd_factures_etat y
                              where y.compte_id = c.id and y.nature in ('facture', 'acompte') and y.statut = 'ouverte' and y.reste_du > 0
                                and y.echeance < p_jour order by y.echeance, y.numero) x
          where a.compte_id = c.id and a.nature = 'avoir' and a.statut = 'ouverte'
          order by a.date_emission, a.numero
        loop
          continue when private.cashd_reste(f.avoir_id) <= 0.005 or private.cashd_reste(f.facture_id) <= 0.005;
          perform private.cashd_imputer(f.facture_id, null, f.avoir_id, least(private.cashd_reste(f.avoir_id), private.cashd_reste(f.facture_id)), true,
                                        'avoir déduit avant la relance');
        end loop;
      end if;
      for f in
        select s.*, (select x.ordinality from jsonb_array_elements(case when v_nature = 'devis' then g.scenario_devis else coalesce(c.scenario, g.scenario) end)
                     with ordinality x where x.value ->> 'palier' = s.palier_suivant limit 1)::integer as rang
        from public.cashd_suivi s
        where s.compte_id = c.id and s.palier_suivant is not null and s.palier_suivant_le <= p_jour
          and s.etat_sequence in ('pas_encore_relancee', 'en_cours')
          -- le rappel du jour d'échéance ne s'écrit que ce jour-là (c2_10)
          and not (s.palier_suivant = 'echeance' and s.nature <> 'devis' and s.echeance is distinct from p_jour)
          and ((v_nature = 'facture' and s.nature in ('facture', 'acompte') and s.statut = 'ouverte'
                and ((select e.reste_relancable from public.cashd_factures_etat e where e.id = s.facture_id) > private.cashd_seuil_relance(c.entite_id, g.seuil_relance)
                     or exists (select 1 from public.cashd_factures z where z.id = s.facture_id and z.solde_decision = 'reclame'))
                and not exists (select 1 from public.cashd_factures z where z.id = s.facture_id
                                and (z.solde_decision = 'abandonne' or z.attente_commande_le is not null
                                     or z.incoherence is not null)))   -- c2_17 : total incohérent, relance suspendue
               or (v_nature = 'devis' and s.nature = 'devis'))
        order by s.echeance nulls last, s.numero
      loop
        if v_rel is null then
          -- Une relance plus ferme remplace celle du même compte encore en attente : un client ne reçoit jamais deux
          -- messages pour la même dette.
          perform private.cashd_couper(p_client, c.id, null, 'remplacée par la relance du ' || to_char(p_jour, 'DD/MM/YYYY'), false, v_nature, p_jour);
          insert into public.cashd_relances (client_id, entite_id, compte_id, jour, nature, palier, langue, destinataire_adresse, destinataire_nom, statut, prepare_par)
          values (p_client, c.entite_id, c.id, p_jour, v_nature, f.palier_suivant, c.langue, c.contact_facturation_email,
                  coalesce(c.contact_facturation_nom, c.nom), 'preparee', p_par)
          returning id into v_rel;
        end if;
        v_pen := case when v_nature = 'facture' then private.cashd_penalites(f.facture_id, p_jour) else '{}'::jsonb end;
        insert into public.cashd_relances_pieces (client_id, relance_id, facture_id, palier, rang, reste_du, retard_jours, penalites, indemnite)
        values (p_client, v_rel, f.facture_id, f.palier_suivant, f.rang,
                case when v_nature = 'devis' then f.montant_ttc else (select e.reste_relancable from public.cashd_factures_etat e where e.id = f.facture_id) end,
                coalesce((v_pen ->> 'retard_jours')::integer, 0), coalesce((v_pen ->> 'penalites')::numeric, 0), coalesce((v_pen ->> 'indemnite')::numeric, 0));
      end loop;
      continue when v_rel is null;

      -- Le palier du message : le plus ferme de ses factures.
      select p.palier, p.rang into v_palier_max, v_rang_max from public.cashd_relances_pieces p where p.relance_id = v_rel order by p.rang desc limit 1;
      update public.cashd_relances set palier = v_palier_max where id = v_rel;
      v_texte := private.cashd_ecrire_texte(v_rel);
      update public.cashd_relances set sujet = v_texte ->> 'sujet', corps = v_texte ->> 'corps', montant = (v_texte ->> 'montant')::numeric,
             gabarit = v_texte ->> 'gabarit', variante = (v_texte ->> 'variante')::smallint,
             penalites = (v_texte ->> 'penalites')::numeric, indemnites = (v_texte ->> 'indemnites')::numeric, maj_le = now()
       where id = v_rel;

      if c.contact_facturation_email is null then
        update public.cashd_relances set statut = 'sans_adresse', motif = 'le compte n''a pas d''adresse de facturation : relancez-le vous-même ou complétez sa fiche' where id = v_rel;
        perform private.lever_alerte_module(p_client, 'cashd', 'attention',
          format('La relance de %s est écrite mais ne peut pas partir : le compte n''a pas d''adresse de facturation.', c.nom),
          jsonb_build_object('compte', c.id, 'relance', v_rel), 'relance:sans_adresse:' || c.id::text, true, null);
        v_n_bloq := v_n_bloq + 1;
        continue;
      end if;

      -- Les interdits de l'organisation : un message qui en contient un ne part pas.
      v_interdit := null;
      foreach v_mot in array g.interdits loop
        if nullif(btrim(v_mot), '') is not null and position(lower(btrim(v_mot)) in lower((v_texte ->> 'sujet') || ' ' || (v_texte ->> 'corps'))) > 0 then
          v_interdit := v_mot;
          exit;
        end if;
      end loop;
      if v_interdit is not null then
        update public.cashd_relances set statut = 'bloquee', motif = format('le message contient un mot interdit par vos règles : « %s »', v_interdit) where id = v_rel;
        v_n_bloq := v_n_bloq + 1;
        continue;
      end if;
      -- La demande de validation, avec son montant (le seuil de la direction s'y applique).
      v_type := case when v_nature = 'devis' then 'cashd.devis' when v_palier_max = 'mise_en_demeure' then 'cashd.mise_en_demeure'
                    -- les rappels courtois des paliers 1 et 2 : seuls à pouvoir partir sous accord permanent (c2_12)
                    when v_palier_max in ('echeance', 'rappel') then 'cashd.rappel' else 'cashd.relance' end;
      -- La mise en demeure part en lettre recommandée électronique au-delà du seuil réglé (tiers : AR24, branché par le socle).
      v_canal := case when v_type = 'cashd.mise_en_demeure' and g.seuil_lre is not null and (v_texte ->> 'montant')::numeric >= g.seuil_lre then 'lre' else 'email' end;
      update public.cashd_relances set canal = v_canal,
             lien_paiement = (select l.url from public.cashd_relances_pieces x join public.cashd_liens_paiement l on l.facture_id = x.facture_id and l.statut = 'actif'
                              where x.relance_id = v_rel and not x.annulee order by l.cree_le desc limit 1)
       where id = v_rel;
      begin
        insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, montant, payload, echeance, cle_idempotence)
        values (p_client, c.entite_id, 'cashd', v_type, 'cashd_relances', v_rel::text,
          left(case when g.mode = 'essai' then 'Essai — ' else '' end
               || case v_type when 'cashd.mise_en_demeure' then 'Mise en demeure' when 'cashd.devis' then 'Relance de devis' when 'cashd.rappel' then 'Rappel' else 'Relance' end
               || ' : ' || c.nom || ', ' || private.cashd_eur((v_texte ->> 'montant')::numeric), 500),
          case when v_nature = 'devis' then null else (v_texte ->> 'montant')::numeric end,
          jsonb_build_object('relance', v_rel, 'canal', v_canal, 'mode', g.mode, 'palier', v_palier_max,
            'destinataire', jsonb_build_object('nom', coalesce(c.contact_facturation_nom, c.nom), 'adresse', c.contact_facturation_email),
            'compte', jsonb_build_object('id', c.id, 'nom', c.nom, 'reference', c.reference),
            'sujet', v_texte ->> 'sujet', 'corps', v_texte ->> 'corps',
            'penalites', (v_texte ->> 'penalites')::numeric, 'indemnites', (v_texte ->> 'indemnites')::numeric,
            'exigences', case when v_type = 'cashd.mise_en_demeure' then jsonb_build_object('commentaire', true) else '{}'::jsonb end),
          (p_jour + 7)::timestamptz, 'cashd:relance:' || v_rel::text)
        returning id, statut, politique_id into v_demande, v_dstatut, v_dpolitique;
      exception when others then
        v_erreur := left(sqlstate || ' ' || sqlerrm, 400);
        update public.cashd_relances set statut = 'echec', motif = left('la demande de validation n''a pas pu être déposée : ' || v_erreur, 500) where id = v_rel;
        perform private.lever_alerte_module(p_client, 'cashd', 'critique', format('La relance de %s n''a pas pu entrer dans la file de validation.', c.nom),
          jsonb_build_object('relance', v_rel, 'erreur', v_erreur), 'relance:echec:' || v_rel::text, true, null);
        v_n_bloq := v_n_bloq + 1;
        continue;
      end;
      update public.cashd_relances set demande_id = v_demande, statut = 'a_valider', maj_le = now() where id = v_rel;
      -- Toute relance écrite et déposée dans la file est au journal, quel que soit le réglage d'envoi.
      perform private.journaliser_module(p_client, 'cashd', 'cashd.relance_preparee', 'cashd_relances', v_rel::text,
        jsonb_build_object('compte', c.reference, 'palier', v_palier_max, 'montant', (v_texte ->> 'montant')::numeric, 'pieces', (v_texte ->> 'pieces')::integer,
                           'demande', v_demande, 'jour', p_jour), c.entite_id);

      -- La mise en demeure exige une validation explicite : un accord permanent ne la couvre jamais.
      if v_type = 'cashd.mise_en_demeure' and v_dstatut = 'approuvee' and v_dpolitique is not null then
        update public.cashd_relances set statut = 'bloquee',
          motif = 'un accord permanent l''a approuvée d''office : une mise en demeure exige une validation explicite, elle n''est pas préparée' where id = v_rel;
        perform private.lever_alerte_module(p_client, 'cashd', 'attention',
          format('La mise en demeure de %s n''a pas été préparée : un accord permanent couvre les relances CASHD, et une mise en demeure exige une validation explicite.', c.nom),
          jsonb_build_object('relance', v_rel, 'politique', v_dpolitique), 'relance:med_accord:' || v_rel::text, true, null);
        v_n_bloq := v_n_bloq + 1;
        continue;
      end if;

      -- Seuls les rappels des paliers 1 et 2 partent sous accord permanent (c2_12) : toute autre relance approuvée d'office
      -- (relance ferme, devis) est retenue.
      if v_type not in ('cashd.rappel', 'cashd.mise_en_demeure') and v_dstatut = 'approuvee' and v_dpolitique is not null then
        update public.cashd_relances set statut = 'bloquee',
          motif = 'un accord permanent l''a approuvée d''office : seuls les rappels des paliers 1 et 2 partent sans validation, elle n''est pas préparée' where id = v_rel;
        perform private.lever_alerte_module(p_client, 'cashd', 'attention',
          format('La relance de %s n''a pas été préparée : un accord permanent l''approuvait d''office, et seuls les rappels courtois partent sans validation.', c.nom),
          jsonb_build_object('relance', v_rel, 'politique', v_dpolitique), 'relance:accord_hors_rappel:' || v_rel::text, true, null);
        v_n_bloq := v_n_bloq + 1;
        continue;
      end if;

      -- Le message, adossé à la demande : il ne part que si elle est approuvée.
      if v_mode_envoi is null then
        update public.cashd_relances set statut = 'non_reglee',
          motif = 'l''envoi par courriel n''est pas encore réglé pour CASHD : la relance est écrite et validable, l''envoi viendra une fois le réglage posé' where id = v_rel;
        v_n_prep := v_n_prep + 1;
        continue;
      end if;
      begin
        v_envoi := private.preparer_envoi(p_client, 'cashd', 'cashd_relances', v_rel::text, v_canal,
          jsonb_build_object('adresse', c.contact_facturation_email, 'nom', coalesce(c.contact_facturation_nom, c.nom), 'ref', c.reference,
                             'professionnel', not c.particulier, 'langue', c.langue),
          null, '{}'::jsonb, v_texte ->> 'sujet', v_texte ->> 'corps', null::uuid[], 'cashd:relance:' || v_rel::text, c.entite_id, true, false,
          null::timestamptz, jsonb_build_object('demande', v_demande));
        update public.cashd_relances set envoi_id = v_envoi, maj_le = now() where id = v_rel;
        v_n_prep := v_n_prep + 1;
      exception when others then
        v_erreur := left(sqlstate || ' ' || sqlerrm, 400);
        update public.cashd_relances set motif = left('le message n''a pas pu être préparé : ' || v_erreur, 500) where id = v_rel;
        perform private.lever_alerte_module(p_client, 'cashd', 'critique', format('Le message de relance de %s n''a pas pu être préparé ; la demande reste dans la file.', c.nom),
          jsonb_build_object('relance', v_rel, 'erreur', v_erreur), 'relance:envoi:' || v_rel::text, true, null);
        v_n_bloq := v_n_bloq + 1;
      end;
    end loop;
  end loop;
  perform private.battre(p_client, 'cashd_relances', jsonb_build_object('jour', p_jour, 'preparees', v_n_prep), interval '1 day');
  return jsonb_build_object('jour', p_jour, 'preparees', v_n_prep, 'bloquees', v_n_bloq, 'coupees', v_n_coupees, 'mode_envoi', v_mode_envoi);
end $function$;


revoke execute on function private.cashd_controle_total(jsonb) from public, anon, authenticated;
revoke execute on function private.cashd_integrer(uuid, uuid, text, jsonb, boolean, text, text) from public, anon, authenticated;
grant execute on function private.cashd_integrer(uuid, uuid, text, jsonb, boolean, text, text) to service_role;
revoke execute on function private.cashd_preparer_relances(uuid, date, uuid) from public, anon, authenticated;
revoke execute on function public.cashd_lever_incoherence(uuid, text) from public, anon;
grant execute on function public.cashd_lever_incoherence(uuid, text) to authenticated, service_role;
