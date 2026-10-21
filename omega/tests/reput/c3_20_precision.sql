-- c3_20 — REPUT : la précision demandée quand il n'y a qu'une pièce, sans texte, côté base (sans modèle, sans coût).
-- Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_19 (aides tests.c3_*, dont tests.c3_reception de
-- c3_02) et les migrations c3_01 à c3_20. Pièces fictives (chemins sans fichier). Banc en essai. runtests() annule tout.

create or replace function tests.c3_20_reception(p_client uuid, p_canal text, p_de text, p_sujet text, p_corps text, p_pieces int)
returns bigint language plpgsql as $$
declare v_rec bigint;
begin
  v_rec := tests.c3_reception(p_client, p_canal, p_de, null, p_sujet, p_corps);
  update public.receptions set pieces = (select coalesce(jsonb_agg(jsonb_build_object('nom', 'IMG_' || i || '.jpg', 'mime', 'image/jpeg', 'taille', 1000,
                                                                                    'chemin', p_client::text || '/receptions/c3-20/IMG_' || i || '.jpg')), '[]'::jsonb)
                                         from generate_series(1, p_pieces) i)
  where id = v_rec;
  return v_rec;
end $$;

create or replace function tests.test_c3_20_precision() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_rec bigint; v_j jsonb; p public.reput_reponses;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai', 'essais@omegaai.fr', array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');
  perform public.reput_installer(v_client);

  -- ── Les mots qui parlent ──
  return next ok(not private.reput_parle('IMG_2041.JPG') and not private.reput_parle('Fwd: photo') and not private.reput_parle(null),
                 'Un nom de fichier, « Fwd: photo » ou rien ne parlent pas');
  return next ok(not private.reput_parle(E'\n\nEnvoyé de mon iPhone'), 'Une signature automatique (« Envoyé de mon iPhone ») ne parle pas');
  return next ok(private.reput_parle('Voici le devis signé'), 'Une phrase parle');

  -- ── Une photo sans un mot : la précision, aussitôt, sans modèle ──
  v_rec := tests.c3_20_reception(v_client, 'email', 'c3-20a@exemple.test', 'IMG_2041.JPG', E'\n\nEnvoyé de mon iPhone', 1);
  v_j := public.reput_commencer(v_rec);
  return next is(v_j ->> 'statut', 'preparee', 'Pièce sans texte : la demande est préparée dans la base, l''ouvrier n''appelle pas l''IA');
  select * into p from public.reput_reponses x where x.id = (v_j ->> 'reponse')::uuid;
  return next ok(p.corps like '%Nous avons bien reçu votre pièce jointe%pouvez-vous nous l''écrire en quelques mots%',
                 'La réponse demande la précision qui manque');
  return next ok(not p.couverte and p.sujet = 'autre' and p.statut = 'a_valider', 'Hors base, sujet « autre » : relue avant envoi');
  return next ok(p.modele = 'regle:sans_texte' and p.cout_eur = 0 and p.jetons_entree = 0, 'Aucun appel au modèle, coût nul');
  return next ok(p.raison like 'Message sans texte (1 pièce jointe)%', 'La raison dit pourquoi');
  return next is(public.reput_commencer(v_rec) ->> 'statut', 'deja', 'Rejouée, la demande ne repart pas');

  -- ── WhatsApp : deux photos, rien d'autre ──
  v_rec := tests.c3_20_reception(v_client, 'whatsapp', '+33600202020', null, null, 2);
  v_j := public.reput_commencer(v_rec);
  return next ok(v_j ->> 'statut' = 'preparee'
                 and (select x.raison from public.reput_reponses x where x.id = (v_j ->> 'reponse')::uuid) like 'Message sans texte (2 pièces jointes)%',
                 'WhatsApp, deux photos sans un mot : la même précision');

  -- ── Ce qui suit le chemin habituel ──
  v_rec := tests.c3_20_reception(v_client, 'email', 'c3-20b@exemple.test', 'Devis', 'Voici le devis signé.', 1);
  return next is(public.reput_commencer(v_rec) ->> 'statut', 'a_preparer', 'Une pièce avec un texte qui parle : le modèle prépare');
  v_rec := tests.c3_20_reception(v_client, 'email', 'c3-20c@exemple.test', null, 'Une question sur vos horaires de samedi.', 0);
  return next is(public.reput_commencer(v_rec) ->> 'statut', 'a_preparer', 'Sans pièce, avec un texte qui parle : le modèle prépare');
  v_rec := tests.c3_20_reception(v_client, 'email', 'c3-20d@exemple.test', 'Ma porte', 'La porte d''entrée frotte, vous pouvez venir ?', 0);
  perform public.reput_commencer(v_rec);
  v_rec := tests.c3_20_reception(v_client, 'email', 'c3-20d@exemple.test', null, null, 1);
  return next is(public.reput_commencer(v_rec) ->> 'statut', 'a_preparer',
                 'La photo qui suit un message du même client : le modèle la lit avec le message précédent');
end $f$;

select * from runtests('tests'::name, '^test_c3_20_');
