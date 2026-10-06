-- Socle 19an — les analyses (lecteur.analyser) : dépôt, portes du lecteur, paliers, clair et chiffré, droits.
-- Après 00_installation.sql d'A5 (tests.redevenir_admin, tests.endosser_serveur, runtests), le banc
-- cccccccc-…000c. Une pièce « filed » lue, deux pages en clair. runtests() annule tout.

create or replace function tests.test_socle_19an_analyses() returns setof text
language plpgsql as $f$
declare
  banc uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_piece uuid;
  v_an uuid;
  v_ch uuid;
  r jsonb;
begin
  perform tests.redevenir_admin();
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut)
  values (gen_random_uuid(), banc, 'filed', 'depot', 'conclusions-19an.pdf', 'application/pdf', 1024, repeat('9', 64),
          banc::text || '/filed_document/test/conclusions-19an.pdf', 'filed_document', 'socle19an', 'lue')
  returning id into v_piece;
  insert into public.pieces_pages (client_id, piece_id, n, methode, texte)
  values (banc, v_piece, 1, 'natif', 'CONCLUSIONS' || chr(10) || 'Le 3 mars 2026, livraison.'),
         (banc, v_piece, 2, 'natif', 'Fin.');

  -- Dépôt : une analyse demandée et son travail, clé du palier 0.
  v_an := private.demander_analyse(banc, 'filed', 'filed_document', 'socle19an', 'filed.essai', array[v_piece]);
  return next is((select statut from public.analyses where id = v_an), 'demandee', 'analyse demandée');
  return next ok(exists (select 1 from public.travaux t where t.genre = 'lecteur.analyser' and t.cle = 'analyse:' || v_an::text || ':0'
                         and t.charge ->> 'analyse' = v_an::text and t.etat = 'a_faire'),
                 'travail lecteur.analyser déposé (clé analyse:<id>:0)');
  return next throws_ok(format('select private.demander_analyse(%L::uuid, ''filed'', null, null, ''tamila.chronologie'', array[%L::uuid])', banc, v_piece),
                        '22023', null, 'type d''un autre module : refusé');
  return next throws_ok(format('select private.demander_analyse(%L::uuid, ''filed'', null, null, ''filed.essai'', array[]::uuid[])', banc),
                        '22023', null, 'périmètre vide : refusé');
  return next throws_ok(format('select private.demander_analyse(%L::uuid, ''filed'', null, null, ''filed.essai'', array[gen_random_uuid()])', banc),
                        '22023', null, 'pièce hors de l''organisation : refusée');

  -- Les portes sont au serveur seul : un utilisateur connecté n'a pas le droit d'exécuter.
  perform set_config('role', 'authenticated', true);
  return next throws_ok(format('select public.commencer_analyse(%L::uuid)', v_an), '42501', null, 'commencer_analyse hors serveur : refusé');
  return next throws_ok(format('select public.terminer_analyse(%L::uuid, ''{"statut": "finie"}''::jsonb, null)', v_an), '42501', null,
                        'terminer_analyse hors serveur : refusé');
  perform tests.redevenir_admin();
  return next ok(not has_function_privilege('anon', 'public.commencer_analyse(uuid)', 'execute')
                 and not has_function_privilege('authenticated', 'public.terminer_analyse(uuid, jsonb, text)', 'execute')
                 and not has_function_privilege('authenticated', 'private.demander_analyse(uuid, text, text, text, text, uuid[], text, uuid)', 'execute'),
                 'anon et authenticated n''exécutent ni les portes ni demander_analyse');
  return next ok(has_function_privilege('service_role', 'public.commencer_analyse(uuid)', 'execute')
                 and has_function_privilege('service_role', 'public.terminer_analyse(uuid, jsonb, text)', 'execute'),
                 'service_role exécute les deux portes');
  return next ok(not has_table_privilege('authenticated', 'public.analyses', 'insert')
                 and not has_table_privilege('authenticated', 'public.analyses', 'update'),
                 'aucune écriture directe pour authenticated');

  -- Terminer avant d'avoir commencé : refusé.
  perform tests.endosser_serveur();
  return next throws_ok(format('select public.terminer_analyse(%L::uuid, ''{"statut": "finie"}''::jsonb, null)', v_an), '55000', null,
                        'terminer une analyse pas encore en cours : 55000');

  -- Commencer : en cours, le dossier rendu avec ses pages.
  r := public.commencer_analyse(v_an);
  perform tests.redevenir_admin();
  return next is(r ->> 'analyse', v_an::text, 'commencer_analyse rend l''analyse');
  return next is(r ->> 'type', 'filed.essai', 'et son type');
  return next is(jsonb_array_length(r -> 'pieces'), 1, 'une pièce lue dans le périmètre');
  return next is(r #>> '{pieces,0,pages,0,texte}', 'CONCLUSIONS' || chr(10) || 'Le 3 mars 2026, livraison.', 'page 1 en clair');
  return next is(jsonb_array_length(r #> '{pieces,0,pages}'), 2, 'deux pages');
  return next is(r #>> '{pieces,0,pages,1,n}', '2', 'dans l''ordre');
  return next is((select statut from public.analyses where id = v_an), 'en_cours', 'statut en_cours');

  -- Palier : l'état est rangé, le travail du palier suivant déposé ; le passage suivant reçoit l'état.
  perform tests.endosser_serveur();
  return next throws_ok(format('select public.terminer_analyse(%L::uuid, ''{"statut": "en_cours", "etat_chiffre": "AQID"}''::jsonb, null)', v_an),
                        '22023', null, 'analyse en clair : un état chiffré est refusé');
  return next throws_ok(format('select public.terminer_analyse(%L::uuid, ''{"statut": "inventee"}''::jsonb, null)', v_an),
                        '22023', null, 'statut inconnu : refusé');
  r := public.terminer_analyse(v_an, '{"statut": "en_cours", "type": "filed.essai", "etat": {"faites": [1]}, "cout_eur": 0.1, "appels_ia": 1, "modele": "m"}'::jsonb, 'analyse/essai');
  perform tests.redevenir_admin();
  return next is(r ->> 'paliers', '1', 'en_cours : palier 1');
  return next is((select etat from public.analyses where id = v_an), '{"faites": [1]}'::jsonb, 'état rangé en clair (module en clair)');
  return next ok(exists (select 1 from public.travaux t where t.genre = 'lecteur.analyser' and t.cle = 'analyse:' || v_an::text || ':1'),
                 'travail du palier suivant déposé (clé analyse:<id>:1)');
  perform tests.endosser_serveur();
  r := public.commencer_analyse(v_an);
  perform tests.redevenir_admin();
  return next is(r -> 'etat', '{"faites": [1]}'::jsonb, 'le passage suivant reçoit l''état');
  return next is(r ->> 'paliers', '1', 'et le numéro du palier');

  -- Finie : résultat, comptes, coût rangés ; état vidé ; plus rien à commencer ; terminer à nouveau refusé.
  perform tests.endosser_serveur();
  r := public.terminer_analyse(v_an, jsonb_build_object(
         'statut', 'finie', 'type', 'filed.essai', 'comptes', jsonb_build_object('info', 2, 'attention', 1, 'critique', 0),
         'sans_source', 1, 'pieces_lues', 1, 'pieces_non_lues', '[]'::jsonb, 'cout_eur', 0.42, 'appels_ia', 3, 'modele', 'm',
         'resultat', jsonb_build_object('resume', 'Livraison.', 'constats', '[]'::jsonb)), 'analyse/essai');
  return next is(public.commencer_analyse(v_an), null::jsonb, 'finie : commencer_analyse ne rend plus rien');
  return next throws_ok(format('select public.terminer_analyse(%L::uuid, ''{"statut": "finie"}''::jsonb, null)', v_an), '55000', null,
                        'terminer une analyse finie : 55000');
  return next throws_ok('select public.terminer_analyse(gen_random_uuid(), ''{"statut": "finie"}''::jsonb, null)', 'P0002', null,
                        'analyse introuvable : P0002');
  perform tests.redevenir_admin();
  return next is(r ->> 'statut', 'finie', 'terminer_analyse rend le statut');
  return next ok((select statut = 'finie' and finie_le is not null and etat is null and resultat ->> 'resume' = 'Livraison.'
                         and comptes = '{"info": 2, "attention": 1, "critique": 0}'::jsonb and cout_eur = 0.42 and appels_ia = 3
                         and sans_source = 1 and pieces_lues = 1 and version = 'analyse/essai'
                    from public.analyses where id = v_an),
                 'résultat, comptes, coût et version rangés ; état vidé');

  -- Chiffré (Tamila, contrainte de B4) : rien en clair, ni par la porte ni en direct.
  v_ch := private.demander_analyse(banc, 'tamila', 'tamila_dossier', 'socle19an', 'tamila.chronologie', array[v_piece], 'dossier:v1');
  return next throws_ok(format('select private.demander_analyse(%L::uuid, ''tamila'', null, null, ''tamila.chronologie'', array[%L::uuid])', banc, v_piece),
                        '23514', null, 'une analyse Tamila sans chiffrement : refusée par la contrainte');
  perform tests.endosser_serveur();
  r := public.commencer_analyse(v_ch);
  return next is(r ->> 'chiffrement', 'dossier:v1', 'commencer_analyse annonce le chiffrement');
  return next throws_ok(format('select public.terminer_analyse(%L::uuid, ''{"statut": "en_cours", "etat": {"x": 1}}''::jsonb, null)', v_ch),
                        '22023', null, 'chiffrée : un état en clair est refusé');
  return next throws_ok(format('select public.terminer_analyse(%L::uuid, ''{"statut": "finie", "resultat": {"resume": "x"}}''::jsonb, null)', v_ch),
                        '22023', null, 'chiffrée : un résultat en clair est refusé');
  return next throws_ok(format('select public.terminer_analyse(%L::uuid, ''{"statut": "finie", "resultat_chiffre": "pas du base64 !"}''::jsonb, null)', v_ch),
                        '22023', null, 'chiffré illisible : refusé');
  r := public.terminer_analyse(v_ch, jsonb_build_object('statut', 'en_cours', 'etat_chiffre', encode('\x01aabbcc'::bytea, 'base64')), 'analyse/essai');
  r := public.commencer_analyse(v_ch);
  return next is(r ->> 'etat_chiffre', encode('\x01aabbcc'::bytea, 'base64'), 'l''état chiffré revient en base64');
  return next is(r -> 'etat', 'null'::jsonb, 'et rien en clair');
  -- Un long chiffré (plus de 76 caractères en base64) revient d'un seul tenant, sans fin de ligne.
  perform tests.redevenir_admin();
  update public.analyses set etat_chiffre = decode(repeat('ab', 120), 'hex') where id = v_ch;
  perform tests.endosser_serveur();
  r := public.commencer_analyse(v_ch);
  return next ok(position(chr(10) in (r ->> 'etat_chiffre')) = 0 and decode(r ->> 'etat_chiffre', 'base64') = decode(repeat('ab', 120), 'hex'),
                 'base64 sans fin de ligne, et fidèle');
  r := public.terminer_analyse(v_ch, jsonb_build_object(
         'statut', 'partielle', 'comptes', jsonb_build_object('info', 1, 'attention', 0, 'critique', 0),
         'pieces_non_lues', jsonb_build_array(v_piece), 'cout_eur', 15, 'appels_ia', 9,
         'resultat_chiffre', encode('\x01ddeeff'::bytea, 'base64')), 'analyse/essai');
  perform tests.redevenir_admin();
  return next ok((select statut = 'partielle' and resultat is null and etat is null and etat_chiffre is null
                         and resultat_chiffre = '\x01ddeeff'::bytea and pieces_non_lues = array[v_piece]
                    from public.analyses where id = v_ch),
                 'partielle chiffrée : résultat chiffré seul, pièces non lues rangées');
  return next throws_ok(format('update public.analyses set resultat = ''{}''::jsonb where id = %L::uuid', v_ch), '23514', null,
                        'même en direct, une analyse Tamila ne reçoit pas de résultat en clair');
end $f$;

select * from runtests('tests'::name, '^test_socle_19an_');
