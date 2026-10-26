-- 20261026183759 c3_45_reprise_ecarts_testeur
-- Source : dépôt : af472f50f747dc56af0bcb43e7dd271991031ffe omega/modules/reput/migrations/c3_45_reprise_ecarts_testeur.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c3_45_reprise_ecarts_testeur.sql @ af472f50f747dc56af0bcb43e7dd271991031ffe ; fichiers de tests ignorés : omega/tests/reput/c3_45_reprise_ecarts_testeur.sql, omega/tests/reput/c3_44_reprise_apres_refus.sql.
-- ═══ omega/modules/reput/migrations/c3_45_reprise_ecarts_testeur.sql @ af472f50f747dc56af0bcb43e7dd271991031ffe
-- c3_45 — REPUT : les écarts du testeur indépendant sur la reprise après refus (session C3, 26/10/2026 ; rapport
-- omega/RECETTE-TESTEUR-MODULES-2026-10-26.md, branche testeur-modules 157b506f)
--
--   · TMOD-08 (important) : après un refus sans reprise possible, la demande ne reste jamais en suspens (« à valider »
--     sans rien à valider, ou « refusée ») : elle passe « à traiter vous-même », avec une alerte
--     (private.reput_rendre_a_traiter). Cas couverts : reprise impossible (tous les motifs, dont « même texte »
--     et le délai dépassé) ; reprise elle-même refusée (le socle n'en ouvre pas de seconde) — motif « Reprise
--     refusée », avec le commentaire du second refus. reput_traiter_reprises recopie d'abord les décisions de la
--     file (reput_synchroniser), puis balaie les demandes « refusée » dont la dernière réponse est refusée sans
--     reprise à venir.
--   · TMOD-09 (mineur) : « consigne suivie » seulement si toute la consigne l'est ; sinon « consigne suivie en partie ;
--     non suivi : … » — ce que le modèle dit ne pas avoir pu suivre (champ consigne_non_suivie de reput-reponse,
--     08b9fe2c → c3_45) et ce qui ne se règle pas dans le corps (formule d'appel, politesse, signature : réglages
--     REPUT ; jamais une civilité que le client n'a pas écrite). La demande de validation porte consigne_suivie et
--     consigne_non_suivie.
--   · TMOD-10 (mineur) : le motif d'un refus sans consigne ne propose plus de « refuser de nouveau » (une réponse
--     refusée ne se refuse ni ne se corrige plus) : répondre soi-même ; au prochain refus, un commentaire suffit.
--
-- Règles de pose : APRÈS c3_44. create or replace ; ni DROP ni DELETE ; revoke execute de public.

-- Ce qu'une consigne demande hors du corps du message (réglages REPUT) : la base ne peut pas le suivre ici.
create or replace function private.reput_consigne_hors_corps(p_consigne text)
 returns text[] language sql immutable set search_path to ''
as $function$
  select array_remove(array[
    case when coalesce(p_consigne, '') ~* '(formule d.appel|\mbonjour\M|\mbonsoir\M|\mmadame\M|\mmonsieur\M|\mmademoiselle\M|\mmme\M|civilit)'
         then 'la formule d''appel vient des réglages REPUT (et jamais une civilité que le client n''a pas écrite)' end,
    case when coalesce(p_consigne, '') ~* '(signature|\msign(e|é|ez|er)\M|cordialement|salutations|formule de politesse|bien à vous)'
         then 'la formule de politesse et la signature viennent des réglages REPUT' end], null)
$function$;

-- Une demande qui n'aura pas de réponse du module va à une personne : « à traiter », avec une alerte.
create or replace function private.reput_rendre_a_traiter(p_demande uuid, p_motif text)
 returns boolean language plpgsql security definer set search_path to ''
as $function$
declare d public.reput_demandes;
begin
  update public.reput_demandes x set statut = 'a_traiter', motif = left(coalesce(nullif(btrim(p_motif), ''), 'À traiter vous-même.'), 500),
         maj_le = now()
   where x.id = p_demande and x.statut in ('refusee', 'a_preparer', 'a_valider')
  returning * into d;
  if d.id is null then
    return false;
  end if;
  perform private.lever_alerte_module(d.client_id, 'reput', 'attention',
    left('Demande à traiter vous-même : ' || coalesce(nullif(btrim(d.de_nom), ''), coalesce(d.adresse_reponse, 'un client')), 150),
    jsonb_build_object('demande', d.id, 'motif', d.motif), 'demande:' || d.id::text || ':a_traiter', true, null);
  perform private.journaliser_module(d.client_id, 'reput', 'reput.demande_a_traiter', 'reput_demandes', d.id::text,
    jsonb_build_object('motif', d.motif), d.entite_id);
  return true;
end $function$;

-- Clore une reprise (reprise de c3_44) : la demande qui l'attendait ou restait « refusée » va à une personne.
create or replace function private.reput_reprise_impossible(p_refusee uuid, p_motif text, p_rendre boolean default true)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare
  rr private.reput_reprises;
  v_motif text := left(coalesce(nullif(btrim(p_motif), ''), 'sans motif'), 480);
begin
  if exists (select 1 from private.reprises x where x.demande_id = p_refusee and x.statut = 'a_faire') then
    perform private.reprise_impossible(p_refusee, v_motif);
  end if;
  update private.reput_reprises x set statut = 'impossible', motif = v_motif, traite_le = now()
   where x.refusee = p_refusee and x.statut = 'a_rediger'
  returning * into rr;
  if rr.refusee is null then
    return;
  end if;
  if p_rendre and rr.demande_id is not null
     and (select d.statut from public.reput_demandes d where d.id = rr.demande_id) in ('refusee', 'a_preparer') then
    perform private.reput_rendre_a_traiter(rr.demande_id, 'Reprise impossible : ' || v_motif);
  end if;
  perform private.journaliser_module(rr.client_id, 'reput', 'reput.reprise_impossible', 'reput_demandes', coalesce(rr.demande_id::text, p_refusee::text),
    jsonb_build_object('refusee', p_refusee, 'motif', v_motif), null);
end $function$;

-- Traiter une reprise (reprise de c3_44) : motif TMOD-10, et la demande va à une personne quand c'est impossible.
create or replace function private.reput_reprendre_refus(p_refusee uuid, p_consigne jsonb)
 returns text language plpgsql security definer set search_path to ''
as $function$
declare
  dv public.demandes_validation;
  p public.reput_reponses;
  d public.reput_demandes;
  v_consigne text := private.reput_consigne(p_consigne);
  v_motif text;
begin
  select * into dv from public.demandes_validation x where x.id = p_refusee;
  if dv.id is null or dv.module <> 'reput' or exists (select 1 from private.reput_reprises x where x.refusee = p_refusee) then
    return null;
  end if;
  -- La décision de la file, recopiée sur la réponse et la demande avant d'en juger.
  perform private.reput_synchroniser(dv.client_id);
  select * into p from public.reput_reponses x where x.demande_validation_id = dv.id order by x.version desc limit 1;
  if p.id is not null then
    select * into d from public.reput_demandes x where x.id = p.demande_id for update;
  end if;
  insert into private.reput_reprises (refusee, client_id, demande_id, reponse_id, consigne)
  values (p_refusee, dv.client_id, d.id, p.id, v_consigne);
  v_motif := case
    when dv.objet_type is distinct from 'reput_demandes' or p.id is null or dv.type_action = 'reput.accuser'
      then 'pas une réponse rédigée par REPUT (accusé, avis ou réglage) : rien à reprendre'
    when (p_consigne ->> 'motif') = 'Doublon'
      then 'refusée comme doublon : REPUT ne repropose pas cette réponse'
    when exists (select 1 from public.reput_reponses x where x.demande_id = d.id and x.version > p.version)
      then 'une version corrigée par une personne la remplace déjà'
    when v_consigne is null
      -- c3_45 (TMOD-10) : seulement des gestes possibles (une réponse refusée ne se refuse ni ne se corrige plus).
      then 'refusée sans consigne (ni motif ni commentaire) : REPUT ne sait pas quoi corriger. Répondez au client vous-même ; '
           || 'au prochain refus, un commentaire suffit pour que REPUT propose une réponse corrigée'
    when d.statut <> 'refusee'
      then format('la demande n''attend plus cette réponse (%s)', replace(d.statut, '_', ' '))
    when d.canal_reponse is null
      then 'aucune adresse de réponse : contactez cette personne vous-même'
  end;
  if v_motif is not null then
    perform private.reput_reprise_impossible(p_refusee, v_motif);   -- c3_45 : la demande va à une personne
    return 'impossible';
  end if;
  update public.reput_demandes x set statut = 'a_preparer', decidee_le = null,
         motif = 'Reprise après refus : une nouvelle réponse est en préparation, à valider de nouveau.', maj_le = now()
   where x.id = d.id;
  perform private.deposer_travail(d.client_id, 'reput', 'reput.preparer',
    jsonb_build_object('reception', d.reception_id, 'module', 'reput', 'evenement', 'reput.reprise', 'reprise_de', p_refusee),
    'reprise:' || p_refusee::text, 5::smallint);
  perform private.journaliser_module(d.client_id, 'reput', 'reput.reprise_demandee', 'reput_demandes', d.id::text,
    jsonb_build_object('refusee', p_refusee, 'reponse', p.id, 'version', p.version, 'consigne_caracteres', char_length(v_consigne)), d.entite_id);
  return 'a_rediger';
end $function$;

-- Le passage du cron (reprise de c3_44) : décisions recopiées, refus nouveaux, reprises qui n'aboutissent pas, puis
-- les demandes refusées sans reprise à venir (TMOD-08).
create or replace function private.reput_traiter_reprises(p_delai interval default interval '1 hour')
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare x record; n integer := 0;
begin
  if to_regprocedure('private.reprises_a_faire(text)') is null then
    return 0;
  end if;
  perform private.reput_synchroniser(null);
  for x in select f.* from private.reprises_a_faire('reput') f
           where not exists (select 1 from private.reput_reprises r where r.refusee = f.demande_id) loop
    begin
      if private.reput_reprendre_refus(x.demande_id, x.consigne) is not null then
        n := n + 1;
      end if;
    exception when others then
      perform private.lever_alerte_module(x.client_id, 'reput', 'attention', 'Une réponse refusée n''a pas pu être reprise : elle reste refusée.',
        jsonb_build_object('demande_validation', x.demande_id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'reprise:echec:' || x.demande_id::text, true, null);
    end;
  end loop;
  for x in select r.refusee, d.statut from private.reput_reprises r join public.reput_demandes d on d.id = r.demande_id
           where r.statut = 'a_rediger' and (d.statut <> 'a_preparer' or r.cree_le < now() - p_delai) loop
    perform private.reput_reprise_impossible(x.refusee,
      case when x.statut <> 'a_preparer' then 'la nouvelle rédaction n''a pas abouti : la demande revient à une personne'
           else 'la nouvelle rédaction n''a pas abouti dans le délai : la demande revient à une personne' end);
    n := n + 1;
  end loop;
  -- TMOD-08 : une demande refusée dont la dernière réponse est refusée, sans reprise à venir (reprise elle-même refusée,
  -- ou reprise close avant c3_45), va à une personne.
  for x in select d.id, dv.id as dv_id, (dv.payload ? 'reprise_de') as est_reprise
           from public.reput_demandes d
           join lateral (select p.demande_validation_id from public.reput_reponses p where p.demande_id = d.id order by p.version desc limit 1) p on true
           join public.demandes_validation dv on dv.id = p.demande_validation_id
           where d.statut = 'refusee' and dv.statut = 'rejetee'
             and (dv.payload ? 'reprise_de' or exists (select 1 from private.reprises r where r.demande_id = dv.id and r.statut = 'impossible'))
             and not exists (select 1 from private.reprises r where r.demande_id = dv.id and r.statut = 'a_faire')
             and not exists (select 1 from private.reput_reprises rr where rr.demande_id = d.id and rr.statut = 'a_rediger') loop
    if private.reput_rendre_a_traiter(x.id, case when x.est_reprise
         then 'Reprise refusée : écrivez la réponse vous-même.' || coalesce(' Consigne du refus : ' || nullif(btrim(regexp_replace(
                (select a.commentaire from public.approbations a where a.demande_id = x.dv_id and a.decision = 'rejete'
                  order by a.decide_le desc nulls last limit 1), '^\[seul décideur\]', '')), ''), '')
         else 'Réponse refusée, sans reprise possible : écrivez la réponse vous-même.' end) then
      n := n + 1;
    end if;
  end loop;
  return n;
end $function$;

do $do$ declare f text; begin
  foreach f in array array['private.reput_consigne_hors_corps(text)', 'private.reput_rendre_a_traiter(uuid, text)',
                           'private.reput_reprise_impossible(uuid, text, boolean)', 'private.reput_reprendre_refus(uuid, jsonb)',
                           'private.reput_traiter_reprises(interval)'] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $do$;

-- Le dépôt (reprise de c3_44) : « consigne suivie » ou « suivie en partie » (TMOD-09).
create or replace function public.reput_deposer_reponse(p_demande uuid, p_resultat jsonb, p_version text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes;
  r public.receptions;
  v_base jsonb;
  v_sujet text;
  v_autorisable boolean;
  v_langue text;
  v_langues text[];
  v_sources uuid[];
  v_couverte boolean;
  v_raison text;
  v_corps text;
  v_objet text;
  v_type text;
  v_rep public.reput_reponses;
  v_dv uuid;
  v_dv_statut text;
  v_politique uuid;
  v_envoi uuid;
  v_e public.envois;
  v_statut_rep text;
  v_statut_dem text;
  v_erreur text;
  v_libelle text;
  v_urgence boolean := coalesce((p_resultat ->> 'urgence')::boolean, false);
  v_reprise private.reput_reprises;
  v_refusee public.reput_reponses;
  v_corr jsonb;
  v_resume text;
  v_payload jsonb;
  v_non text[] := '{}';
begin
  if not private.reput_est_serveur() then
    raise exception 'Réservé au serveur d''Omega.' using errcode = '42501';
  end if;
  if p_resultat is null or jsonb_typeof(p_resultat) <> 'object' then
    raise exception 'Le résultat forme un objet JSON.' using errcode = '22023';
  end if;
  select * into d from public.reput_demandes x where x.id = p_demande for update;
  if d.id is null then
    raise exception 'Demande REPUT introuvable.' using errcode = 'P0002';
  end if;
  if d.statut <> 'a_preparer' then
    return jsonb_build_object('statut', 'deja', 'demande', d.id, 'etat', d.statut);
  end if;
  -- c3_44 : la reprise après refus en cours, s'il y en a une.
  select * into v_reprise from private.reput_reprises x where x.demande_id = d.id and x.statut = 'a_rediger' for update;
  if v_reprise.refusee is not null then
    select * into v_refusee from public.reput_reponses x where x.id = v_reprise.reponse_id;
  end if;
  select * into r from public.receptions x where x.id = d.reception_id;
  v_base := private.reput_base(d.client_id, d.entite_id, now());

  -- Le sujet : un sujet actif de l'organisation, sinon « autre ».
  v_sujet := lower(btrim(p_resultat ->> 'sujet'));
  select s.code, s.autorisable, s.libelle into v_sujet, v_autorisable, v_libelle
  from public.reput_sujets s where s.client_id = d.client_id and s.code = v_sujet and s.actif;
  if v_sujet is null then
    select s.code, s.autorisable, s.libelle into v_sujet, v_autorisable, v_libelle
    from public.reput_sujets s where s.client_id = d.client_id and s.code = 'autre';
  end if;
  v_autorisable := coalesce(v_autorisable, false) and not (v_sujet = any (private.reput_sujets_proteges()));

  v_langue := lower(btrim(p_resultat ->> 'langue'));
  if v_langue is null or v_langue !~ '^[a-z]{2}$' then
    v_langue := coalesce(d.langue, 'fr');
  end if;
  select array_agg(x) into v_langues from jsonb_array_elements_text(coalesce(v_base -> 'reglages' -> 'langues', '["fr"]'::jsonb)) x;

  -- Les sources : seulement des fiches validées et en vigueur de cette base ; le reste est écarté.
  select coalesce(array_agg(distinct (f ->> 'id')::uuid), '{}') into v_sources
  from jsonb_array_elements(coalesce(v_base -> 'fiches', '[]'::jsonb)) f
  where jsonb_typeof(p_resultat -> 'sources') = 'array' and (p_resultat -> 'sources') ? (f ->> 'id');

  v_raison := nullif(left(btrim(p_resultat ->> 'raison'), 500), '');
  v_couverte := coalesce((p_resultat ->> 'couverte')::boolean, false);
  if v_couverte and cardinality(v_sources) = 0 then
    v_couverte := false;
    v_raison := coalesce(v_raison, 'Aucune fiche de la base citée : la réponse n''est pas sourcée.');
  end if;
  if v_couverte and not (v_langue = any (v_langues)) then
    v_couverte := false;
    v_raison := format('Langue « %s » non couverte par les réglages (%s) : transférée.', v_langue, array_to_string(v_langues, ', '));
  end if;
  if nullif(btrim(p_resultat ->> 'corps'), '') is null then
    raise exception 'Le résultat porte un corps (même un « je ne sais pas »).' using errcode = '22023';
  end if;
  -- c3_06 : un contact en litige ouvert ne reçoit jamais de réponse automatisée.
  -- c3_13 : une urgence n'est jamais envoyée seule, même tirée de la base sur un sujet autorisé.
  v_type := case when v_couverte and v_autorisable and not coalesce(d.litige, false) and not v_urgence
                 then 'reput.repondre.' || v_sujet else 'reput.transferer' end;
  -- c3_25 : le client n'entend parler que du service qui reprend sa demande (celui du sujet principal, c3_07) ; un autre
  -- service de l'organisation nommé par le modèle est ramené à celui-ci, ou à « notre équipe ».
  -- c3_26 (TREPUT-01) : jamais de civilité que le client n'a pas écrite lui-même.
  -- c3_33 : gabarit du canal (appel manqué : l'excuse d'abord ; SMS : forme courte).
  v_corps := private.reput_sans_civilite(private.reput_ramener_service(d.client_id, v_sujet,
               private.reput_gabarit(d.client_id, d.entite_id, d.canal, d.canal_reponse,
                 v_base -> 'reglages', v_langue, p_resultat)), private.reput_civilite_recue(r));
  -- c3_33 : un SMS trop long ne part jamais seul ; une personne le raccourcit.
  if d.canal_reponse in ('sms', 'whatsapp') and char_length(v_corps) > private.reput_limite_sms() then
    v_type := 'reput.transferer';
    v_raison := left(coalesce(v_raison || ' ', '') || format('Réponse par %s trop longue (%s caractères, %s au plus) : à raccourcir.',
                upper(d.canal_reponse), char_length(v_corps), private.reput_limite_sms()), 500);
  end if;
  v_objet := case when d.canal_reponse = 'email'
                  then left(coalesce('Re : ' || nullif(btrim(r.sujet), ''), nullif(btrim(p_resultat ->> 'objet'), ''), 'Votre demande'), 300) end;

  -- c3_44 : une reprise dit ce qu'elle corrige ; le même texte qu'avant n'est pas reproposé.
  if v_reprise.refusee is not null then
    v_corr := '[]'::jsonb;
    if private.reput_texte_plat(v_corps) is distinct from private.reput_texte_plat(v_refusee.corps) then
      v_corr := v_corr || jsonb_build_array(jsonb_build_object('champ', 'corps', 'avant', v_refusee.corps, 'apres', v_corps));
    end if;
    if v_objet is distinct from v_refusee.objet then
      v_corr := v_corr || jsonb_build_array(jsonb_build_object('champ', 'objet', 'avant', v_refusee.objet, 'apres', v_objet));
    end if;
    if jsonb_array_length(v_corr) = 0 then
      perform private.reput_reprise_impossible(v_reprise.refusee,
        'même texte qu''avant : relue avec la consigne (' || left(v_reprise.consigne, 200) || '), la réponse ne change pas. '
        || 'Répondez vous-même, ou complétez la base : la réponse suivante en tiendra compte.');
      return jsonb_build_object('statut', 'refusee', 'demande', d.id, 'reprise', 'impossible', 'reprise_de', v_reprise.refusee,
                                'motif', 'même texte qu''avant');
    end if;
    if v_sujet is distinct from v_refusee.sujet then
      v_corr := v_corr || jsonb_build_array(jsonb_build_object('champ', 'sujet', 'avant', v_refusee.sujet, 'apres', v_sujet));
    end if;
    -- c3_45 (TMOD-09) : « suivie » seulement si toute la consigne l'est ; sinon « suivie en partie », avec ce qui ne l'est pas
    -- (ce que le modèle dit ne pas avoir pu suivre, et ce qui ne se règle pas dans le corps : formule d'appel, signature).
    v_non := private.reput_consigne_hors_corps(v_reprise.consigne);
    if nullif(btrim(p_resultat ->> 'consigne_non_suivie'), '') is not null then
      v_non := array[left(btrim(p_resultat ->> 'consigne_non_suivie'), 300)] || v_non;
    end if;
    v_raison := left(case when cardinality(v_non) = 0 then 'Reprise après refus (consigne suivie) : à valider de nouveau.'
                          else 'Reprise après refus (consigne suivie en partie ; non suivi : ' || array_to_string(v_non, ' ; ')
                               || ') : à valider de nouveau.' end
                     || coalesce(' ' || v_raison, ''), 500);
  end if;

  insert into public.reput_reponses (client_id, entite_id, demande_id, version, sujet, langue, couverte, objet, brouillon, corps,
    sources, raison, type_action, statut, modele, version_ouvrier, jetons_entree, jetons_sortie, cout_eur)
  values (d.client_id, d.entite_id, d.id, coalesce((select max(x.version) from public.reput_reponses x where x.demande_id = d.id), 0) + 1, v_sujet, v_langue, v_couverte, v_objet, left(btrim(private.reput_sans_civilite(private.reput_ramener_service(d.client_id, v_sujet, p_resultat ->> 'corps'), private.reput_civilite_recue(r))), 4000), v_corps,
    v_sources, v_raison, v_type, 'a_valider', left(p_resultat ->> 'modele', 80), left(p_version, 80),
    greatest(coalesce((p_resultat ->> 'tokens_entree')::integer, 0), 0), greatest(coalesce((p_resultat ->> 'tokens_sortie')::integer, 0), 0),
    greatest(coalesce((p_resultat ->> 'cout_eur')::numeric, 0), 0))
  returning * into v_rep;

  -- La file de validation du socle, et l'envoi adossé (même canal que la demande).
  begin
    v_resume := left(format('Réponse à %s — %s%s', coalesce(nullif(btrim(d.de_nom), ''), coalesce(d.adresse_reponse, 'un client')),
                       coalesce(v_libelle, v_sujet),
                       -- c3_40 : une réponse tirée de fiches de la base mais pas entièrement couverte n'est pas « hors base ».
                       case when v_couverte then ''
                            when cardinality(v_sources) > 0 then ' (en partie dans la base : à relire)'
                            else ' (hors base : à compléter)' end), 500);
    v_payload := jsonb_build_object('reponse', v_rep.id, 'demande', d.id, 'sujet', v_sujet, 'couverte', v_couverte,
                               'canal', d.canal_reponse, 'langue', v_langue, 'sources', to_jsonb(v_sources),
                               'objet', v_objet, 'corps', v_corps);
    if v_reprise.refusee is not null then
      v_payload := v_payload || jsonb_build_object('consigne_suivie', cardinality(v_non) = 0, 'consigne_non_suivie', to_jsonb(v_non));
      -- c3_44 : la demande liée à la refusée, au nom du moteur (socle 19az : même type, même circuit, en attente).
      v_dv := private.proposer_reprise(v_reprise.refusee, v_resume, v_payload, v_corr, null);
      select x.statut, x.politique_id into v_dv_statut, v_politique from public.demandes_validation x where x.id = v_dv;
      update private.reput_reprises x set statut = 'proposee', reprise_id = v_dv, traite_le = now() where x.refusee = v_reprise.refusee;
    else
    insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload,
                                            echeance, cle_idempotence)
    values (d.client_id, d.entite_id, 'reput', private.reput_type_file(v_type, v_sujet), 'reput_demandes', d.id::text,
            v_resume, v_payload,
            now() + interval '7 days', 'reput:reponse:' || v_rep.id::text)
    returning id, statut, politique_id into v_dv, v_dv_statut, v_politique;
    end if;
    if d.canal_reponse is not null then
      -- c3_36 : appel + WhatsApp → le modèle Meta validé ; sinon le texte libre.
      v_envoi := private.reput_preparer_envoi(d, v_langue, v_objet, v_corps, 'reput:envoi:' || v_rep.id::text, v_dv);
      select * into v_e from public.envois e where e.id = v_envoi;
    end if;
  exception when others then
    v_erreur := left(sqlstate || ' ' || sqlerrm, 500);
    v_dv := null; v_dv_statut := null; v_politique := null; v_envoi := null; v_e := null;
  end;
  -- c3_44 : une reprise qui n'a pas pu être déposée est close (la demande revient à une personne, ci-dessous).
  if v_reprise.refusee is not null and v_erreur is not null then
    perform private.reput_reprise_impossible(v_reprise.refusee, 'dépôt impossible : ' || v_erreur, false);
  end if;

  v_statut_rep := case when v_erreur is not null or v_envoi is null then 'sans_envoi'
                       when v_e.statut in ('bloque', 'refuse', 'annule', 'expire', 'echec') then 'bloquee'
                       when v_e.statut = 'envoye' then 'envoyee'
                       when v_e.statut in ('pret', 'differe', 'en_cours') then 'approuvee'
                       else 'a_valider' end;
  v_statut_dem := case v_statut_rep when 'sans_envoi' then 'a_traiter' when 'bloquee' then 'bloquee'
                                    when 'envoyee' then 'envoyee' when 'approuvee' then 'validee' else 'a_valider' end;
  update public.reput_reponses x set demande_validation_id = v_dv, envoi_id = v_envoi, statut = v_statut_rep,
         raison = coalesce(x.raison, case when v_erreur is not null then 'Dépôt impossible : ' || v_erreur
                                          -- c3_42 : le libellé dit le geste ; un appel d'un fixe ou d'un numéro masqué se rappelle.
                                          when d.canal_reponse is null and d.canal = 'appel'
                                            then 'Appel d''un fixe ou d''un numéro masqué : aucun écrit possible, rappelez cette personne.'
                                          when d.canal_reponse is null then 'Aucune adresse de réponse : contactez cette personne vous-même.' end),
         maj_le = now()
  where x.id = v_rep.id returning * into v_rep;
  update public.reput_demandes x set statut = v_statut_dem, sujet = v_sujet, langue = v_langue, urgence = v_urgence,
         couverte = v_couverte, preparee_le = now(),
         decidee_le = case when v_statut_dem in ('validee', 'envoyee') then now() end,
         envoyee_le = case when v_statut_dem = 'envoyee' then now() end,
         motif = case when v_statut_dem in ('a_traiter', 'bloquee') then left(coalesce(v_rep.raison, v_e.motif, v_e.verrou), 500) end,
         maj_le = now()
  where x.id = d.id returning * into d;
  update public.receptions x set statut = 'lue' where x.id = r.id and x.statut = 'nouvelle';

  perform private.journaliser_module(d.client_id, 'reput', 'reput.reponse_preparee', 'reput_demandes', d.id::text,
    jsonb_build_object('reponse', v_rep.id, 'sujet', v_sujet, 'langue', v_langue, 'couverte', v_couverte, 'urgence', v_urgence,
                       'sources', to_jsonb(v_sources), 'type_action', v_type, 'demande_validation', v_dv, 'politique', v_politique,
                       'envoi', v_envoi, 'envoi_statut', v_e.statut, 'verrou', v_e.verrou, 'statut', d.statut,
                       'modele', v_rep.modele, 'cout_eur', v_rep.cout_eur, 'version', v_rep.version, 'reprise_de', v_reprise.refusee), d.entite_id);
  if v_reprise.refusee is not null and v_erreur is null then
    perform private.journaliser_module(d.client_id, 'reput', 'reput.reprise_proposee', 'reput_demandes', d.id::text,
      jsonb_build_object('refusee', v_reprise.refusee, 'reprise', v_dv, 'reponse', v_rep.id, 'version', v_rep.version,
                         'corrections', jsonb_array_length(v_corr)), d.entite_id);
  end if;

  -- Ce qui doit remonter à une personne : la fiche d'escalade est la demande elle-même.
  if v_urgence or v_sujet in ('reclamation', 'humain') or not v_couverte or d.statut in ('a_traiter', 'bloquee') or coalesce(d.litige, false) then
    perform private.lever_alerte_module(d.client_id, 'reput', case when v_urgence then 'critique' else 'attention' end,
      left(case when v_urgence then 'Urgence reçue : ' when v_sujet = 'reclamation' then 'Réclamation reçue : '
                when v_sujet = 'humain' then 'Un client demande à parler à quelqu''un : '
                when d.statut = 'bloquee' then 'Réponse bloquée : '
                when d.statut = 'a_traiter' and d.canal = 'appel' and d.canal_reponse is null then 'Appel à rappeler : '
                when d.statut = 'a_traiter' then 'Demande à traiter vous-même : '
                when coalesce(d.litige, false) then 'Client en litige, réponse à relire : '
                -- c3_42 : même règle que le résumé de la file (c3_40) — des fiches citées sans tout couvrir ne sont pas « hors base ».
                when cardinality(v_sources) > 0 then 'En partie dans la base, à relire : '
                else 'Hors de la base : ' end
           || coalesce(nullif(btrim(d.de_nom), ''), 'un client') || ' (' || coalesce(v_libelle, v_sujet) || ')', 150),
      jsonb_build_object('demande', d.id, 'reponse', v_rep.id, 'sujet', v_sujet, 'statut', d.statut, 'verrou', v_e.verrou),
      'demande:' || d.id::text, true, null);
  end if;

  return jsonb_build_object('statut', d.statut, 'demande', d.id, 'reponse', v_rep.id, 'sujet', v_sujet, 'langue', v_langue,
                            'couverte', v_couverte, 'type_action', v_type, 'demande_validation', v_dv,
                            'demande_validation_statut', v_dv_statut, 'politique', v_politique,
                            'envoi', v_envoi, 'envoi_statut', v_e.statut, 'verrou', v_e.verrou, 'erreur', v_erreur,
                            'version', v_rep.version, 'reprise_de', v_reprise.refusee);
end $function$;
