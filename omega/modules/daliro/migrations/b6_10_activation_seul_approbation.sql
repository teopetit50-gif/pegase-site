-- b6_10 — DALIRO : le seul décideur active l'accord J-2 par une approbation (session B6, 06/10/2026)
--
-- À POSER APRÈS LE LOT 19af DU SOCLE (A5). Constat de b6_09 sur la recette : le socle refuse qu'une porte
-- passe une demande à « approuvee » sans approbation (garder_demande : « Approbations insuffisantes : une
-- demande n'est approuvée que par des personnes. »). Décision du coordinateur : le lot 19af ouvre, dans
-- preparer_approbation, une exception étroite — le demandeur approuve une demande « politique.activer » s'il
-- est le SEUL décideur actif de l'organisation et si (module, type_action) de la politique est dans
-- private.activation_seul_autorisee (daliro / envoi.email, envoi.whatsapp, envoi.sms) ; l'approbation est
-- marquée « seul décideur ».
--
-- CE QUI CHANGE : public.btp_activer_accord_j2_seul insère une approbation au nom du gérant (commentaire
-- « activé par le seul décideur de l'organisation, <email>, <date> ») au lieu de l'UPDATE du statut ; le
-- socle fait le reste. La revérification « seul » sous verrou et le journal daliro.accord_j2_active_seul restent.
--
-- Règles de pose : create or replace ; rien n'est retiré ni effacé.

create or replace function public.btp_activer_accord_j2_seul(p_client uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_email text;
  v_trace text;
  r record;
  v_n integer := 0;
  v_reglage uuid := (select g.id from public.btp_reglages g where g.client_id = p_client);
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant']) then
    raise exception 'Seul le gérant active lui-même l''accord des confirmations J-2.' using errcode = '42501';
  end if;
  -- Sous verrou, au moment même : personne d'autre ne peut décider dans l'organisation.
  perform pg_advisory_xact_lock(hashtextextended('daliro.accord_j2:' || p_client::text, 0));
  perform 1 from public.comptes c where c.client_id = p_client for share;
  if private.btp_autres_decideurs(p_client, v_uid) > 0 then
    raise exception 'Un autre décideur existe dans l''organisation : l''accord s''active par lui, dans « À valider ».' using errcode = '42501';
  end if;
  select u.email into v_email from auth.users u where u.id = v_uid;
  v_trace := format('activé par le seul décideur de l''organisation, %s, %s', coalesce(v_email, v_uid::text),
                    to_char(now() at time zone 'Europe/Paris', 'DD/MM/YYYY HH24:MI'));

  -- Seulement les politiques proposées par btp_donner_accord_j2 : daliro, envoi.*, son libellé, à valider.
  for r in
    select p.id as politique, p.demande_id
    from public.politiques p
    join public.demandes_validation d on d.id = p.demande_id
    where p.client_id = p_client and p.module = 'daliro' and p.type_action = any (private.btp_accord_j2_types())
      and p.libelle like 'Accord permanent des confirmations J-2 (%' and p.statut = 'a_valider'
      and d.type_action = 'politique.activer' and d.statut = 'en_attente'
  loop
    -- La voie du socle (lot 19af d'A5) : une APPROBATION au nom du gérant. preparer_approbation l'admet pour
    -- le demandeur seulement s'il est le seul décideur actif et si (daliro, envoi.*) est dans
    -- private.activation_seul_autorisee ; garder_demande compte l'approbation, suivre_activation active la politique.
    insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
    values (r.demande_id, p_client, v_uid, 'approuve', left(v_trace, 2000));
    if (select p.statut from public.politiques p where p.id = r.politique) <> 'active' then
      raise exception 'L''activation n''a pas pris pour la politique % (le socle n''a pas suivi la demande).', r.politique using errcode = 'P0001';
    end if;
    v_n := v_n + 1;
  end loop;

  if v_n > 0 then
    perform private.journaliser(p_client, 'daliro.accord_j2_active_seul', 'btp_reglages', coalesce(v_reglage::text, p_client::text),
      jsonb_build_object('politiques', v_n, 'par', v_uid, 'trace', v_trace), null);
  end if;
  return private.btp_accord_j2_etat(p_client) || jsonb_build_object('activees', v_n, 'trace', v_trace, 'seul_decideur', true);
end $function$;

revoke execute on function public.btp_activer_accord_j2_seul(uuid) from public, anon;
grant execute on function public.btp_activer_accord_j2_seul(uuid) to authenticated, service_role;
