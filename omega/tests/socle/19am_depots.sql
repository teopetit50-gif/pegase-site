-- Socle 19am — le dépôt par lot : droits, mot de passe jamais gardé, ouverture et fermeture après 10 échecs, liste,
-- réservation puis import, renommage limité, dépôt FILED imposé au client du dépôt. Après le lot 19am.
-- Client A de tests.jeu() : un gérant (gerant_a) et un collaborateur (user_a). runtests() annule tout.

create or replace function tests.test_socle_19am_depots() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client uuid; gerant uuid; membre uuid; r jsonb; r2 jsonb; v_depot uuid; code text; i integer;
  v_ident text; v_mdp text;
begin
  perform tests.redevenir_admin();
  jeu := tests.jeu();
  client := (jeu ->> 'client_a')::uuid; gerant := (jeu ->> 'gerant_a')::uuid; membre := (jeu ->> 'user_a')::uuid;

  -- ── Droits ──
  return next ok(not has_column_privilege('authenticated', 'public.depots', 'empreinte', 'select'),
                 'authenticated ne lit pas l''empreinte du mot de passe');
  return next ok(not has_table_privilege('authenticated', 'public.depots', 'insert')
                 and not has_table_privilege('authenticated', 'public.depots', 'update')
                 and not has_table_privilege('authenticated', 'public.depots_fichiers', 'insert')
                 and not has_table_privilege('authenticated', 'public.depots_fichiers', 'update'),
                 'authenticated n''écrit ni les dépôts ni ce qu''ils reçoivent');
  return next ok(not has_table_privilege('authenticated', 'private.depots_echecs', 'select'), 'les échecs sont illisibles');
  return next ok((select relrowsecurity from pg_class where oid = 'public.depots'::regclass)
                 and (select relrowsecurity from pg_class where oid = 'public.depots_fichiers'::regclass), 'RLS active');
  return next ok(not has_function_privilege('authenticated', 'public.depot_ouvrir(text, text, text)', 'execute')
                 and not has_function_privilege('anon', 'public.depot_ouvrir(text, text, text)', 'execute')
                 and not has_function_privilege('authenticated', 'public.depot_deposer_filed(uuid, uuid, text, text, bigint, text, text, text)', 'execute'),
                 'les portes de l''ouvrier sont fermées à anon et authenticated');

  -- ── 1. Créer : gérant seulement ; le mot de passe est rendu une fois, seule son empreinte est gardée ──
  perform tests.endosser(membre, 'a2-user-a@essai.invalid');
  begin perform public.depot_creer(client, 'Scans du cabinet'); code := 'ok';
  exception when others then code := sqlstate; end;
  return next is(code, '42501', 'un collaborateur n''ouvre pas de dépôt (42501)');
  perform tests.endosser(gerant, 'a2-gerant-a@essai.invalid');
  begin perform public.depot_creer(client, 'Autre', 'tavaro'); code := 'ok';
  exception when others then code := sqlstate; end;
  return next is(code, '22023', 'seul FILED est branché (22023)');
  r := public.depot_creer(client, 'Scans du cabinet');
  v_depot := (r ->> 'depot')::uuid; v_ident := r ->> 'identifiant'; v_mdp := r ->> 'mot_de_passe';
  return next ok(v_ident ~ '^depot-[a-z0-9]{12}$' and v_mdp ~ '^[0-9a-f]{32}$', 'identifiant et mot de passe rendus');
  perform tests.redevenir_admin();
  return next ok((select empreinte from public.depots where id = v_depot) = private.depot_empreinte(v_mdp)
                 and not exists (select 1 from public.depots where id = v_depot and empreinte = v_mdp),
                 'seule l''empreinte est gardée');

  -- ── 2. Ouvrir ──
  perform tests.endosser_serveur();
  r2 := public.depot_ouvrir(v_ident, private.depot_empreinte(v_mdp), '203.0.113.7');
  return next is((r2 ->> 'client_id')::uuid, client, 'bon mot de passe : le dépôt s''ouvre sur son organisation');
  return next ok(public.depot_ouvrir(v_ident, private.depot_empreinte('faux'), '203.0.113.7') is null, 'mauvais mot de passe : null');
  for i in 1..10 loop
    perform public.depot_ouvrir(v_ident, private.depot_empreinte('faux'), '203.0.113.7');
  end loop;
  return next ok(public.depot_ouvrir(v_ident, private.depot_empreinte(v_mdp), '203.0.113.7') is null,
                 'après 10 échecs en 15 minutes, même le bon mot de passe attend');
  perform tests.redevenir_admin();
  delete from private.depots_echecs where identifiant = v_ident;

  -- ── 3. Recevoir : réservation (0 octet), dossier, renommage, import, liste ──
  perform tests.endosser_serveur();
  perform public.depot_noter(v_depot, 'Nouveau dossier', true, 0, null, 'dossier');
  return next ok(public.depot_renommer(v_depot, 'Nouveau dossier', 'Septembre'), 'un dossier vide se renomme');
  perform public.depot_noter(v_depot, 'Septembre/f1.pdf', false, 0, null, 'vide');
  perform public.depot_noter(v_depot, 'Septembre/f1.pdf', false, 16, repeat('a', 64), 'importe', gen_random_uuid(), 'REC-2026-0001');
  return next ok(not public.depot_renommer(v_depot, 'Septembre/f1.pdf', 'Septembre/f2.pdf'), 'une pièce reçue ne se renomme plus');
  return next ok(not public.depot_renommer(v_depot, 'Septembre', 'Octobre'), 'un dossier qui contient une pièce ne se renomme plus');
  r := public.depot_lister(v_depot);
  return next is(jsonb_array_length(r), 2, 'la liste montre le dossier et la pièce');
  return next is((select x ->> 'etat' from jsonb_array_elements(r) x where x ->> 'chemin' = 'Septembre/f1.pdf'), 'importe',
                 'la réservation est devenue une pièce importée');
  perform tests.redevenir_admin();
  return next ok((select dernier_depot_le is not null from public.depots where id = v_depot), 'dernier dépôt noté');

  -- ── 4. Lecture à l'écran ──
  perform tests.endosser(membre, 'a2-user-a@essai.invalid');
  return next is((select count(*)::int from public.depots_fichiers where depot_id = v_depot), 2,
                 'un membre voit ce que le dépôt a reçu');
  return next is((select count(*)::int from public.depots where id = v_depot), 0, 'un collaborateur ne voit pas le dépôt lui-même');
  perform tests.endosser(gerant, 'a2-gerant-a@essai.invalid');
  return next is((select libelle from public.depots where id = v_depot), 'Scans du cabinet', 'le gérant voit son dépôt');

  -- ── 5. Renouveler puis fermer ──
  r2 := public.depot_renouveler(v_depot);
  perform tests.endosser_serveur();
  return next ok(public.depot_ouvrir(v_ident, private.depot_empreinte(v_mdp), null) is null, 'l''ancien mot de passe ne marche plus');
  return next ok(public.depot_ouvrir(v_ident, private.depot_empreinte(r2 ->> 'mot_de_passe'), null) is not null, 'le nouveau, si');
  perform tests.endosser(gerant, 'a2-gerant-a@essai.invalid');
  perform public.depot_fermer(v_depot);
  perform tests.endosser_serveur();
  return next ok(public.depot_ouvrir(v_ident, private.depot_empreinte(r2 ->> 'mot_de_passe'), null) is null, 'un dépôt fermé ne s''ouvre plus');
  begin perform public.depot_noter(v_depot, 'x.pdf', false, 1, null, 'vide'); code := 'ok';
  exception when others then code := sqlstate; end;
  return next is(code, 'P0002', 'un dépôt fermé ne reçoit plus rien (P0002)');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_socle_19am_');
