-- 19an_export_complet_gerant_seul.sql — l'export complet est réservé au gérant (A5, 06/10/2026, décision du coordinateur).
-- 19aj laissait un admin du client DEMANDER l'export, mais la porte des données (exporter_donnees_client) n'accepte que
-- le gérant : l'admin aurait vu la demande échouer en route. On s'aligne sur le plus strict : seul le gérant demande,
-- et l'admin reçoit un refus clair dès la demande. Remplace demander_export_complet (create or replace, rien n'est supprimé).
-- Idempotent : rejouable sans effet.

create or replace function public.demander_export_complet(p_client uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not exists (
       select 1 from public.comptes c where c.user_id = auth.uid() and c.client_id = p_client and c.role = 'gerant') then
    raise exception 'L''export complet est réservé au gérant de l''organisation (un admin ne peut pas le demander).'
      using errcode = '42501';
  end if;
  if exists (select 1 from public.exports_complets e
             where e.client_id = p_client and e.statut = 'en_cours' and e.demande_le > now() - interval '30 minutes') then
    raise exception 'un export complet est déjà en cours pour ce client' using errcode = '55P03';
  end if;
  insert into public.exports_complets (client_id, demande_par) values (p_client, auth.uid()) returning id into v_id;
  return v_id;
end $$;
revoke all on function public.demander_export_complet(uuid) from public, anon;
grant execute on function public.demander_export_complet(uuid) to authenticated;
