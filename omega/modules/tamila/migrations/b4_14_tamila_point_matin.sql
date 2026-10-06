-- b4_14 — Tamila : le point du matin (session B4, 06/10/2026, carnet du coordinateur, n° 3 ; AUDIT-PROMESSES § 2).
--
-- POURQUOI. Le socle assemble chaque matin un point à partir des sections que les modules déposent
-- (private.deposer_section ; TAVARO, LORANI, TIROMA, DALIRO le font). Tamila n'y déposait rien : un avocat devait
-- ouvrir l'espace pour apprendre qu'un délai tombe dans deux jours.
--
-- CE QUE ÇA POSE. Chaque matin dès 5 h (heure de Paris), cron tamila-matin toutes les 30 minutes (le dépôt ne
-- réécrit rien si rien n'a changé) :
--   · pour chaque avocat ou collaborateur du cabinet, « Tamila : vos délais et audiences », sur SES dossiers
--     (responsable ou membre, hors muraille) : délais à confirmer (avocats), échéances des sept jours et échéances
--     dépassées non tenues, audiences d'aujourd'hui et de demain, audiences passées sans temps saisi, avis reçus
--     par courriel à rattacher (qui peut lire la réception, b4_13) ;
--   · pour le gérant, « Tamila : le cabinet » : délais dépassés sans acte déposé, conflits d'intérêts sans
--     décision, dossiers sans convention d'honoraires après quinze jours, factures impayées à trente jours,
--     effacements des sept jours.
-- AUCUN NOM, aucune référence, aucun intitulé ne part : les lignes disent des comptes, des dates, des actes de
-- procédure et des natures d'audience, sans objet désigné (le socle n'accepte pour un objet chiffré qu'un gabarit),
-- avec un lien vers /espace/tamila, où le dossier se déchiffre. Une section vide est retirée.
--
-- Rien n'est retiré ni effacé : create or replace ; le cron s'inscrit s'il est absent. Le serveur seul.

create or replace function private.tamila_point_libelle_acte(p_acte text)
returns text
language sql
immutable
set search_path to ''
as $function$
  select case p_acte
    when 'signifier_declaration' then 'signifier la déclaration d''appel'
    when 'conclure' then 'remettre ses conclusions et les notifier'
    when 'signifier_conclusions' then 'signifier les conclusions aux parties non constituées'
    else 'accomplir l''acte fixé par le juge' end
$function$;

create or replace function private.tamila_point_libelle_audience(p_nature text)
returns text
language sql
immutable
set search_path to ''
as $function$
  select case p_nature
    when 'plaidoiries' then 'Audience de plaidoiries'
    when 'mise_en_etat' then 'Audience de mise en état'
    when 'orientation' then 'Audience d''orientation'
    when 'reglement_amiable' then 'Audience de règlement amiable'
    else 'Audience' end
$function$;

-- Les dossiers « à moi » : responsable ou membre (accès non échu), que je vois (muraille comprise), vivants.
create or replace function private.tamila_point_mes_dossiers(p_client uuid, p_user uuid)
returns table (dossier_id uuid)
language sql
stable
security definer
set search_path to ''
as $function$
  select d.id from public.tamila_dossiers d
   where d.client_id = p_client and d.statut in ('attente', 'ouvert', 'audit')
     and (d.responsable_id = p_user
          or exists (select 1 from public.tamila_dossiers_membres m
                      where m.dossier_id = d.id and m.user_id = p_user and (m.jusqu_au is null or m.jusqu_au > now())))
     and private.tamila_voit_dossier_pour(p_user, p_client, d.id::text)
$function$;

create or replace function private.tamila_point_lignes_personne(p_client uuid, p_user uuid, p_role text, p_jour date,
                                                                p_maintenant timestamptz default now())
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  r record;
  v_items jsonb := '[]'::jsonb;
  v_n integer;
  v_avocat boolean := p_role in ('gerant', 'admin', 'valideur');
  v_plus_ancien timestamptz;
  v_ecart integer;
  v_lien constant text := '/espace/tamila';
begin
  -- 1. Les délais à confirmer (un avocat confirme).
  if v_avocat then
    select count(*), min(t.cree_le) into v_n, v_plus_ancien from public.tamila_delais t
     where t.client_id = p_client and t.statut = 'a_confirmer'
       and t.dossier_id in (select x.dossier_id from private.tamila_point_mes_dossiers(p_client, p_user) x);
    if v_n > 0 then
      v_items := v_items || jsonb_build_object(
        'texte', format('%s délai%s de procédure à confirmer, le plus ancien posé le %s', v_n, case when v_n > 1 then 's' else '' end,
                        to_char(v_plus_ancien at time zone 'Europe/Paris', 'DD/MM/YYYY')),
        'gravite', case when v_plus_ancien < p_maintenant - interval '48 hours' then 'critique' else 'attention' end, 'lien', v_lien);
    end if;
  end if;

  -- 2. Les échéances : dépassées sans acte déposé, puis celles des sept jours.
  for r in
    select t.echeance_retenue, t.acte, t.statut from public.tamila_delais t
     where t.client_id = p_client and t.statut in ('a_confirmer', 'confirme') and t.acte_depose_le is null
       and t.echeance_retenue <= p_jour + 7
       and t.dossier_id in (select x.dossier_id from private.tamila_point_mes_dossiers(p_client, p_user) x)
     order by t.echeance_retenue, t.acte
     limit 20
  loop
    v_ecart := r.echeance_retenue - p_jour;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('Échéance %s%s : %s%s',
                           case when v_ecart < 0 then 'dépassée du ' else 'le ' end, to_char(r.echeance_retenue, 'DD/MM/YYYY'),
                           private.tamila_point_libelle_acte(r.acte),
                           case when v_ecart = 0 then ' (aujourd''hui)' when v_ecart = 1 then ' (demain)' when v_ecart > 1 then format(' (dans %s jours)', v_ecart)
                                else format(' (%s jour%s de retard)', -v_ecart, case when v_ecart < -1 then 's' else '' end) end
                           || case when r.statut = 'a_confirmer' then ', délai encore à confirmer' else '' end), 300),
      'gravite', case when v_ecart <= 2 then 'critique' else 'attention' end, 'lien', v_lien);
  end loop;

  -- 3. Les audiences d'aujourd'hui et de demain.
  for r in
    select a.date_heure, a.heure_connue, a.nature from public.tamila_audiences a
     where a.client_id = p_client and a.statut = 'prevue'
       and (a.date_heure at time zone 'Europe/Paris')::date between p_jour and p_jour + 1
       and (a.avocat_id = p_user or (a.avocat_id is null
            and a.dossier_id in (select x.dossier_id from private.tamila_point_mes_dossiers(p_client, p_user) x)))
     order by a.date_heure
     limit 10
  loop
    v_items := v_items || jsonb_build_object(
      'texte', format('%s %s%s', private.tamila_point_libelle_audience(r.nature),
                      case when (r.date_heure at time zone 'Europe/Paris')::date = p_jour then 'aujourd''hui' else 'demain' end,
                      case when r.heure_connue then ' à ' || replace(to_char(r.date_heure at time zone 'Europe/Paris', 'HH24 "h" MI'), ' h 00', ' h') else '' end),
      'gravite', case when (r.date_heure at time zone 'Europe/Paris')::date = p_jour then 'attention' else 'info' end, 'lien', v_lien);
  end loop;

  -- 4. Les audiences des trois derniers jours sans temps saisi (b4_12).
  select count(*) into v_n from public.tamila_audiences a
   where a.client_id = p_client and a.avocat_id = p_user and a.statut in ('prevue', 'tenue')
     and a.date_heure < p_maintenant and a.date_heure >= p_maintenant - interval '3 days'
     and not exists (select 1 from public.tamila_temps t where t.user_id = p_user and t.origine = 'audience:' || a.id::text and t.statut <> 'annule')
     and not exists (select 1 from public.tamila_temps_ecartes e where e.user_id = p_user and e.origine = 'audience:' || a.id::text);
  if v_n > 0 then
    v_items := v_items || jsonb_build_object(
      'texte', format('%s audience%s passée%s sans temps saisi : le temps est proposé dans le dossier', v_n,
                      case when v_n > 1 then 's' else '' end, case when v_n > 1 then 's' else '' end),
      'gravite', 'info', 'lien', v_lien);
  end if;

  -- 5. Les avis reçus par courriel, à rattacher (qui peut lire la réception).
  if private.tamila_peut_lire_reception(p_client, p_user) then
    select count(*), min(e.expire_le) into v_n, v_plus_ancien from public.tamila_avis_entrants e
     where e.client_id = p_client and e.statut = 'a_rattacher';
    if v_n > 0 then
      v_items := v_items || jsonb_build_object(
        'texte', format('%s avis RPVA reçu%s par courriel à rattacher ; le premier s''efface le %s s''il ne l''est pas', v_n,
                        case when v_n > 1 then 's' else '' end, to_char(v_plus_ancien at time zone 'Europe/Paris', 'DD/MM/YYYY')),
        'gravite', case when v_plus_ancien < p_maintenant + interval '2 days' then 'critique' else 'attention' end, 'lien', v_lien);
    end if;
  end if;
  return v_items;
end $function$;

create or replace function private.tamila_point_lignes_cabinet(p_client uuid, p_jour date, p_maintenant timestamptz default now())
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_items jsonb := '[]'::jsonb;
  v_n integer;
  v_somme bigint;
  v_lien constant text := '/espace/tamila';
begin
  select count(*) into v_n from public.tamila_delais t join public.tamila_dossiers d on d.id = t.dossier_id
   where t.client_id = p_client and t.statut in ('a_confirmer', 'confirme') and t.acte_depose_le is null
     and t.echeance_retenue < p_jour and d.statut in ('attente', 'ouvert', 'audit');
  if v_n > 0 then
    v_items := v_items || jsonb_build_object('texte', format('%s délai%s dépassé%s sans acte déposé dans le cabinet', v_n,
      case when v_n > 1 then 's' else '' end, case when v_n > 1 then 's' else '' end), 'gravite', 'critique', 'lien', v_lien);
  end if;

  select count(distinct c.dossier_id) into v_n from public.tamila_controles_conflits c join public.tamila_dossiers d on d.id = c.dossier_id
   where c.client_id = p_client and c.conflits > 0 and c.decision is null and d.statut in ('attente', 'ouvert', 'audit');
  if v_n > 0 then
    v_items := v_items || jsonb_build_object('texte', format('%s dossier%s avec un conflit d''intérêts sans décision (RIN art. 4)', v_n,
      case when v_n > 1 then 's' else '' end), 'gravite', 'critique', 'lien', v_lien);
  end if;

  select count(*) into v_n from public.tamila_dossiers d
   where d.client_id = p_client and d.statut in ('ouvert', 'audit')
     and coalesce(d.ouvert_le, d.cree_le) < p_maintenant - interval '15 days'
     and not exists (select 1 from public.tamila_conventions c where c.dossier_id = d.id and c.statut <> 'resiliee'
                       and (c.statut = 'signee' or c.urgence));
  if v_n > 0 then
    v_items := v_items || jsonb_build_object('texte', format('%s dossier%s ouvert%s depuis plus de quinze jours sans convention d''honoraires signée', v_n,
      case when v_n > 1 then 's' else '' end, case when v_n > 1 then 's' else '' end), 'gravite', 'attention', 'lien', v_lien);
  end if;

  select count(*), coalesce(sum(f.reste_du_cents), 0) into v_n, v_somme from public.tamila_factures f
   where f.client_id = p_client and f.statut = 'emise' and f.reste_du_cents > 0 and f.emise_le < p_jour - 30;
  if v_n > 0 then
    v_items := v_items || jsonb_build_object('texte', format('%s facture%s d''honoraires impayée%s depuis plus de trente jours, %s € restant dus', v_n,
      case when v_n > 1 then 's' else '' end, case when v_n > 1 then 's' else '' end,
      translate(to_char(v_somme / 100.0, 'FM999,999,990.00'), ',.', ' ,')), 'gravite', 'attention', 'lien', v_lien);
  end if;

  select count(*) into v_n from public.tamila_dossiers d
   where d.client_id = p_client and d.statut in ('clos', 'audit', 'refuse')
     and d.effacement_prevu_le is not null and d.effacement_prevu_le < p_maintenant + interval '7 days';
  if v_n > 0 then
    v_items := v_items || jsonb_build_object('texte', format('%s dossier%s effacé%s dans les sept jours : l''export, s''il le faut, avant', v_n,
      case when v_n > 1 then 's' else '' end, case when v_n > 1 then 's' else '' end), 'gravite', 'info', 'lien', v_lien);
  end if;
  return v_items;
end $function$;

create or replace function private.tamila_deposer_points(p_maintenant timestamptz default now())
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare
  k record;
  p record;
  v_jour date;
  v_items jsonb;
  v_perso constant text := 'Tamila : vos délais et audiences';
  v_cabinet constant text := 'Tamila : le cabinet';
  n integer := 0;
begin
  if (p_maintenant at time zone 'Europe/Paris')::time < time '05:00' then
    return 0;
  end if;
  v_jour := (p_maintenant at time zone 'Europe/Paris')::date;
  for k in select g.client_id from public.tamila_reglages g order by g.client_id loop
    begin
      for p in select c.user_id, c.role from public.comptes c
                where c.client_id = k.client_id and c.role in ('gerant', 'admin', 'valideur', 'collaborateur') order by c.user_id loop
        v_items := private.tamila_point_lignes_personne(k.client_id, p.user_id, p.role, v_jour, p_maintenant);
        if jsonb_array_length(v_items) = 0 then
          perform private.retirer_section(k.client_id, 'tamila', v_jour, p.user_id, null, v_perso, null, null);
        else
          perform private.deposer_section(k.client_id, 'tamila', v_jour, p.user_id, null, v_perso, v_items,
                                          null, null, false, p_maintenant, false, 20);
        end if;
      end loop;
      v_items := private.tamila_point_lignes_cabinet(k.client_id, v_jour, p_maintenant);
      if jsonb_array_length(v_items) = 0 then
        perform private.retirer_section(k.client_id, 'tamila', v_jour, null, 'gerant', v_cabinet, null, null);
      else
        perform private.deposer_section(k.client_id, 'tamila', v_jour, null, 'gerant', v_cabinet, v_items,
                                        null, null, false, p_maintenant, false, 21);
      end if;
      n := n + 1;
    exception when others then
      perform private.lever_alerte_module(k.client_id, 'tamila', 'attention',
        'Le point du matin de Tamila n''a pas pu être déposé.',
        jsonb_build_object('erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'point:depot:tamila', false, null);
    end;
  end loop;
  return n;
end $function$;

-- Le serveur seul.
revoke execute on function private.tamila_point_libelle_acte(text) from public, anon, authenticated;
revoke execute on function private.tamila_point_libelle_audience(text) from public, anon, authenticated;
revoke execute on function private.tamila_point_mes_dossiers(uuid, uuid) from public, anon, authenticated;
revoke execute on function private.tamila_point_lignes_personne(uuid, uuid, text, date, timestamptz) from public, anon, authenticated;
revoke execute on function private.tamila_point_lignes_cabinet(uuid, date, timestamptz) from public, anon, authenticated;
revoke execute on function private.tamila_deposer_points(timestamptz) from public, anon, authenticated;
grant execute on function private.tamila_point_libelle_acte(text) to service_role;
grant execute on function private.tamila_point_libelle_audience(text) to service_role;
grant execute on function private.tamila_point_mes_dossiers(uuid, uuid) to service_role;
grant execute on function private.tamila_point_lignes_personne(uuid, uuid, text, date, timestamptz) to service_role;
grant execute on function private.tamila_point_lignes_cabinet(uuid, date, timestamptz) to service_role;
grant execute on function private.tamila_deposer_points(timestamptz) to service_role;

-- Le cron, comme daliro-matin, tavaro-matin et tiroma-matin.
do $cron$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (select 1 from cron.job where jobname = 'tamila-matin') then
      perform cron.schedule('tamila-matin', '*/30 * * * *', 'select private.tamila_deposer_points()');
    end if;
  end if;
end $cron$;
