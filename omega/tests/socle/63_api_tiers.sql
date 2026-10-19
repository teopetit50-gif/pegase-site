-- 63 — lot 19au : l'interface de programmation pour un tiers — catalogue documenté, clés (secret montré une fois,
-- empreinte gardée), portées, quota du jour, révocation, cloisonnement.
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql et le lot 19au.
-- runtests() annule tout ce que le test écrit (porte offerte, clés, usage, lignes de journal).

create or replace function tests.test_63_api_tiers() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client_a uuid; client_b uuid; gerant uuid; membre uuid;
  doc jsonb; c jsonb; c2 jsonb; a jsonb; l jsonb; code text; n bigint; i int;
begin
  if to_regprocedure('public.api_authentifier(text, text)') is null then
    return next ok(true, 'lot 19au absent de cet environnement : sans objet');
    return;
  end if;
  jeu := tests.jeu();
  client_a := (jeu ->> 'client_a')::uuid; client_b := (jeu ->> 'client_b')::uuid;
  gerant := (jeu ->> 'gerant_a')::uuid; membre := (jeu ->> 'user_a')::uuid;

  -- ── Droits ──
  return next ok(not has_function_privilege('authenticated', 'public.api_authentifier(text, text)', 'execute')
                 and not has_function_privilege('anon', 'public.api_authentifier(text, text)', 'execute')
                 and not has_function_privilege('anon', 'public.creer_cle_api(uuid, text, text[], integer)', 'execute')
                 and not has_table_privilege('authenticated', 'private.cles_api', 'select'),
                 'seul le service authentifie une clé ; anon ne crée rien ; les clés ne se lisent pas en table');

  -- ── Catalogue : vide par défaut pour cette porte, puis offerte et documentée ──
  perform private.api_offrir_porte('verifier_journal_client', 'Vérifie la chaîne du journal opposable de l''organisation.', true, 'socle');
  doc := public.api_documentation();
  return next ok(doc @> '[{"porte": "verifier_journal_client", "lecture": true}]'::jsonb
                 and jsonb_array_length((select e -> 'signatures' from jsonb_array_elements(doc) e where e ->> 'porte' = 'verifier_journal_client')) >= 1,
                 'la porte offerte est documentée, avec sa signature lue dans le catalogue');
  begin perform private.api_offrir_porte('porte_qui_n_existe_pas', 'x'); code := 'accepté'; exception when others then code := sqlstate; end;
  return next is(code, '42883', 'on n''offre pas une porte qui n''existe pas');

  -- ── Création de clé ──
  perform tests.endosser(membre);
  begin perform public.creer_cle_api(client_a, 'essai', array['verifier_journal_client']); code := 'accepté'; exception when others then code := sqlstate; end;
  return next is(code, '42501', 'un simple membre ne crée pas de clé');
  perform tests.redevenir_admin();
  perform tests.endosser(gerant);
  begin perform public.creer_cle_api(client_b, 'essai', array['verifier_journal_client']); code := 'accepté'; exception when others then code := sqlstate; end;
  return next is(code, '42501', 'le gérant de A ne crée pas de clé pour B');
  begin perform public.creer_cle_api(client_a, 'essai', array['effacer_objet']); code := 'accepté'; exception when others then code := sqlstate; end;
  return next is(code, '22023', 'une portée hors du catalogue est refusée');
  c := public.creer_cle_api(client_a, 'Logiciel de facturation', array['verifier_journal_client'], 2);
  l := public.lister_cles_api(client_a);
  perform tests.redevenir_admin();
  return next ok(c ->> 'secret' ~ '^omk_[0-9a-f]{64}$', 'le secret est rendu une fois, à la création');
  return next ok(not exists (select 1 from private.cles_api k where k.id = (c ->> 'id')::uuid and k.empreinte = c ->> 'secret')
                 and exists (select 1 from private.cles_api k where k.id = (c ->> 'id')::uuid
                             and k.empreinte = encode(sha256(convert_to(c ->> 'secret', 'UTF8')), 'hex')),
                 'seule l''empreinte du secret est gardée');
  return next ok(l::text not like '%' || (c ->> 'secret') || '%' and jsonb_array_length(l) = 1, 'la liste des clés ne montre jamais le secret');
  select count(*) into n from public.journal_opposable where client_id = client_a and action = 'api.cle_creee';
  return next is(n, 1::bigint, 'la création est inscrite au journal opposable');

  -- ── Authentification par la passerelle (service) ──
  a := public.api_authentifier(c ->> 'secret', 'verifier_journal_client');
  return next ok((a ->> 'client_id')::uuid = client_a and (a ->> 'reste_du_jour')::int = 1, 'la clé ouvre sa porte, pour sa seule organisation');
  begin perform public.api_authentifier(c ->> 'secret', 'sceau_journal'); code := 'accepté'; exception when others then code := sqlstate; end;
  return next is(code, '42501', 'une porte hors des portées de la clé est refusée');
  begin perform public.api_authentifier('omk_' || repeat('0', 64), 'verifier_journal_client'); code := 'accepté'; exception when others then code := sqlstate; end;
  return next is(code, '42501', 'une clé inconnue est refusée');
  perform public.api_authentifier(c ->> 'secret', 'verifier_journal_client');
  begin perform public.api_authentifier(c ->> 'secret', 'verifier_journal_client'); code := 'accepté'; exception when others then code := sqlstate; end;
  return next is(code, '54000', 'au-delà du quota du jour (2), l''appel est refusé');

  -- ── Retrait du catalogue, révocation ──
  c2 := public.creer_cle_api(client_a, 'Deuxième', array['verifier_journal_client'], 10);
  perform private.api_offrir_porte('verifier_journal_client', 'retirée', true, 'socle', false);
  begin perform public.api_authentifier(c2 ->> 'secret', 'verifier_journal_client'); code := 'accepté'; exception when others then code := sqlstate; end;
  return next is(code, '42501', 'une porte retirée du catalogue n''est plus ouverte, même par une clé qui la portait');
  perform private.api_offrir_porte('verifier_journal_client', 'remise', true, 'socle', true);
  perform tests.endosser(gerant);
  perform public.revoquer_cle_api((c2 ->> 'id')::uuid);
  perform tests.redevenir_admin();
  begin perform public.api_authentifier(c2 ->> 'secret', 'verifier_journal_client'); code := 'accepté'; exception when others then code := sqlstate; end;
  return next is(code, '42501', 'une clé révoquée est refusée');
end $f$;

select * from runtests('tests'::name, '^test_63_');
