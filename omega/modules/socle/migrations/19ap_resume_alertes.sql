-- 19ap_resume_alertes.sql — les alertes de la plateforme ont une destination : un courriel quotidien vers l'opérateur
-- (A5, 11/10/2026, accord du coordinateur ; recette seulement pour l'instant).
--
-- Constat (CHIFFRAGE/production.md, supervision) : les alertes existent en base — public.alertes internes,
-- battements des ouvriers, crons en échec, sauvegardes — mais personne ne les reçoit.
--
-- Ce lot :
--   · private.resume_alertes(depuis) : le résumé à envoyer, en un jsonb :
--       alertes internes « critique » et « attention » non acquittées et pas encore envoyées (50 au plus),
--       battements en retard (ouvrier actif silencieux depuis plus que son rythme attendu),
--       crons en échec depuis « depuis » (cron.job_run_details), dernière sauvegarde (private.sauvegardes) ;
--       a_signaler = vrai s'il y a quelque chose à dire (sauvegarde de plus de 26 h comprise) ;
--   · deux portes du service : public.resume_alertes_du_jour() et public.marquer_alertes_envoyees(ids) ;
--   · le courriel lui-même part par la fonction Edge alertes-quotidiennes (omega/functions/alertes-quotidiennes),
--     appelée chaque matin par un cron (à poser par le coordinateur, SQL dans le README de la fonction).
-- Rien n'est supprimé. Idempotent : rejouable sans effet.

create or replace function private.resume_alertes(p_depuis timestamptz default now() - interval '1 day') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_alertes jsonb;
  v_nb_alertes bigint;
  v_battements jsonb;
  v_crons jsonb := '[]'::jsonb;
  v_sauvegarde jsonb := null;
  v_sauvegarde_en_retard boolean := false;
begin
  select count(*) into v_nb_alertes
  from public.alertes a
  where a.interne and a.acquittee_le is null and a.envoyee_le is null and a.niveau in ('critique', 'attention');

  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'niveau', x.niveau, 'source', x.source, 'titre', x.titre,
                                               'client_id', x.client_id, 'cree_le', x.cree_le)
                            order by (x.niveau = 'critique') desc, x.cree_le), '[]'::jsonb)
    into v_alertes
  from (select a.* from public.alertes a
        where a.interne and a.acquittee_le is null and a.envoyee_le is null and a.niveau in ('critique', 'attention')
        order by (a.niveau = 'critique') desc, a.cree_le limit 50) x;

  select coalesce(jsonb_agg(jsonb_build_object('client_id', b.client_id, 'module', b.module, 'dernier_le', b.dernier_le,
                                               'attendu_toutes', b.attendu_toutes::text) order by b.dernier_le), '[]'::jsonb)
    into v_battements
  from (select * from public.battements b
        where b.actif and b.dernier_le < now() - b.attendu_toutes order by b.dernier_le limit 50) b;

  if to_regclass('cron.job_run_details') is not null then
    execute $q$
      select coalesce(jsonb_agg(jsonb_build_object('tache', t.jobname, 'echecs', t.n, 'dernier_le', t.dernier,
                                                   'message', t.message) order by t.n desc), '[]'::jsonb)
      from (select j.jobname, count(*) as n, max(d.start_time) as dernier,
                   left((array_agg(d.return_message order by d.start_time desc))[1], 200) as message
            from cron.job_run_details d join cron.job j on j.jobid = d.jobid
            where d.start_time > $1 and d.status <> 'succeeded'
            group by j.jobname) t
    $q$ into v_crons using p_depuis;
  end if;

  if to_regclass('private.sauvegardes') is not null then
    execute $q$
      select jsonb_build_object('faite_le', s.faite_le, 'restauration', s.restauration)
      from private.sauvegardes s order by s.faite_le desc limit 1
    $q$ into v_sauvegarde;
    v_sauvegarde_en_retard := v_sauvegarde is null
      or (v_sauvegarde ->> 'faite_le')::timestamptz < now() - interval '26 hours'
      or v_sauvegarde ->> 'restauration' is distinct from 'reussie';
  end if;

  return jsonb_build_object(
    'calcule_le', now(),
    'depuis', p_depuis,
    'alertes', v_alertes,
    'alertes_total', v_nb_alertes,
    'battements_en_retard', v_battements,
    'crons_en_echec', v_crons,
    'sauvegarde', v_sauvegarde,
    'sauvegarde_en_retard', v_sauvegarde_en_retard,
    'a_signaler', v_nb_alertes > 0 or jsonb_array_length(v_battements) > 0 or jsonb_array_length(v_crons) > 0
                  or v_sauvegarde_en_retard);
end $$;
revoke all on function private.resume_alertes(timestamptz) from public, anon, authenticated;
grant execute on function private.resume_alertes(timestamptz) to service_role;

-- Portes du service (PostgREST n'expose pas private), comme au lot 17.
create or replace function public.resume_alertes_du_jour() returns jsonb
language sql set search_path = '' as $$ select private.resume_alertes(now() - interval '1 day') $$;

-- Les identifiants arrivent en texte : la porte ne dépend pas du type de public.alertes.id.
create or replace function public.marquer_alertes_envoyees(p_ids text[]) returns integer
language sql security definer set search_path = '' as $$
  with m as (update public.alertes set envoyee_le = now()
             where id::text = any (coalesce(p_ids, '{}')) and interne and envoyee_le is null returning 1)
  select count(*)::integer from m
$$;

do $$ declare f text; begin
  foreach f in array array['public.resume_alertes_du_jour()', 'public.marquer_alertes_envoyees(text[])'] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;
