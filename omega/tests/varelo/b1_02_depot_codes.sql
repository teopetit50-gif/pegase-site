-- b1_02 — VARELO, étapes 5 et 6 : la DSI dépose les exports fournisseurs des sociétés A et B
-- Exécutable tel quel par execute_sql sur la RECETTE, après 00_installation.sql (A5) et b1_00_aides.sql.
-- runtests() annule tout ce que le test écrit.

create or replace function tests.test_b1_02_depot_societe_a() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; v_soc_a uuid;
  d jsonb;
  c public.grp_ref_codes;
  v_bis jsonb;
begin
  b := tests.b1_preparer(5);
  v_client := (b ->> 'client')::uuid;
  v_soc_a := (b ->> 'soc_a')::uuid;
  d := b -> 'depot_a';

  -- 5. le compte rendu du dépôt
  return next is((d ->> 'lus')::integer, 8, 'huit lignes lues');
  return next is((d ->> 'nouveaux')::integer, 5, 'cinq codes nouveaux');
  return next is((d ->> 'modifies')::integer, 0, 'aucun code modifié au premier dépôt');
  return next is(jsonb_array_length(d -> 'rejetes'), 3, 'trois lignes rejetées');
  return next is((d ->> 'anomalies')::integer, 1, 'une ligne à anomalie (SIREN à clé fausse)');
  return next ok(d -> 'rejetes' @> '[{"motif": "code local manquant"}]', 'la ligne sans code est rejetée « code local manquant »');
  return next ok(d -> 'rejetes' @> '[{"motif": "nom manquant"}]', 'la ligne sans nom est rejetée « nom manquant »');
  return next ok(d -> 'rejetes' @> '[{"motif": "doublon dans le lot", "code": "F0123"}]', 'le premier F0123 est rejeté « doublon dans le lot », le dernier gagne');

  -- les codes écrits, normalisés
  c := tests.b1_code(v_client, v_soc_a, 'F0123');
  return next is(c.nom_local, 'TRANSPORTS CARAIBES SARL', 'F0123 garde le libellé de la dernière ligne du lot');
  return next is(c.siren, '849300124', 'le SIREN est nettoyé de ses espaces');
  return next is(c.code_postal, '97122', 'le code postal est lu');
  return next is(c.pays, 'FR', 'le pays est en deux lettres');
  return next is(c.telephone_cle, '590261234', 'le téléphone devient une clé à neuf chiffres');
  return next is(c.domaine_email, 'transports-caraibes.gp', 'le domaine du courriel est retenu');
  return next matches(c.iban_empreinte, '^[0-9a-f]{64}$', 'l''IBAN n''est gardé que sous forme d''empreinte');
  return next is(c.etat, 'a_traiter', 'un code déposé attend le rapprochement');
  return next is(c.a_rapprocher, true, '… et est marqué à rapprocher');
  return next is(c.source_ref, 'export Sage 100 du 05/10', 'la source du dépôt est notée');
  c := tests.b1_code(v_client, v_soc_a, 'F0600');
  return next is(c.anomalies ->> 'siren', 'clé ou format invalide', 'le SIREN à clé fausse est noté en anomalie…');
  return next ok(c.siren is null, '… et n''est pas retenu comme identifiant');
  return next ok(exists (select 1 from public.travaux t where t.client_id = v_client and t.module = 'varelo'
                            and t.genre = 'varelo.referentiel.rapprocher' and t.etat in ('a_faire', 'en_cours')),
                 'un travail de rapprochement est déposé pour le banc');

  -- rejoué à l'identique : rien ne bouge
  perform tests.endosser((b ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  v_bis := public.grp_deposer_codes(v_client, v_soc_a, 'fournisseur', tests.b1_lignes_a(b ->> 'siren_b'), 'export Sage 100 du 05/10');
  return next is((v_bis ->> 'nouveaux')::integer, 0, 'rejoué : aucun nouveau');
  return next is((v_bis ->> 'modifies')::integer, 0, 'rejoué : aucun modifié');
  return next is((v_bis ->> 'inchanges')::integer, 5, 'rejoué : cinq inchangés');
  -- une ligne qui change de libellé : un modifié
  v_bis := public.grp_deposer_codes(v_client, v_soc_a, 'fournisseur', jsonb_build_array(jsonb_build_object('code', 'F0300', 'nom', 'Imprimerie Antillaise SARL', 'code_postal', '97110')), 'export Sage 100 du 06/10');
  return next is((v_bis ->> 'modifies')::integer, 1, 'un libellé qui change : un modifié');
  -- refus : nature inconnue, entité qui n'est pas une société du groupe, lignes hors tableau
  return next throws_ok(format('select public.grp_deposer_codes(%L, %L, ''prospect'', ''[]'', null)', v_client, v_soc_a), '22023', null, 'nature inconnue : 22023');
  return next throws_ok(format('select public.grp_deposer_codes(%L, %L, ''fournisseur'', ''[]'', null)', v_client, gen_random_uuid()), '22023', null, 'entité inconnue du groupe : 22023');
  return next throws_ok(format('select public.grp_deposer_codes(%L, %L, ''fournisseur'', ''{}'', null)', v_client, v_soc_a), '22023', null, 'lignes hors tableau : 22023');
  perform tests.redevenir_admin();

  -- un collaborateur ne dépose pas d'export (b1_01_portes_roles)
  perform tests.endosser((b ->> 'collab')::uuid, 'b1-collaborateur@essai.invalid');
  return next throws_ok(format('select public.grp_deposer_codes(%L, %L, ''fournisseur'', ''[]'', null)', v_client, v_soc_a), '42501', null,
                        'un collaborateur ne dépose pas d''export (42501)');
  perform tests.redevenir_admin();
end $f$;

create or replace function tests.test_b1_02_depot_societe_b() returns setof text
language plpgsql as $f$
declare
  b jsonb;
  v_client uuid; v_soc_b uuid;
  d jsonb;
  c public.grp_ref_codes;
begin
  b := tests.b1_preparer(6);
  v_client := (b ->> 'client')::uuid;
  v_soc_b := (b ->> 'soc_b')::uuid;
  d := b -> 'depot_b';

  -- 6. quatre codes de la société B, dont le même transporteur et la société B elle-même
  return next is((d ->> 'nouveaux')::integer, 4, 'quatre codes nouveaux pour la société B');
  return next is(jsonb_array_length(d -> 'rejetes'), 0, 'aucun rejet');
  c := tests.b1_code(v_client, v_soc_b, 'TRCAR');
  return next is(c.siren, '849300124', 'TRCAR porte le SIREN du transporteur de A');
  return next is(c.nom_normalise, (tests.b1_code(v_client, (b ->> 'soc_a')::uuid, 'F0123')).nom_normalise,
                 'les deux libellés du transporteur se normalisent pareil (forme juridique ôtée, accents, casse)');
  -- un code de A et un code de B portent le même code local sans se gêner
  return next lives_ok(format('select tests.b1_code(%L, %L, ''F0123'')', v_client, v_soc_b), 'le même code local peut exister dans deux sociétés');
  return next is((select count(*) from public.grp_ref_codes k where k.client_id = v_client and k.nature = 'fournisseur'
                    and k.entite_id in ((b ->> 'soc_a')::uuid, v_soc_b)), 9::bigint, 'neuf codes fournisseurs de l''essai en tout');
end $f$;

select * from runtests('tests'::name, '^test_b1_02_');
