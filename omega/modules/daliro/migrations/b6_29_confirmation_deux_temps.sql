-- b6_29 — DALIRO : la confirmation J-2 en deux temps, demandée le matin, relevée le soir (session B6, 11/10/2026)
--
-- LA PROMESSE (/secteurs/btp) : « Chaque sous-traitant reçoit une demande de confirmation deux jours avant son
-- passage. S'il ne répond pas, vous êtes prévenu le soir même et vous avez une journée pour le remplacer. »
-- Jusqu'ici (b6_02) : demande à J-2 à 17 h, alerte « sans réponse » la VEILLE du passage à 17 h — il restait une
-- soirée et un matin, pas une journée.
--
-- CE QUI EST POSÉ.
--   · private.btp_confirmations_phase(client, jour, phase) : le corps de btp_demander_confirmations en deux temps.
--       matin : les demandes des passages qui commencent dans deux jours ouvrés (même règle qu'avant) ;
--       soir  : les demandes restées sans réponse pour un passage qui commence dans deux jours ouvrés ou moins →
--               « sans réponse », alerte au conducteur avec les remplaçants. La journée de J-1 reste pour remplacer.
--   · private.btp_tache_confirmations_matin() + cron daliro-confirmations-matin à 6 h 07 UTC (8 h 07 Paris l'été,
--     7 h 07 l'hiver : dans la plage d'envoi 8 h–20 h du socle l'été ; l'hiver, l'envoi attend 8 h, le socle le garde).
--   · private.btp_tache_confirmations (cron daliro-confirmations-j2, 15 h UTC) ne fait plus que la phase « soir »,
--     le reste inchangé (fin d'accord J-2, alertes de réception).
--   · Le jour de Paris remplace current_date (UTC) dans les deux tâches.
--   · public.btp_demander_confirmations / private.btp_demander_confirmations (b6_02) restent tels quels : le bureau
--     peut toujours lancer les deux temps d'un coup à la main.
--   · Sans l'accord permanent des J-2 (b6_08), chaque demande passe par « À valider » : la fenêtre de réponse du
--     sous-traitant commence quand la demande est validée.
--
-- Règles de pose : create or replace ; cron.schedule si absent ; rien n'est retiré ni effacé.

create or replace function private.btp_confirmations_phase(p_client uuid, p_jour date, p_phase text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_jour date := coalesce(p_jour, current_date);
  v_canal text;
  v_demandees integer := 0;
  v_sans_reponse integer := 0;
  v_remplacants jsonb;
  v_chantiers uuid[] := '{}';
begin
  if not private.btp_est_serveur() then
    if (select auth.uid()) is null or not private.a_un_role(p_client, array['gerant', 'admin', 'valideur']) then
      raise exception 'Réservé au bureau du client ou au serveur d''Omega.' using errcode = '42501';
    end if;
  end if;

  if p_phase not in ('matin', 'soir') then
    raise exception 'Phase inconnue : matin (demandes) ou soir (sans réponse).' using errcode = '22023';
  end if;

  -- 1. Le matin de J-2 : les passages de sous-traitants qui commencent dans deux jours ouvrés, pas encore demandés.
  for r in
    select p.*, c.nom as chantier_nom, c.territoire, c.conducteur_id, t.nom as tiers_nom, t.telephone, t.email, t.canal as tiers_canal
    from public.btp_passages p
    join public.btp_chantiers c on c.client_id = p.client_id and c.id = p.chantier_id
    join public.btp_tiers t on t.client_id = p.client_id and t.id = p.tiers_id
    where p.client_id = p_client and p.statut = 'prevu' and p.confirmation = 'non_demandee'
      and c.statut = 'ouvert' and t.actif and t.confirmer_passages
      and (t.telephone is not null or t.email is not null)
      and p.debut > v_jour
      and p.debut <= coalesce(public.ajouter_jours(v_jour, 2, 'ouvres', c.territoire), v_jour + 2)
      and p_phase = 'matin'
    order by p.debut, p.id
  loop
    v_canal := coalesce(r.tiers_canal, case when r.telephone is not null then 'whatsapp' else 'email' end);
    update public.btp_passages set confirmation = 'demandee' where id = r.id;
    insert into public.btp_confirmations (client_id, passage_id, chantier_id, entite_id, tiers_id, evenement, canal, cle, detail, version_passage)
    values (r.client_id, r.id, r.chantier_id, r.entite_id, r.tiers_id, 'demandee', v_canal,
            'demande:' || r.id::text || ':v' || r.version || ':' || to_char(v_jour, 'YYYYMMDD'),
            jsonb_build_object('debut', r.debut, 'fin', r.fin, 'tache', r.tache), r.version)
    on conflict (client_id, cle) do nothing;
    perform private.publier_evenement(r.client_id, 'daliro.confirmation_demandee',
      jsonb_build_object('passage', r.id, 'chantier', r.chantier_id, 'chantier_nom', r.chantier_nom, 'tiers', r.tiers_id,
                         'tiers_nom', r.tiers_nom, 'canal', v_canal, 'telephone', r.telephone, 'email', r.email,
                         'debut', r.debut, 'fin', r.fin, 'tache', r.tache, 'version', r.version),
      'confirmation:' || r.id::text || ':v' || r.version);
    v_demandees := v_demandees + 1;
    if not (r.chantier_id = any (v_chantiers)) then v_chantiers := v_chantiers || r.chantier_id; end if;
  end loop;

  -- 2. Le soir de J-2 : demandé le matin (ou avant), toujours sans réponse → sans_reponse, alerte au conducteur avec
  --    les remplaçants. Il reste la journée de J-1 pour remplacer.
  for r in
    select p.*, c.nom as chantier_nom, c.conducteur_id, t.nom as tiers_nom
    from public.btp_passages p
    join public.btp_chantiers c on c.client_id = p.client_id and c.id = p.chantier_id
    left join public.btp_tiers t on t.client_id = p.client_id and t.id = p.tiers_id
    where p.client_id = p_client and p.statut = 'prevu' and p.confirmation = 'demandee'
      and p.debut <= coalesce(public.ajouter_jours(v_jour, 2, 'ouvres', c.territoire), v_jour + 2)
      and p_phase = 'soir'
    order by p.debut, p.id
  loop
    update public.btp_passages set confirmation = 'sans_reponse' where id = r.id;
    select coalesce(jsonb_agg(jsonb_build_object('tiers', x.tiers_id, 'nom', x.nom, 'canal', x.canal, 'vigilance', x.vigilance)), '[]'::jsonb)
      into v_remplacants
    from (select * from private.btp_proposer_remplacants(r.id) limit 5) x;
    insert into public.btp_confirmations (client_id, passage_id, chantier_id, entite_id, tiers_id, evenement, cle, detail, version_passage)
    values (r.client_id, r.id, r.chantier_id, r.entite_id, r.tiers_id, 'sans_reponse',
            'sans_reponse:' || r.id::text || ':v' || r.version || ':' || to_char(v_jour, 'YYYYMMDD'),
            jsonb_build_object('remplacants', v_remplacants), r.version)
    on conflict (client_id, cle) do nothing;
    perform private.lever_alerte_module(r.client_id, 'daliro_referentiel', 'attention',
      left(format('%s n''a pas confirmé son passage du %s sur %s', coalesce(r.tiers_nom, 'Un sous-traitant'),
                  to_char(r.debut, 'DD/MM'), r.chantier_nom), 150),
      jsonb_build_object('passage', r.id, 'chantier', r.chantier_id, 'tiers', r.tiers_id, 'debut', r.debut,
                         'remplacants', v_remplacants),
      'sans_reponse:' || r.id::text, true, r.conducteur_id);
    perform private.publier_evenement(r.client_id, 'daliro.passage_sans_reponse',
      jsonb_build_object('passage', r.id, 'chantier', r.chantier_id, 'tiers', r.tiers_id, 'debut', r.debut, 'remplacants', v_remplacants),
      'sans_reponse:' || r.id::text || ':v' || r.version);
    v_sans_reponse := v_sans_reponse + 1;
    if not (r.chantier_id = any (v_chantiers)) then v_chantiers := v_chantiers || r.chantier_id; end if;
  end loop;

  for r in select c.id, c.entite_id from public.btp_chantiers c where c.id = any (v_chantiers) loop
    perform private.journaliser(p_client, 'daliro.confirmations_relevees', 'btp_chantiers', r.id::text,
      jsonb_build_object('jour', v_jour, 'phase', p_phase, 'demandees', v_demandees, 'sans_reponse', v_sans_reponse), r.entite_id);
  end loop;
  return jsonb_build_object('jour', v_jour, 'phase', p_phase, 'demandees', v_demandees, 'sans_reponse', v_sans_reponse);
end $function$;

create or replace function private.btp_tache_confirmations_matin()
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_res jsonb := '[]'::jsonb;
begin
  for r in select client_id from public.btp_reglages loop
    begin
      v_res := v_res || jsonb_build_object('client', r.client_id, 'resultat',
                                           private.btp_confirmations_phase(r.client_id, (now() at time zone 'Europe/Paris')::date, 'matin'));
    exception when others then
      perform private.lever_alerte_module(r.client_id, 'daliro_referentiel', 'critique',
        'La demande des confirmations à J-2 a échoué', jsonb_build_object('erreur', sqlerrm, 'code', sqlstate),
        'confirmations_echec', false, null);
      v_res := v_res || jsonb_build_object('client', r.client_id, 'erreur', sqlerrm);
    end;
  end loop;
  return v_res;
end $function$;

create or replace function private.btp_tache_confirmations()
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_res jsonb := '[]'::jsonb;
begin
  for r in select client_id from public.btp_reglages loop
    begin
      -- b6_29 : le soir, seulement le relevé des sans-réponse (les demandes partent le matin, btp_tache_confirmations_matin).
      v_res := v_res || jsonb_build_object('client', r.client_id, 'resultat',
                                           private.btp_confirmations_phase(r.client_id, (now() at time zone 'Europe/Paris')::date, 'soir'));
      begin
        perform private.btp_alerter_fin_accord(r.client_id, now());
      exception when others then
        raise notice 'alerte de fin d''accord (%) : %', r.client_id, sqlerrm;
      end;
      begin
        perform private.btp_alerter_reception(r.client_id, current_date);
      exception when others then
        raise notice 'alertes de réception (%) : %', r.client_id, sqlerrm;
      end;
    exception when others then
      perform private.lever_alerte_module(r.client_id, 'daliro_referentiel', 'critique',
        'La demande des confirmations à J-2 a échoué', jsonb_build_object('erreur', sqlerrm, 'code', sqlstate),
        'confirmations_echec', false, null);
      v_res := v_res || jsonb_build_object('client', r.client_id, 'erreur', sqlerrm);
    end;
  end loop;
  return v_res;
end $function$;

-- Le cron du matin.
select cron.schedule('daliro-confirmations-matin', '7 6 * * *', $cron$select private.btp_tache_confirmations_matin()$cron$)
where not exists (select 1 from cron.job where jobname = 'daliro-confirmations-matin');

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt) : tout reste au serveur.
revoke execute on function private.btp_confirmations_phase(uuid, date, text) from public, anon, authenticated;
grant execute on function private.btp_confirmations_phase(uuid, date, text) to service_role;
revoke execute on function private.btp_tache_confirmations_matin() from public, anon, authenticated;
grant execute on function private.btp_tache_confirmations_matin() to service_role;
revoke execute on function private.btp_tache_confirmations() from public, anon, authenticated;
grant execute on function private.btp_tache_confirmations() to service_role;
