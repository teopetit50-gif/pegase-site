-- 17 — La passerelle « avis RPVA lu par le lecteur » (migration b4_08). Après 00_jeu_tamila.sql, b4_01 à b4_08.
-- runtests() annule tout.

create or replace function tests.test_b4_17_avis_lecteur() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_dossier uuid; v_piece uuid; v_piece2 uuid; v_autre uuid; r jsonb; n bigint;
begin
  jeu := tests.tamila_scene();
  v_dossier := (jeu ->> 'dossier')::uuid;
  perform tests.tamila_appel(jeu);
  v_piece := tests.tamila_piece(jeu, 'avis-audience.pdf');
  v_piece2 := tests.tamila_piece(jeu, 'pas-encore-lue.pdf');
  update public.pieces set statut = 'lue', type_piece = 'rpva_avis_audience' where id = v_piece;

  -- Le serveur seul.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_dossier_pour_lecteur(%L::uuid)', v_piece), '42501', null,
                        'une personne connectée n''appelle pas la porte du lecteur (42501)');
  return next throws_ok(format('select public.tamila_avis_du_lecteur(%L::uuid, ''rpva_avis_audience'', ''{"date_avis": "2026-10-02"}'', ''modele'')', v_piece),
                        '42501', null, 'ni ne pose un avis « lu » (42501)');
  perform tests.redevenir_admin();

  perform tests.endosser_serveur();
  r := public.tamila_dossier_pour_lecteur(v_piece);
  return next ok((r ->> 'dossier')::uuid = v_dossier and r ->> 'numero_rg' ~ '^01[0-9a-f]+$' and not (r ->> 'avis_deja')::boolean,
                 'le dossier de la pièce, son n° RG CHIFFRÉ (à déchiffrer par le lecteur), pas encore d''avis');
  return next throws_ok(format('select public.tamila_avis_du_lecteur(%L::uuid, ''rpva_avis_audience'', ''{"date_avis": "2026-10-02"}'', ''modele'')', v_piece2),
                        '55000', null, 'une pièce qui n''a pas été lue ne pose pas d''avis (55000)');
  return next throws_ok(format('select public.tamila_avis_du_lecteur(%L::uuid, ''rpva_avis_audience'', ''{"date_avis": "2026-10-02"}'', ''saisie'')', v_piece),
                        '22023', null, 'la confiance d''un avis lu est gabarit ou modele (22023)');
  return next throws_ok(format('select public.tamila_avis_du_lecteur(%L::uuid, ''rpva_avis_audience'', ''{"date_avis": "2026-10-02", "nom_adversaire": "%s"}'', ''modele'')', v_piece, tests.tamila_sentinelle()),
                        '22023', null, 'aucune autre valeur que celles de tamila_avis_lu ne passe : pas de nom (22023)');
  return next throws_ok(format('select public.tamila_avis_du_lecteur(%L::uuid, ''facture'', ''{"date_avis": "2026-10-02"}'', ''modele'')', v_piece),
                        '22023', null, 'un type qui n''est pas un avis RPVA est refusé (22023)');
  r := public.tamila_avis_du_lecteur(v_piece, 'rpva_avis_audience', '{"date_avis": "2026-10-02", "date_audience": "2027-02-04T09:30"}', 'modele', true);
  return next is(r ->> 'effet', 'audience_ajoutee', 'l''avis lu pose l''audience, comme un avis saisi');
  r := public.tamila_avis_du_lecteur(v_piece, 'rpva_avis_audience', '{"date_avis": "2026-10-02", "date_audience": "2027-02-04T09:30"}', 'modele', true);
  return next ok((r ->> 'deja_lu')::boolean, 'rejoué (le lecteur reprend un travail) : le même avis, pas un second');
  return next ok((public.tamila_dossier_pour_lecteur(v_piece) ->> 'avis_deja')::boolean, 'la porte le sait : avis déjà posé');
  perform tests.redevenir_admin();
  select count(*) into n from public.tamila_avis where piece_id = v_piece and confiance = 'modele' and rg_concorde;
  return next is(n, 1::bigint, 'un seul avis, confiance « modele », RG concordant');
  return next ok(exists (select 1 from public.tamila_audiences a where a.dossier_id = v_dossier and a.source = 'avis'
                           and a.date_heure = timestamp '2027-02-04 09:30' at time zone 'Europe/Paris'),
                 'l''audience du 04/02/2027 à 9 h 30, heure de Paris');

  -- Un RG différent : l'avis est mis à vérifier, avec une alerte critique.
  v_autre := tests.tamila_piece(jeu, 'avis-autre-rg.pdf');
  update public.pieces set statut = 'lue' where id = v_autre;
  perform tests.endosser_serveur();
  r := public.tamila_avis_du_lecteur(v_autre, 'rpva_ordonnance_mee', '{"date_avis": "2026-10-03", "date_limite": "2026-12-15"}', 'modele', false);
  perform tests.redevenir_admin();
  return next is(r ->> 'effet', 'rg_different', 'un n° RG qui ne concorde pas : l''avis est à vérifier');
  return next ok(exists (select 1 from public.alertes a where a.client_id = (jeu ->> 'client')::uuid and a.niveau = 'critique'
                           and a.cle_regroupement like '%avis_rg:%'), 'avec une alerte critique');
  return next is(tests.tamila_clair_dans('tamila_avis', tests.tamila_sentinelle()), 0::bigint, 'aucun clair dans les avis');
end $f$;

select * from runtests('tests'::name, '^test_b4_17_');
