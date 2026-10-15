-- b2_13 — Les transferts entre agences (modules 11 et 16 ; session B2, 11/10/2026).
-- Les promesses : « Tavaro organise les transferts entre agences avant le pic de demande, en une seule tournée, selon les
-- réservations de chaque site. » ; « Chaque véhicule chez le carrossier garde une date de retour. Si cette date manque ou
-- tombe après le pic, Tavaro propose des transferts. »
--
-- LE CALCUL (public.loc_proposer_transferts) : pour chaque jour des sept prochains, chaque agence et chaque catégorie,
--   demande = réservations (option, confirmée) qui partent ce jour-là de l'agence ;
--   offre   = véhicules de la catégorie qui seront dans l'agence ce matin-là (dernier retour, ou dernier transfert fait,
--             sinon l'agence du véhicule) et libres toute la journée (aucun contrat, réservation affectée ou immobilisation :
--             un véhicule chez le carrossier sans date de retour, ou revenant après, ne compte pas) ;
--   le pic = le jour où le manque total est le plus grand (ou le jour demandé). Pour chaque manque, Tavaro prend un véhicule
--   de la même catégorie dans une agence en surplus ce jour-là, libre jusqu'au pic, et propose son transfert la veille ;
--   les transferts d'une même agence vers une même agence forment une tournée. La direction ou un valideur valide la
--   tournée, l'agence marque le transfert fait : la position du véhicule suit.
-- Rien n'est effacé ni remplacé ; le logiciel de réservation n'est pas touché (Tavaro ne réaffecte pas les réservations).

create table if not exists public.loc_transferts (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  vehicule_id uuid not null,
  categorie_id uuid,
  origine_entite_id uuid not null,
  destination_entite_id uuid not null,
  pour_le timestamp with time zone not null,
  jour_pic date not null,
  tournee text not null,
  statut text not null default 'propose',
  motif jsonb not null default '{}'::jsonb,
  propose_par uuid,
  propose_le timestamp with time zone not null default now(),
  decide_par uuid,
  decide_le timestamp with time zone,
  fait_le timestamp with time zone,
  fait_par uuid,
  convoyeur text,
  maj_le timestamp with time zone not null default now(),
  constraint loc_transferts_pkey primary key (id),
  constraint loc_transferts_client_id_id_key unique (client_id, id),
  constraint loc_transferts_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_transferts_vehicule_fkey foreign key (client_id, vehicule_id) references public.loc_vehicules(client_id, id),
  constraint loc_transferts_origine_fkey foreign key (client_id, origine_entite_id) references public.entites(client_id, id),
  constraint loc_transferts_destination_fkey foreign key (client_id, destination_entite_id) references public.entites(client_id, id),
  constraint loc_transferts_sens check (origine_entite_id <> destination_entite_id),
  constraint loc_transferts_statut_check check (statut in ('propose', 'valide', 'refuse', 'fait', 'annule')),
  constraint loc_transferts_fait check ((statut = 'fait') = (fait_le is not null)),
  constraint loc_transferts_textes check (char_length(tournee) <= 200 and char_length(convoyeur) <= 120)
);
comment on table public.loc_transferts is 'b2_13 : transferts de véhicules entre agences proposés avant le pic, validés, faits';
create unique index if not exists loc_transferts_un_ouvert on public.loc_transferts (client_id, vehicule_id) where statut in ('propose', 'valide');

alter table public.loc_transferts enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_transferts' and policyname = 'on voit les transferts de ses agences') then
    create policy "on voit les transferts de ses agences" on public.loc_transferts for select to authenticated
      using (client_id in (select private.mes_clients())
             and (private.voit_entite(client_id, origine_entite_id) or private.voit_entite(client_id, destination_entite_id)));
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'loc_transferts_toucher' and tgrelid = 'public.loc_transferts'::regclass) then
    create trigger loc_transferts_toucher before update on public.loc_transferts for each row execute function private.loc_toucher();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'loc_transferts_tracer' and tgrelid = 'public.loc_transferts'::regclass) then
    create trigger loc_transferts_tracer after insert or update on public.loc_transferts for each row execute function private.tracer('maj_le');
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'loc_transferts') then
    alter publication supabase_realtime add table public.loc_transferts;
  end if;
end $$;
revoke all on table public.loc_transferts from public, anon, authenticated;
grant select on table public.loc_transferts to authenticated;
grant all on table public.loc_transferts to service_role;

-- Où est le véhicule à un instant : le dernier événement de position avant cet instant (retour d'un contrat à son agence
-- de retour, transfert fait), sinon l'agence du véhicule.
CREATE OR REPLACE FUNCTION private.loc_position_vehicule(p_client uuid, p_vehicule uuid, p_au timestamp with time zone)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(
    (select z.entite from (
       select coalesce(c.entite_retour_id, c.entite_id) as entite, coalesce(c.retour_reel_le, c.retour_prevu_le) as le
       from public.loc_contrats c
       where c.client_id = p_client and c.vehicule_id = p_vehicule and c.statut <> 'annule' and c.disparu_le is null
         and coalesce(c.retour_reel_le, c.retour_prevu_le) <= p_au
       union all
       select t.destination_entite_id, t.fait_le from public.loc_transferts t
       where t.client_id = p_client and t.vehicule_id = p_vehicule and t.statut = 'fait' and t.fait_le <= p_au
       union all
       -- un transfert validé est compté comme fait à son heure prévue (on planifie le pic après lui)
       select t.destination_entite_id, t.pour_le from public.loc_transferts t
       where t.client_id = p_client and t.vehicule_id = p_vehicule and t.statut = 'valide' and t.pour_le <= p_au
     ) z order by z.le desc limit 1),
    (select v.entite_id from public.loc_vehicules v where v.client_id = p_client and v.id = p_vehicule))
$function$;

-- Le tableau d'un jour : par agence et catégorie, la demande, l'offre et les véhicules libres.
CREATE OR REPLACE FUNCTION private.loc_tableau_jour(p_client uuid, p_jour date, p_fuseau text)
 RETURNS TABLE(entite_id uuid, categorie_id uuid, demande integer, offre integer, libres uuid[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with bornes as (
    select ((p_jour::timestamp + time '07:00') at time zone p_fuseau) as debut, ((p_jour::timestamp + time '21:00') at time zone p_fuseau) as fin
  ),
  dem as (
    select r.entite_id, r.categorie_id, count(*)::int as n
    from public.loc_reservations r, bornes b
    where r.client_id = p_client and r.statut in ('option', 'confirmee') and r.disparue_le is null and r.categorie_id is not null
      and r.vehicule_id is null  -- une réservation déjà affectée a son véhicule, compté hors de l'offre
      and r.depart_prevu_le >= b.debut - interval '7 hours' and r.depart_prevu_le < b.fin + interval '3 hours'
    group by 1, 2
  ),
  lib as (
    select private.loc_position_vehicule(p_client, v.id, b.debut) as entite_id, v.categorie_id, v.id
    from public.loc_vehicules v, bornes b
    where v.client_id = p_client and v.statut = 'actif' and v.disparu_le is null and v.categorie_id is not null
      and not exists (select 1 from private.loc_occupations(p_client, v.id) o where o.debut < b.fin and o.fin > b.debut)
  ),
  offres as (
    select l.entite_id, l.categorie_id, count(*)::int as n, array_agg(l.id order by l.id) as ids from lib l where l.entite_id is not null group by 1, 2
  )
  select coalesce(d.entite_id, o.entite_id), coalesce(d.categorie_id, o.categorie_id), coalesce(d.n, 0), coalesce(o.n, 0), coalesce(o.ids, '{}')
  from dem d full join offres o on o.entite_id = d.entite_id and o.categorie_id = d.categorie_id
$function$;

-- Proposer les transferts du prochain pic (ou du jour demandé). Les propositions encore ouvertes pour ce pic sont
-- remplacées ; celles validées restent (elles comptent déjà dans la position des véhicules).
CREATE OR REPLACE FUNCTION public.loc_proposer_transferts(p_jour date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur'], 'Les transferts se proposent par la direction ou un valideur.');
  v_fuseau text;
  v_jour date;
  v_pic date;
  v_manque integer;
  v_max integer := -1;
  d record;
  s record;
  v_besoin integer;
  v_pris integer;
  v_vehicule uuid;
  v_pour timestamptz;
  v_n integer := 0;
  v_tournees jsonb := '{}'::jsonb;
  v_cle text;
  v_immo jsonb;
  v_pris_ids uuid[] := '{}';
begin
  select coalesce(e.fuseau, 'Europe/Paris') into v_fuseau from public.entites e where e.client_id = v_client order by e.principale desc nulls last limit 1;
  v_fuseau := coalesce(v_fuseau, 'Europe/Paris');
  if p_jour is not null then
    v_pic := p_jour;
  else
    for i in 1..7 loop
      v_jour := (now() at time zone v_fuseau)::date + i;
      select coalesce(sum(greatest(t.demande - t.offre, 0)), 0) into v_manque from private.loc_tableau_jour(v_client, v_jour, v_fuseau) t;
      if v_manque > v_max then
        v_max := v_manque;
        v_pic := v_jour;
      end if;
    end loop;
  end if;
  update public.loc_transferts set statut = 'annule' where client_id = v_client and jour_pic = v_pic and statut = 'propose';
  v_pour := ((v_pic - 1)::timestamp + time '18:00') at time zone v_fuseau;

  for d in
    select t.entite_id, t.categorie_id, t.demande - t.offre as manque from private.loc_tableau_jour(v_client, v_pic, v_fuseau) t
    where t.demande > t.offre order by t.demande - t.offre desc
  loop
    v_besoin := d.manque;
    for s in
      select t.entite_id, t.offre - t.demande as surplus, t.libres from private.loc_tableau_jour(v_client, v_pic, v_fuseau) t
      where t.categorie_id = d.categorie_id and t.offre > t.demande and t.entite_id <> d.entite_id order by t.offre - t.demande desc
    loop
      exit when v_besoin <= 0;
      -- ce que cette agence a déjà cédé pour un autre manque de la même catégorie
      v_pris := (select count(*)::int from unnest(s.libres) x where x = any (v_pris_ids));
      foreach v_vehicule in array s.libres loop
        exit when v_besoin <= 0 or v_pris >= s.surplus;
        continue when v_vehicule = any (v_pris_ids)
          or exists (select 1 from public.loc_transferts x where x.client_id = v_client and x.vehicule_id = v_vehicule and x.statut in ('propose', 'valide'))
          -- libre de maintenant jusqu'au pic : il peut rouler la veille
          or exists (select 1 from private.loc_occupations(v_client, v_vehicule) o where o.debut < v_pour + interval '3 hours' and o.fin > now());
        v_cle := (select coalesce(x.nom, '?') from public.entites x where x.id = s.entite_id) || ' → '
                 || (select coalesce(x.nom, '?') from public.entites x where x.id = d.entite_id) || ' · ' || to_char(v_pic, 'DD/MM');
        select coalesce(jsonb_agg(jsonb_build_object('vehicule', v.immatriculation, 'motif', i.motif, 'retour_prevu', i.fin_prevue_le)), '[]'::jsonb) into v_immo
        from public.loc_immobilisations i join public.loc_vehicules v on v.id = i.vehicule_id
        where i.client_id = v_client and i.fin_le is null and i.motif <> 'preparation' and v.categorie_id = d.categorie_id
          and coalesce(private.loc_position_vehicule(v_client, v.id, now()), v.entite_id) = d.entite_id
          and coalesce(i.fin_prevue_le, 'infinity'::timestamptz) > ((v_pic::timestamp + time '07:00') at time zone v_fuseau);
        insert into public.loc_transferts (client_id, vehicule_id, categorie_id, origine_entite_id, destination_entite_id, pour_le, jour_pic, tournee, motif, propose_par)
        values (v_client, v_vehicule, d.categorie_id, s.entite_id, d.entite_id, v_pour, v_pic, left(v_cle, 200),
                jsonb_build_object('manque', d.manque, 'surplus', s.surplus, 'immobilises_a_destination', v_immo), (select auth.uid()));
        v_pris_ids := array_append(v_pris_ids, v_vehicule);
        v_tournees := v_tournees || jsonb_build_object(v_cle, coalesce((v_tournees ->> v_cle)::int, 0) + 1);
        v_pris := v_pris + 1;
        v_besoin := v_besoin - 1;
        v_n := v_n + 1;
      end loop;
    end loop;
  end loop;
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.transferts_proposes', 'loc_transferts', v_pic::text,
    jsonb_build_object('pic', v_pic, 'transferts', v_n, 'tournees', v_tournees, 'par', (select auth.uid())), null);
  return jsonb_build_object('pic', v_pic, 'manque', greatest(v_max, 0), 'transferts', v_n, 'tournees', v_tournees);
end $function$;

-- Valider ou refuser une tournée entière (ou un transfert, p_tournee null).
CREATE OR REPLACE FUNCTION public.loc_decider_transferts(p_tournee text, p_valider boolean, p_transfert uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur'], 'Les transferts se valident par la direction ou un valideur.');
  v_n integer;
begin
  if p_valider is null or (p_tournee is null and p_transfert is null) then
    raise exception 'Une tournée ou un transfert, valider ou refuser.' using errcode = '22023';
  end if;
  update public.loc_transferts
     set statut = case when p_valider then 'valide' else 'refuse' end, decide_par = (select auth.uid()), decide_le = now()
   where client_id = v_client and statut = 'propose' and (tournee = p_tournee or id = p_transfert);
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Rien à décider : la tournée n''a plus de transfert proposé.' using errcode = 'P0002';
  end if;
  perform private.journaliser_module(v_client, 'tavaro', case when p_valider then 'tavaro.transferts_valides' else 'tavaro.transferts_refuses' end,
    'loc_transferts', coalesce(p_transfert::text, p_tournee), jsonb_build_object('tournee', p_tournee, 'transferts', v_n, 'par', (select auth.uid())), null);
  return jsonb_build_object('transferts', v_n, 'statut', case when p_valider then 'valide' else 'refuse' end);
end $function$;

-- Le véhicule est arrivé : sa position suit.
CREATE OR REPLACE FUNCTION public.loc_transfert_fait(p_transfert uuid, p_convoyeur text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'Un transfert se clôt par l''agence.');
  t public.loc_transferts;
begin
  select * into t from public.loc_transferts where client_id = v_client and id = p_transfert for update;
  if not found or not (private.voit_entite(v_client, t.origine_entite_id) or private.voit_entite(v_client, t.destination_entite_id)) then
    raise exception 'Transfert introuvable.' using errcode = 'P0002';
  end if;
  if t.statut <> 'valide' then
    raise exception 'Un transfert se fait une fois validé (statut : %).', t.statut using errcode = '23514';
  end if;
  update public.loc_transferts set statut = 'fait', fait_le = now(), fait_par = (select auth.uid()), convoyeur = left(nullif(btrim(p_convoyeur), ''), 120)
   where id = t.id;
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.transfert_fait', 'loc_transferts', t.id::text,
    jsonb_build_object('vehicule', t.vehicule_id, 'vers', t.destination_entite_id, 'par', (select auth.uid())), t.destination_entite_id);
  return jsonb_build_object('transfert', t.id, 'statut', 'fait');
end $function$;

revoke all on function private.loc_position_vehicule(uuid, uuid, timestamp with time zone) from public, anon, authenticated;
revoke all on function private.loc_tableau_jour(uuid, date, text) from public, anon, authenticated;
grant execute on function private.loc_position_vehicule(uuid, uuid, timestamp with time zone) to service_role;
revoke all on function public.loc_proposer_transferts(date) from public, anon;
revoke all on function public.loc_decider_transferts(text, boolean, uuid) from public, anon;
revoke all on function public.loc_transfert_fait(uuid, text) from public, anon;
grant execute on function public.loc_proposer_transferts(date) to authenticated, service_role;
grant execute on function public.loc_decider_transferts(text, boolean, uuid) to authenticated, service_role;
grant execute on function public.loc_transfert_fait(uuid, text) to authenticated, service_role;
