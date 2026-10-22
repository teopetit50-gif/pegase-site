-- c3_41a — SOCLE : un envoi INTERNE urgent part hors des heures d'envoi (écrit par C3, 22/10/2026, lot socle confié par le
-- coordinateur, périmètre strict ; à relire avant la pose comme c3_23a)
--
-- TREPUT-16 (complément) : le récapitulatif « Réponses clients à valider » était différé HORS_HEURES même quand une
-- urgence attendait. Désormais, et seulement pour un envoi INTERNE (direct, destinataire = un membre de l'organisation,
-- transactionnel) marqué URGENT, le contrôle HORS_HEURES de private.verrous_envoi est sauté. TOUS les autres verrous
-- restent (mode coupé, oppositions, consentement, santé, doublon, verrou du module, calendrier, espacement, plafonds…).
-- Aucun envoi vers un tiers n'est concerné ; aucune plage n'est changée.
--   1. public.envois.urgent (booléen, faux par défaut) ;
--   2. private.envoi_interne_urgent(p_e) : direct ET destinataire_membre ET transactionnel ET (urgent, ou le drapeau de
--      transaction « omega.envoi_interne_urgent » = on, posé par l'appelant juste autour de private.envoyer_interne) ;
--   3. déclencheur envois_urgent_marquer (avant insertion) : un envoi interne créé sous ce drapeau porte urgent = vrai
--      (le réexamen des verrous au départ le retrouve) ;
--   4. private.verrous_envoi : la SEULE condition du verrou HORS_HEURES reçoit « and not private.envoi_interne_urgent(p_e) ».
--      La définition EN BASE est lue (pg_get_functiondef) et modifiée à cet endroit seulement : aucune copie de l'extrait
--      du 5/10. Si l'ancre n'y figure pas exactement une fois, la pose s'arrête (rien n'est changé). Rejouable.
-- AVANT DE POSER : vérifier que private.envoyer_interne crée bien ses envois avec direct = vrai et destinataire_membre,
-- et que private.garder_envoi ne refuse pas la colonne urgent.
--
-- Règles de pose : alter … if not exists, create or replace ; ni DROP ni DELETE.

alter table public.envois add column if not exists urgent boolean not null default false;

create or replace function private.envoi_interne_urgent(p_e public.envois)
 returns boolean
 language sql
 stable
 set search_path to ''
as $function$
  select coalesce(p_e.direct, false) and p_e.destinataire_membre is not null and coalesce(p_e.transactionnel, false)
         and (coalesce(p_e.urgent, false) or coalesce(current_setting('omega.envoi_interne_urgent', true), '') = 'on')
$function$;
revoke execute on function private.envoi_interne_urgent(public.envois) from public, anon, authenticated;
grant execute on function private.envoi_interne_urgent(public.envois) to service_role;

create or replace function private.marquer_envoi_urgent()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  if coalesce(current_setting('omega.envoi_interne_urgent', true), '') = 'on'
     and coalesce(new.direct, false) and new.destinataire_membre is not null and coalesce(new.transactionnel, false) then
    new.urgent := true;
  end if;
  return new;
end $function$;
revoke execute on function private.marquer_envoi_urgent() from public, anon, authenticated;

create or replace trigger envois_urgent_marquer before insert on public.envois
  for each row execute function private.marquer_envoi_urgent();

do $do$
declare
  v_def text;
  v_ancre text := 'if v_t2 is null or v_t2 > p_instant then';
  v_n integer;
begin
  if to_regprocedure('private.verrous_envoi(public.envois, boolean, timestamp with time zone)') is null then
    raise exception 'c3_41a : private.verrous_envoi introuvable — rien n''est changé.';
  end if;
  v_def := pg_get_functiondef('private.verrous_envoi(public.envois, boolean, timestamp with time zone)'::regprocedure);
  if position('private.envoi_interne_urgent(p_e)' in v_def) > 0 then
    raise notice 'c3_41a : verrous_envoi déjà modifié — rien à faire.';
    return;
  end if;
  v_n := (char_length(v_def) - char_length(replace(v_def, v_ancre, ''))) / char_length(v_ancre);
  if v_n <> 1 then
    raise exception 'c3_41a : l''ancre du verrou HORS_HEURES figure % fois dans verrous_envoi (1 attendue) — rien n''est changé.', v_n;
  end if;
  execute replace(v_def, v_ancre,
    'if (v_t2 is null or v_t2 > p_instant) and not private.envoi_interne_urgent(p_e) then   -- c3_41a : interne urgent');
end $do$;
