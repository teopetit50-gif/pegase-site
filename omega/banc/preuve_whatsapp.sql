-- Preuve d'envoi WhatsApp sur la RECETTE (ygwbgpowzlbdaajlsqkn) — A2, 18/10/2026 (corrigé le 18/10 après le refus
-- du garde : sur la recette, preparer_envoi prend p_gabarit/p_variables et public.envois n'a pas de modele_externe).
-- À JOUER PAR LE COORDINATEUR, partie par partie (execute_sql). Idempotent ; aucun DROP. AUCUNE MIGRATION :
-- le socle porte déjà les modèles WhatsApp par les gabarits — gabarits_messages.modele_externe, que
-- commencer_envoi rend à l'expéditeur avec la langue du gabarit. La langue d'un gabarit n'a que deux lettres ;
-- expediteur v16 (à déployer d'abord, SHA de ce commit) lit « nom@langue Meta » : hello_world@en_US.
-- Chemin : gabarit daliro.preuve_whatsapp validé → preparer_envoi(p_gabarit) → validation → tache_envois →
-- travail envois.meta_whatsapp → POST /{phone_number_id}/messages → confirmer_envoi(wamid) → statuts par
-- reception/whatsapp → noter_remise.
-- Le numéro de Teo (+33768163443) est dans la liste de test Meta.
-- Premier essai (envoi 7a6fc9bc, cle :1) : bloque CONSENTEMENT_ABSENT et mode « essai ». Corrigé ici :
--   · WhatsApp exige un accord préalable (canaux_envoi.consentement_toujours) : partie 1 bis, porte
--     noter_consentement, au nom du gérant du banc, source « ecrit » (Teo l'a demandé lui-même) ;
--   · le mode effectif (reglages_envois_effectifs) vaut « essai » dès que la ligne ORGANISATION (module null) est
--     en essai, et cette ligne ne peut pas être « reel » (contrainte reglages_envois_reel_par_module) : pour un
--     envoi réel, la ligne organisation passe à mode NULL (aucune contrainte ; « coupe » et « essai » des autres
--     modules restent les leurs) et daliro à reel, le temps de l'envoi ; partie 4 remet les deux en essai ;
--   · nouvelle clé banc:a2:preuve-whatsapp:2 (le mode est figé à la préparation).

-- ───────────────────────────────────────────────────────────────────────────
-- 0. Contrôles (lecture seule)
-- ───────────────────────────────────────────────────────────────────────────
select fournisseur, canal, branche from private.fournisseurs_envoi where fournisseur = 'meta_whatsapp';
-- Attendu : branche = true.
select id, module, identite, parametres, statut from public.expediteurs where id::text like 'ab8778d8%';
-- Attendu : daliro, +15551998680, phone_number_id 1304208509431404, actif.
select module, mode, canaux from public.reglages_envois
 where client_id = 'cccccccc-0000-4000-8000-00000000000c' and (module is null or module = 'daliro');
-- Attendu pendant l'envoi : daliro reel, canaux avec whatsapp ; organisation (module null) pas en essai ni coupé.
-- En essai, le socle remplace le destinataire par l'adresse d'essai (un e-mail) : l'envoi ne serait pas un WhatsApp.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Le gabarit daliro.preuve_whatsapp (modèle Meta hello_world, en_US), validé
-- ───────────────────────────────────────────────────────────────────────────
insert into public.gabarits_messages (client_id, module, code, langue, canal, libelle, corps, transactionnel, modele_externe)
select 'cccccccc-0000-4000-8000-00000000000c', 'daliro', 'daliro.preuve_whatsapp', 'fr', 'whatsapp',
       'Preuve WhatsApp (modèle Meta hello_world)',
       'Hello World (modèle Meta hello_world, preuve d''envoi WhatsApp du banc A2).', true, 'hello_world@en_US'
where not exists (select 1 from public.gabarits_messages g
                  where g.client_id = 'cccccccc-0000-4000-8000-00000000000c' and g.code = 'daliro.preuve_whatsapp');
select public.valider_gabarit(g.id, 'coordinateur (preuve WhatsApp, banc A2)')
  from public.gabarits_messages g
 where g.client_id = 'cccccccc-0000-4000-8000-00000000000c' and g.code = 'daliro.preuve_whatsapp' and g.statut = 'brouillon';
select id, code, langue, canal, statut, modele_externe from public.gabarits_messages
 where client_id = 'cccccccc-0000-4000-8000-00000000000c' and code = 'daliro.preuve_whatsapp';
-- Attendu : valide, modele_externe hello_world@en_US.

-- ───────────────────────────────────────────────────────────────────────────
-- 1 bis. L'accord WhatsApp de Teo (porte noter_consentement, au nom du gérant du banc)
-- ───────────────────────────────────────────────────────────────────────────
do $$
declare
  v_gerant uuid := (select id from auth.users where email = 'gerant@banc-varelo.test');
  v_id uuid;
begin
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_id := public.noter_consentement('cccccccc-0000-4000-8000-00000000000c', 'whatsapp', '+33768163443', 'ecrit',
            'transactionnel',
            'Teo (Omega) a demandé par écrit le 18/10/2026 à recevoir le message d''essai WhatsApp sur ce numéro.',
            null, 'daliro');
  perform tests.redevenir_admin();
  raise notice 'consentement %', v_id;
end $$;
select canal, adresse, portee, source, module, retire_le from public.consentements
 where client_id = 'cccccccc-0000-4000-8000-00000000000c' and canal = 'whatsapp';
-- Attendu : une ligne whatsapp, transactionnel, ecrit, non retirée.

-- ───────────────────────────────────────────────────────────────────────────
-- 1 ter. Mode réel le temps de l'envoi : organisation à NULL, daliro à reel (canal whatsapp)
-- ───────────────────────────────────────────────────────────────────────────
-- Noter d'abord la valeur actuelle de la ligne organisation pour la remettre en partie 4 (attendu : essai).
select mode from public.reglages_envois where client_id = 'cccccccc-0000-4000-8000-00000000000c' and module is null;
update public.reglages_envois set mode = null
 where client_id = 'cccccccc-0000-4000-8000-00000000000c' and module is null and mode = 'essai';
update public.reglages_envois set mode = 'reel', canaux = array['whatsapp']
 where client_id = 'cccccccc-0000-4000-8000-00000000000c' and module = 'daliro';
select private.reglages_envois_effectifs('cccccccc-0000-4000-8000-00000000000c', 'daliro') ->> 'mode' as mode_effectif;
-- Attendu : reel. Sinon, s'arrêter.

-- ───────────────────────────────────────────────────────────────────────────
-- 2. L'envoi, validé puis confié
-- ───────────────────────────────────────────────────────────────────────────
do $$
declare
  v_numero text := '+33768163443';   -- le portable de Teo (liste de test Meta)
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_entite uuid := (select e.id from public.entites e where e.client_id = 'cccccccc-0000-4000-8000-00000000000c' and e.principale limit 1);
  v_envoi uuid;
  v_statut text;
begin
  perform tests.redevenir_admin();
  v_envoi := private.preparer_envoi(
    p_client => v_client, p_module => 'daliro', p_objet_type => null, p_objet_id => null, p_canal => 'whatsapp',
    p_destinataire => jsonb_build_object('adresse', v_numero, 'nom', 'Teo', 'langue', 'fr'),
    p_gabarit => 'daliro.preuve_whatsapp', p_variables => '{}'::jsonb,
    p_cle_idempotence => 'banc:a2:preuve-whatsapp:2', p_entite => v_entite, p_transactionnel => true);
  select statut || coalesce(' / ' || verrou || ' : ' || motif, '') into v_statut from public.envois where id = v_envoi;
  if v_statut like 'a_valider%' then
    v_statut := private.envoi_valide(v_envoi);
  end if;
  perform private.tache_envois(now());
  raise notice 'Envoi % : %', v_envoi, v_statut;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Lectures, une à deux minutes plus tard (cron omega-expediteur)
-- ───────────────────────────────────────────────────────────────────────────
select e.id, e.statut, e.mode, e.verrou, e.motif, e.fournisseur, g.modele_externe, e.destinataire_adresse,
       e.reference_externe, e.erreur, e.essais, e.envoye_le, e.remise
  from public.envois e left join public.gabarits_messages g on g.id = e.gabarit_id
 where e.client_id = 'cccccccc-0000-4000-8000-00000000000c' and e.cle_idempotence = 'banc:a2:preuve-whatsapp:2';
-- Attendu : mode reel, fournisseur meta_whatsapp, statut envoye, reference_externe = wamid.…
select t.id, t.genre, t.etat, t.essais, t.resultat, t.erreur, t.fini_le from public.travaux t
 where t.genre = 'envois.meta_whatsapp'
   and t.charge ->> 'envoi' = (select e.id::text from public.envois e
                               where e.client_id = 'cccccccc-0000-4000-8000-00000000000c'
                                 and e.cle_idempotence = 'banc:a2:preuve-whatsapp:2');
-- Attendu : fini, resultat {fournisseur_id: wamid…, remis_a}. Erreurs : META_400_131030 numéro non autorisé ;
-- META_400_132001 modèle absent dans cette langue (expediteur pas en v16 : il enverrait « hello_world@en_US »
-- tel quel, ou la langue fr) ; META_401_190 jeton.
select v.type, v.survenu_le, v.detail, v.recu_le from public.envois_evenements v
  join public.envois e on e.id = v.envoi_id
 where e.cle_idempotence = 'banc:a2:preuve-whatsapp:2' order by v.recu_le;
-- Attendu, si le webhook Meta pointe sur …/functions/v1/reception/whatsapp (champ « messages » abonné) :
-- un événement « remis » (code delivered). « sent » et « read » ne sont pas notés.

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Après la preuve (dès l'envoi « envoye » ou en échec) : remettre l'organisation et daliro en essai.
--    Le gabarit et l'accord de Teo peuvent rester.
-- ───────────────────────────────────────────────────────────────────────────
update public.reglages_envois set mode = 'essai'
 where client_id = 'cccccccc-0000-4000-8000-00000000000c' and (module is null or module = 'daliro');
select module, mode from public.reglages_envois
 where client_id = 'cccccccc-0000-4000-8000-00000000000c' and (module is null or module = 'daliro');
