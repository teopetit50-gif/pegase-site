-- c3_42a — SOCLE : l'accusé de réception REPUT part aussi hors des heures d'envoi (écrit par C3, 23/10/2026 ; arbitrage de
-- Teo, 22/10 21 h 49 Z : « l'accusé de réception part dans la minute même la nuit, honnête sur les horaires ; la vraie
-- réponse attend l'ouverture » ; autorisé par Teo dans la session C3, relance du 23/10 00 h 05 Z)
--
-- Prolonge c3_41a, au même endroit et de la même façon, sans rien élargir d'autre :
--   1. public.envois.accuse (booléen, faux par défaut) ;
--   2. déclencheur envois_accuse_marquer (avant insertion) : un envoi du module reput, transactionnel, dont la clé est
--      « reput:accuse:… », créé sous le drapeau de transaction « omega.envoi_accuse » = on (posé par private.reput_accuser
--      autour de la seule préparation de l'accusé), porte accuse = vrai ;
--   3. private.envoi_hors_heures_permis(p_e) = envoi interne urgent (c3_41a) OU accusé ainsi marqué ;
--   4. private.verrous_envoi : la condition du verrou HORS_HEURES posée par c3_41a passe de
--      « not private.envoi_interne_urgent(p_e) » à « not private.envoi_hors_heures_permis(p_e) » — modifiée EN PLACE sur
--      la définition en base, ancre unique, sinon arrêt sans rien changer ; rejouable.
-- TOUS les autres verrous restent (mode essai ou réel, oppositions, consentement, santé, doublon, verrou du module,
-- calendrier, espacement, plafonds). La réponse de fond (clé « reput:envoi:… ») n'est jamais concernée : elle attend
-- l'ouverture. Aucune plage n'est changée.
--
-- Règles de pose : APRÈS c3_41a. alter … if not exists, create or replace ; ni DROP ni DELETE.

alter table public.envois add column if not exists accuse boolean not null default false;

create or replace function private.marquer_envoi_accuse()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  if coalesce(current_setting('omega.envoi_accuse', true), '') = 'on'
     and new.module = 'reput' and coalesce(new.transactionnel, false) and new.cle_idempotence like 'reput:accuse:%' then
    new.accuse := true;
  end if;
  return new;
end $function$;
revoke execute on function private.marquer_envoi_accuse() from public, anon, authenticated;

create or replace trigger envois_accuse_marquer before insert on public.envois
  for each row execute function private.marquer_envoi_accuse();

create or replace function private.envoi_hors_heures_permis(p_e public.envois)
 returns boolean
 language sql
 stable
 set search_path to ''
as $function$
  select private.envoi_interne_urgent(p_e)
      or (coalesce(p_e.accuse, false) and p_e.module = 'reput' and coalesce(p_e.transactionnel, false)
          and p_e.cle_idempotence like 'reput:accuse:%')
$function$;
revoke execute on function private.envoi_hors_heures_permis(public.envois) from public, anon, authenticated;
grant execute on function private.envoi_hors_heures_permis(public.envois) to service_role;

do $do$
declare
  v_def text;
  v_ancre text := 'and not private.envoi_interne_urgent(p_e) then';
  v_n integer;
begin
  v_def := pg_get_functiondef('private.verrous_envoi(public.envois, boolean, timestamp with time zone)'::regprocedure);
  if position('private.envoi_hors_heures_permis(p_e)' in v_def) > 0 then
    raise notice 'c3_42a : verrous_envoi déjà modifié — rien à faire.';
    return;
  end if;
  v_n := (char_length(v_def) - char_length(replace(v_def, v_ancre, ''))) / char_length(v_ancre);
  if v_n <> 1 then
    raise exception 'c3_42a : l''ancre de c3_41a figure % fois dans verrous_envoi (1 attendue ; c3_41a est-il posé ?) — rien n''est changé.', v_n;
  end if;
  execute replace(v_def, v_ancre, 'and not private.envoi_hors_heures_permis(p_e) then');
end $do$;
