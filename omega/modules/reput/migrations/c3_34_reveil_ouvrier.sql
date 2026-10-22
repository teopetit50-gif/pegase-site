-- c3_34 — REPUT, écart TREPUT-05 (preuve niveau 2) : la réponse préparée sans attendre la minute suivante (session C3, 22/10/2026)
--
-- Constat : demande (a) préparée en 106 s, (b) en 59 s, pour « une réponse prête dans la minute ». La chaîne :
--   réception déposée → (synchrone) événement reception.nouvelle → travail reput.preparer (abonnement c3_01)
--   → ATTENTE du cron omega-reput (chaque minute : 0 à 60 s, ~30 s en moyenne)
--   → Edge reput-reponse : reput_commencer, rédaction par le modèle (Sonnet, outil : 10 à 40 s), dépôt.
-- De notre côté, seule l'attente du cron est compressible ; le reste est le travail lui-même. Désormais :
--   · private.reput_reveil(travail) : la requête qui réveille l'ouvrier pour CE travail (?nombre=1), ou null — si le
--     travail n'est pas un reput.preparer, si l'adresse de la fonction n'est pas réglée (private.reglages,
--     clé « reput_reponse_url »), ou si pg_net ou la clé de service manquent ;
--   · déclencheur reput_reveil sur public.travaux (après insertion) : envoie cette requête par pg_net (partie au COMMIT,
--     jamais avant) ; un échec ne bloque jamais la réception (avis au journal du serveur seulement) ;
--   · le cron omega-reput reste le filet : un réveil perdu est rattrapé dans la minute.
-- L'ouvrier écrit désormais ses durées (commencer, modèle, dépôt) dans le résultat du travail : l'attente se lit
-- fini_le − cree_le − leur somme (omega/recette-c3/mesure_treput05.sql).
--
-- À poser sur la recette, une fois : insert into private.reglages (cle, valeur) values ('reput_reponse_url',
--   'https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/reput-reponse') on conflict (cle) do nothing;
--
-- Règles de pose : create or replace (fonctions, déclencheur) ; ni DROP ni DELETE.

create or replace function private.reput_reveil(p_travail public.travaux)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_url text;
begin
  if p_travail.genre is distinct from 'reput.preparer' or p_travail.etat is distinct from 'a_faire' then
    return null;
  end if;
  select nullif(btrim(r.valeur), '') into v_url from private.reglages r where r.cle = 'reput_reponse_url';
  if v_url is null or v_url !~ '^https://' then
    return null;
  end if;
  return jsonb_build_object('url', regexp_replace(v_url, '/+$', '') || '?nombre=1', 'travail', p_travail.id);
end $function$;
revoke execute on function private.reput_reveil(public.travaux) from public, anon, authenticated;
grant execute on function private.reput_reveil(public.travaux) to service_role;

create or replace function private.reput_reveiller()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_r jsonb := private.reput_reveil(new);
begin
  if v_r is null or to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then
    return null;
  end if;
  begin
    execute $q$select net.http_post(url := $1,
                 headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret),
                 body := '{}'::jsonb, timeout_milliseconds := 60000)
               from vault.decrypted_secrets s where s.name = 'cle_service'$q$
      using v_r ->> 'url';
  exception when others then
    raise notice 'reput_reveiller : %', sqlerrm;   -- le cron omega-reput rattrape
  end;
  return null;
end $function$;
revoke execute on function private.reput_reveiller() from public, anon, authenticated;

create or replace trigger reput_reveil after insert on public.travaux
  for each row when (new.genre = 'reput.preparer') execute function private.reput_reveiller();
