-- b6_15 — DALIRO : la section du point du matin « réceptions et retenues » (session B6, 06/10/2026)
--
-- CE QUE ÇA AJOUTE. Le socle assemble le point du matin à partir des sections que chaque module dépose
-- (private.deposer_section ; TAVARO, LORANI, TIROMA le font). DALIRO n'y déposait rien. Désormais, chaque
-- matin dès 5 h (heure de Paris), pour le gérant et pour les valideurs (la DAF), une section
-- « Chantiers : réceptions et retenues » avec ce qui fait rentrer l'argent :
--   · retenue de garantie due (un an après la réception, sans opposition) : « réclamez-la » — attention ;
--   · retenue due dans les 30 jours : info ;
--   · décompte final pas envoyé, échéance à 45 jours de la réception : attention à 15 jours ou après, info avant ;
--   · réserves encore ouvertes : info (attention passé 60 jours) ;
--   · réception à prononcer : chantier ouvert dont la dernière situation validée facture tout le marché et les
--     avenants signés (≥ 99,5 %), ou dont la fin prévue est passée — attention / info.
-- Une section vide est retirée (private.retirer_section). Lignes en texte, lien /espace/daliro, objet btp_chantiers.
-- Le cron daliro-matin, toutes les 30 minutes comme tavaro-matin et tiroma-matin (le dépôt ne réécrit rien si rien
-- n'a changé).
--
-- Règles de pose : create or replace ; cron.schedule si absent ; rien n'est retiré ni effacé.

create or replace function private.btp_point_matin_lignes(p_client uuid, p_jour date)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_items jsonb := '[]'::jsonb;
  v_n integer := 0;
  v_total numeric;
  v_facture numeric;
  v_ouvertes integer;
begin
  -- 1. Les retenues : dues (à réclamer), puis dues dans les 30 jours.
  for r in
    select x.*, c.nom as chantier_nom from public.btp_receptions x join public.btp_chantiers c on c.id = x.chantier_id
    where x.client_id = p_client and x.retenue_statut = 'bloquee' and (x.retenue_montant > 0 or x.retenue_caution)
      and x.retenue_due_le <= p_jour + 30
    order by x.retenue_due_le, c.nom
  loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : %s %s le %s%s', r.chantier_nom,
                           case when r.retenue_caution then 'caution de retenue de garantie' else 'retenue de garantie de ' || translate(to_char(r.retenue_montant, 'FM999,999,990.00'), ',.', ' ,') || ' €' end,
                           case when r.retenue_due_le <= p_jour then 'due depuis' else 'due' end,
                           to_char(r.retenue_due_le, 'DD/MM/YYYY'),
                           case when r.retenue_due_le <= p_jour then ' : réclamez-la' else '' end), 300),
      'gravite', case when r.retenue_due_le <= p_jour then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 2. Les décomptes finals à envoyer (45 jours après la réception).
  for r in
    select x.*, c.nom as chantier_nom from public.btp_receptions x join public.btp_chantiers c on c.id = x.chantier_id
    where x.client_id = p_client and x.decompte_statut in ('a_preparer', 'projet')
    order by x.date_reception, c.nom
  loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : décompte final à envoyer %s le %s', r.chantier_nom,
                           case when p_jour > r.date_reception + 45 then 'depuis' else 'avant' end,
                           to_char(r.date_reception + 45, 'DD/MM/YYYY')), 300),
      'gravite', case when p_jour >= r.date_reception + 30 then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 3. Les réserves encore ouvertes.
  for r in
    select x.chantier_id, x.date_reception, c.nom as chantier_nom, count(v.id) as ouvertes
    from public.btp_receptions x
    join public.btp_chantiers c on c.id = x.chantier_id
    join public.btp_reserves v on v.reception_id = x.id and v.statut = 'ouverte'
    where x.client_id = p_client
    group by x.chantier_id, x.date_reception, c.nom
    order by x.date_reception, c.nom
  loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : %s réserve%s encore ouverte%s depuis la réception du %s', r.chantier_nom, r.ouvertes,
                           case when r.ouvertes > 1 then 's' else '' end, case when r.ouvertes > 1 then 's' else '' end,
                           to_char(r.date_reception, 'DD/MM/YYYY')), 300),
      'gravite', case when p_jour >= r.date_reception + 60 then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 4. Les réceptions à prononcer.
  for r in
    select c.* from public.btp_chantiers c
    where c.client_id = p_client and c.statut in ('ouvert', 'suspendu')
      and not exists (select 1 from public.btp_receptions x where x.chantier_id = c.id)
    order by c.nom
  loop
    exit when v_n >= 50;
    select coalesce(sum(l.montant_ht), 0) into v_total
    from public.btp_lignes_marche l
    where l.nature <> 'option'
      and l.marche_id = (select m.id from public.btp_marches m where m.chantier_id = r.id and m.statut = 'verifie' order by m.verifie_le desc nulls last limit 1);
    v_total := v_total + coalesce((select sum(l.montant_ht) from public.btp_avenants_lignes l join public.btp_avenants a on a.id = l.avenant_id
                                   where a.chantier_id = r.id and a.statut = 'signe' and not l.retiree), 0);
    select s.cumul_ht into v_facture from public.btp_situations s where s.chantier_id = r.id and s.statut = 'validee' order by s.numero desc limit 1;
    if v_total > 0 and coalesce(v_facture, 0) >= v_total * 0.995 then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : travaux facturés à 100 %% par les situations — prononcez la réception', r.nom), 300),
        'gravite', 'attention', 'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.id::text);
      v_n := v_n + 1;
    elsif r.date_fin_prevue is not null and r.date_fin_prevue < p_jour then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : fin prévue le %s dépassée — réception à prononcer ou planning à recaler', r.nom,
                             to_char(r.date_fin_prevue, 'DD/MM/YYYY')), 300),
        'gravite', 'info', 'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.id::text);
      v_n := v_n + 1;
    end if;
  end loop;
  return v_items;
end $function$;

create or replace function private.btp_deposer_points(p_maintenant timestamp with time zone default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k record;
  v_jour date;
  v_items jsonb;
  v_role text;
  v_titre constant text := 'Chantiers : réceptions et retenues';
  n integer := 0;
begin
  if (p_maintenant at time zone 'Europe/Paris')::time < time '05:00' then
    return 0;
  end if;
  v_jour := (p_maintenant at time zone 'Europe/Paris')::date;
  for k in select g.client_id from public.btp_reglages g order by g.client_id loop
    begin
      v_items := private.btp_point_matin_lignes(k.client_id, v_jour);
      foreach v_role in array array['gerant', 'valideur'] loop
        if jsonb_array_length(v_items) = 0 then
          perform private.retirer_section(k.client_id, 'daliro', v_jour, null, v_role, v_titre, null, null);
        else
          perform private.deposer_section(k.client_id, 'daliro', v_jour, null, v_role, v_titre, v_items,
                                          null, null, false, p_maintenant, false, 40);
        end if;
      end loop;
      n := n + 1;
    exception when others then
      perform private.lever_alerte_module(k.client_id, 'daliro_referentiel', 'attention',
        'Le point du matin des chantiers n''a pas pu être déposé.',
        jsonb_build_object('erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'point:depot:daliro', false, null);
    end;
  end loop;
  return n;
end $function$;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt) : le serveur seul.
revoke execute on function private.btp_point_matin_lignes(uuid, date) from public, anon, authenticated;
revoke execute on function private.btp_deposer_points(timestamp with time zone) from public, anon, authenticated;
grant execute on function private.btp_point_matin_lignes(uuid, date) to service_role;
grant execute on function private.btp_deposer_points(timestamp with time zone) to service_role;

-- Le cron, comme tavaro-matin et tiroma-matin.
select cron.schedule('daliro-matin', '*/30 * * * *', $cron$select private.btp_deposer_points()$cron$)
where not exists (select 1 from cron.job where jobname = 'daliro-matin');
