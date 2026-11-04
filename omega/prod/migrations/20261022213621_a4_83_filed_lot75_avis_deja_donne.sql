-- 20261022213621 a4_83_filed_lot75_avis_deja_donne
-- Source : dépôt : d0b9e9e7e9ebcb9d4618af317d355e85f82374ee omega/migrations/a4_83_filed_lot75_avis_deja_donne.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_83_filed_lot75_avis_deja_donne.sql @ d0b9e9e7e9ebcb9d4618af317d355e85f82374ee.
-- ═══ omega/migrations/a4_83_filed_lot75_avis_deja_donne.sql @ d0b9e9e7e9ebcb9d4618af317d355e85f82374ee
-- a4_83 (FILED lot 75) : une même personne qui redonne son avis sur une demande FILED reçoit un refus clair (TFILED-17).
--
-- TFILED-17 (testeur boîte noire, 22/10/2026) : une personne qui approuve une seconde fois la même demande (une demande
-- à plusieurs approbations, encore en attente) recevait la contrainte brute « duplicate key … approbations_une_par_personne ».
-- Même famille que TFILED-09.
--
--   · Un déclencheur BEFORE INSERT sur public.approbations, limité aux demandes du module FILED, refuse en 22023 :
--     « Vous avez déjà donné votre avis sur cette demande (approuvée / rejetée le …) : il compte déjà. »
--     Il s'appelle approbations_zz_filed_avis_unique pour passer APRÈS approbations_preparer (socle), qui pose user_id ;
--     les autres refus du socle (demande close, demandeur, saisisseur, droits) restent les siens et passent avant.
--   · Le socle (preparer_approbation, la contrainte) n'est pas modifié.
-- Rejouable ; aucune suppression.

create or replace function private.filed_avis_deja_donne()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_avant public.approbations;
begin
  if not exists (select 1 from public.demandes_validation d where d.id = new.demande_id and d.module = 'filed') then
    return new;
  end if;
  select * into v_avant from public.approbations a
   where a.demande_id = new.demande_id and a.user_id = new.user_id
   order by a.decide_le limit 1;
  if v_avant.id is not null then
    raise exception 'Vous avez déjà donné votre avis sur cette demande (% le %) : il compte déjà.',
      case v_avant.decision when 'approuve' then 'approuvée' else 'rejetée' end,
      to_char(v_avant.decide_le at time zone 'Europe/Paris', 'DD/MM/YYYY à HH24:MI')
      using errcode = '22023';
  end if;
  return new;
end $$;
revoke all on function private.filed_avis_deja_donne() from public, anon, authenticated;
grant execute on function private.filed_avis_deja_donne() to service_role;

do $$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.approbations'::regclass and tgname = 'approbations_zz_filed_avis_unique') then
    create trigger approbations_zz_filed_avis_unique before insert on public.approbations
      for each row execute function private.filed_avis_deja_donne();
  end if;
end $$;
