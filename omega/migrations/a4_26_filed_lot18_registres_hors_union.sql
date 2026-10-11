-- FILED, lot 18 (a4_26) — fournisseurs hors Union : registre IDE suisse (uid_ch), HMRC (hmrc), attestation humaine
-- pour un pays sans registre ; comptes système de l'autoliquidation et du change réglables.
--
-- Demande du coordinateur (6/10), pour B7 (NOTES-B7 § 12) :
--   1. Les valeurs admises s'élargissent, par une NOUVELLE contrainte posée NOT VALID puis validée :
--        filed_verifications_tiers.registre  ('vies', 'sirene', 'uid_ch', 'hmrc')            filed_verifications_tiers_registre_v2
--        filed_fournisseurs.identite_source  (null, 'sirene', 'vies', 'humain', 'uid_ch', 'hmrc')   filed_fournisseurs_identite_source_v2
--        identites_registre.registre (B7)     ('sirene', 'vies', 'uid_ch', 'hmrc')            identites_registre_registre_v2
--        filed_comptes_systeme.role           + tva_due_intracom, tva_autoliquidee, perte_change, gain_change
--                                                                                              filed_comptes_systeme_role_v2
--      Les anciennes contraintes restent en place ici : tant qu'elles existent, les nouvelles valeurs sont refusées.
--      Leur retrait est dans a4_26b_filed_lot18_retrait_anciennes_contraintes.sql, à poser par le coordinateur.
--   2. private.filed_identifiant_etranger(text) : un numéro de TVA hors Union lu sur la pièce. Suisse : CHE + 9 chiffres
--      (suffixe MWST, TVA ou IVA admis), clé modulo 11 de l'IDE, registre uid_ch. Royaume-Uni : GB + 9 ou 12 chiffres
--      (clé modulo 97, ancienne ou nouvelle règle) ou GD/HA + 3 chiffres, registre hmrc. Autre préfixe hors Union : pas de
--      registre.
--   3. private.filed_controles_identite (texte d'a4_10, réécrit) :
--        identite.tva_intracom : un numéro suisse ou britannique bien formé n'est plus « invalide » ; mal formé, il bloque ;
--          un numéro d'un autre pays hors Union est en attention (pas de registre) ;
--        identite.registre : uid_ch pour CHE…, hmrc pour GB… (demande à l'ouvrier de B7, verdict lu comme pour VIES) ;
--          pour un fournisseur étranger sans registre interrogeable, attention tant qu'une personne n'a pas attesté son
--          identité (public.filed_attester_identite) ; levée par l'attestation.
--   4. private.filed_repondre_verification (texte d'a4_10) : le fournisseur visé se retrouve aussi par son numéro de TVA
--      pour uid_ch et hmrc.
-- Migration idempotente ; aucune suppression.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Les contraintes élargies (NOT VALID, puis VALIDATE)
-- ───────────────────────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.filed_verifications_tiers'::regclass and conname = 'filed_verifications_tiers_registre_v2') then
    alter table public.filed_verifications_tiers add constraint filed_verifications_tiers_registre_v2
      check (registre in ('vies', 'sirene', 'uid_ch', 'hmrc')) not valid;
  end if;
  alter table public.filed_verifications_tiers validate constraint filed_verifications_tiers_registre_v2;

  if not exists (select 1 from pg_constraint where conrelid = 'public.filed_fournisseurs'::regclass and conname = 'filed_fournisseurs_identite_source_v2') then
    alter table public.filed_fournisseurs add constraint filed_fournisseurs_identite_source_v2
      check (identite_source is null or identite_source in ('sirene', 'vies', 'humain', 'uid_ch', 'hmrc')) not valid;
  end if;
  alter table public.filed_fournisseurs validate constraint filed_fournisseurs_identite_source_v2;

  if not exists (select 1 from pg_constraint where conrelid = 'public.filed_comptes_systeme'::regclass and conname = 'filed_comptes_systeme_role_v2') then
    alter table public.filed_comptes_systeme add constraint filed_comptes_systeme_role_v2
      check (role in ('fournisseurs', 'tva_deductible_abs', 'tva_deductible_immo', 'banque', 'caisse',
                      'tva_due_intracom', 'tva_autoliquidee', 'perte_change', 'gain_change')) not valid;
  end if;
  alter table public.filed_comptes_systeme validate constraint filed_comptes_systeme_role_v2;

  -- Le cache des registres de B7 (b7_01) ; absent d'une base sans le module identité.
  if to_regclass('public.identites_registre') is not null then
    if not exists (select 1 from pg_constraint where conrelid = 'public.identites_registre'::regclass and conname = 'identites_registre_registre_v2') then
      alter table public.identites_registre add constraint identites_registre_registre_v2
        check (registre in ('sirene', 'vies', 'uid_ch', 'hmrc')) not valid;
    end if;
    alter table public.identites_registre validate constraint identites_registre_registre_v2;
  end if;
end $$;

comment on column public.filed_fournisseurs.identite_source is
  'Qui a vérifié : sirene (INSEE), vies (Union), uid_ch (registre IDE suisse), hmrc (Royaume-Uni), humain (attestation).';
comment on function public.filed_regler_compte_systeme(uuid, text, text, text) is
  'Règle un compte système de FILED (fournisseurs, tva_deductible_abs, tva_deductible_immo, banque, caisse, tva_due_intracom, tva_autoliquidee, perte_change, gain_change) : gérant ou admin.';

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Les numéros hors Union
-- ───────────────────────────────────────────────────────────────────────────
-- IDE suisse : CHE + 9 chiffres ; poids 5 4 3 2 7 6 5 4 sur les huit premiers, clé = 11 - somme mod 11 (11 → 0, 10 : invalide).
create or replace function private.filed_uid_ch_cle(p_chiffres text)
returns boolean language plpgsql immutable set search_path to '' as $$
declare w int[] := array[5, 4, 3, 2, 7, 6, 5, 4]; s int := 0; i int; c int;
begin
  if p_chiffres !~ '^[0-9]{9}$' then return false; end if;
  for i in 1..8 loop s := s + substr(p_chiffres, i, 1)::int * w[i]; end loop;
  c := 11 - s % 11;
  if c = 11 then c := 0; end if;
  return c <> 10 and c = substr(p_chiffres, 9, 1)::int;
end $$;

-- TVA britannique : 9 chiffres ; poids 8 7 6 5 4 3 2 sur les sept premiers, plus les deux derniers ; somme ≡ 0 (mod 97),
-- ou somme + 55 ≡ 0 (numéros émis depuis 2010).
create or replace function private.filed_tva_gb_cle(p_chiffres text)
returns boolean language plpgsql immutable set search_path to '' as $$
declare s int := 0; i int;
begin
  if p_chiffres !~ '^[0-9]{9}$' then return false; end if;
  for i in 1..7 loop s := s + substr(p_chiffres, i, 1)::int * (9 - i); end loop;
  s := s + substr(p_chiffres, 8, 2)::int;
  return s % 97 = 0 or (s + 55) % 97 = 0;
end $$;

-- Un numéro de TVA hors Union. Rend une ligne vide (pays nul) pour un numéro de l'Union, de France ou d'Irlande du
-- Nord (XI, et EL ou GR pour la Grèce) : filed_tva_intracom_analyser s'en charge.
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
      return query select 'GB', 'hmrc', null::text, false, null::boolean, 'Numéro britannique attendu sous la forme GB + 9 ou 12 chiffres';
    elsif v_num ~ '^(GD|HA)' then
      return query select 'GB', 'hmrc', 'GB' || v_num, true, null::boolean, 'Numéro britannique d''administration ou d''établissement de santé, sans clé calculable';
    elsif not private.filed_tva_gb_cle(left(v_num, 9)) then
      return query select 'GB', 'hmrc', 'GB' || v_num, true, false, 'Numéro britannique : clé de contrôle fausse';
    else
      return query select 'GB', 'hmrc', 'GB' || v_num, true, true, 'Numéro britannique, clé correcte';
    end if;
    return;
  end if;
  return query select v_p, null::text, v, null::boolean, null::boolean, format('Préfixe « %s » : hors de l''Union, sans registre public interrogé', v_p);
end $$;

-- Le nom d'un registre, dans une phrase.
create or replace function private.filed_registre_libelle(p text)
returns text language sql immutable set search_path to '' as $$
  select case p when 'vies' then 'VIES' when 'sirene' then 'Sirene' when 'uid_ch' then 'le registre IDE suisse'
                when 'hmrc' then 'HMRC' when 'humain' then 'une personne' else coalesce(p, '?') end
$$;

revoke all on function private.filed_uid_ch_cle(text) from public, anon, authenticated;
revoke all on function private.filed_tva_gb_cle(text) from public, anon, authenticated;
revoke all on function private.filed_identifiant_etranger(text) from public, anon, authenticated;
revoke all on function private.filed_registre_libelle(text) from public, anon, authenticated;
grant execute on function private.filed_uid_ch_cle(text), private.filed_tva_gb_cle(text), private.filed_identifiant_etranger(text),
  private.filed_registre_libelle(text) to service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Les contrôles d'identité (texte d'a4_10, réécrit)
-- ───────────────────────────────────────────────────────────────────────────
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
  elsif v_x.pays is not null and v_x.registre is not null then
    -- Suisse ou Royaume-Uni : la forme et la clé ; le registre est interrogé plus bas.
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

-- ───────────────────────────────────────────────────────────────────────────
-- 4. La réponse d'un registre (texte d'a4_10 ; le fournisseur se retrouve aussi par sa TVA suisse ou britannique)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_repondre_verification(p_verification uuid, p_resultat text, p_preuve jsonb)
returns void language plpgsql security definer set search_path to '' as $$
declare v_v public.filed_verifications_tiers; v_four uuid;
begin
  if p_resultat not in ('valide', 'invalide', 'indisponible') then
    raise exception 'Résultat inconnu : %', p_resultat using errcode = '22023';
  end if;
  update public.filed_verifications_tiers
     set repondu_le = now(), resultat = p_resultat, preuve = coalesce(p_preuve, '{}'::jsonb)
   where id = p_verification and repondu_le is null
   returning * into v_v;
  if not found then
    raise exception 'Vérification inconnue ou déjà répondue.' using errcode = 'P0002';
  end if;
  -- Le fournisseur visé, ou celui qui porte cet identifiant.
  v_four := coalesce(v_v.fournisseur_id,
    (select f.id from public.filed_fournisseurs f where f.client_id = v_v.client_id
      and ((v_v.registre = 'sirene' and f.siren = v_v.identifiant)
           or (v_v.registre = 'vies' and upper(regexp_replace(coalesce(f.tva, ''), '[^A-Za-z0-9]', '', 'g')) = v_v.identifiant)
           or (v_v.registre in ('uid_ch', 'hmrc')
               and (select x.identifiant from private.filed_identifiant_etranger(f.tva) x) = v_v.identifiant)) limit 1));
  if v_four is not null and p_resultat <> 'indisponible' then
    update public.filed_fournisseurs
       set identite_verifiee_le = now(), identite_source = v_v.registre,
           identite_verdict = jsonb_build_object('resultat', p_resultat, 'identifiant', v_v.identifiant, 'registre', v_v.registre, 'preuve', coalesce(p_preuve, '{}'::jsonb)),
           maj_le = now()
     where id = v_four;
    perform private.filed_journaliser(v_v.client_id, 'filed.identite.verdict', 'filed_fournisseur', v_four::text,
      jsonb_build_object('registre', v_v.registre, 'identifiant', v_v.identifiant, 'resultat', p_resultat));
    perform private.filed_historiser(v_v.client_id, null, 'filed_fournisseur', v_four::text, 'identite_verifiee',
      format('Identité %s par %s (%s).', case p_resultat when 'valide' then 'confirmée' else 'infirmée' end, private.filed_registre_libelle(v_v.registre), v_v.identifiant),
      jsonb_build_object('verification', v_v.id, 'resultat', p_resultat));
    perform private.filed_recontroler_fournisseur(v_four);
  end if;
end $$;
