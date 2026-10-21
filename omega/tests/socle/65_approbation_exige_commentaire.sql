-- 65 — lot 19aw : une demande exige_commentaire = true ne s'approuve pas sans commentaire (TCASHD-07).
-- Rouge avant 19aw (l'approbation sans commentaire passe), vert après.
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql et le lot 19aw.
-- runtests() annule tout ce que le test écrit (client fictif A, demandes, approbations).

create or replace function tests.test_65_approbation_exige_commentaire() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client uuid; gerant uuid; membre uuid; dem uuid; dem2 uuid; code text; msg text;
begin
  if to_regclass('public.demandes_validation') is null then
    return next ok(true, 'circuit de validation absent de cet environnement : sans objet');
    return;
  end if;
  jeu := tests.jeu();
  client := (jeu ->> 'client_a')::uuid; gerant := (jeu ->> 'gerant_a')::uuid; membre := (jeu ->> 'user_a')::uuid;

  perform tests.endosser(membre, 'a5-client-a@essai.invalid');
  insert into public.demandes_validation (client_id, module, type_action, resume, cle_idempotence, payload)
  values (client, 'daliro', 'essai.a5', 'Commentaire exigé (essai 65)', 'essai_a5_65_' || gen_random_uuid(),
          '{"exigences": {"commentaire": true}}')
  returning id into dem;
  insert into public.demandes_validation (client_id, module, type_action, resume, cle_idempotence, payload)
  values (client, 'daliro', 'essai.a5', 'Commentaire exigé, bis (essai 65)', 'essai_a5_65_' || gen_random_uuid(),
          '{"exigences": {"commentaire": true}}')
  returning id into dem2;
  perform tests.redevenir_admin();
  return next ok((select d.exige_commentaire from public.demandes_validation d where d.id = dem), 'la demande exige un commentaire');

  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  begin
    insert into public.approbations (demande_id, client_id, user_id, decision) values (dem, client, gerant, 'approuve');
    code := 'accepté';
  exception when others then code := sqlstate; msg := sqlerrm; end;
  perform tests.redevenir_admin();
  return next is(code, '23514', 'approuver sans commentaire est refusé à la saisie');
  return next is((select d.statut from public.demandes_validation d where d.id = dem), 'en_attente', 'la demande reste en attente');
  return next ok(coalesce(msg, '') like 'Cette demande exige un commentaire%', 'le refus est une phrase en français');

  perform tests.endosser(gerant, 'a5-gerant-a@essai.invalid');
  begin
    insert into public.approbations (demande_id, client_id, user_id, decision, commentaire) values (dem, client, gerant, 'approuve', '   ');
    code := 'accepté';
  exception when others then code := sqlstate; end;
  return next is(code, '23514', 'un commentaire fait d''espaces ne compte pas');
  code := null; msg := null;
  begin
    insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
    values (dem2, client, gerant, 'approuve', 'Montant vérifié avec le relevé.');
    code := 'ok';
  exception when others then code := sqlstate; msg := sqlerrm; end;
  perform tests.redevenir_admin();
  return next is(code, 'ok', 'avec un commentaire, l''approbation passe' || coalesce(' (' || msg || ')', ''));
end $f$;

select * from runtests('tests'::name, '^test_65_');
