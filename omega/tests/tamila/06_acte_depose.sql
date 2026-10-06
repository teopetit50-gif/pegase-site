-- 06 — L'acte déposé clôt le délai (étape 11). Après 00_jeu_tamila.sql. runtests() annule tout.

create or replace function tests.test_b4_06_acte_depose() returns setof text
language plpgsql as $f$
declare jeu jsonb; v_dossier uuid; v_appel uuid; t public.tamila_delais; v_piece uuid; v_tard uuid; r jsonb; v_jour date := (now() at time zone 'Europe/Paris')::date;
begin
  jeu := tests.tamila_scene();
  v_dossier := (jeu ->> 'dossier')::uuid;
  v_appel := tests.tamila_appel(jeu);
  select * into t from public.tamila_delais where appel_id = v_appel and nature = 'regle' order by echeance_retenue limit 1;
  return next ok(t.id is not null, 'un délai de la déclaration d''appel est posé');

  -- Le serveur ne clôt que sur un accusé de dépôt ; une date future est refusée ; la pièce doit être du dossier.
  perform tests.endosser_serveur();
  return next throws_ok(format('select public.tamila_declarer_acte(%L::uuid, v_jour)', t.id), '42501', null, 'le serveur clôt un délai sur un accusé de dépôt seulement (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select public.tamila_declarer_acte(%L::uuid, v_jour + 1)', t.id), '22023', null, 'la date du dépôt est passée ou du jour (22023)');
  return next throws_ok(format('select public.tamila_declarer_acte(%L::uuid, v_jour, gen_random_uuid())', t.id), '22023', null, 'la pièce doit être dans le dossier (22023)');
  perform tests.redevenir_admin();
  -- L'assistante (pas avocat) ne déclare pas un acte sans pièce.
  perform tests.endosser((jeu ->> 'assistante')::uuid, 'b4-assistante@essai.invalid');
  return next throws_ok(format('select public.tamila_declarer_acte(%L::uuid, v_jour)', t.id), '42501', null, 'une déclaration sans pièce revient à un avocat (42501)');
  perform tests.redevenir_admin();

  -- L'accusé de dépôt RPVA, lu comme pièce, puis rattaché par l'acte.
  v_piece := tests.tamila_piece(jeu, 'accuse-depot-conclusions.pdf');
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  r := public.tamila_avis_lu((jeu ->> 'client')::uuid, v_dossier, v_piece, 'rpva_accuse_depot', jsonb_build_object('date_avis', v_jour, 'depose_le', v_jour::text || 'T11:05:00'));
  return next is(r ->> 'statut', 'a_rattacher', 'l''accusé attend son délai');
  return next lives_ok(format('select public.tamila_declarer_acte(%L::uuid, v_jour, %L::uuid)', t.id, v_piece), 'l''avocat déclare l''acte déposé, preuve : l''accusé RPVA');
  perform tests.redevenir_admin();
  select * into t from public.tamila_delais where id = t.id;
  return next is(t.statut, 'clos', 'le délai est clos');
  return next is(t.motif_cloture, 'accuse_rpva', 'sur accusé RPVA');
  return next is(t.preuve_piece_id, v_piece, 'la preuve est la pièce');
  return next is(t.acte_depose_le, v_jour, 'déposé aujourd''hui');
  return next is(t.clos_par, (jeu ->> 'avocat')::uuid, 'clos par Me Rousseau');
  return next is((select statut from public.delais where id = t.delai_id), 'tenu', 'le délai B5 est tenu');
  return next is((select statut from public.tamila_avis where id = (r ->> 'avis')::uuid), 'applique', 'l''accusé est rattaché (appliqué, délai clos)');
  return next is((select statut from public.demandes_validation where id = t.demande_id), 'annulee', 'la demande de confirmation, devenue sans objet, est annulée');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = (jeu ->> 'client')::uuid and j.action = 'tamila.delai.clos' and j.objet_id = v_dossier::text),
    'la clôture du délai est au journal (tamila.delai.clos)');
  return next throws_ok(format('select public.tamila_declarer_acte(%L::uuid, v_jour)', t.id), '42501', null, 'clos : rien ne se rejoue par le serveur (42501)');
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select public.tamila_declarer_acte(%L::uuid, v_jour)', t.id), '55000', null, 'ni par l''avocat : déjà clos (55000)');
  return next throws_ok(format('select public.tamila_corriger_delai(%L::uuid, v_jour + 10, ''autre'')', t.id), '55000', null, 'ni corrigé (55000)');
  perform tests.redevenir_admin();
  return next throws_ok(format('update public.tamila_delais set acte_depose_le = v_jour - 1 where id = %L', t.id), '55000', null, 'un délai clos ne change plus, même pour postgres (déclencheur)');

  -- Un acte déposé après l'échéance : clos quand même, mais une alerte critique.
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  v_tard := public.tamila_poser_date(v_dossier, v_jour - 10, 'autre', 'saisie');
  return next lives_ok(format('select public.tamila_declarer_acte(%L::uuid, v_jour)', v_tard), 'un acte déclaré après la date fixée est enregistré');
  perform tests.redevenir_admin();
  return next is((select statut from public.tamila_delais where id = v_tard), 'clos', 'clos, motif déclaration');
  return next is((select motif_cloture from public.tamila_delais where id = v_tard), 'declaration', 'motif : déclaration de l''avocat');
  return next ok(tests.tamila_clair_dans('alertes', 'delai_hors_delai:' || v_tard::text) >= 1 or tests.tamila_clair_dans('alertes', 'après l''échéance') >= 1
                 or not tests.table_existe('alertes'), 'une alerte critique « acte déposé après l''échéance » est levée (si la table alertes est là)');
end $f$;

select * from runtests('tests'::name, '^test_b4_06_');
