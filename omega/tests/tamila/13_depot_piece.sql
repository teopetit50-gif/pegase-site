-- 13 — Le dépôt d'une pièce chiffrée dans un dossier (migration b4_01). Après 00_jeu_tamila.sql et b4_01. runtests() annule tout.

create or replace function tests.test_b4_13_depot_piece() returns setof text
language plpgsql as $f$
declare jeu jsonb; v_dossier uuid; r jsonb; v_chemin text; p public.pieces; v_sha text := md5('b4-piece-1') || md5('b4-piece-1-bis');
begin
  jeu := tests.tamila_scene();
  v_dossier := (jeu ->> 'dossier')::uuid;
  v_chemin := (jeu ->> 'client') || '/tamila_dossier/' || v_dossier::text || '/conclusions-adverses.pdf.chiffre';

  -- Qui dépose : un membre qui écrit ; pas le stagiaire, pas le voisin.
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next throws_ok(format('select public.tamila_deposer_piece(%L::uuid, ''x.pdf'', ''application/pdf'', 10, %L, %L)', v_dossier, v_sha, v_chemin), '42501', null, 'le stagiaire ne dépose pas (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'autre_gerant')::uuid, 'b4-voisin@essai.invalid');
  return next throws_ok(format('select public.tamila_deposer_piece(%L::uuid, ''x.pdf'', ''application/pdf'', 10, %L, %L)', v_dossier, v_sha, v_chemin), '42501', null, 'le cabinet voisin non plus (42501)');
  perform tests.redevenir_admin();

  -- Les contrôles : chemin sous le dossier, empreinte hexadécimale, type.
  perform tests.endosser((jeu ->> 'assistante')::uuid, 'b4-assistante@essai.invalid');
  return next throws_ok(format('select public.tamila_deposer_piece(%L::uuid, ''x.pdf'', ''application/pdf'', 10, %L, %L)', v_dossier, v_sha, (jeu ->> 'client') || '/filed_document/ailleurs.pdf'), '22023', null, 'un chemin hors du dossier est refusé (22023)');
  return next throws_ok(format('select public.tamila_deposer_piece(%L::uuid, ''x.pdf'', ''application/pdf'', 10, ''pas-une-empreinte'', %L)', v_dossier, v_chemin), '22023', null, 'une empreinte qui n''est pas du SHA-256 est refusée (22023)');
  return next throws_ok(format('select public.tamila_deposer_piece(%L::uuid, ''x.pdf'', ''application/pdf'', 10, %L, %L, ''Type Avec Majuscules'')', v_dossier, v_sha, v_chemin), '22023', null, 'un type de pièce mal formé est refusé (22023)');
  -- Le dépôt par l'assistante (intervenante).
  r := public.tamila_deposer_piece(v_dossier, 'conclusions-adverses.pdf', 'application/pdf', 184_320, v_sha, v_chemin, 'conclusions');
  return next ok((r ->> 'piece_id') is not null and not (r ->> 'deja')::boolean, 'l''assistante dépose la pièce chiffrée');
  return next is(r ->> 'statut', 'recue', 'dossier ouvert : la pièce est reçue');
  perform tests.redevenir_admin();
  select * into p from public.pieces where id = (r ->> 'piece_id')::uuid;
  return next is(p.chiffrement, 'dossier:v1', 'chiffrement dossier:v1, obligatoire');
  return next is(p.objet_type, 'tamila_dossier', 'rattachée au dossier');
  return next is(p.objet_id, v_dossier::text, 'au bon dossier');
  return next is(p.module, 'tamila', 'module tamila');
  return next is(p.depose_par, (jeu ->> 'assistante')::uuid, 'déposée par l''assistante');
  return next is(p.type_piece, 'conclusions', 'type de pièce posé');
  return next ok(exists (select 1 from public.travaux w where w.genre = 'lecteur.lire' and w.charge ->> 'piece' = p.id::text), 'le socle a déposé le travail lecteur.lire (que le lecteur refusera : pièce chiffrée)');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = (jeu ->> 'client')::uuid and j.action = 'tamila.piece.deposee' and j.objet_id = v_dossier::text), 'le dépôt est au journal, par identifiant');
  return next is(tests.tamila_clair_dans('journal_opposable', 'conclusions-adverses'), 0::bigint, 'le nom du fichier n''est pas au journal');

  -- Idempotence : la même empreinte, la même pièce.
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  r := public.tamila_deposer_piece(v_dossier, 'conclusions-adverses.pdf', 'application/pdf', 184_320, v_sha, v_chemin, 'conclusions');
  return next ok((r ->> 'deja')::boolean and (r ->> 'piece_id')::uuid = p.id, 'redéposée avec la même empreinte : la même pièce est rendue');
  perform tests.redevenir_admin();
  return next is((select count(*) from public.pieces where objet_id = v_dossier::text), 1::bigint, 'une seule pièce');

  -- Un dossier en attente d'ouverture tient ses pièces à rattacher.
  perform tests.endosser((jeu ->> 'assistante')::uuid, 'b4-assistante@essai.invalid');
  v_dossier := gen_random_uuid();
  perform public.tamila_creer_dossier((jeu ->> 'client')::uuid, v_dossier, tests.tamila_chiffre('a'), tests.tamila_chiffre('b'), 'local', 'ref13', decode(repeat('ab', 40), 'hex'), null, 'baux', null, 'metropole', 'contentieux', false, null, (jeu ->> 'avocat')::uuid);
  r := public.tamila_deposer_piece(v_dossier, 'bail.pdf', 'application/pdf', 1024, md5('bail') || md5('bail-bis'), (jeu ->> 'client') || '/tamila_dossier/' || v_dossier::text || '/bail.pdf.chiffre');
  return next is(r ->> 'statut', 'a_rattacher', 'dossier en attente : la pièce attend l''ouverture (a_rattacher)');
  perform tests.redevenir_admin();
  -- Un dossier clos ne reçoit plus rien.
  update public.tamila_dossiers set statut = 'clos', statut_avant_cloture = 'ouvert', clos_le = now() where id = (jeu ->> 'dossier')::uuid;
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_deposer_piece(%L::uuid, ''y.pdf'', ''application/pdf'', 10, %L, %L)', jeu ->> 'dossier', md5('y') || md5('y2'), (jeu ->> 'client') || '/tamila_dossier/' || (jeu ->> 'dossier') || '/y.pdf'), '55000', null, 'un dossier clos ne reçoit plus de pièce (55000)');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b4_13_');
