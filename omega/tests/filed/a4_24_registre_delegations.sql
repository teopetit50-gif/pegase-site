-- Tests A4 — lot 23 (a4_31) : le journal des pièces reçues ne se modifie pas et se prouve continu ; la délégation va à
-- un membre et reçoit la relance. pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture
-- (a4_10), tests.a4_en_tant_que (a4_21). runtests() annule tout. Données d'exemple.

-- Une pièce reçue d'exemple, à l'année et au numéro donnés (pièce et document). Rend l'id du document.
create or replace function tests.a4_document_recu(p_org jsonb, p_annee smallint, p_numero int) returns uuid
language plpgsql as $$
declare v_cl uuid := (p_org ->> 'client')::uuid; v_piece uuid; v_doc uuid; v_k text := p_annee || '-' || p_numero || '-' || gen_random_uuid();
begin
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut)
  values (gen_random_uuid(), v_cl, 'filed', 'depot', 'recu-' || p_numero || '.pdf', 'application/pdf', 1024, md5(v_k) || md5(v_k || 'b'),
          v_cl::text || '/filed_document/test/recu-' || v_k || '.pdf', 'filed_document', 'recu-' || v_k, 'lue')
  returning id into v_piece;
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, depose_par, nom_fichier, sha256, recu_le, etat)
  values (v_cl, (p_org ->> 'entite')::uuid, p_annee, p_numero, v_piece, 'depot', (p_org ->> 'gerant')::uuid, 'recu-' || p_numero || '.pdf',
          md5(v_k) || md5(v_k || 'b'), now(), 'a_traiter')
  returning id into v_doc;
  return v_doc;
end $$;

create or replace function tests.test_a4_31_01_registre_fige() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_doc uuid;
begin
  v_doc := tests.a4_document_recu(o, 2026::smallint, 777001);
  return next throws_ok(format($$update public.filed_documents set numero_reception = 9 where id = %L$$, v_doc), '55000', null,
                        'Le numéro d''une pièce reçue ne se réécrit pas');
  return next throws_ok(format($$update public.filed_documents set sha256 = repeat('e', 64) where id = %L$$, v_doc), '55000', null,
                        'son empreinte non plus');
  return next throws_ok(format($$update public.filed_documents set recu_le = now() - interval '1 year' where id = %L$$, v_doc), '55000', null,
                        'ni sa date de réception');
  return next lives_ok(format($$update public.filed_documents set etat = 'a_classer', motif = 'à classer' where id = %L$$, v_doc),
                       'Son état, lui, avance');
  return next ok(exists (select 1 from pg_trigger where tgname = 'filed_documents_registre_garde' and tgrelid = 'public.filed_documents'::regclass
                          and (tgtype & 8) = 8 and not tgisinternal), 'Une garde refuse l''effacement d''une pièce (hors effacement de l''organisation)');
  return next ok(exists (select 1 from pg_trigger where tgrelid = 'public.filed_historique'::regclass and not tgisinternal
                          and (tgtype & 8) = 8 and (tgtype & 16) = 16), 'L''historique est gardé contre la mise à jour et l''effacement');
end $f$;

create or replace function tests.test_a4_31_02_continuite() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; v_a smallint := 2031; r jsonb; i int;
begin
  for i in 1..3 loop
    perform tests.a4_document_recu(o, v_a, private.filed_prochain_numero(v_cl, 'reception', v_a));
  end loop;
  perform tests.a4_en_tant_que(o ->> 'gerant');
  r := public.filed_journal_continuite(v_cl, v_a);
  reset role;
  return next is(r ->> 'continu', 'true', 'Trois pièces numérotées par le compteur : journal continu');
  return next is((r ->> 'nombre')::int || '/' || (r ->> 'premier') || '/' || (r ->> 'dernier') || '/' || (r ->> 'compteur'), '3/1/3/3',
                 'nombre, premier, dernier et compteur concordent');
  perform private.filed_prochain_numero(v_cl, 'reception', v_a);   -- un numéro pris sans pièce : un trou
  perform tests.a4_document_recu(o, v_a, private.filed_prochain_numero(v_cl, 'reception', v_a));
  perform tests.a4_en_tant_que(o ->> 'gerant');
  r := public.filed_journal_continuite(v_cl, v_a);
  reset role;
  return next is(r -> 'trous', '[4]'::jsonb, 'Un numéro manquant est montré');
  return next is(r ->> 'continu', 'false', 'et le journal n''est plus dit continu');
  perform tests.a4_en_tant_que(gen_random_uuid()::text);
  return next throws_ok(format($$select public.filed_journal_continuite(%L, 2031::smallint)$$, v_cl), '42501', null, 'Une personne extérieure ne la lit pas');
  reset role;
end $f$;

create or replace function tests.test_a4_31_03_delegation() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; fa jsonb; v_d uuid; v_g uuid := (o ->> 'gerant')::uuid;
begin
  return next throws_ok(format($$insert into public.delegations (client_id, delegant, delegataire, debut, fin, motif)
                                 values (%L, %L, %L, now(), now() + interval '7 days', 'Congés')$$, v_cl, o ->> 'valideur', gen_random_uuid()),
                        '42501', null, 'On ne délègue pas à quelqu''un d''extérieur');
  insert into public.delegations (client_id, delegant, delegataire, debut, fin, motif)
  values (v_cl, (o ->> 'valideur')::uuid, v_g, now() - interval '1 day', now() + interval '14 days', 'Congés');
  fa := tests.a4_facture(o, 'ia', 'DEL-001', 120);
  v_d := private.filed_deposer_validation((fa ->> 'facture')::uuid, 1);
  perform private.filed_relancer_validations(now() + interval '4 days');
  return next ok(exists (select 1 from public.alertes where client_id = v_cl and cle_regroupement = 'filed:relance:' || v_d || ':' || v_g),
                 'À la relance, le délégataire reçoit l''alerte à son nom');
  return next ok(exists (select 1 from public.alertes where client_id = v_cl and cle_regroupement = 'filed:relance:' || v_d),
                 'en plus de la relance de tous');
  return next ok(not has_function_privilege('authenticated', 'private.filed_documents_registre_fige()', 'execute'), 'Fonctions de déclencheur fermées');
end $f$;
