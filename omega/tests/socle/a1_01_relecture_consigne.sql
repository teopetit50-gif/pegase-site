-- Tests A1 — a1_01 : la porte private.lecteur_relire (relecture avec consigne). pgTAP, schéma « tests » ; données
-- d'exemple, aucune suppression. À jouer : select * from runtests('tests', '^test_a1_01_');

-- Le code d'erreur d'une instruction ('' si elle passe).
create or replace function tests.a1_code(p_sql text) returns text language plpgsql as $$
begin
  execute p_sql;
  return '';
exception when others then
  return sqlstate;
end $$;

-- Un client d'exemple et une pièce FILED déjà lue. Rend {client, piece}.
create or replace function tests.a1_piece_lue() returns jsonb language plpgsql as $$
declare v_cl uuid := gen_random_uuid(); v_p uuid := gen_random_uuid();
begin
  insert into public.clients (id, nom) values (v_cl, 'Organisation d''exemple A1 relecture');
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut)
  values (v_p, v_cl, 'filed', 'depot', 'f.pdf', 'application/pdf', 2048, md5(v_p::text) || md5(v_cl::text),
          v_cl::text || '/filed_document/test/f.pdf', 'filed_document', 'test-a1', 'lue');
  return jsonb_build_object('client', v_cl, 'piece', v_p);
end $$;

create or replace function tests.test_a1_01_01_relire() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a1_piece_lue(); p uuid := (o ->> 'piece')::uuid; t public.travaux; v_id bigint;
begin
  v_id := private.lecteur_relire(p, E'Le TTC est 1 260 €\n\tpas 1 200 €.', 'reprise:essai');
  select * into t from public.travaux where id = v_id;
  return next is(t.cle, 'relire:' || p::text || ':1', 'Le travail porte la clé relire:<piece>:1');
  return next is(t.genre || '/' || t.module, 'lecteur.lire/filed', 'C''est une lecture, du module de la pièce');
  return next is(t.charge, jsonb_build_object('piece', p, 'consigne', 'Le TTC est 1 260 € pas 1 200 €.', 'essai', 1),
                 'La charge : la pièce, la consigne nettoyée, l''essai 1');
  return next is((select statut from public.pieces where id = p), 'recue', 'La pièce repasse « recue »');
  return next ok(not exists (select 1 from public.travaux where genre = 'lecteur.lire' and cle = 'piece:' || p::text and etat in ('a_faire', 'en_cours')),
                 'La lecture ordinaire déposée par le déclencheur est close : rien ne relit sans la consigne');
  return next is((select origine || ':' || essai from private.relectures where piece_id = p), 'reprise:essai:1', 'La relecture est notée, avec son origine');
  return next is(tests.a1_code(format('select private.lecteur_relire(%L, %L)', p, 'encore')), '55000', 'Pièce à relire : pas de seconde relecture en même temps');

  -- Le lecteur la relit (essai 1) : la version « +c1 » change la clé de piece_lue, les abonnés la reçoivent de nouveau.
  perform private.commencer_lecture(p);
  perform private.enregistrer_lecture(p, '{"statut": "lue", "type_piece": "facture", "pages": [{"n": 1, "methode": "natif", "texte": "x"}], "valeurs": []}'::jsonb,
                                      'lecteur/10-25.essai/sonnet-5-5+c1');
  return next ok(exists (select 1 from public.travaux where genre = 'filed.integrer' and cle = 'piece_lue.filed:' || p::text || ':lecteur/10-25.essai/sonnet-5-5+c1'),
                 'piece_lue est republié sous la version +c1');

  v_id := private.lecteur_relire(p, repeat('a', 800));
  return next is((select cle from public.travaux where id = v_id), 'relire:' || p::text || ':2', 'Seconde relecture : essai 2');
  return next is((select char_length(consigne) from private.relectures where piece_id = p and essai = 2), 500, 'Consigne ramenée à 500 caractères');
end $f$;

create or replace function tests.test_a1_01_02_garde_fous() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a1_piece_lue(); p uuid := (o ->> 'piece')::uuid; k int;
begin
  return next is(tests.a1_code(format('select private.lecteur_relire(%L, %L)', p, E' \n ')), '22023', 'Consigne vide : refusée');
  return next is(tests.a1_code(format('select private.lecteur_relire(%L, %L)', gen_random_uuid(), 'x')), 'P0002', 'Pièce inconnue : refusée');
  for k in 1..3 loop
    perform private.lecteur_relire(p, 'essai ' || k);
    update public.pieces set statut = 'a_verifier' where id = p;   -- comme une lecture rendue
  end loop;
  return next is(tests.a1_code(format('select private.lecteur_relire(%L, %L)', p, 'quatrième')), '54000', 'Trois relectures au plus par pièce');
  return next ok(not has_function_privilege('authenticated', 'private.lecteur_relire(uuid, text, text)', 'execute')
                 and not has_function_privilege('anon', 'private.lecteur_relire(uuid, text, text)', 'execute'),
                 'La porte n''est ouverte qu''au service');
end $f$;
