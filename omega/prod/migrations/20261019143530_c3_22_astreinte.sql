-- 20261019143530 c3_22_astreinte
-- Source : dépôt : 197ed691 omega/modules/reput/migrations/c3_22_astreinte.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c3_22_astreinte.sql @ 197ed691.
-- ═══ omega/modules/reput/migrations/c3_22_astreinte.sql @ 197ed691
-- c3_22 — REPUT : l'astreinte téléphonique — tour de garde, appel, escalade, prise en charge (session C3, 19/10/2026)
--
-- Chiffrage #8 (« Quand elle est urgente, le téléphone de l'astreinte sonne. ») et #24 (« Transféré : l'astreinte est
-- appelée ») ; lot ajouté par Teo le 19/10. Jusqu'ici une urgence était retenue (jamais envoyée seule, c3_13) et remontait
-- en alerte, sans appel. Désormais, quand l'organisation l'a activée :
--   · public.reput_gardes : le tour de garde — un membre, son numéro (E.164), une période, un RANG (1 appelé d'abord, puis 2…),
--     pour l'organisation ou un site. Portes reput_poser_garde / reput_retirer_garde (gérant, administrateur du périmètre ;
--     le membre de garde doit couvrir le site). Le numéro n'est lu que par le gérant, l'administrateur et le membre lui-même.
--   · public.reput_appels : un appel par demande urgente et par rang. La tâche « reput-astreinte » (chaque minute) lance le
--     rang 1 de la garde en cours pour toute demande urgente non prise (reçue depuis moins de six heures) ; sans prise après
--     le délai réglé (10 min par défaut), ou si l'appel n'aboutit pas, le rang suivant ; tous épuisés → la demande est
--     marquée « astreinte épuisée » et le journal le dit. Sans garde en cours : noté une fois (« sans garde »).
--   · L'APPEL lui-même part de l'ouvrier reput-astreinte (Edge, Twilio) par les portes serveur reput_appels_a_passer et
--     reput_appel_issue ; le message dit seulement « une demande urgente attend chez <organisation> » — ni le client, ni sa
--     question. Appuyer sur 1 = prendre l'urgence.
--   · public.reput_prendre_urgence(p_demande) : une personne qui traite les demandes la prend depuis l'espace ; les appels
--     en attente sont clos.
--   · Réglage : reput_regler_astreinte(p_client, p_actif, p_minutes) — gérant, administrateur, périmètre complet.
-- Aucun envoi au client : l'astreinte est interne. Sur la recette, l'ouvrier n'est branché qu'à un compte Twilio de TEST.
--
-- Règles de pose : alter … if not exists, create … if not exists, create or replace ; ni DROP ni DELETE.

alter table public.reput_reglages add column if not exists astreinte boolean not null default false;
alter table public.reput_reglages add column if not exists astreinte_minutes integer not null default 10;
do $do$ begin
  if not exists (select 1 from pg_constraint where conname = 'reput_reglages_astreinte_minutes_check') then
    alter table public.reput_reglages add constraint reput_reglages_astreinte_minutes_check check (astreinte_minutes between 2 and 60);
  end if;
end $do$;
alter table public.reput_demandes add column if not exists urgence_prise_le timestamptz;
alter table public.reput_demandes add column if not exists urgence_prise_par uuid;
alter table public.reput_demandes add column if not exists astreinte_epuisee_le timestamptz;

create table if not exists public.reput_gardes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  user_id uuid not null,
  telephone text not null,
  du timestamptz not null,
  au timestamptz not null,
  rang integer not null default 1,
  actif boolean not null default true,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  constraint reput_gardes_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint reput_gardes_telephone_check check (telephone ~ '^\+[1-9][0-9]{7,14}$'),
  constraint reput_gardes_periode_check check (du < au),
  constraint reput_gardes_rang_check check (rang between 1 and 5)
);
create index if not exists reput_gardes_en_cours_idx on public.reput_gardes (client_id, entite_id, du, au) where actif;

create table if not exists public.reput_appels (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  demande_id uuid not null references public.reput_demandes(id) on delete cascade,
  garde_id uuid references public.reput_gardes(id) on delete set null,
  user_id uuid,
  rang integer not null,
  statut text not null default 'a_appeler',
  essai_le timestamptz,
  issue_le timestamptz,
  reference_externe text,
  cree_le timestamptz not null default now(),
  constraint reput_appels_un_par_rang unique (demande_id, rang),
  constraint reput_appels_statut_check check (statut in ('a_appeler', 'en_cours', 'sonne', 'pris', 'sans_reponse', 'echec', 'clos', 'sans_garde')),
  constraint reput_appels_rang_check check (rang between 0 and 5),
  constraint reput_appels_ref_check check (reference_externe is null or char_length(reference_externe) <= 120)
);
create index if not exists reput_appels_a_passer_idx on public.reput_appels (cree_le) where statut = 'a_appeler';

alter table public.reput_gardes enable row level security;
alter table public.reput_appels enable row level security;
revoke all on public.reput_gardes, public.reput_appels from authenticated, anon;
grant select on public.reput_gardes, public.reput_appels to authenticated;
grant all on public.reput_gardes, public.reput_appels to service_role;

do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reput_gardes' and policyname = 'dirigeants et membre de garde lisent la garde') then
    create policy "dirigeants et membre de garde lisent la garde" on public.reput_gardes for select to authenticated
      using (client_id in (select private.mes_clients())
             and (user_id = (select auth.uid())
                  or (private.a_un_role(client_id, array['gerant', 'admin']) and private.perimetre_couvre((select auth.uid()), client_id, entite_id))));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reput_appels' and policyname = 'membres lisent les appels de leur perimetre') then
    create policy "membres lisent les appels de leur perimetre" on public.reput_appels for select to authenticated
      using (client_id in (select private.mes_clients()) and private.perimetre_couvre((select auth.uid()), client_id, entite_id));
  end if;
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom)
                 select x from unnest(array['reput_gardes', 'reput_appels']) x
                 where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then
      raise notice 'tables_locataires : %', sqlerrm;
    end;
  end if;
end $do$;

-- ─────────────────────────────────────────────────────────────────────────
-- Régler
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.reput_regler_astreinte(p_client uuid, p_actif boolean, p_minutes integer default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.reput_dirige_planning(p_client, null);
  perform private.reput_installer(p_client, null);
  update public.reput_reglages r set astreinte = coalesce(p_actif, r.astreinte), astreinte_minutes = coalesce(p_minutes, r.astreinte_minutes)
  where r.client_id = p_client and r.entite_id is null;
  perform private.journaliser_module(p_client, 'reput', 'reput.astreinte_reglee', 'clients', p_client::text,
    jsonb_build_object('actif', p_actif, 'minutes', p_minutes, 'par', (select auth.uid())), null);
  return (select jsonb_build_object('astreinte', r.astreinte, 'minutes', r.astreinte_minutes)
          from public.reput_reglages r where r.client_id = p_client and r.entite_id is null);
end $function$;

revoke execute on function public.reput_regler_astreinte(uuid, boolean, integer) from public, anon;
grant execute on function public.reput_regler_astreinte(uuid, boolean, integer) to authenticated, service_role;

create or replace function public.reput_poser_garde(p_client uuid, p_entite uuid, p_membre uuid, p_telephone text,
                                                    p_du timestamptz, p_au timestamptz, p_rang integer default 1)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_id uuid; v_tel text := regexp_replace(coalesce(p_telephone, ''), '[\s.()-]', '', 'g');
begin
  perform private.reput_dirige_planning(p_client, p_entite);
  if not exists (select 1 from public.comptes c where c.client_id = p_client and c.user_id = p_membre and c.role <> 'lecteur')
     or not private.perimetre_couvre(p_membre, p_client, p_entite) then
    raise exception 'Le membre de garde traite les demandes de ce site.' using errcode = '22023';
  end if;
  if v_tel ~ '^0[1-9][0-9]{8}$' then v_tel := '+33' || substr(v_tel, 2); end if;
  insert into public.reput_gardes (client_id, entite_id, user_id, telephone, du, au, rang, cree_par)
  values (p_client, p_entite, p_membre, v_tel, p_du, p_au, coalesce(p_rang, 1), (select auth.uid()))
  returning id into v_id;
  perform private.journaliser_module(p_client, 'reput', 'reput.garde_posee', 'reput_gardes', v_id::text,
    jsonb_build_object('entite', p_entite, 'membre', p_membre, 'du', p_du, 'au', p_au, 'rang', coalesce(p_rang, 1)), p_entite);
  return jsonb_build_object('garde', v_id);
end $function$;

revoke execute on function public.reput_poser_garde(uuid, uuid, uuid, text, timestamptz, timestamptz, integer) from public, anon;
grant execute on function public.reput_poser_garde(uuid, uuid, uuid, text, timestamptz, timestamptz, integer) to authenticated, service_role;

create or replace function public.reput_retirer_garde(p_garde uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare g public.reput_gardes;
begin
  select * into g from public.reput_gardes x where x.id = p_garde for update;
  if g.id is null then
    raise exception 'Garde introuvable.' using errcode = 'P0002';
  end if;
  perform private.reput_dirige_planning(g.client_id, g.entite_id);
  update public.reput_gardes x set actif = false where x.id = g.id;
  perform private.journaliser_module(g.client_id, 'reput', 'reput.garde_retiree', 'reput_gardes', g.id::text,
    jsonb_build_object('par', (select auth.uid())), g.entite_id);
  return jsonb_build_object('garde', g.id, 'actif', false);
end $function$;

revoke execute on function public.reput_retirer_garde(uuid) from public, anon;
grant execute on function public.reput_retirer_garde(uuid) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- La tâche : lancer, escalader, épuiser
-- ─────────────────────────────────────────────────────────────────────────
-- La garde de rang > p_apres en cours pour ce planning (le site d'abord, sinon l'organisation).
create or replace function private.reput_garde_suivante(p_client uuid, p_entite uuid, p_apres integer, p_maintenant timestamptz)
 returns public.reput_gardes
 language sql
 stable security definer
 set search_path to ''
as $function$
  select g.* from public.reput_gardes g
  where g.client_id = p_client and g.actif and g.du <= p_maintenant and g.au > p_maintenant and g.rang > p_apres
    and (g.entite_id is not distinct from p_entite or g.entite_id is null)
    and exists (select 1 from public.comptes c where c.client_id = g.client_id and c.user_id = g.user_id)
  order by g.rang, (g.entite_id is not null) desc, g.cree_le
  limit 1
$function$;

revoke execute on function private.reput_garde_suivante(uuid, uuid, integer, timestamptz) from public, anon, authenticated;

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
    continue when a.statut in ('a_appeler', 'en_cours', 'sonne')
                  and coalesce(a.essai_le, a.cree_le) > p_maintenant - make_interval(mins => d.astreinte_minutes);
    if a.statut in ('a_appeler', 'en_cours', 'sonne') then
      update public.reput_appels y set statut = 'sans_reponse', issue_le = p_maintenant where y.id = a.id;
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
  return jsonb_build_object('lances', v_lances, 'escalades', v_escalades, 'epuisees', v_epuisees);
end $function$;

revoke execute on function private.reput_astreinte(timestamptz) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Les portes de l'ouvrier (serveur seulement)
-- ─────────────────────────────────────────────────────────────────────────
-- Les appels à passer, marqués « en cours » (pris une fois, même par deux ouvriers) : numéro, organisation, appel.
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
    where y.statut = 'a_appeler'
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

revoke execute on function public.reput_appels_a_passer(integer, timestamptz) from public, anon, authenticated;
grant execute on function public.reput_appels_a_passer(integer, timestamptz) to service_role;

-- L'issue d'un appel : sonne (décroché, attend la touche), pris (touche 1), sans_reponse, echec.
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
    where y.demande_id = a.demande_id and y.id <> a.id and y.statut in ('a_appeler', 'en_cours', 'sonne');
    perform private.journaliser_module(a.client_id, 'reput', 'reput.urgence_prise', 'reput_demandes', a.demande_id::text,
      jsonb_build_object('par', a.user_id, 'appel', a.id, 'rang', a.rang), a.entite_id);
  end if;
  return jsonb_build_object('appel', a.id, 'statut', p_issue, 'change', true);
end $function$;

revoke execute on function public.reput_appel_issue(uuid, text, text) from public, anon, authenticated;
grant execute on function public.reput_appel_issue(uuid, text, text) to service_role;

-- Une personne prend l'urgence depuis l'espace : les appels en attente sont clos.
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
  where y.demande_id = d.id and y.statut in ('a_appeler', 'en_cours', 'sonne');
  perform private.journaliser_module(d.client_id, 'reput', 'reput.urgence_prise', 'reput_demandes', d.id::text,
    jsonb_build_object('par', (select auth.uid()), 'depuis', 'espace'), d.entite_id);
  return jsonb_build_object('demande', d.id, 'prise', true);
end $function$;

revoke execute on function public.reput_prendre_urgence(uuid) from public, anon;
grant execute on function public.reput_prendre_urgence(uuid) to authenticated, service_role;

-- La tâche : chaque minute ; rejouable.
select cron.schedule('reput-astreinte', '* * * * *', $cron$select private.reput_astreinte()$cron$);
