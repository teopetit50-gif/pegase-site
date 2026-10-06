-- Tests A4 — lot 9 (a4_16) : la facture électronique reçue fait foi ; son cycle de vie est prêt à repartir.
-- pgTAP, schéma « tests » d'A5 : poser ce fichier puis `select * from runtests('tests', '^test_a4_')`.
-- runtests() annule tout ce que les tests écrivent. Données d'exemple seulement (clés de SIREN justes).

-- Une organisation d'exemple installée, avec un fournisseur actif et deux personnes. Rend leurs identifiants.
create or replace function tests.a4_organisation() returns jsonb
language plpgsql as $$
declare v_cl uuid := gen_random_uuid(); v_e uuid; v_g uuid := gen_random_uuid(); v_v uuid := gen_random_uuid(); v_four uuid;
begin
  insert into auth.users (id, email, instance_id, aud, role, encrypted_password, created_at, updated_at)
  select u, u::text || '@exemple.test', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '', now(), now()
    from unnest(array[v_g, v_v]) u;
  insert into public.clients (id, nom) values (v_cl, 'Organisation d''exemple A4 lot 9');
  select e.id into v_e from public.entites e where e.client_id = v_cl and e.principale;
  insert into public.comptes (user_id, client_id, role) values (v_g, v_cl, 'gerant'), (v_v, v_cl, 'valideur');
  set local role service_role; perform public.filed_installer(v_cl); reset role;
  insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source, siren)
  values (v_cl, 'XML', 'Fournisseur structuré d''exemple', 'fournisseur structure d exemple', 'FR', 'actif', 'saisie', '123456782')
  returning id into v_four;
  return jsonb_build_object('client', v_cl, 'entite', v_e, 'gerant', v_g, 'valideur', v_v, 'fournisseur', v_four);
end $$;

-- Une pièce, ses valeurs (source xml ou ia), son document et sa facture. Rend {piece, document, facture}.
create or replace function tests.a4_facture(p_org jsonb, p_source text, p_numero text, p_ttc numeric default 120)
returns jsonb language plpgsql as $$
declare v_cl uuid := (p_org ->> 'client')::uuid; v_piece uuid; v_doc uuid; v_f uuid; v_n int;
begin
  v_n := (floor(random() * 900000) + 100000)::int;
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut)
  values (gen_random_uuid(), v_cl, 'filed', 'depot', p_numero || '.xml', 'application/xml', 2048, md5(p_numero || v_n) || md5(p_numero),
          v_cl::text || '/filed_document/test/' || p_numero || '.xml', 'filed_document', p_numero, 'lue')
  returning id into v_piece;
  insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee) values
    (v_cl, v_piece, 'numero', to_jsonb(p_numero), p_numero, p_source, 1, true),
    (v_cl, v_piece, 'montant_ttc', to_jsonb(p_ttc), p_ttc::text, p_source, 1, true),
    (v_cl, v_piece, 'fournisseur.nom', to_jsonb('Fournisseur structuré d''exemple'::text), 'Fournisseur structuré d''exemple', p_source, 1, true);
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, depose_par, nom_fichier, sha256, recu_le, etat, nature, nature_source)
  values (v_cl, (p_org ->> 'entite')::uuid, 2026, v_n, v_piece, 'depot', (p_org ->> 'gerant')::uuid, p_numero || '.xml',
          md5(p_numero || v_n) || md5(p_numero), now(), 'a_traiter', 'facture', 'lecteur')
  returning id into v_doc;
  insert into public.filed_factures (client_id, entite_id, document_id, nature, numero, numero_normalise, date_emission, date_reception, devise,
                                     montant_ht, montant_tva, montant_ttc, fournisseur_id, fournisseur_identification, fournisseur_lu, acheteur_lu,
                                     empreinte_donnees, statut)
  values (v_cl, (p_org ->> 'entite')::uuid, v_doc, 'facture', p_numero, upper(regexp_replace(p_numero, '[^A-Za-z0-9]', '', 'g')), date '2026-09-28',
          current_date, 'EUR', round(p_ttc / 1.2, 2), p_ttc - round(p_ttc / 1.2, 2), p_ttc, (p_org ->> 'fournisseur')::uuid, 'siren',
          '{"siren": "123456782"}', '{}', md5(p_numero) || md5(v_doc::text), 'a_valider')
  returning id into v_f;
  return jsonb_build_object('piece', v_piece, 'document', v_doc, 'facture', v_f);
end $$;

create or replace function tests.test_a4_16_01_referentiel() returns setof text
language plpgsql as $f$
begin
  return next is((select count(*) from public.filed_cycle_vie_statuts), 14::bigint, 'Quatorze statuts de la réforme (200 à 213)');
  return next is((select array_agg(code order by code) from public.filed_cycle_vie_statuts where obligatoire),
                 array[200, 210, 212, 213]::smallint[], 'Quatre obligatoires : Déposée, Refusée, Encaissée, Rejetée');
  return next is((select array_agg(code order by code) from public.filed_cycle_vie_statuts where transmis_administration),
                 array[200, 210, 212]::smallint[], 'Transmis à l''administration : 200, 210, 212');
  return next ok(exists (select 1 from public.filed_cycle_vie_motifs where code = 'DOUBLON' and 210 = any (statuts)), 'DOUBLON est un motif de refus');
  return next ok(exists (select 1 from public.filed_cycle_vie_motifs where code = 'JUSTIF_ABS' and statuts = '{208}'), 'JUSTIF_ABS ne sert qu''à suspendre');
end $f$;

create or replace function tests.test_a4_16_02_provenance() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); s jsonb; l jsonb;
begin
  s := tests.a4_facture(o, 'xml', 'FX-2026-001');
  l := tests.a4_facture(o, 'ia', 'PDF-2026-001');
  return next is((select provenance from public.filed_factures where id = (s ->> 'facture')::uuid), 'structuree', 'Valeurs xml : facture structurée');
  return next is((select provenance from public.filed_factures where id = (l ->> 'facture')::uuid), 'lue', 'Valeurs ia : facture lue');
  return next is(private.filed_provenance((s ->> 'facture')::uuid), 'structuree', 'private.filed_provenance la retrouve');
  return next is((select etat from public.filed_cycle_vie where facture_id = (s ->> 'facture')::uuid and code = 204), 'a_emettre',
                 'Structurée : « Prise en charge » (204) à émettre');
  return next is((select etat from public.filed_cycle_vie where facture_id = (l ->> 'facture')::uuid and code = 204), 'sans_objet',
                 'Lue sur PDF : 204 au journal, sans objet');
end $f$;

create or replace function tests.test_a4_16_03_fait_foi() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); s jsonb; l jsonb; v_cl uuid;
begin
  v_cl := (o ->> 'client')::uuid;
  s := tests.a4_facture(o, 'xml', 'FX-2026-002', 1481.28);
  l := tests.a4_facture(o, 'ia', 'PDF-2026-002', 1481.28);
  return next throws_ok(
    format($$insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
             values (%L, %L, 'montant_ttc', to_jsonb(1500), '1500', 'humain', 1, true)$$, v_cl, s ->> 'piece'),
    '22023', null, 'Une personne ne contredit pas le montant du XML');
  return next lives_ok(
    format($$insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
             values (%L, %L, 'montant_ttc', to_jsonb('1481,28'::text), '1481,28', 'humain', 1, true)$$, v_cl, s ->> 'piece'),
    'Confirmer la même valeur (1481,28 = 1481.28) passe');
  return next lives_ok(
    format($$insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
             values (%L, %L, 'commande.reference', to_jsonb('BC-1'::text), 'BC-1', 'humain', 1, true)$$, v_cl, s ->> 'piece'),
    'Un champ absent du XML se complète');
  return next lives_ok(
    format($$insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
             values (%L, %L, 'montant_ttc', to_jsonb(1500), '1500', 'humain', 1, true)$$, v_cl, l ->> 'piece'),
    'Une facture lue sur PDF se corrige toujours');
end $f$;

create or replace function tests.test_a4_16_04_cycle_de_vie() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); s jsonb; d jsonb; v_f uuid; v_cl uuid; n bigint;
begin
  v_cl := (o ->> 'client')::uuid;
  s := tests.a4_facture(o, 'xml', 'FX-2026-003');
  v_f := (s ->> 'facture')::uuid;
  update public.filed_factures set statut = 'validee' where id = v_f;
  return next ok(exists (select 1 from public.filed_cycle_vie where facture_id = v_f and code = 205 and etat = 'a_emettre'), 'Validée : 205 Approuvée à émettre');
  update public.filed_factures set statut = 'a_valider' where id = v_f;
  update public.filed_factures set statut = 'validee' where id = v_f;
  select count(*) into n from public.filed_cycle_vie where facture_id = v_f and code = 205;
  return next is(n, 1::bigint, 'Une seule approbation par version');

  insert into public.filed_litiges (client_id, facture_id, document_id, motif)
  values (v_cl, v_f, (s ->> 'document')::uuid, 'CMD_ERR : la commande BC-9 ne porte pas cet article');
  return next is((select motif_code from public.filed_cycle_vie where facture_id = v_f and code = 207), 'CMD_ERR', 'Litige : 207 avec le motif normalisé cité');
  insert into public.filed_litiges (client_id, facture_id, document_id, motif)
  values (v_cl, v_f, (s ->> 'document')::uuid, 'Le fournisseur doit rappeler');
  return next ok(exists (select 1 from public.filed_cycle_vie where facture_id = v_f and code = 207 and motif_code = 'AUTRE'), 'Litige sans code : AUTRE');

  insert into public.filed_reglements (client_id, facture_id, document_id, regle_le, montant, mode, reference)
  values (v_cl, v_f, (s ->> 'document')::uuid, current_date, 50, 'virement', 'VIR-X');
  return next is((select montant from public.filed_cycle_vie where facture_id = v_f and code = 211), 50.00::numeric, 'Règlement : 211 Paiement transmis, avec le montant');

  d := tests.a4_facture(o, 'xml', 'FX-2026-004');
  update public.filed_factures set statut = 'refusee' where id = (d ->> 'facture')::uuid;
  return next is((select motif_code from public.filed_cycle_vie where facture_id = (d ->> 'facture')::uuid and code = 210), 'AUTRE',
                 'Refusée sans contrôle bloquant : 210, AUTRE');
  d := tests.a4_facture(o, 'xml', 'FX-2026-005');
  update public.filed_factures set statut = 'ecartee' where id = (d ->> 'facture')::uuid;
  return next is((select motif_code from public.filed_cycle_vie where facture_id = (d ->> 'facture')::uuid and code = 210), 'DOUBLON',
                 'Écartée en doublon : 210, DOUBLON');

  return next is((select array_agg(code order by survenu_le, code) from public.filed_cycle_vie_facture(v_f)),
                 array[204, 205, 207, 207, 211]::smallint[], 'La frise de la facture, dans l''ordre');
end $f$;

create or replace function tests.test_a4_16_05_ouvrier() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); s jsonb; v_f uuid; v_id bigint; r record; v_n int := 0; v_issue text;
begin
  s := tests.a4_facture(o, 'xml', 'FX-2026-006');
  v_f := (s ->> 'facture')::uuid;
  return next ok(not has_function_privilege('authenticated', 'public.filed_cycle_vie_a_emettre(integer, interval)', 'execute'),
                 'Un membre ne prend pas la file de la plateforme');
  return next ok(not has_function_privilege('anon', 'public.filed_noter_emission_cycle_vie(bigint, boolean, text, text)', 'execute'),
                 'anon ne rend pas compte d''une émission');
  for r in select * from public.filed_cycle_vie_a_emettre(500) loop
    if r.facture_id = v_f then v_id := r.id; v_n := v_n + 1;
      return next is(r.numero, 'FX-2026-006', 'La file rend le numéro de la facture');
      return next is(r.fournisseur_siren, '123456782', 'et le SIREN du fournisseur');
    end if;
  end loop;
  return next is(v_n, 1, 'Le statut 204 de la facture est pris');
  return next is((select etat from public.filed_cycle_vie where id = v_id), 'en_cours', 'Pris sous bail : en cours');
  return next is(public.filed_noter_emission_cycle_vie(v_id, false, null, 'Plateforme indisponible'), 'repris', 'Un échec est repris');
  return next is((select etat from public.filed_cycle_vie where id = v_id), 'a_emettre', 'de nouveau à émettre');
  update public.filed_cycle_vie set essais = 5 where id = v_id;
  v_issue := public.filed_noter_emission_cycle_vie(v_id, false, null, 'Plateforme indisponible');
  return next is(v_issue, 'echec', 'Au cinquième essai : échec');
  update public.filed_cycle_vie set etat = 'en_cours' where id = v_id;
  return next is(public.filed_noter_emission_cycle_vie(v_id, true, 'PA-REF-1'), 'emis', 'Émis avec la référence de la plateforme');
  return next is((select reference_pa from public.filed_cycle_vie where id = v_id), 'PA-REF-1', 'La référence est gardée');
  return next is(public.filed_noter_emission_cycle_vie(v_id, true, 'PA-REF-2'), 'deja_emis', 'Un second compte rendu ne réécrit rien');
end $f$;
