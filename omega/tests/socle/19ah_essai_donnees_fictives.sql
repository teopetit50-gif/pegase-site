-- Socle 19ah — l'essai d'un envoi de santé avec des données fictives : seulement en essai, seulement sur la recette,
-- et les autres verrous restent. Après 00_installation.sql d'A5, 19ab, 19ah et 19ah_recette_seulement. Le banc
-- cccccccc-…000c a sa ligne reglages_envois tavaro (essai). runtests() annule tout : aucun envoi ne part.

create or replace function tests.test_socle_19ah_essai_donnees_fictives() returns setof text
language plpgsql as $f$
declare
  banc uuid := 'cccccccc-0000-4000-8000-00000000000c';
  entite uuid := (select e.id from public.entites e where e.client_id = 'cccccccc-0000-4000-8000-00000000000c' and e.principale limit 1);
  suffixe text := gen_random_uuid()::text;
  v_envoi uuid;
  r jsonb;
begin
  perform tests.redevenir_admin();
  return next is((select valeur from private.reglages where cle = 'environnement'), 'recette', 'la recette se déclare recette');
  return next ok(not exists (select 1 from private.fournisseurs_envoi f where f.agree_sante), 'toujours aucun fournisseur agréé santé');
  return next ok(exists (select 1 from public.reglages_envois g where g.client_id = banc and g.module = 'tavaro' and g.mode = 'essai'),
                 'le banc a sa ligne tavaro en essai');
  return next ok(not exists (select 1 from public.reglages_envois g where g.essai_donnees_fictives), 'le drapeau est faux partout au départ');

  -- 1. Sans le drapeau : rien ne change (19ab).
  v_envoi := private.preparer_envoi(banc, 'tavaro', null, null, 'email',
               jsonb_build_object('adresse', 'gerant@banc-varelo.test', 'nom', 'Essai 19ah'), null, '{}'::jsonb,
               'Rendez-vous fictif', 'Patient fictif : rendez-vous le 8 octobre à 9 h.', null,
               'socle19ah:sans:' || suffixe, entite, true, true, null, '{}'::jsonb);
  return next is((select statut || '/' || coalesce(verrou, '') from public.envois where id = v_envoi), 'bloque/SANTE_HORS_CANAL_AGREE',
                 'sans le drapeau : courriel de santé bloqué, SANTE_HORS_CANAL_AGREE');

  -- 2. Le drapeau, en essai, sur la recette.
  update public.reglages_envois set essai_donnees_fictives = true where client_id = banc and module = 'tavaro';
  return next ok((select g.essai_donnees_fictives from public.reglages_envois g where g.client_id = banc and g.module = 'tavaro'),
                 'le drapeau se pose en essai sur la recette');
  v_envoi := private.preparer_envoi(banc, 'tavaro', null, null, 'email',
               jsonb_build_object('adresse', 'gerant@banc-varelo.test', 'nom', 'Essai 19ah'), null, '{}'::jsonb,
               'Rendez-vous fictif', 'Patient fictif : rendez-vous le 8 octobre à 9 h.', null,
               'socle19ah:avec:' || suffixe, entite, true, true, null, '{}'::jsonb);
  return next ok((select statut in ('a_valider', 'differe', 'pret') and mode = 'essai' and donnees_sante from public.envois where id = v_envoi),
                 'avec le drapeau : courriel de santé accepté en essai (' || (select statut || coalesce(' / ' || verrou, '') from public.envois where id = v_envoi) || ')');
  return next is(private.envoi_valide(v_envoi), 'pret', 'validé : pret');
  perform tests.endosser_serveur();
  r := private.commencer_envoi(v_envoi);
  perform tests.redevenir_admin();
  return next ok(coalesce((r ->> 'envoyer')::boolean, false), 'commencer_envoi : envoyer = true (' || coalesce(r ->> 'verrou', r ->> 'raison', '') || ')');
  return next is(r ->> 'mode', 'essai', 'en essai (remise à essai_adresse, jamais au destinataire)');
  return next is(r ->> 'donnees_sante', 'true', 'donnees_sante = true');
  return next is(r ->> 'fournisseur_hds', 'false', 'fournisseur_hds reste la vérité : false');
  return next is(r ->> 'donnees_fictives', 'true', 'donnees_fictives = true : l''expéditeur sait que c''est un essai fictif');

  -- 3. Les autres verrous restent : le SMS de santé (décision D6) reste refusé par le canal.
  v_envoi := private.preparer_envoi(banc, 'tavaro', null, null, 'sms',
               jsonb_build_object('adresse', '+33612345678', 'nom', 'Essai 19ah'), null, '{}'::jsonb,
               null, 'Patient fictif : rendez-vous le 8 octobre à 9 h.', null,
               'socle19ah:sms:' || suffixe, entite, true, true, null, '{}'::jsonb);
  return next is((select statut || '/' || coalesce(verrou, '') from public.envois where id = v_envoi), 'bloque/CANAL_NON_PERMIS',
                 'avec le drapeau, le SMS de santé reste bloqué : CANAL_NON_PERMIS');
  -- Un envoi ordinaire, sans donnée de santé, à un autre destinataire (le précédent est encore « en route » vers le
  -- premier : l'espacement le différerait et commencer_envoi ne rendrait pas la réponse d'un envoi prêt).
  v_envoi := private.preparer_envoi(banc, 'tavaro', null, null, 'email',
               jsonb_build_object('adresse', 'daf@banc-varelo.test', 'nom', 'Essai 19ah bis'), null, '{}'::jsonb,
               'Votre facture', 'Votre facture est disponible.', null,
               'socle19ah:ordinaire:' || suffixe, entite, true, false, null, '{}'::jsonb);
  return next ok((select not donnees_sante from public.envois where id = v_envoi), 'un envoi ordinaire reste sans donnée de santé');
  perform private.envoi_valide(v_envoi);
  perform tests.endosser_serveur();
  r := private.commencer_envoi(v_envoi);
  perform tests.redevenir_admin();
  return next ok(coalesce(r ->> 'donnees_fictives', 'false') = 'false',
                 'et il n''est jamais « fictif » (' || coalesce(r ->> 'statut', r ->> 'raison', r ->> 'verrou', r ->> 'mode', '') || ')');

  -- 4. Jamais en réel.
  return next throws_ok(format('update public.reglages_envois set mode = ''reel'' where client_id = %L and module = ''tavaro''', banc),
                        '23514', null, 'le drapeau interdit le mode réel (CHECK, 23514)');
  return next throws_ok(format('insert into public.reglages_envois (client_id, module, mode, essai_donnees_fictives) values (%L, ''socle_essai'', ''reel'', true)', banc),
                        '23514', null, 'une ligne réelle avec le drapeau est refusée (23514)');

  -- 5. Hors recette : le drapeau ne se pose pas, et celui déjà posé ne joue plus.
  update private.reglages set valeur = 'production' where cle = 'environnement';
  v_envoi := private.preparer_envoi(banc, 'tavaro', null, null, 'email',
               jsonb_build_object('adresse', 'gerant@banc-varelo.test', 'nom', 'Essai 19ah'), null, '{}'::jsonb,
               'Rendez-vous fictif', 'Patient fictif : rendez-vous le 9 octobre à 10 h.', null,
               'socle19ah:prod:' || suffixe, entite, true, true, null, '{}'::jsonb);
  return next is((select statut || '/' || coalesce(verrou, '') from public.envois where id = v_envoi), 'bloque/SANTE_HORS_CANAL_AGREE',
                 'hors recette, même avec le drapeau posé : bloqué, SANTE_HORS_CANAL_AGREE');
  update public.reglages_envois set essai_donnees_fictives = false where client_id = banc and module = 'tavaro';
  return next throws_ok(format('update public.reglages_envois set essai_donnees_fictives = true where client_id = %L and module = ''tavaro''', banc),
                        '42501', null, 'hors recette, le drapeau ne se pose pas (42501)');
end $f$;

select * from runtests('tests'::name, '^test_socle_19ah_');
