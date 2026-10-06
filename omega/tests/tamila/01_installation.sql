-- 01 — Installation de Tamila chez le cabinet (étape 1 du scénario, NOTES-B4).
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_jeu_tamila.sql. runtests() annule tout.

create or replace function tests.test_b4_01_installation() returns setof text
language plpgsql as $f$
declare jeu jsonb; n bigint;
begin
  jeu := tests.tamila_jeu();

  -- L'assistante (collaborateur) n'installe pas Tamila.
  perform tests.endosser((jeu ->> 'assistante')::uuid, 'b4-assistante@essai.invalid');
  return next throws_ok(format('select public.tamila_installer(%L::uuid)', jeu ->> 'client'), '42501', null,
    'un collaborateur n''installe pas Tamila (42501)');
  perform tests.redevenir_admin();

  -- Le gérant installe.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next lives_ok(format('select public.tamila_installer(%L::uuid)', jeu ->> 'client'), 'le gérant installe Tamila');
  return next lives_ok(format('select public.tamila_installer(%L::uuid)', jeu ->> 'client'), 'une seconde installation ne casse rien (idempotente)');
  perform tests.redevenir_admin();

  select count(*) into n from public.tamila_reglages r where r.client_id = (jeu ->> 'client')::uuid;
  return next is(n, 1::bigint, 'une ligne de réglages, une seule');
  return next is((select r.delai_cloture_jours from public.tamila_reglages r where r.client_id = (jeu ->> 'client')::uuid), 7::smallint,
    'clôture : sept jours avant effacement par défaut');

  select count(*) into n from public.regles_validation r
   where r.client_id = (jeu ->> 'client')::uuid and r.module = 'tamila'
     and r.type_action in ('cloturer_dossier', 'lever_muraille', 'confirmer_delai');
  return next is(n, 3::bigint, 'trois règles de validation : clôture, levée de muraille, confirmation de délai');
  return next ok((select r.roles_autorises @> array['gerant'] and not (r.roles_autorises @> array['valideur'])
                  from public.regles_validation r where r.client_id = (jeu ->> 'client')::uuid and r.module = 'tamila' and r.type_action = 'lever_muraille'),
    'la levée d''une muraille revient au gérant seul');
  return next ok((select r.roles_autorises @> array['gerant', 'admin', 'valideur']
                  from public.regles_validation r where r.client_id = (jeu ->> 'client')::uuid and r.module = 'tamila' and r.type_action = 'confirmer_delai'),
    'un délai est confirmé par un avocat (gérant, admin ou valideur)');

  -- Le gérant lit ses réglages sous RLS ; le cabinet voisin ne les voit pas.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next is(tests.compter('public', 'tamila_reglages', format('client_id = %L', jeu ->> 'client')), 1::bigint, 'le gérant lit les réglages de son cabinet');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'autre_gerant')::uuid, 'b4-voisin@essai.invalid');
  return next is(tests.compter('public', 'tamila_reglages', format('client_id = %L', jeu ->> 'client')), 0::bigint, 'le cabinet voisin ne voit pas ces réglages');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b4_01_');
