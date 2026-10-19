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
