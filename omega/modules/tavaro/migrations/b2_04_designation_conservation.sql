-- b2_04 — L'identité désignée d'un avis de contravention ne se garde qu'un an (session B2, 06/10/2026, vague 3).
--
-- DÉCISION DU COORDINATEUR (06/10) : l'identité du conducteur désigné (nom, naissance, adresse, permis) se garde
-- un an après la désignation, puis s'efface ; le reste de l'avis (plaque, heure, montant, statut, mode et référence
-- de la désignation, dates) reste, pour que l'agence prouve qu'elle a désigné à temps.
-- FONDEMENT : article 9 du code de procédure pénale — « l'action publique des contraventions se prescrit par une
-- année révolue à compter du jour où l'infraction a été commise » ; le délai est interrompu par tout acte d'enquête
-- ou de poursuite. Partir de la désignation (toujours postérieure à l'infraction) couvre au moins ce délai.
-- À revérifier sur Légifrance (rédaction issue de la loi n° 2017-242 du 27 février 2017) avant la mise en vente.
--
-- CE QUE ÇA POSE (rien n'est effacé dans le schéma, aucune contrainte retirée) :
--   · loc_avis_contravention.designation_effacee_le : la date de l'effacement ;
--   · private.loc_effacer_designations(maintenant) : remplace `designation` par {type, effacee_le} (la contrainte
--     loc_avis_designe exige une désignation non nulle pour un avis désigné : on garde sa forme, pas son contenu) ;
--     journal tavaro.designations_effacees par loueur (un compte, aucune identité) ;
--   · le cron tavaro-avis-conservation (3 h 25 UTC) ;
--   · loc_avis_contravention dans la publication Realtime (supabase_realtime), si elle existe.

alter table public.loc_avis_contravention add column if not exists designation_effacee_le timestamp with time zone;
comment on column public.loc_avis_contravention.designation_effacee_le is 'b2_04 : identité désignée effacée un an après la désignation (art. 9 CPP)';

CREATE OR REPLACE FUNCTION private.loc_effacer_designations(p_maintenant timestamp with time zone DEFAULT now())
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  n integer := 0;
begin
  for r in
    with effaces as (
      update public.loc_avis_contravention a
         set designation = jsonb_build_object('type', coalesce(a.designation ->> 'type', 'personne'), 'effacee_le', p_maintenant),
             designation_effacee_le = p_maintenant
       where a.statut = 'designe'
         and a.designation_effacee_le is null
         and a.designe_le <= p_maintenant - interval '1 year'
      returning a.client_id
    )
    select e.client_id, count(*)::integer as n from effaces e group by e.client_id
  loop
    perform private.journaliser_module(r.client_id, 'tavaro', 'tavaro.designations_effacees', 'loc_avis_contravention', r.client_id::text,
      jsonb_build_object('nombre', r.n, 'regle', 'un an après la désignation (art. 9 du code de procédure pénale)'), null);
    perform private.battre(r.client_id, 'tavaro_avis_conservation', jsonb_build_object('effaces', r.n), interval '1 day');
    n := n + r.n;
  end loop;
  return n;
end $function$;

revoke all on function private.loc_effacer_designations(timestamp with time zone) from public, anon, authenticated;
grant execute on function private.loc_effacer_designations(timestamp with time zone) to service_role;

do $$ begin
  if not exists (select 1 from cron.job where jobname = 'tavaro-avis-conservation') then
    perform cron.schedule('tavaro-avis-conservation', '25 3 * * *', 'select private.loc_effacer_designations()');
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'loc_avis_contravention') then
    alter publication supabase_realtime add table public.loc_avis_contravention;
  end if;
end $$;
