-- a4_69 (FILED lot 61) : les trois écarts réels du banc de référence (a4_62, relevé 4).
--
-- Feu vert de Teo, 21/10/2026. Les cas viennent d'Einvoi, « Jeu de tests Factur-X 1.09.2 » (Licence Ouverte 2.0) :
--   COH-FXC-002  TVA déclarée ≠ base × taux (EN 16931, BR-CO-17) : FILED comparait la somme de la ventilation au total
--                de TVA, pas chaque ligne à sa base × son taux. Désormais, un second résultat de « tva.ventilation »
--                (clé « base_taux ») le vérifie, ligne par ligne : écart au-delà d'un centime (un demi-centime de plus par
--                ligne de facture à ce taux, au plus 50 centimes : l'arrondi ligne à ligne) → attention.
--   COH-FXC-005  Net à payer ≠ TTC − acompte + arrondi (BR-CO-16) : FILED le disait en « info » sans le recalculer.
--                Désormais, quand la facture porte un acompte ou un arrondi, le net doit en être EXACTEMENT le résultat
--                (au demi-centime) ; sinon « montant.net_a_payer » en attention. Sans acompte ni arrondi connus, un net
--                différent du TTC reste l'information d'avant. L'arrondi (BT-114) : colonne filed_factures.montant_arrondi,
--                lue du lecteur (champ « montant_arrondi », à confirmer avec A1) quand elle est vide.
--   COH-FXC-016  Une facture structurée (XML, Factur-X) sans vendeur était rangée chez « Tickets de caisse » (a4_55),
--                et « lecture.complete » passait. Désormais, une pièce structurée n'est jamais un ticket : le vendeur
--                manquant se voit. Structurée : lue en XML par le lecteur (pieces.methode, ou une valeur de source
--                « xml »), ou une pièce XML sans valeur lue par l'IA ou l'OCR.
-- Le banc (filed_banc_scenario) porte aussi l'arrondi d'un scénario. Repères dans filed_controler_facture,
-- filed_reconnaitre_ticket et filed_banc_scenario. Rejouable ; aucune suppression.

alter table public.filed_factures add column if not exists montant_arrondi numeric(14,2);
comment on column public.filed_factures.montant_arrondi is
  'Lot 61 (a4_69) : l''arrondi du net à payer (EN 16931, BT-114), lu sur la pièce ; net à payer = TTC − acompte + arrondi.';

-- ─── 002 : chaque ligne de ventilation, sa base × son taux ─────────────────
create or replace function private.filed_ventilation_base_taux(p_facture uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_ecarts jsonb; v_n int;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  select count(*) into v_n from public.filed_factures_tva t
   where t.facture_id = v_f.id and t.base is not null and t.taux is not null and t.montant is not null;
  if v_n = 0 then return; end if;
  select coalesce(jsonb_agg(jsonb_build_object('taux', t.taux, 'base', t.base, 'montant', t.montant,
                                               'attendu', round(t.base * t.taux / 100, 2)) order by t.taux), '[]'::jsonb)
    into v_ecarts
  from public.filed_factures_tva t
  where t.facture_id = v_f.id and t.base is not null and t.taux is not null and t.montant is not null
    and abs(round(t.base * t.taux / 100, 2) - t.montant)
        > greatest(0.01, least(0.50, 0.005 * (select count(*) from public.filed_factures_lignes l
                                               where l.facture_id = v_f.id and l.taux_tva = t.taux)));
  perform private.filed_poser_resultat(v_f, 'tva.ventilation', 'attention', jsonb_array_length(v_ecarts) > 0,
    case when jsonb_array_length(v_ecarts) = 0 then 'Chaque montant de TVA égale sa base × son taux.'
         else left('Base × taux : ' || (select string_agg(format('à %s %% sur %s, la TVA est %s, la facture dit %s',
                                                                   replace(trim_scale((e ->> 'taux')::numeric)::text, '.', ','),
                                                                   private.filed_montant_texte((e ->> 'base')::numeric),
                                                                   private.filed_montant_texte((e ->> 'attendu')::numeric),
                                                                   private.filed_montant_texte((e ->> 'montant')::numeric)), ' ; ')
                                            from jsonb_array_elements(v_ecarts) e) || '.', 500) end,
    'CALCUL_ERR', jsonb_build_object('ecarts', v_ecarts), 'base_taux');
end $$;
revoke all on function private.filed_ventilation_base_taux(uuid) from public, anon, authenticated;
grant execute on function private.filed_ventilation_base_taux(uuid) to service_role;

-- ─── 005 : net à payer = TTC − acompte + arrondi ──────────────────────────
create or replace function private.filed_controle_net_a_payer(p_facture uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_arrondi numeric; v_piece uuid; v_attendu numeric;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if v_f.net_a_payer is null or v_f.montant_ttc is null then return; end if;
  v_arrondi := v_f.montant_arrondi;
  if v_arrondi is null then
    select d.piece_id into v_piece from public.filed_documents d where d.id = v_f.document_id;
    if v_piece is not null then
      v_arrondi := private.filed_montant_lu(private.filed_valeurs(v_piece) -> 'montant_arrondi' ->> 'valeur');
      if v_arrondi is not null then
        update public.filed_factures set montant_arrondi = v_arrondi where id = v_f.id;
      end if;
    end if;
  end if;
  if v_f.montant_prepaye is null and v_arrondi is null then
    -- Sans acompte ni arrondi connus : l'information d'avant (lot 7).
    if v_f.net_a_payer <> v_f.montant_ttc then
      perform private.filed_poser_resultat(v_f, 'montant.net_a_payer', 'info', true,
        format('Net à payer de %s pour un TTC de %s : un acompte ou un paiement déjà fait est déduit.',
               private.filed_montant_texte(v_f.net_a_payer), private.filed_montant_texte(v_f.montant_ttc)),
        null, jsonb_build_object('net_a_payer', v_f.net_a_payer, 'ttc', v_f.montant_ttc));
    end if;
    return;
  end if;
  v_attendu := v_f.montant_ttc - coalesce(v_f.montant_prepaye, 0) + coalesce(v_arrondi, 0);
  perform private.filed_poser_resultat(v_f, 'montant.net_a_payer', 'attention', abs(v_f.net_a_payer - v_attendu) > 0.005,
    case when abs(v_f.net_a_payer - v_attendu) > 0.005
         then format('Net à payer de %s au lieu de %s : TTC %s − acompte %s%s.', private.filed_montant_texte(v_f.net_a_payer),
                     private.filed_montant_texte(v_attendu), private.filed_montant_texte(v_f.montant_ttc),
                     private.filed_montant_texte(coalesce(v_f.montant_prepaye, 0)),
                     coalesce(' + arrondi ' || private.filed_montant_texte(v_arrondi), ''))
         else format('Net à payer = TTC − acompte%s : %s.', case when v_arrondi is not null then ' + arrondi' else '' end,
                     private.filed_montant_texte(v_f.net_a_payer)) end,
    'CALCUL_ERR', jsonb_build_object('net_a_payer', v_f.net_a_payer, 'ttc', v_f.montant_ttc, 'acompte', v_f.montant_prepaye,
                                     'arrondi', v_arrondi, 'attendu', v_attendu));
end $$;
revoke all on function private.filed_controle_net_a_payer(uuid) from public, anon, authenticated;
grant execute on function private.filed_controle_net_a_payer(uuid) to service_role;

-- ─── 016 : une pièce structurée n'est jamais un ticket ─────────────────────
create or replace function private.filed_piece_structuree(p_piece uuid)
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.pieces p where p.id = p_piece
                  and (to_jsonb(p) ->> 'methode' = 'xml'
                       or exists (select 1 from public.pieces_valeurs v where v.piece_id = p.id and v.source = 'xml')
                       or (lower(p.mime) in ('application/xml', 'text/xml')
                           and not exists (select 1 from public.pieces_valeurs v where v.piece_id = p.id and v.source in ('ia', 'ocr')))))
$$;
revoke all on function private.filed_piece_structuree(uuid) from public, anon, authenticated;
grant execute on function private.filed_piece_structuree(uuid) to service_role;

-- ─── Repères ─────────────────────────────────────────────────────────────
do $$
declare
  v_def text;
  v_n int;
  -- 005 : le bloc « net à payer » du lot 7, remplacé par son contrôle.
  v_net constant text :=
       E'  if v_f.net_a_payer is not null and v_f.montant_ttc is not null and v_f.net_a_payer <> v_f.montant_ttc then\n'
    || E'    perform private.filed_poser_resultat(v_f, ''montant.net_a_payer'', ''info'', true,\n'
    || E'      format(''Net à payer de %s pour un TTC de %s : un acompte ou un paiement déjà fait est déduit.'',\n'
    || E'             private.filed_montant_texte(v_f.net_a_payer), private.filed_montant_texte(v_f.montant_ttc)),\n'
    || E'      null, jsonb_build_object(''net_a_payer'', v_f.net_a_payer, ''ttc'', v_f.montant_ttc));\n'
    || E'  end if;\n';
  -- 002 : après le contrôle de la somme de la ventilation.
  v_vent constant text := E'            ''CALCUL_ERR'', jsonb_build_object(''somme'', v_somme, ''tva'', v_f.montant_tva));\n';
begin
  v_def := pg_get_functiondef('private.filed_controler_facture(uuid)'::regprocedure);
  if position('filed_controle_net_a_payer' in v_def) = 0 then
    v_n := (length(v_def) - length(replace(v_def, v_net, ''))) / length(v_net);
    if v_n <> 1 then raise exception 'a4_69 : repère « net à payer » trouvé % fois (1 attendu)', v_n; end if;
    v_def := replace(v_def, v_net, E'  perform private.filed_controle_net_a_payer(v_f.id);   -- a4_69 : net = TTC − acompte + arrondi (BR-CO-16)\n');
  end if;
  if position('filed_ventilation_base_taux' in v_def) = 0 then
    v_n := (length(v_def) - length(replace(v_def, v_vent, ''))) / length(v_vent);
    if v_n <> 1 then raise exception 'a4_69 : repère « ventilation » trouvé % fois (1 attendu)', v_n; end if;
    v_def := replace(v_def, v_vent, v_vent || E'          perform private.filed_ventilation_base_taux(v_f.id);   -- a4_69 : base × taux (BR-CO-17)\n');
  end if;
  execute v_def;
end $$;

do $$
declare
  v_def text;
  v_n int;
  v_montant constant text := E'    when coalesce(v_f.montant_ht, v_f.montant_ttc) is not null and coalesce(v_f.montant_ht, v_f.montant_ttc) <= v_seuil then true\n';
begin
  v_def := pg_get_functiondef('private.filed_reconnaitre_ticket(uuid)'::regprocedure);
  if position('filed_piece_structuree' in v_def) > 0 then return; end if;
  v_n := (length(v_def) - length(replace(v_def, v_montant, ''))) / length(v_montant);
  if v_n <> 1 then raise exception 'a4_69 : repère de filed_reconnaitre_ticket trouvé % fois (1 attendu)', v_n; end if;
  execute replace(v_def, v_montant,
    E'    when private.filed_piece_structuree(v_doc.piece_id) then false   -- a4_69 : une facture structurée n''est jamais un ticket\n' || v_montant);
end $$;

-- Le banc : l'arrondi d'un scénario.
do $$
declare
  v_def text;
  v_cols constant text := E'echeance_lue, devise, montant_ht, montant_tva, montant_ttc, net_a_payer, montant_prepaye,\n';
  v_vals constant text := E'(x ->> ''net'')::numeric, (x ->> ''prepaye'')::numeric,\n';
  v_n1 int; v_n2 int;
begin
  if to_regprocedure('private.filed_banc_scenario(uuid,jsonb)') is null then return; end if;
  v_def := pg_get_functiondef('private.filed_banc_scenario(uuid,jsonb)'::regprocedure);
  if position('montant_arrondi' in v_def) > 0 then return; end if;
  v_n1 := (length(v_def) - length(replace(v_def, v_cols, ''))) / length(v_cols);
  v_n2 := (length(v_def) - length(replace(v_def, v_vals, ''))) / length(v_vals);
  if v_n1 <> 1 or v_n2 <> 1 then raise exception 'a4_69 : repères de filed_banc_scenario trouvés % et % fois (1 attendu)', v_n1, v_n2; end if;
  v_def := replace(v_def, v_cols, E'echeance_lue, devise, montant_ht, montant_tva, montant_ttc, net_a_payer, montant_prepaye, montant_arrondi,\n');
  v_def := replace(v_def, v_vals, E'(x ->> ''net'')::numeric, (x ->> ''prepaye'')::numeric, (x ->> ''arrondi'')::numeric,\n');
  execute v_def;
end $$;
