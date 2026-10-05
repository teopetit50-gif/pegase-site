-- 02 — Ouverture d'un dossier chiffré (étape 2). Après 00_jeu_tamila.sql. runtests() annule tout.

create or replace function tests.test_b4_02_dossier_chiffre() returns setof text
language plpgsql as $f$
declare jeu jsonb; v_dossier uuid; v_id uuid; d public.tamila_dossiers; k public.tamila_cles; v_demande public.demandes_validation;
begin
  jeu := tests.tamila_jeu();

  -- Sans installation, pas de dossier.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_creer_dossier(%L::uuid, gen_random_uuid(), tests.tamila_chiffre(''a''), tests.tamila_chiffre(''b''), ''local'', ''ref'', decode(repeat(''ab'', 40), ''hex''))', jeu ->> 'client'),
    '55000', null, 'avant l''installation, le dossier est refusé (55000)');
  perform tests.redevenir_admin();
  perform tests.tamila_installe(jeu);

  -- Le stagiaire (lecteur) n'ouvre pas de dossier.
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next throws_ok(format('select public.tamila_creer_dossier(%L::uuid, gen_random_uuid(), tests.tamila_chiffre(''a''), tests.tamila_chiffre(''b''), ''local'', ''ref'', decode(repeat(''ab'', 40), ''hex''))', jeu ->> 'client'),
    '42501', null, 'un stagiaire n''ouvre pas de dossier (42501)');
  perform tests.redevenir_admin();

  -- Un chiffré mal formé (premier octet ≠ 1, ou trop court) est refusé par la contrainte.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_creer_dossier(%L::uuid, gen_random_uuid(), decode(repeat(''00'', 40), ''hex''), tests.tamila_chiffre(''b''), ''local'', ''ref'', decode(repeat(''ab'', 40), ''hex''))', jeu ->> 'client'),
    '23514', null, 'une référence qui n''est pas au format chiffré est refusée (23514)');
  return next throws_ok(format('select public.tamila_creer_dossier(%L::uuid, null, tests.tamila_chiffre(''a''), tests.tamila_chiffre(''b''), ''local'', ''ref'', decode(repeat(''ab'', 40), ''hex''))', jeu ->> 'client'),
    '22023', null, 'l''identifiant du dossier vient du navigateur avec sa clé : sans lui, refus (22023)');
  perform tests.redevenir_admin();

  -- Le gérant ouvre le dossier.
  v_dossier := tests.tamila_dossier(jeu);
  select * into d from public.tamila_dossiers where id = v_dossier;
  return next is(d.statut, 'ouvert', 'le dossier du gérant naît ouvert');
  return next is(d.responsable_id, (jeu ->> 'gerant')::uuid, 'le gérant en est le responsable');
  return next is(d.ouvert_par, (jeu ->> 'gerant')::uuid, 'ouvert par lui');
  return next is(d.matiere, 'construction', 'matière : construction');
  return next is(d.territoire, 'metropole', 'territoire : métropole');
  return next ok(private.tamila_chiffre_valide(d.reference_chiffree) and private.tamila_chiffre_valide(d.intitule_chiffre)
                 and private.tamila_chiffre_valide(d.numero_rg_chiffre), 'référence, intitulé et n° RG sont au format chiffré');
  return next ok(position(tests.tamila_sentinelle() in encode(d.reference_chiffree, 'escape')) = 0, 'le clair n''est pas dans la référence chiffrée');

  select * into k from public.tamila_cles where dossier_id = v_dossier;
  return next is(k.statut, 'active', 'une clé de dossier active');
  return next is(k.fournisseur, 'local', 'clé enveloppée par le fournisseur « local »');
  return next is(k.algorithme, 'aes-256-gcm', 'AES-256-GCM');
  return next is((select count(*) from public.tamila_dossiers_membres m where m.dossier_id = v_dossier and m.user_id = (jeu ->> 'gerant')::uuid and m.role_dossier = 'responsable'),
    1::bigint, 'le gérant est membre responsable');

  -- Sous RLS : le gérant voit le dossier, l'avocat (pas encore membre) ne le voit pas, l'admin (associé) le voit, le voisin non.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next is(tests.compter('public', 'tamila_dossiers', format('id = %L', v_dossier)), 1::bigint, 'le gérant lit son dossier');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next is(tests.compter('public', 'tamila_dossiers', format('id = %L', v_dossier)), 0::bigint, 'l''avocat non membre ne voit pas le dossier');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'admin')::uuid, 'b4-haddad@essai.invalid');
  return next is(tests.compter('public', 'tamila_dossiers', format('id = %L', v_dossier)), 1::bigint, 'l''autre associé voit le dossier du cabinet');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'autre_gerant')::uuid, 'b4-voisin@essai.invalid');
  return next is(tests.compter('public', 'tamila_dossiers', format('id = %L', v_dossier)), 0::bigint, 'le cabinet voisin ne voit rien');
  return next is(tests.compter('public', 'tamila_cles', format('dossier_id = %L', v_dossier)), 0::bigint, 'ni la clé');
  perform tests.redevenir_admin();

  -- L'assistante ouvre un dossier : il attend l'ouverture, avec une demande de validation.
  perform tests.endosser((jeu ->> 'assistante')::uuid, 'b4-assistante@essai.invalid');
  return next throws_ok(format('select public.tamila_creer_dossier(%L::uuid, gen_random_uuid(), tests.tamila_chiffre(''a''), tests.tamila_chiffre(''b''), ''local'', ''ref2'', decode(repeat(''ab'', 40), ''hex''))', jeu ->> 'client'),
    '22023', null, 'l''assistante désigne l''avocat responsable (22023 sinon)');
  v_id := gen_random_uuid();
  return next lives_ok(format('select public.tamila_creer_dossier(%L::uuid, %L::uuid, tests.tamila_chiffre(''a''), tests.tamila_chiffre(''b''), ''local'', ''ref3'', decode(repeat(''ab'', 40), ''hex''), null, ''construction'', null, ''metropole'', ''contentieux'', false, null, %L::uuid)',
    jeu ->> 'client', v_id, jeu ->> 'avocat'), 'l''assistante ouvre un dossier avec Me Rousseau pour responsable');
  perform tests.redevenir_admin();
  select * into d from public.tamila_dossiers where id = v_id;
  return next is(d.statut, 'attente', 'le dossier de l''assistante attend son ouverture');
  return next is(d.responsable_id, (jeu ->> 'avocat')::uuid, 'Me Rousseau en est le responsable');
  select * into v_demande from public.demandes_validation where id = d.demande_ouverture_id;
  return next is(v_demande.type_action, 'ouvrir_dossier', 'une demande « ouvrir_dossier » est déposée');
  return next is(v_demande.statut, 'en_attente', 'elle attend une décision');
  return next is((select count(*) from public.tamila_dossiers_membres m where m.dossier_id = v_id and m.user_id = (jeu ->> 'assistante')::uuid and m.role_dossier = 'intervenant'),
    1::bigint, 'l''assistante est intervenante sur le dossier qu''elle a créé');

  -- Un audit s'ouvre par un associé seulement, et porte sa date de fin.
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select public.tamila_creer_dossier(%L::uuid, gen_random_uuid(), tests.tamila_chiffre(''a''), tests.tamila_chiffre(''b''), ''local'', ''ref4'', decode(repeat(''ab'', 40), ''hex''), null, null, null, ''metropole'', ''contentieux'', false, current_date + 30)', jeu ->> 'client'),
    '42501', null, 'un avocat collaborateur n''ouvre pas d''audit (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  v_id := gen_random_uuid();
  return next lives_ok(format('select public.tamila_creer_dossier(%L::uuid, %L::uuid, tests.tamila_chiffre(''a''), tests.tamila_chiffre(''b''), ''local'', ''ref5'', decode(repeat(''ab'', 40), ''hex''), null, null, null, ''metropole'', ''contentieux'', false, current_date + 30)', jeu ->> 'client', v_id),
    'le gérant ouvre un audit de trente jours');
  perform tests.redevenir_admin();
  select * into d from public.tamila_dossiers where id = v_id;
  return next is(d.statut, 'audit', 'statut audit');
  return next ok(d.effacement_prevu_le > d.audit_fin_le, 'l''effacement est prévu après la fin de l''audit (conservation_audit_jours)');
end $f$;

select * from runtests('tests'::name, '^test_b4_02_');
