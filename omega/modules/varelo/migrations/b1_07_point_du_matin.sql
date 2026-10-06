-- b1_07 — VARELO : le point du matin du groupe (session B1, vague 3, 06/10/2026). Après b1_04, b1_05, b1_06.
-- Pose : coordinateur, recette ygwbgpowzlbdaajlsqkn, puis production.
--
-- CE QUE ÇA CORRIGE. /secteurs/groupes promet « Chaque matin à 7 h, chaque direction reçoit » sa liste. Le socle
-- assemble et remet le point du matin à partir des sections que chaque module dépose (private.deposer_section,
-- cron omega-points-assemblage) ; Varelo n'en déposait aucune. Les trois manques de la vague 3 (encours,
-- contrats, réciproques) ont désormais leurs listes : on les dépose.
--
-- CE QUI EST POSÉ.
--   · private.grp_lignes_matin(p_client, p_quoi) — SECURITY INVOKER : les lignes d'une section, lues dans les
--     vues security_invoker de b1_04 à b1_06. Appelée par le cron (tout le groupe) ou par l'écran à travers
--     public.grp_ce_matin (la RLS de la personne s'applique : on ne voit que son périmètre).
--       contrats    : les contrats tacites actifs à dénoncer dans les 30 jours (critique à 7 jours) ;
--       encours     : les clients du groupe au-dessus de leur plafond (attention), puis les balances âgées
--                     anciennes de plus de 7 jours (info) ;
--       reciproques : les paires intragroupe en écart, dette non reconnue ou arrêtés différents.
--   · public.grp_ce_matin(p_client) → jsonb {contrats, encours, reciproques} : la même chose pour l'écran.
--   · private.grp_deposer_points(p_maintenant) : pour chaque groupe où Varelo est installé, dès 5 h (heure de
--     l'entité principale), dépose « Contrats à dénoncer », « Encours du groupe », « Réciproques intragroupe »
--     au rôle gérant et à l'équipe direction_financiere, et « Contrats à dénoncer » à l'équipe
--     direction_juridique ; une section vide est retirée ; bat le battement varelo_matin ; une erreur lève une
--     alerte interne au lieu d'arrêter le passage.
--   · cron varelo-matin, toutes les 30 minutes (comme tavaro-matin, tiroma-matin).
-- Aucune donnée de santé : sections sante = false. Idempotent (create or replace ; cron.schedule remplace).

-- Un montant à la française, sans décimales s'il est rond : 110 000 ; 500,50.
create or replace function private.grp_euros(p numeric)
 returns text
 language sql
 stable
 set search_path to ''
as $function$
  select case when p is null then '—'
              when p = trunc(p) then replace(to_char(p, 'FM999G999G999G990'), ',', ' ')
              else replace(replace(to_char(p, 'FM999G999G999G990D00'), ',', ' '), '.', ',') end
$function$;

create or replace function private.grp_lignes_matin(p_client uuid, p_quoi text)
 returns jsonb
 language plpgsql
 stable
 set search_path to ''
as $function$
declare
  r record;
  v jsonb := '[]'::jsonb;
  n integer := 0;
begin
  if p_quoi = 'contrats' then
    for r in
      select x.* from public.grp_contrats_echeancier x
      where x.client_id = p_client and x.statut = 'actif' and x.reconduction = 'tacite'
        and x.date_limite >= current_date and x.jours_restants <= 30
      order by x.date_limite, x.intitule
    loop
      exit when n >= 15;
      v := v || jsonb_build_object(
        'texte', left(format('Avant le %s : dénoncer « %s » (%s, %s)%s', to_char(r.date_limite, 'DD/MM'), r.intitule, r.tiers, r.societe,
                              case when r.montant_annuel is not null then ' — ' || private.grp_euros(r.montant_annuel) || ' € par an' else '' end
                              || case when r.contrats_du_tiers > 1 then format(' ; %s contrats chez ce tiers dans le groupe', r.contrats_du_tiers) else '' end), 300),
        'gravite', case when r.jours_restants <= 7 then 'critique' else 'attention' end,
        'lien', '/espace/varelo', 'objet_type', 'grp_contrats', 'objet_id', r.id::text);
      n := n + 1;
    end loop;
  elsif p_quoi = 'encours' then
    for r in
      select g.* from public.grp_encours_groupe g
      where g.client_id = p_client and g.nature = 'client' and g.depasse and not g.intragroupe
      order by g.total - coalesce(g.plafond, 0) desc
    loop
      exit when n >= 12;
      v := v || jsonb_build_object(
        'texte', left(format('%s : %s € d''encours pour le groupe, plafond %s € (dont %s € échus, %s société%s)', r.nom_groupe,
                              private.grp_euros(r.total), private.grp_euros(r.plafond),
                              private.grp_euros(r.echu), r.societes, case when r.societes > 1 then 's' else '' end), 300),
        'gravite', 'attention', 'lien', '/espace/varelo', 'objet_type', 'grp_ref_objets', 'objet_id', r.objet_id::text);
      n := n + 1;
    end loop;
    for r in
      select c.* from public.grp_encours_courant c
      where c.client_id = p_client and c.age_jours > 7
      order by c.age_jours desc
    loop
      exit when n >= 15;
      v := v || jsonb_build_object(
        'texte', left(format('La balance %s de %s date du %s (%s jours) : à redéposer', case r.nature when 'client' then 'clients' else 'fournisseurs' end,
                              r.societe, to_char(r.arrete_le, 'DD/MM'), r.age_jours), 300),
        'gravite', 'info', 'lien', '/espace/varelo', 'objet_type', 'grp_encours_depots', 'objet_id', r.depot_id::text);
      n := n + 1;
    end loop;
  elsif p_quoi = 'reciproques' then
    for r in
      select g.* from public.grp_reciproques g
      where g.client_id = p_client and g.etat in ('ecart', 'manque_debiteur', 'dates_differentes')
      order by abs(g.ecart) desc
    loop
      exit when n >= 15;
      v := v || jsonb_build_object(
        'texte', left(case r.etat
          when 'ecart' then format('%s → %s : écart de %s € à expliquer', r.creancier, r.debiteur, private.grp_euros(r.ecart))
          when 'manque_debiteur' then format('%s dit que %s lui doit %s € ; %s ne reconnaît rien', r.creancier, r.debiteur, private.grp_euros(r.creance), r.debiteur)
          else format('%s → %s : balances arrêtées à des dates différentes (%s et %s)', r.creancier, r.debiteur, to_char(r.arrete_creancier, 'DD/MM'), to_char(r.arrete_debiteur, 'DD/MM'))
        end, 300),
        'gravite', case when r.etat = 'ecart' then 'attention' else 'info' end,
        'lien', '/espace/varelo');
      n := n + 1;
    end loop;
  else
    raise exception 'Section inconnue : % (contrats, encours, reciproques).', coalesce(p_quoi, 'vide') using errcode = '22023';
  end if;
  return v;
end $function$;

-- L'écran : les trois listes, au périmètre de la personne.
create or replace function public.grp_ce_matin(p_client uuid)
 returns jsonb
 language plpgsql
 stable
 set search_path to ''
as $function$
begin
  if (select auth.uid()) is not null and p_client not in (select private.mes_clients()) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  return jsonb_build_object('contrats', private.grp_lignes_matin(p_client, 'contrats'),
                            'encours', private.grp_lignes_matin(p_client, 'encours'),
                            'reciproques', private.grp_lignes_matin(p_client, 'reciproques'));
end $function$;

-- Le dépôt du point du matin, pour chaque groupe où Varelo est installé.
create or replace function private.grp_deposer_points(p_maintenant timestamp with time zone default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k record;
  s record;
  q record;
  v_jour date;
  v_items jsonb;
  n integer := 0;
begin
  for k in
    select i.client_id,
           coalesce((select e.fuseau from public.entites e where e.client_id = i.client_id and e.principale limit 1), 'Europe/Paris') as fuseau
    from public.grp_installations i
    order by i.client_id
  loop
    continue when (p_maintenant at time zone k.fuseau)::time < time '05:00';
    v_jour := (p_maintenant at time zone k.fuseau)::date;
    begin
      perform set_config('omega.module', 'varelo', true);
      for s in
        select * from (values ('contrats', 'Contrats à dénoncer', 10), ('encours', 'Encours du groupe', 20),
                              ('reciproques', 'Réciproques intragroupe', 30)) as t(quoi, titre, ordre)
      loop
        v_items := private.grp_lignes_matin(k.client_id, s.quoi);
        -- au gérant (rôle), à la direction financière (équipe) ; les contrats aussi à la direction juridique
        for q in
          select null::uuid as equipe_id, 'gerant'::text as role
          union all
          select e.id, null from public.equipes e
          where e.client_id = k.client_id
            and (e.cle = 'direction_financiere' or (e.cle = 'direction_juridique' and s.quoi = 'contrats'))
        loop
          if jsonb_array_length(v_items) = 0 then
            perform private.retirer_section(k.client_id, 'varelo', v_jour, null, q.role, s.titre, null, q.equipe_id);
          else
            perform private.deposer_section(k.client_id, 'varelo', v_jour, null, q.role, s.titre, v_items, null, q.equipe_id,
                                            false, now(), false, s.ordre);
          end if;
        end loop;
      end loop;
      perform private.battre(k.client_id, 'varelo_matin', jsonb_build_object('jour', v_jour), interval '1 day');
      n := n + 1;
    exception when others then
      perform private.lever_alerte_module(k.client_id, 'varelo', 'attention',
        'Le point du matin du groupe n''a pas pu être déposé.',
        jsonb_build_object('erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'point:depot', false, null);
    end;
  end loop;
  return n;
end $function$;

-- Droits : grp_lignes_matin est INVOKER et appelée par grp_ce_matin, ouverte aux personnes connectées ;
-- le dépôt est réservé au cron (service_role).
revoke execute on function private.grp_euros(numeric) from public, anon;
grant execute on function private.grp_euros(numeric) to authenticated, service_role;
revoke execute on function private.grp_lignes_matin(uuid, text) from public, anon;
grant execute on function private.grp_lignes_matin(uuid, text) to authenticated, service_role;
revoke execute on function public.grp_ce_matin(uuid) from public, anon;
grant execute on function public.grp_ce_matin(uuid) to authenticated, service_role;
revoke execute on function private.grp_deposer_points(timestamp with time zone) from public, anon, authenticated;
grant execute on function private.grp_deposer_points(timestamp with time zone) to service_role;

select cron.schedule('varelo-matin', '*/30 * * * *', $cron$select private.grp_deposer_points()$cron$);
