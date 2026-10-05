-- b1_06 — VARELO, étapes 15, 16 et 17 : export, isolement d'une autre organisation, journal opposable
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5) et b1_00_aides.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_b1_06_export() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; v_soc_a uuid;
  csv text;
  v_lignes integer;
begin
  b := tests.b1_preparer(7);
  v_client := (b ->> 'client')::uuid; v_soc_a := (b ->> 'soc_a')::uuid;

  -- 15. une cellule piégée (formule de tableur) déposée puis rapprochée, pour voir l'export la neutraliser
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  perform public.grp_deposer_codes(v_client, v_soc_a, 'fournisseur', jsonb_build_array(jsonb_build_object('code', 'F0700', 'nom', '=SOMME(A1:A9)')), 'piège');
  perform public.grp_rapprocher(v_client, false);
  csv := public.grp_exporter_referentiel(v_client, 'fournisseur');
  perform tests.redevenir_admin();
  return next ok(csv like 'code_groupe;nom_groupe;societe;code_local;nom_local;etat' || E'\n%', 'l''export commence par son en-tête');
  v_lignes := array_length(string_to_array(csv, E'\n'), 1) - 1;
  return next cmp_ok(v_lignes, '>=', 10, format('au moins les dix codes de l''essai sont exportés (%s lignes)', v_lignes));
  return next ok(position(E'\n' || 'F-' in csv) > 0, 'chaque ligne commence par le code du groupe F-…');
  return next ok(position('TRANSPORTS CARAIBES SARL' in csv) > 0, 'le libellé local est exporté tel quel');
  return next ok(position('Essai B1 Distribution' in csv) > 0, 'la société de chaque code est nommée');
  return next ok(position(';''=SOMME(A1:A9)' in csv) > 0, 'une cellule qui commence par = est protégée par une apostrophe (injection tableur)');
  return next ok(position(';propose' in csv) > 0 and position(';nouveau' in csv) > 0, 'l''état de chaque code est exporté');
  -- un collaborateur n'exporte pas ; une nature inconnue est refusée
  perform tests.endosser((b ->> 'collab')::uuid, 'b1-collaborateur@essai.invalid');
  return next throws_ok(format('select public.grp_exporter_referentiel(%L, ''fournisseur'')', v_client), '42501', null, 'un collaborateur n''exporte pas le référentiel (42501)');
  perform tests.redevenir_admin();
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  return next throws_ok(format('select public.grp_exporter_referentiel(%L, ''prospect'')', v_client), '22023', null, 'nature inconnue : 22023');
  perform tests.redevenir_admin();
end $f$;

create or replace function tests.test_b1_06_isolement() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; v_soc_a uuid;
  t text;
begin
  b := tests.b1_preparer(7);
  v_client := (b ->> 'client')::uuid; v_soc_a := (b ->> 'soc_a')::uuid;

  -- 16. une personne d'une autre organisation ne lit rien du banc…
  perform tests.endosser((b ->> 'etranger')::uuid, 'a5-client-b@essai.invalid');
  foreach t in array array['grp_installations', 'grp_poles', 'grp_societes', 'grp_ref_codes', 'grp_ref_objets', 'grp_ref_propositions', 'grp_societes_vue', 'grp_referentiel_codes'] loop
    return next is(tests.compter('public', t, format('client_id = %L', v_client)), 0::bigint, format('%s : aucune ligne du banc pour une autre organisation', t));
  end loop;
  return next is((public.grp_etat_referentiel(v_client) -> 'fournisseur' ->> 'codes')::integer, 0, 'grp_etat_referentiel du banc, vu d''ailleurs : zéro code');
  -- … et n'agit pas chez lui
  return next throws_ok(format('select public.grp_installer(%L)', v_client), '42501', null, 'installer chez le banc depuis une autre organisation : refusé (42501)');
  return next throws_ok(format('select public.grp_deposer_codes(%L, %L, ''fournisseur'', ''[]'', null)', v_client, v_soc_a), '42501', null, 'déposer des codes chez le banc : refusé (42501)');
  return next throws_ok(format('select public.grp_rapprocher(%L)', v_client), '42501', null, 'lancer un passage chez le banc : refusé (42501)');
  return next throws_ok(format('select public.grp_appliquer_decisions(%L)', v_client), '42501', null, 'appliquer les décisions du banc : refusé (42501)');
  return next throws_ok(format('select public.grp_demander_rapprochement(%L)', v_client), '42501', null, 'demander un passage chez le banc : refusé (42501)');
  return next throws_ok(format('select public.grp_exporter_referentiel(%L, ''fournisseur'')', v_client), '42501', null, 'exporter le référentiel du banc : refusé (42501)');
  return next throws_ok(format('select public.grp_ajouter_societe(%L, ''Intruse'', null, ''GP'')', v_client), '42501', null, 'inscrire une société chez le banc : refusé (42501)');
  return next throws_ok(format('insert into public.grp_poles (client_id, cle, nom) values (%L, ''intrus'', ''Intrus'')', v_client), '42501', null, 'créer un pôle chez le banc : refusé (42501)');
  perform tests.redevenir_admin();

  -- les tables de compteurs et les tables privées ne se lisent pas
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  return next throws_ok(format('select count(*) from public.grp_ref_compteurs where client_id = %L', v_client), '42501', null, 'grp_ref_compteurs n''est pas lisible, même par le gérant (42501)');
  return next throws_ok(format('insert into public.grp_ref_codes (client_id, entite_id, nature, code_local, nom_local, nom_normalise, empreinte) values (%L, %L, ''fournisseur'', ''X'', ''X'', ''X'', repeat(''0'', 64))', v_client, v_soc_a), '42501', null,
                        'le gérant n''écrit pas un code à la main : tout passe par grp_deposer_codes (42501)');
  return next throws_ok(format('insert into public.grp_ref_objets (client_id, nature, numero, nom_groupe) values (%L, ''fournisseur'', 99999, ''X'')', v_client), '42501', null,
                        'le gérant n''ouvre pas un objet à la main (42501)');
  return next throws_ok(format('insert into public.grp_ref_propositions (client_id, nature, genre, preuve, type_action, objet_cible, cle_paire, empreinte) select %L, ''fournisseur'', ''renommer'', ''humaine'', ''renommer_objet'', id, ''x'', repeat(''0'', 64) from public.grp_ref_objets where client_id = %L limit 1', v_client, v_client), '42501', null,
                        'le gérant n''écrit pas une proposition à la main (42501)');
  perform tests.redevenir_admin();
end $f$;

create or replace function tests.test_b1_06_journal() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid;
  v_col_action text; v_col_client text;
  n_apres bigint;
  cond text;
begin
  -- 17. le journal opposable reçoit une ligne par étape, écrite par private.journaliser seulement
  v_col_action := tests.colonne_parmi('public.journal_opposable'::regclass, array['action', 'evenement', 'type_action']);
  v_col_client := tests.colonne_parmi('public.journal_opposable'::regclass, array['client_id', 'organisation_id']);
  if v_col_action is null or v_col_client is null then
    return next skip('journal_opposable : colonnes action/client non reconnues (voir Q5 au coordinateur)', 4);
    return;
  end if;
  b := tests.b1_preparer(7);
  v_client := (b ->> 'client')::uuid;
  cond := format('%I = %L and %I like ''varelo.%%''', v_col_client, v_client, v_col_action);
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  perform public.grp_exporter_referentiel(v_client, 'fournisseur');
  perform tests.redevenir_admin();
  n_apres := tests.compter('public', 'journal_opposable', cond);
  return next cmp_ok(n_apres, '>=', 5, format('au moins cinq lignes varelo.* au journal du groupe neuf (installation, lecture ×2, calcul, export) : %s', n_apres));
  return next ok(tests.compter('public', 'journal_opposable', cond || format(' and %I = ''varelo.installation''', v_col_action)) >= 1, 'l''installation journalisée');
  return next ok(tests.compter('public', 'journal_opposable', cond || format(' and %I = ''varelo.referentiel.lecture''', v_col_action)) >= 2, 'deux lectures journalisées');
  return next ok(tests.compter('public', 'journal_opposable', cond || format(' and %I = ''varelo.referentiel.calcul''', v_col_action)) >= 1, 'un calcul journalisé');
  return next ok(tests.compter('public', 'journal_opposable', cond || format(' and %I = ''varelo.referentiel.export''', v_col_action)) >= 1, 'un export journalisé');
  -- personne n'écrit le journal à la main
  perform tests.endosser((b ->> 'gerant')::uuid, 'b1-gerant@essai.invalid');
  return next throws_ok(format('update public.journal_opposable set %I = ''varelo.bidon'' where %I = %L', v_col_action, v_col_client, v_client), null, null,
                        'le gérant ne modifie pas le journal');
  return next throws_ok(format('delete from public.journal_opposable where %I = %L', v_col_client, v_client), null, null, 'le gérant n''efface pas le journal');
  return next throws_ok(format('insert into public.journal_opposable (%I, %I, objet_type, objet_id) values (%L, ''varelo.bidon'', ''x'', ''x'')', v_col_client, v_col_action, v_client), null, null,
                        'le gérant n''écrit pas le journal à la main : private.journaliser seulement');
  perform tests.redevenir_admin();
  -- le battement du module : chaque passage bat varelo_referentiel
  if tests.table_existe('battements') then
    return next ok(tests.compter('public', 'battements', format('client_id = %L and module = ''varelo_referentiel''', v_client)) >= 1, 'le passage a battu le battement varelo_referentiel');
  else
    return next skip('battements : table absente de public (voir le coordinateur)', 1);
  end if;
end $f$;

select * from runtests('tests'::name, '^test_b1_06_');
