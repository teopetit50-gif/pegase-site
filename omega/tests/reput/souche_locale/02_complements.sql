-- 02_complements.sql — SOUCHE LOCALE : ce que REPUT appelle du socle et que la souche de B4 n'a pas.
-- Comportements IMITÉS (pas copiés) à partir de omega/SOCLE-EXTRAITS-COMMUN.sql. Jamais sur la recette.
alter table public.comptes_entites add column if not exists cree_le timestamptz default now();
-- journaliser_module à sept arguments (l'entité), comme le socle.
create or replace function private.journaliser_module(p_client uuid, p_module text, p_action text, p_objet_type text, p_objet_id text,
                                                      p_donnees jsonb, p_entite uuid) returns bigint
language plpgsql security definer set search_path to '' as $$
declare v_avant text := current_setting('omega.module', true); v_id bigint;
begin
  if p_action !~ ('^' || p_module || '\.[a-z][a-z0-9_.]{1,79}$') then
    raise exception 'Une action de module commence par son nom : « %.… ».', p_module using errcode = '22023';
  end if;
  perform set_config('omega.module', p_module, true);
  v_id := private.journaliser(p_client, p_action, p_objet_type, p_objet_id, coalesce(p_donnees, '{}'::jsonb), p_entite);
  perform set_config('omega.module', coalesce(v_avant, ''), true);
  return v_id;
end $$;
