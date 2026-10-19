-- Tests A4 — lot 48 (a4_56) : les contrats reçus, leur échéance de résiliation. Données fictives.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation (a4_10_facture_electronique.sql) et tests.a4_comme
-- (a4_26_sortie_envois.sql), à poser avant. Ce fichier ne supprime rien.

-- Un contrat reçu : sa pièce, les valeurs lues, puis son document de nature « contrat ». Rend {piece, document}.
create or replace function tests.a4_contrat(p_org jsonb, p_valeurs jsonb) returns jsonb language plpgsql as $$
declare v_cl uuid := (p_org ->> 'client')::uuid; v_piece uuid; v_doc uuid; v_n int := (floor(random() * 900000) + 100000)::int; k text;
begin
  insert into public.pieces (id, client_id, module, source, nom_fichier, mime, octets, sha256, chemin, objet_type, objet_id, statut)
  values (gen_random_uuid(), v_cl, 'filed', 'depot', 'contrat-' || v_n || '.pdf', 'application/pdf', 4096, md5('c' || v_n) || md5('k' || v_n),
          v_cl::text || '/filed_document/test/contrat-' || v_n || '.pdf', 'filed_document', 'c' || v_n, 'lue')
  returning id into v_piece;
  for k in select jsonb_object_keys(p_valeurs) loop
    insert into public.pieces_valeurs (client_id, piece_id, champ, valeur, texte, source, confiance, verifiee)
    values (v_cl, v_piece, k, p_valeurs -> k, p_valeurs ->> k, 'ia', 0.9, true);
  end loop;
  insert into public.filed_documents (client_id, entite_id, annee_reception, numero_reception, piece_id, source, depose_par, nom_fichier, sha256, recu_le, etat, nature, nature_source)
  values (v_cl, (p_org ->> 'entite')::uuid, 2026, v_n, v_piece, 'depot', (p_org ->> 'gerant')::uuid, 'contrat-' || v_n || '.pdf',
          md5('c' || v_n) || md5('k' || v_n), now(), 'a_traiter', 'contrat', 'lecteur')
  returning id into v_doc;
  return jsonb_build_object('piece', v_piece, 'document', v_doc);
end $$;

create or replace function tests.test_a4_56_01_contrats() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; a jsonb; b jsonb; c public.filed_contrats; n integer; r record;
        v_fin date := current_date + 60;
begin
  -- Un contrat lu : fin dans 60 jours, préavis de 45 jours, reconduction tacite d'un an.
  a := tests.a4_contrat(o, jsonb_build_object('contrat.cocontractant', 'Télécom d''exemple', 'contrat.objet', 'Fibre et téléphonie',
         'contrat.date_debut', to_char(v_fin - 364, 'DD/MM/YYYY'), 'contrat.date_fin', to_char(v_fin, 'YYYY-MM-DD'),
         'contrat.preavis_jours', '45', 'contrat.reconduction_tacite', 'oui', 'contrat.reconduction_mois', '12',
         'contrat.montant', '89,90', 'contrat.periodicite', 'mensuel'));
  select * into c from public.filed_contrats where document_id = (a ->> 'document')::uuid;
  return next ok(c.id is not null and c.cocontractant = 'Télécom d''exemple' and c.date_fin = v_fin and c.preavis_jours = 45
                 and c.reconduction_tacite and c.montant = 89.90 and c.periodicite = 'mensuel', 'Le contrat est lu de ses valeurs');
  return next is(private.filed_contrat_limite(c), v_fin - 45, 'Date limite : la fin moins le préavis');

  -- L'échéance : dans 15 jours → l'alerte des 30 jours, une seule fois ; puis celle des 7 jours.
  n := private.filed_alerter_contrats(v_fin - 45 - 15);
  return next is(n, 1, 'À 15 jours de la limite : une alerte');
  return next is(private.filed_alerter_contrats(v_fin - 45 - 15), 0, 'pas deux fois');
  return next is(private.filed_alerter_contrats(v_fin - 45 - 5), 1, 'à 5 jours : la dernière alerte');

  -- La fin passée, reconduit d'un an ; l'historique le dit.
  perform private.filed_alerter_contrats(v_fin + 1);
  return next is((select date_fin from public.filed_contrats where id = c.id), (v_fin + interval '12 months')::date, 'Reconduit tacitement d''un an');
  return next ok(exists (select 1 from public.filed_historique where objet_id = a ->> 'document' and message like 'Contrat reconduit tacitement%'), 'l''historique le dit');

  -- Sans reconduction : échu ; une personne corrige la fiche, sa valeur tient à la relecture.
  b := tests.a4_contrat(o, jsonb_build_object('contrat.objet', 'Maintenance d''exemple', 'contrat.date_debut', '2025-01-01', 'contrat.duree_mois', '12',
         'contrat.reconduction_tacite', 'non'));
  return next is((select date_fin from public.filed_contrats where document_id = (b ->> 'document')::uuid), date '2025-12-31', 'Fin déduite du début et de la durée');
  perform private.filed_alerter_contrats(current_date);
  return next is((select statut from public.filed_contrats where document_id = (b ->> 'document')::uuid), 'echu', 'Sans reconduction, la fin passée : échu');
  reset role; perform tests.a4_comme((o ->> 'valideur')::uuid);
  perform public.filed_poser_contrat((b ->> 'document')::uuid, jsonb_build_object('preavis_jours', 90, 'cocontractant', 'Mainteneur d''exemple'));
  reset role;
  perform private.filed_lire_contrat((b ->> 'document')::uuid);
  return next ok((select preavis_jours = 90 and source = 'humain' and cocontractant = 'Mainteneur d''exemple' from public.filed_contrats
                   where document_id = (b ->> 'document')::uuid), 'La fiche posée par une personne tient à la relecture');

  -- Les échéances, et les droits.
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  select * into r from public.filed_contrats_echeances(v_cl, 800);
  return next ok(r.contrat_id = c.id and r.date_limite is not null, 'Les échéances listent le contrat actif');
  perform public.filed_resilier_contrat(c.id);
  return next is((select count(*) from public.filed_contrats_echeances(v_cl, 800)), 0::bigint, 'Résilié : il sort des échéances');
  reset role; perform tests.a4_comme((o ->> 'valideur')::uuid);
  return next throws_ok(format('select public.filed_resilier_contrat(%L)', c.id), '42501', null, 'Le valideur ne résilie pas');
  reset role;
  return next ok(pg_get_functiondef('private.filed_produire_exports(date)'::regprocedure) like '%filed_alerter_contrats%', 'Le balayage quotidien suit les contrats');
end $f$;
