-- omega/banc/coffre_reel.sql — le coffre Tamila du banc sur le VRAI Key Manager Scaleway (session B4, 18/10/2026).
-- À jouer sur la RECETTE, bloc par bloc (pg_net est asynchrone : chaque appel rend un identifiant, sa réponse se lit
-- au bloc suivant, quelques secondes plus tard). Rien n'est retiré ni effacé ; aucun secret n'est lu en clair ici.
--
-- Prérequis :
--   · secrets de la fonction tamila-coffre : SCALEWAY_PROJECT_ID, SCALEWAY_SECRET_KEY, SCALEWAY_REGION=fr-par (posés le 18/10) ;
--   · tamila-coffre REDÉPLOYÉE depuis worker-b4 (≥ ce commit) : la liste des clés Scaleway exige
--     scheduled_for_deletion (relevé sur le schéma officiel), et le banc a besoin de l'activation au nom du
--     serveur (avec le gérant désigné) et de l'action « sonde » ;
--   · le secret de coffre-fort Supabase « cle_service » (déjà utilisé par les crons du lecteur).
--
-- Pourquoi la fonction et pas SQL : la clé secrète Scaleway ne vit que dans les secrets de tamila-coffre ; la base
-- ne parle jamais au Key Manager. Le gérant fait sa demande par la porte normale (bloc 2, sous son identité) ; la
-- clé de service fait appeler le coffre, qui crée ou retrouve la clé maître « omega-tamila-<client> » et la fait
-- poser par la porte tamila_coffre_activer — laquelle vérifie que « par » est bien le gérant du cabinet.
-- TAMILA_ACTIVER_COFFRE n'est PAS un secret serveur : c'est une variable du script local analyse-reelle.mjs.

-- ═══ 0. Le cabinet du banc (à ajuster si besoin) ═══
-- Le banc Tamila : client cccccccc-0000-4000-8000-00000000000c ; son gérant est lu dans public.comptes.
select r.client_id, c.user_id as gerant, c.role
  from public.tamila_reglages r
  join public.comptes c on c.client_id = r.client_id and c.role = 'gerant'
 where r.client_id = 'cccccccc-0000-4000-8000-00000000000c';

-- ═══ 1. Lectures avant ═══
select client_id, statut, region, cle_maitre, active_par, active_le, bascule_finie_le
  from public.tamila_coffres where client_id = 'cccccccc-0000-4000-8000-00000000000c';
select fournisseur, statut, count(*) from public.tamila_cles
 where client_id = 'cccccccc-0000-4000-8000-00000000000c' group by 1, 2 order by 1, 2;

-- ═══ 2. La demande du gérant, par la porte normale, sous son identité (rien n'est écrit) ═══
-- Remplacer <GERANT> par l'user_id lu au bloc 0. Attendu : {"par": <GERANT>, "statut": "local", ...}.
begin;
select set_config('request.jwt.claims', json_build_object('sub', '<GERANT>', 'role', 'authenticated')::text, true);
set local role authenticated;
select public.tamila_coffre_demander_activation('cccccccc-0000-4000-8000-00000000000c');
rollback;

-- ═══ 3. L'activation : la clé de service fait appeler le coffre, au nom du gérant désigné ═══
-- Rend l'identifiant de la requête pg_net (à noter : <ID_ACTIVER>).
select net.http_post(
  url := 'https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/tamila-coffre',
  headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret),
  body := jsonb_build_object('action', 'activer', 'client', 'cccccccc-0000-4000-8000-00000000000c', 'par', '<GERANT>'),
  timeout_milliseconds := 30000) as id_activer
  from vault.decrypted_secrets s where s.name = 'cle_service';

-- ═══ 4. La réponse de l'activation, puis la preuve en base ═══
-- Attendu : 200, {"statut": "bascule" (dossiers locaux existants) ou "scaleway", "deja": false, "region": "fr-par",
-- "cle_maitre": "<uuid Scaleway>"}. Un 502 KM_REFUS porte le motif exact de Scaleway (jamais la clé) : me le rendre brut.
-- Un 403 APPELANT_REFUSE / « ce geste se fait au nom d'une personne » : la fonction n'est pas redéployée, ou le secret
-- « cle_service » du coffre-fort diffère de SUPABASE_SERVICE_ROLE_KEY de la fonction. Un 503 KM_ABSENT : secrets Scaleway
-- absents de la fonction.
select id, status_code, content::jsonb as corps, error_msg, created
  from net._http_response where id = <ID_ACTIVER>;
select client_id, statut, region, cle_maitre, active_par, active_le
  from public.tamila_coffres where client_id = 'cccccccc-0000-4000-8000-00000000000c';
select id, survenu_le, action, donnees
  from public.journal_opposable
 where client_id = 'cccccccc-0000-4000-8000-00000000000c' and action = 'tamila.coffre.active'
 order by id desc limit 3;

-- ═══ 5. La sonde : la chaîne réelle de bout en bout, sans rien écrire ═══
-- Une clé de dossier fictive est enveloppée chez Scaleway (données associées = un dossier fictif), déballée et
-- comparée ; une pièce fictive chiffrée au format Tamila avec cette clé est relue avec la clé déballée ; l'enveloppe
-- présentée au nom d'un autre dossier doit être refusée par Scaleway. Rend <ID_SONDE>.
select net.http_post(
  url := 'https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/tamila-coffre',
  headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret),
  body := jsonb_build_object('action', 'sonde', 'client', 'cccccccc-0000-4000-8000-00000000000c'),
  timeout_milliseconds := 30000) as id_sonde
  from vault.decrypted_secrets s where s.name = 'cle_service';

-- ═══ 6. La réponse de la sonde ═══
-- Attendu : 200, {"cle_relue": true, "piece_relue": true, "autre_dossier_refuse": true, "enveloppe_octets": n,
-- "piece_chiffree_octets": m, "cle_maitre": même uuid qu'au bloc 4, "region": "fr-par"}. Aucune clé dans la réponse.
select id, status_code, content::jsonb as corps, error_msg, created
  from net._http_response where id = <ID_SONDE>;

-- ═══ 7. Lectures de preuve, après ═══
begin;
select set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
set local role service_role;
select public.tamila_coffre_etat('cccccccc-0000-4000-8000-00000000000c');
rollback;
select fournisseur, statut, count(*) from public.tamila_cles
 where client_id = 'cccccccc-0000-4000-8000-00000000000c' group by 1, 2 order by 1, 2;
-- Les dossiers locaux du banc (BANC-10060001…) restent sous la phrase jusqu'à leur ré-enveloppement, fait par un
-- membre depuis l'écran (la phrase n'existe que dans son navigateur) ; les dossiers ouverts désormais ont leur clé
-- au coffre — c'est ce que la première lecture longue réelle utilisera (omega/recette-b4/analyse-reelle.mjs).
