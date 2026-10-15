-- 08 — L'export d'un dossier et du cabinet (étape 13). Après 00_jeu_tamila.sql. runtests() annule tout.

create or replace function tests.test_b4_08_export() returns setof text
language plpgsql as $f$
declare jeu jsonb; v_dossier uuid; v_e uuid; e public.tamila_exports; v_chemin text; v_cab uuid;
begin
  jeu := tests.tamila_scene();
  v_dossier := (jeu ->> 'dossier')::uuid;

  -- Exporter est une lecture : elle se trace d'abord.
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select public.tamila_demander_export(%L::uuid)', v_dossier), '42501', null, 'sans lecture tracée, pas d''export (42501)');
  perform public.tamila_consulter(v_dossier, 'export');
  v_e := public.tamila_demander_export(v_dossier);
  perform tests.redevenir_admin();
  select * into e from public.tamila_exports where id = v_e;
  return next is(e.statut, 'a_preparer', 'l''export est à préparer');
  return next is(e.demande_par, (jeu ->> 'avocat')::uuid, 'demandé par Me Rousseau');
  return next ok(exists (select 1 from public.travaux w where w.client_id = (jeu ->> 'client')::uuid and w.module = 'tamila' and w.genre = 'tamila.exporter'
                         and w.charge ->> 'export' = v_e::text), 'un travail « tamila.exporter » attend l''ouvrier');

  -- Avant que l'archive soit prête : rien à télécharger.
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select public.tamila_telecharger_export(%L::uuid)', v_e), '55000', null, 'pas encore prête (55000)');
  return next throws_ok(format('select public.tamila_export_pret(%L::uuid, ''x'', 1, %L)', v_e, repeat('a', 64)), '42501', null, 'une personne ne déclare pas l''archive prête : le serveur (42501)');
  perform tests.redevenir_admin();

  -- Le serveur range l'archive sous le cabinet et son dossier.
  v_chemin := (jeu ->> 'client') || '/tamila_dossier/' || v_dossier::text || '/exports/' || v_e::text || '.zip';
  perform tests.endosser_serveur();
  return next throws_ok(format('select public.tamila_export_pret(%L::uuid, %L, 1024, %L)', v_e, 'ailleurs/' || v_e::text || '.zip', repeat('a', 64)), '22023', null,
    'une archive hors du dossier est refusée (22023)');
  return next lives_ok(format('select public.tamila_export_pret(%L::uuid, %L, 1024, %L)', v_e, v_chemin, repeat('a', 64)), 'le serveur déclare l''archive prête');
  return next throws_ok(format('select public.tamila_export_pret(%L::uuid, %L, 1024, %L)', v_e, v_chemin, repeat('a', 64)), '55000', null, 'une seule fois (55000)');
  perform tests.redevenir_admin();
  select * into e from public.tamila_exports where id = v_e;
  return next is(e.statut, 'pret', 'prête');
  return next ok(e.expire_le > now() + interval '6 days' and e.expire_le < now() + interval '8 days', 'elle expire dans sept jours (conservation_exports_jours)');
  return next is(e.empreinte_manifeste, repeat('a', 64), 'l''empreinte du manifeste est gardée');

  -- Téléchargement : par qui voit le dossier, tracé comme une lecture.
  perform tests.endosser((jeu ->> 'autre_gerant')::uuid, 'b4-voisin@essai.invalid');
  return next throws_ok(format('select public.tamila_telecharger_export(%L::uuid)', v_e), '42501', null, 'le cabinet voisin ne télécharge pas (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next is(public.tamila_telecharger_export(v_e), v_chemin, 'le stagiaire lecteur, membre du dossier, obtient le chemin');
  perform tests.redevenir_admin();
  select * into e from public.tamila_exports where id = v_e;
  return next is(e.telechargements, 1, 'un téléchargement compté');
  return next ok(exists (select 1 from public.lectures l where l.client_id = (jeu ->> 'client')::uuid and l.objet_type = 'tamila_dossier' and l.objet_id = v_dossier::text
                         and l.user_id = (jeu ->> 'stagiaire')::uuid), 'le téléchargement est inscrit comme une lecture du dossier');

  -- L'export du cabinet entier : le gérant seul, les autres associés prévenus.
  perform tests.endosser((jeu ->> 'admin')::uuid, 'b4-haddad@essai.invalid');
  return next throws_ok(format('select public.tamila_demander_export_cabinet(%L::uuid)', jeu ->> 'client'), '42501', null, 'un admin ne demande pas l''export du cabinet (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  v_cab := public.tamila_demander_export_cabinet((jeu ->> 'client')::uuid);
  return next is(tests.compter('public', 'tamila_exports', format('id = %L', v_cab)), 1::bigint, 'le gérant lit son export de cabinet');
  perform tests.redevenir_admin();
  return next ok((select dossier_id from public.tamila_exports where id = v_cab) is null, 'export sans dossier : tout le cabinet');
  perform tests.endosser((jeu ->> 'admin')::uuid, 'b4-haddad@essai.invalid');
  return next is(tests.compter('public', 'tamila_exports', format('id = %L', v_cab)), 0::bigint, 'l''admin ne le lit pas (réservé au gérant)');
  perform tests.redevenir_admin();
  return next ok(tests.tamila_clair_dans('alertes', 'export_cabinet:' || v_cab::text) >= 1 or not tests.table_existe('alertes'), 'les associés sont prévenus par une alerte');

  -- Expiration et purge par la ronde.
  update public.tamila_exports set expire_le = now() - interval '1 minute' where id = v_e;
  perform private.tamila_tache_horaire(now());
  return next is((select statut from public.tamila_exports where id = v_e), 'expire', 'passée l''échéance, l''archive est expirée par la ronde');
  return next ok(exists (select 1 from public.travaux w where w.genre = 'tamila.purger_export' and w.charge ->> 'export' = v_e::text), 'un travail de purge est déposé');
  perform tests.endosser_serveur();
  return next lives_ok(format('select public.tamila_export_purge(%L::uuid)', v_e), 'le serveur purge l''archive (le fichier n''est pas au coffre)');
  perform tests.redevenir_admin();
  return next ok((select purge_le from public.tamila_exports where id = v_e) is not null, 'purgée');
end $f$;

select * from runtests('tests'::name, '^test_b4_08_');
