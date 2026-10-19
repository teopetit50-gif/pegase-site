-- Tests A4 — lot 49 (a4_57) : les courriers reçus (relances, changements de coordonnées). Données fictives.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_comme (a4_26_sortie_envois.sql), à poser avant. Ce fichier ne supprime rien.

-- Un courrier reçu : sa pièce (type lu), ses valeurs, puis son document (nature « autre »). Rend {piece, document}.
create or replace function tests.a4_courrier(p_org jsonb, p_type text, p_valeurs jsonb) returns jsonb language plpgsql as $$
declare v_cl uuid := (p_org ->> 'client')::uuid; v_piece uuid; v_doc uuid; v_n int := (floor(random() * 900000) + 100000)::int; k text;
begin
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut, type_piece)
  values (gen_random_uuid(), v_cl, 'filed', 'depot', 'courrier-' || v_n || '.pdf', 'application/pdf', 2048, md5('l' || v_n) || md5('m' || v_n),
          v_cl::text || '/filed_document/test/courrier-' || v_n || '.pdf', 'filed_document', 'l' || v_n, 'lue', p_type)
  returning id into v_piece;
  for k in select jsonb_object_keys(p_valeurs) loop
    insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
    values (v_cl, v_piece, k, p_valeurs -> k, p_valeurs ->> k, 'ia', 0.9, true);
  end loop;
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, depose_par, nom_fichier, sha256, recu_le, etat, nature, nature_source)
  values (v_cl, (p_org ->> 'entite')::uuid, 2026, v_n, v_piece, 'depot', (p_org ->> 'gerant')::uuid, 'courrier-' || v_n || '.pdf',
          md5('l' || v_n) || md5('m' || v_n), now(), 'a_traiter', 'autre', 'lecteur')
  returning id into v_doc;
  return jsonb_build_object('piece', v_piece, 'document', v_doc);
end $$;

create or replace function tests.test_a4_57_01_courriers() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; fa jsonb; fb jsonb; a jsonb; b jsonb; c public.filed_courriers; r record;
begin
  -- Deux factures du fournisseur : l'une réglée, l'autre due.
  fa := tests.a4_facture(o, 'ia', 'REL-001', 120);
  fb := tests.a4_facture(o, 'ia', 'REL-002', 240);
  update public.filed_factures set statut = 'validee' where id in ((fa ->> 'facture')::uuid, (fb ->> 'facture')::uuid);
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  perform public.filed_marquer_reglee((fa ->> 'facture')::uuid, current_date - 3, null, 'virement', 'VIR-EX');
  reset role;

  -- Une relance qui cite les deux, et une troisième inconnue.
  a := tests.a4_courrier(o, 'relance', jsonb_build_object('courrier.expediteur', 'Fournisseur structuré d''exemple',
         'courrier.objet', 'Relance de paiement', 'courrier.factures', 'REL-001, REL-002; REL-404', 'courrier.montant', '360,00',
         'courrier.reponse_avant', to_char(current_date + 5, 'DD/MM/YYYY')));
  select * into c from public.filed_courriers where document_id = (a ->> 'document')::uuid;
  return next ok(c.id is not null and c.sorte = 'relance' and c.fournisseur_id = (o ->> 'fournisseur')::uuid and c.montant_reclame = 360,
                 'La relance est lue : sorte, fournisseur reconnu, montant');
  return next is((select x ->> 'etat' from jsonb_array_elements(c.constat) x where x ->> 'numero' = 'REL-001'), 'reglee', 'REL-001 : déjà réglée');
  return next is((select x ->> 'etat' from jsonb_array_elements(c.constat) x where x ->> 'numero' = 'REL-002'), 'due', 'REL-002 : due');
  return next is((select x ->> 'etat' from jsonb_array_elements(c.constat) x where x ->> 'numero' = 'REL-404'), 'inconnue', 'REL-404 : inconnue');
  return next ok(exists (select 1 from public.filed_historique where objet_id = a ->> 'document' and message like '%REL-001 : déjà réglée%'),
                 'L''historique le dit en clair');

  -- L'échéance : à 5 jours, l'alerte des 7 jours ; le jour même, la dernière.
  return next is(private.filed_alerter_courriers(current_date), 1, 'À 5 jours de la réponse : une alerte');
  return next is(private.filed_alerter_courriers(current_date), 0, 'pas deux fois');
  return next is(private.filed_alerter_courriers(current_date + 5), 1, 'le jour même : la dernière');

  -- Un changement de coordonnées : alerte, et aucun IBAN changé.
  b := tests.a4_courrier(o, 'courrier', jsonb_build_object('courrier.sorte', 'changement_coordonnees', 'courrier.expediteur', 'Fournisseur structuré d''exemple'));
  return next ok(exists (select 1 from public.alertes where client_id = v_cl and titre like '%changement de coordonnées bancaires%contre-appeler%'),
                 'Un changement de coordonnées lève une alerte (contre-appeler)');
  return next is((select count(*) from public.filed_fournisseurs_ibans where client_id = v_cl), 0::bigint, 'et ne change aucun IBAN');

  -- Une facture n'est pas un courrier ; traiter ; lister.
  return next is(private.filed_lire_courrier((fa ->> 'document')::uuid), null::uuid, 'Une facture n''est pas un courrier');
  reset role; perform tests.a4_comme((o ->> 'valideur')::uuid);
  select * into r from public.filed_courriers_a_traiter(v_cl) limit 1;
  return next is(r.courrier_id, c.id, 'À traiter : la relance en tête (réponse la plus proche)');
  perform public.filed_traiter_courrier(c.id, 'Répondu : REL-001 réglée le ' || to_char(current_date - 3, 'DD/MM/YYYY'));
  reset role;
  return next is((select statut from public.filed_courriers where id = c.id), 'traite', 'Traité, avec sa note');
  return next ok(pg_get_functiondef('private.filed_produire_exports(date)'::regprocedure) like '%filed_alerter_courriers%', 'Le balayage quotidien suit les courriers');
end $f$;
