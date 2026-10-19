-- FILED, lot 50 (a4_58) — l'octroi de mer et les taxes hors TVA ; la mention d'exonération (Teo, 19/10 : vraies pièces
-- NOBAT, Guadeloupe ; DOM : Guadeloupe, Martinique, Réunion, Guyane, Mayotte).
--
-- Cas réel : HT 715,40 + TVA 0,26 + octroi de mer 32,05 = TTC 747,71. FILED signalait un écart de 32,05 € et une TVA
-- « sans mention » ou à un taux impossible. Désormais :
--   · le lecteur (A1) rend les taxes hors TVA dans « taxes.autres » : une liste [{code, libelle, base, taux, montant}]
--     (code : OMR — octroi de mer régional —, OMRI — octroi de mer interne —, ou un autre code), comme
--     « tva.ventilation » ; à défaut, « octroi_mer.montant » seul ; et la mention d'exonération dans
--     « mention.exoneration » (vrai, ou le texte de la mention — art. 295 du CGI…) ;
--   · avant les contrôles, FILED les range sur la facture : filed_factures.autres_taxes (la liste) et
--     autres_taxes_montant (leur total), et mentions.exoneration ;
--   · montant.coherence vérifie HT + TVA + autres taxes = TTC, et le dit ;
--   · une mention d'exonération relevée range la facture au régime « exonere » : plus de tva.sans_mention ; et une
--     facture en partie exonérée dont la ventilation n'est pas lue n'est plus bloquée sur son taux moyen (attention).
-- Branchements par repère dans private.filed_controler_facture (texte d'a4_11, après a4_55). Migration idempotente ; aucun DROP,
-- aucune suppression ; aucun envoi.

alter table public.filed_factures add column if not exists autres_taxes jsonb not null default '[]'::jsonb;
alter table public.filed_factures add column if not exists autres_taxes_montant numeric(14,2);

-- Le nombre d'une valeur lue (nombre JSON ou texte à la française).
create or replace function private.filed_nombre_json(p jsonb)
returns numeric language sql immutable set search_path to '' as $$
  select case when p is null or jsonb_typeof(p) = 'null' then null
              when jsonb_typeof(p) = 'number' then (p #>> '{}')::numeric
              else private.filed_montant_lu(p #>> '{}') end
$$;
revoke all on function private.filed_nombre_json(jsonb) from public, anon, authenticated;
grant execute on function private.filed_nombre_json(jsonb) to service_role;

-- Ranger sur la facture les taxes hors TVA et la mention d'exonération lues. Rend vrai si la facture a changé.
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

  if jsonb_typeof(v -> 'taxes.autres' -> 'valeur') = 'array' then
    for e in select * from jsonb_array_elements(v -> 'taxes.autres' -> 'valeur') loop
      if jsonb_typeof(e) <> 'object' then continue; end if;
      v_m := abs(private.filed_nombre_json(e -> 'montant'));
      if v_m is null then continue; end if;
      v_taxes := v_taxes || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
        'code', upper(left(nullif(btrim(e ->> 'code'), ''), 10)), 'libelle', left(nullif(btrim(e ->> 'libelle'), ''), 80),
        'base', abs(private.filed_nombre_json(e -> 'base')), 'taux', private.filed_nombre_json(e -> 'taux'), 'montant', v_m)));
      v_total := v_total + v_m;
    end loop;
  elsif private.filed_nombre_json(v -> 'octroi_mer.montant' -> 'valeur') is not null then
    v_m := abs(private.filed_nombre_json(v -> 'octroi_mer.montant' -> 'valeur'));
    v_taxes := jsonb_build_array(jsonb_build_object('code', 'OCTROI', 'libelle', 'Octroi de mer', 'montant', v_m));
    v_total := v_m;
  end if;

  v_exo := lower(btrim(coalesce(v -> 'mention.exoneration' ->> 'valeur', '')));
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

do $do$
declare
  r record; v_def text; v_n integer; v_change boolean := false;
begin
  v_def := pg_get_functiondef('private.filed_controler_facture(uuid)'::regprocedure);
  for r in select * from (values
    -- 1. Avant les contrôles : les taxes hors TVA et la mention d'exonération.
    -- (après le ticket d'a4_55, pour laisser son texte entier : a4_55 reste rejouable)
    ($o1$  if private.filed_reconnaitre_ticket(v_f.id) then
    select * into v_f from public.filed_factures where id = v_f.id;
  end if;
$o1$,
     $n1$  if private.filed_reconnaitre_ticket(v_f.id) then
    select * into v_f from public.filed_factures where id = v_f.id;
  end if;
  -- a4_58 : l'octroi de mer et les autres taxes hors TVA, la mention d'exonération, rangés sur la facture.
  if private.filed_lire_taxes_mentions(v_f.id) then
    select * into v_f from public.filed_factures where id = v_f.id;
  end if;
$n1$),
    -- 2. Le total : HT + TVA + autres taxes = TTC.
    ($o2$    v_ecart := v_f.montant_ht + v_f.montant_tva - v_f.montant_ttc;
$o2$,
     $n2$    v_ecart := v_f.montant_ht + v_f.montant_tva + coalesce(v_f.autres_taxes_montant, 0) - v_f.montant_ttc;   -- a4_58
$n2$),
    ($o3$           else 'HT + TVA = TTC.' end,
$o3$,
     $n3$           when coalesce(v_f.autres_taxes_montant, 0) <> 0
           then format('HT + TVA + %s (%s) = TTC.',
                       coalesce((select string_agg(coalesce(x ->> 'libelle', x ->> 'code', 'autre taxe'), ', ') from jsonb_array_elements(v_f.autres_taxes) x), 'autres taxes'),
                       private.filed_montant_texte(v_f.autres_taxes_montant))
           else 'HT + TVA = TTC.' end,
$n3$),
    -- 3. La mention d'exonération : régime « exonere », plus de tva.sans_mention.
    ($o4$           or v_four.regime_tva = 'exonere' then 'exonere'$o4$,
     $n4$           or v_four.regime_tva = 'exonere'
           or coalesce((v_f.mentions ->> 'exoneration')::boolean, false) then 'exonere'   -- a4_58$n4$),
    -- 4. Une facture en partie exonérée, sans ventilation lue : son taux moyen n'est plus bloquant.
    ($o5$          perform private.filed_poser_resultat(v_f, 'tva.taux', 'bloquant', true,
            format('Taux moyen de %s %% : aucun taux légal ne redonne cette TVA.',$o5$,
     $n5$          perform private.filed_poser_resultat(v_f, 'tva.taux',
            case when coalesce((v_f.mentions ->> 'exoneration')::boolean, false) then 'attention' else 'bloquant' end, true,   -- a4_58
            format('Taux moyen de %s %% : aucun taux légal ne redonne cette TVA'
                   || case when coalesce((v_f.mentions ->> 'exoneration')::boolean, false)
                           then ' ; une partie est exonérée (mention relevée), la ventilation n''est pas lue.' else '.' end,$n5$)
  ) t(ancien, nouveau)
  loop
    if position(r.nouveau in v_def) > 0 then continue; end if;
    v_n := (length(v_def) - length(replace(v_def, r.ancien, ''))) / length(r.ancien);
    if v_n <> 1 then
      raise exception 'a4_58 : repère trouvé % fois au lieu d''une dans private.filed_controler_facture. Rien n''est posé.', v_n;
    end if;
    v_def := replace(v_def, r.ancien, r.nouveau);
    v_change := true;
  end loop;
  if v_change then
    execute v_def;
    raise notice 'a4_58 : private.filed_controler_facture branchée.';
  else
    raise notice 'a4_58 : private.filed_controler_facture déjà branchée.';
  end if;
end $do$;
