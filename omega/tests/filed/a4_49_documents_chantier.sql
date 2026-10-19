-- Tests A4 — lot 53 (a4_61) : les documents de chantier vont à Daliro. Doublures : organisation et pièces d'exemple.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation (a4_10_facture_electronique.sql), à poser avant.
-- Ce fichier ne supprime rien.

-- Une pièce lue par le lecteur, avec son type, et son document FILED encore à traiter. Rend {piece, document}.
create or replace function tests.a4_piece_lue(p_org jsonb, p_type text, p_nom text)
returns jsonb language plpgsql as $$
declare v_cl uuid := (p_org ->> 'client')::uuid; v_piece uuid; v_doc uuid; v_n int := (floor(random() * 900000) + 100000)::int;
begin
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut, type_piece)
  values (gen_random_uuid(), v_cl, 'filed', 'depot', p_nom, 'image/jpeg', 4096, md5(p_nom || v_n) || md5(p_nom),
          v_cl::text || '/filed_document/test/' || p_nom, 'filed_document', p_nom, 'lue', p_type)
  returning id into v_piece;
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, depose_par, nom_fichier, sha256, recu_le, etat)
  values (v_cl, (p_org ->> 'entite')::uuid, 2026, v_n, v_piece, 'depot', (p_org ->> 'gerant')::uuid, p_nom,
          md5(p_nom || v_n) || md5(p_nom), now(), 'a_traiter')
  returning id into v_doc;
  return jsonb_build_object('piece', v_piece, 'document', v_doc);
end $$;

create or replace function tests.test_a4_61_01_documents_chantier() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); a jsonb; b jsonb; c jsonb; d public.filed_documents; v_issue text;
begin
  -- Les trois types de chantier donnent la nature document_chantier ; les autres ne bougent pas.
  return next is(private.filed_nature_de('chantier_pv_reserves'), 'document_chantier', 'Un PV de réserves est un document de chantier');
  return next ok(private.filed_nature_de('chantier_plan') = 'document_chantier'
                 and private.filed_nature_de('chantier_note_technique') = 'document_chantier', 'un plan et une note technique aussi');
  return next is(private.filed_nature_de('facture'), 'facture', 'Une facture reste une facture');
  return next is(private.filed_libelle_nature('document_chantier'), 'document de chantier', 'Son libellé : « document de chantier »');
  return next is(private.filed_etat_de('document_chantier'), 'classe', 'Il est rangé (classe) : FILED n''a rien à en faire');

  -- Sans Daliro chez le client : rangé dans FILED, aucun travail pour Daliro.
  a := tests.a4_piece_lue(o, 'chantier_pv_reserves', 'pv-opr-exemple.jpg');
  v_issue := private.filed_integrer_piece((a ->> 'piece')::uuid);
  select * into d from public.filed_documents where id = (a ->> 'document')::uuid;
  return next is(v_issue, 'document_chantier', 'filed_integrer_piece rend document_chantier');
  return next ok(d.nature = 'document_chantier' and d.etat = 'classe' and d.nature_source = 'lecteur',
                 'Le document est classé, nature document_chantier (la contrainte l''accepte)');
  return next ok(exists (select 1 from public.filed_historique h where h.document_id = d.id and h.message like '%document de chantier%'),
                 'L''historique dit « Lue et rangée : document de chantier »');
  return next ok(not exists (select 1 from public.travaux t where t.genre = 'daliro.document' and t.charge ->> 'piece' = a ->> 'piece'),
                 'Daliro absent : aucun travail daliro.document');

  -- Daliro installé : le travail daliro.document est déposé, la pièce reste à FILED.
  insert into public.btp_reglages (client_id, formule, quota_chantiers, quota_comptes_bureau)
  values ((o ->> 'client')::uuid, 'chantiers', 10, 3);
  b := tests.a4_piece_lue(o, 'chantier_plan', 'plan-structure-exemple.jpg');
  perform private.filed_integrer_piece((b ->> 'piece')::uuid);
  return next ok(exists (select 1 from public.travaux t where t.client_id = (o ->> 'client')::uuid and t.module = 'daliro'
                           and t.genre = 'daliro.document' and t.charge ->> 'piece' = b ->> 'piece'
                           and t.cle = 'document:' || (b ->> 'piece')),
                 'Daliro installé : travail daliro.document déposé, clé document:<pièce>');
  return next is((select module from public.pieces where id = (b ->> 'piece')::uuid), 'filed', 'La pièce reste celle de FILED');

  -- Une note technique aussi.
  c := tests.a4_piece_lue(o, 'chantier_note_technique', 'note-parasismique-exemple.jpg');
  perform private.filed_integrer_piece((c ->> 'piece')::uuid);
  return next is((select count(*)::int from public.travaux t where t.genre = 'daliro.document' and t.client_id = (o ->> 'client')::uuid), 2,
                 'Une note technique part aussi ; deux travaux en tout pour ce client');
end $f$;
