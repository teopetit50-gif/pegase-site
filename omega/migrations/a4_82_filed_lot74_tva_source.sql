-- a4_82 (FILED lot 74) : identite.tva_intracom dit d'où vient le numéro de TVA jugé ; la mention absente de la facture est
-- signalée même quand la fiche du fournisseur porte un numéro (TFILED-24).
--
-- TFILED-24 (testeur boîte noire, banc dddddddd-…-f1, 22/10/2026) : identite.tva_intracom disait « Numéro de TVA FR :
-- Format et clé corrects pour FR » (FR88912345618) alors que la pièce n'imprime AUCUN numéro de TVA : le numéro jugé
-- était celui de la fiche du fournisseur, sans que le message le dise ; et tva.numero se taisait dès que la fiche en
-- avait un, alors que la mention manque sur la facture. Même famille qu'a4_81 (TFILED-21).
--
--   · identite.tva_intracom (numéro de l'Union) : le message nomme la source — lu sur la pièce, ou celui de la fiche ;
--     si la pièce en porte un AUTRE, lu sans être vérifié : bloquant, « à vérifier sur la pièce ».
--   · tva.numero (attention) : « Mention obligatoire absente : numéro de TVA intracommunautaire du vendeur non imprimé sur
--     la facture », que la fiche en porte un ou non (elle le dit alors : il ne remplace pas la mention). Mêmes conditions
--     qu'avant pour le reste (fournisseur en France, au-delà du seuil des mentions, hors franchise).
-- Repères dans private.filed_controles_identite (la branche des numéros de l'Union) et private.filed_controler_facture
-- (tva.numero) ; chaque pose s'arrête si son repère n'est pas trouvé une fois. Rejouable ; aucune suppression.

-- Le numéro de TVA jugé vient-il de la pièce ou de la fiche ? Le message le dit.
create or replace function private.filed_source_tva(p_f public.filed_factures, p_four public.filed_fournisseurs)
returns text language plpgsql stable security definer set search_path to '' as $$
declare
  v_lu text := nullif(upper(regexp_replace(coalesce(p_f.fournisseur_lu ->> 'tva', ''), '[^A-Za-z0-9]', '', 'g')), '');
  v_nv text := private.filed_tva_lue(p_f);
  v_fiche text := nullif(upper(regexp_replace(coalesce(p_four.tva, ''), '[^A-Za-z0-9]', '', 'g')), '');
begin
  if v_lu is not null then return ' Lu sur la pièce.'; end if;
  if v_fiche is null then return ''; end if;
  if v_nv is not null and v_nv <> v_fiche then
    return format(' Celui de la fiche du fournisseur ; la pièce en porte un autre (%s), lu sans être vérifié : à vérifier sur la pièce.', v_nv);
  elsif v_nv = v_fiche then
    return ' Celui de la fiche du fournisseur ; la pièce porte le même, lu sans être vérifié.';
  end if;
  return ' Celui de la fiche du fournisseur : la pièce n''en imprime pas (voir la mention obligatoire).';
end $$;

-- Vrai quand le numéro jugé est celui de la fiche et que la pièce en porte un autre, lu sans être vérifié.
create or replace function private.filed_tva_lue_autre(p_f public.filed_factures, p_four public.filed_fournisseurs)
returns boolean language sql stable security definer set search_path to '' as $$
  select nullif(p_f.fournisseur_lu ->> 'tva', '') is null and private.filed_tva_lue(p_f) is not null
         and nullif(upper(regexp_replace(coalesce(p_four.tva, ''), '[^A-Za-z0-9]', '', 'g')), '') is not null
         and private.filed_tva_lue(p_f) <> upper(regexp_replace(p_four.tva, '[^A-Za-z0-9]', '', 'g'))
$$;

revoke all on function private.filed_source_tva(public.filed_factures, public.filed_fournisseurs) from public, anon, authenticated;
revoke all on function private.filed_tva_lue_autre(public.filed_factures, public.filed_fournisseurs) from public, anon, authenticated;
grant execute on function private.filed_source_tva(public.filed_factures, public.filed_fournisseurs) to service_role;
grant execute on function private.filed_tva_lue_autre(public.filed_factures, public.filed_fournisseurs) to service_role;

create or replace function private.filed_a4_82_remplacer(p_def text, p_ancien text, p_nouveau text, p_nom text)
returns text language plpgsql immutable set search_path to '' as $$
declare v_n int := (length(p_def) - length(replace(p_def, p_ancien, ''))) / length(p_ancien);
begin
  if v_n <> 1 then raise exception 'a4_82 : repère « % » trouvé % fois (1 attendu)', p_nom, v_n; end if;
  return replace(p_def, p_ancien, p_nouveau);
end $$;
revoke all on function private.filed_a4_82_remplacer(text, text, text, text) from public, anon, authenticated;

-- 1. identite.tva_intracom : la source, et le numéro lu confronté à la fiche.
do $$
declare v_def text := pg_get_functiondef('private.filed_controles_identite(uuid)'::regprocedure);
begin
  if position('filed_source_tva' in v_def) > 0 then return; end if;
  execute private.filed_a4_82_remplacer(v_def,
       E'    perform private.filed_poser_resultat(v_f, ''identite.tva_intracom'', ''bloquant'', not v_a.valide,\n'
    || E'      case when v_a.valide then format(''Numéro de TVA %s : %s.'', v_a.pays, v_a.motif)\n'
    || E'           else format(''Numéro de TVA intracommunautaire invalide : %s.'', v_a.motif) end,\n',
       E'    perform private.filed_poser_resultat(v_f, ''identite.tva_intracom'', ''bloquant'',\n'
    || E'      not v_a.valide or private.filed_tva_lue_autre(v_f, v_four),   -- a4_82 : un autre numéro sur la pièce\n'
    || E'      (case when v_a.valide then format(''Numéro de TVA %s : %s.'', v_a.pays, v_a.motif)\n'
    || E'            else format(''Numéro de TVA intracommunautaire invalide : %s.'', v_a.motif) end)\n'
    || E'      || private.filed_source_tva(v_f, v_four),   -- a4_82 : la source\n',
    'identite.tva_intracom (Union)');
end $$;

-- 2. tva.numero : la mention absente de la facture, même quand la fiche porte un numéro.
do $$
declare v_def text := pg_get_functiondef('private.filed_controler_facture(uuid)'::regprocedure);
begin
  if position('a4_82' in v_def) > 0 then return; end if;
  v_def := private.filed_a4_82_remplacer(v_def,
    E'and v_regime not in (''franchise'') and v_four.tva is null and not (v_f.fournisseur_lu ? ''tva'')\n',
    E'and v_regime not in (''franchise'') and not (v_f.fournisseur_lu ? ''tva'')   -- a4_82 : la fiche ne remplace pas la mention\n',
    'condition de tva.numero');
  v_def := private.filed_a4_82_remplacer(v_def,
    E'''Numéro de TVA du fournisseur absent de la facture : mention obligatoire (CGI, art. 242 nonies A), et la TVA déductible en dépend.'',\n',
    E'''Mention obligatoire absente : numéro de TVA intracommunautaire du vendeur non imprimé sur la facture (CGI, art. 242 nonies A) ; la TVA déductible en dépend.''\n'
    || E'        || case when v_four.tva is not null then format('' La fiche du fournisseur en porte un (%s), qui ne remplace pas la mention.'', v_four.tva) else '''' end,\n',
    'message de tva.numero');
  execute v_def;
end $$;
