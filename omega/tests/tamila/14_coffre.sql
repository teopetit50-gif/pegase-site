-- 14 — Le coffre à clés Scaleway (migration b4_05). Après 00_jeu_tamila.sql, b4_01 à b4_05. runtests() annule tout.
-- Aucun appel à Scaleway : la base ne déballe jamais rien. Les enveloppes « Scaleway » sont des octets d'essai ;
-- le vrai déballage (et son faux Key Manager) est testé dans omega/functions/tamila-coffre/tests.

-- Le geste du serveur (l'ouvrier tamila-coffre) : rôle de service, personne de connectée.
create or replace function tests.tamila_cle_maitre() returns text
language sql immutable as $$ select '0b5c1e2a-4d6f-4a8b-9c0d-1e2f3a4b5c6d' $$;

create or replace function tests.test_b4_14_coffre() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_dossier uuid; v_dossier2 uuid; v_inconnu uuid := gen_random_uuid();
  r jsonb; r2 jsonb; v_ref text; v_env bytea := decode(repeat('5c', 120), 'hex');
  v_piece uuid; v_piece2 uuid; v_piece_lue uuid; v_journal bigint; v_k public.tamila_cles; jeu2 jsonb; n bigint;
begin
  jeu := tests.tamila_scene();
  v_client := (jeu ->> 'client')::uuid;
  v_dossier := (jeu ->> 'dossier')::uuid;
  v_ref := 'scaleway:fr-par:' || tests.tamila_cle_maitre();
  -- Une pièce chiffrée reçue que le lecteur a laissée faute de coffre (travail clos « chiffree_sans_coffre »).
  v_piece := tests.tamila_piece(jeu, 'avis-audience.pdf');
  update public.travaux set etat = 'fait', resultat = '{"ignore": "chiffree_sans_coffre"}' where cle = 'piece:' || v_piece::text;

  -- ── 1. Un cabinet sans coffre : tout reste local ──
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  r := public.tamila_coffre_etat(v_client);
  return next is(r ->> 'statut', 'local', 'sans coffre, le cabinet est local');
  return next is((r ->> 'dossiers_locaux')::int, 1, 'un dossier sous la phrase du cabinet');
  return next throws_ok(format('select public.tamila_coffre_pour_nouvelle_cle(%L::uuid)', v_client), '55000', null,
                        'pas de clé émise par le coffre d''un cabinet local (55000)');
  r := public.tamila_coffre_pour_membre(v_dossier);
  return next is(r ->> 'fournisseur', 'local', 'un membre d''un dossier local est renvoyé à la phrase');
  return next ok(not (r ? 'enveloppe'), 'et ne reçoit aucune enveloppe par le coffre');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'autre_gerant')::uuid, 'b4-voisin@essai.invalid');
  return next throws_ok(format('select public.tamila_coffre_etat(%L::uuid)', v_client), '42501', null,
                        'le cabinet voisin ne lit pas l''état du coffre (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser_serveur();
  r := public.tamila_coffre_pour_lecteur(v_piece);
  return next is(r ->> 'fournisseur', 'local', 'le lecteur, sur un dossier local : rien à déballer');
  perform tests.redevenir_admin();
  return next is((select count(*) from public.tamila_coffre_journal where client_id = v_client), 0::bigint,
                 'rien n''est remis, rien n''est journalisé');
  -- Une clé « scaleway » dans un cabinet local est refusée.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_creer_dossier(%L::uuid, %L::uuid, tests.tamila_chiffre(''a''), tests.tamila_chiffre(''b''), ''scaleway'', %L, %L::bytea)',
                               v_client, gen_random_uuid(), v_ref, v_env), '22023', null, 'un cabinet local n''accepte pas de clé scaleway (22023)');

  -- ── 2. L'activation : le gérant demande, le serveur pose la clé maître ──
  r := public.tamila_coffre_demander_activation(v_client);
  return next is(r ->> 'par', jeu ->> 'gerant', 'la demande rend la preuve : le gérant');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'admin')::uuid, 'b4-haddad@essai.invalid');
  return next throws_ok(format('select public.tamila_coffre_demander_activation(%L::uuid)', v_client), '42501', null,
                        'un associé non gérant ne demande pas l''activation (42501)');
  return next throws_ok(format('select public.tamila_coffre_activer(%L::uuid, ''fr-par'', %L, %L::uuid)', v_client, tests.tamila_cle_maitre(), jeu ->> 'gerant'),
                        '42501', null, 'une personne connectée ne pose pas la clé maître (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser_serveur();
  return next throws_ok(format('select public.tamila_coffre_activer(%L::uuid, ''fr-par'', %L, %L::uuid)', v_client, tests.tamila_cle_maitre(), jeu ->> 'avocat'),
                        '42501', null, 'le serveur refuse une activation au nom d''un non-gérant (42501)');
  return next throws_ok(format('select public.tamila_coffre_activer(%L::uuid, ''Paris'', %L, %L::uuid)', v_client, tests.tamila_cle_maitre(), jeu ->> 'gerant'),
                        '22023', null, 'une région mal formée est refusée (22023)');
  r := public.tamila_coffre_activer(v_client, 'fr-par', tests.tamila_cle_maitre(), (jeu ->> 'gerant')::uuid);
  return next is(r ->> 'statut', 'bascule', 'un dossier local reste : le coffre est en bascule');
  r := public.tamila_coffre_activer(v_client, 'fr-par', tests.tamila_cle_maitre(), (jeu ->> 'gerant')::uuid);
  return next ok((r ->> 'deja')::boolean, 'la même activation, rejouée : rien ne change');
  return next throws_ok(format('select public.tamila_coffre_activer(%L::uuid, ''fr-par'', %L, %L::uuid)', v_client, '1b5c1e2a-4d6f-4a8b-9c0d-1e2f3a4b5c6d', jeu ->> 'gerant'),
                        '55000', null, 'une autre clé maître ne remplace pas la première (55000)');
  perform tests.redevenir_admin();
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'tamila.coffre.active'),
                 'l''activation est au journal opposable');

  -- ── 3. Un nouveau dossier : la clé vient du coffre, pour ce dossier et cette personne ──
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next throws_ok(format('select public.tamila_coffre_pour_nouvelle_cle(%L::uuid)', v_client), '42501', null,
                        'le stagiaire n''ouvre pas de dossier (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  r := public.tamila_coffre_pour_nouvelle_cle(v_client);
  v_dossier2 := (r ->> 'dossier')::uuid;
  return next ok(v_dossier2 is not null and (r ->> 'journal') is not null, 'le coffre tire l''identifiant du dossier et ouvre sa ligne au journal');
  return next is(r ->> 'reference', v_ref, 'la référence de la clé maître du cabinet');
  return next throws_ok(format('select public.tamila_creer_dossier(%L::uuid, %L::uuid, tests.tamila_chiffre(''a''), tests.tamila_chiffre(''b''), ''local'', ''ref14'', %L::bytea)',
                               v_client, gen_random_uuid(), v_env), '22023', null, 'un cabinet passé au coffre n''ouvre plus de dossier local (22023)');
  return next throws_ok(format('select public.tamila_creer_dossier(%L::uuid, %L::uuid, tests.tamila_chiffre(''a''), tests.tamila_chiffre(''b''), ''scaleway'', %L, %L::bytea)',
                               v_client, v_inconnu, v_ref, v_env), '42501', null, 'une clé que le coffre n''a pas émise pour ce dossier est refusée (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_creer_dossier(%L::uuid, %L::uuid, tests.tamila_chiffre(''a''), tests.tamila_chiffre(''b''), ''scaleway'', %L, %L::bytea)',
                               v_client, v_dossier2, v_ref, v_env), '42501', null, 'ni par une autre personne que celle qui l''a demandée (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser_serveur();
  return next throws_ok(format('select public.tamila_coffre_conclure(%s, ''deballe'', ''{}''::jsonb)', r ->> 'journal'), '22023', null,
                        'une demande de nouvelle clé ne se conclut pas en « deballe » (22023)');
  perform public.tamila_coffre_conclure((r ->> 'journal')::bigint, 'emise', '{}'::jsonb);
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next lives_ok(format('select public.tamila_creer_dossier(%L::uuid, %L::uuid, tests.tamila_chiffre(''a''), tests.tamila_chiffre(''b''), ''scaleway'', %L, %L::bytea)',
                              v_client, v_dossier2, v_ref, v_env), 'l''avocat ouvre le dossier avec la clé émise pour lui (émise et conclue)');
  perform tests.redevenir_admin();
  select * into v_k from public.tamila_cles where dossier_id = v_dossier2;
  return next is(v_k.fournisseur, 'scaleway', 'la clé du nouveau dossier est sous la clé maître');

  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  r2 := public.tamila_coffre_pour_nouvelle_cle(v_client);
  perform tests.redevenir_admin();
  perform tests.endosser_serveur();
  return next lives_ok(format('select public.tamila_coffre_conclure(%s, ''echec'', ''{"code": "KM_INDISPONIBLE"}''::jsonb)', r2 ->> 'journal'),
                       'une émission manquée se conclut en échec');
  perform tests.redevenir_admin();

  -- ── 4. Un membre : l'enveloppe, et la remise au journal ──
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next throws_ok(format('select public.tamila_coffre_pour_membre(%L::uuid)', v_dossier2), '42501', null,
                        'le stagiaire n''est pas membre du nouveau dossier (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'autre_gerant')::uuid, 'b4-voisin@essai.invalid');
  return next throws_ok(format('select public.tamila_coffre_pour_membre(%L::uuid)', v_dossier2), '42501', null,
                        'le cabinet voisin non plus (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  r := public.tamila_coffre_pour_membre(v_dossier2);
  return next is(r ->> 'enveloppe', encode(v_env, 'hex'), 'le responsable reçoit l''enveloppe Scaleway, à déballer par le coffre');
  return next is(r ->> 'reference', v_ref, 'avec la référence de la clé maître');
  perform tests.redevenir_admin();
  return next is((select count(*) from public.tamila_coffre_journal j where j.id = (r ->> 'journal')::bigint and j.pour = 'membre'
                    and j.demandeur = (jeu ->> 'avocat')::uuid and j.dossier_id = v_dossier2 and j.issue = 'demande'), 1::bigint,
                 'la remise est au journal du coffre : qui, quel dossier, pour un membre');
  return next ok(exists (select 1 from public.lectures l where l.objet_id = v_dossier2::text and l.contexte = 'cle'
                           and l.user_id = (jeu ->> 'avocat')::uuid), 'et au journal des accès (contexte « cle »)');

  -- ── 5. Le lecteur : une pièce à lire, et seulement elle ──
  jeu2 := jeu || jsonb_build_object('dossier', v_dossier2);
  v_piece2 := tests.tamila_piece(jeu2, 'ordonnance-mee.pdf');
  v_piece_lue := tests.tamila_piece(jeu2, 'deja-lue.pdf');
  update public.pieces set statut = 'lue' where id = v_piece_lue;
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_coffre_pour_lecteur(%L::uuid)', v_piece2), '42501', null,
                        'une personne connectée ne passe pas par la porte du lecteur (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser_serveur();
  return next throws_ok(format('select public.tamila_coffre_pour_lecteur(%L::uuid)', v_piece_lue), '55000', null,
                        'une pièce déjà lue n''a pas de clé à déballer (55000)');
  r := public.tamila_coffre_pour_lecteur(v_piece2);
  return next is(r ->> 'enveloppe', encode(v_env, 'hex'), 'le lecteur reçoit l''enveloppe de la pièce à lire');
  v_journal := (r ->> 'journal')::bigint;
  return next throws_ok(format('select public.tamila_coffre_conclure(%s, ''emise'', ''{}''::jsonb)', v_journal), '22023', null,
                        'une remise au lecteur ne se conclut pas en clé émise (22023)');
  perform public.tamila_coffre_conclure(v_journal, 'deballe', '{"duree_ms": 41}'::jsonb);
  return next throws_ok(format('select public.tamila_coffre_conclure(%s, ''echec'', ''{}''::jsonb)', v_journal), '55000', null,
                        'une issue ne se réécrit pas (55000)');
  r2 := public.tamila_coffre_pour_lecteur(v_piece2);
  perform public.tamila_coffre_conclure((r2 ->> 'journal')::bigint, 'echec', '{"code": "FOURNISSEUR_INDISPONIBLE"}'::jsonb);
  perform tests.redevenir_admin();
  return next is((select j.issue || '/' || j.piece_id::text from public.tamila_coffre_journal j where j.id = v_journal),
                 'deballe/' || v_piece2::text, 'le journal garde la pièce et l''issue « deballe »');
  return next ok(exists (select 1 from public.alertes a where a.client_id = v_client and a.niveau = 'critique'
                           and a.cle_regroupement like '%coffre_echec:' || v_dossier2::text), 'un déballage en échec lève une alerte critique');

  -- ── 6. Le ré-enveloppement du dossier local ──
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next throws_ok(format('select public.tamila_coffre_a_reenvelopper(%L::uuid)', v_dossier), '42501', null,
                        'le stagiaire ne ré-enveloppe pas (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select public.tamila_coffre_a_reenvelopper(%L::uuid)', v_dossier), '42501', null,
                        'un intervenant qui n''est ni associé ni responsable non plus (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  r := public.tamila_coffre_a_reenvelopper(v_dossier);
  v_journal := (r ->> 'journal')::bigint;
  return next is(r ->> 'temoin', (select encode(d.reference_chiffree, 'hex') from public.tamila_dossiers d where d.id = v_dossier),
                 'le témoin rendu est la référence chiffrée (le coffre y vérifie la clé, étiquette GCM)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_coffre_reenveloppe(%s, %L::bytea)', v_journal, v_env), '42501', null,
                        'une personne connectée ne pose pas l''enveloppe (42501)');
  perform tests.redevenir_admin();
  -- Sans la porte, la clé ne se retouche toujours pas, même avec le réglage posé à la main.
  return next throws_ok(format('update public.tamila_cles set enveloppe = %L::bytea where dossier_id = %L::uuid', v_env, v_dossier), '42501', null,
                        'tamila_cles : l''enveloppe ne change pas hors de la porte (42501)');
  return next throws_ok(format('select set_config(''omega.tamila_reenveloppement'', %L, true); update public.tamila_cles set fournisseur = ''scaleway'', reference = ''autre'', enveloppe = %L::bytea where dossier_id = %L::uuid',
                               v_dossier, v_env, v_dossier), '42501', null, 'ni vers une référence qui n''est pas celle d''une clé Scaleway (42501)');
  perform set_config('omega.tamila_reenveloppement', '', true);
  perform tests.endosser_serveur();
  return next throws_ok(format('select public.tamila_coffre_reenveloppe(%s, ''\x00''::bytea)', v_journal), '22023', null,
                        'une enveloppe trop courte est refusée (22023)');
  r := public.tamila_coffre_reenveloppe(v_journal, v_env);
  return next is((r ->> 'pieces_relancees')::int, 1, 'la pièce laissée faute de coffre repart à la lecture');
  return next is(r ->> 'statut', 'scaleway', 'plus aucun dossier local : la bascule est finie');
  return next throws_ok(format('select public.tamila_coffre_reenveloppe(%s, %L::bytea)', v_journal, v_env), '55000', null,
                        'une demande ne sert qu''une fois (55000)');
  perform tests.redevenir_admin();
  select * into v_k from public.tamila_cles where dossier_id = v_dossier;
  return next ok(v_k.fournisseur = 'scaleway' and v_k.reference = v_ref and v_k.enveloppe = v_env and v_k.statut = 'active',
                 'la clé du dossier est maintenant sous la clé maître, toujours active');
  return next ok((select (detail ->> 'ancienne_empreinte') ~ '^[0-9a-f]{64}$' and issue = 'reenveloppe' from public.tamila_coffre_journal where id = v_journal),
                 'le journal garde l''empreinte de l''ancienne enveloppe, jamais l''enveloppe');
  return next is((select count(*) from public.travaux w where w.genre = 'lecteur.lire' and w.cle = 'piece:' || v_piece::text and w.etat = 'a_faire'),
                 1::bigint, 'un nouveau travail lecteur.lire attend la pièce');
  return next is((select statut from public.tamila_coffres where client_id = v_client), 'scaleway', 'le coffre du cabinet est « scaleway »');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'tamila.cle.reenveloppee'
                           and j.objet_id = v_dossier::text), 'le ré-enveloppement est au journal opposable');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next ok((public.tamila_coffre_a_reenvelopper(v_dossier) ->> 'deja')::boolean, 'redemandé : le dossier est déjà sous la clé maître');
  -- La destruction de clé du socle (effacement) n'est pas touchée : passage active → désactivée toujours permis.
  perform tests.redevenir_admin();
  return next lives_ok(format('update public.tamila_cles set statut = ''desactivee'', desactivee_le = now() where dossier_id = %L::uuid', v_dossier2),
                       'la garde du socle laisse toujours désactiver une clé');

  -- ── 7. Qui lit le journal du coffre ──
  perform tests.endosser((jeu ->> 'admin')::uuid, 'b4-haddad@essai.invalid');
  select count(*) into n from public.tamila_coffre_journal;
  return next ok(n >= 5, 'un associé lit le journal du coffre de son cabinet');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next is((select count(*) from public.tamila_coffre_journal), 0::bigint, 'un avocat collaborateur ne le lit pas');
  return next is((select statut from public.tamila_coffres where client_id = v_client), 'scaleway', 'mais lit l''état du coffre de son cabinet');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'autre_gerant')::uuid, 'b4-voisin@essai.invalid');
  return next is((select count(*) from public.tamila_coffre_journal) + (select count(*) from public.tamila_coffres), 0::bigint,
                 'le cabinet voisin ne voit ni journal ni coffre');
  return next throws_ok('insert into public.tamila_coffre_journal (client_id, dossier_id, pour, demandeur) values (gen_random_uuid(), gen_random_uuid(), ''membre'', gen_random_uuid())',
                        '42501', null, 'personne n''écrit dans le journal du coffre en direct (42501)');
  perform tests.redevenir_admin();
  return next is(tests.tamila_clair_dans('tamila_coffre_journal', tests.tamila_sentinelle()), 0::bigint, 'aucun clair au journal du coffre');
end $f$;

select * from runtests('tests'::name, '^test_b4_14_');
