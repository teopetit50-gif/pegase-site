-- 16 — Conflits d'intérêts (index aveugle) et vigilance LCB-FT (migration b4_07). Après 00_jeu_tamila.sql, b4_01 à b4_07.
-- Les empreintes sont des SHA-256 d'essai (32 octets) ; le vrai calcul (HMAC sous la clé d'index du cabinet) est fait
-- dans le navigateur (components/espace/tamila/index.ts). runtests() annule tout.

create or replace function tests.tamila_empreinte(p_nom text) returns bytea
language sql immutable as $$ select sha256(convert_to('b4-index:' || p_nom, 'UTF8')) $$;
grant execute on function tests.tamila_empreinte(text) to authenticated, service_role;

create or replace function tests.test_b4_16_conflits() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; jeu2 jsonb; v_client uuid; v_d1 uuid; v_d2 uuid; r jsonb; v_controle uuid; v_piece uuid; n bigint;
  v_env bytea := decode('01' || repeat('ab', 76), 'hex');
  v_moulin bytea := tests.tamila_empreinte('du moulin sci');
  v_batisud bytea := tests.tamila_empreinte('bati sud');
  v_maitre text := '0b5c1e2a-4d6f-4a8b-9c0d-1e2f3a4b5c6d';
  v_auj date := (now() at time zone 'Europe/Paris')::date;
begin
  jeu := tests.tamila_scene();
  v_client := (jeu ->> 'client')::uuid;
  v_d1 := (jeu ->> 'dossier')::uuid;

  -- ── 1. La clé d'index du cabinet ──
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next is(public.tamila_index_cle(v_client), null::jsonb, 'pas encore de clé d''index');
  return next throws_ok(format('select public.tamila_poser_index_cle(%L::uuid, null, %L::bytea)', v_client, v_env), '42501', null,
                        'un avocat collaborateur ne pose pas la clé d''index : le gérant (42501)');
  return next throws_ok(format('select public.tamila_indexer_partie(%L::uuid, array[%L::bytea])', jeu ->> 'partie_client', v_moulin), '55000', null,
                        'sans clé d''index, pas d''empreinte (55000)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_poser_index_cle(%L::uuid, null, ''\x0102''::bytea)', v_client), '22023', null,
                        'une enveloppe locale fait 77 octets (22023)');
  perform public.tamila_poser_index_cle(v_client, null, v_env);
  return next is(public.tamila_index_cle(v_client) ->> 'enveloppe', encode(v_env, 'hex'), 'la clé d''index est posée, enveloppée sous la phrase');
  return next throws_ok(format('select public.tamila_poser_index_cle(%L::uuid, null, %L::bytea)', v_client, v_env), '55000', null,
                        'elle ne se remplace pas : les empreintes en dépendent (55000)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next throws_ok(format('select public.tamila_index_cle(%L::uuid)', v_client), '42501', null, 'le stagiaire ne reçoit pas la clé d''index (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'autre_gerant')::uuid, 'b4-voisin@essai.invalid');
  return next throws_ok(format('select public.tamila_index_cle(%L::uuid)', v_client), '42501', null, 'ni le cabinet voisin (42501)');
  perform tests.redevenir_admin();

  -- ── 2. Les empreintes des parties ──
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next throws_ok(format('select public.tamila_indexer_partie(%L::uuid, array[%L::bytea])', jeu ->> 'partie_client', v_moulin), '42501', null,
                        'le stagiaire n''indexe pas (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'assistante')::uuid, 'b4-assistante@essai.invalid');
  return next is(public.tamila_indexer_partie((jeu ->> 'partie_client')::uuid, array[v_moulin]), 1, 'l''assistante indexe le client du dossier');
  return next is(public.tamila_indexer_partie((jeu ->> 'partie_client')::uuid, array[v_moulin]), 0, 'la même empreinte, une seule fois');
  return next is(public.tamila_indexer_partie((jeu ->> 'partie_adverse')::uuid, array[v_batisud, tests.tamila_empreinte('siren:552100554')]), 2,
                 'l''adversaire : son nom et son SIREN');
  return next throws_ok(format('select public.tamila_indexer_partie(%L::uuid, array[''\x01''::bytea])', jeu ->> 'partie_client'), '22023', null,
                        'une empreinte fait 32 octets (22023)');
  return next throws_ok('select count(*) from public.tamila_empreintes', '42501', null, 'les empreintes ne se lisent jamais en direct (42501)');
  perform tests.redevenir_admin();

  -- ── 3. Le contrôle, depuis un nouveau dossier ──
  v_d2 := tests.tamila_dossier(jeu);
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  r := public.tamila_controler_conflits(v_client, v_d2, 'adverse', array[v_moulin]);
  return next ok((r ->> 'conflits')::int = 1 and (r -> 'trouves' -> 0 ->> 'dossier')::uuid = v_d1 and r -> 'trouves' -> 0 ->> 'nature' = 'conflit',
                 'l''adversaire du nouveau dossier est client dans un autre : CONFLIT, dossier nommé à qui le voit');
  v_controle := (r ->> 'controle')::uuid;
  r := public.tamila_controler_conflits(v_client, v_d2, 'client', array[v_batisud]);
  return next is((r ->> 'conflits')::int, 1, 'le client du nouveau dossier est l''adversaire d''un autre : conflit');
  r := public.tamila_controler_conflits(v_client, v_d2, 'client', array[tests.tamila_empreinte('siren:552100554')]);
  return next is((r ->> 'conflits')::int, 1, 'par le SIREN aussi');
  r := public.tamila_controler_conflits(v_client, v_d2, 'client', array[v_moulin]);
  return next ok((r ->> 'correspondances')::int = 1 and (r ->> 'conflits')::int = 0 and r -> 'trouves' -> 0 ->> 'nature' = 'meme_cote',
                 'déjà client ailleurs, du même côté : signalé, pas un conflit');
  r := public.tamila_controler_conflits(v_client, v_d2, 'adverse', array[tests.tamila_empreinte('inconnu sarl')]);
  return next is((r ->> 'correspondances')::int, 0, 'un nom jamais vu : aucune correspondance');
  r := public.tamila_controler_conflits(v_client, v_d1, 'client', array[v_moulin]);
  return next is((r ->> 'correspondances')::int, 0, 'les parties du dossier contrôlé ne comptent pas contre lui');
  r := public.tamila_controler_conflits(v_client, null, 'adverse', array[v_moulin]);
  return next is((r ->> 'conflits')::int, 1, 'le contrôle se fait aussi avant d''ouvrir le dossier');
  perform tests.redevenir_admin();
  return next is((select count(*) from public.tamila_controles_conflits where client_id = v_client), 7::bigint, 'chaque contrôle est enregistré');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'tamila.conflits.controle'),
                 'et journalisé');

  -- Qui ne voit pas le dossier : compté, jamais nommé.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  perform public.tamila_retirer_membre(v_d1, (jeu ->> 'assistante')::uuid);
  perform public.tamila_ajouter_membre(v_d2, (jeu ->> 'assistante')::uuid, 'intervenant', null);
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'assistante')::uuid, 'b4-assistante@essai.invalid');
  r := public.tamila_controler_conflits(v_client, v_d2, 'adverse', array[v_moulin]);
  return next ok((r ->> 'conflits')::int = 1 and (r ->> 'hors_vue')::int = 1 and r -> 'trouves' -> 0 -> 'dossier' = 'null'::jsonb,
                 'hors de sa vue : le conflit est compté, le dossier n''est pas nommé');
  perform tests.redevenir_admin();
  -- Une partie retirée ne compte plus.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  perform public.tamila_retirer_partie((jeu ->> 'partie_adverse')::uuid);
  r := public.tamila_controler_conflits(v_client, v_d2, 'client', array[v_batisud]);
  return next is((r ->> 'correspondances')::int, 0, 'une partie retirée de son dossier ne compte plus');
  perform tests.redevenir_admin();

  -- ── 4. La décision ──
  perform tests.endosser((jeu ->> 'assistante')::uuid, 'b4-assistante@essai.invalid');
  return next throws_ok(format('select public.tamila_decider_conflit(%L::uuid, ''conflit_leve'', ''accord_ecrit_des_clients'')', v_controle), '42501', null,
                        'l''assistante ne décide pas d''un conflit (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_decider_conflit(%L::uuid, ''pas_de_conflit'', ''homonyme'')', v_controle), '22023', null,
                        'un conflit trouvé ne se déclare pas « sans conflit » : il se lève ou le dossier se refuse (22023)');
  return next throws_ok(format('select public.tamila_decider_conflit(%L::uuid, ''conflit_leve'', ''Les deux clients sont d''''accord'')', v_controle), '22023', null,
                        'le motif est un code (22023)');
  perform public.tamila_decider_conflit(v_controle, 'conflit_leve', 'accord_ecrit_des_clients');
  return next throws_ok(format('select public.tamila_decider_conflit(%L::uuid, ''refus'', ''refus_du_dossier'')', v_controle), '55000', null,
                        'une décision ne se reprend pas (55000)');
  perform tests.redevenir_admin();
  return next is((select decision || '/' || motif from public.tamila_controles_conflits where id = v_controle), 'conflit_leve/accord_ecrit_des_clients',
                 'la décision et son motif sont gardés');

  -- ── 5. La vigilance LCB-FT ──
  v_piece := tests.tamila_piece(jeu, 'kbis-et-identite.pdf');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next ok((public.tamila_conformite(v_d1) ->> 'vigilance_a_faire')::boolean, 'tant que la vigilance n''est pas posée, elle est à faire');
  return next throws_ok(format('select public.tamila_poser_vigilance(%L::uuid, true)', v_d1), '22023', null,
                        'un dossier assujetti nomme son activité (22023)');
  return next throws_ok(format('select public.tamila_poser_vigilance(%L::uuid, true, ''transaction_immobiliere'', %L::date, %L::uuid)', v_d1, v_auj, gen_random_uuid()),
                        '22023', null, 'la pièce d''identité est une pièce du dossier (22023)');
  return next throws_ok(format('select public.tamila_poser_vigilance(%L::uuid, true, ''transaction_immobiliere'', null, null, null, ''tres_eleve'')', v_d1),
                        '22023', null, 'trois niveaux de risque seulement (22023)');
  perform public.tamila_poser_vigilance(v_d1, true, 'transaction_immobiliere', v_auj, v_piece);
  return next ok((public.tamila_conformite(v_d1) ->> 'vigilance_a_faire')::boolean, 'assujetti, client identifié, bénéficiaire effectif et risque manquants : à faire');
  perform public.tamila_poser_vigilance(v_d1, true, 'transaction_immobiliere', v_auj, v_piece, v_auj, 'standard');
  return next ok(not (public.tamila_conformite(v_d1) ->> 'vigilance_a_faire')::boolean, 'tout est posé : rien à faire');
  perform public.tamila_poser_vigilance(v_d2, false);
  return next ok(not (public.tamila_conformite(v_d2) ->> 'vigilance_a_faire')::boolean, 'un dossier non assujetti : rien à faire');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select public.tamila_poser_vigilance(%L::uuid, false)', v_d1), '42501', null,
                        'un avocat intervenant qui ne gère pas le dossier ne pose pas la vigilance (42501)');
  r := public.tamila_conformite(v_d1);
  return next ok((r ->> 'index')::boolean and (r ->> 'parties')::int = 1 and (r ->> 'parties_indexees')::int = 1,
                 'la conformité du dossier : index en place, une partie (client ou adverse), indexée');
  perform tests.redevenir_admin();

  -- ── 6. La clé d'index d'un cabinet au coffre ──
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_coffre_demander_index(%L::uuid)', v_client), '55000', null,
                        'un cabinet local tire sa clé d''index dans le navigateur (55000)');
  perform tests.redevenir_admin();
  -- Le cabinet voisin du jeu (déjà créé avec son gérant : pas de second tamila_jeu, auth.users a ses courriels uniques).
  jeu2 := jsonb_build_object('client', jeu ->> 'autre_client', 'gerant', jeu ->> 'autre_gerant');
  perform tests.endosser((jeu2 ->> 'gerant')::uuid, 'b4-voisin@essai.invalid');
  perform public.tamila_installer((jeu2 ->> 'client')::uuid);
  perform tests.redevenir_admin();
  perform tests.endosser_serveur();
  perform public.tamila_coffre_activer((jeu2 ->> 'client')::uuid, 'fr-par', v_maitre, (jeu2 ->> 'gerant')::uuid);
  perform tests.redevenir_admin();
  perform tests.endosser((jeu2 ->> 'gerant')::uuid, 'b4-voisin@essai.invalid');
  return next throws_ok(format('select public.tamila_poser_index_cle(%L::uuid, null, %L::bytea)', jeu2 ->> 'client', v_env), '55000', null,
                        'au coffre, pas de clé d''index sous la phrase (55000)');
  r := public.tamila_coffre_demander_index((jeu2 ->> 'client')::uuid);
  return next throws_ok(format('select public.tamila_coffre_poser_index(%s, %L::bytea)', r ->> 'journal', v_env), '42501', null,
                        'une personne connectée ne pose pas la clé d''index du coffre (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser_serveur();
  perform public.tamila_coffre_poser_index((r ->> 'journal')::bigint, decode(repeat('7c', 90), 'hex'));
  return next throws_ok(format('select public.tamila_coffre_poser_index(%s, %L::bytea)', r ->> 'journal', v_env), '55000', null,
                        'une demande ne sert qu''une fois (55000)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu2 ->> 'gerant')::uuid, 'b4-voisin@essai.invalid');
  r := public.tamila_coffre_index_pour_membre((jeu2 ->> 'client')::uuid);
  return next ok(r ->> 'fournisseur' = 'scaleway' and r ->> 'enveloppe' = repeat('7c', 90) and (r ->> 'journal') is not null,
                 'une personne du cabinet reçoit l''enveloppe Scaleway de la clé d''index, remise journalisée');
  return next is(public.tamila_index_cle((jeu2 ->> 'client')::uuid) ->> 'enveloppe', null, 'la porte locale ne rend pas l''enveloppe d''une clé au coffre');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select public.tamila_coffre_index_pour_membre(%L::uuid)', jeu2 ->> 'client'), '42501', null,
                        'pas à une personne d''un autre cabinet (42501)');
  perform tests.redevenir_admin();
  select count(*) into n from public.tamila_coffre_journal where client_id = (jeu2 ->> 'client')::uuid and detail ? 'index';
  return next is(n, 2::bigint, 'la création et la remise de la clé d''index sont au journal du coffre');
end $f$;

select * from runtests('tests'::name, '^test_b4_16_');
