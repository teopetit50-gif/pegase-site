-- 19 — Les avis RPVA reçus par courriel, à rattacher (migration b4_10). Après 00_jeu_tamila.sql, b4_01 à b4_10.
-- La réception est posée comme l'aurait fait deposer_reception (même table, même événement). runtests() annule tout.

create or replace function tests.test_b4_19_avis_entrants() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_dossier uuid; v_rec bigint; v_rec2 bigint; v_rec3 bigint; v_e public.tamila_avis_entrants; v_e2 uuid; v_e3 uuid;
  v_piece uuid; r jsonb; n bigint;
begin
  jeu := tests.tamila_scene();
  v_client := (jeu ->> 'client')::uuid;
  v_dossier := (jeu ->> 'dossier')::uuid;

  -- Trois courriels e-barreau arrivent dans la boîte du cabinet (module tamila), un quatrième pour un autre module.
  insert into public.receptions (client_id, module, canal, boite, identifiant_externe, de_adresse, de_nom, sujet, corps, pieces)
  values (v_client, 'tamila', 'email', 'delorme@recu.omegaai.fr', 'b4-m1', 'noreply@e-barreau.fr', 'e-barreau',
          'Avis de fixation à bref délai — RG 26/01234 — ' || tests.tamila_sentinelle(), 'Corps en clair ' || tests.tamila_sentinelle(),
          jsonb_build_array(jsonb_build_object('nom', 'avis.pdf', 'mime', 'application/pdf', 'taille', 2048, 'chemin', v_client::text || '/receptions/b4-m1/avis.pdf')))
  returning id into v_rec;
  insert into public.receptions (client_id, module, canal, boite, identifiant_externe, sujet, corps, pieces)
  values (v_client, 'tamila', 'email', 'delorme@recu.omegaai.fr', 'b4-m2', 'Notification de conclusions', 'x', '[]') returning id into v_rec2;
  insert into public.receptions (client_id, module, canal, boite, identifiant_externe, sujet, corps, pieces)
  values (v_client, 'tamila', 'email', 'delorme@recu.omegaai.fr', 'b4-m3', 'Avis d''audience', 'x', '[]') returning id into v_rec3;
  insert into public.receptions (client_id, module, canal, boite, identifiant_externe, sujet) values (v_client, 'reput', 'email', 'autre', 'b4-m4', 'Avis client');
  perform private.publier_evenement(v_client, 'reception.nouvelle', jsonb_build_object('reception', v_rec, 'module', 'tamila'), 'reception:' || v_rec);
  perform private.publier_evenement(v_client, 'reception.nouvelle', jsonb_build_object('reception', v_rec2, 'module', 'tamila'), 'reception:' || v_rec2);
  perform private.publier_evenement(v_client, 'reception.nouvelle', jsonb_build_object('reception', v_rec3, 'module', 'tamila'), 'reception:' || v_rec3);
  perform private.publier_evenement(v_client, 'reception.nouvelle', jsonb_build_object('reception', (select id from public.receptions where identifiant_externe = 'b4-m4'), 'module', 'reput'), 'reception:m4');

  r := private.tamila_receptions_passage();
  return next is((r ->> 'receptions')::int, 4, 'le passage prend les quatre réceptions');
  return next is((select count(*) from public.tamila_avis_entrants where client_id = v_client), 3::bigint, 'trois entrent dans la file (l''autre module est ignoré)');
  select * into v_e from public.tamila_avis_entrants where reception_id = v_rec;
  return next is(v_e.type_suppose, 'rpva_avis_fixation', 'le type supposé, tiré du sujet : un code');
  return next ok(v_e.nb_pieces = 1 and v_e.expire_le = v_e.recu_le + interval '7 days', 'une pièce jointe, échéance à sept jours');
  return next is((select type_suppose from public.tamila_avis_entrants where reception_id = v_rec2), 'rpva_conclusions', 'conclusions : rpva_conclusions');
  return next is(tests.tamila_clair_dans('tamila_avis_entrants', tests.tamila_sentinelle()), 0::bigint, 'aucun clair du courriel n''entre dans Tamila');
  return next ok(exists (select 1 from public.alertes a where a.client_id = v_client and a.cle_regroupement like '%avis_entrant'), 'une alerte « avis à rattacher »');
  r := private.tamila_recevoir(v_rec);
  return next ok((r ->> 'deja')::boolean, 'rejoué : pas de doublon dans la file');

  -- Qui voit la file.
  perform tests.endosser((jeu ->> 'assistante')::uuid, 'b4-assistante@essai.invalid');
  return next is((select count(*) from public.tamila_avis_entrants), 3::bigint, 'l''assistante voit la file');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next is((select count(*) from public.tamila_avis_entrants), 0::bigint, 'le stagiaire ne la voit pas');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'autre_gerant')::uuid, 'b4-voisin@essai.invalid');
  return next is((select count(*) from public.tamila_avis_entrants), 0::bigint, 'ni le cabinet voisin');
  perform tests.redevenir_admin();

  -- Le rattachement : la pièce chiffrée est déposée par le navigateur, puis l'avis se rattache.
  v_piece := tests.tamila_piece(jeu, 'avis-fixation.pdf');
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next throws_ok(format('select public.tamila_rattacher_avis(%L::uuid, %L::uuid, array[%L::uuid])', v_e.id, v_dossier, v_piece), '42501', null,
                        'le stagiaire ne rattache pas (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'assistante')::uuid, 'b4-assistante@essai.invalid');
  return next throws_ok(format('select public.tamila_rattacher_avis(%L::uuid, %L::uuid, array[%L::uuid])', v_e.id, v_dossier, gen_random_uuid()), '22023', null,
                        'les pièces rattachées sont des pièces chiffrées du dossier (22023)');
  r := public.tamila_rattacher_avis(v_e.id, v_dossier, array[v_piece]);
  return next is((r ->> 'pieces')::int, 1, 'l''assistante (intervenante) rattache l''avis au dossier');
  return next throws_ok(format('select public.tamila_rattacher_avis(%L::uuid, %L::uuid, array[%L::uuid])', v_e.id, v_dossier, v_piece), '55000', null,
                        'un avis rattaché ne se rattache pas deux fois (55000)');
  perform tests.redevenir_admin();
  return next ok((select sujet is null and corps is null and corps_html is null and de_nom is null and de_adresse is null and statut = 'traitee'
                    from public.receptions where id = v_rec), 'la copie en clair est vidée : sujet, corps, expéditeur ; statut traitee');
  return next is(tests.tamila_clair_dans('receptions', tests.tamila_sentinelle()), 0::bigint, 'plus aucun clair de l''avis dans les réceptions');
  return next ok(exists (select 1 from public.travaux w where w.genre = 'tamila.purger_reception' and w.charge ->> 'reception' = v_rec::text and w.etat = 'a_faire'),
                 'le travail de purge des fichiers attend l''ouvrier tamila-purge');

  -- L'ouvrier tamila-purge.
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('select public.tamila_reception_a_purger(%s)', v_rec), '42501', null, 'une personne connectée n''appelle pas la purge (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser_serveur();
  r := public.tamila_reception_a_purger(v_rec);
  return next is(r -> 'chemins' ->> 0, v_client::text || '/receptions/b4-m1/avis.pdf', 'les fichiers à effacer au bucket, sous <client>/receptions/ seulement');
  return next throws_ok(format('select public.tamila_reception_a_purger(%s)', v_rec3), '55000', null, 'pas de purge sans demande (55000)');
  perform public.tamila_reception_purgee(v_rec, 1);
  perform tests.redevenir_admin();
  return next ok((select pieces = '[]'::jsonb from public.receptions where id = v_rec)
                 and (select purgee_le is not null from public.tamila_avis_entrants where id = v_e.id), 'purge constatée : la réception n''a plus de pièces');

  -- Écarter.
  select id into v_e2 from public.tamila_avis_entrants where reception_id = v_rec2;
  perform tests.endosser((jeu ->> 'assistante')::uuid, 'b4-assistante@essai.invalid');
  return next throws_ok(format('select public.tamila_ecarter_avis(%L::uuid, ''doublon'')', v_e2), '42501', null, 'l''assistante n''écarte pas : un avocat (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select public.tamila_ecarter_avis(%L::uuid, ''Ce n''''est pas pour nous'')', v_e2), '22023', null, 'le motif est un code (22023)');
  perform public.tamila_ecarter_avis(v_e2, 'pas_un_avis');
  perform tests.redevenir_admin();
  return next ok((select statut = 'ecarte' and purge_demandee_le is not null from public.tamila_avis_entrants where id = v_e2), 'écarté : même purge');

  -- Sept jours sans rattachement.
  select id into v_e3 from public.tamila_avis_entrants where reception_id = v_rec3;
  update public.tamila_avis_entrants set expire_le = now() - interval '1 minute' where id = v_e3;
  r := private.tamila_receptions_passage();
  return next is((r ->> 'expires')::int, 1, 'le passage fait expirer l''avis resté sept jours');
  return next ok((select statut = 'expire' and purge_demandee_le is not null from public.tamila_avis_entrants where id = v_e3)
                 and exists (select 1 from public.alertes a where a.client_id = v_client and a.niveau = 'critique' and a.cle_regroupement like '%avis_expire:%'),
                 'expiré : purge et alerte critique (« retrouvez-le sur e-barreau »)');
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = v_client and j.action = 'tamila.avis_entrant.rattache'), 'le rattachement est au journal');
end $f$;

select * from runtests('tests'::name, '^test_b4_19_');
