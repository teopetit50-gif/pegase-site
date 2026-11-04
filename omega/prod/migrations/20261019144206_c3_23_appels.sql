-- 20261019144206 c3_23_appels
-- Source : dépôt : ae8fa209 omega/modules/reput/migrations/c3_23a_socle_canal_appel.sql ; ae8fa209 omega/modules/reput/migrations/c3_23_appels_transcrits.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c3_23a_socle_canal_appel.sql @ ae8fa209, c3_23_appels_transcrits.sql @ ae8fa209.
-- ═══ omega/modules/reput/migrations/c3_23a_socle_canal_appel.sql @ ae8fa209
-- c3_23a — SOCLE : la réception accepte le canal « appel » (écrit par C3, 19/10/2026, A1 et A2 à l'arrêt ; relu par le
-- coordinateur avant la pose)
--
-- Pour le lot REPUT « appels non décrochés transcrits » : un message vocal laissé quand personne ne décroche, transcrit,
-- devient une réception (canal « appel », boîte = le numéro appelé, identifiant = l'identifiant de l'appel). Deux changements
-- et rien d'autre :
--   1. receptions_canal_check : la liste actuelle + 'appel' (drop constraint puis add ; aucune donnée touchée — exception
--      accordée par le coordinateur le 19/10 pour élargir un CHECK) ;
--   2. private.deposer_reception : la vérification de canal accepte 'appel' (le reste du corps est celui de
--      omega/SOCLE-EXTRAITS-COMMUN.sql, inchangé).
-- private.resoudre_boite sait déjà résoudre un canal « appel » (expediteurs.canal l'admet) : rien à changer.
-- AVANT DE POSER : comparer private.deposer_reception à sa définition en base (pg_get_functiondef) ; si elle a bougé depuis
-- l'extrait, reporter le seul changement de la vérification de canal sur la version en base.

alter table public.receptions drop constraint if exists receptions_canal_check;
alter table public.receptions add constraint receptions_canal_check
  check (canal = any (array['email'::text, 'whatsapp'::text, 'sms'::text, 'formulaire'::text, 'appel'::text]));

CREATE OR REPLACE FUNCTION private.deposer_reception(p_client uuid, p_canal text, p_boite text, p_identifiant text, p_de text DEFAULT NULL::text, p_de_nom text DEFAULT NULL::text, p_sujet text DEFAULT NULL::text, p_corps text DEFAULT NULL::text, p_corps_html text DEFAULT NULL::text, p_pieces jsonb DEFAULT '[]'::jsonb, p_detail jsonb DEFAULT '{}'::jsonb, p_recu_le timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id bigint; v_module text; v_entite uuid; v_reponse uuid; v_boite jsonb;
begin
  perform private.exiger_ouvrier();
  if p_client is null or p_canal is null or p_boite is null or p_identifiant is null then
    raise exception 'Réception incomplète : client, canal, boîte et identifiant externe sont obligatoires.' using errcode = '22023';
  end if;
  if p_canal not in ('email', 'whatsapp', 'sms', 'formulaire', 'appel') then
    raise exception 'Canal inconnu : email, whatsapp, sms, formulaire ou appel.' using errcode = '22023';
  end if;
  select id into v_id from public.receptions
   where client_id = p_client and canal = p_canal and identifiant_externe = p_identifiant;
  if v_id is not null then
    return jsonb_build_object('id', v_id, 'nouvelle', false);
  end if;
  v_boite := private.resoudre_boite(p_canal, p_boite);
  v_module := coalesce(p_detail ->> 'module', v_boite ->> 'module');
  v_entite := nullif(p_detail ->> 'entite_id', '')::uuid;
  -- Réponse à un envoi : par l'identifiant de message cité (detail.en_reponse_a = reference_externe) ou par l'uuid.
  if p_detail ? 'envoi_id' then
    v_reponse := nullif(p_detail ->> 'envoi_id', '')::uuid;
  elsif p_detail ? 'en_reponse_a' then
    select e.id into v_reponse from public.envois e
     where e.client_id = p_client and e.reference_externe = p_detail ->> 'en_reponse_a'
     order by e.cree_le desc limit 1;
  end if;
  insert into public.receptions (client_id, entite_id, module, canal, boite, identifiant_externe,
    de_adresse, de_empreinte, de_nom, sujet, corps, corps_html, pieces, detail, en_reponse_a, fil, langue, recu_le)
  values (p_client, v_entite, v_module, p_canal, p_boite, p_identifiant,
    p_de, case when p_de is null then null else encode(extensions.digest(lower(trim(p_de)), 'sha256'), 'hex') end,
    left(p_de_nom, 200), left(p_sujet, 1000), p_corps, p_corps_html,
    coalesce(p_pieces, '[]'::jsonb), coalesce(p_detail, '{}'::jsonb) - 'envoi_id' - 'en_reponse_a',
    v_reponse, p_detail ->> 'fil', p_detail ->> 'langue', coalesce(p_recu_le, now()))
  on conflict (client_id, canal, identifiant_externe) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.receptions
     where client_id = p_client and canal = p_canal and identifiant_externe = p_identifiant;
    return jsonb_build_object('id', v_id, 'nouvelle', false);
  end if;
  perform private.publier_evenement(p_client, 'reception.nouvelle',
    jsonb_build_object('reception', v_id, 'canal', p_canal, 'module', v_module, 'en_reponse_a', v_reponse),
    'reception:' || v_id);
  return jsonb_build_object('id', v_id, 'nouvelle', true);
end $function$;


-- ═══ omega/modules/reput/migrations/c3_23_appels_transcrits.sql @ ae8fa209
-- c3_23 — REPUT : les appels non décrochés, transcrits, entrent dans le circuit (session C3, 19/10/2026)
--
-- Lot ajouté par Teo le 19/10. Après c3_23a (le socle accepte une réception « appel ») : l'ouvrier reput-appels dépose le
-- message vocal transcrit (texte seul, aucun audio) comme une réception canal « appel », boîte = le numéro appelé, de = le
-- numéro qui appelle. REPUT la traite comme les autres canaux, avec deux règles propres :
--   · reput_demandes accepte le canal « appel » (drop constraint puis add : élargir un CHECK, exception accordée par le
--     coordinateur le 19/10 ; aucune donnée touchée) ;
--   · LA RÉPONSE : private.reput_canal_reponse (repris de c3_02) répond à un appel par SMS au numéro appelant s'il est un
--     mobile français (06, 07, +336, +337) ; sinon (fixe, numéro masqué, étranger) pas d'adresse écrite : la demande va « à
--     traiter » par une personne, qui rappelle. Le numéro d'un appel rejoint le dossier d'un WhatsApp ou d'un SMS du même
--     numéro (clés de contact de c3_07, inchangées).
-- Rien n'est appelé ni enregistré ici ; Twilio reste en doublures tant que le compte n'est pas ouvert.
--
-- Règles de pose : drop/add du seul CHECK (exception), create or replace ; aucune donnée touchée.

alter table public.reput_demandes drop constraint if exists reput_demandes_canal_check;
alter table public.reput_demandes add constraint reput_demandes_canal_check
  check (canal in ('email', 'whatsapp', 'sms', 'formulaire', 'appel'));

-- Un mobile français en +33 6/7… ; sinon nul.
create or replace function private.reput_mobile_fr(p_numero text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  with n as (select regexp_replace(coalesce(p_numero, ''), '[\s.()-]', '', 'g') as n)
  select case when n.n ~ '^0[67][0-9]{8}$' then '+33' || substr(n.n, 2)
              when n.n ~ '^\+33[67][0-9]{8}$' then n.n
              when n.n ~ '^0033[67][0-9]{8}$' then '+' || substr(n.n, 3)
         end
  from n
$function$;

revoke execute on function private.reput_mobile_fr(text) from public, anon, authenticated;

create or replace function private.reput_canal_reponse(r public.receptions)
 returns jsonb
 language plpgsql
 immutable
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
    -- c3_23 : un appel se répond par SMS à un mobile ; un fixe ou un numéro masqué se rappelle (à traiter).
    v_mobile := private.reput_mobile_fr(v_de);
    return case when v_mobile is null then jsonb_build_object('canal', null, 'adresse', null)
                else jsonb_build_object('canal', 'sms', 'adresse', v_mobile) end;
  end if;
  return jsonb_build_object('canal', null, 'adresse', null);
end $function$;
