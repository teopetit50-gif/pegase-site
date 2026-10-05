-- 09 — Le point du matin, les mesures et le journal opposable (étapes 16 et 17).

create or replace function tests.test_b2_09_point_mesure_journal() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; v_section jsonb; v_reseau jsonb; n integer; col text; nb bigint;
  -- le « jour » des factures et des mesures est celui de l'agence (Europe/Paris), pas celui du serveur (UTC) : entre 0 h et 2 h Paris ils diffèrent
  v_jour date := (now() at time zone 'Europe/Paris')::date;
begin
  jeu := tests.tavaro_chiffrer(tests.tavaro_jeu_contrat(), 'collab');
  v_client := (jeu ->> 'client')::uuid;

  -- La section de l'agence : une proposition à décider.
  v_section := private.loc_section_facturation(v_client, (jeu ->> 'siege')::uuid, v_jour);
  return next ok(v_section @> '[{"gabarit": "tavaro.propositions_a_decider", "valeurs": {"n": 1}}]'::jsonb, format('La section de l''agence compte la proposition à décider (%s)', v_section));
  return next ok((v_section -> 0 -> 'valeurs' ->> 'montant')::numeric = 418.20, 'Pour 418,20 €');
  v_reseau := private.loc_section_reseau(v_client, v_jour);
  return next ok(v_reseau @> '[{"gabarit": "tavaro.agence_reseau"}]'::jsonb and (v_reseau -> 0 ->> 'texte') like 'Loueur Essai B2 — Siège :%', format('La section réseau de la direction nomme l''agence (%s)', v_reseau -> 0 ->> 'texte'));
  -- Le dépôt des sections passe (il écrit dans le point du jour du socle).
  n := private.loc_deposer_points(now());
  return next ok(n >= 3, format('loc_deposer_points dépose les sections des deux agences et de la direction (%s)', n));

  -- Après facturation : la mesure du jour.
  jeu := tests.tavaro_jeu_facture();
  v_client := (jeu ->> 'client')::uuid;
  n := private.loc_mesurer(v_client, v_jour);
  return next ok(n >= 2, format('loc_mesurer enregistre les euros facturés et les retours facturés du jour (%s mesures)', n));
  v_section := private.loc_section_facturation(v_client, (jeu ->> 'siege')::uuid, v_jour + 1);
  return next ok(v_section @> '[{"gabarit": "tavaro.factures_emises_hier", "valeurs": {"n": 2}}]'::jsonb, format('Le lendemain, la section compte les deux factures émises la veille (%s)', v_section));

  -- Le journal opposable : une ligne par étape, par private.journaliser seulement.
  return next ok(tests.tavaro_journal(v_client, 'tavaro.bareme_publie') >= 1, 'journal : tavaro.bareme_publie');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.proposition_calculee') >= 1, 'journal : tavaro.proposition_calculee');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.demande_deposee') >= 1, 'journal : tavaro.demande_deposee');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.proposition_validee') >= 1, 'journal : tavaro.proposition_validee');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.facture_emise') >= 2, 'journal : tavaro.facture_emise ×2');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.regles_posees') >= 1, 'journal : tavaro.regles_posees');
  return next ok(not has_table_privilege('authenticated', 'public.journal_opposable', 'INSERT'), 'authenticated n''insère pas au journal');
  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b2-gerant@essai.invalid');
  col := tests.colonne_parmi('public.journal_opposable'::regclass, array['action', 'evenement', 'type_action', 'type']);
  return next throws_ok(format('insert into public.journal_opposable (client_id, %I) values (%L, %L)', col, v_client, 'tavaro.pirate'), null, null, 'Même le gérant n''écrit pas au journal directement');
  execute format('select count(*) from public.journal_opposable where client_id = $1 and %I like $2', col) into nb using v_client, 'tavaro.%';
  return next ok(nb >= 7, format('Le gérant lit le journal de son loueur (%s lignes tavaro.*)', nb));
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre-loueur@essai.invalid');
  execute format('select count(*) from public.journal_opposable where client_id = $1') into nb using v_client;
  return next is(nb, 0::bigint, 'Un autre loueur ne lit rien du journal de celui-ci');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b2_09_');
