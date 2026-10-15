-- FILED, lot 19 (a4_27) — les champs nouveaux du lecteur v24 : mentions obligatoires, TVA sur les débits, contre-valeur
-- en euros d'une facture en devise.
--
-- Demande du coordinateur (6/10, point a). Le lecteur d'A1 (v24, df07435) rend neuf champs (omega/CHAMPS-LECTURE.md,
-- « TVA sur les débits, devise, conditions de paiement ») : mention.tva_debits, contre_valeur.taux_change,
-- contre_valeur.montant_tva_eur, contre_valeur.montant_ttc_eur, mention.escompte, mention.penalites, penalites.taux,
-- mention.indemnite_recouvrement, indemnite_recouvrement.montant. Le socle ne recopie dans filed_factures.mentions que
-- l'autoliquidation et la franchise : ce lot lit les neuf champs lui-même (private.filed_valeurs) à chaque contrôle.
--
--   private.filed_controles_mentions(facture), appelée par filed_controles_comptables (texte d'a4_24 + un appel) :
--     · recopie les champs dans filed_factures.mentions (tva_debits, escompte, penalites, penalites_taux,
--       indemnite_recouvrement, indemnite_montant, contre_valeur{taux_change, montant_tva_eur, montant_ttc_eur}) ;
--     · facture d'un fournisseur français, quand la lecture permet d'en juger (un des neuf champs rendu, ou le texte des
--       pages) : mentions.penalites et mentions.indemnite absentes = attention (C. com., art. L441-9 et L441-10 ; D441-5 :
--       40 €) ; indemnité chiffrée sous 40 € = attention ; mentions.escompte absente = info ;
--     · tva.debits (info) quand la pièce porte l'option pour la TVA d'après les débits ;
--     · devise.tva_eur : facture en devise avec TVA, sans la TVA en euros sur la pièce = attention (CGI, ann. II,
--       art. 242 nonies A) ; lue et éloignée de plus de 2 % du calcul au taux BCE = attention.
--   private.filed_taux_facture(facture) : le taux (unités de devise pour 1 €, convention BCE) d'une facture en devise :
--     le TTC en euros imprimé, sinon le taux imprimé (dans le sens le plus proche du BCE, à défaut 1/taux comme le
--     ConversionRate du CII), sinon le BCE du jour ; une contre-valeur lue à plus de 10 % du BCE est écartée au profit du BCE.
--   private.filed_ecrire_facture (texte d'a4_22) : ce taux, et la TVA déductible en euros lue sur la pièce quand elle y est.
--   private.filed_ecrire_reglement (texte d'a4_22) : ce taux ; le fournisseur est soldé à la valeur en euros que
--     l'écriture d'achat lui a donnée, au prorata du payé (le lettrage tombe juste, l'écart va au change).
-- Migration idempotente ; aucune suppression.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Lire une valeur
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_valeur_texte(p jsonb)
returns text language sql immutable set search_path to '' as $$
  select nullif(btrim(case jsonb_typeof(p) when 'string' then p #>> '{}' when 'null' then null else p::text end), '')
$$;
create or replace function private.filed_valeur_nombre(p jsonb)
returns numeric language plpgsql immutable set search_path to '' as $$
declare v text;
begin
  if p is null or jsonb_typeof(p) = 'null' then return null; end if;
  if jsonb_typeof(p) = 'number' then return (p #>> '{}')::numeric; end if;
  v := regexp_replace(coalesce(p #>> '{}', ''), '[^0-9,.+-]', '', 'g');
  if v ~ ',' then v := replace(replace(v, '.', ''), ',', '.'); end if;
  if v !~ '^[+-]?[0-9]+(\.[0-9]+)?$' then return null; end if;
  return v::numeric;
exception when others then return null;
end $$;
create or replace function private.filed_valeur_booleen(p jsonb)
returns boolean language sql immutable set search_path to '' as $$
  select case when jsonb_typeof(p) = 'boolean' then (p #>> '{}')::boolean
              when lower(btrim(p #>> '{}')) in ('true', 'vrai', 'oui', '1', 'x') then true
              when lower(btrim(p #>> '{}')) in ('false', 'faux', 'non', '0') then false end
$$;
-- Le texte des pages d'une pièce, en minuscules et sans accents si la base est en UTF-8 (pour reconnaître une mention que le
-- lecteur n'a pas rendue) ; les motifs qui le lisent tolèrent une lettre accentuée restée telle quelle. Seule la colonne
-- texte est lue (jamais texte_chiffre, des pièces chiffrées) ; n est le numéro de page.
create or replace function private.filed_texte_pages(p_piece uuid)
returns text language sql stable security definer set search_path to '' as $$
  select translate(lower(string_agg(pg.texte, ' ' order by pg.n)), 'àâäéèêëîïôöùûüç’''', 'aaaeeeeiioouuuc  ')
    from public.pieces_pages pg where pg.piece_id = p_piece
$$;
revoke all on function private.filed_valeur_texte(jsonb) from public, anon, authenticated;
revoke all on function private.filed_valeur_nombre(jsonb) from public, anon, authenticated;
revoke all on function private.filed_valeur_booleen(jsonb) from public, anon, authenticated;
revoke all on function private.filed_texte_pages(uuid) from public, anon, authenticated;
grant execute on function private.filed_valeur_texte(jsonb), private.filed_valeur_nombre(jsonb), private.filed_valeur_booleen(jsonb) to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Le taux d'une facture en devise
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_taux_facture_detail(p_f public.filed_factures)
returns table (taux numeric, source text) language plpgsql stable security definer set search_path to '' as $$
declare
  v_bce numeric := private.filed_taux_a(p_f.devise, coalesce(p_f.date_emission, current_date));
  v_ttc_eur numeric := private.filed_valeur_nombre(p_f.mentions -> 'contre_valeur' -> 'montant_ttc_eur');
  v_r numeric := private.filed_valeur_nombre(p_f.mentions -> 'contre_valeur' -> 'taux_change');
  v_t numeric; v_s text;
begin
  if coalesce(p_f.devise, 'EUR') = 'EUR' then return query select 1::numeric, 'euro'::text; return; end if;
  if v_ttc_eur > 0 and abs(coalesce(p_f.montant_ttc, 0)) > 0 then
    v_t := round(abs(p_f.montant_ttc) / v_ttc_eur, 8); v_s := 'TTC en euros de la pièce';
  elsif v_r > 0 then
    v_t := case when v_bce is not null and abs(v_r - v_bce) < abs(1 / v_r - v_bce) then v_r else round(1 / v_r, 8) end;
    v_s := 'taux de la pièce';
  end if;
  if v_t is not null and v_bce is not null and abs(v_t - v_bce) > 0.10 * v_bce then
    v_t := null;   -- la contre-valeur lue est trop loin du cours de référence : on garde le BCE
  end if;
  if v_t is null then v_t := v_bce; v_s := case when v_bce is not null then 'BCE' end; end if;
  return query select v_t, v_s;
end $$;
create or replace function private.filed_taux_facture(p_f public.filed_factures)
returns numeric language sql stable set search_path to '' as $$ select taux from private.filed_taux_facture_detail(p_f) $$;
create or replace function private.filed_taux_facture_source(p_f public.filed_factures)
returns text language sql stable set search_path to '' as $$ select source from private.filed_taux_facture_detail(p_f) $$;
revoke all on function private.filed_taux_facture_detail(public.filed_factures) from public, anon, authenticated;
revoke all on function private.filed_taux_facture(public.filed_factures) from public, anon, authenticated;
revoke all on function private.filed_taux_facture_source(public.filed_factures) from public, anon, authenticated;
grant execute on function private.filed_taux_facture(public.filed_factures), private.filed_taux_facture_source(public.filed_factures) to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Les mentions
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_controles_mentions(p_f public.filed_factures)
returns void language plpgsql security definer set search_path to '' as $$
declare
  v_doc public.filed_documents; v_four public.filed_fournisseurs; v jsonb; v_txt text; m jsonb; v_cv jsonb; v_juge boolean;
  v_pen boolean; v_ind boolean; v_esc boolean; v_ind_mt numeric; v_tva_eur numeric; v_bce numeric; v_calc numeric;
  v_id uuid := p_f.id;
  v_champs text[] := array['mention.tva_debits', 'contre_valeur.taux_change', 'contre_valeur.montant_tva_eur', 'contre_valeur.montant_ttc_eur',
                           'mention.escompte', 'mention.penalites', 'penalites.taux', 'mention.indemnite_recouvrement',
                           'indemnite_recouvrement.montant'];
begin
  select * into v_doc from public.filed_documents where id = p_f.document_id;
  if not found then return; end if;
  select * into v_four from public.filed_fournisseurs where id = p_f.fournisseur_id;
  v := coalesce(private.filed_valeurs(v_doc.piece_id), '{}'::jsonb);
  v_txt := private.filed_texte_pages(v_doc.piece_id);

  v_cv := jsonb_strip_nulls(jsonb_build_object(
    'taux_change', private.filed_valeur_nombre(v -> 'contre_valeur.taux_change' -> 'valeur'),
    'montant_tva_eur', private.filed_valeur_nombre(v -> 'contre_valeur.montant_tva_eur' -> 'valeur'),
    'montant_ttc_eur', private.filed_valeur_nombre(v -> 'contre_valeur.montant_ttc_eur' -> 'valeur')));
  m := jsonb_strip_nulls(jsonb_build_object(
    'tva_debits', coalesce(private.filed_valeur_booleen(v -> 'mention.tva_debits' -> 'valeur'),
                           case when v_txt ~ 'd.{0,3}apr.{1,2}s les d.{1,2}bits' then true end),
    'escompte', left(private.filed_valeur_texte(v -> 'mention.escompte' -> 'valeur'), 300),
    'penalites', left(private.filed_valeur_texte(v -> 'mention.penalites' -> 'valeur'), 300),
    'penalites_taux', private.filed_valeur_nombre(v -> 'penalites.taux' -> 'valeur'),
    'indemnite_recouvrement', private.filed_valeur_booleen(v -> 'mention.indemnite_recouvrement' -> 'valeur'),
    'indemnite_montant', private.filed_valeur_nombre(v -> 'indemnite_recouvrement.montant' -> 'valeur'),
    'contre_valeur', nullif(v_cv, '{}'::jsonb)));
  update public.filed_factures
     set mentions = (coalesce(mentions, '{}'::jsonb) - array['tva_debits', 'escompte', 'penalites', 'penalites_taux', 'indemnite_recouvrement',
                                                             'indemnite_montant', 'contre_valeur']) || m
   where id = p_f.id
     and mentions is distinct from (coalesce(mentions, '{}'::jsonb) - array['tva_debits', 'escompte', 'penalites', 'penalites_taux',
                                    'indemnite_recouvrement', 'indemnite_montant', 'contre_valeur']) || m;
  select * into p_f from public.filed_factures where id = v_id;

  -- Les mentions de paiement d'une facture entre professionnels français ; une lecture d'avant le lecteur v24, sans
  -- texte de pages, ne permet pas d'en juger.
  v_juge := (v ?| v_champs) or v_txt is not null;
  if p_f.nature = 'facture' and v_juge and coalesce(v_four.pays, 'FR') = 'FR' then
    v_pen := m ? 'penalites' or m ? 'penalites_taux' or coalesce(v_txt ~ 'p.{1,2}nalit', false);
    v_ind := coalesce((m ->> 'indemnite_recouvrement')::boolean, false) or m ? 'indemnite_montant'
             or coalesce(v_txt ~ '(indemnit.{1,2} forfaitaire|frais de recouvrement)', false);
    v_esc := m ? 'escompte' or coalesce(v_txt ~ 'escompte', false);
    v_ind_mt := (m ->> 'indemnite_montant')::numeric;
    perform private.filed_poser_resultat(p_f, 'mentions.penalites', 'attention', not v_pen,
      case when not v_pen then 'Les conditions des pénalités de retard ne figurent pas sur la facture : mention obligatoire entre professionnels (C. com., art. L441-9 et L441-10).'
           when m ? 'penalites_taux' then format('Pénalités de retard : %s %%.', replace((m ->> 'penalites_taux'), '.', ','))
           else 'Les conditions des pénalités de retard figurent sur la facture.' end,
      'NON_CONFORME', jsonb_build_object('penalites', m -> 'penalites', 'taux', m -> 'penalites_taux'), '');
    perform private.filed_poser_resultat(p_f, 'mentions.indemnite', 'attention', not v_ind or v_ind_mt < 40,
      case when not v_ind then 'L''indemnité forfaitaire pour frais de recouvrement (40 €) ne figure pas sur la facture : mention obligatoire (C. com., art. L441-9 et D441-5).'
           when v_ind_mt < 40 then format('Indemnité forfaitaire de recouvrement de %s : inférieure aux 40 € de l''article D441-5 du code de commerce.', private.filed_montant_texte(v_ind_mt))
           else 'L''indemnité forfaitaire pour frais de recouvrement figure sur la facture.' end,
      'NON_CONFORME', jsonb_build_object('mention', v_ind, 'montant', v_ind_mt), '');
    perform private.filed_poser_resultat(p_f, 'mentions.escompte', 'info', not v_esc,
      case when v_esc then coalesce('Escompte : ' || (m ->> 'escompte') || '.', 'Les conditions d''escompte figurent sur la facture.')
           else 'Les conditions d''escompte ne figurent pas sur la facture (C. com., art. L441-9).' end,
      'NON_CONFORME', jsonb_build_object('escompte', m -> 'escompte'), '');
  end if;

  if coalesce((m ->> 'tva_debits')::boolean, false) then
    perform private.filed_poser_resultat(p_f, 'tva.debits', 'info', false,
      'Le fournisseur a opté pour la TVA d''après les débits : la TVA est déductible dès la facture, sans attendre le paiement.',
      null, jsonb_build_object('tva_debits', true), '');
  end if;

  if coalesce(p_f.devise, 'EUR') <> 'EUR' and coalesce(p_f.montant_tva, 0) <> 0 then
    v_tva_eur := (m -> 'contre_valeur' ->> 'montant_tva_eur')::numeric;
    v_bce := private.filed_taux_a(p_f.devise, coalesce(p_f.date_emission, current_date));
    v_calc := case when v_bce is not null then round(abs(p_f.montant_tva) / v_bce, 2) end;
    if v_tva_eur is null then
      perform private.filed_poser_resultat(p_f, 'devise.tva_eur', 'attention', true,
        format('Facture en %s : le montant de la TVA en euros ne figure pas sur la pièce (CGI, ann. II, art. 242 nonies A) ; la TVA déductible sera calculée au cours %s.',
               p_f.devise, coalesce(private.filed_taux_facture_source(p_f), 'BCE du jour, encore inconnu')),
        'NON_CONFORME', jsonb_build_object('devise', p_f.devise, 'tva_calculee', v_calc), p_f.devise);
    elsif v_calc is not null and abs(v_tva_eur - v_calc) > 0.02 * v_calc then
      perform private.filed_poser_resultat(p_f, 'devise.tva_eur', 'attention', true,
        format('TVA en euros lue : %s ; au cours BCE du jour, elle ferait %s (écart de plus de 2 %%).',
               private.filed_montant_texte(v_tva_eur), private.filed_montant_texte(v_calc)),
        'CALCUL_ERR', jsonb_build_object('devise', p_f.devise, 'tva_eur', v_tva_eur, 'tva_calculee', v_calc, 'taux_bce', v_bce), p_f.devise);
    else
      perform private.filed_poser_resultat(p_f, 'devise.tva_eur', 'attention', false,
        format('TVA en euros lue sur la pièce : %s ; c''est elle qui est déduite.', private.filed_montant_texte(v_tva_eur)),
        null, jsonb_build_object('devise', p_f.devise, 'tva_eur', v_tva_eur, 'tva_calculee', v_calc), p_f.devise);
    end if;
  end if;
end $$;
comment on function private.filed_controles_mentions(public.filed_factures) is
  'Lot 19 (a4_27) : recopie les neuf champs du lecteur v24 dans filed_factures.mentions et contrôle pénalités, indemnité de recouvrement, escompte, TVA sur les débits et TVA en euros d''une facture en devise.';
revoke all on function private.filed_controles_mentions(public.filed_factures) from public, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Le contrôle comptable (texte d'a4_24 + l'appel aux mentions)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_controles_comptables(p_facture uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_exo public.filed_factures_exercices; v_e public.filed_exercices;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found then return; end if;
  perform private.filed_doublon_historique(v_f);
  perform private.filed_controles_mentions(v_f);
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

-- ───────────────────────────────────────────────────────────────────────────
-- 5. L'écriture d'achat (texte d'a4_22 : taux de la facture, TVA en euros lue)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_ecrire_facture(p_facture uuid)
returns integer language plpgsql security definer set search_path to '' as $$
declare
  v_f public.filed_factures; v_four public.filed_fournisseurs; v_doc public.filed_documents; v_x record; v_num integer;
  v_date date; v_sens integer; v_ht numeric; v_tva numeric; v_somme numeric; v_tva_reste numeric; v_tva_ligne numeric;
  v_dev boolean; v_taux numeric; v_lib text; v_four_c record; v_tva_abs record; v_tva_immo record; v_due record; r record;
  v_n integer := 0; v_nb integer; v_lignes jsonb := '[]'::jsonb; l jsonb; v_tva_abs_total numeric := 0; v_tva_immo_total numeric := 0;
  v_auto boolean; v_eur numeric; v_debit_eur numeric := 0; v_k integer := 0; v_nl integer;
  v_tva_eur_lu numeric; v_tva_eur_reste numeric; v_tva_lignes integer;
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
    v_taux := private.filed_taux_facture(v_f);
    if v_taux is null then
      raise exception 'Taux de change % au % inconnu : ni la pièce ni filed_poser_taux_change ne le donnent ; il se pose, puis la facture se comptabilise.',
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
    v_lignes := v_lignes || jsonb_build_object('compte', v_tva_abs.numero, 'lib', v_tva_abs.libelle, 'montant', v_tva_abs_total, 'debit', true, 'tva', true);
  end if;
  if v_tva_immo_total <> 0 then
    v_lignes := v_lignes || jsonb_build_object('compte', v_tva_immo.numero, 'lib', v_tva_immo.libelle, 'montant', v_tva_immo_total, 'debit', true, 'tva', true);
  end if;
  -- Les crédits : la TVA due (autoliquidation), puis le fournisseur pour le reste.
  if v_auto and v_tva <> 0 then
    v_lignes := v_lignes || jsonb_build_object('compte', v_due.numero, 'lib', v_due.libelle, 'montant', v_tva, 'debit', false);
  end if;
  v_lignes := v_lignes || jsonb_build_object('compte', v_four_c.numero, 'lib', v_four_c.libelle, 'aux', true,
    'montant', (select sum((x ->> 'montant')::numeric) from jsonb_array_elements(v_lignes) x where (x ->> 'debit')::boolean)
               - case when v_auto then v_tva else 0 end, 'debit', false);

  -- En euros : chaque débit converti, la TVA due convertie, le fournisseur pour le solde (équilibre exact).
  -- La TVA déductible en euros est celle que la pièce imprime quand elle l'imprime (a4_27, contre_valeur.montant_tva_eur).
  v_nl := jsonb_array_length(v_lignes);
  if v_dev and not v_auto then
    v_tva_eur_lu := nullif(v_f.mentions -> 'contre_valeur' ->> 'montant_tva_eur', '')::numeric;
    if v_tva_eur_lu is not null and (v_tva_eur_lu <= 0 or v_tva_abs_total + v_tva_immo_total <= 0) then v_tva_eur_lu := null; end if;
    v_tva_eur_reste := v_tva_eur_lu;
    v_tva_lignes := (v_tva_abs_total <> 0)::int + (v_tva_immo_total <> 0)::int;
  end if;
  for l in select * from jsonb_array_elements(v_lignes) loop
    v_k := v_k + 1;
    if not v_dev then
      v_eur := (l ->> 'montant')::numeric;
    elsif v_k < v_nl and coalesce((l ->> 'tva')::boolean, false) and v_tva_eur_lu is not null then
      v_eur := case when v_tva_lignes = 1 then v_tva_eur_reste
                    else round(v_tva_eur_lu * (l ->> 'montant')::numeric / (v_tva_abs_total + v_tva_immo_total), 2) end;
      v_tva_eur_reste := v_tva_eur_reste - v_eur; v_tva_lignes := v_tva_lignes - 1;
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
           case when v_dev then format(', %s au taux de %s (%s)%s', v_f.devise, v_taux, private.filed_taux_facture_source(v_f),
                                       case when v_tva_eur_lu is not null then ', TVA en euros lue sur la pièce' else '' end) else '' end),
    jsonb_build_object('ecriture_num', v_num, 'exercice', v_x.cle, 'autoliquidation', v_auto, 'taux', v_taux,
                       'taux_source', case when v_dev then private.filed_taux_facture_source(v_f) end, 'tva_eur_lue', v_tva_eur_lu));
  return v_num;
end $$;
comment on function private.filed_ecrire_facture(uuid) is
  'Écrit au journal des achats (HA) une facture comptabilisée : charges, TVA déductible, TVA autoliquidée, fournisseur ; en euros pour une facture en devise, au taux de la pièce ou du BCE, la TVA en euros lue quand la pièce la donne (a4_22, a4_27).';
revoke all on function private.filed_ecrire_facture(uuid) from public, anon, authenticated;

-- ───────────────────────────────────────────────────────────────────────────
-- 6. L'écriture d'un règlement (texte d'a4_22 : taux de la facture, fournisseur soldé à sa valeur d'achat)
-- ───────────────────────────────────────────────────────────────────────────
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
    select sum(e.credit - e.debit) into v_401 from public.filed_ecritures e
     where e.facture_id = v_f.id and e.origine = 'facture' and e.compte_num = v_four_c.numero;
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
