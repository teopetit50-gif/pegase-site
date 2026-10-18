-- 62 — lot 19at : le sceau du journal opposable, sa vérification, l'export daté ; un retrait de la dernière ligne ou une
-- réécriture, invisibles à la seule chaîne, sont révélés par un sceau noté plus tôt.
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql et le lot 19at.
-- runtests() annule tout ce que le test écrit (lignes de journal, sceaux, altérations simulées).

create or replace function tests.test_62_journal_sceau_export() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client_a uuid; client_b uuid; gerant uuid; membre uuid; i int;
  s jsonb; s2 jsonb; v jsonb; x jsonb; code text; n bigint;
begin
  if to_regprocedure('public.sceau_journal(uuid)') is null then
    return next ok(true, 'lot 19at absent de cet environnement : sans objet');
    return;
  end if;
  jeu := tests.jeu();
  client_a := (jeu ->> 'client_a')::uuid; client_b := (jeu ->> 'client_b')::uuid;
  gerant := (jeu ->> 'gerant_a')::uuid; membre := (jeu ->> 'user_a')::uuid;
  for i in 1..3 loop perform tests.journaliser(client_a, 'essai_a5_62_' || i); end loop;

  -- ── Droits ──
  return next ok(not has_function_privilege('anon', 'public.sceau_journal(uuid)', 'execute')
                 and not has_function_privilege('anon', 'public.exporter_journal(uuid, timestamptz, timestamptz)', 'execute')
                 and not has_table_privilege('authenticated', 'private.journal_sceaux', 'select'),
                 'anon ne scelle ni n''exporte ; authenticated ne lit pas la table des sceaux');
  perform tests.endosser(membre);
  begin perform public.sceau_journal(client_a); code := 'accepté'; exception when others then code := sqlstate; end;
  return next is(code, '42501', 'un simple membre ne scelle pas le journal');
  perform tests.redevenir_admin();
  perform tests.endosser(gerant);
  begin perform public.exporter_journal(client_b); code := 'accepté'; exception when others then code := sqlstate; end;
  return next is(code, '42501', 'le gérant de A n''exporte pas le journal de B');

  -- ── Sceau et vérification, par le gérant ──
  s := public.sceau_journal(client_a);
  return next ok((s ->> 'intacte')::boolean and s ->> 'empreinte' ~ '^[0-9a-f]{64}$' and (s ->> 'lignes')::bigint >= 3,
                 'le sceau rend la dernière ligne, son empreinte et une chaîne intacte');
  v := public.verifier_sceau_journal(client_a, (s ->> 'ligne')::bigint, s ->> 'empreinte');
  return next is(v ->> 'verdict', 'confirme', 'le sceau se vérifie aussitôt');

  -- ── Export daté et empreint ──
  x := public.exporter_journal(client_a);
  perform tests.redevenir_admin();
  return next ok((x ->> 'nombre')::bigint = (s ->> 'lignes')::bigint
                 and x ->> 'empreinte_sha256' = encode(sha256(convert_to((x -> 'lignes')::text, 'UTF8')), 'hex')
                 and x ? 'exporte_le',
                 'l''export porte toutes les lignes, sa date et l''empreinte de son contenu');
  return next ok((x -> 'lignes') @> jsonb_build_array(jsonb_build_object('action', 'essai_a5_62_3')), 'l''export contient les lignes du journal');
  select count(*) into n from private.journal_sceaux where client_id = client_a;
  return next ok(n >= 2, 'chaque sceau donné est inscrit (celui du gérant et celui de l''export)');
  begin
    update private.journal_sceaux set lignes = 0 where client_id = client_a; code := 'accepté';
  exception when others then code := sqlstate; end;
  return next is(code, '42501', 'un sceau inscrit ne se modifie pas');

  -- ── Ce que la chaîne seule ne voit pas, le sceau le voit ──
  begin
    execute 'alter table public.journal_opposable disable trigger user';
    execute format('update public.journal_opposable set hash = decode(repeat(''cd'', 32), ''hex'') where id = %s', s ->> 'ligne');
    execute 'alter table public.journal_opposable enable trigger user';
  exception when others then
    return next pass('Altération impossible même déclencheurs désactivés (' || sqlerrm || ') : simulation sans objet');
    return;
  end;
  v := public.verifier_sceau_journal(client_a, (s ->> 'ligne')::bigint, s ->> 'empreinte');
  return next is(v ->> 'verdict', 'reecrit', 'une dernière ligne réécrite est révélée par le sceau noté plus tôt');
  s2 := public.sceau_journal(client_a);
  return next ok(s2 ->> 'empreinte' <> s ->> 'empreinte', 'le nouveau sceau diffère de celui noté ailleurs');
end $f$;

select * from runtests('tests'::name, '^test_62_');
