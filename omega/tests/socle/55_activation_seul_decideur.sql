-- 55 — lot 19af : un gérant seul décideur active lui-même un accord permanent de la liste blanche, et rien d'autre
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql et le lot 19af.
-- runtests() annule tout ce que le test écrit (client fictif A, comptes, politiques, demandes, approbations).
-- Client A de tests.jeu() : un gérant (gerant_a) et un collaborateur (user_a), donc le gérant y est seul décideur
-- tant qu'on n'ajoute pas de valideur. Les politiques sont proposées comme le fait btp_donner_accord_j2 (b6_08) :
-- module daliro, nombre_mensuel 1000, un an ; le socle dépose leur demande « politique.activer ».

create or replace function tests.test_55_activation_seul_decideur() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client uuid; gerant uuid; membre uuid; daf uuid := gen_random_uuid();
  pol uuid; dem uuid; dem_libre uuid; etat text; com text; code text; msg text;
begin
  if to_regclass('public.politiques') is null or to_regclass('private.activation_seul_autorisee') is null then
    return next ok(true, 'politiques ou lot 19af absents de cet environnement : sans objet');
    return;
  end if;
  jeu := tests.jeu();
  client := (jeu ->> 'client_a')::uuid; gerant := (jeu ->> 'gerant_a')::uuid; membre := (jeu ->> 'user_a')::uuid;

  -- ── Garde-fous de droits ──
  return next ok(not has_table_privilege('anon', 'private.activation_seul_autorisee', 'select')
                 and not has_table_privilege('authenticated', 'private.activation_seul_autorisee', 'select'),
                 'anon et authenticated ne lisent pas la liste blanche');
  return next ok(not has_table_privilege('authenticated', 'private.activation_seul_autorisee', 'insert')
                 and not has_table_privilege('authenticated', 'private.activation_seul_autorisee', 'update'),
                 'authenticated n''écrit pas dans la liste blanche');
  return next ok(not has_function_privilege('anon', 'private.seul_decideur(uuid, uuid)', 'execute')
                 and not has_function_privilege('authenticated', 'private.seul_decideur(uuid, uuid)', 'execute'),
                 'anon et authenticated n''exécutent pas seul_decideur');
  return next ok(not has_function_privilege('anon', 'private.activation_par_seul_decideur(public.demandes_validation, uuid, uuid)', 'execute')
                 and not has_function_privilege('authenticated', 'private.activation_par_seul_decideur(public.demandes_validation, uuid, uuid)', 'execute'),
                 'anon et authenticated n''exécutent pas activation_par_seul_decideur');
  return next is((select count(*)::int from private.activation_seul_autorisee where module = 'daliro'
                    and type_action in ('envoi.email', 'envoi.whatsapp', 'envoi.sms')), 3,
                 'Liste blanche : les trois accords J-2 de Daliro');

  -- ── seul_decideur ──
  return next ok(private.seul_decideur(client, gerant), 'Le gérant sans autre gérant, admin ni valideur est seul décideur');
  return next ok(not private.seul_decideur(client, membre), 'Un collaborateur n''est jamais seul décideur');
  return next ok(not private.seul_decideur((jeu ->> 'client_b')::uuid, gerant), 'Ni le gérant d''une autre organisation');

  -- ── 1. Seul gérant : il active lui-même un accord J-2 (courriel) ──
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  insert into public.politiques (client_id, entite_id, module, type_action, libelle, nombre_mensuel, debut, fin)
  values (client, null, 'daliro', 'envoi.email', 'Accord J-2 courriel (essai A5)', 1000, now(), now() + interval '365 days')
  returning id into pol;
  perform tests.redevenir_admin();
  select p.demande_id into dem from public.politiques p where p.id = pol;
  return next ok(dem is not null and (select d.type_action = 'politique.activer' and d.demandeur_id = gerant and d.statut = 'en_attente'
                                      from public.demandes_validation d where d.id = dem),
                 'La politique proposée par le gérant a sa demande d''activation, dont il est le demandeur');
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  begin
    insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
    values (dem, client, gerant, 'approuve', 'Activation de l''accord J-2');
    code := 'ok';
  exception when others then
    code := sqlstate; msg := sqlerrm;
  end;
  perform tests.redevenir_admin();
  return next is(code, 'ok', 'Seul gérant : son approbation de l''activation est acceptée' || coalesce(' (' || msg || ')', ''));
  select p.statut into etat from public.politiques p where p.id = pol;
  return next is(etat, 'active', 'La politique est active');
  select a.commentaire into com from public.approbations a where a.demande_id = dem and a.user_id = gerant;
  return next is(com, '[seul décideur] Activation de l''accord J-2', 'Le commentaire est marqué « [seul décideur] »');

  -- ── 2. Même cas avec une DAF valideur active : refusé ──
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
    values (daf, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a5-daf-a@essai.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, false);
  exception when others then
    return next diag('auth.users non alimentée pour la DAF : ' || sqlerrm);
  end;
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', daf, 'client_id', client, 'role', 'valideur', 'perimetre_total', true));
  return next ok(not private.seul_decideur(client, gerant), 'Avec une DAF valideur active, le gérant n''est plus seul décideur');
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  insert into public.politiques (client_id, entite_id, module, type_action, libelle, nombre_mensuel, debut, fin)
  values (client, null, 'daliro', 'envoi.whatsapp', 'Accord J-2 WhatsApp (essai A5)', 1000, now(), now() + interval '365 days')
  returning id into pol;
  perform tests.redevenir_admin();
  select p.demande_id into dem from public.politiques p where p.id = pol;
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  return next throws_ok(format('insert into public.approbations (demande_id, client_id, user_id, decision) values (%L, %L, %L, ''approuve'')', dem, client, gerant),
                        '42501', 'Le demandeur ne décide pas de sa propre demande.', 'Avec une DAF valideur : 42501, le demandeur ne décide pas');
  perform tests.redevenir_admin();
  return next is((select p.statut from public.politiques p where p.id = pol), 'a_valider', 'La politique reste à valider');

  -- La DAF bannie n'est plus un compte actif : le gérant redevient seul décideur (pour les cas suivants).
  update auth.users set banned_until = now() + interval '1 day' where id = daf;
  return next ok(private.seul_decideur(client, gerant), 'DAF bannie : le gérant redevient seul décideur');

  -- ── 3. Politique hors liste blanche (même gérant seul) : refusé ──
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  insert into public.politiques (client_id, entite_id, module, type_action, libelle, nombre_mensuel, debut, fin)
  values (client, null, 'tavaro', 'envoi.email', 'Accord hors liste blanche (essai A5)', 1000, now(), now() + interval '365 days')
  returning id into pol;
  perform tests.redevenir_admin();
  select p.demande_id into dem from public.politiques p where p.id = pol;
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  return next throws_ok(format('insert into public.approbations (demande_id, client_id, user_id, decision) values (%L, %L, %L, ''approuve'')', dem, client, gerant),
                        '42501', 'Le demandeur ne décide pas de sa propre demande.', 'Politique hors liste blanche (tavaro/envoi.email) : 42501');
  perform tests.redevenir_admin();

  -- ── 4. Type d'action autre que politique.activer : refusé ──
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  insert into public.demandes_validation (client_id, module, type_action, resume, cle_idempotence)
  values (client, 'daliro', 'essai.a5', 'Demande ordinaire (essai A5)', 'essai_a5_55_' || gen_random_uuid())
  returning id into dem_libre;
  perform tests.redevenir_admin();
  return next ok((select d.demandeur_id = gerant and d.statut = 'en_attente' from public.demandes_validation d where d.id = dem_libre),
                 'Demande ordinaire du gérant, en attente');
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  return next throws_ok(format('insert into public.approbations (demande_id, client_id, user_id, decision) values (%L, %L, %L, ''approuve'')', dem_libre, client, gerant),
                        '42501', 'Le demandeur ne décide pas de sa propre demande.', 'Type d''action autre que politique.activer : 42501');
  perform tests.redevenir_admin();

  -- ── 5. Décision au nom d'un autre (délégation) : jamais l'exception ──
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  insert into public.politiques (client_id, entite_id, module, type_action, libelle, nombre_mensuel, debut, fin)
  values (client, null, 'daliro', 'envoi.sms', 'Accord J-2 SMS (essai A5)', 1000, now(), now() + interval '365 days')
  returning id into pol;
  perform tests.redevenir_admin();
  select p.demande_id into dem from public.politiques p where p.id = pol;
  begin
    perform tests.inserer_minimal('public', 'delegations', jsonb_build_object(
      'client_id', client, 'delegant', gerant, 'delegataire', membre,
      'debut', now() - interval '1 hour', 'fin', now() + interval '1 day'));
  exception when others then
    msg := sqlerrm;
  end;
  if msg is not null then
    return next diag('Délégation d''essai refusée : ' || msg);
  end if;
  perform tests.endosser(membre, 'a5-client-a@essai.invalid');
  code := null; msg := null;
  begin
    insert into public.approbations (demande_id, client_id, user_id, au_nom_de, decision)
    values (dem, client, membre, gerant, 'approuve');
    code := 'ok';
  exception when others then
    code := sqlstate; msg := sqlerrm;
  end;
  perform tests.redevenir_admin();
  return next is(code, '42501', 'Au nom du gérant (délégation) : 42501 (' || coalesce(msg, 'accepté !') || ')');
  return next is((select p.statut from public.politiques p where p.id = pol), 'a_valider', 'La politique SMS reste à valider');
end $f$;

select * from runtests('tests'::name, '^test_55_');
