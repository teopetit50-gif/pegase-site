-- b3t_02 — Contrats à risque (renfort B3 sur Tavaro, 06/10/2026).
--
-- CE QUE ÇA CORRIGE : la page /secteurs/location promet, module n° 09 « Contrats à risque » : « Chaque contrat reçoit
-- un score établi à partir du conducteur, de l'historique et de la sinistralité ; la pièce d'identité et le permis
-- sont contrôlés. » Aucun score n'existait, et rien ne gardait trace du contrôle des pièces au comptoir.
--
-- CE QUE ÇA POSE :
--   · table public.loc_controles_conducteur : le contrôle des pièces d'un contrat, un par contrat (le dernier
--     remplace le précédent) : pièce d'identité et permis « conforme » ou « non conforme », permis de moins de trois
--     ans (oui / non / inconnu), qui et quand. Minimisation : ni numéro, ni date de naissance, ni date du permis,
--     ni photo. Le contrôle suit son contrat (on delete cascade). Lecture par qui voit l'agence du contrat ;
--     écriture par la porte ;
--   · public.loc_noter_controle_conducteur(p_contrat, p_identite, p_permis, p_permis_recent) → uuid : gérant,
--     admin, valideur, collaborateur de l'agence du contrat ; journal « tavaro.controle_conducteur_note » ;
--   · public.loc_contrats_a_risque(p_client, p_entite = null) → jsonb : chaque contrat ouvert (ou parti dans les
--     dernières 24 h) reçoit un score à règles, chaque point avec sa raison :
--       conducteur    +3 pièce d'identité ou permis non conforme ; +2 permis de moins de trois ans ;
--                     +1 pièces pas encore contrôlées ;
--       historique    +1 nouveau client ; +2 déjà rendu un véhicule en retard (plus d'une heure) ;
--                     +3 facture échue impayée ou en litige ;
--       sinistralité  +2 une facture de dommages par le passé, +3 deux ou plus.
--     « Fort » à partir de 4, « moyen » à 2 ; en dessous, le contrat n'est pas listé. L'action dit quoi faire :
--     contrôler les pièces, demander un dépôt, appeler le client avant le retour.
-- Idempotent : if not exists, create or replace, politique s'il manque, grant.

create table if not exists public.loc_controles_conducteur (
  id uuid not null default gen_random_uuid() primary key,
  client_id uuid not null,
  entite_id uuid not null,
  contrat_id uuid not null,
  identite text not null check (identite in ('conforme', 'non_conforme')),
  permis text not null check (permis in ('conforme', 'non_conforme')),
  permis_recent boolean,
  controle_par uuid,
  controle_le timestamp with time zone not null default clock_timestamp(),
  constraint loc_controles_conducteur_un_par_contrat unique (client_id, contrat_id),
  constraint loc_controles_conducteur_contrat_fkey foreign key (client_id, contrat_id)
    references public.loc_contrats (client_id, id) on delete cascade
);
alter table public.loc_controles_conducteur enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_controles_conducteur'
                 and policyname = 'on voit les controles de son agence') then
    create policy "on voit les controles de son agence" on public.loc_controles_conducteur for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $$;
revoke all on table public.loc_controles_conducteur from public, anon, authenticated;
grant select on table public.loc_controles_conducteur to authenticated;
grant all on table public.loc_controles_conducteur to service_role;

create or replace function public.loc_noter_controle_conducteur(p_contrat uuid, p_identite text, p_permis text, p_permis_recent boolean default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.loc_contrats;
  v_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Ce geste se fait par une personne connectée.' using errcode = '42501';
  end if;
  select * into c from public.loc_contrats where id = p_contrat;
  if not found or not exists (select 1 from public.comptes k where k.user_id = (select auth.uid()) and k.client_id = c.client_id) then
    raise exception 'Contrat introuvable.' using errcode = 'P0002';
  end if;
  if not private.a_un_role(c.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'])
     or not private.voit_entite(c.client_id, c.entite_id) then
    raise exception 'Ce contrat n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  if p_identite is null or p_identite not in ('conforme', 'non_conforme') or p_permis is null or p_permis not in ('conforme', 'non_conforme') then
    raise exception 'La pièce d''identité et le permis sont « conforme » ou « non_conforme ».' using errcode = '22023';
  end if;
  insert into public.loc_controles_conducteur (client_id, entite_id, contrat_id, identite, permis, permis_recent, controle_par, controle_le)
  values (c.client_id, c.entite_id, c.id, p_identite, p_permis, p_permis_recent, (select auth.uid()), clock_timestamp())
  on conflict (client_id, contrat_id) do update
    set identite = excluded.identite, permis = excluded.permis, permis_recent = excluded.permis_recent,
        controle_par = excluded.controle_par, controle_le = excluded.controle_le
  returning id into v_id;
  perform private.journaliser_module(c.client_id, 'tavaro', 'tavaro.controle_conducteur_note', 'loc_contrats', c.id::text,
    jsonb_build_object('identite', p_identite, 'permis', p_permis, 'permis_recent', p_permis_recent), c.entite_id);
  return v_id;
end $function$;

create or replace function private.loc_contrats_a_risque_lire(p_client uuid, p_entite uuid default null,
                                                               p_maintenant timestamp with time zone default now(), p_regarder boolean default true)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_res jsonb;
begin
  with ouverts as (
    select c.*, l as loc, l.id as loc_id
    from public.loc_contrats c
    left join public.loc_locataires l on l.client_id = c.client_id and l.id = c.locataire_id
    where c.client_id = p_client and c.disparu_le is null and c.statut = 'ouvert'
      and (c.retour_reel_le is null or c.depart_le >= p_maintenant - interval '24 hours')
      and (p_entite is null or c.entite_id = p_entite) and (not p_regarder or private.voit_entite(p_client, c.entite_id))
  ),
  faits as (
    select o.*, k as ctl, k.id as ctl_id,
           (k.identite = 'non_conforme' or k.permis = 'non_conforme') as pieces_ko,
           coalesce(k.permis_recent, false) as permis_recent,
           (k.id is null) as pieces_a_controler,
           (o.loc_id is null or not exists (select 1 from public.loc_contrats h where h.client_id = p_client and h.locataire_id = o.loc_id
                                              and h.id <> o.id and h.disparu_le is null and h.statut <> 'annule' and h.depart_le < o.depart_le)) as nouveau,
           (o.loc_id is not null and exists (select 1 from public.loc_contrats h where h.client_id = p_client and h.locataire_id = o.loc_id
                                              and h.id <> o.id and h.disparu_le is null and h.retour_reel_le > h.retour_prevu_le + interval '1 hour')) as retard,
           (o.loc_id is not null and exists (select 1 from public.loc_factures f join public.loc_contrats h on h.client_id = f.client_id and h.id = f.contrat_id
                                              where f.client_id = p_client and h.locataire_id = o.loc_id
                                                and (f.statut = 'litige' or (f.statut in ('emise', 'envoyee') and f.echeance_le < p_maintenant::date)))) as impaye,
           (select count(*) from public.loc_factures f join public.loc_contrats h on h.client_id = f.client_id and h.id = f.contrat_id
             where f.client_id = p_client and o.loc_id is not null and h.locataire_id = o.loc_id and h.id <> o.id
               and f.nature = 'dommages' and f.statut <> 'avoir')::integer as sinistres
    from ouverts o
    left join public.loc_controles_conducteur k on k.client_id = o.client_id and k.contrat_id = o.id
  ),
  notes as (
    select f.*,
           (case when f.pieces_ko then 3 else 0 end + case when f.permis_recent then 2 else 0 end + case when f.pieces_a_controler then 1 else 0 end
            + case when f.nouveau then 1 else 0 end + case when f.retard then 2 else 0 end + case when f.impaye then 3 else 0 end
            + case when f.sinistres >= 2 then 3 when f.sinistres = 1 then 2 else 0 end) as score,
           array_remove(array[
             case when f.pieces_ko then 'pièce d''identité ou permis non conforme' end,
             case when f.permis_recent then 'permis de moins de trois ans' end,
             case when f.pieces_a_controler then 'pièces pas encore contrôlées' end,
             case when f.nouveau then 'nouveau client' end,
             case when f.retard then 'a déjà rendu un véhicule en retard' end,
             case when f.impaye then 'facture échue impayée ou en litige' end,
             case when f.sinistres >= 2 then format('%s factures de dommages par le passé', f.sinistres)
                  when f.sinistres = 1 then 'une facture de dommages par le passé' end], null) as raisons
    from faits f
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'contrat_id', n.id, 'numero', n.numero, 'depart_le', n.depart_le, 'retour_prevu_le', n.retour_prevu_le, 'entite_id', n.entite_id,
           'agence', (select a.code from public.loc_agences a where a.client_id = p_client and a.entite_id = n.entite_id),
           'client', private.loc_b3t_nom(n.loc),
           'vehicule', (select v.immatriculation from public.loc_vehicules v where v.client_id = p_client and v.id = n.vehicule_id),
           'score', n.score, 'niveau', case when n.score >= 4 then 'fort' else 'moyen' end, 'raisons', to_jsonb(n.raisons),
           'controle', case when n.ctl_id is null then null
                            else jsonb_build_object('identite', (n.ctl).identite, 'permis', (n.ctl).permis, 'permis_recent', (n.ctl).permis_recent,
                                                    'le', (n.ctl).controle_le) end,
           'action', case when n.pieces_a_controler then 'Contrôler la pièce d''identité et le permis'
                          when n.pieces_ko then 'Ne pas remettre les clés sans pièces conformes'
                          when n.impaye then 'Demander le règlement de l''impayé ou un dépôt avant le départ'
                          when n.sinistres >= 1 or n.permis_recent then 'Faire l''état des lieux de départ avec le client, photos à l''appui'
                          else 'Appeler le client la veille du retour' end)
         order by n.score desc, n.depart_le), '[]'::jsonb)
    into v_res
  from notes n
  where n.score >= 2;
  return jsonb_build_object('calcule_le', p_maintenant, 'contrats', v_res,
    'a_risque', (select count(*) from jsonb_array_elements(v_res) e where e ->> 'niveau' = 'fort'));
end $function$;

create or replace function public.loc_contrats_a_risque(p_client uuid, p_entite uuid default null)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  perform private.loc_b3t_regard(p_client, array['gerant', 'admin', 'valideur', 'collaborateur', 'lecteur']);
  return private.loc_contrats_a_risque_lire(p_client, p_entite, now(), true);
end $function$;

revoke all on function public.loc_noter_controle_conducteur(uuid, text, text, boolean) from public, anon;
grant execute on function public.loc_noter_controle_conducteur(uuid, text, text, boolean) to authenticated, service_role;
revoke all on function public.loc_contrats_a_risque(uuid, uuid) from public, anon;
grant execute on function public.loc_contrats_a_risque(uuid, uuid) to authenticated, service_role;
revoke all on function private.loc_contrats_a_risque_lire(uuid, uuid, timestamp with time zone, boolean) from public, anon, authenticated;
grant execute on function private.loc_contrats_a_risque_lire(uuid, uuid, timestamp with time zone, boolean) to service_role;

select 'b3t_02 contrats à risque posés' as resultat;
