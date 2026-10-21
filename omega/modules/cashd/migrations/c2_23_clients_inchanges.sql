-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_23 : un client rejoué à l'identique est « inchangé » (21/10/2026, session C2 — TCASHD-01)
-- ═══════════════════════════════════════════════════════════════════════════
-- Rejouer l'export des clients tel quel répondait « modifiees 14, inchangees 0 » : tout compte connu était réécrit et
-- compté modifié. Désormais, un compte n'est réécrit et compté « modifié » que si l'un des champs lus diffère de ce
-- qui est enregistré ; sinon il est « inchangé », comme les factures et les règlements.
--
-- Règles de pose : create or replace ; jamais de DROP ni de DELETE ; revoke execute de public.

-- Intégrer un import (c2_21) : un compte identique n'est ni réécrit ni compté modifié.
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
  v_visee text;
  v_orphelins jsonb := '[]'::jsonb;
  v_incoherentes jsonb := '[]'::jsonb;
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
        elsif exists (select 1 from jsonb_each(v_res) e
                      where (select to_jsonb(x) -> e.key from public.cashd_comptes x where x.id = v_id) is distinct from e.value) then
          perform private.cashd_ecrire_compte(v_id, p_client, v_res, p_source);
          v_modif := v_modif + 1;
        else
          v_pareil := v_pareil + 1;   -- c2_23 : rien n'a changé, rien n'est réécrit
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
      v_visee := case when v_nature = 'avoir' then private.cashd_facture_visee(l, v_numero) end;           -- c2_20
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
               incoherence = v_incoh, facture_visee = v_visee where id = v_id;
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
        if (f.montant_ttc, f.date_emission, f.echeance, f.reste_du_source, f.compte_id, f.statut, f.incoherence, f.facture_visee)
           is distinct from (case when f.statut in ('litige') then f.montant_ttc else v_ttc end, v_emission, coalesce(v_echeance, f.echeance),
                             case when f.nature in ('facture', 'acompte') then least(v_reste, v_ttc) end, f.compte_id, v_statut, v_incoh, v_visee) then
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
            facture_visee = v_visee,
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
  -- c2_21 : la réponse de l'import dit aussi les pièces au total incohérent, et que leur relance est suspendue.
  if p_jeu = 'factures' then
    select coalesce(jsonb_agg(jsonb_build_object('numero', x.numero, 'compte', c2.reference, 'motif', x.incoherence) order by x.numero), '[]'::jsonb)
      into v_incoherentes
    from public.cashd_factures x join public.cashd_comptes c2 on c2.id = x.compte_id
    where x.client_id = p_client and x.entite_id = p_entite and x.incoherence is not null and x.statut = 'ouverte'
      and (x.nature || ':' || x.numero) = any (v_vus);
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

  -- c2_20 : un avoir qui vise une facture inconnue de ce compte n'est imputé nulle part ; il est dit, ici et sur sa fiche.
  if p_jeu = 'factures' then
    select coalesce(jsonb_agg(jsonb_build_object('numero', a.numero, 'vise', a.facture_visee, 'compte', c2.reference) order by a.numero), '[]'::jsonb)
      into v_orphelins
    from public.cashd_factures a join public.cashd_comptes c2 on c2.id = a.compte_id
    where a.client_id = p_client and a.entite_id = p_entite and a.nature = 'avoir' and a.statut = 'ouverte' and a.facture_visee is not null
      and (a.nature || ':' || a.numero) = any (v_vus)
      and not exists (select 1 from public.cashd_factures y where y.compte_id = a.compte_id and y.nature in ('facture', 'acompte') and y.numero = a.facture_visee);
    update public.cashd_factures a
       set statut_motif = left(format('avoir sur %s, facture inconnue de ce compte : non imputé', a.facture_visee), 500), maj_le = now()
     where a.client_id = p_client and a.entite_id = p_entite and a.nature = 'avoir' and a.statut = 'ouverte'
       and a.numero in (select x ->> 'numero' from jsonb_array_elements(v_orphelins) x)
       and a.statut_motif is distinct from left(format('avoir sur %s, facture inconnue de ce compte : non imputé', a.facture_visee), 500);
    if jsonb_array_length(v_orphelins) > 0 then
      perform private.lever_alerte_module(p_client, 'cashd', 'attention',
        format('Import : %s avoir%s visant une facture inconnue, non imputé%s : %s.', jsonb_array_length(v_orphelins),
               case when jsonb_array_length(v_orphelins) > 1 then 's' else '' end, case when jsonb_array_length(v_orphelins) > 1 then 's' else '' end,
               (select string_agg((x ->> 'numero') || ' sur ' || (x ->> 'vise') || ' (compte ' || (x ->> 'compte') || ')', ' ; ') from jsonb_array_elements(v_orphelins) x)),
        jsonb_build_object('avoirs', v_orphelins, 'origine', p_origine), 'import:avoir_orphelin:' || md5(v_orphelins::text), true, null);
    end if;
  end if;

  perform private.journaliser_module(p_client, 'cashd', 'cashd.import', 'cashd_reglages', p_client::text,
    jsonb_build_object('jeu', p_jeu, 'source', p_source, 'origine', p_origine, 'lignes', k, 'creees', v_cree, 'modifiees', v_modif,
                       'inchangees', v_pareil, 'ecartees', jsonb_array_length(v_ecartees), 'soldees_par_absence', v_soldees,
                       'lettrees', v_lettrees, 'complet', coalesce(p_complet, false)), p_entite);
  return jsonb_build_object('jeu', p_jeu, 'lignes', k, 'creees', v_cree, 'modifiees', v_modif, 'inchangees', v_pareil,
    'soldees_par_absence', v_soldees, 'lettrees', v_lettrees, 'ecartees', v_ecartees, 'avoirs_non_imputes', v_orphelins,
    'incoherentes', v_incoherentes);
end $function$;

revoke execute on function private.cashd_integrer(uuid, uuid, text, jsonb, boolean, text, text) from public, anon, authenticated;
