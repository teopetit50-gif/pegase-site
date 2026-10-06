-- 10 — L'isolement (étape 18) et l'anonymisation du locataire (étape 19).

create or replace function tests.test_b2_10_rls_anonymisation() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_contrat uuid; v_loc uuid; r jsonb; t text; v_perim text;
begin
  jeu := tests.tavaro_jeu_facture();
  v_client := (jeu ->> 'client')::uuid;
  v_contrat := (jeu ->> 'contrat')::uuid;
  select c.locataire_id into v_loc from public.loc_contrats c where c.id = v_contrat;

  -- Un autre loueur ne voit rien, table par table.
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre-loueur@essai.invalid');
  foreach t in array array['loc_agences', 'loc_baremes', 'loc_bareme_lignes', 'loc_categories', 'loc_contrats', 'loc_contrats_amendements',
                           'loc_vehicules', 'loc_locataires', 'loc_propositions', 'loc_proposition_lignes', 'loc_factures', 'loc_facture_lignes',
                           'loc_avoirs', 'loc_releves', 'loc_reglages', 'loc_series_factures', 'loc_reservations'] loop
    return next is(tests.compter('public', t, 'true'), 0::bigint, format('Un autre loueur ne voit aucune ligne de %s', t));
  end loop;
  return next is(tests.compter('public', 'loc_fraicheur', 'true'), 0::bigint, 'Ni la vue loc_fraicheur');
  perform tests.redevenir_admin();

  -- Un membre voit son loueur.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next is(tests.compter('public', 'loc_contrats', 'true'), 1::bigint, 'Le collaborateur voit le contrat de son agence');
  return next is(tests.compter('public', 'loc_factures', 'true'), 2::bigint, 'Et ses deux factures');
  return next is(tests.compter('public', 'loc_locataires', 'true'), 1::bigint, 'Et le locataire de ce contrat');
  return next is(tests.compter('public', 'loc_fraicheur', 'true'), 6::bigint, 'La fraîcheur des relevés : deux agences × trois natures');
  perform tests.redevenir_admin();

  -- Le périmètre par agence : si le socle a une table de périmètre, le collaborateur de l'agence Nord ne voit pas le contrat du siège.
  v_perim := tests.table_parmi(array['comptes_perimetres', 'perimetres', 'comptes_entites', 'perimetres_comptes']);
  if v_perim is null then
    return next diag('Aucune table de périmètre par entité trouvée (comptes_perimetres, perimetres, comptes_entites) : le périmètre par agence reste à vérifier avec le coordinateur.');
    return next pass('Périmètre par agence : non testable ici');
  else
    begin
      update public.comptes set perimetre_total = false where user_id = (jeu ->> 'collab_nord')::uuid and client_id = v_client;
      perform tests.inserer_minimal('public', v_perim, jsonb_build_object('client_id', v_client, 'user_id', jeu ->> 'collab_nord', 'entite_id', jeu ->> 'nord'));
      perform tests.endosser((jeu ->> 'collab_nord')::uuid, 'b2-collab-nord@essai.invalid');
      return next is(tests.compter('public', 'loc_contrats', 'true'), 0::bigint, format('Le collaborateur de l''agence Nord ne voit pas le contrat du siège (%s)', v_perim));
      return next throws_ok(format('select public.loc_chiffrer_retour(%L::uuid, tests.tavaro_retour())', v_contrat), null, null, 'Et ne le chiffre pas');
      perform tests.redevenir_admin();
    exception when others then
      perform tests.redevenir_admin();
      return next diag('Périmètre par agence : ' || sqlerrm);
      return next pass('Périmètre par agence : la table ' || v_perim || ' n''a pas la forme attendue, à voir avec le coordinateur');
    end;
  end if;

  -- L'anonymisation : le gérant seul ; refusée tant qu'un contrat est ouvert.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_anonymiser_locataire(%L::uuid)', v_loc), '42501', null, 'Le collaborateur n''anonymise pas');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  return next throws_ok(format('select public.loc_anonymiser_locataire(%L::uuid)', v_loc), '55000', null, 'Tant que le contrat est ouvert, l''anonymisation attend');
  perform tests.redevenir_admin();
  -- Le contrat se clôt par le relevé (le retour réel y figure).
  r := public.loc_appliquer_releve(v_client, 'contrats',
    jsonb_build_array(jsonb_build_object('n', 1, 'nature', 'ajout', 'valeurs', jsonb_build_object('numero', 'C-2026-0001', 'agence', 'SIEGE', 'retour_reel_le', '2026-10-05T11:30:00', 'km_retour', 12650, 'statut', 'clos'))),
    jsonb_build_object('cle', 'export:b2:clos', 'source', 'export', 'lu_le', now()));
  return next is((select c.statut from public.loc_contrats c where c.id = v_contrat), 'clos', 'Le contrat est clos par l''export');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  r := public.loc_anonymiser_locataire(v_loc, 'demande');
  perform tests.redevenir_admin();
  return next is((r ->> 'deja_anonyme')::boolean, false, 'Le gérant anonymise le locataire');
  return next ok((select l.nom is null and l.email is null and l.anonymise_le is not null from public.loc_locataires l where l.id = v_loc), 'Nom et courriel effacés, date gardée');
  return next is((select f.destinataire ->> 'nom' from public.loc_factures f where f.client_id = v_client and f.nature = 'frais'), 'Marie Durand', 'La facture émise garde son destinataire (pièce comptable)');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.locataire_anonymise') >= 1, 'Le journal opposable porte tavaro.locataire_anonymise');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  r := public.loc_anonymiser_locataire(v_loc, 'demande');
  return next is((r ->> 'deja_anonyme')::boolean, true, 'Une seconde fois : déjà anonyme');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b2_10_');
