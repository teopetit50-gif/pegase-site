-- c3_46 — REPUT : la nuit, une réponse de fond part si et seulement si son sujet est couvert par un accord permanent du
-- client (session C3, 26/10/2026 ; audit des promesses omega/CHIFFRAGE/reput.md, « 5 manques » n° 1 : « Une demande reçue
-- à 21 h obtient sa réponse à 21 h » ; décision transmise par « Omega moteurs et build », Teo absent : la phrase du site
-- fait foi, et le patron garde la main).
--
-- Depuis c3_42a, la nuit, seul l'accusé passe le verrou HORS_HEURES ; la réponse de fond attend l'ouverture, même sur un
-- sujet que le client a autorisé d'avance. Ce lot prolonge c3_42a, de la même façon et sans rien élargir d'autre :
--   1. public.envois.reponse_accord (booléen, faux par défaut) : la marque ;
--   2. private.reput_reponse_sous_accord(p_e) : un envoi REPUT de réponse (clé « reput:envoi:… », transactionnel, ni direct
--      ni interne) vers la personne même qui a écrit (adresse de réponse de la demande REPUT, jamais un tiers), dont la
--      demande de validation « reput.repondre.<sujet> » a été approuvée par un accord permanent (politique) TOUJOURS ACTIF
--      de ce client, ce module et ce type — relu à chaque vérification : un accord révoqué la nuit arrête tout ;
--   3. déclencheur envois_reponse_accord_marquer (avant insertion) : la marque est posée quand ces conditions tiennent ;
--   4. private.envoi_hors_heures_permis(p_e) = interne urgent (c3_41a) OU accusé marqué (c3_42a) OU réponse marquée ET
--      toujours sous accord (c3_46). verrous_envoi n'est pas modifié (il appelle déjà cette fonction depuis c3_42a).
-- TOUS les autres verrous restent (mode essai ou réel, oppositions, consentement, santé, doublon, verrou du module,
-- calendrier, espacement, plafonds). Sans accord permanent, rien ne change : l'accusé part, la réponse attend
-- l'ouverture et la validation. Aucun autre module n'est concerné. Aucune plage n'est changée.
--
-- Règles de pose : APRÈS c3_42a. alter … if not exists, create or replace ; ni DROP ni DELETE.

alter table public.envois add column if not exists reponse_accord boolean not null default false;

create or replace function private.reput_reponse_sous_accord(p_e public.envois)
 returns boolean
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select p_e.module = 'reput' and coalesce(p_e.transactionnel, false) and p_e.cle_idempotence like 'reput:envoi:%'
     and not coalesce(p_e.direct, false) and p_e.destinataire_membre is null
     and p_e.objet_type = 'reput_demandes' and p_e.demande_id is not null
     -- vers la personne qui a écrit, jamais un tiers ; ni urgence ni litige (jamais couverts, rappelé ici)
     and exists (select 1 from public.reput_demandes d
                 where d.id::text = p_e.objet_id and d.client_id = p_e.client_id and d.adresse_reponse is not null
                   and d.adresse_reponse = p_e.destinataire_adresse
                   and not coalesce(d.urgence, false) and not coalesce(d.litige, false))
     -- approuvée par un accord permanent toujours actif, de ce client, de ce module et de ce type
     and exists (select 1 from public.demandes_validation v join public.politiques po on po.id = v.politique_id
                 where v.id = p_e.demande_id and v.client_id = p_e.client_id and v.module = 'reput'
                   and v.objet_type = 'reput_demandes' and v.objet_id = p_e.objet_id and v.type_action like 'reput.repondre.%'
                   and v.statut in ('approuvee', 'executee')
                   and po.client_id = v.client_id and po.module = 'reput' and po.type_action = v.type_action
                   and po.statut = 'active' and po.revoquee_le is null
                   and (po.debut is null or po.debut <= now()) and (po.fin is null or po.fin > now()))
$function$;
revoke execute on function private.reput_reponse_sous_accord(public.envois) from public, anon, authenticated;
grant execute on function private.reput_reponse_sous_accord(public.envois) to service_role;

create or replace function private.marquer_envoi_reponse_accord()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  if new.module = 'reput' and new.cle_idempotence like 'reput:envoi:%' and private.reput_reponse_sous_accord(new) then
    new.reponse_accord := true;
  end if;
  return new;
end $function$;
revoke execute on function private.marquer_envoi_reponse_accord() from public, anon, authenticated;

create or replace trigger envois_reponse_accord_marquer before insert on public.envois
  for each row execute function private.marquer_envoi_reponse_accord();

-- Reprise de c3_42a : un troisième cas, la réponse marquée et toujours sous accord.
create or replace function private.envoi_hors_heures_permis(p_e public.envois)
 returns boolean
 language sql
 stable
 set search_path to ''
as $function$
  select private.envoi_interne_urgent(p_e)
      or (coalesce(p_e.accuse, false) and p_e.module = 'reput' and coalesce(p_e.transactionnel, false)
          and p_e.cle_idempotence like 'reput:accuse:%')
      or (coalesce(p_e.reponse_accord, false) and private.reput_reponse_sous_accord(p_e))
$function$;
revoke execute on function private.envoi_hors_heures_permis(public.envois) from public, anon, authenticated;
grant execute on function private.envoi_hors_heures_permis(public.envois) to service_role;
