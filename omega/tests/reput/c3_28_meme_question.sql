-- c3_28 — REPUT, correctif TREPUT-02 : la même question sur deux canaux = une seule réponse à valider, sans 2ᵉ appel au modèle.
-- Reproduit le cas Céleste (courriel puis formulaire, même question). Exécutable tel quel par execute_sql sur la RECETTE, après
-- c3_00 à c3_27 (aides tests.c3_*, dont tests.c3_15_demande de c3_15) et les migrations c3_01 à c3_28. runtests() annule tout.

create or replace function tests.test_c3_28_meme_question() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_a uuid; v_b uuid; v_c uuid; v_j jsonb; v_rec bigint; v_dvb uuid; v_x uuid; v_y uuid; v_dvx uuid;
  q text := 'Bonjour, avez-vous des disponibilités pour poser une cuisine en novembre ? Merci, Nora';
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);

  return next ok(private.reput_meme_question(q, 'Avez-vous des disponibilites pour poser une cuisine en novembre ?')
                 and not private.reput_meme_question(q, 'Quel est le prix d''une cuisine en chêne ?'),
                 'Même question : mêmes mots (casse, accents, ponctuation ignorés) ; une autre question ne l''est pas');

  -- ── Le cas Céleste : courriel, puis formulaire, même question ──
  v_a := tests.c3_15_demande(v_client, 'email', 'c3-28-nora@exemple.test', 'Fictive Céleste', q, now() - interval '20 minutes');
  perform public.reput_deposer_reponse(v_a, jsonb_build_object('sujet', 'rendez_vous', 'langue', 'fr', 'couverte', false,
            'corps', 'Nous regardons le planning de novembre et revenons vers vous.'));
  v_rec := tests.c3_reception(v_client, 'formulaire', 'c3-28-nora@exemple.test', 'Fictive Céleste', 'Formulaire du site', q);
  v_j := public.reput_commencer(v_rec);
  v_b := (v_j ->> 'demande')::uuid;
  return next is(v_j ->> 'statut', 'regroupee', 'La 2ᵉ demande est rattachée à la 1ʳᵉ : l''ouvrier n''appelle pas le modèle');
  return next ok((select statut = 'ignoree' and regroupee_avec = v_a from public.reput_demandes where id = v_b),
                 'Elle est marquée regroupée avec la première');
  return next is((select count(*)::int from public.reput_reponses where demande_id = v_b), 0, 'Aucune réponse préparée pour la 2ᵉ');
  return next is((select count(*)::int from public.demandes_validation d where d.client_id = v_client and d.module = 'reput'
                  and d.statut = 'en_attente' and d.objet_id in (v_a::text, v_b::text)), 1, 'Une seule validation en attente');
  return next ok(tests.c3_journal(v_client, 'reput.demande_doublon', v_b::text) is not null, 'Journal : reput.demande_doublon');

  -- ── Une autre question dans le même dossier : le modèle prépare (une réponse qui couvre tout) ──
  v_rec := tests.c3_reception(v_client, 'formulaire', 'c3-28-nora@exemple.test', 'Fictive Céleste', 'Formulaire du site',
                              'Et quel serait le prix pour un plan de travail en chêne de 3 mètres ?');
  return next is(public.reput_commencer(v_rec) ->> 'statut', 'a_preparer', 'Une question différente suit le chemin habituel');

  -- ── Le regroupement couvre aussi une réponse à l'envoi bloqué ──
  v_x := tests.c3_15_demande(v_client, 'email', 'c3-28-paul@exemple.test', 'Fictif Paul', 'Ouvert samedi ?', now() - interval '30 minutes');
  v_j := public.reput_deposer_reponse(v_x, jsonb_build_object('sujet', 'horaires', 'langue', 'fr', 'couverte', false, 'corps', 'Nous vérifions.'));
  v_dvx := (v_j ->> 'demande_validation')::uuid;
  update public.reput_reponses set statut = 'bloquee' where demande_id = v_x;
  update public.reput_demandes set statut = 'bloquee' where id = v_x;
  v_y := tests.c3_15_demande(v_client, 'email', 'c3-28-paul@exemple.test', 'Fictif Paul', 'Et dimanche matin, vous êtes là ?');
  perform public.reput_deposer_reponse(v_y, jsonb_build_object('sujet', 'horaires', 'langue', 'fr', 'couverte', false, 'corps', 'Nous vérifions samedi et dimanche.'));
  perform private.reput_regrouper();
  return next ok((select statut = 'ignoree' and regroupee_avec = v_y from public.reput_demandes where id = v_x)
                 and (select statut from public.demandes_validation where id = v_dvx) = 'annulee',
                 'Une réponse plus ancienne à l''envoi bloqué cède la place : sa validation est annulée');
end $f$;

select * from runtests('tests'::name, '^test_c3_28_');
