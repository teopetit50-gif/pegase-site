-- Recette seulement (ygwbgpowzlbdaajlsqkn) : la fonction Edge daliro-questions appelée chaque minute, comme
-- omega-reput. À poser APRÈS b6_36 et le déploiement de la fonction (verify_jwt true ; secrets ANTHROPIC_API_KEY et
-- éventuellement ANTHROPIC_MODEL_ID déjà posés pour le lecteur, rien de neuf).
select cron.schedule('daliro-questions', '* * * * *', $cron$
  select net.http_post(
    url := 'https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/daliro-questions',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000)
  from vault.decrypted_secrets s where s.name = 'cle_service'
$cron$)
where not exists (select 1 from cron.job where jobname = 'daliro-questions');
