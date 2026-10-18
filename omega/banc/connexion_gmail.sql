-- Connecter la boîte Gmail du banc sur la RECETTE (ygwbgpowzlbdaajlsqkn) — A2, 18/10/2026.
-- À JOUER PAR LE COORDINATEUR, puis lien à ouvrir par Teo dans les 15 minutes.
--
-- Il n'existe pas encore d'écran « Messagerie » sur omegaai.fr (rien dans main n'appelle messagerie_preparer :
-- l'écran revient à A3). Ce script fait ce que l'écran ferait : il crée l'état OAuth à usage unique au nom du
-- gérant du banc (gerant@banc-varelo.test, client cccccccc-…-00000000000c), puis rend le lien de départ.
-- Teo ouvre ce lien dans un navigateur connecté au compte Gmail inscrit comme « utilisateur test » de
-- l'application Google, choisit ce compte, « Continuer » (application non validée, régime Test), accepte les
-- deux permissions. Sans écran de retour, messagerie-oauth affiche sa propre page « connectée ».

-- 1. L'état et le lien (valable 15 minutes, une seule fois)
do $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_gerant uuid := (select id from auth.users where email = 'gerant@banc-varelo.test');
  v_etat text;
begin
  if v_gerant is null then
    raise exception 'gerant@banc-varelo.test introuvable sur la recette : rien n''est fait.';
  end if;
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_etat := public.messagerie_preparer(v_client, 'gmail', null);
  perform tests.redevenir_admin();
  raise notice 'Lien à ouvrir par Teo (15 min) : https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/messagerie-oauth/google/debut?etat=%', v_etat;
end $$;

-- 2. Vérifier, après le retour de Google
select id, fournisseur, adresse, etat, portees, connecte_le from public.messageries
 where client_id = 'cccccccc-0000-4000-8000-00000000000c' order by connecte_le desc limit 3;
-- Attendu : une ligne gmail « active » à l'adresse de Teo, portées gmail.readonly et gmail.compose.
-- Puis, une à deux minutes après un courriel envoyé à cette adresse (cron omega-messagerie) :
select r.id, r.canal, r.boite, r.de_adresse, r.sujet, r.recu_le from public.receptions r
 where r.client_id = 'cccccccc-0000-4000-8000-00000000000c' order by r.recu_le desc limit 3;
-- Échec : le navigateur affiche la cause (lien_invalide, lien_expire, annulee, connexion_impossible) ;
-- le journal de messagerie-oauth la détaille. Rejouer la partie 1 pour un nouveau lien.
