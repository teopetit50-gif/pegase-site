-- Tests A4 — lot 12 (a4_20) : un courriel reçu dans la boîte FILED devient un document FILED.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation (a4_10_facture_electronique.sql, à poser avant).
-- `select * from runtests('tests', '^test_a4_')` ; runtests() annule tout. Données d'exemple seulement.

-- Une réception d'exemple (comme public.deposer_reception l'écrit). Rend son id.
create or replace function tests.a4_reception(p_org jsonb, p_module text, p_pieces jsonb, p_sujet text default 'Facture septembre')
returns bigint language plpgsql as $$
declare v_id bigint;
begin
  insert into public.receptions (client_id, module, canal, boite, identifiant_externe, de_adresse, de_nom, sujet, corps, pieces)
  values ((p_org ->> 'client')::uuid, p_module, 'email', 'factures@recu.omegaai.fr', 'msg-' || gen_random_uuid()::text,
          'compta@fournisseur-exemple.fr', 'Fournisseur d''exemple', p_sujet, 'Veuillez trouver notre facture.', p_pieces)
  returning id into v_id;
  return v_id;
end $$;

create or replace function tests.test_a4_20_01_abonnement() returns setof text
language plpgsql as $f$
begin
  return next ok(exists (select 1 from private.abonnements where evenement = 'reception.nouvelle' and module = 'filed' and genre = 'filed.reception'),
                 'reception.nouvelle → filed.reception');
  return next ok(pg_get_functiondef('private.filed_traiter(integer)'::regprocedure) like '%filed.reception%', 'filed_traiter prend filed.reception');
  return next ok(pg_get_functiondef('private.filed_traiter(integer)'::regprocedure) like '%filed_balayer_lot4%', 'et garde le balayage du lot 4');
end $f$;

create or replace function tests.test_a4_20_02_pieces_jointes() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl text := o ->> 'client'; v_r bigint; r jsonb; n bigint;
begin
  v_r := tests.a4_reception(o, 'filed', jsonb_build_array(
    jsonb_build_object('nom', 'facture-2026-09.pdf', 'mime', 'application/pdf', 'taille', 48211, 'sha256', repeat('c', 64),
                       'chemin', v_cl || '/receptions/msg-1/facture-2026-09.pdf'),
    jsonb_build_object('nom', 'conditions.docx', 'mime', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'taille', 9000,
                       'chemin', v_cl || '/receptions/msg-1/conditions.docx'),
    jsonb_build_object('nom', 'facture-2026-09.xml', 'mime', 'application/octet-stream', 'taille', 3100,
                       'chemin', v_cl || '/receptions/msg-1/facture-2026-09.xml')));
  r := private.filed_rattacher_reception(v_r);
  return next is((r ->> 'lisibles')::int, 2, 'PDF et XML rangés');
  return next is((r ->> 'ignorees')::int, 1, 'le .docx est laissé');
  select count(*) into n from public.filed_documents d join public.pieces p on p.id = d.piece_id
   where d.client_id = v_cl::uuid and d.source = 'courriel' and p.source = 'courriel' and d.expediteur = 'compta@fournisseur-exemple.fr'
     and p.objet_type = 'filed_document' and p.objet_id = d.id::text and d.etat = 'en_lecture';
  return next is(n, 2::bigint, 'Deux documents FILED en lecture, source courriel, avec leur expéditeur');
  return next ok(exists (select 1 from public.pieces where client_id = v_cl::uuid and chemin = v_cl || '/receptions/msg-1/facture-2026-09.pdf'
                          and mime = 'application/pdf' and octets = 48211), 'La pièce garde le chemin de la réception');
  return next ok(exists (select 1 from public.pieces where client_id = v_cl::uuid and nom_fichier = 'facture-2026-09.xml' and mime = 'application/xml'),
                 'Un XML sans type reconnu par son extension');
  return next ok(exists (select 1 from public.filed_historique h join public.filed_documents d on d.id = h.document_id
                          where d.client_id = v_cl::uuid and h.etape = 'recu' and h.message like '%compta@fournisseur-exemple.fr%'),
                 'Historique : reçue par e-mail, avec l''expéditeur');
  return next is((select statut from public.receptions where id = v_r), 'traitee', 'La réception est traitée');
  perform private.filed_rattacher_reception(v_r);
  select count(*) into n from public.filed_documents where client_id = v_cl::uuid;
  return next is(n, 2::bigint, 'Rejouée : rien de plus');
end $f$;

create or replace function tests.test_a4_20_03_doublon_et_cas_limites() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl text := o ->> 'client'; v_r bigint; r jsonb;
begin
  v_r := tests.a4_reception(o, 'filed', jsonb_build_array(jsonb_build_object('nom', 'f.pdf', 'mime', 'application/pdf', 'sha256', repeat('d', 64),
                                                                               'chemin', v_cl || '/receptions/msg-2/f.pdf')));
  perform private.filed_rattacher_reception(v_r);
  v_r := tests.a4_reception(o, 'filed', jsonb_build_array(jsonb_build_object('nom', 'f-bis.pdf', 'mime', 'application/pdf', 'sha256', repeat('d', 64),
                                                                               'chemin', v_cl || '/receptions/msg-3/f-bis.pdf')));
  perform private.filed_rattacher_reception(v_r);
  return next ok(exists (select 1 from public.filed_documents where client_id = v_cl::uuid and nom_fichier = 'f-bis.pdf' and etat = 'doublon' and doublon_de is not null),
                 'Même fichier reçu deux fois : le second est un doublon');

  v_r := tests.a4_reception(o, 'filed', '[]'::jsonb, 'Relance sans pièce');
  r := private.filed_rattacher_reception(v_r);
  return next is((r ->> 'lisibles')::int, 0, 'Sans pièce jointe : rien de rangé');
  return next ok(exists (select 1 from public.alertes where client_id = v_cl::uuid and titre like 'Courriel de compta@fournisseur-exemple.fr sans pièce jointe lisible%'),
                 'mais une alerte « à lire »');
  return next is((select statut from public.receptions where id = v_r), 'nouvelle', 'et la réception reste nouvelle');

  v_r := tests.a4_reception(o, 'lorani', jsonb_build_array(jsonb_build_object('nom', 'pc.pdf', 'mime', 'application/pdf', 'chemin', v_cl || '/receptions/msg-4/pc.pdf')));
  return next ok(private.filed_rattacher_reception(v_r) ? 'ignore', 'Une réception d''un autre module est ignorée');
  v_r := tests.a4_reception(o, 'filed', jsonb_build_array(jsonb_build_object('nom', 'x.pdf', 'mime', 'application/pdf', 'chemin', 'autre-client/receptions/x.pdf')));
  return next is((private.filed_rattacher_reception(v_r) ->> 'lisibles')::int, 0, 'Un chemin hors du dossier du client n''est jamais rangé');
end $f$;
