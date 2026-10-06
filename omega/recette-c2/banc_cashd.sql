-- Recette seulement : CASHD installé sur le banc, en mode ESSAI (tout envoi part à l'adresse d'essai du banc, jamais
-- chez un vrai client), avec le réglage d'envoi du module cashd. À poser après les migrations c2_01 → c2_03 et après les
-- tests ^test_c2_ (qui installent eux-mêmes CASHD dans leur transaction annulée). Rejouable.
do $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
begin
  perform public.cashd_installer(v_client, 'essai');
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'cashd', 'essai',
         coalesce((select r.essai_adresse from public.reglages_envois r where r.client_id = v_client and r.module is null), 'essais@omegaai.fr'),
         array['email', 'lre']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'cashd');
end $$;

select r.module, r.mode, r.essai_adresse, r.canaux, g.mode as cashd_mode
from public.reglages_envois r join public.cashd_reglages g on g.client_id = r.client_id
where r.client_id = 'cccccccc-0000-4000-8000-00000000000c' and r.module = 'cashd';
