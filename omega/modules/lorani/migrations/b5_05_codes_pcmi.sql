-- LORANI, lot B5-05 — les pièces réclamées « PCMI 3 », « DPMI 2 » ne sont plus perdues.
--
-- Ce que ça corrige : private.lorani_propositions ne gardait, dans une demande de pièces lue, que les codes
-- ^(PC|PA|PD|DP|CU)\s*\d… ; un permis de construire de maison individuelle réclame des pièces « PCMI n » (et une
-- déclaration préalable de maison individuelle des « DPMI n »), que le filtre jetait. Constaté le 06/10 à 01 h 40 Z
-- sur la recette, par l'écran (omega/recette-b5/courrier-reel.mjs, demande-pieces.pdf, PCMI 3 et PCMI 6) : le lecteur
-- v14 a bien rendu lorani_demande_pieces et cité « PCMI 3 : plan en coupe… », mais la proposition est sortie avec
-- « pieces » = [] et a été confirmée vide (l'écran ne l'exigeait pas : corrigé côté écran dans le même lot).
-- La spécification du lecteur (omega/modules/lorani/CHAMPS-LECTURE-LORANI.md) cite pourtant PCMI2 en exemple.
-- Désormais : (PCMI|DPMI|PC|PA|PD|DP|CU), l'alternance longue d'abord. Seule cette ligne change ; corps du socle
-- photographié (omega/SOCLE-EXTRAITS-LORANI.sql). À comparer avec pg_get_functiondef avant de poser.
-- Migration idempotente (create or replace).

CREATE OR REPLACE FUNCTION private.lorani_propositions(p_type text, p_valeurs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  v jsonb := coalesce(p_valeurs, '{}'::jsonb);
  v_date date;
  v_decision text;
  v_pieces jsonb;
begin
  if p_type = 'lorani_recepisse_depot' then
    v_date := private.lorani_date_lue(v #>> '{date_depot,valeur}');
    if v_date is not null then
      return jsonb_build_array(jsonb_build_object(
        'nature', 'depot', 'champs', jsonb_build_array('date_depot', 'numero_dossier'),
        'valeurs', jsonb_strip_nulls(jsonb_build_object(
          'date_depot', v_date, 'numero', private.lorani_numero_dossier(v #>> '{numero_dossier,valeur}')))));
    end if;
  elsif p_type = 'lorani_lettre_delai' then
    v_date := private.lorani_date_lue(v #>> '{date_lettre,valeur}');
    if (case when v #>> '{delai_mois,valeur}' ~ '^\d{1,2}$'
             then (v #>> '{delai_mois,valeur}')::integer between 1 and 24 else false end) then
      return jsonb_build_array(jsonb_build_object(
        'nature', 'delai_notifie', 'champs', jsonb_build_array('delai_mois', 'date_lettre'),
        'valeurs', jsonb_strip_nulls(jsonb_build_object(
          'delai_notifie_mois', (v #>> '{delai_mois,valeur}')::integer, 'date_notification_delai', v_date))));
    end if;
  elsif p_type = 'lorani_demande_pieces' then
    v_date := private.lorani_date_lue(v #>> '{date_lettre,valeur}');
    if v_date is not null then
      -- Chaque pièce une fois, dans l'ordre de la lettre.
      select coalesce(jsonb_agg(jsonb_build_object('code', y.code) order by y.rang), '[]'::jsonb)
        into v_pieces
      from (select x.code, min(x.rang) as rang
            from (select upper(regexp_replace(e.valeur #>> '{valeur}', '\s', '', 'g')) as code, e.rang
                  from jsonb_array_elements(case jsonb_typeof(v -> 'pieces') when 'array' then v -> 'pieces'
                                                 when 'object' then jsonb_build_array(v -> 'pieces')
                                                 else '[]'::jsonb end) with ordinality as e(valeur, rang)
                  where e.valeur #>> '{valeur}' ~* '^\s*(PCMI|DPMI|PC|PA|PD|DP|CU)\s*\d{1,2}(\s*-?\s*\d{1,2})?\s*$') x
            group by x.code) y;
      return jsonb_build_array(jsonb_build_object(
        'nature', 'demande_pieces', 'champs', jsonb_build_array('date_lettre', 'pieces'),
        'valeurs', jsonb_build_object('date_demande_pieces', v_date, 'pieces', v_pieces)));
    end if;
  elsif p_type = 'lorani_arrete' then
    v_date := private.lorani_date_lue(v #>> '{date_decision,valeur}');
    v_decision := case v #>> '{decision,valeur}'
      when 'accorde' then 'favorable' when 'non_opposition' then 'favorable'
      when 'refuse' then 'defavorable' when 'opposition' then 'defavorable' end;
    if v_date is not null and v_decision is not null then
      return jsonb_build_array(jsonb_build_object(
        'nature', 'decision', 'champs', jsonb_build_array('decision', 'date_decision'),
        'valeurs', jsonb_build_object('decision', v_decision, 'date_decision', v_date)));
    end if;
  elsif p_type = 'lorani_certificat_tacite' then
    v_date := private.lorani_date_lue(v #>> '{date_tacite,valeur}');
    if v_date is not null then
      return jsonb_build_array(jsonb_build_object(
        'nature', 'decision_tacite', 'champs', jsonb_build_array('date_tacite'),
        'valeurs', jsonb_build_object('date_decision', v_date)));
    end if;
  elsif p_type = 'lorani_constat_affichage' then
    v_date := private.lorani_date_lue(v #>> '{date_constat,valeur}');
    if v_date is not null and coalesce(v #>> '{passage,valeur}', '1') = '1' then
      return jsonb_build_array(jsonb_build_object(
        'nature', 'affichage', 'champs', jsonb_build_array('date_constat'),
        'valeurs', jsonb_build_object('date_affichage', v_date)));
    end if;
  end if;
  return '[]'::jsonb;
end $function$
;
