-- b2_18 — Le parking de chaque agence au point du matin (chiffrage, lignes 10 et 13 : « Avant l'ouverture du comptoir,
-- chaque agence reçoit une page qui décrit l'état de son parking et les décisions qui l'attendent »). Session B2, 15/10/2026.
--
-- private.loc_b2_deposer_points(p_maintenant) : pour chaque agence active d'un loueur réglé, dès 5 h à l'heure de l'agence,
-- cinq sections adressées au rôle « valideur » de l'agence, après « Facturation des retours » (ordre 20) et avant les
-- analyses de B3 (30 à 33) :
--   « Remises en location » (21) : les remises ouvertes, l'heure limite et la personne qui en a la charge ;
--   « Entretien et immobilisations » (22) : les entretiens dus sous quinze jours, les retours de garage dépassés, les
--     rappels du constructeur et les contrôles techniques qui expirent sous trente jours ;
--   « Avis de contravention » (23) : les avis à désigner ou à rapprocher, l'échéance la plus proche d'abord ;
--   « Contestations bancaires » (24) : les contestations à répondre, la date limite de la banque ;
--   « Péages à payer » (25) : les passages en flux libre encore à payer, les 72 heures dépassées d'abord.
-- Dix lignes au plus par section ; une section vide est retirée. Une agence en échec lève une alerte et n'empêche pas
-- les autres. Les fonctions de loc_deposer_points et de b3t_04 ne sont pas modifiées. Cron tavaro-parking, toutes les
-- 30 minutes (deposer_section ne réécrit pas une section inchangée). Idempotent.

create or replace function private.loc_b2_deposer_points(p_maintenant timestamp with time zone default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  s record;
  v_jour date;
  v_items jsonb;
  n integer := 0;
begin
  for r in
    select a.client_id, a.entite_id, coalesce(e.fuseau, 'Europe/Paris') as fuseau
    from public.loc_agences a
    join public.entites e on e.client_id = a.client_id and e.id = a.entite_id
    where a.actif and exists (select 1 from public.loc_reglages g where g.client_id = a.client_id)
    order by a.client_id, a.entite_id
  loop
    continue when (p_maintenant at time zone r.fuseau)::time < time '05:00';
    v_jour := (p_maintenant at time zone r.fuseau)::date;
    begin
      for s in select * from (values ('remises', 'Remises en location', 21), ('atelier', 'Entretien et immobilisations', 22),
                                     ('avis', 'Avis de contravention', 23), ('contestations', 'Contestations bancaires', 24),
                                     ('peages', 'Péages à payer', 25)) x(quoi, titre, ordre) loop
        if s.quoi = 'remises' then
          select coalesce(jsonb_agg(jsonb_build_object(
                   'texte', left(format('%s : %s%s, %s', v.immatriculation,
                                        case when x.limite_le is null then 'pas de départ prévu'
                                             when x.limite_le < p_maintenant then 'en retard, elle devait être prête le ' || to_char(x.limite_le at time zone r.fuseau, 'DD/MM à HH24"h"MI')
                                             else 'prête avant ' || to_char(x.limite_le at time zone r.fuseau, 'DD/MM à HH24"h"MI') end,
                                        case when x.prochain_depart_ref is not null then ' (départ ' || x.prochain_depart_ref || ')' else '' end,
                                        case when x.responsable is null then 'aucune personne nommée' else 'confiée à ' || coalesce(
                                          (select coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1)) from auth.users u where u.id = x.responsable), 'une personne') end), 300),
                   'gravite', case when x.alerte is not null or (x.limite_le is not null and x.limite_le < p_maintenant + interval '2 hours') then 'attention' else 'info' end,
                   'lien', '/espace2/tavaro', 'objet_type', 'loc_remises', 'objet_id', x.id::text) order by x.limite_le nulls last), '[]'::jsonb)
            into v_items
          from (select * from public.loc_remises x where x.client_id = r.client_id and x.entite_id = r.entite_id and x.statut in ('a_faire', 'en_cours')
                order by x.limite_le nulls last limit 10) x
          join public.loc_vehicules v on v.id = x.vehicule_id;
        elsif s.quoi = 'atelier' then
          select coalesce(jsonb_agg(z.item order by z.rang, z.quand nulls last), '[]'::jsonb) into v_items
          from (select * from (
            select 0 as rang, i.fin_prevue_le as quand, jsonb_build_object(
                     'texte', left(format('%s devait revenir le %s (%s%s)', v.immatriculation, to_char(i.fin_prevue_le at time zone r.fuseau, 'DD/MM'),
                                          replace(i.motif, '_', ' '), coalesce(', ' || i.prestataire, '')), 300),
                     'gravite', 'attention', 'lien', '/espace2/tavaro', 'objet_type', 'loc_immobilisations', 'objet_id', i.id::text) as item
            from public.loc_immobilisations i join public.loc_vehicules v on v.id = i.vehicule_id
            where i.client_id = r.client_id and i.entite_id = r.entite_id and i.fin_le is null and i.motif <> 'preparation' and i.fin_prevue_le < p_maintenant
            union all
            select 1, rv.fait_le, jsonb_build_object(
                     'texte', left(format('%s : rappel du constructeur %s à faire (%s)', v.immatriculation, rp.reference, rp.libelle), 300),
                     'gravite', case rp.gravite when 'immobilisant' then 'attention' else 'info' end, 'lien', '/espace2/tavaro',
                     'objet_type', 'loc_rappels_vehicules', 'objet_id', rv.id::text)
            from public.loc_rappels_vehicules rv join public.loc_rappels rp on rp.id = rv.rappel_id join public.loc_vehicules v on v.id = rv.vehicule_id
            where rv.client_id = r.client_id and v.entite_id = r.entite_id and rv.statut = 'a_faire' and v.statut <> 'sorti'
            union all
            select 2, x.ct_valide_jusqu_au::timestamptz, jsonb_build_object(
                     'texte', left(format('%s : contrôle technique %s le %s', v.immatriculation,
                                          case when x.ct_valide_jusqu_au < v_jour then 'expiré' else 'à faire avant' end, to_char(x.ct_valide_jusqu_au, 'DD/MM')), 300),
                     'gravite', case when x.ct_valide_jusqu_au < v_jour then 'attention' else 'info' end, 'lien', '/espace2/tavaro',
                     'objet_type', 'loc_vehicules', 'objet_id', v.id::text)
            from public.loc_vehicules_conformite x join public.loc_vehicules v on v.client_id = x.client_id and v.id = x.vehicule_id
            where x.client_id = r.client_id and v.entite_id = r.entite_id and v.statut <> 'sorti' and x.ct_valide_jusqu_au <= v_jour + 30
            union all
            select 3, e.echeance_le::timestamptz, jsonb_build_object(
                     'texte', left(format('%s : %s, échéance le %s%s', v.immatriculation, coalesce(e.libelle, replace(e.nature, '_', ' ')),
                                          to_char(e.echeance_le, 'DD/MM'), case when e.statut = 'planifie' then ', planifié' else ', à planifier' end), 300),
                     'gravite', case when e.statut = 'a_planifier' and e.echeance_le <= v_jour + 3 then 'attention' else 'info' end, 'lien', '/espace2/tavaro',
                     'objet_type', 'loc_entretiens', 'objet_id', e.id::text)
            from public.loc_entretiens e join public.loc_vehicules v on v.id = e.vehicule_id
            where e.client_id = r.client_id and e.entite_id = r.entite_id and e.statut in ('a_planifier', 'planifie') and e.echeance_le <= v_jour + 15
          ) y order by y.rang, y.quand nulls last limit 10) z;
        elsif s.quoi = 'avis' then
          select coalesce(jsonb_agg(jsonb_build_object(
                   'texte', left(format('%s, avis n° %s : %s avant le %s', a.immatriculation, a.numero_avis,
                                        case a.statut when 'a_designer' then 'désigner le conducteur' else 'rattacher au contrat' end, to_char(a.echeance_le, 'DD/MM')), 300),
                   'gravite', case when a.echeance_le <= v_jour + 7 then 'attention' else 'info' end,
                   'lien', '/espace2/tavaro', 'objet_type', 'loc_avis_contravention', 'objet_id', a.id::text) order by a.echeance_le), '[]'::jsonb)
            into v_items
          from (select * from public.loc_avis_contravention a where a.client_id = r.client_id and a.entite_id = r.entite_id
                  and a.statut in ('a_rapprocher', 'a_designer') order by a.echeance_le limit 10) a;
        elsif s.quoi = 'contestations' then
          select coalesce(jsonb_agg(jsonb_build_object(
                   'texte', left(format('Contestation %s (%s €) : %s avant le %s', coalesce(c.reference_banque, 'sans référence'), replace(c.montant_eur::text, '.', ','),
                                        case c.statut when 'ouverte' then 'préparer le dossier' else 'envoyer le dossier à la banque' end, to_char(c.repondre_avant, 'DD/MM')), 300),
                   'gravite', case when c.repondre_avant <= v_jour + 3 then 'attention' else 'info' end,
                   'lien', '/espace2/tavaro', 'objet_type', 'loc_contestations', 'objet_id', c.id::text) order by c.repondre_avant), '[]'::jsonb)
            into v_items
          from (select * from public.loc_contestations c where c.client_id = r.client_id and c.entite_id = r.entite_id
                  and c.statut in ('ouverte', 'dossier_pret') order by c.repondre_avant limit 10) c;
        else
          select coalesce(jsonb_agg(jsonb_build_object(
                   'texte', left(format('%s, %s (%s €) : %s', p.immatriculation, p.operateur, replace(p.montant_eur::text, '.', ','),
                                        case when p.payer_avant < p_maintenant then '72 heures dépassées, à payer aujourd''hui'
                                             else 'à payer avant le ' || to_char(p.payer_avant at time zone r.fuseau, 'DD/MM à HH24"h"MI') end), 300),
                   'gravite', case when p.payer_avant < p_maintenant + interval '24 hours' then 'attention' else 'info' end,
                   'lien', '/espace2/tavaro', 'objet_type', 'loc_passages_peage', 'objet_id', p.id::text) order by p.payer_avant), '[]'::jsonb)
            into v_items
          from (select * from public.loc_passages_peage p where p.client_id = r.client_id and p.entite_id = r.entite_id and p.statut = 'a_payer'
                order by p.payer_avant limit 10) p;
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
        'Le parking d''une agence (remises, atelier, avis, contestations, péages) n''a pas pu être déposé au point du matin.',
        jsonb_build_object('entite', r.entite_id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'point:parking:' || r.entite_id::text, false, null);
    end;
  end loop;
  return n;
end $function$;

revoke all on function private.loc_b2_deposer_points(timestamp with time zone) from public, anon, authenticated;
grant execute on function private.loc_b2_deposer_points(timestamp with time zone) to service_role;

select cron.schedule('tavaro-parking', '*/30 * * * *', $cron$select private.loc_b2_deposer_points()$cron$)
where not exists (select 1 from cron.job where jobname = 'tavaro-parking');
