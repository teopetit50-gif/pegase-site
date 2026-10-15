-- B3-03 — Branchement, mode réel, journal opposable (étapes 6, 16, 17 du scénario, omega/NOTES-B3.md).
-- Jouable tel quel par execute_sql sur la RECETTE, après 00_aides_b3.sql et b3_01. runtests() annule tout.

create or replace function tests.test_b3_03_branchement_mode() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  v_cabinet uuid;
  v_branchement uuid;
  n_journal bigint;
begin
  v_cabinet := tests.b3_installer();
  perform tests.b3_equipe();
  perform tests.redevenir_admin();
  n_journal := tests.compter('public', 'journal_opposable', format('client_id = %L', banc));
  return next ok(exists (select 1 from public.modeles_jeux m where m.module = 'tiroma' and m.logiciel = 'logosw'),
                 'un modèle d''export Logos_w existe pour Tiroma (modeles_jeux)');

  -- 6. Branchement par le titulaire ; refusé à l'assistante.
  perform tests.b3_endosser('referent');
  return next throws_ok(format('select public.tiroma_brancher_cabinet(%L, %L, ''exports'', null)', banc, entite),
                        '42501', null, 'l''assistante ne branche pas le cabinet (42501)');
  perform tests.b3_endosser('gerant');
  v_branchement := public.tiroma_brancher_cabinet(banc, entite, 'exports', null);
  return next ok(v_branchement is not null, 'tiroma_brancher_cabinet rend le branchement');
  return next is((select statut from public.tiroma_cabinets where id = v_cabinet), 'actif', 'le cabinet passe « actif »');
  perform tests.redevenir_admin();
  return next ok((select count(*) from public.branchements_jeux j where j.branchement_id = v_branchement) >= 3,
                 format('le branchement porte ses jeux (%s)', (select string_agg(j.code, ', ' order by private.tiroma_ordre_jeu(j.code)) from public.branchements_jeux j where j.branchement_id = v_branchement)));
  return next ok((select module = 'tiroma' and entite_id = entite from public.branchements where id = v_branchement),
                 'le branchement est celui de Tiroma, sur l''entité du cabinet');

  -- 17. Journal opposable : la ligne du branchement, écrite par le socle, lue par le gérant, pas par le collaborateur.
  return next ok(tests.compter('public', 'journal_opposable', format('client_id = %L and action = ''tiroma.connecteur_active''', banc)) >= 1,
                 'le journal porte « tiroma.connecteur_active »');
  perform tests.b3_endosser('gerant');
  return next ok(tests.compter('public', 'journal_opposable', format('client_id = %L and action = ''tiroma.connecteur_active''', banc)) >= 1,
                 'le gérant lit cette ligne du journal');
  perform tests.b3_endosser('daf');
  return next is(tests.compter('public', 'journal_opposable', format('client_id = %L and action = ''tiroma.connecteur_active''', banc)), 0::bigint,
                 'le collaborateur (valideur) ne lit pas le journal');
  perform tests.b3_endosser('gerant');
  return next throws_ok(format('update public.journal_opposable set action = ''x'' where client_id = %L and action = ''tiroma.connecteur_active''', banc),
                        null, null, 'le journal ne se modifie pas');
  return next throws_ok(format('insert into public.journal_opposable (client_id, action, acteur_type, objet_type, objet_id, donnees) values (%L, ''tiroma.essai'', ''systeme'', ''essai'', ''x'', ''{}'')', banc),
                        null, null, 'le journal ne s''écrit pas directement : seulement par private.journaliser');

  -- 16. Mode réel : l'assistante non, le titulaire oui ; un mode inconnu est refusé.
  perform tests.b3_endosser('referent');
  return next throws_ok(format('select public.tiroma_changer_mode(%L, %L, ''reel'')', banc, entite),
                        '42501', null, 'l''assistante ne change pas le mode (42501)');
  perform tests.b3_endosser('gerant');
  return next throws_ok(format('select public.tiroma_changer_mode(%L, %L, ''essai'')', banc, entite),
                        '22023', null, 'un mode inconnu est refusé (22023)');
  perform public.tiroma_changer_mode(banc, entite, 'reel');
  return next is((select mode from public.tiroma_cabinets where id = v_cabinet), 'reel', 'le titulaire passe le cabinet en mode réel');
  return next ok((select mode_depuis > now() - interval '1 minute' from public.tiroma_cabinets where id = v_cabinet), 'mode_depuis est posé');
  perform public.tiroma_changer_mode(banc, entite, 'reel');
  return next is((select mode from public.tiroma_cabinets where id = v_cabinet), 'reel', 'rejouer le même mode ne change rien');

  -- 20 (début). Le titulaire coupe puis clôt son cabinet ; on ne branche pas un cabinet clos.
  update public.tiroma_cabinets set statut = 'coupe' where id = v_cabinet;
  return next is((select statut from public.tiroma_cabinets where id = v_cabinet), 'coupe', 'le titulaire coupe son cabinet (UPDATE sous RLS)');
  update public.tiroma_cabinets set statut = 'clos' where id = v_cabinet;
  return next throws_ok(format('select public.tiroma_brancher_cabinet(%L, %L, ''exports'', null)', banc, entite),
                        '55000', null, 'un cabinet clos ne se branche plus (55000)');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b3_03_');
