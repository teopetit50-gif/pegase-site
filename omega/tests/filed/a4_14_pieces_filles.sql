-- Tests A4 — lot 13 (a4_21) : un fichier à plusieurs factures est découpé en pièces filles, qui vivent leur vie.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation (a4_10) et tests.a4_reception (a4_13), à poser avant.
-- `select * from runtests('tests', '^test_a4_')` ; runtests() annule tout. Données d'exemple seulement.

-- Une mère FILED : un lot de factures reçu par courriel. Rend {piece, document}.
create or replace function tests.a4_mere(p_org jsonb) returns jsonb
language plpgsql as $$
declare v_cl text := p_org ->> 'client'; v_r bigint; r jsonb;
begin
  v_r := tests.a4_reception(p_org, 'filed', jsonb_build_array(jsonb_build_object('nom', 'lot.pdf', 'mime', 'application/pdf', 'taille', 90000,
           'sha256', md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text), 'chemin', v_cl || '/receptions/msg-lot/lot.pdf')));
  r := private.filed_rattacher_reception(v_r);
  return jsonb_build_object('document', r -> 'documents' -> 0 ->> 'document',
                            'piece', (select piece_id from public.filed_documents where id = (r -> 'documents' -> 0 ->> 'document')::uuid));
end $$;

create or replace function tests.test_a4_21_01_filles() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl text := o ->> 'client'; m jsonb; d1 uuid := gen_random_uuid(); d2 uuid := gen_random_uuid();
        f jsonb; r jsonb; r2 jsonb; n bigint;
begin
  m := tests.a4_mere(o);
  return next is(public.filed_creer_pieces_filles((m ->> 'piece')::uuid, '[]'::jsonb), '[]'::jsonb, 'Appel à vide : la sonde ne crée rien');
  f := jsonb_build_array(
    jsonb_build_object('document', d1, 'chemin', v_cl || '/filed_document/' || d1 || '/lot-p3-4.pdf', 'nom_fichier', 'lot-p3-4.pdf',
                       'octets', 31000, 'sha256', repeat('1', 64), 'pages', '[3, 4]'::jsonb, 'type_piece', 'facture'),
    jsonb_build_object('document', d2, 'chemin', v_cl || '/filed_document/' || d2 || '/lot-p5.pdf', 'nom_fichier', 'lot-p5.pdf',
                       'octets', 15000, 'sha256', repeat('2', 64), 'pages', '[5]'::jsonb, 'type_piece', 'avoir'));
  r := public.filed_creer_pieces_filles((m ->> 'piece')::uuid, f);
  return next is(jsonb_array_length(r), 2, 'Deux filles rendues');
  return next is((r -> 0 ->> 'document')::uuid, d1, 'avec le document demandé');
  return next is((r -> 0 ->> 'deja')::boolean, false, 'créée');
  select count(*) into n from public.pieces p join public.filed_documents d on d.piece_id = p.id
   where p.piece_mere_id = (m ->> 'piece')::uuid and d.etat = 'en_lecture' and p.source = 'courriel'
     and d.expediteur = 'compta@fournisseur-exemple.fr' and p.objet_id = d.id::text;
  return next is(n, 2::bigint, 'Chaque fille : sa pièce (mère citée) et son document FILED en lecture, même source et même expéditeur');
  return next isnt((select reference from public.filed_documents where id = d1), (select reference from public.filed_documents where id = (m ->> 'document')::uuid),
                   'Chaque fille a son propre numéro de réception');
  return next ok(exists (select 1 from public.filed_historique where document_id = (m ->> 'document')::uuid and etape = 'decoupee'), 'Historique de la mère : découpée');
  return next ok(exists (select 1 from public.filed_historique where document_id = d1 and etape = 'recu' and message like '%pages 3 à 4%'), 'Historique de la fille : pages citées');
  r2 := public.filed_creer_pieces_filles((m ->> 'piece')::uuid, f);
  return next is((r2 -> 0 ->> 'deja')::boolean, true, 'Rejouée : deja = true');
  select count(*) into n from public.pieces where piece_mere_id = (m ->> 'piece')::uuid;
  return next is(n, 2::bigint, 'et rien de plus');
end $f$;

create or replace function tests.test_a4_21_02_refus() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl text := o ->> 'client'; m jsonb; d uuid := gen_random_uuid(); fille uuid;
begin
  m := tests.a4_mere(o);
  return next throws_ok(format($$select public.filed_creer_pieces_filles(%L, %L::jsonb)$$, m ->> 'piece',
    jsonb_build_array(jsonb_build_object('document', d, 'chemin', v_cl || '/receptions/ailleurs.pdf', 'sha256', repeat('3', 64), 'pages', '[2]'::jsonb))::text),
    '22023', null, 'Un chemin hors de <client>/filed_document/<document>/ est refusé');
  return next throws_ok(format($$select public.filed_creer_pieces_filles(%L, %L::jsonb)$$, m ->> 'piece',
    jsonb_build_array(jsonb_build_object('document', d, 'chemin', v_cl || '/filed_document/' || d || '/x.pdf', 'sha256', 'abc', 'pages', '[2]'::jsonb))::text),
    '22023', null, 'Une empreinte invalide est refusée');
  perform public.filed_creer_pieces_filles((m ->> 'piece')::uuid,
    jsonb_build_array(jsonb_build_object('document', d, 'chemin', v_cl || '/filed_document/' || d || '/x.pdf', 'sha256', repeat('4', 64), 'pages', '[2]'::jsonb)));
  select piece_id into fille from public.filed_documents where id = d;
  return next throws_ok(format($$select public.filed_creer_pieces_filles(%L, '[{"document": "%s"}]'::jsonb)$$, fille, gen_random_uuid()),
                        '22023', null, 'Une fille ne se redécoupe pas');
  return next throws_ok(format($$select public.filed_creer_pieces_filles(%L, '[]'::jsonb)$$, gen_random_uuid()), 'P0002', null, 'Mère inconnue');
  return next ok(not has_function_privilege('authenticated', 'public.filed_creer_pieces_filles(uuid, jsonb)', 'execute')
                 and has_function_privilege('service_role', 'public.filed_creer_pieces_filles(uuid, jsonb)', 'execute'), 'service_role seul');
end $f$;
