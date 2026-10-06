-- 10 — Les rondes (étape 15) : relances de confirmation à 48 h et à J-8, accès bornés retirés, battements.
-- Après 00_jeu_tamila.sql. runtests() annule tout.

create or replace function tests.test_b4_10_rondes() returns setof text
language plpgsql as $f$
declare jeu jsonb; v_dossier uuid; v_appel uuid; t public.tamila_delais; r jsonb; v_proche uuid;
begin
  jeu := tests.tamila_scene();
  v_dossier := (jeu ->> 'dossier')::uuid;
  v_appel := tests.tamila_appel(jeu);
  select * into t from public.tamila_delais where appel_id = v_appel and nature = 'regle' order by echeance_retenue limit 1;
  return next ok(t.id is not null and t.statut = 'a_confirmer', 'un délai attend sa confirmation');

  -- À 48 h sans confirmation : l'avocat responsable est avisé, une fois.
  r := private.tamila_controler_delais(now());
  return next is((r ->> 'relances_48h')::int, 0, 'tout de suite : pas de relance');
  r := private.tamila_controler_delais(now() + interval '49 hours');
  return next ok((r ->> 'relances_48h')::int >= 1, 'quarante-neuf heures plus tard : relance à 48 h');
  return next ok((select relance_48h_le from public.tamila_delais where id = t.id) is not null, 'le délai porte la date de sa relance');
  r := private.tamila_controler_delais(now() + interval '50 hours');
  return next is((r ->> 'relances_48h')::int, 0, 'une seule relance à 48 h');
  return next ok(tests.tamila_clair_dans('alertes', 'delai_48h:' || t.id::text) >= 1 or not tests.table_existe('alertes'), 'une alerte « à confirmer depuis 48 heures » est levée');

  -- À huit jours de l'échéance, toujours pas confirmé : courriel à l'avocat et aux associés, alerte critique.
  perform tests.endosser((jeu ->> 'assistante')::uuid, 'b4-assistante@essai.invalid');
  v_proche := public.tamila_poser_date(v_dossier, current_date + 5, 'autre', 'saisie');
  perform tests.redevenir_admin();
  return next is((select statut from public.tamila_delais where id = v_proche), 'a_confirmer', 'une date fixée à J + 5, saisie par l''assistante, attend un avocat');
  r := private.tamila_controler_delais(now());
  return next ok((r ->> 'relances_j8')::int >= 1, 'la ronde relance à J-8');
  return next ok(exists (select 1 from public.travaux w where w.genre = 'tamila.courriel' and w.charge ->> 'delai' = v_proche::text and w.charge ->> 'modele' = 'delai_non_confirme_j8'),
    'un courriel « délai non confirmé à J-8 » est déposé pour l''ouvrier');
  return next ok(exists (select 1 from public.travaux w where w.genre = 'tamila.courriel' and w.charge ->> 'delai' = v_proche::text
                         and w.charge -> 'destinataires' @> to_jsonb(array[(jeu ->> 'gerant')::uuid])), 'le gérant (responsable et associé) est destinataire');
  return next ok(not exists (select 1 from public.travaux w where w.genre = 'tamila.courriel' and w.charge ->> 'delai' = v_proche::text
                             and w.charge -> 'destinataires' @> to_jsonb(array[(jeu ->> 'assistante')::uuid])), 'l''assistante, non');
  r := private.tamila_controler_delais(now() + interval '1 hour');
  return next is((r ->> 'relances_j8')::int, 0, 'une seule relance à J-8');
  return next ok(tests.tamila_clair_dans('travaux', tests.tamila_sentinelle()) = 0, 'aucun travail ne porte le clair du dossier');

  -- Un dépassement publié par B5 (travail tamila.delai_depasse) marque le délai dépassé.
  perform private.deposer_travail((jeu ->> 'client')::uuid, 'tamila', 'tamila.delai_depasse', jsonb_build_object('delai', t.delai_id), 'essai-b4:depasse:' || t.delai_id::text, 5::smallint);
  r := private.tamila_controler_delais(now());
  return next ok((r ->> 'depasses')::int >= 1, 'un dépassement venu de B5 est pris');
  return next ok((select depasse_le from public.tamila_delais where id = t.id) is not null, 'le délai est marqué dépassé');
  return next ok(tests.tamila_clair_dans('alertes', 'delai_depasse:' || t.id::text) >= 1 or not tests.table_existe('alertes'), 'alerte critique « délai dépassé sans acte déposé »');

  -- Les accès bornés échus sont retirés par la ronde horaire.
  update public.tamila_dossiers_membres set jusqu_au = now() - interval '1 minute' where dossier_id = v_dossier and user_id = (jeu ->> 'stagiaire')::uuid;
  r := private.tamila_tache_horaire(now());
  return next ok((r ->> 'acces_retires')::int >= 1, 'la ronde retire les accès bornés échus');
  return next is((select count(*) from public.tamila_dossiers_membres where dossier_id = v_dossier and user_id = (jeu ->> 'stagiaire')::uuid), 0::bigint, 'le stagiaire n''est plus membre');
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next is(tests.compter('public', 'tamila_dossiers', format('id = %L', v_dossier)), 0::bigint, 'il ne voit plus le dossier');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b4_10_');
