-- recupere 20261005140300 socle_lot18d_boite_formulaire
-- Source : fil de la session coordinateur session_01B4JNQXyT69GytdvE9SjAnE, paramètre « query » tel que posé (lecture autorisée par le coordinateur le 6/10).
-- Note : Contient aussi : la ligne config.boite_formulaire du client du banc (donnée de recette) et le cron omega-expediteur (URL de la recette).
-- Fichier brut : le nettoyage pour la production (ligne de migration, banc, outillage, URL, pgtap) est fait par assembler.mjs.

-- ═══ requête 346cbaad-2c03-4325-847c-2ce09cebc39b (mcp__Supabase__execute_sql, 2026-10-05T16:18:45.063Z, résultat : réussi)
set lock_timeout = '8s';
-- Lot 18d : resoudre_boite connaît le canal formulaire (boîte du site, portée par clients.config.boite_formulaire).
create or replace function private.resoudre_boite(p_canal text, p_boite text)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare x public.expediteurs; c public.clients;
begin
  perform private.exiger_ouvrier();
  if p_canal is null or p_boite is null then return null; end if;
  if p_canal = 'formulaire' then
    select * into c from public.clients k where k.config ->> 'boite_formulaire' = p_boite order by k.cree_le limit 1;
    if c.id is null then return null; end if;
    return jsonb_build_object('client_id', c.id, 'entite_id', null, 'module', coalesce(c.config ->> 'module_formulaire', 'reput'), 'expediteur_id', null);
  end if;
  select * into x from public.expediteurs e
   where e.canal = p_canal
     and (lower(e.identite) = lower(p_boite) or e.parametres ->> 'phone_number_id' = p_boite)
   order by (e.statut = 'actif') desc, e.maj_le desc limit 1;
  if x.id is null then return null; end if;
  return jsonb_build_object('client_id', x.client_id, 'entite_id', null, 'module', x.module, 'expediteur_id', x.id);
end $$;
update public.clients set config = config || '{"boite_formulaire": "site:omegaai.fr"}'::jsonb where id = 'cccccccc-0000-4000-8000-00000000000c';
insert into supabase_migrations.schema_migrations (version, name, statements)
values ('20261005140300', 'socle_lot18d_boite_formulaire', array['-- resoudre_boite : canal formulaire par clients.config.boite_formulaire']);
-- Cron de l''expéditeur : chaque minute, si la clé de service est au coffre (vault secret « cle_service »).
select cron.schedule('omega-expediteur', '* * * * *', $cron$
  select net.http_post(
    url := 'https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/expediteur',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 50000)
  from vault.decrypted_secrets s where s.name = 'cle_service'
$cron$);
select public.resoudre_boite('formulaire', 'site:omegaai.fr') as boite_site, (select count(*) from cron.job where jobname = 'omega-expediteur') as cron_pose;
