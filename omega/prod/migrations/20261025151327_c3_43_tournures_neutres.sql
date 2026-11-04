-- 20261025151327 c3_43_tournures_neutres
-- Source : dépôt : 8c882b8e3534dd21ddea35dc6f491af7c171e614 omega/modules/reput/migrations/c3_43_tournures_neutres.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c3_43_tournures_neutres.sql @ 8c882b8e3534dd21ddea35dc6f491af7c171e614 ; fichiers de tests ignorés : omega/tests/reput/c3_43_tournures_neutres.sql.
-- ═══ omega/modules/reput/migrations/c3_43_tournures_neutres.sql @ 8c882b8e3534dd21ddea35dc6f491af7c171e614
-- c3_43 — REPUT : tournures neutres (relance de Teo, 25/10 01 h 10 Z) (session C3, 25/10/2026)
--
-- Le client n'est jamais désigné par « le » ou « la » : on ne connaît pas son genre. private.reput_astreinte (reprise de
-- c3_40) : l'alerte d'astreinte épuisée dit « … rappelez cette personne vous-même » (et non « rappelez-le »). Les autres
-- textes de la base étaient déjà neutres (« rappelez cette personne », « contactez cette personne », c3_42). La consigne
-- du modèle (Edge reput-reponse, rediger.ts) est corrigée dans le même sens.
--
-- Règles de pose : create or replace ; ni DROP ni DELETE.

create or replace function private.reput_astreinte(p_maintenant timestamptz default now())
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d record;
  a public.reput_appels;
  g public.reput_gardes;
  v_lances integer := 0;
  v_escalades integer := 0;
  v_epuisees integer := 0;
  v_non_passes integer := 0;
begin
  for d in
    select x.*, r.astreinte_minutes
    from public.reput_demandes x
    join public.reput_reglages r on r.client_id = x.client_id and r.entite_id is null and r.actif and r.astreinte
    where x.urgence and x.urgence_prise_le is null and x.astreinte_epuisee_le is null
      and x.statut in ('a_preparer', 'a_valider', 'a_traiter') and x.recu_le >= p_maintenant - interval '6 hours'
    order by x.recu_le
    limit 200
  loop
    select * into a from public.reput_appels y where y.demande_id = d.id order by y.rang desc limit 1;
    if a.id is null then
      g := private.reput_garde_suivante(d.client_id, d.entite_id, 0, p_maintenant);
      if g.id is null then
        insert into public.reput_appels (client_id, entite_id, demande_id, rang, statut, issue_le)
        values (d.client_id, d.entite_id, d.id, 0, 'sans_garde', p_maintenant) on conflict (demande_id, rang) do nothing;
        perform private.journaliser_module(d.client_id, 'reput', 'reput.astreinte_sans_garde', 'reput_demandes', d.id::text,
          '{}'::jsonb, d.entite_id);
      else
        insert into public.reput_appels (client_id, entite_id, demande_id, garde_id, user_id, rang)
        values (d.client_id, d.entite_id, d.id, g.id, g.user_id, g.rang) on conflict (demande_id, rang) do nothing;
        perform private.journaliser_module(d.client_id, 'reput', 'reput.astreinte_lancee', 'reput_demandes', d.id::text,
          jsonb_build_object('rang', g.rang, 'membre', g.user_id), d.entite_id);
        v_lances := v_lances + 1;
      end if;
      continue;
    end if;
    continue when a.statut in ('pris', 'clos', 'sans_garde');
    -- Sans prise au délai, ou l'appel n'a pas abouti : on passe au rang suivant.
    continue when a.statut in ('a_appeler', 'en_cours', 'sonne', 'non_passe')
                  and coalesce(a.essai_le, a.cree_le) > p_maintenant - make_interval(mins => d.astreinte_minutes);
    -- c3_39 (TREPUT-15) : un appel dont aucun téléphone n'a sonné (jamais pris par l'ouvrier, ou pris sans nouvelle de
    -- Twilio) n'est PAS « sans réponse » : il devient « non_passe », le gérant est alerté une fois, et l'on n'escalade
    -- pas (le rang suivant ne sonnerait pas davantage). L'ouvrier le reprend à son prochain passage.
    if a.statut in ('a_appeler', 'en_cours', 'non_passe') then
      if a.statut <> 'non_passe' then
        -- Seulement si l'ouvrier n'a pas pris l'appel entre-temps (même état, même essai) : jamais d'écrasement.
        update public.reput_appels y set statut = 'non_passe', issue_le = p_maintenant
        where y.id = a.id and y.statut = a.statut and y.essai_le is not distinct from a.essai_le;
        continue when not found;
        perform private.journaliser_module(d.client_id, 'reput', 'reput.astreinte_non_passee', 'reput_demandes', d.id::text,
          jsonb_build_object('rang', a.rang, 'pris_par_ouvrier', a.essai_le is not null), d.entite_id);
        perform private.lever_alerte_module(d.client_id, 'reput', 'critique',
          left('L''appel d''astreinte n''a pas pu partir : urgence de ' || coalesce(nullif(btrim(d.de_nom), ''), 'un client')
               || ' — appelez la garde vous-même', 150),
          jsonb_build_object('demande', d.id, 'appel', a.id, 'rang', a.rang), 'astreinte_non_passe:' || d.id::text, true, null);
        v_non_passes := v_non_passes + 1;
      end if;
      continue;
    end if;
    if a.statut = 'sonne' then
      update public.reput_appels y set statut = 'sans_reponse', issue_le = p_maintenant where y.id = a.id and y.statut = 'sonne';
      continue when not found;   -- une issue est arrivée entre-temps (pris, par exemple) : la minute suivante la lit
    end if;
    g := private.reput_garde_suivante(d.client_id, d.entite_id, a.rang, p_maintenant);
    if g.id is null then
      update public.reput_demandes y set astreinte_epuisee_le = p_maintenant, maj_le = now() where y.id = d.id;
      perform private.journaliser_module(d.client_id, 'reput', 'reput.astreinte_epuisee', 'reput_demandes', d.id::text,
        jsonb_build_object('rangs', a.rang), d.entite_id);
      -- c3_40 (TREPUT-16) : personne de garde n'a pris l'urgence → alerte CRITIQUE au gérant. (La demande de validation
      -- du socle ne se modifie pas après sa création : c'est l'écran REPUT qui met ces demandes en tête.)
      perform private.lever_alerte_module(d.client_id, 'reput', 'critique',
        left('Urgence sans personne de garde : ' || coalesce(nullif(btrim(d.de_nom), ''), 'un client')
             || ' attend, aucun membre de garde n''a pris l''appel — rappelez cette personne vous-même', 150),
        jsonb_build_object('demande', d.id, 'rangs', a.rang), 'astreinte_epuisee:' || d.id::text, true, null);
      v_epuisees := v_epuisees + 1;
    else
      insert into public.reput_appels (client_id, entite_id, demande_id, garde_id, user_id, rang)
      values (d.client_id, d.entite_id, d.id, g.id, g.user_id, g.rang) on conflict (demande_id, rang) do nothing;
      perform private.journaliser_module(d.client_id, 'reput', 'reput.astreinte_escaladee', 'reput_demandes', d.id::text,
        jsonb_build_object('rang', g.rang, 'membre', g.user_id), d.entite_id);
      v_escalades := v_escalades + 1;
    end if;
  end loop;
  return jsonb_build_object('lances', v_lances, 'escalades', v_escalades, 'epuisees', v_epuisees, 'non_passes', v_non_passes);
end $function$;
