-- b6_09 — DALIRO : qui active l'accord permanent des confirmations J-2 (session B6, 06/10/2026)
--
-- CONSTAT (b6_08, recette) : le gérant qui donne l'accord ne peut pas l'activer lui-même — le socle répond
-- « 42501 Le demandeur ne décide pas de sa propre demande. » — et, sans règle, l'activation d'une politique
-- n'est ouverte qu'aux gérants. Une organisation à un seul gérant restait bloquée.
--
-- DÉCISION DE TEO (06/10, ~14 h Z), sans toucher au socle :
--   1. S'il existe une AUTRE personne qui peut décider (gérant, admin ou valideur), la règle des deux personnes
--      s'applique : une regles_validation « politique.activer », module daliro, ouvre l'activation aux rôles
--      gérant, admin et valideur. Le demandeur reste exclu (socle). btp_donner_accord_j2 la pose avant de
--      proposer les politiques (preparer_demande la lit à la naissance de la demande d'activation).
--   2. Si le gérant est le SEUL décideur de l'organisation, public.btp_activer_accord_j2_seul(p_client) l'autorise à
--      activer lui-même, et seulement les politiques J-2 proposées par btp_donner_accord_j2. La porte revérifie,
--      sous verrou et au moment même, qu'il n'y a pas d'autre décideur ; elle passe la demande d'activation
--      à « approuvee » (le déclencheur du socle suivre_activation active la politique et clôt la demande) ;
--      la décision est tracée : journal daliro.accord_j2_active_seul « activé par le seul décideur de
--      l'organisation, <email>, <date> », et le payload de la demande le dit quand le socle l'accepte.
--   3. Dès qu'un second décideur existe, la porte « seul » refuse (42501) : l'activation se fait dans « À valider ».
--   4. btp_accord_j2 dit à l'écran si le lecteur est le seul décideur.
--
-- Règles de pose : create or replace ; rien n'est retiré ni effacé.

-- Les autres décideurs de l'organisation (gérant, admin, valideur), le lecteur exclu.
create or replace function private.btp_autres_decideurs(p_client uuid, p_user uuid)
 returns integer
 language sql
 stable security definer
 set search_path to ''
as $function$
  select count(*)::int from public.comptes c
  where c.client_id = p_client and c.role in ('gerant', 'admin', 'valideur') and c.user_id is distinct from p_user
$function$;

create or replace function public.btp_accord_j2(p_client uuid)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
begin
  if not private.btp_est_serveur()
     and (v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin'])) then
    raise exception 'L''accord permanent des confirmations J-2 se lit par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  return private.btp_accord_j2_etat(p_client)
    || jsonb_build_object('seul_decideur', v_uid is not null and private.btp_autres_decideurs(p_client, v_uid) = 0);
end $function$;

-- Le seul décideur active lui-même l'accord J-2 qu'il a proposé.
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
  v_erreur text;
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
    -- La voie du socle : la demande passe « approuvee », suivre_activation active la politique et clôt la demande.
    begin
      update public.demandes_validation
      set statut = 'approuvee', decide_le = now(),
          payload = payload || jsonb_build_object('activation', jsonb_build_object('mode', 'seul_decideur', 'par', v_uid, 'trace', v_trace))
      where id = r.demande_id and statut = 'en_attente';
    exception when others then
      -- le socle peut garder le payload : la décision seule, la trace va au journal
      v_erreur := sqlstate || ' ' || sqlerrm;
      update public.demandes_validation set statut = 'approuvee', decide_le = now()
      where id = r.demande_id and statut = 'en_attente';
    end;
    if (select p.statut from public.politiques p where p.id = r.politique) <> 'active' then
      raise exception 'L''activation n''a pas pris pour la politique % (le socle n''a pas suivi la demande).', r.politique using errcode = 'P0001';
    end if;
    v_n := v_n + 1;
  end loop;

  if v_n > 0 then
    perform private.journaliser(p_client, 'daliro.accord_j2_active_seul', 'btp_reglages', coalesce(v_reglage::text, p_client::text),
      jsonb_build_object('politiques', v_n, 'par', v_uid, 'trace', v_trace, 'payload_garde', v_erreur), null);
  end if;
  return private.btp_accord_j2_etat(p_client) || jsonb_build_object('activees', v_n, 'trace', v_trace, 'seul_decideur', true);
end $function$;

-- La proposition (b6_08), plus la règle d'activation ouverte aux décideurs.
create or replace function public.btp_donner_accord_j2(p_client uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_type text;
  v_id uuid;
  v_crees jsonb := '[]'::jsonb;
  v_reglage uuid;
begin
  -- Une décision d'une personne : ni le serveur, ni un membre sans rôle de direction.
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'L''accord permanent des confirmations J-2 se donne par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  select r.id into v_reglage from public.btp_reglages r where r.client_id = p_client;
  if v_reglage is null then
    raise exception 'Daliro n''est pas installé pour cette organisation.' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('daliro.accord_j2:' || p_client::text, 0));
  -- b6_09 : l'activation est ouverte aux décideurs (gérant, admin, valideur) ; le demandeur en reste exclu (socle).
  -- La règle doit exister AVANT la politique : preparer_demande la lit à la naissance de la demande d'activation.
  insert into public.regles_validation (client_id, entite_id, module, type_action, approbations_requises, roles_autorises, actif)
  select p_client, null, 'daliro', 'politique.activer', 1, array['gerant', 'admin', 'valideur'], true
  where not exists (select 1 from public.regles_validation r
                    where r.client_id = p_client and r.module = 'daliro' and r.type_action = 'politique.activer'
                      and r.entite_id is null and r.actif);
  foreach v_type in array private.btp_accord_j2_types() loop
    -- déjà proposée, ou active pour plus de 30 jours : rien à faire
    continue when exists (select 1 from public.politiques p
                          where p.client_id = p_client and p.module = 'daliro' and p.type_action = v_type
                            and (p.statut = 'a_valider' or (p.statut = 'active' and p.fin > now() + interval '30 days')));
    insert into public.politiques (client_id, entite_id, module, type_action, libelle, nombre_mensuel, debut, fin)
    values (p_client, null, 'daliro', v_type,
            'Accord permanent des confirmations J-2 (' || case v_type when 'envoi.email' then 'courriel'
                                                                    when 'envoi.whatsapp' then 'WhatsApp' else 'SMS' end || ')',
            1000, now(), now() + interval '365 days')
    returning id into v_id;
    v_crees := v_crees || to_jsonb(v_id);
  end loop;
  if jsonb_array_length(v_crees) > 0 then
    perform private.journaliser(p_client, 'daliro.accord_j2_donne', 'btp_reglages', v_reglage::text,
      jsonb_build_object('politiques', v_crees, 'par', v_uid), null);
  end if;
  return private.btp_accord_j2_etat(p_client) || jsonb_build_object('proposees', v_crees,
    'seul_decideur', private.btp_autres_decideurs(p_client, v_uid) = 0);
end $function$;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt).
revoke execute on function private.btp_autres_decideurs(uuid, uuid) from public, anon, authenticated;
grant execute on function private.btp_autres_decideurs(uuid, uuid) to service_role;
revoke execute on function public.btp_accord_j2(uuid) from public, anon;
revoke execute on function public.btp_donner_accord_j2(uuid) from public, anon;
revoke execute on function public.btp_activer_accord_j2_seul(uuid) from public, anon;
grant execute on function public.btp_accord_j2(uuid) to authenticated, service_role;
grant execute on function public.btp_donner_accord_j2(uuid) to authenticated, service_role;
grant execute on function public.btp_activer_accord_j2_seul(uuid) to authenticated, service_role;
