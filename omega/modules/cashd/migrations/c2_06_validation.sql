-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_06 : qui valide, selon le montant (11/10/2026, session C2)
-- ═══════════════════════════════════════════════════════════════════════════
-- « Le montant et le palier décident de qui valide : le chargé de compte, le responsable crédit, la direction
-- financière. La mise en demeure exige toujours une validation explicite. » (G11, omega/CHIFFRAGE/cashd.md)
--
-- Jusqu'ici un seul seuil (seuil_direction) faisait monter la relance à la direction. L'organisation règle maintenant
-- jusqu'à trois paliers {montant, rôles} (porte cashd_regler_validation, gérant seulement) ; CASHD les écrit en règles
-- de validation du socle (public.regles_validation, module cashd), que le socle applique à chaque demande : la règle au
-- montant minimal le plus haut que la relance atteint décide des rôles qui peuvent valider. Le socle admet trois rôles de
-- validation (gerant, admin, valideur) : le chargé de compte, le responsable crédit et la direction s'y rangent par le
-- rôle que leur compte porte. Les paliers remplacent le
-- seuil de direction (sa règle est désactivée). Les anciennes règles ne sont jamais supprimées : elles passent inactives.
-- La mise en demeure garde son exigence de commentaire et n'est jamais couverte par un accord permanent (c2_02).
--
-- Règles de pose : alter … add column if not exists / create or replace ; jamais de DROP ni de DELETE ; revoke execute
-- de public sur les fonctions.

alter table public.cashd_reglages add column if not exists paliers_validation jsonb;
alter table public.cashd_reglages add column if not exists regles_paliers uuid[] not null default '{}';

-- Les paliers : [{"montant": 0, "roles": ["valideur", "admin", "gerant"]}, {"montant": 5000, "roles": [...]}, …]
-- — un à trois, montants croissants, le premier à 0 ; rôles parmi gerant, admin, valideur (ceux que le socle admet en
-- validation : contrainte regles_validation_roles_autorises_check). Le chargé de compte valide s'il porte le rôle
-- valideur. Liste vide ou null : plus de paliers (les rôles par défaut du socle reprennent).
create or replace function public.cashd_regler_validation(p_client uuid, p_paliers jsonb)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  g public.cashd_reglages;
  v_uid uuid;
  e record;
  v_ids uuid[] := '{}';
  v_id uuid;
  v_n integer;
begin
  v_uid := private.cashd_exiger_gestion(p_client);
  if v_uid is not null and not private.a_un_role(p_client, array['gerant']) then
    raise exception 'Seul le gérant décide qui valide les relances.' using errcode = '42501';
  end if;
  select * into g from public.cashd_reglages where client_id = p_client for update;
  if not found then
    raise exception 'CASHD n''est pas installé pour cette organisation.' using errcode = '55000';
  end if;
  if p_paliers is not null and jsonb_typeof(p_paliers) <> 'array' then
    raise exception 'Les paliers se donnent en liste.' using errcode = '22023';
  end if;
  v_n := coalesce(jsonb_array_length(p_paliers), 0);
  if v_n > 3 then
    raise exception 'Trois paliers au plus : le chargé de compte, le responsable crédit, la direction.' using errcode = '22023';
  end if;
  if v_n > 0 and exists (
       select 1 from jsonb_array_elements(p_paliers) with ordinality x
       where jsonb_typeof(x.value) <> 'object' or jsonb_typeof(x.value -> 'montant') <> 'number' or (x.value ->> 'montant')::numeric < 0
          or jsonb_typeof(x.value -> 'roles') <> 'array' or jsonb_array_length(x.value -> 'roles') = 0
          or exists (select 1 from jsonb_array_elements_text(x.value -> 'roles') r where r not in ('gerant', 'admin', 'valideur'))
          or (x.ordinality = 1 and (x.value ->> 'montant')::numeric <> 0)
          or (x.ordinality > 1 and (x.value ->> 'montant')::numeric <= (p_paliers -> (x.ordinality::integer - 2) ->> 'montant')::numeric)) then
    raise exception 'Chaque palier a un montant (le premier à 0, puis croissants) et des rôles parmi gerant, admin, valideur.' using errcode = '22023';
  end if;

  -- Les règles précédentes de CASHD passent inactives (jamais supprimées), le seuil de direction compris.
  update public.regles_validation set actif = false where id = any(g.regles_paliers || coalesce(g.regle_direction_id, null::uuid)) and actif;
  for e in select x.value, x.ordinality, (p_paliers -> x.ordinality::integer ->> 'montant')::numeric as plafond
           from jsonb_array_elements(coalesce(p_paliers, '[]'::jsonb)) with ordinality x order by x.ordinality loop
    insert into public.regles_validation (client_id, module, montant_min, montant_max, approbations_requises, roles_autorises, actif)
    values (p_client, 'cashd', (e.value ->> 'montant')::numeric, e.plafond, 1,
            array(select r from jsonb_array_elements_text(e.value -> 'roles') r), true)
    returning id into v_id;
    v_ids := v_ids || v_id;
  end loop;
  update public.cashd_reglages set paliers_validation = case when v_n = 0 then null else p_paliers end, regles_paliers = v_ids,
         seuil_direction = case when v_n = 0 then seuil_direction else null end, maj_le = now()
   where client_id = p_client returning * into g;
  perform private.journaliser_module(p_client, 'cashd', 'cashd.reglages_relances', 'cashd_reglages', p_client::text,
    jsonb_build_object('paliers_validation', p_paliers, 'regles', to_jsonb(v_ids)), null);
  return jsonb_build_object('paliers', g.paliers_validation, 'regles', to_jsonb(v_ids));
end $function$;

revoke execute on function public.cashd_regler_validation(uuid, jsonb) from public, anon;
grant execute on function public.cashd_regler_validation(uuid, jsonb) to authenticated, service_role;
