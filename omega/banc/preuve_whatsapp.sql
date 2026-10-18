-- Preuve d'envoi WhatsApp sur la RECETTE (ygwbgpowzlbdaajlsqkn) — A2, 18/10/2026.
-- À JOUER PAR LE COORDINATEUR, partie par partie (execute_sql). Idempotent ; aucun DROP.
-- UN envoi par le chemin normal : preparer_envoi → validation → tache_envois (confier_envoi) → travail
-- envois.meta_whatsapp → expediteur v15 → POST /{phone_number_id}/messages (modèle hello_world, en_US)
-- → confirmer_envoi(wamid) ; puis les statuts sent/delivered reviennent par reception/whatsapp → noter_remise.
-- expediteur v15 envoie un MODÈLE quand l'envoi porte modele_externe : langue = envois.langue, sinon la
-- langue du destinataire, sinon fr. hello_world n'a pas de variable.
-- Le numéro de Teo se pose ligne « v_numero » de la partie 2 (format international, ex. +33612345678).
-- Avec le numéro de test Meta, le destinataire doit figurer dans la liste des numéros autorisés de l'app
-- (WhatsApp → Configuration de l'API → « À »), sinon Meta répond 131030 (échec définitif, rien ne part).

-- ───────────────────────────────────────────────────────────────────────────
-- 0. Contrôles (lecture seule)
-- ───────────────────────────────────────────────────────────────────────────
select fournisseur, canal, branche from private.fournisseurs_envoi where fournisseur = 'meta_whatsapp';
-- Attendu : branche = true.
select id, module, identite, parametres, statut from public.expediteurs where id::text like 'ab8778d8%';
-- Attendu : daliro, +15551998680, phone_number_id 1304208509431404, actif.
select module, mode, canaux, delai_min from public.reglages_envois
 where client_id = 'cccccccc-0000-4000-8000-00000000000c' and (module is null or module = 'daliro');
-- Le mode effectif est le plus prudent de l'organisation (module null) et du module. En « essai », le socle
-- remplace le destinataire par l'adresse d'essai (un e-mail) : l'envoi WhatsApp échouerait. La partie 1
-- crée un réglage daliro « reel » s'il n'existe pas ; s'il existe en essai ou coupé, elle s'arrête.
-- Les arguments 7 et 8 de preparer_envoi doivent être le modèle externe et ses paramètres (vérifié en partie 2) :
select pg_get_function_arguments('private.preparer_envoi'::regproc);

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Le module daliro du banc en mode réel pour WhatsApp
-- ───────────────────────────────────────────────────────────────────────────
do $$
declare v_mode text;
begin
  select g.mode into v_mode from public.reglages_envois g
   where g.client_id = 'cccccccc-0000-4000-8000-00000000000c' and g.module = 'daliro';
  if v_mode is null then
    insert into public.reglages_envois (client_id, module, mode, plages, feries, delai_min,
                                        plafond_destinataire_jour, plafond_jour, canaux)
    values ('cccccccc-0000-4000-8000-00000000000c', 'daliro', 'reel',
            '[{"jours":[1,2,3,4,5,6,7],"debut":"00:00","fin":"23:59"}]'::jsonb, true, interval '0', 5, 20,
            array['whatsapp']);
    raise notice 'réglage daliro créé (reel, whatsapp)';
  elsif v_mode <> 'reel' then
    raise exception 'Le réglage daliro du banc est « % » : rien n''est changé. Le passer en reel (canal whatsapp) d''abord, sur accord.', v_mode;
  else
    raise notice 'réglage daliro déjà en reel';
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. L'envoi (modèle hello_world, en_US), validé puis confié
-- ───────────────────────────────────────────────────────────────────────────
do $$
declare
  v_numero text := '+33XXXXXXXXX';   -- ← le portable de Teo, format international
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_entite uuid := (select e.id from public.entites e where e.client_id = 'cccccccc-0000-4000-8000-00000000000c' and e.principale limit 1);
  v_noms text[] := (select p.proargnames from pg_proc p where p.oid = 'private.preparer_envoi'::regproc);
  v_envoi uuid;
  v_statut text;
begin
  if v_numero !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Écrire le numéro de Teo au format international (+33…) avant de jouer ce bloc.';
  end if;
  if v_noms is null or v_noms[7] !~ 'modele' or v_noms[8] !~ 'param' then
    raise exception 'preparer_envoi n''a pas modèle/paramètres en 7e et 8e position (%, %) : rien n''est fait, en parler à A2.',
      v_noms[7], v_noms[8];
  end if;
  perform tests.redevenir_admin();
  v_envoi := private.preparer_envoi(v_client, 'daliro', null, null, 'whatsapp',
    jsonb_build_object('adresse', v_numero, 'nom', 'Teo', 'langue', 'en_US'),
    'hello_world', '{}'::jsonb,
    null,
    'Modèle Meta hello_world (preuve d''envoi WhatsApp, banc A2).',
    null, 'banc:a2:preuve-whatsapp:1', v_entite, true, false, null, '{}'::jsonb);
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
select e.id, e.statut, e.verrou, e.motif, e.fournisseur, e.modele_externe, e.langue, e.reference_externe,
       e.erreur, e.essais, e.envoye_le, e.remise
  from public.envois e
 where e.client_id = 'cccccccc-0000-4000-8000-00000000000c' and e.cle_idempotence = 'banc:a2:preuve-whatsapp:1';
-- Attendu : fournisseur meta_whatsapp, langue en_US (ou null), statut envoye, reference_externe = wamid.…
-- Si langue vaut autre chose que en_US : Meta répond 132001 (modèle absent dans cette langue) ; en parler à A2.
select t.id, t.genre, t.etat, t.essais, t.resultat, t.erreur, t.fini_le from public.travaux t
 where t.genre = 'envois.meta_whatsapp'
   and t.charge ->> 'envoi' = (select e.id::text from public.envois e
                               where e.client_id = 'cccccccc-0000-4000-8000-00000000000c'
                                 and e.cle_idempotence = 'banc:a2:preuve-whatsapp:1');
-- Attendu : fini, resultat {fournisseur_id: wamid…, remis_a}. Erreur META_400_131030 : numéro non autorisé (voir en-tête).
select v.type, v.survenu_le, v.detail, v.recu_le from public.envois_evenements v
  join public.envois e on e.id = v.envoi_id
 where e.cle_idempotence = 'banc:a2:preuve-whatsapp:1' order by v.recu_le;
-- Attendu, si le webhook Meta pointe sur …/functions/v1/reception/whatsapp (champ « messages » abonné) :
-- un événement « remis » (code delivered) quand le téléphone a reçu le message. « sent » et « read » ne
-- sont pas notés (l'envoi est déjà « envoye »).
