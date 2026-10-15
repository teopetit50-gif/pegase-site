-- 23 — Le point du matin de Tamila (migration b4_14). Après 00_jeu_tamila.sql, b4_01 à b4_14. runtests() annule tout.

create or replace function tests.test_b4_23_point_matin() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_dossier uuid; v_jour date; v_m timestamptz; v_d1 uuid; v_d2 uuid; n integer;
  v_avocat uuid; v_assistante uuid; v_gerant uuid; v_txt text;
  sec record;
begin
  jeu := tests.tamila_scene();
  v_client := (jeu ->> 'client')::uuid;
  v_dossier := (jeu ->> 'dossier')::uuid;
  v_avocat := (jeu ->> 'avocat')::uuid;
  v_assistante := (jeu ->> 'assistante')::uuid;
  v_gerant := (jeu ->> 'gerant')::uuid;
  v_jour := (now() at time zone 'Europe/Paris')::date;
  v_m := (v_jour + time '08:00') at time zone 'Europe/Paris';

  -- Deux dates fixées : l'une dans deux jours, saisie par l'assistante (à confirmer par un avocat), l'autre dépassée
  -- de trois jours, saisie par l'avocat (confirmée d'office).
  perform tests.endosser(v_assistante, 'b4-assistante@essai.invalid');
  v_d1 := public.tamila_poser_date(v_dossier, v_jour + 2, 'conclure', 'saisie');
  perform tests.redevenir_admin();
  perform tests.endosser(v_avocat, 'b4-rousseau@essai.invalid');
  v_d2 := public.tamila_poser_date(v_dossier, v_jour - 3, 'autre', 'saisie');
  perform tests.redevenir_admin();
  return next is(array[(select statut from public.tamila_delais where id = v_d1), (select statut from public.tamila_delais where id = v_d2)],
                 array['a_confirmer', 'confirme'], 'saisie de l''assistante : à confirmer ; de l''avocat : confirmée');
  -- Une audience aujourd'hui à 14 h, une autre tenue hier sans temps saisi.
  perform tests.inserer_minimal('public', 'tamila_audiences', jsonb_build_object('client_id', v_client, 'dossier_id', v_dossier,
    'date_heure', (v_jour + time '14:00') at time zone 'Europe/Paris', 'heure_connue', true, 'nature', 'plaidoiries', 'statut', 'prevue', 'avocat_id', v_avocat, 'source', 'saisie'));
  perform tests.inserer_minimal('public', 'tamila_audiences', jsonb_build_object('client_id', v_client, 'dossier_id', v_dossier,
    'date_heure', v_m - interval '1 day', 'heure_connue', true, 'nature', 'mise_en_etat', 'statut', 'tenue', 'avocat_id', v_avocat, 'source', 'saisie'));
  -- Un avis reçu par courriel à rattacher, qui s'efface demain.
  insert into public.tamila_avis_entrants (client_id, reception_id, recu_le, nb_pieces, expire_le) values (v_client, 990023, now() - interval '6 days', 1, now() + interval '1 day');
  -- Le cabinet : un dossier ouvert depuis vingt jours sans convention, un conflit sans décision.
  update public.tamila_dossiers set ouvert_le = now() - interval '20 days' where id = v_dossier;
  perform tests.inserer_minimal('public', 'tamila_controles_conflits', jsonb_build_object('client_id', v_client, 'dossier_id', v_dossier, 'qualite', 'adverse',
    'correspondances', 1, 'conflits', 1, 'hors_vue', 0, 'demande_par', v_avocat));

  return next ok(not has_function_privilege('authenticated', 'private.tamila_deposer_points(timestamptz)', 'execute')
                 and not has_function_privilege('authenticated', 'private.tamila_point_lignes_personne(uuid, uuid, text, date, timestamptz)', 'execute'),
                 'le point se dépose par le serveur seul');
  return next is(private.tamila_deposer_points((v_jour + time '04:00') at time zone 'Europe/Paris'), 0, 'avant 5 h, rien');
  return next ok(private.tamila_deposer_points(v_m) >= 1, 'à 8 h, le cabinet a son point');

  -- L'avocat (valideur, intervenant du dossier).
  select string_agg(i.texte || ' [' || i.gravite || ']', ' | ' order by i.texte) into v_txt
    from public.points_sections s join public.points_items i on i.section_id = s.id
   where s.client_id = v_client and s.module = 'tamila' and s.destinataire = v_avocat;
  return next ok(v_txt like '%1 délai de procédure à confirmer%', 'l''avocat : ses délais à confirmer');
  return next ok(v_txt like format('%%Échéance le %s : remettre ses conclusions et les notifier (dans 2 jours), délai encore à confirmer [critique]%%', to_char(v_jour + 2, 'DD/MM/YYYY')),
                 'l''échéance des deux jours, critique');
  return next ok(v_txt like format('%%Échéance dépassée du %s : accomplir l''acte fixé par le juge (3 jours de retard)%%', to_char(v_jour - 3, 'DD/MM/YYYY')), 'l''échéance dépassée');
  return next ok(v_txt like '%Audience de plaidoiries aujourd''hui à 14 h [attention]%', 'l''audience de 14 h');
  return next ok(v_txt like '%1 audience passée sans temps saisi%', 'l''audience d''hier sans temps saisi');
  return next ok(v_txt like '%1 avis RPVA reçu par courriel à rattacher%[critique]%', 'l''avis à rattacher, qui s''efface demain : critique');

  -- L'assistante (collaboratrice) : les échéances, pas la confirmation ni les avis.
  select string_agg(i.texte, ' | ') into v_txt
    from public.points_sections s join public.points_items i on i.section_id = s.id
   where s.client_id = v_client and s.module = 'tamila' and s.destinataire = v_assistante;
  return next ok(coalesce(v_txt, '') like '%Échéance%' and coalesce(v_txt, '') not like '%à confirmer, le plus ancien%' and coalesce(v_txt, '') not like '%avis RPVA%',
                 'l''assistante : les échéances, ni la confirmation ni les avis');
  -- Le stagiaire (lecteur) n'a pas de section.
  select count(*) into n from public.points_sections s where s.client_id = v_client and s.destinataire = (jeu ->> 'stagiaire')::uuid;
  return next is(n, 0, 'le stagiaire n''a pas de point Tamila');

  -- Le gérant : la section du cabinet.
  select string_agg(i.texte || ' [' || i.gravite || ']', ' | ') into v_txt
    from public.points_sections s join public.points_items i on i.section_id = s.id
   where s.client_id = v_client and s.module = 'tamila' and s.role = 'gerant' and s.titre = 'Tamila : le cabinet';
  return next ok(v_txt like '%1 délai dépassé sans acte déposé dans le cabinet [critique]%', 'cabinet : le délai dépassé');
  return next ok(v_txt like '%1 dossier avec un conflit d''intérêts sans décision%', 'cabinet : le conflit sans décision');
  return next ok(v_txt like '%1 dossier ouvert depuis plus de quinze jours sans convention%', 'cabinet : le dossier sans convention');

  -- Aucun clair : ni la sentinelle des noms, ni la juridiction.
  select count(*) into n from public.points_sections s join public.points_items i on i.section_id = s.id where s.client_id = v_client
     and (i.texte like '%' || tests.tamila_sentinelle() || '%' or i.texte like '%Cour d''appel%' or s.titre like '%' || tests.tamila_sentinelle() || '%');
  return next is(n, 0, 'aucun nom, aucune juridiction dans le point');
  select count(*) into n from public.points_sections s join public.points_items i on i.section_id = s.id where s.client_id = v_client and s.module = 'tamila' and i.objet_type is not null;
  return next is(n, 0, 'aucune ligne ne désigne un dossier chiffré');

  -- Plus rien à dire : la section se retire.
  update public.tamila_avis_entrants set statut = 'ecarte', motif = 'pas_un_avis' where reception_id = 990023;
  perform tests.endosser(v_avocat, 'b4-rousseau@essai.invalid');
  perform public.tamila_declarer_acte(v_d1, v_jour);
  perform public.tamila_declarer_acte(v_d2, v_jour);
  perform tests.redevenir_admin();
  update public.tamila_audiences set statut = 'annulee' where dossier_id = v_dossier;
  perform private.tamila_deposer_points(v_m);
  select count(*) into n from public.points_sections s where s.client_id = v_client and s.destinataire = v_avocat;
  return next is(n, 0, 'rien à signaler : la section de l''avocat est retirée');
end $f$;

select * from runtests('tests'::name, '^test_b4_23_');
