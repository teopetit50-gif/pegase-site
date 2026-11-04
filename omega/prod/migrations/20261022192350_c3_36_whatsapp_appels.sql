-- 20261022192350 c3_36_whatsapp_appels
-- Source : dépôt : 749b004a07716870f62c3a4c9b3645182a786cd8 omega/modules/reput/migrations/c3_36_whatsapp_appels.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c3_36_whatsapp_appels.sql @ 749b004a07716870f62c3a4c9b3645182a786cd8.
-- ═══ omega/modules/reput/migrations/c3_36_whatsapp_appels.sql @ 749b004a07716870f62c3a4c9b3645182a786cd8
-- c3_36 — REPUT : la réponse à un appel manqué par WhatsApp, quand l'organisation l'a choisi (session C3, 22/10/2026)
--
-- Relance de Teo (22/10, 19 h 06 Z), point 3. Un appel manqué d'un mobile se répond par SMS (c3_23) ; désormais par
-- WhatsApp si l'organisation l'a choisi ET que son modèle Meta est validé. Hors de la fenêtre de 24 h (le client n'a
-- jamais écrit sur WhatsApp), Meta n'accepte qu'un MODÈLE approuvé : la réponse part donc dans ce modèle, comme
-- variable {{message}}.
--   · reput_reglages : reponse_appels ('sms' | 'whatsapp', 'sms' par défaut), whatsapp_modele (le nom du modèle chez
--     Meta), whatsapp_corps (son texte, tel que soumis à Meta : {{message}} obligatoire, {{organisation}} permis) ;
--   · public.reput_regler_reponse_appels(p_client, p_canal, p_modele, p_corps) — gérant ou administrateur, périmètre
--     complet : règle le canal ; pour WhatsApp, dépose le gabarit du socle « reput.appel_whatsapp » de l'organisation
--     (canal whatsapp, modele_externe = le nom Meta) en BROUILLON. Compte Meta et approbation du modèle = Teo ; une
--     fois approuvé chez Meta, le serveur valide le gabarit (public.valider_gabarit) — rien ne part avant ;
--   · private.reput_gabarit_whatsapp(client) : ce gabarit, s'il est choisi ET validé ; sinon rien ;
--   · private.reput_canal_reponse (reprise de c3_23, désormais stable) : appel d'un mobile → « whatsapp » si ce
--     gabarit existe, sinon « sms » comme avant ;
--   · private.reput_preparer_envoi(demande, …) : l'envoi d'une réponse ou d'un accusé ; appel + WhatsApp → le gabarit,
--     variables {message (le texte sur une ligne : Meta refuse les retours à la ligne), organisation} ; sinon le texte
--     libre de toujours. Repris par reput_deposer_reponse (de c3_33), reput_redeposer (de c3_07) et reput_accuser
--     (de c3_18, qui prend aussi la forme courte par SMS ou WhatsApp, comme la réponse en c3_33) ;
--   · private.reput_gabarit (reprise de c3_33) : appel + WhatsApp → pas d'ouverture (le modèle Meta porte la sienne).
-- Testé en doublures (souche : gabarit et préparation d'envoi imités) ; aucun compte ouvert, rien n'est envoyé.
-- Le socle exige pour WhatsApp le consentement du destinataire (« consentement_toujours ») : sans lui, l'envoi est
-- bloqué et la demande le dit (« bloquee »), comme tout envoi refusé.
--
-- Règles de pose : alter … if not exists, insert … on conflict do nothing, create or replace ; ni DROP ni DELETE.

alter table public.reput_reglages add column if not exists reponse_appels text not null default 'sms';
alter table public.reput_reglages add column if not exists whatsapp_modele text;
alter table public.reput_reglages add column if not exists whatsapp_corps text;
do $do$ begin
  if not exists (select 1 from pg_constraint where conname = 'reput_reglages_reponse_appels_check') then
    alter table public.reput_reglages add constraint reput_reglages_reponse_appels_check check (reponse_appels in ('sms', 'whatsapp'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'reput_reglages_whatsapp_check') then
    alter table public.reput_reglages add constraint reput_reglages_whatsapp_check
      check ((whatsapp_modele is null or whatsapp_modele ~ '^[a-z0-9_]{1,200}$')
             and (whatsapp_corps is null or (char_length(whatsapp_corps) between 10 and 1024 and position('{{message}}' in whatsapp_corps) > 0)));
  end if;
end $do$;

-- Une ligne, sans retour ni tabulation ni suite d'espaces : la forme qu'accepte une variable de modèle Meta.
create or replace function private.reput_ligne(p_texte text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$ select nullif(btrim(regexp_replace(coalesce(p_texte, ''), '\s+', ' ', 'g')), '') $function$;
revoke execute on function private.reput_ligne(text) from public, anon, authenticated;
grant execute on function private.reput_ligne(text) to service_role;

create or replace function private.reput_gabarit_whatsapp(p_client uuid)
 returns public.gabarits_messages
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select g.* from public.reput_reglages r
  join public.gabarits_messages g on g.client_id = r.client_id and g.module = 'reput' and g.code = 'reput.appel_whatsapp'
   and g.canal = 'whatsapp' and g.langue = 'fr' and g.statut = 'valide' and g.modele_externe = r.whatsapp_modele
  where r.client_id = p_client and r.entite_id is null and r.reponse_appels = 'whatsapp'
  order by g.version desc limit 1
$function$;
revoke execute on function private.reput_gabarit_whatsapp(uuid) from public, anon, authenticated;
grant execute on function private.reput_gabarit_whatsapp(uuid) to service_role;

create or replace function private.reput_canal_reponse(r public.receptions)
 returns jsonb
 language plpgsql
 stable
 set search_path to ''
as $function$
declare
  v_de text := nullif(btrim(r.de_adresse), '');
  v_courriel text := coalesce(case when v_de ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(v_de) end,
                              case when btrim(r.detail ->> 'email') ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(btrim(r.detail ->> 'email')) end);
  v_mobile text;
begin
  if r.canal in ('email', 'formulaire') then
    return case when v_courriel is null then jsonb_build_object('canal', null, 'adresse', null)
                else jsonb_build_object('canal', 'email', 'adresse', v_courriel) end;
  elsif r.canal in ('whatsapp', 'sms') then
    return case when v_de is null then jsonb_build_object('canal', null, 'adresse', null)
                else jsonb_build_object('canal', r.canal, 'adresse', v_de) end;
  elsif r.canal = 'appel' then
    -- c3_23 : un appel se répond à un mobile ; un fixe ou un numéro masqué se rappelle (à traiter).
    -- c3_36 : par WhatsApp si l'organisation l'a choisi et que son modèle est validé ; sinon par SMS.
    v_mobile := private.reput_mobile_fr(v_de);
    return case when v_mobile is null then jsonb_build_object('canal', null, 'adresse', null)
                when (private.reput_gabarit_whatsapp(r.client_id)).id is not null then jsonb_build_object('canal', 'whatsapp', 'adresse', v_mobile)
                else jsonb_build_object('canal', 'sms', 'adresse', v_mobile) end;
  end if;
  return jsonb_build_object('canal', null, 'adresse', null);
end $function$;

create or replace function public.reput_regler_reponse_appels(p_client uuid, p_canal text, p_modele text default null, p_corps text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_modele text := nullif(lower(btrim(p_modele)), '');
  v_corps text := coalesce(nullif(btrim(p_corps), ''),
    'Bonjour, vous avez appelé {{organisation}} et nous n''avons pas pu décrocher : excusez-nous. {{message}}');
  g public.gabarits_messages;
  v_version integer;
begin
  perform private.reput_dirige_planning(p_client, null);
  if p_canal is null or p_canal not in ('sms', 'whatsapp') then
    raise exception 'Réponse aux appels manqués : sms ou whatsapp.' using errcode = '22023';
  end if;
  perform private.reput_installer(p_client, null);
  if p_canal = 'sms' then
    update public.reput_reglages r set reponse_appels = 'sms', maj_par = (select auth.uid()), maj_le = now()
    where r.client_id = p_client and r.entite_id is null;
  else
    if v_modele is null or v_modele !~ '^[a-z0-9_]{1,200}$' then
      raise exception 'Le nom du modèle WhatsApp, tel qu''enregistré chez Meta : minuscules, chiffres et _.' using errcode = '22023';
    end if;
    if char_length(v_corps) not between 10 and 1024 or position('{{message}}' in v_corps) = 0
       or regexp_replace(v_corps, '\{\{(message|organisation)\}\}', '', 'g') ~ '\{\{' then
      raise exception 'Le texte du modèle porte {{message}} (et au plus {{organisation}}), 1024 caractères au plus.' using errcode = '22023';
    end if;
    update public.reput_reglages r set reponse_appels = 'whatsapp', whatsapp_modele = v_modele, whatsapp_corps = v_corps,
           maj_par = (select auth.uid()), maj_le = now()
    where r.client_id = p_client and r.entite_id is null;
    -- Le gabarit du socle : le même (nom et texte) s'il existe déjà, sinon une version nouvelle, en brouillon.
    select * into g from public.gabarits_messages x
    where x.client_id = p_client and x.code = 'reput.appel_whatsapp' and x.langue = 'fr'
      and x.modele_externe = v_modele and x.corps = v_corps and x.statut <> 'retire'
    order by x.version desc limit 1;
    if g.id is null then
      select coalesce(max(x.version), 0) + 1 into v_version from public.gabarits_messages x
      where x.client_id = p_client and x.code = 'reput.appel_whatsapp' and x.langue = 'fr';
      insert into public.gabarits_messages (client_id, module, code, langue, version, canal, libelle, corps, variables,
                                            transactionnel, donnees_sante, espacement, modele_externe, statut)
      values (p_client, 'reput', 'reput.appel_whatsapp', 'fr', v_version, 'whatsapp', 'Réponse à un appel manqué (WhatsApp)',
              v_corps, '{"message": "texte", "organisation": "texte"}'::jsonb, true, false, false, v_modele, 'brouillon')
      on conflict do nothing
      returning * into g;
    end if;
  end if;
  perform private.journaliser_module(p_client, 'reput', 'reput.reponse_appels_reglee', 'clients', p_client::text,
    jsonb_build_object('canal', p_canal, 'modele', v_modele, 'gabarit', g.id, 'par', (select auth.uid())), null);
  return jsonb_build_object('reponse_appels', p_canal, 'modele', case when p_canal = 'whatsapp' then v_modele end,
                            'gabarit', g.id, 'gabarit_statut', g.statut,
                            'actif', p_canal = 'sms' or (private.reput_gabarit_whatsapp(p_client)).id is not null);
end $function$;
revoke execute on function public.reput_regler_reponse_appels(uuid, text, text, text) from public, anon;
grant execute on function public.reput_regler_reponse_appels(uuid, text, text, text) to authenticated, service_role;

-- L'envoi d'une réponse ou d'un accusé de REPUT : le gabarit WhatsApp pour un appel, sinon le texte libre.
create or replace function private.reput_preparer_envoi(d public.reput_demandes, p_langue text, p_objet text, p_corps text,
                                                        p_cle text, p_dv uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if d.canal = 'appel' and d.canal_reponse = 'whatsapp' then
    return private.preparer_envoi(d.client_id, 'reput', 'reput_demandes', d.id::text, 'whatsapp',
      jsonb_build_object('adresse', d.adresse_reponse, 'nom', d.de_nom, 'langue', 'fr', 'professionnel', false),
      'reput.appel_whatsapp',
      jsonb_build_object('message', coalesce(private.reput_ligne(p_corps), '-'),
                         'organisation', coalesce((select c.nom from public.clients c where c.id = d.client_id), '')),
      null, null, null::uuid[], p_cle, d.entite_id, true, false, null::timestamptz, jsonb_build_object('demande', p_dv));
  end if;
  return private.preparer_envoi(d.client_id, 'reput', 'reput_demandes', d.id::text, d.canal_reponse,
    jsonb_build_object('adresse', d.adresse_reponse, 'nom', d.de_nom, 'langue', p_langue, 'professionnel', false),
    null, '{}'::jsonb, p_objet, p_corps, null::uuid[], p_cle, d.entite_id,
    true, false, null::timestamptz, jsonb_build_object('demande', p_dv));
end $function$;
revoke execute on function private.reput_preparer_envoi(public.reput_demandes, text, text, text, text, uuid) from public, anon, authenticated;
grant execute on function private.reput_preparer_envoi(public.reput_demandes, text, text, text, text, uuid) to service_role;

-- La forme du texte (reprise de c3_33) : appel + WhatsApp, sans ouverture.
create or replace function private.reput_gabarit(p_client uuid, p_entite uuid, p_canal text, p_canal_reponse text,
                                                 p_reglages jsonb, p_langue text, p_resultat jsonb)
 returns text
 language plpgsql
 stable
 set search_path to ''
as $function$
declare
  v_ouverture text;
  v_appel text;
  v_mention text := nullif(btrim(p_reglages ->> 'mention_automatisee'), '');
begin
  if p_canal = 'appel' and p_langue = 'fr' then
    select nullif(btrim(r.ouverture_appel), '') into v_ouverture
    from public.reput_reglages r
    where r.client_id = p_client and (r.entite_id is null or r.entite_id = p_entite)
    order by (r.entite_id is not null) desc limit 1;
    v_ouverture := coalesce(v_ouverture, 'Bonjour, excusez-nous de ne pas avoir décroché.');
  end if;
  if p_canal_reponse in ('sms', 'whatsapp') then
    -- c3_36 : appel + WhatsApp → le modèle Meta porte l'ouverture ; le texte n'en répète aucune.
    v_appel := case when p_canal = 'appel' and p_canal_reponse = 'whatsapp' then null else coalesce(v_ouverture, case when p_langue = 'fr' then nullif(btrim(p_reglages ->> 'formule_appel'), '')
                                          else nullif(left(btrim(p_resultat ->> 'appel'), 200), '') end) end;
    return concat_ws(E'\n', v_appel, regexp_replace(btrim(p_resultat ->> 'corps'), '\n\s*\n', E'\n', 'g'),
                     nullif(btrim(split_part(btrim(p_reglages ->> 'signature'), E'\n', 1)), ''), v_mention);
  end if;
  if v_ouverture is not null then
    return private.reput_assembler(jsonb_set(coalesce(p_reglages, '{}'::jsonb), '{formule_appel}', to_jsonb(v_ouverture)),
                                   p_langue, p_resultat);
  end if;
  return private.reput_assembler(p_reglages, p_langue, p_resultat);
end $function$;

-- Le dépôt de la réponse (reprise de c3_33) : l'envoi par private.reput_preparer_envoi.
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

  insert into public.reput_reponses (client_id, entite_id, demande_id, version, sujet, langue, couverte, objet, brouillon, corps,
    sources, raison, type_action, statut, modele, version_ouvrier, jetons_entree, jetons_sortie, cout_eur)
  values (d.client_id, d.entite_id, d.id, 1, v_sujet, v_langue, v_couverte, v_objet, left(btrim(private.reput_sans_civilite(private.reput_ramener_service(d.client_id, v_sujet, p_resultat ->> 'corps'), private.reput_civilite_recue(r))), 4000), v_corps,
    v_sources, v_raison, v_type, 'a_valider', left(p_resultat ->> 'modele', 80), left(p_version, 80),
    greatest(coalesce((p_resultat ->> 'tokens_entree')::integer, 0), 0), greatest(coalesce((p_resultat ->> 'tokens_sortie')::integer, 0), 0),
    greatest(coalesce((p_resultat ->> 'cout_eur')::numeric, 0), 0))
  returning * into v_rep;

  -- La file de validation du socle, et l'envoi adossé (même canal que la demande).
  begin
    insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload,
                                            echeance, cle_idempotence)
    values (d.client_id, d.entite_id, 'reput', private.reput_type_file(v_type, v_sujet), 'reput_demandes', d.id::text,
            left(format('Réponse à %s — %s%s', coalesce(nullif(btrim(d.de_nom), ''), coalesce(d.adresse_reponse, 'un client')),
                        coalesce(v_libelle, v_sujet), case when v_couverte then '' else ' (hors base : à compléter)' end), 500),
            jsonb_build_object('reponse', v_rep.id, 'demande', d.id, 'sujet', v_sujet, 'couverte', v_couverte,
                               'canal', d.canal_reponse, 'langue', v_langue, 'sources', to_jsonb(v_sources),
                               'objet', v_objet, 'corps', v_corps),
            now() + interval '7 days', 'reput:reponse:' || v_rep.id::text)
    returning id, statut, politique_id into v_dv, v_dv_statut, v_politique;
    if d.canal_reponse is not null then
      -- c3_36 : appel + WhatsApp → le modèle Meta validé ; sinon le texte libre.
      v_envoi := private.reput_preparer_envoi(d, v_langue, v_objet, v_corps, 'reput:envoi:' || v_rep.id::text, v_dv);
      select * into v_e from public.envois e where e.id = v_envoi;
    end if;
  exception when others then
    v_erreur := left(sqlstate || ' ' || sqlerrm, 500);
    v_dv := null; v_dv_statut := null; v_politique := null; v_envoi := null; v_e := null;
  end;

  v_statut_rep := case when v_erreur is not null or v_envoi is null then 'sans_envoi'
                       when v_e.statut in ('bloque', 'refuse', 'annule', 'expire', 'echec') then 'bloquee'
                       when v_e.statut = 'envoye' then 'envoyee'
                       when v_e.statut in ('pret', 'differe', 'en_cours') then 'approuvee'
                       else 'a_valider' end;
  v_statut_dem := case v_statut_rep when 'sans_envoi' then 'a_traiter' when 'bloquee' then 'bloquee'
                                    when 'envoyee' then 'envoyee' when 'approuvee' then 'validee' else 'a_valider' end;
  update public.reput_reponses x set demande_validation_id = v_dv, envoi_id = v_envoi, statut = v_statut_rep,
         raison = coalesce(x.raison, case when v_erreur is not null then 'Dépôt impossible : ' || v_erreur
                                          when d.canal_reponse is null then 'Aucune adresse de réponse : à traiter par une personne.' end),
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
                       'modele', v_rep.modele, 'cout_eur', v_rep.cout_eur), d.entite_id);

  -- Ce qui doit remonter à une personne : la fiche d'escalade est la demande elle-même.
  if v_urgence or v_sujet in ('reclamation', 'humain') or not v_couverte or d.statut in ('a_traiter', 'bloquee') or coalesce(d.litige, false) then
    perform private.lever_alerte_module(d.client_id, 'reput', case when v_urgence then 'critique' else 'attention' end,
      left(case when v_urgence then 'Urgence reçue : ' when v_sujet = 'reclamation' then 'Réclamation reçue : '
                when v_sujet = 'humain' then 'Un client demande à parler à quelqu''un : '
                when d.statut = 'bloquee' then 'Réponse bloquée : '
                when d.statut = 'a_traiter' then 'Demande à traiter vous-même : '
                when coalesce(d.litige, false) then 'Client en litige, réponse à relire : '
                else 'Hors de la base : ' end
           || coalesce(nullif(btrim(d.de_nom), ''), 'un client') || ' (' || coalesce(v_libelle, v_sujet) || ')', 150),
      jsonb_build_object('demande', d.id, 'reponse', v_rep.id, 'sujet', v_sujet, 'statut', d.statut, 'verrou', v_e.verrou),
      'demande:' || d.id::text, true, null);
  end if;

  return jsonb_build_object('statut', d.statut, 'demande', d.id, 'reponse', v_rep.id, 'sujet', v_sujet, 'langue', v_langue,
                            'couverte', v_couverte, 'type_action', v_type, 'demande_validation', v_dv,
                            'demande_validation_statut', v_dv_statut, 'politique', v_politique,
                            'envoi', v_envoi, 'envoi_statut', v_e.statut, 'verrou', v_e.verrou, 'erreur', v_erreur);
end $function$;

-- La réponse corrigée (reprise de c3_07) : l'envoi par private.reput_preparer_envoi.
create or replace function private.reput_redeposer(p_reponse uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  p public.reput_reponses;
  d public.reput_demandes;
  v_dv uuid;
  v_envoi uuid;
  v_e public.envois;
  v_erreur text;
  v_libelle text;
begin
  select * into p from public.reput_reponses x where x.id = p_reponse for update;
  if p.id is null or p.statut <> 'a_valider' or p.demande_validation_id is not null then
    return jsonb_build_object('ignore', 'réponse absente, déjà déposée ou plus à valider');
  end if;
  select * into d from public.reput_demandes x where x.id = p.demande_id;
  select s.libelle into v_libelle from public.reput_sujets s where s.client_id = p.client_id and s.code = p.sujet;
  begin
    insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload,
                                            echeance, cle_idempotence)
    values (p.client_id, p.entite_id, 'reput', private.reput_type_file(p.type_action, p.sujet), 'reput_demandes', d.id::text,
            left(format('Réponse corrigée à %s — %s', coalesce(nullif(btrim(d.de_nom), ''), coalesce(d.adresse_reponse, 'un client')),
                        coalesce(v_libelle, p.sujet)), 500),
            jsonb_build_object('reponse', p.id, 'demande', d.id, 'sujet', p.sujet, 'couverte', p.couverte, 'version', p.version,
                               'canal', d.canal_reponse, 'langue', p.langue, 'objet', p.objet, 'corps', p.corps,
                               'redigee_par', p.redigee_par),
            now() + interval '7 days', 'reput:reponse:' || p.id::text)
    returning id into v_dv;
    if d.canal_reponse is not null then
      v_envoi := private.reput_preparer_envoi(d, p.langue, p.objet, p.corps, 'reput:envoi:' || p.id::text, v_dv);   -- c3_36
      select * into v_e from public.envois e where e.id = v_envoi;
    end if;
  exception when others then
    v_erreur := left(sqlstate || ' ' || sqlerrm, 500);
    v_dv := null; v_envoi := null; v_e := null;
  end;
  update public.reput_reponses x set demande_validation_id = v_dv, envoi_id = v_envoi,
         statut = case when v_erreur is not null or v_envoi is null then 'sans_envoi'
                       when v_e.statut in ('bloque', 'refuse', 'annule', 'expire', 'echec') then 'bloquee' else 'a_valider' end,
         raison = case when v_erreur is not null then 'Dépôt impossible : ' || v_erreur else x.raison end, maj_le = now()
  where x.id = p.id returning * into p;
  update public.reput_demandes x set statut = case p.statut when 'sans_envoi' then 'a_traiter' when 'bloquee' then 'bloquee' else 'a_valider' end,
         motif = case when p.statut in ('sans_envoi', 'bloquee') then left(coalesce(p.raison, v_e.motif, v_e.verrou), 500) end, maj_le = now()
  where x.id = d.id;
  perform private.journaliser_module(p.client_id, 'reput', 'reput.reponse_redeposee', 'reput_demandes', d.id::text,
    jsonb_build_object('reponse', p.id, 'version', p.version, 'demande_validation', v_dv, 'envoi', v_envoi,
                       'envoi_statut', v_e.statut, 'erreur', v_erreur), p.entite_id);
  return jsonb_build_object('reponse', p.id, 'statut', p.statut, 'demande_validation', v_dv, 'envoi', v_envoi, 'erreur', v_erreur);
end $function$;

-- L'accusé de réception (reprise de c3_18) : forme courte par SMS ou WhatsApp ; l'envoi par private.reput_preparer_envoi.
create or replace function private.reput_accuser(p_demande uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes;
  g public.reput_reglages;
  v_corps text;
  v_objet text;
  v_dv uuid;
  v_envoi uuid;
  v_e public.envois;
  v_service text;
  v_phrase text;
begin
  select * into d from public.reput_demandes x where x.id = p_demande for update;
  if d.id is null or d.accuse_le is not null or d.statut not in ('a_valider', 'a_traiter') or d.canal_reponse is null then
    return jsonb_build_object('ignore', 'demande absente, déjà accusée, déjà répondue ou sans adresse');
  end if;
  select * into g from public.reput_reglages r
  where r.client_id = d.client_id and (r.entite_id = d.entite_id or r.entite_id is null)
  order by (r.entite_id is not null) desc limit 1;
  if g.id is null or not g.actif or not g.accuse then
    update public.reput_demandes x set accuse_le = now() where x.id = d.id;   -- rien à accuser : ne plus y revenir
    return jsonb_build_object('ignore', 'accusé désactivé dans les réglages');
  end if;
  if coalesce(d.langue, 'fr') <> 'fr' then
    update public.reput_demandes x set accuse_le = now() where x.id = d.id;
    return jsonb_build_object('ignore', 'accusé écrit en français, demande en ' || d.langue);
  end if;
  -- c3_18 : un sujet routé vers un service → l'accusé le dit, en le nommant (« le client en est informé »).
  select e.nom into v_service
  from public.reput_sujets s join public.equipes e on e.client_id = s.client_id and e.id = s.equipe_id
  where s.client_id = d.client_id and s.code = d.sujet;
  if v_service is not null and g.phrase_transfert is not null then
    v_phrase := replace(btrim(g.phrase_transfert), '{service}', btrim(v_service));
  end if;
  if d.canal_reponse in ('sms', 'whatsapp') then
    -- c3_36 : par SMS ou WhatsApp, la forme courte (c3_33) ; un appel manqué s'ouvre sur l'excuse, sauf par WhatsApp
    -- (le modèle Meta porte la sienne).
    v_corps := concat_ws(E'\n',
      case when d.canal = 'appel' and d.canal_reponse = 'whatsapp' then null
           when d.canal = 'appel' then coalesce(nullif(btrim(g.ouverture_appel), ''), nullif(btrim(g.formule_appel), ''))
           else nullif(btrim(g.formule_appel), '') end,
      concat_ws(' ', btrim(g.texte_accuse), v_phrase),
      nullif(btrim(split_part(btrim(g.signature), E'\n', 1)), ''), nullif(btrim(g.mention_automatisee), ''));
  else
    v_corps := concat_ws(E'\n\n', nullif(btrim(g.formule_appel), ''), concat_ws(' ', btrim(g.texte_accuse), v_phrase),
                         concat_ws(E'\n', nullif(btrim(g.formule_politesse), ''), nullif(btrim(g.signature), '')),
                         nullif(btrim(g.mention_automatisee), ''));
  end if;
  v_objet := case when d.canal_reponse = 'email' then left('Re : ' || coalesce(nullif(btrim(d.objet), ''), 'votre message'), 300) end;
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload,
                                          echeance, cle_idempotence)
  values (d.client_id, d.entite_id, 'reput', 'reput.accuser', 'reput_demandes', d.id::text,
          left('Accusé de réception à ' || coalesce(nullif(btrim(d.de_nom), ''), d.adresse_reponse), 500),
          jsonb_build_object('demande', d.id, 'canal', d.canal_reponse, 'objet', v_objet, 'corps', v_corps),
          now() + interval '2 days', 'reput:accuse:' || d.id::text)
  returning id into v_dv;
  v_envoi := private.reput_preparer_envoi(d, 'fr', v_objet, v_corps, 'reput:accuse:' || d.id::text, v_dv);   -- c3_36
  select * into v_e from public.envois e where e.id = v_envoi;
  update public.reput_demandes x set accuse_envoi = v_envoi, accuse_le = now(), maj_le = now() where x.id = d.id;
  perform private.journaliser_module(d.client_id, 'reput', 'reput.accuse_prepare', 'reput_demandes', d.id::text,
    jsonb_build_object('envoi', v_envoi, 'envoi_statut', v_e.statut, 'verrou', v_e.verrou, 'demande_validation', v_dv,
                       'service_nomme', v_phrase is not null), d.entite_id);
  return jsonb_build_object('demande', d.id, 'envoi', v_envoi, 'envoi_statut', v_e.statut, 'demande_validation', v_dv);
end $function$;
