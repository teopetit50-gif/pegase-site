-- 11 — Garde-fous (étape 16) : aucune écriture directe, le secret professionnel (jamais de clair), RLS du registre,
-- journal par le socle seulement. Après 00_jeu_tamila.sql. runtests() annule tout.

create or replace function tests.test_b4_11_garde_fous() returns setof text
language plpgsql as $f$
declare jeu jsonb; v_dossier uuid; v_appel uuid; v_m uuid; v_e uuid; n bigint; v_table text; v_nb bigint;
begin
  jeu := tests.tamila_scene();
  v_dossier := (jeu ->> 'dossier')::uuid;
  v_appel := tests.tamila_appel(jeu);
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  v_m := public.tamila_poser_muraille(v_dossier, (jeu ->> 'admin')::uuid, tests.tamila_chiffre('motif ' || tests.tamila_sentinelle()));
  perform public.tamila_consulter(v_dossier, 'dossier');
  v_e := public.tamila_demander_export(v_dossier);
  perform public.tamila_demander_cloture(v_dossier);
  -- un geste journalisé (tamila.delai.annule) pour que le journal porte une ligne du dossier
  perform public.tamila_annuler_delai((select t.id from public.tamila_delais t where t.appel_id = v_appel order by t.echeance_retenue limit 1), 'erreur');
  perform tests.redevenir_admin();

  -- ── Aucune écriture directe par une personne connectée, même le gérant ──
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  return next throws_ok(format('insert into public.tamila_dossiers (id, client_id, entite_id, statut) values (gen_random_uuid(), %L, %L, ''ouvert'')', jeu ->> 'client', jeu ->> 'entite'),
    '42501', null, 'INSERT direct dans tamila_dossiers : refusé (42501)');
  return next throws_ok(format('update public.tamila_dossiers set statut = ''clos'' where id = %L', v_dossier), '42501', null, 'UPDATE direct de tamila_dossiers : refusé (42501)');
  return next throws_ok(format('update public.tamila_delais set echeance_retenue = current_date where appel_id = %L', v_appel), '42501', null, 'UPDATE direct d''un délai : refusé (42501)');
  return next throws_ok(format('insert into public.tamila_parties (client_id, dossier_id, nom_chiffre, qualite) values (%L, %L, tests.tamila_chiffre(''x''), ''tiers'')', jeu ->> 'client', v_dossier),
    '42501', null, 'INSERT direct d''une partie : refusé (42501)');
  return next throws_ok(format('delete from public.tamila_murailles where id = %L', v_m), '42501', null, 'DELETE direct d''une muraille : refusé (42501)');
  return next throws_ok(format('update public.tamila_murailles set leve_le = now() where id = %L', v_m), '42501', null, 'UPDATE direct d''une muraille : refusé (42501)');
  return next throws_ok(format('insert into public.tamila_cles (client_id, dossier_id, fournisseur, reference, enveloppe) values (%L, %L, ''local'', ''x'', decode(repeat(''ab'', 40), ''hex''))', jeu ->> 'client', v_dossier),
    '42501', null, 'INSERT direct d''une clé : refusé (42501)');
  return next throws_ok(format('update public.tamila_exports set statut = ''pret'' where id = %L', v_e), '42501', null, 'UPDATE direct d''un export : refusé (42501)');
  return next throws_ok(format('insert into public.tamila_regles_procedure (code, regime, evenement, procedures, partie, acte, augmentable, interruptible, sanction, article, libelle_court) values (''tamila.cpc.essai'', ''cpc'', ''declaration_appel'', ''{a_orienter}'', ''toutes'', ''conclure'', true, true, ''caducite'', ''art. 0'', ''essai'')'),
    '42501', null, 'les règles de procédure ne s''écrivent pas depuis un cabinet (42501)');
  return next throws_ok(format('insert into public.journal_opposable (client_id, action, acteur_type, objet_type, objet_id, donnees) values (%L, ''tamila.essai'', ''systeme'', ''tamila_dossier'', %L, ''{}'')', jeu ->> 'client', v_dossier),
    '42501', null, 'le journal opposable ne s''écrit que par private.journaliser (42501)');
  return next throws_ok(format('insert into public.lectures (client_id, objet_type, objet_id, user_id) values (%L, ''tamila_dossier'', %L, %L)', jeu ->> 'client', v_dossier, jeu ->> 'gerant'),
    '42501', null, 'une lecture ne s''inscrit pas à la main (42501)');
  -- Le gérant règle Tamila (politique UPDATE), dans les bornes.
  return next lives_ok(format('update public.tamila_reglages set delai_cloture_jours = 15 where client_id = %L', jeu ->> 'client'), 'le gérant règle le délai de clôture (15 jours)');
  return next throws_ok(format('update public.tamila_reglages set delai_cloture_jours = 60 where client_id = %L', jeu ->> 'client'), '23514', null, 'au-delà de trente jours : refusé (23514)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'admin')::uuid, 'b4-haddad@essai.invalid');
  return next is((select count(*) from public.tamila_reglages where client_id = (jeu ->> 'client')::uuid and delai_cloture_jours = 15), 1::bigint, 'l''admin lit le réglage');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'admin')::uuid, 'b4-haddad@essai.invalid');
  execute format('update public.tamila_reglages set conservation_exports_jours = 3 where client_id = %L', jeu ->> 'client');
  get diagnostics v_nb = row_count;
  return next is(v_nb, 0::bigint, 'l''admin ne règle pas Tamila (politique : zéro ligne touchée)');
  perform tests.redevenir_admin();

  -- ── Le registre : une vue qui ne doit rien montrer d'un autre cabinet ──
  perform tests.endosser((jeu ->> 'autre_gerant')::uuid, 'b4-voisin@essai.invalid');
  begin
    select count(*) into n from public.tamila_registre r where r.client_id = (jeu ->> 'client')::uuid;
  exception when insufficient_privilege then
    n := 0;
  end;
  return next is(n, 0::bigint, 'le registre ne montre pas les dossiers d''un autre cabinet (vue sous la RLS de celui qui lit)');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  begin
    select count(*) into n from public.tamila_registre r where r.id = v_dossier;
  exception when insufficient_privilege then
    n := -1;
  end;
  return next ok(n in (1, -1), format('le gérant voit son dossier au registre, ou la vue lui est fermée (%s)', n));
  perform tests.redevenir_admin();

  -- ── Le secret professionnel : le mot sentinelle, chiffré partout, n'est en clair nulle part ──
  foreach v_table in array array['journal_opposable', 'audit_journal', 'alertes', 'demandes_validation', 'approbations', 'travaux', 'delais',
                                 'lectures', 'tamila_dossiers', 'tamila_parties', 'tamila_murailles', 'tamila_delais', 'tamila_exports',
                                 'tamila_audiences', 'tamila_avis', 'tamila_appels', 'pieces', 'points_du_jour_lignes', 'envois', 'receptions'] loop
    return next is(tests.tamila_clair_dans(v_table, tests.tamila_sentinelle()), 0::bigint, format('aucun clair dans %s', v_table));
  end loop;
  return next ok(exists (select 1 from public.journal_opposable j where j.client_id = (jeu ->> 'client')::uuid and j.objet_type = 'tamila_dossier' and j.objet_id = v_dossier::text),
    'le journal opposable porte bien des lignes du dossier (par identifiant, jamais par son contenu)');
  -- Les chiffrés eux-mêmes ne contiennent pas le clair (vérification du jeu d'essai).
  return next ok((select position(tests.tamila_sentinelle() in encode(nom_chiffre, 'escape')) = 0 from public.tamila_parties where id = (jeu ->> 'partie_client')::uuid), 'le nom chiffré ne contient pas le clair');

  -- ── Les comptes des associés : ce qui est hors de vue se compte, sans se lire ──
  perform tests.endosser((jeu ->> 'admin')::uuid, 'b4-haddad@essai.invalid');
  return next is(public.tamila_registre_hors_vue((jeu ->> 'client')::uuid), 1, 'Me Haddad, derrière une muraille, compte un dossier hors de sa vue');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'avocat')::uuid, 'b4-rousseau@essai.invalid');
  return next throws_ok(format('select public.tamila_registre_hors_vue(%L::uuid)', jeu ->> 'client'), '42501', null, 'ce compte revient aux associés (42501)');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b4_11_');
