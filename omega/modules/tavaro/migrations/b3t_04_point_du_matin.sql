-- b3t_04 — Les analyses de b3t_01 et b3t_02 au point du matin de chaque agence (renfort B3 sur Tavaro, 06/10/2026).
--
-- CE QUE ÇA CORRIGE : la page /secteurs/location chiffre ces modules « ce matin » (« 19 réservations à risque ce
-- matin », « 3 contrats signalés à risque ce matin », « 28 véhicules à risque ce matin », « 34 clients à qui proposer
-- une offre ») : le chef d'agence doit les trouver le matin, sans ouvrir l'écran.
--
-- CE QUE ÇA POSE : private.loc_b3t_deposer_points(p_maintenant) : pour chaque agence active d'un loueur réglé
-- (loc_reglages), dès 5 h à l'heure de l'agence, quatre sections adressées au rôle « valideur » de l'agence, comme
-- la section « Facturation des retours » de loc_deposer_points (qu'on ne modifie pas) :
--   « Véhicules inactifs » (ordre 30), « Réservations à risque » (31), « Contrats à risque » (32),
--   « Montée en gamme » (33) — dix lignes au plus chacune, la plus urgente d'abord ; une section vide est retirée.
-- Une agence en échec lève une alerte « attention » et n'empêche pas les autres. Cron tavaro-analyses, toutes les
-- 30 minutes (le dépôt est idempotent : deposer_section ne réécrit pas une section inchangée).
-- Idempotent (create or replace, grant, cron s'il manque).

create or replace function private.loc_b3t_deposer_points(p_maintenant timestamp with time zone default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  s record;
  v_jour date;
  v jsonb;
  v_items jsonb;
  n integer := 0;
begin
  for r in
    select a.client_id, a.entite_id, coalesce(e.fuseau, 'UTC') as fuseau
    from public.loc_agences a
    join public.entites e on e.client_id = a.client_id and e.id = a.entite_id
    where a.actif and exists (select 1 from public.loc_reglages g where g.client_id = a.client_id)
    order by a.client_id, a.entite_id
  loop
    continue when (p_maintenant at time zone r.fuseau)::time < time '05:00';
    v_jour := (p_maintenant at time zone r.fuseau)::date;
    begin
      for s in select * from (values ('inactifs', 'Véhicules inactifs', 30), ('reservations', 'Réservations à risque', 31),
                                     ('contrats', 'Contrats à risque', 32), ('montee', 'Montée en gamme', 33)) x(quoi, titre, ordre) loop
        if s.quoi = 'inactifs' then
          v := private.loc_vehicules_inactifs_lire(r.client_id, r.entite_id, p_maintenant, false);
          select coalesce(jsonb_agg(jsonb_build_object(
                   'texte', left(format('%s (%s), %s %% de risque de rester trois jours : %s', e ->> 'immatriculation', e ->> 'categorie',
                                        round((e ->> 'probabilite')::numeric * 100), e #>> '{action,libelle}'), 300),
                   'gravite', case when e ->> 'niveau' = 'fort' then 'attention' else 'info' end,
                   'lien', '/espace/tavaro', 'objet_type', 'loc_vehicules', 'objet_id', e ->> 'vehicule_id')), '[]'::jsonb)
            into v_items
          from (select e from jsonb_array_elements(v -> 'vehicules') e where e ->> 'niveau' in ('fort', 'moyen') limit 10) x;
        elsif s.quoi = 'reservations' then
          v := private.loc_reservations_a_risque_lire(r.client_id, r.entite_id, 72, p_maintenant, false);
          select coalesce(jsonb_agg(jsonb_build_object(
                   'texte', left(format('%s, départ le %s : %s (%s)', e ->> 'client',
                                        to_char((e ->> 'depart_prevu_le')::timestamptz at time zone r.fuseau, 'DD/MM à HH24"h"MI'),
                                        e ->> 'action', (select string_agg(x.value, ', ') from jsonb_array_elements_text(e -> 'raisons') x)), 300),
                   'gravite', case when e ->> 'niveau' = 'fort' then 'attention' else 'info' end,
                   'lien', '/espace/tavaro', 'objet_type', 'loc_reservations', 'objet_id', e ->> 'reservation_id')), '[]'::jsonb)
            into v_items
          from (select e from jsonb_array_elements(v -> 'reservations') e limit 10) x;
        elsif s.quoi = 'contrats' then
          v := private.loc_contrats_a_risque_lire(r.client_id, r.entite_id, p_maintenant, false);
          select coalesce(jsonb_agg(jsonb_build_object(
                   'texte', left(format('%s, %s : %s (%s)', e ->> 'numero', e ->> 'client', e ->> 'action',
                                        (select string_agg(x.value, ', ') from jsonb_array_elements_text(e -> 'raisons') x)), 300),
                   'gravite', case when e ->> 'niveau' = 'fort' then 'attention' else 'info' end,
                   'lien', '/espace/tavaro', 'objet_type', 'loc_contrats', 'objet_id', e ->> 'contrat_id')), '[]'::jsonb)
            into v_items
          from (select e from jsonb_array_elements(v -> 'contrats') e limit 10) x;
        else
          v := private.loc_montee_en_gamme_lire(r.client_id, r.entite_id, 48, p_maintenant, false);
          select coalesce(jsonb_agg(jsonb_build_object(
                   'texte', left(format('%s, départ le %s : proposer la catégorie %s au lieu de %s (%s)', e ->> 'client',
                                        to_char((e ->> 'depart_prevu_le')::timestamptz at time zone r.fuseau, 'DD/MM à HH24"h"MI'),
                                        e #>> '{offre,categorie}', e ->> 'categorie',
                                        (select string_agg(x.value, ', ') from jsonb_array_elements_text(e -> 'raisons') x)), 300),
                   'gravite', 'info', 'lien', '/espace/tavaro', 'objet_type', 'loc_reservations', 'objet_id', e ->> 'reservation_id')), '[]'::jsonb)
            into v_items
          from (select e from jsonb_array_elements(v -> 'offres') e limit 10) x;
        end if;
        if jsonb_array_length(v_items) = 0 then
          perform private.retirer_section(r.client_id, 'tavaro', v_jour, null, 'valideur', s.titre, r.entite_id, null);
        else
          perform private.deposer_section(r.client_id, 'tavaro', v_jour, null, 'valideur', s.titre, v_items,
                                          r.entite_id, null, false, null, false, s.ordre);
        end if;
      end loop;
      n := n + 1;
    exception when others then
      perform private.lever_alerte_module(r.client_id, 'tavaro', 'attention',
        'Les analyses du point du matin (véhicules inactifs, réservations et contrats à risque, montée en gamme) n''ont pas pu être déposées pour une agence.',
        jsonb_build_object('entite', r.entite_id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'point:analyses:' || r.entite_id::text, false, null);
    end;
  end loop;
  return n;
end $function$;

revoke all on function private.loc_b3t_deposer_points(timestamp with time zone) from public, anon, authenticated;
grant execute on function private.loc_b3t_deposer_points(timestamp with time zone) to service_role;

select cron.schedule('tavaro-analyses', '*/30 * * * *', $cron$select private.loc_b3t_deposer_points()$cron$)
where not exists (select 1 from cron.job where jobname = 'tavaro-analyses');

select 'b3t_04 analyses au point du matin posées' as resultat;
