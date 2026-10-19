-- B3-01 — Installation du cabinet par le titulaire (étapes 1 et 2 du scénario, omega/NOTES-B3.md).
-- Jouable tel quel par execute_sql sur la RECETTE, après omega/tests/socle/00_installation.sql et
-- omega/tests/tiroma/00_aides_b3.sql, et après la pose de b3_01_portes_droits.sql. runtests() annule tout.

create or replace function tests.test_b3_01_installation() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  v_cabinet uuid;
  v_prat uuid;
  v_membre uuid;
  jeu jsonb;
begin
  return next ok(entite is not null, 'le client du banc a une entité');
  return next ok(private.territoire_de_entite(banc, entite) is not null,
                 'l''entité du banc a un territoire (' || coalesce(private.territoire_de_entite(banc, entite), 'aucun') || ')');

  -- 1. Un valideur sans profil n'installe pas.
  perform tests.b3_endosser('daf2');
  return next throws_ok(format('select public.tiroma_installer_cabinet(%L, %L, ''logosw'', ''cabinet'', null)', banc, entite),
                        '42501', null, 'daf2 (valideur) ne peut pas installer le cabinet : 42501');
  perform tests.redevenir_admin();

  -- Un gérant d'une autre organisation non plus.
  jeu := tests.jeu();
  perform tests.endosser((jeu ->> 'gerant_a')::uuid);
  return next throws_ok(format('select public.tiroma_installer_cabinet(%L, %L, ''logosw'', ''cabinet'', null)', banc, entite),
                        '42501', null, 'le gérant d''un autre client ne peut pas installer sur l''entité du banc : 42501');
  perform tests.redevenir_admin();

  -- 2. Le gérant installe, par la porte publique, sous son jeton.
  perform tests.b3_endosser('gerant');
  v_cabinet := public.tiroma_installer_cabinet(banc, entite, 'logosw', 'cabinet', '2026.1');
  return next ok(v_cabinet is not null, 'tiroma_installer_cabinet rend l''identifiant du cabinet');
  return next throws_ok(format('select public.tiroma_installer_cabinet(%L, %L, ''logosw'', ''cabinet'', null)', banc, entite),
                        '23505', null, 'une deuxième installation sur la même entité est refusée (23505)');
  -- Sans profil, le gérant ne voit pas encore le cabinet (RLS : les profils du cabinet le voient).
  return next is(tests.compter('public', 'tiroma_cabinets', format('id = %L', v_cabinet)), 0::bigint,
                 'sans profil, le gérant ne voit pas la ligne du cabinet');
  perform tests.redevenir_admin();
  return next is((select statut || '/' || mode from public.tiroma_cabinets where id = v_cabinet), 'installation/a_blanc',
                 'le cabinet est en installation, à blanc');
  return next is((select logiciel_version from public.tiroma_cabinets where id = v_cabinet), '2026.1', 'la version du logiciel est gardée');
  return next is(tests.compter('public', 'tiroma_regles', format('client_id = %L and entite_id = %L', banc, entite)), 1::bigint,
                 'les règles par défaut sont posées');
  return next is((select ordre_priorite::text from public.tiroma_regles where client_id = banc and entite_id = entite),
                 '{plan,attente,controle}', 'ordre de priorité par défaut : plan, attente, contrôle');

  -- 3. Profils : le gérant se donne titulaire ; un valideur ne peut pas être titulaire ni direction.
  perform tests.b3_endosser('gerant');
  insert into public.tiroma_profils (client_id, user_id, entite_id, profil) values (banc, tests.b3_compte('gerant'), entite, 'titulaire');
  return next is(tests.compter('public', 'tiroma_cabinets', format('id = %L', v_cabinet)), 1::bigint, 'titulaire, le gérant voit son cabinet');
  return next is(tests.compter('public', 'tiroma_regles', format('entite_id = %L', entite)), 1::bigint, 'le titulaire lit ses règles');
  return next throws_ok(format('insert into public.tiroma_profils (client_id, user_id, entite_id, profil) values (%L, %L, %L, ''titulaire'')',
                               banc, tests.b3_compte('daf'), entite),
                        '22023', null, 'daf (valideur) ne peut pas être titulaire : « Un titulaire est gérant » (22023)');
  return next throws_ok(format('insert into public.tiroma_profils (client_id, user_id, entite_id, profil) values (%L, %L, %L, ''direction'')',
                               banc, tests.b3_compte('daf2'), entite),
                        '22023', null, 'daf2 (valideur) ne peut pas être direction (22023)');
  -- Un collaborateur est relié à un praticien, une assistante à un membre.
  insert into public.tiroma_praticiens (client_id, entite_id, nom_affiche, metier) values (banc, entite, 'Dr Collaborateur (banc)', 'collaborateur') returning id into v_prat;
  insert into public.tiroma_membres (client_id, entite_id, prenom) values (banc, entite, 'Assistante (banc)') returning id into v_membre;
  return next throws_ok(format('insert into public.tiroma_profils (client_id, user_id, entite_id, profil, membre_id) values (%L, %L, %L, ''collaborateur'', %L)',
                               banc, tests.b3_compte('daf'), entite, v_membre),
                        '22023', null, 'un collaborateur n''est pas relié à un membre de l''équipe (22023)');
  insert into public.tiroma_profils (client_id, user_id, entite_id, profil, praticien_id) values (banc, tests.b3_compte('daf'), entite, 'collaborateur', v_prat);
  insert into public.tiroma_profils (client_id, user_id, entite_id, profil, membre_id) values (banc, tests.b3_compte('referent'), entite, 'assistante', v_membre);
  return next is(tests.compter('public', 'tiroma_profils', format('entite_id = %L', entite)), 3::bigint, 'le gérant voit les trois profils du cabinet');
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from public.droits d where d.client_id = banc and d.user_id = tests.b3_compte('daf') and d.droit = 'tiroma.voir_sa_production'),
                 'le collaborateur reçoit le droit tiroma.voir_sa_production');
  return next ok(exists (select 1 from public.acces_objets a where a.client_id = banc and a.user_id = tests.b3_compte('daf') and a.objet_type = 'praticien' and a.objet_id = v_prat::text),
                 'et l''accès en lecture à son praticien');

  -- Chacun voit sa ligne de profil, pas celles des autres.
  perform tests.b3_endosser('referent');
  return next is(tests.compter('public', 'tiroma_profils', format('entite_id = %L', entite)), 1::bigint, 'l''assistante ne voit que son profil');
  return next is(tests.compter('public', 'tiroma_cabinets', format('id = %L', v_cabinet)), 1::bigint, 'l''assistante voit le cabinet');
  return next is(tests.compter('public', 'tiroma_regles', format('entite_id = %L', entite)), 0::bigint, 'l''assistante ne lit pas les règles');
  return next is(tests.compter('public', 'tiroma_releves', format('entite_id = %L', entite)), 0::bigint, 'ni les relevés');
  return next throws_ok(format('insert into public.tiroma_profils (client_id, user_id, entite_id, profil) values (%L, %L, %L, ''assistante'')',
                               banc, tests.b3_compte('daf2'), entite),
                        '42501', null, 'l''assistante ne donne pas de profil (42501)');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b3_01_');
