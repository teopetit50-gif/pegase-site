-- 20261022191855 c3_33_c3_35_gabarit_appel_reveil_accuses
-- Source : dépôt : 1296dc256f81b2e2898d35849a6bdcc4c6c84409 omega/modules/reput/migrations/c3_33_gabarit_appel.sql ; 1296dc256f81b2e2898d35849a6bdcc4c6c84409 omega/modules/reput/migrations/c3_34_reveil_ouvrier.sql ; 1296dc256f81b2e2898d35849a6bdcc4c6c84409 omega/modules/reput/migrations/c3_35_accuses_clos.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c3_33_gabarit_appel.sql @ 1296dc256f81b2e2898d35849a6bdcc4c6c84409, c3_34_reveil_ouvrier.sql @ 1296dc256f81b2e2898d35849a6bdcc4c6c84409, c3_35_accuses_clos.sql @ 1296dc256f81b2e2898d35849a6bdcc4c6c84409 ; URL de la recette réécrite en production (1 fois).
-- ═══ omega/modules/reput/migrations/c3_33_gabarit_appel.sql @ 1296dc256f81b2e2898d35849a6bdcc4c6c84409
-- c3_33 — REPUT : la réponse à un appel manqué a son gabarit ; la réponse par SMS est courte (session C3, 22/10/2026)
--
-- Relance de Teo (22/10, 19 h 06 Z), point 1. Quand le client a appelé sans que personne décroche, la réponse s'ouvre
-- sur une excuse — « Bonjour, excusez-nous de ne pas avoir décroché. » — avant la réponse elle-même ; et le SMS reste
-- court.
--   · reput_reglages.ouverture_appel : la phrase d'ouverture (200 caractères au plus), réglable par organisation (une ligne
--     de site la reprend si elle existe) ; public.reput_regler_ouverture_appel(p_client, p_texte) — gérant ou administrateur ;
--   · private.reput_gabarit(client, entité, canal reçu, canal de réponse, réglages, langue, résultat) remplace
--     private.reput_assembler dans le dépôt :
--       - canal reçu « appel », en français : l'ouverture d'appel tient lieu de formule d'appel ;
--       - réponse par SMS (ou WhatsApp) : forme courte — ouverture, corps, la PREMIÈRE ligne de la signature, la mention
--         d'automatisation s'il y en a une ; ni formule de politesse ni ligne vide ;
--       - sinon : l'assemblage de toujours (c3_02) ;
--   · public.reput_deposer_reponse (reprise de c3_26) : un SMS de plus de private.reput_limite_sms() caractères (480,
--     trois SMS) ne part jamais seul : il va à la relecture, raison dite.
-- L'ouvrier reçoit la même consigne (rediger.ts : deux phrases, 300 caractères, sans excuse ni salutation).
--
-- Règles de pose : alter … if not exists, create or replace ; ni DROP ni DELETE.

alter table public.reput_reglages add column if not exists ouverture_appel text not null
  default 'Bonjour, excusez-nous de ne pas avoir décroché.';
do $do$ begin
  if not exists (select 1 from pg_constraint where conname = 'reput_reglages_ouverture_appel_check') then
    alter table public.reput_reglages add constraint reput_reglages_ouverture_appel_check
      check (char_length(btrim(ouverture_appel)) between 1 and 200);
  end if;
end $do$;

create or replace function private.reput_limite_sms()
 returns integer
 language sql
 immutable
 set search_path to ''
as $function$ select 480 $function$;
revoke execute on function private.reput_limite_sms() from public, anon, authenticated;
grant execute on function private.reput_limite_sms() to service_role;

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
    v_appel := coalesce(v_ouverture, case when p_langue = 'fr' then nullif(btrim(p_reglages ->> 'formule_appel'), '')
                                          else nullif(left(btrim(p_resultat ->> 'appel'), 200), '') end);
    return concat_ws(E'\n', v_appel, regexp_replace(btrim(p_resultat ->> 'corps'), '\n\s*\n', E'\n', 'g'),
                     nullif(btrim(split_part(btrim(p_reglages ->> 'signature'), E'\n', 1)), ''), v_mention);
  end if;
  if v_ouverture is not null then
    return private.reput_assembler(jsonb_set(coalesce(p_reglages, '{}'::jsonb), '{formule_appel}', to_jsonb(v_ouverture)),
                                   p_langue, p_resultat);
  end if;
  return private.reput_assembler(p_reglages, p_langue, p_resultat);
end $function$;
revoke execute on function private.reput_gabarit(uuid, uuid, text, text, jsonb, text, jsonb) from public, anon, authenticated;
grant execute on function private.reput_gabarit(uuid, uuid, text, text, jsonb, text, jsonb) to service_role;

create or replace function public.reput_regler_ouverture_appel(p_client uuid, p_texte text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_texte text := btrim(regexp_replace(coalesce(p_texte, ''), '\s+', ' ', 'g'));
begin
  perform private.reput_dirige_planning(p_client, null);
  if char_length(v_texte) not between 1 and 200 then
    raise exception 'La phrase d''ouverture tient en 1 à 200 caractères.' using errcode = '22023';
  end if;
  perform private.reput_installer(p_client, null);
  update public.reput_reglages r set ouverture_appel = v_texte, maj_par = (select auth.uid()), maj_le = now()
  where r.client_id = p_client and r.entite_id is null;
  perform private.journaliser_module(p_client, 'reput', 'reput.ouverture_appel_reglee', 'clients', p_client::text,
    jsonb_build_object('par', (select auth.uid())), null);
  return jsonb_build_object('ouverture_appel', v_texte);
end $function$;
revoke execute on function public.reput_regler_ouverture_appel(uuid, text) from public, anon;
grant execute on function public.reput_regler_ouverture_appel(uuid, text) to authenticated, service_role;

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
      v_envoi := private.preparer_envoi(d.client_id, 'reput', 'reput_demandes', d.id::text, d.canal_reponse,
        jsonb_build_object('adresse', d.adresse_reponse, 'nom', d.de_nom, 'langue', v_langue, 'professionnel', false),
        null, '{}'::jsonb, v_objet, v_corps, null::uuid[], 'reput:envoi:' || v_rep.id::text, d.entite_id,
        true, false, null::timestamptz, jsonb_build_object('demande', v_dv));
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


-- ═══ omega/modules/reput/migrations/c3_34_reveil_ouvrier.sql @ 1296dc256f81b2e2898d35849a6bdcc4c6c84409
-- c3_34 — REPUT, écart TREPUT-05 (preuve niveau 2) : la réponse préparée sans attendre la minute suivante (session C3, 22/10/2026)
--
-- Constat : demande (a) préparée en 106 s, (b) en 59 s, pour « une réponse prête dans la minute ». La chaîne :
--   réception déposée → (synchrone) événement reception.nouvelle → travail reput.preparer (abonnement c3_01)
--   → ATTENTE du cron omega-reput (chaque minute : 0 à 60 s, ~30 s en moyenne)
--   → Edge reput-reponse : reput_commencer, rédaction par le modèle (Sonnet, outil : 10 à 40 s), dépôt.
-- De notre côté, seule l'attente du cron est compressible ; le reste est le travail lui-même. Désormais :
--   · private.reput_reveil(travail) : la requête qui réveille l'ouvrier pour CE travail (?nombre=1), ou null — si le
--     travail n'est pas un reput.preparer, si l'adresse de la fonction n'est pas réglée (private.reglages,
--     clé « reput_reponse_url »), ou si pg_net ou la clé de service manquent ;
--   · déclencheur reput_reveil sur public.travaux (après insertion) : envoie cette requête par pg_net (partie au COMMIT,
--     jamais avant) ; un échec ne bloque jamais la réception (avis au journal du serveur seulement) ;
--   · le cron omega-reput reste le filet : un réveil perdu est rattrapé dans la minute.
-- L'ouvrier écrit désormais ses durées (commencer, modèle, dépôt) dans le résultat du travail : l'attente se lit
-- fini_le − cree_le − leur somme (omega/recette-c3/mesure_treput05.sql).
--
-- À poser sur la recette, une fois : insert into private.reglages (cle, valeur) values ('reput_reponse_url',
--   'https://noepmkkplxshjbmqqxft.supabase.co/functions/v1/reput-reponse') on conflict (cle) do nothing;
--
-- Règles de pose : create or replace (fonctions, déclencheur) ; ni DROP ni DELETE.

create or replace function private.reput_reveil(p_travail public.travaux)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_url text;
begin
  if p_travail.genre is distinct from 'reput.preparer' or p_travail.etat is distinct from 'a_faire' then
    return null;
  end if;
  select nullif(btrim(r.valeur), '') into v_url from private.reglages r where r.cle = 'reput_reponse_url';
  if v_url is null or v_url !~ '^https://' then
    return null;
  end if;
  return jsonb_build_object('url', regexp_replace(v_url, '/+$', '') || '?nombre=1', 'travail', p_travail.id);
end $function$;
revoke execute on function private.reput_reveil(public.travaux) from public, anon, authenticated;
grant execute on function private.reput_reveil(public.travaux) to service_role;

create or replace function private.reput_reveiller()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_r jsonb := private.reput_reveil(new);
begin
  if v_r is null or to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then
    return null;
  end if;
  begin
    execute $q$select net.http_post(url := $1,
                 headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret),
                 body := '{}'::jsonb, timeout_milliseconds := 60000)
               from vault.decrypted_secrets s where s.name = 'cle_service'$q$
      using v_r ->> 'url';
  exception when others then
    raise notice 'reput_reveiller : %', sqlerrm;   -- le cron omega-reput rattrape
  end;
  return null;
end $function$;
revoke execute on function private.reput_reveiller() from public, anon, authenticated;

create or replace trigger reput_reveil after insert on public.travaux
  for each row when (new.genre = 'reput.preparer') execute function private.reput_reveiller();


-- ═══ omega/modules/reput/migrations/c3_35_accuses_clos.sql @ 1296dc256f81b2e2898d35849a6bdcc4c6c84409
-- c3_35 — REPUT, écart TREPUT-07 (preuve niveau 2) : un accusé de réception qui attend encore se clôt quand la demande
-- est répondue, refusée ou regroupée (session C3, 22/10/2026)
--
-- Constat : les accusés 3745fcb2 et 60eaee37 sont restés « à valider » après l'envoi de la réponse regroupée : valider
-- l'un d'eux aurait fait partir « nous avons bien reçu votre message » APRÈS la réponse.
--   · private.reput_clore_accuse(p_demande) : la validation de l'accusé (reput.accuser) encore en attente est annulée
--     par le serveur ; son envoi se clôt avec elle (socle) ; journal reput.accuse_clos ;
--   · déclencheur reput_clore_accuse sur public.reput_demandes : dès que la demande passe validée, envoyée, refusée ou
--     ignorée (regroupée) ;
--   · rattrapage des accusés déjà restés en attente (UPDATE par la même fonction).
-- Un accusé déjà validé ou parti ne change pas ; une demande « à traiter » ou « bloquée » garde le sien (elle attend).
--
-- Règles de pose : create or replace (fonctions, déclencheur) ; ni DROP ni DELETE.

create or replace function private.reput_clore_accuse(p_demande uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes;
  v_n integer;
begin
  select * into d from public.reput_demandes x where x.id = p_demande;
  if d.id is null or d.statut not in ('validee', 'envoyee', 'refusee', 'ignoree') then
    return 0;
  end if;
  update public.demandes_validation v set statut = 'annulee'
  where v.client_id = d.client_id and v.module = 'reput' and v.type_action = 'reput.accuser'
    and v.objet_type = 'reput_demandes' and v.objet_id = d.id::text and v.statut = 'en_attente';
  get diagnostics v_n = row_count;
  if v_n > 0 then
    perform private.journaliser_module(d.client_id, 'reput', 'reput.accuse_clos', 'reput_demandes', d.id::text,
      jsonb_build_object('statut', d.statut, 'regroupee_avec', d.regroupee_avec), d.entite_id);
  end if;
  return v_n;
end $function$;
revoke execute on function private.reput_clore_accuse(uuid) from public, anon, authenticated;
grant execute on function private.reput_clore_accuse(uuid) to service_role;

create or replace function private.reput_clore_accuse_declencheur()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.reput_clore_accuse(new.id);
  return null;
end $function$;
revoke execute on function private.reput_clore_accuse_declencheur() from public, anon, authenticated;

create or replace trigger reput_clore_accuse after update of statut on public.reput_demandes
  for each row when (new.statut is distinct from old.statut and new.statut in ('validee', 'envoyee', 'refusee', 'ignoree'))
  execute function private.reput_clore_accuse_declencheur();

-- Rattrapage : les accusés restés en attente derrière une demande déjà close.
select private.reput_clore_accuse(d.id)
from public.reput_demandes d
where d.statut in ('validee', 'envoyee', 'refusee', 'ignoree')
  and exists (select 1 from public.demandes_validation v
              where v.module = 'reput' and v.type_action = 'reput.accuser' and v.objet_type = 'reput_demandes'
                and v.objet_id = d.id::text and v.statut = 'en_attente');
