-- Ligne d'expéditeur WhatsApp du banc sur la RECETTE (ygwbgpowzlbdaajlsqkn) — A2, 18/10/2026.
-- À JOUER PAR LE COORDINATEUR. Numéro de test Meta donné par Teo :
--   identité +15551998680, Phone number ID 1304208509431404, compte WhatsApp Business (WABA) 2123888648549888.
-- La réception (reception/whatsapp) retrouve l'organisation par le Phone number ID (resoudre_boite) ; l'envoi
-- (expediteur, envois.meta_whatsapp) lit phone_number_id dans parametres. Module daliro : les messages reçus
-- arrivent dans Daliro. Le fournisseur meta_whatsapp RESTE branche = false : rien ne part tant que Teo n'a
-- pas posé META_ACCESS_TOKEN et que le coordinateur ne l'a pas branché. Sans META_APP_SECRET, reception
-- répond 503 aux notifications : rien n'est reçu non plus. Idempotent ; aucun DROP.

-- 0. Contrôles (lecture seule)
select fournisseur, canal, automatique, branche from private.fournisseurs_envoi where fournisseur = 'meta_whatsapp';
select id, module, canal, fournisseur, identite, parametres, statut from public.expediteurs
 where canal = 'whatsapp' or parametres ->> 'phone_number_id' = '1304208509431404';
-- Attendu : branche = false ; aucune ligne pour ce Phone number ID (s'il y en a une, s'arrêter et en parler).

-- 1. La ligne d'expéditeur
insert into public.expediteurs (client_id, module, canal, fournisseur, identite, nom_affiche, parametres, statut)
select 'cccccccc-0000-4000-8000-00000000000c', 'daliro', 'whatsapp', 'meta_whatsapp', '+15551998680', 'Omega (test Meta)',
       jsonb_build_object('phone_number_id', '1304208509431404', 'waba_id', '2123888648549888'), 'actif'
where not exists (select 1 from public.expediteurs x
                  where x.canal = 'whatsapp' and x.parametres ->> 'phone_number_id' = '1304208509431404');

-- 2. Vérifier
select id, client_id, module, canal, fournisseur, identite, parametres, statut from public.expediteurs
 where parametres ->> 'phone_number_id' = '1304208509431404';
select public.resoudre_boite('whatsapp', '1304208509431404');
-- Attendu : une ligne (module daliro, actif) ; resoudre_boite rend client_id cccccccc-…-00000000000c, module daliro.
select fournisseur, branche from private.fournisseurs_envoi where fournisseur = 'meta_whatsapp';
-- Attendu : branche = false (inchangé).

-- 3. Retour arrière (si besoin)
-- update public.expediteurs set statut = 'suspendu' where parametres ->> 'phone_number_id' = '1304208509431404';
