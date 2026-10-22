-- 20261021204757 c2_32+a4_75_filed_lot67_bloquant_apres_validation
-- Source : dépôt : 5707e1fb omega/migrations/a4_75_filed_lot67_bloquant_apres_validation.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_75_filed_lot67_bloquant_apres_validation.sql @ 5707e1fb ; c2_32 cité pour un état de test : ignoré ; a4_63 cité comme test : ignoré.
-- ═══ omega/migrations/a4_75_filed_lot67_bloquant_apres_validation.sql @ 5707e1fb
-- a4_75 (FILED lot 67) : un bloquant qui apparaît après la validation n'est plus couvert par elle.
--
-- TFILED-14 (testeur boîte noire, client banc-test-filed, vérifié par le coordinateur, 21/10/2026) : F1 (QDM-2026-1001)
-- validée à 20:32Z ; le recontrôle de 20:40:37Z y pose trois bloquants (identite.siren, identite.tva_intracom,
-- identite.registre, a4_74). filed_controler_facture rendait pourtant « validee » (le statut d'une facture validée
-- restait, lot 4) : aucune demande, aucune alerte, rien dans filed_pieces_en_cours, et la facture restait exportable
-- vers le paiement, alors que le message promet « une personne vérifie ce fournisseur avant tout paiement ».
--
--   · Une facture validée, NON réglée (aucune ligne dans filed_reglements), qui reçoit un bloquant au recontrôle,
--     reprend le statut que donnent ses contrôles (« bloquee », ou « a_completer » / « ecartee ») : elle sort de
--     l'échéancier, du décaissement et des exports de paiement (qui ne lisent que « validee »), et compte dans les
--     pièces en cours. Sa validation est caduque (filed_validations.caduque_le, caduque_motif : la décision approuvée
--     reste écrite, elle ne vaut plus) ; l'historique et le journal le disent ; chaque gérant reçoit une alerte.
--     Quand une personne a tranché (bloquant levé ou pièce corrigée), la facture repasse « à valider » et une NOUVELLE
--     demande est déposée (sa clé porte « :r<n> » : l'ancienne, exécutée, ne la couvre plus).
--   · Une facture déjà réglée (même en partie) ou comptabilisée n'est pas défaite : son statut reste, et chaque
--     gérant reçoit une alerte CRITIQUE qui dit le bloquant.
--   · Une seule alerte par facture et par jeu de bloquants : un recontrôle qui retrouve les mêmes n'en relève pas.
-- Repères dans private.filed_controler_facture (l'état, et la fin) et private.filed_deposer_validation (la clé).
-- Rejouable ; aucune suppression.

alter table public.filed_validations add column if not exists caduque_le timestamptz;
alter table public.filed_validations add column if not exists caduque_motif text;
comment on column public.filed_validations.caduque_le is
  'a4_75 : la validation approuvée ne vaut plus (un bloquant est apparu après elle, avant tout règlement).';

-- Une alerte à chaque gérant de l'organisation (à l'organisation s'il n'y en a pas).
create or replace function private.filed_alerter_gerants(p_client uuid, p_niveau text, p_titre text, p_detail jsonb, p_cle text)
returns integer language plpgsql security definer set search_path to '' as $$
declare r record; n integer := 0;
begin
  for r in select c.user_id from public.comptes c where c.client_id = p_client and c.role = 'gerant' order by c.user_id loop
    perform private.lever_alerte_module(p_client, 'filed', p_niveau, left(p_titre, 200), p_detail, p_cle || ':' || r.user_id::text, true, r.user_id);
    n := n + 1;
  end loop;
  if n = 0 then
    perform private.lever_alerte_module(p_client, 'filed', p_niveau, left(p_titre, 200), p_detail, p_cle, true, null);
  end if;
  return n;
end $$;

-- Vrai quand la validation de la facture tombe : validée, un bloquant, et rien de réglé.
create or replace function private.filed_validation_tombe(p_f public.filed_factures, p_bloquants integer)
returns boolean language sql stable security definer set search_path to '' as $$
  select p_f.statut = 'validee' and coalesce(p_bloquants, 0) > 0
         and not exists (select 1 from public.filed_reglements r where r.facture_id = p_f.id)
$$;

-- Ce qui suit un bloquant apparu après la validation. p_f : la facture AVANT le recontrôle ; p_statut : son nouvel état.
create or replace function private.filed_bloquant_tardif(p_f public.filed_factures, p_statut text)
returns void language plpgsql security definer set search_path to '' as $$
declare
  v_codes text[]; v_messages text; v_four text; v_ref text; v_n integer; v_regle numeric; v_detail jsonb;
begin
  if p_f.statut not in ('validee', 'comptabilisee') then return; end if;
  select coalesce(array_agg(c.code order by c.code), '{}'), string_agg(c.message, ' ' order by c.code)
    into v_codes, v_messages
  from public.filed_controles c where c.facture_id = p_f.id and c.resultat = 'anomalie' and c.gravite = 'bloquant';
  if cardinality(v_codes) = 0 then return; end if;
  select f.nom into v_four from public.filed_fournisseurs f where f.id = p_f.fournisseur_id;
  v_ref := format('%s de %s', coalesce(p_f.numero, '(sans numéro)'), coalesce(v_four, 'fournisseur inconnu'));
  v_detail := jsonb_build_object('facture', p_f.id, 'document', p_f.document_id, 'version', p_f.version,
                                 'statut_avant', p_f.statut, 'statut', p_statut, 'bloquants', to_jsonb(v_codes),
                                 'message', left(coalesce(v_messages, ''), 1000));

  if p_statut is distinct from p_f.statut then
    -- Validée, pas réglée : la validation tombe, la facture revient au circuit.
    update public.filed_validations
       set caduque_le = now(),
           caduque_motif = left(format('Bloquant(s) apparu(s) après la validation : %s.', array_to_string(v_codes, ', ')), 500)
     where facture_id = p_f.id and issue = 'approuvee' and caduque_le is null;
    get diagnostics v_n = row_count;
    perform private.filed_historiser(p_f.client_id, p_f.document_id, 'filed_facture', p_f.id::text, 'validation_caduque',
      format('Validation caduque : bloquant(s) apparu(s) après elle (%s). La facture revient « %s » et ne part pas au paiement tant qu''une personne n''a pas tranché.',
             array_to_string(v_codes, ', '), replace(p_statut, '_', ' ')),
      v_detail || jsonb_build_object('validations_caduques', v_n));
    perform private.filed_journaliser(p_f.client_id, 'filed.validation_caduque', 'filed_facture', p_f.id::text,
      v_detail || jsonb_build_object('validations_caduques', v_n), p_f.entite_id);
    perform private.filed_alerter_gerants(p_f.client_id, 'attention',
      format('Facture %s : validation caduque, bloquant apparu après elle', v_ref),
      v_detail, 'validation_caduque:' || p_f.id::text || ':' || array_to_string(v_codes, ','));
  else
    -- Déjà réglée ou comptabilisée : rien n'est défait, l'alerte est critique.
    select sum(r.montant) into v_regle from public.filed_reglements r where r.facture_id = p_f.id;
    perform private.filed_historiser(p_f.client_id, p_f.document_id, 'filed_facture', p_f.id::text, 'bloquant_apres_reglement',
      format('Bloquant(s) apparu(s) après %s (%s) : rien n''est défait ; une personne vérifie la facture et, s''il le faut, le fournisseur.',
             case when v_regle is not null then format('un règlement de %s', private.filed_montant_texte(v_regle)) else 'la comptabilisation' end,
             array_to_string(v_codes, ', ')),
      v_detail || jsonb_build_object('regle', v_regle));
    perform private.filed_journaliser(p_f.client_id, 'filed.bloquant_apres_reglement', 'filed_facture', p_f.id::text,
      v_detail || jsonb_build_object('regle', v_regle), p_f.entite_id);
    perform private.filed_alerter_gerants(p_f.client_id, 'critique',
      format('Facture %s, %s : nouveau bloquant (%s)', v_ref,
             case when v_regle is not null then 'déjà réglée' else 'déjà comptabilisée' end, array_to_string(v_codes, ', ')),
      v_detail || jsonb_build_object('regle', v_regle),
      'bloquant_apres_reglement:' || p_f.id::text || ':' || array_to_string(v_codes, ','));
  end if;
end $$;

-- Le suffixe de la clé de la demande de validation : vide, ou « :r<n> » après n validations caduques.
create or replace function private.filed_suffixe_caduque(p_facture uuid)
returns text language sql stable security definer set search_path to '' as $$
  select coalesce(':r' || nullif(count(*), 0)::text, '') from public.filed_validations v
   where v.facture_id = p_facture and v.caduque_le is not null
$$;

revoke all on function private.filed_alerter_gerants(uuid, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function private.filed_validation_tombe(public.filed_factures, integer) from public, anon, authenticated;
revoke all on function private.filed_bloquant_tardif(public.filed_factures, text) from public, anon, authenticated;
revoke all on function private.filed_suffixe_caduque(uuid) from public, anon, authenticated;
grant execute on function private.filed_alerter_gerants(uuid, text, text, jsonb, text) to service_role;
grant execute on function private.filed_validation_tombe(public.filed_factures, integer) to service_role;
grant execute on function private.filed_bloquant_tardif(public.filed_factures, text) to service_role;
grant execute on function private.filed_suffixe_caduque(uuid) to service_role;

-- Une pose par repère : chaque repère doit se trouver une fois exactement.
create or replace function private.filed_a4_75_remplacer(p_def text, p_ancien text, p_nouveau text, p_nom text)
returns text language plpgsql immutable set search_path to '' as $$
declare v_n int := (length(p_def) - length(replace(p_def, p_ancien, ''))) / length(p_ancien);
begin
  if v_n <> 1 then raise exception 'a4_75 : repère « % » trouvé % fois (1 attendu)', p_nom, v_n; end if;
  return replace(p_def, p_ancien, p_nouveau);
end $$;
revoke all on function private.filed_a4_75_remplacer(text, text, text, text) from public, anon, authenticated;

-- 1. L'état : une facture validée, pas réglée, qui reçoit un bloquant, reprend l'état de ses contrôles.
do $$
declare v_def text := pg_get_functiondef('private.filed_controler_facture(uuid)'::regprocedure);
begin
  if position('a4_75' in v_def) > 0 then return; end if;
  v_def := private.filed_a4_75_remplacer(v_def,
    E'  v_statut := case when v_f.statut in (''validee'', ''refusee'', ''comptabilisee'') then v_f.statut -- Lot 4 (A4)\n',
    E'  v_statut := case when v_f.statut in (''validee'', ''refusee'', ''comptabilisee'')\n'
    || E'                        and not private.filed_validation_tombe(v_f, v_bloquants) then v_f.statut -- Lot 4 (A4) ; a4_75 : sauf bloquant avant règlement\n',
    'état');
  v_def := private.filed_a4_75_remplacer(v_def,
    E'  -- ── Lot 4 (A4) : la charge récurrente, l''imputation proposée, la demande de validation ──\n',
    E'  perform private.filed_bloquant_tardif(v_f, v_statut);   -- a4_75 : validation caduque, ou alerte critique\n'
    || E'  -- ── Lot 4 (A4) : la charge récurrente, l''imputation proposée, la demande de validation ──\n',
    'fin');
  execute v_def;
end $$;

-- 2. Une nouvelle demande après une validation caduque : l'ancienne, exécutée, ne la couvre plus.
do $$
declare v_def text := pg_get_functiondef('private.filed_deposer_validation(uuid, integer, text)'::regprocedure);
begin
  if position('a4_75' in v_def) > 0 then return; end if;
  execute private.filed_a4_75_remplacer(v_def,
    E'|| coalesce(p_suffixe, '''');\n',
    E'|| coalesce(p_suffixe, '''')\n           || private.filed_suffixe_caduque(v_f.id);   -- a4_75 : après une validation caduque, une nouvelle demande\n',
    'clé de la demande');
end $$;
