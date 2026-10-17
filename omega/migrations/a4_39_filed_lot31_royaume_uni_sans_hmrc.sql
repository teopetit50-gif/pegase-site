-- FILED, lot 31 (a4_39) — Royaume-Uni : plus de registre HMRC, une vérification humaine.
--
-- Décision de Teo (17/10) : l'application HMRC est abandonnée. Un numéro de TVA britannique garde son contrôle de forme
-- et de clé (modulo 97, a4_26) — une clé fausse bloque toujours — mais plus aucune vérification n'est demandée à un
-- registre : le fournisseur britannique passe, comme un norvégien, par l'attestation d'une personne
-- (filed_attester_identite). Textes d'a4_26 repris (gen39.py) : private.filed_identifiant_etranger rend « GB » sans
-- registre ; private.filed_controles_identite juge la clé dès que la forme est connue, registre ou non. Les valeurs
-- « hmrc » restent permises dans les contraintes (rien à retirer). Migration idempotente ; aucune suppression.

create or replace function private.filed_identifiant_etranger(p text)
returns table (pays text, registre text, identifiant text, format_ok boolean, cle_verifiee boolean, motif text)
language plpgsql immutable set search_path to '' as $$
declare v text := upper(regexp_replace(coalesce(p, ''), '[^A-Za-z0-9]', '', 'g')); v_p text; v_num text;
begin
  v_p := substring(v from '^[A-Z]{2}');
  if v_p is null or v_p in ('FR', 'XI', 'EL', 'GR') or private.filed_pays_ue(v_p) then return; end if;
  if v_p = 'CH' then
    v_num := substring(v from '^CHE([0-9]{9})(MWST|TVA|IVA)?$');
    if v_num is null then
      return query select 'CH', 'uid_ch', null::text, false, null::boolean, 'Numéro suisse attendu sous la forme CHE-123.456.789 (MWST, TVA ou IVA)';
    elsif not private.filed_uid_ch_cle(v_num) then
      return query select 'CH', 'uid_ch', 'CHE' || v_num, true, false, format('IDE CHE-%s.%s.%s : clé de contrôle fausse', substr(v_num, 1, 3), substr(v_num, 4, 3), substr(v_num, 7, 3));
    else
      return query select 'CH', 'uid_ch', 'CHE' || v_num, true, true, format('IDE CHE-%s.%s.%s, clé correcte', substr(v_num, 1, 3), substr(v_num, 4, 3), substr(v_num, 7, 3));
    end if;
    return;
  end if;
  if v_p = 'GB' then
    v_num := substring(v from '^GB([0-9]{9}|[0-9]{12}|GD[0-9]{3}|HA[0-9]{3})$');
    if v_num is null then
      return query select 'GB', null::text, null::text, false, null::boolean, 'Numéro britannique attendu sous la forme GB + 9 ou 12 chiffres';
    elsif v_num ~ '^(GD|HA)' then
      return query select 'GB', null::text, 'GB' || v_num, true, null::boolean, 'Numéro britannique d''administration ou d''établissement de santé, sans clé calculable';
    elsif not private.filed_tva_gb_cle(left(v_num, 9)) then
      return query select 'GB', null::text, 'GB' || v_num, true, false, 'Numéro britannique : clé de contrôle fausse';
    else
      return query select 'GB', null::text, 'GB' || v_num, true, true, 'Numéro britannique, clé correcte';
    end if;
    return;
  end if;
  return query select v_p, null::text, v, null::boolean, null::boolean, format('Préfixe « %s » : hors de l''Union, sans registre public interrogé', v_p);
end $$;

create or replace function private.filed_controles_identite(p_facture uuid) returns void
language plpgsql security definer set search_path to '' as $$
declare
  v_f      public.filed_factures;
  v_four   public.filed_fournisseurs;
  v_tva    text;
  v_siren  text;
  v_a      record;
  v_x      record;
  v_siren_tva text;
  v_tva_ok boolean := false;
  v_registre text; v_ident text; v_verdict record; v_pays text;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found then return; end if;
  if v_f.fournisseur_id is not null then
    select * into v_four from public.filed_fournisseurs where id = v_f.fournisseur_id;
  end if;

  v_tva   := coalesce(nullif(v_f.fournisseur_lu->>'tva', ''), v_four.tva);
  v_siren := coalesce(nullif(v_f.fournisseur_lu->>'siren', ''), v_four.siren,
                      case when nullif(v_f.fournisseur_lu->>'siret', '') is not null then left(regexp_replace(v_f.fournisseur_lu->>'siret', '[^0-9]', '', 'g'), 9) end,
                      case when v_four.siret is not null then left(regexp_replace(v_four.siret, '[^0-9]', '', 'g'), 9) end);
  v_siren := nullif(regexp_replace(coalesce(v_siren, ''), '[^0-9]', '', 'g'), '');
  select * into v_x from private.filed_identifiant_etranger(v_tva);

  -- identite.tva_intracom
  if v_tva is null then
    perform private.filed_poser_resultat(v_f, 'identite.tva_intracom', 'attention', true,
      case when nullif(v_f.fournisseur_lu->'non_verifie'->>'tva', '') is not null
           then format('Numéro de TVA lu (%s) mais non vérifié par le lecteur : à confirmer sur la pièce.', v_f.fournisseur_lu->'non_verifie'->>'tva')
           else 'Aucun numéro de TVA intracommunautaire sur la pièce ni sur le fournisseur.' end, 'EMMET_INC',
      jsonb_build_object('tva', null, 'lu_non_verifie', v_f.fournisseur_lu->'non_verifie'->>'tva'), 'absent');
  elsif v_x.pays is not null and v_x.format_ok is not null then
    -- Suisse ou Royaume-Uni : la forme et la clé ; le registre suisse est interrogé plus bas ; le britannique n'en a plus
    -- (HMRC abandonné, 17/10) : son identité est attestée par une personne.
    perform private.filed_poser_resultat(v_f, 'identite.tva_intracom', 'bloquant', not v_x.format_ok or v_x.cle_verifiee is false,
      case when v_x.format_ok and v_x.cle_verifiee is not false then format('Numéro de TVA %s (hors Union) : %s.', v_x.pays, v_x.motif)
           else format('Numéro de TVA %s invalide : %s.', v_x.pays, v_x.motif) end,
      'EMMET_INC',
      jsonb_build_object('tva', v_tva, 'pays', v_x.pays, 'format_ok', v_x.format_ok, 'cle_verifiee', v_x.cle_verifiee, 'registre', v_x.registre),
      coalesce(v_x.identifiant, v_tva));
    if v_x.format_ok and v_x.cle_verifiee is not false then v_registre := v_x.registre; v_ident := v_x.identifiant; end if;
    v_pays := v_x.pays;
  elsif v_x.pays is not null then
    -- Un autre pays hors Union : pas de registre ; la forme n'est pas jugée.
    perform private.filed_poser_resultat(v_f, 'identite.tva_intracom', 'attention', true,
      format('Numéro de TVA %s : %s ; identité à attester par une personne.', v_x.pays, v_x.motif), 'EMMET_INC',
      jsonb_build_object('tva', v_tva, 'pays', v_x.pays, 'registre', null), v_x.identifiant);
    v_pays := v_x.pays;
  else
    select * into v_a from private.filed_tva_intracom_analyser(v_tva);
    v_tva_ok := coalesce(v_a.valide, false);
    perform private.filed_poser_resultat(v_f, 'identite.tva_intracom', 'bloquant', not v_a.valide,
      case when v_a.valide then format('Numéro de TVA %s : %s.', v_a.pays, v_a.motif)
           else format('Numéro de TVA intracommunautaire invalide : %s.', v_a.motif) end,
      'EMMET_INC',
      jsonb_build_object('tva', v_tva, 'pays', v_a.pays, 'format_ok', v_a.format_ok, 'cle_verifiee', v_a.cle_verifiee),
      v_a.numero);
  end if;

  -- identite.siren
  if v_siren is null then
    perform private.filed_poser_resultat(v_f, 'identite.siren', 'attention', true,
      case when nullif(v_f.fournisseur_lu->'non_verifie'->>'siren', '') is not null
           then format('SIREN lu (%s) mais non vérifié par le lecteur : à confirmer sur la pièce.', v_f.fournisseur_lu->'non_verifie'->>'siren')
           else 'Aucun SIREN sur la pièce ni sur le fournisseur.' end, 'EMMET_INC',
      jsonb_build_object('siren', null, 'lu_non_verifie', v_f.fournisseur_lu->'non_verifie'->>'siren'), 'absent');
  else
    perform private.filed_poser_resultat(v_f, 'identite.siren', 'bloquant', not private.filed_siren_valide(v_siren),
      case when private.filed_siren_valide(v_siren) then format('SIREN %s : clé correcte.', v_siren)
           else format('SIREN %s : clé de contrôle fausse.', v_siren) end,
      'EMMET_INC', jsonb_build_object('siren', v_siren), v_siren);
  end if;

  -- identite.coherence : le SIREN de la TVA française doit être le SIREN lu.
  v_siren_tva := private.filed_siren_de_tva_fr(v_tva);
  if v_siren_tva is not null and v_siren is not null then
    perform private.filed_poser_resultat(v_f, 'identite.coherence', 'bloquant', v_siren_tva <> v_siren,
      case when v_siren_tva = v_siren then 'Le numéro de TVA et le SIREN désignent la même entreprise.'
           else format('Le numéro de TVA porte le SIREN %s, la pièce donne %s.', v_siren_tva, v_siren) end,
      'EMMET_INC', jsonb_build_object('siren_tva', v_siren_tva, 'siren', v_siren), v_siren_tva || '/' || v_siren);
  end if;

  -- identite.registre : le verdict du fournisseur, ou ce que le registre a répondu, ou la demande à l'ouvrier.
  if v_registre is null then
    if v_tva_ok then v_registre := 'vies'; v_ident := v_tva;
    elsif v_siren is not null and private.filed_siren_valide(v_siren) then v_registre := 'sirene'; v_ident := v_siren;
    end if;
  end if;
  if v_registre is not null then
    select * into v_verdict from private.filed_verdict_identite(v_four, v_registre, v_ident);
    if v_verdict.resultat is null then
      perform private.filed_demander_verification(v_f.client_id, v_f.fournisseur_id, v_registre, v_ident);
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'attention', true,
        case v_registre when 'vies' then 'Numéro de TVA pas encore confirmé par VIES : vérification demandée.'
                        when 'sirene' then 'SIREN pas encore confirmé par Sirene : vérification demandée.'
                        else format('Numéro de TVA pas encore confirmé par %s : vérification demandée.', private.filed_registre_libelle(v_registre)) end,
        'EMMET_INC', jsonb_build_object('registre', v_registre, 'identifiant', v_ident), v_registre || ':' || v_ident);
    elsif v_verdict.resultat = 'invalide' then
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'bloquant', true,
        case v_registre when 'sirene' then format('Sirene ne connaît pas le SIREN %s, ou l''entreprise est fermée (réponse du %s).', v_ident, to_char(v_verdict.repondu_le, 'DD/MM/YYYY'))
                        else format('%s ne reconnaît pas le numéro de TVA %s (réponse du %s).', private.filed_registre_libelle(v_registre), v_ident, to_char(v_verdict.repondu_le, 'DD/MM/YYYY')) end,
        'EMMET_INC', jsonb_build_object('registre', v_registre, 'identifiant', v_ident, 'repondu_le', v_verdict.repondu_le, 'source', v_verdict.source, 'preuve', v_verdict.preuve), v_registre || ':' || v_ident);
    elsif v_verdict.resultat = 'indisponible' then
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'attention', true,
        case v_registre when 'sirene' then 'Sirene n''a pas répondu : SIREN à confirmer.'
                        else format('%s n''a pas répondu : numéro de TVA à confirmer.', private.filed_registre_libelle(v_registre)) end,
        'EMMET_INC', jsonb_build_object('registre', v_registre, 'identifiant', v_ident, 'repondu_le', v_verdict.repondu_le), v_registre || ':' || v_ident);
    else
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'attention', false,
        format('Identité confirmée par %s le %s.', private.filed_registre_libelle(v_verdict.source), to_char(v_verdict.repondu_le, 'DD/MM/YYYY')), null,
        jsonb_build_object('registre', v_registre, 'identifiant', v_ident, 'repondu_le', v_verdict.repondu_le, 'source', v_verdict.source), v_registre || ':' || v_ident);
    end if;
  else
    -- Un fournisseur étranger qu'aucun registre ouvert ne connaît : seule une personne peut attester son identité.
    v_pays := coalesce(v_pays, case when coalesce(v_four.pays, 'FR') not in ('FR', 'XI', 'EL', 'GR') and not private.filed_pays_ue(v_four.pays)
                                   then v_four.pays end);   -- un fournisseur de l'Union passe par VIES, jamais par ici
    if v_pays is not null then
      if v_four.identite_source = 'humain' and v_four.identite_verdict->>'resultat' = 'valide' then
        perform private.filed_poser_resultat(v_f, 'identite.registre', 'attention', false,
          format('Fournisseur de %s sans registre public interrogeable : identité attestée par une personne le %s.', v_pays,
                 to_char(v_four.identite_verifiee_le, 'DD/MM/YYYY')), null,
          jsonb_build_object('registre', 'humain', 'pays', v_pays, 'atteste_le', v_four.identite_verifiee_le,
                             'preuve', v_four.identite_verdict->'preuve'), 'humain:' || v_pays);
      else
        perform private.filed_poser_resultat(v_f, 'identite.registre', 'attention', true,
          format('Fournisseur de %s sans registre public interrogeable : identité à attester par une personne.', v_pays), 'EMMET_INC',
          jsonb_build_object('registre', 'humain', 'pays', v_pays, 'attestation', 'filed_attester_identite'), 'humain:' || v_pays);
      end if;
    end if;
  end if;
end $$;
