-- c4_42 — OFFLOAD : la sortie d'une organisation, restituée puis effacée (session C4, 27/10/2026 ; audit
-- omega/CHIFFRAGE/offload.md, ligne 58 : « si vous arrêtez, tout vous est restitué puis effacé »).
--
-- public.offload_sortie(p_client, p_motif), gérant ou administrateur, motif obligatoire, en un geste :
--   1. OFFLOAD s'arrête (suspension « sortie : … ») : plus aucune vague, plus aucun message ;
--   2. rien ne reste en suspens : les reprises ouvertes se closent (« abandon »), les messages qui attendaient une
--      validation ou un départ sont annulés, les demandes d'OFFLOAD en attente aussi ;
--   3. tout est restitué : l'export complet en JSON (c4_17, toutes les tables et le journal du module) et en fichiers
--      CSV neutralisés pour un tableur (c4_36, c4_38, c4_39), avec l'empreinte SHA-256 de l'export ;
--   4. la sortie est au journal (« offload.sortie »), avec cette empreinte ;
--   5. la réponse dit l'étape suivante : l'effacement par la porte du socle, public.effacer_donnees_client(organisation,
--      nom exact de l'organisation, signataire), qui efface les seize tables OFFLOAD (toutes déclarées au socle dans
--      private.tables_locataires) avec le reste de l'organisation, et le note dans public.effacements.
-- L'effacement n'est jamais déclenché par OFFLOAD seul : il demande la confirmation par le nom de l'organisation.
--
-- Règles de pose : create or replace, rejouable. Aucun DROP, aucun DELETE.

create or replace function private.offload_sortie(p_client uuid, p_motif text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_motif text := private.offload_texte(p_motif, 400);
  v_nom text;
  r record;
  n_reprises integer := 0;
  n_envois integer := 0;
  n_demandes integer := 0;
  v_restitution jsonb;
  v_tableur jsonb;
  v_empreinte text;
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin'], 'faire sortir l''organisation d''OFFLOAD');
  if v_motif is null then
    raise exception 'Une sortie dit pourquoi.' using errcode = '22023';
  end if;
  select c.nom into v_nom from public.clients c where c.id = p_client;
  if not exists (select 1 from public.offload_reglages g where g.client_id = p_client) then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;

  -- 1. L'arrêt.
  if not private.offload_suspendu(p_client) then
    perform private.offload_suspendre_interne(p_client, 'sortie : ' || v_motif, coalesce((select auth.uid())::text, 'serveur'));
  end if;

  -- 2. Rien en suspens.
  for r in select p.id from public.offload_reprises p
           where p.client_id = p_client and p.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee') loop
    perform private.offload_clore(r.id, 'abandon', 'Sortie d''OFFLOAD : ' || v_motif);
    n_reprises := n_reprises + 1;
  end loop;
  for r in select e.id from public.envois e
           where e.client_id = p_client and e.module = 'offload' and e.statut in ('a_valider', 'differe', 'pret') loop
    perform private.annuler_envoi(r.id, left('Sortie d''OFFLOAD : ' || v_motif, 300));
    n_envois := n_envois + 1;
  end loop;
  update public.demandes_validation d set statut = 'annulee'
   where d.client_id = p_client and d.module = 'offload' and d.statut = 'en_attente';
  get diagnostics n_demandes = row_count;

  -- 3. La restitution, en JSON et en tableur.
  v_restitution := private.offload_restitution(p_client);
  v_tableur := private.offload_restitution_tableur(p_client);
  v_empreinte := encode(extensions.digest(convert_to(v_restitution::text, 'UTF8'), 'sha256'), 'hex');

  -- 4. Le journal.
  perform private.journaliser_module(p_client, 'offload', 'offload.sortie', 'offload_reglages', p_client::text,
    jsonb_build_object('motif', v_motif, 'resume', v_restitution -> 'resume', 'empreinte_sha256', v_empreinte,
                       'reprises_closes', n_reprises, 'envois_annules', n_envois, 'demandes_annulees', n_demandes), null);

  -- 5. L'étape suivante.
  return jsonb_build_object(
    'organisation', p_client,
    'arrete', true,
    'reprises_closes', n_reprises, 'envois_annules', n_envois, 'demandes_annulees', n_demandes,
    'empreinte_sha256', v_empreinte,
    'restitution', v_restitution,
    'tableur', v_tableur,
    'effacement', jsonb_build_object(
      'porte', 'public.effacer_donnees_client',
      'confirmation', v_nom,
      'phrase', 'Une fois la restitution enregistrée, l''effacement se fait par la porte du socle, en saisissant le nom exact de '
                || 'l''organisation : toutes les données OFFLOAD sont effacées avec le reste, et l''effacement est noté.'));
end $function$;

create or replace function public.offload_sortie(p_client uuid, p_motif text)
 returns jsonb
 language sql
 set search_path to ''
as $function$ select private.offload_sortie(p_client, p_motif) $function$;

revoke execute on function private.offload_sortie(uuid, text) from public, anon;
grant execute on function private.offload_sortie(uuid, text) to authenticated, service_role;
revoke execute on function public.offload_sortie(uuid, text) from public, anon;
grant execute on function public.offload_sortie(uuid, text) to authenticated, service_role;
