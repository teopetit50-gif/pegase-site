-- 57 — lot 19aj : export complet d'un client, fichiers Storage compris
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql et le lot 19aj.
-- runtests() annule tout ce que le test écrit (demandes d'export, objets Storage fictifs).
-- La fonction Edge export-complet (zip chiffré, lien signé) a ses propres tests Deno ; ici, les portes en base.

create or replace function tests.test_57_export_complet() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client_a uuid; client_b uuid; gerant uuid; membre uuid; user_b uuid;
  ex uuid; code text; n bigint; v_statut text;
begin
  if to_regclass('public.exports_complets') is null then
    return next ok(true, 'lot 19aj absent de cet environnement : sans objet');
    return;
  end if;
  jeu := tests.jeu();
  client_a := (jeu ->> 'client_a')::uuid; client_b := (jeu ->> 'client_b')::uuid;
  gerant := (jeu ->> 'gerant_a')::uuid; membre := (jeu ->> 'user_a')::uuid; user_b := (jeu ->> 'user_b')::uuid;

  -- ── Droits ──
  return next ok(has_function_privilege('authenticated', 'public.demander_export_complet(uuid)', 'execute')
                 and not has_function_privilege('anon', 'public.demander_export_complet(uuid)', 'execute'),
                 'la demande est ouverte à authenticated, fermée à anon');
  return next ok(not has_function_privilege('authenticated', 'private.export_complet_fichiers(uuid)', 'execute')
                 and not has_function_privilege('authenticated', 'private.export_complet_fini(uuid, text, bigint, text, integer, integer, timestamp with time zone)', 'execute')
                 and not has_function_privilege('authenticated', 'private.exports_complets_expires()', 'execute')
                 and not has_function_privilege('authenticated', 'public.export_complet_fichiers(uuid)', 'execute')
                 and not has_function_privilege('anon', 'public.export_complet_fini(uuid, text, bigint, text, integer, integer, timestamp with time zone)', 'execute')
                 and has_function_privilege('service_role', 'public.export_complet_fichiers(uuid)', 'execute'),
                 'la liste des fichiers et l''issue sont réservées au service');
  return next ok(not has_table_privilege('authenticated', 'public.exports_complets', 'insert')
                 and not has_table_privilege('authenticated', 'public.exports_complets', 'update'),
                 'authenticated n''écrit pas les exports directement');

  -- ── Qui peut demander ──
  perform tests.endosser(membre);
  begin
    perform public.demander_export_complet(client_a); code := 'accepté';
  exception when others then code := sqlstate; end;
  perform tests.redevenir_admin();
  return next is(code, '42501', 'un collaborateur ne demande pas l''export complet');

  -- Un admin du client ne demande pas non plus (19an : gérant seul, comme exporter_donnees_client).
  if to_regclass('public.exports_complets') is not null and tests.role_admis('admin') = 'admin' then
    update public.comptes set role = 'admin' where user_id = membre and client_id = client_a;
    perform tests.endosser(membre);
    begin
      perform public.demander_export_complet(client_a); code := 'accepté';
    exception when others then code := sqlstate || ' ' || sqlerrm; end;
    perform tests.redevenir_admin();
    update public.comptes set role = (jeu ->> 'role_membre') where user_id = membre and client_id = client_a;
    return next ok(code like '42501 %gérant%', 'un admin ne demande pas l''export complet, avec un message clair (' || code || ')');
  end if;

  perform tests.endosser(gerant);
  begin
    perform public.demander_export_complet(client_b); code := 'accepté';
  exception when others then code := sqlstate; end;
  return next is(code, '42501', 'le gérant de A ne demande pas l''export de B');
  ex := public.demander_export_complet(client_a);
  return next ok(ex is not null, 'le gérant de A demande l''export de A');
  begin
    perform public.demander_export_complet(client_a); code := 'accepté';
  exception when others then code := sqlstate; end;
  return next is(code, '55P03', 'une seconde demande pendant la première est refusée');
  perform tests.redevenir_admin();

  -- ── Les fichiers du client, et seulement les siens ──
  insert into storage.objects (bucket_id, name, metadata) values
    ('omega-clients', client_a::text || '/filed/f1.pdf', '{"size": 100}'),
    ('omega-clients', client_a::text || '/tamila/f2.bin', '{"size": 50}'),
    ('omega-clients', client_b::text || '/filed/autre.pdf', '{"size": 70}');
  select count(*) into n from private.export_complet_fichiers(ex);
  return next is(n, 2::bigint, 'deux fichiers pour A, aucun de B');

  -- ── Issue et expiration ──
  perform private.export_complet_fini(ex, client_a::text || '/' || ex::text || '.zip', 1234, repeat('a', 64), 2, 0, now() - interval '1 minute');
  select statut into v_statut from public.exports_complets where id = ex;
  return next is(v_statut, 'pret', 'l''export est prêt');
  select count(*) into n from private.exports_complets_expires() where id = ex;
  return next is(n, 1::bigint, 'un export échu est rendu pour retrait');
  perform private.export_complet_expire(ex);
  select statut into v_statut from public.exports_complets where id = ex;
  return next is(v_statut, 'expire', 'puis marqué expiré');

  -- ── Lecture cloisonnée ──
  perform tests.endosser(user_b);
  select count(*) into n from public.exports_complets where client_id = client_a;
  perform tests.redevenir_admin();
  return next is(n, 0::bigint, 'le client B ne voit pas les exports de A');
end $f$;

select * from runtests('tests'::name, '^test_57_');
