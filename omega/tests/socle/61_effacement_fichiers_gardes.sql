-- 61 — lot 19as : l'effacement garde les fichiers que la loi impose (pièces FILED), les liste « gardés » au manifeste,
-- et ne refuse plus pour eux.
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql et le lot 19as.
-- runtests() annule tout ce que le test écrit (pièces, objets Storage, manifestes).

create or replace function tests.test_61_effacement_fichiers_gardes() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client_a uuid; o1 text := gen_random_uuid()::text; o2 text := gen_random_uuid()::text;
  f_garde text; f_libre text; f_seul text; r jsonb; n bigint; code text;
begin
  if to_regprocedure('private.fichiers_gardes(uuid, text, text)') is null then
    return next ok(true, 'lot 19as absent de cet environnement : sans objet');
    return;
  end if;
  jeu := tests.jeu();
  client_a := (jeu ->> 'client_a')::uuid;

  -- ── Droits : réservé au service ──
  return next ok(not has_function_privilege('authenticated', 'private.fichiers_gardes(uuid, text, text)', 'execute')
                 and not has_function_privilege('anon', 'private.fichiers_gardes(uuid, text, text)', 'execute')
                 and not has_function_privilege('authenticated', 'private.fichiers_a_effacer(uuid, text, text)', 'execute'),
                 'ni anon ni authenticated n''exécutent fichiers_gardes ni fichiers_a_effacer');

  -- ── Un objet : un fichier de pièce FILED (gardé), un fichier d'une autre pièce (effacé) ──
  f_garde := client_a || '/essai61/' || o1 || '/facture.pdf';
  f_libre := client_a || '/essai61/' || o1 || '/note.pdf';
  insert into storage.objects (bucket_id, name, metadata) values
    ('omega-clients', f_garde, '{"size": 300}'), ('omega-clients', f_libre, '{"size": 100}');
  perform tests.inserer_minimal('public', 'pieces', jsonb_build_object('client_id', client_a, 'module', 'filed', 'chemin', f_garde,
          'sha256', encode(sha256(gen_random_uuid()::text::bytea), 'hex'), 'objet_type', 'essai61', 'objet_id', o1));
  perform tests.inserer_minimal('public', 'pieces', jsonb_build_object('client_id', client_a, 'module', 'socle', 'chemin', f_libre,
          'sha256', encode(sha256(gen_random_uuid()::text::bytea), 'hex'), 'objet_type', 'essai61', 'objet_id', o1));

  r := private.preparer_effacement(client_a, 'essai61', o1);
  return next ok((r -> 'fichiers') @> jsonb_build_array(jsonb_build_object('nom', f_libre))
                 and not ((r -> 'fichiers') @> jsonb_build_array(jsonb_build_object('nom', f_garde))),
                 'la liste à effacer porte le fichier ordinaire, pas celui de la pièce FILED');
  return next ok((r -> 'gardes') @> jsonb_build_array(jsonb_build_object('nom', f_garde, 'motif', 'piece_filed')),
                 'le fichier de la pièce FILED est rendu « gardé », avec son motif');
  return next ok((r -> 'manifeste' ->> 'nombre')::int = 1 and (r -> 'manifeste' ->> 'octets')::bigint = 100
                 and (r -> 'manifeste' -> 'gardes' ->> 'nombre')::int = 1 and (r -> 'manifeste' -> 'gardes' ->> 'octets')::bigint = 300,
                 'le manifeste compte un fichier à effacer et un fichier gardé');
  select count(*) into n from private.manifestes_effacement
  where cle = client_a || '/essai61/' || o1 and (manifeste -> 'gardes' -> 'liste') @> jsonb_build_array(jsonb_build_object('nom', f_garde));
  return next is(n, 1::bigint, 'le manifeste enregistré liste le fichier gardé');

  -- ── L'export et l'aperçu voient toujours tout (fichiers_de inchangée) ──
  select count(*) into n from private.fichiers_de(client_a, 'essai61', o1);
  return next is(n, 2::bigint, 'fichiers_de voit toujours les deux fichiers');

  -- ── Un objet dont le seul fichier restant est gardé : rien ne reste à effacer ──
  f_seul := client_a || '/essai61/' || o2 || '/facture.pdf';
  insert into storage.objects (bucket_id, name, metadata) values ('omega-clients', f_seul, '{"size": 50}');
  perform tests.inserer_minimal('public', 'pieces', jsonb_build_object('client_id', client_a, 'module', 'filed', 'chemin', f_seul,
          'sha256', encode(sha256(gen_random_uuid()::text::bytea), 'hex'), 'objet_type', 'essai61', 'objet_id', o2));
  select count(*) into n from private.fichiers_a_effacer(client_a, 'essai61', o2);
  return next is(n, 0::bigint, 'seul un fichier gardé reste : rien à effacer, le contrôle 55000 ne bute plus');
  select count(*) into n from private.fichiers_a_effacer(client_a, 'essai61', o1);
  return next is(n, 1::bigint, 'le fichier ordinaire, lui, doit toujours être retiré avant');

  -- ── effacer_objet, par le gérant (sur la recette ; la maquette n'a pas tout le socle) ──
  if to_regprocedure('public.effacer_objet(uuid, text, text, text, text)') is not null
     and to_regclass('private.tables_objets_generiques') is not null and to_regclass('public.effacements_objets') is not null then
    perform private.preparer_effacement(client_a, 'essai61', o2);
    perform tests.endosser((jeu ->> 'gerant_a')::uuid);
    begin perform public.effacer_objet(client_a, 'essai61', o1, o1); code := 'accepté'; exception when others then code := sqlstate; end;
    return next is(code, '55000', 'effacer_objet refuse tant qu''un fichier ordinaire reste');
    begin r := public.effacer_objet(client_a, 'essai61', o2, o2); code := 'accepté'; exception when others then code := sqlstate; end;
    perform tests.redevenir_admin();
    return next is(code, 'accepté', 'effacer_objet ne refuse pas pour un fichier gardé');
    return next ok((r -> 'fichiers' -> 'gardes' -> 'liste') @> jsonb_build_array(jsonb_build_object('nom', f_seul)),
                   'la trace de l''effacement liste le fichier gardé');
    select count(*) into n from storage.objects where bucket_id = 'omega-clients' and name = f_seul;
    return next is(n, 1::bigint, 'le fichier gardé est toujours au stockage');
  end if;
end $f$;

select * from runtests('tests'::name, '^test_61_');
