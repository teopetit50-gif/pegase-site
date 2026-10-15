-- Socle 19ab — la santé des envois : canal, fournisseur, et ce que l'ouvrier reçoit.
-- Après 00_installation.sql d'A5 (tests.redevenir_admin, tests.endosser_serveur, runtests), le banc
-- cccccccc-…000c avec reglages_envois (tavaro, essai, plages 00:00–23:59). runtests() annule tout.

create or replace function tests.test_socle_19ab_sante_envois() returns setof text
language plpgsql as $f$
declare
  banc uuid := 'cccccccc-0000-4000-8000-00000000000c';
  entite uuid := (select e.id from public.entites e where e.client_id = 'cccccccc-0000-4000-8000-00000000000c' and e.principale limit 1);
  suffixe text := gen_random_uuid()::text;
  v_envoi uuid;
  r jsonb;
begin
  perform tests.redevenir_admin();
  return next ok(entite is not null, 'le banc a une entité principale');
  return next ok(not exists (select 1 from private.fournisseurs_envoi f where f.agree_sante),
                 'aucun fournisseur agréé santé (décision de Teo sur preuve HDS)');

  -- (c) Tavaro n'est pas un contexte de santé ; un SMS marqué santé est pourtant refusé par le canal, quel que soit le fournisseur.
  v_envoi := private.preparer_envoi(banc, 'tavaro', null, null, 'sms',
               jsonb_build_object('adresse', '+33612345678', 'nom', 'Essai 19ab'), null, '{}'::jsonb,
               null, 'Votre résultat d''analyse est disponible.', null,
               'socle19ab:sms:' || suffixe, entite, true, true, null, '{}'::jsonb);
  return next is((select statut || '/' || coalesce(verrou, '') from public.envois where id = v_envoi), 'bloque/CANAL_NON_PERMIS',
                 'SMS marqué santé hors module santé : bloqué par le canal (CANAL_NON_PERMIS), jamais différé');

  -- (a) Le même contenu par courriel : bloqué par le fournisseur (brevo non agréé), aucun repli, aucun travail.
  v_envoi := private.preparer_envoi(banc, 'tavaro', null, null, 'email',
               jsonb_build_object('adresse', 'gerant@banc-varelo.test', 'nom', 'Essai 19ab'), null, '{}'::jsonb,
               'Résultat d''analyse', 'Votre résultat d''analyse est disponible.', null,
               'socle19ab:email:' || suffixe, entite, true, true, null, '{}'::jsonb);
  return next is((select statut || '/' || coalesce(verrou, '') from public.envois where id = v_envoi), 'bloque/SANTE_HORS_CANAL_AGREE',
                 'courriel marqué santé : bloqué, SANTE_HORS_CANAL_AGREE (aucun fournisseur agréé)');
  return next ok(not exists (select 1 from public.travaux t where t.cle = 'envoi:' || v_envoi::text),
                 'aucun travail déposé pour un envoi bloqué');

  -- (d) Un courriel ordinaire, transactionnel, sans donnée de santé : inchangé.
  v_envoi := private.preparer_envoi(banc, 'tavaro', null, null, 'email',
               jsonb_build_object('adresse', 'gerant@banc-varelo.test', 'nom', 'Essai 19ab'), null, '{}'::jsonb,
               'Votre facture', 'Votre facture est disponible dans votre espace.', null,
               'socle19ab:ordinaire:' || suffixe, entite, true, false, null, '{}'::jsonb);
  return next ok((select statut in ('a_valider', 'differe', 'pret') from public.envois where id = v_envoi),
                 'courriel ordinaire : accepté (' || (select statut || coalesce(' / ' || verrou, '') from public.envois where id = v_envoi) || ')');

  -- (e) Validé puis commencé par le serveur : la réponse rendue à l'ouvrier porte les deux clés.
  return next is(private.envoi_valide(v_envoi), 'pret', 'validé : pret');
  perform tests.endosser_serveur();
  r := private.commencer_envoi(v_envoi);
  perform tests.redevenir_admin();
  return next ok(coalesce((r ->> 'envoyer')::boolean, false),
                 'commencer_envoi : envoyer = true (' || coalesce(r ->> 'verrou', r ->> 'raison', r ->> 'statut', '') || ')');
  return next is(r ->> 'mode', 'essai', 'mode essai');
  return next is(r ->> 'donnees_sante', 'false', 'clé donnees_sante rendue (false)');
  return next is(r ->> 'fournisseur_hds', 'false', 'clé fournisseur_hds rendue (brevo : non agréé)');
  return next ok(r ? 'donnees_sante' and r ? 'fournisseur_hds', 'les deux clés sont présentes');
end $f$;

select * from runtests('tests'::name, '^test_socle_19ab_');
