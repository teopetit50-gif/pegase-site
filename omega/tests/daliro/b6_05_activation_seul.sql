-- b6_05 — DALIRO : qui active l'accord permanent des J-2 (session B6, 06/10/2026), b6_09 et b6_10.
-- Exécutable tel quel par execute_sql sur la RECETTE, après b6_00_jeu.sql, le lot 19af du socle et les
-- migrations b6_01 à b6_10.
-- runtests() annule tout. Pour jouer « seul décideur » sur le banc, le test passe le temps du test les
-- autres décideurs (referent, daf, daf2…) en collaborateurs, puis rend son rôle à la DAF.

create or replace function tests.test_b6_05_activation_seul() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_daf uuid; v_collab uuid; v_etat jsonb; v_autre uuid; v_n integer;
begin
  banc := tests.b6_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid; v_daf := (banc ->> 'daf')::uuid;
  perform tests.redevenir_admin();
  perform public.btp_installer(v_client, 'chantiers');
  v_collab := tests.b6_compte(v_client, 'collaborateur', 'b6-seul-collab@banc-varelo.test');
  -- Le gérant devient le seul décideur du banc (le temps du test).
  update public.comptes set role = 'collaborateur'
  where client_id = v_client and user_id <> v_gerant and role in ('gerant', 'admin', 'valideur');
  return next is((select count(*)::int from public.comptes c where c.client_id = v_client and c.role in ('gerant', 'admin', 'valideur')), 1,
                 'Départ : le gérant est le seul décideur du banc');

  -- ── Seul décideur ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_etat := public.btp_donner_accord_j2(v_client);
  return next is(jsonb_array_length(v_etat -> 'proposees'), 3, 'Seul : trois politiques J-2 proposées');
  return next ok((v_etat ->> 'seul_decideur')::boolean, 'Seul : le don dit « seul décideur »');
  return next ok((public.btp_accord_j2(v_client) ->> 'seul_decideur')::boolean, 'Seul : l''état dit « seul décideur »');
  return next ok(exists (select 1 from public.regles_validation r where r.client_id = v_client and r.module = 'daliro'
                           and r.type_action = 'politique.activer' and r.actif and r.roles_autorises @> array['gerant', 'admin', 'valideur']),
                 'La règle d''activation (gérant, admin, valideur) est posée');
  return next ok((select bool_and(d.roles_autorises @> array['valideur']) from public.politiques p join public.demandes_validation d on d.id = p.demande_id
                  where p.client_id = v_client and p.module = 'daliro' and p.statut = 'a_valider'),
                 'Les demandes d''activation sont ouvertes aux valideurs');
  perform tests.endosser(v_collab, 'b6-seul-collab@banc-varelo.test');
  return next throws_ok(format('select public.btp_activer_accord_j2_seul(%L)', v_client), '42501', null, 'Un collaborateur n''active pas l''accord');
  perform tests.redevenir_admin();
  return next throws_ok(format('select public.btp_activer_accord_j2_seul(%L)', v_client), '42501', null, 'Le serveur n''active pas l''accord à la place du gérant');
  return next ok(not has_function_privilege('anon', 'public.btp_activer_accord_j2_seul(uuid)', 'execute'), 'anon n''exécute pas btp_activer_accord_j2_seul');
  return next ok(not has_function_privilege('authenticated', 'private.btp_autres_decideurs(uuid, uuid)', 'execute'), 'authenticated n''exécute pas btp_autres_decideurs');

  -- Une politique daliro HORS J-2, proposée à la main par le gérant : ni la file (liste blanche de 19af),
  -- ni la porte « seul » ne la lui font activer lui-même.
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  insert into public.politiques (client_id, module, type_action, libelle, nombre_mensuel, fin)
  values (v_client, 'daliro', 'daliro.signer_avenant', 'Autre accord (hors J-2)', 10, now() + interval '30 days');
  return next throws_ok(format('insert into public.approbations (demande_id, client_id, user_id, decision) select p.demande_id, %L, %L, ''approuve'' from public.politiques p where p.client_id = %L and p.type_action = ''daliro.signer_avenant''',
                               v_client, v_gerant, v_client),
                        '42501', null, 'Même seul, le gérant n''active pas lui-même une politique hors liste blanche (socle 19af)');
  v_etat := public.btp_activer_accord_j2_seul(v_client);
  return next is((v_etat ->> 'activees')::int, 3, 'Seul : le gérant active lui-même les trois politiques J-2');
  return next is(v_etat ->> 'etat', 'actif', 'Seul : l''accord est actif');
  return next is((select count(*)::int from public.politiques p where p.client_id = v_client and p.module = 'daliro'
                    and p.type_action like 'envoi.%' and p.statut = 'active' and p.active_le is not null), 3, 'Les trois politiques J-2 sont actives, datées');
  return next ok((select bool_and(d.statut in ('approuvee', 'executee')) from public.politiques p join public.demandes_validation d on d.id = p.demande_id
                  where p.client_id = v_client and p.module = 'daliro' and p.type_action like 'envoi.%' and p.statut = 'active'),
                 'Leurs demandes d''activation sont décidées (par la voie du socle)');
  return next is((select count(*)::int from public.approbations a join public.politiques p on p.demande_id = a.demande_id
                  where p.client_id = v_client and p.type_action like 'envoi.%' and p.statut = 'active' and a.user_id = v_gerant
                    and a.commentaire like '%activé par le seul décideur de l''organisation, %'), 3,
                 'Chaque activation est une approbation du gérant, commentée « activé par le seul décideur de l''organisation »');
  return next is((select p.statut from public.politiques p where p.client_id = v_client and p.type_action = 'daliro.signer_avenant'), 'a_valider',
                 'La politique hors J-2 n''est pas activée par la porte « seul »');
  perform tests.redevenir_admin();
  return next ok((tests.b6_journal(v_client, 'daliro.accord_j2_active_seul') -> 'donnees' ->> 'trace') like 'activé par le seul décideur de l''organisation, %'
                 or (tests.b6_journal(v_client, 'daliro.accord_j2_active_seul')::text like '%activé par le seul décideur de l''organisation, %'),
                 'Le journal trace « activé par le seul décideur de l''organisation, <email>, <date> »');

  -- ── Avec une DAF : la règle des deux personnes ──
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.btp_revoquer_accord_j2(v_client, 'Reprise avec la DAF');
  perform tests.redevenir_admin();
  update public.comptes set role = 'valideur' where client_id = v_client and user_id = v_daf;
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_etat := public.btp_donner_accord_j2(v_client);
  return next is(jsonb_array_length(v_etat -> 'proposees'), 3, 'Avec la DAF : trois politiques proposées de nouveau');
  return next ok(not (v_etat ->> 'seul_decideur')::boolean, 'Avec la DAF : le gérant n''est plus seul décideur');
  return next throws_ok(format('select public.btp_activer_accord_j2_seul(%L)', v_client), '42501', null, 'Avec la DAF : la porte « seul » refuse');
  return next throws_ok(format('insert into public.approbations (demande_id, client_id, user_id, decision) select p.demande_id, %L, %L, ''approuve'' from public.politiques p where p.client_id = %L and p.module = ''daliro'' and p.type_action = ''envoi.email'' and p.statut = ''a_valider''',
                               v_client, v_gerant, v_client),
                        '42501', null, 'Avec la DAF : le gérant demandeur n''est pas juge de sa demande');
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
  select p.demande_id, v_client, v_daf, 'approuve', 'Activation de l''accord J-2 par la DAF (essai B6)'
  from public.politiques p join public.demandes_validation d on d.id = p.demande_id
  where p.client_id = v_client and p.module = 'daliro' and p.type_action like 'envoi.%' and p.statut = 'a_valider' and d.statut = 'en_attente';
  get diagnostics v_n = row_count;
  return next is(v_n, 3, 'La DAF approuve les trois demandes d''activation (règle : valideur)');
  perform tests.redevenir_admin();
  return next is((select count(*)::int from public.politiques p where p.client_id = v_client and p.module = 'daliro'
                    and p.type_action like 'envoi.%' and p.statut = 'active'), 3, 'Avec la DAF : les trois politiques sont actives');
  return next ok(exists (select 1 from public.approbations a join public.politiques p on p.demande_id = a.demande_id
                         where p.client_id = v_client and p.statut = 'active' and a.user_id = v_daf),
                 'L''activation porte la décision de la DAF');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next is(public.btp_accord_j2(v_client) ->> 'etat', 'actif', 'L''état dit « actif »');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b6_05_');
