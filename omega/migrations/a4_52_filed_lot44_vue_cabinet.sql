-- FILED, lot 44 (a4_52) — l'espace multi-dossiers d'un cabinet : la vue d'ensemble de tous ses dossiers (Teo, 18/10 ;
-- chiffrage n° 33, 34 : « un espace par dossier client », « vue d'ensemble sur tous les dossiers »).
--
-- Un dossier est une organisation du socle ; un cabinet y travaille par les comptes du socle (une personne a un rôle
-- dans chaque organisation qu'elle suit) : les droits restent ceux du socle, FILED n'en crée aucun. FILED donne :
--   · public.filed_vue_ensemble() : une ligne par organisation où la personne a un rôle FILED (gérant, admin,
--     valideur, collaborateur) et où FILED est installé — pièces du mois et quota (a4_50), bloquées, en attente
--     d'approbation, à compléter, en litige, à payer sous 30 jours, en retard, dernière pièce reçue. Chaque chiffre
--     passe par les portes de pilotage existantes, donc par le périmètre de la personne dans ce dossier ;
--   · public.filed_epingler_dossier(organisation, épinglé, rang) : l'ordre et les favoris de la personne
--     (public.filed_dossiers_preferes, à elle seule).
-- La bascule d'un dossier à l'autre est celle de l'application (choix de l'organisation) : rien à poser ici.
-- Migration idempotente ; aucun DROP, aucune suppression ; aucun envoi.

create table if not exists public.filed_dossiers_preferes (
  user_id    uuid not null,
  client_id  uuid not null references public.clients(id) on delete cascade,
  epingle    boolean not null default true,
  rang       integer not null default 100,
  maj_le     timestamptz not null default now(),
  primary key (user_id, client_id)
);
comment on table public.filed_dossiers_preferes is
  'Lot 44 (a4_52) : les dossiers qu''une personne épingle, et leur ordre, dans la vue d''ensemble FILED. À elle seule.';
alter table public.filed_dossiers_preferes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_dossiers_preferes' and policyname = 'filed_dossiers_preferes_soi') then
    create policy filed_dossiers_preferes_soi on public.filed_dossiers_preferes for select to authenticated using (user_id = (select auth.uid()));
  end if;
end $$;
revoke all on table public.filed_dossiers_preferes from anon, authenticated;
grant select on public.filed_dossiers_preferes to authenticated;
grant all on public.filed_dossiers_preferes to service_role;
insert into private.tables_locataires (nom, ordre_effacement, note)
select 'filed_dossiers_preferes', 37, 'FILED, lot 44' where not exists (select 1 from private.tables_locataires where nom = 'filed_dossiers_preferes');

create or replace function private.filed_vue_ensemble()
returns table (client_id uuid, organisation text, role text, epingle boolean, rang integer,
               pieces_mois integer, quota integer, etat_quota text,
               bloquees bigint, attente bigint, a_completer bigint, litiges bigint,
               a_payer_30j numeric, en_retard bigint, dernier_recu_le timestamptz, erreur text)
language plpgsql stable security definer set search_path to '' as $$
declare v_uid uuid := (select auth.uid()); c record; v_q jsonb; v_e record;
begin
  if v_uid is null then return; end if;   -- une vue de personne : le serveur n'en a pas
  for c in
    select k.client_id, cl.nom, k.role, coalesce(p.epingle, false) as epingle, coalesce(p.rang, 100) as rang
      from public.comptes k join public.clients cl on cl.id = k.client_id
      left join public.filed_dossiers_preferes p on p.user_id = v_uid and p.client_id = k.client_id
     where k.user_id = v_uid and k.role in ('gerant', 'admin', 'valideur', 'collaborateur')
       and exists (select 1 from public.filed_reglages g where g.client_id = k.client_id and g.entite_id is null and g.actif)
     order by coalesce(p.epingle, false) desc, coalesce(p.rang, 100), cl.nom
  loop
    client_id := c.client_id; organisation := c.nom; role := c.role; epingle := c.epingle; rang := c.rang;
    pieces_mois := null; quota := null; etat_quota := null; bloquees := 0; attente := 0; a_completer := 0; litiges := 0;
    a_payer_30j := 0; en_retard := 0; dernier_recu_le := null; erreur := null;
    begin
      if c.role in ('gerant', 'admin', 'valideur') then
        v_q := private.filed_compteur(c.client_id, null);
        pieces_mois := (v_q ->> 'pieces')::integer; quota := (v_q ->> 'quota')::integer; etat_quota := v_q ->> 'etat';
      end if;
      for v_e in select * from private.filed_pieces_en_cours(c.client_id, null) loop
        case v_e.categorie
          when 'bloquees' then bloquees := v_e.nombre;
          when 'attente' then attente := v_e.nombre;
          when 'a_completer' then a_completer := v_e.nombre;
          when 'litige' then litiges := v_e.nombre;
          else null;
        end case;
      end loop;
      select coalesce(sum(x.reste_a_payer) filter (where x.echeance <= current_date + 30), 0), count(*) filter (where x.en_retard)
        into a_payer_30j, en_retard
        from private.filed_echeancier(c.client_id, null, null) x;
      select max(d.recu_le) into dernier_recu_le from public.filed_documents d
       where d.client_id = c.client_id and private.perimetre_couvre(v_uid, d.client_id, d.entite_id);
    exception when others then
      erreur := left(sqlerrm, 200);   -- un dossier illisible n'empêche pas la vue des autres
    end;
    return next;
  end loop;
end $$;
revoke all on function private.filed_vue_ensemble() from public, anon;
grant execute on function private.filed_vue_ensemble() to authenticated, service_role;

create or replace function public.filed_vue_ensemble()
returns table (client_id uuid, organisation text, role text, epingle boolean, rang integer,
               pieces_mois integer, quota integer, etat_quota text,
               bloquees bigint, attente bigint, a_completer bigint, litiges bigint,
               a_payer_30j numeric, en_retard bigint, dernier_recu_le timestamptz, erreur text)
language sql stable set search_path to '' as $$ select * from private.filed_vue_ensemble() $$;
comment on function public.filed_vue_ensemble() is
  'Lot 44 (a4_52) : la vue d''ensemble de tous les dossiers (organisations) où la personne a un rôle FILED : pièces du mois et quota, en cours, à payer, retards. Droits et périmètres du socle.';
revoke all on function public.filed_vue_ensemble() from public, anon;
grant execute on function public.filed_vue_ensemble() to authenticated, service_role;

create or replace function private.filed_epingler_dossier(p_client uuid, p_epingle boolean default true, p_rang integer default null)
returns void language plpgsql security definer set search_path to '' as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Une personne épingle ses dossiers.' using errcode = '42501'; end if;
  if not exists (select 1 from public.comptes k where k.user_id = v_uid and k.client_id = p_client) then
    raise exception 'Vous ne suivez pas ce dossier.' using errcode = '42501';
  end if;
  insert into public.filed_dossiers_preferes (user_id, client_id, epingle, rang)
  values (v_uid, p_client, coalesce(p_epingle, true), coalesce(p_rang, 100))
  on conflict (user_id, client_id) do update
    set epingle = excluded.epingle, rang = coalesce(p_rang, public.filed_dossiers_preferes.rang), maj_le = now();
end $$;
revoke all on function private.filed_epingler_dossier(uuid, boolean, integer) from public, anon;
grant execute on function private.filed_epingler_dossier(uuid, boolean, integer) to authenticated, service_role;
create or replace function public.filed_epingler_dossier(p_client uuid, p_epingle boolean default true, p_rang integer default null)
returns void language sql set search_path to '' as $$ select private.filed_epingler_dossier(p_client, p_epingle, p_rang) $$;
comment on function public.filed_epingler_dossier(uuid, boolean, integer) is
  'Lot 44 (a4_52) : épingle (ou non) un dossier et fixe son rang dans la vue d''ensemble de la personne.';
revoke all on function public.filed_epingler_dossier(uuid, boolean, integer) from public, anon;
grant execute on function public.filed_epingler_dossier(uuid, boolean, integer) to authenticated, service_role;
