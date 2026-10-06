-- 59 — lot 19am : l'aperçu d'effacement (gérant seulement, rien d'effacé ni d'écrit) et le marquage d'une réception
-- (qui peut la lire, statuts lue / ecartee / nouvelle, journal).
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql, 19ak et 19am.
-- runtests() annule tout ce que le test écrit (réceptions, objets Storage, règle d'essai essai_neuf).

create or replace function tests.test_59_apercu_effacement_reception_marquer() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client_a uuid; client_b uuid; gerant uuid; membre uuid; user_b uuid;
  ap jsonb; code text; v_statut text; n bigint; n_journal bigint; n_lignes_avant bigint;
  rec_libre bigint; rec_muree bigint; rec_traitee bigint;
begin
  if to_regprocedure('public.apercu_effacement(uuid)') is null then
    return next ok(true, 'lot 19am absent de cet environnement : sans objet');
    return;
  end if;
  jeu := tests.jeu();
  client_a := (jeu ->> 'client_a')::uuid; client_b := (jeu ->> 'client_b')::uuid;
  gerant := (jeu ->> 'gerant_a')::uuid; membre := (jeu ->> 'user_a')::uuid; user_b := (jeu ->> 'user_b')::uuid;

  -- ── Droits ──
  return next ok(not has_function_privilege('anon', 'public.apercu_effacement(uuid)', 'execute')
                 and not has_function_privilege('anon', 'public.reception_marquer(bigint, text)', 'execute'),
                 'anon n''exécute aucune des deux portes');
  return next ok(has_function_privilege('authenticated', 'public.apercu_effacement(uuid)', 'execute')
                 and has_function_privilege('authenticated', 'public.reception_marquer(bigint, text)', 'execute'),
                 'authenticated les exécute (les droits sont vérifiés dedans)');

  -- ── Aperçu d'effacement ──
  insert into storage.objects (bucket_id, name, metadata) values ('omega-clients', client_a || '/essai59/a.pdf', '{"size": 120}');
  select count(*) into n_lignes_avant from public.comptes where client_id = client_a;
  perform tests.endosser(membre);
  begin perform public.apercu_effacement(client_a); code := 'accepté'; exception when others then code := sqlstate; end;
  return next is(code, '42501', 'un collaborateur n''a pas l''aperçu');
  perform tests.redevenir_admin();
  perform tests.endosser(gerant);
  begin perform public.apercu_effacement(client_b); code := 'accepté'; exception when others then code := sqlstate; end;
  return next is(code, '42501', 'le gérant de A n''a pas l''aperçu de B');
  ap := public.apercu_effacement(client_a);
  perform tests.redevenir_admin();
  return next ok(jsonb_array_length(ap -> 'tables') > 0 and (ap ->> 'rien_n_est_efface')::boolean, 'l''aperçu liste les tables locataires');
  return next is((ap ->> 'comptes')::bigint, n_lignes_avant, 'il compte les comptes rattachés');
  return next ok((ap -> 'fichiers' ->> 'nombre')::bigint >= 1
                 and (ap -> 'fichiers' -> 'liste') @> jsonb_build_array(jsonb_build_object('nom', client_a || '/essai59/a.pdf')),
                 'il liste les fichiers du client');
  select count(*) into n from public.comptes where client_id = client_a;
  return next is(n, n_lignes_avant, 'rien n''est effacé');
  if to_regclass('private.manifestes_effacement') is not null then
    return next ok(not exists (select 1 from private.manifestes_effacement where cle = client_a::text and cree_le >= now()),
                   'aucun manifeste d''effacement n''est écrit');
  end if;

  -- ── Marquer une réception ──
  execute 'create function private.essai_neuf_peut_lire_reception(p_client uuid, p_user uuid) returns boolean language sql stable as '
       || quote_literal(format('select p_user = %L::uuid', gerant));
  rec_libre := (tests.inserer_minimal('public', 'receptions', jsonb_build_object('client_id', client_a, 'module', 'filed', 'canal', 'email',
                'boite', 'b@essai.invalid', 'identifiant_externe', 'essai59-libre', 'statut', 'nouvelle')) ->> 'id')::bigint;
  rec_muree := (tests.inserer_minimal('public', 'receptions', jsonb_build_object('client_id', client_a, 'module', 'essai_neuf', 'canal', 'email',
                'boite', 'b@essai.invalid', 'identifiant_externe', 'essai59-muree', 'statut', 'nouvelle')) ->> 'id')::bigint;
  rec_traitee := (tests.inserer_minimal('public', 'receptions', jsonb_build_object('client_id', client_a, 'module', 'filed', 'canal', 'email',
                'boite', 'b@essai.invalid', 'identifiant_externe', 'essai59-traitee', 'statut', 'traitee')) ->> 'id')::bigint;
  select count(*) into n_journal from public.journal_opposable where client_id = client_a and action = 'reception.marquee';

  perform tests.endosser(membre);
  return next is(public.reception_marquer(rec_libre, 'lue'), 'lue', 'un membre marque « lue » une réception qu''il peut lire');
  return next is(public.reception_marquer(rec_libre, 'ecartee'), 'ignoree', '« ecartee » s''inscrit « ignoree »');
  return next is(public.reception_marquer(rec_libre, 'ecartee'), 'ignoree', 'remarquer au même statut ne change rien');
  begin perform public.reception_marquer(rec_muree, 'lue'); code := 'accepté'; exception when others then code := sqlstate; end;
  return next is(code, 'P0002', 'le muré ne marque pas la réception qu''il ne peut pas lire (même réponse qu''introuvable)');
  begin perform public.reception_marquer(rec_traitee, 'nouvelle'); code := 'accepté'; exception when others then code := sqlstate; end;
  return next is(code, '55000', 'une réception traitée ne se remarque pas');
  begin perform public.reception_marquer(rec_libre, 'traitee'); code := 'accepté'; exception when others then code := sqlstate; end;
  return next is(code, '22023', 'seuls lue, ecartee et nouvelle sont acceptés');
  perform tests.redevenir_admin();

  perform tests.endosser(gerant);
  return next is(public.reception_marquer(rec_muree, 'lue'), 'lue', 'le gérant, que la règle du module autorise, la marque');
  perform tests.redevenir_admin();
  perform tests.endosser(user_b);
  begin perform public.reception_marquer(rec_libre, 'nouvelle'); code := 'accepté'; exception when others then code := sqlstate; end;
  return next is(code, 'P0002', 'le client B ne marque rien chez A');
  perform tests.redevenir_admin();

  select statut into v_statut from public.receptions where id = rec_libre;
  return next is(v_statut, 'ignoree', 'la réception écartée reste écartée');
  select count(*) - n_journal into n from public.journal_opposable where client_id = client_a and action = 'reception.marquee';
  return next is(n, 3::bigint, 'trois changements, trois lignes au journal (lue, ecartee, lue par le gérant)');
end $f$;

select * from runtests('tests'::name, '^test_59_');
