-- 20261021203751 a4_74_filed_lot66_cles_identifiants
-- Source : dépôt : ff188ac7 omega/migrations/a4_74_filed_lot66_cles_identifiants.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_74_filed_lot66_cles_identifiants.sql @ ff188ac7 ; a4_05 cité comme test : ignoré ; a4_62 cité comme test : ignoré.
-- ═══ omega/migrations/a4_74_filed_lot66_cles_identifiants.sql @ ff188ac7
-- a4_74 (FILED lot 66) : la clé d'un identifiant lu est toujours jugée, même quand le lecteur ne l'a pas vérifié.
--
-- TFILED-11 (testeur boîte noire, client banc-test-filed, vérifié par le coordinateur, 21/10/2026) : F1 (QDM-2026-1001,
-- SIREN lu 912345629, clé de Luhn fausse) est passée « à valider » sans aucun bloquant :
--   · identite.siren en attention, « SIREN lu mais non vérifié par le lecteur » : la clé n'était jamais jugée ;
--   · identite.tva_intracom en attention (FR24912345629, bâti sur ce SIREN impossible) ;
--   · tva.numero « absent de la facture », alors que la pièce porte un numéro de TVA ;
--   · aucun identite.registre : un SIREN impossible échappait au registre, quand un SIREN juste mais inconnu y reste
--     bloqué. Une fausse facture passait mieux avec un SIREN invalide.
-- Cause : le lecteur (lot 7, filed_completer_fournisseur_lu) met à part, sous fournisseur_lu.non_verifie, ce qui n'est
-- pas sûr OU pas juste à la clé ; le contrôle d'identité ne jugeait que ce qui était repris.
--
--   (a) Sans tiers : la clé de Luhn du SIREN lu, celle du SIRET (nouveau contrôle identite.siret : 14 chiffres, clé,
--       et SIREN de l'établissement = SIREN du fournisseur), et la clé du numéro de TVA français lu (celle de son SIREN,
--       et 12 + 3 × (SIREN mod 97) mod 97). Une clé fausse est BLOQUANTE, avec un message qui dit pourquoi.
--       Les SIRET de La Poste (SIREN 356000000) suivent une règle propre : leur clé n'est pas jugée ici.
--   (b) Un identifiant lu à clé fausse pose identite.registre en bloquant (« registre non interrogé ») : jamais de
--       silence. Un SIREN lu, juste à la clé mais non vérifié, le dit en attention.
--   (c) tva.numero ne dit plus « absent » quand un numéro de TVA a été lu : il est présent, sa validité est jugée
--       par le contrôle d'identité.
--   Le lecteur garde aussi à part le SIRET lu (non_verifie.siret), pour qu'il soit jugé.
-- Repères dans private.filed_completer_fournisseur_lu, private.filed_controles_identite et
-- private.filed_controler_facture ; chaque pose s'arrête si son repère n'est pas trouvé une fois. Rejouable ;
-- aucune suppression.

-- Le SIRET : vrai, faux, ou nul quand sa clé n'est pas jugée (La Poste) ou qu'il n'a pas 14 chiffres.
create or replace function private.filed_siret_cle(p text)
returns boolean language sql immutable set search_path to '' as $$
  select case when p !~ '^[0-9]{14}$' or left(p, 9) = '356000000' then null else private.filed_luhn(p) end
$$;

-- Les identifiants lus mais mis à part par le lecteur (chiffres et lettres seuls), ou nuls.
create or replace function private.filed_siren_lu(p_f public.filed_factures)
returns text language sql immutable set search_path to '' as $$
  select nullif(regexp_replace(coalesce(p_f.fournisseur_lu -> 'non_verifie' ->> 'siren', ''), '[^0-9]', '', 'g'), '')
$$;
create or replace function private.filed_tva_lue(p_f public.filed_factures)
returns text language sql immutable set search_path to '' as $$
  -- au-delà de 14 caractères, ce n'est pas un numéro de TVA de l'Union (un IBAN, a4_60)
  select v from (select nullif(upper(regexp_replace(coalesce(p_f.fournisseur_lu -> 'non_verifie' ->> 'tva', ''), '[^A-Za-z0-9]', '', 'g')), '') v) x
   where char_length(v) <= 14
$$;

-- Pourquoi le numéro de TVA français lu est impossible, ou nul s'il ne l'est pas (ou n'est pas français, ou mal formé).
create or replace function private.filed_tva_lue_fausse(p_f public.filed_factures)
returns text language plpgsql stable security definer set search_path to '' as $$
declare v_tva text := private.filed_tva_lue(p_f); v_a record; v_siren text; v_cle text;
begin
  if v_tva is null or v_tva !~ '^FR[0-9A-Z]{2}[0-9]{9}$' then return null; end if;
  select * into v_a from private.filed_tva_intracom_analyser(v_tva);
  if v_a.valide or not coalesce(v_a.format_ok, false) then return null; end if;
  v_siren := right(v_tva, 9);
  if not private.filed_siren_valide(v_siren) then
    return format('Numéro de TVA lu (%s) : il est bâti sur le SIREN %s, dont la clé de contrôle est fausse ; ce numéro ne peut pas exister. À vérifier sur la pièce, puis auprès du fournisseur par un autre canal, avant tout paiement.',
                  v_tva, v_siren);
  end if;
  v_cle := lpad(((12 + 3 * (v_siren::bigint % 97)) % 97)::text, 2, '0');
  return format('Numéro de TVA lu (%s) : sa clé %s ne correspond pas au SIREN %s (clé attendue %s) ; ce numéro ne peut pas exister. À vérifier sur la pièce, puis auprès du fournisseur par un autre canal, avant tout paiement.',
                v_tva, substr(v_tva, 3, 2), v_siren, v_cle);
end $$;

-- Le premier identifiant lu à clé fausse, dit en clair, ou nul.
create or replace function private.filed_identifiant_lu_faux(p_f public.filed_factures, p_four public.filed_fournisseurs)
returns text language plpgsql stable security definer set search_path to '' as $$
declare v_siren text := private.filed_siren_lu(p_f); v_siret text;
begin
  if v_siren is not null and not private.filed_siren_valide(v_siren) then
    return format('le SIREN lu (%s) a une clé de contrôle fausse', v_siren);
  end if;
  v_siret := nullif(regexp_replace(coalesce(nullif(p_f.fournisseur_lu ->> 'siret', ''), p_f.fournisseur_lu -> 'non_verifie' ->> 'siret', p_four.siret, ''), '[^0-9]', '', 'g'), '');
  if v_siret is not null and (v_siret !~ '^[0-9]{14}$' or private.filed_siret_cle(v_siret) is false) then
    return format('le SIRET lu (%s) est impossible', v_siret);
  end if;
  if private.filed_tva_lue_fausse(p_f) is not null then
    return format('le numéro de TVA lu (%s) est impossible', private.filed_tva_lue(p_f));
  end if;
  return null;
end $$;

-- identite.siret : posé quand un SIRET est lu ou connu.
create or replace function private.filed_controle_siret(p_f public.filed_factures, p_four public.filed_fournisseurs, p_siren text)
returns void language plpgsql security definer set search_path to '' as $$
declare v_siret text;
begin
  v_siret := nullif(regexp_replace(coalesce(nullif(p_f.fournisseur_lu ->> 'siret', ''), p_f.fournisseur_lu -> 'non_verifie' ->> 'siret', p_four.siret, ''), '[^0-9]', '', 'g'), '');
  if v_siret is null then return; end if;
  if v_siret !~ '^[0-9]{14}$' then
    perform private.filed_poser_resultat(p_f, 'identite.siret', 'bloquant', true,
      format('SIRET lu (%s) : %s chiffres au lieu de 14 ; ce numéro ne peut pas exister. À vérifier sur la pièce.', v_siret, char_length(v_siret)),
      'EMMET_INC', jsonb_build_object('siret', v_siret, 'format_ok', false), v_siret);
  elsif private.filed_siret_cle(v_siret) is null then
    perform private.filed_poser_resultat(p_f, 'identite.siret', 'attention', false,
      format('SIRET %s : établissement de La Poste, dont la clé suit une règle propre, non jugée ici.', v_siret),
      null, jsonb_build_object('siret', v_siret, 'cle_verifiee', null), v_siret);
  elsif not private.filed_siret_cle(v_siret) then
    perform private.filed_poser_resultat(p_f, 'identite.siret', 'bloquant', true,
      format('SIRET lu (%s) : clé de contrôle fausse ; aucun établissement ne peut porter ce numéro. Erreur de lecture ou fausse facture : à vérifier sur la pièce, puis auprès du fournisseur par un autre canal, avant tout paiement.', v_siret),
      'EMMET_INC', jsonb_build_object('siret', v_siret, 'cle_verifiee', false), v_siret);
  elsif p_siren is not null and left(v_siret, 9) <> p_siren then
    perform private.filed_poser_resultat(p_f, 'identite.siret', 'bloquant', true,
      format('Le SIRET %s n''est pas un établissement du SIREN %s : il appartient à une autre entreprise.', v_siret, p_siren),
      'EMMET_INC', jsonb_build_object('siret', v_siret, 'siren', p_siren), v_siret);
  else
    perform private.filed_poser_resultat(p_f, 'identite.siret', 'attention', false,
      format('SIRET %s : clé correcte.', v_siret), null, jsonb_build_object('siret', v_siret, 'cle_verifiee', true), v_siret);
  end if;
end $$;

revoke all on function private.filed_siret_cle(text) from public, anon, authenticated;
revoke all on function private.filed_siren_lu(public.filed_factures) from public, anon, authenticated;
revoke all on function private.filed_tva_lue(public.filed_factures) from public, anon, authenticated;
revoke all on function private.filed_tva_lue_fausse(public.filed_factures) from public, anon, authenticated;
revoke all on function private.filed_identifiant_lu_faux(public.filed_factures, public.filed_fournisseurs) from public, anon, authenticated;
revoke all on function private.filed_controle_siret(public.filed_factures, public.filed_fournisseurs, text) from public, anon, authenticated;
grant execute on function private.filed_siret_cle(text) to service_role;
grant execute on function private.filed_siren_lu(public.filed_factures) to service_role;
grant execute on function private.filed_tva_lue(public.filed_factures) to service_role;
grant execute on function private.filed_tva_lue_fausse(public.filed_factures) to service_role;
grant execute on function private.filed_identifiant_lu_faux(public.filed_factures, public.filed_fournisseurs) to service_role;
grant execute on function private.filed_controle_siret(public.filed_factures, public.filed_fournisseurs, text) to service_role;

-- Une pose par repère : chaque repère doit se trouver une fois exactement.
create or replace function private.filed_a4_74_remplacer(p_def text, p_ancien text, p_nouveau text, p_nom text)
returns text language plpgsql immutable set search_path to '' as $$
declare v_n int := (length(p_def) - length(replace(p_def, p_ancien, ''))) / length(p_ancien);
begin
  if v_n <> 1 then raise exception 'a4_74 : repère « % » trouvé % fois (1 attendu)', p_nom, v_n; end if;
  return replace(p_def, p_ancien, p_nouveau);
end $$;
revoke all on function private.filed_a4_74_remplacer(text, text, text, text) from public, anon, authenticated;

-- 1. Le lecteur garde à part le SIRET lu, pour qu'il soit jugé.
do $$
declare
  v_def text := pg_get_functiondef('private.filed_completer_fournisseur_lu(uuid)'::regprocedure);
  v_ligne constant text := E'  if v_tva is null and v_tva_lu is not null then v_nv := v_nv || jsonb_build_object(''tva'', v_tva_lu); end if;\n';
begin
  if position('a4_74' in v_def) > 0 then return; end if;
  execute private.filed_a4_74_remplacer(v_def, v_ligne,
    v_ligne || E'  if v_siret_lu is not null and nullif(v_lu->>''siret'', '''') is null then v_nv := v_nv || jsonb_build_object(''siret'', v_siret_lu); end if;   -- a4_74 : jugé au contrôle\n',
    'tva mise à part');
end $$;

-- 2. Le contrôle d'identité juge la clé de ce qui est lu.
do $$
declare v_def text := pg_get_functiondef('private.filed_controles_identite(uuid)'::regprocedure);
begin
  if position('a4_74' in v_def) > 0 then return; end if;
  -- (a) TVA française lue, impossible
  v_def := private.filed_a4_74_remplacer(v_def,
    E'  if v_tva is null then\n',
    E'  if v_tva is null and private.filed_tva_lue_fausse(v_f) is not null then   -- a4_74 : la clé de la TVA lue est jugée\n'
    || E'    perform private.filed_poser_resultat(v_f, ''identite.tva_intracom'', ''bloquant'', true, private.filed_tva_lue_fausse(v_f), ''EMMET_INC'',\n'
    || E'      jsonb_build_object(''tva'', private.filed_tva_lue(v_f), ''lu_non_verifie'', true, ''cle_verifiee'', false), private.filed_tva_lue(v_f));\n'
    || E'  elsif v_tva is null then\n',
    'identite.tva_intracom');
  -- (a) SIREN lu, clé fausse
  v_def := private.filed_a4_74_remplacer(v_def,
    E'  elsif v_siren is null then\n',
    E'  elsif v_siren is null and private.filed_siren_lu(v_f) is not null and not private.filed_siren_valide(private.filed_siren_lu(v_f)) then   -- a4_74\n'
    || E'    perform private.filed_poser_resultat(v_f, ''identite.siren'', ''bloquant'', true,\n'
    || E'      case when private.filed_siren_lu(v_f) !~ ''^[0-9]{9}$''\n'
    || E'           then format(''SIREN lu (%s) : %s chiffres au lieu de 9 ; ce numéro ne peut pas exister. À vérifier sur la pièce.'', private.filed_siren_lu(v_f), char_length(private.filed_siren_lu(v_f)))\n'
    || E'           else format(''SIREN lu (%s) : clé de contrôle fausse ; aucune entreprise ne peut porter ce numéro. Erreur de lecture ou fausse facture : à vérifier sur la pièce, puis auprès du fournisseur par un autre canal, avant tout paiement.'', private.filed_siren_lu(v_f)) end,\n'
    || E'      ''EMMET_INC'', jsonb_build_object(''siren'', private.filed_siren_lu(v_f), ''lu_non_verifie'', true, ''cle_verifiee'', false), private.filed_siren_lu(v_f));\n'
    || E'  elsif v_siren is null then\n',
    'identite.siren');
  -- (a) SIRET
  v_def := private.filed_a4_74_remplacer(v_def,
    E'  -- identite.coherence : le SIREN de la TVA française doit être le SIREN lu.\n',
    E'  perform private.filed_controle_siret(v_f, v_four, v_siren);   -- a4_74 : identite.siret\n\n'
    || E'  -- identite.coherence : le SIREN de la TVA française doit être le SIREN lu.\n',
    'identite.coherence');
  -- (b) jamais de silence du registre sur un identifiant lu
  v_def := private.filed_a4_74_remplacer(v_def,
    E'    -- Un fournisseur étranger qu''aucun registre ouvert ne connaît : seule une personne peut attester son identité.\n',
    E'    if private.filed_identifiant_lu_faux(v_f, v_four) is not null then   -- a4_74 : jamais en silence\n'
    || E'      perform private.filed_poser_resultat(v_f, ''identite.registre'', ''bloquant'', true,\n'
    || E'        format(''Registre non interrogé : %s. Aucun registre ne peut confirmer un numéro impossible ; une personne vérifie ce fournisseur avant tout paiement.'', private.filed_identifiant_lu_faux(v_f, v_four)),\n'
    || E'        ''EMMET_INC'', jsonb_build_object(''registre'', null, ''motif'', ''cle_fausse''), ''cle_fausse'');\n'
    || E'    elsif private.filed_siren_lu(v_f) is not null and v_siren is null then\n'
    || E'      perform private.filed_poser_resultat(v_f, ''identite.registre'', ''attention'', true,\n'
    || E'        format(''SIREN lu (%s), juste à la clé mais non vérifié par le lecteur : Sirene sera interrogé quand il sera confirmé sur la pièce.'', private.filed_siren_lu(v_f)),\n'
    || E'        ''EMMET_INC'', jsonb_build_object(''registre'', ''sirene'', ''identifiant'', private.filed_siren_lu(v_f), ''lu_non_verifie'', true), ''non_verifie'');\n'
    || E'    end if;\n'
    || E'    -- Un fournisseur étranger qu''aucun registre ouvert ne connaît : seule une personne peut attester son identité.\n',
    'registre');
  execute v_def;
end $$;

-- 3. (c) tva.numero : un numéro de TVA lu n'est pas « absent ».
do $$
declare
  v_def text := pg_get_functiondef('private.filed_controler_facture(uuid)'::regprocedure);
  v_cond constant text := E'and v_regime not in (''franchise'') and v_four.tva is null and not (v_f.fournisseur_lu ? ''tva'') then\n';
  v_fin constant text := E'        ''NON_CONFORME'');\n    end if;\n    if v_f.fournisseur_lu ->> ''tva'' like ''FR%''';
begin
  if position('a4_74' in v_def) > 0 then return; end if;
  v_def := private.filed_a4_74_remplacer(v_def, v_cond,
    E'and v_regime not in (''franchise'') and v_four.tva is null and not (v_f.fournisseur_lu ? ''tva'')\n'
    || E'       and private.filed_tva_lue(v_f) is null then   -- a4_74 : un numéro lu n''est pas absent\n',
    'tva.numero');
  v_def := private.filed_a4_74_remplacer(v_def, v_fin,
    E'        ''NON_CONFORME'');\n'
    || E'    elsif v_four.tva is null and not (v_f.fournisseur_lu ? ''tva'') and private.filed_tva_lue(v_f) is not null then\n'
    || E'      perform private.filed_poser_resultat(v_f, ''tva.numero'', ''attention'', false,\n'
    || E'        format(''Numéro de TVA présent sur la pièce (%s) ; sa validité est jugée au contrôle d''''identité.'', private.filed_tva_lue(v_f)), null);\n'
    || E'    end if;\n    if v_f.fournisseur_lu ->> ''tva'' like ''FR%''',
    'fin de tva.numero');
  execute v_def;
end $$;
