-- 20261022193750 a4_81_filed_lot73_siren_source
-- Source : dépôt : 2dece941675ea1c2c490288f02a0aba6691477b0 omega/migrations/a4_81_filed_lot73_siren_source.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_81_filed_lot73_siren_source.sql @ 2dece941675ea1c2c490288f02a0aba6691477b0.
-- ═══ omega/migrations/a4_81_filed_lot73_siren_source.sql @ 2dece941675ea1c2c490288f02a0aba6691477b0
-- a4_81 (FILED lot 73) : identite.siren dit d'où vient le SIREN jugé, et confronte celui lu sur la pièce (TFILED-21).
--
-- TFILED-21 (testeur boîte noire, banc NOBAT, pièce 069, 22/10/2026) : identite.siren disait « SIREN 413130972 : clé
-- correcte » alors que la pièce ne porte qu'un SIREN NON vérifié (« déduit des 9 premiers chiffres du SIRET »). Le SIREN
-- jugé était celui de la fiche du fournisseur (LEADER MAT), pas celui de la pièce : la clé était juste, mais le message
-- laissait croire que la pièce l'était, et un SIREN lu DIFFÉRENT de celui de la fiche serait passé sans un mot.
--
--   · Le message dit la source : la pièce (vérifié), la fiche du fournisseur, ou le SIRET.
--   · Quand le SIREN jugé vient de la fiche et que la pièce en porte un autre, lu sans être vérifié : bloquant, « le
--     SIREN lu sur la pièce n'est pas celui du fournisseur ». Le même, ou aucun : ok, et le message le dit.
--   · Une clé fausse reste bloquante, comme avant.
-- Repère dans private.filed_controles_identite (la branche « SIREN connu ») ; la pose s'arrête s'il n'est pas trouvé une
-- fois. Rejouable ; aucune suppression.

create or replace function private.filed_controle_siren_connu(p_f public.filed_factures, p_four public.filed_fournisseurs, p_siren text)
returns void language plpgsql security definer set search_path to '' as $$
declare
  v_lu text := nullif(regexp_replace(coalesce(p_f.fournisseur_lu ->> 'siren', ''), '[^0-9]', '', 'g'), '');
  v_nv text := private.filed_siren_lu(p_f);
  v_source text;
begin
  v_source := case when v_lu = p_siren then 'piece'
                   when regexp_replace(coalesce(p_four.siren, ''), '[^0-9]', '', 'g') = p_siren then 'fournisseur'
                   else 'siret' end;
  if not private.filed_siren_valide(p_siren) then
    perform private.filed_poser_resultat(p_f, 'identite.siren', 'bloquant', true,
      format('SIREN %s : clé de contrôle fausse.', p_siren), 'EMMET_INC', jsonb_build_object('siren', p_siren, 'source', v_source), p_siren);
  elsif v_source <> 'piece' and v_nv is not null and v_nv <> p_siren then
    perform private.filed_poser_resultat(p_f, 'identite.siren', 'bloquant', true,
      format('Le SIREN lu sur la pièce (%s, non vérifié) n''est pas celui du fournisseur (%s) : à vérifier sur la pièce ; une autre société peut se présenter sous ce nom.',
             v_nv, p_siren),
      'EMMET_INC', jsonb_build_object('siren', p_siren, 'source', v_source, 'siren_lu_non_verifie', v_nv), p_siren);
  else
    perform private.filed_poser_resultat(p_f, 'identite.siren', 'bloquant', false,
      case v_source
        when 'piece' then format('SIREN %s, lu sur la pièce : clé correcte.', p_siren)
        when 'fournisseur' then format('SIREN %s, celui de la fiche du fournisseur : clé correcte. %s', p_siren,
          case when v_nv = p_siren then 'La pièce porte le même, lu sans être vérifié.'
               else 'La pièce n''en porte pas de lisible.' end)
        else format('SIREN %s, tiré du SIRET : clé correcte.', p_siren) end,
      'EMMET_INC', jsonb_build_object('siren', p_siren, 'source', v_source, 'siren_lu_non_verifie', v_nv), p_siren);
  end if;
end $$;
revoke all on function private.filed_controle_siren_connu(public.filed_factures, public.filed_fournisseurs, text) from public, anon, authenticated;
grant execute on function private.filed_controle_siren_connu(public.filed_factures, public.filed_fournisseurs, text) to service_role;

do $$
declare
  v_def text := pg_get_functiondef('private.filed_controles_identite(uuid)'::regprocedure);
  v_ancien constant text :=
       E'    perform private.filed_poser_resultat(v_f, ''identite.siren'', ''bloquant'', not private.filed_siren_valide(v_siren),\n'
    || E'      case when private.filed_siren_valide(v_siren) then format(''SIREN %s : clé correcte.'', v_siren)\n'
    || E'           else format(''SIREN %s : clé de contrôle fausse.'', v_siren) end,\n'
    || E'      ''EMMET_INC'', jsonb_build_object(''siren'', v_siren), v_siren);\n';
  v_n int;
begin
  if position('filed_controle_siren_connu' in v_def) > 0 then return; end if;
  v_n := (length(v_def) - length(replace(v_def, v_ancien, ''))) / length(v_ancien);
  if v_n <> 1 then raise exception 'a4_81 : repère « SIREN connu » trouvé % fois (1 attendu)', v_n; end if;
  execute replace(v_def, v_ancien,
    E'    perform private.filed_controle_siren_connu(v_f, v_four, v_siren);   -- a4_81 : la source, et le SIREN lu confronté\n');
end $$;
