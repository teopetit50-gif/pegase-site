# alertes-quotidiennes (lot socle 19ap)

Chaque matin, le résumé des alertes (alertes internes critiques et à surveiller, ouvriers silencieux, tâches en échec
sur 24 h, sauvegarde en retard) part par courriel vers l'opérateur. Rien n'est envoyé s'il n'y a rien à signaler.
Une alerte envoyée est marquée (`envoyee_le`) et ne revient pas.

À poser sur la recette, par le coordinateur, après le lot 19ap :

1. Déployer la fonction (coquille figée au SHA), `verify_jwt = true`. Secret `BREVO_API_KEY` déjà présent sur la
   recette ; `ALERTES_ENVIRONNEMENT` vaut « recette » par défaut.
2. Réglages :
   ```sql
   insert into private.reglages (cle, valeur) values
     ('alertes_destinataire', '<adresse de Teo>'),
     ('alertes_expediteur', '<adresse d''expéditeur vérifiée chez Brevo>');
   ```
3. Le cron, à 06:17 UTC (08:17 à Paris l'été), après le contrôle des sauvegardes de 06:07 :
   ```sql
   select cron.schedule('omega-alertes-quotidiennes', '17 6 * * *', $cron$
     select net.http_post(
       url := 'https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/alertes-quotidiennes',
       headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret),
       body := '{}'::jsonb, timeout_milliseconds := 30000)
     from vault.decrypted_secrets s where s.name = 'cle_service'
   $cron$);
   ```

La fonction n'accepte que la clé de service (403 sinon). Elle répond `{ envoye, alertes, marquees }`. Si le
destinataire, l'expéditeur ou la clé Brevo manquent, elle répond 503 et ne marque rien.
