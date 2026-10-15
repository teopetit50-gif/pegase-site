-- recupere 20261005140200 socle_lot18c_remise_idempotente
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête 4136a742-a82e-4d7a-b9f4-96eff40a177f (mcp__Supabase__execute_sql, 2026-10-05T16:03:45.789Z, résultat : réussi)
set lock_timeout = '8s';
-- Lot 18c : remise idempotente sur la clé d'événement du fournisseur.
alter table public.envois_evenements add column if not exists cle text;
create unique index if not exists envois_evenements_envoi_cle_idx on public.envois_evenements (envoi_id, cle) where cle is not null;
create or replace function private.noter_remise(p_fournisseur text, p_reference text, p_evenement text, p_detail jsonb, p_survenu_le timestamptz, p_cle text)
returns boolean language plpgsql security definer set search_path to '' as $$
declare e public.envois; v_ok boolean;
begin
  perform private.exiger_ouvrier();
  if p_cle is not null then
    select * into e from public.envois x
     where x.fournisseur = p_fournisseur and x.reference_externe = p_reference
     order by x.cree_le desc limit 1;
    if e.id is not null and exists (select 1 from public.envois_evenements ev where ev.envoi_id = e.id and ev.cle = p_cle) then
      return true; -- déjà noté : idempotent
    end if;
  end if;
  v_ok := private.noter_remise(p_fournisseur, p_reference, p_evenement, p_detail, p_survenu_le);
  if v_ok and p_cle is not null and e.id is not null then
    update public.envois_evenements ev set cle = p_cle
     where ev.id = (select max(id) from public.envois_evenements where envoi_id = e.id and type = p_evenement and cle is null);
  end if;
  return v_ok;
end $$;
create or replace function public.noter_remise(p_fournisseur text, p_reference text, p_evenement text, p_detail jsonb, p_survenu_le timestamptz, p_cle text)
returns boolean language sql set search_path to '' as $$
  select private.noter_remise(p_fournisseur, p_reference, p_evenement, p_detail, p_survenu_le, p_cle)
$$;
revoke all on function public.noter_remise(text, text, text, jsonb, timestamptz, text) from public, anon, authenticated;
grant execute on function public.noter_remise(text, text, text, jsonb, timestamptz, text) to service_role;
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261005140200', 'socle_lot18c_remise_idempotente', array['-- posé par execute_sql : envois_evenements.cle + noter_remise à 6 arguments']);
select to_regprocedure('public.noter_remise(text,text,text,jsonb,timestamptz,text)') as noter6;
