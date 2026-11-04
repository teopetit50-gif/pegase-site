-- 20261023001344 a4_84_filed_lot76_avis_heure_entite
-- Source : dépôt : ddaea6527aca82fca54f169d552043372f3c5a8d omega/migrations/a4_84_filed_lot76_avis_heure_entite.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_84_filed_lot76_avis_heure_entite.sql @ ddaea6527aca82fca54f169d552043372f3c5a8d.
-- ═══ omega/migrations/a4_84_filed_lot76_avis_heure_entite.sql @ ddaea6527aca82fca54f169d552043372f3c5a8d
-- a4_84 (FILED lot 76) : le refus d'un second avis donne l'heure de l'entité, pas celle de Paris (TFILED-27).
--
-- TFILED-27 (testeur boîte noire, 23/10/2026) : « Vous avez déjà donné votre avis sur cette demande (approuvée le
-- JJ/MM/AAAA à HH:MM) » (a4_83) donnait l'heure de Paris, quelle que soit l'entité ; une entité de Guadeloupe lisait
-- une heure décalée de 5 ou 6 heures.
--
--   · L'heure est donnée au fuseau de l'entité de la demande (entites.fuseau), sinon de l'entité principale de
--     l'organisation, sinon Europe/Paris.
-- Redéfinit private.filed_avis_deja_donne (a4_83) en entier ; rejouable ; aucune suppression.

create or replace function private.filed_avis_deja_donne()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_avant public.approbations; v_d public.demandes_validation; v_fuseau text;
begin
  select * into v_d from public.demandes_validation d where d.id = new.demande_id;
  if v_d.id is null or v_d.module is distinct from 'filed' then
    return new;
  end if;
  select * into v_avant from public.approbations a
   where a.demande_id = new.demande_id and a.user_id = new.user_id
   order by a.decide_le limit 1;
  if v_avant.id is not null then
    -- a4_84 : l'heure de l'entité de la demande.
    v_fuseau := coalesce((select e.fuseau from public.entites e where e.id = v_d.entite_id),
                         (select e.fuseau from public.entites e where e.client_id = v_d.client_id and e.principale limit 1),
                         'Europe/Paris');
    raise exception 'Vous avez déjà donné votre avis sur cette demande (% le %) : il compte déjà.',
      case v_avant.decision when 'approuve' then 'approuvée' else 'rejetée' end,
      to_char(v_avant.decide_le at time zone v_fuseau, 'DD/MM/YYYY à HH24:MI')
      using errcode = '22023';
  end if;
  return new;
end $$;
revoke all on function private.filed_avis_deja_donne() from public, anon, authenticated;
grant execute on function private.filed_avis_deja_donne() to service_role;
