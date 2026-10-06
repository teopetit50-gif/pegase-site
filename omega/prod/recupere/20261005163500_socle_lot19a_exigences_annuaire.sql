-- recupere 20261005163500 socle_lot19a_exigences_annuaire
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête 6f9d13b6-e775-4198-b857-7e54ac7a85fd (mcp__Supabase__execute_sql, 2026-10-05T16:33:07.552Z, résultat : réussi)
set lock_timeout = '8s';
-- Lot 19a : exigences de décision, pièce jointe d'approbation, annuaire.
alter table public.regles_validation
  add column if not exists exige_commentaire boolean not null default false,
  add column if not exists exige_piece boolean not null default false,
  add column if not exists exige_motif boolean not null default true;
alter table public.demandes_validation
  add column if not exists exige_commentaire boolean not null default false,
  add column if not exists exige_piece boolean not null default false,
  add column if not exists exige_motif boolean not null default true;
alter table public.approbations add column if not exists piece_id uuid references public.pieces(id) on delete set null;
comment on column public.approbations.piece_id is 'Pièce jointe à la décision (justificatif), déposée dans public.pieces avant l''approbation.';

create or replace function private.preparer_demande()
 returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  v_regle public.regles_validation;
  v_uid uuid := (select auth.uid());
  v_politique uuid;
begin
  new.statut := 'en_attente';
  new.cree_le := now();
  new.decide_le := null;
  new.execute_le := null;
  new.motif_echec := null;
  new.politique_id := null;
  if v_uid is not null then
    new.demandeur_type := 'utilisateur';
    new.demandeur_id := v_uid;
  else
    new.demandeur_type := 'systeme';
    new.demandeur_id := null;
  end if;

  select r.* into v_regle
  from public.regles_validation r
  where r.client_id = new.client_id
    and r.module = new.module
    and r.actif
    and ((r.type_action is null and new.type_action <> 'politique.activer') or r.type_action = new.type_action)
    and (r.entite_id is null or r.entite_id = new.entite_id)
    and coalesce(new.montant, 0) >= r.montant_min
    and (r.montant_max is null or coalesce(new.montant, 0) < r.montant_max)
  order by (r.type_action is not null) desc, (r.entite_id is not null) desc,
           r.montant_min desc, r.approbations_requises desc
  limit 1;

  if found then
    new.regle_id := v_regle.id;
    new.approbations_requises := v_regle.approbations_requises;
    new.roles_autorises := v_regle.roles_autorises;
    new.equipe_id := v_regle.equipe_id;
    -- Les exigences de la règle sont recopiées sur la demande (lot 19) ; une exigence
    -- déjà posée par le module (payload.exigences) l'emporte si elle est plus stricte.
    new.exige_commentaire := coalesce(v_regle.exige_commentaire, false) or coalesce((new.payload -> 'exigences' ->> 'commentaire')::boolean, false);
    new.exige_piece := coalesce(v_regle.exige_piece, false) or coalesce((new.payload -> 'exigences' ->> 'piece_jointe')::boolean, false);
    new.exige_motif := coalesce(v_regle.exige_motif, true) or coalesce((new.payload -> 'exigences' ->> 'motif_refus')::boolean, false);
  else
    new.regle_id := null;
    new.approbations_requises := 1;
    new.roles_autorises := case when new.type_action = 'politique.activer'
                                then array['gerant'] else array['gerant', 'admin', 'valideur'] end;
    new.equipe_id := null;
    new.exige_commentaire := coalesce((new.payload -> 'exigences' ->> 'commentaire')::boolean, false);
    new.exige_piece := coalesce((new.payload -> 'exigences' ->> 'piece_jointe')::boolean, false);
    new.exige_motif := coalesce((new.payload -> 'exigences' ->> 'motif_refus')::boolean, true);
  end if;

  v_politique := private.politique_couvrante(new.client_id, new.module, new.type_action, new.entite_id,
                                             new.montant, now());
  if v_politique is not null then
    new.statut := 'approuvee';
    new.decide_le := now();
    new.politique_id := v_politique;
    new.approbations_requises := 0;
  end if;
  return new;
end $function$;

-- L'annuaire : qui est qui dans une organisation, pour nommer demandeurs et décideurs.
create or replace function public.annuaire(p_client uuid)
 returns table (user_id uuid, nom text, email text, role text)
 language sql stable security definer set search_path to '' as $$
  select c.user_id,
         coalesce(nullif(u.raw_user_meta_data ->> 'nom', ''), nullif(u.raw_user_meta_data ->> 'full_name', ''),
                  nullif(u.raw_user_meta_data ->> 'name', ''), initcap(replace(split_part(u.email, '@', 1), '.', ' '))) as nom,
         u.email::text, c.role
  from public.comptes c join auth.users u on u.id = c.user_id
  where c.client_id = p_client
    and (p_client in (select private.mes_clients())
         or coalesce(nullif(current_setting('role', true), 'none'), session_user::text) in ('service_role', 'postgres'))
  order by 2
$$;
revoke all on function public.annuaire(uuid) from public, anon;
grant execute on function public.annuaire(uuid) to authenticated, service_role;

insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261005163500', 'socle_lot19a_exigences_annuaire', array['-- exigences de décision (regles/demandes), approbations.piece_id, public.annuaire(p_client)']);
select 'lot19a_ok' as r;
