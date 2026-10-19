-- FILED, lot 51 (a4_59) — a4_58 lit les noms de champs d'A1 (27e59bdb, 19/10) : « taxes.hors_tva »
-- = [{nature : OMR | OMRI | autre, libelle, base, taux, montant}] et « mention.exoneration_tva ». Les noms d'a4_58
-- (« taxes.autres » avec « code », « octroi_mer.montant », « mention.exoneration ») restent lus en repli.
-- Rien d'autre ne change : montant.coherence (HT + TVA + taxes hors TVA = TTC), le régime « exonere » et le taux moyen
-- en attention viennent d'a4_58. Les autres changements d'A1 n'appellent rien ici : montant_tva ne compte plus que
-- la TVA (c'est ce qu'a4_58 suppose), fournisseur.siren est lu du RCS (contrôlé comme avant), un IBAN masqué
-- (verifiee = false) ne passe ni le format ni la clé et n'est donc jamais repris sur la facture (a4_10).
-- Seule private.filed_lire_taxes_mentions est reposée (texte d'a4_58, trois lignes changées). Migration idempotente ;
-- aucun DROP, aucune suppression ; aucun envoi.

create or replace function private.filed_lire_taxes_mentions(p_facture uuid)
returns boolean language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_doc public.filed_documents; v jsonb; v_taxes jsonb := '[]'::jsonb; e jsonb; v_total numeric := 0;
        v_m numeric; v_exo text; v_exo_b boolean; v_mentions jsonb; v_signe integer;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found then return false; end if;
  select * into v_doc from public.filed_documents where id = v_f.document_id;
  if v_doc.piece_id is null then return false; end if;
  v := coalesce(private.filed_valeurs(v_doc.piece_id), '{}'::jsonb);
  v_signe := case when v_f.nature = 'avoir' then -1 else 1 end;

  -- Les noms d'A1 d'abord (« taxes.hors_tva », la nature tient lieu de code), puis ceux d'a4_58 en repli.
  if jsonb_typeof(coalesce(v -> 'taxes.hors_tva' -> 'valeur', v -> 'taxes.autres' -> 'valeur')) = 'array' then
    for e in select * from jsonb_array_elements(coalesce(v -> 'taxes.hors_tva' -> 'valeur', v -> 'taxes.autres' -> 'valeur')) loop
      if jsonb_typeof(e) <> 'object' then continue; end if;
      v_m := abs(private.filed_nombre_json(e -> 'montant'));
      if v_m is null then continue; end if;
      v_taxes := v_taxes || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
        'code', upper(left(nullif(btrim(coalesce(e ->> 'nature', e ->> 'code')), ''), 10)), 'libelle', left(nullif(btrim(e ->> 'libelle'), ''), 80),
        'base', abs(private.filed_nombre_json(e -> 'base')), 'taux', private.filed_nombre_json(e -> 'taux'), 'montant', v_m)));
      v_total := v_total + v_m;
    end loop;
  elsif private.filed_nombre_json(v -> 'octroi_mer.montant' -> 'valeur') is not null then
    v_m := abs(private.filed_nombre_json(v -> 'octroi_mer.montant' -> 'valeur'));
    v_taxes := jsonb_build_array(jsonb_build_object('code', 'OCTROI', 'libelle', 'Octroi de mer', 'montant', v_m));
    v_total := v_m;
  end if;

  v_exo := lower(btrim(coalesce(v -> 'mention.exoneration_tva' ->> 'valeur', v -> 'mention.exoneration' ->> 'valeur', '')));
  v_exo_b := case when v_exo in ('', 'false', 'faux', 'non', '0', 'null') then false else true end;
  v_mentions := coalesce(v_f.mentions, '{}'::jsonb);
  v_mentions := case when v_exo_b then v_mentions || jsonb_build_object('exoneration', true) else v_mentions - 'exoneration' end;

  if v_taxes is not distinct from v_f.autres_taxes
     and (case when jsonb_array_length(v_taxes) > 0 then v_total end) is not distinct from v_f.autres_taxes_montant
     and v_mentions is not distinct from v_f.mentions then
    return false;
  end if;
  update public.filed_factures
     set autres_taxes = v_taxes, autres_taxes_montant = case when jsonb_array_length(v_taxes) > 0 then v_total end, mentions = v_mentions
   where id = v_f.id;
  return true;
end $$;
revoke all on function private.filed_lire_taxes_mentions(uuid) from public, anon, authenticated;
grant execute on function private.filed_lire_taxes_mentions(uuid) to service_role;
