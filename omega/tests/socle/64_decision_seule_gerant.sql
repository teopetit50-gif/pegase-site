-- 64 — lot 19av : une seule personne suffit quand elle est gérante (ou d'un rôle désigné par le gérant).
-- Rouge avant 19av (le gérant ne décide pas de sa propre demande ni de ce qu'il a saisi), vert après.
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql et le lot 19av.
-- runtests() annule tout ce que le test écrit (client fictif A, comptes, demandes, approbations, réglage).
-- 27/10/2026 (convergence) : les demandes d'essai portent le module « essai ». Avec « daliro », la règle Daliro de
-- DAL-19 (b6_50, b6_71, décision de Teo du 25/10 : celui qui a saisi n'approuve pas ; seul décideur, liste blanche et
-- avenants seulement) s'appliquait et rendait le test rouge. Le cas Daliro est vérifié à part (2 bis).

create or replace function tests.test_64_decision_seule_gerant() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client uuid; gerant uuid; membre uuid; daf uuid := gen_random_uuid();
  dem uuid; code text; msg text; com text;
begin
  if to_regclass('public.demandes_validation') is null then
    return next ok(true, 'circuit de validation absent de cet environnement : sans objet');
    return;
  end if;
  jeu := tests.jeu();
  client := (jeu ->> 'client_a')::uuid; gerant := (jeu ->> 'gerant_a')::uuid; membre := (jeu ->> 'user_a')::uuid;

  -- ── 1. Le gérant approuve sa propre demande ordinaire ──
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  insert into public.demandes_validation (client_id, module, type_action, resume, cle_idempotence)
  values (client, 'essai', 'essai.a5', 'Demande du gérant (essai 64)', 'essai_a5_64_' || gen_random_uuid())
  returning id into dem;
  begin
    insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
    values (dem, client, gerant, 'approuve', 'Décidé seul');
    code := 'ok';
  exception when others then code := sqlstate; msg := sqlerrm; end;
  perform tests.redevenir_admin();
  return next is(code, 'ok', 'le gérant approuve sa propre demande' || coalesce(' (' || msg || ')', ''));
  select a.commentaire into com from public.approbations a where a.demande_id = dem and a.user_id = gerant;
  return next is(com, '[seul décideur] Décidé seul', 'l''approbation est marquée « [seul décideur] »');

  -- ── 2. Le gérant approuve une pièce qu'il a saisie (payload.saisi_par) ──
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  insert into public.demandes_validation (client_id, module, type_action, resume, cle_idempotence, payload)
  values (client, 'essai', 'essai.a5', 'Pièce saisie par le gérant (essai 64)', 'essai_a5_64_' || gen_random_uuid(),
          jsonb_build_object('saisi_par', jsonb_build_array(gerant::text)))
  returning id into dem;
  code := null; msg := null;
  begin
    insert into public.approbations (demande_id, client_id, user_id, decision) values (dem, client, gerant, 'approuve');
    code := 'ok';
  exception when others then code := sqlstate; msg := sqlerrm; end;
  perform tests.redevenir_admin();
  return next is(code, 'ok', 'le gérant approuve ce qu''il a saisi' || coalesce(' (' || msg || ')', ''));

  -- ── 2 bis. DAL-19 : pour une demande Daliro, le gérant qui l'a saisie ne l'approuve pas seul (hors avenant et liste
  --          blanche), dès qu'un second décideur existe ; sur la recette, le client A en a un, la DAF ci-dessous ──
  if to_regprocedure('private.btp_separer_saisie_decision()') is not null then
    perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
    insert into public.demandes_validation (client_id, module, type_action, resume, cle_idempotence, payload)
    values (client, 'daliro', 'essai.a5', 'Pièce Daliro saisie par le gérant (essai 64)', 'essai_a5_64_' || gen_random_uuid(),
            jsonb_build_object('saisi_par', jsonb_build_array(gerant::text)))
    returning id into dem;
    perform tests.redevenir_admin();
  end if;

  -- ── 3. Un valideur : refusé tant que le gérant ne l'a pas désigné, accepté ensuite ──
  begin
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)
    values (daf, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a5-daf-64@essai.invalid', 'x', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, false);
  exception when others then return next diag('auth.users non alimentée pour la DAF : ' || sqlerrm); end;
  perform tests.inserer_minimal('public', 'comptes', jsonb_build_object('user_id', daf, 'client_id', client, 'role', 'valideur', 'perimetre_total', true));
  perform tests.endosser(daf, 'a5-daf-64@essai.invalid');
  insert into public.demandes_validation (client_id, module, type_action, resume, cle_idempotence)
  values (client, 'essai', 'essai.a5', 'Demande de la DAF (essai 64)', 'essai_a5_64_' || gen_random_uuid())
  returning id into dem;
  return next throws_ok(format('insert into public.approbations (demande_id, client_id, user_id, decision) values (%L, %L, %L, ''approuve'')', dem, client, daf),
                        '42501', null, 'un valideur non désigné ne décide pas de sa propre demande');
  perform tests.redevenir_admin();
  perform tests.endosser(membre, 'a5-client-a@essai.invalid');
  begin perform public.regler_decision_seule(client, array['gerant', 'valideur']); code := 'accepté'; exception when others then code := sqlstate; end;
  perform tests.redevenir_admin();
  return next is(code, '42501', 'seul le gérant désigne qui peut décider seul');
  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  perform public.regler_decision_seule(client, array['gerant', 'valideur']);
  perform tests.redevenir_admin();
  perform tests.endosser(daf, 'a5-daf-64@essai.invalid');
  code := null; msg := null;
  begin
    insert into public.approbations (demande_id, client_id, user_id, decision) values (dem, client, daf, 'approuve');
    code := 'ok';
  exception when others then code := sqlstate; msg := sqlerrm; end;
  perform tests.redevenir_admin();
  return next is(code, 'ok', 'désignée par le gérant, la DAF valideur décide seule' || coalesce(' (' || msg || ')', ''));
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = client and j.action = 'validation.decision_seule_reglee'),
                 'la désignation est inscrite au journal opposable');

  -- ── 3 bis. DAL-19, la demande Daliro du 2 bis : la DAF existe, le gérant qui a saisi ne l'approuve pas ──
  if to_regprocedure('private.btp_separer_saisie_decision()') is not null then
    perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
    return next throws_ok(format('insert into public.approbations (demande_id, client_id, user_id, decision) values ((select d.id from public.demandes_validation d where d.client_id = %L and d.resume = ''Pièce Daliro saisie par le gérant (essai 64)''), %L, %L, ''approuve'')', client, client, gerant),
                          '42501', null, 'DAL-19 : le gérant qui a saisi une demande Daliro ne l''approuve pas seul');
    perform tests.redevenir_admin();
  end if;

  -- ── 4. Un simple membre ne décide jamais seul ──
  return next ok(not private.decide_seul((select d from public.demandes_validation d where d.id = dem), null, membre),
                 'un membre (rôle non désigné) ne décide pas seul');
end $f$;

select * from runtests('tests'::name, '^test_64_');
