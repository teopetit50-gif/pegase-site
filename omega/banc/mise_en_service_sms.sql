-- Mise en service des SMS Brevo sur la RECETTE (ygwbgpowzlbdaajlsqkn) — A2, 06/10/2026.
-- À JOUER PAR LE COORDINATEUR, SUR ACCORD DE TEO, après l'achat de crédits SMS chez Brevo. Rien ici n'est joué par A2.
--
-- Le code est déjà là (omega/functions/expediteur : brevo.ts /v3/transactionalSMS/sms, passage.ts remettreSms, test
-- « SMS remis… » ; webhooks/brevo traite les statuts SMS). Ce script fait seulement la mise en service, isolée dans un
-- module d'essai « socle_sms » pour ne rien changer aux autres modules du banc :
--   0. contrôles (lecture seule) ;
--   1. brevo_sms branché (confier_envoi déposera envois.brevo_sms) ;
--   2. un expéditeur SMS pour le banc, réservé au module socle_sms (émetteur alphanumérique « OMEGA ») ;
--   3. le module socle_sms en mode réel, plages larges, sans délai minimal (un essai ne doit pas être différé) ;
--   4. un SMS d'essai vers le portable de Teo (numéro à écrire ligne 58) ;
--   5. les requêtes de vérification, une minute plus tard (cron omega-expediteur) ;
--   6. le retour arrière.
-- Chaque partie se joue séparément (execute_sql). Idempotent ; aucun DROP.

-- ───────────────────────────────────────────────────────────────────────────
-- 0. Contrôles (lecture seule)
-- ───────────────────────────────────────────────────────────────────────────
select fournisseur, canal, automatique, branche, agree_sante from private.fournisseurs_envoi where fournisseur = 'brevo_sms';
select id, module, canal, fournisseur, identite, nom_affiche, statut from public.expediteurs
 where client_id = 'cccccccc-0000-4000-8000-00000000000c' and canal = 'sms';
-- Le réglage de l'ORGANISATION (module null) ne doit pas être « essai » ou « coupe » : le mode effectif d'un module
-- est le plus prudent des deux. Si c'est le cas, s'arrêter et en parler (ce script ne le change pas).
select module, mode, essai_adresse from public.reglages_envois
 where client_id = 'cccccccc-0000-4000-8000-00000000000c' and (module is null or module = 'socle_sms');
select count(*) as sms_deja_envoyes from public.envois where canal = 'sms';

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Brancher brevo_sms
-- ───────────────────────────────────────────────────────────────────────────
update private.fournisseurs_envoi set branche = true where fournisseur = 'brevo_sms' and not branche;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. L'expéditeur SMS du banc, réservé au module socle_sms
--    nom_affiche = l'émetteur affiché sur le téléphone : 3 à 11 caractères, lettres et chiffres, pas seulement des
--    chiffres. Pas de secret_nom : la clé est BREVO_API_KEY de la fonction expediteur.
-- ───────────────────────────────────────────────────────────────────────────
insert into public.expediteurs (client_id, module, canal, fournisseur, identite, nom_affiche, parametres, statut)
select 'cccccccc-0000-4000-8000-00000000000c', 'socle_sms', 'sms', 'brevo_sms', 'OMEGA', 'OMEGA', '{}'::jsonb, 'actif'
where not exists (select 1 from public.expediteurs x
                  where x.client_id = 'cccccccc-0000-4000-8000-00000000000c' and x.canal = 'sms'
                    and x.fournisseur = 'brevo_sms' and x.module = 'socle_sms');

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Le module d'essai socle_sms en mode réel
-- ───────────────────────────────────────────────────────────────────────────
insert into public.reglages_envois (client_id, module, mode, plages, feries, delai_min, plafond_destinataire_jour, plafond_jour, canaux)
select 'cccccccc-0000-4000-8000-00000000000c', 'socle_sms', 'reel',
       '[{"jours":[1,2,3,4,5,6,7],"debut":"00:00","fin":"23:59"}]'::jsonb, true, interval '0', 5, 20, array['sms']
where not exists (select 1 from public.reglages_envois g
                  where g.client_id = 'cccccccc-0000-4000-8000-00000000000c' and g.module = 'socle_sms');

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Le SMS d'essai (transactionnel : pas de mention STOP). Écrire le numéro de Teo ci-dessous (+33…).
-- ───────────────────────────────────────────────────────────────────────────
do $$
declare
  v_numero text := '+33XXXXXXXXX';   -- ← le portable de Teo
  v_envoi uuid;
  v_entite uuid := (select e.id from public.entites e
                    where e.client_id = 'cccccccc-0000-4000-8000-00000000000c' and e.principale limit 1);
  v_statut text;
begin
  if v_numero !~ '^\+33[67][0-9]{8}$' then
    raise exception 'Écrire le numéro de portable de Teo (+336… ou +337…) avant de jouer ce bloc.';
  end if;
  v_envoi := private.preparer_envoi('cccccccc-0000-4000-8000-00000000000c', 'socle_sms', null, null, 'sms',
               jsonb_build_object('adresse', v_numero, 'nom', 'Teo'), null, '{}'::jsonb, null,
               'Omega : essai d''envoi SMS sur la recette. Aucune action à faire.', null,
               'mise_en_service_sms:' || to_char(now(), 'YYYYMMDDHH24MI'), v_entite, true, false, null, '{}'::jsonb);
  select statut || coalesce(' / ' || verrou || ' : ' || motif, '') into v_statut from public.envois where id = v_envoi;
  if v_statut like 'a_valider%' then
    v_statut := private.envoi_valide(v_envoi);
  end if;
  raise notice 'Envoi % : %', v_envoi, v_statut;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 5. Vérifier, une à deux minutes plus tard
--    Attendu : statut « envoye », reference_externe = messageId Brevo, un travail envois.brevo_sms « fait » ;
--    puis (webhook) un événement « remis » quand le téléphone l'a reçu.
-- ───────────────────────────────────────────────────────────────────────────
select e.id, e.statut, e.verrou, e.motif, e.fournisseur, e.reference_externe, e.erreur, e.essais, e.envoye_le, e.remise
  from public.envois e
 where e.client_id = 'cccccccc-0000-4000-8000-00000000000c' and e.module = 'socle_sms'
 order by e.cree_le desc limit 3;
select t.id, t.genre, t.etat, t.resultat, t.erreur from public.travaux t
 where t.genre = 'envois.brevo_sms' order by t.cree_le desc limit 3;
select v.type, v.survenu_le, v.detail from public.envois_evenements v
  join public.envois e on e.id = v.envoi_id
 where e.module = 'socle_sms' order by v.recu_le desc limit 5;
-- Si l'envoi reste « pret » ou repasse « pret » avec une erreur : lire le journal de la fonction expediteur.
-- Erreur Brevo 402 / « not enough credits » : crédits SMS absents (achat chez Brevo, rubrique SMS).

-- ───────────────────────────────────────────────────────────────────────────
-- 6. Retour arrière (si besoin)
-- ───────────────────────────────────────────────────────────────────────────
-- update public.reglages_envois set mode = 'coupe' where client_id = 'cccccccc-0000-4000-8000-00000000000c' and module = 'socle_sms';
-- update public.expediteurs set statut = 'suspendu' where client_id = 'cccccccc-0000-4000-8000-00000000000c' and module = 'socle_sms' and canal = 'sms';
-- update private.fournisseurs_envoi set branche = false where fournisseur = 'brevo_sms';
