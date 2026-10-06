-- 15 — La facture électronique côté module (vague 3, manque n° 2, migration b2_06) : chaque facture sort en CII EN 16931,
-- le flux est dit (e-invoicing pour un pro avec SIREN, e-reporting pour un particulier), ce qui bloquerait est listé ;
-- l'agence complète le SIREN d'un client (contrôlé) ; la direction lit la préparation au 1er septembre 2027.
-- Le XML a été validé hors base (XSD Factur-X EN 16931, schematrons EN 16931 et BR-FR Flux 2) : 0 échec pour une
-- facture et un avoir à un professionnel.

create or replace function tests.test_b2_15_facture_electronique() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_client uuid; f public.loc_factures; r jsonb; v_loc uuid; v_avoir uuid;
begin
  if to_regprocedure('public.loc_facture_electronique(uuid)') is null then
    return next fail('La migration b2_06 (facture électronique) n''est pas posée : public.loc_facture_electronique manque');
    return;
  end if;
  return next ok(private.loc_siren_valide('552100554') and private.loc_siren_valide('732829320') and not private.loc_siren_valide('123456789')
                 and not private.loc_siren_valide('55210055'), 'La clé de contrôle du SIREN est vérifiée');
  return next is(private.loc_adresse('12 rue de la Gare, 75010 Paris') ->> 'cp', '75010', 'Une adresse se découpe : ligne, code postal, ville');

  jeu := tests.tavaro_jeu_facture();
  v_client := (jeu ->> 'client')::uuid;
  select * into f from public.loc_factures where client_id = v_client and nature = 'frais';
  select c.locataire_id into v_loc from public.loc_contrats c where c.id = (jeu ->> 'contrat')::uuid;

  -- Le collaborateur lit la forme électronique de la facture.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  r := public.loc_facture_electronique(f.id);
  return next is(r ->> 'flux', 'e_reporting', 'Une facture à un particulier relève du e-reporting');
  return next ok(r ->> 'xml' like '<?xml%' and r ->> 'xml' like '%urn:cen.eu:en16931:2017%' and r ->> 'xml' like '%<ram:ID>' || f.reference || '</ram:ID>%'
                 and r ->> 'xml' like '%<ram:TypeCode>380</ram:TypeCode>%', 'Le XML CII porte le contexte EN 16931, le numéro et le type 380');
  return next ok(xml_is_well_formed_document(r ->> 'xml'), 'Le XML est bien formé');
  return next ok(r ->> 'xml' like '%<ram:GrandTotalAmount>' || private.loc_dec(f.total_ttc, 2) || '</ram:GrandTotalAmount>%', 'Le total TTC est celui de la facture');
  return next ok(jsonb_typeof(r -> 'manques') = 'array' and (r ->> 'pret')::boolean = (jsonb_array_length(r -> 'manques') = 0), 'Les manques sont listés et « prêt » en découle');
  perform tests.redevenir_admin();

  -- Un autre loueur ne lit rien.
  perform tests.endosser((jeu ->> 'autre')::uuid, 'b2-autre-loueur@essai.invalid');
  return next throws_ok(format('select public.loc_facture_electronique(%L::uuid)', f.id), 'P0002', null, 'Un autre loueur ne lit pas cette facture');
  return next throws_ok(format('select public.loc_completer_locataire(%L::uuid, %L::jsonb)', v_loc, '{"siren":"552100554"}'), 'P0002', null, 'Ni ne complète ce client');
  perform tests.redevenir_admin();

  -- L'agence complète le client : un SIREN faux est refusé, un vrai le fait passer professionnel.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next throws_ok(format('select public.loc_completer_locataire(%L::uuid, %L::jsonb)', v_loc, '{"siren":"123456789"}'), '22023', null, 'Un SIREN dont la clé est fausse est refusé');
  r := public.loc_completer_locataire(v_loc, '{"siren":"552 100 554","raison_sociale":"Durand Conseil SAS","adresse":"3 rue des Lilas, 75011 Paris"}');
  return next ok(r -> 'champs' ? 'siren', 'Le SIREN est complété');
  perform tests.redevenir_admin();
  return next ok((select l.type = 'professionnel' and l.siren = '552100554' from public.loc_locataires l where l.id = v_loc), 'Le client devient professionnel, SIREN sans espaces');
  return next ok(tests.tavaro_journal(v_client, 'tavaro.locataire_complete') >= 1, 'Le journal opposable porte tavaro.locataire_complete');
  -- La facture déjà émise ne change pas (elle garde son destinataire) ; la forme électronique le dit toujours e-reporting.
  perform tests.endosser((jeu ->> 'collab')::uuid, 'b2-collab@essai.invalid');
  return next is(public.loc_facture_electronique(f.id) ->> 'flux', 'e_reporting', 'Une facture émise garde le destinataire de son émission');

  -- L'avoir : pas de forme électronique tant qu'il n'est pas émis.
  v_avoir := public.loc_demander_avoir(f.id, 'Geste commercial sur les kilomètres', 5);
  return next throws_ok(format('select public.loc_avoir_electronique(%L::uuid)', v_avoir), '23514', null, 'Un avoir non émis n''a pas de forme électronique');
  -- La préparation 2027 : la direction et les valideurs, pas le collaborateur.
  return next throws_ok('select public.loc_preparation_2027()', '42501', null, 'Le collaborateur ne lit pas la préparation 2027');
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'referent')::uuid, 'b2-referent@essai.invalid');
  r := public.loc_preparation_2027();
  perform tests.redevenir_admin();
  return next is(r ->> 'echeance_emission', '2027-09-01', 'La préparation rappelle l''échéance d''émission');
  return next ok(jsonb_typeof(r -> 'pieces_90_jours') = 'array' and jsonb_array_length(r -> 'pieces_90_jours') >= 1, 'Elle compte les pièces récentes par flux');
end $f$;

select * from runtests('tests'::name, '^test_b2_15_');
