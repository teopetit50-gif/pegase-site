-- 12 — Les deux portes posées par B4 : le journal des accès (b4_02) et la clé rendue aux membres (b4_03).
-- Après 00_jeu_tamila.sql et les migrations b4_02 et b4_03. runtests() annule tout.

create or replace function tests.test_b4_12_journal_et_cle() returns setof text
language plpgsql as $f$
declare jeu jsonb; v_dossier uuid; n bigint; v_env bytea; v_cle public.tamila_cles;
begin
  jeu := tests.tamila_scene();
  v_dossier := (jeu ->> 'dossier')::uuid;
  select * into v_cle from public.tamila_cles where dossier_id = v_dossier;

  -- ── La clé : l'avocat intervenant ne lit pas tamila_cles, mais la porte lui rend l'enveloppe ──
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next is(tests.compter('public', 'tamila_cles', format('dossier_id = %L', v_dossier)), 0::bigint, 'un avocat collaborateur ne lit pas la table des clés (associés seulement)');
  v_env := public.tamila_cle_dossier(v_dossier);
  return next is(v_env, v_cle.enveloppe, 'tamila_cle_dossier lui rend l''enveloppe de la clé active');
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from public.lectures l where l.objet_type = 'tamila_dossier' and l.objet_id = v_dossier::text and l.user_id = (jeu ->> 'avocat')::uuid),
    'la remise de la clé est tracée comme une lecture');
  perform tests.endosser((jeu ->> 'autre_gerant')::uuid, 'b4-voisin@essai.invalid');
  return next throws_ok(format('select public.tamila_cle_dossier(%L::uuid)', v_dossier), '42501', null, 'le cabinet voisin n''obtient pas la clé (42501)');
  perform tests.redevenir_admin();
  -- Derrière une muraille, plus de clé.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  perform public.tamila_poser_muraille(v_dossier, (jeu ->> 'admin')::uuid);
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'admin')::uuid, 'b4-haddad@essai.invalid');
  return next throws_ok(format('select public.tamila_cle_dossier(%L::uuid)', v_dossier), '42501', null, 'derrière une muraille, pas de clé (42501)');
  perform tests.redevenir_admin();
  -- Clé désactivée (effacement en cours) : rien.
  update public.tamila_cles set statut = 'desactivee', desactivee_le = now(), destruction_prevue_le = now() + interval '7 days' where dossier_id = v_dossier;
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next ok(public.tamila_cle_dossier(v_dossier) is null, 'clé désactivée : la porte ne rend rien');
  perform tests.redevenir_admin();

  -- ── Le journal des accès : le responsable et les associés le lisent, pas l'intervenant ──
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  perform public.tamila_consulter(v_dossier, 'dossier');
  return next throws_ok(format('select * from public.tamila_journal_acces(%L::uuid)', v_dossier), '42501', null, 'un lecteur ne lit pas le journal des accès (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select * from public.tamila_journal_acces(%L::uuid)', v_dossier), '42501', null, 'un intervenant non plus (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  select count(*) into n from public.tamila_journal_acces(v_dossier);
  return next ok(n >= 2, format('le gérant responsable lit le journal : %s lectures (clé remise à Me Rousseau, consultation du stagiaire…)', n));
  return next ok(exists (select 1 from public.tamila_journal_acces(v_dossier) j where j.user_id = (jeu ->> 'stagiaire')::uuid and j.contexte = 'dossier'), 'la consultation du stagiaire y est, avec son contexte');
  return next ok(exists (select 1 from public.tamila_journal_acces(v_dossier) j where j.user_id = (jeu ->> 'avocat')::uuid and j.contexte = 'cle'), 'la remise de la clé y est (contexte cle)');
  return next is((select count(*) from public.tamila_journal_acces(v_dossier, current_date + 1)), 0::bigint, 'borné par la date : rien depuis demain');
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from public.lectures l where l.objet_id = v_dossier::text and l.user_id = (jeu ->> 'gerant')::uuid and l.contexte = 'journal'), 'lire le journal est lui-même tracé (contexte journal)');
  perform tests.endosser((jeu ->> 'autre_gerant')::uuid, 'b4-voisin@essai.invalid');
  return next throws_ok(format('select * from public.tamila_journal_acces(%L::uuid)', v_dossier), '42501', null, 'le cabinet voisin ne lit pas le journal (42501)');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b4_12_');
