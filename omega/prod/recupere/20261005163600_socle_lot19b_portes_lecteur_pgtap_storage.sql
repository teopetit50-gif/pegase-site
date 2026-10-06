-- recupere 20261005163600 socle_lot19b_portes_lecteur_pgtap_storage
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête d589b653-16df-47fc-8482-51e635de53ce (mcp__Supabase__execute_sql, 2026-10-05T16:33:22.366Z, résultat : réussi)
set lock_timeout = '8s';
-- Lot 19b : portes du lecteur, réglage du plafond, cron du lecteur, pgTAP, politique Storage.
create or replace function private.piece_a_lire(p_piece uuid)
 returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare p public.pieces;
begin
  perform private.exiger_ouvrier();
  select * into p from public.pieces x where x.id = p_piece;
  if p.id is null then return null; end if;
  return to_jsonb(p);
end $$;
create or replace function public.piece_a_lire(p_piece uuid)
 returns jsonb language sql stable set search_path to '' as $$ select private.piece_a_lire(p_piece) $$;

create or replace function private.consommation_ia_jour(p_client uuid)
 returns numeric language plpgsql stable security definer set search_path to '' as $$
declare v numeric;
begin
  perform private.exiger_ouvrier();
  select coalesce(sum((t.resultat ->> 'cout_eur')::numeric), 0) into v
  from public.travaux t
  where t.client_id = p_client and t.genre = 'lecteur.lire' and t.etat = 'fait'
    and t.fini_le >= date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'
    and (t.resultat ->> 'cout_eur') ~ '^[0-9.]+$';
  return v;
end $$;
create or replace function public.consommation_ia_jour(p_client uuid)
 returns numeric language sql stable set search_path to '' as $$ select private.consommation_ia_jour(p_client) $$;

create or replace function private.lire_parametre(p_cle text)
 returns text language plpgsql stable security definer set search_path to '' as $$
declare v text;
begin
  perform private.exiger_ouvrier();
  select r.valeur into v from private.reglages r where r.cle = p_cle;
  return v;
end $$;
create or replace function public.lire_parametre(p_cle text)
 returns text language sql stable set search_path to '' as $$ select private.lire_parametre(p_cle) $$;

revoke all on function public.piece_a_lire(uuid), public.consommation_ia_jour(uuid), public.lire_parametre(text) from public, anon, authenticated;
grant execute on function public.piece_a_lire(uuid), public.consommation_ia_jour(uuid), public.lire_parametre(text) to service_role;

insert into private.reglages (cle, valeur, note)
values ('plafond_ia_jour_client', '5', 'Plafond de dépense d''IA par organisation et par jour, en euros (lecteur).')
on conflict (cle) do nothing;

select cron.schedule('omega-lecteur', '* * * * *', $cron$
  select net.http_post(
    url := 'https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/lecteur',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000)
  from vault.decrypted_secrets s where s.name = 'cle_service'
$cron$);

create extension if not exists pgtap with schema extensions;

-- Storage : un membre lit (et signe) les objets de ses organisations ; le préfixe du chemin est le client_id.
create policy "les membres lisent les pièces de leurs organisations" on storage.objects
  for select to authenticated
  using (bucket_id = 'omega-clients'
         and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
         and (substring(name from 1 for 36))::uuid in (select private.mes_clients()));

insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261005163600', 'socle_lot19b_portes_lecteur_pgtap_storage', array['-- piece_a_lire, consommation_ia_jour, lire_parametre, réglage plafond_ia_jour_client, cron omega-lecteur, pgtap, politique Storage omega-clients']);
select (select count(*) from cron.job where jobname in ('omega-lecteur','omega-expediteur')) as crons, exists(select 1 from pg_extension where extname='pgtap') as pgtap, (select count(*) from pg_policies where schemaname='storage') as pol_storage;
