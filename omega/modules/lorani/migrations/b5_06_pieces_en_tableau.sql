-- LORANI, lot B5-06 — les pièces réclamées lues en UNE valeur tableau ne sont plus perdues.
--
-- Ce que ça corrige : le lecteur v14 (A1) rend le champ « pieces » d'une demande de pièces en une seule valeur dont
-- la valeur est un tableau (["PCMI 3", "PCMI 6"]) ; private.lorani_valeurs_de_piece la passe en texte
-- ('["PCMI 3", "PCMI 6"]') et private.lorani_propositions, qui attendait une valeur par code, rejetait la chaîne
-- entière : pieces = [] → lorani_deja_saisi (le permis du banc portait déjà []) → 0 proposition. Constaté le 06/10 à
-- 01 h 50 Z sur la recette (demande-pieces-v2.pdf, pièce 059e705e…, diagnostic du coordinateur à 02 h 01 Z) ; c'est
-- aussi pourquoi le premier dépôt (01 h 35 Z) était sorti « aucune ».
--
-- Désormais une fonction pure, private.lorani_codes_pieces(jsonb) → tableau de codes normalisés, dans l'ordre et sans
-- doublon, accepte toutes les formes : une valeur par code (contrat de l'ouvrier, CHAMPS-LECTURE-LORANI.md) ; une
-- valeur tableau jsonb ; une valeur texte qui est un tableau JSON ; une valeur texte « PCMI 3, PCMI 6 » (virgules ou
-- points-virgules). Un élément de tableau peut être un texte ou un objet {valeur|code}. Un JSON illisible est lu
-- comme du texte. Les codes gardent le filtre de b5_05 : (PCMI|DPMI|PC|PA|PD|DP|CU) n[-n].
-- private.lorani_propositions (corps de b5_05) n'appelle plus que cette fonction pour la liste.
-- Décision commune du 06/10 (omega/CHAMPS-LECTURE.md, « Une ligne par champ, jamais deux », A1 9ebefca) : une liste
-- est UNE ligne dont la valeur est un tableau jsonb. private.lorani_valeurs_de_piece (corps de b5_04) remonte donc
-- désormais un tableau tel quel (jsonb) au lieu de sa chaîne JSON ; les valeurs simples restent du texte, comme avant.
-- L'ancienne forme (plusieurs lignes « pieces ») reste lue.
-- Migration idempotente (create or replace), rien n'est retiré.

CREATE OR REPLACE FUNCTION private.lorani_codes_pieces(p jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  e jsonb;
  v_brut jsonb;
  v_dedans jsonb;
  v_morceau text;
  v_code text;
  v_codes jsonb := '[]'::jsonb;
begin
  for e in select x from jsonb_array_elements(case jsonb_typeof(p) when 'array' then p
                                                   when 'object' then jsonb_build_array(p)
                                                   when 'string' then jsonb_build_array(p)
                                                   else '[]'::jsonb end) as t(x) loop
    -- la valeur elle-même : {valeur: …} (forme de lorani_valeurs_de_piece) ou l'élément nu
    v_brut := case when jsonb_typeof(e) = 'object' and e ? 'valeur' then e -> 'valeur' else e end;
    v_dedans := null;
    if jsonb_typeof(v_brut) = 'array' then
      v_dedans := v_brut;
    elsif jsonb_typeof(v_brut) = 'string' and (v_brut #>> '{}') ~ '^\s*\[' then
      begin
        v_dedans := (v_brut #>> '{}')::jsonb;
      exception when others then
        v_dedans := null;
      end;
      if jsonb_typeof(v_dedans) is distinct from 'array' then
        v_dedans := null;
      end if;
    end if;
    for v_morceau in
      select m from (
        select coalesce(y #>> '{valeur}', y #>> '{code}', y #>> '{}') as m, o
        from jsonb_array_elements(coalesce(v_dedans, '[]'::jsonb)) with ordinality as d(y, o)
        where v_dedans is not null
        union all
        select s, o
        from regexp_split_to_table(case when v_dedans is null then v_brut #>> '{}' end, '\s*[,;]\s*') with ordinality as r(s, o)
      ) z order by o
    loop
      if v_morceau ~* '^\s*(PCMI|DPMI|PC|PA|PD|DP|CU)\s*\d{1,2}(\s*-?\s*\d{1,2})?\s*$' then
        v_code := upper(regexp_replace(v_morceau, '\s', '', 'g'));
        if not v_codes ? v_code then
          v_codes := v_codes || to_jsonb(v_code);
        end if;
      end if;
    end loop;
  end loop;
  return v_codes;
end $function$;

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
      select coalesce(jsonb_agg(jsonb_build_object('code', c.code) order by c.rang), '[]'::jsonb)
        into v_pieces
      from jsonb_array_elements_text(private.lorani_codes_pieces(v -> 'pieces')) with ordinality as c(code, rang);
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

CREATE OR REPLACE FUNCTION private.lorani_valeurs_de_piece(p_piece uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with lues as (
    select pv.id, pv.champ,
           case jsonb_typeof(pv.valeur) when 'array' then pv.valeur else to_jsonb(pv.valeur #>> '{}') end as valeur, (pv.verifiee or pv.source = 'humain') as verifiee,
           pv.texte, pv.page, pv.boite, pv.source = 'humain' as humain, pv.cree_le
    from public.pieces_valeurs pv
    where pv.piece_id = p_piece and pv.chiffre is null
  ), simples as (
    select distinct on (l.champ) l.champ,
           jsonb_build_object('valeur', l.valeur, 'verifiee', l.verifiee, 'texte', l.texte, 'page', l.page) as v
    from lues l
    where l.champ <> 'pieces'
    order by l.champ, l.humain desc, l.verifiee desc, l.cree_le desc, l.id
  ), repetes as (
    select l.champ,
           jsonb_agg(jsonb_build_object('valeur', l.valeur, 'verifiee', l.verifiee, 'texte', l.texte, 'page', l.page)
                     order by l.page nulls last,
                              coalesce((l.boite ->> 'y')::numeric, -((l.boite ->> 'y1')::numeric)) nulls last,
                              coalesce((l.boite ->> 'x')::numeric, (l.boite ->> 'x0')::numeric) nulls last,
                              l.cree_le, l.id) as v
    from lues l
    where l.champ = 'pieces'
      and (l.humain or not exists (select 1 from lues h where h.champ = 'pieces' and h.humain))
    group by l.champ
  )
  select coalesce(jsonb_object_agg(x.champ, x.v), '{}'::jsonb)
  from (select * from simples union all select * from repetes) x
$function$;
