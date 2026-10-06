-- b3_06 — Le point du matin TIROMA : les trois décisions du jour, déposées chaque matin pour l'équipe du cabinet.
--
-- CE QUE ÇA CORRIGE : la page /secteurs/dentaire promet « Chaque matin, Tiroma lit l'agenda, les plans de traitement
-- et les devis signés du cabinet, et dit quel créneau sauver, quel plan planifier et quel fauteuil tourne à vide »,
-- « Point du matin à 7 h », « Un point du matin par centre ». Le socle assemble et remet le point du matin à partir
-- des sections que chaque module dépose (private.deposer_section, cron omega-points-assemblage), TAVARO et LORANI
-- déposent les leurs, mais TIROMA ne déposait rien : son point du matin n'existait pas.
--
-- CE QUE ÇA POSE :
--   · private.tiroma_section_lignes(...) : les lignes d'une section à partir des portes de lecture b3_02 à b3_05 ;
--   · private.tiroma_deposer_points(p_maintenant) : pour chaque cabinet actif, dès 5 h locale, dépose pour chaque
--     membre de l'équipe (profil titulaire, assistante ; le collaborateur reçoit ses patients ; la direction, les
--     compteurs sans nom) les sections « Créneaux à sauver », « Plans sans rendez-vous », « Avant les rendez-vous »
--     et, pour le titulaire, « Charge des fauteuils ». Toute section nominative est déposée `sante = true` : le
--     socle (private.verrous_envoi, SANTE_HORS_CANAL_AGREE) ne la laisse partir que par un expéditeur agréé ; sans
--     lui, le point sort sans donnée de santé et renvoie vers /espace/tiroma. Une section vide est retirée.
--   · le cron tiroma-matin, toutes les 30 minutes (comme tavaro-matin).
-- Rien de patient ne sort d'Omega par cette migration : elle écrit dans points_sections, derrière l'authentification.
-- Idempotent (create or replace ; cron.schedule remplace un cron du même nom).

create or replace function private.tiroma_section_lignes(p_client uuid, p_entite uuid, p_quoi text, p_voit_tous boolean, p_praticien uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v jsonb;
  e jsonb;
  k jsonb;
  v_items jsonb := '[]'::jsonb;
  v_texte text;
  v_cands text;
  n integer := 0;
begin
  if p_quoi = 'creneaux' then
    v := private.tiroma_creneaux_a_sauver_pour(p_client, p_entite, p_voit_tous, p_praticien);
    for e in select x.value from jsonb_array_elements(v) x where (x.value ->> 'libre')::boolean loop
      exit when n >= 15;
      select string_agg(format('%s. %s (%s)', c.value ->> 'rang', c.value ->> 'patient_nom',
                               case c.value ->> 'origine' when 'plan' then 'plan accepté' when 'attente' then 'liste d''attente' else 'contrôle dû' end), ' ; ' order by (c.value ->> 'rang')::integer)
        into v_cands
      from jsonb_array_elements(e -> 'candidats') c;
      v_texte := format('%s %s à %s (%s min%s) : %s',
        case e ->> 'type' when 'annulation' then 'Annulation' when 'report' then 'Report' else 'Déplacement' end,
        to_char((e ->> 'debut')::timestamptz at time zone (select en.fuseau from public.entites en where en.id = p_entite), 'DD/MM'),
        to_char((e ->> 'debut')::timestamptz at time zone (select en.fuseau from public.entites en where en.id = p_entite), 'HH24"h"MI'),
        e ->> 'minutes', coalesce(', ' || (e ->> 'fauteuil_nom'), ''),
        coalesce('appeler ' || v_cands, 'aucun patient ne convient'));
      v_items := v_items || jsonb_build_object('texte', left(v_texte, 300), 'gravite', case when v_cands is null then 'info' else 'attention' end,
                                               'lien', '/espace/tiroma', 'objet_type', 'tiroma_evenements_agenda', 'objet_id', e ->> 'evenement_id');
      n := n + 1;
    end loop;
  elsif p_quoi = 'plans' then
    v := private.tiroma_plans_sans_rendez_vous_pour(p_client, p_entite, p_voit_tous, p_praticien);
    for e in select x.value from jsonb_array_elements(v) x loop
      exit when n >= 15;
      v_texte := format('%s : %s signé il y a %s jours, %s à poser%s%s', e ->> 'patient_nom',
        coalesce('devis ' || (e ->> 'devis_numero'), 'plan'), e ->> 'jours_depuis',
        coalesce(e #>> '{prochaine,libelle}', 'la séance suivante'),
        case when (e ->> 'mutuelle_accord_sans_rdv')::boolean then ' (accord de mutuelle reçu)' else '' end,
        case when (e ->> 'jours_avant_expiration')::integer <= 30 then format(' — expire dans %s j', e ->> 'jours_avant_expiration') else '' end);
      v_items := v_items || jsonb_build_object('texte', left(v_texte, 300),
        'gravite', case when (e ->> 'jours_avant_expiration')::integer <= 30 or (e ->> 'jours_depuis')::integer >= 42 then 'attention' else 'info' end,
        'lien', '/espace/tiroma', 'objet_type', 'tiroma_plans', 'objet_id', e ->> 'plan_id');
      n := n + 1;
    end loop;
  elsif p_quoi = 'avant' then
    v := private.tiroma_avant_rendez_vous_pour(p_client, p_entite, null, p_voit_tous, p_praticien);
    for e in select x.value from jsonb_array_elements(v) x where x.value ->> 'gravite' <> 'info' loop
      exit when n >= 20;
      -- (les parenthèses comptent : tableau || objet || objet ajouterait deux éléments au lieu d'un objet fusionné)
      v_items := v_items || (jsonb_build_object('texte', left(coalesce((e ->> 'patient_nom') || ' — ', '') || (e ->> 'texte'), 300),
        'gravite', e ->> 'gravite', 'lien', '/espace/tiroma')
        || case when e ->> 'objet_id' is not null then jsonb_build_object('objet_type', e ->> 'objet_type', 'objet_id', e ->> 'objet_id') else '{}'::jsonb end);
      n := n + 1;
    end loop;
  elsif p_quoi = 'charge' then
    v := private.tiroma_charge_fauteuils_pour(p_client, p_entite, null);
    for e in select x.value from jsonb_array_elements(v -> 'fauteuils') x
             where (x.value #>> '{matin,vide}')::boolean or (x.value #>> '{apres_midi,vide}')::boolean loop
      v_items := v_items || jsonb_build_object('texte', left(format('%s : %s (%s %% prévu sur la journée, %s rendez-vous)%s', e ->> 'nom',
          case when (e #>> '{matin,vide}')::boolean and (e #>> '{apres_midi,vide}')::boolean then 'journée vide'
               when (e #>> '{matin,vide}')::boolean then 'matinée vide' else 'après-midi vide' end,
          round(coalesce((e #>> '{journee,taux}')::numeric, 0) * 100), e ->> 'rendez_vous',
          case when (e ->> 'sans_assistante_exigee')::integer > 0 then format(' ; %s soins exigent une assistante', e ->> 'sans_assistante_exigee') else '' end), 300),
        'gravite', 'attention', 'lien', '/espace/tiroma', 'objet_type', 'tiroma_fauteuils', 'objet_id', e ->> 'fauteuil_id');
    end loop;
  elsif p_quoi = 'compteurs' then
    v_items := v_items || jsonb_build_object('texte', left(format('%s créneau(x) libéré(s) à reprendre, %s plan(s) signé(s) sans rendez-vous, %s vérification(s) avant les rendez-vous.',
        (select count(*) from jsonb_array_elements(private.tiroma_creneaux_a_sauver_pour(p_client, p_entite, true, null)) x where (x.value ->> 'libre')::boolean),
        jsonb_array_length(private.tiroma_plans_sans_rendez_vous_pour(p_client, p_entite, true, null)),
        (select count(*) from jsonb_array_elements(private.tiroma_avant_rendez_vous_pour(p_client, p_entite, null, true, null)) x where x.value ->> 'gravite' <> 'info')), 300),
      'gravite', 'info', 'lien', '/espace/tiroma');
  end if;
  return v_items;
end $function$;

create or replace function private.tiroma_deposer_points(p_maintenant timestamp with time zone default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k record;
  m record;
  v_jour date;
  v_items jsonb;
  v_du timestamptz;
  n integer := 0;
begin
  for k in
    select c.id as cabinet_id, c.client_id, c.entite_id, e.fuseau, e.nom as entite_nom, c.dernier_releve_ok_le
    from public.tiroma_cabinets c
    join public.entites e on e.client_id = c.client_id and e.id = c.entite_id
    where c.statut = 'actif'
    order by c.client_id, c.entite_id
  loop
    continue when (p_maintenant at time zone k.fuseau)::time < time '05:00';
    v_jour := (p_maintenant at time zone k.fuseau)::date;
    v_du := k.dernier_releve_ok_le;
    begin
      for m in
        select p.user_id, p.profil, p.praticien_id
        from public.tiroma_profils p
        join public.comptes c on c.user_id = p.user_id and c.client_id = p.client_id
        where p.client_id = k.client_id and p.entite_id = k.entite_id
        order by p.user_id
      loop
        if m.profil = 'direction' then
          v_items := private.tiroma_section_lignes(k.client_id, k.entite_id, 'compteurs', true, null);
          perform private.deposer_section(k.client_id, 'tiroma', v_jour, m.user_id, null, 'Cabinet dentaire — ' || left(k.entite_nom, 90),
                                          v_items, k.entite_id, null, false, v_du, v_du is null, 30);
          continue;
        end if;
        -- Les créneaux à sauver.
        v_items := private.tiroma_section_lignes(k.client_id, k.entite_id, 'creneaux', m.profil in ('titulaire', 'assistante'), m.praticien_id);
        if jsonb_array_length(v_items) = 0 then
          perform private.retirer_section(k.client_id, 'tiroma', v_jour, m.user_id, null, 'Créneaux à sauver', k.entite_id, null);
        else
          perform private.deposer_section(k.client_id, 'tiroma', v_jour, m.user_id, null, 'Créneaux à sauver', v_items,
                                          k.entite_id, null, true, v_du, v_du is null, 10);
        end if;
        -- Les plans sans rendez-vous.
        v_items := private.tiroma_section_lignes(k.client_id, k.entite_id, 'plans', m.profil in ('titulaire', 'assistante'), m.praticien_id);
        if jsonb_array_length(v_items) = 0 then
          perform private.retirer_section(k.client_id, 'tiroma', v_jour, m.user_id, null, 'Plans sans rendez-vous', k.entite_id, null);
        else
          perform private.deposer_section(k.client_id, 'tiroma', v_jour, m.user_id, null, 'Plans sans rendez-vous', v_items,
                                          k.entite_id, null, true, v_du, v_du is null, 20);
        end if;
        -- Avant les rendez-vous.
        v_items := private.tiroma_section_lignes(k.client_id, k.entite_id, 'avant', m.profil in ('titulaire', 'assistante'), m.praticien_id);
        if jsonb_array_length(v_items) = 0 then
          perform private.retirer_section(k.client_id, 'tiroma', v_jour, m.user_id, null, 'Avant les rendez-vous', k.entite_id, null);
        else
          perform private.deposer_section(k.client_id, 'tiroma', v_jour, m.user_id, null, 'Avant les rendez-vous', v_items,
                                          k.entite_id, null, true, v_du, v_du is null, 25);
        end if;
        -- La charge des fauteuils, au titulaire seul.
        if m.profil = 'titulaire' then
          v_items := private.tiroma_section_lignes(k.client_id, k.entite_id, 'charge', true, null);
          if jsonb_array_length(v_items) = 0 then
            perform private.retirer_section(k.client_id, 'tiroma', v_jour, m.user_id, null, 'Charge des fauteuils', k.entite_id, null);
          else
            perform private.deposer_section(k.client_id, 'tiroma', v_jour, m.user_id, null, 'Charge des fauteuils', v_items,
                                            k.entite_id, null, false, v_du, false, 28);
          end if;
        end if;
        n := n + 1;
      end loop;
      perform private.battre(k.client_id, 'tiroma_matin', jsonb_build_object('jour', v_jour, 'cabinet', k.cabinet_id), interval '1 day');
    exception when others then
      perform private.lever_alerte_module(k.client_id, 'tiroma', 'attention',
        'Le point du matin du cabinet n''a pas pu être déposé.',
        jsonb_build_object('cabinet', k.cabinet_id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'point:depot:' || k.cabinet_id::text, false, null);
    end;
  end loop;
  return n;
end $function$;

-- Le cron, comme tavaro-matin.
select cron.schedule('tiroma-matin', '*/30 * * * *', 'select private.tiroma_deposer_points()');
