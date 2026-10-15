-- b2_17 — Une personne nommée sur chaque remise en location (chiffrage, ligne 12 : « Chaque retour, facture, remise en
-- état ou incident est attribué à une personne nommée »). Session B2, 15/10/2026.
--
-- La direction règle, agence par agence, la personne à qui revient d'office chaque remise en location. Une remise créée
-- sans responsable le reçoit à l'insertion. Une agence sans responsable réglé laisse la remise sans personne, mais la
-- direction est prévenue une fois par jour et par agence. On peut toujours confier une remise à une autre personne
-- (loc_assigner_remise, b2_10). Aucune fonction de b2_10 n'est redéfinie ici.

create table if not exists public.loc_responsables_agence (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  entite_id uuid not null,
  remise_responsable uuid not null,
  maj_par uuid,
  maj_le timestamp with time zone not null default now(),
  constraint loc_responsables_agence_pkey primary key (id),
  constraint loc_responsables_agence_un unique (client_id, entite_id),
  constraint loc_responsables_agence_client_fkey foreign key (client_id) references public.clients(id) on delete cascade
);
comment on table public.loc_responsables_agence is 'b2_17 : la personne à qui revient d''office chaque remise en location, par agence';

alter table public.loc_responsables_agence enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_responsables_agence' and policyname = 'membres lisent les responsables') then
    create policy "membres lisent les responsables" on public.loc_responsables_agence for select to authenticated
      using (client_id in (select private.mes_clients()));
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'loc_responsables_agence_toucher' and tgrelid = 'public.loc_responsables_agence'::regclass) then
    create trigger loc_responsables_agence_toucher before update on public.loc_responsables_agence for each row execute function private.loc_toucher();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'loc_responsables_agence_tracer' and tgrelid = 'public.loc_responsables_agence'::regclass) then
    create trigger loc_responsables_agence_tracer after insert or update on public.loc_responsables_agence for each row execute function private.tracer('maj_le');
  end if;
end $$;
revoke all on table public.loc_responsables_agence from public, anon, authenticated;
grant select on table public.loc_responsables_agence to authenticated;
grant all on table public.loc_responsables_agence to service_role;

-- La direction règle le responsable d'une agence : une personne de l'organisation qui voit cette agence.
CREATE OR REPLACE FUNCTION public.loc_poser_responsable_remise(p_entite uuid, p_responsable uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin'], 'Le responsable des remises se règle par la direction.');
begin
  if not exists (select 1 from public.entites e where e.client_id = v_client and e.id = p_entite) then
    raise exception 'Agence introuvable.' using errcode = 'P0002';
  end if;
  if p_responsable is null then
    raise exception 'Nommez une personne : chaque remise en location revient à quelqu''un.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.comptes k where k.user_id = p_responsable and k.client_id = v_client
                   and (k.perimetre_total or exists (select 1 from public.comptes_entites ce where ce.user_id = k.user_id and ce.client_id = v_client and ce.entite_id = p_entite))) then
    raise exception 'Cette personne ne travaille pas pour cette agence.' using errcode = '22023';
  end if;
  insert into public.loc_responsables_agence (client_id, entite_id, remise_responsable, maj_par)
  values (v_client, p_entite, p_responsable, (select auth.uid()))
  on conflict on constraint loc_responsables_agence_un do update set remise_responsable = excluded.remise_responsable, maj_par = excluded.maj_par;
  -- les remises encore ouvertes de l'agence sans personne la reçoivent aussi
  update public.loc_remises set responsable = p_responsable
   where client_id = v_client and entite_id = p_entite and responsable is null and statut in ('a_faire', 'en_cours');
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.responsable_remise_pose', 'entites', p_entite::text,
    jsonb_build_object('responsable', p_responsable, 'par', (select auth.uid())), p_entite);
  return jsonb_build_object('entite', p_entite, 'responsable', p_responsable);
end $function$;

-- À l'insertion d'une remise sans responsable : celui de l'agence, sinon la direction est prévenue.
CREATE OR REPLACE FUNCTION private.loc_remise_responsable_d_office()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_resp uuid;
begin
  if new.responsable is null then
    select r.remise_responsable into v_resp from public.loc_responsables_agence r where r.client_id = new.client_id and r.entite_id = new.entite_id;
    if v_resp is not null then
      new.responsable := v_resp;
    else
      begin
        perform private.lever_alerte_module(new.client_id, 'tavaro', 'attention',
          format('Une remise en location de %s n''a personne de nommé : réglez le responsable des remises de cette agence.',
                 coalesce((select e.nom from public.entites e where e.id = new.entite_id), 'l''agence')),
          jsonb_build_object('entite', new.entite_id), 'remise:sans_responsable:' || new.entite_id::text || ':' || to_char(now(), 'YYYY-MM-DD'), true, null);
      exception when others then
        raise warning 'loc_remise_responsable_d_office: %', sqlerrm;
      end;
    end if;
  end if;
  return new;
end $function$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'loc_remises_responsable_d_office' and tgrelid = 'public.loc_remises'::regclass) then
    create trigger loc_remises_responsable_d_office before insert on public.loc_remises for each row execute function private.loc_remise_responsable_d_office();
  end if;
end $$;

revoke all on function private.loc_remise_responsable_d_office() from public, anon, authenticated;
revoke all on function public.loc_poser_responsable_remise(uuid, uuid) from public, anon;
grant execute on function public.loc_poser_responsable_remise(uuid, uuid) to authenticated, service_role;
