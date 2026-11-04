-- 20261018213459 c4_17_bis_c3_13_envoi_auto
-- Source : dépôt : 946acf9a omega/modules/offload/migrations/c4_17_restitution.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c4_17_restitution.sql @ 946acf9a ; c4_17_bis_c3_13_envoi_auto : fichier trouvé par le lot c4_17.
-- ═══ omega/modules/offload/migrations/c4_17_restitution.sql @ 946acf9a
-- c4_17 — OFFLOAD : la restitution complète des données d'une organisation (session C4, 18/10/2026)
--
-- CE QUE ÇA POSE (chiffrage omega/CHIFFRAGE/offload.md, n° 58, « si vous arrêtez, tout vous est restitué puis effacé ») :
--   · private.offload_restitution(client) rend, en un document, tout ce qu'OFFLOAD tient pour l'organisation : réglages,
--     comptes, achats, signaux, reprises, tâches, contacts, exclusions, rapprochements, parc (équipements,
--     interventions, contrats, échéances), affaires, règles, arrêtés, et le journal opposable des actions « offload.* ».
--     Chaque table vient avec son nombre de lignes (résumé), sans l'identifiant de l'organisation.
--   · Réservée au gérant et à l'admin (42501 sinon) ; chaque restitution est au journal (« offload.restitution »).
--   · L'effacement qui suit la restitution n'est PAS ici : il relève du socle (les migrations de module n'ont pas le
--     droit au DELETE). La restitution, elle, ne modifie rien.
--   · public.offload_restitution(client) : porte SQL (invoker) ; l'écran la télécharge en JSON.
--
-- Règles de pose : create or replace. Aucun DROP, aucun DELETE.

create or replace function private.offload_restitution(p_client uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_tables constant text[] := array['offload_reglages', 'offload_comptes', 'offload_achats', 'offload_signaux', 'offload_reprises',
    'offload_taches', 'offload_contacts', 'offload_exclusions', 'offload_rapprochements', 'offload_equipements', 'offload_interventions',
    'offload_contrats', 'offload_echeances', 'offload_affaires', 'offload_regles', 'offload_arretes'];
  t text;
  v_lignes jsonb;
  v_donnees jsonb := '{}'::jsonb;
  v_resume jsonb := '{}'::jsonb;
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin'], 'restituer les données OFFLOAD');
  if not exists (select 1 from public.offload_reglages g where g.client_id = p_client) then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  foreach t in array v_tables loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x) - ''client_id''), ''[]''::jsonb) from public.%I x where x.client_id = $1', t)
      into v_lignes using p_client;
    v_donnees := v_donnees || jsonb_build_object(replace(t, 'offload_', ''), v_lignes);
    v_resume := v_resume || jsonb_build_object(replace(t, 'offload_', ''), jsonb_array_length(v_lignes));
  end loop;
  select coalesce(jsonb_agg(jsonb_build_object('le', j.survenu_le, 'action', j.action, 'objet_type', j.objet_type, 'objet_id', j.objet_id,
                                               'donnees', j.donnees) order by j.survenu_le), '[]'::jsonb)
    into v_lignes
  from public.journal_opposable j where j.client_id = p_client and j.action like 'offload.%';
  v_donnees := v_donnees || jsonb_build_object('journal', v_lignes);
  v_resume := v_resume || jsonb_build_object('journal', jsonb_array_length(v_lignes));
  perform private.journaliser_module(p_client, 'offload', 'offload.restitution', 'offload_reglages', p_client::text,
    jsonb_build_object('resume', v_resume), null);
  return jsonb_build_object('module', 'offload', 'organisation', p_client, 'restitue_le', now(), 'resume', v_resume, 'donnees', v_donnees);
end $function$;

create or replace function public.offload_restitution(p_client uuid)
 returns jsonb language sql set search_path to ''
as $function$ select private.offload_restitution(p_client) $function$;

-- Droits (à inscrire dans a5_01 : offload_restitution, appelée par la porte publique SECURITY INVOKER)
revoke all on function public.offload_restitution(uuid) from public, anon;
grant execute on function public.offload_restitution(uuid) to authenticated, service_role;
revoke execute on function private.offload_restitution(uuid) from public, anon;
grant execute on function private.offload_restitution(uuid) to authenticated, service_role;
