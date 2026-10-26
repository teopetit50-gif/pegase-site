-- omega/prod/crons-edge-production.sql — les crons de la recette qu'AUCUN fichier de l'export ne crée (RUNBOOK § 6).
-- Préparé le 26/10/2026 ; posé par Teo sur la PRODUCTION, à la fin, quand les fonctions appelées sont déployées et leurs
-- secrets posés. Commandes recopiées de cron.job de la recette (relevé du 25/10), URL réécrite en production.
--
-- Les quatre crons Edge qui sont DANS l'export (omega-lecteur, omega-expediteur, omega-identite, omega-lecteur-exports)
-- portent déjà l'URL de production ; ils tournent dès P3 mais n'appellent rien tant que le Vault n'a pas « cle_service ».
--
-- Chaque bloc se pose seul : ne poser que ceux des modules ouverts en production. cron.schedule sur un nom existant
-- remplace la tâche (rejouable). Pas d'omega-echange-pa : il vise le bac à sable de la plateforme agréée (recette).
-- Vault requis : « cle_service » (clé service_role de la production) ; « reput_astreinte_jeton » pour l'astreinte.

-- Socle
select cron.schedule('omega-sortie', '* * * * *', $c$ select net.http_post( url := 'https://noepmkkplxshjbmqqxft.supabase.co/functions/v1/sortie', headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret), body := '{}'::jsonb, timeout_milliseconds := 120000) from vault.decrypted_secrets s where s.name = 'cle_service' $c$);
select cron.schedule('omega-alertes-quotidiennes', '17 6 * * *', $c$ select net.http_post( url := 'https://noepmkkplxshjbmqqxft.supabase.co/functions/v1/alertes-quotidiennes', headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret), body := '{}'::jsonb, timeout_milliseconds := 30000) from vault.decrypted_secrets s where s.name = 'cle_service' $c$);
select cron.schedule('omega-taux-bce', '35 14,15 * * 1-5', $c$ select net.http_post( url := 'https://noepmkkplxshjbmqqxft.supabase.co/functions/v1/taux-bce', headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret), body := '{}'::jsonb, timeout_milliseconds := 50000) from vault.decrypted_secrets s where s.name = 'cle_service' $c$);
select cron.schedule('taux-bce-veille', '0 17 * * 1-5', 'select public.taux_bce_veiller()');
-- Messagerie (Gmail / Microsoft) : seulement si les secrets GOOGLE_* / MICROSOFT_* de production existent.
select cron.schedule('omega-messagerie', '* * * * *', $c$ select net.http_post( url := 'https://noepmkkplxshjbmqqxft.supabase.co/functions/v1/messagerie', headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret), body := '{}'::jsonb, timeout_milliseconds := 50000) from vault.decrypted_secrets s where s.name = 'cle_service' $c$);

-- REPUT
select cron.schedule('omega-reput', '* * * * *', $c$ select net.http_post( url := 'https://noepmkkplxshjbmqqxft.supabase.co/functions/v1/reput-reponse', headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret), body := '{}'::jsonb, timeout_milliseconds := 50000) from vault.decrypted_secrets s where s.name = 'cle_service' $c$);
select cron.schedule('omega-reput-astreinte', '* * * * *', $c$ select net.http_post( url := 'https://noepmkkplxshjbmqqxft.supabase.co/functions/v1/reput-astreinte', headers := jsonb_build_object('Content-Type', 'application/json', 'x-reput-jeton', s.decrypted_secret), body := '{}'::jsonb, timeout_milliseconds := 50000) from vault.decrypted_secrets s where s.name = 'reput_astreinte_jeton' $c$);

-- Métiers (seulement les modules vendus en production)
select cron.schedule('omega-tamila-purge', '*/5 * * * *', $c$ select net.http_post( url := 'https://noepmkkplxshjbmqqxft.supabase.co/functions/v1/tamila-purge', headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret), body := '{}'::jsonb, timeout_milliseconds := 50000) from vault.decrypted_secrets s where s.name = 'cle_service' $c$);
select cron.schedule('omega-tavaro-pdf', '* * * * *', $c$ select net.http_post( url := 'https://noepmkkplxshjbmqqxft.supabase.co/functions/v1/tavaro-pdf', headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret), body := '{}'::jsonb, timeout_milliseconds := 50000) from vault.decrypted_secrets s where s.name = 'cle_service' $c$);
select cron.schedule('omega-tavaro-questions', '* * * * *', $c$ select net.http_post( url := 'https://noepmkkplxshjbmqqxft.supabase.co/functions/v1/tavaro-questions', headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret), body := '{}'::jsonb, timeout_milliseconds := 50000) from vault.decrypted_secrets s where s.name = 'cle_service' $c$);
select cron.schedule('daliro-questions', '* * * * *', $c$ select net.http_post( url := 'https://noepmkkplxshjbmqqxft.supabase.co/functions/v1/daliro-questions', headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret), body := '{}'::jsonb, timeout_milliseconds := 60000) from vault.decrypted_secrets s where s.name = 'cle_service' $c$);

-- Contrôle (attendu : 0 ligne vers la recette ; les crons Edge listés avec l'URL de production)
select jobname, schedule, active from cron.job where command like '%/functions/v1/%' order by 1;
select count(*) as vers_la_recette from cron.job where command like '%ygwbgpowzlbdaajlsqkn%';
