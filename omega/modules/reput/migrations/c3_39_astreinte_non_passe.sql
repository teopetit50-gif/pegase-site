-- c3_39 — REPUT, écart TREPUT-15 (T-REPUT, 22/10) : un appel d'astreinte qui n'a jamais sonné n'est pas « sans réponse »
-- (session C3, 22/10/2026)
--
-- Constat (U3 : b85da907 puis 819b7873) : sans ouvrier Edge (ou Twilio en panne), l'appel restait « a_appeler », passait
-- « sans_reponse » au délai, escaladait, puis l'astreinte se disait épuisée — le journal disait que les gardes n'avaient
-- pas répondu alors qu'aucun téléphone n'avait sonné. Désormais :
--   · reput_appels.statut admet « non_passe » (contrainte élargie : drop/add, accordé pour les CHECK) ;
--   · private.reput_astreinte (reprise de c3_22) : au délai, un appel « a_appeler » ou « en_cours » (pris par l'ouvrier
--     sans nouvelle de Twilio) devient « non_passe » : journal reput.astreinte_non_passee, ALERTE critique au gérant
--     (« L'appel d'astreinte n'a pas pu partir… appelez la garde vous-même », une fois par demande), PAS d'escalade ni
--     d'épuisement. Seuls « sonne » sans prise, « echec » et « sans_reponse » rapportés escaladent, comme avant ;
--   · public.reput_appels_a_passer : reprend aussi les « non_passe » (l'ouvrier revenu, l'appel part) ;
--   · la tâche SQL (job reput-astreinte) et l'ouvrier Edge (omega-reput-astreinte) ne s'écrasent pas : la tâche ne
--     change un appel que s'il est encore dans l'état lu (même essai) ; l'ouvrier prend les appels « for update skip
--     locked » ;
--   · reput_prendre_urgence, reput_appel_issue : un « non_passe » se clôt avec les autres quand l'urgence est prise ;
--   · vue reput_astreinte_suivi (reprise de c3_38) : « Appel non passé (aucun téléphone n'a sonné) : gérant alerté… ».
--
-- Règles de pose : drop/add d'une contrainte CHECK (élargie), create or replace ; ni DROP de table ni DELETE.

do $do$ begin
  if not exists (select 1 from pg_constraint where conname = 'reput_appels_statut_check'
                 and pg_get_constraintdef(oid) like '%non_passe%') then
    alter table public.reput_appels drop constraint if exists reput_appels_statut_check;
    alter table public.reput_appels add constraint reput_appels_statut_check
      check (statut in ('a_appeler', 'en_cours', 'sonne', 'pris', 'sans_reponse', 'echec', 'clos', 'sans_garde', 'non_passe'));
  end if;
end $do$;

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

create or replace function public.reput_appels_a_passer(p_nombre integer default 10, p_maintenant timestamptz default now())
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v jsonb;
begin
  if not private.reput_est_serveur() then
    raise exception 'Réservé au serveur d''Omega.' using errcode = '42501';
  end if;
  with pris as (
    select y.id from public.reput_appels y
    where y.statut in ('a_appeler', 'non_passe')   -- c3_39 : un appel non passé est retenté
    order by y.cree_le
    limit greatest(1, least(coalesce(p_nombre, 10), 50))
    for update skip locked
  ), maj as (
    update public.reput_appels y set statut = 'en_cours', essai_le = p_maintenant
    from pris where y.id = pris.id
    returning y.*
  )
  select coalesce(jsonb_agg(jsonb_build_object('appel', m.id, 'telephone', g.telephone, 'rang', m.rang,
                                               'organisation', coalesce(e.nom, c.nom)) order by m.cree_le), '[]'::jsonb)
    into v
  from maj m
  join public.reput_gardes g on g.id = m.garde_id
  join public.clients c on c.id = m.client_id
  left join public.entites e on e.client_id = m.client_id and e.id = m.entite_id;
  return v;
end $function$;

create or replace function public.reput_prendre_urgence(p_demande uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare d public.reput_demandes := private.reput_demande_traitee_par(p_demande);
begin
  if not d.urgence then
    raise exception 'Cette demande n''est pas une urgence.' using errcode = '22023';
  end if;
  if d.urgence_prise_le is not null then
    return jsonb_build_object('demande', d.id, 'prise', false, 'deja_par', d.urgence_prise_par);
  end if;
  update public.reput_demandes x set urgence_prise_le = now(), urgence_prise_par = (select auth.uid()), maj_le = now() where x.id = d.id;
  update public.reput_appels y set statut = 'clos', issue_le = now()
  where y.demande_id = d.id and y.statut in ('a_appeler', 'en_cours', 'sonne', 'non_passe');
  perform private.journaliser_module(d.client_id, 'reput', 'reput.urgence_prise', 'reput_demandes', d.id::text,
    jsonb_build_object('par', (select auth.uid()), 'depuis', 'espace'), d.entite_id);
  return jsonb_build_object('demande', d.id, 'prise', true);
end $function$;

create or replace function public.reput_appel_issue(p_appel uuid, p_issue text, p_reference text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare a public.reput_appels;
begin
  if not private.reput_est_serveur() then
    raise exception 'Réservé au serveur d''Omega.' using errcode = '42501';
  end if;
  if p_issue not in ('sonne', 'pris', 'sans_reponse', 'echec') then
    raise exception 'Issue d''appel inconnue : %.', p_issue using errcode = '22023';
  end if;
  select * into a from public.reput_appels y where y.id = p_appel for update;
  if a.id is null then
    raise exception 'Appel introuvable.' using errcode = 'P0002';
  end if;
  if a.statut in ('pris', 'clos', 'sans_reponse', 'echec') then
    return jsonb_build_object('appel', a.id, 'statut', a.statut, 'change', false);
  end if;
  update public.reput_appels y set statut = p_issue, issue_le = now(),
         reference_externe = coalesce(left(p_reference, 120), y.reference_externe)
  where y.id = a.id;
  if p_issue = 'pris' then
    update public.reput_demandes x set urgence_prise_le = now(), urgence_prise_par = a.user_id, maj_le = now()
    where x.id = a.demande_id and x.urgence_prise_le is null;
    update public.reput_appels y set statut = 'clos', issue_le = now()
    where y.demande_id = a.demande_id and y.id <> a.id and y.statut in ('a_appeler', 'en_cours', 'sonne', 'non_passe');
    perform private.journaliser_module(a.client_id, 'reput', 'reput.urgence_prise', 'reput_demandes', a.demande_id::text,
      jsonb_build_object('par', a.user_id, 'appel', a.id, 'rang', a.rang), a.entite_id);
  end if;
  return jsonb_build_object('appel', a.id, 'statut', p_issue, 'change', true);
end $function$;

-- Le suivi (reprise de c3_38) : l'état « non_passe » en clair.
create or replace view public.reput_astreinte_suivi with (security_invoker = true) as
select a.id as appel, a.client_id, a.entite_id, a.demande_id, d.de_nom, d.recu_le as demande_recue_le,
       a.rang, a.user_id as membre, a.statut,
       case a.statut when 'a_appeler' then 'À appeler' when 'en_cours' then 'Appel en cours' when 'sonne' then 'Ça sonne'
                     when 'pris' then 'Pris en charge' when 'sans_reponse' then 'Sans réponse : rang suivant'
                     when 'echec' then 'Appel en échec' when 'clos' then 'Clos (urgence prise)'
                     when 'sans_garde' then 'Aucune garde en cours'
                     when 'non_passe' then 'Appel non passé (aucun téléphone n''a sonné) : gérant alerté, nouvel essai' else a.statut end as etat,
       a.cree_le, a.essai_le, a.issue_le, d.urgence_prise_le, d.astreinte_epuisee_le
from public.reput_appels a
join public.reput_demandes d on d.id = a.demande_id;
