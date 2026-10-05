-- B3-04 — Isolement : une autre organisation ne voit rien, chaque profil voit son périmètre (étape 18, omega/NOTES-B3.md).
-- Jouable tel quel par execute_sql sur la RECETTE, après 00_aides_b3.sql et b3_01. runtests() annule tout.

create or replace function tests.test_b3_04_isolement() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  eq jsonb;
  jeu jsonb;
  t text;
  tables text[] := array['tiroma_cabinets', 'tiroma_regles', 'tiroma_fauteuils', 'tiroma_horaires', 'tiroma_fermetures',
                         'tiroma_praticiens', 'tiroma_membres', 'tiroma_profils', 'tiroma_patients', 'tiroma_rendez_vous',
                         'tiroma_plans', 'tiroma_releves', 'tiroma_capacites', 'tiroma_evenements_agenda', 'tiroma_liste_attente',
                         'tiroma_travaux_labo', 'tiroma_stock', 'tiroma_types_rdv', 'tiroma_seances_modele', 'tiroma_ententes_odf',
                         'tiroma_actes_realises', 'tiroma_plan_actes'];
begin
  perform tests.b3_installer();
  eq := tests.b3_equipe();
  perform tests.b3_horaires();
  perform tests.redevenir_admin();

  -- Une autre organisation, un gérant et un membre : rien de Tiroma n'est visible, rien ne s'écrit chez le banc.
  jeu := tests.jeu();
  perform tests.endosser((jeu ->> 'gerant_a')::uuid);
  foreach t in array tables loop
    return next is(tests.compter('public', t, format('client_id = %L', banc)), 0::bigint, format('%s : invisible au gérant d''un autre client', t));
  end loop;
  return next throws_ok(format('insert into public.tiroma_fauteuils (client_id, entite_id, nom) values (%L, %L, ''intrus'')', banc, entite),
                        '42501', null, 'il ne pose pas de fauteuil chez le banc (42501)');
  return next throws_ok(format('insert into public.tiroma_profils (client_id, user_id, entite_id, profil) values (%L, %L, %L, ''titulaire'')', banc, jeu ->> 'gerant_a', entite),
                        null, null, 'il ne se donne pas un profil chez le banc');
  return next throws_ok(format('select public.tiroma_brancher_cabinet(%L, %L, ''exports'', null)', banc, entite),
                        '42501', null, 'il ne branche pas le cabinet du banc (42501)');
  return next throws_ok(format('select public.tiroma_changer_mode(%L, %L, ''reel'')', banc, entite),
                        '42501', null, 'il ne change pas son mode (42501)');
  perform tests.redevenir_admin();

  -- Le témoin daf2 (valideur du banc, sans profil Tiroma) ne voit rien non plus.
  perform tests.b3_endosser('daf2');
  return next is(tests.compter('public', 'tiroma_cabinets', format('client_id = %L', banc)), 0::bigint, 'daf2, sans profil, ne voit pas le cabinet');
  return next is(tests.compter('public', 'tiroma_fauteuils', format('client_id = %L', banc)), 0::bigint, 'ni les fauteuils');
  return next is(tests.compter('public', 'tiroma_horaires', format('client_id = %L', banc)), 0::bigint, 'ni les horaires');

  -- Le collaborateur voit le cabinet, les fauteuils, les horaires ; pas les règles ni les relevés ; pas l'équipe.
  perform tests.b3_endosser('daf');
  return next is(tests.compter('public', 'tiroma_cabinets', format('client_id = %L', banc)), 1::bigint, 'le collaborateur voit le cabinet');
  return next is(tests.compter('public', 'tiroma_fauteuils', format('client_id = %L', banc)), 3::bigint, 'et les fauteuils');
  return next is(tests.compter('public', 'tiroma_horaires', format('client_id = %L', banc)), 11::bigint, 'et les horaires');
  return next is(tests.compter('public', 'tiroma_regles', format('client_id = %L', banc)), 0::bigint, 'pas les règles');
  return next is(tests.compter('public', 'tiroma_membres', format('client_id = %L', banc)), 0::bigint, 'pas l''équipe (membres : le titulaire seul)');
  return next is(tests.compter('public', 'tiroma_profils', format('client_id = %L', banc)), 1::bigint, 'seulement son profil');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b3_04_');
