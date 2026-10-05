-- FILED, lot 7 (a4_10) — L'identité du fournisseur remonte de la pièce ; un fournisseur nouveau se confirme.
--
-- Ce que ce lot pose :
--   filed_fournisseurs.identite_verifiee_le / identite_source / identite_verdict   le verdict externe (Sirene, VIES, ou une
--                                                     personne), écrit par l'ouvrier ou par une personne, lu par les contrôles ;
--   private.filed_completer_fournisseur_lu(p_facture)  remonte SIREN, TVA et IBAN lus par le lecteur (pieces_valeurs) vers
--                                                     filed_factures.fournisseur_lu, filed_factures.iban et le fournisseur
--                                                     (quand ils y manquent et tombent juste à la clé) ; appelée en tête de
--                                                     filed_controler_facture (repère posé par lecture du corps en place) ;
--   private.filed_repondre_verification                 la réponse d'un registre remplit aussi le verdict du fournisseur et
--                                                     recontrôle ses factures ;
--   private.filed_controles_identite                    lit le verdict du fournisseur comme une réponse de registre ;
--   filed_confirmer_fournisseur(p_fournisseur, p_motif) la porte : un gérant, admin ou valideur confirme un fournisseur
--                                                     nouveau (jamais celui qui a déposé la pièce d'origine) ; l'IBAN
--                                                     proposé avec lui se valide ; les factures bloquées sont recontrôlées.
-- Migration idempotente ; aucun DROP, aucun DELETE.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Le verdict externe sur l'identité d'un fournisseur
-- ───────────────────────────────────────────────────────────────────────────
alter table public.filed_fournisseurs add column if not exists identite_verifiee_le timestamptz;
alter table public.filed_fournisseurs add column if not exists identite_source text;
alter table public.filed_fournisseurs add column if not exists identite_verdict jsonb;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.filed_fournisseurs'::regclass and conname = 'filed_fournisseurs_identite_source') then
    alter table public.filed_fournisseurs add constraint filed_fournisseurs_identite_source
      check (identite_source is null or identite_source in ('sirene', 'vies', 'humain')) not valid;
    alter table public.filed_fournisseurs validate constraint filed_fournisseurs_identite_source;
  end if;
end $$;
comment on column public.filed_fournisseurs.identite_verifiee_le is 'Quand l''identité du fournisseur a été vérifiée pour la dernière fois (registre public ou personne).';
comment on column public.filed_fournisseurs.identite_source is 'Qui a vérifié : sirene (INSEE), vies (Union), humain.';
comment on column public.filed_fournisseurs.identite_verdict is 'Le verdict : {"resultat": valide | invalide | indisponible, "identifiant": …, "registre": …, "preuve": {…}}.';

-- Le verdict qui vaut pour un identifiant : celui du fournisseur s'il porte cet identifiant et date de moins de
-- p_jours jours, sinon la dernière réponse du registre (filed_verifications_tiers).
create or replace function private.filed_verdict_identite(p_four public.filed_fournisseurs, p_registre text, p_identifiant text, p_jours integer default 90)
returns table (resultat text, repondu_le timestamptz, source text, preuve jsonb)
language plpgsql stable set search_path to '' as $$
declare v_ident text := upper(regexp_replace(coalesce(p_identifiant, ''), '[^A-Za-z0-9]', '', 'g')); v_v public.filed_verifications_tiers;
begin
  if p_four.id is not null and p_four.identite_verifiee_le is not null and p_four.identite_verifiee_le >= now() - make_interval(days => p_jours)
     and upper(regexp_replace(coalesce(p_four.identite_verdict->>'identifiant', ''), '[^A-Za-z0-9]', '', 'g')) = v_ident then
    return query select p_four.identite_verdict->>'resultat', p_four.identite_verifiee_le, p_four.identite_source, coalesce(p_four.identite_verdict->'preuve', '{}'::jsonb);
    return;
  end if;
  v_v := private.filed_verification_recente(p_four.client_id, p_registre, v_ident, p_jours);
  if v_v.id is not null then
    return query select v_v.resultat, v_v.repondu_le, v_v.registre, v_v.preuve;
  end if;
end $$;

-- La réponse d'un registre remplit aussi le verdict du fournisseur, et ses factures sont recontrôlées.
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
      and ((v_v.registre = 'sirene' and f.siren = v_v.identifiant) or (v_v.registre = 'vies' and upper(regexp_replace(coalesce(f.tva, ''), '[^A-Za-z0-9]', '', 'g')) = v_v.identifiant)) limit 1));
  if v_four is not null and p_resultat <> 'indisponible' then
    update public.filed_fournisseurs
       set identite_verifiee_le = now(), identite_source = v_v.registre,
           identite_verdict = jsonb_build_object('resultat', p_resultat, 'identifiant', v_v.identifiant, 'registre', v_v.registre, 'preuve', coalesce(p_preuve, '{}'::jsonb)),
           maj_le = now()
     where id = v_four;
    perform private.filed_journaliser(v_v.client_id, 'filed.identite.verdict', 'filed_fournisseur', v_four::text,
      jsonb_build_object('registre', v_v.registre, 'identifiant', v_v.identifiant, 'resultat', p_resultat));
    perform private.filed_historiser(v_v.client_id, null, 'filed_fournisseur', v_four::text, 'identite_verifiee',
      format('Identité %s par %s (%s).', case p_resultat when 'valide' then 'confirmée' else 'infirmée' end, upper(v_v.registre), v_v.identifiant),
      jsonb_build_object('verification', v_v.id, 'resultat', p_resultat));
    perform private.filed_recontroler_fournisseur(v_four);
  end if;
end $$;

-- Une personne atteste l'identité (quand le registre ne répond pas, ou pour un fournisseur étranger sans registre).
create or replace function private.filed_attester_identite(p_fournisseur uuid, p_motif text)
returns void language plpgsql security definer set search_path to '' as $$
declare v_four public.filed_fournisseurs; v_uid uuid;
begin
  select * into v_four from public.filed_fournisseurs where id = p_fournisseur for update;
  if not found then raise exception 'Fournisseur introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(v_four.client_id, array['gerant', 'admin', 'valideur']);
  if nullif(btrim(p_motif), '') is null or char_length(btrim(p_motif)) < 3 then raise exception 'Une attestation dit sur quoi elle se fonde.' using errcode = '22023'; end if;
  update public.filed_fournisseurs
     set identite_verifiee_le = now(), identite_source = 'humain',
         identite_verdict = jsonb_build_object('resultat', 'valide', 'identifiant', coalesce(v_four.tva, v_four.siren, v_four.id_etranger, v_four.nom), 'registre', 'humain',
                                               'preuve', jsonb_build_object('par', v_uid, 'motif', left(btrim(p_motif), 500))),
         maj_le = now()
   where id = p_fournisseur;
  perform private.filed_journaliser(v_four.client_id, 'filed.identite.verdict', 'filed_fournisseur', v_four.id::text,
    jsonb_build_object('registre', 'humain', 'resultat', 'valide'));
  perform private.filed_historiser(v_four.client_id, null, 'filed_fournisseur', v_four.id::text, 'identite_attestee',
    'Identité attestée par une personne : ' || left(btrim(p_motif), 300), jsonb_build_object('par', v_uid));
  perform private.filed_recontroler_fournisseur(v_four.id);
end $$;

create or replace function public.filed_attester_identite(p_fournisseur uuid, p_motif text)
returns void language sql set search_path to '' as $$ select private.filed_attester_identite(p_fournisseur, p_motif) $$;
comment on function public.filed_attester_identite(uuid, text) is 'Une personne atteste l''identité d''un fournisseur (registre muet, fournisseur hors registre), avec son motif.';
revoke all on function public.filed_attester_identite(uuid, text) from public, anon;
grant execute on function public.filed_attester_identite(uuid, text) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Ce que le lecteur a lu remonte : SIREN, TVA, IBAN
-- ───────────────────────────────────────────────────────────────────────────
-- Les valeurs de la pièce (pieces_valeurs, champs fournisseur.siren / fournisseur.tva / fournisseur.iban /
-- fournisseur.nom) complètent fournisseur_lu quand la clé y manque, l'IBAN de la facture quand il est nul, et
-- le fournisseur rattaché quand il n'a ni SIREN ni TVA — seulement si la valeur tombe juste à la clé et
-- qu'aucun autre fournisseur de l'organisation ne la porte. Rend vrai si quelque chose a changé.
create or replace function private.filed_valeur_lue(p_piece uuid, p_champ text)
returns text language sql stable set search_path to '' as $$
  select nullif(btrim(coalesce(case when jsonb_typeof(v.valeur) = 'string' then v.valeur #>> '{}' else v.valeur->>'valeur' end, v.texte)), '')
    from public.pieces_valeurs v
   where v.piece_id = p_piece and v.champ = p_champ
   order by (v.source = 'humain') desc, v.verifiee desc, v.confiance desc nulls last
   limit 1
$$;

create or replace function private.filed_completer_fournisseur_lu(p_facture uuid)
returns boolean language plpgsql security definer set search_path to '' as $$
declare
  v_f public.filed_factures; v_doc public.filed_documents; v_four public.filed_fournisseurs;
  v_siren text; v_tva text; v_iban text; v_nom text; v_lu jsonb; v_change boolean := false; v_a record; v_detail jsonb := '{}'::jsonb;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found then return false; end if;
  select * into v_doc from public.filed_documents where id = v_f.document_id;
  if v_doc.piece_id is null then return false; end if;
  v_lu := coalesce(v_f.fournisseur_lu, '{}'::jsonb);

  v_siren := nullif(regexp_replace(coalesce(private.filed_valeur_lue(v_doc.piece_id, 'fournisseur.siren'), ''), '[^0-9]', '', 'g'), '');
  if v_siren is not null and char_length(v_siren) = 14 then v_siren := left(v_siren, 9); end if;
  v_tva := nullif(upper(regexp_replace(coalesce(private.filed_valeur_lue(v_doc.piece_id, 'fournisseur.tva'), ''), '[^A-Za-z0-9]', '', 'g')), '');
  v_iban := nullif(upper(regexp_replace(coalesce(private.filed_valeur_lue(v_doc.piece_id, 'fournisseur.iban'), ''), '[^A-Za-z0-9]', '', 'g')), '');
  v_nom := private.filed_valeur_lue(v_doc.piece_id, 'fournisseur.nom');
  if v_tva is not null then
    select * into v_a from private.filed_tva_intracom_analyser(v_tva);
    if not v_a.valide then v_tva := null; end if;
  end if;
  if v_siren is null and private.filed_siren_de_tva_fr(v_tva) is not null then v_siren := private.filed_siren_de_tva_fr(v_tva); end if;
  if v_siren is not null and not private.filed_siren_valide(v_siren) then v_siren := null; end if;
  if v_iban is not null and not (v_iban ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$' and private.filed_iban_valide(v_iban)) then v_iban := null; end if;

  -- fournisseur_lu : ce que la pièce donne, sans écraser ce qui y est déjà.
  if v_siren is not null and nullif(v_lu->>'siren', '') is null then v_lu := v_lu || jsonb_build_object('siren', v_siren); v_change := true; v_detail := v_detail || jsonb_build_object('siren', v_siren); end if;
  if v_tva is not null and nullif(v_lu->>'tva', '') is null then v_lu := v_lu || jsonb_build_object('tva', v_tva); v_change := true; v_detail := v_detail || jsonb_build_object('tva', v_tva); end if;
  if v_nom is not null and nullif(v_lu->>'nom', '') is null then v_lu := v_lu || jsonb_build_object('nom', left(v_nom, 200)); v_change := true; end if;
  if v_change then
    update public.filed_factures set fournisseur_lu = v_lu where id = v_f.id;
  end if;
  if v_iban is not null and v_f.iban is null then
    update public.filed_factures set iban = v_iban where id = v_f.id;
    v_change := true; v_detail := v_detail || jsonb_build_object('iban', private.filed_masquer_iban(v_iban));
  end if;

  -- Le fournisseur rattaché : SIREN et TVA quand il n'en a pas, et qu'aucun autre ne les porte.
  if v_f.fournisseur_id is not null then
    select * into v_four from public.filed_fournisseurs where id = v_f.fournisseur_id for update;
    if v_four.siren is null and v_siren is not null
       and not exists (select 1 from public.filed_fournisseurs x where x.client_id = v_four.client_id and x.siren = v_siren and x.id <> v_four.id) then
      update public.filed_fournisseurs set siren = v_siren, maj_le = now() where id = v_four.id;
      v_change := true; v_detail := v_detail || jsonb_build_object('fournisseur_siren', v_siren);
    end if;
    if v_four.tva is null and v_tva is not null
       and not exists (select 1 from public.filed_fournisseurs x where x.client_id = v_four.client_id and x.tva = v_tva and x.id <> v_four.id) then
      update public.filed_fournisseurs set tva = v_tva, maj_le = now() where id = v_four.id;
      v_change := true; v_detail := v_detail || jsonb_build_object('fournisseur_tva', v_tva);
    end if;
  end if;

  if v_detail <> '{}'::jsonb then
    perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'identite_completee',
      'Identité du fournisseur complétée depuis la pièce : ' || (select string_agg(k || ' ' || v, ', ') from jsonb_each_text(v_detail) e(k, v)) || '.', v_detail);
  end if;
  return v_change;
end $$;
comment on function private.filed_completer_fournisseur_lu(uuid) is
  'Remonte SIREN, TVA et IBAN lus sur la pièce vers la facture (fournisseur_lu, iban) et le fournisseur rattaché, quand ils manquent et tombent juste à la clé.';

-- En tête de filed_controler_facture : le corps en place, un repère, une insertion (robuste aux autres lots).
do $$
declare v_def text; v_a text;
begin
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and p.proname = 'filed_controler_facture';
  if v_def is null then raise exception 'private.filed_controler_facture est introuvable.'; end if;
  if position('filed_completer_fournisseur_lu' in v_def) > 0 then
    raise notice 'filed_controler_facture : lot 7 déjà branché.';
    return;
  end if;
  v_a := E'  select * into v_doc from public.filed_documents where id = v_f.document_id;\n';
  if position(v_a in v_def) = 0 then raise exception 'Repère introuvable dans filed_controler_facture (lecture du document).'; end if;
  v_def := overlay(v_def placing
       E'  -- ── Lot 7 (A4) : ce que le lecteur a lu du fournisseur (SIREN, TVA, IBAN) remonte avant les contrôles ──\n'
    || E'  if private.filed_completer_fournisseur_lu(v_f.id) then\n'
    || E'    select * into v_f from public.filed_factures where id = v_f.id;\n'
    || E'  end if;\n'
    || v_a
    from position(v_a in v_def) for char_length(v_a));
  execute v_def;
  raise notice 'filed_controler_facture : lot 7 branché.';
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Les contrôles d'identité lisent le verdict du fournisseur
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_controles_identite(p_facture uuid) returns void
language plpgsql security definer set search_path to '' as $$
declare
  v_f      public.filed_factures;
  v_four   public.filed_fournisseurs;
  v_tva    text;
  v_siren  text;
  v_a      record;
  v_siren_tva text;
  v_tva_ok boolean := false;
  v_registre text; v_ident text; v_verdict record;
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

  -- identite.tva_intracom
  if v_tva is null then
    perform private.filed_poser_resultat(v_f, 'identite.tva_intracom', 'attention', true,
      'Aucun numéro de TVA intracommunautaire sur la pièce ni sur le fournisseur.', 'EMMET_INC',
      jsonb_build_object('tva', null), 'absent');
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
      'Aucun SIREN sur la pièce ni sur le fournisseur.', 'EMMET_INC', jsonb_build_object('siren', null), 'absent');
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

  -- identite.registre : le verdict du fournisseur, ou ce que VIES / Sirene ont répondu, ou la demande à l'ouvrier.
  if v_tva_ok then v_registre := 'vies'; v_ident := v_tva;
  elsif v_siren is not null and private.filed_siren_valide(v_siren) then v_registre := 'sirene'; v_ident := v_siren;
  end if;
  if v_registre is not null then
    select * into v_verdict from private.filed_verdict_identite(v_four, v_registre, v_ident);
    if v_verdict.resultat is null then
      perform private.filed_demander_verification(v_f.client_id, v_f.fournisseur_id, v_registre, v_ident);
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'attention', true,
        case v_registre when 'vies' then 'Numéro de TVA pas encore confirmé par VIES : vérification demandée.'
                        else 'SIREN pas encore confirmé par Sirene : vérification demandée.' end,
        'EMMET_INC', jsonb_build_object('registre', v_registre, 'identifiant', v_ident), v_registre || ':' || v_ident);
    elsif v_verdict.resultat = 'invalide' then
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'bloquant', true,
        case v_registre when 'vies' then format('VIES ne reconnaît pas le numéro de TVA %s (réponse du %s).', v_ident, to_char(v_verdict.repondu_le, 'DD/MM/YYYY'))
                        else format('Sirene ne connaît pas le SIREN %s, ou l''entreprise est fermée (réponse du %s).', v_ident, to_char(v_verdict.repondu_le, 'DD/MM/YYYY')) end,
        'EMMET_INC', jsonb_build_object('registre', v_registre, 'identifiant', v_ident, 'repondu_le', v_verdict.repondu_le, 'source', v_verdict.source, 'preuve', v_verdict.preuve), v_registre || ':' || v_ident);
    elsif v_verdict.resultat = 'indisponible' then
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'attention', true,
        case v_registre when 'vies' then 'VIES n''a pas répondu : numéro de TVA à confirmer.' else 'Sirene n''a pas répondu : SIREN à confirmer.' end,
        'EMMET_INC', jsonb_build_object('registre', v_registre, 'identifiant', v_ident, 'repondu_le', v_verdict.repondu_le), v_registre || ':' || v_ident);
    else
      perform private.filed_poser_resultat(v_f, 'identite.registre', 'attention', false,
        format('Identité confirmée par %s le %s.', case v_verdict.source when 'vies' then 'VIES' when 'sirene' then 'Sirene' else 'une personne' end, to_char(v_verdict.repondu_le, 'DD/MM/YYYY')), null,
        jsonb_build_object('registre', v_registre, 'identifiant', v_ident, 'repondu_le', v_verdict.repondu_le, 'source', v_verdict.source), v_registre || ':' || v_ident);
    end if;
  end if;
end $$;
comment on function private.filed_controles_identite(uuid) is
  'Les contrôles d''identité du fournisseur d''une facture (TVA intracommunautaire, SIREN, cohérence, registres ou verdict attesté). Appelée par private.filed_controler_facture.';

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Confirmer un fournisseur nouveau
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_confirmer_fournisseur(p_fournisseur uuid, p_motif text default null)
returns integer language plpgsql security definer set search_path to '' as $$
declare v_four public.filed_fournisseurs; v_uid uuid; v_depose_par uuid; v_n integer; r record;
begin
  select * into v_four from public.filed_fournisseurs where id = p_fournisseur for update;
  if not found then raise exception 'Fournisseur introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(v_four.client_id, array['gerant', 'admin', 'valideur']);
  if v_four.statut <> 'a_confirmer' then
    raise exception 'Ce fournisseur n''est pas à confirmer (%).', v_four.statut using errcode = '55000';
  end if;
  -- Celui qui a déposé la pièce d'origine ne confirme pas le fournisseur qu'elle fait naître.
  if v_uid is not null and v_four.document_origine is not null then
    select d.depose_par into v_depose_par from public.filed_documents d where d.id = v_four.document_origine;
    if v_depose_par = v_uid then
      raise exception 'La personne qui a déposé la pièce d''origine ne confirme pas ce fournisseur : une autre personne décide.' using errcode = '42501';
    end if;
  end if;

  update public.filed_fournisseurs
     set statut = 'actif', confirme_le = now(), confirme_par = v_uid, motif = left(nullif(btrim(p_motif), ''), 500), maj_le = now()
   where id = v_four.id;
  -- L'IBAN proposé avec lui (sur sa pièce d'origine) se valide avec lui ; un autre IBAN proposé part à la file.
  update public.filed_fournisseurs_ibans set statut = 'valide', decide_le = now(), decide_par = v_uid
   where fournisseur_id = v_four.id and statut = 'propose' and document_id is not distinct from v_four.document_origine and v_four.document_origine is not null;
  for r in select i.id, i.iban_masque from public.filed_fournisseurs_ibans i where i.fournisseur_id = v_four.id and i.statut = 'propose' loop
    perform private.filed_deposer_demande(v_four.client_id, null, 'filed.valider_iban', 'filed_iban', r.id::text,
      format('Nouvel IBAN pour %s : %s', private.filed_libelle_fournisseur(v_four), r.iban_masque), null,
      jsonb_build_object('fournisseur', v_four.id, 'iban', r.iban_masque), 'filed:iban:' || r.id::text);
  end loop;
  -- La demande de la file encore en attente pour ce fournisseur est sans objet.
  update public.demandes_validation set statut = 'annulee'
   where client_id = v_four.client_id and module = 'filed' and type_action = 'filed.valider_fournisseur'
     and objet_id = v_four.id::text and statut = 'en_attente';

  perform private.filed_historiser(v_four.client_id, null, 'filed_fournisseur', v_four.id::text, 'confirme',
    'Fournisseur confirmé par une personne' || coalesce(' : ' || left(btrim(p_motif), 300), '.'), jsonb_build_object('par', v_uid));
  perform private.filed_journaliser(v_four.client_id, 'filed.fournisseur.confirmation', 'filed_fournisseur', v_four.id::text,
    jsonb_build_object('par', v_uid, 'motif', left(nullif(btrim(p_motif), ''), 300)));
  -- Ses factures bloquées sur « fournisseur.a_confirmer » sont recontrôlées.
  perform private.filed_recontroler_fournisseur(v_four.id);
  select count(*) into v_n from public.filed_factures f where f.fournisseur_id = v_four.id and f.statut in ('a_completer', 'bloquee', 'a_valider');
  return v_n;
end $$;

create or replace function public.filed_confirmer_fournisseur(p_fournisseur uuid, p_motif text default null)
returns integer language sql set search_path to '' as $$ select private.filed_confirmer_fournisseur(p_fournisseur, p_motif) $$;
comment on function public.filed_confirmer_fournisseur(uuid, text) is
  'Confirme un fournisseur nouveau (gérant, admin, valideur ; jamais le déposant de sa pièce d''origine) : actif, IBAN proposé avec lui validé, factures recontrôlées. Rend le nombre de ses factures en cours.';
revoke all on function public.filed_confirmer_fournisseur(uuid, text) from public, anon;
grant execute on function public.filed_confirmer_fournisseur(uuid, text) to authenticated, service_role;
