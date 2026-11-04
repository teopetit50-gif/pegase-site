-- 20261019161845 c3_24_transcription
-- Source : dépôt : 4dff7244 omega/modules/reput/migrations/c3_24_transcription_commutable.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c3_24_transcription_commutable.sql @ 4dff7244.
-- ═══ omega/modules/reput/migrations/c3_24_transcription_commutable.sql @ 4dff7244
-- c3_24 — REPUT : la transcription des appels non décrochés, commutable (session C3, 19/10/2026)
--
-- Décision du bureau (par délégation de Teo, 19/10) : deux voies derrière une même interface, au choix de l'organisation :
--   · « twilio » — la reconnaissance vocale de Twilio pendant l'appel (Gather speech, fr-FR) ; aucun audio gardé ;
--     traitement hors UE (Twilio) ;
--   · « ue » — un enregistrement COURT (90 s au plus), transcrit chez un fournisseur établi dans l'UE (fournisseur non
--     encore choisi : doublure en test), puis l'enregistrement est effacé chez Twilio aussitôt la transcription faite.
-- Par défaut « twilio » (l'essai en cours) ; une organisation de santé se règle sur « ue ».
--   · reput_reglages.transcription_appels ('twilio' | 'ue') ;
--   · public.reput_regler_transcription(p_client, p_voie) — gérant ou administrateur, périmètre complet ;
--   · public.reput_voie_transcription(p_client) — serveur seulement (l'ouvrier reput-appels la lit à chaque appel).
-- Aucun compte n'est ouvert ici ; rien n'est appelé.
--
-- Règles de pose : alter … if not exists, create or replace ; ni DROP ni DELETE.

alter table public.reput_reglages add column if not exists transcription_appels text not null default 'twilio';
do $do$ begin
  if not exists (select 1 from pg_constraint where conname = 'reput_reglages_transcription_check') then
    alter table public.reput_reglages add constraint reput_reglages_transcription_check check (transcription_appels in ('twilio', 'ue'));
  end if;
end $do$;

create or replace function public.reput_regler_transcription(p_client uuid, p_voie text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.reput_dirige_planning(p_client, null);
  if p_voie is null or p_voie not in ('twilio', 'ue') then
    raise exception 'Voie de transcription : twilio ou ue.' using errcode = '22023';
  end if;
  perform private.reput_installer(p_client, null);
  update public.reput_reglages r set transcription_appels = p_voie where r.client_id = p_client and r.entite_id is null;
  perform private.journaliser_module(p_client, 'reput', 'reput.transcription_reglee', 'clients', p_client::text,
    jsonb_build_object('voie', p_voie, 'par', (select auth.uid())), null);
  return jsonb_build_object('transcription_appels', p_voie);
end $function$;

revoke execute on function public.reput_regler_transcription(uuid, text) from public, anon;
grant execute on function public.reput_regler_transcription(uuid, text) to authenticated, service_role;

create or replace function public.reput_voie_transcription(p_client uuid)
 returns text
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  if not private.reput_est_serveur() then
    raise exception 'Réservé au serveur d''Omega.' using errcode = '42501';
  end if;
  return coalesce((select r.transcription_appels from public.reput_reglages r where r.client_id = p_client and r.entite_id is null), 'twilio');
end $function$;

revoke execute on function public.reput_voie_transcription(uuid) from public, anon, authenticated;
grant execute on function public.reput_voie_transcription(uuid) to service_role;
