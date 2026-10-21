-- a4_71 (FILED lot 63) : un taux de TVA inhabituel mais cohérent avec les montants n'arrête plus la facture.
--
-- TFILED-03 (testeur boîte noire, client banc-test-filed, vérifié par le coordinateur dans filed_controles, 21/10/2026) :
-- F3 (MCD-2026-1003, HT 780, TVA 148,20, TTC 928,20, soit 19 % exactement) était bloquée par tva.taux : « Taux de TVA qui
-- n'existe pas en France : 19 % ». La promesse du site (lib/produits/capacites/factures.ts, l. 135-136) : un taux
-- inhabituel mais cohérent passe. Règle de Teo : le site est la cible.
--
--   · Un taux absent de la table des taux français (métropole et DOM), facturé par un fournisseur français, mais
--     COHÉRENT avec les montants donne « tva.taux » en attention, avec l'explication ; incohérent, il reste bloquant. Cohérent : sur chaque ligne de ventilation à ce
--     taux qui porte une base et un montant, base × taux = montant (au centime, un demi-centime de plus par ligne de
--     facture à ce taux, au plus 50 centimes, comme a4_69) ; à défaut de base et de montant, une facture à ce seul taux
--     dont HT × taux = TVA (même tolérance, 2 centimes au moins).
--   · La TVA étrangère facturée par un fournisseur établi hors de France (a4_44) reste bloquante, cohérente ou non :
--     l'acheteur autoliquide normalement, et une TVA étrangère payée ne se déduit pas (décision d'a4_44, gardée).
--   · Les taux français et DOM ne changent pas : un taux légal ailleurs en France reste en attention (a4_44), et
--     l'incohérence montant / taux reste signalée (tva.ventilation, base_taux, a4_69 ; montant.coherence).
-- Repère dans private.filed_controler_facture (le bloc des taux hors table, texte d'a4_44). Rejouable.

create or replace function private.filed_taux_coherents(p_facture uuid, p_taux text[])
returns boolean language plpgsql stable security definer set search_path to '' as $$
declare v_f public.filed_factures; v_avec int; v_faux int; v_taux numeric; v_lignes int;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if v_f.id is null or p_taux is null or cardinality(p_taux) = 0 then return false; end if;
  select count(*) filter (where t.base is not null and t.montant is not null),
         count(*) filter (where t.base is not null and t.montant is not null
                            and abs(round(t.base * t.taux / 100, 2) - t.montant)
                                > greatest(0.01, least(0.50, 0.005 * (select count(*) from public.filed_factures_lignes l
                                                                       where l.facture_id = v_f.id and l.taux_tva = t.taux))))
    into v_avec, v_faux
  from public.filed_factures_tva t
  where t.facture_id = v_f.id and t.taux::text = any (p_taux);
  if v_avec > 0 then
    return v_faux = 0;
  end if;
  -- Sans base ni montant : une facture à un seul taux, HT × taux = TVA.
  if (select count(distinct t.taux) from public.filed_factures_tva t where t.facture_id = v_f.id and t.taux > 0) <> 1
     or v_f.montant_ht is null or v_f.montant_tva is null or v_f.montant_ht = 0 then
    return false;
  end if;
  v_taux := p_taux[1]::numeric;
  select count(*) into v_lignes from public.filed_factures_lignes l where l.facture_id = v_f.id;
  return abs(round(v_f.montant_ht * v_taux / 100, 2) - v_f.montant_tva) <= greatest(0.02, least(0.50, 0.005 * v_lignes));
end $$;
revoke all on function private.filed_taux_coherents(uuid, text[]) from public, anon, authenticated;
grant execute on function private.filed_taux_coherents(uuid, text[]) to service_role;

do $$
declare
  v_def text;
  v_gravite constant text := E'''tva.taux'', ''bloquant'', true,\n            case when coalesce(v_four.pays, ''FR'') not in';
  v_texte constant text := E'|| '' %.'' end, ''TX_TVA_ERR'',';
  v_n1 int; v_n2 int;
begin
  v_def := pg_get_functiondef('private.filed_controler_facture(uuid)'::regprocedure);
  if position('filed_taux_coherents' in v_def) > 0 then
    return;
  end if;
  v_n1 := (length(v_def) - length(replace(v_def, v_gravite, ''))) / length(v_gravite);
  v_n2 := (length(v_def) - length(replace(v_def, v_texte, ''))) / length(v_texte);
  if v_n1 <> 1 or v_n2 <> 1 then
    raise exception 'a4_71 : repères du bloc des taux hors table trouvés % et % fois (1 attendu)', v_n1, v_n2;
  end if;
  v_def := replace(v_def, v_gravite,
    E'''tva.taux'', case when private.filed_taux_coherents(v_f.id, v_hors)   -- a4_71 : cohérent, d''un fournisseur français\n'
    || E'                                         and coalesce(v_four.pays, ''FR'') in (''FR'', ''GP'', ''MQ'', ''GF'', ''RE'', ''YT'', ''PM'', ''BL'', ''MF'')\n'
    || E'                                         and upper(left(coalesce(nullif(v_f.fournisseur_lu ->> ''tva'', ''''), v_four.tva, ''FR''), 2)) = ''FR''\n'
    || E'                                    then ''attention'' else ''bloquant'' end, true,\n'
    || E'            case when coalesce(v_four.pays, ''FR'') not in');
  v_def := replace(v_def, v_texte,
    E'|| '' %.'' || case when private.filed_taux_coherents(v_f.id, v_hors)\n'
    || E'                                     then '' Il est cohérent avec les montants (base × taux = TVA) : taux inhabituel, à vérifier, sans arrêter la facture.''\n'
    || E'                                     else '' Il ne redonne pas la TVA facturée.'' end end, ''TX_TVA_ERR'',');
  execute v_def;
end $$;
