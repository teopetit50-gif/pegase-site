-- 20261026192545 c4_40_un_message_par_trimestre
-- Source : dépôt : 80dc033557212a0b6f393f816dc65f20ccea3e1f omega/modules/offload/migrations/c4_40_un_message_par_trimestre.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c4_40_un_message_par_trimestre.sql @ 80dc033557212a0b6f393f816dc65f20ccea3e1f ; c4_40 cité comme test : ignoré ; c4_28 cité comme test : ignoré ; c4_29 cité comme test : ignoré.
-- ═══ omega/modules/offload/migrations/c4_40_un_message_par_trimestre.sql @ 80dc033557212a0b6f393f816dc65f20ccea3e1f
-- c4_40 — OFFLOAD : « Un message par trimestre au plus » redevient vrai par défaut (session C4, 27/10/2026 ; décision de
-- Teo relayée par le coordinateur : la phrase du site fait foi ; audit des promesses omega/CHIFFRAGE/offload.md,
-- « 5 manques » n° 4, lignes 17, 40, N5, N7).
--
-- Écarts corrigés :
--   · c4_29 (21/10) avait rallumé par défaut la relance écrite : un cycle comptait deux messages. Elle revient éteinte
--     par défaut, comme le 17/10 (c4_16), et elle est éteinte partout où personne ne l'a choisie (aucun offload_regler
--     portant « relance_ecrite » au journal). Un client ne la rallume qu'en la choisissant dans ses réglages.
--   · La quarantaine entre deux reprises pouvait se régler à 30 jours : comptée depuis la clôture du cycle, elle laissait
--     partir un second message dans le même trimestre. Elle va désormais de 90 à 730 jours (les valeurs plus basses sont
--     remontées à 90). Contrainte ajoutée, l'ancienne (30 à 730) est gardée : aucune suppression.
-- Vérifié sans changement : une reprise n'écrit qu'au rang 1 sans relance ; refusée puis reprise (c4_37), le message
-- refusé n'est jamais parti ; un message non parti passe par l'appel ; la reprise ouverte à la main suit les mêmes règles.
-- Reste hors de cette règle, par choix explicite d'une personne : la relance écrite choisie dans les réglages, et la
-- reprise forcée par le gérant avec un motif (c4_29, au journal). Les rappels de retrait (affaires) et d'échéance
-- (contrats) ne sont pas des messages de reprise.
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE.

alter table public.offload_reglages alter column relance_ecrite set default false;
update public.offload_reglages g set relance_ecrite = false, maj_le = now()
 where g.relance_ecrite
   and not exists (select 1 from public.journal_opposable j
                   where j.client_id = g.client_id and j.action = 'offload.reglages'
                     and coalesce(j.donnees -> 'demande', '{}'::jsonb) ? 'relance_ecrite');

update public.offload_reglages set quarantaine_jours = 90, maj_le = now() where quarantaine_jours < 90;
do $do$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.offload_reglages'::regclass
                   and conname = 'offload_reglages_quarantaine_trimestre_check') then
    alter table public.offload_reglages add constraint offload_reglages_quarantaine_trimestre_check check (quarantaine_jours >= 90);
  end if;
end $do$;

-- La phrase d'une borne : la quarantaine va de 90 à 730 jours (les deux contraintes disent la même chose).
create or replace function private.offload_phrase_reglage(p_contrainte text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case p_contrainte
    when 'offload_reglages_arrete_check' then 'Le jour d''arrêté du mois va de 1 à 28.'
    when 'offload_reglages_avant_cloture_check' then 'L''alerte avant la clôture se donne entre 1 et 28 jours.'
    when 'offload_reglages_cloture_check' then 'Le jour de clôture va de 1 à 31.'
    when 'offload_reglages_delai_check' then 'Le délai de silence va de 7 à 3 650 jours.'
    when 'offload_reglages_montant_check' then 'Le montant minimal est positif ou nul.'
    when 'offload_reglages_plafond_check' then 'Le plafond de reprises par jour va de 1 à 500.'
    when 'offload_reglages_quarantaine_check' then 'La quarantaine entre deux reprises va de 90 à 730 jours.'
    when 'offload_reglages_quarantaine_trimestre_check' then 'La quarantaine entre deux reprises va de 90 à 730 jours.'
    when 'offload_reglages_relance_check' then 'Le délai de relance va de 3 à 60 jours.'
    when 'offload_reglages_retrait_check' then 'Le délai de retrait va de 1 à 180 jours, la relance de retrait de 3 à 90 jours.'
    when 'offload_reglages_seuil_non_remis_check' then 'Le seuil de messages non remis va de 5 à 80 %.'
    when 'offload_reglages_signature_check' then 'La signature tient en 500 caractères.'
    when 'offload_reglages_sujets_auto_check' then 'Les sujets de l''envoi automatique sont reprise, echeance ou affaire.'
    when 'offload_reglages_vague_jour_check' then 'Le jour de la vague va de 1 (lundi) à 7 (dimanche).'
    when 'offload_reglages_mode_check' then 'Le mode est essai ou reel.'
    else 'Ce réglage sort des bornes permises.' end
$function$;
revoke execute on function private.offload_phrase_reglage(text) from public, anon, authenticated;
grant execute on function private.offload_phrase_reglage(text) to service_role;
