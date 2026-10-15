-- b6_19 — DALIRO : la lecture des photos et vocaux par le lecteur (session B6, 06/10/2026), b6_24b.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql et les migrations b6_01 à b6_24b.
-- runtests() annule tout. Le lecteur n'est pas appelé : sa lecture (CONTRAT-MEDIA d'A1) est rendue à la porte
-- public.daliro_media_lu comme il le ferait, avec les droits du serveur.

create or replace function tests.b6_lecture_ranger(p_reception bigint) returns jsonb
language sql security definer set search_path to '' as $$ select private.btp_ranger_reception(p_reception) $$;
create or replace function tests.b6_lecture_demander(p_message uuid) returns bigint
language sql security definer set search_path to '' as $$ select private.btp_demander_lecture(p_message) $$;

create or replace function tests.test_b6_19_lecture() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid;
  v_mo uuid; v_ch uuid; v_lot uuid; v_m uuid; v_eq uuid;
  v_tel text := '7' || lpad((floor(random() * 90000000) + 10000000)::bigint::text, 8, '0');
  v_j date := (now() at time zone 'Europe/Paris')::date;
  v_r bigint; v_msg uuid; v_res jsonb; v_lecture jsonb;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');

  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.btp_tiers (client_id, roles, nom) values (v_client, array['maitre_ouvrage'], 'MO de la lecture') returning id into v_mo;
  insert into public.btp_chantiers (client_id, nom, code_postal, commune, maitre_ouvrage_type, place_client, maitre_ouvrage_id, statut)
  values (v_client, 'Chantier de la lecture', '69100', 'Villeurbanne', 'professionnel', 'titulaire', v_mo, 'ouvert') returning id into v_ch;
  insert into public.btp_lots (client_id, chantier_id, code, libelle, execution) values (v_client, v_ch, '01', 'Lot de la lecture', 'client') returning id into v_lot;
  v_m := public.btp_ecrire_marche(null, v_ch, jsonb_build_object('reference', 'LEC-1', 'mode_prix', 'forfait', 'montant_ht_declare', 1000, 'retenue_taux', 0));
  perform public.btp_ecrire_ligne(null, v_m, jsonb_build_object('designation', 'Travaux', 'unite_lue', 'forfait', 'nature', 'forfait', 'montant_ht', 1000, 'lot_id', v_lot));
  perform public.btp_verifier_marche(v_m);
  insert into public.btp_equipes (client_id, nom) values (v_client, 'Équipe de la lecture') returning id into v_eq;
  insert into public.btp_intervenants (client_id, nom, equipe_id, telephone) values (v_client, 'Chef de la lecture', v_eq, '+33' || v_tel);
  insert into public.btp_passages (client_id, chantier_id, lot_id, equipe_id, tache, debut, fin)
  values (v_client, v_ch, v_lot, v_eq, 'Pose de la lecture', v_j - 1, v_j + 1);

  perform tests.redevenir_admin();
  insert into public.receptions (client_id, module, canal, boite, identifiant_externe, de_adresse, de_nom, corps, pieces, detail)
  values (v_client, 'daliro', 'whatsapp', 'b6-lecture', 'wamid.lecture.1', '33' || v_tel, 'Chef', null,
          jsonb_build_array(jsonb_build_object('nom', 'vocal.ogg', 'mime', 'audio/ogg', 'taille', 12000, 'chemin', v_client || '/receptions/wamid.lecture.1/vocal.ogg'),
                            jsonb_build_object('nom', 'image.jpg', 'mime', 'image/jpeg', 'taille', 80000, 'chemin', v_client || '/receptions/wamid.lecture.1/image.jpg'),
                            jsonb_build_object('nom', 'devis.pdf', 'mime', 'application/pdf', 'taille', 9000, 'chemin', v_client || '/receptions/wamid.lecture.1/devis.pdf')),
          '{"media": {"vocal": true}}')
  returning id into v_r;

  -- ── Les droits ──
  return next ok(not has_function_privilege('authenticated', 'public.daliro_media_lu(bigint, jsonb)', 'execute')
                 and not has_function_privilege('anon', 'public.daliro_media_lu(bigint, jsonb)', 'execute'), 'La porte de retour est au seul serveur');

  -- ── Le travail de lecture ──
  v_msg := (tests.b6_lecture_ranger(v_r) ->> 'message')::uuid;
  perform tests.b6_lecture_demander(v_msg);
  return next is((select t.module || '/' || t.genre from public.travaux t where t.cle = 'media:' || v_r::text), 'daliro/lecteur.media',
                 'Un travail lecteur.media est déposé, clé media:<réception>');
  return next is((select jsonb_array_length(t.charge -> 'pieces') from public.travaux t where t.cle = 'media:' || v_r::text), 2,
                 'Le vocal et la photo, pas le PDF (il suit le chemin des pièces)');
  return next ok((select t.charge ->> 'retour' = 'daliro_media_lu' and t.charge ->> 'contexte' like 'chantier Chantier de la lecture (Villeurbanne)%Pose de la lecture%'
                  from public.travaux t where t.cle = 'media:' || v_r::text), 'Retour daliro_media_lu, le chantier et le passage en cours en contexte');

  -- ── La lecture rendue ──
  v_lecture := jsonb_build_object('reception', v_r, 'de_nom', 'Chef',
    'medias', jsonb_build_array(jsonb_build_object('n', 1, 'nature', 'vocal', 'statut', 'lu', 'transcription', 'Le client veut aussi des garde-corps au R+3, douze mètres. Il manque une palette de plaques.'),
                                jsonb_build_object('n', 2, 'nature', 'photo', 'statut', 'lu')),
    'resume', 'Garde-corps au R+3 demandés ; une palette manque.',
    'demandes', jsonb_build_array(
      jsonb_build_object('nature', 'travail_supplementaire', 'texte', 'Garde-corps au R+3', 'quantite', 12, 'unite', 'ml', 'lieu', 'R+3',
                         'source', jsonb_build_object('media', 1, 'extrait', 'des garde-corps au R+3, douze mètres'), 'verifiee', true),
      jsonb_build_object('nature', 'travail_supplementaire', 'texte', 'Reprise des allèges',
                         'source', jsonb_build_object('media', 2, 'extrait', 'allèges démolies'), 'verifiee', false),
      jsonb_build_object('nature', 'probleme', 'texte', 'Palette de plaques manquante',
                         'source', jsonb_build_object('media', 1, 'extrait', 'Il manque une palette de plaques'), 'verifiee', true)),
    'cout_eur', 0.0142, 'appels_ia', 1);
  v_res := public.daliro_media_lu(v_r, v_lecture);
  return next is(jsonb_array_length(v_res -> 'avenants'), 1, 'Une demande vérifiée : un avenant ; celle de la photo, à confirmer : aucun');
  return next is((select a.statut || '/' || a.objet || '/' || (a.origine ->> 'canal') || '/' || (a.origine ->> 'message')
                  from public.btp_avenants a where a.id = (v_res -> 'avenants' ->> 0)::uuid),
                 'brouillon/Garde-corps au R+3 — 12 ml (R+3)/vocal/' || v_msg::text, 'Avenant brouillon : objet, quantité, lieu ; origine le vocal du message');
  return next is((v_res ->> 'alertes')::int, 1, 'Le problème vérifié lève une alerte');
  return next ok((select m.lecture ->> 'resume' = 'Garde-corps au R+3 demandés ; une palette manque.' and m.lu_le is not null and not (m.lecture ? 'cout_eur')
                  from public.btp_messages m where m.id = v_msg), 'La lecture est gardée sur le message (sans le coût)');
  return next is(public.daliro_media_lu(v_r, v_lecture) ->> 'ignore', 'déjà lue', 'Rendre deux fois ne double rien');
  return next ok(tests.b6_journal(v_client, 'daliro.media_lu', v_msg::text) is not null, 'La lecture est au journal');
end $f$;

select * from runtests('tests'::name, '^test_b6_19_');
