-- 19ax_delegations_francais_fuseau.sql — délégations : refus en phrases françaises, et jours pris dans le fuseau de
-- l'organisation (A5, 21/10/2026, TFILED-09 et TFILED-10).
--
-- TFILED-09. Une délégation sans fin, ou dont la fin ne vient pas après le début, était refusée par les messages
-- techniques de Postgres (not-null de fin, delegations_periode). Ce lot les devance par des phrases en français.
-- TFILED-10. Une délégation saisie en jours (« du 20/10 au 29/10 ») arrivait à minuit UTC : en Guadeloupe, elle
-- s'éteignait le 28/10 à 20 h. Désormais, une borne posée à minuit UTC pile est lue comme un JOUR, dans le fuseau de
-- l'entité de la délégation (sinon de l'entité principale, sinon Europe/Paris) : le début vaut 0 h de ce jour-là, et
-- la fin vaut la fin de ce jour-là (0 h du lendemain), puisque « jusqu'au 29/10 » comprend le 29. Une borne avec une
-- heure précise n'est pas touchée.
--
-- Un déclencheur BEFORE INSERT OR UPDATE OF debut, fin sur public.delegations, nommé pour passer après
-- delegations_preparer. Rien n'est supprimé, aucune ligne existante n'est réécrite. Rejouable.

create or replace function private.delegation_fuseau(p_client uuid, p_entite uuid default null) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select e.fuseau from public.entites e where e.client_id = p_client and e.id = p_entite),
                  (select e.fuseau from public.entites e where e.client_id = p_client and e.principale
                    order by e.cree_le limit 1),
                  'Europe/Paris')
$$;
revoke all on function private.delegation_fuseau(uuid, uuid) from public, anon, authenticated;
grant execute on function private.delegation_fuseau(uuid, uuid) to service_role;

create or replace function private.delegation_bornes() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_fuseau text;
begin
  if new.fin is null then
    raise exception 'Une délégation a toujours une fin : indiquez jusqu''à quel jour elle vaut.' using errcode = '23502';
  end if;
  if new.delegant is not distinct from new.delegataire then
    raise exception 'On ne se délègue pas à soi-même : choisissez une autre personne.' using errcode = '23514';
  end if;
  v_fuseau := private.delegation_fuseau(new.client_id, new.entite_id);
  -- Une borne à minuit UTC pile est un jour : on la lit dans le fuseau de l'organisation.
  if new.debut is not null and (new.debut at time zone 'UTC')::time = '00:00'
     and (tg_op = 'INSERT' or new.debut is distinct from old.debut) then
    new.debut := ((new.debut at time zone 'UTC')::date)::timestamp at time zone v_fuseau;
  end if;
  if (new.fin at time zone 'UTC')::time = '00:00' and (tg_op = 'INSERT' or new.fin is distinct from old.fin) then
    new.fin := (((new.fin at time zone 'UTC')::date) + 1)::timestamp at time zone v_fuseau;
  end if;
  if new.fin <= coalesce(new.debut, now()) then
    raise exception 'La fin de la délégation doit venir après son début (du % au %).',
      to_char(coalesce(new.debut, now()) at time zone v_fuseau, 'DD/MM/YYYY HH24:MI'), to_char(new.fin at time zone v_fuseau, 'DD/MM/YYYY HH24:MI')
      using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function private.delegation_bornes() from public, anon, authenticated;

do $do$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.delegations'::regclass and tgname = 'delegations_zz_bornes') then
    create trigger delegations_zz_bornes before insert or update of debut, fin on public.delegations
      for each row execute function private.delegation_bornes();
  end if;
end $do$;
